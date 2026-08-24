import styles from "./status-page.module.css";

// Route-level loading UI (App Router convention), shown while the segment's
// data/streamed content is resolving (e.g. during navigation transitions).
export default function Loading() {
  return (
    <div className={styles.wrap}>
      <div className={styles.card} role="status" aria-live="polite">
        <div className={styles.spinner} aria-hidden="true" />
        <h1 className={styles.title}>Loading your prep…</h1>
        <p className={styles.message}>Fetching the latest track, module, and topic content.</p>
      </div>
    </div>
  );
}
