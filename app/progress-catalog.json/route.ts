import { allTopics } from "@/data/all-topics";

export const dynamic = "force-static";

// Progress restoration needs identities, never lesson payloads or six datasets.
export function GET() {
  return Response.json(allTopics.map((topic) => topic.id));
}
