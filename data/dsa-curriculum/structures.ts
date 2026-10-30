import type { AuthoredAlgorithm } from "./lesson";

export const structureAlgorithms: AuthoredAlgorithm[] = [
  {
    id: "topic-string-trie", moduleId: "mod-tries-strings", title: "Trie: Prefix Search and Word Boundaries",
    intuition: "Shared prefixes share nodes. A word end is independent of whether that node has children, so 'app' and 'apple' can coexist.",
    contract: "Insert and query lowercase ASCII words, including the empty word. contains tests full membership; startsWith tests a prefix. Duplicate inserts are idempotent. Non-lowercase characters throw; no deletion in the base API.",
    prerequisites: "Strings, indexed trees and character-to-index conversion.",
    cues: "Repeated prefix queries, dictionary-guided search, or autocomplete over a bounded alphabet.",
    invariant: "The path from root to a node spells exactly one prefix. Insertion creates only missing edges and marks the terminal node; traversing the query path therefore reaches its prefix iff it was inserted, while terminal distinguishes complete words.",
    walkthrough: { input: "insert app, apple; contains ap; startsWith ap; contains app", output: "false,true,true", explanation: "Both words share a->p->p. The third node is terminal for app and has an l->e continuation for apple. Node ap exists but is not terminal; appending another p reaches a full word." },
    code: `#include <bits/stdc++.h>
using namespace std;
struct Trie {
  struct Node{array<int,26>next;bool end=false;Node(){next.fill(-1);}};
  vector<Node>nodes{Node{}};
  static void validate(const string&s){for(char c:s)if(c<'a'||c>'z')throw invalid_argument("lowercase only");}
  void insert(const string&s){validate(s);int u=0;
    for(char c:s){int k=c-'a',v=nodes[u].next[k];
      if(v<0){v=nodes.size();nodes[u].next[k]=v;nodes.emplace_back();}
      u=v;
    }nodes[u].end=true;
  }
  int walk(const string&s)const{validate(s);int u=0;for(char c:s){u=nodes[u].next[c-'a'];if(u<0)return -1;}return u;}
  bool contains(const string&s)const{int u=walk(s);return u>=0&&nodes[u].end;}
  bool startsWith(const string&s)const{return walk(s)>=0;}
};`,
    time: "Insert, contains and startsWith O(L) for word length L; each new node initializes 26 edges.",
    space: "O(26P) for P distinct prefix nodes, O(1) auxiliary per operation.",
    boundaries: "An empty prefix always exists, but an empty word exists only after insertion. Vector reallocation invalidates references, so insertion saves integer indices, never references to edges. This alphabet contract is not Unicode-aware.",
    alternatives: "A hash set is simpler for exact lookup only. A sorted vector supports prefix range searches with binary search. Map edges reduce sparse-node memory; compressed radix trees store runs on edges.",
    practice: [
      { variation: "Wildcard '.' matching one letter", tip: "Only wildcard positions branch; ordinary characters follow a single edge. Worst-case search can visit the whole trie.", snippet: "bool match(const Trie&t,int u,const string&s,int i){\n  if(i==(int)s.size())return t.nodes[u].end;\n  if(s[i]=='.'){for(int v:t.nodes[u].next)if(v>=0&&match(t,v,s,i+1))return true;return false;}\n  int v=t.nodes[u].next[s[i]-'a'];return v>=0&&match(t,v,s,i+1);\n}" },
      { variation: "Longest word prefix of a query", tip: "Remember the last terminal position while following the path. A longest existing path need not be a word.", snippet: "int longestWordPrefix(const Trie&t,const string&s){\n  Trie::validate(s);int u=0,best=t.nodes[0].end?0:-1;\n  for(int i=0;i<(int)s.size();i++){u=t.nodes[u].next[s[i]-'a'];if(u<0)break;if(t.nodes[u].end)best=i+1;}\n  return best;\n}" },
      { variation: "Enumerate suffix completions", tip: "Start at the prefix node and DFS in character order. Charge for the total output size, not only the prefix lookup.", snippet: "void words(const Trie&t,int u,string&prefix,vector<string>&out){\n  if(t.nodes[u].end)out.push_back(prefix);\n  for(int k=0;k<26;k++)if(t.nodes[u].next[k]>=0){\n    prefix.push_back('a'+k);words(t,t.nodes[u].next[k],prefix,out);prefix.pop_back();\n  }\n}" }
    ],
    faq: [
      { question: "Why is a terminal flag necessary?", answer: "A node can be both a complete word and a prefix of longer words. Children alone cannot distinguish app from ap after inserting apple." },
      { question: "Does trie lookup beat hashing asymptotically?", answer: "Both inspect O(L) characters under ordinary hashing assumptions. The trie earns its memory cost through prefix traversal and early rejection, not an O(1)-versus-O(L) claim." }
    ],
  },
  {
    id: "topic-tree-postorder-contracts", moduleId: "mod-trees-bst", title: "Tree Diameter, Path Sums and Height Balance",
    intuition: "A postorder result summarizes exactly what a parent can extend: one downward branch, while a global answer may join two branches at the current node.",
    contract: "For an acyclic binary tree, diameter is the maximum edge count between any two nodes (empty=0); maxPath is the largest nonempty node-value path sum (empty=nullopt); balanced means every node's child heights differ by at most one. Values/sums fit long long; recursion depth must fit the stack.",
    prerequisites: "Binary tree traversal, recursion and max/min recurrences.",
    cues: "Combine left and right subtree summaries, but return only one extendable branch to the parent.",
    invariant: "Height(null)=0; the longest path through u has leftHeight+rightHeight edges. Maximum-sum downward gain returns value+max(0,leftGain,rightGain); a complete path may use both positive gains. Balance propagates a -1 sentinel as soon as a subtree fails, avoiding recomputation of heights.",
    walkthrough: { input: "root=-10, left=9, right=20 with children 15,7", output: "diameter=3; maximum path=42; balanced=true", explanation: "Leaves return height 1. Node 20 joins gains 15+20+7=42 and returns 35 upward. Root's best joined path is -10+9+35=34, so 42 remains. Root joins heights 1+2 for diameter 3 edges." },
    code: `#include <bits/stdc++.h>
using namespace std;
struct Tree{long long val;Tree*left=nullptr,*right=nullptr;explicit Tree(long long x):val(x){}};
int diameter(Tree*root){
  int best=0;function<int(Tree*)>height=[&](Tree*u){if(!u)return 0;int l=height(u->left),r=height(u->right);best=max(best,l+r);return 1+max(l,r);};
  height(root);return best;
}
optional<long long> maxPath(Tree*root){
  if(!root)return nullopt;long long best=LLONG_MIN;
  function<long long(Tree*)>gain=[&](Tree*u){if(!u)return 0LL;long long l=max(0LL,gain(u->left)),r=max(0LL,gain(u->right));best=max(best,u->val+l+r);return u->val+max(l,r);};
  gain(root);return best;
}
bool balanced(Tree*root){
  function<int(Tree*)>height=[&](Tree*u){if(!u)return 0;int l=height(u->left),r=height(u->right);if(l<0||r<0||abs(l-r)>1)return -1;return 1+max(l,r);};
  return height(root)>=0;
}
bool rootPathSum(Tree*u,long long target){
  if(!u)return false;if(!u->left&&!u->right)return u->val==target;
  return rootPathSum(u->left,target-u->val)||rootPathSum(u->right,target-u->val);
}`,
    time: "O(n) per routine; each node is summarized once.",
    space: "O(h) recursion, up to O(n) for a skewed tree.",
    boundaries: "All-negative maximum paths must return the largest node, not zero. Diameter counts edges while height counts nodes. Root-to-leaf path sums cannot stop at an internal node. Height-balanced is not the same as complete, perfect or BST-ordered.",
    alternatives: "BFS twice gives diameter for an unweighted undirected tree, but needs adjacency. Iterative postorder avoids stack overflow. AVL/red-black trees maintain balance under updates; this lesson checks balance of an existing binary tree and does not implement rotations.",
    practice: [
      { variation: "Count downward paths with target sum", tip: "Maintain prefix frequencies on the current root-to-node path; remove a prefix on backtracking so siblings do not interact.", snippet: "long long countPaths(Tree*u,long long target,long long prefix,map<long long,int>&freq){\n  if(!u)return 0;prefix+=u->val;long long ans=freq[prefix-target];++freq[prefix];\n  ans+=countPaths(u->left,target,prefix,freq)+countPaths(u->right,target,prefix,freq);\n  --freq[prefix];return ans;\n}\n// Start with prefix=0 and freq={{0,1}}." },
      { variation: "Minimum depth", tip: "A missing child is not a valid route to a leaf. Treat single-child nodes separately instead of taking min with zero.", snippet: "int minDepth(Tree*u){\n  if(!u)return 0;\n  if(!u->left)return 1+minDepth(u->right);\n  if(!u->right)return 1+minDepth(u->left);\n  return 1+min(minDepth(u->left),minDepth(u->right));\n}" },
      { variation: "Return root-to-leaf paths", tip: "Copy the current path only at leaves. Push/pop gives O(h) working memory excluding output.", snippet: "void paths(Tree*u,vector<long long>&cur,vector<vector<long long>>&out){\n  if(!u)return;cur.push_back(u->val);\n  if(!u->left&&!u->right)out.push_back(cur);\n  else{paths(u->left,cur,out);paths(u->right,cur,out);}\n  cur.pop_back();\n}" }
    ],
    faq: [
      { question: "Why cannot the returned maximum gain include both children?", answer: "The parent could then extend a fork into a three-branch object, which is not a simple path. Both children are allowed only when finalizing a path at their join." },
      { question: "Why is recomputing height at every node quadratic?", answer: "A skewed chain repeatedly scans suffix subtrees of sizes n,n-1,...,1. Returning height together with balance visits each node only once." }
    ],
  },
  {
    id: "topic-tree-codec-reconstruction", moduleId: "mod-trees-bst", title: "Tree Serialization and Traversal Reconstruction",
    intuition: "Null markers preserve shape in a preorder stream. Preorder plus inorder instead recovers shape by locating the root and partitioning the remaining values.",
    contract: "serialize emits preorder tokens with '#' nulls. deserialize rejects malformed, trailing or out-of-range tokens and owns nodes with unique_ptr. reconstruct requires equal-length preorder/inorder sequences of unique int values describing one tree; mismatches throw without leaking allocated nodes.",
    prerequisites: "Preorder/inorder traversal, recursive interval contracts, hash lookup and ownership.",
    cues: "Round-trip a tree through storage, or rebuild it from two traversals without a quadratic search.",
    invariant: "A serialized subtree consumes one root token then exactly its two serialized children; '#' consumes no children. In reconstruction, the next preorder value is the current root; its inorder position uniquely splits disjoint left/right intervals. Recursing left first consumes exactly the left subtree before the right.",
    walkthrough: { input: "preorder [3,9,20,15,7], inorder [9,3,15,20,7]", output: "3 9 # # 20 15 # # 7 # #", explanation: "Root 3 splits inorder at index 1. Left interval [0,1) consumes preorder 9. Right interval [2,5) consumes 20, whose left is 15 and right is 7. Null tokens make a lone left child distinguishable from a lone right child." },
    code: `#include <bits/stdc++.h>
using namespace std;
struct Tree{int val;unique_ptr<Tree>left,right;explicit Tree(int x):val(x){}};
void emit(const Tree*u,ostream&out){if(!u){out<<"# ";return;}out<<u->val<<' ';emit(u->left.get(),out);emit(u->right.get(),out);}
string serialize(const Tree*u){ostringstream out;emit(u,out);return out.str();}
unique_ptr<Tree> parse(istream&in){
  string tok;if(!(in>>tok))throw invalid_argument("truncated tree");if(tok=="#")return nullptr;
  size_t used=0;long long x;
  try{x=stoll(tok,&used);}catch(const exception&){throw invalid_argument("bad integer");}
  if(used!=tok.size()||x<INT_MIN||x>INT_MAX)throw invalid_argument("bad integer");
  auto u=make_unique<Tree>((int)x);u->left=parse(in);u->right=parse(in);return u;
}
unique_ptr<Tree> deserialize(const string&s){istringstream in(s);auto u=parse(in);string extra;if(in>>extra)throw invalid_argument("trailing token");return u;}
unique_ptr<Tree> reconstruct(const vector<int>&pre,const vector<int>&ino){
  if(pre.size()!=ino.size())throw invalid_argument("length");
  unordered_map<int,int>pos;for(int i=0;i<(int)ino.size();i++)if(!pos.emplace(ino[i],i).second)throw invalid_argument("duplicate");
  size_t next=0;unordered_set<int>seen;
  function<unique_ptr<Tree>(int,int)>build=[&](int l,int r)->unique_ptr<Tree>{
    if(l==r)return nullptr;if(next==pre.size())throw invalid_argument("missing root");
    int x=pre[next++];auto it=pos.find(x);
    if(it==pos.end()||it->second<l||it->second>=r||!seen.insert(x).second)throw invalid_argument("inconsistent traversals");
    auto u=make_unique<Tree>(x);u->left=build(l,it->second);u->right=build(it->second+1,r);return u;
  };
  return build(0,ino.size());
}`,
    time: "Serialization/deserialization O(B) encoded bytes; reconstruction expected O(n) using hash lookup (worst-case O(n squared) hashing).",
    space: "O(n) output/index/owned nodes; O(h) recursive stack. Serialized size O(n) for bounded-width ints.",
    boundaries: "Unique values are required only for traversal reconstruction, not serialization. Empty tree is '#', not an empty stream. Recursion and recursive destruction can overflow on extremely deep trees; use iterative representations for untrusted depths.",
    alternatives: "Level-order serialization works with explicit null positions. Preorder plus postorder does not uniquely determine a general binary tree. A BST can exploit ordering to reconstruct from preorder alone.",
    practice: [
      { variation: "Check round-trip equivalence", tip: "Compare canonical serialized forms including null markers, not merely node values.", snippet: "bool roundTrip(const string&s){\n  auto a=deserialize(s);\n  auto b=deserialize(serialize(a.get()));\n  return serialize(a.get())==serialize(b.get());\n}" },
      { variation: "Inorder plus postorder", tip: "The final postorder value is the root. When consuming backward, construct the right subtree before the left.", snippet: "vector<int> postorder(const Tree*u){\n  if(!u)return {};\n  auto a=postorder(u->left.get()),b=postorder(u->right.get());\n  a.insert(a.end(),b.begin(),b.end());a.push_back(u->val);return a;\n}" },
      { variation: "Count null markers", tip: "Every binary node contributes two child slots but fills one slot. A tree with n nodes has n+1 null pointers.", snippet: "pair<int,int> counts(const Tree*u){\n  if(!u)return {0,1};\n  auto l=counts(u->left.get()),r=counts(u->right.get());\n  return {1+l.first+r.first,l.second+r.second};\n}" }
    ],
    faq: [
      { question: "Why does preorder alone not preserve shape?", answer: "The sequence 1,2 could mean root 1 with left child 2 or with right child 2. Null markers distinguish those cases." },
      { question: "Why not repeatedly slice traversal vectors?", answer: "Slicing and rescanning can cost O(n squared) on skewed trees. Shared bounds and a position map give linear expected reconstruction." }
    ],
  },
  {
    id: "topic-list-identity-copy", moduleId: "mod-linked-list", title: "List Intersection and Random-Pointer Copying",
    intuition: "Intersection is pointer identity, not equal values. Copying needs a mapping from every original identity to exactly one new identity.",
    contract: "intersection accepts two acyclic singly linked lists and returns their first shared node, or null. copyRandom accepts an acyclic next-chain whose random pointers are null or within the chain; return a deep copy without modifying the original. Caller owns copied nodes.",
    prerequisites: "Linked-list traversal, pointer equality and hash maps.",
    cues: "Shared tails, aliasing, or arbitrary cross-links that must preserve structure in a clone.",
    invariant: "Switching heads after reaching null makes both intersection pointers travel lenA+lenB, cancelling prefix length differences. For copying, pass one allocates every new identity; pass two rewires next/random exclusively through the completed map, so no pointer in the copy refers to an original.",
    walkthrough: { input: "A=1->2->shared(8)->9; B=3->shared(8)->9; random 1->9,9->1", output: "intersection shared(8); cloned random pointers stay inside copy", explanation: "Pointer A traverses four nodes then B's prefix; pointer B traverses three then A's two-node prefix. They align at shared 8. Copy pass one allocates all four nodes before either forward or backward random link is resolved." },
    code: `#include <bits/stdc++.h>
using namespace std;
struct Node{int val;Node*next=nullptr,*random=nullptr;explicit Node(int x):val(x){}};
Node* intersection(Node*a,Node*b){Node*p=a,*q=b;while(p!=q){p=p?p->next:b;q=q?q->next:a;}return p;}
Node* copyRandom(Node*head){
  unordered_map<Node*,unique_ptr<Node>>copy;
  for(Node*p=head;p;p=p->next)copy.emplace(p,make_unique<Node>(p->val));
  auto mapped=[&](Node*p)->Node*{if(!p)return nullptr;auto it=copy.find(p);if(it==copy.end())throw invalid_argument("external random");return it->second.get();};
  for(Node*p=head;p;p=p->next){copy.at(p)->next=mapped(p->next);copy.at(p)->random=mapped(p->random);}
  Node*out=mapped(head);for(auto&entry:copy)entry.second.release();return out;
}
void destroy(Node*p){while(p){Node*q=p->next;delete p;p=q;}}`,
    time: "Intersection O(n+m); copy expected O(n), worst-case O(n squared) with adversarial hashing.",
    space: "Intersection O(1); copy O(n) mapping and O(n) output.",
    boundaries: "Equal-valued disjoint nodes do not intersect. Cycles violate both base contracts and must be detected/handled first. A self-random pointer becomes a self-pointer in the copy. Invalid external random pointers throw before ownership is released.",
    alternatives: "Length alignment is another O(1)-space intersection method. Interleaving clone nodes with originals reduces copy working space to O(1), but mutates the input temporarily and complicates exception safety and concurrent access.",
    practice: [
      { variation: "Disjoint equal-valued lists", tip: "A value comparison is a false positive. Use address identity in the shared-tail contract.", snippet: "Node a(1),b(1);\nassert(a.val==b.val);\nassert(&a!=&b);\nassert(intersection(&a,&b)==nullptr);" },
      { variation: "Copy a self-random node", tip: "Allocate before wiring; recursive copying without memoization would recurse forever.", snippet: "Node a(5);a.random=&a;\nNode*b=copyRandom(&a);\nassert(b!=&a && b->random==b);\nassert(a.random==&a);\ndestroy(b);" },
      { variation: "Length-align intersection", tip: "Advance the longer prefix by the length difference, then walk in lockstep. Count next links, ignoring random links.", snippet: "Node* aligned(Node*a,Node*b){\n  int n=0,m=0;for(auto p=a;p;p=p->next)++n;for(auto p=b;p;p=p->next)++m;\n  while(n>m){a=a->next;--n;}while(m>n){b=b->next;--m;}\n  while(a!=b){a=a->next;b=b->next;}return a;\n}" }
    ],
    faq: [
      { question: "Why do switched pointers terminate for disjoint lists?", answer: "Both eventually consume the same combined length and become null together. No value equality is involved." },
      { question: "Does copying values and next pointers suffice?", answer: "No. Random pointers would still alias original nodes unless they are remapped through original identity to copied identity." }
    ],
  },
  {
    id: "topic-heap-merge-schedule", moduleId: "mod-heaps", title: "Merge K Lists and Cooldown Task Scheduling",
    intuition: "A merge heap stores one candidate per sorted source. A scheduler separates priority among available tasks from the time at which cooling tasks become eligible.",
    contract: "mergeK destructively reuses disjoint sorted acyclic lists; return their sorted union. schedule accepts nonnegative cooldown and single-character task labels, unit durations and arbitrary reordering; equal labels require at least cooldown intervening slots. Return optimal completion length, not an execution log.",
    prerequisites: "Min/max heaps, linked lists, frequency counting and FIFO queues.",
    cues: "K sorted streams, or repeated high-frequency tasks with release times after execution.",
    invariant: "Each merge heap head is the smallest remaining value of its source, so its minimum is globally next. Scheduling picks the largest remaining eligible count; postponing a less frequent task cannot create more forced idle than postponing a more frequent one. A cooldown FIFO releases runs in execution-time order; when no task is ready, jump directly to the earliest release. For unit tasks this matches max(N,(fmax-1)*(cooldown+1)+numberOfMaxima).",
    walkthrough: { input: "lists [1,4],[1,3],[2]; tasks AAABBB, cooldown=2", output: "merge [1,1,2,3,4]; schedule length 8", explanation: "Merge starts with heads 1,1,2 and replaces only the popped source's head. Scheduling executes A at 0, B at 1, idles 2, then A3,B4,idle5,A6,B7. A is next available at prior execution+3, not +2." },
    code: `#include <bits/stdc++.h>
using namespace std;
struct Node{int val;Node*next=nullptr;explicit Node(int x):val(x){}};
Node* mergeK(vector<Node*>heads){
  auto cmp=[](Node*a,Node*b){return a->val>b->val;};
  priority_queue<Node*,vector<Node*>,decltype(cmp)>q(cmp);
  for(Node*p:heads)if(p)q.push(p);
  Node dummy(0);Node*tail=&dummy;
  while(!q.empty()){Node*p=q.top();q.pop();if(p->next)q.push(p->next);tail->next=p;tail=p;}
  tail->next=nullptr;return dummy.next;
}
long long schedule(const string&tasks,int cooldown){
  if(cooldown<0)throw invalid_argument("cooldown");
  map<char,int>freq;for(char c:tasks)++freq[c];priority_queue<int>ready;
  for(auto [c,n]:freq)ready.push(n);
  queue<pair<long long,int>>wait;long long time=0;
  while(!ready.empty()||!wait.empty()){
    if(ready.empty()&&!wait.empty())time=max(time,wait.front().first);
    while(!wait.empty()&&wait.front().first<=time){ready.push(wait.front().second);wait.pop();}
    int count=ready.top();ready.pop();if(--count)wait.push({time+(long long)cooldown+1,count});++time;
  }return time;
}`,
    time: "Merge O(N log(K+1)); scheduling O(N log(A+1)), with idle jumps rather than one iteration per idle slot.",
    space: "Merge O(K) heap; scheduling O(A) counts/ready/cooldown for A distinct labels.",
    boundaries: "Null source lists are skipped. Shared nodes across merge inputs violate disjointness and can create cycles. Empty tasks finish at zero. cooldown=0 permits adjacent equal tasks. Variable durations, fixed order or per-task cooldowns invalidate the simple greedy proof.",
    alternatives: "Pairwise balanced divide-and-conquer merges also cost O(N log K). The closed-form scheduler formula is O(N+A) when only length is requested; the queue model extends more naturally to producing a timeline.",
    practice: [
      { variation: "Closed-form schedule length", tip: "Most-frequent tasks create f-1 mandatory frames; tied maxima occupy the last frame. Take max with task count because filler can eliminate all idle.", snippet: "long long formula(const string&s,int c){\n  map<char,int>f;for(char x:s)++f[x];int mx=0,ties=0;\n  for(auto [x,n]:f)mx=max(mx,n);\n  for(auto [x,n]:f)ties+=n==mx;\n  return s.empty()?0:max((long long)s.size(),(long long)(mx-1)*(c+1LL)+ties);\n}" },
      { variation: "Merge sorted arrays", tip: "Heap entries need value, source index and position. Push the successor only from the source just popped.", snippet: "vector<int> mergeArrays(const vector<vector<int>>&a){\n  using E=tuple<int,int,int>;priority_queue<E,vector<E>,greater<E>>q;vector<int>out;\n  for(int i=0;i<(int)a.size();i++)if(!a[i].empty())q.push({a[i][0],i,0});\n  while(!q.empty()){auto [v,i,j]=q.top();q.pop();out.push_back(v);if(j+1<(int)a[i].size())q.push({a[i][j+1],i,j+1});}\n  return out;\n}" },
      { variation: "Stop after the kth merged element", tip: "The frontier invariant remains valid without exhausting all sources. This avoids processing N items when k is small.", snippet: "int kth(vector<int>a,int k){\n  if(k<1||k>(int)a.size())throw out_of_range(\"k\");\n  priority_queue<int,vector<int>,greater<int>>q(a.begin(),a.end());\n  while(--k)q.pop();return q.top();\n}" }
    ],
    faq: [
      { question: "Why not insert every list node at once?", answer: "That uses O(N) heap storage and O(N log N) work, discarding the sorted-source advantage. One frontier head per source is enough." },
      { question: "Why jump the clock when ready is empty?", answer: "No legal execution can occur before the earliest cooldown release. Jumping preserves the optimum while avoiding time proportional to a huge cooldown value." }
    ],
  }
];
