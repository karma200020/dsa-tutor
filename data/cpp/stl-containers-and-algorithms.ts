import { Topic } from "../syllabus";

const asciiDiagram = (art: string): string =>
  `<pre style="margin:0;padding:0;font-family:'Courier New',monospace;font-size:12px;line-height:1.5;color:#a5f3fc;white-space:pre;text-align:left;overflow-x:auto;">${art}</pre>`;

export const cppStlTopics: Topic[] = [
  {
    id: "topic-cpp-stl-sequence-containers",
    moduleId: "mod-cpp-stl-containers-and-algorithms",
    title: "Sequence Containers: vector, deque, list, and array",
    intuition:
      "Choosing a container is choosing a memory layout, and on modern hardware the layout dominates the asymptotic complexity for anything smaller than tens of thousands of elements. std::vector wins by default because it is a single contiguous allocation that the prefetcher can stream through; list has better insertion complexity on paper and loses badly in practice because every node is a separate cache miss. Interview answers that recite Big-O without mentioning contiguity are incomplete, and production code that reaches for list because insertion is O(1) is usually slower than the vector it replaced.",
    complexity: {
      time:
        "vector: O(1) indexing, amortised O(1) push_back, O(n) insert or erase in the middle. deque: O(1) indexing and O(1) push/pop at both ends, O(n) middle insert. list and forward_list: O(1) insert and erase given an iterator, O(n) to find that iterator, no indexing at all. array: O(1) indexing with no allocation ever. The amortisation on push_back comes from geometric growth: doubling gives each element an average of about two moves across its lifetime.",
      space:
        "vector holds three pointers plus a heap block that may be up to twice the used size after growth. deque holds a map of fixed-size blocks, so it wastes at most one block per end but never has to move existing elements when it grows. list costs two pointers plus allocator overhead per element - typically 32 bytes of overhead for an 8-byte payload - and every node is a separate allocation. array has zero overhead and lives wherever it is declared."
    },
    lesson: [
      {
        title: "vector: Growth, Capacity, and the Contiguity Guarantee",
        content:
          "std::vector stores its elements in one contiguous block, which is what makes data() usable with C APIs and what makes iteration fast. Size and capacity are distinct: size is how many elements exist, capacity is how many fit before reallocation. When push_back finds size equal to capacity it allocates a larger block, moves or copies every element across, destroys the originals, and frees the old block, which invalidates every iterator, pointer, and reference into the container. Growth is geometric - typically 2x on libstdc++ and libc++, 1.5x on MSVC - which is what makes push_back amortised constant; a fixed increment would make it linear per element and quadratic overall. Two details matter for correctness: reserve changes capacity without changing size, and shrink_to_fit is a non-binding request. One matters for exception safety: the move-if-noexcept rule means a type whose move constructor is not noexcept gets copied during reallocation, which silently costs a great deal of performance.",
        codeExample: `std::vector<int> v;
v.reserve(1000);            // capacity >= 1000, size still 0
assert(v.size() == 0 && v.capacity() >= 1000);
v.resize(10);               // size == 10, elements value-initialised to 0

// Growth trace on libstdc++ (doubling):
// push_back: cap 0 -> 1 -> 2 -> 4 -> 8 -> 16 ...
// 1000 push_backs perform ~1000 constructions + ~1023 moves total,
// i.e. amortised O(1). A +1 growth policy would do ~500,000 moves.

// Reallocation invalidates EVERYTHING:
std::vector<int> data{1, 2, 3};
int* p = &data[0];
int& r = data[1];
auto it = data.begin();
data.push_back(4);          // may reallocate
// *p, r, *it are ALL dangling now - undefined behaviour to touch them.

// The classic self-reference bug:
std::vector<int> nums{1, 2, 3};
nums.push_back(nums[0]);    // UB if it reallocates: nums[0] is read from
                            // freed memory. Implementations handle this
                            // correctly by construction order, but the
                            // equivalent with a reference is genuinely broken:
int& first = nums[0];
nums.push_back(first);      // reads a dangling reference

// noexcept move is not optional for performance:
struct Slow { std::string s; Slow(Slow&&) { /* no noexcept */ } };
struct Fast { std::string s; Fast(Fast&&) noexcept = default; };
// Growing vector<Slow> COPIES every element (strong exception guarantee);
// vector<Fast> moves them. Same asymptotics, order-of-magnitude difference.
static_assert(std::is_nothrow_move_constructible_v<Fast>);

// erase-remove: algorithms cannot change size, only containers can
v.erase(std::remove_if(v.begin(), v.end(),
                       [](int x) { return x % 2 == 0; }),
        v.end());
std::erase_if(v, [](int x) { return x % 2 == 0; });   // C++20, one call

// vector<bool> is not a vector and not of bool:
std::vector<bool> flags(8);
// auto& b = flags[0];      // ERROR: operator[] returns a PROXY, not bool&
// bool* p = &flags[0];     // ERROR: no addressable elements
std::deque<bool> real_bools;      // or vector<char>, or bitset`,
        diagram: asciiDiagram(`vector growth and what it destroys

  Before push_back, size == capacity == 4
  ┌────┬────┬────┬────┐
  │ 10 │ 20 │ 30 │ 40 │   heap block A  (capacity 4)
  └────┴────┴────┴────┘
    ▲         ▲
    │         └── int& r = v[2];      ┐
    └── int* p = v.data();            ├─ all point into block A
        auto it = v.begin();          ┘

  push_back(50)  ⇒  no room  ⇒  REALLOCATE
  ┌──────────────────────────────────────────────┐
  │ 1. allocate block B with capacity 8          │
  │ 2. move (or COPY, if move is not noexcept)   │
  │    each element A ▸ B                        │
  │ 3. destroy the elements in A                 │
  │ 4. free block A                              │
  └──────────────────────────────────────────────┘

  ┌────┬────┬────┬────┬────┬┈┈┈┬┈┈┈┬┈┈┈┐
  │ 10 │ 20 │ 30 │ 40 │ 50 │   │   │   │  block B (capacity 8, size 5)
  └────┴────┴────┴────┴────┴┈┈┈┴┈┈┈┴┈┈┈┘

    p, r, it  ──►  block A  ──►  FREED   ⇒  dangling, UB to use

  ┌──────────────────────────────────────────────────────────┐
  │  Invalidation summary for vector                         │
  │                                                          │
  │  push_back / emplace_back  reallocates?  ALL invalid     │
  │                            no realloc?   end() only      │
  │  insert(pos, x)                          from pos onward │
  │  erase(pos)                              from pos onward │
  │  reserve / resize / shrink_to_fit        ALL (if realloc)│
  │  clear()                                 ALL but end()   │
  │  operator[] / at / data / begin (read)   nothing         │
  └──────────────────────────────────────────────────────────┘`)
      },
      {
        title: "deque: Blocks, Stable References, and the Cost of Indexing",
        content:
          "std::deque is not a vector with a front pointer. It is an array of pointers - the map - each pointing to a fixed-size block of elements, so growth at either end allocates a new block and appends its address to the map without touching any existing element. That is why push_front and push_back are both O(1) and, crucially, why they invalidate iterators but not references or pointers to existing elements. Indexing is O(1) but slower than vector's, because it requires dividing the index by the block size to find the block and then indexing within it, and iteration cannot be a simple pointer bump. deque is the right answer when you need a queue, when you need push_front, or when you need reference stability under growth; it is the wrong answer when you need contiguity for a C API or maximal iteration speed. It is also the default underlying container for std::stack and std::queue.",
        codeExample: `std::deque<Record> d;
Record& first = d.front();
d.push_back(make_record());
// 'first' is STILL VALID - deque never moves existing elements on growth.
// Iterators, however, ARE invalidated by insertion at either end.

// This is the property vector cannot offer:
std::vector<Record> v;
Record& vfirst = v.front();
v.push_back(make_record());     // may reallocate -> vfirst dangles

// Block layout means erase in the middle is O(n) but with a shortcut:
d.erase(d.begin() + 3);
// Implementations shift toward whichever END is nearer, so a middle
// erase moves at most n/2 elements rather than always the tail.

// deque is the default for the container adaptors:
std::stack<int> s;                             // stack<int, deque<int>>
std::queue<int> q;                             // queue<int, deque<int>>
std::stack<int, std::vector<int>> fast_stack;  // usually faster: contiguous
// vector cannot back a queue - it has no pop_front.

// Invalidation rules are unusually asymmetric, and worth memorising:
//   push_front / push_back : iterators invalid, refs/pointers VALID
//   pop_front  / pop_back  : only iterators/refs to the ERASED element
//   insert/erase in middle : everything invalid

// Block size is implementation-defined and matters for large elements:
struct Big { char data[4096]; };
std::deque<Big> big;    // libstdc++ block = max(512 bytes, sizeof(T))
                        // so ONE element per block: the map grows per push,
                        // and deque degenerates to a vector of pointers.
// For elements larger than ~512 bytes, deque loses most of its advantage.

// Sliding-window maximum: the canonical deque algorithm
std::deque<std::size_t> window;                 // holds INDICES
std::vector<int> out;
for (std::size_t i = 0; i < nums.size(); ++i) {
    while (!window.empty() && window.front() + k <= i) window.pop_front();
    while (!window.empty() && nums[window.back()] <= nums[i]) window.pop_back();
    window.push_back(i);
    if (i + 1 >= k) out.push_back(nums[window.front()]);
}
// O(n) total: each index is pushed once and popped at most once.`
      },
      {
        title: "list and forward_list: When Node-Based Actually Wins",
        content:
          "std::list is a doubly linked list and forward_list is singly linked, and both trade locality for two guarantees vector cannot give: every iterator, pointer, and reference remains valid for the object's whole lifetime regardless of what else is inserted or erased, and splicing moves elements between lists in constant time without touching the elements themselves. Those guarantees are the only reasons to choose them. The complexity table is misleading because O(1) insertion assumes you already hold an iterator to the position, and finding that position is O(n) with a cache miss per node. Benchmarks consistently show vector beating list even for middle insertion up to several thousand elements, because the memmove of contiguous bytes is faster than traversing the pointers. Legitimate uses are LRU caches, where you hold iterators in a hash map and splice on access, and intrusive lists in kernels and allocators.",
        codeExample: `// The guarantee that justifies list: permanent iterator stability
std::list<Task> tasks;
auto handle = tasks.insert(tasks.end(), Task{"build"});
tasks.push_front(Task{"fetch"});
tasks.push_back(Task{"deploy"});
// 'handle' still refers to the same Task. Any vector operation could
// have invalidated the equivalent.

// splice: O(1) move between lists, no element is copied or moved
std::list<Task> done;
done.splice(done.end(), tasks, handle);    // relinks 3 pointers, that is all
// The Task object never moves in memory; addresses stay valid.

// LRU cache: the textbook case where list genuinely wins
template <class K, class V>
class LRU {
    std::list<std::pair<K, V>> order_;                              // MRU front
    std::unordered_map<K, typename std::list<std::pair<K,V>>::iterator> idx_;
    std::size_t cap_;
public:
    V* get(const K& k) {
        auto it = idx_.find(k);
        if (it == idx_.end()) return nullptr;
        order_.splice(order_.begin(), order_, it->second);   // O(1) promote
        return &it->second->second;
    }
    void put(const K& k, V v) {
        if (auto it = idx_.find(k); it != idx_.end()) {
            it->second->second = std::move(v);
            order_.splice(order_.begin(), order_, it->second);
            return;
        }
        if (idx_.size() == cap_) {
            idx_.erase(order_.back().first);
            order_.pop_back();
        }
        order_.emplace_front(k, std::move(v));
        idx_[k] = order_.begin();       // iterator stays valid forever
    }
};

// Member algorithms exist because the generic ones cannot relink nodes:
std::list<int> l{5, 1, 4, 1, 3};
l.sort();                    // O(n log n) merge sort, relinks - std::sort
                             // cannot be used: it needs random access
l.unique();                  // removes CONSECUTIVE duplicates only
l.remove_if([](int x){ return x > 3; });
l.reverse();                 // O(n) pointer swaps, no element moves

// forward_list: one pointer per node, and the *_after interface
std::forward_list<int> fl{1, 2, 3};
fl.insert_after(fl.before_begin(), 0);   // there is no insert() - you can
                                         // only splice after a known node
// No size() either: it would cost a pointer or an O(n) walk, and the
// committee chose neither.

// The reality check
// 10,000 int insertions at a random position:
//   vector : ~memmove of contiguous bytes, one allocation total
//   list   : one allocation PER element, one cache miss per traversal step
// vector wins by roughly an order of magnitude despite O(n) vs O(1).`,
        diagram: asciiDiagram(`Memory layout is the real complexity

  vector<int>  ── one allocation, one cache line holds 16 ints
  ┌────────────────────────────────────────────────────────┐
  │ 10 │ 20 │ 30 │ 40 │ 50 │ 60 │ 70 │ 80 │ ...            │
  └────────────────────────────────────────────────────────┘
   └──────────── 64-byte cache line ────────────┘
   1 cache miss  ⇒  16 elements available
   hardware prefetcher predicts the next line correctly

  list<int>  ── one allocation PER node, scattered across the heap
      node A            node C                node B
  ┌───────────┐     ┌───────────┐         ┌───────────┐
  │ prev │ ∅  │     │ prev │ ───┼────┐    │ prev │ ───┼──┐
  │ next │ ───┼───┐ │ next │ ∅  │    │    │ next │ ───┼┐ │
  │ data │ 10 │   │ │ data │ 30 │    │    │ data │ 20 ││ │
  └───────────┘   │ └───────────┘    │    └───────────┘│ │
        ▲         └───────────────────────────►        │ │
        └──────────────────────────────────────────────┘ │
                          ◄────────────────────────────  ┘
   1 cache miss PER NODE ⇒ 1 element available
   prefetcher cannot predict the next address
   overhead: 16 bytes of pointers for 4 bytes of payload

  ┌─────────────────────────────────────────────────────────┐
  │  Random middle insertion, 10k elements (typical x86)     │
  │                                                          │
  │  vector  ████                          O(n) memmove      │
  │  list    ████████████████████████████  O(1) + O(n) walk  │
  │                                                          │
  │  The O(1) container is ~10x slower. Asymptotics describe │
  │  operation COUNT; cache misses describe operation COST.  │
  └─────────────────────────────────────────────────────────┘

  Choose list only for:
    ├── permanent iterator/reference stability
    ├── O(1) splice between containers
    └── very large elements where moving is expensive`)
      },
      {
        title: "std::array and Fixed-Size Storage",
        content:
          "std::array<T, N> is a zero-overhead aggregate wrapping a C array, with the size as a template parameter so it is part of the type. It gives you the container interface - begin, end, size, at, iterators that work with algorithms - without any allocation, and it does not decay to a pointer when passed to a function, which is the single biggest safety improvement over a raw array. Because the size is a compile-time constant, sizeof(array<int,4>) is exactly 16 and the object can live on the stack, in static storage, or as a member with no indirection. It is an aggregate, so it uses aggregate initialisation and has no user-declared constructors, which is why array<int,3> a{1,2,3} works but array<int,3> a(1,2,3) does not. For read-only views over any contiguous storage, C++20's std::span is the right companion: it is a pointer and a length with no ownership, and it accepts array, vector, and C arrays uniformly.",
        codeExample: `std::array<int, 4> a{1, 2, 3, 4};
static_assert(sizeof(a) == 4 * sizeof(int));   // no overhead whatsoever
static_assert(a.size() == 4);                  // constexpr

// Unlike a C array, it does not decay:
void takes_c_array(int arr[4]) { /* arr is really int*, sizeof(arr)==8 */ }
void takes_std_array(const std::array<int, 4>& arr) { /* size preserved */ }

// Fully constexpr-usable
constexpr std::array<int, 5> squares = [] {
    std::array<int, 5> r{};
    for (int i = 0; i < 5; ++i) r[i] = i * i;
    return r;
}();
static_assert(squares[3] == 9);

// Aggregate initialisation rules
std::array<int, 3> z{};        // all zero-initialised
std::array<int, 3> p;          // UNINITIALISED for trivial T - reading is UB
std::array<int, 3> q{1};       // {1, 0, 0} - remaining are value-initialised

// C++17 deduction guide
std::array b{1, 2, 3};         // array<int, 3>

// at() checks, operator[] does not
try { a.at(10); } catch (const std::out_of_range&) { /* thrown */ }
// a[10];  // undefined behaviour, no diagnostic

// std::span: a non-owning view over ANY contiguous range (C++20)
void sum_all(std::span<const int> s) {
    std::cout << std::accumulate(s.begin(), s.end(), 0);
}
std::vector<int> v{1,2,3};
int c_arr[] = {4,5,6};
sum_all(a); sum_all(v); sum_all(c_arr);    // all three, no conversion cost
// span carries the length, so the classic "pass a pointer and hope the
// caller also passed the right size" bug disappears.

// Returning an array by value is fine - it is a normal object
std::array<double, 3> normalise(std::array<double, 3> v) {
    double n = std::sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]);
    for (auto& x : v) x /= n;
    return v;                  // NRVO applies
}

// Structured bindings work because it is tuple-like
auto [x, y, zc] = std::array{1, 2, 3};`
      },
      {
        title: "Choosing a Sequence Container in Practice",
        content:
          "The decision procedure is short and should be automatic. Use std::vector unless you have a specific reason not to; it is the default in every serious style guide because contiguity beats asymptotics at realistic sizes and because it is the only sequence container that satisfies C APIs. Use std::array when the size is a compile-time constant, since it removes the allocation entirely. Use std::deque when you need efficient insertion at both ends or reference stability under growth, most commonly for queues. Use std::list only when you need permanent iterator stability or constant-time splice, which in practice means LRU caches and intrusive designs. Never choose list because insertion is O(1) without measuring. The two most valuable habits are calling reserve when the final size is known or estimable, which eliminates all reallocation, and making move constructors noexcept, which is what allows vector to move rather than copy during growth.",
        codeExample: `// Reserve when you know the size - this is the single highest-value habit
std::vector<Result> results;
results.reserve(inputs.size());            // one allocation, zero moves
for (const auto& in : inputs) results.push_back(process(in));

// Without reserve on 1M push_backs (doubling): ~20 reallocations,
// ~2M element moves, and 20 transient peaks of 1.5x memory.

// Return by value; NRVO and move make it free
std::vector<int> build(std::size_t n) {
    std::vector<int> v;
    v.reserve(n);
    for (std::size_t i = 0; i < n; ++i) v.push_back(int(i));
    return v;                              // NRVO: constructed in place
}

// Contiguity is a hard requirement for C interop
void c_api(const int* data, size_t n);
std::vector<int> v = build(10);
c_api(v.data(), v.size());                 // works
// A deque or list cannot do this at all.

// Reference stability without giving up contiguity:
// store indices, or store unique_ptr elements in a vector
std::vector<std::unique_ptr<Node>> nodes;  // Node addresses are stable,
                                           // the vector of pointers is not
Node* n = nodes[0].get();
nodes.push_back(std::make_unique<Node>()); // n is STILL valid

// Shrinking: capacity does not follow size down
std::vector<int> big(1'000'000);
big.clear();                               // size 0, capacity 1,000,000
big.shrink_to_fit();                       // non-binding request
std::vector<int>().swap(big);              // the guaranteed idiom (pre-C++11
                                           // and still the only certain one)

// Quick reference
// ┌ need contiguity / C API        -> vector or array
// ├ size fixed at compile time     -> array
// ├ push/pop at BOTH ends          -> deque
// ├ references must survive growth -> deque, or vector<unique_ptr<T>>
// ├ iterators must survive forever  -> list
// ├ O(1) splice between containers  -> list
// └ anything else                   -> vector`
      }
    ],
    examples: [
      {
        title: "A reference that dangles after push_back",
        input: "std::vector<int> v{1,2,3}; int& first = v[0]; v.push_back(4); then reading first.",
        output: "Undefined behaviour - often the old value, sometimes garbage, sometimes a crash under a sanitiser.",
        explanation:
          "Step 1: push_back finds size equal to capacity, so it must allocate a larger block to preserve contiguity.\nStep 2: Every element is moved from the old block to the new one, the originals are destroyed, and the old block is returned to the allocator.\nStep 3: The reference first was bound to storage inside the old block, which no longer belongs to the vector and may have been reused, so reading through it is undefined.\nStep 4: The failure is treacherous because the freed memory usually still holds the old bytes, so the program appears to work until an unrelated allocation reuses the block or the optimiser exploits the undefined behaviour.\nStep 5: The fixes are to reserve enough capacity up front so no reallocation occurs, to store an index rather than a reference since indices survive reallocation, or to use a deque, which never moves existing elements when it grows."
      },
      {
        title: "A vector of a type whose move is not noexcept",
        input: "A struct with a user-written move constructor lacking noexcept, stored in a vector that grows from 1,000 to 2,000 elements.",
        output: "Every element is copy-constructed rather than move-constructed during the reallocation.",
        explanation:
          "Step 1: vector's reallocation offers the strong exception guarantee, meaning that if anything throws partway through, the original container must be left untouched.\nStep 2: Moving elements out of the old block destroys the source, so a throw partway through would leave some elements moved-from with no way to restore them.\nStep 3: The implementation therefore uses std::move_if_noexcept, which yields an rvalue only when the move constructor is declared noexcept or when the type is not copyable at all, and otherwise yields a const lvalue that selects the copy constructor.\nStep 4: A type holding a string, a vector, or any allocating member therefore performs a full deep copy of every element on every growth, which can be an order of magnitude slower than moving.\nStep 5: The fix is simply to declare the move constructor and move assignment noexcept, which is almost always truthful since a move that only steals pointers cannot throw - and defaulting them when possible gets the correct specification automatically."
      },
      {
        title: "vector<bool> failing to compile in generic code",
        input: "template <class C> void f(C& c) { auto& x = c[0]; x = true; } instantiated with std::vector<bool>.",
        output: "A compile error: cannot bind a non-const lvalue reference to a temporary proxy object.",
        explanation:
          "Step 1: std::vector<bool> is a mandated specialisation that packs elements one bit per element rather than one bool per element, to save space.\nStep 2: A single bit has no address, so operator[] cannot return bool& and instead returns a proxy object that remembers the word and the bit position.\nStep 3: The proxy is returned by value, making it a prvalue, so binding auto& to it is ill-formed - and the deduction auto& x would be attempting to bind a reference to a temporary.\nStep 4: Writing auto x = c[0] compiles but changes the meaning subtly, since x is then a proxy that still refers into the container, so assigning to it modifies the container rather than a local copy.\nStep 5: The practical rules are to avoid vector<bool> in generic code entirely, to use std::deque<bool>, std::vector<char>, or std::bitset when a real addressable boolean sequence is needed, and to remember that this specialisation is widely regarded as a standardisation mistake that could not be removed for compatibility reasons."
      }
    ],
    tips: [
      "Call reserve whenever the final size is known or can be estimated; it converts a logarithmic number of reallocations and a linear number of element moves into a single allocation.",
      "Declare move constructors and move assignment noexcept, because vector's move_if_noexcept silently falls back to copying during growth otherwise.",
      "Store indices rather than iterators or references when a container can grow, since indices remain meaningful across reallocation."
    ],
    tricks: [
      "vector<unique_ptr<T>> gives stable element addresses while keeping the container contiguous, which is often a better answer than switching to list or deque.",
      "std::vector<T>().swap(v) is the only guaranteed way to release a vector's capacity, since shrink_to_fit is explicitly non-binding.",
      "std::stack backed by vector is usually faster than the default deque, because a stack never needs push_front and gains contiguity for free."
    ],
    memoryAids: [
      "Vector by default, array when the size is fixed, deque when you push at both ends, list only for stability or splice.",
      "Capacity is a promise about the future; size is a fact about the present - and only capacity changes invalidate.",
      "O(1) counts operations, cache misses cost time; a linked list wins the table and loses the benchmark."
    ],
    interviewPatterns: [
      "'When would you use list instead of vector?' The wanted answer is iterator stability and O(1) splice, plus the admission that O(1) insertion alone is not a reason.",
      "'What invalidates a vector iterator?' They are probing whether you distinguish reallocation from in-place modification and whether you know deque's asymmetric rules.",
      "Frequency and companies: near-universal in C++ screens at Bloomberg, Google, Amazon, and HFT firms; often followed by an erase-remove or reserve question."
    ],
    practiceProblems: [
      "Why is push_back amortised O(1) rather than O(1)? Answer: a single push_back that triggers reallocation is O(n) because every element must be moved, but geometric growth means reallocation happens only on a logarithmic number of the n insertions, and the total moved-element count across n insertions telescopes to under 2n; dividing that total by n gives constant amortised cost, whereas a fixed-increment growth policy would give O(n) amortised and O(n^2) overall.",
      "You need constant-time access to elements and constant-time removal of arbitrary elements. What structure works? Answer: a vector plus swap-and-pop, where erasing element i swaps it with the last element and pops the back, giving O(1) removal at the cost of destroying order; combine it with a hash map from key to index, updating the moved element's index on each swap, to keep lookups O(1) as well - this is the standard slot-map or sparse-set design.",
      "Why does std::list provide its own sort, remove, and unique member functions? Answer: the generic algorithms operate through iterators and can only permute values, but sorting a list efficiently means relinking nodes rather than moving values, and std::sort additionally requires random access iterators that list does not provide; the member versions relink pointers, run in O(n log n) via merge sort with no element moves at all, and preserve every iterator's association with its element."
    ],
    faq: [
      {
        question: "Why is vector almost always faster than list even when the complexity table says otherwise?",
        answer:
          "Because the complexity table counts operations while the hardware charges for memory access, and on modern CPUs a cache miss costs roughly the same as several hundred arithmetic operations. A vector's elements sit in one contiguous block, so a single cache line fetch delivers sixteen integers and the hardware prefetcher correctly predicts the next line, making iteration nearly free per element. A list allocates each node separately, so consecutive elements are typically far apart in memory, every step of a traversal is a potential cache miss, and the prefetcher cannot help because the next address is only known after the current node has been loaded. The asymptotic advantage of list is also narrower than it looks: insertion is O(1) only if you already hold an iterator to the position, and obtaining that iterator requires an O(n) traversal with a miss per node, whereas vector's O(n) insertion is a memmove of contiguous bytes that the CPU executes at many bytes per cycle. Empirically, vector wins for random middle insertion up to somewhere in the thousands to tens of thousands of elements depending on element size, and it wins by a much larger margin for iteration and lookup at every size. There is also a memory argument: a list node for an int costs sixteen bytes of pointers plus allocator overhead for four bytes of payload, so a list occupies several times the memory and thus suffers proportionally more misses. The correct decision procedure is to choose list for its stability and splice guarantees, never for its insertion complexity alone."
      },
      {
        question: "What exactly invalidates iterators, and how do the rules differ between containers?",
        answer:
          "For vector, any operation that reallocates - push_back or emplace_back beyond capacity, insert, resize upward, reserve to a larger value, shrink_to_fit - invalidates every iterator, pointer, and reference. Operations that do not reallocate invalidate only from the point of modification onward: insert invalidates from the insertion position, erase from the erased position, and both leave earlier elements untouched. Reading operations invalidate nothing. For deque the rules are unusually asymmetric and worth memorising separately: insertion at either end invalidates all iterators but leaves all references and pointers to existing elements valid, because no element is ever moved; insertion or erasure in the middle invalidates everything; erasure at an end invalidates only what refers to the erased element. For list and forward_list, nothing is ever invalidated except iterators and references to elements that are actually erased, and this holds across splice as well, which is the guarantee those containers exist to provide. For the node-based associative containers - map, set, multimap, multiset - the same permanent stability applies, so inserting into a map never invalidates an existing iterator. For unordered containers, rehashing invalidates all iterators but preserves references and pointers, because the elements are nodes that are merely relinked into different buckets. The practical implication is that any code holding an iterator across a modifying operation needs to consult the specific container's rules, and that storing indices is a robust way to avoid the whole class of bug for sequence containers."
      },
      {
        question: "Why is std::vector<bool> considered a mistake?",
        answer:
          "Because it is a mandated specialisation that silently gives vector<bool> different semantics from every other vector, which breaks generic code in ways the type system cannot warn about. To save space it packs elements one bit each rather than one bool each, achieving an eight-fold memory reduction. The cost is that a single bit has no address, so operator[] cannot return bool& and instead returns a proxy object holding a word pointer and a bit mask. That proxy breaks several things at once. You cannot take the address of an element, so &v[0] does not compile and the container is not usable with C APIs. You cannot bind auto& to an element. Writing auto x = v[0] gives you a proxy rather than a bool, so x is an alias into the container rather than an independent copy, and assigning to it modifies the container - a genuinely surprising behaviour that differs from every other container. Generic template code written against the vector interface will fail to compile or, worse, behave differently when instantiated with bool. And the packing means operations are slower per element than on a byte array for anything other than bulk bitwise work. The committee has repeatedly considered deprecating it and has not, because too much code depends on the space saving. The practical guidance is to use std::deque<bool> when you need a growable sequence of real booleans, std::vector<char> or std::vector<uint8_t> when you want contiguity and addressability, and std::bitset when the size is fixed and you actually want bit manipulation with the accompanying bitwise operators."
      },
      {
        question: "When does reserve actually matter, and can it hurt?",
        answer:
          "It matters whenever you are going to push a known or estimable number of elements, and its effect is larger than most people expect. Without it, filling a vector with n elements under a doubling policy performs about log2(n) reallocations and moves close to 2n elements in total, allocating and freeing about log2(n) blocks along the way. With reserve, there is exactly one allocation and exactly n constructions. For elements whose move is expensive, or whose move is not noexcept and therefore becomes a copy, the difference is dramatic. Reserve also eliminates the transient memory spike where both the old and new blocks are live simultaneously, which for a large vector can be one and a half times the final size and can matter under memory pressure. It can hurt in three situations. Reserving far more than you need wastes memory that the vector will not release without an explicit swap trick, since capacity does not shrink automatically. Reserving inside a loop that also pushes can accidentally defeat geometric growth: calling reserve(size() + 1) each iteration forces a reallocation every time, turning amortised constant into quadratic. And reserving a small amount before a large fill provides no benefit while adding a wasted allocation. There is also a correctness note: reserve changes capacity but not size, so the elements do not exist yet and indexing beyond size is still undefined - resize is the operation that creates elements. The rule is to reserve once, with the final count or a good upper bound, immediately before the fill."
      },
      {
        question: "How does deque actually work, and why does it have such odd invalidation rules?",
        answer:
          "A deque maintains a dynamically sized array of pointers, conventionally called the map, where each pointer refers to a separately allocated fixed-size block of elements. The elements within a block are contiguous, but blocks are not contiguous with each other. Growth at either end either uses spare room in the end block or allocates a new block and stores its address in the map, and only when the map itself fills does it get reallocated - but that reallocation moves pointers, not elements. This structure explains every one of the container's properties. Push at either end is O(1) because it touches at most one new block. References and pointers survive growth because no existing element is ever moved, which is the guarantee vector cannot make and the reason deque is the right choice when you need stable addresses under append. Iterators do not survive, because a deque iterator must track both the current block and the position within it as well as a pointer into the map, and map reallocation invalidates that bookkeeping. Indexing is O(1) but requires a division and two dereferences rather than a single offset, so it is measurably slower than vector's. Iteration must check for block boundaries, which prevents the tight pointer-bump loop vector allows. The block size is implementation-defined, and libstdc++ uses the larger of 512 bytes and one element, which means that for elements bigger than 512 bytes each block holds exactly one element and deque degenerates into a vector of pointers with an allocation per element - a good reason to prefer vector<unique_ptr<T>> explicitly for large types rather than relying on deque."
      },
      {
        question: "What is the erase-remove idiom and why is it necessary?",
        answer:
          "Algorithms in the standard library operate on iterator ranges and have no access to the container, so they cannot change a container's size. std::remove and std::remove_if therefore do not remove anything: they partition the range by moving the elements that should be kept toward the front, preserving their relative order, and return an iterator to one past the last kept element. Everything from that iterator to the end is in a valid but unspecified state, typically the moved-from remnants of the elements that were logically removed, and the container's size is unchanged. Actually shrinking the container requires calling its erase member with that returned iterator and end, which is why the idiom is written as a single nested expression: v.erase(std::remove_if(v.begin(), v.end(), pred), v.end()). Forgetting the erase leaves the container the same size with garbage at the tail, which is one of the most common C++ bugs and produces plausible-looking wrong output rather than a crash. The idiom is O(n) with a single pass and no element is moved more than once, which is why it is preferred over erasing in a loop - that would be O(n^2), since each erase shifts the tail. C++20 finally added the free functions std::erase and std::erase_if, which take the container directly and do the whole job in one call, and they should be preferred in new code both for clarity and because they are specialised appropriately for node-based containers. A related trap is that remove_if on a list should be the member remove_if, which relinks rather than moves."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - Containers library, with the per-operation iterator invalidation tables",
        insight: "The authoritative invalidation matrix, which differs subtly between vector, deque, and the node-based containers."
      },
      {
        source: "video",
        attribution: "Chandler Carruth - Efficiency with Algorithms, Performance with Data Structures (CppCon 2014)",
        insight: "The empirical case that contiguity dominates asymptotics for realistic container sizes."
      },
      {
        source: "book",
        attribution: "Scott Meyers - Effective STL, items on container selection, vector<bool>, and the erase-remove idiom",
        insight: "Still the clearest treatment of why the container choice matters more than the algorithm choice."
      }
    ]
  },
  {
    id: "topic-cpp-stl-associative-and-unordered",
    moduleId: "mod-cpp-stl-containers-and-algorithms",
    title: "Associative and Unordered Containers: map, set, and the Hash Variants",
    intuition:
      "C++ ships two families of key-value containers with the same interface and completely different machinery. map and set are balanced binary search trees - red-black trees in every mainstream implementation - giving sorted iteration and logarithmic operations with permanent iterator stability. unordered_map and unordered_set are separate-chaining hash tables giving average constant lookup and no ordering at all. Choosing between them is mostly about whether you need order and whether your keys hash well, and the details that bite in interviews are operator[] silently inserting, the transparent comparator for heterogeneous lookup, and the fact that the unordered containers are required by the standard to use chaining rather than open addressing.",
    complexity: {
      time:
        "map and set: O(log n) for find, insert, erase, and count, with a comparison at every level of the tree; iteration is O(n) in sorted order and each ++ is amortised O(1). unordered_map and unordered_set: O(1) average and O(n) worst case for find, insert, and erase, where the worst case is every key landing in one bucket; rehashing is O(n) and happens when load_factor would exceed max_load_factor. Iteration over an unordered container is O(bucket_count + size), so a container that was once large and is now nearly empty iterates slowly.",
      space:
        "A red-black tree node holds three pointers plus a colour bit plus the key-value pair, typically 48 bytes of overhead for a small pair, and each node is a separate allocation. A hash table holds a bucket array of pointers plus one node per element containing a next pointer, the hash value in most implementations, and the pair - so roughly 16 bytes of overhead per element plus the bucket array, which is sized to keep the load factor at or below one by default."
    },
    lesson: [
      {
        title: "Ordered Containers and the Strict Weak Ordering Contract",
        content:
          "map, set, multimap, and multiset store elements in a balanced binary search tree ordered by a comparator that defaults to std::less. The comparator must define a strict weak ordering, which means it must be irreflexive, antisymmetric, transitive, and have transitive equivalence, and violating this is undefined behaviour that typically manifests as a crash deep inside the tree rather than as wrong ordering. The most common violation is using <= instead of <, which makes the comparator reflexive and lets the tree walk off the end of a node chain. Equivalence in these containers is defined entirely by the comparator - two keys are the same if neither compares less than the other - so operator== is never called and a comparator that ignores a field will treat keys differing only in that field as duplicates. All four containers give permanent iterator and reference stability: inserting or erasing never invalidates anything except iterators to erased elements.",
        codeExample: `std::map<std::string, int> counts;
std::set<Point, PointLess> points;

// Strict weak ordering: irreflexive, antisymmetric, transitive
struct ByAge {
    bool operator()(const Person& a, const Person& b) const {
        return a.age < b.age;          // CORRECT
        // return a.age <= b.age;      // UB: !comp(x,x) is violated
    }
};
// With <=, comp(x, x) is true, the tree believes x < x, and insertion
// or find can walk past the end of a subtree. Typical symptom: a
// segfault or an infinite loop, never a message about the comparator.

// Multi-field ordering: std::tie is the safe way
struct ByLastThenFirst {
    bool operator()(const Person& a, const Person& b) const {
        return std::tie(a.last, a.first) < std::tie(b.last, b.first);
    }
};
// Hand-writing this with nested ifs is where bugs come from; tie
// generates the correct lexicographic comparison automatically.

// Equivalence, not equality, defines uniqueness:
struct ByAgeOnly { bool operator()(const P& a, const P& b) const
                   { return a.age < b.age; } };
std::set<P, ByAgeOnly> s;
s.insert({"alice", 30});
s.insert({"bob",   30});     // REJECTED: neither is less than the other,
                             // so they are equivalent. operator== is
                             // never consulted.

// Ordered-only operations - the reason to choose map over unordered_map
auto lo = counts.lower_bound("m");       // first key >= "m"
auto hi = counts.upper_bound("n");       // first key >  "n"
for (auto it = lo; it != hi; ++it) { /* range query, O(log n + k) */ }
auto [b, e] = counts.equal_range("key"); // both bounds in one walk

// Iteration is sorted, always:
for (const auto& [k, v] : counts) { /* ascending by key */ }
// C++17 structured bindings; before that, it->first and it->second.

// Stability is permanent, unlike every sequence container:
auto it = counts.find("a");
counts.insert({"z", 1});
counts.erase("b");
// 'it' is still valid and still points at "a".

// Custom comparator changes the TYPE:
std::set<int, std::greater<>> descending{3, 1, 2};   // 3, 2, 1
// std::greater<> (the transparent form) rather than std::greater<int>`,
        diagram: asciiDiagram(`Red-black tree vs hash table: what each layout buys

  std::map<K,V>  ── balanced BST, nodes linked by pointers
                        ┌────────┐
                        │  "m"   │ black
                        └───┬────┘
                  ┌─────────┴─────────┐
             ┌────▼───┐          ┌────▼───┐
             │  "d"   │ red      │  "t"   │ red
             └───┬────┘          └───┬────┘
            ┌────┴────┐         ┌────┴────┐
       ┌────▼──┐ ┌────▼──┐ ┌────▼──┐ ┌────▼──┐
       │ "a"   │ │ "g"   │ │ "p"   │ │ "z"   │  black
       └───────┘ └───────┘ └───────┘ └───────┘

    find("g")  :  3 comparisons, 3 pointer chases  ⇒  O(log n)
    iteration  :  in-order walk  ⇒  SORTED, always
    insert     :  rotate/recolour, existing nodes never move
                  ⇒  iterators and references valid FOREVER

  std::unordered_map<K,V>  ── bucket array + singly linked chains
    bucket_count = 8,  hash(k) % 8 selects the chain

    idx  ┌─────┐
     0   │  ∅  │
     1   │  ●──┼──► ["a",1] ──► ["i",9] ──► ∅        collision chain
     2   │  ∅  │
     3   │  ●──┼──► ["g",7] ──► ∅
     4   │  ∅  │
     5   │  ●──┼──► ["m",4] ──► ∅
     6   │  ∅  │
     7   │  ●──┼──► ["z",2] ──► ∅
         └─────┘

    find("g")  :  1 hash + 1 bucket index + walk chain  ⇒  O(1) average
    iteration  :  bucket order  ⇒  UNSPECIFIED, and O(buckets + size)
    rehash     :  when size/buckets > max_load_factor (default 1.0)
                  ⇒  iterators INVALID, references/pointers still valid

  ┌──────────────────────┬───────────────┬─────────────────────┐
  │                      │  map / set    │  unordered_*        │
  ├──────────────────────┼───────────────┼─────────────────────┤
  │ lookup               │  O(log n)     │  O(1) avg, O(n) wc  │
  │ ordered iteration    │  yes          │  no                 │
  │ lower_bound / range  │  yes          │  no                 │
  │ iterator stability   │  permanent    │  broken by rehash   │
  │ needs from key type  │  operator<    │  hash + operator==  │
  │ per-element memory   │  ~48 B ovhd   │  ~16 B + buckets    │
  └──────────────────────┴───────────────┴─────────────────────┘`)
      },
      {
        title: "operator[], insert, emplace, and try_emplace",
        content:
          "map's operator[] is the single most common source of accidental insertion in C++. Reading a key that is absent default-constructs a value, inserts it, and returns a reference to it, so a lookup silently mutates the container - and it cannot be called on a const map at all. at() throws out_of_range instead and works on const maps, and find is the right tool when you want to test presence. The insertion family has grown confusing: insert takes a pair and does nothing if the key exists, emplace constructs the pair in place but may construct and discard it when the key exists, try_emplace constructs the value only if the key is absent and does not move from its arguments otherwise, and insert_or_assign overwrites an existing value while returning the same information. For a map whose value is expensive to construct or move-only, try_emplace is the correct default; insert_or_assign is the correct way to say overwrite.",
        codeExample: `std::map<std::string, std::vector<int>> m;

// operator[] INSERTS on read
if (m["missing"].empty()) { }   // m now contains "missing" -> {}
std::cout << m.size();          // 1, not 0

// The const problem
void report(const std::map<std::string, int>& mm) {
    // return mm["k"];          // ERROR: operator[] is non-const
    return mm.at("k");          // throws std::out_of_range if absent
}

// The idiomatic lookup
if (auto it = m.find("k"); it != m.end()) use(it->second);   // C++17 init
if (m.contains("k")) { }                                     // C++20

// insert: no-op if present, returns {iterator, bool}
auto [it1, inserted] = m.insert({"a", {1,2,3}});
// The pair is constructed BEFORE the call, so the vector is built even
// when the key already exists.

// emplace: constructs in place, but may construct-then-discard
m.emplace("a", std::vector<int>{1,2,3});
// If "a" exists, some implementations still build the node and free it.

// try_emplace (C++17): the fix - value args are untouched when present
std::map<std::string, std::unique_ptr<Big>> cache;
cache.try_emplace(key, std::make_unique<Big>());   // careful: the
// make_unique argument is evaluated regardless. The guarantee is that
// try_emplace does not MOVE FROM its arguments if the key exists:
std::unique_ptr<Big> p = make_big();
auto [it2, ok] = cache.try_emplace(key, std::move(p));
if (!ok) { /* p is STILL VALID - not moved from */ }
// With emplace, p would have been consumed even on failure.

// insert_or_assign (C++17): overwrite, and tell you which happened
auto [it3, was_new] = m.insert_or_assign("a", std::vector<int>{9});
// The old operator[] form m["a"] = v default-constructs then assigns,
// which requires the value type to be default-constructible.

// Counting: the canonical one-liner relies on operator[]'s insertion
std::map<std::string, int> freq;
for (const auto& w : words) ++freq[w];   // value-initialised to 0 first

// C++17 node extraction: move a node between containers, no reallocation
auto node = m.extract("a");
node.key() = "b";              // rename a key WITHOUT reallocating!
m.insert(std::move(node));
// Before C++17 this required erase + insert, copying the value.

// merge: splice all non-conflicting nodes from another map, O(n log n)
std::map<std::string, std::vector<int>> other;
m.merge(other);                // moved nodes leave 'other'; conflicts stay`
      },
      {
        title: "Hashing: Buckets, Load Factor, and Writing a Good Hash",
        content:
          "The unordered containers are specified as separate chaining: a bucket array where each bucket holds a singly linked list of the elements whose hash maps to it. The standard requires bucket interfaces and a reference to local iterators, which effectively mandates chaining and rules out the faster open-addressing designs used by abseil's flat_hash_map or robin-hood tables. Load factor is size divided by bucket count, and when an insertion would push it past max_load_factor - one by default - the container rehashes to a larger bucket count, which invalidates all iterators but preserves references and pointers because the nodes themselves are merely relinked. Writing a hash for your own type means specialising std::hash or passing a functor, and the two rules are that equal keys must hash equally and that the hash should distribute well; combining member hashes with XOR is a common mistake because it makes hash(a,b) equal hash(b,a) and cancels equal fields.",
        codeExample: `std::unordered_map<std::string, int> h;
h.reserve(10'000);              // sets bucket_count so 10k elements fit
                                // under max_load_factor - one rehash, not ~14
h.max_load_factor(0.7f);        // trade memory for fewer collisions

std::cout << h.bucket_count() << ' ' << h.load_factor();

// Custom key: you need BOTH a hash and an equality
struct Point { int x, y; };
struct PointEq  { bool operator()(const Point& a, const Point& b) const
                  { return a.x == b.x && a.y == b.y; } };

struct PointHash {
    std::size_t operator()(const Point& p) const noexcept {
        std::size_t h = std::hash<int>{}(p.x);
        hash_combine(h, p.y);
        return h;
    }
};
std::unordered_set<Point, PointHash, PointEq> pts;

// The boost-derived combiner everyone uses, and why:
inline void hash_combine(std::size_t& seed, std::size_t v) {
    seed ^= v + 0x9e3779b97f4a7c15ULL + (seed << 6) + (seed >> 2);
}
// The golden-ratio constant plus the shifts break the symmetry that
// plain XOR has. With h = hash(x) ^ hash(y):
//   * (1,2) and (2,1) collide - order is lost
//   * (5,5) hashes to 0 - equal fields cancel
// Both are catastrophic for grid coordinates.

// Or specialise std::hash so the default template argument works:
template <> struct std::hash<Point> {
    std::size_t operator()(const Point& p) const noexcept {
        return PointHash{}(p);
    }
};
std::unordered_set<Point> pts2;    // now works with no extra arguments

// The contract, in both directions:
//   a == b   MUST imply   hash(a) == hash(b)      (required)
//   hash(a) == hash(b)    does NOT imply a == b   (that is a collision)
// Violating the first breaks lookup silently: the element is present
// but find() looks in the wrong bucket and reports absence.

// Worst case is real and exploitable:
// libstdc++ hashes size_t identically (hash<size_t> is the identity),
// so inserting multiples of bucket_count puts every key in one bucket
// and turns O(1) into O(n). This is the basis of hash-flooding DoS
// attacks; server code handling untrusted keys should use a seeded
// or keyed hash such as SipHash.

// Iteration cost depends on buckets, not just size:
std::unordered_map<int,int> big;
for (int i = 0; i < 1'000'000; ++i) big[i] = i;
big.clear();                    // size 0, bucket_count still ~1-2 million
for (auto& kv : big) { }        // still walks a million empty buckets
std::unordered_map<int,int>{}.swap(big);   // release the bucket array`,
        diagram: asciiDiagram(`Rehashing: what moves and what survives

  Before: bucket_count 4, size 3, load_factor 0.75, max 1.0

    ┌─────┐
   0│  ●──┼──► node["a"] ──► ∅
   1│  ∅  │
   2│  ●──┼──► node["k"] ──► node["s"] ──► ∅
   3│  ∅  │
    └─────┘
              ▲              ▲
              │              └── Value* p = &m["s"];
              └── iterator it = m.find("k");

  insert("z")  ⇒  load_factor would be 4/4 = 1.0 > max?  no
  insert("q")  ⇒  5/4 = 1.25 > 1.0  ⇒  REHASH to 8 buckets

  ┌────────────────────────────────────────────────────────┐
  │ 1. allocate a new bucket array of 8 pointers           │
  │ 2. for each node: recompute  hash % 8                  │
  │ 3. RELINK the node into its new chain                  │
  │    ── the node object itself is NOT moved or copied    │
  │ 4. free the old bucket array                           │
  └────────────────────────────────────────────────────────┘

    ┌─────┐
   0│  ∅  │
   1│  ●──┼──► node["a"] ──► ∅        same node, new chain
   2│  ∅  │
   3│  ●──┼──► node["s"] ──► ∅
   4│  ∅  │
   5│  ●──┼──► node["q"] ──► ∅
   6│  ●──┼──► node["k"] ──► ∅
   7│  ●──┼──► node["z"] ──► ∅
    └─────┘

  ┌──────────────────────────────────────────────────────────┐
  │  p  (Value*)   ──►  STILL VALID   node was not moved     │
  │  it (iterator) ──►  INVALID       it tracked the bucket  │
  │                                    index and chain link   │
  └──────────────────────────────────────────────────────────┘

  Degenerate case ── every key hashes to the same bucket

    ┌─────┐
   0│  ●──┼──► k1 ──► k2 ──► k3 ──► k4 ──► ... ──► kn ──► ∅
   1│  ∅  │
   2│  ∅  │                  find() walks the whole chain
   3│  ∅  │                  ⇒  O(n), not O(1)
    └─────┘

  Causes: identity hash on adversarial keys, XOR-combined
  symmetric fields, or a hash that ignores high bits.`)
      },
      {
        title: "Heterogeneous Lookup and Transparent Comparators",
        content:
          "Looking up a std::string key in a map<std::string, V> with a const char* or a string_view normally constructs a temporary std::string, which allocates for anything longer than the small-string buffer. C++14 added transparent comparators to fix this: if the comparator type has a nested is_transparent typedef, the container exposes template overloads of find, count, lower_bound, upper_bound, equal_range, and in C++20 contains, that accept any type comparable with the key. The diamond-bracket forms std::less<> and std::greater<> provide is_transparent, so declaring map<string, V, less<>> is enough. C++20 extended the same mechanism to the unordered containers, where the hash functor must also declare is_transparent and must hash the alternative types consistently with the key type. This is a pure performance feature, but it is a large one in string-heavy code and it appears frequently in interviews as a follow-up to how do you avoid allocations.",
        codeExample: `// Without transparency: every lookup allocates
std::map<std::string, int> plain;
plain.find("hello");        // constructs std::string("hello") - may allocate

// With transparency: no temporary at all
std::map<std::string, int, std::less<>> fast;
fast.find("hello");                        // compares const char* directly
fast.find(std::string_view{"hello", 5});   // and string_view

// Why it needs opting into: without is_transparent, the container's
// find takes const key_type&, forcing the conversion. The transparent
// overloads are template<class K> find(const K&) and are only declared
// when Compare::is_transparent exists.
struct MyLess {
    using is_transparent = void;        // the opt-in tag; the type is
                                        // irrelevant, only the name matters
    bool operator()(std::string_view a, std::string_view b) const {
        return a < b;
    }
};
std::map<std::string, int, MyLess> custom;

// C++20 extends it to the unordered containers
struct StringHash {
    using is_transparent = void;
    std::size_t operator()(std::string_view sv) const {
        return std::hash<std::string_view>{}(sv);
    }
    std::size_t operator()(const std::string& s) const {
        return std::hash<std::string_view>{}(s);      // MUST agree
    }
    std::size_t operator()(const char* s) const {
        return std::hash<std::string_view>{}(s);
    }
};
std::unordered_map<std::string, int, StringHash, std::equal_to<>> hfast;
hfast.find("key");            // no std::string constructed
// Both the hash AND the equality must be transparent, and the hash
// must produce identical values for equivalent inputs of any type -
// hashing a string_view and the equal string differently would make
// lookups silently fail.

// Lookup by a projection of the key - the other big use
struct Employee { int id; std::string name; };
struct ById {
    using is_transparent = void;
    bool operator()(const Employee& a, const Employee& b) const { return a.id < b.id; }
    bool operator()(const Employee& a, int id)             const { return a.id < id; }
    bool operator()(int id, const Employee& b)             const { return id < b.id; }
};
std::set<Employee, ById> staff;
staff.find(42);              // find by id without building an Employee

// C++20 contains is also transparent
if (fast.contains("hello")) { }`
      },
      {
        title: "Choosing Between Ordered and Unordered",
        content:
          "Reach for unordered_map by default when you only need lookup, insertion, and erasure by exact key, because average constant time beats logarithmic and the constant factors are competitive. Reach for map when you need any of four things: sorted iteration, range queries through lower_bound and upper_bound, permanent iterator stability across insertion, or a key type that has a natural ordering but no good hash. Three practical caveats temper the default. The standard's chaining requirement makes std::unordered_map noticeably slower than modern open-addressing tables such as absl::flat_hash_map or boost::unordered_flat_map, often by a factor of two or more, so performance-critical code frequently uses a third-party table. Worst-case behaviour is O(n) and is reachable by adversarial input, which matters for anything parsing untrusted data. And for small collections - under roughly thirty elements - a sorted vector with binary search usually beats both, because it is one allocation and one cache-friendly scan.",
        codeExample: `// Default choice for pure key lookup
std::unordered_map<UserId, Session> sessions;

// map when order or ranges matter
std::map<Timestamp, Event> timeline;
auto begin = timeline.lower_bound(start);
auto end   = timeline.upper_bound(stop);
for (auto it = begin; it != end; ++it) replay(it->second);
// unordered_map cannot express this at all without scanning everything.

// map when iterator stability matters across insertion
std::map<Key, Node> graph;
Node* n = &graph[k];
graph[other] = Node{};      // n is STILL valid; unordered_map's rehash
                            // would invalidate iterators (though not n
                            // itself, since references survive)

// The small-collection answer that beats both
class SmallMap {
    std::vector<std::pair<Key, Value>> data_;   // kept sorted
public:
    Value* find(const Key& k) {
        auto it = std::lower_bound(data_.begin(), data_.end(), k,
            [](const auto& p, const Key& kk) { return p.first < kk; });
        return (it != data_.end() && it->first == k) ? &it->second : nullptr;
    }
    void insert(Key k, Value v) {
        auto it = std::lower_bound(data_.begin(), data_.end(), k,
            [](const auto& p, const Key& kk) { return p.first < kk; });
        data_.insert(it, {std::move(k), std::move(v)});
    }
};
// One allocation, contiguous, no per-node overhead. For n < ~30 the
// binary search plus memmove beats a tree walk or a hash plus chain walk.
// This is what flat_map / boost::container::flat_map provide.

// multimap vs map<K, vector<V>>
std::multimap<Key, Value> mm;               // equal_range gives the group
auto [lo, hi] = mm.equal_range(k);
std::map<Key, std::vector<Value>> grouped;  // usually better: one node per
grouped[k].push_back(v);                    // key, contiguous values

// set operations require SORTED ranges - a reason to keep set/map
std::set<int> a{1,2,3}, b{2,3,4}, out;
std::set_intersection(a.begin(), a.end(), b.begin(), b.end(),
                      std::inserter(out, out.end()));
// The equivalent on unordered_set requires a manual loop over the
// smaller container probing the larger.

// Erase-while-iterating: the C++11 return value makes this safe
for (auto it = sessions.begin(); it != sessions.end(); ) {
    if (it->second.expired()) it = sessions.erase(it);   // returns next
    else                      ++it;
}
std::erase_if(sessions, [](const auto& kv) { return kv.second.expired(); });`
      }
    ],
    examples: [
      {
        title: "A read that inserts",
        input: "std::map<std::string, int> m; then if (m[\"missing\"] == 0) { } inside a function that only intends to query.",
        output: "The map now contains an entry for \"missing\" mapped to 0, and size() has increased.",
        explanation:
          "Step 1: map::operator[] is specified to return a reference to the mapped value for the key, creating a value-initialised entry when the key is absent.\nStep 2: There is no read-only form of operator[], because returning a reference requires an object to refer to, so the insertion is unavoidable given the interface.\nStep 3: The consequence is that any lookup written with operator[] mutates the container, which corrupts counts, changes iteration, and can cause a size-based branch elsewhere to take the wrong path.\nStep 4: The correct query tools are find, which returns end() for an absent key, at, which throws out_of_range, and C++20's contains, which returns a bool - none of which modify the container.\nStep 5: A useful safeguard is to take const references to maps in functions that only read, since operator[] is non-const and the compiler then rejects the mistake outright."
      },
      {
        title: "A hash that makes lookups fail",
        input: "A Point type whose operator== compares x and y, but whose hash returns std::hash<int>{}(p.x) only, used in an unordered_set.",
        output: "Not a failure at all in this direction - but the reverse mistake, where equality is stricter than the hash's inputs, breaks lookup entirely.",
        explanation:
          "Step 1: The required contract is that equal keys hash equally; hashing only x satisfies it, because two points equal in both x and y are certainly equal in x.\nStep 2: The cost is purely performance: all points sharing an x value land in the same bucket, so a grid of a thousand points in one column degrades to a linear chain walk.\nStep 3: The genuinely broken direction is a hash that uses a field equality ignores, or equality that examines a field the hash does not - for instance a case-insensitive operator== paired with a case-sensitive hash.\nStep 4: In that case two keys that compare equal can hash differently, so find computes a bucket index the element is not in and reports absence even though the element is present, and insert can create a duplicate.\nStep 5: The symptom is a container that appears to lose elements nondeterministically as the bucket count changes, which is why the hash and the equality must always be derived from exactly the same set of fields."
      },
      {
        title: "A lookup that allocates on every call",
        input: "std::map<std::string, Handler> routes; called in a hot loop as routes.find(path) where path is a const char*.",
        output: "A temporary std::string is constructed and destroyed on every lookup, allocating whenever the path exceeds the small-string buffer.",
        explanation:
          "Step 1: The container's find takes const key_type&, so the const char* must be converted to a std::string to form the argument.\nStep 2: That conversion copies the characters, and for anything longer than roughly fifteen characters on typical implementations it performs a heap allocation and a matching free.\nStep 3: Declaring the map as map<string, Handler, less<>> makes the comparator transparent, because std::less<> has an is_transparent member typedef.\nStep 4: The container then exposes a template overload of find that accepts any type the comparator can compare against the key, so the const char* is compared directly through less<>'s heterogeneous operator() with no temporary at all.\nStep 5: C++20 extends the same mechanism to the unordered containers, where both the hash and the equality functor must declare is_transparent and the hash must produce identical values for a string and the equal string_view, or lookups would silently miss."
      }
    ],
    tips: [
      "Use find, at, or contains for queries and reserve operator[] for the cases where creating a default entry is genuinely what you want, such as frequency counting.",
      "Declare string-keyed maps with std::less<> so heterogeneous lookup avoids constructing a temporary key on every find.",
      "Call reserve on an unordered container when the element count is known, converting a logarithmic number of rehashes into one allocation."
    ],
    tricks: [
      "C++17's extract lets you change a key or move a node between containers without reallocating or copying the value, which was impossible before.",
      "try_emplace does not move from its arguments when the key already exists, making it the only safe insertion for move-only values in a retry loop.",
      "For fewer than about thirty elements a sorted vector with lower_bound beats both map and unordered_map, because one contiguous allocation dominates any asymptotic advantage."
    ],
    memoryAids: [
      "Square brackets on a map are a write, not a read - they always leave something behind.",
      "Ordered containers need one operator<; unordered containers need a hash and an operator==, and the two must look at the same fields.",
      "Rehash breaks iterators but keeps references, because the nodes are relinked rather than moved."
    ],
    interviewPatterns: [
      "'Implement an LRU cache' combines unordered_map for lookup with list for ordering, and tests whether you know that map iterators stay valid.",
      "'What is wrong with hashing a pair by XORing the members?' They want the symmetry and self-cancellation failures plus a correct combiner.",
      "Frequency and companies: extremely common at Google, Bloomberg, Amazon, and Meta; usually followed by 'what is the worst case and can an attacker trigger it?'"
    ],
    practiceProblems: [
      "Why does the standard effectively mandate separate chaining for unordered containers? Answer: the interface exposes bucket_count, bucket(key), bucket_size, and local_iterator ranges over a single bucket, and it guarantees that references and pointers to elements survive a rehash; open addressing stores elements directly in the table and must move them when rehashing or probing, which would break both the local iterator model and the reference stability guarantee, so implementations are boxed into node-based chaining and pay an indirection per element.",
      "You need the k smallest keys greater than some value, repeatedly, from a large collection. Which container? Answer: std::map or std::set, because lower_bound gives the starting position in O(log n) and then k increments walk the sorted order in O(k); an unordered container would require scanning every element to find those greater than the bound, making each query O(n) regardless of k.",
      "How would you make a map lookup by a key's substring without allocating? Answer: declare the map with a transparent comparator - std::less<> or a custom functor with an is_transparent typedef that compares string_views - and pass a std::string_view constructed over the substring; string_view construction is a pointer and a length with no allocation, and the transparent find overload compares it directly against the stored keys."
    ],
    faq: [
      {
        question: "Why does map::operator[] insert, and why is there no const version?",
        answer:
          "Because it returns a reference to the mapped value, and a reference must refer to an object that exists. If the key is absent there is no such object, so the only options were to insert one, to return something signalling absence, or to make the behaviour undefined. The committee chose insertion because it makes the counting idiom - ++freq[word] - work with no special case, and because the alternative of returning a sentinel does not fit the reference return type. There is no const overload for exactly the same reason: inserting into a const container is impossible, and there is nothing meaningful to return for an absent key, so the operation simply is not offered. This produces a useful discipline, since passing maps as const references to functions that only query causes the compiler to reject any accidental operator[] use. The alternatives cover every legitimate case: at performs a checked lookup and throws out_of_range on absence, works on const maps, and is the right choice when absence is an error; find returns an iterator equal to end() for absence and is the right choice when absence is expected, especially with C++17's if-with-initialiser to scope the iterator; contains, added in C++20, answers the presence question directly and reads better than comparing find to end. One further subtlety is that operator[] requires the mapped type to be default-constructible, which insert and try_emplace do not, so a map whose value type has no default constructor cannot use operator[] at all."
      },
      {
        question: "What is the difference between insert, emplace, try_emplace, and insert_or_assign?",
        answer:
          "They differ in when the value is constructed, what happens to your arguments on failure, and whether an existing value is overwritten. insert takes an already-constructed value_type, so the pair exists before the call and is simply discarded if the key is present; it never overwrites. emplace forwards its arguments to construct the value_type in place, which avoids a move for the successful case, but the implementation generally must construct the node before it can know whether the key exists, so on a duplicate it constructs and immediately destroys - and critically, it will have moved from any rvalue arguments you passed. try_emplace, added in C++17, takes the key separately from the value arguments, checks for the key first, and constructs the mapped value only if insertion will happen; the guarantee that matters is that it does not move from its arguments when the key is present, which makes it the only safe choice for move-only values such as unique_ptr in a loop that may hit duplicates. insert_or_assign, also C++17, assigns over an existing value rather than leaving it, and returns a bool telling you which happened, which the old m[k] = v idiom could not; it also avoids requiring the value type to be default-constructible, which operator[] does. The practical guidance is to default to try_emplace when the value is expensive or move-only, use insert_or_assign when overwriting is the intent, use emplace freely for cheap values, and treat plain insert as fine when you already have the pair."
      },
      {
        question: "Why is std::unordered_map slower than modern hash tables like absl::flat_hash_map?",
        answer:
          "Because the standard's interface effectively locks implementations into separate chaining, which is the wrong design for modern hardware. The container is required to expose bucket_count, bucket(key), bucket_size, and local iterators that walk a single bucket, and it guarantees that references and pointers to elements remain valid across a rehash. Both constraints require that each element live in its own node with a stable address and that buckets be lists of such nodes. The consequences are a pointer chase for every lookup even without collisions, a separate allocation per element, poor cache behaviour because nodes are scattered, and typically two cache misses on the critical path - one for the bucket array and one for the node. Open-addressing designs store elements directly in a contiguous array and probe linearly on collision, so a lookup is usually a single cache line touch, and abseil's design goes further by keeping a parallel array of one-byte hash fragments that can be scanned sixteen at a time with SIMD, so most probes never touch the element array at all. The measured difference is commonly two to four times on lookup-heavy workloads, with substantially lower memory use. The trade is exactly what the standard guarantees: open addressing moves elements on rehash and on erase in some designs, so references are not stable, and it has no meaningful notion of a bucket to iterate. If your code needs the standard's stability guarantee, unordered_map is correct; if it does not, and the table is hot, a third-party flat table is usually a large and easy win."
      },
      {
        question: "What is a strict weak ordering, and what happens if my comparator violates it?",
        answer:
          "It is the mathematical contract that the ordered containers and the sorting algorithms require of a comparator. Four properties must hold. Irreflexivity: comp(x, x) must be false. Antisymmetry: if comp(x, y) is true then comp(y, x) must be false. Transitivity: if comp(x, y) and comp(y, z) then comp(x, z). And transitivity of equivalence, where x and y are equivalent when neither compares less than the other - if x is equivalent to y and y to z, then x must be equivalent to z. The overwhelmingly common violation is writing <= instead of <, which breaks irreflexivity immediately. The consequences are undefined behaviour, and crucially the failure mode is not merely wrong ordering. Tree insertion and std::sort both use the comparator to decide when to stop descending or scanning, and a comparator that claims an element is less than itself removes the termination condition, so the code reads or writes past the end of a node chain or a partition. Real symptoms include segmentation faults inside std::sort with a stack trace pointing at library internals, infinite loops, and silently corrupted containers. Debug standard libraries can detect it: libstdc++ with _GLIBCXX_DEBUG and MSVC's iterator debugging both check the comparator and report a clear message, which is worth enabling in test builds precisely because the release-mode symptom is so uninformative. The safest way to write a multi-field comparison is std::tie(a.x, a.y) < std::tie(b.x, b.y), which generates a correct lexicographic ordering automatically, or in C++20 the defaulted operator<=> which does the same."
      },
      {
        question: "When should I use a sorted vector instead of a map?",
        answer:
          "Whenever the collection is small, or is built once and then queried many times without further modification. A sorted vector of pairs supports binary search through std::lower_bound in O(log n) comparisons, exactly like a tree, but with two decisive advantages: the entire collection is one allocation, and the binary search touches a handful of cache lines that are close together, whereas a tree walk touches a different scattered node at every level. For collections under roughly thirty elements the difference is stark - the vector often wins by several times - and even for a few hundred elements a linear scan of contiguous memory can beat a tree. Insertion is the weakness: adding an element in the middle is O(n) because the tail must be shifted, so a workload of interleaved insertions and lookups favours the tree. But two very common patterns avoid that entirely. The build-then-query pattern pushes everything, sorts once in O(n log n), and then only reads, which is strictly better than a map in both time and memory. And the batch-update pattern appends new elements, sorts, and merges periodically rather than maintaining order continuously. The memory argument is also substantial: a red-black tree node carries three pointers and a colour for every element, so a map of small pairs can use three to four times the memory of the equivalent vector, and that multiplies the number of cache misses. Boost and several other libraries provide flat_map and flat_set implementing exactly this, and C++23 added std::flat_map and std::flat_set to the standard for the same reason."
      },
      {
        question: "How do I safely erase elements while iterating over a container?",
        answer:
          "For every standard container, erase returns an iterator to the element following the erased one, and the correct loop uses that return value rather than incrementing. The shape is a for loop with an empty increment clause, where the body either assigns it = c.erase(it) when the element should go or writes ++it when it should stay. Writing c.erase(it) and then ++it is undefined, because the increment operates on an invalidated iterator; and writing c.erase(it++) happens to work for the node-based containers, since the post-increment computes the next iterator before the erase invalidates the current one, but it does not work for vector or deque where the erase invalidates everything from that position onward. The range-based for loop cannot be used at all for erasing, because it holds a hidden iterator it does not let you update. There are cleaner alternatives. For sequence containers the erase-remove idiom does the whole job in one pass without any explicit loop. For every container, C++20's std::erase_if free function takes the container and a predicate and does the right thing per container type, which is both shorter and less error-prone than any hand-written loop. And where the elements to remove can be identified first, collecting keys into a small vector and erasing them afterwards sidesteps the invalidation question entirely at the cost of one extra pass. A final note specific to the associative containers: because their iterators are only invalidated for the erased element, the increment-then-erase order is safe there in a way it never is for vector."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - Associative and unordered associative containers, including the transparent comparator rules",
        insight: "Specifies the is_transparent opt-in and the exact insertion-family guarantees for try_emplace and insert_or_assign."
      },
      {
        source: "video",
        attribution: "Matt Kulukundis - Designing a Fast, Efficient, Cache-friendly Hash Table, Step by Step (CppCon 2017)",
        insight: "Explains why the standard's chaining requirement costs so much and how SIMD-probed open addressing beats it."
      },
      {
        source: "blog",
        attribution: "Boost hash_combine documentation and the hash-flooding DoS literature",
        insight: "Why XOR is an inadequate combiner and why untrusted keys need a seeded hash."
      }
    ]
  },
  {
    id: "topic-cpp-stl-iterators-and-ranges",
    moduleId: "mod-cpp-stl-containers-and-algorithms",
    title: "Iterator Categories, Adaptors, and C++20 Ranges",
    intuition:
      "Iterators are the glue that lets one implementation of sort work on a vector, a deque, and a raw array. The design abstracts a position in a sequence into a small set of operations, and the categories - input, forward, bidirectional, random access, contiguous - describe which operations a given iterator supports and therefore which algorithms can accept it. Understanding the categories explains why std::sort refuses a list, why std::advance is O(n) on some iterators and O(1) on others, and why C++20 rewrote the hierarchy: the old model conflated traversal capability with reference-return semantics, which made proxy iterators impossible to categorise correctly.",
    complexity: {
      time:
        "Advancing an iterator by n is O(1) for random access and contiguous iterators, which support += directly, and O(n) for input, forward, and bidirectional iterators, which must step one at a time - std::advance and std::distance dispatch on the category tag to pick the right implementation. Algorithms inherit this: std::sort requires random access and is O(n log n); std::find is O(n) for any category; std::lower_bound performs O(log n) comparisons on any forward iterator but O(n) iterator advances unless the iterator is random access, so on a std::set it is logarithmic in comparisons and linear in traversal.",
      space:
        "An iterator is normally a pointer or a small struct of a pointer or two, so passing them by value is free. Range adaptors compose into view objects that hold the underlying range's iterators plus any captured callables, so a chain of five adaptors is still a handful of pointers with no allocation - views are non-owning and O(1) to copy by design, which is what distinguishes them from the eager algorithms that materialise a new container."
    },
    lesson: [
      {
        title: "The Five Categories and What They Guarantee",
        content:
          "Input iterators support single-pass reading: you can dereference and increment, but copying one and advancing the copy invalidates the original, so an algorithm may traverse the range only once. Forward iterators add multi-pass, meaning copies are independent and the range can be traversed repeatedly. Bidirectional iterators add decrement, which is what list and map provide. Random access iterators add arithmetic - plus, minus, subscripting, and iterator subtraction to get a distance - which is what vector, deque, and array provide and what std::sort requires. C++17 added contiguous, a refinement of random access asserting that the elements are adjacent in memory so that pointer arithmetic on the addresses is valid, which is what makes span and C-API interop sound. Output iterators are a separate strand for writing only. The category is exposed as a tag type through iterator_traits, and algorithms dispatch on it to pick the best implementation.",
        codeExample: `// The hierarchy, and who provides what
// input        <- istream_iterator, ranges::istream_view
// forward      <- forward_list, unordered_map/set
// bidirectional<- list, map, set, multimap, multiset
// random access<- deque
// contiguous   <- vector, array, string, span, and raw pointers

// Tag dispatch: how advance is O(1) or O(n) depending on the iterator
template <class It>
void advance_impl(It& it, int n, std::random_access_iterator_tag) {
    it += n;                                     // O(1)
}
template <class It>
void advance_impl(It& it, int n, std::bidirectional_iterator_tag) {
    if (n >= 0) while (n--) ++it;                // O(n)
    else        while (n++) --it;
}
template <class It>
void advance_impl(It& it, int n, std::input_iterator_tag) {
    while (n--) ++it;                            // O(n), forward only
}
template <class It>
void my_advance(It& it, int n) {
    advance_impl(it, n, typename std::iterator_traits<It>::iterator_category{});
}

// This is why the same call has different costs:
std::vector<int> v(1000);
std::list<int>   l(1000);
auto vi = v.begin(); std::advance(vi, 500);   // one addition
auto li = l.begin(); std::advance(li, 500);   // 500 pointer chases

// Algorithms state their requirement in the parameter name, and the
// error when you violate it is deep inside the implementation:
std::sort(l.begin(), l.end());
// error: no match for 'operator-' - because sort needs random access
l.sort();                                     // the member version works

// The five traits every iterator must expose
using It = std::vector<int>::iterator;
static_assert(std::is_same_v<std::iterator_traits<It>::value_type, int>);
static_assert(std::is_same_v<std::iterator_traits<It>::reference, int&>);
static_assert(std::is_same_v<std::iterator_traits<It>::difference_type,
                             std::ptrdiff_t>);
static_assert(std::is_same_v<std::iterator_traits<It>::iterator_category,
                             std::random_access_iterator_tag>);
// C++20 adds iterator_concept, which is how contiguous_iterator_tag is
// reported without breaking code that switch-tests the old category.

// Input iterators are single-pass: this is a real trap
std::istream_iterator<int> in(std::cin), eof;
auto copy = in;
++in;                       // 'copy' is now invalid - the stream moved
// std::distance(in, eof) CONSUMES the stream; you cannot then read it.

// Contiguous is what lets you do this soundly:
template <std::contiguous_iterator It>
void to_c_api(It first, It last) {
    c_function(std::to_address(first), last - first);
}`,
        diagram: asciiDiagram(`Iterator categories: capabilities accumulate downward

  ┌─────────────────────────────────────────────────────────────┐
  │ INPUT            *it (read)   ++it        single pass only   │
  │                  ▲                                           │
  │                  │  istream_iterator, ranges::istream_view   │
  └──────────────────┼──────────────────────────────────────────┘
                     │  + multi-pass: copies are independent
  ┌──────────────────▼──────────────────────────────────────────┐
  │ FORWARD          *it   ++it   it1 == it2   copyable          │
  │                  forward_list, unordered_map, unordered_set  │
  └──────────────────┼──────────────────────────────────────────┘
                     │  + step backwards
  ┌──────────────────▼──────────────────────────────────────────┐
  │ BIDIRECTIONAL    --it                                        │
  │                  list, map, set, multimap, multiset          │
  └──────────────────┼──────────────────────────────────────────┘
                     │  + jump by n, subtract, compare with <
  ┌──────────────────▼──────────────────────────────────────────┐
  │ RANDOM ACCESS    it += n   it2 - it1   it[n]   it1 < it2     │
  │                  deque                                       │
  └──────────────────┼──────────────────────────────────────────┘
                     │  + elements are adjacent in memory
  ┌──────────────────▼──────────────────────────────────────────┐
  │ CONTIGUOUS       to_address(it)  usable as a raw pointer     │
  │  (C++17/20)      vector, array, string, string_view, span,   │
  │                  and T* itself                               │
  └─────────────────────────────────────────────────────────────┘

  What each algorithm demands
  ┌────────────────────────┬────────────────────────────────────┐
  │ find, for_each, copy   │  input                             │
  │ replace, fill, unique  │  forward                           │
  │ reverse, rotate        │  bidirectional                     │
  │ sort, nth_element      │  RANDOM ACCESS  ← why list fails   │
  │ stable_sort            │  random access + temp buffer       │
  │ lower_bound            │  forward (log n COMPARISONS,       │
  │                        │  but O(n) STEPS unless random)     │
  └────────────────────────┴────────────────────────────────────┘

  ┌─────────────────────────────────────────────────────────────┐
  │ SEPARATE STRAND ── output iterators: *it = x, ++it, no read │
  │   back_insert_iterator, ostream_iterator, inserter          │
  └─────────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Iterator Adaptors: reverse, insert, move, and stream",
        content:
          "The standard supplies wrappers that change what an iterator does without changing the algorithms that consume it. Reverse iterators traverse backwards and are what rbegin returns; their crucial and confusing property is that a reverse iterator's stored base points one past the element it dereferences, so converting back with base() requires an offset adjustment. Insert iterators turn assignment into insertion, which is how algorithms that cannot resize a container - copy, transform, set_union - can nonetheless grow a destination: back_inserter calls push_back, front_inserter calls push_front, and inserter calls insert at a position. Move iterators make dereferencing yield an rvalue, so a copy algorithm becomes a move algorithm. Stream iterators adapt istream and ostream into ranges, letting algorithms read and write streams directly. All of these are cheap value types with no allocation.",
        codeExample: `std::vector<int> src{1, 2, 3, 4, 5}, dst;

// back_inserter: assignment becomes push_back, so the destination grows
std::copy(src.begin(), src.end(), std::back_inserter(dst));
// Without it: std::copy(src.begin(), src.end(), dst.begin()) writes into
// a container of size 0 - undefined behaviour, not a resize.

std::transform(src.begin(), src.end(), std::back_inserter(dst),
               [](int x) { return x * x; });

// inserter for containers with no push_back
std::set<int> s;
std::copy(src.begin(), src.end(), std::inserter(s, s.end()));

// front_inserter REVERSES the order, which surprises people
std::deque<int> d;
std::copy(src.begin(), src.end(), std::front_inserter(d));   // 5 4 3 2 1

// move_iterator: turn a copy algorithm into a move algorithm
std::vector<std::string> from{"a", "b", "c"}, to;
std::copy(std::make_move_iterator(from.begin()),
          std::make_move_iterator(from.end()),
          std::back_inserter(to));
// 'from' now holds moved-from strings: valid but unspecified.
// std::move(first, last, out) is the shorthand for exactly this.

// reverse_iterator and the base() offset - the classic gotcha
std::vector<int> v{1, 2, 3, 4, 5};
auto rit = std::find(v.rbegin(), v.rend(), 3);   // reverse-find
// *rit == 3, but:
auto fwd = rit.base();                            // points at 4, NOT 3!
assert(*fwd == 4);
assert(*(rit.base() - 1) == 3);                   // the adjustment

// The reason: rend() must map to begin(), so the whole range is shifted
//   forward:  [ 1  2  3  4  5 ]  begin ──►        ◄── end
//   reverse:                     rend  ◄──        ──► rbegin
// A reverse iterator dereferences the element BEFORE its stored base.

// Erasing what a reverse iterator found:
v.erase(std::next(rit).base());     // the idiomatic form
// or v.erase((rit + 1).base());

// Stream iterators: a stream as a range
std::vector<int> nums{std::istream_iterator<int>{std::cin},
                      std::istream_iterator<int>{}};
std::copy(nums.begin(), nums.end(),
          std::ostream_iterator<int>{std::cout, ", "});

// The most vexing parse strikes here:
// std::vector<int> n(std::istream_iterator<int>(std::cin),
//                    std::istream_iterator<int>());
// declares a FUNCTION. Use braces, as above.`
      },
      {
        title: "Writing Algorithms Against Iterators",
        content:
          "Standard algorithms take a half-open range [first, last), where last points one past the end. The convention is not arbitrary: it makes the empty range representable as first equal to last, makes the element count exactly last minus first with no off-by-one, and makes nested ranges compose without special cases. Algorithms are separated into those that only read, those that permute in place, and those that write to an output iterator, and none of them can change a container's size, which is why the erase-remove idiom exists. When writing your own generic algorithm, take iterators by value, use std::iterator_traits to name the value and difference types, dispatch on the category tag when a faster implementation exists for stronger iterators, and prefer the comparator and projection parameters the standard uses rather than hard-coding operator<. In C++20 the same algorithm is far shorter, because concepts state the requirement directly and ranges::algorithms take a range.",
        codeExample: `// Half-open ranges compose and represent emptiness naturally
// [first, last)   size = last - first,   empty when first == last
// Closed ranges would need a sentinel for empty and an off-by-one everywhere.

// A generic algorithm done properly
template <class It, class T, class Compare = std::less<>>
It bounded_find(It first, It last, const T& value, Compare comp = {}) {
    using diff_t = typename std::iterator_traits<It>::difference_type;
    for (diff_t n = std::distance(first, last); n > 0; --n, ++first)
        if (!comp(*first, value) && !comp(value, *first)) return first;
    return last;                     // 'not found' is always last
}

// Category dispatch for a faster path
namespace detail {
    template <class It>
    It middle(It first, It last, std::random_access_iterator_tag) {
        return first + (last - first) / 2;                 // O(1)
    }
    template <class It>
    It middle(It first, It last, std::forward_iterator_tag) {
        It slow = first;                                   // O(n)
        while (first != last && ++first != last) { ++first; ++slow; }
        return slow;                                       // tortoise/hare
    }
}
template <class It> It middle(It first, It last) {
    return detail::middle(first, last,
        typename std::iterator_traits<It>::iterator_category{});
}

// The three algorithm shapes
std::count_if(v.begin(), v.end(), pred);              // reads only
std::sort(v.begin(), v.end());                        // permutes in place
std::copy_if(v.begin(), v.end(), out, pred);          // writes elsewhere

// Algorithms CANNOT resize - remove_if only partitions:
auto new_end = std::remove_if(v.begin(), v.end(), pred);
// [begin, new_end)   the kept elements, order preserved
// [new_end, end())   valid but UNSPECIFIED - moved-from remnants
v.erase(new_end, v.end());                            // the container part
std::erase_if(v, pred);                               // C++20, one call

// Projections (C++20) remove most lambdas from call sites
struct Employee { std::string name; int salary; };
std::vector<Employee> staff;
std::ranges::sort(staff, {}, &Employee::salary);       // by salary
std::ranges::sort(staff, std::greater{}, &Employee::name);
// Pre-C++20 equivalent:
std::sort(staff.begin(), staff.end(),
          [](const auto& a, const auto& b) { return a.salary < b.salary; });

// C++20 sentinels: 'last' need not be the same type as 'first'
struct null_sentinel {
    friend bool operator==(const char* p, null_sentinel) { return *p == '\\0'; }
};
auto len = std::ranges::distance("hello", null_sentinel{});
// A C string becomes a range with no strlen pre-pass.`
      },
      {
        title: "C++20 Ranges and Lazy Views",
        content:
          "Ranges replace the iterator pair at call sites with a single range object, which removes an entire class of bug where begin and end come from different containers, and it enables composition. A view is a range that is cheap to copy and does not own its elements, and the adaptors in std::views - filter, transform, take, drop, reverse, join, split, elements - produce views that are lazy, meaning nothing is computed until you iterate. Composing them with the pipe operator builds a single fused loop rather than a chain of intermediate containers, so filtering and transforming a million elements allocates nothing. The costs are real and worth stating: compile times increase noticeably, error messages remain difficult despite concepts, some adaptors have subtle caching behaviour that makes them non-const-iterable, and dangling views over temporaries are easy to create. Ranges are excellent for expressing pipelines and poor for cases where you need the materialised result anyway.",
        codeExample: `#include <ranges>
namespace rv = std::views;

std::vector<int> v{1,2,3,4,5,6,7,8,9,10};

// Composed, lazy, allocation-free
auto pipeline = v
    | rv::filter([](int x) { return x % 2 == 0; })
    | rv::transform([](int x) { return x * x; })
    | rv::take(3);
for (int x : pipeline) std::cout << x << ' ';     // 4 16 36

// Nothing runs until the loop. The generated code is one pass with the
// filter and transform inlined - no intermediate vectors exist.

// The eager equivalent allocates twice:
std::vector<int> evens, squares;
std::copy_if(v.begin(), v.end(), std::back_inserter(evens), is_even);
std::transform(evens.begin(), evens.end(), std::back_inserter(squares), sq);
squares.resize(3);

// Range algorithms take a range and support projections
std::ranges::sort(v);
std::ranges::sort(v, std::greater{});
auto it = std::ranges::find(v, 7);
bool ok = std::ranges::all_of(v, [](int x) { return x > 0; });

// Dangling protection: borrowed_range stops the classic bug
auto get_vector() -> std::vector<int>;
// auto bad = std::ranges::find(get_vector(), 3);
// 'bad' has type ranges::dangling - USING it is a compile error,
// where the iterator-pair version would have returned a dangling iterator
// into a destroyed temporary with no diagnostic at all.

// Views do not own, so a view over a temporary dangles:
// auto v1 = get_vector() | rv::filter(pred);   // dangling in C++20
// C++23 adds ranges::to for materialising:
// auto owned = get_vector() | rv::filter(pred) | std::ranges::to<std::vector>();

// filter_view is not const-iterable, which surprises people:
auto f = v | rv::filter(is_even);
// void use(const decltype(f)& r) { for (int x : r) {} }   // ERROR
// filter_view caches begin() on first use, so begin() is non-const.

// Useful adaptors in practice
auto keys   = my_map | rv::keys;                  // elements<0>
auto values = my_map | rv::values;                // elements<1>
auto lines  = text   | rv::split('\\n');
auto flat   = nested | rv::join;
auto window = v | rv::drop(2) | rv::take(5);
for (auto [i, x] : v | rv::enumerate) { }         // C++23
for (auto pair : v | rv::adjacent<2>) { }         // C++23

// Infinite ranges become natural
auto first_ten_squares = rv::iota(1)
                       | rv::transform([](int n) { return n * n; })
                       | rv::take(10);`,
        diagram: asciiDiagram(`Eager algorithms vs lazy views

  EAGER ── each step materialises a whole container

   source        copy_if           transform          resize
  ┌──────┐     ┌──────────┐      ┌──────────┐      ┌──────┐
  │1..10 │ ──► │ 2 4 6 8  │ ──►  │ 4 16 36  │ ──►  │4 16  │
  │      │     │    10    │      │  64 100  │      │  36  │
  └──────┘     └──────────┘      └──────────┘      └──────┘
               ALLOCATION        ALLOCATION
               full pass         full pass
   3 passes over the data, 2 heap allocations, 2 temporaries

  LAZY ── adaptors compose into one object, one fused pass

   v | filter(even) | transform(sq) | take(3)
   │
   └─► builds a  take_view< transform_view< filter_view< ref_view > > >
       ┌──────────────────────────────────────────────┐
       │  take_view       count = 3                   │
       │  ┌────────────────────────────────────────┐  │
       │  │ transform_view    fn = sq              │  │
       │  │  ┌──────────────────────────────────┐  │  │
       │  │  │ filter_view    pred = even       │  │  │
       │  │  │  ┌────────────────────────────┐  │  │  │
       │  │  │  │ ref_view  ──►  v           │  │  │  │
       │  │  │  └────────────────────────────┘  │  │  │
       │  │  └──────────────────────────────────┘  │  │
       │  └────────────────────────────────────────┘  │
       └──────────────────────────────────────────────┘
       total size: a few pointers.  ZERO allocations.

   Each  ++it  pulls ONE element through the whole stack:

     1 ─► filter: odd, skip
     2 ─► filter: pass ─► transform: 4  ─► take: yield 4   (count 1)
     3 ─► filter: odd, skip
     4 ─► filter: pass ─► transform: 16 ─► take: yield 16  (count 2)
     5 ─► skip
     6 ─► pass ─► 36 ─► yield 36 (count 3) ─► take: DONE

   elements 7..10 are NEVER examined ── short-circuiting is free

  ┌────────────────────┬─────────────┬──────────────────────┐
  │                    │   eager     │   lazy views         │
  ├────────────────────┼─────────────┼──────────────────────┤
  │ allocations        │  one/stage  │  none                │
  │ passes over data   │  one/stage  │  one, fused          │
  │ early exit         │  no         │  yes, automatically  │
  │ compile time       │  low        │  noticeably higher   │
  │ error messages     │  bad        │  still bad           │
  │ result reusable    │  yes        │  recomputed each pass│
  └────────────────────┴─────────────┴──────────────────────┘`)
      },
      {
        title: "Common Algorithms Worth Knowing by Name",
        content:
          "Interviewers expect fluency with the algorithm catalogue, because reaching for the right one replaces a hand-written loop with a named, correct, and usually faster operation. The partitioning family - partition, stable_partition, nth_element - solves selection problems in linear time where sorting would be n log n. The heap family - make_heap, push_heap, pop_heap, and the priority_queue adaptor built on them - gives you the k-largest and streaming-median patterns. The sorted-range family - lower_bound, upper_bound, equal_range, binary_search, merge, includes, and the set operations - requires a sorted input and silently misbehaves without one. The permutation and rotation utilities solve a surprising number of array-manipulation interview questions in one call. And the numeric header holds accumulate, reduce, inner_product, partial_sum, and the C++17 parallel-friendly variants, where the distinction between accumulate and reduce is that reduce requires associativity and may reorder.",
        codeExample: `std::vector<int> v{5, 2, 8, 1, 9, 3};

// Selection without sorting: O(n) instead of O(n log n)
std::nth_element(v.begin(), v.begin() + 2, v.end());
// v[2] is now the element that would be there if sorted; everything
// before is <= it and everything after is >=. The two halves are
// NOT sorted. This is the median-of-medians / quickselect algorithm.
int median = v[v.size() / 2];

// Partial sort: the k smallest, in order, in O(n log k)
std::partial_sort(v.begin(), v.begin() + 3, v.end());

// Partition: O(n), and stable_partition preserves relative order
auto mid = std::partition(v.begin(), v.end(), [](int x) { return x < 5; });
auto smid = std::stable_partition(v.begin(), v.end(), pred);  // O(n log n)
                                                              // or O(n) with
                                                              // extra memory

// Heaps and the top-k pattern
std::make_heap(v.begin(), v.end());              // O(n), not O(n log n)
std::push_heap(v.begin(), v.end());              // after push_back
std::pop_heap(v.begin(), v.end()); v.pop_back(); // largest to the back
std::priority_queue<int, std::vector<int>, std::greater<>> min_heap;

// Sorted-range algorithms - WRONG ANSWERS on unsorted input, no warning
std::sort(v.begin(), v.end());
auto lo = std::lower_bound(v.begin(), v.end(), 5);   // first >= 5
auto hi = std::upper_bound(v.begin(), v.end(), 5);   // first  > 5
bool found = std::binary_search(v.begin(), v.end(), 5);
std::vector<int> both;
std::set_intersection(a.begin(), a.end(), b.begin(), b.end(),
                      std::back_inserter(both));

// Rotation and permutation - one-call answers to classic questions
std::rotate(v.begin(), v.begin() + 2, v.end());       // left-rotate by 2
std::next_permutation(v.begin(), v.end());            // lexicographic next
std::reverse(v.begin(), v.end());
std::shuffle(v.begin(), v.end(), std::mt19937{std::random_device{}()});
// NOT std::random_shuffle - removed in C++17, it used rand()

// Numeric
int sum  = std::accumulate(v.begin(), v.end(), 0);          // sequential
int prod = std::accumulate(v.begin(), v.end(), 1, std::multiplies<>{});
int par  = std::reduce(std::execution::par, v.begin(), v.end(), 0);
// reduce may REORDER, so the operation must be associative AND
// commutative. accumulate guarantees left-to-right. For floats this
// changes the answer, since floating-point addition is not associative.
std::partial_sum(v.begin(), v.end(), out);                  // prefix sums
std::exclusive_scan(v.begin(), v.end(), out, 0);            // C++17
int dot = std::inner_product(a.begin(), a.end(), b.begin(), 0);

// The accumulate-with-strings trap
std::vector<std::string> words{"a","b","c"};
auto joined = std::accumulate(words.begin(), words.end(), std::string{});
// O(n^2): each += reallocates. Use a reserve + loop, or C++23's
// std::ranges::fold_left with a move-aware operation.`
      }
    ],
    examples: [
      {
        title: "std::sort refusing a std::list",
        input: "std::list<int> l{3,1,2}; std::sort(l.begin(), l.end());",
        output: "A compile error deep inside the sort implementation, typically about a missing operator- on the iterator type.",
        explanation:
          "Step 1: std::sort is an introsort - quicksort with a heapsort fallback and an insertion-sort finish - and every one of those requires computing midpoints and distances by iterator arithmetic.\nStep 2: A list iterator is bidirectional, supporting only increment and decrement, so the expressions last - first and first + n that sort needs do not exist for it.\nStep 3: The failure surfaces inside the library rather than at the call, because the requirement is expressed only through use in the implementation - in C++20 the ranges::sort version reports it cleanly as an unsatisfied random_access_range constraint.\nStep 4: The fix is std::list's member sort, which performs a merge sort by relinking nodes; it is O(n log n) with no element moves at all, and it preserves every iterator's association with its element.\nStep 5: The general lesson is that node-based containers provide member versions of exactly those algorithms that benefit from relinking - sort, reverse, unique, remove, merge, and splice - and the member version should always be preferred where it exists."
      },
      {
        title: "A reverse iterator's base pointing at the wrong element",
        input: "auto rit = std::find(v.rbegin(), v.rend(), 3); then v.erase(rit.base()).",
        output: "The element after 3 is erased rather than 3 itself.",
        explanation:
          "Step 1: A reverse iterator is implemented as a wrapper around a forward iterator, and it dereferences the element immediately before the one its base refers to.\nStep 2: This offset is forced by the requirement that rend() correspond to begin(): if reverse iterators dereferenced their base directly, rend() would have to point one before begin(), which is not a valid iterator.\nStep 3: Consequently rbegin().base() equals end() and rend().base() equals begin(), and for any reverse iterator rit the expression *rit equals *(rit.base() - 1).\nStep 4: Erasing what a reverse iterator found therefore requires the adjustment v.erase(std::next(rit).base()), which is the idiomatic spelling because it also works for bidirectional iterators where rit + 1 is unavailable.\nStep 5: The same offset explains why converting a reverse range to a forward range swaps and shifts both ends, and it is worth drawing the two number lines once rather than trying to reason about it each time."
      },
      {
        title: "A view that dangles over a temporary",
        input: "auto evens = make_vector() | std::views::filter(is_even); then iterating evens.",
        output: "Undefined behaviour - the vector is destroyed at the end of the declaration and the view refers to freed storage.",
        explanation:
          "Step 1: Views are non-owning by design, which is what makes them cheap to copy and composable without allocation.\nStep 2: Piping a prvalue container into an adaptor produces a view whose lifetime is independent of the temporary, and the temporary is destroyed at the end of the full expression that created it.\nStep 3: Iterating the view afterwards therefore reads through iterators into a destroyed vector, which is the same class of bug as returning a reference to a local.\nStep 4: C++20 partially guards the equivalent mistake in algorithms through borrowed_range, which makes ranges::find over a temporary return the special type ranges::dangling so that using the result is a compile error rather than undefined behaviour, but the view case is not caught the same way.\nStep 5: The fixes are to bind the container to a named variable first so it outlives the view, or to materialise the result with C++23's ranges::to, which produces an owning container from the pipeline."
      }
    ],
    tips: [
      "Prefer the member sort, unique, remove, and reverse on list and forward_list, because they relink nodes instead of moving elements and preserve iterator associations.",
      "Use back_inserter or inserter whenever an algorithm writes to a container that is not already sized, since algorithms cannot resize their destination.",
      "Bind a container to a named variable before building a view over it; piping a temporary into an adaptor produces a view that dangles immediately."
    ],
    tricks: [
      "std::nth_element answers median and k-th-largest questions in linear time, and partial_sort gives the k smallest in order in O(n log k) - both beat sorting when you do not need the whole order.",
      "make_heap is O(n) rather than O(n log n), which is why building a heap from a vector is cheaper than pushing elements one at a time.",
      "std::rotate solves array-shift and cyclic-permutation questions in one call, and its return value is the new position of the original first element."
    ],
    memoryAids: [
      "Ranges are half-open so that empty is first == last and the count is last - first, with no off-by-one anywhere.",
      "A reverse iterator dereferences one before its base - draw rend at begin and the offset explains itself.",
      "Algorithms permute, containers resize - which is why remove needs erase to finish the job."
    ],
    interviewPatterns: [
      "'Why can't std::sort take a list?' They want random access versus bidirectional, plus the member sort as the fix.",
      "'Find the k largest elements efficiently' should get nth_element, partial_sort, or a bounded min-heap rather than a full sort.",
      "Frequency and companies: standard at Google, Bloomberg, Meta, and quant firms; often extended into 'now do it lazily with ranges'."
    ],
    practiceProblems: [
      "Why is lower_bound O(log n) comparisons but not O(log n) time on a std::set? Answer: the binary search halves the candidate range logarithmically, so the comparison count is logarithmic for any forward iterator, but advancing a bidirectional iterator to a midpoint requires stepping one element at a time, making the traversal linear; this is why set and map provide member lower_bound that walks the tree structure directly in true logarithmic time, and why the free function should not be used on them.",
      "What is the difference between std::accumulate and std::reduce? Answer: accumulate is specified to apply the operation strictly left to right, so it is deterministic for non-associative operations such as floating-point addition and string concatenation, whereas reduce is permitted to reorder and regroup, which is what allows a parallel execution policy; using reduce with a non-associative or non-commutative operation gives an unspecified result, and using it with subtraction or with a mutating lambda is a genuine bug.",
      "How would you remove duplicates from an unsorted vector while preserving first-occurrence order? Answer: iterate once maintaining an unordered_set of seen values and copy through to a write index, which is O(n) average; the std::unique algorithm is wrong here because it only collapses adjacent duplicates and therefore requires a prior sort, which destroys the ordering the question asks to preserve."
    ],
    faq: [
      {
        question: "Why does the standard library use half-open ranges?",
        answer:
          "Because the alternative creates an off-by-one problem at every boundary and cannot represent an empty range without a special case. With [first, last) the size is exactly last minus first, so an empty range is simply first equal to last and needs no sentinel value. With a closed range the empty case would require last to be one before first, which for a pointer to the start of an array is not a valid value to form at all, and the size would be last minus first plus one everywhere. Half-open ranges also compose without adjustment: splitting [a, c) at b gives [a, b) and [b, c) with b appearing once as an end and once as a begin, whereas closed ranges would need b minus one on one side. Every partitioning algorithm - partition, remove, unique, lower_bound - returns a single iterator that simultaneously ends one subrange and begins the next, which only works because the convention is half-open. The same reasoning explains why end() is defined as one past the last element and is legal to form but illegal to dereference: the standard explicitly permits computing the address one past the end of an array precisely so that this convention is well-defined. The convention is not unique to C++ - Python slicing, Rust ranges, and Dijkstra's well-known note on the subject all reach the same conclusion - but C++ leans on it more heavily than most because so much of the library is expressed as iterator pairs."
      },
      {
        question: "What actually changed about iterator categories in C++20?",
        answer:
          "The old hierarchy conflated two independent properties: how you can traverse a range, and what dereferencing gives you back. A forward iterator was required to return a real reference to a real element, which meant that any iterator returning a proxy - vector<bool>'s, or a zip or transform iterator - could not be categorised above input, even when it supported multi-pass traversal and even random access perfectly well. This is why vector<bool>::iterator is technically a random access iterator that violates the forward iterator requirements, and why pre-ranges libraries could not express a proper zip. C++20 separates the two by introducing iterator_concept alongside the legacy iterator_category, and by defining the concepts input_iterator through contiguous_iterator in terms of what operations are valid rather than what dereference returns. The new concepts also formalise sentinels, so the end of a range need not be the same type as the beginning - which lets a null-terminated string be a range without a strlen pre-pass, and lets an input stream end when it hits EOF. The compatibility mechanism is that iterator_traits reports the old category for existing types, so pre-existing code continues to work, while the ranges algorithms consult iterator_concept and can therefore accept proxy iterators that the classic algorithms reject. The contiguous_iterator_tag added in C++17 fits into this too: it formalises what was previously an implementation detail that vector iterators are pointer-like, which is what std::span and std::to_address depend on."
      },
      {
        question: "Are ranges views actually faster, or is it just nicer syntax?",
        answer:
          "They are usually faster for pipelines and never faster for a single operation, and the reason is fusion rather than any per-element cleverness. A chain of eager algorithms materialises an intermediate container at every stage, so filtering then transforming a million elements allocates twice, writes two million elements, and reads the data three times. The equivalent view chain performs one pass, allocates nothing, and short-circuits automatically when a take or a find ends the iteration early, so elements past the cutoff are never examined at all. For pipelines with several stages over large inputs, the difference is substantial. Against that, there are real costs. Compile time increases noticeably, sometimes dramatically for long chains, because each adaptor is a nested class template. The generated code depends heavily on inlining, and a view whose predicate is a non-inlinable function call can be slower than the eager version. Some adaptors carry hidden state - filter_view caches its begin() because finding the first passing element is itself a search, which also makes it non-const-iterable and surprises people. And iterating a view twice recomputes everything, so a pipeline whose result is consumed repeatedly should be materialised. The honest summary is that views are the right tool for expressing a computation that streams once through data, and the wrong tool when you need the result as a container anyway, in which case the eager algorithm with a reserve is both simpler and equally fast."
      },
      {
        question: "When should I use nth_element, partial_sort, or a heap instead of just sorting?",
        answer:
          "Whenever you need only part of the order, because a full sort does asymptotically more work than the question requires. nth_element rearranges the range so that the element at the requested position is the one that would be there after sorting, with everything before it not greater and everything after not less, and it does this in O(n) expected time using the quickselect partition scheme. That makes it the right answer for medians, percentiles, and any single-position query, and it is dramatically faster than sorting for large inputs. partial_sort gives you the k smallest elements in sorted order in O(n log k) by maintaining a heap of size k, which is right when you need the top k ordered, such as leaderboard queries. A priority_queue or a manually maintained heap of size k is the streaming version, appropriate when the input arrives incrementally or does not fit in memory, and it uses O(k) space rather than O(n). make_heap is worth knowing separately because building a heap from an existing range is O(n), not O(n log n), by the standard sift-down argument, so heapifying then popping k times costs O(n + k log n), which beats sorting whenever k is small relative to n. The choice among them comes down to three questions: do you need the elements ordered or just partitioned, do you need one position or a prefix, and does the data arrive all at once or as a stream. Reaching for std::sort when any of these applies is the single most common efficiency mistake in interview answers."
      },
      {
        question: "What is the practical difference between an output iterator and an insert iterator?",
        answer:
          "An output iterator is the general concept of a write-only position: you can assign through it and increment it, but you cannot read from it, compare it meaningfully, or traverse it twice. An insert iterator is a specific adaptor implementing that concept whose assignment operation calls an insertion member on a container rather than writing to existing storage. The distinction matters because algorithms that produce output - copy, transform, copy_if, set_union, merge, partial_sum - write through an output iterator and assume the destination already has room. Passing dst.begin() when dst is empty is undefined behaviour: the algorithm writes past the end of a zero-length container with no diagnostic, and the usual symptom is heap corruption rather than a clean crash. back_inserter wraps the container so that each assignment becomes a push_back, making the destination grow as needed; inserter takes a position and calls insert, which is what associative containers need since they have no push_back; and front_inserter calls push_front, with the side effect of reversing the resulting order because each new element goes before the previous one. All three are cheap value types holding a container pointer and, for inserter, an iterator. The performance note worth remembering is that back_inserter defeats any size-based optimisation the algorithm might otherwise perform, and it triggers the container's normal growth behaviour, so reserving the destination first still helps significantly. ostream_iterator is the other common output adaptor, turning assignment into a stream insertion with an optional delimiter."
      },
      {
        question: "Why do sorted-range algorithms fail silently on unsorted input?",
        answer:
          "Because checking the precondition would cost as much as the operation itself, so the standard makes it the caller's responsibility and declares violation undefined. binary_search, lower_bound, upper_bound, equal_range, merge, includes, and the four set operations all require their input to be sorted with respect to the same comparator that is being passed. On unsorted input, binary_search does not scan linearly and report absence - it halves the range based on comparisons that carry no information, and returns whatever the halving happens to land on, so it can report that a present element is absent or that an absent one is present. The set operations produce partial or duplicated output. Nothing warns you, and small test cases frequently pass by luck, which is why this class of bug reaches production. Three specific traps compound it. The comparator used for the search must be the same one used for the sort - sorting with a lambda and then searching with the default less is a silent mismatch. Sorting by one field and then searching by a different field is the same mistake in disguise. And calling the free lower_bound on a std::set compiles and gives the right answer but takes linear time, because the iterator is bidirectional, so the member version must be used instead. The mitigations are to enable a debug standard library in test builds, which checks sortedness in libstdc++ with _GLIBCXX_DEBUG and in MSVC's iterator debugging, and to assert std::is_sorted in debug builds at the boundaries where sorted data enters your code."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - Iterator library, Algorithms library, and Ranges library",
        insight: "The definitive category requirements table and the per-algorithm iterator requirements."
      },
      {
        source: "video",
        attribution: "Sean Parent - C++ Seasoning (GoingNative 2013), the 'no raw loops' talk",
        insight: "Demonstrates rotate, partition, and stable_partition replacing hand-written loops with correct one-liners."
      },
      {
        source: "book",
        attribution: "Eric Niebler's range-v3 documentation and the C++20 ranges design papers",
        insight: "Explains why views are lazy and non-owning, and where the dangling and const-iteration pitfalls come from."
      }
    ]
  },
  {
    id: "topic-cpp-stl-strings-and-views",
    moduleId: "mod-cpp-stl-containers-and-algorithms",
    title: "std::string, Small String Optimisation, and string_view",
    intuition:
      "Strings dominate the allocation profile of most C++ applications, so understanding what std::string does at each size threshold is directly a performance skill. Every mainstream implementation stores short strings inside the object itself - the small string optimisation - so a fifteen-character string costs no allocation at all, while a sixteen-character one costs a full heap round trip. std::string_view then removes the remaining allocations from the read-only paths by being nothing but a pointer and a length, which is enormously effective and enormously easy to misuse, because a view does not own and does not extend anything's lifetime.",
    complexity: {
      time:
        "Construction, copy, and substr are O(n) in the character count, but the constant differs by an order of magnitude depending on whether SSO applies - a short string copy is a register-width memcpy of the object, while a long one is malloc plus memcpy plus eventual free. Appending is amortised O(1) with the same geometric growth as vector. find is O(n*m) naively in most implementations rather than using a linear-time search, and comparison is O(min(n,m)). string_view construction, copy, substr, and remove_prefix are all O(1) with no allocation whatsoever.",
      space:
        "libstdc++ and MSVC use a 32-byte string object holding a pointer, a size, and a 16-byte buffer, giving 15 characters of inline capacity; libc++ packs the same information into 24 bytes with 22 characters of inline capacity, using the low bit as the long/short flag. A string_view is exactly two words - 16 bytes on a 64-bit platform - and owns nothing, so passing it by value is the correct convention."
    },
    lesson: [
      {
        title: "Small String Optimisation and the Allocation Cliff",
        content:
          "A std::string object must hold a pointer, a size, and a capacity, which is 24 bytes on a 64-bit platform whether or not the string is short. Implementations exploit that space: when the content fits inside the object, they store the characters there and set a flag, avoiding the allocation entirely. The threshold is implementation-defined - fifteen characters on libstdc++ and MSVC, twenty-two on libc++ because it packs more aggressively - and crossing it is a discontinuity, not a gradient. This means a benchmark using short literals can show a function to be allocation-free while production data one character longer triggers a malloc per call. Two practical consequences follow: moving a short string is a copy rather than a pointer steal, so move is not free for short strings, and the object is larger than people expect, so a vector of strings has significant per-element footprint even when empty.",
        codeExample: `#include <string>
static_assert(sizeof(std::string) == 32);   // libstdc++ and MSVC
// libc++ packs into 24 bytes.

std::string a = "short";                    // 5 chars: NO allocation
std::string b = "a string of sixteen";      // 19 chars: heap allocation
// libstdc++/MSVC threshold: 15 characters plus the null terminator
// libc++ threshold: 22 characters

// The layout, conceptually (libstdc++):
// struct string {
//     char*       ptr;      // -> buf when short, -> heap when long
//     size_t      size;
//     union { char buf[16]; size_t capacity; };
// };
// 'short' is detected by ptr == buf, which is why the object is not
// trivially relocatable and why moving still has to check.

// Move is NOT free for short strings:
std::string s1 = "tiny";
std::string s2 = std::move(s1);   // copies 16 bytes; s1 keeps its buffer
std::string l1 = "a much longer string that exceeds the buffer";
std::string l2 = std::move(l1);   // steals the pointer; l1 becomes empty
// After moving a SHORT string, the source is often unchanged rather
// than empty - which is why moved-from is 'valid but unspecified'
// rather than 'guaranteed empty'.

// Reserve works exactly as it does for vector
std::string out;
out.reserve(expected_size);       // one allocation for the whole build
for (const auto& piece : pieces) out += piece;

// The quadratic-concatenation trap
std::string bad;
for (int i = 0; i < 10000; ++i) bad = bad + "x";    // O(n^2): each + makes
                                                    // a new temporary string
std::string good;
good.reserve(10000);
for (int i = 0; i < 10000; ++i) good += 'x';        // O(n) total

// operator+ chains create temporaries; += does not
std::string msg = "user " + name + " did " + action;   // ~3 temporaries
std::string msg2; msg2.reserve(64);
msg2 += "user "; msg2 += name; msg2 += " did "; msg2 += action;

// C++20 gives a fast, allocation-aware formatter
std::string m = std::format("user {} did {}", name, action);

// shrink_to_fit and the capacity that never comes back
std::string big(1'000'000, 'x');
big.clear();                       // size 0, capacity ~1,000,000
big.shrink_to_fit();               // non-binding, but in practice returns
                                   // to SSO on the major implementations
std::string{}.swap(big);           // the guaranteed release`,
        diagram: asciiDiagram(`Small String Optimisation: the same 32 bytes, two meanings

  SHORT  ── "hello"  (5 chars, fits inline)
  ┌────────────────────────────────────────────────────────┐
  │  ptr      │  points at &buf[0]  ── INSIDE this object   │
  ├───────────┼────────────────────────────────────────────┤
  │  size     │  5                                          │
  ├───────────┼────────────────────────────────────────────┤
  │  buf[16]  │ 'h''e''l''l''o' \\0 . . . . . . . . . .      │
  └────────────────────────────────────────────────────────┘
     total cost:  0 allocations,  0 cache misses beyond the object

  LONG  ── "a string that is definitely too long" (36 chars)
  ┌────────────────────────────────────────────────────────┐
  │  ptr      │  ────────────────────────┐                  │
  ├───────────┼──────────────────────────┼─────────────────┤
  │  size     │  36                      │                  │
  ├───────────┼──────────────────────────┼─────────────────┤
  │  capacity │  36                      │  (union'd with   │
  │           │                          │   the buffer)    │
  └───────────┴──────────────────────────┼─────────────────┘
                                          ▼
                         heap ┌──────────────────────────────┐
                              │ 'a'' ''s''t''r''i''n''g' ... │
                              └──────────────────────────────┘
     total cost:  1 malloc + 1 memcpy now,  1 free later,
                  1 extra cache miss on every access

  The cliff, not a slope
  ┌─────────────────────────────────────────────────────────┐
  │ chars:  0 ... 15  │ 16 ... n                            │
  │ cost:   inline    │ malloc + memcpy + free              │
  │         ~2 ns     │ ~50-100 ns                          │
  │                   ▲                                     │
  │                   └── libstdc++ / MSVC boundary          │
  │                       (libc++ moves it to 22)            │
  └─────────────────────────────────────────────────────────┘

  Consequence for move:
    short  ──►  memcpy 32 bytes, source UNCHANGED
    long   ──►  steal pointer,   source becomes empty
  which is exactly why "moved-from" is specified as
  valid-but-unspecified rather than guaranteed-empty.`)
      },
      {
        title: "string_view: What It Buys and What It Costs",
        content:
          "std::string_view is a pointer and a length with no ownership, no null-termination guarantee, and no allocation. It is the correct parameter type for any function that reads a string and does not store it, because it accepts std::string, const char*, a character array, and a substring of any of them without converting or copying. substr on a view is O(1) rather than O(n), and remove_prefix and remove_suffix let you parse by trimming a view rather than building new strings. The dangers all come from the missing ownership. A view over a temporary dangles at the end of the full expression. A view returned from a function that built a string locally dangles immediately. And a view is not guaranteed null-terminated, so passing view.data() to a C function that expects a C string reads past the end. The rule that avoids all three is to treat a view as a borrowed parameter, never as a member and never as a return value unless the source outlives the call.",
        codeExample: `#include <string_view>
static_assert(sizeof(std::string_view) == 16);   // pointer + length

// The right parameter type for read-only string arguments
void log(std::string_view msg);       // by VALUE - it is two words
log("literal");                       // no allocation, no strlen at runtime
log(std::string{"owned"});            // no copy
log(some_string.substr(0, 5));        // ...but see the trap below

// Compare with the alternatives:
void log_a(const std::string& m);     // const char* callers ALLOCATE
void log_b(const char* m);            // std::string callers call c_str,
                                      // and length must be recomputed

// O(1) substring - the big win for parsing
std::string_view sv = "key=value";
auto eq   = sv.find('=');
auto key  = sv.substr(0, eq);         // no allocation
auto val  = sv.substr(eq + 1);        // no allocation
// std::string::substr would allocate twice.

// Trimming in place
std::string_view trim(std::string_view s) {
    while (!s.empty() && std::isspace(s.front())) s.remove_prefix(1);
    while (!s.empty() && std::isspace(s.back()))  s.remove_suffix(1);
    return s;                          // safe: the view's SOURCE is
}                                      // the caller's, and outlives us

// TRAP 1: a view over a temporary
std::string_view bad = std::string("temporary");
// The string dies at the semicolon. 'bad' dangles immediately.
std::string_view also_bad = get_string().substr(0, 3);   // same problem

// TRAP 2: returning a view over a local
std::string_view worse() {
    std::string local = compute();
    return local;                      // dangling on return
}

// TRAP 3: not null-terminated
std::string_view part = std::string_view{"hello world"}.substr(0, 5);
// std::printf("%s", part.data());     // prints "hello world" - reads past
//                                     // the view's end into the literal
std::printf("%.*s", int(part.size()), part.data());   // correct
// Any C API taking a const char* needs a real std::string, or the
// explicit length form.

// TRAP 4: as a class member, it silently becomes an ownership question
struct Config {
    std::string_view name;             // caller MUST keep the source alive
    std::string      owned;            // safe default for a member
};

// The guideline that covers all of it:
//   parameter  -> string_view  (borrowed, scoped to the call)
//   member     -> string       (owned)
//   return     -> string, unless returning a view INTO an argument

// C++20 lets you build a string from any contiguous range of chars
std::string s(sv);                     // explicit - no implicit conversion
                                       // back, to keep the copy visible`
      },
      {
        title: "Searching, Splitting, and Parsing",
        content:
          "std::string's find family returns npos on failure, which is size_type's maximum value, so comparing the result against a signed type or forgetting to check produces spectacular out-of-range accesses. The naive find in most implementations is O(n*m) rather than using Boyer-Moore or Knuth-Morris-Pratt, though C++17 added searcher objects that let you opt into those for repeated searches against the same needle. Splitting has no standard member function before C++20's views::split, so the idiomatic implementations use find in a loop over a string_view, which allocates nothing. Numeric parsing changed significantly in C++17 with from_chars, which is locale-independent, allocation-free, non-throwing, and substantially faster than stoi or istringstream - it returns a struct holding a pointer and an error code and is the correct choice for any performance-sensitive parsing.",
        codeExample: `std::string s = "one,two,three";

// npos is the failure value, and it is the LARGEST size_type
if (auto pos = s.find("two"); pos != std::string::npos) use(pos);
// if (s.find("x") >= 0)   ALWAYS TRUE - npos is huge and unsigned
// int p = s.find("x");    npos truncated to -1 by accident, then used

// Allocation-free splitting over a view
std::vector<std::string_view> split(std::string_view sv, char delim) {
    std::vector<std::string_view> out;
    std::size_t start = 0;
    while (start <= sv.size()) {
        auto end = sv.find(delim, start);
        if (end == std::string_view::npos) { out.push_back(sv.substr(start)); break; }
        out.push_back(sv.substr(start, end - start));
        start = end + 1;
    }
    return out;
}
// The returned views point INTO sv, so sv must outlive the vector.

// C++20 ranges version
for (auto part : s | std::views::split(',')) {
    std::string_view piece{part.begin(), part.end()};
}

// C++17 searchers: pay the preprocessing once, search many times
std::string haystack = load_large_file();
std::string needle   = "target";
std::boyer_moore_searcher bm(needle.begin(), needle.end());
auto it = std::search(haystack.begin(), haystack.end(), bm);   // O(n) after
                                                               // O(m + sigma)
// Plain find is O(n*m) worst case on libstdc++ - fine for short needles,
// bad for repeated searches with long ones.

// from_chars: the fast, non-throwing, locale-free parser (C++17)
std::string_view text = "12345rest";
int value{};
auto [ptr, ec] = std::from_chars(text.data(), text.data() + text.size(), value);
if (ec == std::errc{}) {
    // value == 12345, ptr points at 'r'
} else if (ec == std::errc::invalid_argument) {
} else if (ec == std::errc::result_out_of_range) {
}
// vs std::stoi: throws, allocates a string if given a view, and is
// locale-sensitive. vs istringstream: allocates and is far slower.
// Benchmarks routinely show from_chars 5-10x faster than stoi.

// to_chars is the inverse, and is what std::format uses internally
char buf[32];
auto [end, ec2] = std::to_chars(buf, buf + sizeof buf, 3.14159);

// Case-insensitive comparison has no standard function - write it
bool iequals(std::string_view a, std::string_view b) {
    return a.size() == b.size() &&
           std::equal(a.begin(), a.end(), b.begin(),
                      [](char x, char y) {
                          return std::tolower(static_cast<unsigned char>(x)) ==
                                 std::tolower(static_cast<unsigned char>(y));
                      });
}
// The unsigned char cast matters: passing a negative char to tolower
// is undefined behaviour, and is a real bug on platforms with signed char.

// starts_with / ends_with / contains (C++20)
if (s.starts_with("one") && s.contains("two") && !s.ends_with("four")) { }`,
        diagram: asciiDiagram(`Parsing "name=value; flag" with strings vs views

  WITH std::string ── every piece is an allocation
  ┌──────────────────────────────────────────────────────────┐
  │ input   "name=value; flag"                               │
  │   │                                                      │
  │   ├─ substr(0, 4)   ──►  new string "name"      MALLOC   │
  │   ├─ substr(5, 5)   ──►  new string "value"     MALLOC   │
  │   ├─ substr(12, 4)  ──►  new string "flag"      MALLOC   │
  │   └─ 3 more frees when they go out of scope              │
  └──────────────────────────────────────────────────────────┘

  WITH std::string_view ── every piece is a pointer + length
  ┌──────────────────────────────────────────────────────────┐
  │                                                          │
  │  source buffer (owned elsewhere, must outlive the views) │
  │  ┌───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┬───┐   │
  │  │ n │ a │ m │ e │ = │ v │ a │ l │ u │ e │ ; │   │ f │…  │
  │  └───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┴───┘   │
  │    ▲           ▲   ▲             ▲               ▲       │
  │    │           │   │             │               │       │
  │  key ──────────┘   val ──────────┘        flag ──┘       │
  │  {ptr, 4}          {ptr+5, 5}             {ptr+12, 4}    │
  │                                                          │
  │  0 allocations.  substr is pointer arithmetic.           │
  └──────────────────────────────────────────────────────────┘

  The lifetime rule, drawn
  ┌──────────────────────────────────────────────────────────┐
  │  SAFE                                                    │
  │    std::string owner = read_input();   ─┐ lives          │
  │    auto parts = split(owner, '=');      │ longer         │
  │    use(parts);                         ─┘                │
  │                                                          │
  │  DANGLING                                                │
  │    auto parts = split(read_input(), '='); ← temporary    │
  │                                             dies at the  │
  │    use(parts);                              semicolon    │
  │           ▲                                              │
  │           └── every view now points at freed memory      │
  └──────────────────────────────────────────────────────────┘

  Mnemonic:  a view is a borrowed pointer wearing a size.
             Borrow for the call; never for the object.`)
      },
      {
        title: "Formatting and Conversion",
        content:
          "C++ has accumulated four generations of formatting. The C heritage - printf and friends - is fast and completely type-unsafe, with format string mismatches producing undefined behaviour that compilers only partially diagnose. iostreams are type-safe but verbose, slow because of locale and virtual dispatch, and awkward for anything involving field widths and precision because the manipulators are sticky state. std::stringstream is the traditional way to build formatted strings and allocates repeatedly. C++20's std::format brings Python-style format strings with compile-time checking of the format against the argument types, type safety, extensibility through formatter specialisations, and performance competitive with printf. C++23 adds std::print, which writes directly to a stream without materialising a string. For new code targeting C++20, format is the correct default, and where it is unavailable the fmt library it was standardised from is a drop-in.",
        codeExample: `// C++20 std::format - checked at COMPILE time
std::string s = std::format("{} scored {:.2f} in {} attempts", name, 91.5, 3);
// std::format("{:d}", "text");   // compile error, not UB at runtime

// Positional and named alignment
std::format("{0} {1} {0}", "a", "b");        // "a b a"
std::format("{:>10}", "right");               // right-aligned in 10
std::format("{:*^11}", "mid");                // "****mid****"
std::format("{:#010x}", 255);                 // "0x000000ff"
std::format("{:+.3e}", 1234.5);               // "+1.234e+03"

// Extending it for your own type
template <> struct std::formatter<Point> {
    constexpr auto parse(auto& ctx) { return ctx.begin(); }
    auto format(const Point& p, auto& ctx) const {
        return std::format_to(ctx.out(), "({}, {})", p.x, p.y);
    }
};
std::format("at {}", Point{1, 2});             // "at (1, 2)"

// format_to writes into any output iterator - no string is built
std::vector<char> buf;
std::format_to(std::back_inserter(buf), "{}:{}", host, port);

// C++23 print writes straight to the stream
// std::print("{} items\\n", count);

// The old ways, and why they lose
char cbuf[64];
std::snprintf(cbuf, sizeof cbuf, "%s: %.2f", name.c_str(), value);
// Fast, but: no type checking beyond compiler heuristics, manual
// buffer sizing, and %s with a std::string is undefined behaviour.

std::ostringstream oss;
oss << std::fixed << std::setprecision(2) << name << ": " << value;
std::string result = oss.str();
// Type-safe but allocates, and the manipulators are STICKY:
oss << std::hex << 255 << " " << 16;      // "ff 10" - both in hex!
// Save and restore, or use std::format.

// Numeric conversion, ranked
int  a = std::stoi("42");                  // throws, locale-sensitive
int  b; std::from_chars(p, e, b);          // fastest, no throw, no locale
std::string c = std::to_string(42);        // allocates, locale-free
std::string d = std::format("{}", 42);     // allocates, formats anything

// The locale trap that breaks serialisation:
std::ostringstream os;
os.imbue(std::locale("de_DE.UTF-8"));
os << 3.14;                                // "3,14" - a COMMA
// JSON, CSV, and network protocols written through iostreams under a
// non-C locale silently produce unparseable output. from_chars and
// to_chars are immune because they are specified as locale-independent.

// std::string <-> numeric round trip that is exact for floats (C++17)
char rb[32];
auto [e1, _1] = std::to_chars(rb, rb + sizeof rb, 0.1);
double back; std::from_chars(rb, e1, back);
assert(back == 0.1);                       // shortest round-trip guarantee`
      },
      {
        title: "Unicode, Encodings, and What C++ Does Not Give You",
        content:
          "std::string is a sequence of bytes, not characters. It has no encoding awareness at all, so size returns the byte count, indexing returns a byte, and reversing a UTF-8 string corrupts it. The wide types are worse for portability, because wchar_t is 16 bits on Windows and 32 on Unix, so wstring means different things on different platforms. C++11 added char16_t and char32_t and C++20 added char8_t to make the intent explicit, but the standard library provides essentially no Unicode algorithms - no normalisation, no case folding beyond ASCII, no grapheme cluster segmentation, no collation beyond whatever the locale offers. The codecvt facets that once provided conversion were deprecated in C++17 with no replacement. Practical advice is therefore to store UTF-8 in std::string everywhere, convert at the platform boundary on Windows, and use ICU or a small dedicated library for anything requiring real Unicode semantics.",
        codeExample: `// A string is BYTES, not characters
std::string s = "café";               // UTF-8: 'c' 'a' 'f' 0xC3 0xA9
std::cout << s.size();                // 5, not 4
// s[3] is 0xC3 - half of a code point, meaningless alone
std::reverse(s.begin(), s.end());     // CORRUPTS the encoding

// The character-type zoo
char      c1 = 'a';         // 1 byte, signedness implementation-defined
char8_t   c2 = u8'a';       // C++20, explicitly UTF-8 code unit
char16_t  c3 = u'a';        // UTF-16 code unit
char32_t  c4 = U'a';        // UTF-32 - one code point, but NOT one glyph
wchar_t   c5 = L'a';        // 16 bits on Windows, 32 on Linux/macOS

std::string    utf8  = u8"héllo";     // char8_t literal in C++20
std::u16string utf16 = u"héllo";
std::u32string utf32 = U"héllo";
std::wstring   wide  = L"héllo";      // portability hazard

// Even UTF-32 does not give you "characters":
std::u32string flag = U"\\U0001F1EE\\U0001F1F3";   // one flag emoji
// size() == 2 code points, renders as ONE grapheme cluster.
// "é" can be one code point (U+00E9) or two (U+0065 U+0301) - both
// display identically, compare unequal, and have different sizes.
// Correct comparison requires NFC/NFD normalisation, which the
// standard library does not provide.

// Counting code points in UTF-8 (still not glyphs)
std::size_t count_code_points(std::string_view s) {
    return std::count_if(s.begin(), s.end(), [](char c) {
        return (static_cast<unsigned char>(c) & 0xC0) != 0x80;   // not a
    });                                                          // continuation
}

// Windows boundary conversion - the one place wide strings are required
#ifdef _WIN32
std::wstring to_wide(std::string_view utf8) {
    int n = MultiByteToWideChar(CP_UTF8, 0, utf8.data(), int(utf8.size()),
                                nullptr, 0);
    std::wstring w(n, L'\\0');
    MultiByteToWideChar(CP_UTF8, 0, utf8.data(), int(utf8.size()), w.data(), n);
    return w;
}
#endif
// std::wstring_convert and the codecvt facets did this portably but were
// DEPRECATED in C++17 and removed in C++26, with no standard replacement.

// ASCII-only operations are safe on UTF-8 because every multi-byte
// sequence has the high bit set, so ASCII bytes never appear inside one:
bool starts_with_http(std::string_view s) { return s.starts_with("http"); }
auto parts = split(utf8_line, ',');        // safe - ',' is ASCII

// What actually needs a library (ICU, utf8cpp, Boost.Locale):
//   - case conversion beyond ASCII  (Turkish dotless i, German ß)
//   - normalisation (NFC/NFD/NFKC/NFKD)
//   - grapheme cluster iteration
//   - locale-aware collation and sorting
//   - line breaking and bidirectional text`
      }
    ],
    examples: [
      {
        title: "A string_view over a temporary",
        input: "std::string_view name = get_config().value(\"user\"); then reading name.",
        output: "Undefined behaviour - the configuration object and its string are destroyed at the end of the declaration.",
        explanation:
          "Step 1: get_config returns by value, producing a temporary whose lifetime ends at the semicolon terminating the full expression.\nStep 2: The view is constructed from a string owned by that temporary, and it records only a pointer and a length.\nStep 3: Lifetime extension does not apply, because binding a temporary to a reference extends it but constructing a view from it does not - the view is not a reference in the language's sense.\nStep 4: Reading through the view afterwards accesses freed heap memory, and the usual symptom is stale but plausible data rather than a crash, so the bug survives testing.\nStep 5: The correct forms are to bind the config to a named variable so it outlives the view, or to declare name as a std::string so it owns a copy - and the general rule that avoids this entirely is to use string_view for parameters but never for members or returns."
      },
      {
        title: "A view passed to a C function",
        input: "std::string_view part = full.substr(0, 5); then std::printf(\"%s\\n\", part.data());",
        output: "The whole remainder of the underlying string is printed, or worse, the read runs past the buffer entirely.",
        explanation:
          "Step 1: string_view records a pointer and a length and makes no guarantee that a null terminator follows the last character it covers.\nStep 2: substr on a view is pointer arithmetic on the original buffer, so the character after the view's end is whatever the source contained there, not a null.\nStep 3: printf's %s reads bytes until it finds a null, so it continues past the view's end - printing extra characters when the source is longer, and reading out of bounds when the view covers the tail of a non-terminated buffer.\nStep 4: The correct call uses the precision form %.*s with an int length and the data pointer, which tells printf exactly how many bytes to consume.\nStep 5: For any C API that genuinely requires a null-terminated string, the only safe options are constructing a std::string from the view, which allocates, or arranging for the source to be null-terminated at the right offset - which is why string_view deliberately has no c_str member."
      },
      {
        title: "Quadratic string building",
        input: "A loop of ten thousand iterations doing result = result + chunk.",
        output: "Runtime quadratic in the final length, taking seconds where the correct version takes milliseconds.",
        explanation:
          "Step 1: operator+ on strings returns a new string by value, so each iteration allocates a buffer large enough for the current result plus the chunk and copies both into it.\nStep 2: The old result is then destroyed, so the loop performs an allocation, a full copy of everything accumulated so far, and a free on every iteration.\nStep 3: Summing the copy costs across n iterations gives an arithmetic series proportional to n squared characters copied, which is why the runtime explodes despite each individual operation looking cheap.\nStep 4: Using += instead appends in place, taking advantage of the string's geometric capacity growth, so the total copying is amortised linear and the allocation count is logarithmic.\nStep 5: Adding a reserve with the final size before the loop removes even those reallocations, leaving exactly one allocation and one pass - and where the pieces are known up front, std::format or a single append of a joined range is cleaner still."
      }
    ],
    tips: [
      "Take string parameters as std::string_view by value when the function only reads them, which removes the allocation that a const std::string& forces on const char* callers.",
      "Reserve before building a string in a loop and append with += rather than +, converting quadratic copying into a single allocation.",
      "Use std::from_chars and std::to_chars for numeric conversion in any parsing or serialisation path, because they are locale-independent, non-throwing, and several times faster than the stream and stoi families."
    ],
    tricks: [
      "Passing an unsigned char cast to std::tolower and std::isspace avoids the undefined behaviour that occurs when a negative char is passed on platforms where char is signed.",
      "std::boyer_moore_searcher pays the pattern preprocessing once and turns repeated searches for the same long needle from O(n*m) into O(n).",
      "std::format_to with a back_inserter formats directly into an existing buffer, avoiding the intermediate string that std::format returns."
    ],
    memoryAids: [
      "A string owns; a view borrows - so views belong in parameters, never in members or return types.",
      "SSO is a cliff, not a slope: fifteen characters is free and sixteen is a malloc.",
      "string_view has no c_str because it has no null terminator to promise."
    ],
    interviewPatterns: [
      "'Why take string_view instead of const string&?' They want the const char* caller allocation, the O(1) substr, and the lifetime caveat.",
      "'What does size() return for a UTF-8 string?' A bytes-versus-characters question that separates people who have shipped internationalised code.",
      "Frequency and companies: very common at Google, Bloomberg, and any team doing parsing or serialisation; often followed by 'now show me the dangling case'."
    ],
    practiceProblems: [
      "Why does std::string_view have no c_str member? Answer: c_str must return a pointer to a null-terminated buffer, and a view is only a pointer and a length into storage it does not own, so the character following the view's last one is arbitrary; providing c_str would require either allocating - which would defeat the type's purpose - or lying about termination, so the committee omitted it deliberately and callers needing a C string must construct a std::string.",
      "When is passing const std::string& still the right choice over string_view? Answer: when the function stores the argument, since it will construct a string anyway and taking the reference avoids an extra move; when the function passes the argument to a C API needing null termination; and when the function is virtual or otherwise part of an ABI that cannot change - beyond those, string_view is preferable because it eliminates the temporary that const char* and string_view callers would otherwise construct.",
      "How would you check whether one string is a rotation of another? Answer: verify the lengths match, concatenate the first string with itself, and test whether the second is a substring of that doubled string, since every rotation of s appears as a contiguous window in s+s; using find makes it O(n*m) in the worst case, and wrapping the search in a boyer_moore_searcher or using KMP brings it to O(n)."
    ],
    faq: [
      {
        question: "Should every string parameter become a string_view?",
        answer:
          "Almost every read-only one, yes, with three specific exceptions. The benefit is that a function taking const std::string& forces every caller passing a string literal or a const char* to construct a temporary std::string, which allocates whenever the text exceeds the small-string threshold, and that cost is invisible at the call site. A string_view parameter accepts literals, character arrays, std::string, and substrings of any of them with no conversion at all, and because it is two words it should be taken by value rather than by reference. The exceptions are these. If the function stores the argument - assigning it to a member, pushing it into a container - it needs an owned string regardless, so taking const std::string& lets an lvalue caller share the existing buffer through a copy, and taking std::string by value lets an rvalue caller move; the by-value form is generally preferred. If the function forwards to a C API expecting a null-terminated pointer, a view cannot supply one and you would construct a string inside the function anyway, so taking the string directly is more honest. And if the signature is virtual or otherwise frozen by an ABI commitment, changing it is not free. There is also a subtle migration hazard: changing a parameter from const std::string& to string_view can change overload resolution and can introduce dangling in callers that were previously relying on lifetime extension, so it is worth doing deliberately rather than mechanically."
      },
      {
        question: "How does small string optimisation actually work, and does it matter which implementation I use?",
        answer:
          "A string object must store a data pointer, a size, and a capacity, which occupies three words. SSO reuses those bytes for character data when the content is short enough to fit, avoiding the heap entirely. The implementations differ in how aggressively they pack. libstdc++ and MSVC use a 32-byte object holding a pointer, a size, and a 16-byte union of buffer and capacity, giving fifteen usable characters plus a terminator; the short case is detected by checking whether the pointer equals the address of the internal buffer. libc++ packs into 24 bytes by using the low bit of the first word as a long/short flag and storing the short size in the remaining bits of that byte, yielding twenty-two characters of inline capacity in a smaller object. The difference matters more than it sounds. Code that is allocation-free under libc++ can allocate under libstdc++ for strings of sixteen to twenty-two characters, which covers a great many identifiers, keys, and short field values, so a benchmark on one platform can badly mispredict the other. The pointer-to-self representation also means a string is not trivially relocatable: you cannot memcpy a string object to a new address and expect it to work, which is why containers cannot use realloc for strings and why some high-performance libraries define their own string type specifically to be relocatable. The practical takeaways are to know your target's threshold when tuning, to prefer reserve over relying on SSO for anything variable-length, and to remember that moving a short string copies rather than steals, so move is not the free operation it is for long ones."
      },
      {
        question: "Why is std::format better than iostreams or printf?",
        answer:
          "It combines the type safety of streams with the terseness and speed of printf, and adds compile-time checking that neither had. Against printf, the format string is validated against the argument types at compile time in C++20, so passing an int where the format says string is a compilation error rather than undefined behaviour; there is no need to remember length modifiers; passing a std::string works directly rather than being undefined; and the whole thing is extensible, since defining a formatter specialisation makes your own type usable with the same syntax. Against iostreams, the format string keeps the text and the substitutions together so the intent is readable, whereas a stream expression interleaves them with insertion operators. Formatting options are per-argument rather than sticky stream state, which eliminates the classic bug where a std::hex or a setprecision leaks into unrelated later output. It does not depend on locale unless you explicitly ask, so serialisation code cannot silently produce a decimal comma. And it is fast: implementations use to_chars internally with the shortest round-trip float algorithm, and measured throughput is comparable to or better than printf and several times better than ostringstream, partly because there is no virtual dispatch and no locale lookup per character. The remaining costs are that it requires C++20 and a reasonably recent standard library, and that the compile-time checking increases build times slightly. Where the standard version is unavailable, the fmt library it was derived from provides the same interface and works back to C++11."
      },
      {
        question: "What should I actually do about Unicode in C++?",
        answer:
          "Adopt a single internal encoding, make it UTF-8 stored in std::string, convert only at the boundaries, and use a real library for anything requiring linguistic semantics. UTF-8 is the right internal choice because it is the web and file-format default, because it is ASCII-compatible so all your existing byte-oriented code for delimiters and protocol tokens keeps working, and because no multi-byte sequence contains a byte that could be mistaken for an ASCII character, which makes splitting on commas or newlines safe without any decoding. Boundaries are where conversion belongs: on Windows the wide APIs require UTF-16, so convert with MultiByteToWideChar and WideCharToMultiByte at the call, or use the newer UTF-8 manifest option to avoid it entirely; on Unix the system interfaces are byte-oriented and no conversion is needed. Avoid std::wstring for storage, since wchar_t is sixteen bits on Windows and thirty-two elsewhere, making it non-portable by construction. Understand what you are not getting from the standard library: there is no normalisation, so the two encodings of an accented character compare unequal; no case folding outside ASCII, so a naive tolower loop is wrong for German, Turkish, and Greek; no grapheme segmentation, so counting user-perceived characters is not something the standard can do; and no locale-aware collation worth relying on. The codecvt facets that once offered conversion were deprecated in C++17 with no replacement and are being removed. For real Unicode work the choices are ICU, which is comprehensive and heavy, or a focused library such as utf8cpp or Boost.Locale for narrower needs."
      },
      {
        question: "What is the difference between from_chars, stoi, and stringstream for parsing numbers?",
        answer:
          "They differ in speed, error handling, locale dependence, and allocation, and the gaps are larger than most people expect. std::stoi and its relatives take a std::string, so parsing from a string_view or a char buffer requires constructing one, which allocates for anything beyond the SSO threshold. They report failure by throwing, which is expensive when failure is expected rather than exceptional, as in a tolerant parser. And they are locale-sensitive, so a program running under a locale with a comma decimal separator parses differently than one under the C locale, which silently breaks data interchange. std::istringstream is worse on every axis: it allocates for the stream buffer, involves virtual dispatch and locale facet lookups per operation, and benchmarks typically show it an order of magnitude slower than the alternatives, with failure signalled by a stream state flag that is easy to forget to check. std::from_chars, added in C++17, was designed specifically to fix all of this. It takes raw pointers so it works directly on a view or a buffer with no allocation, it is explicitly specified to be locale-independent, it never throws and instead returns a struct with a pointer to the first unparsed character and an error code distinguishing invalid input from overflow, and it is permitted to be implemented with the fastest available algorithm. Measured results commonly show it five to ten times faster than stoi for integers and considerably more than that for floating point. The floating-point overloads additionally guarantee shortest round-trip behaviour when paired with to_chars, so a double written and read back is bit-identical. The one caveat is compiler support: floating-point from_chars arrived later than the integer version in several standard libraries."
      },
      {
        question: "How do I efficiently split a string?",
        answer:
          "The efficient answer is to split into string_views rather than strings, so that no characters are copied and no allocations occur beyond the vector of views itself. The loop is a repeated find of the delimiter starting from the last position, pushing a substr of the view between positions - and because substr on a view is pointer arithmetic, each piece costs nothing. The one thing to be careful about is the lifetime: the resulting views point into the original buffer, so that buffer must outlive them, which makes this the right design when the caller owns the input and the wrong one when the input is a temporary. C++20's views::split expresses the same thing declaratively and lazily, so pieces are produced on demand and a caller that stops early never examines the rest, though converting each piece to a string_view requires a small dance in C++20 that C++23 cleans up. If you genuinely need owned strings - because the pieces will outlive the input - then splitting into views first and constructing strings from them in a second pass is still worthwhile, since you can reserve the vector exactly and avoid the growth reallocations. Two performance notes matter for large inputs: reserving the output vector based on a count of delimiters avoids repeated reallocation, and for splitting on multiple possible delimiters, find_first_of is a single pass whereas repeated find calls per delimiter is not. Finally, avoid the common getline-with-istringstream idiom for anything hot, since it allocates a stream and a string per piece and is roughly an order of magnitude slower than the view-based loop."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - std::string, std::string_view, std::from_chars, std::format",
        insight: "Specifies the locale-independence of the chars conversions and the exact lifetime caveats on views."
      },
      {
        source: "video",
        attribution: "Nicolai Josuttis - std::string_view: The Bumpy Road (CppCon), and Victor Zverovich's fmt talks",
        insight: "Catalogues the dangling and null-termination pitfalls of views and the design goals behind std::format."
      },
      {
        source: "blog",
        attribution: "The UTF-8 Everywhere manifesto",
        insight: "The case for storing UTF-8 in std::string and converting only at platform boundaries."
      }
    ]
  },
  {
    id: "topic-cpp-stl-emplace-comparators-performance",
    moduleId: "mod-cpp-stl-containers-and-algorithms",
    title: "emplace vs insert, Custom Comparators, and Container Performance",
    intuition:
      "The last mile of STL competence is knowing what each interface actually does rather than what its name suggests. emplace is not universally faster than push_back, custom comparators change a container's type and can silently produce undefined behaviour, and the performance of a container is decided far more by allocation count and cache behaviour than by the complexity in the reference. This topic collects the operational knowledge that separates someone who can use the STL from someone who can be trusted to choose correctly under a latency budget.",
    complexity: {
      time:
        "emplace_back and push_back are both amortised O(1); the difference is a single move construction that emplace can avoid when the argument is not already the element type, and nothing at all when it is. A comparator is invoked O(log n) times per tree operation and O(n log n) times per sort, so an expensive comparator - one that allocates, or that compares strings character by character - can dominate the runtime entirely. Allocator choice does not change asymptotics but routinely changes wall time by a factor of two or more in allocation-heavy workloads.",
      space:
        "A stateless comparator or hash is an empty type and is stored as an empty base, costing nothing; a stateful one is stored by value in every container instance. std::pmr containers carry a memory_resource pointer, adding one word per container but removing per-element allocation overhead when backed by a monotonic buffer. The dominant space cost in most container-heavy code is per-node allocator overhead - typically sixteen to thirty-two bytes per allocation - which is why node-based containers use several times the memory of the equivalent vector."
    },
    lesson: [
      {
        title: "emplace vs push: What Is Actually Saved",
        content:
          "push_back takes an already-constructed element and copies or moves it into the container. emplace_back takes constructor arguments and builds the element directly in the container's storage, saving one move when the caller would otherwise have constructed a temporary. That saving is real but small for cheap-to-move types and zero when you already hold an element, since emplace_back(existing) does exactly what push_back(existing) does. Three considerations argue against making emplace the reflexive default. It uses direct initialisation rather than copy initialisation, so it will happily call an explicit constructor that push_back would reject - vector<vector<int>>::emplace_back(10) creates a vector of ten zeros rather than failing. It defeats braced initialiser lists, since a parameter pack cannot deduce one. And on a container that may fail to insert, such as a map, emplace constructs the node before discovering the key exists, which is why try_emplace was added.",
        codeExample: `struct Widget { Widget(int, std::string); };

std::vector<Widget> v;
v.push_back(Widget{1, "a"});      // construct temporary, then MOVE it in
v.emplace_back(1, "a");           // construct directly in place - 1 move saved

Widget w{1, "a"};
v.push_back(w);                   // copy
v.emplace_back(w);                // identical copy - NO saving at all
v.push_back(std::move(w));        // move
v.emplace_back(std::move(w));     // identical move - NO saving

// TRAP 1: emplace uses DIRECT initialisation, so explicit constructors fire
std::vector<std::vector<int>> vv;
// vv.push_back(10);              // ERROR - vector(size_t) is explicit
vv.emplace_back(10);              // COMPILES: appends a vector of 10 zeros

std::vector<std::unique_ptr<int>> ptrs;
// ptrs.push_back(new int(5));    // ERROR - unique_ptr(T*) is explicit. Good.
ptrs.emplace_back(new int(5));    // COMPILES, and LEAKS if the vector's
                                  // reallocation throws before ownership
                                  // is taken. Use make_unique.

// TRAP 2: braced lists cannot be deduced by a parameter pack
struct P { int x, y; };
std::vector<P> ps;
ps.push_back({1, 2});             // works: the parameter type is known
// ps.emplace_back({1, 2});       // ERROR: cannot deduce {1,2}
ps.emplace_back(1, 2);            // works in C++20 (parenthesised aggregate
                                  // init); before that, needs a constructor

// TRAP 3: emplace on a map may construct and discard
std::map<int, ExpensiveValue> m;
m.emplace(key, make_expensive());          // builds the node, then throws
                                           // it away if key exists
m.try_emplace(key, make_expensive());      // does not MOVE FROM the args
                                           // on failure (C++17)

// emplace_back returns a reference in C++17
Widget& back = v.emplace_back(1, "a");
back.configure();

// The honest summary
// ┌ argument is already an element      -> identical, use push_back
// ├ argument is constructor arguments   -> emplace saves one move
// ├ element is expensive to move        -> emplace matters
// ├ element is trivially copyable       -> no measurable difference
// └ readability                          -> push_back states the type

// A genuine win: constructing in place avoids a move that may not exist
std::vector<std::mutex> locks;
// locks.push_back(std::mutex{});  // ERROR: mutex is not movable
locks.emplace_back();              // works - constructed in place
// (though you still cannot RESIZE such a vector, since growth needs moves)`,
        diagram: asciiDiagram(`What push_back and emplace_back actually do

  CASE A ── caller writes a temporary:  v.push_back(Widget{1,"a"})

    caller frame                    vector storage
    ┌───────────────┐               ┌───────────────┐
    │ temporary     │  ──move──►    │  element      │
    │ Widget{1,"a"} │               │               │
    └───────────────┘               └───────────────┘
      1 construct   +   1 move   +   1 destroy

  CASE A' ── same intent:  v.emplace_back(1, "a")

                                    ┌───────────────┐
    args 1, "a"  ─────forward────►  │  element      │
                                    │ constructed   │
                                    │ IN PLACE      │
                                    └───────────────┘
      1 construct                    ← one move and one destroy saved

  CASE B ── caller already has an object:  Widget w; ...

    v.push_back(w)      ─►  1 COPY        ┐
    v.emplace_back(w)   ─►  1 COPY        │ IDENTICAL.
    v.push_back(move(w))─►  1 MOVE        │ emplace saves nothing.
    v.emplace_back(move(w))─► 1 MOVE      ┘

  ┌──────────────────────────────────────────────────────────────┐
  │  The difference is ONE move, and only when the caller would  │
  │  otherwise have built a temporary. For int, pointer, or any  │
  │  trivially copyable type, that move is a register copy and   │
  │  the difference is unmeasurable.                             │
  └──────────────────────────────────────────────────────────────┘

  The safety asymmetry that actually matters

    push_back   ──►  COPY initialisation   ──►  explicit ctors REJECTED
    emplace_back──►  DIRECT initialisation ──►  explicit ctors ACCEPTED

  ┌──────────────────────────────────────────────────────────────┐
  │  vector<vector<int>> vv;                                     │
  │    vv.push_back(10)      ✗ compile error  ← the guard works  │
  │    vv.emplace_back(10)   ✓ appends vector of 10 zeros        │
  │                            ── almost certainly not intended  │
  └──────────────────────────────────────────────────────────────┘`)
      },
      {
        title: "Comparators, Hashes, and Stateful Function Objects",
        content:
          "A comparator is part of a container's type, so set<int> and set<int, greater<>> are unrelated types that cannot be assigned to each other or passed to the same function. Stateless comparators are empty types and cost nothing because implementations store them as an empty base, but a stateful one - a lambda with captures, or a functor holding a reference to a collation table - is stored by value in every container object and is copied whenever the container is. Two rules prevent the common failures. The comparator must implement a strict weak ordering, and violating it is undefined behaviour that typically crashes inside the library rather than producing wrong order. And the comparator or hash must be consistent for the container's whole lifetime, so mutating the state a comparator depends on, or mutating a key through a set iterator, silently corrupts the structure. Since C++20, a defaulted operator<=> generates all six comparison operators correctly and is the right default for value types.",
        codeExample: `// The comparator is part of the TYPE
std::set<int>                    ascending;
std::set<int, std::greater<>>    descending;
// ascending = descending;       // ERROR - unrelated types

// Stateless comparators are free (empty base optimisation)
struct ByLength {
    bool operator()(std::string_view a, std::string_view b) const {
        return std::tie(a.size(), a) < std::tie(b.size(), b);
    }
};
static_assert(std::is_empty_v<ByLength>);
std::set<std::string, ByLength> s;
// sizeof(s) is unchanged by the comparator

// Stateful comparators are stored BY VALUE, per container
struct ByLocale {
    const std::locale* loc;                 // one pointer per container
    bool operator()(const std::string& a, const std::string& b) const {
        return std::use_facet<std::collate<char>>(*loc)
                   .compare(a.data(), a.data()+a.size(),
                            b.data(), b.data()+b.size()) < 0;
    }
};
std::set<std::string, ByLocale> loc_set{ByLocale{&my_locale}};

// A lambda comparator needs its type named (C++20 relaxed this)
auto cmp = [](const P& a, const P& b) { return a.score > b.score; };
std::set<P, decltype(cmp)> ranked(cmp);          // pre-C++20: must pass it
std::set<P, decltype(cmp)> ranked20;             // C++20: lambdas are
                                                 // default-constructible if
                                                 // they capture nothing

// NEVER mutate a key through a set iterator
std::set<P, ByScore> ps;
auto it = ps.begin();
// const_cast<P&>(*it).score = 99;    // CORRUPTS the tree: the node is
                                      // now in the wrong position and
                                      // find() will never locate it.
auto node = ps.extract(it);           // C++17: the correct way
node.value().score = 99;
ps.insert(std::move(node));           // reinserted at the right place

// Hash and equality must examine the SAME fields
struct CI {                                    // case-insensitive key
    using is_transparent = void;
    bool operator()(std::string_view a, std::string_view b) const {
        return std::equal(a.begin(), a.end(), b.begin(), b.end(),
            [](char x, char y) {
                return std::tolower((unsigned char)x) ==
                       std::tolower((unsigned char)y);
            });
    }
};
struct CIHash {
    using is_transparent = void;
    std::size_t operator()(std::string_view s) const {
        std::size_t h = 14695981039346656037ULL;      // FNV-1a
        for (char c : s) {
            h ^= (unsigned char)std::tolower((unsigned char)c);
            h *= 1099511628211ULL;
        }
        return h;
    }
};
std::unordered_set<std::string, CIHash, CI> headers;
// If CIHash forgot the tolower, "Accept" and "accept" would compare
// equal but hash differently - lookups would silently miss.

// C++20: let the compiler write it
struct Version {
    int major, minor, patch;
    auto operator<=>(const Version&) const = default;   // all six operators
    bool operator==(const Version&) const = default;
};
std::set<Version> versions;      // correct strict weak ordering, for free`
      },
      {
        title: "Allocators and std::pmr",
        content:
          "Every standard container takes an allocator template parameter that defaults to std::allocator, which forwards to operator new. The classic allocator model has a serious usability flaw: the allocator is part of the container's type, so a vector using an arena allocator is a different type from a normal vector and cannot be passed to a function expecting one. C++17's polymorphic memory resources fix this by making the allocator hold a pointer to an abstract memory_resource, so std::pmr::vector<int> is one type regardless of where its memory comes from. The provided resources cover the common cases: monotonic_buffer_resource allocates by bumping a pointer and frees nothing until destruction, which is ideal for per-request or per-frame work; unsynchronized_pool_resource and synchronized_pool_resource maintain size-class free lists, which helps node-based containers enormously. The typical win is a node-heavy workload where per-node malloc dominates, and the typical gain is two to five times.",
        codeExample: `#include <memory_resource>

// Classic allocators change the TYPE - the usability problem
template <class T> struct ArenaAlloc { /* ... */ };
std::vector<int, ArenaAlloc<int>> arena_vec;
// void f(std::vector<int>&);   // cannot accept arena_vec

// pmr: one type, runtime-selected resource
void process(std::pmr::vector<int>& v);      // accepts ANY resource

// Monotonic: bump a pointer, free nothing until the resource dies
void handle_request(const Request& req) {
    std::byte buffer[64 * 1024];                        // on the STACK
    std::pmr::monotonic_buffer_resource arena{buffer, sizeof buffer};

    std::pmr::vector<std::pmr::string> parts{&arena};
    std::pmr::map<std::pmr::string, int> index{&arena};
    // Every allocation for parts, index, and the strings inside them
    // is a pointer bump into 'buffer'. Zero malloc calls.
    // Nothing is individually freed; the whole arena is discarded
    // when it goes out of scope. Destructors still run.
}
// This pattern - an arena per request, per frame, or per parse - is
// the single most effective allocation optimisation available.

// Pool: size-class free lists, good for node containers
std::pmr::unsynchronized_pool_resource pool;
std::pmr::list<Node> nodes{&pool};
// Each list node comes from a pre-carved chunk rather than malloc.
// 'unsynchronized' means NOT thread-safe - use the synchronized
// variant, or one resource per thread.

// Chaining: fall back to the heap when the buffer is exhausted
std::byte buf[4096];
std::pmr::monotonic_buffer_resource small{buf, sizeof buf,
                                          std::pmr::new_delete_resource()};

// Counting allocations - a genuinely useful debugging resource
class CountingResource : public std::pmr::memory_resource {
    std::pmr::memory_resource* upstream_ = std::pmr::new_delete_resource();
public:
    std::size_t allocations = 0, bytes = 0;
private:
    void* do_allocate(std::size_t n, std::size_t a) override {
        ++allocations; bytes += n;
        return upstream_->allocate(n, a);
    }
    void do_deallocate(void* p, std::size_t n, std::size_t a) override {
        upstream_->deallocate(p, n, a);
    }
    bool do_is_equal(const memory_resource& o) const noexcept override {
        return this == &o;
    }
};

// The gotcha: pmr containers do NOT propagate their allocator on
// copy assignment, and moving between different resources COPIES
std::pmr::vector<int> a{&arena1}, b{&arena2};
b = std::move(a);       // element-wise MOVE, not a pointer steal,
                        // because the resources differ
// Also: a pmr container must not outlive its resource. Storing a
// pmr::string in a long-lived cache while its arena is per-request
// is a use-after-free.`,
        diagram: asciiDiagram(`Where the time actually goes: allocation count dominates

  Workload: build a map of 100k string keys, then look each up once

  ┌────────────────────────────────────────────────────────────┐
  │ std::map<std::string,int>  with std::allocator             │
  │                                                            │
  │  per element:  1 malloc for the tree node                  │
  │                1 malloc for the string (if > SSO)          │
  │  total:        ~200,000 malloc + 200,000 free              │
  │                                                            │
  │  time  ████████████████████████████████████████  100%      │
  │        └──── ~60% is allocator, not tree work ────┘        │
  └────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────┐
  │ std::pmr::map  over a monotonic_buffer_resource            │
  │                                                            │
  │  per element:  1 pointer bump  (node)                      │
  │                1 pointer bump  (string)                    │
  │  total:        0 malloc, 0 free  (one arena teardown)      │
  │                                                            │
  │  time  ██████████████                    ~35%              │
  └────────────────────────────────────────────────────────────┘

  ┌────────────────────────────────────────────────────────────┐
  │ sorted std::vector<pair<string,int>>                       │
  │                                                            │
  │  total:        ~17 reallocs (growth) + string allocs       │
  │  lookup:       binary search over CONTIGUOUS memory        │
  │                                                            │
  │  time  ████████                          ~20%              │
  └────────────────────────────────────────────────────────────┘

  How a monotonic resource works
  ┌────────────────────────────────────────────────────────────┐
  │  buffer  ┌──────────────────────────────────────────────┐  │
  │          │████████████│                                 │  │
  │          └────────────┼─────────────────────────────────┘  │
  │                       ▲                                    │
  │                    cursor                                  │
  │                                                            │
  │  allocate(n)  ──►  p = cursor;  cursor += n;  return p     │
  │                    (plus alignment rounding)               │
  │  deallocate() ──►  NOTHING. It is a no-op.                 │
  │  ~resource()  ──►  release the whole buffer at once        │
  │                                                            │
  │  ⇒ allocation is ~3 instructions instead of a lock,        │
  │    a free-list walk, and possible page faults              │
  └────────────────────────────────────────────────────────────┘

  Optimisation order that actually pays
    1. reserve()                      remove reallocations
    2. reduce allocation COUNT        arena / pool / flat layouts
    3. improve locality               contiguous over node-based
    4. only then: change the algorithm's complexity class`)
      },
      {
        title: "Container Adaptors and Special-Purpose Containers",
        content:
          "stack, queue, and priority_queue are adaptors: they wrap an underlying container and restrict its interface, rather than implementing storage themselves. stack and queue default to deque, and stack is usually faster backed by vector because it never needs push_front and gains contiguity; queue cannot use vector because vector has no pop_front. priority_queue defaults to vector with a max-heap, and getting a min-heap requires passing greater as the comparator, which is the single most common mistake with it. The adaptors deliberately expose no iterators, which is a design choice that prevents violating the invariant but also means you cannot inspect or search them. std::bitset and std::valarray fill narrow niches, and C++23 added std::flat_map and std::flat_set, which finally standardise the sorted-vector design that beats tree-based maps for read-heavy workloads.",
        codeExample: `// Adaptors wrap a container and remove operations
std::stack<int>               s;                       // deque-backed
std::stack<int, std::vector<int>> fast_s;              // usually faster
std::queue<int>               q;                       // deque-backed
// std::queue<int, std::vector<int>>   ERROR: no pop_front

// priority_queue is a MAX-heap by default - the classic surprise
std::priority_queue<int> max_heap;                     // largest on top
std::priority_queue<int, std::vector<int>, std::greater<>> min_heap;
// The comparator answers "does a come BEFORE b in the ordering",
// and the heap puts the LAST element on top. greater<> therefore
// gives a min-heap, which reads backwards until you internalise it.

// Custom priority with a lambda
auto by_deadline = [](const Task& a, const Task& b) {
    return a.deadline > b.deadline;                    // earliest on top
};
std::priority_queue<Task, std::vector<Task>, decltype(by_deadline)>
    schedule(by_deadline);

// Adaptors expose NO iterators - you cannot search or inspect them
// for (auto x : max_heap) {}     // does not compile, by design
// Accessing the underlying container requires the protected member:
template <class T, class C>
const C& container_of(const std::priority_queue<T, C>& pq) {
    struct Hack : std::priority_queue<T, C> {
        static const C& get(const std::priority_queue<T, C>& p) {
            return p.*&Hack::c;
        }
    };
    return Hack::get(pq);
}
// If you need this, you probably wanted a sorted vector or a set.

// The k-largest pattern with a bounded min-heap: O(n log k), O(k) space
std::priority_queue<int, std::vector<int>, std::greater<>> top_k;
for (int x : stream) {
    top_k.push(x);
    if (top_k.size() > k) top_k.pop();     // evict the smallest
}

// bitset: fixed-size, compile-time sized, bit operations
std::bitset<256> flags;
flags.set(42); flags.flip(7);
std::cout << flags.count() << ' ' << flags.any() << ' ' << flags.to_ullong();
// One bit per element with real bitwise operators, unlike vector<bool>.
// Size must be a compile-time constant; use vector<uint64_t> otherwise.

// C++23 flat containers: sorted vectors with the map interface
// std::flat_map<int, std::string> fm;
// One contiguous key vector + one contiguous value vector.
// O(log n) lookup with far better cache behaviour than a tree,
// O(n) insertion. Ideal for build-once, query-many tables.
// boost::container::flat_map has provided this for years.

// std::span (C++20) - a non-owning view over contiguous storage
void process(std::span<const int> data);
process(vec); process(arr); process(std::array{1,2,3});
auto first_half = data.subspan(0, data.size() / 2);    // O(1)
// The right parameter type for "a contiguous sequence of T", exactly
// as string_view is for characters - and with the same lifetime rules.`
      },
      {
        title: "Measuring and Choosing Under a Latency Budget",
        content:
          "The decisions that matter in production are rarely about asymptotic complexity, because the inputs are usually small enough that constant factors dominate. The three levers with the largest measured effect, in order, are reducing allocation count, improving locality, and removing indirection. Reserving containers, using arenas, choosing contiguous layouts, and storing values rather than pointers all attack those. Algorithmic complexity matters at scale, but changing a container from map to unordered_map is usually worth less than eliminating a per-element allocation. The professional discipline is to measure rather than reason: profile to find where the time goes, count allocations with a custom memory resource or a heap profiler, and check cache miss rates with perf or VTune before restructuring. Benchmarks must use realistic data sizes and realistic strings, because SSO and cache effects make small synthetic benchmarks actively misleading.",
        codeExample: `// The measurement discipline, in order of payoff

// 1. Count allocations before optimising them
struct AllocCounter : std::pmr::memory_resource {
    std::size_t count = 0;
    void* do_allocate(std::size_t n, std::size_t a) override {
        ++count;
        return std::pmr::new_delete_resource()->allocate(n, a);
    }
    void do_deallocate(void* p, std::size_t n, std::size_t a) override {
        std::pmr::new_delete_resource()->deallocate(p, n, a);
    }
    bool do_is_equal(const memory_resource& o) const noexcept override {
        return this == &o;
    }
};
AllocCounter counter;
{
    std::pmr::vector<std::pmr::string> v{&counter};
    load(v);
}
std::cout << "allocations: " << counter.count << '\\n';

// 2. Structure of arrays beats array of structures for column access
struct AoS { float x, y, z; int id; std::string name; };
std::vector<AoS> particles;                 // iterating x touches all fields
for (auto& p : particles) p.x += dt;        // loads 40+ bytes per 4 used

struct SoA {
    std::vector<float> x, y, z;
    std::vector<int> id;
    std::vector<std::string> name;
};
SoA soa;
for (auto& xv : soa.x) xv += dt;            // 16 floats per cache line,
                                            // and vectorises cleanly

// 3. Store values, not pointers, when the elements are small
std::vector<Point>                 dense;   // one allocation, contiguous
std::vector<std::unique_ptr<Point>> sparse; // n+1 allocations, n cache misses
// The pointer version is right only when addresses must be stable or
// the objects are polymorphic.

// 4. Reserve is free to write and often the largest single win
results.reserve(inputs.size());

// 5. Hoist expensive comparator work out of the comparison
struct Record { std::string key; };
// BAD: recomputes a transformation on every comparison, O(n log n) times
std::sort(recs.begin(), recs.end(), [](const Record& a, const Record& b) {
    return normalise(a.key) < normalise(b.key);
});
// GOOD: decorate-sort-undecorate - normalise once per element
std::vector<std::pair<std::string, Record*>> keyed;
keyed.reserve(recs.size());
for (auto& r : recs) keyed.emplace_back(normalise(r.key), &r);
std::sort(keyed.begin(), keyed.end(),
          [](const auto& a, const auto& b) { return a.first < b.first; });

// 6. Benchmark with realistic sizes AND realistic strings
// A benchmark using "abc" measures the SSO path; production keys of
// 30 characters take the malloc path and behave completely differently.

// Rules of thumb that survive measurement
// ┌ n < 30              -> sorted vector beats map and unordered_map
// ├ read-heavy, static  -> flat_map / sorted vector
// ├ needs order/ranges  -> map
// ├ pure key lookup     -> unordered_map, or a flat hash table
// ├ per-request scratch -> pmr with a stack-allocated arena
// └ addresses must be stable -> deque, or vector<unique_ptr<T>>`
      }
    ],
    examples: [
      {
        title: "emplace_back silently doing the wrong thing",
        input: "std::vector<std::vector<int>> rows; rows.emplace_back(10);",
        output: "A vector containing ten zero-initialised ints is appended, rather than a compile error.",
        explanation:
          "Step 1: emplace_back forwards its arguments to a direct-initialisation of the element type, so it selects vector<int>'s explicit size constructor.\nStep 2: push_back would have used copy initialisation from the argument, which cannot use an explicit constructor, so it correctly rejects the call.\nStep 3: The result is that a typo or a misunderstanding produces a silently wrong container rather than a diagnostic, and the same mechanism lets emplace_back accept a raw pointer for a vector of unique_ptr, which push_back rightly refuses.\nStep 4: The unique_ptr case is worse than merely surprising: if the vector's reallocation throws after the raw pointer has been evaluated but before ownership is taken, the memory leaks.\nStep 5: The practical rule is to reach for emplace only when you are genuinely constructing from arguments and the element is expensive to move, and to prefer push_back otherwise precisely because its stricter initialisation catches mistakes."
      },
      {
        title: "A priority_queue that pops the wrong element",
        input: "std::priority_queue<int> pq; pushing several values and expecting pop to yield the smallest.",
        output: "The largest value is returned instead, because the default is a max-heap.",
        explanation:
          "Step 1: priority_queue is defined with std::less as its default comparator, and the heap invariant places the element that compares greatest at the top.\nStep 2: The comparator answers whether its first argument orders before its second, and the top of the heap is the element that orders last, so less produces a max-heap.\nStep 3: Obtaining a min-heap therefore requires passing std::greater, which reads counterintuitively and is the source of the confusion - the comparator's sense is inverted relative to the pop order.\nStep 4: Because the comparator is the third template parameter, supplying it also requires naming the second, so the declaration must spell out the underlying container as priority_queue<int, vector<int>, greater<>>.\nStep 5: With a custom comparator for a struct the same inversion applies: writing a.deadline > b.deadline yields earliest-deadline-first, which is the opposite of what the operator suggests at a glance, so it is worth writing a comment or a named comparator type rather than an inline lambda."
      },
      {
        title: "A mutated set key that becomes unfindable",
        input: "A set ordered by a score field, where a const_cast is used to modify an element's score through an iterator.",
        output: "The element is still in the container but find never locates it, and iteration order is wrong.",
        explanation:
          "Step 1: A set stores its elements in a tree whose structure encodes the comparator's answers at insertion time, and each node's position depends on comparisons against its ancestors.\nStep 2: Modifying the field the comparator reads does not move the node, so the tree's ordering invariant is now violated while the structure claims otherwise.\nStep 3: A subsequent find performs a binary descent guided by comparisons against the new value, takes a branch the node is not on, and reports absence even though the element is present.\nStep 4: This is why set exposes only const iterators to its elements - the const is not incidental, and casting it away is undefined behaviour rather than a mere style violation.\nStep 5: The correct mechanism since C++17 is extract, which detaches the node from the tree and hands you a node handle whose value is mutable; after modifying it, inserting the handle back places it at the correct position with no reallocation and no copy of the value."
      }
    ],
    tips: [
      "Prefer push_back unless you are constructing from arguments and the element is expensive to move, because push_back's copy initialisation rejects explicit constructors that emplace would silently accept.",
      "Use extract to change a key in a set or map rather than erasing and reinserting, since it moves the node without reallocating or copying the value.",
      "Attach a counting memory_resource to a pmr container in a test build to measure allocation counts directly, since allocation count predicts performance better than complexity does."
    ],
    tricks: [
      "Decorate-sort-undecorate: precompute an expensive sort key once per element into a pair, sort on the pair, and avoid recomputing the transformation on every one of the O(n log n) comparisons.",
      "A monotonic_buffer_resource over a stack array turns an entire request's or frame's allocations into pointer bumps with a single bulk teardown.",
      "std::stack backed by std::vector is usually faster than the deque default, because a stack never needs push_front and gains contiguity for free."
    ],
    memoryAids: [
      "emplace saves exactly one move, and only when you were going to build a temporary - it is not a general speed-up.",
      "The comparator is part of the type, and it must never change while the container holds elements.",
      "priority_queue with less is a max-heap, so greater gives you the min-heap - the comparator sense is inverted relative to pop order."
    ],
    interviewPatterns: [
      "'Is emplace_back always faster than push_back?' The expected answer is no, plus the explicit-constructor hazard.",
      "'How would you reduce allocations in this hot path?' They want reserve, arena or pmr allocation, and contiguous layouts before any complexity change.",
      "Frequency and companies: common at HFT firms, Nvidia, Bloomberg, and any team with a latency budget; often paired with 'how would you measure it?'"
    ],
    practiceProblems: [
      "Why does std::priority_queue expose no iterators? Answer: iteration would expose the heap's internal array order, which is neither sorted nor meaningful to a caller, and allowing mutation through an iterator would let a caller silently break the heap invariant that every operation depends on; the adaptor's entire purpose is to restrict the underlying container's interface to the operations that preserve its invariant, so if you need to inspect or search the elements you needed a different structure - a sorted vector or a multiset - in the first place.",
      "You must sort a million records by a key that requires an expensive normalisation. How do you avoid recomputing it? Answer: decorate-sort-undecorate - build a vector of pairs holding the normalised key and either the record or a pointer to it, sort on the key, then read the results in order; this performs n normalisations instead of the roughly 2n log n that an inline comparator would trigger, and for a million records that is twenty million saved calls.",
      "When does a pmr monotonic_buffer_resource become dangerous? Answer: when anything allocated from it outlives the resource, since deallocation is a no-op and destruction releases the whole buffer at once - storing a pmr::string built from a per-request arena into a long-lived cache is a use-after-free; the discipline is that arena-allocated objects must not escape the arena's scope, and copying them into heap-allocated equivalents at the boundary is the correct handoff."
    ],
    faq: [
      {
        question: "Is emplace_back actually faster than push_back?",
        answer:
          "Only in one specific case, and by one move. If the caller writes push_back(Widget{args}), a temporary is constructed and then moved into the container, whereas emplace_back(args) constructs directly in the container's storage, saving the move and the temporary's destruction. If the caller already holds a Widget, the two are identical - emplace_back(w) copies exactly as push_back(w) does. For types where a move is a few register copies, the saving is unmeasurable. For types with expensive moves, or types that are not movable at all, it matters. Against that small benefit sit three real costs. emplace uses direct initialisation, so it accepts explicit constructors that push_back correctly rejects, which turns a compile error into a silently wrong result for cases like vector<vector<int>>::emplace_back(10). It cannot take a braced initialiser list, because a parameter pack cannot deduce one, so aggregates need parentheses and, before C++20, a real constructor. And it is less readable, because the element type appears nowhere at the call site, so a reader has to look up the container's declaration to know what is being constructed. The reasonable default is to use push_back when you have an object and emplace_back when you are genuinely constructing from arguments, treating the choice as a matter of expressing intent rather than as an optimisation. The one place emplace is unambiguously required is for element types with no move constructor at all, such as std::mutex."
      },
      {
        question: "When is it worth writing a custom allocator?",
        answer:
          "When profiling shows that allocation itself, rather than the work around it, is a significant share of the runtime - which is common in node-heavy container code, parsers, and anything that builds and discards many small objects per unit of work. The general-purpose allocator has to serve every size, be thread-safe, and handle arbitrary free order, so it maintains size-class free lists, takes locks or uses per-thread caches, and can page-fault on growth; a single malloc plus free pair typically costs on the order of fifty to a hundred nanoseconds. A monotonic arena reduces allocation to incrementing a pointer, roughly three instructions, and reduces deallocation to nothing, which is why arena-per-request and arena-per-frame designs routinely halve the runtime of allocation-heavy code. C++17's pmr makes this practical in a way the classic allocator model never was, because the allocator is no longer part of the container's type - std::pmr::vector<int> is one type whatever resource backs it, so it can be passed across interfaces freely. The pre-built resources cover most needs: monotonic for scoped bulk work, pool resources for repeated same-size node allocation, and null_memory_resource for asserting that a code path allocates nothing. Writing a memory_resource from scratch is straightforward, needing only do_allocate, do_deallocate, and do_is_equal. The caveats are that arena-allocated objects must not outlive their resource, that the unsynchronized pool is not thread-safe, and that pmr containers do not propagate their resource on copy assignment, so assigning between containers with different resources copies elements rather than stealing buffers."
      },
      {
        question: "Why can't I modify an element of a std::set?",
        answer:
          "Because the element's value determines its position in the tree, and modifying it in place would leave the structure claiming an ordering that no longer holds. The tree was built by comparing the element against its ancestors at insertion time; every subsequent search descends by making the same comparisons and trusting that the answers are unchanged. Change the value and the searches take branches that lead away from the node, so find reports absence for an element that is physically present, insert can create a duplicate, and erase can remove the wrong node or corrupt the links. The library prevents this by making set's iterators yield const references, and map's yield a pair whose first member is const - the constness is a load-bearing part of the design rather than a conservative default, and const_casting it away is undefined behaviour. The historical workaround was to erase the element and insert the modified value, which is correct but destroys and reallocates the node and copies or moves the value. C++17 added the node handle interface to solve exactly this: extract detaches the node from the tree and returns a handle whose value is mutable, you modify it, and insert relinks it at the correct position - no allocation, no copy, and the value is moved at most zero times. The same handles also allow moving nodes between two containers of compatible type, and merge does this in bulk. For a map, only the key is const, so the mapped value can always be modified freely through an iterator without any of this ceremony."
      },
      {
        question: "How do I decide between all these containers under a real latency budget?",
        answer:
          "Start from the access pattern rather than the complexity table, and measure rather than reason. The questions that actually determine the answer are: do you need ordered iteration or range queries, must element addresses stay stable, is the container built once and read many times or continuously modified, how large is it in production rather than in the test, and is it on a hot path at all. From those, the defaults fall out. If you need order or ranges, map or a sorted vector; if the collection is static after construction, always the sorted vector, since it wins on both lookup and memory. If you need pure key lookup at scale, a hash table, preferring a flat open-addressed one over std::unordered_map if the standard's reference-stability guarantee is not needed. If addresses must be stable, deque or vector<unique_ptr<T>> rather than list, because you almost never need list's splice. And below roughly thirty elements, a sorted or even unsorted vector beats everything, because one contiguous allocation and a linear scan of a couple of cache lines is faster than any tree walk or hash computation. Then optimise in the order that pays: eliminate reallocations with reserve, reduce allocation count with arenas or flatter layouts, improve locality by storing values rather than pointers and by considering structure-of-arrays for column-wise access, and only then reconsider the algorithm. Throughout, benchmark with production-sized data and production-shaped strings, because small synthetic benchmarks sit entirely inside SSO and L1 cache and will confidently point you the wrong way."
      },
      {
        question: "What exactly does a container adaptor give up, and is that a good trade?",
        answer:
          "It gives up the underlying container's full interface in exchange for enforcing an invariant. stack exposes push, pop, top, size, and empty; queue exposes push, pop, front, back, size, and empty; priority_queue exposes push, pop, top, size, and empty. None of them expose iterators, so you cannot search them, print them, or iterate them, and none allow access to elements other than the accessible end. For stack and queue this is largely about intent: the underlying deque could do everything, and restricting it documents that this object is used as a stack and prevents a maintainer from reaching into the middle. For priority_queue the restriction is load-bearing, because the heap invariant would be broken by any mutation through an iterator, and exposing the internal array order would expose an implementation detail that is neither sorted nor meaningful. The trade is usually good, because the restricted interface communicates the data structure's role and eliminates a class of misuse, and because the adaptor is a zero-cost wrapper with no virtual dispatch. It is a bad trade when you discover you need to inspect the contents, at which point the hacks to reach the protected member are a strong signal that you wanted a different structure - a sorted vector or a multiset - all along. Worth knowing separately: stack backed by vector is usually faster than the deque default because a stack never pushes at the front, and queue cannot use vector at all because vector lacks pop_front."
      },
      {
        question: "What is the decorate-sort-undecorate pattern and when should I use it?",
        answer:
          "It is the technique of precomputing an expensive sort key once per element, sorting on the precomputed keys, and then recovering the original elements. The motivation is that a comparator is invoked roughly two n log n times during a sort, so any work inside it is multiplied enormously: sorting a million records with a comparator that normalises a string on each call performs about forty million normalisations, whereas precomputing performs one million. The implementation builds a vector of pairs holding the computed key and either the element itself or a pointer or index to it, sorts that vector on the key alone, and then either reads the results in order through the pointers or permutes the original container. The name comes from Python, where the same idiom was standard before the key parameter was added to sort, and C++20's ranges algorithms provide the equivalent through projections - though a projection is still invoked per comparison, so it does not by itself avoid the recomputation unless the projection is cheap. The pattern applies whenever the sort key is derived rather than stored: case-folded strings, parsed dates, computed distances, locale collation keys, or anything requiring an allocation. It costs one extra pass and O(n) memory for the key vector, which is almost always worth it. A related variant worth knowing is sorting indices rather than elements when the elements are large and moving them is expensive, then applying the resulting permutation once - though for very large elements it is often simpler to sort a vector of pointers and accept the indirection."
      }
    ],
    references: [
      {
        source: "note",
        attribution: "cppreference - emplace_back, std::pmr::memory_resource, container adaptors",
        insight: "Specifies the direct-initialisation semantics of emplace and the exact behaviour of each standard memory resource."
      },
      {
        source: "video",
        attribution: "John Lakos and Pablo Halpern - Local Allocators / pmr talks (CppCon)",
        insight: "Quantifies the gains from arena allocation and explains the pmr propagation rules that surprise people."
      },
      {
        source: "book",
        attribution: "Scott Meyers - Effective Modern C++, Item 42 on emplacement",
        insight: "The definitive treatment of when emplacement helps and the explicit-constructor hazard it introduces."
      }
    ]
  }
];
