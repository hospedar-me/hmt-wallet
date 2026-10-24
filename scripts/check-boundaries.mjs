import fs from "node:fs";
import path from "node:path";
function walk(dir) {
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .flatMap((e) =>
      e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)],
    );
}
for (const f of walk("src").filter(
  (f) => /\.tsx?$/.test(f) && !f.includes("styles.generated"),
)) {
  const text = fs.readFileSync(f, "utf8");
  if (/from ['"](?:next|@\/)|import ['"]server-only/.test(text))
    throw Error(f + ": template dependency found");
}
console.log("Wallet boundaries passed.");
