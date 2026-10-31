import type { Module } from "./syllabus";

const rows: [string, string, string, number, string[]][] = [
  ["foundations", "Foundations and the Packet Journey", "Devices, layered services, addressing and the Internet.", 7, []],
  ["physical", "Signals and Transmission", "Media, rates, delay, noise, coding and multiplexing.", 6, ["foundations"]],
  ["link", "Frames, Errors and Link Reliability", "Framing, error control and reliable link protocols.", 7, ["physical"]],
  ["ethernet", "Ethernet and Switched LANs", "MAC learning, VLANs, loops and redundancy.", 6, ["link"]],
  ["wifi", "Wi-Fi and Shared Radio", "Association, contention, interference and roaming.", 5, ["ethernet"]],
  ["ipv4", "IPv4 and Subnetting", "Prefixes, address plans, headers and MTU boundaries.", 7, ["foundations"]],
  ["host", "Host Configuration and Delivery", "ARP, DHCP, gateways, ICMP and path MTU.", 5, ["ipv4", "ethernet"]],
  ["ipv6", "IPv6 and Coexistence", "Neighbor discovery, autoconfiguration and transition.", 7, ["host"]],
  ["routing", "Routing and Forwarding", "Longest prefix match, routing algorithms and policy.", 8, ["host"]],
  ["reliable", "Reliable Communication Principles", "Sequence space, timers, buffering and delivery limits.", 4, ["link"]],
  ["transport", "UDP, TCP and QUIC", "Transport contracts, connection states and modern streams.", 10, ["reliable", "host"]],
  ["performance", "Flow, Congestion and Performance", "Windows, queues, control algorithms and latency.", 10, ["transport"]],
  ["dns", "DNS and Name Resolution", "Hierarchy, records, caches, failures and privacy.", 7, ["transport"]],
  ["http", "HTTP and the Browser", "Semantics, caching, streams, origins and browser evidence.", 8, ["dns"]],
  ["security", "TLS and Network Security", "Trust, secure channels, VPNs and defensive boundaries.", 9, ["http"]],
  ["applications", "Other Applications and Real-Time Media", "Mail, management, messaging, RPC and media delivery.", 10, ["transport"]],
  ["sockets", "Sockets and the Operating System", "Correct local networking programs, framing and backpressure.", 6, ["transport"]],
  ["cloud", "Cloud and Production Networking", "NAT, load balancers, VPCs, containers and services.", 9, ["routing", "http", "security"]],
  ["troubleshooting", "Evidence-Based Troubleshooting", "Platform tools, captures and isolated failure diagnosis.", 6, ["cloud", "sockets"]],
  ["cases", "End-to-End Integration Cases", "Apply the whole model to real packet journeys.", 8, ["troubleshooting", "ipv6", "applications"]],
  ["enterprise", "Optional: Enterprise and Backbone", "Multicast, MPLS, routing policy, EVPN and programmable networks.", 8, ["routing"]],
  ["mobile", "Optional: Mobile, IoT and Difficult Links", "Cellular, low-power radio, mesh and delayed connectivity.", 7, ["wifi", "ipv6"]],
  ["datacenter", "Optional: Datacenter and High Performance", "Clos, RDMA, offloads and storage or training traffic.", 6, ["performance", "cloud"]],
  ["history", "Optional: Historical and Emerging Networks", "Older architectures, research proposals and quantum limits.", 4, ["physical", "security"]]
];

export const cnModules: Module[] = rows.map(([id, title, description, topicCount, dependencies], index) => ({
  id: `mod-cn-${id}`, title, description, topicCount, track: "CN",
  level: index < 8 ? "Beginner" : index < 20 ? "Intermediate" : "Advanced",
  estimatedHours: Math.ceil(topicCount * 0.65),
  dependencies: dependencies.map((dependency) => `mod-cn-${dependency}`),
  optional: index >= 20
}));
