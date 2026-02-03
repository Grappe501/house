#!/usr/bin/env node
/**
 * policy_guard.js — Governance policy enforcement
 *
 * Minimal implementation aligned to /docs/policy_guard_spec.md.
 * - Extracts canonical IDs from docs/invariants.md and docs/policies.md
 * - Validates reference integrity across governed markdown
 * - Validates zones file exists and defines required concepts/markers
 * - Emits machine-readable report to build/reports/policy_guard.json
 *
 * Exit codes:
 *  0 = PASS (or PASS with warnings)
 *  2 = FAIL
 */
const fs = require("fs");
const path = require("path");
const { globSync } = require("glob");

function readText(p) {
  return fs.readFileSync(p, "utf8");
}

function exists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function ensureDir(p) {
  fs.mkdirSync(p, { recursive: true });
}

function extractIds(text, prefix) {
  const re = new RegExp(`\\b${prefix}-\\d{3}\\b`, "g");
  const found = text.match(re) || [];
  return found;
}

function extractReferences(text) {
  // references look like INV-### or POL-###
  const re = /\b(INV|POL)-\d{3}\b/g;
  return text.match(re) || [];
}

function titleAfterId(text, id) {
  // Heuristic: require id appears on a line that also contains ":" OR is followed by a non-empty line.
  const lines = text.split(/\r?\n/);
  for (let i=0;i<lines.length;i++) {
    if (lines[i].includes(id)) {
      // if "ID: Title" pattern
      const idx = lines[i].indexOf(id);
      const rest = lines[i].slice(idx + id.length).trim();
      if (rest.startsWith(":") && rest.slice(1).trim().length > 0) return true;
      // else next non-empty line should exist and not be another ID-only line
      for (let j=i+1;j<Math.min(i+6, lines.length); j++) {
        const ln = lines[j].trim();
        if (!ln) continue;
        if (/\b(INV|POL)-\d{3}\b/.test(ln) && ln.length <= 8) return false;
        return true;
      }
      return false;
    }
  }
  return false;
}

