"use client";

import { useEffect } from "react";
import styles from "./status-page.module.css";

// Route-level error boundary (required by the Next.js App Router). Without
// this file, any render error thrown by a page/layout below the root layout
// has no boundary to catch it, and the dev overlay surfaces the generic
// "missing required error components, refreshing..." message instead of a
// usable recovery screen.
export default function Error({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dashboardHref = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/`;

  useEffect(() => {
    // Surface the real error in the console so the underlying cause is
    // diagnosable instead of only showing a generic recovery screen.
    console.error("Route error boundary caught:", error);
  }, [error]);

  return (
    <div className={styles.wrap}>
      <div className={styles.card} role="alert" aria-live="assertive">
        <span className={styles.badge}>Something went wrong</span>
        <h1 className={styles.title}>We hit a snag loading this page</h1>
        <p className={styles.message}>
          An unexpected error interrupted this view. Your progress in other tabs is safe — try
          again, or head back to the dashboard to keep studying.
        </p>
        {error?.message ? (
          <pre className={styles.details}>{error.message}</pre>
        ) : null}
        <div className={styles.actions}>
          <button type="button" className={`${styles.button} ${styles.buttonPrimary}`} onClick={() => reset()}>
            Try again
          </button>
          <button
            type="button"
            className={`${styles.button} ${styles.buttonSecondary}`}
            onClick={() => {
              window.location.href = dashboardHref;
            }}
          >
            Back to dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
