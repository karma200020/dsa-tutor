import styles from "./mastery-tracker.module.css";

type MasteryTrackerProps = {
  masteryMap: Record<string, "not-started" | "learning" | "practiced" | "interview-ready">;
  // Only the total is needed: every other bucket is derivable from masteryMap,
  // whose keys are always real topic ids. Taking a number instead of the topic
  // array keeps the home page from having to load any topic content.
  totalTopics: number;
  optionalTopicCount: number;
};

export function MasteryTracker({ masteryMap, totalTopics, optionalTopicCount }: MasteryTrackerProps) {
  const statuses = Object.keys(masteryMap).filter((id) => !id.startsWith("topic-specialist-")).map((id) => masteryMap[id]);
  const coreTotal = totalTopics - optionalTopicCount;
  const learning = statuses.filter((s) => s === "learning").length;
  const practiced = statuses.filter((s) => s === "practiced").length;
  const interviewReady = statuses.filter((s) => s === "interview-ready").length;
  const notStarted = coreTotal - learning - practiced - interviewReady;

  const readinessPct = coreTotal === 0 ? 0 : Math.round((interviewReady / coreTotal) * 100);
  const optionalMastered = Object.entries(masteryMap).filter(([id, status]) =>
    id.startsWith("topic-specialist-") && (status === "practiced" || status === "interview-ready")
  ).length;
  const learned = learning + practiced;

  return (
    <section className={styles.container}>
      <h2>📈 Your Interview Readiness</h2>
      <div className={styles.content}>
        <div className={styles.gauge}>
          <div className={styles.gaugeCircle}>
            <svg viewBox="0 0 200 200" className={styles.progressSvg}>
              <circle cx="100" cy="100" r="90" className={styles.progressBg} />
              <circle
                cx="100"
                cy="100"
                r="90"
                className={styles.progressFill}
                style={{
                  strokeDasharray: `${(readinessPct / 100) * 565.48}px 565.48px`
                }}
              />
            </svg>
            <div className={styles.gaugeText}>
              <p className={styles.percentage}>{readinessPct}%</p>
              <p className={styles.label}>Interview Ready</p>
            </div>
          </div>
        </div>

        <div className={styles.breakdown}>
          <h3>Progress Breakdown</h3>
          <div className={styles.statGrid}>
            <StatItem label="Not Started" count={notStarted} color="#cbd5e1" emoji="⭕" />
            <StatItem label="Learning" count={learning} color="#fbbf24" emoji="🟡" />
            <StatItem label="Practiced" count={practiced} color="#34d399" emoji="🟢" />
            <StatItem label="Interview Ready" count={interviewReady} color="#10b981" emoji="✅" />
          </div>

          <div className={styles.stats}>
            <p>
              <strong>{coreTotal}</strong> core topics; <strong>{totalTopics}</strong> total topics
            </p>
            <p>{optionalMastered}/{optionalTopicCount} optional specialist topics mastered (excluded from interview readiness)</p>
            <p>
              <strong>{interviewReady}</strong> topics at interview-ready level
            </p>
            <p>
              <strong>{learned}</strong> topics actively learned
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function StatItem({
  label,
  count,
  color,
  emoji
}: {
  label: string;
  count: number;
  color: string;
  emoji: string;
}) {
  return (
    <div className={styles.stat}>
      <div style={{ color, fontSize: "24px" }}>{emoji}</div>
      <div>
        <p className={styles.statLabel}>{label}</p>
        <p className={styles.statCount}>{count}</p>
      </div>
    </div>
  );
}
