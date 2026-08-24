"use client";

import { useEffect } from "react";
import styles from "./status-page.module.css";

// Global error boundary (required by the Next.js App Router) for errors
// thrown by the root layout itself, which app/error.tsx cannot catch. This
// file must render its own <html>/<body> since it replaces the root layout
// entirely when active.
export default function GlobalError({
  error,
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const dashboardHref = `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/`;

  useEffect(() => {
    console.error("Global error boundary caught:", error);
  }, [error]);

  return (
    <html lang="en">
      <body>
        <div className={styles.wrap}>
          <div className={styles.card} role="alert" aria-live="assertive">
            <span className={styles.badge}>Application error</span>
            <h1 className={styles.title}>The app failed to load</h1>
            <p className={styles.message}>
              A critical error prevented the interface from starting. Reloading usually resolves
              transient issues; if this keeps happening, please report the details below.
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
                Reload dashboard
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
