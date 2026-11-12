# AGENTS.md



Operational constitution, architecture standards, and safety governance for AI coding agents (Antigravity, Claude Code, Cursor, Copilot, OpenCode) working in the **CAVDAX** repository.



---



## 1. Absolute Inviolable Guardrails (Read First)

0. **Universal Strict Ban on the Word "Telemetry"**:
   - **Absolute ban**: Never use the word "telemetry" or "Telemetry" anywhere — in code, UI copy, button labels, tabs, component props, console logs, test scripts, design tokens, or documentation.
   - Replace universally with "Metrics", "Diagnostics", "Signals", "Activity", or "Observability".
   - Any usage of "telemetry" is a strict violation and must be caught and removed before completing any task.

0b. **Universal Ban on Pseudo-Terminal `//` in UI Text & Generic AI Patterns (AI Slop Purge)**:
   - **Strict Ban on `//` in UI Copy**: Never use `//` as a visual separator, status delimiter, or decorative flair in headings, subheaders, badges, plaques, cards, buttons, or tooltips (e.g. `CAVDAX // CORE DEV ENCLAVE`, `Action Verified // Provenance Intact`). Use clean standard typography: em-dash `—`, bullet `•`, pipe `|`, or whitespace. (Standard code comments `// ...` and URL protocols `https://` remain valid).
   - **Strict Ban on AI Copywriting Tropes**: Ban all empty marketing filler and AI-generated hype phrases:
     - *"Elevate your workflow / experience"*
     - *"Unlock the power of / Unleash the potential"*
     - *"Seamlessly integrate / Seamless collaboration"*
     - *"In today's fast-paced digital landscape / world"*
     - *"Revolutionize / Game-changer / Next-gen paradigm"*
     - *"A testament to / Rich tapestry / Delve into"*
     - *"Say goodbye to / Look no further"*
     - Write crisp, declarative, engineering-grade technical copy describing concrete mechanics (e.g. *"Deterministic Causal Traversal"*, *"Sub-Millisecond Invalidation"*).
   - **Strict Ban on AI Visual Clichés (Design Slop)**:
     - **No Purple/Cyan Cyberpunk Gradients**: Ban generic neon violet-to-cyan glows (`from-purple-600 to-cyan-500`). Stick strictly to the monochrome palette (obsidian, slate, zinc, stark white) with purposeful semantic accents (emerald green for verified, rose red for blocked).
     - **No Cardocalypse**: Never nest cards inside cards inside cards. Use clean typography hierarchy, subtle hairline borders (`border-white/10`), and whitespace.
     - **No Decorative 3D Wireframe Polyhedra / Sparkles**: Every visual artifact must map directly to real causal graph nodes, edges, or state vectors.
     - **Zero Emojis**: Strictly 0 emojis in UI chrome, headings, badges, tooltips, or commit messages.



0d. **Concise UI Copy, Zero Wall-of-Text & Dev Integrity Standard**:
   - **Banned Verbose Mechanical Paragraphs**: Never write bloated multi-sentence mechanical paragraphs in security gates, modal confirmations, or terminal prompts (e.g. strictly banning blocks like *"Restricted developer terminal. Hardware IP whitelist matched and authorized GitHub handle detected. Enter your Master Developer Passkey to unlock the causal intercept console."*).
   - **Rule**: Keep security and modal prompts to a single concise, punchy sentence: e.g. *"Authorized session detected. Enter master passkey to unlock the causal console."* or *"This clears active dev tokens, locks the enclave immediately, and returns to the home page."*
   - **Zero Public Leakage of Dev Endpoints & Enclave Cloaking (Strict Inviolable Rule)**:
     - In production security engineering, internal developer consoles and administrative routes must NEVER be advertised, linked, or hinted at on public pages, navigation footers, or client error messages.
     - **Zero Leakage in Tracked Repo Files (.env.example, README.md, docs/)**: Never document, list, comment, or hint at developer enclave routes, developer IP whitelists, developer handles, or master passkeys in .env.example or ANY tracked public repository files.
     - .env.example must contain ONLY public application configuration variables (database, MCP tokens, standard OAuth, billing keys). Internal developer configurations belong strictly in private, uncommitted .env files distributed out-of-band via secure channels.
     - **Universal Ban on Real or Real-Looking IP Addresses**: Never write real public IPs or ISP addresses in tracked code or comments. Only RFC 5737 documentation test nets (192.0.2.1, 198.51.100.1) or localhost (127.0.0.1) may ever appear in examples.
     - Access to the private developer enclave must remain strictly restricted to direct URL navigation, hardware IP whitelisting, and authorized GitHub handles/passkeys with silent 404 responses for unauthorized visitors without leaving breadcrumbs for public crawlers.
   - **Zero Fake Metrics or Vanity Clutter**: Never display simulated hardcoded numbers (e.g. fake client counts, fake node tallies, simulated latencies). Keep all dev console diagnostics grounded strictly in genuine operational status (e.g. Gateway: ENFORCING, Database: CONNECTED, Session: VERIFIED, Device IP: WHITELISTED).

0e. **Integration Lifecycle, Connected Workspace Monochromy & Zero Clutter Guard**:
   - **Mandatory Disconnect / Unlink Action (Reversible Lifecycle Guard)**:
     - Every connected integration, third-party repository, OAuth session, or API key MUST have an explicit, easily accessible Disconnect / Unlink / Remove action.
     - Never lock users into connected states without an intuitive, reversible teardown path.
     - Unlinking must cleanly purge local state, adjust quota meters, and smoothly transition the interface back to the default fallback or demo state.
   - **Monochromatic Connected Workspaces (No Fragmented Theme Shifts)**:
     - Connected tenant environments, repository headers, and status cards must strictly adhere to the project's calibrated monochromatic design system (`slate`/`zinc`/`neutral`/`white`/`black`).
     - Never introduce arbitrary purple, amber, cyan, or custom accent colors to distinguish tenant spaces.
   - **Zero Promotional Demo Clutter in Real User Workspaces**:
     - Once a user has connected their own repository or tenant project, never display promotional or redundant demo-mode action cards (such as "Run 4-Act Showcase" or "Evaluate Mock Sandbox").
     - Empty states in authentic user workspaces must focus 100% on onboarding the user's own repository (scaffolding an architectural baseline or displaying CLI ingestion instructions).
   - **GitHub Organization OAuth Ingestion Rule**:
     - When querying user repositories via the GitHub API (`/user/repos`), always include `affiliation=owner,collaborator,organization_member` so organization-owned repositories are not silently filtered out.


0f. **Production Developer Console Dignity & Ban on Toy/Detour Paradigms**:
   - **Console Dignity Standard**: The platform must always maintain the calm, rigorous authority of an enterprise infrastructure console. Decisions, copies, or architectural controls must never make the console feel like a temporary student toy, marketing detour, or toy sandbox.
   - **Zero Demo Detour Buttons in Production Workspaces**: Never place buttons like "Return to Showcase" or "Back to Demo" inside connected tenant workspaces. Workspace switching belongs strictly in top-level navigation.
   - **Onboarding vs Incident Framing**: Zero-state configurations (e.g. 0 ADRs detected) are normal onboarding lifecycle states, NOT incidents or system warnings. Never use amber warning icons (`AlertCircle`) for empty states; use monochromatic neutral glyphs (`FolderGit2`).
   - **Single Monochromatic Onboarding CTA**: Ban multi-card promotional clutter in tenant empty states. Provide a single monochromatic setup action and terminal instructions.

0g. **Mandatory UI Design System MD Enforcement & Zero Displacement Toast Architecture**:
   - **Mandatory Consultation of `docs/UI_DESIGN_SYSTEM.md`**:
     Whenever creating, editing, removing, adding, or modifying ANY UI component, panel, modal, badge, button, or layout (specifically including the Developer Enclave, Profile Page, HUD consoles, and tier testing panels), agents MUST first read and dedicatedly adhere to `docs/UI_DESIGN_SYSTEM.md`. No exceptions.
   - **Strict Ban on In-Panel Displacing Banners and Toasts (Zero CLS Guarantee)**:
     - Never render confirmation banners, error notices, or dynamic toasts inline inside cards, above lists, or within grid containers where their appearance or disappearance causes vertical layout displacement, jumping, or layout shifts (CLS > 0) of sibling panels, input fields, or buttons.
     - All operation feedback (e.g. tier toggles, IP whitelisting, roster changes, scenario injection) MUST use non-displacing viewport-fixed overlays (`fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none`) or dedicated pre-allocated zero-shift status indicators.
   - **Monochromatic Purity Standard**:
     - All developer panels, controls, and notices must strictly use the project's obsidian, slate, zinc, porcelain, and monochrome scale (`border-slate-300 dark:border-white/10 bg-slate-100/50 dark:bg-white/[0.02]`).
     - Ban all uncalibrated color fills (purple, cyan, yellow, pink) unless signifying strict, verified semantic operational states (e.g. green for cryptographic verification pass, red for blocked security denial).

0h. **Settings Panel Ergonomics, Subtext Cleanliness & Anti-Debug Scaffolding Standard**:
   - **Strict Ban on Leaking Code Implementation Details in End-User Copy**:
     - Never display internal hexadecimal color codes (e.g. `(#060709)`, `(#F8FAFC)`), CSS class names, regex patterns, or raw token identifiers in user-facing settings, modal subtexts, or UI cards.
     - Always use clean, human-readable semantic naming (e.g. `Deep Obsidian Dark`, `Porcelain Light Minimalist`).
   - **Strict Ban on "Test" / Audition Scaffolding Buttons Crammed Next to Toggles**:
     - Never insert clunky rectangular "Test" or "Audition" button pills into settings rows next to toggle switches.
     - Toggling or interacting with the control itself must provide immediate sensory/auditory feedback.
     - Maintain a strict, unbroken two-column rhythm: `[Icon + Label + Optional Subtext] -------------- [Control/Toggle]`.
   - **Strict Ban on Fake / Unowned Domains in Production Code and Error Prompts**:
     - Never reference unowned placeholder domains (e.g. `team@cavdax.org`, `support@xyz.fake`). Use the real verified production domain (e.g. `contact@sahnirmaan.live`) or a dedicated team mailbox.
   - **Pricing Cleanliness, Currency Localization & Anti-Combobox Standard**:
     - Enterprise tiers must remain clean and authoritative: `Custom / SLA` with a "Contact" CTA. Never introduce messy multi-comboboxes or feature calculation sliders inside public pricing cards.
     - Never show simultaneous dual currencies (`$4 / ₹320`) in primary pricing card headings. Detect geo-location (INR for India, USD globally) and provide a subtle, non-displacing currency switcher in the section header.
     - Free tiers must be perpetual community tiers with clear resource ceilings; time-limited trials belong as explicit trial windows on paid tiers (e.g. "Includes 7-Day Free Pro Trial").

0i. **Hackathon Evaluation Mode & Real-Time Tier Unlocking Architecture**:
   - **Developer Enclave Master Control**: The secure Developer Enclave must provide an executive `Hackathon Evaluation Mode [ OFF / ON ]` toggle that sets global server state and broadcasts updates via Server-Sent Events (`/api/events`).
   - **Evaluation Pass Capabilities**: When ON, all visitors receive an Evaluation Pass granting full Team & Scale capabilities (unlimited repositories, causal graph inspection, unthrottled quotas). Tier locks are lifted, displaying `EVALUATION PASS` badges and allowing frictionless switching.
   - **Commercial Display Integrity**: Tier cards remain visible with real pricing to prove commercial viability to judges.
   - **Elevated Rate Ceiling**: Expands per-IP rate limits to 1,200 req/min (20 req/sec) to guarantee zero throttling during evaluation, while avoiding `skip: true` to keep the server shielded against bots.
   - **Instant Reversion**: Toggling OFF instantly restores standard production enforcement across all clients without redeployment.

0j. **Inviolable Guard: Zero Split-Brain Session Desynchronization & Auth State Coherence**:
   - **Server Session is the Single Source of Truth**: The backend session state (`req.session.user` / `/api/auth/me`) is the absolute authority on user authentication. LocalStorage (`cavdax_user_session`) is strictly an ephemeral UI cache, NEVER an override or replacement for backend authentication status.
   - **Immediate Invalidation on 401 / Unauthenticated**: Whenever ANY API endpoint returns `401 Unauthorized` or `{ authenticated: false }`:
     - Never preserve or fall back to stale `localStorage` user objects.
     - Immediately purge `localStorage.removeItem('cavdax_user_session')`.
     - Dispatch `window.dispatchEvent(new CustomEvent('cavdax:user-changed', { detail: null }))` so that the navbar, profile, modal connectors, and workspace immediately synchronize without creating "phantom" logged-in states.
   - **Mandatory `{ credentials: 'include' }` on All Internal API Calls**: Every frontend `fetch()` targeting an internal route (`/api/...`) that reads or mutates user data, listed repositories, API keys, quotas, or graph mutations MUST explicitly declare `{ credentials: 'include' }`. Omitting credentials leads to silent session drops and false 401 errors.
   - **Never Render Misleading "Empty Data" on Authentication Failures**: When an authenticated fetch (such as listing GitHub repositories or reading API keys) fails due to session expiration (401 / unauthenticated), NEVER silently swallow the error and render misleading empty copy like *"No repositories found."* Always render an informative session-expiration state informing the user that the backend process was updated, along with a direct 1-click re-authentication button (`[ Reconnect GitHub ]`).
   - **Stable Deployment Session Secrets**: In production or containerized environments, Express session middleware (`express-session`) must NEVER generate ephemeral in-memory random secrets (`randomBytes(32)`) on boot without a stable persistent fallback. Random secret regeneration invalidates all signed cookies across process restarts, causing widespread session desynchronization after every production deployment.

0k. **Inviolable Guard: Zero Hardcoded Benchmark Strings or Fake Latency Fallbacks (Section 37 Truth-in-Data Standard)**:
   - **Absolute Ban on Fake Latency Constants & Fallback Coercion**:
     - Never use synthetic numerical constants or logical OR fallbacks for elapsed times, latencies, or response durations (e.g. `parseFloat(elapsed.toFixed(2)) || 0.42`, `res.latency || 0.5`, `const latency = "1.2ms"`).
     - When an operation completes in sub-millisecond or sub-microsecond time (e.g. in-memory or cached lookups taking nanoseconds), measure and report true high-resolution execution delta using `process.hrtime.bigint()` (or `performance.now()`) converted cleanly without artificial floors:
       ```javascript
       const startNs = process.hrtime.bigint();
       // ... execution ...
       const elapsedMs = Number(process.hrtime.bigint() - startNs) / 1e6;
       ```
     - If a measurement is `0.00ms` or sub-millisecond, report the true measured metric (or exact microsecond/nanosecond values like `0.01ms` or `667ns`). NEVER substitute an arbitrary constant like `0.42ms` to "look realistic" in logs or UI badges.
   - **Absolute Ban on Hardcoded Benchmark Outcomes & Results**:
     - Never hardcode synthetic failure or success rates in benchmark runners, evaluation scripts, or test harnesses (e.g. hardcoding `ragSuccess: false`, `accuracy: 0.10`, `"10/10 silent hallucinations"`, `~450ms RAG latency`).
     - All benchmark comparisons, stress tests, and evaluation harnesses must execute genuine programmatic evaluations, actual vector similarity checks, real token consumption calculations, and live graph traversal queries.
     - If a scenario or test case fails or succeeds, it must be the true runtime outcome of the executed algorithm. External judges, auditors, and technical reviewers inspect source code; hardcoding results destroys project credibility and violates Section 37 truth-in-data hackathon integrity.
   - **Fail-Closed Gate Traversal vs Fictitious Fallback Approvals**:
     - Never simulate or bypass database graph queries with hardcoded client-side mocks or unchecked pass-throughs when validating actions against architecture decisions.
     - Invalidation checks must verify real graph nodes in FalkorDB (or the real in-memory DAG); if an unknown or malformed decision ID is supplied, the gate must fail closed (`REJECT / 404 / 403`), never fail open with a mocked approval.
   - **Automated Static Analysis & Grep Audit Verification**:
     - Enforce pre-commit and CI scans for suspicious fake-metric patterns:
       ```bash
       grep -rnE '\|\|\s*0\.[0-9]+|"10/10|ragSuccess:\s*false' .
       ```
     - Any commit introducing hardcoded benchmark strings or fake latency constants will be rejected at pre-commit.

