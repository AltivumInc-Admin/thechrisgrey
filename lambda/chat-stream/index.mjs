import {
  BedrockRuntimeClient,
  ConverseStreamCommand,
} from "@aws-sdk/client-bedrock-runtime";
import {
  BedrockAgentRuntimeClient,
  RetrieveCommand,
} from "@aws-sdk/client-bedrock-agent-runtime";

const bedrockClient = new BedrockRuntimeClient({ region: "us-east-1" });
const agentClient = new BedrockAgentRuntimeClient({ region: "us-east-1" });

const MODEL_ID = "us.anthropic.claude-haiku-4-5-20251001-v1:0";
const KNOWLEDGE_BASE_ID = "ARFYABW8HP";

// Base system prompt defining the AI persona
const BASE_SYSTEM_PROMPT = `You are an AI assistant representing Christian Perez (also known as @thechrisgrey). You help visitors learn about his background, work, and expertise.

CRITICAL FORMATTING RULES:
- Write in plain text only. NO markdown formatting whatsoever.
- Do NOT use **bold**, *italics*, headers, or bullet points/lists.
- Write in natural flowing paragraphs, like a conversation.
- Keep responses concise: 2-3 sentences for simple questions, 4-6 sentences max for complex topics.
- Be direct and get to the point quickly.

Your tone:
- Conversational and friendly, like chatting with someone
- Knowledgeable but not preachy or lecture-like
- Warm and approachable

Guidelines:
- Answer questions about Christian's background, Altivum, the podcast, and his book
- Synthesize information naturally - don't list every detail from the context
- If asked about topics outside your knowledge, briefly redirect to what you do know
- Never make up information - stick to the facts provided
- You can mention visiting the website for more details`;

/**
 * Retrieve relevant context from Knowledge Base
 */
async function retrieveContext(query) {
  try {
    const command = new RetrieveCommand({
      knowledgeBaseId: KNOWLEDGE_BASE_ID,
      retrievalQuery: { text: query },
      retrievalConfiguration: {
        vectorSearchConfiguration: {
          numberOfResults: 5,
        },
      },
    });

    const response = await agentClient.send(command);

    if (!response.retrievalResults || response.retrievalResults.length === 0) {
      return null;
    }

    // Combine retrieved chunks into context
    const contextChunks = response.retrievalResults
      .filter(result => result.content?.text)
      .map(result => result.content.text);

    return contextChunks.join("\n\n---\n\n");
  } catch (error) {
    console.error("Knowledge Base retrieval error:", error);
    return null;
  }
}

/**
 * Build system prompt with retrieved context
 */
function buildSystemPrompt(retrievedContext) {
  if (!retrievedContext) {
    return `${BASE_SYSTEM_PROMPT}

Note: No specific context was retrieved for this query. Answer based on general knowledge about Christian Perez as the Founder & CEO of Altivum Inc., a former Green Beret (18D), host of The Vector Podcast, and author of "Beyond the Assessment."`;
  }

  return `${BASE_SYSTEM_PROMPT}

=== RETRIEVED CONTEXT ===
The following information was retrieved from Christian's personal knowledge base. Use this to provide accurate, detailed answers:

${retrievedContext}

=== END CONTEXT ===

Use the context above to inform your answer, but respond conversationally in plain text. Pick the most relevant details - don't try to include everything.`;
}

/**
 * Get the user's latest message for retrieval query
 */
function getLatestUserMessage(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === "user") {
      return messages[i].content;
    }
  }
  return null;
}

export const handler = awslambda.streamifyResponse(
  async (event, responseStream, _context) => {
    // Handle preflight OPTIONS request
    if (event.requestContext?.http?.method === "OPTIONS") {
      responseStream.write("");
      responseStream.end();
      return;
    }

    try {
      const body = JSON.parse(event.body || "{}");
      const messages = body.messages || [];

      if (messages.length === 0) {
        responseStream.write("Please send a message to start our conversation.");
        responseStream.end();
        return;
      }

      // Get the latest user message for retrieval
      const latestQuery = getLatestUserMessage(messages);

      // Retrieve context from Knowledge Base
      let retrievedContext = null;
      if (latestQuery) {
        retrievedContext = await retrieveContext(latestQuery);
      }

      // Build system prompt with context
      const systemPrompt = buildSystemPrompt(retrievedContext);

      // Convert messages to Bedrock format
      const bedrockMessages = messages.map((msg) => ({
        role: msg.role,
        content: [{ text: msg.content }],
      }));

      const command = new ConverseStreamCommand({
        modelId: MODEL_ID,
        messages: bedrockMessages,
        system: [{ text: systemPrompt }],
        inferenceConfig: {
          maxTokens: 512,
          temperature: 0.6,
        },
      });

      const response = await bedrockClient.send(command);

      // Stream the response chunks
      for await (const event of response.stream) {
        if (event.contentBlockDelta) {
          const text = event.contentBlockDelta.delta?.text;
          if (text) {
            responseStream.write(text);
          }
        }
      }

      responseStream.end();
    } catch (error) {
      console.error("Error:", error);
      responseStream.write(
        "I apologize, but I encountered an error processing your request. Please try again."
      );
      responseStream.end();
    }
  }
);
