import express from 'express';
import request from 'supertest';
import exercisesRouter from '../exercises';
import { supabaseServer } from '../../lib/supabaseServer';
import * as videoService from '../../services/videoService';

process.env.NEXT_PUBLIC_SUPABASE_URL = 'http://localhost:54321';
process.env.LOCAL_SUPABASE_URL = 'http://localhost:54321';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';
process.env.LOCAL_SUPABASE_SERVICE_ROLE_KEY = 'test-service-role-key';

let app: any;

// Mock the actual middleware used by routes/exercises.ts
jest.mock('../../middleware/requireSuperAdmin', () => ({
  requireSuperAdmin: (req: any, res: any, next: any) => {
    const auth = req.headers.authorization;
    if (!auth || !auth.startsWith('Bearer ')) {
      return res
        .status(401)
        .json({ ok: false, error: 'Missing authorization token' });
    }

    const roleHeader = req.headers['x-test-admin-role'];

    req.admin = {
      id: roleHeader === 'admin' ? 'admin-uuid-456' : 'admin-uuid-123',
      email: roleHeader === 'admin' ? 'admin@test.com' : 'superadmin@test.com',
      role: roleHeader === 'admin' ? 'admin' : 'super_admin',
      is_active: true,
    };

    if (req.admin.role !== 'super_admin') {
      return res.status(403).json({ ok: false, error: 'Super admin required' });
    }

    next();
  },
}));

jest.mock('../../lib/supabaseServer', () => ({
  supabaseServer: {
    storage: { from: jest.fn() },
    from: jest.fn(),
    rpc: jest.fn().mockResolvedValue({ data: [], error: null }),
  },
}));

jest.mock('../../services/videoService', () => ({
  ...jest.requireActual('../../services/videoService'),
  linkVideoToExercise: jest.fn(),
  BUCKET_NAME: 'exercise-videos',
}));

const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockUpdate = jest.fn();
const mockLinkVideo = videoService.linkVideoToExercise as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();

  app = express();
  app.use(express.json());
  app.use('/api/exercises', exercisesRouter);

  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({
    data: {
      publicUrl:
        'https://example.supabase.co/storage/v1/object/public/exercise-videos/exercises/1/123_test.mp4',
    },
  });

  (supabaseServer.storage.from as jest.Mock).mockReturnValue({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
  });

  mockSingle.mockResolvedValue({ data: { video_id: 42 }, error: null });
  mockSelect.mockReturnValue({ single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });

  mockLinkVideo.mockResolvedValue(undefined);
});

describe('POST /api/exercises - Create New Exercise', () => {
  it('creates new exercise with valid data', async () => {
    const mockCreated = {
      exercise_id: 999,
      title: 'New Exercise',
      description: 'Test description',
      default_sets: 3,
      default_reps: 10,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    mockSingle.mockResolvedValue({ data: mockCreated, error: null });
    mockSelect.mockReturnValue({ single: mockSingle });
    mockInsert.mockReturnValue({ select: mockSelect });

    const mockTitleCheckChain = {
      select: jest.fn().mockReturnThis(),
      ilike: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      maybeSingle: jest.fn().mockResolvedValue({ data: null, error: null }),
    };

    let fromCallCount = 0;
    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'exercise') {
        fromCallCount++;
        return fromCallCount === 1 ? mockTitleCheckChain : { insert: mockInsert };
      }
      return { insert: mockInsert, update: mockUpdate, select: mockSelect };
    });

    const res = await request(app)
      .post('/api/exercises')
      .set('Authorization', 'Bearer fake-token')
      .send({
        title: 'New Exercise',
        description: 'Test description',
        default_sets: 3,
        default_reps: 10,
        category: 'Core',
      });

    expect(res.status).toBe(201);
    expect(res.body.exercise_id).toBe(999);
    expect(res.body.title).toBe('New Exercise');

    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Exercise',
      })
    );
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .set('Authorization', 'Bearer fake-token')
      .send({ description: 'Test' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Title is required' });
  });

  it('only super_admin can create exercises (admin returns 403)', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .set('Authorization', 'Bearer fake-token')
      .set('x-test-admin-role', 'admin')
      .send({ title: 'New Exercise' });

    expect(res.status).toBe(403);
  });

  it('no token returns 401', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .send({ title: 'New Exercise' });

    expect(res.status).toBe(401);
  });
});

