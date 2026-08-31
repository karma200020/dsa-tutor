import { Topic } from "../syllabus";

// Module: mod-cpp-pointers - "C++: Pointers and Manual Memory Management" (5 topics).
// Coverage: pointers vs references, new/delete and array forms, dangling
// pointers and leaks, alignment and object representation, and placement new
// with manual lifetime control.
function asciiDiagram(art: string): string {
  return `<pre style="margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#a5f3fc;white-space:pre;text-align:left;overflow-x:auto;">${art}</pre>`;
}

export const cppPointersTopics: Topic[] = [
  {
    id: "topic-cpp-pointers-pointers-vs-references",
    moduleId: "mod-cpp-pointers",
    title: "Pointers versus References: Semantics, const, and API Design",
    intuition:
      "A pointer is an object holding an address; a reference is an alias for an existing object. That one-sentence difference generates every practical distinction - a pointer can be null, reassigned, and stored in a container, while a reference must bind at initialisation, can never rebind, and has no independent identity. Interviews use this pair to test whether you choose interfaces deliberately: a reference parameter says 'this argument must exist', a pointer parameter says 'this argument is optional', and getting that wrong is how null checks get scattered through a codebase.",
    complexity: {
      time:
        "Dereferencing a pointer and using a reference compile to the same single load; references are implemented as pointers wherever the compiler cannot eliminate the indirection entirely. The genuine cost of both is the potential cache miss on the pointed-to object plus, in optimised code, the aliasing constraints that force the compiler to reload values it would otherwise keep in registers.",
      space:
        "A pointer on a 64-bit platform occupies 8 bytes and is a real object with an address. A reference is not required to occupy storage at all - a reference parameter typically becomes a register-passed address, and a reference bound to a local is usually optimised away entirely - but a reference data member does occupy pointer-sized storage inside the class."
    },
    lesson: [
      {
        title: "The Structural Differences That Matter",
        content:
          "A pointer is a first-class object: it has its own address, can be null, can be reseated to point at something else, can be arithmetic-manipulated, and can live in an array or a container. A reference is a name for an object that already exists: it must be initialised when declared, always refers to that same object for its entire life, cannot be null in a well-formed program, and cannot be stored in a standard container without a wrapper such as std::reference_wrapper. Assignment through a reference assigns to the referent rather than rebinding the reference, which is the single most common source of confusion for people arriving from languages where variables are references.",
        codeExample: `int a = 1, b = 2;

int* p = &a;      // p holds the address of a
p = &b;           // REBINDS: p now points at b
*p = 99;          // writes 99 into b
p = nullptr;      // legal: pointers may be null

int& r = a;       // r is another name for a
// int& r2;       // ERROR: a reference must be initialised
r = b;            // NOT a rebind - this ASSIGNS b's value into a
                  // a is now 2; r still refers to a forever

std::vector<int*> ok;          // fine
// std::vector<int&> bad;      // ERROR: references are not objects
std::vector<std::reference_wrapper<int>> workaround;   // the escape hatch`,
        diagram: asciiDiagram(`Two levels of indirection, drawn honestly

  int a = 1;  int b = 2;

  memory                      pointer p                reference r
  ┌──────────┐                ┌──────────┐             ┌──────────┐
  │ a │  1   │◀───────────────┤ 0x7ffe10 │             │ (no      │
  │   │      │                │  8 bytes │             │  separate│
  │ 0x7ffe10 │                │  has its │             │  storage │
  ├──────────┤                │  own     │             │  required│
  │ b │  2   │                │  address │             │  - r IS a│
  │ 0x7ffe14 │                └──────────┘             └──────────┘
  └──────────┘                      │                        │
                                    │  p = &b  → rebinds     │  r = b → writes
                                    ▼                        ▼  into a; r can
                              now points at b                   never rebind

  Legal states of p : &a, &b, nullptr, one-past-the-end, indeterminate
  Legal states of r : exactly one - the object it was initialised with`)
      },
      {
        title: "Choosing a Parameter Type Is an API Decision",
        content:
          "The parameter type is documentation the compiler enforces. Take const T& for a large input the function only reads, T by value for small or trivially copyable inputs and for anything you intend to keep a copy of, T& for an object the function must modify and that must exist, and T* only when the argument is genuinely optional or when you need to reseat it. Choosing a pointer where a reference would do forces every caller and every reviewer to wonder whether null is meaningful, and forces the callee to either check or silently assume. The C++ Core Guidelines codify this as: a raw pointer parameter means 'may be null, non-owning', and if you want to state non-null explicitly, use gsl::not_null or simply take a reference.",
        codeExample: `// Read-only, potentially large  -> const reference
double area(const Polygon& p);

// Small, cheap to copy          -> by value
bool is_even(int n);

// Must modify, must exist       -> reference
void normalise(Vector3& v);

// Genuinely optional            -> pointer, or std::optional for values
void render(const Scene& s, const Camera* override_cam = nullptr);
void configure(std::optional<int> retries);

// Transfers ownership           -> smart pointer by value
void take(std::unique_ptr<Widget> w);

// Anti-pattern: pointer with an implicit non-null precondition
void bad(Widget* w) { w->tick(); }   // caller must guess; UB if null passed`
      },
      {
        title: "const With Pointers: Reading Declarations Correctly",
        content:
          "The rule is to read declarations right to left, treating const as binding to whatever is immediately to its left, or to the right if nothing is to its left. So const int* p is a pointer to a const int - the pointee cannot be modified through p, but p can be reseated. int* const p is a const pointer to a mutable int - p can never be reseated, but *p can be assigned. const int* const p is both. References have no equivalent second axis because they can never be reseated anyway, which is why int& const is not even valid syntax; a reference is inherently const in its binding. This matters in interviews because const correctness is one of the cheapest signals of C++ maturity.",
        codeExample: `int x = 1, y = 2;

const int* p1 = &x;        // pointer to const int
// *p1 = 5;                // ERROR: cannot write through p1
p1 = &y;                   // OK: reseat allowed

int* const p2 = &x;        // const pointer to int
*p2 = 5;                   // OK: write allowed
// p2 = &y;                // ERROR: cannot reseat

const int* const p3 = &x;  // both fixed

// int const* is the SAME as const int* - read right to left.
// Members: const on a member function means "does not modify *this".
struct Buf {
    char* data_;
    std::size_t n_;
    // const method: cannot change members, but CAN write through data_
    char* begin() const { return data_; }   // shallow const - a classic trap
};`
      },
      {
        title: "Dangling, Aliasing, and What the Optimiser Assumes",
        content:
          "Both pointers and references can dangle, so a reference is not a safety guarantee - it merely removes the null case. Returning a reference to a local, storing a reference member bound to a temporary, or holding a reference into a vector across a push_back all produce the same undefined behaviour a raw pointer would. Separately, pointers introduce an optimisation concern: the compiler must assume two pointers of compatible type may alias, so it cannot keep a value in a register across a store through an unrelated pointer. Strict aliasing lets it assume pointers to unrelated types do not alias, which is why type-punning through a reinterpret_cast is undefined behaviour and std::bit_cast or memcpy is the correct tool.",
        codeExample: `// Dangling reference: identical hazard to a dangling pointer
const std::string& bad() {
    std::string local = "hi";
    return local;                  // UB: frame destroyed on return
}

// Iterator and reference invalidation
std::vector<int> v{1, 2, 3};
int& first = v[0];
v.push_back(4);                    // may reallocate
// first is now DANGLING even though it is a reference

// Aliasing: the compiler must reload *b after every write to *a
void slow(int* a, int* b) {
    for (int i = 0; i < 1000; ++i) *a += *b;   // *b reloaded each iteration
}
void fast(int* a, const int* __restrict b) {   // compiler-specific hint
    for (int i = 0; i < 1000; ++i) *a += *b;
}

// Type punning: reinterpret_cast is UB; use bit_cast (C++20) or memcpy
float f = 1.5f;
// int bits = *reinterpret_cast<int*>(&f);     // UB: strict aliasing
int bits = std::bit_cast<int>(f);              // well-defined`,
        diagram: asciiDiagram(`Reference invalidation across a reallocation

  BEFORE push_back                    AFTER push_back (capacity exceeded)

  v.data() ──▶ ┌───┬───┬───┐          v.data() ──▶ ┌───┬───┬───┬───┬───┬───┐
               │ 1 │ 2 │ 3 │                       │ 1 │ 2 │ 3 │ 4 │   │   │
               └───┴───┴───┘                       └───┴───┴───┴───┴───┴───┘
                 ▲   size=3                          new buffer, new address
                 │   cap =3
  int& first ────┘                    int& first ────▶ ┌───┬───┬───┐
                                                       │ 1 │ 2 │ 3 │  FREED
                                                       └───┴───┴───┘
                                                            ▲
                                                            └── dangling

  A reference is NOT safer than a pointer here - it removes the null
  case, not the lifetime case. Rule: never hold a reference or pointer
  into a container across any operation that can reallocate.`)
      },
      {
        title: "Returning References Safely",
        content:
          "Returning a reference is correct exactly when the referent outlives the call: a member function returning a reference to a member, an accessor returning a reference into a container the object owns, or an operator[] on a container. It is wrong whenever the referent is a local, a temporary materialised inside the function, or a parameter taken by value. A subtler correct pattern is ref-qualified member functions, where an overload marked && returns by value because the object is about to be destroyed, while the & overload returns a reference. C++ also allows returning const T& from a function taking const T& - safe only if the returned reference is always one of the arguments, which is exactly why std::min and std::max on temporaries are a documented dangling hazard.",
        codeExample: `class Registry {
    std::map<std::string, int> m_;
public:
    // Safe: the referent is owned by *this, which outlives the call.
    int& operator[](const std::string& k) { return m_[k]; }
    const std::map<std::string,int>& all() const& { return m_; }
    // Ref-qualified: on an rvalue *this, return by value instead.
    std::map<std::string,int> all() && { return std::move(m_); }
};

// The std::max trap:
const int& m = std::max(1, 2);   // binds to a temporary parameter -> DANGLES
int  safe   = std::max(1, 2);    // copy the result instead

// Also dangling, and easy to miss in a range-for:
// for (auto& kv : Registry{}.all()) { ... }   // C++20 and earlier: UB`
      }
    ],
    examples: [
      {
        title: "Assignment through a reference does not rebind",
        input: "int a = 1, b = 2; int& r = a; r = b; then print a, b, and r.",
        output: "a is 2, b is 2, r is 2 - and r still refers to a.",
        explanation:
          "Step 1: int& r = a binds r permanently to the object a; there is no later syntax that can change that binding.\nStep 2: The statement r = b is therefore not a rebind but an assignment expression whose left operand is the object a.\nStep 3: It copies b's value into a, so a becomes 2 and reading r reflects that because r names a.\nStep 4: If the intent was to make r refer to b instead, no reference can do that - a pointer is required, since only pointers are reassignable.\nStep 5: This is precisely why references model aliases rather than variables, and why containers of references need std::reference_wrapper, which stores a rebindable pointer internally."
      },
      {
        title: "A pointer parameter that should have been a reference",
        input:
          "void update(Config* c) { c->retries = 3; } called from twenty sites, one of which passes a possibly-null pointer.",
        output: "Nineteen redundant null checks or one production crash, depending on discipline.",
        explanation:
          "Step 1: The pointer parameter advertises that null is a valid argument, so every caller and reviewer must consider it.\nStep 2: The body dereferences unconditionally, so the advertised contract and the real precondition disagree.\nStep 3: Callers respond either by adding defensive checks everywhere, which is noise, or by assuming non-null, which is a latent crash.\nStep 4: Changing the signature to void update(Config& c) makes the precondition part of the type, so the compiler rejects a null literal and the one caller with a genuine pointer must dereference explicitly at the single place where the check belongs.\nStep 5: Where the argument really is optional, keep the pointer and make the null branch explicit in the body, so the signature and the implementation finally agree."
      },
      {
        title: "Reference invalidated by container growth",
        input:
          "std::vector<Job> q; Job& current = q.front(); then a background handler calls q.push_back(...) and current.status is read.",
        output: "Reads freed memory; AddressSanitizer reports heap-use-after-free.",
        explanation:
          "Step 1: push_back may exceed capacity, in which case the vector allocates a new buffer, moves the elements, and frees the old buffer.\nStep 2: current was bound to an element inside the old buffer, and nothing updates it, so it now points into freed memory.\nStep 3: Because a reference cannot be null, there is no cheap runtime check that would catch this - the bug is a pure lifetime bug.\nStep 4: Reserving capacity up front avoids reallocation but does not make the pattern safe, because erase and insert can still invalidate.\nStep 5: The robust fix is to store an index rather than a reference, or to use a container with stable references such as std::deque for push_back or std::list, and to re-acquire the reference after any mutating call."
      }
    ],
    tips: [
      "Choose the parameter type to state the contract: reference means required, pointer means optional, value means the callee keeps a copy.",
      "Read pointer declarations right to left; const binds to what is immediately left of it, which resolves every const int* versus int* const question.",
      "Never hold a reference or pointer into a container across an operation that can reallocate - store an index or re-acquire it."
    ],
    tricks: [
      "std::reference_wrapper lets references live in containers and be rebound, which is how std::ref makes std::thread and std::bind pass by reference.",
      "Mark accessors that return references with & and && ref-qualifiers so calling them on a temporary returns by value instead of dangling.",
      "Build with -fsanitize=address to catch dangling references; no compiler warning reliably detects a reference that outlives its referent."
    ],
    memoryAids: [
      "A pointer is a variable that holds an address; a reference is a second name for one object. Names cannot be reassigned.",
      "Reference equals non-null pointer that cannot be reseated - but it is not a lifetime guarantee.",
      "Right to left for const: const int* is pointer-to-const, int* const is const-pointer."
    ],
    interviewPatterns: [
      "'When would you use a pointer parameter instead of a reference?' The expected answer is optionality, reseating, and ownership transfer via smart pointers.",
      "'Can a reference be null?' The nuanced answer is no in a well-formed program, but binding one to *ptr with a null ptr is already undefined behaviour, so a null reference is a symptom of an earlier bug.",
      "Frequency and companies: an opening question in almost every C++ screen, including Amazon, Microsoft, Bloomberg, and embedded roles."
    ],
    practiceProblems: [
      "Why is std::vector<int&> ill-formed while std::vector<std::reference_wrapper<int>> compiles? Answer: containers require element types that are objects supporting assignment and address-of, and references are neither assignable in the rebinding sense nor guaranteed to have storage; reference_wrapper is a real object holding a pointer, so it satisfies those requirements while behaving like a reference through its implicit conversion.",
      "Explain why const int& m = std::max(a, b); can dangle. Answer: std::max takes and returns const references, so when called with prvalue arguments the parameters bind to temporaries that die at the end of the full expression, and the returned reference refers to one of those temporaries; lifetime extension does not apply because the binding passed through a function parameter.",
      "A const member function returns char* to internal data. Is that const-correct? Answer: it compiles because const applies only to the members themselves, and the pointer value is unchanged, but it is a design error - it hands out a mutable view of the object's state from a const interface, so return const char* and add a non-const overload for mutable access."
    ],
    faq: [
      {
        question: "Are references implemented as pointers, and does it matter?",
        answer:
          "In practice yes, whenever the compiler cannot eliminate them: a reference parameter is passed as an address in a register, and a reference data member occupies pointer-sized storage inside the class. But the standard deliberately does not require any storage, which lets the optimiser treat a reference bound to a local as a pure alias and keep the value in a register with no indirection at all. The distinction matters in three concrete places. First, sizeof on a reference gives the size of the referent, not of a pointer, because the reference is not an object with its own size. Second, a class containing a reference member is neither default-constructible nor copy-assignable by default, because the reference must be initialised and can never be reseated - a frequent surprise when a class suddenly stops working in a vector. Third, taking the address of a reference gives the address of the referent, so there is no way to observe the reference itself. Treat references as a compile-time aliasing mechanism whose runtime representation is an implementation detail."
      },
      {
        question: "Can a reference ever be null, and what about int& r = *p with p null?",
        answer:
          "In a well-formed program no reference is null, and that guarantee is exactly what makes a reference parameter a stronger contract than a pointer parameter. The construct int& r = *ptr; with a null ptr does not create a null reference; it invokes undefined behaviour at the point of the dereference, before any reference exists. What actually happens in a typical implementation is that no load occurs - binding a reference just takes the address - so the program continues with a reference that appears to hold address zero and crashes later at the first real use, which makes the bug hard to localise. That is why the correct diagnosis of a so-called null reference is always that some earlier code dereferenced a null pointer. In defensive code the practical rule is that if a value can legitimately be absent, express that in the type using a pointer, std::optional, or a variant, and never manufacture a reference from a pointer you have not checked."
      },
      {
        question: "When should a function return a reference rather than a value?",
        answer:
          "Return a reference only when the referent is guaranteed to outlive the call and the caller genuinely benefits from aliasing rather than a copy. The canonical cases are accessors returning a reference to a member, container operator[] and at, and stream operators returning the stream so calls can chain. Returning a reference to anything local, to a temporary created inside the function, or to a by-value parameter is always undefined behaviour, and returning a reference from a function whose arguments are themselves references is only safe if the result is always one of those arguments - which is the loophole that makes std::max on temporaries dangle. Since C++11 there is much less reason to return references for performance, because returning by value benefits from copy elision and move semantics: a function returning a std::string by value typically incurs no copy at all thanks to guaranteed copy elision for prvalues and NRVO for named locals. The modern default is therefore to return by value unless you are deliberately exposing an aliasable member, and to add & and && ref-qualifiers when you do so that rvalue objects return a value instead."
      },
      {
        question: "What is strict aliasing and why does it make reinterpret_cast dangerous?",
        answer:
          "Strict aliasing is the rule that an object's stored value may only be accessed through an lvalue of its own type, a cv-qualified version of it, a signed or unsigned variant, or a character type. It exists to let the optimiser assume that a write through an int* cannot change a value read through a float*, which enables it to keep values in registers and reorder loads and stores across pointer writes. Type-punning with reinterpret_cast breaks the assumption: reading a float's bits through an int* is undefined behaviour, and the usual symptom is that the code works at -O0 and produces stale or reordered values at -O2, which makes it look like a compiler bug when it is not. The three sanctioned alternatives are std::memcpy into an object of the target type, which every mainstream compiler recognises and compiles to nothing, std::bit_cast in C++20, which is the clean modern spelling and works in constant expressions, and reading through a char, unsigned char, or std::byte lvalue, which is always permitted. Unions are a legal punning mechanism in C but only in C++ if you read the member last written, so they are not a general workaround."
      },
      {
        question: "How do rvalue references fit into the pointer-versus-reference picture?",
        answer:
          "An rvalue reference, written T&&, is still a reference - an alias with no rebinding - but its binding rules are the opposite of a const lvalue reference: it binds to prvalues and xvalues, that is to temporaries and to things explicitly cast with std::move, and it will not bind to a named lvalue. Its purpose is not to change how you access the object but to convey information about the object's expected remaining lifetime, so the callee can steal resources instead of copying them. The most counterintuitive consequence is that a named rvalue reference parameter is itself an lvalue inside the function body, because it has a name and you can take its address; that is why a move constructor's body must write std::move(other.member) rather than relying on the parameter's declared type. In an overload set, T&& in a deduced context becomes a forwarding reference with entirely different rules, collapsing to T& for lvalue arguments, which is the mechanism behind perfect forwarding. For API design purposes the summary is that const T& means 'I will read it', T& means 'I will modify it and you keep it', and T&& means 'I will consume it and you should not rely on it afterwards'."
      },
      {
        question: "Should I ever use raw pointers in modern C++?",
        answer:
          "Yes, but only as non-owning observers. The C++ Core Guidelines draw the line clearly: a raw pointer or reference may be used to refer to an object whose lifetime is managed elsewhere, while ownership must be expressed with std::unique_ptr, std::shared_ptr, a container, or a value. Under that rule raw pointers remain the right tool for optional parameters, for iterating raw memory in low-level code, for interoperating with C APIs, for back-pointers in a tree or graph where a shared_ptr would create a cycle, and for observer patterns where the observer must not extend the subject's life. What should essentially disappear from ordinary code is the owning raw pointer - the one you must remember to delete - because it makes exception safety manual, obscures ownership at every call site, and is the source of both leaks and double frees. A useful review heuristic is to ask of every raw pointer 'who deletes this?'; if the answer is anything other than 'nobody, it is a view', the pointer should be a smart pointer or a container."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "C++ Core Guidelines - F.60, R.30, I.11 (parameter passing and ownership) - https://isocpp.github.io/CppCoreGuidelines/",
        insight: "The canonical rules for when to pass by value, reference, or raw pointer, and what a raw pointer must never mean."
      },
      {
        source: "book",
        attribution: "Scott Meyers - Effective C++, 3rd ed., Item 3 (Use const whenever possible)",
        insight: "The right-to-left reading rule and the difference between logical and bitwise const in member functions."
      },
      {
        source: "note",
        attribution: "cppreference - Reference initialization - https://en.cppreference.com/w/cpp/language/reference_initialization",
        insight: "Exact binding rules for lvalue, const lvalue, and rvalue references, including every lifetime-extension case."
      }
    ]
  },
  {
    id: "topic-cpp-pointers-new-delete-and-arrays",
    moduleId: "mod-cpp-pointers",
    title: "new, delete, and the Array Forms: What the Expressions Really Do",
    intuition:
      "A new-expression is two operations welded together - allocate raw storage, then construct an object in it - and a delete-expression is their exact mirror. Once you see the seam, the rules stop being arbitrary: new[] must record the element count somewhere so delete[] can run the right number of destructors, which is why mixing new with delete[] is undefined behaviour rather than merely untidy. Modern C++ answers all of this by telling you to never write these expressions in application code, but you must still be able to explain them, because every container and smart pointer is built on them.",
    complexity: {
      time:
        "operator new typically costs 50 to 200 nanoseconds, dominated by the allocator's free-list or size-class search, plus an occasional kernel call when the heap must grow. Construction adds the constructor body per element, so new T[n] is O(n) constructor calls, and delete[] is O(n) destructor calls plus one deallocation. Allocating in a loop is therefore an O(n) allocator round trip where a single sized allocation would be one.",
      space:
        "Every heap block carries allocator metadata, commonly 8 to 16 bytes, and is rounded up to a size class, so many tiny allocations waste a large fraction of their footprint. For new T[n] with a non-trivially-destructible T the implementation also stores the element count in a cookie immediately before the returned pointer, which is why the array form's pointer is not the start of the block."
    },
    lesson: [
      {
        title: "Allocation and Construction Are Separate Steps",
        content:
          "The expression new T(args) calls operator new(sizeof(T)) to obtain suitably aligned raw storage, then constructs a T in that storage, then yields a T*. If the constructor throws, the language automatically calls the matching operator delete to release the storage, so a new-expression never leaks on constructor failure. The delete expression reverses this: it calls the destructor, then calls operator delete on the storage. Because operator new and operator delete are ordinary replaceable functions, you can override them globally or per class to install a pool allocator, add instrumentation, or enforce placement in a particular memory region - which is exactly what game engines and embedded systems do.",
        codeExample: `struct T { T(int); ~T(); };

// new T(5) is conceptually:
void* raw = ::operator new(sizeof(T));      // 1. allocate
try {
    T* p = new (raw) T(5);                  // 2. construct (placement new)
} catch (...) {
    ::operator delete(raw);                 // automatic on ctor failure
    throw;
}

// delete p is conceptually:
p->~T();                                    // 1. destroy
::operator delete(p);                       // 2. deallocate

// Class-specific overloads let a type control its own allocation:
struct Pooled {
    static void* operator new(std::size_t n)  { return pool().alloc(n); }
    static void  operator delete(void* p, std::size_t) { pool().free(p); }
};`,
        diagram: asciiDiagram(`new / delete, and the two functions underneath

     new T(args)                          delete p
         │                                    │
         ▼                                    ▼
  ┌──────────────────┐              ┌──────────────────┐
  │ operator new(n)  │              │ ~T() on *p       │  destructor
  │ → raw storage    │              │                  │
  └────────┬─────────┘              └────────┬─────────┘
           │                                 │
           ▼                                 ▼
  ┌──────────────────┐              ┌──────────────────┐
  │ construct T      │              │ operator delete  │
  │ in that storage  │              │ → free storage   │
  └────────┬─────────┘              └──────────────────┘
           │
     ctor throws?
           │
           ▼
  operator delete called automatically → no leak from a failed new

  Replaceable at three scopes:
  ├── global ::operator new / delete          (whole program)
  ├── class-static T::operator new / delete   (that type only)
  └── placement forms new (ptr) T             (no allocation at all)`)
      },
      {
        title: "Why new[] and delete[] Must Be Paired",
        content:
          "For an array of a type with a non-trivial destructor, delete[] has to know how many destructors to run. Implementations store the count in a cookie immediately before the memory the user sees, so the pointer returned by new T[n] is offset from the true start of the allocation. If you call plain delete on that pointer, you free an address the allocator never handed out and you skip all but the first destructor, which is undefined behaviour in the most literal sense: heap corruption. The reverse mismatch, delete[] on a pointer from new, reads a cookie that was never written and destroys an arbitrary number of objects. There is no diagnostic; the crash appears later in unrelated code.",
        codeExample: `struct S { ~S(); };

S* a = new S[10];
// delete a;      // UB: wrong deallocation address, 9 destructors skipped
delete[] a;       // correct

int* p = new int(5);
// delete[] p;    // UB: reads a cookie that was never written
delete p;         // correct

// Arrays of trivially destructible types often have no cookie, which is
// why the mistake sometimes "works" - that is luck, not correctness.

// The modern answer: never write these at all.
auto arr = std::make_unique<S[]>(10);   // unique_ptr<S[]> calls delete[]
std::vector<S> vec(10);                 // and this is usually better still`
      },
      {
        title: "Failure Modes: bad_alloc, nothrow, and new_handler",
        content:
          "By default operator new throws std::bad_alloc when it cannot obtain storage, so new never returns null and checking the result is dead code. Before throwing, it calls the installed new_handler in a loop, which gives a program a chance to release cached memory and retry; if no handler is installed it throws immediately. The nothrow overload, new (std::nothrow) T, returns null instead of throwing, which is occasionally useful in code that cannot use exceptions. Two practical caveats matter: on Linux with overcommit enabled, an allocation may succeed and the process may later be killed by the OOM killer when it touches the pages, so bad_alloc is not a reliable memory-pressure signal; and an allocation for an absurd size fails deterministically, which is why length errors surface as std::length_error from containers rather than bad_alloc.",
        codeExample: `#include <new>

// Default: throws, never returns null.
try {
    auto* big = new int[1'000'000'000'000ull];
} catch (const std::bad_alloc& e) {
    // handle or rethrow
}

// nothrow form: returns null.
int* p = new (std::nothrow) int[100];
if (!p) { /* handle */ }
::operator delete[](p, std::nothrow);

// A new_handler gets a chance to free memory and let the retry succeed.
void release_caches() {
    if (!trim_caches()) std::set_new_handler(nullptr);  // give up -> bad_alloc
}
int main() { std::set_new_handler(&release_caches); }`
      },
      {
        title: "Why Application Code Should Not Write new",
        content:
          "Every raw new creates an obligation to delete exactly once on every path, including exceptional ones, and the compiler will not check it. Two independent new expressions inside one function call are the classic leak: f(new A, new B) may allocate A, allocate B, then have B's constructor throw, leaving A unreachable, because the order of evaluation of arguments was unspecified before C++17 and is merely indeterminately sequenced after it. std::make_unique and std::make_shared remove the window entirely by wrapping each allocation in an owner before anything else can throw. Containers go further and remove the allocation from your code altogether. The rule of thumb is that new belongs inside the implementation of an ownership type, and nowhere else.",
        codeExample: `void sink(std::unique_ptr<A>, std::unique_ptr<B>);

// Leak-prone even in C++17: A may be allocated, then B's ctor throws.
sink(std::unique_ptr<A>(new A), std::unique_ptr<B>(new B));

// Safe: each allocation is owned before the other begins.
sink(std::make_unique<A>(), std::make_unique<B>());

// Not just leaks - exception safety on every path:
void bad() {
    Widget* w = new Widget;
    may_throw();          // leaks w
    delete w;
}
void good() {
    auto w = std::make_unique<Widget>();
    may_throw();          // w is released during unwinding
}`,
        diagram: asciiDiagram(`Why make_unique exists: the unowned window

  sink(unique_ptr<A>(new A), unique_ptr<B>(new B));

  time ──────────────────────────────────────────────▶
   │        │              │              │
   ▼        ▼              ▼              ▼
  new A   new B      unique_ptr<B>   unique_ptr<A>
   │        │          wraps B         wraps A
   │        │
   │        └── if B's constructor THROWS here …
   │
   └── … the A allocation is owned by nobody ──▶ LEAK

  ┌───────────────────────────────────────────────┐
  │ UNOWNED WINDOW: raw pointer exists, no owner  │
  └───────────────────────────────────────────────┘

  sink(make_unique<A>(), make_unique<B>());

  new A ──▶ owned immediately ──▶ new B ──▶ owned immediately
  │                                 │
  └── window length: zero           └── if this throws, A is destroyed
                                        by unwinding. No leak possible.`)
      },
      {
        title: "Sized Deallocation, Alignment, and the Overload Zoo",
        content:
          "C++14 added sized deallocation - operator delete(void*, size_t) - because allocators can free faster when told the size, and the compiler passes it automatically when the static type is known. C++17 added aligned overloads taking std::align_val_t so that over-aligned types, such as a struct declared alignas(64) to avoid false sharing, allocate correctly; before that, new on an over-aligned type was silently under-aligned. If you replace operator new you must replace the whole family consistently - throwing, nothrow, array, sized, and aligned - or the compiler will mix your allocation with the default deallocation and corrupt the heap. This is the practical reason to prefer a custom allocator or a polymorphic memory resource over replacing global operator new.",
        codeExample: `struct alignas(64) CacheLine { std::atomic<int> counter; };

// C++17: this correctly uses the aligned operator new overload.
auto* c = new CacheLine;      // 64-byte aligned
delete c;                     // aligned operator delete

// Replacing the family - all of these must agree:
void* operator new(std::size_t);
void* operator new(std::size_t, std::align_val_t);
void* operator new(std::size_t, const std::nothrow_t&) noexcept;
void* operator new[](std::size_t);
void  operator delete(void*) noexcept;
void  operator delete(void*, std::size_t) noexcept;              // C++14
void  operator delete(void*, std::align_val_t) noexcept;         // C++17
void  operator delete[](void*) noexcept;
// Missing one of these means some frees go to the default implementation.

// Usually better: leave global new alone and scope the customisation.
std::pmr::unsynchronized_pool_resource pool;
std::pmr::vector<int> v{&pool};`
      }
    ],
    examples: [
      {
        title: "delete on a new[] pointer",
        input: "Widget* ws = new Widget[100]; ... delete ws; where Widget has a destructor that closes a file.",
        output: "99 files stay open and the heap is corrupted; the crash appears in an unrelated later allocation.",
        explanation:
          "Step 1: Because Widget has a non-trivial destructor, the implementation stored an element-count cookie before the returned pointer.\nStep 2: delete calls exactly one destructor, so 99 Widget destructors never run and their file handles leak.\nStep 3: delete then calls operator delete with the user-visible pointer, which is past the cookie and is not an address the allocator ever returned.\nStep 4: The allocator interprets the bytes at that address as its own block header, corrupting its free-list metadata.\nStep 5: The program continues until the next allocation walks the damaged list and crashes somewhere entirely innocent - which is why the correct fix is to never write the pair at all and use std::vector<Widget> or std::make_unique<Widget[]>."
      },
      {
        title: "A leak that only happens when an exception is thrown",
        input:
          "Connection* c = new Connection(host); c->authenticate(); use(c); delete c; where authenticate throws on bad credentials.",
        output: "One Connection leaked per failed authentication; the process grows under attack traffic.",
        explanation:
          "Step 1: The new expression succeeded, so the object and its socket exist and c is the only pointer to them.\nStep 2: authenticate throws, so control leaves the function via unwinding and the delete statement is simply never reached.\nStep 3: Unwinding destroys automatic objects, but c is a raw pointer whose destruction frees only the 8 bytes of the pointer, not the pointee.\nStep 4: The leak is invisible in the happy path, so tests pass and only adversarial or error-heavy traffic reveals it.\nStep 5: Replacing the raw pointer with auto c = std::make_unique<Connection>(host); makes the release automatic on every path, which is the entire point of RAII."
      },
      {
        title: "Over-aligned type silently under-aligned before C++17",
        input:
          "struct alignas(64) Counter { std::atomic<long> n; }; auto* c = new Counter; compiled as C++14.",
        output: "The returned pointer is only 16-byte aligned; aligned loads may fault and false sharing persists.",
        explanation:
          "Step 1: In C++14 there is exactly one operator new taking only a size, and it guarantees alignment suitable for max_align_t, typically 16 bytes.\nStep 2: alignas(64) makes Counter over-aligned, so the guarantee is insufficient and the standard gives no way for new to learn the requirement.\nStep 3: The object is therefore placed at an address that does not satisfy its own alignment, which is undefined behaviour, and on architectures with aligned-only SIMD instructions it faults outright.\nStep 4: Even where it does not fault, the whole purpose of the alignas - keeping the counter on its own cache line - is defeated, so the false sharing the code was written to avoid remains.\nStep 5: C++17 fixed this by adding the std::align_val_t overloads, which the compiler selects automatically for over-aligned types; on older standards you must use posix_memalign or _aligned_malloc plus placement new."
      }
    ],
    tips: [
      "Never write new or delete in application code; use make_unique, make_shared, or a container and let the ownership type own the expression.",
      "If you must use raw arrays, pair new[] with delete[] mechanically and consider it a code smell that a std::vector would remove.",
      "Do not check the result of new for null - it throws std::bad_alloc; the null check is dead code unless you used the nothrow form."
    ],
    tricks: [
      "std::make_shared performs one allocation for the object and the control block together, halving allocator traffic versus shared_ptr<T>(new T).",
      "Replacing class-scope operator new is a surgical way to pool-allocate one hot type without touching the global allocator or any call site.",
      "Compile with -fsanitize=address to catch mismatched new/delete forms immediately; it reports 'alloc-dealloc-mismatch' with both stack traces."
    ],
    memoryAids: [
      "new equals allocate plus construct; delete equals destruct plus deallocate. Every rule follows from that pairing.",
      "Square brackets travel in pairs: new[] with delete[], always, or the cookie lies to you.",
      "If you can see a new in business logic, you can see a future leak."
    ],
    interviewPatterns: [
      "'What is the difference between delete and delete[]?' Expect the cookie, the destructor count, and the heap-corruption consequence.",
      "'Why does make_unique exist when new works fine?' The unowned-window leak and the single-allocation benefit of make_shared are the expected answers.",
      "Frequency and companies: universal in C++ screens; deeper allocator-replacement follow-ups appear at game studios, HFT firms, and embedded teams."
    ],
    practiceProblems: [
      "Why does new never return null in a default configuration? Answer: operator new is specified to call the new_handler repeatedly and then throw std::bad_alloc when allocation fails, so a null return is impossible unless you use the std::nothrow overload or replace operator new with one declared noexcept.",
      "A class overrides operator new but not operator delete and objects are freed through a base pointer. What breaks? Answer: allocation goes through the class-specific pool while deallocation goes to the global operator delete, handing the pool's memory to the wrong allocator; overloads must be replaced as a matching family, and the base destructor must be virtual so the correct class-specific delete is selected.",
      "Explain why f(new A, new B) can leak but f(make_unique<A>(), make_unique<B>()) cannot. Answer: the argument evaluations are only indeterminately sequenced, so both raw allocations may complete before either is wrapped in an owner, and a throw in between orphans one; make_unique makes allocation and ownership a single indivisible step, so any throw happens either before an allocation or after it is already owned."
    ],
    faq: [
      {
        question: "What exactly goes wrong when you mix new with delete[] or new[] with delete?",
        answer:
          "Both directions are undefined behaviour, and the mechanism is worth being able to explain. For an array of a type with a non-trivial destructor, new[] must record the element count so that delete[] can run the right number of destructors; the near-universal implementation is a cookie stored in the bytes immediately preceding the pointer handed to the user. Calling plain delete on that pointer runs exactly one destructor, leaking whatever the other elements owned, and then passes an address that is inside the allocation rather than at its start to operator delete, which corrupts the allocator's metadata. Calling delete[] on a pointer from a scalar new does the mirror image: it reads bytes that were never written as a cookie and destroys an arbitrary, possibly enormous, number of objects. The reason the mistake sometimes appears to work is that arrays of trivially destructible types such as int usually carry no cookie, so the addresses coincide - but relying on that is relying on an implementation detail that changes between compilers and even between optimisation levels."
      },
      {
        question: "Why is std::make_shared usually better than shared_ptr<T>(new T)?",
        answer:
          "Three reasons. First, exception safety: make_shared performs the allocation and takes ownership as one indivisible operation, so there is no window in which a raw pointer exists with no owner, which is the leak that can occur when two such expressions appear as arguments in one call. Second, performance: shared_ptr needs a control block holding the strong count, the weak count, and the deleter, and constructing it from a raw pointer requires a second allocation, whereas make_shared allocates the object and the control block in a single block, halving allocator traffic and improving locality since the counts sit next to the data. Third, correctness of the deleter, since make_shared always pairs its own allocation and deallocation. The one real drawback is memory retention: because the object and the control block share an allocation, the object's storage cannot be released until the last weak_ptr disappears, so a large object observed by long-lived weak pointers stays resident. You also cannot use make_shared with a custom deleter or with a private constructor without a helper, which is when the two-argument form remains appropriate."
      },
      {
        question: "When is it legitimate to replace global operator new and delete?",
        answer:
          "The legitimate cases are whole-program concerns that cannot be scoped: installing a different general-purpose allocator such as jemalloc or tcmalloc, adding leak tracking or allocation profiling across an entire binary, enforcing an allocation budget in an embedded or real-time system, or placing all dynamic memory in a specific physical region. Even then, replacing global operator new is heavy-handed and error-prone because you must replace the entire family consistently - throwing and nothrow, scalar and array, sized and aligned - or some deallocations will reach the default implementation and hand your allocator's memory to the wrong owner. Your replacements must also be thread-safe, must not themselves allocate, and must handle being called before main during static initialisation. Because of all this, the modern guidance is to prefer narrower mechanisms: a class-scope operator new when one hot type dominates, a container allocator or a std::pmr memory resource when a subsystem needs pooling, or an arena passed explicitly. Those keep the customisation visible at the point of use and cannot corrupt unrelated code."
      },
      {
        question: "Does delete on a null pointer need a guard?",
        answer:
          "No. Both delete and delete[] are explicitly specified to do nothing when given a null pointer, and the default operator delete likewise ignores null, so if (p) delete p; is redundant. The habit persists mostly from C, where free(NULL) was only guaranteed to be safe from C89 onward, and from defensive coding conventions that predate the guarantee. What the guarantee does not cover is the far more dangerous case of a dangling pointer - one that was already deleted or never came from new - since deleting that is undefined behaviour and typically corrupts the heap. Setting a pointer to nullptr after deletion turns a would-be double free into a harmless no-op, which is why some codebases mandate it, but it only helps when the pointer you null is the same one that gets reused; it does nothing for copies of the pointer held elsewhere. That limitation is the real argument for unique_ptr, which makes both double deletion and use-after-delete structurally impossible for the owning path rather than merely less likely."
      },
      {
        question: "What is sized deallocation and why was it added?",
        answer:
          "C++14 introduced operator delete(void*, std::size_t), which the compiler calls in preference to the single-argument form whenever it statically knows the size of the object being deleted. The motivation is purely performance: many modern allocators segregate memory into size classes and, when handed only a pointer, must first look up which class it belongs to - often a lookup in a radix tree or a read of a block header that is a guaranteed cache miss. Passing the size lets the allocator go straight to the right free list, which measurably speeds up deallocation-heavy workloads. Two consequences matter for anyone writing custom allocation. If you replace operator delete you should replace the sized form too, or you will lose the benefit and, worse, risk inconsistency if some paths call one and some the other. And if you provide a sized form, its behaviour must be identical to the unsized one, because the compiler is permitted but not required to use it - notably it cannot use it when deleting through a base pointer with a virtual destructor, where the actual size is not known statically."
      },
      {
        question: "How do arrays of objects differ from std::vector in practice?",
        answer:
          "A new[] array gives you a fixed number of default-constructed elements in one allocation, and nothing else: no size stored where you can read it, no bounds checking, no growth, no exception-safe cleanup, and a requirement that the element type be default-constructible. std::vector gives you the same contiguous layout with a size and capacity you can query, growth with amortised constant-time push_back, automatic release on any exit path including exceptions, the ability to construct elements from arbitrary arguments via emplace_back, and separation of allocation from construction so that reserved capacity holds no live objects. The performance difference on element access is zero, because vector's operator[] compiles to the same indexed load, and the only genuine overheads are the three pointers vector stores and the growth reallocation you can eliminate with reserve. That is why the guidance is unambiguous: use std::vector, or std::array when the size is a compile-time constant, and reserve raw arrays for interoperating with C APIs or for the inside of a container implementation."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - new expression and operator new - https://en.cppreference.com/w/cpp/language/new",
        insight: "Exact semantics of allocation, construction, the cookie, and the full replaceable-function family."
      },
      {
        source: "book",
        attribution: "Scott Meyers - Effective Modern C++, Items 21 and 22 (prefer make_unique and make_shared)",
        insight: "The unowned-window leak and the single-allocation argument, with the memory-retention caveat for make_shared."
      },
      {
        source: "note",
        attribution: "C++ Core Guidelines - R.11, R.12, R.13 (avoid explicit new and delete)",
        insight: "States the ownership rules that make raw new a code smell outside of ownership-type implementations."
      }
    ]
  },
  {
    id: "topic-cpp-pointers-dangling-and-leaks",
    moduleId: "mod-cpp-pointers",
    title: "Dangling Pointers, Double Frees, and Leaks: Diagnosis and Prevention",
    intuition:
      "Memory bugs in C++ come in exactly three shapes: using memory after its object is gone, releasing the same memory twice, and never releasing it at all. All three are ownership failures - the code cannot answer 'who owns this and until when?'. That is why the cure is not more discipline but a change of representation: make ownership explicit in the type system and the entire category disappears. Interviews probe this because the symptoms are notoriously non-local, appearing far from the defect, so the ability to reason backwards from a corrupted heap is a genuinely hard-won skill.",
    complexity: {
      time:
        "Detection tooling dominates the cost. AddressSanitizer typically slows a program by about two times and catches use-after-free, heap and stack buffer overflow, and double free with the allocating and freeing stack traces attached. Valgrind's memcheck is far more thorough on uninitialised reads but runs 10 to 50 times slower. Reference counting with shared_ptr adds an atomic increment and decrement per copy, roughly 10 to 30 nanoseconds under contention.",
      space:
        "AddressSanitizer adds redzones around every allocation and keeps freed blocks in a quarantine so their reuse is delayed, commonly tripling peak memory. shared_ptr costs one extra pointer in the handle plus a control block of about 16 to 32 bytes per managed object, which make_shared folds into the object's own allocation."
    },
    lesson: [
      {
        title: "The Three Failure Modes and Their Signatures",
        content:
          "A dangling pointer is one whose referent's lifetime has ended: the object was deleted, the containing container reallocated, the stack frame returned, or the owner was moved from. Reading through it yields whatever now occupies those bytes, so the symptom is corrupted data or a crash at a seemingly random later point. A double free passes the same address to the allocator twice, corrupting its free-list metadata; the crash typically appears in the next unrelated allocation, which is why the reported stack trace names innocent code. A leak is memory that is unreachable but never released; it has no immediate symptom at all, only a monotonically rising resident set that eventually meets the OOM killer. Recognising which of the three you have from the symptom is the first diagnostic step.",
        diagram: asciiDiagram(`Three ownership failures, one root cause

                    "Who owns this, and until when?"
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
    nobody owns it        two owners think        someone owns it
    any more, but a       they own it             forever, but nothing
    pointer survives                              can reach it
          │                      │                      │
          ▼                      ▼                      ▼
   ┌─────────────┐        ┌─────────────┐        ┌─────────────┐
   │  DANGLING   │        │ DOUBLE FREE │        │    LEAK     │
   └─────────────┘        └─────────────┘        └─────────────┘
          │                      │                      │
  symptom: garbage       symptom: crash in       symptom: RSS grows,
  reads, crash far       the NEXT unrelated      no crash, OOM kill
  from the defect        allocation              after hours or days
          │                      │                      │
  detect: ASan           detect: ASan            detect: LeakSanitizer,
  use-after-free         double-free             Valgrind, heaptrack
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 ▼
                  cure: unique_ptr / shared_ptr / containers
                  make the owner a TYPE, not a convention`)
      },
      {
        title: "Where Dangling Pointers Actually Come From",
        content:
          "The textbook case - use after delete - is the least common in real code. Far more frequent are the structural ones. A container reallocation invalidates every pointer, reference, and iterator into a vector, so caching v.data() or &v[0] across a push_back is a bug. Returning a pointer or reference to a local, or to a member of a temporary, dangles the moment the function returns. A non-owning view type such as std::string_view or std::span outlives the string or vector it was created from. A lambda capturing by reference is stored and invoked after the captured locals are gone, which is the single most common dangling bug in asynchronous code. And an object moved from still exists but has surrendered its buffer, so pointers previously obtained from it now point into the destination.",
        codeExample: `std::vector<int> v{1,2,3};
int* p = v.data();
v.push_back(4);          // may reallocate
// *p is now DANGLING

std::string_view name() {
    std::string s = build();
    return s;            // view over a string destroyed on return -> UB
}

// The asynchronous capture-by-reference trap:
void schedule() {
    int request_id = next_id();
    pool.post([&] { log(request_id); });   // request_id dies at scope exit
}                                          // lambda runs later -> UB
void fixed() {
    int request_id = next_id();
    pool.post([request_id] { log(request_id); });   // capture BY VALUE
}

// Moved-from source:
std::string a = "hello";
const char* c = a.c_str();
std::string b = std::move(a);   // a's buffer now belongs to b
// c may dangle depending on whether SSO applied`
      },
      {
        title: "Double Free, Shallow Copy, and the Rule of Three",
        content:
          "The classic double free is not a repeated delete statement; it is an accidental copy. A class holding a raw owning pointer gets a compiler-generated copy constructor that copies the pointer, so two objects believe they own one allocation and both destructors free it. This is exactly the failure the rule of three was written to prevent: if you write any of destructor, copy constructor, or copy assignment, you almost certainly need all three. The rule of five extends it to the move operations, and the rule of zero says the real fix is to hold the resource in a member that already manages itself - a unique_ptr, a vector, a string - so that all five special members can be left implicit and correct.",
        codeExample: `struct Broken {
    char* data_;
    explicit Broken(std::size_t n) : data_(new char[n]) {}
    ~Broken() { delete[] data_; }
    // Implicit copy constructor copies the POINTER.
};
void boom() {
    Broken a{10};
    Broken b = a;     // shallow copy: b.data_ == a.data_
}                     // ~b frees it, then ~a frees it again -> double free

// Rule of three, done explicitly:
struct Fixed {
    char* data_; std::size_t n_;
    explicit Fixed(std::size_t n) : data_(new char[n]), n_(n) {}
    ~Fixed() { delete[] data_; }
    Fixed(const Fixed& o) : data_(new char[o.n_]), n_(o.n_) {
        std::copy_n(o.data_, n_, data_);
    }
    Fixed& operator=(Fixed o) { swap(*this, o); return *this; }  // copy-and-swap
    friend void swap(Fixed& a, Fixed& b) noexcept {
        std::swap(a.data_, b.data_); std::swap(a.n_, b.n_);
    }
};

// Rule of ZERO - what you should actually write:
struct Best { std::vector<char> data_; explicit Best(std::size_t n) : data_(n) {} };`
      },
      {
        title: "Leaks: Unreachable Memory, Caches, and Cycles",
        content:
          "A true leak is memory the program can no longer reach. Leak checkers find these by scanning for allocations with no live pointer to them at exit. But the more damaging production problem is often memory that is reachable and therefore not reported: an unbounded cache, a vector of handlers that is appended to and never cleared, a logging buffer with no rotation. Reference-counted cycles sit between the two categories - two shared_ptr objects pointing at each other keep both counts at one forever, so neither is destroyed and neither is reported as unreachable by some tools. The systematic fix for cycles is to make exactly one direction of every ownership relationship non-owning, which is what weak_ptr expresses.",
        codeExample: `struct Node {
    std::shared_ptr<Node> next;
    std::shared_ptr<Node> prev;      // CYCLE: neither count ever reaches 0
};
struct FixedNode {
    std::shared_ptr<FixedNode> next; // owning: parent -> child
    std::weak_ptr<FixedNode>   prev; // observing: child -> parent
};

// Reachable "leaks" no tool will report:
std::map<Key, Value> g_cache;        // never evicts -> unbounded growth
void handle(const Key& k) {
    g_cache[k] = compute(k);         // works, until it does not
}
// Fix: bound it.
struct LruCache { std::size_t capacity_; /* evict on insert */ };

// Using a weak_ptr safely requires lock():
void touch(const std::weak_ptr<FixedNode>& w) {
    if (auto p = w.lock()) p->visit();   // null if the parent is gone
}`,
        diagram: asciiDiagram(`A shared_ptr cycle, and the weak_ptr cut

  BEFORE - both objects immortal            AFTER - one edge made weak

  ┌──────────┐   next    ┌──────────┐      ┌──────────┐  next   ┌──────────┐
  │  Node A  ├──────────▶│  Node B  │      │  Node A  ├────────▶│  Node B  │
  │ strong=1 │◀──────────┤ strong=1 │      │ strong=1 │◀╌╌╌╌╌╌╌╌┤ strong=1 │
  └──────────┘   prev    └──────────┘      └──────────┘  weak   └──────────┘
       ▲                                        ▲
       │ external owner released                │ external owner released
       ▼                                        ▼
  A.strong = 1 (B still holds it)          A.strong = 0  ──▶ A destroyed
  B.strong = 1 (A still holds it)          A's members released
       │                                        ▼
       ▼                                   B.strong = 0  ──▶ B destroyed
  NEITHER is ever destroyed
  Leak checker may report NOTHING          weak_ptr::lock() now returns null
  because both are reachable                so observers fail safely`)
      },
      {
        title: "The Toolchain: Finding These Bugs Before Production",
        content:
          "AddressSanitizer is the highest-value tool: compile and link with -fsanitize=address and it reports use-after-free, heap and stack buffer overflows, use-after-scope, double free, and mismatched new/delete forms, each with the allocation, deallocation, and access stack traces. LeakSanitizer ships with it and reports unreachable allocations at exit. UndefinedBehaviorSanitizer catches the arithmetic and lifetime UB that ASan does not. Valgrind's memcheck remains superior for uninitialised-value tracking but is far slower. For reachable growth that no leak checker will flag, use a heap profiler such as heaptrack or massif and look at allocation sites sorted by retained bytes. Run all of these in CI on a representative workload, because a sanitizer that only ever sees unit tests will not find your production lifetime bugs.",
        codeExample: `# Build and run with AddressSanitizer + LeakSanitizer
g++ -std=c++20 -g -O1 -fsanitize=address,undefined \
    -fno-omit-frame-pointer app.cpp -o app
ASAN_OPTIONS=detect_leaks=1:strict_string_checks=1 ./app

# Typical report - note the three stacks
# ==1234==ERROR: AddressSanitizer: heap-use-after-free on address 0x60300000eff0
# READ of size 4 at 0x60300000eff0 thread T0
#     #0 in Session::poll() session.cpp:88     <- where it was USED
#  freed by thread T0 here:
#     #0 in Pool::recycle() pool.cpp:41        <- where it was FREED
#  previously allocated by thread T0 here:
#     #0 in Pool::acquire() pool.cpp:22        <- where it was ALLOCATED

# Reachable growth that leak checkers will NOT report:
heaptrack ./app && heaptrack_gui heaptrack.app.*.gz`
      }
    ],
    examples: [
      {
        title: "Lambda capturing a local by reference in an async task",
        input:
          "void submit() { std::string id = make_id(); pool.enqueue([&]{ log(id); }); } with the pool running the task later.",
        output: "Garbage or crash inside log; ASan reports stack-use-after-scope.",
        explanation:
          "Step 1: The capture-default [&] stores a reference to id, not a copy, so the closure holds an address in submit's stack frame.\nStep 2: submit returns as soon as the task is enqueued, so the frame is reclaimed and id's storage is reused by the next call.\nStep 3: When the worker thread eventually runs the closure, it reads through the stale reference and observes whatever now occupies those bytes.\nStep 4: The bug is timing-dependent, so it can pass every test on an idle machine and fail only under load, which is what makes it expensive.\nStep 5: Capture by value with [id], or capture an owning handle such as a shared_ptr, and adopt the rule that any lambda outliving its enclosing scope must not use a reference capture default."
      },
      {
        title: "Shallow copy causing a double free",
        input:
          "A Buffer class with char* data_, a destructor calling delete[], and no copy constructor. A Buffer is passed to a function by value.",
        output: "Crash on return: free(): double free or corruption, or ASan attempting double-free.",
        explanation:
          "Step 1: Passing by value invokes the implicitly generated copy constructor, which copies each member - and data_ is just a pointer.\nStep 2: The parameter and the argument now hold the same address and both believe they own it.\nStep 3: When the function returns, the parameter is destroyed and its destructor calls delete[] on that address.\nStep 4: When the original goes out of scope, its destructor calls delete[] on the same address, so the allocator is handed a block it has already reclaimed and its metadata is corrupted.\nStep 5: The minimal fix is the rule of three - implement or delete the copy operations - but the correct fix is the rule of zero: replace char* data_ with std::vector<char>, after which every special member is implicitly correct."
      },
      {
        title: "Parent-child shared_ptr cycle in a scene graph",
        input:
          "Each Node holds shared_ptr<Node> children and each child holds shared_ptr<Node> parent. Scenes are destroyed and recreated per frame.",
        output: "Memory grows by the size of one scene per frame; no leak checker reports anything.",
        explanation:
          "Step 1: Every parent-child pair forms a reference cycle in which each object's strong count includes the other.\nStep 2: Dropping the external handle to the scene root decrements its count to one rather than zero, because the children still hold the parent.\nStep 3: No destructor runs, so the children are never released either, and the entire subgraph becomes immortal.\nStep 4: Leak checkers that scan for unreachable blocks may report nothing, because the objects remain mutually reachable - the growth is only visible in RSS or a heap profiler.\nStep 5: Change the parent link to std::weak_ptr<Node>, which does not contribute to the strong count, and have children call lock() when they need the parent, handling the null case for a detached node."
      }
    ],
    tips: [
      "Give every allocation exactly one owning type at the moment it is created; if you cannot name the owner in one sentence, the design is not ready.",
      "Treat any pointer, reference, iterator, string_view, or span held across a container mutation as a bug regardless of how convenient it is.",
      "Never use a reference capture default in a lambda that may outlive the enclosing scope; make asynchronous captures explicit and owning."
    ],
    tricks: [
      "Set a deleted pointer to nullptr in code that cannot yet use smart pointers; it converts a would-be double free into a defined no-op.",
      "Run the test suite under -fsanitize=address,undefined in CI on a representative workload, not just unit tests, since lifetime bugs are timing-dependent.",
      "When RSS grows but LeakSanitizer is silent, look for reachable growth - unbounded caches, ever-growing vectors, and shared_ptr cycles - with a heap profiler."
    ],
    memoryAids: [
      "Dangling, double free, leak: use too late, free twice, free never. All three are 'who owns it?' answered badly.",
      "Rule of three, rule of five, rule of zero - and zero is the one you should be reaching for.",
      "Owning edges must form a tree, not a graph; every cycle needs one weak edge to break it."
    ],
    interviewPatterns: [
      "'This class crashes when copied. Why?' Tests the rule of three and whether you jump straight to the rule of zero.",
      "'How would you find a memory leak in a running service?' Expect sanitizers for unreachable leaks and a heap profiler for reachable growth, plus the distinction between the two.",
      "Frequency and companies: a staple everywhere C++ is used in production - Bloomberg, Amazon, Microsoft, Nvidia - often as a debugging story rather than a definition question."
    ],
    practiceProblems: [
      "Why can a program with no leaks still exhaust memory? Answer: leak checkers report unreachable allocations, but memory that is still reachable from an unbounded cache, a growing container, or a shared_ptr cycle is retained by design; the diagnosis is a heap profiler showing retained bytes by allocation site rather than a leak checker.",
      "Explain why deleting a Derived through a Base* with a non-virtual destructor is undefined behaviour. Answer: the delete expression selects the destructor from the static type, so only ~Base runs, the Derived members are never destroyed and leak, and the deallocation may be given the wrong size; declare the base destructor virtual, or make it protected and non-virtual if polymorphic deletion is not intended.",
      "A function returns std::string_view into a std::string parameter taken by value. Is it safe? Answer: no, the parameter is destroyed when the function returns, so the view dangles immediately; take const std::string& and document that the view's validity is tied to the caller's argument, or return a std::string by value."
    ],
    faq: [
      {
        question: "Why do memory bugs crash so far from where they occur?",
        answer:
          "Because none of the three failures is checked at the point of the mistake. Writing through a dangling pointer succeeds at the hardware level as long as the page is still mapped, and the page almost always is, because allocators reuse freed memory rather than returning it to the kernel. So the write silently corrupts whatever object now occupies those bytes, and the damage becomes visible only when that unrelated object is next used - possibly milliseconds later, in a different subsystem, on a different thread. A double free is worse: it corrupts the allocator's own bookkeeping, so the crash surfaces in the next allocation, which may be in third-party code that is entirely innocent. Leaks have no local symptom at all. This non-locality is precisely why sanitizers are so valuable: AddressSanitizer surrounds each allocation with poisoned redzones and quarantines freed blocks so that reuse is delayed, which converts a silent corruption into an immediate, precisely located report showing where the memory was allocated, where it was freed, and where it was touched."
      },
      {
        question: "Does using smart pointers everywhere eliminate memory bugs?",
        answer:
          "It eliminates most of them but not all, and the remaining ones are the interesting ones. unique_ptr makes double free and leak structurally impossible for the owning path, and shared_ptr does the same for shared ownership, so those categories largely disappear. What survives are three classes of problem. Reference cycles among shared_ptr objects retain memory forever and are not reported by leak checkers, requiring a deliberate weak_ptr on one edge of every ownership loop. Dangling non-owning references remain fully possible, because a raw pointer, a reference, a string_view, a span, or an iterator obtained from a smart-pointer-managed object still dangles when that object dies. And misuse of shared_ptr itself - constructing two independent shared_ptr objects from the same raw pointer, which creates two control blocks and therefore two independent counts and a double free - is a real and common bug that enable_shared_from_this exists to prevent. The accurate claim is that smart pointers move the problem from 'remember to free' to 'design the ownership graph', which is a far smaller and more reviewable surface."
      },
      {
        question: "What is the difference between a leak and unbounded memory growth?",
        answer:
          "A leak is an allocation the program can no longer reach: no live pointer refers to it, so it can never be freed and never be used. Unbounded growth is memory that is still reachable and, from the allocator's and the leak checker's point of view, perfectly legitimate - a cache with no eviction policy, a vector of registered callbacks that is appended to on every connection, a log buffer that is never rotated, or a memoisation table keyed by user input. The two demand different tools and different fixes. Leak checkers such as LeakSanitizer and Valgrind detect the first by scanning for unreferenced blocks at exit and will report nothing for the second. To find reachable growth you need a heap profiler such as heaptrack or massif, which attributes currently retained bytes to allocation sites and lets you see which container is accumulating. The fix is also different: a leak is repaired by giving the allocation an owner, while unbounded growth is repaired by adding a policy - a capacity limit, an LRU eviction, a TTL, or explicit removal on the corresponding teardown path."
      },
      {
        question: "How do I safely return a view or pointer to internal data?",
        answer:
          "The safe rule is that the view's validity must be documented as tied to the lifetime of an object the caller demonstrably holds. Returning std::string_view from a member function of a long-lived object is fine, because the caller holds that object; returning it from a function whose argument was taken by value is never fine, because the argument dies at the return. Three techniques make this robust in practice. First, ref-qualify the accessor so calling it on a temporary is either deleted or returns by value: auto data() const& -> std::string_view and auto data() && = delete; turns a dangling use into a compile error. Second, prefer returning by value when the object is small or when the caller usually needs to keep it, since move semantics and copy elision make that nearly free for types like std::string. Third, document the contract explicitly in the header, because the type system alone cannot express 'valid until the next call to reserve'. For containers, the standard's own iterator-invalidation tables are the model to imitate: state exactly which operations invalidate what."
      },
      {
        question: "What is the rule of zero and why is it preferred over the rule of five?",
        answer:
          "The rule of five says that if a class needs a user-defined destructor, copy constructor, copy assignment, move constructor, or move assignment, it probably needs all five, because their default implementations are only correct together. The rule of zero observes that the best way to satisfy that requirement is to never trigger it: if every member is itself a type that manages its own resource - std::vector, std::string, std::unique_ptr, std::shared_ptr - then the compiler-generated versions of all five special members are automatically correct, exception-safe, and optimal, and you write none of them. This is preferred because hand-written copy and move operations are a recurring source of bugs: forgetting self-assignment safety, forgetting to null the source in a move, forgetting to mark the move operations noexcept so that std::vector silently copies instead of moving during reallocation, and forgetting to update all five when a member is added. The practical division is that resource-management classes - the ones actually wrapping a file handle, a socket, or a foreign allocation - follow the rule of five and should be small, rare, and heavily tested, while every other class in the codebase follows the rule of zero."
      },
      {
        question: "Is setting a pointer to nullptr after delete worth doing?",
        answer:
          "It has genuine but limited value. Because delete on a null pointer is specified to be a harmless no-op, nulling converts an accidental second delete of that particular pointer into a defined non-event, and it turns a subsequent dereference from a silent read of recycled memory into an immediate, easily debugged null-pointer fault. Both are real improvements over the alternative. The limitations are equally real. It only protects the one pointer variable you nulled - every copy of that pointer stored elsewhere still dangles, which is exactly the situation in the shallow-copy double-free scenario. It does nothing for pointers held by other objects or captured in lambdas. And in the common case where the pointer is a local about to go out of scope, the assignment is dead code that the optimiser removes anyway, so it can create a false sense of safety. The honest position is that it is a reasonable defensive habit in legacy code that still uses raw owning pointers, and entirely unnecessary in code that uses unique_ptr, where reset() and destruction already null the handle and where copies cannot exist."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "Google - AddressSanitizer documentation - https://github.com/google/sanitizers/wiki/AddressSanitizer",
        insight: "Explains redzones, quarantine, and how the three-stack report pinpoints allocation, free, and use."
      },
      {
        source: "book",
        attribution: "Herb Sutter and Andrei Alexandrescu - C++ Coding Standards, Items 49-56 on resource management",
        insight: "The reasoning behind the rule of three and why every resource should have exactly one owning type."
      },
      {
        source: "note",
        attribution: "C++ Core Guidelines - R.3, R.4, R.24 (raw pointers are non-owning; break cycles with weak_ptr)",
        insight: "The ownership discipline that makes dangling, double free, and leaks unrepresentable rather than merely rare."
      }
    ]
  },
  {
    id: "topic-cpp-pointers-alignment-and-layout",
    moduleId: "mod-cpp-pointers",
    title: "Alignment, Padding, and Object Representation",
    intuition:
      "Hardware does not read bytes; it reads aligned words. Every type therefore carries an alignment requirement, and the compiler inserts padding so that each member lands on a suitable boundary. That single mechanism explains why reordering three members can shrink a struct by a third, why a struct is never smaller than its largest member's alignment, why alignas(64) is the standard cure for false sharing, and why casting a char* to an int* and dereferencing it is undefined behaviour. In performance interviews, struct layout is the highest-leverage change you can make without altering a single algorithm.",
    complexity: {
      time:
        "An aligned load or store is a single memory operation. An unaligned access that crosses a cache line costs two accesses and, on some architectures such as older ARM and on SIMD instructions requiring alignment, faults outright. Layout choices dominate real performance through cache behaviour: halving a hot struct's size can double the number of records per cache line and roughly halve the memory traffic of a scan.",
      space:
        "sizeof(T) is always a multiple of alignof(T), so trailing padding is unavoidable when the largest member is wide. Reordering members from largest to smallest alignment typically eliminates most internal padding; a struct of bool, double, bool is 24 bytes while double, bool, bool is 16. Over-aligning a type to a cache line to avoid false sharing costs up to 63 wasted bytes per object, which is deliberate."
    },
    lesson: [
      {
        title: "Alignment, Size, and Where Padding Comes From",
        content:
          "Every type has an alignment requirement, alignof(T), which is a power of two, and every object of that type must be placed at an address that is a multiple of it. Scalar types are typically aligned to their own size on mainstream platforms: char to 1, short to 2, int and float to 4, and double, long long, and pointers to 8. A struct's alignment is the maximum of its members' alignments, and the compiler inserts internal padding before any member whose offset would otherwise be misaligned, plus trailing padding so that sizeof is a multiple of the alignment - which is what makes arrays of the struct correctly aligned at every index. Padding bytes have indeterminate values, which is why memcmp on structs is unreliable and why writing a struct straight to disk is not portable.",
        codeExample: `#include <cstddef>

struct Bad {                 // sizeof == 24, alignof == 8
    bool   flag;             // offset 0,  1 byte
                             // 7 bytes of PADDING
    double value;            // offset 8,  8 bytes
    bool   valid;            // offset 16, 1 byte
                             // 7 bytes of TRAILING padding
};

struct Good {                // sizeof == 16, alignof == 8
    double value;            // offset 0
    bool   flag;             // offset 8
    bool   valid;            // offset 9
                             // 6 bytes of trailing padding
};

static_assert(sizeof(Bad)  == 24);
static_assert(sizeof(Good) == 16);
static_assert(offsetof(Good, flag) == 8);
// Rule of thumb: declare members in DECREASING order of alignment.`,
        diagram: asciiDiagram(`The same three members, two layouts

  struct Bad { bool flag; double value; bool valid; };   sizeof = 24

  byte:  0    1 ─────────── 7    8 ──────────── 15   16   17 ────── 23
        ┌────┬───────────────┬────────────────────┬────┬────────────┐
        │flag│ ▒▒ PADDING ▒▒ │      value         │vald│ ▒ PADDING ▒│
        └────┴───────────────┴────────────────────┴────┴────────────┘
              7 wasted                                  7 wasted
                                                        (so arrays stay
                                                         8-byte aligned)

  struct Good { double value; bool flag; bool valid; };  sizeof = 16

  byte:  0 ──────────────── 7    8    9   10 ────────── 15
        ┌────────────────────┬────┬────┬────────────────┐
        │       value        │flag│vald│ ▒▒ PADDING ▒▒  │
        └────────────────────┴────┴────┴────────────────┘
                                        6 wasted

  Saving: 8 bytes per object = 33%.  In a vector of 10 million records
  that is 80 MB and roughly a third fewer cache lines touched per scan.`)
      },
      {
        title: "alignas, alignof, and Over-Alignment",
        content:
          "alignof(T) queries a type's requirement and alignas(N) raises it; alignment can be increased but never decreased below the natural requirement. The dominant practical use is padding a concurrently written object out to a full cache line so that two threads writing to logically independent counters do not contend for the same line - false sharing, which can cost an order of magnitude in throughput. C++17 added std::hardware_destructive_interference_size for exactly this, though many implementations still require you to hard-code 64. Over-aligned types also need aligned allocation, which is why C++17 added the std::align_val_t overloads of operator new; before C++17, new on an alignas(64) type could silently return a 16-byte-aligned pointer.",
        codeExample: `#include <atomic>
#include <new>

// False sharing: two counters on ONE cache line, two threads, contention.
struct Contended {
    std::atomic<long> a{0};
    std::atomic<long> b{0};      // same 64-byte line as a
};

// Fixed: each counter owns its line.
struct alignas(64) Padded {
    std::atomic<long> v{0};
};
struct Counters {
    Padded a;                    // offset 0,  line 0
    Padded b;                    // offset 64, line 1
};

static_assert(alignof(Padded) == 64);
static_assert(sizeof(Counters) == 128);

// C++17 portable spelling:
// constexpr std::size_t kLine = std::hardware_destructive_interference_size;

// C++17 gives aligned new/delete automatically:
auto* p = new Padded;            // uses operator new(size, align_val_t{64})
delete p;`
      },
      {
        title: "Object Representation, Trivial Copyability, and Serialisation",
        content:
          "The object representation of a T is the sequence of sizeof(T) bytes that make it up, and you are permitted to inspect it through a char, unsigned char, or std::byte pointer - that is the one aliasing exception the standard guarantees. If a type is trivially copyable, meaning it has no user-provided copy, move, or destructor and all its members are trivially copyable, then copying those bytes with memcpy produces a valid, equal object. That is the formal basis for fast serialisation and for std::bit_cast. It is not a licence to write structs to disk: padding bytes are indeterminate, member order and padding differ across compilers and ABIs, endianness differs across machines, and pointers are meaningless outside the process. Portable serialisation must write fields explicitly with a defined byte order.",
        codeExample: `#include <bit>
#include <cstring>
#include <type_traits>

struct Point { float x, y, z; };
static_assert(std::is_trivially_copyable_v<Point>);

// Legal: inspect the object representation through std::byte.
void dump(const Point& p) {
    const auto* bytes = reinterpret_cast<const std::byte*>(&p);
    for (std::size_t i = 0; i < sizeof(Point); ++i) use(bytes[i]);
}

// Legal type punning (C++20). Pre-C++20 use memcpy - it compiles to nothing.
float f = 1.5f;
std::uint32_t bits = std::bit_cast<std::uint32_t>(f);
// std::uint32_t bad = *reinterpret_cast<std::uint32_t*>(&f);  // UB

// NOT portable: padding is indeterminate, layout and endianness vary.
// write(fd, &somePoint, sizeof(Point));         // fragile across ABIs
// Portable: serialise field by field with an explicit byte order.
void put_le32(std::byte* out, std::uint32_t v) {
    out[0] = std::byte(v); out[1] = std::byte(v >> 8);
    out[2] = std::byte(v >> 16); out[3] = std::byte(v >> 24);
}`
      },
      {
        title: "Layout Categories, Empty Base Optimisation, and Polymorphism",
        content:
          "A standard-layout type has no virtual functions, no virtual bases, the same access control for all non-static data members, and data members in only one class of the hierarchy; only such types have a guaranteed member order and work with offsetof and with C interoperability. Adding a single virtual function inserts a vptr, typically 8 bytes at the start, which changes the size, breaks standard layout, and prevents the object from being copied with memcpy. Empty classes still occupy at least one byte so that distinct objects have distinct addresses, but an empty base class contributes zero bytes to a derived object - the empty base optimisation, which is how stateless allocators and comparators cost nothing in standard containers. C++20's [[no_unique_address]] extends the same benefit to members.",
        codeExample: `struct Empty {};
static_assert(sizeof(Empty) == 1);          // distinct objects need addresses

struct Derived : Empty { int v; };
static_assert(sizeof(Derived) == 4);        // empty BASE costs nothing (EBO)

struct Member { Empty e; int v; };
static_assert(sizeof(Member) == 8);         // empty MEMBER costs 4 with padding

struct Better { [[no_unique_address]] Empty e; int v; };  // C++20
static_assert(sizeof(Better) == 4);

struct Plain { int a; int b; };
static_assert(std::is_standard_layout_v<Plain>);

struct Poly { virtual ~Poly() = default; int a; };
static_assert(sizeof(Poly) == 16);          // 8-byte vptr + int + padding
static_assert(!std::is_standard_layout_v<Poly>);
// memcpy on a Poly is UB: it would copy the vptr, which is not a value.`,
        diagram: asciiDiagram(`What a virtual function does to layout

  struct Plain { int a; int b; };          struct Poly { virtual ~Poly();
                                                         int a; int b; };

  ┌──────────┬──────────┐                 ┌──────────────┬─────┬─────┬────┐
  │   a (4)  │   b (4)  │                 │  vptr  (8)   │a (4)│b (4)│▒▒▒▒│
  └──────────┴──────────┘                 └──────┬───────┴─────┴─────┴────┘
   sizeof = 8                                    │        sizeof = 24
   standard layout: YES                          │        (16 on some ABIs
   memcpy-able:     YES                          ▼         with tighter pad)
   offsetof valid:  YES                   ┌─────────────────┐
                                          │ vtable for Poly │
                                          ├─────────────────┤
                                          │ &Poly::~Poly    │
                                          │ &type_info      │
                                          └─────────────────┘
                                           standard layout: NO
                                           memcpy-able:     NO (UB)

  One virtual function costs 8 bytes per OBJECT plus one indirect call
  per virtual dispatch - and forfeits trivial copyability entirely.`)
      },
      {
        title: "Bit-Fields, Packing, and When to Break the Rules",
        content:
          "Bit-fields let several small values share one word, which is valuable for protocol headers and for compressing hot structures, but almost everything about them is implementation-defined: allocation order within the unit, whether a field may straddle a unit boundary, and whether a plain int bit-field is signed. They also cannot have their address taken and read-modify-write on adjacent bit-fields in different threads is a data race even though the fields are logically independent. Packing pragmas such as #pragma pack(1) remove padding entirely, which is sometimes necessary to match a wire format, but they create misaligned members whose access is slow on x86 and faulting on some other architectures, and taking the address of such a member yields a pointer that violates its own type's alignment. The safe pattern for wire formats is to read and write fields explicitly rather than to overlay a packed struct.",
        codeExample: `// Compressing a hot structure - fine, with care.
struct Entry {
    std::uint32_t offset : 24;    // 0..16M
    std::uint32_t kind   : 4;
    std::uint32_t flags  : 4;
};                                 // 4 bytes instead of 12
static_assert(sizeof(Entry) == 4);

// Two threads writing e.kind and e.flags concurrently is a DATA RACE:
// both compile to a read-modify-write of the same 32-bit word.

// Packed struct for a wire header - portable only by luck.
#pragma pack(push, 1)
struct WireHeader { std::uint8_t v; std::uint32_t len; };   // len at offset 1
#pragma pack(pop)
static_assert(sizeof(WireHeader) == 5);
// &h.len is a misaligned uint32_t* : slow on x86, a fault on strict targets.

// Safer: parse explicitly, no packed struct, no alignment assumptions.
std::uint32_t read_le32(const std::byte* p) {
    return std::uint32_t(p[0]) | (std::uint32_t(p[1]) << 8)
         | (std::uint32_t(p[2]) << 16) | (std::uint32_t(p[3]) << 24);
}`
      }
    ],
    examples: [
      {
        title: "Shrinking a hot record by reordering members",
        input:
          "struct Order { bool active; double price; char side; long id; }; stored in a vector of 20 million elements.",
        output: "sizeof drops from 32 to 24 bytes; a full scan runs roughly 25 percent faster.",
        explanation:
          "Step 1: In declaration order, active occupies byte 0 and price requires 8-byte alignment, so 7 bytes of padding are inserted before it.\nStep 2: side then occupies byte 16, id requires 8-byte alignment so another 7 bytes of padding appear, giving 32 bytes total.\nStep 3: Reordering to double price, long id, bool active, char side places both 8-byte members first with no internal padding and leaves only 6 bytes of trailing padding, for 24 bytes.\nStep 4: The vector shrinks from 640 MB to 480 MB, and each 64-byte cache line now holds 2.67 records instead of 2.\nStep 5: Because the scan is memory-bandwidth bound rather than compute bound, the reduction in bytes touched translates almost directly into wall-clock time, with no change to the algorithm at all."
      },
      {
        title: "False sharing between two thread counters",
        input:
          "struct Stats { std::atomic<long> hits; std::atomic<long> misses; }; with one thread incrementing each, 100 million times.",
        output: "Roughly a 10 times slowdown versus the padded version; perf shows heavy cache-line contention.",
        explanation:
          "Step 1: The two atomics are adjacent, so both live in the same 64-byte cache line.\nStep 2: Cache coherence operates at cache-line granularity, so each write by one core invalidates the line in the other core's cache.\nStep 3: The two threads therefore ping-pong exclusive ownership of the line on essentially every increment, converting an L1 hit into a cross-core transfer.\nStep 4: The counters are logically independent, so this is pure overhead - no program-visible sharing exists, hence the name false sharing.\nStep 5: Declaring each counter alignas(64), or using std::hardware_destructive_interference_size, puts them on separate lines and restores near-linear scaling at the cost of 56 wasted bytes per counter."
      },
      {
        title: "Undefined behaviour from a misaligned cast",
        input:
          "char buffer[128] read from a socket; then auto* h = reinterpret_cast<Header*>(buffer + 1); h->length is read.",
        output: "Works on x86, faults on some ARM builds, and can be miscompiled at -O2 on any target.",
        explanation:
          "Step 1: buffer has alignment 1, so buffer + 1 has no alignment guarantee at all, while Header requires at least 4-byte alignment.\nStep 2: Forming a pointer to an object at an address that does not satisfy the type's alignment is undefined behaviour independently of whether the hardware tolerates the access.\nStep 3: The read also violates strict aliasing, because the bytes were never the object representation of a Header created there.\nStep 4: x86 permits unaligned scalar loads, so the code appears to work, which is exactly why the bug survives to a port; strict-alignment targets raise a bus error, and the optimiser may assume alignment and emit an aligned SIMD load.\nStep 5: The correct approach is to memcpy the bytes into a properly declared Header object, or better, to parse each field explicitly with a defined byte order so neither alignment nor endianness is assumed."
      }
    ],
    tips: [
      "Declare members in decreasing order of alignment; it is a zero-risk change that frequently shrinks hot structures by 25 to 50 percent.",
      "Pad concurrently written counters to a cache line with alignas; false sharing is invisible in source and enormous in profiles.",
      "Never reinterpret_cast a byte buffer to a struct pointer - memcpy into a real object, or parse fields explicitly."
    ],
    tricks: [
      "static_assert(sizeof(T) == N) on hot types turns an accidental layout regression into a build failure when someone adds a member.",
      "clang and gcc offer -Wpadded to report every byte of inserted padding, which is a fast way to audit an entire header for layout waste.",
      "std::bit_cast in C++20 replaces the memcpy punning idiom, is constexpr-friendly, and static_asserts that the sizes match."
    ],
    memoryAids: [
      "Big members first: sort by alignment descending and most padding disappears.",
      "sizeof is always a multiple of alignof, because arrays must keep every element aligned.",
      "One virtual function costs a pointer per object and forfeits trivial copyability - never add it casually to a hot type."
    ],
    interviewPatterns: [
      "'What is sizeof this struct and why?' A layout question that also checks whether you volunteer the reordering fix.",
      "'Two threads increment two adjacent counters and it does not scale. Why?' False sharing, with cache-line granularity as the explanation.",
      "Frequency and companies: heavily weighted at HFT firms, game studios, Nvidia, and embedded teams, where struct layout is a first-class performance concern."
    ],
    practiceProblems: [
      "Why is sizeof(struct { char c; }) equal to 1 but sizeof(struct { char c; int i; }) equal to 8? Answer: the first has alignment 1 so no padding is needed, while the second must align i to 4 bytes, adding 3 bytes of internal padding, and its own alignment of 4 forces sizeof to be a multiple of 4, giving 8.",
      "Can you memcpy an object with a virtual function? Answer: no, it is not trivially copyable; the object representation contains a vptr that is part of the implementation's bookkeeping rather than the value, and copying it into storage that was never constructed as that dynamic type gives an object whose virtual dispatch is unfounded, which is undefined behaviour.",
      "Why does adding [[no_unique_address]] to an empty member sometimes change sizeof and sometimes not? Answer: the attribute permits the member to share an address with another subobject, so it removes the member's mandatory one byte plus padding only when a suitable neighbour exists; two distinct [[no_unique_address]] members of the same empty type still need distinct addresses and so cannot both be elided."
    ],
    faq: [
      {
        question: "Why does the compiler insert padding instead of packing members tightly?",
        answer:
          "Because the hardware and the ABI both demand it. Most processors load and store in aligned words, and an access that straddles an alignment boundary either costs two memory operations or, on strict-alignment architectures such as some ARM and MIPS configurations, raises a fault. Atomic operations are stricter still: a lock-free atomic requires natural alignment, so a misaligned std::atomic<long> either becomes lock-based or is simply invalid. Beyond raw access cost, the platform ABI fixes the layout so that separately compiled translation units and separately built libraries agree on member offsets, which means the compiler is not free to invent a tighter arrangement even when it could prove the program would still work. Trailing padding exists for a related reason: sizeof(T) must be a multiple of alignof(T) so that in an array of T every element remains correctly aligned, which is what makes pointer arithmetic on arrays valid. You can override all of this with packing pragmas, but you then own the consequences - slower access, potential faults, and members whose addresses violate their own type's alignment."
      },
      {
        question: "How much can member reordering realistically save?",
        answer:
          "For a struct mixing wide and narrow members it commonly saves 25 to 50 percent, and occasionally more. The mechanism is simple: internal padding appears only when a member with a large alignment follows one that leaves the offset misaligned, so declaring members in decreasing order of alignment eliminates almost all internal padding and leaves only trailing padding. A struct of bool, double, bool is 24 bytes; reordered to double, bool, bool it is 16. Whether that matters depends entirely on how many instances exist and how they are accessed. For a handful of objects it is irrelevant. For an array of tens of millions scanned repeatedly, the size reduction translates almost directly into fewer cache lines touched and, since such scans are usually memory-bandwidth bound, into proportional wall-clock savings. The practical workflow is to run with -Wpadded or a layout dumper such as clang's -Xclang -fdump-record-layouts on your hot types, reorder, and pin the result with a static_assert on sizeof so a future member addition cannot silently undo the work."
      },
      {
        question: "What exactly is false sharing and how do I detect it?",
        answer:
          "False sharing occurs when two threads write to distinct objects that happen to occupy the same cache line. Cache coherence protocols such as MESI track ownership at cache-line granularity, typically 64 bytes, so a write by one core invalidates the entire line in every other core's cache even though no byte is genuinely shared. The result is that each increment, which should be an L1 hit costing a few cycles, becomes a cross-core coherence transaction costing tens to hundreds of cycles, and throughput can collapse by an order of magnitude while looking perfectly correct. It is invisible in source code, which is what makes it dangerous. Detection is empirical: perf stat shows a high rate of cache-to-cache transfers, perf c2c on Linux is purpose-built and reports the exact cache lines and the offending source lines, and Intel VTune has an equivalent analysis. The fix is to separate the objects onto different lines with alignas, ideally spelled std::hardware_destructive_interference_size, or to have each thread accumulate into a private local and merge once at the end, which avoids the sharing entirely and is usually faster still."
      },
      {
        question: "Is it safe to write a struct directly to a file or a socket?",
        answer:
          "Only within a single build of a single program on a single machine, which is rarely the situation that matters. Four independent things vary. Padding bytes have indeterminate values, so two objects with equal members can produce different byte sequences, which breaks hashing and comparison of the raw bytes as well as reproducible output. Layout differs across compilers, across ABI versions, and across 32-bit and 64-bit targets, so a struct written by one build may be unreadable by another. Endianness differs across architectures, so multi-byte integers are byte-reversed between little-endian and big-endian machines. And any pointer, reference, or virtual function in the type makes the bytes meaningless outside the originating process. The portable approach is explicit serialisation: write each field with a defined width and byte order, or use a schema-driven format such as Protocol Buffers, FlatBuffers, or Cap'n Proto that specifies the wire layout independently of any compiler's struct layout. If you truly must overlay a struct on a wire format, use a packed struct, accept the misaligned-access cost, and read fields through memcpy rather than by taking their addresses."
      },
      {
        question: "What is the empty base optimisation and why does it exist?",
        answer:
          "The standard requires that two distinct objects of the same type have distinct addresses, which forces even an empty class to have a size of at least one byte. But a base class subobject is not an independent object in that sense, so the standard permits an empty base to occupy no storage in the derived object - the empty base optimisation. This is not a curiosity; it is load-bearing throughout the standard library. std::vector, std::map, and their siblings are parameterised on an allocator and a comparator that are usually stateless, and inheriting from them rather than storing them as members means a std::vector<int> with the default allocator is exactly three pointers rather than three pointers plus padding for an empty allocator member. The same trick appears in std::unique_ptr, whose default deleter is stateless and costs nothing, so unique_ptr<T> is the same size as T*. Because using inheritance purely for layout is awkward, C++20 added [[no_unique_address]], which grants the same permission to a data member and lets you write the natural composition instead of a private base."
      },
      {
        question: "When should I use alignas, and can I ever lower alignment?",
        answer:
          "alignas can only raise alignment above the natural requirement; attempting to lower it is ill-formed, because the type's own requirement is a correctness constraint rather than a preference. The three legitimate reasons to raise it are cache-line separation to eliminate false sharing between concurrently written objects, satisfying the alignment demands of SIMD types where a 32-byte or 64-byte boundary is required by the instruction set, and matching a hardware or DMA buffer requirement in embedded and driver code. In every case the cost is wasted space, so it should be applied to specific hot objects rather than sprinkled broadly. Two practical caveats are worth remembering. Before C++17, dynamically allocating an over-aligned type through new gave no guarantee of the requested alignment, so such objects had to be allocated with posix_memalign or _aligned_malloc and constructed with placement new; C++17's aligned operator new overloads fixed this and are selected automatically. And alignas on a member raises the containing struct's alignment too, which can cascade into much larger objects than intended, so it is worth asserting the resulting sizeof rather than assuming it."
      }
    ],
    references: [
      {
        source: "paper",
        attribution: "Ulrich Drepper - What Every Programmer Should Know About Memory, sections on cache lines and false sharing",
        insight: "Quantifies coherence traffic and shows why cache-line granularity dictates concurrent data layout."
      },
      {
        source: "note",
        attribution: "cppreference - Object representation and alignment - https://en.cppreference.com/w/cpp/language/object",
        insight: "Normative definitions of alignment, object representation, trivial copyability, and standard layout."
      },
      {
        source: "note",
        attribution: "Itanium C++ ABI - Data layout - https://itanium-cxx-abi.github.io/cxx-abi/abi.html",
        insight: "The actual rules mainstream Unix compilers follow for padding, vptr placement, and the empty base optimisation."
      }
    ]
  },
  {
    id: "topic-cpp-pointers-placement-new-and-manual-lifetime",
    moduleId: "mod-cpp-pointers",
    title: "Placement new, Manual Lifetime, and Building Containers",
    intuition:
      "Placement new is the tool that splits allocation from construction. Once you can obtain storage separately and decide later - or never - to build an object in it, you can write std::vector, std::optional, small-buffer-optimised types, object pools, and arena allocators. Everything that makes containers fast rests on this: reserved capacity holds raw bytes, not default-constructed objects. The price is that you become responsible for the other half of the lifetime too, calling destructors explicitly and getting the exception-safety ordering right by hand.",
    complexity: {
      time:
        "Placement new itself costs nothing beyond the constructor call - the allocation function is a no-op that returns the pointer you gave it. That is the whole point: a pool or arena reduces per-object allocation from a 50 to 200 nanosecond allocator round trip to a pointer bump of a few cycles. Explicit destruction costs the destructor body, and for trivially destructible types the compiler removes the loop entirely.",
      space:
        "You control the layout completely, so there is no per-object allocator metadata; an arena of N objects costs N times sizeof(T) plus alignment. The buffer must be aligned to alignof(T), which typically means alignas on a std::byte array. Small-buffer optimisation trades a fixed inline buffer - often 16 to 32 bytes for std::string - against avoiding heap allocation for short values."
    },
    lesson: [
      {
        title: "The Mechanics: Construct Here, Destroy Explicitly",
        content:
          "The expression new (ptr) T(args) calls the placement form of operator new, which simply returns ptr, and then constructs a T at that address. No memory is allocated and none will be freed. Because the storage is not owned by the new expression, delete must never be used on the result; instead you call the destructor explicitly with ptr->~T(). Three preconditions must hold: the storage must be at least sizeof(T) bytes, it must be aligned to alignof(T) or better, and it must not currently hold a live object whose lifetime you have not ended. Getting any of these wrong is undefined behaviour with no diagnostic, which is why this machinery belongs inside a small, well-tested abstraction rather than scattered through application code.",
        codeExample: `#include <new>
#include <memory>
#include <cstddef>

// Correctly aligned raw storage for one T.
alignas(std::string) std::byte buf[sizeof(std::string)];

// Construct.
std::string* p = new (buf) std::string("hello");
p->append(" world");

// Destroy - explicitly. NEVER 'delete p'.
p->~basic_string();          // or std::destroy_at(p) since C++17

// C++20 gives a cleaner spelling for construction too:
// std::construct_at(reinterpret_cast<std::string*>(buf), "hello");

// The header <new> also declares the array placement form, which is
// best avoided because implementations may add an unspecified offset:
// new (buf) T[n];           // the returned pointer need not equal buf`,
        diagram: asciiDiagram(`Splitting allocation from construction

  ORDINARY new                       PLACEMENT new
  ────────────                       ─────────────
  new T(args)                        void* mem = get_storage();
       │                             new (mem) T(args)
       ▼                                  │
  ┌────────────────┐                      ▼
  │ operator new   │  allocates      ┌────────────────┐
  │ → raw storage  │                 │ operator new   │  returns mem
  └───────┬────────┘                 │ (void*, void*) │  unchanged
          ▼                          │ → no-op        │
  ┌────────────────┐                 └───────┬────────┘
  │ construct T    │                         ▼
  └────────────────┘                 ┌────────────────┐
                                     │ construct T    │
  delete p                           └────────────────┘
       │
       ▼                             call ~T() on p  ← YOU do this
  ┌────────────────┐                 free the storage YOUR way
  │ ~T() then      │                 (or not at all, for an arena)
  │ operator delete│
  └────────────────┘                 delete p  ──▶ UNDEFINED BEHAVIOUR
                                     (the storage never came from new)

  This split is what lets vector RESERVE capacity that holds no objects.`)
      },
      {
        title: "Why std::vector Needs This",
        content:
          "A vector must hold size constructed elements inside capacity bytes of storage, with the tail uninitialised. If reserve default-constructed the extra elements, the element type would have to be default-constructible, construction cost would be paid for objects nobody asked for, and destroying them later would be wasted work. So vector allocates raw bytes through its allocator, constructs elements one at a time with allocator_construct, which is placement new underneath, and destroys them explicitly. Growth then becomes: allocate a new raw block, move or copy each existing element into it with placement new, destroy the originals, free the old block. The choice between move and copy during that step is decided by whether the element's move constructor is noexcept, which is why marking move constructors noexcept is a genuine performance requirement rather than a stylistic one.",
        codeExample: `template <typename T>
class TinyVector {
    T* data_ = nullptr;
    std::size_t size_ = 0, cap_ = 0;
public:
    void reserve(std::size_t n) {
        if (n <= cap_) return;
        // 1. raw storage, NO objects constructed
        T* fresh = static_cast<T*>(::operator new(n * sizeof(T),
                                    std::align_val_t{alignof(T)}));
        // 2. relocate: move if noexcept, else copy for strong safety
        std::size_t i = 0;
        try {
            for (; i < size_; ++i)
                ::new (fresh + i) T(std::move_if_noexcept(data_[i]));
        } catch (...) {
            std::destroy_n(fresh, i);
            ::operator delete(fresh, std::align_val_t{alignof(T)});
            throw;                       // old buffer untouched: strong guarantee
        }
        // 3. destroy originals, free old raw storage
        std::destroy_n(data_, size_);
        ::operator delete(data_, std::align_val_t{alignof(T)});
        data_ = fresh; cap_ = n;
    }
    template <typename... A> T& emplace_back(A&&... a) {
        if (size_ == cap_) reserve(cap_ ? cap_ * 2 : 4);
        ::new (data_ + size_) T(std::forward<A>(a)...);   // construct in place
        return data_[size_++];
    }
    ~TinyVector() {
        std::destroy_n(data_, size_);
        ::operator delete(data_, std::align_val_t{alignof(T)});
    }
};`
      },
      {
        title: "Object Pools and Arenas",
        content:
          "When many objects share a lifetime and are allocated in a hot loop, replacing per-object allocator calls with a bump-pointer arena is one of the largest wins available. The arena owns one large block, hands out aligned slices by advancing a pointer, and releases everything at once. Because there is no per-object metadata and no free-list search, allocation is a few instructions and the objects end up contiguous, which also improves traversal locality. The constraint is that individual objects cannot be freed, so this suits phase-oriented workloads such as parsing a document or building a frame. If the objects are trivially destructible you can skip destruction entirely; otherwise the arena must record them and destroy them in reverse order on reset. C++17's std::pmr::monotonic_buffer_resource provides exactly this behind the standard allocator interface.",
        codeExample: `class Arena {
    std::byte* cur_; std::byte* end_;
    std::vector<std::unique_ptr<std::byte[]>> blocks_;
public:
    void* allocate(std::size_t n, std::size_t align) {
        auto p = reinterpret_cast<std::uintptr_t>(cur_);
        auto aligned = (p + align - 1) & ~(std::uintptr_t(align) - 1);
        if (aligned + n > reinterpret_cast<std::uintptr_t>(end_)) grow(n + align);
        cur_ = reinterpret_cast<std::byte*>(aligned + n);
        return reinterpret_cast<void*>(aligned);
    }
    template <typename T, typename... A> T* make(A&&... a) {
        static_assert(std::is_trivially_destructible_v<T>,
                      "arena does not run destructors");
        return ::new (allocate(sizeof(T), alignof(T))) T(std::forward<A>(a)...);
    }
private:
    void grow(std::size_t least);
};

// Standard-library equivalent, no hand-rolled code required:
void parse_document() {
    std::byte scratch[256 * 1024];
    std::pmr::monotonic_buffer_resource arena{scratch, sizeof scratch};
    std::pmr::vector<std::pmr::string> tokens{&arena};
    // every allocation bumps a pointer; nothing is freed until scope exit
}`
      },
      {
        title: "Small-Buffer Optimisation and Type-Erasing Wrappers",
        content:
          "Small-buffer optimisation embeds a fixed inline buffer in the object and constructs the payload there when it fits, falling back to the heap only when it does not. std::string uses it so that short strings never allocate - typically up to 15 characters on libstdc++ and 22 on libc++ - and std::function uses it so that small callables such as a lambda capturing one pointer are stored inline. Implementing it means holding aligned raw storage, tracking whether the inline or heap path is active, and writing move operations that construct in the destination buffer and destroy the source rather than copying bytes, because a self-referential object cannot be relocated by memcpy. The trade-off is object size against allocation count, and the right buffer size is an empirical decision driven by the distribution of real payloads.",
        codeExample: `template <std::size_t N>
class SmallStore {
    alignas(std::max_align_t) std::byte inline_[N];
    void* ptr_ = nullptr;              // points at inline_ or at the heap
    void (*destroy_)(void*) = nullptr;
public:
    template <typename T, typename... A>
    T& emplace(A&&... a) {
        reset();
        if constexpr (sizeof(T) <= N && alignof(T) <= alignof(std::max_align_t)) {
            ptr_ = ::new (inline_) T(std::forward<A>(a)...);      // inline path
        } else {
            ptr_ = new T(std::forward<A>(a)...);                  // heap path
        }
        destroy_ = [](void* p) {
            if constexpr (sizeof(T) <= N) static_cast<T*>(p)->~T();
            else delete static_cast<T*>(p);
        };
        return *static_cast<T*>(ptr_);
    }
    void reset() { if (destroy_) { destroy_(ptr_); destroy_ = nullptr; } }
    ~SmallStore() { reset(); }
    SmallStore(const SmallStore&) = delete;    // relocation is NOT memcpy
};`,
        diagram: asciiDiagram(`Small-buffer optimisation in std::string

  short string: "hello"                 long string: 200 characters
  ┌──────────────────────────┐          ┌──────────────────────────┐
  │ ┌──────┐ ┌────────────┐  │          │ ┌──────┐ ┌────┬────────┐ │
  │ │ size │ │ h e l l o \\0│ │          │ │ size │ │ cap│ pointer│ │
  │ │  5   │ │ inline buf │  │          │ │ 200  │ │ 208│    ┼───┼─┼──┐
  │ └──────┘ └────────────┘  │          │ └──────┘ └────┴────────┘ │  │
  └──────────────────────────┘          └──────────────────────────┘  │
        ZERO allocations                      ONE allocation          │
        data() points INSIDE the object                               ▼
                                              heap ┌──────────────────────┐
  libstdc++ inline capacity: 15 chars              │ 200 chars + NUL      │
  libc++    inline capacity: 22 chars              └──────────────────────┘

  Consequence: a std::string that uses the inline buffer is SELF-REFERENTIAL.
  It cannot be relocated with memcpy - moving it must run the move
  constructor, which is exactly why std::string is not trivially copyable.`)
      },
      {
        title: "The Sharp Edges: Reuse, launder, and Exception Ordering",
        content:
          "Reusing storage that held a different object is legal only after the previous object's lifetime has ended, and afterwards every pointer, reference, and name that referred to the old object is invalid even if the address is unchanged. When the new object is at the same address but the old type had const or reference members, accessing it through the old pointer requires std::launder to tell the compiler not to reuse cached assumptions. Exception ordering is the other trap: if constructing element k of a range throws, you must destroy elements 0 through k-1 and then release the storage, in that order, before rethrowing. The standard supplies std::uninitialized_copy, std::uninitialized_move, std::uninitialized_value_construct, and std::destroy_n precisely so you do not have to write those loops, and they already provide the strong guarantee.",
        codeExample: `#include <memory>

// Prefer the standard algorithms over hand-written loops: they are
// exception-correct and they optimise to memcpy for trivial types.
T* dst = static_cast<T*>(::operator new(n * sizeof(T)));
std::uninitialized_copy_n(src, n, dst);        // rolls back on throw
std::destroy_n(dst, n);
::operator delete(dst);

// Reuse of storage: the OLD pointer is invalid afterwards.
alignas(int) std::byte s[sizeof(int)];
int* a = ::new (s) int{1};
a->~int();                       // (pedantically: std::destroy_at(a))
double* b = ::new (s) double{2.0};
// *a is now UB - not because of the address, but because that object is gone.

// std::launder is required when the new object is reached through a
// pointer to the OLD one and the type has const/reference members:
struct C { const int v; };
alignas(C) std::byte t[sizeof(C)];
C* c1 = ::new (t) C{1};
c1->~C();
::new (t) C{2};
// int x = c1->v;                        // UB: c1 refers to the dead object
int x = std::launder(c1)->v;             // OK: 2`
      }
    ],
    examples: [
      {
        title: "Why reserve does not construct elements",
        input: "std::vector<std::mutex> v; v.reserve(100); with std::mutex being neither copyable nor movable.",
        output: "Compiles and runs; no mutexes are constructed and no move is required.",
        explanation:
          "Step 1: reserve allocates raw storage sized for 100 mutexes through the allocator, using operator new with the right alignment.\nStep 2: No placement new is performed, so no mutex object exists in that storage and no constructor runs.\nStep 3: This is why reserve does not require the element type to be default-constructible, unlike resize, which does construct elements.\nStep 4: Because no elements exist yet, there is nothing to relocate, so the fact that std::mutex is neither copyable nor movable is irrelevant at this point.\nStep 5: The restriction bites later - a subsequent emplace_back beyond the reserved capacity would need to relocate the existing mutexes and cannot, which is why vectors of mutexes must have their capacity reserved once, up front, and never exceeded."
      },
      {
        title: "Arena allocation for a parser",
        input:
          "A JSON parser allocating roughly 500,000 small nodes per document with new, all freed together when the document is released.",
        output: "About a 4 times speedup and near-zero teardown cost after switching to a monotonic arena.",
        explanation:
          "Step 1: The original code performs 500,000 allocator round trips plus 500,000 deallocations, which dominates parse time.\nStep 2: Every node shares one lifetime, which is precisely the pattern a bump-pointer arena serves.\nStep 3: Each node now costs an alignment adjustment and a pointer increment, a handful of instructions instead of a free-list search.\nStep 4: Nodes are laid out contiguously in allocation order, so tree traversal also benefits from locality and prefetching, compounding the win.\nStep 5: Teardown becomes a single block release, valid only because the node type is trivially destructible - otherwise the arena would have to record every constructed object and destroy them in reverse order on reset."
      },
      {
        title: "Forgetting to destroy in a manual buffer",
        input:
          "A ring buffer stores elements with placement new into a raw byte array, and on overwrite it simply constructs a new element over the old slot.",
        output: "Leaks whatever the overwritten elements owned; ASan and LeakSanitizer report growing allocations.",
        explanation:
          "Step 1: Placement new begins a new object's lifetime but does nothing to end the previous one occupying that storage.\nStep 2: If the element type is std::string or holds a unique_ptr, the old object's heap buffer is still allocated and now unreachable.\nStep 3: Constructing over a live object is itself undefined behaviour, independent of the leak, because the storage is not free.\nStep 4: The symptom is a steady leak proportional to the overwrite rate, with no crash, so it survives functional testing entirely.\nStep 5: The fix is to call std::destroy_at on the slot before reconstructing it, and to destroy all live slots in the ring buffer's own destructor - which is exactly the bookkeeping that makes hand-written containers worth avoiding unless necessary."
      }
    ],
    tips: [
      "Never call delete on a pointer from placement new; call the destructor explicitly, or std::destroy_at, and release the storage the way you obtained it.",
      "Use std::uninitialized_copy, std::uninitialized_move, and std::destroy_n rather than hand-written loops; they are exception-correct and optimise to memcpy for trivial types.",
      "Mark move constructors noexcept, otherwise vector reallocation falls back to copying to preserve the strong exception guarantee."
    ],
    tricks: [
      "std::pmr::monotonic_buffer_resource over a stack array gives arena performance to standard containers with no custom allocator code at all.",
      "std::construct_at and std::destroy_at (C++17/20) are constexpr-friendly and spell the intent more clearly than raw placement new syntax.",
      "static_assert(std::is_trivially_destructible_v<T>) inside an arena's make() turns a silent skipped-destructor leak into a compile error."
    ],
    memoryAids: [
      "Placement new constructs but never allocates; you must destroy but never delete.",
      "Reserve holds bytes, resize holds objects - that difference is the entire reason placement new exists in containers.",
      "Bump a pointer, free nothing: an arena trades individual deallocation for near-zero allocation cost."
    ],
    interviewPatterns: [
      "'Implement a simplified vector with reserve and emplace_back.' The interviewer is watching for placement new, explicit destruction, and exception-safe relocation.",
      "'Why is std::string not trivially copyable?' The small-buffer optimisation makes short strings self-referential, so relocation must run the move constructor.",
      "Frequency and companies: common at HFT firms, game studios, and database and infrastructure teams; a standard senior-level systems question."
    ],
    practiceProblems: [
      "Why does vector's reallocation use std::move_if_noexcept rather than std::move? Answer: if the move constructor can throw, a partially completed relocation would have already destroyed source elements it cannot restore, so the strong exception guarantee would be lost; move_if_noexcept falls back to copying, which leaves the original buffer intact and lets the operation be abandoned safely.",
      "When is std::launder required? Answer: when you access a new object through a pointer, reference, or name that designated a different object at the same address, and the type contains const or reference members, since the compiler is otherwise entitled to reuse cached values it proved immutable; launder produces a pointer to the new object with no such assumptions.",
      "Design an object pool for a type with a non-trivial destructor. Answer: keep a free list of raw slots, construct with placement new on acquire and call std::destroy_at on release, track which slots are live so the pool's destructor can destroy any remaining objects, and ensure the slot storage is declared with alignas(T) and sized sizeof(T) so alignment is never violated."
    ],
    faq: [
      {
        question: "Why can I not call delete on a pointer returned by placement new?",
        answer:
          "Because delete does two things and only one of them is appropriate. It calls the destructor, which you do want, and then it calls operator delete on the pointer, which hands the address to the global allocator. But that address never came from the global allocator - it came from a stack array, a member buffer, an arena, or a pool - so the allocator is asked to free memory it does not own, which corrupts its metadata and is undefined behaviour. The correct pattern is to end the object's lifetime explicitly with p->~T() or std::destroy_at(p), and then release the storage in whatever way matches how it was obtained: nothing at all for a stack buffer, a pointer reset for an arena, a push onto the free list for a pool, or ::operator delete if you called ::operator new yourself. This asymmetry is the price of separating allocation from construction, and it is the main reason placement new should live inside a small RAII abstraction whose destructor performs the correct teardown, rather than being written inline in application logic where a single early return can skip it."
      },
      {
        question: "What is std::launder for and when do I actually need it?",
        answer:
          "std::launder tells the compiler to forget everything it thinks it knows about the object a pointer designates and to treat it as pointing at whatever object now occupies that address. It is needed because the optimiser is allowed to make strong assumptions about immutable data: if a type has a const or reference member, the compiler may cache that member's value across an assignment, on the reasoning that it can never change for a given object. When you destroy that object and construct a new one of the same type at the same address, the cached value becomes wrong, and the standard says the old pointer no longer designates a valid object even though the address is identical. Laundering the pointer produces a fresh one with no cached assumptions. In practice you need it in exactly one family of situations - storage reuse where the type has const or reference members or a vtable, typically inside hand-written containers, variants, and optional implementations. You do not need it after ordinary construction, when the new object's type has no const or reference members and you use the pointer returned by the placement new expression itself, which always designates the new object correctly."
      },
      {
        question: "How do the standard uninitialised-memory algorithms help?",
        answer:
          "They encapsulate the two things that are easy to get wrong: exception ordering and optimisation for trivial types. std::uninitialized_copy, std::uninitialized_move, std::uninitialized_fill, and std::uninitialized_value_construct each construct a range of objects in raw storage and, crucially, destroy everything they have already constructed if any construction throws, so the destination is left with no live objects and the caller can free the storage and rethrow. Writing that rollback by hand is where most hand-rolled containers have bugs, because the natural loop leaves k constructed elements leaking when element k plus one throws. The paired std::destroy, std::destroy_n, and std::destroy_at handle the teardown side and are no-ops for trivially destructible types, so the loop vanishes entirely at compile time. For trivially copyable types the copy and move variants lower to a single memcpy, so you get the safety without paying for it. C++17 also added the _n suffixed forms and C++20 added constexpr support and std::construct_at, which makes the whole family usable in constant evaluation - which is what allows std::vector to work at compile time in C++20."
      },
      {
        question: "How does small-buffer optimisation interact with move semantics?",
        answer:
          "It makes the object potentially self-referential, which has a cascade of consequences. When a std::string holds its characters in its inline buffer, data() points inside the object itself, so relocating the object by copying its bytes would leave the pointer aimed at the source's buffer. That is why such types are not trivially copyable and why moving them must actually run the move constructor, which for the inline case copies the characters into the destination's own buffer and for the heap case simply steals the pointer. The performance implication is that moving a short string is not free - it is a small copy - while moving a long one is a pointer transfer, so the cost of a move varies with the value rather than the type. It also means these types cannot be relocated with memcpy by containers, which is why proposals for trivial relocatability exist: they would let a vector move a range of strings with one memcpy when the implementation guarantees it is safe. For your own SBO types, the practical rules are to write explicit move operations that construct in the destination and leave the source empty, to mark them noexcept so containers use them, and never to assume the inline buffer's address is stable across a move."
      },
      {
        question: "When is an arena the wrong choice?",
        answer:
          "An arena trades the ability to free individual objects for near-zero allocation cost, so it is wrong whenever lifetimes are not aligned. If some objects must outlive the phase - a cached result, a handle returned to a caller, an entry inserted into a long-lived index - then either the arena cannot be reset when you expected or those objects must be copied out, which erodes the benefit. It is also wrong when peak memory matters more than speed, because nothing is reclaimed until the reset, so an arena's high-water mark equals the total allocated during the phase rather than the maximum live set. Non-trivially-destructible types add real complexity, since the arena must record every constructed object to destroy them in reverse order, and if you forget that step you silently leak whatever those objects owned. Finally, arenas interact badly with concurrency unless each thread has its own, because a shared bump pointer becomes a contended atomic. The honest guidance is to reach for an arena when profiling shows allocator time is significant and the workload is genuinely phase-oriented - parsing, request handling, frame rendering - and to use std::pmr::monotonic_buffer_resource rather than hand-rolling it."
      },
      {
        question: "Is it ever acceptable to write placement new in application code?",
        answer:
          "Rarely, and the test is whether you are implementing an abstraction or using one. Legitimate uses are inside a container, an allocator, a variant or optional replacement, an object pool, a lock-free structure that needs precise control over when objects become visible, or a serialisation layer constructing objects into a received buffer. In each case the placement new and the matching explicit destruction live within a few lines of each other inside a type whose destructor guarantees the teardown happens on every path, including during exception unwinding. What is not acceptable is scattering it through business logic to avoid an allocation, because you then own the alignment guarantee, the exception ordering, the reuse rules, and the destruction on every return path - and a single early return or a single throw between construction and destruction is a leak or worse, with no compiler diagnostic. The modern alternatives cover most motivations directly: std::optional for a maybe-present object, std::variant for a tagged union, std::pmr for arena and pool allocation, and containers for everything else. Reach for placement new only when none of those expresses what you need."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - Uninitialized memory algorithms - https://en.cppreference.com/w/cpp/memory",
        insight: "The full family of uninitialized_* and destroy_* algorithms with their exception-safety guarantees."
      },
      {
        source: "book",
        attribution: "Nicolai Josuttis - The C++ Standard Library, 2nd ed., chapters on allocators and vector internals",
        insight: "Walks through how reserve, growth, and element relocation are actually implemented on top of raw storage."
      },
      {
        source: "video",
        attribution: "Andrei Alexandrescu - std::allocator Is to Allocation what std::vector Is to Vexation (CppCon 2015)",
        insight: "Practical arena and pool designs, and where the standard allocator model helps versus gets in the way."
      }
    ]
  }
];
