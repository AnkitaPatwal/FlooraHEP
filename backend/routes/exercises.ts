import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { supabaseServer } from '../lib/supabaseServer';
import { createSignedUrl } from '../lib/signedUrl';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin';
import { linkVideoToExercise, BUCKET_NAME } from '../services/videoService';
import { logDashboardActivity } from '../services/dashboardActivityLog';

const router = express.Router();

/** PostgREST often serializes bigint `exercise_id` as string; Map keys must match lookup type. */
function normalizeExerciseId(id: unknown): number | null {
  if (id == null) return null;
  if (typeof id === 'bigint') {
    const n = Number(id);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
  }
  const n = typeof id === 'number' ? id : Number(String(id).trim());
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : null;
}

function rpcExerciseCountRows(data: unknown): { exercise_id: unknown; client_count: unknown }[] {
  if (Array.isArray(data)) return data as { exercise_id: unknown; client_count: unknown }[];
  if (data && typeof data === 'object' && data !== null && 'exercise_id' in data) {
    return [data as { exercise_id: unknown; client_count: unknown }];
  }
  return [];
}

type ResolvedAssignmentCounts = {
  counts: Map<number, number>;
  /** True when row-level user_exercise fallback also failed */
  assignmentCountsError: boolean;
  /** True when DB RPC is missing/fails — plan-based counts not used; legacy may be all zeros */
  assignmentCountsRpcUnavailable: boolean;
};

/**
 * Distinct auth users with this exercise in their merged assignment — same pattern as plan counts:
 * `count_assigned_clients_for_exercises` RPC, then a simple table fallback if the RPC is unavailable.
 */
async function resolveAssignmentCounts(exerciseIds: number[]): Promise<ResolvedAssignmentCounts> {
  if (exerciseIds.length === 0) {
    return {
      counts: new Map(),
      assignmentCountsError: false,
      assignmentCountsRpcUnavailable: false,
    };
  }

  const idsForRpc = [...new Set(exerciseIds.map((id) => normalizeExerciseId(id)).filter((id): id is number => id != null))];
  if (idsForRpc.length === 0) {
    return {
      counts: new Map(),
      assignmentCountsError: false,
      assignmentCountsRpcUnavailable: false,
    };
  }

  const { data: rpcData, error: rpcError } = await supabaseServer.rpc('count_assigned_clients_for_exercises', {
    p_exercise_ids: idsForRpc,
  });

  if (!rpcError) {
    const counts = new Map<number, number>();
    for (const id of idsForRpc) counts.set(id, 0);
    for (const row of rpcExerciseCountRows(rpcData)) {
      const eid = normalizeExerciseId(row.exercise_id);
      const cnt = Number(row.client_count ?? 0);
      if (eid != null) counts.set(eid, cnt);
    }
    return {
      counts,
      assignmentCountsError: false,
      assignmentCountsRpcUnavailable: false,
    };
  }

  console.error(
    'count_assigned_clients_for_exercises RPC failed, using user_exercise fallback. Apply migration 20260412000000_count_assigned_clients_per_exercise.sql (and 20260412100000 if present), then restart API. PostgREST:',
    (rpcError as { message?: string })?.message ?? rpcError,
  );

  const legacy = await legacyUserExerciseRowCounts(exerciseIds);
  return {
    counts: legacy.counts,
    assignmentCountsError: legacy.error,
    assignmentCountsRpcUnavailable: true,
  };
}

async function legacyUserExerciseRowCounts(
  exerciseIds: number[]
): Promise<{ counts: Map<number, number>; error: boolean }> {
  const counts = new Map<number, number>();
  const normalized = [...new Set(exerciseIds.map((id) => normalizeExerciseId(id)).filter((id): id is number => id != null))];
  for (const id of normalized) counts.set(id, 0);
  if (normalized.length === 0) return { counts, error: false };
  const { data: ueRows, error: ueError } = await supabaseServer
    .from('user_exercise')
    .select('exercise_id')
    .in('exercise_id', normalized);
  if (ueError) {
    console.error('legacy user_exercise counts error:', ueError);
    return { counts, error: true };
  }
  for (const row of ueRows ?? []) {
    const eid = normalizeExerciseId((row as { exercise_id: unknown }).exercise_id);
    if (eid == null) continue;
    counts.set(eid, (counts.get(eid) ?? 0) + 1);
  }
  return { counts, error: false };
}

