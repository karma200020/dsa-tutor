"use client";

import { useState } from "react";
import Link from "next/link";
import type { MasteryStatus, Topic } from "@/data/syllabus";
import { cnSources } from "@/data/cn/sources";
import { cnLabs } from "@/data/cn/labs";
import { echoProgram } from "@/data/cn/native";
import { NetworkReliabilityModel } from "./network-reliability-model";
import styles from "./network-topic-viewer.module.css";

interface Props {
  topic: Topic;
  masteryMap: Record<string, MasteryStatus>;
  onMasteryChange: (status: MasteryStatus) => void;
  onBackClick: () => void;
}
function Prose({ text }: { text: string }) {
  return <>{text.split(/\n+/).filter(Boolean).map((paragraph, i) => <p key={i}>{paragraph}</p>)}</>;
}
function Steps({ steps }: { steps: string[] }) {
  return <ol>{steps.map((step, i) => <li key={i}>{step}</li>)}</ol>;
}

export function NetworkTopicViewer({ topic, masteryMap, onMasteryChange, onBackClick }: Props) {
  const [mode, setMode] = useState<"Learn" | "Revise" | "Practice">("Learn");
  const [traceStep, setTraceStep] = useState(0);
  const lesson = topic.network;
  if (!lesson) throw new Error(`Missing authored network lesson: ${topic.id}`);
  const lab = lesson.lab ? cnLabs.find((entry) => entry.id === lesson.lab) : undefined;
  const status = masteryMap[topic.id] ?? "not-started";

  return (
    <main className={styles.container}>
      <button type="button" onClick={onBackClick}>Back to Modules</button>
      <header>
        <p>Computer Networks {topic.optional ? "| Optional specialist" : "| Core"}</p>
        <h1>{topic.title}</h1>
        <p>{lesson.meaning}</p>
        <label>Update mastery status{" "}
          <select aria-label="Update mastery status" value={status} onChange={(event) => onMasteryChange(event.target.value as MasteryStatus)}>
            <option value="not-started">Not started</option>
            <option value="learning">Learning</option>
            <option value="practiced">Practiced: I can apply it</option>
            <option value="interview-ready">Interview ready: explain, predict and apply</option>
          </select>
        </label>
        {topic.optional && <p>Visible enrichment, excluded from ordinary readiness. This is our study policy, not ACM&apos;s classification.</p>}
      </header>
      <nav className={styles.modes} aria-label="Study mode">
        {(["Learn", "Revise", "Practice"] as const).map((name) => (
          <button type="button" key={name} aria-pressed={mode === name}
            onClick={() => { setMode(name); setTraceStep(0); }}>{name}</button>
        ))}
      </nav>
      <div key={mode}>
        {mode === "Learn" && <>
          <section><h2>Must know: why this problem exists</h2><Prose text={lesson.why} /></section>
          <section><h2>Mental model and its limits</h2><Prose text={lesson.model} /></section>
          <section><h2>How it works</h2><Steps steps={lesson.steps} />
            {lesson.diagram && <pre aria-label="Authored network diagram">{lesson.diagram}</pre>}
          </section>
          <section><h2>Worked example</h2><h3>Given</h3><pre>{lesson.example.given}</pre>
            <Steps steps={lesson.example.steps} /><h3>Result</h3><pre>{lesson.example.result}</pre>
          </section>
          <section><h2>When it fails</h2><Prose text={lesson.failure} /></section>
          <section><h2>Do not confuse</h2><ul>{lesson.confusions.map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section><h2>Useful: observe it</h2><Prose text={lesson.observe} /></section>
          <section><h2>Advanced boundary</h2><Prose text={lesson.advanced} /></section>
          <section><h2>Short interview answer</h2><Prose text={lesson.interview.answer} />
            <h3>Deep follow-ups</h3><ul>{lesson.interview.followups.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
        </>}
        {mode === "Revise" && <>
          <section><h2>Retrieve before revealing</h2><p>Say or write the answer first. Review tomorrow, after a few days, after a week, then after several weeks. These are recommendations, not an automated SM-2 scheduler.</p>
            {lesson.recall.map((card, i) => <details key={i}><summary>{card.question}</summary><p>{card.answer}</p></details>)}
          </section>
          <section><h2>Key facts and comparisons</h2><p>{lesson.interview.answer}</p>
            <ul>{lesson.confusions.map((item) => <li key={item}>{item}</li>)}</ul>
          </section>
          <section><h2>Reconstruct the mechanism</h2><details><summary>Reveal mechanism</summary><Steps steps={lesson.steps} /></details></section>
        </>}
        {mode === "Practice" && <>
          <section><h2>Explain, predict and apply</h2><p>Attempt each task without opening the disclosures. Reading a solution is not the same as solving.</p>
            {lesson.tasks.map((task, i) => <article key={i} className={styles.task}>
              <h3>{task.kind} {i + 1}</h3><Prose text={task.prompt} />
              <details><summary>Hint</summary><Prose text={task.hint} /></details>
              <details><summary>Answer</summary><Prose text={task.answer} /></details>
              <details><summary>Solution reasoning</summary><Prose text={task.reasoning} /></details>
            </article>)}
          </section>
          <section><h2>Rebuild the example</h2><pre>{lesson.example.given}</pre>
            <details><summary>Worked solution</summary><Steps steps={lesson.example.steps} /><pre>{lesson.example.result}</pre></details>
          </section>
        </>}
        {lesson.module === "reliable" && <NetworkReliabilityModel key={mode} />}
        {lab && <section><h2>Lab: {lab.title}</h2>
          <p><strong>Platform:</strong> {lab.platform}</p><p><strong>Prerequisites:</strong> {lab.prerequisites}</p>
          <p>Static Pages cannot open sockets or capture your network. This trace is an authored offline model, not a live capture. Optional commands run locally on authorized loopback or a disposable lab only.</p>
          <h3>Setup</h3><Prose text={lab.setup} />{lab.commands && <pre>{lab.commands}</pre>}
          {mode === "Practice"
            ? <details><summary>Expected observations</summary><Steps steps={lab.observations} /></details>
            : <><h3>Expected observations</h3><Steps steps={lab.observations} /></>}
          <h3>Deterministic offline walkthrough</h3>
          <pre aria-live="polite">{lab.trace.slice(0, traceStep + 1).join("\n")}</pre>
          <button type="button" disabled={traceStep === 0} onClick={() => setTraceStep((step) => step - 1)}>Previous event</button>{" "}
          <button type="button" disabled={traceStep >= lab.trace.length - 1} onClick={() => setTraceStep((step) => step + 1)}>Next event</button>{" "}
          <button type="button" onClick={() => setTraceStep(0)}>Reset trace</button>
          <p><a href={`data:text/plain;charset=utf-8,${encodeURIComponent(lab.trace.join("\n") + "\n")}`} download={`cn-${lab.id}.txt`}>Download sanitized offline trace</a></p>
          {mode === "Practice"
            ? <details><summary>Lab explanation</summary><Prose text={lab.explanation} /></details>
            : <><h3>Explanation</h3><Prose text={lab.explanation} /></>}
          <h3>Cleanup</h3><Prose text={lab.cleanup} />
          {lab.code && <details><summary>Local Python 3 program (not a browser Run button)</summary>
            <pre><code>{echoProgram}</code></pre>
            <a href={`data:text/plain;charset=utf-8,${encodeURIComponent(echoProgram)}`} download="cn_echo.py">Download exact displayed program</a>
            <p>The exact program compiled and self-tested on Linux Python 3.12.3 and Windows Python 3.13.5. Windows also exercised plain/framed CLI exchanges, UTF-8 and empty messages, invalid ports and the no-client timeout. Terminal encoding and font rendering may vary.</p>
          </details>}
        </section>}
      </div>
      <section><h2>Sources and provenance</h2><p>Original teaching and examples. References support protocol rules, not claims of interview frequency or exhaustive Internet research.</p>
        <ul>{lesson.sources.map((id) => {
          const source = cnSources[id];
          if (!source) throw new Error(`Unknown CN source ${id}`);
          return <li key={id}><a href={source.url} target="_blank" rel="noopener noreferrer">{source.title}</a>
            <p>{source.version}. {source.locator}.</p></li>;
        })}</ul>
      </section>
      <section><h2>Related tracks</h2><p>Connect these ideas without repeating their whole curricula.</p>
        <div className={styles.modes}>
          <Link href="/?track=OS">OS: buffers and scheduling</Link>
          <Link href="/?track=HLD">HLD: distributed architecture</Link>
          <Link href="/?track=LLD">LLD: interfaces and ownership</Link>
          <Link href="/?track=DSA">DSA: graphs and queues</Link>
        </div>
      </section>
      <button type="button" onClick={onBackClick}>Back to Modules</button>
    </main>
  );
}
