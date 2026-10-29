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
  "How do I defend the complexity of"
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
      if (value.includes(signature)) {
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
const selfTestFindings = inspectTopic(syntheticBadTopic, "DSA");
if (
  !selfTestFindings.some((finding) => finding.reason.startsWith("known bad phrase")) ||
  !selfTestFindings.some((finding) => finding.reason === "comment-only placeholder code block")
) {
  throw new Error("Generic-content audit self-test failed: banned-phrase and comment-only detectors must both fire.");
}

const findings = allTopics.flatMap((topic) => inspectTopic(topic));

type RepeatedValue = { topic: Topic; field: string; value: string };
const repeatedGroups = new Map<string, RepeatedValue[]>();
for (const topic of allTopics) {
  if (trackByModule.get(topic.moduleId) !== "DSA") continue;
  const substantiveFields: [string, string][] = [
    ["intuition", topic.intuition],
    ...(topic.lesson || []).map((section, index) => [`lesson[${index}].content`, section.content] as [string, string]),
    ...(topic.faq || []).map((item, index) => [`faq[${index}].answer`, item.answer] as [string, string])
  ];
  for (const [field, value] of substantiveFields) {
    const normalized = value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (normalized.length < 100) continue;
    const key = `${field.replace(/\[\d+\]/g, "[]")}\0${normalized}`;
    const group = repeatedGroups.get(key) || [];
    group.push({ topic, field, value });
    repeatedGroups.set(key, group);
  }
}

for (const group of repeatedGroups.values()) {
  const distinctIds = new Set(group.map(({ topic }) => topic.id));
  const distinctModules = new Set(group.map(({ topic }) => topic.moduleId));
  if (distinctIds.size < 3 || distinctModules.size < 3) continue;
  for (const { topic, field, value } of group) {
    findings.push({
      track: trackByModule.get(topic.moduleId) || "UNKNOWN",
      id: topic.id,
      title: topic.title,
      field,
      reason: `substantive text repeated across ${distinctIds.size} unrelated topic IDs`,
      excerpt: excerpt(value)
    });
  }
}

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

console.log(`Generic-content audit self-test passed.`);
console.log(`Generic-content audit passed for ${allTopics.length} assembled topics.`);
