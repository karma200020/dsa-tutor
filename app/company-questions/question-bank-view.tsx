"use client";

import type { FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { googleQuestionBank as bank } from "@/data/company-questions/google";
import { defaultFilters, filterHref, formatReportDate, invalidFilters, matchingQuestions, parseFilters, reportRecency } from "@/data/company-questions/logic";
import { stageLabels, topicLabels } from "@/data/company-questions/schema";
import type { CompanyQuestion, Recency } from "@/data/company-questions/schema";
import styles from "./questions.module.css";

const reports = new Map(bank.reports.map((report) => [report.id, report]));
const recencyLabels = { recent: "Recent interview", older: "Older interview", unknown: "Unknown interview recency" };

export function QuestionBankView() {
  const router = useRouter();
  const params = useSearchParams();
  const filters = parseFilters(params);
  const invalid = invalidFilters(filters, bank);
  const questions = matchingQuestions(bank, filters);
  const categoryCount = (recency: Recency) => matchingQuestions(bank, { ...defaultFilters, recency }).length;

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const next = parseFilters({ get: (name) => {
      const value = data.get(name);
      return typeof value === "string" ? value : null;
    } });
    router.push(filterHref(next), { scroll: false });
  }

  return (
    <main className={styles.page}>
      <Link href="/">Back to learning paths</Link>
      <header className={styles.header}>
        <p className={styles.eyebrow}>Company-tagged coding questions</p>
        <h1>Reported at Google</h1>
        <p>Source-backed community interview and online-assessment accounts, not an official Google question list.
          Public reports cannot establish every question asked, its frequency, or what you will be asked.</p>
        <p>Snapshot as of <time dateTime={bank.asOf}>{bank.asOf}</time>. Sources last checked <time dateTime={bank.checkedOn}>{bank.checkedOn}</time>.
          {" "}Manual research, not a live feed.</p>
      </header>

      <aside className={styles.notice} aria-label="How interview dates work">
        <strong>Recent means a stated interview date within {bank.recentFrom} through {bank.asOf}, inclusive.</strong>
        <p>Publication dates never substitute for interview dates. A whole stated month or year must fit within this window;
          missing dates and periods crossing its boundaries have unknown recency. A recruiting-cycle year is not an interview date.</p>
        <p>{bank.questions.length} distinct question summaries across {bank.reports.length} report accounts:
          {" "}{categoryCount("recent")} with recent evidence, {categoryCount("older")} with older evidence,
          {" "}{categoryCount("unknown")} with unknown-date evidence. Categories can overlap when a question has distinct accounts.</p>
        <nav className={styles.links} aria-label="Browse by interview recency">
          <Link href={filterHref({ ...filters, recency: "recent" })} scroll={false}>Recent interviews</Link>
          <Link href={filterHref({ ...filters, recency: "older" })} scroll={false}>Older interviews</Link>
          <Link href={filterHref({ ...filters, recency: "unknown" })} scroll={false}>Unknown dates</Link>
          <Link href={filterHref({ ...filters, recency: "all" })} scroll={false}>All dates</Link>
        </nav>
      </aside>

      <form className={styles.filters} onSubmit={applyFilters} role="search" aria-label="Filter reported questions">
        <div className={styles.search}>
          <label htmlFor="question-search">Search question summaries and topic tags</label>
          <input key={filters.q} id="question-search" name="q" type="search" defaultValue={filters.q} placeholder="Try graphs, tree, prefix sums..." />
        </div>
        <label>Company
          <select name="company" value={filters.company} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
            <option value="all">All seeded companies</option>
            {bank.companies.map((company) => <option key={company.id} value={company.id}>{company.name}</option>)}
            {invalid.includes("company") && <option value={filters.company}>Unsupported: {filters.company}</option>}
          </select>
        </label>
        <label>Stage
          <select name="stage" value={filters.stage} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
            <option value="all">All stages</option>
            {Object.entries(stageLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            {invalid.includes("stage") && <option value={filters.stage}>Unsupported: {filters.stage}</option>}
          </select>
        </label>
        <label>Topic
          <select name="tag" value={filters.tag} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
            <option value="all">All topics</option>
            {Object.entries(topicLabels).map(([id, label]) => <option key={id} value={id}>{label}</option>)}
            {invalid.includes("topic") && <option value={filters.tag}>Unsupported: {filters.tag}</option>}
          </select>
        </label>
        <label>Interview recency
          <select name="recency" value={filters.recency} onChange={(event) => event.currentTarget.form?.requestSubmit()}>
            <option value="recent">Recent interviews (12 months)</option>
            <option value="older">Older interviews</option>
            <option value="unknown">Unknown / boundary-crossing dates</option>
            <option value="all">All dates</option>
            {invalid.includes("recency") && <option value={filters.recency}>Unsupported: {filters.recency}</option>}
          </select>
        </label>
        <button type="submit">Apply search</button>
        <Link href="/company-questions/" scroll={false}>Reset filters</Link>
      </form>

      {invalid.length > 0 && <p role="alert">Unsupported URL filter: {invalid.join(", ")}. Choose a supported value or reset filters; no results have been substituted.</p>}
      <p role="status" aria-live="polite" aria-atomic="true">{questions.length} matching question{questions.length === 1 ? "" : "s"}. Only matching report evidence is shown.</p>
      {questions.length === 0 ? (
        <section className={styles.notice} aria-label="No matching questions">
          <h2>No matching source-backed questions</h2>
          <p>This does not mean Google did not ask them. Public reports are incomplete, some originals are inaccessible, and undated accounts are excluded from recent interviews.</p>
          <Link href={filterHref({ ...defaultFilters, recency: "all" })}>Browse all researched accounts</Link>
        </section>
      ) : (
        <div className={styles.cards}>{questions.map((question) => <QuestionCard key={question.id} question={question} />)}</div>
      )}

      <section id="coverage" className={styles.coverage}>
        <h2>Research coverage and limitations</h2>
        <p>Google is the only seeded company. Search covered the requested 12-month window and broader 2025/2026 accounts for older and uncertain-date context.
          This is a bounded public-source sweep, not an exhaustive internet archive.</p>
        <details>
          <summary>Platforms checked and evidence policy</summary>
          <p><strong>LeetCode Discuss:</strong> searched individual reports and collections; direct originals returned 403 or failed DNS. Search summaries were inconsistent and were not accepted as question evidence.</p>
          <p><strong>Reddit:</strong> searched r/leetcode, r/csMajors and r/developersIndia; direct candidate posts returned a bot challenge.
            {" "}<a href="https://github.com/AdityaIndoori/google-swe-interview-questions">A public Reddit-source sweep</a> supplied discovery links only, not verified original reports.</p>
          <p><strong>GitHub:</strong> inspected first-person accounts, company CSV lists, source attribution and commit history.
            Recently updated collections and rolling frequency labels did not prove recent interviews; none supplied sufficient verified new original evidence for inclusion.</p>
          <p><strong>Codeforces:</strong> three original OA discussions were read. Relative post ages and internship-cycle titles are preserved as notes, not invented interview dates.</p>
          <p><strong>GeeksforGeeks:</strong> read two individual accounts. One lacked specific coding questions; the included account explicitly describes a January 2025 interview despite publication in February 2026.</p>
          <p><strong>Other public accounts:</strong> individual interviewexperiences.in narratives were read, not its generated question index.
            Original authorship and possible LeetCode republication could not be independently established; these are explicitly labelled community archive accounts.
            Medium access was blocked. Vague topics, forgotten prompts, preparation lists and live-interview-assistance sources were excluded.</p>
          <p>Summaries are short original factual paraphrases, not copied prompts or validated solutions. Topic tags are editorial navigation aids; missing difficulty is unknown.
            Ambiguities remain visible. Distinct accounts of the same question share a card; reposts must not be added as independent evidence.
            Canonical matches and related practice are labelled separately. Related lessons do not imply exact question matches.</p>
        </details>
        <p>The historical <Link href="/cheat-sheet">Google cheat sheet</Link> remains a separate practice resource, not evidence of recently asked questions.</p>
      </section>
    </main>
  );
}

function QuestionCard({ question }: { question: CompanyQuestion }) {
  return (
    <article id={question.id} className={styles.card}>
      <h2><a href={`#${question.id}`}>{question.title}</a></h2>
      <p>{question.summary}</p>
      <ul className={styles.tags} aria-label="Topic tags">
        {question.tags.map((tag) => <li key={tag}>{topicLabels[tag]}</li>)}
      </ul>
      <p className={styles.muted}>Reported difficulty: {question.difficulty === "unknown" ? "Unknown (not inferred)" : question.difficulty}</p>
      <h3>Report evidence</h3>
      {question.evidence.map((entry) => {
        const report = reports.get(entry.reportId);
        if (!report) throw new Error(`Missing report ${entry.reportId}`);
        const company = bank.companies.find((c) => c.id === report.companyId);
        if (!company) throw new Error(`Missing company ${report.companyId}`);
        return (
          <section className={styles.evidence} key={`${entry.reportId}:${entry.locator}`} aria-label={report.title}>
            <p><strong>{company.name} / {stageLabels[entry.stage]}</strong> / {recencyLabels[reportRecency(report, bank)]}</p>
            <a href={report.url}>{report.title} (source report)</a>
            <p>{report.provenance === "first-person-original" ? "Original first-person public post" : "Community-published account; original authorship/republication unverified"}</p>
            <dl>
              <dt>Interview date</dt><dd>{formatReportDate(report.interview)}</dd>
              <dt>Report published</dt><dd>{formatReportDate(report.published)}</dd>
              <dt>Role / region</dt><dd>{report.role ?? "Unknown"} / {report.region ?? "Unknown"}</dd>
              <dt>Last checked</dt><dd>{report.checkedOn}</dd>
              <dt>Source location</dt><dd>{entry.locator}</dd>
            </dl>
            <p>{report.dateNote}</p>
            {entry.note && <p>{entry.note}</p>}
          </section>
        );
      })}
      {question.practice && <p><a href={question.practice.url}>{question.practice.relationship === "exact" ? "Named canonical problem" : "Related practice (not an exact match)"}: {question.practice.title}</a><br />{question.practice.note}</p>}
      {question.lessons && <nav className={styles.links} aria-label={`Related lessons for ${question.title}`}>
        {question.lessons.map((lesson) => <Link key={lesson.topicId} href={`/?track=DSA&topic=${encodeURIComponent(lesson.topicId)}`}>Lesson: {lesson.title}</Link>)}
      </nav>}
    </article>
  );
}
