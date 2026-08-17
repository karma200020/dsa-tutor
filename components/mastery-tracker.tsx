import { Topic } from "@/data/syllabus";
import styles from "./mastery-tracker.module.css";

type MasteryTrackerProps = {
  masteryMap: Record<string, "not-started" | "learning" | "practiced" | "interview-ready">;
  allTopics: Topic[];
};

export function MasteryTracker({ masteryMap, allTopics }: MasteryTrackerProps) {
  const totalTopics = allTopics.length;
  const notStarted = allTopics.filter((t) => !masteryMap[t.id] || masteryMap[t.id] === "not-started").length;
  const learning = allTopics.filter((t) => masteryMap[t.id] === "learning").length;
  const practiced = allTopics.filter((t) => masteryMap[t.id] === "practiced").length;
  const interviewReady = allTopics.filter((t) => masteryMap[t.id] === "interview-ready").length;

  const readinessPct = totalTopics === 0 ? 0 : Math.round((interviewReady / totalTopics) * 100);
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
              <strong>{totalTopics}</strong> total topics to master
            </p>
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
