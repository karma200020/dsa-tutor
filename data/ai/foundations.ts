import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-ai-foundations - "AI: LLM Foundations" (8 topics).
// Coverage: transformer/attention mental model, tokenization, context windows,
// sampling & temperature, embeddings, why models hallucinate, model family
// selection, prompt engineering as a discipline.
//
// Authoring rules for every topic in this file:
// - `enrichTopic` (data/all-topics.ts) has no AI branch, so any field left empty
//   silently inherits DSA-flavored boilerplate. Supply `complexity`, `lesson`,
//   `examples`, `tips`, `tricks`, `memoryAids`, `interviewPatterns`,
//   `references`, `practiceProblems`, and `faq` explicitly.
// - `faq` needs at least 5 entries, each with a non-empty question and an answer
//   of 20+ characters (enforced by scripts/audit-faqs.ts).
// - `complexity` is repurposed for AI topics as a latency/cost framing, e.g.
//   time: "p95 latency dominated by decode tokens", space: "KV cache + index memory".
// - Use `asciiDiagram` from "./_shared" for diagrams; no external images.
export const aiFoundationsTopics: Topic[] = [
  // Refresh cadence: STABLE. The BPE mechanism and the "0.75 words per token"
  // heuristic do not move. Re-check only the vocabulary sizes and the tokenizer
  // names, which change when a new model family ships.
  {
    id: "topic-ai-foundations-tokenization",
    moduleId: "mod-ai-foundations",
    title: "Tokenization: How LLMs See Text",
    intuition:
      "LLMs don't read words or characters - they read tokens, variable-length text chunks produced by a learned compression algorithm, and nearly every surprising LLM behaviour (wrong letter counts, broken arithmetic, multilingual cost explosions, code indentation bugs) traces directly back to how tokenization carved up the input.",
    complexity: {
      time: "Tokenization itself is O(n) and cheap - roughly 50ms on CPU for a 100K-token request, negligible next to the model forward pass. What matters is that the token count directly gates total inference cost, because every API prices per input token plus output token.",
      space: "Token IDs are int32, so a 128K context is only ~512 KB of IDs before embedding lookup. The real memory item is the embedding table itself: vocab_size x d_model (roughly 100K x 4096 x 4 bytes = ~1.6 GB at GPT-4 scale)."
    },
    lesson: [
      {
        title: "What Is a Token, Really?",
        content:
          "A token is the atomic unit the model processes. It is neither a word nor a character but a subword unit produced by Byte-Pair Encoding (BPE) or a close relative. Common English words are usually a single token; rare words split into several; numbers split digit-by-digit or in small groups; punctuation is frequently its own token. The working rule of thumb for English prose is about 0.75 words per token, so 1,000 words is roughly 1,333 tokens. That has an immediate billing consequence: every provider prices per token, not per word or character, so word counts are never a safe proxy for cost. The insight that matters most to engineers is that token boundaries are not aligned with human linguistic units. That misalignment is exactly why \"how many r's in strawberry?\" trips models - the model is attending to tokens like [\"straw\", \"berry\"], and there is no isolated \"r\" in that view of the string for it to count.",
        codeExample: `import tiktoken

# GPT-4 / GPT-4o use cl100k_base
enc = tiktoken.get_encoding("cl100k_base")

surprising_strings = [
    ("Common English", "Hello, world!"),
    ("The strawberry problem", "strawberry"),
    ("IP address", "192.168.1.1"),
    ("Python code", "def fibonacci(n):"),
    ("Japanese", "こんにちは世界"),
    ("Numbers/math", "9.11 > 9.9"),
    ("A famous product", "ChatGPT"),
]

for label, text in surprising_strings:
    tokens = enc.encode(text)
    decoded = [enc.decode([t]) for t in tokens]
    print(f"{label:20s} | tokens={len(tokens):3d} | {decoded}")

# Output (approximate):
# Common English         | tokens=  4 | ['Hello', ',', ' world', '!']
# The strawberry problem | tokens=  2 | ['straw', 'berry']   <- no isolated 'r'
# IP address             | tokens=  7 | ['192', '.', '168', '.', '1', '.', '1']
# Python code            | tokens=  6 | ['def', ' fib', 'on', 'acci', '(n', '):']
# Japanese               | tokens=  9 | ['こんにちは', '世界'] (varies by tokenizer)
# Numbers/math           | tokens=  8 | ['9', '.', '11', ' >', ' ', '9', '.', '9']
# A famous product       | tokens=  3 | ['Chat', 'G', 'PT']`
      },
      {
        title: "BPE: How the Vocabulary Is Built",
        content:
          "Byte-Pair Encoding builds the vocabulary bottom-up. Start with a corpus represented as individual characters. Count the frequency of every adjacent pair. Merge the single most frequent pair into a new vocabulary entry. Repeat until the vocabulary reaches a target size - roughly 100,276 entries for GPT-4's cl100k_base. After many thousands of merges, common English morphemes such as \"ing\", \"tion\" and \"pre\" have emerged as single tokens simply because they occurred as frequent adjacent pairs. GPT-style models use byte-level BPE: the algorithm operates on raw UTF-8 bytes rather than Unicode code points, which means every possible byte sequence is representable and no input can ever produce an unknown-token error. Two related families are worth recognising: WordPiece (used by BERT, which marks continuation subwords with \"##\") and SentencePiece/Unigram (used by LLaMA, T5 and Mistral, which treat whitespace as a normal character). The engineering constraint that follows from all of this is absolute: the tokenizer is frozen at training time. You cannot swap tokenizers without retraining the model from scratch.",
        diagram: asciiDiagram(`BPE Merge Process (toy corpus: "lower lower lowest")
──────────────────────────────────────────────────────

Step 0 (characters):
  l o w e r   l o w e r   l o w e s t
  Pair counts: (l,o)=3, (o,w)=3, (w,e)=3, (e,r)=2, (e,s)=1, (s,t)=1

Step 1 - merge most frequent (l,o):
  lo w e r   lo w e r   lo w e s t
  New vocab entry: "lo"

Step 2 - next most frequent now (lo,w):
  low e r   low e r   low e s t
  New vocab entry: "low"

Step 3 - merge (e,r):
  lower   lower   low e s t
  New vocab entry: "er"  ->  "lower" is now 1 token

Step 4 - merge (e,s):
  lower   lower   low est
  New vocab entry: "est"

Final tokens: "lower"  -> [lower]      (1 token)
              "lowest" -> [low][est]   (2 tokens)`)
      },
      {
        title: "Where Token Counts Surprise Engineers",
        content:
          "Four domains account for almost every token-count surprise in production. (1) Arithmetic and number reasoning: \"9.11 > 9.9\" errors have tokenization as a contributing factor, because \"9.11\" tokenizes as several tokens (9, ., 11) whose digits are attended to separately, and the model's implicit comparison heuristics were learned from text rather than from arithmetic circuits. (2) Letter counting: \"strawberry\" becomes [\"straw\", \"berry\"], so the model must reason about characters inside token boundaries, a skill learned imperfectly from data. Newer frontier models are much better at this, but the mechanism has not changed. (3) Code: Python depends on indentation, and a four-space indent is typically one token while eight spaces are two, so deeply nested code inflates token counts faster than line count suggests. (4) Multilingual text: a Japanese or Chinese character costs roughly one to three tokens, making East Asian scripts about two to three times more token-expensive per unit of meaning than English prose. That last point is the one that silently destroys cost budgets for multilingual applications.",
        diagram: asciiDiagram(`Token Cost Comparison Table (cl100k_base)
──────────────────────────────────────────────────────────────
Text                                Chars  Tokens  Tokens/char
──────────────────────────────────────────────────────────────
"Hello, world!"                       13       4      0.31
"The quick brown fox"                 19       5      0.26  <- English baseline
"Le renard brun rapide"               21       7      0.33  <- French
"El rapido zorro marron"              22       9      0.41  <- accents split
"速い茶色のキツネ"                       8      15      1.88  <- Japanese ~6x
"def quicksort(arr: list):"           25       9      0.36  <- code ~ prose
"    " (4 spaces)                      4       1      0.25
"        " (8 spaces)                  8       2      0.25
"192.168.0.1"                         11       7      0.64  <- IPs expensive
"2024-08-30T22:03:54"                 19      10      0.53  <- ISO timestamps
──────────────────────────────────────────────────────────────`)
      },
      {
        title: "Context Windows Are Measured in Tokens",
        content:
          "Every limit an engineer cares about - context window, maximum output length, API cost - is denominated in tokens. A ten-page PDF is roughly 5,000 words, or about 6,700 tokens. A 128K context window is roughly 96,000 words, about the length of a novel. The billing implication is the part teams underestimate: a verbose 800-word system prompt costs about 1,067 tokens on every single call, and at ten million calls a day that is a recurring line item measured in thousands of dollars a month for text nobody ever reads. Budget all four components before choosing a model: system prompt, conversation history, retrieved context, and expected output. And keep two limits distinct - max_tokens caps the generated output, while the context window caps input plus output combined. Sending 120K tokens to a 128K model leaves only 8K tokens for the reply.",
        codeExample: `def token_cost_budget(
    system_prompt: str,
    conversation_history: list[dict],   # [{"role": ..., "content": ...}]
    retrieved_chunks: list[str],
    expected_output_tokens: int,
    context_limit: int = 128_000,
    usd_per_input_token: float = 2.5e-6,
) -> dict:
    import tiktoken
    enc = tiktoken.get_encoding("cl100k_base")

    def count(text: str) -> int:
        return len(enc.encode(text))

    system_tokens    = count(system_prompt)
    # +4 tokens per message for the chat-template role scaffolding
    history_tokens   = sum(count(m["content"]) + 4 for m in conversation_history)
    retrieval_tokens = sum(count(c) for c in retrieved_chunks)
    total_input      = system_tokens + history_tokens + retrieval_tokens
    total            = total_input + expected_output_tokens

    return {
        "system_prompt_tokens":   system_tokens,
        "history_tokens":         history_tokens,
        "retrieval_tokens":       retrieval_tokens,
        "expected_output_tokens": expected_output_tokens,
        "total_tokens":           total,
        "headroom_tokens":        context_limit - total,
        "fits_in_context":        context_limit - total >= 0,
        "estimated_input_cost":   round(total_input * usd_per_input_token, 5),
    }`
      },
      {
        title: "Special Tokens and Chat Templates",
        content:
          "Production engineers run into special tokens constantly: markers that delimit conversation turns, signal start and end of sequence, or mark role boundaries. They are reserved vocabulary entries, not ordinary text. Chat models are fine-tuned on data wrapped in a model-specific template, so sending raw text without that template causes the model to treat the input as mid-document text to continue rather than a prompt to answer. Hosted chat APIs apply the template for you transparently. Open-source models served through a local runtime do not - you must call the tokenizer's chat-template function explicitly. Forgetting it is one of the most common silent bugs in self-hosted deployments, because nothing errors: the model simply answers badly. Budget for the template too, since the role scaffolding typically adds a few dozen tokens per call.",
        codeExample: `from transformers import AutoTokenizer

tokenizer = AutoTokenizer.from_pretrained("meta-llama/Meta-Llama-3-8B-Instruct")

messages = [
    {"role": "system", "content": "You are a helpful coding assistant."},
    {"role": "user",   "content": "Write a Python hello-world function."},
]

# WITHOUT apply_chat_template -> raw text -> model completes as a document
raw = "You are a helpful coding assistant.\\nWrite a Python hello-world function."

# WITH apply_chat_template -> model sees the format it was fine-tuned on
formatted = tokenizer.apply_chat_template(
    messages,
    tokenize=False,
    add_generation_prompt=True,
)
# Result contains the model's reserved role markers, e.g.
#   <|start_header_id|>system<|end_header_id|> ... <|eot_id|>
#   <|start_header_id|>user<|end_header_id|>   ... <|eot_id|>
#   <|start_header_id|>assistant<|end_header_id|>

print(f"Raw tokens:       {len(tokenizer.encode(raw))}")
print(f"Formatted tokens: {len(tokenizer.encode(formatted))}")
# Formatted is ~30 tokens longer because of the special tokens -
# budget these when calculating context-window usage.`
      }
    ],
    examples: [
      {
        title: "Token Count Discrepancy Audit",
        input:
          "A developer estimates token usage for a 1,000-word user prompt using len(text.split()) and budgets for 1,000 tokens.",
        output: "tiktoken reports 1,347 tokens - 34.7% more than estimated.",
        explanation:
          "Step 1: split() on whitespace counts \"word,\" as one word, but the tokenizer emits \"word\" and \",\" separately.\nStep 2: any code snippet inside the prompt splits heavily - brackets, operators and identifiers each become tokens.\nStep 3: the developer forgot the system prompt entirely, which adds a constant ~300 tokens to every call.\nStep 4: rare words and proper nouns split into two or three tokens each.\nLesson: always measure with the real tokenizer before capacity planning; never use word count as a proxy."
      },
      {
        title: "The Strawberry Problem",
        input: "Prompt: \"How many letter r's are in the word strawberry?\"",
        output: "An older model answers \"2\". The correct answer is 3.",
        explanation:
          "Step 1: \"strawberry\" tokenizes in cl100k_base as [\"straw\", \"berry\"] - two tokens.\nStep 2: neither token string exposes an isolated \"r\" the model can count positionally by index.\nStep 3: the model has to reason about characters inside token boundaries, a capability learned imperfectly from training data rather than guaranteed by architecture.\nStep 4: the reliable mitigation is to change the task shape - instruct the model to spell the word out character by character first, then count. Newer models handle this better because of more character-level training data, but the underlying mechanism is unchanged."
      },
      {
        title: "Multilingual Context Budget Explosion",
        input:
          "A RAG chatbot retrieves 5 chunks of 200 words each. The budget was computed for English: 200 words x 1.33 tokens/word = 266 tokens per chunk, 1,330 tokens total.",
        output: "In production for Japanese users the same content consumes about 3,000 tokens - more than double the estimate.",
        explanation:
          "Step 1: English at ~0.75 words per token gives ~267 tokens for a 200-word chunk.\nStep 2: Japanese runs at roughly 2 to 3 tokens per character, so the semantically equivalent chunk lands nearer 480-720 tokens.\nStep 3: five Japanese chunks at an average of 600 tokens is 3,000 tokens against 1,330 for English - a 2.3x overrun that will silently truncate retrieved context on a tight window.\nStep 4: the fix is a token-aware chunk selector that measures the actual token count with the target-language tokenizer and applies a per-language budget multiplier rather than a single global constant."
      }
    ],
    tips: [
      "Always count tokens with the model's own tokenizer library - never use word count or character count as a proxy for a production cost estimate.",
      "Numbers, IP addresses, dates, timestamps and code are the biggest token-count surprises; benchmark those domains specifically before committing to a budget.",
      "Repeated content costs tokens on every single call. Cache or compress static prefixes using provider-side prompt caching rather than re-sending them.",
      "For open-source models, always apply the chat template. Omitting it is one of the most common silent failures in self-hosted LLM deployments.",
      "The tokenizer is frozen at training time - you cannot change it without retraining the model from scratch.",
      "Token limits cover input plus output combined. Sending 120K tokens to a 128K-context model leaves only 8K tokens for the reply."
    ],
    tricks: [
      "The \"divide by 0.75\" head estimate: word count / 0.75 gives English token count. A 300-word email is 400 tokens; add 20% for punctuation and rare words and call it 480.",
      "Paste your system prompt into a tokenizer playground before deploying and scan for surprising splits - product names, technical terms and numbers are the usual offenders. Rephrase them before you discover them in the invoice.",
      "Token-compress list-formatted prompts: rewriting \"- Do X / - Do Y / - Do Z\" as \"Do X, Y, and Z.\" saves four to six tokens per bullet, which is measurable at scale.",
      "Use the tokenizer's ordinary-encode path when you only need raw token IDs for bulk estimation - it skips special-token handling and is faster.",
      "Measure your system prompt's token cost once and pin it as a constant in the codebase. It does not change per request, so there is no reason to re-tokenize it on every call."
    ],
    memoryAids: [
      "\"Three-quarters of a word\" - English prose averages about 0.75 words per token; every 4 words is roughly 3 tokens.",
      "\"Japanese costs 3x\" - East Asian scripts run about three times the token-per-word rate of English.",
      "\"BPE = Byte-Pair Entente\" - the most frequent byte pairs form an alliance (merge) first, and common morphemes emerge from repeated merges.",
      "\"Special tokens are the punctuation of the model's world\" - they separate turns and signal start and stop, and the model was trained to act on them."
    ],
    interviewPatterns: [
      "\"A customer complains the model can't count the letter 'r' in 'strawberry'. Explain why, and what you'd do about it.\" - tests the tokenization mechanism; cover BPE boundaries, character-within-token reasoning, and spell-out prompting as the mitigation.",
      "\"Walk me through estimating the monthly cost of processing 1 million customer reviews through an LLM.\" - tests token counting plus billing literacy; measure with the real tokenizer, account for the per-call system prompt, and separate input from output pricing.",
      "\"Your multilingual chatbot hits context limits in Japanese but not English for the same conversations. Why?\" - tests multilingual tokenization; the answer is tokens-per-character, not words-per-message.",
      "\"We need a 500-word system prompt on every call at 10M calls/day. What's the monthly cost impact?\" - tests token arithmetic: 500 / 0.75 = 667 tokens, x 10M x 30 days, then multiply by the input rate.",
      "\"What are special tokens, and why would forgetting them break an open-source deployment?\" - tests chat-template awareness; the model treats input as continuation text and produces plausible nonsense.",
      "Frequency and audience: Tier 1 - asked in roughly 90%+ of AI-focused loops, and expected at Google, OpenAI, Anthropic, Meta, Amazon, Microsoft and effectively any team that ships an LLM deployment."
    ],
    faq: [
      {
        question: "Do all GPT models use the same tokenizer?",
        answer:
          "No. Older GPT-3.5-era models used p50k_base with a vocabulary of about 50,256 entries, while the GPT-4 family uses cl100k_base with about 100,276. The larger vocabulary turns more common subwords into single tokens, improving encoding efficiency by roughly 10-15% on the same text. The tokenizer is baked into the model and cannot be changed, so always use the tokenizer that matches the exact model you are calling.",
        category: "model-specific",
        source: "OpenAI tiktoken documentation",
        sourceLinks: [{ label: "tiktoken (GitHub)", url: "https://github.com/openai/tiktoken" }]
      },
      {
        question: "Can the model \"see\" individual characters inside a token?",
        answer:
          "Not directly during the attention computation - the model operates on token-level embeddings, not character-level ones. It can however learn to reason about characters from training data, developing implicit character-decomposition behaviour. That capability is learned rather than architectural, so it is brittle for rare token forms and less reliable than tasks that fall naturally on token boundaries. This is why newer models improved at letter counting without solving it structurally.",
        category: "mechanism"
      },
      {
        question: "Does tokenization affect fine-tuning?",
        answer:
          "Yes. The tokenizer is fixed during fine-tuning. If your training data is full of domain-specific terms - medical codes, legal citations, proprietary product names - that shatter into many subword fragments, the model has to work harder to learn them than it would for cleanly-tokenized terms. Extending the vocabulary before fine-tuning is possible but requires careful initialisation of the new token embeddings and is rarely worth the complexity. Rephrasing domain terms so they tokenize more cleanly is usually the cheaper fix.",
        category: "fine-tuning"
      },
      {
        question: "How do I count tokens for images in multimodal models?",
        answer:
          "Vision models tile images into patches, and each tile consumes a fixed token budget. A small image in a low-detail mode may cost under a hundred tokens; a large image in high-detail mode can cost well over a thousand. The practical consequence is that a document containing five screenshots can cost more tokens than five pages of text. Always account for image tokens as a separate line in a multimodal budget rather than folding them into a text estimate.",
        category: "multimodal"
      },
      {
        question: "Can tokenization be used in attacks?",
        answer:
          "Yes. \"Glitch tokens\" are vocabulary entries that exist in the BPE vocabulary but appeared very rarely in training data; prompting them can cause bizarre, unstable output - the SolidGoldMagikarp findings documented this publicly. More practically, adversarial prompts can use unusual Unicode - zero-width spaces, look-alike characters, non-standard hyphens - so that an upstream filter and the model tokenize the same string differently, which is a real bypass path for naive injection filters.",
        category: "security",
        sourceLinks: [
          {
            label: "SolidGoldMagikarp (LessWrong)",
            url: "https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation"
          }
        ]
      },
      {
        question: "What is the difference between tiktoken and the HuggingFace tokenizers library?",
        answer:
          "They target different model families. tiktoken is OpenAI's library with a fast Rust core, covering the GPT encodings (cl100k_base, p50k_base, r50k_base). HuggingFace tokenizers is a general library supporting BPE, WordPiece and SentencePiece for any model on the Hub. The rule is simple: if you call a hosted OpenAI model, use tiktoken; if you serve an open-weights model, load that model's own tokenizer so your counts match what the server actually does.",
        category: "tooling"
      }
    ],
    practiceProblems: [
      "Token count audit: tokenize \"As of Q3 2024, the S&P 500 returned 22.08% YTD. The Fed's dot-plot suggests 2-3 rate cuts in 2025.\" with cl100k_base. (a) Count the tokens. (b) Identify the three substrings that split most aggressively and say why. (c) Estimate the Japanese cost. ANSWER: ~38 tokens. Worst splits: \"22.08%\" -> [22][.][08][%], \"S&P\" -> [S][&][P], \"2-3\" -> [2][-][3] (the en-dash is multi-byte UTF-8). Japanese equivalent lands around 65-80 tokens.",
      "System prompt cost: a 450-word system prompt ships on every call, at 10M calls/day, with input priced at $2.50 per million tokens. What is the monthly cost of the system prompt alone? ANSWER: 450 / 0.75 = 600 tokens per call. 600 x 10M = 6B tokens/day, x30 = 180B tokens/month. 180,000 x $2.50 = $450,000/month.",
      "Debug the chat template: a team serves an instruct-tuned open-weights model without applying the chat template. Asked \"What is 2+2?\", it replies \"What is 2+2? Well, that depends on the mathematical system you're using...\". Explain the bug and write the fix. ANSWER: without the template the model sees a document fragment to continue rather than a chat turn to answer, so a chat-tuned model degrades to base-completion behaviour. Fix: call tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True) and send the result as the prompt.",
      "Multilingual budget: a RAG pipeline retrieves 5 chunks of 200 words for English users. The Japanese localisation averages 350 characters per chunk at ~2.5 tokens/character. What is the retrieved-context budget in each language, and what safety multiplier should you apply? ANSWER: English 5 x 267 = 1,335 tokens; Japanese 5 x 875 = 4,375 tokens; ratio 3.3x, so size Japanese contexts with at least a 3.5x multiplier."
    ],
    references: [
      {
        source: "blog",
        attribution: "OpenAI Tokenizer Playground (https://platform.openai.com/tokenizer)",
        insight: "Interactive tool; the fastest way to see a surprising tokenization with your own prompt text."
      },
      {
        source: "blog",
        attribution: "tiktoken, OpenAI (https://github.com/openai/tiktoken)",
        insight: "Official Python library for GPT tokenization; encode any string to see the exact splits and counts."
      },
      {
        source: "note",
        attribution:
          "Sennrich, Haddow & Birch, \"Neural Machine Translation of Rare Words with Subword Units\" (BPE, 2016) - https://arxiv.org/abs/1508.07909",
        insight: "The original BPE paper; explains the merge algorithm from first principles in a few pages."
      },
      {
        source: "blog",
        attribution: "HuggingFace, \"Summary of the Tokenizers\" (https://huggingface.co/docs/transformers/tokenizer_summary)",
        insight: "Compares BPE, WordPiece and SentencePiece side by side with worked examples and their quirks."
      },
      {
        source: "note",
        attribution: "Andrej Karpathy, \"Let's build the GPT Tokenizer\" (video, ~2h) - https://www.youtube.com/watch?v=zduSFxRajkE",
        insight: "Builds BPE from scratch in Python; the single best resource if you want the mechanism to stop feeling like magic."
      },
      {
        source: "note",
        attribution:
          "Rumbelow & Watkins, \"SolidGoldMagikarp\" (LessWrong, 2023) - https://www.lesswrong.com/posts/aPeJE8bSo6rAFoLqg/solidgoldmagikarp-plus-prompt-generation",
        insight: "Documents glitch tokens and what happens when a vocabulary entry is present but effectively untrained."
      },
      {
        source: "book",
        attribution: "Chip Huyen, AI Engineering (O'Reilly, 2025), Chapter 2",
        insight: "Production-oriented treatment of tokenization and its billing and latency implications."
      },
      {
        source: "blog",
        attribution: "Jay Alammar, \"The Illustrated GPT-2\" (https://jalammar.github.io/illustrated-gpt2/)",
        insight: "Best visual explanation of the tokens -> embeddings -> attention forward pass."
      }
    ]
  },

  // Refresh cadence: STABLE. Attention, multi-head projection, causal masking and
  // the KV cache do not change. Re-check the named variants (GQA, RoPE, sliding
  // window, FlashAttention generation) roughly once a year.
  {
    id: "topic-ai-foundations-transformer-attention",
    moduleId: "mod-ai-foundations",
    title: "Transformers & Attention: The Engineer's Mental Model",
    intuition:
      "A transformer is a machine that, at every layer, asks each token \"which other tokens should I pay attention to right now?\" and uses the weighted sum of the answers to build progressively richer representations - which is how patterns from grammar to world knowledge emerge purely from predicting the next token, without a single hand-coded rule.",
    complexity: {
      time: "Attention is O(n^2 * d) per layer in sequence length n and model dimension d, which is why doubling the context quadruples attention compute. FlashAttention cuts the memory footprint to O(n) by never materialising the full attention matrix, but the FLOPs stay O(n^2 * d).",
      space: "KV cache grows as 2 x n_layers x seq_len x d_model x bytes_per_element. At 70B scale with a 32K context that is tens of gigabytes per concurrent session in float16 - the dominant memory cost at inference time, ahead of the model weights themselves."
    },
    lesson: [
      {
        title: "Attention as a Soft Database Lookup",
        content:
          "The most useful frame for an engineer is not neural magic but a familiar primitive: attention is a soft key-value lookup. In a hard database you supply an exact key and retrieve one value. In attention you supply a query, compute a continuous similarity score against every key, and take a weighted average of the corresponding values. The query is a linear projection of the current token (\"what am I looking for?\"), the keys are projections of all tokens (\"what does each token offer?\"), and the values are projections of all tokens (\"what information does each token contribute?\"). Similarity is a scaled dot product, softmax(QK^T / sqrt(d_k))V, where the sqrt(d_k) scaling stops dot products from growing large enough in high dimensions to push softmax into saturation. The property that matters for systems work is that every token attends to every other token in one operation - which is precisely why transformers parallelise on GPUs while RNNs are inherently sequential.",
        diagram: asciiDiagram(`Attention = Soft Key-Value Database Lookup
──────────────────────────────────────────────────────────

Query (Q):  "What context do I need for the word 'bank'?"
                          │
                          ▼
       ┌──────────────────────────────────────────────┐
       │ Compute dot-product similarity with each Key │
       │                                              │
       │   K["river"] ────── score: 8.3               │
       │   K["money"] ────── score: 5.1               │
       │   K["The"]   ────── score: 2.2               │
       │   K["steep"] ────── score: 1.9               │
       └──────────────────────────────────────────────┘
                          │
                 divide by sqrt(d_k), then softmax
                          │
                          ▼
       Attention weights (sum to 1.0):
         "river" -> 0.64
         "money" -> 0.27
         "The"   -> 0.05
         "steep" -> 0.04
                          │
                          ▼
       Output = 0.64*V["river"] + 0.27*V["money"]
              + 0.05*V["The"]   + 0.04*V["steep"]
              ^ enriched representation of "bank"
                (mostly river-flavoured, partly money-flavoured)`)
      },
      {
        title: "Multi-Head Attention: Parallel Representational Subspaces",
        content:
          "A single attention head can only focus on one kind of relationship at a time. Multi-head attention runs H heads in parallel, each with its own learned Q, K and V projection matrices of dimension d_k = d_model / H. That lets different heads capture different relationship types simultaneously: one tracks subject-verb agreement, another resolves coreference (\"it\" back to \"the dog\"), another tracks topical similarity. The H head outputs are concatenated and projected back to d_model through a learned output matrix. The total parameter count is essentially the same as one wide head - the payoff is representational diversity, not capacity. Typical shapes: BERT-base uses d_model 768 with 12 heads of width 64; an 8B-parameter decoder typically uses d_model 4096 with 32 heads of width 128. Importantly, no head is programmed to do a particular job; the specialisations are emergent, which is why interpretability research spends so much effort simply identifying what each head learned.",
        diagram: asciiDiagram(`Multi-Head Attention (d_model=768, H=12, d_k=64)
─────────────────────────────────────────────────────────────

Input: [seq_len x 768]
      │
      ├──────┬───────┬──── ... ────┬──────────┐
   Head 1  Head 2  Head 3        Head 12      │
   Q1K1V1  Q2K2V2  Q3K3V3       Q12K12V12     │
   [d_k=64]                                   │
      │      │       │              │         │
   Attn1  Attn2   Attn3          Attn12       │
      │      │       │              │         │
      └──────┴───────┴──────────────┘         │
                   Concat                     │
              [seq_len x 768]                 │
                     │                        │
                    W_O  <────────────────────┘
              [seq_len x 768]

Head 1  may learn: positional proximity
Head 7  may learn: syntactic dependency
Head 11 may learn: coreference resolution
(These are emergent - not programmed)`)
      },
      {
        title: "Positional Encoding: Injecting Word Order",
        content:
          "Attention as described so far is permutation-invariant: shuffle the token positions and the scores are unchanged, because each query scores against all keys regardless of where they sit. Positional encoding injects order. The original transformer used fixed sinusoidal functions of position at different frequencies per dimension. Modern decoder LLMs overwhelmingly use Rotary Position Embedding (RoPE), which encodes position by rotating the query and key vectors by an angle proportional to their index; it generalises to longer sequences better than learned absolute embeddings. A third family, ALiBi, simply adds a linear bias to attention scores based on the distance between tokens. Engineers should care about this specific detail because every context-window extension technique - position interpolation, YaRN, LongRoPE - is a modification of the positional encoding scheme. You cannot reason about why a model was successfully extended from 8K to 128K without knowing what RoPE is doing.",
        diagram: asciiDiagram(`Why positional encoding is required
─────────────────────────────────────────────────────────

Without position info, attention sees a BAG of tokens:

  "dog bites man"   ->  {dog, bites, man}
  "man bites dog"   ->  {man, bites, dog}   <- identical scores!

With position injected, each token carries "where I am":

  pos 0        pos 1         pos 2
  [dog]+p0     [bites]+p1    [man]+p2
  [man]+p0     [bites]+p1    [dog]+p2   <- now distinguishable

Three schemes in use:
  sinusoidal : fixed waves, added to the input embedding
  RoPE       : rotate Q and K by an angle proportional to index
               (LLaMA / Mistral / Gemma; extends to long context)
  ALiBi      : add a linear distance penalty to attention scores`)
      },
      {
        title: "The Full Decoder Forward Pass: From Token to Prediction",
        content:
          "The complete forward pass of a decoder-only model is short enough to hold in your head. Step one: token IDs index into an embedding table of shape vocab_size x d_model, and positional information is applied, giving a tensor of shape [seq_len x d_model]. Step two: that tensor passes through N transformer blocks - 32 for an 8B model, dozens more at frontier scale. Each block is LayerNorm, then multi-head causal self-attention (masked so each token only sees earlier tokens), then a residual add; then LayerNorm again, a feed-forward network of two linear layers with a nonlinearity and a hidden width typically 4x d_model, then another residual add. Step three: the final hidden state of the last position is projected to vocabulary size, softmaxed into a probability distribution over the next token, and sampled. The residual connections are not cosmetic - they are the gradient highways that make training a stack this deep feasible at all.",
        diagram: asciiDiagram(`GPT-Style Decoder Forward Pass
────────────────────────────────────────────────────────────────

Input:  "The cat sat"
  │
  [Tokenizer] -> IDs: [464, 3797, 3332]
  │
  [Embedding Table]  vocab_size x d_model
  │  shape: [3 x d_model]
  │
  ┌──────────────────────────────────────────────┐  <- Block 1
  │  LayerNorm                                   │
  │       ↓                                      │
  │  Causal Multi-Head Self-Attention            │
  │  (token i can only attend to tokens <= i)    │
  │       ↓                                      │
  │  + Residual  ←──────────────────────────────  skip
  │       ↓                                      │
  │  LayerNorm                                   │
  │       ↓                                      │
  │  Feed-Forward Network                        │
  │    Linear(d_model -> 4*d_model) -> GELU      │
  │    Linear(4*d_model -> d_model)              │
  │       ↓                                      │
  │  + Residual  ←──────────────────────────────  skip
  └──────────────────────────────────────────────┘
       ... repeat x N blocks ...
  │
  [LM Head: Linear(d_model -> vocab_size)]
  │
  [Softmax -> next-token probability distribution]
  │
  Sample -> next token`)
      },
      {
        title: "KV Cache: Why Inference Differs from Training",
        content:
          "During training the whole sequence is available at once and all positions are processed in parallel. During inference the model generates autoregressively, one token at a time. Without optimisation it would recompute the K and V matrices for every prior token at every single step - quadratic work for a linear amount of output. The KV cache stores the computed K and V tensors for all tokens generated so far, so each new step computes K and V only for the new token and reads the rest from cache. The cost of that trade is memory: roughly 2 x n_layers x seq_len x d_model x bytes_per_element, and it grows linearly with both sequence length and concurrency. This is the single most important number in production LLM serving, because it - not the model weights - is what caps how many concurrent long-context sessions a GPU can hold. Every serving decision downstream (quantisation level, maximum batch size, maximum sequence length, hardware choice) is really a KV-cache decision.",
        diagram: asciiDiagram(`Generation without vs. with a KV cache
──────────────────────────────────────────────────────────────

WITHOUT cache - recompute everything each step:
  step 1:  compute K,V for [t1]                      1 token
  step 2:  compute K,V for [t1,t2]                   2 tokens
  step 3:  compute K,V for [t1,t2,t3]                3 tokens
  ...
  total work to emit t tokens  =  O(t^2 * d)

WITH cache - compute only the new token:
  step 1:  K,V(t1) -> cache[1]
  step 2:  K,V(t2) -> cache[2],  reuse cache[1]
  step 3:  K,V(t3) -> cache[3],  reuse cache[1..2]
  ...
  total work to emit t tokens  =  O(t * d)
  memory held                  =  O(t * n_layers * d)

Sizing formula (float16):
  bytes = 2 (K and V) x n_layers x seq_len x d_model x 2`)
      }
    ],
    examples: [
      {
        title: "Tracing Attention for Coreference",
        input: "Sentence: \"The animal didn't cross the street because it was too tired.\" Which word does \"it\" attend to?",
        output: "A coreference-tracking head assigns high weight from \"it\" to \"animal\" (about 0.71) and very low weight to \"street\" (about 0.04).",
        explanation:
          "Step 1: the pronoun is genuinely ambiguous at the surface level - grammatically \"it\" could bind to either \"animal\" or \"street\".\nStep 2: humans resolve it semantically, because being tired applies to animals and not to streets.\nStep 3: probing work on trained transformers finds specific heads whose attention pattern implements exactly this resolution, without anyone having programmed a coreference rule.\nStep 4: the takeaway for design discussions is that linguistic structure is emergent from the attention mechanism plus data, which is also why it is unreliable in exactly the cases the training distribution under-covers."
      },
      {
        title: "KV Cache Memory Budget",
        input: "An 8B decoder: 32 layers, 32 heads, d_k = 128 (d_model = 4096), float16. Serving 50 concurrent sessions of 8,192 tokens each.",
        output: "About 4.3 GB of KV cache per session, so about 214 GB across 50 sessions.",
        explanation:
          "Step 1: per session, bytes = 2 (K and V) x 32 layers x 4096 d_model x 8192 tokens x 2 bytes = 4.29 GB.\nStep 2: multiply by 50 concurrent sessions: about 214 GB, entirely separate from the ~16 GB of model weights.\nStep 3: that immediately rules out serving this workload on a single 80 GB accelerator - the KV cache alone is nearly three times the available memory.\nStep 4: the levers are quantising the KV cache to int8 (roughly halving it), using PagedAttention so blocks are allocated on demand instead of reserved at max length, reducing the maximum sequence length, or sharding across GPUs. Grouped-query attention, which shares K and V across groups of query heads, cuts this by another four to eight times."
      },
      {
        title: "Encoder vs. Decoder Selection",
        input: "A team needs to (a) classify support tickets into 12 categories and (b) generate personalised reply drafts. A colleague proposes using one large frontier chat model for both.",
        output: "Recommend a fine-tuned encoder model for (a) and a decoder chat model for (b).",
        explanation:
          "Step 1: encoder-only models use bidirectional attention, so every token sees every other token, producing rich representations ideal for classification where the full input is available up front.\nStep 2: decoder-only models use causal attention because generation requires predicting the next token without peeking ahead - the right architecture for drafting replies.\nStep 3: for high-volume classification, a few-hundred-million-parameter fine-tuned encoder is one to two orders of magnitude cheaper per inference than a frontier chat model, with comparable accuracy on a narrow label set.\nStep 4: the interview point is not \"BERT is better\" but that architecture should follow task shape, and that mixing both in one system is normal rather than a compromise."
      }
    ],
    tips: [
      "Never say \"the model understands X\" in an interview - say \"the attention mechanism lets the model correlate X with Y across token positions.\" That framing is both more accurate and more professional.",
      "The feed-forward sub-layer behaves like a key-value memory storing factual associations, while attention handles routing and context aggregation. Knowing the split explains why factual recall and reasoning fail differently.",
      "KV cache is the dominant inference memory cost for long contexts - ask \"what's my KV cache budget?\" before agreeing to any long-context serving design.",
      "Encoder-only means bidirectional and suits understanding tasks; decoder-only means causal and suits generation; encoder-decoder suits sequence-to-sequence transformation.",
      "Attention is quadratic in sequence length, which is why long context is expensive and why linear-attention alternatives remain an active research area.",
      "Residual connections are not decoration - they are what makes training very deep stacks feasible by giving gradients a path around saturated layers."
    ],
    tricks: [
      "When asked to explain attention in a system design interview, lead with the database analogy: \"a soft key-value lookup where every token queries every other token simultaneously.\" It is precise and needs no ML background from the interviewer.",
      "Estimate KV cache in your head as (2 x n_layers x seq_len x d_model x 2 bytes) / 1e9 GB. For a 32-layer, 4096-wide model at 4K tokens that is about 2.1 GB per session. Memorise the formula, not the number.",
      "Causal masking in 25 words: \"a triangular mask sets attention scores from position t to any later position to negative infinity before softmax, so those positions get zero weight.\"",
      "Grouped-query attention is the production answer to a KV cache problem - fewer KV heads than query heads, shared across groups, cutting cache size four to eight times. Raise it the moment KV memory comes up.",
      "FlashAttention is the answer to \"why is long context feasible now\" - it fuses the computation to avoid materialising the quadratic attention matrix in GPU memory. Name it when discussing long-context architecture."
    ],
    memoryAids: [
      "\"QKV = Query the Key-Value store\" - attention is literally a soft database lookup with learned projections.",
      "\"Multi-head = multiple perspectives simultaneously\" - like a syntax checker, a fact checker and a tone checker all reading the same sentence at once.",
      "\"Residual connections = gradient highways\" - skip connections let gradients reach early layers, making very deep stacks trainable.",
      "\"Causal = can't look forward\" - each position sees only the past, mirroring how generation actually proceeds."
    ],
    interviewPatterns: [
      "\"Explain the attention mechanism to a backend engineer who has never studied ML.\" - tests intuition and communication; they want the soft-lookup analogy, not matrix calculus.",
      "\"Why do longer context windows cost more memory at inference time?\" - tests KV cache understanding; give the formula or at minimum the linear-growth argument.",
      "\"What's the difference between encoder and decoder architectures, and when would you use each?\" - the fundamental architectural trade-off question.",
      "\"Inference latency spikes at 8K+ token inputs. What's the likely cause?\" - tests quadratic attention cost and KV cache pressure together.",
      "\"What is FlashAttention and why does it matter for deploying long-context models?\" - tests production awareness beyond the textbook model.",
      "Frequency and audience: Tier 1 - asked in 90%+ of loops with depth varying by role; expected at Google DeepMind, Meta AI, Anthropic, OpenAI, Microsoft and Amazon."
    ],
    faq: [
      {
        question: "Do all LLMs use the same transformer architecture?",
        answer:
          "All modern LLMs are transformer-based, but they differ in meaningful detail. Earlier models used standard multi-head attention with learned absolute position embeddings. Current open-weights families typically use grouped-query attention to shrink the KV cache and RoPE for better length generalisation, and some use sliding-window attention for local context with periodic global layers. The core QKV mechanism is shared; the variants sit on top of it. Knowing the core plus GQA and RoPE covers the overwhelming majority of interview questions.",
        category: "architecture variants"
      },
      {
        question: "What is FlashAttention and why does it matter?",
        answer:
          "FlashAttention is an IO-aware implementation of the attention computation that never materialises the full quadratic attention matrix in GPU high-bandwidth memory. It tiles the computation through fast on-chip SRAM instead, producing a mathematically identical result with O(n) memory and a two-to-four-times wall-clock speedup from reduced memory traffic. Later generations are the default in essentially every production inference framework. Without it, very long contexts would be memory-infeasible on current hardware.",
        category: "systems",
        sourceLinks: [{ label: "FlashAttention (arXiv)", url: "https://arxiv.org/abs/2205.14135" }]
      },
      {
        question: "Is \"reasoning\" in LLMs just attention pattern matching?",
        answer:
          "This is a genuinely open scientific question. Mechanistic interpretability work has identified specific compositions of attention heads that implement interpretable algorithms - indirect object identification and modular arithmetic among them - which is more structured than pure surface pattern matching. Whether that amounts to reasoning in a deep sense is unsettled. In an interview, acknowledge the capability empirically, avoid claiming equivalence to human reasoning, and note the active research. Overclaiming in either direction reads as a lack of calibration.",
        category: "conceptual"
      },
      {
        question: "Why are transformers better than RNNs and LSTMs for language models?",
        answer:
          "Three reasons. Parallelism: attention computes all token relationships simultaneously, while RNNs process tokens sequentially and underutilise GPUs. Long-range dependencies: any two tokens have a direct attention path regardless of distance, whereas an RNN must squeeze all history through a fixed-size hidden state and suffers vanishing gradients. Scalability: transformer quality scales predictably with parameters and data, while recurrent architectures showed diminishing returns well before frontier scale.",
        category: "comparative"
      },
      {
        question: "What is causal masking and why is it necessary during training?",
        answer:
          "During training all tokens of a sequence are present at once so the work can be parallelised, but the model must not see future tokens when predicting position t - otherwise the task is trivial and it learns nothing useful. Causal masking applies a lower-triangular mask to the attention score matrix, setting scores from position t to any later position to negative infinity before softmax so those positions receive zero weight. Without it the trained model would never have learned to generate under the past-only constraint it faces at inference.",
        category: "mechanism"
      },
      {
        question: "What does model depth versus model width mean in practice?",
        answer:
          "Depth is the number of transformer blocks; width is d_model, the embedding dimension. Deeper models can compose more transformation steps, which tends to help multi-step reasoning; wider models can represent more distinct features per layer, which tends to help factual capacity. Scaling work suggests both matter but in different ways, and frontier models push both. Application engineers rarely control these directly, but the trade-off explains why two models with similar parameter counts can behave quite differently.",
        category: "scaling"
      }
    ],
    practiceProblems: [
      "Attention by hand: given Q=[1,0], K=[[1,0],[0,1],[1,1]], V=[[10],[20],[30]], d_k=2, compute the attention output and show the softmax step. ANSWER: scores = QK^T / sqrt(2) = [1,0,1]/1.414 = [0.707, 0, 0.707]. Softmax = [2.028, 1.0, 2.028] / 5.056 = [0.401, 0.198, 0.401]. Output = 0.401*10 + 0.198*20 + 0.401*30 = 20.0.",
      "KV cache sizing with GQA: a 70B model with 8 KV heads, d_k=128, 80 layers, float16, one 16,384-token session. Compute the KV cache. ANSWER: 2 x 80 x 8 x 128 x 16384 x 2 bytes = 10,737,418,240 bytes = about 10.7 GB per session. Note how much smaller this is than the same model with 64 KV heads - that is what GQA buys.",
      "Architecture selection: choose encoder-only, decoder-only, encoder-decoder or a dedicated embedding model for (a) weekly-retrained classification of 50K documents, (b) a chatbot generating personalised travel recommendations, (c) a semantic search engine embedding documents for nearest-neighbour retrieval. ANSWER: (a) encoder-only - bidirectional, cheap inference, classification head; (b) decoder-only - autoregressive and chat-tuned; (c) a dedicated contrastively-trained bi-encoder, because generation-model hidden states are not optimised for similarity.",
      "Latency reasoning: a service sees time-to-first-token grow from 0.4s to 3.2s when average input grows from 2K to 16K tokens, while tokens-per-second during generation is unchanged. Explain which phase regressed and what you would change. ANSWER: prefill regressed - TTFT scales with input length while decode throughput depends on output length. Options: trim retrieved context, enable prefix/prompt caching for the static portion, or shard prefill; raising the batch size would make TTFT worse, not better."
    ],
    references: [
      {
        source: "note",
        attribution: "Vaswani et al., \"Attention Is All You Need\" (2017) - https://arxiv.org/abs/1706.03762",
        insight: "The original transformer paper; the abstract, Section 3 and Figure 1 are the parts worth reading closely."
      },
      {
        source: "blog",
        attribution: "Jay Alammar, \"The Illustrated Transformer\" (https://jalammar.github.io/illustrated-transformer/)",
        insight: "The single best visual explanation of Q, K, V and multi-head attention."
      },
      {
        source: "note",
        attribution: "Andrej Karpathy, \"Let's build GPT from scratch\" (video, ~3.5h) - https://www.youtube.com/watch?v=kCc8FmEb1nY",
        insight: "Builds the architecture in roughly 200 lines of Python; the fastest route to genuine understanding."
      },
      {
        source: "note",
        attribution: "3Blue1Brown, \"But what is a GPT? Visual intro to transformers\" - https://www.youtube.com/watch?v=wjZofJX0v4M",
        insight: "Best visual intuition for engineers without an ML background; good prerequisite viewing."
      },
      {
        source: "note",
        attribution: "Dao et al., \"FlashAttention: Fast and Memory-Efficient Exact Attention\" (2022) - https://arxiv.org/abs/2205.14135",
        insight: "The IO-aware attention algorithm; explains why long contexts became tractable on existing hardware."
      },
      {
        source: "blog",
        attribution:
          "Lilian Weng, \"The Transformer Family Version 2.0\" (https://lilianweng.github.io/posts/2023-01-27-the-transformer-family-v2/)",
        insight: "Comprehensive survey of architectural variants: RoPE, GQA, mixture-of-experts, sliding window."
      },
      {
        source: "note",
        attribution: "Geva et al., \"Transformer Feed-Forward Layers Are Key-Value Memories\" (2021) - https://arxiv.org/abs/2012.14913",
        insight: "Shows the MLP sub-layer stores factual associations, which explains where recall lives inside the model."
      },
      {
        source: "book",
        attribution: "Chip Huyen, AI Engineering (O'Reilly, 2025), Chapter 3",
        insight: "Production-oriented framing of transformer architecture and its serving consequences."
      }
    ]
  },

  // Refresh cadence: SEMI-STABLE. The lost-in-the-middle finding and the
  // context-vs-memory distinction are durable; headline window sizes, prompt-cache
  // discounts and long-context benchmark results move every few months.
  {
    id: "topic-ai-foundations-context-windows",
    moduleId: "mod-ai-foundations",
    title: "Context Windows: Limits, Degradation, and Management Strategies",
    intuition:
      "A context window is the model's working memory - everything it can see at once - and while the headline number keeps growing from thousands to millions of tokens, the uncomfortable truth is that LLMs do not pay equal attention to all positions in a long context, so stuffing more tokens in does not linearly improve anything except the bill.",
    complexity: {
      time: "Attention FLOPs scale as O(n^2 * d) per layer, so doubling the context quadruples attention compute. Time-to-first-token scales roughly linearly with input length during prefill, while generation latency scales with output length - two different curves that need separate budgets.",
      space: "KV cache is the binding constraint: every token in context costs about 2 x n_layers x d_model x bytes_per_element of cache. At frontier model sizes a single 128K-token session runs to tens of gigabytes, which is what actually caps concurrency."
    },
    lesson: [
      {
        title: "What Lives Inside the Context Window",
        content:
          "The context window holds everything the model processes in a single forward pass: the system prompt, the conversation history, retrieved documents, tool and function schemas, tool results, and the model's own tokens as it generates. Engineers routinely size only for the user message and the retrieved context, then are surprised when the system prompt, history and function schemas quietly consume another three to five thousand tokens. Keep two limits distinct: the context window is the combined input-plus-output limit, while max_tokens (or max_completion_tokens) is a separate cap on generated output. Sending 126K tokens to a 128K-context model leaves 2K for the reply - enough for a short answer, and enough to truncate a long one mid-sentence. Finally, and most importantly for architecture: the context window is not memory. It is stateless and evaporates when the call returns. Any persistence across turns or sessions is your application's job.",
        diagram: asciiDiagram(`Anatomy of a 128K context budget (worked example)
──────────────────────────────────────────────────────────────

  ┌────────────────────────────────────────────────────────┐
  │ system prompt              1,200 tok   (every call)    │
  ├────────────────────────────────────────────────────────┤
  │ tool / function schemas    1,800 tok   (every call)    │
  ├────────────────────────────────────────────────────────┤
  │ conversation history       6,000 tok   (grows/turn)    │
  ├────────────────────────────────────────────────────────┤
  │ retrieved chunks (k=5)     2,000 tok   (per query)     │
  ├────────────────────────────────────────────────────────┤
  │ user message                 200 tok                   │
  ├────────────────────────────────────────────────────────┤
  │ reserved for output        1,000 tok                   │
  └────────────────────────────────────────────────────────┘
    total 12,200 / 128,000        headroom 115,800

  The two rows people forget are the schemas and the system
  prompt - together 3,000 tokens billed on EVERY call, before
  the user has typed anything.`)
      },
      {
        title: "Lost in the Middle: The Positional Degradation Finding",
        content:
          "This is the single most important empirical finding about long-context models for a practising engineer. Liu et al. (2023) studied multi-document question answering: they placed the relevant document at different positions inside a prompt containing ten to twenty documents and measured accuracy. The result is a U-shaped curve. Documents at the beginning (primacy) or the end (recency) of the context are used most effectively; documents in the middle show accuracy degradation of up to twenty percentage points. The engineering implications are concrete and immediate. Put your most important context first or last. Never assume that \"it fits in context\" means \"it will be used reliably.\" And recognise that a retrieval system which pads the prompt with many low-relevance documents is not merely wasteful - it actively degrades answer quality by burying the good document in the low-attention zone.",
        diagram: asciiDiagram(`"Lost in the Middle" - Accuracy vs. Document Position
(Liu et al., 2023, multi-document QA)

Accuracy
 100% ─┤
  90% ─┤  ●                                    ●
  80% ─┤    ●                                ●
  70% ─┤      ●                            ●
  60% ─┤        ●                        ●
  50% ─┤          ●                    ●
  40% ─┤            ●────────────────●
  30% ─┤
  20% ─┤
       └──────────────────────────────────────
       Start  Early  Mid-early  Middle  Late  End
             ←──────── Document Position ───────→

Key: U-shaped curve. Documents placed in the middle of a
long context perform ~20 percentage points worse than those
at the extremes. This holds even for frontier models.`)
      },
      {
        title: "Why Long Context Degrades: Attention Dilution",
        content:
          "The mechanism behind the U-shape is worth being able to state. Softmax normalises attention weights so they sum to one. With a thousand tokens in context, the average weight per token is one in a thousand; with a hundred thousand tokens it is one in a hundred thousand. The relevant signal is diluted by the irrelevant ones around it - the useful document sitting at position 50,000 gets the same average attention budget as its useless neighbours. Compounding this, models are trained predominantly on shorter sequences, so their learned retrieval heuristics have seen comparatively few long-context examples and generalise poorly past the training distribution. Context-extension techniques such as YaRN and LongRoPE fix the positional encoding so the model can address long sequences at all, but they do nothing about dilution. The practical conclusion is that selective retrieval usually beats maximal context: fewer, better chunks outperform more, worse ones.",
        diagram: asciiDiagram(`Attention dilution: the 1/n problem
──────────────────────────────────────────────────────────

Softmax weights always sum to 1.0, so the average weight
per token is 1/n:

  n =   1,000 tokens  ->  avg weight 0.001    signal visible
  n =  10,000 tokens  ->  avg weight 0.0001   signal thinner
  n = 100,000 tokens  ->  avg weight 0.00001  signal buried

Two prompts carrying the SAME useful 500 tokens:

  A: [500 relevant]                          n=500
     relevant share of attention budget ~ 100%

  B: [50,000 filler][500 relevant][49,500 filler]   n=100,000
     relevant share of attention budget ~ 0.5%
     ...and it sits in the low-attention middle band.

More context is not more information - it can be less.`)
      },
      {
        title: "Context Management Strategies",
        content:
          "Five strategies, roughly in order of implementation cost. First, retrieval-augmented generation: fetch only the most relevant chunks instead of sending everything. Second, summarisation: compress earlier conversation turns into a compact summary while keeping recent turns verbatim, since the recent ones carry the immediate intent. Third, sliding-window truncation: keep the last N tokens and drop the oldest, which works whenever old context genuinely stops mattering. Fourth, hierarchical chunking: for very long documents, embed section-level summaries, retrieve the top sections, then retrieve specific paragraphs within them - a two-stage narrowing that keeps the final prompt small. Fifth, prompt caching: when a large prefix is byte-identical across calls, provider-side prefix caching lets you skip re-processing it, cutting both cost and time-to-first-token substantially. Most production systems end up combining three or four of these rather than picking one.",
        diagram: asciiDiagram(`Context management strategies compared
───────────────────────────────────────────────────────────────

Strategy         Cost to build   Fidelity loss   Best when
───────────────────────────────────────────────────────────────
RAG              high            none (if the    corpus >> window
                 (index+embed)   right chunk
                                 is retrieved)

Summarisation    medium          moderate        long chat
                                 (old detail     sessions
                                  is lossy)

Sliding window   low             high            recency is all
                                 (old turns      that matters
                                  vanish)

Hierarchical     high            low             single very long
chunking                                         documents

Prompt caching   low             none            large static
                                                 prefix, reused`)
      },
      {
        title: "RAG vs. Long Context: The Architectural Decision",
        content:
          "Now that million-token windows exist, the design question has shifted from \"can it fit?\" to \"what is the right architecture?\" - and a strong candidate argues both sides. Long context wins on simplicity: no retrieval pipeline, no chunking strategy, no embedding infrastructure, and no retrieval failure mode to debug. It loses on cost, because every token is billed on every call; on quality, because attention dilution degrades answers when irrelevant content is present; on latency, because time-to-first-token grows with input length; and on serving economics, because KV cache memory caps concurrency. RAG inverts every one of those: only relevant context is billed, the knowledge base can be far larger than any window, and improving retrieval directly improves answers - at the cost of a new failure mode, real infrastructure, and chunking as an ongoing tuning parameter. The decision rests on corpus size relative to the window, the latency envelope, and the cost per query you can sustain.",
        diagram: asciiDiagram(`Choosing between long context and RAG
──────────────────────────────────────────────────────────

  corpus size vs. context window?
        │
        ├── corpus >> window ──────────────> RAG (no choice)
        │
        ├── corpus fits, but reused
        │   across many queries ───────────> RAG, or long
        │                                    context + prompt
        │                                    caching
        │
        └── corpus fits and is
            per-request unique
                 │
                 ├── cost per query tight ─> RAG
                 ├── latency tight (TTFT) ─> RAG
                 └── simplicity wins ──────> long context

  Rule of thumb: long context is a great prototype and an
  expensive product. RAG is the reverse.`)
      }
    ],
    examples: [
      {
        title: "Context Budget Planning",
        input:
          "System prompt 800 tokens; 5 retrieved documents at 400 tokens each; user message 200 tokens; expected response 1,000 tokens. Model window: 128K.",
        output: "Total 4,000 tokens, leaving about 124,000 tokens of headroom. It fits comfortably today.",
        explanation:
          "Step 1: add the four components - 800 + 2,000 + 200 + 1,000 = 4,000 tokens against a 128,000-token window.\nStep 2: project forward rather than stopping at the first turn. If the conversation grows by roughly 600 tokens per turn, twenty turns adds 12,000 tokens and a hundred turns adds 60,000.\nStep 3: at around two hundred turns the window is full, but quality degrades well before that because of attention dilution near the boundary.\nStep 4: therefore trigger compression on a threshold - summarise turns older than the most recent ten once total usage passes roughly 60-70% of the window - rather than waiting for a truncation error."
      },
      {
        title: "Lost in the Middle in a RAG System",
        input:
          "A RAG system retrieves 10 documents sorted by score and concatenates them in that order. The correct answer sits in document 5. Measured accuracy: 51%, versus 83% when the same document is placed first.",
        output: "Reorder after ranking so the best documents occupy the first and last positions.",
        explanation:
          "Step 1: diagnose the anti-pattern - \"sort by score, then concatenate\" places the single best document in the middle whenever k is around ten, which is exactly the low-attention band.\nStep 2: reorder for positional advantage after ranking: best document at position 1, second-best at position k, third-best at position 2, and so on, interleaving outward-in.\nStep 3: this exploits both the primacy and recency effects and typically recovers ten to fifteen points of accuracy for the cost of one sort.\nStep 4: consider the simpler alternative too - dropping k from ten to three or four high-precision chunks removes the dilution problem instead of working around it."
      },
      {
        title: "Summarisation-Based Compression",
        input: "A support chatbot fifteen turns into a conversation, with 7,200 tokens of history, receives a new message.",
        output: "Compress turns 1-10 into a 250-token summary and keep turns 11-15 verbatim (900 tokens): 1,150 tokens instead of 7,200.",
        explanation:
          "Step 1: choose a split point using a recency threshold - here, everything older than the last five turns is a candidate for compression.\nStep 2: call the model once to summarise the older portion, keeping entities, decisions and unresolved items rather than prose.\nStep 3: store the summary plus the verbatim recent turns as the new history, and repeat the process as the conversation grows so the summary is re-summarised rather than accumulating.\nStep 4: accept the trade-off explicitly - detail from early turns is lossy, which is fine for support where the crux is recent, and dangerous for domains where an early constraint must never be dropped."
      }
    ],
    tips: [
      "Budget all four components before picking a model: system prompt, conversation history, retrieved content, and expected output. The system prompt is the one teams forget.",
      "Position matters. Put the most important context first or last, and never bury a critical instruction in the middle of a long prompt.",
      "\"Fits in context\" is not \"will be used reliably\" - test with adversarial position checks that place the answer at the midpoint and measure accuracy directly.",
      "Prompt caching cuts the cost of a large static prefix dramatically. Enable it for any production deployment with a big, unchanging system prompt.",
      "KV cache memory scales linearly with context length, so a long-context deployment needs far more GPU memory per concurrent session than a short-context one at the same model size.",
      "Context window is not memory. Implement a real persistence layer if you need state across calls or sessions."
    ],
    tricks: [
      "Quick TTFT estimate: time-to-first-token is roughly input_tokens / prefill_tokens_per_second. At a prefill rate around 10,000 tokens per second, a 50K-token input costs about five seconds before the first character appears - set product expectations from that number, not from generation speed.",
      "Turn the lost-in-the-middle finding into a reranker: after retrieval, sort by score then interleave best-first, second-best-last, third-best-second. One reordering step, ten to fifteen points of accuracy.",
      "Make system-prompt token count a monitored metric with a failing test at a budget threshold. Someone adding 2,000 tokens to the system prompt is a silent, permanent cost increase otherwise.",
      "Test the extremes before the middle: verify the model can find information at position 1 and near position N before you benchmark midpoints. Many models degrade badly at the very end of their stated limit.",
      "For RAG, fewer high-quality chunks beat many low-quality chunks. Retrieval precision matters more than recall once dilution is in play."
    ],
    memoryAids: [
      "\"U-shaped graveyard\" - the middle of a long context is where relevant information goes to die; put important content at the extremes.",
      "\"Context is not memory, window is not storage\" - the window evaporates when the call returns; persistence is a separate layer you build.",
      "\"Attention dilution = the 1/n problem\" - with n tokens the average attention weight is 1/n, so signal drowns in noise as n grows.",
      "\"Prefill sets TTFT, decode sets tokens-per-second\" - two phases, two latency curves, two different fixes."
    ],
    interviewPatterns: [
      "\"Design a chatbot that maintains context across a 30-minute support conversation.\" - tests context management; expect summarisation, sliding windows, or an external memory layer.",
      "\"When would you choose RAG over stuffing everything into a long-context model?\" - the fundamental architectural decision; argue cost, quality and complexity rather than picking a side.",
      "\"Your RAG system is 85% accurate on short inputs but 62% on long documents. What do you investigate?\" - tests lost-in-the-middle and chunking awareness together.",
      "\"How does increasing context window size affect inference cost and latency?\" - tests quadratic attention and linear KV cache growth.",
      "\"A model offers a 1M-token context. Should we just dump the whole database into it?\" - tests judgment; the expected answer covers cost, degradation and TTFT, not enthusiasm.",
      "Frequency and audience: Tier 1 - asked in 90%+ of AI-infra and applied AI loops; expected at Google, Anthropic, OpenAI, Cohere, Microsoft and Meta."
    ],
    faq: [
      {
        question: "What is the difference between context window, context length, and max tokens?",
        answer:
          "Context window and context length mean the same thing: the maximum combined input plus output the model can process in a single call. Max tokens (or max_completion_tokens) is a parameter you set to cap the generated output, and it must fit inside whatever budget remains after your input. Confusing the two produces one of two failures - truncated responses when the output cap is too low, or unexpected cost and overflow when the input is larger than budgeted.",
        category: "terminology"
      },
      {
        question: "Does every model with a large context window perform equally well at that length?",
        answer:
          "No. Models are trained and evaluated at particular sequence lengths, and quality generally degrades toward the top of the stated maximum. Models whose context was extended after the fact via position interpolation tend to degrade more. Benchmarks such as needle-in-a-haystack retrieval and RULER measure effective context utilisation across positions rather than just the headline number. Always check results at the length you actually plan to use.",
        category: "evaluation"
      },
      {
        question: "What is prompt caching and how much does it save?",
        answer:
          "Prompt caching reuses the computed KV states for a shared prefix - typically the system prompt plus any static context - across calls, so the provider skips re-processing it. Discounts vary by provider but are large, commonly in the 50-90% range on the cached portion, and it also reduces time-to-first-token. The catch is that the prefix must be byte-identical to hit the cache: a single changed character, including a timestamp injected into the system prompt, invalidates it.",
        category: "cost optimisation"
      },
      {
        question: "Can I fine-tune a model to have a longer context window?",
        answer:
          "Yes, but it is more involved than it sounds. You need long-sequence training data, a modified positional encoding scheme such as a RoPE scaling variant, considerably more compute, and evaluation that actually probes long positions. Most teams extend context through positional-encoding modification plus continued pre-training on long documents rather than ordinary fine-tuning. Fine-tuning on long sequences without adjusting positional encoding rarely works.",
        category: "fine-tuning"
      },
      {
        question: "What is the difference between the context window and a model remembering things?",
        answer:
          "The context window is ephemeral - when the call ends, nothing persists. Memory in production systems is external: conversation history stored in a database, with selected portions injected into each new call. A common pattern for long-running assistants is retrieval-augmented memory, storing past interactions as embeddings and retrieving the relevant ones per query. The model itself holds no state between calls, which is what makes horizontal scaling of inference straightforward.",
        category: "architecture"
      },
      {
        question: "Why does time-to-first-token increase with longer inputs?",
        answer:
          "TTFT is dominated by the prefill phase, in which the model processes every input token through every layer to compute the KV states. More input means more prefill compute, so TTFT grows roughly linearly with input length (and worse than linearly once attention cost dominates). Generation speed afterwards depends on output length, not input length. For interactive products TTFT is usually the metric users feel, which is why trimming retrieved context often improves perceived performance more than a faster model would.",
        category: "latency"
      }
    ],
    practiceProblems: [
      "Token budget worksheet: a code review bot has a 1,200-token system prompt, a 2,800-token file, a 400-token diff, 600 tokens of prior conversation and an 800-token expected response, on a 128K model. (a) Does it fit? (b) At 200 tokens per additional turn, how many turns until overflow? (c) At what turn should summarisation trigger if the threshold is 80% of the window? ANSWER: (a) yes - 5,800 / 128,000 = 4.5%. (b) (128,000 - 5,800) / 200 = 611 turns. (c) 80% is 102,400 tokens, so 5,800 + 200t = 102,400 gives t = 483 turns.",
      "Lost-in-the-middle reordering: you retrieve eight documents scored [D1 0.92, D2 0.88, D3 0.81, D4 0.76, D5 0.72, D6 0.68, D7 0.61, D8 0.55]. Write the reordered sequence that minimises positional degradation. ANSWER: D1, D3, D5, D7, D8, D6, D4, D2 - best and second-best occupy the two extremes, and the weakest documents fill the low-attention middle.",
      "Prompt caching ROI: an 8,000-token system prompt, 500,000 calls/day, input at $2.50 per million tokens and cached input at $1.25 per million, with a 90% cache hit rate. What is the monthly saving? ANSWER: uncached baseline = 8,000 x 500,000 x 30 = 120B tokens = $300,000/month. With 90% hits: 12B uncached at $2.50/M = $30,000 plus 108B cached at $1.25/M = $135,000, total $165,000. Saving = $135,000/month, or 45%.",
      "Diagnose the regression: a RAG assistant scores 0.84 on a golden set when k=3 and 0.71 when k=10, even though recall@k rises with k. Explain the mechanism and give two fixes. ANSWER: higher k raises recall but dilutes attention and pushes the best chunk into the middle band, so answer quality falls even as retrieval improves. Fixes: rerank and cut k back to the top 3-4, or keep k=10 but reorder so the top-scoring chunks sit at the first and last positions."
    ],
    references: [
      {
        source: "note",
        attribution: "Liu et al., \"Lost in the Middle: How Language Models Use Long Contexts\" (2023) - https://arxiv.org/abs/2307.03172",
        insight: "The key empirical paper on positional degradation; the U-shaped accuracy curve is the figure to remember."
      },
      {
        source: "blog",
        attribution: "Anthropic, \"Long context tips\" (https://docs.anthropic.com/en/docs/build-with-claude/long-context-window)",
        insight: "Practical provider guidance on structuring very long prompts, including document ordering."
      },
      {
        source: "blog",
        attribution: "OpenAI Cookbook, \"Prompt caching\" (https://cookbook.openai.com/examples/prompt_caching101)",
        insight: "Implementation guide for prefix caching with worked cost calculations."
      },
      {
        source: "blog",
        attribution:
          "Lilian Weng, \"The Transformer Family v2.0\" - context extension section (https://lilianweng.github.io/posts/2023-01-27-the-transformer-family-v2/)",
        insight: "Survey of RoPE, YaRN and the positional-encoding schemes behind context extension."
      },
      {
        source: "blog",
        attribution: "Simon Willison, notes on long context (https://simonwillison.net/2024/Jan/31/long-context/)",
        insight: "Practitioner notes on where long context surprises you in real applications."
      },
      {
        source: "blog",
        attribution: "Hamel Husain, \"A Field Guide to RAG\" (https://hamel.dev/blog/posts/rag/)",
        insight: "Production RAG guidance covering context management, chunk sizing and document ordering."
      },
      {
        source: "book",
        attribution: "Chip Huyen, AI Engineering (O'Reilly, 2025), Chapter 5",
        insight: "Context-window management strategies as they appear in production applications."
      }
    ]
  },

  // Refresh cadence: STABLE. Temperature, top-p, top-k and the penalties are
  // long-settled API surface. Re-check only the structured-output mechanisms,
  // which are still gaining provider-side guarantees.
  {
    id: "topic-ai-foundations-sampling-decoding",
    moduleId: "mod-ai-foundations",
    title: "Sampling & Decoding: Controlling How LLMs Generate Text",
    intuition:
      "When an LLM generates text it produces a probability distribution over the entire vocabulary at each step and then samples from it - and the parameters you set (temperature, top-p, top-k, the repetition penalties) decide whether that sampling is wild and creative or tight and near-deterministic, letting you tune output style without touching the model itself.",
    complexity: {
      time: "Each generation step is O(vocab_size) for the softmax plus a sort for top-k/top-p filtering - negligible next to the transformer forward pass. Total generation latency is output_tokens x (per-token forward pass + KV cache read), so decoding parameters affect quality, not speed.",
      space: "Sampling state is O(vocab_size) per step for the logit vector - on the order of a few hundred kilobytes. Beam search is the exception at O(beam_width x vocab_size), which becomes real memory at large widths."
    },
    lesson: [
      {
        title: "From Logits to Token: The Generation Step",
        content:
          "At each generation step the model's final layer emits a vector of vocab_size raw scores called logits. A logit of 10 for \"cat\" against 1 for \"dog\" means softmax will make \"cat\" overwhelmingly more likely, but the mapping is not linear - softmax exponentiates, so small logit gaps become large probability gaps. Four operations then run in a fixed order. Temperature divides the logits, sharpening or flattening the distribution. Softmax converts logits to probabilities. Top-p or top-k truncates the candidate set and renormalises. Finally a token is sampled from what remains. Knowing the order matters, because it explains why combinations behave unintuitively: temperature acts on the shape of the whole distribution before truncation decides how much of the tail survives, so setting both aggressively produces effects neither one produces alone.",
        diagram: asciiDiagram(`Generation Step: Logits -> Token
────────────────────────────────────────────────────────────────

Model output (raw logits, ~50K values):
  "cat"   -> 8.3   <- high
  "dog"   -> 5.1
  "fish"  -> 4.9
  "the"   -> 3.2
  ...49,996 others (mostly very negative)

Step 1: Divide by Temperature T
  T=1.0 -> logits unchanged (natural distribution)
  T=0.3 -> logits x3.33 -> sharper (cat more dominant)
  T=2.0 -> logits x0.5  -> flatter (everything more equal)

Step 2: Softmax -> probabilities (at T=1.0)
  P("cat")  = 0.73
  P("dog")  = 0.09
  P("fish") = 0.08
  P("the")  = 0.03
  others    = 0.07

Step 3: Top-p filtering (p=0.90)
  Sort descending, accumulate until >= 0.90:
    cat  (0.73) -> cumsum 0.73
    dog  (0.09) -> cumsum 0.82
    fish (0.08) -> cumsum 0.90   <- stop here
  Keep cat, dog, fish. Discard the rest. Renormalise.

Step 4: Sample from {cat 0.795, dog 0.118, fish 0.087}`)
      },
      {
        title: "Temperature: The Creative Dial",
        content:
          "Temperature T divides every logit before softmax. Lower T amplifies the differences between logits, so the distribution sharpens around the top candidate; higher T compresses them, flattening toward uniform. As T approaches zero you get greedy argmax decoding; at T = 1.0 you get the model's natural trained distribution; above 1.0 the distribution becomes increasingly flat, random and eventually incoherent. Production guidance is stable across providers: 0.0-0.2 for code generation, structured extraction and factual question answering where correctness dominates; 0.7-0.9 for conversational and creative work; above 1.2 only for brainstorming where you will filter the output afterwards. One misconception is worth pre-empting because it comes up constantly in interviews: temperature zero does not guarantee identical outputs across calls. Floating-point non-determinism on GPUs means different hardware, batch sizes or framework versions can resolve near-tied logits differently. A seed parameter reduces the variance but does not eliminate it.",
        diagram: asciiDiagram(`Temperature reshapes the same logits
──────────────────────────────────────────────────────────

Base logits:  A=10   B=8   C=6   D=4   E=2

T = 0.5  (logits x2 -> sharper)
  A ████████████████████████████████████████  0.982
  B ██                                        0.018
  C                                           0.000
  D                                           0.000
  E                                           0.000

T = 1.0  (natural)
  A ███████████████████████████████████       0.865
  B █████                                     0.117
  C █                                         0.016
  D                                           0.002
  E                                           0.000

T = 2.0  (logits x0.5 -> flatter)
  A █████████████████████████                 0.634
  B █████████                                 0.235
  C ███                                       0.086
  D █                                         0.032
  E                                           0.012

Same model, same prompt - only the sampling shape changed.`)
      },
      {
        title: "Top-p and Top-k: Vocabulary Truncation",
        content:
          "Both parameters act after temperature scaling by restricting the candidate set before sampling. Top-k keeps the k highest-probability tokens, discards the rest and renormalises; its weakness is that k is fixed regardless of the model's confidence, so at k = 40 the model samples from forty candidates whether one token holds 99% of the mass or the distribution is nearly uniform. Top-p, also called nucleus sampling, sorts by probability and accumulates until the cumulative mass reaches p, keeping only that nucleus. When the model is confident, few tokens survive; when it is uncertain, many do. Top-p is therefore adaptive to confidence, which is why it became the default. Provider guidance is consistent: change temperature or top-p, not both, because they compound in ways that are hard to reason about. A practical default is a task-appropriate temperature with top-p around 0.95 and top-k left alone.",
        diagram: asciiDiagram(`Top-k is fixed; top-p adapts to confidence
──────────────────────────────────────────────────────────

CONFIDENT step:  P = [0.94, 0.03, 0.01, 0.01, ...]
  top-k=40  -> keeps 40 tokens, 39 of them near-zero
               (noise gets a seat at the table)
  top-p=0.95 -> keeps 2 tokens
               (tight, as it should be)

UNCERTAIN step:  P = [0.08, 0.07, 0.07, 0.06, 0.06, ...]
  top-k=40  -> keeps 40 tokens
  top-p=0.95 -> keeps ~30 tokens
               (wide, as it should be)

Same parameter value, different behaviour, because top-p
is defined on probability mass rather than on rank.`)
      },
      {
        title: "Frequency and Presence Penalties",
        content:
          "Two further parameters modify logits based on what has already been generated. The frequency penalty subtracts penalty x count(token so far) from each previously-seen token's logit, so the more often a token has appeared the harder it is suppressed - this is the tool for stopping visible word repetition in long-form generation. The presence penalty subtracts a flat amount from any token that has appeared at all, regardless of count, which pushes the model toward new topics rather than new phrasings of the same one. Useful production ranges are modest: roughly 0.3-0.5 frequency penalty for long-form content, and 0.2-0.4 presence penalty when you want topical variety. Push either much above 1.5 and you start penalising domain-critical vocabulary that the model legitimately needs to repeat - a medical assistant that is punished for saying \"diagnosis\" twice will produce worse output, not more varied output.",
        diagram: asciiDiagram(`Frequency vs. presence penalty
──────────────────────────────────────────────────────────

Text so far: "I understand. I understand your concern."
  count("understand") = 2      count("billing") = 0

frequency_penalty = 0.5
  logit("understand") -= 0.5 x 2  = -1.0    (scales with count)
  logit("billing")    -= 0.5 x 0  =  0.0

presence_penalty = 0.5
  logit("understand") -= 0.5              (flat, count ignored)
  logit("billing")    -= 0.0

Use frequency penalty to stop REPEATED WORDING.
Use presence penalty to push toward NEW TOPICS.
Above ~1.5 either one starts suppressing vocabulary the
answer actually requires.`)
      },
      {
        title: "Greedy, Beam Search, and Deterministic Decoding",
        content:
          "Greedy decoding always takes the argmax token. It is fast and single-path, but locally optimal - by committing to the highest-probability token at each step it can walk into a completion that was collectively poor and unrecoverable. Beam search maintains the top B partial sequences, expands each by one token and keeps the best B by cumulative log-probability; it was the standard for machine translation and still suits tasks with a single correct target, but for open-ended generation it produces stilted, unnaturally formal text and modern chat APIs generally do not expose it. Deterministic decoding is the right default for structured output - JSON extraction, SQL generation, code completion - where the highest-probability valid output is exactly what you want. The strongest form is schema-constrained decoding, which goes beyond low temperature: it masks the candidate vocabulary at each step to only the tokens that keep the output valid under a schema, making malformed output mathematically impossible rather than merely unlikely.",
        diagram: asciiDiagram(`Decoding strategies at a glance
───────────────────────────────────────────────────────────────

greedy (T=0)
  pick argmax every step
  + fast, reproducible-ish        - can commit to a dead end
  use for: extraction, classification, code

sampling (T>0 + top-p)
  draw from the truncated nucleus
  + natural, diverse              - non-reproducible
  use for: chat, creative, brainstorming

beam search (width B)
  keep B partial sequences, pick best total log-prob
  + strong for single-target      - stilted for open-ended,
    tasks like translation          B times the compute
  use for: translation, constrained completion

schema-constrained decoding
  mask invalid tokens each step against a grammar/schema
  + GUARANTEES valid structure    - needs schema + support
  use for: JSON, SQL, tool-call arguments`)
      }
    ],
    examples: [
      {
        title: "Temperature Effect on Creative Writing",
        input: "Prompt \"The spaceship landed silently in the\", sampled five times each at T=0.1, T=0.8 and T=1.5.",
        output:
          "T=0.1: five identical completions (\"...field behind the farmhouse.\"). T=0.8: five diverse, coherent completions. T=1.5: vivid but sometimes incoherent output.",
        explanation:
          "Step 1: at T=0.1 the logits are effectively multiplied by ten before softmax, so the top token holds almost all the probability mass and every sample collapses to the same continuation.\nStep 2: at T=0.8 there is enough mass on the second and third candidates that the model explores different narrative directions while remaining grammatical.\nStep 3: at T=1.5 the logits are halved, so genuinely low-probability tokens acquire meaningful mass and produce surprising word choices that may not cohere across a sentence.\nStep 4: the production conclusion for a creative writing assistant is T around 0.8 with top-p 0.95 - diversity without incoherence - and the same reasoning applied to a code assistant lands on T=0."
      },
      {
        title: "Debugging Repetition with Frequency Penalty",
        input:
          "Support bot output: \"I understand your frustration. I understand your concern. I truly understand how frustrating this is. I want to help you understand your options...\"",
        output: "With frequency_penalty=0.5 the same prompt yields varied phrasing that moves the conversation forward.",
        explanation:
          "Step 1: diagnose the cause - conditioned on customer-service phrasing, \"understand\" has a persistently high logit, and nothing in the default sampling setup discourages returning to it.\nStep 2: apply a frequency penalty, which subtracts penalty x occurrence_count from that token's logit, so the third occurrence is penalised three times as hard as the first.\nStep 3: the model is pushed toward alternative continuations that carry the same intent - explaining options, stating the billing cycle - rather than restating empathy.\nStep 4: keep the value moderate. At 1.5 or above the penalty would start suppressing words the answer genuinely needs, which reads as evasive rather than varied."
      },
      {
        title: "Schema-Constrained vs. Prompt-Only Structured Output",
        input:
          "Extract ticket data as JSON with fields priority (low/medium/high), category (string) and needs_callback (boolean). Compare (a) T=0 plus \"output valid JSON\" in the system prompt against (b) a provider schema-constrained response format.",
        output: "(a) about 8% parse failures in testing. (b) zero parse failures.",
        explanation:
          "Step 1: option (a) relies on the model's learned preference for well-formed JSON, which holds most of the time and breaks on complex schemas, unusual inputs and long outputs - typically producing unquoted keys or a trailing comma.\nStep 2: option (b) masks the vocabulary at each generation step: at a position where only a boolean literal is valid, every non-boolean token receives an effectively infinite negative logit.\nStep 3: that makes structurally invalid output impossible rather than improbable, which converts a probabilistic failure mode into a guarantee.\nStep 4: note the residual risk that constrained decoding does not solve - the JSON will be well-formed and schema-valid, but the values can still be wrong, so validation of semantics remains your job."
      }
    ],
    tips: [
      "Temperature and top-p both compress the effective vocabulary - change one or the other, not both, or the interaction becomes impossible to reason about.",
      "T=0 does not guarantee determinism across hardware, batch sizes or model versions. Use a seed, pin the exact model version, and treat reproducibility as best-effort.",
      "For code and structured extraction, use very low temperature plus schema-constrained decoding. Correctness dominates creativity.",
      "Stop sequences are dramatically underused - specifying them prevents runaway generation and role confusion in chat applications.",
      "Frequency penalty around 0.3-0.5 for long-form content and presence penalty around 0.2-0.4 for topical variety are production-tested defaults, not theoretical maxima.",
      "Schema-constrained decoding is strictly stronger than T=0 for structured output: it gives a guarantee rather than a high probability."
    ],
    tricks: [
      "\"What parameter would you tune?\" should be answered with a question first: \"what matters more here, correctness or creativity, and what failure are you actually seeing?\" That reframes the discussion before you name a knob.",
      "Use per-token log probabilities to detect low-confidence completions. If the mean log-probability of a response is unusually low, the model was uncertain - route that response to human review or retry rather than shipping it.",
      "Calibrate temperature per task type in a config map (code generation 0.0, email reply 0.5, brainstorming 0.9) and pick from it at request time. A single global temperature is always wrong for some of your traffic.",
      "Start at T=0 for any new feature to establish a correctness baseline, then raise it incrementally until quality peaks. Tuning downward from a high default hides regressions.",
      "To test whether top-p is doing anything at all, compare top-p=1.0 against top-p=0.9 on the same prompts. Identical output means the model is confident and temperature, not truncation, is your lever."
    ],
    memoryAids: [
      "\"Temperature = how spicy are your outputs?\" - T=0 is plain rice, T=2 is ghost pepper.",
      "\"Top-p = catch enough probability mass\" - p=0.9 means keep enough tokens to cover 90% of the probability and drop the long tail.",
      "\"TTSS: Temperature, Truncate, Softmax, Sample\" - the operations in order; temperature first, sampling last.",
      "\"Frequency penalty: the more I've said it, the less I want to say it again. Presence penalty: I've said it once, let's move on.\""
    ],
    interviewPatterns: [
      "\"What temperature would you use for a medical information summarisation feature, and why?\" - tests judgment; answer T=0 or near-zero, then volunteer what else you would do about accuracy.",
      "\"Explain the difference between top-p and top-k to a product manager.\" - tests communication; the adaptive-versus-fixed framing is the expected answer.",
      "\"Your LLM form filler produces invalid JSON 10% of the time. What do you do?\" - tests structured output; low temperature plus schema-constrained decoding, not more prompt instructions.",
      "\"A customer wants exactly the same output every time for a demo. Can you guarantee it?\" - tests calibration; T=0 plus seed plus a pinned model version, with an honest caveat about GPU non-determinism.",
      "\"What happens if you set temperature 1.5 and top-p 0.05 at the same time?\" - the trap question; temperature flattens the distribution and then aggressive top-p cuts it to a tiny nucleus, so the diversity is undone and behaviour becomes erratic rather than creative.",
      "Frequency and audience: Tier 1 - the entry-level AI engineering question, asked in 95%+ of loops at effectively any company doing LLM integration."
    ],
    faq: [
      {
        question: "Does temperature=0 always give the same output?",
        answer:
          "Not guaranteed. Temperature zero implements greedy argmax decoding, which is deterministic in principle, but GPU floating-point operations are not bitwise deterministic across hardware, kernel implementations or batch compositions, so near-tied logits can resolve differently between runs. Providers explicitly note that even with a seed and temperature zero, outputs may vary across model versions. For practical reproducibility: log outputs, pin the exact model version string rather than an alias, use the seed parameter, and accept that it is best-effort.",
        category: "determinism"
      },
      {
        question: "What is schema-constrained decoding?",
        answer:
          "Also called constrained generation or structured outputs, it restricts the valid token vocabulary at each generation step according to a schema or grammar. When only a string key is valid at the current position, every other token is masked to negative infinity. This makes structurally invalid output impossible rather than merely unlikely. Providers expose it through JSON-schema response formats, and open libraries implement the same idea for self-hosted models. It is strictly preferable to prompt-only JSON instructions in production.",
        category: "structured output"
      },
      {
        question: "What is the difference between max_tokens and max_completion_tokens?",
        answer:
          "Both cap how many tokens the model generates, and neither counts input. The difference is API generation: max_tokens is the older chat-completions parameter and max_completion_tokens the newer one. The nuance worth checking is that in some historical API versions max_tokens was interpreted against combined context usage rather than output alone, so read the documentation for the exact endpoint you are calling. In practice engineers almost always mean \"cap the output\" - just confirm you are setting the parameter that does that.",
        category: "API"
      },
      {
        question: "Can I use temperature above 1.0 in production?",
        answer:
          "Technically yes, since most APIs allow up to 2.0, but it is rarely a good idea. Above 1.0 you are flattening the distribution below the model's trained calibration, which raises the probability of incoherent, ungrammatical or factually wrong output. The one defensible use case is brainstorming where a downstream filter or a human selects from many candidates. For creative work, 0.85-1.0 already provides ample diversity without degrading coherence.",
        category: "parameters"
      },
      {
        question: "What is greedy decoding and why does it paint itself into a corner?",
        answer:
          "Greedy decoding picks the highest-probability token at every step. That is locally optimal but not globally optimal: committing to a particular opening shifts all subsequent conditional probabilities, and the model can end up in a region where every continuation is mediocre. A sampled alternative that was slightly less likely at step one might have led somewhere much better overall. Beam search mitigates this by keeping several partial hypotheses, at the cost of more compute and noticeably less natural text for open-ended generation.",
        category: "mechanism"
      },
      {
        question: "When would you use beam search with an LLM?",
        answer:
          "Beam search suits tasks with a single correct or near-correct target rather than open-ended generation: machine translation, constrained completion, and some code generation settings. For conversational or creative output it produces text that reads formal and repetitive, because maximising total sequence log-probability favours safe, generic phrasing. Most hosted chat APIs do not expose beam search at all; it is generally available only through local generation interfaces with a beam-width parameter.",
        category: "decoding strategy"
      }
    ],
    practiceProblems: [
      "Manual temperature scaling: given logits [A:10, B:8, C:6, D:4, E:2], compute softmax probabilities at T=1.0, T=0.5 and T=2.0, and say which token dominates in each case. ANSWER: T=1.0 -> [0.865, 0.117, 0.016, 0.002, 0.000]. T=0.5 (logits doubled) -> A about 0.982. T=2.0 (logits halved) -> [0.634, 0.235, 0.086, 0.032, 0.012]. A wins in all three; only the spread changes.",
      "Top-p filtering: probabilities [A 0.40, B 0.25, C 0.15, D 0.10, E 0.05, F 0.03, G 0.02] with top-p = 0.82. Which tokens survive, and what are their renormalised probabilities? ANSWER: cumulative sums are 0.40, 0.65, 0.80, 0.90 - the threshold is crossed at D, so A-D survive with mass 0.90. Renormalised: A 0.444, B 0.278, C 0.167, D 0.111.",
      "Parameter selection: choose temperature, top_p, frequency_penalty and whether to use a JSON schema for (a) SQL generation from natural language, (b) brainstorming ten marketing taglines, (c) classifying customer email intent into 12 categories, (d) long-form blog generation. ANSWER: (a) T=0, top_p=1.0, fp=0, schema on. (b) T=0.9, top_p=0.95, presence_penalty about 0.4, schema off. (c) T=0, top_p=1.0, fp=0, schema on. (d) T=0.7, top_p=0.95, fp about 0.4, schema off.",
      "Reason about an interaction: a teammate sets temperature=1.5 and top_p=0.05 to \"get creative but stay safe\". Predict the behaviour and propose a correct configuration. ANSWER: temperature flattens the distribution, then top_p=0.05 keeps only the tiny nucleus at the top of that flattened distribution - so output is near-deterministic but not the argmax, giving erratic-looking choices with none of the intended diversity. Correct approach: pick one lever, e.g. T=0.85 with top_p=0.95."
    ],
    references: [
      {
        source: "blog",
        attribution: "OpenAI API reference, \"Create chat completion\" (https://platform.openai.com/docs/api-reference/chat/create)",
        insight: "Authoritative parameter definitions, valid ranges and defaults."
      },
      {
        source: "blog",
        attribution: "Anthropic API reference, \"Messages\" (https://docs.anthropic.com/en/api/messages)",
        insight: "Equivalent parameter documentation with notably different defaults - worth diffing against OpenAI's."
      },
      {
        source: "blog",
        attribution: "HuggingFace, \"How to generate text: decoding methods for Transformers\" (https://huggingface.co/blog/how-to-generate)",
        insight: "The clearest practical walkthrough with code for greedy, beam, top-k and top-p."
      },
      {
        source: "note",
        attribution: "Holtzman et al., \"The Curious Case of Neural Text Degeneration\" (2019) - https://arxiv.org/abs/1904.09751",
        insight: "The nucleus sampling paper; explains precisely why fixed top-k fails and adaptive truncation works."
      },
      {
        source: "blog",
        attribution:
          "Lilian Weng, \"Controllable Neural Text Generation\" (https://lilianweng.github.io/posts/2021-01-02-controllable-text-generation/)",
        insight: "Survey of decoding strategies and constrained generation techniques in one place."
      },
      {
        source: "blog",
        attribution:
          "OpenAI Cookbook, \"Reproducible outputs with the seed parameter\" (https://cookbook.openai.com/examples/reproducible_outputs_with_the_seed_parameter)",
        insight: "How seeds work and, more usefully, the documented limits of determinism."
      },
      {
        source: "note",
        attribution: "Andrej Karpathy, \"Let's build GPT from scratch\" - sampling section - https://www.youtube.com/watch?v=kCc8FmEb1nY",
        insight: "Live demonstration of temperature effects on a model you just watched being built."
      }
    ]
  },

  // Refresh cadence: SEMI-STABLE. The geometry, the metrics and the bi-encoder /
  // cross-encoder split are stable; specific model names, dimension counts and
  // leaderboard positions move fast and should be re-checked before quoting.
  {
    id: "topic-ai-foundations-embeddings",
    moduleId: "mod-ai-foundations",
    title: "Embeddings: Turning Meaning into Geometry",
    intuition:
      "An embedding is a fixed-size vector of floats that encodes the meaning of a piece of text so that semantically similar texts land geometrically close together - which lets a computer answer \"is this sentence about dogs similar to this other sentence about puppies?\" with nothing more expensive than a dot product.",
    complexity: {
      time: "Embedding inference is an encoder forward pass, so it is fast and batchable: single-digit to low-tens of milliseconds for a query, and hours for an offline pass over ten million documents. Query-time cost is dominated by the ANN search, not by the embedding call.",
      space: "Storage is n_vectors x dimensions x bytes_per_element. Ten million vectors at d=1536 in float32 is about 59 GB; float16 halves it, int8 quarters it, and Matryoshka truncation to d=256 cuts it by an order of magnitude. Graph indexes add roughly 40-80 bytes per vector on top."
    },
    lesson: [
      {
        title: "What an Embedding Is (and Isn't)",
        content:
          "An embedding is a function from text to a fixed-size dense vector in R^d. The mapping is learned: the model was trained so that semantic similarity between texts correlates with geometric closeness between their vectors. Three things engineers routinely conflate are worth separating. First, token embeddings inside a transformer are intermediate representations used during the forward pass - they are not designed for downstream similarity search. Second, the final hidden state of a generation model is technically extractable, but generation training objectives do not align those vectors for retrieval, so they underperform badly. Third, dedicated embedding models are purpose-built, trained contrastively on query-document pairs specifically to make retrieval similarity meaningful. The third is what you should use for semantic search and RAG. Reaching for a chat model's hidden states instead is a common and expensive mistake: purpose-built embedding models deliver substantially better retrieval quality at a small fraction of the cost.",
        diagram: asciiDiagram(`Three things called "embeddings" - only one is for retrieval
────────────────────────────────────────────────────────────────

1. Token embeddings INSIDE a transformer
   input IDs -> [embedding table] -> layer 1 -> ... -> layer N
                      ^ these
   purpose: feed the forward pass.   retrieval quality: poor.

2. Final hidden state of a GENERATION model
   "...the answer is" -> [decoder] -> h_last -> [LM head]
                                        ^ this
   purpose: predict the next token.  retrieval quality: mediocre.

3. A DEDICATED EMBEDDING MODEL (bi-encoder)
   text -> [encoder] -> pool -> L2 normalise -> vector
                                                  ^ this
   purpose: trained contrastively so that
            similar meaning = small angle.
   retrieval quality: what you actually want.`)
      },
      {
        title: "Similarity Metrics: Cosine, Dot Product, Euclidean",
        content:
          "Three metrics, each with a place. Cosine similarity measures the angle between two vectors and ignores magnitude entirely, giving a value in [-1, 1]; it is the right default for comparing meaning regardless of document length, because a short tweet and a long article on the same topic should score as similar even though their vector magnitudes differ. Dot product is proportional to both angle and magnitude - and crucially, when both vectors are L2-normalised so their magnitudes are one, dot product equals cosine similarity exactly. Euclidean distance is sensitive to magnitude as well as direction, so a long document and a short one on the same subject can sit far apart for uninteresting reasons; it is generally inferior for text. The production rule that follows is simple: normalise your vectors at write time and use dot product. You get cosine semantics with fewer operations, because you have already paid for the division.",
        diagram: asciiDiagram(`Embedding Space: Semantic Geometry (2D projection)
───────────────────────────────────────────────────────────────

High-dimensional space (e.g. 1536D) projected to 2D:

        "puppy" ●─── small angle ───● "dog"
                                          \\
                                           ● "wolf"
                                             \\
         ● "cat"           ● "feline"         \\
                                               ● "animal"

         ● "car"──────● "automobile"──● "vehicle"

                ● "the"    ● "a"    ● "an"
                (function words cluster separately)

cos_sim("dog", "puppy") ~ 0.92   <- highly similar
cos_sim("dog", "cat")   ~ 0.78   <- both are pets
cos_sim("dog", "car")   ~ 0.21   <- unrelated
cos_sim("dog", "the")   ~ 0.31   <- low semantic content`)
      },
      {
        title: "How Embedding Models Are Trained",
        content:
          "Modern embedding models are trained contrastively. Given pairs of a query and a known-relevant document, the objective minimises the distance between the query and its positive while maximising distance to negatives - typically using an InfoNCE or multiple-negatives ranking loss, with other examples in the batch serving as in-batch negatives. Training data comes from web search query-passage pairs, natural language inference datasets where entailment gives positives and contradiction gives hard negatives, community question-answer sites, and curated retrieval benchmarks. The practical result is the property you actually want: \"Python tutorial for beginners\" lands near \"Introduction to Python programming for newcomers\" despite sharing almost no vocabulary. For evaluation, the Massive Text Embedding Benchmark (MTEB) is the standard, covering retrieval, classification, clustering, semantic textual similarity and reranking across dozens of datasets. Check the sub-leaderboard for your task type - a model that tops retrieval may not top clustering, and the aggregate score hides that.",
        diagram: asciiDiagram(`Contrastive training: pull positives in, push negatives out
────────────────────────────────────────────────────────────────

Batch of (query, positive) pairs:
  q1 "how to reset my password"   p1 "Password reset steps..."
  q2 "cancel my subscription"     p2 "To cancel, go to..."
  q3 "python list comprehension"  p3 "List comprehensions..."

For q1, the loss says:
                p1  <- PULL CLOSER  (the labelled positive)
     q1 ●────────●
        │
        ├──────────● p2   <- PUSH AWAY (in-batch negative)
        └──────────● p3   <- PUSH AWAY (in-batch negative)

Repeat over millions of pairs and the space reorganises so
that "meaning" and "angle" become the same measurement.

Hard negatives (plausible but wrong passages) matter most -
easy negatives teach the model almost nothing.`)
      },
      {
        title: "Dimensionality and Matryoshka Embeddings",
        content:
          "Dimensionality trades quality against cost. Common sizes run from 384 for latency-critical or on-device use, through 768 and 1024 for mid-size encoders, up to 1536 and 3072 for the largest general-purpose models. Higher dimensionality is more expressive and scores better on benchmarks, but it also costs proportionally more storage and makes approximate nearest neighbour search slower, since search time scales with d. Matryoshka Representation Learning changes this trade-off: the model is trained so that the first k dimensions of the vector are themselves a valid embedding for any k. That means you can truncate a 3072-dimensional vector to 256 dimensions with only a few percent of benchmark degradation while cutting storage and dot-product cost by roughly twelve times. The pattern this enables is tiered retrieval: search a truncated low-dimensional index for candidates, then rescore the shortlist with full-dimensional vectors.",
        diagram: asciiDiagram(`Matryoshka truncation and tiered retrieval
────────────────────────────────────────────────────────────

A 3072-d Matryoshka vector contains valid sub-embeddings:

  [ 0 ................ 255 | 256 ......... 1023 | 1024 .. 3071 ]
   \\_____ valid 256-d _____/
   \\____________ valid 1024-d ______________/
   \\_______________________ full 3072-d _________________________/

Tiered retrieval over 10M documents:

  stage 1   ANN search on the 256-d index
            10M -> top 1,000 candidates
            storage 10 GB, very fast

  stage 2   rescore those 1,000 with full 3072-d vectors
            1,000 -> top 50
            exact dot products, negligible cost at n=1,000

  stage 3   cross-encoder rerank
            50 -> top 5 sent to the LLM

Cost falls by ~12x at stage 1; precision is recovered later.`)
      },
      {
        title: "Bi-Encoder vs. Cross-Encoder and the RAG Pipeline",
        content:
          "Two retrieval architectures, and production systems use both. A bi-encoder - the two-tower pattern - encodes the query and the document independently, so document vectors can be computed offline and similarity is a cheap dot product against an index. A cross-encoder concatenates the query and a candidate document into a single input and outputs one relevance score, which lets query and document tokens attend to each other directly and produces markedly better relevance judgments. The catch is that nothing can be precomputed: a cross-encoder must run once per candidate, so it cannot scan a corpus. The standard production pipeline therefore composes them: bi-encoder ANN retrieval fetches perhaps the top hundred candidates in milliseconds, a cross-encoder reranks those hundred down to the top handful, and only that handful is passed to the generator. This is the same shape as the retrieval-then-ranking architecture used in classical search and recommendation systems, which is why the two-tower topic and this one keep referring to each other.",
        diagram: asciiDiagram(`Bi-encoder retrieves, cross-encoder ranks
───────────────────────────────────────────────────────────────

OFFLINE (once per document)
  document -> [encoder] -> vector -> ANN index (HNSW/IVF)

ONLINE (per query)
  query -> [encoder] -> vector
                          │
                          ▼
             ┌───────────────────────────┐
             │ ANN search over 10M docs  │   ~10 ms
             │ bi-encoder, precomputed   │
             └───────────────────────────┘
                          │ top 100
                          ▼
             ┌───────────────────────────┐
             │ cross-encoder rerank      │   ~100 ms
             │ scores (query, doc) pairs │
             └───────────────────────────┘
                          │ top 5
                          ▼
                   LLM generation

Bi-encoder alone: fast, blunt.  Cross-encoder alone: accurate,
unscalable.  Composed: fast AND accurate.`)
      }
    ],
    examples: [
      {
        title: "Cosine Similarity by Hand",
        input: "A = [1, 0, 1], B = [0.7, 0.2, 0.9].",
        output: "cosine_similarity(A, B) is about 0.977.",
        explanation:
          "Step 1: compute the dot product - 1(0.7) + 0(0.2) + 1(0.9) = 1.6.\nStep 2: compute the norm of A - sqrt(1 + 0 + 1) = 1.414.\nStep 3: compute the norm of B - sqrt(0.49 + 0.04 + 0.81) = sqrt(1.34) = 1.158.\nStep 4: divide - 1.6 / (1.414 x 1.158) = 0.977, which means the two vectors point in almost the same direction.\nStep 5: note the production shortcut - if both vectors had been L2-normalised at write time, the plain dot product would already be 0.977, which is exactly why \"normalise once, then dot product\" is the standard pattern."
      },
      {
        title: "Storage Budget for a Production Embedding Index",
        input: "10 million product descriptions embedded at d = 3072 in float32.",
        output: "Raw about 123 GB; float16 about 61 GB; Matryoshka truncation to d=256 about 10 GB.",
        explanation:
          "Step 1: raw storage is 10,000,000 x 3,072 x 4 bytes = 122.9 GB, which will not fit in a single accelerator's memory.\nStep 2: switching to float16 halves that to about 61.4 GB with negligible recall impact for most corpora.\nStep 3: Matryoshka truncation to 256 dimensions gives 10,000,000 x 256 x 4 = 10.2 GB, a twelve-fold reduction.\nStep 4: add graph index overhead of roughly 50 bytes per vector - about 500 MB - so the truncated index sits near 10.7 GB and fits comfortably in a single 16 GB node.\nStep 5: the recall lost by truncation is a few percent, and a cross-encoder rerank over the shortlist recovers the precision, which is why this is the default shape for large indexes."
      },
      {
        title: "Bi-Encoder vs. Cross-Encoder Disagreement",
        input:
          "Query \"Python tutorial for beginners\". Bi-encoder ranks: 1. \"Learn Python the Hard Way\" (0.91), 2. \"Advanced Python Design Patterns\" (0.89), 3. \"Introduction to Python Programming\" (0.88).",
        output: "The cross-encoder reranks \"Introduction to Python Programming\" to first place.",
        explanation:
          "Step 1: the bi-encoder embedded the query and each document independently, so \"beginners\" is only present as one component of a single holistic query vector.\nStep 2: that holistic representation cannot express which part of the query matters most, so a document about advanced patterns still scores highly on general Python-ness.\nStep 3: the cross-encoder sees the pair together in one attention computation, so \"tutorial\" can align directly with \"introduction\" and \"beginners\" with \"newcomers\".\nStep 4: that direct token-level interaction is what recovers the nuance, and it is also exactly why the cross-encoder cannot be precomputed - the score does not exist until both texts are present.\nStep 5: the practical reading is that a bi-encoder ranking within a few hundredths of a point is effectively a tie, and resolving those ties is the reranker's entire job."
      }
    ],
    tips: [
      "Normalise vectors before computing dot products. Most embedding APIs return L2-normalised vectors, but verify - unnormalised dot products give magnitude-weighted results, not similarity.",
      "Never use a generation model's hidden states for retrieval. Use a model trained contrastively for embeddings and evaluated on retrieval benchmarks.",
      "Check the benchmark sub-task that matches your use case. Retrieval performance is not the same as semantic-similarity or clustering performance, and the aggregate score hides the difference.",
      "Match embedding granularity to query granularity. Embedding whole documents when queries are sentence-sized dilutes the signal; chunk to roughly the scale of the questions you expect.",
      "Multilingual retrieval requires a multilingual model. A monolingual English model produces effectively meaningless vectors for other languages, which silently breaks cross-language similarity.",
      "Switching embedding models means re-embedding the entire corpus. Embedding spaces are not interoperable - plan the re-index as an operational task, not an afterthought."
    ],
    tricks: [
      "Normalise once, store normalised. If document vectors are L2-normalised at write time, you only normalise the query, and every similarity is a plain dot product. Never compute norms at query time.",
      "Use the query and passage prefixes that asymmetric models were trained with. Several popular open models expect a short instruction prefix and lose noticeable retrieval quality without it - the model card tells you which.",
      "Run a retrieval benchmark on a sample of your own corpus before committing to a model. Five minutes on your data tells you more than the full public leaderboard, because domain shift dominates the small gaps between top models.",
      "For prototyping, start with a small 384-dimensional model that runs on CPU. It gives you most of the quality at a tiny fraction of the cost, and lets you validate the pipeline end to end before paying for the large model.",
      "When recall is mysteriously poor, check for silent truncation. Embedding APIs cut off input at their maximum token length without erroring, so a long document can have most of its content ignored. Chunk first, then embed."
    ],
    memoryAids: [
      "\"Cosine = direction, Euclidean = distance\" - for meaning you care where the vector points, not how long the text was.",
      "\"Bi-encoder is the scout, cross-encoder is the specialist\" - one covers the whole map quickly, the other examines a few candidates closely.",
      "\"MTEB is the embedding model's report card\" - read the subject you care about, not just the overall grade.",
      "\"Matryoshka = nested dolls\" - the first 256 dimensions of a 3072-d Matryoshka vector are themselves a valid 256-d embedding."
    ],
    interviewPatterns: [
      "\"How would you build semantic search over 50 million customer reviews?\" - the flagship embeddings-plus-ANN design question; this whole topic is the answer.",
      "\"What is cosine similarity and why use it instead of Euclidean distance for text?\" - entry-level and expected at every seniority.",
      "\"Explain the difference between a bi-encoder and a cross-encoder.\" - Tier 1 at any ML, search or NLP role; follow with where each sits in the pipeline.",
      "\"How much storage would embedding 10M documents at d=1536 require?\" - tests quantitative instinct; show the multiplication rather than recalling a number.",
      "\"Your semantic search returns keyword-similar but not semantically relevant results. What do you investigate?\" - tests embedding model choice, chunking and reranking together.",
      "Frequency and audience: Tier 1 - asked in 95%+ of AI/ML engineering loops; expected at Google, Meta, Amazon, Microsoft, Databricks, the vector database vendors, and any search or RAG team."
    ],
    faq: [
      {
        question: "Can I use the same embedding model for queries and documents?",
        answer:
          "You should - and in most cases you must. Embedding models are trained as symmetric or asymmetric dual encoders, and some expect distinct query and passage prefixes that activate the right representation. Using different models for the two sides produces vectors in incompatible spaces, which does not error, it just quietly destroys retrieval quality. Always read the model card for the intended usage pattern, particularly whether prefixes are required.",
        category: "practical"
      },
      {
        question: "What is the relationship between embedding dimensionality and quality?",
        answer:
          "Higher dimensionality generally encodes more information and benchmarks better, with sharply diminishing returns. The largest models typically beat their mid-size siblings by only a couple of points overall, which rarely justifies four times the storage unless you are operating at the quality frontier. Matryoshka-trained models change the calculus entirely by letting you pick the dimension at query time, so you can hold a cheap truncated index and rescore with full vectors where it matters.",
        category: "practical"
      },
      {
        question: "Do embeddings capture factual accuracy?",
        answer:
          "No. Embeddings capture semantic similarity, and a factually wrong statement embeds close to a correct one when they are phrased similarly - \"the Eiffel Tower is in London\" and \"the Eiffel Tower is in Paris\" are both about the tower's location and sit near each other. Factual verification needs a different mechanism: retrieve against a trusted knowledge base and then verify the claim against the retrieved evidence. Treating retrieval score as a truth signal is a recurring design error.",
        category: "limitations"
      },
      {
        question: "What happens when I embed a document longer than the model's token limit?",
        answer:
          "The model truncates silently at its maximum - often 512 tokens for smaller encoders and a few thousand for large ones - and everything past that point is discarded with no error or warning. There are three standard fixes: chunk documents into segments below the limit and embed each chunk; use a late-interaction model that produces per-token embeddings and aggregates at retrieval time; or build hierarchical embeddings that index section summaries first and drill into paragraphs within the top sections.",
        category: "limitations"
      },
      {
        question: "Are embeddings from different models interoperable?",
        answer:
          "No. Every model defines its own space, so vectors from two different models cannot be meaningfully compared with cosine similarity or dot product even when the dimensionality happens to match. Switching models therefore requires re-embedding the entire corpus, and there is no conversion shortcut. Treat this as a planned migration with a dual-write or shadow-index period, because for a large corpus the re-embedding job is measured in hours or days and in real compute spend.",
        category: "operations"
      },
      {
        question: "What is the difference between a word embedding and a sentence embedding?",
        answer:
          "Classic word embeddings such as Word2Vec and GloVe assign one static vector per word regardless of context, so \"bank\" has a single vector covering both the financial and the river sense. Contextual token embeddings from a transformer give a different vector per occurrence based on surrounding text. Sentence embeddings go one step further and pool a whole sentence or passage into a single vector, trained specifically so that passage-level similarity is meaningful - which is what retrieval and clustering actually need.",
        category: "conceptual"
      }
    ],
    practiceProblems: [
      "Cosine similarity: compute the cosine similarity of A=[3,1,0,2] and B=[2,2,1,0], interpret it, then normalise both and verify the dot product matches. ANSWER: A.B = 6+2+0+0 = 8. |A| = sqrt(14) = 3.742, |B| = 3. cos = 8 / 11.226 = 0.712 - moderate similarity. Normalised A = [0.802, 0.267, 0, 0.535], B = [0.667, 0.667, 0.333, 0]; their dot product is 0.535 + 0.178 = 0.713, matching to rounding.",
      "Storage budget: 50M product descriptions at d=1536. (a) float32 storage, (b) float16, (c) Matryoshka truncation to d=256 in float16, (d) how many 80 GB accelerators are needed to hold the d=256 index in memory including 50 bytes/vector of graph overhead? ANSWER: (a) 50M x 1536 x 4 = 307.2 GB. (b) 153.6 GB. (c) 50M x 256 x 2 = 25.6 GB. (d) overhead 2.5 GB, total 28.1 GB - one accelerator, with room to spare.",
      "Retrieval pipeline design: build search over 2M court opinions averaging 15,000 tokens each, for 30-word legal questions. Choose an embedding model, handle the document length, and specify the retrieval strategy. ANSWER: use a strong multilingual-capable large embedding model; split each opinion into ~512-token chunks with ~100-token overlap, giving roughly 60M chunks; index in HNSW; at query time embed the question, ANN to top-100 chunks, cross-encoder rerank to top-10, aggregate to opinion level by max chunk score, return the top 5 opinions with the matching passages highlighted.",
      "Diagnose a silent failure: after switching embedding models, retrieval quality collapses even though the new model scores higher on public benchmarks. List the three most likely causes and how to confirm each. ANSWER: (1) the corpus was not re-embedded, so queries and documents are in different spaces - confirm by checking index build timestamps and by embedding a document you know is in the index and verifying it retrieves itself at score ~1.0; (2) the new model requires query/passage prefixes that are not being applied - confirm from the model card and by A/B testing with prefixes; (3) documents now exceed the new model's shorter token limit and are being silently truncated - confirm by tokenizing the longest documents and comparing against the stated maximum."
    ],
    references: [
      {
        source: "blog",
        attribution: "Jay Alammar, \"The Illustrated Word2Vec\" (https://jalammar.github.io/illustrated-word2vec/)",
        insight: "Best visual introduction to embedding geometry and the intuition behind contrastive training."
      },
      {
        source: "blog",
        attribution: "OpenAI embeddings guide (https://platform.openai.com/docs/guides/embeddings)",
        insight: "Provider guidance on model choice, the dimensions parameter and intended use cases."
      },
      {
        source: "blog",
        attribution: "MTEB leaderboard (https://huggingface.co/spaces/mteb/leaderboard)",
        insight: "Live benchmark across retrieval, clustering, STS and reranking - check the sub-task, not the average."
      },
      {
        source: "note",
        attribution: "Reimers & Gurevych, \"Sentence-BERT\" (2019) - https://arxiv.org/abs/1908.10084",
        insight: "The paper that made sentence embeddings practical by training bi-encoders contrastively."
      },
      {
        source: "note",
        attribution: "Kusupati et al., \"Matryoshka Representation Learning\" (2022) - https://arxiv.org/abs/2205.13147",
        insight: "The theory behind nested embeddings and why truncation costs so little quality."
      },
      {
        source: "blog",
        attribution: "Eugene Yan, \"Patterns for Building LLM-based Systems & Products\" (https://eugeneyan.com/writing/llm-patterns/)",
        insight: "Practitioner survey covering embedding and retrieval patterns as deployed at scale."
      },
      {
        source: "note",
        attribution: "StatQuest, \"Word Embedding and Word2Vec\" - https://www.youtube.com/watch?v=viZrOnJclY0",
        insight: "The gentlest correct introduction to vector spaces for someone new to the idea."
      },
      {
        source: "book",
        attribution: "Chip Huyen, AI Engineering (O'Reilly, 2025), Chapter 5",
        insight: "Embeddings in production: indexing, serving, monitoring and re-indexing operations."
      }
    ]
  }
];
