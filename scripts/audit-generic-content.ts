import { allTopics } from "../data/all-topics";
import { syllabus, Topic, Track } from "../data/syllabus";

type Finding = {
  track: Track | "UNKNOWN";
  id: string;
  title: string;
  field: string;
  reason: string;
  excerpt: string;
};

const trackByModule = new Map(syllabus.map((module) => [module.id, module.track]));
const badPhrases = [
  "the crucial decision is to model the real responsibility",
  "understand the system shape and the trade-offs",
  "key classes or components",
  "failure model",
  "how the design handles scale, concurrency",
  "Identify responsibilities",
  "Choose the right abstraction"
];
const enrichFallbackSignatures = [
  "When should I reach for",
  "What is the most common mistake candidates make with",
  "How do I defend the complexity of",
  "Requirements: define the user-facing operation, latency target, durability, availability, and consistency boundary",
  "Name at least one simpler alternative (e.g., a conditional/if-else chain instead of a Strategy",
  "Identify the responsibility boundary the design protects (e.g., Open-Closed",
  "Start with the core entities and their composition/association relationships",
  "Identify any shared mutable state (a counter, a queue, a shared resource pool)",
  "Point to the exact interface or abstract class new variants would implement",
  "Write a unit test for the core invariant in isolation",
  "Step 1: Estimate peak traffic as",
  "Start from daily/peak active users, multiply by an assumed action rate",
  "The layer that cannot be trivially horizontally scaled",
  "Expose versioned endpoints for the primary read/write operations, require an idempotency key",
  "Cache when reads vastly outnumber writes",
  "Anything tied to money, uniqueness, or a user-visible invariant",
  "Apply timeouts, bounded retries with backoff, and circuit breakers"
];

function excerpt(value: string): string {
  return value.replace(/\s+/g, " ").trim().slice(0, 180);
}

function isCommentOnly(value: string): boolean {
  const lines = value.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines.length > 0 && lines.every((line) => line.startsWith("//"));
}

function inspectTopic(topic: Topic, forcedTrack?: Track): Finding[] {
  const track = forcedTrack || trackByModule.get(topic.moduleId) || "UNKNOWN";
  const findings: Finding[] = [];
  const add = (field: string, reason: string, value: string) => {
    findings.push({ track, id: topic.id, title: topic.title, field, reason, excerpt: excerpt(value) });
  };

  if (!topic.lesson || topic.lesson.length === 0) {
    add("lesson", "empty lesson", "");
  }

  for (const [index, section] of (topic.lesson || []).entries()) {
    if (!section.content.trim()) {
      add(`lesson[${index}].content`, "blank lesson content", section.content);
    }
    if (section.codeExample !== undefined && !section.codeExample.trim()) {
      add(`lesson[${index}].codeExample`, "blank lesson code", section.codeExample);
    }
    if (track === "DSA" && section.codeExample && isCommentOnly(section.codeExample)) {
      add(`lesson[${index}].codeExample`, "comment-only placeholder code block", section.codeExample);
    }
  }

  for (const [index, example] of (topic.examples || []).entries()) {
    if (!example.explanation.trim()) {
      add(`examples[${index}].explanation`, "blank example explanation", example.explanation);
    }
  }

  const fields: [string, string][] = [
    ["intuition", topic.intuition],
    ["lesson", JSON.stringify(topic.lesson || [])],
    ["tips", JSON.stringify(topic.tips || [])],
    ["tricks", JSON.stringify(topic.tricks || [])],
    ["memoryAids", JSON.stringify(topic.memoryAids || [])],
    ["interviewPatterns", JSON.stringify(topic.interviewPatterns || [])],
    ["faq", JSON.stringify(topic.faq || [])]
  ];

  for (const [field, value] of fields) {
    for (const phrase of badPhrases) {
      if (value.toLowerCase().includes(phrase.toLowerCase())) {
        add(field, `known bad phrase: ${phrase}`, value);
      }
    }
    for (const signature of enrichFallbackSignatures) {
      if (value.toLowerCase().includes(signature.toLowerCase())) {
        add(field, `active enrich fallback: ${signature}`, value);
      }
    }
  }

  return findings;
}

