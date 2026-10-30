import type { Topic } from "./syllabus";
import { canonicalTopicId } from "./topic-migrations";

// Keep every authored section/example/variation, including alternate solutions.
export function consolidateTopics(topics: Topic[]): Topic[] {
  const result: Topic[] = [];
  for (const topic of topics) {
    if (canonicalTopicId(topic.id) !== topic.id) continue;
    const retired = topics.filter((entry) => entry.id !== topic.id && canonicalTopicId(entry.id) === topic.id);
    const merged = { ...topic };
    for (const source of retired) {
      merged.lesson = [
        ...(merged.lesson ?? []),
        { title: `Consolidated notes from ${source.id}`, content: `${source.intuition}${source.complexity ? `\nOriginal bounds: ${source.complexity.time} time; ${source.complexity.space} space.` : ""}` },
        ...(source.lesson ?? []),
        ...(source.methodology || source.cppCode ? [{ title: "Alternate approach", content: source.methodology ?? source.intuition, codeExample: source.cppCode }] : [])
      ];
      merged.examples = [
        ...(merged.examples ?? []), ...(source.examples ?? []),
        ...(source.workedExample ? [{ title: "Alternate trace", input: source.title, output: "See trace", explanation: source.workedExample }] : [])
      ];
      for (const field of ["tips", "tricks", "memoryAids", "interviewPatterns"] as const) {
        merged[field] = [...new Set([...(merged[field] ?? []), ...(source[field] ?? [])])];
      }
      merged.practiceProblems = [...(merged.practiceProblems ?? []), ...(source.practiceProblems ?? [])];
      merged.faq = [...(merged.faq ?? []), ...(source.faq ?? [])];
      merged.references = [...(merged.references ?? []), ...(source.references ?? [])];
    }
    result.push(merged);
  }
  return result;
}
