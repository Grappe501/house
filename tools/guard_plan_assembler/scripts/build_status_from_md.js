#!/usr/bin/env node
/**
 * build_status_from_md.js
 *
 * Usage:
 *   node scripts/build_status_from_md.js <path-to-master_build.md>
 *
 * Output:
 *   public/build-status.json
 *
 * Parsing rules (from master_build.md):
 * - Phase header: `# PHASE`
 * - Step header: `## P`
 * - Step status line: `**Status:** X`
 * - Build status line: `**Build Status:** X`
 *
 * Output JSON shape:
 * {
 *   "phases":[
 *     {
 *       "title":"PHASE 1 — ...",
 *       "buildStatus":"NOT_STARTED",
 *       "steps":[{"id":"P1-01","title":"Create app skeleton","status":"DONE"}]
 *     }
 *   ]
 * }
 */

const fs = require("fs");
const path = require("path");

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

function writeJson(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function main() {
  const mdPathArg = process.argv[2];
  if (!mdPathArg) die("Missing argument: path to master_build.md");

  const mdAbs = path.resolve(process.cwd(), mdPathArg);
  if (!fs.existsSync(mdAbs)) die(`master_build.md not found: ${mdAbs}`);

  const md = readText(mdAbs);
  const lines = md.split(/\r?\n/);

  const phases = [];

  const phaseHeaderRe = /^#\s*(PHASE\s+\d+\s+—\s+.+)$/i;
  const phaseBuildStatusRe = /^\*\*Build Status:\*\*\s*(.+)\s*$/i;

  const stepHeaderRe = /^##\s*(P\d+-\d+)\s+—\s+(.+)\s*$/i;
  const stepStatusRe = /^\*\*Status:\*\*\s*(.+)\s*$/i;

  let currentPhase = null;
  let currentStep = null;

  function flushStep() {
    if (currentPhase && currentStep) {
      currentPhase.steps.push(currentStep);
      currentStep = null;
    }
  }

  function flushPhase() {
    if (currentPhase) {
      flushStep();
      phases.push(currentPhase);
      currentPhase = null;
    }
  }

  for (let i = 0; i < lines.length; i++) {
    const raw = lines[i];
    const line = raw.trim();

    // New phase
    {
      const m = line.match(phaseHeaderRe);
      if (m) {
        flushPhase();
        currentPhase = {
          title: m[1],
          buildStatus: "UNKNOWN",
          steps: [],
        };
        continue;
      }
    }

    // Phase build status
    if (currentPhase) {
      const m = line.match(phaseBuildStatusRe);
      if (m) {
        currentPhase.buildStatus = m[1].trim();
        continue;
      }
    }

    // New step
    if (currentPhase) {
      const m = line.match(stepHeaderRe);
      if (m) {
        flushStep();
        currentStep = {
          id: m[1].trim(),
          title: m[2].trim(),
          status: "UNKNOWN",
        };
        continue;
      }
    }

    // Step status
    if (currentPhase && currentStep) {
      const m = line.match(stepStatusRe);
      if (m) {
        currentStep.status = m[1].trim();
        continue;
      }
    }
  }

  flushPhase();

  if (!phases.length) {
    die("No phases found. Expected lines like: # PHASE 1 — ...");
  }

  // Write to repo-root/public/build-status.json relative to md location
  const repoRoot = path.dirname(mdAbs);
  const outDir = path.join(repoRoot, "public");
  const outPath = path.join(outDir, "build-status.json");

  ensureDir(outDir);
  writeJson(outPath, { phases });

  console.log(`✅ Wrote ${path.relative(process.cwd(), outPath).replace(/\\/g, "/")}`);
}

main();
