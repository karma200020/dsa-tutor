// Single entry point for every content audit. Runs all of them even when an
// earlier one fails, then prints a combined summary and exits non-zero if any
// failed - more useful than bailing on the first failure when several things are
// being fixed at once.
//
// This is intentionally NOT wired into `npm run build`: content audits are a
// separate, explicit gate.
//
// Run with: npm run verify
//   npm run verify -- --complete   gates both core/specialist DSA completeness
//                                  and AI/OS/CPP module population.
import { spawnSync } from "node:child_process";
import path from "node:path";

const passThroughComplete = process.argv.slice(2).includes("--complete");

const audits: { name: string; script: string; args: string[] }[] = [
  { name: "generic-content", script: "audit-generic-content.ts", args: [] },
  { name: "dsa", script: "audit-dsa.ts", args: passThroughComplete ? ["--complete"] : [] },
  { name: "company-questions", script: "audit-company-questions.ts", args: [] },
  { name: "dsa-cpp", script: "test-dsa-cpp.ts", args: [] },
  { name: "faqs", script: "audit-faqs.ts", args: [] },
  { name: "hld-diagrams", script: "audit-hld-diagrams.ts", args: [] },
  { name: "lld-diagrams", script: "audit-lld-diagrams.ts", args: [] },
  { name: "ai", script: "audit-ai.ts", args: passThroughComplete ? ["--complete"] : [] }
];

const tsxCli = path.join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");

const results: { name: string; ok: boolean }[] = [];

for (const audit of audits) {
  console.log(`\n=== ${audit.name} ===`);
  // Invoke the tsx CLI through the current node binary rather than the .bin
  // shim, so no shell is involved and arguments are passed through unescaped-safe.
  const result = spawnSync(process.execPath, [tsxCli, path.join("scripts", audit.script), ...audit.args], {
    stdio: "inherit"
  });
  results.push({ name: audit.name, ok: result.status === 0 });
}

const failedAudits = results.filter((r) => !r.ok);

console.log("\n=== summary ===");
for (const result of results) {
  console.log(` ${result.ok ? "PASS" : "FAIL"}  ${result.name}`);
}

if (failedAudits.length > 0) {
  console.error(`\n${failedAudits.length}/${results.length} audit(s) failed: ${failedAudits.map((r) => r.name).join(", ")}`);
  process.exit(1);
}

console.log(`\nAll ${results.length} audits passed.`);
