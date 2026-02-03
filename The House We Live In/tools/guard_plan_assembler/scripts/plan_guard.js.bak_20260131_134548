#!/usr/bin/env node
/**
 * scripts/plan_guard.js — Campaign Compliance "no drift" guard (v2)
 *
 * Authoritative contract (Phase 4+):
 * - master_build.md is the plan of record
 * - Missing-path enforcement can be phase-scoped (default) or whole-plan
 * - Drift detection is ALWAYS checked against the FULL plan allowlist
 *   (even when running phase-scoped), to avoid false drift for other phases.
 *
 * Rules:
 * - If an enforced required path is missing => OFF-PLAN
 * - If an extra file exists under watched roots and is not in the FULL plan => DRIFT
 *
 * Supports:
 * - --report                 : print report (default if no other action)
 * - --create                 : create missing dirs + placeholder files (for enforced required set)
 * - --snapshot <name>        : save manifest snapshot (.plan_guard/manifest.<name>.json)
 * - --phase <n>              : enforce ONLY paths referenced under "# PHASE n" section (missing check)
 * - --all                    : enforce ALL plan paths (missing check) (overrides --phase)
 * - --plan <path>            : plan path (default ./master_build.md)
 * - --repo <path>            : repo root (default .)
 *
 * Usage examples:
 *   node scripts/plan_guard.js --repo . --report
 *   node scripts/plan_guard.js --repo . --create --report
 *   node scripts/plan_guard.js --repo . --phase 4 --report
 *   node scripts/plan_guard.js --repo . --phase 4 --create --report
 *   node scripts/plan_guard.js --repo . --all --report
 *   node scripts/plan_guard.js --repo . --snapshot phase-4-P4-01 --report
 */

const fs = require("fs");
const path = require("path");
const crypto = require("crypto");

function die(msg) {
  console.error(`\n❌ ${msg}\n`);
  process.exit(1);
}

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function pathExists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function sha256(s) {
  return crypto.createHash("sha256").update(s).digest("hex");
}

/**
 * Heuristic for whether a plan path token represents a file.
 * - If it contains an extension, treat as file.
 * - If it is a known root-doc filename, treat as file.
 */
function isProbablyFile(rel) {
  const base = path.basename(rel);
  if (base.includes(".")) return true;

  const known = new Set([
    "package.json",
    "schema.prisma",
    ".gitignore",
    ".npmrc",
    "netlify.toml",
    "README.md",
    "MASTER_BUILD_DIRECTIONS.md",
    "master_build.md",
    "PHASE_LOG.md",
    "PROTOCOLS.md",
    "PHASE_1_FILELIST.md",
    "PHASE_2_FILELIST.md",
  ]);

  return known.has(base);
}

/**
 * Ignore generated/derived files and OS clutter when scanning for drift.
 * These are runtime-only paths and are NOT plan-bound.
 */
function shouldIgnoreRelPath(relPath) {
  const p = relPath.replace(/\\/g, "/");

  // Always ignore common generated directories anywhere in the repo
  const ignoredDirSegments = [
    "/node_modules/",
    "/.next/",
    "/dist/",
    "/build/",
    "/.turbo/",
    "/.cache/",
    "/.vercel/",
    "/.netlify/",
  ];

  for (const seg of ignoredDirSegments) {
    if (p.includes(seg)) return true;
  }

  const base = path.basename(p);

  // Always ignore common local/runtime files
  const ignoredFiles = new Set([
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    ".DS_Store",
    "Thumbs.db",

    // Local-only environment files (explicitly allowed; never part of plan)
    ".env",
    ".env.local",
    ".env.development",
    ".env.production",
  ]);

  if (ignoredFiles.has(base)) return true;

  // Ignore any .env.* patterns
  if (base.startsWith(".env.")) return true;

  return false;
}

/**
 * Extract candidate repo paths from master_build.md text.
 *
 * Accepted sources of truth:
 * 1) backticked paths: `apps/campaign_compliance/app/page.tsx`
 * 2) inline/bullets tokens matching known roots: apps/... db/... scripts/... etc.
 *
 * To reduce false positives, we only accept paths rooted in known repo roots or root docs.
 */
