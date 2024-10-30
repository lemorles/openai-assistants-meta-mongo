import "dotenv/config";
import { createBot, createProvider, createFlow, addKeyword, EVENTS } from "@builderbot/bot";
import { MetaProvider as Provider } from "@builderbot/provider-meta";
import { toAsk, httpInject } from "@builderbot-plugins/openai-assistants";
import { MongoAdapter } from "@builderbot/database-mongo";
import { config } from "./config/config";
import { typing } from "./utils/presence";

const userQueues = new Map();
const userLocks = new Map();

/**
 * Function to process the user's message by sending it to the OpenAI API
 * and sending the response back to the user.
 */
const processUserMessage = async (ctx, { flowDynamic, state, provider }) => {
  await typing(ctx, provider);
  const response = await toAsk(config.ASSISTANT_ID, ctx.body, state);

  // Split the response into chunks and send them sequentially
  const chunksChat = response.split(/\n\n+/);
  for (const chunk of chunksChat) {
    const cleanedChunk = chunk.trim().replace(/【.*?】[ ] /g, "");

    await flowDynamic([{ body: cleanedChunk }]);
  }
};

/**
 * Function to handle the queue for each user.
 */
const handleQueue = async (userId) => {
  const queue = userQueues.get(userId);

  if (userLocks.get(userId)) return; // If locked, skip processing

  while (queue.length > 0) {
    userLocks.set(userId, true); // Lock the queue
    const { ctx, flowDynamic, state, provider } = queue.shift();
    try {
      await processUserMessage(ctx, { flowDynamic, state, provider });
    } catch (error) {
      console.error(`Error processing message for user ${userId}:`, error);
    } finally {
      userLocks.set(userId, false); // Release the lock
    }
  }

  userLocks.delete(userId); // Remove the lock once all messages are processed
  userQueues.delete(userId); // Remove the queue once all messages are processed
};

const assistantFlow = addKeyword<Provider, MongoAdapter>(EVENTS.WELCOME).addAction(
  async (ctx, { flowDynamic, state, provider }) => {
    const userId = ctx.from; // Use the user's ID to create a unique queue for each user

    if (!userQueues.has(userId)) {
      userQueues.set(userId, []);
    }

    const queue = userQueues.get(userId);
    queue.push({ ctx, flowDynamic, state, provider });

    // If this is the only message in the queue, process it immediately
    if (!userLocks.get(userId) && queue.length === 1) {
      await handleQueue(userId);
    }
  }
);

const main = async (): Promise<void> => {
  const adapterFlow = createFlow([assistantFlow]);

  // Meta Provider
  const adapterProvider = createProvider(Provider, {
    jwtToken: config.JWT_TOKEN,
    numberId: config.NUMBER_ID,
    verifyToken: config.VERIFY_TOKEN,
    version: config.META_VERSION,
  });

  const adapterDB = new MongoAdapter({
    dbUri: config.DB_URI,
    dbName: config.DB_NAME,
  });

  const { httpServer } = await createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });

  httpInject(adapterProvider.server);
  httpServer(+config.PORT);
};

main();
