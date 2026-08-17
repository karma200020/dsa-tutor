# Quick Start Guide

## 🚀 Get Running in 2 Minutes

### Step 1: Start the App
```bash
cd D:\projects\dsa-tutor
npm run dev
```

The app will be available at: **http://localhost:3001**

### Step 2: Try It Out
1. Open http://localhost:3001 in your browser
2. Click any track button (💻 DSA, 🏗️ LLD, 🌍 HLD)
3. Scroll to see modules
4. **Click any topic card** to open the full lesson
5. Read the lesson content
6. Update your mastery status using the dropdown or buttons
7. Click back to return to the module list

---

## 🎯 Key Features

### Topics Are Now Clickable! ✨
- Hover over any topic → see it turn blue with an arrow
- Click on the topic title/preview → full lesson opens
- Don't click the status dropdown (that's for quick updates)

### Full Lesson Content Includes:
- 💡 **Intuition** - Plain English explanation
- ✅ **Tips** - What to do and remember
- 🎯 **Tricks** - Interview shortcuts
- 🧠 **Memory Aids** - How to remember
- 🎬 **Interview Patterns** - How interviewers ask
- 📚 **References** - Real sources (interviews, blogs, books)

### Track Your Progress:
- Circular gauge shows % ready for interviews
- Status breakdown shows topic counts (not started, learning, practiced, ready)
- Updates in real-time as you learn

---

## 📚 Content Included

### DSA (7 Topics)
1. Frequency Maps & Hashing
2. Prefix Sums & Range Queries
3. Two Pointers & Sliding Window
4. Binary Search & Boundaries
5. Tree Traversals (DFS/BFS)
6. Graph Algorithms (BFS/DFS)
7. Dynamic Programming Patterns

### LLD (4 Topics)
1. SOLID Principles & OOP
2. Composition & Abstraction
3. Singleton & Factory Patterns
4. Strategy & Observer Patterns

### HLD (4 Topics)
1. Scalability & System Components
2. Consistency & CAP Theorem
3. Capacity Estimation
4. Database & Cache Strategy

---

## 🛠️ Development Commands

```bash
# Start dev server (auto-reload on changes)
npm run dev

# Build for production
npm run build

# Run production server
npm start

# Check for errors/warnings
npm run build  # (will show TypeScript + build errors if any)
```

---

## 📍 Where's the Code?

- **Main App:** `app/page.tsx`
- **Components:** 
  - `components/module-list.tsx` - Modules & topics list
  - `components/topic-viewer.tsx` - Lesson viewer
  - `components/mastery-tracker.tsx` - Progress dashboard
- **Content:**
  - `data/dsa-topics.ts` - DSA lessons
  - `data/lld-topics.ts` - LLD lessons
  - `data/hld-topics.ts` - HLD lessons
  - `data/syllabus.ts` - Module structure

---

## 🐛 Common Issues & Fixes

### "Port 3000 is in use"
- The app will try port 3001 instead
- Or kill the process on 3000: `lsof -i :3000 | grep -v PID | awk '{print $2}' | xargs kill -9`

### "Styles look broken"
```bash
rm -r .next
npm run dev
```

### "Can't click topics"
- Make sure you're clicking on the **topic button** (the left part with title)
- The right dropdown (status select) is just for quick status updates
- Hover to see the arrow indicator showing it's clickable

### "Status changes aren't saving"
- The app currently saves progress in memory only
- Refresh the page and progress resets (expected for MVP)
- Full persistence coming soon

---

## 📊 What's Working

✅ Full lesson access for all 15 topics
✅ 8 sections per lesson (intuition, tips, tricks, memory aids, patterns, references, practice, actions)
✅ Mastery tracking with 4 levels
✅ Beautiful, responsive UI
✅ Smooth navigation between sections

---

## 🎓 How to Use for Interview Prep

1. **Start with DSA Track** - Master coding round skills
2. **Read Intuition First** - Understand the "why"
3. **Learn Tips & Tricks** - Get practical shortcuts
4. **Use Memory Aids** - Create mental models
5. **Review References** - See how it connects to real interviews
6. **Mark Progress** - Update mastery level as you learn
7. **Practice** - (Coming soon) solve linked problems
8. **Move to LLD** - Design skills
9. **Then HLD** - System design
10. **Track Overall Progress** - Monitor readiness in dashboard

---

## 💡 Pro Tips

- **Read in order:** Intuition → Tips → Tricks → Memory Aids → Patterns → References
- **Take notes:** Keep a notebook with memory aids
- **Say it aloud:** Explain the pattern to yourself using memory aids
- **Compare references:** See patterns across interview experiences
- **Update status regularly:** Mark topics as you progress through them
- **Review mastery tracker:** See which topics need focus

---

## 🚀 What's Next?

These features are planned but not yet built:
- [ ] Link practice problems to real LeetCode problems
- [ ] Timed drill mode (30 min coding rounds)
- [ ] Mock interview with scoring rubric
- [ ] Save progress to database
- [ ] Spaced repetition scheduling
- [ ] Video explanations for topics
- [ ] Recommended practice sequences
- [ ] Performance analytics

---

**Happy Learning! 🎯**

If you have questions or find issues, check `TESTING_GUIDE.md` for more details.
