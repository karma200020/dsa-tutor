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
// Run with:
//   npx tsx scripts/audit-ai.ts              (per-module gate: skips module coverage)
//   npx tsx scripts/audit-ai.ts --complete   (completion gate: also requires every
//                                             AI module to have at least one topic)
// or: npm run audit:ai  /  npm run audit:ai -- --complete
import { syllabus, Topic } from "../data/syllabus";
import { aiTopics } from "../data/ai-topics";
import { allAiTopics, allTopics } from "../data/all-topics";

// Module coverage is the only rule that cannot pass mid-content-phase, so it is
// opt-in. Without it the audit goes green as soon as the first module lands and
// stays green, which keeps it meaningful instead of permanently red.
const enforceCoverage = process.argv.slice(2).includes("--complete");

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

// Mojibake guard. Content specs have arrived double-encoded (UTF-8 bytes decoded
// as cp1252), which turns box-drawing characters into sequences like "â”€". The
// length-based diagram rules cannot see this, because mojibake preserves both
// line and character counts - so it needs its own check.
//
// The lead bytes below are the cp1252 renderings of the UTF-8 prefixes for the
// ranges we actually use: U+2000-U+2BFF punctuation/arrows/box-drawing (â...),
// Latin-1 supplement (Ã.../Â...). Plain English prose never contains them.
const MOJIBAKE_PATTERN = /â[\u0080-\u00FF\u201A-\u20AC\u2020-\u2122]|Â[\u00A0-\u00BF]|Ã[\u0082-\u00BF]/;

function findMojibake(value: unknown, path: string, hits: string[]): void {
  if (typeof value === "string") {
    const match = MOJIBAKE_PATTERN.exec(value);
    if (match) {
      const at = Math.max(0, match.index - 30);
      hits.push(`${path}: ...${value.slice(at, match.index + 30).replace(/\n/g, " ")}...`);
    }
    return;
  }
  if (Array.isArray(value)) {
    value.forEach((item, i) => findMojibake(item, `${path}[${i}]`, hits));
    return;
  }
  if (value && typeof value === "object") {
    for (const [key, inner] of Object.entries(value)) {
      findMojibake(inner, `${path}.${key}`, hits);
    }
  }
}

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
// while the AI dataset is entirely empty (the pre-content bootstrap state), and
// the rule as a whole is only enforced with --complete so the audit stays usable
// as a per-module gate during the content phase. Non-AI modules are always
// checked, so this never silently regresses the existing tracks.
const aiTrackIsEmpty = aiTopics.length === 0;
const emptyAiModules: string[] = [];

for (const mod of syllabus) {
  const count = allTopics.filter((t) => t.moduleId === mod.id).length;
  if (count === 0) {
    if (aiModuleIds.has(mod.id)) {
      emptyAiModules.push(mod.id);
      if (aiTrackIsEmpty || !enforceCoverage) continue;
    }
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

  const mojibakeHits: string[] = [];
  findMojibake(topic, id, mojibakeHits);
  mojibakeHits.forEach((hit) => {
    fail(`${hit} <- mojibake (double-encoded UTF-8). Re-read the source spec as UTF-8 and re-author this value.`);
  });

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

// Progress is informational in the default mode so it stays visible without
// being a failure.
if (!aiTrackIsEmpty && emptyAiModules.length > 0 && !enforceCoverage) {
  console.log(
    `INFO: ${emptyAiModules.length}/${aiModules.length} AI modules still empty (run with --complete to enforce): ${emptyAiModules.join(", ")}`
  );
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
  const coverageNote = enforceCoverage
    ? `all ${aiModules.length} modules are populated`
    : `${aiModules.length - emptyAiModules.length}/${aiModules.length} modules populated (coverage not enforced)`;
  console.log(
    `PASS: all ${aiTopics.length} AI topics have valid ids/moduleIds, a substantial lesson diagram, explicit complexity framing, populated tips/tricks/memoryAids/interviewPatterns/references/practiceProblems, and at least ${MIN_FAQS} FAQs; ${coverageNote}.`
  );
}
