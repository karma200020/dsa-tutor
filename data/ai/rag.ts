import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-ai-rag - "AI: Retrieval-Augmented Generation" (10 topics).
// Coverage: when RAG beats fine-tuning, pipeline architecture, chunking
// strategies, embedding model choice, vector DBs & ANN indexes, hybrid search
// (BM25 + vector fusion), re-ranking, query rewriting, retrieval-quality
// evaluation, common failure modes. This is the most-asked AI design area, so it
// carries the most depth in the track.
//
// Authoring rules: see data/ai/foundations.ts (every field explicit, 5+ FAQs,
// `complexity` as latency/cost framing, `asciiDiagram` from "./_shared").
export const aiRagTopics: Topic[] = [
  {
    id: "topic-ai-rag-why-and-when",
    moduleId: "mod-ai-rag",
    title: "Why RAG, and When RAG Beats Fine-Tuning",
    intuition:
      "RAG and fine-tuning solve different failure modes. RAG fixes what the model knows by retrieving live evidence at query time, while fine-tuning fixes how the model behaves by changing its default style, structure, and preferences. The fastest way to make the right design call in an interview is to ask one diagnostic question first: is this a knowledge problem or a behavior problem? Once you classify the problem correctly, the architecture usually follows without drama.",
    complexity: {
      time:
        "RAG adds per-query retrieval latency, usually one query embedding plus ANN search and sometimes reranking. Fine-tuning adds almost no per-query latency after deployment, but every knowledge refresh requires a new training cycle that takes hours to days.",
      space:
        "RAG keeps the base model unchanged but adds an external index whose memory scales with chunk count and embedding dimension. Fine-tuning may add only small adapter weights, but it does not eliminate the need for a knowledge store when facts change frequently."
    },
    lesson: [
      {
        title: "The Core Diagnostic: Knowledge vs. Behavior",
        content:
          "A knowledge failure happens when the model lacks access to the right fact at answer time: private documents, fresh policies, tenant-specific records, or anything that changed after pretraining. A behavior failure happens when the model has enough information but expresses it badly: wrong format, wrong tone, poor instruction-following, or weak domain style. RAG is the right tool for the first class because it injects evidence dynamically. Fine-tuning is the right tool for the second class because it changes the output distribution of the model itself.",
        diagram: asciiDiagram(`Decision tree for the first architecture choice

Wrong or weak answer
        │
        ├── Is the missing fact in an external corpus or changing over time?
        │         │
        │         ├── Yes  ──▶  Use RAG
        │         │
        │         └── No
        │
        └── Is the content mostly right but the style, format, or policy behavior wrong?
                  │
                  ├── Yes  ──▶  Fine-tune
                  │
                  └── Both ──▶  Fine-tune for behavior, RAG for live knowledge`)
      },
      {
        title: "The Four Signals That Strongly Favour RAG",
        content:
          "RAG wins whenever freshness, citations, scale, or isolation matter. Freshness means facts change faster than you can afford to retrain. Citations mean the product must show evidence, not just plausible prose. Scale means the corpus is too large to hope that weight updates will preserve exact factual recall. Isolation means different users must see different facts, which strongly points to retrieval with metadata filters rather than one global fine-tuned model."
      },
      {
        title: "The Four Signals That Strongly Favour Fine-Tuning",
        content:
          "Fine-tuning is the right move when output format must be rigid, domain phrasing matters a lot, latency is extremely tight, or prompt-only instruction following remains unreliable. A model that must always emit valid JSON, SQL, or a company-specific support style is a classic behavior problem. Fine-tuning is also useful when you want a smaller model to imitate a larger one at lower cost. But it is still the wrong answer for fast-changing documentation or per-tenant private knowledge."
      },
      {
        title: "Why RAG Usually Comes Before Fine-Tuning",
        content:
          "RAG is usually more reversible, cheaper to update, and easier to debug because you can inspect the retrieved evidence directly. A failed RAG query leaves artifacts: chunk IDs, scores, filters, and prompt context. A failed fine-tune gives you wrong behavior embedded in weights and forces another training cycle to repair it. In practice, strong teams start with prompting, move to RAG when knowledge gaps appear, and add fine-tuning only after they can prove the remaining problem is behavioral rather than factual."
      },
      {
        title: "The Mature Pattern: Use Both for Different Jobs",
        content:
          "Production systems often combine the two. The generator may be fine-tuned once for citation style, refusal behavior, and domain tone, while RAG continuously supplies current facts from contracts, policies, APIs, or internal docs. A second high-ROI variant is retriever fine-tuning, where the embedding model is adapted to legal, medical, or proprietary terminology. The clean mental split is simple: fine-tuning decides how the answer is said; RAG decides what evidence is available to say it."
      }
    ],
    examples: [
      {
        title: "Weekly-changing legal corpus",
        input:
          "50,000 client contracts change every week, and every answer must cite a clause number.",
        output: "Use RAG, optionally plus retriever fine-tuning for legal terminology.",
        explanation:
          "Step 1: Classify the issue as knowledge-shaped because the corpus changes weekly.\nStep 2: Add the citation requirement, which strongly favors retrieval over memorization.\nStep 3: Note that contract text is too large and too volatile to keep baking into weights.\nStep 4: Choose RAG, with optional retriever fine-tuning if legal terms are retrieved poorly."
      },
      {
        title: "Strict JSON support bot",
        input:
          "A support assistant already knows the right answers, but it often returns prose instead of a strict JSON schema.",
        output: "Start with prompt engineering, then fine-tune if schema compliance remains inconsistent.",
        explanation:
          "Step 1: Observe that the knowledge already exists; the failure is output format.\nStep 2: That makes this a behavior problem rather than a retrieval problem.\nStep 3: Try prompt constraints first because they are cheapest.\nStep 4: If compliance still drifts, fine-tune the generator for persistent structured output behavior."
      },
      {
        title: "Internal API assistant with wrong tone and stale facts",
        input:
          "Engineers need answers over proprietary API docs updated daily, and the assistant must answer in a terse company-specific style.",
        output: "Use both: RAG for the docs and fine-tuning for style.",
        explanation:
          "Step 1: Daily-updated proprietary docs create a strong freshness requirement.\nStep 2: Company-specific terse style is a behavior requirement.\nStep 3: RAG handles the live facts while fine-tuning handles the tone and formatting.\nStep 4: Splitting responsibilities prevents retraining every time the docs change."
      }
    ],
    tips: [
      "Open with the knowledge-vs-behavior test before naming any technology.",
      "Use RAG whenever freshness, citations, or tenant isolation are first-class requirements.",
      "If the issue is style or schema compliance, do not hide a behavior problem inside a retrieval design."
    ],
    tricks: [
      "Use the mnemonic FCSI for RAG triggers: freshness, citations, scale, isolation.",
      "Say out loud that RAG lowers update cost while fine-tuning lowers marginal inference complexity after deployment.",
      "When the case is ambiguous, start with RAG because it is more observable and reversible."
    ],
    memoryAids: [
      "RAG retrieves facts; fine-tuning teaches habits.",
      "Parametric knowledge is printed in weights, non-parametric knowledge is looked up live.",
      "If the fact can be stale in six months, retrieve it instead of baking it."
    ],
    interviewPatterns: [
      "Diagnose first: 'Is this a knowledge problem or a behavior problem?'",
      "If docs change daily and citations matter, say RAG quickly and explain why.",
      "Frequency and companies: Tier 2 opener at AI-first companies and a near-universal framing question in LLM product interviews."
    ],
    practiceProblems: [
      "A healthcare assistant must answer over patient records updated every day and never leak across hospitals. Answer: Use RAG with mandatory hospital or patient metadata filters because freshness and isolation dominate; fine-tuning would not solve either requirement.",
      "A finance chatbot must always emit a fixed audit JSON schema, but the knowledge comes from a nightly warehouse snapshot. Answer: Use both if prompt-only formatting fails; retrieval serves live data while fine-tuning locks in the schema behavior.",
      "A pirate-themed consumer app just needs a whimsical tone over static public trivia. Answer: Prompt first and fine-tune only if the tone drifts; RAG adds needless moving parts because the core issue is behavior, not knowledge."
    ],
    faq: [
      {
        question: "Can I just fine-tune on my documents and skip RAG?",
        answer:
          "You can, but it is usually the wrong architecture for living knowledge. Fine-tuning is weak at precise factual refresh and expensive to repeat every time the documents change. RAG decouples content updates from model updates, which is exactly what most knowledge assistants need."
      },
      {
        question: "Does RAG reduce hallucination completely?",
        answer:
          "No. RAG reduces one major class of hallucination by supplying evidence, but the model can still ignore evidence, misread it, or invent unsupported claims when the prompt is weak. You still need grounding instructions, citations, and evaluation of faithfulness."
      },
      {
        question: "When should I fine-tune the retriever instead of the generator?",
        answer:
          "Do it when the biggest failure is retrieval recall on specialized vocabulary. If the generator sounds fine but the correct chunks never arrive for legal citations, medical terms, or proprietary product names, retriever adaptation usually has higher ROI than generator tuning."
      },
      {
        question: "Why not just use a huge context window instead of RAG?",
        answer:
          "Huge-context stuffing is expensive per query and still suffers from attention dilution. Even when the model can technically read the tokens, it does not attend to all positions equally, so relevant evidence can become practically invisible in the middle of a massive prompt."
      },
      {
        question: "What is the senior-level answer when both needs appear together?",
        answer:
          "Say 'use both' and divide responsibility clearly. Fine-tune once for stable behavioral requirements such as style, schema, or refusal policy, and use RAG for all information that changes, differs by tenant, or must be cited. That split shows product maturity rather than false either-or thinking."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Lewis et al. — Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (2020) - https://arxiv.org/abs/2005.11401",
        insight: "Introduces the parametric-versus-non-parametric framing that underlies the RAG vs fine-tuning decision."
      },
      {
        source: "blog",
        attribution: "Eugene Yan — Patterns for Building LLM-based Systems (2023) - https://eugeneyan.com/writing/llm-patterns/",
        insight: "Clear practitioner framing on when retrieval, prompting, and fine-tuning each earn their cost."
      },
      {
        source: "blog",
        attribution: "OpenAI fine-tuning guide - https://platform.openai.com/docs/guides/fine-tuning",
        insight: "Useful operational reference for what fine-tuning changes and what it does not."
      }
    ]
  },
  {
    id: "topic-ai-rag-pipeline-architecture",
    moduleId: "mod-ai-rag",
    title: "RAG Pipeline Architecture: Offline Ingest vs. Online Retrieval",
    intuition:
      "The deepest structural insight in RAG is that the system cleanly splits into two worlds. Offline work prepares knowledge when no user is waiting: parse, clean, chunk, embed, and index. Online work spends a strict latency budget on each query: rewrite, embed, retrieve, rerank, and generate. Most production mistakes come from violating that boundary, either by doing expensive offline work during the query path or by forgetting to refresh the offline index when source content changes.",
    complexity: {
      time:
        "Offline stages are throughput problems measured in documents or chunks per hour, so minutes of batch latency are acceptable. Online stages are user-facing latency problems, so query embed, retrieval, reranking, and generation must fit a p95 budget usually below one second for good UX.",
      space:
        "Offline storage includes raw documents, parsed text, chunk metadata, embeddings, and one or more indexes. Online memory is dominated by the loaded index, reranker model, and the working prompt context assembled for the generator."
    },
    lesson: [
      {
        title: "The Two-Phase Split",
        content:
          "State the split explicitly in interviews: ingest is offline, answer serving is online. Offline stages can be retried, parallelized, and backfilled without a user staring at the screen. Online stages are synchronous and ruthlessly latency-sensitive because every extra millisecond is visible. This single classification determines where you cache, where you batch, and where you are allowed to be expensive.",
        diagram: asciiDiagram(`Full RAG pipeline with the index boundary

OFFLINE: parse -> clean -> chunk -> embed -> index
Raw docs    Clean text    Chunks       Vectors      Searchable index
PDF HTML    normalized    512-token    batched      HNSW or IVF
DOCX DB     stripped      units        embedding    plus metadata

======================= INDEX BOUNDARY =======================

ONLINE: rewrite -> query embed -> retrieve -> rerank -> generate
User query -> optional rewrite -> ANN or hybrid -> top chunks -> cited answer`)
      },
      {
        title: "The Offline Path: Parse, Chunk, Embed, Index",
        content:
          "Real corpora are messy. PDFs have headers and two-column layout, HTML has navigation noise, and DOCX files can hide tracked changes or malformed tables. The ingest path has to normalize all of that before chunking, because bad text produces bad chunks and bad chunks poison every downstream metric. After cleaning, the system splits text into retrieval units, embeds them in batches, and stores vectors alongside metadata such as document ID, tenant ID, page, heading, and last-modified time."
      },
      {
        title: "The Online Path: Retrieval Funnel",
        content:
          "Online serving begins with the raw query and optionally a rewrite step for conversational or vague requests. The query is embedded with the exact same model used for document chunks, then passed to ANN search or hybrid retrieval to get a larger candidate set such as top-50 or top-100. Metadata filters narrow that set, reranking sharpens it, and only a handful of the best chunks enter the generator context. The funnel exists because cheap stages optimize recall and expensive stages optimize precision."
      },
      {
        title: "Grounded Generation and Citations",
        content:
          "The generator must be told to answer only from provided context, to cite evidence, and to admit uncertainty when the answer is absent. Without those three instructions, even a perfect retriever can still produce confident nonsense. The chunks should be labeled and ordered deliberately, with the strongest chunk first, because position inside the context window affects what the model actually uses."
      },
      {
        title: "Operations: Freshness, Access Control, and Debugging",
        content:
          "A production pipeline is not finished until freshness and access control are first-class. Updates need a trigger path from the source system into re-ingestion, and multi-tenant retrieval must enforce server-side filters at every query. Observability should log retrieved chunk IDs, reranked IDs, source metadata, and stage latencies so every bad answer can quickly be traced to retrieval, reranking, or generation instead of guessed at."
      }
    ],
    examples: [
      {
        title: "Tracing an HR policy question",
        input:
          "A user asks, 'Can I carry over unused vacation days to next year?' after 200 HR PDFs have already been indexed.",
        output:
          "The system retrieves the PTO policy section, reranks it to the top, and generates a cited answer from that chunk.",
        explanation:
          "Step 1: The PDFs were already parsed, chunked, embedded, and indexed offline before the user query arrived.\nStep 2: The online path embeds the question with the same embedding model used during ingest.\nStep 3: ANN search finds many policy-related chunks and the correct PTO clause appears in the candidate set.\nStep 4: Reranking promotes the exact carryover clause and the generator answers with a citation."
      },
      {
        title: "Grounding prompt missing",
        input:
          "The same retrieval works, but the system prompt does not say to use only the provided context or to cite sources.",
        output: "The model gives a generic answer about typical company policies instead of the company's actual rule.",
        explanation:
          "Step 1: Retrieval still returns the correct policy chunk, so the pipeline has evidence.\nStep 2: Without grounding instructions, the generator treats that evidence as optional background.\nStep 3: It blends parametric knowledge about typical PTO with the retrieved policy.\nStep 4: The failure is generation-side faithfulness, not retrieval."
      },
      {
        title: "Latency budget repair",
        input:
          "Embed = 22ms, ANN = 35ms, filter = 5ms, rerank 100 = 480ms, generation = 360ms; SLA is 600ms.",
        output: "Reduce rerank candidates sharply and stream generation.",
        explanation:
          "Step 1: Profile shows reranking and generation dominate the p95 budget.\nStep 2: Lowering reranker input from 100 to 25 cuts its latency almost linearly.\nStep 3: Streaming does not change full completion time much but it drastically lowers perceived latency.\nStep 4: The architecture lesson is to optimize the expensive online stages, not the already-cheap ones."
      }
    ],
    tips: [
      "Draw the offline versus online split before naming any framework or vendor.",
      "Treat the query-time embedding model as a correctness constraint, not a preference.",
      "Log enough metadata to decide whether a bad answer was a retrieval miss or a grounding miss in under two minutes."
    ],
    tricks: [
      "Say cheap wide retrieval and expensive narrow reranking to explain the funnel clearly.",
      "When someone says the system feels stale, inspect the ingest trigger path before touching the query path.",
      "Volunteer tenant filters early in enterprise scenarios because interviewers expect them."
    ],
    memoryAids: [
      "ICE is offline: ingest, chunk, embed. RAG is online: retrieve, answer, ground.",
      "Millions to hundreds to tens to a handful is the normal retrieval funnel.",
      "A stale index is the dead battery of RAG: the wiring exists, but the knowledge is old."
    ],
    interviewPatterns: [
      "Be ready to narrate a document from arrival to indexed chunk to cited answer.",
      "Expect latency-budget questions that force you to identify the online bottleneck stages.",
      "Frequency and companies: Tier 1 architecture deep-dive at AI-native companies and common system-design ground at staff level."
    ],
    practiceProblems: [
      "A legal SaaS platform needs firm-isolated retrieval with citations and 2-hour freshness. Answer: shared or per-firm indexes with mandatory firm_id filtering, event-driven re-ingestion, reranking, and grounded generation under a measured latency budget.",
      "A 500-document corpus has near-zero concurrency. Answer: skip the vector database entirely and use exact search or a tiny ANN setup, because the pipeline architecture should shrink with the problem."
    ],
    faq: [
      {
        question: "Do I always need a dedicated vector database?",
        answer:
          "No. Small corpora can live comfortably in Postgres with pgvector, or even in-memory exact search, and that is often the simplest correct choice. A dedicated vector system becomes worthwhile only when corpus size, filtering needs, or concurrency measurements justify the new operational complexity."
      },
      {
        question: "Should vector storage also hold chunk text?",
        answer:
          "Many production systems store only vectors, IDs, and light metadata in the ANN layer, then fetch full text from a document store by chunk ID. Some products support payload storage for convenience, but the architectural point is to keep the retrieval structure optimized for retrieval and the text system optimized for text access."
      },
      {
        question: "What should the grounding instruction actually contain?",
        answer:
          "It needs three pieces: use only the provided context, cite every factual claim, and say you do not know when evidence is missing. Omitting the third line is the classic mistake because it invites confident hallucination exactly when retrieval was weak or the corpus was incomplete."
      },
      {
        question: "How many chunks should reach the LLM?",
        answer:
          "Usually only a small top slice, often three to seven high-quality chunks. More chunks increase token cost and push relevant evidence toward the middle of the context window, where models attend poorly."
      },
      {
        question: "What is the biggest operational risk in enterprise RAG?",
        answer:
          "Missing or inconsistent access-control filters is the most dangerous one because it turns a retrieval bug into a data leak. Freshness comes next because stale answers can silently erode trust for weeks before anyone notices the index drift."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Lewis et al. — Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks (2020) - https://arxiv.org/abs/2005.11401",
        insight: "Defines the canonical retrieve-then-generate shape that later production pipelines elaborate."
      },
      {
        source: "note",
        attribution: "Liu et al. — Lost in the Middle (2024) - https://arxiv.org/abs/2307.03172",
        insight: "Explains why context ordering matters after retrieval and reranking."
      },
      {
        source: "blog",
        attribution: "LlamaIndex concepts documentation - https://docs.llamaindex.ai/en/stable/getting_started/concepts/",
        insight: "Good practical mapping from conceptual stages to framework components."
      }
    ]
  },
  {
    id: "topic-ai-rag-chunking-strategies",
    moduleId: "mod-ai-rag",
    title: "Chunking Strategies for RAG",
    intuition:
      "Chunking is where RAG silently succeeds or fails before any retrieval algorithm gets a chance to help. If you cut the document at the wrong semantic boundary, the embedding of that chunk represents a muddled idea, and no vector database can recover the lost structure later. The job of chunking is to create units of meaning that can stand alone in retrieval while still carrying enough surrounding context for the generator to answer well.",
    complexity: {
      time:
        "Chunking is an offline ingest concern, so its direct query-time cost is zero in the standard architecture. Semantic and late chunking cost more at ingest because they require extra embedding or long-context inference passes, but that cost is amortized across every later query.",
      space:
        "Chunk size and overlap directly determine chunk count, index size, and duplicate content overhead. Smaller chunks and larger overlap improve boundary safety but linearly increase storage, embedding spend, and index memory."
    },
    lesson: [
      {
        title: "The Main Tradeoff: Precision vs. Context Completeness",
        content:
          "Small chunks give precise embeddings because each vector covers one focused idea. Large chunks give the LLM richer local context, but the embedding becomes a blurry average across several ideas. The right default is not universal; it depends on query granularity. For general prose, 512 tokens with about 100 tokens of overlap is a strong starting point because it balances discrimination, context, and cost.",
        diagram: asciiDiagram(`Chunk-size tradeoff

SMALL chunks                     LARGE chunks
[Idea A] [Idea B]               [Idea A + B + start C]
precision high                  context rich
retrieval sharp                 embedding diluted
more chunks, more cost          fewer chunks, less precision

Goal: one coherent unit of meaning per chunk`)
      },
      {
        title: "Fixed-Size and Recursive Splitting",
        content:
          "Fixed-size chunking is the baseline because it is simple, cheap, and predictable, but it cuts through sentences, lists, and tables without mercy. Recursive splitting improves the default by trying cleaner boundaries first, such as paragraph breaks or sentence boundaries, and only falling back to harder cuts when necessary. That is why recursive splitting is usually the right starting point for prose-heavy corpora. Overlap is not optional because it protects facts that straddle chunk boundaries."
      },
      {
        title: "Semantic and Structure-Aware Chunking",
        content:
          "Semantic chunking detects topic shifts from embedding similarity between adjacent sentences, so boundaries are placed where meaning actually changes rather than where the token count happens to overflow. Structure-aware chunking is even cheaper and often better when documents expose headings, sections, tables, and code fences. In Markdown, HTML, or well-formed docs, the author has already given you the natural chunk boundaries, and you should exploit them before paying for more elaborate semantic heuristics."
      },
      {
        title: "Parent-Child and Late Chunking",
        content:
          "Parent-child retrieval decouples retrieval granularity from generation granularity: small child chunks are embedded and indexed for precise search, but larger parent sections are returned to the LLM for complete context. Late chunking goes further by embedding the whole long document first and deriving chunk vectors from that larger representation, which helps with pronouns and references like described above. These patterns are especially useful when retrieval wants small focused units but answer quality wants broader sections."
      },
      {
        title: "Edge Cases: Tables, Code, and Ugly PDFs",
        content:
          "Tables and code blocks should be treated as atomic whenever possible because splitting them destroys their semantics. A row without its header or a function body without its signature becomes nearly meaningless to both embeddings and generators. Multi-column PDFs add a separate ingest problem: if reading order is garbled before chunking starts, every later component sees incoherent text and the failure gets wrongly blamed on retrieval."
      }
    ],
    examples: [
      {
        title: "Pricing table split in two",
        input:
          "A pricing table is split after the Pro row, leaving the Enterprise row in a second chunk without column headers.",
        output: "The system confidently answers with Pro's storage instead of Enterprise's.",
        explanation:
          "Step 1: Chunk A contains the header row and first two pricing rows.\nStep 2: Chunk B contains Enterprise values but no column meaning.\nStep 3: Retrieval favors Chunk A because it includes the words price and storage.\nStep 4: The model reads the wrong row and produces a confident but wrong answer."
      },
      {
        title: "Overlap rescues a legal clause",
        input:
          "A boundary falls between assignment restriction and the next sentence extending it to subcontractors.",
        output: "With overlap the right clause is retrieved; without overlap the answer is incomplete.",
        explanation:
          "Step 1: Without overlap, one chunk has assignment and the next has subcontractors but neither has both.\nStep 2: The query needs both concepts in one vector to retrieve cleanly.\nStep 3: Overlap duplicates the boundary sentence into both chunks.\nStep 4: The chunk containing both ideas becomes the clear retrieval winner."
      },
      {
        title: "Narrative paper benefits from semantic boundaries",
        input:
          "A research paper transitions from Methods to Evaluation Metrics, but fixed-size chunking blends the two sections.",
        output: "Semantic chunking isolates the metrics explanation and retrieves it at rank 1.",
        explanation:
          "Step 1: Fixed-size chunking averages setup boilerplate with the metrics paragraph.\nStep 2: The query about metrics only weakly matches the blended chunk.\nStep 3: Semantic splitting detects the topic-shift similarity drop and places a boundary there.\nStep 4: The focused metrics chunk retrieves strongly and yields a better answer."
      }
    ],
    tips: [
      "Prepend structural context such as title and heading path to every chunk before embedding.",
      "Detect tables and code fences before any text splitter runs.",
      "Validate chunking on representative queries before spending time on fancier rerankers or prompts."
    ],
    tricks: [
      "Say chunking strategy and chunking parameters separately; interviewers notice the distinction.",
      "Use the atomic-unit-of-meaning test: can the chunk be understood without its neighbors?",
      "When the corpus is heterogeneous, route document types to different chunkers instead of forcing one global size."
    ],
    memoryAids: [
      "Goldilocks chunking: too small loses context, too large dilutes meaning.",
      "Parent-child means search small, read big.",
      "Late chunking means embed together, split later."
    ],
    interviewPatterns: [
      "Expect a PDF-manual or mixed-corpus chunking design question.",
      "Call out table splitting immediately when asked about numerical retrieval failures.",
      "Frequency and companies: Tier 1 deep-dive after basic architecture, especially at search-heavy or document-heavy AI companies."
    ],
    practiceProblems: [
      "A docs site has headings, parameter tables, and JSON examples. Answer: use structure-aware splitting, keep tables and code blocks atomic, and consider parent-child retrieval for long sections.",
      "A corpus mixes FAQs, API references, and essays. Answer: route FAQs as one entry per chunk, split API pages by semantic subsection, and use semantic or recursive chunking for essays because one policy for all three is suboptimal."
    ],
    faq: [
      {
        question: "What chunk size should I actually start with?",
        answer:
          "For general prose, start around 512 tokens with about 15 to 20 percent overlap and then measure retrieval quality on real queries. Move smaller for atomic FAQs and larger for technical or legal text only when evaluation shows it helps."
      },
      {
        question: "Why can a strong embedding model still retrieve irrelevant chunks?",
        answer:
          "Because embeddings cannot rescue semantically incoherent input. If a chunk contains the tail of one topic and the head of another, the vector becomes a compromise that matches neither query well, regardless of how strong the model is."
      },
      {
        question: "When should I use parent-child retrieval?",
        answer:
          "Use it when small chunks retrieve accurately but the LLM needs more local context than those child chunks contain. It resolves the fundamental tension between retrieval precision and generation completeness."
      },
      {
        question: "Should I use semantic chunking everywhere?",
        answer:
          "No. Semantic chunking is valuable for long narrative text without reliable structure, but it is more expensive and unnecessary when headings already give natural boundaries. Structure-aware splitting is often the cheaper and better default."
      },
      {
        question: "What is the most common chunking bug in business documents?",
        answer:
          "Split tables are the most memorable one because they create confident numerical errors. Once headers and rows are separated, embeddings lose column meaning and the generator guesses from incomplete evidence."
      }
    ],
    references: [
      {
        source: "blog",
        attribution: "Anthropic — Introducing Contextual Retrieval (2024) - https://www.anthropic.com/news/contextual-retrieval",
        insight: "Good evidence that enriching chunks with document-level context reduces retrieval failures."
      },
      {
        source: "blog",
        attribution: "Jina AI — Late Chunking (2024) - https://jina.ai/news/late-chunking-in-long-context-embedding-models/",
        insight: "Explains the context-aware alternative to standard split-then-embed pipelines."
      },
      {
        source: "blog",
        attribution: "LangChain text splitter docs - https://python.langchain.com/docs/concepts/text_splitters/",
        insight: "Reference for recursive splitting and overlap semantics."
      }
    ]
  },
  {
    id: "topic-ai-rag-embedding-models",
    moduleId: "mod-ai-rag",
    title: "Embedding Model Selection for RAG Retrieval",
    intuition:
      "Choosing an embedding model is not a leaderboard beauty contest. The best production model is the one whose vector space aligns your actual queries with your actual answer-bearing passages while fitting your latency, memory, and language constraints. A model can rank near the top on a general benchmark and still fail badly on your legal, medical, or code-heavy corpus if its training distribution does not match your retrieval task.",
    complexity: {
      time:
        "Embedding cost appears twice: once at ingest for every chunk and once online for every query. Larger models and longer context windows usually improve quality but increase query latency and make index rebuilds more expensive when you switch models.",
      space:
        "Embedding dimension multiplies directly into raw index size, then ANN overhead inflates the total further. Higher dimension, longer context support, and multilingual coverage all tend to cost more compute or memory, so model choice is a real infrastructure decision rather than a cosmetic one."
    },
    lesson: [
      {
        title: "RAG Needs Asymmetric Retrieval",
        content:
          "A good RAG embedding model must map short user questions near longer answer-bearing passages even when the words differ. That is an asymmetric task, not just generic semantic similarity. Many models look impressive on paraphrase tasks yet do worse on true query-to-passage retrieval, which is why you should test them on real query-document pairs instead of trusting a single benchmark headline."
      },
      {
        title: "Dimension, Storage, and Latency",
        content:
          "Higher-dimensional vectors can represent finer distinctions, but the storage and ANN cost scale linearly while quality gains usually do not. For most practical RAG systems, 768 to 1536 dimensions is the sweet spot. Above that, you should demand proof from domain evaluation that the extra memory is paying for itself.",
        diagram: asciiDiagram(`Dimension tradeoff at 1M chunks

Dim 384  -> raw about 1.5 GB  -> HNSW about 3 GB
Dim 768  -> raw about 3.1 GB  -> HNSW about 6 GB
Dim 1536 -> raw about 6.1 GB  -> HNSW about 12 GB
Dim 3072 -> raw about 12.3 GB -> HNSW about 25 GB

Rule: storage doubles immediately, quality rarely does`) 
      },
      {
        title: "MTEB Is a Shortlist Tool, Not a Deployment Decision",
        content:
          "MTEB is useful because it narrows the candidate set, but its composite score mixes many tasks that may not resemble your retrieval problem. Domain mismatch, binary relevance labels, and possible contamination all limit how directly you can use the ranking. The right workflow is simple: shortlist a few models from MTEB, then run Recall@10 and MRR on your own corpus before choosing."
      },
      {
        title: "Context Length, Multilingual Needs, and Domain Adaptation",
        content:
          "Always verify the model's maximum input length against your chunk size because silent truncation is a brutal failure mode. For multilingual corpora, remember that cross-lingual coverage usually lowers same-language quality relative to a monolingual specialist, so you must measure the tradeoff. And when the vocabulary is domain-specific, retriever fine-tuning with contrastive pairs often gives the highest ROI in the whole pipeline."
      },
      {
        title: "Changing Models Means Rebuilding the Index",
        content:
          "The embedding model is part of your index schema. Query vectors and document vectors must live in the same geometric space, so changing model family, checkpoint, normalization, or stored dimension means the old index becomes semantically incompatible. Treat a model swap as a planned rebuild event, not a quick config flip."
      }
    ],
    examples: [
      {
        title: "MTEB rank loses to domain fit",
        input:
          "Model A ranks higher on MTEB, but Model B was trained with biomedical text and wins the team's biomedical Recall@10 test.",
        output: "Choose Model B for the biomedical system.",
        explanation:
          "Step 1: Recognize that general benchmark rank is only a shortlist signal.\nStep 2: Compare models on the team's actual biomedical query-document pairs.\nStep 3: Model B retrieves the right medical passages more often despite the lower public rank.\nStep 4: Production selection follows domain evaluation, not the global leaderboard."
      },
      {
        title: "Silent truncation disaster",
        input:
          "Chunks are 800 tokens long but the embedding model only reads 512 input tokens.",
        output: "The final 288 tokens are invisible to semantic retrieval.",
        explanation:
          "Step 1: The model encodes only the prefix of each oversized chunk.\nStep 2: Facts appearing late in the chunk never enter the vector space.\nStep 3: The document store still shows the full text, which makes the bug hard to notice.\nStep 4: Fix by shrinking chunks or choosing a model with a longer input window."
      },
      {
        title: "MRL storage tradeoff",
        input:
          "An MRL-trained 1536-dimensional model is truncated to a 512-dimensional prefix for the ANN index.",
        output: "Storage drops roughly 3x with a modest Recall@10 loss.",
        explanation:
          "Step 1: MRL makes early dimensions carry the most important semantic signal.\nStep 2: Truncating to 512 dimensions shrinks raw vector storage to one third.\nStep 3: Recall drops somewhat, but usually far less than with naive truncation.\nStep 4: This is often the cleanest first move when index size becomes a real cost."
      }
    ],
    tips: [
      "Check chunk-size versus model context length before anything else.",
      "Shortlist with public benchmarks, select with your own eval set.",
      "Version the model ID, dimension, and normalization in index metadata."
    ],
    tricks: [
      "Lead with a procedure, not a model name, because model names go stale quickly.",
      "Mention MRL early when asked how to cut storage without rewriting the whole stack.",
      "Say explicitly that switching embed models requires a full rebuild; interviewers listen for that."
    ],
    memoryAids: [
      "MTEB is shortlist, not selection.",
      "Dimension is expensive certainty: more room, more bytes.",
      "Model change means map change, so redraw the whole index."
    ],
    interviewPatterns: [
      "Expect a walk me through embedding model selection question that rewards process over brand names.",
      "If retrieval is poor on legal or medical language, propose domain evaluation before prompt tweaks.",
      "Frequency and companies: Tier 2 to Tier 3 retrieval-infrastructure question, especially for ML platform and staff roles."
    ],
    practiceProblems: [
      "A multilingual legal corpus has English, French, and German queries with occasional cross-lingual needs. Answer: compute weighted Recall@10 across languages, choose the best multilingual or routed mix, and remember every future model change means a full re-embedding and rebuild.",
      "An 80M-chunk index is too large for budget. Answer: compare 1536-dimensional storage against 512-dimensional MRL truncation, then deploy the smaller prefix only if the measured recall drop is acceptable for the product's risk profile."
    ],
    faq: [
      {
        question: "Can I just pick the top MTEB model and move on?",
        answer:
          "Not safely. Public rankings are excellent for creating a shortlist, but deployment should follow your own query-document evaluation because domain vocabulary and task shape can overturn the public ordering completely."
      },
      {
        question: "Does higher dimension always mean better retrieval?",
        answer:
          "No. Quality gains taper while storage and latency keep rising. Once you are in a strong range like 768 to 1536 dimensions, the burden of proof shifts to evaluation rather than intuition."
      },
      {
        question: "When is retriever fine-tuning worth it?",
        answer:
          "It is worth it when the dominant problem is semantic mismatch between your users' queries and your domain vocabulary, and you can assemble enough positive and negative training pairs. In specialized domains, the uplift can be dramatic compared with changing prompts on the generator side."
      },
      {
        question: "What happens if query and document embeddings come from different models?",
        answer:
          "The scores become meaningless because the vectors are measured in different coordinate systems. The retrieval pipeline may still return something, but the numeric similarity no longer corresponds to semantic similarity in any reliable way."
      },
      {
        question: "How do I know a model is good enough for production?",
        answer:
          "Build a representative evaluation set, measure Recall@10 and MRR, and check that latency and context length fit your operational constraints. A model is production-worthy only when quality and operating cost both clear your real bar, not when it merely looks fashionable on a leaderboard."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Muennighoff et al. — MTEB (2023) - https://arxiv.org/abs/2210.07316",
        insight: "Explains what the benchmark really measures and why its composite score needs careful interpretation."
      },
      {
        source: "paper",
        attribution: "Kusupati et al. — Matryoshka Representation Learning (2022) - https://arxiv.org/abs/2205.13147",
        insight: "Foundation for prefix-dimension tradeoffs that cut storage without totally sacrificing retrieval quality."
      },
      {
        source: "blog",
        attribution: "Sentence-Transformers training overview - https://www.sbert.net/docs/training/overview.html",
        insight: "Practical toolkit reference for retriever fine-tuning and evaluation."
      }
    ]
  },
  {
    id: "topic-ai-rag-vector-databases",
    moduleId: "mod-ai-rag",
    title: "Vector Databases and ANN Indexing",
    intuition:
      "Exact nearest-neighbour search is perfectly correct and completely unaffordable once the corpus grows large enough. ANN systems win by giving up a little recall to buy huge gains in latency and scalability. Once you accept that trade, the whole design space becomes easier to reason about: every index choice is really a position on the triangle formed by recall, latency, and memory.",
    complexity: {
      time:
        "Exact search is linear in corpus size, so latency grows forever with N. HNSW and related ANN indexes turn retrieval into a much slower-growing search process, but query-time tuning still trades recall against latency, especially when filters force extra candidate expansion.",
      space:
        "ANN performance depends heavily on keeping vectors and graph structures resident in memory. Index memory therefore becomes the practical binding constraint, which is why quantization, reduced dimension, and alternative index families matter so much."
    },
    lesson: [
      {
        title: "Why Exact Search Stops Working",
        content:
          "The honest baseline is a for-loop over every vector, and for small corpora that is often the correct solution. But once you move into millions of vectors, exact cosine comparisons become too slow and scale badly with concurrency because the work is linear in corpus size. ANN exists because production retrieval only needs the right neighborhood quickly, not a mathematically perfect global ranking every single time.",
        diagram: asciiDiagram(`Exact versus approximate cost curve

query latency
    ▲
    │                                exact scan grows with corpus size
    │                             ╱
    │                          ╱
    │                       ╱
    │                    ╱
    │       HNSW stays much flatter
    │   ─────────────────────────────
    └──────────────────────────────────────────────────▶ corpus size
        100K          1M            10M

Trade: recall falls from 1.00 to something like 0.90 to 0.98`)
      },
      {
        title: "HNSW Is the Index You Will Actually Be Asked About",
        content:
          "HNSW builds a small-world graph where each vector is a node connected to near neighbours, plus a hierarchy of sparser upper layers that guide search into the right region quickly. Search enters high, makes large hops across the space, then refines in the dense bottom layer. The important operational distinction is among M, ef_construction, and efSearch: the first two are build-time choices, while efSearch is the live query-time dial you can turn during incidents without rebuilding the index."
      },
      {
        title: "Filtering and the Post-Filter Trap",
        content:
          "Metadata filters look simple until they become selective. If you retrieve top-200 globally and then post-filter to a tenant that owns only 0.05 percent of the corpus, you should expect almost no surviving results. At that point you need pre-filter-aware ANN, separate indexes for tiny subsets, or a tiered architecture that routes small tenants differently from large ones."
      },
      {
        title: "pgvector vs Purpose-Built Systems",
        content:
          "For many teams, pgvector is the right first answer because it keeps retrieval inside an existing PostgreSQL operational envelope. It becomes less attractive as corpus size, concurrency, hybrid search needs, or advanced filtering semantics increase. The senior answer is not to recite vendor names but to set thresholds, measure p95 latency under expected load, and graduate only when the measurements justify extra infrastructure."
      },
      {
        title: "When Memory Forces Different Index Families",
        content:
          "HNSW is superb for recall at moderate scale, but it becomes memory-hungry at very large corpus sizes. That is when you mention quantization, prefix-dimension storage, or IVF plus product quantization as ways to compress vectors aggressively and keep the system deployable. Each of those saves memory at the cost of some recall, which is why the recall-latency-memory triangle is such a useful interview frame."
      }
    ],
    examples: [
      {
        title: "SLA rescue by lowering efSearch",
        input:
          "A 10M-vector HNSW index breaches a 30ms p95 SLA after recent growth, but rebuilds take hours.",
        output: "Lower efSearch first and accept a measured recall drop if it stays above the product threshold.",
        explanation:
          "Step 1: Identify efSearch as the only live query-time tuning knob.\nStep 2: Lowering it reduces graph exploration work almost immediately.\nStep 3: Measure whether the resulting Recall@10 still clears the minimum product bar.\nStep 4: Only consider rebuilds later if ef tuning cannot satisfy both latency and quality."
      },
      {
        title: "Small-tenant post-filter disaster",
        input:
          "A shared index uses top-200 ANN then filters to a tenant holding 0.05 percent of all vectors.",
        output: "Most queries return zero useful hits unless the system retrieves an enormous candidate set.",
        explanation:
          "Step 1: Expected matches after post-filtering equal top_k times filter selectivity.\nStep 2: At 0.05 percent selectivity, top-200 yields about 0.1 expected survivors.\nStep 3: The fix is pre-filter-aware ANN or a separate tiny index for that tenant.\nStep 4: This is why selectivity matters more than abstract talk about filtering support."
      },
      {
        title: "pgvector wins at small scale",
        input:
          "An internal knowledge base has only 240,000 vectors and 200 queries per day.",
        output: "Use pgvector or even exact search rather than a dedicated vector service.",
        explanation:
          "Step 1: Size the corpus and query load honestly.\nStep 2: At this scale, memory and latency are comfortably inside standard database territory.\nStep 3: New infrastructure would add operational cost without solving a real bottleneck.\nStep 4: Measure later and only graduate if the measurements demand it."
      }
    ],
    tips: [
      "Keep build-time HNSW parameters separate from live query-time parameters in your explanation.",
      "Ask about filter selectivity before discussing multi-tenant ANN correctness.",
      "Measure pgvector before assuming you need a purpose-built vector database."
    ],
    tricks: [
      "Anchor the whole conversation to recall, latency, and memory immediately.",
      "Say efSearch is my incident knob because it signals operational maturity.",
      "Mention IVF plus PQ only when memory is genuinely the constraint, not as default name-dropping."
    ],
    memoryAids: [
      "HNSW buys recall and latency by spending memory.",
      "Only efSearch is live; M and ef_construction are baked in.",
      "Small selectivity breaks naive post-filtering."
    ],
    interviewPatterns: [
      "Expect a 50M-vector or multi-tenant vector-store architecture question.",
      "When asked which database, restate the requirements before picking a product class.",
      "Frequency and companies: Tier 2 system-design topic, common at retrieval-platform and infra-heavy AI teams."
    ],
    practiceProblems: [
      "A 15M-vector HNSW index at efSearch 128 misses a 25ms SLA but exceeds quality requirements. Answer: lower efSearch to around 64 first, estimate the new latency, then validate that Recall@10 stays above the required threshold before considering rebuilds.",
      "A SaaS platform has enterprise tenants with 500K vectors and starter tenants with 1K. Answer: dedicated indexes for the largest tenants, filtered shared infrastructure for medium ones, and tiny per-tenant exact or mini-ANN collections for the smallest, because one isolation strategy is inefficient across the whole distribution."
    ],
    faq: [
      {
        question: "What is the difference between M and ef_construction in HNSW?",
        answer:
          "M controls how many neighbors each node keeps, so it drives graph density and memory. ef_construction controls how hard the builder searches while wiring the graph, so it affects build quality and build time. Both are build-time decisions, unlike efSearch, which is query-time."
      },
      {
        question: "When should I use IVF plus PQ instead of HNSW?",
        answer:
          "Use it when corpus size makes raw-vector HNSW memory too expensive to keep resident. IVF plus PQ buys much lower memory at the cost of measurable recall loss and some tuning complexity, so it is a scale-driven choice rather than a default."
      },
      {
        question: "Is Postgres with pgvector really enough?",
        answer:
          "Often yes, especially below a few million vectors and at moderate concurrency. The main advantage is operational simplicity: one system for transactions, backups, security, and retrieval."
      },
      {
        question: "How do deletes affect HNSW quality over time?",
        answer:
          "Many implementations accumulate tombstones or soft deletes, which gradually hurt graph quality and sometimes latency. Periodic rebuilds are therefore a normal maintenance task, not a sign the index choice was wrong."
      },
      {
        question: "Why can filtering ruin ANN performance?",
        answer:
          "Because the graph was built over the full corpus, but a selective filter may discard almost every candidate the traversal finds. If too few valid vectors survive, the system has to search far wider or restructure how filtered retrieval is done."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Malkov and Yashunin — HNSW (2018) - https://arxiv.org/abs/1603.09320",
        insight: "Canonical source for the layered small-world graph design used in modern ANN search."
      },
      {
        source: "paper",
        attribution: "Johnson, Douze, and Jegou — Billion-scale similarity search with GPUs (2019) - https://arxiv.org/abs/1702.08734",
        insight: "Helpful reference for IVF and PQ when memory becomes the dominant scaling constraint."
      },
      {
        source: "blog",
        attribution: "pgvector project documentation - https://github.com/pgvector/pgvector",
        insight: "Practical reference for using vector retrieval inside PostgreSQL."
      }
    ]
  },
  {
    id: "topic-ai-rag-hybrid-search",
    moduleId: "mod-ai-rag",
    title: "Hybrid Search: BM25 + Dense Vector Fusion",
    intuition:
      "Dense retrieval and keyword retrieval fail in opposite ways. Dense search understands meaning and paraphrase, but it misses exact strings such as part numbers, function names, and rare tokens. BM25 finds exact lexical matches instantly, but it misses semantic cousins. Hybrid search works because it lets two imperfect retrievers cover each other's blind spots, then fuses their ranked outputs into a stronger candidate set with almost no extra user-visible latency.",
    complexity: {
      time:
        "Dense ANN search and BM25 search should run in parallel, so total online latency is usually close to the slower of the two rather than the sum. Fusion itself is tiny compared with retrieval and reranking, but maintaining two indexes adds extra offline update work whenever the corpus changes.",
      space:
        "Hybrid search stores both a dense index and a sparse inverted index. That usually increases storage moderately rather than catastrophically, and the quality lift is often worth it for technical corpora with lots of exact identifiers."
    },
    lesson: [
      {
        title: "Why Dense Search Alone Has Blind Spots",
        content:
          "Dense embeddings are excellent when the user's words and the document's words differ but the meaning is close. They are much weaker on rare identifiers, version strings, SKU codes, and dotted API names because those tokens may have poor learned representations. In those cases the retriever knows the topic but misses the exact thing. BM25 exists to cover exactly that gap.",
        diagram: asciiDiagram(`Dense and BM25 complement each other

Query: automobile fuel efficiency
Dense  -> finds car mileage docs
BM25   -> misses if words differ

Query: torch.nn.CrossEntropyLoss gradient
Dense  -> may drift to general loss docs
BM25   -> exact token match wins

Query: SKU-4821 return policy
Dense  -> rare code is weak in vector space
BM25   -> exact match retrieves the SKU page`)
      },
      {
        title: "BM25 Still Matters",
        content:
          "BM25 scores documents from term frequency, inverse document frequency, and length normalization. It is fast, interpretable, and brutally effective for exact-match retrieval. That makes it especially valuable in code, APIs, product catalogs, legal citations, and business documents full of rare named entities."
      },
      {
        title: "Reciprocal Rank Fusion",
        content:
          "RRF is the standard way to merge dense and sparse results because it works on ranks rather than raw scores. That matters because cosine similarities and BM25 scores live on incompatible numeric scales. With RRF you simply reward documents that rank highly in either list, and reward them even more when they rank well in both. The famous default smoothing constant is 60, and you should treat it as the default unless a large labeled eval says otherwise."
      },
      {
        title: "Learned Sparse Retrieval and SPLADE",
        content:
          "SPLADE is a neural sparse retriever that expands vocabulary while still living in inverted-index infrastructure. It acts like BM25 with a semantic vocabulary brain, which makes it interesting for organizations already standardized on search stacks such as Lucene or Elasticsearch. But it is not a free lunch: it adds model inference at index and query time, so the simple dense-plus-BM25 hybrid remains the default for most teams."
      },
      {
        title: "Operational Design",
        content:
          "The dense and sparse indexes must stay in sync across document create, update, and delete events. At query time they should execute concurrently, then feed their merged list into reranking. The mistake to avoid is treating hybrid search as a substitute for reranking; in a mature pipeline they solve different problems, with hybrid search widening recall and reranking sharpening precision."
      }
    ],
    examples: [
      {
        title: "Dense misses a PyTorch symbol",
        input:
          "Query: torch.nn.CrossEntropyLoss with class weights; dense retrieval returns only general loss-function docs.",
        output: "Hybrid retrieval promotes the exact API page to rank 1.",
        explanation:
          "Step 1: Dense search understands the topic loss functions but not the rare dotted symbol precisely enough.\nStep 2: BM25 sees the exact token CrossEntropyLoss and ranks the API page first.\nStep 3: RRF rewards the document for strong sparse rank plus moderate dense rank.\nStep 4: The correct API page becomes the top candidate with little added latency."
      },
      {
        title: "Manual RRF scoring",
        input:
          "Dense ranks doc_A, doc_B, doc_C while BM25 ranks doc_C, doc_A, doc_D with k = 60.",
        output: "doc_A and doc_C dominate the fused ranking because each ranks highly in the combined evidence.",
        explanation:
          "Step 1: Convert each rank into one divided by sixty plus rank.\nStep 2: Sum contributions across the ranked lists for every document.\nStep 3: doc_A gets credit from dense rank 1 and sparse rank 2, while doc_C gets credit from dense rank 3 and sparse rank 1.\nStep 4: Documents with support from two retrievers usually beat documents seen by only one."
      },
      {
        title: "Hybrid saves a SKU lookup",
        input:
          "Query: specs for part number XR-4472-B; dense search finds nothing useful.",
        output: "BM25 finds the exact spec sheet and hybrid retrieval rescues the query.",
        explanation:
          "Step 1: The part number is a rare exact token rather than a rich semantic phrase.\nStep 2: BM25 retrieves the matching spec sheet immediately from the inverted index.\nStep 3: Fusion keeps that result even if dense retrieval contributes little.\nStep 4: The user sees a correct exact-match answer instead of a semantic near miss."
      }
    ],
    tips: [
      "Run dense and sparse retrieval in parallel, never sequentially.",
      "Default to RRF with k = 60 before trying fragile score normalization schemes.",
      "Prioritize hybrid search for corpora containing identifiers, names, citations, and product codes."
    ],
    tricks: [
      "Say dense for meaning and sparse for spelling to explain the design fast.",
      "If asked about weighting dense versus BM25, start with RRF because it avoids score-scale headaches.",
      "Mention SPLADE as the advanced sparse option, not as the baseline."
    ],
    memoryAids: [
      "Dense equals meaning; sparse equals exact words.",
      "RRF is voting by rank, not by incompatible scores.",
      "Hybrid search improves recall, reranking improves precision."
    ],
    interviewPatterns: [
      "Expect why dense search alone is not enough once the interviewer moves beyond basic RAG.",
      "Be ready to compute or explain the RRF formula on a whiteboard.",
      "Frequency and companies: Tier 2 question that appears often in search-heavy product interviews and teams with existing Elasticsearch infrastructure."
    ],
    practiceProblems: [
      "Your system already uses pgvector and needs exact-match retrieval for SKUs without a new service. Answer: add a tsvector or equivalent full-text index in Postgres, run pgvector ANN and BM25-style search in parallel, then fuse in application code with RRF.",
      "A legal corpus misses paraphrases with BM25 but the company is committed to inverted-index infrastructure. Answer: evaluate SPLADE as the sparse retriever, then still consider fusing it with dense retrieval if the highest recall is required."
    ],
    faq: [
      {
        question: "Why does BM25 fail on semantic queries?",
        answer:
          "Because BM25 only understands token overlap, not meaning. If the query says vehicle malfunction and the document says car breakdown, lexical scoring does not know those are related unless some expanded sparse representation or dense retriever helps bridge the gap."
      },
      {
        question: "Why is k = 60 used in RRF?",
        answer:
          "It is the durable empirical default from the original RRF work. The constant smooths the influence of top ranks so one retriever's rank-1 result does not overpower every other signal, while still preserving the intuition that earlier ranks matter more."
      },
      {
        question: "Should I use SPLADE instead of BM25?",
        answer:
          "Start with BM25 because it is simpler, faster, and almost free operationally. Move to SPLADE when vocabulary expansion inside sparse infrastructure matters enough to justify neural inference at both index and query time."
      },
      {
        question: "Does every vector database support hybrid natively?",
        answer:
          "No, and support changes over time, which is why application-layer fusion is a safe design. Native features are convenient, but your conceptual pipeline should not depend on one vendor's current product surface."
      },
      {
        question: "How much does hybrid usually help?",
        answer:
          "It depends on the corpus, but technical and identifier-heavy corpora often see meaningful Recall@10 improvements because exact-match failures disappear. Narrative corpora with few rare tokens may see much smaller gains, so measurement on your own query set remains essential."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Cormack, Clarke, and Buettcher — Reciprocal Rank Fusion (2009) - https://dl.acm.org/doi/10.1145/1571941.1572114",
        insight: "Foundational source for the standard rank-fusion formula and default constant."
      },
      {
        source: "paper",
        attribution: "Formal et al. — SPLADE (2021) - https://arxiv.org/abs/2107.05720",
        insight: "Explains learned sparse retrieval and vocabulary expansion."
      },
      {
        source: "blog",
        attribution: "Anthropic — Introducing Contextual Retrieval (2024) - https://www.anthropic.com/news/contextual-retrieval",
        insight: "Useful practitioner evidence that sparse plus dense retrieval materially reduces failure cases."
      }
    ]
  },
  {
    id: "topic-ai-rag-reranking",
    moduleId: "mod-ai-rag",
    title: "Re-Ranking: Cross-Encoders, ColBERT, and the Retrieval Funnel",
    intuition:
      "First-stage retrieval gets you into the right neighborhood. Reranking gets you to the right house. ANN and hybrid retrieval are optimized for cheap recall over a large candidate set, but their ordering is still coarse because they judge relevance through compressed representations. A reranker spends more compute on a much smaller list so the best evidence arrives first, which is exactly what the generator needs.",
    complexity: {
      time:
        "Reranking adds a query-time cost that scales roughly with candidate count times per-pair scoring cost. Cross-encoders are usually the default quality choice, ColBERT trades some quality for speed with precomputed document token vectors, and LLM rerankers push quality highest at the greatest latency and cost.",
      space:
        "Cross-encoders store model weights but no per-document auxiliary state beyond the retrieved text. ColBERT stores much more document-side token representation state, buying speed later by spending more index-side storage upfront."
    },
    lesson: [
      {
        title: "Why Reranking Exists",
        content:
          "The retriever is judged mainly by whether it includes relevant chunks somewhere in the candidate set. The reranker is judged by whether it puts the most useful chunk first. This funnel pattern matters because the generator sees only a few chunks, so ranking quality inside that tiny top slice often matters more than recall deeper down the list.",
        diagram: asciiDiagram(`Reranking funnel

10,000,000 chunks
        |
        v  ANN or hybrid retrieval
     top-100 candidates
        |
        v  reranker
      top-10 candidates
        |
        v  context assembly
      3 to 5 chunks reach the generator`)
      },
      {
        title: "Cross-Encoders",
        content:
          "A cross-encoder reads the query and one candidate passage together, which lets it attend to exact phrase relationships, negation, and intent in ways a bi-encoder cannot. That makes it the standard reranking choice when quality matters. The downside is obvious: you pay one forward pass per query-document pair, so latency rises linearly with the number of candidates."
      },
      {
        title: "ColBERT and Late Interaction",
        content:
          "ColBERT keeps token-level matching power while still allowing document-side precomputation. Instead of one vector per document, it stores token vectors and scores with a MaxSim operation. That gives better expressivity than a bi-encoder and much better latency than a full cross-encoder over large candidate sets, at the cost of higher document storage."
      },
      {
        title: "LLM Rerankers and Premium Accuracy",
        content:
          "LLM rerankers can operate pointwise, pairwise, or listwise and often produce the best semantic judgments, especially in subtle domains such as law. But they are slow and expensive compared with dedicated rerankers, so they are better treated as premium mode, quality ceiling, or evaluation baseline rather than the default for every query."
      },
      {
        title: "Context Ordering After Reranking",
        content:
          "Reranking does not finish when scores are computed. The top chunks still need to be assembled into a prompt, and position bias inside long contexts matters. Because models attend best to the beginning and end of context, the best chunk should usually go first and the second-best chunk often belongs last as a bookend."
      }
    ],
    examples: [
      {
        title: "False positive demoted",
        input:
          "BM25 ranks a privacy policy above the actual password-reset help article for the query How do I reset my password?.",
        output: "A cross-encoder reranker moves the help article to rank 1.",
        explanation:
          "Step 1: BM25 sees lexical overlap on password and reset in both passages.\nStep 2: The cross-encoder reads each passage jointly with the query.\nStep 3: It recognizes that one passage is procedural while the other is policy language.\nStep 4: The how-to article becomes the top context chunk and answer quality improves."
      },
      {
        title: "ColBERT under a strict latency budget",
        input:
          "A product must rerank 200 candidates under 50ms p95, but a CPU cross-encoder would take about 160ms.",
        output: "Use ColBERT or move cross-encoding to GPU; do not pretend the CPU cross-encoder fits.",
        explanation:
          "Step 1: Multiply candidate count by cross-encoder per-pair latency and compare with the SLA.\nStep 2: The math shows the baseline cross-encoder is too slow.\nStep 3: ColBERT shifts more work offline by precomputing document token vectors.\nStep 4: That latency trade may be worth the extra index storage."
      },
      {
        title: "LLM reranker for legal search",
        input:
          "A legal product needs top-tier relevance and can tolerate a two-second reranking step.",
        output: "Listwise LLM reranking becomes a defensible premium choice.",
        explanation:
          "Step 1: Note the unusually loose latency budget and unusually high accuracy requirement.\nStep 2: An LLM can reason about subtle clause equivalence that simpler rerankers may miss.\nStep 3: Because candidate count is small, one listwise prompt is feasible.\nStep 4: The architecture is acceptable precisely because the product values quality over speed."
      }
    ],
    tips: [
      "Frame reranking as precision optimization inside a retrieval funnel.",
      "Use cross-encoders by default unless latency math clearly rules them out.",
      "Deduplicate overlapping chunks before prompt assembly so reranking gains are not wasted."
    ],
    tricks: [
      "State candidate counts at each stage; concrete funnels sound much more senior than vague prose.",
      "Mention GPU availability because it can completely change the reranker choice.",
      "If the reranker helps metrics but hurts answers, inspect context ordering and diversity next."
    ],
    memoryAids: [
      "Retrieval is recall; reranking is precision.",
      "Cross-encoder sees the relationship, bi-encoder sees each side separately.",
      "Bookend the context with the best evidence."
    ],
    interviewPatterns: [
      "Expect why rerank if retrieval is already good questions.",
      "Be ready to explain cross-encoder versus ColBERT in storage and latency terms.",
      "Frequency and companies: Tier 2 retrieval-quality topic, especially for search products and staff interviews."
    ],
    practiceProblems: [
      "You have a two-second end-to-end budget, ANN plus BM25 costs 30ms, and generation streams at 400ms TTFT. Answer: allocate the remaining reranker budget explicitly, compare available models by per-candidate or flat-call latency, and pick the highest-quality option that fits with headroom.",
      "After adding reranking, NDCG rises but RAG answer quality falls. Answer: check whether context ordering caused Lost-in-the-Middle, whether the top chunks lost diversity, and whether too few chunks now reach the LLM."
    ],
    faq: [
      {
        question: "Is reranking always worth it?",
        answer:
          "For most production RAG systems, yes, because it often produces a meaningful improvement in the quality of the few chunks that matter most. The main exceptions are very tight latency budgets or tiny corpora where first-stage retrieval is already effectively exact."
      },
      {
        question: "How many candidates should I send to the reranker?",
        answer:
          "Usually somewhere between twenty and one hundred. Below that, recall can collapse because the right chunk never reaches the reranker; above that, latency rises faster than quality."
      },
      {
        question: "When should I choose ColBERT?",
        answer:
          "Choose it when cross-encoder quality is attractive but repeated per-pair inference is too expensive for your latency target. ColBERT spends more storage on document token vectors so that online scoring can stay fast."
      },
      {
        question: "What is RankGPT?",
        answer:
          "It is the idea of using a large language model as a listwise reranker. That can be surprisingly strong in zero-shot settings, but it is far slower and more expensive than a dedicated cross-encoder."
      },
      {
        question: "How do I prove the reranker is helping?",
        answer:
          "Measure ranking metrics such as MRR or nDCG before and after reranking, then validate the end-to-end impact on grounded answer quality. If metric gains do not translate into better answers, the problem may lie in context assembly or prompt usage rather than ranking itself."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Nogueira and Cho — Passage Re-ranking with BERT (2019) - https://arxiv.org/abs/1901.04085",
        insight: "Classic foundation for the retrieve-then-rerank pattern using cross-encoders."
      },
      {
        source: "paper",
        attribution: "Khattab and Zaharia — ColBERT (2020) - https://arxiv.org/abs/2004.12832",
        insight: "Key reference for late interaction reranking."
      },
      {
        source: "paper",
        attribution: "Sun et al. — RankGPT (2023) - https://arxiv.org/abs/2304.09542",
        insight: "Shows how LLMs can act as effective listwise rerankers."
      }
    ]
  },
  {
    id: "topic-ai-rag-query-rewriting",
    moduleId: "mod-ai-rag",
    title: "Query Rewriting and Expansion for Retrieval",
    intuition:
      "A retriever can only work with the query it receives, and users are terrible at speaking in retrieval-optimal language. They ask vague, underspecified, conversational, or multi-part questions, while the answer lives in a document written with different vocabulary and more explicit context. Query rewriting exists to bridge that gap by turning user intent into one or more better search queries before retrieval starts.",
    complexity: {
      time:
        "Every rewriting technique adds query-time cost, usually one or more cheap LLM calls plus additional retrieval passes. The engineering goal is not to apply all techniques always, but to route query types to the cheapest rewriting strategy that materially improves Recall@10.",
      space:
        "Query rewriting itself adds little persistent storage, but more rewritten queries can produce larger candidate sets and more traces to log. The real cost is extra compute and the need to evaluate routing rules over time."
    },
    lesson: [
      {
        title: "The Query-Document Vocabulary Gap",
        content:
          "Users ask for how to make my code faster while the relevant document says profiling and vectorization techniques. Embeddings bridge some of that gap, but short, vague, or domain-naive questions still underperform. Query rewriting is therefore an evidence-generation step for retrieval, not a cosmetic prompt trick.",
        diagram: asciiDiagram(`User wording versus document wording

User query: how do I make my code faster
        │
        ├── direct retrieval may be vague
        │
        └── rewritten queries:
            ├── python performance optimization
            ├── profiling slow code
            ├── vectorization techniques
            └── query plan analysis`)
      },
      {
        title: "Multi-Query Retrieval",
        content:
          "Multi-query retrieval generates several alternative phrasings and retrieves with all of them, then fuses the results. It is especially good for vague questions because different phrasings expose different lexical and semantic hooks into the corpus. The tradeoff is predictable: more retrieval breadth for more latency and cost."
      },
      {
        title: "HyDE",
        content:
          "HyDE asks the LLM to imagine a plausible answer, embeds that hypothetical answer, and uses it as the retrieval vector. This helps when the user lacks the vocabulary used in the corpus, such as a beginner asking about concurrency while the document talks about mutexes and atomics. But HyDE can also hallucinate an answer that drags retrieval toward the wrong neighborhood, so direct retrieval should remain an easy fallback."
      },
      {
        title: "Step-Back Prompting and Decomposition",
        content:
          "Step-back prompting zooms out to a broader framing when the original question is too specific to match document titles well. Query decomposition splits multi-part questions into sub-questions so each can retrieve its own evidence, which is much better than asking one embedding vector to represent several different information needs at once."
      },
      {
        title: "Conversational Rewriting and Routing",
        content:
          "Chat UIs make queries context-dependent by default. What about the refund policy is not retrievable until the system rewrites it into a standalone form by carrying forward the entity from earlier turns. Mature systems combine routing with rewriting: conversational rewrite first for chat, decomposition for compound queries, HyDE for vocabulary mismatch, and multi-query for ambiguity."
      }
    ],
    examples: [
      {
        title: "HyDE rescues a C++ question",
        input:
          "A Python developer asks how to avoid data races in concurrent C++ code, but the corpus uses terms like std::mutex and std::lock_guard.",
        output: "HyDE generates a mutex-flavored hypothetical answer and retrieval improves dramatically.",
        explanation:
          "Step 1: The raw question and the target documents use noticeably different vocabulary.\nStep 2: HyDE asks the LLM to imagine what a correct answer would sound like.\nStep 3: That hypothetical includes words like mutex and atomic, which live much nearer the real C++ docs in embedding space.\nStep 4: The correct concurrency material now surfaces in the candidate set."
      },
      {
        title: "Conversational rewrite prevents context collapse",
        input:
          "Turn 1 mentions the Premium plan; turn 2 asks only What about the refund policy?.",
        output: "The system rewrites the query as What is the refund policy for the Premium plan? and retrieves the right clause.",
        explanation:
          "Step 1: The second-turn question is too generic if retrieved literally.\nStep 2: The rewriter carries forward the entity from recent chat history.\nStep 3: Retrieval now targets the Premium-specific section instead of generic refund FAQs.\nStep 4: A tiny rewrite step prevents a full answer failure."
      },
      {
        title: "Compound question decomposed",
        input:
          "The user asks for both architectural benefits and operational challenges of HNSW versus IVF.",
        output: "The system splits the request into several narrower sub-questions and retrieves evidence for each.",
        explanation:
          "Step 1: One query mixes architectures, tradeoffs, and operations into a single embedding target.\nStep 2: Decomposition separates benefits and challenges for each index family.\nStep 3: Each sub-question retrieves more focused supporting passages.\nStep 4: Final synthesis happens only after evidence is collected for the pieces."
      }
    ],
    tips: [
      "Conversational rewriting is usually the highest-ROI first addition in chat products.",
      "Use small cheap models for rewriting because the task is simple and frequent.",
      "Measure recall gains per technique so routing rules stay justified instead of cargo-culted."
    ],
    tricks: [
      "Describe HyDE as imagine the answer before you search for it; interviewers remember that phrasing.",
      "Route by query type instead of stacking every technique onto every request.",
      "Keep direct retrieval as a fallback whenever HyDE or aggressive rewriting might hallucinate intent."
    ],
    memoryAids: [
      "Multi-query asks the same question several ways.",
      "Step-back means zoom out before zooming in.",
      "Conversational rewriting translates pronouns into actual entities."
    ],
    interviewPatterns: [
      "Expect vague-query and multi-turn debugging questions here.",
      "Be ready to compare multi-query against HyDE rather than treating them as synonyms.",
      "Frequency and companies: Tier 2 improvement topic for mature RAG interviews, especially on chat assistants."
    ],
    practiceProblems: [
      "Given maximum file size with no context, answer: use multi-query or clarification because the question is underspecified and could mean uploads, attachments, or storage limits.",
      "Given And what about enterprise pricing? as turn three of a product chat, answer: conversational rewriting comes first because the retrieval failure is missing entity context, not missing synonyms."
    ],
    faq: [
      {
        question: "Does HyDE always beat direct embedding?",
        answer:
          "No. It helps most when users lack the corpus vocabulary, but it can hurt when the hypothetical answer hallucinates specifics or when the raw query already matches the documents well. That is why side-by-side evaluation and fallback paths matter."
      },
      {
        question: "How many alternative queries should I generate?",
        answer:
          "Usually three to five. Fewer than that often underexplores the space, while many more add latency and noise faster than they add useful recall."
      },
      {
        question: "What is the difference between multi-query and HyDE?",
        answer:
          "Multi-query generates several alternative questions. HyDE generates a hypothetical answer and retrieves against that answer-like text. They solve related but distinct vocabulary-gap problems and can be combined when measurement supports it."
      },
      {
        question: "Can query rewriting create security issues?",
        answer:
          "Yes. Any LLM-based rewrite stage can be prompt-injected or can leak unintended scope if it is given too much authority. Keep it low privilege, constrain its output format, and validate what it produces before using it for retrieval."
      },
      {
        question: "When should I decompose instead of rewrite?",
        answer:
          "Decompose when one user message clearly asks multiple separable questions that need distinct evidence. Rewrite when the question is conceptually single but poorly phrased, vague, or dependent on conversational context."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Gao et al. — HyDE (2022) - https://arxiv.org/abs/2212.10496",
        insight: "Key source for hypothetical-document retrieval as a zero-shot technique."
      },
      {
        source: "paper",
        attribution: "Zheng et al. — Step-Back Prompting (2023) - https://arxiv.org/abs/2310.06117",
        insight: "Explains broader-question retrieval support for specific reasoning tasks."
      },
      {
        source: "blog",
        attribution: "LangChain history-aware retrieval tutorial - https://python.langchain.com/docs/tutorials/qa_chat_history/",
        insight: "Concrete reference for conversational query rewriting patterns."
      }
    ]
  },
  {
    id: "topic-ai-rag-evaluating-quality",
    moduleId: "mod-ai-rag",
    title: "Evaluating RAG Quality: Retrieval Metrics, RAGAS, and Golden Sets",
    intuition:
      "RAG systems are impossible to improve if you only look at one vague notion of answer quality. A wrong answer can come from missing ingestion, bad chunking, weak embeddings, a poor reranker, noisy context assembly, or an ungrounded generator. Good evaluation separates those failure modes, measures them with the right metrics, and ties the whole process to a stable golden set so changes can be tested instead of guessed.",
    complexity: {
      time:
        "Evaluation adds offline batch cost rather than user-facing latency, though some automated judges use expensive LLM calls. The real cost is recurring because every meaningful retrieval or prompt change should be checked against a baseline set before deployment.",
      space:
        "The persistent assets are the golden set itself, traces, labels, and metric history. Storage is tiny compared with the index, but the operational value is enormous because these artifacts become your regression suite for retrieval quality."
    },
    lesson: [
      {
        title: "Component-Wise Evaluation Beats One End-to-End Score",
        content:
          "One answer-quality number is emotionally satisfying and operationally useless. If the score drops, you still do not know whether the problem sits in retrieval, reranking, context assembly, or generation. The right evaluation stack moves from bottom to top: first measure whether the right chunks were found, then whether they were ranked well, then whether the generator stayed faithful to them, and finally whether the whole answer satisfied the user task.",
        diagram: asciiDiagram(`Evaluation pyramid

answer quality
      |
generation: faithfulness and answer relevance
      |
context quality and ranking
      |
retrieval: recall, precision, MRR

Fix lower layers first`)
      },
      {
        title: "Retrieval Metrics",
        content:
          "Recall@k tells you whether relevant chunks were found at all and is the most important retrieval metric because a missed chunk cannot be rescued later. Precision@k tells you how noisy the context is. MRR tells you whether the first relevant chunk is near the top. nDCG becomes valuable when relevance is graded rather than binary, because some chunks are better evidence than others even when both are technically relevant."
      },
      {
        title: "Generation Metrics",
        content:
          "Faithfulness measures whether answer claims are actually supported by the retrieved context. Answer relevance measures whether the answer addressed the user's question rather than drifting to some nearby topic. Context precision and context recall bridge retrieval and generation by asking whether the supplied context was both relevant and sufficient."
      },
      {
        title: "Automated Judges: RAGAS and Friends",
        content:
          "RAGAS automates several of these metrics with an LLM judge and is a good first evaluation framework because it lets teams score faithfulness, answer relevance, and context quality without inventing everything from scratch. But LLM-as-judge has bias, cost, and imperfect agreement with humans, so it should be treated as a fast measurement layer, not infallible ground truth."
      },
      {
        title: "Golden Sets and CI",
        content:
          "A golden set is the backbone of disciplined RAG work. Start with a small, carefully curated set of representative queries, annotate the right answer and relevant chunks, version the set like source code, and grow it with real production failures. Then run it automatically on any change to chunking, embedding, ranking, or prompting so retrieval regressions are caught before users do the catching for you."
      }
    ],
    examples: [
      {
        title: "Manual Recall@5 and MRR",
        input:
          "Relevant chunks are 42, 43, and 101. Retrieved top-5 are 15, 42, 88, 43, and 77.",
        output: "Recall@5 = 0.667, Precision@5 = 0.4, and MRR = 0.5.",
        explanation:
          "Step 1: Two of the three relevant chunks appear in the top five, so Recall@5 is two thirds.\nStep 2: Two of the five retrieved chunks are relevant, so Precision@5 is two fifths.\nStep 3: The first relevant chunk appears at rank 2, so reciprocal rank is one half.\nStep 4: The diagnosis is not total failure, but one missing chunk and a noisy candidate set."
      },
      {
        title: "Low faithfulness with high retrieval recall",
        input:
          "Recall@10 is strong at 0.89, but RAGAS faithfulness is only 0.42.",
        output: "The generator is not staying grounded; fix prompting or post-generation checks before touching retrieval.",
        explanation:
          "Step 1: High retrieval recall says the system usually finds the right evidence.\nStep 2: Low faithfulness says the final answer invents or distorts claims anyway.\nStep 3: That points to grounding instructions, context use, or citation verification rather than chunking.\nStep 4: Re-run after prompt repair to ensure faithfulness rises before other changes are made."
      },
      {
        title: "Building a first golden set",
        input:
          "A new e-commerce support assistant has no labeled data but does have a query log.",
        output: "Sample representative questions, annotate relevant chunks, and version the set immediately.",
        explanation:
          "Step 1: Stratify the query log by topic and difficulty so the sample reflects real usage.\nStep 2: For each query, annotate the correct answer and the chunk IDs that contain it.\nStep 3: Keep the first set small but high quality, such as 50 to 100 queries.\nStep 4: Add failure cases from production every sprint so the golden set matures with the product."
      }
    ],
    tips: [
      "Measure retrieval recall before trying to improve the generator.",
      "Keep retrieval and generation metrics separate so fixes stay targeted.",
      "Treat the golden set like code: version it, review it, and grow it deliberately."
    ],
    tricks: [
      "If faithfulness is low, look at grounding; if MRR is low, look at ranking; if Recall@10 is low, look at retrieval and chunking.",
      "Fifty excellent eval examples are worth more than thousands of weak synthetic ones.",
      "Automate regression checks in CI so evaluation is habitual rather than ceremonial."
    ],
    memoryAids: [
      "Recall asks did we find it, MRR asks did we put it first.",
      "Faithfulness means no unsupported claims.",
      "Golden set means regression suite for RAG."
    ],
    interviewPatterns: [
      "Expect a how would you evaluate a RAG system question at senior levels.",
      "Be ready to distinguish faithfulness from answer relevance cleanly.",
      "Frequency and companies: Tier 2 to Tier 3 maturity signal, especially at companies that already run production RAG."
    ],
    practiceProblems: [
      "Compute nDCG@3 when graded relevance is A=3, B=1, D=2 and the retrieved list begins with an irrelevant item. Answer: calculate DCG from the observed order, calculate ideal DCG from the sorted grades, divide, and explain that early irrelevant items are heavily penalized.",
      "Design an evaluation plan for a brand-new internal RAG assistant. Answer: create a starter golden set, instrument traces, track Recall@10 and MRR first, then add faithfulness and answer relevance via RAGAS or a similar judge, and finally wire the whole check into CI."
    ],
    faq: [
      {
        question: "What is the difference between faithfulness and groundedness?",
        answer:
          "In practice they are near synonyms. Both ask whether the answer is supported by the retrieved evidence, though some tools use slightly different wording or bundle citation accuracy into one term more explicitly than the other."
      },
      {
        question: "Should I use RAGAS, TruLens, or custom evaluation?",
        answer:
          "RAGAS is a strong starting point, TruLens is another structured option, and custom evaluation becomes important when your domain needs specialized human criteria. Most teams sensibly begin with an existing framework and layer domain-specific checks on top later."
      },
      {
        question: "How large should a golden set be?",
        answer:
          "Start smaller than people expect and make it excellent. Fifty well-annotated examples can already catch meaningful regressions, and the set can grow to hundreds over time as production failures reveal new edge cases."
      },
      {
        question: "Why can users still complain when faithfulness is high?",
        answer:
          "Because a model can be faithfully wrong if the retrieved context itself was wrong, incomplete, or outdated. High faithfulness tells you the model respected the evidence it saw, not that the evidence was the right evidence."
      },
      {
        question: "What are the biases of LLM-as-judge?",
        answer:
          "Judge models can prefer longer answers, favor their own style, or miss domain-specific mistakes that experts would spot immediately. That is why periodic human review is still necessary, especially in regulated or safety-critical applications."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Es et al. — RAGAS (2023) - https://arxiv.org/abs/2309.15217",
        insight: "Foundational framework for automated faithfulness and answer-relevance evaluation in RAG."
      },
      {
        source: "blog",
        attribution: "Hamel Husain — Your AI Product Needs Evals (2024) - https://hamel.dev/blog/posts/evals/index.html",
        insight: "Excellent practitioner guide to golden sets and evaluation discipline."
      },
      {
        source: "blog",
        attribution: "Jason Liu — Systematically Improving Your RAG (2024) - https://jxnl.co/writing/2024/05/22/systematically-improving-your-rag/",
        insight: "Strong bottom-up diagnostic framing for improving component quality."
      }
    ]
  },
  {
    id: "topic-ai-rag-failure-modes",
    moduleId: "mod-ai-rag",
    title: "Common RAG Failure Modes: Diagnosis, Root Causes, and Mitigations",
    intuition:
      "RAG failures are not random. They leave fingerprints in the combination of retrieved context, rankings, timestamps, and answer behavior. Once you learn the common failure modes and a consistent debugging flow, wrong answers stop feeling mysterious and start feeling mechanical: either the knowledge was never indexed, it was retrieved badly, it was filtered out, it was buried in context, or the model used it poorly.",
    complexity: {
      time:
        "Failure analysis is an offline debugging activity, but the fixes often change either ingest throughput or per-query latency. Some mitigations, such as better prompts or citation verification, are cheap to add online; others, such as re-chunking or changing embeddings, require costly re-indexing.",
      space:
        "The core storage need is observability: traces, retrieved chunk IDs, timestamps, and source metadata. Without those artifacts the team lacks the evidence required to separate stale-index failures from ranking failures or citation hallucinations."
    },
    lesson: [
      {
        title: "Missing Content and Stale Index",
        content:
          "Sometimes the answer is simply not in the indexed corpus at all. That is a missing-content failure and the retriever cannot recover from it. A closely related but more deceptive issue is stale indexing, where the right document exists in the source of truth but the index still contains an old version. Both look like model incompetence to end users, but the real fix is ingestion discipline and freshness monitoring."
      },
      {
        title: "Top-k Truncation and Lost in the Middle",
        content:
          "A chunk can be retrieved correctly and still fail to help if the reranker or top-k cutoff drops it before generation. Even if it reaches the prompt, its position can still doom it if the chunk lands in the middle of a long context window and the model under-attends there. These are context-assembly problems, not embedding problems."
      },
      {
        title: "Chunk Boundary Destruction and Domain Mismatch",
        content:
          "Structural chunking bugs create broken evidence units, while embedding-domain mismatch creates semantically weak retrieval even when chunks are structurally fine. Both show up as low recall, but the repair path differs: one demands better splitting, the other better retrieval representations or hybrid search."
      },
      {
        title: "Conflicting Sources and Citation Hallucination",
        content:
          "Corpora often contain multiple versions of the truth, and generators are perfectly capable of blending them into a plausible but wrong synthesis. Separate from that, citation hallucination happens when the model invents or misattributes sources. The right fixes involve metadata, prompt instructions, and verification logic rather than just better prompting in the vague sense."
      },
      {
        title: "A Reliable Diagnostic Flow",
        content:
          "Debugging becomes easy when you ask the same questions in the same order. Was the content indexed at all? Was the correct chunk in the retriever's candidate set? Did the reranker keep it? Did it reach context? Did the model actually use it? Did the citations point to the right chunk? Each no maps to a different fix, which is why this flowchart is one of the most impressive interview answers in the module.",
        diagram: asciiDiagram(`RAG diagnosis flow

Wrong or missing answer
        │
        ├── In index at all?
        │      └── No  ──▶  fix ingestion or freshness
        │
        ├── In ANN or hybrid top-k?
        │      └── No  ──▶  fix retrieval, chunking, embeddings, or hybrid search
        │
        ├── In reranker top slice?
        │      └── No  ──▶  fix reranker or cutoff
        │
        ├── In final context?
        │      └── No  ──▶  fix context budget or assembly
        │
        ├── Used by the model?
        │      └── No  ──▶  fix ordering or grounding prompt
        │
        └── Cited correctly?
               └── No  ──▶  add citation verification`)
      }
    ],
    examples: [
      {
        title: "Stale policy answer",
        input:
          "The source document was updated three months ago, but the retrieved chunk's ingested_at timestamp is four months old.",
        output: "This is a stale-index failure, not a generation failure.",
        explanation:
          "Step 1: The retrieved answer comes from evidence that is older than the source of truth.\nStep 2: That means retrieval worked over the wrong version of the content.\nStep 3: The fix is re-ingestion and a durable update trigger from the source system.\nStep 4: Prompting the LLM differently would not repair this class of bug."
      },
      {
        title: "Lost-in-the-middle miss",
        input:
          "The correct chunk is present in the prompt but sits in the middle, while weaker chunks occupy the beginning and end.",
        output: "The model answers from weaker context and ignores the best evidence.",
        explanation:
          "Step 1: Retrieval and reranking both technically succeeded because the right chunk reached context.\nStep 2: Position bias causes the generator to attend more to the first and last chunks.\nStep 3: Reorder the context so the best chunk is first and another strong one is last.\nStep 4: This is a prompt-assembly failure, not a retrieval failure."
      },
      {
        title: "Hallucinated citation",
        input:
          "The answer cites Source-7 even though only Source-1 through Source-5 were provided in context.",
        output: "A citation verifier should flag or strip the unsupported claim.",
        explanation:
          "Step 1: Compare all cited IDs against the set of chunk IDs actually supplied to the model.\nStep 2: Source-7 is absent, so the citation is impossible.\nStep 3: Mark the answer as partially ungrounded and remove or re-retrieve around the unsupported claim.\nStep 4: This guards against citation hallucination even when the prose sounds plausible."
      }
    ],
    tips: [
      "Walk the diagnostic flow in order instead of guessing at the cause of a bad answer.",
      "Mention stale indexing proactively because it is one of the most common real production bugs.",
      "Separate factual hallucination from citation hallucination; they are related but not identical."
    ],
    tricks: [
      "Check timestamps whenever answers sound outdated before touching any ranking parameter.",
      "Compare Recall@100 with Recall@context to catch top-k truncation quickly.",
      "Use citation verification as a cheap post-processing guardrail even when retrieval already looks good."
    ],
    memoryAids: [
      "Index, retrieve, rerank, context, generate, cite is the debugging staircase.",
      "Lost in the Middle means the best fact died in the prompt, not in the index.",
      "Stale answers often mean stale ingestion, not a stale model."
    ],
    interviewPatterns: [
      "Expect open-ended debugging questions that reward a stage-by-stage diagnosis flow.",
      "Use this topic to show operational maturity rather than just algorithm literacy.",
      "Frequency and companies: Tier 2 to Tier 3 production-readiness question, especially for senior and staff roles."
    ],
    practiceProblems: [
      "A warranty answer says two years, but SharePoint now says three years and the retrieved chunk was ingested before the update. Answer: stale index; rebuild that document and add freshness lag alerts or event-driven re-ingestion.",
      "Design a citation-verification pass for inline source markers. Answer: extract cited IDs, compare them with the provided context IDs, then heuristically or semantically verify that the cited chunk actually supports the local claim before returning the answer as trusted."
    ],
    faq: [
      {
        question: "Why does the model sometimes answer confidently when the corpus lacks the answer?",
        answer:
          "Because the generator falls back to parametric knowledge unless it is strongly instructed not to and unless weak retrieval is detected. That is why low-confidence retrieval should often trigger an explicit I do not know from the provided sources response."
      },
      {
        question: "How do I detect index drift against source documents?",
        answer:
          "Track source last-modified time against ingested-at time, add reconciliation jobs, and sample indexed chunks against the current source of truth. Drift is easiest to fix when it is measured continuously rather than inferred from user complaints."
      },
      {
        question: "Why can identical questions produce different answers on different runs?",
        answer:
          "Temperature, approximate search variation, concurrent index updates, or unstable context assembly can all introduce nondeterminism. For factual RAG, keep temperature low and make the retrieval stack as deterministic as your tooling allows."
      },
      {
        question: "How should I handle contradictory documents?",
        answer:
          "Carry authoritative metadata such as status and last-modified time, filter archived versions out of normal retrieval, and teach the generator to surface conflicts rather than blending them. Contradictory evidence is a data-governance problem as much as an LLM problem."
      },
      {
        question: "Can I fully prevent the model from using prior knowledge?",
        answer:
          "Not completely with current systems, but you can make grounding much stronger. Good prompts, low-temperature generation, citation checks, and faithfulness evaluation together make unsupported claims much less likely and much easier to catch."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "Liu et al. — Lost in the Middle (2024) - https://arxiv.org/abs/2307.03172",
        insight: "Critical evidence for context-position failure analysis."
      },
      {
        source: "blog",
        attribution: "Simon Willison RAG notes - https://simonwillison.net/tags/rag/",
        insight: "Useful practitioner perspective on edge cases, stale content, and safety concerns."
      },
      {
        source: "blog",
        attribution: "Pinecone learning resources on RAG failures - https://www.pinecone.io/learn/retrieval-augmented-generation/",
        insight: "Accessible production-oriented catalog of common failure modes and their mitigations."
      }
    ]
  }
];
