import assert from "node:assert/strict";
import { allDsaTopics, allLldTopics, allHldTopics, allAiTopics, allOsTopics, allCppTopics } from "../data/all-topics";
import { syllabus } from "../data/syllabus";
import { dsaConceptManifest } from "../data/dsa-coverage-manifest";
import { authoredAlgorithms } from "../data/dsa-curriculum";
import { canonicalTopicId, migrateMastery, topicAliases } from "../data/topic-migrations";
import { coverageTopics } from "../data/expanded-coverage";
import { dsaTopicsExtended } from "../data/dsa-topics-extended";
import { isPracticeVariation } from "../data/practice-variation";
import { auditDsa, TrackDatasets } from "./lib/dsa-audit";

const tracks: TrackDatasets = { DSA: allDsaTopics, LLD: allLldTopics, HLD: allHldTopics, AI: allAiTopics, OS: allOsTopics, CPP: allCppTopics };
const complete = process.argv.includes("--complete");
const has = (rule: string, findings: ReturnType<typeof auditDsa>) => findings.some((f) => f.rule === rule);
const target = allDsaTopics.find((t) => t.id === "topic-range-fenwick")!;
assert(target, "Detector fixture must be a live topic.");

const missing = { ...tracks, DSA: tracks.DSA.filter((t) => t.id !== target.id) };
assert(has("coverage:missing-core", auditDsa(syllabus, missing, dsaConceptManifest, true)));
const variationOnly = { ...target, lesson: [], intuition: "This subject is only mentioned in practice.", cppCode: undefined };
assert(has("coverage:dedicated-evidence", auditDsa(syllabus, { ...tracks, DSA: tracks.DSA.map((t) => t.id === target.id ? variationOnly : t) }, dsaConceptManifest, true)));
assert(has("ownership", auditDsa(syllabus, { ...tracks, DSA: [...tracks.DSA, { ...allLldTopics[0], id: "injected-foreign-track" }] }, dsaConceptManifest, true)));
assert(has("module:count-drift", auditDsa(syllabus.map((m) => m.id === target.moduleId ? { ...m, topicCount: m.topicCount + 1 } : m), tracks, dsaConceptManifest, true)));
assert(has("coverage:missing-specialist", auditDsa(syllabus, { ...tracks, DSA: tracks.DSA.filter((t) => t.id !== "topic-specialist-digit-dp") }, dsaConceptManifest, true)));
assert(has("dependency:cycle", auditDsa(syllabus.map((m) => m.id === "mod-foundations" ? { ...m, dependencies: ["mod-arrays-strings"] } : m), tracks, dsaConceptManifest, true)));
assert(has("title:unreviewed-duplicate", auditDsa(syllabus, { ...tracks, DSA: [...tracks.DSA, { ...target, id: "duplicate-title-fixture" }] }, dsaConceptManifest, true)));
assert(has("topic:duplicate", auditDsa(syllabus, { ...tracks, DSA: [...tracks.DSA, target] }, dsaConceptManifest, true)));
assert(has("coverage:not-dedicated", auditDsa(syllabus, tracks, dsaConceptManifest.map((c) => c.concept === "fenwick" ? { ...c, status: "variation-only" } : c), true)));

for (const [old, canonical] of Object.entries(topicAliases)) {
  assert.equal(canonicalTopicId(old), canonical);
  const progress = migrateMastery({ [old]: "interview-ready", [canonical]: "learning" });
  assert.deepEqual(progress, { [canonical]: "interview-ready" });
  assert.deepEqual(migrateMastery(progress), progress);
  const source = [...coverageTopics, ...dsaTopicsExtended].find((t) => t.id === old)!;
  const retained = allDsaTopics.find((t) => t.id === canonical)!;
  assert(source && retained, "Both sides of a consolidation must be accounted for.");
  for (const practice of source.practiceProblems ?? []) {
    assert(retained.practiceProblems?.some((p) => JSON.stringify(p) === JSON.stringify(practice)), `${old}: lost practice`);
  }
  for (const section of source.lesson ?? []) {
    assert(retained.lesson?.some((s) => JSON.stringify(s) === JSON.stringify(section)), `${old}: lost section`);
  }
  for (const example of source.examples ?? []) {
    assert(retained.examples?.some((e) => JSON.stringify(e) === JSON.stringify(example)), `${old}: lost example`);
  }
  for (const field of ["intuition", "methodology", "cppCode", "workedExample"] as const) {
    const text = source[field];
    if (text) assert(JSON.stringify([retained.lesson, retained.examples]).includes(JSON.stringify(text).slice(1, -1)), `${old}: lost ${field}`);
  }
}
assert.throws(() => migrateMastery({ bad: "unknown-status" }));
assert.equal(canonicalTopicId("constructor"), "constructor");
assert.deepEqual(migrateMastery(JSON.parse('{"__proto__":"learning"}')), JSON.parse('{"__proto__":"learning"}'));
const authoredIds = new Set(authoredAlgorithms.map((a) => a.id));
const priorPractices = allDsaTopics.filter((t) => !authoredIds.has(t.id)).flatMap((t) => t.practiceProblems ?? []);
assert.equal(priorPractices.filter(isPracticeVariation).length, 630, "Consolidation must conserve the 630 original authored DSA variations.");
for (const source of coverageTopics.filter((t) => ["LLD", "HLD"].includes(syllabus.find((m) => m.id === t.moduleId)?.track ?? ""))) {
  const owner = syllabus.find((m) => m.id === source.moduleId)!.track;
  assert(tracks[owner].some((t) => t.id === source.id), `${source.id} lost from its owning track`);
  assert(!tracks.DSA.some((t) => t.id === source.id), `${source.id} leaked into DSA`);
}
for (const a of authoredAlgorithms) {
  assert(dsaConceptManifest.some((c) => c.topicId === a.id), `${a.id} needs an explicit concept mapping`);
  assert(allDsaTopics.some((t) => t.id === a.id), `${a.id} was dropped from the live assembly`);
}
console.log("DSA detector self-tests passed: removed topic, variation-only, foreign track, stale count, missing specialist, cycle, duplicates, status and mastery migration.");
const findings = auditDsa(syllabus, tracks, dsaConceptManifest, complete);
for (const scope of ["core", "specialist"] as const) {
  const mappings = dsaConceptManifest.filter((c) => c.scope === scope);
  const fulfilled = mappings.filter((c) => c.status === "dedicated" && tracks.DSA.some((t) => t.id === c.topicId) &&
    !findings.some((f) => f.detail === c.concept || f.detail.startsWith(`${c.concept}:`) || f.detail.startsWith(c.topicId)));
  console.log(`${scope}: ${fulfilled.length}/${mappings.length} dedicated concept mappings${scope === "specialist" && !complete ? " (full gate enabled by --complete)" : ""}`);
}
for (const [track, topics] of Object.entries(tracks)) console.log(`${track}: ${topics.length} topics`);
for (const m of syllabus.filter((m) => m.track === "DSA")) console.log(`  ${m.id}: ${tracks.DSA.filter((t) => t.moduleId === m.id).length}${m.optional ? " optional" : ""}`);
if (findings.length) {
  for (const f of findings) console.error(`${f.rule}: ${f.detail}`);
  process.exit(1);
}
console.log("DSA coverage, retained inventory, ownership, prerequisites, counts and authored-content audit passed.");
