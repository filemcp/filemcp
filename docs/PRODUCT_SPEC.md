# Product Specification — filemcp

## Problem

Terminal AI (Claude, GPT, etc.) can generate high-quality HTML presentations, Markdown reports, JSON data visualizations, and other text-renderable content in seconds. But there is no fast, purpose-built way to:

1. Push that content to a URL in one command
2. Share it with someone who gets a clean, rendered view
3. Leave feedback inline without downloading the file or spinning up another tool
4. Maintain a history of iterations as you regenerate

People are currently emailing HTML files, pasting into Notion, or running `python -m http.server` locally. None of these are the right answer.

## Solution

filemcp is a hosting platform for AI-generated assets. Upload a file via `curl` or API key, get a permanent, shareable URL that renders it. Collaborators can view and comment inline without any account required to view (only to comment).

---

## User Personas

### Primary: The AI Power User (creator)
- Uses Claude/GPT heavily via CLI or API
- Generates HTML decks, Markdown reports, data dashboards as JSON/HTML
- Wants zero friction from "generated file" to "shareable link"
- Will integrate via `curl`, an SDK, or an MCP server

### Secondary: The Recipient (viewer/commenter)
- Received a link, possibly has no account
- Wants to view cleanly rendered content
- Wants to leave comments/notes on specific parts
- May or may not create their own account later

---

## Supported File Types (v1)

| Type | Render method |
|------|--------------|
| `.html` | Rendered in sandboxed iframe |
| `.md` | Server-side rendered to HTML (via remark/unified) |
| `.json` | Pretty-printed with collapsible tree viewer |
| `.txt` | Preformatted text |
| `.css` | Syntax-highlighted code view |
| `.js` / `.ts` | Syntax-highlighted code view |
| `.svg` | Rendered inline |

Binary files (images, PDFs, video) are out of scope for v1.

---

## Feature Spec

### F1 — Asset Upload

**Upload via curl (API key auth)**
```bash
curl -X POST https://filemcp.com/api/assets \
  -H "Authorization: Bearer <api-key>" \
  -F "file=@deck.html" \
  -F "slug=q3-review"
```

Response:
```json
{
  "url": "https://filemcp.com/u/username/q3-review",
  "version": 1,
  "versionUrl": "https://filemcp.com/u/username/q3-review/v/1",
  "assetId": "asset_xyz"
}
```

**Rules:**
- Slug is optional — if omitted, auto-generate a human-readable slug (`brave-falcon-42`)
- Uploading to an existing slug creates a new version (does not overwrite)
- File size limit: 10MB v1
- Max assets per user: 500 (soft limit, configurable)
- Supported MIME types validated server-side

---

### F2 — Asset Viewer

Public URL: `/u/:username/:slug`

- Renders the asset appropriately based on file type
- Shows asset metadata: title (filename), owner, last updated, version count
- "Versions" dropdown to switch between versions
- Comment thread visible in a side panel (collapsible)
- Click anywhere on the rendered content to open a comment anchor

No auth required to view public assets.

---

### F3 — Versioning

- Every upload to the same slug = new immutable version
- Latest version served at `/u/:username/:slug`
- Specific version at `/u/:username/:slug/v/:version` (integer, 1-indexed)
- Version list visible in the viewer UI
- Versions cannot be deleted (only the entire asset can be deleted by the owner)
- Version metadata: upload timestamp, file size, optional description (passed at upload time via `-F "description=..."`)

---

### F4 — Inline Commenting

The comment system is the core collaboration differentiator.

**Anchoring strategy (HTML assets) — decided:**
- x/y as a percentage of the rendered document dimensions is the primary anchor (`x_pct`, `y_pct`)
- On drop, we also capture a `selector_hint` (CSS selector path to the element under the cursor) as a secondary signal
- On render, pins are placed at the stored percentage coordinates; if the document dimensions have changed significantly between versions, `selector_hint` is used to re-derive a corrected position
- This gives full fidelity for stable layouts and graceful degradation for reflowed content

**Anchoring strategy (Markdown / text assets) — decided:**
- Comments are anchored to a line range (`lineStart`, `lineEnd`) in the source
- Selecting text in the rendered view triggers a "comment on this selection" prompt; line numbers are derived from the selection's position in the rendered output

