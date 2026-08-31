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
  {
    id: "topic-ai-llmops-batching-throughput",
    moduleId: "mod-ai-llmops",
    title: "Batching and Throughput: Static, Dynamic and Continuous Batching, Prefill vs Decode, Chunked Prefill and Disaggregated Serving",
    complexity: {
      time: "Throughput = batch_size / latency_per_batch. Latency per batch is nearly flat while decode stays memory-bandwidth-bound, then grows roughly linearly with batch_size once the compute-bound threshold is crossed. The operating point is the largest batch_size whose P99 TTFT and P99 TPOT still sit inside the SLA.",
      space: "VRAM per replica = model_weights + (batch_size x per_sequence_KV_at_max_context) + activation overhead. In virtually every production deployment the batch is VRAM-bounded long before it is compute-bounded, so max_batch = (VRAM - weights - overhead) / per_sequence_KV.",
    },
    intuition:
      "Batching is the single mechanism that makes LLM serving economically viable. At batch size 1 the GPU drags every weight of the model across the memory bus to produce one token; at batch size 32 that identical weight traffic produces 32 tokens. The cost of the read is amortised across everyone in the batch. But batching buys throughput with latency: a request must wait for a slot, then wait for the whole batch's forward pass. The engineering skill is not 'turn batching on' - it is knowing quantitatively where the memory-bound regime ends, where your SLA cuts the curve, and which of the three batching generations you are actually running.",
    lesson: [
      {
        title: "Why Batching Works: The Amortisation Argument",
        content:
          "Topic B3 established that decode is memory-bandwidth-bound: the wall-clock time of a decode step is dominated by streaming model weights and the KV cache from HBM into the compute units, not by the arithmetic itself. That single fact is the whole justification for batching. At batch size 1 you pay the full weight-read cost for one token. At batch size N you pay the same weight-read cost - the weights are read once and reused across all N sequences - and receive N tokens. Throughput therefore scales almost linearly with batch size while the workload remains memory-bound, and it does so at almost no latency cost, because the forward pass takes roughly the same wall-clock time whether one or sixteen sequences ride along.\n\nThat free lunch ends at the compute-bound threshold. Once the arithmetic per step grows large enough to exceed the time spent moving bytes, each additional sequence contributes proportionally to forward-pass duration. Past that point throughput still rises but latency rises with it, and the curve bends. Every batch-sizing decision is a choice of where to sit on that bend.",
        diagram: asciiDiagram(`
  THROUGHPUT vs P99 LATENCY - the bend is the whole story

  Throughput   ▲
  (tok/sec)    │                                    ● b=64
               │                            ● b=32
        180 ───┤                     ● b=16
        120 ───┤              ● b=8
         72 ───┤        ● b=4
         38 ───┤    ● b=2
         10 ───┤● b=1
               └───┬────┬────┬────┬─────┬──────┬───► P99 TTFT
                 100  200  400  800  1600   3200 ms
                   ├─ memory-bound ─┤├─ compute-bound ─┤
                   near-free scaling  latency pays for
                                      every extra slot

  ┌──────────────────────────────────────────────────────┐
  │ SLA boundary: P99 TTFT < 500 ms                      │
  │ Largest compliant batch  = 8                         │
  │ Operating point          = 72 tok/sec                │
  │ Throughput left on table = 120 - 72 = 48 tok/sec     │
  └──────────────────────────────────────────────────────┘
`),
      },
      {
        title: "Three Generations: Static, Dynamic, Continuous",
        content:
          "Static batching is the naive form: the server collects exactly N requests, runs them together to completion, and returns all N results. Its fatal flaw is the ragged right edge. Output lengths in real traffic vary by an order of magnitude, so a request that finishes in 10 tokens occupies a dead slot for the 340 further steps the longest member of its batch needs. Measured GPU utilisation lands around 20-40 percent.\n\nDynamic batching improves the front edge: batch size varies up to a maximum, and a batch dispatches either when full or when a timeout expires. This removes the wait-for-a-full-batch stall at low traffic but does nothing about the ragged right edge - slots still idle until the whole batch retires.\n\nContinuous batching, introduced as iteration-level scheduling in Orca (OSDI 2022), fixes the right edge. The scheduler runs at the granularity of a single decode step. After every step, any sequence that emitted its stop token is evicted and a waiting request is admitted into the freed slot immediately. The batch never 'finishes'; it turns over continuously. Utilisation rises to 80-95 percent, and on mixed-length traffic this alone delivers three- to five-fold throughput improvement over static batching with no hardware change. Every serious framework - vLLM, TGI, TensorRT-LLM - does this by default, which is why static batching should never appear in a design you propose in an interview.",
        diagram: asciiDiagram(`
  STATIC BATCHING (batch = 3)
  step:   1  2  3  4  5  6  7  8  9 10
  Req A:  █  █  █  ·  ·  ·  ·  ·  ·  ·   done@3, slot IDLE 7 steps
  Req B:  █  █  █  █  █  █  █  █  █  █   done@10
  Req C:  █  █  █  █  █  ·  ·  ·  ·  ·   done@5, slot IDLE 5 steps
  useful: 3  3  3  2  2  1  1  1  1  1   = 18/30 slot-steps -> 60%

  CONTINUOUS BATCHING (batch = 3, iteration-level scheduling)
  step:   1  2  3  4  5  6  7  8  9 10
  slot1:  A  A  A  D  D  D  D  G  G  G   A retires@3, D admitted@4
  slot2:  B  B  B  B  B  B  B  B  B  B
  slot3:  C  C  C  C  C  E  E  E  F  F   C retires@5, E admitted@6
  useful: 3  3  3  3  3  3  3  3  3  3   = 30/30 slot-steps -> ~100%

  ┌───────────────────────────────────────────────────────┐
  │ Same GPU. Same model. Same batch size.                │
  │ The only change is WHEN a finished slot gets refilled.│
  └───────────────────────────────────────────────────────┘
`),
      },
      {
        title: "Prefill vs Decode: Two Phases That Fight for the Same GPU",
        content:
          "Every request runs two phases with opposite hardware profiles. Prefill consumes all input tokens in one wide parallel forward pass; it is compute-bound and its duration scales with input length. Decode emits one token per step; it is memory-bandwidth-bound and its duration scales with output length times TPOT.\n\nIn a shared serving system these two phases compete. When a 32,000-token document-analysis request arrives, its prefill saturates the GPU's compute units for several seconds. During that window every in-flight decode sequence stalls - their TPOT effectively drops to zero - and any newly arriving request waits behind the whole prefill before it sees a first token. The signature in production telemetry is unmistakable and worth memorising: P50 TTFT stays completely normal while P99 TTFT spikes by an order of magnitude, and GPU utilisation pins near 100 percent for the duration. P50 is normal because most requests were never co-located with the prefill; the tail is destroyed because the unlucky few were.\n\nThis is the prefill-preempts-decode problem, and naming it precisely is one of the clearest signals that a candidate has operated a serving system rather than read about one.",
        diagram: asciiDiagram(`
  PREFILL PREEMPTS DECODE

  time ───────────────────────────────────────────────────►
        normal steady state        32K prefill        recovery
        ┌──────────────────┐┌──────────────────────┐┌────────┐
  GPU   │ decode decode dec││ PREFILL (compute 100%)││ decode │
        └──────────────────┘└──────────────────────┘└────────┘
  user X  tok tok tok tok tok  ▼ STALLED 6.4 s ▼      tok tok
  user Y  arrives here ────────► first token after 6.4 s

  TELEMETRY SIGNATURE
    P50 TTFT   400 ms ──────────── 400 ms   (unchanged)
    P99 TTFT   450 ms ──────────► 6 400 ms  (14x spike)
    GPU util    72 %  ──────────►    99 %
        ▲
        └── P50 flat + P99 exploding = a long prefill, not a capacity problem
`),
      },
      {
        title: "Chunked Prefill and Disaggregated Serving",
        content:
          "There are two established fixes, and they trade complexity against completeness.\n\nChunked prefill slices a long prefill into fixed-size pieces - typically 512 to 1,024 tokens - and interleaves decode steps for all in-flight sequences between chunks. The total prefill work is unchanged: a 32,000-token prefill at 5,000 tokens per second still takes 6.4 seconds end to end. What changes is that no other user ever waits more than one chunk, roughly 100 milliseconds, for the GPU. This is a tail-latency fix, not a throughput fix - a distinction worth stating explicitly, because claiming chunked prefill speeds up prefill is a common and immediately visible error. vLLM exposes it as --enable-chunked-prefill. The cost is a small scheduling overhead, so on homogeneous short-context traffic it is not worth enabling.\n\nDisaggregated serving goes further and separates the phases onto different physical instances. Prefill instances are provisioned for compute density; decode instances are provisioned for memory bandwidth. After prefill completes, the KV cache is shipped to a decode instance over a high-speed interconnect. This eliminates the interference entirely rather than merely distributing it, and lets each pool be scaled and hardware-matched independently. The price is a KV-transfer path that must move gigabytes at low latency, which is why it is standard at hyperscalers and rare in self-hosted deployments.",
        diagram: asciiDiagram(`
  CHUNKED PREFILL - same total work, spread out

  WITHOUT: [────────── 32K prefill, 6.4 s ──────────] then decode resumes
           other users stalled the entire 6.4 s

  WITH (chunk = 512):
   [c1]d[c2]d[c3]d[c4]d ... [c64]d      64 chunks x 100 ms = 6.4 s total
     ▲   ▲                               ▲
     │   └ decode step for every         └ max stall any user sees = 100 ms
     └ 512-token prefill chunk

  DISAGGREGATED SERVING - separate the phases entirely

   request ──► ┌──────────────┐   KV cache   ┌──────────────┐ ──► tokens
               │ PREFILL POOL │ ───────────► │ DECODE POOL  │
               │ compute-dense│  interconnect│ bandwidth-   │
               │ H100 / TFLOPs│              │ dense, HBM   │
               └──────────────┘              └──────────────┘
      scales with input length         scales with output length
      ┌─────────────────────────────────────────────────────────┐
      │ interference: eliminated   cost: GB-scale KV transfer   │
      └─────────────────────────────────────────────────────────┘
`),
      },
    ],
    examples: [
      {
        title: "Continuous vs static batching on mixed-length traffic",
        input:
          "100 requests. Output mix: 50% at 50 tokens, 50% at 350 tokens. Batch size 4. TPOT = 20 ms/token. Prefill ignored.",
        output:
          "Static: batch time set by longest member = 350 x 20 ms = 7 s. 100/4 = 25 batches. Total = 175 s. Throughput = 0.57 req/sec.\nContinuous: short requests retire after 1 s and free their slot immediately; slots stay full. Total = ~40 s. Throughput = 2.5 req/sec. Improvement = 4.4x.",
        explanation:
          "Step 1: In static batching a 50-token request finishes after 1 s but its slot cannot be reused until the 350-token request in the same batch finishes at 7 s. Step 2: That is 6 s of dead slot time per short request, and half of all requests are short. Step 3: Total wasted slot-seconds = 50 x 6 = 300 s of the 700 slot-seconds consumed, i.e. 43% of the GPU is producing nothing. Step 4: Continuous batching refills each slot at the step boundary, converting that dead time into completed work. Step 5: The 4.4x is therefore not an optimisation of the model or the kernel - it is the recovery of idle capacity, which is why it needs no hardware change and should be the first thing verified in any serving stack.",
      },
      {
        title: "Prefill-blocking latency spike and the chunked-prefill fix",
        input:
          "Steady state: 200-token contexts, P99 TTFT = 500 ms. A single 32,000-token request arrives. Prefill speed = 5,000 tok/sec.",
        output:
          "Unmitigated: prefill = 32,000 / 5,000 = 6.4 s. All concurrent decode stalls for 6.4 s. Any request arriving inside that window sees TTFT >= 6.4 s. P99 TTFT spikes 500 ms -> 6,400 ms.\nChunked prefill at 512 tokens: chunk = 512 / 5,000 = 0.1 s; decode interleaves after each chunk. Max stall = 0.1 s. P99 TTFT stays ~600 ms. Total prefill time unchanged at 64 x 0.1 = 6.4 s.",
        explanation:
          "Step 1: The long request needs 6.4 s of compute regardless of scheduling - chunking cannot reduce total prefill work. Step 2: Unchunked, that 6.4 s is one indivisible occupancy of the GPU, so the worst-case wait for any other user equals the full prefill. Step 3: Chunked, the worst-case wait equals one chunk, because the scheduler regains control every 512 tokens. Step 4: P99 improves 10x while mean throughput moves barely at all. Step 5: The correct summary is that chunked prefill redistributes latency rather than removing work - if you describe it as making prefill faster, an interviewer will probe and find the gap.",
      },
      {
        title: "SLA-constrained batch size selection",
        input:
          "Benchmarks: b=1 TTFT 100 ms / 10 tok-s; b=4 200 ms / 38; b=8 400 ms / 72; b=16 800 ms / 120; b=32 1600 ms / 180. SLA: P99 TTFT < 500 ms.",
        output:
          "Largest compliant batch = 8 (400 ms < 500 ms). Batch 16 violates at 800 ms. Operating point = 72 tok/sec. Throughput forgone versus batch 16 = 48 tok/sec, or 40%.",
        explanation:
          "Step 1: Sort the benchmark by batch size and find the last row whose P99 TTFT is under the SLA - that is batch 8. Step 2: Do not stop there; also check P99 TPOT at batch 8, because a batch can satisfy time-to-first-token while delivering visibly stuttery streaming once the compute-bound threshold is crossed. Step 3: Quantify what the SLA costs, here 48 tok/sec of the 120 available. Step 4: Present that number to whoever owns the SLA, because 40% of your serving capacity is being spent on a latency promise and that trade should be an explicit business decision. Step 5: Re-benchmark after any change to hardware, quantisation or context length - the curve is not portable.",
      },
    ],
    tips: [
      "Say it precisely: batching improves throughput and generally costs per-request latency. 'Batching makes things faster' is the phrasing that gets probed.",
      "Continuous batching is the default assumption in any modern serving discussion. Static batching is legacy and should not appear in a new design.",
      "Learn the prefill-preempts-decode signature - P50 flat, P99 exploding, GPU near 100% - because it is the diagnosis question that separates operators from readers.",
      "Chunked prefill is a tail-latency fix, not a throughput fix. Total prefill work is identical before and after.",
      "Always benchmark TTFT and TPOT at your target batch size on your own hardware. The throughput-latency curve is non-linear and does not transfer between GPU types.",
    ],
    tricks: [
      "The cheapest doubling of throughput available anywhere in the stack: confirm continuous batching is actually on. On mixed-length traffic it delivers 3-5x over static with zero hardware change.",
      "Chunk size sweet spot is 512-1,024 tokens. Smaller chunks cut the per-user TTFT spike further but add scheduling overhead; larger chunks reduce overhead and allow bigger spikes. Profile against your real length distribution.",
      "Compute the VRAM ceiling before any other batch analysis: max_batch = (total_VRAM - model_weights - overhead) / per_sequence_KV_at_max_context. If that number is below your target batch, no scheduler tuning will save you.",
      "For bimodal traffic - mostly short with a long tail - run two deployments and route by predicted output length: small batch and low TTFT for the short pool, large batch and high throughput for the long pool. This beats any single compromise batch size.",
      "Watch TPOT, not just TTFT, as you raise batch size. Rising TPOT is the empirical signal that you have crossed the compute-bound threshold, and it is the metric users actually feel while streaming.",
    ],
    memoryAids: [
      "Three generations: Static then Dynamic then Continuous. Each one kills a different kind of idle - full-batch wait, then ragged right edge.",
      "The dial: turn batch size up, throughput goes up and latency goes up. Set the dial where your SLA cuts the curve, and know what that costs.",
      "Prefill is greedy - one big compute-bound burst. Decode is patient - one memory-bound token at a time. They fight over the same GPU.",
      "VRAM ceiling first: max_batch = (VRAM - weights) / per_seq_KV. Batches are VRAM-bounded before they are compute-bounded.",
      "P50 flat plus P99 exploding equals a long prefill. Capacity problems move both.",
    ],
    interviewPatterns: [
      "'Explain continuous batching and why it beats static batching.' Tier 1 for any inference-serving role - answer at the level of iteration-level scheduling and slot turnover.",
      "'Does batching improve latency or throughput?' A deliberate misconception check; separate the two and mention the memory-bound region where latency cost is near zero.",
      "'We see P99 latency spikes when large-context requests arrive - diagnose and fix.' Prefill preemption; fix with chunked prefill, or disaggregation at scale.",
      "'How would you choose batch size for a P95 TTFT SLA of 200 ms?' They want the systematic method - benchmark the curve, take the last compliant row, verify TPOT, quantify the forgone throughput.",
      "'What is disaggregated prefill-decode serving?' Advanced; asked at AI-infrastructure teams. Cover independent scaling, per-phase hardware matching and the KV-transfer cost.",
      "Frequency and companies: near-universal in LLM-serving and AI-infrastructure interviews at OpenAI, Anthropic, NVIDIA, Google, Databricks and Together; a standard follow-up to any KV-cache question elsewhere. Stability: high - the static/dynamic/continuous taxonomy and the prefill-decode tension are settled and unlikely to shift.",
    ],
    faq: [
      {
        question: "Does batching improve latency?",
        answer:
          "Batching improves throughput - total tokens or requests completed per second across all users - and generally costs a little per-request latency, because a request waits for a slot and then for the whole batch's forward pass. The important nuance is that in the memory-bandwidth-bound region the latency cost is close to zero: the forward pass spends its time streaming weights from HBM, and that time barely changes whether one sequence or sixteen ride along. Past the compute-bound threshold the arithmetic starts to dominate and latency grows roughly proportionally with batch size. So the honest one-line answer is: latency-neutral to mildly harmful per request, dramatically beneficial for system throughput.",
        category: "misconceptions",
      },
      {
        question: "Why can't I just keep increasing batch size?",
        answer:
          "Two hard ceilings. The first is VRAM: every in-flight sequence needs its own KV cache, total KV grows linearly with batch size, and it eventually exhausts the card. The second is your latency SLA: bigger batches mean longer queueing and longer forward passes, so P99 TTFT and eventually P99 TPOT breach the SLA. In almost every real deployment VRAM binds first, which is why the ceiling calculation - (total VRAM minus weights minus overhead) divided by per-sequence KV at maximum context - should be the first thing you compute, before any scheduler tuning.",
        category: "constraints",
      },
      {
        question: "What is chunked prefill and when should I enable it?",
        answer:
          "Chunked prefill splits a long prefill into fixed-size pieces, typically 512 to 1,024 tokens, and interleaves decode steps for other in-flight sequences between them. Enable it when your traffic mixes short and long contexts, when P99 TTFT spikes as long-context requests arrive, or when you need consistent tail latency regardless of what else is co-located. Do not enable it on homogeneous short-context traffic, where the scheduling overhead buys nothing. In vLLM it is --enable-chunked-prefill. Note carefully that it does not reduce total prefill work - it redistributes when that work blocks other users.",
        category: "optimization",
      },
      {
        question: "What is disaggregated serving and who actually runs it?",
        answer:
          "Disaggregated serving runs prefill and decode on physically separate GPU pools. Prefill instances are provisioned for compute density, decode instances for memory bandwidth, and the KV cache is transferred between them over a high-speed interconnect once prefill completes. This removes prefill-decode interference entirely rather than merely spreading it, and lets each pool scale independently against a different driver - input length for prefill, output length for decode. It runs in production at Google, Microsoft and the large cloud providers. For self-hosted deployments the gigabyte-scale KV transfer path is usually not worth building, and chunked prefill is the pragmatic substitute.",
        category: "advanced",
      },
      {
        question: "How do I tell whether my serving system is throughput-bound or latency-bound?",
        answer:
          "Read GPU utilisation and P99 TTFT together. High utilisation above 85 percent with acceptable P99 means you are at a healthy throughput-optimised operating point. Utilisation below 50 percent means you are under-batched or over-provisioned - raise batch size or shrink the fleet. High P99 with high utilisation means you are compute-bound at the current batch size, so reduce it or enable chunked prefill. High P99 with low utilisation is the interesting case: it means requests are waiting rather than computing, which points to a queueing problem or a long prefill monopolising the scheduler - check whether continuous batching is genuinely on before anything else.",
        category: "monitoring",
      },
      {
        question: "Is dynamic batching the same as continuous batching?",
        answer:
          "No, and the distinction is frequently tested. Dynamic batching varies the batch size and dispatches when the batch is full or a timeout fires, which fixes the front edge - you no longer wait for a fixed N requests to arrive. But the batch still runs to completion as a unit, so a short sequence's slot stays idle until the longest member finishes. Continuous batching schedules at the granularity of a single decode step: a finished sequence is evicted and a queued request admitted immediately, so the ragged right edge disappears. Dynamic batching is a request-admission policy; continuous batching is an iteration-level scheduling policy, and only the latter gets you to 80-95 percent utilisation.",
        category: "concepts",
      },
    ],
    references: [
      {
        source: "paper",
        attribution: "Yu et al., 'Orca: A Distributed Serving System for Transformer-Based Generative Models', USENIX OSDI 2022 (usenix.org/conference/osdi22/presentation/yu)",
        insight: "The original iteration-level (continuous) batching paper. Every production framework implements this idea, so it is the primary source when asked where continuous batching comes from.",
      },
      {
        source: "paper",
        attribution: "Kwon et al., 'Efficient Memory Management for Large Language Model Serving with PagedAttention', arXiv:2309.06180",
        insight: "Section 3 shows how iteration-level scheduling is implemented in vLLM alongside paged KV memory, with the GPU-utilisation measurements that justify the 80-95% figure.",
      },
      {
        source: "paper",
        attribution: "Agrawal et al., 'Sarathi-Serve: Taming Throughput-Latency Tradeoff in LLM Serving via Chunked-Prefills', arXiv:2403.02310",
        insight: "Formalises chunked prefill, including the analysis showing total prefill work is preserved while tail latency collapses - the point most candidates get wrong.",
      },
      {
        source: "blog",
        attribution: "vLLM documentation, Chunked Prefill (docs.vllm.ai/en/latest/features/chunked_prefill.html)",
        insight: "Practical configuration guidance including chunk-size selection and the measured throughput cost of enabling it.",
      },
      {
        source: "note",
        attribution: "Production serving telemetry patterns, generalised across self-hosted vLLM and TGI deployments.",
        insight: "The P50-flat / P99-spiking signature of prefill preemption is consistent enough across deployments to be used as a first-pass diagnosis without any profiler.",
      },
    ],
    practiceProblems: [
      "THROUGHPUT CALCULATION. Continuous batching at batch size 16, TPOT = 25 ms/token, average output = 150 tokens, prefill ignored. (a) Tokens per second? (b) Requests per second? ANSWER: (a) One decode step takes 25 ms and emits one token per occupied slot, so 16 tokens per 0.025 s = 640 tok/sec. (b) 640 / 150 = 4.3 req/sec. Note the assumption that continuous batching keeps all 16 slots full - under static batching the same numbers would overstate throughput by roughly 4x.",
      "SLA COMPLIANCE AND ITS COST. Benchmarks: b=8 gives P99 300 ms / P95 200 ms / 50 req-s; b=16 gives P99 700 ms / P95 450 ms / 85 req-s; b=32 gives P99 1400 ms / P95 900 ms. SLA: P99 < 500 ms AND P95 < 300 ms. Which batch complies, and what does compliance cost? ANSWER: Batch 8 passes both (300 < 500, 200 < 300). Batch 16 fails P99 and P95. Maximum compliant batch = 8. Cost = 85 - 50 = 35 req/sec forgone, 41% of achievable throughput, spent entirely on the latency promise.",
      "PREFILL SPIKE DIAGNOSIS. P99 TTFT is normally 400 ms. At 14:22 it hit 7.2 s for 45 seconds. P50 was unchanged. GPU utilisation hit 99%. No deployment occurred. Diagnose and prescribe. ANSWER: A very long prefill monopolised GPU compute. Evidence: P50 unchanged means most requests were untouched, so this is not a capacity or dependency failure; P99 alone spiking means only co-located requests suffered; 99% utilisation rules out a stall or a lock. Duration implies roughly 225,000 tokens of prefill at 5,000 tok/sec, consistent with a batch of long-context requests. Fix: enable chunked prefill at 512 tokens, capping any user's stall at ~100 ms; optionally add an input-length admission limit or route long-context traffic to a separate pool.",
      "VRAM CEILING. Llama-3-70B in FP8 (70 GB weights) on a single H100 80 GB. Per-sequence KV at 8K context with GQA = 2.6 GB. Activation overhead = 2 GB. What is the maximum batch size, and what does that imply? ANSWER: Available for KV = 80 - 70 - 2 = 8 GB. max_batch = 8 / 2.6 = 3 sequences. A batch of 3 is far below the compute-bound threshold, so this deployment is VRAM-starved rather than compute-starved: throughput will be poor no matter how the scheduler is tuned. Remedies in order of preference - FP8 or INT8 KV cache to halve per-sequence cost, cap max context below 8K, or shard across two GPUs to free VRAM for a usable batch.",
      "CHOOSING BETWEEN CHUNKED PREFILL AND DISAGGREGATION. A team serves a homogeneous workload of 200-token prompts with no long-context traffic, and P99 TTFT is already within SLA. Should they enable chunked prefill? ANSWER: No. Chunked prefill solves interference from long prefills, which this workload does not have, and it adds per-chunk scheduling overhead that will slightly reduce throughput for no tail-latency benefit. Disaggregation is even less justified - it adds a KV-transfer path to solve a problem that is absent. The correct answer names the precondition (heterogeneous input lengths) and declines the optimisation, which is a stronger response than reciting the technique.",
    ],
  },
  {
    id: "topic-ai-llmops-inference-acceleration",
    moduleId: "mod-ai-llmops",
    title: "Inference Acceleration: Speculative Decoding, Serving Quantisation (FP8, INT8, GPTQ, AWQ), Distillation and Flash Attention",
    complexity: {
      time: "Speculative decoding: effective tok/sec = expected_accepted_tokens / (draft_time + verify_time), where expected_accepted = sum(alpha^i) for i = 0..K-1. Quantisation: roughly 1.5-2x throughput per halving of weight bytes while decode stays bandwidth-bound. Flash Attention: 2-4x faster attention, concentrated in prefill.",
      space: "Quantisation reduces weight VRAM linearly with bit width: BF16 2 bytes/param, FP8 and INT8 1 byte, INT4 0.5 bytes. Speculative decoding adds the draft model's weights on top of the verifier. Flash Attention cuts attention activation memory from O(N^2) to O(N), which is what makes long contexts fit at all.",
    },
    intuition:
      "There are only two ways to make a token arrive sooner: do less work, or do the same work more cleverly. Quantisation and distillation do less work - fewer bytes per weight, fewer weights. Speculative decoding and Flash Attention do the same work more cleverly - one parallelises a computation that looked irreducibly serial, the other restructures memory traffic that was never necessary in the first place. Production systems stack several of these because they attack different bottlenecks, and each carries a different currency of risk: quantisation risks quality, speculation risks wasted compute, Flash Attention risks nothing and should simply be on.",
    lesson: [
      {
        title: "Speculative Decoding: Parallelising the Serial Bottleneck",
        content:
          "Autoregressive decode looks irreducibly serial. Token n+1 depends on token n, so no amount of extra hardware speeds up a single sequence. Speculative decoding breaks the constraint by exploiting an asymmetry: generating K tokens is serial, but verifying K already-written tokens is parallel, because every position's input is already known.\n\nA small draft model - typically 1B parameters, and ideally a distillation of the target so it shares the tokeniser and output distribution - proposes K candidate tokens quickly. The large verifier then runs one forward pass over all K positions simultaneously and checks each against its own distribution. Accepted tokens are kept; at the first rejection the verifier's own correction is emitted and speculation restarts. The verification rule is designed so the output distribution is mathematically identical to sampling from the verifier alone - this is lossless acceleration, not an approximation, which is the point candidates most often miss.\n\nThe speedup is governed by the per-token acceptance rate alpha. Expected accepted tokens per round is the geometric sum alpha^0 + alpha^1 + ... + alpha^(K-1), because acceptance of position i requires all preceding positions to have been accepted too. At alpha = 0.70 with K = 5 that sum is about 2.77, not 5 - which is why draft-verifier distributional alignment, not draft model speed, is the variable that decides whether speculation pays.",
        diagram: asciiDiagram(`
  SPECULATIVE DECODING

  WITHOUT SPECULATION - strictly sequential
   [verify t1]──►[verify t2]──►[verify t3]──►[verify t4]
    100 ms        100 ms        100 ms        100 ms   = 400 ms

  WITH SPECULATION (K = 4)
   draft (1B, parallel)   [d1  d2  d3  d4]        40 ms
   verify (70B, ONE pass) [ ✓   ✓   ✗   -]       100 ms
                            │   │   └── reject, emit verifier's own token
                            └───┴────── accepted
   result: 3 tokens in 140 ms  vs  300 ms sequential  ->  ~2.1x

  ACCEPTANCE RATE DRIVES EVERYTHING  (expected accepted = Σ αⁱ, i=0..K-1)
   α = 0.90, K = 5  ──►  3.99 tok/round  ──►  ~3.8x   worth it
   α = 0.70, K = 5  ──►  2.77 tok/round  ──►  ~2.0x   worth it
   α = 0.40, K = 5  ──►  1.66 tok/round  ──►  ~1.2x   overhead may win
        ▲
        └── α is set by how closely draft and verifier distributions agree
`),
      },
      {
        title: "Quantisation for Serving: Two Different Goals",
        content:
          "Quantisation reduces the bits used per weight, and sometimes per activation. Fewer bits means less VRAM and less bandwidth consumed per decode step, which in a bandwidth-bound regime converts almost directly into throughput.\n\nThe ladder runs BF16 at 2 bytes per parameter as the quality baseline; FP8 in E4M3 or E5M2 form at 1 byte, natively supported on H100 tensor cores, under 1 percent regression on most tasks, and the default choice for modern hardware; INT8 at 1 byte, similar quality, and the right answer on older GPUs without FP8 units; then GPTQ, a post-training INT4 method using second-order Hessian information to minimise layer-wise reconstruction error; and AWQ, also INT4, which observes that roughly 1 percent of weights are salient - identified through activation magnitudes - and protects those while quantising the rest aggressively.\n\nThe distinction that matters in an interview is purpose. FP8 and INT8 are quantisation for throughput: the model already fits, and you want more tokens per second and more VRAM for the KV cache. GPTQ and AWQ are quantisation for fitting: the model does not fit, and you accept 3-8 percent quality regression to get it onto the hardware you have. Conflating those two is the most common quantisation mistake, and it leads teams to reach for INT4 when FP8 would have delivered the throughput they wanted at no quality cost.",
        diagram: asciiDiagram(`
  PRECISION LADDER - Llama-3-70B weights

  BF16   2.0 B/param  ├████████████████████████████████┤ 140 GB  baseline
  FP8    1.0 B/param  ├████████████████┤                 70 GB   <1% regression
  INT8   1.0 B/param  ├████████████████┤                 70 GB   <1% regression
  GPTQ   0.5 B/param  ├████████┤                         35 GB   3-8% regression
  AWQ    0.5 B/param  ├████████┤                         35 GB   3-5% regression

  ┌─────────────────────────┬──────────────────────────────────┐
  │ QUANTISE FOR THROUGHPUT │ QUANTISE TO FIT                  │
  │ FP8 / INT8              │ GPTQ / AWQ (INT4)                │
  │ model already fits      │ model does not fit               │
  │ goal: tok/sec + KV room │ goal: get onto the GPU you have  │
  │ quality cost: ~none     │ quality cost: real, must measure │
  └─────────────────────────┴──────────────────────────────────┘
       ▲ picking the right column IS the interview answer
`),
      },
      {
        title: "Flash Attention: IO-Aware Computation",
        content:
          "Standard attention materialises the full N-by-N score matrix in HBM, giving O(N^2) high-bandwidth-memory reads and writes. For long contexts this is catastrophic well before it is merely slow.\n\nFlash Attention, introduced by Dao et al. in 2022, restructures the computation with SRAM tiling. Attention is computed block by block in on-chip SRAM - small but extremely fast - using an online softmax that never requires the complete score matrix to exist anywhere. HBM traffic falls from O(N^2) to O(N), attention computation runs 2-4x faster, and attention activation memory drops by a factor of 10-20. Critically the result is numerically exact; this is not an approximation like sparse or linear attention.\n\nThe practical consequence is that Flash Attention is not an optimisation for long contexts, it is a prerequisite. At 32,000 tokens the standard attention matrix alone would need roughly 4 GB per layer, so a 32-layer model runs out of memory long before throughput becomes interesting. Flash Attention 2 improved thread-block parallelism for roughly a further 2x, and Flash Attention 3 targets H100 tensor cores specifically. It is on by default in vLLM, TGI, TensorRT-LLM and recent PyTorch, so the only real action item is to confirm it has not been disabled.",
        diagram: asciiDiagram(`
  STANDARD ATTENTION - materialise the N×N matrix in HBM

    Q ─┐                ┌───────────────────┐
       ├──► QKᵀ ───────►│  N × N scores     │──► softmax ──► ×V
    K ─┘                │  lives in HBM     │
                        └───────────────────┘
    HBM traffic O(N²)     N = 32 000 ─► 4.1 GB per layer ─► OOM

  FLASH ATTENTION - tile through SRAM, never materialise

    ┌──── HBM (large, slow) ────┐
    │  Q blocks  K blocks  V    │
    └───┬────────┬─────────┬────┘
        ▼        ▼         ▼        stream blocks in, one tile at a time
    ┌───────────────────────────┐
    │ SRAM (small, very fast)   │   online softmax keeps running max+sum
    │  compute tile ─► accumulate│   full N×N never exists
    └───────────┬───────────────┘
                ▼
             output O          HBM traffic O(N)   memory ~256 MB   exact result
`),
      },
      {
        title: "Distillation and the Combined Acceleration Stack",
        content:
          "Knowledge distillation trains a smaller student to reproduce a larger teacher's behaviour. Response distillation trains on teacher-generated outputs and is simple to run; feature distillation matches intermediate hidden states or attention patterns and transfers more structure at greater complexity. In production the payoff is substantial: distilled small models such as the 1B and 3B Llama 3.2 variants handle a large share of routine traffic at a fraction of the serving cost, and they make excellent draft models for speculative decoding precisely because they inherit the teacher's tokeniser and distribution, which is what maximises alpha.\n\nThe techniques compose, and the order in which you apply them matters because each has a different cost-to-benefit ratio. Enable Flash Attention first - it is free and already default. Quantise to FP8 or INT8 second, since that both raises throughput and frees VRAM, which raises the achievable batch size, which raises throughput again. Confirm continuous batching third. Only then consider speculative decoding, because it adds a second model to select, evaluate, store and version, and it helps only in the memory-bound small-batch regime. Distillation sits outside this ladder as a product decision rather than a serving flag: it changes which model you serve, so it needs its own quality evaluation.",
        diagram: asciiDiagram(`
  ACCELERATION STACK - apply in this order, effects compound

  1. FLASH ATTENTION      prefill 2-4x      cost: none (default on)
        │                                   risk: none
        ▼
  2. FP8 / INT8 WEIGHTS   decode 1.5-2x     cost: calibration run
        │                 + frees VRAM      risk: <1% quality
        ▼
  3. CONTINUOUS BATCHING  utilisation       cost: none (default on)
        │                 40% ─► 90%        risk: none
        ▼
  4. SPECULATIVE DECODING decode 2-3x       cost: 2nd model to run
        │                 small batch only  risk: wasted compute if α low
        ▼
  5. DISTILLED MODEL      10-50x cheaper    cost: training + full eval
                          per request       risk: real quality change

  ┌──────────────────────────────────────────────────────────────┐
  │ Steps 1-3 are configuration. Steps 4-5 are commitments.      │
  │ Exhaust the configuration before taking on the commitments.  │
  └──────────────────────────────────────────────────────────────┘
`),
      },
    ],
    examples: [
      {
        title: "Speculative decoding speedup from acceptance rate",
        input:
          "Draft (1B) produces 5 tokens in 8 ms. Verifier (70B) forward pass = 100 ms. Per-token acceptance alpha = 0.80, K = 5.",
        output:
          "Expected accepted = 1 + 0.8 + 0.64 + 0.51 + 0.41 = 3.36 tokens/round.\nRound time = 8 + 100 = 108 ms.\nEffective throughput = 3.36 / 0.108 = 31.1 tok/sec.\nBaseline = 1 / 0.100 = 10 tok/sec. Speedup = 3.1x.",
        explanation:
          "Step 1: Acceptance is sequential, so position i is only reached if positions 0..i-1 were all accepted, giving the geometric sum rather than K x alpha. Step 2: At alpha = 0.80 and K = 5 that is 3.36, well short of the naive 5. Step 3: The draft cost of 8 ms is nearly free against a 100 ms verify, so round time is dominated by the verifier. Step 4: Speedup is therefore approximately the expected-accepted count, 3.1x here. Step 5: Re-run the same arithmetic at alpha = 0.90 to get 3.99 tokens and 3.8x, and at alpha = 0.50 to get 1.97 tokens and about 1.7x - the spread across plausible alphas is larger than the spread across plausible draft models, which is why alignment beats raw draft speed.",
      },
      {
        title: "Quantisation as a VRAM and batch-size decision",
        input:
          "Llama-3-70B on one H100 80 GB, batch 8, context 4,096. Compare BF16, INT8 and INT4 (AWQ) weights.",
        output:
          "BF16: 140 GB of weights - needs 2 GPUs, single H100 impossible.\nINT8: 70 GB weights + 10.7 GB BF16 KV + 2 GB overhead = 82.7 GB - does NOT fit. With FP8 KV (5.4 GB): 77.4 GB - fits, tightly.\nINT4 AWQ: 35 GB + 10.7 GB KV + 2 GB = 47.7 GB - fits with 32.3 GB spare, enough to run batch 16 (KV 21.4 GB, total 58.4 GB).",
        explanation:
          "Step 1: Compute weights as parameters x bytes-per-parameter before anything else; 70B at 2 bytes is 140 GB and immediately rules out one GPU at BF16. Step 2: Add KV cache and activation overhead, because weights alone never determine fit. Step 3: INT8 lands at 82.7 GB against 80 GB, so it fails - and the fix is to quantise the KV cache rather than the weights further, which recovers 5.3 GB. Step 4: INT4 fits comfortably, and the headroom converts into batch size, which is the real throughput lever. Step 5: Weigh that against quality: under 1 percent regression for INT8 versus 3-5 percent for INT4 AWQ. If the task is coding or maths, take the tight INT8 configuration; if it is summarisation or retrieval-grounded answering, the INT4 headroom is usually the better trade.",
      },
      {
        title: "Flash Attention as a feasibility gate for long context",
        input:
          "32-layer transformer, d_model 4,096, context 32,000 tokens, A100 40 GB. Standard attention versus Flash Attention.",
        output:
          "Standard: 32,000^2 x 4 bytes = 4.1 GB per layer; x32 layers = 131 GB - OOM on a 40 GB card.\nFlash: tiled through SRAM, no N-by-N materialisation; approximately 32,000 x 4,096 x 2 bytes = 256 MB total. Fits easily, and attention runs 2-4x faster.",
        explanation:
          "Step 1: The N-by-N score matrix scales quadratically, so a 4x increase in context is a 16x increase in attention memory. Step 2: At 32K context that is 4.1 GB for a single layer, which already exceeds a tenth of the card before any weights are loaded. Step 3: Flash Attention never materialises the matrix, so its footprint scales as O(N x d) instead - three orders of magnitude smaller here. Step 4: The correct framing is feasibility, not speed: beyond roughly 8K context on most hardware, standard attention hits OOM long before throughput matters. Step 5: This is why the speedup and the memory saving should be quoted together - a candidate who mentions only the 2-4x has understated the result.",
      },
    ],
    tips: [
      "State that speculative decoding is lossless - the verification rule preserves the verifier's exact output distribution. Many candidates describe it as an approximation, which is wrong and easy to probe.",
      "Know the geometric acceptance formula. Expected accepted tokens is the sum of alpha^i over i = 0..K-1, not K times alpha, and that gap is the standard follow-up question.",
      "Separate quantisation for fitting (GPTQ, AWQ) from quantisation for throughput (FP8, INT8). Naming the goal before the format shows you understand why the format was chosen.",
      "Flash Attention in one sentence: SRAM tiling with an online softmax avoids ever materialising the N-by-N matrix in HBM, cutting traffic from O(N^2) to O(N) exactly.",
      "Distillation and quantisation compose - a distilled model can be quantised again - so present them as multiplicative rather than alternative cost reductions.",
    ],
    tricks: [
      "Speculation is worth enabling only when three conditions hold together: the workload is decode-latency-bound rather than prefill-bound, draft and verifier come from the same family and tokeniser, and batch sizes are small. At large batches the verifier is already compute-bound and there is little bandwidth headroom left for speculation to reclaim.",
      "Break-even sanity check for K = 1: you need alpha > 1 / (1 + draft_time/verify_time). At 10 ms draft against 100 ms verify that is 0.91, which is unrealistically high - so always speculate with K greater than 1, where the geometric sum lowers the threshold to roughly 0.4.",
      "AWQ over GPTQ when you are quantising fresh and quality matters, because protecting salient weights preserves more. Use GPTQ when a trusted pre-quantised checkpoint already exists for your model - the ecosystem advantage usually outweighs the small quality edge.",
      "On H100, FP8 is nearly always the right default: identical memory saving to INT8, better numerics, native tensor-core support and a single flag in vLLM. Reach past it only when the model still does not fit.",
      "For 'speed up a 70B on a limited GPU budget', answer in layers and note that they are independent and cumulative: INT4 AWQ to fit on fewer GPUs, FP8 KV cache to buy batch size, Flash Attention 2 for prefill, speculative decoding with a 1B draft for decode. Then say which you would measure first.",
    ],
    memoryAids: [
      "Speculative decoding: a fast model proposes, a slow model verifies in parallel. Same distribution, K times faster when alpha is high enough.",
      "Precision ladder BF16 to FP8 to INT8 to INT4 - each step halves memory, and quality drops accelerate sharply below INT8.",
      "Flash Attention: SRAM tiling eliminates the N-squared HBM materialisation, exactly.",
      "Distillation is compression through imitation - the student learns the teacher's behaviour without the teacher's size.",
      "Order by impact and by risk: Flash Attention, then quantisation, then continuous batching, then speculation. Configuration before commitment.",
    ],
    interviewPatterns: [
      "'How does speculative decoding work?' Tier 1 at AI-infrastructure companies. Cover the parallel-verification asymmetry, the geometric acceptance sum, and that it is lossless.",
      "'What is INT8 quantisation and how does it affect quality and performance?' Tier 1. Give the byte arithmetic, the sub-1-percent regression figure, and the task-dependence caveat.",
      "'Speed up inference for a 70B model on a limited GPU budget.' A layered design question combining quantisation, KV-cache precision, batching and speculation.",
      "'What problem does Flash Attention solve?' Tier 2. Answer with the O(N^2) to O(N) HBM reduction and the fact that it gates long-context feasibility, not just speed.",
      "'Name two situations where speculative decoding would not help.' Tests depth past the headline: low acceptance from mismatched families, large batches already compute-bound, very short outputs, and prefill-dominated workloads.",
      "Frequency and companies: very high at NVIDIA, OpenAI, Anthropic, Together, Fireworks and Databricks; moderate at general product companies, where quantisation appears but speculative decoding usually does not. Stability: Flash Attention and the quantisation ladder are stable; specific speculative-decoding variants such as Medusa and EAGLE churn, so anchor on the acceptance-rate model rather than on any one implementation.",
    ],
    faq: [
      {
        question: "Does quantisation always hurt quality?",
        answer:
          "Not meaningfully at the precisions you would actually deploy for throughput. INT8 and FP8 show under 1 percent regression on standard language benchmarks, which is inside normal evaluation noise for most tasks. INT4 via GPTQ or AWQ is a different matter: 3-8 percent on standard benchmarks, and worse on complex reasoning, long-context recall and low-resource languages. The degradation is strongly task-dependent - coding and mathematics are far more sensitive than question answering or summarisation, because they have less redundancy to absorb rounding error. The rule: FP8 and INT8 can be deployed on the strength of published results, INT4 requires you to evaluate on your own task before it ships.",
        category: "tradeoffs",
      },
      {
        question: "When does speculative decoding not help?",
        answer:
          "Four situations. First, low acceptance - when draft and verifier come from different families or different fine-tunes, their distributions diverge, most drafted tokens are rejected, and the draft model's cost exceeds the savings. Second, large batch sizes - at high batch the verifier is already compute-bound rather than memory-bound, and speculation exists precisely to reclaim idle memory bandwidth that is no longer idle. Third, very short outputs, where per-round setup overhead is a large fraction of total work. Fourth, prefill-dominated workloads, since speculation accelerates decode only and does nothing for time-to-first-token on a long prompt.",
        category: "tradeoffs",
      },
      {
        question: "What is the difference between GPTQ and AWQ?",
        answer:
          "Both are post-training INT4 methods requiring a small calibration set of roughly 128 samples. GPTQ uses second-order Hessian information to choose the quantisation that minimises layer-wise reconstruction error - it optimises the whole layer uniformly. AWQ starts from the observation that roughly 1 percent of weights are salient, identifiable from input activation magnitudes, and protects those at higher precision while quantising the rest more aggressively. Because it preserves the weights that matter most to the output, AWQ generally produces better quality at the same compression. For new work prefer AWQ; when a trusted pre-quantised GPTQ checkpoint already exists for your model, the ecosystem advantage usually outweighs the small quality gap.",
        category: "techniques",
      },
      {
        question: "Is Flash Attention the same thing as PagedAttention?",
        answer:
          "No - they are orthogonal, and vLLM runs both at once. Flash Attention optimises how attention is computed: SRAM tiling with an online softmax means the N-by-N score matrix is never materialised in HBM, cutting memory traffic from O(N^2) to O(N), speeding up prefill 2-4x and collapsing attention activation memory. PagedAttention optimises how KV cache memory is allocated: OS-style paging removes the internal fragmentation caused by pre-allocating contiguous buffers for maximum context, and enables copy-on-write sharing of common prefixes. Computation versus allocation. Conflating them is one of the most common errors in serving interviews.",
        category: "concepts",
      },
      {
        question: "Should I reach for speculative decoding or quantisation first?",
        answer:
          "Quantisation, clearly. FP8 or INT8 is a configuration change with essentially no quality risk, it directly reduces VRAM which raises the achievable batch size, and it introduces no new artefact to manage. Speculative decoding requires you to select, evaluate, store, version and monitor a second model, and it only pays in the memory-bound small-batch regime. The full ordering is: confirm Flash Attention is on, quantise weights and then the KV cache to FP8 or INT8, confirm continuous batching is on, and only then evaluate speculation if decode latency at small batch is still the binding constraint. The first three are configuration; speculation is an operational commitment.",
        category: "implementation",
      },
      {
        question: "If speculative decoding is lossless, why isn't it always on?",
        answer:
          "Losslessness is about output quality, not about cost. The verification rule guarantees the emitted tokens are distributed exactly as if sampled from the verifier alone, so quality is genuinely unaffected. What it costs is compute: every rejected draft token represents work the draft model did that is thrown away, plus the draft's forward passes themselves. When acceptance is high that waste is far smaller than the serial decode time it saves; when acceptance is low, or when the verifier is already compute-saturated at high batch, the waste dominates and total system throughput falls even though individual-request latency might improve slightly. It is a latency optimisation that spends throughput, which is exactly the wrong trade for a throughput-limited service.",
        category: "tradeoffs",
      },
    ],
    references: [
      {
        source: "paper",
        attribution: "Leviathan et al., 'Fast Inference from Transformers via Speculative Decoding', arXiv:2211.17192",
        insight: "The original speculative decoding result from Google, including the proof that the accepted-token distribution matches the target model exactly - the basis for calling it lossless.",
      },
      {
        source: "paper",
        attribution: "Chen et al., 'Accelerating Large Language Model Decoding with Speculative Sampling', arXiv:2302.01318",
        insight: "DeepMind's concurrent formulation with the formal acceptance-rate analysis; the cleanest source for the geometric expected-accepted-tokens derivation.",
      },
      {
        source: "paper",
        attribution: "Dao et al., 'FlashAttention: Fast and Memory-Efficient Exact Attention with IO-Awareness', arXiv:2205.14135, and Dao, 'FlashAttention-2', arXiv:2307.08691",
        insight: "The IO-aware tiling result and its follow-up. Emphasises exactness, which distinguishes it from approximate attention methods that trade quality for speed.",
      },
      {
        source: "paper",
        attribution: "Lin et al., 'AWQ: Activation-aware Weight Quantization', arXiv:2306.00978, and Frantar et al., 'GPTQ', arXiv:2210.17323",
        insight: "The two INT4 post-training methods. AWQ's finding that roughly 1 percent of weights are salient explains why it beats GPTQ at equal compression.",
      },
      {
        source: "blog",
        attribution: "NVIDIA TensorRT-LLM precision documentation (nvidia.github.io/TensorRT-LLM/precision.html) and vLLM quantisation guides",
        insight: "Practical FP8 calibration workflow, supported model coverage, and measured throughput against BF16 on H100 - the numbers to quote when asked what FP8 actually buys.",
      },
    ],
    practiceProblems: [
      "SPECULATIVE DECODING ANALYSIS. Draft produces 4 tokens in 12 ms; verifier pass = 80 ms; alpha = 0.85; K = 4. (a) Expected accepted per round? (b) Effective throughput? (c) Speedup? ANSWERS: (a) 1 + 0.85 + 0.72 + 0.61 = 3.18 tokens. (b) 3.18 / (0.012 + 0.080) = 34.6 tok/sec. (c) Baseline 1/0.080 = 12.5 tok/sec, so 2.77x. Note that halving the draft time to 6 ms moves throughput only to 37.0 tok/sec, while raising alpha to 0.95 moves it to 40.3 - confirming that draft-verifier alignment dominates draft speed.",
      "QUANTISATION SELECTION UNDER A QUALITY BUDGET. Deploy Llama-3-70B on one A100 80 GB, batch 4, context 4,096, with at most 2 percent quality regression. Which precision? ANSWER: INT8 weights = 70 GB; KV at batch 4 / 4K with GQA in BF16 = 5.4 GB; overhead 2 GB; total 77.4 GB - fits, but with under 3 GB of margin. Switching the KV cache to FP8 drops it to 2.7 GB for a total of 74.7 GB and a safer margin. Quality: INT8 is under 1 percent, inside the budget. INT4 AWQ would fit far more comfortably at 42.4 GB and permit batch 16, but its 3-5 percent regression breaches the 2 percent budget. RECOMMENDATION: INT8 weights plus FP8 KV cache. If a second A100 is available, BF16 across two GPUs removes the quality question entirely.",
      "ACCELERATION STACK DESIGN. Mistral-7B, BF16, naive serving on an A10G. Current P99 TTFT 800 ms, TPOT 30 ms. Targets: TTFT under 300 ms, TPOT under 15 ms. Design the stack. ANSWER: Step 1 - confirm Flash Attention 2 is enabled; expect roughly 30 percent off prefill and therefore TTFT. Step 2 - quantise weights to FP8 or INT8: 14 GB becomes 7 GB, and since decode is bandwidth-bound, TPOT falls from about 23 ms toward 12 ms at 600 GB/s, meeting the 15 ms target. Step 3 - enable continuous batching for utilisation. Step 4 - cache the static system prompt so its prefill is not repeated, which removes a fixed cost from every TTFT and brings short queries under 200 ms. Step 5 - only if TPOT still misses, add speculative decoding with a 1B draft. The first four steps are configuration changes; the fifth adds an operational commitment, so it goes last.",
      "WHEN NOT TO SPECULATE. A service runs batch size 64 on H100s, serving 2,000-token prompts with 30-token answers, and P99 is dominated by prefill. Would speculative decoding help? ANSWER: No, on three independent grounds. At batch 64 the verifier is already compute-bound, so there is no idle bandwidth for speculation to reclaim - speculation targets the memory-bound regime. Outputs of 30 tokens are short enough that per-round setup overhead is a significant fraction of the work. And latency here is prefill-dominated, while speculation accelerates only decode. The right interventions are chunked prefill and prompt caching. Correctly declining a technique is a stronger answer than applying it everywhere.",
      "FLASH ATTENTION VERSUS PAGEDATTENTION. An interviewer asks whether these are the same optimisation. Answer and justify. ANSWER: No - they are orthogonal and vLLM runs both simultaneously. Flash Attention optimises the attention computation: SRAM tiling with an online softmax avoids materialising the N-by-N score matrix, cutting HBM traffic from O(N^2) to O(N) and speeding up prefill while slashing activation memory. PagedAttention optimises KV cache allocation: OS-style paging removes internal fragmentation from over-provisioned contiguous allocations and enables copy-on-write sharing of common prefixes. One is about how attention is computed, the other about how its memory is allocated. Conflating them is common, and separating them cleanly is a strong depth signal.",
    ],
  },
];

