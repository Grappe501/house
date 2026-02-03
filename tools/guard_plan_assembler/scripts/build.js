#!/usr/bin/env node
/**
 * CONTACT-OS Build Runner (runbook-driven skeleton)
 *
 * Implements the execution order defined in:
 * - /docs/build_button_spec.md
 * - /docs/execution_runbook.md
 *
 * This is a deterministic orchestrator that:
 *  - runs plan_guard (if present)
 *  - runs policy_guard (if present)
 *  - generates /build/manifest.json (if generator present, else writes a stub + warning)
 *  - enforces dry-run and approve-writes flags
 *
 * NOTE: Full AI executor role orchestration will be added in a later epoch.
 *
 * Usage:
 *   node scripts/build.js --mode full|phased [--phase 00..06] [--dry-run] [--approve-writes true|false] [--deploy none|beta|production]
 */

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");
const { spawnSync } = require("child_process");

function parseArgs(argv) {
  const args = {
    mode: "full",
    phase: null,
    dryRun: false,
    approveWrites: null, // null => default by environment
    deploy: "none"
  };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--mode") args.mode = String(argv[++i] || "").toLowerCase();
    else if (a === "--phase") args.phase = String(argv[++i] || "");
    else if (a === "--dry-run") args.dryRun = true;
    else if (a === "--approve-writes") args.approveWrites = String(argv[++i] || "").toLowerCase();
    else if (a === "--deploy") args.deploy = String(argv[++i] || "none").toLowerCase();
    else if (a === "-h" || a === "--help") {
      console.log(`
CONTACT-OS Build Runner

node scripts/build.js --mode full|phased [--phase 00..06] [--dry-run] [--approve-writes true|false] [--deploy none|beta|production]

--mode            full (default) | phased
--phase           Optional phase id (00..06). If omitted, guards may infer.
--dry-run         Do not write code artifacts; still writes build reports.
--approve-writes  true|false. Default: true local, false CI.
--deploy          none (default) | beta | production
`);
      process.exit(0);
    } else {
      console.error(`Unknown arg: ${a}`);
      process.exit(2);
    }
  }

  if (!["full", "phased"].includes(args.mode)) {
    console.error("ERROR: --mode must be 'full' or 'phased'");
    process.exit(2);
  }
  if (args.phase && !/^\d{2}$/.test(args.phase)) {
    console.error("ERROR: --phase must be two digits, e.g. 00");
    process.exit(2);
  }
  if (!["none", "beta", "production"].includes(args.deploy)) {
    console.error("ERROR: --deploy must be none|beta|production");
    process.exit(2);
  }
  return args;
}

function isCI() {
  // Common CI env vars
  return Boolean(process.env.CI) || Boolean(process.env.GITHUB_ACTIONS) || Boolean(process.env.NETLIFY);
}

function ensureDirSync(p) {
  fs.mkdirSync(p, { recursive: true });
}

function sha256File(filePath) {
  const h = crypto.createHash("sha256");
  const data = fs.readFileSync(filePath);
  h.update(data);
  return h.digest("hex");
}

function fileExists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function requireFile(repoRoot, relPath) {
  const p = path.join(repoRoot, relPath);
  if (!fileExists(p)) {
    throw new Error(`Missing required file: ${relPath}`);
  }
  return p;
}

function runNodeScript(label, scriptPath, args, cwd) {
  const res = spawnSync("node", [scriptPath, ...args], { cwd, encoding: "utf8" });
  const out = (res.stdout || "") + (res.stderr || "");
  return { status: res.status ?? 1, output: out, label };
}

async function writeJsonAtomic(destPath, obj) {
  ensureDirSync(path.dirname(destPath));
  const tmp = destPath + ".tmp-" + crypto.randomBytes(6).toString("hex");
  await fsp.writeFile(tmp, JSON.stringify(obj, null, 2), "utf8");
  await fsp.rename(tmp, destPath);
}

