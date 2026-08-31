// Operating Systems track dataset. Modelled on data/topics/ai.ts: the track is
// its own lazily loaded module so that opening OS is the only thing that pulls
// this content over the wire (see the `trackLoaders` map in app/home-view.tsx).
//
// Unlike the AI track there is no separate top-level aggregator file: the eight
// per-module files under data/os/ are concatenated here in syllabus dependency
// order. `osTopics` is the authored source (used by the content audits so an
// empty field is reported against the file it belongs to) and `allOsTopics` is
// the enriched, de-duplicated dataset the app renders.
//
// This module must only ever import its own dataset plus the shared enrichment
// helpers. Importing another track here would drag that track's content into
// this async chunk and defeat the per-track code splitting.
import { Topic } from "../syllabus";
import { syllabus } from "../syllabus";
import { collect, ensureModuleCoverage } from "./enrich";
import { osProcessesAndThreadsTopics } from "../os/processes-and-threads";
import { osCpuSchedulingTopics } from "../os/cpu-scheduling";
import { osSynchronizationTopics } from "../os/synchronization";
import { osDeadlocksTopics } from "../os/deadlocks";
import { osMemoryManagementTopics } from "../os/memory-management";
import { osVirtualMemoryTopics } from "../os/virtual-memory-and-paging";
import { osFileSystemsTopics } from "../os/file-systems-and-storage";
import { osIoAndSystemCallsTopics } from "../os/io-and-system-calls";

export const osTopics: Topic[] = [
  ...osProcessesAndThreadsTopics,
  ...osCpuSchedulingTopics,
  ...osSynchronizationTopics,
  ...osDeadlocksTopics,
  ...osMemoryManagementTopics,
  ...osVirtualMemoryTopics,
  ...osFileSystemsTopics,
  ...osIoAndSystemCallsTopics
];

export const allOsTopics = ensureModuleCoverage(
  collect({}, osTopics),
  syllabus.filter((m) => m.track === "OS").map((m) => m.id)
);
