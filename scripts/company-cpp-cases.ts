import { expandedCompanyCppCases } from "./expanded-company-cpp-cases";

export const companyCppCases: Record<string, string> = {
  ...expandedCompanyCppCases,
  "google-earliest-friendship": `assert(earliest(1,{})==0); assert(earliest(4,{{7,0,1},{3,2,3},{8,1,2},{8,0,0}})==8); assert(earliest(3,{{1,0,1}})==-1);`,
  "google-range-module": `
RangeModule r; vector<bool> bits(20);
mt19937 gen(41);
for(int step=0;step<2000;++step) {
    int l=gen()%19, h=l+1+gen()%(20-l), op=gen()%3;
    if(op==0){r.addRange(l,h); for(int i=l;i<h;++i)bits[i]=true;}
    if(op==1){r.removeRange(l,h); for(int i=l;i<h;++i)bits[i]=false;}
    if(op==2){bool expected=true;for(int i=l;i<h;++i)expected=expected&&bits[i]; assert(r.queryRange(l,h)==expected);}
}
assert(r.queryRange(4,4));`,
  "google-employee-shifts": `
auto out=segmentShifts({{1,0,3},{1,2,4},{2,3,5},{3,7,8}});
assert(out.size()==6);
for(auto segment:out) {
    set<int> expected;
    for(Shift s:vector<Shift>{{1,0,3},{1,2,4},{2,3,5},{3,7,8}})
        if(s.start<=segment.start && segment.start<s.end)expected.insert(s.employee);
    assert(vector<int>(expected.begin(),expected.end())==segment.employees);
}
assert(out[4].employees.empty());`,
  "google-good-subarray-indices": `
mt19937 gen(2);
for(int z=0;z<500;++z){vector<long long>a(gen()%10);for(auto&x:a)x=(int)(gen()%9)-4;
long long k=gen()%6;bool valid=false;for(int i=0;i<(int)a.size();++i)for(int j=i+1;j<(int)a.size();++j)valid|=llabs(a[i]-a[j])==k;
auto [l,r]=goodIndices(a,k);assert((l!=-1)==valid);if(valid)assert(l<r&&llabs(a[l]-a[r])==k);}`,
  "google-ab-cuts": `
for(int n=0;n<=12;n+=2)for(int mask=0;mask<(1<<n);++mask){
string s(n,'b');for(int i=0;i<n;++i)if(mask&(1<<i))s[i]='a';
int total=count(s.begin(),s.end(),'a');if(total%2)continue;
auto[l,r]=shareAB(s);assert(r-l==n/2);assert(count(s.begin()+l,s.begin()+r,'a')==total/2);}`,
  "google-delete-equal-split": `
mt19937 gen(3);
for(int z=0;z<2000;++z){vector<long long>a(gen()%9);for(auto&x:a)x=(int)(gen()%7)-3;
bool expected=false;for(int removed=0;removed<(int)a.size();++removed){
auto b=a;b.erase(b.begin()+removed);for(int split=1;split<(int)b.size();++split)
expected|=accumulate(b.begin(),b.begin()+split,0LL)==accumulate(b.begin()+split,b.end(),0LL);}
assert(deleteEqualSplit(a)==expected);}`,
  "google-modular-coins": `
for(int n=0;n<=10;++n)for(int k=0;k<=n+1;++k)for(int m=1;m<=7;++m){
int expected=0;for(int mask=0;mask<(1<<n);++mask)if(__builtin_popcount((unsigned)mask)==k){
int sum=0;for(int i=0;i<n;++i)if(mask&(1<<i))sum+=i;expected+=sum%m==0;}
assert(divisibleSelections(n,k,m)==expected);}`,
  "google-tree-cut": `
assert(!bestTreeCut({5},{}));
assert(bestTreeCut({0,6000000000000000000LL},{{0,1}})==6000000000000000000LL);
mt19937 gen(4);
for(int z=0;z<500;++z){int n=2+gen()%12;vector<long long>w(n);for(auto&x:w)x=(int)(gen()%15)-7;
vector<pair<int,int>>e;for(int i=1;i<n;++i)e.push_back({i,(int)(gen()%i)});
long long expected=LLONG_MAX,total=accumulate(w.begin(),w.end(),0LL);
for(int skip=0;skip<n-1;++skip){vector<vector<int>>g(n);for(int i=0;i<n-1;++i)if(i!=skip){auto[u,v]=e[i];g[u].push_back(v);g[v].push_back(u);}
vector<int>visited(n);function<long long(int)>dfs=[&](int u){visited[u]=1;long long sum=w[u];for(int v:g[u])if(!visited[v])sum+=dfs(v);return sum;};
expected=min(expected,llabs(total-2*dfs(0)));}
assert(bestTreeCut(w,e)==expected);}`,
  "google-playlist-artists": `
for(int a=0;a<=7;++a)for(int b=0;b<=7;++b)for(int c=0;c<=7;++c){
vector<int>x(a,0);x.insert(x.end(),b,1);x.insert(x.end(),c,2);
auto y=playlist(x);int bad=0;for(int i=1;i<(int)y.size();++i)bad+=y[i]==y[i-1];
assert(bad==max(0,2*max({a,b,c})-(a+b+c)-1));sort(y.begin(),y.end());assert(x==y);}`,
  "google-bounded-subarray": `
mt19937 gen(5);for(int z=0;z<2000;++z){vector<long long>a(gen()%15);for(auto&x:a)x=(int)(gen()%13)-6;
long long k=(int)(gen()%21)-10;int expected=0;for(int i=0;i<(int)a.size();++i){long long sum=0;for(int j=i;j<(int)a.size();++j){sum+=a[j];if(sum<=k)expected=max(expected,j-i+1);}}
assert(longestAtMost(a,k)==expected);}`,
  "google-leaf-path-sum": `
Node a{-5},b{-3},c{-7},d{10};a.left=&b;a.right=&c;
assert(leafPath(&a)==-15);c.left=&d;assert(leafPath(&a)==-5);assert(!leafPath(&b));assert(!leafPath(nullptr));`,
  "google-randomized-collection": `
RandomizedCollection r(12);multiset<int>expected;mt19937 gen(6);
for(int z=0;z<5000;++z){int x=gen()%7;if(gen()%2){assert(r.insert(x)==!expected.count(x));expected.insert(x);}
else {auto it=expected.find(x);bool present=it!=expected.end();assert(r.remove(x)==present);if(present)expected.erase(it);}
assert(r.size()==expected.size());if(!expected.empty())assert(expected.count(r.getRandom()));}
while(!expected.empty()){int x=*expected.begin();assert(r.remove(x));expected.erase(expected.begin());}
bool threw=false;try{r.getRandom();}catch(const out_of_range&){threw=true;}assert(threw);`,
  "google-cycle-entry": `
ListNode a{1},b{1},c{2};a.next=&b;b.next=&c;assert(!cycleEntry(&a));c.next=&b;assert(cycleEntry(&a)==&b);a.next=&a;assert(cycleEntry(&a)==&a);assert(!cycleEntry(nullptr));`,
  "google-two-sum": `auto a=twoSum({3,3},6);assert(a.first==0&&a.second==1);assert(twoSum({1},2).first==-1);`,
  "google-sorted-unique-pairs": `
assert((uniquePairs({-3,-1,-1,0,1,1,3},0)==vector<pair<long long,long long>>{{-3,3},{-1,1}}));
assert((uniquePairs({2,2,2},4)==vector<pair<long long,long long>>{{2,2}}));assert(uniquePairs({},0).empty());`,
  "google-lca-bst-followup": `
TreeNode a{4},b{2},c{6},d{1},e{3};a.left=&b;a.right=&c;b.left=&d;b.right=&e;
assert(lca(&a,&d,&e)==&b);assert(lca(&a,&b,&e)==&b);assert(bstLca(&a,&d,&c)==&a);assert(lca(&a,&e,&e)==&e);`,
  "google-rightward-grid-paths": `
function<long long(int,int,int,int)> brute=[&](int n,int m,int r,int c){if(c==m-1)return (long long)(r==n-1);long long ans=0;for(int d=-1;d<=1;++d)if(r+d>=0&&r+d<n)ans+=brute(n,m,r+d,c+1);return ans;};
for(int n=1;n<=5;++n)for(int m=1;m<=8;++m)assert(rightwardPaths(n,m,{})==brute(n,m,n-1,0));
assert(rightwardPaths(3,5,{{1,2},{2,2}})==0);assert(rightwardPaths(1,4,{{0,2},{0,2}})==1);`,
  "google-shortest-path-membership": `
vector<vector<int>>g{{1,2},{0,3},{0,3},{1,2,4},{3},{}};
assert((shortestMembers(g,0,3)==vector<int>{0,1,2,3}));assert(shortestMembers(g,0,5).empty());assert((shortestMembers(g,2,2)==vector<int>{2}));`,
  "google-rat-safest-path": `
assert(safestPath({"...","...","..."},{0,0},{0,2},{{2,2}})==2);
assert(safestPath({".#."},{0,0},{0,2},{{0,1}})==-1);
assert(safestPath({"..."},{0,0},{0,0},{{0,0}})==0);
mt19937 gen(11);for(int z=0;z<200;++z){int n=4,m=4;vector<string>g(n,string(m,'.'));for(auto&row:g)for(char&c:row)if(gen()%4==0)c='#';g[0][0]=g[3][3]='.';
vector<pair<int,int>>cats{{(int)(gen()%n),(int)(gen()%m)},{(int)(gen()%n),(int)(gen()%m)}};int expected=-1;
for(int threshold=0;threshold<=6;++threshold){auto safe=[&](int r,int c){int d=99;for(auto[x,y]:cats)d=min(d,abs(x-r)+abs(y-c));return g[r][c]!='#'&&d>=threshold;};
queue<pair<int,int>>q;set<pair<int,int>>visited;if(safe(0,0)){q.push({0,0});visited.insert({0,0});}
while(!q.empty()){auto[r,c]=q.front();q.pop();for(auto[dr,dc]:vector<pair<int,int>>{{1,0},{-1,0},{0,1},{0,-1}}){int x=r+dr,y=c+dc;if(x>=0&&x<n&&y>=0&&y<m&&safe(x,y)&&visited.insert({x,y}).second)q.push({x,y});}}
if(visited.count({3,3}))expected=threshold;}
assert(safestPath(g,{0,0},{3,3},cats)==expected);}`,
  "google-pi-index": `assert(piIndex("314159265358979")==5);assert(piIndex("0000000000013")==13);assert(piIndex("1")==1);assert(piIndex("00000")==-1);`,
  "google-disjoint-swaps": `
for(int n=0;n<=10;++n)for(int mask=0;mask<(1<<n);++mask){string s(n,'a');for(int i=0;i<n;++i)if(mask&(1<<i))s[i]='b';set<string>outputs;
function<void(int,string)>dfs=[&](int i,string x){if(i>=n){outputs.insert(x);return;}dfs(i+1,x);if(i+1<n){swap(x[i],x[i+1]);dfs(i+2,x);}};dfs(0,s);assert(distinctSwaps(s)==(int)outputs.size());}`,
  "google-coprime-partitions": `
mt19937 gen(7);for(int z=0;z<1000;++z){int n=gen()%9;vector<int>a(n);for(auto&x:a)x=1+gen()%12;int expected=0;
for(int mask=1;mask<(1<<n)-1;++mask){long long p=1,q=1;for(int i=0;i<n;++i)if(mask&(1<<i))p*=a[i];else q*=a[i];expected+=gcd(p,q)==1;}
assert(coprimePartitions(a)==expected);}`,
  "google-parity-subsequences": `
for(int n=0;n<=9;++n)for(int bits=0;bits<(1<<n);++bits){vector<int>a(n);for(int i=0;i<n;++i)a[i]=bits&(1<<i)?-3:2;int expected=0;
for(int mask=1;mask<(1<<n);++mask){int last=-1,run=0;bool ok=true;for(int i=0;i<n;++i)if(mask&(1<<i)){int p=(a[i]%2+2)%2;run=last==p?run+1:1;last=p;ok&=run<3;}expected+=ok;}
assert(paritySubsequences(a)==expected);}`,
  "google-digit-palindrome": `
auto valid=[](int x){string s=to_string(x),r=s;reverse(r.begin(),r.end());if(s!=r)return false;array<int,10>c{};for(char d:s)++c[d-'0'];for(int d=0;d<10;++d)if(c[d]&&c[d]!=d)return false;return true;};
vector<int>numbers;for(int x=1;x<=2000000;++x)if(valid(x))numbers.push_back(x);
for(int n=0;n<=50000;n+=137){auto it=upper_bound(numbers.begin(),numbers.end(),n);assert(it!=numbers.end());assert(nextSelfPalindrome(to_string(n))==to_string(*it));}
assert(!nextSelfPalindrome(string(40,'9')));assert(nextSelfPalindrome("0000")=="1");`,
  "google-prime-labelled-tree": `
assert(primeTree(1,{})==25);int expected=0;auto prime=[](int x){for(int d=2;d*d<=x;++d)if(x%d==0)return false;return x>=2;};
for(int a=2;a<=100;++a)if(prime(a))for(int b=2;b<=100;++b)if(prime(b)&&!prime(a+b))++expected;
assert(primeTree(2,{{0,1}})==expected);
long long chain=0;for(int a=2;a<=100;++a)if(prime(a))for(int b=2;b<=100;++b)if(prime(b)&&!prime(a+b))for(int c=2;c<=100;++c)if(prime(c)&&!prime(b+c))++chain;
assert(primeTree(3,{{0,1},{1,2}})==chain);`
};
