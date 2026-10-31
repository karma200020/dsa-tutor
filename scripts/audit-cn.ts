import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { cnLessons, allCnTopics } from "../data/topics/cn";
import { cnModules } from "../data/cn-catalog";
import { cnCoverage, cnCrosswalk } from "../data/cn/coverage";
import { cnSources } from "../data/cn/sources";
import { cnLabs } from "../data/cn/labs";
import { approvedCnConcepts } from "../data/cn/approved-scope";
import type { NetworkLesson } from "../data/cn/schema";
import inventory from "../data/cn/inventory.json";
import { allDsaTopics, allLldTopics, allHldTopics, allAiTopics, allOsTopics, allCppTopics } from "../data/all-topics";
import { googleQuestionBank } from "../data/company-questions/google";

function audit(lessons: NetworkLesson[], manifest: typeof cnCoverage): string[] {
  const issues: string[] = [];
  const ids = new Set<string>(), concepts = new Set<string>(), titles = new Set<string>();
  const required = new Set(inventory.concepts);
  const moduleMap = new Map(cnModules.map((module) => [module.id.replace("mod-cn-", ""), module]));
  const normalized = new Map<string, string>();
  for (const lesson of lessons) {
    if (ids.has(lesson.id)) issues.push(`Duplicate lesson: ${lesson.id}`);
    ids.add(lesson.id);
    if (titles.has(lesson.title.toLowerCase())) issues.push(`Duplicate title: ${lesson.title}`);
    titles.add(lesson.title.toLowerCase());
    if (!moduleMap.has(lesson.module)) issues.push(`Unknown module: ${lesson.id}`);
    const prose = [lesson.meaning, lesson.why, lesson.model, lesson.failure, lesson.observe, lesson.advanced, lesson.interview.answer];
    if (prose.some((text) => !text?.trim()) || lesson.steps.length < 3 ||
        !lesson.example.given || !lesson.example.result || lesson.example.steps.length < 2 ||
        lesson.confusions.length < 2 || lesson.interview.followups.length < 2 ||
        lesson.recall.length < 2 || lesson.tasks.length < 2 || lesson.sources.length < 2 || !lesson.concepts.length) {
      issues.push(`Incomplete teaching contract: ${lesson.id}`);
    }
    for (const card of lesson.recall) if (!card.question?.trim() || !card.answer?.trim()) issues.push(`Empty retrieval: ${lesson.id}`);
    for (const task of lesson.tasks) {
      if (!["Explain", "Predict", "Calculate", "Diagnose", "Compare"].includes(task.kind) ||
          [task.prompt, task.hint, task.answer, task.reasoning].some((text) => !text?.trim())) issues.push(`Empty assessment: ${lesson.id}`);
    }
    if (new Set(lesson.tasks.map((task) => task.prompt)).size !== lesson.tasks.length) issues.push(`Repeated assessment: ${lesson.id}`);
    for (const [field, text] of [["why", lesson.why], ["model", lesson.model], ["failure", lesson.failure], ["answer", lesson.interview.answer]] as const) {
      const key = text.toLowerCase().replaceAll(lesson.title.toLowerCase(), "<title>").replace(/[^a-z0-9<>]/g, " ");
      if (normalized.has(key)) issues.push(`Repeated substantive ${field}: ${normalized.get(key)} / ${lesson.id}`);
      normalized.set(key, lesson.id);
      if (/coming soon|^placeholder[.!]?\s*$|lorem ipsum|choose the right abstraction|depends on the selected operation/i.test(text)) issues.push(`Generic content: ${lesson.id}`);
    }
    for (const sourceId of lesson.sources) {
      const source = cnSources[sourceId];
      if (!source?.url || !source.version || !source.locator || new URL(source.url).protocol !== "https:") issues.push(`Invalid provenance: ${lesson.id}/${sourceId}`);
    }
    if (lesson.lab && !cnLabs.some((lab) => lab.id === lesson.lab)) issues.push(`Broken lab: ${lesson.id}`);
  }
  for (const item of manifest) {
    if (concepts.has(item.concept)) issues.push(`Duplicate concept owner: ${item.concept}`);
    concepts.add(item.concept);
    const owner = lessons.find((lesson) => lesson.id === item.ownerLesson);
    if (!owner?.concepts.includes(item.concept)) issues.push(`Missing owner/evidence: ${item.concept}`);
    if (!item.learningOutcome || !item.workedExample.steps.length || !item.assessment.length || !item.sources.length) issues.push(`Empty mapping evidence: ${item.concept}`);
    if (!required.has(item.concept)) issues.push(`Unreviewed concept addition: ${item.concept}`);
  }
  for (const concept of required) if (!concepts.has(concept)) issues.push(`Missing required mapping: ${concept}`);
  for (const [module, checklist] of Object.entries(approvedCnConcepts)) {
    for (const concept of checklist.split(" ")) {
      const mapping = manifest.find((item) => item.concept === concept);
      if (!mapping || mapping.module !== module) issues.push(`Approved scope missing/misowned: ${module}/${concept}`);
    }
  }
  for (const expected of inventory.lessons) {
    const live = lessons.find((lesson) => lesson.id === expected.id);
    if (!live || live.module !== expected.module) issues.push(`Missing/moved leaf: ${expected.id}`);
    else if (JSON.stringify([...live.concepts].sort()) !== JSON.stringify([...expected.concepts].sort())) issues.push(`Concept inventory changed: ${expected.id}`);
  }
  if (lessons.length !== inventory.lessons.length) issues.push("Unreviewed lesson count change");
  for (const module of cnModules) {
    const actual = lessons.filter((lesson) => `mod-cn-${lesson.module}` === module.id).length;
    if (actual !== module.topicCount || actual === 0) issues.push(`Module count: ${module.id}: ${actual}/${module.topicCount}`);
    for (const dependency of module.dependencies) {
      const dep = cnModules.find((candidate) => candidate.id === dependency);
      if (!dep || (!module.optional && dep.optional)) issues.push(`Invalid module prerequisite: ${module.id}/${dependency}`);
    }
  }
  const visiting = new Set<string>(), visited = new Set<string>();
  function visit(id: string) {
    if (visiting.has(id)) { issues.push(`Lesson cycle: ${id}`); return; }
    if (visited.has(id)) return;
    visiting.add(id);
    const lesson = lessons.find((entry) => entry.id === id);
    for (const dependency of lesson?.prerequisites ?? []) {
      const owner = lessons.find((entry) => entry.id === dependency);
      if (!owner) issues.push(`Unknown prerequisite: ${id}/${dependency}`);
      else {
        if (!moduleMap.get(lesson!.module)?.optional && moduleMap.get(owner.module)?.optional) issues.push(`Core requires specialist: ${id}`);
        visit(dependency);
      }
    }
    visiting.delete(id); visited.add(id);
  }
  lessons.forEach((lesson) => visit(lesson.id));
  return issues;
}

