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
        const cheatsheet = buildModuleCheatsheet(mod.title, modTopics);

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

            <div className={styles.cheatsheet}>
              <div className={styles.cheatsheetHeader}>🧠 Cheat Sheet</div>
              <ul className={styles.cheatsheetList}>
                {cheatsheet.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <div className={styles.topicsList}>
              {modTopics.map((topic) => {
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
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function buildModuleCheatsheet(moduleTitle: string, topics: Topic[]): string[] {
  const normalized = moduleTitle.toLowerCase();
  const topicNames = topics.map((t) => t.title);

  if (normalized.includes("array") || normalized.includes("hash") || normalized.includes("string")) {
    return [
      "Use hash maps for frequency, duplicates, and lookups.",
      "Look for two pointers or prefix sums when the array is sorted or ordered.",
      "For string problems, think about palindrome, substring, and character frequency patterns.",
      "Default to O(n) or O(n log n) and prove the invariant before coding."
    ];
  }

  if (normalized.includes("pointer") || normalized.includes("window") || normalized.includes("stack") || normalized.includes("queue")) {
    return [
      "Ask: what state changes as you move forward?",
      "Use the stack for nested/precedence constraints and the queue for FIFO flows.",
      "For sliding windows, maintain a valid window and shrink or expand carefully.",
      "Monotonic structures are ideal when you need the next greater or smaller element."
    ];
  }

  if (normalized.includes("search") || normalized.includes("interval") || normalized.includes("list") || normalized.includes("tree") || normalized.includes("heap") || normalized.includes("graph")) {
    return [
      "Start with the brute force, then optimize around the real constraint.",
      "Binary search is for monotonic decisions; DFS/BFS is for graph/tree traversal.",
      "Use heaps for top-k and ordering problems; trees for hierarchy and recursion.",
      "Always state the time, space, and correctness reasoning before coding."
    ];
  }

  if (normalized.includes("dynamic") || normalized.includes("greedy") || normalized.includes("backtracking")) {
    return [
      "Define state clearly: what is the subproblem and what does it depend on?",
      "For DP, decide the recurrence, base case, and order of computation.",
      "Greedy is only safe if you can argue the local choice is globally optimal.",
      "Backtracking is for decisions with pruning and feasibility checks."
    ];
  }

  if (normalized.includes("lld") || normalized.includes("design pattern") || normalized.includes("oop") || normalized.includes("object")) {
    return [
      "Identify responsibilities before picking classes and interfaces.",
      "Prefer composition and abstraction over deep inheritance.",
      "Use the right pattern for the extensibility need: factory, singleton, observer, strategy.",
      "In interviews, defend your design with trade-offs and failure handling."
    ];
  }

  if (normalized.includes("hld") || normalized.includes("system") || normalized.includes("design") || normalized.includes("estimation")) {
    return [
      "Clarify requirements, traffic, and read/write ratios before drawing a diagram.",
      "Identify bottlenecks: cache, DB, queue, network, or replication lag.",
      "Use latency, consistency, reliability, and cost as your core trade-off axes.",
      "Every component should have a reason: scale, resilience, or correctness."
    ];
  }

  const topTopics = topicNames.slice(0, 4);
  return [
    `Remember the key patterns in ${moduleTitle}: ${topTopics.join(", ")}.`,
    "Explain the intuition in plain English before discussing complexity.",
    "Practice edge cases and failure modes until the reasoning is automatic.",
    "In interviews, clarity beats cleverness."
  ];
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
        aria-label={`Update mastery status for ${topic.title}`}
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
