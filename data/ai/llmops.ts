import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-ai-llmops - "AI: LLMOps & Inference Serving" (6 topics).
// Coverage: serving options (self-hosted engines vs managed APIs), GPU basics
// for inference, KV cache, continuous batching, PagedAttention, speculative
// decoding, model versioning & deployment patterns, cost telemetry, common
// production incident patterns.
//
// Authoring rules: see data/ai/foundations.ts (every field explicit, 5+ FAQs,
// `complexity` as latency/cost framing, `asciiDiagram` from "./_shared").
export const aiLlmOpsTopics: Topic[] = [
  {
    id: "topic-ai-llmops-gpu-fundamentals",
    moduleId: "mod-ai-llmops",
    title: "GPU Fundamentals for Inference: Why Decode Is Memory-Bound",

    intuition: `Almost everyone reasons about GPUs in terms of FLOPs, and for
  inference that instinct is actively misleading. Generating a single token
  requires reading every weight in the model out of GPU memory and performing
  comparatively little arithmetic on each one. The chip finishes the math and
  waits for memory. That one fact — decode is limited by memory bandwidth, not
  compute — explains why a model twice as large is roughly twice as slow per
  token, why batching is close to free, why quantization speeds things up
  rather than merely saving space, and why buying a card with more FLOPs but
  the same bandwidth changes nothing. If you understand this single asymmetry,
  most serving design decisions stop being memorised facts and become
  derivable.`,

    complexity: {
      time: "Per-token decode latency has a hard floor set by memory bandwidth, not arithmetic: the accelerator must stream the full weight set from HBM for every token generated, so time per token is approximately model bytes divided by memory bandwidth. A 70B model at fp16 is ~140 GB of weights; on an accelerator with roughly 3 TB/s of bandwidth that is about 47 ms per token at batch size 1, or roughly 21 tokens per second — and no amount of additional compute moves that number. This is why quantization delivers a genuine speedup rather than only a memory saving: halving the bytes read halves the floor. Prefill behaves oppositely — it processes the whole prompt in parallel, is arithmetic-intensive and compute-bound, and scales with prompt length. Time-to-first-token is dominated by prefill; inter-token latency is dominated by bandwidth.",
      space: "VRAM holds three things and you must budget all three: weights, KV cache, and activations plus framework overhead. Weights are parameter count times bytes per parameter — 70B at fp16 is ~140 GB, at int8 ~70 GB, at int4 ~35 GB, which is what determines whether a model fits on one accelerator at all. KV cache is the variable term, grows with concurrency and context length, and is developed in the KV cache topic. Activations and CUDA context typically take a few GB. The practical consequence is that weights set the entry ticket and KV cache sets how many users you can serve once you are in — so a model that 'fits' with 2 GB spare can serve almost nobody concurrently, a distinction that catches people sizing from parameter count alone."
    },

    lesson: [
      {
        title: "The Two Numbers That Matter",
        content: `A GPU spec sheet lists dozens of figures, and for inference
  almost all of them are noise. Two numbers govern what you can do: memory
  capacity, which decides whether the model fits at all, and memory bandwidth,
  which decides how fast weights can be streamed out of that memory. Compute
  throughput — the FLOPs number that dominates marketing — matters third, and
  for the decode phase it is usually not the binding constraint at all.

  The concept that makes this precise is arithmetic intensity: the number of
  floating-point operations performed per byte moved from memory. The roofline
  model says an operation is compute-bound when its arithmetic intensity is
  high enough that the chip is busy doing math, and memory-bound when the
  intensity is so low that the compute units sit idle waiting for data. A
  matrix-matrix multiply over a long prompt has high intensity: each weight
  byte read is reused across many tokens. A matrix-vector multiply generating
  one token has terrible intensity: every weight byte is read to contribute to
  exactly one output token, then discarded.

  Keep this whiteboard-sized. The goal is not a course in performance
  engineering — it is a mental model that lets you predict, before you write
  any code, which resource will run out first.`,
      },
      {
        title: "Prefill vs Decode: One Split That Explains Everything",
        content: `This is the core section, and it is the one idea worth
  carrying out of this topic.

  Prefill processes all prompt tokens simultaneously. The operations are large
  matrix-matrix multiplications with high arithmetic intensity, the work
  parallelises across the sequence, and the phase is compute-bound. Its cost
  scales with prompt length, and it dominates time-to-first-token.

  Decode generates one token at a time, each token depending on the one
  before, so it is inherently sequential. At batch size 1 the operations are
  matrix-vector multiplications with terrible arithmetic intensity: the full
  weight set is read from HBM to produce a single token. The phase is
  memory-bandwidth-bound, and it dominates inter-token latency — and therefore
  total generation time for any long output.

  Once you hold that split, four consequences follow that most people memorise
  separately and you can now derive.

  First, time per token is approximately model bytes divided by bandwidth. Do
  that arithmetic explicitly rather than quoting a benchmark.

  Second, batching is nearly free during decode. The weights are read once and
  the cost is amortised across every request in the batch, so moving from
  batch 1 to batch 32 raises throughput enormously at modest latency cost.
  This is the entire justification for continuous batching, and it falls
  directly out of the bandwidth bound rather than being a separate trick.

  Third, quantization genuinely speeds up decode. Fewer bytes to read means a
  lower floor — it is a latency win, not only a memory win.

  Fourth, prefill and decode have genuinely different resource profiles, which
  is precisely why chunked prefill and disaggregated prefill-decode serving
  exist as production techniques.`,
        diagram: asciiDiagram(`
  Prefill vs decode — the split that explains serving

  PREFILL  ── all prompt tokens at once
  ┌────────────────────────────────────────────┐
  │ tok1 tok2 tok3 ... tokN   ── in parallel   │
  │ matrix × matrix ── high arithmetic         │
  │ COMPUTE-BOUND ── scales with prompt length │
  │ ▶ dominates TIME TO FIRST TOKEN            │
  └────────────────────────────────────────────┘
                     │
                     ▼
  DECODE   ── one token at a time, sequential
  ┌────────────────────────────────────────────┐
  │ tokN ──▶ tokN+1 ──▶ tokN+2 ──▶ ...         │
  │ matrix × vector ── low arithmetic          │
  │ MEMORY-BANDWIDTH-BOUND                     │
  │ ▶ dominates INTER-TOKEN LATENCY            │
  └────────────────────────────────────────────┘

  time per token ≈ model bytes ÷ memory bandwidth

    70B @ fp16 = 140 GB ÷ ~3 TB/s ≈ 47 ms/token ≈ 21 tok/s
    70B @ int8 =  70 GB ÷ ~3 TB/s ≈ 23 ms/token ≈ 43 tok/s
                  ▲
     quantization halves bytes read ──▶ halves the floor
     (a real speedup, not just a memory saving)

  Why batching is nearly free in decode:
    batch 1  ── read 140 GB ──▶ produce  1 token
    batch 32 ── read 140 GB ──▶ produce 32 tokens
                     ▲
        same bytes moved, 32× the useful output
`),
      },
      {
        title: "Budgeting VRAM: Weights Are the Entry Ticket",
        content: `Build the budget additively: weights, then KV cache, then
  activations and framework overhead. Weights are parameter count times bytes
  per parameter and are fixed once you pick a precision. Activations and the
  CUDA context typically take a few gigabytes. Whatever remains is KV cache,
  and KV cache is what determines how many users you can actually serve.

  Work it end to end. Take a 70B model quantized to int8 — 70 GB of weights —
  on an 80 GB accelerator. Subtract the weights and about 3 GB of activations
  and context, and roughly 7 GB remains. For a 70B model with grouped-query
  attention (80 layers, 8 key-value heads, head dimension 128, fp16 cache),
  each token of context costs 2 × 80 × 8 × 128 × 2 bytes, which is 320 KB. A
  4,096-token conversation therefore costs about 1.3 GB of KV cache. Seven
  gigabytes divided by 1.3 GB gives roughly five concurrent requests.

  That is the whole lesson in one number. The model "fits" — but it serves
  five users. Fitting the weights is the entry ticket; the leftover determines
  your concurrency. Sizing from parameter count alone is exactly how teams
  arrive at a deployment that runs beautifully in a demo and collapses under
  the tenth simultaneous user.

  Multi-GPU is the escape hatch, and the two options differ in a way worth
  knowing precisely. Tensor parallelism splits each layer across devices, so
  every token requires a communication step between them — it needs a fast
  interconnect and is the usual choice when a model simply cannot fit on one
  card. Pipeline parallelism splits the model by layer, tolerates slower
  interconnect, but introduces pipeline bubbles where devices idle waiting for
  the stage before them. Reach for tensor parallelism for latency-sensitive
  single-model serving with a good interconnect, pipeline parallelism when the
  interconnect is the constraint.`,
        diagram: asciiDiagram(`
  VRAM budget — weights are the ticket, the rest is your concurrency

  ┌──────────────────────────── device memory ─────────────────────────┐
  │                                                                    │
  │  ████████████████████████████████  weights (fixed, fp16)           │
  │  ░░░░░░░░░░░░░░░░░░░░              KV cache (grows with users      │
  │                                     AND with context length)       │
  │  ▒▒                                activations + CUDA context      │
  │                                                                    │
  └────────────────────────────────────────────────────────────────────┘

  Worked: 70B @ int8 on an 80 GB device
    weights ......... 70 GB   ── the entry ticket
    activations ..... ~3 GB
    left for KV ..... ~7 GB
    KV per token .... 320 KB  (2 × 80 layers × 8 kv-heads × 128 × 2 B)
    KV per request ... 1.3 GB (at 4,096 tokens of context)
    concurrency ..... ~5 requests
                        ▲
        the model "fits" and still serves almost nobody

  weights fit with 2 GB spare  ──▶  model "runs"
                               ──▶  serves almost nobody
                               ──▶  sizing from parameter count alone
                                    is how this mistake happens

  quantize weights ──▶ frees room for KV cache ──▶ MORE CONCURRENCY
                       (the second-order win people miss)
`),
      },
      {
        title: "Doing the Estimate Out Loud",
        content: `Turn all of the above into a procedure you can execute at a
  whiteboard without notes.

  Step 1: State the model size and precision, and compute weight bytes —
  parameters times bytes per parameter.

  Step 2: Subtract weights from device memory, and subtract a few gigabytes
  for activations and CUDA context.

  Step 3: Allocate the remainder to KV cache, compute KV bytes per token from
  the model's layer count, key-value head count and head dimension, and
  multiply by your target context length to get bytes per request.

  Step 4: Divide to get concurrency.

  Step 5: Derive per-token latency independently, from model bytes divided by
  memory bandwidth, and check it against your latency budget.

  Two things matter about how you do this in an interview. Stating your
  assumptions aloud and showing the arithmetic is the scored behaviour — the
  interviewer is testing whether you can reason about the machine, not whether
  you memorised a benchmark. And being within a factor of two is a pass, while
  confidently asserting a precise number with no derivation behind it is not.
  If you find yourself quoting tokens-per-second from a vendor blog post, you
  have skipped the part being assessed.`,
      },
    ],

    examples: [
      {
        title: "Deriving tokens per second from a spec sheet",
        input: "A 70B-parameter model at fp16; accelerator with ~3 TB/s of memory bandwidth; batch size 1. A colleague measures 15 tokens/second and asks whether that is good.",
        output: "Theoretical floor ≈ 47 ms/token ≈ 21 tok/s. The measured 15 tok/s is ~70% of the floor, which is a normal, healthy efficiency — not a bug.",
        explanation: "Step 1: Compute weight bytes. 70 billion parameters × 2 bytes per parameter at fp16 = 140 GB that must be streamed from HBM for every single token.\nStep 2: Divide by bandwidth. 140 GB ÷ 3 TB/s ≈ 0.047 s, so about 47 ms per token. Inverting gives roughly 21 tokens/second as a hard ceiling at batch 1.\nStep 3: Compare to the measurement. 15 tok/s against a 21 tok/s ceiling is about 70% of theoretical peak.\nStep 4: Explain the gap rather than treating it as a defect. Real kernels never achieve 100% of peak bandwidth; there is attention computation over the KV cache, sampling, Python and framework overhead between steps, and imperfect memory access patterns. 60-80% of the bandwidth-derived floor is the normal operating band.\nStep 5: Draw the actionable conclusion. Because the workload is already near the bandwidth ceiling, buying a card with more FLOPs will do nothing. The levers that work are reducing bytes read (quantize to int8 and halve the floor to ~23 ms/token) or raising bandwidth.",
      },
      {
        title: "Will this model fit, and how many users can it serve?",
        input: "70B model at int8 (70 GB of weights), an 80 GB accelerator, target context length 4,096 tokens. Model architecture: 80 layers, 8 key-value heads (grouped-query attention), head dimension 128, fp16 KV cache.",
        output: "It fits, with about 7 GB spare — which supports roughly 5 concurrent requests. On a 48 GB card the same model does not fit at all at int8.",
        explanation: "Step 1: Weights. 70B × 1 byte at int8 = 70 GB. On an 80 GB device this fits, so the entry ticket is paid.\nStep 2: Reserve overhead. Activations plus CUDA context take roughly 3 GB, leaving about 7 GB for KV cache.\nStep 3: KV bytes per token. The formula is 2 (one key, one value) × layers × kv_heads × head_dim × bytes_per_element = 2 × 80 × 8 × 128 × 2 = 327,680 bytes, or about 320 KB per token.\nStep 4: KV per request. At 4,096 tokens of context that is 320 KB × 4,096 ≈ 1.3 GB for a single conversation.\nStep 5: Concurrency. 7 GB ÷ 1.3 GB ≈ 5 concurrent requests. This is the number that matters, and it is invisible if you size from parameter count alone.\nStep 6: Repeat on a smaller device to see concurrency collapse. On a 48 GB card, 70 GB of int8 weights do not fit at all — you must go to int4 (35 GB), which leaves about 10 GB for KV cache and actually serves more concurrent users than the 80 GB card did at int8. Quantization buys concurrency, not just capacity.",
      },
      {
        title: "Why the faster-on-paper GPU didn't help",
        input: "A team upgrades from an accelerator with 1,000 TFLOPs and 3.0 TB/s to one with 2,000 TFLOPs and 3.35 TB/s, expecting decode throughput to roughly double. Measured improvement: about 11%.",
        output: "The result is exactly correct. Decode scales with bandwidth (3.35/3.0 ≈ 1.12), not FLOPs (2.0/1.0 = 2.0). The 11% gain matches the bandwidth ratio.",
        explanation: "Step 1: Identify which phase dominates. The workload generates long outputs, so total time is dominated by decode, not prefill.\nStep 2: Recall the bound. Decode is memory-bandwidth-bound — every token requires streaming the entire weight set from HBM, with very little arithmetic per byte.\nStep 3: Compute the predicted speedup from the binding resource. Bandwidth went from 3.0 to 3.35 TB/s, a ratio of about 1.12, predicting roughly a 12% improvement.\nStep 4: Compare with the observed 11%. The prediction matches, so nothing is misconfigured — the machine is behaving exactly as the roofline says it must.\nStep 5: Note what would have changed the answer. If this were a prefill-heavy workload — very long prompts, very short completions — the same upgrade would have delivered close to the full 2× because prefill is compute-bound. The right upgrade decision depends entirely on the prompt-to-completion ratio of the actual traffic.",
      },
    ],

    tips: [
      "For decode, read the bandwidth number on the spec sheet before the FLOPs number. FLOPs is the marketing figure; bandwidth is the one that sets your token rate.",
      "Quantization buys two things at once: lower latency, because fewer bytes are read per token, and more concurrency, because the freed VRAM becomes KV cache. Most people only cite the second.",
      "Batch size raises throughput far more than it raises latency during decode. That asymmetry is the entire reason continuous batching works, and it is derivable rather than something to memorise.",
      "Always separate your time-to-first-token budget from your inter-token latency budget. They are governed by different phases and different hardware limits, so a single 'response latency' target hides which one you are actually violating.",
      "When someone reports a tokens-per-second figure, immediately ask at what batch size and what context length. Without both, the number is uninterpretable.",
      "Reaching 60-80% of the bandwidth-derived theoretical floor is healthy. If you are at 20%, suspect a framework or scheduling problem rather than the hardware.",
    ],

    tricks: [
      "To sanity-check any decode latency claim in seconds: divide model bytes by bandwidth. If the claim is faster than that floor at batch 1, it is either wrong, measured at a larger batch, or using speculative decoding.",
      "Estimate KV cache per token as 2 × layers × kv_heads × head_dim × bytes. The factor of 2 is the key and the value; forgetting it halves your estimate and doubles your predicted concurrency.",
      "When a model 'fits' with only a couple of gigabytes to spare, treat the deployment as broken rather than tight. Compute the concurrency it implies before anyone builds on it.",
      "Grouped-query attention is the single biggest KV cache lever in modern architectures — going from 64 query heads to 8 key-value heads cuts cache size 8×. Check the kv_head count, not the head count.",
      "If prefill dominates your latency, more compute helps; if decode dominates, only fewer bytes or more bandwidth help. Determine which by comparing prompt length to completion length before choosing hardware.",
    ],

    memoryAids: [
      "Prefill is compute-bound, decode is bandwidth-bound: 'read the prompt fast, write the answer slow'.",
      "Time per token ≈ model bytes ÷ bandwidth. One formula covers most decode latency questions.",
      "Weights are the entry ticket; KV cache is the seating capacity.",
      "Arithmetic intensity = FLOPs per byte. High intensity rides the compute roof, low intensity rides the memory roof.",
      "KV per token = 2 × L × H_kv × D × bytes — 'two for K and V, times layers, times kv-heads, times dimension'.",
      "Batch 1 and batch 32 read the same 140 GB. That sentence contains the whole case for continuous batching.",
    ],

    interviewPatterns: [
      "'Why is my GPU showing 30% utilisation while generation feels slow?' — the canonical opener; they want you to identify the memory-bandwidth bound rather than blame the scheduler.",
      "'Will this model fit on this card, and how many concurrent users can it serve?' — a two-part question where most candidates answer only the first part.",
      "'We upgraded to a GPU with twice the FLOPs and saw no improvement. Why?' — tests whether you can attribute performance to the binding resource.",
      "'How many tokens per second can you get from a 70B model?' — an invitation to derive from bandwidth out loud; quoting a benchmark number scores poorly.",
      "'When do you need multiple GPUs, and would you use tensor or pipeline parallelism?' — checks that you know the interconnect trade-off, not just the vocabulary.",
      "Frequency and companies: very high frequency in AI infrastructure and ML platform interviews at OpenAI, Anthropic, Meta, NVIDIA, Databricks and most LLM-serving startups. It is the standard opening screen for inference-serving roles because it separates people who have run models in production from those who have only called APIs.",
    ],

    faq: [
      {
        question: "Why does my GPU show low utilisation while token generation is slow?",
        answer: "Because 'utilisation' as reported by most monitoring tools measures whether any kernel is resident on the device, not whether the arithmetic units are busy. During decode the chip spends most of its time waiting for weights to arrive from HBM, so the compute units idle while a kernel is technically running. You can see 90% 'utilisation' with the tensor cores nearly unused. The number to look at instead is achieved memory bandwidth as a fraction of peak — if you are at 60-80% of peak bandwidth, the GPU is working as hard as it can and the only remaining levers are reducing bytes read via quantization, increasing batch size to amortise those reads, or moving to hardware with more bandwidth. Chasing compute utilisation here leads to buying the wrong hardware.",
        category: "diagnosis",
      },
      {
        question: "Will a GPU with more FLOPs make decode faster?",
        answer: "Almost never, and this is the most expensive misconception in inference infrastructure. Decode at small batch sizes is memory-bandwidth-bound: producing each token requires streaming the entire weight set out of HBM while performing very little arithmetic per byte read. Adding compute capacity accelerates a resource that is already idle. If you upgrade from 1,000 to 2,000 TFLOPs while bandwidth rises only from 3.0 to 3.35 TB/s, expect roughly 12% better decode throughput, matching the bandwidth ratio, not the 2× the FLOPs ratio suggests. The exception is prefill, which is genuinely compute-bound — so a workload with very long prompts and very short completions does benefit from more FLOPs. Decide by comparing your average prompt length to your average completion length.",
        category: "misconceptions",
      },
      {
        question: "Why doesn't batching hurt latency proportionally?",
        answer: "Because during decode the dominant cost is reading the weights, and that cost is paid once per forward pass regardless of how many sequences are in the batch. Processing batch 1 and batch 32 both require streaming the same 140 GB for a 70B fp16 model; the additional arithmetic for 31 more sequences is nearly free on a chip that was waiting on memory anyway. So throughput scales close to linearly with batch size while per-request latency rises only slightly. This holds until the batch grows large enough that arithmetic intensity crosses into the compute-bound regime, after which latency starts increasing proportionally. The practical consequence is that there is a wide band where batching is close to a free lunch, and continuous batching exists to keep the server operating inside that band.",
        category: "trade-offs",
      },
      {
        question: "What does quantization actually cost in quality?",
        answer: "Less than most people expect down to int8, and it becomes a real engineering trade-off below that. Moving from fp16 to int8 with a good method typically costs very little on standard benchmarks — often within noise — while halving both the bytes read per token and the memory footprint, so you get roughly double the decode speed and substantially more room for KV cache. int4 with methods such as GPTQ or AWQ is usually acceptable for chat and summarisation but degrades measurably on tasks requiring precise reasoning, long-chain arithmetic or code generation. The critical discipline is to evaluate on your own task rather than trusting published perplexity deltas, because degradation is highly task-dependent. Quantize, then run your own eval set before and after.",
        category: "trade-offs",
      },
      {
        question: "When do I need multiple GPUs, and which parallelism should I choose?",
        answer: "You need multiple GPUs when the weights plus a workable KV cache budget exceed one device's memory, or when a single device's bandwidth cannot meet your latency target. Choose tensor parallelism when you need low latency and have a fast interconnect: it splits every layer across devices, so each token requires an all-reduce between them, which is only viable with high-speed links. Choose pipeline parallelism when the interconnect is slower: it splits the model by layer so devices communicate once per stage boundary rather than constantly, but it introduces bubbles where devices idle waiting for the previous stage, hurting latency at low batch sizes. In practice, tensor parallelism within a node and pipeline parallelism across nodes is the common combination.",
        category: "architecture",
      },
      {
        question: "Why do TTFT and inter-token latency need separate budgets?",
        answer: "Because they are produced by different phases with different bottlenecks, and a single blended 'latency' number hides which one is failing. Time-to-first-token is dominated by prefill, which is compute-bound and scales with prompt length — so it degrades when users send long documents, and it is improved by more compute, chunked prefill or prompt caching. Inter-token latency is dominated by decode, which is bandwidth-bound and essentially independent of prompt length — it is improved by quantization, more bandwidth, or speculative decoding. If you track only end-to-end latency, a regression could be either, and the fixes are entirely different. Production serving systems report TTFT and time-per-output-token as separate SLOs for exactly this reason.",
        category: "operations",
      },
    ],

    practiceProblems: [
      "Compute the theoretical decode floor in tokens/second for a 13B model at fp16, int8 and int4 on an accelerator with 2 TB/s of bandwidth. ANSWER: fp16 = 26 GB ÷ 2 TB/s = 13 ms/token ≈ 77 tok/s; int8 = 13 GB ÷ 2 TB/s = 6.5 ms/token ≈ 154 tok/s; int4 = 6.5 GB ÷ 2 TB/s = 3.25 ms/token ≈ 308 tok/s. Each halving of precision halves the floor because the bound is bytes read per token.",
      "A 34B model at fp16 (68 GB) must run on an 80 GB accelerator with 8,192-token contexts. The architecture has 48 layers, 8 kv-heads and head dimension 128, with an fp16 KV cache. How many concurrent requests fit? ANSWER: weights 68 GB, activations ~3 GB, leaving ~9 GB. KV per token = 2 × 48 × 8 × 128 × 2 = 196,608 B ≈ 192 KB. At 8,192 tokens that is ~1.57 GB per request. 9 ÷ 1.57 ≈ 5 concurrent requests. Quantizing to int8 frees 34 GB, taking concurrency to roughly 27.",
      "A service reports: TTFT is 4 seconds and rising with traffic, while time-per-output-token is stable at 30 ms. Which resource is saturated, and what do you change? ANSWER: decode is healthy and stable, so bandwidth is not the problem; TTFT scaling with load points at prefill queuing, which is compute-bound. Fixes are chunked prefill to interleave prefill with decode, prompt caching to skip repeated prefixes, or adding compute. Quantizing further would improve the already-healthy metric and not the failing one.",
      "Workload A has 8,000-token prompts and 100-token completions. Workload B has 200-token prompts and 2,000-token completions. You may buy either double the FLOPs or 30% more bandwidth. Which upgrade for which workload? ANSWER: A is prefill-dominated (8,000 parallel tokens vs 100 sequential), so it is compute-bound and benefits from the FLOPs upgrade. B is decode-dominated (2,000 sequential steps), so it is bandwidth-bound and the FLOPs upgrade does nothing while the 30% bandwidth upgrade delivers roughly 30%. The same hardware decision has opposite answers depending on the prompt-to-completion ratio.",
    ],

    references: [
      {
        source: "paper",
        attribution: "Williams, Waterman & Patterson, 'Roofline: An Insightful Visual Performance Model for Multicore Architectures', Communications of the ACM (2009). https://dl.acm.org/doi/10.1145/1498765.1498785",
        insight: "The origin of the compute-bound versus memory-bound framing and of arithmetic intensity as the deciding quantity. Everything in this topic is an application of the roofline model to transformer inference.",
      },
      {
        source: "note",
        attribution: "Accelerator architecture whitepapers (NVIDIA A100/H100/H200, AMD MI300) for memory capacity and HBM bandwidth figures. Treat all specific numbers as snapshot values.",
        insight: "Bandwidth and capacity are the two numbers to extract; both change generation to generation, so learn the derivation rather than the figures. The ~3 TB/s and 80 GB values used here are representative, not durable.",
      },
      {
        source: "note",
        attribution: "vLLM documentation on memory management and PagedAttention. https://docs.vllm.ai/en/latest/",
        insight: "Shows how a production engine actually budgets VRAM between weights and KV cache, and why fragmentation of the cache — not raw capacity — is often the real limit on concurrency.",
      },
      {
        source: "paper",
        attribution: "Frantar et al., 'GPTQ: Accurate Post-Training Quantization for Generative Pre-trained Transformers', arXiv:2210.17323 (2022); Lin et al., 'AWQ: Activation-aware Weight Quantization', arXiv:2306.00978 (2023).",
        insight: "The two standard post-training quantization methods behind int4 serving. Both matter here because quantization is a latency lever, not merely a memory lever, once you accept the bandwidth bound.",
      },
      {
        source: "video",
        attribution: "MLSys Seminar — 'vLLM: Easy, Fast, and Cheap LLM Serving'. https://www.youtube.com/watch?v=80bIUggRJf4",
        insight: "The clearest walkthrough of how the bandwidth bound and KV cache management drive real serving throughput, including why continuous batching follows from the decode roofline.",
      },
    ],
  },
];

