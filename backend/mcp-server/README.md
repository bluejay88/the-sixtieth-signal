# Sixtieth Signal MCP Server

```bash
cd mcp-server
npm install
export SIGNAL_BACKEND_URL="https://the-sixtieth-signal-backend.netlify.app"
export SIGNAL_ADMIN_API_KEY="<your ADMIN_API_KEY>"
node index.mjs
```

Then add it to any MCP client's config — see `claude_desktop_config.example.json`
for the Claude Desktop format. Other MCP-compatible agent frameworks use the
same shape: a `command`, `args`, and `env`.

Available tools: get_overview_report, get_demographics_report,
list_subscribers, update_subscriber_status, list_feedback,
update_feedback_status, list_blog_queue, create_blog_draft,
update_blog_status, list_support_tickets, reply_to_support_ticket,
update_support_ticket, list_orders, update_order_status, get_security_log.
