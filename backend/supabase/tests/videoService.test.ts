import { uploadExerciseVideo, linkVideoToExercise, getVideoPublicUrl, getExerciseWithVideoUrl, BUCKET_NAME } from '../../services/videoService';

const MOCK_OBJECT_KEY  = 'crunches.mp4';
const MOCK_VIDEO_ID    = 5;
const MOCK_PUBLIC_URL  = `https://xyzproject.supabase.co/storage/v1/object/public/exercise-videos/${MOCK_OBJECT_KEY}`;
const MOCK_EXERCISE_ID = 19;

function buildMockSupabase({ uploadError = null as any, dbInsertError = null as any, dbUpdateError = null as any, dbSelectError = null as any, publicUrl = MOCK_PUBLIC_URL as string | null, exerciseData = null as any } = {}) {
  const storageFrom = { upload: jest.fn().mockResolvedValue({ error: uploadError }), getPublicUrl: jest.fn().mockReturnValue({ data: { publicUrl } }) };
  const videoInsertChain = { insert: jest.fn().mockReturnThis(), select: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: dbInsertError ? null : { video_id: MOCK_VIDEO_ID }, error: dbInsertError }) };
  const exerciseUpdateChain = { update: jest.fn().mockReturnValue({ eq: jest.fn().mockResolvedValue({ error: dbUpdateError }) }) };
  const exerciseSelectChain = { select: jest.fn().mockReturnThis(), eq: jest.fn().mockReturnThis(), single: jest.fn().mockResolvedValue({ data: dbSelectError ? null : (exerciseData ?? { exercise_id: MOCK_EXERCISE_ID, title: 'pelvic tilt', description: 'gentle pelvic floor activation exercise', video_id: MOCK_VIDEO_ID, video: [{ bucket: BUCKET_NAME, object_key: MOCK_OBJECT_KEY, original_filename: 'crunches.mp4', mime_type: 'video/mp4' }] }), error: dbSelectError }) };
  return { storage: { from: jest.fn().mockReturnValue(storageFrom) }, from: jest.fn((table: string) => { if (table === 'video') return videoInsertChain; if (table === 'exercise') return { ...exerciseUpdateChain, ...exerciseSelectChain }; return {}; }), _storageFrom: storageFrom, _videoInsertChain: videoInsertChain };
}

