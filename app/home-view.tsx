"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { syllabus, durationByTrack } from "@/data/syllabus";
import type { Topic } from "@/data/syllabus";
import styles from "./page.module.css";
import { ModuleList } from "@/components/module-list";
import { MasteryTracker } from "@/components/mastery-tracker";
import { TopicViewer } from "@/components/topic-viewer";

const VALID_TRACKS = ["DSA", "LLD", "HLD", "AI", "OS", "CPP"] as const;
type TrackParam = (typeof VALID_TRACKS)[number];

function isValidTrack(value: string | null): value is TrackParam {
  return value !== null && (VALID_TRACKS as readonly string[]).includes(value);
}

// Derived so copy stays correct when a track is added; nothing on this page
// should hardcode the number of tracks.
const trackCount = new Set(syllabus.map((m) => m.track)).size;

// Each track's dataset is a separate async chunk. The home page needs no topic
// content at all (its counts arrive as props from the server component), so the
// only thing that pulls a dataset over the wire is opening that track.
//
// Every entry here must stay a dynamic `import()`. A single static top-level
// import of a track dataset in this file (or in anything this file imports)
// would pull that content into the page chunk and collapse the whole
// optimisation, so add new tracks here and nowhere else.
const trackLoaders: Record<TrackParam, () => Promise<Topic[]>> = {
  DSA: () => import("@/data/topics/dsa").then((m) => m.allDsaTopics),
  LLD: () => import("@/data/topics/lld").then((m) => m.allLldTopics),
  HLD: () => import("@/data/topics/hld").then((m) => m.allHldTopics),
  AI: () => import("@/data/topics/ai").then((m) => m.allAiTopics),
  OS: () => import("@/data/topics/os").then((m) => m.allOsTopics),
  CPP: () => import("@/data/topics/cpp").then((m) => m.allCppTopics)
};

// Fallback key for a `?topic=` deep link whose topic isn't in the track named in
// the URL (or that has no valid `?track=` at all). Loading every track keeps
// such links resolving exactly as they did when the page imported all topics,
// and the track order matches the old `allTopics` order so a duplicated topic id
// still resolves to the same entry.
const ALL_TRACKS = "__all__";

const topicCache = new Map<string, Topic[]>();

function loadTopics(key: string): Promise<Topic[]> {
  if (key === ALL_TRACKS) {
    return Promise.all(VALID_TRACKS.map((track) => trackLoaders[track]())).then((lists) =>
      lists.flat()
    );
  }
  return trackLoaders[key as TrackParam]();
}

type HomeViewProps = {
  topicCountsByTrack: Record<TrackParam, number>;
  totalTopics: number;
};

