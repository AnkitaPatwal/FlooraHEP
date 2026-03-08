import { SupabaseClient } from '@supabase/supabase-js';

export const BUCKET_NAME = 'exercise-videos';

interface VideoRow {
  bucket: string;
  object_key: string;
  original_filename?: string;
  mime_type?: string;
}


interface ExerciseRow {
  exercise_id: number;
  title: string;
  description?: string;
  video_id: number | null;
  video: VideoRow[] | null;
}

export interface ExerciseWithVideo {
  exercise_id: number;
  title: string;
  description?: string;
  video_id: number | null;
  video: VideoRow | null;
}

export interface UploadVideoResult {
  video_id: number;
  publicUrl: string;
}


export async function uploadExerciseVideo(
  supabase: SupabaseClient,
  fileData: Buffer | File,
  fileName: string,
  mimeType: string,
  byteSize: number,

  uploaderUserId: number,              
  width = 640,                          // defaults satisfy CHECK (>0)
  height = 360,
  durationSeconds = 1                   // satisfies CHECK (>=0)

  uploaderUserId?: string | null   // new optional param — won't break existing callers

): Promise<UploadVideoResult> {
  const objectKey = `${Date.now()}_${fileName}`;

  const { error: uploadError } = await supabase.storage
    .from(BUCKET_NAME)
    .upload(objectKey, fileData, { contentType: mimeType, upsert: false });

  if (uploadError) throw new Error(`Storage upload failed: ${uploadError.message}`);


  const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(objectKey);
  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) throw new Error('Could not retrieve public URL after upload.');

  const { data: videoRecord, error: dbError } = await supabase
    .from('video')

  const { data: urlData } = supabase.storage
    .from(BUCKET_NAME)
    .getPublicUrl(objectKey);

  const publicUrl = urlData?.publicUrl;
  if (!publicUrl) throw new Error("Could not retrieve public URL after upload.");

  const { data: videoRecord, error: dbError } = await supabase
    .from("video")

    .insert({
      bucket: BUCKET_NAME,
      object_key: objectKey,
      original_filename: fileName,
      mime_type: mimeType,
      byte_size: byteSize,

      duration_seconds: durationSeconds,
      width,
      height,
      uploader_user_id: uploaderUserId, // MUST EXIST (FK)
    })
    .select('video_id')
    .single();

  if (dbError || !videoRecord) {
    throw new Error(`Video DB insert failed: ${dbError?.message}`);
  }

      uploader_user_id: uploaderUserId ?? null,
      duration_seconds: null,
      width: null,
      height: null,
    })
    .select("video_id")
    .single();

  if (dbError || !videoRecord)
    throw new Error(`Video DB insert failed: ${dbError?.message}`);


  return { video_id: videoRecord.video_id, publicUrl };
}

export async function linkVideoToExercise(
  supabase: SupabaseClient,
  exerciseId: number,

  videoId: number
): Promise<void> {
  const { error } = await supabase
    .from('exercise')
    .update({ video_id: videoId })

  videoId: number,
  videoUrl?: string | null
): Promise<void> {
  // Fetch existing video_id so we can log the old one being replaced
  const { data: existing } = await supabase
    .from('exercise')
    .select('video_id, video_url')
    .eq('exercise_id', exerciseId)
    .single();

  if (existing?.video_id && existing.video_id !== videoId) {
    // Old video is being replaced — log it for cleanup
    console.log(
      `[ATH-410] Replacing video on exercise ${exerciseId}: ` +
      `old video_id=${existing.video_id}, new video_id=${videoId}`
    );
  }

  const updatePayload: Record<string, any> = { video_id: videoId };
  if (videoUrl !== undefined) {
    updatePayload.video_url = videoUrl;
  }

  const { error } = await supabase
    .from('exercise')
    .update(updatePayload)

    .eq('exercise_id', exerciseId);

  if (error) throw new Error(`Failed to link video to exercise: ${error.message}`);
}

export function getVideoPublicUrl(supabase: SupabaseClient, objectKey: string): string | null {
  const { data } = supabase.storage.from(BUCKET_NAME).getPublicUrl(objectKey);
  return data?.publicUrl ?? null;
}

export async function getExerciseWithVideoUrl(
  supabase: SupabaseClient,
  exerciseId: number
): Promise<{ exercise: ExerciseWithVideo; videoUrl: string | null }> {
  const { data, error } = await supabase
    .from('exercise')
    .select(
      'exercise_id, title, description, video_id, video:video_id (bucket, object_key, original_filename, mime_type)'
    )
    .eq('exercise_id', exerciseId)
    .single();

  if (error || !data) throw new Error(`Failed to fetch exercise: ${error?.message}`);

  const row = data as unknown as ExerciseRow;
  const videoObj = Array.isArray(row.video) ? (row.video[0] ?? null) : row.video;

  const exercise: ExerciseWithVideo = {
    exercise_id: row.exercise_id,
    title: row.title,
    description: row.description,
    video_id: row.video_id,
    video: videoObj,
  };

  const videoUrl = videoObj?.object_key ? getVideoPublicUrl(supabase, videoObj.object_key) : null;
  return { exercise, videoUrl };
}