const findings = audit(cnLessons, cnCoverage);
assert(audit(cnLessons, cnCoverage.slice(1)).some((issue) => issue.startsWith("Missing required mapping")));
assert(audit(cnLessons.slice(1), cnCoverage).some((issue) => issue.startsWith("Missing owner/evidence")));
assert(audit([...cnLessons, cnLessons[0]], cnCoverage).some((issue) => issue.startsWith("Duplicate lesson")));
assert(audit(cnLessons, [...cnCoverage, cnCoverage[0]]).some((issue) => issue.startsWith("Duplicate concept")));
const bad = { ...cnLessons[0], why: "Coming soon", sources: [], tasks: [] };
assert(audit([bad, ...cnLessons.slice(1)], cnCoverage).some((issue) => issue.startsWith("Incomplete teaching")));
const cycle = { ...cnLessons[0], prerequisites: [cnLessons[0].id] };
assert(audit([cycle, ...cnLessons.slice(1)], cnCoverage).some((issue) => issue.startsWith("Lesson cycle")));
assert.deepEqual([allDsaTopics.length, allLldTopics.length, allHldTopics.length, allAiTopics.length, allOsTopics.length, allCppTopics.length], [135, 28, 27, 75, 40, 40]);
assert.equal(googleQuestionBank.questions.length, 79);
assert.equal(cnCrosswalk.length, 8);
assert(cnSources.tls.url.includes("9846") && cnSources.tls.version.includes("obsoletes"));
assert.equal(cnLabs.length, 12);
assert(cnLabs.every((lab) => cnLessons.some((lesson) => lesson.lab === lab.id)), "Every lab must be wired into a visible authored lesson");
assert(cnLabs.every((lab) => lab.setup && lab.platform && lab.prerequisites && lab.cleanup && lab.explanation && lab.trace.length >= 4 && lab.observations.length >= 3));
assert(allCnTopics.every((topic) => Boolean(topic.optional) === topic.id.startsWith("topic-specialist-")));
assert(allCnTopics.every((topic) => topic.complexity === undefined && topic.cppCode === undefined));
const home = readFileSync("app/home-view.tsx", "utf8");
assert(home.includes('import("@/data/topics/cn")'));
assert(!/^import .*from ["'].*(?:cn\/|topics\/cn)/m.test(home), "CN payload must not be statically imported at home");
const viewer = readFileSync("components/network-topic-viewer.tsx", "utf8");
assert(!/<details[^>]*\bopen\b/.test(viewer), "Answers must start closed");
assert(viewer.includes('download="cn_echo.py"'));
for (const finding of findings) console.error(finding);
if (findings.length) process.exit(1);
console.log(`CN: ${cnLessons.length} lessons (${allCnTopics.filter((topic) => !topic.optional).length} core, ${allCnTopics.filter((topic) => topic.optional).length} optional), ${cnCoverage.length} required concept mappings, 8 final ACM units, 12 labs.`);
console.log("CN completeness, ownership, counts, provenance, generic-text, prerequisite and mutation checks passed; prior 345 topics and 79 bank entries conserved.");
