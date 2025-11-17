import { supabaseServer } from './supabaseServer';

type ObjLike = Record<string, any> | null | undefined;

function resolveBucketPath(obj: ObjLike) {
  if (!obj) return null;

  const bucket =
    obj.bucket ??
    obj.storage_bucket ??
    null;

  const path =
    obj.path ??
    obj.object_path ??
    obj.object_key ??     // <- video.object_key
    obj.video_path ??     // <- view.exercise_with_video
    null;

  if (!bucket || !path) return null;
  return { bucket, path };
}

export async function createSignedUrl(obj: ObjLike, expiresInSeconds = 3600) {
  const resolved = resolveBucketPath(obj);
  if (!resolved) return null;

  const { data, error } = await supabaseServer
    .storage
    .from(resolved.bucket)
    .createSignedUrl(resolved.path, expiresInSeconds);

  if (error) {
    console.error('createSignedUrl error:', error);
    return null;
  }
  return data?.signedUrl ?? null;
}