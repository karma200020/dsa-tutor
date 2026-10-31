import type { QuestionSolution } from "./schema";

const cpp = (body: string) => `#include <bits/stdc++.h>\nusing namespace std;\n\n${body.trim()}\n`;

export const expandedSolutions: Record<string, QuestionSolution> = {
  "google-unique-range": {
    hints: ["For each right endpoint, record the earliest start of its longest duplicate-free suffix.", "A previous occurrence forces that start past the occurrence, but never moves it backwards."],
    contract: "conditional", assumptions: "Immutable array, inclusive zero-based [l,r] queries. Return whether all values in that subarray are distinct; invalid query indices throw.",
    approach: "Track previous positions in a hash map. frontier[r]=max(frontier[r-1], previous(a[r])+1). Answer a query by checking l >= frontier[r].",
    correctness: "The recurrence removes precisely the new duplicate and preserves all earlier duplicate exclusions. Thus starts at or after the frontier give duplicate-free suffixes, while earlier starts contain a repeated value.",
    complexity: "Expected O(n) preprocessing time, O(n) space, O(1) per query. Updates invalidate this static preprocessing.",
    edgeCases: "Single-element queries, duplicates just before l, repeated values at both endpoints and all-equal arrays.",
    code: cpp(`
class UniqueRanges{
    vector<int>frontier;
public:
    explicit UniqueRanges(const vector<int>& a):frontier(a.size()){
        unordered_map<int,int>previous;int start=0;
        for(int r=0;r<(int)a.size();++r){auto it=previous.find(a[r]);if(it!=previous.end())start=max(start,it->second+1);frontier[r]=start;previous[a[r]]=r;}
    }
    bool query(int l,int r)const{
        if(l<0||r<l||r>=(int)frontier.size())throw out_of_range("range");
        return l>=frontier[r];
    }
};`)
  },
  "google-point-squares": {
    hints: ["An oriented square side determines its other two vertices by a ninety-degree rotation.", "Count outputs consistently: each square has four sides, including when rotated."],
    contract: "conditional", assumptions: "Unique integer-coordinate points, absolute coordinates <= 1,000,000. Count geometric squares once; duplicate-coordinate multiplicity is not implemented.",
    approach: "Deduplicate points. For each unordered point pair, try both perpendicular side offsets and look up the other vertices in a set. Divide the number of successful side constructions by four. Incremental existence can stop on a successful construction; duplicated input occurrences need an explicit weighted-count contract.",
    correctness: "Every successful construction consists of four equal perpendicular sides. Each geometric square is discovered once from each of its four unordered sides, with exactly one of the two perpendicular offsets.",
    complexity: "O(n^2 log n) time with an ordered point set; O(n) space.",
    edgeCases: "Rotated squares, duplicate inputs, collinear points and fewer than four unique points; integer arithmetic avoids floating equality.",
    code: cpp(`
long long countSquares(vector<pair<long long,long long>> points) {
    set<pair<long long,long long>> lookup(points.begin(),points.end());
    points.assign(lookup.begin(),lookup.end()); long long sides=0;
    for (int i=0;i<(int)points.size();++i) for (int j=i+1;j<(int)points.size();++j) {
        auto [x,y]=points[i]; auto [u,v]=points[j];
        long long dx=u-x,dy=v-y;
        for (int sign:{-1,1})
            if (lookup.count({x-sign*dy,y+sign*dx}) &&
                lookup.count({u-sign*dy,v+sign*dx})) ++sides;
    }
    return sides/4;
}`)
  },
  "google-step-subsequence": {
    hints: ["dp for a value records the best subsequence ending in that value among earlier positions.", "For the bounded variant, query the maximum over [x-d,x-1], not just x-1."],
    contract: "conditional", assumptions: "d >= 1; consecutive selected values must increase by 1..d. Use d=1 for the first reported task. Values and x-d fit long long.",
    approach: "Compress values and maintain a range-maximum segment tree. Query the allowed predecessor-value interval before updating the current value's best length.",
    correctness: "Each valid subsequence ending at x is an earlier valid subsequence ending at an allowed predecessor followed by x. The maximum query chooses the best such predecessor while preserving input index order.",
    complexity: "O(n log n) time and O(n) space.",
    edgeCases: "Duplicate values cannot extend each other, negative values, empty input and a large d.",
    code: cpp(`
int stepSubsequence(const vector<long long>& a,long long d) {
    if (d<1) throw invalid_argument("positive d");
    vector<long long> v=a; sort(v.begin(),v.end()); v.erase(unique(v.begin(),v.end()),v.end());
    int size=1;while(size<(int)v.size())size*=2;vector<int> tree(2*size);
    auto query=[&](int l,int r){int best=0;for(l+=size,r+=size;l<r;l/=2,r/=2){
        if(l&1)best=max(best,tree[l++]);if(r&1)best=max(best,tree[--r]);}return best;};
    int answer=0;
    for (long long x:a) {
        int l=lower_bound(v.begin(),v.end(),x-d)-v.begin();
        int r=lower_bound(v.begin(),v.end(),x)-v.begin();
        int length=1+query(l,r),p=r+size;tree[p]=max(tree[p],length);
        for(p/=2;p;p/=2)tree[p]=max(tree[2*p],tree[2*p+1]);
        answer=max(answer,length);
    }
    return answer;
}`)
  },
  "google-security-path": {
    hints: ["Minimizing the worst edge is different from minimizing the sum of edges.", "A path extension changes the score to max(current bottleneck, edge level)."],
    contract: "conditional", assumptions: "Directed edges with signed integer levels; s != t, return the minimum bottleneck or nullopt if unreachable. For strictly level < S and integer S, answer is bottleneck+1, provided no overflow. A real-valued threshold has only an infimum, not necessarily a smallest valid S.",
    approach: "Run a min-priority bottleneck search. Initialize the source to negative infinity so negative levels are handled correctly, and relax with max. Cycles cannot lower an already settled bottleneck.",
    correctness: "Extension never decreases a bottleneck. Therefore the smallest tentative score can be settled by the same cut argument as Dijkstra, without requiring edge levels to be nonnegative.",
    complexity: "O((V+E) log V) time with a heap, O(V+E) space. Heap entries can be O(E).",
    edgeCases: "Negative levels, disconnected targets, parallel edges and cycles. The empty path when s=t needs a separate threshold convention and is rejected.",
    code: cpp(`
optional<long long> securityPath(const vector<vector<pair<int,long long>>>& g,int s,int t) {
    if(s==t)throw invalid_argument("empty path threshold undefined");
    vector<optional<long long>> best(g.size());best[s]=LLONG_MIN;
    priority_queue<pair<long long,int>,vector<pair<long long,int>>,greater<pair<long long,int>>> heap;
    heap.push({LLONG_MIN,s});
    while(!heap.empty()){
        auto[score,u]=heap.top();heap.pop();if(!best[u]||score!=*best[u])continue;
        if(u==t)return score;
        for(auto[v,w]:g[u]){long long next=max(score,w);
            if(!best[v]||next<*best[v]){best[v]=next;heap.push({next,v});}}
    }
    return nullopt;
}
optional<long long> strictSecurityThreshold(const vector<vector<pair<int,long long>>>& g,int s,int t) {
    auto bottleneck=securityPath(g,s,t);
    if(!bottleneck)return nullopt;
    if(*bottleneck==LLONG_MAX)throw overflow_error("no representable strict threshold");
    return *bottleneck+1;
}`)
  },
  "google-root-leaf-cut": {
    hints: ["For a child branch, either cut its parent edge or disconnect all original leaves inside it.", "An original leaf cannot disconnect itself from itself; its internal-cut cost is infeasible."],
    contract: "conditional", assumptions: "A connected rooted tree with positive edge costs; leaves are defined before any cuts. Return nullopt when the root itself is the only original leaf. Total cost fits long long.",
    approach: "Postorder each branch: choose min(parent-edge cost, child's internal disconnection cost). Sum independent branch costs. Represent a leaf's internal cost as infeasible rather than zero.",
    correctness: "Every original-leaf path in a child branch crosses its parent edge. A feasible solution either removes that edge or leaves it and must disconnect every original leaf below; different branches share no edges.",
    complexity: "O(n) time and space, works for n-ary trees as well as binary.",
    edgeCases: "One node, expensive edge above cheap lower cuts and long chains. Negative-edge follow-up changes the model and is not solved by this positive-cost recurrence.",
    code: cpp(`
optional<long long> rootLeafCut(const vector<vector<pair<int,long long>>>& g,int root) {
    int n=g.size();vector<int> parent(n,-1),order{root};parent[root]=root;
    for(size_t i=0;i<order.size();++i)for(auto[v,w]:g[order[i]])if(v!=parent[order[i]]){
        if(w<=0)throw invalid_argument("positive edges");parent[v]=order[i];order.push_back(v);}
    vector<optional<long long>> dp(n);
    for(int i=n-1;i>=0;--i){int u=order[i];long long sum=0;bool child=false;
        for(auto[v,w]:g[u])if(parent[v]==u){child=true;sum+=dp[v]?min(w,*dp[v]):w;}
        if(child)dp[u]=sum;
    }
    return dp[root];
}`)
  },
  "google-ad-selection": {
    hints: ["The previously returned ad is ineligible for exactly the next call.", "Hold it out of the score heap temporarily, then reinsert it."],
    contract: "conditional", assumptions: "Unique integer ad IDs, insertion rejects an existing ID; score ties choose smaller ID. No eligible ad returns nullopt. A failed selection does not reset the previous ad; scores may become negative and must not underflow.",
    approach: "A heap orders by score and then ID. On selection, temporarily remove the previous ad if it is on top, choose the next top, decrement it, and restore both entries. Cooldowns longer than one call need a separate eligibility schedule.",
    correctness: "Only the previous ad is excluded. Removing it when necessary exposes the maximum among all eligible ads; repairing its score and restoring the excluded entry preserves the heap for future calls.",
    complexity: "O(log A) insertion/selection, O(A) space. No constant-time claim is made for arbitrary score updates.",
    edgeCases: "Zero or one ad, equal scores, alternating leaders and negative scores.",
    code: cpp(`
class AdService {
    struct Ad {long long score;int id;};
    struct Compare {bool operator()(Ad a,Ad b)const{return a.score!=b.score?a.score<b.score:a.id>b.id;}};
    priority_queue<Ad,vector<Ad>,Compare> heap;unordered_set<int> ids;optional<int> previous;
public:
    void insertAd(int id,long long score){if(!ids.insert(id).second)throw invalid_argument("duplicate ad");heap.push({score,id});}
    optional<int> getAd(){
        optional<Ad> held;
        if(!heap.empty()&&previous&&heap.top().id==*previous){held=heap.top();heap.pop();}
        if(heap.empty()){if(held)heap.push(*held);return nullopt;}
        Ad chosen=heap.top();heap.pop();
        if(chosen.score==LLONG_MIN)throw overflow_error("score underflow");
        --chosen.score;heap.push(chosen);if(held)heap.push(*held);previous=chosen.id;return chosen.id;
    }
};`)
  },
  "google-equal-set-substrings": {
    hints: ["Lowercase distinct-character sets fit a 26-bit mask.", "Fix the boundary between the substrings, then count left masks and match right masks."],
    contract: "specified", assumptions: "Lowercase a..z, triples use inclusive i..j and j+1..k, both nonempty; return exact count fitting long long.",
    approach: "For each split, sweep left starts backwards to count masks. Sweep right ends forwards and add the frequency of the equal mask. Sets ignore character multiplicity.",
    correctness: "Each triple has a unique split j. At that split its left mask is counted exactly once and its right end contributes exactly the number of matching left starts.",
    complexity: "Expected O(n^2) time with hashing, O(min(n,26)) distinct-mask space at one split because masks grow monotonically.",
    edgeCases: "One character, repeated runs, all distinct characters and unequal substring lengths with equal sets.",
    code: cpp(`
long long equalSetTriples(const string& s){
    for(char c:s)if(c<'a'||c>'z')throw invalid_argument("lowercase");
    long long answer=0;int n=s.size();
    for(int split=1;split<n;++split){
        unordered_map<unsigned,long long> counts;unsigned mask=0;
        for(int i=split-1;i>=0;--i){mask|=1u<<(s[i]-'a');++counts[mask];}
        mask=0;for(int k=split;k<n;++k){mask|=1u<<(s[k]-'a');auto it=counts.find(mask);if(it!=counts.end())answer+=it->second;}
    }
    return answer;
}`)
  },
  "google-favorite-city": {
    hints: ["A road-weight sum needs shortest distances, not a bottleneck algorithm.", "For an onward-target follow-up in a directed graph, run the second search on reversed edges."],
    contract: "conditional", assumptions: "Directed nonnegative integer road times. Baseline returns (favorite,total time), ties smaller city ID; optional target requires source -> favorite -> target. Empty/unreachable favorite sets return nullopt. Sum fits long long.",
    approach: "Dijkstra from the source gives each favorite's arrival time. With a target, Dijkstra from the target on the reversed graph supplies favorite-to-target times; minimize their sum. A fixed via-city version first computes source-to-via, then distances from via.",
    correctness: "Nonnegative weights justify Dijkstra. A route constrained through a favorite decomposes into two shortest segments, whose lengths add; minimizing over favorites exhausts all allowed via choices.",
    complexity: "O((V+E) log V + favorites) time and O(V+E) space for at most two searches.",
    edgeCases: "Directed asymmetry, zero-weight edges, unreachable favorites, source itself a favorite and ties.",
    code: cpp(`
optional<pair<int,long long>> favoriteCity(const vector<vector<pair<int,long long>>>& g,int s,
                                          const vector<int>& favorites,optional<int> target=nullopt){
    auto distances=[](const auto& graph,int start){
        vector<long long>d(graph.size(),LLONG_MAX);d[start]=0;
        priority_queue<pair<long long,int>,vector<pair<long long,int>>,greater<pair<long long,int>>>q;q.push({0,start});
        while(!q.empty()){auto[time,u]=q.top();q.pop();if(time!=d[u])continue;
            for(auto[v,w]:graph[u]){if(w<0)throw invalid_argument("negative road");
                if(time<=LLONG_MAX-w&&time+w<d[v]){d[v]=time+w;q.push({d[v],v});}}}
        return d;
    };
    auto from=distances(g,s);vector<long long>to(g.size(),0);
    if(target){vector<vector<pair<int,long long>>>reverse(g.size());for(int u=0;u<(int)g.size();++u)for(auto[v,w]:g[u])reverse[v].push_back({u,w});to=distances(reverse,*target);}
    optional<pair<int,long long>> result;
    for(int f:favorites)if(from[f]!=LLONG_MAX&&to[f]!=LLONG_MAX&&from[f]<=LLONG_MAX-to[f]){
        long long time=from[f]+to[f];
        if(!result||time<result->second||(time==result->second&&f<result->first))result={{f,time}};
    }
    return result;
}`)
  },
  "google-bisect-square-area": {
    hints: ["Area below a horizontal line grows monotonically.", "For additive overlap, each square contributes side * clamped vertical height; a centroid is not an area median."],
    contract: "conditional", assumptions: "Cartesian top-left (x,y), positive side a, so vertical extent is [y-a,y]. Overlaps count separately. Return a bisection coordinate to the precision of long double; choose the lowest dividing line across a flat gap.",
    approach: "Binary-search y between the lowest bottom and highest top. Compute the sum a * clamp(y-bottom,0,a). Compare to half the total square areas. For union-area semantics, x matters and an x-coverage sweep is required instead.",
    correctness: "The area function is continuous and nondecreasing from zero to the total. Lower-bound bisection converges to its first half-area crossing; it does not use the incorrect weighted-centroid shortcut.",
    complexity: "O(100*n) time for 100 iterations, O(1) auxiliary space. Numeric accuracy depends on coordinate magnitude.",
    edgeCases: "Disjoint vertical gaps, overlapping squares, negative coordinates and one square.",
    code: cpp(`
struct Square{long double x,y,side;};
long double bisectArea(const vector<Square>& squares){
    if(squares.empty())throw invalid_argument("no squares");
    long double lo=numeric_limits<long double>::infinity(),hi=-lo,total=0;
    for(auto s:squares){if(s.side<=0)throw invalid_argument("positive side");lo=min(lo,s.y-s.side);hi=max(hi,s.y);total+=s.side*s.side;}
    for(int iteration=0;iteration<100;++iteration){long double mid=(lo+hi)/2,below=0;
        for(auto s:squares)below+=s.side*clamp(mid-(s.y-s.side),0.0L,s.side);
        if(below>=total/2)hi=mid;else lo=mid;
    }
    return hi;
}`)
  },
  "google-maximum-rectangle": {
    hints: ["A rectangle's diagonals have the same midpoint and length.", "Group candidate diagonals by doubled midpoint and squared length, then compare pairs in a group."],
    contract: "conditional", assumptions: "Unique integer points with absolute coordinates <= 1,000,000; return maximum area, 0 if none. Both rotated and axis-aligned rectangles qualify.",
    approach: "Group unordered point pairs by midpoint sum and squared distance. Two distinct diagonals in one group form a rectangle. Its area is half the absolute cross product of the diagonal vectors.",
    correctness: "Diagonals bisecting each other form a parallelogram; equal diagonal length makes it a rectangle. Every rectangle appears in its diagonal group, and the cross-product formula computes its area exactly before division.",
    complexity: "O(n^2 log n + sum(group size^2)) time and O(n^2) space; worst-case O(n^4) is a safe upper bound, not an O(n^2) promise.",
    edgeCases: "No rectangle, collinear points, rotated shapes and duplicates.",
    code: cpp(`
long double maxRectangle(vector<pair<long long,long long>> points){
    sort(points.begin(),points.end());points.erase(unique(points.begin(),points.end()),points.end());
    map<tuple<long long,long long,long long>,vector<pair<long long,long long>>> groups;
    for(int i=0;i<(int)points.size();++i)for(int j=i+1;j<(int)points.size();++j){
        auto[x,y]=points[i];auto[u,v]=points[j];long long dx=u-x,dy=v-y;
        groups[{x+u,y+v,dx*dx+dy*dy}].push_back({dx,dy});
    }
    long long twice=0;
    for(const auto&[key,diagonals]:groups)for(int i=0;i<(int)diagonals.size();++i)for(int j=i+1;j<(int)diagonals.size();++j){
        auto[x,y]=diagonals[i];auto[u,v]=diagonals[j];twice=max(twice,llabs(x*v-y*u));}
    return (long double)twice/2;
}`)
  },
  "google-weighted-jobs": {
    hints: ["Sort by finish time and consider taking or skipping each job.", "Binary-search the prefix of jobs ending no later than the current start."],
    contract: "conditional", assumptions: "Half-open jobs [start,end) with start < end; touching boundaries are compatible. Empty schedule allowed; profits may be signed and sums fit long long.",
    approach: "dp[i] is the best profit using the first i finish-sorted jobs. Compare dp[i-1] with the current profit plus dp at the count of compatible earlier jobs.",
    correctness: "An optimum either excludes the current job or includes it, in which case all other jobs lie in the compatible earlier prefix. These cases are disjoint and exhaustive.",
    complexity: "O(n log n) time and O(n) space.",
    edgeCases: "Touching intervals, all-negative profits, duplicate times and one long job versus several short ones. Job-count caps/dependencies need additional state.",
    code: cpp(`
struct Job{long long start,end,profit;};
long long weightedJobs(vector<Job> jobs){
    for(auto j:jobs)if(j.start>=j.end)throw invalid_argument("job interval");
    sort(jobs.begin(),jobs.end(),[](Job a,Job b){return a.end<b.end;});
    vector<long long> ends,dp(jobs.size()+1);for(auto j:jobs)ends.push_back(j.end);
    for(size_t i=0;i<jobs.size();++i){
        int compatible=upper_bound(ends.begin(),ends.begin()+i,jobs[i].start)-ends.begin();
        dp[i+1]=max(dp[i],dp[compatible]+jobs[i].profit);
    }
    return dp.back();
}`)
  },
  "google-binary-tree-root": {
    hints: ["A non-root node uses one incident edge for its parent.", "The root uses no parent edge, so its degree must be at most two."],
    contract: "conditional", assumptions: "Connected undirected tree with maximum degree three. Optional colors are binary; alternating layers mean every edge joins opposite colors.",
    approach: "Check degrees and, for the colored variant, every edge's colors. Choose any vertex with degree <= 2, such as a leaf.",
    correctness: "Non-root child count is degree minus one, hence at most two. Root child count is its degree. Alternating layers are equivalent to opposite colors on all edges in a tree.",
    complexity: "O(n) time, O(1) extra space excluding supplied graph/colors.",
    edgeCases: "Single vertex, degree-four input, equal-colored adjacent nodes and no supplied colors.",
    code: cpp(`
optional<int> binaryRoot(const vector<vector<int>>& g,const vector<int>& colors={}){
    if(!colors.empty()&&colors.size()!=g.size())throw invalid_argument("colors");
    optional<int> result;
    for(int u=0;u<(int)g.size();++u){
        if(g[u].size()>3)return nullopt;
        if(!colors.empty())for(int v:g[u])if(colors[u]==colors[v])return nullopt;
        if(!result&&g[u].size()<=2)result=u;
    }
    return result;
}`)
  },
  "google-closed-grid-walk": {
    hints: ["A grid graph is bipartite, so every closed walk has even length.", "After a candidate step, require enough steps to return and matching distance parity."],
    contract: "conditional", assumptions: "Rectangular undirected obstacle grid, four moves ordered D < L < R < U, revisits allowed. Return nullopt if impossible and empty string for k=0. Start is open.",
    approach: "BFS from the start gives return distances. Greedily try moves in lexical order; accept a neighbor if its return distance <= remaining steps and their parity agrees. Extra even steps can be spent traversing an edge out and back.",
    correctness: "The distance/parity test is sufficient in this undirected component whenever a positive-length closed walk has an edge available. Choosing the first move admitting a completion fixes the smallest feasible prefix at every step.",
    complexity: "O(rows*columns + k) time and O(rows*columns + k) space including output.",
    edgeCases: "Odd k, isolated start, obstacles, k=0 and a corridor requiring repeated visits.",
    code: cpp(`
optional<string> closedWalk(const vector<string>& grid,int sr,int sc,int k){
    if(k<0)throw invalid_argument("negative steps");
    int n=grid.size(),m=grid.at(0).size();const int dr[]={1,0,0,-1},dc[]={0,-1,1,0};const string moves="DLRU";
    auto open=[&](int r,int c){return r>=0&&r<n&&c>=0&&c<m&&grid[r][c]!='#';};
    if(!open(sr,sc))throw invalid_argument("start");
    vector<vector<int>>d(n,vector<int>(m,-1));queue<pair<int,int>>q;q.push({sr,sc});d[sr][sc]=0;
    while(!q.empty()){auto[r,c]=q.front();q.pop();for(int i=0;i<4;++i){int x=r+dr[i],y=c+dc[i];if(open(x,y)&&d[x][y]<0){d[x][y]=d[r][c]+1;q.push({x,y});}}}
    if(k%2)return nullopt;
    string result;int r=sr,c=sc;
    for(int remaining=k-1;remaining>=0;--remaining){
        bool found=false;
        for(int i=0;i<4;++i){int x=r+dr[i],y=c+dc[i];
            if(open(x,y)&&d[x][y]<=remaining&&(remaining-d[x][y])%2==0){result+=moves[i];r=x;c=y;found=true;break;}}
        if(!found)return nullopt;
    }
    return result;
}`)
  },
  "google-device-cooldown": {
    hints: ["Specify whether the last accepted event or last observed event controls suppression.", "Under accepted-event cooldown, one timestamp per deduplication key is enough."],
    contract: "conditional", assumptions: "Events arrive in nondecreasing nonnegative integer seconds. Key is device plus utterance. Accept at exactly ten seconds since last accepted matching event; rejected events do not extend the window.",
    approach: "Map each key to its last accepted timestamp. Accept an unseen key or an elapsed gap >= 10; update only on acceptance. Other boundary/cooldown interpretations need different update rules.",
    correctness: "The map stores precisely the latest accepted occurrence for each key, so the comparison implements the declared suppression condition independently for every key.",
    complexity: "O(n log K) time with the ordered map shown and O(K) space for K distinct keys; a hash implementation gives expected O(n) time. Retention/expiry policy is separate.",
    edgeCases: "Equal timestamps, two devices with the same utterance, repeated rejected events and the exact ten-second boundary.",
    code: cpp(`
struct DeviceEvent{string device,utterance;long long time;};
vector<bool> acceptEvents(const vector<DeviceEvent>& events){
    map<pair<string,string>,long long> last;vector<bool> accepted;long long previous=-1;
    for(const auto&e:events){
        if(e.time<previous||e.time<0)throw invalid_argument("nonmonotonic time");previous=e.time;
        auto key=make_pair(e.device,e.utterance);auto it=last.find(key);
        bool ok=it==last.end()||e.time-it->second>=10;accepted.push_back(ok);if(ok)last[key]=e.time;
    }
    return accepted;
}`)
  },
  "google-top-k-frequency": {
    hints: ["Count values first; frequency and value are different ordering keys.", "Decide how ties and k larger than the number of distinct values are handled."],
    contract: "conditional", assumptions: "Return min(k,distinct values), sorted by decreasing frequency, ties smaller value; k >= 0.",
    approach: "Count with a hash map and sort distinct values by the declared order, then take the prefix. A size-k heap or frequency buckets can optimize larger inventories.",
    correctness: "Each distinct value receives its exact occurrence count, and sorting directly produces the requested total order; its first k entries are the top k.",
    complexity: "Expected O(n + A log A) time and O(A) space for A distinct values.",
    edgeCases: "k=0, empty input, tied counts and k exceeding A.",
    code: cpp(`
vector<int> topFrequency(const vector<int>& a,int k){
    if(k<0)throw invalid_argument("negative k");
    unordered_map<int,int> count;for(int x:a)++count[x];
    vector<int> values;for(auto[x,c]:count)values.push_back(x);
    sort(values.begin(),values.end(),[&](int x,int y){return count[x]!=count[y]?count[x]>count[y]:x<y;});
    if(k<(int)values.size())values.resize(k);return values;
}`)
  },
  "google-tree-consecutive": {
    hints: ["For the downward version, a broken parent-child step resets the run.", "An any-direction extension must join increasing and decreasing arms, not two increasing arms."],
    contract: "conditional", assumptions: "Baseline counts nodes on a downward parent-child path increasing by exactly one. Binary-tree values fit int; use widened comparisons. Recursion requires manageable height.",
    approach: "DFS carrying the current consecutive run length, reset to one when the edge is not +1, and maximize over nodes. For an any-direction path, postorder separate +1 and -1 arms and combine them through a node.",
    correctness: "The carried length is exactly the longest valid downward run ending at the current node. Every downward path ends at some node, so the maximum is complete.",
    complexity: "O(n) time and O(height) stack.",
    edgeCases: "Empty tree, equal values, decreasing chains, a valid path below the root and integer boundary values.",
    code: cpp(`
struct ConsecutiveNode{int value;ConsecutiveNode *left=nullptr,*right=nullptr;};
int consecutivePath(ConsecutiveNode* root){
    int best=0;
    function<void(ConsecutiveNode*,ConsecutiveNode*,int)>visit=[&](auto*u,auto*p,int length){
        if(!u)return;length=p&&(long long)u->value==(long long)p->value+1?length+1:1;
        best=max(best,length);visit(u->left,u,length);visit(u->right,u,length);
    };visit(root,nullptr,0);return best;
}`)
  },
  "google-element-segmentation": {
    hints: ["Element symbols have length one or two, but the same word can have several segmentations.", "Use suffix/prefix counts rather than a boolean word-break state."],
    contract: "conditional", assumptions: "The caller supplies valid element symbols; ASCII case is ignored, symbols can be reused, duplicate symbols deduplicated. Empty word has one segmentation. Return modulo 1,000,000,007 as a stated practice convention.",
    approach: "Normalize symbols and word to lowercase. dp[i] counts segmentations of the first i letters; extend by every symbol matching the next substring.",
    correctness: "Every segmentation has a unique last symbol and an earlier segmented prefix. Adding matching-symbol transitions counts these disjoint decompositions once.",
    complexity: "O(word length * symbol count * maximum symbol length) time and O(word length + symbols) space.",
    edgeCases: "No segmentation, case differences, repeated symbols and empty word.",
    code: cpp(`
int elementWays(string word,vector<string> symbols){
    auto lower=[](string s){for(char&c:s){if(!isalpha((unsigned char)c))throw invalid_argument("letters");c=tolower((unsigned char)c);}return s;};
    word=lower(word);set<string> unique;for(auto s:symbols){s=lower(s);if(s.empty()||s.size()>2)throw invalid_argument("symbol");unique.insert(s);}
    const long long MOD=1000000007;vector<long long>dp(word.size()+1);dp[0]=1;
    for(size_t i=0;i<word.size();++i)for(const auto&s:unique)if(word.compare(i,s.size(),s)==0)dp[i+s.size()]=(dp[i+s.size()]+dp[i])%MOD;
    return dp.back();
}`)
  },
  "google-determined-ranks": {
    hints: ["A player has an exact rank only if their relation to every other player is known.", "Transitive outcomes determine additional better/worse relations."],
    contract: "conditional", assumptions: "Players have distinct ranks in a consistent total order. Edge (u,v) means u outranks v. Contradictory cycles throw; unknown outcomes are not ties.",
    approach: "Compute transitive reachability. For player v, count players reaching v and players reachable from v. If the total is n-1, rank is forced to one plus its number of predecessors.",
    correctness: "Comparability with everyone fixes all players above and below v. If an incomparable player exists, topological orders can place that player on either side, so v's exact rank is not forced.",
    complexity: "O(n^3) time and O(n^2) space with Floyd-Warshall; graph/bitset optimizations may be needed for larger bounds.",
    edgeCases: "One player, disconnected outcomes, redundant edges and inconsistent cycles.",
    code: cpp(`
int determinedRanks(int n,const vector<pair<int,int>>& outcomes){
    vector<vector<bool>>reach(n,vector<bool>(n));
    for(auto[u,v]:outcomes)reach[u][v]=true;
    for(int k=0;k<n;++k)for(int i=0;i<n;++i)for(int j=0;j<n;++j)reach[i][j]=reach[i][j]||(reach[i][k]&&reach[k][j]);
    int answer=0;
    for(int i=0;i<n;++i){if(reach[i][i])throw invalid_argument("contradictory ranks");
        int known=0;for(int j=0;j<n;++j)if(i!=j&&(reach[i][j]||reach[j][i]))++known;answer+=known==n-1;}
    return answer;
}`)
  },
  "google-piano-repositions": {
    hints: ["One fixed hand placement can cover a block exactly when max(note)-min(note) <= k.", "Take the longest feasible prefix before repositioning; the initial placement costs nothing."],
    contract: "conditional", assumptions: "One hand covers a continuous coordinate interval of span k >= 0. Initial placement is free; every change between played blocks costs one. No finger/key-count or motion-distance constraint. Coordinate spans fit long long.",
    approach: "Grow a block while its min/max span fits. When the next note breaks the span, start a new block at that note and increment the reposition count.",
    correctness: "Every feasible first block ends no later than the longest feasible prefix. Extending it to that prefix cannot increase the remaining number of blocks, because the remaining suffix only gets shorter. Repeating yields a minimum-block partition.",
    complexity: "O(n) time and O(1) space.",
    edgeCases: "Empty sequence, k=0, repeats, decreasing notes and the source's incorrect six-note example: [1,3,5,7,9,11], k=4 needs one reposition.",
    code: cpp(`
int pianoMoves(const vector<long long>& notes,long long k){
    if(k<0)throw invalid_argument("span");if(notes.empty())return 0;
    long long lo=notes[0],hi=lo;int moves=0;
    for(long long x:notes){long long nextLo=min(lo,x),nextHi=max(hi,x);
        if(nextHi-nextLo>k){++moves;lo=hi=x;}else{lo=nextLo;hi=nextHi;}}
    return moves;
}`)
  },
  "google-univalue-path": {
    hints: ["A parent can extend only a child arm with the same value.", "Two equal-valued child arms can form a path through the current node."],
    contract: "conditional", assumptions: "Return number of edges, not nodes, on the longest equal-value binary-tree path. Empty tree returns zero.",
    approach: "Postorder returns the longest equal-valued downward arm in edges. Extend compatible child arms by one; update the answer with left+right and return max(left,right).",
    correctness: "Every path has a highest node and at most two downward arms. Compatible best arms give the best path through that node; only one arm can extend to its parent.",
    complexity: "O(n) time, O(height) recursion space.",
    edgeCases: "Single node, all equal values, unequal root and a longest path entirely below it.",
    code: cpp(`
struct EqualNode{int value;EqualNode *left=nullptr,*right=nullptr;};
int univaluePath(EqualNode* root){
    int best=0;function<int(EqualNode*)>down=[&](EqualNode*u){
        if(!u)return 0;int left=down(u->left),right=down(u->right);
        left=u->left&&u->left->value==u->value?left+1:0;
        right=u->right&&u->right->value==u->value?right+1:0;
        best=max(best,left+right);return max(left,right);
    };down(root);return best;
}`)
  },
  "google-movie-component": {
    hints: ["Similarity is transitive in the rated-component account.", "Graph traversal and ranking are separate costs; a top-k heap does not remove traversal cost."],
    contract: "conditional", assumptions: "Undirected similarity graph, unique movie IDs; return at most k component movies excluding the query, rating descending, title ascending, then ID ascending.",
    approach: "Traverse the queried component once with a visited set. Sort its other movies by the declared rating/tie order and take k; use a bounded heap to reduce ranking cost if desired.",
    correctness: "Traversal finds all and only transitively similar movies. Excluding the query and sorting those candidates gives exactly the requested best-ranked prefix.",
    complexity: "O(V+E + C log C) time, O(V+C) extra space for component size C. A heap changes ranking to O(C log k), not total work to O(log k).",
    edgeCases: "Cycles, disconnected high-rated movies, query movie rated highest, tied titles and k=0.",
    code: cpp(`
struct Movie{string title;long long rating;};
vector<int> relatedMovies(const vector<vector<int>>& g,const vector<Movie>& movies,int source,int k){
    if(k<0||g.size()!=movies.size())throw invalid_argument("movies/k");
    vector<bool> seen(g.size());vector<int>stack{source},candidates;seen[source]=true;
    while(!stack.empty()){int u=stack.back();stack.pop_back();if(u!=source)candidates.push_back(u);
        for(int v:g[u])if(!seen[v]){seen[v]=true;stack.push_back(v);}}
    sort(candidates.begin(),candidates.end(),[&](int x,int y){
        if(movies[x].rating!=movies[y].rating)return movies[x].rating>movies[y].rating;
        if(movies[x].title!=movies[y].title)return movies[x].title<movies[y].title;return x<y;});
    if(k<(int)candidates.size())candidates.resize(k);return candidates;
}`)
  },
  "google-missing-rook": {
    hints: ["A strip containing t rows has t rooks unless it contains the one empty row.", "Find the missing row and missing column separately by binary search."],
    contract: "conditional", assumptions: "n >= 1, n-1 rooks in distinct rows/columns. count(r1,c1,r2,c2) returns exact counts over inclusive zero-based rectangles. Return the empty row and column, not an existing rook.",
    approach: "Binary-search row prefixes over the current row interval using all columns. A strip with count less than its height contains the empty row. Repeat with columns using all rows.",
    correctness: "Each row/column has zero or one rook and exactly one is empty. Therefore each queried strip either has its full size or is deficient by one, precisely identifying which half contains the missing index.",
    complexity: "O(log n) API calls per dimension and O(1) space, plus API cost. No hidden board enumeration.",
    edgeCases: "n=1, empty first/last row, and inconsistent API counts produce an error.",
    code: cpp(`
pair<int,int> missingRook(int n,const function<int(int,int,int,int)>& count){
    if(n<1)throw invalid_argument("board");
    auto find=[&](bool rows){int lo=0,hi=n-1;while(lo<hi){int mid=lo+(hi-lo)/2;
        int result=rows?count(lo,0,mid,n-1):count(0,lo,n-1,mid);int size=mid-lo+1;
        if(result!=size&&result!=size-1)throw runtime_error("inconsistent rectangle count");
        if(result<size)hi=mid;else lo=mid+1;}return lo;};
    return {find(true),find(false)};
}`)
  },
  "google-course-order": {
    hints: ["Repeatedly complete a task with no unfinished prerequisites.", "If tasks remain but none is ready, a dependency cycle prevents completion."],
    contract: "conditional", assumptions: "Vertices 0..n-1; edge (u,v) means u must precede v. Return any valid order, nullopt for a cycle. Parallel prerequisite edges are supported consistently.",
    approach: "Kahn's algorithm counts indegrees, queues zero-indegree vertices, and releases their outgoing neighbors. Completion count provides feasibility as well as ordering.",
    correctness: "Only vertices with all prerequisites already completed are emitted, preserving every edge. A nonempty residual graph with no zero-indegree vertex contains a cycle.",
    complexity: "O(V+E) time and space.",
    edgeCases: "No tasks, disconnected components, duplicate edges, self-dependency and a cycle alongside acyclic tasks.",
    code: cpp(`
optional<vector<int>> courseOrder(int n,const vector<pair<int,int>>& prerequisites){
    vector<vector<int>>g(n);vector<int> indegree(n);for(auto[u,v]:prerequisites){g[u].push_back(v);++indegree[v];}
    queue<int>q;for(int i=0;i<n;++i)if(!indegree[i])q.push(i);vector<int>result;
    while(!q.empty()){int u=q.front();q.pop();result.push_back(u);for(int v:g[u])if(--indegree[v]==0)q.push(v);}
    if((int)result.size()!=n)return nullopt;return result;
}`)
  },
  "google-placeholder-expansion": {
    hints: ["A shared dependency in two branches is not a cycle.", "Use an active recursion-path set for cycles and a separate completed-expansion cache."],
    contract: "conditional", assumptions: "Every '%' begins or ends a nonempty key, no escaping syntax. Missing keys, unmatched delimiters and cycles throw. Dictionary is immutable during one expansion; output fits memory.",
    approach: "Parse literal text and %key% tokens. Resolve keys recursively, marking them active only while resolving. Cache completed strings for shared acyclic dependencies.",
    correctness: "An active key encountered again lies on a directed dependency cycle. Completed keys can safely be reused. Replacing every parsed token with its recursively resolved value implements full expansion.",
    complexity: "O(total parsed dictionary/text length + materialized expansion copies), not merely O(number of keys); expanded output may be exponentially larger than input. Space includes cached expansions and recursion.",
    edgeCases: "Repeated shared keys, nested missing keys, direct/indirect cycles and unmatched '%'.",
    code: cpp(`
string expandPlaceholders(const string& text,const unordered_map<string,string>& dictionary){
    unordered_map<string,string> cache;unordered_set<string> active;
    function<string(const string&)>expand,resolve;
    resolve=[&](const string& key)->string{
        if(cache.count(key))return cache.at(key);
        auto it=dictionary.find(key);if(it==dictionary.end())throw invalid_argument("missing key: "+key);
        if(!active.insert(key).second)throw invalid_argument("placeholder cycle");
        string result=expand(it->second);active.erase(key);cache[key]=result;return result;
    };
    expand=[&](const string& s){string result;for(size_t i=0;i<s.size();){
        if(s[i]!='%'){result+=s[i++];continue;}
        size_t end=s.find('%',i+1);if(end==string::npos||end==i+1)throw invalid_argument("malformed placeholder");
        result+=resolve(s.substr(i+1,end-i-1));i=end+1;
    }return result;};
    return expand(text);
}`)
  },
  "google-edge-after-removal": {
    hints: ["One globally maximum edge survives every deletion except its own endpoints.", "Only those at most two exceptional vertices require another scan."],
    contract: "conditional", assumptions: "Weighted edges can be directed or undirected; removing a vertex removes every incident edge. Vertices 0..n-1, signed weights, parallel edges and self-loops allowed. No surviving edge returns nullopt.",
    approach: "Find a maximum edge (a,b). Assign its weight to all other vertices. Scan edges for the best edge not incident to a and likewise b, then store those answers.",
    correctness: "For any other vertex, the maximum edge survives and no surviving edge can exceed the global maximum. For its endpoints, directly scanning all eligible edges gives the exact maximum.",
    complexity: "O(V+E) preprocessing time and O(V) answer space, O(1) per query.",
    edgeCases: "All-negative weights, empty graph, only one edge, tied maxima and self-loop maximum.",
    code: cpp(`
struct WeightedEdge{int u,v;long long weight;};
vector<optional<long long>> maxEdgesAfterRemoval(int n,const vector<WeightedEdge>& edges){
    vector<optional<long long>> result(n);if(edges.empty())return result;
    auto top=*max_element(edges.begin(),edges.end(),[](auto a,auto b){return a.weight<b.weight;});
    for(int v=0;v<n;++v)if(v!=top.u&&v!=top.v)result[v]=top.weight;
    for(int removed:{top.u,top.v})for(auto e:edges)if(e.u!=removed&&e.v!=removed)
        if(!result[removed]||e.weight>*result[removed])result[removed]=e.weight;
    return result;
}`)
  },
  "google-circular-fence": {
    hints: ["First clarify whether equal adjacent posts are forbidden, or only runs of three equal posts.", "A circular rule must also check runs crossing the last-to-first boundary."],
    contract: "clarification-required", assumptions: "The body names LC 276 (no three consecutive equal), while generated text says no equal adjacent posts. These produce different answers. For n<3 also clarify whether a circular run can revisit a post.",
    approach: "For proper no-two coloring, a cycle has (k-1)^n + (-1)^n*(k-1) colorings for n>=3. For no-three, fix the first two colors, track the last two colors/run state while extending, then reject equal triples spanning (n-2,n-1,0) or (n-1,0,1). Symmetry can reduce first-color cases.",
    correctness: "The boundary rejection tests exactly the two triples absent from the linear recurrence. Proper coloring instead constrains every edge; it cannot be substituted for the run-of-three condition.",
    complexity: "A direct fixed-first-two last-two-color DP uses O(n*k^5) time over all fixed starts and O(k^2) state per start; symmetry can reduce this. No implementation is labelled authoritative until the rule is clarified.",
    edgeCases: "For two colors and no-three cyclic runs: n=3,4,5 give 6,6,10. Proper coloring gives 0,2,0. These illustrate the unresolved difference."
  },
  "google-majority-subsets": {
    hints: ["Signed values prevent simple positive-only sum pruning.", "Split the positions in half and combine their subset sums by binary search."],
    contract: "conditional", assumptions: "At most 40 signed integers, subset positions distinguish equal values. Include the empty subset if it satisfies the strict inequality. Return an exact long long count; sums and threshold differences fit long long.",
    approach: "Enumerate sums of each half and sort the second half. For each left sum, count right sums strictly greater than floor(total/2)-left using upper_bound.",
    correctness: "Each index subset decomposes uniquely into its two halves. The threshold inequality is equivalent to subsetSum > total/2, including odd negative totals after flooring correctly.",
    complexity: "O(2^(n/2) * n) time including sorting, O(2^(n/2)) space. Unknown larger source bounds may need another algorithm.",
    edgeCases: "Negative/zero totals, duplicate values, equality to exactly half, empty input and n>40 rejected.",
    code: cpp(`
long long majoritySubsets(const vector<long long>& a){
    if(a.size()>40)throw invalid_argument("baseline limited to 40");
    auto sums=[&](int l,int r){vector<long long>s{0};for(int i=l;i<r;++i){size_t size=s.size();for(size_t j=0;j<size;++j)s.push_back(s[j]+a[i]);}return s;};
    auto left=sums(0,a.size()/2),right=sums(a.size()/2,a.size());sort(right.begin(),right.end());
    long long total=accumulate(a.begin(),a.end(),0LL),half=total/2-(total<0&&total%2!=0),answer=0;
    for(long long x:left)answer+=right.end()-upper_bound(right.begin(),right.end(),half-x);
    return answer;
}`)
  },
  "google-reverse-hashed-list": {
    hints: ["State the hash equation before deriving new hashes; prefix and suffix sums are different.", "Validate the original list fully before mutation, then recompute the new suffix values."],
    contract: "conditional", assumptions: "Practice model is an acyclic singly linked list with additive suffix checksum hash[u]=value[u]+hash[next], null checksum zero. Values/sums fit long long. This is not cryptographic integrity; the other account's opaque supplied hash requires its own function.",
    approach: "Collect nodes while rejecting cycles. Walk the vector backwards to verify original suffix checksums before changing pointers. Reverse links, then recompute suffix sums by walking the old-order vector forwards, which is reverse order of the new list.",
    correctness: "Original backward verification checks each checksum against its actual suffix. After reversal, old-order forward accumulation computes each new node's suffix exactly; link reversal preserves every node once.",
    complexity: "O(n) time and O(n) space. An immutable verification pass ensures invalid data is not partially reversed.",
    edgeCases: "Empty list, cycle, corrupt checksum and zero/negative values. Reversed [0,8,6,3,1] has suffix sums [18,18,10,4,1], not source prefix sums.",
    code: cpp(`
struct HashNode{long long value,hash;HashNode* next=nullptr;};
HashNode* reverseHashed(HashNode* head){
    vector<HashNode*>nodes;unordered_set<HashNode*>seen;
    for(auto*u=head;u;u=u->next){if(!seen.insert(u).second)throw invalid_argument("list cycle");nodes.push_back(u);}
    long long sum=0;
    for(auto it=nodes.rbegin();it!=nodes.rend();++it){sum+=(*it)->value;if((*it)->hash!=sum)throw invalid_argument("checksum mismatch");}
    HashNode* previous=nullptr;sum=0;
    for(auto*u:nodes){u->next=previous;previous=u;sum+=u->value;u->hash=sum;}
    return previous;
}`)
  },
  "google-equal-end-sum": {
    hints: ["For right endpoint r, maximize prefixAfter[r] - prefixBefore[l] among equal boundary values.", "The minimal earlier prefix for a value may not be its first occurrence when negatives exist."],
    contract: "conditional", assumptions: "Signed array values, single-element subarrays allowed. Return nullopt for empty input; all sums fit long long.",
    approach: "For each boundary value, store the minimum prefix sum immediately before any occurrence. Include the current prefix in that map, then calculate the best equal-endpoint sum ending here.",
    correctness: "Subtracting the smallest valid preceding prefix maximizes the sum for a fixed right boundary. Scanning all right boundaries covers every valid subarray, including singletons.",
    complexity: "Expected O(n) time and O(distinct values) space.",
    edgeCases: "All negatives, repeated endpoints after a negative valley and [5,-100,5,1,5], whose answer is 11.",
    code: cpp(`
optional<long long> equalEndSum(const vector<long long>& a){
    unordered_map<long long,long long>minimum;long long prefix=0;optional<long long>answer;
    for(long long x:a){auto[it,fresh]=minimum.emplace(x,prefix);if(!fresh)it->second=min(it->second,prefix);
        prefix+=x;long long candidate=prefix-it->second;if(!answer||candidate>*answer)answer=candidate;}
    return answer;
}`)
  },
  "google-stuck-key-words": {
    hints: ["Run-compress the typed text and each dictionary word.", "Run characters must match, and each intended run cannot be longer than the typed run."],
    contract: "conditional", assumptions: "A key may produce one or more copies per intended character. Return unique dictionary candidates in input order; no deletions, substitutions or threshold-three rule.",
    approach: "Compare aligned character runs in the word and typed text; require equal run characters and typed run length >= intended run length, with both strings ending together.",
    correctness: "Each intended character must contribute at least one identical typed character. Thus a run of w intended copies can produce exactly every run length t>=w; independently matching all runs is necessary and sufficient.",
    complexity: "O(typed length + total dictionary lengths + candidates*typed length) as a simple comparison bound; O(candidate count) output space.",
    edgeCases: "Empty text/word, shorter typed runs, wrong run order and adjacent identical intended letters.",
    code: cpp(`
vector<string> stuckWords(const string& typed,const vector<string>& dictionary){
    vector<string>result;unordered_set<string>emitted;
    for(const string& word:dictionary){size_t i=0,j=0;bool ok=true;
        while(i<word.size()&&j<typed.size()){
            if(word[i]!=typed[j]){ok=false;break;}
            size_t p=i,q=j;while(p<word.size()&&word[p]==word[i])++p;while(q<typed.size()&&typed[q]==typed[j])++q;
            if(p-i>q-j){ok=false;break;}i=p;j=q;
        }
        if(ok&&i==word.size()&&j==typed.size()&&emitted.insert(word).second)result.push_back(word);
    }
    return result;
}`)
  },
  "google-masked-clock": {
    hints: ["There are only 1,440 valid minute-resolution times.", "For circular absolute distance, compare direct distance with 1,440 minus that distance."],
    contract: "conditional", assumptions: "Exactly HH:MM, '?' only in four digit positions; reference is an unmasked valid 24-hour time. Minimize circular absolute minute difference; ties earlier time-of-day. No matching valid time returns nullopt.",
    approach: "Enumerate every valid time, format it, test the four mask positions, and minimize (circular distance, minute index).",
    correctness: "Exhaustive enumeration includes every allowed filling but no invalid time. The declared comparison chooses the optimum and deterministic tie.",
    complexity: "O(1440) time, O(1) auxiliary space.",
    edgeCases: "Midnight wrap, invalid hours/minutes, equidistant before/after times, all wildcards and malformed source masks.",
    code: cpp(`
optional<string> nearestMaskedTime(const string& mask,const string& reference){
    auto format=[](int t){string s="00:00";s[0]='0'+t/60/10;s[1]='0'+t/60%10;s[3]='0'+t%60/10;s[4]='0'+t%60%10;return s;};
    auto validShape=[](const string&s,bool wild){if(s.size()!=5||s[2]!=':')return false;for(int i:{0,1,3,4})if(!(s[i]>='0'&&s[i]<='9')&&!(wild&&s[i]=='?'))return false;return true;};
    if(!validShape(mask,true)||!validShape(reference,false))throw invalid_argument("time format");
    int hour=(reference[0]-'0')*10+reference[1]-'0',minute=(reference[3]-'0')*10+reference[4]-'0';
    if(hour>=24||minute>=60)throw invalid_argument("reference time");int target=60*hour+minute;
    pair<int,int>best{INT_MAX,INT_MAX};
    for(int t=0;t<1440;++t){string s=format(t);bool match=true;for(int i:{0,1,3,4})match=match&&(mask[i]=='?'||mask[i]==s[i]);
        if(match){int distance=abs(t-target);best=min(best,make_pair(min(distance,1440-distance),t));}}
    if(best.first==INT_MAX)return nullopt;return format(best.second);
}`)
  },
  "google-arithmetic-sum": {
    hints: ["Track the count and summed sums of valid subarrays ending at the current position.", "Appending x adds x once to each extended subarray; singletons are counted separately."],
    contract: "conditional", assumptions: "Constant difference +1 or -1 across each subarray, not arbitrary switches between them. Singletons count once. Return an exact sum fitting long long.",
    approach: "Maintain ending counts and ending sum totals separately for differences +1 and -1. When a matching step occurs, extend those subarrays and the previous singleton; otherwise reset that state's multi-element count. Add the current singleton once.",
    correctness: "Every multi-element valid subarray ending here uniquely extends either a previous same-difference subarray or the previous singleton. The two difference classes are disjoint for length >= 2, preventing duplicate counting.",
    complexity: "O(n) time and O(1) space.",
    edgeCases: "Direction changes, repeated values (not eligible multi-element runs), negative sums and [7,4,5,6,5] -> 73.",
    code: cpp(`
long long arithmeticSum(const vector<long long>& a){
    array<long long,2>count{},sums{};const int difference[]={1,-1};long long total=0;
    for(size_t i=0;i<a.size();++i){total+=a[i];
        for(int d=0;d<2;++d){
            if(i>0&&a[i]-a[i-1]==difference[d]){sums[d]=sums[d]+a[i-1]+(count[d]+1)*a[i];++count[d];}
            else{count[d]=0;sums[d]=0;}total+=sums[d];
        }}
    return total;
}`)
  },
  "google-arithmetic-zero-one": {
    hints: ["The whole subarray must keep one difference, either zero or one.", "Zero-step and one-step runs share singleton subarrays, so count those only once."],
    contract: "conditional", assumptions: "Each eligible subarray has constant difference 0 or +1; singletons included once. Return an exact sum fitting long long; title's 2024 recruiting cycle is not an actual interview date.",
    approach: "Keep two ending-run states. Extend a state only when the new adjacent difference equals that state's fixed difference, adding the new value once per extension. Add the new singleton outside both states.",
    correctness: "Every eligible subarray of length >=2 has exactly one of the two differences and a unique previous prefix. Their ending sum totals are disjoint; the singleton term fills the remaining case.",
    complexity: "O(n) time and O(1) space.",
    edgeCases: "Constant runs, a 0-to-1 difference change that must reset, negative elements and empty input.",
    code: cpp(`
long long zeroOneArithmeticSum(const vector<long long>& a){
    array<long long,2>count{},sums{};long long total=0;
    for(size_t i=0;i<a.size();++i){total+=a[i];
        for(int d=0;d<2;++d){
            if(i>0&&a[i]-a[i-1]==d){sums[d]+=a[i-1]+(count[d]+1)*a[i];++count[d];}
            else{count[d]=0;sums[d]=0;}total+=sums[d];
        }}
    return total;
}`)
  },
  "google-valid-partition": {
    hints: ["The valid prefix length is determined by the total number of valid items.", "Each invalid item in that prefix must be exchanged with a valid item outside it."],
    contract: "conditional", assumptions: "Validity API is deterministic during the call, swapping any two positions costs one operation, unstable order allowed. Minimize swaps, not bytes moved by different-sized strings; count API cost separately.",
    approach: "Evaluate validity once per item, count valid items V, then pair invalid positions in [0,V) with valid positions in [V,n). Swap each pair and return the number of swaps.",
    correctness: "Each invalid item in the final valid prefix must move, and one swap can fix at most one such invalid-prefix position. Each paired swap fixes one, meeting that lower bound.",
    complexity: "O(n + n*API cost) time and O(n) cached validity bits, O(1) additional scan state. O(1)-space alternatives re-evaluate the API.",
    edgeCases: "All valid/invalid, already partitioned, empty strings and expensive validity calls.",
    code: cpp(`
int partitionValid(vector<string>& values,const function<bool(const string&)>& valid){
    vector<bool>good;int prefix=0;for(const auto&s:values){bool result=valid(s);good.push_back(result);prefix+=result;}
    int right=prefix,swaps=0;
    for(int left=0;left<prefix;++left)if(!good[left]){
        while(right<(int)values.size()&&!good[right])++right;
        swap(values[left],values[right]);good[left]=true;good[right]=false;++right;++swaps;
    }
    return swaps;
}`)
  },
  "google-gap-connectivity": {
    hints: ["An adjacent gap greater than diff separates all earlier values from all later values.", "If adjacent gaps are small enough, their edges give a connecting chain."],
    contract: "conditional", assumptions: "Sorted nondecreasing signed values, diff >=0; indices are original sorted-array positions. Return component IDs to answer equality queries. Differences fit long long.",
    approach: "Scan adjacent values and start a new component whenever the gap exceeds diff. For an unsorted extension, sort (value,index) pairs and map component IDs back.",
    correctness: "A large adjacent gap prevents every edge crossing that cut, since every cross-cut difference is at least the gap. Otherwise consecutive edges connect the entire run.",
    complexity: "O(n) preprocessing time/space and O(1) per query; unsorted preprocessing adds O(n log n).",
    edgeCases: "Duplicate values, diff=0, negative values and singleton components.",
    code: cpp(`
vector<int> gapComponents(const vector<long long>& a,long long diff){
    if(diff<0||!is_sorted(a.begin(),a.end()))throw invalid_argument("sorted array and nonnegative diff required");
    vector<int>component(a.size());for(size_t i=1;i<a.size();++i)component[i]=component[i-1]+(a[i]-a[i-1]>diff);
    return component;
}`)
  },
  "google-csv-parser": {
    hints: ["A comma or newline inside a quoted field is data, not a delimiter.", "Track unquoted, quoted and just-closed-quote states explicitly."],
    contract: "conditional", assumptions: "RFC-style subset: comma delimiter, double-quote quoting, doubled quotes escape quotes, CRLF or LF record endings, embedded newlines in quotes preserved. No whitespace allowed after a closing quote; malformed input throws. Empty input has no records.",
    approach: "Scan a state machine. Only unquoted delimiters end fields/records; a quote may open only at field start; after a closing quote permit an escaped quote or delimiter/end. Preserve trailing empty fields without inventing a record after a final newline.",
    correctness: "The parser interprets each character according to exactly one declared grammar state. Field/record boundaries occur only outside quotes, and every escaped quote contributes one literal quote.",
    complexity: "O(input length) time and O(output length) space.",
    edgeCases: "Empty quoted fields, trailing comma, quoted commas/newlines, doubled quotes, unmatched quote and malformed post-quote text. Other dialects require explicit changes.",
    code: cpp(`
vector<vector<string>> parseCsv(const string& input){
    vector<vector<string>> records;vector<string>row;string field;
    enum State{Plain,Quoted,Closed};State state=Plain;bool pending=false;
    auto endField=[&](){row.push_back(field);field.clear();state=Plain;};
    for(size_t i=0;i<input.size();++i){char c=input[i];pending=true;
        if(state==Quoted){if(c=='"')state=Closed;else field+=c;continue;}
        if(state==Closed&&c=='"'){field+='"';state=Quoted;continue;}
        if(c==','){endField();continue;}
        if(c=='\\n'||c=='\\r'){
            if(c=='\\r'){if(i+1>=input.size()||input[i+1]!='\\n')throw invalid_argument("bare CR");++i;}
            endField();records.push_back(row);row.clear();pending=false;continue;
        }
        if(state==Closed)throw invalid_argument("text after quote");
        if(c=='"'){if(!field.empty())throw invalid_argument("quote inside unquoted field");state=Quoted;}
        else field+=c;
    }
    if(state==Quoted)throw invalid_argument("unclosed quote");
    if(pending){endField();records.push_back(row);}return records;
}`)
  },
  "google-planet-pairs": {
    hints: ["Count component sizes after processing all friendships.", "Pairs from different components can be counted without enumerating all pairs."],
    contract: "conditional", assumptions: "n aliens numbered 0..n-1; connected friendship components are defined to be inferred planets. This model does not infer true planets from absence of friendships. Count unordered distinct-alien pairs.",
    approach: "Union all friendships, then scan component sizes. Each new component contributes size * previously seen population.",
    correctness: "Every pair in different components is counted when the later component is scanned, exactly once. Pairs inside one component contribute nothing.",
    complexity: "O((n+m) alpha(n)) time and O(n) space.",
    edgeCases: "No friendships, all connected, repeated friendships and n=0.",
    code: cpp(`
long long planetPairs(int n,const vector<pair<int,int>>& friendships){
    vector<int>p(n),size(n,1);iota(p.begin(),p.end(),0);
    function<int(int)>root=[&](int x){return p[x]==x?x:p[x]=root(p[x]);};
    for(auto[u,v]:friendships){u=root(u);v=root(v);if(u==v)continue;if(size[u]<size[v])swap(u,v);p[v]=u;size[u]+=size[v];}
    long long seen=0,answer=0;for(int i=0;i<n;++i)if(root(i)==i){answer+=seen*size[i];seen+=size[i];}return answer;
}`)
  },
  "google-parent-array": {
    hints: ["There must be exactly one root and every other parent must be a valid different node.", "Reachability from that root detects disconnected cycles."],
    contract: "conditional", assumptions: "parent[i]=-1 denotes the one root. Nonempty array, all other entries in 0..n-1. Return validity; malformed data is an expected negative result, not an execution error.",
    approach: "Build child lists while checking parent bounds/self-parenting and root count. Traverse children from the root and require all nodes visited.",
    correctness: "Each non-root has exactly one parent. With one root, a complete root traversal supplies a connected acyclic rooted tree. Any disconnected parent cycle remains unvisited.",
    complexity: "O(n) time and space.",
    edgeCases: "Empty input, two roots, no root, disconnected cycle, self-parent and out-of-range parent.",
    code: cpp(`
bool validParentTree(const vector<int>& parent){
    int n=parent.size(),root=-1;if(n==0)return false;vector<vector<int>>children(n);
    for(int i=0;i<n;++i){int p=parent[i];if(p==-1){if(root!=-1)return false;root=i;}
        else{if(p<0||p>=n||p==i)return false;children[p].push_back(i);}}
    if(root==-1)return false;vector<int>stack{root};int count=0;
    while(!stack.empty()){int u=stack.back();stack.pop_back();++count;for(int v:children[u])stack.push_back(v);}
    return count==n;
}`)
  },
  "google-free-days": {
    hints: ["For the k-free follow-up, count busy people, not busy interval records.", "Merge each person's intervals before sweeping their endpoint deltas."],
    contract: "conditional", assumptions: "Days 1..D inclusive; declared population P includes people with no intervals, person IDs 0..P-1. Return days with at least k free people, 0<=k<=P. Baseline all-free uses k=P.",
    approach: "Group intervals by person, sort/merge overlapping or adjacent blocked intervals, then add +1 at start and -1 after end. Sweep days while tracking busy people and emit when P-busy >= k.",
    correctness: "Per-person merging makes each person's contribution zero or one each day. Endpoint deltas recover the exact busy population, so subtracting from P yields the free count.",
    complexity: "O(intervals log intervals + D) time and O(intervals + P + output days) space; output of every free day may itself be size D.",
    edgeCases: "Repeated overlapping ranges, inclusive ends, a person with no ranges, D=0 and k=0.",
    code: cpp(`
struct BusyRange{int person,start,end;};
vector<int> freeDays(int D,int P,int k,const vector<BusyRange>& ranges){
    if(D<0||P<0||k<0||k>P)throw invalid_argument("day/population/k");
    vector<vector<pair<int,int>>>byPerson(P);map<int,int>delta;
    for(auto r:ranges){if(r.person<0||r.person>=P||r.start<1||r.end>D||r.start>r.end)throw invalid_argument("blocked interval");byPerson[r.person].push_back({r.start,r.end});}
    for(auto&list:byPerson){sort(list.begin(),list.end());int start=-1,end=-1;
        for(auto[l,r]:list){if(start<0){start=l;end=r;}else if((long long)l<=1LL+end)end=max(end,r);
            else{++delta[start];--delta[end+1];start=l;end=r;}}
        if(start>=0){++delta[start];--delta[end+1];}}
    vector<int>result;int busy=0;auto it=delta.begin();
    for(int day=1;day<=D;++day){if(it!=delta.end()&&it->first==day){busy+=it->second;++it;}if(P-busy>=k)result.push_back(day);}
    return result;
}`)
  },
  "google-parity-ranges": {
    hints: ["A range is invalid exactly when it contains an equal-parity adjacent pair.", "Prefix-count those bad boundaries."],
    contract: "specified", assumptions: "Inclusive zero-based range [l,r]; negative parity normalized. Single-element ranges alternate vacuously; invalid query indices throw.",
    approach: "bad[i] counts equal-parity adjacent pairs with right endpoint <=i. A range is valid iff bad[r]-bad[l]=0.",
    correctness: "Subtracting prefix counts leaves exactly the internal boundaries l+1..r. Zero such boundaries is precisely alternation.",
    complexity: "O(n) preprocessing time/space and O(1) query time.",
    edgeCases: "Negative odd integers, singleton ranges, an equal pair just outside the range and all alternating.",
    code: cpp(`
class ParityRanges{
    vector<int>bad;
public:
    explicit ParityRanges(const vector<int>& a):bad(a.size()){
        auto parity=[](int x){return (x%2+2)%2;};
        for(size_t i=1;i<a.size();++i)bad[i]=bad[i-1]+(parity(a[i])==parity(a[i-1]));
    }
    bool query(int l,int r)const{
        if(l<0||r<l||r>=(int)bad.size())throw out_of_range("range");return bad[r]==bad[l];
    }
};`)
  },
  "google-shortest-distinct": {
    hints: ["A frequency map lets you maintain the distinct count of a sliding window.", "Once the window is valid, shrink it until the next removal would break validity."],
    contract: "conditional", assumptions: "k>=1 and a nonempty subarray required; return -1 when impossible. Values may be negative; sums are irrelevant.",
    approach: "Extend the right endpoint, updating frequencies. While the distinct count is at least k, record the length and remove the left value, deleting zero-frequency entries.",
    correctness: "For each right endpoint, shrinking visits every potentially best valid left boundary until validity fails. Any earlier left boundary gives a longer window, so the minimum over recorded windows is optimal.",
    complexity: "Expected O(n) time and O(distinct window values) space.",
    edgeCases: "k=1, repeated values, k greater than all distinct values and empty array.",
    code: cpp(`
int shortestDistinct(const vector<int>& a,int k){
    if(k<1)throw invalid_argument("positive k");
    unordered_map<int,int>frequency;int left=0,best=INT_MAX;
    for(int right=0;right<(int)a.size();++right){++frequency[a[right]];
        while((int)frequency.size()>=k){best=min(best,right-left+1);if(--frequency[a[left]]==0)frequency.erase(a[left]);++left;}}
    return best==INT_MAX?-1:best;
}`)
  },
  "google-beach-gap": {
    hints: ["Use a window containing at most k occupied separators.", "Count only free seats in a valid window; occupied places are not additional available seats."],
    contract: "conditional", assumptions: "Seat encoding: 1 free, 0 occupied; choose a contiguous span with at most k occupied seats. Maximize free-seat count, not total span or flipping occupants. k>=0.",
    approach: "Expand a window, shrink while occupied count exceeds k, and maximize window length minus occupied count.",
    correctness: "For each right endpoint, the earliest valid left endpoint includes every available free seat any shorter valid window could contain. Its free count is therefore maximal for that endpoint.",
    complexity: "O(n) time and O(1) space.",
    edgeCases: "All occupied gives zero, all free, k=0 and free blocks separated by more than k occupied seats.",
    code: cpp(`
int beachSeats(const vector<int>& seats,int k){
    if(k<0)throw invalid_argument("negative k");int left=0,occupied=0,best=0;
    for(int right=0;right<(int)seats.size();++right){
        if(seats[right]!=0&&seats[right]!=1)throw invalid_argument("seat encoding");
        occupied+=seats[right]==0;
        while(occupied>k)occupied-=seats[left++]==0;
        best=max(best,right-left+1-occupied);
    }return best;
}`)
  },
  "google-ordered-index-pairs": {
    hints: ["Rearrange the equation to a[i]-i = a[j]-j.", "A group of c matching positions contributes c*c ordered pairs, including self-pairs."],
    contract: "specified", assumptions: "Zero-based indices; ordered pairs including i=j. Shifting every index to one-based changes keys uniformly, not group counts. Count fits long long.",
    approach: "Frequency-count value-minus-index keys, then sum squared frequencies. This is not the unordered distinct-index c*(c-1)/2 formula.",
    correctness: "The algebraic equality defines disjoint groups; any ordered pair inside one group satisfies the equation, and no pair across groups does.",
    complexity: "Expected O(n) time and O(n) space.",
    edgeCases: "All keys equal gives n^2, negative values, empty input and [2,4,6,5,9,9,11] -> 13.",
    code: cpp(`
long long orderedPairs(const vector<long long>& a){
    unordered_map<long long,long long>counts;
    for(size_t i=0;i<a.size();++i)++counts[a[i]-(long long)i];
    long long result=0;for(auto[key,c]:counts)result+=c*c;return result;
}`)
  },
  "google-balanced-packets": {
    hints: ["Capacity forces at least ceil(S/C) packets.", "For a fixed packet count m, their largest size is at least ceil(S/m)."],
    contract: "conditional", assumptions: "S>=0 integer freely splittable units, C>0 capacity, no headers/minimum payload/per-item indivisibility. Return (minimum count, minimum possible maximum size); S=0 gives (0,0).",
    approach: "Compute m=ceil(S/C) with quotient/remainder to avoid addition overflow. Distribute S as evenly as possible among m packets, sizes floor(S/m) or ceil(S/m).",
    correctness: "Total capacity gives the count lower bound, attained by m packets. Average payload gives the largest-size lower bound, attained by balanced integer distribution; since m*C>=S, that maximum respects capacity.",
    complexity: "O(1) time and space for the two numbers; actually emitting packets costs O(m).",
    edgeCases: "S=0, exact capacity multiple, S<C and S=12,C=5 -> (3,4).",
    code: cpp(`
pair<long long,long long> packetPlan(long long S,long long C){
    if(S<0||C<=0)throw invalid_argument("size/capacity");if(S==0)return {0,0};
    long long count=S/C+(S%C!=0),largest=S/count+(S%count!=0);return {count,largest};
}`)
  },
  "google-event-timeouts": {
    hints: ["Interleaved starts need state keyed by event identity.", "Strict duration > timeout differs from >= and from timing out still-active events."],
    contract: "conditional", assumptions: "Sorted nonnegative integer timestamps, globally unique event IDs with exactly one start and end; only completed events considered. Timeout >=0, strict duration > timeout. Malformed or uncompleted logs throw.",
    approach: "Store each active ID's start timestamp. On its end, compare elapsed time, append overdue IDs and erase active state. Arbitrary concurrent events cannot generally be processed with O(1) memory unless replay or additional constraints are supplied.",
    correctness: "The stored timestamp is the unique matching start; subtraction gives its exact completed duration. Strict comparison implements the source threshold, not an inferred live timeout policy.",
    complexity: "O(log n) per event with ordered maps/sets as shown; O(active IDs + seen IDs + output) space. A hash implementation gives expected O(n) total time.",
    edgeCases: "Equal-to-timeout duration, duplicate/reused IDs, end before start, nonmonotonic logs and unfinished events.",
    code: cpp(`
struct LogEvent{string id;long long time;bool start;};
vector<string> completedTimeouts(const vector<LogEvent>& logs,long long timeout){
    if(timeout<0)throw invalid_argument("timeout");map<string,long long>active;set<string>seen;
    long long previous=-1;vector<string>result;
    for(const auto&e:logs){if(e.time<0||e.time<previous)throw invalid_argument("timestamp order");previous=e.time;
        if(e.start){if(!seen.insert(e.id).second)throw invalid_argument("duplicate event");active[e.id]=e.time;}
        else{auto it=active.find(e.id);if(it==active.end())throw invalid_argument("unmatched end");
            if(e.time-it->second>timeout)result.push_back(e.id);active.erase(it);}}
    if(!active.empty())throw invalid_argument("unfinished events");return result;
}`)
  },
  "google-delete-directory": {
    hints: ["Deleting a directory before its children violates the supplied API contract.", "A postorder traversal gives the required deletion order."],
    contract: "conditional", assumptions: "Supplied API describes a tree without symbolic links/shared children; isDirectory/listChildren/removeNode callbacks propagate errors. This implementation runs on mock callbacks, never the host filesystem.",
    approach: "Collect nodes in parent-first order while checking repeated identities, then invoke removal in reverse order. A filesystem error may leave already removed descendants; no atomic rollback is claimed.",
    correctness: "Each child is collected after its parent, so reversing that order deletes every descendant before its directory. Every collected identity is removed once.",
    complexity: "O(nodes + total child-list/API costs) time and O(nodes) space.",
    edgeCases: "File root, empty directory, repeated/cyclic child identity, API failures and deep directory chains.",
    code: cpp(`
void deleteDirectory(const string& root,const function<bool(const string&)>& isDirectory,
                     const function<vector<string>(const string&)>& listChildren,
                     const function<void(const string&)>& removeNode){
    vector<string>order{root};unordered_set<string>seen{root};
    for(size_t i=0;i<order.size();++i)if(isDirectory(order[i])){
        auto children=listChildren(order[i]);
        for(const auto&child:children){if(!seen.insert(child).second)throw invalid_argument("not a directory tree");order.push_back(child);}}
    for(auto it=order.rbegin();it!=order.rend();++it)removeNode(*it);
}`)
  },
  "google-graph-codec": {
    hints: ["Repeated visits to a shared node must refer to one stable ID.", "Allocate every decoded node before wiring any edge, so cycles also work."],
    contract: "conditional", assumptions: "Serialize nodes reachable from one root, preserving labels, directed adjacency order, duplicate edges and pointer identity. Structured records are the wire model; converting records to bytes needs an explicit format. Null root is an empty record list.",
    approach: "Assign IDs during traversal, emitting each node once with neighbor IDs. Decode in two passes: allocate owned nodes, then connect pointers by IDs after validating references.",
    correctness: "One source pointer maps to one record ID, preserving shared nodes and cycles. One owned decoded node per ID and the exact neighbor-ID list reconstruct an isomorphic rooted graph.",
    complexity: "O(V+E) time and space for reachable graph; label lengths add to serialization cost.",
    edgeCases: "Self-cycle, diamond DAG, duplicate labels, parallel edges and invalid decoded neighbor IDs.",
    code: cpp(`
struct GraphNode{string label;vector<GraphNode*>next;};
struct GraphRecord{string label;vector<int>next;};
vector<GraphRecord> encodeGraph(GraphNode* root){
    if(!root)return {};vector<GraphNode*>order{root};unordered_map<GraphNode*,int>id{{root,0}};vector<GraphRecord>records;
    for(size_t i=0;i<order.size();++i){GraphNode*u=order[i];GraphRecord record{u->label,{}};
        for(GraphNode*v:u->next){if(!v)throw invalid_argument("null graph edge");
            auto[it,fresh]=id.emplace(v,id.size());if(fresh)order.push_back(v);record.next.push_back(it->second);}
        records.push_back(move(record));}return records;
}
struct DecodedGraph{vector<unique_ptr<GraphNode>>nodes;GraphNode* root()const{return nodes.empty()?nullptr:nodes[0].get();}};
DecodedGraph decodeGraph(const vector<GraphRecord>& records){
    DecodedGraph graph;for(const auto&r:records)graph.nodes.push_back(make_unique<GraphNode>(GraphNode{r.label,{}}));
    for(size_t i=0;i<records.size();++i)for(int id:records[i].next){
        if(id<0||id>=(int)records.size())throw invalid_argument("graph reference");graph.nodes[i]->next.push_back(graph.nodes[id].get());}
    return graph;
}`)
  },
  "google-filesystem-size": {
    hints: ["A directory's size is the sum of its children; a file's size is given.", "Caching is safe only while the dictionary remains unchanged, and cycles are not zero-size defaults."],
    contract: "conditional", assumptions: "Immutable dictionary forest, file entries have nonnegative size and no children; directory entries have child keys. No shared child or repeated child is allowed. Missing nodes, cycles and sum overflow throw.",
    approach: "Validate dictionary references and ownership, then memoize DFS size computations with an active-path set for cycles. Copying the dictionary into the class prevents stale caches from external mutation.",
    correctness: "Postorder sums exactly the disjoint file descendants of each directory. An immutable tree forest means a completed node's size never changes, so cached answers remain valid.",
    complexity: "O(nodes+edges) constructor validation; first queries collectively O(nodes+edges), later cached queries expected O(1), space O(nodes+edges). Recursion uses O(height).",
    edgeCases: "Empty directory, zero-size file, missing child, cycle, shared child and overflow. Dynamic updates need ancestor invalidation, not this static cache.",
    code: cpp(`
struct FileEntry{optional<long long>size;vector<string>children;};
class SizeDictionary{
    unordered_map<string,FileEntry>entries;unordered_map<string,long long>cache;unordered_set<string>active;
public:
    explicit SizeDictionary(unordered_map<string,FileEntry> input):entries(move(input)){
        unordered_map<string,int>parents;
        for(const auto&[key,e]:entries){if(e.size&&(*e.size<0||!e.children.empty()))throw invalid_argument("file entry");
            for(const string& child:e.children){if(!entries.count(child))throw invalid_argument("missing child");if(++parents[child]>1)throw invalid_argument("shared child");}}
    }
    long long getSize(const string& key){
        if(cache.count(key))return cache.at(key);
        auto it=entries.find(key);if(it==entries.end())throw out_of_range("missing node");
        if(!active.insert(key).second)throw invalid_argument("directory cycle");
        long long size=it->second.size.value_or(0);
        try{if(!it->second.size)for(const auto&child:it->second.children){
            long long next=getSize(child);if(size>LLONG_MAX-next)throw overflow_error("size");size+=next;}}
        catch(...){active.erase(key);throw;}
        active.erase(key);cache[key]=size;return size;
    }
};`)
  },
  "google-adjacent-duplicates": {
    hints: ["Only the last surviving character can pair with the next character.", "A stack naturally exposes new adjacencies after removing a pair."],
    contract: "specified", assumptions: "Canonical pair-removal variant: remove adjacent equal pairs repeatedly, not all runs of length k. Return the reduced string.",
    approach: "Use the output string as a stack: pop when its last character matches the incoming character, otherwise push.",
    correctness: "The maintained prefix is fully reduced. Appending a character can create only a pair at the end; removing that pair restores a reduced prefix. This yields the unique reduced result by induction.",
    complexity: "O(n) time and O(n) space.",
    edgeCases: "Empty string, odd/even repeated runs and a removal exposing another pair.",
    code: cpp(`
string removeAdjacentPairs(const string& s){string result;
    for(char c:s){if(!result.empty()&&result.back()==c)result.pop_back();else result+=c;}return result;
}`)
  },
  "google-envelopes": {
    hints: ["After sorting widths, solve a height LIS.", "Equal widths must not extend the LIS; sort their heights in descending order."],
    contract: "specified", assumptions: "Positive width/height envelopes, no rotations. Both dimensions strictly increase; count the maximum chain length.",
    approach: "Sort width ascending and height descending for ties. Maintain minimal LIS tails of heights with lower_bound, enforcing strict height growth.",
    correctness: "Descending tied heights prevent choosing two equal-width envelopes in an increasing height subsequence. Conversely every strictly nesting chain appears as an increasing-height subsequence after sorting.",
    complexity: "O(n log n) time and O(n) auxiliary space.",
    edgeCases: "Equal widths/heights, duplicate envelopes, empty input and decreasing heights.",
    code: cpp(`
int envelopeChain(vector<pair<int,int>> envelopes){
    for(auto[w,h]:envelopes)if(w<=0||h<=0)throw invalid_argument("envelope size");
    sort(envelopes.begin(),envelopes.end(),[](auto a,auto b){return a.first!=b.first?a.first<b.first:a.second>b.second;});
    vector<int>tails;for(auto[w,h]:envelopes){auto it=lower_bound(tails.begin(),tails.end(),h);if(it==tails.end())tails.push_back(h);else *it=h;}return tails.size();
}`)
  },
  "google-cheapest-order": {
    hints: ["Arbitrary deletion needs a stable order ID, not just a price.", "An ordered set keeps the cheapest live record at its beginning without lazy stale-entry cleanup."],
    contract: "conditional", assumptions: "Unique integer IDs, nonnegative integer price/time; minimum by (price,timestamp,ID). Duplicate insert and removing an absent ID throw; empty minimum returns nullopt.",
    approach: "Keep an ordered set of price/time/ID tuples plus an ID-to-tuple map. Insert/remove update both; minimum returns the set's first record.",
    correctness: "Both structures represent exactly the live orders. Tuple ordering encodes all declared ties, so the first set element is the required minimum.",
    complexity: "O(log n) insert/remove, O(1) minimum lookup after access to begin(), O(n) space.",
    edgeCases: "Equal prices/timestamps, removing the current minimum, empty market and identity collisions.",
    code: cpp(`
class OrderBook{
    set<tuple<long long,long long,int>>orders;unordered_map<int,pair<long long,long long>>byId;
public:
    void add(int id,long long price,long long timestamp){
        if(price<0||timestamp<0||byId.count(id))throw invalid_argument("order");
        orders.insert({price,timestamp,id});byId[id]={price,timestamp};
    }
    void remove(int id){auto it=byId.find(id);if(it==byId.end())throw out_of_range("missing order");
        orders.erase({it->second.first,it->second.second,id});byId.erase(it);}
    optional<int> cheapest()const{if(orders.empty())return nullopt;return get<2>(*orders.begin());}
};`)
  },
  "google-wildcard-words": {
    hints: ["A dot branches over existing trie children at exactly one depth.", "The result is all matching words, so account for traversal and output cost."],
    contract: "conditional", assumptions: "Lowercase words of length 1..25, insertion deduplicates. Patterns contain lowercase letters and '.', length 1..25; dot matches exactly one character. Return lexicographically sorted words. Star wildcard is not this baseline.",
    approach: "Insert into a trie. For a literal, follow its child; for dot, visit all children. At pattern end emit only terminal nodes. Child-index order yields lexicographic output.",
    correctness: "Each recursive step matches exactly one pattern position to one word character. A terminal reached at the exact pattern length is therefore a match; branching enumerates every allowed dot character once.",
    complexity: "Insert O(word length). Search O(visited trie edges + output characters), potentially the whole relevant trie for many dots; O(total stored characters) space.",
    edgeCases: "A word is a prefix but too short, duplicate insertions, all dots and no matches. '*' needs zero/more-character state handling and duplicate-output control.",
    code: cpp(`
class WordTrie{
    struct Node{array<int,26>child;bool end=false;Node(){child.fill(-1);}};
    vector<Node>nodes{Node{}};
public:
    void insert(const string& word){
        if(word.empty()||word.size()>25)throw invalid_argument("word length");
        for(char c:word)if(c<'a'||c>'z')throw invalid_argument("word alphabet");
        int u=0;for(char c:word){int index=c-'a';if(nodes[u].child[index]<0){int v=nodes.size();nodes[u].child[index]=v;nodes.emplace_back();}u=nodes[u].child[index];}nodes[u].end=true;
    }
    vector<string> search(const string& pattern)const{
        if(pattern.empty()||pattern.size()>25)throw invalid_argument("pattern length");
        for(char c:pattern)if(c!='.'&&(c<'a'||c>'z'))throw invalid_argument("pattern");
        vector<string>result;string word;
        function<void(int,size_t)>visit=[&](int u,size_t i){
            if(i==pattern.size()){if(nodes[u].end)result.push_back(word);return;}
            for(int c=0;c<26;++c)if(nodes[u].child[c]>=0&&(pattern[i]=='.'||pattern[i]=='a'+c)){
                word+=char('a'+c);visit(nodes[u].child[c],i+1);word.pop_back();}};
        visit(0,0);return result;
    }
};`)
  },
  "google-weighted-ratios": {
    hints: ["Store each node's value divided by its parent's value.", "Path compression must multiply ratios along the compressed path."],
    contract: "conditional", assumptions: "Known vertices 0..n-1, finite strictly positive ratios, append-only relations. Disconnected queries return nullopt. Contradictory cycle relations throw with relative tolerance 1e-9; deletion requires another data structure.",
    approach: "Weighted DSU maintains ratio[x]=value[x]/value[parent[x]]. Find compresses paths while multiplying ratios. To attach root(u) under root(v) for value[u]/value[v]=w, set root ratio to w*ratio[v]/ratio[u]; reverse attachment uses its reciprocal.",
    correctness: "The attachment equation preserves the supplied ratio and all existing within-component ratios. After find, each node's ratio to the common root makes query(u,v)=ratio[u]/ratio[v].",
    complexity: "Amortized O(alpha(n)) operations with union-by-size/path compression, O(n) space; floating precision depends on ratio-chain magnitude.",
    edgeCases: "Self-query, redundant consistent edge, contradictory cycle, unknown/disconnected nodes and overflow/underflow. No cryptographic or exact-rational claim.",
    code: cpp(`
class RatioDSU{
    vector<int>parent,size;vector<long double>ratio;
    static long double checked(long double x){if(!isfinite(x)||x<=0)throw overflow_error("ratio outside numeric range");return x;}
    int root(int x){if(parent[x]==x)return x;int p=parent[x],r=root(p);ratio[x]=checked(ratio[x]*ratio[p]);return parent[x]=r;}
    void index(int x)const{if(x<0||x>=(int)parent.size())throw out_of_range("vertex");}
public:
    explicit RatioDSU(int n):parent(n),size(n,1),ratio(n,1){iota(parent.begin(),parent.end(),0);}
    void relate(int u,int v,long double weight){
        index(u);index(v);if(!isfinite(weight)||weight<=0)throw invalid_argument("positive finite ratio");
        int a=root(u),b=root(v);
        if(a==b){long double actual=checked(ratio[u]/ratio[v]);if(fabsl(actual-weight)>1e-9L*max(actual,weight))throw invalid_argument("contradictory ratio");return;}
        long double factor=checked(weight*ratio[v]/ratio[u]);
        if(size[a]<size[b]){parent[a]=b;ratio[a]=factor;size[b]+=size[a];}
        else{long double inverse=checked(1/factor);parent[b]=a;ratio[b]=inverse;size[a]+=size[b];}
    }
    optional<long double> query(int u,int v){index(u);index(v);if(root(u)!=root(v))return nullopt;return checked(ratio[u]/ratio[v]);}
};`)
  }
};