function intParam(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

router.get('/', async (req, res) => {
  try {
    const page = intParam(req.query.page, 1);
    const pageSize = Math.min(intParam(req.query.pageSize, 20), 100);
    const offset = (page - 1) * pageSize;

    const search = (req.query.search as string | undefined)?.trim();
    const sort = (req.query.sort as string) || 'created_at';
    const order =
      ((req.query.order as string) || 'desc').toLowerCase() === 'asc'
        ? { ascending: true }
        : { ascending: false };

    const select = `
      exercise_id,
      title,
      description,
      default_sets,
      default_reps,
      body_part,
      thumbnail_url,
      tags,
      created_at,
      updated_at,
      video_id,
      video:video_id(
        bucket,
        object_key,
        original_filename,
        mime_type,
        byte_size,
        duration_seconds,
        width,
        height
      )
    `;

    let query = supabaseServer.from('exercise').select(select, { count: 'exact' });

    if (search) {
      const encoded = search.replace(/[,\\{\}\"]/g, '').trim();
      if (encoded) {
        const orParts = [
          `title.ilike.%${encoded}%`,
          `description.ilike.%${encoded}%`,
          `body_part.ilike.%${encoded}%`,
        ];
        query = query.or(orParts.join(','));
      }
    }

    const sortColumn = ['created_at', 'title', 'updated_at'].includes(sort) ? sort : 'created_at';
    query = query.order(sortColumn as any, order).range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('GET /api/exercises error:', error);
      return res.status(500).json({ message: 'Failed to fetch exercises' });
    }

    const withSigned = await Promise.all(
      (data ?? []).map(async (row: any) => {
        const video_url = await createSignedUrl(row.video);
        return {
          ...row,
          video_url,
        };
      })
    );

    const exerciseIds = withSigned
      .map((row: { exercise_id: number }) => row.exercise_id)
      .filter((id: number) => id != null && id !== undefined);

    const resolved = await resolveAssignmentCounts(exerciseIds);
    const assignmentCountByExerciseId = resolved.counts;
    const assignmentCountsError = resolved.assignmentCountsError;
    const assignmentCountsRpcUnavailable = resolved.assignmentCountsRpcUnavailable;

    const withAssignments = withSigned.map((row: { exercise_id: unknown }) => {
      const eid = normalizeExerciseId(row.exercise_id);
      return {
        ...row,
        assigned_user_count: assignmentCountsError
          ? null
          : eid != null
            ? (assignmentCountByExerciseId.get(eid) ?? 0)
            : 0,
      };
    });

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    res.json({
      data: withAssignments,
      meta: {
        page,
        pageSize,
        total,
        totalPages,
        assignmentCountsError,
        assignmentCountsRpcUnavailable,
      },
    });
  } catch (err) {
    console.error('GET /api/exercises unexpected error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Registered before /:id so "by-module" is not captured as an exercise id.
router.get('/by-module/:moduleId', async (req, res) => {
  try {
    const moduleId = Number(req.params.moduleId);
    if (!Number.isInteger(moduleId) || moduleId <= 0) {
      return res.status(400).json({ message: 'Invalid module id' });
    }

    const { data: meRows, error: meError } = await supabaseServer
      .from('module_exercise')
      .select('exercise_id, order_index')
      .eq('module_id', moduleId)
      .order('order_index', { ascending: true });

    if (meError) {
      console.error('GET /api/exercises/by-module/:moduleId module_exercise error:', meError);
      return res.status(500).json({ message: 'Failed to fetch module exercises' });
    }

    if (!meRows?.length) {
      return res.json({ data: [] });
    }

    const exIds = meRows.map((r: any) => r.exercise_id);
    const { data: exRows, error: exError } = await supabaseServer
      .from('exercise')
      .select(`
        exercise_id,
        title,
        description,
        default_sets,
        default_reps,
        body_part,
        thumbnail_url,
        video_url,
        tags,
        video:video_id(
          bucket,
          object_key,
          original_filename,
          mime_type,
          byte_size,
          duration_seconds,
          width,
          height
        )
      `)
      .in('exercise_id', exIds);

    if (exError) {
      console.error('GET /api/exercises/by-module/:moduleId exercise error:', exError);
      return res.status(500).json({ message: 'Failed to fetch exercises' });
    }

    const byId = new Map((exRows ?? []).map((row: any) => [row.exercise_id, row]));
    const orderedRaw = meRows
      .map((me: any) => byId.get(me.exercise_id))
      .filter(Boolean);

    const withSigned = await Promise.all(
      orderedRaw.map(async (row: any) => {
        const signed = await createSignedUrl(row.video);
        return {
          ...row,
          video_url: row.video_url || signed || null,
        };
      })
    );

    return res.json({ data: withSigned });
  } catch (err) {
    console.error('GET /api/exercises/by-module/:moduleId unexpected error:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!Number.isInteger(id) || id <= 0) {
      return res.status(400).json({ message: 'Invalid exercise id' });
    }

    const { data, error } = await supabaseServer
      .from('exercise')
      .select(`
        exercise_id,
        title,
        description,
        default_sets,
        default_reps,
        body_part,
        thumbnail_url,
        tags,
        created_at,
        updated_at,
        video_id,
        video:video_id(
          bucket,
          object_key,
          original_filename,
          mime_type,
          byte_size,
          duration_seconds,
          width,
          height
        )
      `)
      .eq('exercise_id', id)
      .single();

    if (error) {
      if ((error as { code?: string }).code === 'PGRST116') {
        return res.status(404).json({ message: 'Exercise not found' });
      }
      console.error('GET /api/exercises/:id error:', error);
      return res.status(500).json({ message: 'Failed to fetch exercise' });
    }
    if (!data) return res.status(404).json({ message: 'Exercise not found' });

    const video_url = await createSignedUrl(data.video);

    const resolved = await resolveAssignmentCounts([id]);
    const assigned_user_count = resolved.assignmentCountsError
      ? null
      : (resolved.counts.get(id) ?? 0);

    const result = {
      ...data,
      video_url,
      assigned_user_count,
      assigned_count_rpc_unavailable: resolved.assignmentCountsRpcUnavailable,
    };

    res.json(result);
  } catch (err) {
    console.error('GET /api/exercises/:id unexpected error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// PATCH /api/exercises/:id - Update exercise (super_admin only)
router.patch(
  '/:id',
  requireSuperAdmin as express.RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid exercise id' });
      }
      const { title, description, default_sets, default_reps, category } = req.body;

      const payload: any = {};
      if (title !== undefined) payload.title = String(title).trim();
      if (description !== undefined) payload.description = String(description).trim();
      if (default_sets !== undefined) payload.default_sets = Number(default_sets) || null;
      if (default_reps !== undefined) payload.default_reps = Number(default_reps) || null;
      if (category !== undefined) payload.body_part = String(category).trim() || null;

      if (Object.keys(payload).length > 0) {
        payload.tags = [];
      }

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      if (payload.title !== undefined) {
        const { data: existing } = await supabaseServer
          .from('exercise')
          .select('exercise_id')
          .ilike('title', String(payload.title).trim())
          .neq('exercise_id', id)
          .limit(1)
          .maybeSingle();
        if (existing) {
          return res.status(409).json({ error: 'Exercise name already exists' });
        }
      }

      const { data, error } = await supabaseServer
        .from('exercise')
        .update(payload)
        .eq('exercise_id', id)
        .select('exercise_id, title, description, default_sets, default_reps, body_part, tags, updated_at')
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'Exercise name already exists' });
        }
        console.error('PATCH /api/exercises error:', error);
        return res.status(500).json({ error: 'Failed to update exercise', detail: error.message });
      }
      if (!data) return res.status(404).json({ error: 'Exercise not found' });

      res.json(data);
    } catch (err: any) {
      console.error('PATCH /api/exercises unexpected error:', err);
      res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  }
);

// DELETE /api/exercises/:id - Delete exercise (super_admin only)
// Must delete module_exercise and user_exercise first due to FK RESTRICT
router.delete(
  '/:id',
  requireSuperAdmin as express.RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid exercise id' });
      }

      const { error: uaxErr } = await supabaseServer
        .from('user_assignment_exercise')
        .delete()
        .eq('exercise_id', id);
      if (uaxErr) {
        console.error('DELETE user_assignment_exercise error:', uaxErr);
        return res.status(500).json({ error: 'Failed to delete exercise', detail: uaxErr.message });
      }

      const { error: userExErr } = await supabaseServer
        .from('user_exercise')
        .delete()
        .eq('exercise_id', id);
      if (userExErr) {
        console.error('DELETE user_exercise error:', userExErr);
        return res.status(500).json({ error: 'Failed to delete exercise', detail: userExErr.message });
      }

      const { error: modExErr } = await supabaseServer
        .from('module_exercise')
        .delete()
        .eq('exercise_id', id);
      if (modExErr) {
        console.error('DELETE module_exercise error:', modExErr);
        return res.status(500).json({ error: 'Failed to delete exercise', detail: modExErr.message });
      }

      const { error } = await supabaseServer
        .from('exercise')
        .delete()
        .eq('exercise_id', id);

      if (error) {
        console.error('DELETE /api/exercises error:', error);
        return res.status(500).json({ error: 'Failed to delete exercise', detail: error.message });
      }

      void logDashboardActivity(`Deleted: Exercise (id ${id})`);
      res.status(204).send();
    } catch (err: any) {
      console.error('DELETE /api/exercises unexpected error:', err);
      res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  }
);

// POST /api/exercises - Create new exercise (super_admin only)
router.post(
  '/',
  requireSuperAdmin as express.RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const { title, description, default_sets, default_reps, category } = req.body;

      if (!title || typeof title !== 'string' || !title.trim()) {
        return res.status(400).json({ error: 'Title is required' });
      }
      if (!description || typeof description !== 'string' || !description.trim()) {
        return res.status(400).json({ error: 'Description is required' });
      }
      const sets = default_sets != null ? Number(default_sets) : null;
      const reps = default_reps != null ? Number(default_reps) : null;
      if (sets == null || !Number.isInteger(sets) || sets < 1) {
        return res.status(400).json({ error: 'Sets must be a positive integer' });
      }
      if (reps == null || !Number.isInteger(reps) || reps < 1) {
        return res.status(400).json({ error: 'Reps must be a positive integer' });
      }
      if (!category || typeof category !== 'string' || !category.trim()) {
        return res.status(400).json({ error: 'Category is required' });
      }

      const admin = (req as any).admin;
      if (!admin?.id) {
        return res.status(401).json({ error: 'Admin ID not found in request' });
      }

      const { data: existing } = await supabaseServer
        .from('exercise')
        .select('exercise_id')
        .ilike('title', title.trim())
        .limit(1)
        .maybeSingle();
      if (existing) {
        return res.status(409).json({ error: 'Exercise name already exists' });
      }

      const payload: any = {
        title: title.trim(),
        description: description.trim(),
        default_sets: sets,
        default_reps: reps,
        body_part: category.trim(),
        tags: [],
        created_by_admin_id: null,
      };

      const { data, error } = await supabaseServer
        .from('exercise')
        .insert(payload)
        .select('exercise_id, title, description, default_sets, default_reps, created_at, updated_at')
        .single();

      if (error) {
        if (error.code === '23505') {
          return res.status(409).json({ error: 'Exercise name already exists' });
        }
        console.error('POST /api/exercises error:', error);
        return res.status(500).json({ error: 'Failed to create exercise', detail: error.message });
      }

      res.status(201).json(data);
    } catch (err: any) {
      console.error('POST /api/exercises unexpected error:', err);
      res.status(500).json({ error: 'Internal server error', detail: err.message });
    }
  }
);

