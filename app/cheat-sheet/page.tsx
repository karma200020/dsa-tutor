"use client";

import GoogleCheatSheetViewer from "@/components/GoogleCheatSheetViewer";
import styles from "./cheat-sheet.module.css";

export default function CheatSheetPage() {
  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <button type="button" className={styles.backButton} onClick={() => window.history.back()}>
          ← Back
        </button>
        <h1>🔗 Google DSA Interview Cheat Sheet</h1>
        <p>100+ curated DSA problems with C++ templates, patterns, and interview insights</p>
      </header>

      <div className={styles.content}>
        <GoogleCheatSheetViewer />
      </div>
    </div>
  );
}