0l. **Inviolable Guard: Asynchronous Callback Exception Enclosure & Scope Identifier Invariant (Zero-502 Anti-Crash Standard)**:
   - **Strict Ban on Unenclosed Asynchronous Callbacks**: In Node.js / Express, route handlers wrapped in `try { ... } catch (err)` only intercept synchronous exceptions or awaited promises. Any callback passed to third-party asynchronous methods (`req.session.regenerate`, `req.session.save`, `db.query`, `fs.readFile`, event handlers) executes asynchronously on the Node.js event loop. If code inside that callback throws an error, it is **NOT** caught by the outer route handler, immediately terminating the Node.js process (`uncaughtException`) and causing reverse proxies (Caddy/Nginx) and CDNs (Cloudflare) to emit a `502 Bad Gateway`.
   - **Mandatory Callback Enclosure**: Every callback body passed to an asynchronous method MUST be enclosed in its own internal `try { ... } catch (innerErr) { ... }` block that logs the exception and responds or redirects gracefully without killing the server process.
   - **Zero Identifier Scope Drift**: Never alter the naming convention of a variable across scopes in closures (e.g. declaring `const accessToken = ...` in outer scope and referencing `access_token` inside an inner callback).
   - **Mandatory Success-Branch Unit Testing**: Testing only error branches (missing state, invalid tokens) leaves closure and scope ReferenceErrors completely untested. Every authentication, session, or mutation route MUST have an automated unit test executing the **successful execution branch** of all inner callbacks, verifying that session properties hydrate without throwing.

