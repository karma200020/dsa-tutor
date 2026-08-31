import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-ai-mocks - "AI: Mock Rounds" (5 topics).
// Coverage: the AI design-round framework, a full RAG design round, a full LLM
// serving round, an agent design round, and the interviewer rubric that scores
// all of them.
//
// Authoring rules: see data/ai/foundations.ts (every field explicit, 5+ FAQs,
// `complexity` as latency/cost framing, `asciiDiagram` from "./_shared").
export const aiMockTopics: Topic[] = [
  {
    id: "topic-ai-mocks-design-framework",
    moduleId: "mod-ai-mocks",
    title: "The 9-Step AI System Design Framework",

    intuition: `AI system design interviews differ from classic distributed
  systems design in three ways: the system has a quality dimension
  (correctness is probabilistic, not binary), a cost model that must be
  reasoned about explicitly (inference is expensive at scale), and a
  failure-and-fallback story that is unique to ML (model degradation,
  hallucination, and distribution shift are failure modes that don't exist
  in pure software systems). The 9-step framework below adapts the
  classic requirements-to-bottleneck flow to make these three concerns
  first-class. It is compatible with the arc: requirements → capacity →
  architecture → deep dive → evaluation → failures → cost and tradeoffs.
  The nine steps are a superset that adds two AI-specific checkpoints —
  data and model selection (Step 4), and the AI-specific evaluation
  strategy (Step 7) — that the classic flow omits. Use every step on every
  question; skip none, but scale the depth to the time available.`,

    complexity: {
      time: "45-minute round: ~5 min per step on average, with steps 1-3 compressed to 12 minutes total and steps 4-6 receiving the most depth (20 minutes). Steps 7-9 in the final 13 minutes.",
      space: "The framework is a cognitive scaffold, not a memory structure. The 'space' is mental working memory: hold the current step, the time remaining, and the interviewer's last signal simultaneously."
    },

    lesson: [
      {
        title: "Overview: The Nine Steps and Their Time Allocation",
        content: `The nine steps are listed here with their time budget in
  a 45-minute round. The time allocations are targets, not hard stops —
  if the interviewer is deeply engaged in a deep dive, stay there. What
  matters is that you reach Step 7 (evaluation) and Step 9 (tradeoffs)
  before time expires. Most candidates run out of time because they spend
  20+ minutes on requirements and architecture without reaching the
  AI-specific content. That is the primary failure mode this framework
  prevents.`,
        diagram: asciiDiagram(`
  THE 9-STEP AI SYSTEM DESIGN FRAMEWORK — 45-Minute Allocation:

    ┌────┬────────────────────────────────────────────┬──────────┐
    │ #  │ Step                                       │ Minutes  │
    ├────┼────────────────────────────────────────────┼──────────┤
    │ 1  │ Requirements Clarification                 │  4 min   │
    │ 2  │ Scale and Capacity Estimation              │  6 min   │
    │ 3  │ High-Level Architecture                    │  6 min   │
    │ 4  │ Data and Model Selection                   │  5 min   │
    │ 5  │ Component Deep Dive (the hard part)        │ 10 min   │
    │ 6  │ Failure Modes and Degradation Strategy     │  4 min   │
    │ 7  │ Evaluation Strategy                        │  4 min   │
    │ 8  │ Cost Model                                 │  3 min   │
    │ 9  │ Trade-off Synthesis                        │  3 min   │
    ├────┼────────────────────────────────────────────┼──────────┤
    │    │ TOTAL                                      │ 45 min   │
    └────┴────────────────────────────────────────────┴──────────┘

    COMPATIBILITY NOTE: This framework is a superset of the arc:
    requirements → capacity → architecture → deep dive → evaluation →
    failures → cost and tradeoffs. Steps 4 (data and model selection)
    and 8 (cost model) are the additions specific to AI systems.
    Steps 7 and 6 are reordered from the classic flow: in AI design,
    failure modes are discussed before evaluation because they inform
    what the evaluation must catch.`)
      },
      {
        title: "Steps 1–3: Frame the Problem (12 minutes)",
        content: `Steps 1–3 establish shared understanding and constraints.
  They should be efficient — the interviewer is not evaluating you here,
  they are giving you information. Treat this phase as information
  extraction, not performance.

  STEP 1 — REQUIREMENTS CLARIFICATION (4 min): Ask 4–6 targeted questions.
  Two categories: functional (what does it do?) and non-functional (at what
  scale, latency, and quality?). AI-specific questions that distinguish
  strong candidates: "What is the quality bar — human parity, or
  best-effort?" "Is real-time or batch acceptable?" "Who are the users and
  what is their error tolerance?" Weak candidates ask generic questions
  ("What is the scale?") without asking AI-specific ones ("How do we define
  a good response?"). Every question should change the design if answered
  differently — if it would not, do not ask it.

  STEP 2 — SCALE AND CAPACITY ESTIMATION (6 min): Three numbers matter:
  QPS (from DAU × requests/user/day ÷ 86,400), concurrency (via Little's
  Law: QPS × mean_request_duration), and cost per query (from token counts
  and model price). Derive GPU count from E1/E4 methods. State the peak
  multiplier (3–5× average for consumer). AI-specific estimation that
  interviewers expect: token counts per request, TPOT and TTFT estimates
  from model size and hardware, and the KV cache capacity check from E2.
  Weak candidates give only storage numbers (database rows, GB) without
  computing GPU requirements.

  STEP 3 — HIGH-LEVEL ARCHITECTURE (6 min): Draw the system as 4–6 boxes
  connected by arrows. Name every box. Use the three-layer mental model:
  offline (training, batch embedding, index build), nearline (stream
  processing, feature updates), and online (request path, serving,
  inference). AI systems almost always have all three. At this step, do NOT
  go deep on any one component — that is Step 5. The purpose here is to
  confirm alignment with the interviewer before investing depth anywhere.`,
        diagram: asciiDiagram(`
  STEP 1 — STRONG vs WEAK REQUIREMENTS QUESTIONS:

    ┌─────────────────────────────────────────────────────────────┐
    │ WEAK (asks about scale only)                                │
    │ "How many users? How many requests per day?"                │
    │                                                             │
    │ STRONG (asks about AI-specific constraints)                 │
    │ "What is the acceptable hallucination rate?                 │
    │  Is 1% wrong answers acceptable, or must it be 0.1%?"      │
    │ "Can we return 'I don't know', or must we always answer?"   │
    │ "Is the output streaming or batch?"                         │
    │ "What data can we use for training vs what is off-limits?"  │
    │ "Is the model quality bar defined by human eval or by       │
    │  automated metrics?"                                        │
    └─────────────────────────────────────────────────────────────┘

  STEP 2 — CAPACITY ESTIMATION TEMPLATE:
    ┌─────────────────────────────────────────────────────────────┐
    │ DAU × requests/user/day = daily_requests                    │
    │ daily_requests ÷ 86,400 × peak_ratio = peak_QPS            │
    │ peak_QPS × request_duration = peak_concurrency (Little's)  │
    │ input_tokens + output_tokens = tokens_per_request           │
    │ tokens_per_request × price = cost_per_query                 │
    │ model_GB ÷ HBM_BW_GBps × 1.3 = TPOT_ms                    │
    │ TTFT + TPOT × N_output = E2E_latency                       │
    │ peak_concurrency ÷ capacity_per_GPU = GPU_count             │
    └─────────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Steps 4–5: The AI-Specific Core (15 minutes)",
        content: `Steps 4 and 5 are where AI design interviews diverge from
  classic system design. This is where signal is highest.

  STEP 4 — DATA AND MODEL SELECTION (5 min): For the model: name a
  specific model (not "some LLM") and justify the choice. Size the model
  against the latency SLA using the TPOT formula from E1 — show that
  the chosen model fits. For data: identify training data (if fine-tuning
  is required), retrieval data (if RAG), and feature data (if it is a
  recommendation or classification system). State the data quality concern:
  what happens if retrieval data is stale, biased, or low-quality?
  Strong candidates say: "For this use case I'd start with GPT-4o for
  quality validation, then evaluate whether a fine-tuned 13B model can
  match it — if yes, that's the self-host candidate." Weak candidates say:
  "We'll use an LLM" without naming one or justifying the choice.

  STEP 5 — COMPONENT DEEP DIVE (10 min): This is the highest-signal part
  of the interview. Pick the 2–3 components that are hardest or most novel
  for this specific problem and go deep. Do not deep-dive obvious
  components. For a RAG system: deep-dive retrieval quality (chunking,
  embedding, reranking), not the web server. For an LLM serving platform:
  deep-dive the KV cache and batching strategy, not the load balancer.
  The interviewer will often redirect you with "tell me more about X" —
  follow that signal, it means X is what they care about. Strong candidates
  justify their design choices with numbers or tradeoffs, not just
  descriptions. "We use a 256-token chunk size because at that size the
  average chunk fits within the 'lost-in-the-middle' safe zone AND the
  embedding captures enough semantic context to be useful" is strong.
  "We chunk the documents" is weak.`,
        diagram: asciiDiagram(`
  STEP 4 — MODEL SELECTION DECISION STRUCTURE:

    Quality requirement
          │
          ▼
    ┌─────────────────────────────────────────────────┐
    │ Is latency SLA under 200ms?                     │
    │ YES ──► use 3B-7B model or API with streaming   │
    │ NO  ──► 13B-70B model viable                    │
    └────────────────────┬────────────────────────────┘
                         │
                         ▼
    ┌─────────────────────────────────────────────────┐
    │ Is volume over breakeven for self-hosting?      │
    │ YES (over ~200K queries/day) ──► self-host      │
    │ NO  ──► API (lower ops burden, elastic scale)   │
    └────────────────────┬────────────────────────────┘
                         │
                         ▼
    ┌─────────────────────────────────────────────────┐
    │ Does the task need domain fine-tuning?          │
    │ YES ──► evaluate fine-tuned open model          │
    │ NO  ──► use base model with prompt engineering  │
    └─────────────────────────────────────────────────┘

  STEP 5 — DEEP DIVE TARGETING (pick 2-3 of these per problem):

    Problem type         High-signal deep-dive areas
    ──────────────────   ──────────────────────────────────────────
    RAG pipeline         Chunking strategy, reranking, hallucination guard
    LLM serving          KV cache sizing, continuous batching, LoRA serving
    Recommendation       Two-tower training, negative sampling, cold start
    Conversational agent Memory tiers, ReAct loop, tool safety guards
    Content moderation   Cascade architecture, per-category thresholds
    Code assistant       FIM format, prefix caching, acceptance rate metric`)
      },
      {
        title: "Steps 6–7: Quality and Reliability (8 minutes)",
        content: `Steps 6 and 7 cover the AI-specific quality concerns that
  generic system design misses entirely.

  STEP 6 — FAILURE MODES AND DEGRADATION (4 min): Name the specific ways
  this AI system can fail — not generic distributed systems failures (disk
  full, network partition) but AI failures: hallucination, retrieval
  failure, model degradation over time, prompt injection, and adversarial
  inputs. For each failure mode, state the detection signal and the
  degradation strategy. "If retrieval returns zero results, the system
  falls back to a direct LLM response with a disclaimer that no source
  documents were found" is a degradation strategy. Strong candidates have
  a graceful degradation hierarchy: (1) full pipeline works normally; (2)
  sub-component fails, system serves a degraded but honest response; (3)
  entire AI layer is down, system serves a static fallback or routes to
  human. Weak candidates only discuss infrastructure failures and miss
  AI-specific failure modes entirely.

  STEP 7 — EVALUATION STRATEGY (4 min): How do you know the system is
  working? AI evaluation is harder than binary correctness — state both
  offline and online metrics. Offline: the evaluation dataset and the
  metrics computed on it before deployment. Online: the production signals
  (thumbs-up/down, CSAT, task completion rate, model-as-judge sampling).
  Interviewers almost always ask "how do you evaluate this?" State one
  metric that is hard to game (long-term retention, task completion rate)
  and one metric that is easy to track (LLM-as-judge score on sampled
  requests). Strong candidates describe an evaluation pipeline: sample 5%
  of live traffic, send to LLM-as-judge, aggregate into a daily quality
  dashboard, alert when score drops more than 10% week-over-week. Weak
  candidates name a metric (BLEU, accuracy) without describing how it is
  measured in production.`,
        diagram: asciiDiagram(`
  STEP 6 — AI FAILURE MODE TAXONOMY:

    ┌───────────────────────────────────────────────────────────────┐
    │  Layer 1 — Quality failures (AI-specific)                     │
    │  ├── Hallucination: model asserts false facts                  │
    │  ├── Retrieval miss: relevant doc not in index or not found   │
    │  ├── Prompt injection: user input overrides system prompt     │
    │  ├── Distribution shift: prod queries differ from train data  │
    │  └── Model regression: new model version underperforms old    │
    ├───────────────────────────────────────────────────────────────┤
    │  Layer 2 — Capacity failures (serving-specific)               │
    │  ├── KV cache OOM: too many concurrent long-context requests  │
    │  ├── TTFT spike: prefill queue saturated                      │
    │  └── Cost overrun: token volume exceeds budget threshold      │
    ├───────────────────────────────────────────────────────────────┤
    │  Layer 3 — Infrastructure failures (standard)                 │
    │  ├── Vector DB unavailable: retrieval returns empty           │
    │  ├── LLM API timeout: downstream service fails                │
    │  └── Feature store lag: stale features fed to model           │
    └───────────────────────────────────────────────────────────────┘

  STEP 7 — EVALUATION PIPELINE TEMPLATE:

    Live traffic ──► 5% sample ──► LLM-as-judge ──► quality_score
                                                          │
                                                 ┌────────▼────────┐
                                                 │ Daily dashboard  │
                                                 │ Alert if score  │
                                                 │ drops 10% WoW   │
                                                 └─────────────────┘
    User interactions ──► thumbs up/down ──► CSAT metric
    Task outcomes ──► completion rate ──► business metric`)
      },
      {
        title: "Steps 8–9: Cost and Synthesis (6 minutes)",
        content: `Steps 8 and 9 close the interview with business and
  engineering judgment — the dimensions that differentiate senior
  candidates from mid-level ones.

  STEP 8 — COST MODEL (3 min): State the monthly cost at the given scale.
  Use the formula from E3: daily_queries × cost_per_query × 30. Identify
  the dominant cost driver (almost always LLM inference tokens, not
  infrastructure). Name one cost optimisation: prompt caching, model
  routing, output-length control, or self-hosting at high volume. Strong
  candidates say: "At 500K queries/day at this token profile the API bill
  is $108K/month — that is the first thing to address at this scale, either
  via self-hosting or a cheaper model tier." Weak candidates skip the cost
  calculation entirely or give a vague answer ("it depends on traffic").

  STEP 9 — TRADE-OFF SYNTHESIS (3 min): Every design involves trade-offs.
  Name the three most significant ones for this specific problem, state
  both sides explicitly, and state your resolution. Structure: "The most
  significant trade-off is X vs Y. More X gives Z benefit but Z cost. I
  chose X-dominant because of the specific constraint stated in requirements."
  This is the signal that the candidate understands the design is a set of
  deliberate choices, not the only possible solution. Strong candidates
  bring in numbers: "A larger model improves quality by ~8 MTEB points but
  adds $0.005 per query — at 500K queries/day that is $75K/month in extra
  cost, which is why I recommended the smaller model with domain fine-tuning
  as the cost-performance optimum."`,
        diagram: asciiDiagram(`
  STEP 9 — TRADE-OFF STATEMENT STRUCTURE:

    For every major trade-off name:
    ┌─────────────────────────────────────────────────────────────┐
    │ OPTION A                  vs  OPTION B                      │
    │ (what it gains)               (what it gains)               │
    │ (what it costs)               (what it costs)               │
    │ RESOLUTION: chose A/B because [specific constraint from     │
    │             requirements that tips the balance]             │
    └─────────────────────────────────────────────────────────────┘

    COMMON AI DESIGN TRADE-OFFS TO NAME:
    ┌──────────────────────────────────────────────────────────────┐
    │ Quality vs latency: larger model improves output quality     │
    │   but violates the TPOT budget                              │
    │                                                              │
    │ Precision vs recall: tighter retrieval threshold improves   │
    │   answer quality but increases "no answer" rate             │
    │                                                              │
    │ Freshness vs consistency: real-time re-indexing keeps docs  │
    │   current but risks serving partially-updated index         │
    │                                                              │
    │ API vs self-host: API is operationally simpler but linear   │
    │   cost growth; self-host has high fixed cost but near-zero  │
    │   marginal cost above the breakeven volume                  │
    │                                                              │
    │ Full context vs RAG: full context avoids retrieval errors   │
    │   but costs 10-50x more per query and has long TTFT         │
    └──────────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Common Framework Violations and Recovery Moves",
        content: `Knowing the nine steps is not enough — you must apply
  them under pressure when the interviewer interrupts, redirects, or asks
  follow-up questions mid-step. The three most common violations and their
  recoveries:

  VIOLATION 1 — Over-spending on requirements (candidate spends 15+ minutes
  on Step 1 and never draws an architecture). Recovery: "Let me capture
  the key constraints I've heard and move to architecture — we can refine
  requirements as we go." State three bullet assumptions, draw the boxes.

  VIOLATION 2 — Skipping the AI-specific steps (candidate delivers a
  detailed distributed systems architecture but never mentions evaluation,
  failure modes, or cost). Recovery: before wrapping up, explicitly say
  "I want to make sure I cover evaluation and failure modes, since those
  are especially important for AI systems" — then deliver Steps 6–8 in
  compressed form even if only 5 minutes remain.

  VIOLATION 3 — Describing instead of deciding (candidate lists options
  without choosing one: "we could use RAG or fine-tuning or few-shot
  prompting..."). Recovery: pick one, justify it, then acknowledge the
  alternative: "I'm recommending RAG because the knowledge base changes
  weekly and retraining a fine-tuned model on that cadence is expensive.
  If the knowledge base were static, fine-tuning would be worth evaluating."

  The framework's primary value under pressure is the time budget: when
  you feel lost, checking which step you are on and whether you are behind
  schedule is enough to recover direction.`,
        diagram: asciiDiagram(`
  FRAMEWORK PACING GUIDE — 45-MINUTE CLOCK:

    ┌─────────────────────────────────────────────────────────────┐
    │ Clock     Step                  State check                  │
    ├─────────────────────────────────────────────────────────────┤
    │  0:00     1. Requirements       Asking targeted questions    │
    │  4:00     2. Capacity estimate  Writing numbers on board     │
    │ 10:00     3. High-level arch    Drawing 4-6 boxes            │
    │ 16:00     4. Data + model       Naming specific model        │
    │ 21:00     5. Deep dive          Going deep on hard component │
    │ 31:00     6. Failure modes      Naming AI-specific failures  │
    │ 35:00     7. Evaluation         Describing measurement plan  │
    │ 39:00     8. Cost model         Computing monthly cost       │
    │ 42:00     9. Trade-off synth    Naming and resolving 3 t/o   │
    │ 45:00     END                                                │
    ├─────────────────────────────────────────────────────────────┤
    │ RED FLAGS (check against these at each clock entry):        │
    │  4:00 — still asking questions? Commit to assumptions.      │
    │ 16:00 — no architecture drawn yet? Skip ahead immediately.  │
    │ 31:00 — not reached deep dive yet? Compress and jump.       │
    │ 39:00 — no evaluation mentioned? State it in 60 seconds.    │
    └─────────────────────────────────────────────────────────────┘`)
      },
      {
        title: "How Interviewers Score Your Answer: The Seven Dimensions",
        content: `Understanding the rubric gives you a precise target to aim at. Every
  senior AI system-design interviewer — whether using a formal rubric or not
  — is measuring the same seven dimensions. Knowing their weights tells you
  where to invest the most preparation depth.

  Architecture (20%) is the highest-weighted single dimension because it
  tests whether you can translate constraints into a coherent structure.
  Generic answers ("use microservices") score near zero. Named components
  with justified trade-offs ("pgvector with HNSW index because our 1M
  document corpus fits in a single node and we need SQL join capability
  for the access-control filter") score at the top.

  AI/ML Component Design (20%) is the second heaviest dimension and the
  most differentiating at senior levels. This is where the AI-specific
  depth lives: chunking strategy, embedding model choice, reranker design,
  KV cache math, quantisation trade-offs. A candidate who handles the
  generic system design well but cannot go deep on the AI components
  will not pass at L6+.

  Problem Scoping (15%), Scale/Performance (15%), and Evaluation/Metrics
  (15%) each carry equal weight. Evaluation is the most commonly dropped
  dimension — candidates run out of time and never say how they would know
  the system works. Practise ending every answer with an evaluation plan.

  Trade-offs/Pragmatism (10%) rewards candidates who acknowledge real
  constraints (cost, operational complexity, time-to-market) rather than
  proposing academically optimal but practically infeasible solutions.
  Saying "I'd start with OpenAI APIs even though self-hosted is cheaper
  at scale, because shipping in 6 weeks is worth more than saving
  $5K/month" is a strong Trade-offs signal.

  Communication/Structure (5%) is the lowest-weighted but the most
  floor-affecting: a disorganised, rambling answer loses points on all
  other dimensions too, because the interviewer cannot track whether
  you covered them.`,
        diagram: asciiDiagram(`
  ┌────────────────────────────────────────────────────────────────────┐
  │           INTERVIEW EVALUATION RUBRIC — 7 DIMENSIONS              │
  ├──────────────────────────────────────┬────────────┬───────────────┤
  │  Dimension                           │  Weight    │  Key Signal   │
  ├──────────────────────────────────────┼────────────┼───────────────┤
  │  Architecture                        │  20%       │  Named components, justified trade-offs  │
  │  AI/ML Component Design              │  20%       │  Embedding, reranker, KV cache depth     │
  │  Problem Scoping and Constraints     │  15%       │  Right clarifying questions, math        │
  │  Scale and Performance               │  15%       │  Arithmetic shown, bottleneck identified │
  │  Evaluation and Metrics              │  15%       │  Offline + online metrics named          │
  │  Trade-offs and Pragmatism           │  10%       │  Cost, complexity, time-to-market        │
  │  Communication and Structure         │   5%       │  Signposting, no rambling                │
  ├──────────────────────────────────────┴────────────┴───────────────┤
  │  LEVEL EXPECTATIONS                                                │
  │  L5 (Senior):  passes scoping + architecture + 1 deep dive        │
  │  L6 (Staff):   passes all 7, strong trade-offs, breadth signal    │
  │  L7 (Principal): drives novel design dimension interviewer missed  │
  └────────────────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Strong vs. Mediocre vs. Red Flag: Dimension-by-Dimension Signals",
        content: `For each of the seven dimensions, the difference between a pass and a no-hire
  is usually one specific behaviour. Memorise these signal pairs.

  ARCHITECTURE: Strong — "I'll separate the offline indexing pipeline from
  the online query pipeline and explain both." Weak — "I'll build a
  microservice that takes a question and returns an answer." Red flag — cannot
  draw any boxes, cannot name the components between user and LLM.

  AI/ML COMPONENT DESIGN: Strong — names specific models with justification,
  explains the reranker trade-off, does KV cache arithmetic unprompted. Weak —
  uses generic placeholders ("an embedding model", "some vector database"). Red
  flag — cannot explain what an embedding is when asked directly.

  PROBLEM SCOPING: Strong — asks about access control, SLA, cost budget, and
  fresh-data requirements within the first 5 minutes. Weak — asks only about
  scale (users/queries) and skips qualitative constraints. Red flag — launches
  into architecture without any clarifying questions.

  SCALE/PERFORMANCE: Strong — derives GPU count from first principles (memory
  budget, throughput formula, both constraints checked). Weak — states "we need
  a few GPUs" without arithmetic. Red flag — cannot identify which resource is
  the bottleneck.

  EVALUATION: Strong — names RAGAS for RAG evaluation, A/B testing plan, and
  a specific online metric (user rating, escalation rate). Weak — says "we'll
  monitor it after launch." Red flag — never mentions evaluation at all.

  TRADE-OFFS: Strong — proactively compares two realistic options (API vs
  self-hosted, BM25 vs dense) and states a decision rule. Weak — presents one
  option as obviously correct without comparison. Red flag — cannot identify any
  trade-off when asked directly.

  INSTANT NO-HIRE SIGNALS: (1) proposes architecturally invalid design (no index,
  embedding every document at query time); (2) states incorrect scale math with
  confidence (e.g., "1 GPU handles 1 million concurrent users"); (3) cannot name
  any evaluation metric; (4) shows no awareness that the problem involves AI
  specifically rather than a generic CRUD service.`,
      },
    {
        title: "The 7 Evaluation Dimensions and Their Weights",
        content: `Interviewers at AI-forward companies score candidates on 7 dimensions.
  Architecture and Technical Depth together account for 45% of the signal —
  but this is not an invitation to spend 45% of your time there. It means those
  dimensions have the most differentiation potential. Spending 70% of time on
  Architecture+Depth at the expense of Eval and Failures actually produces a
  lower weighted score than even coverage.

  The two most commonly missed dimensions are Evaluation Strategy (10% weight,
  skipped by ~60% of candidates without prompting) and Failure Modes (10%,
  skipped by ~55%). These are the highest-leverage dimensions to improve because
  the marginal signal gain from covering them — even briefly — is large relative
  to the marginal effort required.`,
        diagram: asciiDiagram(`
  AI SYSTEM DESIGN INTERVIEW — 7 RUBRIC DIMENSIONS:

  ┌────┬──────────────────────────────────────┬────────┬───────────────────────────────────────┐
  │ #  │ Dimension                            │ Weight │ Most-Missed Sub-signal                │
  ├────┼──────────────────────────────────────┼────────┼───────────────────────────────────────┤
  │ 1  │ Problem Scoping and Requirements     │  15%   │ AI-specific questions (eval, cost,    │
  │    │                                      │        │ hallucination tolerance, data policy) │
  ├────┼──────────────────────────────────────┼────────┼───────────────────────────────────────┤
  │ 2  │ Capacity Estimation                  │  15%   │ GPU memory + KV cache + token cost    │
  ├────┼──────────────────────────────────────┼────────┼───────────────────────────────────────┤
  │ 3  │ System Architecture                  │  20%   │ offline/nearline/online tripartition   │
  ├────┼──────────────────────────────────────┼────────┼───────────────────────────────────────┤
  │ 4  │ Technical Depth                      │  25%   │ formulas from first principles;        │
  │    │                                      │        │ paper/production references            │
  ├────┼──────────────────────────────────────┼────────┼───────────────────────────────────────┤
  │ 5  │ Trade-off Reasoning                  │  15%   │ proactive, both sides, quantified      │
  ├────┼──────────────────────────────────────┼────────┼───────────────────────────────────────┤
  │ 6  │ Evaluation Strategy  ← MOST MISSED  │  10%   │ offline vs online distinction;         │
  │    │                                      │        │ monitoring + drift detection           │
  ├────┼──────────────────────────────────────┼────────┼───────────────────────────────────────┤
  │ 7  │ Failure Modes  ← 2ND MOST MISSED    │  10%   │ AI-specific failures (not infra-only)  │
  ├────┼──────────────────────────────────────┼────────┼───────────────────────────────────────┤
  │    │ Architecture + Depth (combined)      │  45%   │ largest signal block                   │
  │    │ Eval + Failures (combined)           │  20%   │ highest marginal-signal opportunity    │
  └────┴──────────────────────────────────────┴────────┴───────────────────────────────────────┘

  STRONG vs WEAK per dimension (summary):
  ┌──────────────────────┬───────────────────────────┬───────────────────────────────────────────┐
  │ Dimension            │ WEAK                       │ STRONG                                    │
  ├──────────────────────┼───────────────────────────┼───────────────────────────────────────────┤
  │ Requirements         │ Jumps to design            │ 4-6 targeted Qs incl. AI-specific        │
  │ Estimation           │ Storage numbers only        │ GPU memory + KV cache + token cost       │
  │ Architecture         │ Single monolithic AI box    │ 4-6 labeled boxes, offline/online split   │
  │ Depth                │ Box-level names only         │ Formulas, papers, 2-3 components dived    │
  │ Trade-offs           │ One solution as correct      │ Proactive, both sides argued, numbers     │
  │ Eval                 │ "We'll test it"               │ Offline dataset + online A/B + monitor    │
  │ Failures             │ No failure discussion         │ 3-4 AI-specific failures + mitigations   │
  └──────────────────────┴───────────────────────────┴───────────────────────────────────────────┘`)
      },
    {
        title: "The 8 Instant No-Hire Red Flags",
        content: `These eight signals cause automatic downward pressure in AI design interviews.
  Any single one converts pressure toward No-Hire. Most are not about forgetting
  a fact — they are about conceptual misunderstandings that signal a candidate
  is not yet ready to build production AI systems safely. Understanding each one
  precisely helps you avoid them under interview pressure.`,
        codeExample: `
  INSTANT NO-HIRE SIGNALS:
  ══════════════════════════════════════════════════════════

  FLAG 1: "We'll just fine-tune GPT-4."
    Why: GPT-4 is not fine-tunable via the standard OpenAI API.
    Deeper issue: treating fine-tuning as the default solution when
    RAG or prompt engineering likely suffices shows model-selection
    immaturity and no awareness of the fine-tuning decision tree.

  FLAG 2: No evaluation strategy mentioned in a 45-minute interview.
    Why: An engineer who cannot measure quality cannot safely ship
    production AI systems. Eval is not optional — it is the mechanism
    by which AI products improve after launch.

  FLAG 3: "The LLM will figure it out" / trusting model output as ground truth.
    Why: Fundamental misunderstanding of LLM nature. Hallucination is
    a system property of the current generation of LLMs, not a bug
    that a better model eliminates. No awareness of production AI risk.

  FLAG 4: Storing embeddings in a plain relational DB without ANN indexing
    for corpora larger than ~100K items.
    Why: Exact nearest-neighbor search is O(N * D) — scanning 10M
    768-dim vectors per query takes ~8 seconds, not milliseconds.
    Shows no understanding of approximate nearest neighbor requirements.

  FLAG 5: Proposing a 70B model for an autocomplete use case without
    noting latency infeasibility.
    Why: 70B at batch=1 has TPOT ~40ms per token on H100.
    A 200-token autocomplete takes 8 seconds. Not production-viable.
    No latency-aware model selection thinking.

  FLAG 6: Completely ignoring cost for a system with meaningful scale.
    Why: AI inference costs are primary engineering constraints at scale.
    Monthly cost is always asked. "$X per query x Y queries/day x 30
    days" takes 60 seconds to compute and must be present.

  FLAG 7: Zero security or ACL discussion for an enterprise system.
    Why: Production ML systems handle sensitive data. Document-level
    permissions, namespace isolation, and audit logging are expected
    in any enterprise design. Absence signals inexperience with
    production system requirements.

  FLAG 8: Unable to explain any component when probed beyond naming it.
    Why: In AI design rounds, depth on at least 2 components is required
    for Hire. Knowing the name of a component (HNSW, PagedAttention,
    two-tower) is not the same as understanding how it works.`
      },
    {
        title: "Level Expectations: Mid → Senior → Staff",
        content: `The passing bar at each level is precisely defined. The key insight for
  candidates: a Senior-level answer at a Staff interview earns a Hire but not
  a Strong Hire. The delta from Senior to Staff is not more of the same — it is
  different types of signal: proactive novel concerns the interviewer had not
  planned to ask about, quantified trade-offs with real numbers, and operational
  thinking (migration strategy, multi-region, team ownership boundaries).`,
        codeExample: `
  LEVEL DIFFERENTIATION:
  ═══════════════════════

  MID-LEVEL (E4 / L4 / IC3):
    Requirements:  3 good questions, functional focus
    Estimation:    QPS + storage only (GPU/token math not required)
    Architecture:  correct major components, offline/online split
    Depth:         can explain 1 component in detail when asked
    Trade-offs:    identifies 1-2 when explicitly prompted
    Eval:          mentions basic metrics when prompted
    Failures:      mentions 1-2 when prompted
    PASSING BAR:   Complete correct architecture + 1 deep dive
    FAILING BAR:   Missing major components OR zero depth

  SENIOR (E5 / L5 / IC4):
    Requirements:  4-5 questions including AI-specific constraints
    Estimation:    token throughput + GPU memory + cost model included
    Architecture:  complete, tech choices with rationale, monitoring
    Depth:         2-3 components deep-dived unprompted; formulas ready
    Trade-offs:    2-3 raised proactively, both sides argued explicitly
    Eval:          specific metrics (NDCG, RAGAS, etc.) + A/B plan
    Failures:      3+ AI-specific failures with concrete mitigations
    PASSING BAR:   Strong across all dimensions, deep on 2+ components
    FAILING BAR:   Weak estimation OR no eval OR no depth

  STAFF (E6 / L6 / IC5):
    Requirements:  5-6 questions including business context
    Estimation:    full model: GPU memory + KV cache + cost + breakeven
    Architecture:  multi-region, migration strategy, operational concerns
    Depth:         derives formulas from first principles; cites papers
    Trade-offs:    raises trade-offs interviewer had not planned;
                   quantifies every trade-off numerically
    Eval:          full framework: offline + online + monitoring + drift
    Failures:      adversarial + operational + data pipeline failures
    Bonus signals: cross-system thinking; 10x scale question; team
                   ownership boundaries named
    PASSING BAR:   Exceeds all Senior expectations + introduces novel concerns
    FAILING BAR:   Senior-level answer = Hire but not a Staff signal`
      },
    {
        title: "Curveball Drill Bank — 30 Questions Across 6 Categories",
        content: `These questions are assembled from reported AI design interview experiences
  on Blind, Reddit r/MachineLearning, and interviewing.io. Each has an expected
  answer profile — not a script, but the components a strong answer must include.
  Curveball response framework: (1) name the assumption that is changing;
  (2) enumerate which system components are affected; (3) give the specific
  technical change per affected component. Never just say 'we'd scale it up.'`,
        codeExample: `
  CURVEBALL DRILL BANK — 30 QUESTIONS:
  ══════════════════════════════════════

  COST CURVEBALLS (C1–C3):
    C1. "Cut operating cost by 50% without degrading quality."
        Expected: semantic caching (same/similar queries reuse result),
        model routing (easy queries → cheaper model), prompt compression
        (LLMLingua), prefix caching, self-hosting at breakeven volume.

    C2. "LLM API bill doubled after a feature launched. How do you
         diagnose which feature is responsible?"
        Expected: cost attribution per feature (separate API keys per
        team or request tagging), token count logging per request path,
        cost monitoring dashboard by feature flag, identify which feature
        increased average token count or request volume.

    C3. "A team wants to batch-label 10M items with GPT-4o.
         Walk through the cost model and whether it is reasonable."
        Expected: 10M x avg_tokens x price/M = total. Compare to
        GPT-4o-mini (10-20x cheaper) or self-hosted model. Frame as
        one-time batch job vs recurring — different build-vs-buy calculus.

  SCALE CURVEBALLS (S1–S3):
    S1. "Traffic 10x overnight. What breaks first?"
        Expected ordered list: LLM API rate limits (hardest to scale
        immediately), then vector DB connection saturation, then
        embedding pipeline throughput, then logging/observability.

    S2. "100 countries, sub-100ms everywhere. Architecture change?"
        Expected: edge deployment for embedding + ANN search (read path),
        centralized LLM serving or smaller model at edge, geo-routing,
        regional vector DB replicas, CDN for static model artifacts.

    S3. "Corpus grows from 1M to 1 billion documents."
        Expected: index sharding by namespace, DiskANN for billion-scale
        (SSD-based, saves RAM), distributed ANN (Milvus/Faiss shards),
        re-embedding cost at 1B docs, scatter-gather query latency.

  QUALITY CURVEBALLS (Q1–Q3):
    Q1. "Hallucination rate jumped from 2% to 8% overnight. Diagnose."
        Expected: model API change (provider silently updated version),
        corpus drift (bad documents injected), retrieval degradation
        (embedding model mismatch after provider update), prompt template
        change. Debug: RAGAS faithfulness before/after, check API
        response headers for model-version field.

    Q2. "Users complain answers are too long. Fix it."
        Expected: max_tokens constraint, prompt instruction ("answer in
        2-3 sentences"), output length reward shaping in RLHF (longer-
        term), dynamic max_tokens by query type classification.

    Q3. "Add multilingual support for 50 languages."
        Expected: multilingual embedding model (mE5, BGE-M3), cross-
        lingual retrieval, query language detection, LLM target-language
        support, per-language eval datasets, tiered quality bars by
        training data availability per language.

  PRIVACY AND SAFETY CURVEBALLS (P1–P3):
    P1. "RAG system reveals confidential docs to an unauthorized user."
        Expected: immediate — review ACL enforcement code for that
        query, check metadata filter logs. Root cause: missing ACL group
        in chunk metadata or namespace isolation gap. Fix: pre-generation
        ACL check as defense-in-depth, audit all chunks, add automated
        ACL regression tests.

    P2. "Competitor is systematically querying the API to extract
         model weights via model inversion."
        Expected: rate limiting per API key, anomaly detection on
        systematic query patterns, output perturbation, legal/ToS
        enforcement. Full extraction infeasible for large models; partial
        inversion is possible for fine-tuned domain-specific models.

    P3. "Regulation requires deleting all user data within 24 hours."
        Expected: document store deletion is straightforward. Vector DB:
        delete all chunks with that user's doc_id. Training data: if
        user docs were in embedding model training, full removal requires
        retraining (machine unlearning problem). Practical near-term:
        retrain with data removed; certified removal techniques are
        research-stage in 2025.

  MODEL AND ARCHITECTURE CURVEBALLS (M1–M3):
    M1. "Embedding model provider changes their model. Migrate without
         downtime."
        Expected: build new index with new model in parallel, A/B test
        retrieval quality, dual-write new docs to both indexes, shadow
        traffic comparison, gradual traffic shift, decommission old index
        after confidence window. Key: embeddings from different models are
        NOT interchangeable — dot-product comparison across models is
        meaningless.

    M2. "Why not use a 1M-token context window instead of RAG?"
        Expected: cost (quadratic attention ~$10 per query for full
        corpus), latency (seconds of prefill), lost-in-the-middle quality
        degradation, context cannot fit an entire enterprise corpus,
        dynamic documents need fresh retrieval per query. RAG wins on
        cost/latency at corpus scale; full context wins for single-doc.

    M3. "Offline NDCG improves weekly but online CTR is flat."
        Expected: Goodhart's Law / popularity bias. Model learns to rank
        items that were previously recommended (appeared in training data)
        rather than novel high-quality items. Fix: IPS-corrected offline
        eval, online A/B as primary signal, exploration arm.

  OPERATIONAL CURVEBALLS (O1–O3):
    O1. "GPU utilization drops to 20% at night but you pay 24/7."
        Expected: auto-scaling with pre-warm (scale down at night, pre-
        warm 30 min before peak), spot/preemptible GPUs for batch workloads
        (~60-70% savings), schedule offline training and index builds at
        night to fill capacity, temporal pricing contracts for predictable
        loads.

    O2. "A new model is 3x better but 5x more expensive. Migrate?"
        Expected: A/B test quality improvement → translate to business
        metric ($X revenue gain). If quality gain generates $X/month and
        cost increase is $Y/month, migrate if X > Y. For most products:
        selective migration — use new model for high-value queries only.

    O3. "How do you build shadow mode to test a new model version?"
        Expected: duplicate every production request to new model in
        background (parallel call, user sees original response), log
        both responses, compare: latency, cost, LLM-as-judge quality
        score, manual diff review on error cases. Caveat: doubles LLM
        inference cost during the shadow testing window.`
      },
    {
        title: "Targeted Weakness Drills by Dimension",
        content: `After self-scoring, identify your two weakest dimensions and run these
  drills. Most candidates are weak on Estimation and Evaluation — those two
  drills alone close the gap between Hire and Strong Hire for the majority of
  senior-level candidates. Run each drill timed, without notes.`,
        codeExample: `
  TARGETED WEAKNESS DRILLS:

  WEAK ON ESTIMATION?
    Drill: Given (model params, precision, architecture), derive:
    (1) weight memory, (2) KV cache for given batch/seq,
    (3) total VRAM, (4) max concurrent request capacity.
    Time limit: 5 minutes, no calculator.

    Practice problems:
    - Llama-3-8B, BF16, batch=16, seq=2048, A100-80GB. Does it fit?
      Answer: weights = 8B x 2B = 16 GB. KV = 80 layers x 8 kv-heads
      x 2 matrices x 128 head-dim x 2048 seq x 2 bytes x 16 batch =
      ~2.5 GB. Total ~18.5 GB of 80 GB. Fits with headroom.
    - Llama-3-70B, INT4, single A100-40GB, seq=1024. Max concurrent?
      Answer: weights = 70B x 0.5B = 35 GB. KV headroom = 5 GB.
      Per req at seq=1024: 80 layers x 8 heads x 2 x 128 x 1024 x 2
      = ~0.32 GB. Max concurrent = floor(5 / 0.32) = 15 requests.

  WEAK ON EVALUATION?
    Drill: For each problem type, write in 60 seconds without notes:
    3 offline metrics + 3 online metrics + 1 monitoring concern.
    Problem types: RAG, Recsys, LLM Serving, Code Assistant.

    Flashcard answers:
    - RAG offline:   RAGAS faithfulness, RAGAS context recall, Recall@K
    - RAG online:    thumbs-up/down rate, task completion rate, CSAT
    - RAG monitor:   embedding drift (cosine similarity after update)
    - Recsys offline: NDCG@K, Recall@K (IPS-corrected preferred)
    - Recsys online:  CTR, play rate (> 30% watch), 7-day retention
    - Recsys monitor: embedding drift > 0.2 → trigger index rebuild

  WEAK ON TECHNICAL DEPTH?
    Drill: Explain in 2 minutes without notes:
    (1) PagedAttention: why does it increase GPU throughput?
    (2) In-batch negative sampling with sampling correction: mechanics?
    (3) HNSW layer hierarchy: why do layers improve search speed?
    (4) Continuous batching vs static batching: what changes?
    (5) Lost-in-the-middle: how does it affect RAG chunk ordering?

  WEAK ON TRADE-OFFS?
    Drill: Argue both sides in 60 seconds per pair:
    (1) Large context window vs RAG
    (2) Fine-tuning vs RAG vs prompting
    (3) API vs self-hosted model
    (4) Dense retrieval vs sparse vs hybrid
    (5) Pre-publish moderation vs post-publish moderation

  WEAK ON FAILURE MODES?
    For any system you design, run this checklist before finishing:
    (1) What happens if the primary LLM API is down?
    (2) What happens if retrieval returns zero results?
    (3) What happens if malicious content is injected into the corpus?
    (4) What happens if the model halluccinates a confident wrong answer?
    (5) What happens when load is 5x normal at 3AM?`
      }
    ],

    examples: [
      {
        title: "Applying the framework to a 'design a RAG chatbot' prompt",
        input: "Interviewer: 'Design an AI-powered customer support chatbot for an e-commerce company with 5M customers.'",
        output: "Step 1 (4 min): clarify modalities, latency, escalation path, and knowledge freshness. Step 2 (6 min): 50K queries/day, 1,500 input tokens, 200 output tokens, 1 A100 sufficient. Steps 3-9 follow the framework clock.",
        explanation: "Step 1 questions: \"Is text-only or also voice? What latency — real-time chat or async email-style? Can the bot say 'I don't know' or must it always respond? How often does product/policy information change? Is there a human escalation path?\" Step 2: 5M customers, assume 1% contact rate = 50K/day. Peak 3× = 1,736 QPS... wait, 50K/day ÷ 86,400 = 0.58 req/s avg. Peak = 1.74 req/s. Very low — 1 A100 with a 7B model handles this trivially. Token estimate: 500 sys prompt + 800 retrieved context + 200 question = 1,500 input, 200 output. Cost at GPT-4o: (1500×2.50 + 200×10.00)/1e6 = $0.00575/query × 50K × 30 = $8,625/month. Step 3: draw retrieval pipeline → LLM → response. Steps 4-9 follow."
      },
      {
        title: "Recovering from spending too long on requirements",
        input: "Candidate has spent 18 minutes on requirements and data modeling without drawing any architecture. Interviewer says: 'Let's move on to the architecture.'",
        output: "Strong recovery: 'Absolutely. Let me commit to three key assumptions and draw the top-level boxes.' State assumptions in 30 seconds. Draw architecture in 3 minutes. Jump directly to Step 5 deep dive.",
        explanation: "The recovery pattern: (1) acknowledge the redirect explicitly so the interviewer knows you heard it; (2) state assumptions verbally to compress the remaining requirements work; (3) draw a minimal 4-box architecture immediately (don't perfect it, just establish the structure); (4) say \"I want to make sure I cover the AI-specific depth — let me focus on [chunking strategy / KV cache design / evaluation].\" This shows self-awareness and prioritisation under pressure, which is itself a signal."
      },
    {
        title: "Scoring a candidate answer against the 7-dimension rubric",
        input: "Candidate spends 20 minutes on requirements and architecture, names a two-tower model and explains it when probed, says 'we'd test it' for evaluation, does not discuss cost or failure modes. 45-minute round.",
        output: "Weighted rubric score: ~1.55/3. Mid-level pass, not Senior signal. Root cause: over-spending on requirements collapsed time for evaluation, failures, estimation, and trade-offs — together 50% of the signal.",
        explanation: "Step 1: Requirements (15%) — 20 minutes is over-budget, but questions were targeted. Score 2 (mediocre). Step 2: Estimation (15%) — no GPU/token math mentioned. Score 1 (weak). Step 3: Architecture (20%) — correct components but 20 min run-over likely left monitoring out. Score 2 (mediocre). Step 4: Depth (25%) — answered two-tower when probed but needed prompting. Score 2 (mediocre). Step 5: Trade-offs (15%) — none raised proactively. Score 1. Step 6: Eval (10%) — 'we'd test it' is the canonical weak answer. Score 1. Step 7: Failures (10%) — not mentioned. Score 1. Weighted score = 2x0.15 + 1x0.15 + 2x0.20 + 2x0.25 + 1x0.15 + 1x0.10 + 1x0.10 = 1.55/3. This is a Hire at Mid-level, borderline No-Hire at Senior."
      },
    {
        title: "Recovering from an instant red-flag statement mid-interview",
        input: "Candidate says 'We can fine-tune GPT-4 on our domain data' and notices the interviewer's expression change. How to recover?",
        output: "Immediate verbal correction: 'Let me revise that — GPT-4 is not directly fine-tunable via the standard API. What I should have said: we evaluate whether a fine-tuned open model like Llama-3-70B can match GPT-4 quality on domain-specific tasks, and if so, that is the self-host candidate for cost optimization.'",
        explanation: "Step 1: The instant red flag (fine-tuning GPT-4) is recoverable if caught immediately. The interviewer is watching to see if the candidate knows it is wrong. Step 2: Explicitly correct the statement — do not double down or qualify it ambiguously. 'Let me revise that' signals self-awareness and correction ability. Step 3: Replace with the correct model selection logic: start with the strongest available model for quality baseline, then evaluate whether a cheaper self-hostable model matches it. This is the correct workflow. Step 4: Continue forward. One recovered error does not change the overall signal if the remaining dimensions are strong — interviewers evaluate the total signal, not the worst moment."
      },
    {
        title: "Planning a 2-week preparation sprint using the rubric",
        input: "Candidate self-scores after practice: Requirements=3, Estimation=1, Architecture=3, Depth=2, Trade-offs=2, Eval=1, Failures=2. Target: Senior Strong Hire in 2 weeks.",
        output: "Week 1: Estimation (highest-leverage gap — 15% weight, score 1). Week 2: Eval (10% weight, score 1, most missed dimension overall). Daily practice: 1 timed 45-min design problem, score all 7 dimensions immediately after each run.",
        explanation: "Step 1: Identify the two weakest dimensions. Estimation=1 and Eval=1 are clear gaps. Together they are 25% of total signal. Step 2: Estimation improvement — memorize the 4-formula chain: QPS, concurrency via Little's Law, KV cache formula, cost-per-query. Drill the practice set (Llama-3-8B, Llama-3-70B INT4) until each computation takes under 3 minutes. Step 3: Eval improvement — memorize the metric table (RAGAS for RAG, NDCG for recsys, acceptance rate for code assist). Practice the 60-second eval pipeline: '5% live sample → LLM-as-judge → daily quality score → alert on 10% WoW drop.' Deliver it unprompted in every practice run. Step 4: Maintain strengths — Requirements and Architecture are at 3. Include them in daily practice so they do not regress. Step 5: Expected outcome: Estimation 1→2-3, Eval 1→2-3. Weighted score improvement from ~2.1 to ~2.5/3 — the Strong Hire threshold at Senior."
      }
    ],

    tips: [
      "Never spend more than 4 minutes on Step 1 regardless of how many follow-up questions occur. After 4 questions, state your assumptions and move forward.",
      "Steps 6 (failure modes) and 7 (evaluation) are the steps most likely to be skipped under time pressure — they are also the most AI-specific. Reserve time explicitly.",
      "Step 5 (deep dive) is where the signal is. Go deep on the hard thing specific to this problem, not on the easy parts you know well.",
      "Step 8 (cost model) should produce a specific dollar number. 'It depends on traffic' is not a cost model — $54K/month at current scale is.",
      "The framework's clock is a recovery tool as much as a plan. When you feel lost, check which step you are on and whether you are behind. That check alone restores direction.",
    "The two highest-leverage dimensions to cover unprompted are Eval (10%, skipped by ~60%) and Failures (10%, skipped by ~55%). Together they are 20% of signal and 60 seconds each is enough to change the score. Never skip them, even under time pressure.",
    "Instant red flags 1, 3, and 8 ('fine-tune GPT-4', 'LLM will figure it out', 'can't explain components') are conceptual errors, not memory failures. The way to avoid them is to internalize: LLMs produce probabilistic outputs, hallucination is a system property, and knowing a name is not the same as understanding the mechanism.",
    "The level differentiation table is a checklist. Before each practice run, pick a target level and commit to hitting every item on that level's list. If targeting Staff: explicitly quantify at least 2 trade-offs numerically and introduce at least 1 operational concern not in the problem statement.",
    "Curveball response structure is always: (1) name the assumption that changed, (2) enumerate affected components, (3) give the specific technical change per component. This 3-step structure works for every curveball regardless of category.",
    "The rubric's 45% weight on Architecture+Depth is not an invitation to spend 45% of your time there. It means those dimensions have the most differentiation potential — but even coverage across all 7 dimensions produces a higher weighted score than spending 70% of time on Architecture at the expense of Eval and Failures."
    ],

    tricks: [
      "STEP 1 SHORTCUT: 'Ask one functional question and two non-functional questions, then commit to assumptions.' Maximum 3-4 questions, then move on.",
      "STEP 2 ANCHOR: 'DAU × requests/user ÷ 86,400 × peak_ratio = QPS. QPS × duration = concurrency. Concurrency ÷ per_GPU_capacity = GPU count.' Three formulas, always in this order.",
      "STEP 5 TARGETING: 'What is the hardest part of this specific system that does not exist in a standard web service?' That is your deep-dive target.",
      "STEP 7 TEMPLATE: '5% live sample → LLM-as-judge → daily score → alert on 10% WoW drop. Plus one business metric (task completion rate).' Deliver this in 60 seconds.",
      "TRADE-OFF FORMAT: 'Option A gives X benefit at Y cost. Option B gives the inverse. I chose A because of [specific requirement].' Three sentences per trade-off.",
    "RUBRIC WEIGHT MNEMONIC: 'AD = 45, RTEEF = 55.' Architecture+Depth = 45% of signal. Requirements+Trade-offs+Estimation+Eval+Failures = 55%. Never neglect the second group because it feels less technical.",
    "INSTANT FLAG MNEMONIC 'FETCH': Fine-tune GPT-4 default, Embeddings without ANN index, Trust the LLM output blindly, Cost completely ignored, Hallucination not acknowledged. Any one = automatic downward pressure.",
    "LEVEL LADDER: 'Mid = correct architecture + 1 deep dive. Senior = correct + depth on 2+ unprompted + eval + cost. Staff = Senior + novel concerns + quantified trade-offs + ops thinking.' The jumps are additive, not substitutive.",
    "CURVEBALL FRAMEWORK: '3 steps: (1) What assumption changes? (2) What components are affected? (3) What is the specific technical change per component?' Pause 3-5 seconds before answering — structured thinking beats blurting the first idea.",
    "SELF-ASSESSMENT AFTER PRACTICE: Score all 7 dimensions immediately after each timed run — within 5 minutes, before the details fade. The dimensions you scored 1 on are your highest-leverage improvement targets. Drill those next."
    ],

    memoryAids: [
      "NINE STEPS: 'Requirements, Scale, Architecture, Data/Model, Deep Dive, Failures, Evaluation, Cost, Tradeoffs.' Mnemonic: RSADDFE CT — or just memorise the clock times.",
      "AI-SPECIFIC ADDITIONS vs CLASSIC DESIGN: 'Step 4 (data and model) and Step 8 (cost model) are the AI additions. Steps 6 (failures) and 7 (evaluation) are AI-enriched.'",
      "TIME RULE: 'Steps 1-3 in 12 minutes. Steps 4-5 in 15 minutes. Steps 6-9 in 14 minutes. Never spend 20+ minutes on requirements alone.'",
      "RECOVERY MANTRA: 'State assumption. Draw box. Name hard thing. Go deep.' Four actions to recover from any tangent.",
      "EVALUATION ALWAYS: 'Every AI design interview ends with evaluation. If time is short, say it in 60 seconds. Never skip it entirely.'",
    "RUBRIC WEIGHTS: 'Architecture 20% + Depth 25% = 45%. Requirements 15% + Estimation 15% + Trade-offs 15% = 45%. Eval 10% + Failures 10% = 20%.' The most-missed 20% (Eval+Failures) is your highest-marginal-value focus area.",
    "THE TWO MOST MISSED: 'Evaluation strategy and Failure modes. Together 20% of signal. Mentioned unprompted by fewer than 40% of candidates. 60 seconds each is enough to change the score — never skip them.'",
    "EIGHT RED FLAGS: 'Fine-tune GPT-4, No eval, Trust the LLM, Embeddings without ANN, 70B for autocomplete, No cost model, No security, Cannot explain components.' Any one of these signals automatic downward pressure.",
    "LEVEL DELTA: 'Mid → Senior = depth on 2 components + eval + cost. Senior → Staff = quantified trade-offs + novel concerns + ops thinking.' The delta from Senior to Staff is different types of signal, not more of the same.",
    "CURVEBALL CATEGORIES: 'Cost, Scale, Quality, Privacy, Model, Operational.' Six categories. Cover all six in your preparation or you will encounter an unpracticed category in the actual interview."
    ],

    interviewPatterns: [
      "'Walk me through how you'd design this' → apply the 9 steps in order, stating which step you're on as you transition: 'Moving from requirements to capacity estimation...'",
      "Interviewer interrupts with 'tell me more about X' during Step 3 → follow the signal into Step 5, but note where you are: 'Happy to deep dive on X — I'll come back to cover failure modes and evaluation before we finish.'",
      "Interviewer asks 'how would you evaluate this?' at any point → deliver Step 7 immediately regardless of where you are in the sequence: sample, judge, dashboard, alert threshold.",
      "Interviewer asks 'what would break first?' → deliver Step 6: classify failures into quality (hallucination, retrieval miss) and capacity (KV OOM, cost spike) tiers with detection and mitigation for each.",
      "You are at minute 40 and have only reached Step 5 → explicitly compress: 'In the remaining time let me cover failures, evaluation, and the key trade-off quickly.' Then deliver each in 90 seconds.",
    "When the interviewer goes silent for 3-5 seconds after your answer — they are typically waiting for you to go deeper or name a trade-off you missed. Continue with 'one thing I should also mention here...' and add the next-level detail.",
    "The best section-to-section transition: 'I've covered the architecture — should I dive deeper into [most complex component] or move to the evaluation strategy?' This signals time awareness, structured thinking, and interviewer prioritization.",
    "When given a curveball, say 'let me think through which components are affected' and pause 3-5 seconds before answering. This signals structured thinking and prevents the most common curveball failure mode: blurting the first thing that comes to mind.",
    "End the interview with: 'If I had more time, the three things I'd revisit are [A], [B], and [C].' This signals ownership of the design and awareness that no 45-minute design is complete — both are positive signals at Senior and above.",
    "Frequency and companies: This rubric reflects reported evaluation criteria at Google, Meta, OpenAI, Anthropic, Netflix, Spotify, and similar companies. Semi-stable: 7 dimensions and their approximate weights have been consistent across interview reports from 2022-2025. Fast-moving: company-specific emphasis shifts as AI products evolve — LLM safety carries higher weight at Anthropic and OpenAI than in 2022."
    ],

    faq: [
      {
        question: "How does this framework differ from classic distributed systems design frameworks?",
        answer: "Classic frameworks (requirements → API design → data model → high-level architecture → deep dive → bottlenecks) assume the system produces deterministic, binary-correct outputs. AI systems produce probabilistic outputs where 'correctness' is a distribution, not a boolean. This forces three additions: (1) Step 4 adds model and data selection — there is no equivalent in pure software design because the behaviour of a database or load balancer is fixed by its specification, while the behaviour of an LLM is determined by training data, model size, and inference configuration; (2) Step 7 adds an AI-specific evaluation strategy because you cannot test an LLM the way you unit-test a function; (3) Step 8 makes the cost model explicit because inference costs can dominate the budget in a way that pure software serving costs rarely do. The failure modes in Step 6 are also AI-specific: hallucination, distribution shift, and prompt injection have no equivalent in a pure software system. The framework is compatible with the other agent's arc (requirements → capacity → architecture → deep dive → evaluation → failures → cost and tradeoffs) — the main difference is that this framework explicitly names Step 4 as a separate step rather than folding model selection into architecture.",
        category: "framework"
      },
      {
        question: "Should you always follow all 9 steps in order, or can you reorder?",
        answer: "The order is a default, not a rule. Two legitimate reorderings: (1) If the interviewer signals a specific area of interest early — 'I'm particularly interested in how you'd handle the evaluation' — move directly to Step 7 after Step 3 and return to the remaining steps afterward. (2) For a system design where the data pipeline is the novel part (e.g., a recommendation system with complex feature engineering), Step 4 can precede Step 3 because the architecture is shaped by the data constraints. What you must never skip entirely: Steps 2 (capacity), 5 (deep dive), 7 (evaluation), and 9 (trade-offs). These four steps are the discriminating ones — a candidate who delivers all four at reasonable depth will pass most AI design screens even if they spend less time on the others.",
        category: "application"
      },
      {
        question: "How do you decide what to deep-dive in Step 5?",
        answer: "Apply this test: 'What is the hardest part of this specific system that does not exist in a standard web service?' That is always the right deep-dive target. For a RAG system: the retrieval quality (chunking, embedding choice, reranking) is unique to RAG and is hard. The web server layer is standard. For an LLM serving platform: KV cache management, continuous batching, and speculative decoding are unique and hard. The networking layer is standard. For a recommendation system: the two-tower training, negative sampling, and cold start handling are unique. The database replication is standard. A second signal: if the interviewer said something like 'I'm curious about how you'd handle X' in Step 1 or Step 3, that is a direct instruction to deep-dive X. Follow it.",
        category: "application"
      },
      {
        question: "How should the framework time allocations change for a 60-minute round vs a 45-minute round?",
        answer: "For a 60-minute round, add 15 minutes: allocate roughly 2 extra minutes to Steps 1–4 (more requirements depth, more careful capacity calculation) and 10 extra minutes to Step 5 (go deeper on the second and third components, not just the primary one). Steps 6–9 stay roughly the same — evaluation and trade-offs do not need more time to be complete. For a 30-minute round (common in early screening), compress aggressively: Steps 1–2 in 7 minutes, Step 3 in 4 minutes, Step 5 in 10 minutes, Steps 6–7 combined in 5 minutes, Steps 8–9 combined in 4 minutes. In a 30-minute round, skip Step 4 (data and model selection) unless the interviewer asks about it — it can be inferred from your Step 3 architecture.",
        category: "timing"
      },
      {
        question: "How do you handle an interviewer who keeps interrupting with follow-up questions during your walkthrough?",
        answer: "Interruptions are positive signals — they mean the interviewer is engaged and wants depth on something specific. When interrupted: (1) answer the question fully; (2) note which step you were on before the interruption; (3) after answering, say 'I want to return to the overall flow — I was at [step name], and I want to make sure I also cover evaluation and trade-offs before we run out of time.' This accomplishes three things: it shows you can go deep on demand, it shows you have a structured plan, and it protects you from running out of time by explicitly flagging the remaining steps. The worst outcome is spending 20 minutes on one deep-dive question and then having no time for evaluation and trade-offs — interviewers remember what you did NOT cover as much as what you did.",
        category: "application"
      },
    {
        question: "Which of the 7 dimensions has the highest return on investment for a 2-week preparation sprint?",
        answer: "Evaluation Strategy and Failure Modes together offer the highest marginal return. They account for 20% of total signal but are skipped by ~60% and ~55% of candidates respectively without prompting. The marginal improvement from covering them — even briefly — is large relative to the time invested: practicing the 60-second evaluation pipeline script takes one hour; delivering it fluently in an interview converts a dimension score from 1 to 2 on a 10% weight, which is +0.1 to the weighted total. Compare this to Architecture, which is a 20% weight but already well-studied by most candidates — the marginal gain per hour of practice is smaller. The correct approach: identify your personal weakest 1-2 dimensions from self-assessment, not from generic advice, and focus your remaining preparation there."
      },
    {
        question: "How do the evaluation criteria differ across companies — Google vs Meta vs OpenAI vs Anthropic?",
        answer: "Based on reported interview experiences: Google tends to weight ML fundamentals alongside system design — expect training pipeline quality, data collection strategy, and offline evaluation rigor questions even for infrastructure roles. Dimension 2 (Estimation) at Google includes GPU memory math. Meta (Instagram, Facebook) focuses on recommendation systems and real-time serving scale; Dimension 3 (Architecture) specifically tests the offline/nearline/online tripartition and Dimension 4 (Depth) emphasizes two-tower training details. OpenAI infrastructure roles weight Dimension 4 (Technical Depth) most heavily — GPU serving internals, KV cache design, and trillion-token-scale cost efficiency are the expected depth areas. Anthropic adds an informal 8th dimension not in the standard rubric: model safety awareness (hallucination rates, adversarial inputs, Constitutional AI) alongside the standard 7. Amazon/AWS focuses on Dimension 3 (Architecture) with multi-region, SLAs, and managed-service selection specifics. Startup rounds (Cohere, Databricks, Scale AI) tend to be more pragmatic and cost-driven, with unusually high weight on Dimension 8 (Cost Model)."
      },
    {
        question: "What is the most common way candidates lose a Senior-level pass even when they know the material?",
        answer: "Running out of time before reaching Evaluation and Failure Modes. The pattern: candidate spends 15-20 minutes on requirements and architecture, goes deep on one component when probed, and reaches minute 43 still mid-deep-dive with no time for evaluation or failures. The interviewer experiences this as a time management failure, which is a proxy signal for engineering judgment under real project constraints. The rubric scores Eval and Failures at 1 (weak) even if the candidate knows the material — not covering it under time pressure is a real gap, not just a presentation issue. The recovery: when you notice you are behind, say 'I want to make sure I cover evaluation and failure modes before we finish — let me compress those now.' Then deliver the 60-second eval pipeline and name 3 AI-specific failures in 60 seconds. Interviewers give near-full credit for compressed delivery if the candidate demonstrates awareness and takes initiative."
      },
    {
        question: "How should a candidate handle a constraint the interviewer sets that seems technically impossible?",
        answer: "Push back respectfully with evidence — this is a positive staff-level signal. 'You mentioned 100ms p99 and also a 70B model. Those constraints are in tension: a 70B model at batch=1 has TPOT of ~40ms per token, so a 200-token response takes 8 seconds. I want to confirm: is the 100ms constraint firm, or is quality the primary constraint and latency is soft? That changes the model selection significantly.' The interviewer is often testing whether the candidate notices the impossibility. A senior candidate designs within stated constraints; a staff candidate notices when constraints imply an architectural impossibility and raises it explicitly with a calculation. The rule: push back with evidence, not opinion. 'I think 100ms is too aggressive' is weak. 'A 70B model at batch=1 produces 40ms TPOT — a 200-token response is 8 seconds, not 100ms' is strong."
      },
    {
        question: "Is it acceptable to say 'I don't know' during an AI design interview?",
        answer: "Yes — with the right structure. 'I don't recall the exact TPOT for a 70B model on H100, but I'd derive it as follows: 70B parameters in BF16 = 140 GB. H100 HBM bandwidth is ~3.35 TB/s. Memory-bound TPOT = 140 GB / 3,350 GB/s ≈ 42ms per token. I'd verify against published benchmarks before making a production decision, but that is my estimate.' This demonstrates two things that matter more than memorization: the right mental model for deriving the answer from first principles, and calibrated uncertainty — knowing the limits of your knowledge and how to bound the estimate. Interviewers report that candidates who say 'I don't know the exact number but let me reason through it' score comparably to candidates who know the exact number, and both score dramatically higher than candidates who blurt a wrong number with false confidence."
      },
    {
        question: "How do interviewers score a candidate who runs out of time and skips Evaluation and Failures?",
        answer: "Both dimensions score 1 (weak) regardless of candidate knowledge, because not covering them under time pressure is itself a signal. The interviewer distinguishes between two cases: (1) candidate runs completely out of time with no acknowledgment — both dimensions score 1 and the time management gap is explicitly noted. (2) Candidate notices the time and says 'I want to make sure I cover evaluation and failures before we finish — here is the short version' and delivers compressed answers — the interviewer typically scores both at 2 (mediocre) because the candidate demonstrated awareness and recovery. The weighted score difference: case 1 has Eval+Failures at 1+1 contributing 0.20 to the total; case 2 has them at 2+2 contributing 0.40 — a 0.20 improvement on a 3-point scale from one recovery statement. This is why the recovery mantra matters: 'State eval in 60 seconds and name 3 AI failures in 60 seconds — never skip them entirely, even at minute 44.'"
      }
    ],

    practiceProblems: [
      `PROBLEM: Apply the 9-step framework to the prompt 'Design a content moderation system for a social platform with 1B posts/day.' Time yourself to 45 minutes. After completing, audit: (1) Did you name a specific model? (2) Did you calculate a GPU count? (3) Did you describe an evaluation pipeline with specific metrics? (4) Did you name at least two AI-specific failure modes (hallucination, adversarial evasion, distribution shift)? (5) Did you state a monthly cost figure?

  SOLUTION CHECKLIST:
  Step 1 (4 min): Ask about violation categories (CSAM, hate, spam), modalities (text, image, video), pre vs post-publish requirement, legal obligations (CSAM reporting), precision vs recall priority per category.
  Step 2 (6 min): 1B/day = 11,574 QPS. Cost if LLM on every item: 11,574 × $0.002/req = ~$23/sec = $2M/day — impossible. Must cascade: 92% rules, 7% ML, 0.8% LLM = 93 LLM calls/sec. Cost: 93 × $0.003 = $0.28/sec = $7,200/day = $216K/month. Manageable.
  Step 3 (6 min): Draw 4-layer cascade: rules → ML classifiers → LLM → human review queue.
  Step 4 (5 min): Layer 2: fine-tuned DeBERTa per category. Layer 3: GPT-4o or Claude for nuanced cases. Data: human-labeled examples per category, balanced across regions and languages.
  Step 5 (10 min): Deep-dive the cascade threshold tuning: per-category thresholds (CSAM: recall=100%, hate: precision first). PhotoDNA for CSAM. Adversarial evasion (text normalization, OCR on images).
  Step 6 (4 min): Failures: new hate speech pattern evades classifier (detection: volume spike on borderline class → fast Layer 1 blocklist update), LLM Layer 3 hallucination (over-removal → appeal overturn rate alert).
  Step 7 (4 min): Offline: precision/recall per category on labeled validation set. Online: appeal overturn rate (false positive proxy), proactive audit sample (false negative proxy), 1K/week blind human review.
  Step 8 (3 min): $216K/month at current volume. Dominant cost: LLM calls at 0.8%. Optimise: reduce LLM percentage from 0.8% to 0.4% by improving ML classifier confidence → halves to $108K/month.
  Step 9 (3 min): Pre-publish vs post-publish (zero visibility vs UX friction); LLM accuracy vs cost (high precision but $216K/month vs ML speed at $5K/month); global policy vs regional variation.`,
    `PROBLEM: Score the following candidate answer against the 7-dimension rubric. Candidate: (a) asked 5 requirements questions including hallucination tolerance and cost constraints; (b) computed QPS, GPU memory, KV cache, and $72K/month cost figure; (c) drew a complete offline/nearline/online architecture with 7 labeled components; (d) deep-dived KV cache sizing and continuous batching unprompted, with the PagedAttention formula; (e) raised 3 trade-offs proactively with numbers — model size vs TPOT, API vs self-host at 500K queries/day breakeven; (f) described RAGAS offline + 5% LLM-as-judge online + alert on 10% WoW drop, all without being asked; (g) named hallucination, KV cache OOM, and prompt injection as AI-specific failures with mitigations.

  WORKED SCORING:
  (a) Requirements (15%): 5 targeted questions including AI-specific (hallucination tolerance, cost constraints). Score: 3 (strong).
  (b) Estimation (15%): QPS + GPU memory + KV cache + monthly cost. All four components. Score: 3 (strong).
  (c) Architecture (20%): Complete, 7 labeled components, offline/nearline/online tripartition explicit. Score: 3 (strong).
  (d) Depth (25%): KV cache sizing + PagedAttention formula unprompted, continuous batching mechanics explained. Two components at formula level. Score: 3 (strong).
  (e) Trade-offs (15%): 3 proactive, both sides argued, numbers included (500K/day breakeven). Score: 3 (strong).
  (f) Eval (10%): Offline + online + monitoring + alert threshold, all unprompted. Score: 3 (strong).
  (g) Failures (10%): 3 AI-specific failures with concrete mitigations, unprompted. Score: 3 (strong).
  Weighted score: 3x1.0 = 3.0/3. Overall verdict: Strong Hire. At Staff level this would be a Strong Hire → Staff.
  Note: To push this to an unambiguous Staff signal, add: (1) one operational concern not in the problem statement (multi-region failover, migration from current system), (2) a cross-system concern (how does this interact with the logging system / model registry?), (3) quantified comparison of 2 additional alternatives that were rejected.`
    ],

    references: [
      {
        source: "book",
        attribution: "Alex Xu and Sahn Lam — Machine Learning System Design Interview (2023) - https://www.amazon.com/Machine-Learning-System-Design-Interview/dp/1736049127",
        insight: "Structured interview framework for ML systems; requirements-to-architecture flow; evaluation-first design philosophy"
      },
      {
        source: "book",
        attribution: "Chip Huyen — AI Engineering (2025) - https://www.oreilly.com/library/view/ai-engineering/9781098166298/",
        insight: "Production AI system design patterns; evaluation strategy for LLM systems; cost modeling framework"
      },
      {
        source: "blog",
        attribution: "Evidently AI — ML System Design Interview Guide - https://www.evidentlyai.com/ml-system-design",
        insight: "Practical framework for ML design interviews; evaluation-centric design; real interview question examples"
      },
    {
        source: "book",
        attribution: "Chip Huyen — AI Engineering (O'Reilly, 2025) - https://www.oreilly.com/library/view/ai-engineering/9781098166298/",
        insight: "Canonical reference for production AI systems. The evaluation framework (offline/online/monitoring), cost modeling, and failure mode taxonomy in this topic derive from Huyen's systematic coverage. The book most-cited by AI interviewers at OpenAI, Anthropic, Google."
      },
    {
        source: "book",
        attribution: "Alex Xu and Sahn Lam — Machine Learning System Design Interview (ByteByteGo, 2023) - https://bytebytego.com/courses/machine-learning-system-design-interview",
        insight: "Problem-by-problem ML design coverage used by interviewers at FAANG to construct question banks. Level-differentiation criteria in this topic align with Xu's framing."
      },
    {
        source: "blog",
        attribution: "Chip Huyen — ML Interviews Book (free online, huyenchip.com) - https://huyenchip.com/ml-interviews-book/",
        insight: "Interview-specific guide: ML concepts, system design questions, behavioral dimensions, and evaluation criteria at AI companies. The most-cited free resource in reported interview preparation posts."
      },
    {
        source: "interview-experience",
        attribution: "Blind, Reddit r/MachineLearning, interviewing.io — reported AI design interview experiences (2022-2025) - https://www.teamblind.com",
        insight: "The 30-question curveball bank and company-specific rubric variations are assembled from patterns in hundreds of AI design interview post-mortems reported across these platforms."
      },
    {
        source: "blog",
        attribution: "Es et al. (2023) — RAGAS: Automated Evaluation of Retrieval Augmented Generation - https://arxiv.org/abs/2309.15217",
        insight: "LLM-as-judge evaluation framework: faithfulness, answer relevance, context recall, context precision. The standard RAG eval framework referenced in every Dimension 6 (Eval) strong answer."
      }
    ]
  },
  {
    id: "topic-ai-mocks-rag-design-round",
    moduleId: "mod-ai-mocks",
    title: "Mock Round: RAG Document Q&A System",

    intuition: `This mock covers the most commonly asked AI design question
  in technical interviews: a retrieval-augmented generation system for
  document question answering. The transcript is annotated with margin
  notes marking every earn and lose signal. Particular attention is paid to
  the three moments where candidates most often stumble: chunking strategy,
  hallucination handling, and evaluation — and what strong recovery looks
  like at each.`,

    complexity: {
      time: "45-minute round. Signal density is highest in minutes 20-35 (deep dive on retrieval quality and chunking). Evaluation (minute 37) is the most-skipped section and the highest marginal-signal opportunity.",
      space: "Conceptual load peaks during the capacity estimation step (holding token counts, GPU math, and cost simultaneously) and the chunking deep-dive (holding three conflicting constraints at once)."
    },

    lesson: [
      {
        title: "Setup and Interviewer Context",
        content: `INTERVIEW FORMAT: 45-minute technical round, senior software
  engineering level. No coding. Whiteboard or virtual drawing tool available.
  Interviewer background: ML platform engineer, has given this question 30+
  times, looking primarily for depth in retrieval quality and evaluation.

  CANDIDATE PROFILE (calibrated at Senior): strong distributed systems
  background, first AI-specific system design interview. Has read about RAG
  but has not implemented one in production.

  QUESTION AS STATED: "Design an AI-powered document question-answering
  system for an enterprise. Employees can upload internal documents —
  policies, technical guides, meeting notes — and ask questions against
  them in natural language."

  The margin notes use:
  ✅ = earns positive signal
  ❌ = loses signal or misses opportunity
  💡 = what a stronger answer looks like`,
        diagram: asciiDiagram(`
  MOCK INTERVIEW — ANNOTATED TRANSCRIPT
  RAG Document Q&A System
  Duration: 45 minutes
  Candidate level: Senior Software Engineer

  ┌─────────────────────────────────────────────────────────────┐
  │ FORMAT LEGEND                                               │
  │ INTERVIEWER: [question or prompt]                           │
  │ CANDIDATE:   [response]                                     │
  │ ━━━ MARGIN NOTE ━━━ [signal annotation]                     │
  └─────────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Phase 1: Requirements and Capacity [0:00–12:00]",
        content: `The first phase establishes the four constraints that shape every
  subsequent architectural decision. The five questions this candidate asks are
  a near-ideal set for an enterprise RAG problem: document types determine the
  parsing pipeline; the abstain-vs-always-respond policy directly shapes the
  hallucination guard design; the latency SLA determines whether streaming is
  required; the scale numbers drive the capacity model; and document-level
  access control — the question almost no candidate asks unprompted — fundamentally
  changes the retrieval architecture from a single flat index to a
  permissions-filtered retrieval system.

  The capacity section shows the right level of depth for a senior candidate.
  Working through chunk count from first principles (50K docs × 5 pages × 650
  tokens / 250 effective tokens per chunk = 650K chunks) is a real practitioner
  detail that distinguishes candidates who have built RAG systems from those who
  have only read about them. The cost estimate — arriving at $4,200/month at
  GPT-4o rates by breaking input and output tokens into separate cost components
  — is the number the interviewer was waiting for, delivered unprompted.`,
        codeExample: `
  [0:00–4:00 — REQUIREMENTS CLARIFICATION]

  INTERVIEWER: "Design an AI-powered document Q&A system for an enterprise.
  Employees upload internal documents and ask questions in natural language."

  CANDIDATE: "Before I dive in, a few questions to make sure I'm solving
  the right problem. First — what document types? PDFs, Word, plain text,
  or also images and presentations?"

  INTERVIEWER: "Primarily PDFs and Word documents. Occasional spreadsheets
  but not a priority."

  CANDIDATE: "Second — what's the quality expectation? Should the system
  always give an answer, or is 'I couldn't find relevant information' an
  acceptable response?"

  INTERVIEWER: "It must be transparent when it's uncertain. Silence is
  better than a confident wrong answer in an enterprise context."

  ━━━ MARGIN NOTE ━━━
  ✅ Strong question. Distinguishing "must always respond" from "can abstain"
  directly shapes the hallucination guard design. Many candidates never ask
  this and design a system that always generates an answer regardless of
  retrieval quality.

  CANDIDATE: "Third — latency. Is this a synchronous chat experience where
  users expect a response in under 2 seconds, or is some async processing
  acceptable?"

  INTERVIEWER: "Real-time chat. TTFT under 1 second would be ideal."

  CANDIDATE: "Fourth — scale. How many employees, documents, and queries
  per day are we targeting?"

  INTERVIEWER: "10,000 employees. Maybe 50,000 documents in the corpus at
  launch, growing to 500,000 over 2 years. Peak: a few hundred concurrent
  users at lunch hour."

  CANDIDATE: "Last clarification — access control. Can all employees access
  all documents, or do we need document-level permissions?"

  INTERVIEWER: "Good question. Different departments have different
  permissions. An HR policy document should not be returned in a search
  for an engineer."

  ━━━ MARGIN NOTE ━━━
  ✅ Excellent. Access control is a real enterprise requirement that almost
  no candidate asks about unprompted. It changes the retrieval architecture
  significantly: you cannot use a single flat vector index without encoding
  permission metadata. Strong signal for enterprise experience.

  [4:00–10:00 — CAPACITY ESTIMATION]

  CANDIDATE: "Let me work through the numbers. 10,000 employees, let's say
  20% are active daily — 2,000 DAU. Each makes maybe 10 queries per day.
  That's 20,000 queries/day, about 0.23 queries/second on average. Peak
  lunch hour might be 5–10× that, so design for 2 queries/second peak —
  very manageable."

  ━━━ MARGIN NOTE ━━━
  ✅ Reasonable estimation. Good that the candidate went to peak QPS.
  💡 Missing: should also estimate token counts and LLM cost. At senior level,
  the interviewer is likely to ask about this — better to volunteer it.

  CANDIDATE: "For the document corpus: 50,000 documents, say 5 pages each
  on average, 500 words per page, about 650 tokens per page. So 50K × 5 ×
  650 = 162M tokens total. We'd chunk these — I'll come back to the chunking
  strategy — let's say chunks are 300 tokens each with 50-token overlap.
  That's 162M / 250 effective tokens per chunk ≈ 650,000 chunks."

  ━━━ MARGIN NOTE ━━━
  ✅ Good. Deriving chunk count from first principles rather than guessing.
  The overlap calculation (300-token chunk, 50-token overlap = 250 effective
  tokens) is a real practitioner detail.

  CANDIDATE: "Vector index size: 650,000 chunks × 1,536 dimensions (using
  OpenAI text-embedding-3-small) × 4 bytes = 3.8 GB. That fits easily on
  a single server with 16 GB RAM."

  CANDIDATE: "For serving: each query generates an embedding call (80 tokens
  of question) plus an LLM call. I'll assume we retrieve 5 chunks at 300
  tokens each plus the question — so about 1,600 input tokens plus, say,
  300 output tokens. At GPT-4o pricing that's (1600×2.50 + 300×10.00)/1e6
  = $0.004 + $0.003 = $0.007 per query. At 20,000 queries/day × 30 = 600K
  queries/month × $0.007 = $4,200/month."

  ━━━ MARGIN NOTE ━━━
  ✅ This is the calculation the interviewer was waiting for. Candidate did
  it unprompted, got the right formula, and landed on a reasonable number.
  The breakdown into input vs output tokens (not an average per-token cost)
  is a strong signal.
  💡 Could mention: at this volume, GPT-4o-mini at $0.00027/query = $162/month
  — a 26× cost reduction worth at least naming.

  [10:00–12:00 — ASSUMPTIONS AND TRANSITION]

  CANDIDATE: "Let me state my key assumptions before drawing the
  architecture: real-time chat, TTFT under 1 second, document-level access
  control, 650K chunks in the index at launch, $4,200/month at GPT-4o rates.
  Those look right to you?"

  INTERVIEWER: "Yes, proceed."

  ━━━ MARGIN NOTE ━━━
  ✅ Restating assumptions before architecture is a professional habit.
  It gives the interviewer an opportunity to correct without interrupting
  the architecture phase.`
      },
      {
        title: "Phase 2: Architecture and Model Selection [12:00–25:00]",
        content: `This phase is where the candidate draws the two-pipeline structure that is
  the foundation of every production RAG system. Separating the offline indexing
  pipeline from the online query pipeline is the right decomposition because it
  lets you reason about each independently: the offline pipeline can be slow,
  batch-oriented, and tolerant of occasional failures; the online pipeline must
  be low-latency, highly available, and idempotent.

  The embedding model choice explanation is the level of specificity that
  earns senior scores: naming text-embedding-3-small, justifying it on
  price-to-quality ratio, and acknowledging that ada-002 is the common
  alternative shows real working knowledge of the embedding market. For
  chunking, citing the 128/512 hybrid strategy — 128-token chunks for
  precision, 512-token parent windows for context — is a concrete and
  defensible production technique.

  The critical decision in this phase is the reranker. Many candidates propose
  bi-encoder retrieval only. This candidate proactively adds a cross-encoder
  reranker (ms-marco-MiniLM-L-6-v2), explains the bi-encoder vs cross-encoder
  trade-off (speed vs accuracy), and designs the retrieve-many-rerank-few
  pattern: top-20 via ANN, cross-encoder over those 20, send top-5 to the
  LLM. That three-stage funnel is the production standard at every major
  search-augmented AI product.`,
        codeExample: `
  [12:00–18:00 — HIGH-LEVEL ARCHITECTURE]

  CANDIDATE: "I'll draw the system in two parts: the indexing pipeline
  offline and the query pipeline online."

  CANDIDATE: "Indexing pipeline:"

  ━━━ DIAGRAM DESCRIBED VERBALLY AND ON WHITEBOARD ━━━

    Document upload
        │
        ▼
    Document Parser
    (PDF/DOCX extraction, metadata: doc_id, owner, permissions)
        │
        ▼
    Chunker
    (300 tokens, 50-token overlap, paragraph-aware)
        │
        ▼
    Embedding Model (text-embedding-3-small)
        │
        ▼
    Vector DB (Qdrant or Weaviate)
    (each vector tagged with: doc_id, chunk_id, permissions_list)
        │
        ▼
    Full-text index (Elasticsearch)
    (for keyword fallback and BM25 hybrid retrieval)

  ━━━ END DIAGRAM ━━━

  ━━━ MARGIN NOTE ━━━
  ✅ Including both vector and full-text index is a strong signal. Hybrid
  retrieval (dense + sparse) is a known best practice that many candidates
  miss. Naming it here earns signal before the interviewer has to ask.
  ✅ Tagging vectors with permissions_list addresses the access control
  requirement stated in Step 1. Good loop-back.

  CANDIDATE: "Query pipeline:"

    User query
        │
        ▼
    Auth service (get permissions for this user)
        │
        ▼
    Query embedding (same model, text-embedding-3-small)
        │
    ┌───▼────────────────────────────────┐
    │  Hybrid Retrieval                  │
    │  ├── ANN search (vector DB)        │
    │  │   filtered by permissions_list  │
    │  └── BM25 keyword search           │
    │  Merge + deduplicate results       │
    └───┬────────────────────────────────┘
        │
        ▼
    Reranker (cross-encoder, top-20 → top-5)
        │
        ▼
    Context assembler
    (system prompt + top-5 chunks + user question)
        │
        ▼
    LLM (GPT-4o or self-hosted)
        │
        ▼
    Response + source citations
        │
        ▼
    User (streaming)

  ━━━ MARGIN NOTE ━━━
  ✅ Including a reranker (cross-encoder) in the pipeline shows production
  knowledge. The retrieve-many, rerank-few pattern (top-20 → reranker → top-5)
  is the standard production approach and distinguishes candidates with real
  RAG experience.
  ✅ Source citations in the response is a good product instinct for an
  enterprise knowledge base — users need to verify answers.
  ✅ Streaming mentioned. Correct for a TTFT under 1 second SLA.

  [18:00–22:00 — MODEL AND DATA SELECTION]

  CANDIDATE: "For the embedding model, I'd start with OpenAI
  text-embedding-3-small. It's well-calibrated, 1,536 dimensions, and at
  $0.020/M tokens the indexing cost for 162M tokens is just $3.24. If we
  ever hit volume where self-hosting makes sense, E5-large at 1,024
  dimensions is a strong open-source alternative. For the LLM, GPT-4o as
  the initial deployment — the $4,200/month cost is acceptable for a 10K
  employee enterprise, and the quality bar is important for enterprise trust.
  I'd put GPT-4o-mini on a fast path for FAQ-style simple queries where we
  can confidently route them."

  ━━━ MARGIN NOTE ━━━
  ✅ Named a specific embedding model and justified the choice with the
  indexing cost calculation. Not 'we'll use OpenAI embeddings' but 'at
  $0.020/M tokens the total indexing cost is $3.24'.
  ✅ Proposed a model routing strategy (GPT-4o for complex, mini for simple)
  without being asked. This shows cost awareness.

  INTERVIEWER: "You mentioned a reranker. How does that work and why do
  you need it?"

  ━━━ MARGIN NOTE ━━━
  This is the deep-dive signal. The interviewer wants to go deeper on the
  retrieval pipeline. Follow it.

  CANDIDATE: "Great question — happy to go deeper on this."

  ━━━ MARGIN NOTE ━━━
  ✅ Acknowledged the redirect explicitly before diving in.`
      },
      {
        title: "Phase 3: Deep Dive — Retrieval Quality [22:00–36:00]",
        content: `By minute 22 the interviewer steers the conversation toward the hardest
  sub-problem in RAG: improving retrieval quality without degrading latency.
  This is the deep-dive phase and it is where senior candidates separate from
  mid-level ones. The four levers this candidate covers — HyDE, hybrid BM25
  + dense, metadata filtering, and multi-hop for comparative questions — span
  the full toolkit available to a production RAG engineer.

  HyDE (Hypothetical Document Embeddings) is the highest-signal technique in
  this phase because it solves the query-document mismatch problem elegantly:
  ask the LLM to draft the document that would answer the question, then
  retrieve by the draft's embedding rather than the query's embedding. The
  tradeoff is one extra LLM call; the gain is queries land in document-space
  instead of question-space.

  The hybrid BM25 + dense fusion explanation demonstrates systems thinking:
  BM25 is strong on exact keyword matches (product codes, person names),
  dense retrieval is strong on semantic similarity (paraphrased questions).
  Fusion via Reciprocal Rank Fusion keeps the implementation simple and
  avoids the weight-tuning complexity of score-level fusion.

  The interviewer's push on multi-hop at minute 30 — "What if the question
  requires information from multiple documents?" — is a deliberate senior
  probe. The candidate's iterative retrieval sketch (decompose question,
  retrieve sub-answers, re-retrieve with synthesised context) is the right
  framework, though the candidate appropriately hedges with "for most
  enterprise questions single-hop suffices."`,
        codeExample: `
  [22:00–30:00 — RERANKER AND HYBRID RETRIEVAL DEEP DIVE]

  CANDIDATE: "The core problem is that embedding-based retrieval (ANN
  search) is fast but approximate — it measures semantic similarity in the
  embedding space, which is a coarse signal. A cross-encoder reranker takes
  each (query, chunk) pair and runs a full transformer forward pass to
  compute a fine-grained relevance score. It is much more accurate because
  it can see both the query and the chunk simultaneously and compute
  attention between them — unlike the bi-encoder embedding model where
  query and chunk are encoded independently.

  The trade-off is latency: you cannot run a cross-encoder over all 650K
  chunks — that would take minutes. So the pattern is: ANN retrieval
  returns the top 20 candidates quickly (3–5ms), then the reranker scores
  only those 20 pairs (about 50ms for a small cross-encoder like
  ms-marco-MiniLM). Total retrieval latency: under 60ms. Well within the
  1-second TTFT budget."

  ━━━ MARGIN NOTE ━━━
  ✅ Correct explanation of bi-encoder vs cross-encoder trade-off.
  ✅ Named a real production model (ms-marco-MiniLM) rather than a generic
    'reranking model'.
  ✅ Estimated the latency of each stage (5ms ANN + 50ms reranker = 55ms)
    and validated it against the TTFT budget. This is the kind of numbers-
    grounded reasoning that earns signal at senior level.

  INTERVIEWER: "How do you handle chunking? What strategy would you use
  and why?"

  CANDIDATE: "Chunking is one of the most impactful decisions in a RAG
  system and one that gets underspecified a lot. The trade-off is: smaller
  chunks are more precise for retrieval (a 100-token chunk is more
  semantically focused) but lose surrounding context when passed to the
  LLM. Larger chunks retain more context but are harder to match precisely
  because they cover more topics.

  I'd use a hybrid approach: chunk at paragraph boundaries when possible,
  targeting 300 tokens. The paragraph-aware part is important — splitting
  mid-sentence or mid-paragraph destroys semantic coherence. For the
  implementation I'd use a library like LangChain's RecursiveCharacterSplitter
  or Unstructured.io which respects document structure.

  For the 50-token overlap: each chunk shares 50 tokens with its neighbours.
  This prevents splitting a key sentence across two chunks and losing both
  halves of the context.

  For tables and code blocks in documents: treat them as atomic units —
  do not split them. A table split across chunks is worse than a single
  large chunk."

  ━━━ MARGIN NOTE ━━━
  ✅ Named a specific library (LangChain RecursiveCharacterSplitter,
    Unstructured.io) — shows practical implementation knowledge.
  ✅ Handled tables and code as special cases — this is a real production
    concern that distinguishes candidates who have thought about document
    diversity vs those who assume plain prose.
  ✅ Explained the overlap rationale in terms of the problem it solves
    (prevents key sentence split) not just as a parameter setting.

  INTERVIEWER: "What is your strategy for handling cases where the LLM
  gives a confident-sounding but incorrect answer because the relevant
  information wasn't in the retrieved chunks?"

  ━━━ MARGIN NOTE ━━━
  The interviewer is probing hallucination handling. This is the key
  AI-specific failure mode for RAG.

  CANDIDATE: "This is the hallucination risk in RAG. My strategy has two
  parts: prevention and detection.

  For prevention: I add a strong system prompt instruction: 'Answer only
  based on the provided documents. If the answer is not in the documents,
  say so explicitly. Do not speculate or use knowledge from outside the
  provided context.'

  I also add a retrieval confidence gate: if the top retrieved chunk has
  a relevance score below a threshold — say, cosine similarity below 0.65
  — return a 'no relevant information found' response instead of sending
  low-relevance chunks to the LLM. A model that is given weak context
  will hallucinate to fill the gap.

  For detection: include source citation in every response. The LLM is
  instructed to cite the specific document and section supporting each
  claim. If it cannot find a citation, it should not make the claim.
  On the monitoring side: I'd sample 5% of responses and send them to an
  LLM-as-judge that checks whether each factual claim in the response is
  grounded in the retrieved chunks. Alert if the grounding score drops
  below 0.85 week-over-week."

  ━━━ MARGIN NOTE ━━━
  ✅ Two-part framework (prevention + detection) shows structured thinking.
  ✅ Named a specific threshold (0.65 cosine similarity) rather than vague
    'low confidence'. This is actionable.
  ✅ Connected citation to hallucination prevention — not just a UX feature.
  ✅ Described a monitoring pipeline (5% sample, LLM-as-judge, dashboard,
    alert threshold). This is a complete evaluation strategy, delivered
    here as part of the failure mode discussion.
  💡 Could also mention: faithfulness evaluation using RAGAS or similar
    framework for offline evaluation on a labeled test set.`
      },
      {
        title: "Phase 4: Evaluation, Cost, and Trade-offs [36:00–45:00]",
        content: `The final phase tests whether the candidate can speak to production
  readiness, not just design elegance. Three concerns dominate here:
  evaluation methodology, hallucination prevention, and cost governance.

  The RAGAS framework answer is the right response to "how do you know if
  retrieval is good?" RAGAS decomposes quality into four orthogonal metrics —
  answer faithfulness, answer relevance, context precision, and context recall
  — each measuring a different failure mode. A candidate who names this
  framework and explains what each metric catches (faithfulness catches
  hallucinations, context recall catches retrieval misses) demonstrates they
  have thought seriously about offline evaluation pipelines.

  The hallucination guard design — reject if top-chunk cosine similarity
  falls below 0.65 — is the concrete, implementable mechanism the interviewer
  was fishing for. Abstract answers like "validate the output" score near zero.
  The specific threshold and the fallback response ("I don't have enough
  information to answer that question accurately") are what make the design
  real.

  The final trade-off exchange on self-hosted vs API is the type of pragmatic
  cost reasoning that matters in practice. The candidate's self-hosted breakeven
  calculation (>100M tokens/month) and the recommendation for API-first until
  that threshold is reached shows they can weigh total cost of ownership, not
  just per-token pricing. Ending with the phased roll-out plan — per-team
  pilots, RAGAS threshold gate, then company-wide — closes the round on
  a deployment-readiness note.`,
        codeExample: `
  [36:00–40:00 — EVALUATION STRATEGY]

  INTERVIEWER: "How would you know if this system is performing well
  after launch?"

  CANDIDATE: "I'd measure three things at three granularities.

  Offline, before launch: build a labeled evaluation set of 200 question-
  answer pairs from the actual document corpus — questions employees are
  likely to ask, with ground-truth answers verified by a domain expert.
  Measure retrieval recall@5 (does the right chunk appear in the top 5?)
  and answer faithfulness (does the LLM answer match the ground truth?).
  Target: retrieval recall@5 above 92%, faithfulness above 88%.

  Online, in production: sample 5% of live queries. Run them through an
  LLM-as-judge that scores each on: relevance (does the answer address
  the question?), groundedness (is every claim supported by the cited
  documents?), and completeness. Aggregate into a daily quality score.
  Alert if any dimension drops more than 10% relative week-over-week.

  Business metric: track user engagement signals. A user who clicks
  'thumbs down' or immediately reformulates the same question signals a
  failed response. Track the reformulation rate — if users are asking
  the same question twice, the first answer was not good enough. Target:
  reformulation rate below 8%."

  ━━━ MARGIN NOTE ━━━
  ✅ Three-tier evaluation (offline dataset, online sampling, business
    metric) is the expected strong answer structure. Most candidates
    name one metric; this candidate named six concrete ones.
  ✅ Named SPECIFIC targets (92% recall@5, 88% faithfulness, 8% reform.
    rate) rather than vague "high quality".
  ✅ The reformulation rate as a business proxy is a strong signal —
    it's a real product metric that does not require human labeling.

  [40:00–43:00 — COST AND FAILURE MODES]

  INTERVIEWER: "What would break first at 10× scale?"

  CANDIDATE: "At 10× scale — 200,000 queries/day — three things get
  stressed. First, the LLM cost: $42,000/month. At that point the
  GPT-4o-mini routing strategy becomes mandatory, not optional. I'd
  add a query classifier that routes short factual queries (probably 60%
  of volume) to mini at $0.00027/query, keeping complex reasoning on
  GPT-4o. Blended cost: 0.6×$0.00027 + 0.4×$0.007 = $0.0029/query.
  10× volume: 200K × 30 × $0.0029 = $17,400/month vs $42K.

  Second, the vector index: at 10× document growth we'd have 5M documents,
  6.5M chunks, 38 GB HNSW index. Still fits on a single server — no
  sharding needed until 50M+ documents.

  Third, the retrieval latency: at 6.5M chunks, HNSW query time rises from
  ~3ms to ~8ms. Still within the latency budget. We'd need to shard at
  around 50M chunks."

  ━━━ MARGIN NOTE ━━━
  ✅ Named three specific stress points rather than a generic "scale the
    servers". Each is quantified.
  ✅ The cost calculation is carried through with numbers (not "it would
    be more expensive").
  ✅ Vector DB scaling analyzed correctly (HNSW latency scaling with N).
  💡 Missing: could also mention the re-embedding cost if the embedding
    model is changed during this growth period (E6 estimation topic).

  [43:00–45:00 — TRADE-OFF SYNTHESIS]

  CANDIDATE: "Let me state the three key trade-offs I made.

  First: hybrid retrieval (dense + sparse) versus dense-only. Dense-only is
  simpler and cheaper to operate. Hybrid is better for exact-match queries
  like document numbers, employee names, and policy codes where BM25 keyword
  search significantly outperforms embedding search. Enterprise documents
  have many of these exact-match queries, which is why I included the
  Elasticsearch layer despite the operational overhead.

  Second: reranking versus no reranking. Without a reranker, retrieval is
  15–20% less precise — more hallucination risk, more 'I can't find that'
  responses. With a reranker, you add 50ms to the query path. Given the
  1-second TTFT budget and the enterprise quality requirement, that 50ms
  is worth it.

  Third: GPT-4o versus a self-hosted model. At $4,200/month and 10,000
  employees, GPT-4o is straightforward to justify — it is roughly $0.42
  per employee per month. Self-hosting a 13B model would require one A100
  ($1,200/month rental) plus engineering overhead — only sensible above
  ~200K queries/day. We are at 20K queries/day at launch."

  INTERVIEWER: "Great. That covers the main areas. Any questions for me?"

  ━━━ MARGIN NOTE ━━━
  ✅ Three trade-offs, each clearly stated with both sides and a justified
    resolution. This is the expected strong answer format for Step 9.
  ✅ The cost per employee calculation ($0.42/month) reframes the cost in
    business terms — this is the kind of framing that resonates with
    engineering managers making budget decisions.

  OVERALL ASSESSMENT:
  Strong signal in: requirements clarification (access control question),
  capacity estimation (token-level cost calculation), retrieval deep dive
  (reranker rationale, hallucination gate), evaluation (three-tier plan
  with specific metrics), trade-off synthesis (numbers-grounded reasoning).

  Missing or weak: did not explicitly mention RAGAS or any standard RAG
  eval framework; did not discuss incremental indexing strategy (what
  happens when a document is updated — does the old chunk get removed?).
  These would push from 'hire' to 'strong hire' at senior level.

  LEVEL CALIBRATION:
  As delivered: Senior SWE bar, comfortable hire.
  For Staff: would need to go deeper on the document update/versioning
  problem (how do you handle a policy document that changes monthly?)
  and on the distributed retrieval architecture at 50M+ document scale.`
      }
    ],

   examples: [
     {
       title: "Designing access-controlled RAG for a 20K-employee enterprise",
       input: "Design a RAG-based internal knowledge assistant for a 20,000-person company. Employees should only see documents they have permission to access. 50,000 documents total, 10,000 queries per day.",
       output: "Architecture: per-user permission-filtered vector index with late-binding access check. Chunking: 128/512 token hybrid. Retrieval: BM25 + dense → reranker → top-5. Hallucination guard: cosine threshold 0.65. Evaluation: RAGAS faithfulness + context precision.",
       explanation: "Step 1: clarify access model — document-level ACLs stored in an external IAM. Step 2: capacity: 50K docs × 5 pages × 650 tokens / 250 effective = 650K chunks at 1.5KB each = ~975MB index, fits in memory. 10K queries/day = 0.12 QPS avg; trivially served by a single node. Step 3: architecture — offline pipeline: parse → chunk → embed (text-embedding-3-small) → store in pgvector with document_id and permission metadata. Online pipeline: user query → BM25 + dense retrieval with WHERE permission_ids @> user_groups filter → cross-encoder reranker → top-5 → GPT-4o → response. Step 4: hallucination guard — if max chunk similarity < 0.65 return 'I cannot find relevant information in the approved documents.' Step 5: evaluation — weekly RAGAS sweep on a held-out Q&A set; alert if faithfulness < 0.85."
     },
     {
       title: "Applying HyDE to improve recall for abstract policy questions",
       input: "A legal compliance assistant retrieves poorly on abstract policy questions like 'What are our obligations if a vendor breaches data residency requirements?' Standard dense retrieval returns irrelevant chunks.",
       output: "HyDE pattern: ask GPT-3.5-turbo to draft a hypothetical policy memo that answers the question, embed the draft, retrieve by draft embedding. Recall improves for abstract/regulatory language at cost of one extra LLM call per query.",
       explanation: "Step 1: diagnose — compliance documents use formal regulatory language while queries are conversational; the embedding space gap causes retrieval failure. Step 2: apply HyDE — send the query to GPT-3.5-turbo with prompt 'Write a brief paragraph from a corporate policy document that would answer: [query]'. Step 3: embed the generated paragraph with text-embedding-3-small (same model as indexing). Step 4: retrieve top-20 by cosine similarity to the generated paragraph embedding. Step 5: cross-encoder rerank against the original query (not the HyDE doc) to avoid HyDE hallucination creep. Step 6: measure — A/B test HyDE vs baseline on RAGAS context recall; target 15%+ lift for abstract queries."
     }
   ],

   tips: [
     "The access control question in Step 1 is the highest-signal question you can ask for an enterprise RAG system. Most candidates never ask it. It changes the retrieval architecture.",
     "Name specific models and libraries: 'text-embedding-3-small', 'ms-marco-MiniLM', 'LangChain RecursiveCharacterSplitter'. Generic answers ('an embedding model', 'a reranker') score lower.",
     "The retrieve-many-rerank-few pattern (top-20 → cross-encoder → top-5) is the production standard. Always include a reranker and justify it with the bi-encoder vs cross-encoder trade-off.",
      "State a retrieval confidence threshold as the hallucination prevention mechanism. 'If top chunk similarity is below 0.65, return no-answer' is a concrete, actionable design decision.",
      "The reformulation rate is the best product-level proxy for RAG quality — it requires no labeling and directly measures whether users got a useful answer on the first try."
    ],

    tricks: [
      "ACCESS CONTROL SHORTCUT: 'Tag each vector with permissions_list at index time. Filter by permissions at query time. Two lines of design, massive enterprise value.'",
      "COST CALCULATION TEMPLATE: 'input_tokens × $2.50/M + output_tokens × $10.00/M = cost per query. Times daily_queries × 30 = monthly cost.' Write it out in front of the interviewer.",
      "RERANKER JUSTIFICATION: 'Bi-encoder encodes query and doc independently — fast but coarse. Cross-encoder sees both together — slow but precise. Retrieve 20 with ANN (5ms), rerank with cross-encoder (50ms). 55ms total.'",
      "HALLUCINATION GATE: 'If top retrieved chunk cosine similarity is below 0.65 — return no-answer rather than low-confidence generation.' One threshold, one rule.",
      "THREE-TIER EVAL: 'Offline labeled dataset (200 Q&A pairs), online LLM-as-judge (5% sample), business metric (reformulation rate below 8%).' Say all three, give specific targets."
    ],

    memoryAids: [
      "RAG PIPELINE: 'Parse → chunk → embed → index (offline). Query → embed → retrieve → rerank → assemble → generate → stream (online).' Two pipelines, each named in order.",
      "ENTERPRISE RAG ADDITIONS: 'Access control (tag vectors + filter). Hybrid retrieval (dense + BM25). Reranker. Confidence gate. Source citations. All five needed for enterprise.'",
      "CHUNKING CONSTRAINTS: 'Paragraph-aware. 300 tokens. 50-token overlap. Tables as atomic units.' Four rules.",
      "EVALUATION TIERS: 'Offline: labeled eval set with recall@5 and faithfulness. Online: LLM-as-judge 5% sample. Business: reformulation rate.'",
      "HALLUCINATION DEFENSE: 'Prevention: system prompt + confidence gate. Detection: citation enforcement + LLM-as-judge monitoring.'"
    ],

    interviewPatterns: [
      "'How do you handle hallucination?' → two-part framework: prevention (system prompt, confidence gate) and detection (citation enforcement, LLM-as-judge monitoring with alert threshold).",
      "'What chunking strategy would you use?' → paragraph-aware, 300 tokens, 50-token overlap, atomic tables. Justify each decision with the problem it solves.",
      "'Why do you need a reranker?' → bi-encoder vs cross-encoder trade-off. ANN retrieval is fast but coarse; cross-encoder is slow but precise. Retrieve 20, rerank to 5.",
      "Follow-up: 'a document gets updated — how does your index handle it?' → delete old chunks by doc_id, re-chunk and re-embed new version, upsert. Design a doc_id-based deletion API at index time.",
      "Follow-up: 'how would you handle 50 million documents?' → at 50M chunks, HNSW index is ~430 GB — needs 2-3 node sharded cluster. Shard by doc_id range or department. Parallel query, merge results."
    ],

    faq: [
      {
        question: "What is the difference between a bi-encoder and a cross-encoder, and when should you use each?",
        answer: "A bi-encoder (used in embedding models like text-embedding-3-small, E5, BGE) encodes the query and each document independently into a fixed-size vector. Similarity is computed as a dot product or cosine between the two vectors. This allows pre-computing all document embeddings offline and performing fast ANN retrieval at query time — O(log N) with HNSW. The limitation is that the query and document never interact during encoding: the model cannot perform cross-attention between them. A cross-encoder (used in reranker models like ms-marco-MiniLM, Cohere Reranker) takes a (query, document) pair as joint input and computes a relevance score using full transformer attention between both. This is much more accurate because the model can identify specific phrase matches, semantic overlap, and subtle relevance signals. The cost: cross-encoders must be run for each (query, candidate) pair at query time — O(K) for K candidates, not O(1). The production pattern is always: bi-encoder for fast candidate retrieval (top 20–100), cross-encoder for precise reranking of those candidates. Never run a cross-encoder over the full corpus.",
        category: "retrieval"
      },
      {
        question: "How do you handle documents that are updated — say, a policy document that changes monthly?",
        answer: "Document versioning requires a deletion-plus-reinsert strategy: (1) Every document is stored with a doc_id assigned at upload time. All chunks derived from that document are tagged with the same doc_id and a version_id. (2) When an updated version is uploaded, the system: deletes all vectors where doc_id = old_doc_id AND version_id = old_version_id from the vector DB; chunks and embeds the new document; inserts new vectors with the same doc_id and incremented version_id. (3) The search index (Elasticsearch) is also updated: delete old doc_id + version, insert new. (4) An audit log records the replacement event for compliance. The tricky case: if the update is minor (only a few sentences changed), re-embedding the entire document wastes compute. An optimization: use a document-level hash to detect whether the content actually changed; if unchanged, skip re-embedding. For changed documents, paragraph-level diff can identify which chunks changed and re-embed only those — but this adds implementation complexity that is only worth it at large document-update volume.",
        category: "operations"
      },
      {
        question: "What is hybrid retrieval and when is it better than dense-only retrieval?",
        answer: "Hybrid retrieval combines dense (vector) search with sparse (keyword) search, typically using BM25 or Elasticsearch for the sparse component. Results from both are merged, usually via reciprocal rank fusion (RRF) or a weighted sum. Dense-only retrieval excels at semantic matching: 'employee benefits' will match 'compensation package' even with no keyword overlap. Sparse retrieval excels at exact-match queries: searching for 'Policy 4.2.1' or 'John Smith' will not match semantically because names and codes are not semantic — embedding models encode them as arbitrary tokens with no meaningful neighbourhood structure. Enterprise documents are full of both types of queries. In benchmarks, hybrid retrieval consistently outperforms either method alone by 5–15% on recall@10 on enterprise document corpora. The operational cost: maintaining two separate indices (vector DB and Elasticsearch) and implementing the fusion logic. Worth it for any enterprise use case with mixed query types.",
        category: "retrieval"
      },
      {
        question: "How do you build the labeled evaluation dataset for offline evaluation?",
        answer: "Building a labeled RAG evaluation dataset is an ongoing operational practice, not a one-time task. Initial dataset (before launch): work with 5–10 domain experts who represent the actual user population. For each, have them write 20–40 question-answer pairs based on real documents in the corpus. Aim for diversity: factual lookup questions, multi-document synthesis questions, questions where the answer is not in the corpus (to test the no-answer path), and questions with ambiguous phrasing. Aim for 200–500 pairs minimum. Scale the dataset using LLM assistance: give GPT-4o a document and ask it to generate 10 question-answer pairs; have a human reviewer verify and edit a 20% sample. This allows generating thousands of pairs cheaply. Ongoing dataset curation: every time a user marks a response as bad (thumbs down) or reformulates a question, capture that as a candidate hard example. After human review, add confirmed failures to the evaluation set. The evaluation set should grow over time and always include recent document types — a static eval set becomes unrepresentative as the corpus evolves.",
        category: "evaluation"
      },
      {
        question: "What is RAGAS and how does it relate to the evaluation strategy described in this mock?",
        answer: "RAGAS (Retrieval Augmented Generation Assessment) is an open-source evaluation framework for RAG systems that provides standardised metrics computed automatically using an LLM-as-judge approach. The key RAGAS metrics: faithfulness (are claims in the answer supported by the retrieved context?), answer relevance (does the answer address the question asked?), context recall (does the retrieved context contain the information needed to answer the question?), and context precision (is the retrieved context relevant, or is it noisy?). RAGAS is the standardised implementation of the offline evaluation strategy described in this mock — it operationalises the same LLM-as-judge concept with specific prompts and aggregation methods. In production use: run RAGAS on your labeled evaluation set before each major change (model update, chunking strategy change, retrieval pipeline change) to detect regressions. The online monitoring described in this mock (5% sample, LLM-as-judge, daily score) is a lightweight version of RAGAS running continuously on live traffic. A strong interview answer names RAGAS as the implementation framework rather than describing the concept from scratch.",
        category: "evaluation",
        sourceLinks: [{ label: "RAGAS Documentation", url: "https://docs.ragas.io" }]
      }
    ],

    practiceProblems: [
      `PRACTICE: Time yourself for 45 minutes answering: "Design a RAG system
  for a legal firm where lawyers can search across 10 years of case documents."

  Self-evaluate after the clock stops against these criteria:
  (1) Did you ask about document access control (attorney-client privilege, case
      assignment)? ✅ If yes, this is harder than the enterprise general case.
  (2) Did you estimate the corpus size in tokens and chunks, and derive the
      vector index size in GB?
  (3) Did you include a reranker and explain the bi-encoder vs cross-encoder
      trade-off?
  (4) Did you name a specific hallucination prevention mechanism
      (system prompt + confidence threshold) and a detection mechanism
      (LLM-as-judge monitoring)?
  (5) Did you state a monthly LLM cost figure with the formula
      input_tokens × price_in + output_tokens × price_out?
  (6) Did you describe an evaluation pipeline with at least two metrics
      and specific target values?

  LEGAL-SPECIFIC COMPLICATIONS to address if time permits:
  - Case documents have structured citations ([2019] EWCA Civ 547) that
    require exact match retrieval — hybrid search is mandatory.
  - Attorney-client privilege means document-level access control must be
    enforced per case assignment, not just per department.
  - Answers must be citable to specific case documents — hallucination has
    professional liability implications, making the confidence gate
    threshold higher than in a typical enterprise knowledge base.`
    ],

    references: [
      {
        source: "blog",
        attribution: "Lewis et al. (2020) — Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks - https://arxiv.org/abs/2005.11401",
        insight: "Original RAG paper; retrieve-then-generate pipeline; dense passage retrieval mechanics"
      },
      {
        source: "blog",
        attribution: "RAGAS — Evaluation Framework for RAG Pipelines - https://docs.ragas.io",
        insight: "Faithfulness, relevance, context recall and precision metrics; LLM-as-judge implementation"
      },
      {
        source: "blog",
        attribution: "Pinecone — RAG Guide: Chunking Strategies - https://www.pinecone.io/learn/chunking-strategies/",
        insight: "Paragraph-aware chunking, overlap rationale, chunk size benchmarks on retrieval quality"
      }
    ]
  },
{
    id: "topic-ai-mocks-llm-serving-round",
    moduleId: "mod-ai-mocks",
    title: "Mock Round: LLM Serving and Inference Platform",

    intuition: `This mock focuses on LLM inference infrastructure — the
  platform question asked at companies building AI products at scale. The
  deep-signal moments are the KV cache arithmetic (can the candidate
  size the GPU fleet from first principles?), the batching trade-off
  (does the candidate know continuous vs static batching?), and the latency
  SLO decomposition (does the candidate separate TTFT from TPOT correctly?).
  The arithmetic must be worked live on the whiteboard — showing the steps
  is as important as getting the right number.`,

    complexity: {
      time: "45-minute round. Peak signal density: minutes 15-30 (capacity estimation and KV cache sizing). The candidate who works the arithmetic correctly and lands on a defensible GPU count before minute 25 is on track for a hire signal.",
      space: "KV cache formula and TPOT formula must be held simultaneously during estimation. The two-constraint check (memory fit AND throughput) is the common stumble point."
    },

    lesson: [
      {
        title: "Setup and Question",
        content: `INTERVIEW FORMAT: 45-minute technical round, staff
  software engineer level. The serving platform question is typically asked
  at companies where LLM inference is a core product capability, not a
  peripheral feature: AI API companies, large-scale consumer AI products,
  and AI infrastructure teams.

  QUESTION: "Design the LLM serving infrastructure for a company that
  provides an AI writing assistant to 2 million paying users. The assistant
  uses a 70B parameter model. Walk me through how you would design the
  serving stack."

  INTERVIEWER PROFILE: Principal engineer on the inference team. Has owned
  GPU cluster operations for 2+ years. Looking for: hardware-grounded
  reasoning, specific knowledge of KV cache mechanics, awareness of
  continuous batching, and a credible GPU count derived from first
  principles.`,
        diagram: asciiDiagram(`
  MOCK INTERVIEW — ANNOTATED TRANSCRIPT
  LLM Serving and Inference Platform
  Duration: 45 minutes
  Candidate level: Staff Software Engineer

  ┌─────────────────────────────────────────────────────────────┐
  │ FORMAT LEGEND                                               │
  │ INTERVIEWER: [question or prompt]                           │
  │ CANDIDATE:   [response]                                     │
  │ ━━━ MARGIN NOTE ━━━ [signal annotation]                     │
  └─────────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Phase 1: Requirements and Estimation [0:00–16:00]",
        content: `The LLM serving problem is mathematically richer than most candidates
  expect. This phase requires translating a business request — "we're seeing
  10,000 API calls per day" — into the hardware constraint that governs
  everything else: how much GPU memory the system needs, and therefore what
  instance type to buy and how many to run.

  The key insight the candidate demonstrates is the KV cache memory math. For
  a 7B model at FP16: 7B parameters × 2 bytes = 14GB just for weights. The
  KV cache per token is 2 × layers × heads × head_dim × 2 bytes. For Llama-2
  7B that is 2 × 32 × 32 × 128 × 2 = 524,288 bytes = 0.5MB per token per
  request. With a 2,048-token context, one concurrent request occupies 1GB of
  KV cache. An A100 80GB holds 80 − 14 (weights) − overhead = ~60GB available
  for KV cache: 60 concurrent requests at that context length. This math is
  what a senior candidate actually does in the interview.

  The latency target discussion — 200ms TTFT, 20ms/token streaming — maps to
  the compute budget. At 20 tokens/second per request and 5 concurrent requests
  at steady state (10K/day ÷ 86,400 × average 120-second holding time), the
  throughput required is 100 tokens/second, well within what a single A100
  can deliver at 7B scale. The candidate delivers all of this without being
  prompted, which is the senior bar.`,
        codeExample: `
  [0:00–4:00 — REQUIREMENTS]

  CANDIDATE: "Before I size anything, a few clarifying questions.
  First: what is the latency SLA? For an interactive writing assistant,
  the user expectation is quite different from a batch processing system."

  INTERVIEWER: "Streaming. TTFT under 500ms, TPOT under 30ms so the
  text appears fluidly."

  CANDIDATE: "Good. Second: what are the typical request characteristics —
  input length, output length?"

  INTERVIEWER: "The assistant works on documents. Average input: 2,000
  tokens of document context plus a 100-token instruction. Average output:
  500 tokens of generated text."

  CANDIDATE: "So 2,100 input, 500 output per request. Third: is the 70B
  model fixed, or can we choose quantisation or a different deployment
  strategy?"

  INTERVIEWER: "The 70B model is required for quality — we have validated
  that smaller models underperform on this task. Quantisation is acceptable
  if quality is maintained."

  ━━━ MARGIN NOTE ━━━
  ✅ Candidate asked about quantisation explicitly. This is the right
    question because 70B BF16 requires 2+ GPUs but 70B INT4 fits one H100.
    The model selection question directly determines hardware architecture.
  ✅ Got the input/output token profile. The 2,100:500 ratio means input
    tokens dominate cost but output tokens dominate latency. Good setup
    for the estimation.

  CANDIDATE: "Fourth: what is the 2M user concurrency profile? Not all
  are active simultaneously."

  INTERVIEWER: "About 5% DAU — 100,000 daily active users. Peak is
  roughly 4× the daily average. Users are mostly in US business hours."

  [4:00–16:00 — CAPACITY ESTIMATION — WORKED ON WHITEBOARD]

  CANDIDATE: "Let me work through the sizing. I'll do this in three steps:
  QPS, GPU throughput, and then the GPU count."

  CANDIDATE: "Step 1: QPS. 100K DAU, assume each user makes 10 requests
  per day during active sessions. That's 1M requests/day. Daily average
  QPS: 1M ÷ 86,400 ≈ 11.6 requests/second. Peak is 4× for business hours
  concentration: 46 requests/second. I'll design for 50 QPS peak."

  ━━━ MARGIN NOTE ━━━
  ✅ Correct method: DAU × requests/user ÷ 86,400 × peak_ratio.
  ✅ Rounded to a clean number (50 QPS) — practical instinct.

  CANDIDATE: "Step 2: Request duration. I need TTFT and TPOT to get the
  request duration, which I need for Little's Law.

  First, the model. 70B INT4: model_bytes = 70 × 10^9 × 0.5 bytes = 35 GB.
  Fits on a single H100-80GB — that's an important result because it means
  we do not need tensor parallelism for the weights.

  TPOT: the TPOT formula is model_bytes divided by HBM bandwidth times
  1.3 for overhead.
  H100 HBM bandwidth is 3,350 GB/s.
  TPOT = (35 GB ÷ 3,350 GB/s) × 1,000 × 1.3 = 13.6ms per output token.
  Under the 30ms SLA. ✓"

  ━━━ MARGIN NOTE ━━━
  ✅ Showed the formula before plugging in numbers — the right whiteboard
    technique. Interviewers want to see the derivation, not just the answer.
  ✅ Explicitly named and checked the SLA against the computed value.
    '13.6ms under the 30ms SLA ✓' — this is how you communicate confidence.
  ✅ INT4 quantisation decision justified by the single-GPU fit — engineering
    reasoning, not just a cost decision.

  CANDIDATE: "TTFT: for 2,100 input tokens, prefill FLOPs = 2 × 70 ×
  10^9 × 2,100 = 2.94 × 10^14 FLOPs. H100 has roughly 1,000 TFLOPs for
  this precision — actually let me use 700 TFLOPs for BF16-equivalent
  effective throughput on INT4. TTFT from compute: 2.94 × 10^14 ÷ 7 ×
  10^14 = 0.42 seconds. Plus network and overhead, roughly 450ms. Under
  the 500ms SLA, but only barely."

  ━━━ MARGIN NOTE ━━━
  ✅ Worked the TTFT calculation from first principles.
  ✅ Flagged the SLA risk ("only barely") rather than calling it a clean pass.
    Intellectual honesty about tight margins is a strong signal.
  💡 Could improve: explain that at batch=1 the prefill is faster than
    the FLOPs estimate suggests because FlashAttention makes effective
    memory utilisation much higher than the naive FLOPs-to-TFLOPs ratio.
    The empirical TTFT for 2K input on H100 is closer to 150-250ms.
    The candidate's 420ms is conservative but defensible.

  INTERVIEWER: "How does request duration factor into your sizing?"

  CANDIDATE: "By Little's Law: concurrent requests = QPS × request duration.
  Request duration = TTFT + TPOT × N_output = 0.45s + 0.0136s × 500 =
  0.45 + 6.8 = 7.25 seconds per request.
  Peak concurrency = 50 QPS × 7.25s = 362 concurrent requests."

  ━━━ MARGIN NOTE ━━━
  ✅ Applied Little's Law correctly.
  ✅ Showed the arithmetic step by step — this is the whiteboard interview
    standard. An answer that just says "362 concurrent requests" without
    showing the derivation would earn less signal.

  CANDIDATE: "Step 3: GPU count. I need to check two constraints —
  throughput and memory — and take the binding one.

  Throughput constraint: 50 QPS × 500 output tokens = 25,000 output
  tokens/second system-wide.
  Per-H100 output throughput with continuous batching at batch ≈ 20:
  TPOT stays at ~13.6ms, so per-request 500 tokens take 6.8 seconds.
  At batch 20: 20 requests / 6.8s = 2.94 concurrent completions per second.
  Output tok/s per H100: 2.94 × 500 = 1,470 tok/s.
  H100s for throughput: ceil(25,000 ÷ 1,470) = 18 GPUs.

  Memory constraint: KV cache sizing.
  KV formula: 2 × layers × KV_heads × head_dim × precision × seq_len × batch.
  For 70B Llama-3 architecture: 80 layers, 8 KV heads (GQA), head_dim 128,
  BF16 KV cache.
  KV per token = 2 × 80 × 8 × 128 × 2 = 327,680 bytes = 320 KB/token.
  Sequence length for this request: 2,100 input + 500 output = 2,600 tokens.
  KV per request = 320 KB × 2,600 = 800 MB = 0.78 GB.
  Available KV per H100: 80 - 35 (weights) - 2 (overhead) = 43 GB.
  Max concurrent per H100: floor(43 ÷ 0.78) = 55 requests per GPU.
  H100s for memory: ceil(362 ÷ 55) = 7 GPUs.

  Throughput binds: 18 GPUs. Memory was the easier constraint.

  Apply 65% utilisation cap: ceil(18 ÷ 0.65) = 28 H100s.
  Add 2 pre-warmed standby for burst handling.
  Total: 30 H100s."

  ━━━ MARGIN NOTE ━━━
  ✅ This is the highest-signal section of the interview. The candidate
    correctly performed both the throughput check and the memory check,
    identified the binding constraint, and applied the utilisation cap.
    Many candidates do only one of these checks. Doing both with correct
    arithmetic is a clear hire signal at staff level.
  ✅ Named 'GQA' and used 8 KV heads, not 64 attention heads. This is the
    most common candidate error in KV cache sizing and getting it right
    shows production knowledge.
  ✅ Landed on a concrete number (30 H100s) and provided the path.
    An interviewer can audit each step and find no gaps.`
      },
      {
        title: "Phase 2: Architecture and Deep Dives [16:00–36:00]",
        content: `The architecture phase for LLM serving is fundamentally different from a
  typical systems-design question: the answer is already known in broad strokes
  (request router → inference cluster → KV cache manager), but the depth is in
  the serving optimisations that make the difference between a toy demo and a
  production system.

  Continuous batching is the highest-signal optimisation to know. The naive
  static batching approach — fill a batch, run inference, clear it — wastes
  compute whenever requests in the batch finish early. Continuous batching
  (pioneered in vLLM) inserts new requests into idle batch slots on every
  forward pass, achieving near-100% GPU utilisation even with highly variable
  response lengths. Naming vLLM specifically and explaining the PagedAttention
  KV cache management underneath it (KV cache stored in fixed-size "pages",
  dynamically allocated like virtual memory) earns full credit on this deep dive.

  The speculative decoding explanation is bonus depth. The mechanism: run a
  small draft model (e.g., 7B) to generate K tokens speculatively, then run
  the large model to verify all K in a single forward pass. Speedup is
  proportional to the acceptance rate; with a well-matched draft model
  and chat-style workloads you see 2–3× end-to-end throughput improvement.

  LoRA for fine-tuned model serving is a clean second deep-dive option. The
  key insight is that LoRA weights are tiny (rank-16 adapters for a 7B model
  are ~50MB vs 14GB base), so you can serve many fine-tuned variants from a
  single GPU instance by swapping adapters between requests rather than
  loading separate checkpoints.`,
        codeExample: `
  [16:00–22:00 — HIGH-LEVEL ARCHITECTURE]

  CANDIDATE: "Let me sketch the serving architecture."

    User request (HTTPS, streaming via SSE)
        │
        ▼
    API Gateway
    (auth, rate limiting, request routing)
        │
        ▼
    Request Queue
    (priority queue: interactive over batch)
        │
        ▼
    Load Balancer
    (routes to least-loaded inference node)
        │
        ▼
    Inference Node (H100)
    ├── vLLM serving engine
    │   ├── Continuous batching scheduler
    │   ├── PagedAttention KV cache manager
    │   └── 70B INT4 model weights
    │
    └── Streaming response (SSE) back to client
        │
        ▼
    Observability
    (TTFT, TPOT, token counts, cost per request)

  ━━━ MARGIN NOTE ━━━
  ✅ Named vLLM specifically as the serving engine — shows awareness of
    the production tooling landscape.
  ✅ Named PagedAttention explicitly in the architecture — shows understanding
    of KV cache management, not just that a cache exists.
  ✅ Priority queue for interactive vs batch — good operational instinct.
    Batch jobs should not block interactive user requests.
  ✅ Observability as a first-class component, not an afterthought.

  [22:00–28:00 — CONTINUOUS BATCHING DEEP DIVE]

  INTERVIEWER: "You mentioned continuous batching. Can you explain how it
  differs from static batching and why it matters?"

  CANDIDATE: "Static batching groups N requests into a batch, runs the
  full generation for all N until every request in the batch has finished,
  then starts the next batch. The problem: requests have different output
  lengths. If one request finishes at token 50 and another needs 800
  tokens, the GPU sits idle in the first request's slot for the remaining
  750 tokens, waiting for the slow request to finish before it can start
  a new request. GPU utilisation is typically 30–50% with static batching.

  Continuous batching — implemented in vLLM, TGI, and SGLang — replaces
  finished requests with new ones in the same batch, mid-generation. As
  soon as request A finishes at token 50, request D joins the batch
  immediately. The GPU always operates at maximum concurrent capacity.
  GPU utilisation rises to 70–90%.

  Anyscale published benchmarks in 2023 showing 23× throughput improvement
  over the HuggingFace Transformers baseline using continuous batching.
  That's the most cited result for why any production LLM serving
  deployment should use continuous batching."

  ━━━ MARGIN NOTE ━━━
  ✅ Named the specific problem with static batching (idle slots while
    waiting for the slowest request).
  ✅ Named the specific metric (GPU utilisation 30-50% vs 70-90%).
  ✅ Cited the Anyscale result with specific numbers (23×, 2023). Citing
    real benchmarks with numbers is a staff-level signal.
  ✅ Named three frameworks (vLLM, TGI, SGLang) by name, not generically.

  [28:00–35:00 — KV CACHE DEEP DIVE]

  INTERVIEWER: "You sized the KV cache earlier using 8 KV heads for the
  70B model. Why 8 rather than 64?"

  CANDIDATE: "This is the grouped query attention distinction. The 70B
  Llama-3 model uses 64 attention heads — one query head per attention head
  — but only 8 KV heads. With grouped query attention, multiple query heads
  share a single KV head: 64 query heads are grouped into 8 groups of 8,
  and each group shares one KV head pair.

  The KV cache stores only the K and V projections, not the Q projections.
  Q is computed fresh at each decode step and not cached — it's used once
  to attend to K and V and then discarded. So the KV cache is proportional
  to KV heads, not to attention heads.

  Using 64 instead of 8 would overestimate the KV cache by 8×. At 2,600
  tokens and 30 H100s: 8× larger KV = 8 × 0.78 GB = 6.25 GB per request.
  Available KV per H100: 43 GB. Max concurrent: floor(43 ÷ 6.25) = 6.
  Total for 362 concurrency: 61 GPUs instead of 7. An 8× hardware cost
  error from one wrong parameter."

  ━━━ MARGIN NOTE ━━━
  ✅ Explained WHY Q is not cached (computed fresh each decode step) —
    not just that Q is different from KV. This level of mechanism
    understanding is a strong staff-level signal.
  ✅ Quantified the cost of the error: 61 GPUs vs 7 GPUs from one wrong
    parameter. Making the cost of a mistake concrete is a professional habit.
  ✅ Connected back to the GQA architecture decision earlier in the
    interview — shows coherent understanding, not isolated facts.

  INTERVIEWER: "What happens if a single long request comes in with
  128,000 input tokens? Does your current architecture handle it?"

  CANDIDATE: "Not cleanly with current sizing. Let me recalculate.
  128,000 + 500 output = 128,500 tokens.
  KV per request = 320 KB × 128,500 = 39.7 GB.
  Available KV per H100: 43 GB. So one request takes up 92% of the KV
  budget — at most 1 request per H100.

  Two options. First: handle 128K-context requests on dedicated nodes
  sized for it, with a context-length router at the gateway layer. Short
  requests go to the standard 30-GPU fleet. Long requests go to a separate
  smaller fleet with more generous KV budget configuration.

  Second: use INT8 KV quantisation — halves KV memory to 160 KB/token.
  KV per 128K request = 160 KB × 128,500 = 19.85 GB. Now fits with room
  for 2 concurrent requests per H100.

  I'd do both: INT8 KV cache as a baseline (it applies to all requests
  with near-zero quality impact) and context-length routing as a second
  layer for the extreme long-context cases."

  ━━━ MARGIN NOTE ━━━
  ✅ Recalculated on the fly correctly (320 KB × 128,500 = 39.7 GB).
    Doing arithmetic under time pressure without a calculator is expected
    at staff level. Showing the work matters.
  ✅ Proposed two complementary solutions rather than one. The routing
    plus quantisation combination is the production-realistic answer.
  ✅ Named INT8 KV quantisation specifically — many candidates know about
    weight quantisation but not KV cache quantisation.`
      },
      {
        title: "Phase 3: Failure Modes, Evaluation, and Trade-offs [36:00–45:00]",
        content: `The closing phase tests operational maturity — can the candidate reason
  about what goes wrong and how to detect it before users complain?

  The KV cache OOM (out-of-memory) failure mode is the most important one
  to know for LLM serving. It happens when a long-context request exhausts
  the GPU's available KV cache memory, causing either an OOM crash or
  excessive swapping to CPU. The mitigation is a combination of maximum
  context length enforcement at the API gateway, KV cache eviction policies
  (evict shortest remaining requests first), and CPU offloading for KV
  cache blocks that don't fit in GPU VRAM.

  The token budget explanation closes the cost reasoning loop. At $0.002 per
  1,000 input tokens (GPT-4o pricing as baseline), a 2,048-token request
  costs $0.004. At 10,000 queries/day that is $40/day or $14,600/year — before
  output tokens. A candidate who can articulate the cost model, identify that
  input tokens are 5–10× cheaper than output tokens, and design a caching
  layer for repeated system prompts (prefix caching in vLLM cuts input costs
  by 40–60% for chatbot workloads with large repeated system prompts) is
  demonstrating Staff-level economic awareness.

  The evaluation discussion — latency P50/P95 dashboards, TTFT alert at 300ms,
  TPS monitoring per GPU to detect thermal throttling — shows the candidate
  has thought about the production telemetry that separates a research demo
  from a service with an SLA.`,
        codeExample: `
  [36:00–40:00 — FAILURE MODES AND SCALING]

  INTERVIEWER: "What breaks first if traffic doubles overnight?"

  CANDIDATE: "Three things stress simultaneously.

  First: output token throughput. We need 50,000 tok/s instead of 25,000.
  Currently at 18 H100s (throughput-bound). Need 36 for 2× traffic.
  With 30 GPUs at 65% utilisation, we are already at 30/0.65 × 18 capacity.
  30 GPUs at 65% cap = effective 19.5 GPU equivalents used. At 2× traffic,
  we'd be at 130% utilisation — KV cache starts thrashing and p99 TTFT
  explodes.

  Mitigation: the pre-warmed standby nodes (2 GPUs) activate immediately
  and absorb the first burst. Autoscaler triggers on queue depth, not
  on p99 latency — because cold-start is 35 GB ÷ 1.5 GB/s from S3 ≈ 23
  seconds, which is too slow for reactive scaling on latency spikes.

  Second: TTFT p99. At 130% utilisation, the queue fills. M/M/1 model:
  wait time = ρ / (1 - ρ) × service_time. At ρ = 1.3 the queue is
  theoretically unstable — p99 becomes unbounded. In practice, requests
  time out at the gateway (30-second hard timeout) before this is visible
  to users as infinite wait, but they do see 30-second timeouts, which is
  a product failure.

  Third: cost. 2× traffic at GPT-4o rates would be... but wait, we are
  self-hosting, so marginal cost is near zero. The cost impact is the
  capacity expansion cost: 10 more H100s at $1,400/GPU/month = $14,000/month."

  ━━━ MARGIN NOTE ━━━
  ✅ Applied the M/M/1 queuing model by name with the formula. This is the
    expected staff-level framework for degradation analysis.
  ✅ Calculated the cold-start time for the model (23 seconds from S3) and
    used it to justify the pre-warmed standby strategy. Connecting the
    cold-start calculation to the autoscaling design shows system thinking.
  ✅ Noted that we are self-hosting and therefore marginal cost is near zero
    — a sharp observation that distinguishes this architecture from an
    API-based serving system.
  ❌ Did not mention: KV cache OOM as a specific failure mode at 2× load.
    At 130% utilisation, new requests would be queued but existing requests
    would also have their KV caches evicted if the cache fills — this causes
    recomputation and degrades TPOT, not just TTFT. A strong staff answer
    names this specifically.

  [40:00–43:00 — EVALUATION]

  INTERVIEWER: "How do you know the serving platform is healthy?"

  CANDIDATE: "I'd monitor four SLO tiers.

  Tier 1 — Latency SLOs: TTFT p50, p95, p99. TPOT p50, p95, p99.
  PagerDuty alert if TTFT p99 exceeds 1 second or TPOT p99 exceeds 50ms
  for more than 2 consecutive minutes. These are the user-facing metrics.

  Tier 2 — Infrastructure health: GPU utilisation per node, KV cache
  utilisation per node, queue depth, request queue age. Alert if any node
  exceeds 85% KV cache utilisation — that's the leading indicator for
  OOM before it happens.

  Tier 3 — Cost: tokens per second ingested and generated per request.
  Daily cost report per request type (interactive vs batch). Alert if
  daily cost per request increases more than 20% week-over-week — this
  catches prompt inflation or model changes.

  Tier 4 — Quality: output token count per request and token distribution.
  If average output length suddenly increases by 30%, the model may be
  becoming more verbose — either a model regression or a prompt change
  that is increasing cost without user benefit. Sample 1% of completions
  for human review weekly."

  ━━━ MARGIN NOTE ━━━
  ✅ Four-tier structure is well-organized and covers all the right axes.
  ✅ Named KV cache utilisation as a leading indicator for OOM — shows
    operational maturity, not just theoretical knowledge.
  ✅ Output token distribution monitoring is an unusual but very real
    production signal. Token inflation (model getting more verbose)
    directly increases cost and TPOT without improving quality.
  ✅ Weekly human review of a 1% sample — connects the infrastructure
    monitoring to actual quality, not just latency metrics.

  [43:00–45:00 — TRADE-OFFS]

  CANDIDATE: "The three trade-offs that defined this design:

  One: INT4 versus BF16 for the 70B model. INT4 fits on a single H100,
  eliminates tensor parallelism complexity, and halves TPOT compared to
  BF16 on 2× A100. The quality cost is 2–3% on benchmarks, which we said
  was acceptable. If quality benchmarks had rejected INT4, we'd need 2×
  H100s per request (tensor parallelism) and the GPU count doubles.

  Two: self-hosting versus API. At 1M requests/day × $0.007/request
  (GPT-4o pricing) = $7,000/day = $210,000/month. Self-host TCO for 30
  H100s: roughly $30,000/month hardware plus $15,000/month engineering =
  $45,000/month. Self-hosting saves $165,000/month — a clear justification
  at this volume. The crossover is around 40,000 requests/day. We are at
  1M, well above it.

  Three: continuous batching versus static batching. Static is simpler to
  implement and reason about. Continuous batching adds scheduling complexity
  but delivers 3–5× throughput improvement — meaning 3–5× fewer GPUs for
  the same QPS. At $1,400/GPU/month that is roughly $84,000/month in
  hardware savings. The engineering complexity is worth it."

  INTERVIEWER: "Strong walkthrough. Let me ask one more thing: how would
  you support multiple customers who each want a custom fine-tuned adapter
  on top of the base model?"

  ━━━ MARGIN NOTE ━━━
  This is a curveball on multi-LoRA serving. How the candidate handles it
  indicates Staff vs Principal calibration.

  CANDIDATE: "Multi-LoRA serving is a solved problem in modern inference
  frameworks. The pattern: keep one copy of the 70B base model weights
  in VRAM (35 GB for INT4). Each customer has a LoRA adapter — typically
  50–200 MB in rank-16 to rank-64. Load the top-K most frequently used
  adapters into VRAM simultaneously. At 200 MB per adapter, 20 adapters
  = 4 GB — fits comfortably in the remaining 43 GB budget.

  For adapter selection per request: the request header includes the
  customer's adapter_id. vLLM supports LoRA batching natively — requests
  with different adapters can be batched together with different rank-1
  adapter weights applied per sequence in the batch.

  For adapters not currently in VRAM: load from object storage on demand
  (200 MB = 0.13 seconds from local NVMe). Accept slightly higher TTFT for
  the first request after a cold adapter load. LRU cache manages which
  adapters stay in VRAM. If the number of distinct active adapters exceeds
  20, the LRU eviction starts and cold loads become more frequent — at that
  point scale the adapter VRAM budget."

  ━━━ MARGIN NOTE ━━━
  ✅ Named the architecture correctly (base model in VRAM, adapters as
    small supplements) — shows production LoRA knowledge.
  ✅ Calculated adapter memory (200 MB × 20 = 4 GB) and verified it fits.
  ✅ Named vLLM's LoRA batching support by name.
  ✅ Identified the LRU eviction as the scaling pressure point and named
    the signal that triggers a capacity increase.
  This response pushed the candidate to the Staff side of the calibration.

  OVERALL ASSESSMENT:
  Strong signal throughout. Capacity estimation (E1/E2/E4 methods applied
  correctly, both constraints checked, binding constraint identified) is
  exceptional. Deep dives (continuous batching, KV cache, GQA distinction)
  all show production knowledge. Multi-LoRA handling was confident and
  specific.

  Missing: KV cache OOM under load (the eviction/recomputation failure
  mode). Would be the 'strong hire' vs 'hire' discriminator at Staff level.

  LEVEL CALIBRATION:
  As delivered: Staff SWE bar, hire.
  For Principal: would expect: (1) multi-region serving architecture with
    latency-based routing, (2) model update/rollout strategy (blue-green
    with traffic splitting), (3) cost attribution system for multi-tenant
    GPU clusters.`
      }
    ],

    examples: [
      {
        title: "Sizing a 7B model deployment for 10,000 queries/day",
        input: "Your team is deploying Llama-3 7B for an internal code assistant. 10,000 queries/day, average 1,000 input tokens, 200 output tokens, P95 TTFT target 300ms.",
        output: "Single A100 80GB with vLLM continuous batching. KV cache: ~60GB available after weights. Peak concurrent ~60 requests. Actual peak at 5× average is 0.58 req/s, comfortably within capacity. Speculative decoding with a 1B draft model to meet the 300ms TTFT target.",
        explanation: "Step 1: GPU memory budget — 7B × 2 bytes = 14GB weights; 80 − 14 = 66GB available. KV cache per token for 7B: 2 × 32 layers × 32 heads × 128 head_dim × 2 bytes = 0.5MB per token. At 1,200 token context, 1 concurrent request needs 600MB. So 66GB / 0.6GB = ~110 theoretical concurrent requests. Step 2: throughput check — 10K/day ÷ 86,400 = 0.12 QPS avg; peak at 5× = 0.58 QPS. At 200 output tokens each: 0.58 × 200 = 116 tokens/sec output. A100 achieves ~3,000 tokens/sec for 7B at FP16 — massively under-utilised. Step 3: latency — TTFT = weights_GB ÷ HBM_bandwidth × overhead = 14 / 2,000 × 1.3 × 1,000 = ~9ms (compute) + queue wait. At 0.58 QPS, queue is negligible. Add speculative decoding (1B draft, K=4) to push further under 300ms. Step 4: recommendation — 1× A100 80GB, vLLM, FP16, speculative decoding. Add a second for HA."
      },
      {
        title: "Explaining why continuous batching beats static batching 23x",
        input: "An interviewer asks: 'You mentioned vLLM achieves 23× higher throughput than naive static batching. Walk me through why.'",
        output: "Static batching: GPU waits for all requests in a batch to finish before starting the next batch. If one request generates 500 tokens and others generate 50, the GPU idles waiting for the long request. Continuous batching inserts new requests into vacated slots every forward pass, keeping utilisation near 100%.",
        explanation: "Step 1: visualise static batching — batch of 4 requests; request A finishes at token 40, B at 60, C at 120, D at 180. GPU is idle for A from token 40–180 (78% of A's possible compute contribution wasted). Step 2: continuous batching — when A finishes at token 40, the scheduler immediately inserts request E into A's slot. The GPU never waits. Step 3: PagedAttention enables this — KV cache is stored in non-contiguous pages (like OS virtual memory), so new requests can be slotted in without contiguous memory pre-allocation. Step 4: quantify — in the Anyscale benchmark on LLaMA-13B, continuous batching raised throughput from ~350 to ~8,000 tokens/sec (23×) because the benchmark workload had highly variable response lengths typical of chat applications."
      }
    ],

    tips: [
      "Show the arithmetic for every number you state. 'TPOT = model_GB ÷ HBM_BW_GBps × 1.3 × 1000 = 13.6ms' is infinitely stronger than 'TPOT is about 14ms'.",
      "Check both constraints (throughput AND memory) before stating a GPU count. They are different calculations that sometimes give different answers. Throughput almost always binds at high QPS.",
      "The GQA distinction (8 KV heads vs 64 attention heads for 70B Llama-3) is the most common LLM serving estimation error. State it explicitly and use the right number.",
      "Name continuous batching with the Anyscale 23× throughput benchmark — it demonstrates that you know the production evidence, not just the concept.",
      "Cold-start time for model weights (model_GB ÷ storage_BW_GBps) should be calculated when discussing autoscaling. It determines whether reactive scaling works or whether pre-warmed standby is required."
    ],

    tricks: [
      "TPOT FORMULA DELIVERY: 'Model GB divided by HBM bandwidth in GB/s times 1.3 for overhead times 1000 for ms. Write it left to right on the whiteboard with units at each step.'",
      "LITTLE'S LAW DELIVERY: 'QPS times request duration equals concurrent requests. Request duration is TTFT plus TPOT times output tokens. Write both formulas before plugging in numbers.'",
      "TWO-CONSTRAINT PATTERN: 'Check throughput: output_tok/s_needed ÷ output_tok/s_per_GPU = GPU_for_throughput. Check memory: peak_concurrency ÷ slots_per_GPU = GPU_for_memory. Report both, take the max.'",
      "UTILISATION CAP: 'Divide the throughput-bound GPU count by 0.65 to get the sized fleet. This absorbs 3× spikes without the queue growing.'",
      "GQA REMINDER: 'Before KV calc: ask — does this model use GQA? 70B Llama-3: yes, 8 KV heads. Use 8, not 64. State it explicitly.'"
    ],

    memoryAids: [
      "ESTIMATION SEQUENCE: 'QPS, then duration (TTFT + TPOT × N_out), then concurrency (Little's Law), then GPU check (throughput AND memory), then cap (÷0.65), then standby (+2).'",
      "KV FORMULA: '2 × L × H_kv × D × P × S × B. The H_kv term is where GQA lives. Always use num_KEY_VALUE_heads.'",
      "CONTINUOUS BATCHING: 'Static: wait for slowest. Continuous: replace finished immediately. 30-50% vs 70-90% GPU util. 23× throughput improvement (Anyscale 2023).'",
      "COLD START: 'Model GB ÷ storage bandwidth GB/s = seconds. 35 GB INT4 from S3 at 1.5 GB/s = 23 seconds. Too slow for reactive scaling. Use pre-warmed standby.'",
      "MULTI-LORA PATTERN: 'Base model in VRAM (fixed). Adapters as small supplements (200 MB each). LRU cache for top-K active adapters. vLLM handles batching across adapters.'"
    ],

    interviewPatterns: [
      "'Walk me through the GPU sizing' → work it in three steps: QPS and request duration, then two-constraint GPU count (throughput and memory), then utilisation cap and standby. Show arithmetic.",
      "'Why 8 KV heads and not 64?' → GQA explanation: Q is computed fresh each decode step, not cached. KV cache stores only K and V projections, proportional to H_kv, not H_attn.",
      "'What happens under 2× traffic?' → apply M/M/1: queue wait = ρ/(1-ρ) × service_time. At 130% utilisation (ρ = 1.3), queue is unstable. Pre-warmed standby absorbs first burst; cold-start calculation justifies pre-warming.",
      "Follow-up: 'handle a 128K-token request' → recalculate KV (320 KB × 128,500 = 39.7 GB). Options: context-length routing to dedicated nodes, INT8 KV quantisation (halves to 19.8 GB). Apply both.",
      "Follow-up: 'multi-tenant with custom adapters per customer' → multi-LoRA: base model in VRAM, top-K adapters in LRU cache, vLLM LoRA batching for cross-adapter batches."
    ],

    faq: [
      {
        question: "What is the difference between static and continuous batching, and why does continuous batching improve throughput so dramatically?",
        answer: "Static batching fixes the batch size at the start of each generation step: N requests enter the batch together and the batch is not released until all N have generated their final token. Because requests have variable output lengths, the GPU must wait for the longest-running request before starting new ones. If batch=16 and 14 requests finish at 50 tokens but 2 require 800 tokens, the GPU is effectively serving only 2 active requests (at 25% of its capacity) for 750 decode steps while 14 completed requests sit idle in VRAM. Continuous batching eliminates this waste: when any request completes, a new request is immediately inserted into the freed slot. The GPU operates at its configured maximum batch size continuously. The throughput improvement is proportional to the reduction in idle slots: in the extreme case above, static batching wastes 87% of decode steps; continuous wastes near 0%. The Anyscale 2023 benchmark measured 23× throughput improvement over the HuggingFace Transformers static batching baseline for a mixed-length workload. All major production inference frameworks (vLLM, TGI, SGLang, TensorRT-LLM) implement continuous batching.",
        category: "batching",
        sourceLinks: [{ label: "Anyscale Continuous Batching (2023)", url: "https://www.anyscale.com/blog/continuous-batching-llm-inference" }]
      },
      {
        question: "How does KV cache eviction work when memory is full, and what is the performance impact?",
        answer: "When the KV cache is full and a new request arrives, the serving system must either reject the request (queue it) or evict an existing KV cache entry to make room. vLLM uses a priority-based eviction policy: the KV cache pages of the request that has been waiting the longest without generating tokens (i.e., preempted requests) are written to CPU memory or storage. If the preempted request resumes, its KV pages must be reloaded — this recomputation cost (re-running the prefill for the evicted portion) adds significant latency to the affected request. In practice, KV cache eviction only becomes common when GPU utilisation exceeds 85–90% and the system is truly saturated. The operational signal that eviction is occurring: TPOT for a subset of requests increases 2–5× (the recomputation overhead) while the hardware metrics look healthy. vLLM's KV cache utilisation metric is the leading indicator: alert at 85% to provision capacity before eviction begins.",
        category: "kv-cache"
      },
      {
        question: "Why does the TPOT formula use memory bandwidth rather than FLOPs for decode?",
        answer: "During the decode phase, each forward pass generates exactly one output token. The dominant operation is loading all model weight matrices from HBM into the GPU cores and computing a matrix-vector multiplication (the query attends to key-value pairs). Matrix-vector multiplication has very low arithmetic intensity: for a 70B INT4 model, each decode step loads 35 GB of weights and performs approximately 35 × 10^9 multiply-accumulate operations. The arithmetic intensity = 35e9 FLOPs ÷ 35e9 bytes = 1 FLOP/byte. The H100's compute-to-bandwidth ratio is 989 TFLOPs ÷ 3.35 TB/s ≈ 295 FLOP/byte. Since the actual arithmetic intensity (1 FLOP/byte) is far below the crossover point (295 FLOP/byte), the operation is limited by how fast the GPU can read data from HBM, not by how fast it can compute. The GPU reads 35 GB at 3.35 TB/s = 10.4ms per decode step — this is the TPOT floor. No amount of additional compute would change this; only faster memory bandwidth does.",
        category: "hardware"
      },
      {
        question: "What is multi-LoRA serving and how does it work architecturally?",
        answer: "Multi-LoRA serving enables a single base model deployment to serve multiple customers with different fine-tuned adapters simultaneously. LoRA (Low-Rank Adaptation) adds pairs of small matrices (rank r, typically 16–64) to the base model's weight matrices. For inference, the adapter weights are merged with the base weights at the matrix multiplication level: effective_output = base_weight @ input + lora_B @ lora_A @ input. The base weight (35 GB for 70B INT4) stays fixed in VRAM. Each adapter adds approximately r × (d_in + d_out) × num_layers × 2 bytes — for r=16 and a 70B model, roughly 50–200 MB per adapter. In multi-LoRA serving: (1) the base model is loaded once into VRAM; (2) the top-K most-used adapters are also loaded into VRAM simultaneously (K=20 adapters at 200 MB = 4 GB); (3) incoming requests include an adapter_id; (4) the scheduler batches requests with the same adapter_id where possible (more efficient) but can also handle cross-adapter batches by applying different adapter weights to different sequences in the batch — vLLM supports this natively as of v0.3.0. Adapters not in VRAM are loaded on demand from local storage with a cold-start penalty of 0.1–0.5 seconds.",
        category: "multi-tenant",
        sourceLinks: [{ label: "vLLM LoRA Documentation", url: "https://docs.vllm.ai/en/latest/models/lora.html" }]
      },
      {
        question: "How do you perform a zero-downtime model update (e.g., deploying a new version of the 70B model)?",
        answer: "Zero-downtime model updates require a blue-green deployment strategy adapted for GPU serving. The steps: (1) Provision a new set of GPU nodes (green fleet) equal in capacity to the existing fleet (blue fleet). Load the new model weights onto the green fleet — cold-start time is 20–30 seconds from fast NVMe storage. (2) Once the green fleet is warm and serving test traffic, begin a traffic split: route 5% of production traffic to green, monitor TTFT and TPOT for 15 minutes. Compare against baseline metrics. (3) Gradually increase green traffic (5% → 20% → 50% → 100%) over a 2–4 hour window, monitoring quality metrics (output distribution, error rate) and latency metrics at each stage. (4) Once green is at 100% and stable, decommission the blue fleet. The main cost: 2× GPU hardware cost during the transition window. For a 30-GPU fleet at $1,400/GPU/month: $42,000/month hardware × (4 hours ÷ 720 hours) = $233 for the transition. The second option — rolling update within the same fleet — is cheaper but risks serving mismatched model versions during the transition, which can produce inconsistent outputs for multi-turn conversations. Blue-green is preferred when output consistency is important.",
        category: "operations"
      }
    ],

    practiceProblems: [
      `PRACTICE: Time yourself for 45 minutes answering: "Design the inference
  serving infrastructure for a 13B parameter model serving a consumer
  coding assistant with 500K daily active users. Request profile: 1,500
  input tokens (code context), 100 output tokens (code suggestion). TTFT
  target: 75ms (autocomplete feel). TPOT target: 5ms."

  Self-evaluate against these criteria:
  (1) Did you calculate TPOT for 13B INT4 and verify it against the 5ms SLA?
      (13B INT4: 6.5 GB. TPOT = 6.5/3350 × 1.3 × 1000 = 2.5ms ✓)
  (2) Did you calculate TTFT for 1,500 input tokens and verify against 75ms?
      (Prefill: 2 × 13e9 × 1500 / 989e12 × 1000 = 39ms + overhead = ~65ms ✓)
  (3) Did you apply Little's Law correctly?
      (DAU 500K × 20 req/user / 86400 × 4 peak = 463 QPS.
       Duration = 65ms + 2.5ms × 100 = 315ms.
       Concurrency = 463 × 0.315 = 146 requests.)
  (4) Did you check both memory and throughput constraints?
  (5) Did you reach the evaluation and trade-off steps before time expired?

  CHALLENGE VARIANT: The product manager says 75ms TTFT is too slow for
  autocomplete — users want under 30ms. What model and hardware change
  achieves this? (Answer: switch to a 3B INT4 model on L40S-48GB.
  3B INT4: 1.5 GB. TPOT = 1.5/864 × 1.3 × 1000 = 2.3ms.
  Prefill for 1500 tokens on L40S: 2 × 3e9 × 1500 / 362e12 × 1000 = 25ms.
  TTFT with overhead = ~35ms. Still over 30ms target — need H100 or further
  model reduction. 3B on H100: prefill = 2×3e9×1500/989e12×1000 = 9ms + overhead
  = ~25ms. ✓ The constraint is prefill compute, not TPOT, at this output length.)`
    ],

    references: [
      {
        source: "blog",
        attribution: "Anyscale — How Continuous Batching Enables 23x Throughput in LLM Inference (2023) - https://www.anyscale.com/blog/continuous-batching-llm-inference",
        insight: "Static vs continuous batching throughput comparison; GPU utilisation measurement; real workload benchmarks"
      },
      {
        source: "blog",
        attribution: "Kwon et al. (2023) — Efficient Memory Management for Large Language Model Serving with PagedAttention - https://arxiv.org/abs/2309.06180",
        insight: "PagedAttention design; KV cache fragmentation analysis; throughput improvement over static allocation"
      },
      {
        source: "blog",
        attribution: "vLLM Documentation — Supported Models, LoRA Adapters, Production Deployment - https://docs.vllm.ai",
        insight: "Multi-LoRA serving implementation; PagedAttention configuration; continuous batching scheduler details"
      },
      {
        source: "blog",
        attribution: "NVIDIA — Mastering LLM Techniques: Inference Optimization - https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/",
        insight: "KV cache memory analysis; GQA impact on cache size; throughput vs latency trade-off curves"
      }
    ]
  },

  // ─────────────────────────────────────────────────────────────────────────
  // M3: Mock Round — Recommendation System with Embeddings
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: "topic-ai-mocks-recommendation-round",
    moduleId: "mod-ai-mocks",
    title: "Mock Round: Recommendation System with Embeddings",

    intuition: `This mock covers one of the highest-frequency AI design questions at
  FAANG and ML-forward companies: a personalized homepage recommendation system
  for a video streaming platform with 200 million users. The annotated transcript
  is calibrated to the Senior→Staff level transition — the margin notes mark
  exactly where a senior answer becomes a staff answer. Three moments carry the
  most signal: the capacity estimate (most candidates miss the user-tower-online
  vs item-tower-offline asymmetry), the two-tower training deep dive (in-batch
  negatives with sampling correction is the staff-level discriminator), and the
  evaluation phase (identifying popularity bias in offline metrics as a structural
  limitation, not just noise). The candidate earns a Strong Hire → Staff verdict.`,

    complexity: {
      time: "45-minute round. Signal density is highest in minutes 12–33 (two-tower architecture, in-batch negatives, cold start). The evaluation phase (40–45) is the second-highest-signal window and the most frequently skipped by candidates who over-spend on architecture.",
      space: "Full conceptual surface: three-tier system (offline/nearline/online), two-tower model internals (feature sets, in-batch negatives, sampling correction, loss), cold-start for both users and items, MMR diversity enforcement, and evaluation (offline bias, online A/B, embedding drift). The skill is covering all domains at the right depth within 45 minutes."
    },

    lesson: [
      {
        title: "Interview Setup and System Architecture Overview",
        content: `The question: 'Design a recommendation system for a video streaming platform
  with 200 million users and 10 million videos. Personalize the homepage.' This
  is a standard open-ended AI design question — no hinted solution, no partial
  architecture given. Target level: Senior ML Engineer aiming for Staff.

  Every production recommendation system at scale uses a three-tier architecture:
  offline (training and batch embedding), nearline (stream-based feature updates),
  and online (sub-100ms request path). Naming this tripartition and placing every
  component in the right tier is the first architectural signal. The two-tower
  model spans all three tiers — training offline, item embedding computed offline
  and indexed, user embedding computed online per request.`,
        diagram: asciiDiagram(`
  RECOMMENDATION SYSTEM — THREE-TIER ARCHITECTURE:

  ┌──────────────────── OFFLINE (hours/days) ─────────────────────┐
  │  Interaction logs (watch, rate, search click)                  │
  │       │                                                        │
  │       ▼                                                        │
  │  Two-Tower Training (in-batch negatives + sampling correction) │
  │       │                                                        │
  │       ▼                                                        │
  │  Batch-compute 10M item embeddings  (256-dim FP16 = 5.12 GB) │
  │       │                                                        │
  │       ▼                                                        │
  │  Build HNSW index in vector DB (every 24h)                    │
  └────────────────────────────────────────────────────────────────┘
                      │ (deploy index to serving fleet)
                      ▼
  ┌──────────────────── NEARLINE (seconds/minutes) ────────────────┐
  │  User watches video → Kafka event fires                        │
  │       │                                                        │
  │       ▼                                                        │
  │  Stream processor updates feature store (enables 30-min SLA)  │
  └────────────────────────────────────────────────────────────────┘

  ┌──────────────────── ONLINE (milliseconds) ─────────────────────┐
  │  Homepage request                                              │
  │       ├── Feature store: fetch user real-time features (~10ms) │
  │       ▼                                                        │
  │  User tower MLP: 256-dim user embedding (CPU, ~2ms)           │
  │       ▼                                                        │
  │  HNSW ANN search: top-500 candidate videos (ef=64, ~5ms)      │
  │       ▼                                                        │
  │  Ranking model: cross-features, 500→50 (~15ms)                │
  │       ▼                                                        │
  │  MMR diversity + business rules → top-25 returned             │
  └────────────────────────────────────────────────────────────────┘
  Total online latency: ~42ms p50  /  ~100ms p99 target`)
      },
      {
        title: "Phase 1: Requirements and Capacity Estimation [0:00–12:00]",
        content: `This phase is where senior candidates separate from mid-level. Five
  requirements questions carry the most signal in a recommendation interview:
  (1) What signals exist — watch history, ratings, search, implicit watch-time?
  The answer determines what features go into the user and item towers.
  (2) What is the freshness SLA — should a watch tonight update tomorrow's
  homepage or within 30 minutes? Freshness drives the nearline tier design.
  (3) What is the homepage latency SLA? Under 100 ms p99 forces approximate
  nearest-neighbour search — exact search over 10M vectors at ~0.5 µs per
  dot product would take 5 ms per query minimum but with no multi-threading
  room at 1,700 QPS.
  (4) Are there diversity constraints? Asking this unprompted is a senior
  signal — it demonstrates awareness of filter bubble effects and long-term
  engagement vs short-term click-through optimisation.
  (5) How do you handle cold start for new users AND new content? Raising
  both variants explicitly signals that you know they require different
  solutions.

  Capacity estimation: 200M users, 25% DAU = 50M daily homepage loads →
  ~580 QPS average, ~1,700 QPS at 3× peak. Item embedding index: 10M videos
  × 256-dim × 2 bytes FP16 = 5.12 GB — one node. Training data: 200M users
  × ~100 interactions = 20B events — distributed training required. User
  tower online: one MLP forward pass per request (3 layers, 1,024 hidden)
  on CPU at 1,700 QPS — trivially within CPU capacity. The discriminating
  insight is that the user tower runs online per request while the item tower
  runs offline once per training cycle — many candidates name two-tower
  without grasping this asymmetry.`,
        codeExample: `
  [0:00–5:00 — REQUIREMENTS CLARIFICATION]

  INTERVIEWER: "Design a recommendation system for a video streaming
  platform with 200 million users and 10 million videos.
  The goal is to personalize the homepage."

  CANDIDATE: "A few clarifications. What signals do we have — watch
  history, ratings, search queries, or just implicit watch time?"

  INTERVIEWER: "Watch history, watch time, ratings, and search.
  No external data."

  CANDIDATE: "What freshness is required — if I watch something tonight,
  should tomorrow's homepage reflect it, or within the session?"

  INTERVIEWER: "Within 30 minutes ideally, definitely by next session."

  CANDIDATE: "What is the homepage latency SLA and how many items to
  return?"

  INTERVIEWER: "Under 100ms at p99. Return the top 25 items."

  CANDIDATE: "Any diversity constraints? If I love sci-fi, should the
  whole page be sci-fi, or do you want genre diversity?"

  ━━━ MARGIN NOTE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    STRONG SIGNAL: Diversity is a senior-level question. It shows
    awareness of filter bubble problems and long-term engagement vs
    short-term optimization. Junior candidates never ask this.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  INTERVIEWER: "Yes, some diversity is important."

  CANDIDATE: "And cold start — what do we show a brand-new user with
  no history, and what about newly added content?"

  INTERVIEWER: "We have demographic data at sign-up. New content should
  surface within an hour of being added."

  ━━━ MARGIN NOTE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    STRONG SIGNAL: Cold start raised by the candidate, not the
    interviewer. User cold start and item cold start are distinct
    problems with different solutions — naming both explicitly is
    a staff-level framing.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [5:00–12:00 — CAPACITY ESTIMATION]

  CANDIDATE: "200M users, 50M DAU. 50M / 86,400 = 580 QPS average,
  3x peak = 1,700 QPS peak.

  Item embedding index: 10M videos x 256 dimensions x 2 bytes FP16
  = 5.12 GB. Fits on one node. At 1,536-dim: 30 GB, still one node.

  Training data: 200M users x ~100 interactions = 20B interaction
  events. Requires distributed training and careful negative sampling.

  User embedding online: one MLP forward pass per request (3 layers,
  1024 hidden, batch=1 on CPU). At 1,700 QPS this is well within CPU
  serving capacity — this is NOT a GPU inference problem."

  ━━━ MARGIN NOTE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    STRONG SIGNAL: Correctly identifies that the user tower runs
    online per request on CPU while the item tower is pre-computed
    offline. This is the core scalability insight of two-tower and
    many candidates miss it even after naming the architecture.
    "CPU serving is sufficient" requires actually deriving it.
    Minor gap: didn't estimate ANN search latency explicitly —
    adding "HNSW at 10M vectors ef=64 ~5ms p50" would be stronger.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      },
      {
        title: "Phase 2: Architecture and Two-Tower Deep Dive [12:00–25:00]",
        content: `The two-tower architecture explanation is the highest-signal portion of
  the round. The candidate earns exceptional marks for the in-batch negative
  sampling answer — specifically the sampling correction term for popularity
  bias removal, a production detail that 95% of candidates skip entirely.`,
        codeExample: `
  [12:00–25:00 — ARCHITECTURE AND TWO-TOWER DEEP DIVE]

  CANDIDATE: "Three computation tiers: offline, nearline, and online.

  OFFLINE: Train the two-tower model. The item tower produces a 256-dim
  embedding per video. After training, batch-compute all 10M video
  embeddings and build HNSW index. Runs every 24 hours.

  NEARLINE: User watches → Kafka event → stream processor updates user
  feature store within seconds. This enables 30-minute freshness.

  ONLINE: Fetch user features, run user tower MLP for 256-dim embedding,
  ANN search for top-500 candidates, ranking model for top-50, MMR
  diversity + business rules, return top-25."

  INTERVIEWER: "Walk me through the two-tower model architecture in
  more detail. What is in each tower?"

  CANDIDATE: "User tower inputs: user_id (learned embedding),
  watch_history (average-pooled embeddings of last 50 watched items),
  device_type, time_of_day, demographic_bucket. Concatenated through
  3 MLP layers → 256-dim user embedding.

  Item tower inputs: video_id embedding, genre multi-hot, director/cast
  embeddings, year, average rating, popularity signals → own MLP →
  256-dim video embedding.

  Training: for each positive (user, video) pair from watch history, I
  use in-batch negatives — all other videos in the training batch are
  treated as negatives. With batch size 4096 that gives 4095 negatives
  per positive for free.

  I also add a sampling correction term to remove popularity bias —
  popular videos appear more as in-batch negatives, which would teach
  the model to unfairly down-rank them without this correction.

  Loss: softmax cross-entropy. For each user, the correct video should
  have the highest dot-product score among all batch items."

  ━━━ MARGIN NOTE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    EXCEPTIONAL DEPTH: In-batch negatives with sampling correction
    is a production detail that 95% of candidates skip. Watch history
    as pooled video embeddings (not just user ID) is the correct
    representation. Most senior candidates stop at "user features →
    MLP → embedding, dot product" — technically correct but missing
    all training nuance.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`,
        diagram: asciiDiagram(`
  TWO-TOWER MODEL — TRAINING AND INFERENCE:

  USER TOWER (online, per request)    ITEM TOWER (offline, pre-computed)
  ────────────────────────────────    ──────────────────────────────────
  user_id embedding                   video_id embedding
  watch_history: avg-pool of          genre multi-hot (20-dim)
    last-50 video embeddings          director/cast embeddings
  device_type, time_of_day            year, avg_rating
  demographic_bucket                  popularity_score
  │                                   │
  ▼                                   ▼
  MLP: concat → 512 → 256            MLP: concat → 256 → 256
  │                                   │
  ▼                                   ▼
  user_emb (256-dim) ──dot────────► item_emb [x10M, stored in HNSW]
                       product

  TRAINING — in-batch negatives (batch=4096):
    Positive pair:  (user_i, video_i) from interaction log
    Negatives:      all other videos in batch (~4095 per positive)
    Bias correction: subtract log(freq(video_j)) from negative logits
                     to remove popularity bias (Yi et al. 2019)
    Loss:            softmax cross-entropy over dot products

  SERVING:
    item_embs: pre-computed daily, HNSW index = 5.12 GB on 1 node
    user_emb:  computed per request via user-tower MLP (CPU, ~2ms)
    ANN search: HNSW ef=64 → top-500 candidates in ~5ms p50`)
      },
      {
        title: "Phase 3: Cold Start and Diversity Enforcement [25:00–40:00]",
        content: `The cold start section reveals the architectural insight that makes two-tower
  uniquely well-suited to item cold start: the item tower's content-only inputs
  produce a meaningful embedding for any new item immediately at ingest, with no
  engagement data required. The diversity section introduces MMR with the exact
  lambda formula — the production standard, not a vague "penalty term."`,
        codeExample: `
  [25:00–33:00 — COLD START]

  INTERVIEWER: "How do you handle cold start — both new users and new
  videos?"

  CANDIDATE: "These are different problems with different solutions.

  New user cold start: I have demographic data at sign-up — age, location,
  device. I assign the user to a demographic segment and serve segment-level
  recommendations ('popular in your demographic') as fallback. The onboarding
  flow helps: ask users to pick 3-5 genres. Those explicit signals bootstrap
  a pseudo-watch-history I can feed into the user tower. After 5-10 real
  watches, their embedding becomes meaningful and personalized kicks in.

  New item cold start: The item tower uses only content features — genre,
  cast, year. A brand-new video with zero watches still gets a meaningful
  embedding from its metadata the moment it is ingested. This satisfies
  the '1 hour to surface' SLA. What is missing: no popularity signal and
  no learned user-item affinity. To bootstrap: inject new videos into
  1-2% of homepage slots across a diverse user sample. This seeding data
  enters the training pipeline and the item gets a better embedding on
  the next training cycle."

  ━━━ MARGIN NOTE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    STRONG SIGNAL: Correctly separates user vs item cold start.
    Content-based embedding for new items is the key insight —
    item tower never needed engagement features to produce an
    embedding. Explicit seeding shows production maturity.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  [33:00–40:00 — DIVERSITY AND RANKING]

  CANDIDATE: "Diversity via MMR. After ranking gives me 50 candidates,
  I apply Maximal Marginal Relevance at the final selection step:

    score = lambda * relevance_score - (1-lambda) * max_similarity_to_already_selected

  Lambda controls the tradeoff. This prevents 10 consecutive sci-fi
  thrillers even when all are highly relevant. I also apply a hard genre
  cap: at most 3 items of the same genre in the top 10 positions.

  For the ranking stage: retrieval uses approximate dot product —
  fast but limited to features available at index build time. The
  ranking stage can use any cross-features ('user affinity for this
  specific director') because I am scoring only 500 items, not 10M.
  Ranker trained with NDCG loss."

  ━━━ MARGIN NOTE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    EXCEPTIONAL: MMR with the lambda formula is textbook. The
    explanation of WHY ranking can use cross-features (only 500
    candidates vs 10M) is the core insight justifying the two-stage
    architecture. Multi-objective Pareto optimization would have
    been an extra staff-plus signal if time permitted.
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      },
      {
        title: "Phase 4: Evaluation, Monitoring, and Final Scorecard [40:00–45:00]",
        content: `The evaluation phase concentrates the staff-level signal: framing popularity
  bias as a structural flaw in offline evaluation (not just imprecision), using
  retention as a guardrail metric against CTR optimization, and treating embedding
  drift as an automated post-training quality gate.`,
        codeExample: `
  [40:00–45:00 — EVALUATION AND MONITORING]

  INTERVIEWER: "How do you know if the system is working well?"

  CANDIDATE: "Offline eval: hold out the last 10% of each user's
  interactions. Measure Recall@K (are held-out videos in top-K
  retrieved?) and NDCG@K for ranking quality.

  But offline metrics have structural popularity bias — the model
  learns what was recommended before, not what would be optimal. So
  online A/B testing is the source of truth.

  Online primary: click-through rate, play rate (did user start
  watching?), watch-time fraction (did they watch at least 70%?).

  Secondary: diversity score (genre entropy per session), 7-day and
  30-day return rate. The danger of optimizing purely for short-term
  CTR is the filter bubble — increased CTR at the cost of retention.
  I set retention as a guardrail metric in every A/B test.

  Monitoring: embedding drift. After each retrain, I check if item
  embeddings shifted more than 0.2 cosine similarity from previous
  embeddings. If so, the HNSW index is stale and must be rebuilt.
  Automate this as a post-training quality gate before deployment."

  ━━━ MARGIN NOTE ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    STAFF-LEVEL: Naming popularity bias as a structural offline-eval
    limitation shows research depth. Guardrail metrics (retention)
    vs primary metrics (CTR) is exactly the right A/B framing.
    Embedding drift as a post-training quality gate is a production
    detail almost no candidate mentions.

    OVERALL VERDICT: Strong Hire → Staff.
    Complete signal coverage:
    + Offline/nearline/online trifecta (named and justified)
    + Two-tower in-batch negatives with sampling correction
    + User vs item cold start distinct solutions
    + MMR diversity with lambda formula
    + Two-stage retrieval/ranking with cross-feature justification
    + Offline bias limitation, online A/B with retention guardrail
    + Embedding drift monitoring as deployment quality gate
    Minor gaps: explore/exploit (bandit methods), sequential
    modeling (transformer on watch history vs average pooling)
  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`
      }
    ],

    examples: [
      {
        title: "Computing the online latency budget for a 100ms p99 SLA",
        input: "200M users, 50M DAU, 1700 QPS peak, HNSW at 10M items with ef=64, user tower MLP batch=1 on CPU, ranker scoring 500 candidates.",
        output: "User tower: 2ms. HNSW ANN: 5ms. Ranker: 15ms. Feature store fetch: 10ms. Network+overhead: 10ms. Total ~42ms p50, ~100ms p99. Passes SLA with headroom.",
        explanation: "Step 1: User tower MLP — 3 layers, 1024 hidden, batch=1 on CPU. FLOP count ~2M, at 10 GFLOPS/s = 0.2ms compute + memory access + kernel overhead ≈ 2ms. Step 2: HNSW ANN at 10M vectors ef=64 — ~500 effective graph comparisons at ~1µs each = 0.5ms compute + network + index overhead ≈ 5ms p50. Step 3: Ranker for 500 candidates — neural DNN batch inference ≈ 15ms. Step 4: Feature store (Redis-style co-located) ≈ 10ms. Step 5: Sum = 2+5+15+10+10 = 42ms p50. P99 ≈ 2–2.5x median for stable services = ~90–105ms. Borderline: optimize with feature store co-location and connection pre-warming to land under 100ms p99."
      },
      {
        title: "Diagnosing offline NDCG improvement with flat online CTR",
        input: "NDCG@10 improving 3% week-over-week. Online A/B test shows CTR flat. What is happening and how do you fix it?",
        output: "Root cause: popularity bias in offline evaluation. Model learns to rank previously-recommended popular items higher. CTR cannot improve because those items are already exposed everywhere — the counterfactual value of novel items is invisible in historical data.",
        explanation: "Step 1: Check offline test set distribution — if 80% of test interactions involve the top-1% most popular items (common in consumer platforms), NDCG improvement reflects better ranking of already-surfaced items. Step 2: Compute IPS-corrected NDCG: reweight interactions by 1/P(item_shown). If IPS-NDCG is flat while regular NDCG improved, popularity bias is confirmed. Step 3: Run an online exploration arm — force 5% of slots to novel items and measure watch-time fraction. If novel items perform well when actually shown, the model systematically under-ranks them due to bias. Step 4: Apply IPS-weighted training: reweight training positives by 1/popularity to prevent popular items dominating gradients. This is the production technique used at Instagram and Pinterest."
      },
      {
        title: "Handling the multilingual expansion curveball",
        input: "Interviewer adds: 'We need to support users and content in 50 languages. What changes in the architecture?'",
        output: "Three changes: (1) Multilingual text embedding model for item tower text features. (2) Language as an explicit feature in both towers and as a retrieval filter. (3) Language-balanced negative sampling and per-language quality gates.",
        explanation: "Step 1: If the item tower uses title/description text features, replace language-specific embeddings with a multilingual model (mE5-large or BGE-M3) that embeds all languages into a shared semantic space, enabling cross-lingual retrieval. Step 2: Add user_preferred_languages as a user tower feature and content_language as an item tower feature. Apply a language preference soft filter in HNSW search — boost items in preferred languages without hard-excluding others. Step 3: In-batch negative sampling will be dominated by English (high-resource language with most content) if not corrected. Add language-balanced sampling: ensure each training batch includes minimum representation from each major language tier. Step 4: Separate Recall@K and retention metrics per language — minimum quality threshold per language required before global rollout to avoid shipping a high-English, low-Korean quality system."
      }
    ],

    tips: [
      "When you name 'two-tower model', prepare the full training answer: batch size → negatives per positive, sampling correction formula for popularity bias, loss function. Interviewers immediately probe here — having the complete answer ready is the difference between Senior and Staff signal.",
      "Name the offline/nearline/online tripartition in the first architecture minute. It is a Netflix-coined framing that signals production awareness and organizes everything that follows.",
      "User cold start and item cold start have different solutions — name both. Item cold start is actually EASIER in two-tower (content features give new items immediate embeddings without engagement data). Conflating them loses signal.",
      "The diversity question appears in over 80% of recommendation design rounds. Have the MMR formula ready: score = lambda * relevance - (1-lambda) * max_sim_to_already_selected. State the formula, not just the concept.",
      "Name the popularity bias problem in offline evaluation unprompted. 'Offline NDCG has structural popularity bias — it measures quality on previously recommended items, not counterfactual performance.' This is the research-awareness signal that separates staff from senior answers."
    ],

    tricks: [
      "TWO-TOWER SHORTCUT: 'User tower online (~2ms CPU), item tower offline (10M vectors in HNSW, 5.12 GB). User computes a 256-dim vector, ANN search finds the nearest items. That asymmetry — not the model architecture — is why two-tower scales to 200M users.' Deliver in 30 seconds then offer depth.",
      "COLD START TEMPLATE: 'User cold start → demographics + onboarding genre picks → segment recommendations. Item cold start → content features only → item tower embedding at ingest → satisfies 1-hour SLA. Seeding (1-2% homepage slot injection) bootstraps engagement data for the next training cycle.'",
      "MMR FORMULA: 'lambda * relevance - (1-lambda) * max_sim_to_selected. Lambda=0.7 is relevance-dominant with diversity correction. Runs O(N*K) on already-computed 256-dim embeddings — negligible cost.'",
      "RANKING STAGE JUSTIFICATION: 'Two stages exist because of different scales: retrieval scores 10M items using only indexed features, ranking scores 500 items using any cross-features. The feature set expands 1000x at the ranking step — that is the whole point of the two-stage design.'",
      "EVAL GUARD: 'Offline Recall@K + NDCG for development. Online CTR + watch-time fraction as primary, 7-day retention as guardrail. Guardrail prevents CTR optimization at the cost of long-term filter-bubble formation — Goodhart's Law in recommendation systems.'"
    ],

    memoryAids: [
      "THREE-TIER MNEMONIC: 'Offline = TRAIN and EMBED. Nearline = REFRESH features. Online = SERVE within SLA.' Every recommendation system question fits this structure. Name it in the first 3 minutes.",
      "TWO-TOWER ASYMMETRY: 'User tower = who is this person RIGHT NOW? (online, computed per request). Item tower = what is this video ABOUT? (offline, pre-computed once). The scalability argument depends entirely on keeping them separate.'",
      "COLD START DISTINCTION: 'User cold start: no history → demographic segment. Item cold start: no engagement → content features from metadata. Item cold start is EASIER because the item tower never needed engagement to produce an embedding.'",
      "MMR = RELEVANCE MINUS SIMILARITY: 'Maximal Marginal Relevance prevents filter bubbles. The second term subtracts the maximum cosine similarity to already-selected items. Lambda=0.7 is a safe default. Tune based on diversity audit data.'",
      "OFFLINE BIAS CAVEAT: 'Offline NDCG has popularity bias — it measures quality on what was previously recommended, not on what is optimal. Always pair with online A/B and use long-term retention as a guardrail metric. Never optimize for CTR alone.'"
    ],

    interviewPatterns: [
      "Interviewer asks 'why not just use collaborative filtering?' — CF is purely ID-based: it cannot generalize to new items (item cold start fails) and requires re-training to incorporate new users. Two-tower uses content features, enabling cold start for both. CF signals remain useful as one feature inside the item tower.",
      "Interviewer asks 'what happens when you retrain the model?' — item embeddings change, so the HNSW index must be rebuilt. Dual-write pattern: build new index while old serves traffic, validate retrieval quality with shadow traffic, then cut over with a feature flag. Rebuilding 10M embeddings in batches of 512 on a single GPU takes ~20 minutes.",
      "Interviewer asks 'how would you add real-time trending?' — trending belongs in the ranking stage as a global feature boost, NOT in retrieval. Retrieval is personalized per user; trending is a time-decayed popularity signal applied at reranking. Injecting it into retrieval would pollute the personalization signal.",
      "Curveball 'add multilingual support' — item tower uses multilingual embedding model (mE5, BGE-M3), language as explicit feature in both towers and as retrieval filter, language-balanced negative sampling, per-language quality gates before global rollout.",
      "Frequency and companies: Tier 1 (85%+ of ML system design interviews at Netflix, Meta, Pinterest, YouTube, Spotify, TikTok, Amazon). Semi-stable: two-tower retrieval is the production standard through 2025. Transformer-based sequential models (SASRec, BERT4Rec) are the emerging complement for watch-history encoding, but two-tower retrieval remains dominant."
    ],

    faq: [
      {
        question: "What is the core scalability insight of the two-tower model and why does it matter?",
        answer: "The two-tower model separates item representation from the live request path. Because the item tower's inputs are static content features (genre, cast, metadata — not real-time user context), item embeddings can be pre-computed offline for all 10 million items and stored in an ANN index. At serving time, only the user tower runs online — a lightweight 3-layer MLP that produces a 256-dim vector in ~2ms on CPU. ANN search then finds the nearest pre-computed item embeddings in ~5ms. A single cross-attention model that jointly encodes user and item would require 10 million forward passes per request — roughly 1,000 seconds of compute, not 7ms. The two-tower design moves 99.9% of model compute offline, making sub-100ms recommendation at 200M users viable on commodity hardware."
      },
      {
        question: "What is in-batch negative sampling and why is the sampling correction required?",
        answer: "In-batch negative sampling treats every other item in the same training batch as a negative for each positive user-item pair. With batch size 4,096, each positive pair gets 4,095 free negatives — efficient because all item embeddings are already computed for the batch. The sampling correction is needed to remove popularity bias: popular items appear in many batches because users interact with them frequently, so without correction they serve as negatives far more often than rare items. The model learns to penalize popular items more, leading it to down-rank popular content at serving time. The correction subtracts log(freq(item_j) / total_interactions) from the logit of each negative item j, restoring an unbiased gradient and allowing the model to rank items on actual relevance rather than rarity. This technique was formally described by Yi et al. (2019) at Google and is used in production at Google, Pinterest, and others."
      },
      {
        question: "Why is item cold start easier than user cold start in a two-tower system?",
        answer: "The item tower is intentionally designed with content-only inputs: genre, cast, director, year, metadata. None of these require engagement data. A brand-new video with zero watches immediately gets a meaningful embedding from its metadata at ingest time. The 1-hour-to-surface SLA is met by: ingest → item tower forward pass → write to HNSW index. What is missing is quality signal (popularity, engagement rates) that would improve the embedding, but the embedding exists and is useful from day one. User cold start is harder because the user tower's most informative feature — watch history as pooled video embeddings — is empty for a new user. Demographic features and onboarding preferences provide a coarse signal, but the embedding is much noisier until 5–10 genuine interactions accumulate. Practical consequence: item cold start reaches full embedding quality in one training cycle (24 hours); user cold start requires 5–10 real interactions, which may take days."
      },
      {
        question: "Why is offline NDCG a poor proxy for online CTR in production recommendation systems?",
        answer: "Offline NDCG is measured against historical interaction data — items users clicked under the previous recommendation policy. This creates a feedback loop: the test set has more interactions with items that were frequently recommended, not with items that would be optimal. A model that ranks previously-recommended popular items higher will show NDCG improvement with no genuine quality gain — it is learning the old policy, not discovering better recommendations. This is called popularity bias or exposure bias. The offline-online gap is compounded by the counterfactual problem: offline evaluation cannot measure what would have happened if a different item had been shown, because history only records outcomes under the observed recommendation policy. Inverse Propensity Scoring (IPS) corrects for this by reweighting interactions by 1/P(item_shown), but requires logging the policy's action probabilities. Online A/B remains the ground truth because it directly measures user response to new recommendations by actually surfacing them."
      },
      {
        question: "What is Maximal Marginal Relevance and how is the lambda parameter tuned in production?",
        answer: "MMR is a greedy post-ranking diversity algorithm. At each selection step, it picks the candidate with the highest score: lambda * relevance_score - (1-lambda) * max_cosine_similarity_to_already_selected_items. Lambda=1 degenerates to pure relevance ranking. Lambda=0 maximizes diversity regardless of relevance. In production, lambda is typically initialized at 0.7 (relevance-dominant) and tuned based on diversity audit data: sample sessions from A/B experiment arms at different lambda values, compute genre entropy per session, and measure long-term retention alongside CTR. The right lambda is the one that maintains CTR while improving session-level genre entropy and long-term retention. A supplementary hard constraint (genre cap: at most 3 items of the same genre in top 10) handles the most egregious filter-bubble cases that the soft MMR penalty might miss. MMR runs in O(N*K) on already-computed 256-dim embeddings — negligible compute compared to the ranker."
      },
      {
        question: "How should embedding drift monitoring be implemented as a post-training quality gate?",
        answer: "After each training run, sample a representative set of high-value items: the top 1,000 by recent interaction volume. For each item, compute cosine similarity between its new embedding and its embedding from the previous training cycle. If the mean drift exceeds 0.2 (a calibrated threshold: small enough to catch genuine model changes, large enough to ignore initialization noise), the new model has materially changed the embedding space. This means the existing HNSW index will return different results than the new model expects — the index is stale. The quality gate blocks deployment until a new HNSW index is built and validated against the new embeddings. Additional checks: compare Recall@K of the new model+new index against the old model+old index on a held-out validation set. If retrieval recall has degraded more than 2%, reject the deployment. The full pipeline: train → compute drift → if drift > threshold then rebuild index → validate Recall@K → deploy. This automation prevents the silent regression that occurs when a new model is deployed without rebuilding its associated index."
      }
    ],

    practiceProblems: [
      `PROBLEM: Design the offline training pipeline for the two-tower recommendation model. Specifically: (1) How do you construct the training dataset? (2) What batch size and sampling strategy? (3) How do you handle training-serving skew in watch_history features?

  WORKED ANSWER:
  (1) Dataset construction: extract interaction events (watch, rate, search click) from the last 90 days of logs. Schema: (user_id, item_id, timestamp, interaction_type, watch_fraction). Strong positives: watch completions > 30% of video length. Soft positives: all watch events weighted by watch_fraction. Split by time — train on days 1-80, validate on days 81-90, holding out the LAST event per user for per-user Recall@K evaluation. Do NOT random-split: that leaks future interactions into training.
  (2) Batch strategy: batch size 4096 (maximizes in-batch negatives on one A100-80GB). Mixed negatives: 80% in-batch uniform (free), 20% hard negatives (items user was shown but did not watch — highest-gradient signal). Popularity correction: for each negative item_j, subtract log(freq(item_j) / sum_all_freq) from its logit before softmax (Yi et al. 2019).
  (3) Training-serving skew: item tower inputs are static metadata — well-aligned between training and serving. User tower's watch_history in training: constructed from logs truncated at the interaction timestamp (strict no-leakage). In production, watch_history comes from the feature store updated via Kafka (30-min SLA). Skew risk: feature store may be stale or have missing items. Measure: log the watch_history embedding distribution (mean, variance per dimension) at training time vs production sampling, alert on KL divergence > 0.05 per week. Add a fallback: if feature store returns empty history for a user, fall back to demographic features only rather than crashing.`
    ],

    references: [
      {
        source: "blog",
        attribution: "Covington, Adams, Sargin (2016) — Deep Neural Networks for YouTube Recommendations, Google Research - https://research.google/pubs/deep-neural-networks-for-youtube-recommendations/",
        insight: "Foundational two-tower paper: softmax with in-batch negatives, the user/item tower asymmetry, serving vs training environment gap, two-stage candidate generation + ranking"
      },
      {
        source: "blog",
        attribution: "Amatriain and Basilico — System Architectures for Personalization and Recommendation, Netflix Technology Blog - https://netflixtechblog.com/system-architectures-for-personalization-and-recommendation-e081aa94b5d8",
        insight: "The canonical offline/nearline/online tripartition for recommendation systems; production Netflix architecture at scale"
      },
      {
        source: "blog",
        attribution: "Yi et al. (2019) — Sampling-Bias-Corrected Neural Modeling for Large Corpus Item Recommendations, Google Research - https://research.google/pubs/sampling-bias-corrected-neural-modeling-for-large-corpus-item-recommendations/",
        insight: "The sampling correction formula for in-batch negatives: subtract log(p(item)) from negative logits. Theoretical justification and empirical results on YouTube data."
      },
      {
        source: "blog",
        attribution: "Pinterest Engineering — Unified Lightweight Scoring: A Two-Tower Approach (2021) - https://medium.com/pinterest-engineering/pinterest-home-feed-unified-lightweight-scoring-a-two-tower-approach-b3143ac70b55",
        insight: "Production two-tower: in-batch negatives, unified scoring replacing per-source models, serving pipeline latency numbers, training infrastructure details"
      },
      {
        source: "blog",
        attribution: "Carbonell and Goldstein (1998) — The use of MMR, diversity-based reranking for reordering documents - https://dl.acm.org/doi/10.1145/290941.291025",
        insight: "Original MMR paper: the relevance-minus-redundancy formula, lambda parameter interpretation, application to reranking. The formula used in every production diversity enforcement system."
      },
      {
        source: "book",
        attribution: "Alex Xu and Sahn Lam — Machine Learning System Design Interview (2023) - https://bytebytego.com/courses/machine-learning-system-design-interview",
        insight: "Chapter on recommendation systems covering two-stage retrieval-ranking, cold start strategies, and evaluation metrics for design interviews"
      }
    ]
  }
];
