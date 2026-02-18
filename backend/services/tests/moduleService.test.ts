// services/tests/moduleService.test.ts
import { getAllModulesWithExercises } from '../moduleService'; 

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