describe('ATH-410 - Persist Video URL to exercises.video_url', () => {
  it('successful update writes video_url to the exercise record', async () => {
    const exerciseCheckChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { exercise_id: 1 }, error: null }),
    };

    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'exercise') return exerciseCheckChain;
      if (table === 'video') return { insert: mockInsert };
      return {};
    });

    const res = await request(app)
      .post('/api/exercises/1/video')
      .set('Authorization', 'Bearer fake-token')
      .attach('file', Buffer.from('fake mp4'), {
        filename: 'test.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('video_url');
    expect(res.body.video_url).toMatch(/^https:\/\//);
    expect(mockLinkVideo).toHaveBeenCalledWith(
      expect.anything(),
      1,
      42,
      expect.stringMatching(/^https:\/\//)
    );
  });

  it('replace flow: linkVideoToExercise is called with new url, overwriting prior video_url', async () => {
    const exerciseCheckChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { exercise_id: 1 }, error: null }),
    };

    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'exercise') return exerciseCheckChain;
      if (table === 'video') return { insert: mockInsert };
      return {};
    });

    const res = await request(app)
      .post('/api/exercises/1/video')
      .set('Authorization', 'Bearer fake-token')
      .attach('file', Buffer.from('new mp4'), {
        filename: 'new.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(200);
    expect(mockLinkVideo).toHaveBeenCalledTimes(1);
    expect(mockLinkVideo).toHaveBeenCalledWith(
      expect.anything(),
      1,
      42,
      expect.stringMatching(/^https:\/\//)
    );
  });

  it('invalid exercise_id returns 400 and no update happens', async () => {
    const res = await request(app)
      .post('/api/exercises/abc/video')
      .set('Authorization', 'Bearer fake-token')
      .attach('file', Buffer.from('fake mp4'), {
        filename: 'test.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(400);
    expect(mockLinkVideo).not.toHaveBeenCalled();
  });

  it('unauthorized update blocked - admin role returns 403 and record unchanged', async () => {
    const res = await request(app)
      .post('/api/exercises/1/video')
      .set('Authorization', 'Bearer fake-token')
      .set('x-test-admin-role', 'admin')
      .attach('file', Buffer.from('fake mp4'), {
        filename: 'test.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(403);
    expect(mockLinkVideo).not.toHaveBeenCalled();
  });

  it('DB failure returns 500 and exercise record remains unchanged', async () => {
    const exerciseCheckChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: { exercise_id: 1 }, error: null }),
    };

    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'exercise') return exerciseCheckChain;
      if (table === 'video') return { insert: mockInsert };
      return {};
    });

    mockLinkVideo.mockRejectedValue(new Error('DB update failed'));

    const res = await request(app)
      .post('/api/exercises/1/video')
      .set('Authorization', 'Bearer fake-token')
      .attach('file', Buffer.from('fake mp4'), {
        filename: 'test.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });

  it('non-existent exercise_id returns 404 and no upload happens', async () => {
    const exerciseCheckChain = {
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({
        data: null,
        error: { message: 'Not found' },
      }),
    };

    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'exercise') return exerciseCheckChain;
      if (table === 'video') return { insert: mockInsert };
      return {};
    });

    const res = await request(app)
      .post('/api/exercises/99999/video')
      .set('Authorization', 'Bearer fake-token')
      .attach('file', Buffer.from('fake mp4'), {
        filename: 'test.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(404);
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockLinkVideo).not.toHaveBeenCalled();
  });
});

describe('POST /api/exercises/:id/thumbnail - Upload Thumbnail', () => {
  beforeEach(() => {
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: {
        publicUrl:
          'https://example.supabase.co/storage/v1/object/public/exercise-thumbnails/thumbnails/1/123_thumb.png',
      },
    });

    (supabaseServer.storage.from as jest.Mock).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    let callCount = 0;
    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'exercise') {
        callCount++;
        if (callCount === 1) {
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { exercise_id: 1 }, error: null }),
              }),
            }),
          };
        }

        return {
          update: jest.fn().mockReturnValue({
            eq: jest.fn().mockResolvedValue({ error: null }),
          }),
        };
      }
      return {};
    });
  });

  it('successfully uploads thumbnail and persists thumbnail_url', async () => {
    const res = await request(app)
      .post('/api/exercises/1/thumbnail')
      .set('Authorization', 'Bearer fake-token')
      .attach('file', Buffer.from('fake png'), {
        filename: 'thumbnail.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('thumbnail_url');
    expect(res.body.thumbnail_url).toMatch(/^https:\/\//);
    expect(res.body.storage_path).toContain('thumbnails/1/');
  });

  it('accepts .png format', async () => {
    const res = await request(app)
      .post('/api/exercises/1/thumbnail')
      .set('Authorization', 'Bearer fake-token')
      .attach('file', Buffer.from('fake png'), {
        filename: 'thumb.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(200);
  });

  it('accepts .jpg format', async () => {
    const res = await request(app)
      .post('/api/exercises/1/thumbnail')
      .set('Authorization', 'Bearer fake-token')
      .attach('file', Buffer.from('fake jpg'), {
        filename: 'thumb.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
  });

  it('rejects invalid file types (video/mp4)', async () => {
    const res = await request(app)
      .post('/api/exercises/1/thumbnail')
      .set('Authorization', 'Bearer fake-token')
      .attach('file', Buffer.from('fake video'), {
        filename: 'video.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Thumbnail must|Invalid image/i);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('returns 404 for non-existent exercise', async () => {
    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'exercise') {
        return {
          select: jest.fn().mockReturnValue({
            eq: jest.fn().mockReturnValue({
              single: jest.fn().mockResolvedValue({
                data: null,
                error: { message: 'Not found' },
              }),
            }),
          }),
        };
      }
      return {};
    });

    const res = await request(app)
      .post('/api/exercises/99999/thumbnail')
      .set('Authorization', 'Bearer fake-token')
      .attach('file', Buffer.from('fake png'), {
        filename: 'thumb.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(404);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('only super_admin can upload (admin returns 403)', async () => {
    const res = await request(app)
      .post('/api/exercises/1/thumbnail')
      .set('Authorization', 'Bearer fake-token')
      .set('x-test-admin-role', 'admin')
      .attach('file', Buffer.from('fake png'), {
        filename: 'thumb.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(403);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('no token returns 401', async () => {
    const res = await request(app)
      .post('/api/exercises/1/thumbnail')
      .attach('file', Buffer.from('fake png'), {
        filename: 'thumb.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(401);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('storage error returns 500', async () => {
    mockUpload.mockResolvedValue({ error: { message: 'Storage error' } });

    (supabaseServer.storage.from as jest.Mock).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });

    const res = await request(app)
      .post('/api/exercises/1/thumbnail')
      .set('Authorization', 'Bearer fake-token')
      .attach('file', Buffer.from('fake png'), {
        filename: 'thumb.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Upload failed');
  });
});