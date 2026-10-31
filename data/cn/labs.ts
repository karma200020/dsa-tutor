export interface NetworkLab {
  id: string;
  title: string;
  platform: string;
  prerequisites: string;
  setup: string;
  commands?: string;
  observations: string[];
  trace: string[];
  explanation: string;
  cleanup: string;
  code?: boolean;
}
const offline = "Any modern browser; optional read-only Linux or Windows commands.";
export const cnLabs: NetworkLab[] = [
  {
    id: "routes", title: "Address, Route, Neighbor and Socket Inspection", platform: offline,
    prerequisites: "Know prefixes and the difference between final destination and next hop.",
    setup: "Use the supplied fictional state. Optional commands inspect your own machine only; documentation destinations are not live targets.",
    commands: "Linux: ip address; ip route; ip neigh; ss -ltn\nWindows PowerShell: Get-NetIPAddress; Get-NetRoute; Get-NetNeighbor; Get-NetTCPConnection",
    observations: ["Address 10.1.2.10/24 has a connected route.", "The /24 route beats /16, /8 and default for 10.1.2.99.", "A remote packet uses gateway 10.1.2.1's neighbor entry."],
    trace: ["address: 10.1.2.10/24", "route: 10.1.2.0/24 dev eth0", "route: 10.1.0.0/16 via 10.1.2.2", "route: 10.0.0.0/8 via 10.1.2.3", "route: default via 10.1.2.1", "lookup 10.1.2.99 -> /24 -> on-link", "lookup 192.0.2.8 -> /0 -> gateway 10.1.2.1", "neighbor: 10.1.2.1 -> 02:00:00:00:00:01"],
    explanation: "Longest prefix match chooses the most specific matching route, not the first line or numerically closest gateway. Addresses are illustrative; no network change is needed.",
    cleanup: "Close the lab. Read-only inspection creates no network configuration to undo."
  },
  {
    id: "arp-dhcp", title: "DHCP Allocation and ARP Delivery", platform: offline,
    prerequisites: "IPv4 local versus remote delivery; Ethernet broadcast and lease basics.",
    setup: "Read this sanitized authored trace; optional capture requires authorization and appropriate permissions. Do not release or renew the primary machine's lease for this exercise.",
    commands: "Optional Linux inspection: ip address; ip neigh\nOptional Windows inspection: ipconfig /all; Get-NetNeighbor",
    observations: ["DORA allocates a lease; it is not the TCP handshake.", "Client requests the offered server/address in the selection phase.", "After configuration, remote delivery resolves the local gateway, not the remote service."],
    trace: ["Wi-Fi association/key setup succeeds", "DHCP Discover: client 0.0.0.0:68 -> broadcast :67", "DHCP Offer: server offers 10.0.0.10/24", "DHCP Request: client selects offered server/address", "DHCP ACK: lease plus gateway 10.0.0.1 and resolver", "ARP request: who has 10.0.0.1?", "ARP reply: gateway MAC 02:00:00:00:00:01", "Frame to gateway carries final IP destination 192.0.2.20"],
    explanation: "This is the initial IPv4 allocation case. Renewals can be unicast, relays alter transport paths and implementations vary. Do not infer that every lease cycle repeats broadcast DORA.",
    cleanup: "Close the offline trace. If an optional capture was made, stop it and delete only the named local capture after redacting any retained evidence."
  },
  {
    id: "dns", title: "DNS Resolution, Cache and Failures", platform: offline,
    prerequisites: "Stub, recursive and authoritative roles; TTL and response codes.",
    setup: "Use the fictional zone example.test in a simulated or explicitly locally configured hierarchy. RFC 6761 reserves .test for private testing; it is not a publicly root-delegated TLD. Ordinary caching resolvers should normally return negative answers unless configured for private .test resolution. Optional loopback commands require that separate local resolver; do not query public roots for this fixture.",
    commands: "Linux with local resolver: dig @127.0.0.1 example.test A\nWindows with local resolver: Resolve-DnsName example.test -Server 127.0.0.1",
    observations: ["A cached positive answer avoids upstream work until expiry.", "A truncated UDP answer can trigger TCP retry.", "NXDOMAIN and SERVFAIL express different outcomes."],
    trace: ["SIMULATED / LOCALLY CONFIGURED private .test hierarchy, not public root behavior", "t=0 stub asks configured private resolver for api.example.test A", "model cache miss -> simulated delegation and authoritative lookup", "private authority answer: 192.0.2.30 TTL=60", "t=20 resolver cache hit; remaining TTL about 40", "large DNS UDP response has TC=1 -> client retries using TCP", "NXDOMAIN: queried name absent in this DNS context", "SERVFAIL: resolver could not obtain/validate a usable answer"],
    explanation: "DNS uses both UDP and TCP. Caches hold data under TTL policy; browser, operating-system and recursive caches are separate. The trace models behavior, not private lookup traffic.",
    cleanup: "Close the trace. Do not flush the primary resolver cache; remove only an explicitly created disposable local DNS service if you created one."
  },
  {
    id: "tcp", title: "TCP Setup, Loss and Acknowledgments", platform: offline,
    prerequisites: "Sequence numbers, SYN consuming one number and cumulative acknowledgments.",
    setup: "Step through the original timeline. Time units are milliseconds in this model; no physical loss injection is required.",
    observations: ["SYN and FIN each consume sequence space.", "The lost data is retransmitted with the same byte sequence range.", "A transport ACK is not a business receipt."],
    trace: ["t=0 C->S SYN seq=100", "t=10 S->C SYN,ACK seq=500 ack=101", "t=11 C->S ACK seq=101 ack=501", "t=20 C->S DATA seq=101 len=4 [lost in model]", "t=120 C->S DATA seq=101 len=4 [timer retransmission]", "t=130 S->C ACK ack=105", "t=140 application still may be processing those bytes"],
    explanation: "Timer value 100 ms is an explicit teaching assumption, not TCP's universal retransmission timeout. Real TCP estimates RTT, handles selective ACKs and uses congestion control.",
    cleanup: "Reset or close the trace. No packet filtering or network configuration was changed."
  },
  {
    id: "http-cache", title: "HTTP Miss, Fresh Hit and Revalidation", platform: offline,
    prerequisites: "Cache-Control, validators and 304 response semantics.",
    setup: "Use the fictional response below. Browser DevTools inspection of a page you own is optional; this trace does not require changing the application's cache.",
    observations: ["A fresh hit can avoid a network request.", "A stale representation can be revalidated with If-None-Match.", "304 reuses an appropriate stored body and updates applicable metadata."],
    trace: ["t=0 GET /asset -> cache miss", "response 200 body='v1'; Cache-Control: max-age=60; ETag: \"v1\"", "t=20 fresh hit -> use stored body, no revalidation request in this model", "t=70 stale -> GET with If-None-Match: \"v1\"", "origin unchanged -> 304 Not Modified", "cache updates applicable metadata and reuses v1 body", "later changed origin -> 200 body='v2' and new validator"],
    explanation: "Freshness age can include Date, Age and response transit corrections, not merely time since the browser received bytes. Shared caches and Vary require compatible representation selection.",
    cleanup: "Close the offline lab. Do not clear unrelated browser state; if using DevTools, restore only your test's cache toggle."
  },
  {
    id: "tls", title: "TLS 1.3 Handshake and Visibility", platform: offline,
    prerequisites: "Certificates, identity verification and symmetric versus asymmetric roles.",
    setup: "Read the conceptual full-handshake trace using current TLS 1.3 provenance RFC 9846. Optional capture of your own loopback TLS service requires separate local certificate setup; never disable validation to make a failing certificate appear correct.",
    observations: ["Hostname and trust-chain checks authenticate the intended service under client policy.", "Key agreement derives traffic keys; the certificate is not the application payload encryption key.", "Passive capture does not reveal protected application payload merely because it identifies TLS."],
    trace: ["ClientHello: supported versions, key share, SNI/ALPN as configured", "ServerHello: selected parameters and key share", "derived handshake keys protect subsequent handshake messages", "EncryptedExtensions; Certificate; CertificateVerify; Finished", "client validates chain, hostname, time and handshake evidence", "client Finished -> application traffic protected with derived keys", "observer sees metadata and protected records, not plaintext application bodies"],
    explanation: "This is a simplified certificate-authenticated handshake, not every resumption or client-auth flow. TLS 1.3 remains the version in RFC 9846; RFC 8446 is its obsoleted 2018 predecessor. SNI can have visibility changes under encrypted-client-hello deployments.",
    cleanup: "Close the trace. Remove only any specifically created local certificates/captures after the optional test; retain no private keys in the repository."
  },
  {
    id: "echo", title: "Local TCP Echo Client and Server", platform: "Python 3 standard library; compiled and self-tested on Linux 3.12.3 and Windows 3.13.5.",
    prerequisites: "Two terminals, a free local port and the downloadable cn_echo.py. No administrator or public network access needed.",
    setup: "Download the exact displayed program. It binds only 127.0.0.1, serves one client and exits. The five-second operation waits are teaching limits, not a production deadline implementation. Start client promptly after server.",
    commands: "Linux terminal 1: python3 cn_echo.py --server --port 4040\nLinux terminal 2: python3 cn_echo.py --client --port 4040\nWindows terminal 1: py -3 cn_echo.py --server --port 4040\nWindows terminal 2: py -3 cn_echo.py --client --port 4040\nSelf-test: python3 cn_echo.py --self-test",
    observations: ["Ready is printed only after bind/listen succeeds.", "The client sends bytes, half-closes write, then reads the echo through EOF.", "The server reads until incoming EOF and closes its connection and listener."],
    trace: ["listener bound to 127.0.0.1:4040", "client connects from an ephemeral loopback port", "client sendall('hello network')", "client shutdown write direction", "server receives bytes and echoes them", "server reads EOF -> closes", "client reads complete echo then EOF"],
    explanation: "The TCP byte stream may combine or split sends. The example does not assert receiver chunk boundaries. Context managers close sockets on success and errors are printed with nonzero exit.",
    cleanup: "The one-client process exits. If no client arrives it times out and reports an error. Stop only your named test process if needed; delete only the downloaded cn_echo.py when finished.", code: true
  },
  {
    id: "framing", title: "Length-Prefixed Messages and Rejection Tests", platform: "Python 3 standard library; compiled and self-tested on Linux 3.12.3 and Windows 3.13.5.",
    prerequisites: "The same downloadable cn_echo.py; know partial I/O and big-endian byte order.",
    setup: "Add --framed to both server and client. The self-test checks all 25 two-chunk splits of the 24-byte hello/empty/network stream, coalesced input, byte-by-byte input and actual loopback TCP. It also checks UTF-8 cafe with an accented final e (five bytes, four characters), a payload exactly at the 65,536-byte limit, and oversized inbound/outbound rejection.",
    commands: "python3 cn_echo.py --server --framed --port 4040\npython3 cn_echo.py --client --framed --port 4040 --message hello\npython3 cn_echo.py --self-test\nWindows: replace python3 with py -3",
    observations: ["A complete header precedes length decoding.", "Oversized length is rejected before body allocation.", "Unexpected EOF in header or body raises an explicit truncated-frame error."],
    trace: ["encode hello -> 00 00 00 05 68 65 6c 6c 6f", "read 4-byte header through arbitrary chunk boundaries", "decode length 5 and enforce <=65536", "read exactly 5 body bytes", "echo one frame; empty payload remains valid", "EOF between frames is clean; EOF inside a frame is error", "declared 65537 -> reject before reading body"],
    explanation: "The input chunk oracle tests a parser's guarantees independently of TCP's packet boundaries. A real fragmented writer does not force identical receiver chunking. The wire format is deliberately bounded and specified.",
    cleanup: "Processes and sockets close after one client. Delete only the downloaded test file if no longer needed.", code: true
  },
  {
    id: "subnet", title: "Subnet, VLSM and Longest-Prefix Cases", platform: "Browser-only deterministic paper/trace exercise.",
    prerequisites: "Binary prefix masks and IPv4 address ranges; /31 and /32 exceptions.",
    setup: "Predict each result before revealing the next trace event. All address blocks are documentation or private examples, not targets.",
    observations: ["192.0.2.130/26 belongs to .128-.191.", "A /31 point-to-point link can use both endpoints under RFC 3021.", "A /32 is a single-address host route, not a zero-host subnet."],
    trace: ["192.0.2.130/26 -> block size 64", "130 lies in block 128..191", "network .128; broadcast .191; usual hosts .129..190", "10.0.0.10/31 point-to-point -> endpoints .10 and .11", "192.0.2.130/32 -> one host route", "10.1.2.99 matches /0,/8,/16,/24 -> select /24"],
    explanation: "The usual 2^(32-prefix)-2 host formula is a conventional subnet rule, not universal. Apply stated link and address semantics, then longest prefix match for routing.",
    cleanup: "Reset or close the exercise; no local interface configuration changes."
  },
  {
    id: "broken", title: "Isolated Broken Configuration", platform: "Browser-only; no primary-network edits.",
    prerequisites: "Routes, masks and next-hop resolution.",
    setup: "Use a fictional host whose intended subnet is /24 but configured prefix is /16. Choose the hypothesis and predict the correction before stepping.",
    observations: ["The wrong prefix makes a remote address appear on-link.", "The host attempts ARP for the final destination.", "Correct /24 plus gateway route changes the local decision."],
    trace: ["intended: 10.1.1.10/24; gateway 10.1.1.1", "configured: 10.1.1.10/16", "destination: 10.1.2.20 behind a router", "wrong connected /16 -> ARP who has 10.1.2.20? no answer", "offline correction: /24 plus default gateway", "new decision -> ARP for 10.1.1.1 -> routed delivery"],
    explanation: "This trace assumes no proxy ARP or special policy route. A real unanswered neighbor probe requires more evidence before diagnosing a mask.",
    cleanup: "None. The browser never edits the host's routes, addresses or DNS."
  },
  {
    id: "dual-stack", title: "IPv4 Versus IPv6 Delivery", platform: offline,
    prerequisites: "ARP, Neighbor Discovery and source-only IPv6 fragmentation.",
    setup: "Compare the same remote-delivery questions in two address families. Optional commands inspect your own local state only.",
    commands: "Linux: ip -6 address; ip -6 route; ip -6 neigh\nWindows: Get-NetIPAddress -AddressFamily IPv6; Get-NetRoute -AddressFamily IPv6",
    observations: ["IPv4 uses ARP for the local next hop.", "IPv6 uses ICMPv6 Neighbor Discovery and scoped link-local router identity.", "Neither family resolves a remote server's MAC across routers."],
    trace: ["IPv4 remote destination -> local default gateway -> ARP", "IPv6 RA learns default router fe80::1 on interface scope", "IPv6 source configured and DAD completes under policy", "remote /64 -> Neighbor Solicitation for local router", "each hop replaces local frame; IPv4 TTL / IPv6 Hop Limit decreases", "IPv6 too-big path -> source adapts; routers do not fragment", "Happy Eyeballs can stagger viable-family connection attempts"],
    explanation: "Dual stack provides two possible paths; one may fail independently. DHCPv6 does not universally replace router advertisements, and IPv6 has no broadcast.",
    cleanup: "Close the trace. Optional read-only inspection creates no changes."
  },
  {
    id: "proxy", title: "Proxy and Load-Balancer Request Boundaries", platform: "Browser-only offline production path.",
    prerequisites: "NAT, transport tuples, HTTP and TLS termination.",
    setup: "Track one labeled request. This is not a live proxy and the browser does not execute a hidden server. For a local CONNECT implementation, wait for accepted 2xx before forwarding untrusted payload.",
    observations: ["The external NAT tuple differs from the private tuple.", "A terminating proxy creates a new upstream connection.", "TLS and request identity must be defined at each boundary."],
    trace: ["private client 10.0.0.7:51000 -> proxy 198.51.100.10:443", "PAT source -> 203.0.113.9:62000", "proxy terminates downstream TCP/TLS", "L7 route /orders -> backend A", "new upstream 10.9.0.2:43000 -> 10.9.1.4:8080", "backend sees proxy socket peer and trusted request context", "response follows upstream then downstream path; NAT translates reply"],
    explanation: "This terminating model differs from L4 passthrough or direct-server-return designs. RFC 9931 updates HTTP/1.1 optimistic-transition security; these local teaching instructions use the simple wait-for-accepted-CONNECT policy.",
    cleanup: "Reset or close the offline walkthrough. No proxy, listener or network policy was installed."
  }
];
