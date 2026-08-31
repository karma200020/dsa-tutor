import { Topic } from "../syllabus";

const asciiDiagram = (art: string): string =>
  `<pre style="margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#a5f3fc;white-space:pre;text-align:left;overflow-x:auto;">${art}</pre>`;

export const cppModernTopics: Topic[] = [
  {
    id: "topic-cpp-modern-standard-evolution",
    moduleId: "mod-cpp-modern",
    title: "C++11 to C++23: What Changed and Why It Matters",
    intuition:
      "Modern C++ is not a collection of new syntax so much as a change in what the default correct answer is. Before C++11 the default was manual resource management, output parameters, and copying; after it the default is RAII, value semantics with cheap moves, and letting the compiler deduce what it can. Each standard since has continued the same programme: C++14 filled in what C++11 shipped incomplete, C++17 removed boilerplate and added vocabulary types, C++20 delivered the four features that had been in progress for a decade, and C++23 has been consolidation. Knowing which standard introduced what matters in interviews because it tells the interviewer whether you have kept up.",
    complexity: {
      time:
        "Most modern features are zero-overhead abstractions that compile to the same code as the manual version - a range-based for loop, structured bindings, and if constexpr all cost nothing at runtime. The exceptions worth knowing: std::function costs an indirect call and possibly an allocation, exceptions cost nothing on the non-throwing path but microseconds when thrown, and shared_ptr costs an atomic increment per copy. Compile time is where modern C++ genuinely costs: heavy template metaprogramming and header-only libraries can dominate build times, which is what modules address.",
      space:
        "Vocabulary types have predictable sizes worth memorising: std::string_view and std::span are two pointers or a pointer and a length, sixteen bytes; std::optional<T> is sizeof(T) plus a bool plus padding; std::variant is the largest alternative plus a discriminator index; std::function is typically thirty-two bytes with small-object optimisation for small callables; std::shared_ptr is sixteen bytes plus a separately allocated control block. Lambdas are exactly the size of their captures, and a capture-free lambda is an empty type."
    },
    lesson: [
      {
        title: "C++11 and C++14: The Foundation",
        content:
          "C++11 was the largest change the language has ever undergone and it introduced most of what people mean by modern C++: move semantics and rvalue references, which made returning containers by value cheap and reshaped how types are designed; auto and decltype; lambdas; the smart pointers; the threading library together with the memory model; uniform initialisation; constexpr; variadic templates; and a long list of smaller items including nullptr, scoped enums, range-based for, override and final, and defaulted and deleted functions. C++14 was deliberately a small release fixing what shipped incomplete: make_unique, which C++11 forgot; generic lambdas taking auto parameters; return type deduction for ordinary functions; relaxed constexpr allowing loops and multiple statements; and variable templates.",
        codeExample: `// C++11: the changes that reshaped how code is written
auto x = compute();                       // type deduction
auto lambda = [captured](int a) { return a + captured; };
std::unique_ptr<T> p = std::make_unique<T>();   // ...C++14, actually
std::vector<int> v = {1, 2, 3};                 // initializer_list
for (const auto& item : v) use(item);           // range-based for
std::thread t(work);                            // threads + memory model
constexpr int kSize = 4 * 1024;                 // compile-time constants
template <class... Ts> void f(Ts&&... args);    // variadic templates
enum class Color { Red, Green };                // scoped enums
void g() noexcept;                              // noexcept
struct D : B { void f() override; };            // override
struct N { N(const N&) = delete; };             // = delete
T* p = nullptr;                                 // nullptr, not NULL

// Move semantics - the single most consequential addition
std::vector<std::string> make() {
    std::vector<std::string> result;
    result.reserve(1000);
    // ...fill...
    return result;          // moved (or elided), not copied
}
// Before C++11 this idiom was avoided and output parameters were the
// norm. After it, returning by value became the default, which
// changed API design across the entire ecosystem.

// C++11 also fixed the >> parsing wart and gave us:
std::function<int(int)> f = [](int x) { return x * 2; };
using Vec = std::vector<int>;             // alias, better than typedef
template <class T> using Ptr = std::unique_ptr<T>;   // ALIAS TEMPLATE,
                                          // which typedef cannot do
static_assert(sizeof(int) == 4, "");      // compile-time checks
auto&& r = f();                           // forwarding reference
decltype(auto) h();                       // ...C++14

// C++14: filling the gaps
auto p2 = std::make_unique<Widget>(1, 2);        // C++11 forgot this
auto add = [](auto a, auto b) { return a + b; }; // GENERIC lambda
auto square(auto x) { return x * x; }            // ...actually C++20;
auto square14(int x) { return x * x; }           // C++14 deduces return
constexpr int factorial(int n) {                 // RELAXED constexpr:
    int r = 1;                                   // loops and multiple
    for (int i = 2; i <= n; ++i) r *= i;         // statements now legal
    return r;
}
template <class T> constexpr T pi = T(3.14159265358979);  // variable
                                                          // template
auto lam = [p = std::make_unique<T>()] { use(*p); };  // INIT-CAPTURE,
                                          // which enables move-capture
std::integer_sequence<int, 0, 1, 2>;      // for tuple expansion

// Where 'auto' earns its place, and where it does not
auto it = container.begin();              // YES - the type is noise
auto p3 = std::make_shared<Widget>();     // YES - stated on the right
auto total = compute_total();             // MAYBE - hides the type
auto x2 = 0;                              // int
auto y = 0.0f;                            // float
auto z = v.size();                        // size_t, NOT int - this is
                                          // exactly why auto helps
// The classic bug auto prevents:
std::unordered_map<std::string, int> m;
for (const std::pair<std::string, int>& e : m) {}   // COPIES EVERY
                        // ENTRY: value_type is pair<const string, int>
for (const auto& e : m) {}                          // no copy`,
        diagram: asciiDiagram(`The standards timeline and what each one was for

  C++98/03  ┌────────────────────────────────────────────────┐
            │ templates, STL, exceptions                     │
            │ manual memory, output parameters, copying      │
            └────────────────────────────────────────────────┘
                                │
  C++11     ┌────────────────────────────────────────────────┐
  (huge)    │ MOVE SEMANTICS ── returning by value became    │
            │   cheap, which reshaped every API              │
            │ auto, lambdas, smart pointers                  │
            │ THREADS + THE MEMORY MODEL                     │
            │ constexpr, variadic templates, nullptr         │
            │ range-based for, override/final, =delete       │
            └────────────────────────────────────────────────┘
                                │
  C++14     ┌────────────────────────────────────────────────┐
  (patch)   │ make_unique      ← C++11 forgot it             │
            │ generic lambdas  [](auto a)                    │
            │ relaxed constexpr ── loops allowed             │
            │ init-capture     [p = move(ptr)]               │
            └────────────────────────────────────────────────┘
                                │
  C++17     ┌────────────────────────────────────────────────┐
  (polish)  │ structured bindings   auto [a, b] = pair       │
            │ if constexpr          ← killed most SFINAE     │
            │ optional / variant / any / string_view         │
            │ CTAD, fold expressions, filesystem             │
            │ GUARANTEED copy elision                        │
            └────────────────────────────────────────────────┘
                                │
  C++20     ┌────────────────────────────────────────────────┐
  (huge)    │ CONCEPTS   ── readable template constraints    │
            │ RANGES     ── composable algorithms            │
            │ COROUTINES ── suspendable functions            │
            │ MODULES    ── the header replacement           │
            │ spaceship <=>, designated init, jthread        │
            │ constinit/consteval, std::format, span         │
            └────────────────────────────────────────────────┘
                                │
  C++23     ┌────────────────────────────────────────────────┐
  (consol.) │ std::expected, mdspan, print                   │
            │ deducing this, if consteval                    │
            │ ranges::to, flat_map, stacktrace               │
            └────────────────────────────────────────────────┘

  the through-line
    ┌──────────────────────────────────────────────────────┐
    │  1998: the programmer manages resources and types    │
    │  2011: RAII and moves make ownership explicit        │
    │  2017: vocabulary types remove hand-rolled unions,   │
    │        error codes, and pointer+length pairs         │
    │  2020: the compiler is told INTENT (concepts,        │
    │        ranges) rather than mechanism                 │
    └──────────────────────────────────────────────────────┘`)
      },
      {
        title: "C++17: Removing Boilerplate and Adding Vocabulary",
        content:
          "C++17 is the release that most improves everyday code without requiring you to learn a new paradigm. Structured bindings destructure pairs, tuples, arrays, and aggregates into named variables, which finally makes iterating a map readable. if constexpr discards the untaken branch at compile time, which replaced the majority of SFINAE and tag dispatch with ordinary-looking code. Class template argument deduction lets you write a template's name without its arguments. The vocabulary types - optional, variant, any, and string_view - give standard spellings for things every codebase had hand-rolled. And guaranteed copy elision changed prvalues from objects that might be elided into pure initialisers, which makes returning immovable types legal.",
        codeExample: `// Structured bindings - finally readable map iteration
std::map<std::string, int> scores;
for (const auto& [name, score] : scores)
    std::cout << name << ": " << score << "\\n";
auto [it, inserted] = scores.insert({"x", 1});
auto [q, r] = std::div(17, 5);
struct Point { int x, y; };
auto [px, py] = get_point();              // works on aggregates too
// Note: bindings cannot be declared static or constexpr before C++20,
// and cannot be captured by a lambda before C++20 either.

// if constexpr - the untaken branch is DISCARDED, not just skipped
template <class T>
std::string to_string(const T& v) {
    if constexpr (std::is_arithmetic_v<T>) {
        return std::to_string(v);
    } else if constexpr (requires { v.to_string(); }) {   // C++20
        return v.to_string();
    } else {
        return std::string(v);
    }
}
// The discarded branch is not instantiated, so it may contain code
// that would not compile for this T. That is what makes it a
// replacement for SFINAE rather than merely nicer than 'if'.
// It only works on a DEPENDENT condition inside a template.

// CTAD - deduce class template arguments from the constructor
std::pair p{1, 2.0};                      // pair<int, double>
std::vector v{1, 2, 3};                   // vector<int>
std::lock_guard lk(m);                    // lock_guard<std::mutex>
std::array a{1, 2, 3};                    // array<int, 3>
// Deduction guides customise it:
template <class It> vector(It, It) -> vector<typename
    std::iterator_traits<It>::value_type>;

// optional - "a value, or nothing", with no sentinel convention
std::optional<Config> load(const std::string& path);
if (auto cfg = load("app.conf")) use(*cfg);
int port = cfg.value_or(8080);
// .value() throws bad_optional_access; operator* is UB if empty.
// Do NOT use optional for errors - it discards the reason. Use
// std::expected (C++23) or an error code.

// variant - a type-safe tagged union
std::variant<int, std::string, double> v2 = 42;
std::visit([](const auto& x) { std::cout << x; }, v2);
if (auto* i = std::get_if<int>(&v2)) use(*i);
int n = std::get<int>(v2);                // throws bad_variant_access
// Never empty except in the "valueless by exception" state, which
// occurs only if a move constructor throws during assignment.

// string_view - a non-owning view, and a dangling hazard
void log(std::string_view msg);           // takes const char*, string,
log("literal");                           //   and substrings with
log(str);                                 //   NO allocation
std::string_view bad = std::string("temp");   // DANGLES immediately
// Never store a string_view whose owner you do not control.

// Guaranteed copy elision changed the model
struct NoMove { NoMove(const NoMove&) = delete;
                NoMove(NoMove&&) = delete; NoMove(int); };
NoMove make() { return NoMove(42); }      // LEGAL in C++17: the
NoMove n = make();                        // prvalue IS the object;
                                          // there is no copy to elide
// Before C++17 a copy or move constructor had to be accessible even
// when the compiler elided the call.

// Other C++17 items worth knowing
[[nodiscard]] int compute();              // warn if the result is
[[maybe_unused]] int debug_only;          //   discarded
[[fallthrough]];                          // in a switch
namespace a::b::c {}                      // nested namespace
if (auto p = get(); p != nullptr) use(p); // init-statement in if
template <class... Ts> auto sum(Ts... ts) { return (ts + ...); } // fold
inline int counter = 0;                   // INLINE VARIABLE: a header
                                          // can define a global
std::filesystem::path pth{"/tmp/x"};      // filesystem
std::string_view sv = "x"sv;              // literals
std::sort(std::execution::par, v.begin(), v.end());  // parallel algos`
      },
      {
        title: "C++20: Concepts, Ranges, Coroutines, Modules",
        content:
          "C++20 delivered the four large features that had been in development for a decade, plus a long tail of smaller improvements that are arguably more useful day to day. Concepts replace SFINAE with named, readable constraints and produce error messages that name the failed requirement instead of dumping an instantiation backtrace. Ranges make algorithms composable and eliminate the iterator-pair boilerplate, with lazy views that avoid materialising intermediates. Coroutines provide suspendable functions, though with no standard scheduler until C++26. Modules replace headers with a compiled interface, promising large build-time improvements, though tooling support has lagged badly. The smaller additions - the spaceship operator, designated initialisers, std::format, std::span, constinit and consteval, and jthread - are the ones most code will actually use first.",
        codeExample: `// CONCEPTS - constraints that read like English and fail clearly
template <class T>
concept Numeric = std::integral<T> || std::floating_point<T>;

template <Numeric T> T add(T a, T b) { return a + b; }
auto add2(Numeric auto a, Numeric auto b) { return a + b; }   // terse
template <class T> requires Numeric<T> T add3(T a, T b);      // requires

template <class T>
concept Container = requires(T c) {
    typename T::value_type;
    { c.size() } -> std::convertible_to<std::size_t>;
    c.begin(); c.end();
};
// Error messages now say "constraint Numeric<std::string> not
// satisfied" rather than producing 200 lines of instantiation trace.
// Standard concepts live in <concepts>: same_as, derived_from,
// convertible_to, integral, invocable, equality_comparable, ...

// RANGES - composable, lazy, no iterator pairs
namespace rv = std::views;
auto evens = data
           | rv::filter([](int n) { return n % 2 == 0; })
           | rv::transform([](int n) { return n * n; })
           | rv::take(5);
for (int x : evens) use(x);        // NOTHING is computed until here
std::ranges::sort(v);              // no v.begin(), v.end()
std::ranges::find(v, 42);
// Views are lazy and non-owning, so they are cheap to compose and
// DANGEROUS to store: a view over a temporary dangles. C++23's
// ranges::to<vector>() materialises one safely.

// SPACESHIP - one operator generates all six comparisons
struct Version {
    int major, minor, patch;
    auto operator<=>(const Version&) const = default;   // < <= > >=
    bool operator==(const Version&) const = default;    // == !=
};
// Defaulted <=> compares members lexicographically. The three
// categories: strong_ordering (substitutable), weak_ordering
// (equivalent but distinguishable), partial_ordering (floats, where
// NaN is unordered with everything).

// DESIGNATED INITIALISERS - named aggregate init
struct Options { int timeout = 30; bool verbose = false; int retries = 3; };
Options o{.timeout = 60, .retries = 5};
// Must be in declaration order, and C++ (unlike C) forbids skipping
// around or mixing with positional initialisers.

// std::format - type-safe, fast, printf-like
std::string s = std::format("{} scored {:.2f} in {:>8}", name, 3.14159, tag);
std::print("{}\\n", s);                    // C++23
// Roughly 5-10x faster than iostreams and immune to the format-string
// type mismatches printf allows.

// std::span - a non-owning view over contiguous memory
void process(std::span<const int> data);  // accepts vector, array,
process(vec); process(arr); process({ptr, n});     // C-array, or raw
// Replaces the (pointer, length) parameter pair, and carries the
// length so .size() and range-for work. Same dangling caveat as
// string_view: it does not own.

// constinit and consteval sharpen constexpr's meaning
constexpr  int a = f();      // MAY be compile-time
consteval  int g(int x) { return x * 2; }   // MUST be compile-time
constinit  int c = h();      // guarantees CONSTANT INITIALISATION,
                             // which kills the static init order
                             // fiasco, but the object is mutable

// MODULES - the header replacement
// math.ixx
export module math;
export int add(int a, int b) { return a + b; }
int helper();                 // not exported: invisible to importers
// main.cpp
import math;
// Benefits: no textual inclusion so no macro leakage, no include
// guards, order-independent, and a compiled interface parsed once
// rather than per translation unit - build-time wins can be large.
// Reality: build system support is still immature in 2024, mixing
// modules and headers is awkward, and the standard library module
// (import std;) only arrived in C++23.

// Smaller C++20 items that see immediate use
std::jthread t(work);                     // auto-joining, stop token
auto v2 = std::make_shared<int[]>(10);    // shared arrays
if (std::is_constant_evaluated()) { }     // branch on the context
constexpr std::vector<int> cv;            // constexpr allocation
[[likely]] [[unlikely]]                   // branch hints
using enum Color;                         // C++20: unqualified enum
std::atomic<T>::wait / notify_one;        // futex-like waiting
std::source_location::current();          // replaces __FILE__/__LINE__
std::bit_cast<float>(bits);               // type punning without UB`
      },
      {
        title: "C++23 and What Is Coming",
        content:
          "C++23 is a consolidation release that finishes several C++20 features rather than opening new directions. The most consequential addition is std::expected, a result type carrying either a value or an error, which gives the standard a vocabulary for recoverable failure that neither exceptions nor optional provided. std::mdspan gives a multidimensional view over contiguous memory, which matters enormously for numerical code. Deducing this allows a member function to take its object parameter explicitly, which removes the const and reference-qualified overload duplication and makes recursive lambdas straightforward. ranges::to finally materialises a view into a container. And import std makes modules usable for the standard library itself. Looking ahead, C++26 is expected to bring std::execution for asynchronous composition, reflection, contracts, and hazard pointers.",
        codeExample: `// std::expected - a value or an error, with monadic composition
std::expected<Config, ParseError> parse(std::string_view text);
auto cfg = parse(input);
if (cfg) use(*cfg); else report(cfg.error());
// Composition without nested ifs:
auto result = parse(input)
            .and_then(validate)          // called only on success
            .transform(normalise)        // maps the value
            .or_else(load_defaults);     // called only on failure
// Why not optional? optional discards WHY it failed. Why not
// exceptions? expected makes failure part of the signature and costs
// nothing on the failure path, which matters for expected failures
// such as parsing user input - exceptions remain right for
// genuinely exceptional conditions.

// DEDUCING THIS - the explicit object parameter
struct Widget {
    // One template replaces four overloads:
    template <class Self>
    auto&& data(this Self&& self) { return std::forward<Self>(self).data_; }
    // Previously required:
    //   Data&        data() &;
    //   const Data&  data() const&;
    //   Data&&       data() &&;
    //   const Data&& data() const&&;
    std::vector<int> data_;
};
// Also makes a recursive lambda trivial, which previously needed the
// Y-combinator trick or a std::function:
auto fib = [](this auto self, int n) -> int {
    return n < 2 ? n : self(n - 1) + self(n - 2);
};
// And enables CRTP without the template base class.

// std::mdspan - a multidimensional non-owning view
std::vector<double> storage(rows * cols);
std::mdspan matrix(storage.data(), rows, cols);
matrix[i, j] = 1.0;                       // C++23 multi-arg subscript
// Layouts are policies: layout_right (row-major, the default),
// layout_left (column-major, for BLAS interop), layout_stride.
// This is the foundation for a future std::linalg.

// ranges::to - materialise a view
auto v = data | std::views::filter(pred)
              | std::views::transform(f)
              | std::ranges::to<std::vector>();
// Before C++23 this needed an explicit loop or a copy with a
// back_inserter, which undercut the whole point of pipelines.

// Other C++23 items
std::print("{} items\\n", n);              // no <iostream> needed
import std;                                // the whole library as a
                                           // module
if consteval { fast_path(); } else { runtime_path(); }
std::stacktrace::current();                // portable stack traces
std::flat_map<K, V> fm;                    // sorted-vector map: far
                                           // better cache behaviour
                                           // than std::map
std::move_only_function<void()> f;         // fixes std::function's
                                           // copyable requirement
auto s = std::string(v | std::views::join);
[[assume(x > 0)]];                         // optimiser hint
std::byteswap(x); std::to_underlying(e);   // small utilities

// Looking ahead to C++26 (expected)
//   std::execution (P2300) - senders and receivers, the standard
//     model for asynchronous composition; the missing scheduler for
//     coroutines
//   static reflection - inspect types at compile time, which removes
//     the need for most code generation and macro tricks
//   contracts - pre/postconditions checked as a language feature
//   std::hazard_pointer and std::rcu - safe memory reclamation for
//     lock-free structures
//   pattern matching (possibly) - a proper 'inspect' over variants

// Practical advice on which standard to target
//   C++17 is the safe baseline: universally supported, and it
//     contains most of the ergonomic wins
//   C++20 for new projects: concepts and ranges materially improve
//     template code; avoid modules until your toolchain is ready
//   C++23 where your compiler supports it: expected and deducing
//     this are genuinely valuable
//   Check compiler support tables rather than assuming; feature
//     adoption is uneven and __cpp_lib_* macros exist to test it
#if __cpp_lib_expected >= 202202L
    // use std::expected
#endif`,
        diagram: asciiDiagram(`Error handling: choosing a mechanism

  ┌──────────────────────────────────────────────────────────────┐
  │ EXCEPTIONS                                                   │
  │   cost: ZERO on the non-throwing path                        │
  │         microseconds when thrown (table lookup, unwinding)   │
  │   pros: cannot be ignored; propagates automatically through  │
  │         intermediate frames; works in constructors           │
  │   cons: invisible control flow; banned in many embedded and  │
  │         game codebases; unusable across an ABI boundary      │
  │   USE FOR: genuinely exceptional conditions                  │
  └──────────────────────────────────────────────────────────────┘
                              │
  ┌──────────────────────────────────────────────────────────────┐
  │ std::optional<T>                                             │
  │   says: "a value, or nothing"                                │
  │   loses: WHY there is nothing                                │
  │   USE FOR: lookups where absence is normal and unexplained   │
  │            map::find, parsing an optional field              │
  └──────────────────────────────────────────────────────────────┘
                              │
  ┌──────────────────────────────────────────────────────────────┐
  │ std::expected<T, E>   (C++23)                                │
  │   says: "a value, or THIS error"                             │
  │   cost: no allocation, no unwinding; failure is as cheap     │
  │         as success                                           │
  │   composes:                                                  │
  │       parse(in)                                              │
  │         .and_then(validate)     ← only on success            │
  │         .transform(normalise)   ← maps the value             │
  │         .or_else(defaults)      ← only on failure            │
  │   USE FOR: EXPECTED failures — parsing input, network calls, │
  │            anything the caller must decide about             │
  └──────────────────────────────────────────────────────────────┘
                              │
  ┌──────────────────────────────────────────────────────────────┐
  │ error codes / std::error_code                                │
  │   cons: silently ignorable ([[nodiscard]] helps)             │
  │   pros: ABI-stable, no unwinding, C-compatible               │
  │   USE FOR: library boundaries and C interop                  │
  └──────────────────────────────────────────────────────────────┘

  DECISION
        can the caller do anything about it?
                    │
          ┌─────────┴─────────┐
         no                  yes
          │                    │
          ▼                    ▼
      throw            is the failure ROUTINE?
                              │
                    ┌─────────┴─────────┐
                   yes                  no
                    │                    │
                    ▼                    ▼
          does the reason         throw, or return
          matter?                 expected if the
             │                    caller must branch
        ┌────┴────┐
       yes        no
        │          │
        ▼          ▼
    expected   optional`)
      },
      {
        title: "Migrating and the Cost of Modernising",
        content:
          "Adopting a newer standard in an existing codebase is mostly a matter of sequencing, because the value is concentrated in a few changes and the risk is concentrated in others. The high-value, low-risk moves are replacing owning raw pointers with unique_ptr, replacing manual loops with algorithms or ranges, adding override and noexcept where they document intent, and replacing NULL and typedef with nullptr and using. The changes that need care are enabling a newer standard flag, since each release makes small breaking changes; adopting modules, whose tooling remains immature; and reaching for template metaprogramming, which trades runtime cost for compile time and reviewer comprehension. The honest measure of modernisation is whether the code is easier to reason about, not how many recent features appear in it.",
        codeExample: `// The high-value migrations, roughly in order

// 1. Owning raw pointers -> unique_ptr. Eliminates a whole class of
//    leaks and makes ownership visible in the type.
Widget* w = new Widget;  delete w;              // before
auto w2 = std::make_unique<Widget>();           // after

// 2. Manual loops -> algorithms, then ranges
for (std::size_t i = 0; i < v.size(); ++i)      // before
    if (v[i] > threshold) out.push_back(v[i]);
auto out2 = v | std::views::filter([&](int x) { return x > threshold; })
              | std::ranges::to<std::vector>(); // after

// 3. Output parameters -> return by value (moves make it free)
void get_names(std::vector<std::string>& out);  // before
std::vector<std::string> names();               // after

// 4. Small documenting changes with real payoff
void f() noexcept;                  // enables move optimisations in
                                    // vector reallocation
void g() override;                  // catches signature typos
[[nodiscard]] Result compute();     // catches ignored results
using Vec = std::vector<int>;       // instead of typedef
T* p = nullptr;                     // instead of NULL

// 5. SFINAE -> if constexpr or concepts
template <class T>
typename std::enable_if<std::is_integral<T>::value, T>::type f(T x);
template <std::integral T> T f2(T x);           // C++20, readable

// WHAT TO BE CAREFUL WITH

// Each standard makes small breaking changes:
//   C++11: 'auto' changed meaning; >> now closes templates
//   C++17: removed auto_ptr, random_shuffle, and the register
//          keyword; changed some evaluation order rules
//   C++20: 'requires' and 'concept' became keywords; comparison
//          rewriting can change overload resolution in code that
//          defined operator== and operator!= separately
//   C++23: some deprecated items removed
// Compile with -Wall -Wextra and fix warnings BEFORE bumping -std.

// std::function is a common over-reach
std::function<void(int)> cb = [](int x) { use(x); };
// Costs: an indirect call, possibly a heap allocation, and it
// requires the target to be COPYABLE (which packaged_task is not).
template <class F> void with(F&& f) { f(42); }   // zero-overhead
// Use std::function only when the type must be erased and stored.

// Template metaprogramming trades runtime for compile time
// A 200-line constexpr computation that saves a nanosecond but adds
// four seconds to every build, and which no reviewer can follow, is
// a net loss. Measure both sides.

// Do not modernise for its own sake
auto x = std::make_unique<int>(compute());   // an int on the heap
int x2 = compute();                          // just use a value

// Migration sequencing that works
//   1. Turn on warnings and fix them
//   2. Bump the standard flag, fix what breaks, change nothing else
//   3. Introduce smart pointers at ownership boundaries
//   4. Replace loops with algorithms where it clarifies intent
//   5. Adopt concepts in template-heavy code
//   6. Leave modules until the build system genuinely supports them
// Each step should compile and pass tests on its own.

// Tooling that does the work for you
//   clang-tidy -checks=modernize-*        automated fixes for many
//                                          of the above
//   include-what-you-use                  header hygiene
//   -Wall -Wextra -Wpedantic -Werror      the baseline
//   -fsanitize=address,undefined          find the bugs modernising
//                                          is meant to prevent`
      }
    ],
    examples: [
      {
        title: "A range-for over a map that silently copies every entry",
        input: "for (const std::pair<std::string, int>& entry : my_unordered_map) with a map of ten thousand entries.",
        output: "Every iteration constructs a temporary pair, copying the key string, despite the loop variable being a const reference.",
        explanation:
          "Step 1: The value_type of a map is std::pair<const Key, T>, with the key qualified const, not std::pair<Key, T>.\nStep 2: The declared reference type therefore does not match the element type, so the compiler must create a temporary of the declared type by converting each element, which copies the key string.\nStep 3: Binding a const reference to that temporary is legal and extends its lifetime to the end of the iteration, so the code compiles cleanly and produces correct results while performing an allocation per entry.\nStep 4: Writing const auto& deduces the exact element type, std::pair<const std::string, int> const&, so no conversion and no copy occurs - which is the single strongest everyday argument for auto in range-based for loops.\nStep 5: C++17 structured bindings make the intent clearer still, since for (const auto& [key, value] : map) both avoids the copy and names the parts, and it is worth noting that clang-tidy's performance-for-range-copy check catches the original form automatically."
      },
      {
        title: "if constexpr replacing a SFINAE overload set",
        input: "A serialisation function previously implemented as three enable_if overloads for arithmetic types, types with a to_string member, and everything else.",
        output: "A single function with three if constexpr branches, with the untaken branches never instantiated.",
        explanation:
          "Step 1: The SFINAE version required each overload's return type to encode its own condition and to encode the negation of the others' conditions, or the overloads would be ambiguous, which is why such sets are fragile and grow quadratically.\nStep 2: if constexpr evaluates a compile-time condition and discards the untaken branch entirely rather than merely skipping it at runtime, so the discarded branch is never instantiated and may contain expressions that would be ill-formed for the current template argument.\nStep 3: That discarding property is exactly what SFINAE provided, which is why if constexpr replaces the majority of SFINAE uses while reading as ordinary control flow.\nStep 4: The restriction is that the condition must be dependent on a template parameter for the discarding to apply, since in a non-template context both branches must be valid, and that the discarded branch is still parsed and must be syntactically well-formed.\nStep 5: In C++20 the remaining cases are better served by concepts, which additionally give overload ordering by constraint subsumption and error messages naming the failed requirement rather than a several-hundred-line instantiation backtrace."
      },
      {
        title: "Choosing expected over optional for a parser",
        input: "A configuration parser previously returning std::optional<Config>, where callers could not report what went wrong.",
        output: "std::expected<Config, ParseError> gives the caller the reason and composes with and_then and or_else.",
        explanation:
          "Step 1: optional models the presence or absence of a value and deliberately carries no reason, which is correct for a lookup where absence is unremarkable and wrong for a parse where the caller needs to tell the user which line failed.\nStep 2: The alternatives before C++23 were throwing, which makes failure invisible in the signature and is banned outright in many embedded and game codebases, or returning a pair or an out-parameter plus a status, which callers routinely ignore.\nStep 3: expected makes both the success type and the error type part of the signature, so the caller must acknowledge the failure to obtain the value, and it costs nothing on the failure path since no unwinding or allocation occurs.\nStep 4: Its monadic operations - and_then to chain another fallible step, transform to map the success value, and or_else to supply a fallback - collapse what would otherwise be a staircase of nested conditionals into a linear pipeline that short-circuits on the first error.\nStep 5: The judgement to state in an interview is that exceptions remain correct for genuinely exceptional conditions and for constructors, which cannot return anything, while expected is the right tool for failures that are part of the function's normal contract - and that mixing both deliberately, rather than banning either, is the mature position."
      }
    ],
    tips: [
      "Prefer const auto& in a range-based for over a map, because naming std::pair<Key, T> instead of std::pair<const Key, T> silently copies every entry.",
      "Use if constexpr instead of SFINAE for dispatching on type properties, since the discarded branch is not instantiated and the code reads as ordinary control flow.",
      "Reach for std::function only when the callable type must be erased and stored; a template parameter passes any callable with no indirection and no allocation."
    ],
    tricks: [
      "Guaranteed copy elision in C++17 makes returning an immovable type legal, because a prvalue is now an initialiser rather than an object that might be copied.",
      "constinit forces constant initialisation without making the object const, which eliminates the static initialisation order fiasco for mutable globals.",
      "Deducing this collapses four const and reference-qualified accessor overloads into one template and makes recursive lambdas trivial."
    ],
    memoryAids: [
      "C++11 built the foundation, 14 patched it, 17 removed boilerplate, 20 delivered the big four, 23 consolidated.",
      "optional says nothing is here; expected says here is why nothing is here.",
      "if constexpr discards, plain if merely skips - discarding is what replaces SFINAE."
    ],
    interviewPatterns: [
      "'What is your favourite C++17 or C++20 feature and why?' is a calibration question; a specific answer with a concrete before-and-after beats a list.",
      "'When would you use exceptions versus expected versus error codes?' tests engineering judgement rather than syntax recall.",
      "Frequency and companies: nearly universal as an opener at any C++ shop; the follow-up is usually about move semantics or RAII."
    ],
    practiceProblems: [
      "Why was guaranteed copy elision in C++17 a language change rather than an optimisation? Answer: before C++17 a prvalue denoted a temporary object that the compiler was permitted but not required to elide, so a copy or move constructor had to be accessible even when no call was emitted; C++17 redefined a prvalue as an initialiser that does not materialise an object until required, so returning a prvalue directly initialises the destination and there is no copy to elide, which makes returning a type with deleted copy and move constructors legal and removes an observable difference between compilers.",
      "Give two reasons std::function may be the wrong choice for a callback parameter. Answer: first, it type-erases, which costs an indirect call the compiler cannot inline and a heap allocation when the callable exceeds the small-object buffer of roughly sixteen bytes, whereas a template parameter passes the exact type and inlines completely; second, it requires the target to be copy-constructible, which excludes move-only callables such as a lambda capturing a unique_ptr or a std::packaged_task - the standard workaround was wrapping in a shared_ptr, and C++23's std::move_only_function fixes it properly.",
      "What breaks when you compile existing C++17 code as C++20? Answer: requires and concept become keywords, so identifiers with those names fail; comparison operator rewriting means a class defining operator== and a separate operator!= can now see different overload resolution, and a non-const operator== can cause ambiguity; the implicit capture of this by a lambda using [=] is deprecated; some aggregate initialisation rules tightened so a class with user-declared constructors is no longer an aggregate; and u8 string literals changed type to char8_t, which breaks assignment to const char*."
    ],
    faq: [
      {
        question: "Which C++ standard should a new project target?",
        answer:
          "C++20 for most new work, with C++17 as the conservative fallback and C++23 where you control the toolchain. C++17 is the safe baseline because support is universal across GCC, Clang, and MSVC, and it contains the majority of the ergonomic improvements: structured bindings, if constexpr, the vocabulary types optional and variant and string_view, class template argument deduction, and guaranteed copy elision. Code written to C++17 is unlikely to encounter compiler gaps, and most distributions ship a compiler that handles it fully. C++20 is the better choice for new projects because concepts and ranges materially improve template-heavy code - concepts turn instantiation backtraces into one-line constraint failures, and ranges eliminate iterator-pair boilerplate while composing lazily - and because std::format, std::span, designated initialisers, jthread, and the spaceship operator each remove a recurring annoyance. The caveat is modules: the language feature is specified but build system and tooling support remains uneven, so adopting C++20 while continuing to use headers is the pragmatic path. C++23 is worth targeting when you control the compiler, principally for std::expected, deducing this, ranges::to, and std::print, all of which are immediately useful, but support is still partial in shipping compilers. Whichever you pick, test feature availability with the __cpp_lib_ feature-test macros rather than assuming that a compiler claiming a standard implements all of it, since adoption is per-feature and notoriously uneven - and check cppreference's compiler support tables before depending on anything recent."
      },
      {
        question: "Are modules worth adopting yet?",
        answer:
          "The design is sound and the eventual benefits are large, but as of the mid-2020s the tooling is not ready for most projects. The promise is real: a module is compiled once into a binary interface rather than being textually included into every translation unit, which removes the quadratic parsing cost that dominates C++ build times, and it eliminates macro leakage, include guards, and order dependence because a module's internals are genuinely private rather than merely conventionally so. Reported build-time improvements on projects that have converted range from significant to dramatic. The problems are practical. Build systems must understand a new dependency structure, since modules must be compiled in dependency order and that order is discovered by scanning source files rather than declared - CMake gained support only recently and it remains fiddly. The compiled interface formats are compiler-specific and not portable, so distributing a module-based library means distributing source. Mixing modules with headers, which every real project must do because its dependencies are header-based, is awkward and the global module fragment exists specifically to paper over it. Support differs across the three major compilers, with MSVC furthest along and GCC and Clang catching up unevenly. And import std, which makes the standard library usable as a module, only arrived in C++23. The reasonable position for now is to write code that would convert easily - keep headers clean, avoid macro dependence across boundaries - and to adopt modules when your build system, your compiler, and your dependencies all support them, which for most teams means waiting rather than pioneering."
      },
      {
        question: "When should I use exceptions rather than returning an error?",
        answer:
          "The dividing question is whether the caller can reasonably be expected to handle the failure at the call site. Exceptions suit conditions that are genuinely exceptional - the ones where most intermediate frames have nothing useful to do and the handling belongs several levels up - because they propagate automatically without every frame having to forward an error, and because they cannot be silently ignored the way a returned code can. They are also the only mechanism available in a constructor, since a constructor returns nothing, which is why RAII types rely on them. Their cost profile favours this use: modern table-based implementations impose no runtime cost on the path where nothing is thrown, so the fast path is genuinely free, but throwing costs microseconds because unwinding involves table lookups and destructor calls. That makes exceptions a poor fit for failures that occur routinely, such as parsing user input or a lookup miss, where the cost is paid constantly and the caller always wants to branch immediately. For those, std::expected in C++23 is the right tool: the failure type is part of the signature so the caller cannot ignore it, no unwinding occurs, and the monadic operations compose fallible steps without nesting. std::optional serves the narrower case where absence needs no explanation. Error codes remain appropriate at ABI boundaries and for C interoperability, where exceptions cannot cross. The other consideration is that entire domains ban exceptions - most game engines, much embedded work, and some trading systems compile with -fno-exceptions because of code size, deterministic latency, or an inability to unwind - and in those codebases expected or error codes are the only options available. The mature answer in an interview is that both mechanisms are correct for different failure categories and that a codebase should use both deliberately."
      },
      {
        question: "What is the most common way people misuse modern C++ features?",
        answer:
          "Reaching for a heavier tool than the situation requires, usually because the feature is new and interesting. The most frequent instance is std::shared_ptr used where unique_ptr or a plain value would do: shared ownership is rare in practice, the atomic reference counting costs on every copy, and cycles leak silently, so shared_ptr should be the answer only when ownership genuinely is shared and its lifetime cannot be structured. Close behind is std::function for callback parameters, which type-erases, prevents inlining, and may allocate, where a template parameter would pass the callable with zero overhead - std::function is for storing heterogeneous callables, not for passing one. A third is auto used where the type carries information the reader needs, which trades a small amount of typing for a real loss of local comprehension; auto is at its best when the type is stated on the right-hand side or is genuinely noise, as with an iterator. A fourth is template metaprogramming applied to problems that a runtime branch would solve, which converts nanoseconds of runtime into seconds of build time on every compilation and produces code future maintainers cannot modify. A fifth, specific to C++20, is storing a view: views are lazy and non-owning, so a view over a temporary dangles, and the fact that pipelines read beautifully makes it easy to forget they are references. And a sixth is over-applying noexcept, which is valuable on move constructors and swap because containers check it, and actively harmful where it is not actually guaranteed since a violation calls std::terminate rather than propagating. The unifying principle is that modern C++ is a larger toolbox, not a mandate to use every tool - the measure is whether the reader's job got easier."
      },
      {
        question: "How do concepts differ from SFINAE, beyond readability?",
        answer:
          "There are four substantive differences. The first is diagnostics, which is not merely cosmetic: a failed concept produces a message naming the constraint that was not satisfied and often the specific requirement within it, whereas a SFINAE failure removes the candidate from overload resolution and the eventual error reports only that no matching function was found, or produces a several-hundred-line instantiation backtrace when the failure occurs deeper. The second is subsumption, which is genuinely new capability: concepts form a partial order based on their logical decomposition, so a function constrained by a more specific concept is preferred over one constrained by a more general one, and the compiler works this out automatically. Achieving the same overload ordering with enable_if requires each overload to explicitly encode the negation of every other overload's condition, which grows quadratically and breaks whenever an overload is added. The third is that concepts constrain at declaration rather than at instantiation, so the constraint is part of the interface and appears in documentation and in error messages at the call site, whereas SFINAE conditions are buried in return types or defaulted template parameters. The fourth is composability: concepts combine with logical and, or, and negation, and can be defined in terms of one another, which makes a library of named constraints natural in a way that a library of enable_if expressions never was. What has not changed is the underlying mechanism - a failed constraint still removes the candidate rather than being a hard error, so the substitution-failure principle remains. For dispatching within a single function on a type property, if constexpr is usually better than either, and the modern division is roughly that concepts constrain interfaces while if constexpr selects implementations."
      },
      {
        question: "What are the dangling hazards in string_view, span, and ranges views?",
        answer:
          "All three are non-owning references with value semantics, which is a combination C++ programmers are not trained to be suspicious of, and that mismatch is the hazard. A std::string_view is a pointer and a length with no ownership, so constructing one from a temporary string - as happens when a function returning std::string is used directly to initialise a view, or when an implicit conversion creates a temporary - leaves the view pointing at memory freed at the end of the full expression. The same applies to std::span over a temporary vector and to any ranges view over a temporary range. What makes it worse than an obvious dangling pointer is that these types are cheap to copy and look like values, so they get stored in members, captured in lambdas, and returned from functions, each of which extends the lifetime of the reference far beyond the referent. The guidance that actually works is to treat them strictly as parameter types and short-lived locals: taking string_view or span as a function parameter is excellent and is the main reason they exist, since it accepts every contiguous source without allocating, but storing one as a class member requires you to own the lifetime relationship explicitly and to document it. Never return a view over a local. Be particularly careful with ranges pipelines, because the syntax encourages composing a view over the result of a function call, and C++20's borrowed_range machinery only catches some of these cases - C++23's ranges::to materialises a pipeline into a container and is the right way to store a result. Two further specifics: string_view is not guaranteed null-terminated, so passing data() to a C API is a bug unless you know the source was, and constructing a std::string from a dangling view is undefined rather than merely producing garbage."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Scott Meyers - Effective Modern C++",
        insight: "The canonical treatment of C++11 and C++14 idioms, particularly auto, smart pointers, and move semantics."
      },
      {
        source: "note",
        attribution: "cppreference - C++ compiler support tables and the feature-test macro list",
        insight: "Authoritative record of which compiler versions implement which features, and the __cpp_lib_ macros to test at build time."
      },
      {
        source: "blog",
        attribution: "isocpp.org Standard C++ Foundation - standard release summaries and the C++ Core Guidelines",
        insight: "Per-release feature lists plus the guidance on when each feature is the right tool."
      }
    ]
  },
  {
    id: "topic-cpp-modern-lambdas-and-captures",
    moduleId: "mod-cpp-modern",
    title: "Lambdas, Captures, and Callable Objects",
    intuition:
      "A lambda is not a special language entity so much as syntactic sugar for a compiler-generated class with an overloaded call operator, and once you see it that way every rule follows mechanically. The captures become member variables, so capturing by reference stores a reference that can dangle exactly as a member reference would; the body becomes operator() marked const by default, which is why mutating a by-value capture requires the mutable keyword; and a capture-free lambda has no members, which is why it can convert to a plain function pointer. Captures are where essentially all lambda bugs live, and the dangerous ones all involve reference capture outliving its referent.",
    complexity: {
      time:
        "Calling a lambda directly, or passing it as a template parameter, is inlined and costs exactly what the equivalent inline code costs - zero overhead. Storing it in a std::function costs an indirect call the compiler generally cannot inline, roughly two to five nanoseconds, plus a possible heap allocation on construction. Capturing by value copies each captured object at the point the lambda is created, so capturing a large container is a full copy; capturing by reference or by pointer is one word regardless of size.",
      space:
        "A lambda's closure type is exactly large enough for its captures, with the usual alignment and padding rules - a capture-free lambda is an empty class of size one, capturing a single int gives size four, and capturing a vector by value gives twenty-four bytes plus the heap allocation the copy performs. std::function adds type erasure with a small-object buffer of typically sixteen bytes on libstdc++, so a closure that fits is stored inline and one that does not triggers a heap allocation, which is a common hidden cost in callback-heavy code."
    },
    lesson: [
      {
        title: "The Closure Type and What Each Capture Means",
        content:
          "The compiler translates a lambda expression into a unique unnamed class type with a member for each capture and an operator() containing the body. Capturing by value copies the object into a member at the point the lambda is created, not at the point it is called, which matters when the captured variable changes afterwards. Capturing by reference stores a reference, so the lambda is only valid while the referent lives. The default captures, equals for by-value and ampersand for by-reference, apply to everything the body odr-uses, which makes them convenient and risky in equal measure - and neither captures member variables directly, because inside a member function they capture this, giving the lambda access to the whole object through a pointer that can dangle.",
        codeExample: `int x = 10; std::string s = "hello";

auto by_value = [x, s] { use(x, s); };   // copies BOTH
auto by_ref   = [&x, &s] { use(x, s); }; // references both
auto mixed    = [x, &s] { use(x, s); };
auto all_val  = [=] { use(x, s); };      // everything ODR-USED, by value
auto all_ref  = [&] { use(x, s); };      // everything used, by reference
auto init     = [p = std::move(ptr)] { use(*p); };   // C++14 init-capture
auto none     = [] { return 42; };       // captures nothing

// WHAT THE COMPILER GENERATES for [x, s]:
class __lambda_1 {
    int x;                                // by-value capture -> member
    std::string s;
public:
    __lambda_1(int x_, std::string s_) : x(x_), s(std::move(s_)) {}
    auto operator()() const { use(x, s); }   // CONST by default
};
// Every rule follows from this. 'mutable' removes the const:
int counter = 0;
auto inc = [counter]() mutable { return ++counter; };   // mutates the
inc(); inc();                        // MEMBER, not the original
assert(counter == 0);                // the outer variable is untouched

// Capture happens at CREATION, not at call
int n = 1;
auto f = [n] { return n; };
n = 99;
assert(f() == 1);                    // the copy was taken when f was made
auto g = [&n] { return n; };
n = 42;
assert(g() == 42);                   // the reference sees the change

// A capture-free lambda converts to a function pointer
void (*fp)() = [] { puts("hi"); };   // legal: no state to carry
// Anything capturing cannot, which is why C APIs taking a callback
// plus a void* user pointer need a trampoline:
auto trampoline = [](void* user) { (*static_cast<F*>(user))(); };
c_api_register(trampoline, &my_lambda);

// Capturing 'this' - the most dangerous default
class Widget {
    int value_ = 42;
    std::function<void()> cb_;
public:
    void setup() {
        cb_ = [this] { use(value_); };   // captures the POINTER, not
    }                                    // value_ and not a copy
    void setup_bad() {
        cb_ = [=] { use(value_); };      // IDENTICAL: [=] captures
    }                                    // 'this' by value, so value_
                                         // is reached through it.
                                         // Deprecated in C++20 for
                                         // exactly this confusion.
    void setup_safe() {
        cb_ = [*this] { use(value_); };  // C++17: copies the OBJECT
    }
    void setup_explicit() {
        cb_ = [value = value_] { use(value); };   // copy just the member
    }
};
// If the Widget is destroyed while cb_ is held elsewhere, the [this]
// versions are a use-after-free. C++20 deprecated implicit 'this'
// capture via [=] to make the dependency visible.

// Init-capture (C++14) - the only way to MOVE into a lambda
auto p = std::make_unique<Data>();
auto own = [p = std::move(p)] { use(*p); };      // lambda now owns it
auto named = [total = a + b] { return total; };  // compute at capture
auto ref = [&r = some_long_name] { use(r); };    // rename a reference
// Before C++14 there was no way to move-capture, and people used a
// shared_ptr or a hand-written functor.

// Generic lambdas (C++14) and templated lambdas (C++20)
auto add = [](auto a, auto b) { return a + b; };       // operator() is
auto fwd = [](auto&&... args) {                        // a template
    return f(std::forward<decltype(args)>(args)...);
};
auto tpl = []<class T>(const std::vector<T>& v) { return v.size(); };
// C++20's explicit template parameter list gives you the type name,
// which the 'auto' form could only reach through decltype.

// Other modern lambda features
auto ce = [](int n) constexpr { return n * 2; };       // C++17
static_assert(ce(21) == 42);
auto nx = []() noexcept { };
auto rec = [](this auto self, int n) -> int {          // C++23
    return n < 2 ? n : self(n - 1) + self(n - 2);      // recursion
};
auto attr = [](int n) [[nodiscard]] { return n; };`,
        diagram: asciiDiagram(`A lambda is a class: what the captures become

  SOURCE
  ┌──────────────────────────────────────────────────┐
  │  int x = 10;                                     │
  │  std::string s = "hi";                           │
  │  auto f = [x, &s](int n) { return x + n + s.size(); };  │
  └──────────────────────────────────────────────────┘
                        │
                        ▼  the compiler generates
  ┌──────────────────────────────────────────────────┐
  │  class __lambda_at_line_3 {                      │
  │      int x;              ← by-value  ⇒ a COPY    │
  │      std::string& s;     ← by-ref    ⇒ a REF     │
  │  public:                                         │
  │      __lambda(int x_, std::string& s_)           │
  │          : x(x_), s(s_) {}                       │
  │                                                  │
  │      auto operator()(int n) CONST {              │
  │          return x + n + s.size();                │
  │      }                          ▲                │
  │  };                             └── why mutating │
  │                                     x needs      │
  │                                     'mutable'    │
  └──────────────────────────────────────────────────┘

  SIZE OF THE CLOSURE
  ┌──────────────────────────────────────────────────┐
  │  []            {}   size 1   (empty class)       │
  │  [x]           {}   size 4   (one int)           │
  │  [&x]          {}   size 8   (one reference)     │
  │  [vec]         {}   size 24  + a heap COPY       │
  │  [&vec]        {}   size 8                       │
  │  [this]        {}   size 8   (a pointer)         │
  │  [*this]       {}   size of the whole object     │
  └──────────────────────────────────────────────────┘

  THE LIFETIME HAZARD
  ┌────────────────────────────────────────────────────────┐
  │  std::function<void()> make() {                        │
  │      int local = 42;                                   │
  │      return [&local] { use(local); };   ← stores a REF │
  │  }                                                     │
  │        │                                               │
  │        ▼  the frame is destroyed                       │
  │  ┌──────────────────────────────────┐                  │
  │  │  local   ✗ GONE                  │                  │
  │  └──────────────────────────────────┘                  │
  │        the returned closure still holds a reference    │
  │        to it  ⇒  use-after-free on the next call       │
  └────────────────────────────────────────────────────────┘

  THE 'this' TRAP
  ┌────────────────────────────────────────────────────────┐
  │  class W { int v_; void f() {                          │
  │      cb_ = [=] { use(v_); };                           │
  │  }};                                                   │
  │                                                        │
  │  [=] looks like "copy everything" but v_ is a MEMBER.  │
  │  There is no such variable in scope — the body means   │
  │  this.v_, so [=] captures 'this' BY VALUE:             │
  │                                                        │
  │      closure ──► this ──► W object                     │
  │                            ▲                           │
  │                            └── if W dies, the closure  │
  │                                dangles                 │
  │                                                        │
  │  C++20 DEPRECATED implicit this capture through [=].   │
  │  Use [this] to say it, [*this] to copy the object,     │
  │  or [v = v_] to copy just what you need.               │
  └────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Storing Callables: std::function and the Alternatives",
        content:
          "Every lambda has a distinct unnamed type, which is what makes passing one as a template parameter free but makes storing one in a container awkward. std::function solves that by type-erasing any callable with a compatible signature, at the cost of an indirect call the compiler usually cannot inline and a heap allocation when the closure exceeds its small-object buffer. It also imposes a requirement people forget: the stored callable must be copy-constructible, which excludes a lambda capturing a unique_ptr and excludes packaged_task, and which C++23's std::move_only_function finally fixes. For a parameter that is called and not stored, a template parameter is strictly better; for a member that stores a callback, function_ref in future standards or a raw function pointer plus context are the lighter alternatives.",
        codeExample: `// Passing a callable: template beats std::function
template <class F>
void for_each_row(const Table& t, F&& f) {     // ZERO overhead:
    for (const auto& r : t) f(r);              // f is inlined
}
void for_each_row(const Table& t, std::function<void(const Row&)> f);
// ^ indirect call, possible allocation, and it appears in the ABI

// STORING a callable is where std::function earns its place
class EventBus {
    std::vector<std::function<void(Event)>> handlers_;   // heterogeneous
public:
    void subscribe(std::function<void(Event)> h) {
        handlers_.push_back(std::move(h));
    }
};
// A template parameter cannot do this - each lambda has its own type.

// The costs, concretely
//   - one indirect call through a vtable-like pointer (~2-5 ns)
//   - SBO: libstdc++ stores up to 16 bytes inline; anything larger
//     heap-allocates on construction and on every copy
//   - copying a std::function may allocate
//   - it requires the target to be COPY-CONSTRUCTIBLE:
auto p = std::make_unique<Data>();
std::function<void()> f = [p = std::move(p)] { use(*p); };  // ERROR
// The classic workaround:
auto sp = std::make_shared<std::unique_ptr<Data>>(std::move(p));
std::function<void()> f2 = [sp] { use(**sp); };
// C++23 fixes it properly:
std::move_only_function<void()> f3 = [p = std::move(p)] { use(*p); };

// The callable spectrum, from lightest to heaviest
void (*fp)(int);                     // 8 bytes, no state, no allocation
auto lam = [x](int n) { };           // sizeof captures, inlines fully
template <class F> void g(F&&);      // zero overhead, cannot be stored
std::function<void(int)> sf;         // type-erased, indirect, may alloc
std::move_only_function<void(int)>;  // same, but move-only targets OK

// std::bind is obsolete - use a lambda
auto b = std::bind(f, _1, 42);                   // opaque, poor errors,
auto l = [](int a) { return f(a, 42); };         // nested binds are
                                                 // unreadable
// The exception: std::bind_front (C++20) is clean for the common case
auto bf = std::bind_front(&Widget::method, &w);  // partial application

// std::invoke unifies all the callable forms (C++17)
std::invoke(f, args...);                 // free function
std::invoke(&Widget::method, obj, args...);      // member function
std::invoke(&Widget::field, obj);                // member DATA pointer
// Generic code should use invoke rather than f(args...), because
// pointer-to-member requires the obj.*ptr syntax that plain call
// syntax cannot express.
template <class F, class... A>
decltype(auto) call(F&& f, A&&... a) {
    return std::invoke(std::forward<F>(f), std::forward<A>(a)...);
}

// Function objects still beat lambdas in one place: named types with
// state and multiple operations
struct LessByLength {
    bool operator()(const std::string& a, const std::string& b) const {
        return a.size() < b.size();
    }
};
std::set<std::string, LessByLength> s;    // the comparator must be a
                                          // TYPE, and before C++20 a
                                          // lambda had no default ctor
std::set<std::string, decltype(cmp)> s2{cmp};   // pre-C++20 spelling
std::set<std::string, decltype([](auto& a, auto& b){ return a < b; })> s3;
                                          // C++20: lambdas are
                                          // default-constructible if
                                          // capture-free

// The overload idiom - a visitor built from lambdas
template <class... Ts> struct Overload : Ts... { using Ts::operator()...; };
template <class... Ts> Overload(Ts...) -> Overload<Ts...>;   // CTAD
std::variant<int, std::string, double> v = 42;
std::visit(Overload{
    [](int i)                { std::cout << "int " << i; },
    [](const std::string& s) { std::cout << "str " << s; },
    [](double d)             { std::cout << "dbl " << d; }
}, v);
// Inherits operator() from each lambda and merges them into one
// overload set. The deduction guide is unnecessary in C++20.`
      },
      {
        title: "Lambdas in Algorithms and Ranges",
        content:
          "The immediate motivation for lambdas was that the standard algorithms required a named function object for anything non-trivial, which pushed the logic away from the call site and made the algorithms less attractive than a hand-written loop. With lambdas the predicate sits where it is used, and the algorithm's name states the intent - which is the real argument for using algorithms rather than loops, since find_if says what is happening in a way an index loop does not. Ranges extend this by removing the iterator pairs and by making views composable and lazy, so a filter followed by a transform followed by a take performs one pass and materialises nothing. The hazard that comes with the elegance is that views do not own, so a pipeline over a temporary dangles.",
        codeExample: `// Lambdas made algorithms usable
auto it = std::find_if(v.begin(), v.end(),
                       [threshold](const Item& i) { return i.score > threshold; });
std::sort(v.begin(), v.end(),
          [](const Item& a, const Item& b) { return a.name < b.name; });
v.erase(std::remove_if(v.begin(), v.end(),
                       [](const Item& i) { return i.expired; }),
        v.end());                          // erase-remove; C++20 has
std::erase_if(v, [](const Item& i) { return i.expired; });   // this

auto n = std::count_if(v.begin(), v.end(), pred);
bool ok = std::all_of(v.begin(), v.end(), pred);
auto total = std::accumulate(v.begin(), v.end(), 0L,
                             [](long acc, const Item& i) { return acc + i.size; });
std::transform(in.begin(), in.end(), std::back_inserter(out),
               [](const auto& x) { return convert(x); });

// C++20 ranges: no iterator pairs, and projections
std::ranges::sort(v, {}, &Item::name);     // sort BY a member, with
                                           // the default comparator
std::ranges::find(v, "target", &Item::name);
auto n2 = std::ranges::count_if(v, [](int x) { return x > 0; });
// The projection parameter removes most comparator lambdas entirely.

// Views: lazy, composable, single-pass
namespace rv = std::views;
auto pipeline = items
              | rv::filter([](const Item& i) { return i.active; })
              | rv::transform(&Item::score)
              | rv::take(10);
for (auto s : pipeline) use(s);      // ONE pass, no intermediate
                                     // containers allocated
auto total2 = std::ranges::fold_left(pipeline, 0, std::plus{});  // C++23

// THE DANGLING TRAP - views do not own
auto bad = get_vector() | rv::filter(pred);   // the temporary vector
for (auto x : bad) use(x);                    // is DESTROYED; UB
auto v2 = get_vector();                       // keep the owner alive
auto good = v2 | rv::filter(pred);
auto owned = get_vector() | rv::filter(pred)
                          | std::ranges::to<std::vector>();  // C++23:
                                                  // materialise safely

// Capturing by reference in a stored predicate is the same trap
std::function<bool(int)> make_pred() {
    int threshold = compute();
    return [&threshold](int x) { return x > threshold; };   // DANGLES
}                                    // 'threshold' dies here
std::function<bool(int)> make_pred2() {
    int threshold = compute();
    return [threshold](int x) { return x > threshold; };    // copies
}
// RULE: a lambda that outlives the enclosing scope must capture by
// value. Reference capture is for lambdas consumed immediately, which
// is the algorithm case.

// Immediately invoked lambda: complex initialisation of a const
const Config cfg = [&] {
    Config c;
    c.load(path);
    if (override_present) c.apply(overrides);
    return c;
}();                                 // note the trailing ()
// Lets a const object be built with multi-statement logic, which a
// single initialiser expression cannot express.

// Lambdas as scope guards
auto guard = [&] { cleanup(); };
// ...but a real scope guard needs a destructor:
template <class F> struct ScopeExit {
    F f; ~ScopeExit() { f(); }
};
template <class F> ScopeExit(F) -> ScopeExit<F>;
{
    ScopeExit se{[&] { close(fd); }};
    // ...cleanup runs on ANY exit, including an exception
}
// std::experimental::scope_exit, and C++26's std::scope_exit, do this.

// Recursion before C++23 needed a trick
std::function<int(int)> fact = [&fact](int n) {
    return n <= 1 ? 1 : n * fact(n - 1);
};   // works, but pays type erasure and captures itself by reference
auto fact2 = [](this auto self, int n) -> int {    // C++23, clean
    return n <= 1 ? 1 : n * self(n - 1);
};`,
        diagram: asciiDiagram(`Ranges pipelines: lazy evaluation, and where they dangle

  EAGER (algorithms + intermediate containers)
  ┌──────────────────────────────────────────────────────────┐
  │  items (10,000)                                          │
  │      │ copy_if                                           │
  │      ▼                                                   │
  │  temp1 (4,000)   ◄── ALLOCATION, full pass               │
  │      │ transform                                         │
  │      ▼                                                   │
  │  temp2 (4,000)   ◄── ALLOCATION, full pass               │
  │      │ take 10                                           │
  │      ▼                                                   │
  │  result (10)                                             │
  │                                                          │
  │  3 passes, 2 allocations, 8,000 wasted elements          │
  └──────────────────────────────────────────────────────────┘

  LAZY (views)
  ┌──────────────────────────────────────────────────────────┐
  │  items | filter(p) | transform(f) | take(10)             │
  │                                                          │
  │  NOTHING happens until iteration. Then, per element:     │
  │                                                          │
  │    item ──► filter: does p hold?                         │
  │                │ no  ──► skip, next item                 │
  │                │ yes                                     │
  │                ▼                                         │
  │             transform: apply f                           │
  │                │                                         │
  │                ▼                                         │
  │             take: 10 yielded yet?                        │
  │                │ no  ──► emit                            │
  │                │ yes ──► STOP the whole pipeline         │
  │                                                          │
  │  1 pass, 0 allocations, stops as soon as 10 are found    │
  └──────────────────────────────────────────────────────────┘

  THE DANGLING TRAP
  ┌──────────────────────────────────────────────────────────┐
  │  auto v = get_vector() | views::filter(pred);            │
  │             ▲                                            │
  │             └── a TEMPORARY vector                       │
  │                                                          │
  │  end of the full expression:                             │
  │      ┌────────────────────────┐                          │
  │      │ temporary vector  ✗    │  destroyed               │
  │      └────────────────────────┘                          │
  │                 ▲                                        │
  │      v ─────────┘  the view still refers to it           │
  │                                                          │
  │  iterating v is UNDEFINED BEHAVIOUR                      │
  └──────────────────────────────────────────────────────────┘

  three safe forms
    auto owner = get_vector();               keep the owner alive
    auto v = owner | views::filter(pred);

    auto v = get_vector()                    materialise (C++23)
           | views::filter(pred)
           | ranges::to<std::vector>();

    for (auto x : get_vector() | views::filter(pred)) { }
        ← legal: range-for extends the temporary's lifetime
          (and C++23 fixed the remaining hole for nested temporaries)`)
      },
      {
        title: "The Capture Bugs That Actually Happen",
        content:
          "Four lambda bugs account for nearly all of the real-world failures. A lambda that outlives its scope while capturing by reference is the classic, and it appears whenever a callback is stored rather than called immediately. Capturing this in a member function and storing the result creates the same problem indirectly, and it is worse because the default capture by equals does it silently - which is why C++20 deprecated that spelling. Capturing a reference parameter by value still copies only the reference's target at capture time, but capturing a pointer parameter copies the pointer, not what it points at. And in a coroutine or a thread, the moment of use is arbitrarily later than the moment of capture, so any reference capture is suspect by default. The discipline that avoids all four is simple: if the lambda might outlive the current statement, capture by value or with an explicit init-capture.",
        codeExample: `// BUG 1: reference capture outliving the scope
std::function<void()> make_task() {
    std::string name = load_name();
    return [&name] { log(name); };        // DANGLES on the first call
}
std::function<void()> fixed1() {
    std::string name = load_name();
    return [name = std::move(name)] { log(name); };   // owned
}

// BUG 2: capturing 'this' in a stored callback
class Session {
    Timer timer_;
    std::string id_;
public:
    void start() {
        timer_.on_expiry([this] { log(id_); });   // if 'this' is
    }                                             // destroyed before
};                                                // the timer fires,
                                                  // use-after-free
// Fixes, in order of preference:
//   a) guarantee the lifetime (the timer is a member, so it dies first)
//   b) capture what you need by value:  [id = id_]
//   c) capture a weak_ptr and check:
class Session2 : public std::enable_shared_from_this<Session2> {
    void start() {
        std::weak_ptr<Session2> w = weak_from_this();
        timer_.on_expiry([w] {
            if (auto self = w.lock()) self->log();   // safe
        });
    }
};

// BUG 3: [=] does NOT copy members
class Counter {
    int n_ = 0;
public:
    auto getter() { return [=] { return n_; }; }   // captures THIS.
};                                    // The returned lambda outlives
                                      // nothing here, but if the
                                      // Counter dies it dangles.
    auto getter2() { return [n = n_] { return n; }; }   // copies the
                                                        // VALUE
// C++20 deprecates the [=] form when it implicitly captures this,
// producing a warning - which is the whole point of the deprecation.

// BUG 4: threads and coroutines make every capture long-lived
void launch() {
    std::string msg = build();
    std::thread t([&msg] { log(msg); });   // 'msg' may die first
    t.detach();                             // guaranteed disaster
}
void launch_ok() {
    std::string msg = build();
    std::jthread t([msg = std::move(msg)] { log(msg); });   // owned
}
Task<void> coro(const std::string& s) {     // reference PARAMETER is
    co_await sleep(1s);                      // captured into the frame
    log(s);                                  // by reference: DANGLES
}
Task<void> coro_ok(std::string s) { co_await sleep(1s); log(s); }
// Coroutine parameters should be BY VALUE, for exactly this reason.

// SUBTLE: capturing a reference variable by value copies the TARGET
void f(const std::string& s) {
    auto lam = [s] { use(s); };     // copies the STRING - safe
    auto bad = [&s] { use(s); };    // captures the reference - the
}                                   // caller's object must outlive it

// SUBTLE: capturing a pointer copies the POINTER, not the pointee
void g(Widget* w) {
    auto lam = [w] { w->use(); };   // copies 8 bytes. If *w is
}                                   // destroyed, this dangles even
                                    // though the capture is "by value"

// SUBTLE: mutable captures are per-closure, not per-call
auto counter = [n = 0]() mutable { return ++n; };
counter(); counter();               // returns 1, then 2
auto copy = counter;                // the copy has its OWN n at 2
copy();                             // 3 - and 'counter' is unaffected

// SUBTLE: static and thread_local are never captured
static int s_count = 0;
auto lam = [] { return ++s_count; };   // legal with NO capture: a
                                       // static has no automatic
                                       // storage duration to capture
// The same applies to constexpr variables used only for their value.

// A checklist before writing a capture
//   Will this lambda outlive the current full expression?
//       yes -> capture by value, or init-capture a moved object
//       no  -> reference capture is fine and cheaper
//   Am I in a member function using a member?
//       -> that is a 'this' capture; write [this] or [member = m_]
//   Is this going to a thread, a coroutine, or a stored callback?
//       -> assume it outlives everything; capture by value
//   Am I capturing something expensive by value in a hot path?
//       -> move it in with an init-capture instead of copying`
      }
    ],
    examples: [
      {
        title: "A callback that dangles through an implicit this capture",
        input: "A member function storing cb_ = [=] { use(member_); } in a callback registry that outlives the object.",
        output: "A use-after-free when the callback fires after the object is destroyed, with no visible pointer in the source.",
        explanation:
          "Step 1: There is no variable named member_ in the enclosing scope; the name resolves to this->member_, so there is nothing for a by-value default capture to copy directly.\nStep 2: The equals default capture therefore captures this by value, meaning it stores the eight-byte pointer, and the lambda body reaches the member through it every time it runs.\nStep 3: The registry outlives the object, so when the callback fires the pointer refers to freed memory and reading the member is undefined behaviour that typically produces plausible-looking garbage rather than a crash.\nStep 4: The source contains no ampersand, no pointer, and no obvious reference, which is precisely why C++20 deprecated implicit this capture through the equals default - the deprecation warning is the fix's entry point.\nStep 5: The remedies in order of preference are to capture only what is needed by value with an init-capture, to capture star-this in C++17 to copy the whole object when it is cheap and copyable, or to capture a weak_ptr from enable_shared_from_this and lock it inside the callback, which is the correct pattern whenever the object's lifetime genuinely cannot be guaranteed."
      },
      {
        title: "A ranges pipeline over a temporary",
        input: "auto view = build_vector() | std::views::filter(pred); followed by iteration in a later statement.",
        output: "Undefined behaviour, because the temporary vector is destroyed at the end of the initialising full expression.",
        explanation:
          "Step 1: Views are non-owning adaptors holding iterators or a reference into the underlying range, chosen deliberately so that composing them costs nothing.\nStep 2: The vector returned by build_vector is a temporary whose lifetime ends at the semicolon, and no lifetime extension applies because the view stores a reference internally rather than being a reference bound directly to the temporary.\nStep 3: The view object survives into the next statement holding iterators into freed memory, so iterating it reads deallocated storage - and because the memory is often still mapped, it frequently produces plausible values rather than crashing.\nStep 4: The three safe forms are to bind the vector to a named variable first so the owner outlives the view, to materialise the pipeline immediately with ranges::to in C++23, or to consume the pipeline inside a range-based for loop directly, since the range-for lifetime extension covers the temporary.\nStep 5: C++20 introduced the borrowed_range concept and the dangling sentinel type to catch some of these at compile time, notably algorithms returning an iterator into a temporary, but it does not catch the composed-view case, so the discipline of never storing a view over a temporary remains necessary."
      },
      {
        title: "std::function rejecting a move-only closure",
        input: "std::function<void()> f = [p = std::make_unique<Data>()] { use(*p); };",
        output: "A compile error stating that the closure type is not copy-constructible.",
        explanation:
          "Step 1: std::function's constructor requires its target to be copy-constructible, because std::function itself is copyable and must be able to duplicate whatever it stores.\nStep 2: The closure type has a unique_ptr member, so its implicitly generated copy constructor is deleted, and the requirement fails - producing an error message that usually points deep inside the standard library rather than at the lambda.\nStep 3: The same restriction is why a std::packaged_task cannot be stored in a std::function, which is exactly the problem hit when building a thread pool whose work queue holds type-erased tasks.\nStep 4: The traditional workaround is to wrap the move-only state in a shared_ptr and capture that by value, since shared_ptr is copyable - correct, but it adds an allocation and atomic reference counting purely to satisfy a requirement the code does not actually need.\nStep 5: C++23's std::move_only_function drops the copy requirement and is the proper fix, and the general lesson is that std::function's cost is not only the indirect call and possible allocation but also a semantic constraint that its name does not advertise."
      }
    ],
    tips: [
      "Capture by value whenever the lambda might outlive the current full expression, and reserve reference capture for lambdas consumed immediately, such as algorithm predicates.",
      "Write [this] explicitly rather than relying on [=], since the latter captures this implicitly and C++20 deprecated it precisely because the dependency is invisible.",
      "Prefer a template parameter over std::function for a callable that is called rather than stored, because it inlines completely and avoids a possible allocation."
    ],
    tricks: [
      "An immediately invoked lambda lets a const object be initialised with multi-statement logic that a single initialiser expression cannot express.",
      "The Overload idiom inherits operator() from several lambdas to build a std::visit visitor in place, which is the cleanest way to handle a variant.",
      "C++23's deducing this makes a recursive lambda trivial, replacing the std::function self-capture that previously paid for type erasure."
    ],
    memoryAids: [
      "A lambda is a class: captures are members, the body is a const operator(), and mutable removes the const.",
      "[=] does not copy members - it captures this, so the object must outlive the closure.",
      "Views and closures that capture by reference are both non-owning; storing either over a temporary dangles."
    ],
    interviewPatterns: [
      "'What does this lambda capture, and is it safe?' with a stored member-function callback is the standard trap and expects you to spot the this capture.",
      "'Why is std::function slower than passing a template parameter?' expects type erasure, the indirect call, the small-object buffer, and the copy-constructible requirement.",
      "Frequency and companies: very common everywhere C++ is used; the follow-up is usually about lifetime in threads or coroutines."
    ],
    practiceProblems: [
      "Why can a capture-free lambda convert to a function pointer while a capturing one cannot? Answer: the closure type for a capture-free lambda has no data members, so the body needs no state and the compiler can generate a static function with the same signature and provide a conversion operator returning its address; a capturing lambda's operator() needs the captured members, which a plain function pointer has nowhere to carry, and this is exactly why C APIs that accept a callback also accept a void* user pointer - the standard bridge is a capture-free trampoline lambda that casts the user pointer back to the real callable.",
      "Explain why a mutable lambda's counter behaves differently from a static local. Answer: a mutable lambda's captured state is a member of the closure object, so each closure has its own copy and copying the closure copies the current value, giving independent counters; a static local inside the lambda body is shared by every invocation of that operator() regardless of which closure object it belongs to, so all copies of the lambda increment the same variable - which also makes it a data race across threads while the mutable member is only racy if the same closure object is shared.",
      "You need to store heterogeneous callbacks including some that own a unique_ptr. What are your options? Answer: before C++23, wrap the move-only state in a shared_ptr and capture that so the closure becomes copyable, accepting an allocation and atomic refcounting; or write your own type-erasure wrapper requiring only move-constructibility, which is around thirty lines using a virtual base and a unique_ptr; in C++23 use std::move_only_function, which is designed for exactly this and additionally supports const, reference, and noexcept qualification in its signature, something std::function never did."
    ],
    faq: [
      {
        question: "What exactly does a lambda capture, and how do the defaults differ?",
        answer:
          "A capture list creates members in the compiler-generated closure class, one per captured entity, initialised at the point the lambda expression is evaluated. Capturing by value copies the object into a member at that moment, so subsequent changes to the original are not seen; capturing by reference stores a reference, so the lambda observes later changes and depends on the referent outliving it. The two defaults, equals and ampersand, apply the corresponding mode to every automatic-storage variable the body odr-uses, which means the capture list stays short but the dependencies become invisible in the source. Three details cause most of the confusion. First, entities with static or thread storage duration are never captured because they are not automatic variables, so a lambda with an empty capture list may legitimately reference a global or a static local. Second, inside a member function there is no member variable in scope to capture: a use of member_ means this->member_, so both defaults capture this by value, storing a raw pointer - which is why C++20 deprecated the equals form when it implicitly captures this, and why star-this was added in C++17 to copy the object itself. Third, capturing a variable that happens to be a reference copies the referent rather than the reference when captured by value, whereas capturing a pointer by value copies only the pointer, so by-value capture is not the same as deep safety. The practical rule is to prefer explicit capture lists over the defaults in anything that will be stored, because writing out what is captured forces you to notice the lifetimes involved."
      },
      {
        question: "Why does mutating a captured variable require the mutable keyword?",
        answer:
          "Because the compiler generates the closure's operator() as a const member function by default, and a const member function cannot modify the object's non-mutable members - and the by-value captures are exactly those members. Adding mutable to the lambda declaration removes the const qualification, so the body may assign to its captured copies. This default is deliberate: a lambda is conceptually a function object, and making the call operator const means that calling the same lambda twice with the same arguments produces the same result unless you have explicitly said otherwise, which supports reasoning about lambdas passed to algorithms - some algorithms are permitted to copy their predicate, and a stateful non-const predicate would then behave unpredictably. The important consequence to understand is what mutable does and does not do: it lets you modify the closure's copy, and it never touches the original variable, so a mutable lambda capturing a counter by value increments its own member while the outer counter stays untouched. That member persists across calls to the same closure object, which makes a mutable init-capture the idiomatic way to write a stateful generator, but it is per-closure rather than per-call, so copying the lambda copies its current state and the two then diverge. Reference captures need no mutable, since modifying through a reference member does not modify the member itself and is therefore permitted in a const member function - which is worth noting because it means the const-ness of operator() protects the captures, not what they refer to."
      },
      {
        question: "When is std::function the wrong tool?",
        answer:
          "Whenever the callable is passed and invoked rather than stored, which is the majority of cases. As a parameter type, std::function forces type erasure that a template parameter would avoid entirely: the call goes through an indirection the compiler generally cannot inline, costing a few nanoseconds and, more importantly, preventing the optimiser from seeing through to the body, which in a hot loop can be the difference between vectorised code and a call per element. Constructing it may allocate, because implementations store the target inline only if it fits a small buffer - typically sixteen bytes on libstdc++ - and a lambda capturing two strings will not fit, so every call site that constructs one performs a heap allocation. Copying a std::function may allocate again. And it imposes a requirement its name does not advertise: the target must be copy-constructible, which silently excludes any lambda capturing a unique_ptr and excludes std::packaged_task, so building a thread pool whose queue holds std::function tasks forces the shared_ptr workaround that everyone rediscovers. The cases where it is right are genuine type erasure: storing heterogeneous callables in a container, holding a callback as a class member where the type cannot be a template parameter, and crossing a compilation boundary where the callable's type is not available. Even then, consider the alternatives - a plain function pointer plus a void* context for C-style interfaces, a small hand-rolled type-erasure wrapper requiring only move-constructibility, std::move_only_function in C++23, or a future function_ref for the non-owning parameter case. As a rule of thumb, if the word store does not appear in the description of what you are doing, std::function is probably the wrong choice."
      },
      {
        question: "How do I safely use a lambda as a callback on an object that might be destroyed?",
        answer:
          "You need a mechanism that either guarantees the object outlives the callback or lets the callback detect that it did not. The first and best option is structural: if the thing holding the callback is a member of the object, it is destroyed before the object's other members and the problem disappears, which is why registering a callback on a member timer with a plain this capture is usually fine while registering one on a global registry is not. The second is to capture what you actually need by value rather than capturing this at all - often the callback uses one string or one integer, and an init-capture copying that member removes the dependency on the object entirely. The third, for genuinely uncertain lifetimes, is the weak_ptr pattern: derive from enable_shared_from_this, capture a weak_ptr obtained from weak_from_this, and lock it inside the callback, so the callback becomes a no-op after the object dies and holds the object alive for the duration of its own execution if it does not. That last property matters and is easy to overlook - locking gives you a shared_ptr, so the object cannot be destroyed midway through the callback body, which a raw check-then-use cannot provide. The fourth is explicit deregistration in the destructor, which is correct but racy in multithreaded code unless the registry synchronises, because the callback may already be executing. In C++17 there is also star-this, which copies the whole object into the closure - safe, but it means the callback operates on a snapshot rather than the live object, which is usually not what a callback is for. Whatever you choose, document the lifetime relationship at the registration site, because it is invisible in the lambda itself."
      },
      {
        question: "What is the overload idiom and why is it needed for std::visit?",
        answer:
          "std::visit requires a single callable that can accept every alternative the variant might hold, and the natural way to write per-alternative logic is one lambda per type - but there is no built-in way to combine several lambdas into one overload set. The overload idiom does it with variadic inheritance: a class template derives from every lambda passed to it and pulls each base's operator() into its own scope with a pack expansion of a using declaration, producing a single type whose call operator is the merged overload set. Combined with class template argument deduction, and a deduction guide in C++17 which became unnecessary in C++20 because aggregate deduction was extended, this lets you write a visitor inline at the call site with one lambda per alternative, which reads far better than a hand-written struct with several operator() overloads. It is worth understanding rather than copying because it demonstrates three separate language features working together: inheriting from a lambda is legal since a closure type is an ordinary class, using declarations bring base member functions into the derived overload set rather than hiding them, and a pack expansion of a using declaration was specifically enabled in C++17 to make this possible. Two practical notes. First, ordering matters as it does in any overload set, so a generic auto lambda placed among specific ones will only be selected when no specific one matches, which is how you write a catch-all. Second, if the visitor does not handle every alternative the code fails to compile, which is the property you want from a variant - and the reason a catch-all should be added deliberately rather than by default. C++26's pattern matching proposal aims to replace the whole construction with language syntax."
      },
      {
        question: "Do lambdas cost anything at runtime compared to a hand-written loop?",
        answer:
          "Not when used directly, and this is one of the clearest cases of a zero-overhead abstraction in the language. A lambda passed to an algorithm is passed as a template parameter, so the algorithm is instantiated with the exact closure type, the call to operator() is a direct call to a function the compiler can see, and inlining eliminates it entirely - the generated code for std::find_if with a lambda predicate is typically identical to a hand-written loop with the condition inline, and at higher optimisation levels both vectorise the same way. This is a genuine advantage over the C approach of a function pointer plus a void* context, which forces an indirect call the compiler cannot inline, and it is why qsort is measurably slower than std::sort on the same data. Capturing costs only what the captures themselves cost: capturing an int is free, capturing a vector by value performs a copy exactly as writing that copy manually would, and capturing by reference costs one pointer. The costs appear when you introduce indirection deliberately. Storing a lambda in a std::function adds an indirect call the optimiser usually cannot see through, plus a heap allocation if the closure exceeds the small-object buffer. Storing it in a std::variant of callables or behind a virtual interface has the same effect. Converting a capture-free lambda to a function pointer and calling through that also blocks inlining. The compile-time cost is worth mentioning too: every lambda creates a distinct type, so a template instantiated with many different lambdas produces many instantiations, and in a large codebase that is a real contributor to build time and binary size - though rarely enough to justify avoiding lambdas."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Scott Meyers - Effective Modern C++, items 31 to 34 on lambda expressions",
        insight: "The definitive treatment of capture modes, the this-capture hazard, and init-capture."
      },
      {
        source: "note",
        attribution: "cppreference - Lambda expressions, std::function, std::move_only_function, std::visit",
        insight: "Normative rules for closure types, the const operator(), and the copy-constructible requirement on std::function targets."
      },
      {
        source: "blog",
        attribution: "C++ Core Guidelines - F.50 to F.55 on lambdas and captures",
        insight: "Concrete rules on when to capture by reference versus by value and why default captures are discouraged in stored callbacks."
      }
    ]
  },
  {
    id: "topic-cpp-modern-constexpr-and-compile-time",
    moduleId: "mod-cpp-modern",
    title: "constexpr, consteval, and Compile-Time Computation",
    intuition:
      "constexpr began in C++11 as a narrow promise - this function is simple enough that I can evaluate it during compilation - and has grown into a second, nearly complete language that runs inside the compiler. The payoff is not merely speed: a value computed at compile time can be used where the language demands a constant, such as an array bound or a template argument, and any error in computing it becomes a compile error rather than a runtime failure. The related keywords sharpen the intent that constexpr leaves ambiguous: consteval demands compile-time evaluation, constinit demands compile-time initialisation without demanding constness, and const has never meant either.",
    complexity: {
      time:
        "A successful constexpr evaluation costs nothing at runtime, since the result is a literal baked into the binary. It costs compile time instead, and constant evaluation runs in an interpreter that is roughly one to two orders of magnitude slower than the compiled code would be, so a computation taking a millisecond at runtime can take a hundred milliseconds per translation unit that instantiates it. Implementations impose limits on evaluation steps and recursion depth, adjustable with -fconstexpr-ops-limit and -fconstexpr-depth, which exist because runaway constant evaluation otherwise hangs the compiler.",
      space:
        "Compile-time results live in the binary as constants or as static data, so a large constexpr table is binary size rather than heap usage - a compile-time generated lookup table of ten thousand doubles is eighty kilobytes of rodata. The compiler's own memory use during constant evaluation can be substantial for heavy metaprogramming, and memory allocated during constexpr evaluation must be freed before evaluation ends, since C++20 permits transient allocation only, which is why a constexpr std::vector cannot escape into a constexpr variable."
    },
    lesson: [
      {
        title: "constexpr Variables, Functions, and What const Does Not Mean",
        content:
          "A constexpr variable is a constant known at compile time and usable in constant expressions; a const variable merely promises not to be modified through that name, and may be initialised at runtime. That distinction is the source of most confusion, and it also explains why const on a pointer and constexpr on a pointer mean different things - constexpr applies to the pointer object itself, making it a top-level constant, so a constexpr pointer is always a constant pointer. A constexpr function is one that is permitted to be evaluated at compile time when its arguments allow, and required to be when the result is used where a constant is needed; called with runtime arguments it is an ordinary function. That dual nature is the design's core, and is_constant_evaluated exists to let a function take different paths in the two contexts.",
        codeExample: `// const versus constexpr: a promise about mutation versus about timing
const int a = compute();        // runtime initialisation is FINE
constexpr int b = compute();    // ERROR unless compute() is constexpr
                                // and the call is a constant expression
int arr1[a];                    // ERROR: 'a' is not a constant expression
int arr2[b];                    // OK

const int c = 42;               // this one IS usable as a constant,
int arr3[c];                    // because it is const-integral with a
                                // constant initialiser - a special case
                                // that predates constexpr and causes
                                // much of the confusion

// constexpr on pointers applies to the POINTER
constexpr const char* p = "hi"; // a CONSTANT pointer to const char
// const char* const q = "hi";  // the equivalent spelling
constexpr int* r = nullptr;     // constant pointer to non-const int

// A constexpr function is DUAL-NATURED
constexpr int square(int n) { return n * n; }
constexpr int s1 = square(5);   // compile time, guaranteed
int n = read_input();
int s2 = square(n);             // RUNTIME call - perfectly legal
// constexpr on a function is a permission, not an obligation.

// C++11 constexpr functions were single-return only
constexpr int fact11(int n) { return n <= 1 ? 1 : n * fact11(n - 1); }
// C++14 relaxed it: loops, local variables, multiple statements
constexpr int fact14(int n) {
    int r = 1;
    for (int i = 2; i <= n; ++i) r *= i;
    return r;
}
// C++20 added: virtual calls, try/catch (no throwing), dynamic_cast,
//   union member changes, and transient new/delete
// C++23 added: goto, static and thread_local in constexpr functions,
//   and non-literal types as long as the path is not taken

// If NO argument makes a constexpr function usable in a constant
// expression, the program is ill-formed NDR - the compiler may or may
// not diagnose it:
constexpr int bad(int n) { return std::rand() + n; }   // never constant

// consteval: compile time is MANDATORY (C++20)
consteval int must_be_const(int n) { return n * 2; }
constexpr int ok = must_be_const(21);
int m = read();
// int bad2 = must_be_const(m);          // ERROR: not a constant
// Use it when runtime evaluation would be a bug - a compile-time
// format string check, a type registry, a hash of a literal.

// constinit: constant INITIALISATION, without const (C++20)
constinit int counter = compute_at_compile_time();
counter = 5;                    // legal: the object is MUTABLE
// The point is to eliminate the static initialisation order fiasco:
// the object is guaranteed to be initialised before any dynamic
// initialisation runs, so another translation unit's constructor
// cannot observe it uninitialised.
// constexpr would also guarantee that, but would make it const.

// is_constant_evaluated: branch on the context (C++20)
constexpr double power(double base, int exp) {
    if (std::is_constant_evaluated()) {
        double r = 1;                     // exact, slow, no intrinsics
        for (int i = 0; i < exp; ++i) r *= base;
        return r;
    } else {
        return std::pow(base, exp);       // fast runtime intrinsic
    }
}
// TRAP: 'if constexpr (std::is_constant_evaluated())' is ALWAYS TRUE,
// because the condition of if constexpr is itself constant-evaluated.
// C++23's 'if consteval' makes the intent unambiguous:
constexpr double power23(double base, int exp) {
    if consteval { /* compile-time path */ }
    else { return std::pow(base, exp); }
}

// Literal types - what may exist during constant evaluation
// A literal type has a constexpr constructor, a trivial destructor
// (relaxed in C++20 for constexpr destructors), and only literal
// members.
struct Point {
    int x, y;
    constexpr Point(int x, int y) : x(x), y(y) {}
    constexpr int sum() const { return x + y; }
};
constexpr Point origin{0, 0};
static_assert(origin.sum() == 0);
constexpr std::array<int, 3> arr{1, 2, 3};   // array is literal
// std::string and std::vector became constexpr-usable in C++20, but
// only TRANSIENTLY - see the next section.`,
        diagram: asciiDiagram(`const, constexpr, consteval, constinit — what each one promises

  ┌──────────────────────────────────────────────────────────────┐
  │ const                                                        │
  │   promise:  "I will not modify it through THIS name"          │
  │   timing:   initialisation may be at RUNTIME                 │
  │   usable as a constant expression?  only for integral types  │
  │                                     with a constant init      │
  │       const int n = read();   ← perfectly legal              │
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │ constexpr  (variable)                                        │
  │   promise:  "the value is known at COMPILE TIME"             │
  │   implies:  const                                            │
  │   usable as: array bound, template argument, case label       │
  │       constexpr int n = read();   ← ERROR                    │
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │ constexpr  (function)                                        │
  │   promise:  "MAY be evaluated at compile time"               │
  │   reality:  dual-natured                                     │
  │                                                              │
  │       constexpr int f(int);                                  │
  │                │                                             │
  │        ┌───────┴────────┐                                    │
  │   f(5) │                │ f(runtime_value)                   │
  │        ▼                ▼                                    │
  │   compile-time      an ORDINARY runtime call                 │
  │   constant                                                   │
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │ consteval  (C++20)                                           │
  │   promise:  "MUST be evaluated at compile time"              │
  │   a runtime call is a COMPILE ERROR                          │
  │   use for: format-string validation, compile-time registries │
  └──────────────────────────────────────────────────────────────┘

  ┌──────────────────────────────────────────────────────────────┐
  │ constinit  (C++20)                                           │
  │   promise:  "INITIALISED at compile time"                    │
  │   does NOT imply const — the object stays MUTABLE            │
  │                                                              │
  │       constinit int counter = table_size();                  │
  │       counter = 5;            ← legal                        │
  │                                                              │
  │   kills the static initialisation order fiasco: no other     │
  │   translation unit can observe it uninitialised              │
  └──────────────────────────────────────────────────────────────┘

  DECIDING
        is the value known while compiling?
                    │
          ┌─────────┴──────────┐
         no                   yes
          │                     │
          ▼                     ▼
        const           must it stay mutable?
                                │
                       ┌────────┴────────┐
                      yes                no
                       │                  │
                       ▼                  ▼
                  constinit          constexpr

        for a FUNCTION: is a runtime call ever acceptable?
                yes → constexpr      no → consteval`)
      },
      {
        title: "constexpr Containers, Algorithms, and Their Limits",
        content:
          "C++20 made std::vector and std::string usable during constant evaluation by allowing transient dynamic allocation, meaning memory allocated during an evaluation must also be freed before that evaluation completes. The consequence is precise and often surprising: you can build a vector inside a constexpr function, sort it, and return a fixed-size array derived from it, but you cannot declare a constexpr std::vector at namespace scope, because its allocation would have to survive into the running program. Most standard algorithms became constexpr in C++20 as well, so genuine computation is now possible - generating lookup tables, parsing embedded configuration, validating data at build time - and the practical technique for returning results is a two-pass approach that first computes the required size as a constant and then fills an array of that size.",
        codeExample: `// C++20: containers work DURING evaluation
constexpr int sum_of_sorted() {
    std::vector<int> v{5, 3, 1, 4, 2};        // allocated...
    std::sort(v.begin(), v.end());            // constexpr algorithm
    return std::accumulate(v.begin(), v.end(), 0);
}                                             // ...and FREED here
static_assert(sum_of_sorted() == 15);

// But this does NOT work:
// constexpr std::vector<int> v{1, 2, 3};     // ERROR: the allocation
                                              // would escape the
                                              // evaluation
// The rule is TRANSIENT allocation: new must be matched by delete
// within the same constant evaluation. Nothing heap-allocated may
// survive into the runtime program.

// The two-pass idiom: compute the size, then fill a fixed array
constexpr std::size_t count_primes(int limit) {
    std::vector<bool> sieve(limit + 1, true);
    std::size_t n = 0;
    for (int i = 2; i <= limit; ++i)
        if (sieve[i]) {
            ++n;
            for (int j = i * i; j <= limit; j += i) sieve[j] = false;
        }
    return n;
}
template <int Limit>
constexpr auto primes_up_to() {
    std::array<int, count_primes(Limit)> out{};   // size is a constant
    std::vector<bool> sieve(Limit + 1, true);
    std::size_t k = 0;
    for (int i = 2; i <= Limit; ++i)
        if (sieve[i]) {
            out[k++] = i;
            for (int j = i * i; j <= Limit; j += i) sieve[j] = false;
        }
    return out;
}
constexpr auto kPrimes = primes_up_to<1000>();    // 168 primes, in
static_assert(kPrimes[0] == 2);                   // .rodata

// Generating a lookup table at compile time
constexpr auto make_crc_table() {
    std::array<std::uint32_t, 256> t{};
    for (std::uint32_t i = 0; i < 256; ++i) {
        std::uint32_t c = i;
        for (int k = 0; k < 8; ++k)
            c = (c & 1) ? (0xEDB88320u ^ (c >> 1)) : (c >> 1);
        t[i] = c;
    }
    return t;
}
constexpr auto kCrcTable = make_crc_table();
// One kilobyte of .rodata, zero startup cost, and no static
// initialisation order concern.

// Compile-time validation - failure becomes a BUILD error
consteval auto make_ip(std::string_view s) {
    // parse and validate; a throw here is a compile error because
    // an exception cannot escape a constant evaluation
    if (!valid_ipv4(s)) throw "invalid IPv4 literal";
    return parse_ipv4(s);
}
constexpr auto addr = make_ip("192.168.1.1");     // checked at build
// constexpr auto bad = make_ip("999.1.1.1");     // COMPILE ERROR
// This is exactly how std::format validates its format string.

// constexpr in classes
class Matrix {
    std::array<double, 16> m_{};
public:
    constexpr Matrix() = default;
    constexpr double& operator()(int r, int c) { return m_[r * 4 + c]; }
    constexpr double operator()(int r, int c) const { return m_[r * 4 + c]; }
    constexpr Matrix operator*(const Matrix& o) const {
        Matrix result;
        for (int i = 0; i < 4; ++i)
            for (int j = 0; j < 4; ++j) {
                double s = 0;
                for (int k = 0; k < 4; ++k) s += (*this)(i, k) * o(k, j);
                result(i, j) = s;
            }
        return result;
    }
};
constexpr Matrix identity = make_identity();
constexpr Matrix product = identity * identity;    // multiplied at
                                                   // COMPILE TIME
// C++20 also allows constexpr DESTRUCTORS and virtual calls during
// constant evaluation, which is what made RAII types work.

// WHAT STILL CANNOT HAPPEN during constant evaluation
//   - reinterpret_cast, and type punning generally
//   - anything touching a non-constexpr function
//   - reading a non-constexpr global
//   - undefined behaviour of ANY kind: signed overflow, an
//     out-of-bounds index, or reading an uninitialised value all
//     make the expression non-constant, which turns the UB into a
//     COMPILE ERROR. This is a genuinely valuable side effect.
constexpr int overflow() {
    int x = INT_MAX;
    return x + 1;                   // COMPILE ERROR, not silent UB
}
// Wrapping a computation in static_assert is a cheap UB detector.

// LIMITS - the compiler will stop you
//   GCC:   -fconstexpr-ops-limit=N  -fconstexpr-depth=N
//   Clang: -fconstexpr-steps=N      -fconstexpr-depth=N
// Constant evaluation runs in an INTERPRETER, roughly 10-100x
// slower than compiled code, so a heavy computation can add seconds
// per translation unit. Measure with -ftime-report.`
      },
      {
        title: "Template Metaprogramming and What Replaced It",
        content:
          "Before constexpr, compile-time computation meant template metaprogramming: encoding values in template parameters and recursion in partial specialisations, which worked but produced code that read nothing like the arithmetic it performed and error messages that read like nothing at all. The modern equivalent is ordinary constexpr code, and this is one of the clearest improvements in the language's history - a compile-time factorial written with a loop inside a constexpr function is both faster to compile and comprehensible to a reader. Templates remain the right tool for computing with types rather than values, which is what type traits do, and C++11's variadic templates plus C++17's fold expressions plus C++20's concepts have made that far more direct too. The general principle is to compute values with constexpr and types with templates.",
        codeExample: `// The old way: recursion through template specialisation
template <int N> struct Factorial {
    static constexpr int value = N * Factorial<N - 1>::value;
};
template <> struct Factorial<0> { static constexpr int value = 1; };
constexpr int f1 = Factorial<5>::value;     // 120
// Each N instantiates a distinct type. Deep recursion is slow to
// compile and produces enormous symbol tables.

// The modern way: it just looks like code
constexpr int factorial(int n) {
    int r = 1;
    for (int i = 2; i <= n; ++i) r *= i;
    return r;
}
constexpr int f2 = factorial(5);
// Faster to compile, readable, and debuggable.

// Type traits: templates are still right for computing with TYPES
template <class T> struct RemovePointer          { using type = T; };
template <class T> struct RemovePointer<T*>      { using type = T; };
template <class T> using RemovePointer_t = typename RemovePointer<T>::type;
static_assert(std::is_same_v<RemovePointer_t<int*>, int>);
// The standard library provides these in <type_traits>:
std::is_integral_v<T>; std::is_same_v<A, B>; std::decay_t<T>;
std::conditional_t<Cond, A, B>; std::enable_if_t<Cond, T>;
std::remove_cvref_t<T>;                    // C++20, the one you want

// Variadic templates and fold expressions
template <class... Ts> constexpr auto sum(Ts... ts) { return (ts + ...); }
template <class... Ts> constexpr bool all(Ts... ts) { return (ts && ...); }
static_assert(sum(1, 2, 3) == 6);
// Before C++17 this needed recursive templates with a base case.

// if constexpr replaced tag dispatch and most SFINAE
template <class T> void process(T&& x) {
    if constexpr (std::is_pointer_v<std::decay_t<T>>) handle_ptr(x);
    else if constexpr (requires { x.begin(); })       handle_range(x);
    else                                              handle_value(x);
}
// The old versions needed either overloads keyed on tag types or
// three enable_if declarations each encoding the negation of the
// others' conditions.

// Compile-time string handling, now practical
template <std::size_t N> struct FixedString {
    char data[N]{};
    constexpr FixedString(const char (&s)[N]) {
        for (std::size_t i = 0; i < N; ++i) data[i] = s[i];
    }
};
template <FixedString S> struct Named { };    // C++20: a string as a
Named<"widget"> w;                            // TEMPLATE PARAMETER
// C++20 allows literal class types as non-type template parameters,
// which finally makes compile-time strings usable as identifiers.

constexpr std::uint64_t fnv1a(std::string_view s) {
    std::uint64_t h = 14695981039346656037ull;
    for (char c : s) { h ^= static_cast<unsigned char>(c);
                       h *= 1099511628211ull; }
    return h;
}
static_assert(fnv1a("hello") != fnv1a("world"));
// A compile-time switch over strings:
switch (fnv1a(input)) {
    case fnv1a("start"): do_start(); break;
    case fnv1a("stop"):  do_stop();  break;
}
// Note this is a hash, so collisions are theoretically possible -
// acceptable for a fixed known set, checked with a static_assert.

// WHEN COMPILE-TIME COMPUTATION IS WORTH IT
//   YES: lookup tables (CRC, trigonometry, character classification)
//   YES: validating literals - format strings, IP addresses, regexes
//   YES: computing sizes, alignments, and layouts
//   YES: turning would-be runtime UB into a build error
//   NO:  anything whose inputs are only known at runtime
//   NO:  saving a nanosecond at the cost of five seconds of build
//        time on every compilation, forever
//   NO:  code that no reviewer can follow

// MEASURE THE COMPILE-TIME COST
//   -ftime-report            per-phase timing
//   -ftime-trace (clang)     a Chrome-tracing profile of the build
//   Templight, ClangBuildAnalyzer for instantiation profiles
// Heavy constexpr and template code is a leading cause of slow C++
// builds, and the cost is paid by every developer on every build.`,
        diagram: asciiDiagram(`Compile-time computation: the cost you are trading

  RUNTIME COMPUTATION
  ┌────────────────────────────────────────────────────────┐
  │  build:   fast                                         │
  │  binary:  small (code, not data)                       │
  │  startup: the table is built at init                   │
  │  run:     pays the computation                         │
  │                                                        │
  │    program start ──► build_crc_table()  ~50 µs         │
  │                          │                             │
  │                          ▼                             │
  │                     table in .bss                      │
  └────────────────────────────────────────────────────────┘

  COMPILE-TIME COMPUTATION
  ┌────────────────────────────────────────────────────────┐
  │  build:   SLOWER — an interpreter, 10-100x             │
  │  binary:  larger (1 KB of .rodata for a CRC table)     │
  │  startup: nothing                                      │
  │  run:     nothing                                      │
  │                                                        │
  │    compile ──► constexpr interpreter ──► .rodata       │
  │                    ~5 ms per TU                        │
  └────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────┐
  │  THE TRADE                                             │
  │    you pay ONCE PER BUILD, PER TRANSLATION UNIT,       │
  │    on every developer's machine, forever               │
  │                                                        │
  │    you save the runtime cost, once per program run     │
  │                                                        │
  │  ⇒ worth it when the computation is small and the      │
  │    result is needed as a constant                      │
  │  ⇒ NOT worth it for a heavy computation that saves     │
  │    microseconds at startup                             │
  └────────────────────────────────────────────────────────┘

  TRANSIENT ALLOCATION (C++20)
  ┌────────────────────────────────────────────────────────┐
  │  constexpr int f() {                                   │
  │      std::vector<int> v{5,3,1};   ← new                │
  │      std::sort(v.begin(), v.end());                    │
  │      return v[0];                                      │
  │  }                                ← delete, implicitly │
  │  static_assert(f() == 1);         ✓ LEGAL              │
  │                                                        │
  │  constexpr std::vector<int> v{1,2,3};   ✗ ERROR        │
  │       │                                                │
  │       └── the allocation would have to SURVIVE into    │
  │           the running program, and there is no way to  │
  │           transfer compiler heap memory into the       │
  │           binary                                       │
  │                                                        │
  │  the workaround: return a fixed-size std::array whose  │
  │  size is itself computed by a first constexpr pass     │
  └────────────────────────────────────────────────────────┘

  UB BECOMES A BUILD ERROR — an underrated benefit
  ┌────────────────────────────────────────────────────────┐
  │  constexpr int f() { int x = INT_MAX; return x + 1; }  │
  │  static_assert(f() == 0);                              │
  │      ↑                                                 │
  │      COMPILE ERROR: signed overflow is UB, and UB      │
  │      makes an expression non-constant                  │
  │                                                        │
  │  the same code at runtime is silent UB                 │
  └────────────────────────────────────────────────────────┘`)
      },
      {
        title: "static_assert, Diagnostics, and Practical Use",
        content:
          "static_assert turns a compile-time condition into a build failure with a message you write, and it is the mechanism through which most of constexpr's value is actually collected - a computation that is merely correct at compile time helps nobody, while one whose invariants are asserted at compile time cannot regress. It is equally valuable for documenting assumptions about the platform, checking that a type's layout matches an external format, and constraining template arguments where a concept is not warranted. The related practical concerns are diagnostic quality, since debugging a failed constant evaluation is genuinely awkward without support, and build time, since heavy compile-time work is a leading cause of slow C++ builds and the cost recurs for every developer on every build.",
        codeExample: `// static_assert: a compile-time invariant with your own message
static_assert(sizeof(void*) == 8, "64-bit platforms only");
static_assert(std::is_trivially_copyable_v<Packet>,
              "Packet is memcpy'd into the wire buffer");
static_assert(offsetof(Header, length) == 4, "wire format mismatch");
static_assert(alignof(Buffer) >= 64, "must be cache-line aligned");
static_assert(kMaxConnections <= 65535, "port-indexed table overflow");

// C++17 allows the message to be omitted
static_assert(kSize > 0);
// C++26 allows a constexpr-generated message, which finally lets the
// diagnostic report the actual values involved.

// Inside templates, to fail early with a readable reason
template <class T>
void serialise(const T& v) {
    static_assert(std::is_trivially_copyable_v<T>,
                  "serialise() requires a trivially copyable type; "
                  "specialise serialise_impl for T instead");
    std::memcpy(buffer, &v, sizeof(T));
}
// Without the assert, the failure surfaces as a memcpy of a type with
// a vtable pointer - a runtime bug rather than a build error.
// With a concept, the constraint moves into the signature:
template <std::copyable T> requires std::is_trivially_copyable_v<T>
void serialise2(const T& v);

// Asserting on a compile-time computation locks in behaviour
constexpr auto kTable = make_crc_table();
static_assert(kTable[0] == 0);
static_assert(kTable[255] == 0x2D02EF8Du);
static_assert(kTable.size() == 256);
// If someone changes the polynomial, the build breaks rather than
// the checksums silently changing.

// Testing constexpr functions costs nothing at runtime
constexpr int parse_int(std::string_view s);
static_assert(parse_int("0") == 0);
static_assert(parse_int("42") == 42);
static_assert(parse_int("-17") == -17);
// These are unit tests that run during compilation and add no test
// binary, no test runner, and no runtime.

// DEBUGGING a failed constant evaluation
// Compilers report the evaluation trace, but it can be long. Tactics:
//   1. Bisect by asserting on intermediate results
constexpr auto step1 = phase_one(input);
static_assert(step1.size() == 10);            // narrow the failure
constexpr auto step2 = phase_two(step1);
//   2. Temporarily drop constexpr from the variable and run it at
//      runtime under a debugger, which is far easier to inspect
auto debug_result = my_constexpr_fn(input);   // ordinary breakpoint
//   3. Check for accidental UB: signed overflow, an out-of-range
//      index, or reading an uninitialised member all manifest as
//      "not a constant expression" with a confusing message
//   4. Raise the limits if the failure is exhaustion rather than
//      logic: -fconstexpr-ops-limit / -fconstexpr-steps

// The common failure messages and what they mean
//   "not a constant expression"      -> something in the call chain
//                                       is not constexpr, or UB
//   "exceeded maximum number of operations" -> raise the limit, or
//                                       the computation is too heavy
//   "read of uninitialized object"   -> a member has no initialiser;
//                                       constant evaluation catches
//                                       what runtime would not
//   "call to non-constexpr function" -> often a hidden allocation, a
//                                       standard function not marked
//                                       constexpr, or an assert()

// BUILD TIME is the real cost, and it is measurable
//   clang -ftime-trace -> a JSON profile viewable in chrome://tracing
//   gcc   -ftime-report -> per-phase timing
//   ClangBuildAnalyzer aggregates -ftime-trace across a whole build
//     and ranks the most expensive templates and headers
// A rule of thumb: if a constexpr computation adds more than a few
// tens of milliseconds per translation unit, and the runtime saving
// is microseconds at startup, it is a net loss.

// WHERE COMPILE-TIME WORK GENUINELY PAYS
//   1. lookup tables that would otherwise cost startup time and
//      raise static initialisation order questions
//   2. validating literals so a typo is a build error - format
//      strings, IP addresses, SQL fragments, units
//   3. computing layout constants that MUST be constants: array
//      bounds, alignments, template arguments, case labels
//   4. asserting platform and layout assumptions that would
//      otherwise be discovered by a corrupted packet in production
//   5. converting potential runtime UB into a compile error, simply
//      by evaluating the expression in a static_assert`
      }
    ],
    examples: [
      {
        title: "A constexpr vector that will not compile at namespace scope",
        input: "constexpr std::vector<int> primes = compute_primes(1000);",
        output: "A compile error, although the same computation inside a constexpr function works fine.",
        explanation:
          "Step 1: C++20 permits dynamic allocation during constant evaluation, but only transiently - every allocation made during one constant evaluation must be deallocated before that evaluation completes.\nStep 2: A constexpr variable at namespace scope must hold a value that persists into the running program, so the vector's heap buffer would have to survive the compilation and be present in the binary.\nStep 3: There is no mechanism to transfer memory from the compiler's constant-evaluation heap into the program's address space, so the standard simply forbids it, and the diagnostic usually says the object is not a constant expression because it points to memory allocated during evaluation.\nStep 4: The same computation inside a constexpr function is legal because the vector is created and destroyed within the evaluation, which is why sorting a vector and returning its first element in a static_assert works.\nStep 5: The practical idiom is a two-pass computation - one constexpr function that returns only the required count, used as the size of a std::array, and a second that fills that array - so the result has automatic storage that can be baked into the binary as read-only data."
      },
      {
        title: "if constexpr on is_constant_evaluated always taking the compile-time branch",
        input: "A function containing if constexpr (std::is_constant_evaluated()) with a runtime fallback in the else branch.",
        output: "The runtime branch is never taken, even for runtime calls, silently producing the slow path everywhere.",
        explanation:
          "Step 1: The condition of an if constexpr statement is itself required to be a constant expression and is evaluated in a constant-evaluation context.\nStep 2: is_constant_evaluated returns true whenever it is called during constant evaluation, and evaluating the if constexpr condition is exactly such a context, so it unconditionally returns true.\nStep 3: The compiler therefore discards the else branch entirely at every call site, including runtime ones, so a function intended to use a fast intrinsic at runtime silently uses the slow manual loop instead.\nStep 4: The correct form uses a plain if, since is_constant_evaluated is designed to be evaluated at runtime as an ordinary condition that the optimiser folds to false in generated code and that evaluates to true during constant evaluation.\nStep 5: The mistake was common enough that C++23 added if consteval as dedicated syntax whose meaning is unambiguous, and compilers now warn about is_constant_evaluated appearing in an if constexpr condition - which is a good example of a language feature added specifically because a library function's interaction with existing syntax was a trap."
      },
      {
        title: "Signed overflow becoming a build error",
        input: "constexpr int f() { int x = INT_MAX; return x + 1; } used inside a static_assert.",
        output: "A compile error stating the expression is not a constant expression, rather than silent undefined behaviour.",
        explanation:
          "Step 1: Signed integer overflow is undefined behaviour in C++, and at runtime the compiler is entitled to assume it does not happen, which enables optimisations that make the resulting code arbitrarily surprising.\nStep 2: The rules for constant expressions specify that an expression whose evaluation would have undefined behaviour is not a constant expression, so the compiler must reject it rather than pick a value.\nStep 3: Using the function in a static_assert or to initialise a constexpr variable forces constant evaluation, so the overflow is detected and reported at build time with a diagnostic pointing at the offending operation.\nStep 4: This makes constant evaluation an underrated correctness tool: wrapping a pure computation in a static_assert turns an entire class of latent undefined behaviour - overflow, out-of-bounds indexing, reading an uninitialised member, or dereferencing a null pointer - into build failures.\nStep 5: The limitation is that it only covers code paths actually exercised by the constant evaluation with the specific arguments given, so it complements rather than replaces the undefined behaviour sanitiser, which catches the same errors on real inputs at runtime."
      }
    ],
    tips: [
      "Use a plain if rather than if constexpr with std::is_constant_evaluated, because the latter's condition is itself constant-evaluated and is therefore always true.",
      "Reach for constinit rather than constexpr when a global must be initialised at compile time but must remain mutable, which eliminates the static initialisation order fiasco without imposing constness.",
      "Wrap pure computations in static_assert to turn potential undefined behaviour such as signed overflow or out-of-bounds indexing into compile errors."
    ],
    tricks: [
      "The two-pass idiom - one constexpr function returning the required count, used as the size of a std::array that a second pass fills - is how you return a computed collection from constant evaluation.",
      "A consteval function that throws on invalid input turns a malformed literal into a build error, which is exactly how std::format validates its format string.",
      "Measure compile-time cost with clang's -ftime-trace and ClangBuildAnalyzer before committing heavy constexpr work, since the cost recurs on every build for every developer."
    ],
    memoryAids: [
      "const is about mutation, constexpr is about timing, constinit is timing without constness, consteval is timing made mandatory.",
      "constexpr on a function is a permission, not an obligation - it becomes an ordinary call with runtime arguments.",
      "Allocation during constant evaluation is transient: it must be freed before evaluation ends, so a constexpr vector cannot escape."
    ],
    interviewPatterns: [
      "'What is the difference between const and constexpr?' is a standard opener and expects the mutation-versus-timing distinction plus the const-integral special case.",
      "'When would you compute something at compile time?' tests judgement about the build-time trade rather than knowledge of syntax.",
      "Frequency and companies: common everywhere, and probed in depth at embedded, games, and HFT shops where startup cost and binary layout matter."
    ],
    practiceProblems: [
      "Why can a constexpr function be called with runtime arguments while a consteval function cannot? Answer: constexpr on a function is a permission stating that at least one set of arguments allows compile-time evaluation, and the compiler evaluates the call at compile time only when the arguments are constant expressions and the result is needed as a constant, otherwise emitting an ordinary call; consteval declares an immediate function whose every call must be a constant expression, so a call with runtime arguments is ill-formed, which is what makes it suitable for validation logic that would be meaningless or wasteful at runtime.",
      "You need a compile-time lookup table of 4096 doubles computed by an iterative approximation. What should you check before committing to it? Answer: the binary size, since 4096 doubles is 32 kilobytes of read-only data that ships in every copy of the program; the compile-time cost, since constant evaluation runs in an interpreter roughly one to two orders of magnitude slower than compiled code and the cost is paid per translation unit on every build - measure it with -ftime-trace; whether the computation can trip the implementation's operation limit, requiring -fconstexpr-ops-limit; and whether the alternative of computing it once at startup into a function-local static would be adequate, which avoids all three costs at the price of a first-use branch.",
      "Explain why constinit solves the static initialisation order fiasco but constexpr sometimes cannot be used instead. Answer: the fiasco arises when a global in one translation unit is dynamically initialised and another translation unit's dynamic initialisation reads it before it has been initialised, since the order across translation units is unspecified; constinit guarantees the object is constant-initialised, which happens before any dynamic initialisation runs anywhere, so it can never be observed uninitialised - and unlike constexpr it does not make the object const, so it remains usable for globals that are legitimately mutated at runtime, such as a counter, a cache, or a registry that must be initialised to a known state before anything can touch it."
    ],
    faq: [
      {
        question: "What is the real difference between const and constexpr?",
        answer:
          "const is a promise about mutation and constexpr is a promise about timing, and they are almost orthogonal. A const object may not be modified through that name, but nothing says its value is known while compiling - const int n = read_input() is entirely legal, and n cannot be used as an array bound or a template argument. A constexpr object's value must be computable during compilation, which makes it usable everywhere the language demands a constant, and constexpr on an object implies const because a compile-time constant is necessarily immutable. The confusion is compounded by a rule that predates constexpr: a const integral object initialised with a constant expression is itself usable in constant expressions, so const int size = 10 followed by int arr[size] compiles, which leads people to believe const generally means compile-time. It does not, and the equivalence breaks the moment the type is not integral or the initialiser is not constant. On functions the meanings diverge further: const on a member function qualifies the implicit object parameter and says nothing about evaluation, while constexpr says the function may be evaluated at compile time when its arguments permit - a permission rather than a requirement, so a constexpr function called with runtime arguments compiles into an ordinary call. There is also a subtlety with pointers worth knowing: constexpr applies to the object being declared, so constexpr const char* p makes p a constant pointer, equivalent to const char* const, whereas const char* p would make only the pointee const. The modern guidance is to use constexpr for anything genuinely known at compile time, const for everything else that should not change, and constinit for the narrow case of a mutable global that must be initialised at compile time."
      },
      {
        question: "When did constexpr become genuinely useful, and what can it do now?",
        answer:
          "C++11's version was severely limited: a constexpr function had to consist of a single return statement, so anything non-trivial was written with the conditional operator and recursion, and only literal types could exist during evaluation. C++14 relaxed the function body rules to allow local variables, loops, and multiple statements, which was the change that made constexpr code look like ordinary code rather than a puzzle. C++17 added constexpr lambdas and if constexpr, the latter being about compile-time branching rather than constant evaluation but frequently used alongside it. C++20 was the transformative release: it allowed transient dynamic allocation, which made std::vector and std::string usable during evaluation; marked most standard algorithms constexpr, so you can sort and search at compile time; permitted virtual function calls, try blocks, dynamic_cast, and changing the active member of a union; and added constexpr destructors, which is what let RAII types participate. It also added consteval, constinit, and is_constant_evaluated, sharpening the vocabulary. C++23 continued with goto, static and thread_local variables in constexpr functions, non-literal types in unexecuted paths, and if consteval. The practical result is that a large fraction of ordinary computation can now run at compile time, so the realistic uses are substantial: generating lookup tables, parsing and validating embedded configuration or format strings, computing layout constants, and running unit tests through static_assert with no test binary at all. The remaining hard limits are that no allocation may escape an evaluation, nothing may involve reinterpret_cast or type punning, and no undefined behaviour of any kind is permitted - which is itself a feature, since it turns latent UB into build errors."
      },
      {
        question: "Why can I not have a constexpr std::vector at namespace scope?",
        answer:
          "Because C++20 permits only transient allocation during constant evaluation: memory allocated while evaluating a constant expression must be deallocated before that evaluation completes. A constexpr variable at namespace scope holds a value that persists into the running program and lives in the binary's read-only data, so the vector's heap buffer would need to survive compilation and appear in the executable - and there is no mechanism to transfer memory from the compiler's evaluation heap into the program's address space, nor any way for the runtime to know it must not free it. The committee considered making non-transient allocation work and concluded it required either promoting compiler heap memory into static storage, which raises hard questions about what the pointer means at runtime and whether it may be freed, or restricting it in ways that would not compose. So the rule is simply that the allocation must not escape. What does work is any use where the container is created and destroyed within one evaluation, which covers most real needs: building a vector, sorting it, and returning a scalar or a fixed-size array derived from it is entirely legal, and that is how compile-time table generation is written in practice. The standard idiom for returning a collection is two passes - one constexpr function that computes only the number of elements, used as the template argument for a std::array, and a second that fills that array - since std::array has automatic storage and can be baked into the binary directly. C++23 added constexpr std::unique_ptr, which helps within an evaluation but does not change the escape rule. If you genuinely need a large runtime container derived from compile-time logic, computing it into a function-local static on first use remains the pragmatic answer."
      },
      {
        question: "What is the difference between consteval and constexpr, and when do I need consteval?",
        answer:
          "constexpr on a function says it may be evaluated at compile time when the arguments permit, so the same function serves both contexts and a call with runtime arguments simply becomes an ordinary function call. consteval declares an immediate function, for which every call must be a constant expression - a call with runtime arguments is a compile error rather than a runtime call. The distinction matters whenever a runtime call would be a bug or would be meaningless. The clearest use is validation of literals: a consteval function that parses a format string, an IP address, a regular expression, or a units-annotated quantity can check the input and throw on failure, and because an exception cannot escape a constant evaluation the throw becomes a compile error naming the problem. This is precisely how std::format validates its format string against the argument types, which is the feature that makes it type-safe where printf is not. A second use is enforcing that expensive setup happens at build time rather than being silently paid at runtime - a compile-time registry, a perfect hash, or a table whose accidental runtime construction would be a performance bug that nobody notices. A third is API design where the function's result is only meaningful as a constant, such as producing a type identifier or a source location tag. The costs are that consteval functions cannot be used in contexts where the arguments are not constants, which makes them non-composable with ordinary code - a constexpr function cannot call a consteval one with its own parameters, since those parameters are not constant expressions within the function body, a restriction that C++23 partially relaxed with the immediate-escalating rules. The rule of thumb is to use constexpr by default and consteval only when a runtime call would be an error you want the compiler to catch."
      },
      {
        question: "How much compile time does constexpr code cost, and how do I measure it?",
        answer:
          "Enough to matter, and the cost is structurally worse than it first appears because it is paid per translation unit, on every build, by every developer. Constant evaluation runs in an interpreter inside the compiler rather than as compiled code, so it is typically one to two orders of magnitude slower than the equivalent runtime computation - a loop that takes a millisecond at runtime can take fifty to a hundred milliseconds to constant-evaluate. If that evaluation appears in a header included by three hundred translation units, and it is not cached across them, the build pays it three hundred times. Template metaprogramming compounds this further, since each instantiation creates a distinct type that the compiler must track, and deep recursive instantiation is a well-known cause of builds that take minutes and consume gigabytes of compiler memory. Implementations impose limits to prevent a runaway evaluation from hanging the build - GCC's -fconstexpr-ops-limit and -fconstexpr-depth, Clang's -fconstexpr-steps and -fconstexpr-depth - and hitting them is a signal to reconsider rather than merely to raise the limit. Measurement is straightforward with modern tooling. Clang's -ftime-trace emits a JSON profile viewable in chrome://tracing that attributes time to specific template instantiations and constant evaluations, and ClangBuildAnalyzer aggregates those across a whole build and ranks the most expensive headers, templates, and functions - running it once on a large codebase is usually revealing. GCC's -ftime-report gives per-phase totals without the attribution. The judgement to apply is a cost-benefit one: computing a one-kilobyte CRC table at compile time costs a few milliseconds and saves startup work plus a static initialisation order concern, which is clearly worth it, whereas a heavy numerical computation that adds seconds per translation unit to save microseconds once per program run is a net loss that grows with the team."
      },
      {
        question: "How do I debug a constexpr function that fails to evaluate?",
        answer:
          "The single most effective technique is to stop treating it as a constexpr problem: remove the constexpr from the variable or static_assert so the function is called at runtime, then debug it with an ordinary debugger, breakpoints, and printing. Constexpr functions are ordinary functions with extra restrictions, so the logic is identical and everything you know about debugging applies. Once the logic is correct, restore the constexpr and see whether it still fails, which separates logic errors from constant-evaluation restrictions. If it still fails, work through the common causes in order. First, something in the call chain is not constexpr - a standard library function that was not marked constexpr until a later standard, an assert which expands to a non-constexpr call in some implementations, or a call through a function pointer the compiler cannot resolve. Second, undefined behaviour: signed overflow, an out-of-bounds index, reading an uninitialised member, or dereferencing a null pointer all make the expression non-constant, and the diagnostic frequently says only that it is not a constant expression, which is unhelpful until you know to look for UB. Third, escaping allocation, which shows up whenever a container's storage would outlive the evaluation. Fourth, exhaustion of the implementation's operation or depth limit, which is distinguishable because the message says so explicitly. The bisection technique helps for long computations: introduce intermediate constexpr variables with static_asserts on their properties, which narrows the failure to one phase and gives the compiler a shorter trace to report. Compilers have improved considerably here - both GCC and Clang now print an evaluation backtrace showing the chain of calls and the specific operation that failed - so reading the full diagnostic rather than only its first line is usually worth the effort. C++26's constexpr-generated static_assert messages will help further by letting the assertion report the actual values involved."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - constexpr, consteval, constinit, std::is_constant_evaluated",
        insight: "Per-standard tables of what each release relaxed, and the exact rules on transient allocation."
      },
      {
        source: "video",
        attribution: "Jason Turner - constexpr ALL the things (C++Now / CppCon)",
        insight: "Worked examples of compile-time parsing and table generation, with honest discussion of build-time cost."
      },
      {
        source: "paper",
        attribution: "P0784 - More constexpr containers, and P1073 - consteval / immediate functions",
        insight: "The committee papers explaining why allocation must be transient and why consteval was separated from constexpr."
      }
    ]
  },
  {
    id: "topic-cpp-modern-vocabulary-types",
    moduleId: "mod-cpp-modern",
    title: "optional, variant, string_view, span: The Vocabulary Types",
    intuition:
      "Vocabulary types exist so that two libraries written by strangers can express the same idea with the same type. Before C++17 a function that might not return a value returned a bool and an out parameter, or a pointer that might be null, or a sentinel value, and every codebase chose differently - std::optional made maybe-a-value a single spelling everyone recognises. The same logic gave us variant for a value that is one of several types, string_view and span for non-owning views over contiguous data, and expected in C++23 for a result that may instead be an error. Every one of them trades an ownership question for a lifetime obligation, which is where their bugs come from.",
    complexity: {
      time:
        "All of these are zero-overhead abstractions in the sense that matters: optional access is a branch on a bool, variant access through std::get is a check on the type index and through std::visit is typically a jump through a compiler-generated table, and string_view and span operations are pointer arithmetic. Constructing a string_view from a std::string is O(1) where constructing a std::string from a string_view is O(n) plus an allocation, which is the entire reason string_view exists at API boundaries.",
      space:
        "optional<T> is sizeof(T) plus one bool plus padding to T's alignment, so optional<int> is typically 8 bytes rather than 5 - specialisations that pack the empty state into an invalid representation are not provided by the standard. variant is the size of its largest alternative plus a discriminator, so a variant containing one large type is expensive for all uses. string_view and span are two words - a pointer and a length - which is why passing them by value is correct and passing them by const reference is a pessimisation."
    },
    lesson: [
      {
        title: "optional: a Value That May Be Absent",
        content:
          "std::optional<T> holds either a T or nothing, storing the T inline rather than allocating, so it costs sizeof(T) plus a bool plus alignment padding. Its value over the alternatives is that absence is expressed in the type, so a caller cannot forget to check without the compiler or a sanitiser noticing, and the empty state is distinct from every valid value rather than stealing one. The critical discipline is that operator* and operator-> do not check - dereferencing an empty optional is undefined behaviour, exactly like dereferencing a null pointer - while value() throws std::bad_optional_access. It is the wrong tool when absence has a reason worth reporting, which is what expected is for, and when the contained type is expensive to move.",
        codeExample: `#include <optional>

std::optional<int> parse_int(std::string_view s) {
    int value{};
    auto [ptr, ec] = std::from_chars(s.data(), s.data() + s.size(), value);
    if (ec != std::errc{} || ptr != s.data() + s.size()) return std::nullopt;
    return value;
}

// Checking - four equivalent spellings
auto r = parse_int("42");
if (r)                 use(*r);        // explicit operator bool
if (r.has_value())     use(*r);        // the readable form
int v1 = r.value_or(0);                // default on absence
int v2 = r.value();                    // THROWS bad_optional_access

// ACCESS IS UNCHECKED
std::optional<int> empty;
// int bad = *empty;        // UNDEFINED BEHAVIOUR, like *nullptr
// int ok  = empty.value(); // throws - the checked form

// Construction and assignment
std::optional<std::string> a;                  // empty
std::optional<std::string> b = std::nullopt;   // empty, explicit
std::optional<std::string> c = "hello";        // engaged
std::optional<std::string> d{std::in_place, 5, 'x'};  // constructs
                                               // "xxxxx" IN PLACE,
                                               // no temporary
b = "world";        // assigns, engaging it
b.reset();          // destroys the value, now empty
b.emplace(5, 'y');  // constructs in place, destroying any old value

// C++23 monadic operations - chaining without nested ifs
std::optional<User> user = find_user(id);
auto city = user.and_then(&User::address)     // optional<Address>
                .and_then(&Address::city)     // optional<City>
                .transform(&City::name)       // optional<string>
                .value_or("unknown");
// and_then:   f returns an optional  (flat-map)
// transform:  f returns a plain value (map)
// or_else:    supplies an alternative optional when empty

// SIZE - there is no null-pointer-style packing
static_assert(sizeof(std::optional<int>) == 8);      // 4 + 1 + pad
static_assert(sizeof(std::optional<char>) == 2);
static_assert(sizeof(std::optional<int*>) == 16);    // NOT 8 - the
// standard does not specialise on pointers to use nullptr as the
// empty state, so optional<T*> doubles the size. Prefer a plain
// pointer when null already means absent.

// WHAT optional IS NOT FOR
//   1. Errors that have a reason. Use std::expected (C++23) or an
//      error code - optional discards WHY.
//   2. Optional REFERENCES: std::optional<T&> is not in the standard
//      (proposed for C++26). Use T* or reference_wrapper.
//   3. Arrays: std::optional<T[]> is ill-formed.
//   4. Making a member "not yet initialised" when the real fix is a
//      constructor that establishes the invariant.

// A genuinely good use: deferring construction of a non-default-
// constructible member
class Connection {
    std::optional<Socket> sock_;    // Socket has no default ctor
public:
    void connect(Endpoint e) { sock_.emplace(e); }   // constructs
    void disconnect()        { sock_.reset(); }      // destroys
    bool is_connected() const { return sock_.has_value(); }
};
// Without optional this needs a heap allocation or a union with
// manual lifetime management.

// COMPARISON semantics are worth knowing
std::optional<int> x, y{5};
x < y;              // TRUE: an empty optional is less than any value
x == std::nullopt;  // TRUE
y == 5;             // TRUE: compares against the contained value
// Two empty optionals compare EQUAL.`,
        diagram: asciiDiagram(`optional and variant: layout and the access contract

  std::optional<int>                    8 bytes
  ┌───────────────┬─────┬───────────────┐
  │  int value    │ bool│   padding     │
  │   4 bytes     │  1  │    3 bytes    │
  └───────────────┴─────┴───────────────┘
        ▲            ▲
        │            └── engaged flag
        └── valid ONLY when engaged; reading it otherwise is UB

  ACCESS CONTRACT — this is the part people get wrong
  ┌──────────────────────────────────────────────────────────┐
  │  *opt        UNCHECKED   UB when empty, like *nullptr    │
  │  opt→m       UNCHECKED   UB when empty                   │
  │  opt.value() CHECKED     throws std::bad_optional_access │
  │  opt.value_or(d)         returns d when empty            │
  └──────────────────────────────────────────────────────────┘

  optional<T*> does NOT pack into one pointer
  ┌─────────────────┬─────┬──────────┐
  │   T* (8 bytes)  │bool │ padding  │   = 16 bytes
  └─────────────────┴─────┴──────────┘
       the standard could have used nullptr as the empty state
       but did not, because a pointer that IS null must remain
       distinguishable from an ABSENT pointer

  ─────────────────────────────────────────────────────────────

  std::variant<int, double, std::string>
  ┌──────┬────────────────────────────────────────┐
  │index │        storage: max(sizeof(alts))      │
  │ 1 B  │            32 bytes (string)           │
  └──────┴────────────────────────────────────────┘
     ▲                     ▲
     │                     └── ONE alternative is alive at a time
     └── which one (0, 1, 2, or valueless)

  size = 40 bytes, driven ENTIRELY by std::string
       ⇒ one large alternative makes every instance large;
         hold it by unique_ptr if that matters

  VISITING
  ┌──────────────────────────────────────────────────────────┐
  │  std::visit(overloaded{                                  │
  │      [](int i)                { ... },                   │
  │      [](double d)             { ... },                   │
  │      [](const std::string& s) { ... }                    │
  │  }, v);                                                  │
  │                                                          │
  │  index ──► jump table ──► the matching lambda            │
  │                                                          │
  │  EXHAUSTIVE: adding a fourth alternative BREAKS THE      │
  │  BUILD until you handle it. get_if chains do not.        │
  └──────────────────────────────────────────────────────────┘

  VALUELESS BY EXCEPTION
        v holds a string, you assign a Widget
        Widget's move constructor THROWS
                    │
                    ▼
        the old value is already destroyed, the new one
        never completed
                    │
                    ▼
        v.valueless_by_exception() == true
        index() == variant_npos, visit() throws
                    │
                    ▼
        avoid it by making alternatives NOTHROW-MOVABLE`)
      },
      {
        title: "variant: a Value That Is One of Several Types",
        content:
          "std::variant<Ts...> is a type-safe tagged union that holds exactly one of its alternatives at a time, tracking which through an index and destroying the old alternative on assignment. Its decisive advantage over an enum-plus-union or a class hierarchy is that std::visit is exhaustive: adding an alternative breaks every visit site that does not handle it, turning a whole class of runtime bugs into compile errors, whereas a chain of get_if checks silently falls through. The cost is size, since a variant is as large as its largest alternative, and one awkward state - valueless_by_exception - which occurs when a move or copy into the variant throws after the old value has been destroyed, and which you avoid by making alternatives nothrow-movable.",
        codeExample: `#include <variant>

using Value = std::variant<std::monostate, int, double, std::string>;
// std::monostate is an empty type used as a first alternative so the
// variant is default-constructible even when the real alternatives
// are not.

Value v = 42;
v = 3.14;                 // destroys the int, constructs a double
v = std::string{"hi"};    // destroys the double

// Querying
v.index();                          // 3
std::holds_alternative<std::string>(v);   // true

// Access - three forms with different failure modes
std::get<std::string>(v);      // throws std::bad_variant_access
std::get<3>(v);                // by index; also throws
auto* p = std::get_if<std::string>(&v);   // nullptr on mismatch
if (p) use(*p);                           // the non-throwing form

// std::visit - the reason to prefer variant over a union
template <class... Ts> struct overloaded : Ts... {
    using Ts::operator()...;
};
template <class... Ts> overloaded(Ts...) -> overloaded<Ts...>;
// (the deduction guide is unnecessary in C++20)

std::string to_string(const Value& v) {
    return std::visit(overloaded{
        [](std::monostate)          { return std::string{"null"}; },
        [](int i)                   { return std::to_string(i); },
        [](double d)                { return std::to_string(d); },
        [](const std::string& s)    { return s; }
    }, v);
}
// EXHAUSTIVENESS is the payoff: adding 'bool' to Value makes this
// FAIL TO COMPILE until a bool handler is added. A switch on an
// enum tag, or a chain of get_if, would silently do the wrong thing.

// A generic visitor handles everything with one lambda
std::visit([](const auto& x) { std::cout << x; }, v);

// Multi-visitation over several variants at once
std::visit([](auto a, auto b) { return combine(a, b); }, v1, v2);
// The table is the CARTESIAN PRODUCT of the alternatives, so this
// grows quickly - two four-alternative variants means sixteen
// instantiations.

// VALUELESS BY EXCEPTION - the one genuinely awkward state
struct Throwy {
    Throwy(Throwy&&) { throw std::runtime_error{"boom"}; }
};
std::variant<std::string, Throwy> bad = std::string{"x"};
try { bad = Throwy{}; } catch (...) {}
bad.valueless_by_exception();   // TRUE
bad.index();                    // variant_npos
// std::visit(f, bad);          // throws bad_variant_access
//
// It happens because the old alternative must be destroyed before
// the new one is constructed in the same storage, so a throwing
// move leaves nothing alive. Prevent it by ensuring every
// alternative is nothrow move constructible - which is true of every
// standard type you are likely to use - or by holding a problematic
// type through a unique_ptr, whose move is noexcept.
static_assert(std::is_nothrow_move_constructible_v<MyType>);

// variant VERSUS a virtual hierarchy - a real design decision
//   variant wins when:
//     the set of types is CLOSED and known at compile time
//     you want exhaustiveness checking
//     you want value semantics and no heap allocation
//     the operations vary more than the types (adding an operation
//       means one new visitor, touching nothing else)
//   virtual wins when:
//     the set of types is OPEN and extensible by other libraries
//     the types differ greatly in size (variant pays for the max)
//     the types vary more than the operations (adding a type means
//       one new class, touching nothing else)
// This is the expression problem, and neither side is free.

// A practical AST, which is variant's canonical use
struct Add; struct Mul; struct Lit;
using Expr = std::variant<Lit, std::unique_ptr<Add>,
                          std::unique_ptr<Mul>>;
struct Lit { double value; };
struct Add { Expr lhs, rhs; };
struct Mul { Expr lhs, rhs; };
double eval(const Expr& e) {
    return std::visit(overloaded{
        [](const Lit& l) { return l.value; },
        [](const std::unique_ptr<Add>& a)
            { return eval(a->lhs) + eval(a->rhs); },
        [](const std::unique_ptr<Mul>& m)
            { return eval(m->lhs) * eval(m->rhs); }
    }, e);
}
// The unique_ptr indirection is required because Add contains Expr,
// which would otherwise be infinitely recursive.

// std::any - type-erased single value, rarely the right answer
std::any a = 42;
std::any_cast<int>(a);       // throws bad_any_cast on mismatch
// Prefer variant when the type set is known: any costs a heap
// allocation for large types, gives no exhaustiveness, and pushes
// every type error to runtime.`
      },
      {
        title: "string_view and span: Non-Owning Views",
        content:
          "std::string_view and std::span are each a pointer and a length describing memory owned by someone else, and their purpose is to let a function accept any contiguous sequence without copying or templating. A function taking string_view accepts std::string, a string literal, a substring, or a char buffer with no allocation, where the const std::string& parameter it replaces silently allocated whenever a caller passed a literal. The obligation transferred to the caller is lifetime: a view is only valid while the underlying storage lives and is not reallocated, so returning a view of a local, binding one to a temporary, or holding one across a push_back are all dangling bugs the compiler will not catch. The rules are simple - take views as parameters, never store them as members or return them from functions that own the data.",
        codeExample: `#include <string_view>
#include <span>

// The old signature allocated for literal callers
void log_old(const std::string& msg);
log_old("hello");           // ALLOCATES a temporary std::string

// The modern one does not
void log(std::string_view msg);
log("hello");               // no allocation, points at .rodata
log(some_std_string);       // no allocation
log(buffer.data() + 4);     // no allocation (needs a length or NUL)
// Pass string_view BY VALUE - it is two words, and const& is a
// pessimisation that adds an indirection.

// Cheap operations that would otherwise copy
std::string_view sv = "hello world";
sv.substr(0, 5);            // O(1) - std::string::substr is O(n)
sv.remove_prefix(6);        // O(1) - now "world"
sv.find("wor");             // same algorithms as string

// THE HAZARDS - every one of these is a real bug pattern
// 1. A view of a temporary
std::string_view bad1 = get_string();       // DANGLING: the returned
                                            // string dies at the
                                            // end of this statement
std::string_view bad2 = s1 + s2;            // DANGLING: temporary

// 2. Returning a view of a local
std::string_view bad3() {
    std::string local = compute();
    return local;                           // DANGLING
}

// 3. Holding a view across a mutation
std::string s = "hello";
std::string_view v = s;
s += " world";                              // may REALLOCATE
use(v);                                     // DANGLING

// 4. NOT NUL-TERMINATED - this is the subtle one
void c_api(const char* s);
std::string_view sv2 = "hello world";
sv2.remove_suffix(6);                       // "hello"
// c_api(sv2.data());     // reads "hello world" - data() is NOT
                          // null-terminated at the view's end
std::string tmp{sv2};     // materialise when a C API needs it
c_api(tmp.c_str());

// 5. Storing one as a member - almost always wrong
struct Bad  { std::string_view name_; };    // who owns the chars?
struct Good { std::string      name_; };    // own your members

// std::span - the same idea for any contiguous range (C++20)
void process(std::span<const int> data);
process(std::vector<int>{1,2,3});     // vector
process(std::array<int,3>{1,2,3});    // array
process(c_array);                     // C array, length DEDUCED
int raw[10]; process({raw, 5});       // pointer + length

// span replaces the (pointer, length) parameter pair, which is the
// single most common source of buffer overruns in C and C++:
void old_style(int* data, std::size_t n);   // nothing links them
void new_style(std::span<int> data);        // the length travels
                                            // WITH the pointer

// Fixed-extent spans carry the size in the TYPE
std::span<int, 3> fixed{arr};        // size known at compile time
static_assert(fixed.size() == 3);    // and usable as a constant
std::span<int> dynamic{vec};         // size stored at runtime

// Useful operations
auto first_half = data.subspan(0, data.size() / 2);
auto tail       = data.last(10);
auto head       = data.first(10);
// as_bytes / as_writable_bytes reinterpret a span as std::byte,
// which is the correct way to serialise:
std::span<const std::byte> raw_bytes = std::as_bytes(data);

// span is NOT bounds-checked by default
std::span<int> s3{vec};
// s3[100];                 // UB if out of range
// Use .at() where available (C++26), or enable the hardened
// standard library: _GLIBCXX_ASSERTIONS, or libc++ hardening modes.

// THE RULE that prevents every hazard above
//   Views are PARAMETERS. Owners are MEMBERS and RETURNS.
//   Take string_view / span as a parameter; store std::string /
//   std::vector as a member; return an owning type unless the
//   caller demonstrably owns the storage and outlives the call.
// C++26 adds lifetimebound annotations and P2748 bans returning a
// reference to a temporary in more cases, but today this is a
// discipline the compiler mostly cannot enforce. -Wdangling-gsl in
// GCC and Clang catches the simplest cases only.`,
        diagram: asciiDiagram(`Views: what they are, and where they dangle

  std::string_view / std::span — TWO WORDS, no ownership
  ┌──────────────────┬──────────────────┐
  │  const char* ptr │  size_t length   │      16 bytes
  └────────┬─────────┴──────────────────┘
           │
           ▼
     ┌───────────────────────────────────────┐
     │ h  e  l  l  o     w  o  r  l  d       │  storage owned
     └───────────────────────────────────────┘  by SOMEONE ELSE

  WHAT THE VIEW BUYS YOU
  ┌────────────────────────────────────────────────────────┐
  │  void log(const std::string& m);                       │
  │      log("hello")   ──►  ALLOCATES a temporary string  │
  │                                                        │
  │  void log(std::string_view m);                         │
  │      log("hello")   ──►  points at .rodata, no alloc   │
  │      log(a_string)  ──►  no alloc                      │
  │      log(sub)       ──►  no alloc                      │
  └────────────────────────────────────────────────────────┘

  THE FOUR WAYS IT DANGLES
  ┌────────────────────────────────────────────────────────┐
  │ 1. view of a TEMPORARY                                 │
  │      string_view v = make_string();                    │
  │      the string dies at the semicolon; v points at     │
  │      freed memory                                      │
  │                                                        │
  │ 2. view of a LOCAL, returned                           │
  │      string_view f() { string s = ...; return s; }     │
  │                                                        │
  │ 3. view held across a MUTATION                         │
  │      string_view v = s;   s.push_back('x');            │
  │      reallocation moves the buffer; v is stale         │
  │      (same failure mode as iterator invalidation)      │
  │                                                        │
  │ 4. .data() is NOT NUL-TERMINATED                       │
  │      sv = "hello world"; sv.remove_suffix(6);          │
  │      c_api(sv.data())  reads "hello world", not        │
  │      "hello" — materialise a std::string first         │
  └────────────────────────────────────────────────────────┘

  span REPLACES THE POINTER-AND-LENGTH PAIR
  ┌────────────────────────────────────────────────────────┐
  │  void f(int* p, size_t n);                             │
  │      nothing ties n to p; a caller can pass the        │
  │      wrong n and the compiler is silent                │
  │                                                        │
  │  void f(std::span<int> s);                             │
  │      the length travels WITH the pointer, and is       │
  │      deduced from vector, array, or a C array          │
  └────────────────────────────────────────────────────────┘

  THE RULE THAT PREVENTS ALL OF IT
        ┌──────────────────────────────────────────┐
        │  views are PARAMETERS                    │
        │  owners are MEMBERS and RETURN VALUES    │
        └──────────────────────────────────────────┘
              parameter   ✓  string_view / span
              member      ✗  use string / vector
              return      ✗  unless the caller owns it`)
      },
      {
        title: "expected, Structured Bindings, and Choosing Between Them",
        content:
          "std::expected<T, E> from C++23 completes the set by carrying either a value or a reason for its absence, which is what optional cannot do and what exceptions do at a cost some codebases will not pay. Structured bindings are the syntax that makes all of these pleasant to consume, decomposing a pair, tuple, array, or any struct with public members into named variables, and they are worth understanding precisely because the names are bindings to members of a hidden object rather than independent copies. Choosing among the vocabulary types comes down to a few clear questions: does absence have a reason, is the type set closed, does the callee own the data, and is the failure exceptional or routine.",
        codeExample: `#include <expected>   // C++23

// optional discards WHY. expected does not.
std::expected<Config, ParseError> load_config(std::string_view path) {
    auto text = read_file(path);
    if (!text) return std::unexpected(ParseError::FileNotFound);
    auto parsed = parse(*text);
    if (!parsed) return std::unexpected(ParseError::Malformed);
    return *parsed;
}

auto cfg = load_config("app.toml");
if (cfg)  use(*cfg);
else      report(cfg.error());        // the REASON is available
cfg.value();                          // throws bad_expected_access<E>
cfg.value_or(Config::defaults());

// Monadic chaining, which is where it earns its keep
auto result = load_config(path)
    .and_then(validate)               // expected<Config,E> -> ...
    .transform(&Config::port)         // plain value
    .transform_error(to_message)      // map the ERROR type
    .value_or(8080);
// The equivalent with error codes is a ladder of if statements;
// with exceptions it is a try block. This composes.

// CHOOSING an error strategy
//   exceptions   - errors that are genuinely exceptional, deep call
//                  stacks, constructors; zero cost when not thrown,
//                  but unbounded latency when thrown, which is why
//                  they are banned in some embedded and HFT code
//   expected     - routine, expected failures: parsing, lookup,
//                  I/O; explicit in the signature, cheap, composable
//   optional     - absence with no interesting reason
//   error codes  - C interop and ABI boundaries
// Mixing all four in one codebase is the actual problem; pick a
// convention per layer and convert at boundaries.

// STRUCTURED BINDINGS (C++17)
std::map<std::string, int> m;
for (const auto& [key, value] : m) use(key, value);
// Before: it->first and it->second, which read as nothing.

auto [iter, inserted] = m.insert({"k", 1});   // pair
auto [x, y, z] = std::array{1, 2, 3};         // array
struct P { int a; double b; };
auto [a, b] = P{1, 2.0};                      // any struct with
                                              // public members

// The names are BINDINGS TO MEMBERS of a hidden object, not
// independent variables:
auto [p, q] = make_pair();     // COPIES the pair, then p and q name
                               // its members
auto& [r, s] = some_pair;      // no copy; r and s name the members
                               // of some_pair itself
const auto& [t, u] = f();      // lifetime-extends the temporary

// The hidden object is why this matters:
std::pair<std::string, int> pr{"x", 1};
auto& [name, count] = pr;
name = "y";                    // MODIFIES pr.first

// TRAPS
// 1. You cannot ignore a binding - all members must be named
//    (C++26 adds _ as a placeholder)
// 2. Structured bindings cannot be captured by a lambda before
//    C++20:
auto [k, v] = get();
// auto f = [k]{ return k; };     // ill-formed in C++17, OK in C++20
// 3. There is no way to apply attributes or add a type to one name
// 4. Binding to a tuple-like type requires tuple_size, tuple_element
//    and get - which you can implement for your own type

// CHOOSING A VOCABULARY TYPE - the decision in four questions
//
//  "might there be no value?"
//        does the absence have a REASON worth reporting?
//              no  -> std::optional<T>
//              yes -> std::expected<T, E>, or an exception
//
//  "is it one of several types?"
//        is the set CLOSED and known at compile time?
//              yes -> std::variant<Ts...>   (exhaustive visiting)
//              no  -> a virtual interface, or std::any as a last
//                     resort
//
//  "does the function need to OWN the data?"
//        no  -> std::string_view / std::span parameter
//        yes -> std::string / std::vector, taken by value and moved
//
//  "is it a pair of related values?"
//        with meaningful names -> a named struct, always
//        genuinely anonymous   -> std::pair / std::tuple, consumed
//                                 with structured bindings

// A cautionary note on tuple: prefer a struct with named members for
// anything that crosses an API boundary. std::tuple<int,int,int> is
// unreadable at the call site; struct Rgb { int r, g, b; } is not,
// and structured bindings decompose it just as well.`
      }
    ],
    examples: [
      {
        title: "A string_view member that outlives its storage",
        input: "A class stores std::string_view name_ initialised from a temporary std::string built by the caller.",
        output: "Reads of name_ return garbage or crash, intermittently, usually only under optimisation or in production.",
        explanation:
          "Step 1: string_view is a pointer and a length with no ownership, so constructing one from a temporary std::string captures a pointer to a buffer that is freed at the end of the full expression.\nStep 2: The object survives, so the member still holds a valid-looking pointer into memory the allocator has since reused, which is why the failure is intermittent rather than immediate - the bytes often remain intact until something else allocates.\nStep 3: Debug builds frequently mask this because allocators reuse memory less aggressively and because the string's small-buffer optimisation may place short strings inside the temporary's own storage on the stack, which is then overwritten by the next call.\nStep 4: The correct fix is to store a std::string member and take a string_view parameter, so the class owns its data and the caller still avoids an allocation when passing a literal - views belong in parameters, owners belong in members.\nStep 5: Compilers catch only the simplest form of this with -Wdangling-gsl, and the address sanitiser catches it reliably at runtime, which is a strong reason to run the test suite under ASan even when the code compiles without warnings."
      },
      {
        title: "A variant that becomes valueless after a throwing move",
        input: "Assigning a new alternative into a std::variant where the new alternative's move constructor throws.",
        output: "The variant reports valueless_by_exception, index() returns variant_npos, and every subsequent std::visit throws.",
        explanation:
          "Step 1: A variant stores its alternatives in a single block of storage, so assigning a different alternative requires destroying the current one before constructing the new one in the same bytes.\nStep 2: If the new alternative's construction throws after the old one has been destroyed, there is nothing alive in the storage and no way to restore the old value, since it has already been destroyed.\nStep 3: Rather than leave the object in an unspecified state or require an allocation to provide the strong guarantee, the standard defines a distinguished empty state that the object enters, reported by valueless_by_exception.\nStep 4: In practice this almost never occurs because implementations avoid it whenever the alternatives are nothrow move constructible, which is true of every standard type you are likely to store, so asserting is_nothrow_move_constructible_v on your own alternatives is the practical defence.\nStep 5: When an alternative genuinely cannot offer a nothrow move, holding it through a std::unique_ptr sidesteps the problem entirely, because moving a unique_ptr is a pointer copy that cannot throw."
      },
      {
        title: "Adding an alternative to a variant and catching every use site",
        input: "A Value variant gains a bool alternative; some code uses std::visit with an overload set and other code uses a chain of get_if checks.",
        output: "The visit sites fail to compile until a bool handler is added; the get_if chains compile and silently take the fallback path.",
        explanation:
          "Step 1: std::visit requires the visitor to be callable with every alternative, so an overload set that lacks a bool overload is not a valid visitor and the call is ill-formed with a diagnostic at that call site.\nStep 2: A chain of get_if calls is just a sequence of independent conditionals, so nothing forces it to be exhaustive - the new alternative falls through to whatever the final else does, which is typically an incorrect default or a silently skipped case.\nStep 3: This exhaustiveness is the strongest practical argument for variant over an enum-plus-union or a hand-rolled tagged type, because it converts a maintenance hazard into a build failure that names every location needing attention.\nStep 4: The same benefit is available from a generic fallback lambda taking auto, but that deliberately opts out of exhaustiveness, so it should be used only where a genuinely uniform operation applies to every alternative rather than as a way to silence the error.\nStep 5: The design lesson generalises: variant makes adding an operation cheap and adding a type expensive, while a virtual hierarchy makes adding a type cheap and adding an operation expensive, which is the expression problem and the reason the choice between them is about which axis your code actually changes along."
      }
    ],
    tips: [
      "Pass string_view and span by value rather than by const reference, since they are two words and a reference adds an indirection for no benefit.",
      "Store owning types as members and take views as parameters - almost every dangling-view bug comes from violating that one rule.",
      "Assert std::is_nothrow_move_constructible_v on your variant alternatives so the valueless-by-exception state becomes unreachable."
    ],
    tricks: [
      "The overloaded idiom - a struct inheriting from several lambdas with using Ts::operator()... - turns std::visit into readable per-alternative dispatch.",
      "std::optional's in_place constructor builds the contained value directly, avoiding a temporary for types that are expensive to move.",
      "std::as_bytes on a span is the correct, well-defined way to reinterpret a range for serialisation, rather than a reinterpret_cast to char*."
    ],
    memoryAids: [
      "optional says maybe, expected says maybe and why, variant says one of these, view says someone else owns this.",
      "operator* on optional is as unchecked as dereferencing a pointer; value() is the one that throws.",
      "string_view::data() is not null-terminated - materialise a std::string before handing it to a C API."
    ],
    interviewPatterns: [
      "'When would you use optional versus expected versus an exception?' is a design question testing whether you distinguish routine failure from exceptional failure.",
      "'What are the dangers of string_view?' expects the four dangling patterns plus the missing null terminator, not just a definition.",
      "Frequency and companies: extremely common at any shop on C++17 or later, and a favourite at firms that ban exceptions, where expected is the house style."
    ],
    practiceProblems: [
      "Why is sizeof(std::optional<int*>) typically 16 rather than 8? Answer: std::optional stores the contained object inline alongside a separate bool recording engagement, and the standard does not provide a specialisation that reuses an invalid representation as the empty state, so optional<int*> is a pointer plus a bool padded to the pointer's alignment; the design is deliberate because a pointer that is genuinely null must remain distinguishable from an absent pointer, and libraries that want the packed representation build their own compact optional with a designated invalid value - when null already means absent, a plain pointer is the better choice.",
      "Design a function returning a parsed configuration that may fail for several distinct reasons, in a codebase that forbids exceptions. Answer: return std::expected<Config, ParseError> where ParseError is an enum class or a small struct carrying a code plus context such as a line number; the signature makes failure explicit and unignorable in a way an out parameter does not, callers can chain with and_then and transform rather than writing an if ladder, and transform_error converts the error type at layer boundaries; if the target is pre-C++23 the same shape is available from tl::expected or an equivalent, and the fallback of optional plus a separate error code is worse because nothing ties the two together.",
      "Explain when a std::variant is the wrong choice even though the type set is closed. Answer: when the alternatives differ greatly in size, because a variant is as large as its largest alternative plus a discriminator, so a variant of a four-byte int and a two-hundred-byte struct costs two hundred and eight bytes for every instance including the ones holding an int - which destroys cache behaviour in a container of them; the fixes are to hold the large alternative through a unique_ptr, accepting an indirection, or to reconsider whether a virtual hierarchy with heap-allocated nodes is the honest representation; a second case is when the alternatives must be extensible by code you do not control, since a variant's alternative list is fixed at the point of declaration."
    ],
    faq: [
      {
        question: "When should I use optional rather than a pointer, a sentinel value, or an exception?",
        answer:
          "Use optional when a value may legitimately be absent, that absence is routine rather than exceptional, and there is nothing interesting to say about why. Compared with a pointer, optional is clearer because a pointer conflates several meanings - it may signal optionality, but it may equally signal non-ownership, polymorphism, or an array - whereas optional means exactly one thing and stores its value inline rather than requiring separate storage. Compared with a sentinel such as -1, an empty string, or a magic timestamp, optional does not steal a value from the domain, which matters because sentinels break the moment the real data contains one, and they are invisible in the signature so callers forget to check. Compared with an exception, optional is far cheaper for a failure that occurs routinely: a lookup that misses half the time should not throw, both because the latency of throwing is unbounded and because control flow that is normal should not be spelled as an error. Compared with a bool return plus an out parameter, optional composes - it can be returned, stored, and chained through and_then and transform - where an out parameter cannot. The cases where optional is the wrong answer are worth knowing precisely: when the absence has a reason the caller needs, use std::expected so the reason survives; when the contained type is large and frequently absent, the inline storage is wasted and a pointer or a variant may be better; when you want an optional reference, note that optional<T&> is not in the standard and use a pointer or reference_wrapper; and when a member is optional only because the constructor does not establish the class invariant, the real fix is the constructor. One further practical point is that optional<T*> does not pack into a single pointer, so it is typically sixteen bytes - if null already means absent, a plain pointer is both smaller and clearer."
      },
      {
        question: "What is valueless_by_exception and should I worry about it?",
        answer:
          "It is the state a std::variant enters when a change of alternative fails partway through. A variant stores all its alternatives in one block of storage, so assigning a new alternative requires destroying the currently held one and then constructing the new one in those same bytes. If the construction throws, the old value is already gone and the new one never completed, so there is nothing alive in the storage. The committee's options were to require an allocation so the old value could be preserved, which would have made variant non-zero-overhead and unusable in the environments that most want it, or to define a distinguished empty state - and they chose the latter. In that state index() returns variant_npos, valueless_by_exception() returns true, and std::visit throws bad_variant_access. In practice you should worry about it very little, because implementations avoid entering it whenever they can. When the new alternative is nothrow move constructible, the implementation constructs a temporary first and then moves it into place, which cannot throw, so the state is unreachable. Every standard type you are likely to store - all the containers, string, the smart pointers, and any aggregate of them - has a nothrow move constructor, so ordinary code never sees it. The defence for your own types is a one-line assertion, static_assert on is_nothrow_move_constructible_v for each alternative, which is worth adding when the variant is part of a public interface. If a type genuinely cannot provide a nothrow move - because it holds a member that allocates on move, or because it is a legacy type you cannot change - hold it through a std::unique_ptr, since moving a unique_ptr is a pointer copy and cannot throw. The remaining honest answer is that if you find yourself writing code to handle the valueless state gracefully, that is a signal the design has a throwing move that should be fixed instead."
        },
      {
        question: "Why is string_view dangerous, and what exactly should I watch for?",
        answer:
          "Because it is a pointer and a length with no ownership, so it is valid only while the memory it describes remains alive and unmoved, and the compiler generally cannot tell you when that stops being true. There are four distinct failure patterns and they are worth memorising individually. The first is binding a view to a temporary: string_view v = get_string() or string_view v = a + b captures a pointer into a std::string that is destroyed at the end of the full expression, and unlike a const reference there is no lifetime extension because the view is not a reference to the object. The second is returning a view of a local, which is the same bug across a function boundary and which -Wreturn-stack-address sometimes catches but frequently does not when the storage is heap-allocated by the local string. The third is holding a view across a mutation of the underlying container - appending to the string may reallocate its buffer, leaving the view pointing at freed memory, which is exactly the iterator invalidation problem in a different costume. The fourth is subtler and bites at C API boundaries: a string_view is not guaranteed to be null-terminated, so after remove_suffix or a substr of a larger string, calling data() gives a pointer to characters that continue past the view's end, and passing it to a function expecting a C string reads more than you intended. The defence is a single rule that eliminates all four: views are parameters, owners are members and return values. Take string_view as a function parameter so callers avoid an allocation, store std::string as a member so the object owns its data, and return an owning type unless you can point at storage the caller demonstrably owns and that outlives the call. Beyond that, run the test suite under the address sanitiser, which catches these reliably where the compiler does not, and enable -Wdangling-gsl for the simplest cases."
      },
      {
        question: "When should I prefer std::variant over a class hierarchy with virtual functions?",
        answer:
          "The decisive question is whether your set of types is closed. If the alternatives are known at compile time and change rarely - the node kinds in an abstract syntax tree, the states of a protocol machine, the shapes of a message - variant is usually better, and its strongest advantage is exhaustiveness: std::visit requires the visitor to handle every alternative, so adding a new one breaks the build at every site that must be updated, whereas a virtual hierarchy silently inherits a base implementation and a chain of dynamic_cast or get_if checks silently falls through to a default. Variant also gives value semantics with no heap allocation, so a vector of variants is contiguous and cache-friendly where a vector of unique_ptr to a base class is a pointer chase, and it works in environments without dynamic allocation. The hierarchy wins in the mirror-image cases. If the type set is open, so that another team or another library must be able to add a type without editing your header, virtual dispatch is the only option, since a variant's alternative list is fixed where it is declared. If the alternatives differ greatly in size, variant pays for the largest in every instance, so a variant of an int and a two-hundred-byte struct costs over two hundred bytes even when holding an int, which is often unacceptable in a container. And if the code changes by adding types more often than by adding operations, the hierarchy localises each change to one new class, whereas variant would require editing every visitor. This is the expression problem, stated precisely: variant makes operations easy to add and types hard, virtual makes types easy to add and operations hard, and no mainstream language solves both. A practical middle path exists - hold a large or awkward alternative through a unique_ptr inside the variant - which recovers the size behaviour at the cost of an indirection, and is exactly what recursive AST nodes must do anyway."
      },
      {
        question: "What is std::expected and how does it compare with exceptions?",
        answer:
          "std::expected<T, E>, added in C++23, holds either a value of type T or an error of type E, so it is optional with a reason attached. Access follows the same shape - operator bool and operator* for the value, error() for the failure, value() throwing bad_expected_access - and it supports monadic chaining through and_then, transform, or_else, and transform_error, which is where it earns its keep because a sequence of fallible steps composes into an expression rather than an if ladder. The comparison with exceptions is really a comparison of two costs. Exceptions are zero-overhead on the success path in the table-driven implementations every mainstream compiler uses, which is their great virtue: code that never throws pays nothing for the possibility. But throwing is expensive and, more importantly, has unbounded and unpredictable latency, since it involves unwinding, a global lock in some implementations, and RTTI lookups - which is why exceptions are banned outright in much embedded, games, and low-latency financial code. They are also invisible in the signature, so nothing tells a reader or the compiler which functions may fail, and noexcept is the only annotation available. expected inverts every one of those properties: failure is explicit in the return type and impossible to ignore accidentally, the cost is a branch and the storage of the larger alternative, and the latency is bounded. The costs are that it propagates manually, so every intermediate function must handle or forward it, which is verbose without a try-style macro or the monadic operations; that it cannot report failure from a constructor, where exceptions remain the only mechanism; and that it enlarges return types. The practical guidance is to choose by the nature of the failure rather than by taste: routine, expected failures like parsing, lookup, and I/O suit expected, while genuinely exceptional conditions and constructor failures suit exceptions - and above all pick one convention per layer and convert at boundaries, because the real damage comes from mixing four error strategies in one codebase."
      },
      {
        question: "What exactly do structured bindings bind to, and what are their limitations?",
        answer:
          "A structured binding declaration introduces names that refer to the members of a hidden anonymous object, not independent variables - and understanding that explains every one of its behaviours. Writing auto [a, b] = f() first creates an unnamed object initialised from f()'s result, applying the usual auto deduction, and then a and b become names for that object's members. So auto [a, b] = some_pair copies the pair and then names the copy's members, meaning modifying a does not affect some_pair; whereas auto& [a, b] = some_pair creates no copy and a genuinely names some_pair.first, so assigning to it modifies the original. Similarly const auto& [a, b] = f() binds the hidden object to the temporary and lifetime-extends it, which is the efficient form for reading. Three kinds of type can be decomposed: an array, in which case the bindings name the elements; any class type with all public non-static data members in a single class, in which case they name those members in declaration order; and any type implementing the tuple protocol via tuple_size, tuple_element, and get, which is how pair, tuple, and array work and which you can implement for your own type. The limitations are real if minor. Every member must be named, so you cannot ignore one - C++26 adds an underscore placeholder for exactly this complaint. You cannot give a binding an explicit type or apply most attributes to individual names. In C++17 structured bindings could not be captured by a lambda, which was widely hit when iterating a map and capturing the key, and C++20 fixed it. The bindings are not variables in the language's formal sense, which is why they interact awkwardly with a few constructs. The one style caution worth adding is that structured bindings make std::tuple more tolerable at the consumption site but do not make it a good interface - a named struct with meaningful member names is clearer at every call site, and decomposes just as well."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - std::optional, std::variant, std::string_view, std::span, std::expected",
        insight: "Exact preconditions on unchecked access, the valueless-by-exception rules, and which operations are constexpr."
      },
      {
        source: "book",
        attribution: "Nicolai Josuttis - C++17: The Complete Guide, and C++20: The Complete Guide",
        insight: "Chapter-length treatment of each vocabulary type with the surprising cases and layout details spelled out."
      },
      {
        source: "paper",
        attribution: "P0323 - std::expected, and the C++ Core Guidelines section on views and ownership",
        insight: "The rationale for a value-based error channel, and the ownership rules that prevent dangling views."
      }
    ]
  },
  {
    id: "topic-cpp-modern-interview-traps",
    moduleId: "mod-cpp-modern",
    title: "Classic Interview Traps and the Undefined Behaviour Catalogue",
    intuition:
      "Almost every hard C++ interview question is drawn from a small catalogue of traps that have been catching people for thirty years, and they persist because each one is a place where the language's syntax or its optimiser's assumptions diverge from ordinary intuition. The most vexing parse turns a variable definition into a function declaration; the static initialisation order fiasco makes correctness depend on link order; slicing silently discards half an object; a missing virtual destructor leaks without a diagnostic. What unifies them is undefined behaviour: the compiler is entitled to assume it never happens, so the symptom appears far from the cause, often only under optimisation, and often only in production.",
    complexity: {
      time:
        "Undefined behaviour has no complexity because it has no defined behaviour - an optimiser that proves a branch would be UB may delete the branch, delete the check that guards it, or delete the entire function body, so reasoning about the cost of buggy code is meaningless. The practical cost is diagnostic: UBSan adds roughly twenty percent runtime overhead, ASan two to three times with double the memory, and TSan five to fifteen times, which is why they run in CI on a subset of tests rather than in production.",
      space:
        "The layout facts that these traps depend on are worth knowing precisely: a polymorphic object carries one vtable pointer per polymorphic base, so eight bytes on a 64-bit platform, and slicing copies only the base subobject; std::vector<bool> packs to one bit per element, so a million booleans occupy 125 kilobytes rather than a megabyte, at the cost of not being a real container; and a shared_ptr is sixteen bytes with a separately allocated control block unless make_shared merges them."
    },
    lesson: [
      {
        title: "Syntax and Initialisation Traps",
        content:
          "The most vexing parse is the rule that anything which can be parsed as a declaration is a declaration, so Widget w() declares a function and Widget w(Thing()) declares a function taking a function pointer, which is why the object you expected never appears. Brace initialisation resolves it and is the general recommendation, but braces introduce their own trap because an initializer_list constructor is strongly preferred over every other, making vector<int> v{10, 5} a two-element vector while vector<int> v(10, 5) is ten fives. The static initialisation order fiasco is the third: the order of dynamic initialisation of namespace-scope objects across translation units is unspecified, so one global reading another during its construction may read an object that does not exist yet, and the fix is a function-local static whose initialisation is guaranteed on first use and thread-safe since C++11.",
        codeExample: `// THE MOST VEXING PARSE
struct Timer { Timer(); };
struct Widget { Widget(Timer); };

Widget w1(Timer());     // NOT a Widget. This DECLARES A FUNCTION
                        //   named w1 taking a pointer to a function
                        //   returning Timer, and returning Widget.
Widget w2{Timer{}};     // an actual Widget - braces cannot be a
                        //   parameter list
Widget w3((Timer()));   // also an object - the extra parens make it
                        //   an expression
Timer t;                // fine
Timer t2();             // a FUNCTION DECLARATION, not an object

// The rule: if it CAN be parsed as a declaration, it IS one.
// The symptom is usually "no member named X" on the next line,
// or a destructor that never runs.

// BRACE INITIALISATION AND initializer_list
std::vector<int> a(10, 5);   // ten elements, each 5
std::vector<int> b{10, 5};   // TWO elements: 10 and 5
// An initializer_list constructor is preferred over ALL others
// whenever the braced list can convert - this is not overload
// resolution as usual, it is a hard preference.

std::vector<std::string> c(3);      // three empty strings
std::vector<std::string> d{3};      // ERROR: 3 is not a string
                                    // (no initializer_list match,
                                    // falls back and fails)

// Braces also FORBID NARROWING, which is a genuine benefit
int x{3.14};        // ERROR: narrowing conversion
int y = 3.14;       // compiles, silently truncates to 3
int z{};            // zero-initialised - always prefer this to
int w;              // INDETERMINATE - reading it is UB

// Guidance: use braces by default for the narrowing check and to
// dodge the vexing parse; use parentheses when you specifically want
// a non-initializer_list constructor, chiefly the container
// (count, value) forms.

// STATIC INITIALISATION ORDER FIASCO
// --- a.cpp ---
extern Config config;
Logger logger{config.log_level()};   // reads config...
// --- b.cpp ---
Config config{load()};               // ...which may not exist yet
//
// Dynamic initialisation order across translation units is
// UNSPECIFIED. Link order decides it, so a change to the build
// system can break a working program.

// THE FIX: a function-local static, initialised on first use
Config& config() {
    static Config instance{load()};   // initialised on first call,
    return instance;                  // thread-safe since C++11
}
Logger& logger() {
    static Logger instance{config().log_level()};   // ordering is
    return instance;                                // now EXPLICIT
}
// C++11 requires the compiler to emit a guard so concurrent first
// calls block rather than race - the "magic statics" guarantee.
// Costs one atomic load on every subsequent call, which is free in
// practice.
// The alternative in C++20 is constinit, which forces CONSTANT
// initialisation and so cannot be ordered wrongly:
constinit Config config{compile_time_defaults()};

// There is a matching DESTRUCTION order fiasco: function-local
// statics are destroyed in reverse order of construction, so a
// logger destroyed before its last user produces a use-after-free
// at shutdown. The pragmatic answer for process-lifetime singletons
// is to leak them deliberately:
Logger& logger2() { static Logger* p = new Logger{}; return *p; }

// INTEGER PROMOTION AND SIGNED/UNSIGNED COMPARISON
std::vector<int> v{1, 2, 3};
for (int i = 0; i < v.size(); ++i) {}     // WARNING: i is converted
                                          // to size_t; a negative i
                                          // becomes enormous
for (std::size_t i = 0; i < v.size(); ++i) {}
for (int i = v.size() - 1; i >= 0; --i) {}      // fine for int
for (std::size_t i = v.size() - 1; i >= 0; --i) {}  // INFINITE LOOP:
                                          // an unsigned value is
                                          // never < 0, and on an
                                          // empty vector size()-1
                                          // is SIZE_MAX
// Prefer range-for, or ssize() in C++20 which returns a SIGNED size.
for (int e : v) {}
for (std::ptrdiff_t i = std::ssize(v) - 1; i >= 0; --i) {}

// Promotion surprises
unsigned char a1 = 200, b1 = 100;
auto s = a1 + b1;       // int, 300 - both promote to int first
short sh = -1;
unsigned int ui = 1;
sh < ui;                // FALSE: sh converts to a huge unsigned
// -Wsign-compare and -Wconversion catch most of these; turn them on.`,
        diagram: asciiDiagram(`The parse and initialisation traps

  MOST VEXING PARSE
  ┌──────────────────────────────────────────────────────────┐
  │  Widget w(Timer());                                      │
  │                                                          │
  │  what you meant:                                         │
  │      a Widget named w, constructed from a Timer          │
  │                                                          │
  │  what the language says:                                 │
  │      ┌────────────────────────────────────────────┐      │
  │      │ a FUNCTION named w                         │      │
  │      │   returning:  Widget                       │      │
  │      │   taking:     a pointer to a function      │      │
  │      │               returning Timer              │      │
  │      └────────────────────────────────────────────┘      │
  │                                                          │
  │  the rule: if it CAN parse as a declaration, it IS one   │
  │                                                          │
  │  fixes:   Widget w{Timer{}};      ← braces               │
  │           Widget w((Timer()));    ← extra parens         │
  │                                                          │
  │  symptom: "no member named ..." on the NEXT line, or a   │
  │           destructor that mysteriously never runs        │
  └──────────────────────────────────────────────────────────┘

  BRACES AND initializer_list
  ┌──────────────────────────────────────────────────────────┐
  │  vector<int> a(10, 5);   ──►  [5,5,5,5,5,5,5,5,5,5]      │
  │  vector<int> b{10, 5};   ──►  [10, 5]                    │
  │                                                          │
  │  an initializer_list constructor is preferred over ALL   │
  │  others whenever the braced list can convert — this is   │
  │  a hard preference, not ordinary overload resolution     │
  │                                                          │
  │  but braces also FORBID NARROWING:                       │
  │      int x{3.14};   ✗ compile error                      │
  │      int y = 3.14;  ✓ silently truncates                 │
  └──────────────────────────────────────────────────────────┘

  STATIC INITIALISATION ORDER FIASCO
  ┌──────────────────────────────────────────────────────────┐
  │   a.cpp                        b.cpp                     │
  │   ┌──────────────────┐         ┌──────────────────┐      │
  │   │ Logger logger{   │         │ Config config{   │      │
  │   │   config.level() │  reads  │   load()         │      │
  │   │ };               │ ──────► │ };               │      │
  │   └──────────────────┘         └──────────────────┘      │
  │                                                          │
  │   order across translation units is UNSPECIFIED          │
  │        │                                                 │
  │        ├── link order decides it                         │
  │        └── a build-system change can break a working     │
  │            program, with no source change at all         │
  │                                                          │
  │   FIX — a function-local static                          │
  │        Config& config() {                                │
  │            static Config c{load()};                      │
  │            return c;                                     │
  │        }                                                 │
  │   initialised on FIRST USE, thread-safe since C++11      │
  │   (the "magic statics" guarantee)                        │
  │                                                          │
  │   the mirror problem: DESTRUCTION order at shutdown.     │
  │   for process-lifetime singletons, leak deliberately.    │
  └──────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Object Model Traps: Slicing, Virtual Destructors, and vector<bool>",
        content:
          "Slicing occurs when a derived object is copied into a base object by value, so only the base subobject is copied and everything derived is silently discarded along with the dynamic type, which is why polymorphic types are handled through references, pointers, or smart pointers and never by value. Deleting a derived object through a base pointer whose destructor is not virtual is undefined behaviour, and in practice it runs only the base destructor, leaking every derived member - which is why any class intended as a polymorphic base needs either a public virtual destructor or a protected non-virtual one. std::vector<bool> is the standard's acknowledged mistake, a bit-packed specialisation whose operator[] returns a proxy rather than a reference, so it is not a container, auto& b = v[0] does not compile as expected, and taking the address of an element is impossible.",
        codeExample: `struct Base    { int a = 1; virtual void f() { } };
struct Derived : Base { int b = 2; void f() override { } };

// SLICING
void take_by_value(Base b);       // ← the bug is in the SIGNATURE
Derived d;
take_by_value(d);                 // copies ONLY the Base subobject;
                                  // 'b' is gone, and the dynamic
                                  // type is now Base, so b.f()
                                  // calls Base::f
void take_by_ref(const Base& b);  // correct: no copy, polymorphism
                                  // preserved

std::vector<Base> vec;
vec.push_back(Derived{});         // SLICED on insertion
std::vector<std::unique_ptr<Base>> ok;
ok.push_back(std::make_unique<Derived>());   // correct

Base b2 = d;                      // slices
Base& r = d;                      // does not
// PREVENTING it: make the base abstract, or delete its copy
struct Base2 {
    virtual ~Base2() = default;
    Base2(const Base2&) = delete;              // cannot be sliced
    Base2& operator=(const Base2&) = delete;
protected:
    Base2() = default;
};
// C++23's deducing this also lets you write a virtual clone()
// without repeating it in every derived class.

// VIRTUAL DESTRUCTORS
struct NoVirt { ~NoVirt() { } };               // NOT virtual
struct Child : NoVirt { std::vector<int> big; };
NoVirt* p = new Child;
delete p;                    // UNDEFINED BEHAVIOUR. In practice:
                             // only ~NoVirt runs, so 'big' leaks
                             // and its heap buffer is never freed.
// The rule (Core Guideline C.35): a base class destructor is either
// PUBLIC AND VIRTUAL, or PROTECTED AND NON-VIRTUAL.
struct GoodBase  { virtual ~GoodBase() = default; };
struct Mixin     { protected: ~Mixin() = default; };  // cannot be
                                                      // deleted
                                                      // through a
                                                      // base pointer
// unique_ptr<Base> needs the virtual destructor.
// shared_ptr does NOT: it captures the deleter from the ORIGINAL
// type at construction, so this works even without virtual:
std::shared_ptr<NoVirt> sp = std::make_shared<Child>();  // correct
// - a genuine and surprising difference between the two.

// Declaring a destructor SUPPRESSES the implicit move operations, so
// adding 'virtual ~Base() = default' silently makes the class
// copy-only unless you also default the moves - the rule of five.
struct Correct {
    virtual ~Correct() = default;
    Correct(const Correct&) = default;
    Correct& operator=(const Correct&) = default;
    Correct(Correct&&) = default;
    Correct& operator=(Correct&&) = default;
protected:
    Correct() = default;
};

// std::vector<bool> - the standard's acknowledged mistake
std::vector<bool> vb{true, false, true};
// auto& r2 = vb[0];         // ERROR: operator[] returns a PROXY
auto r3 = vb[0];             // r3 is std::vector<bool>::reference,
                             // NOT bool - and it holds a pointer
                             // into vb, so it dangles if vb changes
bool actual = vb[0];         // this is what you wanted
// bool* p2 = &vb[0];        // ERROR: cannot take an address
// vb.data();                // does not exist
// It fails to satisfy the Container requirements, so generic
// algorithms and code written against 'vector<T>' break on T = bool.
// ALTERNATIVES: std::deque<bool>, std::vector<char>,
// std::bitset<N> for a fixed size, or boost::dynamic_bitset.

// OTHER OBJECT-MODEL TRAPS
// 1. Calling a virtual function from a constructor or destructor
struct B3 {
    B3() { init(); }                    // calls B3::init, NOT the
    virtual void init() { }             // derived override - the
};                                      // derived part does not
struct D3 : B3 { void init() override { use(member_); }
                 std::string member_; };
// During B3's constructor the dynamic type is still B3, which is a
// deliberate safety rule: D3::member_ has not been constructed yet.
// The fix is two-phase init or a factory function.

// 2. Self-assignment
Widget& operator=(const Widget& o) {
    delete data_;                       // BUG on self-assignment:
    data_ = new int[o.size_];           // o.data_ is already freed
    ...
}
// The copy-and-swap idiom is immune, and also gives the strong
// exception guarantee for free:
Widget& operator=(Widget o) { swap(*this, o); return *this; }

// 3. Move assignment must handle self-move
Widget& operator=(Widget&& o) noexcept {
    if (this == &o) return *this;       // std::swap on a container
    ...                                 // can produce a self-move
}

// 4. noexcept on move operations is not decoration
// vector::push_back uses move ONLY if the move constructor is
// noexcept; otherwise it COPIES, to preserve the strong guarantee.
// A missing noexcept silently makes reallocation O(n) copies.
static_assert(std::is_nothrow_move_constructible_v<Widget>);`
      },
      {
        title: "The Undefined Behaviour Catalogue",
        content:
          "Undefined behaviour means the standard imposes no requirements, and the practical consequence is that the optimiser is entitled to assume it never occurs and to transform code accordingly - which is why UB does not merely produce a wrong value but can delete a null check, remove a bounds test, or make a function fall through into an unrelated one. The catalogue worth memorising is short: signed integer overflow, out-of-bounds access, dereferencing null or a dangling pointer, use after free or after move, data races, reading an uninitialised value, strict aliasing violations, shifting by more than the width, and infinite loops without side effects. The reason to know them individually is that each has a specific detection tool and a specific safe alternative, and the reason to run sanitisers is that no amount of care substitutes for a tool that observes actual executions.",
        codeExample: `// SIGNED OVERFLOW is UB; UNSIGNED wraps, defined
int a = INT_MAX; a + 1;              // UB
unsigned u = UINT_MAX; u + 1;        // defined: wraps to 0
// The optimiser assumes signed overflow never happens:
bool f(int x) { return x + 1 > x; }  // compiled to 'return true'
// even though it is false when x == INT_MAX
// Detect with -fsanitize=signed-integer-overflow. Safe arithmetic:
// C++26's std::add_sat / mul_sat, or __builtin_add_overflow today.

// OUT OF BOUNDS
int arr[10];
arr[10] = 1;                         // UB, one past the end
std::vector<int> v(10);
v[10];                               // UB - operator[] is unchecked
v.at(10);                            // throws std::out_of_range
// &arr[10] is also UB; arr + 10 (a one-past-the-end POINTER) is
// legal to form but not to dereference.

// DANGLING / USE AFTER FREE
int* p = new int(5); delete p; *p;   // UB
std::string_view sv = std::string{"x"};   // UB on use: temporary

// USE AFTER MOVE is NOT UB - it is a valid but UNSPECIFIED state
std::string s = "hello";
std::string t = std::move(s);
s.size();          // legal, value unspecified (usually 0)
s = "new";         // legal: assignment is always fine
s[0];              // UB if s is empty - the operation's OWN
                   // preconditions still apply
// Standard containers are guaranteed valid-but-unspecified. Your own
// types should offer the same, and clang-tidy's
// bugprone-use-after-move flags reads of moved-from objects.

// UNINITIALISED READS
int x;             // indeterminate
if (x == 0) { }    // UB - and the optimiser may assume either branch
int y{};           // zero-initialised - always prefer this
// -Wmaybe-uninitialized catches some; MSan catches them at runtime.

// STRICT ALIASING
float f2 = 1.0f;
int i = *reinterpret_cast<int*>(&f2);   // UB: accessing an object
                                        // through an incompatible
                                        // type
std::memcpy(&i, &f2, sizeof i);         // CORRECT, and optimises to
                                        // the same instruction
std::bit_cast<int>(f2);                 // C++20, constexpr, correct
// char, unsigned char, and std::byte may alias anything, which is
// why they are the legitimate way to inspect object representations.
// -fno-strict-aliasing disables the optimisation; it is not a fix.

// SHIFT AND DIVISION
int n = 1; n << 32;                  // UB: shift >= bit width
n << -1;                             // UB: negative shift
INT_MIN / -1;                        // UB: the result is not
                                     // representable
n / 0;                               // UB

// DATA RACES: two threads, same location, at least one write, no
// synchronisation -> UB, however benign it looks. Detect with TSan.

// INFINITE LOOPS WITHOUT SIDE EFFECTS are UB (forward progress),
// which is why 'while (flag) {}' on a non-atomic flag can be
// optimised into 'if (flag) for(;;);' - or deleted entirely.
// Use std::atomic and, since C++20, atomic::wait.

// WHY UB IS SO DANGEROUS - a real transformation
int* q = get();
int val = *q;               // the compiler now ASSUMES q != nullptr,
if (q == nullptr) return;   // because dereferencing null is UB...
use(val);                   // ...so it DELETES the null check.
// A famous Linux kernel CVE (2009) had exactly this shape.

// THE TOOLS - use them, do not rely on discipline
//   -Wall -Wextra -Wpedantic -Wconversion -Wshadow
//   -fsanitize=address,undefined     (~2-3x, catches most memory UB)
//   -fsanitize=thread                (~5-15x, catches data races)
//   -fsanitize=memory                (uninitialised reads; clang)
//   -D_GLIBCXX_ASSERTIONS / libc++ hardening  (bounds checks, cheap)
//   valgrind, clang-tidy, cppcheck, and static analysers in CI
// ASan and UBSan together catch the large majority of the catalogue
// above and are cheap enough to run on the whole test suite.

// SMALLER TRAPS WORTH KNOWING
// 1. Deleting an array with the wrong form
int* arr2 = new int[10]; delete arr2;      // UB - needs delete[]
// 2. Mismatched allocation: malloc/delete, new/free - UB
// 3. Returning a reference to a local
const std::string& bad() { std::string s; return s; }   // dangling
// 4. Modifying a container while iterating it
for (auto it = v.begin(); it != v.end(); ++it)
    if (*it == 0) v.erase(it);      // 'it' is invalidated; use
                                    // it = v.erase(it), or
                                    // std::erase(v, 0) in C++20
// 5. Assuming evaluation order: f(i++, i++) is unsequenced (UB
//    before C++17, unspecified order after)
// 6. Comparing unrelated pointers with < is unspecified
// 7. Placement new over an object without destroying it first leaks
// 8. reinterpret_cast between unrelated types then dereferencing`,
        diagram: asciiDiagram(`Undefined behaviour: why the symptom is nowhere near the cause

  WHAT THE STANDARD SAYS
  ┌──────────────────────────────────────────────────────────┐
  │  undefined behaviour: "no requirements are imposed"      │
  │                                                          │
  │  which the optimiser reads as:                           │
  │      "this can never happen, so I may assume it does     │
  │       not, and transform the surrounding code on that    │
  │       assumption"                                        │
  └──────────────────────────────────────────────────────────┘

  A REAL TRANSFORMATION — the deleted null check
  ┌──────────────────────────────────────────────────────────┐
  │   int* q = get();                                        │
  │   int val = *q;             ← dereference implies q != 0 │
  │   if (q == nullptr) return; ← therefore ALWAYS FALSE     │
  │   use(val);                 ← therefore DELETED          │
  │                                                          │
  │   the guard you wrote is gone from the binary.           │
  │   this exact shape was a Linux kernel CVE in 2009.       │
  └──────────────────────────────────────────────────────────┘

  THE CATALOGUE, AND THE TOOL THAT FINDS EACH
  ┌───────────────────────────────┬──────────────────────────┐
  │ signed integer overflow       │ UBSan                    │
  │ out-of-bounds access          │ ASan, _GLIBCXX_ASSERTIONS│
  │ null / dangling dereference   │ ASan                     │
  │ use after free                │ ASan                     │
  │ reading uninitialised memory  │ MSan, -Wuninitialized    │
  │ data race                     │ TSan                     │
  │ strict-aliasing violation     │ -Wstrict-aliasing (weak) │
  │ shift >= width, INT_MIN / -1  │ UBSan                    │
  │ infinite loop, no side effect │ nothing — know the rule  │
  └───────────────────────────────┴──────────────────────────┘

  NOT UB, THOUGH OFTEN CALLED SO
  ┌──────────────────────────────────────────────────────────┐
  │  use after MOVE                                          │
  │      a moved-from standard object is VALID but its       │
  │      value is UNSPECIFIED                                │
  │                                                          │
  │      s.size()   ✓ legal, value unspecified               │
  │      s = "new"  ✓ legal, assignment always works         │
  │      s[0]       ✗ UB only because operator[] has its     │
  │                   OWN precondition that s be non-empty   │
  └──────────────────────────────────────────────────────────┘

  THE SANITISER BUDGET
  ┌──────────────────────────────────────────────────────────┐
  │   ASan   2-3x slower, 2x memory   memory errors          │
  │   UBSan  ~1.2x                    the UB catalogue       │
  │   TSan   5-15x, 5-10x memory      data races             │
  │   MSan   ~3x                      uninitialised reads    │
  │                                                          │
  │   ASan + UBSan together are cheap enough for the whole   │
  │   test suite and catch most of the list above.           │
  │   TSan needs its own CI job.                             │
  │   ASan and TSan CANNOT be combined.                      │
  └──────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Answering These Questions Well",
        content:
          "Interviewers ask about these traps not to test recall but to see whether you reason about the language mechanically rather than by analogy, so the strongest answers name the mechanism, name the standard version where it changed, and name the tool that would have caught it. A weak answer to why a virtual destructor is needed says objects leak; a strong one says deleting through a base pointer without a virtual destructor is undefined behaviour, that in practice only the base destructor runs, that the Core Guideline is public-and-virtual or protected-and-non-virtual, and that shared_ptr is exempt because it type-erases the deleter at construction. The same shape works everywhere: mechanism, consequence, standard version, detection, and the safe alternative.",
        codeExample: `// THE ANSWER TEMPLATE THAT WORKS FOR EVERY TRAP
//   1. MECHANISM   - what the language actually does, precisely
//   2. CONSEQUENCE - the observable symptom, and why it is
//                    intermittent or optimisation-dependent
//   3. STANDARD    - which version introduced or changed it
//   4. DETECTION   - the warning, sanitiser, or guideline
//   5. ALTERNATIVE - what to write instead

// Worked example: "why is a virtual destructor needed?"
//   1. Deleting through a base pointer calls the static type's
//      destructor; if it is not virtual the call is not dispatched.
//   2. The standard says this is UB. In practice only ~Base runs,
//      so derived members are never destroyed and their resources
//      leak - silently, with no diagnostic.
//   3. Unchanged since C++98. C++11 added 'override' and 'final',
//      which help with related mistakes.
//   4. -Wnon-virtual-dtor and -Wdelete-non-virtual-dtor; ASan and
//      valgrind observe the leak; clang-tidy has a check.
//   5. Core Guideline C.35: a base destructor is either PUBLIC AND
//      VIRTUAL, or PROTECTED AND NON-VIRTUAL. Note shared_ptr is
//      exempt because it captures the deleter from the type passed
//      at construction, while unique_ptr does not.

// Worked example: "what happens if I forget noexcept on a move?"
//   1. vector's reallocation uses move_if_noexcept, which selects
//      the copy constructor when the move may throw.
//   2. Growth silently becomes O(n) COPIES instead of moves - a
//      large, invisible performance regression.
//   3. C++11 introduced the mechanism to preserve the strong
//      exception guarantee during reallocation.
//   4. static_assert(std::is_nothrow_move_constructible_v<T>);
//      and clang-tidy performance checks.
//   5. Mark move operations noexcept; they should not allocate, so
//      they should not throw.

// The most commonly asked, in rough order
//   "const vs constexpr"             mutation vs timing
//   "unique_ptr vs shared_ptr"       ownership model + control block
//   "when is a virtual dtor needed"  above
//   "what is the rule of five"       + rule of zero as the real
//                                    answer
//   "lvalue vs rvalue"               value categories, not types
//   "what does std::move do"         an unconditional cast, nothing
//                                    is moved
//   "iterator invalidation"          per-container table
//   "what is UB and why care"        the optimiser assumes it away
//   "vector vs list in practice"     cache behaviour beats the
//                                    asymptotic argument
//   "how do you debug a data race"   TSan, then reason about the
//                                    memory model

// WHAT DISTINGUISHES A STRONG ANSWER
//   - naming the standard version, because it shows you have
//     tracked the language rather than learned it once
//   - naming the tool, because it shows you have debugged this
//     rather than only read about it
//   - saying "it depends, and here is the measurement I would
//     take", especially for performance questions
//   - admitting the boundary of what you know precisely, rather
//     than guessing - interviewers probe exactly there

// A FINAL, GENUINELY USEFUL POINT
// Most of this module describes hazards that modern C++ has already
// removed from everyday code. Owning raw pointers, manual
// new/delete, hand-written copy constructors, and unchecked buffer
// arithmetic are all avoidable in new code:
//     unique_ptr and shared_ptr for ownership
//     the rule of ZERO for most classes
//     span and string_view for buffers, at parameters only
//     range-for and the algorithms instead of index arithmetic
//     ASan, UBSan, and TSan in continuous integration
// The traps remain worth knowing because you will read old code,
// because interviewers ask, and because understanding why the
// language behaves this way is what lets you predict its behaviour
// in situations no list covers.`
      }
    ],
    examples: [
      {
        title: "A vector that copies instead of moving during growth",
        input: "A class with a hand-written move constructor that is not marked noexcept, stored in a std::vector that grows past its capacity.",
        output: "Reallocation copies every element rather than moving them, turning an O(n) move into O(n) deep copies with allocations.",
        explanation:
          "Step 1: When a vector reallocates it must transfer existing elements into the new buffer, and it uses std::move_if_noexcept to decide how.\nStep 2: That helper returns an rvalue reference only when the element's move constructor is noexcept or when the type is not copy constructible, otherwise it returns a const lvalue reference so the copy constructor is selected.\nStep 3: The reason is the strong exception guarantee: if a move throws partway through, the elements already moved out of the old buffer are in an unspecified state and cannot be restored, whereas copying leaves the original buffer intact so the vector can be left unchanged.\nStep 4: The symptom is purely a performance regression with no compiler diagnostic, which makes it easy to miss - a container of strings or vectors that should be cheap to grow becomes quadratic in allocation work.\nStep 5: The fix is one word, marking the move constructor and move assignment noexcept, which is nearly always honest because a correct move transfers pointers rather than allocating; a static_assert on is_nothrow_move_constructible_v makes the requirement explicit and prevents regression."
      },
      {
        title: "A null check deleted by the optimiser",
        input: "A function dereferences a pointer, then checks it against nullptr, then uses the result.",
        output: "The release build omits the null check entirely, so a null pointer produces a crash or silent corruption inside use().",
        explanation:
          "Step 1: Dereferencing a null pointer is undefined behaviour, so the compiler is entitled to assume that any pointer which has been dereferenced is non-null from that point in the analysis.\nStep 2: Given that assumption, the subsequent comparison against nullptr is provably false, so the optimiser folds it to false and removes the branch as dead code, along with the early return it guarded.\nStep 3: This is not a compiler bug but the defining property of undefined behaviour - the standard imposes no requirements, and optimisers exploit that to remove checks the programmer believed were protective.\nStep 4: The fix is ordering: check the pointer before dereferencing it, since the assumption only arises from the dereference; and the general discipline is to treat any UB as a correctness bug rather than as something that happens to work today.\nStep 5: A vulnerability of exactly this shape appeared in the Linux kernel in 2009, where a dereference preceding a null check caused GCC to remove the check and turned a benign-looking function into an exploitable privilege escalation - which is why UBSan in continuous integration is worth its twenty percent overhead."
      },
      {
        title: "A moved-from object read after the move",
        input: "std::string s = \"hello\"; auto t = std::move(s); then reading s.size() and s[0].",
        output: "s.size() is legal and typically returns 0; s[0] is undefined behaviour, but for a different reason than most people assume.",
        explanation:
          "Step 1: Moving from a standard library object leaves it in a valid but unspecified state, which is a defined state rather than undefined behaviour - the object still satisfies its class invariants and its destructor will run correctly.\nStep 2: Any operation with no preconditions is therefore legal on a moved-from object, which includes size, empty, clear, and assignment, so reading s.size() is well-defined even though the standard does not say what it returns.\nStep 3: Operations that do have preconditions still require them to hold, and std::string's operator[] requires the index to be less than size, so s[0] on a string whose size is now zero is undefined behaviour by that precondition rather than by anything about moving.\nStep 4: In practice implementations leave a moved-from string empty because the small-buffer optimisation makes that the cheapest correct outcome, but relying on that is relying on an implementation detail, and moved-from objects of other types may hold arbitrary values.\nStep 5: The correct discipline is to treat a moved-from object as one you may only assign to or destroy, and clang-tidy's bugprone-use-after-move check enforces exactly that, while your own move operations should leave the source in a specific documented state rather than an arbitrary one."
      }
    ],
    tips: [
      "Prefer braces for initialisation to get the narrowing check and dodge the most vexing parse, but use parentheses for the container count-and-value constructors that an initializer_list would hijack.",
      "Replace every namespace-scope object with dependencies by a function-local static, which is initialised on first use and thread-safe since C++11.",
      "Run ASan and UBSan over the whole test suite in CI - together they cost roughly two to three times runtime and catch most of the undefined behaviour catalogue."
    ],
    tricks: [
      "Mark move operations noexcept or vector growth silently copies instead of moving, a performance bug with no diagnostic.",
      "Use std::bit_cast in C++20, or memcpy before it, rather than a reinterpret_cast that violates strict aliasing - both compile to the same instruction.",
      "A base class destructor should be public and virtual, or protected and non-virtual; shared_ptr is exempt because it type-erases the deleter at construction while unique_ptr does not."
    ],
    memoryAids: [
      "If it can be parsed as a declaration, it is a declaration - that single rule is the most vexing parse.",
      "Undefined behaviour is not a wrong answer, it is permission for the optimiser to delete your check.",
      "Use after move is valid but unspecified; only operations with preconditions become undefined."
    ],
    interviewPatterns: [
      "'What is undefined behaviour and why does it matter?' rewards the optimiser-assumption framing plus a concrete deleted-check example.",
      "'When do you need a virtual destructor?' expects the UB statement, the Core Guideline, and the shared_ptr exception, not just 'to avoid leaks'.",
      "Frequency and companies: these appear in virtually every C++ interview, and the follow-up depth is highest at systems, trading, and browser or engine teams."
    ],
    practiceProblems: [
      "Why does std::vector<bool> break generic code, and what should you use instead? Answer: it is a specialisation that packs elements to one bit each, so operator[] cannot return bool& and instead returns a proxy object holding a pointer and a bit index; consequently auto& r = v[0] does not compile as expected, &v[0] is not a bool*, data() does not exist, and the type fails the Container requirements - so any template written against vector<T> that takes a T& or a T* silently breaks for T = bool; the alternatives are std::vector<char> or std::deque<bool> when you need a real container, std::bitset<N> for a compile-time fixed size, or boost::dynamic_bitset when you genuinely want the packing and its bit operations.",
      "Explain precisely why the static initialisation order fiasco cannot be fixed by reordering your source. Answer: the order of dynamic initialisation of namespace-scope objects within a single translation unit is defined to be the order of definition, but the order across translation units is unspecified and is chosen by the linker, so no arrangement of source within one file affects it and a change to the build system's link order can break a program that has always worked; the standard fix is a function-local static, whose initialisation is guaranteed to happen on first use with a compiler-emitted thread-safe guard since C++11, making the dependency ordering explicit through the call graph - and C++20's constinit offers an alternative for objects that can be constant-initialised, since constant initialisation precedes all dynamic initialisation everywhere.",
      "A code review shows a class with a virtual destructor and no other special members. What is likely wrong? Answer: declaring any destructor suppresses the implicit generation of the move constructor and move assignment operator, so the class is copyable but not movable, and every operation that would have moved it now copies - which is a silent performance regression that is especially damaging for a class holding containers; the fix is the rule of five, defaulting all five special members explicitly, and the deeper observation is that a class needing a virtual destructor is a polymorphic base, which usually should not be copyable at all, so deleting the copy operations and making the constructor protected both prevents slicing and states the design intent."
    ],
    faq: [
      {
        question: "What is the most vexing parse and how do I avoid it?",
        answer:
          "It is the consequence of a single disambiguation rule: if a construct can be parsed as a declaration, it is parsed as a declaration. So Timer t() declares a function taking nothing and returning Timer rather than defining an object, and Widget w(Timer()) declares a function named w returning Widget and taking a pointer to a function returning Timer - the argument's parentheses being read as a parameter that has itself been adjusted from function type to pointer type, which is the same adjustment that makes int f(int a[]) a pointer parameter. The name comes from Scott Meyers in Effective STL, and the reason it is vexing is that the diagnostic never mentions parsing: you get an error on the next line saying the object has no such member, or more insidiously the code compiles and a destructor you were relying on never runs, because no object was ever created. The reliable fix is brace initialisation, Widget w{Timer{}}, because a braced-init-list cannot appear as a parameter declaration so the ambiguity does not arise - this is one of the strongest arguments for preferring braces generally. An older fix is an extra pair of parentheses, Widget w((Timer())), which forces the inner construct to be an expression, and a third is to name the intermediate object on its own line, which is often the clearest. The one place braces are the wrong default is when an initializer_list constructor exists and you want a different one: vector<int> v{10, 5} is a two-element vector while vector<int> v(10, 5) is ten copies of five, because an initializer_list constructor is preferred over all others whenever the braced list can convert. So the practical rule is braces by default, parentheses when you specifically mean a count-and-value or similar constructor."
      },
      {
        question: "What is the static initialisation order fiasco and what is the correct fix?",
        answer:
          "Namespace-scope objects are initialised in two phases. Static initialisation - zero initialisation and constant initialisation - happens first and is fully ordered across the whole program, and dynamic initialisation, which is anything requiring a constructor call or a non-constant expression, happens afterwards. Within one translation unit dynamic initialisation happens in order of definition, but the order across translation units is unspecified, and in practice the linker decides it. So a global Logger in one file whose constructor reads a global Config in another may run before that Config has been constructed, reading a zero-initialised object - and because it is unspecified rather than wrong, the program may work for years and then break when a build system change alters link order, with no source change at all. The correct and portable fix is the function-local static, sometimes called the construct-on-first-use idiom: replace the global with a function returning a reference to a static local, so initialisation happens the first time the function is called, which by construction is after everything it depends on. Since C++11 the compiler must emit a thread-safe guard around that initialisation, so concurrent first calls block rather than race - the so-called magic statics guarantee - and the ongoing cost is one atomic load per call, which is negligible. C++20 adds a complementary tool, constinit, which forces constant initialisation and so guarantees the object is ready before any dynamic initialisation runs anywhere, without making it const the way constexpr would. There is also a mirror problem at shutdown, since function-local statics are destroyed in reverse order of construction and a logger destroyed before its last user causes a use-after-free during exit; for genuinely process-lifetime singletons the pragmatic answer is to allocate with new and never delete, deliberately leaking so the object outlives every user."
      },
      {
        question: "What is object slicing and how do I prevent it?",
        answer:
          "Slicing is what happens when a derived object is copied into a base object by value: the base's copy constructor copies only the base subobject, so all derived members are discarded and the resulting object's dynamic type is the base, meaning virtual calls dispatch to base implementations. It is silent - no warning, no error - and the resulting object is perfectly valid, which is what makes it dangerous, because the program continues with an object that has quietly lost half its state and all of its behaviour. The classic sites are a function parameter declared as a base by value, a std::vector of base objects into which derived objects are pushed, and an assignment such as Base b = derived. Prevention has three levels. The first is discipline: handle polymorphic types only through references, pointers, or smart pointers, and store std::vector<std::unique_ptr<Base>> rather than std::vector<Base>, which is the standard practice and covers most cases. The second is to make slicing impossible in the type system by deleting the base's copy constructor and copy assignment operator while making its constructor protected, so a base object cannot be created or copied independently at all - which is almost always the right design for a polymorphic base anyway, since a polymorphic base being copyable is rarely meaningful. A pure virtual function has a similar effect by making the base abstract, though it does not prevent slicing through a base subobject in multi-level hierarchies. The third is tooling: clang-tidy and several static analysers detect the common shapes, and -Wextra catches a subset. The related design principle worth stating is that value semantics and polymorphism do not compose in C++, which is why the standard advice is to choose one - value types with variant for a closed set of alternatives, or reference semantics with virtual dispatch for an open one - rather than trying to have both."
      },
      {
        question: "Why is undefined behaviour so much worse than an unspecified result?",
        answer:
          "Because it is not about the result of one operation but about what the compiler is entitled to assume of the whole surrounding program. Unspecified behaviour means the implementation must choose from a set of valid options and need not document the choice, so the order of evaluation of function arguments is unspecified and the program still behaves sanely whichever order is picked. Implementation-defined behaviour is the same but must be documented, such as the size of int. Undefined behaviour is categorically different: the standard imposes no requirements at all, which optimisers interpret as a licence to assume the construct never occurs and to transform code on that basis. The practical consequences are counter-intuitive. A function that dereferences a pointer and then checks it against null will have the check deleted, because the dereference already implied non-null - a shape that produced a genuine Linux kernel privilege escalation in 2009. A loop written as while (x < x + 1) becomes an infinite loop because signed overflow is assumed not to happen. An infinite loop with no side effects may be deleted entirely under the forward-progress guarantee, sometimes causing control to fall through into an unrelated function. Because these transformations happen during optimisation, the symptom typically appears only in release builds, far from the offending line, and often only after an unrelated change alters inlining decisions - which is why UB bugs have a reputation for being impossible to reproduce. The right mental model is that undefined behaviour is a contract violation rather than an error: you have promised the compiler something, and having broken the promise you can no longer reason about any part of the program. The corollary is that you cannot test your way out of it, since the code may behave correctly today and differently after a compiler upgrade - which is exactly why the sanitisers matter, because they observe the violation at the moment it occurs rather than waiting for its consequences."
      },
      {
        question: "Which sanitisers and warnings should a serious C++ project actually enable?",
        answer:
          "Start with warnings, because they are free. Enable -Wall -Wextra -Wpedantic as a baseline, then add the ones that catch real bugs rather than style: -Wconversion and -Wsign-conversion for the integer traps, -Wshadow, -Wnon-virtual-dtor, -Wold-style-cast, -Wcast-align, and -Wnull-dereference. Treating warnings as errors in CI is the only way they stay at zero, since a project with two hundred warnings has zero effective warnings. Then the sanitisers, which observe actual executions and therefore catch what static analysis cannot. AddressSanitizer detects heap and stack buffer overflows, use after free, use after return, and leaks, at roughly two to three times runtime and double the memory, and it is the highest-value single tool in C++. UndefinedBehaviorSanitizer catches signed overflow, invalid shifts, misaligned access, null dereference, and bad enum and bool values at about twenty percent overhead, and it composes with ASan so the two run together in one job. ThreadSanitizer detects data races with sound happens-before reasoning at five to fifteen times runtime and considerably more memory, and it cannot be combined with ASan, so it needs a separate CI job - but it is the only practical way to find races, which are otherwise found by customers. MemorySanitizer catches uninitialised reads but requires the whole program including the standard library to be instrumented, which makes it the hardest to adopt. Beyond those, enable the standard library's hardened mode - _GLIBCXX_ASSERTIONS for libstdc++ or the libc++ hardening modes - which adds bounds checks to operator[] and iterator operations for a small cost that is often acceptable even in production. Add clang-tidy with the bugprone, cert, and modernize checks in CI. The realistic policy for most teams is warnings-as-errors on every build, ASan plus UBSan on the full test suite in CI, TSan on a nightly job, and hardened standard library assertions enabled in release builds unless profiling shows they matter."
      },
      {
        question: "How should I answer these trap questions in an interview?",
        answer:
          "Answer with the mechanism rather than the symptom, because the interviewer is testing whether you reason about the language as a specified system or by pattern-matching on things you have been told. A useful five-part shape covers almost every one of these questions: state what the language actually does, state the observable consequence and why it is intermittent or optimisation-dependent, name the standard version where the behaviour was introduced or changed, name the warning or sanitiser that detects it, and give the safe alternative. Applied to virtual destructors that becomes: deleting through a base pointer calls the static type's destructor, so without virtual the call is not dispatched; the standard says this is undefined behaviour and in practice only the base destructor runs so derived members leak silently; the rule has been unchanged since C++98 though C++11 added override and final for related mistakes; -Wnon-virtual-dtor and ASan detect it; and the Core Guideline is that a base destructor is either public and virtual or protected and non-virtual, with the note that shared_ptr is exempt because it captures the deleter from the type supplied at construction while unique_ptr does not. That last observation is the kind of detail that distinguishes someone who has used the language from someone who has read about it. Two further habits help. For performance questions, resist giving a number and instead say what you would measure and why - a list has better asymptotic insertion than a vector but loses badly in practice below a few thousand elements because of cache behaviour, and the honest answer names the crossover as something to measure. And be explicit about the boundary of what you know precisely rather than guessing, because interviewers probe exactly at that boundary and an admission followed by sound reasoning reads far better than confident invention. Finally, it is worth noting when a trap has been designed out of modern code - most of this catalogue is avoidable with smart pointers, the rule of zero, span, range-for, and sanitisers in CI - since showing you know both the hazard and its obsolescence is the strongest possible answer."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Scott Meyers - Effective C++ and Effective Modern C++",
        insight: "The original catalogue of these traps, with the most vexing parse and the object-model hazards explained item by item."
      },
      {
        source: "note",
        attribution: "C++ Core Guidelines - C.35, C.67, ES.65, and the interfaces section",
        insight: "Rule-by-rule statements of the virtual destructor, slicing, and dangling rules, with the enforcement each tool provides."
      },
      {
        source: "blog",
        attribution: "LLVM Project - What Every C Programmer Should Know About Undefined Behavior",
        insight: "The three-part series explaining how optimisers exploit UB, with the deleted-null-check transformation worked through."
      }
    ]
  }
];
