import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Module Boundaries Architecture Rules", () => {
  const modulesDir = path.resolve("./src/modules");
  const sharedDir = path.resolve("./src/shared");
  const appDir = path.resolve("./src/app");
  const approvedModules = [
    "auth",
    "organisation",
    "solution",
    "schema",
    "publishing",
    "workflow",
    "case",
    "task",
    "document",
    "comment",
    "audit",
    "dashboard",
  ];

  it("should contain exactly all approved 12 modular monolith directories", () => {
    const existingDirs = fs.readdirSync(modulesDir).filter((name) => {
      return fs.statSync(path.join(modulesDir, name)).isDirectory();
    });

    expect(existingDirs.sort()).toEqual(approvedModules.sort());
  });

  it("every module must export an index.ts file establishing its public boundary", () => {
    for (const mod of approvedModules) {
      const indexPath = path.join(modulesDir, mod, "index.ts");
      expect(fs.existsSync(indexPath)).toBe(true);
    }
  });

  it("workflow module must export IWorkflowService interface boundary", () => {
    const workflowInterfacePath = path.join(modulesDir, "workflow", "workflow.interface.ts");
    expect(fs.existsSync(workflowInterfacePath)).toBe(true);
  });

  it("Rule 1 & 3: Client / UI App code cannot import module internals directly without index.ts or interface", () => {
    const appFiles = fs.readdirSync(appDir, { recursive: true }) as string[];
    for (const file of appFiles) {
      if (file.endsWith(".ts") || file.endsWith(".tsx")) {
        const content = fs.readFileSync(path.join(appDir, file), "utf-8");
        const directInternalImport = /from\s+["'](@\/modules\/[^"']+\/[^"']+|(?:\.\.\/)+modules\/[^"']+\/[^"']+)["']/;
        const match = content.match(directInternalImport);
        if (match) {
          const importPath = match[1];
          const isAllowedPublicEndpoint = importPath.endsWith("/index") || importPath.endsWith(".interface");
          expect(isAllowedPublicEndpoint).toBe(true);
        }
      }
    }
  });

  it("Rule 4: Domain modules cannot import App UI code", () => {
    const moduleFiles = fs.readdirSync(modulesDir, { recursive: true }) as string[];
    for (const file of moduleFiles) {
      if (file.endsWith(".ts")) {
        const content = fs.readFileSync(path.join(modulesDir, file), "utf-8");
        expect(content).not.toMatch(/from\s+["']@\/app/);
        expect(content).not.toMatch(/from\s+["']\.\.\/\.\.\/app/);
      }
    }
  });

  it("Rule 5: Shared code cannot import business modules", () => {
    const sharedFiles = fs.readdirSync(sharedDir, { recursive: true }) as string[];
    for (const file of sharedFiles) {
      if (file.endsWith(".ts") && !file.endsWith("architecture.test.ts")) {
        const content = fs.readFileSync(path.join(sharedDir, file), "utf-8");
        expect(content).not.toMatch(/from\s+["']@\/modules/);
        expect(content).not.toMatch(/from\s+["']\.\.\/\.\.\/modules/);
      }
    }
  });

  it("Rule 6 (Negative Fixture): A deliberately invalid import is rejected by architectural rules", () => {
    const forbiddenSharedContent = `import { CASE_MODULE } from "@/modules/case";`;
    const forbiddenAppContent = `import { internalMethod } from "@/modules/auth/internal-file";`;

    const hasSharedViolation = /from\s+["']@\/modules/.test(forbiddenSharedContent);
    const hasAppViolation = /@\/modules\/[^"']+\/[^"']+/.test(forbiddenAppContent);

    expect(hasSharedViolation).toBe(true);
    expect(hasAppViolation).toBe(true);
  });
});
