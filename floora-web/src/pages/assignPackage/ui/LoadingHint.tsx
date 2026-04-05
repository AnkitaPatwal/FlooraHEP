type LoadingHintProps = {
  message: string;
  /** When true, shown as subtle inline refresh (list already visible) */
  inline?: boolean;
};

export function LoadingHint({ message, inline }: LoadingHintProps) {
  return (
    <p
      role="status"
      aria-live="polite"
      style={{
        fontSize: 14,
        opacity: 0.85,
        margin: inline ? "0 0 12px" : "12px 0",
      }}
    >
      {message}
    </p>
  );
}
