import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { googleSolutions } from "../data/company-questions/solutions";
import { companyCppCases } from "./company-cpp-cases";

const solutions = Object.entries(googleSolutions).filter(([, solution]) => solution.code);
assert.deepEqual(new Set(solutions.map(([id]) => id)), new Set(Object.keys(companyCppCases)), "Every displayed implementation needs executable cases.");
const selected = process.argv.slice(2);
for (const id of selected) assert(solutions.some(([key]) => key === id), `Unknown executable solution ${id}`);
const running = selected.length ? solutions.filter(([id]) => selected.includes(id)) : solutions;
const directory = mkdtempSync(path.join(tmpdir(), "company-cpp-"));
try {
  for (const [id, solution] of running) {
    const file = path.join(directory, `${id}.cpp`), binary = path.join(directory, id);
    writeFileSync(file, `${solution.code}\nint main() {\n${companyCppCases[id]}\n}\n`);
    const compiled = spawnSync(process.env.CXX || "g++", ["-std=c++17", "-O1", "-fsanitize=undefined", "-fno-sanitize-recover=all", "-Werror=return-type", file, "-o", binary], { encoding: "utf8", timeout: 60000 });
    assert.equal(compiled.status, 0, `${id} compile: ${compiled.error?.message ?? ""}\n${compiled.stderr}`);
    const ran = spawnSync(binary, [], { encoding: "utf8", timeout: 30000 });
    assert.equal(ran.status, 0, `${id} execution: ${ran.error?.message ?? ""}\n${ran.stderr}`);
    console.log(`PASS ${id}`);
  }
} finally {
  rmSync(directory, { recursive: true, force: true });
}
console.log(`${running.length} displayed C++ implementations executed with UBSan and deterministic/reference cases.`);
