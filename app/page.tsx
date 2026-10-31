import { Suspense } from "react";
import styles from "./page.module.css";
import { HomeView } from "./home-view";
import { allDsaTopics } from "@/data/topics/dsa";
import { allLldTopics } from "@/data/topics/lld";
import { allHldTopics } from "@/data/topics/hld";
import { allAiTopics } from "@/data/topics/ai";
import { allOsTopics } from "@/data/topics/os";
import { allCppTopics } from "@/data/topics/cpp";
import { allCnTopics } from "@/data/topics/cn";

// Server component. The topic datasets are read here, at build time, only to
// derive counts, so none of that content is bundled into the client JS for `/`.
// The interactive view (app/home-view.tsx) loads a single track's dataset as an
// async chunk when the user actually opens that track.
//
// Only integers cross the server -> client boundary below. Passing a topic
// object or array to HomeView would serialize that dataset into the page's RSC
// payload and undo the per-track code splitting, so this map must stay numeric.
const topicCountsByTrack = {
  DSA: allDsaTopics.length,
  LLD: allLldTopics.length,
  HLD: allHldTopics.length,
  AI: allAiTopics.length,
  OS: allOsTopics.length,
  CPP: allCppTopics.length,
  CN: allCnTopics.length
};

const totalTopics = Object.values(topicCountsByTrack).reduce((sum, count) => sum + count, 0);

export default function HomePage() {
  return (
    <Suspense fallback={<div className={styles.loadingState} role="status">Loading…</div>}>
      <HomeView topicCountsByTrack={topicCountsByTrack} totalTopics={totalTopics} optionalTopicCount={[allDsaTopics, allLldTopics, allHldTopics, allAiTopics, allOsTopics, allCppTopics, allCnTopics].reduce((count, topics) => count + topics.filter((t) => t.optional).length, 0)} />
    </Suspense>
  );
}