0c. **Production Deployment & Docker Parity Guard (Zero 502 Bad Gateway Standard)**:

   - **Mandatory Dockerfile Dependency Parity**:
     - Whenever packages are added to pps/server/package.json or pps/client/package.json (e.g. xpress-session, xpress-rate-limit), the corresponding Dockerfile MUST install all production dependencies (
pm install --omit=dev). Never hardcode a partial subset of packages that causes runtime ERR_MODULE_NOT_FOUND crashes in production containers.

   - **Full-Stack Mesh & Reverse Proxy Liveness**:
     - The production deployment workflow (.github/workflows/deploy.yml) must always launch the entire production mesh including the reverse proxy (caddy), which binds to ports 80 and 443 and terminates SSL for Cloudflare.
     - Deployment workflows must pre-emptively remove stopped or conflicted containers (docker rm -f cavdax-client cavdax-server cavdax-falkordb cavdax-caddy 2>/dev/null || true) before invoking docker compose up -d --build --remove-orphans to guarantee zero daemon collisions.

   - **OAuth & Environment Variable Forwarding**:
     - infra/docker-compose.prod.yml must explicitly forward OAuth and authentication keys (GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, GITHUB_CALLBACK_URL, SESSION_SECRET) into container services so OAuth flows redirect accurately instead of failing silently.

   - **API Liveness Verification**:
     - After any production update, verify that /api/* endpoints respond with standard application JSON/redirects and never proxy 502/503 bad gateway envelopes.

0l. **Tier-1 Open-Source Documentation & README Engineering Standards**:
   - **Zero Consumer Emojis in Section Headings**:
     - Strictly ban consumer emojis (`## ⚡`, `## 🚀`, `## 🛡️`, `## 🧬`, `## 📸`, `## 📡`) in Markdown headings.
     - Use clean, declarative typography (`## The Fundamental Flaw of Vector RAG`, `## System Architecture & Execution Flow`). Emojis break Table-of-Contents generators, look amateurish, and scream AI-generated boilerplate.
   - **Hero Badge Harmony & Single-Phrase Shields.io Invariant**:
     - Every badge in the hero array MUST share an identical height (exact 28px `style=for-the-badge`).
     - Format Shields.io badges as `<service>-<action/version>-<color>` without duplicating phrases between label and message (e.g. `[ YouTube | 10-Minute Demo Walkthrough ]`, NOT `[ ▶ Watch 10-Minute Deep-Dive Demo Video | YouTube Walkthrough ]`).
     - Immediately add official package version and Sigstore provenance badges upon npm publishing.
     - Never repeat duplicate badges (e.g. double Live Demo links).
   - **Hackathon Track Humility**:
     - Never place `🏆` (trophy) next to submission track names before judging; trophy icons imply winning an award before evaluation. Use clean objective typographic metadata or pill badges.
   - **Canonical Technical Narrative Progression**:
     - Technical architecture READMEs must strictly follow the canonical industry narrative:
       1. **The Problem** (The architectural failure mode / why status quo fails)
       2. **The Solution** (The core paradigm shift / graph-grounded execution)
       3. **Formal Causal / Mathematical Ontology** (Graph nodes, edges, invariants)
       4. **Architectural Moats & Capabilities** (Competitive pillar matrix)
       5. **Execution Architecture & Flowcharts** (Multi-plane diagrams)
       6. **Empirical Benchmarks** (Reproducible measurements)
       7. **Quickstart & Deployment** (Docker, local run)
       8. **Protocol / Client Integration** (MCP configuration, API schemas)

0m. **Monochromatic, Theme-Adaptive Mermaid Invariant**:
   - **Ban on Saturated Color Fills (`classDef`)**:
     - Never use hardcoded green (`#064e3b`), red (`#4c0519`), or indigo (`#1e1b4b`) block fills in documentation Mermaid flowcharts.
     - Standardize strictly on GitHub-native monochromatic architecture styling: clean black/white/slate borders and fills that automatically inherit GitHub's native light and dark themes.
   - **Standard Graph Semantic Notation**:
     - Label nodes using clean graph schema notation: `(:Source {id: 'ADR-001', status: 'ACTIVE'})`.
     - Represent semantic edges cleanly: `-- "[:EXTRACTED_FROM]" -->` and evolutionary/invalidation bridges with dashed lines: `-. "[:SUPERSEDES]" .->`.

0n. **Documentation Screenshot Capture & Kinetic Roller Freeze Invariant**:
   - **Zero Motion Blur / Kinetic Double-Exposure Invariant**:
     - When taking portfolio or documentation screenshots of pages with rotating or kinetic text (e.g. `KineticRollingHeadline`), NEVER capture during in-flight CSS transitions or interval animations.
     - Always freeze the text in the DOM to a single stationary state before taking the screenshot to eliminate overlapping, ghosted text.
   - **2x Retina Resolution Standard**:
     - Always capture documentation screenshots at 2x Retina resolution (`deviceScaleFactor: 2`, 2880×1800 for 1440×900) using native browser automation or Lanczos resampling so UI chrome, fonts, and borders remain crystal clear on high-DPI displays.

0o. **Bento Grid Subtext Density (< 12 Words Rule)**:
   - **Strict Ban on Multi-Sentence Paragraphs in Telemetry Bento Cards**:
     - Bento cards containing interactive visual simulators, desync meters, direct-write alerts, or cascade loss widgets must NOT contain dense 20–30 word explanatory paragraphs.
     - Enforce a strict single-line punchy subtext rule (< 12 words) that sets the context and allows the visual telemetry widget below it to deliver the technical punchline without visual clutter.

0p. **Remote SSE vs SPA Fallback Routing Trap**:
   - **Backend Route Integrity**:
     - Remote SSE endpoints in client configurations and documentation must point strictly to the backend API route (e.g. `/api/mcp/sse`), NEVER a naked root path (e.g. `/sse`) that gets trapped by Caddy/Vite's single-page application fallback returning `index.html`.
   - **Delineate Stdio vs Remote Cloud SSE**:
     - Documentation must clearly separate **Mode A: Local Stdio (`npx -y @cavdax/mcp-server`)** (recommended, zero API key required) from **Mode B: Remote Cloud SSE** (with `Authorization: Bearer <API_KEY>` headers and direct links to the key generation console).


0q. **Card Grid Cadence, Vertical Rhythm & Zero "Lonely Child" Invariant**:
   - **The "Lonely Child" / Orphan Flaw**:
     - In cards, lists, and multi-column grids, a trailing line containing a solitary word (e.g. `deployment.`, `provenance.`, `infrastructure.`) looks unpolished and signals careless typography.
   - **Heading & Bullet Invariant**:
     - For short lines, badges, and bullet points, combine balanced semantic word choice with native CSS `text-balance` (`[text-wrap:balance]`) so lines wrap into roughly equal halves rather than stranding an orphan.
   - **Multi-Line Prose & Card Symmetry Rule**:
     - Do NOT blindly apply `text-wrap: balance` to narrative prose paragraphs in side-by-side cards, as it artificially truncates earlier lines (making Line 1 look clipped).
     - Instead, engineer the copy length and word cadence across sibling cards so:
       1. Sibling cards share an **identical rendered line count** (e.g. exactly 3 lines each), ensuring horizontal dividers and downstream elements (`Key Contributions:`, tags, CTAs) align to the exact pixel.
       2. The final line of prose terminates in a healthy, substantive clause (minimum 3 to 5 words).

0r. **Authentic Contributor Attribution & Production Terminology Standard**:
   - **Commit-Derived Attribution**:
     - Derive team contributions directly from authentic git commit logs, verified artifacts (video walkthroughs, npm packages with Sigstore provenance, AST scanners, webhook integrations), and actual code commits rather than generic placeholder roles.
   - **Mandatory `Co-authored-by:` Git Commit Trailer Invariant**:
     - Whenever a teammate, peer reviewer, or contributor assists with ideation, vulnerability discovery, adversarial review, bugfix design, testing, or code authoring, ALWAYS append standard GitHub `Co-authored-by:` trailers at the bottom of the commit message preceded by a blank line:
       ```git
       Co-authored-by: Full Name <email@example.com>
       ```
     - If the contributor has multiple active GitHub emails or profiles (e.g. personal and corporate/academic), include trailers for both (e.g. `geetika7chugh@gmail.com` and `geetika@ibm.com`) so GitHub's UI automatically associates the commit with their profile, renders their avatar, and credits authentic contributions.
     - Never omit co-authorship when committing fixes that were surfaced, audited, or shaped by a teammate.
   - **Professional Systems Terminology**:
     - Ban gaming or aviation slang like "Web HUD" in enterprise developer platforms; use authoritative, industry-standard terms such as "Visual Operational Console" or "Interactive Telemetry Console".

0s. **Native `net.BlockList` SSRF, Anti-TOCTOU Rebinding & Redirect Defense**:
   - **The Hostname False Positive Trap**: Never use prefix string matching (e.g. `.startsWith('fc')` or `.startsWith('fd')`) on hostnames. Legitimate domains such as `fcm.googleapis.com`, `fdic.gov`, and `feast.example.com` will be falsely blocked. Always check `isIP(clean) === 0` upfront so hostnames are never evaluated against IP literal subnets.
   - **Native Node.js CIDR BlockList**: Enforce Node's native C++ `net.BlockList` covering: `127.0.0.0/8`, `::1`, `169.254.0.0/16`, `fe80::/10`, `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`, CGNAT `100.64.0.0/10` (which hosts Alibaba Cloud metadata `100.100.100.200`), `198.18.0.0/15`, `192.0.0.0/24`, Class E `240.0.0.0/4`, `0.0.0.0/8`, and hex IPv4-mapped IPv6 (`::ffff:7f00:1`).
   - **Anti-TOCTOU Rebinding**: Pre-flight DNS lookups followed by a separate `fetch()` open a race window where an attacker returns a public IP during pre-flight, then rebinds DNS to internal metadata during socket connection. Eliminate this by validating the IP address at the exact moment of socket creation via an `undici.Agent({ connect: { lookup } })` dispatcher.
   - **Zero-Redirect Webhook Policy**: Always pass `redirect: 'error'` to outgoing fetch calls. Allowing 3xx redirects enables public HTTPS endpoints to 302-redirect directly into internal cloud metadata services.

0t. **Express Middleware Order & Session Attachment Invariant**:
   - **Sequential Execution Trap**: Express processes middleware in the exact order declared. NEVER register routes that access `req.session` (e.g. `POST /api/push/subscribe`, `POST /api/user/preferences`) before `app.use(session(...))` or session rehydration middleware.
   - **Shared 'Default' Collapse**: When routes are mounted above session middleware, `req.session` is `undefined`, silently collapsing all authenticated operations into a single shared `'default'` bucket and exposing cross-tenant data.

0u. **Tenant-Scoped Multi-Channel Alert Isolation**:
   - **Comprehensive Recipient Scoping**: When dispatching alerts across multiple channels (Web Push, Email, Outgoing Webhooks, SSE), every channel must enforce identical tenant-scoping invariants.
   - **No Unscoped Push Broadcasts**: Calling `broadcastWebPushAlert()` without an explicit `targetLogin` broadcasts push alerts to every registered device in the database. When repo A diverges, users who only watch repo B must NEVER receive notifications for repo A.

0v. **Multi-Modal Scroll Container Immunity (The Smooth Scroll Hijack Law)**:
   - **The Lenis Scroll Freeze Trap**: In applications using global smooth scroll libraries (Lenis, Locomotive, ASScroll), nested scrollable containers (e.g. branch dropdowns, combobox lists, modal drawers) freeze under mouse wheel and trackpad two-finger gestures because the global scroll listener intercepts wheel events.
   - **Mandatory Container Attributes**: Any nested scrollable container MUST specify `data-lenis-prevent`, `overscroll-contain`, and `tabIndex={0}` to isolate pointer gestures from the global viewport.
   - **Keyboard Arrow Synchronization**: Pair scrollable dropdowns with keyboard navigation (<kbd>↑</kbd>/<kbd>↓</kbd>), auto-scroll into view (`scrollIntoView({ block: 'nearest' })`), <kbd>Enter</kbd> to select, and <kbd>Escape</kbd> to dismiss.

0w. **Dynamic Full-Graph Vector SVG Export & Tour 2-Line Text Budget**:
   - **Client-Side Vector WYSIWYG Export**: Never rely on static server-rendered SVG exports with fixed bounding boxes (e.g. 960×500) that clip large causal DAGs or lose active client-side repository/branch filters. Direct client-side serialization from live React state with dynamic bounding box (`viewBox="0 0 ${width} ${dynamicHeight}"`) guarantees 0ms offline generation, zero vertical clipping, and 100% fidelity.
   - **Tour Guide 2-Line Maximum Budget**: Tour card descriptions must strictly obey a **2-line maximum budget** (~110 characters) across all viewport widths so the card height never balloons or causes layout collisions.
   - **Permanent Tour DOM Targets**: Tour anchor targets must render unconditionally (even in empty states) so the onboarding engine never crashes or loses alignment when records are empty.




0x. **Hermetic Dependency & Container Environment Guard (The Ambient Module & Node Engine Invariant)**:
   - **The Ambient Module Trap (Phantom Local Resolution)**:
     - On developer workstations, Node.js walks up parent directory trees (e.g. C:\\Users\\<user>\\node_modules) to resolve packages.
     - An imported module (e.g. import { Agent } from 'undici') may resolve locally and pass tests on a local machine even when omitted from package.json.
     - In clean CI runners (GitHub Actions) or production Docker containers (npm install --omit=dev), the package does not exist -> Node crashes on boot (ERR_MODULE_NOT_FOUND) -> Reverse proxy (Caddy/Nginx) fails to connect -> Cloudflare returns 502 Bad Gateway.
   - **Mandatory Subproject Declaration**:
     - Every package imported in application source code MUST be explicitly declared in that specific service's package.json (dependencies for runtime, devDependencies for test-only).
     - Before committing, verify local subproject resolution using npm ls <package-name> inside the specific subproject directory. If it returns (empty), the dependency is ambient and must be added.
   - **Runtime Engine Matrix & Node Compatibility (engines.node)**:
     - Never blindly install the latest major version of a package without inspecting its engines.node specification (via npm show <pkg> engines).
     - If the production Docker image or CI runner uses Node 20 (node:20-alpine, node-version: 20), installing a library that requires node >= 22.19.0 (such as undici@8.x) will trigger container build failures or runtime incompatibilities.
     - Always pin package versions that support the repository's base container runtime (node >= 18 or node >= 20).
   - **Pre-Merge Hermetic Quality Gate**:
     - In CI pipelines, always test with clean installation conditions before executing SSH deployment or container restart steps. Missing dependencies must fail fast in CI before touching production.



0y. **Published Package Immutability, Exact-Pin Workflow Alignment & Registry Synchronization Law**:
   - **The Registry Immutability & Phantom Resolution Trap**:
     - Public package registries (`npm`, `pypi`) and release artifacts are strictly immutable and append-only.
     - Modifying code in a monorepo subpackage (such as `apps/mcp-server`) and pushing git commits changes repository source code, but does NOT update what external CI runners or developer IDEs download via `npx -y @cavdax/mcp-server@<version>`.
     - If CI workflow templates or client setup modals pin an exact version (e.g. `@1.2.4`) that was published prior to a bugfix, CI runners will continue downloading the stale, defective tarball regardless of what is on `main`.
   - **The Triple-Surface Version Triangulation Invariant**:
     Whenever a package's behavior or CLI contract is updated, three surfaces MUST be updated in strict atomic lockstep:
     1. **Surface A (Source Manifest)**: `apps/<package>/package.json` -> increment `"version": "X.Y.Z"`.
     2. **Surface B (Consumer Templates & UI Snippets)**: Update all generated workflow templates (`githubAdr.js`), client connection modals (`ConnectedRepoWorkspace.jsx`, `ConnectMcpPage.jsx`), and quickstart documentation to reference the exact new version `X.Y.Z`.
     3. **Surface C (Distribution Registry & GitHub Release)**: Tag the commit and cut the GitHub Release (`gh release create vX.Y.Z`), followed by publishing to the npm registry (`npm publish`).
   - **Zero Phantom Version References & Verification Gate**:
     - Never point workflow generators, README quickstarts, or user-facing setup modals to a version tag without verifying or immediately completing the corresponding GitHub release and registry publication.
     - Before closing a release or deployment milestone, verify release parity across all surfaces:
       ```bash
       gh release list
       npm view @cavdax/mcp-server version
       ```
     - If a version bump is committed to source, the GitHub Release and package distribution step must be verified or explicitly flagged, preventing split-brain version drift.




0z. **Version Synchronization & Stale Release Number Elimination Standard (Anti-Stale Tag Invariant)**:
   - **The Stale Version Anti-Pattern**:
     - Following an npm package publish or GitHub release (e.g. releasing `v1.2.6`), documentation files (`README.md`), CLI quickstarts, and client snippet generators often continue displaying obsolete previous version numbers (e.g. `@cavdax/mcp-server@1.2.5`).
     - This confuses developers, breaks CI workflows expecting latest invariants, and signals poor engineering hygiene to judges.
   - **The Invariant**:
     - **Dynamic In-Code Interpolation Over Static Strings**: In client UI components (e.g. `ConnectedRepoWorkspace.jsx`, `ConnectMcpPage.jsx`, `McpConnectModal.jsx`), never hardcode static version numbers into copy-to-clipboard command strings or YAML generators. Always import `MCP_SERVER_DEFAULT_VERSION` from `constants/version.js` (dynamically injected at build-time from `apps/mcp-server/package.json`).
     - **Comprehensive Whole-Repo Forensic Scan**: Before concluding any release milestone, run an exhaustive grep for the prior version string across the entire repository (`git grep "<old-version>"`). Every occurrence in:
       1. `README.md` (CLI headers, quickstart badges, and npx gate check commands)
       2. Client build configuration fallbacks (`vite.config.js`, `constants/version.js`)
       3. Workflow generators (`apps/server/githubAdr.js`)
       4. Session state logs (`docs/DEV_SESSION_STATE.md`)
       MUST be synchronized to the newly published release tag (`vX.Y.Z`).
     - **Release Verification Triple-Check**: Confirm that `gh release view vX.Y.Z` and `npm view @cavdax/mcp-server version` return matching release tags before closing the release loop.

0aa. **Modal Viewport Parity & Hover-Revealed Code Editor Scrollbars (Clean Code Viewport Invariant)**:
   - **The Viewport Asymmetry Anti-Pattern**:
     - Having sibling integration modals or drawer dialogs (e.g. *Connect Autonomous AI Agent* vs *GitHub Actions CI/CD Invariant Gate* vs *Webhook Ingestion* vs *API Key Configuration*) with arbitrary, uneven heights (e.g. one `h-60` / 240px and another `max-h-96` / 384px).
     - This creates jarring vertical jumps and layout disruption when switching between integration surfaces, disorienting developers and breaking visual cadence.
     - **The Strict Invariant**: All sibling modal panels, integration drawers, and configuration viewers MUST maintain identical outer dimensions (`max-w-3xl w-full`) and identical code block container heights (`h-80` / 320px).
   - **The Distracting Scrollbar Rail Anti-Pattern**:
     - Default browser/OS scrollbar tracks (especially on Windows) draw clumsy grey vertical and horizontal rails across dark-mode terminal/code blocks (`bg-slate-950`), cluttering the interface even when the user is simply reading the code.
     - **The Strict Invariant**: Every code block, terminal snippet, diff viewer, or YAML/JSON container MUST use `.hover-scrollbar` (or `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden hover:[scrollbar-width:thin] hover:[&::-webkit-scrollbar]:block`):
       1. **Idle State**: Scrollbar tracks and thumbs are 100% hidden. Pristine, uncluttered dark terminal typography.
       2. **Continuous Scrolling**: Mousewheel and touchpad scrolling work smoothly and immediately at all times.
       3. **Hover State**: An ultra-thin (5px), translucent, rounded thumb fades in smoothly to provide visual position feedback and draggable scrubbing for mouse-pointer users.


0ab. **CommonMark 4-Space Indentation & Double-CRLF (`\r\r\n`) Parser Trap Invariant (Zero-Broken-Markdown Standard)**:
   - **The CommonMark 4-Space Invariant**:
     - Under CommonMark and GitHub Flavored Markdown (GFM), any line preceded by a blank line that begins with **four (4) or more spaces** (or a tab) is unequivocally interpreted as an indented code block (`<pre><code>`).
     - When authoring centered headers (`<div align="center">`), `<picture>`, `<source>`, or badge arrays, NEVER indent child HTML tags with 4 spaces (`    <picture>`, `    <source...>`). GitHub will parse the child tags as raw code snippets with horizontal scrollbars.
     - **The Strict Invariant**: All nested HTML elements inside Markdown files must use strictly **0 or 2 spaces** of indentation. Never use 4 spaces or tabs.
   - **The Double Carriage Return (`\r\r\n`) Synthesis Trap**:
     - On Windows environments, naive string replacements or cross-platform toolchains (e.g. running `.replace(/\n/g, '\r\n')` on files that already contain `\r\n`) produce synthetic double carriage returns: `\r\r\n`.
     - CommonMark parsers process `\r\r\n` as two consecutive line breaks (`\n\n`), injecting synthetic blank lines between consecutive HTML elements. Combined with 4-space indentation, this breaks the entire README header into disjointed code boxes.
     - **The Strict Invariant**: Always normalize files to clean LF (`\n`) by stripping all carriage returns (`content.replace(/\r/g, '')`) before writing to disk. Never perform blind regex injections of `\r\n`.
   - **Explicit Self-Closing Void Elements & Continuous HTML Blocks**:
     - Always format void HTML tags as self-closing: `<source media="..." srcset="..." />` and `<img src="..." alt="..." />`.
     - Maintain continuous HTML blocks without blank lines that would break parser context.
   - **Pre-Commit Verification Scan**:
     - Scan staged markdown files before pushing:
       ```bash
       grep -P "\r\r" **/*.md && echo "CRCRLF DETECTED"
       grep -Pn "^\s{4,}<(picture|source|img|a|strong|p|div|span)" **/*.md && echo "INDENTED HTML DETECTED"
       ```


0ac. **Monorepo-Wide Terminology Harmonization & Zero-Inconsistency Invariant (Semantic Drift Guard)**:
    - **The Semantic Inconsistency Anti-Pattern**:
      - Modifying a domain term, plan name, or brand token (e.g., renaming "Enterprise Mesh" to "Team & Scale") in a single component or file, leaving outdated legacy terms lingering in developer consoles, SEO headers, test assertions, or architectural documentation.
      - This creates cognitive dissonance for users, breaks test contracts, introduces branding ambiguity, and signals uncoordinated AI editing.
    - **The 4-Pillar Harmonization Protocol (Mandatory on ANY Terminology Change)**:
      1. **Whole-Repository Forensic Grep (Zero Blindspots)**:
         - Before and after modifying ANY brand term, tier title, public route, or capability token, the agent MUST run an exhaustive repo-wide grep:
           ```bash
           git grep -n "<OldTerm>"
           ```
         - Every occurrence across UI components (`apps/client/src/`), backend server routes (`apps/server/`), test files (`apps/server/test/`), markdown documentation (`docs/`), and meta rules (`AGENTS.md`) must be inspected and updated in the same cohesive pass.
      2. **Dual-Plane Consistency (Display Copy vs Machine Key)**:
         - Clearly delineate and harmonize human-facing copy (e.g. `Team & Scale`) and underlying state machine keys (e.g. `tier === 'enterprise'`).
         - Never update consumer-facing cards while leaving developer enclave simulation buttons (e.g. `SIMULATE ENTERPRISE` vs `SIMULATE TEAM & SCALE`), toasts, or mode switchers showing obsolete terms.
      3. **Documentation & Spec Symmetrization**:
         - Architectural specifications (`docs/BILLING_AND_PAYMENTS_ARCHITECTURE.md`, `docs/UI_DESIGN_SYSTEM.md`, `README.md`) must reflect the exact naming established in code. A change in UI copy without matching documentation creates stale specifications.
      4. **Verification Gate**:
         - Verify that `npm run build` passes on `apps/client` with zero compilation warnings, and `node --test` passes on `apps/server` with zero test assertion failures.


0ad. **Clean Direct SVG Glyphs & Card Subtext 2-Line Budget Invariant (Anti-Squircle & Scannability Guard)**:
    - **The Cliché Squircle Icon Box Trap (Strict Ban on Synthetic Icon Wrappers)**:
      - Forcing rounded-square (`rounded-xl p-2 bg-slate-100 dark:bg-white/5 border border-slate-200`) background wrappers around icons in card headers.
      - This "icon inside a squircle" pattern is a cliché, generic AI-slop convention that clutters cards, adds visual boxiness, and destroys clean typographic hierarchy.
      - **The Strict Invariant (Clean Direct SVGs)**: All card headers, feature headings, and category tags MUST render SVGs directly and cleanly (`w-4 h-4 text-slate-700 dark:text-slate-300 shrink-0`) inline with text without artificial bounding squircle cards, decorative background boxes, or container borders. Icons must stand freely alongside their labels.
    - **Card Subtext 2-Line Maximum Budget (Scannability & Rhythm Invariant)**:
      - Long, meandering paragraphs that wrap to 3 or 4 lines on desktop/laptop viewports break visual rhythm, induce cognitive fatigue, and disrupt horizontal symmetry across sibling cards.
      - **The Strict Invariant**:
        - Card descriptions and feature subtexts MUST obey a strict **2-line maximum budget** (≤ 2 lines, strictly 90–130 characters) of high-signal, punchy architectural copy.
        - Never allow descriptions to stretch to 3 or 4 lines.
        - Pair the concise copy with CSS `line-clamp-2` and `leading-relaxed` so that across all responsive viewports, descriptions never balloon vertically or cause layout collisions.
      - **Canonical Benchmarks**:
        - *Topological Engine*: "Sparse algebraic semiring sweeps computing multi-hop reachability across the entire AST dependency DAG." (104 chars, max 2 lines).
        - *Concurrency Protection*: "Leases exclusive locks on decisions so parallel agent fleets cannot mutate the same ADR concurrently or cause split-brain drift." (129 chars, max 2 lines).
        - *Security & Compliance*: "Mandatory GitHub Status Check blocking pull requests if code touches invalidated decisions or breaches architectural invariants." (131 chars, max 2 lines).
    - **Comparison Matrix Single-Line Row Invariant & Dynamic Comparative Rose Contrast (Zero Multi-Line Wrap & Visual Harmony Guard)**:
      - **The Multi-Line Matrix Row Distortion Trap**: Allowing capability and comparison table cells to wrap into 2, 3, or more lines (e.g. `1 Repository (Active \n branch)` or `Single Agent (No \n concurrency)`) disrupts vertical cadence, misaligns sibling columns, and creates visual clunkiness.
      - **The Strict Invariant (Single-Line Row Budget)**:
        - Every table cell across all comparative columns (`Community`, `Pro Autonomous`, `Team & Scale`) MUST fit on strictly **1 line** with CSS `whitespace-nowrap`.
        - Column descriptions in the primary invariant column must use `whitespace-nowrap truncate` to maintain absolute 1-line harmony across all rows.
        - Pair concise, punchy engineering terminology (`< 2.8ms`, `1 Active Repo`, `Main only`, `Single Agent`, `Local Process`, `< 3ms Gateway`, `Manual CLI`, `Individual PAT`, `Ephemeral Log`, `Public Mesh`) with the active tier filter.
      - **Dynamic Comparative Rose Contrast & Gold Bullet Semantics**:
        - Whichever tier is selected displays the gold accent bullet `<span className="text-[#d9a353] font-mono select-none shrink-0">•</span>` in both the column header and every row cell.
        - Inferior tiers dynamically draw contextual comparison annotations in rose text (`text-rose-500/90 dark:text-rose-400/90`):
          - When *Community* is selected: base default presentation, zero rose text.
          - When *Pro Autonomous* is selected: Community tier highlights its limitations in rose (`(2x Slower)`, `(Capped)`, `(No Branches)`, `(No Mutex)`, `(No Relay)`, `(No Priority)`, `(No Gate)`, `(No SSO)`, `(Unsaved)`, `(Shared)`).
          - When *Team & Scale* is selected: both Community and Pro tiers display comparative weaknesses in rose (`(3.5x Slower)`, `(Single)`, `(No KeySpace)`, `(No Mutex)`, `(Isolated)`, etc. for Community; `(Shared Key)`, `(Capped 10)`, `(Shared DB)`, `(Capped 3)`, `(No SSE)`, `(No SLA)`, `(Advisory)`, `(Manual Seats)`, `(Unsigned)`, `(Multi-Tenant)` for Pro).
        - All text stays strictly on 1 line with `whitespace-nowrap`.
0ae. **Viewport-Aware Simulation & Heavy Visual Loop Invariant (Off-Screen Sleep Contract)**:
    - **Continuous Tick Loop Hazard**: Running unconstrained `requestAnimationFrame` loops on WebGL2, Canvas2D, or particle graphs while out of view burns CPU/GPU threads, drains mobile batteries, and introduces scroll stutter.
    - **Strict Invariant**: Every heavy canvas/WebGL simulation MUST mount an `IntersectionObserver` with `{ threshold: 0 }`. It must immediately invoke `cancelAnimationFrame(rafId)` when scrolled off-screen (`entry.isIntersecting === false`), and resume cleanly upon viewport re-entry without catch-up delta-time jumps.

0af. **Zero SVG Icon Translation Shifts & Compact Calibrated Capsule Navigation Standard (The Anti-Icon-Jitter & Optical Alignment Invariant)**:
    - **The Icon Jitter / Translation Trap (Strict Ban on SVG Hover Offsets)**:
      - Forcing hover translations (`group-hover:-translate-y-0.5`, `group-hover:translate-x-0.5`, `hover:-translate-y-*`) onto SVG icons inside navigation bars, tab docks, pill selectors, and segmented controls.
      - This causes twitchy layout shifts and makes controls feel like cheap toy widgets when users sweep their cursor across tabs.
      - **The Strict Invariant (Rock-Solid Anchor)**: SVG icons in navigation bars, tab selectors, and pill docks must remain statically, immutably anchored (`shrink-0`). All hover and active feedback must be conveyed solely through background capsule pills, text/icon color transitions, or subtle opacity changes — **NEVER by physically shifting, translating, or bouncing the SVG vector**.
    - **Compact Calibrated Capsule Geometry (Anti-Ballooning & Optical Centering Guard)**:
      - Oversized capsule pill containers (`py-1.5`, `p-1`, button height > 28px) surrounding small monospace text (`text-[11px]`) and `14px` icons create massive vertical voids of empty space. Because monospace fonts without `leading-none` add asymmetric line-height half-leading, and rounded capsule ends curve inwards, oversized pills create an optical distortion where the SVG icon appears physically dislocated or shifted upwards.
      - **The Strict Invariant (22px Compact Pill Standard)**:
        - Outer navigation bar: snug `py-1 pl-1.5 pr-1.5` (height ~36px–40px).
        - Pill track container: `p-0.5 rounded-full`.
        - Sliding capsule pill & buttons: exact `py-1 px-3` (height strictly 22px–24px).
        - Typography: `text-[11px] font-mono leading-none` so glyph boxes snap to their true typographic boundaries.
        - Icon & text pairing: `flex items-center gap-1.5` with equal vertical optical balance (`4px` padding above and below the 14px icon).
    - **No Active Micro-Scale Wobble (`active:scale-95`)**:
      - Navigation pill buttons must never shrink or distort on click (`active:scale-95` is banned on sliding pill tabs). The active pill transitions smoothly across elements via spring kinematics without shrinking the button.

0ag. **Cold-Mount Hydration & Direct-Reload Visual Verification Invariant (Zero-Collapsed-Pill Standard)**:
    - **The Cold-Mount / Reload Regression Flaw**:
      - When dynamic sliding pills, active tab indicators, or segmented controls use client-side layout projection libraries (e.g. Framer Motion `layoutId`, FLIP animators, or dynamic CSS transforms), developers frequently test only **post-interaction states** (clicking between tabs).
      - On a **fresh cold page mount** or a **direct browser reload (`F5`)**, the animation library evaluates before DOM element geometry settles, or fails to reconcile layout projection trees across hydration.
      - **The Catastrophic Failure**: The active background pill fails to mount or collapses to 0×0 dimensions. In light mode, the active tab's typography renders in its active state (e.g. `text-white`) directly against a light gray navbar substrate with zero contrast, making the active tab invisible.
    - **The 3-State Empirical Verification Law (Mandatory Headless Verification)**:
      - Any component featuring animated pills, sliding indicators, or tab capsules MUST be programmatically verified in a headless browser across three (3) distinct lifecycles before declaring the task complete:
        1. **State 1: Cold Initial Load**: Navigate from `about:blank` directly to the target URL (`page.goto(url, { waitUntil: 'networkidle0' })`).
        2. **State 2: Immediate Hard Reload**: Refresh the page without user interaction (`page.reload({ waitUntil: 'networkidle0' })`).
        3. **State 3: Interactive Dynamic Transition**: Execute programmatic tab clicks (`button.click()`) to confirm fluid spring interpolation between items.
      - Under all three states, test assertions MUST empirically confirm:
        - `pillRect !== null && pillRect.width > 0 && pillRect.height > 0`
        - Computed pill `opacity === "1"`
        - Contrast ratio between tab text and rendered background meets WCAG AA standard ($\ge 4.5:1$).
    - **Architectural Safeguards**:
      - Always scope layout animations using a unique, dedicated `<LayoutGroup id="...">` wrapper to prevent projection collision with global layout trees.
      - Ensure the active element renders its background capsule deterministically on the initial server/client pass without relying on asynchronous bounding rect measurements.

0ah. **Viewport-Fixed Chrome Bounding-Box Non-Collision Invariant (The 1280px Table-Clearance Law)**:
    - **The Fixed-Chrome Collision Trap**:
      - Data-dense layouts (comparison matrices, audit ledgers, timeline streams) paired with viewport-fixed navigation chrome (floating vertical sidebar docks, elevated quick-switchers, pull-cords, sticky toolbars) look spacious on 1920×1080 or 2560×1440 desktop monitors.
      - On compact desktop and laptop displays (1280×800, 1366×768, 1024×768), selecting the rightmost columns (e.g. "Team & Scale" or the terminal column) causes horizontal scroll or expansion where table data cells collide directly beneath or behind the fixed chrome, truncating text, cutting off status badges, and preventing interaction.
    - **The Strict Clearance Invariant (`clearance >= 48px`)**:
      - Any scrollable data container placed beside viewport-fixed chrome MUST enforce:
        1. **Explicit Table Minimum Width**: The table or matrix must declare a calibrated minimum width (e.g. `w-full min-w-[1040px]`).
        2. **Calibrated Column Width Budgets**: Every column must declare a minimum width (`min-w-[260px]`, `min-w-[280px]`) preventing text compression.
        3. **Dynamic Overshot Auto-Scroll Buffer**: When a filter or tab triggers horizontal scrolling to reveal a target column, the container MUST scroll past the raw width by an overshot clearance buffer:
           ```javascript
           const maxScroll = container.scrollWidth - container.clientWidth;
           container.scrollTo({ left: maxScroll + 80, behavior: 'smooth' });
           ```
        4. **Zero-Collision Bounding Box Verification**: Verification via Puppeteer must evaluate `fixedChromeRect.left - dataCellRect.right` across all rows when the rightmost filter is active. If clearance is less than 48px, the build is blocked.

0ai. **The Complete Release Distribution Triad (Git Tag ⇄ NPM Registry ⇄ GitHub Release Invariant)**:
    - **The Partial-Release Illusion**:
      - Assuming that running an npm publishing script or pushing an annotated git tag (`git push origin vX.Y.Z`) automatically satisfies the release lifecycle.
      - Result: Developers and automated agents report that a version is "released", but users inspecting `github.com/<org>/<repo>/releases` see an obsolete previous version because GitHub Releases are distinct, first-class GitHub API objects that require explicit creation.
    - **The 3-Vertex Mandatory Triad**:
      A release is **NEVER complete** until all three vertices of the triad are verified:
      1. **Vertex 1: Git Tree Tag**:
         - Annotated, signed git tag created and pushed to the remote repository:
           ```bash
           git tag -a vX.Y.Z -m "release: vX.Y.Z <title>" && git push origin vX.Y.Z
           ```
      2. **Vertex 2: Package Registry (NPM / OIDC)**:
         - Tarball built, verified for zero ambient secrets, and published to the npm registry with Sigstore cryptographic build provenance via GitHub Actions OIDC:
           ```bash
           npm view @cavdax/mcp-server version # Must output X.Y.Z
           ```
      3. **Vertex 3: GitHub Release Object**:
         - Formal GitHub Release created pointing to the pushed tag, containing comprehensive engineering highlights, changelog categories, and distribution links:
           ```bash
           gh release create vX.Y.Z --title "vX.Y.Z: <Summary>" --notes-file <notes.md>
           gh release list # Must list vX.Y.Z as Latest
           ```
      - If any single vertex is missing, the release pipeline is incomplete and cannot be marked finished.
     - **The `Disconnected Release Boundary'' Anti-Pattern**:
       - Bumping `apps/mcp-server/package.json` to `vX.Y.Z` and merging to `main` does **NOT** publish to npm.
       - `.github/workflows/publish-mcp.yml` only fires on `on: release: types: [published]` or `workflow_dispatch`.
       - Pushing commits — even to `main` — is a **silent no-op** for the registry. The npm dist-tags remain unchanged.
       - **Invariant**: After any `package.json` version bump, the agent MUST verify `npm view @cavdax/mcp-server dist-tags.latest` matches the new version OR explicitly create a GitHub Release. If it does not match, the release has NOT been executed.
       - **Standard Release Command**: `npm run release` (runs `scripts/release.mjs`) enforces a clean working tree, `main` branch sync, full test gate, tag collision check, then GitHub Release creation atomically.
       - **CDN Propagation Lag**: `npm view @cavdax/mcp-server version` may show stale data for 2-5 minutes after publish. Use `npm view @cavdax/mcp-server dist-tags.latest` or the direct registry URL for immediate confirmation.
     - **The `Blind Publish'' Anti-Pattern (Zero-Test Workflow Ban)**:
       - Publishing via a GitHub Actions workflow that runs zero tests before `npm publish` ships regressions globally to all npm consumers immediately.
       - **Mandatory gate order inside any publish workflow** (all gates must pass or publish step must not execute):
         1. Syntax-check all package source files: `node --check apps/mcp-server/src/*.js`
         2. MCP server unit tests: `node --test apps/mcp-server/test/*.test.mjs`
         3. Server and security test suites: `node --test apps/server/test/*.test.mjs`
         4. CI simulation gate: `node scripts/test-ci.mjs`
         5. Assert release tag == `apps/mcp-server/package.json` version (tag-version alignment)
         6. `npm publish --access public --provenance`
       - If any gate fails, the publish step must never execute. This is enforced in `.github/workflows/publish-mcp.yml`.

0aj. **Universal Strict Ban on In-Visual Text, Floating Tags & Badges in 3D Visual Instruments (Anti-AI-Infographic Slop Law)**:
    - **The Generic AI Infographic Slop Anti-Pattern**:
      - Generic AI diagram generators (Canva, DALL-E, mid-tier diagrammers) habitually paste floating text tags, pill badges, percentage chips, or leader-line callout labels directly onto or inside 3D graphics (e.g. `[Active]`, `[Node 1]`, `[Graph Engine]`, `[99.9% SLA]`).
      - This pattern immediately signals cheap, uncalibrated AI slop, destroys spatial depth, clutters physical instrument geometry, and induces cognitive noise.
    - **The Strict Invariant (Pure Physical Geometry Only)**:
      - **STRICTLY ZERO text inside the visual**: Never include `<text>`, `<tspan>`, HTML labels, floating badges, percentage chips, or alphanumeric callouts inside or directly floating over any 3D visual SVG, canvas, or graphic container.
      - **The Object is the Explanation**: The 3D instrument communicates exclusively through mechanical form, volumetric bevels, specular reflections, depth sorting, and physics kinematics.
      - **Clean External Typographic Separation**: All titles, metric values, status badges, and descriptions belong **OUTSIDE** the visual in clean, structured typography on the adjacent card or section. The 3D instrument remains a pristine, unblemished physical object.

1. **NEVER Commit Credentials, Secrets, or Sensitive Identifiers**:

   - **Zero Credentials in Git**: Never stage or commit API keys, auth tokens, passwords, private keys, connection strings, or cloud secrets.

   - **Never Commit `.env` / `.env.*` Files**: Only `.env.example` with harmless placeholders (`your_key_here`) may be tracked.

   - **Never Hardcode Secrets in Source**: Access keys exclusively via runtime environment variables (`import.meta.env.VITE_*`, `process.env.*`).

   - **Enforcement**: Run a staged secret scan before any commit. If a hook or pattern matches credentials, unstage, redact, and verify before proceeding.



2. **Zero False Claims & Accurate Concept Framing**:

   - Clearly frame hackathon projects as **concepts, prototypes, and research architectures**.

   - Never claim unauthorized official affiliations, state endorsements, or partnerships with real institutions, corporations, or government bodies unless legally contracted.

   - Replace real institutional names with generic examples (e.g. `Example Municipal Grid`, `Sample CSR Sponsor`) on public surfaces.

   - Never claim to hold or move live third-party financial escrow funds unless operating in a sandbox test mode.

2b. **Mandatory Continuous Updating of Prompts & Dev-Assets (Knowledge Persistence Rule)**:

   - Whenever a new component, fluid micro-interaction, architectural pattern, security fix, or high-value solution is designed and implemented, the AI agent must immediately update or append the corresponding master guide in C:\(Lectures)\+[Dev-Assets]\#(AI-AGENTS)\#Prompts in a generalized format with clear ASCII architecture diagrams, mathematical curves, and verified React/CSS implementations.



3. **Mandatory Pull Before Every Working Session**:

   - **Always pull before starting**: Before inspecting files, editing code, starting dev servers, or planning tasks, run `git pull` (or `git pull --rebase`) on your active branch.

   - Stale working copies cause design regressions and merge collisions. Sync local git state first, read `docs/DEV_SESSION_STATE.md`, and only then begin work.



4. **UTF-8 Encoding, Linefeed Normalization & Mojibake Prevention**:

   - All repository files are **UTF-8 without BOM**, normalized to single LF (`\n`).

   - **Strict Ban on Double-CRLF (`\r\r\n`)**: Never allow `\r\r` in any file. Always strip `\r` before saving markdown or source files to eliminate synthetic blank lines on GitHub.

   - Never read, edit, or save files using Windows-1252, Latin-1, or system default encodings.

   - Maintain non-ASCII characters intact (Devanagari, Ol Chiki, em dashes `—`, box drawing characters).

   - Verify touched files for mojibake or C1 control characters (`U+0080–U+009F`) before completing tasks:

     ```bash

     grep -P "[\x80-\x9f]" <file> && echo "MOJIBAKE DETECTED"

     ```



---



5. **Mandatory Asset & Artifact Categorization Rule**:

   - **Never dump files into flat parent directories**: Any generated brand assets, typography explorations, logo variants, banners, or component screenshots must be categorized immediately into dedicated domain-specific subfolders.

   - **Standard Categorization Layout**:

     * Wordmark typography & logotypes -> docs/brand_explorations/wordmarks/

     * Monograms, DAG shields, & execution gates -> docs/brand_explorations/logos/

     * Technical publication banners & headers -> docs/brand_explorations/banners/

     * 3D conceptual art & protocol diagrams -> docs/brand_explorations/concepts/

     * Live browser captures & component previews -> docs/brand_explorations/previews/

      - **Continuous Typography Dossier Maintenance Rule**: Whenever ANY new wordmark or typography exploration is created, you MUST immediately update `docs/brand_explorations/wordmarks/TYPOGRAPHY_SPECIFICATION.md` in the same turn with its comprehensive technical anatomy, design inspiration, glyph geometry (terminals, apexes, apertures, stroke weight), causal graph baseline specs, and relative asset links. Never leave an asset undocumented.

   - **Semantic Naming & Indexing**: Every file must bear a clean, semantic name (e.g. wordmark-tech-01-squircle-aerospace.jpg) without random timestamp hashes, and every archive directory must maintain a catalog README.md documenting all assets.





---



## 2. The Mandatory UI/UX Pre-Flight Interceptor Loop



Whenever your current task touches, modifies, refactors, creates, adds, or **REMOVES/DELETES** ANY user interface component, style, page, section, or layout, **YOU MUST FIRST READ & RECONCILE with `docs/UI_DESIGN_SYSTEM.md` BEFORE WRITING, EDITING, OR DELETING ANY CODE**:



```

[UI/UX Task Triggered: Add / Modify / Touch / Delete]

                          │

                          ▼

┌────────────────────────────────────────────────────────┐

│  STEP 1: Read & Reconcile with UI_DESIGN_SYSTEM.md     │

│  • Check tokens, typography, radii, spacing, physics   │

│  • Verify no bans are violated before adding/deleting  │

└─────────────────────────┬──────────────────────────────┘

                          ▼

┌────────────────────────────────────────────────────────┐

│  STEP 2: The Inviolable Ban Audit                      │

│  • Are there any emojis? (🟢, 🔴, ⚠️, 🤖, ✨) ➔ BAN    │

│  • Are there Gemini / AI sparkles? ➔ BAN               │

│  • Are there colored status orbs / pulsing dots? ➔ BAN │

│  • Are there bracketed tags? ([LIVE], [VERIFIED])➔ BAN │

│  • Are there generic shield SVGs? (Shield) ➔ BAN       │

│  • Are there cliché icons? (Rocket, Bot, Trophy) ➔ BAN │

│  • Are there hackathon track tags / pills? ➔ BAN       │

│  • Are there status tags/pills beside headings? ➔ BAN  │

│  • Are there card clutter, filler, or fluff? ➔ BAN     │

└─────────────────────────┬──────────────────────────────┘

                          │

                          ▼

┌────────────────────────────────────────────────────────┐

│  STEP 3: Interaction, Motion, Cursors & Audio          │

│  • Segmented tabs using static CSS swaps?              │

│    ➔ Replace with Framer Motion <motion.div layoutId>  │

│  • Are custom SVG cursors wired from public/cursors/?  │

│    ➔ Copy from sister projects or prompt user          │

│  • Are subtle click sounds wired from public/sounds/?  │

│    ➔ Copy click.mp3 or synthesize via Web Audio API    │

│  • Is Lenis smooth inertial scroll mounted?            │

│    ➔ Verify root instance, RAF guard, data-lenis-prevent│

│  • Are spring physics snappy? (stiffness 420, damp 34) │

└─────────────────────────┬──────────────────────────────┘

                          │

                          ▼

┌────────────────────────────────────────────────────────┐

│  STEP 4: Layout Stability, Mobile & Responsive Audit   │

│  • Is this a public page (Landing / Team)?             │

│    ➔ Ensure NO guided tours are mounted                │

│  • Is there any "lone pair" / dangling element?        │

│  • Does desktop fit without overflow-y (HP Victus)?   │

│  • Mobile view (< 768px):                              │

│    - Snap pagination: 2-3 logical sections per slide   │

│    - Portfolio dock pattern: bottom dock consolidation │

│    - Mobile bottom nav: max 5 tabs + FAB               │

│    - Safe area inset protection: pb-[env(safe-area...)]│

└─────────────────────────┬──────────────────────────────┘

                          │

                          ▼

             [Proceed to Implement UI]

```



### Pre-Flight Verification Checklist:

1. **Did I read `docs/UI_DESIGN_SYSTEM.md` (or `UI_DESIGN_SYSTEM.md`)?** Every single UI action — whether adding a new element, modifying existing styles, refactoring layout structure, or removing/deleting a component — must be reconciled against the design system rules, spacing tokens, color palettes, motion physics, and top-priority bans before touching code.

2. **Are there any emojis or sparkles?** Replace them immediately with clean Lucide line icons.

3. **Are there bracketed status tags or status tags beside headings?**

   - Remove brackets (e.g., convert `[VERIFIED]` to `VERIFIED` with unbracketed monospace styling).

   - **Strictly ban status badges / pills beside main headings**: Never place floating tags (e.g., `GraphBLAS Live`, `FalkorDB Live`, `Simulation`, `[LIVE]`) alongside or inline with `h1` or `h2` headings. Headings must remain clean, dignified, and uncluttered. System metrics belongs strictly in dedicated toolbar metrics, status bars, or subheaders.

3b. **Strict Ban on the Word "Telemetry"**:

   - Never use the word "telemetry" or "Telemetry" on ANY user-facing surface, UI chrome, documentation, or code labels. Replace universally with "Metrics", "Signals", "Activity", "Diagnostics", or "Analytics".

3c. **Extreme Minimalism & Clutter Minimization**:

   - Every page (Profile, Support, Overview, Console, MCP, Audit) must be extremely clean, uncluttered, and minimalistic.

   - Ruthlessly remove unnecessary text, redundant badges, repetitive helper paragraphs, and bulky decorative blocks. Keep necessary text concise, punchy, and restrained. If 5 words suffice, never use 20.

3d. **Strict Ban on Tags inside Card Titles / Card Headers (`VALID`, `SIMULATION`, `[LIVE]`)**:

    - Never place badge tags or status chips (e.g., `VALID`, `SIMULATION`, `ACTIVE`, `PENDING`) inside card headers or next to card title text. Titles must strictly display pristine typography. Status or metadata belongs in dedicated tabular rows or discrete data cells below, never as badge chips next to titles.

3e. **Strict Ban on External Prototype / Student References**:

    - Never include mentions of external hackathon identifiers or legacy project names like SAHNIRMAAN in the client application. The platform presents itself cleanly as CAVDAX.

3f. **Persistent Interaction Fills for Action Buttons**:

    - Interactive fill buttons (such as Connect GitHub and Sponsor) with fluid wave/water animations must latch/persist once hovered or activated, maintaining their full state instead of vanishing when mouse leaves.

4. **Are there generic shield SVGs or cliché icons?**

   - Strictly ban generic shields (`Shield`, `ShieldCheck`, `ShieldAlert`, `ShieldQuestion`).

   - Use precision domain alternatives:

     - Alerts Navigation & Header: `<Bell />`

     - Critical Danger Alerts: `<Radio />` (active real-time emergency broadcast)

     - Live Sensor Metrics Alerts: `<Activity />`

     - Imminent Hazard Popups: `<AlertTriangle />`

     - All Clear / Nominal State: `<CheckCircle2 />`

     - Auth & Credentials: `<Lock />` or `<KeyRound />`

     - Safe Routes: `<Route />`, `<Navigation2 />`, or `<Compass />`

   - Ban cliché icons: `Rocket`, `Bot`, `Lightbulb`, `Trophy`. Use `ArrowUpRight`, `Terminal`, `Cpu`, `TrendingUp`, `BarChart3`.

5. **Are segmented tabs using static CSS background swaps?** Replace with `<motion.div layoutId="uniqueDomainPill" />` using critically damped springs (`stiffness: 420, damping: 34`).

6. **Are custom SVG cursors included?**

   - Verify `public/cursors/` contains `default_cursor.svg`, `hand-pointer.svg`, `cover_hand_grab.svg`, `resize-*.svg`.

   - If missing, copy or synthesize them.

7. **Are subtle click sounds wired via `soundFx.js`?**

   - Verify `public/sounds/` contains `click.mp3` or Web Audio API procedural chime synthesis.

   - Verify low-latency Audio Pool, volume control (`0.30 - 0.35`), and `localStorage` mute toggle (`cavdax_sounds_muted`).

8. **Is Lenis smooth scroll installed and configured?**

   - Verify RAF loop only steps when `scrollHeight > innerHeight + 10` (power-saving guard).

   - Ensure modals, maps, and inner scrollbars have `data-lenis-prevent`.

9. **Are cards using bouncy zoom (`hover:scale-105`) or border-width swaps?** Replace with subtle `-translate-y-0.5` lift, specular highlight brightening, and constant 1px border thickness.

10. **Is body text multi-line centered?** Left-align body copy (`text-left`); center only short single-line subheaders.

11. **Is typography using the architectural standard?** `Inter` or `Geist Sans` with `tracking-tight` for titles, and `JetBrains Mono` or `Geist Mono` with `tabular-nums` for badges/metadata.

12. **Is this a public page (Landing `/` or Team `/team`)?** Ensure NO guided tours or tour buttons are mounted.

13. **Is there any "lone pair" element?** Ensure every control sits in a balanced, symmetrical container.

14. **Is there unnecessary desktop `overflow-y`?** Ensure panels expand with adequate headroom and zero unwanted scrollbars on standard laptop screens.

15. **Is mobile snap pagination applied for dense sections?** Use `snap-y snap-mandatory` with 2–3 logical sections per slide.

16. **Are mobile category tabs/controls consolidated?** Apply the portfolio bottom-dock pattern with the `<head>` anti-FOUC script.

17. **Is the mobile bottom navigation bar adhering to standards?** Max 5 destinations with symmetrical 2+1+2 layout, prominent centered raised FAB, safe area inset padding, unmounted on auth/landing/team pages.

18. **Are sibling action buttons symmetrical?** Sibling action buttons must share identical heights, border radii, and font metrics.

19. **Brand Wordmark & Particle Canvas Typographic Parity Rule**: The brand acronym (`CAVDAX`) rendered across hero watermarks, canvas stippling engines, or footer particle pointillism canvases (`FooterParticles.jsx`) must STRICTLY match the bespoke typography style, font family, weight, and geometric anatomy of the official **CAVDAX Wordmark** (`CavdaxWordmark.jsx`).

    - **Never use generic system/fallback fonts** (e.g. `Inter` bold or standard sans) that corrupt brand geometry with rounded terminal curves.

    - **Canvas Vector Fidelity**: For canvas rasterization of the brand acronym, directly rasterize the exact vector geometry contours (`CAVDAX_WORDMARK_LETTERS_PATH` via `Path2D`) featuring Swiss 90-degree orthogonal terminal cuts on 'C' and 'D', razor-sharp mitered apexes on 'A', 'V', 'X', and calibrated monoline stroke weight.

    - **Typography Fallback**: If standard text rendering is invoked, strictly enforce the Swiss Architectural Grotesk specification (`Space Grotesk` 900 Ultra-Black weight, uppercase, wide tracking) matching the Wordmark DNA.

20. **Mandatory Card & Component De-Clutter Audit**: Before creating or editing ANY UI component, ruthlessly audit all copy and chrome. Remove all clutter, unnecessary text, redundant labels, explanatory filler, duplicate status tags, and decorative metadata that do not serve an indispensable purpose (neither for critical technical explanation nor for genuine visual clarity). If text or metadata does not actively help the user make an immediate decision or understand state, it must be removed. Visuals and clean typography must do the heavy lifting; text must be surgical, concise, and minimal.

21. **Bidirectional Docking Horizontal Card Scroller Standard**: When implementing locked horizontal card sequences or 3D rolling cylindrical windows, strictly enforce:

    - **Normalized Center-Distance Docking**: Calculate viewport docking using normalized vertical center-distance (`Math.abs(sectionCenter - viewportCenter) < 0.35 * H`) rather than fragile top/bottom inequalities.

    - **Synchronous Mutable Reference Mirroring**: Mirror all active state in a Synchronous Ref Triad (`isLockedRef`, `activeStepRef`, `isExitingRef`) to eliminate React re-render closure lag across high-frequency trackpad streams.

    - **Directional Entry Parity**: Top-to-bottom entry seeds Step 0 (`autoDirection = 1`); bottom-to-top entry seeds Step N-1 (`autoDirection = -1`).

    - **Gesture Debounce Cooldown (380ms)**: Enforce `isTransitioningRef.current = true` for 380ms after each card advance, mapping one physical trackpad flick to one card transition.

    - **Natural Directional Lock-Outs**: Downward exit glides to following section; upward exit glides to preceding section's bottom edge (`el.offsetTop - 0.75 * H`), never to `0px`.

    - **Lenis Force-Execution Parameter**: Always pass `{ force: true }` to `window.__lenis.scrollTo()` and call `window.__lenis.start()` so programmatic exit commands execute reliably without stalling.

    - **Multi-Plane 3D Parallax Separation**: Outer stage establishes `perspective: 1200px` without `transformStyle: 'preserve-3d'` to ensure standard 2D DOM hit-testing and clickable negative-Z flanking cards (`zPos = -100px`, `scale: 0.82`, `rotateY: ∓24deg`, `opacity: 0.40`). Center active card floats forward at `zPos = +20px`. Inside each card, graphic content is separated along the Z-axis with `transform: translateZ(28px)`.

    - **Direction-Aware 10s Auto-Scroll & Countdown Fill**: The stage auto-cycles cards every 10.0 seconds along the active browsing direction ($01 	o 04$ downward, $04 	o 01$ upward). Active HUD pill renders an inner `0%` to `100%` width countdown fill layer (`bg-white/25` / `dark:bg-slate-950/25`) behind the `z-10` text.

    - **WCAG 2.2.2 Hover Pause**: Cursor entry into the stage container immediately freezes the auto-advance countdown and holds the inner pill progress bar steady.

    - **Directional Card Clicking**: Clicks on the right 35% of the center card advance to next; clicks on the left 35% step backward. Flanking cards capture clicks directly with `e.stopPropagation()`.

    - **Monochromatic Vertex Outlines**: Superseded/invalidated nodes must feature a crisp, solid circular monochromatic outline (`stroke-slate-950 dark:stroke-white/80`, `strokeWidth="1.8"`). Strictly ban gray dotted circles, dashed rings, or reticle tick clutter.

22. **Continuous Causal Provenance Radar Standard**:

    - Restrict all radar targets to `radiusRatio <= 0.66` to prevent label/pin clipping on 16:9 laptop screens when scaled to 1.25x in theater mode.

    - Strictly ban rectangular card borders around polar grids (pure unbounded HUD only).

    - Synchronize target discovery to the physical sweep beam angle: $\theta_{\text{beam}}(t) = (t / 14000) \times 360^\circ$.

    - Use calibrated exponential phosphor trailing decay $\alpha = (1 - p)^{1.8}$ over a $53^\circ$ trailing window.

    - Keep runways tight ($\le 150\text{vh}$) to eliminate dead-space voids.

23. **Causal Knowledge Graph Web Canvas Standard**:

    - Strictly enforce the **Invisible Cursor Probe Rule**: never draw a visible dot on the mouse pointer; project hairline vector edges from nearby nodes into the transparent cursor coordinates.

    - Maintain a minimum 24px exclusion buffer around wordmarks and primary buttons with tangential deflection glide.

    - Enforce dual-hemisphere node balancing (35 upper / 60 lower) with soft restorative springs to prevent gravitational settling.

    - Schedule biomimetic swarm migrations across key waypoints using alternating short flits (2.2s–4.5s) and long roosts (6.0s–10.5s).

24. **The Critical Critique & Anti-Pattern Defense Protocol**:
    - **Mandatory Premise Scrutiny**: Whenever the user, another agent, or a feature proposal suggests a UI pattern, design adjustment, copy change, or architecture decision, the agent MUST NOT blindly agree or immediately implement. First evaluate whether the underlying premise is valid, whether it solves a real user problem, or whether it creates an anti-pattern.
    - **Dual Perspective Auditing (Designer vs. User)**:
      - *Designer Perspective*: Does it preserve visual hierarchy, negative space, typography balance, and aesthetic restraint? Does it fight clutter or add noise?
      - *User Perspective*: Does a first-time visitor immediately understand the affordance without clicking, hovering, or guessing? Is the primary call-to-action upfront or buried inside an unrelated dropdown/demo tab?
    - **Root Out Classic & AI Anti-Patterns**: Explicitly hunt for and prevent anti-patterns documented in `UI_DESIGN_SYSTEM.md#36` (e.g. Mystery Meat Navigation, Hidden Critical Paths, Cargo Cult UI, Bento Card recursive slop, low-contrast grays, orphan icons).
    - **Constructive Synthesis**: Present a concise, critical critique, state the established industry standard (e.g., Linear, Vercel, Stripe), explain the trade-offs, and offer ranked, actionable alternatives before touching code.

25. **Mandatory Cloudflare 7-Phase Security Audit Gate Before Merging to `main`**:
    - **Inviolable Pre-Merge Security Requirement**: No branch (`frontend`, `backend`, `docs`) may ever be merged into `main` until the agent has executed a formal security audit against all 7 phases of the Cloudflare Security & Pen-Test Playbook (`##Global-Cloudflare-Security-Audit-And-Hardening-Playbook.md`):
      1. *Phase 1 (Boundary & Trust Mapping)*: Zero client-side validation trusted as a security boundary; all HTTP, WebSocket, and MCP inputs validated server-side.
      2. *Phase 2 (Auth & Session Gate Inspection)*: All protected routes verify cryptographic signatures or authenticated web session cookies (`req.session?.user`); zero privilege escalation vectors.
      3. *Phase 3 (Injection & Path Traversal Hunting)*: Strictly confine all file paths using `path.resolve(REPO_ROOT)` and `startsWith`; all database queries parameterized `{ params }` with zero string concatenation.
      4. *Phase 4 (Business Logic & Financial Integrity)*: Constant-time HMAC verification (`timingSafeStringEqual`); server-side order and tier authority; zero client-supplied tier overrides.
      5. *Phase 5 (Security Headers, CORS & Dependency Hygiene)*: Strict CSP, HSTS, `X-Content-Type-Options: nosniff`, `X-Frame-Options: DENY`, strict CORS origin allowlists, zero critical/high CVEs.
      6. *Phase 6 (Cloudflare Edge & Zero-Trust Architecture)*: Reverse proxy SSL termination, reverse proxy trust (`trust proxy: 1`), rate limiting, zero public exposure of raw backend IPs or dev endpoints.
      7. *Phase 7 (Advanced Memory & Session Lifecycle Hardening)*: Automatic key map re-hydration (`SEC-KEY-03`) across worker restarts; emergency key revocation epoch checks; input length/type sanitization.
    - **Strict Gatekeeper Enforcement**: Only when ALL 7 phases pass 100% green with zero critical, high, or medium findings may an agent seek developer approval to merge into `main`. If ANY vulnerability or defect is detected, the agent MUST resolve all findings on the feature branch, re-audit, and verify a clean passing report before merging.

26. **Mandatory Documentation & README Synchronization Gate Before Merge & Push**:
    - **Inviolable Documentation Sync Requirement**: Whenever any feature, bugfix, architectural enhancement, MCP tool addition, or security modification is made, the agent MUST evaluate whether project documentation (`docs/`), technical specifications (`docs/MCP_SPECIFICATION.md`, etc.), or `README.md` need to be updated.
    - **Update in the Same Pass**: If any documentation, MD spec, or `README.md` requires synchronization, the agent MUST draft, refine, and commit the documentation updates on the appropriate branch (`docs`) in the same development pass *before* requesting approval, opening pull requests, or merging into `main`.
    - **Never Ship Code Ahead of Documentation**: Code and documentation must move in strict lockstep. It is a fatal governance defect to push code changes while leaving `README.md` or technical specifications describing stale, outdated, or incomplete capabilities.

27. **Mandatory Zero-Knowledge Enclave Cloaking Gate (Pre-Commit Scan)**:
    - **Inviolable Enclave Cloaking Requirement**: Before any commit or PR is merged into `main`, the agent MUST verify that no tracked files (specifically `.env.example`, `README.md`, `docs/`, public templates, or client assets) leak or mention:
      1. Internal developer routes or internal operational consoles.
      2. Developer enclave authentication variables or passkey secrets.
      3. Real public IP addresses, cloud VM IPs, or ISP subnet identifiers.
    - **Strict Gatekeeper Enforcement**: Any hit in tracked repository files is a critical security vulnerability and must be completely purged before staging and merging.

28. **Graph-Grounded Security Hardening & Forensic Verification (`graphify` + `security-and-hardening` + `devils-advocate`)**:
    - **Topological Invariant Enforcement**: Whenever `graphify-out/graph.json` exists in the repository, agents MUST use Graphify to mathematically verify code modifications rather than relying on heuristic string matching:
      1. *Caller Regression Audits (Vector 1)*: Run `graphify path "<Caller>" "<ModifiedSymbol>"` or `graphify query` on modified exports to trace all transitive callers across services before claiming caller invariance.
      2. *Taint & Sandbox Confinement (Vector 3 & STRIDE)*: Run `graphify path "<untrusted_input>" "<privileged_sink>"` to verify no unvalidated path connects external HTTP/MCP endpoints to arbitrary file I/O, process execution, or database mutations.
      3. *God Node Defensive Hardening*: Use Graphify's degree centrality analysis to identify top hub modules (`systemState.js`, auth middleware, database clients) and ensure strict null guards, rate limiting, and defensive schemas are in place.
      4. *Graph Synchronization Invariant*: After completing modifications, run `graphify update .` to keep the persistent knowledge graph in sync with the codebase AST.



---



## 3. Git Branch Hygiene & Commit Governance



- **Never work directly on `main`**: `main` is the integration and production-truth branch.

- **Dedicated Branch Structure (Domain Separation)**:

  - `frontend`: Exclusively for client UI/UX code (`apps/client/`, `assets/`, styles, components).

  - `backend`: Exclusively for API, database, and MCP services (`core/`, `apps/server/`, `infra/`).

  - `docs`: Exclusively for documentation files (`docs/`, `AGENTS.md`, `README.md`).

- **Inviolable Commit Policy: Developer Permission is MANDATORY**:

  - Never commit or push code without explicit developer permission.

  - Do NOT run `git commit` or `git push` automatically during a session.

  - Only when the developer explicitly commands (e.g., *"commit and push"*, *"we are done with this session"*), execute the formal **End-of-Session Domain-Partitioned Git Governance Protocol**.

- **End-of-Session Domain-Partitioned Protocol**:

  1. **Pre-flight Audit**: Check `git diff` for secrets/credentials, and run local verification build (`npm run build`).

  2. **Atomic Domain Segregation**: For each active domain with changes (`docs`, `backend`, `frontend`), checkout that branch (create from `main` if it doesn't exist), stage **ONLY** that domain's files (`git add docs/`, `git add apps/client/`), commit cleanly, and push (`git push origin <domain>`).

  3. **Sequential Pull Requests & Descriptive Merges to `main`**:

     - Raise a formal GitHub PR from each feature branch to `main`: `gh pr create --base main --head <domain> --title "..." --body "..."`.

     - **Descriptive Merge Commit Requirement**: Every PR merge commit to `main` must NEVER be generic (banned: `merge: integrate <domain> into main`). It must explicitly specify:

       - **WHAT** was merged (components, services, documentation updated).

       - **WHY** it was merged (architectural intent, design system adherence).

       - **WHAT PROBLEM IT SOLVED** (concrete bug, layout shift, visual defect, or omission resolved).

     - Merge via `gh pr merge <number> --merge --delete-branch=false --subject "..." --body "..."` sequentially, running a local build verification check (`npm run build`) between each merge.

     - Return to the active feature branch (`git checkout frontend`).

- **Conventional Commit Standard & CI Directive Hygiene**:

  - Use concise conventional prefixes: `feat:`, `fix:`, `docs:`, `refactor:`, `perf:`, `test:`, `chore:`.

  - **Production Deployment Architecture (Cloud VM + Cloudflare)**:
    - CAVDAX deploys to an Ubuntu Cloud VM running Docker Compose (`cavdax-server`, `cavdax-client`, `cavdax-falkordb`, `cavdax-caddy`) fronted by Cloudflare DNS/SSL. Continuous deployment is handled via `.github/workflows/deploy.yml` on merges to `main`.
    - **Universal Ban on `[skip vercel]`**: CAVDAX does NOT use Vercel. Never include `[skip vercel]` or vendor-irrelevant tags in commit messages.
    - **Code Commits (`backend`, `frontend`, `infra`, `server`, `mcp-server`)**: Use clean conventional commits without skip tags. Never use `[skip ci]` on code commits so that GitHub Actions CI test suites (`ci.yml`, `cavdax-gate.yml`) always execute.
    - **Documentation & Meta Commits (`docs/`, `*.md`, `README.md`, `DEV_SESSION_STATE.md`)**: Use `[skip ci]` when no executable code is touched to avoid unnecessary GitHub Actions runner minutes.

- **Experimental Spikes & Archive Tags Invariant (Never Merge Spikes into Main/Feature Branches)**:

  - Exploratory design spikes, prototypes, or experimental branches (e.g. `Damir-Design-Try`, `experiment/*`, `spike/*`) must **NEVER** be merged into `main`, `frontend`, `backend`, or `docs`.
  - When an exploratory spike is concluded or paused, follow the **Archive Tag + Branch Deletion Standard**:
    1. Tag the tip commit: `git tag archive/<spike-name> <branch-name>`
    2. Delete the active branch: `git branch -D <branch-name>`
  - This safely preserves the commit history and visual exploration assets under `archive/*` tags for future reference while ensuring git branch lists and automated merge scripts remain 100% clean and immune to accidental merges.

- **Atomic Feature Squashing & History Cleanliness (Mandatory)**:

  - **Ban on Micro-Commit Churn**: Avoid polluting Git commit history with rapid, back-and-forth micro-commits (e.g., *"shift 4px down"*, *"shift a bit up"*, *"fix padding"*, *"revert size"*).

  - **Session-Level Squashing of Related Changes**: When multiple commits made during recent active pair-programming iterate on or refine the same underlying feature, always squash them into a single, cohesive, atomic commit before concluding the session or opening a PR to `main`.

  - **Atomic Milestone Integrity**: A feature commit in history must represent a complete, functional milestone where `npm run build` passes cleanly, not intermediate trial-and-error steps.

  - **Safe Remote Updates**: When updating a feature branch after squashing already-pushed iterative commits, strictly use `git push --force-with-lease origin <branch>` (never bare `--force`) to ensure remote integrity.

- **The 6 Industry-Standard PR Lifecycle Stages (Mandatory Before Merging)**:

  1. *Stage 1: Pre-Flight Automated CI Gates*: Static analysis, linting, compilation, and automated tests must pass 100% green before human or peer review.

  2. *Stage 2: Multi-Axis Code Review Matrix*: Audit against Correctness/Edge Cases, Security/Data Safety, Architecture/Modularity, and Observability.

  3. *Stage 3: Formal GitHub Review Actions*: Reviewers submit structured Comment, Request Changes, or Approve via GitHub UI or gh pr review.

  4. *Stage 4: Merge Strategy Selection*: Default to **Squash and Merge (--squash)** for clean atomic history on main; use --merge for large release epics.

  5. *Stage 5: CI/CD Post-Merge Verification*: Automated build verification confirms main remains deployable and healthy.

  6. *Stage 6: Post-Merge Hygiene & Branch Pruning*: Delete merged remote branches (--delete-branch) and sync local git working state.

- **The 4 AI-Agent PR Delegation Tasks (Human-in-the-Loop Protocol)**:

  1. *Task 1: Automated Deep Audit*: Agent inspects diffs, verifies secrets, traces inputs, checks query bounds (LIMIT 500), and audits error handling.

  2. *Task 2: Branch Patching*: Agent checks out PR branches, applies surgical fixes, tests locally, and pushes clean commits.

  3. *Task 3: Formal Review & CLI Merge*: Agent formats structured review feedback and executes approved merges via gh pr merge.

  4. *Task 4: Workspace State Sync*: Agent pulls updated main, synchronizes working branches, and keeps DEV_SESSION_STATE.md accurate.

- **The Generalized Pre-Merge Invariant Checklist (Stack-Agnostic)**:

  - No code merges into main without verifying:

    1. *Zero Secret Leaks*: Diff contains zero credentials, real keys, or .env files.

    2. *Clean Build & Compilation*: 

pm run build (or equivalent) passes with zero fatal errors.

    3. *Regression Tests Pass*: All unit, integration, and benchmark tests continue to pass green.

    4. *Dependency Lockfile Integrity*: package-lock.json matches package.json changes.

    5. *Contract & Schema Compatibility*: Backward compatibility preserved on API endpoints and database models.

    6. *Accurate Concept Framing*: Zero unauthorized government/institutional claims or fake escrow assertions.

    7. *Cloudflare 7-Phase Security Audit Pass*: Full diff passes all 7 phases of the Cloudflare Security Audit Playbook with zero unresolved critical, high, or medium findings.

    8. *Persistent Memory Sync*: docs/DEV_SESSION_STATE.md synchronized.

    9. *Documentation & README Synchronization*: `README.md`, technical specifications, and architectural docs evaluated and updated to accurately describe in-flight features, tools, and fixes before creating PRs or merging into `main`.



## 4. Multi-Language Parity Rules (When Applicable)



1. **No Pseudo-Translations**: Never write literal transliterations, phonetic approximations, or word-for-word dictionary swaps.

2. **Key Parity**: Any new key added to translation dictionaries must exist synchronously across all configured language files.

3. **Monochrome Validation Indicators**: Form asterisks (`*`) and required tokens must follow monochromatic styling (`text-slate-400 dark:text-slate-500`).

4. **Brand Names Intact**: Keep official brand names (`CAVDAX`, `FalkorDB`, `GraphBLAS`, `MCP`) untranslated in Latin characters.



---



## 5. Session State & Working Memory (`docs/DEV_SESSION_STATE.md`)



- **Single Source of Truth**: At the conclusion of each task or milestone batch, update `docs/DEV_SESSION_STATE.md`.

- **Detail Captured**:

  - Completed items and verified test runs.

  - Active in-progress files.

  - Uncommitted local states.

  - Pending follow-up backlog items.

- Always read `docs/DEV_SESSION_STATE.md` at the start of a conversation to resume without context loss.



---



## 6. Reference Architecture Codebases & Curated UI Resource Matrix



### 6.1 Production Sister Projects

> [!NOTE]

> *(Notice for External Developers: The local machine paths below are historical references for developer Suneet Chugh whose workstation contains these codebases. External developers will not have these local paths and should substitute their own project roots or prompt the user).*



- **DOAB**: `c:\Users\krish\OneDrive\Desktop\(All_&_Everything)\(All-Hackathons)\WeMakeDevs\DOAB-Codebase`

- **SAHNIRMAAN**: `C:\Users\krish\OneDrive\Desktop\(All_&_Everything)\(All-Hackathons)\Z++ Done\(SAHNIRMAAN)`

- **SWATVA**: `c:\Users\krish\OneDrive\Desktop\(All_&_Everything)\(All-Hackathons)\Z++ Done\(SWATVA)`



### 6.2 Curated External UI/UX Engineering Registries

> [!IMPORTANT]

> **Developer Self-Verification Directive**: Prefer extracting core CSS/Tailwind tokens and Framer Motion spring physics directly into repository primitives over pulling heavy external dependencies (the Ponytail principle).



- **ElevenLabs UI**: [ElevenLabs UI](https://ui.elevenlabs.io/) (Conversational AI & audio waveform patterns)

- **Prompt-Kit**: [Prompt-Kit](https://www.prompt-kit.com/) (LLM prompt inputs, context pills & reasoning traces)

- **RetroUI**: [RetroUI Primitives](https://retro-ui.basecase.site/components) (Tactile brutalist interface primitives)

- **21st.dev**: [React Components](https://21st.dev/) (Curated open-source React/Tailwind component directory)



---



## 7. The Ruthless Mentor & LLM Council Framework



When asked for architectural review, design choices, or feature feasibility:

- **Direct, Honest & Specific**: Prioritize truth over polite agreement.

- **Stress-Test Every Plan**: Evaluate assumptions, operational risks, failure modes, latency tradeoffs, and edge cases.

- **Socratic Inquiry**: Ask hard questions before rushing into code solutions.

- **Minimalist Interventions**: Provide the smallest set of high-leverage changes that makes the idea actually work.



---



## 8. The Ponytail Principle (Zero Overengineering)



- Never add bloated libraries or external state containers when native Web APIs, lightweight React hooks, or simple CSS suffice.

- Inline SVGs with hardware-accelerated CSS keyframes beat heavy JavaScript canvas or runtime animation frameworks for brand logos.

- Sparse matrix causal graph queries beat complex distributed vector databases for deterministic reasoning invalidation.



---



## 9. Project Naming Architecture (Functional Descriptive Acronyms)



- **CAVDAX**: **C**ontextual **A**ction & **V**erified **D**ecision **A**utonomous e**X**ecution.

  - Eliminating Silent Cache Rot in AI Coding Agents via FalkorDB GraphBLAS & Model Context Protocol.



---



## 10. The Canonical `docs/` Architectural Repository & The 6 Context Files



Every AI coding agent must treat the **6 Canonical Context Files** as the persistent, immutable source of truth:



| Canonical File | Purpose & Architectural Boundary | Question Answered | Standard Location |

| :--- | :--- | :--- | :--- |

| **`PRD.md`** | Problem scope, user personas & boundary conditions | *WHAT are we building?* | `docs/PRD.md` |

| **`ARCHITECTURE.md`** | System topology, multi-layer data flow & contracts | *HOW is the system structured?* | `docs/ARCHITECTURE.md` |

| **`AGENTS.md`** | AI behavioral constitution, guardrails & branching laws | *WHAT should AI do / NOT do?* | Repository Root (`AGENTS.md`) |

| **`PHASES.md`** | Phased milestone roadmap with test verification checkpoints | *IN WHAT ORDER should we build?* | `docs/PHASES.md` |

| **`UI_DESIGN_SYSTEM.md`** | Design tokens, color system, motion physics & audio | *HOW should the product look and feel?* | `docs/UI_DESIGN_SYSTEM.md` |

| **`DEV_SESSION_STATE.md`** | Living record of architectural decisions & commit batches | *WHAT has already been decided/built?* | `docs/DEV_SESSION_STATE.md` |



- **Strict Source of Truth**: Before proposing changes, introducing new abstractions, or writing components, the agent must reconcile against `PRD.md`, `ARCHITECTURE.md`, `PHASES.md`, and `UI_DESIGN_SYSTEM.md`. Never invent rogue patterns or unaligned styling.

- **All Documentation Lives in `docs/`**: Only operational governance documents (`AGENTS.md`, `README.md`) live at root; all other specifications live inside `docs/`.



---



## 11. Data Sovereignty & State Storage Contract (LocalStorage vs. Account-Synced)



- **Device-Scoped State (`localStorage` ONLY)**:

  - Hardware & performance engine choices (`cavdax_map_engine`, reduced motion overrides, particle canvas toggles).

  - Device audio ergonomics (`cavdax_sounds_muted`, `cavdax_click_sound` — never follow cross-device account sync).

  - Local display settings (`preferredTheme`, `preferredLanguage`).

  - First-time onboarding/tour completion flags (`cavdax_tour_seen`).

  - Ephemeral offline incident logs and activity caches.

- **Account-Scoped State (Database / Cloud Synced)**:

  - User identity, credentials, cryptographic tokens, and verified email.

  - Operational role (`role`: 'engineer' | 'auditor' | 'agent'), model provider configurations.

  - Incident logs, endorsements, audit trail logs, and historical transactions.

- **The Inviolable Logout Retention Rule**:

  - On logout: Clear session tokens, auth credentials, and account profiles.

  - **NEVER wipe device-scoped keys** (`theme`, `preferredTheme`, `cavdax_sounds_muted`, or reduced-motion toggles).



---



## 12. Continuous Security Posture & Vulnerability Hunting (`vibe-guard` & `Agentic-Bug-Hunter`)



1. **Zero-Trust Input & Parameter Validation**:

   - Never trust client-supplied input, query parameters, or localStorage values without schema validation or sanitization.

   - Enforce type guards and bounds checks on numeric inputs.

2. **Authorization & IDOR / BOLA Prevention**:

   - Verify that data retrieval and update operations always check authorized role privileges over the requested resource ID.

   - Enforce authorization at API boundaries, not just client-side toggles.

3. **Secret Leakage & Token Exfiltration Defense (Vibe-Guard)**:

   - Scrutinize network requests, console logs, and client bundles to guarantee API keys, auth headers, private keys, or internal endpoints are never exposed.

   - Staged secret scanning before every Git commit is mandatory.

4. **Injection Vector Hardening**:

   - Neutralize XSS vectors: never use `dangerouslySetInnerHTML` with unsanitized user or external feed strings.

   - Neutralize Cypher/SQL/NoSQL injection: use parameterized queries and ORM binding exclusively.



---



## 13. Pre-Publish Markup Integrity Guard & Zero-Leak Protocol (Mandatory)



- **The Absolute Rule**: Generated HTML documents (such as interactive knowledge graphs, architectural visualizations, or standalone doc bundles) must **NEVER leak raw JavaScript code, function declarations, or unparsed script contents into visible HTML text nodes**.

- **Banned Generation Practices**:

  - **Never parse or slice existing HTML/markup to extract data**: String searches (`orig.find(...)` or string token splits) on previously generated HTML files are brittle and easily cause recursive script tags or premature closing tag injection (`</script>`).

  - **Direct Structured Data Ingestion Only**: Always read data directly from structured JSON (`graph.json`, `graph_nodes.json`, `graph_edges.json`), typed database dumps, or native AST exports.

  - **Clean Native Serialization**: Serialize data arrays strictly with native serializers (`json.dumps(..., ensure_ascii=False)`) directly into template variables.

- **Mandatory Pre-Publish Verification**:

  - Before ANY generated HTML is committed, pushed to `gh-pages`, or deployed to hosting surfaces, the automated verification script (`scripts/verify-graph-integrity.py`) **MUST** be executed and pass with zero errors.

  - **The 5-Point Pre-Flight Audit Checklist**:

    1. **Tag Balancing**: Number of opening `<script` tags must exactly equal closing `</script>` tags (expected exactly 2 for standalone graph pages). Number of `<style>` tags must match `</style>`.

    2. **Zero Text Leaks**: No JavaScript keywords (`let audioCtx`, `function playClick`, `function setTheme`, `const nodesDS`, `soundMuted =`) may appear outside `<script>` or `<style>` blocks.

    3. **Clean Trailing Boundary**: Nothing may follow the final `</script>` tag except `</body></html>` and whitespace.

    4. **Data Completeness**: `RAW_NODES`, `RAW_EDGES`, and `LEGEND` must be non-empty, valid JSON arrays.

    5. **Design System & Metrics Compliance**: Must verify presence of official platform CTA (`cavdax.sahnirmaan.live`), `#d9a353` warm amber tokens, and dark theme defaults.

- **Automated Pipeline Enforcement**:

  - Both local deployment scripts (`publish-graph-pages.ps1`, `publish-graph-pages.sh`) and CI/CD pipelines (`.github/workflows/deploy-graph-pages.yml`) execute `verify-graph-integrity.py` before git staging or deployment. If any check fails, publication is immediately halted with a fatal error.


## 💳 Commercial & Payment UI Rules — Zero Marketing/Gateway Clutter

- **Strict Ban on Gateway Badge Clutter**: Never include generic payment gateway badges, trust seals, or payment method enumerations (e.g., `Secure · Razorpay · UPI · Cards · Net Banking`, `Powered by Stripe`, or similar badge lists).
- **Production Developer Aesthetics**: All payment interfaces (Sponsor and Tier Cards) must strictly maintain high-end, uncluttered, monochromatic developer console aesthetics.
- **Dynamic Key Resolution**: Never hardcode or statically inline fallback Test Mode keys in production builds. Always resolve payment keys dynamically from backend orders or verified production environment configurations.


## 14. CI/CD Deployment Concurrency & Container Daemon Race Protection Protocol

- **Mandatory Workflow Concurrency Lock**:
  - Every GitHub Actions / GitLab CI production deployment workflow executing over SSH or managing container infrastructure MUST explicitly define a top-level concurrency block:
    ```yaml
    concurrency:
      group: production-deploy
      cancel-in-progress: false
    ```
  - **Zero Parallel SSH Deployments**: NEVER allow two or more concurrent workflow triggers (e.g. back-to-back PR merges) to SSH into the same VM and run container management commands simultaneously. Concurrent runs create race collisions where multiple processes attempt to remove or bind the same container name simultaneously.
- **Elimination of "Removal of container is already in progress" Daemon Collisions**:
  - When using Docker Compose with explicit `container_name:` declarations on cloud instances (e.g. AWS EC2 t3.micro), `containerd` takes 1–3 seconds to unmount overlayfs storage layers and network endpoints.
  - Automated deployment scripts must NEVER execute a naked `docker compose up -d` that fails immediately on transient unmount locks. Wrap rolling container recreations in a resilient backoff retry loop (e.g. 3–4 retries with 3-second sleep backoff):
    ```bash
    deploy_service() {
      local svc="$1"
      local count=0
      until docker compose -f infra/docker-compose.prod.yml up -d --no-deps "$svc" 2>/dev/null || [ $count -ge 4 ]; do
        echo "==> Docker daemon unmounting previous '$svc' layer, retrying in 3s ($((count + 1))/4)..."
        sleep 3
        count=$((count + 1))
      done
      if [ $count -ge 4 ]; then
        docker compose -f infra/docker-compose.prod.yml up -d --no-deps "$svc"
      fi
    }
    ```
- **Absolute Ban on Pre-Build Service Termination (Cloudflare Error 521 Prevention)**:
  - Never execute `docker rm -f`, `docker kill`, or `docker down` before building container images. Reverse proxies (Caddy, Nginx) must stay alive and listening on ports 80/443 while builds compile in the background.
  - Only perform in-place, sequential container swaps once image builds have succeeded 100%.

## 15. Silent GPU & CPU Resource Leak Prevention (Zero-Ghost-RAF & Background Tab Sleep Protocol)

- **Mandatory `requestAnimationFrame` Handle Retention & Cleanup**:
  - Every single `requestAnimationFrame(fn)` call MUST store its returned handle (`rafId = requestAnimationFrame(...)` or `animFrameRef.current = requestAnimationFrame(...)`).
  - In React, any component that initiates a frame loop or recursive tick inside `useEffect` MUST return an explicit cleanup function that invokes `cancelAnimationFrame(rafId)` and resets the handle to `null`.
  - **Zero-Ghost-RAF Invariant**: An unscoped, unreferenced, or uncancelled `requestAnimationFrame` recursion is a critical blocker. It spawns persistent "ghost loops" that survive component unmounts, route transitions, and development hot-reloads, silently spinning the GPU compositor and main thread indefinitely.
- **Mandatory Background Tab Sleeping (`visibilitychange` Standard)**:
  - Any continuous physics loop, canvas rendering engine, particle simulation, SVG path mutation, smooth-scroll interpolator, or radar sweep MUST listen to `document.addEventListener('visibilitychange', ...)`.
  - When the browser tab is hidden or minimized (`document.hidden === true`), the animation frame loop MUST immediately pause (`cancelAnimationFrame`), entering a deep sleep state.
  - When the tab returns to the foreground (`document.hidden === false`), re-synchronize elapsed timestamps (`lastTime = performance.now()`) to prevent delta-time explosion jumps, and resume the frame loop only if the element is currently in the viewport.
  - **Zero-Background-Consumption Guarantee**: Background tabs MUST consume **0% GPU cycles and 0% CPU frame execution**.
- **Render-on-Demand Physics (The Sleep Physics Invariant)**:
  - Physics simulations (spring pendulums, pull cords, stippled particles, momentum scrollers) must enforce resting epsilon thresholds.
  - When displacement and velocity drop below threshold (`Math.hypot(dx, dy) < epsilon && Math.hypot(vx, vy) < epsilon`), snap the physics state to exact equilibrium, execute a final DOM paint, set the animation handle to `null`, and stop scheduling subsequent animation frames.
  - Never run an infinite 60–144Hz animation loop for a static element at rest.
- **Template Variable Binding & Fail-Closed Webhook Invariants**:
  - Every variable referenced in a string template literal (HTML email builders, notification summaries, SVG generators) must be declared and assigned in scope. Never assume early returns in test environments will protect production runtime code.
  - Webhook receivers with configured secrets must fail closed: missing signature headers must reject immediately (`401 MISSING_SIGNATURE`).

## 16. Temporal Dead Zone (TDZ) & Top-Level Module Execution Invariants (Production Bundle Crash Prevention)

- **The Problem & Failure Scenario**:
  In modern JavaScript/TypeScript (ES2015+), variables declared with `const` and `let` are block/module-scoped and reside in the **Temporal Dead Zone (TDZ)** from the start of the block/module until their definition statement is evaluated.
  When an AI coding agent creates or edits module-level dictionaries, lookup maps, registries, or routing tables (e.g., `const REGISTRY = { ... }`), placing them **above** their constituent member definitions (e.g., `const SUB_STEPS = [ ... ]`) does not trigger a compile-time error in Vite, Rollup, or TypeScript if types check.
  However, at runtime, the moment the module script is loaded by the browser or Node runtime, top-level execution attempts to evaluate the object literal, immediately throwing:
  `Uncaught ReferenceError: Cannot access 'X' before initialization` (or in minified production builds, `Cannot access '<minified_id>' before initialization`, e.g., `Cannot access 'EN' before initialization`). This crashes the entire client bundle on initial render.

- **Mandatory Top-Down Declaration Hierarchy (The Dependency Order Rule)**:
  - In every JavaScript/TypeScript file, module-level constant arrays, primitive configs, step definitions, and helper handlers MUST be declared **strictly before** any composite dictionary, map, registry, or compound configuration that references them.
  - **The Eager Evaluation Invariant**: When an object literal (`const MAP = { a: A, b: B }`) is declared at the module root, `A` and `B` are evaluated **immediately** upon module load. If `B` is defined 20 lines lower, the entire application will crash.
  - **Safe Pattern (Strict Top-Down Ordering)**:
    ```javascript
    // 1. Primitive arrays & component steps declared first
    const CONSOLE_STEPS = [ ... ];
    const MCP_STEPS = [ ... ];
    const AUDIT_STEPS = [ ... ];

    // 2. Composite registry declared strictly after all members are initialized
    const TOUR_REGISTRY = {
      console: CONSOLE_STEPS,
      mcp: MCP_STEPS,
      audit: AUDIT_STEPS,
    };
    ```

- **Lazy Getter Guard for Complex or Mutually-Referencing Registries**:
  - Whenever there is any risk of circular module references, deep nesting, or complex dependencies, encapsulate member access in a **lazy getter function** rather than eager top-level object evaluation:
    ```javascript
    // Eager evaluation (TDZ Trap if MCP_STEPS is below):
    // const REGISTRY = { mcp: MCP_STEPS };

    // Resilient Lazy Resolution (Immune to TDZ execution traps):
    const getTourSteps = (mode) => {
      switch (mode) {
        case 'mcp': return MCP_STEPS;
        case 'audit': return AUDIT_STEPS;
        default: return CONSOLE_STEPS;
      }
    };
    ```

- **Post-Build Headless Smoke Test Verification**:
  - Never claim a build is verified solely on `vite build` or `tsc`. Compilers and bundlers perform tree-shaking and type analysis; they do NOT execute the module top-level runtime graph.
  - Before committing structural or registry changes to frontend entrypoints, verify the production bundle by running a headless load or evaluating the chunk exports in Node, ensuring zero unhandled TDZ ReferenceErrors.


---

## 17. Mandatory Scratch Script & Ad-Hoc File Self-Destruction Invariant (Zero-Lingering-Scratch Protocol)

- **The Problem & Failure Scenario**:
  During complex diagnostic tasks, audits, batch data migrations, asset conversions, or repository checks, AI coding agents frequently author ad-hoc scratch scripts (`*.py`, `*.mjs`, `*.js`, `*.sh`, `*.tmp`).
  When an ad-hoc script runs, errors out, or is cancelled in the background, agents often fail to clean up the temporary file, abandoning lingering utility scripts in the project root or source directories.
  This clutters the repository, confuses developers and judges, risks committing unreviewed scratch files to git, and creates security and intellectual property hygiene risks.

- **The Strict Self-Destruction Invariant**:
  - **Single-Turn Lifecycle**: Every scratch/ad-hoc script created for inspection, data extraction, or transformation MUST be deleted within the exact same turn or operation cycle in which it was used.
  - **The Cancellation / Failure Cleanup Rule**: If a background command or task running a scratch script is killed, timed out, or errors out, the agent's very next tool call MUST be the unconditional removal of that scratch script (`Remove-Item` / `rm`). Never abandon a script file because its task was terminated.
  - **Scratch Directory Isolation**: If a scratch file or mock artifact must temporarily persist across multi-step turns for debugging, it MUST be stored inside the designated agent scratch path (`<appDataDir>/brain/<conversation-id>/scratch/` or `.tmp/`) and NEVER directly in the repository root or project source folders.
  - **Pre-Turn Cleanliness Sweep**: Before concluding any turn, declaring work complete, or staging commits to git, the agent MUST verify that no stray `.py`, `.mjs`, `.sh`, or `.tmp` utility files remain loose in the workspace (`Get-ChildItem -Path . -Filter "*.py"`, etc.).


---

## 18. GitHub "Pair Extraordinaire" Git Co-Authorship & Auth Parity Standard

To maintain transparent attribution between human developers and AI pair programmers, and ensure eligibility for the **GitHub Pair Extraordinaire** achievement badge on merged Pull Requests, all agents working in this repository must follow these protocols:

### 18.1 Mandatory `Co-authored-by:` Commit Trailer
- **The Protocol**: Every git commit authored on a feature branch (`frontend`, `backend`, `docs`) MUST include the co-authorship trailer formatted exactly as follows:
  ```git
  Co-authored-by: Suneet Chugh <valorise078gramming@gmail.com>
  ```
- **Formatting Invariants**:
  1. **Empty Line Separation**: There must be an empty line separating the commit body/summary from the `Co-authored-by:` trailer.
  2. **Exact Casing**: The token `Co-authored-by:` is strictly case-sensitive.
  3. **Verified Email**: The email address must match a verified email address on the `@suneetchugh-dev` GitHub account (`valorise078gramming@gmail.com`).
  4. **Multi-Author Support**: If multiple contributors collaborate on a change, list each co-author on its own line:
     ```git
     Co-authored-by: Suneet Chugh <valorise078gramming@gmail.com>
     ```

### 18.2 Sponsor vs. SaaS Auth Parity & Identity Binding Invariant
- **The Parity Principle**: Never implement guest checkout on financial sponsorship surfaces that promise in-app identity perks (such as Backer Wall avatar listing, profile halos, or Discord roles) without full auth parity with SaaS account tiers.
- **The Unauthenticated State**: If a user is not signed in (`!user`), the primary CTA must clearly indicate `Sign In to Sponsor` with `<Lock />` affordance, redirecting safely via `/api/auth/github?returnTo=<current_route>`.
- **Ephemeral Evaluation Segregation**: Hackathon evaluation passes and developer test bypasses must remain separate from public anonymous checkouts, using dedicated ephemeral tags (`is_evaluation: true`) that evaporate on mode disengagement without polluting canonical seed records.

---

## 19. Visual Verification & Automated UI Audit Invariants (Anti-Hallucination & Overlay Suppression)

To ensure that automated visual testing, screenshot captures, and UI audit proofs represent reality and are never obscured or falsely claimed, all AI coding agents must follow these strict operational invariants:

### 19.1 Mandatory Modal, Tour Guide & Scrim Suppression Protocol
- **The Problem & Failure Scenario**:
  During automated browser audits, onboarding walkthroughs, guided tours (e.g. `TourGuide`), announcement banners, feedback toasts, or auth popovers frequently trigger in the background due to empty session states or route switches.
  When an agent captures a screenshot while a modal overlay or backdrop scrim is open, the target feature is completely obscured, rendering the audit screenshot useless, confusing developers, and leading to false claims of implementation.
- **The Pre-Capture Cleanliness Invariant**:
  Before calling `page.screenshot()` on any view:
  1. **Purge Pending Triggers**: Explicitly clear pending tour/modal session states before navigation:
     ```javascript
     sessionStorage.removeItem('cavdax.tour.pending');
     localStorage.setItem('cavdax.tour.seen', 'true');
     localStorage.setItem('cavdax.tour.dismissed', 'true');
     ```
  2. **Active Dismissal & Escape Fallback**: Dispatch an explicit Escape keypress or dismiss active dialogs:
     ```javascript
     const activeDialog = document.querySelector('[role="dialog"], .tour-guide-overlay, [data-tour-step]');
     if (activeDialog) {
       await page.keyboard.press('Escape');
     }
     ```
  3. **Assert Zero Scrims Before Snapshot**: Never capture a proof screenshot until verifying via DOM assertion that no obscuring overlay or backdrop scrim exists (`document.querySelectorAll('[role="dialog"]').length === 0`).

### 19.2 Dual-Surface & Interactive Canvas vs. Exporter Invariant
- **The Problem & Failure Scenario**:
  Many complex components have dual visual representations:
  - An **interactive runtime canvas** (e.g. live React JSX SVG nodes in `GraphCanvas.jsx`).
  - A **static export/rasterization engine** (e.g. vector download in `handleDownloadGraph` or CLI rasterizer).
  Agents frequently update the export helper or static generator and falsely assume the live canvas was also updated—or suffer a failed string replacement in the interactive JSX loop—claiming success while users see no change in the running application.
- **The Invariant**:
  1. **Dual-Surface Parity**: When changing geometry, typography, node styling, or colors, both the interactive render loop AND the export engine MUST be updated simultaneously.
  2. **Live DOM Node Assertion**: Never declare a visual feature complete or claim it works based on a successful file write or clean build. The agent MUST run a live browser DOM assertion verifying that the expected HTML/SVG tags and attributes exist in the live running DOM (e.g., verifying `document.querySelectorAll('polygon').length > 0` for custom polygon nodes vs `rect`).

### 19.3 Windows CRLF Multi-Line String Replacement Safety
- **The Protocol**: On Windows systems where files may use CRLF line endings (`\r\n`), multi-line regex replacements in Node.js or Python can fail silently if newlines are mismatched.
- **The Verification Rule**: Immediately after applying any programmatic file modification, the agent MUST run `git diff <file>` to inspect the unstaged diff and verify that the intended target block was actually modified as expected.

---

## 20. Containing Block Hijacking, Viewport-Fixed Chrome & Root Projection Invariant (W3C CSS Transforms Law)

To ensure that floating navigation docks, sidebars, modal dialogs, and viewport chrome never get trapped in parent containers or scrolled off-screen, all AI coding agents must follow these strict architectural invariants:

### 20.1 The W3C CSS Transforms Containing Block Trap (The Spec Law)
- **The Specification Invariant (W3C CSS Transforms Module Level 1, §2)**:
  Any non-none value for `transform`, `filter`, `perspective`, or `backdrop-filter` creates a new containing block for all descendants, including those styled with `position: fixed` or `position: absolute`.
- **The Empirical Failure Scenario**:
  When page ascent transitions, route entrances, or container animations use CSS keyframes (e.g., `<PageAscentTransition>` with `animation-fill-mode: both`), the terminal keyframe `transform: translate3d(0, 0, 0)` remains permanently attached to full-height wrappers (such as `<main id="main-content">` spanning 3,450px+).
  As a result:
  - Any descendant with `position: fixed; top: 50%` computes its offset against `<main>` (`50% * 3,450px = 1,725px`) rather than the 900px physical browser viewport.
  - The element scrolls with the document rather than floating, disappearing completely off the screen at `scrollY > 1000px`.

### 20.2 The Mandatory Root Projection Protocol (`createPortal`)
- **Direct Viewport Projection**:
  Any UI component designed to remain fixed to the physical browser viewport across scrolling (such as top navigation docks, elevated right-hand sidebar docks, floating action buttons, command palettes, and modal scrims) MUST be rendered via React Portals directly into `document.body`:
  ```jsx
  import { createPortal } from 'react-dom';

  {mounted && typeof document !== 'undefined' && createPortal(
    <AnimatePresence>
      {/* Viewport-fixed floating chrome */}
    </AnimatePresence>,
    document.body
  )}
  ```
- **Invariant**: Mounting directly into `document.body` guarantees the root window viewport is the containing block with zero possible CSS transform, filter, or perspective interference from layout ancestors.

### 20.3 Lenis Virtual Scroll Real-Time Coordination Invariant
- **The Coordinate Normalization Protocol**:
  Smooth-scroll engines (such as Lenis) intercept and virtualize native scroll events. Direct reads of `window.scrollY` during scroll momentum or settling phases can report stale or desynchronized coordinates.
- **The Handler Invariant**:
  All viewport scroll listeners and threshold observers MUST normalize coordinates by checking Lenis event payloads before falling back to `window.scrollY`:
  ```javascript
  const handleScroll = (e) => {
    const currentScroll = typeof e?.scroll === 'number' ? e.scroll : window.scrollY;
    setIsBelowHero(currentScroll >= threshold);
  };
  ```

### 20.4 Permanent Animation & Transform Cleanup Protocol
- **Lifecycle Cleanup on Animation Completion**:
  Any page or container animation wrapper that applies CSS transforms during entry or exit transitions MUST strip those transform and animation styles as soon as the transition completes:
  ```jsx
  <main
    id="main-content"
    onAnimationEnd={() => setAnimating(false)}
    style={{
      animation: animating ? `cavdaxPageAscentIn ${duration}ms cubic-bezier(0.22, 1, 0.36, 1) both` : 'none',
      transform: animating ? undefined : 'none',
      willChange: animating ? 'opacity, transform' : 'auto'
    }}
  >
  ```
- **Invariant**: No persistent non-none `transform` may remain on top-level layout containers after entrance animation concludes.

### 20.5 Declarative Layout Primitives vs. Imperative RAF Measurement Trap
- **The Portal Measurement Timing Skew**:
  Imperative RAF measurement hooks (e.g. tracking indicator tabs via `useLayoutEffect` and `getBoundingClientRect`) race with deferred React Portal mount phases (`mounted === false` on initial frame). This causes active sliding pill indicators to fail to mount or compute `(0, 0)`, leaving active tab text unreadable or black-on-black without background pill substrates.
- **The Declarative Invariant**:
  For all sliding indicators, active state highlights, and animated tabs inside portals or floating docks, developers MUST use declarative layout animation primitives (such as Framer Motion's scoped `layoutId="active-pill"`) rather than imperative DOM measurement loops.



## 20.6 Suneet-Perfect-AI-Slop-Remover & Ruthless Mentor Controller Protocol
- **The Master Controller Directive**:
  Whenever building, refactoring, or reviewing any user interface across the CAVDAX ecosystem, the agent operates under the **Ruthless Mentor & Chief Design Officer** persona. It assumes every AI-generated screen contains subtle AI slop until proven innocent through forensic DOM inspection and automated Puppeteer visual audits.
- **The 14 Deadly AI Slop Patterns**:
  1. *Glowing Cyan/Purple Chrome*: Neon borders and saturated button gradients replaced with neutral hairlines (`border-white/10`) and quiet glass fills (`dark:bg-white/[0.03]`).
  2. *Emoji Clutter in UI Chrome*: Strictly zero emoji characters in headers, pills, or buttons; replaced with contextual monochromatic Lucide line SVGs (`strokeWidth={1.5}`).
  3. *Generic AI Shield SVGs in Toasts*: `ShieldCheck` and `ShieldAlert` banned from toasts and error boundaries in favor of semantically precise `CheckCircle2` and `AlertCircle` with `text-current` inheritance.
  4. *Saturated Navy Dark Mode*: Pure neutral obsidian (`#07090D` / `#090A0C`) replaces muddy navy/slate (`#0f172a`).
  5. *Lonely-Child Word Wraps*: Multi-line headers require `text-balance`; modal bios require `max-w-lg` container width and `whitespace-nowrap overflow-hidden text-ellipsis`.
  6. *In-Visual Floating Text & Badges*: Strictly zero typography or percentage chips inside 3D visuals; all metrics live outside on adjacent cards.
  7. *CSS Perspective Modal Trapping*: All modals, dialogs, and tooltips must escape CSS 3D transforms via React Portal (`createPortal(..., document.body)`) at `z-[99999]`.
  8. *Halfway-Halting Splines*: Long multi-tier pages use full-height SVG coordinate canvases (`viewBox="0 0 1200 2500"`) and container-relative scroll tracking (`offset: ['start start', 'end end']`).
  9. *Raw Text Underlines*: Replaced with bold font contrast, subtle text-shadow hover glows, and micro-arrow translations.
  10. *Generic Heart Cards*: Transformed into monochromatic dual-vector hearts with synchronized fluid liquid wave clip-paths.
  11. *Presumed Exhibition (Privacy Blindspot)*: Enforced 3-Tier recognition choice (Public, Anonymous, Private) before storing backer identity.
  12. *Supply Chain CLI Bloat*: Replaced heavy CLI frameworks with Node.js built-in 'util.parseArgs' for zero external dependencies.
  13. *Carnival Dashboard Overload*: Solitary elevation with exactly ONE primary metric per card and single accent color discipline.
  14. *Uncalibrated Spacing & Margin Drift*: Strictly enforced 4px scale (`4, 8, 12, 16, 20, 24, 32, 48, 64, 80, 96`).

