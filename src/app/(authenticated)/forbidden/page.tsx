import { Button } from "@/app/components/ui/Button";
import { Link } from "@/app/components/ui/Link";

export default function ForbiddenPage() {
  return (
    <div style={{ maxWidth: "600px", margin: "var(--space-8) auto", width: "100%" }}>
      <section aria-labelledby="forbidden-heading">
        <div
          style={{
            backgroundColor: "var(--bg-surface)",
            padding: "var(--space-8)",
            borderRadius: "var(--radius-lg)",
            border: "1px solid var(--border-default)",
            boxShadow: "var(--shadow-subtle)",
          }}
        >
          <h1
            id="forbidden-heading"
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--text-primary)",
              marginBottom: "var(--space-3)",
            }}
          >
            Access forbidden
          </h1>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", lineHeight: "1.6", marginBottom: "var(--space-6)" }}>
            Your account is authenticated, but your assigned platform roles do not permit access to the requested page. Contact your platform administrator if you require access.
          </p>

          <Link href="/landing">
            <Button type="button" variant="primary">
              Return to landing
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
}
