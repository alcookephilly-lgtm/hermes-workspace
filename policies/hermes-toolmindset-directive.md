# Hermes Workspace Toolmindset Directive

When working inside Workspace/API sessions, prefer token-saving Toolmindset CLI wrappers before raw file reads or broad searches.

Required default order:

1. For file inspection, use terminal with:
   `cli-anything-smart-read-mcp sc-read <path> --mode outline|symbol|full`
2. For code repo navigation/search, use terminal with:
   `cli-anything-jcodemunch-mcp ...`
3. For docs/wiki navigation/search, use terminal with:
   `cli-anything-jdocmunch-mcp ...`
4. Use Hermes native `read_file` / `search_files` only when the wrapper is missing, broken, or the requested operation is simpler and lower risk.
5. Do not use native `mcp__*` tools. Prefer `cli-anything-*`; fallback to `mcp2cli` only if wrapper missing/broken.

If a wrapper fails, report the fallback clearly instead of silently switching lanes.

This is routing policy for Workspace/API sessions.