## 20.7 Suneet-3D-Revolving-Image-Sphere Protocol (Tier Scaling & 1:1 Entity Mapping)
- **Zero-WebGL Crash-Proof Invariant**:
  Replaces fragile Three.js / Canvas3D contexts with pure CSS 3D transforms (`preserve-3d`, `perspective`, `translate3d`, `scale`) and depth-sorted painter's order (z-index) to prevent context loss across background tabs.
- **Strict 1:1 Human Entity Invariant (Anti-Clone Ban)**:
  Every real human contributor or backer is rendered strictly ONCE. Duplicating an individual's photo across 10-15 nodes to artificially inflate volume is strictly prohibited.
- **Tier-Scaled Node Diameters**:
  - *Tier 1 (Core Patron / Principal)*: 1.6x scale (64px), luminous obsidian ring, prominent orbit.
  - *Tier 2 (Supporter / 2 Cups)*: 1.15x scale (46px).
  - *Tier 3 (Micro / Cookie)*: 0.85x scale (34px).
  - *Celestial Constellation Waypoints*: When total backers N < 14, subtle 0.4x scale (16px) neutral slate nodes complete the Fibonacci spherical lattice without fabricating human identities.
- **Fibonacci Spiral Distribution**:
  Uniform node coordinates on a sphere generated via Golden Ratio angle spacing (theta = 2 * PI * i / phi).