// ─── ATH-393 / ATH-410: Upload video + persist video_url ─────────────────────

const ALLOWED_VIDEO_MIME_TYPES = ['video/mp4', 'video/quicktime'];
const ALLOWED_VIDEO_EXTENSIONS = ['.mp4', '.mov'];

const ALLOWED_IMAGE_MIME_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp'];
const ALLOWED_IMAGE_EXTENSIONS = ['.png', '.jpg', '.jpeg', '.webp'];

const THUMBNAIL_BUCKET_NAME = 'exercise-thumbnails';

const videoUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (
    _req: express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype) || ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

const thumbnailUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (
    _req: express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype) || ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid image type'));
    }
  },
});

router.post(
  '/:id/video',
  requireSuperAdmin as express.RequestHandler,
  ((req: Request, res: Response, next: NextFunction) => {
    videoUpload.single('file')(req as any, res as any, (err: any) => {
      if (err) return res.status(400).json({ error: 'Video must be .mp4 or .mov' });
      next();
    });
  }) as express.RequestHandler,
  (async (req: Request, res: Response) => {
    try {
      const exerciseId = Number(req.params.id);
      if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
        return res.status(400).json({ error: 'Invalid exercise id' });
      }
      const { data: existingExercise, error: exerciseError } = await supabaseServer
      .from('exercise')
      .select('exercise_id')
      .eq('exercise_id', exerciseId)
      .single();

if (exerciseError || !existingExercise) {
  return res.status(404).json({ error: 'Exercise not found' });
}

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: 'No file provided' });

      const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
      if (!ALLOWED_VIDEO_MIME_TYPES.includes(file.mimetype) && !ALLOWED_VIDEO_EXTENSIONS.includes(ext)) {
        return res.status(400).json({ error: '400 Invalid file type' });
      }

      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectKey = `exercises/${exerciseId}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabaseServer.storage
        .from(BUCKET_NAME)
        .upload(objectKey, file.buffer, { contentType: file.mimetype, upsert: false });

      if (uploadError) {
        return res.status(500).json({ error: 'Upload failed', detail: uploadError.message });
      }

      const { data: urlData } = supabaseServer.storage
        .from(BUCKET_NAME)
        .getPublicUrl(objectKey);

      // Note: Video metadata (width/height/duration) will be null at upload time
      // These can be updated later via video processing or frontend analysis
      const { data: videoRecord, error: dbError } = await supabaseServer
        .from('video')
        .insert({
          bucket: BUCKET_NAME,
          object_key: objectKey,
          original_filename: file.originalname,
          mime_type: file.mimetype,
          byte_size: file.size,
          uploader_user_id: null,
          duration_seconds: null,
          width: null,
          height: null,
        })
        .select('video_id')
        .single();

      if (dbError || !videoRecord) {
        console.error('Video DB insert error:', dbError);
        return res.status(500).json({ 
          error: 'Failed to create video record', 
          detail: dbError?.message || 'Unknown database error'
        });
      }

      await linkVideoToExercise(
        supabaseServer,
        exerciseId,
        videoRecord.video_id,
        urlData.publicUrl   // ATH-410: persist video_url
      );

      return res.status(200).json({
        storage_path: objectKey,
        url: urlData.publicUrl,
        video_url: urlData.publicUrl,
        metadata: {
          size: file.size,
          content_type: file.mimetype,
        },
      });
    } catch (err: any) {
      console.error('POST /api/exercises/:id/video error:', err);
      return res.status(500).json({ error: 'Upload failed', detail: err.message });
    }
  }) as express.RequestHandler
);

// POST /api/exercises/:id/thumbnail - Upload thumbnail and persist thumbnail_url
router.post(
  '/:id/thumbnail',
  requireSuperAdmin as express.RequestHandler,
  ((req: Request, res: Response, next: NextFunction) => {
    thumbnailUpload.single('file')(req as any, res as any, (err: any) => {
      if (err) return res.status(400).json({ error: 'Thumbnail must be .png, .jpg, .jpeg, or .webp' });
      next();
    });
  }) as express.RequestHandler,
  (async (req: Request, res: Response) => {
    try {
      const exerciseId = Number(req.params.id);
      if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
        return res.status(400).json({ error: 'Invalid exercise id' });
      }

      // Verify exercise exists before upload
      const { data: existingExercise, error: exerciseError } = await supabaseServer
        .from('exercise')
        .select('exercise_id')
        .eq('exercise_id', exerciseId)
        .single();

      if (exerciseError || !existingExercise) {
        return res.status(404).json({ error: 'Exercise not found' });
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) return res.status(400).json({ error: 'No file provided' });

      const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
      if (!ALLOWED_IMAGE_MIME_TYPES.includes(file.mimetype) && !ALLOWED_IMAGE_EXTENSIONS.includes(ext)) {
        return res.status(400).json({ error: 'Invalid image type' });
      }

      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectKey = `thumbnails/${exerciseId}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabaseServer.storage
        .from(THUMBNAIL_BUCKET_NAME)
        .upload(objectKey, file.buffer, { contentType: file.mimetype, upsert: false });

      if (uploadError) {
        return res.status(500).json({ error: 'Upload failed', detail: uploadError.message });
      }

      const { data: urlData } = supabaseServer.storage
        .from(THUMBNAIL_BUCKET_NAME)
        .getPublicUrl(objectKey);

      // Update exercise with thumbnail_url
      const { error: updateError } = await supabaseServer
        .from('exercise')
        .update({ thumbnail_url: urlData.publicUrl })
        .eq('exercise_id', exerciseId);

      if (updateError) {
        return res.status(500).json({ error: 'Failed to update exercise', detail: updateError.message });
      }

      return res.status(200).json({
        storage_path: objectKey,
        url: urlData.publicUrl,
        thumbnail_url: urlData.publicUrl,
        metadata: {
          size: file.size,
          content_type: file.mimetype,
        },
      });
    } catch (err: any) {
      console.error('POST /api/exercises/:id/thumbnail error:', err);
      return res.status(500).json({ error: 'Upload failed', detail: err.message });
    }
  }) as express.RequestHandler
);

export default router;