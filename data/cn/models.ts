function finitePositive(value: number, label: string) {
  if (!Number.isFinite(value) || value <= 0) throw new Error(`${label} must be finite and positive`);
}
export function transmissionMs(bytes: number, bitsPerSecond: number): number {
  finitePositive(bytes, "bytes"); finitePositive(bitsPerSecond, "rate");
  return bytes * 8 / bitsPerSecond * 1000;
}
export function propagationMs(metres: number, metresPerSecond: number): number {
  finitePositive(metres, "distance"); finitePositive(metresPerSecond, "speed");
  return metres / metresPerSecond * 1000;
}
export function routedLifetime(initial: number, forwardingRouters: number) {
  if (!Number.isInteger(initial) || initial < 1 || initial > 255 ||
      !Number.isInteger(forwardingRouters) || forwardingRouters < 0) throw new Error("Invalid lifetime path");
  if (initial <= forwardingRouters) return { delivered: false, droppedAtRouter: initial };
  return { delivered: true, remaining: initial - forwardingRouters };
}
export function bandwidthDelayBytes(bitsPerSecond: number, rttMs: number): number {
  finitePositive(bitsPerSecond, "rate"); finitePositive(rttMs, "RTT");
  return bitsPerSecond * rttMs / 8000;
}
export function windowCeilingBits(windowBytes: number, rttMs: number): number {
  finitePositive(windowBytes, "window"); finitePositive(rttMs, "RTT");
  return windowBytes * 8000 / rttMs;
}
export function nyquistBits(hertz: number, levels: number): number {
  finitePositive(hertz, "bandwidth");
  if (!Number.isInteger(levels) || levels < 2) throw new Error("symbol levels must be an integer >= 2");
  return 2 * hertz * Math.log2(levels);
}
export function shannonBits(hertz: number, snrDb: number): number {
  finitePositive(hertz, "bandwidth");
  if (!Number.isFinite(snrDb)) throw new Error("SNR must be finite");
  return hertz * Math.log2(1 + 10 ** (snrDb / 10));
}
export function ipv4Number(address: string): number {
  const octets = address.split(".");
  if (octets.length !== 4 || octets.some((part) => !/^(0|[1-9]\d{0,2})$/.test(part) || Number(part) > 255)) {
    throw new Error(`Invalid dotted-decimal IPv4 address: ${address}`);
  }
  return octets.reduce((value, part) => value * 256 + Number(part), 0);
}
export function ipv4Text(value: number): string {
  if (!Number.isInteger(value) || value < 0 || value > 0xffffffff) throw new Error("Invalid IPv4 integer");
  return [24, 16, 8, 0].map((shift) => (value >>> shift) & 255).join(".");
}
export function subnet(address: string, prefix: number, pointToPoint = false) {
  if (!Number.isInteger(prefix) || prefix < 0 || prefix > 32) throw new Error("Invalid IPv4 prefix");
  const ip = ipv4Number(address);
  const size = 2 ** (32 - prefix);
  const first = Math.floor(ip / size) * size;
  const last = first + size - 1;
  const endpoints = prefix === 32 ? [first] : prefix === 31 && pointToPoint ? [first, last] : undefined;
  return {
    network: ipv4Text(first),
    last: ipv4Text(last),
    firstUsualHost: prefix < 31 ? ipv4Text(first + 1) : undefined,
    lastUsualHost: prefix < 31 ? ipv4Text(last - 1) : undefined,
    endpoints: endpoints?.map(ipv4Text),
    size
  };
}
export function longestPrefix(address: string, routes: { network: string; prefix: number; next: string }[]) {
  const ip = ipv4Number(address);
  const matches = routes.filter((route) => {
    const range = subnet(route.network, route.prefix);
    const first = ipv4Number(range.network);
    return ip >= first && ip < first + range.size;
  });
  if (!matches.length) throw new Error(`No matching route for ${address}`);
  return matches.reduce((best, route) => route.prefix > best.prefix ? route : best);
}
export function ipv4Fragments(payload: number, mtu: number, header = 20) {
  if (!Number.isInteger(payload) || payload <= 0 || payload + header > 65535) throw new Error("Invalid IPv4 payload");
  if (!Number.isInteger(header) || header < 20 || header > 60 || header % 4) throw new Error("Invalid IPv4 header size");
  if (!Number.isInteger(mtu) || mtu <= header + 7) throw new Error("MTU too small for this fragmentation model");
  const capacity = Math.floor((mtu - header) / 8) * 8;
  const result: { payload: number; total: number; offset: number; more: boolean }[] = [];
  for (let sent = 0; sent < payload;) {
    const amount = Math.min(payload - sent, payload - sent <= mtu - header ? mtu - header : capacity);
    result.push({ payload: amount, total: header + amount, offset: sent / 8, more: sent + amount < payload });
    sent += amount;
  }
  return result;
}
export function httpCurrentAge(requestTime: number, responseTime: number, date: number, age: number, now: number) {
  if ([requestTime, responseTime, date, age, now].some((value) => !Number.isFinite(value)) ||
      responseTime < requestTime || now < responseTime || age < 0) throw new Error("Invalid HTTP age timeline");
  const apparent = Math.max(0, responseTime - date);
  const correctedAge = age + responseTime - requestTime;
  return Math.max(apparent, correctedAge) + now - responseTime;
}

