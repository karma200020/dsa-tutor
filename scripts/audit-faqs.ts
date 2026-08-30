// Audit: every LLD and HLD topic must have a meaningful set of topic-specific
// FAQs (question + detailed answer + non-empty fields), not empty/placeholder
// content. Fails if any topic has fewer than the minimum FAQ count or any FAQ
// item has an empty question/answer. Run with:
//   npx tsx scripts/audit-faqs.ts
import { allLldTopics, allHldTopics, allAiTopics } from "../data/all-topics";
import { FaqItem, Topic } from "../data/syllabus";

const MIN_FAQS = 5;

function invalidItems(faq: FaqItem[]): string[] {
  const problems: string[] = [];
  faq.forEach((item, i) => {
    if (!item.question || item.question.trim().length === 0) {
      problems.push(`item[${i}] has an empty question`);
    }
    if (!item.answer || item.answer.trim().length < 20) {
      problems.push(`item[${i}] ("${item.question}") has an empty or too-short answer`);
    }
  });
  return problems;
}

function auditTrack(topics: Topic[], trackName: string) {
  const tooFew = topics.filter((t) => !t.faq || t.faq.length < MIN_FAQS);
  const invalid = topics
    .filter((t) => t.faq && t.faq.length > 0)
    .map((t) => ({ topic: t, problems: invalidItems(t.faq as FaqItem[]) }))
    .filter((entry) => entry.problems.length > 0);

  return { tooFew, invalid };
}

let failed = false;

const lldResult = auditTrack(allLldTopics, "LLD");
const hldResult = auditTrack(allHldTopics, "HLD");
const aiResult = auditTrack(allAiTopics, "AI");

if (lldResult.tooFew.length > 0) {
  failed = true;
  console.error(`FAIL: ${lldResult.tooFew.length} LLD topic(s) have fewer than ${MIN_FAQS} FAQs:`);
  for (const t of lldResult.tooFew) console.error(` - ${t.id}: ${t.title} (${t.faq?.length || 0} FAQs)`);
}

if (hldResult.tooFew.length > 0) {
  failed = true;
  console.error(`FAIL: ${hldResult.tooFew.length} HLD topic(s) have fewer than ${MIN_FAQS} FAQs:`);
  for (const t of hldResult.tooFew) console.error(` - ${t.id}: ${t.title} (${t.faq?.length || 0} FAQs)`);
}

if (aiResult.tooFew.length > 0) {
  failed = true;
  console.error(`FAIL: ${aiResult.tooFew.length} AI topic(s) have fewer than ${MIN_FAQS} FAQs:`);
  for (const t of aiResult.tooFew) console.error(` - ${t.id}: ${t.title} (${t.faq?.length || 0} FAQs)`);
}

if (lldResult.invalid.length > 0) {
  failed = true;
  console.error(`FAIL: ${lldResult.invalid.length} LLD topic(s) have invalid FAQ fields:`);
  for (const entry of lldResult.invalid) {
    console.error(` - ${entry.topic.id}: ${entry.topic.title} -> ${entry.problems.join("; ")}`);
  }
}

if (hldResult.invalid.length > 0) {
  failed = true;
  console.error(`FAIL: ${hldResult.invalid.length} HLD topic(s) have invalid FAQ fields:`);
  for (const entry of hldResult.invalid) {
    console.error(` - ${entry.topic.id}: ${entry.topic.title} -> ${entry.problems.join("; ")}`);
  }
}

if (aiResult.invalid.length > 0) {
  failed = true;
  console.error(`FAIL: ${aiResult.invalid.length} AI topic(s) have invalid FAQ fields:`);
  for (const entry of aiResult.invalid) {
    console.error(` - ${entry.topic.id}: ${entry.topic.title} -> ${entry.problems.join("; ")}`);
  }
}

if (failed) {
  process.exit(1);
} else {
  console.log(
    `PASS: all ${allLldTopics.length} LLD topics, ${allHldTopics.length} HLD topics, and ${allAiTopics.length} AI topics have at least ${MIN_FAQS} FAQs with non-empty question/answer fields.`
  );
}
