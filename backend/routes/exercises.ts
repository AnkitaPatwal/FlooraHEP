import express from 'express';
import { supabaseServer } from '../lib/supabaseServer';
import { createSignedUrl } from '../lib/signedUrl';

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