- **Portal-Mounted Single-Line Lightbox**:
  Node inspection dialogs mount to `document.body` with a strict single-line text constraint (`max-w-lg whitespace-nowrap overflow-hidden text-ellipsis`).

## 20.8 Suneet-Hero-Page Immersion & Kinetic Lamp Protocol
- **F11 Full-Viewport Immersion Engine**:
  Hero landing viewports occupy exactly 100dvh (`min-h-[100dvh]`), framing wordmarks, spatial telemetry, and core CTAs in dynamic optical equilibrium without premature scrollbars or trapped modals.
- **Kinetic Pull-Cord Theme Lamp (Spring & Inverse Kinematics)**:
  Theme switching is physically manifested as an overhead industrial hanging lamp with a segmented beaded pull cord. Pointer drag induces tension modeled via a 3-point quadratic Bézier spline; release triggers spring kinematics (`stiffness: 350`, `damping: 22`) with haptic/audio click feedback toggling between obsidian dark mode (`#090A0C`) and ceramic light mode (`#FAFAFA`).
- **Non-Hijacking Snappy Viewport Transition**:
  Strictly zero `e.preventDefault()` scroll hijacking. Uses native CSS scroll snap (`scroll-snap-type: y mandatory`) allowing smooth, accelerated navigation.
