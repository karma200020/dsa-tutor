import type { AuthoredAlgorithm } from "./lesson";

export const graphAlgorithms: AuthoredAlgorithm[] = [
  {
    id: "topic-graph-dsu", moduleId: "mod-graphs", title: "Disjoint Sets: Compression and Union by Size",
    intuition: "Connectivity under edge insertions needs component representatives, not repeated graph searches. Smaller trees attach beneath larger trees, and finds shorten future paths.",
    contract: "Initialize n components labeled [0,n). find returns a representative; unite returns whether two components merged. Supports insertions only, not edge deletion. Endpoints must be valid.",
    prerequisites: "Rooted forests, arrays and amortized complexity.",
    cues: "Online undirected connectivity, redundant edges, component sizes or Kruskal's algorithm.",
    invariant: "Parent pointers form a forest and every root stores its component size. A union changes only one root parent, so no cycle can form. Attaching the smaller root bounds uncompressed height by log n; compression preserves roots while shortening paths. The combined sequence bound is inverse-Ackermann amortized.",
    walkthrough: { input: "n=5; unite(0,1), unite(2,3), unite(1,3), unite(0,2)", output: "true,true,true,false; component size=4", explanation: "First two unions form size-two trees rooted at 0 and 2. Joining 1 and 3 first finds those roots and attaches 2 under 0, making size[0]=4. find(3) compresses 3 directly to 0; the final union detects the same root." },
    code: `#include <bits/stdc++.h>
using namespace std;
struct DSU {
  vector<int> p,sz;
  explicit DSU(int n):p(n),sz(n,1){iota(p.begin(),p.end(),0);}
  int find(int x){if(x<0||x>=(int)p.size())throw out_of_range("vertex");return p[x]==x?x:p[x]=find(p[x]);}
  bool unite(int a,int b){a=find(a);b=find(b);if(a==b)return false;if(sz[a]<sz[b])swap(a,b);p[b]=a;sz[a]+=sz[b];return true;}
  int size(int x){return sz[find(x)];}
};`,
    time: "Initialization O(n); find/unite amortized O(alpha(n)), worst-case individual find O(log n) with size balancing.",
    space: "O(n) arrays, O(log n) worst-case recursive find stack.",
    boundaries: "Self-loops and repeated edges return false. Size is meaningful only at roots. Negative n is outside the constructor contract. Directed reachability is not an equivalence relation and cannot be represented by this DSU.",
    alternatives: "Static components need only one O(V+E) DFS. Rank can replace size but rank is not the current height after compression. Rollback DSU typically avoids compression so each union can be undone in constant recorded changes.",
    practice: [
      { variation: "Count connected components", tip: "Decrease the count only when unite actually merges. Parallel edges must not reduce it twice.", snippet: "int components(int n,const vector<pair<int,int>>&edges){\n  DSU d(n);int count=n;\n  for(auto [u,v]:edges)if(d.unite(u,v))--count;\n  return count;\n}" },
      { variation: "First redundant undirected edge", tip: "An edge inside a component closes a cycle. Stop at the first failed union.", snippet: "pair<int,int> redundant(int n,const vector<pair<int,int>>&edges){\n  DSU d(n);\n  for(auto e:edges)if(!d.unite(e.first,e.second))return e;\n  return {-1,-1};\n}" },
      { variation: "Largest island after joining neighbors", tip: "Deduplicate neighboring roots before summing sizes. Four neighbors can belong to a single component.", snippet: "int joinedSize(DSU& d,const vector<int>&neighbors){\n  set<int>roots;\n  for(int x:neighbors)roots.insert(d.find(x));\n  int answer=1;\n  for(int r:roots)answer+=d.size(r);\n  return answer;\n}" }
    ],
    faq: [
      { question: "Why not attach arbitrary roots?", answer: "Repeatedly attaching a large tree to a singleton can create a linear chain. Size/rank balancing prevents that expensive starting shape, and compression accelerates repeated lookups." },
      { question: "Can DSU remove an edge?", answer: "Not with this representation: it forgets the internal edges of a component. Offline rollback or a dynamic connectivity structure is needed." }
    ],
  },
  {
    id: "topic-graph-dijkstra", moduleId: "mod-graphs", title: "Dijkstra: Nonnegative Shortest Paths",
    intuition: "The smallest unsettled distance is final when edges cannot lower a path by going backward through a negative cost.",
    contract: "Directed adjacency list with vertices [0,n), nonnegative integer weights and a valid source. Return long long shortest distances; INF marks unreachable. Require every finite path of interest below INF=LLONG_MAX/4; invalid edges or weights throw.",
    prerequisites: "BFS, relaxation, min-heaps and weighted graphs.",
    cues: "Single-source shortest costs with nonnegative, nonuniform edge weights.",
    invariant: "The heap contains tentative path lengths. On a non-stale pop of u, any competing path through an unsettled vertex starts at distance at least d[u] and adds nonnegative cost, so it cannot improve u. Relax each outgoing edge; stale entries must be skipped because the heap permits duplicate vertices.",
    walkthrough: { input: "0->1:4, 0->2:1, 2->1:2, 1->3:1, 2->3:8", output: "[0,3,1,4]", explanation: "Pop (0,0), insert (4,1),(1,2). Pop 2, lower 1 to 3 and set 3 to 9. Pop 1 at 3, lower 3 to 4. Heap's older (4,1) and (9,3) are skipped as stale." },
    code: `#include <bits/stdc++.h>
using namespace std;
const long long INF=LLONG_MAX/4;
using Graph=vector<vector<pair<int,long long>>>;
vector<long long> dijkstra(const Graph&g,int src){
  int n=g.size();if(src<0||src>=n)throw out_of_range("source");
  for(auto&row:g)for(auto [v,w]:row)if(v<0||v>=n||w<0||w>=INF)throw invalid_argument("edge");
  vector<long long>d(n,INF);d[src]=0;
  priority_queue<pair<long long,int>,vector<pair<long long,int>>,greater<pair<long long,int>>>q;
  q.push({0,src});
  while(!q.empty()){
    auto [du,u]=q.top();q.pop();if(du!=d[u])continue;
    for(auto [v,w]:g[u])if(du<=INF-w&&du+w<d[v]){d[v]=du+w;q.push({d[v],v});}
  }
  return d;
}`,
    time: "O((V+E) log(E+1)) with duplicate heap entries; commonly O((V+E) log V) on simple graphs.",
    space: "O(V+E) auxiliary including up to O(E) queued relaxations.",
    boundaries: "Zero-weight edges and disconnected vertices are valid. No negative edge is accepted, even in an unreachable component. The guard avoids overflow; INF is a sentinel, not a valid finite answer. Counting shortest walks with zero-cost cycles is a different problem.",
    alternatives: "Unit weights -> BFS; weights 0/1 -> deque; negative edges -> Bellman-Ford; all pairs on small dense graphs -> Floyd-Warshall. A DAG permits linear topological relaxation even with negative edges.",
    practice: [
      { variation: "Reconstruct one shortest path", tip: "Save a parent only on strict improvement. After the run, reverse the parent chain; unreachable targets need an explicit empty result.", snippet: "vector<int> path(const vector<int>&parent,int s,int t){\n  vector<int>out;\n  for(int v=t;v!=-1;v=parent[v]){out.push_back(v);if(v==s)break;}\n  if(out.back()!=s)return {};\n  reverse(out.begin(),out.end());return out;\n}" },
      { variation: "Network delay", tip: "Run once from the source, then take the maximum distance. One unreachable vertex makes complete broadcast impossible.", snippet: "long long delay(const Graph&g,int s){\n  auto d=dijkstra(g,s);\n  if(find(d.begin(),d.end(),INF)!=d.end())return -1;\n  return *max_element(d.begin(),d.end());\n}" },
      { variation: "Several depots", tip: "Introduce a super-source with zero-cost edges to every depot. This computes distance to the closest source without V independent runs.", snippet: "vector<long long> closest(Graph g,const vector<int>&sources){\n  int n=g.size();g.push_back({});\n  for(int s:sources)g[n].push_back({s,0});\n  auto d=dijkstra(g,n);d.pop_back();return d;\n}" }
    ],
    faq: [
      { question: "Why not mark a node visited when pushed?", answer: "Its first discovered path may be expensive. In the trace, node 1 is pushed at 4 but improves to 3 through node 2 before its final pop." },
      { question: "Does a negative edge always give a wrong answer?", answer: "Some instances happen to work, but the finalization proof fails. Use an algorithm whose contract includes negative edges instead of relying on accidental success." }
    ],
  },
  {
    id: "topic-graph-bfs-models", moduleId: "mod-graphs", title: "BFS Models: Bipartite, Multi-Source and Graph Cloning",
    intuition: "A queue processes a frontier in layers, but the visited state depends on the contract: color for bipartiteness, distance for propagation, and an original-to-copy map for cloning.",
    contract: "bipartite checks every component of an undirected adjacency list. multiSource returns nearest-source hop distances (-1 unreachable). cloneGraph copies all nodes reachable from a pointer, preserving self-loops, parallel edges, labels and neighbor order. Vertex indices must be valid; node labels need not be unique. Clone nodes are owned by the caller.",
    prerequisites: "FIFO BFS, connected components, pointers and hash maps.",
    cues: "Two-group constraints, simultaneous unweighted spread, or deep-copying cyclic object graphs.",
    invariant: "For coloring, each discovered edge must connect opposite colors; a conflict witnesses an odd cycle. For multi-source BFS, all sources start at distance zero, so first discovery is the shortest distance from their union. For cloning, allocate and memoize a copy before traversing neighbors, ensuring each original gets exactly one copy even on cycles.",
    walkthrough: { input: "edges 0-1,1-2,2-3; sources {0,3}; clone triangle labels {7,7,9}", output: "bipartite true; distances [0,1,1,0]; 3 distinct copies", explanation: "Color the chain 0,1,0,1. Seed queue [0,3]; first layer discovers 1 and 2 at distance one. For the triangle clone, mapping by pointer keeps the two label-7 nodes distinct; memoizing before enqueue prevents the back edge allocating a second copy." },
    code: `#include <bits/stdc++.h>
using namespace std;
bool bipartite(const vector<vector<int>>&g){
  vector<int>c(g.size(),-1);queue<int>q;
  for(int s=0;s<(int)g.size();s++)if(c[s]<0){
    c[s]=0;q.push(s);
    while(!q.empty()){int u=q.front();q.pop();for(int v:g[u]){
      if(c[v]<0){c[v]=c[u]^1;q.push(v);}else if(c[v]==c[u])return false;
    }}
  }return true;
}
vector<int> multiSource(const vector<vector<int>>&g,const vector<int>&sources){
  vector<int>d(g.size(),-1);queue<int>q;
  for(int s:sources){if(s<0||s>=(int)g.size())throw out_of_range("source");if(d[s]<0){d[s]=0;q.push(s);}}
  while(!q.empty()){int u=q.front();q.pop();for(int v:g[u])if(d[v]<0){d[v]=d[u]+1;q.push(v);}}
  return d;
}
struct Node {int val;vector<Node*> neighbors;explicit Node(int x):val(x){}};
Node* cloneGraph(Node*start){
  if(!start)return nullptr;
  unordered_map<Node*,Node*>copy;queue<Node*>q;
  copy[start]=new Node(start->val);q.push(start);
  while(!q.empty()){
    Node*u=q.front();q.pop();
    for(Node*v:u->neighbors){
      if(!copy.count(v)){copy[v]=new Node(v->val);q.push(v);}
      copy[u]->neighbors.push_back(copy[v]);
    }
  }return copy[start];
}`,
    time: "Each algorithm O(V+E) over the inspected graph (clone only the reachable component).",
    space: "O(V) BFS/color/distance/map auxiliary; clone output O(V+E).",
    boundaries: "A self-loop fails bipartiteness. Disconnected odd cycles require scanning all roots. No sources yields all -1 distances. A null clone input returns null; cyclic cloned graphs need graph-aware cleanup, not recursive tree deletion. Neighbor pointers must be nonnull.",
    alternatives: "DSU with parity solves incremental two-color constraints. DFS can color or clone but risks deep recursion. Weighted propagation needs Dijkstra; ordinary BFS is not a weighted shortest-path algorithm.",
    practice: [
      { variation: "Rotting oranges as a grid graph", tip: "Flatten cells to vertices, seed every rotten orange, and use the largest finite distance to a fresh orange. A fresh vertex at -1 is unreachable.", snippet: "int finishTime(const vector<int>&d,const vector<int>&fresh){\n  int ans=0;\n  for(int v:fresh){if(d[v]<0)return -1;ans=max(ans,d[v]);}\n  return ans;\n}" },
      { variation: "Return the two color classes", tip: "Retain the color array instead of only a boolean. Validate edges before exposing the partition.", snippet: "bool validColors(const vector<vector<int>>&g,const vector<int>&c){\n  for(int u=0;u<(int)g.size();u++)for(int v:g[u])\n    if(c[u]==c[v])return false;\n  return true;\n}" },
      { variation: "Verify a clone's self-loop", tip: "Identity, not label equality, distinguishes originals and copies. A loop must point to the copy itself.", snippet: "Node a(5);a.neighbors={&a,&a};\nNode*b=cloneGraph(&a);\nassert(b!=&a && b->val==5);\nassert(b->neighbors.size()==2);\nassert(b->neighbors[0]==b && b->neighbors[1]==b);\ndelete b;" }
    ],
    faq: [
      { question: "Why mark visited at enqueue rather than dequeue?", answer: "Two frontier nodes can discover the same neighbor before either copy is processed. Marking at enqueue prevents duplicate work and ensures a single distance or cloned allocation." },
      { question: "Can a graph clone use node values as map keys?", answer: "Only if uniqueness is a guaranteed contract. Pointer identity is safe even when different original nodes have equal labels." }
    ],
  },
  {
    id: "topic-graph-mst", moduleId: "mod-advanced-graphs", title: "Minimum Spanning Forest: Kruskal and Prim",
    intuition: "The cheapest edge across a component cut can be chosen safely. Kruskal grows many components; Prim grows one frontier at a time.",
    contract: "An undirected weighted multigraph with n vertices and valid endpoints. Return minimum spanning forest weight plus component count; disconnected graphs produce a forest, not a claimed spanning tree. Negative weights allowed; total must fit long long.",
    prerequisites: "DSU with compression/size, heaps and undirected connectivity.",
    cues: "Connect all sites at minimum total edge cost, with no path-distance objective.",
    invariant: "Cut property: replacing the crossing edge of any optimal tree with a no-heavier chosen crossing edge preserves connectivity and optimality. Kruskal accepts only edges joining distinct components; Prim accepts only the first minimum frontier edge reaching an unused vertex. Both maintain an acyclic forest until each component is spanned.",
    walkthrough: { input: "0-1:4, 0-2:1, 1-2:2, isolated 3", output: "weight=3, components=2", explanation: "Kruskal sorts weights 1,2,4. Add 0-2 then 1-2; reject 0-1 because it closes a cycle. Prim from 0 picks 0-2 then 2-1; a separate root at 3 adds no cost." },
    code: `#include <bits/stdc++.h>
using namespace std;
struct Edge{int u,v;long long w;};
pair<long long,int> kruskal(int n,vector<Edge>e){
  vector<int>p(n),sz(n,1);iota(p.begin(),p.end(),0);
  function<int(int)>find=[&](int x){return p[x]==x?x:p[x]=find(p[x]);};
  sort(e.begin(),e.end(),[](Edge a,Edge b){return a.w<b.w;});
  long long total=0;int components=n;
  for(auto [u,v,w]:e){u=find(u);v=find(v);if(u==v)continue;
    if(sz[u]<sz[v])swap(u,v);p[v]=u;sz[u]+=sz[v];total+=w;--components;}
  return {total,components};
}
pair<long long,int> prim(const vector<vector<pair<int,long long>>>&g){
  vector<bool>used(g.size());long long total=0;int components=0;
  priority_queue<pair<long long,int>,vector<pair<long long,int>>,greater<pair<long long,int>>>q;
  for(int s=0;s<(int)g.size();s++)if(!used[s]){
    ++components;q.push({0,s});
    while(!q.empty()){auto [w,u]=q.top();q.pop();if(used[u])continue;
      used[u]=true;total+=w;for(auto [v,c]:g[u])if(!used[v])q.push({c,v});}
  }return {total,components};
}`,
    time: "Kruskal O(E log E + V); heap Prim O((V+E) log(E+1)).",
    space: "Kruskal O(V+E) including copied edges; Prim O(V+E) auxiliary.",
    boundaries: "Equal edge weights can give several optimal trees. Self-loops are ignored by cycle/used checks. Parallel edges are fine. n=0 yields weight 0 and zero components. MST is defined for undirected graphs; directed arborescences need another algorithm.",
    alternatives: "Dense O(V squared) Prim avoids a heap. Dijkstra minimizes source-to-vertex distances, not total tree weight, so cannot replace an MST algorithm.",
    practice: [
      { variation: "Require a single spanning tree", tip: "Check forest component count explicitly; disconnected inputs are not a successful tree.", snippet: "optional<long long> mst(int n,vector<Edge>e){\n  auto [weight,c]=kruskal(n,e);\n  if(n>0&&c!=1)return nullopt;\n  return weight;\n}" },
      { variation: "Maximum spanning forest", tip: "Reverse sorting order, or negate bounded weights then undo the result's sign. Negation requires excluding LLONG_MIN.", snippet: "long long maximumForest(int n,vector<Edge>e){\n  for(auto&x:e){if(x.w==LLONG_MIN)throw overflow_error(\"negation\");x.w=-x.w;}\n  return -kruskal(n,e).first;\n}" },
      { variation: "Existing free connections", tip: "Represent existing links with zero cost. With nonnegative new-link costs, an MST naturally uses free connectivity first.", snippet: "long long connect(int n,vector<Edge>candidates,const vector<pair<int,int>>&existing){\n  for(auto [u,v]:existing)candidates.push_back({u,v,0});\n  auto [cost,parts]=kruskal(n,candidates);\n  if(n&&parts!=1)throw runtime_error(\"cannot connect\");\n  return cost;\n}" }
    ],
    faq: [
      { question: "Why do negative edges not break MST algorithms?", answer: "The cut replacement argument compares edge weights only; it does not rely on nonnegative path lengths. Negative edges are sorted and selected normally." },
      { question: "Is every MST a shortest-path tree?", answer: "No. Minimizing the sum of chosen edges is different from minimizing each distance from a root." }
    ],
  },
  {
    id: "topic-graph-shortest-path-variants", moduleId: "mod-advanced-graphs", title: "Bellman-Ford, Floyd-Warshall and 0-1 BFS",
    intuition: "Choose the relaxation order from the weight structure: edge passes for negative costs, intermediate vertices for all pairs, and a deque for binary costs.",
    contract: "bellman returns source distances and whether a source-reachable negative cycle exists; distances are not meaningful when that flag is true. floyd accepts an n by n matrix with INF for missing edges and zero diagonal (negative self-edges retained); a negative diagonal flags a negative cycle. zeroOne accepts only weights 0/1. Valid indices required. For negative-weight routines require n*max(abs(weight))*max(1,E) < INF to keep all intermediate additions representable.",
    prerequisites: "Dijkstra, relaxation, adjacency lists and DP.",
    cues: "Negative edges, many source-target queries on a small graph, or binary transition costs.",
    invariant: "After k Bellman passes, every shortest path using at most k edges has been considered. Any improvement on pass n implies a reachable negative cycle. Floyd's k phase permits only vertices <=k internally, decomposing a path at k. In 0-1 BFS, zero-cost improvements go to the deque front and unit-cost improvements to its back, preserving nondecreasing processed distances after stale entries are skipped.",
    walkthrough: { input: "0->1:4, 0->2:5, 1->2:-2; binary graph 0->1:1,0->2:0,2->1:0", output: "Bellman/Floyd from 0: [0,4,2]; binary: [0,0,0]", explanation: "Bellman first reaches 1 at 4, then relaxes 1->2 to 2; no next-pass change. Floyd improves 0->2 when intermediate 1 is admitted. Binary BFS puts node 2 at the front and improves node 1 to zero before its stale cost-one entry." },
    code: `#include <bits/stdc++.h>
using namespace std;
const long long INF=LLONG_MAX/4;
struct Edge{int u,v;long long w;};
pair<vector<long long>,bool> bellman(int n,const vector<Edge>&edges,int s){
  if(s<0||s>=n)throw out_of_range("source");
  vector<long long>d(n,INF);d[s]=0;bool changed=false;
  for(int pass=0;pass<n;pass++){
    changed=false;for(auto [u,v,w]:edges)if(d[u]!=INF&&d[u]+w<d[v]){d[v]=d[u]+w;changed=true;}
    if(!changed)break;
  }return {d,changed};
}
vector<vector<long long>> floyd(vector<vector<long long>>d){
  int n=d.size();for(auto&row:d)if((int)row.size()!=n)throw invalid_argument("square matrix");
  for(int k=0;k<n;k++)for(int i=0;i<n;i++)for(int j=0;j<n;j++)
    if(d[i][k]!=INF&&d[k][j]!=INF){
      __int128 candidate=(__int128)d[i][k]+d[k][j];
      d[i][j]=min(d[i][j],(long long)max(-(__int128)INF,candidate));
    }
  return d;
}
vector<long long> zeroOne(const vector<vector<pair<int,int>>>&g,int s){
  int n=g.size();if(s<0||s>=n)throw out_of_range("source");
  for(auto&row:g)for(auto [v,w]:row)if(v<0||v>=n||(w!=0&&w!=1))throw invalid_argument("binary edge");
  vector<long long>d(n,INF);deque<pair<long long,int>>q;d[s]=0;q.push_front({0,s});
  while(!q.empty()){auto [du,u]=q.front();q.pop_front();if(du!=d[u])continue;
    for(auto [v,w]:g[u])if(du+w<d[v]){d[v]=du+w;if(w)q.push_back({d[v],v});else q.push_front({d[v],v});}
  }return d;
}`,
    time: "Bellman-Ford O(VE); Floyd-Warshall O(V cubed); 0-1 BFS O(V+E).",
    space: "Bellman O(V) auxiliary; Floyd O(V squared) matrix; 0-1 BFS O(V+E) including deque entries.",
    boundaries: "Unreachable negative cycles do not affect a source Bellman result. All-pairs distances involving a reachable negative cycle have no finite minimum; the caller must inspect d[k][k]<0 and affected reachability. Binary BFS rejects cost 2 rather than silently using an incorrect deque ordering.",
    alternatives: "Dijkstra is faster for general nonnegative sparse weights; DAG relaxation supports negative weights in linear time. Johnson reweights for sparse all-pairs graphs without negative cycles; it is not implemented here.",
    practice: [
      { variation: "Detect any negative cycle", tip: "A new zero-cost super-source reaches every component, including cycles unreachable from vertex zero.", snippet: "bool anyNegativeCycle(int n,vector<Edge>edges){\n  for(int v=0;v<n;v++)edges.push_back({n,v,0});\n  return bellman(n+1,edges,n).second;\n}" },
      { variation: "Check a Floyd pair for unbounded negative cost", tip: "A negative diagonal matters to i,j only when i can reach the cycle and it can reach j.", snippet: "bool unbounded(const vector<vector<long long>>&d,int i,int j){\n  for(int k=0;k<(int)d.size();k++)\n    if(d[i][k]!=INF&&d[k][k]<0&&d[k][j]!=INF)return true;\n  return false;\n}" },
      { variation: "Minimum edge reversals", tip: "Give each original directed edge cost zero and its reverse cost one; a shortest binary path counts reversals.", snippet: "vector<vector<pair<int,int>>> reversalGraph(int n,const vector<pair<int,int>>&edges){\n  vector<vector<pair<int,int>>>g(n);\n  for(auto [u,v]:edges){g[u].push_back({v,0});g[v].push_back({u,1});}\n  return g;\n}" }
    ],
    faq: [
      { question: "Why does Bellman-Ford need a final pass?", answer: "A simple finite shortest path has at most V-1 edges. An improvement after that cannot be explained by another simple path; a reachable negative cycle is responsible." },
      { question: "Why must Floyd's k loop be outermost?", answer: "The recurrence depends on a completed set of allowed intermediate vertices. Moving k inside destroys that phase invariant and can miss improvements." }
    ],
  },
  {
    id: "topic-graph-connectivity-lowlink", moduleId: "mod-advanced-graphs", title: "SCCs, Bridges and Articulation Points",
    intuition: "Directed strongly connected regions require mutual reachability; undirected fragile links require knowing whether DFS descendants can escape to an ancestor.",
    contract: "scc labels every vertex in a directed graph using Kosaraju. cuts returns bridges by input edge ID and an articulation flag per vertex for an undirected multigraph. Vertices are valid [0,n). Recursion depth must fit the process stack.",
    prerequisites: "DFS entry/exit order, connected components and directed versus undirected edges.",
    cues: "Collapse directed cycles into a DAG, find single-edge disconnections, or identify vertices whose removal increases component count.",
    invariant: "Kosaraju's decreasing finish order selects a source component of the remaining condensation graph; traversing reversed edges cannot escape that SCC. For undirected DFS, low[u] is the earliest discovery reachable from its subtree using tree edges then at most one back edge. A child edge is a bridge iff low[child]>tin[u]; a nonroot u is a cut vertex iff some child has low[child]>=tin[u]. A root needs two DFS children.",
    walkthrough: { input: "directed 0->1->0,1->2; undirected edges (0,1),(1,2),(1,2)", output: "SCCs {0,1},{2}; bridge edge 0; articulation vertex 1", explanation: "Reverse-finish traversal groups 0 and 1 while leaving 2 separate. In undirected DFS the second 1-2 edge is a back edge to the parent vertex, so low[2]=tin[1]; neither parallel edge is a bridge. Edge 0-1 has no return route." },
    code: `#include <bits/stdc++.h>
using namespace std;
vector<int> scc(const vector<vector<int>>&g){
  int n=g.size();vector<vector<int>>rev(n);for(int u=0;u<n;u++)for(int v:g[u])rev[v].push_back(u);
  vector<bool>seen(n);vector<int>order,id(n,-1);
  function<void(int)>dfs=[&](int u){seen[u]=true;for(int v:g[u])if(!seen[v])dfs(v);order.push_back(u);};
  for(int u=0;u<n;u++)if(!seen[u])dfs(u);
  function<void(int,int)>mark=[&](int u,int c){id[u]=c;for(int v:rev[u])if(id[v]<0)mark(v,c);};
  reverse(order.begin(),order.end());int c=0;for(int u:order)if(id[u]<0)mark(u,c++);
  return id;
}
pair<vector<int>,vector<bool>> cuts(int n,const vector<pair<int,int>>&edges){
  vector<vector<pair<int,int>>>g(n);for(int i=0;i<(int)edges.size();i++){auto [u,v]=edges[i];g[u].push_back({v,i});g[v].push_back({u,i});}
  vector<int>tin(n,-1),low(n),bridges;vector<bool>art(n);int timer=0;
  function<void(int,int)>dfs=[&](int u,int parentEdge){
    tin[u]=low[u]=timer++;int children=0;
    for(auto [v,e]:g[u]){if(e==parentEdge)continue;
      if(tin[v]>=0)low[u]=min(low[u],tin[v]);
      else {++children;dfs(v,e);low[u]=min(low[u],low[v]);
        if(low[v]>tin[u])bridges.push_back(e);
        if(parentEdge!=-1&&low[v]>=tin[u])art[u]=true;}
    }
    if(parentEdge==-1&&children>1)art[u]=true;
  };
  for(int u=0;u<n;u++)if(tin[u]<0)dfs(u,-1);
  sort(bridges.begin(),bridges.end());return {bridges,art};
}`,
    time: "Both algorithms O(V+E).",
    space: "O(V+E) adjacency/reverse graph plus O(V) recursion and metadata.",
    boundaries: "Skip the parent edge ID, not every edge to the parent vertex; otherwise parallel edges are falsely reported as bridges. Self-loops are harmless. Every disconnected root needs its own DFS. SCC labels have no stable numeric identity across edge reorderings.",
    alternatives: "Tarjan finds SCCs in one DFS using an active stack, but its lowlink rules differ from undirected cut detection. Iterative DFS avoids stack overflow on long chains. DSU does not determine directed SCCs.",
    practice: [
      { variation: "Build the condensation DAG", tip: "Discard intra-component edges and deduplicate component pairs. The resulting graph must be acyclic.", snippet: "set<pair<int,int>> condensation(const vector<vector<int>>&g,const vector<int>&id){\n  set<pair<int,int>>e;\n  for(int u=0;u<(int)g.size();u++)for(int v:g[u])\n    if(id[u]!=id[v])e.insert({id[u],id[v]});\n  return e;\n}" },
      { variation: "Count critical servers", tip: "Articulation flags measure removal of a vertex, not removal of one incident link.", snippet: "int criticalServers(int n,const vector<pair<int,int>>&edges){\n  auto [bridges,art]=cuts(n,edges);\n  return count(art.begin(),art.end(),true);\n}" },
      { variation: "Strong-connectivity yes/no", tip: "An empty graph is vacuously accepted by this wrapper. Otherwise every SCC label must equal the first.", snippet: "bool stronglyConnected(const vector<vector<int>>&g){\n  auto id=scc(g);\n  return id.empty()||all_of(id.begin(),id.end(),[&](int c){return c==id[0];});\n}" }
    ],
    faq: [
      { question: "Why does equality count for an articulation but not a bridge?", answer: "A child's return edge to u preserves connectivity after removing the tree edge, but does not help when u itself is removed. Thus low[child]==tin[u] separates the two conditions." },
      { question: "Can directed bridge logic reuse this undirected routine?", answer: "No. Removing a directed edge changes reachability asymmetrically. This lowlink proof relies on undirected back edges." }
    ],
  },
  {
    id: "topic-graph-euler", moduleId: "mod-advanced-graphs", title: "Eulerian Paths with Hierholzer's Algorithm",
    intuition: "Use each directed edge exactly once, splicing cycles by recording vertices only after all of their outgoing edges have been consumed.",
    contract: "Return a vertex sequence using every directed multigraph edge exactly once, or nullopt when impossible. n>=1 and endpoints in [0,n). With no edges return {0}. Self-loops and parallel edges are distinct consumable edges.",
    prerequisites: "Stacks, directed degrees and graph traversal.",
    cues: "Reconstruct a route from tickets, draw every edge once, or assemble adjacent pairs into one trail.",
    invariant: "Choose a start with out-in=1 if it exists; all other degree imbalances must be zero except a single end with in-out=1. Each stack step consumes a fresh outgoing edge. Popping only at a dead end constructs the trail in reverse, splicing closed excursions without losing edges. The final length must be E+1; otherwise disconnected edges were never reached.",
    walkthrough: { input: "0->1,1->0,0->2", output: "[0,1,0,2]", explanation: "Start at 0 because out-in=1. Stack follows 0,1,0,2. Pop dead ends 2,0,1,0 and reverse. A graph with two disconnected directed cycles would have balanced degrees but fail the E+1 length check." },
    code: `#include <bits/stdc++.h>
using namespace std;
optional<vector<int>> euler(int n,const vector<pair<int,int>>&edges){
  if(n<1)throw invalid_argument("positive n");
  vector<vector<int>>g(n);vector<int>in(n),out(n);
  for(auto [u,v]:edges){if(u<0||u>=n||v<0||v>=n)throw out_of_range("edge");g[u].push_back(v);++out[u];++in[v];}
  int start=-1,ends=0,starts=0;
  for(int u=0;u<n;u++){
    int d=out[u]-in[u];
    if(d==1){start=u;++starts;}else if(d==-1)++ends;else if(d!=0)return nullopt;
  }
  if(!((starts==1&&ends==1)||(starts==0&&ends==0)))return nullopt;
  if(start<0){start=0;for(int u=0;u<n;u++)if(out[u]){start=u;break;}}
  vector<int>stack{start},path;vector<size_t>next(n);
  while(!stack.empty()){int u=stack.back();
    if(next[u]<g[u].size())stack.push_back(g[u][next[u]++]);
    else {path.push_back(u);stack.pop_back();}}
  if(path.size()!=edges.size()+1)return nullopt;
  reverse(path.begin(),path.end());return path;
}`,
    time: "O(V+E); lexicographically ordering adjacency adds O(E log E) preprocessing.",
    space: "O(V+E) adjacency, cursors, stack and output.",
    boundaries: "Balanced degrees alone do not ensure one trail; the final edge-count check also enforces connectivity of nonisolated edges. This implementation is directed; undirected trails need shared used-edge IDs.",
    alternatives: "Hamiltonian paths visit each vertex once and are a different, generally hard problem. Fleury's repeated bridge checks are slower. For lexical ticket order, sort destinations descending and consume the smallest first with a matching cursor/pop strategy.",
    practice: [
      { variation: "Validate a proposed trail", tip: "Count multiplicities, not just endpoint pairs, because parallel tickets must each be used once.", snippet: "bool validate(const vector<int>&p,const vector<pair<int,int>>&e){\n  if(p.size()!=e.size()+1)return false;\n  map<pair<int,int>,int>cnt;for(auto x:e)++cnt[x];\n  for(size_t i=1;i<p.size();i++)if(--cnt[{p[i-1],p[i]}]<0)return false;\n  return true;\n}" },
      { variation: "Require a circuit", tip: "First require all directed in/out degrees equal; then use the same traversal and connectivity check.", snippet: "bool balanced(int n,const vector<pair<int,int>>&e){\n  vector<int>d(n);\n  for(auto [u,v]:e){++d[u];--d[v];}\n  return all_of(d.begin(),d.end(),[](int x){return x==0;});\n}" },
      { variation: "Compress airport labels", tip: "Assign integer vertices to unique strings, run Hierholzer, then decode. Labels are not array indices.", snippet: "vector<string> decode(const vector<int>&path,const vector<string>&labels){\n  vector<string>out;\n  for(int v:path)out.push_back(labels.at(v));\n  return out;\n}" }
    ],
    faq: [
      { question: "Why append on backtracking?", answer: "A greedy forward walk may close a cycle before consuming a later excursion. Reverse postorder inserts that excursion at its shared vertex rather than getting stuck." },
      { question: "Do isolated vertices prevent a trail?", answer: "No. The contract covers edges, not every vertex. Only nonisolated components must participate in the single trail." }
    ],
  }
];
