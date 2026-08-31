// Audit: every LLD, HLD, AI, OS, and CPP topic must have a meaningful set of
// topic-specific FAQs (question + detailed answer + non-empty fields), not
// empty/placeholder content. Fails if any topic has fewer than the minimum FAQ
// count or any FAQ item has an empty question/answer. A track whose dataset is
// still empty trivially passes, so this stays usable while a track is being
// authored. Run with:
//   npx tsx scripts/audit-faqs.ts
import { allLldTopics, allHldTopics, allAiTopics, allOsTopics, allCppTopics } from "../data/all-topics";
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

function auditTrack(topics: Topic[]) {
  const tooFew = topics.filter((t) => !t.faq || t.faq.length < MIN_FAQS);
  const invalid = topics
    .filter((t) => t.faq && t.faq.length > 0)
    .map((t) => ({ topic: t, problems: invalidItems(t.faq as FaqItem[]) }))
    .filter((entry) => entry.problems.length > 0);

  return { tooFew, invalid };
}

const tracks: { name: string; topics: Topic[] }[] = [
  { name: "LLD", topics: allLldTopics },
  { name: "HLD", topics: allHldTopics },
  { name: "AI", topics: allAiTopics },
  { name: "OS", topics: allOsTopics },
  { name: "CPP", topics: allCppTopics }
];

let failed = false;

for (const track of tracks) {
  const result = auditTrack(track.topics);

  if (result.tooFew.length > 0) {
    failed = true;
    console.error(`FAIL: ${result.tooFew.length} ${track.name} topic(s) have fewer than ${MIN_FAQS} FAQs:`);
    for (const t of result.tooFew) console.error(` - ${t.id}: ${t.title} (${t.faq?.length || 0} FAQs)`);
  }

  if (result.invalid.length > 0) {
    failed = true;
    console.error(`FAIL: ${result.invalid.length} ${track.name} topic(s) have invalid FAQ fields:`);
    for (const entry of result.invalid) {
      console.error(` - ${entry.topic.id}: ${entry.topic.title} -> ${entry.problems.join("; ")}`);
    }
  }
}

if (failed) {
  process.exit(1);
} else {
  const counts = tracks.map((t) => `${t.topics.length} ${t.name}`).join(", ");
  console.log(
    `PASS: all audited topics (${counts}) have at least ${MIN_FAQS} FAQs with non-empty question/answer fields.`
  );
}
