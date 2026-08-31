import { Topic } from "../syllabus";

function asciiDiagram(art: string): string {
  return `<pre style="margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#a5f3fc;white-space:pre;text-align:left;overflow-x:auto;">${art}</pre>`;
}

export const cppMoveTopics: Topic[] = [
  {
    id: "topic-cpp-move-value-categories",
    moduleId: "mod-cpp-move-semantics-and-value-categories",
    title: "Value Categories: lvalue, prvalue, xvalue",
    intuition:
      "Every expression in C++ has a type and a value category, and the category decides which overloads it can bind to, whether it can be moved from, and whether it names an object at all. C++11 replaced the old lvalue/rvalue split with a three-way system built on two questions: does the expression have identity, and can it be moved from. Getting these right is what makes std::move, perfect forwarding, and copy elision comprehensible instead of magical - every confusing move-semantics question reduces to a value-category question.",
    complexity: {
      time:
        "Value categories are a compile-time property with no run-time representation, so classifying an expression costs nothing at execution. Their practical effect on time is enormous but indirect: binding to a move overload instead of a copy overload turns an O(n) deep copy of a container into an O(1) pointer steal.",
      space:
        "No storage is associated with a value category. The space consequence is again indirect: a prvalue materialised into a copy allocates a second buffer, while the same prvalue bound to an rvalue reference or elided reuses the original storage, which is the difference between one and two allocations per return."
    },
    lesson: [
      {
        title: "The Two Questions: Identity and Movability",
        content:
          "C++11 defines value categories with two independent properties. Identity means the expression names a specific object whose address you can meaningfully take. Movability means the expression's resources may be pilfered because the object is about to expire or is not otherwise reachable. An lvalue has identity and is not movable; a prvalue, or pure rvalue, has no identity and is movable; an xvalue, or expiring value, has both identity and movability. Two umbrella terms then cover the pairs: glvalue means anything with identity, so lvalues and xvalues, and rvalue means anything movable, so prvalues and xvalues. The whole taxonomy exists so overload resolution can distinguish 'this object will still be used' from 'this object is finished, take its guts'.",
        diagram: asciiDiagram(`The C++11 value category lattice

                          expression
                              │
                ┌─────────────┴─────────────┐
                ▼                           ▼
             glvalue                     rvalue
          (has identity)              (is movable)
                │                           │
        ┌───────┴────────┐         ┌────────┴────────┐
        ▼                ▼         ▼                 ▼
     lvalue            xvalue                     prvalue
  ┌──────────────┐  ┌──────────────────┐   ┌──────────────────┐
  │ identity: ✓  │  │ identity: ✓      │   │ identity: ✗      │
  │ movable : ✗  │  │ movable : ✓      │   │ movable : ✓      │
  ├──────────────┤  ├──────────────────┤   ├──────────────────┤
  │ named vars   │  │ std::move(x)     │   │ 42, x + 1        │
  │ *p           │  │ static_cast<T&&> │   │ f() by value     │
  │ arr[i]       │  │ a.member on an   │   │ T{}, lambda expr │
  │ f() → T&     │  │   xvalue         │   │ &x, "str" is NOT │
  │ string lit   │  │ f() → T&&        │   │   (it is lvalue) │
  └──────────────┘  └──────────────────┘   └──────────────────┘

  Binding rules
  ─────────────
        expression      T&      const T&      T&&
        lvalue          ✓         ✓           ✗
        xvalue          ✗         ✓           ✓
        prvalue         ✗         ✓           ✓

  The one row people forget: const T& binds to EVERYTHING,
  which is why a missing move overload silently becomes a copy.`)
      },
      {
        title: "Naming an Rvalue Reference Produces an Lvalue",
        content:
          "The most consequential rule in the whole system is that the category of an expression is independent of the type of the entity it names. A parameter declared T&& is an rvalue reference, but the expression consisting of its name is an lvalue, because it has identity - it is a named object with an address, and it will still exist on the next line. This is not a quirk; it is a safety property. If naming an rvalue reference produced an rvalue, then using the parameter twice would move from it twice, silently destroying data. The direct consequence is that a move constructor must write std::move on its own parameter to pass movability along, and forgetting that is the single most common move-semantics bug because it compiles and produces correct but slow code.",
        codeExample: `void consume(Widget&& w);        // takes an rvalue
void observe(const Widget& w);

void relay(Widget&& w) {         // w is an rvalue REFERENCE
    // observe(w);               // fine
    // consume(w);               // ERROR: 'w' the expression is an LVALUE
    consume(std::move(w));       // correct: cast back to an xvalue
}

// The classic silent bug:
class Wrapper {
    std::vector<int> data_;
public:
    Wrapper(Wrapper&& o)                     // move constructor ...
        : data_{o.data_} {}                  // ... that COPIES. 'o.data_'
                                             // is an lvalue.
    // Correct:
    // Wrapper(Wrapper&& o) noexcept : data_{std::move(o.data_)} {}
};

// Why the rule must exist:
void twice(Widget&& w) {
    Widget a{std::move(w)};      // w is now moved-from
    Widget b{std::move(w)};      // legal but b is built from a husk -
}                                // if naming w were implicitly an rvalue,
                                 // this would happen by accident everywhere`
      },
      {
        title: "Where Each Category Comes From",
        content:
          "Knowing the sources of each category removes most of the guesswork. Lvalues: the name of any variable or function, a dereference *p, an array subscript, a string literal, and a function call returning an lvalue reference - which is why v[0] = 5 and s = t work. Prvalues: literals other than string literals, arithmetic and comparison results, the address-of operator, a lambda expression, a call returning by value, and a temporary written as T{}. Xvalues: the result of std::move or any cast to rvalue reference, a call returning T&&, a member access or subscript on an xvalue, and since C++17 the result of materialising a prvalue when a glvalue is needed. Two entries surprise people every time: a string literal is an lvalue, because it names a real array object with static storage, and a function returning T&& yields an xvalue rather than a prvalue.",
        codeExample: `int   i = 0;
int*  p = &i;
int   arr[4]{};
std::string s = "hi";

// lvalues
i;              // named variable
*p;             // dereference
arr[2];         // subscript on an lvalue array
"literal";      // string literal: a const char[8] object with an address
s = "x";        // operator= returns std::string&, so an lvalue

// prvalues
42;             // literal
i + 1;          // arithmetic result
&i;             // address-of yields a value, not an object
[]{ return 1; };            // lambda expression
std::string{"tmp"};         // temporary
std::to_string(7);          // call returning by value

// xvalues
std::move(s);               // cast to std::string&&
static_cast<std::string&&>(s);
std::move(s).size();        // member call on an xvalue

// Proof that decltype distinguishes them:
static_assert(std::is_same_v<decltype(i),    int>);    // entity's type
static_assert(std::is_same_v<decltype((i)),  int&>);   // lvalue expression
static_assert(std::is_same_v<decltype(i+1),  int>);    // prvalue
static_assert(std::is_same_v<decltype(std::move(i)), int&&>);  // xvalue`
      },
      {
        title: "Overload Resolution and the const& Trap",
        content:
          "Given overloads taking T&, const T&, and T&&, an lvalue prefers T& then const T&, and an rvalue prefers T&& then const T&. The critical asymmetry is that const T& binds to every category, so it acts as a catch-all: if a class provides a copy constructor but no move constructor, every rvalue silently binds to the copy, and the program is correct but performs deep copies where it appears to move. Nothing warns about this, which is why classes that declare a destructor - thereby suppressing move generation - can quietly lose all their move performance. The other trap is const std::move: moving from a const object produces a const xvalue, which cannot bind to T&& and therefore falls through to the copy constructor, so a const member or a const return type disables moves entirely.",
        codeExample: `void f(Widget&);        // 1
void f(const Widget&);  // 2
void f(Widget&&);       // 3

Widget       w;
const Widget cw;

f(w);                   // 1 - lvalue prefers the non-const lvalue ref
f(cw);                  // 2 - only const& accepts a const lvalue
f(Widget{});            // 3 - prvalue prefers the rvalue overload
f(std::move(w));        // 3 - xvalue
f(std::move(cw));       // 2 !! const xvalue cannot bind to Widget&&

// The silent-copy trap: no move overload at all
struct Legacy {
    std::vector<int> v;
    ~Legacy() {}                       // suppresses move generation
    Legacy(const Legacy&) = default;   // still present
};
Legacy a, b;
b = std::move(a);       // binds to copy assignment: deep copy, no warning

// The const-return trap:
const Widget make();               // do NOT do this
Widget x = make();                 // const prvalue -> copy, never move

// Diagnose with a static_assert:
static_assert(std::is_move_constructible_v<Legacy>);          // passes!
static_assert(std::is_nothrow_move_constructible_v<Legacy>);  // fails - the real test`
      },
      {
        title: "decltype, Materialisation, and C++17",
        content:
          "Two refinements complete the picture. decltype applied to a bare name gives the declared type of the entity, but applied to any other expression it encodes the value category: T for a prvalue, T& for an lvalue, and T&& for an xvalue. That is why decltype(x) and decltype((x)) differ, and it is the mechanism behind decltype(auto), which preserves both type and category when forwarding a return value. Second, C++17 redefined prvalues as recipes for initialisation rather than as temporary objects: a prvalue no longer denotes an object until it is materialised, which happens only when a glvalue is required. That single change made guaranteed copy elision possible and made non-movable types returnable by value, and it is why the modern definition of prvalue is 'an initialiser' rather than 'a temporary'.",
        codeExample: `int x = 0;
decltype(x)    a = x;      // int    - declared type of the entity
decltype((x))  b = x;      // int&   - (x) is an lvalue expression
decltype(x+0)  c = 0;      // int    - prvalue
decltype(std::move(x)) d = 0;   // int&& - xvalue

// decltype(auto) preserves category when forwarding a return:
template <class C, class I>
decltype(auto) at(C&& c, I i) {
    return std::forward<C>(c)[i];   // returns T& for lvalue containers,
}                                   // T&& for rvalue ones - auto would copy

// C++17: a prvalue is an initialiser, not an object.
struct Immovable {
    Immovable() = default;
    Immovable(Immovable&&) = delete;
};
Immovable make() { return Immovable{}; }   // legal since C++17
Immovable obj = make();                    // no move, no copy - the object
                                           // is constructed directly in 'obj'

// Materialisation happens when a glvalue is needed:
const Immovable& r = make();   // the prvalue is materialised into a temporary
                               // whose lifetime is extended to r's scope`,
        diagram: asciiDiagram(`decltype and the C++17 prvalue model

  decltype on a NAME vs on an EXPRESSION
  ┌──────────────────────┬──────────────┬───────────────────────────┐
  │ written              │ result       │ why                       │
  ├──────────────────────┼──────────────┼───────────────────────────┤
  │ decltype(x)          │ int          │ declared type of ENTITY x │
  │ decltype((x))        │ int&         │ (x) is an lvalue EXPR     │
  │ decltype(x + 0)      │ int          │ prvalue → T               │
  │ decltype(std::move(x))│ int&&       │ xvalue  → T&&             │
  │ decltype(f())  f→T   │ int          │ prvalue → T               │
  │ decltype(g())  g→T&  │ int&         │ lvalue  → T&              │
  │ decltype(h())  h→T&& │ int&&        │ xvalue  → T&&             │
  └──────────────────────┴──────────────┴───────────────────────────┘
  The pattern: T for prvalue, T& for lvalue, T&& for xvalue.
  That is exactly why decltype(auto) can forward a category.

  C++14 vs C++17: what a prvalue IS
  ┌─────────────────────────────────────────────────────────────┐
  │ C++14   "return Widget{};"                                  │
  │           │                                                 │
  │           ▼                                                 │
  │     ┌───────────┐   copy/move ctor must EXIST               │
  │     │ temporary │ ─────────────────────────▶ ┌──────────┐   │
  │     │  object   │   (call may be elided)     │ caller's │   │
  │     └───────────┘                            │   obj    │   │
  │                                              └──────────┘   │
  ├─────────────────────────────────────────────────────────────┤
  │ C++17   "return Widget{};"                                  │
  │           │  a prvalue is an INITIALISER, not an object     │
  │           ▼                                                 │
  │     (no temporary exists at all)             ┌──────────┐   │
  │           └─────── initialises directly ────▶│ caller's │   │
  │                                              │   obj    │   │
  │     materialised into a real object ONLY     └──────────┘   │
  │     when a glvalue is required (bind a ref,                 │
  │     access a member, take its address)                      │
  └─────────────────────────────────────────────────────────────┘`)
      }
    ],
    examples: [
      {
        title: "A move constructor that silently copies",
        input:
          "Wrapper(Wrapper&& other) : data_{other.data_} {} where data_ is a std::vector<int> holding one million elements.",
        output: "Every 'move' performs a four-megabyte deep copy; the code is correct but the optimisation is entirely absent.",
        explanation:
          "Step 1: The parameter other has type Wrapper&&, but the expression other.data_ is an lvalue because it names a subobject of a named parameter with a stable address.\nStep 2: Overload resolution for the member initialiser therefore selects vector's copy constructor, since an lvalue cannot bind to vector's move constructor's rvalue reference parameter.\nStep 3: The copy compiles without any diagnostic, and the program's observable behaviour is identical, so only profiling reveals the problem.\nStep 4: Writing std::move(other.data_) casts the expression to an xvalue, which binds to vector's move constructor and steals the buffer pointer in constant time.\nStep 5: The general rule follows directly - inside a move constructor or a function taking T&&, every use of the parameter that should transfer ownership needs an explicit std::move, because the language deliberately refuses to move implicitly from something with a name."
      },
      {
        title: "std::move on a const object",
        input: "const std::string key = compute(); container.push_back(std::move(key));",
        output: "The string is copied, not moved; std::move has no effect whatsoever.",
        explanation:
          "Step 1: std::move performs a static_cast to an rvalue reference preserving const, so the result has type const std::string&& - a const xvalue.\nStep 2: string's move constructor takes string&&, and binding a const xvalue to a non-const rvalue reference is not allowed, so that overload is not viable.\nStep 3: The copy constructor takes const string&, which binds to every value category including const xvalues, so it is selected and the buffer is duplicated.\nStep 4: There is no diagnostic because the call is perfectly well-formed; the std::move simply becomes a no-op cast, which is why reviewers should treat std::move on a const object as a bug marker.\nStep 5: The fix is to remove the const from the local, or if the const is genuinely required, to accept the copy knowingly - and the same reasoning explains why functions must never return const by value, since that disables moves at every call site."
      },
      {
        title: "Returning a non-movable type by value",
        input: "A type with a deleted move constructor returned from a factory function by value, compiled as C++14 and then as C++17.",
        output: "C++14 rejects the code; C++17 compiles it and constructs the object directly in the caller's storage.",
        explanation:
          "Step 1: Under C++14 the return statement conceptually initialises a temporary, and the caller's variable is then initialised from it, requiring an accessible copy or move constructor even though the compiler was permitted to elide the call.\nStep 2: Because the move constructor is deleted and the copy constructor is suppressed by it, no viable constructor exists and the program is ill-formed regardless of optimisation level.\nStep 3: C++17 redefined a prvalue as an initialisation recipe rather than an object, so no temporary is ever conceptually created.\nStep 4: The prvalue returned by the factory therefore initialises the caller's variable directly, and no constructor other than the one that produced the value is involved.\nStep 5: This is guaranteed copy elision, distinct from named RVO, and it is why C++17 allows factories for lock_guard-like and mutex-like types that were previously impossible to return by value."
      }
    ],
    tips: [
      "Inside any function whose parameter is T&&, treat the parameter's name as an lvalue and write std::move explicitly wherever ownership should transfer.",
      "Never return by const value - it makes every prvalue a const prvalue and silently disables move construction at every call site.",
      "Use static_assert on is_nothrow_move_constructible_v rather than is_move_constructible_v, since the latter passes for types whose only viable overload is the copy constructor."
    ],
    tricks: [
      "decltype((x)) with double parentheses reveals the value category: no parentheses gives the declared type, parentheses give T& for lvalues.",
      "If std::move appears on a const object or on a return statement's local variable, it is almost always either a no-op or a pessimisation.",
      "A quick category test: ask whether you could take the address of the expression - if &expr compiles, it is a glvalue."
    ],
    memoryAids: [
      "Identity plus movability: lvalue has identity only, prvalue has movability only, xvalue has both.",
      "If it has a name, it is an lvalue - even if its type is an rvalue reference.",
      "const& is the universal donor: it accepts every category, which is why a missing move overload never fails to compile."
    ],
    interviewPatterns: [
      "'What is the difference between an rvalue reference and an rvalue?' The expected answer separates the type of the entity from the category of the expression naming it.",
      "'Why does std::move sometimes do nothing?' They are probing const-qualified sources, missing move constructors, and const return types.",
      "Frequency and companies: foundational at Jane Street, Bloomberg, Nvidia, and Microsoft; usually the opening question of any move-semantics sequence."
    ],
    practiceProblems: [
      "Is a string literal an lvalue or a prvalue, and why does it matter? Answer: it is an lvalue, because it denotes a real array object of static storage duration with an address; this matters because it means a string literal can bind to a const char (&)[N] reference and decays to a pointer to persistent storage, so returning that pointer from a function is safe, unlike returning a pointer to a genuine temporary.",
      "Given void f(T&&) and void f(const T&), which is called for f(std::move(cw)) where cw is const? Answer: the const lvalue reference overload, because std::move preserves const and produces a const xvalue that cannot bind to a non-const rvalue reference, so the only viable candidate is const T& - a silent fallback to copying that no diagnostic reports.",
      "Why does decltype(auto) exist when auto already deduces a return type? Answer: auto strips references and cv-qualifiers, so a forwarding wrapper returning auto would copy its result and lose the caller's ability to assign through it; decltype(auto) applies decltype's rules to the return expression, preserving lvalue-ness as T& and xvalue-ness as T&&, which is exactly what a transparent wrapper requires."
    ],
    faq: [
      {
        question: "Why did C++11 need three value categories instead of two?",
        answer:
          "Because move semantics introduced a distinction the old two-way split could not express. Pre-C++11 the question was simply whether an expression could appear on the left of an assignment, giving lvalues and rvalues. Move semantics needs to ask a different question - may I steal this object's resources? - and the answer is not the same as the old one. A temporary returned by value clearly may be stolen from, and it has no name, so the old category rvalue fits. But an object you explicitly designate with std::move also may be stolen from while very much having a name and an address, and calling that an rvalue in the old sense would be wrong because you can take its address and it will still exist afterwards. Hence the reformulation around two orthogonal properties, identity and movability, which yields three occupied cells: identity without movability is an lvalue, movability without identity is a prvalue, and both together is an xvalue. The fourth cell, neither identity nor movability, describes nothing useful and is unoccupied. The umbrella terms glvalue and rvalue then let the standard state rules in terms of whichever property matters, which is why binding rules are phrased with rvalue and lifetime rules with glvalue."
      },
      {
        question: "Why is a named rvalue reference an lvalue?",
        answer:
          "For safety, and the rule prevents a whole class of silent data destruction. Consider a function taking Widget&& w that uses w on two consecutive lines. If naming w produced an rvalue, the first use would move from the object and the second would operate on a moved-from husk, with no diagnostic and no obvious cause. Because every use of a name is an lvalue, moving requires you to write std::move explicitly, which localises the transfer of ownership to a visible point in the source and makes double-move bugs a deliberate act rather than an accident. The rule also composes correctly with the rest of the language: value category is a property of expressions and reference-ness is a property of types, and keeping them independent avoids special cases in overload resolution and template deduction. The practical cost is the requirement to remember std::move in move constructors and in forwarding code, which is genuinely the most common move-semantics mistake, but the alternative would make correct code far harder to write. A useful mental shorthand is that std::move does not move anything; it is a permission slip, and the language deliberately requires you to sign it by hand."
      },
      {
        question: "What actually changed about prvalues in C++17?",
        answer:
          "C++17 stopped treating a prvalue as denoting a temporary object and started treating it as a recipe for initialising one. Before that change, a return statement conceptually created a temporary and the caller's variable was initialised from it, with the compiler merely permitted - never required - to elide the intervening constructor call. That permission was optional, so the constructor still had to be accessible and non-deleted, which meant a non-movable type could not be returned by value even though every real compiler would have elided the copy. Under the new model a prvalue is only materialised into an object when a glvalue is genuinely required, such as when binding a reference or accessing a member, so in the common case of initialising a variable from a function's return there is no temporary at all: the object named by the caller is the object the return statement constructs. The consequences are concrete. Copy elision for prvalues is now guaranteed rather than permitted, factories can return types with deleted copy and move constructors, and reasoning about how many objects exist becomes simpler. Named return value optimisation is a separate and still optional optimisation, because a named local really is an object, which is why the two are worth keeping distinct in your head."
      },
      {
        question: "How can I tell which value category an expression has?",
        answer:
          "Two reliable tests cover almost everything. First, ask whether you can take the address of the expression: if &expr compiles, the expression has identity and is therefore a glvalue, meaning either an lvalue or an xvalue; if it does not compile, it is a prvalue. Second, distinguish the two glvalue cases by asking whether the expression is an explicit cast to an rvalue reference or a call returning one - if so it is an xvalue, otherwise an lvalue. For a mechanical answer, decltype encodes the category directly when applied to a parenthesised expression: decltype((e)) is T for a prvalue, T& for an lvalue, and T&& for an xvalue, so a static_assert on is_lvalue_reference_v of that type settles any argument. The cases people get wrong are worth memorising rather than deriving. A string literal is an lvalue because it names a static array. A function call returning T&& yields an xvalue, not a prvalue, which matters for std::move's own return type. And a member access such as obj.field takes its category from obj, so a member of a temporary is a prvalue's subobject accessed as an xvalue, which is exactly why std::move(pair).first can move out of a pair member."
      },
      {
        question: "If const& binds to everything, why do we need rvalue references at all?",
        answer:
          "Because const& binds to everything but tells you nothing, and in particular it forbids the one thing move semantics needs. A const lvalue reference guarantees the caller that you will not modify the object, which is exactly right for observation but makes stealing its resources impossible: taking a vector's buffer requires setting the source's pointer to null, and you cannot do that through a const reference. An rvalue reference parameter carries a different promise in the opposite direction - the caller is telling you that this object is expiring or has been explicitly released, so you may leave it in any valid state. That extra information is what allows the callee to choose the cheap implementation. The reason const& remains dangerous is precisely that it is the universal fallback: when no move overload exists, or when the argument is const, overload resolution silently selects it and you get a correct but slow program with no diagnostic anywhere. This is why the practical discipline is to provide move operations on any resource-owning type, to mark them noexcept so the library will actually use them, and to be suspicious of any const that sits between a value and its intended destination."
      },
      {
        question: "Does std::move generate any code?",
        answer:
          "None. std::move is a function template whose body is a single static_cast to an rvalue reference, and it is invariably inlined to nothing, so the generated instructions are identical whether or not you write it. What it changes is which overload the compiler selects at the call site, and therefore which function's body runs afterwards - if the selected overload is a move constructor, the code that follows steals a pointer instead of copying a buffer, and the saving comes from that function, not from std::move itself. Understanding this removes several confusions at once. It explains why std::move on a const object does nothing useful: the cast succeeds but produces a const xvalue that still selects the copy overload. It explains why std::move on a trivially copyable type such as an int is pointless: there is no cheaper overload to select. And it explains why std::move on a return statement's local variable is actively harmful: it turns the expression into an xvalue that no longer qualifies for named return value optimisation, forcing an actual move where the compiler would otherwise have constructed the object in place. The name is the real problem, since std::move is a cast and std::forward is a conditional cast, and neither moves anything."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - Value categories - https://en.cppreference.com/w/cpp/language/value_category",
        insight: "Exhaustive list of which expressions produce which category, including the surprising cases."
      },
      {
        source: "book",
        attribution: "Scott Meyers - Effective Modern C++, Items 23 to 25",
        insight: "Practical treatment of std::move and std::forward as casts and the named-rvalue-reference rule."
      },
      {
        source: "blog",
        attribution: "Barry Revzin and the P0135 guaranteed copy elision proposal",
        insight: "Why C++17 redefined prvalues as initialisers and what it enabled for non-movable types."
      }
    ]
  },
  {
    id: "topic-cpp-move-std-move-and-move-only-types",
    moduleId: "mod-cpp-move-semantics-and-value-categories",
    title: "std::move, Moved-From States, and Move-Only Types",
    intuition:
      "std::move is a cast, not an operation - it changes which overload is chosen and nothing else. The move that follows is written by the class author, and its contract is that the source is left valid but unspecified. Move-only types such as unique_ptr, thread, and future use this to express exclusive ownership in the type system, so the compiler rejects accidental sharing rather than leaving it to a code review. Most confusion about moves disappears once you see std::move as a request and the class's move constructor as the thing that decides what actually happens.",
    complexity: {
      time:
        "std::move compiles to nothing; the cost is entirely in the selected constructor. A typical move of a container is a handful of pointer assignments, so constant time, against O(n) element copies plus an allocation for a copy. For trivially copyable types a move is identical to a copy, which is why moving an int or a std::array<int, 64> saves nothing.",
      space:
        "A move transfers ownership of existing storage rather than allocating new storage, so peak memory for a move is the source's footprint while a copy needs twice that. Move-only types add no storage overhead - unique_ptr with a stateless deleter is exactly one pointer - so the safety is free."
    },
    lesson: [
      {
        title: "std::move Is a Cast",
        content:
          "std::move takes any expression and returns an unconditional rvalue reference to it, implemented as a single static_cast with reference collapsing so it works for both lvalues and rvalues. It performs no run-time work and is always inlined away. Everything that follows - stealing a buffer, nulling a pointer, transferring a handle - is done by the constructor or assignment operator that overload resolution then selects. This is why std::move on a const object silently does nothing useful, why std::move on an int is pointless, and why a type with no move constructor is unaffected by it. A better name would have been something like rvalue_cast, and reading it that way makes the surrounding rules obvious rather than mysterious.",
        codeExample: `// The entire implementation:
template <class T>
constexpr std::remove_reference_t<T>&& move(T&& t) noexcept {
    return static_cast<std::remove_reference_t<T>&&>(t);
}

std::vector<int> src(1'000'000, 7);
std::vector<int> dst = std::move(src);   // vector's MOVE ctor does the work:
                                         // steals begin/end/cap, nulls src

assert(src.empty());       // true for vector specifically - not guaranteed
                           // by the standard for every type

// No move constructor: the cast is a no-op.
struct Plain { std::vector<int> v; ~Plain() {} };  // dtor suppresses moves
Plain a, b = std::move(a);                          // deep copy, no warning

// Trivially copyable: nothing to steal.
int x = 5;
int y = std::move(x);      // identical to int y = x;
assert(x == 5);            // still 5

// The pessimising move - do NOT do this:
std::vector<int> make() {
    std::vector<int> local(100);
    return std::move(local);   // BLOCKS NRVO; forces an actual move
    // return local;           // correct: compiler constructs in place
}`,
        diagram: asciiDiagram(`What std::move does, and what actually moves

  Source line                    Compile time                 Run time
  ─────────────────────────────────────────────────────────────────────
  dst = std::move(src)
        │
        ├── std::move ────▶ static_cast<vector&&>(src)  ────▶ no code
        │                          │
        │                          ▼
        │                  overload resolution
        │                  ┌────────────────────────┐
        │                  │ operator=(const V&) ✗  │  lower priority
        │                  │ operator=(V&&)      ✓  │  selected
        │                  └───────────┬────────────┘
        │                              │
        └──────────────────────────────┴────────▶ move assignment body

  Move assignment body (this is the ONLY thing that costs anything)
  ┌───────────────────── before ─────────────────────┐
  │  src  ┌────┬────┬────┐        heap: [7,7,7,...]  │
  │       │beg │end │cap │──────────────▶            │
  │       └────┴────┴────┘                           │
  │  dst  ┌────┬────┬────┐        heap: [old data]   │
  │       │beg │end │cap │──────────────▶            │
  │       └────┴────┴────┘                           │
  └──────────────────────────────────────────────────┘
                        │  free dst's old buffer,
                        ▼  copy 3 pointers, null src's
  ┌───────────────────── after ──────────────────────┐
  │  src  ┌────┬────┬────┐                           │
  │       │null│null│null│   valid, unspecified      │
  │       └────┴────┴────┘                           │
  │  dst  ┌────┬────┬────┐        heap: [7,7,7,...]  │
  │       │beg │end │cap │──────────────▶            │
  │       └────┴────┴────┘   O(1), no allocation     │
  └──────────────────────────────────────────────────┘`)
      },
      {
        title: "The Moved-From Contract",
        content:
          "After a move, the standard requires that a library object is in a valid but unspecified state. Valid means every class invariant still holds, the destructor will run correctly, and any operation whose precondition does not depend on the current value is legal - assignment, clear, size, swap, and comparison all work. Unspecified means you may not assume what the value is. For your own types the same contract is the right one, and the practical implementation rule is that the move must leave the source in a state its own destructor handles safely, which for pointer-owning types means null. The classic portability bug is assuming a moved-from std::string is empty: for a long string it will be, because the buffer was stolen, but a short string using the small-buffer optimisation may retain its characters since there was nothing on the heap to steal.",
        codeExample: `std::string long_s(100, 'x');
std::string a = std::move(long_s);
// long_s is very likely empty - the heap buffer was stolen

std::string short_s = "hi";           // fits in the SSO buffer
std::string b = std::move(short_s);
// short_s may STILL be "hi" - nothing was on the heap to steal.
// Both are conforming. Never rely on either.

// Legal on a moved-from object (no precondition on the value):
long_s.clear();
long_s = "fresh";                     // assignment restores a known value
auto n = long_s.size();

// NOT legal (precondition depends on the value):
// long_s.front();                    // UB if empty
// *it                                // iterators are invalidated

// Writing a correct move for your own type:
class Buffer {
    std::byte*  p_ = nullptr;
    std::size_t n_ = 0;
public:
    Buffer(Buffer&& o) noexcept
        : p_{std::exchange(o.p_, nullptr)},     // source left destructible
          n_{std::exchange(o.n_, 0)} {}         // and invariant-consistent

    ~Buffer() { delete[] p_; }                  // safe on the moved-from one
};

// std::unique_ptr guarantees MORE than the general contract:
std::unique_ptr<int> u{new int{1}};
auto v = std::move(u);
assert(u == nullptr);      // GUARANTEED by the standard, not just likely`
      },
      {
        title: "Move-Only Types",
        content:
          "A type is move-only when its copy operations are deleted but its move operations exist, which encodes exclusive ownership in the type system. unique_ptr, thread, future, jthread, fstream, and the standard lock types are all move-only, and the compiler rejects any attempt to duplicate the ownership rather than leaving a double-free or a double-join to run time. Move-only types compose: a class holding a unique_ptr member becomes move-only automatically under Rule of Zero, which is usually correct. They also interact with containers - a vector of move-only elements works, but only with emplace_back or push_back of an rvalue, and algorithms that copy such as std::sort's element shuffling must be move-aware, which since C++11 they are.",
        codeExample: `class Connection {
    std::unique_ptr<Socket> sock_;         // makes Connection move-only
public:
    explicit Connection(Endpoint e) : sock_{std::make_unique<Socket>(e)} {}
    // Rule of Zero: no special members written, and the compiler
    // generates move but deletes copy because unique_ptr does.
};
static_assert(!std::is_copy_constructible_v<Connection>);
static_assert(std::is_move_constructible_v<Connection>);

std::vector<Connection> pool;
// pool.push_back(c);                 // ERROR: would copy
pool.push_back(std::move(c));         // OK
pool.emplace_back(Endpoint{"db", 5432});   // OK: constructs in place

// Passing a move-only type: by value expresses "I take ownership".
void own(std::unique_ptr<Widget> w);
own(std::make_unique<Widget>());      // prvalue: no move even needed
auto p = std::make_unique<Widget>();
// own(p);                            // ERROR: copy required
own(std::move(p));                    // explicit transfer

// Returning move-only types is free:
std::unique_ptr<Widget> make() { return std::make_unique<Widget>(); }

// The lambda-capture consequence:
auto task = [p = std::make_unique<Job>()] { p->run(); };
// 'task' is now move-only, so it will NOT fit in std::function (C++11-20),
// which requires a CopyConstructible target. Use std::move_only_function
// in C++23, or a shared_ptr capture before that.`
      },
      {
        title: "Where Moves Silently Do Not Happen",
        content:
          "Several situations look like moves and are not. Moving from a const object falls back to copying, since a const xvalue cannot bind to T&&. A member of a class whose destructor is user-declared has no generated move operations, so all its moves are copies. A move constructor that is not noexcept is skipped by vector reallocation in favour of copying. Writing std::move on a returned local disables named return value optimisation and turns a free elision into a real move. And self-move must be handled, because std::sort and std::swap can produce it: an unguarded move assignment that releases before stealing will destroy the object's own data. Each of these is silent - the program remains correct and merely becomes slow, or in the self-move case incorrect - which is why they are interview staples.",
        codeExample: `// 1. const source
const std::string k = "key";
v.push_back(std::move(k));            // COPY: const xvalue -> const&

// 2. suppressed generation
struct Timed { std::vector<int> v; ~Timed() { log(); } };
Timed t2 = std::move(t1);             // COPY: dtor killed the move ctor

// 3. non-noexcept move
struct Risky {
    std::vector<int> v;
    Risky(Risky&& o) : v{std::move(o.v)} {}   // missing noexcept
};
std::vector<Risky> vr;
vr.reserve(1); vr.push_back(Risky{}); vr.push_back(Risky{});
// reallocation COPIES every element - move_if_noexcept declined the move

// 4. pessimising move on return
std::string bad()  { std::string s; return std::move(s); }  // forces a move
std::string good() { std::string s; return s;            }  // NRVO: nothing

// 5. self-move
Buffer& operator=(Buffer&& o) noexcept {
    delete[] p_;                      // if &o == this, we just freed o.p_
    p_ = std::exchange(o.p_, nullptr);
    return *this;
}
// Guard it, or use copy-and-swap which is immune:
Buffer& operator=(Buffer&& o) noexcept {
    if (this != &o) { delete[] p_; p_ = std::exchange(o.p_, nullptr); }
    return *this;
}`,
        diagram: asciiDiagram(`Five places a move silently becomes a copy

  ┌──────────────────────────────────────────────────────────────────┐
  │ 1. const source                                                  │
  │    const string k;  v.push_back(std::move(k));                   │
  │    std::move ──▶ const string&&  ──▶ cannot bind to string&&     │
  │                                  └──▶ binds const string& : COPY │
  ├──────────────────────────────────────────────────────────────────┤
  │ 2. user-declared destructor                                      │
  │    struct T { vector<int> v; ~T(){} };                           │
  │    move ctor NEVER GENERATED ──▶ overload set has copy only      │
  ├──────────────────────────────────────────────────────────────────┤
  │ 3. move ctor not noexcept                                        │
  │    vector<T> grows ──▶ move_if_noexcept(t)                       │
  │         │                                                        │
  │         ├── is_nothrow_move_constructible? ── yes ──▶ T&&  move  │
  │         └────────────────────────────────── no  ──▶ const T& COPY│
  ├──────────────────────────────────────────────────────────────────┤
  │ 4. std::move on a returned local                                 │
  │    return std::move(s);   ──▶ not a name ──▶ NRVO disabled       │
  │    return s;              ──▶ elided entirely : FREE             │
  ├──────────────────────────────────────────────────────────────────┤
  │ 5. self-move in an unguarded assignment                          │
  │    delete[] p_;  p_ = exchange(o.p_, nullptr);                   │
  │    when &o == this : freed, then read ──▶ HEAP CORRUPTION        │
  └──────────────────────────────────────────────────────────────────┘

  Every one of 1-4 still COMPILES and still produces CORRECT results.
  Only the profiler ever notices. Case 5 is the one that breaks.`)
      },
      {
        title: "When a Move Is Worth Nothing",
        content:
          "Move semantics only helps types that own out-of-line resources. For a trivially copyable type - int, double, a pointer, a struct of such members, std::array<int, N> - the move constructor is a memberwise copy, so std::move saves nothing and merely adds noise. The same applies to types whose data is stored inline, which is why moving a std::array is O(n) regardless and why moving a short std::string using the small-buffer optimisation copies characters rather than stealing a pointer. Knowing this stops you from writing std::move on every argument, which is a real anti-pattern: it obscures which transfers matter, and on a return statement it actively costs performance. The useful mental filter is to ask whether the type has a pointer to a heap allocation; if not, a move is a copy.",
        codeExample: `// Nothing gained - all inline data:
std::array<double, 64> a1, a2;
a2 = std::move(a1);                // 512 bytes copied either way
static_assert(std::is_trivially_copyable_v<std::array<double, 64>>);

struct Point { double x, y, z; };
Point p2 = std::move(p1);          // three loads and three stores

// Real gain - heap-owning types:
std::vector<std::string> v2 = std::move(v1);   // 3 pointers, O(1)
std::unordered_map<int, Big> m2 = std::move(m1);  // steals the bucket array

// Marginal or zero - small string optimisation:
std::string tiny = "abc";          // 3 chars live inside the object
std::string t2 = std::move(tiny);  // characters copied; nothing stolen

// A useful rule of thumb, checkable at compile time:
template <class T>
constexpr bool move_is_worth_it =
    !std::is_trivially_copyable_v<T> && std::is_move_constructible_v<T>;

static_assert(!move_is_worth_it<Point>);
static_assert(move_is_worth_it<std::vector<int>>);

// Parameter design follows from this:
void take_by_value(std::string s);      // good: caller chooses copy or move
void take_by_value(int i);              // fine: copying an int is free
void take_by_value(std::array<char, 4096> a);   // bad: 4 KB copied, no move`
      }
    ],
    examples: [
      {
        title: "vector reallocation refusing to move",
        input:
          "A vector of a type whose move constructor is correct but not declared noexcept grows from 1024 to 2048 elements.",
        output: "All 1024 elements are deep-copied instead of moved; the growth costs 1024 allocations rather than 1024 pointer swaps.",
        explanation:
          "Step 1: vector reallocation must provide the strong exception guarantee, so if it fails partway through the original vector must remain untouched.\nStep 2: Moving elements modifies the source, so a throw after some elements have been moved leaves the original in a partially destroyed state that cannot be restored, since moving them back could throw again.\nStep 3: vector therefore uses std::move_if_noexcept, which returns an rvalue only when the element's move constructor is declared noexcept and otherwise returns a const lvalue reference.\nStep 4: A const lvalue reference binds to the copy constructor, so a move constructor that merely forgot noexcept is never used during growth, and the omission is invisible in every test that checks only correctness.\nStep 5: Adding noexcept, which is accurate for any move that only steals pointers, restores the intended behaviour, and a static_assert on is_nothrow_move_constructible_v prevents the regression from returning."
      },
      {
        title: "std::move on a returned local",
        input: "std::vector<Record> load() { std::vector<Record> out; fill(out); return std::move(out); }",
        output: "A real move constructor call is executed on every return, where returning out plainly would have executed nothing.",
        explanation:
          "Step 1: Returning a named local by value is eligible for named return value optimisation, in which the compiler constructs the local directly in the caller's storage so no constructor runs at return.\nStep 2: NRVO requires the return expression to be the name of a non-volatile local of the return type, and std::move(out) is a cast expression, not a name.\nStep 3: The optimisation is therefore disabled, and the compiler must materialise the object and then move-construct the caller's variable from it.\nStep 4: The move is cheap for a vector, so the loss is small here, but for a type with an expensive move or none at all - where the fallback is a copy - the same pattern is genuinely costly.\nStep 5: The correct rule is to return the local by name and let the language elide; std::move on a return statement is only appropriate when returning a member or a parameter, neither of which is eligible for NRVO anyway."
      },
      {
        title: "Self-move through std::sort",
        input:
          "A hand-written move assignment that deletes its buffer before stealing, used as the element type of a vector passed to std::sort.",
        output: "Intermittent heap corruption on certain inputs, reproducible only for particular element orderings.",
        explanation:
          "Step 1: Introsort's partitioning steps can perform an assignment where the source and destination are the same element, particularly through std::swap on equal positions and inside the insertion-sort tail.\nStep 2: The move assignment first frees this object's buffer, which is also the source object's buffer since they are the same object.\nStep 3: It then reads the source's now-dangling pointer and installs it, leaving the object holding freed memory that will be freed again at destruction.\nStep 4: The failure depends on the exact comparison sequence, so it appears only for some inputs and often survives testing, which is what makes it dangerous rather than merely wrong.\nStep 5: Guarding with if (this != &other), or using copy-and-swap where the temporary makes self-assignment harmless, fixes it; the standard requires only that self-move leaves the object valid, so the class author owns this obligation."
      }
    ],
    tips: [
      "Read std::move as a cast to rvalue - it never moves anything, so if no move constructor exists nothing improves.",
      "Never write std::move on a returned local variable; it defeats named return value optimisation and converts free elision into a real move.",
      "Guard hand-written move assignment against self-assignment, because std::sort and std::swap genuinely produce it."
    ],
    tricks: [
      "std::exchange writes an entire move constructor body in one expression and guarantees the source is left in a valid empty state.",
      "A moved-from std::string may still hold its characters if they fit in the small-buffer optimisation, so never assert emptiness after a move except for unique_ptr, which guarantees null.",
      "If a capture makes a lambda move-only it will not fit in std::function before C++23; capture a shared_ptr instead or use std::move_only_function."
    ],
    memoryAids: [
      "std::move is a permission slip, not a removal van - the class's move constructor does the carrying.",
      "Valid but unspecified: you may assign to it or destroy it, you may not read it and expect a value.",
      "If it has no heap pointer, a move is a copy - moving an int or an array buys you nothing."
    ],
    interviewPatterns: [
      "'What state is an object in after being moved from?' The expected answer is valid but unspecified, with the string small-buffer counterexample and unique_ptr's stronger guarantee.",
      "'Why is my vector still copying after I added a move constructor?' They are testing noexcept and move_if_noexcept.",
      "Frequency and companies: extremely common at Bloomberg, Nvidia, Jane Street, and Meta; usually paired with a request to write a correct move assignment."
    ],
    practiceProblems: [
      "Why does std::move return remove_reference_t<T>&& rather than T&&? Answer: because T may deduce to an lvalue reference type when the argument is an lvalue, and T&& would then collapse back to an lvalue reference, making the cast a no-op; stripping the reference first guarantees the result is always an rvalue reference regardless of how T deduced.",
      "Is it safe to use a moved-from object at all? Answer: yes for any operation with no precondition on the current value - assignment, clear, size, swap, destruction - because the contract guarantees the object is valid; it is unsafe to read the value or to call an operation like front that requires non-emptiness, so the practical discipline is to assign a fresh value before any use.",
      "Why must a move constructor be noexcept when a copy constructor need not be? Answer: because library operations that must provide the strong exception guarantee, notably vector reallocation, can undo a copy by simply discarding the new buffer but cannot undo a partially completed sequence of moves; move_if_noexcept therefore declines any move that might throw, so a non-noexcept move is functionally invisible to the container."
    ],
    faq: [
      {
        question: "Why does moving from a std::string sometimes leave it unchanged?",
        answer:
          "Because of the small-buffer optimisation, and because the standard deliberately specifies only that the source is valid and unspecified. Every mainstream std::string implementation stores short strings - typically up to fifteen characters on a 64-bit platform - directly inside the string object rather than on the heap, which avoids an allocation for the overwhelmingly common case of small strings. When such a string is moved from, there is no heap buffer to steal, so the move constructor simply copies the inline characters into the destination, and the cheapest correct thing it can do with the source is leave it alone. For a long string the buffer pointer is taken and the source is reset to an empty state, since leaving it pointing at memory now owned by the destination would double-free. The result is that emptiness after a move depends on the length of the string and on the implementation's buffer size, both of which are outside your control. This is exactly why the standard chose 'valid but unspecified' rather than 'empty': mandating emptiness would force short-string moves to do extra work for no benefit. In practice, treat any assertion about a moved-from value as a bug, with the single exception of unique_ptr, whose specification does guarantee the source becomes null."
      },
      {
        question: "Should I write std::move on function arguments routinely?",
        answer:
          "No - write it where ownership genuinely transfers and nowhere else, because indiscriminate use is both noise and, in some places, a pessimisation. The cases where it is right are clear: passing a local you are finished with into a container or a constructor that will store it, forwarding a member into a return value, and moving a parameter you took by value into a member. The cases where it is wrong are equally clear. On a const object it is a silent no-op that falls back to copying, so it misleads the reader into thinking a move occurs. On a trivially copyable type such as an int or a Point it accomplishes nothing, since the move is a copy. On a returned local it actively blocks named return value optimisation, replacing free elision with a real move. And on an argument you still need afterwards it is a bug waiting for the next maintainer, because the object is left in an unspecified state. The habit worth building is to treat every std::move as a statement that this object is finished, so a reader can rely on that meaning; when the word appears everywhere it stops carrying information and the genuinely important transfers become invisible."
      },
      {
        question: "How do move-only types interact with the standard containers?",
        answer:
          "They work, with a small set of restrictions that follow mechanically from the element operations each container requires. A vector of unique_ptr is entirely ordinary: you can emplace_back to construct in place, push_back an rvalue, sort it, erase from it, and return it by value, because all of those need only move construction and move assignment. What fails is anything that requires a copy - push_back of an lvalue, initialising from an initializer_list, which copies its elements, and any algorithm parameterised on copying such as std::copy rather than std::move_backward. Two further points catch people out. Vector growth needs the element's move constructor to be noexcept or it will attempt to copy and fail to compile, which is why unique_ptr and thread both declare theirs noexcept and why your own move-only types must too. And a move-only type inside a lambda capture makes the closure move-only, so it cannot be stored in a std::function before C++23, which requires a copy-constructible target - the usual workarounds being to capture a shared_ptr instead, or to use std::move_only_function where available. Associative containers behave the same way, with the extra note that a map's value_type contains a const key, so elements cannot be moved out of a map without extract."
      },
      {
        question: "What is the difference between a moved-from object and a destroyed one?",
        answer:
          "A moved-from object is fully alive; only its value is unspecified. Its lifetime has not ended, its destructor has not run and will run later, its invariants hold, and it occupies its storage exactly as before. That is what makes assignment to it legal and what obliges the move constructor to leave it in a state the destructor can handle - typically null pointers and zero sizes. A destroyed object, by contrast, has ended its lifetime; touching it in any way other than reusing its storage is undefined behaviour, and its destructor must not run again. The distinction matters most in two places. First, in writing move operations: the source must be left destructible, which is precisely why std::exchange to nullptr is the idiomatic body, since forgetting it produces a double free at the source's scope exit rather than at the move. Second, in reasoning about containers: after a vector reallocation the old elements are moved from and then destroyed, two separate steps, and an element whose move left a dangling pointer will crash during the second. A useful summary is that moving transfers value while destruction ends existence, and every move operation you write owes the destructor a source it can safely handle."
      },
      {
        question: "Why is self-move allowed to leave the object in an unspecified state?",
        answer:
          "Because requiring self-move to be a no-op would impose a check on every move assignment for the benefit of an operation that is almost always a bug, and the committee preferred to leave the cost to the cases that need it. The standard says a self-move leaves a library object valid but unspecified, which means the program will not crash and the object can still be assigned to or destroyed, but you may not assume its value survived. The practical consequence for class authors is that your own move assignment must at least be safe under self-move, even if it does not preserve the value, because self-move genuinely occurs inside standard algorithms: std::sort's partitioning and insertion-sort tail can assign an element to itself, and a naive implementation that frees its buffer before stealing the source's will free and then read the same memory. There are two clean ways to satisfy this. An explicit if (this != &other) guard is direct and costs one predictable branch. Copy-and-swap is immune by construction, because the incoming parameter is a distinct object and the swap simply exchanges with it. What is not acceptable is to assume self-move never happens, because that assumption fails intermittently and only on some inputs, which is the worst possible failure mode."
      },
      {
        question: "Does move semantics help with return values, or does elision make it redundant?",
        answer:
          "Elision does most of the work for returns, and move semantics covers the cases elision cannot reach. When you return a prvalue, C++17 guarantees the object is constructed directly in the caller's storage with no constructor call at all, so move semantics is irrelevant there. When you return a named local, named return value optimisation usually achieves the same thing, though it is permitted rather than required and can be defeated by returning different locals on different paths or by returning a parameter. In those non-elidable cases the language applies an implicit move: a return statement naming a local or a by-value parameter treats it as an rvalue first, so the move constructor is selected without you writing std::move, and C++20 extended this to more situations including returns of by-value parameters and throw expressions. Where move semantics genuinely earns its keep is everywhere other than returns - inserting into containers, reallocating vectors, swapping, sorting, passing ownership into constructors, and returning a member rather than a local, which is not eligible for elision and does need an explicit std::move. So the accurate summary is that elision handles the common return path, implicit move handles the rest of it, and explicit moves belong to the vastly larger set of value transfers that are not returns at all."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Scott Meyers - Effective Modern C++, Items 23, 25 and 29 (std::move, moves you cannot rely on)",
        insight: "Why std::move is a cast, when moves are not actually cheaper, and the noexcept requirement."
      },
      {
        source: "blog",
        attribution: "Howard Hinnant - Everything You Ever Wanted to Know About Move Semantics",
        insight: "Authoritative treatment of moved-from states, self-move, and move-only type design."
      },
      {
        source: "note",
        attribution: "cppreference - std::move and std::exchange - https://en.cppreference.com/w/cpp/utility/move",
        insight: "Exact signatures, the remove_reference detail, and the library's valid-but-unspecified guarantee."
      }
    ]
  },
  {
    id: "topic-cpp-move-forwarding-references",
    moduleId: "mod-cpp-move-semantics-and-value-categories",
    title: "Forwarding References and Reference Collapsing",
    intuition:
      "T&& in a deduced context is not an rvalue reference - it is a forwarding reference that binds to anything and remembers what it bound to. The mechanism is template argument deduction plus reference collapsing: an lvalue argument deduces T as an lvalue reference, so T&& collapses back to an lvalue reference, while an rvalue deduces T as a plain type and T&& stays an rvalue reference. Understanding those two rules explains std::forward, why auto&& works, why the overload set gets hijacked, and why emplace_back can construct anything.",
    complexity: {
      time:
        "Reference collapsing and deduction happen entirely at compile time and cost nothing at run time. The benefit is that a forwarding wrapper adds zero indirection: after inlining, a perfectly forwarded call is identical to calling the target directly, so a variadic emplace performs exactly one construction with no intermediate copy or move.",
      space:
        "A forwarding reference parameter is a reference, so it occupies one pointer at most and usually nothing after inlining. The saving is in avoided temporaries: a non-forwarding wrapper taking by value would materialise an extra object per call, which for a container element can mean an extra allocation on every insertion."
    },
    lesson: [
      {
        title: "Two Rules That Produce Everything",
        content:
          "Rule one is special deduction for a parameter of the exact form T&& where T is a template parameter of that same function: an lvalue argument of type A deduces T as A&, and an rvalue argument deduces T as A. Rule two is reference collapsing, which resolves references to references produced by substitution: an lvalue reference wins in every combination, so A& &, A& &&, and A&& & all collapse to A&, and only A&& && collapses to A&&. Put them together and T&& becomes A& for an lvalue argument and A&& for an rvalue argument, which is exactly what preserving the caller's value category requires. Everything else about perfect forwarding is a consequence of these two rules, so it is worth being able to derive the deduction by hand.",
        diagram: asciiDiagram(`Deduction and collapsing, step by step

  template <class T> void f(T&& x);

  Call site            T deduced as      T&& becomes      x binds as
  ──────────────────────────────────────────────────────────────────
  Widget w;
  f(w);                Widget&           Widget& &&       Widget&
                                            │                lvalue ref
                                            └── collapses ──▶ Widget&

  const Widget cw;
  f(cw);               const Widget&     const Widget& &&  const Widget&

  f(Widget{});         Widget            Widget&&          Widget&&
                                            │                rvalue ref
                                            └── no collapse ▶ Widget&&

  f(std::move(w));     Widget            Widget&&          Widget&&

  Reference collapsing table
  ┌──────────────┬──────────────┐
  │  written     │  collapses to│
  ├──────────────┼──────────────┤
  │  A&  &       │  A&          │
  │  A&  &&      │  A&          │   ← lvalue is infectious
  │  A&& &       │  A&          │
  │  A&& &&      │  A&&         │   ← only all-rvalue stays rvalue
  └──────────────┴──────────────┘

  NOT a forwarding reference (no deduction of THIS parameter):
  ┌────────────────────────────────────────────────────────────┐
  │ template <class T> void g(std::vector<T>&& v);   ← rvalue  │
  │ template <class T> struct S { void h(T&& t); };  ← rvalue  │
  │ template <class T> void k(const T&& t);          ← rvalue  │
  │ void m(auto&& a);                                ← FORWARD │
  └────────────────────────────────────────────────────────────┘`)
      },
      {
        title: "std::forward: The Conditional Cast",
        content:
          "Because a named forwarding reference is an lvalue, passing it onward would always select the lvalue overload and lose the caller's rvalue-ness. std::forward<T> restores it by casting to T&&, which collapses to an lvalue reference when T deduced as A& and stays an rvalue reference when T deduced as A. The template argument must be written explicitly and must be the deduced T, not the parameter's type, because the information about the original category lives in T alone. This is why std::forward is described as a conditional cast against std::move's unconditional one, and why writing std::move where std::forward belongs is a genuine bug: it will steal from an lvalue the caller still intends to use.",
        codeExample: `#include <utility>

// The implementation, both overloads:
template <class T>
constexpr T&& forward(std::remove_reference_t<T>& t) noexcept {
    return static_cast<T&&>(t);          // T = A&  -> A&   (lvalue)
}                                        // T = A   -> A&&  (rvalue)

void sink(Widget&&);
void observe(const Widget&);

template <class T>
void wrapper(T&& arg) {
    // observe(arg);              // always the lvalue path
    target(std::forward<T>(arg)); // preserves the caller's category
}

Widget w;
wrapper(w);              // T = Widget&  -> forward yields Widget&  -> lvalue path
wrapper(Widget{});       // T = Widget   -> forward yields Widget&& -> sink

// The bug: std::move in a forwarding wrapper
template <class T>
void broken(T&& arg) {
    target(std::move(arg));      // steals from LVALUES too - caller's
}                                // object is silently gutted
Widget keeper;
broken(keeper);                  // keeper is now moved-from

// Forward exactly once, on the last use:
template <class T>
void two_uses(T&& arg) {
    log(arg);                        // plain lvalue use first
    store(std::forward<T>(arg));     // forward on the FINAL use only
}`
      },
      {
        title: "Variadic Forwarding",
        content:
          "Combining a variadic parameter pack with forwarding references gives the standard factory shape: template <class... Args> void f(Args&&... args), forwarded as std::forward<Args>(args)... . The pack expansion applies the cast element-wise, so each argument keeps its own category independently - one may be an lvalue and the next an rvalue. This is the machinery behind make_unique, make_shared, emplace_back, and every variadic constructor forwarder, and it is what allows emplace_back to construct an element in place from constructor arguments rather than building a temporary and moving it. Two details matter for correctness: the ellipsis must follow the whole forward expression so it expands both the pack and its type pack together, and the forwarded arguments should be consumed exactly once, since forwarding the same pack into two calls can double-move.",
        codeExample: `template <class T, class... Args>
std::unique_ptr<T> make_unique_like(Args&&... args) {
    return std::unique_ptr<T>{new T(std::forward<Args>(args)...)};
}
//                                 ^^^^^^^^^^^^^^^^^^^^^^^^^^^^
// expands to: forward<A1>(a1), forward<A2>(a2), ...

struct Record { Record(std::string name, int id, std::vector<int> tags); };

std::vector<Record> v;
std::string reusable = "alice";

v.emplace_back(reusable, 7, std::vector<int>{1,2,3});
//             ^^^^^^^^ lvalue -> copied
//                         ^ prvalue -> forwarded as rvalue
//                            ^^^^^^^^^^^^^^^^^^^^ prvalue -> MOVED
// One Record constructed directly in the vector's storage:
// no temporary Record, no move of a Record.

// Compare with push_back:
v.push_back(Record{reusable, 7, {}});   // builds a temporary Record,
                                        // then moves it into the vector

// Forward a pack only ONCE:
template <class... Args>
void broken(Args&&... args) {
    primary(std::forward<Args>(args)...);
    fallback(std::forward<Args>(args)...);   // BUG: second use sees husks
}
template <class... Args>
void fixed(Args&&... args) {
    if (!primary(args...))                          // lvalue use
        fallback(std::forward<Args>(args)...);      // forward last
}`,
        diagram: asciiDiagram(`emplace_back versus push_back: how many Records exist?

  push_back(Record{name, 7, tags})
  ┌──────────────────────────────────────────────────────────────┐
  │ 1. construct a TEMPORARY Record                              │
  │    ┌──────────────────────┐                                  │
  │    │ Record (temporary)   │  string alloc + vector alloc     │
  │    └──────────┬───────────┘                                  │
  │ 2. move-construct into the vector's buffer                   │
  │               ▼                                              │
  │    ┌──────────────────────┐                                  │
  │    │ Record (in vector)   │  3 pointer steals                │
  │    └──────────────────────┘                                  │
  │ 3. destroy the temporary                                     │
  │                                                              │
  │ Total: 2 Record constructions, 1 move, 1 destruction         │
  └──────────────────────────────────────────────────────────────┘

  emplace_back(name, 7, tags)
  ┌──────────────────────────────────────────────────────────────┐
  │ Args&&... deduced per argument:                              │
  │    name  is lvalue    → Args1 = string&  → forward → string& │
  │    7     is prvalue   → Args2 = int      → forward → int&&   │
  │    tags  is prvalue   → Args3 = vector   → forward → vector&&│
  │                              │                               │
  │                              ▼  placement new in the buffer  │
  │    ┌──────────────────────┐                                  │
  │    │ Record (in vector)   │  name COPIED, tags MOVED         │
  │    └──────────────────────┘                                  │
  │                                                              │
  │ Total: 1 Record construction, 0 moves, 0 destructions        │
  └──────────────────────────────────────────────────────────────┘

  Each argument keeps its OWN category - that is what the pack
  expansion std::forward<Args>(args)... buys you.`)
      },
      {
        title: "Why Forwarding References Hijack Overload Sets",
        content:
          "A function template taking T&& is an exact match for almost every argument, since T can deduce to whatever type is supplied with whatever qualifiers. That makes it a stronger candidate than any overload requiring a conversion, so it steals calls you intended for other functions. The classic failure is a class whose perfect-forwarding constructor outcompetes its own copy constructor for a non-const lvalue: the copy constructor takes const T&, which requires adding const, while the template deduces exactly and wins. The result is a compile error deep inside the template rather than a copy. Constraining the template is the fix - a C++20 requires clause, or enable_if with is_same on decay_t before that - and this is one of the strongest arguments for concepts, which turn an obscure instantiation error into a clear constraint failure.",
        codeExample: `class Person {
    std::string name_;
public:
    template <class T>
    explicit Person(T&& n) : name_{std::forward<T>(n)} {}   // greedy

    Person(const Person&) = default;
};

Person p{"alice"};
Person q{p};        // ERROR: T deduces Person&, so the TEMPLATE wins over
                    // the copy ctor (which would need a const conversion).
                    // string_ cannot be built from a Person -> hard error.

const Person cp{"bob"};
Person r{cp};       // OK: both need const, copy ctor is non-template -> wins

// C++20 fix: constrain it.
class Person2 {
    std::string name_;
public:
    template <class T>
        requires (!std::same_as<std::remove_cvref_t<T>, Person2>)
              && std::constructible_from<std::string, T>
    explicit Person2(T&& n) : name_{std::forward<T>(n)} {}

    Person2(const Person2&) = default;
    Person2(Person2&&) noexcept = default;
};

// Pre-C++20 fix:
template <class T,
          class = std::enable_if_t<
              !std::is_same_v<std::decay_t<T>, Person3>>>
explicit Person3(T&& n);

// Simplest fix of all when the type set is small: just overload.
// Person4(const std::string&); Person4(std::string&&);`
      },
      {
        title: "auto&&, Range-for, and Practical Uses",
        content:
          "auto&& follows the same deduction and collapsing rules, so it is a forwarding reference for variables. That makes it the correct choice for binding the result of an expression whose category you do not control, notably in a generic range-for loop where the container may yield real references, proxy objects such as vector<bool>::reference, or prvalues from a transforming view. Writing auto& breaks on proxies and prvalues, and auto copies, so auto&& is the only universally correct form. In a generic loop body you then use std::forward<decltype(x)>(x) to pass the element on with its category intact. The same reasoning applies to a lambda parameter written auto&&, which is a forwarding reference in a generic lambda and is why the forwarding idiom in modern code often appears without any explicit template.",
        codeExample: `// vector<bool> yields a proxy prvalue, not a bool&
std::vector<bool> flags{true, false};
// for (auto& f : flags)   {}   // ERROR: cannot bind proxy prvalue to auto&
for (auto&& f : flags) { f = !f; }        // OK

// A view yielding prvalues
for (auto&& x : nums | std::views::transform([](int n){ return n * 2; }))
    use(x);                                // auto& would not compile

// Forwarding out of a generic loop
template <class Range, class F>
void for_each_forward(Range&& r, F f) {
    for (auto&& e : std::forward<Range>(r))
        f(std::forward<decltype(e)>(e));   // decltype(e) carries the category
}

// Generic lambdas: auto&& is a forwarding reference
auto invoke_log = [](auto&& f, auto&&... args) {
    log_call();
    return std::forward<decltype(f)>(f)(std::forward<decltype(args)>(args)...);
};

// Binding a function result whose category varies
auto&& result = maybe_returns_reference();   // no copy either way
// Careful: lifetime extension applies only to a prvalue bound directly;
// binding to a reference RETURNED by a function extends nothing.
auto&& bad = get_vector().front();           // dangling: the vector died`
      }
    ],
    examples: [
      {
        title: "emplace_back versus push_back for a heavy element",
        input:
          "Inserting a Record holding a string and a vector into a container, once with push_back of a temporary and once with emplace_back of constructor arguments.",
        output: "push_back constructs a Record then moves it; emplace_back constructs exactly one Record in place.",
        explanation:
          "Step 1: push_back takes a Record, so the argument expression must first produce a complete Record object, which runs its constructor and allocates for its members.\nStep 2: That temporary is then move-constructed into the vector's storage and immediately destroyed, adding one move and one destructor call per insertion.\nStep 3: emplace_back instead takes a variadic pack of forwarding references and forwards them into a placement-new of Record inside the vector's buffer, so only one Record ever exists.\nStep 4: Each argument keeps its own category through the forward, so the lvalue string is copied while the temporary vector is moved - exactly what the caller expressed.\nStep 5: The gap is small for cheaply movable types but large when the element's move is expensive or absent, and it is the reason every modern container exposes an emplace family alongside insert."
      },
      {
        title: "A perfect-forwarding constructor stealing the copy constructor's calls",
        input: "A class with template <class T> Person(T&&) and a defaulted copy constructor, then Person q{p} where p is a non-const Person.",
        output: "A compile error inside the template body, referring to constructing a std::string from a Person.",
        explanation:
          "Step 1: Overload resolution considers both the copy constructor, which takes const Person&, and the template, which deduces T as Person& for a non-const lvalue.\nStep 2: The template's parameter after collapsing is Person&, an exact match, whereas the copy constructor requires a qualification conversion to add const.\nStep 3: An exact match beats a conversion, so the template is selected even though a copy is obviously what was meant.\nStep 4: Instantiating the template then attempts to initialise a std::string member from a Person, which fails with an error inside the constructor rather than at the call site, making the cause hard to see.\nStep 5: Constraining the template so it is not viable when the decayed argument is the class itself removes it from the overload set, restoring the copy constructor - and doing it with a C++20 requires clause also improves the diagnostic from an instantiation failure to a clear constraint failure."
      },
      {
        title: "std::move used where std::forward belonged",
        input: "template <class T> void store(T&& x) { cache_.push_back(std::move(x)); } called with a named local the caller uses afterwards.",
        output: "The caller's object is silently moved from; subsequent reads observe an unspecified value.",
        explanation:
          "Step 1: std::move casts unconditionally to an rvalue reference regardless of how T deduced, so an lvalue argument is treated as expiring.\nStep 2: push_back therefore selects its rvalue overload and the element's move constructor steals the caller's buffer.\nStep 3: The caller passed a named variable and reasonably expects it to be untouched, since nothing at the call site indicates a transfer of ownership.\nStep 4: The failure is silent because the moved-from state is valid, so the program continues and merely produces wrong data - often an empty string or vector far from the call.\nStep 5: std::forward<T> is the correct tool: it casts to T&&, which collapses to an lvalue reference when the argument was an lvalue, so the copy overload is chosen and only genuine rvalues are stolen from."
      }
    ],
    tips: [
      "T&& is only a forwarding reference when T is deduced for that very parameter; std::vector<T>&&, const T&&, and a class template's T&& in a member function are all plain rvalue references.",
      "Forward each argument exactly once, on its final use, and use it as a plain lvalue everywhere before that.",
      "Constrain any perfect-forwarding constructor so it cannot outcompete the copy constructor for non-const lvalues of its own type."
    ],
    tricks: [
      "std::forward<decltype(x)>(x) forwards a variable declared auto&& or a generic-lambda parameter without naming a template parameter.",
      "auto&& is the only universally correct range-for binding, because it also handles proxy references and views that yield prvalues.",
      "If you cannot remember whether to write forward or move, ask whether the parameter's type was deduced: deduced means forward, spelled out means move."
    ],
    memoryAids: [
      "Lvalue is infectious in collapsing: only rvalue-and-rvalue stays an rvalue.",
      "move is unconditional, forward is conditional - forward remembers, move insists.",
      "Deduced T&& binds to everything, which is exactly why it also steals calls from everything."
    ],
    interviewPatterns: [
      "'What is the difference between std::move and std::forward?' The expected answer is unconditional versus conditional cast, plus what happens when you swap them.",
      "'Why does my class fail to copy when it has a templated constructor?' They are testing greedy forwarding constructors and how to constrain them.",
      "Frequency and companies: standard at Jane Street, Bloomberg, Nvidia, and any team writing generic libraries; often paired with a request to implement make_unique."
    ],
    practiceProblems: [
      "Why must std::forward be given an explicit template argument when std::move is not? Answer: the information about the caller's original value category is encoded in the deduced T, not in the parameter's own type, which is always an lvalue when named; forward needs T to decide whether to produce A& or A&&, and deducing it from the argument would always yield the lvalue answer, defeating the purpose.",
      "Is void f(auto&& x) a forwarding reference? Answer: yes - the abbreviated function template syntax introduces an invented template parameter deduced for that parameter, so the deduction and collapsing rules apply exactly as with an explicit template, and inside the body you forward with std::forward<decltype(x)>(x).",
      "Why is template <class T> void f(std::vector<T>&& v) not a forwarding reference? Answer: because the parameter is not of the form T&& - the deduced parameter T appears nested inside vector, so the special deduction rule does not apply and the parameter is an ordinary rvalue reference to vector<T>, which rejects lvalue vectors outright."
    ],
    faq: [
      {
        question: "Why is T&& called a forwarding reference rather than a universal reference?",
        answer:
          "Both names describe the same construct, and the difference is emphasis. Scott Meyers coined universal reference to stress the binding behaviour - the parameter accepts lvalues, rvalues, const and non-const, of any type - which is what makes it both powerful and dangerously greedy in overload resolution. The standard later adopted forwarding reference to stress the purpose, since the only reason to want that binding behaviour is to pass the argument onward with its original category preserved. The standard's name is arguably better because it warns against the misuse: if a parameter is a forwarding reference and you are not forwarding it, you almost certainly wanted either const T& for observation or T by value for a sink. It also hints at the obligations that come with it, namely that you must use std::forward rather than std::move, that you must forward exactly once on the last use, and that you should constrain the template if it sits in an overload set with non-template alternatives. Meyers' name remains useful in one respect: it explains why such a template hijacks calls, which is a binding property rather than a forwarding one, so knowing both terms is worth the small redundancy."
      },
      {
        question: "What exactly goes wrong if I use std::move instead of std::forward?",
        answer:
          "You move from lvalues that the caller still owns and intends to use. std::move casts unconditionally, so it does not care that T deduced as an lvalue reference; the resulting expression is an rvalue and the target's move overload is selected, which steals the argument's resources. Because a moved-from object is valid, nothing crashes at the point of the bug - the caller's string simply becomes empty or its vector loses its elements, and the symptom surfaces later and elsewhere, which makes it one of the more painful bugs to trace. The reverse mistake, writing std::forward where std::move belongs, is far less harmful: in a non-deduced context you cannot even name a valid T, so it usually fails to compile, and where it does compile it typically produces a copy where a move was intended, costing performance rather than correctness. A reliable discipline is to look at the parameter's declaration rather than at what feels right: if the type was deduced for that parameter, meaning it is literally T&& or auto&&, use forward; if it is a concrete type such as Widget&&, use move. Reviewers can apply the same rule mechanically, which is why it is worth stating explicitly in a style guide."
      },
      {
        question: "Why does a forwarding constructor break copying, and what is the cleanest fix?",
        answer:
          "It breaks copying because it is an exact match where the copy constructor is not. Given a non-const lvalue of the class type, the template deduces T as Class& and its parameter collapses to Class&, matching the argument exactly with no conversion at all, while the copy constructor's const Class& parameter requires adding const - a qualification conversion. Exact match wins, so the template is chosen, and the failure appears as an error inside the template body where it tries to initialise a member from a whole object of the class type. Interestingly the const case works, because both candidates then need const and the non-template is preferred as a tiebreak, which is why the bug often escapes casual testing. The cleanest fix in C++20 is a requires clause excluding the class itself, written on remove_cvref_t of the deduced type so it covers const and reference variants, ideally combined with a constructible_from check so the constructor only participates when the argument can actually build the member. Before C++20 the equivalent is an enable_if on decay_t in a defaulted template parameter. If the set of accepted types is small, the simplest fix of all is to abandon the template and write two ordinary overloads taking const std::string& and std::string&&, which costs a little duplication and removes the whole class of problem."
      },
      {
        question: "Can I forward the same argument twice?",
        answer:
          "Not safely, and the reason is that forwarding is conditional rather than harmless. If the caller passed an rvalue, the first forward produces an rvalue reference and the callee may steal the resources; the second forward then produces another rvalue reference to an object that has already been gutted, so the second callee receives an empty or unspecified value. Nothing warns about it and the code compiles, so the bug shows up as missing data in the second consumer, typically under exactly the conditions that matter - a hot path where the caller passed a temporary. The rule is therefore to use the parameter as a plain lvalue for every use except the last, and to forward only on that final use. When both consumers genuinely need the value, you have three options: copy explicitly for the first and forward to the second, which is honest about the cost; pass a const reference to the first and forward to the second, if the first only observes; or restructure so the value flows through a single consumer. The same rule applies to parameter packs, where forwarding a pack into two calls double-moves every element of it and is if anything easier to write by accident."
      },
      {
        question: "When should I prefer taking a parameter by value over a forwarding reference?",
        answer:
          "Take by value when the function is a sink for exactly one concrete type and the type is cheap to move. A constructor storing a std::string member is the canonical case: taking std::string by value costs one copy for an lvalue argument and one move for an rvalue, both of which are what you would have written by hand, and the signature stays a normal non-template function that appears clearly in the interface, produces readable errors, and does not hijack overload resolution. A forwarding reference is better when you must preserve categories across several arguments of unknown type, which is the factory and emplace case, or when the target's overload set should decide rather than your signature. It is also the only option when the parameter type is genuinely generic. The cost of the forwarding version is real: it must live in a header, it produces a distinct instantiation per argument type, its errors appear inside the template, and it competes aggressively in overload resolution. A useful rule of thumb is that library code that forwards into a construction of an unknown type wants forwarding references, while application code storing a known type wants by value, and const T& remains right for anything that only observes."
      },
      {
        question: "How does auto&& differ from T&& in a template?",
        answer:
          "It does not differ in behaviour at all - auto deduction uses the same rules as template argument deduction, so auto&& is a forwarding reference obeying the same collapsing table. The difference is only in where you can use it and how you name the deduced type. auto&& works for local variables, range-for bindings, generic lambda parameters, and abbreviated function template parameters, none of which have an explicit template parameter to reference. Because there is no T to write, forwarding uses std::forward<decltype(x)>(x), which yields the same type the template form would have deduced. The most common practical use is the range-for loop, where auto&& is the only binding that handles all three cases a range can produce: real references from a normal container, proxy prvalues from vector<bool> or a zip view, and plain prvalues from a transforming view. auto& fails on the last two and auto silently copies, so auto&& is the default worth adopting in generic code. One caution is worth repeating: binding auto&& to a prvalue extends its lifetime, but binding it to a reference returned by a function extends nothing, so auto&& x = get_container().front() dangles exactly as a plain reference would."
      }
    ],
    references: [
      {
        source: "book",
        attribution: "Scott Meyers - Effective Modern C++, Items 24 to 30 (universal references and forwarding)",
        insight: "The deduction rules, the greedy overload problem, and the cases where perfect forwarding fails."
      },
      {
        source: "note",
        attribution: "cppreference - Reference collapsing and std::forward - https://en.cppreference.com/w/cpp/utility/forward",
        insight: "Normative collapsing table and the two forward overloads with their exact signatures."
      },
      {
        source: "video",
        attribution: "Scott Meyers - Universal References in C++11 (Going Native)",
        insight: "The clearest available explanation of why T&& binds to everything and how to constrain it."
      }
    ]
  },
  {
    id: "topic-cpp-move-copy-elision-rvo",
    moduleId: "mod-cpp-move-semantics-and-value-categories",
    title: "Copy Elision, RVO, and NRVO",
    intuition:
      "The cheapest move is the one that never happens. Copy elision lets the compiler construct an object directly in its final destination instead of building it somewhere else and transferring it. Since C++17 this is guaranteed for prvalues, which is why a factory can return a type with no copy or move constructor at all. Named return value optimisation, the case where you return a local variable, remains optional and is easy to defeat accidentally - most often by writing std::move on the return, which is the single most common well-intentioned pessimisation in C++.",
    complexity: {
      time:
        "Elision removes a constructor call and a destructor call per elided object, so returning a container by value costs nothing rather than one move. Where the fallback would have been a copy - a type with no move constructor, or one whose move was suppressed - elision saves an O(n) deep copy and an allocation on every return.",
      space:
        "An elided object needs no separate storage, because the callee constructs into the caller's frame slot passed as a hidden pointer. Without elision, two objects exist simultaneously during the transfer, so peak memory during the return is twice the object's footprint."
    },
    lesson: [
      {
        title: "Guaranteed Elision for Prvalues (C++17)",
        content:
          "C++17 redefined a prvalue as a recipe for initialising an object rather than as a temporary object in its own right. A prvalue is materialised into an actual object only when a glvalue is required, so initialising a variable from a function that returns by value creates exactly one object - the caller's variable - constructed directly by the return statement's expression. No copy or move constructor is involved, and none needs to exist. This is not an optimisation the compiler may apply; it is what the language means, so it happens at every optimisation level including -O0. The practical consequence is that factory functions can return immovable types, that std::lock_guard and std::mutex can now be produced by functions, and that reasoning about how many objects a return creates becomes trivial rather than compiler-dependent.",
        codeExample: `struct Immovable {
    Immovable() = default;
    Immovable(const Immovable&) = delete;
    Immovable(Immovable&&)      = delete;
    int value = 42;
};

Immovable make() { return Immovable{}; }     // legal since C++17
Immovable obj = make();                      // one object, zero transfers
// C++14: ill-formed - the deleted move ctor is required to EXIST
// even though every real compiler would have elided the call.

// Chains of prvalues collapse entirely:
Immovable a = Immovable{Immovable{make()}};  // still exactly one object

// Guaranteed at -O0:
std::vector<int> heavy() { return std::vector<int>(1'000'000); }
auto v = heavy();      // the million-element vector is built in 'v'

// Materialisation happens only when a glvalue is needed:
const Immovable& r = make();   // NOW a temporary object is materialised,
                               // with lifetime extended to r's scope
int n = make().value;          // materialised for the member access`,
        diagram: asciiDiagram(`Where the object is built: with and without elision

  C++14 model (elision PERMITTED)
  ┌────────────── callee frame ──────────────┐  ┌── caller frame ──┐
  │  return Widget{};                        │  │                  │
  │      │                                   │  │                  │
  │      ▼                                   │  │                  │
  │  ┌──────────────┐    move ctor           │  │  ┌────────────┐  │
  │  │  temporary   │ ─────────────────────────▶│  │   obj      │  │
  │  └──────┬───────┘                        │  │  └────────────┘  │
  │         ▼ destructor                     │  │                  │
  └──────────────────────────────────────────┘  └──────────────────┘
     2 objects, 1 move, 1 destructor
     ... which the compiler was ALLOWED but not required to remove,
     and the move constructor still had to be accessible.

  C++17 model (elision GUARANTEED for prvalues)
  ┌────────────── callee frame ──────────────┐  ┌── caller frame ──┐
  │  hidden param: Widget* ret ──────────────┼──┼──┐               │
  │  return Widget{};                        │  │  ▼               │
  │      │                                   │  │  ┌────────────┐  │
  │      └── constructs DIRECTLY through ret ┼──┼─▶│   obj      │  │
  │                                          │  │  └────────────┘  │
  └──────────────────────────────────────────┘  └──────────────────┘
     1 object, 0 moves, 0 extra destructors
     No copy or move constructor need even EXIST.

  This is why a factory can now return std::mutex-like types.`)
      },
      {
        title: "NRVO: Still Optional",
        content:
          "Returning a named local variable is a different case, because a named local genuinely is an object with an address and a scope. Named return value optimisation, in which the compiler allocates that local directly in the caller's return slot, is permitted but never required, so it depends on the compiler and on the shape of your function. All mainstream compilers apply it for the straightforward case of a single named local returned on every path. It is commonly defeated by returning different variables on different paths, by returning a parameter, by returning a member or a subobject, and sometimes by returning from inside a try block. When NRVO does not apply, the language falls back to an implicit move rather than a copy: a return statement naming a local is treated as an rvalue first, so the move constructor is selected without you writing anything.",
        codeExample: `// NRVO applies: one named local, returned on every path.
std::vector<int> good() {
    std::vector<int> v(1000);
    v.push_back(1);
    return v;                 // constructed directly in the caller
}

// NRVO usually defeated: two different locals.
std::vector<int> two_paths(bool flag) {
    std::vector<int> a(10), b(20);
    return flag ? a : b;      // compiler cannot pick one slot in advance
}                             // falls back to an IMPLICIT MOVE, not a copy

// NRVO never applies: parameters live in the caller's frame.
std::vector<int> from_param(std::vector<int> v) {
    v.push_back(1);
    return v;                 // implicit move (C++11+), never elided
}

// NRVO never applies: a member is not a local.
struct Holder {
    std::vector<int> data;
    std::vector<int> take() { return std::move(data); }  // move IS needed here
};

// Verify what your compiler did:
struct Loud {
    Loud()            { std::puts("ctor"); }
    Loud(const Loud&) { std::puts("copy"); }
    Loud(Loud&&)      { std::puts("move"); }
    ~Loud()           { std::puts("dtor"); }
};
Loud named() { Loud l; return l; }
// NRVO:      "ctor dtor"
// no NRVO:   "ctor move dtor dtor"
// Compile with -fno-elide-constructors to see the difference.`
      },
      {
        title: "The Pessimising Move",
        content:
          "Writing return std::move(local) is the most common way to make a return slower. NRVO requires the return expression to be the name of a local variable of the return type; std::move(local) is a cast expression, so the optimisation is disabled and a real move constructor call is emitted where nothing would have been. Worse, if the type has no move constructor - because it declares a destructor, or because it is a legacy copyable type - the fallback is an actual deep copy. Both GCC and Clang warn about this with -Wpessimizing-move, and it is worth enabling. The correct rule is short: return the local by name and trust the language, because if NRVO does not apply the implicit move already happens automatically.",
        codeExample: `// Pessimising: blocks NRVO, forces a move.
std::vector<int> bad() {
    std::vector<int> v(1'000'000);
    return std::move(v);          // -Wpessimizing-move fires here
}

// Correct: NRVO constructs v directly in the caller.
std::vector<int> good() {
    std::vector<int> v(1'000'000);
    return v;
}

// Worse case: no move constructor at all.
struct Legacy { std::vector<int> v; ~Legacy() { flush(); } };  // move suppressed
Legacy worse() {
    Legacy l;
    return std::move(l);          // a genuine DEEP COPY of v
}

// Where std::move on return is CORRECT - the expression is not a local:
struct Holder {
    std::vector<int> data;
    std::vector<int> release() { return std::move(data); }   // member: needed
};
std::vector<int> from_param(std::vector<int> p) {
    return p;                     // implicit move already applies (C++11+)
}

// The one genuine exception: returning a DERIVED local as a BASE.
std::unique_ptr<Base> factory() {
    auto d = std::make_unique<Derived>();
    return d;        // C++20: implicit move applies even across the conversion
                     // pre-C++20 some compilers needed std::move(d)
}`
      },
      {
        title: "Implicit Move on Return",
        content:
          "When a return statement names a local variable or a by-value parameter of the function, overload resolution is performed twice: first treating the expression as an rvalue, and if no viable candidate is found, again as an lvalue. This is why returning a local std::vector moves rather than copies even without std::move, and why returning a move-only type such as unique_ptr from a local variable simply works. C++20 broadened the rule considerably through paper P1825, extending it to returns whose type differs from the local's type - such as returning a unique_ptr<Derived> local as a unique_ptr<Base> - and to throw expressions naming a local. Knowing this rule is what makes it safe to follow the advice never to write std::move on a return: the language already does it where it is needed and only where it is beneficial.",
        codeExample: `// Move-only type, no std::move written:
std::unique_ptr<Widget> make() {
    auto p = std::make_unique<Widget>();
    configure(*p);
    return p;                 // implicit move: 'p' names a local
}

// Also applies to by-value parameters:
std::string decorate(std::string s) {
    s += "!";
    return s;                 // implicit move, never a copy
}

// Does NOT apply to members or to references:
struct S {
    std::string field;
    std::string get()  { return field; }              // COPY - not a local
    std::string take() { return std::move(field); }   // explicit move needed
};
std::string from_ref(std::string& r) {
    return r;                 // COPY - r is a reference, not a local object
}

// C++20 (P1825) extended it across conversions:
std::unique_ptr<Base> factory() {
    std::unique_ptr<Derived> d = std::make_unique<Derived>();
    return d;                 // C++20: implicit move; C++17: error on some
}                             // compilers without std::move(d)

// And to throw:
void f() {
    std::string msg = build();
    throw std::runtime_error{msg};   // C++20 treats msg as an rvalue
}`
      },
      {
        title: "Reading and Verifying What Happened",
        content:
          "Because elision changes how many constructor calls occur, the reliable way to know what your compiler did is to instrument the type or read the assembly. A struct whose constructors print gives an immediate answer, and compiling with -fno-elide-constructors on GCC or Clang shows what the code would do without any elision, which is useful for confirming that a construct depends on it. At the ABI level, returning a non-trivial class by value is implemented by passing a hidden pointer to the caller's storage as an extra argument, so elision is simply the callee constructing through that pointer instead of into a local and then copying. Recognising that hidden parameter in disassembly is the definitive check. It also explains why elision cannot apply to a parameter: the parameter already occupies a different address than the return slot.",
        codeExample: `struct Probe {
    static inline int ctor = 0, copy = 0, move = 0, dtor = 0;
    Probe()             { ++ctor; }
    Probe(const Probe&) { ++copy; }
    Probe(Probe&&) noexcept { ++move; }
    ~Probe()            { ++dtor; }
};

Probe prvalue_return() { return Probe{}; }     // guaranteed elision
Probe named_return()   { Probe p; return p; }  // NRVO (likely)
Probe moved_return()   { Probe p; return std::move(p); }  // never elided

int main() {
    { Probe a = prvalue_return(); }
    // ctor 1, copy 0, move 0     - guaranteed, even at -O0

    Probe::ctor = Probe::move = 0;
    { Probe b = named_return(); }
    // ctor 1, move 0 with NRVO;  ctor 1, move 1 without

    Probe::ctor = Probe::move = 0;
    { Probe c = moved_return(); }
    // ctor 1, move 1  - ALWAYS, elision is impossible
}

// Compare builds:
//   g++ -std=c++17 probe.cpp
//   g++ -std=c++17 -fno-elide-constructors probe.cpp   // shows the fallback
//
// ABI view: 'Probe f()' compiles to roughly
//   void f(Probe* __hidden_ret);
// and elision means the callee constructs through __hidden_ret directly.`,
        diagram: asciiDiagram(`Decision tree: what happens at a return statement?

  return <expr>;
        │
        ▼
  ┌────────────────────────────────────────────┐
  │ Is <expr> a prvalue?                       │
  │ e.g. Widget{}, f(), Widget(a, b)           │
  └───────────────┬────────────────────────────┘
            yes   │   no
        ┌─────────┘   └──────────────┐
        ▼                            ▼
  ┌──────────────────────┐   ┌────────────────────────────────────┐
  │ GUARANTEED ELISION   │   │ Does <expr> NAME a local variable  │
  │ constructed directly │   │ or a by-value parameter?           │
  │ in the caller's slot │   └────────────┬───────────────────────┘
  │ 0 ctor calls beyond  │          yes   │   no
  │ the one you wrote    │      ┌─────────┘   └──────────┐
  │ no move ctor needed  │      ▼                        ▼
  └──────────────────────┘  ┌────────────────────┐  ┌─────────────────┐
                            │ NRVO possible?     │  │ member, ref, or │
                            │ single local, all  │  │ cast expression │
                            │ paths, right type  │  │                 │
                            └────┬──────────┬────┘  │ NO elision      │
                             yes │       no │       │ NO implicit move│
                                 ▼          ▼       │        │        │
                        ┌──────────────┐ ┌────────────────┐  ▼        │
                        │ NRVO         │ │ IMPLICIT MOVE  │ COPY      │
                        │ 0 transfers  │ │ move ctor runs │ (unless   │
                        │ (optional!)  │ │ automatically  │ you wrote │
                        └──────────────┘ └────────────────┘ std::move)│
                                                            └─────────┘

  Writing std::move(local) forces the rightmost branch: it turns a
  name into a cast expression, so NRVO is off and a move always runs.`)
      }
    ],
    examples: [
      {
        title: "Returning a mutex-owning type",
        input: "A function that builds and returns a type holding a std::mutex, which is neither copyable nor movable, compiled as C++14 then C++17.",
        output: "C++14 rejects the function outright; C++17 accepts it and constructs the object in the caller's storage.",
        explanation:
          "Step 1: std::mutex deletes both its copy and move constructors, so any class containing one by value is itself immovable.\nStep 2: Under C++14 a return by value conceptually initialises a temporary from which the caller's object is initialised, so a move or copy constructor must be accessible even when the compiler elides the call.\nStep 3: No such constructor exists, so the program is ill-formed regardless of optimisation settings, which historically forced such types to be created only by the caller or heap-allocated behind a unique_ptr.\nStep 4: C++17's redefinition of prvalues removes the conceptual temporary entirely, so the return statement's expression initialises the caller's object directly and no transfer constructor is consulted.\nStep 5: The practical effect is that factory functions became usable for the whole family of synchronisation and RAII types, which is one of the most immediately useful changes C++17 made to everyday code."
      },
      {
        title: "std::move defeating NRVO on a large vector",
        input: "std::vector<Row> load() { std::vector<Row> rows; fill(rows); return std::move(rows); } with a million rows.",
        output: "A real move constructor call on every return, plus a compiler warning under -Wpessimizing-move.",
        explanation:
          "Step 1: NRVO requires the returned expression to be the name of a local variable of the function's return type, so the compiler can allocate that local directly in the caller's return slot.\nStep 2: std::move(rows) is a function call expression rather than a name, so the requirement fails and the optimisation is not attempted.\nStep 3: The compiler must therefore construct rows in the callee's frame and then move-construct the caller's object from it, adding a constructor call, three pointer assignments, and an extra destructor.\nStep 4: For a vector the move is cheap, so the measurable loss is small, but the same pattern applied to a type whose move is suppressed by a user destructor produces a full deep copy of a million rows.\nStep 5: Removing the std::move restores NRVO, and even if a particular compiler declines to apply it the language's implicit-move rule already treats the returned local as an rvalue, so nothing is lost by writing the plain name."
      },
      {
        title: "Returning a member versus a local",
        input: "struct Holder { std::vector<int> data; std::vector<int> get() { return data; } };",
        output: "A full copy on every call, where the same code returning a local would have been free.",
        explanation:
          "Step 1: The implicit-move rule applies only to expressions naming a local variable or a by-value parameter of the returning function, because only those are about to be destroyed.\nStep 2: data is a member of an object that outlives the call, so moving from it would silently damage the caller's Holder, and the language correctly refuses.\nStep 3: NRVO likewise cannot apply, since the member has a fixed address inside the Holder and cannot be relocated into the caller's return slot.\nStep 4: The result is a genuine deep copy that many readers do not expect, having internalised the rule that returning by value is free.\nStep 5: If the Holder is genuinely finished with the data, an explicit std::move(data) is correct and is one of the few legitimate places to write std::move on a return - and the honest alternative is a rvalue-qualified overload, std::vector<int> get() &&, so that only expiring Holders give up their data."
      }
    ],
    tips: [
      "Return locals by name and never write std::move on them; the implicit-move rule already covers every case where a move is beneficial.",
      "Enable -Wpessimizing-move and -Wredundant-move so the compiler flags the two most common misuses of std::move on returns.",
      "Prefer returning a prvalue directly, such as return Widget{args}, when there is no need for a named local, since that elision is guaranteed rather than optional."
    ],
    tricks: [
      "A struct whose constructors print, compiled with and without -fno-elide-constructors, answers any elision question in seconds.",
      "If a return statement names a member, a reference, or a parameter, no elision is possible - only locals qualify, which is the quickest way to spot a hidden copy.",
      "Returning std::move(member) is legitimate, and an rvalue-ref-qualified member function makes that intent explicit at the call site."
    ],
    memoryAids: [
      "Prvalue elision is the language, NRVO is a favour - one is guaranteed, the other is optional.",
      "Only locals qualify: members, references, and parameters are never elided.",
      "std::move on a return is a brake, not an accelerator."
    ],
    interviewPatterns: [
      "'How many objects are created by returning a vector by value?' The expected answer distinguishes guaranteed prvalue elision from optional NRVO and mentions the implicit move fallback.",
      "'Why can C++17 return a type with a deleted move constructor?' They are testing whether you understand prvalues as initialisers rather than temporaries.",
      "Frequency and companies: common at Jane Street, Bloomberg, Nvidia, and Microsoft, usually as a follow-up to a move-semantics question."
    ],
    practiceProblems: [
      "Why can NRVO not be guaranteed the way prvalue elision is? Answer: a named local is a real object that may be referenced, may have its address taken, and may be one of several candidates on different return paths, so the compiler cannot always know at the point of declaration which local should occupy the return slot; a prvalue has no identity at all, so there is nothing to place anywhere else.",
      "Does copy elision change observable behaviour? Answer: yes, and it is one of the few optimisations permitted to do so - side effects in the elided copy or move constructor and in the corresponding destructor simply do not happen, which is why instrumented types print different output with and without elision and why constructors should not be relied on for observable bookkeeping.",
      "When is std::move on a return statement correct? Answer: when the expression is not a local variable of the return type - returning a member, returning a local of a different type in pre-C++20 modes, or deliberately moving out of a parameter you took by reference - because in those cases the implicit-move rule does not apply and no elision was possible anyway."
    ],
    faq: [
      {
        question: "What is the difference between guaranteed elision and NRVO?",
        answer:
          "They apply to different things and carry different strength. Guaranteed elision, introduced by C++17, applies to prvalues: expressions that describe how to initialise an object without denoting an object of their own, such as a constructor call or a function returning by value. Because such an expression is now defined as an initialiser rather than as a temporary, there is nothing to copy from, and the caller's object is constructed directly. It is not an optimisation and does not depend on flags, so it applies identically at -O0 and -O3, and no copy or move constructor need exist. NRVO applies to a return statement naming a local variable, which genuinely is an object with an address, a scope, and possibly other references to it. The compiler may place that local in the caller's return slot so no transfer occurs, but it is permitted rather than required, and it is defeated by several ordinary code shapes - multiple candidate locals, returning a parameter, and sometimes returning from within a try block. The practical consequence is that a prvalue return is reliably free, while a named return is usually free and falls back to a move when it is not, which is still cheap for well-behaved types."
      },
      {
        question: "Why is std::move on a return statement harmful?",
        answer:
          "Because it converts a case where nothing happens into a case where something happens. NRVO requires the return expression to be the name of a local of the return type, so the compiler can allocate that local directly in the caller's storage; std::move(local) is a cast expression rather than a name, which disqualifies the return from the optimisation entirely. The compiler then constructs the local in the callee's frame and move-constructs the caller's object from it, adding a constructor call, a destructor call, and whatever the move itself costs. For a vector that is a few pointer assignments and hardly matters, but for a type whose move operations were suppressed - most commonly by a user-declared destructor - the fallback is a full deep copy, which can be arbitrarily expensive. The reason the advice is so unequivocal is that the std::move buys nothing even in the cases where NRVO does not apply, because the language's implicit-move rule already treats a returned local as an rvalue and selects the move constructor without any help. GCC and Clang both diagnose the pattern under -Wpessimizing-move, so the simplest protection is to turn that warning on and treat it as an error."
      },
      {
        question: "Does copy elision violate the as-if rule?",
        answer:
          "Yes, and it is one of a very small number of places where the standard explicitly permits observable behaviour to change. Normally an optimisation must preserve everything the program can observe, but copy and move constructors and their matching destructors may be omitted even when they have side effects, so a constructor that prints, increments a counter, registers the object somewhere, or logs an allocation will simply not run. This is why an instrumented type gives different output with and without -fno-elide-constructors and why the same program can print different counts under two compilers when NRVO is the mechanism in play. The committee accepted this because the alternative - forbidding elision unless the constructors are provably side-effect-free - would have discarded an optimisation that matters enormously for value semantics, and because a copy constructor with observable side effects is a design smell in the first place. The practical guidance follows directly: never put logic in copy or move constructors that the program's correctness depends on, such as instance counting or registration in a global table, because the language does not promise those constructors will run. If you need such bookkeeping, put it in the ordinary constructors and the destructor, which are not elidable."
      },
      {
        question: "How do I know whether my compiler applied NRVO?",
        answer:
          "Instrument the type or read the assembly, since there is no portable query. The quickest method is a small struct whose default, copy, and move constructors and destructor each print or increment a static counter, returned from the function shape you care about; with NRVO you will see one construction and one destruction, and without it an extra move and an extra destruction appear. Compiling the same file with -fno-elide-constructors on GCC or Clang gives you the unoptimised baseline to compare against, which is useful for confirming that a particular construct depends on elision rather than merely benefiting from it. For a definitive answer, look at the disassembly: returning a non-trivial class by value is implemented in every mainstream ABI by passing a hidden pointer to the caller's storage as an additional argument, so NRVO shows up as the callee constructing directly through that pointer with no second object and no transfer. That ABI detail also explains several of the rules that otherwise look arbitrary - a parameter cannot be elided because it already lives at a different address, and a member cannot be elided because it lives inside an object that outlives the call. MSVC's behaviour differs slightly from GCC and Clang in some multi-path cases, which is another reason to measure rather than assume."
      },
      {
        question: "What did C++20 change about implicit moves on return?",
        answer:
          "Paper P1825 substantially widened the rule. In C++11 through C++17, a return statement naming a local variable or a by-value parameter performed overload resolution first as an rvalue, but only when the returned expression's type matched the function's return type exactly, and only for return statements. That narrow scope produced surprising failures: returning a local unique_ptr<Derived> from a function declared to return unique_ptr<Base> did not qualify, because the types differ, so the code selected the deleted copy constructor and failed to compile unless you wrote std::move by hand. C++20 removed the same-type requirement, so implicit move now applies across conversions, including derived-to-base and conversions to a different type entirely through a converting constructor. It also extended the rule to throw expressions, so throwing a local string or exception object moves rather than copies, and to a few related contexts. The practical effect for everyday code is that the remaining legitimate uses of std::move on a return have shrunk almost to nothing: returning a member, and returning through a reference parameter. Everything else the language now handles, which makes the blanket advice against std::move on returns simpler to follow than it was."
      },
      {
        question: "Should I still write move constructors if elision handles returns?",
        answer:
          "Absolutely, because returns are a small fraction of where moves matter. Elision covers the path from a function's return statement into the caller's variable, and that is genuinely important, but the overwhelming majority of value transfers in real code happen elsewhere. Vector growth moves every element into the new buffer, and declines to do so unless the move is noexcept. Sorting and other permuting algorithms move elements repeatedly. Inserting into any container moves the argument into place. Swapping is implemented as three moves. Passing a temporary into a constructor that stores it by value moves it into the member. Assigning from a temporary moves rather than copies. None of those are returns and none of them are elided, so a type without move operations pays a deep copy in each of them. There is also a second-order effect worth noting: elision at the return only helps if the object can be built in place, and a great deal of code builds a value, passes it through several layers, and finally stores it, where each hop is a move rather than an elision. The correct summary is that elision removes the cost of returning by value, which makes value semantics practical, and move semantics removes the cost of everything else."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - Copy elision - https://en.cppreference.com/w/cpp/language/copy_elision",
        insight: "Exact list of when elision is guaranteed, when it is permitted, and the implicit-move rules."
      },
      {
        source: "paper",
        attribution: "P0135 Guaranteed copy elision through simplified value categories, and P1825 Merged wording for implicit move",
        insight: "The reasoning behind redefining prvalues and the C++20 widening of implicit move on return."
      },
      {
        source: "blog",
        attribution: "Arthur O'Dwyer - The Return of the Pessimizing Move",
        insight: "Concrete measurements of what std::move on a return costs and why the warning exists."
      }
    ]
  },
  {
    id: "topic-cpp-move-parameter-design",
    moduleId: "mod-cpp-move-semantics-and-value-categories",
    title: "Move-Aware API Design: Sinks, Views, and Overloads",
    intuition:
      "Once moves exist, parameter and return types become design decisions with measurable costs. The question to ask of every parameter is whether the function observes the argument, stores it, or modifies the caller's object - and each answer has a canonical signature. Getting this right eliminates whole categories of hidden copies without any std::move at the call site, and getting it wrong produces code that looks modern and still deep-copies on every call. The same reasoning extends to return types, ref-qualified members, and when to reach for string_view or span instead of a value.",
    complexity: {
      time:
        "Pass by const reference is one pointer regardless of size. Pass by value costs one copy for an lvalue argument and one move for an rvalue, so for a std::string that is an allocation plus a memcpy versus three pointer assignments. Providing separate const& and && overloads eliminates the move in the lvalue case, saving a few tens of nanoseconds per call at the cost of duplicated bodies.",
      space:
        "A by-value sink parameter materialises one extra object for the duration of the call, which for a container means one extra allocation when the argument is an lvalue. A view type such as string_view or span is two words and allocates nothing, but it owns nothing, so its referent must outlive it."
    },
    lesson: [
      {
        title: "Three Questions, Three Signatures",
        content:
          "Every parameter answers one of three questions. If the function only reads the argument and does not keep it, take const T& - one pointer, no copy, binds to every value category, and it is the right default. If the function stores a copy of the argument, it is a sink, and taking T by value lets the caller decide: an lvalue is copied once and an rvalue is moved once, both of which are the minimum. If the function modifies the caller's object, take T& and make that visible at the call site. Two anti-patterns follow from getting this wrong: taking by value when you only read, which copies for no reason, and taking const T& in a sink and then copying inside the body, which forces a copy even when the caller passed a temporary.",
        codeExample: `class Employee {
    std::string name_;
    std::vector<Skill> skills_;
public:
    // SINK: stores a copy -> take by value, then move into the member.
    explicit Employee(std::string name) : name_{std::move(name)} {}
    //                ^^^^^^^^^^^ lvalue arg: 1 copy. rvalue arg: 1 move.

    // OBSERVE: reads only -> const reference.
    bool matches(const std::string& pattern) const;

    // MODIFY: changes the caller's object -> non-const reference.
    void drain_into(std::vector<Skill>& out);
};

std::string owned = "alice";
Employee a{owned};              // copy into the parameter, move into name_
Employee b{"bob"};              // prvalue: constructed in place, then moved
Employee c{std::move(owned)};   // move into the parameter, move into name_

// ANTI-PATTERN 1: by value when only reading.
void log_bad(std::string msg);          // always copies
void log_good(const std::string& msg);  // never copies

// ANTI-PATTERN 2: const& in a sink.
class Bad {
    std::string name_;
public:
    explicit Bad(const std::string& n) : name_{n} {}   // ALWAYS copies,
};                                                     // even for temporaries
Bad x{std::string{"tmp"}};   // the temporary is copied, then destroyed`,
        diagram: asciiDiagram(`Parameter cost by signature and argument category

  Function stores the argument. What does each signature cost?

  ┌────────────────────┬──────────────────┬──────────────────────┐
  │ signature          │ lvalue argument  │ rvalue argument      │
  ├────────────────────┼──────────────────┼──────────────────────┤
  │ f(const T& x)      │ 1 copy           │ 1 copy      ← wasteful│
  │   : m_{x}          │ (inside body)    │ (inside body)        │
  ├────────────────────┼──────────────────┼──────────────────────┤
  │ f(T x)             │ 1 copy + 1 move  │ 1 move + 1 move      │
  │   : m_{move(x)}    │      ← good      │      ← good          │
  ├────────────────────┼──────────────────┼──────────────────────┤
  │ f(const T&)  and   │ 1 copy           │ 1 move               │
  │ f(T&&)  overloaded │      ← optimal   │      ← optimal       │
  │                    │ but 2 bodies, 2^n for n params          │
  ├────────────────────┼──────────────────┼──────────────────────┤
  │ template f(T&& x)  │ 1 copy           │ 1 move               │
  │   : m_{fwd<T>(x)}  │      ← optimal   │      ← optimal       │
  │                    │ but header-only, greedy, poor errors    │
  └────────────────────┴──────────────────┴──────────────────────┘

  Decision path
  ─────────────
        does the function KEEP the argument?
                    │
          ┌─────────┴──────────┐
         no                   yes
          │                    │
          ▼                    ▼
    const T&            is the extra move acceptable?
    (or a view:              │
     string_view,   ┌────────┴────────┐
     span)         yes               no
                    │                 │
                    ▼                 ▼
                  T by value    const T& + T&& overloads
                  (default)     (hot paths only)`)
      },
      {
        title: "By Value Plus Move: The Default Sink",
        content:
          "For a constructor or setter that stores its argument, taking the parameter by value and moving it into the member is the recommended default. It costs one extra move compared with hand-written const& and && overloads, which for any type whose move is a few pointer assignments is negligible, and in exchange you write one function instead of two - and one function instead of two to the power n when there are several such parameters. It also keeps the signature a plain non-template, so it appears in the interface, produces readable errors, and does not compete in overload resolution the way a forwarding reference does. The important detail is that you must actually std::move the parameter into the member; taking by value and then copying gives you the worst of both worlds.",
        codeExample: `class Message {
    std::string          topic_;
    std::vector<uint8_t> payload_;
    std::string          trace_id_;
public:
    Message(std::string topic, std::vector<uint8_t> payload, std::string trace)
        : topic_{std::move(topic)},
          payload_{std::move(payload)},
          trace_id_{std::move(trace)} {}
    // ONE constructor. The overload-pair alternative would need 2^3 = 8.

    void set_topic(std::string t) { topic_ = std::move(t); }
};

// Callers get the right cost automatically:
std::string t = "orders";
Message m1{t, load(), make_id()};              // topic copied, rest moved
Message m2{std::move(t), load(), make_id()};   // all moved

// The mistake that wastes the whole idiom:
class Wrong {
    std::string s_;
public:
    explicit Wrong(std::string s) : s_{s} {}   // COPIES the parameter!
};                                             // rvalue arg: move + COPY

// When the extra move is NOT acceptable - a hot path with a costly move:
class Hot {
    std::array<char, 4096> buf_;               // move == 4 KB memcpy
public:
    explicit Hot(const std::array<char, 4096>& b) : buf_{b} {}   // 1 copy
    explicit Hot(std::array<char, 4096>&& b) : buf_{std::move(b)} {}
};
// For a trivially copyable 4 KB array the by-value idiom would memcpy twice.

// Setter that can reuse existing capacity beats by-value for repeated calls:
void assign(const std::string& s) { s_ = s; }   // reuses s_'s buffer
// vs. by value, which always constructs a fresh parameter object`
      },
      {
        title: "Views: string_view and span",
        content:
          "When a function only reads a contiguous sequence, a non-owning view is better than any reference to a concrete container. std::string_view accepts a std::string, a string literal, a char array, or a substring without allocating, which removes the classic hidden allocation where passing a literal to a const std::string& parameter constructs a temporary string. std::span does the same for arrays, vectors, and C-style pointer-length pairs. Both are two words, trivially copyable, and should be passed by value. The single rule that governs their safety is that they own nothing, so the referent must outlive the view: storing a string_view built from a temporary, or returning one that points into a local, is a dangling read with no diagnostic.",
        codeExample: `// Before: every literal call allocates.
bool starts_with_bad(const std::string& s, const std::string& prefix);
starts_with_bad(name, "user_");     // constructs a temporary std::string

// After: no allocation for any of these.
bool starts_with(std::string_view s, std::string_view prefix) {
    return s.size() >= prefix.size() &&
           s.compare(0, prefix.size(), prefix) == 0;
}
starts_with(name, "user_");         // literal -> view, zero allocations
starts_with(std::string{"x"}, "x"); // fine: the temporary outlives the call

// span replaces (pointer, length) and const vector&:
int sum(std::span<const int> xs) {
    return std::accumulate(xs.begin(), xs.end(), 0);
}
std::vector<int> v{1,2,3};
int arr[]{4,5,6};
sum(v);                             // vector
sum(arr);                           // C array
sum({v.data(), 2});                 // explicit subrange

// The dangling trap - no warning from most compilers:
std::string_view bad() {
    std::string local = build();
    return local;                   // DANGLES: local dies at return
}
std::string_view sv = std::string{"temp"};   // DANGLES immediately

// Views are for PARAMETERS. Members should own:
struct Config {
    std::string name;               // owns
    // std::string_view name;       // would dangle the moment the source moves
};

// string_view is not null-terminated - never pass .data() to a C API:
void c_api(const char*);
// c_api(sv.data());                // may read past the end
c_api(std::string{sv}.c_str());     // materialise when a C string is needed`
      },
      {
        title: "Ref-Qualified Members and Return Types",
        content:
          "Member functions can be qualified with & or && to distinguish being called on an lvalue from being called on an expiring object, which lets a getter return a reference in the normal case and move out its data when the object is about to die. This is how you make obj.take() cheap without making every call dangerous. On return types, the rules are short: return by value for anything you computed, never return const by value because it disables moves at every call site, and return a reference only when the referent provably outlives the call. Returning a reference to a member is fine for a getter on a long-lived object, but returning any reference or view into a local is a dangling read, and returning auto&& from a wrapper needs the same care.",
        codeExample: `class Buffer {
    std::vector<uint8_t> data_;
public:
    // Called on an lvalue: hand out a reference, no copy.
    const std::vector<uint8_t>& bytes() const &  { return data_; }

    // Called on an rvalue: the object is expiring, so move out.
    std::vector<uint8_t>        bytes()       && { return std::move(data_); }
};

Buffer b = load();
const auto& ref = b.bytes();            // & overload: no copy, b intact
auto owned      = load().bytes();       // && overload: data moved out

// Return-type rules:
std::string good();                     // by value - elided or moved
// const std::string bad();             // NEVER: const prvalue kills moves
std::string& member_ref();              // only if the referent outlives us

// The dangling-getter trap:
class Bad {
    std::vector<int> v_;
public:
    std::vector<int>& get() { return v_; }
};
auto& r = Bad{}.get();                  // dangles: the temporary Bad is gone
// Ref-qualifying prevents it:
class Good {
    std::vector<int> v_;
public:
    std::vector<int>& get() &  { return v_; }
    std::vector<int>  get() && { return std::move(v_); }
};
// auto& r2 = Good{}.get();             // now selects the && overload, which
                                        // returns by value -> no dangle

// Chained builders benefit from the same distinction:
class Query {
    std::string sql_;
public:
    Query&& where(std::string c) && { sql_ += c; return std::move(*this); }
    std::string build() && { return std::move(sql_); }
};
auto s = Query{}.where("a=1").build();  // no copies anywhere`
      },
      {
        title: "Costing a Design",
        content:
          "The way to settle a parameter argument is to count constructions for both argument categories, which is what the design table does. A sink taking const& costs one copy for both lvalues and rvalues, so it wastes the caller's temporary. By value costs a copy plus a move for lvalues and two moves for rvalues. Overload pairs cost exactly one copy or one move, at the price of duplicated bodies growing as two to the power of the parameter count. A forwarding reference matches the overload pair's cost with one body, at the price of being header-only, greedy in overload resolution, and prone to obscure errors. The right default is by value for sinks and const& for observers, escalating to overloads only where profiling shows the extra move matters, which in practice means large trivially copyable types and very hot loops.",
        codeExample: `struct Counted {
    static inline int copies = 0, moves = 0;
    std::vector<int> v = std::vector<int>(1000);
    Counted() = default;
    Counted(const Counted& o) : v{o.v}            { ++copies; }
    Counted(Counted&& o) noexcept : v{std::move(o.v)} { ++moves; }
};

struct SinkByValue { Counted m; explicit SinkByValue(Counted c) : m{std::move(c)} {} };
struct SinkByRef   { Counted m; explicit SinkByRef(const Counted& c) : m{c} {} };
struct SinkOverload {
    Counted m;
    explicit SinkOverload(const Counted& c) : m{c} {}
    explicit SinkOverload(Counted&& c) : m{std::move(c)} {}
};

Counted lvalue;
// SinkByValue{lvalue}          -> copies 1, moves 1
// SinkByValue{Counted{}}       -> copies 0, moves 2
// SinkByRef{lvalue}            -> copies 1, moves 0   (optimal for lvalues)
// SinkByRef{Counted{}}         -> copies 1, moves 0   (WASTES the temporary)
// SinkOverload{lvalue}         -> copies 1, moves 0   (optimal)
// SinkOverload{Counted{}}      -> copies 0, moves 1   (optimal)

// Conclusion: by-value costs exactly ONE extra move versus the optimal
// overload pair. For pointer-sized moves that is noise; for a 4 KB
// trivially copyable member it is a second memcpy and worth the overloads.`,
        diagram: asciiDiagram(`Lifetime rules for views, and where they break

  SAFE: view as a parameter
  ┌──────────────────────────────────────────────────────────┐
  │ caller                          callee                   │
  │ std::string s = load();                                  │
  │      │  owns the buffer                                  │
  │      ▼                                                   │
  │ ┌──────────┐        parse(s)      ┌──────────────────┐   │
  │ │ s.buffer │◀─────────────────────┤ string_view      │   │
  │ └──────────┘   ptr + len only     │  ptr ──┐ len     │   │
  │      ▲                            └────────┼─────────┘   │
  │      └── outlives the call ────────────────┘             │
  └──────────────────────────────────────────────────────────┘

  DANGLING: view outliving its owner
  ┌──────────────────────────────────────────────────────────┐
  │ std::string_view sv = std::string{"temp"};               │
  │                            │                             │
  │                            ▼                             │
  │              ┌──────────────────────┐                    │
  │              │ temporary std::string│  destroyed at the  │
  │              │  buffer ─────────────┼─ end of this full  │
  │              └──────────────────────┘  expression        │
  │                            ▲                             │
  │              ┌─────────────┼────────┐                    │
  │              │ sv: ptr ────┘  len   │  ← now points at   │
  │              └──────────────────────┘    freed memory    │
  │              no warning, no crash, wrong data            │
  └──────────────────────────────────────────────────────────┘

  Three places a view goes wrong
  ├── stored as a member   → dangles when the source moves or dies
  ├── returned from a fn   → dangles if built from a local
  └── passed to a C API    → data() is NOT null-terminated

  Rule: views are parameters and locals. Members own.`)
      }
    ],
    examples: [
      {
        title: "A const& sink wasting every temporary",
        input: "class Logger { std::string prefix_; explicit Logger(const std::string& p) : prefix_{p} {} }; constructed with Logger{std::string{\"svc: \"}}.",
        output: "The temporary string is copied into prefix_ and then destroyed; the move the caller offered is thrown away.",
        explanation:
          "Step 1: The parameter is a const lvalue reference, so it binds happily to the temporary but carries no permission to modify it.\nStep 2: Initialising prefix_ from that const reference can only select std::string's copy constructor, which allocates a new buffer and copies the characters.\nStep 3: The temporary is then destroyed, freeing the buffer that could have been transferred, so the program performs one allocation, one memcpy, and one deallocation that were all avoidable.\nStep 4: Changing the parameter to std::string by value and initialising with std::move gives the temporary's buffer directly to prefix_, and an lvalue argument still costs exactly one copy as before.\nStep 5: The general lesson is that const& is correct for observation and wrong for storage, because the const is precisely what forbids the transfer the caller was offering."
      },
      {
        title: "Hidden allocation from a string literal",
        input: "bool has_prefix(const std::string& s, const std::string& p) called in a loop as has_prefix(line, \"ERROR:\").",
        output: "A std::string is constructed and destroyed on every iteration purely to bind the literal to the parameter.",
        explanation:
          "Step 1: The literal is a const char array, which does not match const std::string&, so an implicit conversion constructs a temporary std::string.\nStep 2: That construction allocates unless the literal is short enough for the small-buffer optimisation, and it always copies the characters and computes the length.\nStep 3: The temporary is destroyed at the end of the full expression, so the work repeats on every loop iteration with no caching possible.\nStep 4: Changing both parameters to std::string_view removes the conversion entirely, because a view can be constructed from a literal in constant time by storing the pointer and the length.\nStep 5: The same change also makes the function accept substrings, char arrays, and any contiguous character range without allocating, which is why string_view is the correct default for read-only string parameters in modern code."
      },
      {
        title: "Ref-qualified getter avoiding a copy and a dangle",
        input: "A Buffer class exposing bytes() as a plain const-reference getter, used both as b.bytes() and as load().bytes().",
        output: "The first call is fine; the second returns a reference into a temporary that is destroyed at the end of the expression.",
        explanation:
          "Step 1: A non-ref-qualified member function can be called on both lvalues and rvalues, so the same getter serves an object that persists and one that is about to die.\nStep 2: Returning a reference is correct for the persistent case and dangling for the temporary case, because the Buffer is destroyed at the end of the full expression while the reference lives on.\nStep 3: Splitting the getter into an &-qualified overload returning a const reference and an &&-qualified overload returning by value resolves both cases correctly at compile time.\nStep 4: The && overload can additionally std::move the member into the return value, since the object is expiring, so extracting data from a temporary becomes cheaper than copying rather than merely safer.\nStep 5: This is the standard technique for builder chains and factory results, and it is why std::optional and several other library types provide ref-qualified value accessors."
      }
    ],
    tips: [
      "Default to const T& for parameters you only read and T by value for parameters you store, then move the by-value parameter into the member.",
      "Use std::string_view and std::span for read-only sequence parameters to remove hidden temporaries, and pass them by value since they are two words.",
      "Never return const by value; it makes every result a const prvalue and disables move construction at every call site."
    ],
    tricks: [
      "Ref-qualified member functions let a getter return a reference for lvalues and move out its data for rvalues, which makes builder chains free.",
      "A by-value sink parameter costs exactly one extra move versus a hand-written overload pair, so escalate to overloads only for large trivially copyable types.",
      "If a setter is called repeatedly in a loop, a const& parameter assigning into an existing member can reuse capacity where a by-value parameter always builds a fresh object."
    ],
    memoryAids: [
      "Observe with const&, store by value, modify with &. Three questions, three signatures.",
      "Views are parameters, never members - they point, they do not own.",
      "const& in a sink throws away the caller's temporary; the const is exactly what blocks the move."
    ],
    interviewPatterns: [
      "'How should this constructor take its string parameter?' They want by value plus std::move, with the reasoning about lvalue and rvalue costs.",
      "'When would you use string_view and what is the risk?' The expected answer covers removing temporaries and the non-owning lifetime trap.",
      "Frequency and companies: routine in design-oriented C++ interviews at Bloomberg, Meta, Nvidia, and trading firms; often follows a move-semantics question as the applied half."
    ],
    practiceProblems: [
      "Why does the by-value sink cost one extra move rather than being optimal? Answer: the argument is first used to initialise the parameter, which is a copy for an lvalue or a move for an rvalue, and then the parameter is moved into the member, so there are always two steps; an overload pair collapses them into one by constructing the member directly from the argument, at the cost of writing two bodies.",
      "When is std::string_view the wrong choice for a parameter? Answer: when the function stores the argument beyond its own lifetime, when it needs a null-terminated buffer for a C API since a view's data is not guaranteed terminated, and when the caller would have to materialise a string anyway, in which case taking std::string by value lets the caller move rather than forcing a later copy.",
      "Why do ref-qualified overloads help a builder chain? Answer: because each step is invoked on a temporary, so an &&-qualified method can move the accumulated state into its own return value rather than copying it, and the final build() can move the result out entirely, making a chain of n steps cost zero copies instead of n."
    ],
    faq: [
      {
        question: "Is passing by value always better than const reference now?",
        answer:
          "No, and the claim is one of the more persistent overcorrections after C++11. By value is better only when the function stores the argument, because then the copy has to happen somewhere and putting it in the parameter lets the caller substitute a move. When the function merely reads the argument, by value is strictly worse: it copies unconditionally where a const reference copies never, and for a container that means an allocation per call for no benefit. There are also sink cases where by value loses. A setter called repeatedly can assign into an existing member and reuse its capacity, which a by-value parameter cannot do because it always constructs a fresh object first. A large trivially copyable member such as a fixed 4 KB array has a move that is really a memcpy, so the by-value idiom performs two memcpys where an overload pair performs one. And a type that is expensive to move for any reason inherits the same problem. The workable rule is to ask whether the function keeps the argument: if yes, take by value and move; if no, take const& or a view; and escalate to explicit const& and && overloads only where measurement justifies the duplicated bodies."
      },
      {
        question: "What are the real dangers of std::string_view?",
        answer:
          "All of them stem from the fact that it owns nothing, so its validity depends entirely on something else staying alive and unmoved. The most common failure is storing one: a string_view member initialised from a constructor parameter dangles the moment the caller's string is destroyed, reallocated, or moved, and none of those events produce a diagnostic. The second is returning one from a function that built the underlying string locally, which dangles immediately. The third is binding a view to a temporary in a way that survives the full expression, as in a string_view variable initialised from a std::string returned by value, which is dangling by the next statement even though the same expression as a function argument would have been fine. A separate and quieter problem is null termination: a string_view is a pointer and a length with no guarantee of a terminator, so passing its data() to a C API can read past the end, and the fix is to materialise a std::string when a C string is genuinely required. The discipline that avoids all of these is to treat string_view as a parameter type and an intermediate, never as a member and rarely as a return type, which mirrors the guidance for span and for iterators generally."
      },
      {
        question: "When are separate const& and && overloads worth writing?",
        answer:
          "When the extra move that the by-value idiom costs is measurable, which happens in three recognisable situations. The first is a type whose move is not cheap - a large trivially copyable aggregate, a type with inline storage such as a fixed-size array or a small-buffer-optimised container, or a type whose move constructor does real work. For these the by-value parameter performs a full second copy of the data rather than a few pointer assignments. The second is an extremely hot path where even a pointer-sized move matters, which is rare but real in inner loops of trading and rendering code. The third is a case where the function can exploit the rvalue-ness in a way the by-value form cannot, such as an assignment that reuses the target's existing capacity for lvalues while stealing the buffer for rvalues. Against those benefits, weigh the cost honestly: two bodies to keep in sync, and combinatorial growth when a function has several such parameters, since n parameters need two to the power n overloads to cover every combination. That growth is the strongest argument for the by-value default, and it is why most codebases should reach for overloads only after profiling points at a specific function."
      },
      {
        question: "Why should a function never return const by value?",
        answer:
          "Because it makes the result a const prvalue, and a const prvalue cannot bind to a non-const rvalue reference, so move construction is impossible at every call site. Every caller that initialises a variable from the result, inserts it into a container, or passes it to a sink gets a copy where a move was available, and there is no diagnostic because the copy constructor is perfectly viable. The practice originated as a way to prevent nonsense such as assigning to a returned temporary, which mattered for a few operator overloads in the pre-C++11 world, but the cost was invisible then because moves did not exist. Since C++11 the trade is entirely one-sided, and since C++17 guaranteed elision even the copy-construction from a returned prvalue would often have been free had the const not blocked the alternative. The same reasoning applies to a const local that you intend to move from: std::move on a const object produces a const xvalue and silently selects the copy constructor, so the const wins and the move disappears. The general principle is that const on a value you are handing away is a promise nobody needs and a prohibition on the one optimisation that matters."
      },
      {
        question: "How do ref-qualified member functions fit into API design?",
        answer:
          "They let a member function know whether the object it is called on is going to survive the expression, which is exactly the information needed to decide between handing out a reference and handing out ownership. The canonical use is a getter: the &-qualified overload returns a const reference, which is free and safe because the object persists, while the &&-qualified overload returns by value and moves the member out, because the object is expiring and its data would otherwise be destroyed. That single split turns a getter that was either wasteful or dangerous into one that is optimal in both cases, and it also removes the classic dangling-reference bug where someone writes auto& r = make_thing().field(). The second major use is builder chains, where each step is invoked on a temporary: qualifying the chaining methods with && and returning std::move(*this) lets the whole chain accumulate state without copying, and a final &&-qualified build() moves the result out. A third use is enforcement rather than optimisation - qualifying a method with & prevents it from being called on a temporary at all, which is how you stop a caller from starting an operation on an object that will not exist by the time it completes. The cost is that once you ref-qualify one overload of a name you must qualify all of them, which is a small discipline for a large gain."
      },
      {
        question: "Does taking parameters by value hurt ABI or compile times?",
        answer:
          "Marginally, and much less than the alternatives people reach for. A by-value parameter of a non-trivially-copyable type is passed by an implicit reference to a caller-constructed temporary in every mainstream ABI, so the calling convention cost is essentially the same as a reference, and the extra work is the construction and destruction of the parameter object rather than any copying at the call boundary. Compile times are unaffected because the function remains a plain non-template that can live in a source file, which is a genuine advantage over the forwarding-reference alternative: a template taking Args&&... must be visible in every translation unit that calls it, instantiates separately per argument type combination, and produces errors inside its body rather than at the call site. That last point matters more than it sounds, since a constrained forwarding constructor is also required to avoid hijacking the copy constructor, which is more machinery than most sinks deserve. The one real ABI consideration is that changing a parameter from const& to by value changes the function's mangled name, so it is a breaking change for a shipped shared library, which is a reason to get the choice right early rather than a reason to avoid it."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "C++ Core Guidelines - F.15 through F.21 and F.42 through F.46 (parameter and return passing)",
        insight: "Normative table of when to use value, const reference, rvalue reference, and views for parameters."
      },
      {
        source: "book",
        attribution: "Scott Meyers - Effective Modern C++, Item 41 (pass by value for copyable parameters that are cheap to move)",
        insight: "The precise cost accounting for by-value sinks versus overload pairs, including the cases where it loses."
      },
      {
        source: "video",
        attribution: "Herb Sutter - Back to the Basics: Essentials of Modern C++ Style (CppCon)",
        insight: "Practical guidance on sink parameters, string_view lifetimes, and avoiding hidden copies."
      }
    ]
  }
];
