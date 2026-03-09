import request from 'supertest';
import app from '../../server';
import { supabaseServer } from '../../lib/supabaseServer';
import * as videoService from '../../services/videoService';
import jwt from 'jsonwebtoken';

// ── Mocks ────────────────────────────────────────────────────────────────────
jest.mock('../../lib/supabaseServer', () => ({
  supabaseServer: {
    storage: { from: jest.fn() },
    from: jest.fn(),
  },
}));

// Mock admin_users database for requireSuperAdmin middleware
jest.mock('@supabase/supabase-js', () => {
  const actualSupabase = jest.requireActual('@supabase/supabase-js');
  return {
    ...actualSupabase,
    createClient: jest.fn(() => ({
      from: jest.fn((table: string) => {
        if (table === 'admin_users') {
          return {
            select: jest.fn(() => ({
              eq: jest.fn((column: string, value: any) => ({
                maybeSingle: jest.fn(() => {
                  // Return appropriate admin based on ID
                  if (value === 'admin-uuid-123') {
                    return Promise.resolve({
                      data: { id: 'admin-uuid-123', email: 'superadmin@test.com', role: 'super_admin', is_active: true },
                      error: null,
                    });
                  } else if (value === 'admin-uuid-456') {
                    return Promise.resolve({
                      data: { id: 'admin-uuid-456', email: 'admin@test.com', role: 'admin', is_active: true },
                      error: null,
                    });
                  }
                  return Promise.resolve({ data: null, error: { message: 'Not found' } });
                }),
              })),
            })),
          };
        }
        return actualSupabase.createClient().from(table);
      }),
      auth: { persistSession: false },
    })),
  };
});

jest.mock('../../services/videoService', () => ({
  ...jest.requireActual('../../services/videoService'),
  linkVideoToExercise: jest.fn(),
  BUCKET_NAME: 'exercise-videos',
}));

// ── JWT helpers ───────────────────────────────────────────────────────────────
const ADMIN_JWT_SECRET = 'test-admin-jwt-secret';
process.env.ADMIN_JWT_SECRET = ADMIN_JWT_SECRET;

function makeToken(role: string, id: string = 'admin-uuid-123') {
  return jwt.sign(
    { id, email: 'admin@test.com', role, name: 'Test Admin' },
    ADMIN_JWT_SECRET,
    { expiresIn: '1h' }
  );
}

const superAdminToken = makeToken('super_admin');
const adminToken = makeToken('admin', 'admin-uuid-456');

// ── Storage + DB mocks ────────────────────────────────────────────────────────
const mockUpload = jest.fn();
const mockGetPublicUrl = jest.fn();
const mockInsert = jest.fn();
const mockSelect = jest.fn();
const mockSingle = jest.fn();
const mockUpdate = jest.fn();
const mockEq = jest.fn();
const mockLinkVideo = videoService.linkVideoToExercise as jest.Mock;

/* beforeEach(() => {
  jest.clearAllMocks();

  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({
    data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/exercise-videos/exercises/1/123_test.mp4' },
  });
  (supabaseServer.storage.from as jest.Mock).mockReturnValue({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
  });

  mockSingle.mockResolvedValue({ data: { video_id: 42 }, error: null });
  mockSelect.mockReturnValue({ single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });
  mockEq.mockResolvedValue({ error: null });
  mockUpdate.mockReturnValue({ eq: mockEq });
  (supabaseServer.from as jest.Mock).mockReturnValue({
    insert: mockInsert,
    update: mockUpdate,
    select: mockSelect,
  });

  mockLinkVideo.mockResolvedValue(undefined);
});*/
beforeEach(() => {
  jest.clearAllMocks();

  mockUpload.mockResolvedValue({ error: null });
  mockGetPublicUrl.mockReturnValue({
    data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/exercise-videos/exercises/1/123_test.mp4' },
  });
  (supabaseServer.storage.from as jest.Mock).mockReturnValue({
    upload: mockUpload,
    getPublicUrl: mockGetPublicUrl,
  });

  // Exercise existence check mock (SELECT)
  const mockSelectChain = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    single: jest.fn().mockResolvedValue({ data: { exercise_id: 1 }, error: null }),
  };

  // Video insert mock
  mockSingle.mockResolvedValue({ data: { video_id: 42 }, error: null });
  mockSelect.mockReturnValue({ single: mockSingle });
  mockInsert.mockReturnValue({ select: mockSelect });

  // Route supabaseServer.from to correct mock based on call order
  let callCount = 0;
  (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
    if (table === 'exercise' && callCount === 0) {
      callCount++;
      return mockSelectChain; // first call = existence check
    }
    return { insert: mockInsert, update: mockUpdate, select: mockSelect };
  });

  mockLinkVideo.mockResolvedValue(undefined);
});

