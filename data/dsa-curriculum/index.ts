import { algorithmTopic } from "./lesson";
import { rangeAlgorithms } from "./range";
import { graphAlgorithms } from "./graphs";
import { structureAlgorithms } from "./structures";
import { sortingMatrixAlgorithms } from "./sorting-matrix";
import { dpAlgorithms } from "./dp";
import { treeStringMathAlgorithms } from "./trees-strings-math";
import { specialistAlgorithms } from "./specialist";
import { avlAlgorithms } from "./avl";

export const authoredAlgorithms = [
  ...rangeAlgorithms, ...graphAlgorithms, ...structureAlgorithms,
  ...sortingMatrixAlgorithms, ...dpAlgorithms, ...treeStringMathAlgorithms,
  ...avlAlgorithms, ...specialistAlgorithms
];
export const curriculumTopics = authoredAlgorithms.map(algorithmTopic);
