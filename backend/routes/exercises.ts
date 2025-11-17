// routes/exercises.ts
import express from 'express';
import { supabaseServer } from '../lib/supabaseServer';
import { createSignedUrl } from '../lib/signedUrl';

const router = express.Router();

function intParam(v: unknown, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback;
}

// GET /api/exercises
// ?page=1&pageSize=20&search=pla&body_part=core&equipment=mat&level=beginner&tag=core&sort=created_at&order=desc
router.get('/', async (req, res) => {
  try {
    const page = intParam(req.query.page, 1);
    const pageSize = Math.min(intParam(req.query.pageSize, 20), 100);
    const offset = (page - 1) * pageSize;

    const search = (req.query.search as string | undefined)?.trim();
    const bodyPart = (req.query.body_part as string | undefined)?.trim();
    const equipment = (req.query.equipment as string | undefined)?.trim();
    const level = (req.query.level as string | undefined)?.trim();
    const tag = (req.query.tag as string | undefined)?.trim();

    const sort = (req.query.sort as string) || 'created_at';
    const order = ((req.query.order as string) || 'desc').toLowerCase() === 'asc'
      ? { ascending: true } : { ascending: false };

    // Use the view so we have video info available
    let query = supabaseServer
      .from('exercise_with_video')
      .select('*', { count: 'exact' });

    if (search) {
      // name ILIKE '%search%'
      query = query.ilike('name', `%${search}%`);
    }
    if (bodyPart) query = query.eq('body_part', bodyPart);
    if (equipment) query = query.eq('equipment', equipment);
    if (level) query = query.eq('level', level);
    if (tag) {
      // tags is text[]; use contains with a single-item array
      query = query.contains('tags', [tag]);
    }

    const sortColumn = ['created_at', 'name', 'body_part', 'equipment', 'level'].includes(sort)
      ? sort : 'created_at';
    query = query.order(sortColumn as any, order);

    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;
    if (error) {
      console.error('GET /api/exercises error:', error);
      return res.status(500).json({ message: 'Failed to fetch exercises' });
    }

    const withSigned = await Promise.all(
      (data ?? []).map(async (row: any) => {
        const video_url = await createSignedUrl({ bucket: row.bucket, video_path: row.video_path });
        // Return a clean payload without storage internals if you like
        const {
          bucket, video_path, object_key, ...rest
        } = row;
        return { ...rest, video_url };
      })
    );

    const total = count ?? 0;
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    res.json({ data: withSigned, meta: { page, pageSize, total, totalPages } });
  } catch (err) {
    console.error('GET /api/exercises unexpected error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// GET /api/exercises/:id  (UUID)
router.get('/:id', async (req, res) => {
  try {
    const id = String(req.params.id).trim();
    // very light UUID sanity check; skip hard validation to avoid false negatives
    if (!id) return res.status(400).json({ message: 'Invalid exercise id' });

    const { data, error } = await supabaseServer
      .from('exercise_with_video')
      .select('*')
      .eq('exercise_id', id)
      .single();

    if (error) {
      console.error('GET /api/exercises/:id error:', error);
      return res.status(500).json({ message: 'Failed to fetch exercise' });
    }
    if (!data) return res.status(404).json({ message: 'Exercise not found' });

    const video_url = await createSignedUrl({ bucket: data.bucket, video_path: data.video_path });

    const {
      bucket, video_path, object_key, // strip internal fields
      ...rest
    } = data;

    res.json({ ...rest, video_url });
  } catch (err) {
    console.error('GET /api/exercises/:id unexpected error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;