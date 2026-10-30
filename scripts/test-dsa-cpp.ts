import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { authoredAlgorithms } from "../data/dsa-curriculum";
import { cppCases } from "./dsa-cpp-cases";
import { allDsaTopics } from "../data/topics/dsa";
import { isPracticeVariation } from "../data/practice-variation";

const dir = mkdtempSync(path.join(tmpdir(), "dsa-cpp-"));
let programs = 0, practices = 0;
try {
  assert.deepEqual(new Set(Object.keys(cppCases)), new Set(authoredAlgorithms.map((a) => a.id)), "Regression fixtures must match the authored algorithm inventory.");
  const compiler = process.env.CXX || "g++";
  const available = spawnSync(compiler, ["--version"], { encoding: "utf8" });
  assert.equal(available.status, 0, `C++ compiler unavailable: ${available.error?.message ?? available.stderr}`);
  console.log(available.stdout.split("\n")[0]);
  for (const a of authoredAlgorithms) {
    assert(cppCases[a.id]?.trim(), `${a.id} needs executable regression assertions`);
    const live = allDsaTopics.find((topic) => topic.id === a.id);
    const shownCode = live?.lesson?.filter((s) => s.codeExample).map((s) => s.codeExample) ?? [];
    assert.deepEqual(shownCode, [a.code], `${a.id} must display exactly the implementation being tested`);
    const shownPractice = live?.practiceProblems?.filter(isPracticeVariation) ?? [];
    assert.deepEqual(shownPractice, a.practice, `${a.id} must display the practices being compiled`);
    const calls: string[] = [];
    const exercises = shownPractice.map((p, i) => {
      // Function/struct exercises live at namespace scope; executable usage
      // examples live in a function and are also run after the primary tests.
      const definition = /\)\s*(?:const\s*)?\{/.test(p.snippet);
      if (!definition) calls.push(`practice_${i}::exercise();`);
      return `namespace practice_${i} {\n${definition ? p.snippet : `void exercise(){\n${p.snippet}\n}`}\n}`;
    }).join("\n");
    const file = path.join(dir, `${a.id}.cpp`), binary = path.join(dir, a.id);
    writeFileSync(file, `${shownCode[0]}\n${exercises}\nint main(){\n${cppCases[a.id]}\n${calls.join("\n")}\n}\n`);
    const compiled = spawnSync(compiler, ["-std=c++17", "-O1", "-g", "-fsanitize=undefined", "-fno-sanitize-recover=all", "-Werror=return-type", file, "-o", binary], { encoding: "utf8", timeout: 60000 });
    assert.equal(compiled.status, 0, `${a.id} compile failed:\n${compiled.error?.message ?? ""}\n${compiled.stderr}`);
    const ran = spawnSync(binary, [], { encoding: "utf8", timeout: 30000 });
    assert.equal(ran.status, 0, `${a.id} failed (${ran.signal ?? "exit"}):\n${ran.error?.message ?? ""}\n${ran.stderr}`);
    programs++; practices += a.practice.length;
    console.log(`PASS ${a.id} (${a.practice.length} compiled practices)`);
  }
} finally {
  rmSync(dir, { recursive: true, force: true });
}
console.log(`${programs} full C++ implementations executed with UBSan; ${practices} practice snippets compiled. Deterministic randomized/reference assertions passed.`);
