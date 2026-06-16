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
  ]),
  // Loyiha lint siyosati: shovqinli qoidalarni yumshatish (CI'ni bloklamasin).
  {
    rules: {
      // Matndagi apostrof/qo'shtirnoq (o'quvchi, "..."): kosmetik, o'chirilgan.
      "react/no-unescaped-entities": "off",
      // React 19 ning yangi advisory qoidalari — error emas, warning (ko'rinib tursin).
      "react-hooks/set-state-in-effect": "warn",
      "react-hooks/refs": "warn",
    },
  },
]);

export default eslintConfig;
