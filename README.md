# SWE Interview Tutor 🚀

**Comprehensive FAANG Interview Preparation Platform**

A modern, visual-first learning platform for software engineers with 3-5 years of experience preparing for **FAANG company interviews**. Covers:
- ✅ **60+ DSA Topics** with interactive visualizations
- ✅ **50+ LeetCode Problems** mapped by company
- ✅ **15 LLD (Low-Level Design) Case Studies**
- ✅ **12 HLD (High-Level Design) System Design Problems**
- ✅ **3 Design Frameworks** (System Design Primer, Grokking, ByteByteGo)
- ✅ **Interactive Code Playground** (C++, Python, Java)
- ✅ **Mock Interview System** with scoring
- ✅ **Spaced Repetition Engine** for retention
- ✅ **Dark Theme** throughout
- ✅ **Company-Specific Content** (Google, Amazon, Meta, Microsoft, Apple, Netflix)

---

## 🎯 Features

### DSA Learning (60+ Topics)
- **Complete Coverage:** Arrays, Strings, Hashing, Two Pointers, Sliding Window, Stack, Queue, Trees, Graphs, DP, Greedy, Backtracking
- **Visual Learning:** 30+ interactive diagrams with step-through animations
- **Company Mapping:** Problems tagged with company frequencies (Google: 45 problems, Amazon: 42, Meta: 38, etc.)
- **Worked Examples:** Every topic includes intuition, code, trace, and complexity analysis
- **Practice Links:** Direct links to 150+ LeetCode problems
- **Dark Theme:** Eye-friendly dark UI for long study sessions

### LLD Design (15 Problems)
**Tier 1 (90%+ asked):**
- Parking Lot System
- LRU Cache
- Rate Limiter
- Elevator System
- Library Management

**Tier 2 (60-80% asked):**
- Pub-Sub System, Task Scheduler, Notification Service, ATM Machine, Hotel Booking

**Tier 3 (30-60% asked):**
- Movie Booking, Chat System, Social Network, URL Shortener, Vending Machine

Each includes: requirements, domain modeling, class design, API contracts, extensibility patterns, and common mistakes.

### HLD / System Design (12 Problems)
**Most Asked (95%+):**
- URL Shortener, Social Feed, Distributed Cache, Chat, Video Streaming

**High Frequency (70-90%):**
- Notification System, Ride Sharing, Autocomplete, Web Crawler, Payment System, Hotel Booking

Each includes: capacity estimation, architecture diagram, data model, scalability strategy, trade-offs, and deep-dive modules.

### Learning Tools
- 📊 **Progress Dashboard:** Track completion, company readiness, weak areas
- 🧠 **Spaced Repetition:** SM-2 algorithm ensures long-term retention
- 💻 **Code Playground:** Write C++, Python, Java; run test cases instantly
- 🎮 **Mock Interviews:** 45-90 min timed rounds with scoring rubric
- 📈 **Analytics:** View performance trends, mistake patterns, readiness score

---

## 🏗️ Technology Stack

**Frontend:**
- Next.js 14+ (React 18)
- TypeScript
- TailwindCSS + custom CSS
- SVG for interactive diagrams
- Dark theme with accent colors

**Backend:**
- Next.js API routes
- Database: SQLite (dev) / PostgreSQL (prod)
- Code execution: Docker sandboxed (future)

**Deployment:**
- Vercel (production)
- GitHub (repository)

---

## 📁 Project Structure

```
dsa-tutor/
├── app/                              # Next.js app directory
│   ├── layout.tsx                   # Root layout with dark theme
│   ├── page.tsx                     # Home page
│   ├── (modules)/                   # Module routes
│   │   ├── dsa/[module]/page.tsx    # DSA topics
│   │   ├── lld/[problem]/page.tsx   # LLD problems
│   │   └── hld/[problem]/page.tsx   # HLD problems
│   └── api/                         # API routes
│       ├── topics/route.ts
│       ├── problems/route.ts
│       └── run-tests/route.ts
│
├── components/                       # React components
│   ├── sidebar.tsx                  # Main navigation
│   ├── header.tsx                   # App header
│   ├── topic-viewer.tsx             # Topic display with visuals
│   ├── visual-diagram.tsx           # 30+ interactive diagrams
│   ├── visual-diagram.module.css    # Diagram styling
│   ├── code-editor.tsx              # Monaco/CodeMirror
│   ├── mock-interview.tsx           # Interview simulator
│   └── progress-dashboard.tsx       # Analytics dashboard
│
├── data/                            # Content & data files
│   ├── comprehensive-dsa-topics.ts  # 60+ DSA topics
│   ├── company-specific-problems.ts # 50+ LeetCode problems
│   ├── lld-problems.ts              # 15 LLD case studies
│   ├── hld-problems.ts              # 12 HLD case studies
│   ├── curated-system-design-content.ts # 3 design frameworks
│   ├── visual-learning-components.ts # Visual specifications
│   └── mockDataSchema.ts            # Type definitions
│
├── lib/                             # Utilities
│   ├── db.ts                        # Database client
│   ├── spaced-repetition.ts         # SM-2 algorithm
│   ├── schema.ts                    # Database schema
│   └── utils.ts                     # Helper functions
│
├── styles/                          # Global styles
│   ├── globals.css                  # Dark theme CSS
│   └── variables.css                # CSS custom properties
│
├── RESEARCH_BASED_CONTENT_GUIDE.md  # Research compilation
├── COMPREHENSIVE_CONTENT_ARCHITECTURE.md # Content structure
├── IMPLEMENTATION_ROADMAP.md        # Phase-by-phase guide
├── FEATURES_CHECKLIST.md            # Complete features list
└── package.json                     # Dependencies

```

