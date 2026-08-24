"use client";

import { useState } from "react";
import { syllabus, durationByTrack } from "@/data/syllabus";
import { allTopics, allDsaTopics, allLldTopics, allHldTopics } from "@/data/all-topics";
import styles from "./page.module.css";
import { ModuleList } from "@/components/module-list";
import { MasteryTracker } from "@/components/mastery-tracker";
import { TopicViewer } from "@/components/topic-viewer";
import { Topic } from "@/data/syllabus";

export default function HomePage() {
  const [selectedTrack, setSelectedTrack] = useState<"DSA" | "LLD" | "HLD" | null>(null);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [masteryMap, setMasteryMap] = useState<Record<string, "not-started" | "learning" | "practiced" | "interview-ready">>({});

  const updateMastery = (topicId: string, status: "not-started" | "learning" | "practiced" | "interview-ready") => {
    setMasteryMap((prev) => ({ ...prev, [topicId]: status }));
  };

  const totalHours = syllabus.reduce((sum, m) => sum + m.estimatedHours, 0);

  // If viewing a topic, show the viewer
  if (selectedTopic) {
    return (
      <TopicViewer
        topic={selectedTopic}
        masteryMap={masteryMap}
        onMasteryChange={(status) => updateMastery(selectedTopic.id, status)}
        onBackClick={() => setSelectedTopic(null)}
      />
    );
  }

  // If viewing a track, show modules and topics
  if (selectedTrack) {
    return (
      <div className={styles.trackView}>
        <button 
          type="button"
          className={styles.backButton}
          onClick={() => setSelectedTrack(null)}
        >
          ← Back to Home
        </button>
        <ModuleList
          track={selectedTrack}
          masteryMap={masteryMap}
          onMasteryUpdate={updateMastery}
          onTopicClick={setSelectedTopic}
          allTopics={allTopics}
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
          Complete preparation for coding, system design, and LLD interviews. Learn from industry patterns, 
          master complex concepts with interactive examples, and ace your next interview.
        </p>
        <div className={styles.ctaButtons}>
          <a href="#tracks" className={styles.ctaPrimary}>Get Started</a>
          <a href="#progress" className={styles.ctaSecondary}>View Progress</a>
        </div>
      </section>

      <div id="progress">
        <MasteryTracker masteryMap={masteryMap} allTopics={allTopics} />
      </div>

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
            topics={allDsaTopics.length}
            hours={durationByTrack.DSA}
            modules={syllabus.filter(m => m.track === "DSA").length}
            onClick={() => setSelectedTrack("DSA")}
            color="#6d5bff"
            index={0}
            featured
          />
          <TrackCardClickable
            emoji="🏗️"
            title="LLD"
            subtitle="Low-Level Design"
            description="Design scalable systems with clean OOP and design patterns"
            topics={allLldTopics.length}
            hours={durationByTrack.LLD}
            modules={syllabus.filter(m => m.track === "LLD").length}
            onClick={() => setSelectedTrack("LLD")}
            color="#22d3ee"
            index={1}
          />
          <TrackCardClickable
            emoji="🌍"
            title="HLD"
            subtitle="High-Level Design"
            description="Design distributed systems handling millions of users"
            topics={allHldTopics.length}
            hours={durationByTrack.HLD}
            modules={syllabus.filter(m => m.track === "HLD").length}
            onClick={() => setSelectedTrack("HLD")}
            color="#f6ad55"
            index={2}
          />
        </div>
      </section>

      <section className={styles.features}>
        <h2>Why This Tutor?</h2>
        <div className={styles.featuresGrid}>
          <FeatureCard
            icon="📚"
            title="Comprehensive Content"
            description="15+ modules covering every FAANG interview topic with code examples and worked problems"
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
          <a href="/cheat-sheet" className={styles.googleCheatSheetCta}>
            View Cheat Sheet →
          </a>
        </div>
        <div className={styles.googleCheatSheetIcon} aria-hidden="true">📋</div>
      </section>

      <section className={styles.stats}>
        <div className={styles.statBox}>
          <div className={styles.statNumber}>{allTopics.length}</div>
          <div className={styles.statLabel}>Total Topics</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statNumber}>{totalHours}</div>
          <div className={styles.statLabel}>Hours of Content</div>
        </div>
        <div className={styles.statBox}>
          <div className={styles.statNumber}>3</div>
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
