import type { AuthoredAlgorithm } from "./lesson";

export const dpAlgorithms: AuthoredAlgorithm[] = [
  {
    id: "topic-dp-knapsack-subset", moduleId: "mod-dynamic-programming", title: "0/1 Knapsack, Subset Sum and Equal Partition",
    intuition: "A capacity table summarizes choices among an item prefix. Descending capacity prevents the current item from being reused.",
    contract: "knapsack maximizes total value using each item at most once within nonnegative capacity; weights are nonnegative, values signed, and choosing no items is permitted. subsetSum tests an exact nonnegative target with nonnegative integers. equalPartition asks whether all items split into equal sums. Capacities/targets must fit int and available memory; value sums fit long long.",
    prerequisites: "1D DP, include/exclude decisions and pseudopolynomial complexity.",
    cues: "Choose each resource zero or one times; total numerical capacity is small enough for a table.",
    invariant: "After item i, dp[c] is the best value achievable from that prefix at capacity c. Descending c reads dp[c-w] from the previous item layer, so taking the current item does not repeat it. Boolean reachability uses the same include/exclude recurrence. Equal partition is possible iff total is even and a subset reaches total/2.",
    walkthrough: { input: "weights [2,3,4], values [4,5,7], capacity 5; partition [1,5,11,5]", output: "knapsack 9; partition true", explanation: "After weight 2, capacities 2..5 hold 4. Weight 3 at c=5 combines prior dp[2]=4 with 5 to make 9; descending prevents reusing weight 3. Weight 4 yields 7 and cannot improve 9. Partition total 22 has reachable half 11 via one item or 1+5+5." },
    code: `#include <bits/stdc++.h>
using namespace std;
long long knapsack(const vector<int>&w,const vector<long long>&v,int cap){
  if(cap<0||w.size()!=v.size())throw invalid_argument("knapsack shape");
  vector<long long>dp(cap+1);
  for(int i=0;i<(int)w.size();i++){if(w[i]<0)throw invalid_argument("negative weight");
    for(int c=cap;c>=w[i];c--)dp[c]=max(dp[c],dp[c-w[i]]+v[i]);}
  return dp[cap];
}
bool subsetSum(const vector<int>&a,int target){
  if(target<0)throw invalid_argument("target");
  vector<bool>dp(target+1);dp[0]=true;
  for(int x:a){if(x<0)throw invalid_argument("negative item");for(int s=target;s>=x;s--)dp[s]=dp[s]||dp[s-x];}
  return dp[target];
}
bool equalPartition(const vector<int>&a){
  long long total=0;for(int x:a){if(x<0)throw invalid_argument("negative item");total+=x;}
  if(total%2)return false;if(total/2>INT_MAX)throw length_error("target too large");
  return subsetSum(a,(int)(total/2));
}`,
    time: "Knapsack O(n*C), subset/partition O(n*T), pseudopolynomial in numerical capacity/target.",
    space: "O(C) or O(T); O(1) recursion.",
    boundaries: "Zero-weight items are considered once per capacity; positive zero-weight value is added once, not infinitely. Empty subset reaches zero. Negative items need offset/sparse-state methods; this table rejects them. Ascending loops solve unbounded reuse instead.",
    alternatives: "Meet-in-the-middle handles n around 40 with huge targets. Value-indexed DP helps when total value is small. A bitset accelerates boolean nonnegative subset reachability but still scales with target.",
    practice: [
      { variation: "Unbounded knapsack", tip: "Ascend capacities to allow the current item to feed its own later states. Exclude zero weights to avoid an unbounded positive optimum.", snippet: "long long unbounded(const vector<int>&w,const vector<int>&v,int C){\n  vector<long long>d(C+1);\n  for(int i=0;i<(int)w.size();i++){if(w[i]<=0)throw invalid_argument(\"positive weights\");\n    for(int c=w[i];c<=C;c++)d[c]=max(d[c],d[c-w[i]]+v[i]);}\n  return d[C];\n}" },
      { variation: "Count subsets summing to target", tip: "Use counts rather than booleans. Descending order still enforces 0/1; a zero doubles every reachable count.", snippet: "long long countSubsets(const vector<int>&a,int T){\n  vector<long long>d(T+1);d[0]=1;\n  for(int x:a)for(int s=T;s>=x;s--)d[s]+=d[s-x];\n  return d[T];\n}" },
      { variation: "Minimum partition difference", tip: "Find the largest reachable sum not exceeding half. The complementary subset has total minus that sum.", snippet: "int minDifference(const vector<int>&a){\n  int total=accumulate(a.begin(),a.end(),0);vector<bool>d(total/2+1);d[0]=true;\n  for(int x:a)for(int s=total/2;s>=x;s--)d[s]=d[s]||d[s-x];\n  for(int s=total/2;s>=0;s--)if(d[s])return total-2*s;\n  throw logic_error(\"zero must be reachable\");\n}" }
    ],
    faq: [
      { question: "Why is O(n*target) not polynomial in input bit length?", answer: "A target encoded in b bits can be as large as 2^b. The table scales with that value, not with b, so its complexity is pseudopolynomial." },
      { question: "Why does descending order matter?", answer: "At capacity c it leaves c-weight on the previous item layer. Ascending order can read a state already updated by the same item and reuse it." }
    ],
  },
  {
    id: "topic-dp-grid-lcs-palindrome", moduleId: "mod-dynamic-programming", title: "Grid, LCS and Palindrome DP",
    intuition: "Table dimensions encode the missing information: a grid position, two string-prefix lengths, or two ends of an interval.",
    contract: "gridPaths counts right/down paths through a rectangular 0/1 obstacle grid (1 blocked), using long long counts that must fit. lcs returns longest common subsequence length of two byte strings. palindrome returns one longest palindromic substring, preferring the first leftmost occurrence encountered. Empty inputs are valid; ragged grids throw.",
    prerequisites: "DP base cases, row-major evaluation and substring versus subsequence.",
    cues: "Monotone movement, choices on two prefixes, or a palindrome depending on its inner interval.",
    invariant: "Grid dp[j] combines the previous row's count at j with the current row's left count, resetting obstacles to zero. LCS matching final characters extends dp[i-1][j-1]; a mismatch discards one suffix character and takes max. Palindrome[i][j] holds iff ends match and length<=2 or the inner interval is palindromic; increasing interval length guarantees that dependency is ready.",
    walkthrough: { input: "3x3 open grid with center blocked; LCS abcde/ace; palindrome babad", output: "2 paths; LCS 3; palindrome bab", explanation: "Grid rows evolve [1,1,1], [1,0,1], [1,1,2]. LCS successively matches a,c,e while skipping b,d. For babad, length-three intervals bab and aba both pass the inner test; updating only on longer length retains bab." },
    code: `#include <bits/stdc++.h>
using namespace std;
long long gridPaths(const vector<vector<int>>&a){
  if(a.empty())return 0;int n=a[0].size();for(auto&r:a)if((int)r.size()!=n)throw invalid_argument("ragged");
  if(!n)return 0;vector<long long>d(n);d[0]=1;
  for(auto&r:a)for(int j=0;j<n;j++){if(r[j])d[j]=0;else if(j)d[j]+=d[j-1];}
  return d[n-1];
}
int lcs(const string&a,const string&b){
  vector<vector<int>>d(a.size()+1,vector<int>(b.size()+1));
  for(int i=1;i<=(int)a.size();i++)for(int j=1;j<=(int)b.size();j++)
    d[i][j]=a[i-1]==b[j-1]?1+d[i-1][j-1]:max(d[i-1][j],d[i][j-1]);
  return d[a.size()][b.size()];
}
string palindrome(const string&s){
  int n=s.size(),start=0,best=0;vector<vector<bool>>p(n,vector<bool>(n));
  for(int len=1;len<=n;len++)for(int i=0;i+len<=n;i++){int j=i+len-1;
    p[i][j]=s[i]==s[j]&&(len<=2||p[i+1][j-1]);
    if(p[i][j]&&len>best){best=len;start=i;}}
  return s.substr(start,best);
}`,
    time: "Grid O(R*C); LCS O(m*n); palindrome O(n squared).",
    space: "Grid O(C); LCS O(m*n); palindrome O(n squared).",
    boundaries: "A blocked start/end gives zero paths. LCS is not a contiguous substring. Palindrome DP must initialize length-one/two intervals correctly. Byte-based strings do not preserve Unicode grapheme boundaries. Large grid counts require a modulus or big integers.",
    alternatives: "LCS length compresses to two rows; reconstructing a sequence needs parent decisions or Hirschberg. Palindrome center expansion uses O(1) space at O(n squared) time; Manacher gives linear time with a more complex invariant.",
    practice: [
      { variation: "Minimum-cost grid path", tip: "Replace addition of counts by min of predecessor costs plus the cell value. Use INF for nonexistent predecessors, not zero.", snippet: "long long minGrid(const vector<vector<int>>&a){\n  if(a.empty()||a[0].empty())throw invalid_argument(\"empty\");\n  int n=a[0].size();vector<long long>d(n,LLONG_MAX/4);d[0]=0;\n  for(auto&r:a)for(int j=0;j<n;j++)d[j]=min(d[j],j?d[j-1]:LLONG_MAX/4)+r[j];\n  return d.back();\n}" },
      { variation: "Minimum deletions to a palindrome", tip: "Longest palindromic subsequence length equals LCS with the reversed string. Delete everything outside that subsequence.", snippet: "int deletionsToPalindrome(const string&s){\n  string r(s.rbegin(),s.rend());\n  return (int)s.size()-lcs(s,r);\n}" },
      { variation: "Longest common substring", tip: "On mismatch reset to zero, instead of carrying max from neighbors. A substring cannot skip a character.", snippet: "int commonSubstring(const string&a,const string&b){\n  vector<int>d(b.size()+1);int best=0;\n  for(char c:a)for(int j=(int)b.size();j>=1;j--){d[j]=c==b[j-1]?d[j-1]+1:0;best=max(best,d[j]);}\n  return best;\n}" }
    ],
    faq: [
      { question: "Why can grid DP use one row but palindrome DP cannot use that same order?", answer: "Grid dependencies are above and left, aligned with row-major updates. Palindrome depends on an inner interval; its valid evaluation order is increasing length or decreasing left index." },
      { question: "Does LCS with the reversed string give a palindromic substring?", answer: "No. It gives the length of a palindromic subsequence. Contiguity requires an interval or center-expansion model." }
    ],
  },
  {
    id: "topic-dp-stock-state-machine", moduleId: "mod-dynamic-programming", title: "Stock DP as a State Machine",
    intuition: "Profit transitions must distinguish holding stock, free cash, and a just-sold cooldown state; otherwise impossible same-day transitions can leak into the recurrence.",
    contract: "cooldownProfit permits at most one held share, unlimited transactions, and one full day after a sale before buying. feeProfit charges a nonnegative fee on each sale with no cooldown. Prices and fees are nonnegative; intermediate profits fit long long. No short selling; finish without stock.",
    prerequisites: "1D DP and simultaneous versus in-place state transitions.",
    cues: "Trading constraints depend on prior action, holding state, cooldown or transaction budget.",
    invariant: "hold is best profit ending with one share, sold is best profit from selling today, rest is best profit with no share and no sale today. Buy only from previous rest; sold comes only from previous hold; rest may follow previous sold. Capturing old states before writes enforces the cooldown. Fee transitions similarly use previous cash/hold.",
    walkthrough: { input: "prices [1,2,3,0,2]", output: "cooldown profit 3", explanation: "After day0: hold=-1,sold=impossible,rest=0. Day1 sold=1. Day2 sold=2,rest=1. Day3 buy from old rest=1 at price0 so hold=1. Day4 sell for 3. The optimal schedule is buy0,sell1,cool2,buy3,sell4." },
    code: `#include <bits/stdc++.h>
using namespace std;
long long cooldownProfit(const vector<int>&p){
  const long long NEG=LLONG_MIN/4;long long hold=NEG,sold=NEG,rest=0;
  for(int x:p){if(x<0)throw invalid_argument("price");long long h=hold,s=sold,r=rest;
    hold=max(h,r-x);sold=h==NEG?NEG:h+x;rest=max(r,s);}
  return max(rest,sold);
}
long long feeProfit(const vector<int>&p,int fee){
  if(fee<0)throw invalid_argument("fee");const long long NEG=LLONG_MIN/4;long long cash=0,hold=NEG;
  for(int x:p){if(x<0)throw invalid_argument("price");long long oldCash=cash,oldHold=hold;
    cash=max(oldCash,oldHold==NEG?NEG:oldHold+x-fee);hold=max(oldHold,oldCash-x);}
  return cash;
}`,
    time: "O(n) per pricing sequence.",
    space: "O(1) state.",
    boundaries: "Empty or one-day input returns zero. Holding states must start impossible, not zero (which would grant a free share). Sold and rest cannot be collapsed during cooldown. Transaction limits introduce another state dimension.",
    alternatives: "One transaction uses a running minimum; unlimited no-fee/no-cooldown trading sums positive day-to-day differences. Those greedy formulas are invalid after adding cooldown or a fixed fee.",
    practice: [
      { variation: "At most k transactions", tip: "Track completed sales and holding separately. Copy the prior day so one update cannot reuse a newly changed state.", snippet: "long long limited(const vector<int>&p,int k){\n  vector<long long>cash(k+1,0),hold(k+1,LLONG_MIN/4);\n  for(int x:p){auto c=cash,h=hold;for(int t=0;t<=k;t++){hold[t]=max(h[t],c[t]-x);if(t)cash[t]=max(c[t],h[t-1]+x);}}\n  return *max_element(cash.begin(),cash.end());\n}" },
      { variation: "Unlimited unconstrained transactions", tip: "Every rising edge can be captured without blocking later trades. This special case needs no state table.", snippet: "long long unlimited(const vector<int>&p){\n  long long ans=0;\n  for(size_t i=1;i<p.size();i++)ans+=max(0,p[i]-p[i-1]);\n  return ans;\n}" },
      { variation: "One transaction", tip: "Maintain the cheapest earlier price; selling before buying must remain impossible.", snippet: "long long oneTrade(const vector<int>&p){\n  long long low=LLONG_MAX,best=0;\n  for(int x:p){low=min(low,(long long)x);best=max(best,x-low);}\n  return best;\n}" }
    ],
    faq: [
      { question: "Why store previous states in temporaries?", answer: "The recurrence is a day-to-day transition. Reading a state already updated today can permit a forbidden buy after a sale or otherwise mix logical time layers." },
      { question: "Why does the final answer exclude hold?", answer: "A holding state's profit includes an unpaid-for final liquidation. The contract requires no share at the end, so only cash states qualify." }
    ],
  },
  {
    id: "topic-backtracking-constraint-search", moduleId: "mod-greedy-backtracking", title: "Constraint Backtracking: Sums, Parentheses, Word Search and N-Queens",
    intuition: "A partial choice carries a feasibility invariant. Prune a branch as soon as no completion can satisfy the contract, then undo every mutation before exploring a sibling.",
    contract: "combinationSum returns unique sorted combinations of distinct positive candidates with unlimited reuse summing to a nonnegative target. parentheses generates n pairs. wordSearch uses orthogonal grid steps without reusing a cell and restores the board. queens counts placements of n queens (0<=n<=14), one per row with no column/diagonal attacks.",
    prerequisites: "DFS, recursion, state restoration, sorted candidates and diagonal indexing.",
    cues: "Enumerate all valid objects or search a small constrained state space where local violations can be detected early.",
    invariant: "Combination paths are nondecreasing; remaining sum shrinks and sorted candidates larger than it are pruned. Parenthesis prefixes always have 0<=close<=open<=n. Word-search visited flags equal precisely the current path's cells and are cleared even on success. N-Queens tracks occupied columns and r-c+n-1/r+c diagonals, making every extended row safe.",
    walkthrough: { input: "candidates [2,3,6,7], target7; n=2 parentheses; 4 queens", output: "[[2,2,3],[7]]; ['(())','()()']; 2 queens placements", explanation: "Choosing 2 twice leaves 3; choosing a later candidate forbids returning to 2, eliminating permutations of the same combination. Parentheses cannot start ')' because close<open is false. Queens prunes a column or diagonal conflict immediately rather than placing all four before checking." },
    code: `#include <bits/stdc++.h>
using namespace std;
vector<vector<int>> combinationSum(vector<int>a,int target){
  if(target<0)throw invalid_argument("target");sort(a.begin(),a.end());
  if(any_of(a.begin(),a.end(),[](int x){return x<=0;}))throw invalid_argument("positive candidates");
  a.erase(unique(a.begin(),a.end()),a.end());vector<vector<int>>out;vector<int>path;
  function<void(int,int)>dfs=[&](int start,int remain){if(!remain){out.push_back(path);return;}
    for(int i=start;i<(int)a.size()&&a[i]<=remain;i++){path.push_back(a[i]);dfs(i,remain-a[i]);path.pop_back();}};
  dfs(0,target);return out;
}
vector<string> parentheses(int n){
  if(n<0)throw invalid_argument("pairs");vector<string>out;string s;
  function<void(int,int)>dfs=[&](int open,int close){if(close==n){out.push_back(s);return;}
    if(open<n){s+='(';dfs(open+1,close);s.pop_back();}
    if(close<open){s+=')';dfs(open,close+1);s.pop_back();}};
  dfs(0,0);return out;
}
bool wordSearch(const vector<string>&a,const string&w){
  int m=a.size(),n=m?a[0].size():0;
  for(auto&r:a)if((int)r.size()!=n)throw invalid_argument("ragged board");
  if(w.empty())return true;
  vector<vector<bool>>used(m,vector<bool>(n));int dr[]={1,-1,0,0},dc[]={0,0,1,-1};
  function<bool(int,int,int)>dfs=[&](int r,int c,int k){
    if(r<0||r>=m||c<0||c>=n||used[r][c]||a[r][c]!=w[k])return false;
    used[r][c]=true;bool found=k+1==(int)w.size();
    for(int d=0;d<4&&!found;d++)found=dfs(r+dr[d],c+dc[d],k+1);
    used[r][c]=false;return found;
  };
  for(int r=0;r<m;r++)for(int c=0;c<n;c++)if(dfs(r,c,0))return true;return false;
}
long long queens(int n){
  if(n<0||n>14)throw invalid_argument("n in [0,14]");
  vector<bool>col(n),down(max(0,2*n-1)),up(max(0,2*n-1));
  function<long long(int)>dfs=[&](int r){if(r==n)return 1LL;long long count=0;
    for(int c=0;c<n;c++){int d=r-c+n-1,u=r+c;if(col[c]||down[d]||up[u])continue;
      col[c]=down[d]=up[u]=true;count+=dfs(r+1);col[c]=down[d]=up[u]=false;}return count;};
  return dfs(0);
}`,
    time: "Combination sum O(N^(T/minCandidate+1)) conservative search bound plus output copying; parentheses O(n*Catalan(n)); word search O(R*C*4^L); queens O(n*n!) conservative bound.",
    space: "Combination O(T/minCandidate) path/stack plus output; parentheses O(n) plus output; word search O(R*C+L); queens O(n) flags/stack.",
    boundaries: "Pruning is sound only when the rejected partial state cannot lead to any valid completion: positive candidates make a[i]>remain decisive; negative candidates would invalidate that argument. Zero candidate would prevent progress and is rejected. Target zero yields one empty combination; n=0 yields one empty parenthesis string and one empty queen placement. No cell reuse in word search; the input is never overwritten. Enumeration output can dominate memory.",
    alternatives: "Memoize count/feasibility states only when the future depends solely on the key; Word Search also depends on visited cells, not merely (r,c,k). Trie-guided DFS shares dictionary prefixes for many words. Bit masks accelerate queens flags but do not change exponential search nature.",
    practice: [
      { variation: "Combination Sum II: each input index once", tip: "Advance i+1 after selection and skip equal candidates at the same recursion depth. Equal values at different depths can still both be chosen.", snippet: "void once(const vector<int>&a,int start,int remain,vector<int>&p,vector<vector<int>>&out){\n  if(!remain){out.push_back(p);return;}\n  for(int i=start;i<(int)a.size()&&a[i]<=remain;i++){\n    if(i>start&&a[i]==a[i-1])continue;\n    p.push_back(a[i]);once(a,i+1,remain-a[i],p,out);p.pop_back();\n  }\n}" },
      { variation: "Prune impossible Word Search by frequencies", tip: "A board lacking enough of a required letter cannot contain the word. This O(R*C+L) precheck avoids any DFS.", snippet: "bool enough(const vector<string>&board,const string&w){\n  array<int,256>count{};for(auto&r:board)for(unsigned char c:r)++count[c];\n  for(unsigned char c:w)if(--count[c]<0)return false;\n  return true;\n}" },
      { variation: "Parentheses with a maximum nesting depth", tip: "Filter by maximum prefix balance, or carry current balance in DFS to prune before generating disallowed strings.", snippet: "bool withinDepth(const string&s,int limit){\n  int balance=0;\n  for(char c:s){balance+=c=='('?1:-1;if(balance>limit||balance<0)return false;}\n  return balance==0;\n}" }
    ],
    faq: [
      { question: "When is pruning sound?", answer: "Only when the rejected partial state cannot lead to any valid completion. Positive candidates make remaining<next sound; negative candidates would invalidate that monotonic argument." },
      { question: "Why must state be restored after a successful Word Search branch?", answer: "Callers may reuse the board or the same search buffers. Success should not leave a path marked, and early returns must preserve the same restoration contract as failed branches." }
    ],
  },
  {
    id: "topic-dp-interval-dag", moduleId: "mod-advanced-dp", title: "Interval DP and DAG Dynamic Programming",
    intuition: "An interval problem becomes independent after choosing its final split; a DAG problem becomes independent after all predecessors have been evaluated.",
    contract: "matrixChain takes positive dimensions d[0..m] for m matrices and returns minimum scalar multiplications (m=0 or1 ->0). dagLongest returns longest weighted source-to-vertex distances or throws if any directed cycle exists. Negative weights allowed; NEG marks unreachable. All arithmetic must fit long long.",
    prerequisites: "Core DP, topological sorting, interval bounds and matrix dimension compatibility.",
    cues: "Choose a parenthesization/split order, or optimize over paths in an acyclic dependency graph.",
    invariant: "cost[l][r] chooses the last multiplication split k, combining optimal [l,k] and [k+1,r] plus d[l]*d[k+1]*d[r+1]. Increasing interval length ensures both subproblems are solved. In a DAG, Kahn order processes every predecessor before a vertex; longest[v]=max(longest[u]+w) over reachable incoming edges is therefore final.",
    walkthrough: { input: "dimensions [10,30,5,60]; DAG 0->1:2,0->2:1,1->2:3", output: "matrix cost 4500; longest [0,2,5]", explanation: "((10x30)*(30x5)) costs 1500 then multiply 10x5 by 5x60 for 3000, total4500; the other association costs27000. DAG processes 0,1,2 and improves 2 from1 to5 through1." },
    code: `#include <bits/stdc++.h>
using namespace std;
long long matrixChain(const vector<int>&d){
  for(int x:d)if(x<=0)throw invalid_argument("positive dimensions");
  int n=max(0,(int)d.size()-1);if(n<2)return 0;
  vector<vector<long long>>dp(n,vector<long long>(n));
  for(int len=2;len<=n;len++)for(int l=0;l+len<=n;l++){int r=l+len-1;dp[l][r]=LLONG_MAX;
    for(int k=l;k<r;k++)dp[l][r]=min(dp[l][r],dp[l][k]+dp[k+1][r]+1LL*d[l]*d[k+1]*d[r+1]);}
  return dp[0][n-1];
}
const long long NEG=LLONG_MIN/4;
vector<long long> dagLongest(const vector<vector<pair<int,int>>>&g,int s){
  int n=g.size();if(s<0||s>=n)throw out_of_range("source");vector<int>degree(n);
  for(auto&r:g)for(auto [v,w]:r)++degree[v];queue<int>q;for(int u=0;u<n;u++)if(!degree[u])q.push(u);
  vector<long long>d(n,NEG);d[s]=0;int seen=0;
  while(!q.empty()){int u=q.front();q.pop();++seen;for(auto [v,w]:g[u]){
    if(d[u]!=NEG)d[v]=max(d[v],d[u]+w);if(!--degree[v])q.push(v);}}
  if(seen!=n)throw invalid_argument("cycle");return d;
}`,
    time: "Matrix-chain O(m cubed); DAG longest paths O(V+E).",
    space: "Interval O(m squared); DAG O(V) auxiliary plus input edges.",
    boundaries: "Matrix product order cannot be permuted. A greedy smallest immediate multiplication can be suboptimal. Longest paths are tractable here because the graph is acyclic; replacing topological order with a max-heap does not solve general cyclic longest paths.",
    alternatives: "Interval recurrences also model palindrome cuts and burst balloons, but choose first/last decisions carefully to obtain independent subproblems. DAG shortest paths replace max/NEG with min/INF and still permit negative edges.",
    practice: [
      { variation: "Record the optimal interval split", tip: "Save k whenever it improves the cell. Reconstruct the parenthesization recursively, rather than storing strings in each transition.", snippet: "string parenthesize(int l,int r,const vector<vector<int>>&split){\n  if(l==r)return \"A\"+to_string(l);\n  int k=split[l][r];\n  return \"(\"+parenthesize(l,k,split)+parenthesize(k+1,r,split)+\")\";\n}" },
      { variation: "DAG shortest paths via sign reversal", tip: "Negate bounded weights, run the longest-path recurrence, and negate finite results. Preserve unreachable sentinels.", snippet: "vector<long long> dagShortest(vector<vector<pair<int,int>>>g,int s){\n  for(auto&r:g)for(auto&edge:r){if(edge.second==INT_MIN)throw overflow_error(\"negate\");edge.second=-edge.second;}\n  auto d=dagLongest(g,s);for(auto&x:d)if(x!=NEG)x=-x;\n  return d;\n}" },
      { variation: "Count paths in a supplied topological order", tip: "Set ways[source]=1, propagate once per edge, and use a modulus if the exact count can overflow.", snippet: "long long countPaths(const vector<vector<int>>&g,const vector<int>&order,int s,int t){\n  const long long M=1000000007;vector<long long>w(g.size());w[s]=1;\n  for(int u:order)for(int v:g[u])w[v]=(w[v]+w[u])%M;\n  return w[t];\n}" }
    ],
    faq: [
      { question: "Why choose the last multiplication rather than the first?", answer: "The last split partitions the chain into two independent contiguous subchains. A first operation changes neighboring dimensions and makes the remaining state less direct." },
      { question: "Why reject a cycle outside the source component?", answer: "This API promises a DAG input, not merely an acyclic reachable subgraph. Checking all vertices validates that stated contract." }
    ],
  },
  {
    id: "topic-dp-bitmask-mitm", moduleId: "mod-advanced-dp", title: "Subset-State DP and Meet-in-the-Middle",
    intuition: "A small set of unfinished obligations fits into a bitmask. When a numeric target is huge but item count is moderate, split enumeration into two exponential halves.",
    contract: "assignment minimizes square n-by-n worker/job costs for 0<=n<=20, using every job once. bestSubset finds the largest subset sum <=cap for at most 40 nonnegative long long items and nonnegative cap; intermediate sums must fit long long. Empty choices are permitted.",
    prerequisites: "Bit operations, subset enumeration, binary search and core knapsack.",
    cues: "n<=20 with set-dependent decisions, or n around 40 and a target too large for pseudopolynomial DP.",
    invariant: "For assignment, popcount(mask) is the next worker; dp[mask] is the minimum cost of assigning exactly those jobs to previous workers. Each transition adds one missing bit, so numeric mask order is topological. Meet-in-the-middle enumerates every left/right subset once; for each left sum, upper_bound chooses the largest right sum not exceeding cap-left.",
    walkthrough: { input: "cost [[9,2],[3,8]]; items [3,5,8,10], cap14", output: "assignment 5; best subset 13", explanation: "Assign worker0->job1 for2, worker1->job0 for3. Split items [3,5] and [8,10], sums {0,3,5,8} and {0,8,10,18}. Left3 pairs with right10 for13; no pairing reaches14." },
    code: `#include <bits/stdc++.h>
using namespace std;
long long assignment(const vector<vector<int>>&cost){
  int n=cost.size();if(n>20)throw invalid_argument("n<=20");
  for(auto&r:cost)if((int)r.size()!=n)throw invalid_argument("square");
  int all=1<<n;vector<long long>d(all,LLONG_MAX/4);d[0]=0;
  for(int mask=0;mask<all;mask++){int worker=__builtin_popcount((unsigned)mask);if(worker==n)continue;
    for(int j=0;j<n;j++)if(!(mask>>j&1))d[mask|1<<j]=min(d[mask|1<<j],d[mask]+cost[worker][j]);}
  return d.back();
}
vector<long long> sums(const vector<long long>&a,int l,int r){
  vector<long long>out{0};for(int i=l;i<r;i++){size_t n=out.size();for(size_t j=0;j<n;j++)out.push_back(out[j]+a[i]);}return out;
}
long long bestSubset(const vector<long long>&a,long long cap){
  if(a.size()>40||cap<0||any_of(a.begin(),a.end(),[](long long x){return x<0;}))throw invalid_argument("subset bounds");
  int m=a.size()/2;auto left=sums(a,0,m),right=sums(a,m,a.size());sort(right.begin(),right.end());long long best=0;
  for(long long x:left)if(x<=cap){auto it=upper_bound(right.begin(),right.end(),cap-x);if(it!=right.begin())best=max(best,x+*prev(it));}
  return best;
}`,
    time: "Assignment O(n*2^n); meet-in-the-middle O(n*2^(n/2)) including sorting/binary searches.",
    space: "Assignment O(2^n); meet-in-the-middle O(2^(n/2)).",
    boundaries: "Do not shift signed 1 beyond representable width; the n<=20 gate keeps masks safe. Signed assignment costs are fine. MITM duplicates sums may be deduplicated for optimization but must retain multiplicity for counting. Negative values require rethinking cap-based pruning.",
    alternatives: "Hungarian assignment is polynomial and preferable for large dense assignment; this lesson teaches subset DP for extensions with subset-dependent constraints. Knapsack tables win when cap is small. TSP needs both mask and last vertex, not mask alone.",
    practice: [
      { variation: "Count subsets reaching a target", tip: "Use equal_range to count matching right sums for every left sum. Do not deduplicate when multiplicities matter.", snippet: "long long countTarget(const vector<long long>&a,long long target){\n  int m=a.size()/2;auto l=sums(a,0,m),r=sums(a,m,a.size());sort(r.begin(),r.end());long long ans=0;\n  for(long long x:l){auto [b,e]=equal_range(r.begin(),r.end(),target-x);ans+=e-b;}\n  return ans;\n}" },
      { variation: "Enumerate all submasks", tip: "Use (sub-1)&mask and explicitly stop at zero to avoid an infinite loop. Summed across all masks this is O(3^n).", snippet: "vector<int> submasks(int mask){\n  vector<int>out;\n  for(int sub=mask;;sub=(sub-1)&mask){out.push_back(sub);if(sub==0)break;}\n  return out;\n}" },
      { variation: "Subset cardinality constraint", tip: "Group half sums by selected count, then combine only groups whose counts add to k.", snippet: "map<int,vector<long long>> byCount(const vector<int>&a){\n  map<int,vector<long long>>out;\n  for(unsigned m=0;m<(1u<<a.size());m++){long long s=0;for(int i=0;i<(int)a.size();i++)if(m>>i&1)s+=a[i];out[__builtin_popcount(m)].push_back(s);}\n  return out;\n}" }
    ],
    faq: [
      { question: "Why is mask alone enough for assignment but not TSP?", answer: "Assignment's next worker is determined by the number of used jobs. A tour's next travel cost depends on its current endpoint, which the set alone does not determine." },
      { question: "Does splitting eliminate exponential complexity?", answer: "No. It changes 2^n enumeration to roughly 2^(n/2), trading memory and sorting for a useful but still bounded extension of feasible n." }
    ],
  }
];
