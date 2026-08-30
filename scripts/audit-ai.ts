// Audit: AI track structural integrity and content depth.
//
// This exists because two failure modes in the content pipeline are otherwise
// completely silent:
//   1. `collect()` in data/all-topics.ts drops any topic whose `moduleId` is not
//      in the syllabus, and de-duplicates by topic id (earlier source wins). A
//      typo therefore looks exactly like content that was never written.
//   2. `enrichTopic()` has no AI branch, so any field an AI topic leaves empty
//      silently inherits generic, DSA-flavored boilerplate that reads plausibly
//      but is wrong for this track.
// Both are caught mechanically here rather than by review.
//
// Run with: npx tsx scripts/audit-ai.ts  (or: npm run audit:ai)
import { syllabus, Topic } from "../data/syllabus";
import { aiTopics } from "../data/ai-topics";
import { allAiTopics, allTopics } from "../data/all-topics";

const MIN_FAQS = 5;
const MIN_DIAGRAM_LINES = 3;
const MIN_DIAGRAM_CHARS = 100;
const MIN_LESSON_SECTIONS = 2;

const aiModules = syllabus.filter((m) => m.track === "AI");
const aiModuleIds = new Set(aiModules.map((m) => m.id));
const syllabusModuleIds = new Set(syllabus.map((m) => m.id));

const errors: string[] = [];
const warnings: string[] = [];

function fail(message: string) {
  errors.push(message);
}

// Diagrams are authored as HTML (see asciiDiagram in data/ai/_shared.ts), so
// measure the visible text rather than the markup, and treat an escaped "\n"
// inside a string literal as a real line break.
function visibleDiagramText(diagram: string): string {
  return diagram
    .replace(/<[^>]*>/g, "\n")
    .replace(/\\n/g, "\n")
    .replace(/&nbsp;/g, " ")
    .split("\n")
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0)
    .join("\n");
}

function substantialDiagram(diagram: string | undefined): boolean {
  if (!diagram) return false;
  const text = visibleDiagramText(diagram);
  return text.split("\n").length >= MIN_DIAGRAM_LINES && text.length >= MIN_DIAGRAM_CHARS;
}

// Signatures of the generic fallbacks in enrichTopic(). If a topic's rendered
// value matches one of these, the field was left empty in the source data.
const boilerplateComplexity = ["Depends on the selected operation", "Depends on the data structure state"];

function nonEmptyList(value: unknown[] | undefined): boolean {
  return Array.isArray(value) && value.length > 0;
}

// ---------------------------------------------------------------------------
// 1. Structural integrity (runs even while the track is still empty)
// ---------------------------------------------------------------------------

const seenIds = new Set<string>();
const nonAiIds = new Set(allTopics.filter((t) => !aiModuleIds.has(t.moduleId)).map((t) => t.id));

for (const topic of aiTopics) {
  if (!topic.id || topic.id.trim().length === 0) {
    fail(`A topic in the AI dataset has an empty id (title: "${topic.title || "<untitled>"}").`);
    continue;
  }
  if (!syllabusModuleIds.has(topic.moduleId)) {
    fail(`${topic.id}: moduleId "${topic.moduleId}" is not in the syllabus - this topic is silently dropped.`);
  } else if (!aiModuleIds.has(topic.moduleId)) {
    fail(`${topic.id}: moduleId "${topic.moduleId}" belongs to a non-AI module.`);
  }
  if (seenIds.has(topic.id)) {
    fail(`${topic.id}: duplicate topic id inside the AI dataset - only the first copy survives collect().`);
  }
  seenIds.add(topic.id);
  if (nonAiIds.has(topic.id)) {
    fail(`${topic.id}: id collides with an existing non-AI topic - collect() keeps the earlier one.`);
  }
  if (!/^topic-ai-[a-z0-9-]+$/.test(topic.id)) {
    fail(`${topic.id}: does not follow the topic-ai-<module>-<slug> id convention.`);
  }
}

const survivingIds = new Set(allAiTopics.map((t) => t.id));
for (const topic of aiTopics) {
  if (topic.id && !survivingIds.has(topic.id)) {
    fail(`${topic.id}: authored but missing from allAiTopics - it was dropped or de-duplicated during aggregation.`);
  }
}

