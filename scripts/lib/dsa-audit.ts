import type { Module, Topic, Track } from "../../data/syllabus";
import type { ConceptMapping } from "../../data/dsa-coverage-manifest";
import { retainedDsaTopics } from "../../data/dsa-coverage-manifest";
import { isPracticeVariation } from "../../data/practice-variation";
import { topicAliases } from "../../data/topic-migrations";

export type TrackDatasets = Record<Track, Topic[]>;
export type AuditFinding = { rule: string; detail: string };

export function auditDsa(
  modules: Module[], tracks: TrackDatasets, manifest: ConceptMapping[], complete: boolean
): AuditFinding[] {
  const findings: AuditFinding[] = [];
  const fail = (rule: string, detail: string) => findings.push({ rule, detail });
  const moduleMap = new Map<string, Module>();
  for (const m of modules) {
    if (moduleMap.has(m.id)) fail("module:duplicate", m.id);
    moduleMap.set(m.id, m);
  }
  const active = new Map<string, Topic>();
  const counts = new Map<string, number>();
  for (const [track, topics] of Object.entries(tracks)) {
    for (const topic of topics) {
      if (active.has(topic.id)) fail("topic:duplicate", topic.id);
      active.set(topic.id, topic);
      const owner = moduleMap.get(topic.moduleId);
      if (!owner || owner.track !== track) fail("ownership", `${track}/${topic.id} belongs to ${owner?.track ?? "unknown module"}`);
      counts.set(topic.moduleId, (counts.get(topic.moduleId) ?? 0) + 1);
      if (Boolean(topic.optional) !== Boolean(owner?.optional)) fail("optional:ownership", topic.id);
      if (Boolean(topic.optional) !== topic.id.startsWith("topic-specialist-")) fail("optional:identity", topic.id);
    }
  }
  const visiting = new Set<string>(), visited = new Set<string>();
  function visit(m: Module) {
    if (visiting.has(m.id)) { fail("dependency:cycle", m.id); return; }
    if (visited.has(m.id)) return;
    visiting.add(m.id);
    for (const id of m.dependencies) {
      const dep = moduleMap.get(id);
      if (!dep) fail("dependency:missing", `${m.id} -> ${id}`);
      else {
        if (dep.track !== m.track) fail("dependency:track", `${m.id} -> ${id}`);
        if (!m.optional && dep.optional) fail("dependency:optional", `${m.id} requires specialist ${id}`);
        visit(dep);
      }
    }
    visiting.delete(m.id); visited.add(m.id);
  }
  for (const m of modules) {
    visit(m);
    const actual = counts.get(m.id) ?? 0;
    if (m.topicCount !== actual) fail("module:count-drift", `${m.id}: declared ${m.topicCount}, live ${actual}`);
    if (complete && !actual) fail("module:empty", m.id);
  }
  const titles = new Map<string, string>();
  for (const t of tracks.DSA) {
    const normalized = t.title.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
    if (titles.has(normalized)) fail("title:unreviewed-duplicate", `${titles.get(normalized)} / ${t.id}`);
    titles.set(normalized, t.id);
  }
  for (const [retired, canonical] of Object.entries(topicAliases)) {
    if (active.has(retired) || !active.has(canonical)) fail("migration:identity", `${retired} -> ${canonical}`);
  }
  for (const [moduleId, ids] of Object.entries(retainedDsaTopics)) {
    for (const id of ids) {
      const t = active.get(id);
      if (!t || t.moduleId !== moduleId) fail("inventory:lost", `${moduleId}/${id}`);
    }
  }
  const seenConcepts = new Set<string>();
  const inspected = new Set<string>();
  for (const mapping of manifest) {
    if (seenConcepts.has(mapping.concept)) fail("coverage:duplicate-concept", mapping.concept);
    seenConcepts.add(mapping.concept);
    const required = mapping.scope === "core" || complete;
    const t = active.get(mapping.topicId);
    if (!t) {
      if (required) fail(`coverage:missing-${mapping.scope}`, `${mapping.concept}: ${mapping.topicId}`);
      continue;
    }
    if (mapping.status !== "dedicated") {
      if (required) fail("coverage:not-dedicated", mapping.concept);
      continue;
    }
    if (mapping.moduleId !== t.moduleId || moduleMap.get(t.moduleId)?.track !== "DSA") fail("coverage:module", mapping.concept);
    if ((mapping.scope === "specialist") !== Boolean(t.optional)) fail("coverage:scope", mapping.concept);
    const prose = [t.intuition, ...(t.lesson ?? []).map((s) => s.content)].join("\n").toLowerCase();
    const code = (t.lesson ?? []).map((s) => s.codeExample ?? "").join("\n");
    if (!prose.includes(mapping.prose.toLowerCase()) || !code.includes(mapping.implementation)) {
      fail("coverage:dedicated-evidence", mapping.concept);
    }
    if (inspected.has(t.id)) continue;
    inspected.add(t.id);
    for (const title of ["Contract and recognition", "Invariant and correctness", "C++ implementation", "Edge cases and limitations", "Alternatives and trade-offs"]) {
      if (!t.lesson?.some((s) => s.title === title && s.content.trim())) fail("content:section", `${t.id}: ${title}`);
    }
    if (!code.includes("#include") || !code.includes("using namespace std;")) fail("content:implementation", t.id);
    if (!t.examples?.some((e) => e.input && e.output && e.explanation.length >= 100)) fail("content:trace", t.id);
    if (!t.complexity?.time || !t.complexity.space) fail("content:bounds", t.id);
    const practices = t.practiceProblems?.filter(isPracticeVariation) ?? [];
    if (practices.length < 3 || new Set(practices.map((p) => p.variation)).size < 3 ||
      practices.some((p) => !p.tip.trim() || !p.snippet.trim() || !/[;{}]/.test(p.snippet))) {
      fail("content:practice", t.id);
    }
    if (!t.faq || t.faq.length < 2 || t.faq.some((f) => !f.question.trim() || !f.answer.trim())) fail("content:faq", t.id);
  }
  return findings;
}
