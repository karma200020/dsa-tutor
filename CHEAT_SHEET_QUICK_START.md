# 🔗 Google DSA Cheat Sheet - Quick Start Guide

## Overview
Your DSA Tutor now includes an integrated Google DSA Interview C++ Cheat Sheet with:
- **22 curated problems** from Google interviews
- **15 essential code templates** for all major patterns
- **Interactive browser interface** with filtering and details
- **Complete integration** with your learning curriculum

## Accessing the Cheat Sheet

### Method 1: From Home Page
1. Start the app (`npm run dev`)
2. Visit home page (localhost:3000)
3. Scroll to "Google DSA Cheat Sheet" section
4. Click "View Cheat Sheet →" button

### Method 2: Direct URL
Navigate directly to: `http://localhost:3000/cheat-sheet`

## Using the Viewer

### 🔍 Problems Tab (Default)
Browse all 22 problems from Google interviews:

**Features:**
- **Category Filter**: Dropdown to filter by algorithm type
  - Arrays & Strings (6 problems)
  - Trees & Graphs (6 problems)
  - Dynamic Programming (5 problems)
  - Recent 2024-2025 (5 problems)
  - Select "All" to see all 22 problems

- **Problem Cards**: Click any card to see details
  - Difficulty badge (Easy/Medium/Hard)
  - Problem pattern type
  - Brief description
  - LeetCode reference

- **Problem Details**: Click card to expand and see:
  - **Pattern**: Algorithm category (Hash Map, DFS, DP, etc.)
  - **Time Complexity**: e.g., O(n), O(n log n)
  - **Space Complexity**: e.g., O(1), O(n)
  - **Key Insights**: Why this problem is important
  - **Common Mistakes**: Edge cases and pitfalls to avoid

### 💻 Templates Tab
Quick reference code implementations for all major patterns:

**Available Templates:**
1. **Hash Map Frequency** - Count occurrences
2. **Two Sum** - Pair finding pattern
3. **Sliding Window** - Subarray optimization
4. **Two Pointers** - Array traversal
5. **Prefix Sum** - Range queries
6. **DFS Traversal** - Tree/graph traversal
7. **BFS Traversal** - Level-order traversal
8. **Graph DFS** - Graph connectivity
9. **Union-Find** - Disjoint set union
10. **1D DP** - Linear recurrence
11. **2D DP** - Grid/matrix problems
12. **Knapsack** - Optimization pattern
13. **Heap Template** - Priority queue
14. **Binary Search** - Search space optimization
15. **KMP Algorithm** - String pattern matching
16. **Backtracking** - Permutation/combination

**How to Use:**
- Study each template carefully
- Try writing from memory before looking at reference
- Use as baseline for solving actual problems
- Mix and match templates for complex problems

### 📊 Reference Tab
Overview and statistics:

**Sections:**
- **Categories Covered**: All 11 categories with problem counts
- **11 Common Patterns**: Overview of core patterns
- **Interview Preparation Tips**: Best practices
- **Coverage Statistics**: 
  - Total: 22+ problems
  - Difficulty: Easy (4) → Medium (10) → Hard (8)
  - Coverage: ~95% of FAANG DSA patterns

## Interview Preparation Workflow

### Week 1: Foundation
- [ ] Review all 15 code templates
- [ ] Understand purpose of each pattern
- [ ] Write templates from memory 3 times each
- [ ] Map templates to real problems

### Week 2-3: Practice
- [ ] Solve 2-3 problems daily from different categories
- [ ] Use Common Mistakes as edge case checklist
- [ ] Compare your approach with Key Insights
- [ ] Mix easy/medium/hard problems daily

### Week 4: Mastery
- [ ] Timed problem solving (1 problem per 45 mins)
- [ ] Alternate between problem categories
- [ ] Explain approach aloud for each
- [ ] Review templates before interview

### Interview Day
- [ ] Quick scan of templates for pattern recall
- [ ] Trust your practiced implementations
- [ ] Focus on clear communication

## Problem Categories Guide

### Arrays & Strings (6 Problems)
**Focus**: Frequency counting, two pointers, sliding windows
- Two Sum (Easy) → Hash Map pattern
- Valid Palindrome (Easy) → Two Pointers
- Longest Substring (Medium) → Sliding Window
- Container with Most Water (Medium) → Greedy Two Pointers
- Trapping Rain Water (Hard) → DP or Two Pointers
- Minimum Window Substring (Hard) → Sliding Window + Frequency

