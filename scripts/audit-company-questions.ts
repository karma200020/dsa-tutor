import assert from "node:assert/strict";
import { googleQuestionBank as bank } from "../data/company-questions/google";
import { auditQuestionBank, dateBounds, defaultFilters, filterHref, invalidFilters, matchingQuestions, parseFilters, reportRecency } from "../data/company-questions/logic";
import type { CompanyReport, QuestionBank } from "../data/company-questions/schema";
import { allDsaTopics } from "../data/topics/dsa";

const source = bank.reports[0];
const day = (value: string) => ({ precision: "day", value }) as const;
const recency = (interview: CompanyReport["interview"]) => reportRecency({ ...source, interview }, bank);
assert.equal(recency(day("2025-10-31")), "recent");
assert.equal(recency(day("2026-10-31")), "recent");
assert.equal(recency(day("2025-10-30")), "older");
assert.equal(recency({ precision: "unknown" }), "unknown");
assert.equal(recency({ precision: "year", value: "2025" }), "unknown");
assert.equal(recency({ precision: "month", value: "2025-10" }), "unknown");
assert.equal(recency({ precision: "month", value: "2025-11" }), "recent");
assert.equal(recency(day("2026-11-01")), "unknown");
assert.deepEqual(dateBounds({ precision: "month", value: "2024-02" }), ["2024-02-01", "2024-02-29"]);
for (const value of ["2025-02-29", "2026-02-30", "2026-13-01", "2026-1-01", "not-a-date"]) {
  assert.throws(() => dateBounds(day(value)));
}

const older = bank.reports.find((r) => r.id === "google-gfg-jan2025")!;
assert.equal(older.published.precision === "day" && older.published.value, "2026-02-21");
assert.equal(reportRecency(older, bank), "older", "Recent publication must not hide an older interview.");
assert.equal(reportRecency(bank.reports.find((r) => r.id === "google-dec24-oa-phone")!, bank), "unknown", "A dated title must not be used as an interview date without evidence.");
assert.deepEqual(auditQuestionBank(bank), []);

function rejects(label: string, mutate: (fixture: QuestionBank) => void, expected: RegExp) {
  const fixture = structuredClone(bank);
  mutate(fixture);
  assert(auditQuestionBank(fixture).some((error) => expected.test(error)), `Missing detector: ${label}`);
}
rejects("future interview", (b) => { b.reports[0].interview = day("2027-01-01"); }, /future date/);
rejects("future publication", (b) => { b.reports[0].published = day("2027-01-01"); }, /future date/);
rejects("future checked date", (b) => { b.reports[0].checkedOn = "2026-11-01"; }, /future date|checked after snapshot/);
rejects("impossible date", (b) => { b.reports[0].interview = day("2026-02-30"); }, /Invalid calendar/);
rejects("missing source", (b) => { b.questions[0].evidence[0].reportId = "missing"; }, /missing source/);
rejects("no source", (b) => { b.questions[0].evidence = []; }, /missing content\/source/);
rejects("invalid source URL", (b) => { b.reports[0].url = ""; }, /Invalid URL/);
rejects("unsafe URL", (b) => { b.reports[0].url = "javascript:alert(1)"; }, /Invalid HTTPS/);
rejects("credentials in URL", (b) => { b.reports[0].url = "https://name:password@example.com"; }, /Invalid HTTPS/);
rejects("duplicate question", (b) => { b.questions.push(b.questions[0]); }, /Duplicate question IDs/);
rejects("duplicate occurrence", (b) => { b.questions[0].evidence.push(b.questions[0].evidence[0]); }, /Duplicate report evidence/);
rejects("repost identity", (b) => { b.reports[1].accountKey = b.reports[0].accountKey; }, /Duplicate report accounts/);
rejects("URL tracking alias", (b) => { b.reports[1].url = `${b.reports[0].url}/?utm_source=repost#section`; }, /Duplicate report URLs/);
rejects("missing date provenance", (b) => { b.reports[0].dateNote = ""; }, /missing provenance/);
rejects("invalid question ID", (b) => { b.questions[0].id = "bad fragment/#"; }, /Invalid question ID/);
rejects("missing company", (b) => { b.reports[0].companyId = "missing"; }, /missing company/);
rejects("interview after publication", (b) => { b.reports[0].interview = day("2026-10-20"); }, /interview after publication/);
rejects("bad snapshot", (b) => { b.recentFrom = "2027-01-01"; }, /Invalid snapshot/);
rejects("duplicate tags", (b) => { b.questions[0].tags.push(b.questions[0].tags[0]); }, /Duplicate.*tags/);
rejects("missing practice evidence", (b) => { b.questions[0].practice!.note = ""; }, /missing practice match evidence/);

for (const question of bank.questions) {
  for (const lesson of question.lessons ?? []) {
    assert(allDsaTopics.some((topic) => topic.id === lesson.topicId), `Broken lesson link ${lesson.topicId}`);
  }
}
assert.equal(allDsaTopics.length, 135, "Reports must not become curriculum topics.");
assert.equal(matchingQuestions(bank, { ...defaultFilters, recency: "all" }).length, bank.questions.length);
assert(matchingQuestions(bank, { ...defaultFilters, q: "BFS" }).every((q) => q.tags.includes("bfs")));
assert(matchingQuestions(bank, { ...defaultFilters, q: "prefix sums", recency: "all" }).length > 0);
assert.equal(matchingQuestions(bank, { ...defaultFilters, q: "no-such-question" }).length, 0);
assert.equal(matchingQuestions(bank, { ...defaultFilters, company: "unseeded" }).length, 0);
assert.equal(matchingQuestions(bank, { ...defaultFilters, stage: "oa" }).length, 0, "Recent OA dates have not been established in this snapshot.");
assert.equal(invalidFilters({ ...defaultFilters, tag: "constructor" }, bank).length, 1);
assert.equal(invalidFilters(parseFilters(new URLSearchParams("stage=bad&recency=bad&company=bad&tag=bad")), bank).length, 4);
assert.equal(matchingQuestions(bank, { ...defaultFilters, tag: "trees", recency: "all" }).length > 0, true);

// Different reports of one question cannot satisfy different filters together.
const joined = structuredClone(bank);
joined.reports[0].interview = { precision: "unknown" };
joined.questions[0].evidence[0].stage = "oa";
assert(!matchingQuestions(joined, { ...defaultFilters, stage: "oa" }).some((q) => q.id === joined.questions[0].id));
const recentFriendship = matchingQuestions(bank, defaultFilters).find((q) => q.id === "google-earliest-friendship")!;
assert.equal(recentFriendship.evidence.length, 1, "Only matching dated evidence should be shown.");

for (const filters of [
  defaultFilters,
  { ...defaultFilters, q: "tree & graph / % encoded", recency: "all", stage: "oa", tag: "trees", company: "all" },
  { ...defaultFilters, company: "", stage: "unknown" }
]) {
  assert.deepEqual(parseFilters(new URL(filterHref(filters), "https://example.test").searchParams), filters);
}

console.log(`PASS company question metadata, date/URL/source detectors, deduplication, lesson links, search and filter self-tests.`);
console.log(`${bank.reports.length} reports; ${bank.questions.length} distinct questions.`);
for (const category of ["recent", "older", "unknown"] as const) {
  console.log(`${category}: ${bank.reports.filter((r) => reportRecency(r, bank) === category).length} reports; ${matchingQuestions(bank, { ...defaultFilters, recency: category }).length} questions`);
}
