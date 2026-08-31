import { Topic } from "../syllabus";

// Module: mod-cpp-fundamentals - "C++: Fundamentals and the Memory Model" (5 topics).
// Coverage: the build pipeline (preprocess/compile/assemble/link), translation
// units and the One Definition Rule, linkage and storage duration, object
// lifetime and initialisation order, and the stack/heap/static memory split.
//
// Authoring rules for every C++ track file: each topic sets every field
// explicitly (empty fields silently inherit generic DSA boilerplate from
// enrichTopic), carries at least five FAQs with substantive answers, and has at
// least two box-drawing diagrams. Diagrams use the same monospace wrapper the
// rest of the app uses; a local copy is declared per file exactly like
// hld-topics.ts and all-topics.ts do.
function asciiDiagram(art: string): string {
  return `<pre style="margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#a5f3fc;white-space:pre;text-align:left;overflow-x:auto;">${art}</pre>`;
}

export const cppFundamentalsTopics: Topic[] = [
  {
    id: "topic-cpp-fundamentals-compilation-model",
    moduleId: "mod-cpp-fundamentals",
    title: "The C++ Compilation Model: Preprocess, Compile, Assemble, Link",
    intuition:
      "C++ does not compile a program; it compiles one translation unit at a time and then asks a linker to staple the results together. Almost every confusing build error a candidate meets in an interview - undefined reference, duplicate symbol, template not instantiated - is explained by that single fact. The compiler sees one file at a time and knows nothing about the others; the linker sees only symbol names and addresses and knows nothing about types. Once you can say which of those two tools produced an error, you can usually name the fix in one sentence.",
    complexity: {
      time:
        "Compilation cost is roughly linear in the post-preprocessing token count of each translation unit, which is why a header included by 200 files is parsed 200 times and why precompiled headers and C++20 modules matter. Linking is dominated by symbol resolution, effectively a large hash-table merge over all object files, plus optional link-time optimisation which re-runs whole-program analysis and can dwarf the compile step.",
      space:
        "Each translation unit's peak memory is driven by the AST and template instantiation set, not by source file size; heavy header-only template libraries can push a single TU into gigabytes. The final binary's size is the sum of surviving sections (.text, .rodata, .data, .bss) after the linker discards unreferenced COMDAT sections and merges duplicate inline and template definitions."
    },
    lesson: [
      {
        title: "Four Phases, Two Tools, One Boundary",
        content:
          "The toolchain runs four logical phases. The preprocessor performs textual substitution: it expands #include by literally pasting the header's contents, expands macros, and resolves conditional compilation. The compiler proper parses that single expanded text - a translation unit - performs semantic analysis, template instantiation, and optimisation, and emits assembly. The assembler turns assembly into an object file containing machine code plus a symbol table of definitions and unresolved references. The linker resolves those references across all object files and libraries and lays out the final image. The boundary that matters is between the compiler and the linker: the compiler enforces types and needs declarations, the linker resolves names and needs definitions.",
        codeExample: `// g++ -E main.cpp -o main.i   # preprocess only: header text pasted in
// g++ -S main.i  -o main.s   # compile: emits assembly
// g++ -c main.s  -o main.o   # assemble: emits an object file
// g++ main.o util.o -o app   # link: resolve symbols, produce executable

// util.h - a DECLARATION. Enough for the compiler.
int add(int a, int b);

// main.cpp
#include "util.h"
int main() { return add(2, 3); }   // compiles fine, even with no definition

// If util.cpp is never compiled or never passed to the linker:
//   undefined reference to add(int, int)    <- LINKER error, not a compile error`,
        diagram: asciiDiagram(`From source text to a running image

main.cpp   util.cpp   math.cpp
   │           │          │
   ▼           ▼          ▼
┌──────────────────────────────┐
│ 1. PREPROCESSOR              │  #include pasted, macros expanded
└──────────────────────────────┘
   │           │          │
   ▼           ▼          ▼
 main.i     util.i     math.i        ← translation units (self-contained)
   │           │          │
   ▼           ▼          ▼
┌──────────────────────────────┐
│ 2. COMPILER                  │  parse → templates → optimise → asm
│    knows TYPES, needs        │
│    DECLARATIONS              │
└──────────────────────────────┘
   │           │          │
   ▼           ▼          ▼
┌──────────────────────────────┐
│ 3. ASSEMBLER                 │  → main.o util.o math.o + symbol tables
└──────────────────────────────┘
   │           │          │
   └───────────┼──────────┘
               ▼
┌──────────────────────────────┐
│ 4. LINKER                    │  resolve symbols, merge COMDATs,
│    knows NAMES, needs        │  discard unused sections, lay out
│    DEFINITIONS               │
└──────────────────────────────┘
               │
               ▼
            ./app`)
      },
      {
        title: "Reading the Error Message Tells You the Phase",
        content:
          "Interviewers love this because it is a fast proxy for real build experience. 'Use of undeclared identifier' or 'no matching function for call' is a compiler error: the current translation unit lacks a declaration, so add or fix an #include. 'Undefined reference to foo' or 'unresolved external symbol' is a linker error: the declaration existed but no object file supplied a body, so you forgot to compile a .cpp, forgot a library, or mismatched a signature. 'Multiple definition of foo' is also a linker error: two translation units each emitted a strong definition, usually because a non-inline function or a variable was defined in a header. A missing symbol reported at program start rather than at build time means a shared library was found at link time but not at load time.",
        codeExample: `// Classic multiple-definition trap: a DEFINITION in a header.
// config.h
int g_retries = 3;              // BAD: every TU that includes this defines it
                                // linker: multiple definition of g_retries

// Fix A (pre-C++17): declare in the header, define once in a .cpp
extern int g_retries;           // config.h  - declaration only
int g_retries = 3;              // config.cpp - the single definition

// Fix B (C++17 and later): inline variable, one entity, many TUs
inline int g_retries = 3;       // config.h - linker merges the COMDATs

// Same rule for functions:
int add(int a, int b) { return a + b; }         // BAD in a header
inline int add(int a, int b) { return a + b; }  // OK in a header`
      },
      {
        title: "Why C++ Name Mangling Exists",
        content:
          "The linker matches plain strings, but C++ has overloading, namespaces, templates, and const-qualified members, so the compiler encodes the full signature into the symbol name. add(int,int) becomes something like _Z3addii under the Itanium ABI. This is why a C++ function called from C must be wrapped in extern \"C\" to suppress mangling, why linking objects built against different standard-library ABIs fails with mysterious errors mentioning std::__cxx11::basic_string, and why changing a parameter type in a header without rebuilding every dependent .cpp produces an undefined reference rather than a silent miscompile. Mangling is the mechanism that lets a name-only linker enforce a type-rich language.",
        diagram: asciiDiagram(`How a linker error is actually produced

main.o                            util.o
├── defines:  main                ├── defines:  _Z3addii   (add(int,int))
└── undefined: _Z3addRKiS0_       └── undefined: (none)
                 │                              ▲
                 │  linker searches every       │
                 └──────── object / archive ────┘
                                  │
                       no symbol _Z3addRKiS0_ anywhere
                                  │
                                  ▼
              undefined reference to add(int const&, int const&)

Root cause: header said     int add(const int&, const int&);
            util.cpp defined int add(int, int);
            → different mangled names → the linker never matches them`)
      },
      {
        title: "Headers, Include Guards, and Build-Time Cost",
        content:
          "Because #include is textual, a header included twice in the same translation unit is pasted twice, which redefines its classes and breaks the build. Include guards or the near-universal #pragma once make the second paste a no-op. Guards fix correctness but not cost: the file is still opened and tokenised. Reducing build time therefore means reducing what is included - forward declare types you only use by pointer or reference, move implementation details into .cpp files behind a pimpl, and avoid including heavyweight headers from other headers. C++20 modules attack the problem structurally by compiling an interface once into a binary artifact instead of re-parsing text per consumer.",
        codeExample: `#pragma once            // or the portable guard below
#ifndef WIDGET_H
#define WIDGET_H

class Registry;         // forward declaration: no #include needed

class Widget {
public:
    explicit Widget(Registry& r);   // reference: incomplete type is fine
    void render() const;
private:
    Registry* registry_;            // pointer: incomplete type is fine
    // Registry  value_;            // ERROR: needs the complete type
};

#endif // WIDGET_H`
      },
      {
        title: "Where Templates Break the Model",
        content:
          "A template is not code; it is a recipe. The compiler emits nothing for a template until it is instantiated with concrete arguments, and instantiation can only happen in a translation unit that can see the template's full definition. That is why putting a template's body in a .cpp file produces an undefined reference in every other file that uses it, and why template-heavy libraries are header-only. Because the same instantiation is then generated in many translation units, the compiler emits it into a COMDAT or weak section and the linker deduplicates the copies instead of reporting multiple definition - the same mechanism that makes inline functions legal in headers. The escape hatch when you truly need a single instantiation point is explicit instantiation.",
        codeExample: `// stack.h - definition must be visible where it is instantiated
#include <vector>

template <typename T>
class Stack {
public:
    void push(const T& v);          // declaration
private:
    std::vector<T> data_;
};

template <typename T>
void Stack<T>::push(const T& v) { data_.push_back(v); }   // in the HEADER

// Explicit instantiation, when you want exactly one copy:
// stack.cpp
#include "stack.h"
template class Stack<int>;          // emits Stack<int> here, once
// Other TUs then declare:  extern template class Stack<int>;`,
        diagram: asciiDiagram(`Template instantiation vs. ordinary functions

Ordinary function                 Function template
─────────────────                 ─────────────────
util.h  : declaration             stack.h : FULL definition
util.cpp: definition ──▶ util.o   (no code emitted yet)
                                          │
main.cpp sees declaration                 │ used as Stack<int>
   → emits a call + undefined ref         ▼
   → linker finds it in util.o    main.cpp instantiates Stack<int>
                                     → emits it into a COMDAT section
                                  other.cpp instantiates Stack<int>
                                     → emits an identical COMDAT
                                          │
                                          ▼
                                  linker keeps ONE, discards the rest
                                  (weak symbols, not "multiple definition")`)
      }
    ],
    examples: [
      {
        title: "Undefined reference despite a correct header",
        input:
          "geometry.h declares double area(const Shape&); shape.cpp defines double area(Shape); main.cpp calls area(s). Building both files fails.",
        output: "Linker error: undefined reference to area(Shape const&).",
        explanation:
          "Step 1: The message names the linker stage, so the declaration was fine and the compile of main.cpp succeeded.\nStep 2: The declared signature takes const Shape&, which mangles to a symbol containing RK5Shape.\nStep 3: The definition takes Shape by value, which mangles to a different symbol containing 5Shape.\nStep 4: The linker matches strings, sees two unrelated names, and reports the caller's symbol as unresolved.\nStep 5: Fix by making the definition match the declaration exactly - change shape.cpp to double area(const Shape&) - and rebuild both translation units, not just one."
      },
      {
        title: "Multiple definition after adding a helper to a header",
        input:
          "A developer adds int clamp(int v, int lo, int hi) { ... } directly into util.h, which is included by six .cpp files. The build now fails at link time.",
        output: "Linker error: multiple definition of clamp(int, int, int).",
        explanation:
          "Step 1: #include is textual, so each of the six translation units now contains a full, non-inline definition.\nStep 2: Each emits a strong global symbol for clamp into its own object file.\nStep 3: The linker finds six strong definitions of the same name, which violates the One Definition Rule at link scope, so it refuses.\nStep 4: Marking it inline - or constexpr, which implies inline for functions - changes the symbol to weak COMDAT so the linker merges the copies.\nStep 5: The alternative fix is to keep only the declaration in the header and place the single definition in exactly one .cpp file."
      },
      {
        title: "Template body hidden in a .cpp",
        input:
          "matrix.h declares template <typename T> class Matrix with member bodies moved into matrix.cpp 'for cleanliness'. main.cpp uses Matrix<double>.",
        output: "Linker error: undefined reference to Matrix<double>::multiply(...).",
        explanation:
          "Step 1: When main.cpp is compiled, the compiler sees only the template declaration, so it emits a call to a symbol it expects someone else to define.\nStep 2: When matrix.cpp is compiled, nothing in it ever mentions Matrix<double>, so no instantiation is triggered and no code is emitted.\nStep 3: At link time no object file contains Matrix<double>::multiply, producing an undefined reference.\nStep 4: The usual fix is to move the definitions back into the header so every user can instantiate them, relying on COMDAT folding to avoid duplicates.\nStep 5: If the set of types is small and fixed, keep the bodies in matrix.cpp and add template class Matrix<double>; there, plus extern template class Matrix<double>; in the header to suppress redundant instantiation."
      }
    ],
    tips: [
      "Classify every build failure as compiler (missing declaration) or linker (missing or duplicated definition) before touching any code - the fix follows immediately.",
      "Anything defined in a header must be inline, constexpr, a template, a class member defined in-class, or a C++17 inline variable; otherwise it will multiply-define.",
      "Prefer forward declarations over #include in headers whenever the type is used only by pointer or reference; it cuts rebuild fan-out dramatically."
    ],
    tricks: [
      "Run g++ -E to see exactly what the compiler received when a macro or include order is suspicious; the answer is usually obvious in the preprocessed text.",
      "Use nm -C on an object file to list defined (T/D/B) and undefined (U) symbols - it turns an abstract linker error into a two-second diagnosis.",
      "extern \"C\" on an interface function disables mangling, which is both the C interop mechanism and a quick way to get stable, human-readable symbol names."
    ],
    memoryAids: [
      "Compiler needs declarations; linker needs definitions. Declare to compile, define to link.",
      "#include is copy-paste, not import - everything surprising about headers follows from that.",
      "Templates are recipes, not meals: no instantiation, no code, no symbol."
    ],
    interviewPatterns: [
      "'You get undefined reference to foo - walk me through what happened.' Expect to name the phase, mangling, and three plausible root causes.",
      "'Why can't I put a template definition in a .cpp file?' This is the standard follow-up and tests whether you understand instantiation.",
      "Frequency and companies: a near-universal warm-up in C++-heavy interviews at HFT firms, Bloomberg, Nvidia, and systems teams at Google and Microsoft."
    ],
    practiceProblems: [
      "A header defines a 200-line non-inline function and the project links on one compiler but fails on another. Explain. Answer: differing COMDAT folding and inline heuristics can mask it, but the ODR violation is real; mark the function inline or move it to a single .cpp so behaviour is deterministic on every toolchain.",
      "Adding a private member to a widely included class forces a 40-minute rebuild. Propose a fix. Answer: apply the pimpl idiom - keep only a std::unique_ptr<Impl> and a forward declaration in the header so private data changes no longer alter the header's text or the class layout seen by consumers.",
      "You link a C library and get undefined reference to c_init even though the archive is on the command line. Answer: the C header was included without extern \"C\", so the C++ compiler mangled the call; wrap the include in extern \"C\" { } or rely on the library's __cplusplus guard, and also confirm the archive appears after the objects that need it on the link line."
    ],
    faq: [
      {
        question: "What exactly is a translation unit, and why does the term matter?",
        answer:
          "A translation unit is one source file after preprocessing: the .cpp text with every #include pasted in, macros expanded, and conditional blocks resolved. It is the unit the compiler actually sees and the unit it compiles independently. The term matters because nearly every C++ rule about visibility and duplication is stated in terms of it: internal linkage means 'visible only inside this translation unit', the One Definition Rule allows one definition per translation unit for inline entities and exactly one across the whole program for non-inline ones, and static initialisation order is unspecified across translation units. It also explains build performance, since the compiler re-parses a shared header once per translation unit, so a 5,000-line header included by 300 files costs 1.5 million lines of parsing. Thinking in translation units rather than files is what makes header design, linkage errors, and rebuild times predictable instead of mysterious."
      },
      {
        question: "Why is an undefined reference a linker error rather than a compiler error?",
        answer:
          "Because the compiler's job stops at the boundary of a single translation unit. When it sees a declaration such as int add(int, int); it has everything it needs to type-check the call, choose the overload, and emit a call instruction to a named symbol. It deliberately does not care where the body lives, since that body may legitimately be in another .cpp file, a static archive, or a shared library resolved at load time. Only the linker has global visibility over every object file and library, so only it can discover that no one supplied the symbol. This separation is what makes separate compilation possible: change one .cpp and you rebuild one object file rather than the entire program. The cost is that a whole class of mistakes - typos in a signature, a forgotten source file, a missing library flag, a const or reference mismatch that changes the mangled name - surfaces late, at link time, with a message that names a mangled symbol rather than a source line."
      },
      {
        question: "What does inline actually mean in modern C++?",
        answer:
          "Its practical meaning is a linkage rule, not an optimisation request. Marking a function or, since C++17, a variable inline tells the compiler that the entity may be defined identically in multiple translation units and instructs the linker to merge those definitions into one entity rather than reporting a multiple-definition error. That is exactly what lets you write function bodies in headers. The historical meaning - a hint to expand the call site - is essentially advisory today; compilers inline aggressively based on their own cost models and routinely inline functions never marked inline, especially with link-time optimisation enabled, while ignoring the keyword on functions that are too large. Two consequences matter in interviews: functions defined inside a class body are implicitly inline, and every definition of an inline entity across the program must be token-for-token identical, or you have silent undefined behaviour because the linker picks one arbitrarily."
      },
      {
        question: "How do static and dynamic linking differ, and when do you choose each?",
        answer:
          "Static linking copies the needed object code out of an archive into your executable at build time, so the resulting binary is self-contained, has no runtime lookup cost, and can be optimised across the boundary with link-time optimisation. Dynamic linking records a dependency on a shared object, leaves the symbols unresolved, and lets the loader bind them at process start or lazily at first call through the PLT. Static wins for deployment simplicity, reproducibility, and startup latency, which is why latency-sensitive and container-minimal builds often prefer it. Dynamic wins when many processes share one library copy in memory, when you must ship security patches without relinking every consumer, or when you need runtime plugin loading. The classic gotcha is that a program that links fine can still fail at startup with a loader error, because link-time symbol resolution and load-time library discovery are separate steps governed by different search paths."
      },
      {
        question: "What problem do C++20 modules solve that headers cannot?",
        answer:
          "Modules replace textual inclusion with a compiled interface. With headers, every consumer re-preprocesses and re-parses the same text, macro definitions leak into and out of the header in include-order-dependent ways, and the only isolation tools are include guards and naming discipline. A module is compiled once into a binary module interface that later translation units import, so parsing cost is paid once, macros do not escape unless explicitly exported, and the order of imports cannot change meaning. That removes whole categories of fragility - the need for include guards, accidental reliance on transitive includes, and macro collisions - while typically cutting build times substantially on template-heavy code. Adoption is still gradual because build systems, package managers, and mixed-toolchain projects need coordinated support, so in interviews the safe answer is to explain the model, name the benefits, and note that headers remain the pragmatic default in most existing codebases."
      },
      {
        question: "Why does the order of libraries on the link command line matter?",
        answer:
          "With traditional Unix static archives, the linker processes the command line left to right and maintains a set of currently unresolved symbols. When it reaches an archive it pulls in only those members that resolve symbols already known to be missing, then moves on and never revisits that archive. If you list the library before the object that uses it, nothing is unresolved yet when the archive is scanned, so no members are extracted, and you get an undefined reference even though the library is present. The rule of thumb is that dependencies go after the things that use them, and mutually dependent archives may need to be listed twice or wrapped in a link group. This is a favourite interview detail because it separates candidates who have only used an IDE from those who have debugged a real link line, and because the symptom - a missing symbol that is demonstrably inside a library you passed - looks impossible until you know the algorithm."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Bjarne Stroustrup - The C++ Programming Language, 4th ed., Ch. 15 (Source Files and Programs)",
        insight: "Canonical treatment of translation units, linkage, and the separate compilation model."
      },
      {
        source: "blog",
        attribution: "Ulrich Drepper - How To Write Shared Libraries - https://www.akkadia.org/drepper/dsohowto.pdf",
        insight: "Definitive explanation of symbol resolution, PLT/GOT indirection, and the real cost of dynamic linking."
      },
      {
        source: "note",
        attribution: "cppreference - Phases of translation - https://en.cppreference.com/w/cpp/language/translation_phases",
        insight: "The normative nine translation phases, useful for settling arguments about when macros versus templates are processed."
      }
    ]
  },
  {
    id: "topic-cpp-fundamentals-translation-units-odr",
    moduleId: "mod-cpp-fundamentals",
    title: "Declarations, Definitions, and the One Definition Rule",
    intuition:
      "The One Definition Rule is C++'s answer to a hard question: how can a language with separate compilation, inline functions, and templates guarantee that every entity means exactly one thing? The answer is a rule with three clauses - one definition per translation unit, one definition per program for non-inline entities, and identical token sequences for entities allowed to repeat. The dangerous clause is the third, because violating it is explicitly ill-formed no diagnostic required, meaning the compiler and linker are allowed to accept your program and produce nonsense.",
    complexity: {
      time:
        "ODR enforcement inside a translation unit is a symbol-table lookup, effectively O(1) per declaration. Cross-translation-unit enforcement is the linker's symbol merge, roughly O(total symbols) with hashing, but the identical-token clause is not checked at all by mainstream toolchains, so its verification cost is zero and its failure cost is unbounded.",
      space:
        "Weak COMDAT sections mean every translation unit that uses an inline function or a template instantiation carries its own copy in the object file; the linker discards duplicates, so intermediate build artifacts can be many times larger than the final binary. This is a common cause of link steps that exhaust memory on template-heavy projects."
    },
    lesson: [
      {
        title: "Declaration Versus Definition",
        content:
          "A declaration introduces a name and its type so the compiler can check uses of it. A definition additionally provides the entity itself: the body of a function, the storage for a variable, or the complete member list of a class. Every definition is a declaration, but not the reverse. The distinction drives everything else: you may declare an entity as many times as you like in a translation unit provided the declarations agree, but definitions are strictly rationed. A subtle case is class types - a class declaration such as class Widget; makes it an incomplete type, usable by pointer or reference but not by value, while the class definition supplies members and size.",
        codeExample: `extern int counter;              // declaration - no storage
int counter = 0;                 // definition  - storage allocated

int  add(int, int);              // declaration
int  add(int a, int b) {         // definition
    return a + b;
}

class Widget;                    // declaration: incomplete type
class Widget { int x; };         // definition: complete type

struct S {
    static int n;                // declaration inside the class
    static constexpr int k = 4;  // C++17: implicitly inline, a definition
};
int S::n = 0;                    // definition, must appear in exactly one TU`
      },
      {
        title: "The Three Clauses of the ODR",
        content:
          "Clause one: no translation unit may contain more than one definition of any variable, function, class type, enumeration, or template. Clause two: every program must contain exactly one definition of every non-inline function or variable that is odr-used; if none exists the linker complains, and if more than one exists the linker also complains. Clause three: certain entities - inline functions and variables, class types, enumerations, and templates - may be defined in more than one translation unit, but every definition must consist of the same sequence of tokens and those tokens must mean the same thing in each context. Only clause three is unchecked, which is why it produces the most dangerous bugs in C++.",
        diagram: asciiDiagram(`The ODR decision tree

                  Is the entity inline / template /
                  class type / enum / constexpr fn?
                             │
              ┌──────────────┴──────────────┐
             NO                            YES
              │                             │
              ▼                             ▼
   Exactly ONE definition        MAY repeat across TUs
   in the WHOLE program          (one per TU maximum)
              │                             │
      ┌───────┴───────┐                     ▼
      ▼               ▼            Tokens must be IDENTICAL
   zero found     two found        and mean the same thing
      │               │                     │
      ▼               ▼            ┌────────┴────────┐
 "undefined      "multiple         identical      different
  reference"      definition"          │              │
      │               │                ▼              ▼
      └───── DIAGNOSED ─────┘        fine    IFNDR: silent
             at link time                    miscompile, no
                                             diagnostic required`)
      },
      {
        title: "ODR-Use: When a Definition Is Actually Required",
        content:
          "A name is odr-used, roughly, when its address is taken or a reference binds to it, or when a function is called in a way that requires its body. Merely mentioning a variable in a context where the lvalue-to-rvalue conversion yields a constant does not odr-use it. This is why, before C++17, a static constexpr class member could be used in constant expressions with no out-of-class definition, but passing it to a function taking const int& produced an undefined reference: binding a reference odr-uses the object and demands storage. C++17 made static constexpr data members implicitly inline, which supplies the definition automatically and removed one of the most notorious linker errors in the language.",
        codeExample: `struct Limits {
    static constexpr int kMax = 100;   // C++17: implicitly inline -> has storage
};

void take_by_value(int);
void take_by_ref(const int&);

int main() {
    int a = Limits::kMax;      // not odr-used: compile-time constant
    take_by_value(Limits::kMax);  // not odr-used either
    take_by_ref(Limits::kMax);    // ODR-USED: a reference must bind to storage
    // Pre-C++17 this line needed:  constexpr int Limits::kMax;  in one .cpp
}`
      },
      {
        title: "How ODR Violations Actually Bite",
        content:
          "The realistic failure mode is not two literally different functions with the same name; it is the same header compiled with different meanings in different translation units. Compile one .cpp with -DDEBUG so a struct gains an extra member, and another without it, and the two translation units disagree about the struct's size and member offsets. Both compile, both link, and at runtime one function writes past what the other believes is the end of the object. The same happens with mismatched -std flags, different -D flags controlling a member, differing packing pragmas, or linking objects built against two different standard library versions. Sanitizers can catch some of it: the gold linker's --detect-odr-violations and Clang's ASan report duplicate symbols with differing sizes.",
        codeExample: `// packet.h - included by both TUs
struct Packet {
    int id;
#ifdef ENABLE_TRACE
    long trace_id;          // present in one TU, absent in the other
#endif
    char payload[16];
};

// a.cpp compiled WITH -DENABLE_TRACE  -> sizeof(Packet) == 32, payload at +16
// b.cpp compiled WITHOUT it           -> sizeof(Packet) == 24, payload at +8
//
// b.cpp calls a function defined in a.cpp that fills payload.
// It writes 16 bytes starting at offset 16 of a 24-byte object.
// Result: heap corruption. No compiler or linker error. Classic IFNDR.
//
// Defences:
//   * Put build-affecting flags in one shared toolchain file, never per-target.
//   * Prefer sizeof-stable pimpl for ABI-visible types.
//   * Link with -Wl,--detect-odr-violations (gold) or build with ASan.`,
        diagram: asciiDiagram(`One header, two meanings - the silent killer

  packet.h  ──┬── included by a.cpp  (-DENABLE_TRACE)
              └── included by b.cpp  (no flag)

  a.cpp's view of Packet          b.cpp's view of Packet
  ┌────────────────────────┐      ┌────────────────────┐
  │ id       │ offset  0   │      │ id      │ offset 0 │
  │ trace_id │ offset  8   │      │ payload │ offset 8 │
  │ payload  │ offset 16   │      └────────────────────┘
  └────────────────────────┘        sizeof = 24
    sizeof = 32

  b.cpp allocates 24 bytes ──▶ passes pointer ──▶ a.cpp writes at +16..+31
                                                          │
                                                          ▼
                                              8 bytes past the object
                                              heap metadata corrupted
                                              crash appears somewhere else`)
      },
      {
        title: "Anonymous Namespaces and Internal Linkage as ODR Tools",
        content:
          "The cleanest way to avoid cross-translation-unit ODR problems is to make helpers invisible outside their translation unit. An unnamed namespace gives every entity inside it a unique name per translation unit and, since C++11, internal linkage, so two .cpp files can each define a helper called normalise with no conflict and no risk of the linker silently picking one. The older tool, the static keyword at namespace scope, does the same for a single entity. The rule of thumb for a .cpp file is: if a function or variable is not declared in a header, put it in an unnamed namespace. The rule for headers is the opposite - never put an unnamed namespace in a header, because each includer gets its own private copy, which is almost never what the author intended.",
        codeExample: `// parser.cpp
namespace {                       // internal linkage, unique per TU
    constexpr int kBufferSize = 4096;
    bool is_delimiter(char c) { return c == ',' || c == ';'; }
}

// lexer.cpp may define its own is_delimiter with different behaviour:
namespace {
    bool is_delimiter(char c) { return c == ' '; }   // no clash, no ODR issue
}

// static at namespace scope does the same for one entity:
static int g_call_count = 0;      // internal linkage

// NEVER do this in a header:
// namespace { int g_shared; }    // every includer gets a PRIVATE copy`
      }
    ],
    examples: [
      {
        title: "The pre-C++17 static constexpr linker error",
        input:
          "struct Cfg { static constexpr int kMax = 10; }; and a call std::min(x, Cfg::kMax) built with -std=c++14.",
        output: "undefined reference to Cfg::kMax",
        explanation:
          "Step 1: std::min takes its arguments by const reference, so the call binds a reference to Cfg::kMax.\nStep 2: Binding a reference odr-uses the object, which means the program must contain a definition providing storage.\nStep 3: In C++14 the in-class initialiser is only a declaration; the definition must be written out of class as constexpr int Cfg::kMax; in exactly one translation unit.\nStep 4: Because that line is missing, the linker finds no storage and reports an undefined reference even though the value is a compile-time constant.\nStep 5: Compiling with -std=c++17 fixes it outright, because static constexpr data members became implicitly inline and therefore self-defining."
      },
      {
        title: "Two libraries, one struct, different layouts",
        input:
          "libcore is built with -DFEATURE_X, which adds a member to struct Session declared in a shared header. The application is built without the flag and links both libcore and libnet.",
        output: "Program links cleanly, then crashes intermittently inside unrelated allocator code.",
        explanation:
          "Step 1: The two builds disagree on sizeof(Session) and on the offsets of every member after the conditional one.\nStep 2: The application allocates a Session using its own smaller layout and passes the pointer into libcore.\nStep 3: libcore writes members at the larger offsets, overwriting bytes the allocator owns.\nStep 4: The corruption is only detected later, when the allocator next touches that metadata, which is why the crash appears in code that is entirely innocent.\nStep 5: The fix is structural: never let optional members change a type visible across a library boundary - hide them behind a pimpl or a stable ABI - and centralise compile flags so every target sees the same definition."
      },
      {
        title: "Deliberate repetition that is legal",
        input:
          "A header defines inline double to_celsius(double f) { return (f - 32) * 5.0 / 9.0; } and is included by 40 translation units.",
        output: "Builds and links cleanly; the final binary contains one copy.",
        explanation:
          "Step 1: Clause three of the ODR permits an inline function to be defined in every translation unit that uses it.\nStep 2: Each compilation emits the definition into a weak COMDAT section rather than a strong global symbol.\nStep 3: At link time the linker sees 40 candidate definitions of the same weak symbol and keeps exactly one.\nStep 4: The requirement that makes this safe is that all 40 definitions came from the same header text, so the tokens are identical.\nStep 5: The moment one translation unit sees a different macro expansion inside that function, the guarantee evaporates and the linker's arbitrary choice becomes a real behavioural difference."
      }
    ],
    tips: [
      "Treat any preprocessor flag that changes a type's members as a project-wide setting, never a per-target one; conditional members are the leading source of real ODR bugs.",
      "In a .cpp file, wrap every helper that is not declared in a header in an unnamed namespace - it costs nothing and removes an entire class of collisions.",
      "Prefer C++17 inline variables to the extern-declaration-plus-one-definition dance; there is less to keep in sync and it cannot drift."
    ],
    tricks: [
      "Build with the gold linker and -Wl,--detect-odr-violations, or with AddressSanitizer, to catch same-name symbols with differing sizes that the ordinary linker accepts silently.",
      "nm -C --defined-only on two object files, diffed, quickly shows which entity is defined twice when a multiple-definition error names a symbol you do not recognise.",
      "If a static library must ship a type across an ABI boundary, give the namespace a version-dependent inline namespace name so mismatched builds fail to link instead of silently mismatching."
    ],
    memoryAids: [
      "Declare many, define once - unless it is inline, a template, or a class, in which case define identically everywhere.",
      "IFNDR means 'the compiler is allowed to say nothing and do anything'; the ODR's third clause is the biggest IFNDR in the language.",
      "Reference binding is odr-use; value copying of a constant is not."
    ],
    interviewPatterns: [
      "'State the One Definition Rule.' A strong answer names all three clauses and singles out the identical-token clause as the unchecked one.",
      "'Two .cpp files see different versions of a struct. What happens?' Tests whether you can reason about layout, not just quote a rule.",
      "Frequency and companies: standard at firms with large C++ monorepos - Bloomberg, Jane Street, Citadel, Google - because ODR bugs are expensive there."
    ],
    practiceProblems: [
      "Why can a class be defined in a header included by 100 files without a multiple-definition error? Answer: class definitions are in the ODR's repeatable category - they define a type, not an object or a function body, and emit no strong symbol; each translation unit needs the layout, so repetition is required, and the identical-token requirement is what keeps all 100 views consistent.",
      "You add an unnamed namespace to a header to 'hide' a constant, and the binary grows and a singleton stops being unique. Explain. Answer: an unnamed namespace in a header gives every including translation unit its own private copy of every entity inside, so N includers means N constants and N distinct singleton instances; use inline constexpr in the header instead.",
      "A colleague marks a function inline purely to speed it up and it makes no measurable difference. Why? Answer: inline is a linkage rule; the optimiser inlines based on its own cost model and routinely inlines unmarked functions and declines to inline marked ones, so the keyword's only reliable effect is permitting multiple definitions."
    ],
    faq: [
      {
        question: "What does 'ill-formed, no diagnostic required' actually mean for me?",
        answer:
          "It means the standard declares your program invalid but explicitly relieves the implementation of any obligation to tell you. Practically, the compiler cannot detect the problem because it only ever sees one translation unit, and the linker cannot detect it because it only compares symbol names, not the token sequences that produced them. So the toolchain accepts the program, picks one of the conflicting definitions arbitrarily - typically the first one encountered during the link - and produces a binary in which some call sites use one meaning and others use another. The observable results range from harmless to catastrophic: a wrong constant, a virtual call to the wrong override, or memory corruption from mismatched object layouts. Because there is no diagnostic, defence has to be procedural rather than reactive: centralise compile flags, avoid conditional members in shared types, and enable the linker or sanitizer options that do a best-effort duplicate-symbol size check."
      },
      {
        question: "Why are class definitions allowed in headers but function definitions are not?",
        answer:
          "Because they produce fundamentally different artifacts. A class definition describes a type - member names, types, offsets, virtual table layout - and every translation unit that uses the type needs that description in order to generate correct code. It emits no storage and no strong symbol on its own, so repeating it across translation units creates nothing for the linker to collide over. A non-inline function definition, by contrast, emits actual machine code under a strong global symbol, and two strong definitions of one symbol is precisely the collision the linker exists to detect. The ODR therefore places classes, enumerations, templates, and inline entities in the repeatable category and everything else in the exactly-once category. The bridge between the two is the inline keyword, which downgrades a function's symbol from strong to weak COMDAT so it behaves, from the linker's point of view, like a class definition."
      },
      {
        question: "Are static and an unnamed namespace interchangeable?",
        answer:
          "They both give internal linkage at namespace scope, so for a simple free function or variable in a .cpp file the effect is the same and static is shorter. The unnamed namespace is strictly more capable: it works for types, which static cannot do, so it is the only way to give a struct or a class translation-unit-local identity, and that matters because a locally defined type used as a template argument or a comparator would otherwise be an ODR hazard if two files defined it differently. It also scopes a whole block of declarations at once rather than requiring the keyword on each. The historical wrinkle is that C++03 deprecated static at namespace scope in favour of unnamed namespaces, then C++11 undeprecated it, so both are fully supported today. Guidance in most style guides is to use an unnamed namespace by default in .cpp files and never in headers."
      },
      {
        question: "If templates must be defined in headers, how do they not violate the ODR?",
        answer:
          "Templates fall under the ODR's repeatable category, and their instantiations are emitted as weak COMDAT symbols exactly like inline functions. When five translation units each instantiate std::vector<int>::push_back, five identical copies land in five object files, and the linker keeps one and discards the rest. This works safely only because the definitions came from the same header text and were instantiated with the same arguments in the same context. The rule can still be broken: if a template's behaviour depends on a macro, or on an overload found by argument-dependent lookup that differs between translation units, or on a specialisation declared in one file but not another, the instantiations differ and you have a genuine ODR violation with no diagnostic. That last case - declaring an explicit specialisation after the primary template has already been implicitly instantiated elsewhere - is a documented, easy-to-hit trap."
      },
      {
        question: "How does the ODR interact with shared libraries and symbol visibility?",
        answer:
          "Dynamic linking widens the scope of the rule and the ways it can break. By default on ELF platforms all symbols are exported with default visibility and the dynamic linker uses global symbol interposition, meaning the first definition loaded wins across the entire process. If an executable and a shared library each contain their own copy of an inline function or a template instantiation, only one is used at runtime - and if their definitions differ, you get exactly the ODR failure mode with no build-time warning. It also means a singleton defined in a header can end up unique or duplicated depending on visibility settings and load order. The usual mitigations are to compile with -fvisibility=hidden and export only a deliberate API surface, to avoid defining the same type in both a library and its consumer, and to use an inline namespace carrying a version tag so incompatible builds fail loudly at link time rather than silently interposing."
      },
      {
        question: "Does the ODR apply to lambdas, and what is special about them?",
        answer:
          "Yes, and lambdas are a notable special case because each lambda expression creates a unique, unnamed closure type. Two textually identical lambdas written in two different places are two different types. That is fine inside a .cpp file, but a lambda written at namespace scope in a header - for example to initialise an inline variable or as a default argument - raises a question about whether each translation unit gets the same closure type. C++17 clarified the rules so that a lambda appearing in an inline entity or a template has the same closure type across translation units when the ODR's identical-token requirement is met, which is what makes lambdas usable in header-defined inline functions. The practical warning remains: because closure types are unique and unnamed, storing them in a header-visible type requires std::function, auto with a deduced return type, or a template parameter, and mixing those techniques inconsistently across files is an easy way to produce subtly different instantiations."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - Definitions and ODR - https://en.cppreference.com/w/cpp/language/definition",
        insight: "Precise statement of the three ODR clauses and the exact list of entities allowed to repeat."
      },
      {
        source: "blog",
        attribution: "Anthony Williams / Just Software Solutions - articles on ODR violations across shared libraries",
        insight: "Shows how default ELF visibility and symbol interposition turn benign duplication into runtime divergence."
      },
      {
        source: "book",
        attribution: "Scott Meyers - Effective C++, 3rd ed., Item 31 (Minimize compilation dependencies)",
        insight: "The pimpl and interface-class techniques that keep header changes - and therefore ODR risk - contained."
      }
    ]
  },
  {
    id: "topic-cpp-fundamentals-linkage-and-storage-duration",
    moduleId: "mod-cpp-fundamentals",
    title: "Linkage, Storage Duration, and the Many Meanings of static",
    intuition:
      "Every name in C++ carries two nearly independent properties that beginners conflate: linkage, which answers 'who else can refer to this name?', and storage duration, which answers 'when does this object exist?'. The keyword static is notorious precisely because it means a different thing in each of its three positions - internal linkage at namespace scope, per-class rather than per-object at class scope, and static storage duration inside a function. Separating the two axes turns a confusing keyword into a small, memorisable table.",
    complexity: {
      time:
        "Access to automatic and static objects is a single register-relative or absolute load, effectively O(1) with no synchronisation. Function-local static initialisation is the exception: since C++11 it is guarded, so the first call pays an atomic acquire load on the guard variable and every later call pays only a predictable branch, typically a couple of cycles. Thread-local access costs an extra indirection through the thread pointer and, in dynamically loaded code, may involve a call to __tls_get_addr.",
      space:
        "Static-duration objects occupy .data if non-zero-initialised and .bss if zero-initialised, so a large zero-filled global costs virtual address space but almost no file size. Automatic objects consume stack, which is a fixed per-thread reservation - commonly 8 MB on Linux and 1 MB on Windows - and thread-local objects multiply their size by the number of live threads."
    },
    lesson: [
      {
        title: "The Two Independent Axes",
        content:
          "Linkage has three values. No linkage means the name cannot be referred to from anywhere else at all, which is the case for ordinary local variables. Internal linkage means the name is visible only within its own translation unit, which is what static at namespace scope and an unnamed namespace provide. External linkage means the name can be referred to from other translation units, which is the default for non-const namespace-scope variables, functions, and class types. Storage duration also has values: automatic, meaning the object lives from its declaration to the end of its enclosing block; static, meaning it lives for the whole program; thread, meaning one instance per thread; and dynamic, meaning it lives from new until delete. A namespace-scope const object is the classic case where the two axes surprise people: it has static duration but internal linkage by default.",
        diagram: asciiDiagram(`Linkage x storage duration - the whole picture

                    NO LINKAGE      INTERNAL          EXTERNAL
                  (this block)   (this TU only)   (whole program)
  ┌───────────────┬─────────────┬────────────────┬────────────────┐
  │ AUTOMATIC     │ int x;      │      —         │       —        │
  │ (block scope) │ inside a fn │                │                │
  ├───────────────┼─────────────┼────────────────┼────────────────┤
  │ STATIC        │ static int  │ static int g;  │ int g;         │
  │ (whole run)   │ inside a fn │ namespace {..} │ extern int g;  │
  │               │             │ const int k=1; │ inline int g;  │
  ├───────────────┼─────────────┼────────────────┼────────────────┤
  │ THREAD        │ thread_local│ static         │ thread_local   │
  │ (per thread)  │ inside a fn │ thread_local g │ int g;         │
  ├───────────────┼─────────────┼────────────────┼────────────────┤
  │ DYNAMIC       │  new T      │  new T         │  new T         │
  │ (new/delete)  │  the OBJECT has no name; the POINTER does     │
  └───────────────┴─────────────┴────────────────┴────────────────┘

  Note: a namespace-scope  const int k = 1;  is INTERNAL by default,
  which is why constants in headers do not multiply-define - but also
  why each TU gets its own copy and &k differs between TUs.`)
      },
      {
        title: "The Three Meanings of static",
        content:
          "At namespace scope, static changes linkage from external to internal, hiding the name from other translation units; storage duration was already static, so nothing changes there. Inside a function, static changes storage duration from automatic to static, so the object is created once and survives across calls; linkage was already none, so nothing changes there. Inside a class, static means the member belongs to the class rather than to each object: a static data member has static storage duration and one instance shared by all objects, and a static member function has no this pointer. Reading the keyword as 'answer whichever question is still open in this context' makes all three cases fall out of the same rule.",
        codeExample: `static int g_cache = 0;      // namespace scope: INTERNAL LINKAGE
                             // (duration was already static)

int next_id() {
    static int counter = 0;  // function scope: STATIC DURATION
    return ++counter;        // survives across calls; no linkage
}

struct Widget {
    static int instances;    // class scope: ONE shared object, not per-Widget
    static Widget make();    // class scope: no 'this' pointer
    int id;
};
int Widget::instances = 0;   // the single definition, in exactly one TU`
      },
      {
        title: "Initialisation of Static-Duration Objects",
        content:
          "Static-duration objects go through up to two stages. Static initialisation happens before any code runs: objects are zero-initialised, then any that can be computed at compile time are constant-initialised and simply baked into the binary. Dynamic initialisation runs whatever remains - constructors and function calls - and for namespace-scope objects it happens before main, but its order across translation units is unspecified. That is the static initialisation order fiasco: a global in a.cpp whose constructor reads a global in b.cpp may see a zero-initialised, unconstructed object. Function-local statics dodge the problem entirely because they are initialised on first use, and since C++11 that initialisation is thread-safe, which is what makes the Meyers singleton the standard answer.",
        codeExample: `// --- The fiasco ---
// registry.cpp
std::map<std::string,int> g_registry;              // dynamic init, order ?
// plugin.cpp
struct Register { Register(){ g_registry["x"]=1; } };
Register g_reg;   // may run BEFORE g_registry is constructed -> UB

// --- The fix: Meyers singleton, initialised on first use ---
std::map<std::string,int>& registry() {
    static std::map<std::string,int> instance;     // C++11: thread-safe,
    return instance;                               // constructed on 1st call
}
struct Register { Register(){ registry()["x"] = 1; } };
Register g_reg;   // safe: registry() guarantees construction before use

// constinit (C++20) forces constant initialisation, banning dynamic init:
constinit int g_limit = 4 * 1024;   // compile error if not constant-initialised`,
        diagram: asciiDiagram(`Lifetime of a static-duration object

 program load        before main()         first call        exit()
      │                    │                    │               │
      ▼                    ▼                    ▼               ▼
┌───────────┐      ┌───────────────┐    ┌──────────────┐  ┌───────────┐
│ zero-init │ ───▶ │ constant-init │──▶ │ dynamic init │─▶│ destroyed │
│ (.bss)    │      │ (baked into   │    │ (ctors run)  │  │ reverse   │
│           │      │  .data)       │    │              │  │ order     │
└───────────┘      └───────────────┘    └──────────────┘  └───────────┘
                                              │
                    namespace scope ──────────┤
                    order across TUs = UNSPECIFIED  ◀── the fiasco
                                              │
                    function-local  ──────────┘
                    order = first call, guarded, thread-safe (C++11)`)
      },
      {
        title: "extern, extern \"C\", and Sharing State Across Files",
        content:
          "To share one object across translation units you declare it extern in a header and define it exactly once in a .cpp, or since C++17 declare it inline in the header and let the linker merge the definitions. The extern keyword on a variable means 'declaration only, storage is elsewhere', which is why forgetting the definition yields an undefined reference. A separate use of the same keyword, extern \"C\", specifies language linkage rather than external linkage: it suppresses name mangling so the symbol is callable from C, at the cost of forbidding overloads for that name. The two meanings share a keyword and nothing else, which is a common source of confused answers in interviews.",
        codeExample: `// counters.h
extern long g_packets;              // declaration; storage in counters.cpp
inline long g_bytes = 0;            // C++17: definition, merged by the linker

// counters.cpp
long g_packets = 0;                 // the one definition

// C interoperability - language linkage, not storage
extern "C" void plugin_init(int);   // symbol is 'plugin_init', unmangled
extern "C" {
    #include <zlib.h>               // wrap C headers that lack their own guard
}
// Consequence: you cannot overload an extern "C" function - one C symbol,
// one signature.`
      },
      {
        title: "thread_local and Per-Thread State",
        content:
          "thread_local gives an object thread storage duration: one instance per thread, constructed the first time that thread reaches it and destroyed when the thread exits. It is the clean replacement for the old pattern of a global protected by a mutex when the state is genuinely per-thread, such as a random number generator, a scratch buffer, an error code, or a logging context. The costs are real. Access requires an extra indirection through the thread control block, and in a dynamically loaded shared object it may go through a runtime helper, so it is measurably slower than a plain global. Each live thread pays the object's full size, so a thread_local megabyte buffer times 200 threads is 200 MB. Destructors run at thread exit, so a thread_local object holding a reference to a global that has already been destroyed is a real shutdown hazard.",
        codeExample: `#include <random>
#include <string>

// One generator per thread: no mutex, no contention, no shared state.
std::mt19937& rng() {
    thread_local std::mt19937 gen{std::random_device{}()};
    return gen;
}

// Per-thread diagnostic context - a very common logging pattern.
thread_local std::string t_request_id;

void handle(const std::string& id) {
    t_request_id = id;              // no locking required
    // ... every log line in this thread can read t_request_id ...
}`
      }
    ],
    examples: [
      {
        title: "A const in a header behaves differently from a variable",
        input:
          "constants.h contains const int kTimeout = 30; and is included by five .cpp files. A developer prints &kTimeout from two of them.",
        output: "Links fine, but the two addresses differ.",
        explanation:
          "Step 1: A namespace-scope const object has internal linkage by default, unlike a non-const one.\nStep 2: Internal linkage means each translation unit gets its own private object rather than sharing one.\nStep 3: That is why there is no multiple-definition error, which is exactly why the idiom works for constants in headers.\nStep 4: The consequence is five copies and five distinct addresses, harmless for a value but wrong if identity matters.\nStep 5: If you need one shared object use inline constexpr int kTimeout = 30; in C++17, which gives external linkage and a single merged definition."
      },
      {
        title: "Static initialisation order fiasco in the wild",
        input:
          "A logger global in log.cpp and a config global in config.cpp; the logger's constructor reads config.level(). The program works in a debug build and crashes in release.",
        output: "Intermittent crash or a garbage log level, depending on link order.",
        explanation:
          "Step 1: Both objects have static storage duration and dynamic initialisation, so both constructors run before main.\nStep 2: The relative order of dynamic initialisation across translation units is unspecified and in practice follows link order.\nStep 3: Changing the build configuration changed the link order, so the logger's constructor now runs first and reads a config object that is only zero-initialised.\nStep 4: Reading a non-trivially-constructed object before its constructor has run is undefined behaviour, which is why the symptom is inconsistent.\nStep 5: Replace both globals with accessor functions holding function-local statics, so construction is ordered by first use rather than by the linker."
      },
      {
        title: "Function-local static as a lazily built lookup table",
        input:
          "A hot function needs a 256-entry CRC table that is expensive to compute and never changes.",
        output: "The table is built once, on the first call, with no lock in the steady state.",
        explanation:
          "Step 1: Declaring it static inside the function gives it static storage duration, so it survives across calls.\nStep 2: Initialisation is deferred to the first call, so programs that never take this path never pay the cost.\nStep 3: Since C++11 the compiler emits a guard variable and the initialisation is thread-safe without any explicit mutex.\nStep 4: After the first call, every later call reads the guard with a relaxed or acquire load and takes a perfectly predicted branch, so the steady-state overhead is negligible.\nStep 5: If the table is genuinely computable at compile time, promote it to constexpr or constinit and remove even the guard."
      }
    ],
    tips: [
      "Ask two separate questions about every declaration - who can name it, and when does it live - and the meaning of static becomes obvious from context.",
      "Never let one namespace-scope object's constructor depend on another's; use a function returning a local static instead, which orders construction by first use.",
      "Prefer inline constexpr in headers for shared constants; const alone gives you one private copy per translation unit."
    ],
    tricks: [
      "constinit (C++20) is a compile-time assertion that a variable is constant-initialised, so it turns an accidental slide into dynamic initialisation into a build error.",
      "Measure before sprinkling thread_local: in a shared library the access can go through __tls_get_addr, which is far more expensive than a global plus an already-uncontended atomic.",
      "objdump -h or size on the binary shows .bss versus .data, which instantly reveals whether your large globals are zero-initialised and therefore free on disk."
    ],
    memoryAids: [
      "static answers whichever question is still open: at namespace scope it hides, in a function it persists, in a class it shares.",
      "Const at namespace scope is internal; non-const is external. That single asymmetry explains most header constant behaviour.",
      "Function-local statics are initialised on first use, and since C++11 that first use is thread-safe - the Meyers singleton in one line."
    ],
    interviewPatterns: [
      "'Explain every meaning of static in C++.' Expect a three-case answer plus the linkage-versus-duration framing.",
      "'What is the static initialisation order fiasco and how do you avoid it?' The Meyers singleton is the expected fix; mentioning constinit scores extra.",
      "Frequency and companies: extremely common at systems and embedded employers - Qualcomm, Nvidia, Arm - and in any interview that touches singletons or globals."
    ],
    practiceProblems: [
      "Why is a function-local static thread-safe in C++11 but not in C++03? Answer: C++11 mandated that concurrent entry blocks until initialisation completes, implemented with a guard variable and an atomic acquire load; before that the compiler emitted an unsynchronised check-and-set, so two threads could both run the constructor or one could use a half-constructed object.",
      "A thread_local object's destructor throws during thread exit. What happens? Answer: it propagates out of the thread's cleanup and std::terminate is called; thread_local destructors run at thread exit outside any user try block, so they must be noexcept in practice, and they must not touch namespace-scope objects that may already be destroyed.",
      "You need one global counter shared by 12 translation units, incremented from multiple threads. Design it. Answer: declare inline std::atomic<long> g_count{0}; in a header for C++17, or extern in the header plus one definition in a .cpp for older standards; the atomic gives lock-free increments, and constant initialisation avoids any ordering fiasco."
    ],
    faq: [
      {
        question: "Why does static mean three different things, and is there a unifying idea?",
        answer:
          "Historically the overload came from C, which used static for both internal linkage and persistent locals, and C++ then added the class-scope meaning. The unifying idea that actually helps in an interview is that each context leaves exactly one question open, and static answers it. At namespace scope, storage duration is already static, so the only open question is visibility, and static answers it with internal linkage. Inside a function, linkage is already none because the name cannot be referred to from outside the block, so the only open question is lifetime, and static answers it with whole-program duration. Inside a class, both linkage and duration are determined by the enclosing scope, so the open question is association, and static answers it by binding the member to the class rather than to an instance. Presenting the keyword this way shows you understand the model rather than having memorised three unrelated facts."
      },
      {
        question: "What exactly is the static initialisation order fiasco and why can't the compiler fix it?",
        answer:
          "Namespace-scope objects with dynamic initialisation - those whose construction requires running code - are constructed before main, but the standard leaves the order across translation units unspecified. If a global in one file's constructor uses a global defined in another file, it may run first and observe an object that has only been zero-initialised, which is undefined behaviour for any non-trivial type. The compiler cannot fix it because it compiles each translation unit in isolation and has no way to see the dependency; the linker could in principle order initialisers but has no type information about what depends on what, and any dependency created through a pointer or a virtual call is undecidable anyway. The reliable fix is to remove the ordering question entirely by wrapping the object in a function that returns a local static, so construction is triggered by first use and therefore ordered by the actual dependency graph. C++20's constinit helps in the other direction by guaranteeing certain globals never enter dynamic initialisation at all."
      },
      {
        question: "When should I prefer a function-local static over a namespace-scope global?",
        answer:
          "Almost always, when the object needs a non-trivial constructor. The local static gives you lazy construction so the cost is only paid if the code path is reached, deterministic ordering because construction happens at first use, thread safety guaranteed by the standard since C++11, and encapsulation because callers reach it only through your accessor, which lets you add validation or swap the implementation later. The costs are a guard check on every access, which is a predictable branch and usually free in practice, and a destruction order at exit that is the reverse of construction order and can still surprise you if one such object's destructor uses another. The case for a plain global remains when the object is constant-initialised, since then there is no ordering problem and no guard at all - that is exactly what constinit is designed to certify."
      },
      {
        question: "Is there a runtime cost to marking something static inside a function?",
        answer:
          "Two costs, both small but real. First, the object is no longer on the stack, so accessing it is an absolute or PC-relative load rather than a frame-pointer offset; on modern hardware that difference is negligible, though it does mean the object is shared across calls and so cannot live in a register across the whole function. Second, if the initialiser is not a constant expression, the compiler emits a guard variable and the function begins with an atomic load of that guard plus a branch. In the steady state the branch is perfectly predicted and the atomic load on x86 compiles to an ordinary mov, so the measurable cost is close to zero; on weaker memory models it is an acquire load, still cheap. The genuine cost is not performance but reentrancy and testing: a static holds state across calls, which makes the function non-pure, harder to unit test, and a shared-mutable-state hazard if the object itself is not thread-safe."
      },
      {
        question: "How do I share a mutable global across translation units correctly?",
        answer:
          "The classic form is a declaration in the header and exactly one definition in a source file: extern std::atomic<long> g_count; in counters.h and std::atomic<long> g_count{0}; in counters.cpp. Since C++17 the simpler form is inline std::atomic<long> g_count{0}; directly in the header, which makes the header self-contained and eliminates the risk of the definition drifting out of sync with the declaration. Whichever you choose, three concerns remain. Initialisation should be constant if possible - an atomic with a brace initialiser qualifies - so you avoid the ordering fiasco. Concurrent access must be synchronised, which for a counter means std::atomic and for anything richer means a mutex or a lock-free structure. And the object should be reachable only through a narrow accessor if you ever want to change the representation, because a raw extern variable is part of your ABI the moment another translation unit takes its address."
      },
      {
        question: "What is the difference between extern int x; and extern \"C\" int x;?",
        answer:
          "They control unrelated properties that happen to share a keyword. extern int x; is a declaration: it says an object named x of type int exists somewhere in the program and this translation unit only wants to refer to it, so no storage is allocated here and some other translation unit must supply the definition. extern \"C\" specifies language linkage: it tells the compiler to use C conventions for the entity, which in practice means the symbol name is not mangled and, for functions, that the C calling convention is used. Because the unmangled name carries no type information, extern \"C\" functions cannot be overloaded - two overloads would produce the same symbol. You can combine them, as in extern \"C\" extern int x;, though the common form is to wrap declarations in an extern \"C\" { } block. The practical rule is that extern alone answers 'where does the storage live?' and extern \"C\" answers 'what naming and calling convention does this use?'."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - Storage class specifiers - https://en.cppreference.com/w/cpp/language/storage_duration",
        insight: "Authoritative table of every storage duration and linkage combination, including the thread_local rules."
      },
      {
        source: "book",
        attribution: "Scott Meyers - Effective C++, 3rd ed., Item 4 (Make sure objects are initialized before use)",
        insight: "The original popularisation of the local-static accessor as the cure for the initialisation order fiasco."
      },
      {
        source: "blog",
        attribution: "Chandler Carruth - CppCon talks on thread_local access costs and TLS models",
        insight: "Explains why thread_local in a shared object can require a runtime call and when that cost matters."
      }
    ]
  },
  {
    id: "topic-cpp-fundamentals-object-lifetime",
    moduleId: "mod-cpp-fundamentals",
    title: "Object Lifetime, Initialisation, and Destruction Order",
    intuition:
      "In C++ an object's lifetime is a precisely defined interval, not a vague notion of 'while the pointer is valid'. It begins when storage is obtained and initialisation completes, and it ends when the destructor call starts or the storage is released. Every use outside that window is undefined behaviour, and almost every serious C++ bug - use after free, use after move, dangling reference, reading a base member during construction of a derived class - is a lifetime question in disguise. Learn to draw the interval and the bugs become visible.",
    complexity: {
      time:
        "Construction and destruction of an automatic object of trivial type cost nothing beyond the stack pointer adjustment shared by the whole frame. Non-trivial types pay for their constructor and destructor bodies plus one call per subobject, and a class with N members of non-trivial type incurs N constructor and N destructor calls in guaranteed order. Virtual destruction adds one indirect call through the vtable.",
      space:
        "Automatic objects are laid out in the stack frame with alignment padding; the compiler may reuse the same stack slot for objects whose lifetimes do not overlap. A class's size is the sum of its members plus padding plus one vptr per polymorphic base, and empty base optimisation lets a stateless base contribute zero bytes."
    },
    lesson: [
      {
        title: "The Exact Boundaries of a Lifetime",
        content:
          "For a non-trivially-constructed object the lifetime begins when initialisation is complete - not when storage is allocated - and ends when the destructor call begins - not when the memory is released. The gaps at each end are real and dangerous. Inside a constructor's body the object is not yet fully alive, which is why calling a virtual function there dispatches to the current class's override rather than the most-derived one. Inside a destructor the derived parts are already gone, so the same call dispatches to the base version. Between deallocation and reuse the storage exists but no object does, so reading through an old pointer is undefined even if the bytes look unchanged.",
        diagram: asciiDiagram(`The lifetime interval and its two danger zones

  storage      init        ...object is alive...     dtor      storage
  obtained   complete                               starts     released
     │           │                                    │           │
     ▼           ▼                                    ▼           ▼
     ├───────────┼────────────────────────────────────┼───────────┤
     │ ZONE A    │        LIFETIME (legal use)        │  ZONE B   │
     │ raw bytes │                                    │ raw bytes │
     └───────────┴────────────────────────────────────┴───────────┘
          ▲                                                 ▲
          │                                                 │
   virtual call in                                  virtual call in
   a constructor →                                  a destructor →
   dispatches to the                                dispatches to the
   CURRENT class, not                               CURRENT class; the
   the derived override                             derived part is gone

  Use of the object in ZONE A or ZONE B = undefined behaviour,
  even though the memory is mapped and the bytes are readable.`)
      },
      {
        title: "Member Initialisation Order Is Declaration Order",
        content:
          "Members are constructed in the order they are declared in the class, and destroyed in exactly the reverse order. The order in which you write them in the member initialiser list is irrelevant; the compiler follows declaration order regardless, and warns with -Wreorder when the two disagree. This matters whenever one member's initialiser reads another: if size_ is declared after buffer_ but buffer_'s initialiser uses size_, you read an uninitialised value. Base classes are constructed before any member of the derived class, and virtual bases before non-virtual ones, so a derived constructor can safely use base state but not vice versa.",
        codeExample: `class Buffer {
    std::size_t size_;                   // declared FIRST  -> constructed first
    std::unique_ptr<char[]> data_;       // declared SECOND -> constructed second
public:
    // Written in the "wrong" order, but the compiler uses DECLARATION order,
    // so size_ is already valid when data_ is built. This is correct.
    explicit Buffer(std::size_t n)
        : data_(std::make_unique<char[]>(n)), size_(n) {}   // -Wreorder warns
};

class Broken {
    std::unique_ptr<char[]> data_;       // declared FIRST
    std::size_t size_;                   // declared SECOND
public:
    explicit Broken(std::size_t n)
        : size_(n),
          data_(std::make_unique<char[]>(size_)) {}  // BUG: size_ is garbage here
};
// Destruction is always the exact reverse of construction.`
      },
      {
        title: "The Initialisation Zoo and Why Braces Won",
        content:
          "C++ offers default initialisation, which leaves built-in types with indeterminate values, value initialisation, which zero-initialises them, direct initialisation with parentheses, copy initialisation with =, and list initialisation with braces. Brace initialisation is the modern default because it works uniformly for aggregates, containers, and classes, it prohibits narrowing conversions so a double silently truncating to an int becomes a compile error, and it never falls foul of the most vexing parse. Its one trap is that a constructor taking std::initializer_list outcompetes every other constructor when braces are used, which is why std::vector<int> v{5, 0} makes a two-element vector while std::vector<int> v(5, 0) makes five zeros.",
        codeExample: `int a;                 // default-init: INDETERMINATE value; reading it is UB
int b{};               // value-init: zero
int c = 3.9;           // copy-init: narrows silently to 3
// int d{3.9};         // ERROR: narrowing conversion is ill-formed with braces

std::vector<int> v1(5, 0);   // 5 elements, all 0    <- parentheses
std::vector<int> v2{5, 0};   // 2 elements: 5 and 0  <- initializer_list wins

struct Point { int x, y; };
Point p{1, 2};         // aggregate initialisation
Point q{};             // both members zero-initialised

// The most vexing parse - solved by braces:
// Widget w(Gadget());   // declares a FUNCTION returning Widget
Widget w{Gadget{}};      // unambiguously a variable`
      },
      {
        title: "Destruction Order and Exception Safety",
        content:
          "Destruction is strictly reverse construction order at every level: automatic objects in a block are destroyed in reverse declaration order, members in reverse declaration order, and derived parts before base parts. This determinism is what makes RAII work, because it means acquisition and release nest correctly. It also underpins exception safety: if a constructor throws after some members are built, those members are destroyed but the object's own destructor never runs, because the object never came alive. That asymmetry is why a class that acquires two raw resources in its constructor body leaks the first when the second throws, and why each resource should be owned by its own member whose destructor runs independently.",
        codeExample: `struct Bad {
    FILE* a_;
    FILE* b_;
    Bad() {
        a_ = std::fopen("a.txt", "r");
        b_ = std::fopen("b.txt", "r");   // if this throws or we throw after,
        if (!b_) throw std::runtime_error("b");  // ~Bad NEVER runs -> a_ leaks
    }
    ~Bad() { std::fclose(a_); std::fclose(b_); }
};

struct Good {
    std::unique_ptr<FILE, decltype(&std::fclose)> a_{
        std::fopen("a.txt", "r"), &std::fclose};
    std::unique_ptr<FILE, decltype(&std::fclose)> b_{
        std::fopen("b.txt", "r"), &std::fclose};
    // If b_'s initialisation throws, a_ is a fully constructed member and
    // IS destroyed. No leak, no destructor body needed at all.
};`,
        diagram: asciiDiagram(`Construction unwinding when a member throws

  Derived d;
     │
     ├─▶ Base::Base()            ✔ completed
     ├─▶ member1 ctor            ✔ completed
     ├─▶ member2 ctor            ✘ THROWS
     │
     ▼
  Unwinding begins - and it is exact:
     ├─▶ member2   : NOT destroyed (never constructed)
     ├─▶ member1   : destroyed        ◀── reverse order
     ├─▶ Base      : destroyed
     └─▶ ~Derived(): NEVER CALLED  ◀── the object never became alive

  Consequence: any raw resource acquired in the CONSTRUCTOR BODY
  before the throw is leaked. Give every resource its own member.`)
      },
      {
        title: "Temporaries, Lifetime Extension, and Dangling",
        content:
          "A temporary is destroyed at the end of the full expression that created it, which is usually the semicolon. Binding a temporary to a const lvalue reference or an rvalue reference at block scope extends its lifetime to that of the reference, a rule that saves the classic const std::string& s = make_name(); pattern. The extension does not propagate: it does not apply to a reference member initialised from a temporary in a constructor, and it does not apply when the reference is returned. Range-based for loops were a notorious victim, because for (auto c : obj.items()) extended nothing on the intermediate obj in a chained call - fixed only in C++23. std::string_view and std::span make the hazard easy to hit because they are non-owning views over storage that may already be gone.",
        codeExample: `std::string make_name();

const std::string& ok  = make_name();   // lifetime EXTENDED to scope end
const std::string& bad = make_name().substr(0);  // extends the substr result,
                                                 // but make_name()'s temporary
                                                 // still dies at the semicolon

struct Holder {
    const std::string& s_;
    explicit Holder(const std::string& s) : s_(s) {}  // NO extension for members
};
Holder h{make_name()};   // DANGLING: the temporary dies at this semicolon

std::string_view sv = std::string("hello") + "world";  // DANGLING immediately

// Safe: own the storage.
std::string owned = std::string("hello") + "world";
std::string_view good = owned;`
      }
    ],
    examples: [
      {
        title: "Virtual call in a constructor",
        input:
          "Base's constructor calls a pure-ish virtual describe(); Derived overrides it. A Derived is created.",
        output: "Base::describe() runs, or the program terminates if the base version is pure virtual.",
        explanation:
          "Step 1: Construction proceeds base-first, so when Base's constructor body runs the Derived subobject has not been initialised.\nStep 2: To keep that state consistent, the compiler sets the vptr to Base's vtable for the duration of Base's constructor.\nStep 3: The virtual call therefore resolves to Base::describe, not the override, which almost never matches the author's intent.\nStep 4: If Base::describe is pure virtual with no definition, the call hits __cxa_pure_virtual and the program terminates.\nStep 5: The fix is a two-phase pattern - construct, then call an init() that performs the virtual work - or to pass the varying behaviour in as a constructor parameter."
      },
      {
        title: "Member reorder bug found only by a warning",
        input:
          "class Ring { char* buf_; size_t cap_; public: Ring(size_t n) : cap_(n), buf_(new char[cap_]) {} };",
        output: "Allocates a garbage-sized buffer; -Wreorder flags it at compile time.",
        explanation:
          "Step 1: Members are constructed in declaration order, so buf_ is initialised before cap_ regardless of the initialiser list order.\nStep 2: buf_'s initialiser reads cap_, which at that moment holds an indeterminate value.\nStep 3: new char[cap_] therefore allocates an arbitrary size - possibly enormous, possibly zero - and reading an indeterminate value is itself undefined behaviour.\nStep 4: The bug is invisible in testing whenever the stack happens to contain a plausible value, which is why it survives to production.\nStep 5: Fix by declaring cap_ before buf_, and always build with -Wreorder promoted to an error so declaration order and initialiser order cannot drift apart."
      },
      {
        title: "string_view over a temporary",
        input:
          "std::string_view name = config.get_section() + \"/name\"; followed by a later use of name.",
        output: "Garbage or a crash; sanitizers report a stack-use-after-scope or heap-use-after-free.",
        explanation:
          "Step 1: The concatenation produces a temporary std::string that owns the character data.\nStep 2: The string_view is constructed pointing into that temporary's buffer, storing only a pointer and a length.\nStep 3: The temporary is destroyed at the end of the full expression - the semicolon - and its buffer is freed.\nStep 4: Binding to a string_view does not extend the temporary's lifetime, because string_view is an object, not a reference, so no extension rule applies.\nStep 5: Either store a std::string, or restrict the view's use to within the same full expression; treating every view type as a borrowed pointer with an explicit owner is the discipline that prevents this."
      }
    ],
    tips: [
      "Declare members in the order they must be constructed, and enable -Wreorder as an error so the compiler enforces it.",
      "Give every resource its own RAII member rather than acquiring several in a constructor body; that alone makes constructors exception-safe.",
      "Treat std::string_view, std::span, and every reference member as a borrowed pointer and always name the owner that outlives them."
    ],
    tricks: [
      "Prefer braces for initialisation everywhere except when you specifically need a size-and-value constructor such as vector(n, v); braces ban narrowing and dodge the most vexing parse.",
      "Build tests with -fsanitize=address,undefined; use-after-scope and use-after-free are exactly the lifetime errors that no compiler warning will catch.",
      "= delete on a constructor taking a temporary - for example Holder(std::string&&) = delete; - turns a dangling-reference bug into a compile error."
    ],
    memoryAids: [
      "Life begins when initialisation ends and ends when destruction begins; the two gaps are where the bugs live.",
      "Members are built in declaration order and destroyed in reverse - the initialiser list order is a lie the compiler ignores.",
      "If the constructor throws, the destructor never runs; only fully constructed members are cleaned up."
    ],
    interviewPatterns: [
      "'What happens if you call a virtual function in a constructor?' A complete answer covers the vptr staging and the pure-virtual termination case.",
      "'This class leaks when the second allocation throws - fix it.' Tests whether you reach for member-level RAII rather than a try/catch in the constructor.",
      "Frequency and companies: a staple at Bloomberg, Microsoft, and any team with a C++ codebase old enough to have been burned by raw resource management."
    ],
    practiceProblems: [
      "Why does destroying a Derived through a Base* without a virtual destructor cause undefined behaviour? Answer: the delete expression uses the static type to select the destructor, so only ~Base runs and the Derived members are never destroyed and the wrong amount of storage may be freed; declare the base destructor virtual, or protected and non-virtual if the base is never deleted polymorphically.",
      "Does const T& x = f(); always extend the temporary's lifetime? Answer: only when the reference is a local variable or a namespace-scope object binding directly to the temporary; it does not apply to reference members initialised in a constructor, to a returned reference, or when the temporary reaches the reference through an intermediate function argument.",
      "A class holds a std::mutex and a std::condition_variable and its destructor sometimes hangs. Diagnose. Answer: members are destroyed in reverse declaration order, so if a waiting thread still references the condition variable when it is destroyed the behaviour is undefined; join or stop all users before destruction and declare the synchronisation members so they outlive whatever depends on them."
    ],
    faq: [
      {
        question: "Why is calling a virtual function from a constructor dangerous?",
        answer:
          "During construction the object is only partially alive: base subobjects and earlier members exist, but the derived parts do not. If a virtual call dispatched to the most-derived override, that override could read derived members that have not been initialised, so the language deliberately prevents it by staging the vptr - each constructor sets the vptr to its own class's vtable before running its body. The result is that a virtual call inside Base's constructor always resolves to Base's version, even when the object being constructed is a Derived, which is almost never what the code's author intended. If the base version is pure virtual and has no definition, the call reaches the runtime's pure-virtual handler and the program terminates. The same staging happens in reverse during destruction. The standard workarounds are two-phase initialisation with an explicit init call after the object is fully constructed, passing the varying behaviour in as a constructor argument such as a std::function or a strategy object, or using a factory function that constructs and then calls the virtual step."
      },
      {
        question: "What is the difference between default, value, and zero initialisation?",
        answer:
          "Default initialisation runs the default constructor for class types and does nothing at all for built-in types, so int x; at block scope holds an indeterminate value and reading it is undefined behaviour rather than merely unpredictable - the compiler may assume it never happens and optimise accordingly. Value initialisation, written with empty braces as int x{} or T x{}, zero-initialises built-in types and, for class types, either runs a user-provided default constructor or zero-initialises the members if the constructor is implicitly defined. Zero initialisation is the underlying operation that sets all bytes to zero and is what happens automatically to static-duration objects before any other initialisation. The practical rule is to always write braces on locals: it costs nothing for class types, it removes an entire family of uninitialised-read bugs for built-ins, and it makes the intent explicit to reviewers. The one exception worth knowing is that a very large local array initialised with braces will be zeroed at runtime, which in a hot path is a cost you may want to opt out of deliberately."
      },
      {
        question: "How does lifetime extension actually work, and where does it fail?",
        answer:
          "When a temporary is bound directly to a const lvalue reference or to an rvalue reference, the temporary's lifetime is extended to match the reference's lifetime. This works for local references and for namespace-scope and static references, and it applies transitively to a temporary reached through aggregate member access or array subscripting of the bound temporary. It fails in three important places. It does not apply to a reference member of a class initialised in a member initialiser list, so a constructor taking const std::string& and storing it as a reference member leaves a dangling reference the moment the caller passes a temporary. It does not apply to a reference returned from a function, since the temporary dies at the end of the caller's full expression at best. And it does not apply when the temporary is bound through an intervening function call, because the parameter reference is the one that binds, and its lifetime ends when the function returns. A fourth case, the range-based for loop over a temporary reached through a member call, was a well-known hazard until C++23 extended the rule to cover it."
      },
      {
        question: "What is placement new's role in object lifetime?",
        answer:
          "Placement new separates the two things that normally happen together - obtaining storage and beginning an object's lifetime. Writing new (buffer) T{args} constructs a T in memory you already own without allocating, so it is the mechanism behind std::vector's uninitialised capacity, small-buffer optimisation, std::optional, memory pools, and arena allocators. Because you obtained the storage yourself, you are also responsible for ending the lifetime: you must call the destructor explicitly as obj->~T(), and you must not call delete on the pointer. The rules around reuse are subtle. If you destroy a T in a buffer and construct a different type in the same bytes, any pointer or reference to the old object is invalid, and even a pointer to a new object of the same type at the same address is only usable via std::launder in some const-or-reference-member cases. Alignment matters too: the buffer must be suitably aligned for T, which is why alignas or std::aligned_storage - deprecated in C++23 in favour of an aligned byte array - appears in every hand-rolled implementation."
      },
      {
        question: "Why does the destructor not run when a constructor throws?",
        answer:
          "Because the destructor's contract is to undo a completed construction, and an object whose constructor threw never completed construction, so it never began its lifetime. Running the destructor would mean running cleanup code that assumes invariants the constructor never finished establishing. What does happen is precise and useful: every base subobject and every member that was fully constructed before the throw is destroyed, in reverse order of construction, and then the exception propagates. The immediate consequence is that resources acquired inside the constructor's body - a raw new, an fopen, a lock taken manually - are leaked, because they are not members with their own destructors. This is the strongest practical argument for the rule that every resource should be owned by a dedicated RAII member: with unique_ptr, lock_guard, or a small handle wrapper as members, the automatic member cleanup during unwinding is exactly the cleanup you need, and the constructor body can often be left empty. The one exception where a destructor does run for a partially handled case is a function-try-block on a constructor, which can catch the exception but must still rethrow."
      },
      {
        question: "Is it safe to use an object after it has been moved from?",
        answer:
          "It is safe in the narrow technical sense that the object is still alive and its destructor must run, but it is only safe to perform operations with no precondition. The standard specifies that a moved-from object of a standard library type is in a valid but unspecified state, which means you may destroy it, assign a new value to it, or call operations whose contract holds for any value - clear, size, empty, operator=. What you may not do is assume a particular value: a moved-from std::string is very often empty because of small-string optimisation transfers, but that is not guaranteed, and a moved-from std::unique_ptr is guaranteed null while a moved-from std::vector is not guaranteed to be empty even though implementations universally leave it so. For your own types, the useful discipline is to make the moved-from state a well-defined, cheaply destructible one - typically the same state as a default-constructed object - and to document it. Static analysers and clang-tidy's bugprone-use-after-move check catch most accidental uses."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - Object lifetime - https://en.cppreference.com/w/cpp/language/lifetime",
        insight: "Normative boundaries of lifetime plus the complete list of lifetime-extension cases and their exceptions."
      },
      {
        source: "book",
        attribution: "Herb Sutter - Exceptional C++, Items 8-19 on exception safety and constructor failure",
        insight: "Explains why member-level RAII, not try/catch in constructors, is the correct exception-safety mechanism."
      },
      {
        source: "book",
        attribution: "Scott Meyers - Effective Modern C++, Item 7 (Distinguish () and {} when creating objects)",
        insight: "The definitive treatment of brace initialisation, narrowing, and the initializer_list hijacking problem."
      }
    ]
  },
  {
    id: "topic-cpp-fundamentals-stack-heap-static",
    moduleId: "mod-cpp-fundamentals",
    title: "Stack, Heap, and Static Storage: Layout, Cost, and Failure Modes",
    intuition:
      "A C++ process divides its address space into regions with radically different cost and lifetime characteristics. The stack is a per-thread bump allocator that is nearly free but small and strictly scoped. The heap is a general allocator that is flexible but costs hundreds of cycles, can fragment, and must be released explicitly. Static storage is laid out by the linker and lives forever. Choosing the wrong region is the single most common cause of both crashes and poor performance in C++ code, so knowing what each one costs is a load-bearing skill.",
    complexity: {
      time:
        "A stack allocation is one subtraction from the stack pointer, effectively free and usually folded into the function prologue for the whole frame. A heap allocation via malloc or new typically costs 50 to 200 nanoseconds depending on size class and contention, plus a possible system call when the allocator needs more memory from the kernel. Static objects have no allocation cost at all, only whatever dynamic initialisation their constructors require.",
      space:
        "Stack size is a fixed per-thread reservation, commonly 8 MB on Linux and 1 MB per thread on Windows, and exceeding it is a crash rather than an error. Heap allocations carry per-block metadata, typically 8 to 16 bytes, plus rounding to a size class, so a million 24-byte nodes can easily occupy 48 MB. Zero-initialised statics live in .bss and cost address space but essentially no file size."
    },
    lesson: [
      {
        title: "The Regions of a Running Process",
        content:
          "A typical process image places the text segment holding machine code at low addresses, followed by the read-only data segment, then .data for initialised globals and .bss for zero-initialised ones. Above that the heap grows upward as the allocator requests more memory, and the stack starts near the top of the address space and grows downward. Each thread gets its own stack; the heap and all static storage are shared. Memory-mapped regions for shared libraries and large allocations sit in between. The practical consequence of this layout is that stack and heap addresses look wildly different, which is why printing a pointer often tells you immediately which region an object came from and therefore who owns it.",
        diagram: asciiDiagram(`Address space of a running C++ process (typical, Linux x86-64)

   high addresses
   ┌──────────────────────────────┐
   │ command line args, environ   │
   ├──────────────────────────────┤
   │ STACK  (thread 1)            │  automatic objects
   │        │ grows down          │  free to allocate, fixed size
   │        ▼                     │  overflow = SIGSEGV, no exception
   ├──────────────────────────────┤
   │            ...               │
   ├──────────────────────────────┤
   │ mmap region                  │  shared libs, large mallocs,
   │ (other threads' stacks here) │  thread stacks
   ├──────────────────────────────┤
   │            ...               │
   ├──────────────────────────────┤
   │        ▲                     │
   │        │ grows up            │  new / malloc
   │ HEAP                         │  ~50-200 ns per allocation
   ├──────────────────────────────┤
   │ .bss   zero-init statics     │  costs address space, not file size
   ├──────────────────────────────┤
   │ .data  initialised statics   │  stored in the binary
   ├──────────────────────────────┤
   │ .rodata  string literals     │  writing here = SIGSEGV
   ├──────────────────────────────┤
   │ .text   machine code         │
   └──────────────────────────────┘
   low addresses`)
      },
      {
        title: "Why the Stack Is Fast and Where It Runs Out",
        content:
          "Allocating on the stack means decrementing the stack pointer, which the compiler does once for the entire frame. The memory is almost certainly in L1 cache because the same addresses were used by the previous call, deallocation is a single increment, and there is no metadata, no locking, and no fragmentation. The costs are structural rather than per-operation. The size is fixed at thread creation and overflowing it produces a segmentation fault with no exception you can catch, so recursion depth and large local arrays are hard limits. Objects cannot outlive their scope, so returning a pointer or reference to a local is always a bug. And variable-length arrays are not standard C++, so a runtime-sized buffer must go on the heap or use a fixed maximum.",
        codeExample: `void fine() {
    std::array<char, 4096> buf{};       // 4 KB on the stack: fast, fine
    process(buf.data(), buf.size());
}

void crash() {
    std::array<char, 16 * 1024 * 1024> buf{};  // 16 MB > 8 MB stack
    process(buf.data(), buf.size());           // SIGSEGV on entry, no exception
}

int* dangling() {
    int local = 42;
    return &local;                 // UB: the frame is gone on return
}

std::string_view also_dangling() {
    char tmp[16] = "hello";
    return std::string_view{tmp};  // UB: view outlives the array
}

// Runtime-sized buffers: heap, not stack.
void ok(std::size_t n) {
    std::vector<char> buf(n);      // heap-backed, bounded by available memory
    // char vla[n];                // not standard C++ (a GNU extension)
}`
      },
      {
        title: "What new Actually Costs",
        content:
          "A call to new does two things: it calls operator new to obtain raw storage, then constructs the object in it. operator new usually forwards to malloc, which walks free lists or bins for a suitable block, may split or coalesce blocks, and periodically calls the kernel via brk or mmap for more memory. On a multithreaded program the allocator must also handle contention, which modern allocators mitigate with per-thread caches. The result is that an allocation is roughly two orders of magnitude more expensive than a stack allocation, and the deallocation is comparable. Worse, the returned memory is unlikely to be cache-resident and consecutive allocations are not guaranteed to be contiguous, so a linked structure of heap nodes suffers a cache miss per hop while a vector of the same data streams at full memory bandwidth.",
        codeExample: `// Same data, radically different performance.
struct Node { int v; Node* next; };

// 1) One heap allocation per element, pointer-chasing traversal.
Node* build_list(int n) {
    Node* head = nullptr;
    for (int i = n; i-- > 0; ) head = new Node{i, head};   // n allocations
    return head;                                           // ~n cache misses
}                                                          // to traverse

// 2) One allocation total, sequential traversal, prefetcher-friendly.
std::vector<int> build_vec(int n) {
    std::vector<int> v;
    v.reserve(n);                       // ONE allocation, amortises the rest
    for (int i = 0; i < n; ++i) v.push_back(i);
    return v;                           // NRVO: no copy on return
}
// Measured on typical hardware the vector traversal is 5-20x faster
// for large n, purely from locality - the algorithmic complexity is identical.`,
        diagram: asciiDiagram(`Locality: why the container choice dominates the complexity

  std::vector<int> (contiguous)
  ┌────┬────┬────┬────┬────┬────┬────┬────┐
  │ 0  │ 1  │ 2  │ 3  │ 4  │ 5  │ 6  │ 7  │  one 64-byte line
  └────┴────┴────┴────┴────┴────┴────┴────┘  holds 16 ints
   ▲                                          → 1 miss per 16 elements
   └── hardware prefetcher predicts the stride

  linked list of heap nodes (scattered)
  ┌──────┐      ┌──────┐        ┌──────┐
  │ v=0  │      │ v=1  │        │ v=2  │      each node in a
  │ next ┼─────▶│ next ┼───────▶│ next ┼──▶   different cache line
  └──────┘      └──────┘        └──────┘      → 1 miss per element
     ▲              ▲               ▲          → prefetcher cannot help
     │              │               │             (address unknown until
   0x7f1a..      0x7f2c..        0x7f04..          the previous load lands)

  Both traversals are O(n). The constant factor differs by 10x or more.`)
      },
      {
        title: "Fragmentation, Arenas, and Allocation Strategies",
        content:
          "Long-running processes that repeatedly allocate and free varying sizes suffer external fragmentation: total free memory is ample but no single contiguous block is large enough. The classic mitigations are to allocate objects of one size from a pool so blocks are interchangeable, to use an arena that allocates by bumping a pointer and frees everything at once when a phase completes, and to reserve capacity up front so containers do not repeatedly grow and abandon blocks. C++17 formalised this with polymorphic memory resources, letting you give a standard container a monotonic buffer resource backed by a stack array, which combines container convenience with stack-allocation speed. Custom allocation is a real performance tool but also a real complexity cost, so measure before reaching for it.",
        codeExample: `#include <memory_resource>
#include <vector>

void hot_path() {
    // A 64 KB stack buffer used as an arena: no malloc calls at all.
    std::byte buffer[64 * 1024];
    std::pmr::monotonic_buffer_resource arena{buffer, sizeof(buffer)};

    std::pmr::vector<int> v{&arena};
    v.reserve(1000);                  // bumps a pointer inside 'buffer'

    std::pmr::vector<std::pmr::string> names{&arena};
    names.emplace_back("alpha");      // strings also allocate from the arena

    // No deallocation work at scope exit: the arena is simply abandoned.
    // Falls back to the upstream resource if the buffer is exhausted.
}`
      },
      {
        title: "Choosing a Region: A Decision Procedure",
        content:
          "Start with the stack: if the object's size is known at compile time, it is not huge, and its lifetime is bounded by the current scope, an automatic object is the correct and fastest choice. Move to the heap when the size is only known at runtime, when the object must outlive the creating scope, when it is large enough to threaten the stack, or when the object is polymorphic and must be stored by base pointer. Even then, prefer a container or a smart pointer that manages the allocation for you rather than a raw new. Reach for static storage only for genuinely program-wide, immutable data such as lookup tables, and prefer constexpr or inline constexpr so the data is constant-initialised and free of ordering hazards. Mutable globals should be a last resort because they defeat testing and demand synchronisation.",
        codeExample: `// Size known, scope-bounded  -> stack
void parse(std::string_view line) {
    std::array<char, 256> field{};
    // ...
}

// Size runtime-determined     -> heap, via a container
std::vector<char> read_all(std::istream& in, std::size_t n) {
    std::vector<char> data(n);
    in.read(data.data(), static_cast<std::streamsize>(n));
    return data;                       // moved/elided, not copied
}

// Must outlive the scope, polymorphic -> heap, via a smart pointer
std::unique_ptr<Shape> make_shape(int kind) {
    if (kind == 0) return std::make_unique<Circle>(1.0);
    return std::make_unique<Square>(2.0);
}

// Program-wide immutable data -> static, constant-initialised
inline constexpr std::array<int, 5> kPrimes{2, 3, 5, 7, 11};`
      }
    ],
    examples: [
      {
        title: "Stack overflow from an innocuous local",
        input:
          "A function declares int matrix[1024][1024]; as a local, then the process crashes immediately on entering it.",
        output: "Segmentation fault before any statement in the function runs.",
        explanation:
          "Step 1: The array is 1024 * 1024 * 4 bytes, which is 4 MB, allocated in the function's stack frame.\nStep 2: The default thread stack is 8 MB on Linux and 1 MB on Windows, so this either nearly exhausts it or overruns it outright.\nStep 3: The frame is reserved in the prologue, so the fault occurs on entry rather than at first use, which is why the crash appears to come from the opening brace.\nStep 4: There is no exception - stack overflow is a hardware fault, so no try/catch and no std::bad_alloc can intervene.\nStep 5: Move it to the heap with std::vector<int> matrix(1024 * 1024) and index manually, or make it a static or thread_local buffer if the function is not reentrant."
      },
      {
        title: "Fragmentation in a long-running service",
        input:
          "A server allocates and frees messages of sizes between 100 bytes and 2 MB for weeks. RSS climbs steadily even though the leak checker reports no leaks.",
        output: "Memory usage grows without bound despite balanced allocation and deallocation.",
        explanation:
          "Step 1: No leak exists - every allocation is freed - so the growth is fragmentation, not leakage.\nStep 2: Freed small blocks leave gaps that are too small to satisfy later large requests, so the allocator extends the heap instead of reusing them.\nStep 3: glibc's allocator only returns memory to the OS from the top of the heap, so a single live block near the top pins everything below it.\nStep 4: The measurable symptom is a rising RSS with a stable live-object count, which is the diagnostic signature of fragmentation.\nStep 5: Fixes include size-class pools for the common message sizes, an arena reset per request, or switching to jemalloc or tcmalloc, which manage size classes and return memory more aggressively."
      },
      {
        title: "Replacing per-node allocation with an arena",
        input:
          "A parser builds an AST of roughly 200,000 small nodes per document with new, then deletes the whole tree.",
        output: "Roughly a 3 to 5 times speedup after switching to a monotonic arena, with destruction becoming nearly free.",
        explanation:
          "Step 1: The original code pays a full allocator round trip per node, so 200,000 allocations plus 200,000 deallocations dominate the parse time.\nStep 2: The nodes all die together at the end of the document, which is exactly the lifetime pattern an arena is designed for.\nStep 3: A monotonic_buffer_resource allocates by bumping a pointer, so each node costs a few instructions and the nodes end up contiguous, which also speeds traversal.\nStep 4: Freeing is a single operation that abandons the whole buffer, provided the node type is trivially destructible so no destructors need to run.\nStep 5: The trade-off is that memory is not reclaimed until the arena is released, which is acceptable per-document but would be wrong for a long-lived structure with mixed lifetimes."
      }
    ],
    tips: [
      "Default to automatic storage; escalate to the heap only when size is dynamic, lifetime escapes the scope, or the object is large or polymorphic.",
      "Call reserve on a vector whose final size you can estimate; it converts log-many reallocations and copies into one allocation.",
      "Never return a pointer, reference, string_view, or span to a local object - the frame is gone the moment the function returns."
    ],
    tricks: [
      "Print a pointer during debugging: stack addresses cluster near the top of the address space while heap addresses are far lower, which identifies the owner instantly.",
      "ulimit -s on Linux and the /STACK linker option on Windows change the stack size when deep recursion is genuinely required, but converting recursion to an explicit stack is usually better.",
      "std::pmr::monotonic_buffer_resource over a stack array gives standard containers stack-allocation speed with zero changes to your algorithm code."
    ],
    memoryAids: [
      "Stack is a bump pointer, the heap is a bookkeeper, and static is the linker's decision - price them accordingly.",
      "Stack grows down, heap grows up; when they meet you are already in trouble.",
      "Big, dynamic, or long-lived goes on the heap; everything else belongs on the stack."
    ],
    interviewPatterns: [
      "'Where does this object live and who frees it?' asked about every variable in a code-reading exercise - the fastest way to test ownership fluency.",
      "'Your service's memory grows but there are no leaks. Explain.' Fragmentation, allocator retention, and caches that never evict are the three expected answers.",
      "Frequency and companies: constant at HFT firms, game studios, and embedded teams, where the stack-versus-heap decision has direct latency consequences."
    ],
    practiceProblems: [
      "Why does a std::vector of 1,000,000 ints usually beat a std::list of the same data on traversal despite both being O(n)? Answer: the vector is one contiguous allocation so 16 ints share a cache line and the hardware prefetcher predicts the stride, while each list node is a separate heap block reached by a dependent load, giving roughly one cache miss per element and no prefetching.",
      "A recursive tree walk crashes on deep inputs but an equivalent iterative version does not. Explain and fix. Answer: each recursive call consumes a stack frame and deep inputs exhaust the fixed thread stack, producing a fault rather than an exception; convert to an explicit std::vector-backed worklist, which moves the frames to the heap where growth is bounded by available memory.",
      "When is a global std::string worse than a function-local static std::string? Answer: the global has dynamic initialisation ordered unspecifiedly against other translation units and is constructed even if never used, while the function-local static is constructed thread-safely on first use and therefore has a well-defined order relative to its actual dependencies."
    ],
    faq: [
      {
        question: "Why is heap allocation so much slower than stack allocation?",
        answer:
          "Because they solve different problems. The stack only supports strictly nested lifetimes, so allocation reduces to moving a pointer and deallocation to moving it back; there is no search, no metadata, no fragmentation, and the memory is nearly always already in L1 cache. The heap must support arbitrary allocation and free order, so it maintains data structures - free lists, size-class bins, red-black trees for large blocks - and must find a suitable block, possibly split it, record its size for the eventual free, and coalesce neighbours on release. In multithreaded programs it must also avoid contention, which modern allocators handle with per-thread caches that mostly work but occasionally need a slow path into a shared arena. On top of the algorithmic work, freshly allocated memory is often cold in cache and may require the kernel to map new pages, adding a page fault. The overall result is 50 to 200 nanoseconds for a typical allocation versus effectively zero for the stack, which is why hot loops avoid allocating entirely."
      },
      {
        question: "What actually happens when the stack overflows, and can I catch it?",
        answer:
          "The operating system places a guard page immediately past the end of each thread's stack. When the growing stack touches that page the hardware raises a fault, which becomes SIGSEGV on Linux or an EXCEPTION_STACK_OVERFLOW on Windows. It is not a C++ exception, so no try/catch and no std::bad_alloc handler will see it, and by the time the fault occurs there may not be enough stack left to run a handler anyway. On Windows you can catch it with structured exception handling and reset the guard page, but the process is in a fragile state; on Linux you can install a signal handler on an alternate signal stack with sigaltstack purely to log a diagnostic before exiting. In practice stack overflow should be prevented rather than handled: bound recursion depth explicitly or convert to iteration, keep large buffers off the stack, and remember that the danger is amplified in threads because secondary thread stacks are often much smaller than the main thread's."
      },
      {
        question: "Is new always slower than a stack allocation, and when is the heap the right answer anyway?",
        answer:
          "Yes, allocation itself is always slower, but that is only one term in the equation. The heap is the correct choice whenever the alternative is impossible or worse: when the size is only known at runtime and a fixed maximum would waste memory or be unsafe, when the object must outlive the creating scope, such as a factory returning a polymorphic object by base pointer, when the object is large enough to threaten the stack, or when many owners share a lifetime and you need reference counting. There is also a subtle case where the heap wins on performance: moving a large object is cheap if it owns heap storage, because the move transfers a pointer, whereas a large stack object must be copied byte by byte. The right discipline is to avoid allocating in hot loops rather than to avoid the heap globally, and to amortise unavoidable allocation by reserving capacity, reusing buffers across iterations, or using an arena for objects that share a lifetime."
      },
      {
        question: "What is memory fragmentation and how do I tell it apart from a leak?",
        answer:
          "A leak means allocated blocks are never freed, so the live-object count grows without bound. Fragmentation means every block is freed correctly but the free space is broken into pieces too small to satisfy incoming requests, so the allocator keeps requesting more memory from the kernel. The diagnostic distinction is straightforward: run a leak checker such as Valgrind or LeakSanitizer, and if it reports nothing while resident set size still climbs, the problem is fragmentation or allocator retention. Two aggravating factors are common in real services. Allocators like glibc's malloc only return memory to the OS from the top of the main heap, so one long-lived allocation high in the heap pins everything below it. And mixed-size workloads - many small allocations interleaved with occasional large ones - fragment far worse than uniform ones. Remedies are size-class pools, per-request arenas that reset wholesale, preallocating and reusing buffers, or switching to jemalloc or tcmalloc, which use size-segregated spans and release memory more willingly."
      },
      {
        question: "Where do string literals live, and why is modifying one undefined behaviour?",
        answer:
          "String literals have static storage duration and are placed by the compiler in a read-only section, usually .rodata, which the loader maps without write permission. Their type is const char[N], so const char* p = \"hello\"; is correct and char* p = \"hello\"; is ill-formed in C++11 and later - it was merely deprecated before that, which is why old code still compiles with a warning on some toolchains. Attempting to write through such a pointer triggers a hardware protection fault and terminates the process. The compiler is also permitted to merge identical literals, so two occurrences of \"hello\" in different translation units may share one address, which means comparing literal pointers with == gives implementation-defined results. The safe patterns are to use const char* or std::string_view for non-owning references to literals, and to copy into a std::string or a char array when you need mutability, as in char buf[] = \"hello\"; which creates a modifiable copy on the stack."
      },
      {
        question: "How do the memory regions interact with threads?",
        answer:
          "Each thread gets its own stack, allocated at thread creation with a size fixed then - typically 8 MB on Linux, though pthread_attr_setstacksize can change it, and 1 MB by default on Windows. That means automatic objects are inherently thread-private and need no synchronisation, which is the deepest reason to prefer the stack in concurrent code. The heap and all static storage are shared across every thread, so any object there that is mutated concurrently needs a mutex, an atomic, or another synchronisation mechanism. The allocator itself is thread-safe but not free of contention: allocation-heavy multithreaded code can bottleneck on the allocator even with per-thread caches, which is a common and surprising scalability limit. thread_local sits between the two, giving one static-duration instance per thread with no locking but at the cost of an extra indirection and of multiplying the object's footprint by the thread count. A related concurrency hazard tied to layout is false sharing, where two threads write to distinct objects that happen to occupy the same cache line and so ping-pong ownership between cores."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Ulrich Drepper - What Every Programmer Should Know About Memory (2007)",
        insight: "The definitive explanation of cache hierarchies, prefetching, and why data layout dominates traversal cost."
      },
      {
        source: "note",
        attribution: "cppreference - std::pmr::monotonic_buffer_resource - https://en.cppreference.com/w/cpp/memory/monotonic_buffer_resource",
        insight: "Shows how to back standard containers with a stack buffer and eliminate allocator traffic entirely."
      },
      {
        source: "video",
        attribution: "Chandler Carruth - Efficiency with Algorithms, Performance with Data Structures (CppCon 2014)",
        insight: "Demonstrates empirically that contiguous storage beats node-based structures even when Big-O is identical."
      }
    ]
  }
];
