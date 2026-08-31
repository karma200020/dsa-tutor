import { Topic } from "../syllabus";

function asciiDiagram(art: string): string {
  return `<pre style="margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#a5f3fc;white-space:pre;text-align:left;overflow-x:auto;">${art}</pre>`;
}

export const cppTemplatesTopics: Topic[] = [
  {
    id: "topic-cpp-templates-function-and-class-templates",
    moduleId: "mod-cpp-templates-and-generic-programming",
    title: "Function and Class Templates: Deduction and Instantiation",
    intuition:
      "A template is not code - it is a recipe the compiler follows once per distinct set of arguments to produce real code. Everything surprising about templates follows from that: why they live in headers, why errors appear at instantiation rather than at definition, why a template that is never called is barely checked, and why deduction sometimes refuses arguments you thought were obvious. Learning the deduction rules and the two-phase lookup model turns templates from a source of unreadable errors into a predictable tool.",
    complexity: {
      time:
        "Templates cost compile time, not run time: each distinct instantiation is a separate function body the compiler must parse, instantiate, optimise, and the linker must deduplicate, so heavy template use is a leading cause of slow builds. At run time an instantiated template is identical to a hand-written function, so a generic std::sort matches or beats C's qsort because the comparator is inlined rather than called through a pointer.",
      space:
        "Each instantiation produces its own machine code, so a template used with twenty types yields twenty function bodies - real binary bloat that matters for embedded targets and instruction cache pressure. The usual mitigation is to hoist type-independent work into a non-template helper so only a thin wrapper is duplicated."
    },
    lesson: [
      {
        title: "Template Argument Deduction",
        content:
          "When you call a function template without explicit arguments, the compiler matches each parameter's type pattern against the argument's type to deduce the template parameters. Three rules cover most cases. For a by-value parameter T, the argument's reference, const, and volatile qualifiers are stripped and arrays and functions decay to pointers, so T deduces to a plain value type. For a T& or const T& parameter, no decay occurs and const is absorbed into T for the non-const form. For a T&& parameter in a deduced context, the forwarding-reference rule applies and T deduces to an lvalue reference for lvalue arguments. Deduction never performs conversions, which is why a single template parameter appearing in two positions rejects arguments of different types even when one converts to the other.",
        codeExample: `template <class T> void by_value(T x);
template <class T> void by_ref(T& x);
template <class T> void by_cref(const T& x);

int          i  = 0;
const int    ci = 0;
int          arr[10];
const char*  s  = "hi";

by_value(ci);      // T = int        (const stripped)
by_value(arr);     // T = int*       (array decays)
by_value("lit");   // T = const char*(array decays)

by_ref(i);         // T = int        -> int&
by_ref(ci);        // T = const int  -> const int&
by_ref(arr);       // T = int[10]    -> int(&)[10]  NO decay

by_cref(i);        // T = int
by_cref(ci);       // T = int        (const is in the parameter)

// Deduction does NOT convert:
template <class T> T larger(T a, T b) { return a > b ? a : b; }
// larger(1, 2.0);          // ERROR: T deduces int and double
larger<double>(1, 2.0);     // explicit: both convert to double
larger(1.0, 2.0);           // fine

// Array size can be captured, which decay would have lost:
template <class T, std::size_t N>
constexpr std::size_t count(T (&)[N]) { return N; }
static_assert(count(arr) == 10);

// Non-deduced contexts need explicit arguments:
template <class T> void f(typename std::vector<T>::iterator it);
// f(v.begin());            // ERROR: T is not deducible from a nested name`,
        diagram: asciiDiagram(`Deduction: pattern matching, not conversion

  template <class T> void f(PARAM);     call: f(ARG)

  ┌──────────────┬──────────────┬──────────────┬─────────────────────┐
  │ PARAM form   │ ARG          │ T deduced    │ parameter type      │
  ├──────────────┼──────────────┼──────────────┼─────────────────────┤
  │ T            │ int          │ int          │ int                 │
  │ T            │ const int&   │ int          │ int   (cv stripped) │
  │ T            │ int[10]      │ int*         │ int*  (decays)      │
  │ T&           │ int          │ int          │ int&                │
  │ T&           │ const int    │ const int    │ const int&          │
  │ T&           │ int[10]      │ int[10]      │ int(&)[10] no decay │
  │ const T&     │ const int    │ int          │ const int&          │
  │ T&&          │ int lvalue   │ int&         │ int&  ← collapsing  │
  │ T&&          │ int rvalue   │ int          │ int&&               │
  │ T*           │ int*         │ int          │ int*                │
  └──────────────┴──────────────┴──────────────┴─────────────────────┘

  Why f(1, 2.0) fails for template<class T> f(T, T)
  ┌────────────────────────────────────────────────────────┐
  │  arg 1   : int     ──▶ deduce T = int                  │
  │  arg 2.0 : double  ──▶ deduce T = double               │
  │                            │                           │
  │                            ▼                           │
  │            CONFLICT: T cannot be both                  │
  │            deduction FAILS - no conversion is tried    │
  │                                                        │
  │  Fixes: f<double>(1, 2.0)   explicit                   │
  │         template<class A, class B> f(A, B)             │
  │         f(double{1}, 2.0)   convert at the call        │
  └────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Instantiation and the Header Rule",
        content:
          "A template definition generates no code. The compiler produces a function body only when the template is instantiated with concrete arguments, which happens at the point of use. Because instantiation needs the full definition, and because the point of use is typically in another translation unit, template definitions must be visible wherever they are used - which is why they live in headers rather than in .cpp files. The linker then deduplicates the identical instantiations emitted by every translation unit. The alternative, explicit instantiation, lets you define a template in a source file and name the instantiations you want, which keeps the definition private and cuts compile time at the cost of enumerating the supported types.",
        codeExample: `// widget.hpp - definition must be visible to callers
template <class T>
T clamp_to(T value, T lo, T hi) {
    return value < lo ? lo : (hi < value ? hi : value);
}
// Used in a.cpp and b.cpp with T = int: both emit the same weak symbol,
// and the linker keeps one.

// Explicit instantiation: definition stays in the .cpp
// matrix.hpp
template <class T> class Matrix {
public:
    void multiply(const Matrix& other);   // declared only
};
extern template class Matrix<float>;      // "do not instantiate here"
extern template class Matrix<double>;

// matrix.cpp
template <class T> void Matrix<T>::multiply(const Matrix& other) { /*...*/ }
template class Matrix<float>;             // emit these two, and only these
template class Matrix<double>;
// Matrix<int> now fails to LINK, which is the intended restriction.

// Instantiation is lazy per member: an unused member is never checked.
template <class T> struct Lazy {
    void ok()      { T{}.exists(); }
    void unusable(){ T{}.does_not_exist(); }   // never compiled unless called
};
Lazy<int> l;
l.ok();            // instantiates ok() only - and would fail, since int has
                   // no exists(); but unusable() is never even looked at

// The classic link error this explains:
// template <class T> void f(T);   in f.cpp
// int main(){ f(1); }             in main.cpp  -> undefined reference to f<int>`,
        diagram: asciiDiagram(`Instantiation: where code actually comes from

  vector.hpp                      a.cpp                    b.cpp
  ┌──────────────────┐     ┌──────────────────┐   ┌──────────────────┐
  │ template<class T>│────▶│ #include         │   │ #include         │
  │ T clamp(T,T,T){  │     │ clamp(1,0,9);    │   │ clamp(1.0,0.,9.);│
  │   ...            │     │ clamp(2,0,9);    │   │ clamp(2,0,9);    │
  │ }                │     └────────┬─────────┘   └────────┬─────────┘
  │ NO CODE EMITTED  │              │                      │
  └──────────────────┘              ▼                      ▼
                          ┌──────────────────┐   ┌──────────────────┐
                          │ a.o              │   │ b.o              │
                          │  clamp<int>  (W) │   │  clamp<double>(W)│
                          └────────┬─────────┘   │  clamp<int>   (W)│
                                   │             └────────┬─────────┘
                                   └──────────┬───────────┘
                                              ▼
                                   ┌──────────────────────┐
                                   │ linker: (W) = weak   │
                                   │ keeps ONE clamp<int> │
                                   │ keeps clamp<double>  │
                                   └──────────────────────┘

  Lazy member instantiation inside a class template
  ┌─────────────────────────────────────────────────────────┐
  │ Stack<NoPrint> s;      ──▶ instantiates the CLASS only  │
  │   ├── push()   used    ──▶ instantiated, compiled       │
  │   ├── top()    unused  ──▶ never compiled               │
  │   └── print()  unused  ──▶ never compiled               │
  │                            (would fail: no operator<<)  │
  │                                                         │
  │ s.print();             ──▶ NOW it is instantiated       │
  │                            NOW it fails to compile      │
  └─────────────────────────────────────────────────────────┘
  This is exactly how std::vector<T> can declare operations
  that only some element types support.`)
      },
      {
        title: "Class Templates and Member Instantiation",
        content:
          "A class template instantiates its members lazily: naming the class instantiates only its declaration, and each member function is instantiated only when it is actually used. This is why a class template can contain a member that would not compile for a given T, as long as nobody calls it - a property std::vector relies on, since vector<T> declares operations that require T to be default-constructible or comparable but only requires those properties when you use them. Member function templates add a second level: a template member of a class template has two independent parameter sets, which is how a container can convert between element types. Inside a class template, the injected class name lets you write the bare name to mean the current instantiation.",
        codeExample: `template <class T>
class Stack {
    std::vector<T> data_;
public:
    void push(T v)        { data_.push_back(std::move(v)); }
    T&   top()            { return data_.back(); }
    void print() const    { for (auto& e : data_) std::cout << e; }
    // requires operator<< only if print() is CALLED

    // Member template: two independent parameter sets.
    template <class U>
    Stack(const Stack<U>& other) {
        data_.assign(other.begin(), other.end());   // U must convert to T
    }

    Stack copy() const { return *this; }   // 'Stack' = Stack<T>: injected name
};

struct NoPrint {};
Stack<NoPrint> s;
s.push(NoPrint{});      // fine - print() was never instantiated
// s.print();           // only NOW does it fail to compile

// Members of a class template are dependent - you must say 'typename'
// for dependent types and 'template' for dependent templates:
template <class C>
void walk(C& c) {
    typename C::iterator it = c.begin();       // typename required
    // c.template get<0>();                    // template keyword required
}

// Static members are per-instantiation:
template <class T> struct Counter { static inline int n = 0; };
Counter<int>::n    = 5;
Counter<double>::n = 7;    // completely separate objects`
      },
      {
        title: "Two-Phase Lookup and Dependent Names",
        content:
          "Compilers check a template twice. In phase one, at definition time, everything that does not depend on a template parameter is parsed and checked, so syntax errors and misuse of non-dependent names are caught even if the template is never instantiated. In phase two, at instantiation, dependent names are looked up with the concrete arguments known. Two consequences trip people up. A name inside a dependent base class is not found by unqualified lookup, because at phase one the compiler does not know the base, so you must write this->name or qualify it. And a dependent qualified name that denotes a type must be prefixed with typename, and one that denotes a template with template, because the compiler cannot otherwise tell a type from a value at phase one.",
        codeExample: `template <class T>
struct Base { void helper(); using value_type = T; };

template <class T>
struct Derived : Base<T> {
    void use() {
        // helper();          // ERROR: not found - Base<T> is dependent
        this->helper();       // OK: defers lookup to phase two
        Base<T>::helper();    // also OK
    }
    // using typename Base<T>::value_type;   // or import it once
};

// typename for dependent type names:
template <class C>
void f(C& c) {
    typename C::value_type v{};        // without typename: parsed as a value
    typename C::iterator it = c.begin();
}
// C++20 relaxed this in many contexts, but the rule still applies broadly.

// 'template' for dependent member templates:
template <class T>
void g(T& t) {
    t.template get<0>();     // without 'template', < is parsed as less-than
}

// Phase one still catches non-dependent errors:
template <class T>
void broken() {
    undeclared_function();   // ERROR at definition time, even if never called
    T{}.anything();          // dependent: deferred to phase two
}

// Which is why an uninstantiated template is only PARTLY checked -
// the source of "it compiled until someone used it" bugs.`
      },
      {
        title: "Default Arguments, Non-Type Parameters, and CTAD",
        content:
          "Template parameters are not limited to types. A non-type template parameter carries a compile-time value - historically integers, enums, and pointers, and since C++20 also floating point and literal class types - which is how std::array encodes its size in the type and how compile-time dimensions become zero-cost. Default template arguments let a container name its allocator or comparator once, which is why std::map has four parameters but is usually written with two. Class template argument deduction, added in C++17, lets you write std::vector v{1, 2, 3} and have the element type deduced from the constructor arguments, using implicit deduction guides generated from the constructors plus any explicit guides the author wrote.",
        codeExample: `// Non-type parameters make sizes part of the type:
template <class T, std::size_t N>
struct FixedBuffer {
    T data[N];
    static constexpr std::size_t size() { return N; }   // zero-cost
};
FixedBuffer<int, 8> b;
static_assert(b.size() == 8);
static_assert(sizeof(b) == 8 * sizeof(int));   // no size member stored

// C++20 allows literal class types as NTTPs:
struct Version { int major, minor; };
template <Version V> struct Api { static constexpr int m = V.major; };
static_assert(Api<Version{2, 1}>::m == 2);

// Default arguments keep common uses short:
template <class T,
          class Compare = std::less<T>,
          class Alloc   = std::allocator<T>>
class SortedSet { /* ... */ };
SortedSet<int> s;                              // uses both defaults
SortedSet<int, std::greater<int>> descending;

// CTAD (C++17): deduce class template arguments from the constructor.
std::vector v{1, 2, 3};              // std::vector<int>
std::pair   p{1, 2.5};               // std::pair<int, double>
std::lock_guard lk{some_mutex};      // std::lock_guard<std::mutex>

// Explicit deduction guides when the implicit ones are wrong:
template <class T>
struct Wrapper {
    T value;
    template <class U> Wrapper(U&& u) : value{std::forward<U>(u)} {}
};
template <class U> Wrapper(U&&) -> Wrapper<std::decay_t<U>>;
//                                          ^^^^^^^ strips the reference,
// without which Wrapper{lvalue} would deduce Wrapper<int&>`
      }
    ],
    examples: [
      {
        title: "Deduction rejecting a mixed-type call",
        input: "template <class T> T max_of(T a, T b); called as max_of(1, 2.0).",
        output: "A compile error stating that deduction produced conflicting types int and double for T.",
        explanation:
          "Step 1: Deduction processes each argument independently against the corresponding parameter pattern, so the first argument deduces T as int and the second deduces T as double.\nStep 2: Because a single template parameter cannot have two values, deduction fails, and the failure occurs before any conversion is considered.\nStep 3: This is deliberate - deduction is pattern matching, and allowing conversions would make it ambiguous which type to pick and would silently choose a lossy one.\nStep 4: Three fixes exist with different meanings: specifying max_of<double>(1, 2.0) skips deduction and converts both arguments, giving two parameters A and B with a common_type return handles mixed types generically, and converting at the call site makes the intent explicit.\nStep 5: The same rule explains why std::min(0, someSize) fails when someSize is a std::size_t, which is one of the most frequently encountered template errors in everyday code."
      },
      {
        title: "Undefined reference from a template defined in a .cpp",
        input: "template <class T> void process(T) defined in process.cpp and called with an int from main.cpp.",
        output: "The build compiles cleanly and then fails at link time with an undefined reference to process<int>.",
        explanation:
          "Step 1: A template definition emits no code by itself, so compiling process.cpp produces an object file containing nothing for process.\nStep 2: In main.cpp only the declaration is visible, so the compiler records a call to process<int> and emits an external reference for it, assuming some translation unit will provide the body.\nStep 3: No translation unit ever instantiates process<int>, because the only one with the definition never used it with int, so the symbol is never emitted.\nStep 4: The linker therefore reports an undefined reference, which surprises people because both files compiled without error - the failure is structural rather than a typo.\nStep 5: The two fixes are to move the definition into the header so every caller can instantiate it, or to keep it in the .cpp and add an explicit instantiation for each supported type, which is the right choice when the type set is small and closed."
      },
      {
        title: "Unqualified name not found in a dependent base",
        input: "template <class T> struct Derived : Base<T> { void f() { helper(); } }; where helper is a member of Base.",
        output: "A compile error at definition time saying helper was not declared in this scope, on GCC and Clang but not MSVC.",
        explanation:
          "Step 1: During phase one the compiler parses the template body and looks up every non-dependent name, and helper() written unqualified is a non-dependent name.\nStep 2: The base class Base<T> is dependent on the template parameter, so at phase one the compiler does not know what members it has and refuses to search it.\nStep 3: The name is therefore looked up only in the enclosing and global scopes, where it does not exist, producing an error before any instantiation happens.\nStep 4: Writing this->helper() makes the expression dependent, deferring lookup to phase two when T is known and Base<T> is complete; Base<T>::helper() and a using declaration achieve the same thing.\nStep 5: MSVC historically delayed all lookup to phase two, so code written against it fails to compile on conforming compilers, which is why this error is so common when porting - and why /permissive- is worth enabling on MSVC."
      }
    ],
    tips: [
      "Put template definitions in headers, or keep them in a source file and add explicit instantiations for the closed set of types you support.",
      "Inside a class template deriving from a dependent base, always write this-> or a qualified name for inherited members.",
      "Remember that deduction never converts: two arguments matching the same T must have exactly the same type after decay."
    ],
    tricks: [
      "A T (&)[N] parameter captures an array's size at compile time, which a decayed pointer parameter would have thrown away.",
      "extern template in a header plus an explicit instantiation in one source file cuts build times noticeably for heavily used class templates.",
      "Lazy member instantiation means a class template may contain members that would not compile for some T, which is exactly how the standard containers stay usable with restricted element types."
    ],
    memoryAids: [
      "A template is a recipe, not a dish - no code exists until someone orders an instantiation.",
      "Phase one checks what does not depend on T; phase two checks what does. Dependent names need this-> or typename.",
      "Deduction matches patterns and never converts, so one T means one exact type."
    ],
    interviewPatterns: [
      "'Why must template definitions be in headers?' They want instantiation at point of use and the linker's deduplication of weak symbols.",
      "'What does typename mean before a dependent name?' The expected answer is two-phase lookup and the type-versus-value ambiguity at phase one.",
      "Frequency and companies: standard at Bloomberg, Jane Street, Nvidia, and any library-facing role; usually the entry point to a longer templates discussion."
    ],
    practiceProblems: [
      "Why does passing a string literal to template <class T> void f(T) deduce const char* rather than const char[6]? Answer: a by-value parameter applies the same decay rules as function argument passing, so arrays decay to pointers and the size is lost; taking the parameter as T (&arr)[N] instead preserves both the element type and the extent, which is how std::size and array-based overloads work.",
      "What is the difference between explicit instantiation and explicit specialisation? Answer: explicit instantiation asks the compiler to emit the ordinary template's code for a specific argument list, changing only where the code lives; explicit specialisation supplies a completely different definition for that argument list, changing what the code does - the syntax differs by the presence of template<> and a body.",
      "Why is a member function of a class template not compiled until it is used? Answer: because instantiating every member would require every T to satisfy every member's requirements, which would make containers far less usable; lazy instantiation lets vector<T> declare operations needing comparison or default construction while only requiring those properties from types that actually invoke them."
    ],
    faq: [
      {
        question: "Why do template errors look so bad, and how do I read them?",
        answer:
          "Because the error is reported where the template body fails, not where you made the mistake, and the compiler prints the full instantiation stack that led there. A call to std::sort with a comparator that takes its arguments by non-const reference produces an error inside the sort implementation about binding an rvalue, several layers deep, with every intermediate instantiation listed. The technique for reading them is to start at the bottom of the instantiation stack, which is your code, and identify the argument types the compiler actually deduced - they are usually printed in full and are often not what you assumed. Then read the topmost error message, which states the specific requirement that failed, and connect the two. Two habits help enormously. First, use concepts or static_assert to state requirements at the interface, so the error becomes a constraint failure at the call site rather than an instantiation failure inside the body. Second, when stuck, instantiate the template manually with the concrete types in a small test to remove the deduction step from the picture. Tools help too: Clang's diagnostics are markedly better than GCC's for templates, and -fdiagnostics-elide-type or -ftemplate-backtrace-limit control the noise."
      },
      {
        question: "Should I ever define a template in a .cpp file?",
        answer:
          "Yes, when the set of types it will be used with is small and closed, and you use explicit instantiation to say so. The pattern is to declare the class or function template in the header, add extern template declarations naming the instantiations that exist elsewhere, and then in one source file provide the definition followed by explicit instantiation statements for those same types. This buys three things: the definition stays out of the header, so callers do not recompile when it changes; the template is instantiated once rather than in every translation unit, which can dramatically cut build time for something like a Matrix<float> used everywhere; and the supported type set becomes enforced, since any other instantiation fails at link time. The costs are real too. You must maintain the instantiation list, adding a line whenever a new type is needed, and callers lose the ability to use the template with their own types, which is a deal-breaker for a general-purpose library. The rule of thumb is that a genuinely generic utility belongs in a header, while a heavyweight template used with a handful of numeric or domain types is a strong candidate for explicit instantiation. Standard library implementations use this technique themselves, which is why std::string's common instantiations are precompiled into libstdc++."
      },
      {
        question: "What exactly does two-phase lookup buy us?",
        answer:
          "It catches errors early and makes template semantics predictable regardless of what is declared after the template. In phase one, at definition, the compiler resolves every name that does not depend on a template parameter, so a typo in a function name or a misuse of a known type is diagnosed even if the template is never instantiated - a real benefit for library code where some instantiations may not exist until a user writes them. Equally importantly, binding non-dependent names at definition time means the meaning of the template cannot be changed by declarations that appear later in the translation unit, which prevents a whole category of surprising action-at-a-distance. Phase two then resolves dependent names with the concrete arguments known, using both ordinary lookup from the definition context and argument-dependent lookup from the instantiation context, which is what allows a generic swap or begin to find a user's overload. The visible costs are the this-> requirement for members of dependent bases and the typename and template disambiguators, both of which exist because phase one must parse the body without knowing what dependent names denote. MSVC historically implemented a single delayed phase, which accepted non-conforming code and is why porting from MSVC to GCC or Clang surfaces these errors in bulk; /permissive- turns on conforming behaviour."
      },
      {
        question: "How do non-type template parameters differ from ordinary function parameters?",
        answer:
          "The value is part of the type and is known during compilation, which changes what the compiler can do with it. std::array<int, 8> and std::array<int, 16> are unrelated types, so the size needs no storage in the object, bounds are checkable at compile time, loops over the array can be fully unrolled, and the size cannot be changed or corrupted at run time. A function parameter carrying the same number would occupy space, would be invisible to the optimiser unless inlining exposed it, and would allow two arrays of different sizes to share a type. The costs mirror the benefits: every distinct value produces a separate instantiation, so a template parameterised on a size used with fifty sizes generates fifty function bodies, and a value only known at run time cannot be passed at all without a dispatch table. C++20 significantly widened what may be used, adding floating-point types and literal class types with all-public members and constexpr construction, which enables patterns such as compile-time strings and configuration structs as template arguments. The practical guidance is to use a non-type parameter when the value genuinely characterises the type and the set of values is small, and an ordinary parameter otherwise, because binary size and compile time are the price of the specialisation."
      },
      {
        question: "When does CTAD do the wrong thing?",
        answer:
          "Most often when a constructor takes a forwarding reference, because the implicit deduction guide then deduces a reference type that you almost never want. A wrapper whose constructor takes U&& will, given an lvalue, deduce U as an lvalue reference and produce a Wrapper holding a reference to the caller's object, which dangles the moment the caller's object dies. The fix is an explicit deduction guide applying std::decay_t, which is exactly what the standard library does for std::pair and std::tuple. A second common surprise is copy versus wrap: writing std::vector v2{v1} where v1 is a vector deduces a copy rather than a one-element vector of vectors, because the copy constructor's implicit guide wins - this is usually what you want, but it means CTAD is not a reliable way to build nested containers. A third is that CTAD applies only when no template argument list is given at all, so std::vector<> v{1,2} is an error rather than a request to deduce. And it does not apply to aliases in C++17, although C++20 added alias template deduction. The general guidance is that CTAD is excellent for lock_guard, pair, tuple, and array where the intent is unambiguous, and that any class template you write with a forwarding-reference constructor should ship an explicit guide."
      },
      {
        question: "How do templates affect binary size and compile time, and what can I do?",
        answer:
          "Each distinct instantiation is separate code, so the cost scales with the number of argument combinations rather than with the number of templates written, and it shows up in three places: compile time, because every translation unit instantiates what it uses; link time, because the linker must deduplicate identical weak symbols across objects; and binary size, because distinct instantiations are genuinely distinct code. Several techniques reduce it. The most effective is to hoist type-independent logic out of the template into an ordinary function, leaving a thin type-safe wrapper - the classic example is a container of pointers implemented once for void* with a typed facade, which is how several standard library implementations avoid emitting the same code for every pointer type. Explicit instantiation with extern template moves the cost to one translation unit for heavily used instantiations. Reducing the number of distinct arguments helps directly, for instance by taking std::span<const T> rather than templating on the container type. On the build side, precompiled headers and, in C++20, modules address the parsing cost rather than the instantiation cost, and tools such as ClangBuildAnalyzer or -ftime-trace identify which templates actually dominate. The important discipline is to measure first, since intuition about which templates are expensive is usually wrong."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "David Vandevoorde, Nicolai Josuttis and Douglas Gregor - C++ Templates: The Complete Guide, 2nd edition",
        insight: "Definitive treatment of deduction, instantiation, two-phase lookup, and explicit instantiation."
      },
      {
        source: "note",
        attribution: "cppreference - Template argument deduction and Class template argument deduction",
        insight: "Precise deduction rules including decay, non-deduced contexts, and CTAD guide generation."
      },
      {
        source: "blog",
        attribution: "Arthur O'Dwyer - Dependent names, two-phase lookup, and CTAD pitfalls",
        insight: "Practical explanations of typename/template disambiguation and where CTAD deduces references."
      }
    ]
  },
  {
    id: "topic-cpp-templates-specialisation",
    moduleId: "mod-cpp-templates-and-generic-programming",
    title: "Specialisation, Partial Specialisation, and Overload Resolution",
    intuition:
      "Specialisation is how a generic template gets a different implementation for particular arguments - a bitset-backed vector<bool>, a memcpy-based copy for trivial types, a type trait that answers differently for pointers. The rules divide sharply: class templates support both full and partial specialisation, function templates support only full specialisation and are usually better served by overloading. Knowing which mechanism applies, and how specialisations interact with overload resolution, is what separates traits code that works from traits code that mysteriously picks the wrong branch.",
    complexity: {
      time:
        "Selecting a specialisation happens entirely at compile time and adds nothing at run time; the chosen body runs at full speed with no dispatch. The payoff is often algorithmic - specialising a copy loop to memcpy for trivially copyable types turns a per-element loop into a single vectorised block move, typically five to twenty times faster for large arrays.",
      space:
        "Each specialisation is separate code, so heavy specialisation increases binary size the same way ordinary instantiation does. A specialisation may also change an object's layout entirely, as std::vector<bool> does by packing eight elements per byte, which is an eightfold space win bought with a proxy reference and considerable surprise."
    },
    lesson: [
      {
        title: "Full Specialisation",
        content:
          "A full specialisation supplies a complete alternative definition for one specific set of template arguments, written with template<> and the arguments spelled out. It replaces the primary template entirely for that argument list, so it shares nothing with it - not members, not defaults, not base classes - and may have a completely different interface, which is both its power and its danger. Full specialisation works for class templates, function templates, and variable templates. It must appear before the first use that would otherwise instantiate the primary template, or the program is ill-formed with no diagnostic required, which is a real source of one-translation-unit-differs bugs.",
        codeExample: `// Primary template
template <class T>
struct Serializer {
    static std::string to_string(const T& v) { return std::to_string(v); }
};

// Full specialisation: entirely separate definition
template <>
struct Serializer<std::string> {
    static std::string to_string(const std::string& v) { return "\\"" + v + "\\""; }
    static constexpr bool quoted = true;     // a member the primary lacks
};

template <>
struct Serializer<bool> {
    static std::string to_string(bool v) { return v ? "true" : "false"; }
};

Serializer<int>::to_string(42);          // "42"     - primary
Serializer<bool>::to_string(true);       // "true"   - specialisation
// Serializer<int>::quoted;              // ERROR: primary has no such member

// Variable template specialisation:
template <class T> constexpr bool is_pod_like = false;
template <> constexpr bool is_pod_like<int>   = true;
template <> constexpr bool is_pod_like<float> = true;

// Function template full specialisation - legal but usually the wrong tool:
template <class T> void log(T v)      { std::cout << v; }
template <>        void log<bool>(bool v) { std::cout << (v ? "T" : "F"); }

// ORDER MATTERS: this is ill-formed, no diagnostic required.
// Serializer<char> a;                  // implicitly instantiates the primary
// template <> struct Serializer<char>{};  // too late`,
        diagram: asciiDiagram(`Which definition wins, and in what order

  Given:
    template <class T>          struct S;        (A) primary
    template <class T>          struct S<T*>;    (B) partial: pointers
    template <class T, class U> struct S<T(U)>;  (C) partial: functions
    template <>                 struct S<int>;   (D) full: exactly int

  Selection algorithm
  ┌──────────────────────────────────────────────────────────┐
  │ 1. Is there a FULL specialisation matching exactly?       │
  │       yes ──▶ use it. Done.                              │
  │       no  ──▶ continue                                    │
  │ 2. Collect all PARTIAL specialisations that match.        │
  │       none  ──▶ use the primary                          │
  │       one   ──▶ use it                                    │
  │       many  ──▶ pick the MOST SPECIALISED by partial      │
  │                 ordering; ambiguous ⇒ compile error       │
  └──────────────────────────────────────────────────────────┘

  Worked examples
  ┌──────────────┬───────────────────────────┬──────────────┐
  │ S<int>       │ full match (D)            │ D            │
  │ S<double>    │ no partial matches        │ A (primary)  │
  │ S<char*>     │ (B) matches, T = char     │ B            │
  │ S<int*>      │ (B) matches, T = int      │ B  ← NOT D:  │
  │              │ D is S<int>, not S<int*>  │              │
  │ S<void(int)> │ (C) matches               │ C            │
  └──────────────┴───────────────────────────┴──────────────┘

  Function templates are DIFFERENT
  ┌──────────────────────────────────────────────────────────┐
  │ template<class T> void f(T);      ← base template        │
  │ template<> void f<int*>(int*);    ← specialises the BASE │
  │ template<class T> void f(T*);     ← a NEW OVERLOAD       │
  │                                                          │
  │ f(p) where p is int*                                     │
  │   1. overload resolution picks the best BASE TEMPLATE    │
  │      → f(T*) is more specialised → chosen                │
  │   2. THEN specialisations of THAT template are consulted │
  │      → f<int*>(int*) specialises f(T), not f(T*)         │
  │      → it is NEVER used                                  │
  │                                                          │
  │ This is why the rule is: overload, do not specialise.    │
  └──────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Partial Specialisation",
        content:
          "Partial specialisation applies to a pattern rather than to one exact argument list - all pointers, all references, all instantiations of some other template, all function types. It is available only for class templates and variable templates, never for function templates, which is the single most consequential asymmetry in the whole area. The syntax keeps template<...> with parameters and adds a specialised argument list after the class name. When several partial specialisations match, the compiler ranks them by partial ordering and picks the most specialised; if two are equally specialised the program is ambiguous and fails to compile. Essentially every type trait in the standard library is built from partial specialisation.",
        codeExample: `template <class T>          struct Traits            { static constexpr int rank = 0; };
template <class T>          struct Traits<T*>        { static constexpr int rank = 1; };
template <class T>          struct Traits<T&>        { static constexpr int rank = 2; };
template <class T, size_t N>struct Traits<T[N]>      { static constexpr int rank = 3; };
template <class R, class...A>struct Traits<R(A...)>  { static constexpr int rank = 4; };
template <class T>          struct Traits<const T>   { static constexpr int rank = 5; };

static_assert(Traits<int>::rank        == 0);
static_assert(Traits<int*>::rank       == 1);
static_assert(Traits<int&>::rank       == 2);
static_assert(Traits<int[4]>::rank     == 3);
static_assert(Traits<void(int)>::rank  == 4);
static_assert(Traits<const int>::rank  == 5);

// How the standard traits are actually built:
template <class T> struct remove_pointer            { using type = T; };
template <class T> struct remove_pointer<T*>        { using type = T; };
template <class T> struct remove_pointer<T* const>  { using type = T; };

template <class T>          struct is_array       : std::false_type {};
template <class T>          struct is_array<T[]>  : std::true_type  {};
template <class T, size_t N>struct is_array<T[N]> : std::true_type  {};

// Matching another template - the basis of tuple/variant machinery:
template <class T>            struct is_vector             : std::false_type {};
template <class T, class A>   struct is_vector<std::vector<T,A>> : std::true_type {};
static_assert(is_vector<std::vector<int>>::value);

// Ambiguity is a hard error:
template <class A, class B> struct P {};
template <class A>          struct P<A, int> {};
template <class B>          struct P<int, B> {};
// P<int, int> p;      // ERROR: neither specialisation is more specialised

// Partial specialisation of a FUNCTION template does not exist:
// template <class T> void f(T);
// template <class T> void f<T*>(T*);   // ILL-FORMED`
      },
      {
        title: "Why Function Templates Use Overloading Instead",
        content:
          "Function templates cannot be partially specialised, and their full specialisations interact with overload resolution in a way that surprises almost everyone. Overload resolution first selects the best base template among all candidates, and only then consults specialisations of that particular template. So if you write a general f(T) plus a specialisation f<int*>(int*), and separately an overload f(T*), a call with an int* selects the f(T*) overload as the better base template, and the specialisation - which belongs to f(T) - is never considered. The rule that avoids the entire problem is Herb Sutter's: do not specialise function templates, overload them. Overloads participate normally in resolution, support the pattern matching that partial specialisation would have given you, and behave predictably when new ones are added.",
        codeExample: `// The trap, in full.
template <class T> void handle(T)      { std::puts("general"); }   // (1)
template <>        void handle<int*>(int*) { std::puts("int* spec"); }  // (2)
template <class T> void handle(T*)     { std::puts("pointer"); }   // (3)

int* p = nullptr;
handle(p);
// Step 1: best base template among (1) and (3) -> (3), more specialised
// Step 2: specialisations of (3)? none. (2) specialises (1).
// Output: "pointer"  -- (2) is dead code.

// Reorder the declarations and the answer can change, which is why this
// is considered a defect in practice even though it is well-defined.

// The correct approach: overload only.
template <class T> void emit(T v)        { std::cout << v; }
template <class T> void emit(T* p)       { std::cout << "ptr:" << (void*)p; }
                   void emit(bool b)     { std::cout << (b ? "T" : "F"); }
                   void emit(const char* s) { std::cout << s; }
// Ordinary functions beat templates on equal footing, and more specialised
// templates beat less specialised ones - all predictable.

// When you truly need pattern matching on a function, delegate to a class:
template <class T> struct Impl { static void run(T v) { /* general */ } };
template <class T> struct Impl<T*> { static void run(T* p) { /* pointer */ } };
template <class T> void dispatch(T v) { Impl<T>::run(v); }
// Class templates DO support partial specialisation, so this works.

// C++20 alternative: constrain the overloads with concepts.
template <class T> void modern(T v) { /* general */ }
template <std::integral T> void modern(T v) { /* integers */ }
// The constrained overload is preferred when it applies.`
      },
      {
        title: "Tag Dispatch and if constexpr",
        content:
          "Before concepts, the standard way to select an implementation by type property was tag dispatch: compute a small empty tag type from a trait and let ordinary overload resolution pick the matching overload. This is exactly how std::advance chooses between incrementing n times for a forward iterator and adding n for a random-access one, and it is still the mechanism inside most standard library implementations. It scales cleanly, produces good error messages, and works in every standard from C++98. Since C++17, if constexpr often replaces it for simple cases by discarding the untaken branch at compile time, so a single function body can contain mutually incompatible code paths. Tag dispatch remains better when the branches are large, when they belong in different headers, or when you want the overload set to be extensible by users.",
        codeExample: `// Tag dispatch, as std::advance really does it:
template <class It, class Distance>
void advance_impl(It& it, Distance n, std::random_access_iterator_tag) {
    it += n;                                  // O(1)
}
template <class It, class Distance>
void advance_impl(It& it, Distance n, std::bidirectional_iterator_tag) {
    for (; n > 0; --n) ++it;                  // O(n), can go backwards
    for (; n < 0; ++n) --it;
}
template <class It, class Distance>
void advance_impl(It& it, Distance n, std::input_iterator_tag) {
    for (; n > 0; --n) ++it;                  // O(n), forward only
}
template <class It, class Distance>
void advance(It& it, Distance n) {
    advance_impl(it, n,
        typename std::iterator_traits<It>::iterator_category{});
}

// if constexpr: one function, branches discarded at compile time.
template <class T>
std::string describe(const T& v) {
    if constexpr (std::is_pointer_v<T>) {
        return v ? describe(*v) : "null";     // only compiled for pointers
    } else if constexpr (std::is_arithmetic_v<T>) {
        return std::to_string(v);             // only for numbers
    } else if constexpr (requires { v.to_string(); }) {   // C++20
        return v.to_string();
    } else {
        return "opaque";
    }
}
// describe(42) never compiles the *v branch, so a non-dereferenceable
// type is fine - this is what makes if constexpr different from if.

// Optimised copy selected by a trait:
template <class T>
void copy_range(const T* src, T* dst, std::size_t n) {
    if constexpr (std::is_trivially_copyable_v<T>) {
        std::memcpy(dst, src, n * sizeof(T));         // vectorised
    } else {
        for (std::size_t i = 0; i < n; ++i) new (dst + i) T(src[i]);
    }
}`
      },
      {
        title: "Specialising Standard Library Templates",
        content:
          "You are permitted to specialise a standard library class template for your own types, and two specialisations are routine: std::hash so your type works as an unordered_map key, and std::formatter for std::format. The rules are strict. The specialisation must be in namespace std, must depend on at least one program-defined type, and must satisfy all the requirements the standard states for that template - a std::hash specialisation must be default-constructible, must not throw, and must return size_t. You may not add new declarations to namespace std or specialise a function template there. The alternative, and the better default for your own libraries, is to make the customisation point a function found by argument-dependent lookup, which is why modern designs prefer hidden friends and customisation point objects.",
        codeExample: `struct Point { int x, y; bool operator==(const Point&) const = default; };

// Permitted: specialise std::hash for a program-defined type.
template <>
struct std::hash<Point> {
    std::size_t operator()(const Point& p) const noexcept {
        std::size_t h = std::hash<int>{}(p.x);
        h ^= std::hash<int>{}(p.y) + 0x9e3779b9 + (h << 6) + (h >> 2);
        return h;                              // boost::hash_combine mixing
    }
};
std::unordered_map<Point, int> grid;           // now works

// Permitted: std::formatter for std::format (C++20).
template <>
struct std::formatter<Point> : std::formatter<std::string> {
    auto format(const Point& p, auto& ctx) const {
        return std::formatter<std::string>::format(
            std::format("({}, {})", p.x, p.y), ctx);
    }
};

// NOT permitted:
// namespace std { void my_helper(); }             // adding declarations
// template <> void std::swap<Point>(Point&, Point&) {}  // function template

// The ADL alternative for your own customisation points:
namespace geo {
    struct Vec { double x, y; };
    // Hidden friend: found by ADL, invisible to unqualified lookup elsewhere.
    friend double norm(const Vec& v) { return std::hypot(v.x, v.y); }
}
template <class T>
double normalise(const T& v) {
    using geo::norm;             // the two-step: enables ADL plus a default
    return norm(v);
}

// Do not specialise a std template for a type you do not own AND that
// std already handles - that is an ODR violation waiting to happen if
// another translation unit does the same differently.`,
        diagram: asciiDiagram(`Tag dispatch: how std::advance gets its complexity

  iterator_traits<It>::iterator_category
                    │
                    ▼
  ┌─────────────────────────────────────────────────────┐
  │            tag inheritance hierarchy                │
  │                                                     │
  │   input_iterator_tag                                │
  │        ▲                                            │
  │        │                                            │
  │   forward_iterator_tag                              │
  │        ▲                                            │
  │        │                                            │
  │   bidirectional_iterator_tag                        │
  │        ▲                                            │
  │        │                                            │
  │   random_access_iterator_tag                        │
  │        ▲                                            │
  │        │                                            │
  │   contiguous_iterator_tag        (C++20)            │
  └─────────────────────────────────────────────────────┘
       Derived tags CONVERT to base tags, so an exact
       overload wins and otherwise the nearest base does.

  advance(it, n)
        │  constructs a tag value, passes it as an extra arg
        ▼
  ┌──────────────────────────────────────────────────────────┐
  │ overload resolution on the TAG parameter                 │
  ├───────────────────────┬──────────────────────────────────┤
  │ vector<int>::iterator │ random_access_iterator_tag       │
  │                       │   └──▶  it += n        O(1)      │
  ├───────────────────────┼──────────────────────────────────┤
  │ list<int>::iterator   │ bidirectional_iterator_tag       │
  │                       │   └──▶  loop ++/--     O(n)      │
  ├───────────────────────┼──────────────────────────────────┤
  │ istream_iterator      │ input_iterator_tag               │
  │                       │   └──▶  loop ++ only   O(n)      │
  └───────────────────────┴──────────────────────────────────┘

  Resolved entirely at COMPILE TIME: no branch, no indirection,
  no tag object survives into the generated code.`)
      }
    ],
    examples: [
      {
        title: "A function template specialisation that is never called",
        input: "template <class T> void f(T); template <> void f<int*>(int*); template <class T> void f(T*); then f(some_int_pointer).",
        output: "The f(T*) overload runs; the explicit specialisation is dead code that no call can reach.",
        explanation:
          "Step 1: Overload resolution considers only the base templates f(T) and f(T*), because specialisations are not independent candidates.\nStep 2: Partial ordering ranks f(T*) as more specialised than f(T) for a pointer argument, so f(T*) is selected as the winning base template.\nStep 3: The compiler then looks for specialisations of the selected template, and the only specialisation in the program belongs to f(T), not to f(T*).\nStep 4: The specialisation is therefore never used for any call, even though it compiles cleanly and looks correct, and moving the declaration of f(T*) above it changes nothing about the outcome.\nStep 5: Replacing the specialisation with a plain overload void f(int*) makes the behaviour immediate and obvious, which is the concrete reason behind the guidance to overload function templates rather than specialise them."
      },
      {
        title: "std::advance choosing O(1) or O(n)",
        input: "std::advance(it, 1000) called once with a std::vector iterator and once with a std::list iterator.",
        output: "The vector case performs a single pointer addition; the list case performs one thousand increments.",
        explanation:
          "Step 1: iterator_traits exposes an iterator_category typedef, which is an empty tag type naming the iterator's capability level.\nStep 2: advance constructs a value of that tag type and passes it as an extra argument to an overload set of implementation functions.\nStep 3: Ordinary overload resolution then selects the implementation whose tag parameter matches, with tag inheritance meaning a random_access_iterator_tag also converts to the weaker tags if no exact match existed.\nStep 4: The vector iterator's tag is random_access_iterator_tag, selecting the it += n body, while the list iterator's is bidirectional_iterator_tag, selecting the loop.\nStep 5: All of this is resolved at compile time with no branch and no indirection in the generated code, which is why generic C++ algorithms can match hand-written type-specific code - and it is the canonical demonstration of why tag dispatch was invented."
      },
      {
        title: "A specialisation declared too late",
        input: "A header uses Serializer<char> in an inline function, and a later header declares template <> struct Serializer<char>.",
        output: "One translation unit uses the primary template and another uses the specialisation, producing an ODR violation with no diagnostic.",
        explanation:
          "Step 1: A specialisation must be declared before the first use that would cause the primary template to be implicitly instantiated for those arguments.\nStep 2: In the translation unit that includes only the first header, Serializer<char> is instantiated from the primary template and that instantiation is baked into the emitted code.\nStep 3: In a translation unit that includes both headers in the other order, the specialisation is visible first and is used instead, producing different code for the same symbol.\nStep 4: The standard calls this ill-formed with no diagnostic required, so neither compiler nor linker is obliged to complain, and the two definitions are silently merged by the linker with one arbitrarily winning.\nStep 5: The symptom is behaviour that changes with include order, link order, or optimisation level, and the fix is to declare every specialisation immediately after the primary template in the same header, which is why standard library specialisations are always co-located with their primaries."
      }
    ],
    tips: [
      "Overload function templates rather than specialising them; specialisations of function templates interact with overload resolution in ways that make them unreachable.",
      "Declare every specialisation in the same header as its primary template, before any use, or you invite an order-dependent ODR violation.",
      "When you need pattern matching on a function's arguments, delegate to a class template, which does support partial specialisation."
    ],
    tricks: [
      "Deriving a trait from std::true_type or std::false_type gives you value, value_type, and an implicit conversion for free, which is why every standard trait does it.",
      "if constexpr replaces most simple tag dispatch, but tag dispatch still wins when the branches are large or when users must be able to extend the overload set.",
      "A partial specialisation matching std::vector<T, A> is how you write is_specialisation_of, the building block for most container-aware generic code."
    ],
    memoryAids: [
      "Classes get partial specialisation, functions get overloads - the asymmetry drives every design decision here.",
      "Full specialisation replaces everything: it shares no members with the primary template.",
      "Specialise before you instantiate, or the two translation units disagree and nobody warns you."
    ],
    interviewPatterns: [
      "'Can you partially specialise a function template?' The expected answer is no, plus the overload alternative and the class-template delegation trick.",
      "'How does std::advance achieve different complexity for different iterators?' They want iterator_traits, tag dispatch, and the compile-time resolution.",
      "Frequency and companies: common at Bloomberg, Nvidia, Jane Street, and library teams; often paired with writing a small type trait on the spot."
    ],
    practiceProblems: [
      "Write a trait that detects whether a type is a specialisation of std::vector. Answer: declare a primary template inheriting false_type, then partially specialise it for std::vector<T, A> inheriting true_type; the partial specialisation is what performs the pattern match, and generalising the pattern to template <class...> class C gives the reusable is_specialisation_of.",
      "Why does the standard forbid specialising a std template for a type you do not own? Answer: because two libraries could each provide a different specialisation for the same arguments, and since specialisations are not overloads the linker silently keeps one, producing an ODR violation whose symptoms depend on link order; requiring a program-defined type in the arguments guarantees at most one owner.",
      "Given three partial specialisations that all match a particular instantiation, how does the compiler choose? Answer: it applies partial ordering, essentially asking for each pair whether one specialisation's pattern could be deduced from the other's but not vice versa, and picks the uniquely most specialised; if no single winner exists the program is ill-formed with an ambiguity error rather than an arbitrary choice."
    ],
    faq: [
      {
        question: "Why can class templates be partially specialised but not function templates?",
        answer:
          "Because function templates already have a mechanism that does the same job - overloading - and adding partial specialisation on top would create two interacting selection systems with no clear precedence. Overload resolution already performs pattern matching across candidates and already has partial ordering rules to rank one function template as more specialised than another, so a partial specialisation of a function template would need to be ranked against the overloads too, and it is not obvious what the answer should be. The committee's position, reflected in the standard and in Herb Sutter's well-known guidance, is that overloading is the intended tool and gives strictly more predictable results, since overloads participate in resolution as first-class candidates and can be added by users in their own namespaces. Class templates have no overloading, so specialisation is the only mechanism available to them, and both full and partial forms exist. The practical consequence is a well-known idiom: when you genuinely need pattern matching that only partial specialisation can express, put the logic in a class template with partial specialisations and give it a thin function template wrapper that delegates. This is how many standard library facilities are built, and it costs nothing at run time because the wrapper inlines away."
      },
      {
        question: "What is the real difference between an overload and a specialisation?",
        answer:
          "An overload is an independent function that participates in overload resolution as a candidate; a specialisation is not a candidate at all, but rather an alternative body for a template that resolution has already chosen. That distinction explains every surprising behaviour in this area. When you call a function with several templates and overloads visible, the compiler first performs ordinary overload resolution over the base templates and non-template functions, applying partial ordering to rank templates against each other and preferring non-templates on equal footing. Only after a winner is selected does it look for specialisations of that specific template. So a specialisation of a template that loses resolution is unreachable, no matter how precisely it matches the arguments. It also means adding a new overload can silently change which specialisation is consulted, since it can change which base template wins, and that the declaration order of overloads matters while the order of specialisations relative to overloads does not. For class templates the picture is simpler because there is no overloading: specialisations are ranked directly against each other and the primary, with full beating partial beating primary. Keeping the two models separate in your head is most of what it takes to reason about this correctly."
      },
      {
        question: "When should I use if constexpr instead of tag dispatch or specialisation?",
        answer:
          "Use if constexpr when the alternatives are small, mutually exclusive, and belong together in one function that you control. It reads far better than a scattered overload set, keeps related logic adjacent, requires no tag types or traits classes, and discards the untaken branch entirely so the branches may contain code that would not compile for other types. That last property is the key difference from an ordinary if and is what makes it a genuine replacement for dispatch rather than a run-time cost. It stops being the right tool in three situations. When the branches are large, one function becomes an unreadable ladder and separate overloads are clearer. When the set of cases must be extensible by users - the essential property of a customisation point - if constexpr fails outright, because you cannot add a branch to someone else's function, while an overload set in the right namespace remains open. And when the condition is really a precondition on the interface rather than an implementation detail, a C++20 concept expresses it better, produces a constraint error at the call site instead of an instantiation error inside the body, and participates in overload ordering. A reasonable progression is if constexpr for local decisions, constrained overloads for interface-level ones, and class-template specialisation only for genuine type-level pattern matching such as traits."
      },
      {
        question: "What exactly may I specialise in namespace std?",
        answer:
          "You may specialise a class template or a variable template from the standard library, provided the specialisation depends on at least one program-defined type and you satisfy every requirement the standard imposes on that template. std::hash is the most common case, and its requirements are specific: the specialisation must be default-constructible and copy-constructible, its call operator must accept the key type and return size_t, it must not throw, and equal keys must produce equal hashes. std::formatter for std::format is the second common case, and it requires parse and format members with a particular signature. Other permitted specialisations include std::numeric_limits, std::tuple_size and std::tuple_element for structured-binding support, and the pointer traits templates. What you may not do is add any new declaration to namespace std, specialise a standard function template, or specialise anything for arguments consisting only of standard or built-in types - the last restriction exists because two independent libraries could otherwise supply conflicting specialisations for the same arguments, and since specialisations do not overload, the linker would silently pick one, giving different behaviour depending on link order. For your own libraries the modern advice is to avoid requiring specialisation at all: define your customisation points as functions found by argument-dependent lookup, or as customisation point objects, both of which let users opt in from their own namespaces without touching yours."
      },
      {
        question: "Why must a specialisation be declared before the first use?",
        answer:
          "Because the compiler implicitly instantiates the primary template at the point of first use, and once it has done so for a particular argument list, that instantiation is what the translation unit contains. A specialisation appearing afterwards contradicts a decision that has already been made and baked into the emitted code. The standard makes this ill-formed with no diagnostic required, which is a specific and unpleasant category: compilers are not obliged to detect it, and in practice they usually do not, because detecting it would require tracking every implicit instantiation against every later declaration across the whole translation unit. The failure mode is that one translation unit sees the specialisation before its first use and another does not, so the two emit different definitions for the same symbol; the linker merges them by keeping one arbitrarily, and the program behaves according to whichever the linker happened to choose. Symptoms include behaviour that changes when you reorder includes, add an unrelated header, or change optimisation level, which makes it one of the harder bugs to diagnose from the symptom alone. The prevention is simple and absolute: declare every specialisation in the same header as the primary template, immediately after it, so that no translation unit can ever see one without the other."
      },
      {
        question: "Is std::vector<bool> a good example of specialisation or a cautionary tale?",
        answer:
          "Both, and it is worth knowing why. As a demonstration of the mechanism it is perfect: a full specialisation of vector for bool packs eight elements into each byte, so a million booleans occupy 125 kilobytes instead of a megabyte, which is a genuine and sometimes decisive saving. As a design decision it is widely regarded as a mistake, because the specialisation changes the type's observable interface rather than only its implementation. operator[] cannot return bool& since individual bits are not addressable, so it returns a proxy object instead; that proxy breaks auto& x = v[0], breaks any generic code taking T& to an element, breaks &v[0] as a pointer to contiguous data, and makes vector<bool> fail to satisfy the container requirements that the rest of the standard library assumes. Code that works for every other vector<T> silently fails to compile, or worse compiles differently, for vector<bool>. The lesson generalises well beyond this one case: a specialisation may change how a template works, but changing what it means turns a transparent optimisation into a trap for every generic algorithm that touches it. The practical advice is to use std::bitset for a fixed-size bit set, std::vector<char> or std::vector<uint8_t> when you want an addressable boolean, and vector<bool> only when the space saving is measured and the surrounding code is written knowing what it is."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Vandevoorde, Josuttis and Gregor - C++ Templates: The Complete Guide, chapters on specialisation and overloading",
        insight: "Complete rules for partial ordering, why function template specialisation misbehaves, and the class-delegation idiom."
      },
      {
        source: "blog",
        attribution: "Herb Sutter - Why Not Specialize Function Templates? (GotW #49)",
        insight: "The canonical explanation of the two-step selection process and the overload-instead rule."
      },
      {
        source: "note",
        attribution: "cppreference - Partial specialization and Explicit (full) specialization",
        insight: "Normative constraints on where specialisations may appear and what may be specialised in namespace std."
      }
    ]
  },
  {
    id: "topic-cpp-templates-sfinae-and-traits",
    moduleId: "mod-cpp-templates-and-generic-programming",
    title: "SFINAE, Type Traits, and Compile-Time Introspection",
    intuition:
      "Substitution Failure Is Not An Error means that when the compiler substitutes template arguments into a candidate's signature and the result is invalid, that candidate is quietly removed from the overload set instead of ending the compilation. That one rule turned template metaprogramming into a system for asking questions about types: does this type have a size() member, is it convertible to string, does operator+ exist for these operands. SFINAE is how the standard library implemented every constraint before C++20, and reading it fluently remains necessary because the entire ecosystem is written in it.",
    complexity: {
      time:
        "Every trait evaluation and every SFINAE check is compile-time work with zero run-time cost - the selected overload is called directly with no dispatch. The compile-time cost is real: each enable_if instantiates a class template, and a heavily constrained overload set can multiply instantiation counts, which is why concepts were designed to be cheaper for the compiler as well as clearer for the reader.",
      space:
        "Traits produce no run-time storage: std::true_type and std::false_type are empty types, and an is_integral_v check compiles to a literal. Binary size is affected only indirectly, through which specialisations get instantiated, so SFINAE that eliminates unused overloads can actually reduce emitted code."
    },
    lesson: [
      {
        title: "The Substitution Rule and the Immediate Context",
        content:
          "When the compiler considers a function template as a candidate, it substitutes the deduced arguments into the template's declaration. If that substitution produces something invalid - a nested type that does not exist, an expression that will not compile, a reference to void - the candidate is silently discarded rather than causing an error. The crucial qualifier is that this applies only to the immediate context of the substitution, meaning the signature itself: the return type, the parameter types, and the template parameter list. An error that occurs while instantiating the function's body, or inside a class template that the signature names, is a hard error that stops the compilation. Confusing these two is the most common reason a SFINAE-based design fails in ways that look inexplicable.",
        codeExample: `// The classic detection: does T have a nested type 'iterator'?
template <class T>
typename T::iterator find_first(T& c) { return c.begin(); }   // (1)

template <class T>
T* find_first(T* p) { return p; }                              // (2)

std::vector<int> v;
int arr[4];
find_first(v);        // (1): vector::iterator exists
find_first(arr);      // (1) substitution fails -> DISCARDED, (2) chosen
                      // no error, just a smaller overload set

// Immediate context (SFINAE-friendly):
template <class T>
auto size_of(const T& c) -> decltype(c.size()) { return c.size(); }
// If T has no size(), the RETURN TYPE is invalid -> candidate removed.

// NOT the immediate context (hard error):
template <class T>
void bad(const T& c) {
    typename T::value_type x{};       // in the BODY -> hard error, not SFINAE
}

// Also not the immediate context - failure inside a nested instantiation:
template <class T> struct Helper { using type = typename T::missing; };
template <class T>
void also_bad(typename Helper<T>::type);   // instantiating Helper<T> fails
                                           // INSIDE Helper, so it is hard

// Deliberately triggering substitution failure in the signature:
template <class T,
          class = std::enable_if_t<std::is_integral_v<T>>>
void only_ints(T v) { /* ... */ }
// only_ints(1.5);   // enable_if_t has no 'type' -> candidate removed`,
        diagram: asciiDiagram(`Where substitution failure is safe, and where it is fatal

  Compiler considering  template <class T> RET f(PARAMS)  for f(arg)

  ┌────────────────────────────────────────────────────────────┐
  │              THE IMMEDIATE CONTEXT (SFINAE zone)           │
  │                                                            │
  │   template <class T, class = enable_if_t<...>>   ← here    │
  │   decltype(c.size())  f(  typename T::value_type v  )      │
  │   ▲                        ▲                               │
  │   └── return type          └── parameter types             │
  │                                                            │
  │   Substitution fails here ⇒ candidate silently REMOVED     │
  └────────────────────────────────────────────────────────────┘
                              │
                              ▼
  ┌────────────────────────────────────────────────────────────┐
  │                    THE BODY (hard-error zone)              │
  │   {                                                        │
  │       typename T::value_type x{};   ← fails ⇒ COMPILE ERROR│
  │       c.nonexistent();              ← fails ⇒ COMPILE ERROR│
  │   }                                                        │
  └────────────────────────────────────────────────────────────┘

  Also HARD, even though it looks like the signature:
  ┌────────────────────────────────────────────────────────────┐
  │   template<class T> struct H { using type = T::missing; }; │
  │   template<class T> void f(typename H<T>::type);           │
  │                              ▲                             │
  │   Naming H<T> is in the immediate context, but the failure │
  │   happens INSIDE H's instantiation ⇒ not SFINAE ⇒ ERROR    │
  └────────────────────────────────────────────────────────────┘

  Rule: the failure must be visible in the signature itself,
  not one instantiation deeper.`)
      },
      {
        title: "enable_if and Where to Put It",
        content:
          "std::enable_if<B, T> has a member type equal to T when B is true and no member at all when B is false, so naming enable_if_t<B, T> in a signature either yields T or triggers substitution failure. There are three conventional places to put it, and the choice matters. As a defaulted template parameter it does not affect the function's type, which is usually what you want and is required when constraining constructors, since they have no return type. As the return type it is concise but makes the signature harder to read and prevents constraining a constructor. As a defaulted function parameter it works but pollutes the parameter list. A subtle rule: two overloads whose only difference is a defaulted template argument are redeclarations of the same function, so mutually exclusive overloads must differ in the enable_if condition's position or use distinct conditions on the same parameter.",
        codeExample: `// Form 1: defaulted template parameter (most flexible)
template <class T, std::enable_if_t<std::is_integral_v<T>, int> = 0>
void process(T v) { std::puts("integral"); }

template <class T, std::enable_if_t<std::is_floating_point_v<T>, int> = 0>
void process(T v) { std::puts("floating"); }
// Distinct CONDITIONS, so these are distinct declarations. Using
// 'class = enable_if_t<...>' for both would be a redeclaration error.

// Form 2: return type (cannot be used for constructors)
template <class T>
std::enable_if_t<std::is_pointer_v<T>, void> deref_log(T p) { log(*p); }

// Form 3: constraining a constructor - only form 1 works
class Wrapper {
    std::string s_;
public:
    template <class T,
              std::enable_if_t<std::is_constructible_v<std::string, T>, int> = 0>
    explicit Wrapper(T&& t) : s_{std::forward<T>(t)} {}
};

// The greedy-constructor fix from earlier, done with enable_if:
class Person {
    std::string name_;
public:
    template <class T,
              std::enable_if_t<!std::is_same_v<std::decay_t<T>, Person>, int> = 0>
    explicit Person(T&& n) : name_{std::forward<T>(n)} {}
    Person(const Person&) = default;
};

// void_t: turn any valid type list into void, or fail trying.
template <class...> using void_t = void;

template <class T, class = void>
struct has_size : std::false_type {};

template <class T>
struct has_size<T, std::void_t<decltype(std::declval<T>().size())>>
    : std::true_type {};

static_assert(has_size<std::vector<int>>::value);
static_assert(!has_size<int>::value);`
      },
      {
        title: "Writing and Composing Type Traits",
        content:
          "A type trait is a class template that answers a compile-time question, and the standard convention is to derive from std::true_type or std::false_type so you inherit a static constexpr bool value, a value_type, and an implicit conversion. Traits that transform rather than query expose a nested type, and the standard provides _t and _v alias templates for both forms. Building one usually means writing a primary template giving the default answer and then partial specialisations for the cases that differ, which is exactly the pattern from specialisation. Composing traits with conjunction, disjunction, and negation is preferable to raw && and || because they short-circuit instantiation, which matters when a later condition would be ill-formed for types the earlier one already rejected.",
        codeExample: `// Query trait built from partial specialisation
template <class T>            struct is_pair               : std::false_type {};
template <class A, class B>   struct is_pair<std::pair<A,B>> : std::true_type {};
template <class T> inline constexpr bool is_pair_v = is_pair<T>::value;

// Transform trait
template <class T> struct strip           { using type = T; };
template <class T> struct strip<T&>       { using type = typename strip<T>::type; };
template <class T> struct strip<T&&>      { using type = typename strip<T>::type; };
template <class T> struct strip<const T>  { using type = typename strip<T>::type; };
template <class T> using strip_t = typename strip<T>::type;
static_assert(std::is_same_v<strip_t<const int&>, int>);

// Detection idiom, generalised (the pre-concepts workhorse)
template <class Default, class AlwaysVoid,
          template <class...> class Op, class... Args>
struct detector : std::false_type { using type = Default; };

template <class Default, template <class...> class Op, class... Args>
struct detector<Default, std::void_t<Op<Args...>>, Op, Args...>
    : std::true_type { using type = Op<Args...>; };

template <template <class...> class Op, class... Args>
using is_detected = detector<void, void, Op, Args...>;

template <class T> using serialise_t = decltype(std::declval<T>().serialise());
static_assert(is_detected<serialise_t, MyType>::value);

// Short-circuiting composition matters:
template <class T>
using safe = std::conjunction<std::is_pointer<T>,
                              std::is_class<std::remove_pointer_t<T>>>;
// With raw &&, BOTH operands are instantiated even when the first is false.
// conjunction stops at the first false, so remove_pointer_t is never
// applied to a non-pointer.

// declval: get a value of any type in an unevaluated context, even
// for types with no default constructor.
template <class A, class B>
using sum_t = decltype(std::declval<A>() + std::declval<B>());
static_assert(std::is_same_v<sum_t<int, double>, double>);`,
        diagram: asciiDiagram(`The detection idiom, step by step, for  has_size<T>

  template <class T, class = void>
  struct has_size : false_type {};                    ← PRIMARY

  template <class T>
  struct has_size<T, void_t<decltype(declval<T>().size())>>
      : true_type {};                                 ← SPECIALISATION

  ┌─ Case A:  has_size<vector<int>>  ────────────────────────────┐
  │                                                              │
  │  default 2nd arg  ......................  void               │
  │  specialisation computes:                                    │
  │     declval<vector<int>>().size()   valid                    │
  │           │                                                  │
  │           ▼                                                  │
  │     decltype(...) = size_t   ──►  void_t<size_t> = void       │
  │           │                                                  │
  │           ▼                                                  │
  │     pattern  <T, void>  MATCHES  <T, void>                   │
  │           │                                                  │
  │           ▼                                                  │
  │     specialisation chosen  ⇒  true_type                      │
  └──────────────────────────────────────────────────────────────┘

  ┌─ Case B:  has_size<int>  ────────────────────────────────────┐
  │                                                              │
  │  specialisation computes:                                    │
  │     declval<int>().size()   INVALID                          │
  │           │                                                  │
  │           ▼                                                  │
  │     substitution failure in the immediate context            │
  │           │                                                  │
  │           ▼                                                  │
  │     specialisation DISCARDED  (silently, no error)           │
  │           │                                                  │
  │           ▼                                                  │
  │     primary template remains  ⇒  false_type                  │
  └──────────────────────────────────────────────────────────────┘

  void_t's whole job: collapse "all these things are valid"
  into the single type  void,  so a partial specialisation
  can key on it against a defaulted  void  argument.`)
      },
      {
        title: "Expression SFINAE and decltype",
        content:
          "The most expressive form of SFINAE tests whether an expression is valid rather than whether a type exists. Writing a trailing return type of decltype(some_expression) makes the entire candidate depend on that expression compiling, so the overload disappears when it does not. Combined with std::declval, which produces a value of any type in an unevaluated context without needing a constructor, this lets you ask arbitrary questions: is a + b valid, is T streamable, does begin(c) resolve for this container. The idiom decltype(expr, void()) or decltype(void(expr)) tests validity while forcing the return type to void. Expression SFINAE is powerful but produces the worst error messages in C++, because a failure removes the candidate and the eventual error is 'no matching function' with a long list of discarded candidates and no explanation of why.",
        codeExample: `// Is T streamable?
template <class T>
auto is_streamable_impl(int)
    -> decltype(std::declval<std::ostream&>() << std::declval<T>(),
                std::true_type{});
template <class T>
std::false_type is_streamable_impl(...);       // fallback: worst conversion

template <class T>
inline constexpr bool is_streamable_v =
    decltype(is_streamable_impl<T>(0))::value;

static_assert(is_streamable_v<int>);
static_assert(!is_streamable_v<std::vector<int>>);
// The 'int' vs '...' parameter is the classic priority trick: 0 is an
// exact match for int and only a fallback match for the ellipsis.

// Constrain a generic function on operator+ existing:
template <class A, class B>
auto add(A&& a, B&& b) -> decltype(std::forward<A>(a) + std::forward<B>(b)) {
    return std::forward<A>(a) + std::forward<B>(b);
}
// A type without operator+ simply removes this candidate rather than
// producing an error inside the body.

// Priority tags scale better than int/... for more than two levels:
template <int N> struct priority : priority<N - 1> {};
template <>      struct priority<0> {};

template <class C>
auto do_size(const C& c, priority<2>) -> decltype(c.size())  { return c.size(); }
template <class C>
auto do_size(const C& c, priority<1>) -> decltype(std::distance(c.begin(), c.end()))
                                                             { return std::distance(c.begin(), c.end()); }
template <class C>
std::size_t do_size(const C&, priority<0>)                   { return 0; }

template <class C> std::size_t size_of(const C& c) {
    return do_size(c, priority<2>{});      // tries best to worst
}

// C++20 makes all of this direct:
template <class T> concept Streamable =
    requires (std::ostream& os, const T& v) { os << v; };
template <Streamable T> void print(const T& v) { std::cout << v; }`
      },
      {
        title: "Why Concepts Replaced This",
        content:
          "SFINAE works, but it encodes constraints as accidental compilation failures rather than as stated requirements, and everything downstream suffers. Error messages list discarded candidates without saying why each was discarded. Constraints cannot be named or reused except as ad-hoc trait aliases. There is no ordering, so overlapping constraints must be made mutually exclusive by hand with negations. And the syntax is heavy enough that people avoid constraining at all. C++20 concepts fix each of these: a concept is a named boolean predicate on types, requires-expressions test validity directly, constrained overloads are ordered by subsumption so the more specific one wins automatically, and failures are reported as unsatisfied constraints at the call site. The migration path is mechanical, since a concept can be defined in terms of the traits you already have, so new code should use concepts and existing SFINAE should be read rather than extended.",
        codeExample: `// Before: SFINAE
template <class T,
          std::enable_if_t<std::is_integral_v<T> &&
                           !std::is_same_v<T, bool>, int> = 0>
void store(T v);

template <class T,
          std::enable_if_t<std::is_floating_point_v<T>, int> = 0>
void store(T v);
// Conditions must be manually disjoint or the call is ambiguous.

// After: concepts
template <class T>
concept Integral = std::is_integral_v<T> && !std::same_as<T, bool>;

void store(Integral auto v);
void store(std::floating_point auto v);

// Subsumption gives automatic ordering - no manual disjointness needed:
template <class T> concept Container = requires (T c) {
    c.begin(); c.end(); typename T::value_type;
};
template <class T> concept SizedContainer = Container<T> && requires (T c) {
    { c.size() } -> std::convertible_to<std::size_t>;
};

void handle(Container auto&& c)      { /* generic */ }
void handle(SizedContainer auto&& c) { /* preferred: more constrained */ }
// SizedContainer subsumes Container, so it wins where both apply.

// requires-expressions replace the detection idiom entirely:
template <class T>
concept Serialisable = requires (const T& v, std::ostream& os) {
    { v.serialise(os) } -> std::same_as<void>;
    { T::schema_version } -> std::convertible_to<int>;
    typename T::field_list;
};

// Error message quality, the real payoff:
//   SFINAE:   "no matching function for call to store(std::string)"
//             + 40 lines of discarded candidates
//   Concepts: "constraints not satisfied: the required expression
//              is_integral_v<std::string> evaluated to false"`
      }
    ],
    examples: [
      {
        title: "A hard error where SFINAE was expected",
        input: "template <class T> void f(typename Helper<T>::type) where Helper<T> itself fails to instantiate for some T.",
        output: "A compile error inside Helper rather than the candidate being quietly removed from the overload set.",
        explanation:
          "Step 1: SFINAE applies only to failures visible in the immediate context of the substitution, which means the signature's own types and expressions.\nStep 2: Naming Helper<T>::type in a parameter is in the immediate context, but obtaining that type requires instantiating Helper<T>, which is a separate instantiation with its own body.\nStep 3: The failure occurs inside Helper's definition, one level deeper than the substitution, so it is outside the immediate context and becomes a hard error that halts compilation.\nStep 4: The practical rule this yields is that any helper used in a SFINAE constraint must itself be SFINAE-friendly, meaning it must produce a substitution failure rather than an error for the inputs it cannot handle.\nStep 5: Rewriting the constraint as a decltype expression on the signature, or moving the condition into an enable_if on a directly testable property, keeps the failure in the immediate context - and a C++20 requires clause avoids the distinction entirely."
      },
      {
        title: "Two enable_if overloads that fail to compile as a pair",
        input: "Two function templates differing only in class = enable_if_t<A> and class = enable_if_t<B>.",
        output: "A redefinition error: the compiler reports that the second declaration redeclares the first.",
        explanation:
          "Step 1: A default template argument is not part of a function template's signature, so two templates differing only in their defaults are the same template declared twice.\nStep 2: The compiler therefore sees a redefinition rather than an overload pair, and reports it at the declaration rather than at any call.\nStep 3: The fix is to make the enable_if part of the signature, most commonly by writing enable_if_t<Cond, int> = 0 as a non-type template parameter, since the parameter's type then differs between the two declarations.\nStep 4: Putting the enable_if in the return type also works, because return types do participate in a function template's signature, though that form cannot be used for constructors.\nStep 5: This subtlety is one of the strongest practical arguments for concepts, where two differently constrained overloads are distinct declarations by construction and require no encoding trick at all."
      },
      {
        title: "Detecting a member with void_t",
        input: "has_size<T> implemented as a primary template inheriting false_type plus a partial specialisation keyed on void_t<decltype(declval<T>().size())>.",
        output: "has_size<std::vector<int>>::value is true and has_size<int>::value is false, with no error for the second.",
        explanation:
          "Step 1: The primary template takes a second parameter defaulted to void and inherits false_type, so any instantiation that does not match the specialisation gets the false answer.\nStep 2: The partial specialisation matches when the second argument is void, and computes that argument as void_t of an expression involving T's size member.\nStep 3: For a vector the expression is valid, void_t maps it to void, the specialisation matches the default argument, and the true_type answer is selected.\nStep 4: For an int the expression is invalid, so substitution into the specialisation fails and it is discarded, leaving the primary template and the false answer - the whole mechanism rests on that discard being silent.\nStep 5: One historical wrinkle is worth knowing: some pre-C++17 compilers ignored the alias's unused parameters and failed to redeclare the specialisation correctly, which is why older code defines void_t through a struct indirection rather than as a plain alias template."
      }
    ],
    tips: [
      "Keep SFINAE conditions in the immediate context - the signature itself - because a failure inside a helper's instantiation is a hard error rather than a discarded candidate.",
      "Use enable_if_t<Cond, int> = 0 as a template parameter rather than class = enable_if_t<Cond>, so that two constrained overloads are genuinely distinct declarations.",
      "Prefer std::conjunction and std::disjunction over && and || in traits, because they stop instantiating operands after the answer is determined."
    ],
    tricks: [
      "The (int) versus (...) parameter pair is the cheapest way to give one overload priority over another; priority<N> tag hierarchies scale it beyond two levels.",
      "std::declval<T>() produces a value of any type inside decltype without requiring a constructor, which is what makes expression SFINAE work for non-default-constructible types.",
      "A concept can be defined directly in terms of an existing trait, so migrating a SFINAE codebase to C++20 can start by naming the conditions you already have."
    ],
    memoryAids: [
      "Substitution failure is not an error - but only in the signature; in the body it is just an error.",
      "enable_if is a light switch: true gives you a type, false gives you nothing, and nothing means go away.",
      "SFINAE says which overloads vanish; concepts say why - that difference is the whole error-message story."
    ],
    interviewPatterns: [
      "'What does SFINAE stand for and where does it apply?' The expected answer names the immediate context and contrasts it with hard errors in the body.",
      "'Write a trait that detects whether a type has a size() member.' They want void_t with a partial specialisation, or the C++20 requires-expression.",
      "Frequency and companies: standard for library-facing roles at Bloomberg, Nvidia, Jane Street, and Google; often followed by 'now write it with concepts'."
    ],
    practiceProblems: [
      "Why does std::void_t need a variadic parameter list when it always yields void? Answer: because the parameters are what carry the expressions being tested - void_t<decltype(a), decltype(b)> fails to substitute if either expression is invalid, and mapping all valid inputs to the single type void is what lets a partial specialisation key on it with a defaulted void parameter.",
      "Give a case where std::conjunction behaves differently from &&. Answer: is_pointer_v<T> && is_class_v<remove_pointer_t<T>> instantiates remove_pointer_t<T> even when T is not a pointer, which is harmless here but ill-formed for conditions that would fail on the rejected types; conjunction stops evaluating and stops instantiating at the first false operand, making such compositions safe.",
      "How would you give three overloads a strict preference order without making their conditions mutually exclusive? Answer: add a trailing parameter of a priority tag type where priority<N> derives from priority<N-1>, call with priority<2>{}, and let derived-to-base conversion rank the candidates - the most-derived match wins, and each overload only needs to state what it can handle rather than what the others cannot."
    ],
    faq: [
      {
        question: "What exactly is the immediate context, and why does the distinction matter so much?",
        answer:
          "The immediate context is the substitution itself: the template parameter list, the function's return type, and its parameter types, evaluated with the deduced arguments plugged in. If forming any of those produces an invalid construct, the candidate is removed from the overload set and compilation continues. Anything that happens as a consequence of that substitution but in a different scope is outside the immediate context, and a failure there is a hard error. The two situations that catch people are the function body, which is never SFINAE because it is only instantiated after the candidate has been selected, and nested instantiations, where the signature names some Helper<T> and the failure occurs inside Helper's definition. The second is subtler and is the reason libraries talk about being SFINAE-friendly: a helper intended for use in constraints must be written so that unsupported inputs produce a missing member rather than an error, which usually means giving it a primary template that simply has no nested type instead of one that tries and fails to compute one. std::iterator_traits was famously made SFINAE-friendly in C++17 for exactly this reason. In C++20 the distinction largely dissolves, because a requires clause states the condition directly and a failed requirement is a constraint violation rather than an accident of substitution."
      },
      {
        question: "Why do people write enable_if_t<Cond, int> = 0 instead of the shorter form?",
        answer:
          "Because default template arguments are not part of a function template's signature, so two overloads that differ only in a defaulted type parameter are the same template declared twice, and the compiler reports a redefinition rather than creating an overload pair. Writing enable_if_t<Cond, int> = 0 declares a non-type template parameter whose type is the result of the enable_if, so two overloads with different conditions have genuinely different parameter lists and are distinct declarations. The trailing = 0 supplies a default so callers never have to mention it. The int is arbitrary - any type would do, and some codebases use void* with a default of nullptr - but int is conventional and produces the shortest text. There are two alternatives with different trade-offs. Putting the enable_if in the return type does participate in the signature, so overloads work, but it obscures what the function returns and cannot be used for constructors or conversion operators, which have no return type. Adding a defaulted function parameter also works but appears in the function's visible interface and can be accidentally supplied by a caller. The template-parameter form is preferred precisely because it constrains without changing the interface, and it is the only form that works uniformly across functions, constructors, and conversion operators."
      },
      {
        question: "Are concepts strictly better than SFINAE, or is SFINAE still needed?",
        answer:
          "Concepts are better in every dimension that matters for new code, but SFINAE remains necessary knowledge and occasionally necessary practice. Concepts win on readability, because the constraint is a named predicate rather than an encoded failure; on diagnostics, because an unsatisfied constraint is reported at the call site naming the specific requirement that failed rather than as a list of discarded candidates; on ordering, because subsumption makes a more constrained overload automatically preferred, eliminating the manual negation gymnastics that overlapping enable_if conditions require; and on compile time, because the compiler can often evaluate a constraint without instantiating anything. They also allow constraints on class templates, on member functions, and on non-template functions in ways SFINAE cannot express cleanly. The reasons to still understand SFINAE are practical rather than theoretical. Enormous amounts of existing code, including standard library implementations, are written in it, and reading them requires fluency. Codebases pinned to C++14 or C++17 have no alternative. And a few detection patterns are still occasionally expressed more directly with expression SFINAE than with a requires-expression, though this is increasingly rare. The reasonable stance is to write concepts wherever the standard allows, to leave working SFINAE alone rather than churning it, and to be able to read both."
      },
      {
        question: "How does the detection idiom actually work?",
        answer:
          "It combines three pieces: a primary template that gives the negative answer, a partial specialisation that gives the positive one, and void_t to convert an arbitrary validity test into the single type the specialisation matches on. The primary template takes the type being tested plus a second parameter defaulted to void, and inherits false_type. The partial specialisation fixes that second argument to void_t of an expression involving the type - say decltype(declval<T>().size()) - and inherits true_type. When you write has_size<Vector>, the compiler fills in void for the second argument by default, then checks whether the partial specialisation matches: it computes void_t of the test expression, and if the expression is valid the result is void, which matches, so the specialisation with true_type is selected. If the expression is invalid, substitution into the specialisation fails, SFINAE discards it, and the primary template with false_type remains. The generalised form in the Library Fundamentals TS abstracts the test into a template template parameter so one detector serves every question, which is where is_detected comes from. Two footnotes are worth knowing: std::declval exists so the test works for types with no accessible constructor, since decltype never evaluates its operand; and some older compilers mishandled void_t as a plain alias, which is why pre-C++17 implementations route it through a struct."
      },
      {
        question: "Why are SFINAE error messages so bad, and can anything be done pre-C++20?",
        answer:
          "Because the mechanism discards candidates silently by design, so by the time the compiler reports failure it knows only that nothing matched, not why each candidate was rejected. The resulting message is 'no matching function for call to f', followed by every candidate with a note saying substitution failed, often with the offending expression printed in fully expanded template form that runs to several lines each. With a heavily overloaded generic function the note list can be dozens of entries, and the actual cause - that your type lacks a begin member, say - is nowhere stated. Several things help before C++20. Adding a static_assert with a clear message inside an unconstrained fallback overload converts a mysterious no-match into a stated requirement, at the cost of that overload being selected rather than nothing. Splitting a compound condition into several named trait aliases makes the notes more readable, since the alias names appear in the diagnostics. Testing types independently with static_asserts on the individual traits at the top of a function pinpoints which requirement failed. And Clang's diagnostics are markedly better than GCC's here, so compiling a failing case with Clang is a genuine debugging technique even in a GCC project. None of these approach what concepts give you for free, which is precisely why improving diagnostics was one of the stated goals of the concepts proposal rather than merely a side effect."
      },
      {
        question: "When should I write my own trait rather than using the standard ones?",
        answer:
          "Write your own when you are asking a question about your own domain that the standard cannot know, and reuse the standard ones for everything about the language's own type system. The standard library covers the language questions thoroughly: category queries such as is_integral and is_class, property queries such as is_trivially_copyable and is_nothrow_move_constructible, relationship queries such as is_base_of and is_convertible, and transformations such as remove_cvref and decay. Reimplementing any of those is a mistake, partly because some of them cannot be implemented in portable C++ at all and rely on compiler intrinsics, and partly because the standard versions handle edge cases - arrays of unknown bound, function types, cv-qualified void - that hand-rolled versions almost always get wrong. Your own traits should express domain concepts: is this type one of my serialisable message types, does it expose the schema members my framework needs, is it a specialisation of my own container template. These are exactly the questions partial specialisation and the detection idiom exist to answer. Two practical notes: derive query traits from true_type and false_type so they interoperate with the standard composition utilities, and provide the _v alias so call sites read cleanly. In C++20 the same domain questions are usually better expressed as concepts, with the trait retained only if you also need it as a value in a constexpr computation."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - SFINAE, std::enable_if, std::void_t, and the type traits library",
        insight: "Normative definition of the immediate context plus the full catalogue of standard traits."
      },
      {
        source: "book",
        attribution: "Vandevoorde, Josuttis and Gregor - C++ Templates: The Complete Guide, chapters on SFINAE and traits",
        insight: "Systematic treatment of the detection idiom, SFINAE-friendly design, and enable_if placement."
      },
      {
        source: "paper",
        attribution: "Walter Brown - N3911 (void_t) and the C++20 concepts proposal P0734",
        insight: "Origin of the detection idiom and the stated motivation for replacing SFINAE with concepts."
      }
    ]
  },
  {
    id: "topic-cpp-templates-variadic-and-folds",
    moduleId: "mod-cpp-templates-and-generic-programming",
    title: "Variadic Templates, Parameter Packs, and Fold Expressions",
    intuition:
      "Before C++11, writing a function that took any number of arguments of any types meant either overload sets generated by macros or the type-unsafe C ellipsis. Variadic templates gave the language a first-class parameter pack: a compile-time list of types or values that can be expanded into any comma-separated context. Everything modern C++ does with forwarding - make_unique, emplace_back, tuple, variant, std::format, thread constructors - is built on packs. C++17 fold expressions then removed the recursive boilerplate that early variadic code was drowning in.",
    complexity: {
      time:
        "Pack expansion is entirely compile-time; the emitted code is the same as if the arguments had been written out by hand, so a fold over N arguments costs exactly N operations at run time with no loop and no indirection. Compile time is the resource that is actually consumed: recursive variadic instantiation is O(N) distinct class or function instantiations per call, which is why a fold expression, which produces a single instantiation, compiles dramatically faster than the recursive equivalent for large N.",
      space:
        "A pack itself occupies no storage. Packs stored in a std::tuple occupy the sum of member sizes plus alignment padding, and empty types are typically collapsed by empty base optimisation in good implementations. Recursive instantiation can add many symbols to the object file, whereas the fold form usually collapses to a single inlined expression."
    },
    lesson: [
      {
        title: "Packs, sizeof..., and Expansion Contexts",
        content:
          "A template parameter declared with an ellipsis is a template parameter pack, and a function parameter whose type mentions that pack is a function parameter pack. Neither can be used directly: you cannot index a pack, iterate over it, or pass it as a single entity. The only thing you can do is expand it, which means writing pattern... where pattern mentions the pack, and having the compiler replace that with the comma-separated list of the pattern applied to each element. The set of contexts where expansion is legal is fixed by the standard - function call arguments, initialiser lists, template argument lists, base specifier lists, capture lists, and a few more - and everything variadic is written by finding a way to phrase your intent as one of them. sizeof...(pack) gives the element count as a constant expression, and the pattern may be arbitrarily complex, so f(g(args)...) expands to f(g(a1), g(a2), g(a3)).",
        codeExample: `template <class... Ts>              // template parameter pack
void demo(Ts... args) {             // function parameter pack
    constexpr std::size_t n = sizeof...(Ts);    // count of TYPES
    static_assert(n == sizeof...(args));        // same as count of VALUES

    // Expansion contexts:
    print(args...);                      // f(a1, a2, a3)
    print(transform(args)...);           // f(t(a1), t(a2), t(a3))
    print(args + 1 ...);                 // f(a1+1, a2+1, a3+1)
    std::tuple<Ts...> t{args...};        // template arg list + init list
    int arr[] = { (consume(args), 0)... };  // C++11 trick, see below
    (void)arr;
}

// Expanding TWO packs in lockstep - they must be the same length:
template <class... As, class... Bs>
void zip(std::tuple<As...> a, std::tuple<Bs...> b);

// A pattern can mention a pack more than once:
template <class... Ts>
auto squares(Ts... xs) { return std::make_tuple((xs * xs)...); }

// Where the ellipsis goes changes the meaning:
template <class... Ts> void f(Ts... a) {
    g(h(a)...);        // g( h(a1), h(a2), h(a3) )   -- expand h(a)
    g(h(a...));        // g( h(a1, a2, a3) )         -- expand a inside h
}

// Inheriting from every type in a pack (the overload-set trick):
template <class... Fs> struct overloaded : Fs... {
    using Fs::operator()...;         // C++17 pack expansion in using
};
template <class... Fs> overloaded(Fs...) -> overloaded<Fs...>;

std::visit(overloaded{
    [](int i)         { std::cout << "int " << i; },
    [](const std::string& s) { std::cout << "str " << s; }
}, my_variant);`,
        diagram: asciiDiagram(`How a pack expansion is rewritten by the compiler

  Call:   demo(10, 'x', 3.5)

  Deduction fills the packs:
  ┌──────────────────────────────────────────────┐
  │  Ts...    =   int  ,  char  ,  double        │
  │  args...  =   10   ,  'x'   ,  3.5           │
  │  sizeof...(Ts) = 3                           │
  └──────────────────────────────────────────────┘
                     │
                     ▼
  Each expansion site is rewritten independently:

    print(args...)
         │
         └──►  print( 10 , 'x' , 3.5 )

    print(transform(args)...)
         │
         └──►  print( transform(10), transform('x'), transform(3.5) )

    print(transform(args...))          ← ellipsis moved inward
         │
         └──►  print( transform(10, 'x', 3.5) )

    std::tuple<Ts...>
         │
         └──►  std::tuple< int, char, double >

  ┌─────────────────────────────────────────────────────────┐
  │  The ellipsis expands the SMALLEST enclosing pattern    │
  │  that contains the pack.  Moving it changes which       │
  │  expression gets repeated.                              │
  └─────────────────────────────────────────────────────────┘

  Illegal, because these are not expansion contexts:
      args[0]          no indexing
      for (x : args)   no iteration
      auto v = args;   pack is not a value`)
      },
      {
        title: "Recursion: the C++11 Way",
        content:
          "Before fold expressions, processing a pack element by element meant peeling the first argument off into a named parameter and recursing on the rest, with a base case for the empty or single-element pack. The pattern is (Head h, Tail... t) with a recursive call passing t..., terminating either in an overload taking no arguments or one taking a single argument. It works and is still needed whenever the operation is not a simple binary fold - for example when each element's handling depends on its index, or when you need to interleave something between elements. The costs are real: N+1 distinct function instantiations per call site, longer compile times, and a base case that must be kept in sync. Class-template recursion follows the same shape and is how std::tuple was originally implemented, with each level storing one element and inheriting the rest.",
        codeExample: `// C++11 recursive print with separators
void print() { std::cout << '\\n'; }            // base case

template <class T, class... Rest>
void print(const T& first, const Rest&... rest) {
    std::cout << first;
    if constexpr (sizeof...(rest) > 0) std::cout << ", ";   // C++17 nicety
    print(rest...);                                          // peel and recurse
}
print(1, "two", 3.0);        // instantiates print<int,const char*,double>,
                             // print<const char*,double>, print<double>, print()

// Recursive class template - how tuple was built
template <class... Ts> struct Tup {};                       // empty case

template <class Head, class... Tail>
struct Tup<Head, Tail...> : Tup<Tail...> {
    Head value;
    Tup(Head h, Tail... t) : Tup<Tail...>(t...), value(std::move(h)) {}
};
// Tup<int,char,bool> is Tup<int,char,bool> : Tup<char,bool> : Tup<bool> : Tup<>

// The C++11 "expander trick" for side effects without recursion:
template <class... Ts>
void log_all(const Ts&... xs) {
    using expander = int[];
    (void)expander{ 0, ((void)(std::cout << xs << ' '), 0)... };
    // The 0 first element handles the empty pack (int[] cannot be size 0).
    // Braced-init-list guarantees LEFT-TO-RIGHT evaluation - a plain
    // comma-expression argument list does NOT.
}

// C++17 makes the same thing one line:
template <class... Ts>
void log_all17(const Ts&... xs) { ((std::cout << xs << ' '), ...); }`
      },
      {
        title: "Fold Expressions",
        content:
          "C++17 added four fold forms that expand a pack over a binary operator without any recursion. A unary right fold (pack op ...) groups as e1 op (e2 op e3); a unary left fold (... op pack) groups as (e1 op e2) op e3; the binary forms add an explicit init value on the appropriate side. Left folds are the default choice because they match the natural associativity of most operators, and for subtraction, division, or stream insertion the difference is not stylistic but correctness. Unary folds over an empty pack are ill-formed except for &&, which yields true, || which yields false, and the comma operator which yields void - so any other operator needs the binary form with an explicit identity. Folds also short-circuit properly for && and ||, and the comma fold guarantees left-to-right evaluation with a sequence point between elements, which is what makes it safe for side effects.",
        codeExample: `template <class... Ts> auto sum_r(Ts... xs) { return (xs + ...); }   // unary right
template <class... Ts> auto sum_l(Ts... xs) { return (... + xs); }   // unary left
template <class... Ts> auto sum_i(Ts... xs) { return (0 + ... + xs); } // binary left

// Associativity is NOT cosmetic:
sub_r(10, 3, 2);   // (xs - ...)  =>  10 - (3 - 2)  =  9
sub_l(10, 3, 2);   // (... - xs)  =>  (10 - 3) - 2  =  5

// Empty pack: only && || and , have identities
template <class... Ts> bool all(Ts... xs) { return (xs && ...); }  // {} -> true
template <class... Ts> bool any(Ts... xs) { return (xs || ...); }  // {} -> false
template <class... Ts> auto total(Ts... xs) { return (0 + ... + xs); } // {} -> 0
// (xs + ...) with an empty pack is ILL-FORMED - use the binary form.

// Short-circuiting is preserved:
template <class... Ps> bool all_valid(const Ps&... ps) {
    return (ps->check() && ...);      // stops at the first failure
}

// Comma fold: guaranteed left-to-right, ideal for side effects
template <class... Ts> void print_all(const Ts&... xs) {
    ((std::cout << xs << ' '), ...);
}

// Folding over a member call on a tuple-like aggregate
template <class... Ts> struct Bundle {
    std::tuple<Ts...> items;
    void reset_all() {
        std::apply([](auto&... it) { (it.reset(), ...); }, items);
    }
};

// Folding a comparison needs care - (a < ...) is not "all increasing":
template <class... Ts> bool increasing(Ts... xs) {
    // (xs < ...) folds to a < (b < c) which compares a against a bool. Wrong.
    std::array vals{xs...};
    return std::is_sorted(vals.begin(), vals.end());
}

// Type-level folds work too:
template <class T, class... Ts>
inline constexpr bool is_one_of_v = (std::is_same_v<T, Ts> || ...);
static_assert(is_one_of_v<int, char, int, double>);`,
        diagram: asciiDiagram(`The four fold forms, for pack  e1 e2 e3  and operator  op

  ┌───────────────────────┬──────────────────────────────────────┐
  │  UNARY RIGHT          │                                      │
  │  ( pack op ... )      │   e1 op ( e2 op e3 )                 │
  │                       │        └──────┬──────┘               │
  │                       │        innermost is the RIGHT end    │
  ├───────────────────────┼──────────────────────────────────────┤
  │  UNARY LEFT           │                                      │
  │  ( ... op pack )      │   ( e1 op e2 ) op e3                 │
  │                       │   └──────┬─────┘                     │
  │                       │   innermost is the LEFT end          │
  ├───────────────────────┼──────────────────────────────────────┤
  │  BINARY RIGHT         │                                      │
  │  ( pack op ... op I ) │   e1 op ( e2 op ( e3 op I ) )        │
  ├───────────────────────┼──────────────────────────────────────┤
  │  BINARY LEFT          │                                      │
  │  ( I op ... op pack ) │   ( ( I op e1 ) op e2 ) op e3        │
  └───────────────────────┴──────────────────────────────────────┘

  Mnemonic: the  ...  sits next to the end that binds LAST.

  Empty pack behaviour
  ┌──────────────┬─────────────────────────────────────────────┐
  │  &&          │   yields  true                              │
  │  ||          │   yields  false                             │
  │  ,           │   yields  void()                            │
  │  everything  │   ILL-FORMED  ──►  use the binary form and  │
  │  else        │                    supply the identity      │
  └──────────────┴─────────────────────────────────────────────┘

  Worked:   sub(10, 3, 2)
      ( xs - ... )   ──►   10 - (3 - 2)   ──►   9
      ( ... - xs )   ──►   (10 - 3) - 2   ──►   5
                            ▲
                            └── almost always the one you meant`)
      },
      {
        title: "Forwarding Packs and the Emplace Family",
        content:
          "The single most common use of packs in production code is perfect forwarding: accept Args&&... args and pass std::forward<Args>(args)... onward, so that each argument keeps its own value category independently of the others. This is the signature of make_unique, make_shared, emplace_back, emplace, std::thread's constructor, std::async, and std::invoke. Two details are easy to get wrong. The forward must expand the pattern std::forward<Args>(args), not forward the whole pack as a unit, so the ellipsis goes after the closing parenthesis. And a variadic forwarding constructor on a class is even greedier than the single-argument case, because it matches any number of arguments including copy and move calls, so it needs both a decay-based self-exclusion and often a constructibility constraint. Storing a forwarded pack for later use, as std::thread and std::async do, requires decay-copying into a tuple, because the references would dangle once the caller's frame is gone.",
        codeExample: `// The canonical factory
template <class T, class... Args>
std::unique_ptr<T> make_unique_like(Args&&... args) {
    return std::unique_ptr<T>(new T(std::forward<Args>(args)...));
    //                                                      ▲
    //  forward<Args>(args)...  expands the whole pattern per element.
    //  forward<Args...>(args...) would be wrong.
}

// Container emplace: construct in place from a forwarded pack
template <class T, std::size_t N> class SmallVec {
    alignas(T) std::byte buf_[sizeof(T) * N];
    std::size_t size_ = 0;
public:
    template <class... Args>
    T& emplace_back(Args&&... args) {
        T* p = std::launder(reinterpret_cast<T*>(buf_) + size_);
        ::new (static_cast<void*>(p)) T(std::forward<Args>(args)...);
        ++size_;
        return *p;
    }
};

// Storing a pack for deferred execution - MUST decay-copy
template <class F, class... Args>
auto defer(F&& f, Args&&... args) {
    return [fn = std::forward<F>(f),
            tup = std::make_tuple(std::forward<Args>(args)...)]() mutable {
        return std::apply(std::move(fn), std::move(tup));
    };
    // make_tuple decays, so references to caller locals are not stored.
    // forward_as_tuple would store dangling references here.
}

// Constraining a greedy variadic constructor
template <class... Ts> class Row {
    std::tuple<Ts...> data_;
public:
    template <class... Args,
              std::enable_if_t<sizeof...(Args) == sizeof...(Ts) &&
                               (std::is_constructible_v<Ts, Args&&> && ...),
                               int> = 0>
    explicit Row(Args&&... a) : data_(std::forward<Args>(a)...) {}
    Row(const Row&) = default;      // still needed - variadic would win otherwise
    Row(Row&&) = default;
};

// std::thread copies its arguments; use ref() to opt out (and mean it)
int counter = 0;
std::thread t(increment, std::ref(counter));    // without ref, thread
t.join();                                       // increments a COPY`
      },
      {
        title: "Indexing a Pack and Compile-Time Iteration",
        content:
          "Packs cannot be indexed directly, so accessing the Nth element or iterating with an index requires machinery. The standard route is std::index_sequence: make_index_sequence<N> produces index_sequence<0,1,...,N-1>, which you deduce into a pack of size_t values in a helper function and then expand alongside the data. This is how std::apply, std::make_from_tuple, and most tuple algorithms are implemented. Combined with a generic lambda taking auto... Is, it gives a compile-time for loop where the index is a constant expression usable as a template argument. C++20's template-parameter lambdas make the pattern more readable, and C++26 adds direct pack indexing with pack...[N], but index_sequence remains the portable idiom that appears in every real codebase.",
        codeExample: `// The idiom: deduce indices into a pack, then expand two packs together
template <class Tuple, std::size_t... Is>
void print_tuple_impl(const Tuple& t, std::index_sequence<Is...>) {
    ((std::cout << (Is ? ", " : "") << std::get<Is>(t)), ...);
}
template <class... Ts>
void print_tuple(const std::tuple<Ts...>& t) {
    print_tuple_impl(t, std::index_sequence_for<Ts...>{});
}

// A compile-time for loop (C++20 template lambda)
template <std::size_t N, class F>
constexpr void for_each_index(F&& f) {
    [&]<std::size_t... Is>(std::index_sequence<Is...>) {
        (f(std::integral_constant<std::size_t, Is>{}), ...);
    }(std::make_index_sequence<N>{});
}

for_each_index<3>([]<class I>(I) {
    std::cout << std::tuple_element_t<I::value, MyTuple>::name;
});

// Nth type of a pack, pre-C++26
template <std::size_t N, class... Ts>
using nth_type_t = std::tuple_element_t<N, std::tuple<Ts...>>;
static_assert(std::is_same_v<nth_type_t<1, char, int, double>, int>);

// Nth value of a pack, via a fold with an index counter
template <std::size_t N, class... Ts>
constexpr decltype(auto) nth_value(Ts&&... xs) {
    return std::get<N>(std::forward_as_tuple(std::forward<Ts>(xs)...));
    // forward_as_tuple is safe here: the tuple dies at the end of the
    // full expression, after the reference has been used.
}

// std::apply, in essence
template <class F, class Tuple, std::size_t... Is>
constexpr decltype(auto) apply_impl(F&& f, Tuple&& t, std::index_sequence<Is...>) {
    return std::invoke(std::forward<F>(f),
                       std::get<Is>(std::forward<Tuple>(t))...);
}

// C++26: direct pack indexing removes most of this
// template <class... Ts> void f(Ts... xs) { auto second = xs...[1]; }`
      }
    ],
    examples: [
      {
        title: "A subtraction fold that gives the wrong answer",
        input: "template <class... Ts> auto diff(Ts... xs) { return (xs - ...); } called as diff(10, 3, 2).",
        output: "9 rather than the expected 5.",
        explanation:
          "Step 1: (xs - ...) is a unary right fold, which groups the operator from the right, producing 10 - (3 - 2).\nStep 2: The inner subtraction yields 1 and the outer yields 9, whereas the left-associative reading a programmer expects from ordinary arithmetic gives (10 - 3) - 2 = 5.\nStep 3: The fix is to write (... - xs), the unary left fold, whose expansion matches the natural associativity of subtraction.\nStep 4: The same trap applies to division, modulo, stream insertion, and any non-associative operator; it is invisible for addition and multiplication, which is precisely why it survives code review.\nStep 5: The habit worth forming is to default to the left fold - (... op xs) or (init op ... op xs) - and to reach for the right fold only when the operation genuinely associates that way, such as building a nested type or a right-associative assignment chain."
      },
      {
        title: "An empty pack that fails to compile",
        input: "template <class... Ts> auto total(Ts... xs) { return (xs + ...); } instantiated as total().",
        output: "A compile error stating that the fold expression has an empty pack and the operator has no identity element.",
        explanation:
          "Step 1: A unary fold over an empty pack must produce some value, and the standard only defines that value for three operators.\nStep 2: && yields true, || yields false, and the comma operator yields void(), because those are the mathematical identities for the operations concerned.\nStep 3: Every other operator, including +, has no standard-defined identity in this context - the compiler cannot assume 0, since + also concatenates strings and adds durations - so the expression is ill-formed.\nStep 4: The binary fold form supplies the identity explicitly: (0 + ... + xs) evaluates to 0 for an empty pack and to the running sum otherwise, and the same pattern gives (1 * ... * xs) or (std::string{} + ... + xs).\nStep 5: Because the failure only appears when someone actually calls the function with no arguments, which may be much later than when it was written, using the binary form by default is the safer habit."
      },
      {
        title: "std::thread appearing to ignore a mutation",
        input: "int n = 0; std::thread t(increment, n); t.join(); then reading n.",
        output: "n is still 0 despite increment taking its parameter by reference.",
        explanation:
          "Step 1: std::thread's constructor takes a forwarding pack but must store the arguments, because the new thread outlives the constructor call.\nStep 2: Storing them requires decay-copying into internal storage, so the reference-ness of the caller's argument is deliberately discarded and the thread receives a copy.\nStep 3: The function's reference parameter therefore binds to that internal copy, and the mutation is applied to storage the caller never observes.\nStep 4: std::ref wraps the argument in a reference_wrapper, which is copyable and implicitly converts back to a reference at the call, restoring the intended semantics - and std::cref does the same for const access.\nStep 5: The design is deliberate: silently binding a thread's parameter to a caller local would create a dangling reference the moment the caller returned, so the library forces you to opt into reference semantics and thereby to take responsibility for the lifetime."
      }
    ],
    tips: [
      "Default to left folds - (... op xs) or (init op ... op xs) - because they match how humans read the operator, and reserve right folds for genuinely right-associative constructions.",
      "Use the binary fold form whenever the pack could be empty, since only &&, ||, and the comma operator have standard identities.",
      "Expand the pattern std::forward<Args>(args)... rather than forwarding the pack as a unit; the ellipsis belongs outside the closing parenthesis."
    ],
    tricks: [
      "The comma fold ((expr), ...) is the shortest way to run a side effect per element with guaranteed left-to-right ordering, replacing the C++11 int-array expander trick entirely.",
      "std::index_sequence turns a count into a pack of constants, which is the standard way to index a pack, implement apply, or write a compile-time for loop.",
      "(std::is_same_v<T, Ts> || ...) is a one-line 'is T one of these types', and (std::is_constructible_v<Ts, Args> && ...) constrains a variadic constructor element-wise."
    ],
    memoryAids: [
      "The ellipsis in a fold sits beside the end that binds last: (xs op ...) is right, (... op xs) is left.",
      "You cannot index, iterate, or name a pack - you can only expand it, so the whole craft is finding an expansion context.",
      "Only and, or, and comma survive an empty pack; everything else needs you to bring your own zero."
    ],
    interviewPatterns: [
      "'Implement a variadic sum, then explain what happens for an empty argument list.' They are testing whether you know the identity rule and the binary fold form.",
      "'Why does std::thread copy its arguments, and how do you pass a reference?' A lifetime question disguised as a pack question; the answer is decay-copy plus std::ref.",
      "Frequency and companies: standard at Bloomberg, Nvidia, Citadel, and Google for systems roles; usually paired with a perfect-forwarding follow-up."
    ],
    practiceProblems: [
      "Write a function that returns true only if all arguments are distinct types. Answer: use a fold over a helper - (count_of<Ts, Ts...>() == 1 && ...) where count_of sums (is_same_v<T, Us> + ...) - since a naive pairwise fold cannot express the cross product; the nested-fold formulation counts each type's occurrences across the whole pack and requires every count to be one.",
      "Why is std::forward_as_tuple dangerous to store but safe to pass? Answer: it builds a tuple of references to its arguments, so the tuple is valid only for the duration of the full expression that created it; passing it directly into a call that consumes it immediately is fine, while storing it in a member or capturing it in a lambda that outlives the statement leaves dangling references - std::make_tuple decays and copies, which is what deferred execution needs.",
      "Convert a recursive variadic print into a fold and explain what improves. Answer: ((std::cout << xs << ' '), ...) replaces N+1 function instantiations with a single one, removes the base-case overload that had to be kept in sync, keeps the guaranteed left-to-right ordering that the comma fold specifies, and typically compiles several times faster for large packs while emitting identical machine code."
    ],
    faq: [
      {
        question: "Why can't I just index or loop over a parameter pack?",
        answer:
          "Because a pack is not an object or a sequence at run time - it is a compile-time list that exists only during template instantiation, and by the time any code runs the pack has already been expanded into ordinary separate parameters that live in registers or on the stack with no relationship to each other. Indexing would require a run-time value to select among entities of potentially different types, which cannot have a single static type, so the language does not offer it. Iteration has the same problem: the loop body would need a different type each iteration, which an ordinary for loop cannot express. The workarounds all convert the pack into something the language can process. Expanding it into a std::tuple gives you a real object whose elements can be reached with std::get, which requires a compile-time constant index. Pairing the pack with a std::index_sequence gives you a second pack of constants that expands in lockstep, which is how std::apply and every tuple algorithm are written. A fold with a generic lambda gives you a compile-time loop where each iteration is a separate instantiation of the lambda's operator(). C++26 finally adds direct pack indexing with the syntax pack...[N], where N must still be a constant expression, which removes the tuple detour for the common case but does not change the underlying fact that the index must be known at compile time."
      },
      {
        question: "What is the practical difference between a left fold and a right fold?",
        answer:
          "Associativity, which matters whenever the operator is not associative. A unary left fold (... op xs) expands to ((e1 op e2) op e3), matching the way almost every operator is read in ordinary source code. A unary right fold (xs op ...) expands to (e1 op (e2 op e3)), which for addition and multiplication produces the same answer but for subtraction, division, modulo, stream insertion, and assignment produces a different one. The canonical demonstration is subtraction over 10, 3, 2: the left fold gives 5 and the right fold gives 9. There are also cases where the two forms differ in whether they compile at all, since the intermediate types differ - a right fold over stream insertion tries to insert a stream into a value rather than the other way round. A few situations genuinely want the right fold, notably building a right-nested type such as a linked type list or expressing a right-associative assignment chain, but they are rare enough that treating the left fold as the default and the right fold as the exception requiring justification is sound practice. The binary forms follow the same rule with the initialiser placed on the side the ellipsis is not: (init op ... op xs) is a left fold with init as the leftmost operand, and (xs op ... op init) is a right fold with init rightmost."
      },
      {
        question: "How do I write a variadic constructor without breaking copy construction?",
        answer:
          "A variadic forwarding constructor template is even greedier than the single-argument version, because it matches calls with any number of arguments, and for a one-argument call with a non-const lvalue of the class's own type it produces an exact match while the copy constructor requires a qualification conversion. The result is that copying a non-const object calls the variadic constructor, which typically fails to compile inside its body with a message that has nothing to do with copying. There are two things to do. First, exclude the self case with an enable_if or requires clause testing that the decayed first argument is not the class type, guarded by a sizeof...(Args) == 1 check so the exclusion only applies where it can bite. Second, constrain the pack element-wise with something like (std::is_constructible_v<Members, Args&&> && ...) so the constructor is only viable when the arguments can actually build the members, which turns a body-level error into a clean overload-resolution failure and stops the constructor from hijacking calls it cannot serve. It is also worth explicitly defaulting the copy and move constructors, both because the variadic template suppresses nothing but is easy to reason about alongside explicit declarations, and because declaring them documents the intent. In C++20 a requires clause expresses all of this far more readably than nested enable_ifs, and the derived class case - where the variadic constructor of a base can hijack the derived copy - is worth checking separately."
      },
      {
        question: "Why does storing a forwarded pack require make_tuple rather than forward_as_tuple?",
        answer:
          "Because the two functions build fundamentally different tuples. std::forward_as_tuple constructs a tuple of references - lvalue references for lvalue arguments and rvalue references for rvalues - and stores no data at all, which makes it free but ties its validity to the lifetime of the arguments. It exists to pass a pack through to another function within a single full expression, after which the temporaries it may reference are destroyed. std::make_tuple applies decay to each argument, stripping references and cv-qualification and copying or moving the value into the tuple, so the result owns its contents and can outlive the statement. Storing a pack for later execution - in a lambda capture, in a member, in a task queue entry - therefore requires make_tuple, or the deferred call will read destroyed objects. This is exactly why std::thread and std::async decay-copy their arguments, and why passing a reference to them requires the explicit std::ref wrapper that survives the decay because reference_wrapper is a copyable object. The failure mode is nasty because it is a use-after-free that often appears to work: the stack slot the reference points at frequently still holds the old value when the deferred call runs, so the bug surfaces only under load, under a different optimisation level, or on a different platform. Address sanitizer with stack-use-after-return enabled catches it reliably."
      },
      {
        question: "How do fold expressions compare with recursion for compile time and code size?",
        answer:
          "Folds win substantially on compile time and are usually neutral or better on code size. A recursive variadic function instantiates a distinct specialisation for every suffix of the pack, so a call with N arguments produces N+1 function template instantiations, each of which the compiler must parse, instantiate, type-check, and potentially emit as a symbol before inlining removes it. A fold produces exactly one instantiation containing the expanded expression. For small packs the difference is negligible, but for the deeply variadic code that shows up in serialisation frameworks, signal libraries, and tuple algorithms, it can be the difference between a two-second and a thirty-second translation unit, and the recursive form also risks hitting the implementation's template instantiation depth limit. On run-time code, both forms typically optimise to the same thing once the recursive calls are inlined, so the generated machine code is usually identical at -O2; the recursive version can be worse in debug builds, where the calls are real and the stack depth is proportional to the pack size. Where recursion is still necessary is any operation that is not expressible as a repeated binary operator - handling elements differently based on position, stopping early with a non-boolean result, or building a structure whose shape depends on the remaining pack - though many of these can be recast as a fold over a generic lambda that captures state, which recovers most of the compile-time benefit."
      },
      {
        question: "What does the C++11 int-array expander trick do and is there any reason to still use it?",
        answer:
          "It is the pre-fold way to evaluate an expression once per pack element in a guaranteed order. The construction is an array of int initialised with a braced list containing a leading 0 followed by a pack expansion whose pattern is a comma expression that performs the side effect and then yields 0. Three details make it work. The braced-init-list is the only common expansion context that guarantees left-to-right evaluation with a sequence point between elements - ordinary function call arguments have unspecified evaluation order before C++17 and only partially specified order after - so side effects are safely ordered. The leading 0 exists because a zero-length array is ill-formed, which would otherwise break the empty-pack case. And the cast to void on the effect expression prevents a user-defined comma operator from hijacking the construct, while the cast to void on the array itself silences the unused-variable warning. It is genuinely clever and genuinely unreadable, which is why the C++17 comma fold ((expr), ...) was designed to replace it and carries the same left-to-right guarantee in three characters of punctuation. The only reason to still write it is a codebase pinned to C++11 or C++14, and even there wrapping it in a small helper is kinder to readers than repeating it. Recognising it matters more than writing it, since it appears throughout libraries written in that era."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - parameter pack, fold expression, std::index_sequence, std::apply",
        insight: "Enumerates every legal expansion context and the exact empty-pack rules for each fold form."
      },
      {
        source: "paper",
        attribution: "Andrew Sutton and Richard Smith - N4295, Folding Expressions (C++17)",
        insight: "States the motivation for replacing recursive variadic instantiation and defines the four fold forms."
      },
      {
        source: "book",
        attribution: "Vandevoorde, Josuttis and Gregor - C++ Templates: The Complete Guide, variadic templates chapters",
        insight: "Covers pack expansion patterns, the expander trick, and index_sequence-based tuple algorithms in depth."
      }
    ]
  },
  {
    id: "topic-cpp-templates-concepts-and-crtp",
    moduleId: "mod-cpp-templates-and-generic-programming",
    title: "C++20 Concepts, Constraints, and CRTP Static Polymorphism",
    intuition:
      "Two ideas dominate modern generic C++. Concepts finally let a template say what it requires of its arguments, turning silent substitution failures into stated, checkable, orderable contracts. CRTP - passing the derived class to its own base as a template argument - lets a base class call into its derived class with no virtual dispatch, giving polymorphism that is resolved entirely at compile time. Together they are how libraries get interfaces that are both expressive and free: the constraint documents and checks, the CRTP base implements shared behaviour without a vtable.",
    complexity: {
      time:
        "Both are compile-time mechanisms with zero run-time overhead. A constrained call compiles to exactly the same instructions as an unconstrained one, and a CRTP static_cast to the derived type is a no-op the optimiser erases, so a CRTP interface call inlines to a direct call while a virtual call costs a vtable load plus an indirect branch and usually blocks inlining. Constraint checking is generally cheaper for the compiler than the equivalent enable_if because a concept can often be evaluated without instantiating anything.",
      space:
        "A CRTP base is normally empty and benefits from empty base optimisation, so a CRTP-derived object is the same size as one with no base at all, versus the one-pointer-per-object vtable cost of virtual inheritance. The trade is binary size: every CRTP instantiation emits its own copy of the base's member functions, so a hundred derived types produce a hundred code copies, whereas a virtual base emits one."
    },
    lesson: [
      {
        title: "Defining and Using Concepts",
        content:
          "A concept is a named compile-time predicate over template parameters, declared with template<...> concept Name = expression, where the expression must be a constant expression of type bool. It can be built from existing traits, from other concepts, or from a requires-expression that tests whether a set of expressions and types is valid. There are four interchangeable syntaxes for applying one - a constrained template parameter, a requires clause after the parameter list, a trailing requires clause after the signature, and the abbreviated auto form in a parameter - and which you use is style, though the trailing clause is the only one that can reference the function's own parameters. Crucially, a concept only checks what you state: satisfying it means the listed expressions compile, not that they behave sensibly, so a concept is a syntactic contract with a semantic promise that the compiler cannot verify.",
        codeExample: `#include <concepts>

// From traits
template <class T>
concept Numeric = std::is_arithmetic_v<T> && !std::same_as<T, bool>;

// From a requires-expression
template <class T>
concept Drawable = requires (const T& t, Canvas& c) {
    t.draw(c);                                   // simple: must be valid
    { t.bounds() } -> std::convertible_to<Rect>; // compound: valid + type
    typename T::style_type;                      // type requirement
    requires sizeof(T) <= 64;                    // nested: must be TRUE
};

// Four ways to apply the same constraint
template <Numeric T>              void a(T v);                  // constrained param
template <class T> requires Numeric<T>  void b(T v);            // requires clause
template <class T> void c(T v) requires Numeric<T>;             // trailing clause
void d(Numeric auto v);                                         // abbreviated

// Trailing clause can mention the parameters:
template <class C>
auto back(C& c) requires requires { c.back(); } { return c.back(); }
//                ▲ the first 'requires' introduces the clause,
//                  the second introduces the expression

// Standard library concepts you should know by name
static_assert(std::integral<int>);
static_assert(std::same_as<int, int>);
static_assert(std::convertible_to<int, double>);
static_assert(std::equality_comparable<std::string>);
static_assert(std::totally_ordered<int>);
static_assert(std::invocable<decltype([](int){}), int>);
static_assert(std::ranges::range<std::vector<int>>);

// Constraining a class template and its members
template <std::input_iterator It>
class Window {
    It begin_, end_;
public:
    void sort() requires std::random_access_iterator<It> {
        std::sort(begin_, end_);        // ONLY exists for RA iterators
    }
};
// Window<std::list<int>::iterator> compiles; calling .sort() on it does not,
// and the error names the unsatisfied constraint.`,
        diagram: asciiDiagram(`Anatomy of a requires-expression

  template <class T>
  concept Drawable = requires (const T& t, Canvas& c) {
                     └──┬───┘ └──────────┬──────────┘
                        │                │
                introduces the     optional parameter list:
                expression         fictional variables you
                                   may use in the body
      ┌──────────────────────────────────────────────────────┐
      │  t.draw(c);                                          │
      │  └── SIMPLE requirement: expression must be valid    │
      │                                                      │
      │  { t.bounds() } yields std::convertible_to<Rect>     │
      │  └── COMPOUND: valid, AND result satisfies the       │
      │      concept, AND (with noexcept) does not throw     │
      │                                                      │
      │  typename T::style_type;                             │
      │  └── TYPE requirement: the name must denote a type   │
      │                                                      │
      │  requires sizeof(T) <= 64;                           │
      │  └── NESTED: the expression must be TRUE, not        │
      │      merely valid  ── easiest one to get wrong       │
      └──────────────────────────────────────────────────────┘
                             │
                             ▼
                  whole thing yields  true / false

  ┌──────────────────────────────────────────────────────────┐
  │  TRAP:   requires { sizeof(T) == 4; }                    │
  │          asks only "is this expression valid?"           │
  │          It is valid for EVERY T ⇒ always true.          │
  │  FIX:    requires { requires sizeof(T) == 4; }           │
  │                     ▲ nested requires checks the VALUE   │
  └──────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Subsumption: Why Constrained Overloads Order Themselves",
        content:
          "The feature that makes concepts qualitatively better than enable_if is subsumption. When two candidate functions are otherwise equally good matches, the compiler compares their constraints by decomposing them into atomic constraints connected by && and ||, and if one candidate's constraint set is a superset of the other's, that candidate is more constrained and wins. This means a concept defined as Base<T> && something automatically beats Base<T>, with no manual negation required, so overload sets can be extended by adding a more specific overload without touching the existing ones. The mechanism has a strict rule: subsumption compares atomic constraints by identity of the source expression, not by value, so two textually distinct but logically equivalent conditions do not subsume each other. This is why you should define named concepts and build on them rather than repeating trait expressions inline - only the shared named concept creates the subsumption relationship.",
        codeExample: `template <class T> concept Range = requires (T& t) {
    std::ranges::begin(t); std::ranges::end(t);
};
template <class T> concept SizedRange = Range<T> && requires (T& t) {
    std::ranges::size(t);
};
template <class T> concept ContiguousRange = SizedRange<T> && requires (T& t) {
    { std::ranges::data(t) } -> std::is_pointer;
};

void process(Range auto&& r)            { /* generic walk */ }
void process(SizedRange auto&& r)       { /* can reserve */ }
void process(ContiguousRange auto&& r)  { /* memcpy fast path */ }

std::list<int>   l; process(l);   // Range only
std::deque<int>  d; process(d);   // SizedRange wins over Range
std::vector<int> v; process(v);   // ContiguousRange wins over both
// No negations, no mutual exclusivity, no ambiguity.

// Subsumption is SYNTACTIC, not semantic:
template <class T> concept A = std::is_integral_v<T>;
template <class T> concept B = std::is_integral_v<T> && sizeof(T) >= 4;
// B subsumes A: both mention the SAME atomic constraint is_integral_v<T>.

template <class T> concept C = std::integral<T>;                 // different
template <class T> concept D = std::is_integral_v<T> && sizeof(T) >= 4;
// D does NOT subsume C - std::integral<T> and std::is_integral_v<T> are
// different atomic constraints even though they are always equal.
// Overloads on C and D would be AMBIGUOUS.

// Therefore: build concepts from concepts.
template <class T> concept MyInt   = std::integral<T>;
template <class T> concept MyBigInt = MyInt<T> && sizeof(T) >= 4;   // subsumes

// The equivalent enable_if version needs manual disjointness:
template <class T, std::enable_if_t<std::is_integral_v<T> &&
                                    !(sizeof(T) >= 4), int> = 0>
void old_process(T);                       // must negate the other condition
template <class T, std::enable_if_t<std::is_integral_v<T> &&
                                    sizeof(T) >= 4, int> = 0>
void old_process(T);
// Adding a third overload means editing both existing ones. Concepts do not.`
      },
      {
        title: "CRTP: The Derived Class as a Template Argument",
        content:
          "The Curiously Recurring Template Pattern has a class derive from a base parameterised on itself: class Widget : public Base<Widget>. Because the base knows its derived type at compile time, it can static_cast this to Derived* and call the derived class's members, which gives it the shape of a virtual call with none of the cost. This is how you write a base that implements a whole interface in terms of a small set of primitives the derived class supplies - the classic example being an ordering mixin that derives all six comparison operators from one, or a counter that tracks instances per derived type. The technique has two structural requirements worth internalising. The cast is only valid if the derived class really does derive from that instantiation, which is why the base's constructor is usually made private with the derived class a friend. And the base cannot use the derived type's members in its own class body at namespace scope, because Derived is incomplete at that point - member function bodies are fine because they are instantiated later.",
        codeExample: `template <class Derived>
class Comparable {
    // The cast helpers - the entire pattern in two lines
    const Derived& self() const { return static_cast<const Derived&>(*this); }
public:
    bool operator!=(const Comparable& o) const { return !(self() == o.self()); }
    bool operator> (const Comparable& o) const { return o.self() < self(); }
    bool operator<=(const Comparable& o) const { return !(o.self() < self()); }
    bool operator>=(const Comparable& o) const { return !(self() < o.self()); }
private:
    Comparable() = default;              // only Derived can construct...
    friend Derived;                      // ...which blocks the CRTP mistake
};

struct Money : Comparable<Money> {
    long cents;
    bool operator==(const Money& o) const { return cents == o.cents; }
    bool operator< (const Money& o) const { return cents <  o.cents; }
};
// Money now has all six operators, inlined, with no vtable.

// Static interface: base defines the algorithm, derived supplies the steps
template <class Derived>
struct Serializer {
    std::string run(const Node& n) {
        auto& d = static_cast<Derived&>(*this);
        std::string out = d.open_tag(n);
        for (auto& c : n.children) out += run(c);
        return out + d.close_tag(n);
    }
};
struct JsonSerializer : Serializer<JsonSerializer> {
    std::string open_tag(const Node&)  { return "{"; }
    std::string close_tag(const Node&) { return "}"; }
};
// run() inlines open_tag/close_tag completely. A virtual version could not.

// Per-derived-type static state, impossible with a plain base:
template <class Derived>
struct InstanceCounter {
    static inline std::size_t live = 0;      // one counter PER Derived
    InstanceCounter()  { ++live; }
    ~InstanceCounter() { --live; }
};

// The incompleteness rule:
template <class D> struct Bad : D::Base {};        // ERROR: D incomplete
template <class D> struct Ok {
    void f() { static_cast<D*>(this)->impl(); }    // FINE: body instantiated later
};

// enable_shared_from_this is CRTP in the standard library:
struct Session : std::enable_shared_from_this<Session> {
    void start() { auto keepalive = shared_from_this(); /* ... */ }
};`,
        diagram: asciiDiagram(`Virtual dispatch vs CRTP static dispatch

  RUNTIME POLYMORPHISM                 COMPILE-TIME (CRTP)
  ────────────────────                 ───────────────────

  struct Base {                        template <class D>
    virtual void step() = 0;           struct Base {
    void run() { step(); }               void run() {
  };                                       static_cast<D*>(this) . step();
                                         }
  struct Impl : Base {                 };
    void step() override;
  };                                   struct Impl : Base<Impl> {
                                         void step();
                                       };

  Object layout                        Object layout
  ┌──────────────┐                     ┌──────────────┐
  │ vptr  ───────┼──► vtable           │  (empty base │
  ├──────────────┤    ┌───────────┐    │   optimised  │
  │ data         │    │ &step     │    │   away)      │
  └──────────────┘    └───────────┘    ├──────────────┤
   +8 bytes/object                     │ data         │
                                       └──────────────┘
                                        +0 bytes/object

  Call sequence for  run()
  ────────────────────────
   virtual:   load vptr  →  load slot  →  indirect call
              │             │              │
              └─ 1 cache line, may miss    └─ usually blocks inlining

   CRTP:      static_cast is a no-op  →  direct call  →  INLINED
                                                          │
                                                          ▼
                                              step()'s body is fused
                                              into run(); optimiser
                                              sees the whole thing

  Trade-off
  ┌──────────────────────┬───────────────┬─────────────────────┐
  │                      │   virtual     │      CRTP           │
  ├──────────────────────┼───────────────┼─────────────────────┤
  │ heterogeneous store  │  vector<Base*>│  impossible         │
  │ common base type     │  yes          │  no (each distinct) │
  │ per-object cost      │  1 pointer    │  0                  │
  │ code size            │  one copy     │  one PER derived    │
  │ ABI stable across    │  yes          │  no (header-only)   │
  │ dispatch decided     │  run time     │  compile time       │
  └──────────────────────┴───────────────┴─────────────────────┘`)
      },
      {
        title: "Mixins, Policy Classes, and Composing CRTP",
        content:
          "CRTP scales into mixin composition: a derived class inherits several CRTP bases at once, each contributing an orthogonal slice of behaviour parameterised on the final type. Ordering, printing, serialisation, cloning, and reference counting are all natural mixins, and because the bases are typically empty they compose at zero object-size cost. A closely related technique is the policy class, where behaviour is injected as a template parameter rather than a base - std::unique_ptr's deleter and the allocator parameters throughout the standard library are policies. The distinction is direction: a policy is something the class uses, while a CRTP base is something that uses the class. Both replace run-time indirection with compile-time selection, and both trade binary size and compile time for speed and inlining. The practical rule for choosing against virtual functions is whether you need a heterogeneous collection or a stable ABI; if you do, virtual wins regardless of the performance argument.",
        codeExample: `// Orthogonal mixins, all empty, all composed
template <class D> struct Printable {
    friend std::ostream& operator<<(std::ostream& os, const D& d) {
        return d.print(os);
    }
};
template <class D> struct Cloneable {
    std::unique_ptr<D> clone() const {
        return std::make_unique<D>(static_cast<const D&>(*this));
    }
};
template <class D> struct Hashable {
    std::size_t hash() const {
        return static_cast<const D&>(*this).hash_impl();
    }
};

struct Point : Printable<Point>, Cloneable<Point>, Hashable<Point> {
    int x, y;
    std::ostream& print(std::ostream& os) const { return os << x << ',' << y; }
    std::size_t hash_impl() const { return x * 31 + y; }
};
static_assert(sizeof(Point) == 2 * sizeof(int));   // EBO: bases cost nothing

// Policy-based design: behaviour passed IN rather than inherited
template <class T, class Growth = DoublingGrowth, class Alloc = std::allocator<T>>
class Vec {
    std::size_t next_capacity(std::size_t n) const { return Growth::next(n); }
};
struct DoublingGrowth  { static std::size_t next(std::size_t n) { return n ? n*2 : 1; } };
struct GoldenGrowth    { static std::size_t next(std::size_t n) { return n + n/2 + 1; } };
// Zero-cost: Growth::next is a static call the optimiser inlines to arithmetic.

// Constraining a CRTP base with a concept - the two features together
template <class D>
concept HasCompare = requires (const D& a, const D& b) {
    { a.compare(b) } -> std::convertible_to<int>;
};

template <class D> requires HasCompare<D>
struct Ordered {
    // NOTE: the constraint on D cannot be checked until D is complete,
    // so it is applied at member instantiation, not at class definition.
    bool operator<(const Ordered& o) const {
        return static_cast<const D&>(*this).compare(static_cast<const D&>(o)) < 0;
    }
};

// C++23 deducing this removes the cast entirely - no CRTP needed
struct Modern {
    template <class Self>
    auto&& chain(this Self&& self) { return std::forward<Self>(self); }
    // 'self' already has the derived type; no static_cast, no template base.
};`
      },
      {
        title: "Choosing Between Concepts, CRTP, and Virtual",
        content:
          "These three mechanisms answer different questions and are not interchangeable. Concepts constrain what types a template accepts; they add no dispatch and no structure, only checking and overload ordering. CRTP gives compile-time dispatch and code reuse when every call site knows the concrete type, which is the case for value-semantic types, mathematical objects, and library mixins. Virtual functions give run-time dispatch through a common base type, which is required whenever you need a heterogeneous container, plugin loading, a stable binary interface across a library boundary, or a type chosen by configuration at run time. The decision procedure is short: if you need to store different types together behind one pointer, use virtual and stop. If not, prefer CRTP or plain templates constrained by concepts, and reach for type erasure - std::function, or a hand-rolled small-buffer-optimised wrapper - when you want value semantics with run-time dispatch, which is the fourth option people forget.",
        codeExample: `// 1. Heterogeneous collection required -> virtual
struct Shape { virtual double area() const = 0; virtual ~Shape() = default; };
std::vector<std::unique_ptr<Shape>> scene;      // impossible with CRTP

// 2. Concrete type known at each call site -> CRTP / templates + concepts
template <class T> concept Shapelike = requires (const T& s) {
    { s.area() } -> std::convertible_to<double>;
};
double total(Shapelike auto const&... shapes) { return (shapes.area() + ...); }
// Fully inlined, no vtable, but every shape type is a distinct instantiation.

// 3. Value semantics + run-time dispatch -> type erasure
class AnyShape {
    struct Base { virtual double area() const = 0;
                  virtual std::unique_ptr<Base> clone() const = 0;
                  virtual ~Base() = default; };
    template <Shapelike T> struct Model : Base {
        T v;
        explicit Model(T v) : v(std::move(v)) {}
        double area() const override { return v.area(); }
        std::unique_ptr<Base> clone() const override {
            return std::make_unique<Model>(*this);
        }
    };
    std::unique_ptr<Base> p_;
public:
    template <Shapelike T> AnyShape(T v)
        : p_(std::make_unique<Model<T>>(std::move(v))) {}
    AnyShape(const AnyShape& o) : p_(o.p_->clone()) {}
    double area() const { return p_->area(); }
};
std::vector<AnyShape> values;    // heterogeneous AND copyable, no inheritance
                                 // required of the stored types

// 4. Constrain, do not inherit, when you only need checking
template <std::ranges::random_access_range R>
    requires std::sortable<std::ranges::iterator_t<R>>
void my_sort(R&& r) { std::sort(std::ranges::begin(r), std::ranges::end(r)); }

// Diagnostic quality, the everyday payoff:
//   my_sort(std::list<int>{});
//   error: constraints not satisfied
//     note: 'std::list<int>' does not satisfy 'random_access_range'
//     note: because 'iterator_t<list<int>>' does not satisfy
//           'random_access_iterator'`
      }
    ],
    examples: [
      {
        title: "A requires-expression that is always true",
        input: "template <class T> concept Small = requires { sizeof(T) <= 8; }; used to constrain an overload.",
        output: "Every type satisfies Small, including types far larger than eight bytes.",
        explanation:
          "Step 1: A simple requirement inside a requires-expression asks only whether the expression is well-formed, never whether it is true.\nStep 2: The expression sizeof(T) <= 8 is well-formed for every complete type, since sizeof always yields a size_t and comparison with a literal always compiles.\nStep 3: The requires-expression therefore evaluates to true unconditionally, and the concept silently constrains nothing.\nStep 4: The fix is a nested requirement, written requires sizeof(T) <= 8 inside the braces, where the leading requires means evaluate this as a boolean rather than merely check that it parses.\nStep 5: The simpler alternative is to skip the requires-expression entirely and define the concept as the boolean expression directly - concept Small = sizeof(T) <= 8 - which is what you want whenever no validity testing is involved, and which makes this whole class of bug impossible."
      },
      {
        title: "Two logically equivalent concepts producing an ambiguity",
        input: "One overload constrained on std::integral<T>, another on std::is_integral_v<T> && sizeof(T) >= 4, called with an int.",
        output: "A compile error reporting the call as ambiguous, despite one constraint being strictly stronger in meaning.",
        explanation:
          "Step 1: Subsumption works by decomposing each constraint into atomic constraints and comparing them for identity of the source expression, not for logical equivalence.\nStep 2: std::integral<T> and std::is_integral_v<T> are different expressions written in different places, so the compiler treats them as unrelated atoms even though they always produce the same answer.\nStep 3: Neither constraint set is therefore a superset of the other, no candidate is more constrained, and overload resolution has no tiebreaker left.\nStep 4: The fix is to build the second concept from the first - concept BigIntegral = std::integral<T> && sizeof(T) >= 4 - so both mention the identical atom and subsumption applies.\nStep 5: The general discipline this implies is to define a vocabulary of named concepts once and refine them by conjunction, rather than repeating trait expressions inline, because only the shared name creates the ordering relationship the mechanism depends on."
      },
      {
        title: "A CRTP base cast to the wrong derived type",
        input: "struct A : Base<A> {}; struct B : Base<A> {}; where B mistakenly names A as the CRTP argument.",
        output: "Undefined behaviour when any Base member is called on a B - typically silent memory corruption rather than a compile error.",
        explanation:
          "Step 1: Base<A>'s members perform static_cast<A*>(this), which the compiler accepts because Base<A> is a base of A and downcasting from base to derived is a legal static_cast.\nStep 2: When the object is actually a B, that cast produces a pointer to an A that does not exist, since B is not an A, and the standard makes the resulting access undefined.\nStep 3: Nothing diagnoses this at compile time, and in practice the layouts often overlap enough that the code appears to work until the two classes' member offsets diverge.\nStep 4: The standard prevention is to make Base's constructor private and declare friend Derived, so only the class named as the template argument can ever construct the base - B's attempt to construct Base<A> then fails at compile time with a clear access error.\nStep 5: A static_assert(std::is_base_of_v<Base, Derived>) inside a member function is a useful supplement, deferred into a member body because Derived is incomplete in the class body itself."
      }
    ],
    tips: [
      "Build concepts by refining other named concepts rather than repeating trait expressions, because subsumption compares atomic constraints by source identity and only shared names create an ordering.",
      "Use a nested requires inside a requires-expression whenever you mean 'this must be true' - a bare expression only asks whether it compiles.",
      "Give a CRTP base a private constructor and friend Derived, which turns the class of bug where the wrong type is passed from undefined behaviour into a compile error."
    ],
    tricks: [
      "Constrain a member function rather than the whole class - void sort() requires random_access_iterator<It> - so a container instantiates for weaker iterators but rejects only the operations it cannot support.",
      "The abbreviated form void f(Numeric auto v) is the shortest constrained signature and behaves identically to a constrained template parameter.",
      "C++23's deducing this replaces most CRTP entirely: a template<class Self> member taking this Self&& self already has the derived type, with no template base and no static_cast."
    ],
    memoryAids: [
      "A requires-expression asks 'does this compile?'; a nested requires asks 'is this true?' - forgetting the second requires is the classic silent-always-true bug.",
      "More constrained wins, but only when the constraints are literally built from the same named pieces.",
      "CRTP is a base class that knows its child - virtual dispatch turned upside down and resolved at compile time."
    ],
    interviewPatterns: [
      "'Rewrite this enable_if overload set with concepts and explain what improves.' They want subsumption, diagnostics, and the removal of manual negations.",
      "'When would you choose CRTP over a virtual base?' The expected answer is the heterogeneous-container test plus the code-size and ABI trade-offs.",
      "Frequency and companies: very common at Bloomberg, Jane Street, Nvidia, and HFT firms; often extended into 'now implement type erasure' as the third option."
    ],
    practiceProblems: [
      "Why can a CRTP base not use Derived's nested types in its own class body? Answer: at the point the base is instantiated as a base-class specifier, Derived is still an incomplete type - its definition is not finished until the closing brace - so any use requiring completeness is ill-formed; member function bodies escape this because they are instantiated only when called, by which time Derived is complete, and the standard workaround for genuinely needing a type is a separate traits class specialised for each derived type.",
      "Implement a concept that requires T to be hashable by std::hash. Answer: concept Hashable = requires (const T& t) { { std::hash<T>{}(t) } -> std::convertible_to<std::size_t>; }; the compound requirement checks both that the expression is valid and that its type converts appropriately, and it correctly rejects types for which std::hash is only declared but left undefined, since instantiating the call fails.",
      "You need a collection of shapes that is copyable, requires no common base, and dispatches at run time. Answer: type erasure - an internal abstract Base with a clone method, a Model<T> template implementing it for each concrete type, and an outer value class holding a unique_ptr with a copy constructor that clones; this gives value semantics and heterogeneity simultaneously, which neither plain virtual inheritance nor CRTP can, at the cost of an allocation and an indirect call per operation."
    ],
    faq: [
      {
        question: "What exactly does subsumption do and why does it not work between logically equivalent constraints?",
        answer:
          "Subsumption is the partial ordering the compiler uses to break ties between constrained candidates that are otherwise equally viable. It normalises each candidate's constraint into a conjunctive-disjunctive form built from atomic constraints, where an atomic constraint is an expression that is not itself a concept or a && or || of other constraints, and then asks whether one candidate's normal form logically implies the other's. If it does, that candidate is more constrained and is preferred. The critical restriction is that two atomic constraints are considered equivalent only when they originate from the same expression at the same source location, with the same parameter mapping. That means std::integral<T> and std::is_integral_v<T> are different atoms despite always producing the same value, and even two identical-looking expressions written in two different concept definitions are different atoms. The rule exists for a good reason: deciding logical equivalence of arbitrary constant expressions is undecidable in general, so the standard chose a syntactic criterion that is cheap and predictable rather than a semantic one that would be neither. The practical consequence is a design discipline. Establish a small vocabulary of named concepts, define more specific ones as Existing<T> && extra, and never re-expand a concept's definition inline when you want ordering. Failing to do this produces ambiguity errors that look absurd, because the two constraints obviously differ in strength to a human reader."
      },
      {
        question: "Why is a bare expression in a requires-expression not checked for truth?",
        answer:
          "Because the primary purpose of a requires-expression is to test validity, not value, and validity is what the pre-concepts detection idioms were all straining to express. A simple requirement such as t.draw(c) exists to ask whether that call would compile for the given type, and the answer is a property of the type's interface rather than of any run-time or compile-time value. Requiring truth would be meaningless for most such expressions, since t.draw(c) has no boolean value at all. The design therefore makes validity the default and provides the nested requires form for the cases where you want the value. This is genuinely a trap, because sizeof(T) <= 8 and std::is_integral_v<T> both look like conditions and both are valid expressions for every type, so a concept written with them as simple requirements is unconditionally satisfied and silently constrains nothing. Compilers have added warnings for the most obvious cases, but the general form is not diagnosable. Two habits avoid it entirely. First, when a concept is purely a boolean condition with no validity testing, define it directly as that condition rather than wrapping it in a requires-expression - concept Small = sizeof(T) <= 8 needs no braces at all. Second, when a requires-expression genuinely mixes both kinds, write the boolean ones as nested requirements and read every requires-expression back asking of each line whether you meant does this compile or is this true."
      },
      {
        question: "When is CRTP genuinely better than virtual functions, and when is it not?",
        answer:
          "CRTP is better when every call site knows the concrete type, the dispatch is on the hot path, and the operations are small enough that inlining changes the generated code qualitatively. The classic wins are value-semantic types such as numeric or geometric classes, operator mixins where the base derives a full comparison or arithmetic interface from one or two primitives, expression templates in linear algebra libraries, and per-derived-type static state such as instance counters or type registries, which a non-template base cannot express at all. In these cases the base is empty, so objects pay nothing, and the static_cast is erased entirely, so calls inline into their callers and the optimiser sees through the abstraction. CRTP is the wrong choice whenever you need a heterogeneous collection, because Base<A> and Base<B> are unrelated types with no common base to point at, so vector<Base*> is simply not expressible. It is also wrong across a stable ABI boundary, since every instantiation is header-only code compiled into the client, meaning a change to the base requires recompiling everything. And it is wrong when the derived type is selected at run time by configuration or plugin loading, since the choice must be encoded in the type system at compile time. The cost people underestimate is binary size and compile time: a hundred derived types produce a hundred copies of every base member, which can dominate in large codebases. When you need run-time dispatch with value semantics, type erasure is the answer rather than either extreme."
      },
      {
        question: "Does C++23's deducing this make CRTP obsolete?",
        answer:
          "It makes a large fraction of CRTP unnecessary but does not eliminate the pattern. Deducing this lets a member function declare its own object parameter explicitly as template <class Self> auto f(this Self&& self), and Self is deduced as the actual most-derived type at the call site, including its cv-qualification and value category. That directly replaces the CRTP static_cast, so a mixin base can call into the derived class without being parameterised on it at all, which removes the awkward Base<Derived> declaration, removes the risk of naming the wrong derived class, and lets a single non-template base serve every derived type. It also solves problems CRTP never did, notably the quadruple overload set for const, non-const, lvalue and rvalue qualified members, which collapses to one template, and recursive lambdas, which previously needed the Y-combinator trick. What it does not do is provide per-derived-type static state, since a non-template base has one copy of any static member shared across all derived types, so an instance counter still needs CRTP. It also does not help when the base needs the derived type as a type rather than as an object - for a return type, a nested typedef, or a template argument - because Self is only available inside function bodies. And of course it requires C++23 and a recent compiler, which rules it out for most production codebases today. The reasonable position is that new code targeting C++23 should reach for deducing this first and use CRTP only for the cases it cannot cover."
      },
      {
        question: "How should I structure concepts for a library so they compose well?",
        answer:
          "Follow the pattern the standard library itself uses for ranges and iterators, which is a layered hierarchy of small named concepts, each defined by refining the one below it. Start with the smallest meaningful requirements - the standard's examples are movable, copyable, equality_comparable, totally_ordered - and build compound concepts as conjunctions of those names plus whatever is new at that level. This gives you three things simultaneously. Subsumption works, because every layer literally mentions the atoms of the layer below, so an overload constrained on the stronger concept automatically beats one constrained on the weaker. Diagnostics improve, because a failure reports the specific sub-concept that was not satisfied rather than a single opaque expression, and compilers walk the hierarchy to show the innermost failing requirement. And users can constrain at whatever granularity they need rather than being forced to take your whole interface. Two further pieces of advice matter in practice. Separate syntactic requirements, which the compiler checks, from semantic ones, which it cannot - the standard documents things like the complexity guarantees of sized_range and the requirement that copies compare equal as prose accompanying the concept, and your library should do the same, because a type can satisfy a concept syntactically while violating its intent. And avoid over-constraining: a concept that lists every operation your current implementation happens to use will reject valid types the moment you refactor, so state what the contract needs, not what the code touches."
      },
      {
        question: "What is type erasure and why is it presented as a third option alongside virtual and CRTP?",
        answer:
          "Type erasure is a technique for getting run-time polymorphism without requiring the polymorphic types to share a base class or know anything about the interface they are being used through. The implementation is a small internal hierarchy hidden inside a value class: an abstract Base declaring the operations, a Model<T> template deriving from it that stores a T and forwards each operation to the corresponding member of T, and an outer class holding a unique_ptr to Base with a templated constructor that wraps any suitable T in a Model. The outer class has value semantics - it can be copied, assigned, and stored in a vector by value - while dispatch happens through the hidden virtual calls. std::function is the standard library's most familiar example, and std::any and std::shared_ptr's deleter are others. It belongs in this comparison because it occupies the quadrant the other two leave empty. Virtual inheritance gives run-time dispatch but forces reference semantics and demands that every participating type derive from your base, which is impossible for types you do not own such as int or a third-party class. CRTP gives value semantics and zero-cost dispatch but cannot produce a heterogeneous collection. Type erasure gives both value semantics and heterogeneity, at the cost of an allocation per object unless you add a small-buffer optimisation, and an indirect call per operation. Concepts pair naturally with it: constrain the templated constructor on the concept your Model requires, and a type that does not fit is rejected at the point of construction with a clear message rather than deep inside Model's instantiation."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - Constraints and concepts, requires-expression, the <concepts> library",
        insight: "Normative rules for constraint normalisation, subsumption, and every standard concept."
      },
      {
        source: "paper",
        attribution: "Andrew Sutton et al - P0734 (Concepts) and Sutter/Revzin P0847 (Deducing this, C++23)",
        insight: "The design rationale for subsumption and the feature that supersedes most CRTP uses."
      },
      {
        source: "book",
        attribution: "Andrei Alexandrescu - Modern C++ Design; Sean Parent - Inheritance Is The Base Class of Evil",
        insight: "Policy-based design and the case for type erasure with value semantics over inheritance hierarchies."
      }
    ]
  }
];
