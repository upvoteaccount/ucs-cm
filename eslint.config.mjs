import nextLint from "eslint-config-next";
import importPlugin from "eslint-plugin-import";

const eslintConfig = [
  ...nextLint,
  {
    plugins: {
      import: importPlugin,
    },
    rules: {
      "import/no-restricted-paths": [
        "error",
        {
          zones: [
            // Prevent UI/App layer from importing internal domain module files directly (except module index.ts)
            {
              target: "./src/app",
              from: "./src/modules",
              except: ["./*/index.ts", "./**/*.interface.ts", "./auth/index.ts", "./audit/index.ts"],
              message: "Direct internal module file import into App UI layer prohibited; access modules strictly via their public entry point (index.ts) or interface.",
            },
            // Prevent Domain Modules from importing App UI code
            {
              target: "./src/modules",
              from: "./src/app",
              message: "Domain modules cannot depend on App UI layer code.",
            },
            // Prevent Shared Utilities from importing Domain Module internals directly (except module index.ts)
            {
              target: "./src/shared",
              from: "./src/modules",
              except: ["./*/index.ts", "./**/*.interface.ts", "./auth/index.ts", "./audit/index.ts"],
              message: "Shared code cannot depend on internal business domain module implementations.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
