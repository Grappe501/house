#!/usr/bin/env node
/**
 * CONTACT-OS Assembler
 * Implements: /docs/assembler_spec.md (v1.0)
 *
 * Usage:
 *   node scripts/assemble.js --input <path-to-master-zip-or-dir> --out <output-dir> [--clean] [--strict]
 *
 * Notes:
 * - Offline, deterministic.
 * - Path traversal protected.
 * - Deterministic collision resolution:
 *    1) prefer newer zip mtime
 *    2) else lexicographically later filename
 */

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

// We use "adm-zip" for simplicity. Add it as a dependency in your repo.
// npm i -D adm-zip
let AdmZip;
try {
  AdmZip = require("adm-zip");
} catch (e) {
  console.error("ERROR: Missing dependency 'adm-zip'. Install with: npm i -D adm-zip");
  process.exit(2);
}

function parseArgs(argv) {
  const args = { input: null, out: "./contactos_repo", clean: false, strict: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--input") args.input = argv[++i];
    else if (a === "--out") args.out = argv[++i];
    else if (a === "--clean") args.clean = true;
    else if (a === "--strict") args.strict = true;
    else if (a === "-h" || a === "--help") {
      console.log(`
CONTACT-OS Assembler

node scripts/assemble.js --input <path> --out <dir> [--clean] [--strict]

--input   Path to CONTACTOS_MASTER_BUILD_PACKAGE.zip OR a directory containing artifact zips
--out     Output directory root (default: ./contactos_repo)
--clean   Delete output directory before assembling
--strict  Treat warnings as failures
`);
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }
  if (!args.input) {
    console.error("ERROR: --input is required.");
    process.exit(2);
  }
  return args;
}

function sha256File(filePath) {
  const h = crypto.createHash("sha256");
  const fd = fs.openSync(filePath, "r");
  try {
    const buf = Buffer.alloc(1024 * 1024);
    let bytes = 0;
    while ((bytes = fs.readSync(fd, buf, 0, buf.length, null)) > 0) {
      h.update(buf.subarray(0, bytes));
    }
  } finally {
    fs.closeSync(fd);
  }
  return h.digest("hex");
}

function ensureDirSync(p) {
  fs.mkdirSync(p, { recursive: true });
}

function isZip(p) {
  return p.toLowerCase().endsWith(".zip");
}

function listArtifactZips(inputPath) {
  const stat = fs.statSync(inputPath);
  if (stat.isFile()) {
    if (!isZip(inputPath)) throw new Error("Input file is not a .zip");
    // If it's a master package, it contains artifacts/*.zip
    return { mode: "master", zips: [path.resolve(inputPath)] };
  }
  if (stat.isDirectory()) {
    const files = fs.readdirSync(inputPath).filter(f => isZip(f));
    if (!files.length) throw new Error("No .zip files found in input directory");
    return { mode: "loose", zips: files.map(f => path.resolve(inputPath, f)) };
  }
  throw new Error("Input path must be a zip file or directory");
}

function isPathSafe(relPath) {
  // No absolute paths, no traversal, no null bytes
  if (!relPath || relPath.includes("\0")) return false;
  if (path.isAbsolute(relPath)) return false;
  const norm = path.normalize(relPath).replace(/\\/g, "/");
  if (norm.startsWith("../") || norm.includes("/../") || norm === "..") return false;
  return true;
}

const ALLOWED_ROOTS = ["docs/", "plans/", "prompts/", "tests/", "build/"];
const FORBIDDEN_PATTERNS = [
  /^\.env/i,
  /^.*\/\.env/i,
  /secrets?/i,
  /^\.git\//,
  /^.*\/\.ssh\//
];

function isAllowedRoot(relPath) {
  const p = relPath.replace(/\\/g, "/");
  return ALLOWED_ROOTS.some(r => p.startsWith(r));
}

function isForbidden(relPath) {
  const p = relPath.replace(/\\/g, "/");
  return FORBIDDEN_PATTERNS.some(rx => rx.test(p));
}

function artifactCandidateKey(zipPath) {
  const st = fs.statSync(zipPath);
  return {
    zipPath,
    mtimeMs: st.mtimeMs || 0,
    name: path.basename(zipPath)
  };
}

function chooseWinner(candidates) {
  // Deterministic: newest mtime, then lexicographically later filename
  candidates.sort((a, b) => {
    if (a.mtimeMs !== b.mtimeMs) return a.mtimeMs - b.mtimeMs;
    return a.name.localeCompare(b.name);
  });
  return candidates[candidates.length - 1];
}

async function atomicWrite(destPath, data) {
  ensureDirSync(path.dirname(destPath));
  const tmp = destPath + ".tmp-" + crypto.randomBytes(6).toString("hex");
  await fsp.writeFile(tmp, data);
  await fsp.rename(tmp, destPath);
}

async function extractZipEntries(zipPath) {
  const zip = new AdmZip(zipPath);
  const entries = zip.getEntries();
  return entries
    .filter(e => !e.isDirectory)
    .map(e => ({
      entryName: e.entryName.replace(/\\/g, "/"),
      getData: () => e.getData() // Buffer
    }));
}

async function main() {
  const args = parseArgs(process.argv);
  const inputPath = path.resolve(args.input);
  const outRoot = path.resolve(args.out);

  const report = {
    meta: {
      assembled_at: new Date().toISOString(),
      mode: null,
      output_root: outRoot
    },
    inputs: { zips: [] },
    writes: { files_written: 0, files_skipped: 0, collisions: [] },
    validation: { required_files_present: false, path_safety_pass: false },
    warnings: [],
    failures: []
  };

  try {
    if (args.clean && fs.existsSync(outRoot)) {
      fs.rmSync(outRoot, { recursive: true, force: true });
    }
    ensureDirSync(outRoot);
    ensureDirSync(path.join(outRoot, "build", "reports"));

    const discovered = listArtifactZips(inputPath);
    report.meta.mode = discovered.mode;

    let artifactZips = [];
    if (discovered.mode === "master") {
      // open master and find artifacts/*.zip
      const masterZipPath = discovered.zips[0];
      report.inputs.zips.push({ path: masterZipPath, sha256: sha256File(masterZipPath) });

      const masterZip = new AdmZip(masterZipPath);
      const masterEntries = masterZip.getEntries().filter(e => !e.isDirectory);
      const embedded = masterEntries
        .filter(e => e.entryName.replace(/\\/g, "/").startsWith("artifacts/") && e.entryName.toLowerCase().endsWith(".zip"))
        .map(e => ({ name: path.basename(e.entryName), data: e.getData() }));

      if (!embedded.length) throw new Error("Master zip contains no artifacts/*.zip");

      // Write embedded zips to a temp folder for processing
      const tmpDir = await fsp.mkdtemp(path.join(os.tmpdir(), "contactos-artifacts-"));
      for (const z of embedded) {
        const p = path.join(tmpDir, z.name);
        await fsp.writeFile(p, z.data);
        artifactZips.push(path.resolve(p));
        report.inputs.zips.push({ path: p, sha256: sha256File(p) });
      }
    } else {
      artifactZips = discovered.zips;
      for (const zp of artifactZips) {
        report.inputs.zips.push({ path: zp, sha256: sha256File(zp) });
      }
    }

    // Build mapping of targetPath -> candidates
    const map = new Map(); // relPath => [{zipPath, mtimeMs, name, dataFn}...]
    for (const zp of artifactZips) {
      const candKey = artifactCandidateKey(zp);
      const entries = await extractZipEntries(zp);
      for (const ent of entries) {
        const rel = ent.entryName.replace(/\\/g, "/");
        // safety checks
        if (!isPathSafe(rel)) {
          report.failures.push({ code: "AS-PATH-TRAVERSAL", severity: "FAIL", file: zp, line: null, message: `Unsafe path in zip: ${rel}`, evidence: rel });
          continue;
        }
        if (isForbidden(rel)) {
          report.failures.push({ code: "AS-PATH-FORBIDDEN", severity: "FAIL", file: zp, line: null, message: `Forbidden path in zip: ${rel}`, evidence: rel });
          continue;
        }
        if (!isAllowedRoot(rel)) {
          report.failures.push({ code: "AS-PATH-ROOT", severity: "FAIL", file: zp, line: null, message: `Path outside allowed roots: ${rel}`, evidence: rel });
          continue;
        }

        const list = map.get(rel) || [];
        list.push({ ...candKey, getData: ent.getData });
        map.set(rel, list);
      }
    }

    if (report.failures.length) {
      throw new Error("Assembler validation failed while scanning zip contents.");
    }

    // Resolve collisions deterministically and write files
    for (const [rel, candidates] of map.entries()) {
      const winner = chooseWinner(candidates);
      if (candidates.length > 1) {
        report.writes.collisions.push({
          path: rel,
          candidates: candidates.map(c => c.name),
          winner: winner.name,
          rule_used: "newest|lexicographic"
        });
      }
      const dest = path.join(outRoot, rel);
      await atomicWrite(dest, winner.getData());
      report.writes.files_written += 1;
    }

    report.validation.path_safety_pass = true;

    // Required file set
    const required = [
      "docs/execution_runbook.md",
      "docs/plan_guard_spec.md",
      "docs/policy_guard_spec.md",
      "docs/spec_language.md",
      "docs/generated_zones.md",
      "docs/invariants.md",
      "docs/policies.md",
      "plans/phase_00_governance.md",
      "plans/phase_01_foundation.md",
      "plans/phase_02_core_data_model.md",
      "plans/phase_03_import_pipeline.md",
      "plans/phase_04_dashboard_actions.md",
      "plans/phase_05_ai_modules.md",
      "plans/phase_06_beta_packaging.md",
      "prompts/architect.md",
      "prompts/builder.md",
      "prompts/reviewer.md",
      "prompts/tester.md",
      "tests/beta_checklist.md"
    ];
    const missing = required.filter(r => !fs.existsSync(path.join(outRoot, r)));
    if (missing.length) {
      report.failures.push({
        code: "AS-REQUIRED-MISSING",
        severity: "FAIL",
        file: "(assembled-tree)",
        line: null,
        message: "Missing required files after assembly",
        evidence: missing.slice(0, 50).join(", ")
      });
      throw new Error("Required file set missing.");
    }
    report.validation.required_files_present = true;

    // Optional: run guards if scripts exist in assembled tree
    const planGuard = path.join(outRoot, "scripts", "plan_guard.js");
    const policyGuard = path.join(outRoot, "scripts", "policy_guard.js");
    if (fs.existsSync(planGuard) && fs.existsSync(policyGuard)) {
      const pg = spawnSync("node", [planGuard], { cwd: outRoot, encoding: "utf8" });
      const polg = spawnSync("node", [policyGuard], { cwd: outRoot, encoding: "utf8" });
      if (pg.status !== 0) report.failures.push({ code: "AS-PLAN-GUARD", severity: "FAIL", file: "scripts/plan_guard.js", line: null, message: "plan_guard failed", evidence: pg.stdout + pg.stderr });
      if (polg.status !== 0) report.failures.push({ code: "AS-POLICY-GUARD", severity: "FAIL", file: "scripts/policy_guard.js", line: null, message: "policy_guard failed", evidence: polg.stdout + polg.stderr });
      if (pg.status !== 0 || polg.status !== 0) throw new Error("Guards failed.");
    } else {
      report.warnings.push("Guard scripts not found in assembled tree; skipping guard execution.");
    }

    // Write report
    const reportPath = path.join(outRoot, "build", "reports", "assembler_report.json");
    await atomicWrite(reportPath, Buffer.from(JSON.stringify(report, null, 2), "utf8"));

    console.log("ASSEMBLE PASS");
    console.log(`Wrote ${report.writes.files_written} files to ${outRoot}`);
    console.log(`Report: ${reportPath}`);
    process.exit(0);

  } catch (err) {
    // Best-effort report
    try {
      const reportPath = path.join(outRoot, "build", "reports", "assembler_report.json");
      if (!report.failures.length) {
        report.failures.push({ code: "AS-UNKNOWN", severity: "FAIL", file: "(runtime)", line: null, message: err.message || String(err), evidence: "" });
      }
      ensureDirSync(path.dirname(reportPath));
      fs.writeFileSync(reportPath, JSON.stringify(report, null, 2), "utf8");
      console.error(`Report written: ${reportPath}`);
    } catch (_) {}
    console.error("ASSEMBLE FAIL");
    console.error(err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