### Trees & Graphs (6 Problems)
**Focus**: Traversal patterns, connectivity, path finding
- Number of Islands (Medium) → DFS/BFS
- LCA (Medium) → DFS recursive
- Course Schedule (Medium) → Topological Sort
- Word Ladder (Hard) → BFS shortest path
- Binary Tree Max Path (Hard) → DFS with recursion
- Serialize/Deserialize (Hard) → Traversal + reconstruction

### Dynamic Programming (5 Problems)
**Focus**: State definition, recurrence relations
- Maximum Subarray (Easy) → Kadane's algorithm
- Coin Change (Medium) → 1D DP
- House Robber (Medium) → 1D DP
- LCS (Medium) → 2D DP
- Edit Distance (Hard) → 2D DP with operations

### Recent 2024-2025 (5 Problems)
**Focus**: Advanced patterns and system design
- Multi-source BFS (Medium)
- Grid Islands with Union-Find (Medium)
- Rectangle Area Division (Hard)
- Arithmetic Subarrays (Medium)
- Job Scheduler (Hard)

## Tips for Success

### 🎯 Study Efficiently
- Don't memorize solutions - understand patterns
- Each template solves a **family** of problems
- Focus on why the pattern is optimal
- Test with edge cases before optimizing

### 💡 Common Mistakes Prevention
- Read the "Common Mistakes" section FIRST
- Use it as your edge case checklist
- Test your solution against listed mistakes
- Many interview problems test these edge cases

### 🔄 Pattern Recognition
- Look for patterns across different problems
- Same template appears in multiple categories
- Learn to quickly identify which pattern applies
- Speed comes from recognizing patterns fast

### 📈 Progress Tracking
- Mark problems as solved
- Track time for each problem
- Identify weak categories
- Focus extra practice on weak areas

## Integration with Curriculum

### Within Topics
When viewing DSA topics, you'll see:
- References to related Google problems
- Code templates for that pattern
- Interview tips from problem analysis
- Practice problem suggestions

### Module Connections
Google problems are mapped to modules:
- **Arrays & Strings Module**: See 6 Google problems
- **Trees & Graphs Module**: See 6 Google problems
- **Dynamic Programming Module**: See 5 Google problems
- **Interview Foundations**: See recent trending problems

## Troubleshooting

### Issue: Cheat sheet not loading
**Solution**: 
- Clear browser cache (Ctrl+Shift+Delete)
- Ensure you cleared .next directory (see setup)
- Restart dev server

### Issue: Can't filter problems
**Solution**:
- Ensure JavaScript is enabled
- Try refreshing page
- Check browser console for errors

### Issue: Code templates not showing
**Solution**:
- Ensure you're on Templates tab
- Syntax highlighting requires JavaScript
- Try different browser if having display issues

## Quick Reference

**Keyboard Shortcuts** (when focused on problems):
- `Click card` → See problem details
- `Click template` → Copy code to clipboard
- `Esc` → Close details panel

**Problem Difficulty Quick Ref:**
- 🟢 **Easy**: 1-2 min to solve in interview
- 🟡 **Medium**: 5-15 min, most interview problems
- 🔴 **Hard**: 15-30 min, for stronger candidates

**LeetCode IDs:**
- LC 1 = LeetCode problem #1
- LC 3, LC 11, etc. = LeetCode problems
- N/A = Google internal or recent problems

## Maximum Value from Cheat Sheet

1. **First 2 Days**: Study templates, understand patterns
2. **Days 3-7**: Solve problems systematically by category
3. **Days 8-14**: Mixed category practice, timed rounds
4. **Before Interview**: Quick template review for confidence

## Resources

- **Full Documentation**: See `GOOGLE_CHEAT_SHEET_INTEGRATION.md`
- **Verification Checklist**: See `CHEAT_SHEET_VERIFICATION.md`
- **Integration Details**: See `CHEAT_SHEET_INTEGRATION_SUMMARY.md`

---

**Remember**: The goal isn't to memorize problems, but to master patterns. Each template solves dozens of real interview problems. Master the patterns, recognize them quickly in interviews, and you'll be ready for anything!

**Good luck with your interview prep! 💪**