- **Lightfall Monospace Matrix Mount Sequence**:
  On initial mount, cryptographic tokens cascade downward, resolving via an optical blur dispersion (`blur(16px) -> blur(0px)`) into the crisp geometric wordmark.

## 20.9 Dual-Cadence Telemetry Architecture & Ban on Generic AI Shield SVGs
- **Truth in Live Metrics**:
  Telemetry pills display empirically verified numbers directly from official endpoints (e.g., npm API). Never display rounded marketing exaggerations.
- **Dual-Cadence Tooltip Standard**:
  Wrap compact metric badges (e.g. `[ ⤓ 2,083/mo ]`) in a portal-mounted obsidian tooltip displaying both monthly and weekly cadences: `2,083/mo • 1,304 this week on npmjs ↗`.
- **Monospace Tooltip Case Preservation**:
  Tooltips rendering telemetry or URLs MUST use `normalCase={true}` to prevent CSS `uppercase` from corrupting lowercase metrics (`/mo`, `/wk`).
- **Total Eradication of Generic AI Shield SVGs**:
  Zero shield icons in toasts, banners, or action pills. Replace with contextual monochromatic indicators (`CheckCircle2` for success, `AlertCircle` for errors, `ArrowDownToLine` for downloads).

## 21. Simulated CI Verification Invariant (Anti-CI Drift Rule)
- **The Local vs. Remote CI Divergence Trap**:
  Code or tests that branch on `process.env.CI` or `process.env.GITHUB_ACTIONS` (e.g. headless bailouts, unreachable external services like FalkorDB, strict git check commands) create dangerous latent bugs when run only in a local developer environment where `CI` is undefined. The local test run reports 100% pass, but the remote CI pipeline fails closed.
- **The Internal Dual-Branch Test Invariant**:
  Any test asserting code that behaves conditionally based on `process.env.CI` or `process.env.GITHUB_ACTIONS` MUST execute and assert BOTH conditions (`CI=undefined` AND `CI='true'`) within the same test block using `try...finally` environment variable restoration. Never rely on the host machine's ambient environment for coverage.
- **Mandatory Simulated CI Pre-Commit Gate (`scripts/test-ci.mjs`)**:
  Before any commit or merge into `main`, the developer or AI agent MUST execute `node scripts/test-ci.mjs` (or `npm test`). This runner explicitly sets `CI=true` and `GITHUB_ACTIONS=true` in a subprocess, executing all server tests, MCP tests, and strict README audits.
- **Fail-Closed Pre-Commit Hook**:
  The `.githooks/pre-commit` script automatically executes `node scripts/test-ci.mjs`. If any test, security check, or architectural invariant fails under simulated CI conditions, the commit is aborted immediately.
