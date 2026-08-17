import { syllabus } from "@/data/syllabus";
import { Topic } from "@/data/syllabus";
import styles from "./module-list.module.css";

type ModuleListProps = {
  track: "DSA" | "LLD" | "HLD";
  masteryMap: Record<string, "not-started" | "learning" | "practiced" | "interview-ready">;
  onMasteryUpdate: (topicId: string, status: "not-started" | "learning" | "practiced" | "interview-ready") => void;
  onTopicClick: (topic: Topic) => void;
  allTopics: Topic[];
};

export function ModuleList({ track, masteryMap, onMasteryUpdate, onTopicClick, allTopics }: ModuleListProps) {
  const modulesForTrack = syllabus.filter((m) => m.track === track);

  const topicsForModules = allTopics.filter((t) => modulesForTrack.some((m) => m.id === t.moduleId));

  return (
    <div className={styles.container}>
      <h2>{track} Learning Modules</h2>
      {modulesForTrack.map((mod) => {
        const modTopics = topicsForModules.filter((t) => t.moduleId === mod.id);
        const completedTopics = modTopics.filter((t) => {
          const status = masteryMap[t.id];
          return status === "practiced" || status === "interview-ready";
        }).length;

        return (
          <div key={mod.id} className={styles.module}>
            <div className={styles.moduleHeader}>
              <div>
                <h3>{mod.title}</h3>
                <p className={styles.description}>{mod.description}</p>
              </div>
              <div className={styles.moduleMeta}>
                <span>{mod.level}</span>
                <span>~{mod.estimatedHours}h</span>
              </div>
            </div>

            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{
                  width: `${modTopics.length > 0 ? (completedTopics / modTopics.length) * 100 : 0}%`
                }}
              />
            </div>
            <p className={styles.progressText}>
              {completedTopics}/{modTopics.length} topics mastered
            </p>

            <div className={styles.topicsList}>
              {modTopics.length === 0 ? (
                <p className={styles.progressText}>Content for this module is coming soon.</p>
              ) : (
                modTopics.map((topic) => {
                  const status = masteryMap[topic.id] || "not-started";
                  return (
                    <TopicRow
                      key={topic.id}
                      topic={topic}
                      status={status}
                      onStatusChange={(newStatus) => onMasteryUpdate(topic.id, newStatus)}
                      onView={() => onTopicClick(topic)}
                    />
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function TopicRow({
  topic,
  status,
  onStatusChange,
  onView
}: {
  topic: Topic;
  status: "not-started" | "learning" | "practiced" | "interview-ready";
  onStatusChange: (status: "not-started" | "learning" | "practiced" | "interview-ready") => void;
  onView: () => void;
}) {
  const statusEmoji: Record<typeof status, string> = {
    "not-started": "⭕",
    learning: "🟡",
    practiced: "🟢",
    "interview-ready": "✅"
  };

  const statusColor: Record<typeof status, string> = {
    "not-started": "#cbd5e1",
    learning: "#fbbf24",
    practiced: "#34d399",
    "interview-ready": "#10b981"
  };

  return (
    <div className={styles.topicRow}>
      <button className={styles.topicBtn} onClick={onView}>
        <span className={styles.statusEmoji}>{statusEmoji[status]}</span>
        <div className={styles.topicInfo}>
          <h4>{topic.title}</h4>
          <p>{(topic.intuition ?? "").substring(0, 100)}...</p>
        </div>
        <span className={styles.viewCue}>→</span>
      </button>
      <select
        value={status}
        onChange={(e) =>
          onStatusChange(e.target.value as "not-started" | "learning" | "practiced" | "interview-ready")
        }
        className={styles.statusSelect}
        style={{ borderColor: statusColor[status] }}
        onClick={(e) => e.stopPropagation()}
      >
        <option value="not-started">Not Started</option>
        <option value="learning">Learning</option>
        <option value="practiced">Practiced</option>
        <option value="interview-ready">Interview Ready</option>
      </select>
    </div>
  );
}
