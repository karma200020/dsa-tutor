// Shared helpers for the C++ track datasets in this folder.
//
// `asciiDiagram` is the text/monospace diagram convention used across the app
// (see data/ai/_shared.ts and data/os/_shared.ts). Keeping one copy here means
// all C++ module files render diagrams identically: native to the app (no
// external images), readable in a terminal-style font, and easy to redraw on a
// whiteboard in the stated order.
//
// The markup is static, authored styling wrapped around caller-supplied art, so
// callers must pass only authored diagram text (never user input) since it is
// rendered as HTML.
export function asciiDiagram(art: string): string {
  return `<pre style="margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#a5f3fc;white-space:pre;text-align:left;overflow-x:auto;">${art}</pre>`;
}
