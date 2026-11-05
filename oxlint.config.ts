import { defineConfig } from "oxlint";
import antiSlop from "ultracite/oxlint/anti-slop";
import core from "ultracite/oxlint/core";
import next from "ultracite/oxlint/next";
import react from "ultracite/oxlint/react";

export default defineConfig({
  extends: [core, react, next, antiSlop],
  ignorePatterns: [...(core.ignorePatterns ?? []), "next-env.d.ts"],
  jsPlugins: [{ name: "no-comments", specifier: "./tools/oxlint/no-comments.ts" }],
  options: { reportUnusedDisableDirectives: "error", typeAware: true },
  rules: {
    "eslint/no-await-in-loop": "off",
    "eslint/sort-keys": "off",
    "import/no-cycle": "error",
    "no-comments/no-comments": "error",
    "no-restricted-imports": [
      "error",
      {
        paths: [
          {
            importNames: ["useEffect", "useLayoutEffect", "useInsertionEffect"],
            message:
              "Derive in render, act in the event handler, or subscribe with useSyncExternalStore.",
            name: "react",
          },
        ],
      },
    ],
    "oxc/no-accumulating-spread": "error",
  },
});
