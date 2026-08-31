import { Topic } from "../syllabus";
import { asciiDiagram } from "./_shared";

// Module: mod-ai-agents-architecture — "AI: Agents, Tool Use & App Architecture"
// 10 topics covering: agent spectrum, tool/function calling, workflow patterns,
// ReAct planning loops, agent memory, multi-agent systems, failure modes,
// human-in-the-loop, security/prompt injection, and evaluation/observability.
export const aiAgentsTopics: Topic[] = [
  {
      id: "topic-ai-agents-what-is-an-agent",
      moduleId: "mod-ai-agents-architecture",
      title: "What an Agent Actually Is: The Spectrum from Single Prompt to Autonomous Loop, and When You Do NOT Need One",
      intuition: "An agent is a point on a spectrum of runtime autonomy, not a magical binary category. The key engineering question is how much control flow the model should own after seeing intermediate results. Most production tasks are solved more cheaply and reliably with workflows than with autonomous loops, so strong designs start by minimising autonomy.",
      complexity: {
        time: "Latency grows with loop depth because every extra step adds another model call and often another tool call, turning a one-shot task into a multi-turn interaction.",
        space: "Each step appends observations and results to the transcript, so deep loops consume context quickly and often need compaction before the formal window limit is hit."
      },
      lesson: [
        {
          title: "The autonomy spectrum",
          content: "A useful ladder is Level 0 single prompt, Level 1 fixed chain, Level 2 router, Level 3 tool-using agent, and Level 4 autonomous loop. The higher the level, the more runtime flexibility the model gets, but the more you pay in latency, cost, and debuggability. Interviewers care most about whether you can justify the lowest level that still solves the job.",
          diagram: asciiDiagram(`◄── More predictable · cheaper · safer ──────────────────────────────►
  Level 0        Level 1         Level 2         Level 3          Level 4
  Single prompt  Fixed chain     Router          Tool user        Autonomous loop
  [LLM]──►out    [LLM]──►[LLM]   [LLM]──►A/B    [LLM]──►tool──►obs  [LLM]──►tool──►obs──►replan`)
        },
        {
          title: "Who controls control flow",
          content: "The decisive distinction is who decides the next step. In a workflow, the engineer predefines the sequence and the model fills slots. In an agent, the model decides whether to search again, call a tool, stop, or escalate after it sees new information. Two systems can look similar to a user while being operationally very different."
        },
        {
          title: "When you do not need an agent",
          content: "If the step sequence is knowable in advance, hardcode it. If reliability, latency, cost predictability, or auditability matter most, prefer a workflow. Summarisation, extraction, classification, and standard retrieve-then-generate RAG are usually pipelines rather than agents because the right order of work is already known."
        },
        {
          title: "Reliability arithmetic",
          content: "End-to-end success is roughly per-step success raised to the number of required successful steps. That means even strong local performance becomes weak over long trajectories. The first mitigation is to reduce steps, the second is to add checkpoints, and only then should you focus on improving per-step quality.",
          diagram: asciiDiagram(`End-to-end success = p^n (per-step accuracy raised to number of steps)
  p = 0.99 → n=10 gives about 90%
  p = 0.95 → n=10 gives about 60%
  p = 0.90 → n=10 gives about 35%
  Long chains become fragile fast — reduce n before tuning p`)
        },
        {
          title: "When an agent is justified",
          content: "Agents earn their complexity when the next action truly depends on evidence discovered during execution. Interleaved retrieval and reasoning, open-ended research, and dynamic recovery in unknown environments are the clearest examples. A good heuristic is that if a skilled human would repeatedly need to decide what to do next after each observation, some agentic autonomy may be justified."
        }
      ],
      examples: [
        {
          title: "Classifying tasks",
          input: "Extract fields from a contract; research a company across many pages; write code, run tests, and iteratively fix failures.",
          output: "These map to Level 0 or 1, Level 3, and Level 4 respectively.",
          explanation: "The contract case has a fixed sequence and therefore needs only a workflow.\nStep 2: The research case depends on what each search result reveals, so tool-using autonomy helps.\nStep 3: The coding case is an autonomous loop because execution outcomes change what the next action should be."
        },
        {
          title: "Why p raised to n matters",
          input: "Per-step accuracy is 92 percent for a 3-step, 8-step, and 15-step agent.",
          output: "The approximate end-to-end success rates are 78 percent, 51 percent, and 29 percent.",
          explanation: "The local number sounds strong, but repeated decisions compound error quickly.\nStep 2: That is why long loops need checkpoints and budgets.\nStep 3: The lesson is not to ban agents but to keep n small and measured."
        }
      ],
      tips: [
        "Ask whether the step sequence can be predetermined before reaching for agent language.",
        "Use the five-level spectrum instead of vague 'agentic' wording.",
        "Quote p raised to n from memory because it grounds reliability in arithmetic.",
        "Arguing against unnecessary autonomy is often more impressive than proposing it."
      ],
      tricks: [
        "Offer a workflow first, then name the extra requirement that would force more autonomy.",
        "State expected steps, per-step quality, and target end-to-end success before approving a loop.",
        "Translate autonomy into latency and money, not only model cleverness.",
        "Cap every real agent with a hard step budget and a cost ceiling."
      ],
      memoryAids: [
        "Five levels: Prompt → Chain → Router → Tool-user → Autonomous loop.",
        "Workflows mean engineer-controlled sequence; agents mean model-controlled sequence.",
        "95 percent repeated ten times is only about 60 percent."
      ],
      interviewPatterns: [
        "How would you decide whether a task needs an agent or a simpler pipeline?",
        "What is the real difference between a workflow and an agent?",
        "What are the reliability costs of increasing loop depth?",
        "Frequency and companies: foundational topic at AI-product teams such as Anthropic, OpenAI, Google DeepMind, Meta, Microsoft, Copilot, Cursor, and Perplexity; the strongest answer starts by explaining when not to use an agent."
      ],
      practiceProblems: [
        "SPECTRUM CLASSIFICATION: Classify these into Levels 0 to 4: summarise a document, classify an email into billing or support and send a fixed template, browse until enough evidence is found for a research answer, and write code then rerun tests until pass or budget exhaustion.\n\nANSWERS:\nSummarisation is Level 0. Routing to a fixed template is Level 2. Research browsing is Level 3 because the next search depends on observations. Autonomous code-fix loops are Level 4 and require sandboxing and strict budgets.",
        "RELIABILITY CALCULATION: Per-step accuracy is 88 percent. Estimate end-to-end success for n=5 and n=10, then say whether the 10-step version is acceptable for a task needing 80 percent reliability.\n\nANSWERS:\n0.88 to the 5th is about 53 percent and 0.88 to the 10th is about 28 percent. The 10-step version is nowhere near acceptable, so the design must reduce steps or add verification before continuing."
      ],
      faq: [
        {
          question: "What is the simplest precise definition of an agent?",
          answer: "An agent is a system in which the model decides some part of the control flow at runtime after seeing intermediate state, rather than only filling slots in a predetermined sequence.",
          category: "concepts"
        },
        {
          question: "When should I choose a workflow instead?",
          answer: "Choose a workflow when the action sequence is knowable in advance or when reliability, latency, cost predictability, or auditability matter more than flexibility. That covers a surprisingly large fraction of production AI work.",
          category: "design"
        },
        {
          question: "Is standard RAG an agent?",
          answer: "Usually no. Standard RAG is a retrieve-then-generate workflow with a fixed order of steps. It becomes agentic only when the model decides whether to retrieve, how to query, and whether the retrieved evidence is sufficient.",
          category: "concepts"
        },
        {
          question: "Why does loop depth matter so much?",
          answer: "Because end-to-end success compounds across steps. Even strong local performance can become weak globally once you require many correct sequential decisions, and the same loop also adds latency and cost at every step.",
          category: "failure-modes"
        },
        {
          question: "Do frameworks matter for this topic?",
          answer: "Only at awareness level. Interviewers want the control-flow pattern first, then perhaps one framework name as an implementation detail. The pattern is what remains stable over time.",
          category: "meta"
        }
      ],
      references: [
        {
          source: "blog",
          attribution: "Anthropic — Building Effective Agents (2024) - https://www.anthropic.com/research/building-effective-agents",
          insight: "Canonical workflow-versus-agent framing and the best concise explanation of why minimal autonomy usually wins."
        },
        {
          source: "blog",
          attribution: "Chip Huyen — Agents (2025) - https://huyenchip.com/2025/01/07/agents.html",
          insight: "Strong engineering perspective on when agents help and when they only add cost and fragility."
        },
        {
          source: "blog",
          attribution: "Lilian Weng — LLM-powered Autonomous Agents (2023) - https://lilianweng.github.io/posts/2023-06-23-agent/",
          insight: "Useful taxonomy for planning, memory, and tools behind most interview vocabulary."
        },
        {
          source: "paper",
          attribution: "Liu et al. — Lost in the Middle (2023) - https://arxiv.org/abs/2307.03172",
          insight: "Important evidence behind context rot in long agent loops."
        }
      ]
    },
  {
      id: "topic-ai-agents-tool-calling",
      moduleId: "mod-ai-agents-architecture",
      title: "Tool and Function Calling: Schema Design, Parallel Calls, Error Handling, Result Formatting, Model Tool Selection, and Too-Many-Tools Degradation",
      intuition: "Tool calling is the contract between a language model and the outside world. The model never executes code itself; it emits a structured request, and your runtime decides what to run, how to validate it, and how to return the result. Because the model only sees the schemas you expose, schema design is one of the most leverage-heavy skills in agent engineering.",
      complexity: {
        time: "Sequential tool calls add their latencies, while independent parallel calls collapse to the slowest branch; the biggest speedups often come from concurrency rather than better prompting.",
        space: "Every tool result consumes context tokens, so raw API payloads can crowd out reasoning. Most systems should cap tool-result verbosity and reserve only a minority of context for tool outputs."
      },
      lesson: [
        {
          title: "How tool calling works",
          content: "The application sends messages plus tool definitions. The model either answers directly or emits one or more tool-call objects with a name and arguments. Your code validates the arguments, executes the tool, then returns the tool result as another message. The model reads that result and either answers or asks for another tool.",
          diagram: asciiDiagram(`1. Developer sends messages + tool definitions
           │
           ▼
   2. Model emits tool-call JSON (name + arguments)
           │
           ▼
   3. Runtime validates and executes the tool
           │
           ▼
   4. Tool result appended as a message
           │
           ▼
   5. Model reads result → answers or calls another tool`)
        },
        {
          title: "Schema design is selection design",
          content: "Good names are specific verb phrases, descriptions include both positive scope and negative boundaries, and parameters are tightly typed with examples for tricky formats. Weak names and vague descriptions force the model to guess. Enums, defaults, and a low required-parameter count often improve first-call accuracy more than prompt tinkering.",
          diagram: asciiDiagram(`BAD: name="search",  params: q (str), k (int)
  GOOD: name="search_product_docs",  params: query (str, with example), max_results (int, default 3)
  BAD: description="Search database"
  GOOD: description includes positive use-case + "Do NOT use for general knowledge"
  Result: fewer wrong tool calls, fewer format errors, clearer selection signal`)
        },
        {
          title: "Parallel calls",
          content: "If one tool call does not depend on another tool's output, run them together. Three 300 millisecond tools cost roughly 900 milliseconds sequentially and 300 milliseconds in parallel. This is a rare optimisation that improves perceived latency without changing the model itself."
        },
        {
          title: "Recovery-friendly errors and result formatting",
          content: "A useful tool error says what failed, what was attempted, whether retrying is sensible, and what alternative action is suggested. Result payloads should be flattened, trimmed, and explicit about empty states so the model can reason over them cheaply and accurately."
        },
        {
          title: "Too many tools",
          content: "Large tool menus degrade both context efficiency and selection quality, especially when names are similar. Practical fixes are dynamic retrieval of a small relevant subset, a meta-tool that lists relevant tools first, or specialised agents with narrow toolboxes."
        }
      ],
      examples: [
        {
          title: "Good schema versus bad schema",
          input: "Compare a vague tool called search with params q and k against a tool called search_product_docs with an explicit query field and a 'do not use' boundary.",
          output: "The second schema yields better first-call accuracy and fewer spurious retrievals.",
          explanation: "Tool descriptions act like prompts and names carry strong priors for the model.\nStep 2: Boundary conditions tell the model when not to call the tool.\nStep 3: Parameter examples reduce formatting mistakes before runtime validation ever fires."
        },
        {
          title: "Parallel finance lookups",
          input: "The agent needs price, recent news, and analyst rating for three companies and each tool call takes 250 milliseconds.",
          output: "Nine independent calls can finish in roughly 250 milliseconds if fully parallel rather than 2250 milliseconds sequentially.",
          explanation: "Nothing in the dependency graph forces those calls to wait on one another.\nStep 2: A concurrent runner therefore gives a large latency win without any model change.\nStep 3: If provider limits require batching, two parallel rounds are still far better than nine sequential calls."
        }
      ],
      tips: [
        "Write tool descriptions with the same care as prompts.",
        "Include a negative boundary in every tool description.",
        "Validate arguments in code before execution.",
        "Trim and flatten results before sending them back to the model."
      ],
      tricks: [
        "If the agent picks the wrong tool, inspect tool names first because name collisions are common root causes.",
        "Add one concrete format example to any tricky field such as dates or timestamps.",
        "Convert constrained strings to enums whenever possible.",
        "Start dynamic tool retrieval with a small K such as 5 and widen only when evaluation shows misses."
      ],
      memoryAids: [
        "Model emits JSON; your code executes; result returns; model decides again.",
        "Schema checklist: clear verb name, boundary, typed params, enums, examples.",
        "Sequential latency sums, parallel latency takes the max."
      ],
      interviewPatterns: [
        "How does function calling actually work at the API level?",
        "How would you design tool schemas so the model chooses the right tool?",
        "My agent has 40 tools and keeps calling the wrong one. What would you change first?",
        "Frequency and companies: core production-agent topic at Copilot-style, enterprise AI, support automation, and API-heavy product teams because it tests operational toolcraft rather than abstract prompting."
      ],
      practiceProblems: [
        "SCHEMA DESIGN: Design a tool for creating a calendar event with title, start time, optional end time, optional location, attendees, and an optional send_invites flag. Explain the critical schema choices.\n\nANSWERS:\nA good answer uses a verb-noun name such as create_calendar_event, says not to use it for listing events, requires title and start_time, uses an array for attendees, documents ISO 8601 with examples, and gives send_invites a sensible default.",
        "ERROR HANDLING: A tool fetching a webpage gets HTTP 429. What should the returned error object contain?\n\nANSWERS:\nIt should name the failure, include the attempted URL, mark whether the failure is recoverable, include a retry_after value if known, and suggest the next action such as retry later or use a different search tool."
      ],
      faq: [
        {
          question: "How does the model choose a tool?",
          answer: "It sees the conversation plus tool names, descriptions, and parameter schemas, then generates either plain text or a tool-call structure as part of normal next-token generation.",
          category: "mechanisms"
        },
        {
          question: "What if the model emits invalid arguments?",
          answer: "The runtime should reject them with a structured error explaining what was wrong and what the expected format is. Validation belongs in code, not in hope.",
          category: "error-handling"
        },
        {
          question: "How should tool results be formatted?",
          answer: "Return only the fields needed for the current decision, flatten deep nesting, trim noisy payloads, and label empty states clearly. Tool outputs are for model reasoning, not raw API fidelity.",
          category: "implementation"
        },
        {
          question: "Why do large tool menus hurt quality?",
          answer: "Many similar tools increase ambiguity and consume context. Once the model must distinguish among a large catalog of similar names, first-call accuracy falls even if the correct tool is present.",
          category: "failure-modes"
        },
        {
          question: "How is tool calling different from JSON mode?",
          answer: "JSON mode constrains output format for one response, while tool calling is a multi-turn interaction pattern in which the model can request external actions, read results, and continue reasoning. Many systems use both together.",
          category: "concepts"
        }
      ],
      references: [
        {
          source: "blog",
          attribution: "OpenAI — Function Calling Guide - https://platform.openai.com/docs/guides/function-calling",
          insight: "Canonical provider documentation for tool schemas and the tool-call loop."
        },
        {
          source: "blog",
          attribution: "Anthropic — Tool Use Documentation - https://docs.anthropic.com/en/docs/build-with-claude/tool-use",
          insight: "Useful provider reference for schema design and parallel tool use."
        },
        {
          source: "paper",
          attribution: "Patil et al. — Gorilla (2023) - https://arxiv.org/abs/2305.15334",
          insight: "Important background on LLM interaction with large tool and API spaces."
        },
        {
          source: "blog",
          attribution: "Chip Huyen — Agents, tools section (2025) - https://huyenchip.com/2025/01/07/agents.html",
          insight: "Practical discussion of schema quality and large tool catalogs."
        }
      ]
    },
  {
      id: "topic-ai-agents-workflow-patterns",
      moduleId: "mod-ai-agents-architecture",
      title: "Agent Workflow Patterns: Prompt Chaining, Routing, Parallelisation, Orchestrator-Worker, and Evaluator-Optimiser",
      intuition: "The common workflow patterns are the periodic table of applied AI systems. Strong candidates do not just name them; they recognise which pattern fits a requirement, why the alternatives are worse, and what failure mode each pattern introduces. All five patterns keep the control graph in developer hands, which is why they are usually cheaper and more testable than open-ended agents.",
      complexity: {
        time: "Prompt chains add latency step by step, routing adds one classification hop, parallel branches collapse to the slowest branch plus synthesis, and evaluator-optimiser loops multiply generation and scoring cost by iteration count.",
        space: "Workflows accumulate intermediate outputs, so efficient designs pass forward only the necessary state rather than replaying entire transcripts at every stage."
      },
      lesson: [
        {
          title: "Workflows before agents",
          content: "All five patterns are workflows because the engineer defines the possible transitions ahead of time. That makes them easier to test, observe, and budget. Interviews often reward candidates who decompose a requirement into workflow primitives before they ever mention autonomous loops."
        },
        {
          title: "Prompt chaining and routing",
          content: "Prompt chaining breaks a hard task into simpler sequential calls, each with a narrower role. Routing classifies an input and dispatches it to a specialised handler, which can also be a cost-control mechanism when simple cases go to a cheaper model. The main risks are error propagation for chains and misclassification for routers.",
          diagram: asciiDiagram(`Prompt chain with gates
  USER ──► [step 1] ──gate──► [step 2] ──gate──► [step 3] ──► result
                   validate             validate
  Routing
  USER ──► [router] ──► billing lane
                    ──► bug lane
                    ──► feature lane
                    ──► fallback lane   (all paths predefined)`)
        },
        {
          title: "Parallelisation",
          content: "Parallelisation comes in two forms: sectioning and voting. Sectioning splits independent parts of a task and synthesises them later, while voting runs multiple attempts at the same task and aggregates them. The speed win is real only when the branches are genuinely independent."
        },
        {
          title: "Orchestrator-worker",
          content: "Use orchestrator-worker when the task is too broad for one context window or naturally decomposes into bounded subtasks. The orchestrator defines the jobs and assembles the outputs. The characteristic failure mode is starving workers of the context or schema they need to produce useful bounded outputs.",
          diagram: asciiDiagram(`Goal: "competitive analysis across vendors"
           │
           ▼
     ┌──────────────┐
     │ ORCHESTRATOR │  decomposes into subtasks
     └──────────────┘
      │       │       │
      ▼       ▼       ▼
  [Worker] [Worker] [Worker]   ← parallel, each with narrow context
  vendor A  vendor B  vendor C
      │       │       │
      └───────┴───────┘
              │ bounded outputs
              ▼
     ┌──────────────┐
     │ ORCHESTRATOR │  assembles final result
     └──────────────┘`)
        },
        {
          title: "Evaluator-optimiser",
          content: "Evaluator-optimiser is a deliberate improve-and-score loop. It is worth the extra cost only when there is a meaningful rubric, test, or checker. Its classic failure mode is letting the generator and evaluator share the same blind spots or looping too long for marginal quality gains."
        }
      ],
      examples: [
        {
          title: "Support inbox architecture",
          input: "A system must handle billing, bugs, feature requests, and general questions with different prompts and escalation rules.",
          output: "Use routing with specialised handlers and a fallback path.",
          explanation: "The hard problem is classifying the request into the right handling policy, not open-ended exploration.\nStep 2: Routing keeps downstream prompts small and specialised.\nStep 3: A fallback path controls the main failure mode, which is misclassification."
        },
        {
          title: "Competitive analysis across several vendors",
          input: "Create the same structured report for five vendors and then produce one synthesis memo.",
          output: "Use orchestrator-worker with one bounded worker per vendor and a final synthesiser.",
          explanation: "The work decomposes naturally by entity and can run in parallel.\nStep 2: Workers avoid context overflow by focusing on one vendor at a time.\nStep 3: The orchestrator performs the comparison after the bounded outputs arrive."
        }
      ],
      tips: [
        "Map a requirement to a workflow pattern before reaching for agent language.",
        "Name the characteristic failure mode of the pattern you choose.",
        "Gate expensive chains where bad intermediate outputs would poison later work.",
        "Keep router labels crisp and mutually distinct."
      ],
      tricks: [
        "If the task can be parallelised, rewrite latency as slowest branch plus synthesis time.",
        "Use orchestrator-worker when one prompt would overflow context or mix too many subgoals.",
        "Use evaluator-optimiser only when you can define a credible rubric.",
        "A router can also be a cost controller by steering easy inputs to cheaper models."
      ],
      memoryAids: [
        "Chain for sequence, router for choice, parallel for independence, orchestrator for decomposition, evaluator for refinement.",
        "All five are workflows because the engineer defines the graph.",
        "Chain propagates, router misclassifies, evaluator overloops."
      ],
      interviewPatterns: [
        "Which workflow pattern fits this requirement and why?",
        "When would you choose orchestrator-worker over one larger prompt?",
        "How is a router different from an agent?",
        "Frequency and companies: frequent AI-system-design topic because it tests pattern recognition and trade-offs rather than framework trivia."
      ],
      practiceProblems: [
        "PATTERN MATCHING: Choose the best pattern for classify-then-handle support tickets, translate-then-summarise a document, summarise five independent sections then combine, and refine a draft against a rubric until it passes.\n\nANSWERS:\nThese map to routing, prompt chaining, parallel sectioning, and evaluator-optimiser. The justification should mention choice, sequence, independence, and iterative quality improvement respectively.",
        "FAILURE ANALYSIS: A prompt chain silently passes bad extraction output into expensive downstream generation. What should change?\n\nANSWERS:\nInsert a validation gate after extraction and retry or abort if required fields are missing or low-confidence. The design mistake is not only the weak extractor but the lack of a checkpoint before later steps amplify the error."
      ],
      faq: [
        {
          question: "Are workflow patterns agents?",
          answer: "No. They are workflows because the engineer defines the possible transitions and sequence structure in advance. The model may classify or generate inside the structure, but it does not own open-ended control flow.",
          category: "concepts"
        },
        {
          question: "When is prompt chaining better than one big prompt?",
          answer: "When the task has distinct subgoals, needs different instructions at different stages, or benefits from validating intermediate outputs before continuing. It adds control at the cost of extra latency and handoff risk.",
          category: "design"
        },
        {
          question: "What is the main risk in routing?",
          answer: "Misclassification. A specialised handler can only help if the request reaches the right lane, which is why low-confidence fallback logic matters.",
          category: "failure-modes"
        },
        {
          question: "How do I know if a task is safe to parallelise?",
          answer: "Check whether each branch can complete correctly without needing another branch's output. If branches secretly depend on shared hidden context, assumed parallelism will create inconsistency rather than speed.",
          category: "design"
        },
        {
          question: "Why is evaluator-optimiser not always worth it?",
          answer: "Because it adds latency and cost every time, and without a strong rubric it can become performative looping. Use it when quality can be credibly measured, not just vaguely discussed.",
          category: "trade-offs"
        }
      ],
      references: [
        {
          source: "blog",
          attribution: "Anthropic — Building Effective Agents (2024) - https://www.anthropic.com/research/building-effective-agents",
          insight: "Source of the five workflow-pattern framing used in many interviews."
        },
        {
          source: "blog",
          attribution: "Lilian Weng — LLM-powered Autonomous Agents (2023) - https://lilianweng.github.io/posts/2023-06-23-agent/",
          insight: "Useful supporting taxonomy for planning and decomposition concepts."
        },
        {
          source: "blog",
          attribution: "Chip Huyen — Agents (2025) - https://huyenchip.com/2025/01/07/agents.html",
          insight: "Pragmatic framing for when workflows beat open-ended autonomy."
        },
        {
          source: "interview-experience",
          attribution: "Common AI system design loops, 2024 to 2026",
          insight: "Candidates who pattern-match clearly usually outperform those who lead with frameworks or agent hype."
        }
      ]
    },
  {
      id: "topic-ai-agents-react-and-planning",
      moduleId: "mod-ai-agents-architecture",
      title: "ReAct and Planning Loops: Reason-Act-Observe, Plan-Then-Execute, Reflection and Self-Critique, and Loop Termination",
      intuition: "Agent loops need structure, not just a capable model. ReAct, plan-then-execute, and reflection are common ways to organise how an agent thinks, acts, absorbs observations, and retries after failure. In production, the most important part is usually not the clever loop itself but the controller that decides when the loop must stop.",
      complexity: {
        time: "ReAct pays one model call plus any tool latency per cycle, planning pays an up-front planning cost, and reflection adds extra attempts on failure paths, which can double runtime if budgets are weak.",
        space: "Thoughts, actions, observations, and reflections accumulate in context, so long loops need summarisation and strict limits long before the window is exhausted."
      },
      lesson: [
        {
          title: "ReAct basics",
          content: "ReAct stands for reason, act, and observe. The model keeps a short working thought, chooses an external action such as a tool call, reads the observation, and then decides the next step from that new evidence. It is powerful because it couples reasoning tightly to retrieval and execution.",
          diagram: asciiDiagram(`Goal in context
     │
     ▼
  ┌─────────┐
  │ Thought │  (working reasoning step)
  └─────────┘
       │
       ▼
  ┌─────────┐
  │ Action  │  (tool call or answer)
  └─────────┘
       │
       ▼
  ┌─────────────┐
  │ Observation │  (tool result)
  └─────────────┘
       │
       └──────────────► back to Thought (until controller stops loop)`)
        },
        {
          title: "Plan-then-execute",
          content: "Plan-then-execute asks the model to create a visible plan before acting. This helps when humans should review the plan or when several steps can run in parallel. The weakness is that plans go stale when observations contradict assumptions, so good systems allow replanning rather than blindly following a dead checklist."
        },
        {
          title: "Reflection and self-critique",
          content: "Reflection patterns treat failure as an explicit learning opportunity. After an unsuccessful attempt, the model stores a short lesson and uses it on the next try. This can improve a second attempt, but it does not eliminate blind spots because the same model is usually judging itself."
        },
        {
          title: "Hybrid control loops",
          content: "Many production systems plan once, then execute with local ReAct-style flexibility and trigger replanning only when evidence invalidates future steps. This preserves both visibility and adaptability. The important design task is defining what counts as enough divergence to justify replanning."
        },
        {
          title: "Termination policy",
          content: "Termination is a controller concern, not a prompt suggestion. Standard rules are a hard step budget, a cost ceiling, and no-progress detection based on repeated action signatures or unchanged task state. If those checks are not enforced in code, the loop is not actually bounded.",
          diagram: asciiDiagram(`┌─────────────────────────────────────────────────────────┐
  │              TERMINATION CONTROLLER (runs in code)      │
  │  steps_used >= max_steps       → stop                   │
  │  estimated_cost >= ceiling     → stop                   │
  │  repeated action signature     → stop                   │
  │  no task state change          → stop                   │
  │  else                          → continue               │
  └─────────────────────────────────────────────────────────┘`)
        }
      ],
      examples: [
        {
          title: "Research agent",
          input: "The next search query depends on what the previous result revealed.",
          output: "Use ReAct so the next action can depend on newly observed evidence.",
          explanation: "A fixed chain would either overfetch or miss key evidence because it cannot adapt its search plan.\nStep 2: ReAct lets the model interleave reasoning and retrieval.\nStep 3: The controller still needs hard stop rules so the loop does not wander forever."
        },
        {
          title: "Planning a migration",
          input: "A code migration has a mostly mechanical sequence but should be reviewed before changes are applied.",
          output: "Use plan-then-execute with replanning triggers for unexpected compile or test failures.",
          explanation: "The visible plan supports human review and batching of independent edits.\nStep 2: Execution should follow the plan only while its assumptions hold.\nStep 3: When reality diverges, the system should replan rather than treat the original plan as sacred."
        }
      ],
      tips: [
        "Use ReAct when observations genuinely change the next action.",
        "Use planning when visibility, reviewability, or parallel batching matters.",
        "Keep reflection notes short and actionable instead of verbose self-essays.",
        "Put budgets and stop rules in code, not in prompt instructions."
      ],
      tricks: [
        "A strong hybrid is plan once, execute with ReAct locally, and replan only on explicit divergence.",
        "Hash normalised tool arguments to detect repeated ineffective actions even when wording changes slightly.",
        "Enumerate termination reasons such as success, max_steps, repeated_action, and cost_ceiling for analytics.",
        "If reflection helps only temporarily, summarise it instead of letting old self-critiques fill the transcript."
      ],
      memoryAids: [
        "ReAct is Thought → Action → Observation.",
        "Plan first for structure, ReAct during execution for adaptability.",
        "Budgets beat intentions: max steps, max cost, repeated-action stop."
      ],
      interviewPatterns: [
        "What is ReAct and when is it useful?",
        "When would you prefer plan-then-execute over an interleaved tool loop?",
        "How would you stop an agent from running forever?",
        "Frequency and companies: common agent-control topic because it exposes whether the candidate understands concrete loop mechanics rather than vague reasoning claims."
      ],
      practiceProblems: [
        "LOOP SELECTION: Choose ReAct, plan-then-execute, or reflection for web research with evolving evidence, a human-reviewed migration plan, and a failed draft that should learn from critique before retrying.\n\nANSWERS:\nUse ReAct for evolving evidence, plan-then-execute for the reviewable migration, and reflection when the first failed attempt can inform a bounded second attempt.",
        "TERMINATION DESIGN: Design safe stop conditions for an autonomous coding agent.\n\nANSWERS:\nUse a max_steps limit, a cost ceiling, a wall-clock limit, success checks after tests, and no-progress detection over recent action signatures. The controller, not the model, must enforce those rules."
      ],
      faq: [
        {
          question: "What is ReAct in plain language?",
          answer: "It is a loop where the model thinks briefly, takes an action such as calling a tool, reads the observation, and uses that observation to decide what to do next.",
          category: "concepts"
        },
        {
          question: "Why not always plan first?",
          answer: "Because plans become stale as soon as important assumptions break. Planning helps when structure and review matter, but uncertain environments often need observation-driven local adaptation.",
          category: "trade-offs"
        },
        {
          question: "Does reflection make agents reliable?",
          answer: "It can improve a retry by preserving a local lesson, but it does not remove the model's own blind spots. Reflection is helpful, not magical.",
          category: "trade-offs"
        },
        {
          question: "What is no-progress detection?",
          answer: "It is a controller rule that stops or escalates when the agent keeps repeating equivalent actions or fails to change task state over a rolling window. This is far stronger than simply telling the model not to loop.",
          category: "implementation"
        },
        {
          question: "What is the most practical hybrid pattern?",
          answer: "A common hybrid is plan once, execute with local ReAct flexibility, and trigger replanning only when observations invalidate future plan steps. That keeps plans useful without pretending they are infallible.",
          category: "design"
        }
      ],
      references: [
        {
          source: "paper",
          attribution: "Yao et al. — ReAct (2022) - https://arxiv.org/abs/2210.03629",
          insight: "Foundational reason-act-observe loop paper."
        },
        {
          source: "paper",
          attribution: "Shinn et al. — Reflexion (2023) - https://arxiv.org/abs/2303.11366",
          insight: "Canonical reflection pattern reference."
        },
        {
          source: "blog",
          attribution: "Anthropic — Building Effective Agents (2024) - https://www.anthropic.com/research/building-effective-agents",
          insight: "Useful practical framing for planning and agent-loop control."
        },
        {
          source: "blog",
          attribution: "Chip Huyen — Agents (2025) - https://huyenchip.com/2025/01/07/agents.html",
          insight: "Good engineering treatment of budgets, retries, and termination."
        }
      ]
    },
  {
      id: "topic-ai-agents-memory",
      moduleId: "mod-ai-agents-architecture",
      title: "Agent Memory: Short-Term Context, Long-Term Stores, Summarisation and Compaction, Episodic vs. Semantic Memory, and Context Rot",
      intuition: "Memory in an agent system is a set of mechanisms, not one feature. Some state lives in the active context window, some in external stores, some in model weights, and some in provider-side caches, and each choice changes latency, mutability, and reliability. Good agent architecture treats memory as explicit design rather than hoping a giant transcript will stay coherent forever.",
      complexity: {
        time: "In-context memory is fastest because it requires no retrieval, external memory adds retrieval latency, and summarisation adds occasional model overhead but often saves more time and money than it costs by shortening later turns.",
        space: "Memory cost appears as transcript pressure, external storage, and duplication across summaries or facts; long transcripts degrade in quality before they formally overflow, so compaction is both a quality and a cost tool."
      },
      lesson: [
        {
          title: "Four memory types",
          content: "A useful breakdown is in-context working memory, external long-term memory, in-weights memory, and in-cache memory. Working memory is live and volatile, external memory is retrievable and persistent, in-weights knowledge is baked into training and not easily updated, and prefix caching saves repeated prompt cost without creating new knowledge.",
          diagram: asciiDiagram(`Memory type    │ Mutable │ Retrieval latency │ Best use
  ───────────────┼─────────┼───────────────────┼──────────────────────────
  In-context     │ yes     │ none              │ working state this turn
  External store │ yes     │ 50–200ms          │ durable facts, histories
  In-weights     │ no      │ none              │ trained knowledge
  Prefix cache   │ no      │ very low          │ repeated prompt prefixes`)
        },
        {
          title: "Episodic versus semantic memory",
          content: "Episodic memory stores events in time, such as approvals, failures, or previous actions. Semantic memory stores stable facts, such as a user's timezone or an internal ownership mapping. These require different retrieval strategies and should not be lumped together just because both feel like memory."
        },
        {
          title: "Context rot starts early",
          content: "Agents often degrade around the middle of the context window, not only at the hard limit. As transcripts grow, important evidence gets buried, stale plans linger, and the model begins to repeat or drift. This is why compaction policies should trigger before the window is almost full.",
          diagram: asciiDiagram(`Context utilisation  │  Typical quality effect
  ─────────────────────┼───────────────────────────────────────
  0% – 40%             │  stable
  50% – 60%            │  early rot often appears — compact now
  60% – 80%            │  drift and repetition rising
  80% – 100%           │  overflow risk and sharp recall loss`)
        },
        {
          title: "Compaction strategies",
          content: "Sliding windows are easy but blunt. Better defaults are summary compaction around a threshold, selective extraction of durable facts, and retrieval-based memory that injects only currently relevant state. The goal is to preserve intent, decisions, and key facts while dropping noise."
        },
        {
          title: "Good memory architecture",
          content: "Strong systems keep the live transcript short, move durable facts into structured stores, preserve time-ordered events separately, and treat summaries as compressed representations with provenance rather than as unquestionable truth. Memory is useful only if it can be retrieved in the right shape at the right time."
        }
      ],
      examples: [
        {
          title: "Long support session",
          input: "A customer conversation runs for forty turns and includes approved actions, failed attempts, and one final workaround.",
          output: "Keep recent turns in context, store stable facts semantically, and store the timeline of actions episodically.",
          explanation: "The approved workaround is a durable fact, while the failed attempts form an event history.\nStep 2: Keeping everything only in transcript form is cheap to start but brittle over long sessions.\nStep 3: Splitting memory types improves both retrieval quality and context efficiency."
        },
        {
          title: "Cross-session preferences",
          input: "A new session needs the user's timezone and preferred report style.",
          output: "Retrieve them from external semantic memory rather than relying on old transcripts.",
          explanation: "Cross-session continuity is exactly where transcript-only memory breaks down.\nStep 2: Preferences are stable facts, not just recent chat details.\nStep 3: Inject only the relevant retrieved facts into the current context instead of replaying entire historical sessions."
        }
      ],
      tips: [
        "Treat memory as architecture, not as whatever happens to remain in chat history.",
        "Separate working state, durable facts, and event timelines.",
        "Compact before the transcript is nearly full.",
        "Store provenance or confidence for extracted memories so guesses do not become fake history."
      ],
      tricks: [
        "A 50 to 60 percent context-usage threshold is a good default point to start summarising.",
        "Temporal questions usually need episodic retrieval, not semantic retrieval.",
        "Prefix caching reduces repeated prompt cost but does not replace product memory.",
        "Summaries should preserve goal, constraints, decisions, open questions, and recent evidence."
      ],
      memoryAids: [
        "Four buckets: context, external store, weights, cache.",
        "Episodic means events in time; semantic means facts outside one moment.",
        "Context rot starts in the middle, not only at the edge."
      ],
      interviewPatterns: [
        "How would you design memory for a long-running agent?",
        "What is the difference between episodic and semantic memory?",
        "Why does long context hurt quality even before overflow?",
        "Frequency and companies: common on copilot, assistant, and support-system interviews because memory design drives continuity, cost, and trust."
      ],
      practiceProblems: [
        "MEMORY TAXONOMY: Classify current transcript, a vector store of support facts, the model knowing that Paris is in France, and provider-side reuse of a repeated system prompt.\n\nANSWERS:\nThese are in-context memory, external memory, in-weights memory, and in-cache memory. The key distinction is whether the knowledge is live state, runtime-retrievable persistence, training-time knowledge, or infrastructure-level reuse.",
        "COMPACTION POLICY: Propose a compaction strategy for a 128K-context research agent.\n\nANSWERS:\nMonitor context usage and compact around the halfway-to-sixty-percent range rather than near overflow. Summarise older turns into goals, decisions, constraints, and open questions; extract stable facts into structured memory; keep only recent turns plus the compact summary in live context."
      ],
      faq: [
        {
          question: "What memory should an agent use by default?",
          answer: "Usually a mix: live transcript for immediate working state, external storage for durable facts and histories, and periodic summaries to keep the transcript short. No single memory form satisfies all needs at once.",
          category: "design"
        },
        {
          question: "Why not put everything in a vector database?",
          answer: "Because some memory is temporal, some is structured state, and some belongs only to the active turn. Vector search is one retrieval strategy, not the entire memory architecture.",
          category: "trade-offs"
        },
        {
          question: "What is context rot?",
          answer: "It is the decline in reasoning quality as long transcripts bury relevant facts, accumulate stale intermediate state, and make the model more likely to miss or repeat information.",
          category: "failure-modes"
        },
        {
          question: "Can summaries become wrong?",
          answer: "Yes. They are compressed representations, not perfect truth. Critical facts should often be preserved separately with provenance so a bad summary does not rewrite history.",
          category: "failure-modes"
        },
        {
          question: "How is prefix caching different from memory?",
          answer: "Prefix caching speeds up repeated prompt prefixes and may reduce cost, but it does not store new task knowledge or user-specific state. It is an infrastructure optimisation, not an application memory system.",
          category: "concepts"
        }
      ],
      references: [
        {
          source: "blog",
          attribution: "Lilian Weng — LLM-powered Autonomous Agents, memory section (2023) - https://lilianweng.github.io/posts/2023-06-23-agent/",
          insight: "Classic overview of memory components in agent systems."
        },
        {
          source: "paper",
          attribution: "Liu et al. — Lost in the Middle (2023) - https://arxiv.org/abs/2307.03172",
          insight: "Key evidence for middle-context degradation."
        },
        {
          source: "blog",
          attribution: "Chip Huyen — Agents (2025) - https://huyenchip.com/2025/01/07/agents.html",
          insight: "Strong practitioner discussion of long transcripts, summaries, and retrieval."
        },
        {
          source: "blog",
          attribution: "Anthropic — Building Effective Agents (2024) - https://www.anthropic.com/research/building-effective-agents",
          insight: "Useful production guidance for compact state and externalised memory."
        }
      ]
    },
  {
      id: "topic-ai-agents-multi-agent",
      moduleId: "mod-ai-agents-architecture",
      title: "Multi-Agent Systems: When Multiple Agents Beat One, Topologies, Handoff Mechanics, Shared State, and the Sceptical Case",
      intuition: "Multiple agents are not free extra intelligence. They multiply prompts, handoffs, failure points, and observability work unless there is a concrete reason such as context isolation, parallel specialised work, or capability separation. The best multi-agent answer therefore starts sceptically and proves why one workflow or one agent is not enough.",
      complexity: {
        time: "Without parallelism, multiple agents usually add latency because every handoff is another model step; with parallel bounded workers, wall-clock time can fall, but coordination overhead still matters.",
        space: "Each agent tends to carry its own prompt and transcript, so token cost can multiply quickly unless shared state and structured handoffs keep duplication under control."
      },
      lesson: [
        {
          title: "The sceptical case",
          content: "Single-agent or workflow designs should be exhausted first. Many problems described as multi-agent are really workflow decomposition or tool-selection problems. Splitting work across agents adds coordination cost and makes blame assignment harder when the final output is wrong."
        },
        {
          title: "When multiple agents really help",
          content: "There are three strong justifications: one context window cannot hold the whole task, several bounded subtasks can run in parallel, or different capabilities should live behind different trust boundaries. Outside those cases, multi-agent is often complexity for its own sake."
        },
        {
          title: "Topologies",
          content: "Supervisor topologies are the production default because one controller plans, routes, and aggregates. Peer-to-peer topologies allow more direct interaction, but they are harder to inspect and govern. The trade-off is centralised debuggability versus decentralised flexibility.",
          diagram: asciiDiagram(`SUPERVISOR topology                PEER-TO-PEER topology
  ┌────────────┐                     agent A ──── agent B
  │ SUPERVISOR │                        │    ╲  ╱    │
  └────────────┘                        │     ╲╱     │
   │    │    │                          │     ╱╲     │
   ▼    ▼    ▼                          │    ╱  ╲    │
  [A]  [B]  [C]                      agent C ──── agent D
  
  Left: centralised, debuggable, single point of control
  Right: flexible, harder to trace, no single failure point`)
        },
        {
          title: "Handoffs and shared state",
          content: "Structured handoffs are usually better than transcript dumps. A receiving agent typically needs the objective, constraints, relevant evidence, open questions, and output schema, not the entire raw conversation. Shared external state can reduce copying, but then ownership and update rules matter."
        },
        {
          title: "Reliability across boundaries",
          content: "Multiple agents do not escape p raised to n. They often make it worse by adding decomposition mistakes and aggregation mistakes on top of local execution errors. That is why each boundary should be narrow, testable, and justified."
        }
      ],
      examples: [
        {
          title: "Vendor analysis",
          input: "Produce the same structured report for five vendors, then compare them.",
          output: "Use a supervisor with one worker per vendor and a final synthesis step.",
          explanation: "The task decomposes naturally by entity and each branch can work independently.\nStep 2: That makes parallel workers both faster and cleaner than one giant prompt.\nStep 3: The supervisor owns comparison and aggregation rather than every worker needing the whole world."
        },
        {
          title: "Security separation",
          input: "One component reads untrusted webpages while another can update internal systems.",
          output: "Use separate agents or components so the reader is unprivileged and the executor only sees structured handoffs.",
          explanation: "This is not about more intelligence but about reducing blast radius.\nStep 2: The privileged side should not ingest raw attacker-controlled content.\nStep 3: Capability separation is one of the strongest legitimate reasons to split roles."
        }
      ],
      tips: [
        "Begin by proving why one agent or one workflow is insufficient.",
        "Prefer supervisor topologies unless there is a compelling reason for peer messaging.",
        "Use structured handoff payloads rather than full transcript pass-through.",
        "Keep each worker's charter narrow and measurable."
      ],
      tricks: [
        "Ask whether subtasks are truly independent and mergeable before proposing parallel workers.",
        "Capability separation is often a better reason for multiple components than vague collaboration.",
        "Partition by entity, document, or function if the real pressure is context overflow.",
        "Treat every agent boundary as another place where reliability can degrade."
      ],
      memoryAids: [
        "Single agent first, multi-agent only with a reason.",
        "Three real reasons: context overflow, parallel specialised work, capability separation.",
        "Supervisor is the default because central control is easier to debug."
      ],
      interviewPatterns: [
        "When do multiple agents actually beat one?",
        "Would you use a supervisor or a peer topology and why?",
        "How should one agent hand off work to another?",
        "Frequency and companies: more advanced but increasingly common at copilot, research, and enterprise-assistant teams where decomposition and access control matter."
      ],
      practiceProblems: [
        "TOPOLOGY CHOICE: Pick a topology for a report generator that assigns one company per worker and then needs one final synthesis.\n\nANSWERS:\nUse a supervisor topology. Decomposition and aggregation are centralised, workers stay bounded, and observability is much better than in a peer mesh.",
        "OVERENGINEERING CHECK: A team proposes separate agents for classify, draft, and send in a fixed support workflow. Should you approve it?\n\nANSWERS:\nNo. That sequence is already known, so a workflow is simpler, cheaper, and more debuggable. Splitting it into agents adds boundaries without solving a real autonomy or context problem."
      ],
      faq: [
        {
          question: "When is multi-agent worth the complexity?",
          answer: "When one context window cannot hold the work, when subtasks are naturally parallel and bounded, or when different access controls should apply to different roles. Those are the strongest production justifications.",
          category: "design"
        },
        {
          question: "Why is supervisor usually preferred?",
          answer: "Because it centralises planning, routing, and aggregation, which makes the system easier to observe and debug. Peer-to-peer topologies create many more hidden interactions.",
          category: "topologies"
        },
        {
          question: "Should agents pass full context to each other?",
          answer: "Usually no. Full transcript dumps are noisy and expensive. Structured handoffs with objective, evidence, constraints, and expected output are generally better.",
          category: "implementation"
        },
        {
          question: "Does multi-agent improve reliability automatically?",
          answer: "No. It can improve quality when decomposition isolates complexity, but it also adds handoff and aggregation failure modes. More components only help when the architecture genuinely needs them.",
          category: "failure-modes"
        },
        {
          question: "What is shared external state good for?",
          answer: "It reduces repeated context copying and gives multiple workers access to common facts or artifacts, but it also requires ownership and update rules so agents do not overwrite each other's assumptions.",
          category: "implementation"
        }
      ],
      references: [
        {
          source: "blog",
          attribution: "Anthropic — Building Effective Agents (2024) - https://www.anthropic.com/research/building-effective-agents",
          insight: "Helpful framing for decomposition and bounded workers."
        },
        {
          source: "blog",
          attribution: "Chip Huyen — Agents (2025) - https://huyenchip.com/2025/01/07/agents.html",
          insight: "Strong sceptical practitioner view on when multi-agent is justified."
        },
        {
          source: "paper",
          attribution: "Wu et al. — AutoGen (2023) - https://arxiv.org/abs/2308.08155",
          insight: "Representative multi-agent orchestration reference."
        },
        {
          source: "interview-experience",
          attribution: "Applied AI and copilot interviews, 2024 to 2026",
          insight: "Interviewers often reward rejecting multi-agent overengineering before proposing it selectively."
        }
      ]
    },
  {
      id: "topic-ai-agents-failure-modes",
      moduleId: "mod-ai-agents-architecture",
      title: "Why Agents Fail: Infinite Loops, Goal Drift, Context Rot, Compounding Error Rates, Cost Explosion, and Practical Mitigations",
      intuition: "Most agent failures fall into a small number of recurring categories. Once you recognise the pattern, the mitigation is usually architectural or controller-based rather than purely prompt-based. Senior candidates stand out by naming the failure mode, quantifying its risk, and mapping it to one concrete mitigation.",
      complexity: {
        time: "Failures often increase runtime faster than successes because retries, repeated searches, and growing transcripts stack on top of each other, turning local mistakes into long expensive incidents.",
        space: "Bad trajectories usually consume more context than good ones, so uncontrolled failures degrade quality and cost simultaneously by filling the transcript with redundant observations and loops."
      },
      lesson: [
        {
          title: "The six common failures",
          content: "A practical taxonomy is infinite loops, goal drift, context rot, compounding errors, cost explosion, and tool misuse. The value of a taxonomy is that it turns 'the agent is flaky' into a diagnosable class of engineering problems."
        },
        {
          title: "Compounding error is the master pattern",
          content: "Many agent failures become serious because they add steps or let bad steps propagate. Even with strong local performance, long chains become fragile as n rises. This is why reducing required successful steps is often more powerful than marginally improving a prompt.",
          diagram: asciiDiagram(`End-to-end success = p^n
                    n=5    n=10   n=20   n=30
  p = 0.99    →   95%    90%    82%    74%
  p = 0.95    →   77%    60%    36%    21%
  p = 0.90    →   59%    35%    12%     4%
  p = 0.85    →   44%    20%     4%    ~1%
  Long chains punish even good local accuracy`)
        },
        {
          title: "Cost and blast radius",
          content: "Runaway loops are not just quality bugs; they are operations bugs. A slightly too-long loop can look harmless per user but become a billing event at scale. That is why cost ceilings and step ceilings are safety features, not only finance features.",
          diagram: asciiDiagram(`Per-task cost ($)
  │                                ← incident zone at scale
  │                         ┌──────────────────────────────
  │                   ┌─────┘
  │             ┌─────┘
  │ ────────────┘
  └─────────────────────────────────────────────────► steps used
     2   4   6   8   10  15  20  30  40  50
  Hard ceiling and step budget prevent right tail`)
        },
        {
          title: "One-to-one mitigations",
          content: "Infinite loops map to no-progress detection. Goal drift maps to goal pinning and explicit non-goals. Context rot maps to compaction. Compounding errors map to checkpoints. Cost explosion maps to hard ceilings. Tool misuse maps to better schemas and runtime validation."
        },
        {
          title: "The loop controller",
          content: "A production agent should sit inside a controller that checks budget, progress, context health, and result validity at every cycle. This keeps the model in the role of proposing actions while the surrounding system retains responsibility for safe continuation."
        }
      ],
      examples: [
        {
          title: "Infinite search loop",
          input: "An agent keeps issuing near-duplicate search queries without narrowing the answer.",
          output: "Stop it with no-progress detection and surface a structured failure or escalation.",
          explanation: "Telling the model not to loop is weaker than detecting repeated action signatures in code.\nStep 2: The controller can terminate before the loop becomes expensive.\nStep 3: The termination reason then becomes useful diagnosis data."
        },
        {
          title: "Goal drift in coding",
          input: "The task is to fix one failing test, but after several steps the agent starts unrelated refactors.",
          output: "Pin the objective and non-goals in active context and require actions to justify their relevance.",
          explanation: "Long trajectories invite locally attractive but globally wrong detours.\nStep 2: Goal pinning keeps the original scope visible.\nStep 3: Reviewers also benefit because the log makes scope creep explicit."
        }
      ],
      tips: [
        "Memorise the six failure modes so you can audit any agent design quickly.",
        "Always pair a failure mode with a concrete controller or architectural mitigation.",
        "Measure termination reasons in production; they reveal where the controller is earning its keep.",
        "Inspect unsuccessful trajectories first when cost spikes."
      ],
      tricks: [
        "Start with compounding error if you need a unifying explanation for why loops are fragile.",
        "Phrase no-progress detection as repeated action signatures plus unchanged task state.",
        "Name explicit non-goals when describing goal-drift mitigation.",
        "Ask what this failure looks like at a thousand runs per day, not at one demo run."
      ],
      memoryAids: [
        "Loop, drift, rot, compounding, spend, misuse.",
        "Detect, pin, compact, checkpoint, cap, validate.",
        "Failures often grow transcripts and therefore cost more than successes."
      ],
      interviewPatterns: [
        "Why do production agents fail even when the base model is strong?",
        "How do you prevent infinite loops and runaway spend?",
        "What is goal drift and how do you mitigate it?",
        "Frequency and companies: common post-demo maturity topic because it distinguishes operators from experimenters."
      ],
      practiceProblems: [
        "FAILURE CLASSIFICATION: Match repeated identical tool calls, forgetting the original objective, declining long-context quality, high total spend, wrong-tool empty results, and low end-to-end success to mitigations.\n\nANSWERS:\nRepeated calls map to no-progress detection. Forgetting the goal maps to goal pinning. Long-context decline maps to compaction. High spend maps to cost ceilings. Wrong-tool empty results map to schema improvement and validation. Low end-to-end success maps to reducing step count and adding checkpoints.",
        "RELIABILITY MATH: A 12-step agent has 93 percent per-step accuracy. Is it acceptable for a task needing 70 percent end-to-end success?\n\nANSWERS:\nNo. 0.93 to the 12th is about 42 percent, far below the target. The design needs fewer required successful steps or stronger verification before downstream propagation."
      ],
      faq: [
        {
          question: "What is the most important failure mode to know?",
          answer: "Compounding error, because it explains why small local mistakes become unacceptable over long trajectories and why many other problems get worse as they add steps or retries.",
          category: "failure-modes"
        },
        {
          question: "Why are prompt-only fixes weak here?",
          answer: "Because many failures are control problems rather than wording problems. A prompt can request restraint, but only controller logic can actually stop a loop, cap spend, or reject an unsafe action.",
          category: "implementation"
        },
        {
          question: "How do I detect goal drift?",
          answer: "Keep a concise current objective and non-goals in active context or controller state and compare each major action against them. If an action does not advance the intended objective, it should be challenged or blocked.",
          category: "implementation"
        },
        {
          question: "What does cost explosion look like in practice?",
          answer: "Often it looks like many medium-sized inefficient runs rather than one spectacular infinite loop. Slightly too many steps or too much repeated retrieval can become a major bill when multiplied across traffic.",
          category: "operations"
        },
        {
          question: "Can verification eliminate compounding error?",
          answer: "No, but it can reduce propagation. Verification itself has cost and imperfect accuracy, so the best first move remains reducing the number of critical steps.",
          category: "trade-offs"
        }
      ],
      references: [
        {
          source: "blog",
          attribution: "Chip Huyen — Agents (2025) - https://huyenchip.com/2025/01/07/agents.html",
          insight: "Strong engineering treatment of real-world agent failure patterns."
        },
        {
          source: "blog",
          attribution: "Anthropic — Building Effective Agents (2024) - https://www.anthropic.com/research/building-effective-agents",
          insight: "Good framing for structure, limits, and mitigation strategies."
        },
        {
          source: "paper",
          attribution: "Liu et al. — Lost in the Middle (2023) - https://arxiv.org/abs/2307.03172",
          insight: "Relevant evidence for context-rot discussions."
        },
        {
          source: "interview-experience",
          attribution: "Production-agent postmortem themes, 2024 to 2026",
          insight: "Candidates score well when they map each failure class to a concrete control."
        }
      ]
    },
  {
      id: "topic-ai-agents-human-in-the-loop",
      moduleId: "mod-ai-agents-architecture",
      title: "Human-in-the-Loop Patterns: Approval Gates, Confidence Thresholds, Undo and Rollback, and Escalation Design",
      intuition: "Human review is an architectural mechanism for controlling blast radius, not a confession that the model is bad. The interesting design questions are when to pause, what evidence to show, how to resume after approval or rejection, and how to recover if a wrong action still slips through. In interviews, the strongest answers classify actions by reversibility and consequence before they talk about confidence thresholds.",
      complexity: {
        time: "Human gates add review latency that can dominate model latency, but asynchronous approval flows can preserve responsiveness while still blocking risky writes.",
        space: "These systems need serialised task state, audit logs, and rollback metadata more than giant extra prompts; the storage overhead is modest compared with the value of explainability and reversibility."
      },
      lesson: [
        {
          title: "Blast radius first",
          content: "The right first question is not whether the model is probably correct but what happens if it is wrong. Read-only and reversible actions can tolerate more autonomy than irreversible or regulated actions. This is why blast radius, not raw confidence, should determine gate strength.",
          diagram: asciiDiagram(`Action type                       │ Recommended control
  ──────────────────────────────────┼────────────────────────────────
  Read-only                         │ log only
  Reversible write                  │ maybe confidence-threshold gate
  Low-stakes irreversible write     │ threshold gate or sampled review
  High-stakes irreversible write    │ hard human approval required
  Regulated or legal boundary       │ hard gate + audit trail always`)
        },
        {
          title: "Hard approval gates",
          content: "A hard gate pauses execution before the risky action. The system stores current state, shows the proposed action plus supporting evidence, waits for approve or reject, and then resumes deterministically. A good approval packet is a decision aid, not a transcript dump."
        },
        {
          title: "Confidence thresholds",
          content: "Selective gating is useful when full manual review is too expensive but blind autonomy is too risky. Confidence should not come only from a self-reported model number; combine it with programmatic signals such as missing evidence, disagreement, or policy-rule hits."
        },
        {
          title: "Undo, rollback, and compensation",
          content: "Human review lowers error probability but does not remove it. Safe systems also design rollback or compensating actions, preserve audit trails, and often support dry-run previews so reviewers can approve an exact proposed change rather than a vague description.",
          diagram: asciiDiagram(`Agent proposes action ──► [dry-run / preview] ──► human decision ──► execute
                                                         │
                                                         ▼
                                              audit log + rollback metadata
                                                         │
                                                         ▼
                                              revert or compensate if still wrong`)
        },
        {
          title: "Escalation design",
          content: "Escalation should be policy-driven, not another free-form agent guess. Define when to escalate, what question the human needs to answer, and who owns that class of review. Good escalation packets include current state, evidence, options, and a recommendation."
        }
      ],
      examples: [
        {
          title: "Drafting versus sending",
          input: "An assistant can draft support replies, but sending them publicly can damage trust if wrong.",
          output: "Automate drafts but gate the final send action until approval quality is consistently very high.",
          explanation: "Draft generation is low blast radius because it can be edited or rejected.\nStep 2: Sending is externally visible and harder to undo.\nStep 3: Separating those phases preserves most of the productivity gain while containing trust risk."
        },
        {
          title: "Low-value reimbursements",
          input: "An assistant categorises and approves small expense claims when evidence is complete.",
          output: "Use threshold-based review based on amount, completeness, and confidence, and escalate anything ambiguous or unusually costly.",
          explanation: "Not every decision has the same risk, so gate strength should vary by stakes.\nStep 2: Confidence alone is not enough; missing evidence and value thresholds matter too.\nStep 3: Policy should live in code or configuration, not only in prompt text."
        }
      ],
      tips: [
        "Design gates around blast radius and reversibility.",
        "Keep approval packets short, structured, and decision-focused.",
        "Combine confidence with programmatic signals before skipping review.",
        "Design rollback before enabling writes."
      ],
      tricks: [
        "Compare expected error cost with review cost when deciding whether universal review is justified.",
        "Split draft generation from commit or send actions to unlock automation safely.",
        "Use dry-run previews whenever the side effect can be rendered as a diff or action plan.",
        "Log approve, edit, and reject outcomes because they are excellent policy-tuning data."
      ],
      memoryAids: [
        "Blast radius decides gate strength.",
        "Hard gate for irreversible or regulated writes.",
        "No rollback means not actually safe."
      ],
      interviewPatterns: [
        "When should an agent require human approval?",
        "How would you design a review gate for a sensitive action?",
        "What should an escalation packet contain?",
        "Frequency and companies: very common wherever AI touches customer-facing, financial, operational, healthcare, or legal actions."
      ],
      practiceProblems: [
        "BLAST RADIUS DESIGN: Choose controls for summarising a document, drafting an email, sending a customer-facing refund denial, and deleting production data.\n\nANSWERS:\nSummarisation needs logging but usually no gate. Drafting often needs no gate until the send action. A refund denial should have at least a threshold gate and often a hard gate. Deleting production data requires a hard gate plus rollback or compensation support.",
        "COST-BENEFIT: Review takes 30 seconds and the reviewer costs 60 dollars per hour. A mistaken action occurs 2 percent of the time and costs 20 dollars on average. Should every action be reviewed?\n\nANSWERS:\nReview cost is 0.50 dollars per action. Expected error cost is 0.40 dollars per action. Purely on cost, universal review is not justified, so selective gating by risk is better."
      ],
      faq: [
        {
          question: "What is a hard approval gate?",
          answer: "It is a deterministic pause before a risky action executes. The system stores state, presents the proposed action and evidence, and waits for an explicit approve or reject decision before moving forward.",
          category: "concepts"
        },
        {
          question: "Can model confidence alone decide whether to ask a human?",
          answer: "Usually no. Confidence should be combined with programmatic signals such as missing fields, policy-rule hits, contradictory evidence, or unusual spend. A single self-reported number is too weak.",
          category: "trade-offs"
        },
        {
          question: "Why is rollback part of HITL design?",
          answer: "Because review reduces the chance of a bad action but does not make it impossible. Rollback and compensation reduce the impact when mistakes still happen.",
          category: "safety"
        },
        {
          question: "What belongs in an escalation packet?",
          answer: "A concise task state, the exact unresolved decision, relevant evidence, available options, risk notes, and often a recommendation. Escalation should narrow human work rather than dump all raw context.",
          category: "implementation"
        },
        {
          question: "Are gates only for very high-stakes domains?",
          answer: "No. They also help when trust is fragile, when a system is new and not yet well calibrated, or when a subset of actions carries materially higher downside than the rest.",
          category: "design"
        }
      ],
      references: [
        {
          source: "blog",
          attribution: "Simon Willison — Notes on agentic AI (2025) - https://simonwillison.net/2025/Jan/8/agentic-ai/",
          insight: "Strong blast-radius framing for human review decisions."
        },
        {
          source: "blog",
          attribution: "Anthropic — Building Effective Agents (2024) - https://www.anthropic.com/research/building-effective-agents",
          insight: "Reinforces the value of structure, checkpoints, and explicit review points."
        },
        {
          source: "blog",
          attribution: "Chip Huyen — Agents (2025) - https://huyenchip.com/2025/01/07/agents.html",
          insight: "Practical discussion of where automation should stop and people should decide."
        },
        {
          source: "interview-experience",
          attribution: "Applied AI system design interviews, 2024 to 2026",
          insight: "Interviewers often expect blast-radius classification and rollback planning, not just 'a human reviews it'."
        }
      ]
    },
  {
      id: "topic-ai-agents-security",
      moduleId: "mod-ai-agents-architecture",
      title: "Agent Security and Prompt Injection: Indirect Injection, Confused-Deputy Attacks, Capability Limits, and Architectural Mitigations",
      intuition: "Agent security is fundamentally about data flow and capabilities. Once a model can read untrusted content, touch private data, and trigger outbound side effects, prompt injection becomes an architectural threat rather than merely a prompting problem. Strong designs therefore break dangerous combinations of privileges instead of trusting that a clever instruction will always be obeyed.",
      complexity: {
        time: "Safer architectures often add policy checks, extra components, or approval gates, which adds some latency, but the cost is tiny compared with the impact of a successful exfiltration or confused-deputy attack.",
        space: "Security layers add audit state, policy metadata, and sometimes duplicated structured summaries across trust boundaries, but those storage costs are usually minor compared with the need for provenance and containment."
      },
      lesson: [
        {
          title: "The lethal trifecta",
          content: "A powerful security heuristic is the lethal trifecta: private data access, exposure to untrusted content, and exfiltration or action capability. If all three exist together, prompt-injection risk becomes serious. Remove any one leg and the attack surface drops sharply.",
          diagram: asciiDiagram(`             private data access
                       │
                       │
  untrusted content ───┼─── exfiltration or side-effect capability
                       │
                       │
  All three together → highest prompt-injection risk
  Remove any one leg → attack chain breaks`)
        },
        {
          title: "Direct and indirect prompt injection",
          content: "Direct injection is when the attacker writes adversarial instructions explicitly to the system. Indirect injection is when those instructions are embedded in external content such as webpages, documents, or emails that the model later reads. Browsing and inbox agents are therefore especially exposed."
        },
        {
          title: "Confused deputy and why filtering fails",
          content: "A confused-deputy attack happens when the agent wields the user's authority but is redirected by untrusted content toward actions the user did not intend. Input filtering helps some cases but cannot cleanly solve the problem because content and instructions are easy to blend, rephrase, or obfuscate."
        },
        {
          title: "Architectural mitigations",
          content: "The main defenses are least-privilege capability scoping, egress allowlists, dual-component or dual-LLM designs, human confirmation on cross-boundary actions, and structural content isolation. These controls reduce what a manipulated component can see and do.",
          diagram: asciiDiagram(`Untrusted content ──► [READER component]          [PRIVILEGED executor]
                       (no dangerous tools)  ──►  (no raw untrusted content)
                       Outputs: structured JSON only
                       
  Capability allowlists + egress allowlists wrap both components
  Attacker content never reaches the component that can act with authority`)
        },
        {
          title: "Secure-by-construction thinking",
          content: "A secure system assumes the model can be tricked and then arranges the runtime so catastrophic outcomes are still hard to trigger. That means read-only tools for untrusted browsing, narrow scopes for writes, explicit policy checks, and separation between reading foreign content and acting with authority."
        }
      ],
      examples: [
        {
          title: "Malicious webpage",
          input: "A page contains hidden instructions telling the model to send internal secrets to an external endpoint.",
          output: "The correct fix is architectural containment: the browsing side should not have secret access or arbitrary egress in the first place.",
          explanation: "Prompt wording alone is too weak once untrusted content reaches a capable model.\nStep 2: Breaking one leg of the lethal trifecta sharply reduces risk.\nStep 3: Architecture beats clever filtering in adversarial settings."
        },
        {
          title: "Email confused deputy",
          input: "An email asks the assistant to verify account details by opening internal admin tools and forwarding data.",
          output: "Treat email as untrusted input, isolate it from privileged actions, and require approval for cross-boundary data movement.",
          explanation: "The danger is borrowed authority, not only bad wording.\nStep 2: The system should not let raw email text directly steer privileged tools.\nStep 3: Split-trust architecture and approval gates reduce that confused-deputy risk."
        }
      ],
      tips: [
        "Think in trust boundaries and capabilities, not only prompt strings.",
        "Use the lethal trifecta as a quick threat-modeling checklist.",
        "Treat webpages, documents, and incoming messages as untrusted by default.",
        "Keep privileged tools narrow and often gated."
      ],
      tricks: [
        "Say explicitly that filtering is necessary but insufficient because instruction-content boundaries are fuzzy.",
        "If asked for one mitigation, choose least privilege first because it reduces blast radius no matter how the attack is phrased.",
        "Egress controls are underrated because many successful attacks still need a way to move data outward.",
        "Ask which component can both read attacker-controlled text and reach sensitive capabilities; that component is the hot zone."
      ],
      memoryAids: [
        "Lethal trifecta: secrets, untrusted content, outbound power.",
        "Prompt injection can be direct or indirect.",
        "Confused deputy means the agent misuses borrowed authority."
      ],
      interviewPatterns: [
        "What is prompt injection and why is filtering alone insufficient?",
        "Explain the confused-deputy problem for an agent with tools.",
        "How would you secure a browsing or email-processing agent?",
        "Frequency and companies: extremely common on security-conscious AI teams because tool-enabled agents magnify classic trust-boundary mistakes."
      ],
      practiceProblems: [
        "THREAT MODEL: An assistant can read user email, query internal CRM data, and make arbitrary outbound HTTP requests. What is the main concern and how do you reduce it?\n\nANSWERS:\nThis has the lethal trifecta: untrusted content, private data access, and exfiltration capability. Reduce risk by removing or constraining at least one leg, such as blocking arbitrary egress, splitting untrusted reading from privileged execution, or requiring approval for outbound sends.",
        "FILTERING QUESTION: Why is keyword filtering for prompt injection not enough?\n\nANSWERS:\nAttackers can obfuscate phrasing, content and instructions are not cleanly separable, and semantically equivalent attacks can evade fixed rules. Filtering is one layer, but least privilege, isolation, allowlists, and review gates are the architectural defenses that matter most."
      ],
      faq: [
        {
          question: "What is indirect prompt injection?",
          answer: "It is when adversarial instructions are embedded in external content such as webpages, PDFs, or email that the model later reads and mistakenly treats as relevant instructions for the system.",
          category: "security"
        },
        {
          question: "Why is 'ignore malicious instructions' not enough?",
          answer: "Because the model still has to interpret a mixed stream of task content and adversarial text, and attackers can rephrase or hide instructions in many ways. Security that depends on perfect obedience is brittle.",
          category: "security"
        },
        {
          question: "What is the confused-deputy problem here?",
          answer: "It is when an agent with delegated authority is manipulated into using that authority for the attacker's purpose instead of the user's. The system becomes a deputy confused about whose interests it serves.",
          category: "security"
        },
        {
          question: "What is the strongest first mitigation?",
          answer: "Least-privilege capability scoping is usually the best first move because it reduces the damage any manipulated component can cause even if upstream defenses fail.",
          category: "mitigations"
        },
        {
          question: "Why do egress controls matter so much?",
          answer: "Because many attacks still need to move data or commands out of the trusted environment. Tight outbound allowlists can stop exfiltration even after some earlier compromise.",
          category: "mitigations"
        }
      ],
      references: [
        {
          source: "blog",
          attribution: "Simon Willison — Prompt injection essays (2023 to 2025) - https://simonwillison.net/tags/prompt-injection/",
          insight: "Excellent practitioner framing for prompt injection and the lethal trifecta."
        },
        {
          source: "paper",
          attribution: "Greshake et al. — Indirect Prompt Injection (2023) - https://arxiv.org/abs/2302.12173",
          insight: "Foundational reference for indirect prompt injection in integrated applications."
        },
        {
          source: "blog",
          attribution: "Anthropic — Building Effective Agents (2024) - https://www.anthropic.com/research/building-effective-agents",
          insight: "Helpful support for narrow capability design and explicit structure."
        },
        {
          source: "interview-experience",
          attribution: "Security-focused AI system design interviews, 2024 to 2026",
          insight: "Architectural mitigations are now expected; prompt-only answers are viewed as immature."
        }
      ]
    },
  {
      id: "topic-ai-agents-evaluation",
      moduleId: "mod-ai-agents-architecture",
      title: "Agent Evaluation and Observability: Trajectory Evaluation, Step-Level Attribution, Tool-Call Correctness, Cost Metrics, and Regression Suites",
      intuition: "Agents are harder to evaluate than single prompts because several different trajectories may be acceptable and because failures often surface long after the root cause. Final-answer accuracy still matters, but it is not enough to keep an agent reliable, efficient, and cheap in production. Strong evaluation therefore measures both outcomes and trajectories and logs enough structured state to explain regressions rather than merely noticing them.",
      complexity: {
        time: "Outcome-only evaluation is cheap because it scores one final answer, while trajectory evaluation is more expensive because it inspects steps, tools, retries, and termination behavior across a full run.",
        space: "Observability requires storing structured traces for model calls, tool calls, costs, and termination reasons, but that storage cost is justified because without it agent regressions are extremely hard to localise."
      },
      lesson: [
        {
          title: "Outcome versus trajectory",
          content: "Outcome evaluation asks whether the final answer or action was correct. Trajectory evaluation asks how the system got there: which tools it used, how many steps it took, whether it recovered intelligently, and whether it burned an unreasonable amount of cost. Agents need both because path quality directly affects cost and robustness.",
          diagram: asciiDiagram(`SAME FINAL ANSWER — but very different paths:
  Path A: 3 steps ──► 2 tool calls ──► correct tools ──► low cost
  Path B: 11 steps ──► 9 tool calls ──► repeated searches ──► 15x cost
  
  Outcome-only evaluation:   PASS    PASS    (no difference)
  Trajectory evaluation:     good    regression — path B is operationally worse`)
        },
        {
          title: "Tool-call correctness as its own metric",
          content: "An agent can reach the right final answer while still calling the wrong tools, taking too many steps, or relying on lucky recovery. That is why first-tool accuracy, argument validity, unnecessary-call rate, and recovery quality deserve separate measurement from final-answer quality."
        },
        {
          title: "Step-level attribution",
          content: "When a trajectory fails, you want to know which step first broke the run. Attribution can come from human annotation, counterfactual replay, or heuristics such as marking the first wrong-tool call or violated constraint. Even imperfect attribution is much more useful than treating the whole run as one opaque failure."
        },
        {
          title: "Tracing and metrics",
          content: "A practical trace has one span per model call and one span per tool call. Core metrics include steps_used, cost_per_task, tool_call_count, step_budget_hit_rate, and termination_reason_distribution. Those metrics tell you not only whether the agent works but whether it is becoming slow, wasteful, or brittle.",
          diagram: asciiDiagram(`TRACE: task_id="abc123"  start=14:22:01.000
  │
  ├── SPAN 1: thought    [14:22:01.000 → 14:22:01.420]
  │    ├── input_tokens: 847   output_tokens: 142
  │    └── content: "I need to search for..."
  │
  ├── SPAN 2: tool_call  [14:22:01.421 → 14:22:02.103]
  │    ├── tool: "search_web"   args: {"query": "..."}
  │    └── latency_ms: 682   result_tokens: 312
  │
  ├── SPAN 3: thought    [14:22:02.104 → 14:22:02.531]
  │    └── input_tokens: 1301  output_tokens: 98
  │
  └── SPAN 4: tool_call  [14:22:02.532 → 14:22:03.201]
       └── tool: "finish"   task_complete=true
  
  SUMMARY: steps=4  tokens=1700  cost=$0.034  termination=natural`)
        },
        {
          title: "Regression suites",
          content: "Agent regression suites should compare more than final text. Golden tasks or trajectories should also check first tool choice, total step count, total cost, and termination reason so hidden efficiency regressions are caught before users notice. Tool names such as LangSmith or Helicone are worth awareness-level mention, but the measurement model matters more than the vendor."
        }
      ],
      examples: [
        {
          title: "Correct answer, bad path",
          input: "An agent answers a docs question correctly but first calls three irrelevant tools and burns ten times the normal cost.",
          output: "Outcome evaluation passes, but trajectory metrics mark the run as a regression.",
          explanation: "The user saw a correct answer, but the path is operationally unhealthy.\nStep 2: If this pattern spreads, cost and latency will climb even before accuracy falls.\nStep 3: Separate trajectory metrics catch the problem early."
        },
        {
          title: "Root-cause attribution",
          input: "A research agent later hallucinates because the first retrieval step used the wrong source and everything downstream inherited the mistake.",
          output: "Step-level attribution should blame the initial retrieval decision rather than only the final synthesis.",
          explanation: "Downstream errors are often symptoms, not origins.\nStep 2: Without attribution, teams over-tune the final prompt instead of fixing earlier retrieval logic.\nStep 3: Attribution points remediation at the first broken decision."
        }
      ],
      tips: [
        "Measure both outcomes and trajectories because agents can be correct for bad reasons.",
        "Track first-tool accuracy and unnecessary-call rate separately from final quality.",
        "Log termination reasons as structured enums.",
        "Keep regression suites with cost and step metrics, not only text comparisons."
      ],
      tricks: [
        "If you can add only one new metric, add steps_used because it correlates with latency, cost, and reliability.",
        "Golden trajectories are especially valuable for high-value workflows where path quality matters as much as the answer.",
        "A spike in step_budget_hit_rate often reveals a hidden prompt or tool-selection regression before accuracy visibly drops.",
        "Counterfactual replay on a few bad traces can distinguish tool-policy bugs from reasoning bugs."
      ],
      memoryAids: [
        "Outcome tells you if it worked; trajectory tells you how it worked.",
        "Trace every model and tool call as a span.",
        "Core metrics: steps, cost, tools, budget hits, termination reasons."
      ],
      interviewPatterns: [
        "How would you evaluate an agent beyond final-answer accuracy?",
        "What metrics would you track for a tool-using agent in production?",
        "How would you attribute a multi-step failure to the right step?",
        "Frequency and companies: high-signal topic for teams that have actually shipped agents, because observability is what separates demos from dependable products."
      ],
      practiceProblems: [
        "METRICS DESIGN: Name five metrics you would track for a production agent and explain why.\n\nANSWERS:\nA strong answer includes steps_used, cost_per_task, tool_call_count, step_budget_hit_rate, and termination_reason_distribution. Together they cover efficiency, spend, tool usage, controller pressure, and how runs end.",
        "EVALUATION CHOICE: When is outcome-only evaluation insufficient?\n\nANSWERS:\nIt is insufficient whenever path quality matters, such as when tool misuse, lucky recovery, or cost explosions can be hidden behind a correct final answer. In those cases trajectory evaluation is necessary even though it is more expensive."
      ],
      faq: [
        {
          question: "Why is agent evaluation harder than single-prompt evaluation?",
          answer: "Because success depends on a sequence of decisions, several trajectories may be acceptable, and the visible final failure often appears several steps after the root cause. That makes both scoring and diagnosis richer and more expensive.",
          category: "evaluation"
        },
        {
          question: "What is trajectory evaluation?",
          answer: "It is evaluation that inspects the path an agent took: tool choices, arguments, retries, step count, and termination behavior. It asks not only whether the answer was right but whether the route was operationally good.",
          category: "evaluation"
        },
        {
          question: "Why separate tool-call correctness from final correctness?",
          answer: "Because an agent can be correct while still inefficient or fragile. Tool metrics catch regressions in cost and robustness that answer-only metrics miss.",
          category: "metrics"
        },
        {
          question: "What is step-level attribution?",
          answer: "It is the practice of identifying the earliest or most important step that caused a downstream failure, using annotation, replay, or heuristics. Attribution turns debugging into diagnosis instead of transcript archaeology.",
          category: "debugging"
        },
        {
          question: "What is a good minimal observability setup?",
          answer: "At minimum, keep a task identifier, spans for model and tool calls, token and cost metadata, step counts, and structured termination reasons. That small amount of structure already supports most useful investigations.",
          category: "observability"
        }
      ],
      references: [
        {
          source: "blog",
          attribution: "Anthropic — Building Effective Agents (2024) - https://www.anthropic.com/research/building-effective-agents",
          insight: "Helpful framing for trajectory-aware agent quality."
        },
        {
          source: "blog",
          attribution: "Chip Huyen — Agents (2025) - https://huyenchip.com/2025/01/07/agents.html",
          insight: "Strong engineering discussion of why agents need richer evaluation than single prompts."
        },
        {
          source: "paper",
          attribution: "Yao et al. — ReAct (2022) - https://arxiv.org/abs/2210.03629",
          insight: "Makes the trajectory itself an explicit object of analysis."
        },
        {
          source: "note",
          attribution: "LangSmith observability concepts - https://docs.smith.langchain.com/",
          insight: "Useful awareness-level tracing reference after the underlying measurement model is understood."
        }
      ]
    }
];
