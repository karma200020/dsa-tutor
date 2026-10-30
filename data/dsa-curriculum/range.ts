import type { AuthoredAlgorithm } from "./lesson";

export const rangeAlgorithms: AuthoredAlgorithm[] = [
  {
    id: "topic-range-fenwick", moduleId: "mod-range-queries", title: "Fenwick Tree: Dynamic Prefix Sums",
    intuition: "A prefix splits into disjoint power-of-two suffix blocks. Store those block sums so a point update touches only its containing blocks.",
    contract: "Store n signed 64-bit values. add(i,delta) updates a zero-based point; prefix(r) sums [0,r); sum(l,r) sums [l,r). Empty ranges return zero. All sums must fit long long; invalid indices throw.",
    prerequisites: "Prefix sums, binary representation, and zero-based half-open intervals.",
    cues: "Repeated point increments interleaved with range sums, especially inversion counts after compression.",
    invariant: "At internal one-based index j, bit[j] equals the sum over [j-lowbit(j)+1,j]. A prefix query subtracts lowbit, partitioning its prefix into disjoint blocks. An update adds lowbit to enumerate precisely the blocks containing the point; therefore every changed prefix sees delta once.",
    walkthrough: { input: "[2,1,3,4]; add(1,5); sum(1,4)", output: "13", explanation: "Initial internal bit=[2,3,3,10]. add at external 1 visits internal 2 and 4, producing [2,8,3,15]. prefix(4)=15; prefix(1)=2; subtract to get 13." },
    code: `#include <bits/stdc++.h>
using namespace std;
struct Fenwick {
  int n; vector<long long> bit;
  explicit Fenwick(int size): n(size), bit(size < 0 ? 0 : size+1) {
    if(size < 0) throw invalid_argument("negative size");
  }
  void add(int i,long long d) {
    if(i<0 || i>=n) throw out_of_range("point");
    for(++i;i<=n;i+=i&-i) bit[i]+=d;
  }
  long long prefix(int r) const {
    if(r<0 || r>n) throw out_of_range("prefix");
    long long s=0; for(;r;r-=r&-r) s+=bit[r]; return s;
  }
  long long sum(int l,int r) const {
    if(l<0 || l>r || r>n) throw out_of_range("range");
    return prefix(r)-prefix(l);
  }
};`,
    time: "Construction O(n) zero initialization; add, prefix, sum O(log n) each; building from values with add O(n log n).",
    space: "O(n) storage, O(1) auxiliary per operation.",
    boundaries: "n=0 allows only prefix(0)/sum(0,0). Negative deltas are fine for sums, but prefix-order searches require nonnegative frequencies. Assignment needs the old value to compute a delta. Min/max do not support arbitrary replacement via subtraction.",
    alternatives: "Immutable prefix sums give O(1) query but O(n) update. A segment tree supports arbitrary associative aggregates and point assignment. Range addition plus point query uses a Fenwick over differences; range addition plus range sums needs two Fenwicks, not this API.",
    practice: [
      { variation: "Point assignment", tip: "Retain the current values; assignment is a difference, not another increment. This preserves O(log n) updates.", snippet: "void assign(Fenwick& f, vector<long long>& a, int i, long long x) {\n  f.add(i,x-a.at(i));\n  a[i]=x;\n}" },
      { variation: "Range increment, point lookup", tip: "Use a difference array of size n+1. Adding d on [l,r) changes only the two boundaries; a prefix recovers a point.", snippet: "void rangeAdd(Fenwick& diff,int l,int r,long long d) {\n  diff.add(l,d);\n  diff.add(r,-d);\n}\nlong long point(const Fenwick& diff,int i) { return diff.prefix(i+1); }" },
      { variation: "Count inversions", tip: "Compress equal values to equal ranks. Scanning right to left, count strictly smaller ranks before inserting; ties must not count.", snippet: "long long inversions(const vector<int>& rank,int distinct) {\n  Fenwick f(distinct); long long ans=0;\n  for(int i=(int)rank.size()-1;i>=0;--i) {\n    ans+=f.prefix(rank[i]); f.add(rank[i],1);\n  }\n  return ans;\n}" }
    ],
    faq: [
      { question: "Why is the public API zero-based but bit one-based?", answer: "lowbit(0)=0 would stop the update loop from progressing. Incrementing the external index ensures internal indices are positive; prefix(r) already represents the first r items." },
      { question: "Can signed frequencies support kth-element search?", answer: "Not generally: negative frequencies make prefix sums nonmonotone. Ordinary prefix sums still work, but binary lifting to a target prefix requires nonnegative counts." }
    ],
  },
  {
    id: "topic-range-segment-lazy", moduleId: "mod-range-queries", title: "Segment Trees and Composable Lazy Tags",
    intuition: "A binary interval hierarchy answers range sums by combining disjoint covered nodes; lazy tags postpone changes to children without invalidating the parent's aggregate.",
    contract: "Build from signed values. On zero-based [l,r), support range assignment, range addition and range sum. setPoint is assignment on [i,i+1). Empty ranges are valid; arithmetic must fit long long, including tag times interval length.",
    prerequisites: "Recursion, prefix sums, interval splitting and associative addition.",
    cues: "Mixed range updates and range aggregates; updates cannot be reduced to a single Fenwick delta.",
    invariant: "sum[v] always reflects all updates for its interval. Segment trees combine associative aggregates; sum uses addition with identity zero, so disjoint pieces can be merged in either grouping. A tag represents x -> (hasSet ? setValue : x)+add. A new assignment discards every older tag; a new addition increments add. push applies assignment first, then addition, to children. Fully covered queries use the correct parent; partial queries push then combine. Each update/query touches O(log n) canonical boundary nodes.",
    walkthrough: { input: "[1,2,3,4]; add(0,4,2); assign(1,3,5); add(2,4,1)", output: "[3,5,6,7], sum=21", explanation: "Root initially sums to 10. Add 2 raises it to 18 with pending add=2. Assignment pushes that add then replaces the middle leaves, yielding [3,5,5,6]. Last add changes the suffix to [6,7]. Reversing assignment and addition would instead produce different values, so composition order matters." },
    code: `#include <bits/stdc++.h>
using namespace std;
struct SegmentTree {
  struct Node { long long sum=0,setValue=0,add=0; bool hasSet=false; };
  int n; vector<Node> tr;
  explicit SegmentTree(const vector<long long>& a):n(a.size()),tr(max(1,4*(int)a.size())) {
    if(n) build(1,0,n,a);
  }
  void build(int v,int l,int r,const vector<long long>&a) {
    if(r-l==1){tr[v].sum=a[l];return;}
    int m=(l+r)/2;build(v*2,l,m,a);build(v*2+1,m,r,a);pull(v);
  }
  void pull(int v){tr[v].sum=tr[v*2].sum+tr[v*2+1].sum;}
  void setNode(int v,int len,long long x){tr[v].sum=x*len;tr[v].hasSet=true;tr[v].setValue=x;tr[v].add=0;}
  void addNode(int v,int len,long long x){tr[v].sum+=x*len;tr[v].add+=x;}
  void push(int v,int l,int r){
    if(r-l==1)return;int m=(l+r)/2;
    if(tr[v].hasSet){setNode(v*2,m-l,tr[v].setValue);setNode(v*2+1,r-m,tr[v].setValue);}
    if(tr[v].add){addNode(v*2,m-l,tr[v].add);addNode(v*2+1,r-m,tr[v].add);}
    tr[v].hasSet=false;tr[v].add=0;
  }
  void bounds(int l,int r)const{if(l<0||l>r||r>n)throw out_of_range("range");}
  void update(int v,int l,int r,int ql,int qr,long long x,bool replace){
    if(qr<=l||r<=ql)return;
    if(ql<=l&&r<=qr){if(replace)setNode(v,r-l,x);else addNode(v,r-l,x);return;}
    push(v,l,r);int m=(l+r)/2;
    update(v*2,l,m,ql,qr,x,replace);update(v*2+1,m,r,ql,qr,x,replace);pull(v);
  }
  long long query(int v,int l,int r,int ql,int qr){
    if(qr<=l||r<=ql)return 0;
    if(ql<=l&&r<=qr)return tr[v].sum;
    push(v,l,r);int m=(l+r)/2;return query(v*2,l,m,ql,qr)+query(v*2+1,m,r,ql,qr);
  }
  void add(int l,int r,long long x){bounds(l,r);if(l<r)update(1,0,n,l,r,x,false);}
  void assign(int l,int r,long long x){bounds(l,r);if(l<r)update(1,0,n,l,r,x,true);}
  void setPoint(int i,long long x){if(i<0||i>=n)throw out_of_range("point");assign(i,i+1,x);}
  long long sum(int l,int r){bounds(l,r);return l==r?0:query(1,0,n,l,r);}
};`,
    time: "Build O(n); point assignment, range assignment, range addition and range sum O(log n) each.",
    space: "O(n) tree storage and O(log n) recursion stack.",
    boundaries: "A boolean distinguishes assigning zero from no assignment. Do not retain references across vector growth (this implementation preallocates). Negative increments work. Min needs a different aggregate update, while gcd cannot be updated by simply adding delta to a node.",
    alternatives: "For point updates alone, an iterative segment tree avoids lazy tags. A Fenwick is smaller for additive point deltas. Lazy affine tags generalize assignment/addition but require explicit composition and sum-length multiplication; persistence is a separate design.",
    practice: [
      { variation: "Point replacement and range query only", tip: "Reuse assignment on a unit interval. The old value need not be known, unlike a Fenwick update.", snippet: "SegmentTree t(vector<long long>{4,1,7});\nt.setPoint(1,10);\nassert(t.sum(0,2)==14);" },
      { variation: "Range multiplication and addition", tip: "Represent x -> a*x+b. New (a,b) after old (c,d) composes to (a*c,a*d+b); sum changes by a*sum+b*len.", snippet: "struct Tag { long long a=1,b=0; };\nTag compose(Tag newer,Tag older) {\n  return {newer.a*older.a,newer.a*older.b+newer.b};\n}\nlong long apply(Tag t,long long sum,int len){return t.a*sum+t.b*len;}" },
      { variation: "Find the first prefix reaching a target", tip: "With nonnegative values, binary search range sums is valid in O(log squared n). A direct lazy-aware descent improves it to O(log n).", snippet: "int firstPrefix(SegmentTree& t,long long target) {\n  if(target<=0)return 0;\n  if(t.sum(0,t.n)<target)return -1;\n  int l=1,r=t.n;\n  while(l<r){int m=(l+r)/2;if(t.sum(0,m)>=target)r=m;else l=m+1;}\n  return l;\n}" }
    ],
    faq: [
      { question: "Why is assignment followed by addition not interchangeable?", answer: "Assign 5 then add 2 produces 7; add 2 then assign 5 produces 5. The pending tag must encode chronological function composition, not a commutative bag of updates." },
      { question: "Does querying mutate the tree?", answer: "This query pushes pending tags on partial overlaps, so it is intentionally non-const. It does not change logical values; it redistributes their representation." }
    ],
  },
  {
    id: "topic-range-static-compression", moduleId: "mod-range-queries", title: "Static RMQ, Sparse Tables and Coordinate Compression",
    intuition: "When data is immutable, precompute overlapping powers of two for minimum queries. When coordinates are huge but only their order matters, replace them with dense sorted ranks.",
    contract: "SparseMin answers minimum on nonempty [l,r) over immutable long long values. Compression returns sorted unique coordinates; lower_bound maps existing values to ranks. Rank differences are not physical distances.",
    prerequisites: "Sorting, binary search, idempotent minimum and prefix sums.",
    cues: "Many static min queries or a small number of observed coordinates in a universe up to 10^18.",
    invariant: "st[k][i] stores min of length 2^k starting at i. Combining two adjacent half-blocks builds it correctly. For query length L, two blocks of length 2^floor(log2 L) cover the range; their overlap is harmless because min(x,x)=x. Compression is strictly order-preserving between distinct values.",
    walkthrough: { input: "a=[8,2,6,1,5], query [1,5); coordinates [100,7,100,-4]", output: "minimum 1; ranks [2,1,2,0]", explanation: "Length four uses st[2][1]=min(2,6,1,5)=1. Sorted unique coordinates are [-4,7,100]; duplicates both receive rank 2. A rank gap of one from 7 to 100 does not imply a coordinate gap of one." },
    code: `#include <bits/stdc++.h>
using namespace std;
struct SparseMin {
  int n; vector<int> lg; vector<vector<long long>> st;
  explicit SparseMin(const vector<long long>&a):n(a.size()),lg(n+1){
    for(int i=2;i<=n;i++)lg[i]=lg[i/2]+1;
    if(!n)return;st.assign(lg[n]+1,vector<long long>(n));st[0]=a;
    for(int k=1;k<=lg[n];k++)for(int i=0;i+(1<<k)<=n;i++)
      st[k][i]=min(st[k-1][i],st[k-1][i+(1<<(k-1))]);
  }
  long long query(int l,int r)const{
    if(l<0||l>=r||r>n)throw out_of_range("nonempty RMQ");
    int k=lg[r-l];return min(st[k][l],st[k][r-(1<<k)]);
  }
};
vector<long long> coordinates(vector<long long>a){
  sort(a.begin(),a.end());a.erase(unique(a.begin(),a.end()),a.end());return a;
}
int rankOf(const vector<long long>&xs,long long x){
  auto it=lower_bound(xs.begin(),xs.end(),x);
  if(it==xs.end()||*it!=x)throw invalid_argument("unseen coordinate");
  return it-xs.begin();
}`,
    time: "Sparse table build O(n log n), RMQ O(1); compression O(n log n), rank lookup O(log n).",
    space: "O(n log n) sparse storage, O(n) compressed coordinates; query O(1) auxiliary.",
    boundaries: "Empty RMQ is undefined and throws. Tables cannot be patched cheaply after updates. Overlapping block addition double-counts and is invalid for sums. Offline compression must include all future coordinates; geometric lengths need original xs[r]-xs[l].",
    alternatives: "Decision guide: immutable sums -> prefix sums, O(n) build/O(1) query; additive point changes -> Fenwick, O(log n) operations; arbitrary associative point changes -> segment tree; range changes -> lazy segment tree; immutable idempotent min/max/gcd -> sparse table. Dynamic unseen keys need a balanced search tree or dynamic segment tree.",
    practice: [
      { variation: "Static range sums", tip: "Use a disjoint prefix difference, not overlapping sparse blocks. This saves the log factor in preprocessing and memory.", snippet: "vector<long long> prefix(const vector<long long>&a){\n  vector<long long>p(a.size()+1);\n  for(size_t i=0;i<a.size();i++)p[i+1]=p[i]+a[i];\n  return p;\n}\nlong long sum(const vector<long long>&p,int l,int r){return p.at(r)-p.at(l);}" },
      { variation: "Count values in a closed coordinate interval", tip: "Use lower_bound for the first eligible value and upper_bound for the past-last. This also handles query endpoints absent from the compressed catalog.", snippet: "pair<int,int> rankRange(const vector<long long>&xs,long long lo,long long hi){\n  if(lo>hi)throw invalid_argument(\"reversed\");\n  return {lower_bound(xs.begin(),xs.end(),lo)-xs.begin(),\n          upper_bound(xs.begin(),xs.end(),hi)-xs.begin()};\n}" },
      { variation: "Measure covered geometric length", tip: "A compressed leaf describes the gap between consecutive original coordinates. Sum original differences rather than counting leaves.", snippet: "long long coveredLength(const vector<long long>&xs,const vector<bool>&covered){\n  long long ans=0;\n  for(size_t i=0;i+1<xs.size();i++)if(covered.at(i))ans+=xs[i+1]-xs[i];\n  return ans;\n}" }
    ],
    faq: [
      { question: "Why can two overlapping blocks answer minimum but not sum?", answer: "Minimum is idempotent, so repeated overlap leaves the result unchanged. Addition counts overlap twice; prefix subtraction or a disjoint decomposition is needed instead." },
      { question: "Can compression preserve online order with new coordinates?", answer: "A newly inserted coordinate can shift every later rank. Batch the complete coordinate universe first, or choose an ordered dynamic structure." }
    ],
  }
];
