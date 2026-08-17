import { Lesson } from "@/data/lessons";
import styles from "./lesson-card.module.css";

type LessonCardProps = {
  lesson: Lesson;
};

export function LessonCard({ lesson }: LessonCardProps) {
  return (
    <article className={styles.card}>
      <header className={styles.header}>
        <span className={styles.track}>{lesson.track}</span>
        <span className={styles.level}>{lesson.level}</span>
      </header>
      <h3>{lesson.title}</h3>
      <p className={styles.intuition}>{lesson.intuition}</p>
      <Section title="Tips" items={lesson.tips} />
      <Section title="Tricks" items={lesson.tricks} />
      <Section title="How to remember" items={lesson.memoryAids} />
      <Section title="Interview patterns" items={lesson.interviewPatterns} />
      <Section title="Reference cues" items={lesson.references} />
    </article>
  );
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <section className={styles.section}>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </section>
  );
}
