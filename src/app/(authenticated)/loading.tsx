import { Spinner } from "@/app/components/ui";

export default function Loading() {
  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        minHeight: "300px",
        gap: "var(--space-4)",
      }}
    >
      <Spinner size="lg" />
      <span style={{ fontSize: "var(--font-size-base)", color: "var(--text-secondary)", fontWeight: "var(--font-weight-medium)" }}>
        Loading session context...
      </span>
    </div>
  );
}
