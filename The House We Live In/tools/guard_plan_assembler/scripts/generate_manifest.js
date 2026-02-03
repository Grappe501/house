#!/usr/bin/env node
/**
 * CONTACT-OS Manifest Generator
 *
 * Implements: /docs/manifest_spec.md (best-effort deterministic implementation)
 *
 * Output:
 *  - build/manifest.json
 *  - build/reports/manifest_generation.json
 *
 * Notes:
 *  - Offline, deterministic.
 *  - Extracts phases from /plans/phase_*.md
 *  - Extracts "contracts" heuristically from plan text by identifying canonical paths and common contract markers.
 *  - Enforces STOP conditions where feasible (missing required inputs, multiple ACTIVE phases, unknown roots).
 */

const fs = require("fs");
const fsp = fs.promises;
const path = require("path");
const crypto = require("crypto");

function ensureDirSync(p) {
  fs.mkdirSync(p, { recursive: true });
}

function sha256(buf) {
  return crypto.createHash("sha256").update(buf).digest("hex");
}

function sha256File(fp) {
  return sha256(fs.readFileSync(fp));
}

function listFilesRecursive(rootDir) {
  const out = [];
  function walk(dir) {
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const e of entries) {
      const fp = path.join(dir, e.name);
      if (e.isDirectory()) walk(fp);
      else out.push(fp);
    }
  }
  if (fs.existsSync(rootDir)) walk(rootDir);
  return out;
}

function readText(fp) {
  return fs.readFileSync(fp, "utf8");
}

function normalizeRel(repoRoot, fp) {
  return fp.replace(repoRoot + path.sep, "").replace(/\\/g, "/");
}

function extractFirst(regex, text) {
  const m = text.match(regex);
  return m ? (m[1] || m[0]) : null;
}

function parsePlanMeta(planText, fallbackPhaseId) {
  const phase = extractFirst(/^\s*Phase\s*:\s*(\d{2})\s*$/mi, planText) || fallbackPhaseId;
  const epoch = extractFirst(/^\s*Epoch\s*:\s*(\d+)\s*$/mi, planText);
  const status = extractFirst(/^\s*Status\s*:\s*(PENDING|ACTIVE|CLOSED)\s*$/mi, planText);
  const version = extractFirst(/^\s*Version\s*:\s*([0-9]+\.[0-9]+)\s*$/mi, planText);
  const lastUpdated = extractFirst(/^\s*Last Updated\s*:\s*([0-9]{4}-[0-9]{2}-[0-9]{2})\s*$/mi, planText);
  return { phase, epoch: epoch ? Number(epoch) : null, status, version, lastUpdated };
}

function findCanonicalPaths(planText) {
  // Extract paths like docs/..., plans/..., prompts/..., tests/..., app/..., lib/...
  // Prioritize fenced/backticked and plain occurrences.
  const set = new Set();

  const patterns = [
    /`(docs\/[^`]+?\.md)`/g,
    /`(plans\/[^`]+?\.md)`/g,
    /`(prompts\/[^`]+?\.md)`/g,
    /`(tests\/[^`]+?\.md)`/g,
    /`(app\/[^`]+?)`/g,
    /`(lib\/[^`]+?)`/g,
    /(?:^|\s)(docs\/[A-Za-z0-9_\-\/]+\.md)/g,
    /(?:^|\s)(plans\/[A-Za-z0-9_\-\/]+\.md)/g,
    /(?:^|\s)(prompts\/[A-Za-z0-9_\-\/]+\.md)/g,
    /(?:^|\s)(tests\/[A-Za-z0-9_\-\/]+\.md)/g,
    /(?:^|\s)(app\/[A-Za-z0-9_\-\/]+\.[A-Za-z0-9]+)\b/g,
    /(?:^|\s)(lib\/[A-Za-z0-9_\-\/]+\.[A-Za-z0-9]+)\b/g
  ];

  for (const rx of patterns) {
    let m;
    while ((m = rx.exec(planText)) !== null) {
      const p = (m[1] || "").trim().replace(/^\/+/, "");
      if (p) set.add(p);
    }
  }
  return Array.from(set).sort();
}

function extractInvariantPolicyRefs(text) {
  const inv = new Set();
  const pol = new Set();
  const invRx = /\bINV-\d{3}\b/g;
  const polRx = /\bPOL-\d{3}\b/g;
  let m;
  while ((m = invRx.exec(text)) !== null) inv.add(m[0]);
  while ((m = polRx.exec(text)) !== null) pol.add(m[0]);
  return { invariants: Array.from(inv).sort(), policies: Array.from(pol).sort() };
}

function buildContractId(phase, taskId, type, pathOrRoute) {
  return sha256(Buffer.from(`${phase}:${taskId}:${type}:${pathOrRoute}`, "utf8"));
}

