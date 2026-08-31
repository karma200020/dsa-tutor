// LLD track dataset. Loaded on its own (lazily, from the client) so the other
// tracks' topic content never ships with it.
import { syllabus } from "../syllabus";
import { lldTopics } from "../lld-topics";
import { coverageTopics } from "../expanded-coverage";
import { collect, ensureModuleCoverage } from "./enrich";
import { lldEnricher } from "./lld-enrich";

export const allLldTopics = ensureModuleCoverage(
  collect(
    { LLD: lldEnricher },
    lldTopics,
    coverageTopics.filter((t) => t.moduleId.startsWith("mod-lld"))
  ),
  syllabus.filter((m) => m.track === "LLD").map((m) => m.id)
);
