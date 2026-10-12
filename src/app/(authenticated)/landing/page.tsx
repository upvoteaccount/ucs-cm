import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import Link from "next/link";
import { authService } from "@/modules/auth";

export function LandingPageContent({ roles = [] }: { roles?: string[] }) {
  const canAccessStudio = roles.includes("PLATFORM_ADMIN") || roles.includes("SOLUTION_DESIGNER");
  const canAccessRuntime = roles.includes("RUNTIME_USER") || roles.includes("PLATFORM_ADMIN");

  const visibleCardsCount = (canAccessStudio ? 1 : 0) + (canAccessRuntime ? 1 : 0);

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
          maxWidth: "1200px",
          margin: "0 auto",
          width: "100%",
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
            Your case management workspace. Select an available product area below to proceed.
          </p>
        </div>

        <div style={{ marginTop: "var(--space-6)", paddingTop: "var(--space-6)", borderTop: "1px solid var(--border-default)" }}>
          <h2 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-semibold)", marginBottom: "var(--space-4)" }}>
            Available Workspaces
          </h2>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: visibleCardsCount === 1
                ? "minmax(300px, 420px)"
                : "repeat(auto-fit, minmax(320px, 480px))",
              gap: "var(--space-6)",
            }}
          >
            {/* Design Studio Entry Card */}
            {canAccessStudio && (
              <div
                style={{
                  backgroundColor: "var(--bg-page)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-default)",
                  padding: "var(--space-6)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "var(--space-4)",
                  minHeight: "220px",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", margin: "0 0 var(--space-2) 0", color: "var(--text-primary)" }}>
                    Design Studio
                  </h3>
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                    Configure Solution metadata, properties, choice lists, and form layout aggregates.
                  </p>
                </div>
                <Link
                  href="/studio/solutions"
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: "var(--space-2)",
                    height: "var(--control-height-md)",
                    padding: "0 var(--space-4)",
                    fontSize: "var(--font-size-sm)",
                    fontWeight: "var(--font-weight-medium)",
                    borderRadius: "var(--radius-md)",
                    backgroundColor: "var(--action-primary)",
                    color: "var(--action-primary-text)",
                    textDecoration: "none",
                    width: "fit-content",
                  }}
                >
                  Open Design Studio
                </Link>
              </div>
            )}

            {/* Runtime Portal Entry Card */}
            {canAccessRuntime && (
              <div
                style={{
                  backgroundColor: "var(--bg-page)",
                  borderRadius: "var(--radius-lg)",
                  border: "1px solid var(--border-default)",
                  padding: "var(--space-6)",
                  display: "flex",
                  flexDirection: "column",
                  justifyContent: "space-between",
                  gap: "var(--space-4)",
                  minHeight: "220px",
                }}
              >
                <div>
                  <h3 style={{ fontSize: "var(--font-size-lg)", fontWeight: "var(--font-weight-bold)", margin: "0 0 var(--space-2) 0", color: "var(--text-primary)" }}>
                    Runtime Portal
                  </h3>
                  <p style={{ fontSize: "var(--font-size-sm)", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                    Access case management runtime forms and operations.
                  </p>
                </div>
                <div style={{ display: "flex", gap: "var(--space-3)", flexWrap: "wrap", alignItems: "center" }}>
                  <Link
                    href="/solutions"
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: "var(--space-2)",
                      height: "var(--control-height-md)",
                      padding: "0 var(--space-4)",
                      fontSize: "var(--font-size-sm)",
                      fontWeight: "var(--font-weight-medium)",
                      borderRadius: "var(--radius-md)",
                      backgroundColor: "var(--action-primary)",
                      color: "var(--action-primary-text)",
                      textDecoration: "none",
                      width: "fit-content",
                    }}
                  >
                    Open My Solutions
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}

export default async function LandingPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get("ucs_session_token")?.value;

  if (!token) {
    redirect("/");
  }

  try {
    await authService.validateSession(token);
  } catch {
    redirect("/");
  }

  // Runtime user flow: Login -> My Solutions
  redirect("/solutions");
}
