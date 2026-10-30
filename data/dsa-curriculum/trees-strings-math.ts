import type { AuthoredAlgorithm } from "./lesson";

export const treeStringMathAlgorithms: AuthoredAlgorithm[] = [
  {
    id: "topic-tree-lifting-dp-morris", moduleId: "mod-advanced-trees", title: "Binary Lifting, Tree DP and Morris Traversal",
    intuition: "Repeated ancestors can be cached in powers of two; subtree choices combine bottom-up; temporary predecessor threads can replace an inorder traversal stack.",
    contract: "LCA preprocesses a connected simple undirected tree rooted at 0, with n>=1 and valid indices. kth returns -1 above the root; lca/distance answer repeated pairs. independentSet maximizes selected node weights with no adjacent selections, empty set allowed, on the same rooted-tree contract. morris traverses a pointer binary tree and restores every temporary link.",
    prerequisites: "DFS/inorder traversal, basic LCA, core DP and binary bit decomposition.",
    cues: "Many ancestor queries, choices constrained by parent-child edges, or inorder traversal under constant auxiliary memory.",
    invariant: "up[k][v] is the 2^k ancestor obtained by composing two half jumps. Equalize depths, then lift both nodes from large powers down while their ancestors differ; their next parent is the LCA. Tree independent-set returns (skip,take), where take includes only child skips and skip chooses either child state. Morris creates a thread only from the rightmost node of the left subtree to its ancestor; encountering that same thread removes it and visits the ancestor exactly once.",
    walkthrough: { input: "tree edges 0-1,0-2,1-3,1-4; weights [1,2,3,4,5]", output: "lca(3,4)=1; distance(3,2)=3; independent set=12", explanation: "Lift 3 and 4 one step to1; distance uses depth3+depth2-2*depth0=2+1=3. Independent set skips0 and1, selecting2,3,4 for3+4+5=12. For Morris on 2(left1,right3), thread1->2 visits1, then removes the thread before visiting2 and3." },
    code: `#include <bits/stdc++.h>
using namespace std;
struct LCA{
  int n,LOG;vector<int>depth,parent,order;vector<vector<int>>up;
  explicit LCA(const vector<vector<int>>&g):n(g.size()),LOG(1),depth(n),parent(n,-1){
    if(!n)throw invalid_argument("nonempty tree");long long edges=0;for(auto&r:g)edges+=r.size();
    if(edges!=2LL*(n-1))throw invalid_argument("tree edge count");
    while((1LL<<LOG)<=n)++LOG;up.assign(LOG,vector<int>(n));parent[0]=0;order={0};
    for(size_t i=0;i<order.size();i++){int u=order[i];for(int v:g[u]){
      if(v<0||v>=n)throw out_of_range("vertex");if(v==parent[u])continue;
      if(parent[v]!=-1)throw invalid_argument("cycle");parent[v]=u;depth[v]=depth[u]+1;order.push_back(v);}}
    if((int)order.size()!=n)throw invalid_argument("disconnected");up[0]=parent;
    for(int k=1;k<LOG;k++)for(int v=0;v<n;v++)up[k][v]=up[k-1][up[k-1][v]];
  }
  void valid(int v)const{if(v<0||v>=n)throw out_of_range("vertex");}
  int kth(int v,int k)const{valid(v);if(k<0)throw invalid_argument("k");if(k>depth[v])return -1;for(int b=0;b<LOG;b++)if(k>>b&1)v=up[b][v];return v;}
  int lca(int a,int b)const{valid(a);valid(b);if(depth[a]<depth[b])swap(a,b);a=kth(a,depth[a]-depth[b]);if(a==b)return a;
    for(int k=LOG-1;k>=0;k--)if(up[k][a]!=up[k][b]){a=up[k][a];b=up[k][b];}return parent[a];}
  int distance(int a,int b)const{return depth.at(a)+depth.at(b)-2*depth[lca(a,b)];}
};
long long independentSet(const vector<vector<int>>&g,const vector<long long>&w){
  LCA tree(g);if(w.size()!=g.size())throw invalid_argument("weights");
  vector<long long>skip(g.size()),take=w;
  for(auto it=tree.order.rbegin();it!=tree.order.rend();it++){int u=*it;if(u){int p=tree.parent[u];skip[p]+=max(skip[u],take[u]);take[p]+=skip[u];}}
  return max(skip[0],take[0]);
}
struct Node{int val;Node*left=nullptr,*right=nullptr;explicit Node(int x):val(x){}};
vector<int> morris(Node*root){
  auto walk=[&](auto visit){for(Node*u=root;u;){
    if(!u->left){visit(u->val);u=u->right;}
    else {Node*p=u->left;while(p->right&&p->right!=u)p=p->right;
      if(!p->right){p->right=u;u=u->left;}else{p->right=nullptr;visit(u->val);u=u->right;}}
  }};
  size_t count=0;walk([&](int){++count;});
  vector<int>out;out.reserve(count);
  walk([&](int value){out.push_back(value);});return out;
}`,
    time: "LCA build O(n log n), kth/lca/distance O(log n); independent-set DP O(n) after tree preparation (this wrapper O(n log n)); Morris O(n).",
    space: "Lifting O(n log n); DP O(n) beyond lifting; Morris O(1) auxiliary excluding O(n) output.",
    boundaries: "Morris temporarily mutates pointers: no early exit or concurrent readers. The first allocation-free traversal counts nodes and restores links before reserve; the second writes ints into preallocated output, so allocation failure cannot strand a thread. Root jumps use a self-parent internally but kth explicitly rejects jumps above root. Tree inputs must have symmetric adjacency.",
    alternatives: "Euler tour plus RMQ gives another LCA design. One-off LCA needs no lifting table. Recursive tree DP costs O(h) stack; this version uses reverse traversal order. Stack-based inorder avoids temporary pointer mutations and is preferable unless memory is constrained.",
    practice: [
      { variation: "Ancestor of three vertices", tip: "LCA is associative over a rooted tree; combine two pair queries.", snippet: "int lca3(const LCA&t,int a,int b,int c){\n  return t.lca(t.lca(a,b),c);\n}" },
      { variation: "Is a vertex on a path?", tip: "Distances in a tree are unique. x lies on a-b exactly when its two subdistances sum to the full distance.", snippet: "bool onPath(const LCA&t,int a,int b,int x){\n  return t.distance(a,x)+t.distance(x,b)==t.distance(a,b);\n}" },
      { variation: "Count independent sets instead of maximizing weight", tip: "Multiply independent child choices and add take/skip possibilities. Use a modulus to bound counts.", snippet: "long long countSets(const LCA&t){\n  const long long M=1000000007;vector<long long>s(t.n,1),k(t.n,1);\n  for(auto it=t.order.rbegin();it!=t.order.rend();it++)if(*it){int u=*it,p=t.parent[u];s[p]=s[p]*((s[u]+k[u])%M)%M;k[p]=k[p]*s[u]%M;}\n  return (s[0]+k[0])%M;\n}" }
    ],
    faq: [
      { question: "Why does Morris stay linear despite predecessor searches?", answer: "Each relevant right edge is traversed a bounded number of times while creating and removing its thread. The total work across all searches is linear, not n searches of size n." },
      { question: "Why not greedily choose positive tree weights?", answer: "Adjacent positive vertices conflict. A positive parent can block several more valuable children; take/skip states preserve both possibilities until their parent combines them." }
    ],
  },
  {
    id: "topic-string-linear-matching", moduleId: "mod-tries-strings", title: "KMP, Z-Function and Verified Rolling Hash",
    intuition: "KMP reuses border lengths after a mismatch; Z reuses a known prefix-match window; rolling hash cheaply proposes equal substrings but must not be mistaken for a proof.",
    contract: "All matching routines return zero-based start indices including overlaps. Empty pattern matches every boundary [0,text.size()]. KMP and Z are deterministic linear matchers. rabinKarp uses a modular rolling hash then verifies candidate substrings byte-for-byte, guaranteeing correct output with possibly quadratic verification cost.",
    prerequisites: "Strings, prefix/suffix borders, modular arithmetic and interval invariants.",
    cues: "Repeated pattern matching, periodicity/borders, prefix matches from every position, or fast substring-equality candidates.",
    invariant: "KMP's j is the longest pattern prefix matching the processed text suffix; a mismatch follows pi[j-1], which enumerates the only remaining borders. Z maintains a rightmost [l,r) matching the prefix, reusing min(r-i,z[i-l]) before explicit extension. Rolling hash removes the outgoing byte's highest power, shifts the remaining polynomial, and adds the incoming byte; verification eliminates collisions.",
    walkthrough: { input: "text=ababa, pattern=aba", output: "[0,2]", explanation: "Pattern pi=[0,0,1]. After a full match at0, KMP falls back to j=1 rather than0, retaining the final a and allowing the overlapping match at2. Z on integer-encoded pattern+separator+text reports prefix length>=3 at the same offsets. Equal hashes are confirmed by text.compare." },
    code: `#include <bits/stdc++.h>
using namespace std;
vector<int> prefixFunction(const string&s){
  vector<int>pi(s.size());for(int i=1;i<(int)s.size();i++){int j=pi[i-1];while(j&&s[i]!=s[j])j=pi[j-1];if(s[i]==s[j])++j;pi[i]=j;}return pi;
}
vector<int> emptyMatches(int n){vector<int>out(n+1);iota(out.begin(),out.end(),0);return out;}
vector<int> kmp(const string&t,const string&p){
  if(p.empty())return emptyMatches(t.size());auto pi=prefixFunction(p);vector<int>out;int j=0;
  for(int i=0;i<(int)t.size();i++){while(j&&t[i]!=p[j])j=pi[j-1];if(t[i]==p[j])++j;
    if(j==(int)p.size()){out.push_back(i-j+1);j=pi[j-1];}}
  return out;
}
vector<int> zFunction(const vector<int>&s){
  int n=s.size(),l=0,r=0;vector<int>z(n);
  for(int i=1;i<n;i++){if(i<r)z[i]=min(r-i,z[i-l]);while(i+z[i]<n&&s[z[i]]==s[i+z[i]])++z[i];if(i+z[i]>r){l=i;r=i+z[i];}}return z;
}
vector<int> zMatch(const string&t,const string&p){
  if(p.empty())return emptyMatches(t.size());vector<int>s;for(unsigned char c:p)s.push_back(c);s.push_back(256);for(unsigned char c:t)s.push_back(c);
  auto z=zFunction(s);vector<int>out;for(int i=p.size()+1;i<(int)s.size();i++)if(z[i]>=(int)p.size())out.push_back(i-p.size()-1);return out;
}
vector<int> rabinKarp(const string&t,const string&p){
  if(p.empty())return emptyMatches(t.size());if(p.size()>t.size())return {};
  const long long M=1000000007,B=257;int m=p.size();long long power=1,hp=0,ht=0;
  for(int i=0;i<m;i++){hp=(hp*B+(unsigned char)p[i]+1)%M;ht=(ht*B+(unsigned char)t[i]+1)%M;if(i+1<m)power=power*B%M;}
  vector<int>out;
  for(int i=0;i+m<=(int)t.size();i++){
    if(ht==hp&&t.compare(i,m,p)==0)out.push_back(i);
    if(i+m<(int)t.size()){ht=(ht-((unsigned char)t[i]+1)*power%M+M)%M;ht=(ht*B+(unsigned char)t[i+m]+1)%M;}
  }return out;
}`,
    time: "KMP and Z O(n+m); verified Rabin-Karp O(n+m+matchesOrCollisions*m), worst O(n*m).",
    space: "KMP O(m) plus output; Z O(n+m); rolling hash O(1) auxiliary plus output.",
    boundaries: "The Z separator 256 lies outside byte range, so no collision with arbitrary input bytes. Overlaps require KMP fallback after full matches. A fixed modular hash is not collision-free; double hashing only reduces probability. String indices assume lengths fit int.",
    alternatives: "KMP/Z provide deterministic worst-case linear matching. Rolling hashes are useful for many substring comparisons with a documented probabilistic contract or explicit verification. Suffix arrays support broader static repeated-substring queries.",
    practice: [
      { variation: "Find the smallest exact period", tip: "The longest proper border suggests period n-pi[n-1]; it tiles the string only when it divides n.", snippet: "int period(const string&s){\n  if(s.empty())return 0;auto pi=prefixFunction(s);int k=s.size()-pi.back();\n  return s.size()%k==0?k:s.size();\n}" },
      { variation: "All proper border lengths", tip: "Follow prefix links from the final border rather than checking each suffix independently.", snippet: "vector<int> borders(const string&s){\n  auto pi=prefixFunction(s);vector<int>out;\n  for(int k=s.empty()?0:pi.back();k;k=pi[k-1])out.push_back(k);\n  reverse(out.begin(),out.end());return out;\n}" },
      { variation: "String rotation membership", tip: "For equal-length strings, any rotation appears in the doubled original. Use a linear matcher to avoid a naive quadratic search.", snippet: "bool rotation(const string&a,const string&b){\n  return a.size()==b.size()&&!kmp(a+a,b).empty();\n}" }
    ],
    faq: [
      { question: "Why does KMP not backtrack the text index?", answer: "Failure links discard impossible pattern alignments while retaining every viable border of the already-read text suffix. The text's progress never needs to be undone." },
      { question: "Why can verified hashing be quadratic on identical characters?", answer: "Every window can be a genuine match, and byte verification examines m characters for each. Correctness is deterministic, but the verification cost is not linear." }
    ],
  },
  {
    id: "topic-bits-number-theory", moduleId: "mod-bits-math", title: "XOR, Bit Masks, GCD, Sieve and Modular Arithmetic",
    intuition: "XOR cancels paired bits, masks encode finite sets, Euclid preserves common divisors under remainder, and modular arithmetic keeps bounded residues without preserving ordinary division.",
    contract: "singleNumber assumes exactly one unpaired integer and all others paired. gcd64 accepts nonnegative long long. sieve lists primes <=n with n>=0. modPow accepts nonnegative exponent and positive int modulus, normalizes signed bases, and returns a residue. Mask examples use unsigned values and shifts strictly below bit width.",
    prerequisites: "Binary representation, division/remainder and loop invariants.",
    cues: "Parity/cancellation, small-set state encoding, divisibility, many primality queries or enormous exponentiation.",
    invariant: "XOR of equal values is zero and XOR is associative, leaving the unique unpaired value. gcd(a,b)=gcd(b,a%b) because common divisors divide their difference. Sieve marks every composite via a prime factor <=sqrt(n). Binary exponentiation preserves result*base^remaining modulo M, consuming one exponent bit per step.",
    walkthrough: { input: "[4,1,2,1,2]; gcd(48,18); primes<=10; 3^13 mod17", output: "4;6;[2,3,5,7];12", explanation: "Paired 1s and2s cancel. Euclid: (48,18)->(18,12)->(12,6)->(6,0). Sieve crosses multiples from p*p because smaller multiples were marked. Exponent13=1101b multiplies powers3,13,16 modulo17 to12." },
    code: `#include <bits/stdc++.h>
using namespace std;
int singleNumber(const vector<int>&a){int x=0;for(int v:a)x^=v;return x;}
long long gcd64(long long a,long long b){
  if(a<0||b<0)throw invalid_argument("nonnegative gcd");
  while(b){long long r=a%b;a=b;b=r;}return a;
}
vector<int> sieve(int n){
  if(n<0)throw invalid_argument("sieve limit");vector<bool>prime(n+1,true);
  if(n>=0)prime[0]=false;if(n>=1)prime[1]=false;
  for(int p=2;p<=n/p;p++)if(prime[p])for(long long j=1LL*p*p;j<=n;j+=p)prime[j]=false;
  vector<int>out;for(int i=2;i<=n;i++)if(prime[i])out.push_back(i);return out;
}
long long modPow(long long base,unsigned long long exp,int mod){
  if(mod<=0)throw invalid_argument("positive modulus");base=(base%mod+mod)%mod;long long result=1%mod;
  while(exp){if(exp&1)result=result*base%mod;base=base*base%mod;exp>>=1;}return result;
}
vector<unsigned> setBits(unsigned mask){
  vector<unsigned>bits;while(mask){unsigned bit=mask&(~mask+1u);bits.push_back(bit);mask&=mask-1;}return bits;
}`,
    time: "XOR O(n); GCD O(log min(a,b)) for positive inputs; sieve O(n log log n); modPow O(log exponent); setBits O(popcount).",
    space: "XOR/GCD/modPow O(1); sieve O(n) plus primes; setBits O(popcount) output.",
    boundaries: "gcd(0,0)=0 by convention. XOR does not validate the paired-input promise. __builtin_ctz(0) is undefined, so test before calling it. Signed shifts/1<<31 are unsafe; prefer unsigned masks. Modular division requires a multiplicative inverse and gcd(denominator,mod)=1. Positive int modulus keeps multiplication within signed 64-bit bounds.",
    alternatives: "A frequency map handles arbitrary repetition counts. Trial division is simpler for one small primality query; sieve is best for many bounded queries. For 64-bit moduli, use wider multiplication or overflow-safe modular multiplication rather than this int-modulus implementation.",
    practice: [
      { variation: "Two unpaired numbers", tip: "XOR all values, isolate a differing bit, and partition by that bit. Each pair stays in one group while the two answers separate.", snippet: "pair<int,int> twoSingles(const vector<int>&a){\n  unsigned x=0;for(int v:a)x^=(unsigned)v;if(!x)throw invalid_argument(\"distinct singles required\");\n  unsigned bit=x&(~x+1u);int p=0,q=0;for(int v:a)if((unsigned)v&bit)p^=v;else q^=v;\n  return {p,q};\n}" },
      { variation: "Least common multiple", tip: "Divide by gcd before multiplication and check overflow. Handle zero separately.", snippet: "long long lcmSafe(long long a,long long b){\n  if(a<0||b<0)throw invalid_argument(\"nonnegative\");if(!a||!b)return 0;\n  long long q=a/gcd64(a,b);if(q>LLONG_MAX/b)throw overflow_error(\"lcm\");\n  return q*b;\n}" },
      { variation: "Prime-modulus inverse", tip: "Fermat gives a^(p-2) only for prime p and a not divisible by p; composite moduli require extended Euclid.", snippet: "long long inversePrime(long long a,int p){\n  if(p<2||a%p==0)throw invalid_argument(\"prime modulus and nonzero residue required\");\n  return modPow(a,p-2,p);\n}" }
    ],
    faq: [
      { question: "Why start sieve marking at p squared?", answer: "Every smaller multiple p*k with k<p already has a smaller prime factor and was marked earlier. Starting at p squared avoids redundant work." },
      { question: "Can modular division use ordinary integer division?", answer: "No. Residue multiplication is invertible only for numbers coprime to the modulus. For example 2 has no inverse modulo 4." }
    ],
  }
];
