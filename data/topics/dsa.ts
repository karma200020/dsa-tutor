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
import { consolidateTopics } from "../consolidate-topics";
import { curriculumTopics } from "../dsa-curriculum";

const dsaModuleIds = new Set(syllabus.filter((m) => m.track === "DSA").map((m) => m.id));

export const allDsaTopics = consolidateTopics(ensureModuleCoverage(
  [...collect(
    {},
    dsaTopics,
    comprehensiveDsaTopics,
    dsaTopicsExtended,
    expandedDsaTopics,
    arrayFoundationTopics,
    coverageTopics.filter((t) => dsaModuleIds.has(t.moduleId))
  ), ...curriculumTopics],
  syllabus.filter((m) => m.track === "DSA").map((m) => m.id)
));
