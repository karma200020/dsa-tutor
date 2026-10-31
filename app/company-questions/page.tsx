import type { Metadata } from "next";
import { Suspense } from "react";
import { QuestionBankView } from "./question-bank-view";

export const metadata: Metadata = {
  title: "Company-tagged questions | DSA Tutor",
  description: "Source-backed community reports of Google coding interviews and online assessments, with explicit dates and provenance."
};

export default function CompanyQuestionsPage() {
  return (
    <Suspense fallback={<p role="status">Loading company questions...</p>}>
      <QuestionBankView />
    </Suspense>
  );
}
