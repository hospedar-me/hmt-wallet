import { build } from "esbuild";
import { execFileSync } from "node:child_process";
import fs from "node:fs/promises";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";
const css = await postcss([tailwindcss()]).process(
  await fs.readFile("src/wallet.css", "utf8"),
  { from: "src/wallet.css" },
);
await fs.writeFile(
  "src/styles.generated.ts",
  "export const walletStyles=" + JSON.stringify(css.css) + ";\n",
);
await fs.rm("dist", { recursive: true, force: true });
execFileSync("node", ["node_modules/typescript/bin/tsc"], { stdio: "inherit" });
for (const entry of ["react", "server", "types"])
  await build({
    entryPoints: ["src/" + entry + (entry === "react" ? ".tsx" : ".ts")],
    outfile: "dist/" + entry + ".js",
    bundle: true,
    format: "esm",
    platform: entry === "server" ? "node" : "browser",
    packages: "external",
    target: "es2022",
    banner: entry === "react" ? { js: '"use client";' } : undefined,
  });
