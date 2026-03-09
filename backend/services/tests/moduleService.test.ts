// services/tests/moduleService.test.ts
import {
  getAllModulesWithExercises,
  createModule,
  saveModuleExercises,
} from '../moduleService'; 

interface Exercise {
  exercise_id: number;
  title: string;
  description: string;
  default_sets: number;
  default_reps: number;
  video_id: string | null;
  thumbnail_photo_id: string | null;
}

interface ModuleExercise {
  module_exercise_id: number;
  order_index: number;
  sets_override: number;
  reps_override: number;
  exercise: Exercise; // ← object not array, fixes the title error
}

interface Module {
  module_id: number;
  title: string;
  description: string;
  session_number: number;
  created_at: string;
  module_exercise: ModuleExercise[];
}

const mockData = [
  {
    module_id: 1,
    title: 'week 1 foundations',
    description: 'introductory pelvic floor strengthening',
    session_number: 1,
    created_at: '2026-02-18T18:25:15+00:00',
    module_exercise: [
      {
        module_exercise_id: 1,
        order_index: 1,
        sets_override: 3,
        reps_override: 12,
        exercise: {
          exercise_id: 1,
          title: 'pelvic tilt',
          description: 'gentle pelvic floor activation exercise',
          default_sets: 2,
          default_reps: 10,
          video_id: null,
          thumbnail_photo_id: null,
        },
      },
    ],
  },
] as any[];

function makeMockSupabase(data: Module[] | null, error: { message: string } | null = null) {
  return {
    from: () => ({
      select: () => ({
        order: () => ({
          order: () => Promise.resolve({ data, error }),
        }),
      }),
    }),
  } as any;
}

describe('getAllModulesWithExercises', () => {
  it('returns modules with nested exercises', async () => {
    const supabase = makeMockSupabase(mockData);
    const result = await getAllModulesWithExercises(supabase) as any[];

    expect(result).toHaveLength(1);
    expect(result[0].title).toBe('week 1 foundations');
    expect(result[0].module_exercise).toHaveLength(1);
    expect(result[0].module_exercise[0].exercise.title).toBe('pelvic tilt');
  });

  it('returns empty array when no modules exist', async () => {
    const supabase = makeMockSupabase([]);
    const result = await getAllModulesWithExercises(supabase);

    expect(result).toEqual([]);
  });

  it('throws when supabase returns an error', async () => {
    const supabase = makeMockSupabase(null, { message: 'connection failed' });

    await expect(getAllModulesWithExercises(supabase)).rejects.toThrow('Failed to retrieve modules');
  });
});

describe('createModule', () => {
  it('throws when title is empty', async () => {
    const supabase = makeMockSupabase([]);
    await expect(
      createModule(supabase, {
        title: '  ',
        description: '',
        session_number: 1,
        created_by_admin_id: 'admin-uuid',
      })
    ).rejects.toThrow('Title is required');
  });

  it('throws when session_number is invalid', async () => {
    const supabase = makeMockSupabase([]);
    await expect(
      createModule(supabase, {
        title: 'Test',
        description: '',
        session_number: 0,
        created_by_admin_id: 'admin-uuid',
      })
    ).rejects.toThrow('Session number must be a positive integer');
  });

  it('throws when created_by_admin_id is missing', async () => {
    const supabase = makeMockSupabase([]);
    await expect(
      createModule(supabase, {
        title: 'Test',
        description: '',
        session_number: 1,
        created_by_admin_id: '',
      })
    ).rejects.toThrow('created_by_admin_id is required');
  });

  it('calls supabase insert with trimmed title and description', async () => {
    const inserted: any[] = [];
    const supabase = {
      from: (table: string) => {
        if (table !== 'module') return {} as any;
        return {
          insert: (row: any) => ({
            select: () => ({
              single: () => {
                inserted.push(row);
                return Promise.resolve({
                  data: { module_id: 1, ...row, created_at: '2026-01-01T00:00:00Z' },
                  error: null,
                });
              },
            }),
          }),
        };
      },
    } as any;
    const result = await createModule(supabase, {
      title: '  Week 1  ',
      description: '  Desc  ',
      session_number: 1,
      created_by_admin_id: 'admin-uuid',
    });
    expect(inserted).toHaveLength(1);
    expect(inserted[0].title).toBe('Week 1');
    expect(inserted[0].description).toBe('Desc');
    expect(inserted[0].session_number).toBe(1);
    expect(inserted[0].created_by_admin_id).toBe('admin-uuid');
    expect(result.module_id).toBe(1);
  });
});

describe('saveModuleExercises', () => {
  it('throws when moduleId is invalid', async () => {
    const supabase = {} as any;
    await expect(saveModuleExercises(supabase, 0, [1, 2])).rejects.toThrow('Invalid module id');
    await expect(saveModuleExercises(supabase, 1.5, [1])).rejects.toThrow('Invalid module id');
  });

  it('deduplicates exercise_ids and returns correct order', async () => {
    let deletedModuleId: number | null = null;
    let insertedRows: any[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === 'module_exercise') {
          return {
            delete: () => ({
              eq: (_col: string, id: number) => {
                deletedModuleId = id;
                return Promise.resolve({ error: null });
              },
            }),
            insert: (rows: any[]) => {
              insertedRows = rows;
              return Promise.resolve({ error: null });
            },
          };
        }
        return {} as any;
      },
    } as any;
    const result = await saveModuleExercises(supabase, 5, [10, 20, 10, 30, 20]);
    expect(deletedModuleId).toBe(5);
    expect(insertedRows).toHaveLength(3);
    expect(insertedRows.map((r) => r.exercise_id)).toEqual([10, 20, 30]);
    expect(insertedRows[0].order_index).toBe(1);
    expect(insertedRows[1].order_index).toBe(2);
    expect(insertedRows[2].order_index).toBe(3);
    expect(result.module_id).toBe(5);
    expect(result.exercise_ids).toEqual([10, 20, 30]);
  });

  it('clears module exercises when exercise_ids is empty', async () => {
    let deleted = false;
    let inserted: any[] = [];
    const supabase = {
      from: (table: string) => {
        if (table === 'module_exercise') {
          return {
            delete: () => ({
              eq: () => {
                deleted = true;
                return Promise.resolve({ error: null });
              },
            }),
            insert: (rows: any[]) => {
              inserted = rows;
              return Promise.resolve({ error: null });
            },
          };
        }
        return {} as any;
      },
    } as any;
    const result = await saveModuleExercises(supabase, 1, []);
    expect(deleted).toBe(true);
    expect(inserted).toHaveLength(0);
    expect(result.exercise_ids).toEqual([]);
  });
});