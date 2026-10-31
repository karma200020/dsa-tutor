export const expandedCompanyCppCases: Record<string, string> = {
  "google-unique-range": `
mt19937 gen(42);for(int test=0;test<300;++test){vector<int>a(gen()%20);for(auto&x:a)x=(int)(gen()%8)-4;UniqueRanges ranges(a);
for(int l=0;l<(int)a.size();++l)for(int r=l;r<(int)a.size();++r){set<int>s(a.begin()+l,a.begin()+r+1);assert(ranges.query(l,r)==((int)s.size()==r-l+1));}}`,
  "google-point-squares": `
assert(countSquares({{0,0},{1,0},{0,1},{1,1}})==1);
assert(countSquares({{0,1},{1,0},{0,-1},{-1,0},{0,1}})==1);
mt19937 gen(21);
for(int test=0;test<200;++test){
set<pair<long long,long long>>unique;for(int i=0;i<8;++i)unique.insert({(int)(gen()%7)-3,(int)(gen()%7)-3});
vector<pair<long long,long long>>p(unique.begin(),unique.end());long long expected=0;
for(int a=0;a<(int)p.size();++a)for(int b=a+1;b<(int)p.size();++b)for(int c=b+1;c<(int)p.size();++c)for(int d=c+1;d<(int)p.size();++d){
vector<long long>dist;vector<int>ids{a,b,c,d};for(int i=0;i<4;++i)for(int j=i+1;j<4;++j){long long dx=p[ids[i]].first-p[ids[j]].first,dy=p[ids[i]].second-p[ids[j]].second;dist.push_back(dx*dx+dy*dy);}
sort(dist.begin(),dist.end());expected+=dist[0]>0&&dist[0]==dist[1]&&dist[1]==dist[2]&&dist[2]==dist[3]&&dist[4]==2*dist[0]&&dist[5]==dist[4];}
assert(countSquares(p)==expected);}`,
  "google-step-subsequence": `
mt19937 gen(22);for(int test=0;test<1000;++test){vector<long long>a(gen()%14);for(auto&x:a)x=(int)(gen()%11)-5;int d=1+gen()%5,best=0;vector<int>dp(a.size(),1);
for(int i=0;i<(int)a.size();++i){for(int j=0;j<i;++j)if(a[i]-a[j]>=1&&a[i]-a[j]<=d)dp[i]=max(dp[i],dp[j]+1);best=max(best,dp[i]);}
assert(stepSubsequence(a,d)==best);}`,
  "google-security-path": `
vector<vector<pair<int,long long>>>g{{{1,-5},{2,3}},{{2,-2},{0,-7}},{}};
assert(securityPath(g,0,2)==-2);assert(!securityPath(g,2,0));
assert(strictSecurityThreshold(g,0,2)==-1);assert(!strictSecurityThreshold(g,2,0));
mt19937 gen(23);for(int test=0;test<200;++test){int n=5;vector<vector<pair<int,long long>>>graph(n);for(int u=0;u<n;++u)for(int v=0;v<n;++v)if(gen()%4==0)graph[u].push_back({v,(int)(gen()%11)-5});
optional<long long>expected;for(long long threshold=-5;threshold<=5;++threshold){vector<bool>seen(n);queue<int>q;q.push(0);seen[0]=true;while(!q.empty()){int u=q.front();q.pop();for(auto[v,w]:graph[u])if(w<=threshold&&!seen[v]){seen[v]=true;q.push(v);}}if(seen[n-1]){expected=threshold;break;}}
assert(securityPath(graph,0,n-1)==expected);}`,
  "google-root-leaf-cut": `
assert(!rootLeafCut(vector<vector<pair<int,long long>>>(1),0));
mt19937 gen(24);for(int test=0;test<300;++test){int n=2+gen()%8;vector<vector<pair<int,long long>>>g(n);vector<tuple<int,int,long long>>edges;vector<int>degree(n);
for(int v=1;v<n;++v){int u=gen()%v;long long w=1+gen()%12;g[u].push_back({v,w});g[v].push_back({u,w});edges.push_back({u,v,w});++degree[u];++degree[v];}
long long best=LLONG_MAX;for(int mask=0;mask<(1<<(n-1));++mask){vector<vector<int>>remaining(n);long long cost=0;for(int i=0;i<n-1;++i){auto[u,v,w]=edges[i];if(mask&(1<<i))cost+=w;else{remaining[u].push_back(v);remaining[v].push_back(u);}}
vector<bool>seen(n);queue<int>q;seen[0]=true;q.push(0);while(!q.empty()){int u=q.front();q.pop();for(int v:remaining[u])if(!seen[v]){seen[v]=true;q.push(v);}}
bool valid=true;for(int v=1;v<n;++v)if(degree[v]==1&&seen[v])valid=false;if(valid)best=min(best,cost);}
assert(rootLeafCut(g,0)==best);}`,
  "google-ad-selection": `
AdService empty;assert(!empty.getAd());empty.insertAd(5,0);assert(empty.getAd()==5);assert(!empty.getAd());empty.insertAd(3,-2);assert(empty.getAd()==3);
AdService ads;map<int,long long>scores;optional<int>previous;
for(int i=0;i<7;++i){ads.insertAd(i,i%3);scores[i]=i%3;}
for(int step=0;step<200;++step){optional<int>best;for(auto[id,score]:scores)if(!previous||id!=*previous)if(!best||score>scores[*best]||(score==scores[*best]&&id<*best))best=id;
assert(ads.getAd()==best);--scores[*best];previous=best;}`,
  "google-equal-set-substrings": `
mt19937 gen(25);for(int test=0;test<500;++test){string s(gen()%10,'a');for(char&c:s)c='a'+gen()%4;long long expected=0;
for(int i=0;i<(int)s.size();++i)for(int j=i;j<(int)s.size();++j)for(int k=j+1;k<(int)s.size();++k){
set<char>a(s.begin()+i,s.begin()+j+1),b(s.begin()+j+1,s.begin()+k+1);expected+=a==b;}
assert(equalSetTriples(s)==expected);}`,
  "google-favorite-city": `
vector<vector<pair<int,long long>>>g{{{1,2},{2,5}},{{3,9}},{{3,1}},{}};
auto a=favoriteCity(g,0,{1,2});assert(a&&a->first==1&&a->second==2);
auto b=favoriteCity(g,0,{1,2},3);assert(b&&b->first==2&&b->second==6);
assert(!favoriteCity(g,3,{0,1}));assert(favoriteCity(g,0,{0},0)->second==0);`,
  "google-bisect-square-area": `
assert(fabsl(bisectArea({{0,2,2}})-1)<1e-10L);
assert(fabsl(bisectArea({{0,1,1},{0,4,1}})-1)<1e-10L);
assert(fabsl(bisectArea({{0,2,2},{1,2,2}})-1)<1e-10L);
mt19937 gen(26);for(int test=0;test<100;++test){vector<Square>s;for(int i=0;i<6;++i)s.push_back({(int)(gen()%10),(int)(gen()%15)-7,1+(int)(gen()%4)});
long double y=bisectArea(s),below=0,total=0;for(auto a:s){below+=a.side*clamp(y-(a.y-a.side),0.0L,a.side);total+=a.side*a.side;}assert(fabsl(2*below-total)<1e-7L);}`,
  "google-maximum-rectangle": `
assert(maxRectangle({{0,0},{4,0},{4,2},{0,2},{0,0}})==8);
assert(maxRectangle({{0,1},{1,0},{0,-1},{-1,0}})==2);
assert(maxRectangle({{0,0},{1,1},{2,2},{3,3}})==0);`,
  "google-weighted-jobs": `
assert(weightedJobs({{1,3,50},{2,5,20},{4,6,70},{6,8,60}})==180);
mt19937 gen(27);for(int test=0;test<500;++test){vector<Job>jobs(gen()%11);for(auto&j:jobs){j.start=gen()%8;j.end=j.start+1+gen()%4;j.profit=(int)(gen()%16)-5;}
long long best=0;for(int mask=0;mask<(1<<(int)jobs.size());++mask){long long value=0;bool valid=true;for(int i=0;i<(int)jobs.size();++i)if(mask&(1<<i)){value+=jobs[i].profit;for(int j=0;j<i;++j)if(mask&(1<<j))if(max(jobs[i].start,jobs[j].start)<min(jobs[i].end,jobs[j].end))valid=false;}if(valid)best=max(best,value);}
assert(weightedJobs(jobs)==best);}`,
  "google-binary-tree-root": `
vector<vector<int>>g{{1,2,3},{0},{0},{0}};auto root=binaryRoot(g);assert(root&&g[*root].size()<=2);
assert(binaryRoot(g,{0,1,1,1}));assert(!binaryRoot(g,{0,0,1,1}));assert(binaryRoot({{}})==0);`,
  "google-closed-grid-walk": `
assert(closedWalk({"..",".."},0,0,4)=="DRLU");assert(!closedWalk({"."},0,0,2));assert(closedWalk({"."},0,0,0)=="");assert(!closedWalk({".."},0,0,3));
const int dr[]={1,0,0,-1},dc[]={0,-1,1,0};string moves="DLRU";mt19937 gen(28);
for(int test=0;test<100;++test){vector<string>grid(3,string(3,'.'));for(auto&row:grid)for(char&c:row)if(gen()%4==0)c='#';grid[1][1]='.';int k=gen()%7;optional<string>expected;string current;
function<void(int,int)>dfs=[&](int r,int c){if((int)current.size()==k){if(r==1&&c==1&&(!expected||current<*expected))expected=current;return;}for(int i=0;i<4;++i){int x=r+dr[i],y=c+dc[i];if(x>=0&&x<3&&y>=0&&y<3&&grid[x][y]!='#'){current+=moves[i];dfs(x,y);current.pop_back();}}};dfs(1,1);
assert(closedWalk(grid,1,1,k)==expected);}`,
  "google-device-cooldown": `
assert((acceptEvents({{"a","x",0},{"a","x",9},{"a","x",10},{"b","x",10},{"a","y",10},{"a","x",19},{"a","x",20}})==vector<bool>{true,false,true,true,true,false,true}));
bool error=false;try{acceptEvents({{"a","x",10},{"a","x",9}});}catch(const invalid_argument&){error=true;}assert(error);`,
  "google-top-k-frequency": `assert((topFrequency({3,3,2,2,1},2)==vector<int>{2,3}));assert(topFrequency({},7).empty());assert(topFrequency({1},0).empty());`,
  "google-tree-consecutive": `
ConsecutiveNode a{1},b{2},c{3},d{2};a.left=&b;b.right=&c;a.right=&d;assert(consecutivePath(&a)==3);b.value=1;assert(consecutivePath(&a)==2);assert(consecutivePath(nullptr)==0);`,
  "google-element-segmentation": `
assert(elementWays("HeLi",{ "H","He","Li","L","I"})==2);assert(elementWays("HH",{"H","h"})==1);assert(elementWays("",{"H"})==1);assert(elementWays("XYZ",{"H","He"})==0);`,
  "google-determined-ranks": `
assert(determinedRanks(3,{{0,1},{1,2}})==3);assert(determinedRanks(4,{{0,1},{1,2}})==0);assert(determinedRanks(1,{})==1);
bool error=false;try{determinedRanks(2,{{0,1},{1,0}});}catch(const invalid_argument&){error=true;}assert(error);`,
  "google-piano-repositions": `
assert(pianoMoves({1,3,5,7,9,11},4)==1);assert(pianoMoves({3,3,3},0)==0);assert(pianoMoves({},4)==0);
mt19937 gen(29);for(int test=0;test<1000;++test){vector<long long>a(gen()%12);for(auto&x:a)x=(int)(gen()%15)-7;long long k=gen()%6;vector<int>dp(a.size()+1,99);dp[0]=0;
for(int i=0;i<(int)a.size();++i){long long lo=a[i],hi=a[i];for(int j=i;j<(int)a.size();++j){lo=min(lo,a[j]);hi=max(hi,a[j]);if(hi-lo<=k)dp[j+1]=min(dp[j+1],dp[i]+1);}}
assert(pianoMoves(a,k)==max(0,dp.back()-1));}`,
  "google-univalue-path": `
EqualNode a{5},b{5},c{5},d{5},e{1};a.left=&b;a.right=&c;b.left=&d;b.right=&e;assert(univaluePath(&a)==3);assert(univaluePath(&e)==0);assert(univaluePath(nullptr)==0);`,
  "google-movie-component": `
vector<vector<int>>g{{1},{0,2},{1},{}};
vector<Movie>m{{"source",99},{"zeta",8},{"alpha",8},{"outside",100}};
assert((relatedMovies(g,m,0,3)==vector<int>{2,1}));assert(relatedMovies(g,m,0,0).empty());assert(relatedMovies(g,m,3,4).empty());`,
  "google-missing-rook": `
for(int n=1;n<=20;++n)for(int row=0;row<n;++row)for(int col=0;col<n;++col){
vector<pair<int,int>>rooks;vector<int>columns;for(int c=0;c<n;++c)if(c!=col)columns.push_back(c);int index=0;for(int r=0;r<n;++r)if(r!=row)rooks.push_back({r,columns[index++]});
int calls=0;auto count=[&](int r1,int c1,int r2,int c2){++calls;int result=0;for(auto[r,c]:rooks)result+=r>=r1&&r<=r2&&c>=c1&&c<=c2;return result;};
assert((missingRook(n,count)==pair<int,int>{row,col}));assert(calls<=2*(int)ceil(log2(n)));}`,
  "google-course-order": `
auto result=courseOrder(4,{{0,1},{0,1},{1,2}});assert(result&&result->size()==4);vector<int>position(4);for(int i=0;i<4;++i)position[(*result)[i]]=i;assert(position[0]<position[1]&&position[1]<position[2]);
assert(!courseOrder(2,{{0,1},{1,0}}));assert(courseOrder(0,{})->empty());`,
  "google-placeholder-expansion": `
unordered_map<string,string>d{{"a","%b%:%b%"},{"b","OK"}};assert(expandPlaceholders("%a%/%b%",d)=="OK:OK/OK");
for(auto dict:vector<unordered_map<string,string>>{{{"a","%a%"}},{{"a","%b%"},{"b","%a%"}},{{"a","%missing%"}}}){bool error=false;try{expandPlaceholders("%a%",dict);}catch(const invalid_argument&){error=true;}assert(error);}
bool error=false;try{expandPlaceholders("x%",{});}catch(const invalid_argument&){error=true;}assert(error);`,
  "google-edge-after-removal": `
mt19937 gen(30);for(int test=0;test<1000;++test){int n=1+gen()%8;vector<WeightedEdge>edges;for(int i=0;i<(int)(gen()%20);++i)edges.push_back({(int)(gen()%n),(int)(gen()%n),(int)(gen()%21)-10});
auto result=maxEdgesAfterRemoval(n,edges);for(int v=0;v<n;++v){optional<long long>best;for(auto e:edges)if(e.u!=v&&e.v!=v&&(!best||e.weight>*best))best=e.weight;assert(result[v]==best);}}`,
  "google-majority-subsets": `
assert(majoritySubsets({1,3,4})==3);mt19937 gen(31);for(int test=0;test<1000;++test){vector<long long>a(gen()%13);for(auto&x:a)x=(int)(gen()%11)-5;
long long total=accumulate(a.begin(),a.end(),0LL),expected=0;for(int mask=0;mask<(1<<(int)a.size());++mask){long long sum=0;for(int i=0;i<(int)a.size();++i)if(mask&(1<<i))sum+=a[i];expected+=2*sum>total;}
assert(majoritySubsets(a)==expected);}`,
  "google-reverse-hashed-list": `
HashNode a{1,18},b{3,17},c{6,14},d{8,8},e{0,0};a.next=&b;b.next=&c;c.next=&d;d.next=&e;
assert(reverseHashed(&a)==&e);vector<long long>values,hashes;for(auto*u=&e;u;u=u->next){values.push_back(u->value);hashes.push_back(u->hash);}
assert((values==vector<long long>{0,8,6,3,1}));assert((hashes==vector<long long>{18,18,10,4,1}));
assert(reverseHashed(&e)==&a);a.hash=19;bool error=false;try{reverseHashed(&a);}catch(const invalid_argument&){error=true;}assert(error&&a.next==&b);`,
  "google-equal-end-sum": `
assert(equalEndSum({5,-100,5,1,5})==11);assert(equalEndSum({-3,-2,-4})==-2);assert(!equalEndSum({}));
mt19937 gen(32);for(int test=0;test<1000;++test){vector<long long>a(gen()%14);for(auto&x:a)x=(int)(gen()%11)-5;optional<long long>expected;
for(int i=0;i<(int)a.size();++i){long long sum=0;for(int j=i;j<(int)a.size();++j){sum+=a[j];if(a[i]==a[j]&&(!expected||sum>*expected))expected=sum;}}
assert(equalEndSum(a)==expected);}`,
  "google-stuck-key-words": `
assert((stuckWords("heeellooo",{"hello","helo","helllo","hello","hi"})==vector<string>{"hello","helo"}));
assert((stuckWords("",{"","a"})==vector<string>{""}));assert(stuckWords("hel",{"hello"}).empty());`,
  "google-masked-clock": `
assert(nearestMaskedTime("00:??","23:59")=="00:00");assert(nearestMaskedTime("??:??","12:34")=="12:34");
assert(!nearestMaskedTime("29:??","00:00"));assert(nearestMaskedTime("??:30","12:00")=="11:30");`,
  "google-arithmetic-sum": `
assert(arithmeticSum({7,4,5,6,5})==73);mt19937 gen(33);
for(int test=0;test<1000;++test){vector<long long>a(gen()%13);for(auto&x:a)x=(int)(gen()%9)-4;long long expected=0;
for(int i=0;i<(int)a.size();++i){long long sum=0;for(int j=i;j<(int)a.size();++j){sum+=a[j];bool valid=true;
if(j>i){long long d=a[i+1]-a[i];valid=d==1||d==-1;for(int p=i+2;p<=j;++p)valid=valid&&a[p]-a[p-1]==d;}if(valid)expected+=sum;}}
assert(arithmeticSum(a)==expected);}`,
  "google-arithmetic-zero-one": `
mt19937 gen(34);for(int test=0;test<1000;++test){vector<long long>a(gen()%13);for(auto&x:a)x=(int)(gen()%9)-4;long long expected=0;
for(int i=0;i<(int)a.size();++i){long long sum=0;for(int j=i;j<(int)a.size();++j){sum+=a[j];bool valid=true;
if(j>i){long long d=a[i+1]-a[i];valid=d==0||d==1;for(int p=i+2;p<=j;++p)valid=valid&&a[p]-a[p-1]==d;}if(valid)expected+=sum;}}
assert(zeroOneArithmeticSum(a)==expected);}`,
  "google-valid-partition": `
mt19937 gen(35);for(int test=0;test<500;++test){vector<string>a(gen()%20);for(auto&s:a)s=gen()%2?"valid":"bad";
int valid=count(a.begin(),a.end(),"valid"),expected=0;for(int i=0;i<valid;++i)expected+=a[i]=="bad";
int calls=0;assert(partitionValid(a,[&](const string&s){++calls;return s=="valid";})==expected);assert(calls==(int)a.size());
for(int i=0;i<(int)a.size();++i)assert((a[i]=="valid")== (i<valid));}`,
  "google-gap-connectivity": `
assert((gapComponents({-3,-3,0,1,10},3)==vector<int>{0,0,0,0,1}));
assert((gapComponents({1,1,2},0)==vector<int>{0,0,1}));assert(gapComponents({},4).empty());`,
  "google-csv-parser": `
assert((parseCsv("a,b\\r\\n\\"c,d\\",\\"say \\"\\"hi\\"\\"\\"\\n")==vector<vector<string>>{{"a","b"},{"c,d","say \\"hi\\""}}));
assert((parseCsv("\\"a\\nb\\",\\n")==vector<vector<string>>{{"a\\nb",""}}));
assert((parseCsv(",")==vector<vector<string>>{{"",""}}));assert(parseCsv("").empty());
assert((parseCsv("\\"\\"")==vector<vector<string>>{{""}}));
for(string bad:vector<string>{"\\"abc","a\\"b","\\"a\\"x","a\\rb"}){bool error=false;try{parseCsv(bad);}catch(const invalid_argument&){error=true;}assert(error);}`,
  "google-planet-pairs": `assert(planetPairs(5,{{0,1},{2,3}})==8);assert(planetPairs(3,{})==3);assert(planetPairs(3,{{0,1},{1,2},{0,1}})==0);assert(planetPairs(0,{})==0);`,
  "google-parent-array": `
assert(validParentTree({-1,0,0,1}));assert(!validParentTree({-1,2,1}));assert(!validParentTree({-1,-1}));assert(!validParentTree({1,0}));assert(!validParentTree({-1,4}));assert(!validParentTree({-1,1}));assert(!validParentTree({}));`,
  "google-free-days": `
assert((freeDays(6,2,2,{{0,2,3},{1,5,6}})==vector<int>{1,4}));
mt19937 gen(36);for(int test=0;test<500;++test){int D=1+gen()%10,P=1+gen()%5,k=gen()%(P+1);vector<BusyRange>ranges;vector<vector<bool>>busy(P,vector<bool>(D+1));
for(int i=0;i<12;++i){int p=gen()%P,l=1+gen()%D,r=l+gen()%(D-l+1);ranges.push_back({p,l,r});for(int day=l;day<=r;++day)busy[p][day]=true;}
vector<int>expected;for(int day=1;day<=D;++day){int free=P;for(int p=0;p<P;++p)free-=busy[p][day];if(free>=k)expected.push_back(day);}
assert(freeDays(D,P,k,ranges)==expected);}`,
  "google-parity-ranges": `
vector<int>a{-3,2,5,7,8,-1};ParityRanges p(a);
for(int l=0;l<(int)a.size();++l)for(int r=l;r<(int)a.size();++r){bool expected=true;for(int i=l+1;i<=r;++i)expected&=(a[i]%2+2)%2!=(a[i-1]%2+2)%2;assert(p.query(l,r)==expected);}`,
  "google-shortest-distinct": `
mt19937 gen(37);for(int test=0;test<1000;++test){vector<int>a(gen()%15);for(auto&x:a)x=(int)(gen()%7)-3;int k=1+gen()%8,best=INT_MAX;
for(int i=0;i<(int)a.size();++i){set<int>s;for(int j=i;j<(int)a.size();++j){s.insert(a[j]);if((int)s.size()>=k)best=min(best,j-i+1);}}
assert(shortestDistinct(a,k)==(best==INT_MAX?-1:best));}`,
  "google-beach-gap": `
assert(beachSeats({1,1,0,1,0,0,1},1)==3);assert(beachSeats({0,0,0},4)==0);
mt19937 gen(38);for(int test=0;test<1000;++test){vector<int>a(gen()%15);for(auto&x:a)x=gen()%2;int k=gen()%5,best=0;
for(int i=0;i<(int)a.size();++i){int free=0,busy=0;for(int j=i;j<(int)a.size();++j){free+=a[j]==1;busy+=a[j]==0;if(busy<=k)best=max(best,free);}}
assert(beachSeats(a,k)==best);}`,
  "google-ordered-index-pairs": `
assert(orderedPairs({2,4,6,5,9,9,11})==13);assert(orderedPairs({1,2,3})==9);
mt19937 gen(39);for(int test=0;test<500;++test){vector<long long>a(gen()%20);for(auto&x:a)x=(int)(gen()%21)-10;long long expected=0;
for(int i=0;i<(int)a.size();++i)for(int j=0;j<(int)a.size();++j)expected+=a[i]-a[j]==i-j;assert(orderedPairs(a)==expected);}`,
  "google-balanced-packets": `
assert((packetPlan(12,5)==pair<long long,long long>{3,4}));assert((packetPlan(0,5)==pair<long long,long long>{0,0}));
for(long long S=1;S<=100;++S)for(long long C=1;C<=20;++C){auto[n,largest]=packetPlan(S,C);assert(n*C>=S&&(n-1)*C<S);assert(largest*n>=S&&(largest-1)*n<S&&largest<=C);}`,
  "google-event-timeouts": `
assert((completedTimeouts({{"a",0,true},{"b",1,true},{"a",10,false},{"b",12,false}},10)==vector<string>{"b"}));
for(auto logs:vector<vector<LogEvent>>{{{"a",0,false}},{{"a",0,true}},{{"a",0,true},{"a",1,true}}}){bool error=false;try{completedTimeouts(logs,1);}catch(const invalid_argument&){error=true;}assert(error);}`,
  "google-delete-directory": `
map<string,vector<string>>tree{{"root",{"a","sub"}},{"sub",{"b"}}};vector<string>removed;
deleteDirectory("root",[&](const string&s){return tree.count(s);},[&](const string&s){return tree.at(s);},[&](const string&s){for(const auto&child:tree[s])assert(find(removed.begin(),removed.end(),child)!=removed.end());removed.push_back(s);});
assert(removed.size()==4&&removed.back()=="root");
bool error=false;try{deleteDirectory("x",[](const string&){return true;},[](const string&s){return vector<string>{s};},[](const string&){});}catch(const invalid_argument&){error=true;}assert(error);`,
  "google-graph-codec": `
GraphNode a{"same",{}},b{"same",{}},c{"c",{}},d{"d",{}};a.next={&b,&c,&b};b.next={&d};c.next={&d};d.next={&a};
auto records=encodeGraph(&a);auto decoded=decodeGraph(records);assert(decoded.nodes.size()==4);assert(decoded.root()->next[0]==decoded.root()->next[2]);assert(decoded.root()->next[0]->next[0]==decoded.root()->next[1]->next[0]);assert(decoded.root()->next[0]->next[0]->next[0]==decoded.root());
auto again=encodeGraph(decoded.root());assert(again.size()==records.size());for(int i=0;i<(int)records.size();++i)assert(again[i].label==records[i].label&&again[i].next==records[i].next);
assert(!decodeGraph({}).root());bool error=false;try{decodeGraph({{"x",{1}}});}catch(const invalid_argument&){error=true;}assert(error);`,
  "google-filesystem-size": `
SizeDictionary d({{"root",{nullopt,{"a","sub"}}},{"a",{100,{}}},{"sub",{nullopt,{"b","c"}}},{"b",{200,{}}},{"c",{300,{}}}});
assert(d.getSize("root")==600&&d.getSize("root")==600&&d.getSize("sub")==500);
bool error=false;try{d.getSize("missing");}catch(const out_of_range&){error=true;}assert(error);
SizeDictionary cyclic({{"a",{nullopt,{"b"}}},{"b",{nullopt,{"a"}}}});
for(int i=0;i<2;++i){error=false;try{cyclic.getSize("a");}catch(const invalid_argument&){error=true;}assert(error);}
error=false;try{SizeDictionary shared({{"a",{nullopt,{"c"}}},{"b",{nullopt,{"c"}}},{"c",{1,{}}}});}catch(const invalid_argument&){error=true;}assert(error);`,
  "google-adjacent-duplicates": `assert(removeAdjacentPairs("abbaca")=="ca");assert(removeAdjacentPairs("aaaaa")=="a");assert(removeAdjacentPairs("abba").empty());`,
  "google-envelopes": `
assert(envelopeChain({{5,4},{6,4},{6,7},{2,3}})==3);assert(envelopeChain({{2,2},{2,3},{2,4}})==1);assert(envelopeChain({})==0);
mt19937 gen(40);for(int test=0;test<500;++test){vector<pair<int,int>>a(gen()%12);for(auto&[w,h]:a){w=1+gen()%6;h=1+gen()%6;}sort(a.begin(),a.end());vector<int>dp(a.size(),1);int best=0;
for(int i=0;i<(int)a.size();++i){for(int j=0;j<i;++j)if(a[j].first<a[i].first&&a[j].second<a[i].second)dp[i]=max(dp[i],dp[j]+1);best=max(best,dp[i]);}
assert(envelopeChain(a)==best);}`,
  "google-cheapest-order": `
OrderBook b;assert(!b.cheapest());b.add(3,5,10);b.add(2,5,10);b.add(1,5,9);assert(b.cheapest()==1);b.remove(1);assert(b.cheapest()==2);b.add(4,1,20);assert(b.cheapest()==4);b.remove(4);b.remove(2);b.remove(3);assert(!b.cheapest());`,
  "google-wildcard-words": `
WordTrie t;for(string s:vector<string>{"apple","apply","ape","bat","apple"})t.insert(s);
assert((t.search("appl.")==vector<string>{"apple","apply"}));assert((t.search("...")==vector<string>{"ape","bat"}));assert(t.search("a.").empty());assert((t.search("apple")==vector<string>{"apple"}));`,
  "google-weighted-ratios": `
RatioDSU d(6);d.relate(0,1,2);d.relate(1,2,3);assert(fabsl(*d.query(0,2)-6)<1e-10L);assert(fabsl(*d.query(2,0)-1.0L/6)<1e-10L);assert(!d.query(0,3));d.relate(3,4,5);d.relate(4,5,2);d.relate(2,5,4);
assert(fabsl(*d.query(0,5)-24)<1e-10L);assert(fabsl(*d.query(3,5)-10)<1e-10L);d.relate(0,5,24);
bool error=false;try{d.relate(0,5,25);}catch(const invalid_argument&){error=true;}assert(error);
assert(*d.query(4,4)==1);
RatioDSU other(3);other.relate(1,2,2);other.relate(0,2,6);assert(fabsl(*other.query(0,1)-3)<1e-10L);`
};
