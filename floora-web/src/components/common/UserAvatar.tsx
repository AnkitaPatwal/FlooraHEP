import { useEffect, useId, useMemo, useState } from "react";
import "./UserAvatar.css";

export type UserAvatarProps = {
  name: string;
  url?: string;
};

export default function UserAvatar({ name, url }: UserAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const innerClipId = `user-avatar-inner-${useId().replace(/[^a-zA-Z0-9_-]/g, "_")}`;
  useEffect(() => {
    setImgFailed(false);
  }, [url]);
  const initials = useMemo(
    () =>
      name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase(),
    [name]
  );
  const showImg = Boolean(url?.trim()) && !imgFailed;
  return showImg ? (
    <img
      className="user-avatar-img"
      src={url}
      alt=""
      onError={() => setImgFailed(true)}
    />
  ) : (
    <div className="user-avatar-fallback" aria-hidden title={initials}>
      <svg
        className="user-avatar-placeholder-svg"
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 64 64"
        aria-hidden
      >
        <defs>
          <clipPath id={innerClipId}>
            <circle cx="32" cy="32" r="26" />
          </clipPath>
        </defs>
        <path
          fill="#E5E7EB"
          fillRule="evenodd"
          d="M 32 0 A 32 32 0 1 1 31.99 64 A 32 32 0 1 1 32 0 Z M 32 6 A 26 26 0 1 0 31.99 58 A 26 26 0 1 0 32 6 Z"
        />
        <g clipPath={`url(#${innerClipId})`}>
          <ellipse cx="32" cy="51.5" rx="24" ry="12" fill="#E5E7EB" />
        </g>
        <circle cx="32" cy="22.5" r="11.5" fill="#E5E7EB" />
      </svg>
    </div>
  );
}
