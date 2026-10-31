import type { NetworkLesson } from "./schema";

export const applicationLessons: NetworkLesson[] = [
  {
    id: "dns-resolution", module: "dns", title: "Follow a Name Through the DNS Hierarchy",
    concepts: ["dns-hierarchy", "dns-stub-resolver", "dns-recursive-resolver", "dns-authoritative-server", "dns-iterative-query", "dns-recursive-query"],
    prerequisites: [],
    meaning: "DNS resolves a name by asking servers responsible for progressively more specific parts of a distributed namespace.",
    why: "A single global address book would be difficult to update and operate. Delegation lets organizations manage their own names while resolvers hide most of the lookup work from applications.",
    model: "Think of referrals as directions to the next office, not answers to the original question. A recursive resolver does the walking for a stub resolver. This model omits caches, parallel queries, retries and encrypted transports; a lookup does not necessarily contact every level.",
    steps: [
      "The application's stub asks its configured recursive resolver for an address, usually requesting recursion with the RD flag.",
      "On a cache miss, the resolver asks a root server. A referral identifies nameservers for the relevant top-level domain, not the website's address.",
      "The resolver follows the top-level domain referral to the domain's authoritative servers and asks the original question.",
      "It follows aliases if necessary, caches usable results with their lifetimes, and returns the answer or an explicit error to the stub."
    ],
    example: {
      given: "A cold resolver in an entirely simulated, locally configured root -> test -> example.test hierarchy receives A www.example.test; this is not a public DNS delegation or lookup.",
      steps: [
        "The root directs it to test nameservers; www's address is still unknown.",
        "The test server directs it to example.test nameservers; the resolver now knows where the answer belongs.",
        "The example.test server returns A 192.0.2.80 with TTL 300.",
        "The resolver returns that address; another request after 20 seconds can use the cached record with approximately 280 seconds left."
      ],
      result: "One stub request can trigger several iterative exchanges; the second lookup need not repeat them."
    },
    failure: "An unreachable authority can produce SERVFAIL or a timeout even when the domain is correctly delegated. A referral is progress, not proof that the destination server works.",
    confusions: ["Recursive describes who completes the lookup; iterative describes following answers or referrals one exchange at a time.", "An authoritative server owns zone data; a recursive server can answer from cache without owning it."],
    observe: "Compare dig www.example.com with dig +trace www.example.com. Trace follows delegation itself and may fail on networks that block direct DNS; it is not a faithful replay of your browser's resolver path.",
    interview: { answer: "The stub delegates resolution to a recursive resolver, which uses caches and iterative referrals to reach an authority.", followups: ["Where could a warm lookup stop before contacting the root?", "Why can successful root access coexist with a failed final lookup?"] },
    recall: [{ question: "Who normally follows referrals for a stub?", answer: "Its recursive resolver." }, { question: "What does an authoritative answer establish?", answer: "That the replying server serves the relevant zone data, not that the application is healthy." }],
    tasks: [
      { kind: "Predict", prompt: "A resolver caches the final A record. Must it ask the root for the same name again immediately?", hint: "Identify the first usable cache entry.", answer: "No; it can return the unexpired A record.", reasoning: "The final answer removes the need to repeat referrals while its TTL remains valid." },
      { kind: "Diagnose", prompt: "The root and registry respond, but every delegated authority times out. Has the name been proved nonexistent?", hint: "Separate absence from inability to obtain an answer.", answer: "No; resolution failed, rather than proving nonexistence.", reasoning: "A timeout provides no authoritative negative evidence about the requested name." }
    ],
    sources: ["dns", "dnswire", "kr", "specialuse"],
    advanced: "Real resolvers may use QNAME minimization, forwarding, anycast and local policy. RFC 6761 reserves .test for private testing; caching resolvers normally synthesize negative answers unless configured for private .test. This simulation performs no public root queries.",
    diagram: "SIMULATED PRIVATE HIERARCHY ONLY\nstub -> recursive resolver\n          | local root: ask test\n          | local test: ask example.test\n          | authority: www -> address\nstub <- cached answer"
  },
  {
    id: "dns-zones", module: "dns", title: "Zones, Delegation and the Records That Describe Them",
    concepts: ["dns-zone", "dns-delegation", "dns-ns-record", "dns-soa-record", "dns-glue-record"],
    prerequisites: ["dns-resolution"],
    meaning: "A zone is an administrative slice of DNS data, bounded by delegation to another set of authoritative servers.",
    why: "Teams need to publish independent changes without copying the whole namespace. Zone boundaries divide responsibility, while NS and SOA records explain where authority lives and how zone maintenance works.",
    model: "A domain is a subtree of names; a zone is the part served by one administrative authority before delegated children. They are not interchangeable. Nameserver addresses are routing aids, whereas NS records name the servers; neither guarantees that those servers answer correctly.",
    steps: [
      "Publish NS records at the parent to delegate a child zone to named authoritative servers.",
      "When a nameserver name is inside that child, supply parent-side glue addresses to break the circular dependency.",
      "Serve the child zone's own NS set and an SOA containing its serial and maintenance parameters.",
      "Update secondary servers using transfer or notification mechanisms; verify parent delegation and child service separately."
    ],
    example: {
      given: "In a locally configured private .test hierarchy, example.test delegates lab.example.test to ns.lab.example.test at 192.0.2.53; the child SOA serial changes from 41 to 42.",
      steps: [
        "The parent returns the child's NS name plus glue 192.0.2.53; otherwise resolving that name would require first reaching the child.",
        "The resolver reaches 192.0.2.53 and asks for host.lab.example.test.",
        "The child returns its authoritative A record; a secondary comparing SOA serials notices version 42 is newer than 41."
      ],
      result: "Delegation supplies a route to authority; the child zone supplies the actual record and versioned data."
    },
    failure: "A parent can point to an old nameserver while the child lists a new one. This broken or lame delegation causes intermittent failure depending on cached referrals and which server is tried.",
    confusions: ["Glue is not an independent authoritative statement about an arbitrary host; it supports a delegation.", "The SOA serial is a zone version, not a TTL or a count of queries."],
    observe: "Use dig example.com NS, dig example.com SOA and dig +trace for a domain you control. Compare parent referrals with direct authoritative replies before changing production nameservers.",
    interview: { answer: "Delegation creates a zone boundary using NS records; glue avoids address-lookup loops and SOA describes zone maintenance.", followups: ["When is in-bailiwick glue needed?", "How could inconsistent parent and child NS sets affect clients differently?"] },
    recall: [{ question: "What stops a zone extending into a child subtree?", answer: "A delegation at the child boundary." }, { question: "What does a secondary compare to detect zone changes?", answer: "SOA serial values using DNS serial-number rules." }],
    tasks: [
      { kind: "Explain", prompt: "Why does delegating lab.example.test to ns.lab.example.test need a bootstrap address?", hint: "Try resolving the nameserver before contacting it.", answer: "Its name lies inside the very zone being delegated.", reasoning: "Without glue, reaching the child requires resolving a name whose answer requires reaching the child." },
      { kind: "Diagnose", prompt: "The child answers directly, but parent referrals still name a retired server. Which side needs inspection?", hint: "Direct authority queries bypass one part of normal resolution.", answer: "The parent delegation and its cached NS/glue data.", reasoning: "A healthy child is not sufficient when resolvers are directed elsewhere." }
    ],
    sources: ["dns", "dnswire"],
    advanced: "SOA serials use wrap-aware arithmetic. DNS UPDATE and zone transfers need access controls; publishing a zone is separate from safely managing its changes."
  },
  {
    id: "dns-records", module: "dns", title: "Choose the Right DNS Record, Not Just an Address",
    concepts: ["dns-a-record", "dns-aaaa-record", "dns-cname-record", "dns-mx-record", "dns-txt-record", "dns-srv-record", "dns-https-record", "dns-svcb-record"],
    prerequisites: ["dns-zones"],
    meaning: "DNS record types answer different questions: host addresses, aliases, mail destinations, text assertions and service connection parameters.",
    why: "Treating every DNS answer as an IP address hides essential service discovery. Mail needs destination priorities; some services need ports; modern HTTPS clients can learn supported protocols before connecting.",
    model: "A name is a key with typed values, not one universal address. A and AAAA contain IPv4 and IPv6 addresses. CNAME redirects lookup to another name and ordinarily cannot coexist with other data at its owner; service metadata is not itself a working connection.",
    steps: [
      "Select the query type: A or AAAA for addresses, MX for mail routing, TXT for application-defined text, or SRV for priority, weight, port and target.",
      "Follow a CNAME to its target and resolve the needed type there; retain separate lifetimes for alias and address records.",
      "For MX or SRV targets, perform address resolution before opening the relevant application connection.",
      "Interpret HTTPS/SVCB AliasMode or ServiceMode and supported parameters such as ALPN and port; unsupported mandatory parameters can make a record unusable."
    ],
    example: {
      given: "In a configured private .test hierarchy, shop.example.test CNAME edge.example.test; edge has AAAA 2001:db8::80. example.test has MX 10 mail.example.test. An HTTPS record advertises alpn=h2,h3.",
      steps: [
        "A shop AAAA lookup follows the alias and obtains the IPv6 address.",
        "Mail delivery separately selects the MX target and resolves mail.example.test; it does not send mail to shop's address.",
        "An HTTPS-capable client can consider h3, but actual transport and certificate checks must still succeed."
      ],
      result: "Different records steer different applications; discovery information is an input to connection establishment, not a success certificate."
    },
    failure: "A CNAME at a conventional zone apex conflicts with required SOA and NS data. Provider 'flattening' is an implementation feature, not an ordinary apex CNAME.",
    confusions: ["MX preference is lower-first; SRV additionally has weight among equal-priority targets.", "TXT has no universal authentication meaning; its consumer defines the format and policy."],
    observe: "Compare dig example.com A, AAAA, MX, TXT and HTTPS. Query SRV using the service's specified _service._protocol name rather than expecting every hostname to have it.",
    interview: { answer: "Typed DNS records separate addressing, aliasing and service discovery; clients interpret only the types and parameters they understand.", followups: ["Why must an MX target still undergo address resolution?", "What can an HTTPS record improve without replacing TLS authentication?"] },
    recall: [{ question: "Which record directly stores an IPv6 address?", answer: "AAAA." }, { question: "Which record supplies a service port and target?", answer: "SRV." }],
    tasks: [
      { kind: "Predict", prompt: "MX records have preferences 10 and 30. Which is normally attempted first?", hint: "Preference is not a score to maximize.", answer: "The target with preference 10.", reasoning: "Lower MX preference values have higher delivery priority; failures may lead to alternatives." },
      { kind: "Compare", prompt: "Does alpn=h3 in an HTTPS record prove the browser will use HTTP/3?", hint: "List checks after discovery.", answer: "No; client support, network reachability and authenticated negotiation still matter.", reasoning: "DNS service parameters advertise possibilities rather than forcing successful transport use." }
    ],
    sources: ["dnswire", "svcb", "mail"],
    advanced: "Address hints in SVCB are not a replacement for all address resolution. DNSSEC, parameter support and fallback rules affect how clients safely consume service bindings."
  },
  {
    id: "dns-caching", module: "dns", title: "TTL, Negative Caching and DNS Error Evidence",
    concepts: ["dns-ttl", "dns-cache", "dns-negative-cache", "dns-nxdomain", "dns-servfail", "dns-nodata"],
    prerequisites: ["dns-records"],
    meaning: "DNS caches retain positive and negative results for bounded periods, so changes and failures can be observed differently by different clients.",
    why: "Caching reduces query load and latency, but also delays visibility of updates. Negative caching prevents repeated work for absent names or types and makes a newly created record temporarily invisible to some users.",
    model: "A TTL is a maximum reuse lifetime for a cached record, not a global propagation timer. NXDOMAIN means the queried name does not exist; NODATA means the name exists without that type. SERVFAIL means the resolver could not complete a valid answer, not that the name is absent.",
    steps: [
      "Store a positive resource record with its received TTL, decrementing the remaining lifetime while cached.",
      "For cacheable authoritative negative answers, use the SOA information; the negative TTL is derived from the lower of the SOA TTL and SOA MINIMUM.",
      "On expiration, resolve again; existing caches do not learn a lower newly published TTL before their old entry expires.",
      "Distinguish authoritative negatives from validation or upstream failures; resolver policies may briefly cache failures too."
    ],
    example: {
      given: "At t=0 a resolver caches an A record for 600 seconds. At t=100 the owner changes the address and publishes TTL 60. A separate absent name has negative TTL 120.",
      steps: [
        "At t=150 the first resolver can still return the old address with about 450 seconds remaining.",
        "Publishing TTL 60 does not retroactively shorten that existing cache entry.",
        "If the absent name is created after 30 seconds, a resolver holding its negative result may continue answering negatively until t=120."
      ],
      result: "Both positive and negative cache history influence when each client sees a change."
    },
    failure: "Repeatedly lowering the TTL during an outage cannot invalidate remote caches already holding longer lifetimes. Clearing one local cache also does not clear the upstream resolver.",
    confusions: ["NOERROR with an empty relevant answer can be NODATA, not necessarily a successful address lookup.", "SERVFAIL can come from DNSSEC validation failure even when an unsigned-looking direct answer contains an address."],
    observe: "Repeat dig queries to the same resolver and inspect TTL, status and authority SOA. Compare a direct authoritative query to separate published data from cached history.",
    interview: { answer: "TTL bounds cache reuse; negative answers also have lifetimes, while NXDOMAIN, NODATA and SERVFAIL convey different evidence.", followups: ["How would you plan a low-risk address cutover?", "Why might two resolvers disagree immediately after a record is created?"] },
    recall: [{ question: "Does a new TTL modify existing remote entries?", answer: "No." }, { question: "Does SERVFAIL prove nonexistence?", answer: "No; it reports failure to produce a valid resolution result." }],
    tasks: [
      { kind: "Calculate", prompt: "A TTL 300 answer is cached at 10:00:00. What remains at 10:01:40?", hint: "Subtract elapsed seconds.", answer: "Approximately 200 seconds.", reasoning: "One minute forty seconds is 100 seconds; 300 minus 100 is 200." },
      { kind: "Diagnose", prompt: "A newly created name works at its authority but still gives NXDOMAIN at one resolver. What should you inspect?", hint: "Absence can be cached too.", answer: "The resolver's negative cache lifetime and the earlier SOA-derived TTL.", reasoning: "The resolver may be reusing a previously valid authoritative negative answer." }
    ],
    sources: ["dns", "dnscache", "dnswire"],
    advanced: "Serve-stale and prefetch policies can modify operational behavior. Distinguish those explicit resolver policies from ordinary fresh TTL-based reuse."
  },
  {
    id: "dns-transport", module: "dns", title: "DNS Over UDP and TCP: Handle Truncation Correctly",
    concepts: ["dns-udp", "dns-tcp", "dns-truncation-retry", "dns-edns"],
    prerequisites: ["dns-caching"],
    meaning: "Traditional DNS uses both UDP and TCP; a truncated UDP answer often requires retrying the query over TCP.",
    why: "Small exchanges fit naturally in datagrams, but large record sets and DNSSEC data need reliable delivery beyond one convenient UDP response. Allowing only UDP can make ordinary lookups work while larger ones fail.",
    model: "UDP sends a complete DNS message without a connection handshake; it does not guarantee arrival. TCP supplies an ordered byte stream with length-prefixed DNS messages. Neither choice makes a resolver correct or secure, and UDP is not universally faster under loss or fragmentation.",
    steps: [
      "Send a DNS query, commonly to UDP port 53; EDNS can advertise an acceptable UDP payload size.",
      "The server limits its UDP response to the relevant size constraints and sets TC when truncation requires another attempt.",
      "The resolver retries using TCP, where a two-byte length prefix delimits each DNS message within the stream.",
      "Reuse or close the TCP connection according to implementation policy; handle timeouts, multiple outstanding questions and response matching."
    ],
    example: {
      given: "A resolver advertises a 1232-byte UDP payload limit. The complete answer would require 1800 bytes and the server returns TC=1.",
      steps: [
        "The resolver reads the truncation flag instead of treating the partial record list as complete.",
        "It establishes TCP to the DNS server's port 53 and resends the question.",
        "The server sends the full length-prefixed answer over the stream; the resolver validates and caches the resulting records."
      ],
      result: "A working UDP path is insufficient when the required TCP retry is blocked."
    },
    failure: "A firewall allowing UDP/53 but denying TCP/53 can produce size-dependent DNS failures. Large fragmented UDP responses can also disappear because of path filtering or fragment loss.",
    confusions: ["TCP DNS is not reserved only for zone transfers.", "EDNS advertises message size; it does not guarantee the network can deliver that size without fragmentation."],
    observe: "Compare dig example.com DNSKEY +dnssec with a suitable domain and dig +tcp. In a permitted capture, inspect TC and the subsequent TCP connection rather than assuming every timeout is a missing record.",
    interview: { answer: "DNS commonly starts with UDP, but TCP support is essential for truncation recovery and other exchanges.", followups: ["Why can DNSSEC expose a previously hidden TCP firewall problem?", "How does a TCP receiver find the boundary between DNS messages?"] },
    recall: [{ question: "Which flag signals a truncated DNS response?", answer: "TC." }, { question: "How is DNS framed over TCP?", answer: "Each message has a two-byte length prefix." }],
    tasks: [
      { kind: "Predict", prompt: "UDP returns TC=1 and TCP/53 is denied. Can the partial reply safely stand in for the whole answer?", hint: "What does truncation declare?", answer: "No; retry cannot complete and resolution may fail.", reasoning: "TC warns that the datagram is not the full required response." },
      { kind: "Compare", prompt: "Why is 'UDP is always faster for DNS' a poor rule on a lossy path?", hint: "Include retries and TCP reuse.", answer: "Loss, timeout costs, fragmentation and reused TCP connections can reverse the comparison.", reasoning: "User latency depends on completed exchanges, not merely the absence of an initial handshake." }
    ],
    sources: ["dnswire", "udp", "tcp"],
    advanced: "Modern DNS transport requirements update the original specifications. EDNS size choices, persistent TCP and encrypted transports should be checked against current resolver implementation guidance."
  },
  {
    id: "dns-routing-policy", module: "dns", title: "Reverse DNS, Split Horizon and DNS Load Distribution",
    concepts: ["dns-ptr-record", "dns-reverse-lookup", "dns-split-horizon", "dns-load-balancing"],
    prerequisites: ["dns-records", "dns-caching"],
    meaning: "DNS can map addresses back to names and return different service answers according to administrative view or traffic policy.",
    why: "Operators need readable logs, private internal destinations and traffic distribution. These solve different problems: reverse lookup describes an address, split horizon selects a naming view, and load distribution offers connection candidates.",
    model: "Forward and reverse DNS are separately administered directories, not automatic inverses. DNS load balancing guides future connection attempts, not every packet; client caching and connection reuse weaken any attempt to count users by answer frequency.",
    steps: [
      "For an IPv4 reverse lookup, reverse the address octets and query PTR below in-addr.arpa; IPv6 uses reversed hexadecimal nibbles below ip6.arpa.",
      "Configure internal and external resolver views to publish appropriate records for the same name.",
      "For distribution, return multiple addresses or policy-selected answers and choose suitable TTLs.",
      "Monitor endpoint health and update answers, remembering that cached records and existing connections can outlive policy changes."
    ],
    example: {
      given: "In a configured private .test lab with simulated internal and external DNS views, 192.0.2.80 has PTR web.example.test. Internal api.example.test returns 10.0.0.8; the external test view returns 192.0.2.90 and 192.0.2.91.",
      steps: [
        "A reverse query asks 80.2.0.192.in-addr.arpa for PTR and obtains the descriptive name.",
        "A VPN client using the internal resolver reaches the private API address.",
        "An outside test client receives external-view candidates, chooses one, then reuses its connection; later DNS rotation does not move that live connection."
      ],
      result: "Reverse identity, naming visibility and connection distribution remain separate administrative decisions."
    },
    failure: "A browser using an external encrypted resolver may miss an internal DNS view and fail to find a private service even while the VPN route works.",
    confusions: ["A PTR name is not proof that the remote peer owns that identity; authenticate the application separately.", "Multiple A records do not promise even traffic or an ordered failover contract for every client."],
    observe: "Use dig -x 192.0.2.80 as a syntax example, then compare internal and external queries for an authorized test domain. Record resolver choice as well as returned addresses.",
    interview: { answer: "Reverse DNS labels addresses, split horizon varies answers by view, and DNS balancing steers new connections with cache-related limits.", followups: ["Why might removing an address not immediately drain its traffic?", "Who normally controls reverse DNS for an allocated address block?"] },
    recall: [{ question: "What type stores a reverse mapping?", answer: "PTR." }, { question: "Does DNS rotation redistribute an established TCP connection?", answer: "No." }],
    tasks: [
      { kind: "Explain", prompt: "Write the IPv4 reverse-query name for 192.0.2.7.", hint: "Reverse octets, then append the reverse namespace.", answer: "7.2.0.192.in-addr.arpa.", reasoning: "Reverse DNS organizes IPv4 addresses from the least specific octet outward." },
      { kind: "Diagnose", prompt: "A VPN client can reach an internal IP but its browser resolves the service publicly. Which configuration deserves checking?", hint: "Routing and resolver selection are separate.", answer: "The browser's DNS provider and internal split-horizon resolver integration.", reasoning: "A correct private route does not force name queries through the private DNS view." }
    ],
    sources: ["dns", "dnswire", "dnsprivacy"],
    advanced: "Resolver location, client-subnet signaling and privacy policy can influence geographic answers. Reverse zones may need delegation arrangements independent of forward zone ownership."
  },
  {
    id: "dns-trust-privacy", module: "dns", title: "DNSSEC, DoH and DoT Protect Different Boundaries",
    concepts: ["dnssec", "dns-over-https", "dns-over-tls", "dns-cache-poisoning"],
    prerequisites: ["dns-transport", "dns-zones"],
    meaning: "DNSSEC authenticates signed DNS data, while DoH and DoT encrypt the connection carrying queries to a resolver.",
    why: "An attacker may forge answers, and a network observer may learn queried names. Authenticity and confidentiality are distinct needs; solving one does not automatically solve the other.",
    model: "DNSSEC is a chain of signed statements tied to a trust anchor. DoH wraps DNS in HTTPS and DoT uses a dedicated TLS transport, commonly port 853. The chosen resolver still sees queries, and unsigned zones do not become signed merely because the channel is encrypted.",
    steps: [
      "A validating resolver starts from a configured trust anchor and checks parent DS relationships and child DNSKEY material.",
      "It verifies record signatures and, for signed negative responses, authenticated denial-of-existence proofs.",
      "A client can establish an authenticated encrypted channel to its resolver using DoH or DoT.",
      "Keep validation state and transport state separate: a secure channel can carry a bogus DNS result, and signed data can travel over plaintext DNS."
    ],
    example: {
      given: "A client uses DoH to a trusted resolver. A signed child zone rotates keys but leaves a stale DS in its parent.",
      steps: [
        "HTTPS protects the client-to-resolver exchange from local passive reading or modification.",
        "The resolver checks the child key against the parent's DS and finds that the trust chain no longer matches.",
        "A validating resolver normally returns failure instead of treating the reachable authority's address record as trustworthy."
      ],
      result: "Encrypted transport succeeds while DNSSEC validation fails; SERVFAIL here is not NXDOMAIN."
    },
    failure: "Forged answers accepted into a cache can misdirect later clients: cache poisoning. DNSSEC rejects invalid signed data, but disabling validation hides a broken trust chain instead of repairing it. Encryption to an untrustworthy resolver does not stop it lying.",
    confusions: ["DNSSEC does not encrypt domain names or answer contents.", "DoH does not prove that an answer originated from the zone's authority; it authenticates the HTTPS peer."],
    observe: "Inspect dig +dnssec results and resolver validation logs on a domain you control. Requesting DNSSEC records is not itself independent validation; AD should be trusted only with an appropriate trusted resolver channel.",
    interview: { answer: "DNSSEC provides origin authentication and integrity for signed DNS data; DoH and DoT provide confidentiality to the selected resolver.", followups: ["What happens when a signed delegation's DS no longer matches?", "Who still learns the queried name after DoH is enabled?"] },
    recall: [{ question: "Does DNSSEC hide queries?", answer: "No." }, { question: "Does DoT make an unsigned zone DNSSEC-authenticated?", answer: "No." }],
    tasks: [
      { kind: "Compare", prompt: "Which protection addresses passive reading on the client-to-resolver link: DNSSEC or DoT?", hint: "Signatures are not encryption.", answer: "DoT.", reasoning: "TLS encrypts that channel; DNSSEC records remain readable when carried over plaintext transport." },
      { kind: "Diagnose", prompt: "An authority answers, but validators fail after a key rollover. What evidence should you compare?", hint: "Inspect the delegation's cryptographic link.", answer: "Parent DS, child DNSKEY and valid signatures with their time windows.", reasoning: "Reachability does not establish a valid signed chain, and rollover mismatches can yield SERVFAIL." },
      { kind: "Predict", prompt: "A forged A record enters a resolver cache with TTL 300. Can later clients be misdirected without receiving a fresh forged packet themselves?", hint: "The resolver reuses its stored answer.", answer: "Yes, while it reuses that poisoned entry.", reasoning: "Caching amplifies a successfully accepted false mapping; signed-data validation protects against invalid signatures where a valid signed chain applies." }
    ],
    sources: ["dns", "dnsprivacy", "dot", "dnssec", "tls", "kr"],
    advanced: "NSEC/NSEC3 denial proofs and key-rollover timing deserve a dedicated standards treatment. DNS privacy does not hide subsequent destination IPs or all traffic metadata."
  },
  {
    id: "http-semantics", module: "http", title: "URLs, Origins and HTTP Request Semantics",
    concepts: ["http-url", "http-origin", "http-request", "http-response", "http-methods", "http-status-codes", "http-headers", "http-safe-methods", "http-idempotency"],
    prerequisites: ["dns-resolution"],
    meaning: "HTTP exchanges requests and responses whose methods, status codes and headers describe operations on resources identified by URLs.",
    why: "Clients and servers need shared operation meanings, not just a byte connection. Those meanings let browsers, caches and retry logic make decisions without understanding every application's internal implementation.",
    model: "A URL identifies a resource using scheme, authority, path and optional query; its fragment is handled client-side. An origin is scheme, host and effective port, not a whole URL. Safe methods request read-like semantics; idempotent methods promise the same intended effect when repeated, not identical responses.",
    steps: [
      "Parse the URL, resolve its host, and establish an appropriate connection; origin comparisons include the effective port.",
      "Send a method, request target and headers, plus a body where the operation defines one.",
      "The server evaluates routing, authorization and operation semantics, then returns status, headers and possibly content.",
      "The client interprets the result: 2xx success, 3xx redirection or related handling, 4xx client-side request problems, and 5xx server-side failure."
    ],
    example: {
      given: "In a configured private .test lab, a client requests https://api.example.test/items/7?view=short#details, then sends DELETE for /items/7 twice.",
      steps: [
        "The origin is https, api.example.test, 443; #details is not sent in the HTTP request target.",
        "The first DELETE removes item 7 and returns 204.",
        "The second can return 404 because the item is already absent; the intended deletion effect remains the same."
      ],
      result: "Idempotency concerns repeated effect, so different status responses do not automatically violate it."
    },
    failure: "Using GET to charge a card violates safe semantics and can trigger unintended changes through retries, crawlers or prefetching. POST retries can duplicate purchases unless the application supplies deduplication.",
    confusions: ["Logging a GET is compatible with safety; requesting a harmful state change is not.", "A 200 response can still contain an application-level error; HTTP success is not a universal business guarantee."],
    observe: "Inspect method, request URL, status and response headers in DevTools. With curl -i on an authorized URL, distinguish protocol status from the page's human-readable message.",
    interview: { answer: "HTTP gives resource operations explicit semantics; safe means read-like intent and idempotent means repeatable intended effect.", followups: ["Why is PUT generally idempotent while POST is not guaranteed to be?", "When would an idempotency key make a retry safer?"] },
    recall: [{ question: "Is a URL fragment sent in the request target?", answer: "No." }, { question: "Must repeated idempotent requests return the same status?", answer: "No." }],
    tasks: [
      { kind: "Compare", prompt: "Are https://example.test/a and https://example.test:443/b same-origin?", hint: "Use the default HTTPS port.", answer: "Yes.", reasoning: "Scheme, hostname and effective port match; paths do not define origins." },
      { kind: "Predict", prompt: "A POST purchase times out after server processing. Is blind retry guaranteed safe?", hint: "A timeout does not prove nonexecution.", answer: "No; it may create a second purchase.", reasoning: "POST has no general idempotency promise, and the missing reply leaves the first operation's outcome uncertain." }
    ],
    sources: ["http", "mdn"],
    advanced: "Status 401 normally challenges authentication; 403 refuses permission. Conditional operations and application-specific idempotency keys refine retry safety beyond the method label."
  },
  {
    id: "http-one-framing", module: "http", title: "HTTP/1.1 Persistence, Framing and Safe Transitions",
    concepts: ["http-one-persistent-connections", "http-one-message-framing", "http-content-length", "http-chunked-encoding", "http-protocol-transition"],
    prerequisites: ["http-semantics"],
    meaning: "HTTP/1.1 can reuse one connection for several messages only when peers agree exactly where each message ends.",
    why: "A TCP stream has no built-in request boundaries. Persistence avoids repeated connection setup, but ambiguous framing lets intermediaries disagree about bytes and creates request-smuggling or protocol-transition risks.",
    model: "A stream is a ribbon of bytes; HTTP parsing cuts it into messages using protocol rules. Content-Length describes a body length, and chunked transfer coding delimits chunks and termination. They are not interchangeable guesses; safe implementations reject ambiguity instead of choosing convenient interpretations.",
    steps: [
      "Parse the start line and headers with strict framing rules, accounting for methods and statuses that prohibit a message body.",
      "Read exactly the specified body length or valid chunked sequence; do not mistake a chunk boundary for a new response.",
      "Reuse the connection only when message completion and connection state are known; close-delimited responses cannot support the next response on that connection.",
      "For a CONNECT tunnel, use the simple safe strategy: wait for a successful 2xx response before forwarding untrusted tunnel data. Likewise, wait for the WebSocket opening handshake response."
    ],
    example: {
      given: "In a configured private .test lab, a persistent response has Content-Length: 5 and body HELLO, followed by another response. A separate proxy receives CONNECT target.example.test:443.",
      steps: [
        "The first parser consumes five body bytes, leaving the next response's status line untouched.",
        "Without an agreed boundary, those next bytes could be mistaken for content.",
        "The CONNECT client waits for 2xx before sending tunnel bytes; if rejected, untrusted data has not already entered the HTTP parsing path."
      ],
      result: "Correct boundaries permit reuse; waiting at protocol transitions prevents avoidable interpretation confusion."
    },
    failure: "Conflicting Content-Length and Transfer-Encoding handling across a proxy and server can desynchronize their request boundaries. Merely encrypting the connection does not repair parser disagreement.",
    confusions: ["Persistent means reusable, not multiplexed; ordinary HTTP/1.1 exchanges still have ordering constraints.", "Transfer framing is not the same as content encoding such as gzip."],
    observe: "Use curl --http1.1 -v against a permitted service and inspect Content-Length, Transfer-Encoding and Connection. Do not test malformed requests against systems you do not own.",
    interview: { answer: "HTTP/1.1 persistence depends on unambiguous message framing; protocol switches need explicit successful boundaries before untrusted bytes proceed.", followups: ["Why is a response delimited by connection close unsuitable for further reuse?", "How can two individually permissive parsers create a security problem together?"] },
    recall: [{ question: "Does TCP supply HTTP message boundaries?", answer: "No." }, { question: "What is the simplest safe CONNECT forwarding policy?", answer: "Wait for a successful 2xx response before forwarding untrusted tunnel payload." }],
    tasks: [
      { kind: "Calculate", prompt: "A body has Content-Length: 5 and the stream begins HELLOHTTP/1.1. Where does the body end?", hint: "Count only body bytes.", answer: "After HELLO.", reasoning: "The next H belongs to subsequent framing, not this five-byte body." },
      { kind: "Diagnose", prompt: "A CONNECT client sends untrusted tunnel payload before receiving a decision. What simple change reduces transition risk?", hint: "Place a confirmation before forwarding.", answer: "Wait for the proxy's successful 2xx response.", reasoning: "Rejection then cannot leave optimistic payload available to be misinterpreted as further HTTP requests." }
    ],
    sources: ["http1", "http", "transitions"],
    advanced: "RFC 9931 updates HTTP/1.1 optimistic transition security. Its detailed requirements distinguish waiting, connection closure and proxy knowledge; do not generalize them into a blanket close rule for every rejected Upgrade."
  },
  {
    id: "http-caching", module: "http", title: "Freshness, ETags and Conditional HTTP Requests",
    concepts: ["http-cache", "http-cache-control", "http-etag", "http-validators", "http-conditional-requests"],
    prerequisites: ["http-semantics"],
    meaning: "HTTP caches either reuse a fresh representation or validate a stored one before deciding whether to transfer its body again.",
    why: "Repeated downloads waste bandwidth and time. Caches need explicit freshness and sharing rules so that efficiency does not accidentally expose personalized data or serve old content indefinitely.",
    model: "Freshness is permission to reuse without asking; a validator is evidence for asking whether the stored version still matches. An ETag is an opaque version identifier, not necessarily a hash. A 304 response updates reuse metadata without carrying a replacement representation body.",
    steps: [
      "Store eligible responses with their cache directives, timestamps and validators; shared caches also honor private and authorization-related rules.",
      "Compute freshness using age and lifetime, rather than restarting max-age whenever an intermediary forwards a response.",
      "When stale, send If-None-Match with the stored ETag or an appropriate date validator.",
      "On 304, reuse the stored body with updated metadata; on 200, store the new representation when permitted."
    ],
    example: {
      given: "A response carries Cache-Control: max-age=60 and ETag: \"v7\". The cache receives it at t=0 with negligible initial age.",
      steps: [
        "At t=30 the cache can reuse it without an origin request.",
        "At t=80 it sends If-None-Match: \"v7\" because freshness has expired.",
        "If the server still has v7, it returns 304 and the client uses the saved body; if now v8, it returns 200 with the new body."
      ],
      result: "Validation can save body bandwidth even when it cannot remove the validation round trip."
    },
    failure: "A shared cache that stores user-specific content without suitable private or no-store policy can leak one user's response to another. Ignoring Vary can similarly mix representations selected by different request headers.",
    confusions: ["no-cache permits storage but requires validation before reuse; no-store forbids storage by compliant caches.", "A cache hit does not necessarily mean the response is fresh; it might have been successfully revalidated."],
    observe: "Inspect Cache-Control, Age, ETag, Vary and conditional requests in DevTools. Disable-cache options change the experiment; record whether they are enabled before comparing results.",
    interview: { answer: "Fresh caches avoid a request, while validators let stale caches check versions and reuse bodies after 304.", followups: ["Why can 304 improve bandwidth but not eliminate latency?", "How does Vary affect the cache key?"] },
    recall: [{ question: "Does no-cache mean never store?", answer: "No; it requires validation before reuse." }, { question: "What header sends a stored ETag for validation?", answer: "If-None-Match." }],
    tasks: [
      { kind: "Predict", prompt: "A stale representation has matching ETag at the origin. Which response avoids retransmitting its body?", hint: "The client supplies If-None-Match.", answer: "304 Not Modified.", reasoning: "The existing representation remains valid, so the cache can use its saved body." },
      { kind: "Compare", prompt: "Which directive better prevents compliant storage of sensitive content: no-cache or no-store?", hint: "Validation and storage are different actions.", answer: "no-store.", reasoning: "no-cache allows retention, whereas no-store prohibits storing the response." }
    ],
    sources: ["cache", "http", "mdn"],
    advanced: "Weak validators are sufficient for some cache comparisons but not all range or modification preconditions. If-Match can prevent lost updates; it solves a different problem from freshness."
  },
  {
    id: "http-cookies-sessions", module: "http", title: "Cookies and Sessions: Remembering Without Trusting",
    concepts: ["http-cookies", "http-session", "cookie-samesite", "cookie-secure", "cookie-httponly"],
    prerequisites: ["http-semantics"],
    meaning: "Cookies let a browser attach scoped stored values to requests, often linking otherwise independent HTTP exchanges to server-side session state.",
    why: "A login must persist across requests, but the server should not trust arbitrary client-supplied claims. An opaque session identifier lets the server retain identity and permissions while the browser carries only a reference.",
    model: "A session cookie resembles a temporary claim ticket: possession matters, and the server decides whether it remains valid. Cookies are scoped by domain, path and other rules, not by the exact same-origin tuple. Browser protections reduce exposure but do not make stolen session identifiers harmless.",
    steps: [
      "After authenticated login, create a new unpredictable session identifier and store its server-side user association.",
      "Return Set-Cookie with appropriate Secure, HttpOnly, SameSite and lifetime attributes.",
      "The browser evaluates cookie scope and policy when deciding whether to include Cookie on subsequent requests.",
      "The server checks session validity and operation authorization on every request; rotate identifiers and invalidate them on logout or security-sensitive changes."
    ],
    example: {
      given: "Login sets sid=RANDOM with Secure; HttpOnly; SameSite=Lax. The server maps that value to user 42 until expiry.",
      steps: [
        "A later matching HTTPS request includes sid; JavaScript cannot directly read an HttpOnly cookie.",
        "The server retrieves user 42, then checks whether user 42 may edit the requested document.",
        "After logout invalidates the mapping, replaying the old sid no longer establishes a valid session."
      ],
      result: "Remembering the user and authorizing a specific operation are separate checks."
    },
    failure: "Reusing a pre-login session identifier can enable session fixation. A valid session also does not prevent cross-site request forgery unless request and cookie policies appropriately protect state-changing actions.",
    confusions: ["HttpOnly blocks direct script reads, not all harmful actions by injected scripts.", "Secure restricts cookie transport to secure contexts; it is not encryption of the value in browser storage."],
    observe: "Inspect Set-Cookie and subsequent Cookie headers in DevTools using a test account. Never paste real session values into shared logs, screenshots or debugging requests.",
    interview: { answer: "Cookies carry scoped client state; sessions commonly use opaque cookies to refer to server-controlled identity with independent authorization.", followups: ["Why rotate the session identifier after login?", "Why does SameSite not replace all CSRF defenses?"] },
    recall: [{ question: "Which attribute blocks direct JavaScript cookie reads?", answer: "HttpOnly." }, { question: "Does successful session lookup grant every permission?", answer: "No; authorization is still operation-specific." }],
    tasks: [
      { kind: "Diagnose", prompt: "A logged-in user changes a URL to edit someone else's document and succeeds. Is the cookie mechanism the missing check?", hint: "Identity and permission differ.", answer: "The server is missing object-level authorization.", reasoning: "Recognizing the requester does not establish ownership or editing permission." },
      { kind: "Predict", prompt: "An invalidated server-side session cookie is resent. Should possession alone restore login?", hint: "The ticket refers to server state.", answer: "No.", reasoning: "The server must reject identifiers whose session mapping has expired or been revoked." }
    ],
    sources: ["mdn", "http", "kr"],
    advanced: "Cross-site cookie restrictions, partitioning and browser changes affect embedded applications. Stateless signed tokens have different revocation tradeoffs; they are not automatically safer than server sessions."
  },
  {
    id: "http-intermediaries", module: "http", title: "Proxies, Redirects and Where HTTPS Ends",
    concepts: ["http-forward-proxy", "http-reverse-proxy", "http-redirect", "http-connect-tunnel", "http-tls-termination"],
    prerequisites: ["http-one-framing", "http-caching"],
    meaning: "HTTP intermediaries forward requests on someone's behalf, while redirects ask the client to make a new request to a different URL.",
    why: "Organizations use outbound policy proxies, gateways, shared caches and reverse proxies to centralize functions. Knowing which component actually handles a request explains authentication boundaries, client-address evidence and apparent backend failures.",
    model: "A forward proxy represents the client side; a reverse proxy fronts servers. A tunnel passes bytes after CONNECT succeeds, whereas TLS termination makes the intermediary an encrypted connection endpoint with plaintext access there. A redirect is not invisible internal forwarding.",
    steps: [
      "For an ordinary proxied request, the intermediary receives HTTP and forwards an appropriate request, enforcing its own routing and policy.",
      "For HTTPS through CONNECT, wait for successful tunnel establishment, then perform TLS through that tunnel to the intended server.",
      "At a TLS-terminating reverse proxy, authenticate the public endpoint and separately configure protection and identity on the backend hop.",
      "On a redirect response, evaluate Location and redirect semantics before issuing a new client request; avoid forwarding credentials to an unrelated origin."
    ],
    example: {
      given: "In a configured private .test lab, a gateway terminates HTTPS for shop.example.test and forwards to an internal service. POST /pay receives 307 Location: /pay-v2.",
      steps: [
        "The browser authenticates the gateway's shop certificate; this says nothing by itself about encryption on the backend hop.",
        "The gateway forwards according to its backend policy and receives 307.",
        "The browser follows the redirect preserving POST and its body; it has made another request rather than observing an internal rewrite."
      ],
      result: "Client-to-gateway security, gateway-to-backend security and redirect behavior must be reasoned about separately."
    },
    failure: "Trusting arbitrary client-provided forwarding headers lets a client fake its original address. Only accept such metadata from known trusted proxies and sanitize incoming copies.",
    confusions: ["A 307 or 308 preserves the method; 303 directs retrieval using GET or HEAD, and historical 301/302 behavior can change POST to GET.", "A CONNECT tunnel alone does not make its inner bytes encrypted; TLS must provide that."],
    observe: "Use curl -I without automatic following to see Location, then compare a deliberate follow with -L on an authorized endpoint. DevTools reveals each client-visible redirect, not necessarily each internal proxy hop.",
    interview: { answer: "Proxies forward internally; redirects trigger new client requests, and TLS termination identifies an explicit plaintext boundary.", followups: ["Who can inspect content at a terminating reverse proxy?", "Why should backend trust not depend on a raw X-Forwarded-For value?"] },
    recall: [{ question: "Which redirect preserves a POST method unambiguously?", answer: "307 or 308." }, { question: "Does a browser see every reverse-proxy backend hop?", answer: "No." }],
    tasks: [
      { kind: "Predict", prompt: "POST /submit gets 303 to /receipt. What follow-up retrieval method should normally be used?", hint: "303 is not a method-preserving redirect.", answer: "GET, unless the original method was HEAD.", reasoning: "303 points to a retrieval resource rather than requesting repetition of the original POST." },
      { kind: "Diagnose", prompt: "Public HTTPS is valid but gateway-to-backend traffic is plaintext. Is the entire route encrypted end to end?", hint: "Identify both connection endpoints.", answer: "No.", reasoning: "TLS ends at the gateway; the separate backend hop needs its own protection if required." }
    ],
    sources: ["http", "http1", "tls", "mdn"],
    advanced: "Intermediaries must handle hop-by-hop fields and framing consistently. Certificate identity, backend authentication and log attribution are separate controls even inside a private network."
  },
  {
    id: "http-two", module: "http", title: "HTTP/2 Frames, Streams, HPACK and TCP Blocking",
    concepts: ["http-two-frames", "http-two-streams", "http-hpack", "http-two-tcp-head-of-line-blocking"],
    prerequisites: ["http-one-framing"],
    meaning: "HTTP/2 multiplexes independently identified HTTP streams into binary frames on one connection and compresses header fields using HPACK.",
    why: "A page often needs many objects. HTTP/1.1 response ordering and multiple connection setup can waste time; HTTP/2 interleaves work while retaining familiar method, status and cache semantics.",
    model: "Streams are labeled conversations sharing one delivery pipe. HTTP/2 removes application-level serialization between many responses, but TCP still delivers a single ordered byte stream. A lost TCP segment can therefore delay frames for otherwise independent HTTP streams.",
    steps: [
      "Negotiate HTTP/2 where appropriate, commonly through TLS ALPN, then exchange connection settings.",
      "Create streams with identifiers and carry headers in HEADERS-related frames and content in DATA frames.",
      "Encode header blocks with HPACK static and dynamic tables; decoder state belongs to the connection and must remain synchronized.",
      "Apply stream and connection flow control to DATA, interleave ready frames, and respect resets or orderly shutdown."
    ],
    example: {
      given: "Stream 1 carries HTML and stream 3 carries an image. Their frames occupy consecutive TCP byte ranges; the earlier range is lost.",
      steps: [
        "The server can interleave image DATA with HTML DATA without finishing one response first.",
        "The receiver may already possess later TCP segments containing image frames.",
        "TCP withholds those later bytes from HTTP/2 until the missing range is recovered, delaying both streams' useful processing."
      ],
      result: "Multiplexing removes one form of head-of-line blocking, but not TCP's delivery-order constraint."
    },
    failure: "An unread or flow-controlled stream can consume buffering resources; connection-wide flow control can affect other streams. Multiplexing is not unlimited memory or an automatic priority guarantee.",
    confusions: ["HPACK compresses headers, not response bodies.", "A stream is not a separate TCP connection, and its identifier does not imply independent transport loss recovery."],
    observe: "Enable the Protocol column in browser DevTools and look for h2. Timing alone cannot prove TCP head-of-line blocking; packet evidence or controlled loss experiments are needed.",
    interview: { answer: "HTTP/2 uses framed multiplexed streams and HPACK, but all streams still share TCP's ordered delivery.", followups: ["Why can an image be delayed by a missing HTML-related byte range?", "How do stream-level and connection-level flow-control limits differ?"] },
    recall: [{ question: "What does HPACK encode?", answer: "HTTP header fields." }, { question: "Does HTTP/2 remove TCP head-of-line blocking?", answer: "No." }],
    tasks: [
      { kind: "Predict", prompt: "A TCP gap precedes bytes containing stream 9 frames. Can HTTP/2 process those bytes immediately through normal TCP delivery?", hint: "TCP exposes ordered bytes.", answer: "No.", reasoning: "The stream labels exist above TCP, which withholds bytes after an unresolved sequence gap." },
      { kind: "Compare", prompt: "Does adopting HTTP/2 require changing GET and 404 meanings?", hint: "Separate representation from semantics.", answer: "No.", reasoning: "The wire framing changes, while HTTP method and status semantics remain shared." }
    ],
    sources: ["http2", "http", "tcp"],
    advanced: "HPACK's compression state creates implementation and security considerations. Prioritization has evolved across HTTP implementations; do not assume one browser scheduling policy is required by every server."
  },
  {
    id: "http-three", module: "http", title: "HTTP/3, QUIC Negotiation and Connection Reuse",
    concepts: ["http-three-quic", "http-three-qpack", "http-protocol-negotiation", "http-connection-reuse"],
    prerequisites: ["http-two", "dns-records"],
    meaning: "HTTP/3 maps HTTP exchanges onto QUIC streams, integrating secure transport while avoiding TCP's single delivery-order dependency across streams.",
    why: "Loss on a shared TCP connection can delay unrelated HTTP exchanges. QUIC provides independently delivered streams and supports connection identity beyond a fixed address tuple, while retaining congestion control and reliable stream data.",
    model: "Several reliable lanes share a managed road: a missing byte blocks its own stream, not necessarily every other stream. All lanes still compete for congestion window and bandwidth. QUIC uses UDP as its substrate; HTTP/3 is not unreliable HTTP or TLS wrapped around an ordinary TCP connection.",
    steps: [
      "Discover an HTTP/3 possibility through mechanisms such as HTTPS records or Alt-Svc; the client may keep a working earlier-protocol connection.",
      "Establish QUIC with its integrated TLS handshake and authenticate the server; negotiate the HTTP/3 application protocol.",
      "Use request streams and required control streams, decoding headers with QPACK's explicit dependency management.",
      "Reuse the connection when identity and policy permit; recover stream loss, apply congestion control and fall back when UDP reachability fails."
    ],
    example: {
      given: "A browser first reaches an origin over h2 and receives an Alt-Svc advertisement for h3. Later, it tries QUIC while downloading two objects.",
      steps: [
        "The advertisement suggests an alternative service; the browser still authenticates the intended origin.",
        "A lost packet containing only stream A data need not withhold already available stream B data.",
        "If the network blocks QUIC's UDP traffic, the browser can continue or retry using the viable h2 path."
      ],
      result: "HTTP/3 can reduce cross-stream delivery blocking, but success and performance depend on the actual network and client policy."
    },
    failure: "Treating Alt-Svc as permission to skip certificate checks would let discovery override origin identity. Firewalls blocking UDP can also prevent QUIC even when HTTPS over TCP works.",
    confusions: ["HTTP/3 retains reliable HTTP streams; UDP alone does not define application delivery guarantees.", "Independent delivery does not eliminate shared congestion or QPACK dependency delays."],
    observe: "Inspect Protocol, remote address and connection timing in DevTools across repeated visits. Seeing HTTPS in the URL does not reveal whether HTTP/1.1, HTTP/2 or HTTP/3 carried the request.",
    interview: { answer: "HTTP/3 uses QUIC streams and QPACK, reducing TCP-style cross-stream blocking while keeping authentication and congestion constraints.", followups: ["What remains shared after streams gain independent delivery?", "Why must an advertised alternative still authenticate the origin?"] },
    recall: [{ question: "Which transport carries HTTP/3?", answer: "QUIC over UDP." }, { question: "Does QUIC stream independence remove congestion control?", answer: "No." }],
    tasks: [
      { kind: "Predict", prompt: "Only stream A's bytes are lost; stream B's needed bytes and header dependencies arrived. Must B wait for A solely because of transport order?", hint: "Compare QUIC with TCP's single byte stream.", answer: "No.", reasoning: "QUIC delivers streams independently, though other shared resource limits can still delay B." },
      { kind: "Diagnose", prompt: "h2 succeeds but h3 attempts time out on one office network. What transport policy is worth checking?", hint: "The same URL can use different lower transports.", answer: "UDP reachability and QUIC-related firewall policy.", reasoning: "Working TCP-based HTTPS does not prove the UDP path needed by QUIC is available." }
    ],
    sources: ["http3", "quic", "quictls", "svcb"],
    advanced: "QUIC migration, anti-amplification and 0-RTT have specific validation and replay boundaries. Connection reuse or coalescing requires authentication and authority checks, not merely equal destination addresses."
  },
  {
    id: "browser-policy-journey", module: "http", title: "A Browser Journey: Origins, CORS and Cold/Warm Evidence",
    concepts: ["browser-same-origin-policy", "browser-cors", "browser-preflight", "browser-devtools", "browser-cold-warm-load"],
    prerequisites: ["http-caching", "http-cookies-sessions", "http-three"],
    meaning: "A browser combines DNS, connections, HTTP caching and origin policies, so a request's network success does not guarantee JavaScript can read its response.",
    why: "Pages must not silently read arbitrary authenticated resources from other sites. Same-origin policy limits access; CORS lets a server grant selected cross-origin reads while browser evidence helps separate policy refusal from network failure.",
    model: "CORS is the browser's permission gate for cross-origin response access, not a firewall around the server. Some requests need a preflight; others can be sent before their responses are blocked from script. A warm load may reuse several independent caches and connections.",
    steps: [
      "On a cold visit, resolve the host, establish and authenticate a transport, send HTTP, and discover dependent resources.",
      "Compare a script request's origin to the destination origin; for a non-safelisted cross-origin request, send an OPTIONS preflight when required.",
      "Validate the server's allowed origin, methods, headers and credentials policy before exposing the relevant response to script.",
      "On later visits, inspect DNS, connection and HTTP cache reuse separately instead of interpreting every short timing as an origin-server response."
    ],
    example: {
      given: "In a configured private .test lab, https://app.example.test fetches https://api.example.test/data using a custom X-Report header. The API is reachable but does not allow that header.",
      steps: [
        "The hostname differs, so the request is cross-origin even though both names share example.test.",
        "The browser preflights and asks whether X-Report is allowed.",
        "The failed permission check prevents the intended request from proceeding; a direct curl request can still reach the API because curl does not enforce browser CORS.",
        "A second page visit may reuse a connection, yet the same policy error remains."
      ],
      result: "Transport reachability, HTTP status, script visibility and warm-load speed are distinct observations."
    },
    failure: "Using Access-Control-Allow-Origin: * with credentialed browser access does not provide the intended permission. Also, CORS is not a substitute for server-side authentication, authorization or CSRF controls.",
    confusions: ["Same-site is not the same as same-origin.", "A blocked cross-origin response does not prove the server never received a request."],
    observe: "Use DevTools Network and Console together. Record initiator, preflight, status, cache indication and connection timing; compare a normal reload with cache disabled while noting service-worker involvement.",
    interview: { answer: "Browsers enforce origin-based response access; CORS grants scoped exceptions, and cold/warm timings reflect several separate reuse layers.", followups: ["Why can curl succeed when fetch fails?", "Which timing stages might disappear on a warm connection without an HTTP cache hit?"] },
    recall: [{ question: "Who enforces browser CORS response access?", answer: "The browser." }, { question: "Does a warm TLS connection imply a cached HTTP body?", answer: "No." }],
    tasks: [
      { kind: "Diagnose", prompt: "curl sees 200 but browser fetch reports CORS failure. Is a DNS outage the best first explanation?", hint: "Successful direct HTTP is already evidence.", answer: "No; inspect origin and CORS response or preflight policy.", reasoning: "The server is reachable, while the browser applies an additional access rule." },
      { kind: "Predict", prompt: "A warm connection has no fresh cached body. Can the browser skip the HTTP request altogether merely because TLS is reused?", hint: "Connection reuse is not content reuse.", answer: "No.", reasoning: "It still needs a response or validation exchange to obtain an acceptable representation." }
    ],
    sources: ["mdn", "http", "cache", "tls"],
    advanced: "Preflight caching, service workers and connection coalescing complicate timing experiments. State explicitly which caches were cleared; 'cold' is not one universal browser switch.",
    diagram: "URL -> DNS -> secure connection -> HTTP -> page\n                                      |\nscript -> origin check -> preflight? -> CORS access\nwarm: DNS cache / connection reuse / HTTP cache differ"
  },
  {
    id: "security-threats-identity", module: "security", title: "Threats, Authentication and Authorization",
    concepts: ["network-threat-model", "network-authentication", "network-authorization", "network-spoofing", "network-denial-of-service"],
    prerequisites: ["http-cookies-sessions", "dns-trust-privacy"],
    meaning: "Network security starts by naming the asset, attacker and trust boundary, then separating proof of identity from permission to act.",
    why: "An encrypted connection can still carry a fraudulent login or an unauthorized operation. A useful defense must address the actual threat: observation, modification, impersonation, resource exhaustion or abuse by a legitimate account.",
    model: "Authentication answers 'who is this peer or user?' Authorization answers 'may this identity perform this operation on this object?' A packet's source address is routing metadata, not a sufficient identity credential. Every defense has assumptions about compromised endpoints and available resources.",
    steps: [
      "Identify valuable data and operations, the components that handle them, and where input crosses into trust.",
      "List credible attacker capabilities: passive observation, spoofed traffic, stolen credentials, malicious input or overwhelming request volume.",
      "Authenticate identities with suitable credentials and verify authorization for each operation, including object-level access.",
      "Apply layered protections and limits, then test whether a failed assumption still permits sensitive access or service exhaustion."
    ],
    example: {
      given: "A payroll API authenticates Alice, but /employees/99/salary accepts any employee identifier. A burst of expensive reports also saturates its worker pool.",
      steps: [
        "TLS prevents a local observer reading the request in transit but does not establish Alice's payroll permission.",
        "An object-level authorization check rejects access unless Alice's role and relationship permit employee 99's data.",
        "Request quotas and bounded report execution address exhaustion separately; valid authentication alone does not make unlimited work safe."
      ],
      result: "Confidential transport, identity, access control and availability require distinct decisions."
    },
    failure: "A service that trusts 'internal IP means authorized' becomes exposed when an internal host is compromised or forwarding metadata is forged. Spoofed return addresses can also complicate attribution and reflection defenses.",
    confusions: ["Authentication success is not authorization success.", "DoS may exhaust bandwidth before an application-level rate limiter sees the request."],
    observe: "Review access-denial logs and test with two authorized test accounts having different roles. Confirm that direct object identifiers cannot bypass policy; avoid real sensitive records.",
    interview: { answer: "Threat modeling identifies assets and attacker powers; authentication verifies identity, authorization limits actions, and availability needs resource defenses.", followups: ["Why is network location insufficient proof of permission?", "Which layer must act when attack volume fills the external link?"] },
    recall: [{ question: "Which check decides whether Alice may edit record 99?", answer: "Authorization." }, { question: "Does encryption stop an authenticated user exhausting an API?", answer: "No." }],
    tasks: [
      { kind: "Diagnose", prompt: "A valid user reads another tenant's invoice by changing its ID. Which control is missing?", hint: "Identity was already checked.", answer: "Tenant-aware object authorization.", reasoning: "The system knows the requester but failed to restrict access to the requested resource." },
      { kind: "Compare", prompt: "Does an application rate limiter guarantee protection when the incoming link is already saturated?", hint: "Order the resource bottlenecks.", answer: "No; upstream filtering or capacity protection may be required.", reasoning: "Traffic consumes link capacity before reaching application admission control." }
    ],
    sources: ["kr", "systems", "tls"],
    advanced: "Account recovery, credential lifecycle and insider threats belong in the same model. Address validation can reduce spoofing but cannot replace user or service identity."
  },
  {
    id: "security-cryptographic-tools", module: "security", title: "Encryption, Hashes, MACs and Signatures",
    concepts: ["network-encryption", "network-hash", "network-message-authentication-code", "network-digital-signature", "network-symmetric-cryptography", "network-asymmetric-cryptography"],
    prerequisites: ["security-threats-identity"],
    meaning: "Cryptographic tools provide different guarantees: secrecy, change detection, shared-key authenticity or publicly verifiable signatures.",
    why: "Calling everything 'encrypted' obscures whether tampering is detected and who can verify authorship. Secure protocols combine appropriate primitives instead of assuming one algorithm solves every threat.",
    model: "Symmetric encryption uses shared secret keys; asymmetric systems use related public and private keys for operations such as signatures or key establishment. A plain hash has no secret, so an attacker who changes a message can also recompute its hash. A MAC authenticates to shared-key holders; a signature can be verified without sharing the signing secret.",
    steps: [
      "Choose the needed property and identify which parties must hold or verify which keys.",
      "Use authenticated encryption for confidential records, supplying required unique nonces and authenticating relevant context.",
      "Use a MAC when shared-key peers need integrity and authenticity, or a signature when public verification and separate signing authority are needed.",
      "Verify before trusting content, bind messages to context, and enforce freshness when replay would cause harm."
    ],
    example: {
      given: "A software vendor publishes a package, its SHA-256 digest and a signature verified using a trusted vendor public key.",
      steps: [
        "A digest catches accidental corruption, but replacing both package and digest would defeat that check alone.",
        "The signature verifier uses the trusted public key to detect an unauthorized replacement.",
        "Encryption would hide package contents but would not, by itself, prove vendor origin; version policy is also needed to reject an old valid package."
      ],
      result: "Integrity, origin, confidentiality and freshness are separate properties even when several are combined in one protocol."
    },
    failure: "Reusing a nonce with some authenticated-encryption schemes can catastrophically undermine security. Implementing cryptography from scratch or omitting context and replay checks creates failures beyond algorithm choice.",
    confusions: ["A digital signature does not encrypt the message.", "Anyone sharing a MAC key can create a valid MAC, so it is not the same public authorship evidence as a signature."],
    observe: "Verify a public software release using its documented signature process and an independently trusted key. A matching checksum downloaded from the same compromised location is weaker evidence.",
    interview: { answer: "Encryption hides content, hashes detect changes without secret authenticity, MACs authenticate shared-key messages, and signatures support public verification.", followups: ["Why does a plain digest not prevent deliberate tampering?", "Why can a valid authenticated message still be an unsafe replay?"] },
    recall: [{ question: "Which primitive uses a shared secret to authenticate a message?", answer: "A MAC." }, { question: "Can signature verification use a public key?", answer: "Yes." }],
    tasks: [
      { kind: "Diagnose", prompt: "An attacker changes a file and the adjacent plain checksum. Why can the checksum still match?", hint: "No secret is involved.", answer: "The attacker can compute the new digest.", reasoning: "An untrusted digest cannot authenticate content against someone able to replace both values." },
      { kind: "Compare", prompt: "Why can't a shared MAC key prove which of two holders authored a message?", hint: "Who can generate the tag?", answer: "Either holder can generate it.", reasoning: "MAC verification establishes shared-key possession, not uniquely attributable public signing." }
    ],
    sources: ["tls", "kr", "systems"],
    advanced: "Use vetted protocols and libraries. Key exchange, password hashing, nonce management and post-quantum choices have specific requirements not captured by simply naming a primitive."
  },
  {
    id: "tls-certificates", module: "security", title: "Certificate Chains, Hostnames and Expiry",
    concepts: ["tls-certificate-trust-chain", "tls-hostname-verification", "tls-certificate-expiry", "tls-trust-anchor"],
    prerequisites: ["security-cryptographic-tools", "http-intermediaries"],
    meaning: "A TLS client authenticates a server by checking certificate identity, a valid chain to a trusted anchor and proof that the peer controls the associated private key.",
    why: "Encryption with an impostor still exposes secrets to the impostor. Certificate validation binds a connection to the intended service name using explicitly configured trust, not just whichever server answered DNS.",
    model: "Certificates are signed identity bindings, not magical trust tokens. A root in the trust store is trusted by configuration; an intermediate's signature helps extend that trust subject to policy. A valid chain does not excuse the wrong hostname, expired validity or missing private-key proof.",
    steps: [
      "Determine the reference identity from the intended service URL, rather than accepting a convenient name suggested by the peer.",
      "Build and verify a permitted certificate path to a configured trust anchor, checking signatures, constraints and suitable key usage.",
      "Check validity times and hostname matching against the appropriate subject alternative names; apply revocation and platform policy where relevant.",
      "Verify the handshake's certificate-based signature and completion so a copied certificate alone cannot impersonate the server."
    ],
    example: {
      given: "In a configured private .test lab, the client requests https://pay.example.test. The peer presents an unexpired certificate for shop.example.test, signed through a trusted intermediate.",
      steps: [
        "The chain signatures and dates can validate successfully.",
        "The reference name pay.example.test does not match the certificate's allowed identity shop.example.test.",
        "The client rejects authentication instead of sending payment credentials through a merely encrypted connection."
      ],
      result: "Chain trust and name matching are independent mandatory parts of authenticated service identity."
    },
    failure: "Ignoring a certificate warning replaces a checked identity boundary with an assumption. A badly wrong local clock can also cause legitimate certificates to appear not yet valid or expired.",
    confusions: ["A self-signed root is trusted because policy installs it, not because its self-signature proves legitimacy.", "A valid website certificate does not certify the business's honesty or its application security."],
    observe: "Inspect a browser's certificate viewer for names, issuer chain and validity. For an authorized server, openssl s_client with -servername and -verify_hostname can expose different name and chain problems; check actual verification results.",
    interview: { answer: "TLS authentication requires a trusted valid certificate path, the intended hostname and proof of private-key possession.", followups: ["Why can a trusted chain still fail authentication?", "How can clock errors mimic a certificate outage?"] },
    recall: [{ question: "Does a copied certificate alone prove private-key possession?", answer: "No." }, { question: "What makes a root certificate a trust anchor?", answer: "Explicit trust-store or application policy." }],
    tasks: [
      { kind: "Predict", prompt: "A trusted, unexpired certificate covers api.example.test but the URL is billing.example.test. Should authentication pass?", hint: "Check identity, not just issuer.", answer: "No, unless billing is also validly covered.", reasoning: "A valid chain does not bind an unrelated hostname." },
      { kind: "Diagnose", prompt: "Many unrelated sites suddenly report future certificate validity. What local dependency should be checked?", hint: "Validity comparisons use a clock.", answer: "The client's time and synchronization state.", reasoning: "A significantly incorrect clock can make otherwise valid certificates fail date checks." }
    ],
    sources: ["tls", "x509", "mdn", "kr"],
    advanced: "Name constraints, revocation, Certificate Transparency and enterprise trust deployment add policy boundaries. Disabling verification is not an acceptable production fix for an incomplete intermediate chain."
  },
  {
    id: "tls-browser-handshake", module: "security", title: "A Combined HTTP–TLS 1.3 Connection Pilot",
    concepts: ["tls-one-three-handshake", "tls-forward-secrecy", "tls-sni", "tls-alpn", "tls-encrypted-records"],
    prerequisites: ["tls-certificates", "browser-policy-journey"],
    meaning: "TLS 1.3 establishes authenticated traffic keys before ordinary protected HTTP application data is exchanged.",
    why: "A browser needs both the correct server identity and shared encryption keys. Walking the handshake beside HTTP prevents confusing name resolution, certificate authentication, protocol negotiation and application response time.",
    model: "For a typical full certificate handshake over TCP, ephemeral key agreement creates secrets while certificate signatures authenticate the exchange. SNI helps select a virtual server; ALPN selects the application protocol. These labels are not user authentication, and ordinary plaintext SNI is not a confidentiality guarantee.",
    steps: [
      "Resolve the HTTPS hostname and establish TCP for this pilot; HTTP/3 uses QUIC's integration instead of this TCP record sequence.",
      "Send ClientHello with parameters, an ephemeral key share, application protocol choices and ordinarily SNI.",
      "Receive ServerHello selecting compatible parameters and a key share; derive handshake keys, then process encrypted handshake messages including certificate authentication and Finished.",
      "Verify identity and handshake proof, send Finished, derive application traffic keys, and exchange protected HTTP.",
      "Interpret the HTTP status and browser origin rules only after the channel is established; these are separate from TLS success."
    ],
    example: {
      given: "In a configured private .test lab, a cold browser requests https://shop.example.test with certificate-authenticated TLS 1.3 and ALPN choices h2 and http/1.1.",
      steps: [
        "DNS yields 192.0.2.80; TCP establishes reachability but not server identity.",
        "The server selects h2 and supplies an ephemeral key share. The browser verifies the shop certificate and signed transcript.",
        "After handshake completion, HTTP/2 frames carrying GET and its response are protected by application traffic keys.",
        "A later theft of the certificate's signing key does not by itself decrypt this recorded ephemeral session if ephemeral secrets were erased and the cryptographic assumptions hold."
      ],
      result: "DNS chooses a destination, TLS authenticates and protects the channel, and HTTP defines the resource exchange."
    },
    failure: "A certificate-name failure can stop the connection before any normal GET is sent. A completed TLS handshake followed by 403 is an application authorization outcome, not a TLS negotiation failure.",
    confusions: ["TLS 1.3 is still TLS 1.3 under its updated specification; RFC 9846 supersedes the historical RFC 8446, not the version number.", "Forward secrecy protects recorded sessions against later long-term key compromise; it does not protect an already compromised live endpoint."],
    observe: "Compare DevTools connection timing, certificate details, Protocol and HTTP status. Passive captures expose metadata but not ordinary protected HTTP content without authorized endpoint key material.",
    interview: { answer: "TLS 1.3 combines authenticated key establishment and encrypted records; SNI selects a service, ALPN selects HTTP framing, and ephemeral exchange supports forward secrecy.", followups: ["Which failure happens before HTTP when the certificate name is wrong?", "What does forward secrecy not protect if the browser itself is compromised?"] },
    recall: [{ question: "What does ALPN negotiate?", answer: "The application protocol, such as h2." }, { question: "What does SNI help a server select?", answer: "The intended virtual service and corresponding configuration." }],
    tasks: [
      { kind: "Diagnose", prompt: "TLS succeeds and GET returns 403. Should you first change cipher suites?", hint: "Identify which layer supplied the refusal.", answer: "No; inspect HTTP authorization and application policy.", reasoning: "Successful channel establishment precedes the server's HTTP-level refusal." },
      { kind: "Explain", prompt: "Why does later theft of a certificate signing key not necessarily decrypt an old ephemeral TLS session?", hint: "Distinguish authentication key from session secret.", answer: "The session keys depend on ephemeral key agreement secrets, not solely on the long-term signing key.", reasoning: "With ephemeral secrets erased, recorded traffic and the signing key are insufficient under the assumed key-agreement security." }
    ],
    sources: ["tls", "x509", "http2", "quictls", "mdn"],
    advanced: "HelloRetryRequest adds a handshake turn. Encrypted ClientHello can protect inner name information when supported and correctly deployed; timing, sizes and destination addresses remain observable.",
    diagram: "browser                       server\n   ClientHello (SNI, ALPN, key) ->\n   <- ServerHello (key)\n   <- encrypted handshake + certificate + Finished\n   verify; Finished ->\n   <== protected HTTP request / response ==>"
  },
  {
    id: "tls-resumption-replay", module: "security", title: "Resumption, 0-RTT Replay and Mutual TLS",
    concepts: ["tls-session-resumption", "tls-zero-rtt", "tls-zero-rtt-replay", "tls-mutual-authentication"],
    prerequisites: ["tls-browser-handshake", "http-semantics"],
    meaning: "TLS resumption reuses established authentication context, while optional early data trades latency for extra replay risk and mTLS authenticates both connection peers.",
    why: "Repeated secure connections can spend unnecessary time negotiating. However, sending operations before full handshake completion changes the threat model, and authenticating a client certificate still does not define the client's business permissions.",
    model: "A resumption ticket is a protected reference to prior context, not an open-ended permanent credential. A resumed connection can use fresh key agreement. 0-RTT early data has weaker guarantees, including replay exposure; ordinary 1-RTT application data must not be assumed to inherit those early-data risks identically.",
    steps: [
      "After a successful handshake, the server can issue resumption material with lifetimes and policy restrictions.",
      "On reconnect, the client offers the resumption identity; the server accepts or performs a full handshake as policy dictates.",
      "If early data is enabled, admit only operations whose replay risk is acceptable and deploy server-side replay and application controls.",
      "For mTLS, request and verify the client's certificate proof, map it to a service identity, and separately authorize requested operations."
    ],
    example: {
      given: "A client reconnects with a valid ticket and wants to send POST /transfer as early data. A service-to-service connection also uses a client certificate.",
      steps: [
        "Ticket acceptance can shorten setup, but it does not make a financial POST replay-safe.",
        "The server defers or rejects early execution of the transfer, using completed-handshake processing and transaction deduplication.",
        "The client certificate identifies the calling service; policy still checks whether that service may transfer from this account."
      ],
      result: "Lower setup latency, replay safety and permission remain separate design choices."
    },
    failure: "Processing a non-deduplicated purchase in 0-RTT can duplicate side effects under replay. Treating every valid client certificate as an administrator similarly confuses channel identity with authorization.",
    confusions: ["Resumption does not require sending 0-RTT data.", "Even a nominally safe GET can trigger application side effects if the application violates HTTP semantics."],
    observe: "Use endpoint TLS logs or supported client diagnostics to distinguish resumed handshakes and accepted early data. A fast second request might instead be an already open connection, not resumption.",
    interview: { answer: "Resumption reduces repeated setup; 0-RTT needs replay-aware admission, and mTLS authenticates client identity without granting unlimited authority.", followups: ["Why might an idempotent operation still need early-data policy review?", "How do certificate rotation and revocation affect service identity lifetimes?"] },
    recall: [{ question: "Does every resumed connection send 0-RTT?", answer: "No." }, { question: "What does mTLS add to ordinary server-authenticated TLS?", answer: "Certificate-based authentication of the client peer." }],
    tasks: [
      { kind: "Predict", prompt: "An early POST charges an account with no deduplication. Can TLS integrity alone prevent replayed charges?", hint: "Authentic bytes can be repeated.", answer: "No.", reasoning: "Early-data replay can reproduce valid requests; application admission and deduplication must address repeated effects." },
      { kind: "Diagnose", prompt: "A valid service certificate can delete every tenant's records. Which layer needs tighter policy?", hint: "The certificate only names the caller.", answer: "Service and object-level authorization.", reasoning: "Mutual authentication is successful, but permission mapping is overbroad." }
    ],
    sources: ["tls", "http", "quictls"],
    advanced: "Ticket key rotation, PSK modes and replay controls influence compromise and forward-secrecy boundaries. Early data does not provide the same forward-secrecy guarantees as fresh ephemeral 1-RTT traffic."
  },
  {
    id: "vpn-tunnels", module: "security", title: "VPN Boundaries: IPsec and WireGuard",
    concepts: ["network-vpn", "network-ipsec", "network-wireguard", "vpn-tunnel-boundary", "vpn-split-tunnel"],
    prerequisites: ["tls-browser-handshake", "security-threats-identity"],
    meaning: "A VPN protects traffic between tunnel endpoints and changes routing or access, but does not automatically secure the entire application path.",
    why: "Remote workers and sites need protected connectivity across untrusted networks. Choosing which traffic enters a tunnel and where it emerges is as important as choosing the tunnel's cryptography.",
    model: "A tunnel places an inner packet inside an outer protected exchange. The local network sees outer destinations and traffic patterns; the gateway can see inner traffic after decapsulation. IPsec provides an IP-layer security framework, commonly using ESP and negotiated security associations; WireGuard uses configured public-key peers and cryptokey routing.",
    steps: [
      "Configure peer identity, key management and the routes or selectors that should enter the tunnel.",
      "Authenticate peers and establish the relevant protected communication state; IPsec commonly uses IKE, while WireGuard has its own handshake.",
      "Encapsulate eligible traffic and send outer packets across the public network.",
      "At the peer, verify and decapsulate traffic, then enforce destination access policy and route onward; preserve application TLS where end-to-end service identity is needed."
    ],
    example: {
      given: "A remote client tunnels 10.0.0.0/8 to a company gateway but sends ordinary internet traffic directly.",
      steps: [
        "A request to 10.2.0.8 enters the encrypted tunnel; a public website request follows the direct default route.",
        "The company gateway decapsulates the private request and applies internal access controls.",
        "If the internal application uses plaintext HTTP, its gateway-to-service hop remains plaintext unless separately protected."
      ],
      result: "Split tunneling protects selected paths; VPN encryption ends at its tunnel peer, not necessarily at the application server."
    },
    failure: "A route or DNS configuration mistake can send intended private traffic outside the tunnel. A compromised authenticated VPN user can also attack reachable internal services if access policy is too broad.",
    confusions: ["A VPN does not make a malicious destination trustworthy.", "WireGuard AllowedIPs participates in peer routing and source validation, but does not replace all application authorization or firewall policy."],
    observe: "Inspect tunnel interfaces, route selection, configured peers and counters. Compare the intended destination route before and after connection; do not infer tunnel coverage merely from a 'connected' badge.",
    interview: { answer: "VPNs protect selected traffic between peers; IPsec and WireGuard differ in framework and key configuration, while routing and access policy define scope.", followups: ["Where can plaintext reappear after a gateway VPN?", "Why can a working tunnel coexist with broken private DNS?"] },
    recall: [{ question: "Where does tunnel encryption stop?", answer: "At the receiving tunnel endpoint." }, { question: "Does split tunneling send every destination through the VPN?", answer: "No." }],
    tasks: [
      { kind: "Predict", prompt: "Only 10.0.0.0/8 is routed through a VPN. Does a request to 192.0.2.80 necessarily enter it?", hint: "Match the destination prefix.", answer: "No.", reasoning: "That address is outside the selected private prefix; the remaining routing table determines its path." },
      { kind: "Diagnose", prompt: "The VPN handshake succeeds but a private hostname resolves publicly. Is rekeying the tunnel the obvious fix?", hint: "Connectivity and resolver views differ.", answer: "No; inspect DNS selection and private-view configuration.", reasoning: "A cryptographically established tunnel does not guarantee name queries use the intended resolver." }
    ],
    sources: ["kr", "systems", "tls", "ipsec", "wireguard"],
    advanced: "IPsec transport and tunnel modes, NAT traversal and MTU overhead affect deployment. WireGuard's smaller protocol surface does not eliminate key-distribution, endpoint-compromise or access-policy risks."
  },
  {
    id: "security-firewall-segmentation", module: "security", title: "Firewalls, IDS/IPS, DMZs and Zero-Trust Boundaries",
    concepts: ["network-packet-firewall", "network-stateful-firewall", "network-ids", "network-ips", "network-segmentation", "network-dmz", "network-zero-trust"],
    prerequisites: ["vpn-tunnels", "security-threats-identity"],
    meaning: "Network controls restrict reachable paths, track allowed exchanges and detect suspicious behavior without substituting for authenticated application permissions.",
    why: "A single compromised public server should not expose every database. Layered admission and segmentation reduce reachable attack surfaces; monitoring adds evidence about behavior that static allow rules cannot classify.",
    model: "A stateless packet firewall checks individual packet fields. A stateful firewall tracks permitted flows and related return traffic. An IDS observes and alerts; an IPS sits in an enforcement path and can block. A DMZ is an isolated public-service segment, not a trusted zone; zero trust rejects blanket trust based solely on location.",
    steps: [
      "Define segments for public services, application workers, data stores and management, with explicit permitted paths between them.",
      "Use deny-by-default rules and scoped exceptions; stateful policy permits appropriate replies without opening every inbound destination.",
      "Authenticate workloads and users, authorize specific operations, and reevaluate access rather than granting broad trust to anything on an internal subnet.",
      "Place IDS sensors or inline IPS where they can observe useful traffic, tune detections and manage false positives, and log both allowed and denied paths."
    ],
    example: {
      given: "A public web service is in a DMZ. Only the application segment may reach database port 5432; administrators use a separate authenticated management path.",
      steps: [
        "Internet clients can reach the web service's HTTPS port but cannot directly reach the database.",
        "A compromised DMZ host attempting a database connection hits the denied segment boundary.",
        "The application still needs database credentials and limited privileges; an allowed network path grants reachability, not unrestricted data access.",
        "An IDS alert informs operators; only an inline IPS or another enforcement action directly stops the observed traffic."
      ],
      result: "Segment boundaries contain reachable damage while identity and data permissions further constrain allowed paths."
    },
    failure: "A broad 'allow internal any' rule defeats segmentation. An overloaded state table can also fail availability, and an overly aggressive IPS rule can block legitimate users.",
    confusions: ["Stateful inspection does not prove a flow's payload is harmless.", "Zero trust is a policy architecture with identity and least privilege, not a product label or a demand to eliminate all network boundaries."],
    observe: "Draw the allowed-path matrix and verify it with approved connectivity tests from each segment. Compare firewall denies, flow state and IDS alerts; distinguish detection from actual blocking.",
    interview: { answer: "Firewalls enforce reachability, IDS detects, IPS can block, and segmented DMZ/zero-trust designs limit implicit access while retaining application checks.", followups: ["Why can an allowed TLS flow still be malicious?", "What changes when an attacker compromises a host inside the DMZ?"] },
    recall: [{ question: "Does an IDS necessarily block traffic?", answer: "No; it primarily detects and alerts." }, { question: "Does an internal address grant automatic zero-trust authorization?", answer: "No." }],
    tasks: [
      { kind: "Diagnose", prompt: "An IDS raises an alert, but packets keep reaching the server. Is that necessarily malfunction?", hint: "Separate observer from enforcer.", answer: "No; passive IDS operation does not itself block.", reasoning: "Blocking requires inline prevention or a coordinated enforcement action." },
      { kind: "Predict", prompt: "A DMZ server is compromised, but its segment cannot reach the database. What benefit remains?", hint: "Consider reachable attack surface, not perfect safety.", answer: "Direct database network access is constrained.", reasoning: "Segmentation reduces lateral paths even though allowed application paths and stolen credentials still require investigation." }
    ],
    sources: ["kr", "systems", "tls"],
    advanced: "Asymmetric routing and encrypted payloads affect stateful inspection and detection. Microsegmentation needs manageable identity policy and failure planning; indiscriminate TLS interception introduces its own trust and privacy risks.",
    diagram: "Internet -> [DMZ web]\n                 | allowed API only\n            [application] -> [database]\n                 ^              ^\n           scoped identity   no direct DMZ path\nmanagement -> separate authenticated access"
  },
  {
    id: "security-privacy-visibility", module: "security", title: "Privacy, Traffic Analysis and Anonymous Communication",
    concepts: ["network-privacy", "network-traffic-analysis", "network-anonymous-communication", "network-encryption-visibility-limits"],
    prerequisites: ["tls-browser-handshake", "dns-trust-privacy", "vpn-tunnels"],
    meaning: "Encrypted content can remain confidential while addresses, timing, sizes and endpoint relationships still reveal sensitive information.",
    why: "Privacy concerns include who communicates with whom, not merely message contents. A user may need to hide queries from a local network, avoid linking destinations to identity or minimize logs retained by service providers.",
    model: "Encryption hides selected bytes between defined endpoints; it does not remove every surrounding observation. A VPN transfers visibility to its gateway. Multi-hop anonymous communication tries to separate origin knowledge from destination knowledge, but correlation and compromised endpoints remain limits rather than solved problems.",
    steps: [
      "Identify the observer: local Wi-Fi operator, ISP, DNS resolver, VPN gateway, destination service or an observer of multiple links.",
      "Choose protections for each boundary: encrypted DNS for one query channel, TLS for content and appropriate routing or anonymity systems for origin-destination linkage.",
      "Inspect remaining metadata and identifying behavior such as cookies, account login, browser fingerprints and timing correlations.",
      "Minimize collection, retention and access to logs; protect endpoint data because network encryption cannot repair endpoint disclosure."
    ],
    example: {
      given: "A user visits a health website over HTTPS using DoH and a VPN, then logs into a personally identified account.",
      steps: [
        "The local network sees the VPN endpoint and traffic patterns, not ordinary inner HTTP content.",
        "The VPN gateway sees onward destinations; the DoH resolver sees queried names and the website receives application requests.",
        "The website's login links the visit to the account despite hidden local payload, while a multi-link observer may still attempt timing correlation."
      ],
      result: "Different observers learn different facts; encryption is not an anonymity guarantee."
    },
    failure: "Claiming that TLS reveals no useful traffic information encourages overcollection and false privacy promises. Even ECH does not conceal destination addresses or all volume patterns.",
    confusions: ["Anonymous transport does not make logging into a named account anonymous to that service.", "A passive observer lacking keys cannot normally read TLS-protected HTTP payload merely by capturing packets."],
    observe: "In an authorized capture, list which addresses, durations and sizes remain visible without decryption. Compare those observations with endpoint logs, taking care not to expose real users' private browsing data.",
    interview: { answer: "Confidentiality hides protected contents; privacy and anonymity also require controlling metadata, observer linkage and endpoint identifiers.", followups: ["Who gains visibility when traffic moves from an ISP path into a VPN?", "Why can timing correlation defeat some anonymity assumptions?"] },
    recall: [{ question: "Does HTTPS hide destination IP addresses from the network path?", answer: "No." }, { question: "Can an authenticated account reveal identity despite anonymous routing?", answer: "Yes, to the service." }],
    tasks: [
      { kind: "Compare", prompt: "Can a local packet observer normally read an HTTPS response body without endpoint secrets?", hint: "Separate content from metadata.", answer: "No; addresses, sizes and timing may still be visible.", reasoning: "TLS protects application content, not every field and pattern needed to carry it." },
      { kind: "Predict", prompt: "A user routes anonymously but logs into a named account. Is the destination unable to identify them?", hint: "Application identity survives transport changes.", answer: "No.", reasoning: "The service receives the login identity even if the network path obscures the source." }
    ],
    sources: ["tls", "dnsprivacy", "kr", "systems"],
    advanced: "Anonymity systems require a precise adversary model, including collusion and global observation. Padding and mixing trade bandwidth or latency for reduced correlation, without universally eliminating it."
  },
  {
    id: "security-defensive-monitoring", module: "security", title: "Defensive Monitoring, Honeypots and Attribution Limits",
    concepts: ["network-defensive-monitoring", "network-honeypot", "network-traceback", "network-poisoning-defense", "network-dos-defense"],
    prerequisites: ["security-firewall-segmentation", "security-privacy-visibility"],
    meaning: "Defensive monitoring combines permitted observations to detect abuse, preserve evidence and limit damage without overclaiming attacker identity.",
    why: "Controls fail and attackers adapt. Useful incident response needs correlated endpoint, resolver, firewall and traffic evidence, with enough context to distinguish an attack from routine failure or configuration drift.",
    model: "An alert is a hypothesis, not a verdict. A honeypot is an isolated decoy intended to reveal suspicious contact; it must not become a bridge to production. Traceback follows available provenance evidence, but spoofing, NAT, relays and compromised machines make an address an uncertain attribution clue.",
    steps: [
      "Collect scoped flow, access, DNS and endpoint events with synchronized clocks, protected access and documented retention.",
      "Correlate anomalies: unusual cache or neighbor changes, bursts of traffic, denied segment paths and repeated authorization failures.",
      "Validate alerts against benign explanations, preserve relevant evidence and use bounded mitigations such as upstream filtering, rate limits or isolation.",
      "Use decoys only with explicit authorization and containment; trace paths through trusted logs rather than accusing the apparent source address."
    ],
    example: {
      given: "A service receives a traffic burst, resolver failures rise, and a decoy management port receives probes from an address shared behind NAT.",
      steps: [
        "Compare link utilization with application load to locate the saturation point.",
        "Inspect resolver validation and cache evidence before calling every DNS failure poisoning; a bad key rollover may explain it.",
        "Correlate the decoy event with firewall and endpoint logs, but do not treat the NAT address as a unique human identity.",
        "Apply approved upstream mitigation if link capacity is exhausted and preserve the event timeline."
      ],
      result: "Evidence selects a proportionate defense while preserving uncertainty about cause and attribution."
    },
    failure: "An uncontained honeypot can be compromised and used to reach real systems. Excessive payload logging can itself create a privacy breach; encrypted traffic requires endpoint or trusted termination evidence for content inspection.",
    confusions: ["High traffic volume can be legitimate demand; a graph alone does not prove DoS.", "Poisoning changes trusted mapping state; simple loss or authoritative configuration errors are different failure modes."],
    observe: "Build a timeline from authorized logs and annotate clock uncertainty, collection gaps and hypothesis changes. Use a tabletop incident or isolated lab rather than generating hostile traffic toward production.",
    interview: { answer: "Defensive monitoring correlates evidence, decoys require containment, and traceback identifies paths or infrastructure more reliably than a human attacker.", followups: ["How would you distinguish capacity overload from expensive authenticated abuse?", "What evidence remains useful when TLS payload inspection is unavailable?"] },
    recall: [{ question: "Does a honeypot belong on an unrestricted production trust path?", answer: "No." }, { question: "Does a packet source address prove a person's identity?", answer: "No." }],
    tasks: [
      { kind: "Diagnose", prompt: "An alert names a shared public NAT address. Can you conclude one named employee sent the traffic?", hint: "Consider translation and endpoint evidence.", answer: "No.", reasoning: "Multiple hosts or users may share that address, and further trusted logs are needed." },
      { kind: "Compare", prompt: "Which evidence helps with encrypted-flow abuse without exposing payload: flow duration/volume or imagined plaintext from a capture?", hint: "Use only observable facts.", answer: "Flow duration and volume, correlated with authorized endpoint logs.", reasoning: "Metadata remains observable; TLS payload cannot be inferred reliably as though it were decrypted." }
    ],
    sources: ["kr", "systems", "wireshark", "tls"],
    advanced: "Routing-origin validation and path-signing mechanisms address different routing threats, not application identity. Specialist routing lessons cover their deployment; incident response still needs operator cooperation and defensible evidence."
  },
  {
    id: "mail-delivery-access", module: "applications", title: "Mail Delivery with SMTP, Mailbox Access with IMAP or POP",
    concepts: ["application-smtp", "application-imap", "application-pop", "mail-store-and-forward"],
    prerequisites: ["dns-records", "tls-certificates"],
    meaning: "SMTP submits and transfers mail, while IMAP and POP let recipients access messages already stored in a mailbox.",
    why: "Sender and recipient need not be online together. Mail servers queue and retry deliveries, while mailbox-access protocols support clients with different synchronization and storage needs.",
    model: "Mail is store-and-forward, not a direct chat session. An SMTP envelope controls delivery and can differ from visible message headers. IMAP manages server-side folders and message state; POP primarily retrieves messages and can leave or delete server copies according to policy.",
    steps: [
      "The sender submits a message to a configured submission service, using appropriate authentication and transport security.",
      "The sending mail server resolves the recipient domain's MX records and then the selected target's addresses.",
      "SMTP uses MAIL FROM for the envelope sender, RCPT TO for recipients and DATA for message content; temporary failures cause retries, while permanent rejection requires a failure outcome.",
      "The recipient accesses the stored mailbox with IMAP synchronization or POP retrieval; these do not perform the original server-to-server transfer."
    ],
    example: {
      given: "In a configured private .test mail lab, Alice sends to bob@example.test. Its MX preference 10 server returns temporary SMTP 451; preference 20 is unavailable. Bob later reads mail on two devices.",
      steps: [
        "The sender attempts the preferred target after resolving its address.",
        "Temporary failure leaves the message queued for retry rather than proving Bob's mailbox permanently absent.",
        "Once delivery succeeds, IMAP can synchronize Bob's read state across devices; a POP client that deletes after retrieval could change the other device's experience."
      ],
      result: "Transfer reliability and mailbox synchronization are separate application responsibilities."
    },
    failure: "An SMTP success acknowledges the stage that accepted responsibility, not that Bob read the message. Misconfigured authentication, relay policy or DNS can cause distinct submission and delivery failures.",
    confusions: ["IMAP and POP are not substitutes for SMTP server-to-server delivery.", "TLS between mail hops is not automatically end-to-end encryption of the stored message."],
    observe: "Inspect a test message's Received headers and submission logs with sensitive addresses redacted. Determine which hop accepted it and which mailbox protocol the client uses.",
    interview: { answer: "SMTP moves queued messages between submission and delivery servers; IMAP synchronizes mailboxes and POP retrieves stored messages.", followups: ["Why do temporary SMTP failures normally trigger retries?", "What does a server's acceptance fail to prove about final human delivery?"] },
    recall: [{ question: "Which protocol commonly transfers mail between servers?", answer: "SMTP." }, { question: "Which protocol maintains server-side mailbox synchronization?", answer: "IMAP." }],
    tasks: [
      { kind: "Predict", prompt: "SMTP returns a temporary 4xx reply during delivery. Should the sender normally declare a permanent nonexistent-recipient failure immediately?", hint: "Temporary and permanent outcomes differ.", answer: "No; it normally queues and retries according to policy.", reasoning: "A temporary rejection does not establish permanent recipient invalidity." },
      { kind: "Compare", prompt: "Why may IMAP better fit a user reading the same mailbox on a phone and laptop?", hint: "Consider shared folder and read state.", answer: "It synchronizes server-held messages and state across clients.", reasoning: "POP retrieval policies do not provide the same general server-side folder synchronization model." }
    ],
    sources: ["mail", "imap", "pop", "dnswire", "kr"],
    advanced: "SPF, DKIM and DMARC address different sender-domain checks; they are not message confidentiality. IMAP and POP have their own standards and secure-access requirements."
  },
  {
    id: "file-transfer-remote-shell", module: "applications", title: "FTP, FTPS, SFTP, SSH and Legacy Telnet",
    concepts: ["application-ftp", "application-ftps", "application-sftp", "application-ssh", "application-legacy-telnet", "ftp-passive-mode"],
    prerequisites: ["tls-certificates", "security-threats-identity"],
    meaning: "File transfer and remote shell protocols differ in both wire behavior and security: SFTP runs through SSH, while FTPS adds TLS to FTP.",
    why: "Similar names cause deployment mistakes, wrong ports and unsafe assumptions. A client must know which server protocol it is contacting and authenticate the intended peer before sending credentials or commands.",
    model: "FTP separates a control conversation from data connections. Active and passive modes differ in who initiates a data connection. FTPS retains FTP's structure with TLS protection; SFTP is a distinct SSH file-transfer protocol. SSH secures remote sessions, whereas legacy Telnet lacks built-in confidential transport.",
    steps: [
      "Choose the actual protocol and configure client expectations; do not infer compatibility from the word 'secure'.",
      "For FTP, establish control and authenticate; active mode asks the server to initiate data, while passive mode lets the client connect. FTPS must protect both control and data as required.",
      "For SSH, verify the server host key using a trusted method, then authenticate the user.",
      "Open an SSH shell or SFTP subsystem, transfer data or execute permitted commands, and enforce filesystem and account permissions."
    ],
    example: {
      given: "An SFTP client tries an FTPS service. A separate FTP client logs in successfully but a passive download hangs.",
      steps: [
        "The first connection cannot succeed merely by selecting 'encrypted transfer': SSH/SFTP and FTP/TLS speak different protocols.",
        "The FTP control channel's success only proves that one connection works.",
        "The passive data endpoint may be unroutable or blocked, so inspect its advertised address and permitted port range."
      ],
      result: "Protocol selection and data-path reachability must be checked independently."
    },
    failure: "Blindly accepting a changed SSH host key can expose credentials to an impostor; first establish whether legitimate rotation occurred. Using Telnet across an untrusted path exposes credentials and commands unless a separate protected transport is deliberately supplied.",
    confusions: ["SFTP is not FTP with TLS.", "Encrypting an FTP control channel alone does not prove every data connection is protected."],
    observe: "Read approved client connection logs for protocol, host identity and data-channel setup. Compare verified SSH host fingerprints through a separate trusted channel; never publish private keys.",
    interview: { answer: "FTP has separate control/data connections, FTPS applies TLS to FTP, SFTP uses SSH, and Telnet is a legacy insecure remote-terminal protocol.", followups: ["Why can FTP login work while a download fails?", "What should you verify before accepting a changed SSH host key?"] },
    recall: [{ question: "Which secure file protocol runs over SSH?", answer: "SFTP." }, { question: "Does Telnet provide built-in encrypted login?", answer: "No." }],
    tasks: [
      { kind: "Diagnose", prompt: "FTP login succeeds but directory listing stalls. What additional connection deserves inspection?", hint: "Control is not the data path.", answer: "The negotiated FTP data connection and its firewall/NAT handling.", reasoning: "Listings and file contents can use a separate path that the successful control login did not test." },
      { kind: "Compare", prompt: "Can a standard SFTP client connect directly to an FTPS-only server?", hint: "Name the underlying protocols.", answer: "No.", reasoning: "SFTP expects SSH; FTPS expects FTP with TLS and different message exchanges." }
    ],
    sources: ["kr", "systems", "tls", "ftp", "ssh"],
    advanced: "Prefer secure, maintained protocols and explicit host trust. SSH port forwarding adds new access paths and should be authorized; encryption does not remove remote command or filesystem privilege risks."
  },
  {
    id: "management-directory", module: "applications", title: "SNMP Management and LDAP Directory Queries",
    concepts: ["application-snmp", "application-snmp-mib", "application-ldap", "directory-bind"],
    prerequisites: ["security-firewall-segmentation", "tls-certificates"],
    meaning: "SNMP exposes managed-device objects, while LDAP queries and updates structured directory entries; both require carefully scoped access.",
    why: "Operators need device counters and alerts, and applications need shared directory information such as users and groups. These are operational interfaces, not interchangeable remote shells or automatic permission systems.",
    model: "SNMP objects have identifiers and typed values described by a management information model; polling reads them and notifications report events. LDAP organizes entries by distinguished names and supports filtered searches. Binding authenticates a directory connection but does not grant unrestricted access or secure every transport by itself.",
    steps: [
      "Configure authenticated, least-privilege access to management agents or directory services on restricted network paths.",
      "For SNMP, query selected objects, interpret counter units and collect change over time rather than treating a cumulative count as an instantaneous rate.",
      "Handle SNMP notifications with delivery expectations appropriate to traps or acknowledged informs; avoid assuming every event arrives.",
      "For LDAP, establish protected transport where needed, bind appropriately, select a search base and scope, safely encode filters, and apply directory access controls."
    ],
    example: {
      given: "An interface octet counter rises from 1,000,000 to 1,750,000 over ten seconds. An LDAP search is restricted to ou=staff,dc=example,dc=test.",
      steps: [
        "The counter difference is 750,000 octets, giving 75,000 octets per second.",
        "Multiplying by eight gives 600,000 bits per second, provided there was no reset or wrap.",
        "The directory search returns matching staff entries within its scope, not every entry or an automatic grant of application administrator rights."
      ],
      result: "Correct interpretation requires measurement context for SNMP and scope plus permissions for LDAP."
    },
    failure: "Counter resets produce misleading negative or extreme rates if ignored. Exposed legacy SNMP community strings or unprotected directory credentials also create security risks.",
    confusions: ["SNMPv3 can provide authentication and privacy, but the configured security level matters.", "LDAP directory membership is an input to authorization policy, not a universal application permission by itself."],
    observe: "Use approved read-only SNMP queries and narrow LDAP searches in a test environment. Record counter width, sample interval and directory search scope; redact identities and credentials.",
    interview: { answer: "SNMP manages typed device objects and events; LDAP accesses structured directories with scoped queries and independent access controls.", followups: ["How do counter wrap and device reboot affect derived rates?", "Why must a directory search filter be safely encoded?"] },
    recall: [{ question: "What describes SNMP managed objects?", answer: "A MIB with object identifiers and syntax." }, { question: "Does an LDAP bind alone guarantee encrypted transport?", answer: "No." }],
    tasks: [
      { kind: "Calculate", prompt: "An octet counter increases 500,000 over five seconds without wrap or reset. What is the average bit rate?", hint: "Divide by seconds, then multiply by eight.", answer: "800,000 bits/s.", reasoning: "500,000 / 5 = 100,000 octets/s; eight bits per octet gives 800,000 bits/s." },
      { kind: "Diagnose", prompt: "A device reboot yields a smaller cumulative counter. Should the negative difference be reported as negative traffic?", hint: "Check counter continuity.", answer: "No; mark the reset and restart the measurement interval.", reasoning: "The samples no longer share the same cumulative counter history." }
    ],
    sources: ["kr", "systems", "tls", "snmp", "ldap"],
    advanced: "Directory schema, referrals and replication consistency affect results. SNMP notification reliability and access protection depend on version and operation, not merely the UDP port commonly used."
  },
  {
    id: "ntp-clocks", module: "applications", title: "NTP: Estimate Clock Offset Without Assuming Symmetry",
    concepts: ["application-ntp", "network-clock-offset", "network-clock-drift", "network-clock-synchronization"],
    prerequisites: ["security-threats-identity"],
    meaning: "NTP estimates clock offset and network delay from timestamp exchanges, then disciplines a local clock using multiple measurements and time sources.",
    why: "Logs, certificate checks and distributed operations depend on useful time. Local oscillators drift, and a single remote timestamp cannot separate clock difference from network travel time.",
    model: "Four timestamps estimate an offset under an approximately symmetric-delay assumption. They do not reveal the exact one-way delays. Stratum describes distance in the timing hierarchy, not a universal accuracy score; a lower-stratum server can still be unhealthy or poorly connected.",
    steps: [
      "Record client transmit time t1, server receive time t2, server transmit time t3 and client receive time t4.",
      "Estimate network delay as (t4 - t1) - (t3 - t2), removing the server's processing interval.",
      "Estimate server-minus-client offset as ((t2 - t1) + (t3 - t4)) / 2, understanding the symmetry assumption.",
      "Filter samples, compare sources and adjust clock frequency or time according to platform policy; protect time-source authenticity where supported."
    ],
    example: {
      given: "Timestamps in milliseconds are t1=1000, t2=1040, t3=1045 and t4=1025 on their respective clocks.",
      steps: [
        "The client elapsed interval is 25 ms; server processing is 5 ms.",
        "Estimated network round-trip delay is 25 - 5 = 20 ms.",
        "Estimated offset is (40 + 20) / 2 = 30 ms, meaning the server clock appears 30 ms ahead."
      ],
      result: "The formula estimates offset and delay even though timestamps from different clocks cannot be directly treated as one-way travel times."
    },
    failure: "Persistent asymmetric paths bias offset estimation. A compromised time source can disrupt expiry checks and event ordering; abrupt clock steps can also confuse applications that use wall time for durations.",
    confusions: ["Precise displayed milliseconds do not prove equally precise synchronization.", "Use monotonic clocks for elapsed durations where available; wall clocks can be corrected backward or forward."],
    observe: "Inspect the operating system's time-sync status, selected sources, estimated offset and recent clock changes. Correlate incident logs only after recording clock uncertainty.",
    interview: { answer: "NTP uses four timestamps to estimate delay and offset, then filters measurements; asymmetric paths and source trust limit accuracy.", followups: ["How would asymmetric forward and return delays bias the estimate?", "Why is a monotonic clock preferable for timeout duration?"] },
    recall: [{ question: "How many timestamps enter the basic NTP exchange estimate?", answer: "Four." }, { question: "Does stratum alone establish timing accuracy?", answer: "No." }],
    tasks: [
      { kind: "Calculate", prompt: "t1=0, t2=25, t3=30, t4=15 ms. Compute network delay and offset.", hint: "Remove processing, then average the cross-clock differences.", answer: "Delay 10 ms; server-minus-client offset 20 ms.", reasoning: "Delay=(15-0)-(30-25)=10; offset=((25-0)+(30-15))/2=20." },
      { kind: "Diagnose", prompt: "A timer using wall-clock subtraction reports a negative duration after synchronization. What clock choice avoids this class of correction?", hint: "Elapsed time need not track civil time.", answer: "A suitable monotonic clock.", reasoning: "Monotonic elapsed-time sources do not step backward with wall-clock corrections." }
    ],
    sources: ["ntp", "kr", "tls"],
    advanced: "Authenticated time protocols protect source exchange but cannot eliminate all delay manipulation. Distributed ordering and causal clocks solve different problems from synchronizing physical wall clocks."
  },
  {
    id: "broker-messaging", module: "applications", title: "MQTT and AMQP: Delivery Guarantees Are Scoped",
    concepts: ["application-mqtt", "application-amqp", "application-publish-subscribe", "mqtt-qos", "message-broker-acknowledgment"],
    prerequisites: ["tls-resumption-replay"],
    meaning: "Message brokers decouple producers from consumers, while MQTT and AMQP define different messaging exchanges and delivery controls.",
    why: "Devices and services may disconnect or process at different speeds. A broker can route and retain work, but an acknowledgment must be interpreted at the exact stage it covers rather than as proof of a completed business effect.",
    model: "MQTT publishes to topics matched by subscriptions, with QoS 0, 1 and 2 controlling protocol delivery behavior. AMQP is a distinct messaging protocol family with links and settlement concepts; implementation routing differs. MQTT QoS 2's exactly-once protocol delivery does not automatically make a database side effect globally exactly once.",
    steps: [
      "Authenticate clients and authorize their publish or subscription destinations; protect the channel when confidentiality is needed.",
      "Publish with selected delivery requirements and suitable session or retention behavior; retained state and queued session messages are different features.",
      "Track protocol acknowledgments, redelivery and consumer settlement according to the chosen protocol.",
      "Make application effects idempotent or transactional where needed, and bound queues when producers outrun consumers."
    ],
    example: {
      given: "A sensor sends measurement id=81 at MQTT QoS 1. Its acknowledgment is lost, and it retransmits. A consumer stores measurements in a database.",
      steps: [
        "QoS 1 permits redelivery, so the application cannot assume one received packet per real measurement.",
        "The consumer uses a stable device-and-measurement identifier as a unique key.",
        "The first insert succeeds and a duplicate is recognized, preventing two business records despite repeated delivery."
      ],
      result: "Protocol reliability plus application deduplication can preserve the intended effect across acknowledgment uncertainty."
    },
    failure: "Unlimited broker queues shift overload into memory or disk exhaustion. Treating a broker acceptance as proof that a consumer committed a database write also loses failure visibility.",
    confusions: ["MQTT QoS 0 does not acknowledge delivery at that QoS level.", "A retained MQTT publication represents a retained topic value, not an unrestricted history of every message."],
    observe: "In a local test broker, inspect client session settings, QoS, acknowledgments, redelivery flags and queue depth. Avoid logging device secrets or unrestricted topic contents.",
    interview: { answer: "Brokers decouple producers and consumers; MQTT QoS and AMQP settlement define scoped delivery evidence, while application effects need their own consistency controls.", followups: ["Why can a lost acknowledgment cause a duplicate?", "How should a broker behave when consumers cannot keep up indefinitely?"] },
    recall: [{ question: "Which MQTT QoS permits at-least-once delivery?", answer: "QoS 1." }, { question: "Does broker acknowledgment necessarily prove consumer business completion?", answer: "No." }],
    tasks: [
      { kind: "Predict", prompt: "A QoS 1 sender loses an acknowledgment and retransmits. Must the consumer assume the measurement is new?", hint: "Delivery can repeat.", answer: "No; it should check a stable application identity.", reasoning: "At-least-once delivery permits duplicates, and deduplication needs meaning beyond transport arrival." },
      { kind: "Diagnose", prompt: "Producer rate remains twice consumer capacity. Does reliable delivery alone keep broker memory bounded?", hint: "Consider the queue growth rate.", answer: "No; admission, backpressure, limits or scaling are needed.", reasoning: "Reliability does not eliminate sustained excess offered work." }
    ],
    sources: ["mqtt", "amqp", "systems", "kr"],
    advanced: "AMQP 1.0 and AMQP 0-9-1 are not wire-compatible names for one exchange. QoS, persistent sessions, durability and transaction semantics must be verified for the actual broker and protocol version."
  },
  {
    id: "rpc-grpc", module: "applications", title: "RPC and gRPC: A Remote Call Is Not a Local Call",
    concepts: ["application-rpc", "application-grpc", "rpc-deadline", "rpc-retry-ambiguity", "grpc-streaming"],
    prerequisites: ["http-two", "tls-resumption-replay"],
    meaning: "RPC presents remote operations through a call-like interface, but network failure leaves outcomes uncertain in ways ordinary local calls often do not.",
    why: "Services want structured APIs rather than hand-parsing messages. Generated types improve interoperability, while deadlines, cancellation and deduplication must still account for independent server execution and unreliable observations.",
    model: "gRPC commonly carries typed messages over HTTP/2 with unary and streaming call patterns. A returned transport failure tells the caller what it observed, not necessarily whether the server changed state. RPC abstraction does not remove latency, partial failure or schema evolution.",
    steps: [
      "Define a service and message schema, then encode the operation with compatible client and server implementations.",
      "Attach authenticated identity, a realistic deadline and operation-specific metadata.",
      "The server validates and authorizes the operation, performs bounded work, and returns messages plus protocol status.",
      "On timeout or disconnection, retry only under suitable idempotency or deduplication policy; propagate cancellation while recognizing work may already have committed."
    ],
    example: {
      given: "CreateOrder includes operation key K7 and a 200 ms deadline. The server commits at 180 ms, but its response is lost.",
      steps: [
        "The caller sees a deadline or transport error, not proof that no order exists.",
        "A retry using the same K7 lets the server return the existing result instead of creating another order.",
        "A retry using a new key would defeat that deduplication contract and could create a second order."
      ],
      result: "Stable operation identity resolves some retry ambiguity; transport reliability alone cannot do so."
    },
    failure: "Unbounded retries amplify overload when a dependency slows down. Cancellation can arrive after an irreversible commit, so it cannot universally promise rollback.",
    confusions: ["An HTTP 200 transport response does not alone imply a successful gRPC application status.", "Streaming supports sequences of messages, not infinite buffering or exemption from flow control."],
    observe: "Inspect deadline, attempt count, gRPC status and server commit logs for a test operation. Correlate a stable operation key across retries without exposing credentials.",
    interview: { answer: "RPC simplifies remote APIs, but deadlines and lost replies create uncertain outcomes; gRPC adds typed unary/streaming messages without erasing distributed failure.", followups: ["Why can a timeout occur after a successful server commit?", "How should retries behave during dependency overload?"] },
    recall: [{ question: "Does a lost RPC reply prove nonexecution?", answer: "No." }, { question: "What should remain stable across deduplicated retries?", answer: "The application's operation identity or idempotency key." }],
    tasks: [
      { kind: "Predict", prompt: "A server commits an order, then the network drops its reply. Is a timeout equivalent to transaction rollback?", hint: "Server state and client observation differ.", answer: "No.", reasoning: "The server's committed effect survives even though the client lacks confirmation." },
      { kind: "Diagnose", prompt: "Every retry generates a new deduplication key. Why do duplicate orders still appear?", hint: "The server sees distinct operation identities.", answer: "The retries are not identified as the same operation.", reasoning: "Deduplication can only recognize repetition when its agreed identity remains stable." }
    ],
    sources: ["http2", "grpc", "systems", "kr"],
    advanced: "Retry budgets, backoff, hedging and deadline propagation require workload-aware policy. Schema compatibility and trailer handling matter across proxies; verify the supported gRPC transport and deployment."
  },
  {
    id: "browser-live-updates", module: "applications", title: "Polling, SSE and WebSocket Tradeoffs",
    concepts: ["application-polling", "application-long-polling", "application-server-sent-events", "application-websocket"],
    prerequisites: ["browser-policy-journey", "http-one-framing"],
    meaning: "Browser live updates can use repeated requests, server-to-client event streams or a bidirectional WebSocket channel, each with different overhead and recovery behavior.",
    why: "A dashboard, chat and price ticker do not need the same communication shape. Choosing an appropriate update mechanism balances latency, request load, intermediaries, authentication and reconnect handling.",
    model: "Polling asks repeatedly; long polling holds a response until an event or timeout. SSE carries a server-to-client text event stream over HTTP. WebSocket provides framed bidirectional messages after a successful opening handshake; HTTP/2 and HTTP/3 use their defined extended-CONNECT mechanisms rather than assuming HTTP/1.1 Upgrade everywhere.",
    steps: [
      "Determine direction, update frequency and acceptable stale time before choosing a mechanism.",
      "Authenticate and authorize the connection or requests; validate browser Origin where needed rather than assuming cookies alone stop cross-site misuse.",
      "For WebSocket, wait for the successful opening handshake before exchanging application messages; for SSE, process event framing and suitable event identifiers.",
      "Handle reconnects, missed updates, backpressure and bounded buffers; use application sequencing when continuity matters."
    ],
    example: {
      given: "A dashboard polls every five seconds. A stock event occurs just after a poll; a chat also needs client-to-server messages.",
      steps: [
        "The dashboard may wait nearly five seconds for its next check, plus network and server time.",
        "SSE can deliver server updates sooner without repeated polling, but client commands still need another request path.",
        "WebSocket fits the chat's two-way exchange, while reconnect logic still needs to recover messages lost during disconnection."
      ],
      result: "Communication direction and recovery needs, not a universal 'realtime' label, determine the useful protocol."
    },
    failure: "A server that keeps enqueueing events for a slow browser eventually exhausts memory. Reconnecting without a sequence or recovery policy can silently lose updates or duplicate them.",
    confusions: ["An open WebSocket does not guarantee application messages survive disconnection.", "SSE's one-way event stream does not prevent the browser using separate HTTP requests in the opposite direction."],
    observe: "Use DevTools to compare repeated polling requests, an SSE event stream and WebSocket messages in an authorized demo. Inspect close reasons and reconnect timing, not only initial connection success.",
    interview: { answer: "Polling trades request load and stale delay; SSE streams server events, while WebSocket supports two-way messages with explicit reconnect and buffering policy.", followups: ["What is the worst polling wait for an event arriving just after a check?", "How should a slow client affect event production or buffering?"] },
    recall: [{ question: "Which mechanism natively streams events server-to-client over HTTP?", answer: "SSE." }, { question: "Should WebSocket application data precede opening handshake success?", answer: "No." }],
    tasks: [
      { kind: "Calculate", prompt: "Ignoring network delay, how long can an event wait with a ten-second polling interval?", hint: "Place it just after the previous poll.", answer: "Nearly ten seconds.", reasoning: "The next scheduled request may occur almost a full interval after the event." },
      { kind: "Compare", prompt: "A ticker needs only server updates; does choosing SSE forbid client filter changes?", hint: "Other HTTP exchanges remain available.", answer: "No; the client can send separate requests for filter changes.", reasoning: "The event stream is one-way, but the application can combine it with ordinary request/response operations." }
    ],
    sources: ["mdn", "http", "http2", "http3", "transitions", "websocket", "sse"],
    advanced: "Proxy buffering and idle timeouts can harm streaming. Compression, authentication refresh and HTTP version support must be evaluated for the deployed endpoints, not assumed from an API name."
  },
  {
    id: "realtime-webrtc", module: "applications", title: "RTP, RTCP and WebRTC Connectivity",
    concepts: ["application-rtp", "application-rtcp", "application-webrtc", "webrtc-ice", "webrtc-stun", "webrtc-turn", "media-jitter-buffer"],
    prerequisites: ["vpn-tunnels", "browser-live-updates"],
    meaning: "Real-time media uses timed packet processing and feedback, while WebRTC's ICE process finds a usable peer or relay path.",
    why: "A live conversation values timely audio more than delivering every old sample. NAT and firewall boundaries also make direct peer reachability uncertain even when both users can browse the web.",
    model: "RTP carries media sequencing and timestamps; RTCP carries related feedback and reports. Neither promises that the network meets playback deadlines. ICE gathers candidates and checks candidate pairs with STUN; STUN can reveal a server-reflexive address, whereas TURN relays traffic when a direct usable pair is unavailable.",
    steps: [
      "Exchange session descriptions and candidates through an application signaling channel; WebRTC does not prescribe one universal signaling protocol.",
      "Gather host, server-reflexive and relay candidates as policy allows, then run authenticated connectivity checks and nominate a viable pair.",
      "Establish the required secure media transport and send encoded media; browsers' WebRTC media is protected rather than ordinary plaintext RTP.",
      "Use sequence numbers, timestamps, jitter buffering and RTCP-related feedback to manage loss and adapt encoding within deadline and bandwidth constraints."
    ],
    example: {
      given: "Two callers are behind restrictive NATs. Their direct candidates fail checks; TURN provides a viable relay. One audio packet arrives after its playout deadline.",
      steps: [
        "ICE does not select an advertised candidate merely because its address looks public; checks determine viability.",
        "The successful relay pair carries media through TURN, increasing relay bandwidth cost and possibly path delay.",
        "The late audio sample may be concealed or discarded rather than played out of time; feedback can support later adaptation."
      ],
      result: "Connectivity selection and timely media quality are separate stages; reliable eventual arrival is not sufficient for live playback."
    },
    failure: "Configuring only a STUN server does not guarantee communication through every NAT. An excessively large jitter buffer reduces glitches but increases conversational delay.",
    confusions: ["TURN relays packets; STUN discovery alone does not.", "RTP timestamps describe media timing, not necessarily globally synchronized wall-clock times."],
    observe: "Inspect permitted WebRTC connection statistics for selected candidate type, RTT, loss, jitter and bitrate. Redact candidate addresses before sharing; do not infer relay use solely from hearing delay.",
    interview: { answer: "RTP times media, RTCP supplies feedback, and ICE tests candidate paths using STUN with TURN relay fallback for WebRTC.", followups: ["Why does a public-looking candidate still need checking?", "How does jitter-buffer size trade smoothness against latency?"] },
    recall: [{ question: "Which service relays traffic when needed?", answer: "TURN." }, { question: "What does ICE select after successful checks?", answer: "A nominated usable candidate pair." }],
    tasks: [
      { kind: "Diagnose", prompt: "STUN works but restrictive NATs prevent direct checks succeeding. What additional connectivity service may be needed?", hint: "Address discovery is not relay transport.", answer: "TURN.", reasoning: "A relay candidate can provide a reachable path when peer-to-peer candidates fail." },
      { kind: "Predict", prompt: "An audio packet arrives correctly but after its playback deadline. Is eventual delivery automatically useful?", hint: "Consider conversational timing.", answer: "No; it may be discarded or concealed.", reasoning: "Real-time usefulness depends on arrival before playout, not just error-free bytes." }
    ],
    sources: ["webrtc", "rtp", "stun", "turn", "kr", "systems"],
    advanced: "Congestion adaptation, selective retransmission and forward error correction depend on media deadlines. RTCP reporting, secure RTP and WebRTC browser APIs each have additional standards beyond ICE.",
    diagram: "signaling: A <----------> app <----------> B\nICE checks: A <--------------------------> B\nif direct path fails:\nmedia:     A <---------- TURN -----------> B"
  },
  {
    id: "adaptive-video", module: "applications", title: "HLS, DASH and the Media Requirement Budget",
    concepts: ["application-hls", "application-dash", "adaptive-bitrate-streaming", "application-latency-requirements", "application-reliability-requirements", "application-bandwidth-requirements"],
    prerequisites: ["http-caching", "realtime-webrtc"],
    meaning: "HTTP-based adaptive video selects encoded segments whose bitrate and download time fit available capacity, playback buffer and latency requirements.",
    why: "A video player must survive fluctuating bandwidth without continually stalling. Live calls, live broadcasts and file downloads tolerate different delays and losses, so protocol choice must start from the workload's actual usefulness deadline.",
    model: "HLS and DASH describe available media and segment choices through manifests and playlists. A player can change representation between suitable segment boundaries; it cannot manufacture bandwidth. A buffer absorbs short download variation but increases live delay. HTTP reliability delivers bytes, not guaranteed uninterrupted playback.",
    steps: [
      "Read the manifest or playlist, available representations and timing information; select supported codecs and an initial bitrate.",
      "Estimate usable throughput and buffer state, then request the next media segments over HTTP.",
      "Choose a sustainable representation, leaving margin for overhead and variation rather than targeting raw link speed.",
      "Decode and play on schedule; recover stalls or reduce quality, balancing live-latency targets against buffer safety."
    ],
    example: {
      given: "A four-second segment encoded at 3 Mbit/s contains about 12 Mbit. Usable download throughput is 6 Mbit/s, later falling to 2 Mbit/s.",
      steps: [
        "At 6 Mbit/s the segment takes about two seconds, allowing the buffer to grow while playback consumes four seconds.",
        "At 2 Mbit/s the same segment takes six seconds, draining about two seconds of buffer per segment.",
        "Switching to a suitably lower representation can restore sustainability; merely relying on TCP retransmission cannot fix a persistent capacity deficit."
      ],
      result: "Playback stability depends on media demand versus usable delivery capacity and accumulated buffer."
    },
    failure: "Choosing the highest nominal quality until every stall ignores throughput uncertainty. Very long segments and buffers can also violate a low-latency live requirement despite excellent loss-free delivery.",
    confusions: ["Bandwidth is a rate; a segment's size is an amount of data.", "A file download needs eventual completeness, while a live conversation often prefers timely partial recovery over late perfect delivery."],
    observe: "In an authorized video test, inspect manifest requests, selected representation, segment download times and buffer behavior under controlled throttling. Distinguish encoded bitrate from measured network throughput.",
    interview: { answer: "HLS and DASH adapt segment quality to throughput and buffer; requirements determine the acceptable latency, reliability and bandwidth tradeoff.", followups: ["When does a buffer grow rather than drain?", "Why can perfectly reliable segment delivery still cause playback stalls?"] },
    recall: [{ question: "Can a playback buffer fix indefinite bitrate above capacity?", answer: "No." }, { question: "What does adaptive bitrate change?", answer: "The selected encoded representation according to delivery and playback conditions." }],
    tasks: [
      { kind: "Calculate", prompt: "A six-second segment uses 2 Mbit/s encoding. At 4 Mbit/s usable throughput, how long does downloading it take?", hint: "Find size before dividing by throughput.", answer: "About three seconds.", reasoning: "Size is 6 × 2 = 12 Mbit; 12 / 4 = 3 seconds, ignoring request and protocol overhead." },
      { kind: "Compare", prompt: "Would a ten-second extra buffer be equally acceptable for a movie and an interactive voice call?", hint: "Compare usefulness deadlines.", answer: "No; it may be tolerable for buffered viewing but severely harms conversation.", reasoning: "Interactive turn-taking requires much lower latency than on-demand playback startup or buffering." }
    ],
    sources: ["http", "cache", "hls", "dash", "kr", "systems"],
    advanced: "Low-latency HLS/DASH use additional chunking and delivery techniques. Codec complexity, CDN behavior and device decoding limits can constrain quality even when network throughput is sufficient."
  },
  {
    id: "peer-file-distribution", module: "applications", title: "P2P and BitTorrent: Verify Pieces, Then Reassemble",
    concepts: ["application-peer-to-peer", "application-bittorrent", "bittorrent-piece-verification", "bittorrent-swarm"],
    prerequisites: ["security-cryptographic-tools", "adaptive-video"],
    meaning: "Peer-to-peer file distribution obtains verified pieces from multiple participants, allowing downloaders to contribute upload capacity to the swarm.",
    why: "One origin server's upload link can bottleneck a popular large file. Sharing pieces distributes serving work, but introduces untrusted peers, variable availability and a need to verify content independently of its transport source.",
    model: "A swarm cooperates around a particular content description; a tracker or distributed discovery mechanism helps find peers rather than necessarily carrying file bytes. BitTorrent verifies pieces against trusted metadata. Matching those hashes establishes consistency with that metadata, not legal provenance or trusted authorship by itself.",
    steps: [
      "Obtain an authorized content description through a trusted channel and discover peers using supported tracker or distributed mechanisms.",
      "Learn which pieces peers advertise and select requests that improve useful availability, often preferring rare pieces.",
      "Download blocks, assemble each piece and verify its expected hash before accepting or sharing it.",
      "Reassemble the complete file, enforce resource limits and verify publisher authenticity separately where needed."
    ],
    example: {
      given: "A four-piece public dataset has trusted hashes. Peer A offers pieces 1 and 2, B offers 2 and 3, and C alone offers 4.",
      steps: [
        "Requesting piece 4 early can preserve a scarce piece while C is available.",
        "If B supplies corrupted piece 3, its calculated hash fails and the client rejects it rather than silently assembling a bad file.",
        "Verified pieces can be uploaded to others before the entire download completes, increasing swarm serving capacity."
      ],
      result: "Distributed capacity and per-piece verification improve scalable delivery, while availability still depends on contributing peers."
    },
    failure: "A swarm without any source for one required piece cannot complete the file. A malicious metadata source can describe malicious content whose piece hashes all verify correctly.",
    confusions: ["A tracker is a peer-discovery service, not necessarily the central file server.", "Hash verification against untrusted metadata is not independent publisher authentication."],
    observe: "Use a legally distributed public dataset or Linux image and inspect piece availability, upload/download rates and verification failures. Consider bandwidth policy and peer-address exposure before participating.",
    interview: { answer: "BitTorrent distributes verified pieces across a swarm, sharing upload load while requiring trusted metadata and adequate piece availability.", followups: ["Why request a rare piece before an abundant one?", "Why can every piece hash match while publisher authenticity remains unknown?"] },
    recall: [{ question: "What happens to a piece whose expected hash fails?", answer: "It is rejected and must be obtained correctly." }, { question: "Does a peer tracker normally carry all file bytes?", answer: "No; it primarily helps discover peers." }],
    tasks: [
      { kind: "Predict", prompt: "Every peer lacks piece 8 of a required file. Can more bandwidth alone complete the download?", hint: "Capacity cannot supply absent information.", answer: "No; a source for piece 8 is needed.", reasoning: "The swarm cannot reconstruct missing required content merely by transmitting other pieces faster." },
      { kind: "Diagnose", prompt: "All hashes match a maliciously replaced torrent description. Has the legitimate publisher been authenticated?", hint: "Identify the root of expected hashes.", answer: "No.", reasoning: "Verification establishes agreement with supplied metadata; trusted provenance needs an independently authenticated description or signature." }
    ],
    sources: ["systems", "kr", "bittorrent"],
    advanced: "BitTorrent versions differ in metadata and hashing details. Peer exchange, distributed discovery and connection encryption do not by themselves provide anonymity or protection from malicious publisher content."
  }
];
