// Optional browser gate. Install Playwright in an isolated tools directory, not
// the application bundle. CN_PLAYWRIGHT_PATH can point to its package entry.
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
const require = createRequire(import.meta.url);
const { chromium } = require(process.env.CN_PLAYWRIGHT_PATH || "playwright");
const base = process.env.CN_PREVIEW_URL || "http://127.0.0.1:4179/dsa-tutor/";
const inventory = JSON.parse(readFileSync("data/cn/inventory.json", "utf8"));
const browser = await chromium.launch({
  headless: true,
  ...(process.env.CN_CHROME_PATH ? { executablePath: process.env.CN_CHROME_PATH } : {}),
  args: ["--no-sandbox"]
});
const context = await browser.newContext({ viewport: { width: 1365, height: 900 } });
const page = await context.newPage();
const errors = [];
const scripts = [];
page.on("pageerror", (error) => errors.push(error.message));
page.on("response", (response) => {
  if (response.url().endsWith(".js")) scripts.push(response);
});
const visible = async (locator) => { await locator.waitFor({ state: "visible" }); };
const overflow = async () => page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
const selectMode = async (name) => {
  await page.getByRole("button", { name, exact: true }).click();
  assert.equal(await page.getByRole("button", { name, exact: true }).getAttribute("aria-pressed"), "true");
};
const closed = async () => {
  assert.equal(await page.locator("details[open]").count(), 0, "A disclosure was open before retrieval");
};
const topicUrl = (id, optional = false) => `${base}?track=CN&topic=topic-${optional ? "specialist-" : ""}cn-${id}`;
const evidence = { base, lessons: inventory.lessons.length, checks: [], homeScripts: [], lateCnScripts: [] };
try {
  await page.goto(base);
  await visible(page.getByRole("heading", { name: "Choose Your Learning Path" }));
  const cnCard = page.getByRole("button", { name: /Computer Networks/ });
  await visible(cnCard);
  assert((await cnCard.textContent()).includes("170 Topics"));
  await page.waitForLoadState("networkidle");
  const homeScriptCount = scripts.length;
  for (const response of scripts) {
    const text = await response.text();
    assert(!text.includes("network-devices"), "Home fetched CN lesson payload");
    evidence.homeScripts.push(new URL(response.url()).pathname);
  }
  evidence.checks.push("Home has seventh card and no CN content script");
  await cnCard.focus();
  await page.keyboard.press("Enter");
  await visible(page.getByRole("heading", { name: "CN Learning Modules" }));
  assert(new URL(page.url()).searchParams.get("track") === "CN");
  assert.equal(await page.locator("button").filter({ has: page.locator("h4") }).count(), 170);
  assert.equal(await page.getByText("Optional learning: not an ordinary interview prerequisite.", { exact: true }).count(), 4);
  const cheatSheets = page.locator('ul[class*="cheatsheetList"]');
  assert.equal(await cheatSheets.count(), 24);
  for (const [index, module] of inventory.modules.entries()) {
    assert.equal(await cheatSheets.nth(index).locator("li").count(), module.count);
  }
  for (const response of scripts.slice(homeScriptCount)) {
    if ((await response.text()).includes("network-devices")) evidence.lateCnScripts.push(new URL(response.url()).pathname);
  }
  assert(evidence.lateCnScripts.length > 0, "CN payload did not load when selected");
  await page.locator("button").filter({ has: page.locator("h4") }).nth(6).click();
  await visible(page.getByRole("button", { name: "Learn", exact: true }));
  assert(new URL(page.url()).searchParams.get("topic") === "topic-cn-packet-journey");
  await page.getByRole("button", { name: "Practice", exact: true }).focus();
  await page.keyboard.press("Enter");
  await closed();
  const hint = page.locator("summary").filter({ hasText: /^Hint$/ }).first();
  await hint.focus();
  await page.keyboard.press("Space");
  assert.equal(await hint.evaluate((element) => element.parentElement.open), true);
  assert.equal(await page.locator("details[open]").count(), 1);
  await page.keyboard.press("Space");
  await closed();
  await selectMode("Revise");
  await closed();
  await page.getByLabel("Update mastery status", { exact: true }).selectOption("practiced");
  await page.reload();
  await visible(page.getByRole("button", { name: "Learn", exact: true }));
  assert.equal(await page.getByLabel("Update mastery status", { exact: true }).inputValue(), "practiced");
  await page.goBack();
  await visible(page.getByRole("heading", { name: "CN Learning Modules" }));
  await page.goForward();
  await visible(page.getByRole("button", { name: "Learn", exact: true }));
  await page.getByRole("link", { name: "OS: buffers and scheduling", exact: true }).click();
  await visible(page.getByRole("heading", { name: "OS Learning Modules", exact: true }));
  await page.goBack();
  await visible(page.getByRole("button", { name: "Learn", exact: true }));
  evidence.checks.push("24 authored module cheat sheets, keyboard track/Practice/disclosure, refresh, Back/Forward and persisted mastery");
  await page.setViewportSize({ width: 375, height: 812 });
  assert.equal(await overflow(), false, "Mobile topic overflows viewport");
  await page.getByRole("button", { name: "Back to Modules", exact: true }).first().click();
  await visible(page.getByRole("heading", { name: "CN Learning Modules" }));
  assert.equal(await overflow(), false, "Mobile module list overflows viewport");
  await page.goto(topicUrl("multicast-trees", true));
  await visible(page.getByLabel("Update mastery status", { exact: true }));
  await page.getByLabel("Update mastery status", { exact: true }).selectOption("interview-ready");
  await page.goto(base);
  await visible(page.getByText("1/30 optional specialist topics mastered (excluded from interview readiness)", { exact: true }));
  await visible(page.getByText("485", { exact: true }));
  evidence.checks.push("375px mobile topic/modules and optional mastery excluded from 485 core readiness");
  await page.goto(`${base}?topic=topic-cn-message-framing`);
  await visible(page.getByRole("button", { name: "Learn", exact: true }));
  await page.waitForURL((url) => url.searchParams.get("track") === "CN");
  await page.goto(`${base}?track=DSA&topic=topic-cn-message-framing`);
  await visible(page.getByRole("button", { name: "Learn", exact: true }));
  await page.waitForURL((url) => url.searchParams.get("track") === "CN");
  evidence.checks.push("Related OS crosslink, bare-topic links and mismatched-track links resolve to the correct track");

  const catalog = await (await context.request.get(`${base}progress-catalog.json`)).json();
  assert.equal(catalog.length, 515);
  const priorId = catalog.find((id) => !id.includes("-cn-") && !id.startsWith("topic-specialist-"));
  const legacy = await browser.newContext();
  await legacy.addInitScript(({ priorId }) => localStorage.setItem("dsa-tutor-mastery",
    JSON.stringify({ [priorId]: "interview-ready", "stale-removed-id": "learning" })), { priorId });
  const legacyPage = await legacy.newPage();
  await legacyPage.goto(base);
  await legacyPage.waitForFunction((id) => {
    const progress = JSON.parse(localStorage.getItem("dsa-tutor-mastery"));
    return progress[id] === "interview-ready" && !("stale-removed-id" in progress);
  }, priorId);
  await legacy.close();
  evidence.checks.push("Identity catalog contains 515 IDs; prior valid progress retained and stale progress removed");

  await page.goto(topicUrl("reliable-arq-sequence"));
  await visible(page.getByRole("heading", { name: "Alternating-bit protocol: deterministic model" }));
  for (const scenario of ["none", "data", "ack"]) {
    await page.getByLabel("Loss scenario").selectOption(scenario);
    const next = page.getByRole("button", { name: "Next protocol event", exact: true });
    while (await next.isEnabled()) await next.click();
    await visible(page.getByText("Delivered to receiver application: 1. Receiver expected bit: 1.", { exact: true }));
  }
  evidence.checks.push("All three ARQ channel scenarios deliver once in the rendered original model");
  const labs = {
    "packet-journey": "Address, Route, Neighbor and Socket Inspection",
    "cidr-host-ranges": "Subnet, VLSM and Longest-Prefix Cases",
    "arp-cache": "DHCP Allocation and ARP Delivery",
    "dns-resolution": "DNS Resolution, Cache and Failures",
    "tcp-handshake": "TCP Setup, Loss and Acknowledgments",
    "http-caching": "HTTP Miss, Fresh Hit and Revalidation",
    "tls-browser-handshake": "TLS 1.3 Handshake and Visibility",
    "socket-lifecycle": "Local TCP Echo Client and Server",
    "message-framing": "Length-Prefixed Messages and Rejection Tests",
    "route-neighbor-failures": "Isolated Broken Configuration",
    "ipv6-journey-case": "IPv4 Versus IPv6 Delivery",
    "load-balancing": "Proxy and Load-Balancer Request Boundaries"
  };
  for (const [id, title] of Object.entries(labs)) {
    await page.goto(topicUrl(id));
    await visible(page.getByRole("heading", { name: `Lab: ${title}`, exact: true }));
    const download = page.getByRole("link", { name: "Download sanitized offline trace", exact: true });
    assert((await download.getAttribute("href")).startsWith("data:text/plain"));
    const next = page.getByRole("button", { name: "Next event", exact: true });
    await next.click();
    await page.getByRole("button", { name: "Reset trace", exact: true }).click();
    assert.equal(await page.getByRole("button", { name: "Previous event", exact: true }).isDisabled(), true);
  }
  evidence.checks.push("All 12 lab owners, sanitized downloads, trace stepping and reset rendered");
  for (const lesson of inventory.lessons) {
    const optional = ["enterprise", "mobile", "datacenter", "history"].includes(lesson.module);
    await page.goto(topicUrl(lesson.id, optional));
    await visible(page.getByRole("heading", { name: lesson.title, exact: true }));
    assert.equal(await overflow(), false, `${lesson.id}: mobile overflow`);
    await selectMode("Practice");
    await closed();
    assert(await page.getByRole("heading", { name: "Explain, predict and apply" }).isVisible());
    assert(await page.locator("summary").filter({ hasText: /^Answer$/ }).count() >= 2);
    await selectMode("Revise");
    await closed();
    assert(await page.getByRole("heading", { name: "Retrieve before revealing" }).isVisible());
    assert(await page.locator("details").count() >= 3);
  }
  evidence.checks.push("All 170 deep-linked lessons render Learn/Practice/Revise at mobile width, closed disclosures and no overflow");
  await page.goto(`${base}company-questions/`);
  await page.waitForLoadState("networkidle");
  assert.equal(await page.locator("details[open]").count(), 0, "Google bank disclosure regression");
  evidence.checks.push("Separate Google bank route still renders with every disclosure closed");
  assert.deepEqual(errors, [], "Browser runtime errors");
  evidence.runtimeErrors = errors;
  const file = process.env.CN_BROWSER_EVIDENCE;
  if (file) writeFileSync(file, JSON.stringify(evidence, null, 2) + "\n");
  console.log(JSON.stringify(evidence, null, 2));
} finally {
  await context.close();
  await browser.close();
}
