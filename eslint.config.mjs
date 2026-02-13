import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Additional ignores:
    "coverage/**",
    "sales-materials/**",
  ]),
  {
    rules: {
      // Disable overly strict rules
      "react-hooks/set-state-in-effect": "off", // Fetching data in useEffect is valid
      "react-hooks/purity": "off", // Date.now() in helpers is fine
      "react-hooks/rules-of-hooks": "error", // Keep this enabled
      "react/no-unstable-nested-components": "off", // Nested components are intentional
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_"
      }],
    },
  },
]);

export default eslintConfig;
