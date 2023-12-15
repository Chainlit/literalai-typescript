import "dotenv/config";
import OpenAI from "openai";
import { Chainlit, User } from "../src";

async function main() {
  const chainlit = new Chainlit();
  const openai = new OpenAI();
  const syncer = chainlit.openaiAssistantSyncer(openai);

  const threadId = "thread_B0r8A8t5SFTjzBMv7fMaI5Ak";

  const user = new User({ identifier: "willy", metadata: { name: "Willy" } });

  await syncer.syncThread(threadId, user);
}

main()
  .then(() => process.exit(0))
  .catch((error) => console.error(error));
