import type { MasteryStatus } from "./syllabus";

export const topicAliases: Record<string, string> = {
  "topic-stack-valid-parentheses": "topic-strings-valid-parentheses",
  "topic-monotonic-stack": "topic-monotonic-stack-mastery"
};

export function canonicalTopicId(id: string): string {
  return Object.prototype.hasOwnProperty.call(topicAliases, id) ? topicAliases[id] : id;
}

const statuses: MasteryStatus[] = ["not-started", "learning", "practiced", "interview-ready"];
function isMasteryStatus(value: unknown): value is MasteryStatus {
  return statuses.some((status) => status === value);
}

export function migrateMastery(value: unknown): Record<string, MasteryStatus> {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Saved mastery must be an object.");
  }
  const result = new Map<string, MasteryStatus>();
  for (const [id, status] of Object.entries(value)) {
    if (!isMasteryStatus(status)) {
      throw new Error(`Invalid saved mastery status for ${id}.`);
    }
    const canonical = canonicalTopicId(id);
    const previous = result.get(canonical) ?? "not-started";
    result.set(canonical, statuses[Math.max(statuses.indexOf(previous), statuses.indexOf(status))]);
  }
  return Object.fromEntries(result);
}
