# Graphify

This project has a knowledge graph at graphify-out/ with god nodes, community
structure, and cross-file relationships.

Rules:

- For codebase questions, first run `graphify query "<question>"` when
  graphify-out/graph.json exists. Use `graphify path "<A>" "<B>"` for
  relationships and `graphify explain "<concept>"` for focused concepts. These
  return a scoped subgraph, usually much smaller than GRAPH_REPORT.md or raw
  grep output.
- If graphify-out/wiki/index.md exists, use it for broad navigation instead of
  raw source browsing.
- Read graphify-out/GRAPH_REPORT.md only for broad architecture review or when
  query/path/explain do not surface enough context.
- After modifying code, run `bun run graph` to keep the graph current. It
  runs `graphify update .`, which is AST-only and costs no API calls, then
  formats what it rewrote. Nothing does this for you: the pre-commit hook
  no longer refreshes the graph.
- That pass leaves the doc and concept nodes alone. Refreshing those is the
  `/graphify --update` skill, which spends API budget. Never delete
  `graphify-out/` first: `graphify update .` merges into the tracked
  `graph.json`, and rebuilding from an empty directory drops every semantic
  node.
