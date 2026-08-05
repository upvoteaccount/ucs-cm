import { Button, Link } from "@/app/components/ui";

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "var(--bg-page)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
      }}
    >
      <div style={{ width: "100%", maxWidth: "600px" }}>
        <section aria-labelledby="not-found-heading">
          <div
            style={{
              backgroundColor: "var(--bg-surface)",
              padding: "var(--space-8)",
              borderRadius: "var(--radius-lg)",
              border: "1px solid var(--border-default)",
              boxShadow: "var(--shadow-subtle)",
              textAlign: "center",
            }}
          >
            <span
              style={{
                display: "block",
                fontSize: "var(--font-size-3xl)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--text-muted)",
                marginBottom: "var(--space-1)",
              }}
            >
              404
            </span>
            <h1
              id="not-found-heading"
              style={{
                fontSize: "var(--font-size-2xl)",
                fontWeight: "var(--font-weight-bold)",
                color: "var(--text-primary)",
                marginBottom: "var(--space-2)",
              }}
            >
              Page not found
            </h1>
            <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "var(--space-6)" }}>
              The requested page address does not exist or has been moved.
            </p>

            <Link href="/">
              <Button type="button" variant="primary">
                Return home
              </Button>
            </Link>
          </div>
        </section>
      </div>
    </div>
  );
}