function extractPlanPaths(mdText, phaseFilter /* number|null */) {
  const roots = [
    "apps/",
    "db/",
    "scripts/",
    "public/",
    ".plan_guard/",
    "master_build.md",
    "MASTER_BUILD_DIRECTIONS.md",
    "PHASE_LOG.md",
    "PROTOCOLS.md",
    "PHASE_1_FILELIST.md",
    "PHASE_2_FILELIST.md",
  ];

  const accept = (s) => {
    if (!s) return null;
    let p = s.trim().replace(/\\/g, "/");

    // Strip trailing punctuation
    p = p.replace(/[),.;:]$/g, "");

    // Reject obvious non-paths
    if (p.includes("://")) return null;
    if (p.includes("`")) return null;
    if (p.includes("{") || p.includes("}") || p.includes(";")) return null;

    // Avoid accepting prose chunks that include spaces (except root docs which can appear standalone)
    if (p.includes(" ") && !p.endsWith(".md")) return null;

    // Normalize leading ./ if present
    if (p.startsWith("./")) p = p.slice(2);

    // Keep only recognized roots
    if (!roots.some((r) => p === r || p.startsWith(r))) return null;

    return p;
  };

  const scoped = phaseFilter ? sliceToPhase(mdText, phaseFilter) : mdText;
  const found = new Set();

  // 1) backticked paths
  {
    const re = /`([^`\n\r]+)`/g;
    let m;
    while ((m = re.exec(scoped)) !== null) {
      const candidate = accept(m[1]);
      if (candidate) found.add(candidate);
    }
  }

  // 2) inline/bullets tokens (bounded to known roots and root docs)
  {
    const re =
      /\b(apps\/[A-Za-z0-9._\-\/]+|db\/[A-Za-z0-9._\-\/]+|scripts\/[A-Za-z0-9._\-\/]+|public\/[A-Za-z0-9._\-\/]+|\.plan_guard\/[A-Za-z0-9._\-\/]+|master_build\.md|MASTER_BUILD_DIRECTIONS\.md|PHASE_LOG\.md|PROTOCOLS\.md|PHASE_1_FILELIST\.md|PHASE_2_FILELIST\.md)\b/g;
    let m;
    while ((m = re.exec(scoped)) !== null) {
      const candidate = accept(m[1]);
      if (candidate) found.add(candidate);
    }
  }

  return Array.from(found).sort();
}

/**
 * Returns only the markdown slice for "# PHASE <n>" ... until the next "# PHASE" or EOF.
 * This makes phase-specific missing checks deterministic.
 */
function sliceToPhase(mdText, phaseNumber) {
  const lines = mdText.split(/\r?\n/);

  const phaseHeaderRe = new RegExp(`^#\\s*PHASE\\s+${phaseNumber}\\b`, "i");
  const nextPhaseRe = /^#\s*PHASE\s+\d+\b/i;

  let startIdx = -1;
  for (let i = 0; i < lines.length; i++) {
    if (phaseHeaderRe.test(lines[i].trim())) {
      startIdx = i;
      break;
    }
  }

  if (startIdx === -1) {
    return "";
  }

  let endIdx = lines.length;
  for (let i = startIdx + 1; i < lines.length; i++) {
    if (nextPhaseRe.test(lines[i].trim())) {
      endIdx = i;
      break;
    }
  }

  return lines.slice(startIdx, endIdx).join("\n");
}

function normalizePaths(repoRoot, relPaths) {
  return relPaths.map((rel) => ({
    rel: rel.replace(/\\/g, "/"),
    abs: path.resolve(repoRoot, rel.replace(/\\/g, "/")),
  }));
}

function listAllFilesUnder(rootAbs, repoRootAbs) {
  const out = [];

  function walk(dirAbs) {
    const items = fs.readdirSync(dirAbs, { withFileTypes: true });
    for (const it of items) {
      const fullAbs = path.join(dirAbs, it.name);
      const rel = path.relative(repoRootAbs, fullAbs).replace(/\\/g, "/");

      if (shouldIgnoreRelPath(rel)) continue;

      if (it.isDirectory()) walk(fullAbs);
      else out.push(fullAbs);
    }
  }

  if (pathExists(rootAbs)) walk(rootAbs);
  return out;
}