---

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- npm or yarn
- Git

### Installation

```bash
# Clone repository
git clone <your-repo-url>
cd dsa-tutor

# Install dependencies
npm install

# Setup environment variables
cp .env.example .env.local

# Run migrations (future)
npm run db:migrate

# Seed initial data (future)
npm run db:seed

# Start development server
npm run dev
```

Visit http://localhost:3000 in your browser.

### Development Commands

```bash
# Start dev server
npm run dev

# Build for production
npm run build

# Start production server
npm start

# Run tests
npm run test

# Format code
npm run format

# Lint code
npm run lint
```

---

## 📚 Content Overview

### DSA Topics (60+)
Each topic includes:
1. Plain-English intuition
2. Step-by-step methodology
3. C++ reference implementation
4. Worked example with trace
5. Complexity analysis (time & space)
6. 5-10 common mistakes
7. Interview tips & tricks
8. 8-15 practice problems (LeetCode links)
9. Interactive visual diagram
10. Company frequency data

**Modules:**
- Module 0: Interview Foundations
- Module 1: Arrays & Strings Fundamentals
- Module 2: Two Pointers & Sliding Window
- Module 3: Stack, Queue, Monotonic Patterns
- Module 4: Binary Search & Sorting
- Module 5: Linked Lists & Fast/Slow Pointers
- Module 6: Trees & BST
- Module 7: Heaps & Priority Queues
- Module 8: Graphs (BFS, DFS, Union-Find)
- Module 9: Dynamic Programming
- Module 10: Greedy & Backtracking
- Module 11: Interview Simulation & Mixed Topics

### LLD Topics (15 Problems)
Domain modeling, class design, UML-lite, design patterns, extensibility, common mistakes, timed design drills.

### HLD / System Design (12 Problems)
Capacity estimation, architecture design, database strategy, caching, sharding, trade-offs, deep-dives, interview frameworks.

---

## 🎨 Visual Learning System

30+ interactive SVG diagrams:
- **Algorithm Mechanics:** See how algorithms work step-by-step
- **Data Flow:** Visualize how data moves through systems
- **Architecture Diagrams:** Understand system components
- **Complexity Comparisons:** Visual trade-off analysis
- **Interactive:** Click, drag, animate to explore

**Examples:**
- Two Sum brute force → optimized
- Sliding Window expansion/contraction
- Floyd's cycle detection animation
- Binary Tree traversals (DFS vs BFS)
- Consistent Hashing node failure handling
- URL Shortener architecture
- Social Feed push/pull model

All diagrams feature:
- ✨ Smooth animations
- 🎨 Dark theme optimized
- 📱 Responsive design
- ♿ Accessibility features
- 🔧 Interactive controls

---

## 💻 Code Execution

### Supported Languages
- C++ (primary)
- Python (alternative)
- Java (alternative)
- JavaScript (alternative)

### Features
- Real-time syntax highlighting
- Code formatting
- Auto-complete
- Test case runner
- Performance metrics
- Error handling

### Example:

```cpp
// Solve Two Sum problem
vector<int> twoSum(vector<int>& nums, int target) {
    unordered_map<int, int> seen;
    for (int i = 0; i < nums.size(); i++) {
        int complement = target - nums[i];
        if (seen.count(complement)) {
            return {seen[complement], i};
        }
        seen[nums[i]] = i;
    }
    return {};
}

// Run test cases
Input: nums = [2,7,11,15], target = 9
Expected: [0,1]
Your Output: [0,1] ✅
```

---

## 🧠 Learning Approach

### Principle 1: Intuition First
Before any code, understand the concept with plain English and visuals.

### Principle 2: Pattern Recognition
Learn 10-15 core patterns; apply them to 100+ problems.

