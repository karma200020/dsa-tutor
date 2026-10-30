import { Topic, Reference } from "@/data/syllabus";
import { isPracticeVariation } from "@/data/practice-variation";
import styles from "./topic-viewer.module.css";

type TopicViewerProps = {
  topic: Topic;
  masteryMap: Record<string, "not-started" | "learning" | "practiced" | "interview-ready">;
  onMasteryChange: (status: "not-started" | "learning" | "practiced" | "interview-ready") => void;
  onBackClick: () => void;
};

export function TopicViewer({ topic, masteryMap, onMasteryChange, onBackClick }: TopicViewerProps) {
  const currentStatus = masteryMap[topic.id] || "not-started";

  // AI topics repurpose the `complexity` pair as a latency/cost profile rather than
  // Big-O, so the labels are derived from the module prefix instead of hardcoded.
  const isAiTopic = topic.moduleId.startsWith("mod-ai-");
  const complexityLabels = isAiTopic
    ? { nav: "Latency & Cost", heading: "⚡ Latency & Cost Profile", first: "Latency:", second: "Memory & Storage:" }
    : { nav: "Complexity", heading: "⏱️ Complexity Analysis", first: "Time:", second: "Space:" };

  const statusEmoji: Record<string, string> = {
    "not-started": "⭕",
    learning: "🟡",
    practiced: "🟢",
    "interview-ready": "✅"
  };

  return (
    <div className={styles.container}>
      <button type="button" className={styles.backBtn} onClick={onBackClick}>
        ← Back to Modules
      </button>

      <header className={styles.header}>
        <div>
          <h1>{topic.title}</h1>
          {topic.optional && <p>Optional specialist learning; not required for ordinary interview readiness.</p>}
          <p className={styles.meta}>Module: {topic.moduleId}</p>
        </div>
        <div className={styles.statusControl}>
          <div className={styles.statusDisplay}>
            <span className={styles.emoji}>{statusEmoji[currentStatus]}</span>
            <span className={styles.label}>
              {currentStatus === "not-started" && "Not Started"}
              {currentStatus === "learning" && "Learning"}
              {currentStatus === "practiced" && "Practiced"}
              {currentStatus === "interview-ready" && "Interview Ready"}
            </span>
          </div>
          <select
            value={currentStatus}
            aria-label="Update mastery status"
            onChange={(e) =>
              onMasteryChange(e.target.value as "not-started" | "learning" | "practiced" | "interview-ready")
            }
            className={styles.statusSelect}
          >
            <option value="not-started">Mark: Not Started</option>
            <option value="learning">Mark: Learning</option>
            <option value="practiced">Mark: Practiced</option>
            <option value="interview-ready">Mark: Interview Ready</option>
          </select>
        </div>
      </header>

      <nav className={styles.toc} aria-label="Topic sections">
        <a href="#intuition">Intuition</a>
        {topic.lesson && topic.lesson.length > 0 && <a href="#lesson">Lesson</a>}
        {topic.examples && topic.examples.length > 0 && <a href="#examples">Examples</a>}
        <a href="#tips">Tips</a>
        <a href="#tricks">Tricks</a>
        {topic.complexity && <a href="#complexity">{complexityLabels.nav}</a>}
        <a href="#patterns">Patterns</a>
        {topic.faq && topic.faq.length > 0 && <a href="#faq">FAQ</a>}
        <a href="#practice">Practice</a>
      </nav>

      <section id="intuition" className={styles.intuition}>
        <h2>💡 Intuition</h2>
        <p>{topic.intuition}</p>
      </section>

      {/* New: Full Lesson Content */}
      {topic.lesson && topic.lesson.length > 0 && (
        <section id="lesson" className={styles.section}>
          <h2>📚 Lesson</h2>
          <div className={styles.lessonContent}>
            {topic.lesson.map((section, idx) => (
              <div key={idx} className={styles.lessonSection}>
                <h3>{section.title}</h3>
                <p>{section.content}</p>
                {section.codeExample && (
                  <pre className={styles.codeBlock}>
                    <code>{section.codeExample}</code>
                  </pre>
                )}
                {section.diagram && (
                  <div className={styles.diagram}>
                    {/* Render SVG or image */}
                    <div dangerouslySetInnerHTML={{ __html: section.diagram }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* New: Detailed Examples */}
      {topic.examples && topic.examples.length > 0 && (
        <section id="examples" className={styles.section}>
          <h2>🎯 Detailed Examples</h2>
          <div className={styles.examplesContent}>
            {topic.examples.map((example, idx) => (
              <div key={idx} className={styles.exampleBox}>
                <h3>{example.title}</h3>
                <div className={styles.exampleRow}>
                  <div>
                    <strong>Input:</strong>
                    <pre className={styles.codeBlock}>{example.input}</pre>
                  </div>
                  <div>
                    <strong>Output:</strong>
                    <pre className={styles.codeBlock}>{example.output}</pre>
                  </div>
                </div>
                <div>
                  <strong>Step-by-Step Explanation:</strong>
                  <div className={styles.explanation}>
                    {example.explanation
                      .split(/\n+|(?=Step \d+:)/)
                      .map((line) => line.trim())
                      .filter(Boolean)
                      .map((line, i) => (
                        <div key={i}>{line}</div>
                      ))}
                  </div>
                </div>
                {example.diagram && (
                  <div className={styles.diagram}>
                    <div dangerouslySetInnerHTML={{ __html: example.diagram }} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      <section id="tips" className={styles.section}>
        <h2>✅ Tips (What to Do)</h2>
        {(!topic.tips || topic.tips.length === 0) ? (
          <p className={styles.emptyState}>No tips yet.</p>
        ) : (
          <ul className={styles.list}>
            {topic.tips.map((tip, i) => (
              <li key={i}>{tip}</li>
            ))}
          </ul>
        )}
      </section>

      <section id="tricks" className={styles.section}>
        <h2>🎯 Tricks (Interview Edge)</h2>
        {(!topic.tricks || topic.tricks.length === 0) ? (
          <p className={styles.emptyState}>No tricks yet.</p>
        ) : (
          <ul className={styles.list}>
            {topic.tricks.map((trick, i) => (
              <li key={i}>{trick}</li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.section}>
        <h2>🧠 How to Remember</h2>
        {(!topic.memoryAids || topic.memoryAids.length === 0) ? (
          <p className={styles.emptyState}>No memory aids yet.</p>
        ) : (
          <ul className={styles.list}>
            {topic.memoryAids.map((aid, i) => (
              <li key={i}>{aid}</li>
            ))}
          </ul>
        )}
      </section>

      {topic.methodology && (
        <section className={styles.section}>
          <h2>📖 Methodology (Step-by-Step Approach)</h2>
          <div className={styles.codeBlock}>
            {topic.methodology.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </section>
      )}

      {topic.complexity && (
        <section id="complexity" className={styles.section}>
          <h2>{complexityLabels.heading}</h2>
          <div className={styles.complexityBox}>
            <div className={styles.complexityItem}>
              <strong>{complexityLabels.first}</strong> {topic.complexity.time}
            </div>
            <div className={styles.complexityItem}>
              <strong>{complexityLabels.second}</strong> {topic.complexity.space}
            </div>
          </div>
        </section>
      )}

      {topic.cppCode && (
        <section className={styles.section}>
          <h2>💻 C++ Implementation</h2>
          <pre className={styles.codeBlock}>
            <code>{topic.cppCode}</code>
          </pre>
        </section>
      )}

      {topic.workedExample && (
        <section className={styles.section}>
          <h2>📝 Worked Example (Step-by-Step Trace)</h2>
          <div className={styles.codeBlock}>
            {topic.workedExample.split('\n').map((line, i) => (
              <div key={i}>{line}</div>
            ))}
          </div>
        </section>
      )}

      <section id="patterns" className={styles.section}>
        <h2>🎬 Interview Patterns (How Interviewers Ask)</h2>
        {(!topic.interviewPatterns || topic.interviewPatterns.length === 0) ? (
          <p className={styles.emptyState}>No interview patterns yet.</p>
        ) : (
          <ul className={styles.list}>
            {topic.interviewPatterns.map((pattern, i) => (
              <li key={i}>{pattern}</li>
            ))}
          </ul>
        )}
      </section>

      <section className={styles.references}>
        <h2>📚 Reference Cues (From Real Prep Sources)</h2>
        {!topic.references || topic.references.length === 0 ? (
          <p className={styles.emptyState}>No references yet.</p>
        ) : (
          <div className={styles.referenceList}>
            {topic.references.filter(ref => ref).map((ref, i) => (
              <ReferenceCard key={i} ref={ref} />
            ))}
          </div>
        )}
      </section>

      {topic.faq && topic.faq.length > 0 && (
        <section id="faq" className={styles.section}>
          <h2>❓ Frequently Asked Questions</h2>
          <div className={styles.faqList}>
            {topic.faq.map((item, i) => (
              <details key={i} className={styles.faqItem}>
                <summary className={styles.faqQuestion}>
                  <span>
                    {item.category && <span className={styles.faqCategory}>{item.category}</span>}
                    {item.question}
                  </span>
                  <span className={styles.faqIcon} aria-hidden="true">+</span>
                </summary>
                <div className={styles.faqAnswer}>
                  {item.answer}
                  {(item.source || (item.sourceLinks && item.sourceLinks.length > 0)) && (
                    <div className={styles.faqSource}>
                      {item.source && <span>Source: {item.source}</span>}
                      {item.sourceLinks && item.sourceLinks.length > 0 && (
                        <span className={styles.faqSourceLinks}>
                          {item.sourceLinks.map((link, li) => (
                            <a key={li} href={link.url} target="_blank" rel="noopener noreferrer">
                              {link.label}
                            </a>
                          ))}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </details>
            ))}
          </div>
        </section>
      )}

      <section id="practice" className={styles.practice}>
        <h2>🚀 Practice Problems</h2>
        {(!topic.practiceProblems || topic.practiceProblems.length === 0) ? (
          <p className={styles.emptyState}>No practice problems linked yet. Coming soon!</p>
        ) : (
          <ul className={styles.list}>
            {topic.practiceProblems.map((entry, i) =>
              isPracticeVariation(entry) ? (
                <li key={i} className={styles.practiceVariation}>
                  <strong className={styles.practiceVariationTitle}>{entry.variation}</strong>
                  <p className={styles.practiceVariationTip}>{entry.tip}</p>
                  <pre className={styles.codeBlock}>
                    <code>{entry.snippet}</code>
                  </pre>
                </li>
              ) : (
                <li key={i}>{entry}</li>
              )
            )}
          </ul>
        )}
      </section>

      <section className={styles.actions}>
        <button
          className={styles.btn}
          onClick={() => {
            if (currentStatus !== "learning") onMasteryChange("learning");
          }}
        >
          📝 Start Learning
        </button>
        <button
          className={styles.btn}
          onClick={() => {
            if (currentStatus !== "practiced") onMasteryChange("practiced");
          }}
        >
          ✅ Mark as Practiced
        </button>
        <button
          className={styles.btn}
          onClick={() => {
            if (currentStatus !== "interview-ready") onMasteryChange("interview-ready");
          }}
        >
          🎯 Interview Ready
        </button>
      </section>

      <button type="button" className={styles.footer} onClick={onBackClick}>
        ← Back to Modules
      </button>
    </div>
  );
}

function ReferenceCard({ ref }: { ref: Reference }) {
  if (!ref) return null;
  
  const sourceEmoji: Record<Reference["source"], string> = {
    "interview-experience": "🗣️",
    blog: "📰",
    book: "📖",
    note: "📄",
    leetcode: "💻",
    paper: "🔬",
    video: "🎥"
  };

  return (
    <div className={styles.refCard}>
      <div className={styles.refHeader}>
        <span className={styles.refSource}>{sourceEmoji[ref.source]}</span>
        <div>
          <h4 className={styles.refAttribution}>{ref.attribution}</h4>
          <span className={styles.refType}>{ref.source}</span>
        </div>
      </div>
      <p className={styles.refInsight}>{ref.insight}</p>
    </div>
  );
}