function deriveTasks(planText) {
  // Best-effort: find headings like "## Task" or "### Task".
  // If none found, create a single task.
  const lines = planText.split(/\r?\n/);
  const tasks = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const m = line.match(/^\s{0,3}#{2,3}\s+(.+?)\s*$/);
    if (m) {
      const title = m[1].trim();
      // Heuristic: treat headings containing "task" or numeric prefix as tasks
      if (/task/i.test(title) || /^\d+(\.\d+)?\s+/.test(title) || /^T\d+/.test(title)) {
        const taskId = `auto.${tasks.length + 1}`;
        tasks.push({ task_id: taskId, title, startLine: i + 1 });
      }
    }
  }
  if (!tasks.length) tasks.push({ task_id: "auto.1", title: "Auto Extracted Task", startLine: 1 });
  return tasks;
}

async function atomicWrite(fp, data) {
  ensureDirSync(path.dirname(fp));
  const tmp = fp + ".tmp-" + crypto.randomBytes(6).toString("hex");
  await fsp.writeFile(tmp, data);
  await fsp.rename(tmp, fp);
}

async function main() {
  const repoRoot = process.cwd();
  const buildDir = path.join(repoRoot, "build");
  const reportsDir = path.join(buildDir, "reports");
  ensureDirSync(reportsDir);

  const requiredRoots = ["docs", "plans", "prompts", "tests"];
  const missingRoots = requiredRoots.filter(r => !fs.existsSync(path.join(repoRoot, r)));
  const report = {
    generated_at: new Date().toISOString(),
    repo_root: repoRoot,
    warnings: [],
    failures: []
  };

  try {
    if (missingRoots.length) {
      report.failures.push({ code: "MF-ROOTS-MISSING", message: `Missing required roots: ${missingRoots.join(", ")}` });
      throw new Error("Missing required repo roots.");
    }

    // Collect inputs
    const docs = listFilesRecursive(path.join(repoRoot, "docs")).filter(f => f.endsWith(".md"));
    const plans = listFilesRecursive(path.join(repoRoot, "plans")).filter(f => f.endsWith(".md"));
    const prompts = listFilesRecursive(path.join(repoRoot, "prompts")).filter(f => f.endsWith(".md"));
    const tests = listFilesRecursive(path.join(repoRoot, "tests")).filter(f => f.endsWith(".md"));

    const rootCandidates = [
      "master_build_contacts.md",
      "master_build.md",
      "PROTOCOLS_CONTACTS.md",
      "PHASE_LOG_CONTACTS.md",
      "package.json"
    ].map(f => path.join(repoRoot, f)).filter(fs.existsSync);

    const inputsSha = {};
    for (const fp of [...docs, ...plans, ...prompts, ...tests, ...rootCandidates]) {
      const rel = normalizeRel(repoRoot, fp);
      inputsSha["/" + rel] = sha256File(fp);
    }

    // Phases
    const phasePlans = plans
      .filter(p => /phase_\d{2}_/i.test(path.basename(p)) || /phase_\d{2}/i.test(path.basename(p)))
      .sort((a, b) => path.basename(a).localeCompare(path.basename(b)));

    const phases = [];
    let activePhases = [];

    // Contracts buckets
    const contracts = { files: [], apis: [], databases: [], acceptance: [] };
    const ordering = { architect: [], builder: [], reviewer: [], tester: [] };

    for (const planFp of phasePlans) {
      const relPlan = "/" + normalizeRel(repoRoot, planFp);
      const planText = readText(planFp);

      const fallbackPhaseId = (() => {
        const m = path.basename(planFp).match(/phase_(\d{2})/i);
        return m ? m[1] : "00";
      })();

      const meta = parsePlanMeta(planText, fallbackPhaseId);
      if (!meta.status) report.warnings.push(`Plan missing Status header: ${relPlan}`);
      if (!meta.epoch && meta.epoch !== 0) report.warnings.push(`Plan missing Epoch header: ${relPlan}`);

      const phaseEntry = {
        phase_id: meta.phase,
        epoch: meta.epoch ?? null,
        status: meta.status ?? "PENDING",
        plan_path: relPlan,
        tasks: []
      };

      if (phaseEntry.status === "ACTIVE") activePhases.push(phaseEntry.phase_id);

      const tasks = deriveTasks(planText);
      const paths = findCanonicalPaths(planText);
      const refs = extractInvariantPolicyRefs(planText);

      // For each task, attach contracts heuristically:
      // - Any referenced canonical path in docs/plans/prompts/tests => FILE contract
      // - Any referenced app/lib file => FILE contract (code path)
      // - Acceptance contract is always present (phase closure)
      for (const t of tasks) {
        const task = { task_id: t.task_id, title: t.title, contracts: [] };

        // File contracts from paths
        const filePaths = paths.filter(p => /^(docs|plans|prompts|tests|app|lib)\//.test(p));
        for (const p of filePaths) {
          const contract_type = "FILE";
          const contract_id = buildContractId(phaseEntry.phase_id, t.task_id, contract_type, p);
          const c = {
            contract_id,
            phase_id: phaseEntry.phase_id,
            task_id: t.task_id,
            contract_type,
            path_or_route: p,
            role: "builder",
            references: refs
          };
          contracts.files.push(c);
          task.contracts.push(contract_id);
          ordering.builder.push(contract_id);
          ordering.reviewer.push(contract_id);
        }

        // Very light API heuristic: lines like "GET /api/..." or "/api/..."
        const apiRx = /\b(GET|POST|PUT|PATCH|DELETE)\s+(\/api\/[A-Za-z0-9_\-\/]+)\b/g;
        let m;
        while ((m = apiRx.exec(planText)) !== null) {
          const method = m[1];
          const route = m[2];
          const contract_type = "API";
          const pathOrRoute = `${method} ${route}`;
          const contract_id = buildContractId(phaseEntry.phase_id, t.task_id, contract_type, pathOrRoute);
          const c = {
            contract_id,
            phase_id: phaseEntry.phase_id,
            task_id: t.task_id,
            contract_type,
            path_or_route: pathOrRoute,
            role: "builder",
            references: refs
          };
          contracts.apis.push(c);
          task.contracts.push(contract_id);
          ordering.builder.push(contract_id);
          ordering.reviewer.push(contract_id);
        }

        // Acceptance contract (phase closure)
        const acc_id = buildContractId(phaseEntry.phase_id, t.task_id, "ACCEPTANCE", `phase:${phaseEntry.phase_id}`);
        contracts.acceptance.push({
          contract_id: acc_id,
          phase_id: phaseEntry.phase_id,
          task_id: t.task_id,
          contract_type: "ACCEPTANCE",
          path_or_route: `phase:${phaseEntry.phase_id}`,
          role: "tester",
          references: refs
        });
        task.contracts.push(acc_id);
        ordering.tester.push(acc_id);

        phaseEntry.tasks.push(task);
      }

      phases.push(phaseEntry);
    }

    // STOP: multiple ACTIVE phases
    if (activePhases.length > 1) {
      report.failures.push({ code: "MF-PHASE-ACTIVE-MULTI", message: `Multiple ACTIVE phases: ${activePhases.join(", ")}` });
      throw new Error("Multiple ACTIVE phases detected.");
    }

    const active_phase = activePhases.length === 1 ? activePhases[0] : null;

    // Canonical manifest
    const manifest = {
      meta: {
        app: "CONTACT-OS",
        generated_at: new Date().toISOString(),
        manifest_version: "1.0",
        source: {
          master_plan_path: fs.existsSync(path.join(repoRoot, "master_build_contacts.md")) ? "/master_build_contacts.md" : (fs.existsSync(path.join(repoRoot, "master_build.md")) ? "/master_build.md" : null),
          runbook_path: "/docs/execution_runbook.md"
        }
      },
      inputs: {
        docs: docs.map(f => "/" + normalizeRel(repoRoot, f)).sort(),
        plans: plans.map(f => "/" + normalizeRel(repoRoot, f)).sort(),
        prompts: prompts.map(f => "/" + normalizeRel(repoRoot, f)).sort(),
        root: rootCandidates.map(f => "/" + normalizeRel(repoRoot, f)).sort()
      },
      phases,
      contracts: {
        files: contracts.files,
        apis: contracts.apis,
        databases: contracts.databases,
        acceptance: contracts.acceptance
      },
      execution: {
        mode: "FULL",
        active_phase,
        ordering: {
          architect: Array.from(new Set(ordering.architect)).sort(),
          builder: Array.from(new Set(ordering.builder)).sort(),
          reviewer: Array.from(new Set(ordering.reviewer)).sort(),
          tester: Array.from(new Set(ordering.tester)).sort()
        }
      },
      hashes: {
        inputs_sha256: inputsSha,
        contracts_sha256: {
          files: sha256(Buffer.from(JSON.stringify(contracts.files), "utf8")),
          apis: sha256(Buffer.from(JSON.stringify(contracts.apis), "utf8")),
          databases: sha256(Buffer.from(JSON.stringify(contracts.databases), "utf8")),
          acceptance: sha256(Buffer.from(JSON.stringify(contracts.acceptance), "utf8"))
        },
        manifest_sha256: null
      }
    };

    // Self-hash the manifest deterministically: set manifest_sha256 to sha of manifest with null placeholder
    const manifestBuf = Buffer.from(JSON.stringify(manifest), "utf8");
    manifest.hashes.manifest_sha256 = sha256(manifestBuf);

    await atomicWrite(path.join(buildDir, "manifest.json"), JSON.stringify(manifest, null, 2));
    await atomicWrite(path.join(reportsDir, "manifest_generation.json"), JSON.stringify(report, null, 2));

    console.log("MANIFEST PASS");
    console.log(`Active phase: ${active_phase || "(none)"}`);
    console.log(`Wrote: build/manifest.json`);
    process.exit(0);

  } catch (err) {
    try {
      await atomicWrite(path.join(reportsDir, "manifest_generation.json"), JSON.stringify(report, null, 2));
    } catch (_) {}
    console.error("MANIFEST FAIL:", err && err.message ? err.message : err);
    process.exit(1);
  }
}

main();