async function main() {
  const args = parseArgs(process.argv);
  const repoRoot = process.cwd();

  // Defaults
  const approveDefault = isCI() ? "false" : "true";
  const approveWrites = (args.approveWrites ?? approveDefault) === "true";

  // Build report base
  const buildDir = path.join(repoRoot, "build");
  const reportsDir = path.join(buildDir, "reports");
  ensureDirSync(reportsDir);

  const executionLogPath = path.join(buildDir, "execution_log.jsonl");
  const manifestPath = path.join(buildDir, "manifest.json");

  const stamp = () => new Date().toISOString();
  const logLine = async (obj) => {
    const line = JSON.stringify({ ts: stamp(), ...obj }) + "\n";
    await fsp.appendFile(executionLogPath, line, "utf8");
  };

  try {
    // Preconditions: runbook + build button spec must exist
    requireFile(repoRoot, "docs/execution_runbook.md");
    requireFile(repoRoot, "docs/build_button_spec.md");

    await logLine({ stage: "start", mode: args.mode, phase: args.phase, dry_run: args.dryRun, approve_writes: approveWrites, deploy: args.deploy });

    // PASS 0: Guards (if present)
    const planGuardPath = path.join(repoRoot, "scripts", "plan_guard.js");
    const policyGuardPath = path.join(repoRoot, "scripts", "policy_guard.js");

    let planGuardRes = null;
    let policyGuardRes = null;

    if (fileExists(planGuardPath)) {
      await logLine({ stage: "plan_guard:begin" });
      planGuardRes = runNodeScript("plan_guard", planGuardPath, [], repoRoot);
      await writeJsonAtomic(path.join(reportsDir, "plan_guard_runtime.json"), planGuardRes);
      await logLine({ stage: "plan_guard:end", status: planGuardRes.status });
      if (planGuardRes.status !== 0) throw new Error("plan_guard failed. See build/reports/plan_guard_runtime.json");
    } else {
      await logLine({ stage: "plan_guard:skip", reason: "scripts/plan_guard.js missing" });
    }

    if (fileExists(policyGuardPath)) {
      await logLine({ stage: "policy_guard:begin" });
      policyGuardRes = runNodeScript("policy_guard", policyGuardPath, [], repoRoot);
      await writeJsonAtomic(path.join(reportsDir, "policy_guard_runtime.json"), policyGuardRes);
      await logLine({ stage: "policy_guard:end", status: policyGuardRes.status });
      if (policyGuardRes.status !== 0) throw new Error("policy_guard failed. See build/reports/policy_guard_runtime.json");
    } else {
      await logLine({ stage: "policy_guard:skip", reason: "scripts/policy_guard.js missing" });
    }

    // PASS 0.5: Manifest generation
    // If a generator exists, run it; otherwise write a stub manifest (still useful for CI wiring).
    const manifestGenPath = path.join(repoRoot, "scripts", "generate_manifest.js");

    if (fileExists(manifestGenPath)) {
      await logLine({ stage: "manifest:begin", method: "generator" });
      const res = runNodeScript("generate_manifest", manifestGenPath, [], repoRoot);
      await writeJsonAtomic(path.join(reportsDir, "manifest_generator_runtime.json"), res);
      await logLine({ stage: "manifest:end", status: res.status });
      if (res.status !== 0) throw new Error("generate_manifest failed. See build/reports/manifest_generator_runtime.json");
      // assume generator writes build/manifest.json
      if (!fileExists(manifestPath)) throw new Error("generate_manifest did not create build/manifest.json");
    } else {
      await logLine({ stage: "manifest:begin", method: "stub" });
      const inputs = [
        "docs/execution_runbook.md",
        "docs/build_button_spec.md",
        "docs/manifest_spec.md",
        "docs/plan_guard_spec.md",
        "docs/policy_guard_spec.md"
      ].filter(p => fileExists(path.join(repoRoot, p)));

      const stub = {
        meta: {
          app: "CONTACT-OS",
          generated_at: stamp(),
          manifest_version: "0.0-stub",
          source: { runbook_path: "/docs/execution_runbook.md" }
        },
        note: "Stub manifest written because scripts/generate_manifest.js was not found. Implement generator per /docs/manifest_spec.md.",
        inputs: inputs.map(p => ({ path: "/" + p, sha256: sha256File(path.join(repoRoot, p)) })),
        execution: { mode: args.mode, active_phase: args.phase || null }
      };
      await writeJsonAtomic(manifestPath, stub);
      await logLine({ stage: "manifest:end", status: 0, warning: "stub manifest" });
    }

    // PASS 1..5: Role orchestration not yet implemented here (future epoch)
    // This runner intentionally stops before writing code unless you later add the AI executor.
    if (!approveWrites) {
      await logLine({ stage: "approve_writes:false", action: "halt_before_builder" });
      console.log("BUILD HALT (approve-writes=false): guards and manifest complete. No file writes performed.");
      process.exit(0);
    }

    if (args.dryRun) {
      await logLine({ stage: "dry_run:true", action: "halt_after_manifest" });
      console.log("DRY RUN COMPLETE: guards and manifest complete. No code generation performed.");
      process.exit(0);
    }

    // If we ever reach here, it means you're asking for real build execution,
    // but we have not yet implemented the AI executor in this script.
    await logLine({ stage: "halt", reason: "AI executor not implemented in scripts/build.js yet" });
    console.error("ERROR: scripts/build.js runner skeleton complete, but AI executor orchestration is not implemented yet.");
    console.error("Next step: implement executor per /docs/ai_executor_spec.md to run Architect/Builder/Reviewer/Tester passes.");
    process.exit(2);

  } catch (err) {
    await logLine({ stage: "fail", error: err && err.message ? err.message : String(err) });
    console.error("BUILD FAIL:", err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
