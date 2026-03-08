import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { supabaseServer } from '../lib/supabaseServer';
import { createSignedUrl } from '../lib/signedUrl';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin';
import { linkVideoToExercise, BUCKET_NAME } from '../services/videoService';

const router = express.Router();

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
      const encoded = search.replace(/,/g, '');
      query = query.or(`title.ilike.%${encoded}%,description.ilike.%${encoded}%`);
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

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));

    res.json({
      data: withSigned,
      meta: { page, pageSize, total, totalPages },
    });
  } catch (err) {
    console.error('GET /api/exercises unexpected error:', err);
    res.status(500).json({ message: 'Internal server error' });
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
      console.error('GET /api/exercises/:id error:', error);
      return res.status(500).json({ message: 'Failed to fetch exercise' });
    }
    if (!data) return res.status(404).json({ message: 'Exercise not found' });

    const video_url = await createSignedUrl(data.video);

    const result = {
      ...data,
      video_url,
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

      if (Object.keys(payload).length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
      }

      const { data, error } = await supabaseServer
        .from('exercise')
        .update(payload)
        .eq('exercise_id', id)
        .select('exercise_id, title, description, default_sets, default_reps, body_part, updated_at')
        .single();

      if (error) {
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
router.delete(
  '/:id',
  requireSuperAdmin as express.RequestHandler,
  async (req: Request, res: Response) => {
    try {
      const id = Number(req.params.id);
      if (!Number.isInteger(id) || id <= 0) {
        return res.status(400).json({ error: 'Invalid exercise id' });
      }

      const { error } = await supabaseServer
        .from('exercise')
        .delete()
        .eq('exercise_id', id);

      if (error) {
        console.error('DELETE /api/exercises error:', error);
        return res.status(500).json({ error: 'Failed to delete exercise', detail: error.message });
      }

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

      // Get admin ID from the authenticated admin
      const admin = (req as any).admin;
      if (!admin?.id) {
        return res.status(401).json({ error: 'Admin ID not found in request' });
      }

      const payload: any = {
        title: title.trim(),
        description: description?.trim() || '',
        default_sets: default_sets ? Number(default_sets) : null,
        default_reps: default_reps ? Number(default_reps) : null,
        created_by_admin_id: admin.id,
      };

      if (category) {
        payload.body_part = category;
      }

      const { data, error } = await supabaseServer
        .from('exercise')
        .insert(payload)
        .select('exercise_id, title, description, default_sets, default_reps, created_at, updated_at')
        .single();

      if (error) {
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
      if (err) return res.status(400).json({ error: '400 Invalid file type' });
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
      if (err) return res.status(400).json({ error: 'Invalid image type' });
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
