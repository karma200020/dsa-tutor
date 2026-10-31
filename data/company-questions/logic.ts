import { stageLabels, topicLabels } from "./schema";
import type { CompanyQuestion, CompanyReport, QuestionBank, QuestionEvidence, ReportDate, Recency } from "./schema";

export function dateBounds(date: ReportDate): [string, string] | null {
  if (date.precision === "unknown") return null;
  const { value, precision } = date;
  const pattern = precision === "day" ? /^\d{4}-\d{2}-\d{2}$/ : precision === "month" ? /^\d{4}-\d{2}$/ : /^\d{4}$/;
  if (!pattern.test(value)) throw new Error(`Invalid ${precision} date: ${value}`);
  const start = precision === "year" ? `${value}-01-01` : precision === "month" ? `${value}-01` : value;
  const parsed = new Date(`${start}T00:00:00Z`);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== start) {
    throw new Error(`Invalid calendar date: ${value}`);
  }
  const end = precision === "year" ? `${value}-12-31` : precision === "month"
    ? new Date(Date.UTC(parsed.getUTCFullYear(), parsed.getUTCMonth() + 1, 0)).toISOString().slice(0, 10)
    : value;
  return [start, end];
}

export function formatReportDate(date: ReportDate): string {
  if (date.precision === "unknown") return "Unknown";
  return `${date.value} (${date.precision} precision)`;
}

export function reportRecency(report: CompanyReport, bank: Pick<QuestionBank, "recentFrom" | "asOf">): Recency {
  const bounds = dateBounds(report.interview);
  if (!bounds) return "unknown";
  if (bounds[1] < bank.recentFrom) return "older";
  if (bounds[0] >= bank.recentFrom && bounds[1] <= bank.asOf) return "recent";
  return "unknown";
}

export function occurrenceReport(report: CompanyReport, entry: QuestionEvidence): CompanyReport {
  return entry.interview ? { ...report, interview: entry.interview } : report;
}

export interface BankFilters {
  q: string;
  company: string;
  stage: string;
  tag: string;
  recency: string;
}
export const defaultFilters: BankFilters = { q: "", company: "google", stage: "all", tag: "all", recency: "all" };

export function parseFilters(params: Pick<URLSearchParams, "get">): BankFilters {
  return {
    q: params.get("q") ?? defaultFilters.q,
    company: params.get("company") ?? defaultFilters.company,
    stage: params.get("stage") ?? defaultFilters.stage,
    tag: params.get("tag") ?? defaultFilters.tag,
    recency: params.get("recency") ?? defaultFilters.recency
  };
}

export function invalidFilters(filters: BankFilters, bank: QuestionBank): string[] {
  const invalid: string[] = [];
  if (filters.company !== "all" && !bank.companies.some((c) => c.id === filters.company)) invalid.push("company");
  if (filters.stage !== "all" && !Object.hasOwn(stageLabels, filters.stage)) invalid.push("stage");
  if (filters.tag !== "all" && !Object.hasOwn(topicLabels, filters.tag)) invalid.push("topic");
  if (!["all", "recent", "older", "unknown"].includes(filters.recency)) invalid.push("recency");
  return invalid;
}

export function filterHref(filters: BankFilters): string {
  const params = new URLSearchParams();
  for (const key of ["q", "company", "stage", "tag", "recency"] as const) {
    if (filters[key] !== defaultFilters[key]) params.set(key, filters[key]);
  }
  return `/company-questions/${params.size ? `?${params}` : ""}`;
}

export function matchingQuestions(bank: QuestionBank, filters: BankFilters): CompanyQuestion[] {
  if (invalidFilters(filters, bank).length) return [];
  const reports = new Map(bank.reports.map((r) => [r.id, r]));
  const terms = filters.q.trim().toLowerCase().split(/\s+/).filter(Boolean);
  return bank.questions.flatMap((question) => {
    const text = [question.title, question.summary, ...question.tags.flatMap((tag) => [tag, topicLabels[tag]])].join(" ").toLowerCase();
    if (!terms.every((term) => text.includes(term)) || (filters.tag !== "all" && !question.tags.some((tag) => tag === filters.tag))) return [];
    // All evidence filters must match the SAME occurrence, not different rounds
    // or reports of a deduplicated question.
    const evidence = question.evidence.filter((entry) => {
      const report = reports.get(entry.reportId);
      if (!report) throw new Error(`Missing report: ${entry.reportId}`);
      return (filters.company === "all" || report.companyId === filters.company)
        && (filters.stage === "all" || entry.stage === filters.stage)
        && (filters.recency === "all" || reportRecency(occurrenceReport(report, entry), bank) === filters.recency);
    });
    return evidence.length ? [{ ...question, evidence }] : [];
  });
}