// The whole app's navigation (home -> track -> topic) is URL-driven via
// `?track=` and `?topic=` query params instead of local-only React state, so
// that opening a track/module/topic creates a browser history entry, and
// Back/Forward move between those views (and deep links / refresh resolve
// correctly). Mastery progress stays in local component state since it is
// session/interaction state, not a navigable "view".
export function HomeView({ topicCountsByTrack, totalTopics }: HomeViewProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [masteryMap, setMasteryMap] = useState<Record<string, "not-started" | "learning" | "practiced" | "interview-ready">>({});

  const trackParam = searchParams.get("track");
  const topicParam = searchParams.get("topic");
  const selectedTrack = isValidTrack(trackParam) ? trackParam : null;

  // Bumped when a dataset finishes loading, so the cache read below re-runs.
  const [loadedVersion, setLoadedVersion] = useState(0);
  const [escalatedTopic, setEscalatedTopic] = useState<string | null>(null);
  const escalated = escalatedTopic !== null && escalatedTopic === topicParam;

  const dataKey = topicParam
    ? escalated || !selectedTrack
      ? ALL_TRACKS
      : selectedTrack
    : selectedTrack;

  // Reading the cache during render (rather than mirroring it into state) keeps
  // an already-loaded track instant on Back/Forward, with no loading flash.
  const topics = dataKey ? topicCache.get(dataKey) ?? null : null;

  useEffect(() => {
    if (!dataKey || topicCache.has(dataKey)) return;
    let cancelled = false;
    loadTopics(dataKey).then((list) => {
      topicCache.set(dataKey, list);
      if (!cancelled) setLoadedVersion((v) => v + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [dataKey]);

  // A topic id that isn't in the track named in the URL still has to resolve, so
  // widen the lookup to every track before declaring it missing.
  useEffect(() => {
    if (!topicParam || escalated || !selectedTrack) return;
    const list = topicCache.get(selectedTrack);
    if (list && !list.some((t) => t.id === topicParam)) {
      setEscalatedTopic(topicParam);
    }
  }, [topicParam, selectedTrack, escalated, loadedVersion]);

  const selectedTopic = useMemo(
    () => (topicParam && topics ? topics.find((t) => t.id === topicParam) || null : null),
    [topicParam, topics]
  );
  // A topic id was supplied but doesn't match any known topic (bad/stale deep link).
  const topicNotFound =
    Boolean(topicParam) && dataKey === ALL_TRACKS && topics !== null && !selectedTopic;

  const updateMastery = (topicId: string, status: "not-started" | "learning" | "practiced" | "interview-ready") => {
    setMasteryMap((prev) => ({ ...prev, [topicId]: status }));
  };

  const goToTrack = useCallback(
    (track: TrackParam) => {
      router.push(`/?track=${track}`);
    },
    [router]
  );

  const goToTopic = useCallback(
    (topic: { id: string; moduleId: string }) => {
      const topicModule = syllabus.find((m) => m.id === topic.moduleId);
      const track = topicModule?.track || selectedTrack || "DSA";
      router.push(`/?track=${track}&topic=${encodeURIComponent(topic.id)}`);
    },
    [router, selectedTrack]
  );

  const goToHome = useCallback(() => {
    router.push("/");
  }, [router]);

  const goBackToTrack = useCallback(() => {
    const topicModule = selectedTopic ? syllabus.find((m) => m.id === selectedTopic.moduleId) : null;
    const track = topicModule?.track || selectedTrack;
    if (track) {
      router.push(`/?track=${track}`);
    } else {
      router.push("/");
    }
  }, [router, selectedTopic, selectedTrack]);

  const totalHours = syllabus.reduce((sum, m) => sum + m.estimatedHours, 0);

  // Either the dataset is still in flight, or a `?topic=` id wasn't in the
  // track named in the URL and the wider lookup hasn't resolved yet. Both are
  // "still loading" rather than "nothing here".
  const resolvingTopic = Boolean(topicParam) && !selectedTopic && !topicNotFound;
  if ((dataKey && !topics) || resolvingTopic) {
    return (
      <div className={styles.loadingState} role="status">
        Loading…
      </div>
    );
  }

  // Deep link points at a topic id that no longer exists / never existed.
  if (topicNotFound) {
    return (
      <div className={styles.notFoundState} role="alert">
        <h1>Topic not found</h1>
        <p>The topic you&apos;re looking for doesn&apos;t exist or may have moved.</p>
        <button type="button" className={styles.backButton} onClick={goToHome}>
          ← Back to Home
        </button>
      </div>
    );
  }

  // If viewing a topic, show the viewer
  if (selectedTopic) {
    return (
      <TopicViewer
        topic={selectedTopic}
        masteryMap={masteryMap}
        onMasteryChange={(status) => updateMastery(selectedTopic.id, status)}
        onBackClick={goBackToTrack}
      />
    );
  }

  // If viewing a track, show modules and topics
  if (selectedTrack && topics) {
    return (
      <div className={styles.trackView}>
        <button 
          type="button"
          className={styles.backButton}
          onClick={goToHome}
        >
          ← Back to Home
        </button>
        <ModuleList
          track={selectedTrack}
          masteryMap={masteryMap}
          onMasteryUpdate={updateMastery}
          onTopicClick={goToTopic}
          allTopics={topics}
        />
      </div>
    );
  }

  // Home page
  return (
    <main className={styles.page}>
      <section className={styles.hero}>
        <span className={styles.heroEyebrow}>Interview prep, structured</span>
        <h1>🚀 FAANG Interview Mastery</h1>
        <p>
          Complete preparation for coding, low-level design, system design, and AI engineering
          interviews. Learn from industry patterns, master complex concepts with interactive
          examples, and ace your next interview.
        </p>
        <div className={styles.ctaButtons}>
          <a href="#tracks" className={styles.ctaPrimary}>Get Started</a>
          <a href="#progress" className={styles.ctaSecondary}>View Progress</a>
        </div>
      </section>

      <section id="progress" className={styles.readinessSection}>
        <div className={styles.readinessInner}>
          <MasteryTracker masteryMap={masteryMap} totalTopics={totalTopics} />
        </div>
      </section>

      <section className={styles.tracksSection} id="tracks">
        <h2>Choose Your Learning Path</h2>
        <p className={styles.sectionSubtitle}>
          Pick a track to see its modules, topics, and mastery progress. You can switch tracks anytime.
        </p>
        <div className={styles.tracksGrid}>
          <TrackCardClickable
            emoji="💻"
            title="DSA & Coding"
            subtitle="Data Structures & Algorithms"
            description="Master 50+ coding patterns, ace LeetCode medium/hard problems"
            topics={topicCountsByTrack.DSA}
            hours={durationByTrack.DSA}
            modules={syllabus.filter(m => m.track === "DSA").length}
            onClick={() => goToTrack("DSA")}
            color="#6d5bff"
            index={0}
            featured
          />
          <TrackCardClickable
            emoji="🏗️"
            title="LLD"
            subtitle="Low-Level Design"
            description="Design scalable systems with clean OOP and design patterns"
            topics={topicCountsByTrack.LLD}
            hours={durationByTrack.LLD}
            modules={syllabus.filter(m => m.track === "LLD").length}
            onClick={() => goToTrack("LLD")}
            color="#22d3ee"
            index={1}
          />
          <TrackCardClickable
            emoji="🌍"
            title="HLD"
            subtitle="High-Level Design"
            description="Design distributed systems handling millions of users"
            topics={topicCountsByTrack.HLD}
            hours={durationByTrack.HLD}
            modules={syllabus.filter(m => m.track === "HLD").length}
            onClick={() => goToTrack("HLD")}
            color="#f6ad55"
            index={2}
          />
          <TrackCardClickable
            emoji="🤖"
            title="AI"
            subtitle="AI-First Software Engineering"
            description="Design RAG, agent, and LLM serving systems interviewers actually ask about"
            topics={topicCountsByTrack.AI}
            hours={durationByTrack.AI}
            modules={syllabus.filter(m => m.track === "AI").length}
            onClick={() => goToTrack("AI")}
            color="#34d399"
            index={3}
          />
          <TrackCardClickable
            emoji="⚙️"
            title="OS"
            subtitle="Operating Systems"
            description="Processes, scheduling, synchronization, virtual memory, file systems, and syscalls"
            topics={topicCountsByTrack.OS}
            hours={durationByTrack.OS}
            modules={syllabus.filter(m => m.track === "OS").length}
            onClick={() => goToTrack("OS")}
            color="#f472b6"
            index={4}
          />
          <TrackCardClickable
            emoji="🧩"
            title="C++"
            subtitle="Modern C++ Deep Dive"
            description="Memory model, RAII, move semantics, templates, STL internals, and concurrency"
            topics={topicCountsByTrack.CPP}
            hours={durationByTrack.CPP}
            modules={syllabus.filter(m => m.track === "CPP").length}
            onClick={() => goToTrack("CPP")}
            color="#a78bfa"
            index={5}
          />
        </div>
      </section>

      <section className={styles.features}>
        <h2>Why This Tutor?</h2>
        <div className={styles.featuresGrid}>
          <FeatureCard
            icon="📚"
            title="Comprehensive Content"
            description={`${syllabus.length} modules across ${trackCount} tracks covering FAANG interview topics with code examples and worked problems`}
            index={0}
          />
          <FeatureCard
            icon="💡"
            title="Intuitive Explanations"
            description="Complex concepts broken down step-by-step with visual examples"
            index={1}
          />
          <FeatureCard
            icon="⚡"
            title="Interview-Focused"
            description="Learn patterns interviewers actually ask about, not just theory"
            index={2}
          />
          <FeatureCard
            icon="🎯"
            title="Progress Tracking"
            description="Track your mastery level for each topic with visual progress indicator"
            index={3}
          />
          <FeatureCard
            icon="💻"
            title="Code Examples"
            description="Production-ready C++ implementations for every algorithm"
            index={4}
          />
          <FeatureCard
            icon="🔄"
            title="Spaced Repetition"
            description="Mark topics as learned, practiced, and interview-ready"
            index={5}
          />
        </div>
      </section>

      <section className={styles.googleCheatSheet}>
        <div className={styles.googleCheatSheetCopy}>
          <span className={styles.badge}>Bonus resource</span>
          <h2>🔗 Google DSA Cheat Sheet</h2>
          <p>
            Access 100+ curated DSA problems from Google interviews with C++ code templates,
            pattern analysis, common mistakes, and interview tips. Master the patterns that
            appear in 95% of FAANG coding rounds.
          </p>
          <Link href="/cheat-sheet" className={styles.googleCheatSheetCta}>
            View Cheat Sheet →
          </Link>
        </div>
        <div className={styles.googleCheatSheetIcon} aria-hidden="true">📋</div>
      </section>

      <section className={styles.stats}>
        <div className={styles.statBox}>
          <div className={styles.statNumber}>{totalTopics}</div>
          <div className={styles.statLabel}>Total Topics</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statNumber}>{totalHours}</div>
          <div className={styles.statLabel}>Hours of Content</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statNumber}>{trackCount}</div>
          <div className={styles.statLabel}>Interview Tracks</div>
        </div>
      </section>
    </main>
  );
}

function TrackCardClickable({
  emoji,
  title,
  subtitle,
  description,
  topics,
  hours,
  modules,
  onClick,
  color,
  index,
  featured
}: {
  emoji: string;
  title: string;
  subtitle: string;
  description: string;
  topics: number;
  hours: number;
  modules: number;
  onClick: () => void;
  color: string;
  index: number;
  featured?: boolean;
}) {
  return (
    <button
      className={`${styles.trackCardClickable} ${featured ? styles.trackCardFeatured : ""}`}
      onClick={onClick}
      style={{ borderLeftColor: color, animationDelay: `${index * 90}ms` }}
    >
      <div className={styles.trackCardIcon} style={{ color }}>{emoji}</div>
      <h3>{title}</h3>
      <p className={styles.trackCardSubtitle}>{subtitle}</p>
      <p className={styles.trackCardDescription}>{description}</p>
      <div className={styles.trackCardStats}>
        <span>📦 {modules} Modules</span>
        <span>📚 {topics} Topics</span>
        <span>⏱️ ~{hours}h</span>
      </div>
      <div className={styles.trackCardCTA}>Start Learning →</div>
    </button>
  );
}

function FeatureCard({
  icon,
  title,
  description,
  index
}: {
  icon: string;
  title: string;
  description: string;
  index: number;
}) {
  return (
    <div className={styles.featureCard} style={{ animationDelay: `${index * 70}ms` }}>
      <div className={styles.featureIcon}>{icon}</div>
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  );
}
