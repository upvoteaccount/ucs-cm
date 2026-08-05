import { ShellUser, ShellOrganisation } from "@/app/components/ui";

const shellFixture = {
  user: {
    id: "fixture-user",
    displayName: "Aarav Mehta",
    email: "aarav.mehta@example.invalid",
  } as ShellUser,
  organisation: {
    id: "fixture-org",
    name: "Acme Financial Services",
  } as ShellOrganisation,
};

export default function LandingPage() {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-6)" }}>
      {/* Main Landing Welcome Container */}
      <section
        aria-labelledby="landing-heading"
        style={{
          backgroundColor: "var(--bg-surface)",
          padding: "var(--space-8)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-default)",
          boxShadow: "var(--shadow-subtle)",
        }}
      >
        <div style={{ marginBottom: "var(--space-4)" }}>
          <h1
            id="landing-heading"
            style={{
              fontSize: "var(--font-size-2xl)",
              fontWeight: "var(--font-weight-bold)",
              color: "var(--text-primary)",
              marginBottom: "var(--space-2)",
            }}
          >
            Welcome to UCS CM
          </h1>
          <p style={{ fontSize: "var(--font-size-base)", color: "var(--text-secondary)" }}>
            Your case management workspace.
          </p>
        </div>

        <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--border-default)" }}>
          <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-2)" }}>
            Current solution context
          </h2>
          <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", lineHeight: "1.6" }}>
            You are signed in as <strong>{shellFixture.user.displayName}</strong> under <strong>{shellFixture.organisation.name}</strong>. Available product areas will appear here based on your access.
          </p>
        </div>
      </section>
    </div>
  );
}
