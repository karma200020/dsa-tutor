import type { QuestionSolution } from "./schema";
import { expandedSolutions } from "./expanded-solutions";

const cpp = (body: string) => `#include <bits/stdc++.h>\nusing namespace std;\n\n${body.trim()}\n`;

export const googleSolutions: Record<string, QuestionSolution> = {
  ...expandedSolutions,
  "google-earliest-friendship": {
    hints: ["Connectivity is about components, not direct friendship between every pair.", "Process events in timestamp order and track how many components remain."],
    contract: "conditional",
    assumptions: "Baseline: n people numbered 0..n-1, undirected additions only, integer timestamps; return -1 if never connected, 0 when n <= 1. Removals are a separate follow-up.",
    approach: "Sort events and union endpoints using union-by-size and path compression. Stop when the component count reaches one. For removals, ordinary DSU is insufficient: an offline timeline can use edge-active intervals, a segment tree and rollback DSU.",
    correctness: "After each timestamp, DSU represents exactly the connectivity induced by all processed edges. The first connected prefix therefore gives the earliest valid timestamp; ties do not change that timestamp.",
    complexity: "m events: O(m log m + m alpha(n)) time, O(n) auxiliary space besides the sorted event copy. This bound excludes the deletion follow-up.",
    edgeCases: "Duplicate events, self-edges, tied timestamps, isolated people and an empty event list.",
    code: cpp(`
long long earliest(int n, vector<array<long long,3>> events) {
    if (n <= 1) return 0;
    vector<int> p(n), sz(n,1); iota(p.begin(),p.end(),0);
    function<int(int)> root = [&](int x) {
        return p[x] == x ? x : p[x] = root(p[x]);
    };
    sort(events.begin(),events.end());
    int components = n;
    for (auto [time,u,v] : events) {
        int a = root((int)u), b = root((int)v);
        if (a == b) continue;
        if (sz[a] < sz[b]) swap(a,b);
        p[b] = a; sz[a] += sz[b];
        if (--components == 1) return time;
    }
    return -1;
}`)
  },
  "google-range-module": {
    hints: ["Maintain disjoint tracked intervals rather than one flag per coordinate.", "An update only changes intersecting intervals; removal can leave two fragments."],
    contract: "specified",
    assumptions: "Canonical Range Module semantics: half-open intervals [l,r), l < r. Empty queries are treated as covered. Coordinates fit long long.",
    approach: "An ordered map stores merged disjoint intervals. Addition absorbs overlap and touching boundaries. Removal erases intersections and preserves left/right fragments. A query checks the interval whose start is the greatest start not exceeding l.",
    correctness: "Merging preserves the union on addition; splitting subtracts exactly [l,r) on removal. Since intervals are disjoint and touching intervals are merged, one predecessor interval covers a query exactly when its end reaches r.",
    complexity: "With I intervals and k erased intervals, updates take O((k+1) log I), queries O(log I), space O(I). Updates are not universally O(log I).",
    edgeCases: "Touching ranges, complete removal, removal across gaps, nested updates and queries at excluded right endpoints.",
    code: cpp(`
class RangeModule {
    map<long long,long long> ranges;
public:
    void addRange(long long l, long long r) {
        if (l >= r) throw invalid_argument("nonempty range required");
        auto it = ranges.lower_bound(l);
        if (it != ranges.begin() && prev(it)->second >= l) --it;
        while (it != ranges.end() && it->first <= r) {
            l = min(l,it->first); r = max(r,it->second);
            it = ranges.erase(it);
        }
        ranges[l] = r;
    }
    bool queryRange(long long l, long long r) const {
        if (l > r) throw invalid_argument("reversed range");
        if (l == r) return true;
        auto it = ranges.upper_bound(l);
        return it != ranges.begin() && prev(it)->second >= r;
    }
    void removeRange(long long l, long long r) {
        if (l >= r) throw invalid_argument("nonempty range required");
        auto it = ranges.lower_bound(l);
        if (it != ranges.begin() && prev(it)->second > l) --it;
        vector<pair<long long,long long>> fragments;
        while (it != ranges.end() && it->first < r) {
            auto [a,b] = *it;
            if (b <= l) { ++it; continue; }
            if (a < l) fragments.push_back({a,l});
            if (b > r) fragments.push_back({r,b});
            it = ranges.erase(it);
        }
        for (auto [a,b] : fragments) ranges[a] = b;
    }
};`)
  },
  "google-employee-shifts": {
    hints: ["The active roster only changes at a start or end time.", "Process all events at the same time together, and keep counts per employee if their shifts can overlap."],
    contract: "conditional",
    assumptions: "Half-open shifts [start,end), employee IDs are integers; emit every segment between consecutive event times, including empty gaps (an additional account explicitly requests gaps). Zero-length shifts are ignored; adjacent identical rosters may remain separate.",
    approach: "Sweep sorted endpoints. The current multiset of employee IDs applies to the interval before the next endpoint; then apply all deltas at that endpoint. Emit sorted unique active IDs using positive counts.",
    correctness: "Between consecutive endpoints no shift starts or ends. Counts therefore describe exactly the employees active throughout that interval, including repeated overlapping shifts of one employee.",
    complexity: "n shifts, E endpoints and total output roster entries R: O(n log n + R) time and O(n + R) space including output.",
    edgeCases: "End/start ties, nested shifts, repeated employee IDs, empty input and gaps. Clarify whether the original interviewer wants empty gaps.",
    code: cpp(`
struct Shift { int employee; long long start,end; };
struct Segment { long long start,end; vector<int> employees; };
vector<Segment> segmentShifts(const vector<Shift>& shifts) {
    map<long long,vector<pair<int,int>>> events;
    for (auto s : shifts) {
        if (s.start > s.end) throw invalid_argument("reversed shift");
        if (s.start == s.end) continue;
        events[s.start].push_back({s.employee,1});
        events[s.end].push_back({s.employee,-1});
    }
    map<int,int> active;
    vector<Segment> out;
    if (events.empty()) return out;
    long long previous = events.begin()->first;
    for (const auto& [time,deltas] : events) {
        if (previous < time) {
            Segment segment{previous,time,{}};
            for (auto [id,count] : active) segment.employees.push_back(id);
            out.push_back(move(segment));
        }
        for (auto [id,delta] : deltas) {
            active[id] += delta;
            if (active[id] == 0) active.erase(id);
        }
        previous = time;
    }
    return out;
}`)
  },
  "google-island-lakes": {
    hints: ["First ask what the supplied coordinate selects: one land component, one water component, or the whole grid.", "For global enclosed-water components, water connected to a grid boundary is not a lake."],
    contract: "clarification-required",
    assumptions: "The report does not specify whether to return island area, component membership, global lakes, or lakes belonging to the selected island; adjacency is also unclear. No single implementation can be asserted as the reported solution.",
    approach: "Conditionally, with four-neighbor adjacency and global lake counting: flood boundary water, then count remaining water components. To explore a selected land component, flood only matching land from the supplied coordinate. Attributing lakes to one island needs an additional boundary/ownership rule.",
    correctness: "For the global version, a water component is enclosed exactly when it has no path to boundary water. Flooding marks all and only non-enclosed components; each unmarked component is counted once.",
    complexity: "For either specified four-neighbor flood variant, O(rows * columns) time and space. The unspecified ownership variant has no claimed implementation.",
    edgeCases: "Coordinate on water, all land/water, single row, diagonal contact and lakes bordered by multiple islands. Clarification is necessary before producing code."
  },
  "google-good-subarray-indices": {
    hints: ["The reported output is any qualifying boundary pair, not a sum optimization.", "For a right boundary value x, which earlier boundary values differ from x by k?"],
    contract: "conditional",
    assumptions: "Use the linked good-subarray boundary condition |a[l]-a[r]| = k with k >= 0 and l < r. Return any pair or {-1,-1}; sum is not an objective. Values and x +/- k fit long long.",
    approach: "Store one prior index for each value. Before inserting the current value, look for x-k or x+k; no prefix sums are needed for this output. For the canonical maximum-sum task, store minimal prefix sums instead.",
    correctness: "Every returned pair has the required boundary difference and increasing indices. If a valid pair exists, its left value is present when its right endpoint is scanned.",
    complexity: "Expected O(n) time and O(n) space with hashing.",
    edgeCases: "k = 0 requires two different positions, duplicates, negative values and no valid pair.",
    code: cpp(`
pair<int,int> goodIndices(const vector<long long>& a, long long k) {
    if (k < 0) throw invalid_argument("negative k");
    unordered_map<long long,int> seen;
    for (int r=0; r<(int)a.size(); ++r) {
        for (long long value : {a[r]-k,a[r]+k}) {
            auto it = seen.find(value);
            if (it != seen.end()) return {it->second,r};
        }
        seen.emplace(a[r],r);
    }
    return {-1,-1};
}`)
  },
  "google-ab-cuts": {
    hints: ["One person can receive a contiguous middle piece, and the other its prefix and suffix.", "Slide a half-length window; track just its a count, because the b count then follows."],
    contract: "specified",
    assumptions: "Input contains only a and b with even totals. Return [l,r) for one person's middle piece; the other receives [0,l) and [r,n). Empty outside pieces need no cut.",
    approach: "Find a window of length n/2 containing half of all a characters. Treat windows circularly to prove existence, but scan non-wrapping windows: the first and last half windows are complements, so their counts straddle the target.",
    correctness: "The first and last length-n/2 windows partition the string, so their a counts sum to the total. Moving the window changes the count by at most one, so an integer half-total is reached. Its b count is also half because its length is n/2.",
    complexity: "O(n) time, O(1) auxiliary space.",
    edgeCases: "Empty string, only one character type, a balanced prefix already sufficient, and invalid odd counts.",
    code: cpp(`
pair<int,int> shareAB(const string& s) {
    int n=(int)s.size(), total=0;
    for (char c : s) {
        if (c!='a' && c!='b') throw invalid_argument("alphabet");
        total += c=='a';
    }
    if (total%2 || (n-total)%2) throw invalid_argument("odd counts");
    int length=n/2, count=0;
    for (int i=0;i<length;++i) count += s[i]=='a';
    for (int l=0;l+length<=n;++l) {
        if (count==total/2) return {l,l+length};
        if (l+length<n) count += (s[l+length]=='a')-(s[l]=='a');
    }
    throw logic_error("balanced window must exist");
}`)
  },
  "google-delete-equal-split": {
    hints: ["Choose an original boundary and ask which value must be deleted on either side.", "Maintain value frequencies on both sides; require that deletion leaves both sides nonempty."],
    contract: "conditional",
    assumptions: "Delete exactly one element; both resulting contiguous parts must be nonempty. Negative values are allowed; all sums fit long long. Return feasibility.",
    approach: "For each boundary with left sum L and right sum R, deleting from left needs x = L-R; deleting from right needs x = R-L. Check frequency maps and side lengths while moving the boundary.",
    correctness: "Every valid split after deletion corresponds to an original boundary (possibly either boundary next to the removed element). The algebra checks precisely the only value that could equalize each side, and size checks exclude empty results.",
    complexity: "Expected O(n) time and O(n) auxiliary space.",
    edgeCases: "n < 3, zeros, duplicate values, deleting at an endpoint and negative totals.",
    code: cpp(`
bool deleteEqualSplit(const vector<long long>& a) {
    int n=(int)a.size(); if (n<3) return false;
    unordered_map<long long,int> left,right;
    long long total=0,L=0;
    for (auto x:a) { total+=x; ++right[x]; }
    auto has=[](const auto& m,long long x) {
        auto it=m.find(x); return it!=m.end() && it->second>0;
    };
    for (int c=1;c<n;++c) {
        long long x=a[c-1]; L+=x; ++left[x]; --right[x];
        long long R=total-L;
        if (c>=2 && has(left,L-R)) return true;
        if (n-c>=2 && has(right,R-L)) return true;
    }
    return false;
}`)
  },
  "google-modular-coins": {
    hints: ["A selection is a subset, not an ordered sequence.", "Store counts by number chosen and sum remainder; iterate the number chosen downward."],
    contract: "specified",
    assumptions: "N >= 0, M > 0, 0 <= K; distinct values are 0..N-1. K = 0 includes the empty selection. Return modulo 1,000,000,007. Bounds are not supplied, so this is a baseline DP, not a claim it meets unknown OA limits.",
    approach: "dp[c][r] counts subsets of processed values with c elements and sum remainder r. Add each value once using descending c; residue arithmetic must normalize if generalizing beyond nonnegative values.",
    correctness: "Each subset either omits the new value or uniquely contains it appended to a smaller subset. Descending c ensures no transition uses the same value more than once.",
    complexity: "O(N K M) time and O(K M) space. Large bounds may require a different combinatorial approach.",
    edgeCases: "K > N, M = 1, value zero and K = 0.",
    code: cpp(`
int divisibleSelections(int N,int K,int M) {
    if (N<0 || K<0 || M<=0) throw invalid_argument("parameters");
    if (K>N) return 0;
    const int MOD=1000000007;
    vector<vector<int>> dp(K+1,vector<int>(M)); dp[0][0]=1;
    for (int x=0;x<N;++x)
        for (int c=min(K,x+1);c>=1;--c)
            for (int r=0;r<M;++r) {
                int next=(r+(long long)x)%M;
                dp[c][next]=(dp[c][next]+(long long)dp[c-1][r])%MOD;
            }
    return dp[K][0];
}`)
  },
  "google-tree-cut": {
    hints: ["Every removed edge separates a rooted subtree from its complement.", "Compute subtree sums once instead of recomputing both components for every edge."],
    contract: "conditional",
    assumptions: "Connected undirected tree, node weights may be negative, all component sums and absolute differences fit long long. Require at least two nodes for a cut; return nullopt otherwise.",
    approach: "Build a parent-first order iteratively and accumulate subtree sums in reverse order. For every non-root v, evaluate |subtree[v] - (total - subtree[v])| without unnecessarily doubling a subtree sum.",
    correctness: "The component away from the root after cutting v's parent edge is exactly v's subtree. Every tree edge has one such child, so all possible cuts are evaluated once.",
    complexity: "O(n) time and space.",
    edgeCases: "One node, negative weights, zero total, chain trees and a best cut next to the root.",
    code: cpp(`
optional<long long> bestTreeCut(const vector<long long>& weights,
                              const vector<pair<int,int>>& edges) {
    int n=(int)weights.size(); if (n<2) return nullopt;
    vector<vector<int>> g(n);
    for (auto [u,v]:edges) { g[u].push_back(v); g[v].push_back(u); }
    vector<int> parent(n,-1),order{0}; parent[0]=0;
    for (size_t i=0;i<order.size();++i)
        for (int v:g[order[i]]) if (v!=parent[order[i]]) {
            parent[v]=order[i]; order.push_back(v);
        }
    vector<long long> sub=weights;
    long long total=accumulate(weights.begin(),weights.end(),0LL);
    long long answer=LLONG_MAX;
    for (int i=n-1;i>0;--i) {
        int v=order[i];
        answer=min(answer,llabs(sub[v]-(total-sub[v])));
        sub[parent[v]]+=sub[v];
    }
    return answer;
}`)
  },
  "google-playlist-artists": {
    hints: ["The most frequent artist determines whether perfect separation is possible.", "Temporarily withhold the last selected artist while choosing the largest remaining count."],
    contract: "conditional",
    assumptions: "Return an artist-ID arrangement; songs within one artist are interchangeable and can be assigned to their output slots afterwards. No secondary tie-break criterion is required.",
    approach: "Use a max heap of counts and keep the previously used artist outside it for one selection. If only that artist remains, append its surplus. If maximum frequency is f among n songs, the optimum number of equal adjacencies is max(0, 2f-n-1).",
    correctness: "The other n-f songs provide at most n-f+1 slots separating the dominant artist, giving the lower bound. Greedily taking a most frequent eligible artist balances the remaining counts; unavoidable surplus appears only once all separators are exhausted and meets that bound.",
    complexity: "O(n log A) time and O(A+n) space including output for A artists.",
    edgeCases: "All songs one artist, ties, empty playlist, and counts exceeding half the playlist.",
    code: cpp(`
vector<int> playlist(const vector<int>& songs) {
    unordered_map<int,int> counts; for (int x:songs) ++counts[x];
    priority_queue<pair<int,int>> heap;
    for (auto [id,c]:counts) heap.push({c,id});
    pair<int,int> held{0,0}; vector<int> result;
    while (!heap.empty()) {
        auto current=heap.top(); heap.pop();
        result.push_back(current.second); --current.first;
        if (held.first>0) heap.push(held);
        held=current;
    }
    while (held.first-- > 0) result.push_back(held.second);
    return result;
}`)
  },
  "google-bounded-subarray": {
    hints: ["Negative elements invalidate the usual shrinking sliding window.", "With prefix sums P, seek the earliest i < j satisfying P[i] >= P[j]-k."],
    contract: "conditional",
    assumptions: "Arbitrary signed values and k; return the longest nonempty length or 0 if none. Prefix sums and their difference with k fit long long.",
    approach: "Coordinate-compress all prefix sums. A Fenwick tree of minimum indices, with reversed coordinates, answers the earliest prefix at least a threshold. Query before inserting the current prefix so the candidate is nonempty.",
    correctness: "The inequality is exactly P[j]-P[i] <= k. The earliest feasible i maximizes length for each j; taking the best over all right endpoints gives the global optimum.",
    complexity: "O(n log n) time and O(n) space. For nonnegative arrays only, a simpler O(n) window is valid.",
    edgeCases: "Negative k, repeated prefix sums, all-negative arrays, empty input and no feasible nonempty subarray.",
    code: cpp(`
int longestAtMost(const vector<long long>& a,long long k) {
    int n=(int)a.size(); vector<long long> p(n+1),values;
    for (int i=0;i<n;++i) p[i+1]=p[i]+a[i];
    values=p; sort(values.begin(),values.end());
    values.erase(unique(values.begin(),values.end()),values.end());
    int m=(int)values.size(); vector<int> bit(m+1,INT_MAX);
    auto add=[&](long long x,int index) {
        int r=m-(int)(lower_bound(values.begin(),values.end(),x)-values.begin());
        for (;r<=m;r+=r&-r) bit[r]=min(bit[r],index);
    };
    auto query=[&](long long threshold) {
        int r=m-(int)(lower_bound(values.begin(),values.end(),threshold)-values.begin());
        int result=INT_MAX;
        for (;r>0;r-=r&-r) result=min(result,bit[r]);
        return result;
    };
    add(p[0],0); int answer=0;
    for (int j=1;j<=n;++j) {
        int i=query(p[j]-k);
        if (i!=INT_MAX) answer=max(answer,j-i);
        add(p[j],j);
    }
    return answer;
}`)
  },
  "google-leaf-path-sum": {
    hints: ["A downward state must end at a real leaf, even when every weight is negative.", "A leaf-to-leaf path is completed only where two child branches meet."],
    contract: "conditional",
    assumptions: "Rooted binary tree, leaf means no children. Return nullopt when fewer than two leaves exist; sums fit long long. Recursion assumes manageable height.",
    approach: "Postorder returns the best node-to-leaf sum. At a node with both children, combine their best downward sums with the node value and update a global optional answer. A one-child node must take that child.",
    correctness: "Each leaf-to-leaf path has a unique lowest common ancestor with endpoints in different child branches. The recurrence selects the best leaf endpoint in each branch, evaluating the best path for that ancestor.",
    complexity: "O(n) time, O(height) recursion space; use iterative postorder on deep trees.",
    edgeCases: "Negative weights, a single leaf, a chain, unbalanced trees and paths not passing through the root.",
    code: cpp(`
struct Node { long long value; Node *left=nullptr,*right=nullptr; };
optional<long long> leafPath(Node* root) {
    optional<long long> answer;
    function<long long(Node*)> down=[&](Node* u)->long long {
        if (!u->left && !u->right) return u->value;
        if (!u->left) return u->value+down(u->right);
        if (!u->right) return u->value+down(u->left);
        long long a=down(u->left),b=down(u->right);
        long long candidate=a+b+u->value;
        if (!answer || candidate>*answer) answer=candidate;
        return u->value+max(a,b);
    };
    if (root) down(root);
    return answer;
}`)
  },
  "google-randomized-collection": {
    hints: ["Random choice is easy from a dense array.", "Deletion can swap with the last occurrence, but every moved occurrence's index must be repaired."],
    contract: "conditional", assumptions: "Duplicate values are allowed; sample occurrences uniformly, so values are weighted by multiplicity. Sampling an empty collection throws. Insert reports whether the value was previously absent.",
    approach: "Keep a vector of occurrences and a hash set of indices per value. Remove one occurrence by moving the last vector entry into its slot and updating both sets. Use a uniform integer distribution over vector indices.",
    correctness: "The index sets remain a bijection to the vector occurrences after the swap, including when removed and moved values are equal. Each occurrence owns one equally likely random index.",
    complexity: "Expected O(1) insert/remove/sample; O(n) space. Hash operations are average-case, not worst-case guarantees.",
    edgeCases: "Removing the last element, removing a duplicate of the moved value, absent values and empty sampling.",
    code: cpp(`
class RandomizedCollection {
    vector<int> values;
    unordered_map<int,unordered_set<size_t>> positions;
    mt19937 rng;
public:
    explicit RandomizedCollection(unsigned seed=random_device{}()) : rng(seed) {}
    bool insert(int x) {
        bool fresh=!positions.count(x);
        positions[x].insert(values.size()); values.push_back(x);
        return fresh;
    }
    bool remove(int x) {
        auto found=positions.find(x);
        if (found==positions.end()) return false;
        size_t index=*found->second.begin(),last=values.size()-1;
        int moved=values.back();
        found->second.erase(index);
        if (index!=last) {
            positions[moved].erase(last);
            positions[moved].insert(index);
            values[index]=moved;
        }
        values.pop_back();
        if (positions[x].empty()) positions.erase(x);
        return true;
    }
    int getRandom() {
        if (values.empty()) throw out_of_range("empty collection");
        return values[uniform_int_distribution<size_t>(0,values.size()-1)(rng)];
    }
    size_t size() const { return values.size(); }
};`)
  },
  "google-cycle-entry": {
    hints: ["Use two speeds to find a collision without extra node storage.", "After a collision, reset one pointer to the head and move both one step at a time."],
    contract: "specified", assumptions: "Singly linked list, node identity rather than value equality. Return nullptr if acyclic.",
    approach: "Floyd's fast/slow traversal first detects a cycle. Then one pointer starts at the head and the other at the collision; their next meeting is the cycle entry.",
    correctness: "At collision, the distance slow travelled equals a multiple of the cycle length modulo the relative-speed equation. If the entry is mu steps from the head, advancing both pointers mu steps places both at the entry.",
    complexity: "O(n) time, O(1) space.",
    edgeCases: "Empty list, self-loop, cycle starting at the head and repeated values in an acyclic list.",
    code: cpp(`
struct ListNode { int value; ListNode* next=nullptr; };
ListNode* cycleEntry(ListNode* head) {
    ListNode *slow=head,*fast=head;
    do {
        if (!fast || !fast->next) return nullptr;
        slow=slow->next; fast=fast->next->next;
    } while (slow!=fast);
    slow=head;
    while (slow!=fast) { slow=slow->next; fast=fast->next; }
    return slow;
}`)
  },
  "google-two-sum": {
    hints: ["For each value, its partner is determined by the target.", "Look up the partner before storing the current index to avoid using one occurrence twice."],
    contract: "specified", assumptions: "Return any two distinct zero-based positions or {-1,-1} if absent. Sums and complements fit long long.",
    approach: "Scan with a hash map from previously seen values to an index; query target-x, then insert x.",
    correctness: "Every returned pair sums to the target and uses an earlier distinct position. Every valid pair is found when its second position is scanned.",
    complexity: "Expected O(n) time and O(n) space.",
    edgeCases: "Duplicate equal partners, negative numbers and no solution.",
    code: cpp(`
pair<int,int> twoSum(const vector<long long>& a,long long target) {
    unordered_map<long long,int> seen;
    for (int i=0;i<(int)a.size();++i) {
        auto it=seen.find(target-a[i]);
        if (it!=seen.end()) return {it->second,i};
        seen.emplace(a[i],i);
    }
    return {-1,-1};
}`)
  },
  "google-sorted-unique-pairs": {
    hints: ["Sorting lets you compare the smallest and largest remaining values.", "After finding a pair, skip all duplicates at both endpoints."],
    contract: "specified", assumptions: "Input is sorted nondecreasingly. Output distinct value pairs, not all index pairs; addition fits long long.",
    approach: "Use inward two pointers. Move left when the sum is small, right when large; on equality emit the pair and skip both repeated values.",
    correctness: "When the sum is too small, the current left value cannot pair with any smaller right value; the symmetric argument eliminates the right value when too large. Skipping duplicates removes only repeated output pairs.",
    complexity: "O(n) time, O(1) auxiliary space excluding output.",
    edgeCases: "Two equal values require two occurrences, empty input, duplicates and negative targets.",
    code: cpp(`
vector<pair<long long,long long>> uniquePairs(const vector<long long>& a,long long target) {
    vector<pair<long long,long long>> out;
    int l=0,r=(int)a.size()-1;
    while (l<r) {
        long long sum=a[l]+a[r];
        if (sum<target) ++l;
        else if (sum>target) --r;
        else {
            long long x=a[l],y=a[r]; out.push_back({x,y});
            while (l<r && a[l]==x) ++l;
            while (l<r && a[r]==y) --r;
        }
    }
    return out;
}`)
  },
  "google-lca-bst-followup": {
    hints: ["In a general binary tree, ask each subtree whether it contains either target.", "BST ordering can tell you which single branch contains both targets."],
    contract: "conditional", assumptions: "Targets are existing nodes identified by pointer identity. For the BST follow-up, keys are unique. Absent-target validation would require an additional membership check.",
    approach: "General tree recursion returns a target or a subtree LCA. If both child results are non-null, the current node is the LCA. In a BST, descend while both target keys lie on the same side; the first split is the answer.",
    correctness: "The first ancestor whose children separate the targets is their lowest common ancestor; if one target is an ancestor, returning it handles that case. BST ordering preserves the branch containing both nodes.",
    complexity: "General tree O(n) time/O(height) stack; BST O(height) time and O(1) space.",
    edgeCases: "Same target twice, root target, ancestor/descendant pair and a skewed tree; recursion depth needs care.",
    code: cpp(`
struct TreeNode { int value; TreeNode *left=nullptr,*right=nullptr; };
TreeNode* lca(TreeNode* u,TreeNode* p,TreeNode* q) {
    if (!u || u==p || u==q) return u;
    TreeNode *a=lca(u->left,p,q),*b=lca(u->right,p,q);
    return a && b ? u : (a ? a : b);
}
TreeNode* bstLca(TreeNode* u,TreeNode* p,TreeNode* q) {
    while (u) {
        if (p->value<u->value && q->value<u->value) u=u->left;
        else if (p->value>u->value && q->value>u->value) u=u->right;
        else return u;
    }
    return nullptr;
}`)
  },
  "google-rightward-grid-paths": {
    hints: ["Every move increases the column, so the grid forms a DAG.", "Ordered checkpoints split the path into independent column intervals."],
    contract: "conditional", assumptions: "n rows, m columns, zero-based coordinates, no obstacles. Count modulo 1,000,000,007 as a practice convention (the account does not state a modulus). Ordered checkpoints must be visited; repeated identical checkpoints impose no new movement.",
    approach: "For each consecutive required endpoint, propagate counts one column at a time to the same, previous or next row. Multiply segment counts. Distinct checkpoints in the same column cannot both be visited; unordered checkpoints need a separately clarified ordering rule.",
    correctness: "The recurrence sums all possible predecessor rows exactly once. Every full path decomposes uniquely at its ordered checkpoints, so independent segment choices multiply.",
    complexity: "O(n*m + checkpoints) time across monotone segments, O(n) auxiliary space.",
    edgeCases: "Single column, same-column conflicts, backward checkpoints, out-of-grid coordinates and n = 1.",
    code: cpp(`
int rightwardPaths(int n,int m,const vector<pair<int,int>>& checkpoints) {
    if (n<=0 || m<=0) throw invalid_argument("grid size");
    const long long MOD=1000000007;
    vector<pair<int,int>> points{{n-1,0}};
    points.insert(points.end(),checkpoints.begin(),checkpoints.end());
    points.push_back({n-1,m-1}); long long answer=1;
    for (auto [r,c]:points)
        if (r<0 || r>=n || c<0 || c>=m) throw invalid_argument("checkpoint");
    for (size_t i=1;i<points.size();++i) {
        auto [sr,sc]=points[i-1]; auto [tr,tc]=points[i];
        if (tc<sc) return 0;
        vector<long long> dp(n); dp[sr]=1;
        for (int c=sc;c<tc;++c) {
            vector<long long> next(n);
            for (int r=0;r<n;++r)
                for (int dr=-1;dr<=1;++dr)
                    if (r+dr>=0 && r+dr<n)
                        next[r+dr]=(next[r+dr]+dp[r])%MOD;
            dp.swap(next);
        }
        answer=answer*dp[tr]%MOD;
    }
    return (int)answer;
}`)
  },
  "google-shortest-path-membership": {
    hints: ["Distance from the source alone cannot distinguish every shortest-path node.", "Compute distances from both endpoints and compare their sum with the shortest endpoint distance."],
    contract: "specified", assumptions: "Unweighted undirected graph with vertices 0..n-1. Return all vertices on at least one shortest path; unreachable endpoints produce an empty list.",
    approach: "Run BFS from s and t. Include v iff both distances exist and ds[v]+dt[v] = ds[t]. A concrete shortest path can be recovered from BFS parent pointers.",
    correctness: "A vertex on a shortest path satisfies the distance equality. Conversely, concatenating shortest s-v and v-t paths with that total gives a shortest walk; any repetition would permit shortening, so it supplies a shortest path through v.",
    complexity: "O(V+E) time and O(V+E) space including adjacency.",
    edgeCases: "Disconnected graph, s = t, several shortest paths, cycles and parallel edges.",
    code: cpp(`
vector<int> shortestMembers(const vector<vector<int>>& g,int s,int t) {
    auto bfs=[&](int start) {
        vector<int> d(g.size(),-1); queue<int> q; q.push(start); d[start]=0;
        while (!q.empty()) {
            int u=q.front(); q.pop();
            for (int v:g[u]) if (d[v]==-1) { d[v]=d[u]+1; q.push(v); }
        }
        return d;
    };
    auto a=bfs(s),b=bfs(t); vector<int> out;
    if (a[t]==-1) return out;
    for (int v=0;v<(int)g.size();++v)
        if (a[v]>=0 && b[v]>=0 && a[v]+b[v]==a[t]) out.push_back(v);
    return out;
}`)
  },
  "google-rat-safest-path": {
    hints: ["The path score is the minimum safety of its cells, not the sum.", "Replace shortest-path addition with a bottleneck minimum and select the largest current score."],
    contract: "conditional", assumptions: "Rectangular grid, # blocked and other cells open, four-neighbor moves; at least one stationary cat coordinate, possibly on a blocked cell. Safety is Manhattan distance, not obstacle-aware cat travel distance.",
    approach: "Compute each cell's nearest-cat Manhattan distance using a multi-source BFS that traverses the entire geometric grid, ignoring obstacles. Then run a maximum-bottleneck priority search on only open cells, with candidate min(current score, next safety).",
    correctness: "The unobstructed BFS computes Manhattan nearest-cat distance. When the largest tentative bottleneck is popped, no unprocessed path can improve it because extending a path cannot increase its minimum.",
    complexity: "G cells: O(G log G + cats) time and O(G) space.",
    edgeCases: "Blocked endpoints, disconnected open cells, cat at the source, multiple cats and source = target.",
    code: cpp(`
int safestPath(const vector<string>& grid,pair<int,int> source,pair<int,int> target,
               const vector<pair<int,int>>& cats) {
    if (grid.empty() || grid[0].empty() || cats.empty()) throw invalid_argument("grid/cats");
    int n=(int)grid.size(),m=(int)grid[0].size();
    const int dr[]={1,-1,0,0},dc[]={0,0,1,-1};
    auto inside=[&](int r,int c){return r>=0 && r<n && c>=0 && c<m;};
    auto [sr,sc]=source; auto [tr,tc]=target;
    if (!inside(sr,sc) || !inside(tr,tc)) throw invalid_argument("endpoint");
    if (grid[sr][sc]=='#' || grid[tr][tc]=='#') return -1;
    vector<vector<int>> safety(n,vector<int>(m,INT_MAX)); queue<pair<int,int>> q;
    for (auto [r,c]:cats) {
        if (!inside(r,c)) throw invalid_argument("cat");
        if (safety[r][c]!=0) { safety[r][c]=0; q.push({r,c}); }
    }
    while (!q.empty()) {
        auto [r,c]=q.front(); q.pop();
        for (int d=0;d<4;++d) {
            int x=r+dr[d],y=c+dc[d];
            if (inside(x,y) && safety[x][y]==INT_MAX) {
                safety[x][y]=safety[r][c]+1; q.push({x,y});
            }
        }
    }
    vector<vector<int>> best(n,vector<int>(m,-1));
    priority_queue<tuple<int,int,int>> heap;
    best[sr][sc]=safety[sr][sc]; heap.push({best[sr][sc],sr,sc});
    while (!heap.empty()) {
        auto [score,r,c]=heap.top(); heap.pop();
        if (score!=best[r][c]) continue;
        if (r==tr && c==tc) return score;
        for (int d=0;d<4;++d) {
            int x=r+dr[d],y=c+dc[d];
            if (!inside(x,y) || grid[x][y]=='#') continue;
            int candidate=min(score,safety[x][y]);
            if (candidate>best[x][y]) { best[x][y]=candidate; heap.push({candidate,x,y}); }
        }
    }
    return -1;
}`)
  },
  "google-pi-index": {
    hints: ["Clarify whether the supplied digit sequence includes the leading 3.", "At position i, compare only the decimal length of i digits ending there."],
    contract: "conditional", assumptions: "Input is a finite digit string representing the chosen pi convention; positions are one-based in that string. Return the first match or -1. Generating pi to an unspecified infinite bound is not part of this implementation.",
    approach: "For each position i, convert i to decimal; if enough preceding digits exist, compare the suffix ending at i with that decimal string.",
    correctness: "The comparison tests exactly the stated ending-position condition, and ascending positions ensure the first returned match is smallest.",
    complexity: "O(D log D) time for D supplied digits, O(log D) auxiliary space.",
    edgeCases: "Index has more digits than available prefix, leading 3 convention, no match in the supplied bound and invalid nondigits.",
    code: cpp(`
int piIndex(const string& digits) {
    for (char c:digits) if (c<'0' || c>'9') throw invalid_argument("nondigit");
    for (int i=1;i<=(int)digits.size();++i) {
        string index=to_string(i);
        if ((int)index.size()<=i && digits.compare(i-index.size(),index.size(),index)==0) return i;
    }
    return -1;
}`)
  },
  "google-disjoint-swaps": {
    hints: ["Swapping equal adjacent characters changes no output and must not create a second counted choice.", "At the first unprocessed position, an unequal swap changes its first output character, distinguishing that branch."],
    contract: "conditional", assumptions: "Each adjacent pair can be swapped at most once and chosen pairs are disjoint. Include the unchanged string; return count modulo 1,000,000,007 as an explicit practice convention because the summary lacks output-range constraints.",
    approach: "Suffix DP: leave the first character unchanged, or swap it with the next only when unequal and skip both. dp[i] = dp[i+1] + (s[i] != s[i+1] ? dp[i+2] : 0).",
    correctness: "The two branches have different first output characters when unequal. Within a branch, the remaining suffix uniquely determines the output by induction; equal swaps can always be omitted without changing a string.",
    complexity: "O(n) time and O(1) auxiliary space.",
    edgeCases: "Repeated characters, empty/single-character input, and different schedules yielding the same unchanged output.",
    code: cpp(`
int distinctSwaps(const string& s) {
    const int MOD=1000000007; long long next=1,after=1;
    for (int i=(int)s.size()-1;i>=0;--i) {
        long long current=next;
        if (i+1<(int)s.size() && s[i]!=s[i+1]) current=(current+after)%MOD;
        after=next; next=current;
    }
    return (int)next;
}`)
  },
  "google-coprime-partitions": {
    hints: ["Any shared prime factor forces its occurrences into the same group.", "Transitive sharing creates components; ones have no factors but still have independent group choices."],
    contract: "conditional", assumptions: "Positive integer entries are distinct labelled positions, both groups nonempty. Return labelled-group assignments modulo 1,000,000,007. Unlabelled bipartitions require division by 2 modulo the prime; zero/negative inputs require another contract.",
    approach: "Factor each value and union positions sharing a prime. Each DSU component must go wholly to one group; with c components there are 2^c assignments, minus the two empty-group assignments when n > 0.",
    correctness: "Splitting any connected prime-sharing component creates a prime common to both products. Keeping every component intact prevents any prime from appearing in both products; each independent choice is therefore valid.",
    complexity: "Trial division O(n sqrt(A) + n log A * alpha(n)) time as a loose bound, O(n log A) factor-map space. A sieve is preferable for bounded small A.",
    edgeCases: "All ones, repeated values, one component, n < 2 and unlabelled versus labelled counting.",
    code: cpp(`
int coprimePartitions(const vector<int>& a) {
    const long long MOD=1000000007; int n=(int)a.size();
    for (int x:a) if (x<=0) throw invalid_argument("positive values required");
    if (n<2) return 0;
    vector<int> p(n),size(n,1); iota(p.begin(),p.end(),0);
    function<int(int)> root=[&](int x){return p[x]==x ? x : p[x]=root(p[x]);};
    unordered_map<int,int> owner; int components=n;
    auto factor=[&](int prime,int i) {
        auto [it,fresh]=owner.emplace(prime,i);
        if (!fresh) {
            int x=root(i),y=root(it->second);
            if (x!=y) {
                if (size[x]<size[y]) swap(x,y);
                p[y]=x; size[x]+=size[y]; --components;
            }
        }
    };
    for (int i=0;i<n;++i) {
        int x=a[i];
        for (int d=2;(long long)d*d<=x;++d) if (x%d==0) {
            factor(d,i); while (x%d==0) x/=d;
        }
        if (x>1) factor(x,i);
    }
    long long ways=1; for (int i=0;i<components;++i) ways=ways*2%MOD;
    return (ways-2+MOD)%MOD;
}`)
  },
  "google-parity-subsequences": {
    hints: ["Only the parity and length (one or two) of the last parity run matter.", "Take transitions must use a snapshot of the old states, or an element will be selected more than once."],
    contract: "specified", assumptions: "Nonempty index subsequences, not distinct value strings; negative integers use normalized parity. Count modulo 1,000,000,007.",
    approach: "Maintain counts ending in parity p with run length 1 or 2. Skipping retains all states. Taking x creates length-one runs from the empty sequence and opposite-parity states, and length-two runs from same-parity length-one states.",
    correctness: "Every valid subsequence ends in exactly one state. Appending a parity either starts a new run, extends a length-one run, or is forbidden after a same-parity length-two run; these disjoint cases exhaust valid choices.",
    complexity: "O(n) time and O(1) space.",
    edgeCases: "All one parity, negative odd values, empty input and duplicate values at different positions.",
    code: cpp(`
int paritySubsequences(const vector<int>& a) {
    const long long MOD=1000000007;
    array<array<long long,2>,2> dp{};
    for (int x:a) {
        int p=((x%2)+2)%2; auto old=dp;
        dp[p][0]=(old[p][0]+1+old[1-p][0]+old[1-p][1])%MOD;
        dp[p][1]=(old[p][1]+old[p][0])%MOD;
    }
    return (dp[0][0]+dp[0][1]+dp[1][0]+dp[1][1])%MOD;
}`)
  },
  "google-digit-palindrome": {
    hints: ["A palindrome has at most one digit with an odd count.", "Choose the digit set first, then find the smallest feasible left half rather than generating every permutation."],
    contract: "conditional", assumptions: "N is a nonnegative decimal integer string. Zero cannot occur because its required count would be zero. Digits 1..9 are optional; every chosen d occurs d times. Return nullopt if no larger such palindrome exists.",
    approach: "Enumerate digit subsets having at most one odd digit. Their counts fix the middle and left-half multiset. For the same length as N, search the lexicographically smallest half not below N's prefix; if its mirror is not larger, backtrack to the next feasible half. For greater lengths, use the sorted half. Compare numeric strings by length then lexicographically.",
    correctness: "Each valid palindrome belongs to exactly one chosen-digit subset and is determined by its left half and middle. Prefix-ordered search visits only feasible halves at or above the bound, returning the smallest whose mirror exceeds N. The minimum across all subsets is the required number.",
    complexity: "At most 95 nonempty feasible digit subsets, maximum length 29. Prefix search follows the equality path then a strictly-greater path; O(95 * 10 * L^2) time as a conservative bound and O(L) working space, not factorial enumeration.",
    edgeCases: "N itself valid (strict inequality), leading zeros in input, one-digit results and N exceeding the largest possible valid palindrome.",
    code: cpp(`
optional<string> nextSelfPalindrome(string N) {
    if (N.empty()) throw invalid_argument("empty number");
    for (char c:N) if (c<'0' || c>'9') throw invalid_argument("number");
    size_t first=N.find_first_not_of('0'); N=first==string::npos ? "0" : N.substr(first);
    optional<string> answer;
    auto lessNumber=[](const string& a,const string& b) {
        return a.size()!=b.size() ? a.size()<b.size() : a<b;
    };
    for (int mask=1;mask<(1<<9);++mask) {
        array<int,10> count{}; int length=0,odds=0; string middle;
        for (int d=1;d<=9;++d) if (mask&(1<<(d-1))) {
            length+=d; count[d]=d/2;
            if (d%2) { ++odds; middle=string(1,char('0'+d)); }
        }
        if (odds>1 || length<(int)N.size()) continue;
        int half=length/2; string prefix,result;
        bool same=length==(int)N.size();
        function<bool(bool)> search=[&](bool greater) {
            if ((int)prefix.size()==half) {
                string reversed=prefix; reverse(reversed.begin(),reversed.end());
                string full=prefix+middle+reversed;
                if (lessNumber(N,full)) { result=full; return true; }
                return false;
            }
            int position=(int)prefix.size();
            int lower=same && !greater ? N[position]-'0' : 1;
            for (int d=max(1,lower);d<=9;++d) if (count[d]) {
                --count[d]; prefix.push_back(char('0'+d));
                if (search(greater || (same && d>lower))) return true;
                prefix.pop_back(); ++count[d];
            }
            return false;
        };
        if (search(!same) && (!answer || lessNumber(result,*answer))) answer=result;
    }
    return answer;
}`)
  },
  "google-prime-labelled-tree": {
    hints: ["There are only 25 prime labels up to 100.", "For each node and possible label, combine independent child choices compatible with that label."],
    contract: "specified", assumptions: "Connected tree, labels may repeat. Count assignments modulo 1,000,000,007; every edge sum must be non-prime (not prime). Empty tree has one empty assignment as a practice convention.",
    approach: "Sieve through 200, enumerate prime labels through 100. Postorder dp[v][p] multiplies over children the sum of their dp values for labels q with composite p+q. Use an iterative traversal to avoid chain-depth recursion.",
    correctness: "Fixing the parent's label makes different child subtrees independent. Summing compatible child labels and multiplying across children counts every valid assignment exactly once.",
    complexity: "O(n * 25^2) time and O(n * 25) space.",
    edgeCases: "One node gives 25, label 2 paired with 2 gives composite 4, 2 plus an odd prime may be prime, and long chains.",
    code: cpp(`
int primeTree(int n,const vector<pair<int,int>>& edges) {
    const long long MOD=1000000007; if (n==0) return 1;
    vector<bool> prime(201,true); prime[0]=prime[1]=false;
    for (int p=2;p*p<=200;++p) if (prime[p])
        for (int x=p*p;x<=200;x+=p) prime[x]=false;
    vector<int> labels; for (int p=2;p<=100;++p) if (prime[p]) labels.push_back(p);
    vector<vector<int>> g(n);
    for (auto [u,v]:edges) { g[u].push_back(v); g[v].push_back(u); }
    vector<int> parent(n,-1),order{0}; parent[0]=0;
    for (size_t i=0;i<order.size();++i)
        for (int v:g[order[i]]) if (v!=parent[order[i]]) {
            parent[v]=order[i]; order.push_back(v);
        }
    int P=(int)labels.size(); vector<vector<long long>> dp(n,vector<long long>(P,1));
    for (int i=n-1;i>=0;--i) {
        int u=order[i];
        for (int v:g[u]) if (parent[v]==u)
            for (int p=0;p<P;++p) {
                long long ways=0;
                for (int q=0;q<P;++q)
                    if (!prime[labels[p]+labels[q]]) ways=(ways+dp[v][q])%MOD;
                dp[u][p]=dp[u][p]*ways%MOD;
            }
    }
    return accumulate(dp[0].begin(),dp[0].end(),0LL)%MOD;
}`)
  }
};
