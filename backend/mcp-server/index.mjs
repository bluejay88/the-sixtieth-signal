#!/usr/bin/env node
/**
 * The Sixtieth Signal — Agent MCP Server
 *
 * Exposes the backend's admin API as MCP tools so Claude (or any other
 * MCP-compatible agent/orchestrator) can act as the site's operations team:
 * reporting, subscribers, blog queue, customer support, orders, and the
 * security log.
 *
 * Setup:
 *   npm install @modelcontextprotocol/sdk
 *   export SIGNAL_BACKEND_URL="https://the-sixtieth-signal-backend.netlify.app"
 *   export SIGNAL_ADMIN_API_KEY="..."
 *   node index.mjs
 *
 * Then point any MCP client (Claude Desktop config, another agent
 * framework's MCP client, etc.) at this process over stdio.
 */
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

const BASE_URL = process.env.SIGNAL_BACKEND_URL;
const API_KEY = process.env.SIGNAL_ADMIN_API_KEY;

if (!BASE_URL || !API_KEY) {
  console.error(
    "Missing SIGNAL_BACKEND_URL or SIGNAL_ADMIN_API_KEY environment variables."
  );
  process.exit(1);
}

async function callApi(path, { method = "GET", body } = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${API_KEY}`,
      "content-type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    parsed = { raw: text };
  }
  if (!res.ok) {
    throw new Error(`API ${method} ${path} -> ${res.status}: ${JSON.stringify(parsed)}`);
  }
  return parsed;
}

const tools = [
  {
    name: "get_overview_report",
    description: "High-level KPI snapshot: subscriber totals, feedback backlog, blog queue status, gate engagement, security counts.",
    inputSchema: { type: "object", properties: {} },
    handler: () => callApi("/api/admin/overview"),
  },
  {
    name: "get_demographics_report",
    description: "Reader demographics: age range, region, format preference, acquisition source, 30-day signup trend.",
    inputSchema: { type: "object", properties: {} },
    handler: () => callApi("/api/admin/demographics"),
  },
  {
    name: "list_subscribers",
    description: "List waitlist/Circle subscribers, optionally filtered by status.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["waitlist", "circle_member", "unsubscribed"] },
        limit: { type: "number" },
        offset: { type: "number" },
      },
    },
    handler: (args) => {
      const q = new URLSearchParams();
      if (args?.status) q.set("status", args.status);
      if (args?.limit) q.set("limit", String(args.limit));
      if (args?.offset) q.set("offset", String(args.offset));
      return callApi(`/api/admin/subscribers?${q.toString()}`);
    },
  },
  {
    name: "update_subscriber_status",
    description: "Change a subscriber's status, e.g. promote from waitlist to circle_member.",
    inputSchema: {
      type: "object",
      required: ["id", "status"],
      properties: {
        id: { type: "number" },
        status: { type: "string", enum: ["waitlist", "circle_member", "unsubscribed"] },
      },
    },
    handler: (args) => callApi("/api/admin/subscribers", { method: "PATCH", body: args }),
  },
  {
    name: "list_feedback",
    description: "List reader feedback submissions.",
    inputSchema: { type: "object", properties: { limit: { type: "number" } } },
    handler: (args) => {
      const q = new URLSearchParams();
      if (args?.limit) q.set("limit", String(args.limit));
      return callApi(`/api/admin/feedback?${q.toString()}`);
    },
  },
  {
    name: "update_feedback_status",
    description: "Mark a feedback item reviewed or archived.",
    inputSchema: {
      type: "object",
      required: ["id", "status"],
      properties: { id: { type: "number" }, status: { type: "string", enum: ["new", "reviewed", "archived"] } },
    },
    handler: (args) => callApi("/api/admin/feedback", { method: "PATCH", body: args }),
  },
  {
    name: "list_blog_queue",
    description: "List dispatch/blog posts in the content queue, optionally filtered by status.",
    inputSchema: {
      type: "object",
      properties: { status: { type: "string", enum: ["draft", "review", "live", "rejected"] } },
    },
    handler: (args) => {
      const q = new URLSearchParams();
      if (args?.status) q.set("status", args.status);
      return callApi(`/api/admin/blog?${q.toString()}`);
    },
  },
  {
    name: "create_blog_draft",
    description: "Draft a new dispatch/blog post. Always lands as status=draft; never auto-published.",
    inputSchema: {
      type: "object",
      required: ["title", "body_md"],
      properties: {
        title: { type: "string" },
        body_md: { type: "string" },
        tag: { type: "string" },
        author: { type: "string", description: "Name/role of the authoring agent." },
      },
    },
    handler: (args) => callApi("/api/admin/blog", { method: "POST", body: args }),
  },
  {
    name: "update_blog_status",
    description: "Move a post through draft -> review -> live (or rejected). This is the only way content goes public.",
    inputSchema: {
      type: "object",
      required: ["id", "status"],
      properties: { id: { type: "number" }, status: { type: "string", enum: ["draft", "review", "live", "rejected"] } },
    },
    handler: (args) => callApi("/api/admin/blog", { method: "PATCH", body: args }),
  },
  {
    name: "list_support_tickets",
    description: "List customer support tickets, optionally by status, or fetch one ticket (with replies) via ticket_id.",
    inputSchema: {
      type: "object",
      properties: {
        status: { type: "string", enum: ["open", "pending", "resolved", "escalated"] },
        ticket_id: { type: "number" },
      },
    },
    handler: (args) => {
      const q = new URLSearchParams();
      if (args?.status) q.set("status", args.status);
      if (args?.ticket_id) q.set("ticket_id", String(args.ticket_id));
      return callApi(`/api/admin/support?${q.toString()}`);
    },
  },
  {
    name: "reply_to_support_ticket",
    description: "Post a reply to an existing support ticket as a named agent.",
    inputSchema: {
      type: "object",
      required: ["ticket_id", "message"],
      properties: {
        ticket_id: { type: "number" },
        message: { type: "string" },
        author: { type: "string", description: "e.g. 'customer-success-agent'" },
      },
    },
    handler: (args) => callApi("/api/admin/support", { method: "POST", body: args }),
  },
  {
    name: "update_support_ticket",
    description: "Update a ticket's status, priority, or assigned agent. Use 'escalated' for anything needing a human.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "number" },
        status: { type: "string", enum: ["open", "pending", "resolved", "escalated"] },
        priority: { type: "string", enum: ["low", "normal", "high", "urgent"] },
        assigned_agent: { type: "string" },
      },
    },
    handler: (args) => callApi("/api/admin/support", { method: "PATCH", body: args }),
  },
  {
    name: "list_orders",
    description: "List book sales orders with a revenue summary and per-product breakdown.",
    inputSchema: {
      type: "object",
      properties: { status: { type: "string", enum: ["pending", "paid", "refunded", "cancelled"] } },
    },
    handler: (args) => {
      const q = new URLSearchParams();
      if (args?.status) q.set("status", args.status);
      return callApi(`/api/admin/orders?${q.toString()}`);
    },
  },
  {
    name: "update_order_status",
    description: "Update an order's status (e.g. mark paid or refunded). Refunds are logged as warning-severity security events.",
    inputSchema: {
      type: "object",
      required: ["id", "status"],
      properties: { id: { type: "number" }, status: { type: "string", enum: ["pending", "paid", "refunded", "cancelled"] } },
    },
    handler: (args) => callApi("/api/admin/orders", { method: "PATCH", body: args }),
  },
  {
    name: "list_audiobook_clips",
    description: "List all audiobook chapter sample clips (draft and live).",
    inputSchema: { type: "object", properties: {} },
    handler: () => callApi("/api/admin/audiobook"),
  },
  {
    name: "create_audiobook_clip",
    description: "Add a new audiobook chapter sample. Lands as status=draft until flipped live.",
    inputSchema: {
      type: "object",
      required: ["chapter_label", "title"],
      properties: {
        chapter_label: { type: "string" },
        title: { type: "string" },
        narrator: { type: "string" },
        audio_url: { type: "string" },
        duration_seconds: { type: "number" },
        order_index: { type: "number" },
        status: { type: "string", enum: ["draft", "live"] },
      },
    },
    handler: (args) => callApi("/api/admin/audiobook", { method: "POST", body: args }),
  },
  {
    name: "update_audiobook_clip",
    description: "Update a clip's metadata or flip it live/draft. This is the only way a sample reaches the public site.",
    inputSchema: {
      type: "object",
      required: ["id"],
      properties: {
        id: { type: "number" },
        chapter_label: { type: "string" },
        title: { type: "string" },
        narrator: { type: "string" },
        audio_url: { type: "string" },
        duration_seconds: { type: "number" },
        order_index: { type: "number" },
        status: { type: "string", enum: ["draft", "live"] },
      },
    },
    handler: (args) => callApi("/api/admin/audiobook", { method: "PATCH", body: args }),
  },
  {
    name: "get_security_log",
    description: "Read the audit/security event log: auth failures, rate limits, spam blocks, admin actions, anomalies.",
    inputSchema: {
      type: "object",
      properties: {
        severity: { type: "string", enum: ["info", "warning", "critical"] },
        limit: { type: "number" },
      },
    },
    handler: (args) => {
      const q = new URLSearchParams();
      if (args?.severity) q.set("severity", args.severity);
      if (args?.limit) q.set("limit", String(args.limit));
      return callApi(`/api/admin/security-log?${q.toString()}`);
    },
  },
];

const server = new Server(
  { name: "sixtieth-signal-backend", version: "1.0.0" },
  { capabilities: { tools: {} } }
);

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: tools.map(({ name, description, inputSchema }) => ({ name, description, inputSchema })),
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const tool = tools.find((t) => t.name === request.params.name);
  if (!tool) {
    throw new Error(`Unknown tool: ${request.params.name}`);
  }
  const result = await tool.handler(request.params.arguments ?? {});
  return { content: [{ type: "text", text: JSON.stringify(result, null, 2) }] };
});

const transport = new StdioServerTransport();
await server.connect(transport);
console.error("Sixtieth Signal MCP server running on stdio.");