### Principle 3: Complexity Mastery
Every algorithm includes time/space analysis; no guessing during interviews.

### Principle 4: Company-Specific
Know which topics are asked by Google, Amazon, Meta, etc.

### Principle 5: Mock & Iterate
Practice in timed conditions; track weak areas; spaced repetition.

### Principle 6: Communication
Every practice includes explaining your approach aloud.

---

## 📊 Progress Tracking

- **Overall Progress:** X% topics completed
- **Company Readiness:**
  - Google Readiness: 75%
  - Amazon Readiness: 82%
  - Meta Readiness: 68%
  - Microsoft Readiness: 77%
  - Apple Readiness: 70%
- **Topic Status:** Not Started → Learning → Practiced → Mastered
- **Weak Spots:** Identify and drill
- **Next Recommendation:** AI-suggested next topic
- **Learning Streak:** Days consistently practicing

---

## 🎯 Mock Interview System

### DSA Mock Rounds
- **45 min:** 3 problems (easy-medium-hard)
- **60 min:** 4-5 problems (interview mix)
- **Company-Specific:** Google, Amazon, Meta, Microsoft, Apple, Netflix

### Scoring Rubric
- Correctness: 40% (passes all test cases)
- Complexity: 30% (achieves optimal)
- Code Quality: 15% (clean, no bugs)
- Communication: 15% (explains clearly)

### Post-Round Report
- Overall score
- Problem-by-problem breakdown
- Common mistakes identified
- Suggested remediation topics
- Compared to your averages

### LLD Mock Interviews
- 45-minute design interview
- Scoring: Requirements (25%), Design (25%), API (20%), Scalability (20%), Communication (10%)

### HLD Mock Interviews
- 60-minute system design round
- Scoring: Clarification (15%), Estimation (15%), Design (25%), Schema (15%), Scaling (20%), Communication (10%)

---

## 🔍 Interview Prep Roadmap

### Week 1-2: Foundations
- Arrays, Strings, Hashing
- Big O complexity review
- 20 easy problems

### Week 3-4: Core Patterns
- Two Pointers, Sliding Window
- Stack, Queue
- 25 medium problems

### Week 5-6: Advanced Patterns
- Trees, Graphs
- Dynamic Programming
- 20 hard problems

### Week 7-8: LLD + HLD
- System Design Primer intro
- 3 LLD mock interviews
- 2 HLD mock interviews

### Week 9-10: Integration
- Mixed topic drills
- Company-specific problem sets
- Full mock rounds

### Week 11-12: Final Polish
- Weak area remediation
- Communication practice
- Confidence building

### Week 13-16 (Optional)
- Behavioral preparation
- Salary negotiation
- Follow-up strategies

---

## 📖 Research Sources

This platform synthesizes insights from:
- **System Design Primer** (donnemartin/system-design-primer)
- **Grokking System Design** (educative.io)
- **ByteByteGo** (YouTube + Courses)
- **DesignGurus.io**
- **NeetCode** (Free system design)
- **Blind.com** (Real interview experiences)
- **LeetCode Discuss** (Company-specific data)
- **AlgoMaster** (DSA patterns)

---

## 🤝 Contributing

We welcome contributions!

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 Documentation

- [IMPLEMENTATION_ROADMAP.md](./IMPLEMENTATION_ROADMAP.md) - Phase-by-phase implementation guide
- [COMPREHENSIVE_CONTENT_ARCHITECTURE.md](./COMPREHENSIVE_CONTENT_ARCHITECTURE.md) - Content structure overview
- [RESEARCH_BASED_CONTENT_GUIDE.md](./RESEARCH_BASED_CONTENT_GUIDE.md) - Research compilation from multiple platforms
- [FEATURES_CHECKLIST.md](./FEATURES_CHECKLIST.md) - Complete features list and progress

---

## 🚀 Deployment

### Vercel (Recommended)
```bash
# Connect GitHub repo to Vercel
# Environment variables configured
# Auto-deploy on push to main
```

### Docker
```bash
docker build -t dsa-tutor .
docker run -p 3000:3000 dsa-tutor
```

---

## 📞 Support

- 📧 Email: support@dsa-tutor.com (future)
- 💬 Discord: [Join our community](https://discord.gg/dsaturor) (future)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/dsa-tutor/issues)

---

## 📜 License

This project is licensed under the MIT License - see [LICENSE](LICENSE) file for details.

---

## 🎓 Success Stories

*Coming soon - Help us build the future of interview prep!*

---

## 🙏 Acknowledgments

- System Design Primer team
- Grokking System Design by educative.io
- ByteByteGo by Alex Xu
- NeetCode community
- All contributors and beta testers

---

**Ready to crush your FAANG interview? Start learning today! 🚀**
