import type { AuthoredAlgorithm } from "./lesson";

export const sortingMatrixAlgorithms: AuthoredAlgorithm[] = [
  {
    id: "topic-sort-partition-stability", moduleId: "mod-binary-search-intervals", title: "Merge Sort, Quicksort, Quickselect and Bounded-Key Sorting",
    intuition: "Merge sort orders by combining sorted halves; quicksort orders by partitioning around a pivot; quickselect follows only the partition containing the requested rank.",
    contract: "Sort vector<int> ascending. quickselect takes zero-based rank k and mutates input. Counting sort requires keys in [0,maxKey] with maxKey<=10^6; bucket sort here has the concrete contract of bounded integer keys grouped into equal-width buckets, sorting inside each bucket. Comparator examples require strict weak ordering.",
    prerequisites: "Recursion, array intervals, stable merging and random pivot selection.",
    cues: "Need deterministic O(n log n) sorting, in-place average-case partitioning, one order statistic, or small key universe.",
    invariant: "Merge maintains the smallest unconsumed element from each sorted half and chooses the left on ties, preserving stability. Three-way partition maintains [l,lt)<pivot, [lt,i)==pivot, [i,gt) unknown, [gt,r)>pivot. Quicksort recurses only outside the equal band; quickselect discards the side that cannot contain k. Counting reconstructs each value's multiplicity; ordered bucket ranges ensure concatenated sorted buckets are globally ordered.",
    walkthrough: { input: "[3,1,3,2], quickselect k=2, pivot=3", output: "sorted [1,2,3,3]; kth=3", explanation: "Three-way partition moves 1 and 2 below the pivot, leaving equal band [2,4). Rank 2 is already in that band. Merge sort combines [1,3] and [2,3], emitting 1,2,left 3,right 3, preserving tied records if carrying payloads." },
    code: `#include <bits/stdc++.h>
using namespace std;
void mergeSort(vector<int>&a){
  vector<int>tmp(a.size());
  function<void(int,int)>go=[&](int l,int r){
    if(r-l<2)return;int m=(l+r)/2;go(l,m);go(m,r);int i=l,j=m,k=l;
    while(i<m||j<r)tmp[k++]=(j==r||(i<m&&a[i]<=a[j]))?a[i++]:a[j++];
    copy(tmp.begin()+l,tmp.begin()+r,a.begin()+l);
  };go(0,a.size());
}
pair<int,int> partition3(vector<int>&a,int l,int r,mt19937&rng){
  int pivot=a[uniform_int_distribution<int>(l,r-1)(rng)],lt=l,i=l,gt=r;
  while(i<gt){if(a[i]<pivot)swap(a[lt++],a[i++]);else if(a[i]>pivot)swap(a[i],a[--gt]);else ++i;}
  return {lt,gt};
}
void quickSort(vector<int>&a,mt19937&rng){
  function<void(int,int)>go=[&](int l,int r){
    while(r-l>1){auto [lt,gt]=partition3(a,l,r,rng);
      if(lt-l<r-gt){go(l,lt);l=gt;}else {go(gt,r);r=lt;}}
  };go(0,a.size());
}
int quickselect(vector<int>&a,int k,mt19937&rng){
  if(k<0||k>=(int)a.size())throw out_of_range("rank");
  int l=0,r=a.size();while(true){auto [lt,gt]=partition3(a,l,r,rng);if(k<lt)r=lt;else if(k>=gt)l=gt;else return a[k];}
}
vector<int> countingSort(const vector<int>&a,int maxKey){
  if(maxKey<0||maxKey>1000000)throw invalid_argument("key universe");
  vector<int>cnt(maxKey+1),out;for(int x:a){if(x<0||x>maxKey)throw out_of_range("key");++cnt[x];}
  out.reserve(a.size());for(int x=0;x<=maxKey;x++)while(cnt[x]--)out.push_back(x);return out;
}
vector<int> bucketSort(const vector<int>&a,int maxKey,int buckets){
  if(maxKey<0||buckets<1||buckets>1000000)throw invalid_argument("bucket bounds");
  vector<vector<int>>b(buckets);for(int x:a){if(x<0||x>maxKey)throw out_of_range("key");int k=(long long)x*buckets/(maxKey+1LL);b[k].push_back(x);}
  vector<int>out;out.reserve(a.size());for(auto&v:b){sort(v.begin(),v.end());out.insert(out.end(),v.begin(),v.end());}return out;
}`,
    time: "Merge sort O(n log n); randomized quicksort expected O(n log n), worst O(n squared); quickselect expected O(n), worst O(n squared); counting O(n+K); bucket O(n+B+sum ni log ni), worst O(n log n+B) with std::sort inside.",
    space: "Merge O(n)+O(log n) stack; quicksort O(log n) stack by recursing into smaller side; quickselect O(1); counting O(K+n) output; bucket O(n+B).",
    boundaries: "Empty sorting input is valid; selection on empty is not. Three-way partition prevents duplicate-heavy degeneration. No <= comparator: cmp(x,x) must be false. Do not compare by subtraction because overflow can reverse order. Raw counting of ints has no payload stability; stable record counting needs prefix positions and backward emission.",
    alternatives: "std::sort uses introspective safeguards for O(n log n) worst-case comparisons; std::stable_sort preserves ties with extra memory. nth_element provides selection without fully sorting. Bucket linear-time claims require distribution and bucket-internal assumptions, which this bounded implementation does not make.",
    practice: [
      { variation: "Stable sorting of records", tip: "Equal keys must retain their input sequence. Use stable_sort with a strict key comparator, not <=.", snippet: "struct Record{int key,id;};\nvoid stableRecords(vector<Record>&a){\n  stable_sort(a.begin(),a.end(),[](const Record&x,const Record&y){return x.key<y.key;});\n}" },
      { variation: "Kth largest instead of kth smallest", tip: "Convert a one-based largest rank to zero-based ascending rank n-k. Reject k=0 and k>n.", snippet: "int kthLargest(vector<int>a,int k){\n  if(k<1||k>(int)a.size())throw out_of_range(\"k\");\n  mt19937 rng(123);return quickselect(a,(int)a.size()-k,rng);\n}" },
      { variation: "Stable counting with payloads", tip: "Cumulative counts give past-last positions. Emitting backward preserves original order among ties.", snippet: "vector<pair<int,int>> stableCount(const vector<pair<int,int>>&a,int K){\n  vector<int>c(K+1);for(auto x:a)++c.at(x.first);\n  partial_sum(c.begin(),c.end(),c.begin());vector<pair<int,int>>out(a.size());\n  for(int i=(int)a.size()-1;i>=0;i--)out[--c[a[i].first]]=a[i];\n  return out;\n}" }
    ],
    faq: [
      { question: "Why does randomization not remove the quadratic worst case?", answer: "It makes repeatedly poor pivots unlikely, not impossible. Introspective fallback or deterministic median-of-medians provides different worst-case guarantees." },
      { question: "Is stable sorting the same as a deterministic comparator?", answer: "No. Stability concerns equal-key record order. A deterministic strict comparator can still be used by an unstable sorting algorithm." }
    ],
  },
  {
    id: "topic-matrix-transformations", moduleId: "mod-arrays-strings", title: "Matrix Rotation, Spiral Boundaries and Zero Markers",
    intuition: "Treat transformations as coordinate mappings, spiral traversal as shrinking live bounds, and zeroing as delayed writes so the original zeros are not confused with new zeros.",
    contract: "spiral and setZeroes accept rectangular matrices, including empty. rotateClockwise requires square. Jagged inputs throw. Rotation and zeroing mutate in place; spiral returns row-major values in clockwise boundary order.",
    prerequisites: "2D indexing, swaps and in-place marker invariants.",
    cues: "90-degree in-place rotation, concentric boundary traversal, or zeroing entire original-zero rows and columns with constant workspace.",
    invariant: "Transpose maps (i,j)->(j,i); row reversal maps (j,i)->(j,n-1-i), composing to clockwise rotation. Spiral emits and removes one boundary at a time; guard the return legs after bounds cross. For zeroing, row 0/column 0 encode interior row/column flags while two separate booleans preserve whether the marker row/column originally contained a zero.",
    walkthrough: { input: "[[1,2,3],[4,0,6],[7,8,9]]", output: "spiral [1,2,3,6,9,8,7,4,0]; zeroed [[1,0,3],[0,0,0],[7,0,9]]", explanation: "Spiral emits top, right, bottom reversed, left reversed, then the center. For zeroing, original center zero marks a[1][0] and a[0][1]. Clear interior positions from those markers before clearing the marker row/column if their original-zero flags require it." },
    code: `#include <bits/stdc++.h>
using namespace std;
int columns(const vector<vector<int>>&a){
  int n=a.empty()?0:a[0].size();for(auto&row:a)if((int)row.size()!=n)throw invalid_argument("ragged");return n;
}
void rotateClockwise(vector<vector<int>>&a){
  int n=columns(a);if((int)a.size()!=n)throw invalid_argument("square required");
  for(int i=0;i<n;i++)for(int j=i+1;j<n;j++)swap(a[i][j],a[j][i]);
  for(auto&row:a)reverse(row.begin(),row.end());
}
vector<int> spiral(const vector<vector<int>>&a){
  int n=columns(a),t=0,b=(int)a.size()-1,l=0,r=n-1;vector<int>out;
  while(t<=b&&l<=r){
    for(int j=l;j<=r;j++)out.push_back(a[t][j]);++t;
    for(int i=t;i<=b;i++)out.push_back(a[i][r]);--r;
    if(t<=b){for(int j=r;j>=l;j--)out.push_back(a[b][j]);--b;}
    if(l<=r){for(int i=b;i>=t;i--)out.push_back(a[i][l]);++l;}
  }return out;
}
void setZeroes(vector<vector<int>>&a){
  int n=columns(a),m=a.size();if(!m||!n)return;bool row=false,col=false;
  for(int j=0;j<n;j++)row|=a[0][j]==0;for(int i=0;i<m;i++)col|=a[i][0]==0;
  for(int i=1;i<m;i++)for(int j=1;j<n;j++)if(!a[i][j])a[i][0]=a[0][j]=0;
  for(int i=1;i<m;i++)for(int j=1;j<n;j++)if(!a[i][0]||!a[0][j])a[i][j]=0;
  if(row)fill(a[0].begin(),a[0].end(),0);if(col)for(auto&v:a)v[0]=0;
}`,
    time: "O(rows*columns) for each operation.",
    space: "O(1) auxiliary, excluding O(rows*columns) spiral output.",
    boundaries: "A single row or column must not be emitted twice. Empty rows return no spiral values. Rectangular rotation cannot be done by square transpose/reverse without resizing. Newly written zeros must not create additional markers during the initial scan.",
    alternatives: "An out-of-place rectangular clockwise rotation allocates columns by rows. Row/column flag arrays make zeroing easier at O(rows+columns) workspace; choose them when the constant-space constraint is absent.",
    practice: [
      { variation: "Rotate rectangular input", tip: "Allocate the transposed dimensions and use out[j][m-1-i]=a[i][j].", snippet: "vector<vector<int>> rotateRect(const vector<vector<int>>&a){\n  int n=columns(a),m=a.size();vector<vector<int>>out(n,vector<int>(m));\n  for(int i=0;i<m;i++)for(int j=0;j<n;j++)out[j][m-1-i]=a[i][j];\n  return out;\n}" },
      { variation: "Rotate counterclockwise", tip: "Three clockwise turns are simple and remain O(n squared); transpose then reverse row order does it in one pass pair.", snippet: "void counterclockwise(vector<vector<int>>&a){\n  int n=columns(a);if((int)a.size()!=n)throw invalid_argument(\"square\");\n  for(int i=0;i<n;i++)for(int j=i+1;j<n;j++)swap(a[i][j],a[j][i]);\n  reverse(a.begin(),a.end());\n}" },
      { variation: "Reference zeroing with extra flags", tip: "Use this simpler version as an oracle for randomized tests of the in-place marker implementation.", snippet: "vector<vector<int>> zeroReference(vector<vector<int>>a){\n  int m=a.size(),n=columns(a);vector<bool>r(m),c(n);\n  for(int i=0;i<m;i++)for(int j=0;j<n;j++)if(!a[i][j])r[i]=c[j]=true;\n  for(int i=0;i<m;i++)for(int j=0;j<n;j++)if(r[i]||c[j])a[i][j]=0;\n  return a;\n}" }
    ],
    faq: [
      { question: "Why not zero a row immediately when a zero is found?", answer: "Those newly written zeros would be mistaken for original zeros and propagate into unrelated columns. Record first, apply later." },
      { question: "Why does spiral traversal recheck two boundaries?", answer: "After the top and right legs, the remaining region can be empty, especially for single rows/columns. Unconditional return legs duplicate already emitted cells." }
    ],
  }
];
