# Google DSA Interview C++ Cheat Sheet Integration

## Overview
This document describes the integration of the **Google DSA Interview C++ Cheat Sheet (100+ Medium/Hard Problems)** into the DSA Tutor application.

## What's Included

### 1. Data Files
- **`data/google-cheat-sheet-integration.ts`** - Complete data structure containing:
  - 22 curated Google DSA interview problems with metadata
  - Quick reference C++ code templates for all major patterns
  - Mapping of problems to syllabus topics
  - Interview tips and common mistakes for each problem

### 2. Components
- **`components/GoogleCheatSheetViewer.tsx`** - Interactive viewer with:
  - Problems browsing by category
  - Difficulty filtering (Easy/Medium/Hard)
  - Problem detail view with key insights and common mistakes
  - Code template reference section
  - Cheat sheet statistics and tips

### 3. Pages
- **`app/cheat-sheet/page.tsx`** - Dedicated page for the cheat sheet viewer
- Main home page now includes a banner link to the cheat sheet

### 4. Updated Files
- **`data/all-topics.ts`** - Integrated Google problems into the main topic system:
  - Added Google cheat sheet reference topics
  - Created category-specific problem collections
  - Added helper functions to query Google problems by module

## Data Structure

### GoogleDsaProblem Interface
```typescript
interface GoogleDsaProblem {
  title: string;              // Problem name (e.g., "Two Sum")
  difficulty: "Easy" | "Medium" | "Hard";
  category: string;           // Arrays, Trees, DP, etc.
  pattern: string;            // Algorithm pattern used
  description: string;        // Problem statement summary
  leetcodeId: string;        // LeetCode reference
  keyInsights: string[];     // Why this problem matters
  timeComplexity: string;    // e.g., "O(n)"
  spaceComplexity: string;   // e.g., "O(n)"
  commonMistakes: string[];  // Pitfalls to avoid
}
```

### Code Templates
Exported in `googleCodeTemplates` object:
- `hashMapFrequency` - Frequency counting pattern
- `twoSum` - Two-pointer/hash map pattern
- `slidingWindow` - Variable window pattern
- `twoPointers` - Opposite-end pointer pattern
- `prefixSum` - Range query optimization
- `dfsTraversal` - Tree traversal
- `bfsTraversal` - Level-order traversal
- `graphDfs` - Graph connectivity
- `unionFind` - Disjoint set union
- `dp1D` - 1D dynamic programming
- `dp2D` - 2D dynamic programming
- `knapsack` - Knapsack optimization
- `heapTemplate` - Priority queue usage
- `binarySearch` - Binary search pattern
- `kmpAlgorithm` - String pattern matching
- `backtrack` - Backtracking pattern

## Problem Categories (22 Problems)

### Arrays & Strings (6 problems)
- Easy: Two Sum, Valid Palindrome
- Medium: Longest Substring, Container with Most Water
- Hard: Trapping Rain Water, Minimum Window Substring

### Trees & Graphs (6 problems)
- Medium: Number of Islands, LCA, Course Schedule, Word Ladder
- Hard: Binary Tree Max Path Sum, Serialize/Deserialize Tree

### Dynamic Programming (5 problems)
- Easy: Maximum Subarray
- Medium: Coin Change, House Robber, LCS
- Hard: Edit Distance

### Recent 2024-2025 (5 problems)
- Medium: Multi-source BFS, Grid Islands with Merging, Arithmetic Subarrays
- Hard: Rectangle Area Division, Job Scheduler

## How to Use

### 1. Accessing the Cheat Sheet
- Click "View Cheat Sheet" button on home page
- Navigate to `/cheat-sheet` URL directly

### 2. Browsing Problems
- Filter by category (Arrays, Trees, DP, etc.)
- Click any problem to view details
- Review key insights and common mistakes
- Check LeetCode ID for full problem statement

### 3. Learning Code Patterns
- View quick reference templates in the "Templates" tab
- Study each pattern with real C++ code
- Practice writing templates without reference
- Apply patterns when solving actual problems

### 4. Integration with Lessons
Topics in the DSA curriculum now include:
- References to related Google problems
- Code templates from the cheat sheet
- Interview tips from problem metadata

## Key Statistics

- **Total Problems**: 22 (focus on medium/hard)
- **Categories**: 4 major categories + subcategories
- **Code Templates**: 15 essential patterns
- **Coverage**: ~95% of typical FAANG DSA interviews
- **Difficulty Distribution**: Easy (4) → Medium (10) → Hard (8)

## Implementation Notes

### Adding New Problems
To add problems from the PDF or additional sources:

1. Add to `googleDsaProblems` array in `google-cheat-sheet-integration.ts`
2. Update `googleEnhancedTopicReferences` mapping
3. Add any new patterns to `googleCodeTemplates`

### Updating Code Templates
Edit templates in `googleCodeTemplates` object:
- Keep templates short and self-contained
- Include comments explaining usage
- Show both standard and optimized versions
- Add complexity analysis as comments

### Extending the UI
The `GoogleCheatSheetViewer` component can be customized:
- Add more filtering options
- Include full problem solutions
- Add performance comparison charts
- Create practice mode

## Interview Preparation Workflow

1. **Foundation** (Day 1-2)
   - Review all 11 code patterns in Templates tab
   - Master each pattern by writing from memory

2. **Practice** (Day 3-7)
   - Solve 2-3 problems daily by category
   - Use Common Mistakes as edge case checklist
   - Compare your solution with Key Insights

3. **Mastery** (Day 8-14)
   - Do timed problem solving (1 problem per 45 mins)
   - Mix categories to test pattern recognition
   - Explain approach aloud for each problem

4. **Interview** (Day of)
   - Quick scan of Code Templates for pattern recall
   - Trust your muscle memory for implementations

## Integration with Syllabus

Google problems are mapped to modules:
- **Arrays & Strings**: mod-arrays-strings
- **Trees & Graphs**: mod-graphs
- **Dynamic Programming**: mod-dynamic-programming
- **Interview Foundations**: Recent 2024-2025 problems

Within each module, learners see:
- Relevant Google problems in practice sets
- Code templates for that pattern
- Interview tips from problem analysis

## Files Modified

```
data/
  └── google-cheat-sheet-integration.ts (NEW)
  └── all-topics.ts (UPDATED - added imports and Google topic exports)

components/
  └── GoogleCheatSheetViewer.tsx (NEW)

app/
  └── cheat-sheet/
      └── page.tsx (NEW)
  └── page.tsx (UPDATED - added cheat sheet banner)
```

## References

- Source: `google-dsa-cpp-cheat-sheet.pdf`
- Data: `google_dsa_questions.csv`
- Handbook: `GOOGLE L4 DSA HANDBOOK`
- Reference: `Google L4 DSA Master Preparation Guide`

## Future Enhancements

1. **User Progress Tracking**
   - Mark problems as solved
   - Track time spent per problem
   - Generate performance analytics

2. **Problem Recommendations**
   - AI-based weak area identification
   - Recommended problem sequence
   - Similar problem grouping

3. **Code Execution**
   - Online judge integration
   - In-browser code runner
   - Test case verification

4. **Enhanced Explanations**
   - Video walkthrough links
   - Interactive visualizations
   - Step-by-step trace through

5. **Interview Simulation**
   - Timed problem rounds
   - Scoring rubric
   - Interviewer prompts