describe('POST /api/exercises — Create New Exercise', () => {
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
    (supabaseServer.from as jest.Mock).mockReturnValue({ insert: mockInsert });

    const res = await request(app)
      .post('/api/exercises')
      .set('Cookie', `admin_token=${superAdminToken}`)
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
    
    // Verify created_by_admin_id is included in insert
    expect(mockInsert).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'New Exercise',
        created_by_admin_id: 'admin-uuid-123',
      })
    );
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .set('Cookie', `admin_token=${superAdminToken}`)
      .send({ description: 'Test' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'Title is required' });
  });

  it('only super_admin can create exercises (admin returns 403)', async () => {
    const res = await request(app)
      .post('/api/exercises')
      .set('Cookie', `admin_token=${adminToken}`)
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

describe('ATH-410 — Persist Video URL to exercises.video_url', () => {

  it('successful update writes video_url to the exercise record', async () => {
    const res = await request(app)
      .post('/api/exercises/1/video')
      .set('Cookie', `admin_token=${superAdminToken}`)
      .attach('file', Buffer.from('fake mp4'), {
        filename: 'test.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('video_url');
    expect(res.body.video_url).toMatch(/^https:\/\//);
    // linkVideoToExercise must be called with the public URL
    expect(mockLinkVideo).toHaveBeenCalledWith(
      expect.anything(),
      1,
      42,
      expect.stringMatching(/^https:\/\//)
    );
  });

  it('replace flow: linkVideoToExercise is called with new url, overwriting prior video_url', async () => {
    // Simulate a second upload to same exercise
    mockLinkVideo.mockResolvedValue(undefined);

    const res = await request(app)
      .post('/api/exercises/1/video')
      .set('Cookie', `admin_token=${superAdminToken}`)
      .attach('file', Buffer.from('new mp4'), {
        filename: 'new.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(200);
    expect(mockLinkVideo).toHaveBeenCalledTimes(1);
    // The new URL is passed — replace is handled inside linkVideoToExercise
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
      .set('Cookie', `admin_token=${superAdminToken}`)
      .attach('file', Buffer.from('fake mp4'), {
        filename: 'test.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(400);
    expect(mockLinkVideo).not.toHaveBeenCalled();
  });

  it('unauthorized update blocked — admin role returns 403 and record unchanged', async () => {
    const res = await request(app)
      .post('/api/exercises/1/video')
      .set('Cookie', `admin_token=${adminToken}`)
      .attach('file', Buffer.from('fake mp4'), {
        filename: 'test.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(403);
    expect(mockLinkVideo).not.toHaveBeenCalled();
  });

  it('DB failure returns 500 and exercise record remains unchanged', async () => {
    mockLinkVideo.mockRejectedValue(new Error('DB update failed'));

    const res = await request(app)
      .post('/api/exercises/1/video')
      .set('Cookie', `admin_token=${superAdminToken}`)
      .attach('file', Buffer.from('fake mp4'), {
        filename: 'test.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(500);
    expect(res.body).toHaveProperty('error');
  });
  it('non-existent exercise_id returns 404 and no upload happens', async () => {
    // Mock DB to return no exercise found
    (supabaseServer.from as jest.Mock).mockReturnValue({
      select: jest.fn().mockReturnThis(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
      insert: mockInsert,
      update: mockUpdate,
    });
  
    const res = await request(app)
      .post('/api/exercises/99999/video')
      .set('Cookie', `admin_token=${superAdminToken}`)
      .attach('file', Buffer.from('fake mp4'), {
        filename: 'test.mp4',
        contentType: 'video/mp4',
      });
  
    expect(res.status).toBe(404);
    expect(mockUpload).not.toHaveBeenCalled();
    expect(mockLinkVideo).not.toHaveBeenCalled();
  });

});

describe('POST /api/exercises/:id/thumbnail — Upload Thumbnail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    
    // Mock storage upload success
    mockUpload.mockResolvedValue({ error: null });
    mockGetPublicUrl.mockReturnValue({
      data: { publicUrl: 'https://example.supabase.co/storage/v1/object/public/exercise-thumbnails/thumbnails/1/123_thumb.png' },
    });
    (supabaseServer.storage.from as jest.Mock).mockReturnValue({
      upload: mockUpload,
      getPublicUrl: mockGetPublicUrl,
    });
    
    // Mock DB: first call for exercise check, second for update
    let callCount = 0;
    (supabaseServer.from as jest.Mock).mockImplementation((table: string) => {
      if (table === 'exercise') {
        callCount++;
        if (callCount === 1) {
          // First call: check exercise exists
          return {
            select: jest.fn().mockReturnValue({
              eq: jest.fn().mockReturnValue({
                single: jest.fn().mockResolvedValue({ data: { exercise_id: 1 }, error: null }),
              }),
            }),
          };
        } else {
          // Second call: update exercise
          return {
            update: jest.fn().mockReturnValue({
              eq: jest.fn().mockResolvedValue({ error: null }),
            }),
          };
        }
      }
      return {};
    });
  });

  it('successfully uploads thumbnail and persists thumbnail_url', async () => {
    const res = await request(app)
      .post('/api/exercises/1/thumbnail')
      .set('Cookie', `admin_token=${superAdminToken}`)
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
      .set('Cookie', `admin_token=${superAdminToken}`)
      .attach('file', Buffer.from('fake png'), {
        filename: 'thumb.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(200);
  });

  it('accepts .jpg format', async () => {
    const res = await request(app)
      .post('/api/exercises/1/thumbnail')
      .set('Cookie', `admin_token=${superAdminToken}`)
      .attach('file', Buffer.from('fake jpg'), {
        filename: 'thumb.jpg',
        contentType: 'image/jpeg',
      });

    expect(res.status).toBe(200);
  });

  it('rejects invalid file types (video/mp4)', async () => {
    const res = await request(app)
      .post('/api/exercises/1/thumbnail')
      .set('Cookie', `admin_token=${superAdminToken}`)
      .attach('file', Buffer.from('fake video'), {
        filename: 'video.mp4',
        contentType: 'video/mp4',
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Thumbnail must|Invalid image/i);
    expect(mockUpload).not.toHaveBeenCalled();
  });

  it('returns 404 for non-existent exercise', async () => {
    mockSingle.mockResolvedValue({ data: null, error: { message: 'Not found' } });
    mockEq.mockReturnThis();
    mockSelect.mockReturnValue({ eq: mockEq, single: mockSingle });
    (supabaseServer.from as jest.Mock).mockReturnValue({ select: mockSelect });

    const res = await request(app)
      .post('/api/exercises/99999/thumbnail')
      .set('Cookie', `admin_token=${superAdminToken}`)
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
      .set('Cookie', `admin_token=${adminToken}`)
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
      .set('Cookie', `admin_token=${superAdminToken}`)
      .attach('file', Buffer.from('fake png'), {
        filename: 'thumb.png',
        contentType: 'image/png',
      });

    expect(res.status).toBe(500);
    expect(res.body.error).toBe('Upload failed');
  });
});