/**
 * Create missing placeholders for the ENFORCED required set.
 * This does not delete drift.
 */
function createMissingPlaceholders(repoRoot, requiredNormalized) {
  const created = { dirs: [], files: [] };

  for (const p of requiredNormalized) {
    const rel = p.rel;

    // Explicit directory marker
    const explicitDir = rel.endsWith("/");
    const treatAsFile = !explicitDir && isProbablyFile(rel);

    if (treatAsFile) {
      const parent = path.dirname(p.abs);
      if (!pathExists(parent)) {
        ensureDir(parent);
        created.dirs.push(path.relative(repoRoot, parent).replace(/\\/g, "/"));
      }
      if (!pathExists(p.abs)) {
        fs.writeFileSync(p.abs, "");
        created.files.push(rel);
      }
    } else {
      if (!pathExists(p.abs)) {
        ensureDir(p.abs);
        created.dirs.push(rel);
      }
    }
  }

  created.dirs = Array.from(new Set(created.dirs)).sort();
  created.files = Array.from(new Set(created.files)).sort();
  return created;
}

function main() {
  const args = process.argv.slice(2);
  const has = (k) => args.includes(k);
  const get = (k, def) => {
    const idx = args.indexOf(k);
    if (idx === -1) return def;
    return args[idx + 1] ?? def;
  };

  const repoRoot = get("--repo", ".");
  const planPath = get("--plan", "./master_build.md");

  const forceAll = has("--all");
  const phaseFilterRaw = get("--phase", null);
  const phaseFilter = !forceAll && phaseFilterRaw ? Number(phaseFilterRaw) : null;

  if (phaseFilterRaw && !forceAll) {
    if (!Number.isFinite(phaseFilter) || phaseFilter <= 0) {
      die(`Invalid --phase value: ${phaseFilterRaw}`);
    }
  }

  const doCreate = has("--create");
  const doReport = has("--report") || (!doCreate && !has("--snapshot"));
  const snapshotName = get("--snapshot", null);

  const repoRootAbs = path.resolve(repoRoot);

  const planAbs = path.resolve(repoRoot, planPath);
  if (!pathExists(planAbs)) die(`Plan not found: ${planAbs}`);

  const md = readText(planAbs);

  // FULL plan allowlist (always used for drift checks)
  const fullRelPaths = extractPlanPaths(md, null);
  if (fullRelPaths.length === 0) {
    die("No plan paths were detected in master_build.md. The guard cannot enforce anything.");
  }

  // ENFORCED required set for missing checks:
  // - If --all is present => full plan
  // - Else if --phase N => phase slice
  // - Else default => full plan (safe default)
  let enforcedRelPaths;
  let enforcementMode;
  if (forceAll) {
    enforcedRelPaths = fullRelPaths;
    enforcementMode = "ALL";
  } else if (phaseFilter) {
    enforcedRelPaths = extractPlanPaths(md, phaseFilter);
    enforcementMode = `PHASE_${phaseFilter}`;
    if (enforcedRelPaths.length === 0) {
      die(
        `No paths found under "# PHASE ${phaseFilter}". Either the phase header is missing, or no paths are referenced.`
      );
    }
  } else {
    enforcedRelPaths = fullRelPaths;
    enforcementMode = "ALL_DEFAULT";
  }

  const fullAllowlist = normalizePaths(repoRoot, fullRelPaths);
  const enforcedRequired = normalizePaths(repoRoot, enforcedRelPaths);

  // Optional scaffolding (enforced set only)
  const created = doCreate ? createMissingPlaceholders(repoRoot, enforcedRequired) : undefined;

  // Missing (enforced required set only)
  const missing = enforcedRequired.filter((p) => !pathExists(p.abs)).map((p) => p.rel);

  // Drift detection: extra files under watched roots not in FULL allowlist
  const watchedRootsRel = ["apps/campaign_compliance", "db/sql", "scripts"];
  const watchedRootsAbs = watchedRootsRel.map((r) => path.resolve(repoRoot, r));

  const fullAllowlistAbsSet = new Set(fullAllowlist.map((p) => p.abs));
  const extra = [];

  for (const rootAbs of watchedRootsAbs) {
    const files = listAllFilesUnder(rootAbs, repoRootAbs);
    for (const f of files) {
      const rel = path.relative(repoRootAbs, f).replace(/\\/g, "/");
      if (shouldIgnoreRelPath(rel)) continue;

      if (!fullAllowlistAbsSet.has(f)) {
        extra.push(rel);
      }
    }
  }

  extra.sort();

  // Manifest (audit artifact)
  const manifest = {
    generatedAt: new Date().toISOString(),
    repoRoot: repoRootAbs,
    plan: path.relative(repoRoot, planAbs).replace(/\\/g, "/"),
    planHash: sha256(md),

    enforcement: {
      mode: enforcementMode,
      phase: phaseFilter ?? null,
      all: forceAll,
    },

    watchedRoots: watchedRootsRel,

    // Full-plan allowlist (drift baseline)
    planAllowlistPaths: fullAllowlist.map((p) => p.rel),

    // Enforced required set (missing baseline)
    requiredPaths: enforcedRequired.map((p) => p.rel),

    missingPaths: missing,
    extraPaths: extra,

    created: created,
  };

  const guardDir = path.resolve(repoRoot, ".plan_guard");
  ensureDir(guardDir);

  const manifestPath = path.join(guardDir, "manifest.json");
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));

  if (snapshotName) {
    const snapPath = path.join(guardDir, `manifest.${snapshotName}.json`);
    fs.writeFileSync(snapPath, JSON.stringify(manifest, null, 2));
  }

  if (doReport) {
    console.log("\n=== PLAN GUARD REPORT ===\n");
    console.log(`Repo: ${repoRootAbs}`);
    console.log(`Plan: ${manifest.plan}`);
    console.log(`Plan hash: ${manifest.planHash}`);
    console.log(`Enforcement mode: ${manifest.enforcement.mode}`);
    if (manifest.enforcement.phase) console.log(`Phase filter: ${manifest.enforcement.phase}`);
    console.log(`Watched roots: ${watchedRootsRel.join(", ")}`);
    console.log(`Allowlist paths detected (full plan): ${manifest.planAllowlistPaths.length}`);
    console.log(`Required paths enforced (missing check): ${manifest.requiredPaths.length}`);
    console.log(
      `Manifest saved: ${path.relative(repoRoot, manifestPath).replace(/\\/g, "/")}\n`
    );

    if (doCreate) {
      console.log("-- Created (enforced set only) --");
      console.log(`Dirs: ${created.dirs.length}`);
      if (created.dirs.length)
        console.log(created.dirs.map((d) => `  + ${d}`).join("\n"));
      console.log(`Files: ${created.files.length}`);
      if (created.files.length)
        console.log(created.files.map((f) => `  + ${f}`).join("\n"));
      console.log("");
    }

    console.log("-- Missing required paths (OFF-PLAN) --");
    if (!missing.length) console.log("  ✅ none\n");
    else console.log(missing.map((m) => `  ❌ ${m}`).join("\n") + "\n");

    console.log("-- Extra files under watched roots (DRIFT) --");
    if (!extra.length) console.log("  ✅ none\n");
    else console.log(extra.map((e) => `  ⚠️  ${e}`).join("\n") + "\n");

    if (missing.length) {
      console.log("Result: ❌ OFF-PLAN (missing required paths)\n");
      process.exitCode = 2;
    } else if (extra.length) {
      console.log("Result: ⚠️  ON-PLAN but drift detected (extra files present)\n");
      process.exitCode = 3;
    } else {
      console.log("Result: ✅ ON-PLAN (no missing, no drift)\n");
      process.exitCode = 0;
    }
  }
}

main();
