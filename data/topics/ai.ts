// AI track dataset. This is the fastest-growing track, so keeping it in its own
// lazily loaded module is what stops it from inflating the home page bundle.
import { syllabus } from "../syllabus";
import { aiTopics } from "../ai-topics";
import { collect, ensureModuleCoverage } from "./enrich";

export const allAiTopics = ensureModuleCoverage(
  collect({}, aiTopics),
  syllabus.filter((m) => m.track === "AI").map((m) => m.id)
);
