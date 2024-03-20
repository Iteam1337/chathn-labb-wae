import { kv } from "@vercel/kv";
import { Ratelimit } from "@upstash/ratelimit";
import { OpenAI } from "openai";
import { OpenAIStream, StreamingTextResponse } from "ai";
import { functions, get_forecast, runFunction, tools } from "./functions";
import { Stream } from "openai/streaming";

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

export const runtime = "edge";

export async function POST(req: Request) {
  if (
    process.env.NODE_ENV !== "development" &&
    process.env.KV_REST_API_URL &&
    process.env.KV_REST_API_TOKEN
  ) {
    const ip = req.headers.get("x-forwarded-for");
    const ratelimit = new Ratelimit({
      redis: kv,
      limiter: Ratelimit.slidingWindow(50, "1 d"),
    });

    const { success, limit, reset, remaining } = await ratelimit.limit(
      `chathn_ratelimit_${ip}`,
    );

    if (!success) {
      return new Response("You have reached your request limit for the day.", {
        status: 429,
        headers: {
          "X-RateLimit-Limit": limit.toString(),
          "X-RateLimit-Remaining": remaining.toString(),
          "X-RateLimit-Reset": reset.toString(),
        },
      });
    }
  }

  const { messages: prompts } = await req.json();
  const messages = [
    {
      role: "system",
      content: `
      1. The current time is ${new Date().toISOString()}
      2. If asked about weather forecasts, please answer with a bulleted list containing the following items:
      - temperature
      - cloudiness
      - humidity
      - wind
      - precipitation
      3. When displaying temperatures, use fahrenheit. Convert any celsius values to fahrenheit.
      4. When displaying weather for a location, always include the coordinates in the answer.`,
    },
    ...prompts,
  ];

  // check if the conversation requires a function call to be made
  const response = await openai.chat.completions.create({
    model: "gpt-3.5-turbo-0125",
    messages,
    stream: false,
    tools: [{ type: "function", function: functions[0] }],
    tool_choice: "auto",
  });

  const responseMessage = response.choices[0].message;

  const toolCalls = responseMessage.tool_calls;
  if (toolCalls) {
    messages.push(responseMessage);
    for (const toolCall of toolCalls) {
      const functionName = toolCall.function.name;
      const functionArgs = JSON.parse(toolCall.function.arguments);

      console.log("tool call: ", toolCall);
      const functionResponse = await get_forecast({
        coordinate: functionArgs.coordinate,
        date: functionArgs.date,
      });

      messages.push({
        tool_call_id: toolCall.id,
        role: "tool",
        name: functionName,
        content: JSON.stringify(functionResponse),
      }); // extend conversation with function response
    }

    const secondResponse = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-0125",
      messages: messages,
      stream: true,
    }); // get a new response from the model where it can see the function response

    const stream = OpenAIStream(secondResponse);
    return new StreamingTextResponse(stream);
  }
}