// Every syllabus module should have at least one topic. AI modules are exempt
// only while the AI dataset is entirely empty (the pre-content bootstrap state),
// so this never breaks the existing tracks.
const aiTrackIsEmpty = aiTopics.length === 0;
for (const mod of syllabus) {
  const count = allTopics.filter((t) => t.moduleId === mod.id).length;
  if (count === 0) {
    if (aiModuleIds.has(mod.id) && aiTrackIsEmpty) continue;
    fail(`${mod.id} ("${mod.title}") has no topics.`);
  } else if (aiModuleIds.has(mod.id) && count !== mod.topicCount) {
    warnings.push(`${mod.id}: topicCount metadata says ${mod.topicCount} but ${count} topic(s) are authored.`);
  }
}

// ---------------------------------------------------------------------------
// 2. Content depth (per topic; enforced once content exists)
// ---------------------------------------------------------------------------

function auditTopicContent(topic: Topic) {
  const id = topic.id;

  if (!topic.intuition || topic.intuition.trim().length < 40) {
    fail(`${id}: intuition is missing or too short.`);
  }

  const lesson = topic.lesson || [];
  if (lesson.length < MIN_LESSON_SECTIONS) {
    fail(`${id}: needs at least ${MIN_LESSON_SECTIONS} lesson sections (has ${lesson.length}).`);
  }
  lesson.forEach((section, i) => {
    if (!section.title || section.title.trim().length === 0) fail(`${id}: lesson section ${i} has an empty title.`);
    if (!section.content || section.content.trim().length < 80) {
      fail(`${id}: lesson section ${i} ("${section.title}") has an empty or too-short content body.`);
    }
  });

  if (!lesson.some((section) => substantialDiagram(section.diagram))) {
    fail(
      `${id}: no lesson section carries a substantial diagram (need >= ${MIN_DIAGRAM_LINES} lines and >= ${MIN_DIAGRAM_CHARS} chars of visible text).`
    );
  }

  const examples = topic.examples || [];
  if (examples.length === 0) {
    fail(`${id}: has no examples.`);
  }
  examples.forEach((example, i) => {
    if (!example.explanation || example.explanation.trim().length < 80) {
      fail(`${id}: example ${i} ("${example.title}") has an empty or too-short step-by-step explanation.`);
    }
  });

  const complexity = topic.complexity;
  if (!complexity || !complexity.time?.trim() || !complexity.space?.trim()) {
    fail(`${id}: complexity.time and complexity.space must both be set (AI topics use them for latency/cost framing).`);
  } else {
    if (boilerplateComplexity.includes(complexity.time.trim())) {
      fail(`${id}: complexity.time is the enrichTopic boilerplate ("${complexity.time}") - the source field is empty.`);
    }
    if (boilerplateComplexity.includes(complexity.space.trim())) {
      fail(`${id}: complexity.space is the enrichTopic boilerplate ("${complexity.space}") - the source field is empty.`);
    }
  }

  const requiredLists: { field: keyof Topic; label: string }[] = [
    { field: "tips", label: "tips" },
    { field: "tricks", label: "tricks" },
    { field: "memoryAids", label: "memoryAids" },
    { field: "interviewPatterns", label: "interviewPatterns" },
    { field: "references", label: "references" },
    { field: "practiceProblems", label: "practiceProblems" }
  ];
  for (const { field, label } of requiredLists) {
    if (!nonEmptyList(topic[field] as unknown[] | undefined)) {
      fail(`${id}: ${label} is empty - it would silently inherit generic boilerplate from enrichTopic.`);
    }
  }

  const faq = topic.faq || [];
  if (faq.length < MIN_FAQS) {
    fail(`${id}: has ${faq.length} FAQ(s); at least ${MIN_FAQS} are required.`);
  }
}

// Audit the authored source topics, so an empty field is reported against the
// file it belongs to rather than against its enriched replacement.
for (const topic of aiTopics) {
  auditTopicContent(topic);
}

// ---------------------------------------------------------------------------
// Report
// ---------------------------------------------------------------------------

for (const warning of warnings) {
  console.warn(`WARN: ${warning}`);
}

if (errors.length > 0) {
  console.error(`FAIL: ${errors.length} AI track problem(s):`);
  for (const message of errors) console.error(` - ${message}`);
  process.exit(1);
}

if (aiTrackIsEmpty) {
  console.log(
    `PASS (bootstrap): the AI dataset is still empty, so per-topic checks are skipped. All ${aiModules.length} AI modules are declared and every non-AI module has topics.`
  );
} else {
  console.log(
    `PASS: all ${aiTopics.length} AI topics across ${aiModules.length} modules have valid ids/moduleIds, a substantial lesson diagram, explicit complexity framing, populated tips/tricks/memoryAids/interviewPatterns/references/practiceProblems, and at least ${MIN_FAQS} FAQs.`
  );
}