const syntheticBadTopic: Topic = {
  id: "audit-self-test",
  moduleId: "mod-arrays-strings",
  title: "Audit Self Test",
  intuition: "The crucial decision is to model the real responsibility.",
  lesson: [{ title: "Bad", content: "Known bad synthetic content.", codeExample: "// placeholder\n// only comments" }]
};
const syntheticLldTopic: Topic = {
  id: "audit-self-test-lld",
  moduleId: "mod-lld-oop-foundations",
  title: "Synthetic LLD",
  intuition: "Synthetic",
  lesson: [{ title: "Synthetic", content: "Synthetic authored lesson content." }],
  faq: [{
    question: "Synthetic?",
    answer: "Identify the responsibility boundary the design protects (e.g., Open-Closed if variants change)."
  }]
};
const syntheticHldTopic: Topic = {
  id: "audit-self-test-hld",
  moduleId: "mod-hld-foundations",
  title: "Synthetic HLD",
  intuition: "Synthetic",
  lesson: [{
    title: "Synthetic",
    content: "Start from daily/peak active users, multiply by an assumed action rate per user."
  }]
};
const selfTestFindings = [
  ...inspectTopic(syntheticBadTopic, "DSA"),
  ...inspectTopic(syntheticLldTopic, "LLD"),
  ...inspectTopic(syntheticHldTopic, "HLD")
];
if (
  !selfTestFindings.some((finding) => finding.reason.startsWith("known bad phrase")) ||
  !selfTestFindings.some((finding) => finding.reason === "comment-only placeholder code block") ||
  !selfTestFindings.some((finding) => finding.track === "LLD" && finding.reason.startsWith("active enrich fallback")) ||
  !selfTestFindings.some((finding) => finding.track === "HLD" && finding.reason.startsWith("active enrich fallback"))
) {
  throw new Error("Generic-content audit self-test failed: DSA, LLD, and HLD fallback detectors must all fire.");
}

const findings = allTopics.flatMap((topic) => inspectTopic(topic));

type RepeatedValue = { topic: Topic; field: string; value: string };
function normalizeTemplate(value: string, title: string): string {
  const escapedTitle = title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return value
    .toLowerCase()
    .replace(new RegExp(escapedTitle.toLowerCase(), "g"), "<title>")
    .replace(/[^a-z0-9<>]+/g, " ")
    .trim();
}

function findRepeatedTemplates(topics: Topic[]): Finding[] {
  const repeatedGroups = new Map<string, RepeatedValue[]>();
  for (const topic of topics) {
    const track = trackByModule.get(topic.moduleId) || "UNKNOWN";
    const substantiveFields: [string, string][] = track === "DSA"
      ? [
        ["intuition", topic.intuition],
        ...(topic.lesson || []).map((section, index) => [`lesson[${index}].content`, section.content] as [string, string]),
        ...(topic.faq || []).map((item, index) => [`faq[${index}].answer`, item.answer] as [string, string])
      ]
      : (topic.faq || []).map((item, index) => [`faq[${index}].answer`, item.answer] as [string, string]);
    for (const [field, value] of substantiveFields) {
      const normalized = normalizeTemplate(value, topic.title);
      if (normalized.length < 100) continue;
      const key = `${track}\0${field.replace(/\[\d+\]/g, "[]")}\0${normalized}`;
      const group = repeatedGroups.get(key) || [];
      group.push({ topic, field, value });
      repeatedGroups.set(key, group);
    }
  }

  const repeatedFindings: Finding[] = [];
  for (const group of repeatedGroups.values()) {
    const distinctIds = new Set(group.map(({ topic }) => topic.id));
    const distinctTitles = new Set(group.map(({ topic }) => topic.title));
    const distinctModules = new Set(group.map(({ topic }) => topic.moduleId));
    if (distinctIds.size < 3 || distinctTitles.size < 3 || distinctModules.size < 2) continue;
    for (const { topic, field, value } of group) {
      repeatedFindings.push({
        track: trackByModule.get(topic.moduleId) || "UNKNOWN",
        id: topic.id,
        title: topic.title,
        field,
        reason: `normalized template repeated across ${distinctIds.size} unrelated topic IDs`,
        excerpt: excerpt(value)
      });
    }
  }
  return repeatedFindings;
}

const repetitionSelfTestTopics: Topic[] = [
  ["repeat-a", "mod-lld-oop-foundations", "Alpha Design"],
  ["repeat-b", "mod-lld-core-patterns", "Beta Design"],
  ["repeat-c", "mod-lld-design-exercises", "Gamma Design"]
].map(([id, moduleId, title]) => ({
  id,
  moduleId,
  title,
  intuition: `Authored intuition for ${title}`,
  lesson: [{ title: "Authored", content: `Unique authored lesson for ${title}.` }],
  faq: [{
    question: `Synthetic question for ${title}?`,
    answer: `For ${title}, this deliberately repeated synthetic template contains enough substantive words to exercise normalized title substitution across unrelated topics without relying on short labels or references.`
  }]
}));
if (findRepeatedTemplates(repetitionSelfTestTopics).length !== 3) {
  throw new Error("Generic-content audit self-test failed: normalized repetition detector did not flag all synthetic LLD templates.");
}

findings.push(...findRepeatedTemplates(allTopics));

if (findings.length > 0) {
  console.error("Generic-content audit failed:");
  console.error("track | topic ID/title | field | reason | excerpt");
  for (const finding of findings) {
    console.error(
      `${finding.track} | ${finding.id}/${finding.title} | ${finding.field} | ${finding.reason} | ${finding.excerpt}`
    );
  }
  process.exit(1);
}

console.log(`Generic-content audit self-tests passed for DSA placeholders, LLD/HLD signatures, and normalized repetition.`);
console.log(`Generic-content audit passed for ${allTopics.length} assembled topics.`);
