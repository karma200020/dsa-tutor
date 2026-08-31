// HLD track dataset. Loaded on its own (lazily, from the client) so the other
// tracks' topic content never ships with it.
import { syllabus } from "../syllabus";
import { hldTopics } from "../hld-topics";
import { coverageTopics } from "../expanded-coverage";
import { collect, ensureModuleCoverage } from "./enrich";
import { hldEnricher } from "./hld-enrich";

export const allHldTopics = ensureModuleCoverage(
  collect(
    { HLD: hldEnricher },
    hldTopics,
    coverageTopics.filter((t) => t.moduleId.startsWith("mod-hld"))
  ),
  syllabus.filter((m) => m.track === "HLD").map((m) => m.id)
);
