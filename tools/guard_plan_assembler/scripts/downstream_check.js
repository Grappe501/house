const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function exists(p) {
  try { fs.accessSync(p, fs.constants.F_OK); return true; } catch { return false; }
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function sha256File(p) {
  return sha256(fs.readFileSync(p));
}

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) out[key] = true;
      else { out[key] = next; i++; }
    }
  }
  return out;
}

function main() {
  const args = parseArgs(process.argv);

  const repoRoot = args["repo-root"] ? path.resolve(args["repo-root"]) : process.cwd();
  const downstreamRoot = args["downstream-root"] ? path.resolve(args["downstream-root"]) : null;

  if (!downstreamRoot) {
    console.error("downstream_check: --downstream-root is required");
    process.exit(2);
  }

  const lockPath = path.join(downstreamRoot, "governance.lock.json");
  let lock = null;
  if (exists(lockPath)) {
    try { lock = readJSON(lockPath); } catch {}
  }

  const profile = args["profile"] || (lock && lock.profile) || "hybrid-app";
  const governanceRef = args["governance-ref"] || (lock && lock.governance_ref) || null;

  // Load required paths by profile
  const requiredSpecPath = path.join(repoRoot, "contracts", "downstream_required_paths.json");
  if (!exists(requiredSpecPath)) {
    console.error("downstream_check: missing contracts/downstream_required_paths.json");
    process.exit(2);
  }
  const spec = readJSON(requiredSpecPath);
  const profileSpec = spec.profiles[profile];
  if (!profileSpec) {
    console.error(`downstream_check: unknown profile '${profile}'. Known: ${Object.keys(spec.profiles).join(", ")}`);
    process.exit(2);
  }

  const requiredPaths = profileSpec.required_paths || [];
  const missing = [];
  const present = [];

  for (const rel of requiredPaths) {
    const abs = path.join(downstreamRoot, rel);
    if (exists(abs)) present.push(rel);
    else missing.push(rel);
  }

  const errors = [];
  const soft = [];

  // Soft expectations: governance pin file exists
  if (!exists(lockPath)) soft.push("missing governance.lock.json (recommended)");

  // Stronger enforcement (optional):
  // 1) governance snapshot pin comparison
  const snapshotPin = lock && lock.governance_snapshot_sha256 ? String(lock.governance_snapshot_sha256) : null;
  const snapshotPath = path.join(repoRoot, "build", "governance_snapshot.json");
  if (snapshotPin) {
    if (!exists(snapshotPath)) {
      // If snapshot isn't present, instruct caller to run npm run snapshot:gov in governance repo prior to check.
      errors.push("governance_snapshot_sha256 pinned but build/governance_snapshot.json is missing in governance repo (run npm run snapshot:gov)");
    } else {
      const actual = sha256File(snapshotPath);
      if (actual !== snapshotPin) {
        errors.push(`governance snapshot hash mismatch: expected ${snapshotPin} got ${actual}`);
      }
    }
  } else {
    soft.push("no governance_snapshot_sha256 pinned (recommended for immutable downstream pinning)");
  }

  // 2) Request schema parity (only if downstream has contracts path)
  // Compare governance packages/contracts/request_schema.v1.json to downstream's.
  const govReqSchema = path.join(repoRoot, "packages", "contracts", "request_schema.v1.json");
  const downReqSchema = path.join(downstreamRoot, "packages", "contracts", "request_schema.v1.json");
  if (exists(govReqSchema) && exists(downReqSchema)) {
    const govHash = sha256File(govReqSchema);
    const downHash = sha256File(downReqSchema);
    if (govHash !== downHash) {
      errors.push(`request_schema.v1.json mismatch: governance=${govHash} downstream=${downHash}`);
    }
  } else {
    if (!exists(downReqSchema) && profile === "hybrid-app") {
      // it is also a required path, but this gives a better error message
      errors.push("downstream missing packages/contracts/request_schema.v1.json (required for hybrid-app)");
    }
  }

  const report = {
    schema_version: "downstream_check_report_v2",
    created_at_utc: new Date().toISOString(),
    governance_ref: governanceRef,
    profile,
    downstream_root: downstreamRoot,
    required_count: requiredPaths.length,
    present_count: present.length,
    missing_count: missing.length,
    missing_paths: missing,
    hard_errors: errors,
    soft_warnings: soft,
    pins: {
      governance_snapshot_sha256: snapshotPin || null
    }
  };

  const outDir = path.join(repoRoot, "build", "reports");
  mkdirp(outDir);
  const outPath = path.join(outDir, "downstream_check.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");

  if (missing.length > 0) {
    console.error(`downstream_check: FAIL missing ${missing.length}/${requiredPaths.length} required paths (profile=${profile})`);
    for (const m of missing.slice(0, 25)) console.error(`  - ${m}`);
    if (missing.length > 25) console.error(`  ... and ${missing.length - 25} more`);
    process.exit(1);
  }

  if (errors.length > 0) {
    console.error(`downstream_check: FAIL hard_errors=${errors.length} (profile=${profile})`);
    for (const e of errors.slice(0, 25)) console.error(`  - ${e}`);
    if (errors.length > 25) console.error(`  ... and ${errors.length - 25} more`);
    process.exit(1);
  }

  console.log(`downstream_check: PASS (profile=${profile}) required=${requiredPaths.length}`);
  if (soft.length) {
    console.log("downstream_check: warnings:");
    for (const w of soft) console.log(`  - ${w}`);
  }
}

main();
