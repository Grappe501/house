const { spawnSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { stdio: "inherit", ...opts });
  if (r.status !== 0) process.exit(r.status || 1);
}

function main() {
  const repoRoot = process.cwd();
  fs.mkdirSync(path.join(repoRoot, "build"), { recursive: true });

  // 1) Assemble (idempotent)
  run("npm", ["run", "assemble"]);

  // 2) Guards
  run("npm", ["run", "guard"]);

  // 3) Dry build (ensures scripts still consistent)
  run("npm", ["run", "build:dry"]);

  // 4) Snapshot + bundle
  run("npm", ["run", "snapshot:gov"]);
  run("npm", ["run", "bundle:gov"]);

  // 5) Print tagging instructions (we do not tag automatically)
  const hint = `
Governance release artifacts generated:
- build/governance_snapshot.json
- build/governance_bundle.zip

Next (manual):
1) Decide version tag: gov-vX.Y.Z
2) git tag gov-vX.Y.Z
3) git push origin gov-vX.Y.Z

Then downstream repos can pin to that tag/SHA and optionally vendor governance_bundle.zip.
`.trim() + "\n";
  fs.writeFileSync(path.join(repoRoot, "build", "RELEASE_HINT.txt"), hint);
  process.stdout.write(hint);
}

main();
