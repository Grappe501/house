const fs = require("fs");
const path = require("path");
const AdmZip = require("adm-zip");
const { globSync } = require("glob");

function main() {
  const repoRoot = process.argv.includes("--repo-root")
    ? process.argv[process.argv.indexOf("--repo-root") + 1]
    : process.cwd();

  const outZip = process.argv.includes("--out")
    ? process.argv[process.argv.indexOf("--out") + 1]
    : path.join(repoRoot, "build", "governance_bundle.zip");

  const includeGlobs = [
    "GOVERNANCE.md",
    "GOVERNANCE_VERSION.md",
    "CONTRIBUTING.md",
    "README.md",
    "docs/**/*.md",
    "plans/**/*.md",
    "prompts/**/*.md",
    "tests/**/*.md",
    "scripts/assemble.js",
    "scripts/build.js",
    "scripts/plan_guard.js",
    "scripts/policy_guard.js",
    "scripts/generate_manifest.js",
    "scripts/governance_snapshot.js",
    "scripts/governance_bundle.js",
    ".github/CODEOWNERS",
    "package.json"
  ];

  const zip = new AdmZip();
  const added = new Set();

  for (const g of includeGlobs) {
    const matches = globSync(g, { cwd: repoRoot, nodir: true, dot: true });
    for (const m of matches) {
      const abs = path.join(repoRoot, m);
      const rel = m.replaceAll("\\", "/");
      if (added.has(rel)) continue;
      zip.addFile(rel, fs.readFileSync(abs));
      added.add(rel);
    }
  }

  fs.mkdirSync(path.dirname(outZip), { recursive: true });
  zip.writeZip(outZip);
  process.stdout.write(`Wrote build/${path.basename(outZip)} (${added.size} files)\n`);
}

main();
