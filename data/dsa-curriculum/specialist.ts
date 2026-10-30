import type { AuthoredAlgorithm } from "./lesson";

export const specialistAlgorithms: AuthoredAlgorithm[] = [
  {
    id: "topic-specialist-suffix-array", moduleId: "mod-dsa-specialist", title: "Optional: Suffix Arrays and Kasai LCP", optional: true,
    intuition: "Sort all suffix starts without copying suffix strings. Adjacent suffix common prefixes then summarize repeated substrings.",
    contract: "Build a suffix array over an arbitrary byte string. Kasai returns lcp[i]=common-prefix length of suffixes sa[i] and sa[i+1], for i in [0,n-1). Empty string gives empty arrays. All lengths fit int.",
    prerequisites: "Lexicographic sorting, string matching, rank compression and static RMQ.",
    cues: "Static repeated-substring analysis, suffix order queries and many longest-common-extension queries. Specialist extension, not a prerequisite for ordinary interviews.",
    invariant: "At doubling length k, rank pairs (rank[i],rank[i+k] or -1) order prefixes of length 2k. Recompress equal pairs until every suffix rank is unique. Kasai scans starts in text order; removing the first character from two matching suffixes leaves at least h-1 common characters, so the carried lower bound decreases at most once per text position.",
    walkthrough: { input: "banana", output: "sa=[5,3,1,0,4,2], lcp=[1,3,0,0,2]", explanation: "Sorted suffixes are a,ana,anana,banana,na,nana. Adjacent ana/anana share3 characters, revealing longest repeated substring ana. Sum of LCP is6, so distinct substrings=6*7/2-6=15." },
    code: `#include <bits/stdc++.h>
using namespace std;
pair<vector<int>,vector<int>> suffixArray(const string&s){
  int n=s.size();if(!n)return {{},{}};vector<int>sa(n),rank(n),next(n);iota(sa.begin(),sa.end(),0);
  for(int i=0;i<n;i++)rank[i]=(unsigned char)s[i];
  for(long long k=1;;k*=2){
    auto key=[&](int i){return make_pair(rank[i],i+k<n?rank[i+k]:-1);};
    sort(sa.begin(),sa.end(),[&](int a,int b){return key(a)<key(b);});
    next[sa[0]]=0;for(int i=1;i<n;i++)next[sa[i]]=next[sa[i-1]]+(key(sa[i-1])!=key(sa[i]));
    rank=next;if(rank[sa.back()]==n-1)break;
  }
  vector<int>lcp(max(0,n-1));int h=0;
  for(int i=0;i<n;i++){int r=rank[i];if(r==n-1){h=0;continue;}int j=sa[r+1];
    while(i+h<n&&j+h<n&&s[i+h]==s[j+h])++h;lcp[r]=h;if(h)--h;}
  return {sa,lcp};
}`,
    time: "Doubling with comparison sort O(n log squared n); Kasai O(n).",
    space: "O(n) arrays, O(log n) sorting stack.",
    boundaries: "The implementation does not add a sentinel suffix, so sa has exactly n entries and lcp n-1. Compare bytes as unsigned for initial ranks. Not an online index; changing text invalidates the array.",
    alternatives: "Counting/radix sorting rank pairs reduces doubling to O(n log n); SA-IS is more advanced. A suffix automaton supports different online operations. KMP is far simpler for one pattern. RMQ over LCP supports arbitrary suffix LCE queries.",
    practice: [
      { variation: "Longest repeated substring", tip: "The maximum adjacent LCP is the answer length; use its corresponding suffix start to recover the string.", snippet: "string longestRepeat(const string&s){\n  auto [sa,lcp]=suffixArray(s);if(lcp.empty())return \"\";\n  int i=max_element(lcp.begin(),lcp.end())-lcp.begin();\n  return s.substr(sa[i],lcp[i]);\n}" },
      { variation: "Count distinct substrings", tip: "Each suffix contributes its length minus the prefix already present in its preceding neighbor.", snippet: "long long distinctSubstrings(const string&s){\n  auto [sa,lcp]=suffixArray(s);long long n=s.size();\n  return n*(n+1)/2-accumulate(lcp.begin(),lcp.end(),0LL);\n}" },
      { variation: "Longest common extension by direct rank interval", tip: "The minimum LCP between two suffix ranks is their common extension. A sparse table accelerates these repeated minima to O(1).", snippet: "int extension(const string&s,int a,int b){\n  if(a==b)return s.size()-a;auto [sa,lcp]=suffixArray(s);vector<int>rank(s.size());\n  for(int i=0;i<(int)sa.size();i++)rank[sa[i]]=i;\n  int l=min(rank[a],rank[b]),r=max(rank[a],rank[b]);\n  return *min_element(lcp.begin()+l,lcp.begin()+r);\n}" }
    ],
    faq: [
      { question: "Why are adjacent suffixes enough for the longest repeat?", answer: "All suffixes sharing a prefix form a contiguous lexicographic interval. Some adjacent pair in that interval shares at least that entire repeated prefix." },
      { question: "Is this doubling implementation O(n log n)?", answer: "No. There are O(log n) rounds and each comparison-sort round costs O(n log n). Radix sorting pairs is required for the lower bound." }
    ],
  },
  {
    id: "topic-specialist-digit-dp", moduleId: "mod-dsa-specialist", title: "Optional: Digit DP with Tight and Started States", optional: true,
    intuition: "Count huge numeric ranges by reusing equivalent digit prefixes instead of enumerating every number.",
    contract: "countNoAdjacent(n) counts integers in [0,n] whose decimal representation has no equal adjacent digits, including zero. n must be in [0,10^18]. Leading padding zeros are not digits of the represented number.",
    prerequisites: "Memoized DP, decimal place values and state sufficiency.",
    cues: "Count bounded integers satisfying a digit-local condition over ranges too large to iterate. Specialist extension.",
    invariant: "State (position,last,tight) captures all future constraints; last=10 means no nonzero digit has started. tight restricts the next digit to the bound's prefix. Before starting, leading zero retains last=10; after starting, any digit equal to last is rejected. Each represented integer has one padded digit path, and the all-padding path counts zero once.",
    walkthrough: { input: "n=20", output: "20", explanation: "Among 0..20 only11 has equal adjacent digits. Padding 01 represents1 and does not create an adjacent zero constraint. Prefix2 is tight so the final digit is limited to0; prefixes0/1 permit their full allowed suffixes." },
    code: `#include <bits/stdc++.h>
using namespace std;
long long countNoAdjacent(long long n){
  if(n<0||n>1000000000000000000LL)throw invalid_argument("bound [0,1e18]");
  string digits=to_string(n);long long memo[20][11][2];memset(memo,-1,sizeof(memo));
  function<long long(int,int,bool)>dfs=[&](int pos,int last,bool tight)->long long{
    if(pos==(int)digits.size())return 1;long long&ans=memo[pos][last][tight];if(ans!=-1)return ans;ans=0;
    int bound=digits[pos]-'0',limit=tight?bound:9;
    for(int d=0;d<=limit;d++){
      if(last!=10&&d==last)continue;int next=(last==10&&d==0)?10:d;
      ans+=dfs(pos+1,next,tight&&d==bound);
    }return ans;
  };return dfs(0,10,true);
}`,
    time: "O(D*11*2*10) for D<=19 decimal digits.",
    space: "O(D*11*2) memo plus O(D) stack.",
    boundaries: "Zero is explicitly included. Distinguish padding zeros from an internal zero after starting. Memo belongs to one fixed bound; do not reuse tight states across bounds. A range [L,R] uses F(R)-F(L-1), with L=0 handled separately.",
    alternatives: "Brute force is useful only as a small-bound oracle. Digit-sum or remainder constraints add dimensions; do not memoize only position if earlier digits change the remaining legality.",
    practice: [
      { variation: "Closed interval count", tip: "Subtract the prefix below L and avoid querying a negative bound when L=0.", snippet: "long long rangeCount(long long l,long long r){\n  if(l<0||l>r)throw invalid_argument(\"range\");\n  return countNoAdjacent(r)-(l?countNoAdjacent(l-1):0);\n}" },
      { variation: "Brute-force oracle", tip: "Use ordinary decimal strings to check the leading-zero semantics on small values.", snippet: "bool valid(long long x){\n  string s=to_string(x);\n  for(size_t i=1;i<s.size();i++)if(s[i]==s[i-1])return false;\n  return true;\n}" },
      { variation: "Count positive values only", tip: "The all-padding path is exactly zero, so subtract one rather than changing the recurrence.", snippet: "long long countPositive(long long n){\n  return countNoAdjacent(n)-1;\n}" }
    ],
    faq: [
      { question: "Why is started encoded by last=10?", answer: "The sentinel is outside decimal digits, so it records that all processed positions are padding. Once any nonzero digit starts the number, last becomes an ordinary digit, including later zeros." },
      { question: "Can two tight prefixes share one memo state?", answer: "For a fixed bound and position there is only one tight prefix. Across different bounds the allowed remaining digits change, so the memo must be rebuilt." }
    ],
  },
  {
    id: "topic-specialist-heavy-light", moduleId: "mod-dsa-specialist", title: "Optional: Heavy-Light Decomposition for Path Sums", optional: true,
    intuition: "Choose the largest child as heavy. A root path can cross only logarithmically many light edges, so a tree path becomes a few contiguous array intervals.",
    contract: "Preprocess a connected simple undirected tree rooted at0 with n>=1, symmetric adjacency and signed node values. setValue replaces a node value; pathSum includes both endpoint nodes. Topology is immutable; sums fit long long.",
    prerequisites: "Tree parent/depth traversal, Fenwick sums, LCA reasoning and subtree sizes.",
    cues: "Many online tree path aggregates with point updates. Specialist extension; binary lifting alone is sufficient for ordinary LCA queries.",
    invariant: "heavy[u] is a child with maximum subtree size. Any light child has at most half its parent's subtree nodes, bounding light transitions by O(log n). Each heavy chain receives contiguous increasing positions. While heads differ, consume the interval from the deeper chain head to its endpoint and jump to that head's parent. Once heads coincide, one final interval covers the remaining path without double-counting.",
    walkthrough: { input: "edges 0-1,0-2,1-3,1-4; values [1,2,3,4,5]; path 3->2", output: "10; after setValue(1,10), 18", explanation: "Choose heavy links0->1->3, with separate chains2 and4. Path3->2 first consumes chain2's value3 and jumps to0. Both endpoints now share the main chain; query0..3 includes1+2+4=7. Replacing node1 adds8 to the path." },
    code: `#include <bits/stdc++.h>
using namespace std;
struct HLD {
  int n;vector<int>parent,depth,size,heavy,head,pos,order;vector<long long>value,bit;
  HLD(const vector<vector<int>>&g,const vector<long long>&a):n(g.size()),parent(n,-1),depth(n),size(n,1),heavy(n,-1),head(n),pos(n),value(a),bit(n+1){
    if(!n||a.size()!=g.size())throw invalid_argument("nonempty tree and values");
    long long edges=0;for(auto&r:g)edges+=r.size();if(edges!=2LL*(n-1))throw invalid_argument("tree edges");
    parent[0]=0;order={0};for(size_t i=0;i<order.size();i++){int u=order[i];for(int v:g[u]){
      if(v<0||v>=n)throw out_of_range("vertex");if(v==parent[u])continue;
      if(parent[v]>=0)throw invalid_argument("cycle");parent[v]=u;depth[v]=depth[u]+1;order.push_back(v);}}
    if((int)order.size()!=n)throw invalid_argument("disconnected");
    for(auto it=order.rbegin();it!=order.rend();it++){int u=*it;if(u){int p=parent[u];size[p]+=size[u];if(heavy[p]<0||size[u]>size[heavy[p]])heavy[p]=u;}}
    int timer=0;for(int u:order)if(u==0||heavy[parent[u]]!=u)for(int v=u;v>=0;v=heavy[v]){head[v]=u;pos[v]=timer++;}
    for(int u=0;u<n;u++)add(pos[u],value[u]);
  }
  void valid(int u)const{if(u<0||u>=n)throw out_of_range("vertex");}
  void add(int i,long long d){for(++i;i<=n;i+=i&-i)bit[i]+=d;}
  long long prefix(int r)const{long long s=0;for(;r;r-=r&-r)s+=bit[r];return s;}
  long long interval(int l,int r)const{return prefix(r)-prefix(l);}
  void setValue(int u,long long x){valid(u);add(pos[u],x-value[u]);value[u]=x;}
  long long pathSum(int u,int v)const{
    valid(u);valid(v);long long ans=0;
    while(head[u]!=head[v]){if(depth[head[u]]<depth[head[v]])swap(u,v);ans+=interval(pos[head[u]],pos[u]+1);u=parent[head[u]];}
    if(depth[u]>depth[v])swap(u,v);return ans+interval(pos[u],pos[v]+1);
  }
};`,
    time: "O(n log n) build with Fenwick insertion; point assignment O(log n); path sum O(log squared n).",
    space: "O(n) metadata and Fenwick storage; iterative preprocessing avoids recursion.",
    boundaries: "This stores node weights. For edge weights, store each edge at its deeper endpoint and exclude the LCA slot in the last interval. Sum is commutative; ordered path strings/matrices require directional aggregates. No link/cut topology changes.",
    alternatives: "Binary lifting with aggregates works for static weights; Euler-tour Fenwick is simpler for subtree-only queries. Link-cut trees support dynamic topology with substantially more complexity.",
    practice: [
      { variation: "Root-path sum", tip: "Reuse the path API with root0; updates still affect all subsequent queries correctly.", snippet: "long long rootSum(const HLD&t,int u){\n  return t.pathSum(0,u);\n}" },
      { variation: "Single vertex query", tip: "A path from a vertex to itself includes it once; this checks endpoint conventions.", snippet: "HLD t({{1},{0}}, {4,7});\nassert(t.pathSum(1,1)==7);\nt.setValue(1,-2);\nassert(t.pathSum(1,1)==-2);" },
      { variation: "Tree path averages", tip: "Combine path sum with the number of nodes from a separate distance/LCA computation. The denominator is edge distance plus one.", snippet: "long double pathAverage(const HLD&t,int u,int v,int edgeDistance){\n  if(edgeDistance<0)throw invalid_argument(\"distance\");\n  return (long double)t.pathSum(u,v)/(edgeDistance+1);\n}" }
    ],
    faq: [
      { question: "Why only logarithmically many chains per path?", answer: "Every jump crosses a light edge. Moving downward across a light edge at least halves the subtree size, so there can be at most log2(n) such steps from root to any vertex." },
      { question: "Can this exact layout answer subtree sums by one interval?", answer: "Not necessarily. This implementation guarantees contiguous chains but does not DFS-order all subtrees contiguously. Use a heavy-first DFS layout or a separate Euler index for subtree queries." }
    ],
  },
  {
    id: "topic-specialist-max-flow", moduleId: "mod-dsa-specialist", title: "Optional: Dinic Maximum Flow and Residual Cuts", optional: true,
    intuition: "A residual edge records both unused capacity and the ability to undo earlier flow. Level graphs organize augmentations into blocking-flow phases.",
    contract: "Directed network with n>=2, valid distinct source/sink, nonnegative long long capacities and total source capacity fitting long long. addEdge accepts parallel edges and self-loops. maxFlow consumes residual capacity and returns additional flow on that call; build a fresh instance to recompute from zero.",
    prerequisites: "BFS/DFS, residual reverse edges, conservation and augmenting paths.",
    cues: "Capacity-constrained routing, bipartite matching reductions and min-cut partitions. Specialist extension.",
    invariant: "Each forward/reverse residual pair preserves its total capacity. An augmentation subtracts f on the forward edge and adds f on its reverse, conserving every internal vertex's flow. BFS levels permit only edges advancing one layer; DFS current-edge cursors avoid rescanning dead edges within a phase. When sink is unreachable, residual-reachable vertices form a cut with capacity equal to the flow, proving optimality.",
    walkthrough: { input: "s0->1:3,0->2:2,1->2:1,1->t3:2,2->3:3", output: "maximum flow 5", explanation: "First level graph sends2 along0-1-3 and2 along0-2-3. Next BFS exposes0-1-2-3 and sends1. All5 units leaving source are used, so its outgoing cut gives an upper bound of5 matching the achieved flow." },
    code: `#include <bits/stdc++.h>
using namespace std;
struct Dinic {
  struct Edge{int to,rev;long long cap;};
  int n;vector<vector<Edge>>g;vector<int>level,it;
  explicit Dinic(int size):n(size),g(size),level(size),it(size){if(size<2)throw invalid_argument("n>=2");}
  void valid(int v)const{if(v<0||v>=n)throw out_of_range("vertex");}
  void addEdge(int u,int v,long long c){
    valid(u);valid(v);if(c<0)throw invalid_argument("capacity");
    int a=g[u].size(),b=g[v].size();g[u].push_back({v,b+(u==v),c});g[v].push_back({u,a,0});
  }
  bool bfs(int s,int t){
    fill(level.begin(),level.end(),-1);queue<int>q;q.push(s);level[s]=0;
    while(!q.empty()){int u=q.front();q.pop();for(auto&e:g[u])if(e.cap>0&&level[e.to]<0){level[e.to]=level[u]+1;q.push(e.to);}}
    return level[t]>=0;
  }
  long long dfs(int u,int t,long long pushed){
    if(u==t)return pushed;
    for(int&i=it[u];i<(int)g[u].size();i++){Edge&e=g[u][i];if(e.cap<=0||level[e.to]!=level[u]+1)continue;
      long long f=dfs(e.to,t,min(pushed,e.cap));if(f){e.cap-=f;g[e.to][e.rev].cap+=f;return f;}}
    return 0;
  }
  long long maxFlow(int s,int t){
    valid(s);valid(t);if(s==t)throw invalid_argument("distinct terminals");long long flow=0;
    while(bfs(s,t)){fill(it.begin(),it.end(),0);while(long long f=dfs(s,t,LLONG_MAX))flow+=f;}
    return flow;
  }
  vector<bool> sourceSide(int s)const{
    valid(s);vector<bool>seen(n);queue<int>q;q.push(s);seen[s]=true;
    while(!q.empty()){int u=q.front();q.pop();for(auto&e:g[u])if(e.cap>0&&!seen[e.to]){seen[e.to]=true;q.push(e.to);}}
    return seen;
  }
};`,
    time: "General Dinic O(V squared*E); tighter bounds exist for special unit networks but are not claimed here.",
    space: "O(V+E), including reverse residual edges and O(V) DFS stack.",
    boundaries: "Reverse edges are mandatory even when the original graph had no reverse arc. Self-loop reverse indices need the same-vector offset. Source=sink is rejected to avoid infinite augmentation. Deep level graphs may exceed recursive stack limits.",
    alternatives: "Edmonds-Karp is simpler at O(V*E squared). Hopcroft-Karp is specialized for bipartite matching. Min-cost flow adds costs and is not implemented by a capacity-only routine.",
    practice: [
      { variation: "Extract a minimum cut", tip: "After maxFlow, residual-reachable vertices define the source side. Sum original capacities crossing to its complement, never residual reverse capacities.", snippet: "long long cutCapacity(const vector<tuple<int,int,long long>>&edges,const vector<bool>&side){\n  long long cut=0;\n  for(auto [u,v,c]:edges)if(side[u]&&!side[v])cut+=c;\n  return cut;\n}" },
      { variation: "Bipartite matching reduction", tip: "Use unit source-left and right-sink edges, plus unit allowed left-right links. Integral capacities yield an integral matching.", snippet: "long long matching(int L,int R,const vector<pair<int,int>>&allowed){\n  int s=L+R,t=s+1;Dinic d(t+1);\n  for(int u=0;u<L;u++)d.addEdge(s,u,1);\n  for(int v=0;v<R;v++)d.addEdge(L+v,t,1);\n  for(auto [u,v]:allowed)d.addEdge(u,L+v,1);\n  return d.maxFlow(s,t);\n}" },
      { variation: "Vertex capacities", tip: "Split each vertex into in/out nodes joined by its capacity. Redirect original edges from u-out to v-in.", snippet: "void vertexCapacity(Dinic&d,int v,long long cap){d.addEdge(2*v,2*v+1,cap);}\nvoid splitEdge(Dinic&d,int u,int v,long long cap){\n  d.addEdge(2*u+1,2*v,cap);\n}" }
    ],
    faq: [
      { question: "Why can flow need to be undone?", answer: "An early path may consume an edge needed by a better combination of later paths. Reverse residual capacity lets a later augmentation reroute that previous choice while preserving total flow." },
      { question: "Why does an unreachable sink prove optimality?", answer: "No positive residual edge crosses from the reachable source side to the unreachable sink side. The original cut is saturated, and its capacity equals the feasible flow." }
    ],
  },
  {
    id: "topic-specialist-number-theory", moduleId: "mod-dsa-specialist", title: "Optional: Extended GCD, Coprime CRT and Euler Totient", optional: true,
    intuition: "Bézout coefficients make modular division constructive. Coprime congruences combine through one modular correction, while totient counts invertible residues by removing prime factors.",
    contract: "Bounded extension: inputs/moduli <=10^9, nonnegative extended-GCD arguments (not both zero), positive moduli, and pairwise-coprime two-modulus CRT only. inverse returns nullopt when modulus<=1 or no inverse; crt returns normalized residue and product modulus, or throws for noncoprime moduli. phi requires 1<=n<=10^9. No primality testing, factorization of arbitrary 64-bit numbers or noncoprime CRT is promised.",
    prerequisites: "GCD, modular arithmetic, prime factorization and overflow bounds.",
    cues: "Modular inverses for composite moduli, combining periodic schedules, or counting residues coprime to a bounded n. Specialist extension.",
    invariant: "Extended Euclid returns x,y with a*x+b*y=gcd(a,b); unwinding a=q*b+r transforms coefficients without changing that identity. For coprime m,n, x=a+m*k with k=(b-a)*inverse(m mod n) mod n satisfies both residues. Totient multiplies n by (1-1/p) for each distinct prime divisor using inclusion-exclusion.",
    walkthrough: { input: "inverse3 mod10; x=2 mod3 and x=3 mod5; phi(12)", output: "7; x=8 mod15; 4", explanation: "3*7-10*2=1 establishes inverse7. k=(3-2)*inverse3 mod5=2, so x=2+3*2=8. Totient starts12, removes multiples of2 ->6, then multiples of3 among the remaining ->4: residues1,5,7,11." },
    code: `#include <bits/stdc++.h>
using namespace std;
tuple<long long,long long,long long> egcd(long long a,long long b){
  if(a<0||b<0||a>1000000000LL||b>1000000000LL||(!a&&!b))throw invalid_argument("bounded nonnegative gcd");
  if(!b)return {a,1,0};auto [g,x,y]=egcd(b,a%b);return {g,y,x-(a/b)*y};
}
optional<long long> inverse(long long a,long long mod){
  if(mod<=1)return nullopt;if(mod>1000000000LL)throw invalid_argument("modulus <=1e9");
  a=(a%mod+mod)%mod;auto [g,x,y]=egcd(a,mod);if(g!=1)return nullopt;return (x%mod+mod)%mod;
}
pair<long long,long long> crt(long long a,long long m,long long b,long long n){
  if(m<1||n<1||m>1000000000LL||n>1000000000LL)throw invalid_argument("bounded positive moduli");
  a=(a%m+m)%m;b=(b%n+n)%n;if(n==1)return {a,m};
  auto inv=inverse(m,n);if(!inv)throw invalid_argument("coprime moduli required");
  long long delta=(b-a)%n;if(delta<0)delta+=n;
  long long k=delta*(*inv)%n;return {a+m*k,m*n};
}
long long phi(long long n){
  if(n<1||n>1000000000LL)throw invalid_argument("phi bound");long long result=n;
  for(long long p=2;p<=n/p;p++)if(n%p==0){while(n%p==0)n/=p;result-=result/p;}
  if(n>1)result-=result/n;return result;
}`,
    time: "Extended GCD/inverse/CRT O(log M); trial-division totient O(sqrt n).",
    space: "O(log M) Euclid recursion; totient O(1).",
    boundaries: "Fermat's exponent p-2 requires prime modulus, while extended GCD supports any coprime modulus. Noncoprime CRT can be solvable but is intentionally rejected by this bounded API. Products fit long long under the 10^9 modulus limit. phi(1)=1.",
    alternatives: "A totient sieve computes phi for all values up to N in near-linear/log-log preprocessing. Generalized CRT checks residue consistency modulo gcd and uses an lcm; arbitrary 64-bit implementations additionally need overflow-safe multiplication.",
    practice: [
      { variation: "Verify Bézout coefficients", tip: "Test the algebraic identity directly, not just the returned gcd.", snippet: "bool bezoutCheck(long long a,long long b){\n  auto [g,x,y]=egcd(a,b);\n  return a*x+b*y==g;\n}" },
      { variation: "Solve a*x=b modulo m with invertible a", tip: "Normalize b and multiply by the inverse. Absence of an inverse is explicit, not a zero answer.", snippet: "optional<long long> solve(long long a,long long b,long long m){\n  auto inv=inverse(a,m);if(!inv)return nullopt;\n  b=(b%m+m)%m;return b*(*inv)%m;\n}" },
      { variation: "Count coprime residues by brute force", tip: "Use this for small-n verification of totient. Include n=1 under the conventional phi(1)=1 definition.", snippet: "long long phiReference(int n){\n  if(n<1)throw invalid_argument(\"positive n\");long long count=0;\n  for(int x=1;x<=n;x++)count+=gcd(x,n)==1;\n  return count;\n}" }
    ],
    faq: [
      { question: "Why do distinct prime factors suffice for totient?", answer: "Being divisible by p is the forbidden event regardless of p's exponent. Inclusion-exclusion removes each prime's fraction once." },
      { question: "Does CRT require prime moduli?", answer: "No. Pairwise coprime composite moduli work too. This implementation requires gcd(m,n)=1, not primality." }
    ],
  }
];
