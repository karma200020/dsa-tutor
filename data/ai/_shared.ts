// Shared helpers for the AI track datasets in this folder.
//
// `asciiDiagram` is the text/monospace diagram convention used across the app
// (see hld-topics.ts and all-topics.ts, which each declare a local copy). The AI
// track keeps a single shared copy here so all ten module files render diagrams
// identically. Diagrams stay native to the app (no external images), readable in
// a terminal-style font, and easy to redraw on a whiteboard in the stated order.
//
// The markup is static, authored styling wrapped around caller-supplied art, so
// callers must pass only authored diagram text (never user input) since it is
// rendered as HTML.
export function asciiDiagram(art: string): string {
  return `<pre style="margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#a5f3fc;white-space:pre;text-align:left;overflow-x:auto;">${art}</pre>`;
}
