"use client";
import { useState } from "react";
import { stopAndWait, type LossScenario } from "@/data/cn/models";

export function NetworkReliabilityModel() {
  const [loss, setLoss] = useState<LossScenario>("ack");
  const [step, setStep] = useState(0);
  const events = stopAndWait(loss);
  const current = events[step];
  return <section>
    <h2>Alternating-bit protocol: deterministic model</h2>
    <p>Original one-message simulation. It demonstrates timeout recovery and duplicate suppression, not TCP, real timing, corruption or unbounded delayed packet lifetimes. Alternating bits alone require assumptions about old packets; this finite model does not prove general exactly-once delivery.</p>
    <label>Loss scenario{" "}
      <select aria-label="Loss scenario" value={loss} onChange={(event) => { setLoss(event.target.value as LossScenario); setStep(0); }}>
        <option value="none">No loss</option><option value="data">Lose first DATA</option><option value="ack">Lose first ACK</option>
      </select>
    </label>
    <p aria-live="polite">{current.event}</p>
    <p>Delivered to receiver application: {current.delivered}. Receiver expected bit: {current.expected}.</p>
    <p>Sender sequence bit: {current.senderSequence}. Waiting for ACK: {current.waitingForAck ? "yes" : "no"}.</p>
    <button type="button" disabled={step === 0} onClick={() => setStep((value) => value - 1)}>Previous protocol event</button>{" "}
    <button type="button" disabled={step === events.length - 1} onClick={() => setStep((value) => value + 1)}>Next protocol event</button>{" "}
    <button type="button" onClick={() => setStep(0)}>Reset protocol model</button>
  </section>;
}
