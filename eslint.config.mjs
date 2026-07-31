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
            // Prevent UI/App layer from importing internal domain module files directly
            {
              target: "./src/app",
              from: "./src/modules",
              except: ["./*/index.ts", "./**/*.interface.ts"],
              message: "Direct internal module file import into App UI layer prohibited; access modules strictly via their public entry point (index.ts) or interface.",
            },
            // Prevent Domain Modules from importing App UI code
            {
              target: "./src/modules",
              from: "./src/app",
              message: "Domain modules cannot depend on App UI layer code.",
            },
            // Prevent Shared Utilities from importing Domain Modules
            {
              target: "./src/shared",
              from: "./src/modules",
              message: "Shared code cannot depend on business domain modules.",
            },
          ],
        },
      ],
    },
  },
];

export default eslintConfig;
