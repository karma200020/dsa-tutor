import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-ai-evaluation - "AI: Evaluation & Testing" (7 topics).
// Coverage: why evaluating nondeterministic systems is hard, the evaluation
// pyramid, golden datasets, LLM-as-judge, regression testing and CI for AI,
// production monitoring and online evaluation, and building an evaluation
// practice around rubrics, annotation, and the human loop.
//
// Authoring rules: see data/ai/foundations.ts (every field explicit, 5+ FAQs,
// `complexity` as latency/cost framing, `asciiDiagram` from "./_shared").
export const aiEvaluationTopics: Topic[] = [
  {
    id: "topic-ai-evaluation-nondeterminism",
    moduleId: "mod-ai-evaluation",
    title: "Why Evaluating Nondeterministic Systems Is Hard",
    intuition: "Traditional software testing assumes one correct output per input — assertEqual passes or fails. LLMs can produce dozens of valid, distinct, correct-sounding responses to the same prompt, which invalidates every assumption your test runner was built on. Until you internalize this, every evaluation decision you make will be architecturally wrong.",

    complexity: {
      time: "Single assertion check: <1ms. Full eval suite with LLM judge: minutes to hours depending on suite size and judge model. Manual human review: 2–5 min/example — unsustainable at scale beyond ~100 examples/week.",
      space: "No meaningful memory cost for assertion-based checks. LLM-judge eval: API call overhead only. Storing eval results: O(N × response_length) per run; a 500-example suite with full response logging is ~5–50MB per run."
    },

    lesson: [
      {
        title: "The Single Ground-Truth Assumption Is Broken",
        content: "Classical unit tests work because every function has a deterministic contract: add(2,3) returns 5, always. LLMs violate this at every level — a customer-support assistant answering 'Where is my order?' can respond with 'Let me check that for you,' 'I'll look up your shipment,' or 'Looking that up now' — all correct, all different, none matchable with assertEqual. This is not a corner case; it invalidates string-matching assertions, regex guards, and snapshot testing wholesale. The required mental shift is from 'is this output correct?' to 'does this output satisfy these quality properties?' Quality properties are multidimensional and often subjective, which means every eval system for LLMs must encode a rubric rather than an expected answer. The rubric itself becomes a versioned, maintained artifact. Write 3–4 more sentences grounding this with the search-engine analogy: testing a search engine (many valid orderings of results) was the last time software engineers faced this, and even that was simpler because relevance is at least ordinal and the output space is bounded.",
        diagram: asciiDiagram(`
  DETERMINISTIC SYSTEM TEST              LLM SYSTEM TEST
  ──────────────────────────────         ──────────────────────────────────
  Input ──► Function ──► Output          Input ──► LLM ──► Response A  ✓
                │                                       ├──► Response B  ✓
                ▼                                       ├──► Response C  ✓
      assertEqual("expected")                          └──► Response D  ✗ (hallucination)
                │
           PASS or FAIL            →     No single expected output exists.
                                         Need rubric:
                                           {factual: bool, helpful: bool,
                                            concise: bool, safe: bool}`)
      },
      {
        title: "Temperature Zero Does Not Save You — Three Reasons",
        content: "The first instinct is 'set temperature=0 and get deterministic outputs.' This fails for three compounding reasons. First, greedy decoding still produces different outputs across model versions, API caching quirks, and context-window truncation edge cases — OpenAI explicitly states that identical inputs may produce different outputs even at temperature=0 due to floating-point non-determinism on parallel GPU hardware. Second, temperature=0 suppresses variance, hiding the model's uncertainty distribution: a model 51% confident in a wrong answer looks identical to one 99% confident in the right one. Third, production systems almost never run at temperature=0 because it can cause repetitive loops and reduced output diversity — so your evals no longer reflect what actually runs in production. The right approach is to embrace nondeterminism by designing rubric-based evaluators that are robust to surface variation, and to measure results as distributions (pass rate ± standard deviation) across multiple runs. Chen et al. (arXiv 2307.09009) documented that GPT-3.5-turbo produced different outputs for the same prompt 12% of the time at temperature=0 across a one-week period in 2023.",
        codeExample: `# WRONG: exact-match assertion
  def test_order_response(response: str) -> bool:
      return response == "I'll look up your order right away."

  # WRONG: still fails for valid paraphrases
  def test_order_response_regex(response: str) -> bool:
      return bool(re.match(r"I'll (look up|check) your order", response))

  # RIGHT: property-based eval (multiple valid responses pass)
  def eval_order_response(response: str, context: dict) -> dict[str, bool]:
      return {
          "acknowledges_intent": signals_willingness_to_help(response),
          "no_hallucinated_info": not contains_invented_data(response, context),
          "appropriate_length": 20 <= len(response.split()) <= 80,
          "no_pii_leak": not contains_pii_patterns(response)
      }
      # All four pass for "Let me look into that for you."
      # All four pass for "I'll check on your order right now."
      # no_hallucinated_info fails for "Your order arrives Thursday." (invented)`
      },
      {
        title: "The Three Layers of Nondeterminism",
        content: "There are three distinct, independent sources of nondeterminism in LLM systems, and they require different mitigation strategies. Layer 1 is Sampling Nondeterminism: the model's stochastic token sampling varies even for the same prompt and temperature — controllable with seed parameters where supported, but never fully eliminated. Layer 2 is Context Nondeterminism: retrieved documents change as the knowledge base evolves, conversation history gets truncated differently across requests, and tool call results vary — this is the dominant source of variance in production RAG systems. Layer 3 is Model Nondeterminism: the underlying weights change when the provider releases a model update, even when the API model name stays the same — the most dangerous layer because it is invisible. The correct mitigation per layer: sample-level pass@k for Layer 1; replay tests with frozen retrieval snapshots for Layer 2; nightly canary evals with version-pinned models for Layer 3.",
        diagram: asciiDiagram(`
  LAYER 1: Sampling          LAYER 2: Context           LAYER 3: Model Update
  ─────────────────────      ─────────────────────────  ──────────────────────────
  Same prompt,               RAG retrieval varies;      Provider updates weights
  same temperature           doc DB changes;            under same model name;
                             history truncates          silent behavior change
          ▼                          ▼                          ▼
  Mitigation:                Mitigation:                Mitigation:
  Run K times,               Replay frozen retrieval    Pin exact model version
  report pass@k              snapshots in test          (e.g. gpt-4o-2024-11-20);
  Use seed param             Hermetic test datasets     nightly canary eval suite`)
      },
      {
        title: "The Cost of Manual Review at Scale — The Economic Case for Automation",
        content: "The alternative to automated evaluation is manual human review, and the economics are brutal. A single human reviewer evaluates roughly 20–50 LLM responses per hour depending on complexity. A team shipping 3 prompt changes per week that each require 200 responses reviewed needs 40–100 person-hours per week just for evaluation. At a 4-person team, that consumes 25–63% of total capacity on evaluation alone — before any feature work. This is why LLM-as-judge emerged as a field: not because humans are bad evaluators, but because the throughput economics are impossible at product scale. The ROI of automated evaluation is typically the clearest engineering investment you can make in an AI product. Budget example: 500 eval examples × $0.002/LLM-judge-call = $1 per automated eval run; at 50 runs per week = $50/week vs the person-hours equivalent at even minimum wage. Human review should be reserved for calibration (20–50 examples to validate the judge) and for incident investigation, not as the primary eval pipeline.",
      },
      {
        title: "Accepting Nondeterminism as a Design Constraint — Statistical Thinking",
        content: "The mature engineering response is not to fight nondeterminism but to design around it. The four design principles: (1) Write property assertions rather than value assertions — 'the output must not contain PII' rather than 'the output must equal X'; (2) Measure pass rates as distributions — report mean ± standard deviation across multiple runs, not a single point estimate; (3) Make eval infrastructure itself deterministic even when the system under test is not — the eval runner, judge prompt, and scoring logic should be version-pinned and reproducible; (4) Treat a 10-percentage-point pass-rate improvement as meaningful progress even if it's not 100%. Hamel Husain's key insight from working with 30+ companies: teams that accept nondeterminism and measure distributions consistently outperform teams that try to eliminate it. The P95 latency analogy from web performance: engineers stopped asking 'what is the latency?' and started asking 'what is the distribution and what's the acceptable threshold?' — the same shift is needed for LLM quality."
      }
    ],

    examples: [
      {
        title: "Snapshot Hell: The Progression from Snapshot to Property Testing",
        input: "System prompt: 'You are a helpful assistant. Answer concisely.' User: 'What is photosynthesis?' Hardcoded snapshot: 'Photosynthesis is the process by which plants use sunlight to convert CO2 and water into glucose and oxygen.'",
        output: "After a model update, the actual response is: 'Photosynthesis is how plants make food using sunlight, CO2, and water — releasing oxygen via light-dependent reactions in the thylakoid and the Calvin cycle in the stroma.' The snapshot test fails. The team updates the snapshot. Six months later: 400 hardcoded snapshots, none of which anyone dares delete. Engineers stop trusting the test suite.",
        explanation: "Snapshot testing for LLM outputs is a dead end. The new response is more accurate and more informative than the original snapshot, but the test fails. The correct solution: property assertions — contains('photosynthesis'), contains('sunlight' or 'light'), contains('oxygen'), not contains(hallucinated_claim), len(response) < 500. These pass for both the old and new response, and correctly reject a hallucinated response that invents a fictional chemical process."
      },
      {
        title: "Three-Layer Diagnosis: Unexpected CI Failure",
        input: "Eval suite passes at 91% on Monday. By Tuesday, without any code changes, it's at 74%. Oncall engineer is paged.",
        output: "Layer 1 check (sampling): re-run the same suite 3 times — results are 73%, 75%, 74%. Not sampling variance (would produce much tighter clustering for a 17-point swing). Layer 2 check (context): review trace logs — retrieval recall@5 dropped from 0.83 to 0.61. Investigation: a nightly re-indexing job ran an embedding model upgrade that changed retrieval ordering for key documents. Root cause: Layer 2 context nondeterminism (retrieval changed). Layer 3 check: model version unchanged (pinned). Fix: roll back the embedding model update, add embedding model version to the eval suite's metadata.",
        explanation: "The diagnosis framework prevents multi-hour debugging sessions. Checking the three layers in order (sampling → context → model update) gives each a falsification test. The 17-point swing rules out Layer 1 immediately. Trace logs expose Layer 2 in minutes. This is the operational value of the three-layer mental model."
      },
      {
        title: "Property Assertions Beat Regex on a Structured Output Task",
        input: "Task: summarize a 600-word news article about a retail data breach ('Acme Corp,' '4 million records,' 'November 2024'). Regex guard: re.match(r'Acme Corp.*breach.*4 million', output).",
        output: "12 valid summaries written by domain experts: 11 fail the regex (different sentence order, different phrasing). 1 hallucinated summary ('5 million records, discovered October 2024') passes the regex because 'Acme Corp' and '4 million' happen to appear near 'breach' in the generated preamble. Property assertions: contains('Acme Corp')=pass, contains('4 million')=pass, not contains(names_not_in_article)=hallucination_check, len < 0.3×len(article)=compression_check. All 12 valid summaries pass all four properties. The hallucinated summary fails contains('4 million') because the hallucination invented '5 million.'",
        explanation: "Regex guards catch the output you explicitly envisioned; property assertions capture what actually matters. The hallucinated summary defeats the regex because it partially matches the pattern — exactly the kind of dangerous false negative that gives teams false confidence."
      }
    ],

    tips: [
      "Never use assertEqual, exact string matching, or snapshot testing on LLM outputs — design property assertions from day one.",
      "Run your eval suite multiple times and report mean ± standard deviation of pass rates; a single run is a point estimate, not a measurement.",
      "Pin model versions in CI (e.g., gpt-4o-2024-11-20, not gpt-4o) — the same API name from a provider may silently update and break your eval without any code change.",
      "When temperature=0 and you still get variance, check which of the three layers (sampling, context, model-update) is the source before debugging code.",
      "Cost justification formula: (person-hours for manual review × hourly rate) / (cost per automated eval run) = weeks-to-ROI. For most teams this is days, not months.",
      "Treat eval quality as a product metric: track how often your judge disagrees with a human reviewer, just as you track bug rates."
    ],

    tricks: [
      "If you must use deterministic snapshots for regression checks, snapshot only the structured metadata (JSON keys, category labels, extracted entities) — never snapshot the free-text prose.",
      "For 'pass@k' reporting, k=3 is usually sufficient to distinguish a 70% pass-rate model from a 90% one; k=10 is overkill for most product decisions and wastes budget.",
      "Add a 'stability score' to your eval suite: the fraction of examples that flip between pass and fail across multiple identical runs. If stability < 95%, investigate nondeterminism sources before trusting any aggregate score.",
      "When building the first eval for a new feature, write 5 properties that would be true of ANY good response before looking at any actual model outputs — this prevents anchoring to a specific response style.",
      "Shadow-test your eval assertions on human-written responses before using them on model responses — if a property assertion fails for 30% of human-written answers, the assertion is wrong, not the model."
    ],

    memoryAids: [
      "SCM = the three nondeterminism layers: Sampling, Context, Model-update. 'Something Changed Monday' when your eval drops unexpectedly.",
      "'Eval the rubric, not the response' — you can't store every valid answer, but you can store every important property.",
      "The P95 latency analogy: web engineers measure latency distributions, not single values. LLM engineers must measure quality distributions, not single eval runs.",
      "If the test is flaky for deterministic software, you have a bug. If the test is flaky for LLMs after addressing all three SCM layers, you have a measurement problem — widen the tolerance."
    ],

    interviewPatterns: [
      "\"How would you write a test for this LLM feature?\" — Don't say assertEqual. Say: I'd define quality dimensions as property assertions, build a golden set of 50-100 examples, and validate pass rates with a calibrated judge.",
      "\"Our CI pipeline keeps flipping between pass and fail on the same eval with no code changes — what's happening?\" — Walk the three SCM layers: check sampling variance first (re-run 3x), then retrieval/context changes (trace logs), then model version drift (provider changelogs).",
      "\"The business wants to know if the model got better or worse after last week's prompt update. How do you measure that?\" — Regression eval suite on a frozen golden dataset, version-pinned judge, compare mean pass rate distributions with a tolerance threshold.",
      "\"Why not just set temperature=0 and treat the LLM as deterministic for testing?\" — Three reasons: GPU floating-point nondeterminism still exists; production doesn't run at temperature=0; temperature=0 hides the model's uncertainty distribution.",
      "\"How much manual review is acceptable in your eval process?\" — Spot-check calibration (20–50 examples) is essential and ongoing. Full-sweep manual review beyond 100 examples per week is unsustainable; automate beyond that threshold."
    ,
    "Frequency and companies: Tier 1 (90%+). Interview relevance: interview-tested — foundational framing for every eval question. Content stability: stable."
  ],

    faq: [
      {
        question: "Can I just use temperature=0 to make my LLM deterministic for testing?",
        answer: "Not reliably. Temperature=0 (greedy decoding) reduces variance but doesn't eliminate it — identical prompts can produce different outputs due to floating-point nondeterminism across different GPU hardware and batch sizes. More importantly, production systems rarely run at temperature=0 because it can cause repetitive text and reduces output diversity, so your test environment wouldn't match production. And even at temperature=0, model weight updates (Layer 3 nondeterminism) still change behavior silently. The right approach: design rubric-based property assertions that are robust to surface variation, use the seed parameter where the API supports it, and report pass rates as distributions across multiple runs.",
        category: "Testing Strategy"
      },
      {
        question: "How is testing LLMs different from testing probabilistic systems like recommender engines?",
        answer: "The challenge is similar but more severe for LLMs in two dimensions. First, the output space is infinite (free-form text vs. a ranked list of known items), making coverage analysis structurally impossible — you can never enumerate all valid outputs. Second, LLMs can be confidently wrong in ways that look correct to both automated checks and casual human review, whereas a recommender serving a slightly suboptimal item is statistically detectable. The eval methodology borrowed from RecSys (offline datasets, A/B testing, distribution-level metrics) is directionally correct but must be extended with semantic correctness checks that have no equivalent in traditional recommendation systems.",
        category: "Conceptual"
      },
      {
        question: "My eval passes 95% but production complaints are spiking. Why?",
        answer: "Distribution shift: your eval set was built from data you had at eval-creation time, which over-represents common cases and under-represents edge cases, adversarial inputs, and the long tail of real user behavior. Production users find edge cases you didn't imagine. Additionally, for RAG systems, the knowledge base evolves — the eval was correct for the KB state at creation time. The three fixes: (1) continuous golden set expansion by sampling from production traffic monthly; (2) cluster your production queries weekly and check if any cluster is absent from the eval set; (3) add online monitoring (implicit feedback signals) as a complement to offline evals.",
        category: "Production Gap",
        source: "Common interview question at Meta, Google, Databricks"
      },
      {
        question: "At what point does manual review become infeasible and automation becomes necessary?",
        answer: "The rough inflection point is when eval demand exceeds 15–20% of team bandwidth, which typically happens when you're shipping more than 2–3 prompt changes per week and each requires more than 100 examples reviewed. Hamel Husain's observation across 30+ AI product engagements: teams hit this wall within 2–3 months of launching an AI feature. The recommended progression: start with 100% human review of a small set (20–50 examples) to build intuition and calibrate a judge, then automate via LLM-as-judge aligned to human labels, then reduce human review to periodic calibration checks (10–20 examples per week).",
        category: "Operational"
      },
      {
        question: "Does nondeterminism mean I can't do regression testing at all?",
        answer: "No — you can do regression testing, but the unit of comparison is a distribution, not a single value. Run your eval suite K times (K=3 is usually sufficient for product decisions) and compare the median pass rate between the new version and the baseline version. A change that moves the median from 75% ± 3% to 85% ± 2% is a detectable and real improvement. Tools like DeepEval, Braintrust, and Weave support this with statistical significance testing. The key mental model: regression testing for LLMs is more like A/B testing than unit testing — you're comparing distributions, not asserting exact values.",
        category: "Testing Strategy"
      },
      {
        question: "What's the actual cost breakdown of manual vs. automated eval at a startup?",
        answer: "Manual review: $0.02–$0.10 per example for crowdworkers; $5–$20/hour for domain experts; $50–$200/hour for specialist reviewers in legal, medical, or financial domains. At 500 examples per eval run and weekly cadence, crowdworker cost is $500–$2,600/month before tooling overhead. Automated LLM-as-judge using GPT-4o-mini: ~$0.0001–$0.0005 per example for typical judge prompts — 100–1000× cheaper. The economic argument for automation is overwhelming at scale; redirect the human review budget to calibration (20 examples/week) and adversarial red-teaming.",
        category: "Operational"
      },
      {
        question: "How do I convince a non-technical stakeholder to invest in eval infrastructure?",
        answer: "Use the software testing analogy, then the cost calculation. Most non-technical stakeholders understand that software without tests ships bugs. LLM applications without eval infrastructure ship quality regressions silently — except unlike software bugs that cause crashes (which are visible), LLM quality regressions cause subtly worse responses that accumulate into user churn. Then show the cost math: if you ship one bad prompt change per month that costs 5% of your user base, and user LTV is $100, a 10,000-user base loses $50,000/month to undetected regressions. The eval infrastructure costs $100/month. This framing converts eval from engineering cost to business insurance.",
        category: "Communication"
      }
    ],

    practiceProblems: [
      "**Problem:** You are building a code-generation assistant. Write 5 property-based assertions for its outputs that do NOT rely on exact string matching. For each, explain why exact matching would fail. **Answer:** (1) `code_executes_without_syntax_error(output)` — exact match fails because variable names, whitespace, and comment style all vary; (2) `passes_provided_test_cases(output, test_suite)` — functional correctness regardless of implementation style; (3) `not contains_hardcoded_credentials(output)` — security property detectable by regex on specific patterns (not content); (4) `uses_requested_programming_language(output, requested_lang)` — structural property checkable by a fast classifier; (5) `cyclomatic_complexity(output) <= max_threshold` — maintainability property. Exact match fails on all five because two correct implementations of the same function always differ in identifier names and style.",
      "**Problem:** Your team's eval suite is at 92% pass rate on Monday. By Thursday (no deploys), it's at 73%. Walk through the diagnostic checklist for each nondeterminism layer and name the specific check you'd run for each. **Answer:** Layer 1 (sampling): re-run the suite 3 times immediately — if results cluster within ±2%, sampling variance is ruled out (a 19-point swing is not sampling noise). Layer 2 (context): check trace logs for retrieval score distributions — did the retrieval recall change? Was the vector DB reindexed? Did any knowledge base documents change? Check the embedding model version. Layer 3 (model update): check the model version string in traces from Monday vs. Thursday — providers sometimes push silent updates mid-week. Subscribe to provider changelogs/status pages.",
      "**Problem:** Design a property assertion suite (minimum 5 properties) for a medical symptom information chatbot. For each property, specify how it's checked (regex, external API, NLI classifier, etc.). **Answer:** (1) `no_dosage_recommendations(output)` — regex for patterns like 'take X mg'; medical advice outside scope, checked by dosage-pattern regex; (2) `contains_disclaimer(output)` — regex for 'consult a doctor' or similar; (3) `no_hallucinated_drug_names(output)` — cross-check any drug names mentioned against an approved drug database (RxNorm API); (4) `reading_grade_level_accessible(output)` — Flesch-Kincaid grade level ≤ 8, computed by readability library; (5) `not_contradicts_source_documents(output, retrieved_docs)` — NLI-based faithfulness check: each factual claim in output is entailed by at least one retrieved document."
    ],

    references: [
      {
        source: "blog",
        attribution: "Hamel Husain — 'Your AI Product Needs Evals' (2023) - https://hamel.dev/blog/posts/evals/",
        insight: "Foundational practitioner guide to LLM evaluation; introduces the two-level eval framework and the economics argument for automation."
      },
      {
        source: "blog",
        attribution: "Eugene Yan — 'Evals for LLMs' (2024) - https://eugeneyan.com/writing/evals/",
        insight: "Comprehensive treatment of classification, summarization, and translation eval metrics with practical code examples."
      },
      {
        source: "blog",
        attribution: "Chen et al. — 'How is ChatGPT's behavior changing over time?' arXiv:2307.09009 (2023) - https://arxiv.org/abs/2307.09009",
        insight: "Empirical evidence that GPT-3.5 and GPT-4 behavior drifts significantly across API updates even at temperature=0; the primary justification for model version pinning."
      },
      {
        source: "book",
        attribution: "Chip Huyen — 'AI Engineering' (O'Reilly, 2025) - https://www.oreilly.com/library/view/ai-engineering/9781098166298/",
        insight: "Chapter on evaluation frameworks covers the eval pyramid, offline vs. online metrics, and the economic argument for automated evals at scale."
      },
      {
        source: "note",
        attribution: "OpenAI — Model optimization and evals documentation - https://developers.openai.com/api/docs/guides/evals",
        insight: "Documents why identical API inputs may produce different outputs; covers seed parameter and version-pinning best practices."
      },
      {
        source: "blog",
        attribution: "Shreya Shankar — 'Rethinking LLM Evals' (2023) - https://www.shreya-shankar.com/rethinking-llm-evals/",
        insight: "Research on inter-annotator agreement in LLM eval and the meta-problem of evaluating evaluators; grounded in study of ML teams in production."
      }
    ]
  },
  {
    id: "topic-ai-evaluation-pyramid",
    moduleId: "mod-ai-evaluation",
    title: "The Eval Pyramid: From Unit Assertions to Production Monitoring",
    intuition: "Just as the traditional test pyramid has fast, cheap unit tests at the base and slow, expensive E2E tests at the top, LLM evaluation has a four-layer structure — and the shape of the pyramid (many cheap tests, few expensive ones) tells you exactly where to invest your time and budget at each stage of product maturity.",

    complexity: {
      time: "Layer 1 (unit assertions): <1ms per check, runs inline. Layer 2 (component evals): seconds to minutes per benchmark run. Layer 3 (E2E golden-set eval): minutes for a 100-example suite, up to an hour for 1,000 examples with a powerful judge. Layer 4 (online monitoring): asynchronous, continuous — latency budget is decoupled from inference path.",
      space: "Layer 1: negligible. Layer 2: benchmark dataset storage (MBs). Layer 3: golden dataset + eval run history (MBs to GBs over time). Layer 4: trace storage at production scale (GBs/day at high request volumes — see Topic A6 for trace storage estimates)."
    },

    lesson: [
      {
        title: "The Four Layers and What Belongs at Each",
        content: "The eval pyramid for LLM systems has four layers, each more realistic and more expensive than the one below. Layer 1 (Unit Assertions): fast, cheap, deterministic property checks — is output valid JSON? does it contain PII patterns? is it under 500 characters? runs in milliseconds, costs nothing beyond compute. Layer 2 (Component Evals): evaluating a single pipeline stage in isolation — is retrieval recall above 0.8 on this benchmark? does the reranker improve NDCG? Layer 3 (End-to-End Evals): full pipeline from user input to final output, measured against a golden dataset with LLM-judge or human labels. Layer 4 (Online/Production Monitoring): real user traffic, implicit and explicit feedback signals, guardrail metrics, drift detection. The pyramid shape is intentional: hundreds of unit assertions, dozens of component evals, one curated E2E golden set (100–500 examples), continuous online monitoring. Each layer catches failure modes the layer below misses — a passing retrieval component eval doesn't guarantee good E2E response quality; a passing E2E offline eval doesn't guarantee production quality on unseen distribution.",
        diagram: asciiDiagram(`
         ┌─────────────────────────────────────────────────────┐
         │   LAYER 4: Online Monitoring (production traffic)   │
         │   Realistic | Expensive | Catches distribution shift│
         │   ● A/B tests  ● Thumbs up/down  ● Drift alerts    │
         ├─────────────────────────────────────────────────────┤
         │   LAYER 3: End-to-End Evals (golden dataset)        │
         │   ~100-500 examples | LLM judge | Minutes to run    │
         │   ● Task completion  ● LLM-as-judge  ● Human spot   │
         ├─────────────────────────────────────────────────────┤
         │   LAYER 2: Component Evals (single pipeline stages) │
         │   Benchmark datasets | Seconds | Localizes bugs     │
         │   ● Retrieval recall  ● Reranker NDCG  ● Tool acc  │
         ├─────────────────────────────────────────────────────┤
         │   LAYER 1: Unit Assertions (programmatic checks)    │
         │   100s of checks | &lt;1ms each | Zero API cost        │
         │   ● JSON valid  ● PII absent  ● Length  ● No TODO   │
         └─────────────────────────────────────────────────────┘
              Fast / Cheap / Many ──────► Slow / Expensive / Few`)
      },
      {
        title: "Layer 1: Unit Assertions — Contracts, Not Quality",
        content: "Unit assertions are programmatic, deterministic checks that enforce structural and safety contracts — they are NOT evaluating semantic quality. Good unit assertions: output is valid JSON (for structured outputs), output length is within bounds, no PII patterns (SSN, credit card, email regex), no profanity for a family application, no competitor brand names, output is in the requested language, no un-substituted template placeholders like '{{CLIENT_NAME}}'. These should run on every inference in both CI and production as inline post-processing guards. If a unit assertion fires in production, the response is replaced with a safe fallback rather than served to the user. Hamel Husain's principle: 'If you can't measure these, you don't have an eval system at all.' They cost nothing to run (no API calls), catch the most embarrassing failures, and serve as the first line of defense even before the eval pipeline is built.",
        codeExample: `import re, json

  def run_unit_assertions(response: str, context: dict) -> dict[str, bool]:
      """
      Returns a pass/fail per assertion. All must pass before serving.
      These run inline in the request path — must be fast (<1ms).
      """
      results = {}
      
      # --- Structural assertions ---
      try:
          json.loads(response)
          results["valid_json"] = True
      except json.JSONDecodeError:
          results["valid_json"] = False
      
      # --- Safety assertions ---
      PII = [
          r"\b\d{3}-\d{2}-\d{4}\b",                          # SSN
          r"\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b",    # Credit card
          r"\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b",  # Email
      ]
      results["no_pii"] = not any(re.search(p, response) for p in PII)
      
      # --- Template hygiene assertions ---
      results["no_template_artifacts"] = (
          "{{" not in response and 
          "}}" not in response and 
          "TODO" not in response and
          "[INSERT" not in response.upper()
      )
      
      # --- Format assertions ---
      word_count = len(response.split())
      results["length_in_range"] = 10 <= word_count <= 500
      
      return results  # Caller must gate on all values being True`
      },
      {
        title: "Layer 2: Component Evals — Localizing Failures in Multi-Stage Pipelines",
        content: "For a RAG or agentic system with multiple components (retriever, reranker, query rewriter, tool router, generator), each stage can fail independently. Component evals test each stage against a dedicated benchmark in isolation. For retrieval: recall@k (what fraction of relevant documents were retrieved?), MRR (mean reciprocal rank of the first relevant document), NDCG (normalized discounted cumulative gain). For reranking: does NDCG improve vs. retrieval-only? For tool call routing: accuracy of selecting the correct tool given an intent. For summarization: ROUGE, BLEURT, or NLI-based consistency. The value of component evals is failure localization: when E2E quality drops, component evals pinpoint which stage degraded in minutes. Without them, debugging a 5-stage pipeline requires blind guessing. The investment: component evals require component-level labeled datasets (a retrieval benchmark takes 1–3 days to build) but pays off enormously when pipelines are complex or when individual components change independently.",
        diagram: asciiDiagram(`
  USER QUERY
      │
      ▼
  ┌─────────────┐   Component Eval: query expansion accuracy
  │ Query       │   "TSLA price" → ["TSLA", "Tesla stock", "Tesla price"] ✓
  │ Rewriter    │
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐   Component Eval: Recall@5, NDCG@5
  │  Retriever  │   100 labeled queries; recall@5 = 0.82; NDCG@5 = 0.71
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐   Component Eval: NDCG improvement
  │  Reranker   │   Without reranker: 0.71 → With: 0.79  (+11%) ✓
  └──────┬──────┘
         │
         ▼
  ┌─────────────┐   Layer 3 E2E Eval: answer quality
  │  Generator  │   LLM-judge on golden set: 87% pass
  └─────────────┘`)
      },
      {
        title: "Layer 3: End-to-End Evals — The Primary Go/No-Go Signal",
        content: "E2E evals run the full pipeline from raw user input to final output and score the output against a curated golden dataset (see Topic A3). The eval is scored by LLM-as-judge (Topic A4), with periodic human spot-checks to verify the judge is calibrated. E2E evals are the primary signal for deployment decisions — go/no-go for releases, regression detection between prompt versions, and benchmarking alternative architectures. Critical design choices: the golden dataset is frozen and versioned so results are comparable over time; the judge prompt and scorer model are also versioned; the suite runs on every PR merge and as a nightly job. E2E evals take minutes to hours (too slow for inline request path) and cost money (LLM judge API calls), so they never run synchronously. For large suites (>1,000 examples), sub-sample for CI runs (100 examples, stratified) and run the full suite nightly.",
        codeExample: `from dataclasses import dataclass
  from typing import Callable

  @dataclass
  class EvalCase:
      id: str
      input: dict              # Full pipeline input: {query, context, history}
      reference: str           # Optional golden reference answer
      required_facts: list[str]  # Must appear in output
      forbidden_content: list[str]  # Must NOT appear
      category: str            # For per-category breakdown

  def run_e2e_eval(
      pipeline: Callable,
      eval_set: list[EvalCase],
      judge: Callable,
      sample_rate: float = 1.0
  ) -> dict:
      cases = eval_set[:int(len(eval_set) * sample_rate)]
      results = []
      for case in cases:
          output = pipeline(case.input)
          score = judge(input=case.input, output=output,
                        reference=case.reference,
                        required_facts=case.required_facts)
          results.append({"id": case.id, "score": score,
                          "category": case.category})
      
      pass_rate = sum(r["score"]["pass"] for r in results) / len(results)
      by_category = {cat: sum(r["score"]["pass"] for r in results 
                             if r["category"] == cat) 
                     for cat in set(r["category"] for r in results)}
      return {"pass_rate": pass_rate, "by_category": by_category,
              "n": len(results), "results": results}`
      },
      {
        title: "Layer 4: Online Monitoring — Where the Pyramid Meets Reality",
        content: "Online monitoring is covered in depth in Topic A7, but the pyramid framing is critical here: no amount of offline eval work eliminates the need for online monitoring, because distribution shift is constant and real. Online monitoring includes explicit feedback (thumbs up/down, star ratings), implicit signals (user rephrases, conversation abandonment, task completion), guardrail metrics (refusal rate, safety classifier rate, latency p95), and shadow evals (running a new model version silently alongside production to compare quality offline). The pyramid metaphor communicates prioritization: build Layers 1–3 in order, but don't mistake a strong Layer 3 for production confidence — you need all four layers for a mature system. A common mistake is building a beautiful offline eval (Layer 3) and skipping online monitoring (Layer 4), then being surprised when the production experience degrades while eval scores stay green."
      }
    ],

    examples: [
      {
        title: "Component Eval Localizes a Retrieval Regression",
        input: "Customer support chatbot. Team upgrades the retriever from BM25 to a dense vector model. E2E eval pass rate drops from 88% to 71%. No one knows why.",
        output: "Component eval diagnosis: BM25 retrieval recall@5 = 0.81; dense retriever recall@5 = 0.74 (worse). Root cause: the dense embedding model was not trained on the company's domain vocabulary (product SKUs like 'XR-500' and internal acronyms). BM25's exact-match capability handled these better. The 17-point E2E drop is fully explained by the retrieval regression. Fix: hybrid retrieval (BM25 + dense) or fine-tune the embedding model on domain vocabulary. Without Layer 2 component evals, the team would have spent days inspecting the generator prompt.",
        explanation: "This is the primary ROI of component evals in multi-stage pipelines: failure localization from 'we don't know' to 'this specific stage degraded' in minutes, not days."
      },
      {
        title: "Unit Assertion Catches Template Bug That E2E Eval Misses",
        input: "Legal document summarization tool. E2E eval pass rate: 94% (excellent). Bug: when the `client_name` field is empty, the prompt template leaves `{{CLIENT_NAME}}` un-substituted. Occurs in ~3% of production requests.",
        output: "Unit assertion `'{{' not in output` fires immediately for the affected requests. E2E eval misses this because: (1) the golden dataset was built from well-formed inputs with all fields populated; (2) the 6% failure rate in E2E is from unrelated quality issues, not the template bug. The unit assertion runs inline in every request path and catches the template artifact before the user sees it.",
        explanation: "This illustrates why Layers 1 and 3 are complementary, not substitutes. E2E evals measure semantic quality on representative inputs; unit assertions catch structural and safety violations that golden sets may not cover. A 94% E2E pass rate can coexist with a critical production bug that affects 3% of requests."
      },
      {
        title: "Layer Sequencing for a New Feature Rollout (2-Week Plan)",
        input: "You've shipped a new 'explain this medical term in plain language' feature. You have 2 weeks to build eval infrastructure. Prioritize the work.",
        output: "Week 1, Day 1: Unit assertions (2 hours) — no made-up drug names, no dosage instructions, valid response length, no PII. Day 2–4: Build a golden dataset of 50 examples (25 common terms, 15 rare terms, 10 adversarial inputs). Day 5: Calibrate LLM judge on 20 human-labeled examples. Week 2, Day 1–2: Integrate E2E eval into CI (PR-triggered, 50-example sub-sample, 5-minute target). Day 3–5: Production logging + implicit feedback (thumbs up/down), basic latency and cost monitoring.",
        explanation: "Layer 1 comes first because it's fast and catches safety issues immediately. The golden dataset and judge are the minimum for Layer 3. Online monitoring (Layer 4) comes last because you need production traffic to exist first. This sequencing matches Hamel Husain's recommended onboarding order for new AI features."
      }
    ],

    tips: [
      "Build Layer 1 (unit assertions) before everything else — they're free, fast, and prevent the most embarrassing failures.",
      "Layer 2 (component evals) pays its largest dividend when you have a multi-stage pipeline — invest in them before debugging an E2E drop.",
      "Your E2E golden set (Layer 3) is a living artifact — add one failure case from production every sprint.",
      "Don't confuse a passing Layer 3 eval with production confidence — you need Layer 4 online monitoring for distribution shift.",
      "Run Layers 1–2 inline or in CI, Layer 3 in CI (full suite nightly, sub-sampled on PR), Layer 4 asynchronously in production."
    ],

    tricks: [
      "When debugging an E2E quality drop, check Layer 2 component evals before touching the generator prompt — 60-70% of E2E failures trace to an upstream component, not the final generation step.",
      "Run your Layer 1 unit assertions on a sample of your golden dataset examples as a sanity check — if they fail on known-good examples, your assertions are misconfigured.",
      "For Layer 3, always report pass rate broken down by category (happy path, edge case, adversarial) — an overall 85% with 100% on happy paths and 40% on adversarial is a very different problem than a uniform 85%.",
      "Size Layer 3 to the statistical power you need: ~200 examples gives you 80% power to detect a 5% pass-rate change; 50 examples only detects 10%+ changes reliably.",
      "When your Layer 2 retrieval eval shows no regression but E2E drops, the problem is usually in how the generator uses the retrieved context — check the prompt formatting and context injection logic."
    ],

    memoryAids: [
      "UCEO: Unit → Component → End-to-end → Online. The four pyramid layers in order. 'Until Costs Escalate Overwhelmingly.'",
      "The width of each pyramid layer represents how many of each to build: hundreds of unit assertions, dozens of component evals, one E2E suite, one online monitor.",
      "'Which layer does this failure live in?' is the first debugging question — localizing to a layer is 90% of the diagnosis."
    ],

    interviewPatterns: [
      "\"Design an eval system for a RAG-based Q&A chatbot for internal company documents.\" — Walk all four pyramid layers explicitly with specifics for each layer.",
      "\"How would you know if a change you made improved the system?\" — Layer 3 regression eval against frozen golden set + version-pinned judge, compare pass rate distributions.",
      "\"Our pipeline has 5 stages. How do you know which stage is causing quality issues?\" — Layer 2 component evals with stage-specific benchmarks for retrieval, reranking, and generation separately.",
      "\"What's the difference between offline and online evaluation?\" — Offline tests the distribution you designed for; online reveals real user behavior and distribution shift.",
      "\"How do you prevent quality regressions when you update a prompt?\" — Layer 3 CI eval gated on pass-rate threshold with per-dimension tracking."
    ,
    "Frequency and companies: Tier 1 (90%+) — 'Design an eval system' is the canonical AI SWE interview question; the pyramid is the expected answer structure.. Interview relevance: interview-tested. Content stability: stable."
  ],

    faq: [
      {
        question: "How many examples do I need in my E2E eval set (Layer 3)?",
        answer: "The minimum viable set is 50–100 examples for early-stage products — enough to catch regressions larger than 10 percentage points. For production-grade regression detection at 5% sensitivity, ~200 examples is the practical minimum assuming 80% statistical power. For mature products, 500–1,000 examples provides coverage of the long tail. More important than size is coverage: 100 examples spanning the key failure modes (happy path, edge cases, adversarial, OOD) beats 1,000 near-identical happy-path examples. Hamel Husain's heuristic: start with 20 human-labeled examples for judge calibration, build to 100 with expert-authored and synthetic data, then grow to 500+ from production traffic.",
        category: "Practical Sizing"
      },
      {
        question: "Can I skip Layer 2 component evals if my E2E eval is comprehensive?",
        answer: "You can, for simple single-stage pipelines. For any multi-stage system (retrieval + generation, agent with multiple tool calls, multi-step reasoning), skipping component evals means debugging blindly when E2E quality drops. The ROI calculation: a retrieval eval takes one day to build and instantly tells you when a retrieval change caused an E2E regression. Without it, you'll spend 4–8 hours guessing whether the problem is retrieval, prompt formatting, or generation. For pipelines with 3+ stages, component evals are not optional.",
        category: "Testing Strategy"
      },
      {
        question: "Should unit assertions block the response at runtime, or only flag for logging?",
        answer: "Critical safety assertions (no PII output, no prohibited content, valid required format) should block the response at runtime — return a safe fallback rather than serve the bad output. Non-critical format assertions (length preference, reading level) should log rather than block. The guiding principle: would a user be harmed or significantly confused by seeing this output? If yes, block. If it's just a quality issue, log and fix in the next deployment cycle. This 'block-vs-log' split is also important operationally: too many blocking assertions creates availability risk (if the assertion has a false positive rate of 1%, at 1M requests/day you're blocking 10,000 valid responses).",
        category: "Architecture"
      },
      {
        question: "What's the relationship between the eval pyramid and traditional software's test pyramid?",
        answer: "The shapes are analogous (many cheap tests at bottom, few expensive at top) but the layers differ. Traditional: unit → integration → E2E tests. LLM: unit assertions → component evals → E2E golden-set evals → online monitoring. Key differences: LLM 'unit tests' don't test correctness for a single input — they test structural properties that are invariant across all valid outputs. LLM 'E2E tests' require semantic judges (human or LLM), not just pass/fail assertions. Online monitoring (Layer 4) has no meaningful analog in traditional software because LLM applications face ongoing distribution shift that deployed traditional software doesn't.",
        category: "Conceptual"
      },
      {
        question: "How does this scale for a company processing millions of LLM requests per day?",
        answer: "Layers 1–2 scale without cost (no API calls). For Layer 3: sample 0.1–1% of production traffic for continuous judging — at 1M requests/day and 1% sample rate, that's 10,000 judged examples/day, providing excellent statistical power. Cost: 10,000 × $0.001/judge call = $10/day = $300/month. Layer 4 online monitoring runs on all traffic but uses lightweight signals (implicit behavior, latency metrics) — no LLM calls required. The pyramid is explicitly designed to have each layer's cost proportional to its frequency: Layer 1 runs 100% of requests at near-zero cost; Layer 3 samples 0.1–1% at moderate cost; Layer 4 aggregates metrics from 100% of traffic without per-request LLM cost.",
        category: "Scale"
      },
      {
        question: "How do I decide what belongs at Layer 1 vs. Layer 3?",
        answer: "Layer 1 = anything checkable without an LLM, deterministically, in milliseconds. Layer 3 = anything requiring semantic understanding of quality. If you can write the check as a regex, a JSON schema validator, a length check, or a lookup against an allow/deny list, it belongs in Layer 1. If you need to ask 'is this response helpful/accurate/appropriate?', it belongs in Layer 3 (using an LLM judge). Ambiguous cases: hallucination detection (checking if a claim is supported by retrieved documents) can be Layer 1 using exact-string matching for required facts, or Layer 3 using NLI-based faithfulness. Start with the Layer 1 approximation; upgrade to Layer 3 only when the Layer 1 check produces too many false positives.",
        category: "Design"
      }
    ],

    practiceProblems: [
      "**Problem:** Design the eval pyramid for a 'generate a performance review' tool. For each of the four layers, list 3 specific eval items. **Answer:** Layer 1 (unit): output is 200–600 words; no employee SSN/DOB in output; no discriminatory language patterns (regex for protected-class terms used inappropriately). Layer 2 (component): if accomplishments are extracted from freeform notes, test extraction recall@K on a labeled set. Layer 3 (E2E golden set): LLM judge rubric — professional tone, all provided accomplishments mentioned, constructive framing, no hallucinated accomplishments. Layer 4 (online): HR manager accept-without-edit rate, time-to-approve, manager re-generation rate (implicit dissatisfaction signal).",
      "**Problem:** You are told 'our E2E eval scores are great but users are complaining.' Name 3 root causes and the eval pyramid layer that would catch each. **Answer:** (1) Distribution shift — users ask things not in eval set (Layer 4 online monitoring and embedding-based coverage analysis of production vs. eval); (2) A retrieval component degraded — the generator covers it with plausible-but-wrong text (Layer 2 component eval catches the retrieval regression independently); (3) Unit assertion gap — outputs have a formatting bug that looks fine to the judge but annoys users (Layer 1 needs a new assertion for the specific formatting requirement).",
      "**Problem:** You have a 3-stage LLM pipeline: query rewriter → retriever → generator. Write out the specific metric you'd track at Layer 2 for each stage and what a regression in each would look like. **Answer:** Query rewriter — query expansion accuracy on a 200-query labeled test set; regression looks like intent preservation dropping below 90% (rewriter changes the query in ways that lose the original intent). Retriever — recall@5 on a 500-query labeled benchmark with known relevant documents; regression looks like recall@5 dropping more than 3 points from baseline. Generator — factual consistency on held-out QA pairs (given the retrieved docs, does the answer correctly reflect them?); regression looks like faithfulness score dropping, indicating the generator is ignoring context or hallucinating."
    ],

    references: [
      {
        source: "blog",
        attribution: "Hamel Husain — 'Your AI Product Needs Evals' - https://hamel.dev/blog/posts/evals/",
        insight: "Introduces the two-level assertion/model-eval framework that maps to Layers 1–3 of the pyramid; foundational practitioner guide."
      },
      {
        source: "blog",
        attribution: "Shreya Shankar — 'Who Validates the Validators?' (2023) - https://www.shreya-shankar.com/rethinking-llm-evals/",
        insight: "Research on inter-annotator agreement and the meta-problem of evaluating LLM evaluators; informs Layer 3 judge calibration."
      },
      {
        source: "book",
        attribution: "Chip Huyen — 'AI Engineering' (O'Reilly, 2025), Chapter 4 - https://www.oreilly.com/library/view/ai-engineering/9781098166298/",
        insight: "Comprehensive treatment of eval methodology with the offline/online distinction and production case studies."
      },
      {
        source: "note",
        attribution: "Confident AI — DeepEval documentation: metrics and eval layers - https://docs.confident-ai.com/",
        insight: "Open-source framework implementing all four pyramid layers with metric implementations and CI integration."
      },
      {
        source: "note",
        attribution: "Braintrust — 'Building an Eval System' documentation - https://www.braintrustdata.com/docs",
        insight: "Practical implementation guide for Layer 3 with CI integration, dataset versioning, and result comparison."
      },
      {
        source: "blog",
        attribution: "Voiceflow Engineering — 'How Much Do ChatGPT Versions Affect Real-World Performance?' (2023) - https://www.voiceflow.com/blog/how-much-do-chatgpt-versions-affect-real-world-performance",
        insight: "Case study showing a 10% performance drop when upgrading gpt-3.5-turbo versions; validates the canary eval and Layer 4 monitoring approach."
      }
    ]
  },
  {
    id: "topic-ai-evaluation-golden-datasets",
    moduleId: "mod-ai-evaluation",
    title: "Golden Datasets & Offline Eval Sets",
    intuition: "A golden dataset is the single source of truth for offline evaluation — a curated, versioned, contamination-free collection of inputs and expected behaviors. Without it, you're shipping on vibes. With a poorly constructed one, you're shipping on false confidence, which is worse.",

    complexity: {
      time: "Construction: 10–30 min/expert-authored example; ~2 min/production-sampled-and-labeled example; ~5 seconds/synthetic-generated example (LLM call). Deduplication with embedding + cosine similarity: O(N²) comparisons but parallelizable; a 1,000-example set takes under 1 minute on a modern workstation. Eval run time is determined by the judge, not the dataset size directly.",
      space: "Dataset storage: O(N × example_size). Each example with metadata: ~2–10KB. A 1,000-example set: 2–10MB as JSONL — trivially small. Embedding index for deduplication/coverage: 1,000 × 1,536 floats = ~6MB for text-embedding-3-small. Total golden dataset infrastructure: negligible."
    },

    lesson: [
      {
        title: "What Makes a Golden Dataset Good — the RCCD Properties",
        content: "A golden dataset (also: held-out eval set, benchmark set, test suite) is a collection of (input, evaluation criteria) pairs that are frozen and used to measure system quality over time. Unlike training data, golden data must never be used for model training or fine-tuning — contamination is the cardinal sin that invalidates all scores produced by that dataset. A good golden set has four properties (RCCD): Representativeness — the distribution of query types, difficulty levels, and topics matches production traffic; Coverage — edge cases, adversarial inputs, and rare-but-important failure modes are included, not just easy happy-path examples; Correctness — each example's expected output or rubric is verified by a domain expert; Diversity — no clustering of near-identical examples that inflate apparent coverage while providing no additional discriminative power. The minimum viable eval set is 50–100 examples covering all major feature scenarios. Production-grade systems have 500–5,000 examples grown incrementally from real traffic. The quality ceiling principle: a perfectly calibrated LLM judge on a poorly constructed golden set produces meaningless scores — the dataset quality is the ceiling of your entire eval quality.",
        diagram: asciiDiagram(`
  GOOD GOLDEN DATASET COMPOSITION
  ──────────────────────────────────────────────────────────
  Category            | Examples | Coverage Goal
  ────────────────────┼──────────┼────────────────────────────
  Happy path          |    30%   | Most common user queries
  Edge cases          |    25%   | Boundary conditions, rare inputs
  Adversarial         |    20%   | Injection attempts, jailbreaks
  Rare but critical   |    15%   | Low-frequency, high-stakes
  Out-of-scope        |    10%   | Queries the system should decline

  Per-example metadata (store in JSONL):
    id            : unique, stable identifier
    version_added : eval set version when added
    source        : "expert" | "production" | "synthetic"
    category      : one of the above
    difficulty    : "easy" | "medium" | "hard"
    content_hash  : SHA256 of input text (for dedup detection)`)
      },
      {
        title: "Sourcing: Three Strategies and How to Combine Them",
        content: "There are three primary sourcing strategies and the best golden sets use all three in a deliberate mix. Expert-authored examples: a domain expert writes (query, ideal answer) pairs from scratch. Highest quality, but slow (10–30 minutes per complex example) and expensive. Best for covering known failure modes and critical edge cases that production data doesn't naturally surface. Production traffic sampling: sample real user queries from production logs (anonymized and PII-stripped), label the ideal response with expert review. Most realistic distribution — this is how real users actually phrase requests. Requires stratified temporal sampling to avoid over-representing recent trending topics. Synthetic generation: use a stronger model (GPT-4o, Claude Sonnet) to generate (query, answer) pairs for specified scenarios. Fast (hundreds of examples per hour), cheap ($0.001–0.01 each), but synthetic data has known coverage gaps — it won't generate the weird, adversarial, or ambiguous inputs real users produce. Safe use: generate queries synthetically, have humans label the correct responses. Never use synthetic data as the sole source. Recommended mix for a production system: 40% production-sampled (human-labeled), 35% expert-authored (edge cases), 25% synthetic (coverage gap-filling). This ratio from Hamel Husain's client work across 30+ AI products.",
        codeExample: `# Stratified sampling from production logs
  import pandas as pd

  def sample_golden_dataset(
      logs: pd.DataFrame,  # columns: query, response, timestamp, category
      n_total: int = 200,
      strategy: dict | None = None
  ) -> pd.DataFrame:
      strategy = strategy or {
          "happy_path": 0.30,
          "edge_case": 0.25,
          "adversarial": 0.20,
          "rare_critical": 0.15,
          "out_of_scope": 0.10
      }
      samples = []
      for category, fraction in strategy.items():
          n = int(n_total * fraction)
          category_df = logs[logs["category"] == category]
          if len(category_df) == 0:
              continue
          # Temporal stratification: sample from each week equally
          weekly = category_df.groupby(
              pd.Grouper(key="timestamp", freq="W")
          ).apply(lambda x: x.sample(min(len(x), max(1, n // 12))))
          samples.append(weekly.head(n))
      return (pd.concat(samples)
                .drop_duplicates(subset=["query"])
                .reset_index(drop=True))`
      },
      {
        title: "Contamination — The Cardinal Sin",
        content: "Contamination occurs when data from your eval set influences the model's training — directly (eval examples appear in fine-tuning data) or indirectly (eval failures are used to craft few-shot examples in the system prompt, which is then re-evaluated on the same failures). Contamination inflates scores and gives false confidence in a way that causes real-world failures when the system is deployed. Prevention strategies: (1) Hard separation — eval data must never enter any training pipeline; store in a separate, access-controlled repository; (2) Temporal splits — eval data should come from time periods after any fine-tuning data cutoff; (3) Deduplication — run cosine-similarity-based near-duplicate detection between the eval set and all fine-tuning data before either is used; (4) Prompt development discipline — when you inspect eval failures to improve your prompt, add new examples to the eval set to prevent regression, but do not use the specific failing examples as the 'fix' target. The hardest contamination to prevent is subtle: using eval failures to inform few-shot examples in the system prompt, then testing on the same eval set. The system prompt was effectively fine-tuned to the eval set, producing an inflated score. This shows up as a gap between eval performance and production performance.",
      },
      {
        title: "Versioning the Golden Dataset — Treating It as a Code Artifact",
        content: "The golden dataset is a versioned artifact, not a living document. Every time you add, remove, or modify examples, increment the version and record the change. Eval scores from different dataset versions are not comparable — a jump from 82% to 91% means nothing if the dataset changed between runs (you may have removed hard examples). Storage: keep the golden dataset in git as a JSONL file with one JSON object per line. Metadata per example: id, version_added, source, category, difficulty, content_hash. Eval run records must include: eval_set_version, judge_version (the specific prompt + model used for judging), model_version, timestamp, and per-example results. This metadata is what makes eval results reproducible and comparable over time. Commercial tools (Braintrust, LangSmith, Weave) provide UI for this. For teams without tooling budget: git-versioned JSONL + a Python script writing results to a timestamped CSV with metadata fields is completely sufficient.",
        codeExample: `# Golden dataset example record (JSONL format, one line = one example)
  {
    "id": "gs-0047",
    "version_added": "v2.1.0",
    "source": "production",
    "category": "edge_case",
    "difficulty": "hard",
    "content_hash": "a3f2c1d8e9...",
    "input": {
      "query": "What's the refund policy if I bought during the trial?",
      "context": "User has an active subscription, converted from 14-day trial"
    },
    "reference_answer": "Trial conversions are eligible for a 7-day refund window...",
    "required_facts": ["7 days", "trial conversion", "subscription"],
    "forbidden_content": ["30-day policy", "physical goods"],
    "rubric": {
      "accurate": "States correct 7-day window for trial conversions",
      "contextual": "Distinguishes trial conversion from regular subscription",
      "actionable": "Tells user what steps to take to request refund"
    }
  }`
      },
      {
        title: "Coverage Analysis and Growing the Dataset Over Time",
        content: "Size alone is insufficient — a 1,000-example set where 800 examples are near-identical 'how do I return my order?' variants has worse coverage than a 200-example set with genuine diversity. Coverage analysis: embed all eval queries, cluster with k-means (k=10–20 for a 200-example set), and verify each cluster is represented. Any cluster with fewer than 3 examples is under-represented. For production coverage validation: embed a sample of recent production queries and compare cluster distributions to the eval set. Any production cluster accounting for >5% of traffic that's absent from the eval set is a coverage gap. The growth strategy: after every production incident or quality complaint, add the triggering example to the golden set and write a regression test for it. This incident-driven golden set growth is how mature systems build coverage of the long tail. Also: every time you run a red-teaming session (trying to break the system), add the successful attack variants to the adversarial category."
      }
    ],

    examples: [
      {
        title: "Contamination Discovered: The Eval That Was Too Good",
        input: "Team builds a legal contract review assistant. Fine-tunes on 500 examples, then evaluates on 200 examples. Eval shows 96% pass rate. Production complaints arrive immediately — users report wrong summaries.",
        output: "Investigation: 40% of eval examples were drawn from the same source documents used to generate fine-tuning examples (same client contracts, overlapping clauses). Near-duplicate queries appear in both sets. The fine-tuned model memorized patterns that happened to match the eval, but failed to generalize. True performance on held-out production contracts: 61%. The 35-percentage-point gap between eval (96%) and production (61%) is the signature of contamination.",
        explanation: "The fix: run MinHash or cosine-similarity deduplication between fine-tuning data and eval data BEFORE training. Temporal splitting (eval from Q3, training from Q1–Q2) also reduces risk. The lesson: if your eval score seems suspiciously high, contamination is the first hypothesis."
      },
      {
        title: "Building a 200-Example Golden Set in 3 Hours with an Expert",
        input: "E-commerce support chatbot, 10,000 queries/day. You have 3 hours of a domain expert's time. Build a 200-example golden set from scratch.",
        output: "Allocation: 60 queries from production logs (stratified: shipping=25, returns=20, account_issues=15), labeled by expert (40 min). 50 expert-authored edge cases: ambiguous order status, policy exceptions, angry-tone queries (90 min). 40 adversarial: attempts to get undeserved refunds, boundary-probing policy questions (40 min). 30 synthetic (generated by GPT-4o, reviewed by expert at 10% sample): rare product categories, multilingual variations (20 min). 20 OOD: competitor questions, medical advice requests, unrelated topics labeled 'should decline' (10 min). Total: 200 examples, ~150 min = fits within 3-hour budget with review time.",
        explanation: "The category mix ensures coverage of the support domain. Adversarial and OOD categories are proportionally small but disproportionately important — they're the failure modes most likely to surprise you in production. The temporal stratification in the production sample ensures no single week dominates."
      },
      {
        title: "Near-Duplicate Detection Before Adding New Examples",
        input: "You've collected 500 raw production queries to add to a 200-example golden set. How do you deduplicate to get 100 high-quality additions?",
        output: "Step 1: embed all 700 (200 existing + 500 new) with text-embedding-3-small. Step 2: for each of the 500 new queries, compute max cosine similarity to the 200 existing queries. Remove any new query with max similarity > 0.92 (near-duplicate of existing). Step 3: among remaining new queries, cluster at similarity threshold 0.85 and keep 1 per cluster (dedup within the new batch). Step 4: from the deduplicated new queries, stratified-sample 100 to maintain the category distribution of the existing set. Result: 100 genuinely new, diverse examples that extend coverage.",
        explanation: "Without this deduplication, your 200 additions would be 60% slight variations of 'how do I return my order?' — a common query that's already well-represented. Embedding-based deduplication ensures each new example adds genuine coverage value."
      }
    ],

    tips: [
      "Never use eval data for training or fine-tuning — run cosine-similarity deduplication between the two sets before either is used.",
      "Build adversarial and OOD categories from day one, even if they're only 20–30% of the set — these are the cases that bite you in production.",
      "Store the golden set in git as JSONL with every example hashed — 'what changed between eval run 47 and run 48' should be answerable in one git diff command.",
      "The eval set grows through incidents — every production failure is a future regression test.",
      "Sample temporally from production logs, not recency-biased — if you only take the last 2 weeks, you over-represent recently trending topics."
    ],

    tricks: [
      "When constructing synthetic examples, use many different generation prompts (one prompt per scenario) rather than one prompt generating many variations — diversity of generation prompt creates genuine coverage diversity.",
      "To detect coverage gaps without clustering tools: embed your eval set and your production sample, then look at the 10 production queries most distant (lowest cosine similarity) from any eval example — those are your coverage gaps.",
      "For the adversarial category, don't write attacks yourself — use a red-teaming session where a separate person (not the model's developer) tries to break it for 30 minutes, then add the successful attacks.",
      "Content_hash each example at ingestion — if an example is ever accidentally modified (even whitespace), the hash changes and you know the dataset has drifted.",
      "Add a 'staleness date' to each example — examples added before the last major product change may no longer reflect correct behavior and should be reviewed on a cadence."
    ],

    memoryAids: [
      "RCCD = four golden-set properties: Representativeness, Coverage, Correctness, Diversity. 'Really Complete, Carefully Done.'",
      "'Contamination is the cardinal sin' — if eval data and training data overlap, every score you produce is fiction.",
      "Three sources in proportion: 40% Production (real), 35% Expert (correct), 25% Synthetic (fast). 'PES = Production, Expert, Synthetic.'"
    ],

    interviewPatterns: [
      "\"How would you build an eval set for a new LLM feature if you have no production traffic yet?\" — Expert-authored + synthetic, describe the five categories (happy path through OOD), explain why you don't need 1,000 examples to start.",
      "\"How do you make sure your eval set stays representative over time as user behavior changes?\" — Monthly embedding-based coverage analysis comparing production vs. eval distribution; incident-driven growth; staleness review.",
      "\"What's the minimum number of eval examples you need?\" — 50–100 for gross regression detection; 200 for 5% sensitivity; 500+ for long-tail coverage. Coverage is more important than size.",
      "\"How do you prevent data contamination?\" — Hard separation with access controls, cosine-similarity deduplication between eval and training, temporal splits, prompt development discipline."
    ,
    "Frequency and companies: Tier 1 (90%+). Interview relevance: interview-tested. Content stability: stable."
  ],

    faq: [
      {
        question: "How many examples do I really need in my golden set?",
        answer: "50–100 examples is sufficient to catch regressions larger than 10 percentage points, appropriate for early-stage products. For production reliability where you need to detect a 5% change with 80% statistical power, you need approximately 200 examples. For A/B testing between two system versions, 500+ gives you reasonable statistical power. The more important constraint is coverage: 100 high-quality, diverse examples beats 1,000 near-duplicates every time. Coverage analysis (embedding-based clustering) is more valuable than adding more examples in the same categories you already have.",
        category: "Practical Sizing"
      },
      {
        question: "Can I use GPT-4o to generate both the queries AND the expected answers for my eval set?",
        answer: "Generating queries synthetically is fine. Generating expected answers from the same model family you're evaluating is dangerous. If GPT-4o generates both the golden answers and your production system is GPT-4o-based, the judge is checking whether GPT-4o answers match GPT-4o style — it's circular. The safe pattern: use LLMs to generate query inputs, use human domain experts to label the correct answers. At minimum, have a domain expert review a sample of synthetic labels (10–20%) before trusting them. The exception: for factual Q&A tasks with a ground truth source (product documentation, APIs), GPT-4o can extract correct answers from the source — this is retrieval, not generation.",
        category: "Data Construction"
      },
      {
        question: "How do I know if my golden set has coverage gaps?",
        answer: "Embed all eval queries and cluster with k-means (k = approximately N/10 for a set of N examples). Inspect each cluster: any cluster with fewer than 3 examples is under-represented. Then embed a sample of production queries (last 1,000) and compare cluster distributions between prod and eval. Any production cluster accounting for >5% of traffic that's absent or sparse in your eval is a coverage gap. Practically: the 10 production queries with the lowest cosine similarity to any eval example are your highest-priority additions. Also check: do you have any adversarial examples? Any OOD examples? Any multilingual queries if your system serves multiple languages?",
        category: "Coverage Analysis"
      },
      {
        question: "What's the difference between a golden dataset and an industry benchmark?",
        answer: "An industry benchmark (MMLU, HumanEval, HellaSwag, HellaSwag) is a public, shared evaluation set designed to compare models or systems across the field. A golden dataset is your private, application-specific eval set for your specific product and users. Benchmarks are good for understanding general model capability and comparing base models before adapting them. Golden datasets measure whether your specific application works for your specific users. Using only industry benchmarks to evaluate a production system is a serious mistake — they don't measure what your users actually need and their coverage of your domain is coincidental.",
        category: "Conceptual"
      },
      {
        question: "My eval set from 6 months ago seems to be getting stale. How do I know when to refresh it?",
        answer: "Track the embedding distribution distance between your current production traffic and your eval set monthly. If you use JS-divergence or Earth Mover's Distance between the two distributions and it exceeds a threshold (start with 0.15–0.20; tune based on how much your domain changes), it's time to resample from production and add new examples. Also watch for: all examples in a category passing consistently (they've become trivial — the model mastered them and they no longer discriminate between versions), new product features not covered in the eval set, and significant user demographic changes. A practical heuristic: if more than 40% of your eval examples always pass and never catch a regression, those examples are no longer useful and should be replaced.",
        category: "Maintenance"
      },
      {
        question: "How do I handle the case where there's no single 'correct' answer for an eval example?",
        answer: "Most real-world eval cases don't have a single correct answer — that's exactly why golden sets store rubrics rather than single expected strings. A rubric decomposes the quality of a response into multiple binary or near-binary dimensions: 'does it contain the required facts?', 'is the tone appropriate?', 'does it avoid the forbidden content?'. The LLM judge evaluates each dimension independently. For examples with high ambiguity, add a 'valid_alternatives' field listing response strategies that are all acceptable, and instruct the judge to pass any that meets the rubric — this prevents false negatives when the model produces a valid but unexpected approach.",
        category: "Design"
      }
    ],

    practiceProblems: [
      "**Problem:** Design a golden dataset sampling plan for a medical information chatbot. Resources: 3 weeks, 1 medical professional (4 hours/week), 6 months of sanitized production logs. Specify categories, sizes, and sources. **Answer:** Total target: 300 examples. Expert-authored (48 person-hours available; ~3 examples/hour accounting for review time = ~80 examples): critical medical accuracy cases — drug interactions, emergency symptoms, dosing edge cases, high-stakes misclassification scenarios. Production-sampled (120 examples): stratified by query type — symptom lookup=40, treatment questions=40, medication=25, mental health=15; human-verified by medical professional for accuracy. Synthetic (60 examples): underrepresented rare conditions, multilingual queries, OOD cases (legal/financial questions to test refusal behavior). Adversarial (40 examples): requests for self-harm guidance, false urgency claims, attempts to extract specific prescriptions. All examples reviewed by medical professional for safety labeling before finalizing.",
      "**Problem:** You discover your 500-example eval set has 95% of queries clustered in 3 of 12 expected categories. What do you do? **Answer:** (1) Identify the 9 under-represented categories by inspecting cluster content. (2) For each under-represented category, generate 10–20 synthetic queries using an LLM with category-specific generation prompts. (3) Have a domain expert write 3–5 examples per category as 'seeds' for quality calibration. (4) Run the new examples through your eval pipeline to verify they're genuinely more challenging. (5) Update the dataset version (e.g., v2.0.0), document the coverage gap and the remediation steps. (6) Rerun your eval suite on the new version — expect the pass rate to drop as harder examples are added (this is correct behavior, not a regression).",
      "**Problem:** Design a JSONL schema for a golden dataset for a coding assistant. Include all metadata fields needed for versioning, coverage analysis, and contamination prevention. **Answer (schema with rationale):** `{\"id\": \"ca-0234\" (stable UUID), \"version_added\": \"v3.2.1\", \"source\": \"expert\", \"category\": \"edge_case\", \"difficulty\": \"hard\", \"programming_language\": \"python\", \"task_type\": \"debugging\", \"content_hash\": \"sha256:...\", \"input\": {\"code\": \"...\", \"error_message\": \"...\", \"question\": \"...\"}, \"required_elements\": [\"identifies line 42\", \"suggests try/except\"], \"forbidden_content\": [\"import os\", \"eval(\"], \"rubric\": {\"correct_diagnosis\": \"...\", \"working_fix\": \"...\", \"no_security_issues\": \"...\"}, \"training_data_in_same_corpus\": false (contamination flag), \"staleness_review_after\": \"2027-03-01\"}`. The `training_data_in_same_corpus` field is set during data curation and prevents accidental contamination."
    ],

    references: [
      {
        source: "blog",
        attribution: "Hamel Husain — 'LLM-as-a-Judge: A Practical Guide' (2024) - https://hamel.dev/blog/posts/llm-judge/",
        insight: "Covers golden dataset construction in detail including the critique-shadowing workflow and dataset dimensioning by scenario/persona/feature."
      },
      {
        source: "blog",
        attribution: "Shreya Shankar et al. — 'Operationalizing Machine Learning: An Interview Study' arXiv:2209.09125 (2022) - https://arxiv.org/abs/2209.09125",
        insight: "Research on how ML teams build and maintain eval datasets in practice; identifies contamination as the most common failure mode."
      },
      {
        source: "blog",
        attribution: "Eugene Yan — 'Patterns for Building LLM-based Systems & Products' (2023) - https://eugeneyan.com/writing/llm-patterns/",
        insight: "Section on dataset construction covers quality-over-quantity principle and golden set design for production systems."
      },
      {
        source: "note",
        attribution: "Lilac — Semantic dataset exploration tool for coverage gap analysis - https://www.lilacml.com/",
        insight: "Open-source tool using embedding-based clustering and semantic search for finding coverage gaps in eval and training datasets."
      },
      {
        source: "note",
        attribution: "Braintrust — Dataset management and versioning documentation - https://www.braintrustdata.com/docs/guides/datasets",
        insight: "Practical guide to versioning, storing, and comparing eval datasets across model updates with UI for coverage analysis."
      },
      {
        source: "blog",
        attribution: "Hamel Husain — 'Data Cleaning for Fine-tuning' (Parlance Labs notes) - https://hamel.dev/notes/llm/finetuning/04_data_cleaning.html",
        insight: "Addresses near-duplicate detection workflows and the manual inspection discipline that applies equally to eval dataset construction."
      }
    ]
  },
  {
    id: "topic-ai-evaluation-llm-as-judge",
    moduleId: "mod-ai-evaluation",
    title: "LLM-as-Judge: Automated Semantic Quality Evaluation",
    intuition: "When you need to evaluate semantic quality at scale — is this response helpful, factually accurate, and appropriately concise? — you hire a smarter model to grade your weaker one. LLM-as-judge makes automated evaluation of open-ended outputs economically viable, but the judge has four systematic biases that will corrupt your results if you don't actively counteract them.",

    complexity: {
      time: "Per-call latency: 500ms–3s depending on judge model and prompt length. For a 200-example CI eval suite with GPT-4o-mini as judge: ~2–5 minutes with 20× parallel calls. For a 500-example nightly run with GPT-4o: ~10–15 minutes. Calibration session (30 human-labeled examples, one judge run): ~15 minutes of compute + 2–4 hours of expert time.",
      space: "Judge prompt: 300–800 tokens for a well-designed rubric prompt. Input tokens per call: prompt + query + response + optional reference = typically 500–2,000 tokens. Output tokens per call: score fields + critique = 100–300 tokens. No persistent memory beyond the eval results database."
    },

    lesson: [
      {
        title: "What LLM-as-Judge Actually Does — Core Mechanics",
        content: "LLM-as-judge (also: model-based evaluation, automated evaluation) uses a more capable LLM (the judge) to score outputs from the system under test. The judge receives: the original user query, optionally a reference answer, the system's response, and a rubric specifying what to evaluate. The output is a score (or binary pass/fail) and a critique explaining the reasoning. The MT-Bench paper (Zheng et al., 2023, arXiv 2306.05685) was the landmark validation: GPT-4 as judge achieved 80%+ agreement with human evaluators across multiple task types, with an acceptable false positive rate, making automated judging a legitimate substitute for manual review in most scenarios. There are two primary paradigms: pointwise evaluation (score a single response against a rubric — 'rate this response on accuracy from 1–5') and pairwise evaluation (compare two responses and select the better one — 'which of A or B better answers this question?'). Each has different biases and different ideal use cases, covered in the next sections. The judge should always be more capable than the system under test — use GPT-4o to judge a GPT-3.5 system, or Claude Sonnet to judge a fine-tuned Llama.",
        codeExample: `JUDGE_PROMPT = """
  You are evaluating an AI assistant's response to a customer service query.
  Rate the response on each dimension, then output valid JSON.

  Query: {query}
  Response to evaluate: {response}
  Reference answer: {reference}

  Evaluation dimensions:
  - accuracy (1-5): Is the information correct? 5=fully accurate, 1=completely wrong
  - helpfulness (1-5): Does it address what the user needs? 5=fully helpful, 1=misses point
  - conciseness (1-5): Appropriate length? 5=perfect length, 1=extremely verbose OR terse
    NOTE: A longer response is NOT automatically better. Penalize padding.
  - safety (1-5): Avoids harmful/inappropriate content? 5=fully safe, 1=harmful

  Return ONLY this JSON (no other text):
  {{
    "accuracy": N, "helpfulness": N,
    "conciseness": N, "safety": N,
    "critique": "one sentence explaining the scores",
    "overall_pass": true/false
  }}
  """

  def llm_judge(query: str, response: str, reference: str,
                model: str = "gpt-4o-mini") -> dict:
      import openai, json
      client = openai.OpenAI()
      result = client.chat.completions.create(
          model=model,
          messages=[{"role": "user",
                     "content": JUDGE_PROMPT.format(
                         query=query, response=response, reference=reference)}],
          response_format={"type": "json_object"},
          temperature=0  # Determinism for the judge
      )
      return json.loads(result.choices[0].message.content)`
      },
      {
        title: "Pairwise vs. Pointwise: When to Use Each",
        content: "Pairwise evaluation asks 'which of A or B is better?' and is generally more reliable than pointwise for preference questions, for two reasons: humans (and LLMs) are more accurate at relative judgments than absolute scoring, and pairwise framing avoids the calibration drift problem where scores shift over time without anchoring. MT-Bench uses pairwise comparison with GPT-4 and found it more consistent than pointwise scoring for preference tasks. Pairwise is best for: comparing two model versions in an A/B test, ranking multiple candidate responses, system comparison benchmarks. Pairwise's weakness: it doesn't give an absolute quality measure, so you can't track whether overall quality is improving over time. Pointwise scoring is best for: tracking absolute quality trends on a monitoring dashboard, CI pass/fail gates, regression detection. Hamel Husain's practical finding: use binary pointwise (pass/fail, not 1–5) rather than Likert scales for most product eval purposes. Binary judgments have dramatically higher inter-rater agreement, require less calibration, and are easier to reason about in CI thresholds. The difference between a '3' and a '4' on a 1–5 scale is fundamentally subjective; 'acceptable for production / not acceptable' is not.",
        diagram: asciiDiagram(`
  PAIRWISE EVALUATION                    POINTWISE EVALUATION
  ────────────────────────────────       ────────────────────────────────
  Query: "What is RAG?"                  Query: "What is RAG?"
                                         Response: "RAG stands for..."
  Response A: [correct explanation]
  Response B: [vague/incorrect]          Rubric dimensions:
                                         accuracy: 4/5
  Judge asks: "Which is better?"         helpfulness: 3/5
                                         conciseness: 5/5
  Judge answer: "A is better because     
  it correctly explains retrieval-       OR binary:
  augmented generation while B is        overall_pass: true/false
  vague."
                                         Best for:
  Best for:                              - CI thresholds
  - A/B testing two versions             - Quality dashboards
  - Ranking candidates                   - Absolute trend tracking
  - More reliable for preferences`)
      },
      {
        title: "The Four Systematic Biases — PVSS",
        content: "The MT-Bench paper and subsequent research identified four systematic biases that corrupt LLM-as-judge evaluations. (1) Position bias: in pairwise evaluation, LLMs systematically prefer the response shown first (or second, model-dependent) — MT-Bench found GPT-4 had a ~65% position-first preference, meaning order changed the winner in ~30% of pairwise comparisons. Mitigation: run every pairwise comparison twice with the order swapped; call it a tie when the results conflict. (2) Verbosity bias: LLMs rate longer responses as higher quality even when the additional content is padding. Mitigation: include explicit anti-verbosity language in every judge prompt: 'A response is not better just because it is longer; prefer concise over verbose when content is equivalent.' (3) Self-preference bias: models prefer responses in the stylistic register of their own family. GPT-4o judges tend to prefer GPT-style responses over Claude-style even when content is equal. Mitigation: use a judge from a different model family than the system under test. (4) Sycophancy sensitivity: judge scores inflate when the response begins with flattery ('Great question!') or excessive hedging. Mitigation: strip known sycophantic openers before judging, or add explicit rubric language penalizing them.",
        codeExample: `# Debiased pairwise evaluation: run both orderings, call ties on conflict
  def pairwise_judge_debiased(
      query: str,
      response_a: str,
      response_b: str,
      judge_fn: callable
  ) -> dict:
      # First ordering: A presented first
      result_ab = judge_fn(query, response_a, response_b)
      # Second ordering: B presented first (swapped)
      result_ba = judge_fn(query, response_b, response_a)
      
      # Interpret results accounting for the swap:
      # result_ba "winner=first" means B (shown first) won = original B wins
      ab_winner = result_ab.get("winner")  # "first" or "second"
      ba_winner = result_ba.get("winner")
      
      # Consistent: first-shown wins both times
      if ab_winner == "first" and ba_winner == "second":
          return {"winner": "A", "confidence": "high", "position_bias": False}
      # Consistent: second-shown wins both times  
      elif ab_winner == "second" and ba_winner == "first":
          return {"winner": "B", "confidence": "high", "position_bias": False}
      # Inconsistent: position affected the result
      else:
          return {"winner": "tie", "confidence": "low", "position_bias": True,
                  "note": "Results changed with order — likely position bias"}`
      },
      {
        title: "Calibrating the Judge Against Human Labels",
        content: "An LLM judge is only trustworthy after calibration against human labels on your specific task. The calibration process (from Hamel Husain's 'critique shadowing'): (1) Sample 30–50 examples and have your principal domain expert label them with binary pass/fail; (2) Run the judge prompt on the same examples; (3) Compute agreement — Cohen's kappa or, for binary labels, separate precision and recall (not raw accuracy, which is misleading for imbalanced datasets); (4) Inspect disagreements — is the judge too lenient? too strict? failing on a specific category? (5) Update the judge prompt to address the failure pattern; (6) Repeat until Cohen's kappa > 0.6 (substantial agreement) or binary precision/recall both exceed 0.80. The critique-shadowing technique: have the judge write a critique, show it to the expert, and ask the expert to correct it. The expert's corrections become new judge prompt instructions. Calibration is not one-time — re-run the calibration check quarterly or after major system changes. Warning: using raw agreement as the calibration metric is misleading for imbalanced datasets (90% of responses are good, 10% bad). A judge that calls everything 'good' achieves 90% accuracy but is useless. Measure precision and recall separately.",
      },
      {
        title: "When NOT to Use LLM-as-Judge",
        content: "LLM-as-judge is inappropriate for: (1) Objectively verifiable tasks — use deterministic assertions instead; using an LLM to judge whether 2+2=4 is wasteful and less reliable than assertEqual; (2) Safety-critical evaluations — jailbreak detection, PII detection, medical/legal accuracy — where you need >95% precision; LLM judges have error rates that are unacceptable in these contexts; use fine-tuned classifiers or rule-based systems; (3) Very high volume without sampling — at 10M requests/day, judging all of them is prohibitively expensive; sample at 0.1–1%; (4) When the judge hasn't been calibrated against human labels — an uncalibrated judge may have systematic biases you haven't detected, giving false confidence that's worse than no eval. Use LLM-as-judge for: semantic quality assessment (helpfulness, coherence, tone), tasks without a single correct answer, generation tasks (summarization, creative writing, conversation), multi-dimensional rubric scoring."
      }
    ],

    examples: [
      {
        title: "Position Bias Flipping a Pairwise Verdict — Live Demonstration",
        input: "Judge prompt: 'Which response better answers: What causes inflation? A: [3-sentence technically accurate answer covering monetary supply, demand-pull, cost-push] B: [1 sentence: Too much money chasing too few goods]'\nRun 1: A presented first. Run 2: B presented first (swapped).",
        output: "Run 1 (A first): 'Response A is better — it covers multiple inflation mechanisms comprehensively.' Winner: A (first position). Run 2 (B first, so B is now 'first'): 'Response B is better — it's concise and accessible; A is unnecessarily technical for a general question.' Winner: B (first position, which is original A shown second). Conclusion: position bias detected — the 'first' position won both times. Call it a tie; break with domain judgment (both responses have merit for different audiences).",
        explanation: "This is the real failure mode documented in MT-Bench (Zheng et al., 2023). Without the swap test, teams often conclude 'A is definitively better' based on a single pairwise run that may simply reflect position bias. The debiased protocol is not optional — it's a correctness requirement for pairwise evaluation."
      },
      {
        title: "Iterative Judge Calibration — Three Rounds to 91% Agreement",
        input: "Customer support chatbot. Domain: e-commerce. Task: judge whether a response is 'acceptable for production.' Expert labels 40 examples. Round 1 judge prompt: 'Does this response adequately answer the customer's question? Yes/No.' Round 1 agreement: 72%.",
        output: "Failure analysis of the 28% disagreements: the judge says 'Yes' to responses that correctly state policy but deflect to calling a phone number instead of resolving directly — the expert says 'No' (deflection when resolvable = bad). Round 2 prompt adds: 'A response that deflects the user to another channel when the system could resolve the issue directly should be rated No.' Round 2 agreement: 84%. Remaining failures: judge says 'No' to responses starting with apologies ('I'm so sorry to hear that…') — expert says these are fine. Round 3 adds: 'An empathetic preamble followed by a correct resolution is rated Yes.' Round 3 agreement: 91%. Calibration achieved.",
        explanation: "Three rounds to 91% agreement is typical in practice. Each round surfaces one dominant failure pattern that can be addressed with one or two sentences in the judge prompt. The critique-shadowing technique makes this systematic rather than ad-hoc."
      },
      {
        title: "Verbosity Bias in Action — Before and After Rubric Fix",
        input: "Two responses to 'What is gradient descent?': Response A: 800-word exhaustive explanation with examples, edge cases, variants (SGD, Adam), learning rate schedules. Response B: 150-word precise explanation: definition, loss function minimization, update rule. Original rubric: 'Rate on thoroughness: 5=comprehensive with details, 1=missing key points.'",
        output: "Original rubric: Judge rates A=5 (comprehensive), B=3 (missing advanced content). This is verbosity bias — the rubric's language ('comprehensive,' 'details') directly incentivizes length. Fixed rubric: 'Rate on quality: 5=fully accurate AND appropriately concise for the question asked. A longer response is NOT rated higher unless the length serves the user's need. Penalize verbosity that doesn't add value.' Fixed rubric: Judge rates A=3 (accurate but verbose for a general definition question), B=5 (complete and concise). Correct verdict.",
        explanation: "The rubric language is the primary control for verbosity bias. Without an explicit anti-verbosity instruction, every judge prompt implicitly rewards length because LLMs trained on human text learned that thoroughness is valued — and thoroughness correlates with length in most human writing."
      }
    ],

    tips: [
      "Always run pairwise evaluations in both orders and call ties when results conflict — this is not optional for correct pairwise judgment.",
      "Use binary (pass/fail) scoring rather than Likert scales for CI gates and dashboards — binary has higher inter-rater agreement and clearer semantics.",
      "Add explicit anti-verbosity language to every judge rubric: 'A longer response is not automatically better; prefer concise when content is equivalent.'",
      "Calibrate on 30–50 human-labeled examples before trusting any judge scores — uncalibrated judges can have systematic biases you've never detected.",
      "Don't use LLM-as-judge for objectively verifiable tasks (math correctness, code execution, JSON validity) — use deterministic assertions.",
      "Use a judge from a different model family than your system under test to reduce self-preference bias."
    ],

    tricks: [
      "Ask the judge to write its critique BEFORE scoring — chain-of-thought scoring ('explain then score') produces more accurate and more consistent scores than direct scoring. G-Eval (arXiv 2303.16634) demonstrated this formally.",
      "If your judge is a reasoning model (o1, o3), don't add chain-of-thought instructions — it already reasons internally, and asking it to also output reasoning doubles token cost without benefit.",
      "For multi-dimension rubrics, get one judge call per dimension rather than asking the judge to score all dimensions at once — parallel focused calls reduce dimension-interference effects.",
      "Validate your judge's calibration not just on average agreement but on 'hard disagreement rate' — examples where the judge scores 5 and the human scores 1 (or vice versa) are the dangerous errors, not off-by-one disagreements.",
      "Test verbosity bias explicitly by creating minimal pairs: the same factual content at 50 words vs. 200 words vs. 500 words, and check that the judge scores them equivalently if content is equivalent."
    ],

    memoryAids: [
      "PVSS = four biases: Position, Verbosity, Self-preference, Sycophancy. 'Paid Voters Systematically Sway' results.",
      "Calibration target: Cohen's kappa > 0.6 or binary precision + recall both > 0.80 before trusting scores.",
      "Pairwise = relative ('which is better?'). Pointwise = absolute ('how good is this?'). Use pairwise for comparison, pointwise for monitoring."
    ],

    interviewPatterns: [
      "\"How do you know your LLM judge is any good?\" — Calibrate against 30–50 human-labeled examples, measure Cohen's kappa (not raw accuracy), run the position-swap test.",
      "\"What are the failure modes of LLM-as-judge?\" — Name all four PVSS biases with their specific mitigations. This depth strongly differentiates candidates.",
      "\"When would you NOT use LLM-as-judge?\" — Objectively verifiable outputs, safety-critical classification, tasks requiring >95% precision, uncalibrated judges.",
      "\"What's the difference between pairwise and pointwise evaluation?\" — Relative vs. absolute; pairwise for A/B/comparison, pointwise for dashboards and CI; pairwise is more reliable for preference but lacks absolute quality signal.",
      "\"How do you handle the judge preferring longer responses?\" — Explicit anti-verbosity rubric language; test with minimal pairs of equal content at different lengths."
    ,
    "Frequency and companies: Tier 1 (90%+) — LLM-as-judge is now the expected answer for 'how do you evaluate open-ended outputs at scale.' The PVSS bias framework is what differentiates strong from mediocre answers.. Interview relevance: interview-tested. Content stability: semi-stable."
  ],

    faq: [
      {
        question: "How do I know if my LLM judge is actually reliable?",
        answer: "The definitive answer: calibrate against human labels. Have your principal domain expert label 30–50 examples with binary pass/fail (not 1–5 — binary has much higher calibration reliability). Run your judge on the same examples. For binary labels: compute precision (of the examples the judge calls 'pass', what fraction does the expert also call 'pass?') and recall (of the examples the expert calls 'pass', what fraction does the judge call 'pass?'). Target: both > 0.80. Also compute Cohen's kappa to account for chance agreement. If precision < 0.80, your judge has too many false positives (calls bad responses good). If recall < 0.80, it's too strict. Calibrate the rubric to address whichever direction fails.",
        category: "Calibration",
        source: "Hamel Husain — LLM-as-Judge guide"
      },
      {
        question: "Can I use the same model family as both the system under test and the judge?",
        answer: "Technically yes, but it introduces self-preference bias: GPT-4o judges tend to prefer GPT-4o-style responses over equivalently correct Claude-style responses, and vice versa. The bias is measurable — present the same content with different stylistic registers and check if the judge rates them differently. If you must use the same family (budget constraint, access constraint), the calibration process will quantify the self-preference bias, and you can add explicit style-neutralizing instructions to the rubric. For production eval systems, cross-family judging is best practice.",
        category: "Bias Mitigation"
      },
      {
        question: "What should a high-quality judge prompt look like?",
        answer: "A high-quality judge prompt has five components: (1) Role definition — 'You are evaluating responses from a customer support assistant for an e-commerce company'; (2) Context — the original query and optional reference answer; (3) Explicit rubric dimensions with clear, unambiguous criteria for each level; (4) Explicit bias mitigations — anti-verbosity language, anti-sycophancy language, instruction to judge on content not style; (5) Structured output format — JSON with a required field per dimension plus a mandatory critique field. Avoid: numerical scales without per-level anchors ('3 means what exactly?'), vague rubric language ('high quality'), single holistic score that conflates dimensions, and asking for a score without a reasoning step.",
        category: "Implementation"
      },
      {
        question: "How do I evaluate a judge without a reference answer?",
        answer: "Reference-free evaluation (no golden answer available) is common for open-ended tasks. For factual content: use retrieval-augmented judging — give the judge the source documents and ask 'does this response accurately reflect the information in the provided documents?' This is called faithfulness or groundedness evaluation and doesn't require a reference answer. For stylistic properties (tone, clarity, appropriateness): rubric-based judging works without a reference because these are input-independent properties. For task completion: define what a complete response looks like structurally (e.g., 'a complete refund response addresses: confirmation of receipt, next steps, timeline') and judge against the structural checklist.",
        category: "Design"
      },
      {
        question: "Is LLM-as-judge reliable enough for go/no-go deployment decisions?",
        answer: "For detecting systematic regressions (a prompt change that makes 10%+ of responses worse), yes — a calibrated judge is reliable enough to gate deployments. For making binary decisions about individual responses at high stakes (medical diagnosis, legal advice, financial recommendations), no — error rates are too high for these critical cases. The rule: use LLM-as-judge where you'd accept ~85–90% accuracy at the aggregate level; use humans or specialized classifiers where you need >95% accuracy per decision. Most product CI gates fall in the aggregate category: 'this version has a 73% vs. 87% pass rate' — that difference is reliably detectable with a well-calibrated judge.",
        category: "Reliability"
      },
      {
        question: "How much does running LLM-as-judge cost at scale?",
        answer: "For a 200-example CI suite with gpt-4o-mini as judge (500-token prompt, 200-token output): ~200 × $0.00015/1K_in × 0.7K_in + $0.0006/1K_out × 0.2K_out = ~$0.03 per CI run. At 50 PR runs per week: $1.50/week. For a 500-example nightly suite with gpt-4o: 500 × $0.0025/1K_in × 0.7K + $0.01/1K_out × 0.2K = ~$1.88/nightly run = $56/month. For continuous sampling at 1% of 1M requests/day: 10,000 judge calls/day × $0.0002/call = $2/day = $60/month. The cost is manageable for most teams; the ROI in prevented regressions is enormous.",
        category: "Cost"
      },
      {
        question: "What's 'critique shadowing' and how does it differ from standard calibration?",
        answer: "Standard calibration compares judge scores to human scores and adjusts the threshold. Critique shadowing is a specific technique from Hamel Husain that improves the quality of the judge's reasoning: have the judge write a detailed critique of a response, show that critique to the domain expert, and ask the expert to correct the critique. The corrections reveal what the judge is missing or misinterpreting — not just that it got the score wrong, but why it got it wrong. These corrections become new instructions in the judge prompt. The advantage over score-only calibration: you improve the judge's reasoning process, not just its final verdict, which generalizes better to new examples.",
        category: "Technique"
      }
    ],

    practiceProblems: [
      "**Problem:** You're given 10 pairwise comparison results: [A, A, B, A, A, B, A, A, B, A] (7 A-wins, 3 B-wins). Your colleague concludes 'A is clearly better.' What's missing and what's your response? **Answer:** No position-swap test was performed. If the comparison was always presented as (A first, B second), this 7:3 split may reflect position-first bias rather than genuine A superiority. Re-run all 10 comparisons with B presented first. If the results mirror (7 B-wins, 3 A-wins), the entire result is position bias — call it 10 ties. If A still wins 6–7 of 10 with B presented first, then A genuinely wins. The original 7:3 split without swapping is evidence of nothing except that the judge prefers the first position.",
      "**Problem:** Your LLM judge achieves 91% agreement with human labels. Your tech lead asks: 'What kinds of errors is it making?' How do you answer? **Answer:** Report a confusion matrix broken down into four quadrants: True Positive (judge=pass, human=pass), True Negative (judge=fail, human=fail), False Positive (judge=pass, human=fail — dangerous: bad outputs would ship through CI gate), False Negative (judge=fail, human=pass — wasteful: good changes blocked). For a CI deployment gate, false positives are far more costly than false negatives. A 91% agreement rate could decompose as: 80% TP, 11% TN, 6% FP, 3% FN — the 6% FP rate means 6% of bad responses would pass the CI gate. Quantify and present this; if FP > 3%, tune the judge threshold toward stricter scoring to reduce the FP rate even at the cost of more FN.",
      "**Problem:** Design a complete judge rubric for a 'code review comment generator.' Include 4 dimensions with explicit pass/fail criteria, one anti-bias instruction, and the required JSON output format. **Answer:** Dimensions: (1) accuracy — 'Does the comment correctly identify a real code issue? PASS: flags a genuine bug, style violation, or security concern. FAIL: flags a non-existent issue or correct code as wrong.' (2) actionability — 'Does the comment tell the developer what to change, not just that something is wrong? PASS: includes a specific suggested fix. FAIL: only identifies the problem.' (3) tone — 'Is the comment professional and constructive? PASS: neutral, specific language with no condescension. FAIL: uses words like 'obviously,' 'never,' 'always,' or is dismissive.' (4) precision — 'Does the comment reference the specific location? PASS: cites file + line number or function name. FAIL: vague description without location.' Anti-bias: 'A longer, more detailed comment is not automatically a better comment. A precise one-sentence comment that passes all four criteria outscores a verbose five-sentence comment that also passes all four.' JSON: {\"accuracy\": pass/fail, \"actionability\": pass/fail, \"tone\": pass/fail, \"precision\": pass/fail, \"critique\": \"...\", \"overall_pass\": bool}."
    ],

    references: [
      {
        source: "blog",
        attribution: "Zheng et al. — 'Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena' arXiv:2306.05685 (2023) - https://arxiv.org/abs/2306.05685",
        insight: "The foundational paper introducing systematic LLM-as-judge methodology; documents position and verbosity biases and validates GPT-4-as-judge at 80%+ human agreement."
      },
      {
        source: "blog",
        attribution: "Hamel Husain — 'LLM-as-a-Judge: A Practical Guide with Critique Shadowing' (2024) - https://hamel.dev/blog/posts/llm-judge/",
        insight: "The definitive practitioner guide — binary vs. Likert scoring, critique-shadowing calibration, principal domain expert methodology."
      },
      {
        source: "blog",
        attribution: "Liu et al. — 'G-Eval: NLG Evaluation using GPT-4 with Better Human Alignment' arXiv:2303.16634 (2023) - https://arxiv.org/abs/2303.16634",
        insight: "Shows that chain-of-thought ('critique then score') improves judge alignment with human labels vs. direct scoring."
      },
      {
        source: "blog",
        attribution: "Liang et al. — 'Holistic Evaluation of Language Models' (HELM), Stanford CRFM - https://crfm.stanford.edu/helm/",
        insight: "Multi-dimensional model evaluation framework; informs rubric design for multi-aspect quality assessment across diverse tasks."
      },
      {
        source: "note",
        attribution: "Anthropic — Constitutional AI: 'Harmlessness from AI Feedback' arXiv:2212.08073 (2022) - https://arxiv.org/abs/2212.08073",
        insight: "Demonstrates AI-generated preference labels used for alignment training; directly informs the validity of LLM-as-judge for preference learning."
      },
      {
        source: "blog",
        attribution: "Shreya Shankar & Hamel Husain — 'AI Evals for Engineers and PMs' (Maven course, cohort 2024) - https://maven.com/parlance-labs/evals",
        insight: "Course covering end-to-end eval pipeline including LLM judge design, calibration workflows, and CI integration with worked examples."
      }
    ]
  }
];
