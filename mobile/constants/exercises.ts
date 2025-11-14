import { Exercise } from "../types/exercise";

const placeholderThumbnail: null = null;

export const EXERCISES: Exercise[] = [
  {
    id: "1",
    title: "Exercise Title",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed euismod, justo vel tincidunt facilisis, metus erat facilisis leo, in ullamcorper sapien magna at massa. Donec convallis, nibh vel varius sagittis, ante sapien varius tellus, vitae scelerisque purus lacus sed est.",
    thumbnail: placeholderThumbnail,
    tags: ["Leakage", "Session 2"],
    // Mock signed URL; real backend will replace this
    videoSignedUrl: "https://example.com/video1-signed-url.mp4",
    // Far future so it is treated as valid, not expired
    expiresAt: "2099-01-01T00:00:00Z",
  },
  {
    id: "2",
    title: "Exercise Title",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Integer non ligula non elit laoreet auctor.",
    thumbnail: placeholderThumbnail,
    tags: ["Leakage", "Session 2"],
    videoSignedUrl: "https://example.com/video2-signed-url.mp4",
  },
  {
    id: "3",
    title: "Exercise Title",
    description:
      "Lorem ipsum dolor sit amet, consectetur adipiscing elit. Duis at lorem sit amet est pharetra tincidunt.",
    thumbnail: placeholderThumbnail,
    tags: ["Leakage", "Session 2"],
    videoSignedUrl: "https://example.com/video3-signed-url.mp4",
  },
];