describe('ATH-246 — Upload Exercise Videos to Supabase Storage', () => {
  describe('AC1: Video file exists in Supabase Storage bucket', () => {
    it('should call storage.upload with the correct bucket name', async () => {
      const supabase = buildMockSupabase();
      const file = Buffer.from('fake-video-data');
      await uploadExerciseVideo(supabase as any, file, 'crunches.mp4', 'video/mp4', 10485760);
      expect(supabase.storage.from).toHaveBeenCalledWith(BUCKET_NAME);
      expect(supabase._storageFrom.upload).toHaveBeenCalledWith(expect.stringContaining('crunches.mp4'), file, expect.objectContaining({ contentType: 'video/mp4' }));
    });
    it('should insert a video record into the video table after upload', async () => {
      const supabase = buildMockSupabase();
      const result = await uploadExerciseVideo(supabase as any, Buffer.from('fake'), 'crunches.mp4', 'video/mp4', 10485760);
      expect(supabase.from).toHaveBeenCalledWith('video');
      expect(result.video_id).toBe(MOCK_VIDEO_ID);
    });
    it('should throw if the storage upload fails', async () => {
      const supabase = buildMockSupabase({ uploadError: { message: 'Bucket not found' } });
      await expect(uploadExerciseVideo(supabase as any, Buffer.from('fake'), 'crunches.mp4', 'video/mp4', 10485760)).rejects.toThrow('Storage upload failed: Bucket not found');
    });
  });

  describe('AC2: Video file accessible via public URL', () => {
    it('should return a valid https public URL after upload', async () => {
      const supabase = buildMockSupabase();
      const result = await uploadExerciseVideo(supabase as any, Buffer.from('fake'), 'crunches.mp4', 'video/mp4', 10485760);
      expect(result.publicUrl).toMatch(/^https:\/\//);
      expect(result.publicUrl).toContain('exercise-videos');
    });
    it('getVideoPublicUrl should return a URL containing the object key', () => {
      const supabase = buildMockSupabase();
      const url = getVideoPublicUrl(supabase as any, MOCK_OBJECT_KEY);
      expect(url).toBe(MOCK_PUBLIC_URL);
      expect(url).toContain(MOCK_OBJECT_KEY);
    });
    it('should throw if public URL cannot be retrieved after upload', async () => {
      const supabase = buildMockSupabase({ publicUrl: null });
      await expect(uploadExerciseVideo(supabase as any, Buffer.from('fake'), 'crunches.mp4', 'video/mp4', 10485760)).rejects.toThrow('Could not retrieve public URL after upload.');
    });
  });

  describe('AC3: Exercise record includes a valid video_id field', () => {
    it('should update the exercise table with the video_id', async () => {
      const supabase = buildMockSupabase();
      await linkVideoToExercise(supabase as any, MOCK_EXERCISE_ID, MOCK_VIDEO_ID);
      expect(supabase.from).toHaveBeenCalledWith('exercise');
    });
    it('should throw if linking video to exercise fails', async () => {
      const supabase = buildMockSupabase({ dbUpdateError: { message: 'FK violation' } });
      await expect(linkVideoToExercise(supabase as any, MOCK_EXERCISE_ID, MOCK_VIDEO_ID)).rejects.toThrow('Failed to link video to exercise: FK violation');
    });
    it('full upload-and-link flow should produce a non-null video_id', async () => {
      const supabase = buildMockSupabase();
      const { video_id } = await uploadExerciseVideo(supabase as any, Buffer.from('fake'), 'crunches.mp4', 'video/mp4', 10485760);
      await linkVideoToExercise(supabase as any, MOCK_EXERCISE_ID, video_id);
      expect(video_id).toBe(MOCK_VIDEO_ID);
    });
  });

  describe('AC4: Stored URL correctly points to the uploaded video', () => {
    it('public URL should contain the bucket name and object key', () => {
      const supabase = buildMockSupabase();
      const url = getVideoPublicUrl(supabase as any, MOCK_OBJECT_KEY);
      expect(url).toContain(BUCKET_NAME);
      expect(url).toContain(MOCK_OBJECT_KEY);
    });
    it('public URL from upload should match Supabase storage URL format', async () => {
      const supabase = buildMockSupabase();
      const result = await uploadExerciseVideo(supabase as any, Buffer.from('fake'), 'crunches.mp4', 'video/mp4', 10485760);
      expect(result.publicUrl).toMatch(/https:\/\/.+\.supabase\.co\/storage\/v1\/object\/public\/exercise-videos\/.+/);
    });
  });

  describe('AC5: Video URL retrieved when querying the exercise', () => {
    it('getExerciseWithVideoUrl should return the exercise record', async () => {
      const supabase = buildMockSupabase();
      const { exercise } = await getExerciseWithVideoUrl(supabase as any, MOCK_EXERCISE_ID);
      expect(exercise.exercise_id).toBe(MOCK_EXERCISE_ID);
      expect(exercise.title).toBe('pelvic tilt');
    });
    it('getExerciseWithVideoUrl should return a valid videoUrl', async () => {
      const supabase = buildMockSupabase();
      const { videoUrl } = await getExerciseWithVideoUrl(supabase as any, MOCK_EXERCISE_ID);
      expect(videoUrl).toMatch(/^https:\/\//);
      expect(videoUrl).toContain(MOCK_OBJECT_KEY);
    });
    it('should return null videoUrl if exercise has no linked video', async () => {
      const supabase = buildMockSupabase({ exerciseData: { exercise_id: MOCK_EXERCISE_ID, title: 'pelvic tilt', video_id: null, video: null } });
      const { videoUrl } = await getExerciseWithVideoUrl(supabase as any, MOCK_EXERCISE_ID);
      expect(videoUrl).toBeNull();
    });
    it('should throw if the exercise query fails', async () => {
      const supabase = buildMockSupabase({ dbSelectError: { message: 'Row not found' } });
      await expect(getExerciseWithVideoUrl(supabase as any, MOCK_EXERCISE_ID)).rejects.toThrow('Failed to fetch exercise: Row not found');
    });
  });
});