export function auditQuestionBank(bank: QuestionBank): string[] {
  const errors: string[] = [];
  const fail = (message: string) => { errors.push(message); };
  const validateDate = (date: ReportDate, label: string) => {
    try {
      const bounds = dateBounds(date);
      if (bounds && bounds[0] > bank.checkedOn) fail(`${label}: future date`);
      return bounds;
    } catch (error) {
      fail(`${label}: ${error instanceof Error ? error.message : String(error)}`);
      return null;
    }
  };
  const unique = (values: string[], label: string) => {
    if (values.length !== new Set(values).size) fail(`Duplicate ${label}`);
  };
  const identifier = (value: string, label: string) => {
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(value)) fail(`Invalid ${label} ID: ${value}`);
  };
  const https = (value: string, label: string) => {
    try {
      const url = new URL(value);
      if (url.protocol !== "https:" || url.username || url.password) fail(`Invalid HTTPS ${label}`);
    } catch { fail(`Invalid URL ${label}`); }
  };
  for (const [label, value] of Object.entries({ asOf: bank.asOf, recentFrom: bank.recentFrom, checkedOn: bank.checkedOn })) {
    try { dateBounds({ precision: "day", value }); } catch { fail(`Invalid ${label}`); }
  }
  if (bank.recentFrom > bank.asOf || bank.checkedOn > bank.asOf) fail("Invalid snapshot window");
  unique(bank.companies.map((c) => c.id), "company IDs");
  unique(bank.reports.map((r) => r.id), "report IDs");
  unique(bank.reports.map((r) => r.accountKey), "report accounts (repost)");
  unique(bank.reports.map((r) => r.url.split(/[?#]/)[0].replace(/\/$/, "")), "report URLs (possible repost)");
  unique(bank.questions.map((q) => q.id), "question IDs");
  unique(bank.questions.map((q) => q.title.trim().toLowerCase()), "question titles (deduplicate)");
  const reportMap = new Map(bank.reports.map((r) => [r.id, r]));
  const occurrences: string[] = [];
  for (const company of bank.companies) {
    identifier(company.id, "company");
    if (!company.name.trim()) fail(`${company.id}: missing company name`);
  }
  for (const report of bank.reports) {
    identifier(report.id, "report");
    if (!bank.companies.some((c) => c.id === report.companyId)) fail(`${report.id}: missing company`);
    if (!report.accountKey.trim() || !report.title.trim() || !report.evidence.trim() || !report.dateNote.trim()) fail(`${report.id}: missing provenance`);
    if (!["first-person-original", "community-account"].includes(report.provenance)) fail(`${report.id}: invalid provenance`);
    https(report.url, report.id);
    const published = validateDate(report.published, `${report.id} publication`);
    const interview = validateDate(report.interview, `${report.id} interview`);
    validateDate({ precision: "day", value: report.checkedOn }, `${report.id} last checked`);
    if (report.checkedOn > bank.checkedOn) fail(`${report.id}: checked after snapshot`);
    if (published && interview && interview[0] > published[1]) fail(`${report.id}: interview after publication`);
    if (!bank.questions.some((q) => q.evidence.some((e) => e.reportId === report.id))) fail(`${report.id}: unused report`);
  }
  for (const question of bank.questions) {
    identifier(question.id, "question");
    if (!question.title.trim() || !question.summary.trim() || !question.evidence.length || !question.tags.length) fail(`${question.id}: missing content/source`);
    if (!["easy", "medium", "hard", "unknown"].includes(question.difficulty)) fail(`${question.id}: invalid difficulty`);
    unique(question.tags, `${question.id} tags`);
    for (const tag of question.tags) if (!Object.hasOwn(topicLabels, tag)) fail(`${question.id}: invalid tag`);
    for (const entry of question.evidence) {
      if (!reportMap.has(entry.reportId) || !entry.locator.trim()) fail(`${question.id}: missing source/locator`);
      if (!Object.hasOwn(stageLabels, entry.stage)) fail(`${question.id}: invalid stage`);
      if (entry.detailUrl) https(entry.detailUrl, `${question.id} linked task notes`);
      if (entry.interview) {
        const bounds = validateDate(entry.interview, `${question.id} occurrence interview`);
        const report = reportMap.get(entry.reportId);
        const published = report ? dateBounds(report.published) : null;
        if (bounds && published && bounds[0] > published[1]) fail(`${question.id}: occurrence interview after publication`);
      }
      occurrences.push(`${entry.reportId}:${entry.locator.trim().toLowerCase()}`);
    }
    if (question.practice) {
      https(question.practice.url, `${question.id} practice`);
      if (!question.practice.note.trim() || !["exact", "related"].includes(question.practice.relationship)) fail(`${question.id}: missing practice match evidence`);
    }
  }
  unique(occurrences, "report evidence (possible double counting)");
  return errors;
}
