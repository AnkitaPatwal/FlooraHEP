import {
  getPlanWithHierarchy,
  verifyAdminAccess,
  isAdminUser,
  PlanWithHierarchy,
  AdminAccessResult,
} from '../../services/relationshipService';

// ─── Constants ────────────────────────────────────────────────────────────────

const MOCK_PLAN_ID     = 1;
const MOCK_MODULE_ID   = 1;
const MOCK_EXERCISE_ID = 19;
const MOCK_VIDEO_ID    = 5;
const MOCK_OBJECT_KEY  = 'pelvic-tilt-demo.mp4';
const MOCK_BUCKET      = 'exercise-videos';
const MOCK_PUBLIC_URL  = `https://xyzproject.supabase.co/storage/v1/object/public/${MOCK_BUCKET}/${MOCK_OBJECT_KEY}`;
const ADMIN_USER_ID    = 19;

// ─── Default mock plan row ────────────────────────────────────────────────────
// Mirrors the junction-table shape Supabase returns:
//   plan → plan_module[] → module → module_exercise[] → exercise → video[]

const DEFAULT_PLAN_ROW = {
  plan_id: MOCK_PLAN_ID,
  title: 'Pelvic Floor Rehab',
  description: 'Beginner pelvic floor rehabilitation programme',
  plan_module: [
    {
      module: {
        module_id: MOCK_MODULE_ID,
        title: 'Foundation Exercises',
        description: 'Core activation and pelvic tilt basics',
        module_exercise: [
          {
            exercise: {
              exercise_id: MOCK_EXERCISE_ID,
              title: 'pelvic tilt',
              description: 'gentle pelvic floor activation exercise',
              video_id: MOCK_VIDEO_ID,
              video: [
                {
                  bucket: MOCK_BUCKET,
                  object_key: MOCK_OBJECT_KEY,
                  original_filename: 'pelvic-tilt-demo.mp4',
                  mime_type: 'video/mp4',
                },
              ],
            },
          },
        ],
      },
    },
  ],
};

// ─── Mock factory ─────────────────────────────────────────────────────────────

interface MockOptions {
  planData?:        any;
  planError?:       { message: string; code?: string } | null;
  plansData?:       { plan_id: number; title: string }[];
  modulesData?:     { module_id: number; title: string }[];
  exercisesData?:   { exercise_id: number; title: string }[];
  plansError?:      { message: string } | null;
  modulesError?:    { message: string } | null;
  exercisesError?:  { message: string } | null;
  adminUserData?:   { user_id: number } | null;
  adminUserError?:  { message: string; code?: string } | null;
  publicUrl?:       string | null;
}

function buildMockSupabase(opts: MockOptions = {}) {
  const {
    planData       = DEFAULT_PLAN_ROW,
    planError      = null,
    plansData      = [{ plan_id: MOCK_PLAN_ID, title: 'Pelvic Floor Rehab' }],
    modulesData    = [{ module_id: MOCK_MODULE_ID, title: 'Foundation Exercises' }],
    exercisesData  = [{ exercise_id: MOCK_EXERCISE_ID, title: 'pelvic tilt' }],
    plansError     = null,
    modulesError   = null,
    exercisesError = null,
    adminUserData  = { user_id: ADMIN_USER_ID },
    adminUserError = null,
    publicUrl      = MOCK_PUBLIC_URL,
  } = opts;

  const storageFrom = {
    getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl } }),
  };

  // Unified plan chain: supports BOTH call patterns on the 'plan' table.
  //   getPlanWithHierarchy  -> .select(...).eq(...).single()
  //   verifyAdminAccess     -> .select(...)   (awaited directly)
  //
  // We make the chain object itself thenable so `await chain.select()` works
  // when verifyAdminAccess awaits it, while still exposing .eq/.single for
  // the deep-join path.
  const planSelectResult = {
    data: plansError ? null : plansData,
    error: plansError,
  };
  const planSelectChain = {
    // then/catch make this object act as a Promise for verifyAdminAccess
    then: (resolve: any) => Promise.resolve(planSelectResult).then(resolve),
    catch: (reject: any) => Promise.resolve(planSelectResult).catch(reject),
    // eq/single chain for getPlanWithHierarchy
    eq:     jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: planError ? null : planData,
      error: planError,
    }),
  };
  const planChain = {
    select: jest.fn().mockReturnValue(planSelectChain),
  };

  // admin_users table: single row lookup
  const adminChain = {
    select: jest.fn().mockReturnThis(),
    eq:     jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({
      data: adminUserError ? null : adminUserData,
      error: adminUserError,
    }),
  };

  // Flat select chains for module and exercise (verifyAdminAccess only)
  const makeFlatChain = (data: any[], error: any) => ({
    select: jest.fn().mockResolvedValue({ data: error ? null : data, error }),
  });

  const modulesChain   = makeFlatChain(modulesData,   modulesError);
  const exercisesChain = makeFlatChain(exercisesData, exercisesError);

  const supabase = {
    storage: { from: jest.fn().mockReturnValue(storageFrom) },
    from: jest.fn((table: string) => {
      if (table === 'plan')        return planChain;
      if (table === 'module')      return modulesChain;
      if (table === 'exercise')    return exercisesChain;
      if (table === 'admin_users') return adminChain;
      return {};
    }),
    _storageFrom:    storageFrom,
    _planChain:      planChain,
    _planSelectChain: planSelectChain,
    _modulesChain:   modulesChain,
    _exercisesChain: exercisesChain,
    _adminChain:     adminChain,
  };

  return supabase;
}

