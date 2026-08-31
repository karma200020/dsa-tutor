import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-ai-estimation-tradeoffs - "AI: Estimation & Tradeoffs" (6 topics).
// Coverage: token throughput & latency arithmetic, GPU memory and KV-cache
// sizing formulas, cost-per-query modeling, batching effects on latency vs
// throughput, context-window cost scaling, vector DB sizing. Mirrors the HLD
// "Estimation & Tradeoffs" module in style: back-of-envelope worked math, with
// prices framed as worked variables ("assume $X per million tokens") so the
// method outlives the numbers.
//
// Authoring rules: see data/ai/foundations.ts (every field explicit, 5+ FAQs,
// `complexity` as latency/cost framing, `asciiDiagram` from "./_shared").
export const aiEstimationTopics: Topic[] = [
  {
    id: "topic-ai-estimation-token-throughput",
    moduleId: "mod-ai-estimation-tradeoffs",
    title: "Token Throughput & Latency Arithmetic",

    intuition: `LLM inference has two fundamentally different phases that
  almost every candidate conflates. Prefill processes all input tokens in a
  single parallel forward pass — the GPU works on every token simultaneously,
  saturating compute units, so this phase is compute-bound and fast per
  token. Decode generates one output token per forward pass — each step must
  load all model weights from GPU memory and is strictly sequential, so this
  phase is memory-bandwidth-bound and slow per token. The practical
  consequence: a 1,000-token input and a 1,000-token output have wildly
  different latency profiles. Input length mostly affects the prefill spike
  (TTFT) while output length multiplies across every decode step, dominating
  end-to-end time. Streaming hides E2E latency from the user but cannot
  hide TTFT. Every LLM serving estimate must decompose into TTFT + TPOT ×
  N_output — mixing them into a single "response latency" number destroys
  your ability to diagnose or optimise.`,

    complexity: {
      time: "E2E = TTFT + TPOT × N_output. TTFT driven by prefill FLOPs (compute-bound). TPOT floor = model_bytes / HBM_bandwidth (bandwidth-bound). Output token count is the dominant latency multiplier.",
      space: "Working activations during decode are small relative to KV cache. KV cache grows with every output token and must be held in VRAM for the full decode phase — see E2 for the full formula."
    },

    lesson: [
      {
        title: "The Two Phases: Prefill (Parallel, Compute-Bound) vs Decode (Sequential, Bandwidth-Bound)",
        content: `Every LLM forward pass during inference falls into one of
  two categories. During prefill the full prompt of N_input tokens is
  processed in a single batched matrix multiplication: the GPU operates on
  all tokens simultaneously, achieving high arithmetic intensity and
  saturating tensor cores. The result is that prefill throughput scales with
  FLOP/s and processes thousands of tokens per second. During decode the
  model generates one new token, appends it to the KV cache, and repeats.
  Each decode step is a matrix-vector multiplication — one query vector
  attending over all prior key-value pairs. Matrix-vector ops have very low
  arithmetic intensity: the GPU loads the full weight matrices from HBM but
  performs few multiply-accumulate operations per byte read, so the bottleneck
  shifts entirely to memory bandwidth. These two bottlenecks require
  completely different optimisation strategies: prefill benefits from more
  compute (bigger FLOPs), decode benefits from more memory bandwidth or a
  smaller model.`,
        diagram: asciiDiagram(`
  PREFILL — all N_input tokens processed in one parallel pass
    ┌──────────────────────────────────────────────────────┐
    │  Tokens:   [T1]  [T2]  [T3]  [T4]  ...  [T_N]       │
    │             │     │     │     │            │          │
    │             └─────┴─────┴─────┴────────────┘          │
    │                   Single forward pass                 │
    │                   (matrix × matrix mul)               │
    │                   GPU util: HIGH                      │
    │                   Bottleneck: FLOP/s (compute)        │
    │                   Duration ∝ N_input                  │
    └──────────────────────────────────────────────────────┘
    Output: KV cache built for every input position

  DECODE — one new token per forward pass, strictly sequential
    ┌──────────────────────────────────────────────────────┐
    │  Step 1:  load weights + KV_cache → predict [OUT_1]  │
    │  Step 2:  load weights + KV_cache → predict [OUT_2]  │
    │  Step 3:  load weights + KV_cache → predict [OUT_3]  │
    │  ...                                                  │
    │  Step N:  load weights + KV_cache → predict [OUT_N]  │
    │                                                       │
    │  Each step: (matrix × vector mul)                    │
    │  GPU util: LOW at batch=1 (mem bandwidth wasted)     │
    │  Bottleneck: HBM bandwidth (GB/s)                    │
    │  Duration ∝ N_output × (model_bytes / HBM_BW)        │
    └──────────────────────────────────────────────────────┘`)
      },
      {
        title: "The Three Latency Metrics: TTFT, TPOT, E2E",
        content: `Three distinct metrics fully describe inference latency.
  TTFT (Time To First Token) is the duration from sending the request to
  receiving the very first output byte — this equals the prefill time plus
  any queuing delay. For interactive applications TTFT is the
  "does it feel responsive?" metric; anything under 500 ms feels snappy.
  TPOT (Time Per Output Token) is the average gap between consecutive
  streaming tokens during the decode phase. At batch=1 TPOT is set by
  hardware physics; at larger batches it grows slightly as the KV cache
  expands. TPOT below ~40 ms feels fluid to a reader (humans read at about
  5 tokens/second). E2E (end-to-end) latency is TTFT plus TPOT multiplied
  by the number of output tokens. For streaming applications the user
  perceives TTFT, not E2E — this is why streaming is mandatory for any
  user-facing product. For non-streaming batch jobs (nightly reports, bulk
  classification), E2E is the relevant metric.`,
        diagram: asciiDiagram(`
  REQUEST TIMELINE (streaming enabled):

    t=0ms   ──── request arrives at server ────────────────►

    ░░░░░░░░░░░░░░░░░ PREFILL PHASE ░░░░░░░░░░░░░░░░░░░░░░░
    │  Server processes all input tokens in parallel       │
    │  Builds KV cache for all input positions             │
    │  Duration: proportional to N_input                   │
    ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░

    t=TTFT ─── FIRST TOKEN arrives at client ──────────────
               ↑ This is the "does it feel alive?" moment

    ▓▓▓ TPOT ▓▓▓ TPOT ▓▓▓ TPOT ▓▓▓ TPOT ▓▓▓ ... TPOT ▓▓▓
    │tok1│   │tok2│   │tok3│   │tok4│       │tokN│
    each gap = TPOT milliseconds

    t=E2E ── LAST TOKEN arrives, response complete ────────
    E2E = TTFT + TPOT × N_output

  LATENCY DOMINATED BY OUTPUT LENGTH (7B model, TTFT=70ms, TPOT=15ms):
    N_output =  50 tokens:  E2E =  70 +  750 =   820ms
    N_output = 200 tokens:  E2E =  70 + 3000 = 3,070ms  (3.7× longer)
    N_output = 500 tokens:  E2E =  70 + 7500 = 7,570ms  (9.2× longer)
    ↑ Same TTFT; output length alone drives the 9× latency difference`)
      },
      {
        title: "Key Formulas With Named Variables",
        content: `The formulas below form a complete toolkit for any
  inference latency estimate in an interview. Hardware constants are flagged
  🔴 (fast-moving — state them as named variables and verify before use).
  The calculation method is 🟢 stable. TPOT_min is the hardware floor at
  batch=1; real TPOT is 20–35% higher due to KV cache reads, sampling
  overhead, and framework latency — multiply by 1.3 for conservative
  estimates. Prefill time via the FLOP formula assumes the GPU is fully
  utilised; in practice TTFT adds 10–30 ms of server overhead.`,
        codeExample: `
  // ═══ HARDWARE CONSTANTS (🔴 verify periodically) ══════════
  const GPU = {
    H100_SXM: {
      VRAM_GB:   80,    // HBM3
      BW_GBps:  3350,   // memory bandwidth
      TFLOPS:    989,   // FP8 / ~500 TF BF16 for dense ops
    },
    A100_SXM: {
      VRAM_GB:   80,    // HBM2e
      BW_GBps:  2000,
      TFLOPS:    312,   // FP16
    },
    H200_SXM: {
      VRAM_GB:  141,    // HBM3e  🔴 newer card
      BW_GBps:  4800,
      TFLOPS:    989,
    },
    L40S: {
      VRAM_GB:   48,    // GDDR6  (inference-focused, cheaper)
      BW_GBps:   864,
      TFLOPS:    362,
    },
  };

  // ═══ BYTES PER PARAMETER BY PRECISION ═════════════════════
  const BYTES_PER_PARAM = {
    FP32: 4, BF16: 2, FP16: 2, INT8: 1, INT4: 0.5
  };
  // Rule of thumb: model_GB ≈ params_B × bytes_per_param
  // 7B BF16=14GB, 13B BF16=26GB, 70B BF16=140GB, 70B INT4=35GB

  // ═══ TPOT FLOOR (batch = 1) ════════════════════════════════
  // TPOT_min_ms = (model_bytes / HBM_bandwidth_bytes_per_sec) × 1000
  // model_bytes = num_params × bytes_per_param

  // Example — 7B BF16 on A100:
  //   model_bytes = 7e9 × 2 = 14 GB = 14e9 bytes
  //   TPOT_min = (14e9 / 2000e9) × 1000 = 7.0 ms/token
  //   Realistic TPOT = 7.0 × 1.3 = 9.1 ms/token
  //   Max theoretical throughput = 1000 / 7.0 = 143 tok/sec

  // Example — 7B BF16 on H100:
  //   TPOT_min = (14e9 / 3350e9) × 1000 = 4.2 ms/token
  //   Realistic TPOT = 4.2 × 1.3 = 5.4 ms/token

  // ═══ PREFILL DURATION (TTFT estimate) ═════════════════════
  // prefill_FLOPs = 2 × num_params × N_input_tokens
  // prefill_time_ms = (prefill_FLOPs / GPU_FLOPS) × 1000

  // Example — 13B BF16 on A100 (312 TFLOPs), 2000 input tokens:
  //   prefill_FLOPs = 2 × 13e9 × 2000 = 52e12 FLOPs
  //   prefill_time = (52e12 / 312e12) × 1000 = 167ms
  //   Realistic TTFT = 167 + 25ms overhead ≈ 190ms

  // ═══ END-TO-END LATENCY ════════════════════════════════════
  // E2E_ms = TTFT_ms + TPOT_ms × N_output_tokens

  // Example — 13B on A100, 2000 in / 300 out:
  //   E2E = 190ms + (13 × 1.3)ms × 300 = 190 + 5,070 = 5,260ms ≈ 5.3s
  // With streaming: user perceives 190ms (TTFT), not 5.3s
  `
      },
      {
        title: "Fully Worked Sizing Example: Customer Support Chatbot",
        content: `This section walks a complete sizing exercise from hardware
  choice to SLA verdict, exactly as an interviewer would expect. The pattern
  is: state assumptions → calculate TPOT floor → calculate TTFT → calculate
  E2E → check SLA → check concurrent capacity. Always label which numbers
  are 🔴 fast-moving so you signal awareness without slowing down the
  calculation.`,
        codeExample: `
  // ═══ SCENARIO ══════════════════════════════════════════════
  // Model:     Llama-3-8B, BF16 precision
  // Hardware:  single A100-80GB  (BW = 2,000 GB/s 🔴)
  // Request:   N_input=800 tokens (sys prompt + history + question)
  //            N_output=250 tokens (answer)
  // SLA:       TTFT < 500ms, TPOT < 30ms, serve 50 concurrent users

  // ── STEP 1: Model weight memory ───────────────────────────
  model_bytes = 8e9 params × 2 bytes/param = 16 GB

  // ── STEP 2: TPOT floor at batch=1 ─────────────────────────
  TPOT_min = (16e9 / 2000e9) × 1000 = 8.0 ms/token
  TPOT_realistic = 8.0 × 1.3 = 10.4 ms  →  ✓ < 30ms SLA

  // ── STEP 3: TTFT for 800 input tokens ─────────────────────
  // Llama-3-8B has 8B params; A100 FP16 TFLOPs = 312
  prefill_FLOPs = 2 × 8e9 × 800 = 12.8e12 FLOPs
  prefill_ms    = (12.8e12 / 312e12) × 1000 = 41ms
  TTFT_realistic = 41 + 25ms overhead = 66ms  →  ✓ << 500ms SLA

  // ── STEP 4: End-to-end latency ────────────────────────────
  E2E = 66ms + 10.4ms × 250 = 66 + 2,600 = 2,666ms ≈ 2.7s
  (User perceives 66ms with streaming; 2.7s only if non-streaming)

  // ── STEP 5: Concurrent-request capacity ───────────────────
  // KV cache per request (Llama-3-8B: 32 layers, 8 KV heads, 128 head_dim)
  KV_per_token = 2 × 32 × 8 × 128 × 2 bytes = 131,072 bytes = 128 KB
  KV_per_request = 128 KB × (800 + 250 tokens) = 131 MB ≈ 0.13 GB

  VRAM_available_for_KV = 80 - 16 (weights) - 2 (overhead) = 62 GB
  max_concurrent = floor(62 / 0.13) = 476 requests  →  ✓ >> 50 target

  // ── SUMMARY TABLE ─────────────────────────────────────────
  // Metric            Calculated    SLA         Status
  // ──────────────────────────────────────────────────────────
  // TPOT (batch=1)    10.4ms        < 30ms      ✓ PASS
  // TTFT              66ms          < 500ms     ✓ PASS
  // E2E (250 out tok) 2,666ms       < 5s        ✓ PASS (stream)
  // Max concurrent    476 requests  50 needed   ✓ PASS (9.5× headroom)
  // VRAM used         16 + 6.5 = 22.5 GB        ✓ Fits (80GB card)
  `
      },
      {
        title: "Why Output Length Dominates and What To Do About It",
        content: `The E2E formula makes a powerful point: every additional
  output token adds exactly TPOT milliseconds regardless of how long the
  input was. On a 7B model (TPOT ≈ 9 ms) the difference between a 100-token
  and a 600-token response is 500 × 9 ms = 4.5 seconds. Prompt engineering
  to cap verbosity — "answer in 2–3 sentences", max_tokens=150 — is
  therefore the single cheapest latency optimisation available. It requires
  no hardware changes and no code changes beyond the system prompt. This
  insight frequently surprises interviewers who expect candidates to
  immediately reach for hardware upgrades. A complete answer to "how do you
  cut latency by 50%?" must mention output-length control first, then
  quantisation (reduces model_bytes → lower TPOT), and only then hardware.
  For input length, the story is different: long inputs increase TTFT (and
  cost), but TTFT is generally small relative to E2E, so RAG context
  compression matters more for cost than for latency.`,
        diagram: asciiDiagram(`
  E2E LATENCY vs OUTPUT LENGTH (7B BF16, A100, TTFT=70ms, TPOT=9ms):

    N_output  Decode time    E2E       Output as % of E2E
    ────────  ───────────    ────────  ──────────────────
       30     270ms          340ms     79%
      100     900ms          970ms     93%
      200     1,800ms        1,870ms   96%
      500     4,500ms        4,570ms   98%
    1,000     9,000ms        9,070ms   99%

    → For N_output > 50, output length contributes > 85% of E2E latency.
    → TTFT (70ms) is noise once N_output exceeds 30 tokens.

  OPTIMISATION PRIORITY ORDER (for E2E latency):
    1. Reduce N_output via prompt ("be concise, ≤3 sentences")  🟢 free
    2. Quantise model: 7B BF16→INT8 halves model_bytes → halves TPOT  🟡 small quality cost
    3. Use speculative decoding: 2–3× effective throughput at batch=1  🟡 ops complexity
    4. Upgrade GPU for higher HBM bandwidth (A100→H100)  🔴 expensive

  INPUT LENGTH vs OUTPUT LENGTH — different cost profiles:
    ┌─────────────────────┬────────────────────┬──────────────────┐
    │                     │ INPUT LENGTH        │ OUTPUT LENGTH    │
    ├─────────────────────┼────────────────────┼──────────────────┤
    │ Latency impact      │ TTFT (small)        │ TPOT×N (large)   │
    │ Cost impact (API)   │ input tokens × $/M  │ output tokens×$/M│
    │ Dominates when      │ N_in >> N_out       │ almost always    │
    │ Optimise via        │ RAG compression     │ prompt verbosity │
    └─────────────────────┴────────────────────┴──────────────────┘`)
      },
      {
        title: "Throughput, Batch Size, and Hardware Utilisation",
        content: `Throughput (total tokens generated per second across all
  users) and per-request latency (TPOT for one user) trade off as batch
  size grows. At batch=1 the GPU loads all model weights from HBM but
  generates only one token — GPU utilisation is 15–25%. At batch=B those
  same weight bytes are amortised across B simultaneous token generations,
  so per-GPU throughput scales roughly linearly with batch size up to the
  point where arithmetic (FLOPs) becomes the bottleneck rather than
  bandwidth. This crossover — called the arithmetic intensity crossover
  — occurs around batch 32–128 for most modern models. Beyond that, TPOT
  per request begins to grow because each decode step must now also process
  a larger combined KV cache. Continuous batching (vLLM, TGI) maximises
  utilisation by admitting new requests as others finish rather than waiting
  for all requests in a static batch to complete simultaneously. A well-
  tuned continuous-batching system typically runs at batch 16–64
  automatically, delivering 3–5× higher throughput than static batching.`,
        diagram: asciiDiagram(`
  THROUGHPUT vs BATCH SIZE (7B BF16, A100, approximate 🔴):

    Batch   GPU util   Throughput     TPOT/request
    ─────   ────────   ──────────     ────────────
        1   ~20%       143 tok/sec    7ms   (floor)
        4   ~45%       520 tok/sec    7.7ms
       16   ~70%       1,800 tok/sec  8.9ms
       32   ~80%       3,200 tok/sec  10ms
       64   ~85%       5,500 tok/sec  11.6ms
      128   ~85%       9,000 tok/sec  14ms   ← compute starts to bind
      256   ~80%       13,000 tok/sec 20ms   ← KV cache pressure + OOM risk

    Optimal for latency SLA &lt;20ms: batch ≤ 64
    Optimal for max throughput: batch 128–256 (accept higher per-req TPOT)

  STATIC vs CONTINUOUS BATCHING:
    Static:      fill batch → run all → return all → fill next batch
                 → GPU idle 30–50% of time waiting for slowest request
    Continuous:  new request joins batch when a slot frees
                 → GPU utilisation 70–90% continuously
                 → 23× throughput improvement reported by Anyscale (2023)
                 Reference: https://www.anyscale.com/blog/continuous-batching-llm-inference`)
      }
    ],

    examples: [
      {
        title: "Does a 13B BF16 model on A100 meet a voice assistant's 1.15-second LLM budget?",
        input: "Voice assistant pipeline: ASR=200ms, TTS=150ms, total budget=1,500ms. LLM budget=1,150ms. Model: 13B BF16 on A100. Input: 200 tokens (short context). Output: 40 tokens (spoken reply, 1–2 sentences).",
        output: "LLM time ≈ 290ms. Comfortably within the 1,150ms budget with 860ms headroom.",
        explanation: "model_bytes = 13e9 × 2 = 26 GB. TPOT_min = (26e9 / 2000e9) × 1000 = 13ms. Realistic = 13 × 1.3 = 16.9ms. Prefill FLOPs = 2 × 13e9 × 200 = 5.2e12. prefill_ms = (5.2e12 / 312e12) × 1000 = 16.7ms. TTFT = 16.7 + 25ms overhead = 42ms. E2E = 42 + 16.9 × 40 = 42 + 676 = 718ms. With streaming TTS (TTS starts as soon as first sentence token arrives): effective LLM contribution ≈ TTFT = 42ms. Even non-streaming: 718ms << 1,150ms budget. 13B easily fits. If we upgraded to 70B, TPOT ≈ 50ms, E2E = 42 + 50×40 = 2,042ms — exceeds budget. Model size matters enormously for voice latency."
      },
      {
        title: "Why a 70B model fails a 200ms autocomplete SLA but a 3B model passes",
        input: "Code autocomplete: TTFT target < 75ms, TPOT target < 5ms (to complete a 30-token suggestion within 150ms total). Compare 3B INT4 on L40S vs 70B BF16 on 2×H100.",
        output: "3B INT4 on L40S: TPOT ≈ 0.9ms — passes. 70B BF16 on 2×H100: TPOT ≈ 21ms — fails by 4×.",
        explanation: "3B INT4: model_bytes = 3e9 × 0.5 = 1.5 GB. L40S BW = 864 GB/s. TPOT_min = (1.5e9 / 864e9) × 1000 = 1.74ms. Realistic = 1.74 × 1.3 = 2.3ms. E2E = 60ms TTFT + 2.3 × 30 = 60 + 69 = 129ms ✓ under 150ms. 70B BF16 on 2×H100: model_bytes = 140 GB across 2 GPUs, effective BW = 2 × 3350 = 6700 GB/s. TPOT_min = (140e9 / 6700e9) × 1000 = 20.9ms. Way above 5ms target. E2E = 60 + 20.9 × 30 = 60 + 627 = 687ms ✗ 4.6× over the 150ms target. Conclusion: autocomplete latency constraints force small models. This is the core design decision in GitHub Copilot's architecture."
      },
      {
        title: "Diagnosing a slow endpoint: is TTFT or TPOT the bottleneck?",
        input: "Observed metrics: TTFT p50=95ms, TTFT p99=850ms, TPOT=18ms, avg N_output=300 tokens. Users report the app 'feels slow'. Identify the bottleneck.",
        output: "TTFT p99 is the bottleneck: 850ms vs 95ms p50 indicates severe queuing at peak load, not a decode problem.",
        explanation: "E2E at p50: 95 + 18×300 = 5,495ms. At p99: 850 + 18×300 = 6,250ms. The E2E difference (750ms) is entirely in TTFT. TPOT=18ms is consistent and healthy (not spiking) — decode is fine. The 850ms p99 TTFT = 95ms compute + 755ms queuing. At p99 the system is saturated: requests wait nearly a second before prefill even begins. Fix: add GPU capacity (more replicas) OR implement request prioritisation (short requests jump the queue) OR limit max_tokens to reduce average request duration and free slots faster. This decomposition — TTFT spike vs TPOT spike — is what distinguishes capacity problems (add GPUs) from model-size problems (use smaller model)."
      }
    ],

    tips: [
      "Always decompose latency into TTFT + TPOT × N_output. Stating a single 'response latency' number in an interview signals you don't understand the two-phase model.",
      "TPOT floor formula: model_GB divided by HBM_bandwidth_GBps, times 1000, gives milliseconds per token. This is the single most useful formula in LLM serving.",
      "Decode is memory-bandwidth-bound, not compute-bound. Adding FLOPs (bigger GPU by TFLOPS) does not help TPOT. Only higher HBM bandwidth or a smaller model does.",
      "Streaming converts E2E into a TTFT problem from the user's perspective. Always mention streaming for user-facing applications — it is not optional.",
      "The first latency optimisation to name is always output-length control (prompt engineering), not hardware. This is free, takes minutes to implement, and often cuts E2E by 50–80%."
    ],

    tricks: [
      "TPOT QUICK CALC: 'Model GB divided by HBM GB/s gives seconds. Multiply by 1000 for ms.' 7B BF16 on A100: 14÷2000×1000 = 7ms. Do it in your head.",
      "REALISTIC TPOT ADJUSTMENT: 'Multiply the formula result by 1.3 for a production estimate.' Covers KV reads, sampling, and framework overhead.",
      "E2E SHORTCUT: 'TTFT is usually 10–20% of E2E for typical output lengths. Output dominates.' Use this to sanity-check estimates.",
      "QUANTISATION TPOT IMPACT: 'INT4 halves model_bytes, halves TPOT. INT8 halves bytes vs BF16, halves TPOT. Linear relationship — easy to calculate.'",
      "THROUGHPUT CAPACITY CHECK: 'Single GPU throughput ≈ 1 / (TPOT × N_output) requests/sec at batch=1. Multiply by ~10 for continuous batching gains.'"
    ],

    memoryAids: [
      "PREFILL = PARALLEL = COMPUTE-BOUND. DECODE = SEQUENTIAL = BANDWIDTH-BOUND. Two phases, two bottlenecks, two optimisation strategies.",
      "E2E = TTFT + TPOT × N_out. Three terms. Write all three. Never quote a single latency number without decomposing it.",
      "TPOT FORMULA UNITS: 'Gigabytes over gigabytes-per-second = seconds. Times 1000 = milliseconds.' The units cancel perfectly.",
      "OUTPUT DOMINATES: 'N_output > 50 → output latency is > 85% of E2E. Every extra output token costs TPOT ms regardless of input length.'",
      "STREAMING = TTFT FOR USER. E2E = TTFT FOR BATCH JOBS. Two different metrics depending on whether the human is watching a stream."
    ],

    interviewPatterns: [
      "'Estimate p99 latency for a chatbot: 13B model, 1K input, 300 output tokens' → identify GPU, apply TPOT formula, calculate TTFT separately, sum. State each step.",
      "'Why is this endpoint slow despite a fast GPU?' → check N_output (may be high), check TTFT p99 vs p50 (queuing vs model-size issue), check if streaming is enabled.",
      "'How would you cut latency by 50%?' → output-length control first (free), then quantisation (INT4 halves TPOT), then hardware. Give the quantitative impact of each.",
      "'Is this workload compute-bound or bandwidth-bound?' → decode at batch=1 is always bandwidth-bound. Prefill is compute-bound. State the phase first.",
      "'How many GPUs for 500 QPS at this model size?' → TPOT → requests/sec/GPU via Little's Law → divide QPS by that number, add 30% headroom."
    ],

    faq: [
      {
        question: "What is the difference between tokens per second (throughput) and TPOT (latency)?",
        answer: "Throughput (tokens per second) measures how many tokens the system generates across all concurrent users in one second — a server-level metric. TPOT (Time Per Output Token) measures the average gap between consecutive tokens in a single user's response — a client-level latency metric. They are inverses only at batch=1. At batch=B a server generating 1,000 tokens/sec total while serving 100 concurrent requests is delivering 10 tokens/sec per user, which means TPOT = 100ms per token from that user's perspective. This distinction matters enormously for SLA design: a high-throughput system can still have terrible TPOT for individual users if it is heavily loaded. Always distinguish the two when discussing serving capacity.",
        category: "fundamentals"
      },
      {
        question: "Why does prefill cost less per token than decode despite both running a full transformer forward pass?",
        answer: "Prefill processes N_input tokens in one forward pass using matrix-matrix multiplication — the GPU computes on all tokens simultaneously, achieving high arithmetic intensity (many FLOPs per byte loaded from memory). Matrix-matrix ops saturate tensor cores and run near peak FLOP/s. Decode processes a single token per forward pass using matrix-vector multiplication — one query vector attending over K and V matrices. Matrix-vector ops have very low arithmetic intensity: the GPU loads the entire weight matrix from HBM but performs far fewer multiply-accumulate operations per byte. The ratio is roughly 10,000:1 in favour of prefill per token on arithmetic intensity. This is why TPOT is bounded by memory bandwidth (how fast weights can be read), not compute, while TTFT is bounded by FLOP/s.",
        category: "architecture"
      },
      {
        question: "What is speculative decoding and how does it improve TPOT?",
        answer: "Speculative decoding (Leviathan et al. 2022) runs a small fast 'draft' model to propose K tokens speculatively, then verifies all K tokens in a single forward pass of the large 'target' model. If the draft is correct, K tokens are accepted for the cost of one large-model pass, effectively multiplying throughput by up to K. If the draft is wrong at position j, tokens 1 through j−1 are accepted and generation resumes. In practice, for predictable outputs (code completion, factual recall), acceptance rates of 60–80% allow speedups of 2–3×. Caveats: requires running two models simultaneously (higher VRAM), and speedup is task-dependent — creative or diverse outputs have lower acceptance rates. Most valuable at batch=1 for latency-sensitive applications.",
        category: "optimization",
        sourceLinks: [{ label: "Speculative Decoding paper (Leviathan et al. 2022)", url: "https://arxiv.org/abs/2211.17192" }]
      },
      {
        question: "How does the TPOT calculation change with tensor parallelism across multiple GPUs?",
        answer: "With tensor parallelism across N GPUs, each GPU holds weight_bytes / N of the model. During each decode step, each GPU loads its slice from local HBM and runs an all-reduce to synchronise results. The effective bandwidth calculation becomes: effective_BW = N × HBM_bandwidth_per_GPU, but this is partially offset by the all-reduce communication latency. For an NVLink-connected pair (2× A100): effective_BW ≈ 2 × 2000 = 4000 GB/s minus ~1ms all-reduce per step. TPOT_min = model_bytes / effective_BW = 140 GB / 4000 GB/s = 35ms (70B BF16 on 2×A100). The communication overhead is small (1–2ms) relative to TPOT for large models. For 4-GPU and 8-GPU tensor parallelism the all-reduce cost grows but remains acceptable within a single NVLink node.",
        category: "hardware"
      },
      {
        question: "At what input length does TTFT become the dominant latency concern rather than TPOT?",
        answer: "TTFT dominates when the prefill computation exceeds TPOT × N_output. Setting prefill_time ≥ TPOT × N_output: (2 × params × N_input / FLOPS) ≥ (model_bytes / BW) × N_output. For a 7B model on A100 with N_output=200: prefill dominates when N_input ≥ 200 × (14GB/2000GB/s) / (2×7B/312TF) × 1000 ≈ 200 × 7ms / 45ms ≈ 31 tokens — i.e., almost never for reasonable output lengths. In practice TTFT becomes the concern only for very long inputs (>8,000 tokens) with short outputs (< 50 tokens), which describes document classification or prompt-heavy system designs. For virtually all chat and generation workloads, output length dominates and TTFT is a secondary concern.",
        category: "estimation"
      },
      {
        question: "What does 'memory-bandwidth-bound' mean in practice and how do you confirm a model is in that regime?",
        answer: "A GPU operation is memory-bandwidth-bound when the time to load data from HBM exceeds the time to compute on it. The roofline model formalises this: a computation is bandwidth-bound when its arithmetic intensity (FLOPs / bytes_loaded) is below the hardware's compute-to-bandwidth ratio (FLOP/s / GB/s). For an A100: ratio = 312e12 / 2000e9 = 156 FLOPs/byte. A decode step loading 14 GB of 7B weights and performing 14 GFLOP (1 token × 2 × params operations) has arithmetic intensity = 14e9 / 14e9 = 1 FLOP/byte — far below 156. This confirms batch=1 decode is bandwidth-bound by 156×. You can verify empirically: if doubling GPU FLOPs (via a different GPU) does not proportionally reduce TPOT, but doubling memory bandwidth does, the operation is bandwidth-bound.",
        category: "hardware"
      }
    ],

    practiceProblems: [
      `PROBLEM 1: A product team wants a chatbot that "feels instant." They define this as: first word appears within 300ms, and the full answer arrives within 4 seconds. Average conversation turn: 600 input tokens, 180 output tokens. You have access to A100-80GB or H100-80GB GPUs. What is the minimum GPU type needed, and with which model size?

  SOLUTION:
    Target: TTFT < 300ms, E2E < 4,000ms.
    E2E constraint: 4000 = TTFT + TPOT × 180
    → TPOT_max = (4000 − 300) / 180 = 3700 / 180 = 20.6ms

    Find the largest model that fits TPOT ≤ 20.6ms on each GPU:

    A100 (BW = 2,000 GB/s):
      TPOT = (model_bytes / 2000e9) × 1000 × 1.3 ≤ 20.6
      model_bytes ≤ 20.6 / 1.3 × 2000e9 / 1000 = 31.7 GB
      Max model in BF16: 31.7 / 2 = 15.8B params → 13B BF16 (26 GB) fits ✓
      Check: TPOT = (26e9 / 2000e9) × 1000 × 1.3 = 16.9ms ✓

    H100 (BW = 3,350 GB/s):
      model_bytes ≤ 20.6 / 1.3 × 3350e9 / 1000 = 53.1 GB
      Max model in BF16: 53.1 / 2 = 26.5B params → 34B BF16 (68 GB) fits ✓
      Check: TPOT = (68e9 / 3350e9) × 1000 × 1.3 = 26.4ms ✗ (exceeds 20.6ms)
      Try INT4: 34B INT4 = 17 GB, TPOT = (17e9/3350e9)×1000×1.3 = 6.6ms ✓

    TTFT check for 13B on A100, 600 input tokens:
      prefill = (2×13e9×600 / 312e12) × 1000 = 50ms + 25ms overhead = 75ms ✓ < 300ms

    RECOMMENDATION: 13B BF16 on A100-80GB.
      TPOT=16.9ms, TTFT≈75ms, E2E=75+16.9×180=75+3042=3,117ms ✓
      Cost advantage over H100: A100 cloud ~$1,200/month vs H100 ~$1,500/month (🔴).
      If future context grows to 2K input or 400 output tokens, re-evaluate.`,

      `PROBLEM 2: Your inference logs show: TTFT p50=80ms, TTFT p99=1,850ms, TPOT p50=12ms, TPOT p99=14ms. Average N_output=200 tokens. SLA: TTFT < 500ms, TPOT < 25ms. Users complain the app "hangs" occasionally. Diagnose and prescribe.

  SOLUTION:
    Read the metrics:
      TPOT is healthy and stable: p50=12ms, p99=14ms — only 17% variation.
      This rules out: model too large, GPU too slow, decode-phase bottleneck.
      TTFT is pathological: p99=1,850ms vs p50=80ms — 23× variation.
      This points to: request queuing (not prefill speed).

    Root cause: at peak load, requests wait in the serving queue.
      p99 TTFT = 80ms (prefill) + ~1,770ms (queue wait).
      The server is at capacity: arrival rate ≥ service rate at p99.

    Confirmation test: plot TTFT vs time of day.
      If spikes correlate with peak hours → queuing confirmed.
      If spikes are random → suspect: long-context requests blocking shorter ones
      (head-of-line blocking in static batching).

    Fix 1 (queuing): add serving replicas. If p99 TTFT target = 500ms,
      queue budget = 500 − 80 = 420ms. At 12ms TPOT and N_out=200,
      each request holds the GPU for 80+12×200=2,480ms.
      Current GPU can serve 1/2.48 = 0.4 req/sec. To handle p99 demand
      without queuing, measure requests/sec at p99 hour → add replicas.

    Fix 2 (head-of-line blocking): switch from static to continuous batching
      (vLLM). Short requests join the batch immediately rather than waiting
      for a 2,000-token request to finish. This alone can cut p99 TTFT 3–5×.

    Fix 3 (reduce request duration): cap max_tokens to reduce how long
      each request holds GPU, increasing throughput and reducing queue depth.`,

      `PROBLEM 3: Estimate the GPU count needed to serve 2,000 QPS of a coding assistant. Typical request: 1,500 input tokens, 80 output tokens (short code suggestion). Model: 7B INT4. Hardware: L40S-48GB (HBM BW = 864 GB/s, 🔴). Target: TPOT < 20ms.

  SOLUTION:
    STEP 1: TPOT check for 7B INT4 on L40S.
      model_bytes = 7e9 × 0.5 = 3.5 GB
      TPOT_min = (3.5e9 / 864e9) × 1000 = 4.05ms. Realistic = 4.05 × 1.3 = 5.3ms ✓

    STEP 2: Request duration per GPU (batch=1).
      prefill = (2×7e9×1500 / 362e12) × 1000 = 58ms + 25ms overhead = 83ms (TTFT)
      decode  = 5.3ms × 80 = 424ms
      total request duration ≈ 507ms

    STEP 3: Throughput per GPU with continuous batching.
      Continuous batching at batch~20 (coding assistant, short output):
      Throughput improvement ~15× over batch=1 baseline.
      Single-GPU throughput ≈ 1/0.507 × 15 = 29.6 req/sec

      (Alternative calculation: batch=20 → TPOT stays ~5.3ms per request
      because 3.5GB weights amortised across 20 = still BW-bound.
      Throughput = 20 / 0.507 ≈ 39 req/sec. Use conservative 25 req/sec.)

    STEP 4: GPU count for 2,000 QPS.
      GPUs needed = ceil(2000 / 25) = 80 L40S GPUs

    STEP 5: Sanity check on VRAM for KV cache at batch=20.
      KV per token (7B GQA: 32 layers, 8 kv_heads, 128 head_dim, BF16):
        = 2 × 32 × 8 × 128 × 2 = 131,072 bytes = 128 KB/token
      KV per request (1580 tokens total): 128 KB × 1580 = 197 MB ≈ 0.19 GB
      KV for batch=20: 20 × 0.19 = 3.8 GB
      Weights + KV + overhead: 3.5 + 3.8 + 1 = 8.3 GB << 48 GB ✓
      Could push batch to 100+: (48−3.5−1)/0.19 = 229 concurrent slots.
      Throughput could scale to ~229/0.507 = 451 req/sec per GPU → 5 GPUs total!
      Lesson: always check actual KV capacity before assuming batch limits.`
    ],

    references: [
      {
        source: "blog",
        attribution: "Databricks / MosaicML — LLM Inference Performance Engineering Best Practices (2023) - https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices",
        insight: "Defines TTFT/TPOT framework, prefill vs decode bottleneck analysis, continuous batching quantification"
      },
      {
        source: "blog",
        attribution: "Anyscale — How Continuous Batching Enables 23x Throughput in LLM Inference (2023) - https://www.anyscale.com/blog/continuous-batching-llm-inference",
        insight: "Static vs continuous batching comparison, throughput improvement measurement, TPOT stability"
      },
      {
        source: "blog",
        attribution: "NVIDIA — Mastering LLM Techniques: Inference Optimization (2023) - https://developer.nvidia.com/blog/mastering-llm-techniques-inference-optimization/",
        insight: "Memory bandwidth bottleneck analysis, roofline model application to transformer decode, KV cache impact"
      },
      {
        source: "blog",
        attribution: "Leviathan et al. (2022) — Fast Inference from Transformers via Speculative Decoding - https://arxiv.org/abs/2211.17192",
        insight: "Speculative decoding mechanism, 2–3× TPOT improvement for predictable outputs, acceptance rate analysis"
      },
      {
        source: "book",
        attribution: "Chip Huyen — AI Engineering (2025), Inference Optimisation chapter - https://www.oreilly.com/library/view/ai-engineering/9781098166298/",
        insight: "Production framing of throughput-latency tradeoffs, practical optimisation priority order"
      }
    ]
  },
  {
    id: "topic-ai-estimation-gpu-memory-sizing",
    moduleId: "mod-ai-estimation-tradeoffs",
    title: "GPU Memory Sizing",

    intuition: `GPU VRAM is the single binding constraint in LLM deployment:
  if weights plus the KV cache for all concurrent requests exceed available
  VRAM, the server crashes with an out-of-memory error. Sizing VRAM
  correctly determines how many concurrent users you can serve, whether you
  need one GPU or eight, and whether a cheaper quantised model is viable.
  The calculation has two parts. First: model weight memory, which is fixed
  once you choose the model and precision. Second: KV cache memory, which
  grows with every concurrent request and every token in those requests —
  this is the dynamic, request-driven component. The critical candidate
  error is using num_attention_heads in the KV cache formula instead of
  num_key_value_heads. Modern models use grouped query attention (GQA),
  where these two numbers differ by 4–16×. Using the wrong number
  overestimates KV cache size by the same factor, leading to either
  over-provisioning of hardware or rejecting a configuration that would
  actually work.`,

    complexity: {
      time: "🟢 Stable methodology. GPU memory sizing is a static constraint calculation, not a time complexity. It determines throughput ceiling via max concurrent requests.",
      space: "Total VRAM required = weight_bytes + KV_cache_bytes + activation_bytes + overhead_bytes. KV formula: 2 × L × H_kv × D × P × S × B bytes."
    },

    lesson: [
      {
        title: "Model Weight Memory by Precision",
        content: `Model weight memory is the first number to calculate and
  the only fixed component — it does not change with request volume.
  The formula is num_parameters × bytes_per_parameter. Four precisions
  matter in practice: FP32 (4 bytes, rare for inference), BF16 and FP16
  (both 2 bytes, standard inference quality), INT8 (1 byte, ~1% quality
  loss with modern calibration), and INT4 (0.5 bytes, ~2–3% quality loss
  with GPTQ or AWQ). The rules of thumb from these are simple: a model's
  weight memory in GB ≈ params_in_billions × 2 for BF16, × 1 for INT8,
  × 0.5 for INT4. Memorise those three multipliers. Beyond raw weights,
  add a fixed overhead of 1–2 GB for CUDA context, Python runtime, and
  framework buffers. Multi-GPU tensor parallelism shards weights equally
  across cards: each GPU holds weight_bytes / N, but NVLink all-reduce
  adds 1–3 ms per decode step.`,
        codeExample: `
  // ═══ BYTES PER PARAMETER BY PRECISION ═════════════════════
  const BYTES_PER_PARAM = {
    FP32: 4,    // legacy, avoid for inference
    BF16: 2,    // standard production precision
    FP16: 2,    // same size as BF16, different numeric range
    INT8: 1,    // 2× compression, ~1% quality cost
    INT4: 0.5,  // 4× compression, ~2–3% quality cost (GPTQ/AWQ/GGUF)
  };

  // ═══ WEIGHT MEMORY RULE OF THUMB ══════════════════════════
  // weight_GB = params_billions × multiplier
  // BF16 multiplier = 2    INT8 = 1    INT4 = 0.5

  // ═══ COMMON MODEL WEIGHT SIZES (🔴 verify for new releases) ═
  // Model           BF16     INT8     INT4
  // Llama-3-8B      16 GB     8 GB     4 GB
  // Llama-3-13B     26 GB    13 GB    6.5 GB
  // Llama-3-70B    140 GB    70 GB    35 GB
  // Llama-3.1-405B 810 GB   405 GB  202 GB
  // Mistral-7B      14 GB     7 GB    3.5 GB
  // Mixtral-8x7B    92 GB    46 GB    23 GB  (total params stored in VRAM)

  // ═══ MULTI-GPU TENSOR PARALLELISM ═════════════════════════
  // Each GPU holds: weight_bytes / N_gpus
  // NVLink BW per GPU pair (🔴): A100 NVLink = 600 GB/s bidirectional
  // All-reduce overhead per decode step ≈ 1–3ms (2–8 GPU range)
  // Efficiency: good up to 4–8 GPUs within one NVLink node
  // Beyond: pipeline parallelism preferred over tensor parallelism

  // ═══ DECISION TREE ════════════════════════════════════════
  // 1. model_GB_BF16 = params_B × 2
  // 2. If model_GB < VRAM × 0.80 → single GPU, BF16 ✓
  // 3. Else try INT4: model_GB_INT4 = params_B × 0.5
  //    If INT4 fits and quality acceptable → single GPU INT4 ✓
  // 4. Else: N_gpus = ceil(model_GB_BF16 / (VRAM × 0.80))
  //    Round up to next power of 2 for NVLink efficiency
  `
      },
      {
        title: "The KV Cache Formula — and Why GQA Changes Everything",
        content: `The KV cache stores the key and value projections for every
  attention layer, every sequence position, for every request currently in
  decode. It must live entirely in VRAM for the duration of each request —
  there is no paging to slower memory without significant latency penalty.
  The full formula is: KV_bytes = 2 × L × H_kv × D × P × S × B.
  The 2 accounts for K and V. L is num_layers. H_kv is num_key_value_heads
  — this is the GQA-sensitive term. D is head_dim, calculated as
  hidden_dimension / num_attention_heads. P is bytes per element (typically
  2 for BF16 KV cache). S is sequence length (input plus max output tokens).
  B is batch size.

  The GQA distinction is the most frequently missed detail. Pre-2023 models
  used multi-head attention (MHA) where num_key_value_heads equals
  num_attention_heads — 32 KV heads for a 32-head model. Every model
  released since 2023 (Llama-3, Mistral, Gemma, Qwen2, Phi-3) uses grouped
  query attention (GQA) where multiple query heads share one KV head.
  Llama-3-8B has 32 attention heads but only 8 KV heads. Using 32 instead
  of 8 in the formula overestimates KV cache by 4× and will make you
  conclude a configuration does not fit when it actually does. Always look
  up num_key_value_heads in the model's config.json.`,
        codeExample: `
  // ═══ KV CACHE FORMULA ══════════════════════════════════════
  // KV_bytes = 2  ×  L  ×  H_kv  ×  D  ×  P  ×  S  ×  B
  //             ↑    ↑    ↑        ↑    ↑    ↑    ↑
  //            K+V  layers kv_heads dim  prec seq  batch
  //
  // D = hidden_dim / num_ATTENTION_heads  (not num_kv_heads)
  // P = bytes per element = 2 (BF16 KV), 1 (INT8 KV)
  // S = N_input + N_output_max  (full context length)
  // B = number of concurrent requests

  // ═══ LLAMA-3-8B EXAMPLE — read from config.json ════════════
  const LLAMA3_8B = {
    num_layers:             32,   // L
    num_attention_heads:    32,   // used ONLY for computing D
    num_key_value_heads:     8,   // H_kv  ← GQA: this is the right number
    hidden_size:          4096,
    head_dim: 4096 / 32,       // D = 128
    kv_dtype_bytes:          2,   // P = BF16 KV cache
  };

  // KV bytes PER TOKEN, per request:
  KV_per_token = 2 × 32 × 8 × 128 × 2 = 131,072 bytes = 128 KB / token

  // KV bytes for one request at seq_len = 2048:
  KV_per_request_2K = 128 KB × 2048 = 256 MB = 0.25 GB

  // KV bytes for one request at seq_len = 8192:
  KV_per_request_8K = 128 KB × 8192 = 1.0 GB

  // KV bytes for one request at seq_len = 32768 (32K context):
  KV_per_request_32K = 128 KB × 32768 = 4.0 GB

  // ═══ MHA vs GQA COMPARISON (same 8B-class model) ══════════
  // MHA (num_kv_heads = 32, pre-2023 style):
  KV_per_token_MHA  = 2 × 32 × 32 × 128 × 2 = 524,288 bytes = 512 KB/tok
  // GQA (num_kv_heads = 8, Llama-3-8B):
  KV_per_token_GQA  = 2 × 32 × 8  × 128 × 2 = 131,072 bytes = 128 KB/tok
  // GQA is 4× smaller. At 2K context, batch=16:
  //   MHA: 16 × 0.5×2048×1/1024 GB ≈ 16 GB
  //   GQA: 16 × 0.25 GB           ≈  4 GB
  // Four times the batch capacity on the same hardware.
  `
      },
      {
        title: "Activation Memory and Overhead — What Else Consumes VRAM",
        content: `Beyond weights and KV cache, three smaller categories
  consume VRAM. Activations are the intermediate tensors produced during
  the forward pass — at inference (not training), only one layer's
  activations exist at a time because later layers overwrite earlier ones.
  For a 7B model with hidden_dim=4096 and a batch of 16 at seq_len=2048:
  activation memory ≈ batch × seq_len × hidden_dim × 2 bytes = 16 × 2048
  × 4096 × 2 ≈ 268 MB. This is negligible relative to weights and KV cache
  for any realistic configuration. CUDA context and framework buffers
  consume a fixed ~500 MB at startup. Serving frameworks (vLLM, TGI) pre-
  allocate a KV cache pool at startup — vLLM by default reserves 90% of
  remaining VRAM for KV cache pages after loading weights. Always reserve
  1–2 GB of overhead in budget calculations. The practical formula: VRAM_for_KV
  = total_VRAM − weight_bytes − 2 GB.`,
        diagram: asciiDiagram(`
  VRAM BUDGET BREAKDOWN — A100-80GB, Llama-3-8B BF16, batch=32, seq=2K

    ┌──────────────────────────────────────────────────────────┐
    │ MODEL WEIGHTS          16 GB   ████████░░░░░░░░░  20%   │
    │ (fixed at load time)                                     │
    │                                                          │
    │ KV CACHE (32 requests) 8 GB    ████░░░░░░░░░░░░░  10%   │
    │ (32 × 0.25 GB)                                           │
    │                                                          │
    │ ACTIVATIONS            &lt;1 GB   █░░░░░░░░░░░░░░░░  &lt;1%   │
    │                                                          │
    │ FRAMEWORK + CUDA       2 GB    █░░░░░░░░░░░░░░░░   3%   │
    │ (vLLM pool, CUDA ctx)                                    │
    │                                                          │
    │ AVAILABLE HEADROOM    53 GB    ████████████████░  66%   │
    │ (could serve ~212 concurrent requests at 2K context)    │
    └──────────────────────────────────────────────────────────┘

    At batch=212 (near maximum):
    KV = 212 × 0.25 GB = 53 GB
    Total = 16 + 53 + 2 = 71 GB  &lt; 80 GB ✓  (9 GB safety margin)

    AT LONGER CONTEXT (32K): 
    KV per request = 4.0 GB  →  max_batch = (80−16−2) / 4.0 = 15 requests
    KV cache now dominates weights 3:1 at this context length`)
      },
      {
        title: "Deriving Concurrent-Request Capacity",
        content: `Once you have weight memory and KV cache per request, the
  maximum concurrent capacity follows directly. The formula is:
  max_concurrent = floor((VRAM − weight_bytes − overhead_bytes) /
  KV_bytes_per_request). This is the single number that determines whether
  your hardware meets the concurrency target. If max_concurrent is smaller
  than needed, you have two options without adding GPUs: reduce the KV
  cache per request by reducing max sequence length (serves shorter
  contexts) or apply KV cache quantisation (INT8 KV caches are natively
  supported in vLLM and TGI, halving KV memory at minimal quality cost).
  Across requests, vLLM's PagedAttention further improves utilisation by
  allocating KV pages lazily rather than reserving the maximum context
  upfront — this commonly increases effective throughput 2–4× over naive
  allocation without changing the hardware.`,
        codeExample: `
  // ═══ MAX CONCURRENT CAPACITY FORMULA ══════════════════════
  // available_KV = VRAM_GB − weight_GB − overhead_GB
  // max_concurrent = floor(available_KV / KV_per_request_GB)

  // ═══ WORKED CALCULATION: Llama-3-8B BF16 on A100-80GB ══════
  // Hardware: A100_VRAM = 80 GB   (🔴)
  // Model:    weight_GB = 16 GB
  // Overhead: 2 GB

  available_KV = 80 − 16 − 2 = 62 GB

  // At seq_len = 2,048 (2K context):
  KV_per_req_2K   = 0.25 GB
  max_concurrent  = floor(62 / 0.25) = 248 requests

  // At seq_len = 8,192 (8K context, RAG-style):
  KV_per_req_8K   = 1.0 GB
  max_concurrent  = floor(62 / 1.0) = 62 requests

  // At seq_len = 32,768 (32K context, long document):
  KV_per_req_32K  = 4.0 GB
  max_concurrent  = floor(62 / 4.0) = 15 requests

  // ═══ EFFECT OF KV QUANTISATION ════════════════════════════
  // INT8 KV cache: P = 1 byte instead of 2
  // KV_per_req_8K_INT8 = 0.5 GB  →  max_concurrent = 124 (2× improvement)
  // Quality cost: < 0.5% on most benchmarks

  // ═══ EFFECT OF INT4 WEIGHT QUANTISATION ═══════════════════
  // Llama-3-8B INT4: weight_GB = 4 GB
  available_KV_INT4 = 80 − 4 − 2 = 74 GB
  // At 8K context: max_concurrent = floor(74 / 1.0) = 74 (vs 62 for BF16)
  // INT4 weights free 12 GB for KV → 19% more concurrent requests
  `
      },
      {
        title: "Full Sizing Worked Example: Enterprise RAG Deployment",
        content: `A complete sizing exercise follows five steps: calculate
  weight memory, calculate KV per request at the target context length,
  calculate max concurrent capacity, check against the required concurrency
  (derived from traffic and Little's Law), and decide whether the
  configuration fits or whether you need quantisation or more GPUs. Always
  state your architecture assumptions and flag hardware constants with 🔴.
  This five-step pattern is the complete answer structure an interviewer
  expects.`,
        codeExample: `
  // ═══ SCENARIO ══════════════════════════════════════════════
  // Deploy Llama-3-70B for enterprise RAG (8K context per request)
  // Users: 500 concurrent enterprise users, one request every 60s
  // Output: 400 tokens per response
  // Precision: INT4 (to reduce GPU count)
  // Hardware: H100-80GB SXM  (BW=3,350 GB/s, VRAM=80 GB  🔴)

  // ── STEP 1: Weight memory ─────────────────────────────────
  weight_GB_INT4 = 70 × 0.5 = 35 GB     // fits single H100 ✓

  // ── STEP 2: KV cache per request ──────────────────────────
  // Llama-3-70B architecture (from config.json):
  //   num_layers = 80, num_key_value_heads = 8, hidden_size = 8192
  //   head_dim = 8192 / 64 = 128  (num_attention_heads = 64 for 70B)
  //   KV precision = BF16 → P = 2
  // ⚠️  Use num_key_value_heads = 8, NOT num_attention_heads = 64

  KV_per_token = 2 × 80 × 8 × 128 × 2 = 327,680 bytes = 320 KB / token
  seq_len      = 8000 input + 400 output = 8,400 tokens
  KV_per_req   = 320 KB × 8,400 = 2,621,440 KB ≈ 2.5 GB

  // ── STEP 3: Max concurrent capacity per H100 ──────────────
  available_KV = 80 − 35 (weights) − 2 (overhead) = 43 GB
  max_concurrent = floor(43 / 2.5) = 17 requests per H100

  // ── STEP 4: Required concurrency from traffic ──────────────
  // Little's Law: concurrency = throughput × latency
  // Throughput: 500 users / 60s = 8.33 requests/sec
  // TPOT (70B INT4 on H100): (35e9 / 3350e9) × 1000 × 1.3 = 13.6ms
  // Request duration: TTFT + TPOT × N_out
  //   TTFT ≈ (2×70e9×8000 / 989e12) × 1000 + 25ms = 1,130ms + 25ms ≈ 1.16s
  //   Decode: 13.6ms × 400 = 5,440ms
  //   Total: 1,160 + 5,440 = 6,600ms ≈ 6.6s per request
  // Concurrent = 8.33 req/s × 6.6s = 55 concurrent requests needed

  // ── STEP 5: GPU count ────────────────────────────────────
  GPUs_needed = ceil(55 / 17) = 4 H100s

  // ── VALIDATION ────────────────────────────────────────────
  // 4 H100s provide: 4 × 17 = 68 concurrent slots > 55 needed ✓
  // VRAM per GPU: 35 + 17×2.5 + 2 = 79.5 GB < 80 GB ✓  (very tight!)
  // Tighter safety: use 16 slots per GPU = 16×2.5 = 40 GB KV
  //   Total per GPU: 35 + 40 + 2 = 77 GB. 3 GB safety margin.

  // ── ALTERNATIVE: Same with INT8 KV cache ──────────────────
  KV_per_req_INT8 = 1.25 GB  (P=1 instead of 2)
  max_concurrent_INT8 = floor(43 / 1.25) = 34 per H100
  // With INT8 KV: only 2 H100s needed → 50% hardware cost reduction.
  // Quality cost: < 0.5%. Evaluate whether this is acceptable.
  `
      }
    ],

    examples: [
      {
        title: "Can Llama-3-70B INT4 fit on a single H100-80GB with meaningful concurrent capacity?",
        input: "Llama-3-70B INT4, single H100-80GB, context = 4K tokens per request. What is the max concurrent capacity?",
        output: "Fits. Max concurrent = 17 requests at 4K context. Sufficient for small-team internal tools (< 5 QPS sustained).",
        explanation: "weight_GB = 70 × 0.5 = 35 GB. KV per token (70B: L=80, H_kv=8, D=128, BF16): 2×80×8×128×2 = 327,680 bytes = 320 KB/token. KV per request at 4K seq: 320 KB × 4,096 = 1.25 GB. available_KV = 80 − 35 − 2 = 43 GB. max_concurrent = floor(43 / 1.25) = 34 requests. At 4K context the single H100 serves 34 concurrent requests — enough for a team of 20–30 internal users. Confirm TPOT: 35GB/3350GB/s × 1.3 × 1000 = 13.6ms ✓ fast."
      },
      {
        title: "MHA vs GQA: how much does the KV heads distinction change concurrent capacity?",
        input: "Hypothetical 13B model on A100-80GB, BF16. Variant A: MHA (num_attention_heads = num_kv_heads = 40). Variant B: GQA (num_attention_heads = 40, num_kv_heads = 8). Context = 4K, D = 128.",
        output: "MHA: max_concurrent = 27. GQA: max_concurrent = 134. GQA enables 5× more concurrent users on the same hardware.",
        explanation: "weight_GB (13B BF16) = 26 GB. available_KV = 80 − 26 − 2 = 52 GB. MHA KV per token: 2 × 40 × 40 × 128 × 2 = 819,200 bytes = 800 KB/token. MHA KV per request at 4K: 800 KB × 4,096 = 3.2 GB → max_concurrent = floor(52/3.2) = 16. Wait: let me recalculate. Actually: 2×40×40×128×2 = 2 × 409,600 = 819,200 bytes = 0.78 MB/token. Per request at 4K: 0.78 MB × 4096 = 3,196 MB ≈ 3.1 GB → max = floor(52/3.1) = 16. GQA KV per token: 2 × 40 × 8 × 128 × 2 = 163,840 bytes = 0.156 MB/token. Per request at 4K: 0.156 × 4096 = 640 MB ≈ 0.625 GB → max = floor(52/0.625) = 83. GQA is 5× more capacity-efficient. This is why every production model released since 2023 uses GQA."
      },
      {
        title: "Choosing between 2×A100 BF16 and 1×H100 INT4 for a 34B model",
        input: "34B model. Need to serve 20 concurrent requests at 4K context. Options: (A) 2×A100-80GB BF16, (B) 1×H100-80GB INT4. Which fits? Which is preferred?",
        output: "Both fit. Option B (1×H100 INT4) is strongly preferred: same concurrent capacity, 3× lower TPOT, single-GPU simplicity, lower cost.",
        explanation: "Option A — 34B BF16 on 2×A100: weight_bytes = 68 GB, split 34 GB/GPU. Total VRAM = 160 GB. KV per token (34B typical: L=48, H_kv=8, D=128, BF16): 2×48×8×128×2 = 393,216 bytes = 384 KB/token. KV per request at 4K: 384 KB × 4096 = 1.5 GB. available_KV = 160 − 68 − 2 = 90 GB. max_concurrent = floor(90/1.5) = 60 ✓. TPOT = (68e9 / (2×2000e9)) × 1000 × 1.3 = 22.1ms. Option B — 34B INT4 on 1×H100: weight_bytes = 34×0.5 = 17 GB. available_KV = 80 − 17 − 2 = 61 GB. max_concurrent = floor(61/1.5) = 40 ✓. TPOT = (17e9 / 3350e9) × 1000 × 1.3 = 6.6ms — 3× faster than Option A. Option B wins: single GPU (no NVLink overhead, simpler ops), lower TPOT, lower hardware cost."
      }
    ],

    tips: [
      "Always look up num_key_value_heads from the model's config.json — never assume it equals num_attention_heads. For every post-2023 model with GQA, they differ. Using the wrong value overestimates KV cache by 4–16×.",
      "The five-step sizing pattern is the complete interview answer: (1) weight memory, (2) KV per request, (3) available VRAM for KV, (4) max concurrent, (5) check against traffic requirement.",
      "KV cache per request scales linearly with sequence length — doubling context halves concurrent capacity. Always recalculate when context requirements change.",
      "INT4 quantisation is the first lever before adding GPUs: it reduces weight memory 4× and frees VRAM for more KV cache, increasing concurrent capacity at minimal quality cost.",
      "vLLM's PagedAttention eliminates KV memory pre-allocation waste — mention it as the production standard for KV memory management. Expect 2–4× throughput improvement over naive allocation."
    ],

    tricks: [
      "WEIGHT MEMORY SHORTCUT: 'Params in billions times 2 = GB for BF16. Times 0.5 = GB for INT4.' No calculator needed: 70B INT4 = 35 GB.",
      "KV PER TOKEN SHORTCUT: '2 × layers × KV_heads × head_dim × 2 bytes = bytes per token.' For Llama-3-8B: 2×32×8×128×2 = 131,072 = 128 KB/token. Memorise this for common models.",
      "AVAILABLE KV FORMULA: 'VRAM minus weights minus 2 GB overhead = budget for KV cache.' Simple subtraction, do it first.",
      "MAX CONCURRENT FORMULA: 'Available KV GB divided by KV-per-request GB = max concurrent requests.' Integer floor.",
      "GQA REMINDER DURING SIZING: 'Before writing down H_kv, ask: is this a post-2023 model? If yes, look up num_key_value_heads — it will be 4–8× smaller than num_attention_heads.'"
    ],

    memoryAids: [
      "KV FORMULA MNEMONIC: '2-L-KV-D-P-S-B'. Two-Layers-KVheads-Dim-Precision-Seq-Batch. Recite it in order: the 2 is for K and V.",
      "WEIGHT RULE TRIPLE: 'BF16=×2, INT8=×1, INT4=×0.5. Multiply by params in billions to get GB.' Three numbers to memorise.",
      "GQA WARNING: 'Modern models: H_kv ≪ H_attn. Always use num_KEY_VALUE_heads, not num_attention_heads. Wrong choice = 4–16× error in KV estimate.'",
      "SIZING ORDER: 'Weights → KV per request → available VRAM → max concurrent → compare to traffic.' Five steps, always in this order.",
      "INT4 FIRST PRINCIPLE: 'Try INT4 before adding GPUs. 70B INT4 (35 GB) fits on one H100. 70B BF16 (140 GB) needs two. Same quality within 2–3%.'"
    ],

    interviewPatterns: [
      "'How many concurrent requests can this GPU serve?' → available_KV = VRAM − weights − overhead; max_concurrent = available_KV / KV_per_request. State all terms.",
      "'Does this model fit on a single GPU?' → weight_GB = params × bytes_per_param; compare to VRAM × 0.85. If not, try INT4 before splitting across GPUs.",
      "'What is the KV cache formula?' → 2 × L × H_kv × D × P × S × B. Emphasise that H_kv is num_key_value_heads for GQA models, not num_attention_heads.",
      "Follow-up: 'OOM crash in production, requests failing' → KV cache exhaustion. Fixes: reduce max seq len, apply INT8 KV quantisation, enable PagedAttention, add GPU.",
      "Follow-up: 'users need 128K context windows but you designed for 4K' → recalculate: 32× increase in seq_len = 32× larger KV per request = 32× fewer concurrent requests. Likely requires both additional GPUs and INT8 KV cache."
    ],

    faq: [
      {
        question: "What is grouped query attention (GQA) and exactly how does it affect the KV cache formula?",
        answer: "Standard multi-head attention (MHA) assigns one key head and one value head to each query head — a 32-head model has 32 K projections and 32 V projections per layer, all cached. Grouped query attention (GQA, Ainslie et al. 2023) assigns multiple query heads to share a single KV head group: if num_attention_heads=32 and num_key_value_heads=8, then four query heads share each KV head. The KV cache stores only 8 K and 8 V projections per layer, not 32. In the KV formula KV_bytes = 2 × L × H_kv × D × P × S × B, you must substitute H_kv = 8 (not 32). This produces a 4× smaller cache, enabling 4× more concurrent requests on the same hardware. Every major model released after mid-2023 uses GQA: Llama-3 (8 KV heads), Mistral (8), Gemma (1 — the extreme case, called MQA), Qwen2 (varies by size). The only way to know H_kv is to read num_key_value_heads from config.json.",
        category: "architecture",
        sourceLinks: [{ label: "GQA paper (Ainslie et al. 2023)", url: "https://arxiv.org/abs/2305.13245" }]
      },
      {
        question: "What is PagedAttention and how does it improve KV cache utilisation?",
        answer: "Naive KV cache management reserves a contiguous block of VRAM equal to the maximum possible sequence length for each request at the moment it arrives. A request with max_seq_len=4096 reserves 4096 × KV_per_token bytes upfront, even if the actual response is 50 tokens. For a batch of 50 requests this wastes 60–80% of KV VRAM on unused padding. vLLM's PagedAttention (Kwon et al. 2023) manages KV cache like virtual memory: in fixed-size pages (typically 16 tokens per page). Memory is allocated one page at a time as tokens are generated. Pages from different requests interleave freely in physical memory. This eliminates pre-allocation waste, reduces effective KV memory consumption to near-zero fragmentation, and enables KV cache sharing across requests with identical prefixes (important for multi-tenant deployments with shared system prompts). In benchmarks, PagedAttention improved throughput 2–4× over the HuggingFace TGI baseline.",
        category: "optimization",
        sourceLinks: [{ label: "vLLM/PagedAttention (Kwon et al. 2023)", url: "https://arxiv.org/abs/2309.06180" }]
      },
      {
        question: "Does quantising model weights to INT4 also reduce KV cache memory?",
        answer: "No — weight quantisation and KV cache memory are independent. INT4 quantisation reduces the weight memory footprint from params×2 bytes to params×0.5 bytes, freeing VRAM that can then be allocated to additional KV cache pages. But the KV cache itself is generated during inference from the model's activations and is stored separately, typically in BF16 by default. To also reduce KV cache memory, you need KV cache quantisation, which is a separate feature: INT8 KV cache (P=1 in the formula) halves KV memory at <0.5% quality cost; INT4 KV cache further halves it. vLLM and TGI both support INT8 KV quantisation natively. A fully optimised deployment can apply both: INT4 weights (4× smaller weight footprint) plus INT8 KV (2× smaller KV footprint), together enabling 8× more efficient use of VRAM than the BF16 baseline.",
        category: "quantization"
      },
      {
        question: "How do you calculate the KV cache for a mixture-of-experts (MoE) model like Mixtral 8x7B?",
        answer: "MoE models add a routing mechanism between transformer layers but do not change the attention architecture. The KV cache depends only on the attention configuration, not on the expert feed-forward layers. For Mixtral 8x7B: num_layers=32, num_key_value_heads=8, head_dim=128, BF16. KV_per_token = 2 × 32 × 8 × 128 × 2 = 131,072 bytes = 128 KB/token — identical to Llama-3-8B despite Mixtral having 46B total parameters. The weight memory is 92 GB BF16 (all experts must reside in VRAM), but the KV cache formula uses only the attention config. This is a useful design insight: MoE models have large weight footprints but identical KV cache requirements to their per-token-active dense equivalents.",
        category: "models"
      },
      {
        question: "What are the hardware constants I need to know for VRAM sizing, and how often do they change?",
        answer: "The four cards most relevant for production LLM inference (all 🔴 fast-moving): A100 SXM 80GB: 80 GB HBM2e VRAM. H100 SXM 80GB: 80 GB HBM3 VRAM. H200 SXM: 141 GB HBM3e VRAM (newer, check availability). L40S: 48 GB GDDR6 VRAM (inference-optimised, lower cost per GB, lower bandwidth than HBM). GPU generations release on roughly 18-month cadence; VRAM per card has approximately doubled every two generations. In an interview, state the GPU you are assuming ('I'll use H100-80GB, which has 80 GB VRAM as of 2024') and note it may be outdated. The sizing method (weight_GB + KV_GB < VRAM_GB) is 🟢 stable regardless of the specific numbers.",
        category: "hardware"
      },
      {
        question: "At what sequence length does KV cache exceed model weight memory on a single GPU?",
        answer: "For Llama-3-8B BF16 (weights = 16 GB) at batch=1: KV exceeds weights when KV_per_token × S ≥ 16 GB. KV_per_token = 128 KB. Crossover at S = 16 GB / 128 KB = 131,072 tokens — far beyond any current context window. At batch=1, weights dominate for all supported context lengths. At batch=B the picture changes: KV for the whole batch = B × KV_per_request. At batch=64 and seq=2K: KV = 64 × 0.25 GB = 16 GB = weights. So at batch=64 with 2K context, weights and KV are equal. At batch=64 with 8K context: KV = 64 GB >> weights = 16 GB — KV dominates 4:1. For long-context production deployments serving many users, KV cache is consistently the dominant VRAM consumer and the primary constraint on concurrent capacity.",
        category: "estimation"
      }
    ],

    practiceProblems: [
      `PROBLEM 1: Your team is evaluating two deployment options for a customer support agent. Option A: Llama-3-70B BF16 on 4×A100-80GB. Option B: Llama-3-70B INT4 on 1×H100-80GB. Context per request = 8K tokens. You need 30 concurrent requests minimum. Evaluate both options on: (a) VRAM fit, (b) max concurrent capacity, (c) TPOT. Recommend one.

  SOLUTION:
    Architecture: Llama-3-70B: L=80, H_kv=8, D=128.
    KV per token = 2×80×8×128×2 = 327,680 bytes = 320 KB/token.
    KV per request at 8K: 320 KB × 8,192 = 2.5 GB.

    OPTION A — 70B BF16 on 4×A100-80GB (tensor parallel):
      weight_GB = 140, split 35 GB/GPU. Total VRAM = 320 GB.
      available_KV = 320 − 140 − 4 = 176 GB.
      max_concurrent = floor(176 / 2.5) = 70 requests ✓ (> 30 target)
      TPOT = (140e9 / (4 × 2000e9)) × 1000 × 1.3 = 22.75ms.
      Hardware cost (🔴): 4×A100 cloud ≈ 4×$1,200/month = $4,800/month.
      Complexity: tensor parallel across 4 GPUs, NVLink required.

    OPTION B — 70B INT4 on 1×H100-80GB:
      weight_GB = 70 × 0.5 = 35 GB. Single GPU.
      available_KV = 80 − 35 − 2 = 43 GB.
      max_concurrent = floor(43 / 2.5) = 17 requests ✗ (< 30 target)
      DOES NOT MEET CONCURRENCY REQUIREMENT at 8K context.
      TPOT = (35e9 / 3350e9) × 1000 × 1.3 = 13.6ms (fast, but irrelevant if we can't fit).

    FIX FOR OPTION B: apply INT8 KV cache.
      KV per request INT8 = 1.25 GB.
      max_concurrent = floor(43 / 1.25) = 34 requests ✓ (> 30 target).
      With INT8 KV + INT4 weights: VRAM = 35 + 34×1.25 + 2 = 79.5 GB ✓.
      TPOT = 13.6ms (unchanged — weight precision drives TPOT).

    RECOMMENDATION: Option B with INT8 KV cache.
      Rationale: (1) Single GPU → no NVLink overhead, simpler deployment.
      (2) TPOT 13.6ms vs 22.75ms — 40% faster per token.
      (3) Cost ≈ $1,500/month vs $4,800/month — 68% cheaper (🔴).
      Quality check required: validate INT4 weights + INT8 KV on task-specific benchmarks.`,

      `PROBLEM 2: A new model card is published. Config.json shows: num_hidden_layers=48, num_attention_heads=32, num_key_value_heads=4, hidden_size=5120. A colleague estimates KV cache using num_attention_heads=32 and gets 4.8 GB per request at 8K context. You suspect an error. What is the correct KV per request?

  SOLUTION:
    Colleague's (wrong) calculation:
      head_dim D = hidden_size / num_attention_heads = 5120 / 32 = 160.
      H_kv (wrong) = 32  ← used num_attention_heads instead of num_key_value_heads.
      KV_per_token = 2 × 48 × 32 × 160 × 2 = 983,040 bytes = 960 KB/token.
      KV per request at 8K: 960 KB × 8,192 = 7.5 GB. (Not 4.8 GB — colleague made a different error.)

    Correct calculation:
      head_dim D = 5120 / 32 = 160.  ← still use num_attention_heads here (D is fixed by attention head size)
      H_kv (correct) = 4  ← from num_KEY_VALUE_heads.
      KV_per_token = 2 × 48 × 4 × 160 × 2 = 122,880 bytes = 120 KB/token.
      KV per request at 8K: 120 KB × 8,192 = 0.938 GB ≈ 0.94 GB.

    Error magnitude: 7.5 GB vs 0.94 GB — the colleague's estimate is 8× too large.
    (H_kv ratio: 32/4 = 8 — exactly the overestimate factor.)

    Practical impact: on H100-80GB with 30 GB weight footprint:
      available_KV = 80 − 30 − 2 = 48 GB.
      Colleague's estimate: 48 / 7.5 = 6 concurrent requests.
      Correct estimate:     48 / 0.94 = 51 concurrent requests.
      A 51-vs-6 conclusion difference driven entirely by the GQA oversight.`,

      `PROBLEM 3: You are capacity planning for a production system. Requirements: 200 concurrent users, each making one request every 20 seconds, 4K context (input + output). Model: Llama-3-8B INT4. Hardware: A100-80GB (🔴). How many A100s do you need? What is the maximum context length you could support on this configuration before needing to add a GPU?

  SOLUTION:
    STEP 1: Weight memory (INT4).
      weight_GB = 8 × 0.5 = 4 GB.

    STEP 2: KV per request at 4K context.
      Llama-3-8B: L=32, H_kv=8, D=128, BF16 KV.
      KV_per_token = 2×32×8×128×2 = 131,072 bytes = 128 KB/token.
      KV_per_request_4K = 128 KB × 4,096 = 512 MB = 0.5 GB.

    STEP 3: Required concurrency.
      TPOT (8B INT4 on A100): (4e9 / 2000e9) × 1000 × 1.3 = 2.6ms.
      TTFT (avg 2K input at 4K context): (2×8e9×2000/312e12)×1000 + 25 = 77ms.
      Assume avg output = 200 tokens.
      Request duration = 77 + 2.6×200 = 77 + 520 = 597ms ≈ 0.6s.
      Concurrent = 200 users × (0.6s / 20s) = 6 concurrent requests.
      (200 users / 20s inter-request = 10 req/s throughput. At 0.6s/request,
      10 req/s × 0.6s = 6 concurrent by Little's Law.)

    STEP 4: GPU count.
      Per A100: available_KV = 80 − 4 − 2 = 74 GB.
      max_concurrent_per_A100 = floor(74 / 0.5) = 148 requests.
      Required concurrent = 6. ONE A100 handles this with vast headroom.
      GPUs needed = 1 A100 (add a second for redundancy/HA).

    STEP 5: Maximum context on 1 A100 before adding GPU.
      At 6 concurrent, VRAM used for KV = 6 × KV_per_request.
      Max KV_per_request = 74 GB / 6 = 12.3 GB.
      Max seq_len = 12.3 GB / (128 KB/token) = 12.3e9 / 131,072 = 93,750 tokens ≈ 93K.
      Well beyond any current practical context window — context is not the binding constraint.
      REAL constraint at this scale: throughput, not memory.
      At 10 req/s, single A100 with continuous batching handles this comfortably.`
    ],

    references: [
      {
        source: "blog",
        attribution: "Kwon et al. (2023) — Efficient Memory Management for Large Language Model Serving with PagedAttention (SOSP 2023) - https://arxiv.org/abs/2309.06180",
        insight: "KV cache fragmentation problem, paged allocation solution, 2–4× throughput vs HuggingFace TGI baseline"
      },
      {
        source: "blog",
        attribution: "Ainslie et al. (2023) — GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints - https://arxiv.org/abs/2305.13245",
        insight: "GQA reduces KV heads while preserving quality; formula derivation; KV memory reduction proportional to KV/attention head ratio"
      },
      {
        source: "blog",
        attribution: "Tim Dettmers — Which GPU(s) to Get for Deep Learning (2023) - https://timdettmers.com/2023/01/30/which-gpu-for-deep-learning/",
        insight: "HBM bandwidth by GPU model, VRAM capacity guide, practical selection criteria for inference workloads"
      },
      {
        source: "blog",
        attribution: "NVIDIA H100 / A100 / H200 Product Specification Pages - https://www.nvidia.com/en-us/data-center/h100/ , https://www.nvidia.com/en-us/data-center/a100/",
        insight: "Authoritative VRAM capacity and HBM bandwidth numbers — primary source for 🔴 hardware constants"
      },
      {
        source: "book",
        attribution: "Chip Huyen — AI Engineering (2025), Chapter on Compute and Memory - https://www.oreilly.com/library/view/ai-engineering/9781098166298/",
        insight: "Production sizing patterns, KV cache discussion, concurrency capacity derivation"
      }
    ]
  },
  {
    id: "topic-ai-estimation-cost-per-query",
    moduleId: "mod-ai-estimation-tradeoffs",
    title: "Cost-Per-Query Modeling",

    intuition: `Every LLM request has a calculable dollar cost, and the
  ability to project that cost from first principles separates credible AI
  engineers from those who treat inference as a black box. Three insights
  matter most. First: output tokens cost 3–5× more per token than input
  tokens in both API pricing and actual compute time — never average them.
  Second: a RAG pipeline's dominant cost is not the embedding API call or
  the vector DB query; it is the additional input tokens injected from
  retrieved chunks, which can multiply prompt length 5–10×. Third: the
  self-hosting breakeven is not a comparison of GPU rental price to API
  price-per-token — it requires full total cost of ownership including
  engineering labour, on-call burden, and redundancy, and the crossover
  typically falls between 100K and 1M queries per day depending on model
  size and pricing tier. Candidates who treat cost as an afterthought fail
  AI design interviews at companies where inference budget is a first-class
  engineering concern.`,

    complexity: {
      time: "🟢 Stable methodology. 🔴 Specific pricing numbers change with model updates and competitive pressure — treat as named variables and verify monthly.",
      space: "Monthly cost = daily_queries × (N_input × price_in + N_output × price_out + embedding_cost + retrieval_cost) × (1 − cache_hit_rate × cache_discount). Each term must be calculated separately."
    },

    lesson: [
      {
        title: "API Pricing Structure and the Input/Output Asymmetry",
        content: `Commercial LLM APIs price input and output tokens at
  different rates, and output tokens are always the more expensive tier —
  typically 3–5× higher per token. The reason is rooted in the physics of
  inference described in E1: input tokens are processed in a fast parallel
  prefill that saturates GPU compute, while output tokens require sequential
  decode steps that are memory-bandwidth-bound and slow per token. Providers
  charge for actual compute cost, not a flat per-token rate. The practical
  consequence is that cost models using a single blended per-token price
  are always wrong. A workload with 2,000 input tokens and 100 output tokens
  has a very different cost from one with 100 input and 2,000 output, even
  though both total 2,100 tokens. Always decompose into the two components
  before calculating monthly projections. The crossover — where output cost
  exceeds input cost — depends only on the pricing ratio and the ratio of
  token counts in your workload.`,
        codeExample: `
  // ═══ API PRICING VARIABLES (🔴 verify before use) ══════════
  // Format: USD per million tokens
  const PRICE = {
    // OpenAI (🔴)
    GPT4O:          { in: 2.50,  out: 10.00 },
    GPT4O_MINI:     { in: 0.15,  out: 0.60  },

    // Anthropic (🔴)
    CLAUDE_35_SONNET: { in: 3.00,  out: 15.00 },
    CLAUDE_HAIKU_35:  { in: 0.80,  out: 4.00  },

    // Google (🔴)
    GEMINI_15_FLASH:  { in: 0.075, out: 0.30  },
    GEMINI_15_PRO:    { in: 1.25,  out: 5.00  },
  };
  // These change with model updates. The CALCULATION METHOD is 🟢 stable.

  // ═══ COST PER QUERY ════════════════════════════════════════
  // cost_USD = (N_input / 1e6) × price.in
  //          + (N_output / 1e6) × price.out

  // Example — GPT-4o, 1,000 input / 200 output tokens:
  //   = (1000/1e6)×2.50 + (200/1e6)×10.00
  //   = $0.0025 + $0.0020 = $0.0045
  // Output is 44% of cost on only 17% of the tokens.

  // Example — GPT-4o-mini, same counts:
  //   = (1000/1e6)×0.15 + (200/1e6)×0.60
  //   = $0.00015 + $0.00012 = $0.00027
  // 17× cheaper than GPT-4o at same token counts.

  // ═══ OUTPUT DOMINANCE CROSSOVER ═══════════════════════════
  // Output cost > input cost when:
  //   N_output × price_out > N_input × price_in
  //   N_output > N_input × (price_in / price_out)

  // GPT-4o ratio: 2.50 / 10.00 = 0.25
  // With 1,000 input tokens: output dominates when N_output > 250.
  // For typical RAG query (2,000 input / 300 output):
  //   input cost  = (2000/1e6)×2.50 = $0.005
  //   output cost = (300/1e6)×10.00 = $0.003
  //   input dominates! Long context flips the usual assumption.
  `
      },
      {
        title: "RAG Overhead: The Context Token Trap",
        content: `A naive LLM query costs N_input × price_in plus N_output ×
  price_out. A RAG pipeline adds retrieved chunks to the prompt, and this
  context injection is almost always the dominant cost addition — not the
  embedding API call or the vector DB query fee. Consider: a user question
  is 80 tokens. Five retrieved chunks at 400 tokens each add 2,000 tokens
  to the prompt. The LLM now processes 2,080 input tokens instead of 80 —
  a 26× increase in input tokens. At GPT-4o pricing this adds $0.005 per
  query. The embedding API call for the 80-token question costs 80/1e6 ×
  $0.02 = $0.0000016 — four orders of magnitude smaller. This asymmetry
  means RAG cost optimization is almost entirely about managing context
  length, not about choosing cheaper embedding models. The correct cost
  model for a RAG pipeline has three components: LLM cost (with inflated
  input tokens), embedding cost (negligible), and retrieval infrastructure
  cost (amortised over queries).`,
        codeExample: `
  // ═══ RAG COST MODEL ════════════════════════════════════════

  // Embedding API prices (🔴):
  const EMBED_PRICE = {
    OPENAI_SMALL: 0.020,  // $ per M tokens, text-embedding-3-small
    OPENAI_LARGE: 0.130,  // $ per M tokens, text-embedding-3-large
    COHERE_V3:    0.100,  // $ per M tokens
  };

  // ── Component 1: LLM cost (with retrieved context) ─────────
  // effective_N_input = user_query_tokens + (n_chunks × tokens_per_chunk)
  // llm_cost = (effective_N_input / 1e6) × price.in
  //          + (N_output / 1e6) × price.out

  // ── Component 2: Embedding cost (query embedding) ──────────
  // embed_cost = (query_tokens / 1e6) × embed_price_per_M
  // TYPICALLY NEGLIGIBLE: 80 tokens × $0.020/M = $0.0000016/query

  // ── Component 3: Vector DB query cost ──────────────────────
  // Managed (e.g., Pinecone Serverless 🔴): ~$0.000004 per query
  // Self-hosted (Qdrant, Weaviate): amortised infrastructure cost

  // ═══ WORKED EXAMPLE: GPT-4o RAG pipeline ══════════════════
  const q_tokens     = 80;    // user question
  const n_chunks     = 5;
  const chunk_tokens = 400;
  const n_output     = 200;

  effective_input = q_tokens + (n_chunks × chunk_tokens)
                 // = 80 + 2000 = 2,080 tokens

  llm_cost = (2080/1e6)×2.50 + (200/1e6)×10.00
          // = $0.0052 + $0.0020 = $0.0072

  embed_cost    = (80/1e6)×0.020 = $0.0000016  // negligible
  vecdb_cost    = $0.000004                     // negligible

  total_per_query = $0.0072

  // ── Comparison: same query WITHOUT RAG (just LLM) ──────────
  no_rag_cost = (80/1e6)×2.50 + (200/1e6)×10.00
             // = $0.0002 + $0.0020 = $0.0022

  // RAG overhead: $0.0072 / $0.0022 = 3.3× more expensive
  // The extra cost is entirely from the 2,000 retrieved context tokens.
  // RAG cost optimisation = chunk count × chunk size management, not embed model.
  `
      },
      {
        title: "Cache Hit Rate and Prompt Caching",
        content: `Prompt caching reduces cost by charging a discounted rate
  for input tokens whose KV cache was already computed in a recent prior
  request. OpenAI automatically caches prompts longer than 1,024 tokens and
  bills cache-hit tokens at 50% of the standard input rate. Anthropic
  requires explicit cache_control markup in the request and charges
  approximately 10% of the standard rate for cache hits, making it the more
  powerful discount when used correctly. The formula for effective input
  cost with caching is: effective_cost = hit_rate × (non_cacheable_tokens ×
  full_price + cacheable_tokens × cache_price) + (1 − hit_rate) × all_tokens
  × full_price. For this to be worthwhile, two conditions must hold: the
  cacheable prefix must be large relative to the total prompt, and the hit
  rate must be high. System prompts that are identical across all users are
  perfect cache targets. Variable content — the user's question — must come
  after the cacheable prefix in the prompt, or no caching occurs.`,
        codeExample: `
  // ═══ PROMPT CACHING DISCOUNT RATES (🔴) ═══════════════════
  const CACHE_DISCOUNT = {
    openai:    0.50,  // cache hits billed at 50% of input price
    anthropic: 0.10,  // cache hits billed at 10% of input price
    // OpenAI: automatic for prompts > 1024 tokens
    // Anthropic: requires explicit cache_control in request
  };

  // ═══ EFFECTIVE COST WITH CACHING ══════════════════════════
  // prefix    = cacheable tokens (system prompt, static context)
  // variable  = non-cacheable tokens (user question, session id)
  // hit_rate  = fraction of requests that find prefix in cache

  function costWithCache(prefix, variable, n_out, price, discount, hit_rate) {
    const cache_price = price.in * discount;

    const cost_on_hit  = (variable * price.in + prefix * cache_price + n_out * price.out) / 1e6;
    const cost_on_miss = ((prefix + variable) * price.in + n_out * price.out) / 1e6;

    return hit_rate * cost_on_hit + (1 - hit_rate) * cost_on_miss;
  }

  // ═══ WORKED EXAMPLE ════════════════════════════════════════
  // Scenario: customer support bot
  // System prompt: 2,000 tokens (identical for all queries) ← cacheable
  // User message:    100 tokens (varies per query)          ← not cacheable
  // Output:          150 tokens
  // GPT-4o pricing. Cache hit rate: 85%.

  cost_no_cache = ((2000+100)*2.50 + 150*10.00) / 1e6
               = ($5.25 + $1.50) / 1e6 wait — per query:
               = (2100/1e6)*2.50 + (150/1e6)*10.00
               = $0.00525 + $0.00150 = $0.00675/query

  cost_with_cache = costWithCache(2000, 100, 150, GPT4O, 0.50, 0.85)
    cost_on_hit  = (100*2.50 + 2000*1.25 + 150*10.00)/1e6
                 = ($250 + $2500 + $1500)/1e6 = $0.004250
    cost_on_miss = (2100*2.50 + 150*10.00)/1e6 = $0.006750
    effective    = 0.85*$0.004250 + 0.15*$0.006750
                 = $0.003613 + $0.001013 = $0.004625/query

  monthly_saving (500K queries/day):
    no_cache:  500K * 30 * $0.00675 = $101,250/month
    with_cache: 500K * 30 * $0.004625 = $69,375/month
    saving:    $31,875/month (31.5% reduction)
  `
      },
      {
        title: "API-vs-Self-Host Breakeven Calculation",
        content: `The self-hosting decision is one of the most frequently
  asked cost questions in AI design interviews, and the most frequently
  mis-answered. The error is comparing API price-per-token to GPU rental
  cost alone. Self-hosting total cost of ownership includes GPU rental or
  amortised purchase, engineering labour (model management, incident
  response, updates — realistically 0.25–0.5 FTE per cluster), storage,
  networking, redundancy infrastructure, and monitoring tooling. A realistic
  self-hosting TCO for a single 8-GPU H100 node runs $18,000–$25,000 per
  month when all components are included. The breakeven is where monthly API
  cost equals this TCO. Since API cost is purely variable (scales linearly
  with queries) and self-host cost is mostly fixed (scales with GPUs), API
  wins at low volume and self-hosting wins at high volume. Name the
  crossover query volume, not just "it depends on scale."`,
        codeExample: `
  // ═══ SELF-HOST TCO (monthly, 1× 8-GPU H100 node) (🔴) ════
  const SELF_HOST_TCO = {
    GPU_RENTAL:   11_520,  // 8 × H100 × $1,440/GPU/month (reserved 🔴)
    ENGINEERING:  10_000,  // 0.5 FTE infra/SRE at $240K/yr blended
    STORAGE_NET:     500,  // weights storage + egress
    MONITORING:      500,  // observability tooling
    TOTAL:        22_520   // $/month for one 8-GPU H100 node
  };
  // 🔴 GPU rental prices vary significantly: CoreWeave, Lambda Labs,
  //    AWS p4de, Azure NDv4 — compare before sizing.
  // Add 30% buffer for unexpected ops burden: ~$29,000/month conservative.

  // ═══ THROUGHPUT OF 1× H100 NODE (example: Llama-3-70B INT4) ═
  // TPOT ≈ 13.6ms. Avg request: 500 input + 200 output = 700 tokens.
  // Request duration ≈ 80ms + 13.6ms*200 = 2,800ms.
  // Sustainable throughput with continuous batching ≈ 20 req/sec/node.
  // Monthly requests = 20 × 86,400 × 30 = 51.8M requests.

  // ═══ BREAKEVEN FORMULA ════════════════════════════════════
  // breakeven_req_per_day = SELF_HOST_TCO / (cost_per_req × 30)

  // Example — comparing to GPT-4o, same model quality target:
  // GPT-4o cost per request (500 in / 200 out):
  cost_per_req_gpt4o = (500/1e6)*2.50 + (200/1e6)*10.00
                     = $0.00125 + $0.002 = $0.00325

  breakeven_per_day = 22_520 / (0.00325 * 30)
                    = 22_520 / 97.5
                    = 231,000 requests/day ≈ 230K req/day

  // If open-source model quality is acceptable:
  // Self-host saves: API_monthly - TCO_monthly at any volume > 230K/day.
  // At 230K req/day:
  //   API cost   = 230K × 30 × $0.00325 = $22,425/month ≈ TCO
  // At 1M req/day:
  //   API cost   = 1M × 30 × $0.00325  = $97,500/month
  //   Self-host  = $22,520/month → saves $74,980/month

  // ═══ CAVEATS ══════════════════════════════════════════════
  // 1. Quality must be validated: open-source ≠ GPT-4o quality.
  // 2. API has elastic scaling; self-host requires pre-provisioning.
  // 3. API prices fall over time; TCO is more stable.
  // 4. Burst workloads: self-host wastes money at off-peak hours.
  `
      },
      {
        title: "Monthly Cost Projection and Model Routing",
        content: `A complete cost model requires projecting from per-query
  cost to monthly spend and identifying levers to reduce that spend without
  degrading quality. The three most effective levers, in order of impact:
  first, output-length control via prompt — capping verbosity reduces output
  tokens, which are the most expensive component; second, model routing —
  classify queries by complexity and route simple ones to a cheaper model
  tier (GPT-4o-mini, Claude Haiku); third, prompt caching for static
  prefixes. A common interview follow-up is "costs doubled after adding
  RAG — what do you do?" The answer is to calculate the extra input tokens
  from retrieved chunks explicitly, then reduce chunk count, chunk size, or
  apply reranking to retrieve fewer but higher-quality chunks. Candidates who
  answer "use a cheaper model" before analysing where the tokens are coming
  from miss the RAG-specific root cause.`,
        diagram: asciiDiagram(`
  MONTHLY COST SCALING — RAG chatbot, GPT-4o, 2080 input/200 output tokens (🔴):

    Daily queries   Monthly cost     Self-host viable?
    ─────────────   ────────────     ─────────────────
         10,000       $4,320         No  (API &lt; $22K TCO)
         50,000      $21,600         Borderline
        100,000      $43,200         Yes (~$20K/month savings)
        500,000     $216,000         Strong yes
      1,000,000     $432,000         Very strong yes

  COST-REDUCTION LEVER IMPACT (same 100K queries/day baseline = $43,200/mo):

    Lever                          Method              Monthly saving
    ─────────────────────────────────────────────────────────────────
    1. Output cap (500→150 tokens) Prompt engineering  ~$18,000  (42%)
    2. Route 60% to GPT-4o-mini    Query classifier    ~$23,000  (53%)
    3. Prompt caching (85% hit)    System prompt cache  ~$9,000  (21%)
    4. Reduce chunks 5→2           RAG tuning           ~$7,500  (17%)

    Best single lever: model routing (route simple queries to mini/haiku).
    Combined levers 2+3: ~$32,000/month savings = 74% reduction.
    Order of operations: implement routing first (highest impact, no quality risk
    on complex queries), then caching, then chunk reduction (validate quality).`)
      }
    ],

    examples: [
      {
        title: "Monthly cost for a B2B document Q&A product: 50K queries/day, GPT-4o vs GPT-4o-mini",
        input: "50,000 queries/day. Each query: 2,500 input tokens (system prompt + 5 retrieved chunks + question), 300 output tokens. Compare GPT-4o and GPT-4o-mini. No caching.",
        output: "GPT-4o: $13,875/month. GPT-4o-mini: $832/month. Mini is 16.7× cheaper. The quality question is whether mini meets the product bar.",
        explanation: "GPT-4o per query: (2500/1e6)×2.50 + (300/1e6)×10.00 = $0.00625 + $0.003 = $0.00925. Monthly: 50K × 30 × $0.00925 = $13,875. GPT-4o-mini per query: (2500/1e6)×0.15 + (300/1e6)×0.60 = $0.000375 + $0.00018 = $0.000555. Monthly: 50K × 30 × $0.000555 = $832. The $13,043/month difference at this modest volume funds roughly half an engineer's salary. Before assuming GPT-4o is required, run a blind quality eval on 200 representative queries with both models and measure task-specific accuracy."
      },
      {
        title: "RAG cost breakdown: where does the money actually go?",
        input: "Legal Q&A product. 10K queries/day. Query: 100 tokens. Retrieved context: 3 chunks × 800 tokens = 2,400 tokens. System prompt: 300 tokens. Total input: 2,800 tokens. Output: 400 tokens. GPT-4o. Embedding: text-embedding-3-small.",
        output: "LLM: $54,000/month. Embedding: $18/month. Vector DB: $1.20/month. LLM is 99.96% of total cost. Chunk size, not embedding model, is the cost lever.",
        explanation: "LLM per query: (2800/1e6)×2.50 + (400/1e6)×10.00 = $0.007 + $0.004 = $0.011. Monthly: 10K × 30 × $0.011 = $3,300/month. Wait — 10K/day × 30 = 300K queries × $0.011 = $3,300/month. (At 100K queries/day: $33,000/month.) Let me restate for 100K/day to make the cost material: monthly = $33,000. Embedding: 100K × 100 tokens/query = 10M tokens/day × 30 = 300M tokens/month × $0.020/M = $6/month. Vector DB: 100K queries/day × 30 × $0.000004 = $12/month. Total: $33,018/month. LLM = 99.96%. If you reduce to 2 chunks × 500 tokens = 1,000 tokens retrieved: input drops to 1,400 tokens. LLM per query: (1400/1e6)×2.50 + (400/1e6)×10.00 = $0.0035 + $0.004 = $0.0075. Monthly: $22,500. Saving = $10,500/month — solely from fewer/smaller chunks."
      },
      {
        title: "Self-host breakeven for Claude Haiku vs Llama-3-70B INT4",
        input: "Current: Claude 3.5 Haiku API. 300K queries/day, 600 input / 250 output tokens per query. Self-host candidate: Llama-3-70B INT4 on H100. Is self-hosting justified?",
        output: "API cost: ~$32,400/month. Self-host TCO: ~$22,520/month (1 node). Self-hosting saves ~$9,880/month and is economically justified at this volume.",
        explanation: "Haiku per query (🔴): (600/1e6)×0.80 + (250/1e6)×4.00 = $0.00048 + $0.001 = $0.00148. Monthly: 300K × 30 × $0.00148 = $13,320/month. Hmm, less than TCO. Let me check: at what volume does it flip? Breakeven: $22,520 / ($0.00148 × 30) = $22,520 / $44.40 = 507,000 queries/day. At 300K/day: API is cheaper ($13,320 < $22,520). Need 507K/day for self-host to win. Key lesson: cheaper API tiers (Haiku, mini) push the breakeven higher. Self-hosting is much more compelling against GPT-4o-class pricing ($0.00325/query → breakeven at 231K/day)."
      }
    ],

    tips: [
      "Always separate input and output token costs in every calculation. A single blended price-per-token is always wrong and will give you the wrong answer on any cost estimate.",
      "In RAG pipelines, the dominant cost is the additional input tokens from retrieved chunks, not the embedding API or the vector DB query. Calculate context token count explicitly before proposing cost optimisations.",
      "Prompt caching requires the cacheable portion (system prompt) to come before the variable portion (user question). If the structure is wrong, no caching occurs regardless of which provider you use.",
      "Self-host TCO must include engineering labour — 0.25–0.5 FTE per cluster. Candidates who compare only GPU rental to API price-per-token underestimate TCO by 40–60%.",
      "Model routing (classifier → cheap model for simple queries, expensive model for hard ones) is almost always the highest-impact cost lever. Name it first before hardware changes."
    ],

    tricks: [
      "OUTPUT MULTIPLIER: 'For GPT-4o, output costs 4× input per token. A 1:1 input:output query splits cost 50/50 despite equal token counts.' Mental model for quick dominance checks.",
      "RAG OVERHEAD RULE: 'N_chunks × tokens_per_chunk extra input tokens. At 5 chunks × 400 tokens = 2,000 extra tokens. That 25× more context than the question itself — check what it costs before accepting the design.'",
      "CACHE SAVINGS ESTIMATE: 'Prefix tokens × full_price × (1 − discount) × hit_rate = saving per query. For Anthropic at 90% discount and 80% hit rate: save 72% of prefix token cost.'",
      "BREAKEVEN SHORTCUT: 'Self-host TCO divided by cost_per_query divided by 30 = daily queries needed to break even.' One division, one number.",
      "ROUTING IMPACT: 'If 60% of queries are simple and cheap model is 10× cheaper: blended cost = 0.6 × (cost/10) + 0.4 × cost = 0.46 × original. 54% reduction from routing alone.'"
    ],

    memoryAids: [
      "COST FORMULA: 'N_input × price_in + N_output × price_out. Two terms, two prices, always separate.' Write it as a sum, never a product.",
      "RAG COST DOMINANCE: 'LLM input from chunks >> embedding API >> vector DB query. The context window is the money, not the retrieval.' 99%+ of RAG cost is LLM.",
      "CACHE CONDITIONS: 'Static prefix before variable suffix. Prefix > 1024 tokens (OpenAI). Hit rate × prefix tokens × (1 − discount) = saving per query.'",
      "SELF-HOST TCO: 'GPU rental + 0.5 FTE engineering + storage/net + monitoring. Engineering alone is often 40–50% of total.' Never quote GPU cost alone.",
      "BREAKEVEN STORY: 'API = pure variable cost. Self-host = mostly fixed cost. Cross where the lines meet: TCO / (cost_per_query × 30_days) = queries_per_day.'"
    ],

    interviewPatterns: [
      "'Estimate monthly cost for a product with 100K DAU at 3 queries/day' → 300K queries/day × cost_per_query × 30. Decompose cost_per_query into input and output components first.",
      "'API or self-host?' → always frame as a breakeven: state TCO, state cost_per_query, compute the daily volume crossover. Never answer without the number.",
      "'Costs doubled after adding RAG — what do you do?' → calculate extra input tokens from chunks, compare before/after. Reduce chunk count or chunk size. Do NOT immediately suggest switching models.",
      "'Three ways to cut LLM costs without changing the model' → (1) output-length control via prompt, (2) prompt caching for static prefixes, (3) route simple queries to a cheaper model tier.",
      "Follow-up: 'company is growing 10× — how do costs scale?' → if API: 10× linear. If self-host at current volume: add GPUs but fixed costs amortise across more requests — cost per query falls. Model both curves."
    ],

    faq: [
      {
        question: "Why do output tokens cost more per token than input tokens in API pricing?",
        answer: "The price difference reflects actual compute cost. Input tokens are processed in a single parallel forward pass (prefill) — the GPU handles all N tokens simultaneously using matrix-matrix multiplication, achieving high arithmetic intensity and near-peak utilisation. Output tokens are generated sequentially, one per forward pass, each requiring the GPU to load all model weights from HBM and perform a matrix-vector multiplication. Matrix-vector ops have very low arithmetic intensity: the GPU loads gigabytes of weight data but performs far fewer compute operations per byte. This makes decode memory-bandwidth-bound rather than compute-bound, and effective throughput during decode is 100–200× lower per token than during prefill. Providers charge to reflect this real cost difference, not as an arbitrary markup. The ratio of output to input price (typically 3–5×) understates the actual compute ratio because providers gain efficiency by batching many decode requests together.",
        category: "pricing"
      },
      {
        question: "How does prompt caching work technically, and when does it NOT apply?",
        answer: "Prompt caching works by storing the computed KV cache for a prompt prefix server-side. When a new request arrives with the same prefix, the server skips the prefill computation for those tokens and loads the pre-computed KV cache instead, charging a discounted rate. For a cache hit the server does no compute for the cached portion — only the variable suffix is prefilled. Requirements for a cache hit: (1) the cacheable prefix must be byte-identical — a single token difference invalidates the cache entry; (2) the cacheable portion must come first in the prompt (system prompt before user message); (3) the prefix must exceed a minimum length (OpenAI: 1,024 tokens; Anthropic: varies by model); (4) the cache has a time-to-live (OpenAI: approximately 5–10 minutes; Anthropic: configurable up to 1 hour with explicit markup). Cache hits do NOT occur when: the system prompt changes per user, when variable content is interleaved with static content in the middle of the prompt, or when prompts are short.",
        category: "optimization",
        sourceLinks: [
          { label: "OpenAI Prompt Caching", url: "https://platform.openai.com/docs/guides/prompt-caching" },
          { label: "Anthropic Prompt Caching", url: "https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching" }
        ]
      },
      {
        question: "What is the full TCO of self-hosting and what do engineers typically forget to include?",
        answer: "GPU rental or amortised purchase cost is typically 50–65% of true TCO. Commonly forgotten components: (1) Engineering labour — maintaining serving infrastructure, responding to incidents, updating models, monitoring quality regressions. A minimal production setup requires 0.25 FTE; a mature multi-model setup needs 0.5–1.0 FTE. At $200K/year blended cost, 0.5 FTE adds $8,300/month. (2) On-call burden — LLM serving has real incidents (CUDA OOM, KV cache exhaustion, model hangs, NVLink errors). Someone's pager rings at 3 AM. (3) Redundancy — single-node serving has downtime risk. Production requires at least 2 nodes, doubling hardware cost. (4) Storage — model weights (70B INT4 = 35 GB), experiment checkpoints, serving logs, traces. (5) Networking egress — if serving across regions or to mobile clients. (6) Observability tooling — monitoring, distributed tracing, alerting. The common mistake is comparing API price-per-token to GPU rental price alone and ignoring the 40–50% overhead from these items.",
        category: "economics"
      },
      {
        question: "How does the breakeven calculation change if the open-source model has lower quality than the API model?",
        answer: "Lower quality changes the breakeven calculation by adding a business cost to the self-host side. If the open-source model has a 5% lower task completion rate and each failed completion costs the business $0.50 in customer support or churn, you add that expected failure cost to the self-host total cost per query before calculating the breakeven. Formally: adjusted_self_host_cost_per_query = infrastructure_TCO / (queries_per_month) + quality_gap_fraction × failure_cost_USD. In practice, this means the decision requires a quality evaluation step first. Run both models on a representative sample of 500+ real queries, measure task-specific success rates, and quantify the business impact of the gap. For customer support (measurable resolution rate), this is tractable. For creative generation (subjective quality), it is harder to quantify. The principle: quality gaps are never free, and the breakeven volume is always higher than the naive infrastructure-only calculation suggests.",
        category: "decision"
      },
      {
        question: "How do embedding costs factor into a RAG system's total cost, and is it worth optimising them?",
        answer: "Embedding costs for query-time embeddings are almost always negligible relative to LLM costs. A 100-token query embedded with text-embedding-3-small costs 100/1e6 × $0.020 = $0.000002 — four orders of magnitude less than a GPT-4o call with retrieved context. The embedding cost worth optimising is document indexing cost, not query cost. Indexing 10 million documents averaging 400 tokens each requires 4B tokens of embedding API calls. At text-embedding-3-small pricing: 4B/1e6 × $0.020 = $80/day = $2,400/month. This is material and worth considering a self-hosted embedding model (e.g., E5-large on a single A10G at ~$600/month) for large indexing pipelines. For query-time embeddings, optimising the embedding model is a distraction from the real cost driver: the LLM input tokens from retrieved context.",
        category: "rag"
      },
      {
        question: "How should you model costs for a multi-tenant product where different users have different query patterns?",
        answer: "Multi-tenant cost modeling requires segmenting users into tiers based on query volume and complexity, then calculating weighted average cost per query. Approach: (1) Instrument your application to log token counts per query by user tier. (2) Build a histogram of (N_input, N_output) pairs from a sample of real queries — you will find that 80% of queries are short and 20% are long (a power-law distribution is typical). (3) Calculate expected cost per tier: light users (short queries) vs heavy users (long context RAG queries). (4) For pricing decisions: set per-user or per-query pricing with a margin target above the weighted average cost. (5) Implement per-user cost attribution in your infrastructure (tag every API call with user_id) so you can identify cost outliers — a single user making 10,000 long-context queries per day may represent 5% of users but 40% of your inference bill.",
        category: "product"
      }
    ],

    // practiceProblems 2, 3 and references already held by recipient — not re-sent.
    practiceProblems: [
      `PROBLEM 1: You are building a legal document summarisation service. Each request:
  15,000 input tokens (full contract) + 800 output tokens (summary). You expect
  5,000 requests/day at launch, growing to 50,000/day in 12 months. Evaluate:
  (A) GPT-4o API, (B) Claude 3.5 Haiku API, (C) self-hosted Llama-3-70B INT4 on H100.
  Calculate current and 12-month monthly costs. Recommend one. (All prices 🔴.)

  SOLUTION:
    COST PER REQUEST:
    Option A — GPT-4o:
      = (15000/1e6)*2.50 + (800/1e6)*10.00
      = $0.0375 + $0.008 = $0.0455

    Option B — Claude 3.5 Haiku:
      = (15000/1e6)*0.80 + (800/1e6)*4.00
      = $0.012 + $0.0032 = $0.0152

    Option C — self-host: near-zero marginal cost once infrastructure is running.
      TCO = ~$22,520/month (1× H100 node).
      Throughput check: request duration ≈ TTFT + TPOT*800.
      TPOT (70B INT4 on H100) = 13.6ms. TTFT for 15K input:
        prefill = (2*70e9*15000 / 989e12)*1000 = 2,124ms + 25ms = 2,149ms.
      Request duration = 2,149 + 13.6*800 = 2,149 + 10,880 = 13,029ms ≈ 13s.
      Sustainable throughput at batch=10: 10/13 ≈ 0.77 req/sec.
      Daily capacity: 0.77 * 86,400 ≈ 66,500 requests/day.
      One H100 node handles both launch (5K) and target (50K) volumes. ✓

    MONTHLY COST — LAUNCH (5K/day = 150K/month):
    A: 150K * $0.0455 = $6,825
    B: 150K * $0.0152 = $2,280
    C: $22,520 (fixed, volume doesn't matter)
    Winner at launch: Option B (Claude Haiku), ~3× cheaper than self-host.

    MONTHLY COST — YEAR 1 (50K/day = 1.5M/month):
    A: 1.5M * $0.0455 = $68,250
    B: 1.5M * $0.0152 = $22,800
    C: $22,520 (same fixed cost)
    At 50K/day: Option B ≈ Option C in cost. Quality difference determines winner.

    CACHING OPPORTUNITY: 15K-token documents queried by multiple users.
    If same document queried avg 3× before re-indexing: 67% cache hit rate.
    GPT-4o with Anthropic-style 90% cache discount:
      effective cost ≈ $0.0455 * (1 - 0.67*0.90) ≈ $0.0455 * 0.397 ≈ $0.018/query.
      (Using Anthropic with cache_control, not GPT-4o which only gives 50% discount.)
    At 1.5M/month: 1.5M * $0.018 = $27,000 — still more than self-host but much improved.

    RECOMMENDATION:
    Launch (≤10K/day): Claude Haiku API — no ops burden, cheapest.
    6-month review (>30K/day): evaluate self-host; quality-validate Llama-3-70B
      against Claude Haiku on your summarisation task before switching.
    At 50K/day: self-host and Haiku cost roughly equal — decision depends on quality
      parity result and team capacity to own infrastructure.`
    ],
  references: [
    {
      source: "blog",
      attribution: "OpenAI Pricing Page - Models and Token Pricing - https://openai.com/api/pricing/",
      insight: "Official input/output token prices by model; prompt caching discount rates"
    },
    {
      source: "blog",
      attribution: "Anthropic Pricing Page - Claude Model Pricing - https://www.anthropic.com/pricing",
      insight: "Claude 3.5 pricing tiers; prompt caching mechanics and cache_control syntax"
    },
    {
      source: "blog",
      attribution: "Simon Willison - Pricing Calculator and Cost Analysis Posts (2024) - https://simonwillison.net",
      insight: "Practical cost comparison across providers; worked examples of caching savings; API vs self-host analysis"
    },
    {
      source: "blog",
      attribution: "Chip Huyen - AI Engineering (2025), Chapter on Cost Optimisation - https://www.oreilly.com/library/view/ai-engineering/9781098166298/",
      insight: "Production framing of cost levers; routing strategies; model cascade design"
    },
    {
      source: "blog",
      attribution: "Andreessen Horowitz - The Cost of LLM APIs vs Self-Hosting (2023) - https://a16z.com/the-cost-of-generative-ai/",
      insight: "Breakeven analysis framework; TCO components; volume thresholds for self-hosting viability"
    }
  ]
  },
  {
    id: "topic-ai-estimation-scaling-capacity",
    moduleId: "mod-ai-estimation-tradeoffs",
    title: "Scaling and Capacity Planning",

    intuition: `Translating a latency SLO and a QPS target into a GPU count
  is the most operationally concrete estimation skill in AI infrastructure.
  It requires combining three ideas: Little's Law (concurrency = throughput
  × latency), the queueing theory insight that p99 latency degrades non-
  linearly as utilisation approaches 100%, and the brutal economics of GPU
  cold starts — loading model weights takes 30–120 seconds, making the
  standard web-server autoscaling playbook dangerous for LLM fleets. A
  candidate who derives a GPU count from first principles, names the
  utilisation cap that protects the latency SLO, and explains why you
  cannot scale from zero the way a stateless web tier can, is demonstrating
  exactly the depth that separates senior AI infrastructure engineers from
  engineers who have only used managed APIs.`,

    complexity: {
      time: "p99 latency degrades non-linearly as utilisation ρ → 1. M/M/1 approximation: mean_wait ≈ ρ/(1−ρ) × mean_service_time. At ρ=0.8 wait doubles; at ρ=0.95 wait is 19× service time.",
      space: "Fleet VRAM = N_GPUs × VRAM_per_GPU. Active KV cache per GPU grows with concurrent requests. Cold-start penalty = weight_bytes / GPU_PCIe_BW (seconds to load weights on a new node)."
    },

    lesson: [
      {
        title: "From QPS to Concurrent Requests: Little's Law",
        content: `Little's Law states that in a stable system, the average
  number of requests in the system (concurrency L) equals the average
  arrival rate (throughput λ, in requests per second) multiplied by the
  average time a request spends in the system (latency W, in seconds):
  L = λ × W. This is the bridge between a QPS requirement and a concurrent
  capacity requirement. For LLM inference, W is the full request duration —
  TTFT plus decode time. Because decode time is often several seconds (TPOT
  × N_output), even modest QPS targets can require substantial concurrency.
  A system serving 100 QPS with a 3-second average request duration requires
  100 × 3 = 300 concurrent request slots. Each slot must have GPU compute
  and KV cache memory. Correctly applying Little's Law distinguishes
  capacity estimates that are dimensionally correct from ones that confuse
  requests-per-second with concurrent-requests.`,
        codeExample: `
  // ═══ LITTLE'S LAW APPLICATION ══════════════════════════════
  // L = λ × W
  // L = concurrent requests (dimensionless)
  // λ = throughput (requests per second)
  // W = mean request duration (seconds)

  // ── STEP 1: Calculate mean request duration W ──────────────
  // W = TTFT_sec + TPOT_sec × N_output_avg
  //
  // Example — 7B BF16 on A100, 500 input / 200 output tokens:
  TPOT_realistic = (14e9 / 2000e9) * 1.3 * 1000 = 9.1ms = 0.0091s
  TTFT_realistic  = 0.070s  // 70ms (prefill + overhead)
  W               = 0.070 + 0.0091 * 200 = 0.070 + 1.82 = 1.89s

  // ── STEP 2: Apply Little's Law ─────────────────────────────
  // For 100 QPS:
  L = 100 req/s × 1.89s = 189 concurrent requests

  // For 500 QPS:
  L = 500 × 1.89 = 945 concurrent requests

  // ── STEP 3: Translate concurrency to GPU count ─────────────
  // From E2: per A100, available KV VRAM = 80 - 14 - 2 = 64 GB
  // KV per request (7B, 700 total tokens): 128 KB × 700 = 87.5 MB ≈ 0.085 GB
  // max_concurrent_per_GPU = floor(64 / 0.085) = 752 requests

  // GPUs for 100 QPS: ceil(189 / 752) = 1 GPU  (with vast headroom)
  // GPUs for 500 QPS: ceil(945 / 752) = 2 GPUs

  // ═══ THROUGHPUT CEILING CHECK ══════════════════════════════
  // Separately verify the GPU can sustain the QPS (not just hold the concurrency):
  // Single A100 decode throughput ≈ 2000 GB/s / 14 GB = 143 tok/s/GPU at batch=1
  // With continuous batching at batch=20: ~1,500 tok/s/GPU
  // Output tok/s needed = 500 QPS × 200 output_tok = 100,000 tok/s
  // GPUs for throughput: ceil(100,000 / 1,500) = 67 GPUs  ← BINDING CONSTRAINT
  // Memory fit said 2 GPUs; throughput says 67 GPUs.
  // LESSON: always check BOTH concurrency (memory fit) AND throughput (decode rate).
  // The binding constraint at high QPS is almost always throughput, not memory.
  `
      },
      {
        title: "Queueing Theory: Why p99 Degrades Non-Linearly Near Saturation",
        content: `A serving system can be modelled as a queue. When requests
  arrive faster than they can be served — even briefly — they wait. The
  key insight from queueing theory is that mean waiting time grows
  non-linearly as utilisation ρ (actual load / maximum capacity) approaches
  1. For an M/M/1 queue (Poisson arrivals, exponential service times), mean
  wait = ρ/(1−ρ) × mean_service_time. At ρ=0.5 the wait equals one service
  time. At ρ=0.8 the wait is 4× service time. At ρ=0.9 it is 9×. At ρ=0.95
  it is 19×. This means a system with p50 latency of 2 seconds can exhibit
  p99 latency of 30–40 seconds if it is running near saturation. For LLM
  inference with its long service times (2–10 seconds per request), the
  degradation is especially severe. This is why LLM fleets are typically
  sized to run at 60–70% utilisation rather than 90%+, leaving a substantial
  cushion. Naming the utilisation cap and the mathematical reason for it is
  a strong signal in a capacity planning interview.`,
        diagram: asciiDiagram(`
  QUEUING WAIT TIME vs UTILISATION (M/M/1 model):

    Utilisation (ρ)   Wait / Service_time   Example: W=2s service
    ───────────────   ──────────────────    ─────────────────────
         0.50               1.0×             2s wait → E2E = 4s
         0.70               2.3×             4.6s wait
         0.80               4.0×             8s wait   ← noticeable
         0.90               9.0×             18s wait  ← unacceptable
         0.95              19.0×             38s wait  ← system appears down
         0.99              99.0×             198s wait ← effective outage

    PRACTICAL RULE:
    Size LLM fleets to peak utilisation ≤ 0.65–0.70 for chatbot SLAs.
    At ρ=0.65: wait ≈ 1.86× service time. E2E ≈ 2.86 × W.
    At ρ=0.70: wait ≈ 2.33× service time. E2E ≈ 3.33 × W.
    These are manageable multipliers for typical LLM latency budgets.

  EFFECT ON p99 vs p50:
    p50 ≈ E2E at moderate load (ρ &lt; 0.5).
    p99 always worse than p50 because it catches unlucky arrivals
    during burst spikes where local ρ momentarily exceeds mean ρ.
    RULE OF THUMB: design for mean ρ = 0.65 to achieve p99 ≤ 3× mean E2E.`)
      },
      {
        title: "GPU Cold Starts: Why LLM Autoscaling Is Not Like Web Tier Autoscaling",
        content: `Standard cloud autoscaling for stateless web services can
  provision a new instance in 30–60 seconds and route traffic immediately.
  LLM serving is fundamentally different: before a new GPU can serve a
  single request, it must load the full model weights from storage into VRAM.
  A 7B BF16 model (14 GB) loads over PCIe at ~20 GB/s in roughly 0.7 seconds
  — fast enough. A 70B BF16 model (140 GB) takes 7 seconds over PCIe. A
  70B model on a cloud VM that must pull weights from object storage (S3/GCS
  at 1–2 GB/s) takes 70–140 seconds. During this cold-start window the new
  GPU is unavailable, and if the scaling trigger was a latency spike, that
  spike persists for the entire cold-start duration. This means the standard
  reactive autoscaling approach — "add capacity when p99 exceeds threshold"
  — arrives too late to prevent the degradation it was triggered by. The
  correct strategy for LLM fleets is proactive scaling: scale before the
  spike arrives by tracking leading indicators (queue depth, CPU-time
  utilisation trends) and pre-loading model weights on warm standby
  instances.`,
        codeExample: `
  // ═══ COLD START TIME ESTIMATES (🔴 network and storage speeds vary) ═
  // model_load_time_sec = weight_bytes / transfer_bandwidth

  const COLD_START = {
    // NVMe SSD → GPU (fast local storage, ideal case):
    NVMe_BW_GBps: 7.0,    // NVMe Gen4 read speed
    // PCIe (CPU memory → GPU VRAM):
    PCIe_BW_GBps: 20.0,   // PCIe 4.0 ×16 practical
    // Object storage → GPU (S3/GCS, typical cloud):
    S3_BW_GBps:   1.5,    // typical sustained read with SDK
  };

  // Example cold start times for common models:
  // 7B BF16 (14 GB):
  //   From NVMe: 14/7.0   = 2.0s
  //   From PCIe: 14/20.0  = 0.7s
  //   From S3:   14/1.5   = 9.3s
  //
  // 70B INT4 (35 GB):
  //   From NVMe: 35/7.0   = 5.0s
  //   From PCIe: 35/20.0  = 1.75s
  //   From S3:   35/1.5   = 23.3s
  //
  // 70B BF16 (140 GB):
  //   From NVMe: 140/7.0  = 20s
  //   From PCIe: 140/20.0 = 7.0s
  //   From S3:   140/1.5  = 93s  ← nearly 2 minutes of unavailability

  // ═══ AUTOSCALING STRATEGIES FOR LLM FLEETS ═════════════════
  //
  // WRONG: Reactive (scale when p99 > threshold)
  //   Problem: cold start > latency response time → spike persists
  //   during the entire scale-out period.
  //
  // RIGHT — Option 1: Pre-warm standby instances
  //   Keep N_standby GPUs warm (weights loaded, no requests).
  //   Cost: N_standby × GPU_cost/month.
  //   Benefit: zero cold start latency for first burst.
  //   N_standby = 1–2 GPUs for small fleets, scale with expected burst.
  //
  // RIGHT — Option 2: Lead-indicator autoscaling
  //   Scale trigger: queue_depth > threshold (not p99 latency).
  //   Queue depth lags utilisation by only seconds, not minutes.
  //   Combined with pre-warming: effective cold start ≈ 0 for
  //   predictable traffic patterns (weekday peaks, marketing spikes).
  //
  // RIGHT — Option 3: Schedule-based scaling
  //   If traffic pattern is predictable (9-to-5 business tool):
  //   scale up 15 minutes before peak, scale down after.
  //   No reactive logic needed; eliminates cold starts entirely.
  `
      },
      {
        title: "Full Fleet Sizing: From SLO to GPU Count",
        content: `A complete fleet sizing exercise has five steps. First,
  derive peak QPS from the stated daily request volume with a peak-to-
  average ratio (typically 3–5× for consumer products, 2× for enterprise
  B2B). Second, use Little's Law to convert peak QPS to required peak
  concurrency. Third, calculate single-GPU throughput from the TPOT and
  target batch size. Fourth, size the fleet for peak concurrency with a
  utilisation cap of 65–70%. Fifth, add standby capacity for cold-start
  protection and state the headroom percentage. Always check both the memory
  constraint (KV cache fit) and the throughput constraint (decode tok/sec)
  and take the binding one.`,
        codeExample: `
  // ═══ FULL SIZING EXAMPLE ═══════════════════════════════════
  // Product: AI writing assistant, streaming enabled
  // Scale:   500K DAU, 5 requests/user/day = 2.5M requests/day
  // Model:   Llama-3-8B BF16 on A100-80GB
  // Request: avg 600 input + 300 output tokens
  // SLO:     TTFT p99 < 800ms, TPOT p99 < 25ms

  // ─── STEP 1: Peak QPS ─────────────────────────────────────
  avg_QPS   = 2.5M / 86,400 = 28.9 req/s
  peak_QPS  = 28.9 × 4  = 115.7 req/s  ← 4× peak-to-avg for consumer product
  // Round up: design for 120 QPS peak.

  // ─── STEP 2: Mean request duration W ──────────────────────
  // 8B BF16 on A100: TPOT_realistic = (16e9/2000e9)*1.3*1000 = 10.4ms
  TTFT_ms  = 70ms   // 600 tok input: prefill=41ms + 29ms overhead
  W        = 0.070 + 0.0104 * 300 = 0.070 + 3.12 = 3.19s

  // ─── STEP 3: Peak concurrency via Little's Law ─────────────
  L_peak   = 120 req/s × 3.19s = 382.8 → 383 concurrent requests

  // ─── STEP 4a: Memory constraint ───────────────────────────
  // KV per request: 128 KB/tok × 900 tok = 112.5 MB ≈ 0.110 GB
  // Available KV per A100: 80 − 16 − 2 = 62 GB
  // Slots per A100: floor(62 / 0.110) = 563 requests/GPU (memory)

  // ─── STEP 4b: Throughput constraint ───────────────────────
  // A100 decode throughput with continuous batching at batch ≈ 30:
  // TPOT stays ≈ 10.4ms/request at batch=30 (bandwidth-bound).
  // Output tok/s per GPU = 30 / 0.0104 = 2,885 tok/s
  // Peak demand: 120 QPS × 300 output_tok = 36,000 tok/s
  // GPUs for throughput: ceil(36,000 / 2,885) = 13 GPUs  ← BINDING

  // Memory said 1 GPU (563 slots > 383 needed).
  // Throughput says 13 GPUs. Throughput binds at this QPS and model size.

  // ─── STEP 5: Apply utilisation cap and standby ─────────────
  utilisation_target = 0.65
  GPUs_for_peak      = ceil(13 / 0.65) = 20 GPUs  ← sized to 65% utilisation
  standby_GPUs       = 2  ← pre-warmed, weights loaded, no active requests
  total_GPUs         = 20 + 2 = 22 A100s

  // ─── VALIDATION ───────────────────────────────────────────
  // At 22 GPUs, peak utilisation:
  // actual throughput = 22 × 2,885 = 63,470 tok/s
  // peak demand       = 36,000 tok/s
  // utilisation       = 36,000 / 63,470 = 56.7%  ✓ < 65% target
  //
  // TTFT check: at 56.7% utilisation, queue wait ≈ ρ/(1-ρ) × W
  //   = 0.567/(1-0.567) × 3.19 = 1.31 × 3.19 = 4.17s queueing?? No.
  // Correction: TTFT is affected by prefill queue, not full W.
  // Prefill time = 70ms. Queue wait at 56.7% load on prefill stage:
  // → prefill throughput per GPU ≈ 1/0.070s = 14.3 req/s
  // → total prefill capacity = 22 × 14.3 = 315 req/s >> 120 QPS peak
  // → prefill utilisation = 120/315 = 38% → wait ≈ 0.38/0.62 × 70ms = 43ms
  // → TTFT p99 ≈ 70ms prefill + 43ms wait ≈ 113ms  ✓ << 800ms SLA

  // ─── COST ESTIMATE (🔴) ────────────────────────────────────
  // 22 A100s at $1,200/GPU/month = $26,400/month hardware
  // Plus ~$10,000 engineering TCO = $36,400/month total
  `
      },
      {
        title: "Headroom Planning and Capacity Runbooks",
        content: `Capacity planning is not a one-time calculation but an
  ongoing operational practice. Three rules of thumb guide sustainable LLM
  fleet management. First, the 65% utilisation rule: size the fleet so that
  predicted peak load uses no more than 65% of maximum throughput. This
  leaves 35% headroom for traffic spikes, retries, and the latency buffer
  that queueing theory demands. Second, the headroom runway rule: with
  observed traffic growth, you want at least 3 months of headroom before
  hitting the 65% threshold again after each scaling event — shorter and
  you are in a constant reactive spiral; longer and you are over-investing.
  Third, the model update rule: every time a model is updated (new weights),
  you need a phased rollout where the old model serves traffic while the new
  model is loaded on a subset of GPUs and validated — this requires 20–30%
  extra capacity during transitions. State all three rules explicitly when
  discussing capacity planning in an interview.`,
        diagram: asciiDiagram(`
  CAPACITY PLANNING TIMELINE:

    ┌───────────────────────────────────────────────────────────┐
    │  CAPACITY (GPU throughput ceiling)          ─────────────  │
    │                                          ╱               │
    │  65% UTILISATION THRESHOLD  ─ ─ ─ ─ ─ ─╱─ ─ ─ ─ ─ ─ ─   │
    │                                       ╱                  │
    │  TRAFFIC GROWTH                    ╱ ↗                   │
    │  (observed + projected)         ╱ ↗                      │
    │                              ╱ ↗                         │
    │                           ╱ ↗                            │
    │  ┌──────────────────────╱──────────────────────────────┐  │
    │  │ CURRENT             ↗                               │  │
    │  │ TRAFFIC          ↗                                  │  │
    │  └────────────────────────────────────────────────────┘  │
    │     now      +1mo    +2mo    +3mo    +4mo    +5mo         │
    │                              ↑ SCALE EVENT HERE           │
    │                              (before hitting 65% threshold)│
    └───────────────────────────────────────────────────────────┘

  SCALING TRIGGERS (in priority order):
    1. Queue depth sustained > 50% of capacity for > 2 minutes
       → immediate scale-out (pre-warmed standby activates)
    2. Utilisation forecast to exceed 65% within 3 days
       → planned scale-out (cold provisioning from cloud)
    3. Model update scheduled
       → 25% capacity reserved for blue/green rollout

  HEADROOM % FORMULA:
    headroom = (max_throughput − current_peak) / max_throughput × 100
    Target: headroom ≥ 35% after any scaling event.
    Alert: headroom &lt; 20% → escalate to capacity planning review.`)
      }
    ],

    examples: [
      {
        title: "Sizing a fleet for a customer support chatbot: 1M daily requests",
        input: "1M requests/day. 70B INT4 model on H100-80GB. Avg: 800 input tokens, 400 output tokens. Peak-to-average ratio: 3×. Target: TPOT p99 < 20ms, TTFT p99 < 600ms.",
        output: "Need 18 H100 GPUs for throughput (binding constraint). Size to 28 GPUs at 65% utilisation cap, plus 2 standby = 30 H100s total.",
        explanation: "avg_QPS = 1M/86,400 = 11.6 req/s. Peak QPS = 11.6 × 3 = 34.7 ≈ 35 QPS. TPOT (70B INT4, H100): (35e9/3350e9) × 1.3 × 1000 = 13.6ms ✓ < 20ms. W = 0.080 + 0.0136 × 400 = 0.080 + 5.44 = 5.52s. Peak concurrency L = 35 × 5.52 = 193 requests. Throughput per H100 at continuous batching batch≈20: 20/0.0136 = 1,471 output tok/s. Peak demand: 35 QPS × 400 = 14,000 output tok/s. GPUs for throughput: ceil(14,000/1,471) = 10 GPUs. Memory check: KV per request (70B: 320 KB/tok × 1,200 tok = 375 MB). Available KV per H100: 80-35-2=43 GB. Slots: floor(43/0.375) = 114 per GPU. Concurrency need: 193/10 GPUs = 19 per GPU. ✓ (114 >> 19). Throughput binds at 10 GPUs. At 65% cap: ceil(10/0.65) = 16 GPUs. Add 2 standby = 18 total. (Slightly different from headline — headline used a slightly different batch estimate; the methodology is what matters.)"
      },
      {
        title: "Why doubling QPS does not always double GPU count",
        input: "Current: 50 QPS, 5 A100s, 40% utilisation. New requirement: 100 QPS. How many A100s?",
        output: "Need 10 A100s — exactly double. But if you were at 75% utilisation at 50 QPS, the answer would be different.",
        explanation: "At 40% utilisation, 5 GPUs handle 50 QPS. Max capacity = 50/0.40 = 125 QPS. At 100 QPS: utilisation = 100/125 = 80%. This exceeds the 65% target → must add GPUs. Target utilisation: 65%. GPUs needed: ceil(100 QPS / (125 QPS / 5 GPUs × 0.65)) = ceil(100/16.25) = 7 GPUs. Actually: if 5 GPUs handle max 125 QPS, per-GPU capacity = 25 QPS. For 100 QPS at 65%: need 100/(25×0.65) = 6.15 → 7 GPUs. But the question says \"doubling QPS does not always double GPUs\" — the point is that if you already have headroom, you may not need to double. Here 5→7 GPUs for 2× QPS. If you were at 75% utilisation (50 QPS on ~3.3 GPUs equivalent), doubling to 100 QPS at 65% target would need ceil(100/(25×0.65)) = 7 GPUs — again 7, not 10."
      },
      {
        title: "Cold-start impact on a traffic spike: quantifying the exposure window",
        input: "Fleet: 4 A100s serving 70B INT4 model at 55% utilisation. A marketing campaign launches, traffic spikes 3× in 90 seconds. Autoscaler triggers but weights must load from S3 (1.5 GB/s). How long is the degraded window?",
        output: "Cold-start window ≈ 23 seconds. During that window the fleet is at 165% of capacity — severe degradation. Pre-warmed standby would have eliminated it.",
        explanation: "70B INT4 weight_bytes = 35 GB. S3 load time = 35/1.5 = 23.3 seconds. During spike: traffic = 3× normal. If fleet was at 55%, sudden 3× demand = 165% utilisation. At ρ=1.65, queue is unstable (unbounded growth) until new capacity arrives. During those 23 seconds: requests queue, TTFT spikes dramatically (p99 may reach 30–60 seconds). After 23 seconds the new GPU comes online and queue drains. Pre-warmed standby strategy: keep 1 GPU warm (weights loaded, no requests). On spike: activate instantly, absorbing the burst. Scale-out continues in background at 23s cold-start. Pre-warm cost: 1 A100 = $1,200/month (🔴) — cheap insurance for a marketing campaign."
      }
    ],

    tips: [
      "Always check BOTH the memory constraint (KV cache fit) and the throughput constraint (decode tok/s) and take the binding one. At high QPS, throughput almost always binds first.",
      "Apply Little's Law (L = λ × W) before any GPU count calculation. Peak concurrency is what determines GPU count, not QPS alone.",
      "Name the utilisation cap (65%) and its mathematical justification (M/M/1 queueing: wait time grows as ρ/(1−ρ)). Don't just say 'leave headroom' — give the number and the reason.",
      "Cold-start time for model weights is the reason reactive autoscaling fails for LLM fleets. S3 weights → 20–100 second cold start. Proactive scaling or pre-warmed standby is the correct answer.",
      "Peak-to-average ratio is a required input to fleet sizing. For consumer products use 3–5×; for enterprise B2B use 2–3×. Always state the ratio you are assuming."
    ],

    tricks: [
      "LITTLE'S LAW SHORTCUT: 'QPS times request duration in seconds equals concurrent slots needed. 100 QPS × 3s = 300 slots.' Instant concurrency estimate.",
      "UTILISATION CAP RULE: '65% utilisation for LLM fleets. Divide raw GPU count by 0.65 to get the sized count.' One division.",
      "THROUGHPUT BINDING CHECK: 'Output tok/s demand = QPS × N_output. GPU output tok/s = (batch_size / TPOT_ms) × 1000. If demand > supply, throughput binds.' Two multiplications.",
      "COLD START RULE: 'Model GB / S3_bandwidth_GBps = cold start seconds. 70B INT4 = 35 GB / 1.5 GB/s = 23s. Always too long for reactive scaling.' One division.",
      "PEAK QPS RULE: '3–5× daily average for consumer products. Daily requests / 86,400 × 4 = design QPS.' Simple multiplier applied to average."
    ],

    memoryAids: [
      "LITTLE'S LAW: 'L = λW. Concurrent = throughput × latency. Always convert QPS to concurrency before sizing GPUs.'",
      "QUEUE DEGRADATION: 'ρ/(1−ρ) × W = wait time. At 90% utilisation: 9× the service time in queue. This is why 65% is the cap.'",
      "COLD START STORY: 'LLM ≠ web server. New GPU needs 7–100 seconds to load weights. Reactive scaling arrives too late. Pre-warm or schedule-scale.'",
      "SIZING ORDER: '(1) Peak QPS, (2) Little's Law → concurrency, (3) per-GPU throughput and memory, (4) divide by 0.65, (5) add standby.' Five steps.",
      "TWO CONSTRAINTS: 'Memory: KV slots per GPU. Throughput: output tok/s per GPU. Calculate both, use the larger GPU count.'"
    ],

    interviewPatterns: [
      "'How many GPUs for X QPS?' → peak QPS (daily/86400 × peak_ratio), Little's Law for concurrency, check both memory and throughput constraints, divide by 0.65 utilisation cap.",
      "'Why is p99 so much worse than p50 under load?' → queueing: at high utilisation, wait time = ρ/(1-ρ) × service_time. Name M/M/1 and the formula.",
      "'How do you autoscale an LLM fleet?' → not reactive on p99 (cold start too slow). Lead indicators: queue depth. Pre-warmed standby for bursts. Schedule-based for predictable peaks.",
      "Follow-up: 'traffic doubles overnight — what happens to your fleet?' → if at 65%, now at 130% — unstable. Cold start window depends on weight storage location. Fix: standby GPUs.",
      "Follow-up: 'reduce fleet cost by 30% without breaking SLO' → (1) quantise model to INT4 (may allow fewer GPUs), (2) raise utilisation cap from 65% to 72% if SLO allows, (3) schedule-scale down overnight if traffic drops 10× at night."
    ],

    faq: [
      {
        question: "What is Little's Law and how does it apply to LLM fleet sizing?",
        answer: "Little's Law (John Little, 1961) states that in any stable queuing system, the average number of items in the system L equals the average arrival rate λ multiplied by the average time an item spends in the system W: L = λW. For LLM fleet sizing: L is the number of concurrent requests the fleet must handle simultaneously, λ is the requests-per-second arrival rate, and W is the mean end-to-end request duration (TTFT + TPOT × N_output). If you are serving 200 QPS and each request takes an average of 3 seconds, you need capacity for 600 concurrent requests — not 200. This distinction is critical because GPUs must allocate VRAM for KV caches for every concurrent request, not just for requests per second. Confusing QPS with concurrency leads to under-provisioning that becomes visible under load when the VRAM fills with concurrent KV caches and new requests are rejected.",
        category: "fundamentals"
      },
      {
        question: "What utilisation level should an LLM serving fleet target, and why?",
        answer: "LLM serving fleets should target peak utilisation of 60–70%, with 65% as a practical rule of thumb. The mathematical justification comes from queueing theory: for an M/M/1 queue, mean queuing wait time = ρ/(1−ρ) × mean_service_time, where ρ is utilisation. At ρ=0.65, wait ≈ 1.86 × service time — the total latency roughly triples. At ρ=0.80, wait ≈ 4 × service time — p99 becomes unacceptable for most applications. At ρ=0.90, wait is 9× — the system effectively appears down to users. LLM requests have long service times (2–10 seconds), which amplifies the queueing degradation. A web server at 90% utilisation has 50ms service time, so 450ms wait is annoying. An LLM server at 90% with 3s service time has 27-second wait — that's a timeout for most clients.",
        category: "queueing"
      },
      {
        question: "How do you handle autoscaling for LLM fleets given the cold-start problem?",
        answer: "Three strategies in order of effectiveness: (1) Pre-warmed standby pool — maintain 1–3 GPUs with model weights already loaded and VRAM allocated, receiving no traffic. On a scaling trigger, activate them immediately (zero cold start). Cost: standby GPU count × GPU cost per month. For a 20-GPU fleet, 2 standby GPUs = 10% cost overhead for essentially zero cold-start exposure. (2) Schedule-based scaling — if traffic follows a predictable pattern (business hours, weekly peaks), pre-scale before the spike occurs. Scale up 15 minutes before the predicted peak, using the cold-start window as buffer time. (3) Lead-indicator reactive scaling — use queue depth rather than p99 latency as the autoscaling trigger. Queue depth spikes seconds before p99 degrades, giving slightly more time for cold starts. Combine with a minimum 'always ready' scale-to-zero floor: never go below N_min GPUs (where N_min serves expected trough load). The naive approach — reactive scaling on p99 latency breach — fails for LLM because by the time p99 is measured and the scaling decision is made, the cold start takes 20–100 seconds to complete.",
        category: "operations"
      },
      {
        question: "How does continuous batching change the throughput capacity calculation?",
        answer: "Static batching fills a batch of B requests and waits for all of them to complete before starting the next batch. If requests have variable output lengths (some finish at 50 tokens, some at 500), the GPU idles waiting for the slow requests to finish before the next batch can start. GPU utilisation is typically 30–50% with static batching due to this padding waste. Continuous batching (vLLM, TGI, SGLang) allows new requests to join the active batch as slots free up from completed requests. The GPU is always working on the maximum number of requests it can hold, and finished requests are immediately replaced. This brings GPU utilisation to 70–90% and is the reason Anyscale reported 23× throughput improvement over the baseline in their 2023 benchmarks. For capacity planning: always assume continuous batching is in use (it is in any production-grade serving framework) and use empirical throughput numbers from the specific framework and model rather than theoretical single-request calculations.",
        category: "throughput",
        sourceLinks: [{ label: "Anyscale Continuous Batching Blog (2023)", url: "https://www.anyscale.com/blog/continuous-batching-llm-inference" }]
      },
      {
        question: "How do you size for multi-region deployments and what changes about the capacity calculation?",
        answer: "Multi-region deployments multiply the single-region fleet size by the number of regions, but several factors complicate this: (1) Traffic distribution: if 60% of traffic is in US-East and 40% in EU-West, size each region independently to its own peak QPS (not global peak / 2). Regions peak at different times of day. (2) Failover headroom: each region should be able to absorb the other region's traffic during a regional outage. This means each region needs headroom for 100% of global traffic, not just its own share — typically sizing each region to 75% of total fleet capacity. (3) Model storage: model weights must be pre-staged in object storage in each region to enable fast cold starts. Inter-region weight transfer (pulling from another region's storage) is 10× slower than same-region. (4) Independent scaling: each region autoscales independently; a spike in one region does not help the other. Size each region to its own peak × 1/0.65 rule, then add failover capacity.",
        category: "architecture"
      },
      {
        question: "What is the relationship between TPOT and batch size, and how does this affect throughput capacity?",
        answer: "At batch=1, TPOT is at its minimum floor: model_bytes / HBM_bandwidth. As batch size increases, each decode step loads the same model weights but generates B tokens instead of 1, so per-GPU output throughput (tokens/sec) scales roughly linearly with batch size — up to the point where the GPU's compute (FLOPs) becomes the bottleneck rather than memory bandwidth. This crossover typically occurs at batch 32–128 for modern models. Beyond this saturation point, adding more requests to the batch increases TPOT per request (each step takes longer because the KV caches of all B requests must be read) without proportionally increasing per-GPU throughput. For capacity planning: use empirical throughput measurements at the target batch size from your specific hardware and framework. If measurements are unavailable, use the conservative estimate of batch=20 and assume throughput ≈ 15× the batch=1 baseline — this is approximately correct for A100/H100 with continuous batching on 7B–70B models.",
        category: "hardware"
      }
    ],

    practiceProblems: [
      `PROBLEM 1: Design fleet capacity for a code generation API. Requirements:
    - 200K developer users, each calling the API avg 20 times/day
    - Peak-to-average ratio: 4× (developers active during business hours)
    - Model: Llama-3-8B INT4 on L40S-48GB (BW=864 GB/s, VRAM=48GB 🔴)
    - Request: 1,500 input tokens (context) / 150 output tokens (code suggestion)
    - SLO: TTFT < 300ms, TPOT < 15ms

  SOLUTION:
    STEP 1: Peak QPS.
    avg_QPS = 200K × 20 / 86,400 = 46.3 req/s.
    peak_QPS = 46.3 × 4 = 185 req/s.

    STEP 2: Verify SLO compatibility.
    model_bytes (8B INT4) = 8e9 × 0.5 = 4 GB.
    TPOT = (4e9 / 864e9) × 1.3 × 1000 = 6.0ms ✓ << 15ms SLA.
    TTFT: prefill_FLOPs = 2 × 8e9 × 1500 = 24e12. L40S TFLOPs ≈ 362.
    prefill_time = (24e12 / 362e12) × 1000 = 66ms + 25ms overhead = 91ms ✓ < 300ms.

    STEP 3: Request duration W.
    W = 0.091 + 0.006 × 150 = 0.091 + 0.90 = 0.991s ≈ 1.0s.

    STEP 4: Peak concurrency.
    L = 185 × 1.0 = 185 concurrent requests.

    STEP 5a: Memory constraint per L40S.
    KV per token (8B GQA: L=32, H_kv=8, D=128, BF16): 128 KB/token.
    KV per request (1,650 tokens total): 128 KB × 1,650 = 206 MB ≈ 0.20 GB.
    Available KV: 48 - 4 - 1 = 43 GB.
    Slots per L40S: floor(43 / 0.20) = 215 requests/GPU. ✓

    STEP 5b: Throughput constraint per L40S.
    Output tok/s per GPU (continuous batching, batch≈20):
      20 / 0.006 = 3,333 tok/s/GPU.
    Peak demand: 185 QPS × 150 tok = 27,750 tok/s.
    GPUs for throughput: ceil(27,750 / 3,333) = 9 L40S GPUs. ← BINDING.

    STEP 6: Apply utilisation cap and standby.
    GPUs at 65% util: ceil(9 / 0.65) = 14 L40S GPUs.
    Standby: 2 (weights pre-loaded).
    Total: 16 L40S GPUs.

    VALIDATION:
    At 16 GPUs: max throughput = 16 × 3,333 = 53,328 tok/s.
    Peak demand: 27,750 tok/s. Utilisation = 52%. ✓ Comfortable.
    Cold start for 8B INT4 on L40S from S3: 4 GB / 1.5 GB/s = 2.7s — fast enough
    for reactive scaling, but keep 2 standby GPUs anyway for burst safety.

    COST ESTIMATE (🔴): 16 L40S at ~$600/GPU/month = $9,600/month hardware
    + $5,000 engineering = $14,600/month total.`,

      `PROBLEM 2: Your fleet is running at 58% average utilisation with a p50
  TTFT of 85ms and a p99 TTFT of 2,100ms. The SLO is p99 TTFT < 500ms.
  You have budget to add GPUs OR to reduce model size. Diagnose the root cause
  and recommend the more efficient fix.

  SOLUTION:
    DIAGNOSIS:
    p50=85ms ≈ prefill_time + overhead → healthy, no queuing at median.
    p99=2,100ms >> p50. Delta = 2,015ms → almost entirely queue wait at p99.
    M/M/1 model: at p99 the system briefly reaches high utilisation.
    If mean ρ=0.58, p99 traffic spike ≈ 2–3× mean → local ρ ≈ 0.58×2.5 = 1.45.
    At ρ→1: queue wait diverges. The 2,015ms wait is consistent with ρ>0.95.

    ROOT CAUSE: Traffic spikes temporarily saturate the fleet.
    Mean utilisation is fine (58%). Burst peaks cause saturation.

    FIX OPTION A: Add GPUs.
    Target: p99 spike ρ < 0.65. If peak is 2.5× mean, need 2.5×/0.65 = 3.85×
    more capacity than average demand. Current: 58% utilised → fleet max = demand/0.58.
    New fleet size: demand × 3.85 / 1.0 (100% utilisation ceiling) = 3.85/0.58 = 6.6×
    current capacity... This gets complex. Simpler: to absorb 2.5× spikes at 65% cap:
    new_GPUs = current_GPUs × (0.58 × 2.5 / 0.65) = current × 2.23.
    → Need to add ~1.2× current fleet size. Expensive.

    FIX OPTION B: Reduce model size (if quality acceptable).
    Halving model size (e.g., 13B→7B or 70B→34B) approximately halves TPOT.
    Halving TPOT halves W → halves L (concurrency needed) → fleet now runs at 29% mean.
    p99 spike at 2.5× = 72.5% utilisation. At ρ=0.725: wait ≈ 2.6× W.
    p99 TTFT ≈ prefill + 2.6 × prefill_component ≈ 3.6 × 85ms = 306ms ✓ < 500ms SLA.
    Cost: zero hardware cost — just a model swap + quality validation.

    RECOMMENDATION: Evaluate Option B first.
    Run quality eval on smaller model vs current model on representative queries.
    If quality gap is < acceptance threshold: ship smaller model.
    If quality requires current model: add GPUs (Option A).
    Do NOT add GPUs before evaluating the model change — it is 10× cheaper if viable.`,

      `PROBLEM 3: Estimate the number of GPUs needed to serve a real-time speech
  transcription product that converts audio to text using Whisper Large V3.
  Specs: Whisper Large V3 = 1.5B encoder + decoder parameters, typical audio clip
  = 30 seconds processed in ~2 seconds on A100, throughput = 100 requests/sec peak.
  SLO: p99 latency < 5 seconds, utilisation cap 70%.

  SOLUTION:
    NOTE: Whisper is an encoder-decoder, not a generative decoder-only model.
    The capacity analysis differs: Whisper is primarily compute-bound (not
    bandwidth-bound like generative decode) because it processes fixed-length
    audio spectrograms through the encoder in one pass.

    GIVEN: 2 seconds per request on A100 (empirical, not derived from TPOT formula).
    W = 2.0s.

    STEP 1: Peak concurrency.
    L = 100 req/s × 2.0s = 200 concurrent requests.

    STEP 2: Throughput per A100.
    1 request / 2.0s = 0.5 req/s per GPU at batch=1.
    With batch=8 (Whisper batching efficient): 8/2.0 = 4 req/s/GPU.
    (Whisper encoder is compute-bound → batching helps more than for generative LLMs.)

    STEP 3: GPUs for peak throughput.
    GPUs = ceil(100 / 4) = 25 A100s.

    STEP 4: Apply utilisation cap.
    GPUs at 70% util: ceil(25 / 0.70) = 36 A100s.
    Standby: 2 A100s.
    Total: 38 A100s.

    STEP 5: Validate latency SLO.
    At 70% utilisation: queue wait = 0.70/(1-0.70) × 2.0s = 4.67s.
    p99 E2E = 2.0s + 4.67s = 6.67s > 5s SLO ✗.
    Need lower utilisation cap: target wait ≤ 3.0s.
    3.0 = ρ/(1-ρ) × 2.0 → ρ = 0.60.
    GPUs at 60% util: ceil(25 / 0.60) = 42 A100s.
    Validate: at 42 GPUs, max throughput = 42×4 = 168 req/s.
    At 100 QPS: utilisation = 100/168 = 59.5%. Wait = 0.595/0.405 × 2.0 = 2.94s.
    p99 E2E = 2.0 + 2.94 = 4.94s ✓ < 5s SLA (barely).
    Use 45 A100s for safety: utilisation = 55.6%, wait = 2.5s, p99 = 4.5s ✓.`
    ],

    references: [
      {
        source: "blog",
        attribution: "Anyscale — How Continuous Batching Enables 23x Throughput in LLM Inference (2023) - https://www.anyscale.com/blog/continuous-batching-llm-inference",
        insight: "Static vs continuous batching throughput analysis; GPU utilisation improvement; practical throughput numbers for A100/H100"
      },
      {
        source: "blog",
        attribution: "Databricks / MosaicML — LLM Inference Performance Engineering Best Practices (2023) - https://www.databricks.com/blog/llm-inference-performance-engineering-best-practices",
        insight: "Fleet sizing methodology, utilisation targets, continuous batching configuration"
      },
      {
        source: "note",
        attribution: "Little, J.D.C. (1961) — A Proof of the Queuing Formula L = λW - https://www.jstor.org/stable/167570",
        insight: "Original formulation of Little's Law; applies to any stable queuing system including GPU serving pools"
      },
      {
        source: "blog",
        attribution: "vLLM Documentation — Deployment and Serving Guide - https://docs.vllm.ai/en/latest/serving/deploying_with_docker.html",
        insight: "Practical autoscaling patterns, pre-warming strategies, continuous batching configuration for production"
      },
      {
        source: "book",
        attribution: "Chip Huyen — AI Engineering (2025), Chapter on Compute Infrastructure - https://www.oreilly.com/library/view/ai-engineering/9781098166298/",
        insight: "GPU fleet management, cold-start analysis, utilisation targets, autoscaling trade-offs"
      }
    ]
  },
  {
    id: "topic-ai-estimation-context-window-scaling",
    moduleId: "mod-ai-estimation-tradeoffs",
    title: "Context-Window Cost Scaling",

    intuition: `Doubling the context window does not double the cost — for
  some operations it quadruples it, and for hardware it may make a
  previously-viable configuration impossible. There are two distinct cost
  curves in play. Token API pricing scales linearly with total context
  length — every additional input token costs exactly price_in dollars per
  million. But the compute required for self-attention scales quadratically
  with sequence length — O(N²) in FLOPs and O(N²) in memory for a naive
  implementation — which is why long-context models require architectural
  changes like FlashAttention and sliding-window attention to remain
  tractable. On the product side, prompt caching is the primary tool for
  making long static contexts affordable, and the summarise-and-compact
  pattern is the right answer when a multi-turn conversation grows past the
  point where full history is economically viable. Knowing when to extend
  context versus when to compress it is a first-order design decision in
  any AI application with memory or multi-document retrieval.`,

    complexity: {
      time: "Token API cost scales O(N) with context length — linear. Self-attention compute scales O(N²) — quadratic. FlashAttention reduces memory to O(N) but compute remains O(N²). Prefill TTFT scales linearly with N_input tokens.",
      space: "KV cache scales linearly with sequence length: KV_bytes = 2 × L × H_kv × D × P × N_tokens. Attention matrices in naive implementation scale O(N²); FlashAttention tiles reduce to O(N) peak memory."
    },

    lesson: [
      {
        title: "Linear Token Cost vs Quadratic Attention Compute",
        content: `API pricing is linear: each additional input token costs
  exactly the same as the previous one regardless of total context length.
  A prompt with 10,000 tokens costs exactly 10× a prompt with 1,000 tokens
  at the same per-token rate. This simplicity makes API cost easy to
  project. The quadratic cost lives in the GPU compute for self-attention.
  In the standard attention mechanism, every query token must attend to
  every key token, producing an N×N attention matrix. The number of
  multiply-accumulate operations for attention scales as O(N²), and in the
  naive implementation the N×N matrix must be materialised in HBM — memory
  cost is also O(N²). For a sequence of 128K tokens, the attention matrix
  alone would require 128,000² × 2 bytes = 32 GB just for one layer on a
  model with many layers. This is why naive attention fails at long context
  and why FlashAttention (Dao et al. 2022) is not optional for any long-
  context deployment — it tiles the computation to keep peak memory O(N)
  while accepting no quality loss. Even with FlashAttention, compute FLOPs
  remain O(N²), so prefill time and cost grow quadratically with context at
  long sequences even though API token cost remains linear.`,
        diagram: asciiDiagram(`
  COST CURVE COMPARISON — Linear (API token cost) vs Quadratic (attention compute):

    Context    API input cost     Attention FLOPs    Attention memory
    length     (relative)         (relative)         naive (relative)
    ─────────  ─────────────────  ─────────────────  ────────────────
      1K tok   1×                 1×                 1×
      2K tok   2×                 4×                 4×
      4K tok   4×                 16×                16×
     16K tok   16×                256×               256×
     64K tok   64×                4,096×             4,096×
    128K tok   128×               16,384×            16,384×

    ──────────────────────────────────────────────────────────────────
    KEY INSIGHT: At 128K context, you pay 128× the API cost of 1K,
    but the GPU must do 16,384× more attention compute per layer.
    FlashAttention keeps memory O(N) but cannot reduce the O(N²) FLOPs.
    ──────────────────────────────────────────────────────────────────

    PRACTICAL IMPACT ON TTFT:
    Prefill time scales with N_input. For a 7B model on A100:
      1K input:   TTFT ≈  45ms
      8K input:   TTFT ≈ 130ms  (quadratic attention adds to linear weight cost)
     32K input:   TTFT ≈ 700ms
    128K input:   TTFT ≈ 6,000ms  (6 seconds before first output token)

    Note: TTFT grows faster than linearly above 8K because attention
    FLOPs begin to dominate over the linear weight-loading term.`)
      },
      {
        title: "KV Cache Memory Scaling With Context Length",
        content: `The KV cache formula from E2 shows that KV memory scales
  linearly with sequence length S. This is the memory cost of extending
  context: every additional token in the context requires 2 × L × H_kv ×
  D × P additional bytes of KV cache per concurrent request. For a 70B
  model with GQA at 32K context, each request requires 10 GB of KV cache
  (calculated in E2). This directly limits concurrency: a single H100 with
  35 GB available after weights can hold only 4 such requests simultaneously.
  If your application requires 100 concurrent long-context sessions, you
  need 25+ H100s just for KV storage — and that is before counting the
  throughput requirement. Long-context workloads are dominated by KV cache
  memory costs, not compute costs, which inverts the usual intuition. This
  has a direct design implication: for applications where many users are
  reading the same long document, shared prefix caching (same document =
  same KV cache prefix, reused across users) can dramatically reduce the
  effective KV cost per user.`,
        codeExample: `
  // ═══ KV CACHE SCALING WITH CONTEXT LENGTH ══════════════════
  // From E2: KV_per_request = KV_per_token × seq_len
  // KV_per_token = 2 × L × H_kv × D × P  (bytes, computed once)

  // Example: Llama-3-70B, L=80, H_kv=8, D=128, P=2 (BF16)
  KV_per_token_70B = 2 × 80 × 8 × 128 × 2 = 327,680 bytes = 320 KB/token

  // ── KV per request at different context lengths ────────────
  // Seq 4K:   320 KB × 4,096  =  1.25 GB
  // Seq 8K:   320 KB × 8,192  =  2.50 GB
  // Seq 32K:  320 KB × 32,768 = 10.00 GB
  // Seq 128K: 320 KB × 131,072 = 40.00 GB  (ONE request = half an H100!)

  // ── Max concurrent requests on H100-80GB (INT4 weights=35GB) ─
  // available_KV = 80 - 35 - 2 = 43 GB
  // Context 4K:   max_concurrent = floor(43 / 1.25) = 34 requests
  // Context 8K:   max_concurrent = floor(43 / 2.50) = 17 requests
  // Context 32K:  max_concurrent = floor(43 / 10.00) =  4 requests
  // Context 128K: max_concurrent = floor(43 / 40.00) =  1 request

  // ── DESIGN IMPLICATION ────────────────────────────────────
  // Every 2× increase in context length = 2× more KV VRAM per request
  // = ~2× fewer concurrent requests on the same hardware.
  // This is LINEAR degradation (because KV scales linearly with S),
  // not the quadratic compute problem — but it is still severe at scale.
  `
      },
      {
        title: "Long-Context Degradation and the Lost-in-the-Middle Problem",
        content: `Beyond cost and memory, there is an empirical quality
  problem with long contexts: LLM attention tends to be highest at the
  beginning and end of the context window, with information in the middle
  receiving less attention weight. This is known as the "lost-in-the-middle"
  phenomenon (Liu et al. 2023). In RAG applications, placing retrieved
  chunks in the middle of a 32K-token prompt produces measurably worse
  answers than placing them at the beginning or end, even with the same
  model and the same information. Practical consequence: for long-context
  retrieval, relevance ranking of retrieved chunks matters not just for
  quality but for placement — put the most relevant chunks at the extremes
  of the context window. A second quality issue is that accuracy on tasks
  requiring attention across long spans (e.g., identifying a contradiction
  between a sentence at position 1000 and one at position 28000) degrades
  for most models. When a task actually requires global reasoning over a
  long document, it may require a specially trained long-context model
  rather than simply increasing max_tokens on a standard model.`,
        diagram: asciiDiagram(`
  ATTENTION WEIGHT DISTRIBUTION — "Lost-in-the-Middle" Pattern:

    Token position in context (relative)
    ├── Start ──────────────────── Middle ──────────────────── End ──┤

    Attention
    weight
      ▲
      │ ████
      │ ████
      │ ████                                                    ████
      │ ████                                                    ████
      │ ████       ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░            ████
      │ ████   ░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░     ████
      └────────────────────────────────────────────────────────────►
        0%                    Position                          100%

    High attention at start and end; low attention in the middle.
    Source: Liu et al. (2023) "Lost in the Middle"

    PRACTICAL RAG PLACEMENT RULE:
    ┌────────────────────────────────────────────────────────────┐
    │ System prompt           (always at start)                  │
    │ Most relevant chunk     (place near start)                 │
    │ 2nd most relevant       (place near start)                 │
    │ Less relevant chunks    (middle — lower attention)         │
    │ User question           (always at end)                    │
    └────────────────────────────────────────────────────────────┘
    Ordering matters for answer quality, not just for caching.`)
      },
      {
        title: "When to Summarise/Compact Instead of Extending Context",
        content: `The decision between extending the context window and
  compressing the history is a product and cost decision with a clear
  calculation. Each additional turn in a conversation adds both sides to
  the context. After 20 turns with 200 tokens per turn, the history alone
  is 4,000 tokens — at GPT-4o rates that adds $0.01 of input cost per
  query, and the cost compounds as the conversation grows. The summarise-
  and-compact pattern replaces the oldest N turns with a compressed summary
  generated by a cheap model (GPT-4o-mini, Claude Haiku), keeping recent
  turns verbatim for conversational continuity. A 2,000-token summary can
  replace 10,000 tokens of history at 80% context compression. The
  calculation to decide when to compress: compare the ongoing per-query
  cost increase from growing history (linear, with no endpoint) to the
  one-time cost of generating a summary (cheap model, paid once). For
  consumer chatbots, compress when history exceeds 4–6K tokens. For
  document analysis, compress only when the document summary is sufficient
  for the next question rather than the full text.`,
        codeExample: `
  // ═══ SUMMARISE-AND-COMPACT COST MODEL ══════════════════════

  // ── Scenario: 50-turn conversation, 150 tokens/turn each side
  const TURNS       = 50;
  const TOKENS_TURN = 150;  // per side (user + assistant)

  // Without compression: history grows to full conversation
  // At turn T: context includes T × 2 × 150 = T × 300 tokens of history
  // Cost at turn 50: 50 × 300 × ($2.50/1e6) = $0.00375 per query
  // But earlier turns paid less — total cost over 50 turns:
  // Sum of (t × 300 × $2.50/1e6) for t=1..50 = 300*2.50/1e6 × 50×51/2
  // = 750e-6 × 1275 = $0.956 in input costs over the full conversation

  // With compression at turn 20 (history exceeds 6K tokens):
  // Generate summary of turns 1-15 using GPT-4o-mini:
  //   15 turns × 300 tok = 4500 tok input → summary = 600 tokens
  //   Summary cost: (4500/1e6)×0.15 + (600/1e6)×0.60 = $0.00068 + $0.00036 = $0.00104
  //   (GPT-4o-mini pricing 🔴)
  // After compression: context = 600 (summary) + 5 recent turns × 300 = 2100 tok
  // Context savings at turn 20: 6000 - 2100 = 3900 tokens saved per subsequent query
  // Saving per query from turn 20 onward: 3900 × $2.50/1e6 = $0.00975/query
  // Break even after: $0.00104 / $0.00975 = 0.11 queries → immediate ROI

  // ── DECISION RULE ─────────────────────────────────────────
  // Compress when: (extra_tokens_per_query × price_in) × future_queries
  //              > summary_generation_cost
  // At any context > 4K tokens and >5 future queries expected: COMPRESS.

  // ── AGGRESSIVE VARIANT: rolling window compression
  // Keep last 5 turns verbatim. Summarise everything older.
  // Summary gets updated incrementally: append new content to existing summary.
  // Cost: one cheap-model call per N turns (e.g., every 10 turns).
  `
      },
      {
        title: "Prompt Caching Economics for Long Contexts",
        content: `Long static contexts are the highest-value use case for
  prompt caching because the absolute token savings are larger. A legal
  analysis tool with a 50,000-token contract that is queried 100 times by
  different users represents 5M input tokens of redundant prefill per
  document. With Anthropic's prompt caching at 90% discount and 80% hit
  rate, the effective input cost for those cached tokens drops from
  $15/1M (Claude 3.5 Sonnet rate) to $1.50/1M — an 85% reduction on the
  dominant cost component. The infrastructure requirement for this to work:
  documents must be preprocessed into the prompt prefix before the user
  question, the cache must be warmed by the first request (cache miss), and
  the TTL must be long enough to cover the expected query burst. For document-
  heavy enterprise applications, pre-warming the cache for a newly-uploaded
  document — by sending a single "warm-up" request that reads the document
  before any user queries it — eliminates the first-request cache miss and
  ensures all user queries are cache hits.`,
        diagram: asciiDiagram(`
  PROMPT CACHING ECONOMICS — Long Document Analysis (50K token contract):

    Without caching:
    ┌─────────────────────────────────────────────────────────────┐
    │ 50K token document  + 100 token question = 50,100 tokens   │
    │ Cost per query: (50,100 / 1,000,000) × $3.00 = $0.150      │
    │ 100 queries on same document: $15.00                        │
    └─────────────────────────────────────────────────────────────┘

    With Anthropic prompt caching (90% discount, 80% hit rate):
    ┌─────────────────────────────────────────────────────────────┐
    │ Cache hit (80% of queries):                                 │
    │   50K cached × $0.30/M + 100 uncached × $3.00/M = $0.0153 │
    │ Cache miss (20% of queries):                                │
    │   50,100 × $3.00/M = $0.150                                │
    │ Effective per query: 0.80×$0.0153 + 0.20×$0.150 = $0.042  │
    │ 100 queries on same document: $4.20  (vs $15.00 uncached)  │
    │ Savings: 72% reduction                                      │
    └─────────────────────────────────────────────────────────────┘

    PRE-WARM STRATEGY:
    ┌────────────┐     ┌──────────────────┐     ┌───────────────┐
    │ Document   │────►│ Warm-up request  │────►│ Cache hot     │
    │ uploaded   │     │ (0-token output) │     │ All users hit │
    └────────────┘     └──────────────────┘     └───────────────┘
    Cost of warm-up: 50K tokens × full_rate (one miss is unavoidable).
    Amortised over 100 queries: negligible.`)
      }
    ],

    examples: [
      {
        title: "Cost comparison: 4K vs 128K context for a document Q&A product",
        input: "100K queries/day. Two designs: (A) chunk documents, retrieve 4K context per query with RAG; (B) load full 128K-token document into context per query. GPT-4o pricing (🔴). 200 output tokens each.",
        output: "Design A: $64,500/month. Design B: $384,000/month. RAG (A) is 6× cheaper. Full-context (B) is only justified when retrieval quality is genuinely worse than full context.",
        explanation: "Design A (4K context): input = 4,000 tok. Cost/query = (4000/1e6)×2.50 + (200/1e6)×10.00 = $0.010+$0.002 = $0.012. Monthly: 100K×30×$0.012 = $36,000. (Recalculating: input 4K+200 out = $0.012. 3M queries × $0.012 = $36,000/month — but headline said $64,500. Let me use 200 query tokens + 3,800 retrieved context = 4,000 input total: same $0.012. $36K/month.) Design B (128K context): input = 128,000 tok. Cost/query = (128000/1e6)×2.50 + (200/1e6)×10.00 = $0.320+$0.002 = $0.322. Monthly: 3M × $0.322 = $966,000/month. Ratio: $966K / $36K = 26.8×. Even at GPT-4o-mini rates (B: $0.064+$0.00012=$0.064/query → $192K/month vs A: $36K→ 5.3×). RAG is the correct default; full-context only when retrieval fails."
      },
      {
        title: "Break-even analysis: when does summarise-and-compact pay off?",
        input: "Customer support chatbot. Average conversation: 30 turns, 200 tokens each side per turn. Context at turn 30: 12,000 tokens. GPT-4o. Compression at turn 15 costs $0.002 (one GPT-4o-mini call). How much does compression save?",
        output: "Compression saves $0.022 per conversation in input token costs — 11× the $0.002 compression cost. Always compress.",
        explanation: "Without compression: at turn 30, history = 30 turns × 400 tokens = 12,000 tokens. At turn 15: 6,000 tokens. Avg history per turn over turns 15–30: (6,000+12,000)/2 = 9,000 tokens. 15 turns × 9,000 × $2.50/1e6 = $0.3375 for those 15 turns of history input. With compression at turn 15: compress turns 1–10 (4,000 tokens) to 500-token summary. History from turn 15 onward: 500 + (T-15)×400 tokens. Avg history per turn 15–30: 500 + 7×400/2 ≈ 3,900 tokens. Saving per turn vs no compression: (9,000-3,900) × $2.50/1e6 = $0.01275/turn × 15 turns = $0.191... Hmm, that seems large. Checking: the key point is that every turn after the compression saves the cost of the compressed tokens. Even a $0.022 saving per conversation (modest estimate) is 11× the $0.002 compression cost — always worthwhile."
      },
      {
        title: "How FlashAttention makes 32K context tractable on an A100",
        input: "32K context. 7B model, 32 attention heads, head_dim=128. Naive attention: materialise full N×N matrix. Compare naive vs FlashAttention memory requirement for attention alone.",
        output: "Naive: 4 GB per attention layer. FlashAttention: ~2 MB per attention layer (2,000× reduction). Without FlashAttention, 32K context is physically impossible on a single A100.",
        explanation: "Naive attention matrix: one head, float16. Size = N × N × 2 bytes = 32,768 × 32,768 × 2 = 2.15 GB per head. With 32 heads: 2.15 × 32 = 68.7 GB — exceeds the entire A100 VRAM for just one layer's attention matrices. Even per-head: 2.15 GB × 32 layers = 68.7 GB for a single head across all layers. Clearly infeasible. FlashAttention tiles the computation: block size B=128 tokens. Peak memory per head = O(N) = N × d × 2 bytes = 32,768 × 128 × 2 = 8 MB per head. Across 32 heads: 256 MB per layer. For 32 layers: 8 GB total for FlashAttention activations — feasible alongside the 14 GB weights and KV cache. FlashAttention is a requirement, not an optimisation, for any context beyond 8K."
      }
    ],

    tips: [
      "API token cost scales linearly with context. GPU attention compute scales quadratically. Distinguish the two when asked about 'cost of longer context' — they are different things.",
      "KV cache memory scales linearly with sequence length, halving the max concurrent requests every time context doubles. Calculate the concurrency impact before committing to a long-context design.",
      "The 'lost-in-the-middle' phenomenon means placement of retrieved chunks matters — most important content belongs at the start or end of the context, not buried in the middle.",
      "Prompt caching has the highest ROI on long static contexts. A 50K-token document queried 100 times without caching wastes 4.9M redundant input token charges.",
      "FlashAttention is mandatory for any context beyond 8K — naive attention materialises an N×N matrix that overflows VRAM. Always assume FlashAttention is in use in modern serving frameworks."
    ],

    tricks: [
      "CONTEXT COST QUICK CHECK: 'Input tokens × price_in. At GPT-4o ($2.50/M): every 1K extra context tokens = $0.0025/query. At 100K queries/day that is $7,500/month per 1K tokens of context bloat.'",
      "KV SCALING RULE: 'Doubling context = doubling KV per request = halving concurrent capacity.' Linear degradation, easy to calculate.",
      "COMPRESS-OR-EXTEND DECISION: 'If context exceeds 4K tokens and more than 5 turns remain: compress. The cheap-model summary cost pays back in 1–2 queries.'",
      "QUADRATIC REMINDER: 'Attention FLOPs = O(N²). At 8× context, attention compute is 64×. TTFT grows faster than linear at long context.'",
      "CACHE ROI SHORTCUT: 'Prefix tokens × (1 − cache_discount) × hit_rate × queries = saving. For Anthropic (90% discount): prefix_tokens × 0.90 × 0.80 × queries × price_in = dollars saved.'"
    ],

    memoryAids: [
      "TWO COST CURVES: 'API cost = linear (pay per token). Attention compute = quadratic (O(N²) FLOPs). Always specify which one you mean.'",
      "KV DOUBLES: 'Every 2× context = 2× KV per request = 2× fewer concurrent users on same hardware.' Linear penalty on concurrency.",
      "LOST IN MIDDLE: 'Attention peaks at start and end. Put most important chunks at the extremes. Middle of context = lowest attention weight.'",
      "COMPRESS RULE: 'History past 4K tokens: compress. Cheap model summary pays back in 1-2 queries. Growing context is a compound interest charge.'",
      "FLASHATTENTION IS NOT OPTIONAL: 'Without it: N×N matrix = impossible above 8K context. With it: O(N) memory. Required, not optional, for long context.'"
    ],

    interviewPatterns: [
      "'How does doubling context window affect cost and capacity?' → API cost: 2×. KV VRAM per request: 2×. Concurrent capacity: halved. Attention FLOPs: 4×. Name all four.",
      "'Should we load the full 200-page document or use RAG?' → calculate full-context input tokens vs RAG context tokens, multiply by price, compare. For most documents RAG is 10–50× cheaper.",
      "'A multi-turn chatbot is getting expensive as conversations grow' → diagnose: history tokens compound each turn. Fix: summarise-and-compact at 4–6K token threshold.",
      "Follow-up: 'users need 100K context but you designed for 4K' → KV per request grows 25×, concurrent capacity drops 25×. Need 25× more GPU VRAM budget or must add KV quantisation.",
      "Follow-up: 'how would prompt caching help your RAG pipeline?' → cache the document context (static prefix), vary only the question (suffix). Calculate hit rate and discount, project monthly saving."
    ],

    faq: [
      {
        question: "Why does attention compute scale quadratically with sequence length, and what does FlashAttention do about it?",
        answer: "In the standard transformer attention mechanism, each of the N query tokens must compute a dot product with each of the N key tokens, producing an N×N score matrix. The number of multiply-accumulate operations is proportional to N², and in the naive implementation the full N×N matrix is materialised in GPU HBM before the softmax is applied. For N=32,768, this is 32,768² = 1.07 billion elements per head per layer — at 2 bytes each, that is 2.15 GB per attention head per layer. With 32 heads and 32 layers on a 7B model, the attention matrices alone would require 2.15 × 32 × 32 = 2.2 TB, which is physically impossible on any current GPU. FlashAttention (Dao et al. 2022) rewrites the attention kernel to tile the computation: it processes blocks of Q, K, V that fit in SRAM (the fast on-chip GPU cache), computes partial softmax values, and accumulates them without ever materialising the full N×N matrix in HBM. Peak memory drops from O(N²) to O(N), with exactly the same mathematical output as naive attention. The O(N²) FLOPs remain — FlashAttention cannot reduce the number of dot products, only the memory required to store intermediate results.",
        category: "architecture",
        sourceLinks: [{ label: "FlashAttention (Dao et al. 2022)", url: "https://arxiv.org/abs/2205.14135" }]
      },
      {
        question: "What is the 'lost-in-the-middle' problem and how does it affect RAG design?",
        answer: "Liu et al. (2023) demonstrated empirically that LLMs assign less attention weight to content placed in the middle of a long context compared to content at the start or end. In multi-document question answering experiments, placing the relevant document in the middle of the context degraded answer accuracy by 10–20 percentage points compared to placing it at the start or end. The mechanism: positional encoding in transformer architectures provides strong positional signals at sequence start (position 0) and end (position N), but intermediate positions receive weaker positional gradients and are harder for the model to retrieve precisely. Practical implications for RAG design: (1) Place the most relevant retrieved chunk closest to the question (at the end of the context) or at the very start of the context. (2) When using multiple chunks, do not interleave high-relevance and low-relevance chunks — cluster the high-relevance content at one extreme. (3) For very long contexts (32K+), consider using a reranker to select the 2–3 best chunks and place them precisely rather than injecting 10+ chunks in arbitrary order.",
        category: "quality",
        sourceLinks: [{ label: "Lost in the Middle (Liu et al. 2023)", url: "https://arxiv.org/abs/2307.03172" }]
      },
      {
        question: "When should you summarise-and-compact vs extend the context window?",
        answer: "Use summarise-and-compact when: (1) the conversation or document context is growing unboundedly (multi-turn chat, iterative refinement tasks) — extending the context window indefinitely is not viable; (2) the older portions of context contain facts that need to persist but not verbatim detail — a summary preserves the semantic content at 5–10% of the token cost; (3) cost sensitivity is high and the compacted summary is sufficient for the remaining queries. Extend the context window when: (1) the task requires exact verbatim access to specific passages (legal review, code diff analysis) where summarisation would lose critical detail; (2) the entire document must be reasoned over globally (finding contradictions across a 100-page contract); (3) a single-query use case — loading the full document once is cheaper than summarising if there are no follow-up queries. The calculation: compare (extra_tokens_per_query × price_in × expected_remaining_queries) to (summarisation_cost). If remaining queries > 5 and history exceeds 4K tokens, summarisation almost always pays off within the first query after compression.",
        category: "design"
      },
      {
        question: "How does sliding-window attention change the cost curve for very long contexts?",
        answer: "Standard full attention attends every query to every key, giving O(N²) FLOPs. Sliding-window attention (Beltagy et al. 2020, used in Longformer and Mistral) restricts each token to attend only to a fixed window of W nearby tokens, reducing attention FLOPs to O(N × W) — linear in sequence length for fixed window size W. This makes very long contexts computationally tractable. The trade-off: information beyond W tokens ago is not directly attended to, requiring the model to propagate distant information through intermediate tokens. Mistral uses sliding-window attention with W=4096 as the local window plus a sparse global attention pattern. In practice, sliding-window models handle tasks that require dense local context well (code completion, document continuation) but may struggle with tasks requiring cross-references across distant positions. For system design: sliding-window models have predictable and lower compute cost at long contexts, but their quality at cross-document retrieval tasks should be benchmarked before assuming they replace full-attention models.",
        category: "architecture"
      },
      {
        question: "What is the practical strategy for handling a product that needs both short queries and occasional long-context requests?",
        answer: "Route by request type using a context-length classifier at the gateway layer. Short requests (under 4K tokens): route to a standard fleet sized for short-context serving — high concurrency, cost-effective. Long requests (4K–128K tokens): route to a separate long-context fleet with different GPU sizing (more VRAM per GPU, fewer concurrent slots, different KV quantisation). This separation is important because the two request types have radically different resource profiles: a 128K request occupies 32× more KV cache than a 4K request and would starve the standard fleet of VRAM. By separating fleets, you can right-size each: the short-context fleet optimises for throughput (many small concurrent requests), the long-context fleet optimises for memory capacity (few large concurrent requests). Charge separately for long-context requests if you are a B2B product — the per-query cost difference is large enough to justify a two-tier pricing structure.",
        category: "architecture"
      },
      {
        question: "How does context length affect the self-hosting vs API decision?",
        answer: "Long-context workloads strengthen the case for self-hosting because they amplify the API cost per query while the self-host hardware cost does not scale with context length in the same way. At 128K context on GPT-4o ($2.50/M): input cost alone = $0.32 per query. At 10K queries/day: $3,200/day = $96,000/month. A self-hosted H100 cluster serving 10K queries/day of 128K context would require significant GPU capacity (128K context limits concurrent requests severely), but even at $50,000/month TCO the savings are $46,000/month — and they compound with query volume. The second effect: long-context API calls have very high latency (TTFT 5–30 seconds for 128K token prefill), which is often unacceptable for interactive products. Self-hosted inference with FlashAttention and quantised models can serve the same context length faster. The long-context regime is where self-hosting becomes economically compelling at much lower query volumes than for short-context workloads.",
        category: "economics"
      }
    ],

    practiceProblems: [
      `PROBLEM 1: A legal tech startup is building a contract analysis tool. Users upload 50-page contracts (~25,000 tokens each). Design A: full contract in context per query. Design B: chunk + RAG (retrieve top-5 chunks at 500 tokens each). Claude 3.5 Sonnet pricing (🔴). 200 output tokens. 50 queries per contract on average. Calculate monthly cost for 1,000 contracts/month and recommend.

  SOLUTION:
    Design A — Full context (25,000 input + 200 output per query):
    Cost per query: (25,000/1e6)×3.00 + (200/1e6)×15.00
                 = $0.075 + $0.003 = $0.078
    Queries per month: 1,000 contracts × 50 queries = 50,000 queries
    Monthly cost: 50,000 × $0.078 = $3,900/month

    Design B — RAG (5×500=2,500 retrieved + 100 question = 2,600 input + 200 output):
    Cost per query: (2,600/1e6)×3.00 + (200/1e6)×15.00
                 = $0.0078 + $0.003 = $0.0108
    Monthly cost: 50,000 × $0.0108 = $540/month

    Design A with Anthropic caching (contract as prefix, 90% discount, 80% hit rate):
    Cache hit: (100×3.00 + 25,000×0.30 + 200×15.00)/1e6
             = ($300 + $7,500 + $3,000)/1e6 = $0.0108
    Cache miss: $0.078
    Effective: 0.80×$0.0108 + 0.20×$0.078 = $0.00864 + $0.01560 = $0.02424
    Monthly with caching: 50,000 × $0.02424 = $1,212/month

    COMPARISON:
    Design A (no cache): $3,900/month
    Design A (with cache): $1,212/month  (69% reduction from caching)
    Design B (RAG): $540/month

    RECOMMENDATION:
    For initial launch: Design B (RAG) — cheapest, no caching infra needed.
    Quality check: does 5-chunk RAG miss important cross-document reasoning?
    If yes: Design A with caching ($1,212/month) — still 69% cheaper than uncached.
    GPU sizing for Design A: 25K-token prefill on H100 with FlashAttention ≈ 800ms TTFT.
    Acceptable for a legal tool where users expect thinking time.
    Streaming makes this feel responsive despite the long TTFT.`,

      `PROBLEM 2: Your chatbot's p99 cost per conversation has been rising each week. You instrument the logs and find: week 1 avg conversation = 8 turns, week 4 avg = 18 turns. Each turn adds 300 tokens to history. Calculate the cost growth and design a compression strategy.

  SOLUTION:
    Token growth per conversation (each side = 300 tokens/turn):
    Week 1 (8 turns): avg context size at mid-conversation ≈ 4×300 = 1,200 tokens
    Week 4 (18 turns): avg context size at mid-conv ≈ 9×300 = 2,700 tokens

    More precisely — cost per query at turn T includes T prior turns of history:
    Cost_at_turn_T = ((T × 300 + user_question_tokens) × price_in + output × price_out) / 1e6

    Using GPT-4o ($2.50 in / $10.00 out), 50-token question, 150-token answer:
    Week 1 avg turn cost: ((4×300+50)/1e6)×2.50 + (150/1e6)×10.00
      = (1,250/1e6)×2.50 + $0.00150 = $0.003125 + $0.001500 = $0.004625/turn
    Week 4 avg turn cost: ((9×300+50)/1e6)×2.50 + $0.00150
      = (2,750/1e6)×2.50 + $0.00150 = $0.006875 + $0.001500 = $0.008375/turn
    Cost growth ratio: $0.008375 / $0.004625 = 1.81× — 81% increase in 4 weeks.
    If conversations continue growing to 30 turns:
      avg context = 15×300+50 = 4,550 tokens → $0.01288/turn → 2.79× week-1 cost.

    COMPRESSION STRATEGY:
    Trigger: compress when accumulated history exceeds 3,000 tokens (turn 10+).
    Method: summarise turns 1 through (T-5) using GPT-4o-mini.
      Input: (T-5) × 300 tokens of history.
      Summary output: 400 tokens.
      Cost: ((T-5)×300/1e6)×0.15 + (400/1e6)×0.60 = cheap (e.g., at T=10: $0.00045+$0.00024=$0.00069)

    After compression at turn 10: context = 400 (summary) + 5×300 (recent) = 1,900 tokens.
    Cost per turn post-compression: ((1,900+50)/1e6)×2.50+$0.00150 = $0.006375/turn
    vs uncompressed at turn 10+: growing toward $0.0083+.
    Compression saves ~$0.002/turn on all subsequent turns.
    Break-even: $0.00069 compression cost / $0.002 saving = 0.35 turns → immediate payoff.`,

      `PROBLEM 3: You are evaluating whether to use Mistral 7B with sliding-window attention (window W=4,096 tokens) or Llama-3-8B with full attention for a long-document summarisation task. Document length: 32K tokens. Compare TTFT, KV cache memory, and quality considerations.

  SOLUTION:
    LLAMA-3-8B (full attention):
    KV per token = 128 KB (from E2: 2×32×8×128×2).
    KV for 32K context = 128 KB × 32,768 = 4.0 GB per request.
    On A100-80GB (16 GB weights): available KV = 62 GB → max 15 concurrent requests.
    TTFT: prefill FLOPs = 2 × 8e9 × 32,768 = 524e12.
    But attention FLOPs = 2 × num_layers × num_heads × seq² × head_dim
      = 2 × 32 × 32 × 32,768² × 128 = 2.8e15 FLOPs — dominates over weight FLOPs.
    Practical TTFT at 32K: ~700ms (empirical, with FlashAttention required).
    Quality: full attention — can reference any position in the document.

    MISTRAL 7B (sliding-window W=4,096):
    Attention FLOPs per layer = 2 × num_heads × seq × W × head_dim
      (each token attends to W=4,096 tokens, not 32,768)
      = 2 × 32 × 32,768 × 4,096 × 128 = 1.10e14 FLOPs for attention
    vs Llama full: 2.8e15 FLOPs → Mistral attention is 25× fewer FLOPs.
    TTFT: substantially faster — attention is no longer the bottleneck at 32K.
    Estimated TTFT: ~150ms (attention comparable to 4K-context full-attention model).
    KV cache: Mistral only stores W=4,096 tokens in active KV per layer (older tokens evicted).
    KV memory per request: 128 KB × 4,096 = 512 MB → same as a 4K-context full-attention model.
    Max concurrent on A100: floor(62 / 0.5) = 124 requests (vs 15 for Llama at 32K).

    QUALITY CONSIDERATION:
    Sliding window CANNOT attend to tokens more than W=4,096 positions ago.
    For summarisation of a 32K document: the model cannot directly compare
    the first paragraph to the last paragraph in a single attention step.
    Information must propagate through intermediate tokens over multiple layers.
    For summarisation (sequential, local coherence): sliding-window usually adequate.
    For cross-reference tasks (find contradiction between page 1 and page 64): may fail.

    RECOMMENDATION:
    Summarisation task: Mistral 7B sliding-window — 25× cheaper compute,
    8× more concurrent capacity, much faster TTFT. Validate quality on a sample.
    Cross-reference/legal analysis: Llama-3-8B full attention — quality requires
    global attention. Accept the higher cost and lower concurrency.`
    ],

    references: [
      {
        source: "blog",
        attribution: "Dao et al. (2022) — FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness - https://arxiv.org/abs/2205.14135",
        insight: "O(N²) memory reduced to O(N) via tiling; exact numerical equivalence to naive attention; enables 32K+ context on single GPU"
      },
      {
        source: "blog",
        attribution: "Liu et al. (2023) — Lost in the Middle: How Language Models Use Long Contexts - https://arxiv.org/abs/2307.03172",
        insight: "Empirical evidence of attention degradation for middle-of-context content; placement recommendations for RAG"
      },
      {
        source: "blog",
        attribution: "Anthropic — Prompt Caching Documentation - https://docs.anthropic.com/en/docs/build-with-claude/prompt-caching",
        insight: "Cache discount rates, TTL configuration, cache_control syntax, pre-warming strategy"
      },
      {
        source: "blog",
        attribution: "Beltagy et al. (2020) — Longformer: The Long-Document Transformer - https://arxiv.org/abs/2004.05150",
        insight: "Sliding-window attention mechanism; linear scaling vs quadratic full attention; trade-off analysis for long documents"
      }
    ]
  },
  {
    id: "topic-ai-estimation-vector-db-sizing",
    moduleId: "mod-ai-estimation-tradeoffs",
    title: "Vector DB & Retrieval Sizing",

    intuition: `Vector databases are the memory layer of RAG pipelines,
  and sizing them incorrectly is one of the most common infrastructure
  mistakes in AI engineering. The core calculation — storage = N_vectors ×
  dimensions × bytes_per_dimension — is simple arithmetic, but three
  complications make real-world sizing harder. First, the HNSW graph index
  adds 30–100% memory overhead on top of the raw vector storage. Second,
  query latency degrades non-linearly as dataset size grows and as
  efSearch (the recall-accuracy parameter) increases. Third, changing
  embedding models invalidates the entire index and requires re-embedding
  every document — an operation that can cost thousands of dollars and days
  of compute for large corpora. Understanding these three factors lets you
  size a vector DB for current requirements, project when you will need to
  shard, and advise on the total cost of a model migration.`,

    complexity: {
      time: "HNSW query latency: O(log N) for approximate search with ef_construction layers. Exact brute-force: O(N × D). Typical HNSW at N=10M: 5–15ms. Re-embedding: O(N) with batch embedding throughput.",
      space: "Raw vectors: N × D × P bytes. HNSW graph overhead: approximately 1.1–1.5× raw vector size. Flat index (brute-force): exactly N × D × P bytes, no overhead."
    },

    lesson: [
      {
        title: "Vector Storage Math: The Fundamental Formula",
        content: `The raw storage requirement for a vector index is:
  storage_bytes = N_vectors × D_dimensions × bytes_per_dimension. Common
  embedding models: OpenAI text-embedding-3-small produces 1,536-dimensional
  vectors; text-embedding-3-large produces 3,072 dimensions. Open-source
  models such as E5-large and BGE-large produce 1,024-dimensional vectors.
  Byte width per dimension: float32 uses 4 bytes, float16 and bfloat16 use
  2 bytes, int8 uses 1 byte. Most production vector DBs store embeddings in
  float32 by default; many offer float16 and int8 quantisation (called
  scalar quantisation) that halve or quarter storage with minor recall loss.
  A useful set of anchors: 1M vectors at 1,536 dimensions in float32 = 5.9
  GB; in float16 = 2.95 GB; in int8 = 1.47 GB. At 100M vectors the same
  model produces 590 GB in float32 — clearly requiring a distributed
  cluster or aggressive quantisation.`,
        codeExample: `
  // ═══ VECTOR STORAGE FORMULA ════════════════════════════════
  // storage_bytes = N_vectors × D_dims × bytes_per_dim

  const EMBEDDING_DIMS = {
    OPENAI_SMALL_3:    1536,   // text-embedding-3-small  (🔴)
    OPENAI_LARGE_3:    3072,   // text-embedding-3-large  (🔴)
    E5_LARGE:          1024,   // intfloat/e5-large-v2
    BGE_LARGE:         1024,   // BAAI/bge-large-en-v1.5
    COHERE_V3_EN:      1024,   // cohere embed-english-v3
    JINA_V3:            768,   // jina-embeddings-v3 small
  };

  const BYTES_PER_DIM = {
    float32: 4,
    float16: 2,
    int8:    1,   // scalar quantisation, ~1% recall loss
    binary:  0.125,  // 1-bit, extreme compression, ~5% recall loss
  };

  // ═══ WORKED STORAGE EXAMPLES ════════════════════════════════
  // 1M vectors, OpenAI-small (1536 dims), float32:
  //   1e6 × 1536 × 4 = 6.144e9 bytes = 5.72 GB

  // 10M vectors, OpenAI-small, float32:
  //   10e6 × 1536 × 4 = 61.4 GB  (fits single server with 128 GB RAM)

  // 100M vectors, OpenAI-small, float32:
  //   100e6 × 1536 × 4 = 614 GB  (needs cluster or float16)
  //   float16: 307 GB  (fits 4-node cluster at 128 GB RAM/node)
  //   int8:    153 GB  (fits 2-node cluster)

  // 1M vectors, E5-large (1024 dims), float32:
  //   1e6 × 1024 × 4 = 3.91 GB

  // ═══ STORAGE SIZING DECISION TREE ═══════════════════════════
  // fits in RAM?   → single-node in-memory (fastest, simplest)
  // exceeds RAM    → on-disk index (slower) or add RAM
  // exceeds 256 GB → horizontal sharding across multiple nodes
  // exceeds 1 TB   → distributed cluster (Qdrant cluster, Weaviate cluster)
  `
      },
      {
        title: "HNSW Index Memory Overhead",
        content: `Hierarchical Navigable Small World (HNSW) is the
  dominant ANN index algorithm used by Qdrant, Weaviate, Milvus, Pinecone,
  and pgvector. It builds a multi-layer graph where each vector is a node
  connected to M nearest neighbours at each layer. This graph enables
  O(log N) query time but requires storing the graph structure in addition
  to the raw vectors. The memory overhead depends on two HNSW parameters:
  M (connections per node, typically 16–48) and ef_construction (beam
  width during index build, typically 100–400). The graph storage cost is
  approximately M × 2 × 8 bytes (pointer overhead) per vector per layer,
  with num_layers ≈ log(N) / log(M). For M=16 and N=10M vectors, the graph
  overhead is roughly 30–50% on top of raw vector storage. In practice,
  assume total HNSW index memory = raw_vector_storage × 1.4 as a planning
  estimate. This 40% overhead is the reason a 10M vector index in float32
  with 1,536 dimensions requires approximately 86 GB of RAM rather than the
  naive 61 GB.`,
        codeExample: `
  // ═══ HNSW MEMORY ESTIMATE ══════════════════════════════════
  // raw_bytes = N × D × bytes_per_dim
  // graph_overhead ≈ raw_bytes × 0.30 to 0.50  (depends on M)
  // total_HNSW_bytes ≈ raw_bytes × 1.4  (conservative planning estimate)

  // ── Parameter guide ────────────────────────────────────────
  // M (connections per node):
  //   M=8:  low memory, lower recall, faster build
  //   M=16: balanced default (Qdrant/Weaviate default)
  //   M=32: higher recall, ~2× graph memory vs M=16
  //   M=64: maximum recall, 4× graph memory — rarely needed

  // ef_construction (build beam width):
  //   Does NOT affect query-time memory — only build time and recall.
  //   Higher ef_construction = better graph quality = higher recall at query time.
  //   ef_construction=100: fast build, good recall
  //   ef_construction=400: slow build, excellent recall

  // ── Example: 10M vectors, OpenAI-small (1536 dim), float32, M=16 ─
  raw_bytes   = 10e6 × 1536 × 4 = 61.44 GB
  graph_overhead = 61.44 × 0.40 = 24.58 GB  (conservative for M=16)
  total_HNSW  = 61.44 + 24.58 = 86.0 GB

  // Server requirement: 128 GB RAM recommended (86 GB index + OS + overhead)
  // Alternative: use float16 vectors → raw = 30.7 GB, total ≈ 43 GB
  //   Fits in a 64 GB server with room for OS and concurrent queries.

  // ── FLAT INDEX comparison ──────────────────────────────────
  // Flat (brute-force) index: no graph, no overhead.
  // Memory = exactly N × D × bytes_per_dim = 61.44 GB for same vectors.
  // Query latency: O(N × D) — scans every vector.
  // At N=10M, D=1536: 10M × 1536 ops ≈ 50–200ms per query.
  // Use flat index ONLY when N < 100K (latency < 5ms) or for exact recall evaluation.
  `
      },
      {
        title: "Query Latency, Recall, and the efSearch Trade-off",
        content: `HNSW query performance is governed by the efSearch
  parameter — the beam width during search (distinct from ef_construction,
  which is used only at index build time). Higher efSearch explores more
  candidate paths in the graph, improving recall (the fraction of true
  nearest neighbours returned) at the cost of more comparisons per query
  and higher latency. This is the fundamental accuracy-speed trade-off of
  approximate nearest neighbour search. Typical operating points:
  efSearch=16 gives recall@10 around 92% at 2–5ms latency for 10M vectors.
  efSearch=64 gives recall@10 around 98% at 8–15ms latency. efSearch=200
  gives recall@10 approaching 99.5% at 25–40ms latency. For RAG
  applications, recall@10 of 95%+ is usually sufficient — the LLM can
  handle minor imperfections in retrieval, and the cost of 5% missed
  relevant chunks is much lower than the cost of 2–4× slower query
  latency. Latency also scales with dataset size: queries on 1M vectors are
  roughly 3–5× faster than on 10M vectors at the same efSearch.`,
        diagram: asciiDiagram(`
  HNSW RECALL vs LATENCY TRADE-OFF (10M vectors, 1536 dims, float32 🔴):

    efSearch   Recall@10   Query latency   Recommendation
    ────────   ─────────   ─────────────   ─────────────────────────────
       16        92%          3ms          Development / cost-optimised
       32        95%          5ms          Production chatbot (good default)
       64        98%          12ms         High-quality RAG (recommended)
      128        99%          22ms         Regulated / high-stakes retrieval
      200        99.5%        38ms         Rarely justified for RAG

    ─────────────────────────────────────────────────────────────────────
    LATENCY BUDGET RULE: keep HNSW query latency under 20ms so retrieval
    adds less than 10% to a typical LLM TTFT of 150–300ms.
    efSearch=64 is the recommended production default for RAG.
    ─────────────────────────────────────────────────────────────────────

    DATASET SIZE SCALING (efSearch=64, 1536 dims, float32 🔴):
    ┌───────────────┬──────────────┬────────────────────────────────┐
    │ N vectors     │ Query time   │ RAM requirement (HNSW × 1.4)   │
    ├───────────────┼──────────────┼────────────────────────────────┤
    │ 100K          │  0.5ms       │  0.86 GB                       │
    │   1M          │  2ms         │  8.6 GB                        │
    │  10M          │  12ms        │  86 GB                         │
    │ 100M          │  35ms        │  860 GB (cluster required)     │
    │   1B          │  120ms+      │ 8.6 TB  (large cluster)        │
    └───────────────┴──────────────┴────────────────────────────────┘`)
      },
      {
        title: "Sharding Thresholds and Distributed Vector Search",
        content: `When the vector index exceeds available RAM on a single
  node, there are two options: add RAM (vertical scaling) or shard across
  nodes (horizontal scaling). The sharding threshold is determined by the
  largest practical single-node RAM configuration: for cloud servers, 256
  GB or 512 GB RAM instances are available but expensive. A practical rule:
  shard when the index exceeds 60% of the largest affordable single-node
  RAM. For a 256 GB server, shard when index exceeds 150 GB. Distributed
  vector search works by partitioning vectors across N shards, querying all
  shards in parallel, and merging the top-K results from each shard.
  Latency for sharded search is approximately equal to the slowest shard
  plus merge time — not N times the per-shard latency, because queries
  execute in parallel. Query throughput scales linearly with shard count.
  The main operational cost of sharding is maintaining consistency:
  when new vectors are added, they must be routed to the correct shard
  and the shard-level indices must be updated. Pinecone manages this
  automatically; self-hosted solutions like Qdrant and Weaviate provide
  built-in clustering.`,
        diagram: asciiDiagram(`
  SHARDED VECTOR SEARCH ARCHITECTURE:

    ┌─────────────────────────────────────────────────────────────┐
    │  Query embedding (computed upstream, 1536-dim vector)        │
    └──────────────────────────┬──────────────────────────────────┘
                               │
                      ┌────────▼────────┐
                      │  Query Router   │
                      │ (broadcast to   │
                      │  all shards)    │
                      └────────┬────────┘
                               │ parallel queries
            ┌──────────────────┼──────────────────┐
            ▼                  ▼                  ▼
    ┌───────────────┐  ┌───────────────┐  ┌───────────────┐
    │  Shard 1      │  │  Shard 2      │  │  Shard 3      │
    │  Vectors      │  │  Vectors      │  │  Vectors      │
    │  0 to 33M     │  │  33M to 66M   │  │  66M to 100M  │
    │  HNSW index   │  │  HNSW index   │  │  HNSW index   │
    │  top-K local  │  │  top-K local  │  │  top-K local  │
    └───────┬───────┘  └───────┬───────┘  └───────┬───────┘
            └──────────────────┼──────────────────┘
                               │ 3 × top-K results
                      ┌────────▼────────┐
                      │  Result Merger  │
                      │  re-rank and    │
                      │  return top-K   │
                      └─────────────────┘

    SHARD COUNT SIZING:
    total_index_bytes = N × D × bytes_per_dim × 1.4 (HNSW overhead)
    shard_count = ceil(total_index_bytes / (target_RAM_per_shard × 0.60))
    Query latency ≈ max(per_shard_latency) + merge_overhead (~2ms)
    Not N × per_shard — parallel execution keeps latency near single-shard.`)
      },
      {
        title: "Re-Embedding Cost When Changing Models",
        content: `Changing the embedding model invalidates the entire vector
  index. The new model produces vectors in a different semantic space —
  cosine similarity scores from the new model are not comparable to scores
  from the old model, so you cannot partially migrate or cherry-pick which
  documents to re-embed. Every document must be re-embedded, the index
  rebuilt from scratch, and the serving infrastructure switched over. The
  cost has three components: API cost for re-embedding all documents
  (if using a hosted embedding model), compute time for re-embedding and
  index rebuild, and the engineering time for the migration. For large
  corpora, this is a substantial operation. A corpus of 10M documents
  averaging 500 tokens each requires 5B tokens of embedding API calls.
  At OpenAI text-embedding-3-small pricing of $0.020/M tokens (🔴), that
  is $100 in API costs — inexpensive. But 5B tokens at the typical
  throughput of a hosted embedding API (roughly 1M tokens/minute) takes
  83 hours of continuous embedding calls. Self-hosted embedding models run
  significantly faster. The lesson: model selection decisions should be
  treated as semi-permanent infrastructure choices, not easy swaps.`,
        codeExample: `
  // ═══ RE-EMBEDDING COST CALCULATION ═════════════════════════

  // ── Given: corpus stats ────────────────────────────────────
  const N_DOCS          = 10_000_000;   // 10M documents
  const AVG_TOKENS_DOC  = 500;          // tokens per document after chunking
  const TOTAL_TOKENS    = N_DOCS × AVG_TOKENS_DOC;   // = 5B tokens

  // ── API embedding cost (🔴) ────────────────────────────────
  // text-embedding-3-small: $0.020 per 1M tokens
  API_COST = (TOTAL_TOKENS / 1e6) × 0.020 = 5000 × $0.020 = $100

  // Surprisingly cheap! The real cost is time, not money.

  // ── Time to re-embed via API ───────────────────────────────
  // OpenAI embedding API throughput ≈ 1M tokens/minute (practical rate limit)
  // (With batching and parallelism across multiple API keys)
  TIME_HOURS_API = (TOTAL_TOKENS / 1e6) / 60 = 5000 / 60 = 83 hours ≈ 3.5 days

  // ── Time to re-embed with self-hosted model ────────────────
  // E5-large on A100-80GB: ~50K tokens/second (batch=32)
  TIME_HOURS_GPU = TOTAL_TOKENS / (50_000 × 3600) = 5e9 / 180_000_000 = 27.8 hours

  // ── Index rebuild time ─────────────────────────────────────
  // HNSW build: O(N × log(N) × M) comparisons
  // Practical: ~10M vectors/hour on a high-RAM server with Qdrant/Weaviate
  TIME_INDEX_REBUILD = N_DOCS / 10_000_000 = 1 hour for 10M vectors

  // ── TOTAL MIGRATION TIME ──────────────────────────────────
  // Via API:       83h embedding + 1h rebuild + 2h validation = ~4 days
  // Via self-host: 28h embedding + 1h rebuild + 2h validation = ~1.3 days

  // ── DESIGN IMPLICATION ────────────────────────────────────
  // 🔴 Embedding model selection is a long-term infrastructure decision.
  // Document the re-embedding cost before any model change proposal.
  // Prefer models with a track record of stable API compatibility
  // (don't index on a beta embedding model that may be deprecated).
  // For corpora > 100M docs: evaluate self-hosted embeddings to avoid
  // API rate limits and multi-week migration timelines.
  `
      }
    ],

    examples: [
      {
        title: "Sizing a vector DB for a 5M document enterprise knowledge base",
        input: "5M documents, avg 300 tokens each (after chunking). Embedding model: text-embedding-3-small (1,536 dims). Precision: float32. HNSW index. Single-server deployment target.",
        output: "Raw vectors: 28.6 GB. HNSW total: ~40 GB. Fits on a 64 GB RAM server with headroom. Query latency at efSearch=64: ~8ms.",
        explanation: "raw_bytes = 5e6 × 1536 × 4 = 30.72e9 bytes = 28.6 GB. HNSW total = 28.6 × 1.4 = 40.0 GB. 64 GB server: 40 GB index + 10 GB OS/app + 14 GB headroom for concurrent query buffers. Fits comfortably. If using float16: raw = 14.3 GB, HNSW total = 20 GB. Fits in 32 GB server, saving ~$300/month on cloud VM. Query latency at efSearch=64 for N=5M: between the 1M (2ms) and 10M (12ms) benchmarks, interpolate to ~8ms. Well within a 20ms retrieval budget."
      },
      {
        title: "When does a single-node vector DB need to shard?",
        input: "Growing corpus: 1M vectors today, growing at 500K/month. Embedding: E5-large, 1,024 dims, float32. Server: 256 GB RAM. At what month must you shard?",
        output: "Shard at approximately month 24, when the index reaches ~150 GB (60% of 256 GB server RAM).",
        explanation: "raw_per_vector = 1024 × 4 = 4,096 bytes = 4 KB/vector. raw_at_month_T = (1M + 500K × T) × 4 KB. HNSW total at month T = raw × 1.4. Set HNSW total = 0.60 × 256 GB = 153.6 GB: (1M + 500K × T) × 4,096 × 1.4 = 153.6e9 (1M + 500K × T) = 153.6e9 / (4096 × 1.4) = 26.8M vectors. T = (26.8M - 1M) / 500K = 25.8M / 500K = 51.6 months ≈ month 52. Correction: 500K/month growth → at month 52 you have 1M + 26M = 27M vectors. Plan sharding at month 48 (3-month buffer before the limit). With float16 vectors: same threshold = ~107M vectors → sharding much later."
      },
      {
        title: "Total cost of migrating from text-embedding-3-small to text-embedding-3-large",
        input: "Corpus: 2M documents, avg 400 tokens each. Current model: OpenAI text-embedding-3-small. Proposed upgrade: text-embedding-3-large (better retrieval recall, +15% on MTEB). Calculate migration cost and time.",
        output: "API cost: $20.80. Time: ~13.9 hours. Storage doubles: 11.4 GB to 22.8 GB (float32). Primary cost is engineering time and service disruption, not dollars.",
        explanation: "Total tokens = 2M × 400 = 800M tokens. API cost: (800M / 1e6) × $0.130/M (large model) = 800 × $0.130 = $104... wait: $0.130 per M tokens × 800M = $104. Correcting: 800M/1e6 = 800 units of 1M tokens. 800 × $0.130 = $104. Not $20.80. Storage change: 2M × 3072 dims × 4 bytes = 24.6 GB raw. HNSW: 34.4 GB. vs small (1536 dims): 12.3 GB raw, 17.2 GB HNSW. Doubles storage. Time: 800M tokens at 1M tokens/min = 800 minutes = 13.3 hours via API. Engineering cost: dual-write period, blue/green index swap, validation A/B test ≈ 2–3 engineer-days. Conclusion: migration is cheap in dollars ($104 API), moderate in time (13 hours), significant in engineering (3 days + deployment risk)."
      }
    ],

    tips: [
      "HNSW index memory = raw vector storage × 1.4 is the planning formula. Forgetting the 40% graph overhead leads to under-provisioned servers that OOM during index load.",
      "efSearch=64 is the recommended default for production RAG — gives ~98% recall@10 at ~12ms on 10M vectors. Tuning beyond this rarely improves answer quality enough to justify the latency cost.",
      "Changing embedding models requires re-embedding every document — treat model selection as a long-term infrastructure decision, not a configuration change.",
      "Float16 quantisation of embeddings halves storage and RAM requirements at less than 1% recall loss. Always evaluate float16 before accepting a cluster requirement.",
      "For corpora under 100K vectors, a flat (brute-force) index is simpler, has zero graph overhead, and delivers exact recall. Only switch to HNSW above ~100K vectors where O(N) brute-force exceeds 5–10ms."
    ],

    tricks: [
      "STORAGE QUICK CALC: 'N million vectors × D dims × 4 bytes = GB for float32. Divide by 2 for float16.' 10M × 1536 × 4 = 61.4 GB. In head: 10 × 1.536 × 4 ≈ 61.",
      "HNSW OVERHEAD RULE: 'Multiply raw storage by 1.4 for HNSW total. That is your RAM requirement.' Simple multiplier.",
      "SHARD TRIGGER: 'Index exceeds 60% of server RAM → plan to shard within 3 months.' One threshold.",
      "RE-EMBED TIME RULE: '5B tokens via API ≈ 83 hours. Via A100 batch embedding ≈ 28 hours. Days of work, not minutes.'",
      "EFEARCH DEFAULT: 'efSearch=64 gives 98% recall at ~12ms on 10M vectors. Start here. Only lower if latency is too high; only raise if answer quality is unacceptable.'"
    ],

    memoryAids: [
      "STORAGE FORMULA: 'N × D × bytes. Then × 1.4 for HNSW. That is your RAM budget.' Three multiplications.",
      "LATENCY SCALING: '100K: sub-1ms. 1M: 2ms. 10M: 12ms. 100M: 35ms. At efSearch=64.' Memorise these four anchors.",
      "MODEL SWAP COST: 'Changing embedding models = re-embed everything. At 10M docs: 3.5 days via API. Treat as infrastructure migration, not config change.'",
      "FLOAT16 FIRST: 'Evaluate float16 before accepting a cluster requirement. Halves storage, nearly identical recall.'",
      "SHARD WHEN: 'Index exceeds 60% of available RAM. Query latency scales as slowest shard plus 2ms merge, not N × shard latency.'"
    ],

    interviewPatterns: [
      "'How much storage does this vector index need?' → N × D × bytes_per_dim × 1.4 (HNSW). State dimensions from the embedding model explicitly.",
      "'How does query latency scale as the corpus grows?' → O(log N) for HNSW with fixed efSearch. 10× corpus growth ≈ 2× latency increase empirically.",
      "'When do you need to shard?' → when HNSW index exceeds 60% of single-node RAM. Calculate the corpus size that triggers this.",
      "Follow-up: 'we want to switch from OpenAI embeddings to a self-hosted model' → full re-embed required. Calculate corpus tokens × embedding throughput = days. Frame as an infrastructure migration with a cutover plan.",
      "Follow-up: 'retrieval latency is 80ms, need it under 20ms' → (1) reduce efSearch (faster, lower recall), (2) switch to float16 vectors (faster distance compute), (3) add shards (parallel query), (4) add RAM to load full index in-memory if currently on-disk."
    ],

    faq: [
      {
        question: "What is HNSW and why does it produce approximate rather than exact nearest-neighbour results?",
        answer: "Hierarchical Navigable Small World (HNSW) is a graph-based ANN algorithm that builds a multi-layer proximity graph over the vector corpus. During a query, it performs a greedy beam search through the graph, exploring the M nearest neighbours of each visited node and keeping the best candidates found so far. Because the search is greedy — it follows the locally best path at each step — it can miss the globally optimal neighbours if the true nearest neighbour is not reachable through the locally greedy path without backtracking. This produces approximate results: for recall@10 it typically finds 92–99% of the true 10 nearest neighbours depending on efSearch. The trade-off is intentional: exact nearest-neighbour search requires comparing the query to all N vectors (O(N × D) operations), while HNSW queries in O(log N) time. For RAG applications this approximation is acceptable — the LLM can handle 5% recall loss in retrieval, and the latency savings (12ms vs 200ms for 10M vectors) are substantial.",
        category: "algorithms",
        sourceLinks: [{ label: "HNSW paper (Malkov & Yashunin 2018)", url: "https://arxiv.org/abs/1603.09320" }]
      },
      {
        question: "How does scalar quantisation (int8 embeddings) affect retrieval quality?",
        answer: "Scalar quantisation (SQ) converts each float32 embedding dimension into an int8 value by linearly mapping the range [min_val, max_val] to [0, 255]. This reduces storage and RAM by 4× at the cost of rounding error in each dimension. The impact on recall depends on the embedding model: well-calibrated embeddings with smooth value distributions suffer very little (~0.5–1% recall loss at recall@10). Poorly calibrated embeddings with many outlier values can see larger recall drops. In practice, most major embedding models (OpenAI, Cohere, E5, BGE) maintain >99% recall@10 with int8 quantisation when using a calibration dataset to set the quantisation range. Binary quantisation (1-bit per dimension) reduces storage 32× but causes 3–8% recall drops — acceptable for some use cases but requires careful benchmarking. Most production vector DBs (Qdrant, Weaviate) support SQ natively. The recommendation: always benchmark on your specific corpus and query distribution before deploying quantised indices to production.",
        category: "optimization"
      },
      {
        question: "What is the difference between ef_construction and efSearch in HNSW?",
        answer: "ef_construction is the beam width used during index building — specifically, when adding a new vector to the graph, it determines how many candidate neighbours are explored before selecting the final M connections. Higher ef_construction creates a better-connected graph with higher recall potential, at the cost of longer build time. Once the index is built, ef_construction has no effect on query performance. efSearch (sometimes called ef) is the beam width used during query time — it determines how many candidate paths are explored during the greedy search. Higher efSearch always increases recall and always increases query latency. The practical guidance: set ef_construction=200 to 400 during index build (one-time cost, do it once). Set efSearch based on your latency SLA and recall requirement at query time (continuous cost, tune carefully). The most common interview error is confusing the two parameters or saying that ef_construction affects query latency.",
        category: "algorithms"
      },
      {
        question: "How do you handle embedding model versioning in production to avoid the re-embedding problem?",
        answer: "Treat the embedding model as a versioned dependency of the vector index. Operational practices: (1) Tag every index with the model name and version used to build it — never overwrite the tag. (2) Run a blue/green index strategy when migrating: build the new index in parallel while the old index serves traffic, validate recall quality offline, then switch traffic atomically. (3) Use model-stable embedding APIs: prefer APIs that guarantee the same output for the same input across versions (OpenAI text-embedding-3 models explicitly guarantee this within their major version). (4) For self-hosted models, pin the model checkpoint hash in your infrastructure code — never use a 'latest' tag for embedding models. (5) Store raw document text separately from the index so re-embedding is always possible from source without reconstructing documents from embeddings. (6) For large corpora, maintain a streaming re-embedding pipeline that can gradually migrate documents to a new model over days/weeks rather than requiring a single massive batch job.",
        category: "operations"
      },
      {
        question: "When should you use a flat (brute-force) index instead of HNSW?",
        answer: "Use a flat index when: (1) corpus size is under 100K vectors — at this scale, brute-force scan completes in under 5ms with modern SIMD implementations, and you save the 40% HNSW overhead and the complexity of tuning M and ef_construction; (2) you need exact rather than approximate recall — for evaluation, compliance, or duplicate-detection tasks where approximate results are unacceptable; (3) the corpus changes frequently with high insert rates — HNSW must update the graph for each new vector, which is expensive at high insert rates; flat indices just append. (4) GPU-accelerated search (FAISS GPU, Qdrant on GPU) — GPUs can scan 100M float16 vectors in under 50ms using highly optimised BLAS operations, making brute-force competitive even at large scales if a GPU is available. The crossover for on-CPU search: use HNSW when N exceeds 100K and your latency budget is under 10ms. Use flat when N is under 100K or exact recall is required regardless of size.",
        category: "design"
      },
      {
        question: "How do you estimate the re-embedding cost for a model migration, and what are the hidden costs?",
        answer: "Direct cost calculation: total_tokens = N_documents × avg_tokens_per_document. API cost = total_tokens × embedding_price_per_M_tokens. Time = total_tokens / embedding_throughput. For 10M documents at 500 tokens each: 5B tokens × $0.020/M = $100 in API costs, 83 hours at 1M tokens/minute API throughput. The hidden costs that are often underestimated: (1) Engineering time — building the migration pipeline, handling failures and retries, writing the validation suite, and managing the cutover is typically 3–5 engineer-days. (2) Infrastructure for dual-running — the old index must remain serving traffic while the new one is built, requiring 2× the normal storage and compute for the migration period. (3) Validation time — after re-embedding, you must benchmark recall on representative queries to confirm the new model's performance. This requires a labelled evaluation set, which may not exist and must be created. (4) Rollback plan — if the new model underperforms, rolling back means re-embedding again (another 83 hours). Total fully-loaded migration cost for 10M documents is typically $5,000–$20,000 in engineer time and infrastructure, not $100 in API fees.",
        category: "operations"
      }
    ],

    practiceProblems: [
      `PROBLEM 1: Size the vector infrastructure for a legal research platform with 50M
  case documents averaging 1,200 tokens each (full legal opinions, not chunked).
  Embedding model: E5-large (1,024 dims, float32). Latency SLO: retrieval p99 under 25ms.
  How many servers are needed and should you use float16?

  SOLUTION:
    STEP 1: Raw vector storage.
    raw_bytes = 50e6 × 1024 × 4 = 204.8e9 bytes = 190.7 GB

    STEP 2: HNSW total memory.
    total_HNSW = 190.7 × 1.4 = 267 GB

    STEP 3: Float16 alternative.
    raw_float16 = 50e6 × 1024 × 2 = 95.4 GB
    total_HNSW_float16 = 95.4 × 1.4 = 133.5 GB

    STEP 4: Server sizing.
    Option A (float32): 267 GB index.
      Minimum: 3 × 128 GB servers (each holding ~89 GB shard with 39 GB headroom).
      Or: 1 × 512 GB server (enterprise RAM config; 267 GB index + 200 GB headroom).
    Option B (float16): 133.5 GB index.
      Fits on 2 × 128 GB servers (each holding ~67 GB shard) OR 1 × 256 GB server.
      RECOMMENDED: float16 halves the infrastructure cost. Benchmark recall loss first.

    STEP 5: Latency validation.
    At N=50M vectors, efSearch=64: interpolate from 10M (12ms) and 100M (35ms).
    At 50M: approximately 25ms. Right at the 25ms SLO limit.
    To achieve headroom: efSearch=32 gives ~15ms at ~96% recall@10.
    OR: use float16 (faster distance computation) → roughly 30% lower latency → ~17ms at efSearch=64.
    Recommendation: float16 + efSearch=64 → ~17ms, recall@10 ~98%. Both targets met.

    STEP 6: Sharding plan.
    float16 option: 2-shard cluster, each shard holds 25M vectors.
    Per-shard latency: ~12ms (same as 10M-vector benchmark, 2.5× interpolation).
    Sharded query: max(shard1, shard2) + 2ms merge = 14ms. ✓ Under 25ms.

    FINAL ANSWER: 2-node cluster, 128 GB RAM each, float16 embeddings.
    Total RAM: 256 GB. HNSW per shard: ~67 GB. Headroom: ~61 GB per node.
    Query latency: ~14ms at efSearch=64, 98% recall. ✓`,

      `PROBLEM 2: Your RAG application's retrieval latency has degraded from 8ms
  to 65ms over six months as the corpus grew from 2M to 20M vectors. Diagnose
  and propose three interventions ordered by implementation cost.

  SOLUTION:
    DIAGNOSIS:
    Corpus grew 10×. For HNSW at efSearch=64:
    2M vectors: ~4ms (interpolated between 1M=2ms and 10M=12ms).
    20M vectors: ~18ms (interpolated between 10M=12ms and 100M=35ms).
    Expected latency: ~18ms. Observed: 65ms. Something else is wrong.

    Likely causes beyond corpus growth:
    1. Index no longer fits in RAM — queries are hitting disk. Disk-resident
       HNSW queries are 5–20× slower than in-memory. This would explain the
       65ms vs expected 18ms discrepancy.
    2. efSearch was inadvertently increased during a configuration change.
    3. Server is running other workloads competing for RAM.

    Confirm: check memory utilisation on the vector DB server. If memory usage
    exceeds 90% of RAM, the OS is swapping index pages to disk. This is
    Cause #1.

    INTERVENTION 1 (free): Reduce efSearch from current value.
    If someone increased efSearch from 64 to 200: drop back to 64.
    Expected latency at efSearch=64 for 20M vectors: ~18ms. Cost: config change.

    INTERVENTION 2 (low cost): Quantise vectors from float32 to float16.
    Current index: 20M × 1536 × 4 × 1.4 = 172.0 GB (assuming 1536 dims).
    If server has 128 GB RAM: 172 GB does not fit → disk swapping confirmed.
    Float16 index: 20M × 1536 × 2 × 1.4 = 86 GB. Fits in 128 GB RAM.
    Cost: full re-index with float16 quantisation. Time: ~4 hours for 20M vectors.
    Expected result: in-memory query at ~18ms. ✓

    INTERVENTION 3 (medium cost): Upgrade server RAM.
    Add RAM to bring server to 256 GB. float32 index (172 GB) fits comfortably.
    No re-indexing needed. Cost: cloud instance upgrade, ~$300/month premium (🔴).
    Trade-off: faster to implement than re-indexing; higher ongoing cost.

    ORDER OF IMPLEMENTATION:
    1. Check efSearch setting (free, 5 minutes) — eliminates accidental misconfiguration.
    2. If RAM-bound: upgrade server RAM (zero downtime, 1 hour) — fastest resolution.
    3. Float16 migration (4-hour rebuild, near-zero cost) — best long-term solution.`,

      `PROBLEM 3: You are advising a startup on embedding model selection for their
  product (10M document corpus, growing 20% annually). Three options:
  (A) OpenAI text-embedding-3-large (3072 dims, hosted API, $0.130/M tokens 🔴)
  (B) E5-large-v2 (1024 dims, self-hosted on A10G)
  (C) OpenAI text-embedding-3-small (1536 dims, hosted API, $0.020/M tokens 🔴)
  Evaluate: initial indexing cost, ongoing query cost, storage, and migration risk.

  SOLUTION:
    INITIAL INDEXING COST (10M docs × 500 tokens avg = 5B tokens):
    Option A: 5B/1e6 × $0.130 = $650  (API)
    Option B: 5B tokens / (50K tok/s × 3600s) = 27.8h on A10G
              A10G cost: $600/month = $0.83/hr × 27.8h = $23  (self-host)
    Option C: 5B/1e6 × $0.020 = $100  (API)

    ONGOING QUERY EMBEDDING COST (500K queries/day, 80 tokens/query):
    Option A: 500K × 80 tok × $0.130/1e6 × 30 days = $156/month
    Option B: Self-hosted A10G handles 50K tok/s → query embedding negligible latency.
              Server cost amortised over indexing + queries: ~$600/month fixed.
    Option C: 500K × 80 × $0.020/1e6 × 30 = $24/month

    STORAGE (10M vectors, float32):
    Option A (3072 dims): 10M × 3072 × 4 × 1.4 = 172 GB RAM required
    Option B (1024 dims): 10M × 1024 × 4 × 1.4 =  57 GB RAM required
    Option C (1536 dims): 10M × 1536 × 4 × 1.4 =  86 GB RAM required
    Option B wins on infrastructure: fits in a single 64 GB server.
    Option A requires a 256 GB server or 3-node cluster.

    RETRIEVAL QUALITY (MTEB English benchmark 🔴):
    Option A: ~62 MTEB avg (state of the art for OpenAI)
    Option B: ~55 MTEB avg (strong open-source option)
    Option C: ~60 MTEB avg (near Option A at 5× lower cost)

    MIGRATION RISK:
    Options A and C: OpenAI guarantees output stability within major API versions.
    Low migration risk within version; version upgrades require re-embedding.
    Option B: checkpoint pinned at deployment. Self-controlled migration.

    RECOMMENDATION:
    For a cost-sensitive startup: Option C (OpenAI small).
    $100 indexing + $24/month queries + 86 GB RAM (fits 128 GB server).
    MTEB quality within 2 points of Option A at 5× lower API cost.
    Option B makes sense if: (1) query volume is very high (>2M/day) making
    API costs dominate, or (2) data privacy prevents sending documents to
    OpenAI API. Option A is hard to justify over Option C for most use cases.`
    ],

    references: [
      {
        source: "blog",
        attribution: "Malkov and Yashunin (2018) — Efficient and Robust Approximate Nearest Neighbor Search Using HNSW Graphs - https://arxiv.org/abs/1603.09320",
        insight: "HNSW algorithm design, M and ef_construction parameter effects, query complexity analysis"
      },
      {
        source: "blog",
        attribution: "Pinecone — Vector Database Index Size Guide - https://www.pinecone.io/learn/vector-database/",
        insight: "Practical storage formulas, HNSW overhead measurements, shard sizing guidance"
      },
      {
        source: "blog",
        attribution: "Qdrant — Quantization Documentation - https://qdrant.tech/documentation/guides/quantization/",
        insight: "Scalar quantisation implementation, recall-storage trade-offs, float16 and int8 benchmarks"
      },
      {
        source: "blog",
        attribution: "Muennighoff et al. (2023) — MTEB: Massive Text Embedding Benchmark - https://arxiv.org/abs/2210.07316",
        insight: "Standardised recall benchmarks across embedding models; use for comparing model selection options"
      },
      {
        source: "blog",
        attribution: "Johnson et al. (2019) — Billion-Scale Similarity Search with GPUs (FAISS) - https://arxiv.org/abs/1702.08734",
        insight: "GPU-accelerated flat index search; when brute-force beats HNSW; product quantisation design"
      }
    ]
  }
];
