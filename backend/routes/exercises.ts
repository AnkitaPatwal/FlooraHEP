import express, { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import { supabaseServer } from '../lib/supabaseServer';
import { createSignedUrl } from '../lib/signedUrl';
import { requireSuperAdmin } from '../middleware/requireSuperAdmin';
import { uploadExerciseVideo, linkVideoToExercise, BUCKET_NAME } from '../services/videoService';

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

export default router;

// ─── ATH-393: Upload video for an exercise (super_admin only) ────────────────

const ALLOWED_MIME_TYPES = ["video/mp4", "video/quicktime"];
const ALLOWED_EXTENSIONS = [".mp4", ".mov"];

const videoUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (
    _req: express.Request,
    file: Express.Multer.File,
    cb: multer.FileFilterCallback
  ) => {
    const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
    if (ALLOWED_MIME_TYPES.includes(file.mimetype) || ALLOWED_EXTENSIONS.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// POST /api/exercises/:id/video
router.post(
  '/:id/video',
  requireSuperAdmin as express.RequestHandler,
  ((req: Request, res: Response, next: NextFunction) => {
    videoUpload.single('file')(req as any, res as any, (err: any) => {
      if (err) {
        return res.status(400).json({ error: '400 Invalid file type' });
      }
      next();
    });
  }) as express.RequestHandler,
  (async (req: Request, res: Response) => {
    try {
      const exerciseId = Number(req.params.id);
      if (!Number.isInteger(exerciseId) || exerciseId <= 0) {
        return res.status(400).json({ error: 'Invalid exercise id' });
      }

      const file = (req as any).file as Express.Multer.File | undefined;
      if (!file) {
        return res.status(400).json({ error: 'No file provided' });
      }

      const ext = '.' + file.originalname.split('.').pop()?.toLowerCase();
      if (!ALLOWED_MIME_TYPES.includes(file.mimetype) && !ALLOWED_EXTENSIONS.includes(ext)) {
        return res.status(400).json({ error: '400 Invalid file type' });
      }

      const timestamp = Date.now();
      const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectKey = `exercises/${exerciseId}/${timestamp}_${safeName}`;

      const { error: uploadError } = await supabaseServer.storage
        .from(BUCKET_NAME)
        .upload(objectKey, file.buffer, {
          contentType: file.mimetype,
          upsert: false,
        });

      if (uploadError) {
        return res.status(500).json({ error: 'Upload failed', detail: uploadError.message });
      }

      const { data: urlData } = supabaseServer.storage
        .from(BUCKET_NAME)
        .getPublicUrl(objectKey);

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
        return res.status(500).json({ error: 'Upload failed', detail: dbError?.message });
      }

      await linkVideoToExercise(supabaseServer, exerciseId, videoRecord.video_id);

      return res.status(200).json({
        storage_path: objectKey,
        url: urlData.publicUrl,
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