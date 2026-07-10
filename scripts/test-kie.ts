import { config } from "dotenv";
config({ path: ".env.local" });

import { kieChatJSON } from "../src/platform/kie-claude";

async function main() {
  const r = await kieChatJSON<{ answer: string }>(
    "Return JSON only.",
    'Reply with {"answer": "ok"}',
    { maxTokens: 128, thinkingFlag: false }
  );
  console.log("OK:", JSON.stringify(r));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
