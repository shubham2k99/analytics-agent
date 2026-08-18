import Anthropic from "@anthropic-ai/sdk";
import { AppSession } from "./session";
import { getValidAccessToken, listGA4Properties, runGA4Report } from "./ga4";

const MODEL = "claude-sonnet-4-6";

const SYSTEM_PROMPT = `You are an analytics assistant with live access to a user's Google Analytics 4 (GA4) property via tools.

Guidelines:
- Always use the run_ga4_report tool to fetch real data before answering questions about traffic, users, sessions, conversions, engagement, etc. Never invent numbers.
- Pick sensible GA4 metric/dimension API names. Common ones:
  Metrics: activeUsers, newUsers, sessions, screenPageViews, engagementRate, averageSessionDuration, conversions, totalRevenue, bounceRate, eventCount
  Dimensions: date, country, city, deviceCategory, sessionSource, sessionMedium, sessionDefaultChannelGroup, pagePath, pageTitle, browser
- Interpret relative dates yourself (e.g. "last 30 days") and pass ISO date strings or GA4 relative date keywords (today, yesterday, NdaysAgo) to dateRanges.
- If the user asks for a trend over time, include "date" as a dimension so the data can be charted as a time series.
- After getting tool results, write a concise, insight-focused natural-language answer (call out notable numbers, trends, comparisons) — don't just restate the raw table.
- Always close your answer with one short line suggesting a specific, relevant next thing worth investigating (e.g. a related metric to check, a time range worth comparing, a segment worth breaking down) — grounded in the data you actually fetched, not generic advice.
- If the answer is well suited to a chart (trends, comparisons, breakdowns, top-N lists), also produce a chart specification by calling the propose_chart tool with the exact data to plot. Only propose one chart per answer, and only when it genuinely helps.
- If you don't know which GA4 property to use, call list_ga4_properties first.
- Be concise. This is a chat interface, not a report document.`;

const tools: Anthropic.Tool[] = [
  {
    name: "list_ga4_properties",
    description: "List the GA4 properties the connected Google account has access to.",
    input_schema: { type: "object", properties: {}, required: [] },
  },
  {
    name: "run_ga4_report",
    description:
      "Run a report against the GA4 Data API for the currently selected property. Returns rows of dimension/metric values.",
    input_schema: {
      type: "object",
      properties: {
        dateRanges: {
          type: "array",
          items: {
            type: "object",
            properties: {
              startDate: { type: "string", description: "YYYY-MM-DD or GA4 relative keyword like '30daysAgo', 'today'" },
              endDate: { type: "string", description: "YYYY-MM-DD or GA4 relative keyword like 'today'" },
              name: { type: "string", description: "Optional label, e.g. 'this_month'" },
            },
            required: ["startDate", "endDate"],
          },
        },
        metrics: {
          type: "array",
          items: { type: "string" },
          description: "GA4 metric API names, e.g. ['activeUsers','sessions']",
        },
        dimensions: {
          type: "array",
          items: { type: "string" },
          description: "GA4 dimension API names, e.g. ['date','country']",
        },
        limit: { type: "number", description: "Max rows to return, default 50" },
        orderBys: {
          type: "array",
          items: {
            type: "object",
            properties: {
              metric: { type: "string" },
              dimension: { type: "string" },
              desc: { type: "boolean" },
            },
          },
        },
      },
      required: ["dateRanges", "metrics"],
    },
  },
  {
    name: "propose_chart",
    description: "Emit a chart to render alongside your answer.",
    input_schema: {
      type: "object",
      properties: {
        chartType: { type: "string", enum: ["line", "bar", "pie"] },
        title: { type: "string" },
        xKey: { type: "string", description: "Field name in data rows to use as the x-axis / category" },
        series: {
          type: "array",
          items: { type: "string" },
          description: "Field name(s) in data rows to plot as values",
        },
        data: {
          type: "array",
          items: { type: "object" },
          description: "The actual rows to plot, each an object with xKey and series fields",
        },
      },
      required: ["chartType", "title", "xKey", "series", "data"],
    },
  },
];

export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface ChartSpec {
  chartType: "line" | "bar" | "pie";
  title: string;
  xKey: string;
  series: string[];
  data: Record<string, any>[];
}

export interface AgentResult {
  reply: string;
  chart?: ChartSpec;
}

export async function runAgent(
  session: AppSession,
  history: ChatTurn[],
  userMessage: string
): Promise<AgentResult> {
  const apiKey = session.anthropicApiKey || process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "No Anthropic API key available. Add your own key to use the chat."
    );
  }
  const anthropic = new Anthropic({ apiKey });

  const messages: Anthropic.MessageParam[] = [
    ...history.map((h) => ({ role: h.role, content: h.content } as Anthropic.MessageParam)),
    { role: "user", content: userMessage },
  ];

  let chart: ChartSpec | undefined;
  const contextNote = session.propertyId
    ? `(Currently selected GA4 property: ${session.propertyName ?? session.propertyId})`
    : `(No GA4 property selected yet — call list_ga4_properties if needed.)`;

  for (let iteration = 0; iteration < 6; iteration++) {
    const response = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 2000,
      system: `${SYSTEM_PROMPT}\n\n${contextNote}`,
      tools,
      messages,
    });

    const toolUseBlocks = response.content.filter(
      (b): b is Anthropic.ToolUseBlock => b.type === "tool_use"
    );

    if (toolUseBlocks.length === 0) {
      const text = response.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");
      return { reply: text, chart };
    }

    messages.push({ role: "assistant", content: response.content });

    const toolResults: Anthropic.ToolResultBlockParam[] = [];
    for (const toolUse of toolUseBlocks) {
      try {
        if (toolUse.name === "list_ga4_properties") {
          const accessToken = await getValidAccessToken(session);
          const properties = await listGA4Properties(accessToken);
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(properties),
          });
        } else if (toolUse.name === "run_ga4_report") {
          if (!session.propertyId) {
            toolResults.push({
              type: "tool_result",
              tool_use_id: toolUse.id,
              content: "No GA4 property selected. Ask the user to pick one, or call list_ga4_properties.",
              is_error: true,
            });
            continue;
          }
          const accessToken = await getValidAccessToken(session);
          const input = toolUse.input as any;
          const result = await runGA4Report(accessToken, {
            propertyId: session.propertyId,
            dateRanges: input.dateRanges,
            metrics: input.metrics,
            dimensions: input.dimensions,
            limit: input.limit,
            orderBys: input.orderBys,
          });
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: JSON.stringify(result),
          });
        } else if (toolUse.name === "propose_chart") {
          chart = toolUse.input as ChartSpec;
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: "Chart queued for rendering.",
          });
        } else {
          toolResults.push({
            type: "tool_result",
            tool_use_id: toolUse.id,
            content: `Unknown tool: ${toolUse.name}`,
            is_error: true,
          });
        }
      } catch (err: any) {
        toolResults.push({
          type: "tool_result",
          tool_use_id: toolUse.id,
          content: `Error: ${err.message}`,
          is_error: true,
        });
      }
    }

    messages.push({ role: "user", content: toolResults });
  }

  return { reply: "I ran into trouble completing that request — please try rephrasing.", chart };
}
