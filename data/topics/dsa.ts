// DSA track dataset. Loaded on its own (lazily, from the client) so the other
// tracks' topic content never ships with it.
import { syllabus } from "../syllabus";
import { dsaTopics } from "../dsa-topics";
import { comprehensiveDsaTopics } from "../comprehensive-dsa-topics";
import { dsaTopicsExtended } from "../dsa-topics-extended";
import { expandedDsaTopics } from "../dsa-topics-expanded";
import { expandedDsaTopics as arrayFoundationTopics } from "../expanded-dsa-topics";
import { coverageTopics } from "../expanded-coverage";
import { collect, ensureModuleCoverage } from "./enrich";
import { lldEnricher } from "./lld-enrich";
import { hldEnricher } from "./hld-enrich";

// expanded-coverage.ts contributes topics for every `mod-*` module, including
// LLD/HLD ones, so those enrichers have to be available here to keep this
// dataset identical to the previous single-file aggregation.
export const allDsaTopics = ensureModuleCoverage(
  collect(
    { LLD: lldEnricher, HLD: hldEnricher },
    dsaTopics,
    comprehensiveDsaTopics,
    dsaTopicsExtended,
    expandedDsaTopics,
    arrayFoundationTopics,
    coverageTopics.filter((t) => t.moduleId.startsWith("mod-") && syllabus.some((m) => m.id === t.moduleId))
  ),
  syllabus.filter((m) => m.track === "DSA").map((m) => m.id)
);
