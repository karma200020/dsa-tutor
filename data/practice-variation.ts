// Structured practice entry: a *variation* of a topic's core problem, with the
// insight needed to attack it and a short snippet of the key code.
//
// `Topic.practiceProblems` accepts either one of these objects or a plain
// string. The string form is the legacy shape still used by the AI, OS and CPP
// tracks and it renders exactly as it always has.
export interface PracticeVariation {
  variation: string; // e.g. "Two Sum II — input array is sorted"
  tip: string; // 2-4 sentences: how this differs and how to attack it
  snippet: string; // 5-15 lines of real, correct code
  language?: string; // default "cpp"
}

export type PracticeEntry = string | PracticeVariation;

export function isPracticeVariation(entry: PracticeEntry): entry is PracticeVariation {
  return typeof entry === "object" && entry !== null && "variation" in entry;
}
