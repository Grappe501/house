const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const { globSync } = require("glob");

function sha256File(p) {
  const buf = fs.readFileSync(p);
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function rel(root, p) {
  return path.relative(root, p).replaceAll("\\", "/");
}

function main() {
  const repoRoot = process.argv.includes("--repo-root")
    ? process.argv[process.argv.indexOf("--repo-root") + 1]
    : process.cwd();

  const outPath = process.argv.includes("--out")
    ? process.argv[process.argv.indexOf("--out") + 1]
    : path.join(repoRoot, "build", "governance_snapshot.json");

  const authorityGlobs = [
    "GOVERNANCE.md",
    "GOVERNANCE_VERSION.md",
    "CONTRIBUTING.md",
    "docs/**/*.md",
    "plans/**/*.md",
    "prompts/**/*.md",
    "tests/**/*.md",
    "scripts/*.js",
    ".github/CODEOWNERS",
    ".github/workflows/*.yml",
    "package.json"
  ];

  const files = [];
  for (const g of authorityGlobs) {
    const matches = globSync(g, { cwd: repoRoot, nodir: true, dot: true });
    for (const m of matches) files.push(path.join(repoRoot, m));
  }

  // De-dupe + stable order
  const uniq = Array.from(new Set(files.map(p => path.resolve(p)))).sort();

  const items = uniq.map(p => ({
    path: rel(repoRoot, p),
    sha256: sha256File(p),
    bytes: fs.statSync(p).size
  }));

  const snapshot = {
    schema_version: "gov_snapshot_v1",
    created_at_utc: new Date().toISOString(),
    file_count: items.length,
    files: items
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(snapshot, null, 2) + "\n");
  process.stdout.write(`Wrote ${rel(repoRoot, outPath)} (${items.length} files)\n`);
}

main();