function main() {
  const repoRoot = process.cwd();
  const reportsDir = path.join(repoRoot, "build", "reports");
  ensureDir(reportsDir);

  const report = {
    schema_version: "policy_guard_report_v1",
    created_at_utc: new Date().toISOString(),
    status: "PASS",
    checks: [],
    errors: [],
    warnings: [],
    stats: {}
  };

  function fail(code, message, meta={}) {
    report.status = "FAIL";
    report.errors.push({ code, message, ...meta });
  }
  function warn(code, message, meta={}) {
    report.warnings.push({ code, message, ...meta });
  }
  function passCheck(name, details={}) {
    report.checks.push({ name, status: "PASS", details });
  }
  function failCheck(name, details={}) {
    report.checks.push({ name, status: "FAIL", details });
  }
  function warnCheck(name, details={}) {
    report.checks.push({ name, status: "WARN", details });
  }

  // CHECK 01: canonical ID extraction
  const invPath = path.join(repoRoot, "docs", "invariants.md");
  const polPath = path.join(repoRoot, "docs", "policies.md");

  if (!exists(invPath)) fail("PG01_MISSING_INVARIANTS", "docs/invariants.md is missing");
  if (!exists(polPath)) fail("PG01_MISSING_POLICIES", "docs/policies.md is missing");

  let invText="", polText="";
  if (exists(invPath)) invText = readText(invPath);
  if (exists(polPath)) polText = readText(polPath);

  const invIds = extractIds(invText, "INV");
  const polIds = extractIds(polText, "POL");

  const dup = (arr)=> arr.filter((v,i)=>arr.indexOf(v)!==i);
  const dupInv = dup(invIds);
  const dupPol = dup(polIds);

  if (exists(invPath) && invIds.length === 0) fail("PG01_EMPTY_INVARIANTS", "No INV-### IDs found in docs/invariants.md");
  if (exists(polPath) && polIds.length === 0) fail("PG01_EMPTY_POLICIES", "No POL-### IDs found in docs/policies.md");
  if (dupInv.length) fail("PG01_DUP_INVARIANTS", "Duplicate INV IDs detected", { duplicates: Array.from(new Set(dupInv)) });
  if (dupPol.length) fail("PG01_DUP_POLICIES", "Duplicate POL IDs detected", { duplicates: Array.from(new Set(dupPol)) });

  // title line adjacency
  const missingTitles = [];
  for (const id of new Set(invIds)) if (!titleAfterId(invText, id)) missingTitles.push(id);
  for (const id of new Set(polIds)) if (!titleAfterId(polText, id)) missingTitles.push(id);
  if (missingTitles.length) warn("PG01_MISSING_TITLES", "Some IDs do not appear to have an adjacent title line", { ids: missingTitles });

  passCheck("PG01_CANONICAL_IDS", { invariants: Array.from(new Set(invIds)).length, policies: Array.from(new Set(polIds)).length });

  const known = new Set([...invIds, ...polIds]);

  // CHECK 02: reference integrity across governed markdown
  const governedGlobs = ["docs/**/*.md", "plans/**/*.md", "tests/**/*.md", "prompts/**/*.md"];
  const governedFiles = [];
  for (const g of governedGlobs) {
    governedFiles.push(...globSync(g, { cwd: repoRoot, nodir: true, dot: true }));
  }

  const refs = [];
  for (const rel of governedFiles) {
    const p = path.join(repoRoot, rel);
    const t = readText(p);
    const r = extractReferences(t);
    for (const id of r) refs.push({ file: rel.replaceAll("\\","/"), id });
  }

  const unknownRefs = refs.filter(x => !known.has(x.id));
  if (unknownRefs.length) {
    failCheck("PG02_REFERENCE_INTEGRITY", { unknown_count: unknownRefs.length, sample: unknownRefs.slice(0,25) });
    fail("PG02_UNKNOWN_REFERENCES", "Unknown INV/POL IDs referenced in governed markdown", { unknown_count: unknownRefs.length });
  } else {
    passCheck("PG02_REFERENCE_INTEGRITY", { references: refs.length });
  }

  // CHECK 04: zone rule integrity
  const zonesPath = path.join(repoRoot, "docs", "generated_zones.md");
  if (!exists(zonesPath)) {
    failCheck("PG04_ZONES_PRESENT", { missing: "docs/generated_zones.md" });
    fail("PG04_MISSING_ZONES", "docs/generated_zones.md is missing");
  } else {
    const zt = readText(zonesPath).toLowerCase();
    const required = ["protected", "generated", "hybrid", "boundary"];
    const missing = required.filter(w => !zt.includes(w));
    if (missing.length) {
      warnCheck("PG04_ZONES_PRESENT", { missing_terms: missing });
      warn("PG04_ZONES_INCOMPLETE", "zones file does not mention required zone concepts/markers", { missing_terms: missing });
    } else {
      passCheck("PG04_ZONES_PRESENT", { ok: true });
    }
  }

  // CHECK 05: runbook authority presence
  const runbookPath = path.join(repoRoot, "docs", "execution_runbook.md");
  if (!exists(runbookPath)) {
    failCheck("PG05_RUNBOOK_PRESENT", { missing: "docs/execution_runbook.md" });
    fail("PG05_MISSING_RUNBOOK", "docs/execution_runbook.md is missing");
  } else {
    const rt = readText(runbookPath).toLowerCase();
    const hints = [
      "preconditions",
      "phase",
      "stop",
      "failure",
      "authority"
    ];
    const missingHints = hints.filter(h => !rt.includes(h));
    if (missingHints.length) {
      warnCheck("PG05_RUNBOOK_PRESENT", { missing_terms: missingHints });
      warn("PG05_RUNBOOK_WEAK", "runbook missing some authority terms (heuristic)", { missing_terms: missingHints });
    } else {
      passCheck("PG05_RUNBOOK_PRESENT", { ok: true });
    }
  }

  report.stats = {
    governed_files: governedFiles.length,
    references: refs.length,
    known_ids: known.size
  };

  const outPath = path.join(reportsDir, "policy_guard.json");
  fs.writeFileSync(outPath, JSON.stringify(report, null, 2) + "\n");

  if (report.status === "FAIL") {
    console.error("policy_guard: FAIL");
    console.error(`See ${path.relative(repoRoot, outPath)}`);
    process.exit(2);
  }
  console.log("policy_guard: PASS");
  console.log(`Wrote ${path.relative(repoRoot, outPath)}`);
}

main();
