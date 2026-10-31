import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawnSync } from "node:child_process";
import { echoProgram } from "../data/cn/native";
import { transmissionMs, propagationMs, bandwidthDelayBytes, windowCeilingBits, nyquistBits, shannonBits,
  subnet, longestPrefix, ipv4Fragments, httpCurrentAge, stopAndWait, alternatingBit, ipv4Number, routedLifetime } from "../data/cn/models";

function near(actual: number, expected: number, tolerance = 1e-7) {
  assert(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
}
near(transmissionMs(1500, 10_000_000), 1.2);
near(propagationMs(200_000, 200_000_000), 1);
assert.deepEqual(routedLifetime(9, 3), { delivered: true, remaining: 6 });
assert.deepEqual(routedLifetime(3, 3), { delivered: false, droppedAtRouter: 3 });
assert.deepEqual(routedLifetime(4, 3), { delivered: true, remaining: 1 });
assert.deepEqual(routedLifetime(1, 0), { delivered: true, remaining: 1 });
assert.throws(() => routedLifetime(0, 3));
near(bandwidthDelayBytes(100_000_000, 80), 1_000_000);
near(windowCeilingBits(64_000, 80), 6_400_000);
near(nyquistBits(3000, 4), 12000);
near(shannonBits(3000, 30), 29901.6787765, 0.0001);
near(0.008 / 0.088, 1 / 11);
assert.deepEqual(ipv4Fragments(2400, 1500), [
  { payload: 1480, total: 1500, offset: 0, more: true },
  { payload: 920, total: 940, offset: 185, more: false }
]);
const s = subnet("192.0.2.130", 26);
assert.equal(s.network, "192.0.2.128"); assert.equal(s.last, "192.0.2.191");
assert.equal(s.firstUsualHost, "192.0.2.129"); assert.equal(s.lastUsualHost, "192.0.2.190");
assert.deepEqual(subnet("10.0.0.10", 31, true).endpoints, ["10.0.0.10", "10.0.0.11"]);
assert.equal(subnet("10.0.0.10", 31).firstUsualHost, undefined);
assert.deepEqual(subnet("192.0.2.130", 32).endpoints, ["192.0.2.130"]);
assert.equal(subnet("192.0.2.130", 0).size, 4294967296);
assert.equal(longestPrefix("10.1.2.99", [
  { network: "0.0.0.0", prefix: 0, next: "default" },
  { network: "10.0.0.0", prefix: 8, next: "A" },
  { network: "10.1.0.0", prefix: 16, next: "B" },
  { network: "10.1.2.0", prefix: 24, next: "C" }
]).next, "C");
assert.equal(httpCurrentAge(10, 12, 9, 1, 20), 11);
assert.equal(60 - httpCurrentAge(10, 12, 9, 1, 20), 49);
for (const loss of ["none", "data", "ack"] as const) {
  const events = stopAndWait(loss);
  assert.equal(events[events.length - 1].delivered, 1);
  assert.equal(events[events.length - 1].waitingForAck, false);
  assert.equal(events[events.length - 1].senderSequence, 1);
  assert(events.every((event) => event.delivered <= 1));
  const repeated = alternatingBit(["A", "B", "C"], loss);
  assert.equal(repeated[repeated.length - 1].delivered, 3);
  assert.equal(repeated[repeated.length - 1].expected, 1);
}
assert(stopAndWait("ack").some((event) => event.event.includes("duplicate")));
assert(stopAndWait("ack").filter((event) => event.event.includes("duplicate")).every((event) => event.delivered === 1));
assert.throws(() => alternatingBit([], "none"));
for (const bad of ["1.2.3", "256.1.1.1", "01.2.3.4", "a.b.c.d"]) assert.throws(() => ipv4Number(bad));
assert.throws(() => subnet("1.2.3.4", 33));
assert.throws(() => nyquistBits(3000, 1));
assert.throws(() => transmissionMs(1, 0));
assert.throws(() => httpCurrentAge(10, 9, 8, 1, 20));
assert.throws(() => longestPrefix("1.2.3.4", []));

const directory = mkdtempSync(join(tmpdir(), "cn-native-"));
try {
  const file = join(directory, "cn_echo.py");
  writeFileSync(file, echoProgram);
  for (const args of [["-m", "py_compile", file], [file, "--self-test"]]) {
    const result = spawnSync("python3", args, { encoding: "utf8", timeout: 20_000 });
    assert.equal(result.status, 0, result.stderr || result.error?.message);
    if (result.stdout) console.log(result.stdout.trim());
  }
  const invalid = spawnSync("python3", [file, "--client", "--port", "0"], { encoding: "utf8" });
  assert.notEqual(invalid.status, 0);
  assert(invalid.stderr.includes("port must be"));
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log("CN independent numeric fixtures, edge/rejection cases, protocol model and exact displayed native program passed.");
