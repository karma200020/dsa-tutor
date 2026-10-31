// Explicit maintenance generator: review inventory changes before committing.
import { writeFileSync } from "node:fs";
import { cnLessons } from "../data/topics/cn";
import { cnModules } from "../data/cn-catalog";
if (!process.argv.includes("--write")) throw new Error("Use --write only after reviewing completed concept coverage.");
const inventory = {
  modules: cnModules.map((module) => ({ id: module.id, count: module.topicCount, optional: Boolean(module.optional) })),
  lessons: cnLessons.map((lesson) => ({ id: lesson.id, title: lesson.title, module: lesson.module, concepts: lesson.concepts })),
  concepts: cnLessons.flatMap((lesson) => lesson.concepts).sort()
};
writeFileSync("data/cn/inventory.json", JSON.stringify(inventory, null, 2) + "\n");
console.log(`${inventory.lessons.length} lesson identities and ${inventory.concepts.length} concept requirements frozen. Review the generated diff; audit never regenerates this file.`);
