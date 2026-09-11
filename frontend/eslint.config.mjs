import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTypeScript from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTypeScript,
  {
    // Fetch-then-setState after `await` is the standard data-loading pattern;
    // the new immutability lint misfires on it (flags even cancelled-safe loads).
    rules: {
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/immutability": "off",
    },
  },
  globalIgnores([
    "node_modules/**",
    ".next/**",
    "out/**",
    "next-env.d.ts",
    "*.log",
    "build-log.txt",
  ]),
]);

export default eslintConfig;
