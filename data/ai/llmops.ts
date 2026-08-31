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
  {
    id: "topic-ai-llmops-kv-cache",
    moduleId: "mod-ai-llmops",
    title: "KV Cache and Attention Optimizations",

    intuition: `Generating text without a KV cache means recomputing attention
  over the entire history for every new token — quadratic work that makes long
  outputs unaffordable. The cache fixes this by storing the keys and values
  already computed for previous tokens, turning generation linear. That trade
  is so obviously correct that every serving system makes it. The consequence
  is less obvious, and it is where the engineering lives: those stored tensors
  are large, they grow with both context length and the number of concurrent
  users, and they live in the same VRAM as the model weights. The KV cache
  stops being an optimisation and becomes the constraint — in most production
  deployments it is cache capacity, not compute, that decides how many users a
  GPU can serve.`,

    complexity: {
      time: "The cache converts generation from quadratic to linear in sequence length: without it, producing n tokens costs O(n²) attention work because every step recomputes keys and values for all previous tokens; with it, each step computes one new key-value pair and attends over stored ones, costing O(n) overall. The remaining per-token cost is dominated by streaming weights and the growing cache from memory, so attention latency creeps up as context lengthens — a long conversation genuinely decodes more slowly than a short one. Prefix caching removes redundant prefill entirely for shared prompts and is the single largest TTFT win available in most RAG and system-prompt-heavy deployments.",
      space: "Cache size is 2 (keys and values) × layers × kv_heads × head_dim × sequence_length × batch_size × bytes_per_element, and the term that surprises people is that it scales with concurrency and context simultaneously — doubling both quadruples it. At long context and meaningful batch size the cache routinely rivals or exceeds the weights themselves, which is why it, rather than parameter count, usually sets the concurrency ceiling. Three levers reduce it: GQA and MQA cut kv_heads architecturally, quantizing the cache to fp8 or int8 halves or quarters it, and PagedAttention recovers the large fraction that naive contiguous allocation wastes to fragmentation."
    },

    lesson: [
      {
        title: "What the Cache Stores and Why It Exists",
        content: `Each token produces a query, a key and a value at every
  layer and every head. Attention for a new token compares its query against
  the keys of all previous tokens and takes a weighted sum of their values.
  The crucial property is that the keys and values of previous tokens do not
  change as generation proceeds — the model is causal, so nothing later can
  alter them. Recomputing them is therefore pure waste, and caching them is
  the obvious fix.

  Make the cost contrast concrete. Without caching, generating token 1,000
  means recomputing keys and values for the 999 tokens before it, and summed
  across the sequence that work is quadratic. With caching, each step appends
  one key-value pair per layer and attends over the stored set, which is
  linear. For a 1,000-token response that is roughly a 500× reduction in
  attention work, which is why no serving system ships without it.

  One detail separates people who understand the mechanism from people who
  have memorised the name: the query is not cached. It is computed fresh at
  every step from the token just generated. Only keys and values are stored,
  which is exactly why the cache is called the KV cache and why its size
  formula has a factor of two rather than three.`,
        diagram: asciiDiagram(`
  WHY THE CACHE EXISTS — cost of generating N tokens

    WITHOUT cache ── recompute all K,V every step
      step 1  ▏
      step 2  ▏▏
      step 3  ▏▏▏
      step 4  ▏▏▏▏
      step 5  ▏▏▏▏▏          total work grows as O(n²)
      ...
      step N  ▏▏▏▏▏▏▏▏▏▏▏▏

    WITH cache ── append one K,V per step, reuse the rest
      step 1  ▏
      step 2  ▏
      step 3  ▏               total work grows as O(n)
      step 4  ▏
      step 5  ▏
      ...
      step N  ▏

    cached:     K and V for every previous token, every layer
    NOT cached: the query ── it is new at every step
`),
      },
      {
        title: "Sizing the Cache, and the Number That Shocks People",
        content: `Build the formula term by term rather than memorising it.
  Two tensors are stored, K and V, hence a factor of 2. One set exists per
  layer. Within a layer there is one set per key-value head, each of head_dim
  elements. That repeats per token in the sequence, and again per sequence in
  the batch, multiplied by bytes per element. So the size is 2 × layers ×
  kv_heads × head_dim × seq_len × batch × bytes.

  Work it for Llama-2-7B, which uses full multi-head attention: 32 layers, 32
  key-value heads, head_dim 128, fp16 at 2 bytes. Per token that is 2 × 32 ×
  32 × 128 × 2 = 524,288 bytes, or 512 KB. A single 4,096-token sequence
  therefore holds 2 GB of cache. Serve sixteen such sequences concurrently and
  the cache is 32 GB — against 14 GB of weights. The cache is more than double
  the model.

  That is the number worth internalising, because it reframes the whole
  serving problem. Raising batch size does not gracefully slow down; it hits
  an out-of-memory error, because each additional sequence demands a fixed
  additional slab of VRAM. "How many concurrent users can this GPU serve" is
  answered from cache arithmetic, not from parameter count.

  Note also that the scaling is joint. Doubling context and doubling
  concurrency together quadruples the cache. This is why long-context features
  cost far more than their marketing implies — every concurrent long-context
  session keeps a proportionally large cache resident for its whole lifetime,
  and a 128k-context product is not eight times more expensive than a 16k one,
  it is eight times more expensive per user and it collapses your maximum
  concurrency at the same time.`,
        diagram: asciiDiagram(`
  KV CACHE SIZE — and why batch size hits a wall

    size = 2 × layers × kv_heads × head_dim × seq_len × batch × bytes
           ▲                                   ▲         ▲
        K and V                          grows with   grows with
                                          context    concurrency

    Llama-2-7B, fp16: 2 × 32 × 32 × 128 × 2 = 512 KB per token
      4,096-token sequence  ──▶  2 GB
      × 16 concurrent       ──▶  32 GB   (weights are only 14 GB)

    ┌──────────────── device memory ─────────────────┐
    │ ████████████████████  weights (FIXED)          │
    │ ░░░░                  batch 1                  │
    │ ░░░░░░░░░░░░          batch 4    ── still fine │
    │ ░░░░░░░░░░░░░░░░░░░░  batch 16   ── tight      │
    │ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓  batch 32   ── OOM ❌     │
    └────────────────────────────────────────────────┘

    Doubling context AND concurrency ──▶ 4× the cache
`),
      },
      {
        title: "PagedAttention: Recovering the Memory You Are Wasting",
        content: `Set the problem up precisely. A naive implementation
  allocates one contiguous cache buffer per request, sized for the maximum
  sequence length the request could reach, because a contiguous buffer cannot
  be grown in place once neighbours are allocated around it. A request that
  stops after eighty tokens against a 4,096-token reservation leaves 98% of
  its slab untouched. Across many concurrent requests this internal
  fragmentation and worst-case over-provisioning wastes a large fraction of
  cache memory — measurements on real workloads commonly put it above half.

  The fix is borrowed rather than invented, and saying so is part of the good
  answer: this is exactly the problem operating-system virtual memory solved.
  Split the cache into fixed-size blocks, keep a per-request block table
  mapping logical positions to physical blocks, and allocate blocks on demand
  as the sequence grows. Blocks need not be contiguous, so there is no need to
  reserve for the worst case, and waste falls to at most one partially filled
  block per request.

  The chain from that to throughput is the part interviewers are listening
  for, and "it's faster" is not an acceptable answer. Recovered memory means
  more sequences resident at once, which means a larger effective batch, and
  during decode — which is memory-bandwidth-bound, per the GPU fundamentals
  topic — additional batch members ride along on weight reads that were
  happening anyway. So the memory saving converts almost directly into
  throughput rather than being merely a tidiness win.

  There is an elegant second-order benefit too. Because addressing goes
  through a block table, two sequences can share physical blocks by pointing
  at the same entries, with copy-on-write when they diverge. That makes
  parallel sampling and beam search dramatically cheaper, and it leads
  directly into prefix sharing.`,
        diagram: asciiDiagram(`
  CONTIGUOUS ALLOCATION vs PAGEDATTENTION

    NAIVE ── one contiguous buffer per request, sized for MAX length
    ┌────────────────────────────────────────────────────────────┐
    │ req A ████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
    │ req B ███░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
    │ req C █████████████░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░░  │
    └────────────────────────────────────────────────────────────┘
      █ used   ░ reserved but WASTED ── often most of the memory

    PAGED ── fixed blocks, allocated on demand, need not be adjacent
    ┌────────────────────────────────────────────────────────────┐
    │ pool  ┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌──┐┌────┐┌────┐             │
    │       │A1││B1││A2││C1││A3││C2││C3││free││free│             │
    │       └──┘└──┘└──┘└──┘└──┘└──┘└──┘└────┘└────┘             │
    └────────────────────────────────────────────────────────────┘
      block table per request maps logical ──▶ physical
      waste is at most one partial block per request

    recovered memory ──▶ more concurrent sequences
                     ──▶ larger effective batch
                     ──▶ higher throughput, because decode is
                         memory-bound and batching rides along free
`),
      },
      {
        title: "Prefix Caching and Sharing",
        content: `This is the largest practical win in real deployments and
  the one most often left on the table. Thousands of requests commonly begin
  with an identical prefix — a system prompt, a block of few-shot examples, a
  retrieved document, or a conversation history being extended by one turn.
  Their keys and values for that prefix are identical, so they can be computed
  once and shared.

  There are two payoffs. Memory: one copy instead of N. And more visibly,
  time-to-first-token, because prefill over the shared prefix is skipped
  entirely rather than merely deduplicated in storage. For an 800-token system
  prompt on a 7B model, prefill runs on the order of 60-100 ms on an A100, so
  a cache hit removes essentially all of the TTFT that users experience as the
  pause before text starts appearing.

  The correctness constraint is strict and it is where people go wrong.
  Sharing is valid only on an exact token-prefix match. Attention is
  positional and causal, so token k's key and value depend on every token
  before it — a difference of one token invalidates everything from that point
  onward, not just that token.

  The design rule follows immediately: put stable content first and variable
  content last. A per-user greeting at the top of an otherwise identical
  system prompt destroys all sharing for every request, which is a genuinely
  common and expensive mistake. Moving that greeting to the end of the prompt
  is a one-line change that can restore a large TTFT win across an entire
  fleet.`,
        diagram: asciiDiagram(`
  PREFIX SHARING — one copy, and no repeated prefill

    1,000 requests, all beginning with the SAME system prompt

    WITHOUT sharing
      req 1 ──▶ prefill 800 tokens ──▶ own cache copy
      req 2 ──▶ prefill 800 tokens ──▶ own cache copy
      ...                              (1,000 copies)

    WITH prefix sharing
      ┌──────────────────────┐
      │ shared prefix blocks │◀── req 1 ─┐
      │ computed ONCE        │◀── req 2 ─┤ all point at
      │ stored ONCE          │◀── req 3 ─┤ the same blocks
      └──────────────────────┘◀── ...   ─┘
                │
                ▼  each request appends only its OWN suffix
          ┌────┐┌────┐┌────┐
          │ s1 ││ s2 ││ s3 │
          └────┘└────┘└────┘

    wins: memory (1 copy) + TTFT (prefill skipped entirely)

    ⚠️ valid ONLY on an EXACT token-prefix match
       "Hello Ana, you are a helpful..."  ─┐ differ at token 2
       "Hello Ben, you are a helpful..."  ─┘ ──▶ ZERO sharing

    RULE: stable content FIRST, variable content LAST
`),
      },
      {
        title: "Shrinking the Cache: GQA, MQA and Quantization",
        content: `The most durable way to fix a cache problem is to attack it
  at its architectural source, because every downstream problem shrinks with
  it.

  Multi-head attention gives every query head its own key and value heads,
  which maximises capacity and maximises the cache. Multi-query attention
  collapses to a single shared key-value head, cutting the cache by the number
  of heads — a 32× reduction on a 32-head model — at a real quality cost.
  Grouped-query attention is the middle position, sharing key-value heads
  across groups of query heads: with 32 query heads grouped onto 8 key-value
  heads you get a 4× cache reduction with little measurable quality loss,
  which is why essentially every recent model ships with GQA.

  The arithmetic is worth running. Llama-2-7B with MHA holds 512 KB per token.
  The same shape with 8 key-value heads holds 128 KB, and with MQA's single
  head, 16 KB. That difference is the difference between sixteen concurrent
  4k-token sessions and sixty-four of them on the same card.

  Cache quantization is the orthogonal lever: storing K and V at fp8 or int8
  rather than fp16 halves or quarters the cache. Be honest about its quality
  behaviour, because it differs from weight quantization — the cache holds
  activations, whose outlier characteristics are not the same as weights', so
  parity with weight-quantization results should not be assumed and it needs
  separate evaluation on your own workload.`,
        diagram: asciiDiagram(`
  ATTENTION VARIANTS — cache per token, 32-layer model, fp16

    MHA   32 query heads, 32 kv heads   ──▶ 512 KB/token   baseline
          ┌──┐┌──┐┌──┐┌──┐   every query head has its own K,V
          │Q ││Q ││Q ││Q │
          │KV││KV││KV││KV│
          └──┘└──┘└──┘└──┘

    GQA   32 query heads,  8 kv heads   ──▶ 128 KB/token   4× smaller
          ┌──┐┌──┐┌──┐┌──┐   groups of query heads share K,V
          │Q ││Q ││Q ││Q │
          └─┬┘└─┬┘└─┬┘└─┬┘
            └───┴────┴───┘  ──▶ ┌──┐
                                │KV│
                                └──┘

    MQA   32 query heads,  1 kv head    ──▶  16 KB/token   32× smaller
          all query heads share ONE K,V ── real quality cost

    ORTHOGONAL: quantize the cache fp16 ──▶ fp8 (÷2) or int8 (÷2)
                evaluate separately — activations are not weights
`),
      },
      {
        title: "When the Cache Is Full",
        content: `Eventually the cache fills, and what happens next is a
  scheduling decision rather than an allocation one. The scheduler has three
  options and each trades a different resource.

  Admission control queues new requests at the door. This preserves the
  latency of everything already running and pushes the pain into queueing
  delay, which is usually the right default because it degrades predictably.

  Preemption evicts a running request's blocks and recomputes its cache when
  it is rescheduled, trading compute for memory. It keeps the system
  responsive to new arrivals but has a nasty failure mode: under sustained
  overload, aggressive preemption causes thrashing, where requests spend more
  time being recomputed than generating. Preemption rate is therefore the
  early-warning metric to watch — a rising preemption rate means you are past
  capacity, and it shows up well before latency alarms fire.

  Swapping moves blocks to host memory over PCIe, trading bandwidth for
  capacity. It is useful for pausing long-lived sessions but slow enough that
  it is rarely the answer under load.

  Finally, for very long contexts, sliding-window attention and attention
  sinks bound cache growth by keeping only a recent window, optionally
  alongside the first few tokens, which empirically anchor the attention
  distribution. State the cost plainly: this is truncation, so anything
  outside the window is genuinely gone, and it is appropriate for streaming
  and chat but not for tasks that must reason over an entire long document.`,
        diagram: asciiDiagram(`
  WHEN THE CACHE IS FULL — three trades

    ADMISSION CONTROL   queue new requests
                        cost: queueing delay
                        ──▶ predictable degradation, good default

    PREEMPTION          evict a running request, recompute later
                        cost: compute
                        ──▶ watch preemption rate; sustained rise
                            means thrashing and past capacity

    SWAPPING            move blocks to host memory over PCIe
                        cost: bandwidth, high latency
                        ──▶ good for pausing, poor under load

    BOUNDING GROWTH
      sliding window  keep the last W tokens
      attention sink  keep first few tokens + recent window
      cost: truncation is real — outside the window is GONE
`),
      },
    ],

    examples: [
      {
        title: "Computing the concurrency ceiling for a 7B model on one A100",
        input: "Llama-2-7B (32 layers, 32 kv heads, head_dim 128, MHA) served in fp16 on an 80 GB A100. Average session context 4,096 tokens. How many concurrent sessions fit?",
        output: "About 32 sessions. Weights take 14 GB, leaving roughly 64 GB usable after activations and overhead; each 4k session holds 2 GB of cache, so 32 sessions is the ceiling — set by cache, not by compute.",
        explanation: "Step 1: Compute per-token cache. 2 × 32 layers × 32 kv_heads × 128 head_dim × 2 bytes = 524,288 bytes, which is 512 KB per token.\nStep 2: Compute per-session cache at the average context. 4,096 tokens × 512 KB = 2 GB per concurrent session.\nStep 3: Account for what is already resident. Weights are 7B × 2 bytes = 14 GB, and activations plus framework overhead take a few more, so budget about 64 GB for cache on an 80 GB card.\nStep 4: Divide. 64 GB / 2 GB = 32 concurrent sessions. Nothing about compute entered this calculation, which is the point — the ceiling is memory.\nStep 5: Sanity-check the direction of the levers. Doubling average context to 8k halves the ceiling to 16; moving to a GQA model with 8 kv heads quarters the per-token cost and raises the ceiling to roughly 128.\nStep 6: State the operational consequence. Exceeding 32 does not degrade gracefully, it OOMs, so the serving layer needs admission control at that boundary rather than optimistic acceptance.",
      },
      {
        title: "Recovering a lost prefix-cache win",
        input: "A RAG product has a 1,200-token system prompt that is identical for all users except that it opens with 'Hello {first_name}, ' . TTFT is 380 ms at p50 and the team cannot explain why prefix caching shows a near-zero hit rate in vLLM metrics.",
        output: "The personalised greeting is at position zero, so no two requests share an exact token prefix and sharing is impossible. Move the greeting to the end of the system prompt; hit rate should jump to near 100% and TTFT should fall by roughly the prefill time of 1,200 tokens.",
        explanation: "Step 1: Recall the sharing rule. Blocks can be shared only across an exact token-prefix match, because attention is causal and positional, so every key and value after a differing token is different.\nStep 2: Locate the divergence point. The name appears at roughly token 2, which means the prefix match ends at token 1 and the remaining 1,198 tokens must be recomputed per request.\nStep 3: Recognise that this is not a tuning problem. No block size, cache size or eviction policy can recover sharing that is destroyed at position two; the prompt layout is the bug.\nStep 4: Restructure the prompt: stable instructions first, then retrieved context if it is shared, then the per-user greeting and the query last.\nStep 5: Predict the win. 1,200 tokens of prefill on a 7B model runs on the order of 100-150 ms on an A100, so p50 TTFT should drop by most of that, and the shared prefix now occupies one copy of blocks rather than one per concurrent user.\nStep 6: Verify with the metric that already exists. The prefix cache hit rate should move from near zero to near one; if it does not, look for another per-request token earlier in the prompt, such as a timestamp or a request id.",
      },
      {
        title: "Diagnosing throughput collapse under load",
        input: "A serving deployment holds steady at 900 tokens/s until traffic rises about 20%, then throughput falls to 400 tokens/s while GPU utilisation stays high. No OOM errors appear.",
        output: "Preemption thrashing. The scheduler is evicting and recomputing caches faster than requests can finish, so GPU time is being spent on recomputation rather than new tokens. Cap concurrency with admission control and reduce max sequence length or enable cache quantization.",
        explanation: "Step 1: Read the signature. Throughput falling while utilisation stays high means the GPU is busy doing work that is not producing output tokens — recomputation is the usual culprit.\nStep 2: Rule out the obvious alternative. No OOM means allocation is succeeding, so this is not a hard memory wall; it is the scheduler trading compute for memory repeatedly.\nStep 3: Check preemption rate, which is the metric that makes this visible. A sharp rise coinciding with the traffic increase confirms thrashing rather than a slow backend or a network problem.\nStep 4: Understand why the collapse is non-linear. Each preempted request must re-prefill its whole context when rescheduled, so the recomputation load grows faster than the traffic that caused it — a 20% traffic rise can more than halve useful throughput.\nStep 5: Apply admission control first. Queueing new requests at a concurrency cap converts a throughput collapse into a predictable queueing delay, which is a far better failure mode.\nStep 6: Then buy back capacity structurally. Quantizing the cache to fp8 halves its footprint, and lowering the maximum sequence length reduces the worst-case per-request reservation, both of which raise the concurrency at which preemption begins.\nStep 7: Note what would not have helped. Adding compute or a faster GPU addresses neither cause, because the bottleneck was cache capacity expressed as scheduler behaviour.",
      },
    ],

    tips: [
      "State that the query is not cached when you explain the mechanism. It is a one-clause detail that proves you understand attention rather than the acronym.",
      "Quote the cache formula and then immediately work one number with it. 512 KB per token for a 7B model at fp16 is the anchor everything else can be derived from.",
      "Answer 'how many users fit on this GPU' with cache arithmetic, never with parameter count. That reframing is most of the value of this topic.",
      "When asked why PagedAttention is faster, give the chain: less waste, more resident sequences, larger batch, and batching is nearly free in memory-bound decode.",
      "Raise prompt layout whenever prefix caching is discussed. Stable content first, variable content last, is the cheapest large win in LLM serving.",
      "Name the joint scaling of context and concurrency explicitly — doubling both quadruples the cache — because it is the reason long-context features are priced the way they are.",
    ],

    tricks: [
      "If prefix cache hit rate is near zero, look at token two of the prompt, not at the cache configuration. A per-request name, timestamp or request id at the top destroys all sharing.",
      "Throughput falling while GPU utilisation stays high, with no OOM, is preemption thrashing. Check preemption rate before touching anything else.",
      "Before proposing a bigger GPU, compute whether GQA or fp8 cache quantization would have solved it. A 4× cache reduction is often cheaper than a hardware tier.",
      "When someone reports that long conversations feel slower, that is not a bug report to dismiss — decode genuinely slows as the cache grows, because more bytes must be read per token.",
      "Use the cache-versus-weights comparison as a conversation opener in serving design questions. Saying 'at batch 16 and 4k context the cache is over twice the model' reliably shifts the discussion to the real constraint.",
    ],

    memoryAids: [
      "K and V are cached; Q is new every step — that is why it is the KV cache and why the formula starts with a 2.",
      "2 × layers × kv_heads × head_dim × seq_len × batch × bytes.",
      "512 KB per token for a 7B fp16 MHA model; 2 GB for a 4k session; 32 GB at batch 16 against 14 GB of weights.",
      "PagedAttention is virtual memory for the cache: blocks, a page table, allocation on demand.",
      "MHA 512 KB, GQA 128 KB, MQA 16 KB per token — the architectural lever is the biggest one.",
      "Full cache means one of three trades: queue, preempt, or swap.",
    ],

    interviewPatterns: [
      "'What is the KV cache and why does it exist?' — expects quadratic-to-linear, keys and values stored because they do not change, and the query excluded.",
      "'How many concurrent users can one A100 serve for this model?' — expects the size formula worked end to end, with the ceiling set by cache rather than compute.",
      "'What is PagedAttention and why does it improve throughput?' — expects the fragmentation problem, the OS virtual-memory analogy, and the chain from recovered memory to larger batches to throughput.",
      "'Our TTFT is high even though the system prompt never changes. What would you look at?' — expects prefix caching, the exact-prefix-match rule, and prompt layout as the fix.",
      "'Why did throughput collapse when traffic rose slightly?' — expects preemption thrashing and admission control, not a request for more hardware.",
      "Frequency and companies: very high for inference-serving, ML-platform and infrastructure roles at OpenAI, Anthropic, Meta, NVIDIA, Databricks, Together, Fireworks and Baseten. The sizing calculation in particular is a standard whiteboard exercise because it has one right answer and it exposes immediately whether a candidate has run a serving system.",
    ],

    faq: [
      {
        question: "Why is the query not cached alongside the keys and values?",
        answer: "Because the query belongs to the token currently being generated, and there is a new one at every step, so there is nothing to reuse. Keys and values, by contrast, belong to tokens already in the sequence, and because the model is causal they never change once computed — token 5's key is the same whether the sequence is 6 tokens long or 600. That asymmetry is the entire justification for the cache. It also explains the factor of 2 rather than 3 in the size formula, and it is a reliable follow-up question because someone who has only memorised the name will often say all three tensors are stored.",
        category: "mechanics",
      },
      {
        question: "Why does batching hit an out-of-memory error instead of just getting slower?",
        answer: "Because each additional concurrent sequence requires its own slab of KV cache, and that memory is claimed up front as the sequence grows rather than borrowed from a shared pool. Compute can be time-shared — more work simply takes longer — but memory cannot, so when the sum of resident caches plus weights plus activations exceeds device memory the allocation fails outright. This is why serving systems need an explicit concurrency limit derived from cache arithmetic. A well-configured system queues at that limit and degrades into latency; a naive one accepts the request and crashes, which is a far worse failure mode for the same underlying condition.",
        category: "capacity",
      },
      {
        question: "How much memory does PagedAttention actually recover?",
        answer: "It depends on the gap between reserved and used length, which is why the reported figures vary so widely. In deployments with variable output lengths, where buffers must be sized for the maximum but most responses are short, naive contiguous allocation commonly wastes the majority of cache memory, and paging recovers most of that — leaving at most one partially filled block per request. Where every request runs close to the maximum length, the waste was small to begin with and paging gains little. The important part of the answer in an interview is the mechanism rather than a headline percentage: less waste means more resident sequences, which means a larger effective batch, and batching is nearly free during memory-bound decode.",
        category: "optimisation",
      },
      {
        question: "Why does prefix caching require an exact token match rather than similar text?",
        answer: "Because attention is causal and positional: the key and value for token k are computed from the hidden state at position k, which depends on every token before it. Change one token anywhere in the prefix and every key and value from that position onward is different, so nothing after the divergence can be reused — even if the remaining text is character-for-character identical. This is also why matching happens on tokens rather than characters: two strings that look similar may tokenise differently, and it is the token sequence that determines the computation. The practical rule that falls out is to place stable content first and per-request content last.",
        category: "optimisation",
      },
      {
        question: "Should I quantize the KV cache the way I quantize weights?",
        answer: "It is a legitimate and commonly used lever — fp8 or int8 halves or quarters cache memory, directly raising concurrency — but do not assume the quality results transfer from weight quantization. Weights are static and can be calibrated offline against a known distribution; the cache holds activations, which are input-dependent and have different outlier behaviour, so degradation patterns differ and need to be measured on your own traffic. Evaluate with a suite that includes long contexts, since error accumulates over a long cache, and include any accuracy-critical paths such as code or arithmetic. Treat the decision as workload-specific rather than a global default.",
        category: "optimisation",
      },
      {
        question: "What is the difference between GQA and MQA, and why did models move to GQA?",
        answer: "Multi-query attention collapses all key-value heads into one shared head, which shrinks the cache by the number of heads — a 32× reduction on a 32-head model — but measurably costs quality because every query head is forced to attend through the same key-value representation. Grouped-query attention shares key-value heads across groups of query heads instead, so 32 query heads mapped onto 8 key-value heads gives a 4× cache reduction while keeping quality close to full multi-head attention. Models converged on GQA because it captures most of the memory benefit at very little quality cost, and because the cache, not the parameter count, is what limits serving concurrency in practice.",
        category: "architecture",
      },
      {
        question: "Why do long conversations feel slower than short ones?",
        answer: "Because decode is memory-bandwidth-bound and the cache grows with the conversation. Every generated token requires reading the model weights plus the entire accumulated cache for that sequence, so as the context lengthens there are simply more bytes to stream per token and the inter-token latency rises. It is not a bug or a queueing artefact, it is the mechanism working as designed, and it is worth stating plainly because users notice it and product teams often misfile it. The mitigations are architectural or lossy: GQA and cache quantization reduce the bytes per token, while sliding-window attention bounds the cache at the cost of genuinely discarding older context.",
        category: "performance",
      },
    ],

    practiceProblems: [
      "Compute the per-token KV cache for Llama-3-70B in fp16 (80 layers, 8 kv heads via GQA, head_dim 128) and the maximum concurrent 8k-token sessions on a single 80 GB H100. ANSWER: per token is 2 × 80 × 8 × 128 × 2 = 327,680 bytes, or 320 KB. An 8,192-token session holds 8,192 × 320 KB ≈ 2.6 GB. Weights at fp16 are 140 GB, which already exceeds one card, so the model must be sharded across at least two H100s; on a 2×80 GB node with 140 GB of weights there is roughly 15-18 GB left for cache, giving about 6 concurrent 8k sessions. The lesson is that at 70B the weights dominate and cache capacity becomes desperately tight, which is why 70B serving is usually 4-GPU.",
      "A model uses MHA with 32 kv heads. Switching to GQA with 8 kv heads is proposed. Quantify the effect on concurrency and name the cost. ANSWER: cache per token falls 4×, so at fixed memory the number of concurrent sessions rises roughly 4× — from 32 to about 128 in the 7B, 4k-context example. The cost is that this is an architectural change, not a serving flag: it requires a model trained or converted with GQA, so it is a model-selection decision rather than a deployment tuning knob. The quality cost of GQA relative to MHA is small, which is why nearly all recent models ship this way.",
      "Prefix cache hit rate is 4%. The prompt is: a 40-token greeting containing the user's name, then a 1,500-token fixed policy document, then the user question. Diagnose and fix. ANSWER: the greeting at position zero contains a per-user token, so the exact-prefix match ends within the first few tokens and the 1,500-token policy document is recomputed for every request. Reorder to put the policy document first, then the greeting, then the question. Hit rate should approach 100% on the document, removing roughly 1,500 tokens of prefill per request from TTFT and collapsing N copies of those blocks into one.",
      "Your scheduler reports a preemption rate rising from 0.5% to 18% over an hour while p99 latency is still within SLO. What do you do and why now? ANSWER: act immediately, because preemption rate is a leading indicator and latency is a lagging one. An 18% preemption rate means nearly one request in five is having its cache discarded and re-prefilled, which is compute spent producing no tokens, and the feedback loop is non-linear — recomputation load grows faster than the traffic causing it, so throughput collapses shortly after this point. Apply admission control to cap concurrency, then buy structural headroom with fp8 cache quantization or a lower max sequence length.",
      "Explain in under sixty seconds why PagedAttention improves throughput, without using the word 'efficient'. ANSWER: naive serving reserves one contiguous cache buffer per request sized for the longest response it might produce, and most responses are much shorter, so most of that reservation is never used. PagedAttention splits the cache into fixed blocks with a per-request block table and allocates blocks only as the sequence actually grows, so waste is at most one partial block. The recovered memory holds more sequences concurrently, which makes the effective batch larger, and because decode is memory-bandwidth-bound the extra batch members ride along on weight reads that were already happening. Memory recovered therefore converts almost directly into tokens per second.",
    ],

    references: [
      {
        source: "paper",
        attribution: "Kwon et al., 'Efficient Memory Management for Large Language Model Serving with PagedAttention', SOSP 2023, arXiv:2309.06180.",
        insight: "The vLLM paper. Establishes the fragmentation measurement that motivates paging, and makes the virtual-memory analogy explicit, including block sharing with copy-on-write as the basis for prefix caching.",
      },
      {
        source: "paper",
        attribution: "Ainslie et al., 'GQA: Training Generalized Multi-Query Transformer Models from Multi-Head Checkpoints', arXiv:2305.13245 (2023).",
        insight: "The source for grouped-query attention and the reason modern models adopted it: most of MQA's cache reduction with quality close to full multi-head attention, obtainable by uptraining an existing checkpoint.",
      },
      {
        source: "paper",
        attribution: "Shazeer, 'Fast Transformer Decoding: One Write-Head is All You Need', arXiv:1911.02150 (2019).",
        insight: "The original multi-query attention proposal, and the cleanest statement of why decoding is bounded by memory traffic over the cache rather than by arithmetic. Predates the current serving era and predicted its central constraint.",
      },
      {
        source: "paper",
        attribution: "Xiao et al., 'Efficient Streaming Language Models with Attention Sinks', arXiv:2309.17453 (2023).",
        insight: "Explains why keeping the first few tokens alongside a sliding window preserves stability in long streaming contexts, and is the reference for bounding cache growth without a naive truncation collapse.",
      },
      {
        source: "note",
        attribution: "vLLM documentation: automatic prefix caching and scheduler metrics. https://docs.vllm.ai/en/latest/",
        insight: "The practical side of this topic — how prefix caching is enabled, what the hit-rate and preemption metrics are called, and how the concurrency limit interacts with cache capacity in a system you would actually deploy.",
      },
    ],
  },
  {
    id: "topic-ai-llmops-serving-options",
    moduleId: "mod-ai-llmops",
    title: "Serving Options: Managed APIs vs Self-Hosted Inference",

    intuition: `The instinct is to compare a provider's price per million
  tokens against the hourly cost of a GPU, notice the GPU looks cheaper at
  volume, and conclude that self-hosting wins once you are big enough. That
  comparison is wrong in a specific and important way: you rent tokens, but
  you buy time. A provider charges only for tokens you actually consume, while
  a GPU costs the same whether it is saturated or idle at three in the
  morning. So the real question is never "which is cheaper per token" — it is
  "what fraction of the hour will this GPU be busy?" Below a utilisation
  threshold you can compute on a whiteboard, managed APIs win on pure
  economics and it is not close. Above it, self-hosting wins, and then the
  decision turns on whether you can absorb the operational burden the sticker
  price hides.`,

    complexity: {
      time: "The serving choice sets your latency floor and your ability to control it. Managed APIs add a network round-trip plus queueing you cannot see or tune — typically 100-500 ms of time-to-first-token depending on region, model and current provider load, with a p99 that moves for reasons you will never be told. Self-hosted inference removes the network hop and gives you the scheduler, so TTFT can reach tens of milliseconds and, more importantly, p99 becomes yours to control through batching and admission policy. The counterweight is cold start: a scale-to-zero self-hosted deployment pays 30 seconds to several minutes to load tens of GB of weights, which is why self-hosting suits steady traffic and suits bursty traffic badly.",
      space: "This is a capital-and-utilisation question rather than a memory one. A managed API has no fixed footprint — you hold no weights and provision nothing, and cost scales exactly with tokens consumed. Self-hosting requires enough VRAM for weights plus KV cache plus activations before serving a single request: a 70B model at fp16 needs about 140 GB of weights alone, so two 80 GB accelerators minimum and realistically four once KV cache is accounted for. That capacity is committed continuously, so the meaningful figure is cost per utilised hour. At 10% utilisation a self-hosted deployment costs roughly ten times its nominal rate per unit of work delivered, and that arithmetic decides most real cases."
    },

    lesson: [
      {
        title: "The Spectrum, and What Each Option Is Actually For",
        content: `Treat the options as a spectrum rather than a binary, and be
  precise about what each one is for, because conflating a laptop runtime with
  a production serving engine is a visible and common mistake.

  Managed frontier APIs give you the strongest models with zero
  infrastructure, per-token pricing, and no control over the model or its
  lifecycle. Managed open-model hosting keeps the no-operations property while
  widening model choice — someone else runs open weights for you, which
  matters when you need a specific open model but not a GPU fleet.

  Self-hosted production engines — vLLM, TGI, TensorRT-LLM — are real serving
  infrastructure: continuous batching, paged KV cache, high concurrency,
  observable scheduling. When someone says "self-hosting" in a production
  sentence, this is what they mean.

  Local runtimes such as llama.cpp and Ollama are a different category
  entirely: single-user, laptop and edge, CPU or a small GPU, usually
  quantized. They are excellent for development, prototyping and offline
  demos, and they are not multi-tenant production servers. Proposing Ollama as
  a production serving tier is the single fastest way to signal you have not
  run one of these systems, and the distinction between those last two
  categories is exactly what interviewers are listening for.`,
        diagram: asciiDiagram(`
  THE SERVING SPECTRUM

    managed ◀──────────────────────────────────────▶ self-hosted
    no ops                                          full control

    ┌────────────┬────────────┬────────────┬────────────┐
    │ frontier   │ managed    │ vLLM / TGI │ llama.cpp  │
    │ API        │ open model │ TensorRT   │ Ollama     │
    ├────────────┼────────────┼────────────┼────────────┤
    │ best model │ open       │ production │ dev / edge │
    │ zero ops   │ weights    │ serving    │ single     │
    │ per-token  │ no ops     │ you own it │ user       │
    └────────────┴────────────┴────────────┴────────────┘
                                ▲              ▲
                      production serving   NOT a production
                                            server ⚠️
`),
      },
      {
        title: "The Utilisation Crossover, Derived",
        content: `Do not assert a threshold — derive it, because the
  derivation is the transferable skill and the specific prices drift every
  quarter. Treat every number below as a snapshot to be re-derived with
  current figures.

  Step one, establish self-hosted throughput. Take Llama-3-70B served with
  vLLM on four A100 80 GB cards, which sustains roughly 1,200 output tokens
  per second under continuous batching at realistic concurrency.

  Step two, convert to cost at saturation. 1,200 tokens/s is 4.32 million
  tokens per hour. At about $12 per hour for the four-GPU instance, that is
  $12 / 4.32 = roughly $2.78 per million output tokens — and this is the
  theoretical best case, achievable only if the GPUs never idle.

  Step three, compare against a provider. A frontier-class API at
  approximately $10 per million output tokens is about 3.6× the saturated
  self-hosted figure, which is where the naive analysis stops and declares
  victory.

  Step four, apply the correction that matters: divide the self-hosted figure
  by actual utilisation. At 50% it becomes $5.56, still ahead. At 25% it is
  $11.12 and the provider has already won. Break-even is $2.78 / $10, which is
  27.8% sustained utilisation.

  Then the point that makes this real: traffic is diurnal. A workload that
  peaks at 9am and idles overnight may average 15% utilisation even though the
  peak looks saturated and feels cheap. Sizing for peak and paying for trough
  is exactly how self-hosting loses money while looking cheaper on the
  spreadsheet, and it is why the honest answer to "should we self-host" always
  begins with "what does your utilisation curve look like?"`,
        diagram: asciiDiagram(`
  WHY COST-PER-TOKEN COMPARISONS MISLEAD

    You RENT tokens ──▶ pay only for what you consume
    You BUY  time   ──▶ pay whether busy or idle

    effective cost per 1M tokens, self-hosted
    = (instance $/hr ÷ tokens per hr at saturation) ÷ utilisation
                                                       ▲
                                      the term everyone forgets

    WORKED: 70B on 4× A100, ~$12/hr, ~1,200 tok/s
            = 4.32M tokens/hr ──▶ $2.78 per 1M at saturation
            provider ≈ $10 per 1M ──▶ break-even at 27.8%

    ┌──────────────┬───────────────────┬──────────────────────────┐
    │ utilisation  │ effective cost    │ verdict                  │
    ├──────────────┼───────────────────┼──────────────────────────┤
    │ 100%         │  $2.78 / 1M       │ self-host wins clearly   │
    │  50%         │  $5.56 / 1M       │ self-host still ahead    │
    │  28%         │ $10.00 / 1M       │ break-even               │
    │  10%         │ $27.80 / 1M       │ managed API wins         │
    └──────────────┴───────────────────┴──────────────────────────┘

    DIURNAL TRAP
      peak 09:00   ──▶ looks saturated, feels cheap
      trough 03:00 ──▶ idle, still billed
      daily average often 10-20% ──▶ the number that bills you
`),
      },
      {
        title: "The Reasons That Override the Math",
        content: `Several drivers legitimately decide this question regardless
  of where utilisation lands, and naming them is how you show the arithmetic
  is a tool rather than the whole answer.

  Data residency and privacy come first because they are frequently not
  negotiable. Regulated data that cannot leave your boundary rules out
  managed APIs outright, and no cost analysis overturns a compliance
  constraint.

  Latency floor matters when you are inside a tight interactive budget or
  calling the model many times per user action, as agent loops do. Removing a
  100-300 ms network hop from a ten-call agent trajectory is one to three
  seconds of wall-clock, which is the difference between a usable feature and
  an abandoned one.

  Model control is decisive when you serve fine-tuned or domain-adapted
  weights that no provider hosts — the LoRA multi-tenant serving pattern
  simply does not exist behind a managed frontier API.

  Deprecation risk is the one teams underrate. Providers retire models on
  their own schedule, and a retirement forces an unplanned migration plus a
  full re-evaluation of every prompt you have tuned. Self-hosted weights are
  yours until you choose to move.

  Predictable spend is sometimes worth more to a business than a lower
  variable bill, particularly where budgets are committed annually.

  Pushing the other way are the hidden costs the naive comparison omits
  entirely: on-call for a stateful GPU service, capacity planning, driver and
  CUDA version management, model update qualification, and the engineer-months
  to build what a provider hands you on day one. A rough rule that survives
  scrutiny is that a production self-hosted tier is a standing commitment of
  at least part of an engineer, and that cost belongs in the comparison.`,
        diagram: asciiDiagram(`
  DRIVERS THAT OVERRIDE THE ARITHMETIC

    ──▶ SELF-HOST regardless of utilisation
        data residency        regulated data cannot leave the boundary
        latency floor         no network hop; matters ×N in agent loops
        model control         your fine-tuned weights, LoRA multi-tenant
        deprecation risk      providers retire models on their schedule
        predictable spend     fixed bill beats a lower variable one

    ──▶ STAY MANAGED regardless of utilisation
        on-call burden        stateful GPU service, nights and weekends
        capacity planning     size for peak, pay for trough
        driver/CUDA churn     version qualification is continuous work
        model qualification   every upgrade needs a re-evaluation
        opportunity cost      engineer-months to rebuild day-one features

    Rule of thumb: budget at least a fraction of a full-time engineer
    as a standing cost of the self-hosted tier, and put it in the model.
`),
      },
      {
        title: "The Hybrid Pattern, and How to Say It",
        content: `Most mature deployments are not pure, and saying so is
  usually the strongest available answer.

  Two shapes recur. Self-host the high-volume commodity workload — the
  classification, extraction and summarisation traffic where volume is steady
  and utilisation is genuinely high — and route the low-volume hard tail to a
  frontier API, where you pay a premium only on the small fraction of requests
  that need it. Or self-host the latency-critical interactive path and send
  batch and offline work to providers, where a slower p99 costs nothing.

  Routing is the mechanism that makes this work, and a gateway is what makes
  it switchable: one internal interface, provider selection behind it, so a
  migration is a configuration change rather than a rewrite of every call
  site. That gateway is also where you put per-route cost telemetry, which is
  what tells you whether the utilisation assumption still holds.

  The interview framing is worth rehearsing. The strong answer starts managed,
  instruments token volume and utilisation from day one, and defines in
  advance the measured threshold that would trigger a migration — "when
  sustained utilisation on this workload exceeds roughly 30%, and volume is
  stable for a quarter, we self-host it". That reads as an engineer who has
  operated the decision. "We would self-host for cost", with no arithmetic and
  no threshold, reads as someone who has not.`,
        diagram: asciiDiagram(`
  HYBRID SERVING — the shape most mature systems converge on

                        ┌─────────────────┐
        all requests ──▶│  LLM gateway    │
                        │  one interface  │
                        └────────┬────────┘
                                 │ route on task, cost, latency
                 ┌───────────────┼────────────────┐
                 ▼               ▼                ▼
        ┌────────────────┐ ┌────────────┐ ┌──────────────┐
        │ self-hosted    │ │ managed    │ │ managed      │
        │ open model     │ │ frontier   │ │ batch tier   │
        │ high volume    │ │ hard tail  │ │ offline work │
        │ steady, ~70%   │ │ low volume │ │ latency-lax  │
        │ utilisation    │ │ premium OK │ │ cheapest     │
        └────────────────┘ └────────────┘ └──────────────┘

    the gateway is what makes the choice reversible
    per-route telemetry is what tells you when to revisit it
`),
      },
    ],

    examples: [
      {
        title: "Deriving the break-even utilisation from scratch",
        input: "A team serves 400M output tokens per month through a frontier API at about $10 per million, spending roughly $4,000/month. They propose self-hosting Llama-3-70B on 4× A100 at about $12/hour, arguing the instance costs $8,640/month but 'we would get way more tokens for it'. Evaluate.",
        output: "Break-even is about 28% sustained utilisation. At 400M tokens/month they would run at roughly 13%, making the effective self-hosted cost about $21 per million — twice what they pay now. Stay managed and re-evaluate at 3-4× the volume.",
        explanation: "Step 1: Establish saturated throughput. Llama-3-70B on 4× A100 with vLLM sustains roughly 1,200 output tokens per second under continuous batching, which is 4.32M tokens per hour.\nStep 2: Compute the saturated cost. $12/hour ÷ 4.32M tokens = about $2.78 per million output tokens, the best case if the cluster never idles.\nStep 3: Compute break-even against the provider. $2.78 / $10 = 27.8% sustained utilisation. Below that, managed wins purely on cost.\nStep 4: Compute their actual utilisation. The cluster can produce 4.32M × 730 hours ≈ 3.15B tokens per month; they need 400M, which is 12.7%.\nStep 5: Convert to effective cost. $2.78 / 0.127 = about $21.90 per million, against $10 today — self-hosting would roughly double their bill.\nStep 6: Note what the naive comparison missed. Comparing $8,640 of instance cost against $4,000 of API spend already showed this, but the team framed it as 'more tokens for the money' without asking whether they would use them.\nStep 7: Give the trigger rather than a flat no. At about 1.1B tokens per month they cross 28% and the arithmetic flips, so instrument monthly token volume and revisit at that threshold.",
      },
      {
        title: "A case where the arithmetic loses to a constraint",
        input: "A hospital system wants an LLM over clinical notes. Volume is modest — perhaps 30M tokens per month — so managed hosting is far cheaper on paper. Legal requires that patient data never leaves the institutional network.",
        output: "Self-host, despite losing the cost comparison by a wide margin. Data residency is a hard constraint, so the real decision is which self-hosted configuration minimises cost and operational burden, not whether to self-host.",
        explanation: "Step 1: Identify the constraint class. Data residency is a compliance requirement, not a preference, so it is evaluated before economics rather than traded against them.\nStep 2: Confirm no managed option satisfies it. A provider with a signed agreement and in-region processing may satisfy some policies, so check whether the requirement is 'in our country' or 'inside our network' — only the latter forces self-hosting.\nStep 3: Given the stricter reading, accept that utilisation will be poor. 30M tokens per month against a cluster capable of billions is low single-digit utilisation, and the effective per-token cost will be high.\nStep 4: Minimise the committed capacity instead. Pick the smallest model that clears the quality bar — an 8B or 13B on a single GPU rather than a 70B on four — since the fixed cost is what dominates at low utilisation.\nStep 5: Consider batching the workload. Clinical summarisation is rarely interactive, so scheduling work into windows raises utilisation during those windows and allows the cluster to be smaller.\nStep 6: Budget the operational cost explicitly. On-call, driver management and model qualification are real, and in a regulated environment the qualification burden is heavier, so present that as part of the proposal rather than discovering it later.",
      },
      {
        title: "Designing the hybrid split for a mixed workload",
        input: "A product has three LLM workloads: 900M tokens/month of document classification, 40M tokens/month of complex multi-step reasoning for enterprise customers, and an overnight batch enrichment job of 300M tokens with no latency requirement.",
        output: "Self-host the classification, keep reasoning on a frontier API, and put the batch job on a provider's discounted batch tier. Route all three through one gateway so each decision is reversible.",
        explanation: "Step 1: Separate the workloads by their actual requirements rather than treating LLM usage as one line item. Classification is high-volume and simple; reasoning is low-volume and quality-critical; batch is high-volume and latency-insensitive.\nStep 2: Evaluate classification for self-hosting. 900M tokens per month is steady daytime traffic that a single-GPU 8B model can serve, giving genuinely high utilisation, and classification quality is achievable with a small open model.\nStep 3: Reject self-hosting the reasoning workload. It is 40M tokens against a frontier-quality requirement — low utilisation and the largest quality gap, which is the worst possible case for self-hosting on both axes.\nStep 4: Route the batch job to a provider batch tier, which typically prices at a substantial discount for relaxed latency. Self-hosting it would mean provisioning capacity that sits idle all day for a job that runs at night.\nStep 5: Consider whether the batch job could instead fill the self-hosted cluster's overnight trough, which is the one case where a poor utilisation curve is fixable — this raises self-hosted utilisation and may beat the batch tier.\nStep 6: Put everything behind a gateway with per-route cost telemetry, so each of the three decisions is a configuration change and you can see immediately when a route's economics shift.\nStep 7: Write down the revisit triggers. Reasoning volume crossing roughly 10× would justify re-running the arithmetic, and so would a provider price change.",
      },
    ],

    tips: [
      "Never answer this question with a per-token comparison alone. The sentence that separates a good answer from a weak one is 'divided by utilisation'.",
      "Derive the crossover live rather than quoting a threshold. Throughput, instance rate, provider price, then divide — the method survives price changes, the number does not.",
      "Ask about the traffic shape early. Diurnal traffic averaging 15% utilisation is the most common reason a self-hosting proposal is wrong.",
      "Distinguish vLLM/TGI/TensorRT-LLM from llama.cpp/Ollama explicitly. Proposing a local runtime as a production tier undermines everything else you say.",
      "Name the non-cost overrides — residency, latency floor, model control, deprecation risk — so the arithmetic reads as one input rather than the whole decision.",
      "Close with a measured migration trigger. 'Start managed, instrument utilisation, self-host above roughly 30% sustained' is the answer of someone who has run this.",
    ],

    tricks: [
      "Convert any proposal into effective cost per utilised million tokens before debating it. It collapses most arguments in one line of arithmetic.",
      "Check whether a batch workload can fill a self-hosted cluster's overnight trough. It is the only cheap way to fix a bad utilisation curve, and it can flip a losing case.",
      "When residency is cited, ask whether the requirement is in-region or in-network. In-region is often satisfiable by a provider agreement and does not force self-hosting.",
      "Put the standing engineer cost in the model explicitly. A self-hosted tier that looks $2,000/month cheaper is not cheaper if it consumes a quarter of an engineer.",
      "If a team wants to self-host for latency, measure how many model calls one user action makes. Removing 200 ms once is marginal; removing it ten times in an agent loop is a product change.",
    ],

    memoryAids: [
      "You rent tokens, you buy time.",
      "Effective cost = saturated cost ÷ utilisation. The divisor is the whole topic.",
      "70B on 4× A100: ~1,200 tok/s, ~$12/hr, ~$2.78 per 1M saturated; break-even near 28% against a $10 provider.",
      "Diurnal traffic: peak looks saturated, average bills you.",
      "vLLM, TGI, TensorRT-LLM are production; llama.cpp and Ollama are development.",
      "Four overrides: residency, latency, model control, deprecation risk.",
    ],

    interviewPatterns: [
      "'Should we self-host or use an API?' — expects the utilisation framing and a derived break-even, not a per-token comparison or a preference.",
      "'At what scale does self-hosting make sense?' — expects a threshold expressed in sustained utilisation with the arithmetic behind it, plus the observation that traffic shape decides it.",
      "'What would you use to serve an open-weights model in production?' — expects vLLM, TGI or TensorRT-LLM, and a candidate who names Ollama here has answered a different question.",
      "'What are the risks of depending on a provider?' — expects model deprecation forcing unplanned migration and re-evaluation, alongside pricing and rate-limit exposure.",
      "'How would you structure this so the decision is reversible?' — expects a gateway with one internal interface, per-route telemetry, and routing as the switching mechanism.",
      "Frequency and companies: very high in AI-platform, infrastructure and staff-level product interviews at Meta, Databricks, Snowflake, Stripe, Notion and AI startups generally. It is popular precisely because it separates candidates who reason about utilisation from those who compare sticker prices.",
    ],

    faq: [
      {
        question: "Isn't self-hosting always cheaper at sufficient volume?",
        answer: "At sufficient sustained utilisation, yes — but volume and utilisation are not the same thing, and conflating them is the central error. A workload can be enormous in monthly tokens while averaging 12% utilisation because it is concentrated in business hours, and at 12% the effective per-token cost is more than eight times the saturated figure. The correct statement is that self-hosting wins above a break-even utilisation you can derive in three lines: saturated cost equals instance rate divided by tokens per hour, and break-even equals saturated cost divided by provider price. Then ask what fraction of the day the cluster is actually busy, because that is the number that bills you.",
        category: "economics",
      },
      {
        question: "How do I estimate sustained throughput for a self-hosted model?",
        answer: "Start from the model and hardware, then adjust for the serving engine. As a snapshot anchor, a 70B model at fp16 across four A100 80 GB cards under vLLM with continuous batching sustains on the order of 1,200 output tokens per second at realistic concurrency, and an 8B model on a single A100 sustains a few thousand. These figures move with engine version, quantization, sequence length and batch composition, so treat them as a starting estimate and measure your own workload before committing capital. The important discipline is to use a sustained figure under concurrency, not a single-stream benchmark, because single-stream numbers understate throughput by an order of magnitude and will make self-hosting look far worse than it is.",
        category: "capacity",
      },
      {
        question: "What is wrong with using Ollama in production?",
        answer: "It is built for a different problem. Local runtimes such as Ollama and llama.cpp target single-user, laptop and edge use — they are excellent at making a quantized model easy to run on modest hardware, and they are genuinely useful for development and offline demos. What they do not provide is the machinery a multi-tenant server needs: continuous batching, paged KV cache, admission control, prefix sharing, and the scheduling metrics you need to operate under load. Serving concurrent production traffic through one is how you get poor throughput, unpredictable latency and no visibility into why. Use them for development and use vLLM, TGI or TensorRT-LLM for serving.",
        category: "tooling",
      },
      {
        question: "How serious is model deprecation risk in practice?",
        answer: "Serious enough to belong in the decision, because providers retire models on their own schedule and the cost is not just swapping an identifier. Prompts tuned against a specific model's behaviour need re-tuning, evaluation suites need re-running, few-shot examples may need reselecting, and any behaviour your product depends on that was never in the spec may simply change. Teams have been forced into unplanned migrations on a provider's timeline rather than their own. The mitigations are to keep an evaluation suite you can re-run cheaply, to route through a gateway so the model identifier is configuration, and to hold a self-hosted open-weights fallback for the paths where a forced migration would be most expensive.",
        category: "risk",
      },
      {
        question: "Does self-hosting actually improve latency?",
        answer: "It removes the network round-trip and gives you the scheduler, which is a real and controllable improvement — TTFT can drop from a provider's typical 100-500 ms to tens of milliseconds, and more importantly p99 becomes something you own through batching and admission policy rather than something that moves for unexplained reasons. The size of the win depends on how many model calls one user action makes: removing 200 ms once is marginal, while removing it from each of ten steps in an agent loop is a two-second product change. The counterweight is cold start — a scale-to-zero deployment pays 30 seconds to several minutes to load weights — so self-hosting suits steady traffic and suits bursty traffic badly.",
        category: "performance",
      },
      {
        question: "What does a hybrid deployment actually look like?",
        answer: "One internal gateway interface with routing behind it. The usual shape is to self-host the high-volume commodity workload where utilisation is genuinely steady — classification, extraction, summarisation — while routing the low-volume hard tail to a frontier API and sending latency-insensitive bulk work to a provider's discounted batch tier. Each route carries its own cost telemetry, so you can see when a workload's economics shift rather than discovering it in a quarterly bill. The gateway is what makes each decision reversible: changing a route becomes a configuration change instead of a rewrite of every call site, which is what allows you to start managed and migrate individual workloads as they cross the threshold.",
        category: "architecture",
      },
    ],

    practiceProblems: [
      "An 8B model on a single A100 at $3/hour sustains about 2,500 output tokens per second. A managed host offers a comparable open model at $0.20 per million tokens. Should you self-host, and at what utilisation? ANSWER: saturated throughput is 9M tokens/hour, so saturated cost is $3 / 9 = $0.33 per million — already above the managed price of $0.20 even at 100% utilisation. Self-hosting can never win on cost here, at any volume, and the correct answer is to stay managed unless a non-cost driver such as data residency or model control applies. This is a common and underappreciated result: small open models are hosted so competitively that the crossover does not exist.",
      "Your cluster shows 85% utilisation from 09:00 to 18:00 on weekdays and near zero otherwise. Compute the true average utilisation and its effect on effective cost. ANSWER: 45 busy hours out of 168 in a week at 85% gives 45 × 0.85 = 38.25 effective hours, or 22.8% average utilisation. Effective cost is therefore the saturated figure divided by 0.228, roughly 4.4× the best case — so a $2.78 saturated cost becomes about $12.20 per million. Against a $10 provider this workload loses despite peaks that look saturated, which is exactly the diurnal trap. The fix is either to shrink the cluster and accept queueing at peak, or to move batch work into the overnight trough.",
      "A team wants to self-host to cut latency for an agent that makes 12 model calls per user action, currently through an API with 250 ms TTFT. Quantify the potential win. ANSWER: 12 calls × roughly 250 ms of network and provider queueing is about 3 seconds of the user-visible trajectory that is not generation at all. Self-hosting could reduce per-call TTFT to tens of milliseconds, recovering on the order of 2.5 seconds per action — a product-level change rather than a micro-optimisation. This is the case where latency legitimately overrides the utilisation arithmetic, and it should be argued on the multiplied figure, not on the single-call difference.",
      "You are asked for a migration plan from a managed API to self-hosting. Give the plan and the trigger. ANSWER: start by instrumenting token volume, utilisation and per-route cost behind a gateway, so every workload has its own numbers. Define the trigger in advance: sustained utilisation above the derived break-even — near 30% in the worked example — held for a quarter, on a workload whose quality is met by an open model. Migrate one workload first, keeping the managed route as an instant fallback through the gateway. Qualify the open model against the existing evaluation suite before switching traffic, then shift a small percentage and compare cost and latency in production before completing the move.",
      "Name three situations where you would self-host even though the arithmetic favours a managed API, and one where you would stay managed even though the arithmetic favours self-hosting. ANSWER: self-host when regulated data cannot leave your network, when you serve fine-tuned or LoRA-adapted weights no provider hosts, and when an agent loop multiplies network latency into seconds of user-visible delay. Stay managed when the team has no capacity to carry on-call for a stateful GPU service — the arithmetic that ignores the standing engineer cost and the operational risk of a service nobody can page for is incomplete, and a marginal cost win is not worth an unstaffed production dependency.",
    ],

    references: [
      {
        source: "note",
        attribution: "vLLM project documentation and performance guides. https://docs.vllm.ai/en/latest/",
        insight: "The reference implementation for production self-hosted serving, and the source for realistic sustained-throughput expectations under continuous batching rather than misleading single-stream benchmarks.",
      },
      {
        source: "note",
        attribution: "Hugging Face Text Generation Inference (TGI) documentation. https://huggingface.co/docs/text-generation-inference",
        insight: "The main alternative production engine, useful for understanding which serving features are table stakes — continuous batching, paged cache, streaming, quantization support — versus engine-specific differentiators.",
      },
      {
        source: "note",
        attribution: "NVIDIA TensorRT-LLM documentation. https://nvidia.github.io/TensorRT-LLM/",
        insight: "The highest-performance option on NVIDIA hardware and the clearest illustration of the trade-off self-hosting actually presents: more throughput per GPU in exchange for a compilation step and tighter hardware coupling.",
      },
      {
        source: "note",
        attribution: "Cloud GPU on-demand pricing pages (AWS, GCP, Azure, Lambda, CoreWeave), consulted as a snapshot.",
        insight: "The instance-rate input to the break-even derivation. Worth citing as a snapshot rather than a constant, since rates move quarterly and the derivation, not the number, is what transfers.",
      },
      {
        source: "note",
        attribution: "Provider pricing and batch-tier documentation from major model APIs, consulted as a snapshot.",
        insight: "The other half of the crossover calculation, and the source for the hybrid pattern's third route: discounted batch tiers price latency-insensitive bulk work well below interactive rates.",
      },
    ],
  },
];