export type LossScenario = "none" | "data" | "ack";
export interface ReliableEvent {
  event: string;
  delivered: number;
  expected: 0 | 1;
  senderSequence: 0 | 1;
  waitingForAck: boolean;
}
// Original bounded channel: one injected loss, no stale packet survives a
// sequence-bit wrap. This is not TCP or an unbounded exactly-once guarantee.
export function alternatingBit(payloads: readonly string[], scenario: LossScenario): ReliableEvent[] {
  if (!["none", "data", "ack"].includes(scenario)) throw new Error("Unknown loss scenario");
  if (!payloads.length || payloads.length > 4) throw new Error("Model accepts one to four messages");
  const events: ReliableEvent[] = [];
  let delivered = 0;
  let expected: 0 | 1 = 0;
  let senderSequence: 0 | 1 = 0;
  let waitingForAck = false;
  const record = (event: string) => events.push({ event, delivered, expected, senderSequence, waitingForAck });
  function receiveData(sequence: 0 | 1, payload: string): 0 | 1 {
    if (sequence === expected) {
      delivered++;
      expected = expected === 0 ? 1 : 0;
      record(`Receiver accepts DATA${sequence}: deliver ${payload} once, expect ${expected}, send ACK${sequence}.`);
    } else {
      record(`Receiver expects ${expected}: DATA${sequence} is a duplicate. Do not deliver again; resend ACK${sequence}.`);
    }
    return sequence;
  }
  function receiveAck(acknowledged: 0 | 1) {
    if (waitingForAck && acknowledged === senderSequence) {
      waitingForAck = false;
      senderSequence = senderSequence === 0 ? 1 : 0;
      record(`Sender accepts ACK${acknowledged}; next sequence bit ${senderSequence}.`);
    } else {
      record(`Sender ignores nonmatching or duplicate ACK${acknowledged}.`);
    }
  }
  for (const [index, payload] of payloads.entries()) {
    waitingForAck = true;
    const sequence = senderSequence;
    record(`Sender sends payload ${payload} with sequence bit ${sequence}.`);
    if (index === 0 && scenario === "data") {
      record("First DATA is lost; receiver has not delivered it.");
      record(`Sender timer expires; retransmit DATA${sequence}.`);
    }
    let acknowledgment = receiveData(sequence, payload);
    if (index === 0 && scenario === "ack") {
      record(`ACK${acknowledgment} is lost; sender still waits.`);
      record(`Sender timer expires; retransmit DATA${sequence}.`);
      acknowledgment = receiveData(sequence, payload);
    }
    receiveAck(acknowledgment);
  }
  return events;
}
export function stopAndWait(scenario: LossScenario): ReliableEvent[] {
  return alternatingBit(["A"], scenario);
}
