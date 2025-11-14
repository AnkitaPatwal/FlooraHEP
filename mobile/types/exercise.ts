import { ImageSourcePropType } from "react-native";

export type Exercise = {
  id: string;
  title: string;
  description: string;
  thumbnail?: ImageSourcePropType | null;
  tags: string[];
  videoSignedUrl: string;   // signed URL (mocked for now)
  expiresAt?: string;       // ISO timestamp; if in past => treat as expired
};
