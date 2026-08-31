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
      }
    ],

    tips: [
      "Never spend more than 4 minutes on Step 1 regardless of how many follow-up questions occur. After 4 questions, state your assumptions and move forward.",
      "Steps 6 (failure modes) and 7 (evaluation) are the steps most likely to be skipped under time pressure — they are also the most AI-specific. Reserve time explicitly.",
      "Step 5 (deep dive) is where the signal is. Go deep on the hard thing specific to this problem, not on the easy parts you know well.",
      "Step 8 (cost model) should produce a specific dollar number. 'It depends on traffic' is not a cost model — $54K/month at current scale is.",
      "The framework's clock is a recovery tool as much as a plan. When you feel lost, check which step you are on and whether you are behind. That check alone restores direction."
    ],

    tricks: [
      "STEP 1 SHORTCUT: 'Ask one functional question and two non-functional questions, then commit to assumptions.' Maximum 3-4 questions, then move on.",
      "STEP 2 ANCHOR: 'DAU × requests/user ÷ 86,400 × peak_ratio = QPS. QPS × duration = concurrency. Concurrency ÷ per_GPU_capacity = GPU count.' Three formulas, always in this order.",
      "STEP 5 TARGETING: 'What is the hardest part of this specific system that does not exist in a standard web service?' That is your deep-dive target.",
      "STEP 7 TEMPLATE: '5% live sample → LLM-as-judge → daily score → alert on 10% WoW drop. Plus one business metric (task completion rate).' Deliver this in 60 seconds.",
      "TRADE-OFF FORMAT: 'Option A gives X benefit at Y cost. Option B gives the inverse. I chose A because of [specific requirement].' Three sentences per trade-off."
    ],

    memoryAids: [
      "NINE STEPS: 'Requirements, Scale, Architecture, Data/Model, Deep Dive, Failures, Evaluation, Cost, Tradeoffs.' Mnemonic: RSADDFE CT — or just memorise the clock times.",
      "AI-SPECIFIC ADDITIONS vs CLASSIC DESIGN: 'Step 4 (data and model) and Step 8 (cost model) are the AI additions. Steps 6 (failures) and 7 (evaluation) are AI-enriched.'",
      "TIME RULE: 'Steps 1-3 in 12 minutes. Steps 4-5 in 15 minutes. Steps 6-9 in 14 minutes. Never spend 20+ minutes on requirements alone.'",
      "RECOVERY MANTRA: 'State assumption. Draw box. Name hard thing. Go deep.' Four actions to recover from any tangent.",
      "EVALUATION ALWAYS: 'Every AI design interview ends with evaluation. If time is short, say it in 60 seconds. Never skip it entirely.'"
    ],

    interviewPatterns: [
      "'Walk me through how you'd design this' → apply the 9 steps in order, stating which step you're on as you transition: 'Moving from requirements to capacity estimation...'",
      "Interviewer interrupts with 'tell me more about X' during Step 3 → follow the signal into Step 5, but note where you are: 'Happy to deep dive on X — I'll come back to cover failure modes and evaluation before we finish.'",
      "Interviewer asks 'how would you evaluate this?' at any point → deliver Step 7 immediately regardless of where you are in the sequence: sample, judge, dashboard, alert threshold.",
      "Interviewer asks 'what would break first?' → deliver Step 6: classify failures into quality (hallucination, retrieval miss) and capacity (KV OOM, cost spike) tiers with detection and mitigation for each.",
      "You are at minute 40 and have only reached Step 5 → explicitly compress: 'In the remaining time let me cover failures, evaluation, and the key trade-off quickly.' Then deliver each in 90 seconds."
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
  Step 9 (3 min): Pre-publish vs post-publish (zero visibility vs UX friction); LLM accuracy vs cost (high precision but $216K/month vs ML speed at $5K/month); global policy vs regional variation.`
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
        content: ``,
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
        content: ``,
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
        content: ``,
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
        content: ``,
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
        content: ``,
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
        content: ``,
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
        content: ``,
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
  }
];
