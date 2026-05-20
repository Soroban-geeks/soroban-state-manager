import { defineConfig } from "tsup";

export default defineConfig([
  {
    entry: { index: "src/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    clean: true,
    external: ["react", "react-dom"],
    splitting: false,
    treeshake: true,
    minify: false,
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".esm.js" : ".js",
      };
    },
    outDir: "dist",
  },
  {
    entry: { react: "src/hooks/index.ts" },
    format: ["cjs", "esm"],
    dts: true,
    sourcemap: true,
    external: ["react", "react-dom", "@stellar/stellar-sdk"],
    splitting: false,
    treeshake: true,
    outExtension({ format }) {
      return {
        js: format === "esm" ? ".esm.js" : ".js",
      };
    },
    outDir: "dist",
  },
]);
