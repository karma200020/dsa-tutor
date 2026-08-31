// C++ track dataset. Modelled on data/topics/ai.ts: the track is its own lazily
// loaded module so that opening C++ is the only thing that pulls this content
// over the wire (see the `trackLoaders` map in app/home-view.tsx).
//
// The per-module files under data/cpp/ are concatenated here in syllabus
// dependency order. `cppTopics` is the authored source (used by the content
// audits so an empty field is reported against the file it belongs to) and
// `allCppTopics` is the enriched, de-duplicated dataset the app renders. As
// each remaining C++ module file lands, import it below and spread it into
// `cppTopics` in dependency order.
//
// This module must only ever import its own dataset plus the shared enrichment
// helpers. Importing another track here would drag that track's content into
// this async chunk and defeat the per-track code splitting.
import { Topic } from "../syllabus";
import { syllabus } from "../syllabus";
import { collect, ensureModuleCoverage } from "./enrich";
import { cppFundamentalsTopics } from "../cpp/fundamentals-and-memory-model";

export const cppTopics: Topic[] = [...cppFundamentalsTopics];

export const allCppTopics = ensureModuleCoverage(
  collect({}, cppTopics),
  syllabus.filter((m) => m.track === "CPP").map((m) => m.id)
);