**HTML rendering — decided:**
- Assets rendered in a sandboxed iframe: `sandbox="allow-scripts"` — no `allow-same-origin`
- Full fidelity (generated CSS/JS runs normally); iframe cannot access parent cookies or DOM

**Comment display:**
- Numbered pins visible on the rendered asset
- Side panel lists all comments in order, linked to their pin
- Clicking a pin highlights the comment in the panel; clicking a comment in the panel scrolls/highlights the pin

**Auth for commenting — decided:**
- Viewing: no auth required
- Commenting: **anonymous allowed** — commenter provides a display name (required) and optional email
- After submitting a comment, show a one-time inline nudge: "Save your comments and get notified on replies — create a free account" with a fast signup CTA
- If the user dismisses it, never show again (localStorage flag)
- If they provide an email at comment time, pre-fill it in the signup form
- Asset owner receives notification (email or in-app) on new comment
- Anonymous comments are visually distinguished (grey avatar, "Guest · display name")

**Comment threading:**
- Top-level comments on anchors
- Replies to comments (one level deep — no infinite nesting)
- Resolve/unresolve a comment thread (owner or commenter)

---

### F5 — Dashboard

Authenticated view at `/dashboard`.

**My Assets tab:**
- Grid/list of uploaded assets
- Thumbnail (auto-generated: screenshot of HTML, first 500 chars for text)
- Slug, version count, last updated, comment count
- Quick copy URL button
- Delete asset (with confirmation — deletes all versions)

**Shared With Me tab:**
- Assets where you've been explicitly granted view access (private assets)
- Assets where you have comment activity

**API Keys tab:**
- Generate named API keys
- Revoke keys
- Last-used timestamp per key

---

### F6 — Visibility & Sharing

- Default: **public** (anyone with the URL can view)
- Optional: **unlisted** (not indexed, but accessible by URL — like YouTube unlisted)
- Optional: **private** (only owner + explicitly invited users)
- Share modal: copy link, or invite by email (sends link via email — no special permissions system in v1, just "here's the URL")

Privacy is per-asset (not per-version). All versions of an asset share the same visibility setting.

---

### F7 — API Key Management

- Keys are scoped to a user account
- v1: no scope granularity (a key can do anything the user can do)
- Keys displayed once on creation, then only last 4 chars shown
- Rate limit: 100 uploads/day per key (soft limit, configurable)

---

### F8 — MCP Server (shipped)

An MCP server so Claude Code and other MCP-compatible clients can upload assets without leaving the AI conversation. Mounted at `POST /api/mcp`, auth via API key.

Tools: `upload_asset`, `list_assets`, `get_asset`, `read_asset_comments`

`upload_asset` returns a `curl` command for the AI to run — the AI executes it with Bash and gets back the asset URL inline.

`read_asset_comments` closes the loop: after viewers leave inline feedback in the browser, the agent can pull the threaded comments back into the conversation and revise before publishing a new version at the same URL.

---

## Non-Goals (v1)

- In-platform content editing or AI generation
- Real-time collaborative editing (not a doc editor)
- Binary file hosting (images, PDFs, video)
- Custom domains (deferred to v2)
- Advanced org permissions (fine-grained scopes per API key — deferred)
- Embeds / iframes for third-party sites (deferred)
- Analytics / view tracking (deferred)

---

## Success Metrics

- Time from file to shareable URL: < 2 seconds (p95)
- Zero-auth viewing: a recipient with no account should be able to view and understand the content in < 5 seconds after clicking a link
- Comment placement accuracy: a comment placed on v1 of an asset should still be reasonably positioned when viewing v2

---

## Resolved Decisions

| Question | Decision |
|----------|----------|
| Anonymous commenting? | Allowed with required display name + optional email; post-comment account nudge |
| HTML render: sandboxed iframe or sanitized re-render? | Sandboxed iframe (`allow-scripts`, no `allow-same-origin`) — full fidelity |
| Comment anchor strategy for HTML? | x/y percentage primary; CSS selector path as re-anchor fallback across versions |
| Markdown render: server-side or client-side? | Server-side at upload time — rendered HTML stored to S3 alongside original; viewer gets a fast pre-rendered page, same artifact is used for thumbnail generation |
