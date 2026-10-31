export type ReportDate =
  | { precision: "day" | "month" | "year"; value: string }
  | { precision: "unknown" };

export const stageLabels = {
  oa: "Online assessment",
  phone: "Phone screen",
  onsite: "On-site",
  technical: "Technical (format unspecified)",
  unknown: "Unknown"
} as const;
export type Stage = keyof typeof stageLabels;
export type Recency = "recent" | "older" | "unknown";

export const topicLabels = {
  arrays: "Arrays",
  strings: "Strings",
  "prefix-sums": "Prefix sums",
  intervals: "Intervals",
  graphs: "Graphs",
  trees: "Trees",
  "linked-lists": "Linked lists",
  hashing: "Hashing",
  counting: "Counting",
  "dynamic-programming": "Dynamic programming",
  "union-find": "Union-find",
  "number-theory": "Number theory",
  greedy: "Greedy",
  bfs: "BFS",
  "data-structures": "Data structures"
} as const;
export type QuestionTag = keyof typeof topicLabels;

export interface CompanyReport {
  id: string;
  accountKey: string;
  companyId: string;
  title: string;
  url: string;
  provenance: "first-person-original" | "community-account";
  published: ReportDate;
  interview: ReportDate;
  dateNote: string;
  checkedOn: string;
  role?: string;
  region?: string;
  evidence: string;
}

export interface QuestionEvidence {
  reportId: string;
  stage: Stage;
  locator: string;
  note?: string;
  interview?: ReportDate;
  detailUrl?: string;
}

export interface CompanyQuestion {
  id: string;
  title: string;
  summary: string;
  tags: QuestionTag[];
  difficulty: "easy" | "medium" | "hard" | "unknown";
  evidence: QuestionEvidence[];
  practice?: {
    url: string;
    title: string;
    relationship: "exact" | "related";
    note: string;
  };
  lessons?: { topicId: string; title: string }[];
}

export interface QuestionSolution {
  hints: string[];
  contract: "specified" | "conditional" | "clarification-required";
  assumptions: string;
  approach: string;
  correctness: string;
  complexity: string;
  edgeCases: string;
  code?: string;
}

export interface QuestionBank {
  asOf: string;
  recentFrom: string;
  checkedOn: string;
  companies: { id: string; name: string }[];
  reports: CompanyReport[];
  questions: CompanyQuestion[];
}
