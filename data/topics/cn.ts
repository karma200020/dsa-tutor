import { foundationLessons } from "../cn/foundations";
import { transportLessons } from "../cn/transport";
import { applicationLessons } from "../cn/applications";
import { productionLessons } from "../cn/production";
import { specialistLessons } from "../cn/specialists";
import { networkTopic } from "../cn/schema";

const labAssignments: Record<string, string> = {
  "packet-journey": "routes",
  "cidr-host-ranges": "subnet",
  "arp-cache": "arp-dhcp",
  "dhcp-leases": "arp-dhcp",
  "dns-resolution": "dns",
  "tcp-handshake": "tcp",
  "http-caching": "http-cache",
  "tls-browser-handshake": "tls",
  "ipv6-coexistence": "dual-stack"
};
export const cnLessons = [
  ...foundationLessons, ...transportLessons, ...applicationLessons,
  ...productionLessons, ...specialistLessons
].map((lesson) => ({ ...lesson, lab: labAssignments[lesson.id] ?? lesson.lab }));
export const allCnTopics = cnLessons.map(networkTopic);
