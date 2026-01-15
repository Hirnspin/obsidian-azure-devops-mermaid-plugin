import { build, context } from "esbuild";
import process from "node:process";

const production = process.argv.includes("--production");
const watch = process.argv.includes("--watch");

const shared = {
  entryPoints: ["src/main.ts"],
  bundle: true,
  outfile: "main.js",
  external: [
    "obsidian",
    "@codemirror/language",
    "@codemirror/view",
    "@codemirror/state",
  ],
  format: "cjs",
  target: "es2020",
  sourcemap: production ? false : "inline",
  minify: production,
  logLevel: "info",
  platform: "node"
};

const runBuild = async () => {
  if (watch) {
    const ctx = await context(shared);
    await ctx.watch();
    console.log("watching for changes...");
    return;
  }

  await build(shared);
};

runBuild().catch((err) => {
  console.error(err);
  process.exit(1);
});