// ─── Tests ────────────────────────────────────────────────────────────────────

describe('ATH-221 — Verify Data Relationships and Admin Access', () => {

  // ── AC1: Plans load with their associated modules and exercises ─────────────

  describe('AC1: Plans load with associated modules and exercises', () => {
    it('should return a plan with at least one module', async () => {
      const supabase = buildMockSupabase();
      const plan: PlanWithHierarchy = await getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID);

      expect(plan.plan_id).toBe(MOCK_PLAN_ID);
      expect(plan.modules.length).toBeGreaterThan(0);
    });

    it('should return modules that each contain at least one exercise', async () => {
      const supabase = buildMockSupabase();
      const plan = await getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID);

      plan.modules.forEach((mod) => {
        expect(mod.exercises.length).toBeGreaterThan(0);
      });
    });

    it('module should have the correct module_id and title', async () => {
      const supabase = buildMockSupabase();
      const plan = await getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID);

      expect(plan.modules[0].module_id).toBe(MOCK_MODULE_ID);
      expect(plan.modules[0].title).toBe('Foundation Exercises');
    });

    it('exercise inside module should match the seeded exercise_id', async () => {
      const supabase = buildMockSupabase();
      const plan = await getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID);

      expect(plan.modules[0].exercises[0].exercise_id).toBe(MOCK_EXERCISE_ID);
    });

    it('should handle a plan with no linked modules gracefully', async () => {
      const supabase = buildMockSupabase({
        planData: { plan_id: MOCK_PLAN_ID, title: 'Empty Plan', plan_module: [] },
      });
      const plan = await getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID);

      expect(plan.modules).toEqual([]);
    });

    it('should throw if the plan query fails', async () => {
      const supabase = buildMockSupabase({ planError: { message: 'Row not found' } });

      await expect(getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID))
        .rejects.toThrow('Failed to fetch plan hierarchy: Row not found');
    });
  });

  // ── AC2: Exercises include associated metadata ──────────────────────────────

  describe('AC2: Exercises include associated metadata (name, video URL)', () => {
    it('should include a non-empty title on each exercise', async () => {
      const supabase = buildMockSupabase();
      const plan = await getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID);
      const exercise = plan.modules[0].exercises[0];

      expect(exercise.title).toBeTruthy();
      expect(typeof exercise.title).toBe('string');
    });

    it('should include a public https video_url for exercises with a linked video', async () => {
      const supabase = buildMockSupabase();
      const plan = await getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID);

      expect(plan.modules[0].exercises[0].video_url).toMatch(/^https:\/\//);
    });

    it('video_url should contain both the bucket name and the object key', async () => {
      const supabase = buildMockSupabase();
      const plan = await getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID);
      const { video_url } = plan.modules[0].exercises[0];

      expect(video_url).toContain(MOCK_BUCKET);
      expect(video_url).toContain(MOCK_OBJECT_KEY);
    });

    it('should expose video mime_type on the exercise', async () => {
      const supabase = buildMockSupabase();
      const plan = await getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID);

      expect(plan.modules[0].exercises[0].video?.mime_type).toBe('video/mp4');
    });

    it('should return null video_url for an exercise with no linked video', async () => {
      const planNoVideo = {
        plan_id: MOCK_PLAN_ID,
        title: 'Plan',
        plan_module: [{
          module: {
            module_id: MOCK_MODULE_ID,
            title: 'Module',
            module_exercise: [{
              exercise: { exercise_id: 99, title: 'no-video exercise', video_id: null, video: null },
            }],
          },
        }],
      };
      const supabase = buildMockSupabase({ planData: planNoVideo });
      const plan = await getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID);

      expect(plan.modules[0].exercises[0].video_url).toBeNull();
    });
  });

  // ── AC3: Queries return data in the expected hierarchical structure ──────────

  describe('AC3: Queries return data in the expected hierarchical structure', () => {
    it('top-level result should have plan_id and a modules array', async () => {
      const supabase = buildMockSupabase();
      const plan = await getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID);

      expect(plan).toHaveProperty('plan_id');
      expect(Array.isArray(plan.modules)).toBe(true);
    });

    it('each module should have module_id and an exercises array', async () => {
      const supabase = buildMockSupabase();
      const mod = (await getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID)).modules[0];

      expect(mod).toHaveProperty('module_id');
      expect(Array.isArray(mod.exercises)).toBe(true);
    });

    it('each exercise should have exercise_id and video_url at the leaf level', async () => {
      const supabase = buildMockSupabase();
      const ex = (await getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID)).modules[0].exercises[0];

      expect(ex).toHaveProperty('exercise_id');
      expect(ex).toHaveProperty('video_url');
      // exercises are the leaf — they should not have a nested modules property
      expect(ex).not.toHaveProperty('modules');
    });

    it('query should target the plan table and include junction table selects', async () => {
      const supabase = buildMockSupabase();
      await getPlanWithHierarchy(supabase as any, MOCK_PLAN_ID);

      expect(supabase.from).toHaveBeenCalledWith('plan');
      const selectArg: string = (supabase._planChain.select as jest.Mock).mock.calls[0][0];
      expect(selectArg).toContain('plan_module');
      expect(selectArg).toContain('module_exercise');
      expect(selectArg).toContain('exercise');
    });
  });

  // ── AC4: Admin user can read all seeded plans, modules, and exercises ────────

  describe('AC4: Admin user can read all seeded plans, modules, and exercises', () => {
    it('should confirm user_id 19 is an admin via admin_users table', async () => {
      const supabase = buildMockSupabase();
      const result = await isAdminUser(supabase as any, ADMIN_USER_ID);

      expect(result).toBe(true);
      expect(supabase.from).toHaveBeenCalledWith('admin_users');
    });

    it('should return false when user is not in admin_users', async () => {
      const supabase = buildMockSupabase({
        adminUserData: null,
        adminUserError: { message: 'No rows found', code: 'PGRST116' },
      });
      const result = await isAdminUser(supabase as any, 999);

      expect(result).toBe(false);
    });

    it('should throw if the admin_users query fails with a non-404 error', async () => {
      const supabase = buildMockSupabase({
        adminUserData: null,
        adminUserError: { message: 'Connection refused', code: '08006' },
      });

      await expect(isAdminUser(supabase as any, ADMIN_USER_ID))
        .rejects.toThrow('Failed to check admin status: Connection refused');
    });

    it('admin should be able to read non-empty plans', async () => {
      const supabase = buildMockSupabase();
      const { plans } = await verifyAdminAccess(supabase as any);

      expect(plans.length).toBeGreaterThan(0);
      expect(plans[0]).toHaveProperty('plan_id');
      expect(plans[0]).toHaveProperty('title');
    });

    it('admin should be able to read non-empty modules', async () => {
      const supabase = buildMockSupabase();
      const { modules } = await verifyAdminAccess(supabase as any);

      expect(modules.length).toBeGreaterThan(0);
      expect(modules[0]).toHaveProperty('module_id');
    });

    it('admin should be able to read non-empty exercises', async () => {
      const supabase = buildMockSupabase();
      const { exercises } = await verifyAdminAccess(supabase as any);

      expect(exercises.length).toBeGreaterThan(0);
      expect(exercises[0]).toHaveProperty('exercise_id');
    });
  });

  // ── AC5: No permission or RLS errors occur for admin access ─────────────────

  describe('AC5: No permission or RLS errors occur for admin access', () => {
    it('should return rlsError as null when admin has full read access', async () => {
      const supabase = buildMockSupabase();
      const result: AdminAccessResult = await verifyAdminAccess(supabase as any);

      expect(result.rlsError).toBeNull();
    });

    it('should surface an RLS error when plans access is denied', async () => {
      const supabase = buildMockSupabase({
        plansError: { message: 'new row violates row-level security policy for table "plan"' },
      });
      const result = await verifyAdminAccess(supabase as any);

      expect(result.rlsError).toContain('row-level security');
    });

    it('should surface a permission error when modules access is denied', async () => {
      const supabase = buildMockSupabase({
        modulesError: { message: 'permission denied for table module' },
      });
      const result = await verifyAdminAccess(supabase as any);

      expect(result.rlsError).toContain('permission denied');
    });

    it('should surface a permission error when exercises access is denied', async () => {
      const supabase = buildMockSupabase({
        exercisesError: { message: 'permission denied for table exercise' },
      });
      const result = await verifyAdminAccess(supabase as any);

      expect(result.rlsError).toContain('permission denied');
    });

    it('should return empty arrays (not throw) when RLS blocks all tables', async () => {
      const supabase = buildMockSupabase({
        plansError:     { message: 'permission denied' },
        modulesError:   { message: 'permission denied' },
        exercisesError: { message: 'permission denied' },
      });
      const result = await verifyAdminAccess(supabase as any);

      expect(result.plans).toEqual([]);
      expect(result.modules).toEqual([]);
      expect(result.exercises).toEqual([]);
      expect(result.rlsError).toBeTruthy();
    });
  });
});