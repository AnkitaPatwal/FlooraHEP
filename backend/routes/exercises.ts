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
    const tagId = req.query.tagId ? Number(req.query.tagId) : undefined;
    const muscleGroupId = req.query.muscle_group_id ? Number(req.query.muscle_group_id) : undefined;
    const muscleId = req.query.muscle_id ? Number(req.query.muscle_id) : undefined;
    const createdByAdminId = req.query.created_by_admin_id ? Number(req.query.created_by_admin_id) : undefined;
    const hasVideoStr = (req.query.has_video as string | undefined)?.toLowerCase();
    const hasVideo = hasVideoStr === 'true' ? true : hasVideoStr === 'false' ? false : undefined;

    const sort = (req.query.sort as string) || 'created_at';
    const order = ((req.query.order as string) || 'desc').toLowerCase() === 'asc' ? { ascending: true } : { ascending: false };

    const baseSelect = [
      'exercise_id',
      'title',
      'description',
      'default_sets',
      'default_reps',
      'created_by_admin_id',
      'created_at',
      'updated_at',
      'video:video_id(*)',
      'thumbnail:thumbnail_photo_id(*)',
    ];

    const joinBits: string[] = [];
    if (tagId) joinBits.push('exercise_tag!inner(tag_id)');
    if (muscleGroupId || muscleId) {
      joinBits.push('exercise_muscles!inner(role, muscle:muscles(id, name, muscle_group:muscle_groups(id, name)))');
    }

    const select = [baseSelect.join(','), ...joinBits].join(',');

    let query = supabaseServer
      .from('exercise')
      .select(select, { count: 'exact' });

    if (search) {
      query = query.or(
        `title.ilike.%${search}%,description.ilike.%${search}%`
      );
    }

    if (typeof createdByAdminId === 'number' && !Number.isNaN(createdByAdminId)) {
      query = query.eq('created_by_admin_id', createdByAdminId);
    }

    if (typeof hasVideo === 'boolean') {
      if (hasVideo) query = query.not('video_id', 'is', null);
      else query = query.is('video_id', null);
    }

    if (tagId) {
      query = query.eq('exercise_tag.tag_id', tagId);
    }

    if (muscleId) {
      query = query.eq('exercise_muscles.muscle_id', muscleId);
    }
    if (muscleGroupId) {
      query = query.eq('exercise_muscles.muscle.muscle_group.id', muscleGroupId);
    }

    const sortColumn = ['created_at', 'updated_at', 'title'].includes(sort) ? sort : 'created_at';
    query = query.order(sortColumn as any, order);

    query = query.range(offset, offset + pageSize - 1);

    const { data, error, count } = await query;

    if (error) {
      console.error('GET /api/exercises error:', error);
      return res.status(500).json({ message: 'Failed to fetch exercises' });
    }

    const withSigned = await Promise.all(
      (data ?? []).map(async (row: any) => {
        const thumbnail_url = await createSignedUrl(row.thumbnail);
        return {
          ...row,
          thumbnail_url,
          thumbnail: undefined,
          video: undefined,
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
    if (!Number.isFinite(id) || id <= 0) {
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
        created_by_admin_id,
        created_at,
        updated_at,
        video:video_id(*),
        thumbnail:thumbnail_photo_id(*),
        tags:exercise_tag(tag_id),
        muscles:exercise_muscles(
          role,
          muscle:muscles(
            id, name,
            muscle_group:muscle_groups(id, name)
          )
        )
      `)
      .eq('exercise_id', id)
      .single();

    if (error) {
      console.error('GET /api/exercises/:id error:', error);
      return res.status(500).json({ message: 'Failed to fetch exercise' });
    }
    if (!data) return res.status(404).json({ message: 'Exercise not found' });

    const [video_url, thumbnail_url] = await Promise.all([
      createSignedUrl(data.video),
      createSignedUrl(data.thumbnail),
    ]);

    const result = {
      ...data,
      video_url,
      thumbnail_url,
      video: undefined,
      thumbnail: undefined,
    };

    res.json(result);
  } catch (err) {
    console.error('GET /api/exercises/:id unexpected error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
});

export default router;
