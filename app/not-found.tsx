import Link from "next/link";
import styles from "./status-page.module.css";

// Required App Router route for unmatched paths (e.g. a bad deep link or a
// stale bookmark). Without this file, Next.js falls back to a generic,
// unthemed 404 experience.
export default function NotFound() {
  return (
    <div className={styles.wrap}>
      <div className={styles.card} role="status">
        <span className={`${styles.badge} ${styles.badgeNeutral}`}>404</span>
        <h1 className={styles.title}>We couldn&apos;t find that page</h1>
        <p className={styles.message}>
          The track, module, or topic you&apos;re looking for doesn&apos;t exist or may have moved.
          Head back to the dashboard to keep working through DSA, LLD, and HLD prep.
        </p>
        <div className={styles.actions}>
          <Link href="/" className={`${styles.button} ${styles.buttonPrimary}`}>
            Back to dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
