// Small helpers shared by the HLD and LLD enrichment modules. Kept separate so
// importing one track's dataset does not pull in the other track's mock specs.

export function diagramBlock(ascii: string): string {
  return `<pre style="margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#a5f3fc;white-space:pre;text-align:left;overflow-x:auto;">${ascii}</pre>`;
}

// Build a rich, topic-specific FAQ set instead of the generic 3-question
// fallback. HLD FAQs cover requirements changes, capacity math, bottlenecks,
// API/data model, cache/queue/partitioning, consistency/availability, failure
// recovery, security/observability, and trade-offs. LLD FAQs cover
// why/when to use the pattern, alternatives/trade-offs, SOLID/OOP
// implications, UML/class relationships, concurrency/thread safety,
// extensibility, and testing. Content is derived from each topic's own
// authored spec (mock solution, generic HLD solution, or lesson/intuition)
// so answers stay topic-specific rather than generic filler.
export const primerSourceLinks = {
  hld: { label: "ashishps1/awesome-system-design-resources", url: "https://github.com/ashishps1/awesome-system-design-resources" },
  lld: { label: "ashishps1/awesome-low-level-design", url: "https://github.com/ashishps1/awesome-low-level-design" },
  algomasterUrlShortener: {
    label: "AlgoMaster: Design a URL Shortener",
    url: "https://algomaster.io/learn/system-design/url-shortener"
  }
};
