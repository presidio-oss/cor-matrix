import type { BuildConfig } from "bun";
import dts from "bun-plugin-dts";

const defaultBuildConfig: BuildConfig = {
  entrypoints: ["./src/index.ts"],
  outdir: "./dist",
  target: "node",
  root: "./src",

  external: [],
  minify: false,
  sourcemap: "inline",
};

await Promise.all([
  Bun.build({
    ...defaultBuildConfig,
    plugins: [dts()],
    format: "esm",
    naming: "[dir]/[name].js",
  }),
  Bun.build({
    ...defaultBuildConfig,
    format: "cjs",
    naming: "[dir]/[name].cjs",
  }),
  Bun.build({
    entrypoints: ["./src/cli.ts"],
    outdir: "./dist",
    target: "node",
    root: "./src",
    packages: "bundle",
    external: [],
    format: "esm",
    naming: "[dir]/cli/[name].js",
  }),
]);
