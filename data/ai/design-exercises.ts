import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-ai-design-exercises - "AI: Design Exercises" (8 topics).
// Coverage: RAG document Q&A, LLM inference serving platform, semantic search
// engine, AI coding assistant, LLM content moderation, two-tower recommendation
// system, conversational agent with memory & tool use, LLM observability
// platform. Each topic needs key discussion points, the expected trade-off
// conversations, and the common failure modes candidates hit.
//
// Authoring rules: see data/ai/foundations.ts (every field explicit, 5+ FAQs,
// `complexity` as latency/cost framing, `asciiDiagram` from "./_shared").
export const aiDesignExerciseTopics: Topic[] = [
  {
    id: "topic-ai-design-enterprise-rag-search",
    moduleId: "mod-ai-design-exercises",
    title: "Design an Enterprise RAG Search System",
    complexity: {
      time: "Query latency target P99 under 2 s end to end: identity resolution 5 ms (cached) plus query embedding 30 ms plus ACL-filtered ANN 200 ms plus cross-encoder rerank 100 ms plus LLM generation 1,200 ms plus overhead. Connector sync latency differs per source: seconds for Slack via webhook, hourly polling for Drive and Confluence, daily batch for email.",
      space: "10,000-person corpus at ~50M chunks of 512 tokens. HNSW at d=1024 float16 needs ~102 GB plus ~13 GB graph overhead; IVF-PQ at 16 bytes per code needs ~800 MB and fits a commodity server. ACL store is O(documents x average group memberships), low single-digit GB. LLM KV cache is ~200 MB per concurrent query at 4K context.",
    },
    intuition:
      "Enterprise search is RAG with one hard constraint that reshapes the whole architecture: every chunk you retrieve must be one the querying user is authorised to see. That sounds like a filter, and treating it as a filter is precisely the mistake. In a RAG system the retrieved chunks go into the LLM prompt, so anything retrieved has already been read by the model and can leak into its answer even if the citation list is scrubbed afterwards. Permission therefore cannot be a post-processing step - it has to be baked into the index and applied inside the search. Get that wrong and you have not built a search system, you have built a data-exfiltration tool with a friendly interface.",
    lesson: [
      {
        title: "Requirements Clarification: What to Ask Before Drawing Anything",
        content:
          "The first five minutes of a 45-minute interview decide how the rest goes. Strong candidates ask questions that reveal they know where the difficulty lives; weak ones ask generic questions that read as stalling.\n\nThe functional questions worth asking: which sources must be searched, since Slack, Drive, Confluence, Jira and email each have a different document shape, update frequency and permission model? Is the output a ranked list of documents or an LLM-generated answer with citations? Are queries keyword, semantic or both? Is the scope the whole company corpus or only what the user can already reach?\n\nThe non-functional questions are the ones interviewers reward, because they map onto the hard parts. How fresh must results be - can a document edited five minutes ago appear, or is an hour acceptable? What is the permission model: flat per-document ACLs, group-based, or hierarchical as in a Confluence space tree? When a user loses access, must stale results be purged immediately? What is the latency SLA, and can document content leave the VPC for an external LLM API?\n\nThe most interesting constraint that emerges is the tension between freshness and permission correctness. Near-real-time freshness pushes you toward aggressive incremental indexing, while ACL correctness pushes you toward careful, verified invalidation - and at scale those two goals pull in opposite directions.",
        diagram: asciiDiagram(`
  REQUIREMENTS CHECKLIST

  FUNCTIONAL
  ┌──────────────────────────────────────────────────────────────┐
  │ ► Which sources? Slack, Drive, Confluence, Jira, email       │
  │ ► Output: ranked document list OR generated answer + cites?  │
  │ ► Query types: keyword, semantic, hybrid?                    │
  │ ► Scope: whole corpus, or user-accessible only?              │
  │ ► Languages: English only, or multilingual?                  │
  └──────────────────────────────────────────────────────────────┘

  NON-FUNCTIONAL  (these are the ones that earn credit)
  ┌──────────────────────────────────────────────────────────────┐
  │ ► Freshness SLA:      5 min? 1 hour? 24 hours?               │
  │ ► Permission model:   per-doc ACL / group / hierarchical?    │
  │ ► Revocation:         must stale results purge immediately?  │
  │ ► Latency SLA:        interactive under 2 s, or async?       │
  │ ► Scale:              headcount x docs/person x doc size     │
  │ ► Privacy:            may content reach an external API?     │
  └──────────────────────────────────────────────────────────────┘

  ASSUMPTIONS FIXED FOR THIS DESIGN
  ┌──────────────────────────────────────────────────────────────┐
  │ 10 000 employees · 5 sources · answer with citations         │
  │ P99 under 2 s · group-based ACL                              │
  │ freshness 1 h for docs, 5 min for Slack                      │
  │ data stays in the VPC - no external LLM for sensitive docs   │
  └──────────────────────────────────────────────────────────────┘
`),
      },
      {
        title: "Capacity Estimation: State the Assumption, Do the Arithmetic, Draw the Conclusion",
        content:
          "Corpus. 10,000 employees at roughly 5,000 documents each, chunked at 512 tokens with about three chunks per document, gives on the order of 50M chunks to index.\n\nIndex size. With e5-large-v2 at d=1024 in float16, a flat representation is 50M x 1024 x 2 bytes = 102 GB, and HNSW at M=32 adds roughly 50M x 32 x 8 bytes = 12.8 GB of graph. IVF-PQ at 16 bytes per code is about 800 MB. At this scale IVF-PQ is the obvious choice: it turns a multi-server memory problem into something that fits comfortably on one machine.\n\nQuery volume. 10,000 employees at 20 searches a day is 200,000 queries a day, roughly 8 QPS average and 30-50 QPS at the morning peak. That is modest, and it does not justify a distributed serving tier.\n\nGeneration cost. At 4,000 input and 800 output tokens per query, peak load is on the order of 240,000 tokens per second, which at commodity API pricing lands near $1,300 a day - a number worth having ready because it drives the build-versus-buy discussion later.\n\nIncremental sync. Around 10,000 document updates a day, roughly 0.2 percent of the corpus, produces about 30,000 new chunk embeddings. At 1,000 chunks per second on a single A10G that is under a minute of GPU time daily.\n\nThe conclusion to state out loud is the important part: at 10,000-person scale nothing here is hard. Storage is small, QPS is low, embedding throughput is trivial. The architecture is dominated by permission correctness, not by infrastructure scale - and saying so redirects the interview toward the part that actually matters.",
        diagram: asciiDiagram(`
  CAPACITY ESTIMATION

  CORPUS
  ┌───────────────────────────────────────────────────────────────┐
  │ 10 000 employees × 5 000 docs         = 50M documents         │
  │ 512-token chunks, ~3 chunks per doc   ≈ 50M chunks to index   │
  └───────────────────────────────────────────────────────────────┘

  INDEX SIZE - the decision falls out of the arithmetic
  ┌───────────────────────────────────────────────────────────────┐
  │ flat fp16   50M × 1024 × 2 B      = 102   GB                  │
  │ HNSW graph  50M × 32 × 8 B        =  12.8 GB   ├─ 115 GB      │
  │ IVF-PQ      50M × 16 B            =   0.8 GB   ◄── choose     │
  │ recall@50   HNSW ef=150  ≈ 0.97                               │
  │             IVF-PQ nprobe=64 ≈ 0.91  (reranker closes gap)    │
  └───────────────────────────────────────────────────────────────┘

  QUERY VOLUME
  ┌───────────────────────────────────────────────────────────────┐
  │ 200 000 queries/day  ─►  ~8 QPS avg,  30-50 QPS peak          │
  │ 4 000 in + 800 out tokens/query                               │
  │ peak ≈ 240 000 tok/s  ─►  ≈ $1 300/day at commodity pricing   │
  └───────────────────────────────────────────────────────────────┘

  INCREMENTAL SYNC
  ┌───────────────────────────────────────────────────────────────┐
  │ 10 000 doc updates/day (0.2%) ─► ~30 000 chunk embeddings     │
  │ at 1 000 chunks/s on one A10G ─► ~30 s of GPU per day         │
  └───────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────┐
  │ CONCLUSION: nothing here is scale-hard. The design is         │
  │ dominated by ACL correctness, not by infrastructure.          │
  └───────────────────────────────────────────────────────────────┘
`),
      },
      {
        title: "High-Level Architecture: Offline and Online Paths",
        content:
          "Draw two clearly separated paths, because conflating them is where most whiteboard designs get muddled.\n\nThe offline ingestion path runs continuously, driven by connector events. Each connector polls or receives webhooks from its source and normalises documents into one canonical schema - doc_id, title, body, source, owner, last_modified and the effective ACL. Normalised documents are chunked at 512 tokens with 50-token overlap, embedded with a bi-encoder, and written to the vector index along with their ACL metadata; the ACL store is updated in the same transaction.\n\nThe online query path runs per request. Receive the query and user_id. Resolve identity by fetching the user's group memberships from Okta or LDAP - cached, so this is about 5 ms rather than a 50-200 ms round trip. Embed the query. Run ACL-aware ANN retrieval that returns only chunks whose allowed_groups intersect the user's groups, taking the top 50. Rerank those with a cross-encoder and keep the top 5. Pass them to the LLM with a system prompt instructing it to answer only from context and cite a source for every claim. Return the answer with its citations.\n\nOne decision follows directly from the privacy requirement: the LLM must be VPC-hosted - a self-hosted Llama-3 or a private Azure OpenAI deployment - because sending Slack messages and internal documents to a public API breaches most enterprise data-governance policies. That constraint is worth stating explicitly rather than leaving implicit.",
        diagram: asciiDiagram(`
  OFFLINE - INGESTION AND INDEXING

  ┌──────────┐ ┌──────────┐ ┌────────────┐ ┌────────┐
  │ Slack    │ │ Drive    │ │ Confluence │ │ Jira   │  ...
  │ connector│ │ connector│ │ connector  │ │        │
  └────┬─────┘ └────┬─────┘ └─────┬──────┘ └───┬────┘
       └────────────┴─────────────┴────────────┘
                          │
                          ▼
            ┌─────────────────────────────┐
            │ Document Normaliser         │
            │ {doc_id,title,body,source,  │
            │  owner,last_modified,ACL}   │
            └──────────────┬──────────────┘
                           ▼
            ┌─────────────────────────────┐
            │ Chunker + Embedder          │
            │ 512 tok / 50 overlap        │
            │ e5-large-v2                 │
            └──────┬───────────────┬──────┘
                   ▼               ▼
        ┌────────────────┐  ┌──────────────────┐
        │ VECTOR INDEX   │  │ ACL STORE        │
        │ IVF-PQ codes   │  │ doc_id ─► {      │
        │ chunk_id       │  │  allowed_users,  │
        │ doc_id         │  │  allowed_groups} │
        │ chunk_text     │  └──────────────────┘
        │ allowed_groups │
        └────────────────┘

  ONLINE - QUERY PATH (per request, budget P99 < 2 s)

   query + user_id
        │
        ▼
   ┌──────────────────────────────────────┐
   │ Identity resolution        ~5 ms     │  cached, 15-min TTL
   │ user_id ─► {group_ids}               │
   └──────────────────┬───────────────────┘
                      ▼
   ┌──────────────────────────────────────┐
   │ Query embedding            ~30 ms    │
   └──────────────────┬───────────────────┘
                      ▼
   ┌──────────────────────────────────────┐
   │ ACL-AWARE ANN retrieval    ~200 ms   │  ◄── the whole design
   │ filter INSIDE the search:            │      turns on this
   │ allowed_groups ∩ user_groups ≠ ∅     │
   │ ─► top-50 accessible chunks          │
   └──────────────────┬───────────────────┘
                      ▼
   ┌──────────────────────────────────────┐
   │ Cross-encoder rerank       ~100 ms   │
   │ ─► top-5                             │
   └──────────────────┬───────────────────┘
                      ▼
   ┌──────────────────────────────────────┐
   │ LLM generation           ~1 200 ms   │
   │ VPC-hosted. "Answer from context     │
   │ only. Cite a source per claim."      │
   └──────────────────┬───────────────────┘
                      ▼
             answer + citations
`),
      },
      {
        title: "Deep Dive: Permission-Aware Retrieval",
        content:
          "This is the section an interviewer will probe, and it is what distinguishes enterprise search from general RAG.\n\nThe naive approach is post-filtering: retrieve the top K over the whole corpus, then drop what the user cannot see. It fails twice. First on quality - a junior analyst may be able to access 5 percent of the corpus, so a top-100 retrieval leaves three or four chunks, which is too thin for a good answer and reliably induces hallucination. Second on security - the retrieval system read documents the user is not entitled to, and in a RAG pipeline those chunks land in the LLM prompt. Scrubbing the citation list afterwards does not unread them; the generated prose can still carry the confidential content.\n\nThe correct approach at this scale is an ACL-tagged index with pre-filtering. Every chunk carries its allowed_groups as metadata, and the filter is evaluated inside the ANN search so the index only visits cells containing accessible documents. Qdrant, Weaviate and Pinecone all support this natively. The overhead is roughly 20-40 ms against an unfiltered search, and the top 50 you get back are 50 accessible chunks rather than 50 chunks of which a handful survive.\n\nThe stronger alternative is per-group index sharding: a separate index per security group, with a union query across the user's groups and a merge-and-rerank step. Isolation is maximal, but storage is O(groups x documents) and update propagation gets complicated. Reserve it for strict regulatory isolation.\n\nRevocation deserves its own pipeline. A worker consumes the identity provider's event stream; on a group membership change it locates affected chunks, updates their metadata, and - critically - invalidates that user's cached group memberships immediately. Without that cache invalidation, a 15-minute TTL silently extends your revocation window past the SLA you promised.",
        diagram: asciiDiagram(`
  THREE APPROACHES TO PERMISSION-AWARE RETRIEVAL

  1 · POST-FILTERING                                    ❌ wrong
  ┌───────────────────────────────────────────────────────────────┐
  │ ANN over full corpus ─► top-100 ─► filter by ACL ─► 3 left    │
  │  ► too thin: 3 chunks cannot support a good answer            │
  │  ► worse: those 97 were READ. In RAG, read = in the prompt.   │
  │    scrubbing citations does not unread them.                  │
  └───────────────────────────────────────────────────────────────┘

  2 · ACL-TAGGED PRE-FILTERING                          ✅ correct here
  ┌───────────────────────────────────────────────────────────────┐
  │ every chunk carries {allowed_groups:[g1,g2,g3]}               │
  │ filter evaluated INSIDE the ANN search                        │
  │ ─► top-50, all accessible                                     │
  │ cost: +20-40 ms · native in Qdrant / Weaviate / Pinecone      │
  └───────────────────────────────────────────────────────────────┘

  3 · PER-GROUP INDEX SHARDING                          strongest, costly
  ┌───────────────────────────────────────────────────────────────┐
  │ one index per security group; union query, merge, rerank      │
  │ storage O(groups × docs) · update propagation is complex      │
  │ use when regulatory isolation is mandatory (HIPAA, SOC 2)     │
  └───────────────────────────────────────────────────────────────┘

  REVOCATION PIPELINE - two actions, not one
  ┌───────────────────────────────────────────────────────────────┐
  │ Okta/LDAP event stream                                        │
  │        │                                                      │
  │        ├─► ACL update worker ─► rewrite chunk metadata        │
  │        │                        (within freshness SLA)        │
  │        └─► INVALIDATE user's group-membership cache NOW       │
  │                        ▲                                      │
  │            forgetting this leaves a 15-minute hole that       │
  │            no amount of index correctness can close           │
  └───────────────────────────────────────────────────────────────┘
`),
      },
      {
        title: "Evaluation: Three Planes, Only One of Which Is Binary",
        content:
          "Evaluate on three separate planes, because they fail independently and need different instruments.\n\nPermission correctness is binary and deterministic, which makes it the easiest and the most important. Build a fixture of (query, user_id, expected_visible_doc_ids) cases and assert that retrieval never returns a document outside the expected set and always returns those inside it. This is a gate, not a metric: it must pass before any deployment, and a single false positive is a security defect rather than a quality regression.\n\nRetrieval quality is measured with Recall@10 and nDCG@10 against a golden set of (query, relevant_doc_ids) pairs assembled from real search logs where employees rated results. Enterprise search has an advantage here over consumer search - your users are identifiable and reachable, so building a genuine golden set is a matter of asking.\n\nAnswer quality uses RAGAS Faithfulness, which asks whether the answer follows from the retrieved chunks, and AnswerRelevancy, which asks whether it addresses the query. Faithfulness is the one that catches hallucination; relevancy catches evasive non-answers. Supplement with human review of about 50 queries a week to keep the automated judges calibrated.\n\nOnline, watch click-through on cited sources, thumbs up and down, and the query reformulation rate. Reformulation is the most honest of these: if a user immediately rephrases, the answer did not resolve the need regardless of what the offline metrics said.",
        diagram: asciiDiagram(`
  THREE EVALUATION PLANES

  ┌─────────────────────────────────────────────────────────────┐
  │ 1 · PERMISSION CORRECTNESS          binary · a GATE         │
  │    fixtures (query, user, expected_visible_docs)            │
  │    assert: never returns outside set, always returns inside │
  │    one violation = security defect, not a metric regression │
  │    ▲ must pass before ANY deploy                            │
  ├─────────────────────────────────────────────────────────────┤
  │ 2 · RETRIEVAL QUALITY               graded                  │
  │    Recall@10, nDCG@10 on a golden set from rated logs       │
  │    enterprise advantage: your raters are your employees     │
  ├─────────────────────────────────────────────────────────────┤
  │ 3 · ANSWER QUALITY                  graded + human          │
  │    RAGAS Faithfulness  ─► catches hallucination             │
  │    RAGAS AnswerRelevancy ─► catches evasive non-answers     │
  │    + 50 human-reviewed queries/week to calibrate the judge  │
  └─────────────────────────────────────────────────────────────┘

  ONLINE SIGNALS
   citation click-through ──► do users trust it enough to verify?
   thumbs up / down       ──► coarse but cheap
   reformulation rate     ──► the honest one: rephrase = failure
`),
      },
      {
        title: "Failure Modes and Graceful Degradation",
        content:
          "Four failure modes are worth naming, each with a distinct degradation strategy.\n\nConnector failure. A source goes offline and its slice of the index goes stale while the rest keeps serving. Track freshness per source and surface it: a banner when a source has not synced within twice its normal interval is far better than silently returning stale results that look current.\n\nACL propagation lag. Between a revocation and its propagation, a user may retrieve documents they no longer should. This is the one failure mode that is a security incident rather than a UX problem, which is why high-sensitivity documents should be flagged for immediate propagation rather than waiting for the batch cycle, and why revocation-to-propagation latency deserves its own SLA and its own alert.\n\nLLM unavailability. Degrade to retrieval-only: return the ranked, permission-filtered chunks without synthesis. This is a genuinely useful fallback rather than a token one, because the cited sources were always the substantive output and the prose was the convenience layer.\n\nEmbedding model version change. Old and new embeddings do not share a vector space, so a model upgrade invalidates the entire index. Handle it with a versioned index built in shadow while the old one serves, swapped only after validation - never by upgrading in place, which produces a silently incoherent index that still returns plausible-looking results.",
        diagram: asciiDiagram(`
  FAILURE MODES AND DEGRADATION

  ┌──────────────────────┬──────────────────┬────────────────────┐
  │ FAILURE              │ IMPACT           │ DEGRADATION        │
  ├──────────────────────┼──────────────────┼────────────────────┤
  │ connector offline    │ that source goes │ per-source         │
  │                      │ stale, silently  │ freshness banner   │
  ├──────────────────────┼──────────────────┼────────────────────┤
  │ ACL propagation lag  │ SECURITY         │ priority lane for  │
  │                      │ INCIDENT ⚠       │ sensitive docs +   │
  │                      │                  │ own SLA + alert    │
  ├──────────────────────┼──────────────────┼────────────────────┤
  │ LLM unavailable      │ no synthesis     │ retrieval-only     │
  │                      │                  │ mode - still       │
  │                      │                  │ genuinely useful   │
  ├──────────────────────┼──────────────────┼────────────────────┤
  │ embedding model      │ whole index      │ versioned shadow   │
  │ version change       │ invalid - vectors│ index, swap after  │
  │                      │ share no space   │ validation         │
  └──────────────────────┴──────────────────┴────────────────────┘

  ┌───────────────────────────────────────────────────────────────┐
  │ Only one row above is a security incident. Say which, and     │
  │ why it needs a different response class from the other three. │
  └───────────────────────────────────────────────────────────────┘
`),
      },
      {
        title: "Cost and Tradeoffs: Alternatives Considered",
        content:
          "Present the architectural choices as decisions with rejected alternatives, because interviewers reward evidence that you considered options rather than asserting one design as inevitable.\n\nIVF-PQ over HNSW. At 50M chunks HNSW wants around 115 GB while IVF-PQ needs under 1 GB, which is the difference between a specialised memory-heavy fleet and a standard server. The cost is recall: roughly 0.91 at nprobe=64 against 0.97 for HNSW at ef_search=150. That six-point gap is perhaps one or two fewer relevant chunks per query, and the cross-encoder reranker recovers most of it because it re-scores a wide candidate set. State the recovery mechanism, not just the tradeoff.\n\nVPC-hosted LLM over a public API. Employee messages and internal documents generally cannot leave the tenancy. A 70B model on two H100s runs around $5,000 a month at this QPS, which compares favourably with API pricing at 200,000 queries a day while also giving data residency. Here the compliance constraint and the cost argument happen to agree, which is worth pointing out.\n\nHybrid search over dense-only. Enterprise users search for exact strings constantly - ticket identifiers, document titles, person names, code symbols - and dense retrieval is weak on all of them. Adding BM25 and fusing with Reciprocal Rank Fusion improves exact-match queries by roughly 15-25 percent and needs no new infrastructure if you already run Elasticsearch. This is close to free, and omitting it is the most common gap in candidate designs.",
        diagram: asciiDiagram(`
  DECISIONS WITH THEIR REJECTED ALTERNATIVES

  ┌───────────────────────────────────────────────────────────────┐
  │ 1 · IVF-PQ   over   HNSW                                      │
  │     0.8 GB   vs     115 GB          ─► commodity server       │
  │     recall 0.91     recall 0.97                               │
  │     gap recovered by the cross-encoder over a wide candidate  │
  │     set ─ state the recovery, not just the tradeoff           │
  ├───────────────────────────────────────────────────────────────┤
  │ 2 · VPC-hosted LLM   over   public API                        │
  │     70B on 2×H100 ≈ $5 000/month at this QPS                  │
  │     governance forbids the API anyway - and it is cheaper     │
  │     at 200 000 queries/day. Compliance and cost agree.        │
  ├───────────────────────────────────────────────────────────────┤
  │ 3 · Hybrid BM25 + dense (RRF)   over   dense-only             │
  │     +15-25% on exact-match queries: JIRA-1234, doc titles,    │
  │     person names, code symbols - which enterprise users       │
  │     search constantly. No new infrastructure. Nearly free.    │
  │     ▲ the most common omission in candidate designs           │
  └───────────────────────────────────────────────────────────────┘
`),
      },
    ],
    examples: [
      {
        title: "The post-filtering bug that turns search into exfiltration",
        input:
          "The system post-filters. A marketing analyst queries; the top 100 chunks are retrieved over the full corpus, then filtered. 92 come from HR and Finance documents the analyst cannot access, leaving 8 chunks - too thin for a good answer.",
        output:
          "The generated answer references information from a Finance document the analyst cannot open. The post-filter correctly removed that document from the displayed citation list, but the chunk had already been placed in the LLM prompt and its content leaked into the prose.",
        explanation:
          "Step 1: Post-filtering means retrieval read and processed documents the user is not entitled to - the boundary was crossed before the filter ran. Step 2: In a RAG pipeline, retrieved chunks become prompt context, so 'retrieved' and 'disclosed to the model' are the same event. Step 3: Filtering citations afterwards addresses the display layer only; the generated text is already contaminated and no downstream filter can reliably detect that. Step 4: This is a security failure, not a quality failure - confidential financial data reached an unauthorised user through generated prose. Step 5: The fix is ACL-tagged pre-filtering, where the ANN search only visits cells the user's groups can reach, so those documents are never retrieved, never in the prompt, and cannot contaminate anything. This pre-versus-post distinction is the single most probed point in enterprise search interviews.",
      },
      {
        title: "Ranking heterogeneous sources for one query",
        input:
          "A user asks for the Q3 launch plan. Candidates: a comprehensive Confluence page edited two weeks ago; a brief but highly relevant Slack thread from yesterday; a Jira epic with dates and assignments but little prose; a half-finished Google Doc from this morning.",
        output:
          "Cross-encoder scores: Confluence 0.89, Slack 0.81, Jira 0.64, Doc 0.52. The LLM synthesises from the top three and cites each claim: schedule from Confluence, the latest change from the Slack thread, open tasks from Jira.",
        explanation:
          "Step 1: The cross-encoder scores (query, chunk) pairs on semantic relevance and needs no per-source tuning, which is why a single reranker handles four very different document shapes. Step 2: The Jira epic ranks low despite being genuinely relevant, because its chunk text is dominated by ticket identifiers, dates and assignee names rather than prose - a known weakness of dense retrieval on structured records. Step 3: The fix is not reranker tuning but chunking: extract the description field separately from the metadata block so the prose competes on its own. Step 4: Per-claim citation matters here because enterprise decisions need audit trails, and an answer assembled from three sources is only trustworthy if each statement is attributable. Step 5: Log which sources contribute to answers - a source that consistently under-contributes is usually signalling a chunking defect rather than genuine irrelevance.",
      },
      {
        title: "Revocation race condition and the cache that defeats the SLA",
        input:
          "A user is removed from exec-team at 09:00. The ACL update worker processes the change at 09:47, inside the one-hour SLA. The user submits a query at 09:25. Their group memberships are cached with a 15-minute TTL.",
        output:
          "Without explicit invalidation the cached entry may still list exec-team at 09:25, so the user retrieves a chunk whose ACL is {finance-team, exec-team} - an authorisation violation inside the stated SLA. With cache invalidation fired at 09:00, the 09:25 lookup returns the new groups and the retrieval correctly returns nothing.",
        explanation:
          "Step 1: There are two independent staleness windows here - the index metadata and the identity cache - and the SLA was written against only the first. Step 2: The index update at 09:47 is irrelevant to this failure, because the chunk's ACL never changed; what changed was the user's membership. Step 3: That means index-side correctness alone cannot close the hole, which is the subtle part and the reason this makes a good interview question. Step 4: The fix is to have the revocation event do two things atomically: schedule the index update and invalidate the affected user's cache entry immediately. Step 5: Track revocation-to-effective latency as its own metric measured end to end from the identity event, not from when the index worker happened to run - the latter measures the wrong thing and will read green during exactly this failure.",
      },
    ],
    tips: [
      "Lead with permissions, not architecture. Your first sentence after requirements should be that a user must never see a document they cannot access, and that this forces pre-filtering rather than post-filtering. It immediately separates enterprise search from generic RAG.",
      "Hybrid retrieval beats dense-only in enterprise settings, because users search constantly for exact strings - ticket numbers, document titles, person names, code identifiers - and dense embeddings handle none of those well.",
      "Give each connector its own sync strategy. Slack is high-volume and ephemeral and needs webhooks; Drive changes slowly and tolerates hourly polling; email is voluminous and rarely searched and can run daily. One strategy for all sources is a design smell.",
      "Keep the freshness SLA and the ACL propagation SLA separate. Missing freshness is a user experience problem; missing ACL propagation is a security incident. Different consequences deserve different alerts and different escalation paths.",
      "Take chunking seriously. Confluence has heading-delimited sections that make natural boundaries, Slack threads should stay whole as conversation units, and Jira descriptions should be chunked apart from metadata fields. Uniform 512-token splitting quietly damages structured sources.",
    ],
    tricks: [
      "Cache group membership lookups with a 15-minute TTL and have the revocation pipeline invalidate entries explicitly. This turns a 50-200 ms LDAP round trip into a 1 ms hit for well over 99 percent of queries, and the explicit invalidation is what keeps it from becoming a security hole.",
      "Precompute a permission hash - hash of the user's sorted group ids - and store the set of hashes each document is reachable from. This converts a per-chunk list intersection into an O(1) lookup, which matters when a user belongs to dozens of groups.",
      "Log the accessible fraction of retrieved candidates as a metric. A user for whom 90 percent of retrieved chunks are filtered has an unusually narrow accessible corpus and needs a wider retrieval or more aggressive pre-filtering; you cannot see this at all if you only log what was returned.",
      "Build the connector interface - normalise, chunk, get_acl, get_updates - before implementing any single source. The classic mistake is building for Confluence and generalising later, which bakes one source's permission model into the core.",
      "Stream the LLM response. A 1.2-second generation feels like 200 ms if the first token arrives immediately, and it costs nothing infrastructurally. Enterprise users tolerate latency better than consumers, but perceived latency still drives adoption.",
    ],
    memoryAids: [
      "Pre-filter, never post-filter: the documents you retrieve are the documents the LLM reads, whatever the citation list says afterwards.",
      "ACL-aware means the index is permission-shaped, not that the filter is permission-shaped. The constraint lives in the structure, not at the end.",
      "Freshness lag is a UX problem; revocation lag is a security incident. Two SLAs, two alert classes.",
      "Two staleness windows exist - the index metadata and the identity cache. Closing only one leaves the hole open.",
      "At 10,000 employees the scale is easy and the permissions are hard. Say that out loud and the interview goes where it should.",
    ],
    interviewPatterns: [
      "'How do you guarantee a user never retrieves a document they lack access to?' The core probe. Answer with pre- versus post-filtering and the ACL-tagged index, and explain why post-filtering leaks through the LLM prompt.",
      "'What happens when an employee leaves?' The revocation pipeline, the propagation SLA, and the cache-invalidation subtlety that most candidates miss.",
      "'How do you keep the index fresh when documents change constantly?' Per-source sync strategies, webhooks versus polling, content-hash change detection and debouncing high-churn documents.",
      "'A user searches a Jira ticket number and gets nothing. Why?' Dense retrieval's exact-match weakness; answer with hybrid BM25 plus RRF, and mention the chunking fix for structured records.",
      "'What changes at 500,000 employees instead of 10,000?' Forces the scale discussion: disk-based ANN or IVF-PQ, distributed serving, per-tenant sharding and GPU sizing for the initial embedding run.",
      "Frequency and companies: very common at Glean, Microsoft, Google, Atlassian, Dropbox and Notion, and at any enterprise with an internal search team; it is the default RAG design question once an interviewer wants to test more than vector-database familiarity. Stability: high - permission-aware retrieval and hybrid search are durable, while specific vector-database feature sets churn.",
    ],
    faq: [
      {
        question: "Why not just filter results by permission afterwards - why must it be in the index?",
        answer:
          "Post-filtering fails on two independent axes. On quality: when a user can access only a small fraction of the corpus, a top-100 retrieval may leave three or four accessible chunks, which is far too thin to ground a good answer and reliably produces hallucination. On security: in a RAG system the retrieved chunks are placed directly into the LLM prompt, so even if the citation list is scrubbed, the model has already read the confidential text and can reference it in the generated prose. Pre-filtering fixes both at once - you get the top 50 accessible chunks rather than the top 50 overall, and inaccessible documents never enter the prompt in the first place. The security argument is the one that matters most, because a quality problem degrades the product while this one leaks data.",
        category: "permissions",
      },
      {
        question: "How do you handle hierarchical permissions, such as a Confluence space where a parent page's permissions propagate to children?",
        answer:
          "Flatten the hierarchy at index time. When a page is indexed, the connector walks its ancestor chain and computes the effective ACL as the union of direct and inherited permissions, storing that flattened list on every chunk. This keeps query-time evaluation to a simple set intersection, preserving the pre-filtering property. The cost lands on updates: changing permissions on a space root invalidates every descendant's ACL, which can cascade to thousands of chunks. Handle this with a permission version per document tree, triggering a scoped background reindex when the version changes rather than attempting a synchronous cascade. These cascades should also be prioritised in the revocation queue, since space-level permission removals are precisely when a slow cascade is most likely to leak.",
        category: "permissions",
      },
      {
        question: "How do you handle a living document that is edited ten times a day?",
        answer:
          "Subscribe to the source's webhook events for edits. On each event the connector fetches the document, recomputes chunk boundaries, and compares content hashes to identify which chunks actually changed - typically one or two out of many. Only changed chunks are re-embedded and replaced in the index; unchanged chunks are skipped entirely, which is what keeps incremental sync cheap. For very high-churn documents add a short debounce, waiting perhaps two minutes after the last edit before reindexing, so ten rapid edits produce one embedding pass rather than ten. The content-hash check is the important part: without it, a trivial typo fix triggers a full document re-embedding and incremental sync degrades into repeated full reindexing.",
        category: "freshness",
      },
      {
        question: "Can this handle multilingual queries and documents?",
        answer:
          "Yes, using a multilingual embedding model such as multilingual E5, BGE-M3 or a multilingual commercial embedding. These embed text from different languages into a shared semantic space, so a French query can retrieve a relevant English document. The tradeoff is that multilingual models are typically 10-20 percent weaker than a strong monolingual model on any single language. For an enterprise that is predominantly English with a few other languages present, the pragmatic configuration is a multilingual dense model paired with a per-language BM25 index to preserve exact-match quality in each language. For genuinely multilingual corpora at a multinational, evaluate candidate models on your own task before committing, because published multilingual benchmarks correlate poorly with performance on any specific enterprise vocabulary.",
        category: "multilingual",
      },
      {
        question: "How do you know whether the system is actually improving productivity?",
        answer:
          "The North Star is task resolution: did the employee find what they needed without asking a colleague, filing a ticket or reformulating? That is hard to measure directly, so use proxies available without surveys - zero-result rate, thumbs up and down, citation click-through rate, and query reformulation rate. Reformulation is the most informative, because an immediate rephrase is a strong implicit signal that the answer failed regardless of what offline metrics said. Calibrate these proxies against ground truth by having a human evaluator review a sample of about 50 queries a week for relevance and faithfulness. Without that calibration the proxies drift, and you end up optimising a metric that has quietly stopped tracking the outcome you care about.",
        category: "evaluation",
      },
      {
        question: "How is this different from just deploying Elasticsearch?",
        answer:
          "Classical enterprise search uses BM25 keyword retrieval, which is excellent for exact matches and poor for semantic ones - it will not connect a query about remote work policy to a document titled work-from-home guidelines. A RAG system adds three things: dense embedding retrieval for semantic similarity, cross-encoder reranking that judges query-document relevance beyond term overlap, and an LLM synthesis layer that produces an answer instead of a list of links. The correct production answer is not one or the other but both, fused with RRF, because enterprise traffic mixes semantic questions with exact-string lookups. Elasticsearch 8 and later supports dense vector search natively, so in practice an Elastic-based deployment can host both retrievers on one platform rather than running two systems.",
        category: "comparison",
      },
    ],
    references: [
      {
        source: "blog",
        attribution: "Glean engineering writing on enterprise search architecture and permission-aware retrieval",
        insight: "The clearest public treatment of ACL-aware indexing across heterogeneous connectors, including why permissions must be resolved at index time rather than query time for hierarchical sources.",
      },
      {
        source: "paper",
        attribution: "Johnson, Douze and Jegou, 'Billion-scale similarity search with GPUs' (FAISS), arXiv:1702.08734",
        insight: "The IVF-PQ mechanics behind the 100 GB to 1 GB reduction, and the nprobe-versus-recall curve that justifies accepting 0.91 recall when a reranker sits downstream.",
      },
      {
        source: "blog",
        attribution: "Qdrant and Weaviate documentation on filtered vector search and multi-tenancy",
        insight: "Concrete semantics for evaluating a metadata filter inside the ANN traversal rather than after it - the implementation detail that makes pre-filtering real rather than aspirational.",
      },
      {
        source: "blog",
        attribution: "RAGAS documentation and the Faithfulness / AnswerRelevancy metric definitions",
        insight: "Reference-free evaluation of grounded answers, which is what makes continuous quality measurement possible on production traffic where no labels exist.",
      },
      {
        source: "note",
        attribution: "Reciprocal Rank Fusion as applied to hybrid BM25 and dense retrieval in production search stacks.",
        insight: "RRF needs no score calibration between the two retrievers, which is why hybrid search is cheap to add - the usual blocker is normalising incomparable score scales, and RRF sidesteps it entirely.",
      },
    ],
    practiceProblems: [
      "MULTI-TENANT VARIATION. Rebuild this as a SaaS product serving 500 companies of 10,000-100,000 employees each, where one tenant's data must never reach another. Specify isolation, indexing and cost model. ANSWER: Isolation - one namespace per tenant in the vector database (Weaviate, Qdrant and Pinecone all support this), with queries scoped to the requesting tenant's namespace so cross-tenant retrieval is structurally impossible rather than filtered. Logical isolation plus row-level security on the metadata store satisfies SOC 2; offer dedicated physical deployments for healthcare and finance customers who need more. Indexing - share the embedding model and chunking pipeline across tenants, since model quality is not tenant-specific, and partition only the metadata. Cost - charge per indexed chunk for storage and embedding, plus per query for retrieval and generation; self-service tiers share the LLM, enterprise tiers get dedicated hosting. Operationally the ACL update worker must fan out per tenant rather than running as one sequential pipeline, or a single large tenant's reorganisation stalls everyone else's revocations.",
      "HUNDRED-FOLD CORPUS. A media archive holds 5 billion chunks spanning 20 years, with heavy exact-match querying on names, dates and article identifiers. HNSW is impossible on memory. Redesign retrieval. ANSWER: Move to disk-based ANN - DiskANN or ScaNN - which supports billion-scale search at roughly 50-150 ms against 15-20 ms in-memory, acceptable inside a 2-second budget. Alternatively IVF-PQ at 5B x 16 bytes is 80 GB and fits a single large-memory server with GPU acceleration. Add BM25 through Elasticsearch, which a media archive almost certainly already runs, and fuse with RRF to handle the exact-match traffic that dense retrieval misses. For date-range queries, partition IVF cells by year so nprobe can be restricted to the requested range, exploiting temporal locality in the index structure rather than filtering after the fact. Initial embedding of 5B chunks at 10,000 chunks/sec on an A100 is about six days on one GPU, so budget roughly 14 hours on a ten-GPU cluster, and deduplicate by content hash first because syndicated articles repeat heavily.",
      "PERMISSION AUDIT. Chunk C1 has ACL {finance-team, exec-team}. U1 is in {engineering-team, exec-team}; U2 in {finance-team}; U3 in {engineering-team}. (a) Who can retrieve C1? (b) U1 is removed from exec-team at 09:00, the index update lands at 09:47, and U1 queries at 09:25 - what happens? (c) What should be logged? ANSWER: (a) Access needs finance-team or exec-team, so U1 and U2 can retrieve C1 and U3 cannot. (b) The chunk's ACL never changed, so the index update is irrelevant; what matters is U1's cached membership. With a 15-minute TTL and no explicit invalidation, the cache may still list exec-team at 09:25 and U1 retrieves C1 - a violation occurring inside a nominally satisfied SLA. With invalidation fired at 09:00, the 09:25 lookup returns the new groups and access is correctly denied. (c) Log user_id, chunk_id, doc_id, timestamp, the chunk ACL at query time, the user groups at query time and the outcome. That record is a security audit artefact, so it must itself be access-controlled and retained independently of ordinary request logs.",
      "LATENCY BUDGET UNDER PRESSURE. The P99 budget is 2 s and current measurements are: identity 180 ms (uncached), embedding 30 ms, ANN 200 ms, rerank 100 ms, LLM 1,400 ms, overhead 200 ms - total 2,110 ms. Find 200 ms without degrading quality. ANSWER: Cache identity resolution, which removes about 175 ms at a 15-minute TTL and is the only change that costs nothing in quality. That alone brings the total to about 1,935 ms. If more is needed, stream the LLM response so perceived TTFT drops to roughly 200 ms even though total generation is unchanged - this addresses the metric users actually experience. Resist trimming the reranker or reducing the candidate set, because both trade directly against retrieval quality, and resist shrinking generation length, which trades against answer completeness. The general lesson is to exhaust the cache-and-perception levers before touching anything on the quality path.",
      "HIERARCHICAL PERMISSIONS. Confluence propagates a parent page's permissions to its children. How do you index this, and what breaks when a parent's permissions change? ANSWER: Flatten at index time - when indexing a page, the connector walks the ancestor chain and computes the effective ACL as the union of direct and inherited permissions, storing that flattened list on every chunk. Query-time evaluation stays O(1) against the user's groups, which preserves the pre-filtering property. What breaks is update cost: changing a permission on a space root can invalidate the ACL of every descendant, cascading to thousands of chunks. Handle it by storing a permission version per document tree and triggering a scoped background reindex when the version changes, rather than attempting a synchronous cascade. Also prioritise these cascades in the revocation queue, since a space-level permission removal is exactly the case where a slow cascade is most likely to leak sensitive content.",
    ],
  },
  {
    id: "topic-ai-design-coding-assistant",
    moduleId: "mod-ai-design-exercises",
    title: "Design an AI Coding Assistant",
    complexity: {
      time: "Inline completion has a hard P99 target of 200 ms, decomposed as 40 ms network, 10 ms in-IDE context assembly, 5 ms speculative cache lookup, 35 ms context retrieval with a hard timeout, 80 ms model inference and 15 ms streaming, leaving 15 ms of tail buffer. Chat mode tolerates P99 under 5 s with streaming, which is a 25x looser budget and therefore a different system.",
      space: "Per-request context window ~8K tokens combining IDE context and retrieved snippets. KV cache ~50 MB per active completion. Speculative prefix cache per user is on the order of 200 MB. A 7B FIM model at int4 is ~3.5 GB of GPU memory. The per-repository code index at 200K chunks and d=768 float16 is only ~307 MB, so it sits in memory comfortably.",
    },
    intuition:
      "A coding assistant is a latency problem wearing machine-learning clothes. The 200-millisecond inline budget is so tight that it dictates every other decision: how big the model can be, how deep context retrieval is allowed to go, whether caching is optional, and whether the network hop can cross a region boundary. Nothing about model quality matters if the completion arrives after the developer has already typed the next line - a late suggestion is not a worse suggestion, it is no suggestion. Design the budget first and let the architecture fall out of it, rather than designing an architecture and hoping it fits.",
    lesson: [
      {
        title: "Requirements: Two Modes That Are Really Two Systems",
        content:
          "Treat inline completion and chat as separate systems that happen to share model infrastructure, because their constraints have almost nothing in common. Inline fires on a keystroke pause, must return within 200 ms, produces 1 to 50 tokens, sees the current file and its immediate imports, and succeeds by being invisible. Chat is explicitly invoked, tolerates seconds, produces hundreds to thousands of tokens, wants the whole repository, and succeeds by being correct.\n\nFunctional questions worth asking: are both modes in scope? Which languages - the answer is usually all major ones, but the specifics change tokenisation and training-data discussion. Does chat need whole-repository understanding or just the current file and its dependencies?\n\nThe non-functional questions carry the design. What is the P99 inline budget, since it determines everything downstream? Can customer code leave the customer's network? May the model be fine-tuned on customer code? What is the IDE integration mechanism - LSP, a VS Code extension, a JetBrains plugin?\n\nThe privacy answer is load-bearing. If code cannot leave the customer VPC, a hosted frontier API is off the table and you are self-hosting, which caps model size at what you can serve within the latency budget on hardware the customer will actually buy.\n\nFinally, pin down success. Accept rate - the fraction of shown completions the developer takes unmodified - is the North Star, but raw accept rate is gameable by suggesting closing braces and semicolons. Define meaningful accept rate as accepted completions of five or more tokens, and quote that number instead.",
        diagram: asciiDiagram(`
  TWO MODES, TWO BUDGETS - design them as two systems

  ┌──────────────────┬──────────────────────────────────────────────┐
  │                  │ INLINE COMPLETION                            │
  ├──────────────────┼──────────────────────────────────────────────┤
  │ trigger          │ keystroke pause (~300 ms idle)               │
  │ latency          │ P99 < 200 ms   ◄── HARD. dictates all else   │
  │ output           │ 1-50 tokens                                  │
  │ context          │ current file + immediate imports             │
  │ UX goal          │ invisible - should feel like typing          │
  │ metric           │ meaningful accept rate (5+ token completions)│
  └──────────────────┴──────────────────────────────────────────────┘
  ┌──────────────────┬──────────────────────────────────────────────┐
  │                  │ CHAT                                         │
  ├──────────────────┼──────────────────────────────────────────────┤
  │ trigger          │ explicit user request                        │
  │ latency          │ P99 < 5 s, streaming ─ 25× looser            │
  │ output           │ 100-2 000 tokens                             │
  │ context          │ repository, tests, docs, history             │
  │ UX goal          │ conversational - latency is visible, ok      │
  │ metric           │ task completion rate                         │
  └──────────────────┴──────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────────┐
  │ HARD CONSTRAINT: customer code must not leave the customer VPC.   │
  │ IMPLICATION:     self-hosted model. No frontier API. Size is now  │
  │                  bounded by what fits the 200 ms budget.          │
  └───────────────────────────────────────────────────────────────────┘
`),
      },
      {
        title: "Capacity Estimation for a 500-Developer Deployment",
        content:
          "Five hundred developers is the typical enterprise deal size, so model the economics there.\n\nInline load. A developer typing actively triggers a completion roughly 20 times a minute at a 300 ms idle threshold, and over a four-hour active coding day that is about 4,800 requests each. Across 500 developers that is 2.4M requests a day, roughly 27 QPS average and 80 QPS at the mid-morning peak.\n\nToken throughput. Each inline request carries about 2,000 context tokens in and produces about 20 out. At 80 QPS that is roughly 161,600 tokens per second of aggregate work. A 7B model at int4 on an A10G runs around 3,500 tokens per second, and with continuous batching at around eight requests per batch you land near six A10Gs for the inline tier.\n\nChat load. Twenty chat requests per developer per day is 10,000 a day, about 7 QPS average and 20 at peak - an order of magnitude lighter than inline, though each request is much larger at roughly 6,000 in and 500 out. Two dedicated GPUs during business hours is sufficient, and chat can borrow inline capacity off-peak.\n\nIndex. Five hundred developers against roughly 50,000 lines each is about 25M lines, or around 200,000 chunks at 512 tokens. At d=768 in float16 that is about 307 MB, which is trivially in-memory with a modest HNSW graph.\n\nThe conclusion worth stating: the fleet is small and the index is tiny. This system is not scale-constrained, it is latency-constrained, and the interview should go there.",
        diagram: asciiDiagram(`
  CAPACITY - 500-DEVELOPER ENTERPRISE

  INLINE COMPLETION
  ┌───────────────────────────────────────────────────────────────┐
  │ 20 completions/min × 4 h active = 4 800 /dev/day              │
  │ × 500 devs                      = 2.4M requests/day           │
  │ peak                            ≈ 80 QPS                      │
  │ tokens/request                  ≈ 2 000 in + 20 out           │
  │ peak throughput   80 × 2 020    ≈ 161 600 tok/s               │
  │ A10G, 7B @ int4                 ≈ 3 500 tok/s                 │
  │ with batching (≈8/batch)        ≈ 6 A10G GPUs                 │
  └───────────────────────────────────────────────────────────────┘

  CHAT
  ┌───────────────────────────────────────────────────────────────┐
  │ 20 /dev/day × 500 = 10 000 /day ─► ~7 QPS avg, ~20 peak       │
  │ 6 000 in + 500 out per request                                │
  │ 2 dedicated GPUs in business hours; shares inline off-peak    │
  └───────────────────────────────────────────────────────────────┘

  CODE INDEX
  ┌───────────────────────────────────────────────────────────────┐
  │ 25M lines ─► ~200K chunks @ 512 tok                           │
  │ d=768 fp16 ─► 200K × 1 536 B ≈ 307 MB   in-memory, HNSW M=16  │
  └───────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────┐
  │ CONCLUSION: 6-8 GPUs and a 307 MB index. Not scale-hard.      │
  │ Latency-hard. Spend the interview on the 200 ms budget.       │
  └───────────────────────────────────────────────────────────────┘
`),
      },
      {
        title: "Architecture: Shared Model, Divergent Paths",
        content:
          "The IDE plugin is the client and owns more than people expect: it detects the 300 ms idle, assembles local context, cancels stale requests, and renders results as ghost text.\n\nThe inline path runs IDE context assembly, then a speculative cache lookup, then optionally a fast BM25 retrieval over the local repository index under a hard timeout, then FIM inference, then streaming back. Every stage past the cache is skippable, and that is deliberate - a degraded completion delivered on time beats a perfect one delivered late.\n\nThe chat path assembles a much richer context: the full current file, conversation history, a semantic ANN search over the repository for the top few relevant functions, plus test files, README and dependency manifest. It then runs a larger model - a 13B code model or an instruct-tuned 8B - and streams tokens back into the chat panel. The looser budget buys both more context and more parameters.\n\nBehind both sits an offline indexing pipeline driven by a filesystem watcher. On save or commit, changed files are chunked along function and class boundaries rather than by fixed token windows, embedded with a code-specific encoder such as CodeBERT or UniXcoder, and written to the index. Chunking at semantic boundaries matters more for code than for prose, because a function split across two chunks retrieves badly in both halves.",
        diagram: asciiDiagram(`
  OFFLINE - CODE INDEXING (per repository, background)

   filesystem watcher ──(on save / commit)──┐
                                            ▼
                        ┌───────────────────────────────┐
                        │ Code chunker                  │
                        │ split on function/class       │
                        │ boundaries, 512 tok max       │
                        └───────────────┬───────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │ Code embedding (UniXcoder)    │
                        └───────────────┬───────────────┘
                                        ▼
                        ┌───────────────────────────────┐
                        │ Per-repo HNSW index + BM25    │
                        └───────────────────────────────┘

  ONLINE - INLINE PATH (budget 200 ms, every stage skippable)

   IDE plugin: 300 ms idle fires
        │
        ▼
   ┌────────────────────────────┐
   │ context assembly   ~10 ms  │  prefix, suffix, imports, open tabs
   └─────────────┬──────────────┘
                 ▼
   ┌────────────────────────────┐
   │ speculative cache   ~5 ms  │──hit──► return immediately (<20 ms)
   └─────────────┬──────────────┘
                 ▼ miss
   ┌────────────────────────────┐
   │ BM25 retrieval     ≤35 ms  │──timeout──► SKIP, proceed without
   └─────────────┬──────────────┘
                 ▼
   ┌────────────────────────────┐
   │ FIM inference      ~80 ms  │  7B int4, prefix KV reused
   └─────────────┬──────────────┘
                 ▼
          ghost text in editor ──► tab to accept

  ONLINE - CHAT PATH (budget 5 s, streaming)

   chat message
        │
        ▼
   ┌──────────────────────────────────────┐
   │ rich context assembly       ~200 ms  │
   │ full file · history · ANN top-5      │
   │ tests · README · dependencies        │
   └─────────────────┬────────────────────┘
                     ▼
   ┌──────────────────────────────────────┐
   │ chat model inference     ~2-4 s      │
   │ 13B code model, streamed             │
   └─────────────────┬────────────────────┘
                     ▼
              chat panel
`),
      },
      {
        title: "Deep Dive: Spending the 200 Milliseconds",
        content:
          "Decompose the budget component by component and justify each allocation, because that is what a strong candidate does and what an interviewer is listening for.\n\nNetwork gets 40 ms for the round trip. On a company LAN it is nearer 5 ms; same-region VPC is 15-30 ms. This is why cross-region serving is simply disqualified - a single trans-continental hop consumes most of the budget.\n\nContext assembly gets 10 ms and must stay entirely in-process in the extension, with no disk or IPC. Speculative cache lookup gets 5 ms as an in-memory hash lookup. Context retrieval gets 35 ms with a hard timeout: if BM25 has not returned by then, proceed with file context alone. That degradation is the single most important design decision in the path, because retrieval is the most variable stage and the one most likely to blow the tail.\n\nThat leaves roughly 80 ms for inference plus 15 ms of streaming overhead and 15 ms of tail buffer. A 7B model at int4 on an A10G runs around 3,500 tokens per second, so 30 tokens is under 10 ms unbatched - which looks like enormous headroom, and is, because that headroom is what you spend on batching to serve 80 QPS from six GPUs. Even a 13B at roughly 1,800 tokens per second fits at about 17 ms.\n\nThe model must be FIM-capable. The cursor sits in the middle of a file, so a completion has to be consistent with the code below it as well as above. Left-to-right generation cannot see the suffix and routinely emits code that conflicts with what already follows - redeclaring a variable, or returning where a return already exists. FIM training with explicit prefix and suffix segments is what makes mid-file completion coherent, and it is not something you can bolt on with prompting.\n\nFinally, exploit prefix caching. While the developer types, the server can pre-fill the KV cache for the current file context, so when the idle timer fires only the new cursor region needs computing. vLLM supports this natively through PagedAttention, and it removes roughly 60 ms of re-prefill - which is the difference between fitting the budget and missing it.",
        diagram: asciiDiagram(`
  200 ms BUDGET DECOMPOSITION

  component                        budget   lever
  ──────────────────────────────────────────────────────────────────
  network round trip                40 ms   same-VPC, keepalive
  context assembly (in-IDE)         10 ms   in-process, no I/O
  speculative cache lookup           5 ms   in-memory hash, O(1)
  context retrieval (BM25)          35 ms   HARD TIMEOUT ─► skip
  model inference (30 tok)          80 ms   int4, prefix KV reuse
  streaming overhead                15 ms   chunked, Nagle off
  tail buffer                       15 ms   reserved for P99
  ──────────────────────────────────────────────────────────────────
  TOTAL                            200 ms

  FIM vs LEFT-TO-RIGHT - why a general model will not do

  ┌───────────────────────────────────────────────────────────────┐
  │   def calculate_tax(amount, rate):                            │
  │       ▮  ◄── cursor                                           │
  │       return result                                           │
  │                                                               │
  │ LEFT-TO-RIGHT sees only the prefix.                           │
  │   emits "pass" or "result = 0" ─► conflicts with the return   │
  │                                                               │
  │ FILL-IN-THE-MIDDLE sees prefix AND suffix.                    │
  │   emits "result = amount * rate" ─► consistent                │
  │                                                               │
  │ This needs FIM training, not prompting. It is a model         │
  │ selection constraint, not a prompt engineering choice.        │
  └───────────────────────────────────────────────────────────────┘

  PREFIX CACHING - buys back ~60 ms

   typing ──► server pre-fills KV for current file context
   idle fires ──► only the new cursor region needs computing
   ┌───────────────────────────────────────────────────────────┐
   │ without: re-prefill 2 000 tokens every request  ~60 ms    │
   │ with:    reuse cached prefix, compute delta only  ~5 ms   │
   │ vLLM PagedAttention supports this natively                │
   └───────────────────────────────────────────────────────────┘
`),
      },
      {
        title: "Evaluation: Offline Selection, Online Value",
        content:
          "Separate the metrics used to choose a model from the metrics used to judge the deployed system, because they answer different questions and disagree more often than people expect.\n\nOffline, use pass@k on benchmarks with executable tests - HumanEval, MBPP, SWE-bench - since whether generated code passes its tests is the only offline signal that is not a proxy. Supplement with exact-match rate against what the developer eventually wrote, and with edit distance between the suggestion and the final code. Edit distance is the underrated one: a completion that was rejected but required only two character changes is far more valuable than one rejected outright, and accept rate alone cannot see that difference.\n\nOnline, accept rate is the North Star, but report meaningful accept rate restricted to completions of five or more tokens so that closing braces and semicolons do not inflate it. Track quality of accepted code as well - lint errors and test coverage on accepted completions - because a high accept rate for code that later fails review is a negative outcome being reported as a positive one. The strongest measurement is a controlled A/B on throughput, comparing developers with and without the assistant enabled.\n\nThere is a structural constraint worth naming. If customer code cannot be retained, you cannot retrain or even evaluate on it, so offline evaluation runs entirely on public benchmarks that may not resemble the customer's domain, framework or house style. That gap is real and unfixable within the privacy constraint; the honest mitigation is heavier weighting on online metrics, which do reflect the customer's actual code even though nothing is retained.",
        diagram: asciiDiagram(`
  TWO EVALUATION REGIMES

  OFFLINE - choose the model
  ┌───────────────────────────────────────────────────────────────┐
  │ pass@k on HumanEval / MBPP / SWE-bench                        │
  │   ▲ only offline signal that is not a proxy - tests execute   │
  │ exact-match rate vs what the dev eventually wrote             │
  │ edit distance to final code                                   │
  │   ▲ underrated: "rejected but 2 chars away" ≠ "rejected"      │
  └───────────────────────────────────────────────────────────────┘

  ONLINE - judge the deployment
  ┌───────────────────────────────────────────────────────────────┐
  │ accept rate                    ─ North Star                   │
  │ MEANINGFUL accept rate (5+ tok) ─ report this one             │
  │   ▲ raw rate is inflated by braces and semicolons             │
  │ lint errors / test coverage on ACCEPTED code                  │
  │   ▲ accepted-then-reverted is a failure reported as success   │
  │ A/B on developer throughput    ─ the real question            │
  └───────────────────────────────────────────────────────────────┘

  ┌───────────────────────────────────────────────────────────────┐
  │ STRUCTURAL GAP: if code cannot be retained, offline eval runs │
  │ only on public benchmarks that may not match the customer's   │
  │ domain, frameworks or style. Unfixable inside the privacy     │
  │ constraint - so weight online metrics more heavily and say so.│
  └───────────────────────────────────────────────────────────────┘
`),
      },
      {
        title: "Failure Modes and Graceful Degradation",
        content:
          "Inference server unavailable. The plugin degrades to no-completion mode and the developer keeps typing normally. Show an unobtrusive status indicator rather than a modal error - an assistant that interrupts on failure is worse than one that is quietly absent.\n\nLatency overrun. If the developer has typed two or more characters since the idle timer fired, the in-flight completion is stale by construction. Cancel it and drop the response silently. Rendering a suggestion computed for a cursor position two characters ago is the most jarring failure this product has, because it looks like the assistant is confused rather than late.\n\nCompletion conflicts with existing code. The model suggests something contradicting a signature or type visible in the suffix. This is a model quality failure rather than a system failure, and the mitigation is a cheap post-generation check: parse the completion together with the suffix, and suppress it if the AST does not parse. Suppressing a suggestion costs nothing; showing syntactically broken code costs trust.\n\nIndex staleness. A function written ten seconds ago is not yet indexed, so retrieval cannot find it. The mitigation is a priority ordering rather than faster indexing: the current file is always in the context window and always current, so rank current-file context above retrieved context. Most of what a developer needs while writing a function is within a few hundred lines of the cursor, which is exactly the region that never goes stale.",
        diagram: asciiDiagram(`
  FAILURE MODES

  ┌────────────────────┬─────────────────┬──────────────────────────┐
  │ FAILURE            │ WRONG RESPONSE  │ CORRECT DEGRADATION      │
  ├────────────────────┼─────────────────┼──────────────────────────┤
  │ server unavailable │ modal error     │ silent no-completion +   │
  │                    │ dialog          │ small status indicator   │
  ├────────────────────┼─────────────────┼──────────────────────────┤
  │ response too slow  │ render it       │ cancel if ≥2 chars typed │
  │                    │ anyway          │ since the timer fired    │
  │                    │ ▲ looks confused│ drop silently            │
  ├────────────────────┼─────────────────┼──────────────────────────┤
  │ completion         │ show broken     │ parse completion+suffix; │
  │ conflicts w/ suffix│ code            │ suppress if AST fails    │
  ├────────────────────┼─────────────────┼──────────────────────────┤
  │ index stale        │ index faster    │ rank CURRENT FILE above  │
  │ (fn written 10 s   │ (never wins the │ retrieved context - it   │
  │  ago)              │  race)          │ is never stale           │
  └────────────────────┴─────────────────┴──────────────────────────┘

  ┌───────────────────────────────────────────────────────────────┐
  │ Every degradation here is "show less, on time" rather than    │
  │ "show more, late". That ordering is the product.              │
  └───────────────────────────────────────────────────────────────┘
`),
      },
      {
        title: "Cost and Tradeoffs: Three Decisions Worth Defending",
        content:
          "Self-hosted 7B versus a frontier API. The API is rejected on the privacy constraint - customer code cannot leave the VPC, and for most enterprise legal teams a data processing agreement does not close that gap for source code specifically. A self-hosted StarCoder2-7B or CodeLlama-7B at int4 on an A10G lands within roughly 5-8 percent of frontier quality on HumanEval for completion-shaped tasks, and amortises favourably over a six-month horizon at this request volume. Note that the quality gap is narrower for completion than for reasoning, which is exactly why the small model is acceptable inline and a larger one is used for chat.\n\nFIM-specialised versus general-purpose model. For inline, a general model is rejected outright because FIM requires training with explicit prefix and suffix segments; without it you are generating left-to-right and ignoring everything below the cursor. For chat, where the model is asked questions rather than asked to complete mid-file, a general instruct-tuned code model is the better choice. Two modes, two models, for a concrete reason.\n\nOn-device versus server-side inference. Local inference on a high-end Apple silicon machine runs a 7B at int4 around 800 tokens per second, which comfortably covers a 30-token completion, with zero network latency and perfect privacy. It is rejected as the default on three grounds: hardware heterogeneity, since Windows laptops with 8 GB of VRAM cannot run it at all; the operational burden of shipping model updates to thousands of endpoints; and the loss of shared prefix caching across developers working in the same repository, which is a real efficiency at team scale. Offer it as an option for capable hardware, default to server-side.",
        diagram: asciiDiagram(`
  THREE DECISIONS, WITH WHAT WAS REJECTED AND WHY

  ┌───────────────────────────────────────────────────────────────┐
  │ 1 · SELF-HOSTED 7B   over   frontier API                      │
  │     rejected: code cannot leave the VPC; a DPA does not       │
  │     close the gap for source code in most legal reviews       │
  │     accepted cost: ~5-8% behind on HumanEval                  │
  │     ▲ gap is narrower for COMPLETION than for REASONING -     │
  │       which is why small inline, larger for chat              │
  ├───────────────────────────────────────────────────────────────┤
  │ 2 · FIM-SPECIALISED (inline)   over   general model           │
  │     FIM needs prefix/suffix training - not promptable         │
  │     without it, generation ignores everything below cursor    │
  │     chat uses a general instruct code model: no FIM needed    │
  │     ▲ two modes, two models, for a stated reason              │
  ├───────────────────────────────────────────────────────────────┤
  │ 3 · SERVER-SIDE   over   on-device (default)                  │
  │     on-device is genuinely good: ~800 tok/s on M-series,      │
  │     zero network, perfect privacy                             │
  │     rejected as DEFAULT because:                              │
  │       ► 8 GB Windows laptops cannot run it at all             │
  │       ► shipping model updates to N endpoints                 │
  │       ► loses shared prefix cache across a team's repo        │
  │     offer it as an option; default to server                  │
  └───────────────────────────────────────────────────────────────┘
`),
      },
    ],
    examples: [
      {
        title: "Working the latency budget when retrieval blows the tail",
        input:
          "Measured P99: network 38 ms, context assembly 9 ms, cache 4 ms, BM25 retrieval 95 ms, inference 78 ms, streaming 14 ms. Total P99 = 238 ms against a 200 ms budget. P50 is 145 ms and healthy.",
        output:
          "Retrieval is the sole overrun: its P50 is 22 ms but its P99 is 95 ms. Enforcing a 35 ms hard timeout with graceful skip caps the stage at 35 ms, bringing P99 to 178 ms. Approximately 8 percent of requests then proceed without retrieved context.",
        explanation:
          "Step 1: Compare P50 and P99 per stage rather than in aggregate - every stage except retrieval has a tight distribution, which localises the problem immediately. Step 2: Retrieval's 22 ms median against a 95 ms tail is the signature of a variable-cost stage, here driven by repository size and index cache state. Step 3: The wrong fix is optimising BM25, because that improves the median you did not need and leaves the tail shape unchanged. Step 4: The right fix is a hard timeout that converts a latency problem into a quality problem on 8 percent of requests - and quality degradation on a minority beats missing the budget on all of them, because a late completion is worth zero. Step 5: Measure the accept rate of the skipped 8 percent separately; if it is close to the retrieved population's, retrieval is contributing less than assumed and the timeout can be tightened further.",
      },
      {
        title: "FIM versus left-to-right on a mid-file cursor",
        input:
          "File contains a function definition, a cursor on the blank line inside it, and a `return result` statement two lines below the cursor.",
        output:
          "Left-to-right generation, seeing only the prefix, emits `pass` or `result = 0` - the first conflicts with the return below, the second is a plausible but useless stub. FIM, given both prefix and suffix segments, emits `result = amount * rate`, which satisfies the return statement it can see.",
        explanation:
          "Step 1: The cursor in real editing is almost never at end of file, so the suffix is available context in the overwhelming majority of completions. Step 2: A left-to-right model has no mechanism to condition on it - this is architectural, not a prompting deficiency, so no amount of instruction repairs it. Step 3: FIM training reorders the document into prefix, suffix and middle segments with dedicated sentinel tokens, teaching the model to generate a middle consistent with both sides. Step 4: The practical consequence is that FIM capability is a hard model-selection criterion for inline completion, and it is the reason a purpose-built 7B code model outperforms a much larger general model at this specific task. Step 5: For chat this reverses entirely - the model is answering a question rather than filling a hole, so general instruction-following matters more than FIM and the larger general model wins.",
      },
      {
        title: "Prefix caching turning a missed budget into a met one",
        input:
          "Context is 2,000 tokens of current file. Prefill runs at roughly 33,000 tokens per second, so re-prefilling costs about 60 ms per request. Decode of 30 tokens costs about 9 ms.",
        output:
          "Without prefix caching: 60 ms prefill plus 9 ms decode equals 69 ms of model time, and the full budget totals about 203 ms - a miss. With prefix caching, the file context is pre-filled while the developer types, so only the changed cursor region is computed at roughly 5 ms, giving 14 ms of model time and a total near 148 ms.",
        explanation:
          "Step 1: Notice that decode is not the problem here - 30 tokens is genuinely cheap, and the cost is dominated by re-reading the same 2,000 tokens of context on every keystroke pause. Step 2: That context is almost identical between consecutive requests, since the developer typed a few characters, which makes it an ideal caching target. Step 3: PagedAttention's prefix caching detects the shared prefix and reuses its KV blocks, so only the delta is prefilled. Step 4: The saving of roughly 55 ms is over a quarter of the entire budget, obtained with no model change and no quality cost - which makes it the highest-leverage single optimisation in this design. Step 5: The cache is per-user and per-file and is worth roughly 200 MB, so size the serving fleet's memory for it explicitly rather than discovering the pressure under load.",
      },
    ],
    tips: [
      "Open with the latency budget, not the architecture. Saying that everything follows from 200 ms and then decomposing it component by component immediately frames the problem correctly and shows you know where the difficulty is.",
      "Insist on FIM for inline completion and explain why: the cursor is mid-file, and a left-to-right model structurally cannot condition on the suffix, so it generates code that conflicts with what already follows.",
      "Report meaningful accept rate, restricted to completions of five or more tokens. Raw accept rate is inflated by closing braces and semicolons and can be improved by making the product worse.",
      "Make every stage after the cache skippable with a hard timeout. A degraded completion delivered on time is worth far more than a perfect one delivered late, and this ordering should be visible in the design.",
      "Treat privacy as the constraint that sizes the model. If code cannot leave the VPC, you are self-hosting, and self-hosting inside 200 ms is what caps you at roughly 7B for inline.",
    ],
    tricks: [
      "Pre-fill the KV cache for the current file while the developer is still typing. When the idle timer fires only the cursor delta needs computing, which recovers roughly 60 ms - more than a quarter of the budget - for no quality cost.",
      "Cancel in-flight completions as soon as the developer types two more characters. The result is stale by construction, and rendering it makes the assistant look confused rather than merely slow.",
      "Run an AST parse of the completion concatenated with the suffix before rendering, and suppress on failure. Suppression is free; showing syntactically broken code costs user trust that takes weeks to rebuild.",
      "Rank current-file context above anything retrieved. The file is always current, and most of what a developer needs while writing a function lives within a few hundred lines of the cursor, so this sidesteps index staleness entirely rather than racing it.",
      "Measure each latency stage at P50 and P99 separately. Aggregate P99 tells you that you missed; per-stage percentiles tell you which stage has the fat tail, and it is almost always retrieval rather than inference.",
    ],
    memoryAids: [
      "It is a latency problem wearing ML clothes. Budget first, architecture second.",
      "Two modes, two systems: inline is 200 ms and invisible; chat is 5 s and conversational. They share GPUs, not requirements.",
      "FIM sees the suffix; left-to-right does not. Mid-file completion without FIM conflicts with the code below the cursor.",
      "Show less on time, never more late. Every stage past the cache is skippable.",
      "Meaningful accept rate means five or more tokens. Anything else can be gamed with semicolons.",
    ],
    interviewPatterns: [
      "'How do you hit a 200 ms P99 for inline completion?' The central question. Decompose the budget by stage, justify each allocation, and name the timeout-and-skip degradation.",
      "'Why can't you use GPT-4 for this?' Two independent reasons: the privacy constraint forbids code leaving the VPC, and even without it the round trip plus generation would not fit the budget.",
      "'What is fill-in-the-middle and why does it matter here?' Tests whether you understand that mid-file completion needs suffix conditioning, and that this is architectural rather than promptable.",
      "'How do you measure whether the assistant is actually helping?' Meaningful accept rate, quality of accepted code, and a controlled throughput A/B - plus the point that raw accept rate is gameable.",
      "'The completion index is always slightly stale. How do you handle it?' The answer is priority ordering rather than faster indexing: the current file is always fresh and is where most needed context lives.",
      "Frequency and companies: very common at GitHub, Cursor, Sourcegraph, JetBrains, Replit, Amazon and Google, and increasingly used as a generic latency-under-constraint design question elsewhere. Stability: high - the latency decomposition, FIM requirement and accept-rate metric are durable, while specific model names change every few months.",
    ],
    faq: [
      {
        question: "Why is 200 ms the budget rather than 500 ms? Where does the number come from?",
        answer:
          "It comes from perception, not engineering. A suggestion that appears within roughly 200 ms of the typing pause reads as part of the editor; beyond about 400 ms it reads as a separate thing that happened to you, and developers begin typing through it. Once they type through completions habitually, the accept rate collapses regardless of model quality, because the suggestion is arriving after the decision it was meant to inform. This is why the budget is treated as a hard constraint rather than a target to be traded against quality - a 500 ms system with a much better model is not a better product, it is a worse one, because its suggestions are largely never seen. Chat is exempt precisely because the user has explicitly stopped to ask a question and is willing to wait.",
        category: "latency",
      },
      {
        question: "Can you not just use a bigger model and accept slightly higher latency?",
        answer:
          "Only within the budget, and the budget has less slack than the raw numbers suggest. A 7B at int4 needs about 9 ms to decode 30 tokens and a 13B about 17 ms, so on paper a 13B fits comfortably in the 80 ms inference slot. The problem is that the slot is not there to hold single-request decode time - it exists to absorb batching delay at 80 QPS on six GPUs, plus prefill when the cache misses, plus tail variance. Doubling model size roughly doubles both prefill cost and memory per request, which halves the effective batch size and pushes queueing latency up faster than decode latency. The honest framing is that model size trades against fleet size at fixed latency, so the question becomes whether the quality gain per GPU is worth it - and for completion specifically the 7B-to-13B gain is small.",
        category: "model-selection",
      },
      {
        question: "How do you keep the code index fresh when developers are editing constantly?",
        answer:
          "You do not fully, and the design should stop trying. A filesystem watcher triggers chunking and embedding on save or commit, and with content hashing only genuinely changed chunks are re-embedded, so steady-state cost is low. But there is always a window of seconds to minutes where recent edits are not retrievable, and that window cannot be closed by making indexing faster because the developer is editing faster than any pipeline can converge. The architectural answer is priority: the current file is passed in the context window directly and is always current, and it is ranked above anything retrieved. Since most of what a developer needs while writing a function lives within a few hundred lines of the cursor, the freshest content is exactly the content that never goes through the index at all.",
        category: "freshness",
      },
      {
        question: "Should the model be fine-tuned on the customer's own codebase?",
        answer:
          "It helps meaningfully when permitted, because house conventions, internal frameworks and naming patterns are exactly what a general model gets wrong, and they recur constantly. In practice permission is often withheld - a fine-tuned model is a lossy encoding of the training data, and enterprise legal teams treat weights derived from proprietary source as themselves proprietary and as a leakage risk if the model is ever shared across tenants. Where fine-tuning is refused, retrieval carries the load instead: pulling the customer's own functions into context gets a large part of the same benefit without any weights absorbing customer code, and it updates instantly when the code changes. If fine-tuning is permitted, insist on per-tenant adapters rather than a shared fine-tune, so that one customer's code can never influence another's completions.",
        category: "privacy",
      },
      {
        question: "How do you decide when to show no completion at all?",
        answer:
          "Suppression is a first-class output and should be designed rather than treated as failure. Suppress when the AST parse of completion plus suffix fails, since broken code costs more trust than silence. Suppress when the developer has typed past the trigger position, because the result is stale. Suppress when model confidence is low in genuinely ambiguous positions - a blank line at the start of a function body can be almost anything, and a confident guess there is usually wrong. The economics favour suppression more than people expect: a shown-and-rejected completion costs attention on every occurrence, while a suppressed one costs nothing, so the threshold should sit well above indifference. Teams that tune purely for accept rate systematically under-suppress, because suppression cannot raise the numerator.",
        category: "product",
      },
      {
        question: "How is the chat mode different from just embedding a general chatbot in the IDE?",
        answer:
          "The difference is context assembly, which is most of the engineering. A general chatbot sees the message; a useful IDE chat sees the current file in full, the conversation history, the top few semantically relevant functions retrieved from the repository, the relevant test files, the README and the dependency manifest. Assembling that costs about 200 ms and is what lets the model answer questions about this codebase rather than about programming in general. The model choice is comparatively unremarkable - a 13B code model or an instruct-tuned 8B - because at a 5 second budget the model is not the bottleneck. Candidates who spend the chat portion of the interview on model selection and skip context assembly have inverted the difficulty.",
        category: "architecture",
      },
    ],
    references: [
      {
        source: "paper",
        attribution: "Bavarian et al., 'Efficient Training of Language Models to Fill in the Middle', arXiv:2207.14255",
        insight: "The FIM training procedure and the finding that it costs essentially nothing in left-to-right capability - which is why purpose-built completion models can be FIM-trained without a quality tradeoff elsewhere.",
      },
      {
        source: "paper",
        attribution: "Chen et al., 'Evaluating Large Language Models Trained on Code' (Codex / HumanEval), arXiv:2107.03374",
        insight: "Introduces pass@k and the HumanEval benchmark, and makes the case for execution-based evaluation over surface-similarity metrics for generated code.",
      },
      {
        source: "paper",
        attribution: "Lozhkov et al., 'StarCoder 2 and The Stack v2', and the CodeLlama technical report",
        insight: "Concrete quality-versus-size data for FIM-capable open code models at 7B and above - the evidence base for choosing a small self-hosted model for inline completion.",
      },
      {
        source: "blog",
        attribution: "vLLM documentation on automatic prefix caching and PagedAttention",
        insight: "The mechanism behind reusing KV blocks across requests sharing a prefix, which is what makes the 60 ms re-prefill saving practical rather than theoretical.",
      },
      {
        source: "note",
        attribution: "Published telemetry and product write-ups on completion accept rates from commercial coding assistants.",
        insight: "Accept rate falls sharply with completion length, which is why the length-thresholded 'meaningful' variant is the only version of the metric that survives contact with product incentives.",
      },
    ],
    practiceProblems: [
      "BUDGET REALLOCATION. Measured stage P99s: network 38, assembly 9, cache 4, retrieval 95, inference 78, streaming 14 - total 238 ms against 200. P50 is 145 ms. Find the fix. ANSWER: Only retrieval has a fat tail, with P50 at 22 ms and P99 at 95 ms; every other stage is tight. Optimising BM25 improves a median you did not need. The correct fix is a 35 ms hard timeout with graceful skip, which caps the stage and brings P99 to about 178 ms while roughly 8 percent of requests proceed on file context alone. Then measure the accept rate of the skipped population separately - if it tracks the retrieved population, retrieval is contributing less than assumed and the timeout can be tightened further, freeing budget for a larger model.",
      "SIZING FOR 5,000 DEVELOPERS. The deployment grows tenfold from 500. What changes and what does not? ANSWER: Inline peak moves from about 80 to about 800 QPS and the GPU fleet scales roughly linearly to 50-60 A10Gs, since inline is throughput-bound and batches well. Chat scales to about 200 QPS peak and needs its own pool. What does not change is the per-request latency budget, which is a property of human perception rather than of scale. Two things become materially harder: the per-repository index count grows and its memory footprint must be managed with lazy loading and eviction of inactive repositories, and prefix-cache hit rates improve rather than degrade because more developers work in the same repositories. The honest headline is that this system scales out cleanly - the hard constraint was never throughput.",
      "PRIVACY VARIANT. The customer additionally forbids any completion request leaving the developer machine, even to their own VPC. Redesign. ANSWER: This forces on-device inference. A 7B at int4 needs roughly 3.5 GB of VRAM or unified memory and runs about 800 tokens per second on Apple silicon, so a 30-token completion is about 37 ms with zero network cost, which actually widens the budget. What is lost: hardware heterogeneity means low-spec Windows laptops need a smaller model, perhaps 1-3B, with a real quality drop that must be disclosed rather than hidden; model updates must be distributed to every endpoint; and shared prefix caching across a team disappears entirely, so each developer pays full prefill. The index must also move on-device, which is fine at 307 MB per repository. Recommend a tiered offering with capability detection at install time, and be explicit that quality is hardware-dependent under this constraint.",
      "ACCEPT RATE IS UP, DEVELOPERS ARE UNHAPPY. Meaningful accept rate rose from 24 to 31 percent after a model change, but developer satisfaction fell and revert rates on assistant-authored lines rose. Diagnose. ANSWER: Accept rate measures whether a suggestion was taken, not whether it was correct. A model tuned toward confident, plausible, conventional completions will be accepted more often while being subtly wrong more often - accepted-then-reverted is a failure counted as a success. Check three things: lint and type-error rates on accepted completions, the revert rate within some window after acceptance, and test pass rates on accepted code. The fix on the metric side is to define accept rate as accepted-and-retained after a window rather than accepted at the keystroke. The fix on the model side is usually calibration - the new model is over-confident in ambiguous positions where suppressing the suggestion would have been correct.",
      "WHY NOT ONE MODEL FOR BOTH MODES? Argue both sides and decide. ANSWER: For one model: operational simplicity, one checkpoint to version and evaluate, better GPU pooling across the two workloads, and a single quality bar to defend. Against: inline needs FIM training that chat does not use, and chat needs instruction-following and long-context reasoning that inline never exercises; the size that fits 200 ms is well below the size chat can afford; and pooling is less valuable than it looks because the two peaks coincide during business hours. Decision: two models. The deciding argument is FIM - it is a training-time property, so a single model must either carry FIM training it does not need for chat or forgo it and be structurally wrong for inline. Sharing infrastructure while separating checkpoints captures most of the operational benefit without that compromise.",
    ],
  },
];
