import { config } from "dotenv";
config({ path: ".env.local" });

import {
  fetchLiveBehaviorSnapshot,
  ingestAnalyticsEvent,
  liveAnalyticsEnabled,
} from "../src/shared/db/live-store";

async function main() {
  console.log("Supabase configured:", liveAnalyticsEnabled());
  if (!liveAnalyticsEnabled()) {
    console.error("Missing env vars");
    process.exit(1);
  }

  const token = `test-${Date.now()}`;
  await ingestAnalyticsEvent({
    sessionToken: token,
    variantId: "v1-roi",
    generation: 0,
    strategy: "roi",
    event: "session_start",
  });
  await ingestAnalyticsEvent({
    sessionToken: token,
    variantId: "v1-roi",
    event: "section_view",
    sectionId: "hero",
  });
  await ingestAnalyticsEvent({
    sessionToken: token,
    variantId: "v1-roi",
    event: "cta_click",
    sectionId: "hero",
    converted: true,
  });

  const snap = await fetchLiveBehaviorSnapshot(30);
  console.log("Sessions:", snap?.totalSessions);
  console.log("Top variant:", snap?.metrics[0]?.variantId, snap?.metrics[0]?.conversionRate);
  console.log("OK");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
