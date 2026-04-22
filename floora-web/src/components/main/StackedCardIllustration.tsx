type StackedCardIllustrationProps = {
  variant: "session" | "plan";
  selectedCount: number;
};

export function StackedCardIllustration({
  variant,
  selectedCount,
}: StackedCardIllustrationProps) {
  const label = variant === "plan" ? "Plan Builder" : "Session Builder";
  const subLabel = selectedCount === 1 ? "1 item selected" : `${selectedCount} items selected`;

  return (
    <div
      aria-hidden
      style={{
        width: "clamp(180px, 24vw, 260px)",
        aspectRatio: "1 / 1",
        borderRadius: 18,
        border: "1px solid rgba(125, 125, 125, 0.25)",
        background:
          "linear-gradient(135deg, rgba(242, 249, 255, 0.95), rgba(232, 246, 255, 0.65) 55%, rgba(220, 239, 255, 0.45))",
        position: "relative",
        display: "grid",
        placeItems: "center",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: "14% 20%",
          borderRadius: 14,
          background: "rgba(255, 255, 255, 0.65)",
          border: "1px solid rgba(120, 120, 120, 0.2)",
          transform: "rotate(-6deg)",
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: "18% 16%",
          borderRadius: 14,
          background: "rgba(255, 255, 255, 0.8)",
          border: "1px solid rgba(120, 120, 120, 0.25)",
          transform: "rotate(5deg)",
        }}
      />
      <div
        style={{
          position: "relative",
          zIndex: 1,
          padding: "0.85rem 1rem",
          minWidth: "72%",
          textAlign: "center",
          borderRadius: 12,
          background: "rgba(255, 255, 255, 0.92)",
          border: "1px solid rgba(120, 120, 120, 0.22)",
          boxShadow: "0 10px 22px rgba(21, 67, 96, 0.08)",
        }}
      >
        <p style={{ margin: 0, fontSize: 13, fontWeight: 700, color: "#1f3847" }}>{label}</p>
        <p style={{ margin: "0.35rem 0 0", fontSize: 12, color: "#38596d" }}>{subLabel}</p>
      </div>
    </div>
  );
}
