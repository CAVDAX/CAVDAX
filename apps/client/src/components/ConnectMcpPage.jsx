import React, { useState, useEffect, useRef, useLayoutEffect } from 'react';

import { motion } from 'framer-motion';
import ShimmerImage from './ui/ShimmerImage';

import { 

  Cable, 

  Terminal, 

  Check, 

  Copy, 

  ArrowRight, 

  ExternalLink, 

  KeyRound, 

  Cpu, 

  Workflow, 

  FileCode2, 

  Compass,

  GitBranch,

  Lock,

  Cloud,

  Package,

  FileCheck2,

  Eye,

  EyeOff,

  ArrowDownToLine

} from 'lucide-react';


import { playClick } from '../utils/soundFx';
import DevPatLoginModal from './DevPatLoginModal';
import Tooltip from './Tooltip.jsx';
import { MCP_SERVER_DEFAULT_VERSION } from '../constants/version.js';



// Container-Relative Slider Tracker Hook (Immune to scroll jumps, unmount morphs, and cross-screen Y-flying)
// Enhanced with Row-Aware Matrix-Speed Lightning Dissolve when switching between multi-row grid tracks
function usePillTracker(activeKey, extraDep = null) {
  const refs = useRef({});
  const prevYRef = useRef(null);
  const prevKeyRef = useRef(activeKey);
  const [position, setPosition] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    ready: false,
    isRowChange: false,
  });

  useLayoutEffect(() => {
    let rafId;
    const update = () => {
      const el = refs.current[activeKey];
      if (el) {
        const x = el.offsetLeft;
        const y = el.offsetTop;
        const width = el.offsetWidth;
        const height = el.offsetHeight;

        const isKeyChanged = prevKeyRef.current !== activeKey;
        const isRowChange = prevYRef.current !== null && isKeyChanged && Math.abs(prevYRef.current - y) > 6;

        setPosition((prev) => {
          if (
            prev.ready &&
            prev.x === x &&
            prev.y === y &&
            prev.width === width &&
            prev.height === height &&
            prev.isRowChange === isRowChange
          ) {
            return prev;
          }
          return { x, y, width, height, ready: true, isRowChange };
        });

        prevYRef.current = y;
        prevKeyRef.current = activeKey;
      }
    };

    update();
    rafId = requestAnimationFrame(update);
    window.addEventListener('resize', update);

    return () => {
      if (rafId) cancelAnimationFrame(rafId);
      window.removeEventListener('resize', update);
    };
  }, [activeKey, extraDep]);

  return { refs, position };
}



export default function ConnectMcpPage({ onLaunchConsole, user: propUser, onAuthChange }) {

  const [activeClient, setActiveClient] = useState('cursor');

  const [transportMode, setTransportMode] = useState('sse'); // 'sse' (Cloud) | 'stdio' (NPX Local)

  const [activeCliTab, setActiveCliTab] = useState('init'); // 'init' | 'mcp' | 'doctor' | 'ingest' | 'check' | 'gate'

  const [copiedKey, setCopiedKey] = useState(null);

  const [isGithubHovered, setIsGithubHovered] = useState(false);
  const [isDevPatHovered, setIsDevPatHovered] = useState(false);
  const [isDevPatModalOpen, setIsDevPatModalOpen] = useState(false);

  const [isTourOpen, setIsTourOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState('');
  const [isKeyLoading, setIsKeyLoading] = useState(false);
  const [isKeyRevealed, setIsKeyRevealed] = useState(false);
  const [mcpVersion, setMcpVersion] = useState(MCP_SERVER_DEFAULT_VERSION);
  const [npmDownloads, setNpmDownloads] = useState(() => {
    try {
      const cached = sessionStorage.getItem('cavdax_npm_mcp_downloads');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 12 * 60 * 60 * 1000 && parsed.count) {
          return parsed.count;
        }
      }
    } catch {}
    return 2083; // Verified live 30-day baseline
  });
  const [npmWeeklyDownloads, setNpmWeeklyDownloads] = useState(() => {
    try {
      const cached = sessionStorage.getItem('cavdax_npm_mcp_weekly');
      if (cached) {
        const parsed = JSON.parse(cached);
        if (Date.now() - parsed.ts < 12 * 60 * 60 * 1000 && parsed.count) {
          return parsed.count;
        }
      }
    } catch {}
    return 1304; // Verified live 7-day baseline
  });

  useEffect(() => {
    let isMounted = true;
    fetch('https://registry.npmjs.org/@cavdax/mcp-server/latest')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.version) {
          setMcpVersion(data.version);
        }
      })
      .catch(() => {});

    fetch('https://api.npmjs.org/downloads/point/last-month/@cavdax/mcp-server')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.downloads) {
          setNpmDownloads(data.downloads);
          try {
            sessionStorage.setItem('cavdax_npm_mcp_downloads', JSON.stringify({
              count: data.downloads,
              ts: Date.now()
            }));
          } catch {}
        }
      })
      .catch(() => {});

    fetch('https://api.npmjs.org/downloads/point/last-week/@cavdax/mcp-server')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (isMounted && data?.downloads) {
          setNpmWeeklyDownloads(data.downloads);
          try {
            sessionStorage.setItem('cavdax_npm_mcp_weekly', JSON.stringify({
              count: data.downloads,
              ts: Date.now()
            }));
          } catch {}
        }
      })
      .catch(() => {});
    return () => {
      isMounted = false;
    };
  }, []);



  // ── GitHub OAuth state ────────────────────────────────────────────────────

    // githubUser: null (not checked yet) | false (not authed) | { login, name, avatarUrl }
  const [githubUser, setGithubUser] = useState(() => {
    if (propUser !== undefined && propUser !== null) return propUser;
    try {
      const raw = localStorage.getItem('cavdax_user_session');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed?.username || parsed?.login) {
          return {
            login: parsed.username || parsed.login,
            name: parsed.name || parsed.username || parsed.login,
            avatarUrl: parsed.avatarUrl || parsed.avatar_url || parsed.avatar,
            role: parsed.role || 'user'
          };
        }
      }
    } catch {}
    return null;
  });

  const [oauthMsg, setOauthMsg] = useState(null);

  useEffect(() => {
    if (propUser !== undefined) {
      setGithubUser(propUser);
    }
  }, [propUser]);

  useEffect(() => {
    // Check ?connected=1 or ?oauth_error= from callback redirect
    const params = new URLSearchParams(window.location.search);
    if (params.get('connected') === '1') {
      const login = params.get('login');
      const name = params.get('name') || login;
      const avatarUrl = params.get('avatar') || '';
      const githubId = params.get('githubId') || '';

      if (login) {
        const userObj = { login, name, avatarUrl, githubId };
        setGithubUser(userObj);
        try {
          localStorage.setItem('cavdax_user_session', JSON.stringify({
            username: login,
            name,
            avatarUrl,
            githubId,
            connectedAt: new Date().toISOString()
          }));
        } catch {}
        window.dispatchEvent(new CustomEvent('cavdax:user-changed', { detail: userObj }));
        if (onAuthChange) onAuthChange(userObj);
      }

      setOauthMsg({ type: 'success', text: 'GitHub account connected successfully.' });
      setTimeout(() => setOauthMsg(null), 3500);
      window.history.replaceState({}, '', window.location.pathname);
    } else if (params.get('oauth_error')) {
      const errCode = params.get('oauth_error');
      setOauthMsg({ type: 'error', text: `GitHub OAuth failed: ${errCode}` });
      setTimeout(() => setOauthMsg(null), 3500);
      window.history.replaceState({}, '', window.location.pathname);
    }

    let isCancelled = false;

    // Fetch current session user
    fetch('/api/auth/me', { credentials: 'include' })
      .then(async (r) => {
        try {
          return await r.json();
        } catch {
          return { authenticated: false };
        }
      })
      .then((d) => {
        if (isCancelled) return;
        if (d?.authenticated && d?.user) {
          const u = {
            login: d.user.login,
            name: d.user.name || d.user.login,
            avatarUrl: d.user.avatarUrl || d.user.avatar_url || '',
            githubId: d.user.githubId
          };
          setGithubUser(u);
          try {
            localStorage.setItem('cavdax_user_session', JSON.stringify({
              username: u.login,
              name: u.name,
              avatarUrl: u.avatarUrl,
              githubId: u.githubId,
              connectedAt: new Date().toISOString()
            }));
          } catch {}
          window.dispatchEvent(new CustomEvent('cavdax:user-changed', { detail: u }));
          if (onAuthChange) onAuthChange(u);
        } else {
          // Server session is unauthenticated (e.g. after container restart).
          // Clear stale client credentials to prevent split-brain ghost session.
          try { localStorage.removeItem('cavdax_user_session'); } catch {}
          setGithubUser(false);
        }
      })
      .catch(() => {
        if (isCancelled) return;
        try {
          const raw = localStorage.getItem('cavdax_user_session');
          if (raw) return;
        } catch {}
        setGithubUser(false);
      });

    // Fallback: Never let "Checking..." hang for more than 2000ms if server/network is slow
    const fallbackTimer = setTimeout(() => {
      if (!isCancelled) {
        setGithubUser((prev) => (prev === null ? false : prev));
      }
    }, 2000);

    return () => {
      isCancelled = true;
      clearTimeout(fallbackTimer);
    };
  }, []);



  useEffect(() => {
    if (!githubUser || !githubUser.login) {
      setUserApiKey('');
      return;
    }
    let isMounted = true;
    setIsKeyLoading(true);
    fetch('/api/user/api-key', { credentials: 'include' })
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data.success && data.apiKey) {
          setUserApiKey(data.apiKey);
        }
      })
      .catch((err) => {
        console.warn('[CAVDAX] Could not fetch user API key for MCP setup:', err);
      })
      .finally(() => {
        if (isMounted) setIsKeyLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [githubUser]);

  const handleGithubConnect = () => {
    const isLocalhost = typeof window !== 'undefined' && (
      window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.hostname === '::1'
    );
    if (isLocalhost) {
      setIsDevPatModalOpen(true);
      return;
    }
    window.location.href = '/api/auth/github';
  };



  const handleGithubDisconnect = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      setGithubUser(false);
      try { localStorage.removeItem('cavdax_user_session'); } catch {}
      window.dispatchEvent(new CustomEvent('cavdax:user-changed', { detail: null }));
      if (onAuthChange) onAuthChange(null);
      setOauthMsg({ type: 'success', text: 'GitHub account disconnected.' });
      setTimeout(() => setOauthMsg(null), 3500);
    } catch {
      setOauthMsg({ type: 'error', text: 'Logout failed — please try again.' });
      setTimeout(() => setOauthMsg(null), 3500);
    }
  };



  // Dedicated container-relative slider trackers eliminating global Framer Motion layoutId projection flight

  const transportPill = usePillTracker(transportMode);

  const clientPill = usePillTracker(activeClient, transportMode);

  const cliTabPill = usePillTracker(activeCliTab);



  useEffect(() => {

    const handleToggle = () => setIsTourOpen(prev => !prev);

    window.addEventListener('cavdax:toggle-mcp-tour', handleToggle);

    return () => {

      window.removeEventListener('cavdax:toggle-mcp-tour', handleToggle);

    };

  }, []);



  // Matrix of configs: [transportMode][client]
  const effectiveKey = userApiKey || 'YOUR_CAVDAX_API_KEY';
  const maskedKey = userApiKey ? `${userApiKey.slice(0, 14)}••••••••••••••••${userApiKey.slice(-4)}` : 'YOUR_CAVDAX_API_KEY';
  const displayKey = isKeyRevealed ? effectiveKey : maskedKey;

  const clientConfigs = {
    sse: {
      cursor: {
        name: 'Cursor IDE',
        desc: 'AI-first code editor connecting over remote HTTP Server-Sent Events',
        file: '.cursor/mcp.json',
        snippet: JSON.stringify({
          mcpServers: {
            cavdax: {
              url: "https://cavdax.sahnirmaan.live/api/mcp/sse",
              headers: {
                Authorization: `Bearer ${effectiveKey}`
              }
            }
          }
        }, null, 2),
        displaySnippet: JSON.stringify({
          mcpServers: {
            cavdax: {
              url: "https://cavdax.sahnirmaan.live/api/mcp/sse",
              headers: {
                Authorization: `Bearer ${displayKey}`
              }
            }
          }
        }, null, 2),
        notes: 'Save in project root under .cursor/mcp.json or in Cursor Settings > MCP. Tool execution requests are authenticated via your CAVDAX Bearer API key.'
      },
      claudecode: {
        name: 'Claude Code CLI',
        desc: 'Anthropic official agentic coding tool for terminal environments',
        file: 'Terminal Command',
        snippet: `claude mcp add cavdax https://cavdax.sahnirmaan.live/api/mcp/sse --header "Authorization: Bearer ${effectiveKey}"`,
        displaySnippet: `claude mcp add cavdax https://cavdax.sahnirmaan.live/api/mcp/sse --header "Authorization: Bearer ${displayKey}"`,
        notes: 'Run directly inside your git repository root before launching claude. Passes your Bearer API key via HTTP headers.'
      },
      claude: {
        name: 'Claude Desktop',
        desc: 'Official Anthropic Claude desktop client for macOS and Windows',
        file: 'claude_desktop_config.json',
        snippet: JSON.stringify({
          mcpServers: {
            cavdax: {
              command: "npx",
              args: [
                "-y",
                "mcp-proxy",
                "https://cavdax.sahnirmaan.live/api/mcp/sse",
                "--header",
                `Authorization: Bearer ${effectiveKey}`
              ]
            }
          }
        }, null, 2),
        displaySnippet: JSON.stringify({
          mcpServers: {
            cavdax: {
              command: "npx",
              args: [
                "-y",
                "mcp-proxy",
                "https://cavdax.sahnirmaan.live/api/mcp/sse",
                "--header",
                `Authorization: Bearer ${displayKey}`
              ]
            }
          }
        }, null, 2),
        notes: 'Claude Desktop spawns stdio processes; mcp-proxy bridges to the live SSE stream with your Bearer API key. Or switch to the Local NPX (stdio) tab for zero-key local execution.'
      },
      windsurf: {
        name: 'Windsurf IDE',
        desc: 'Codeium Windsurf AI IDE with native remote MCP SSE support',
        file: '~/.codeium/windsurf/mcp_config.json',
        snippet: JSON.stringify({
          mcpServers: {
            cavdax: {
              serverUrl: "https://cavdax.sahnirmaan.live/api/mcp/sse",
              headers: {
                Authorization: `Bearer ${effectiveKey}`
              }
            }
          }
        }, null, 2),
        displaySnippet: JSON.stringify({
          mcpServers: {
            cavdax: {
              serverUrl: "https://cavdax.sahnirmaan.live/api/mcp/sse",
              headers: {
                Authorization: `Bearer ${displayKey}`
              }
            }
          }
        }, null, 2),
        notes: 'Compatible with Windsurf Cascade agent using MCP protocol version 2024-11-05. Authenticated via Bearer API key.'
      }
    },
    stdio: {
      cursor: {
        name: 'Cursor IDE',
        desc: 'Local stdio execution backed by published @cavdax/mcp-server package',
        file: '.cursor/mcp.json',
        snippet: JSON.stringify({
          mcpServers: {
            cavdax: {
              command: "npx",
              args: ["-y", "@cavdax/mcp-server"],
              env: {
                FALKORDB_HOST: "localhost",
                FALKORDB_PORT: "6379"
              }
            }
          }
        }, null, 2),
        notes: 'Connects to your local FalkorDB container on port 6379 with sub-millisecond GraphBLAS traversal. Zero API key required.'
      },
      claudecode: {
        name: 'Claude Code CLI',
        desc: 'Anthropic agentic CLI running local stdio MCP via NPX',
        file: 'Terminal Command',
        snippet: 'claude mcp add cavdax -- npx -y @cavdax/mcp-server',
        notes: 'Executes the official published @cavdax/mcp-server binary via npx directly in your terminal. Zero API key required.'
      },
      claude: {
        name: 'Claude Desktop',
        desc: 'Local stdio process spawned by Claude Desktop with FalkorDB environment',
        file: 'claude_desktop_config.json',
        snippet: JSON.stringify({
          mcpServers: {
            cavdax: {
              command: "npx",
              args: ["-y", "@cavdax/mcp-server"],
              env: {
                FALKORDB_HOST: "localhost",
                FALKORDB_PORT: "6379"
              }
            }
          }
        }, null, 2),
        notes: 'Launches local FalkorDB stdio driver. Zero API key required — execution runs directly on your local machine.'
      },
      windsurf: {
        name: 'Windsurf IDE',
        desc: 'Local stdio execution for Windsurf Cascade agent',
        file: '~/.codeium/windsurf/mcp_config.json',
        snippet: JSON.stringify({
          mcpServers: {
            cavdax: {
              command: "npx",
              args: ["-y", "@cavdax/mcp-server"]
            }
          }
        }, null, 2),
        notes: 'Spawns local stdio proxy intercepting all Cascade filesystem modifications. Zero API key required.'
      }
    }
  };

  const cliCommands = {

    init: {

      cmd: 'npx cavdax init',

      desc: 'Scaffolds docs/adr directory, baseline ADR-001, and Cursor/Claude MCP configuration in current repo.',

      flags: '--yes, -y'

    },

    mcp: {

      cmd: 'npx cavdax mcp',

      desc: 'Starts the Model Context Protocol stdio server for Claude Code and Cursor agents.',

      flags: '--host <host> --port <port>'

    },

    doctor: {

      cmd: 'npx cavdax doctor',

      desc: 'Runs full diagnostic suite testing FalkorDB GraphBLAS connectivity and causal DAG node health.',

      flags: '--host <host> --port <port>'

    },

    ingest: {

      cmd: 'npx cavdax ingest --type adr --repo .',

      desc: 'Parses local ADRs (docs/adr/), git commit history, and GitHub issues into the active causal graph.',

      flags: '-t [adr|commit|issue|all] -r <path>'

    },

    check: {

      cmd: 'npx cavdax check --staged',

      desc: 'CI/CD and pre-commit verification gate: validates staged files against active architecture decisions.',

      flags: '-s, --staged | --pr <number>'

    },

    gate: {

      cmd: 'npx cavdax gate --repo <org/repo> --sha <sha>',

      desc: 'CI/CD status check: validates PR commit diffs against active architecture decisions and invariants.',

      flags: '-r, --repo <name> | --sha <hex> | --strict'

    },

    impact: {

      cmd: 'npx cavdax impact <decision-id>',

      desc: 'Inspect downstream architectural impact and affected source files before refactoring.',

      flags: '-d, --decision <id> (alias: blast)'

    },

    decisions: {

      cmd: 'npx cavdax decisions',

      desc: 'Lists active governing architecture decisions, statuses, and file patterns in the repository.',

      flags: '-f, --filter [ALL|APPROVED|INVALIDATED]'

    }

  };



  const agentRulesSnippet = `# CAVDAX Architecture Verification Gate Guardrails

CRITICAL DIRECTIVE:
You are operating in an architecture-verified repository governed by the CAVDAX MCP Gate.
NEVER use native file-editing tools (e.g., Edit, Write, bash echo/sed) to bypass architectural checks.
All protected codebase modifications MUST be routed through the CAVDAX MCP verification gate.

EXECUTION WORKFLOW:
1. Architectural Discovery & Situational Awareness:
   - Call \`list_active_decisions\` to retrieve governing ADRs, decision statuses, and assigned file paths.
   - Call \`query_causal_graph\` to inspect the multi-tier dependency subgraph.

2. Blast Radius & Downstream Risk Analysis:
   - Call \`explain_blast_radius\` (or \`explain_architectural_impact\`) with \`node_id\` (e.g. DEC-102 or ADR-002) to verify all affected downstream decisions and governed files.

3. Multi-Agent Concurrency & Intent Clearance:
   - Call \`check_intent_clearance\` with \`decision_id\`, \`target_file\`, and your \`agent_id\` before generating code.
   - For multi-agent workflows, lease an exclusive lock via \`acquire_decision_lock\` (\`decision_id\`, \`agent_id\`) and release when finished via \`release_decision_lock\`.

4. Enclosed Execution Gate:
   - Apply modifications strictly through \`apply_code_change\`:
     Required parameters:
       • \`decision_id\`: Active Architecture Decision ID (e.g. "DEC-102")
       • \`file_path\`: Relative target file path (e.g. "src/auth.js")
       • \`code_payload\`: Full verified file content to write
     Optional: \`agent_id\` (for lock lease), \`reasoning\` (technical rationale)

5. Invalidation & Act IV Revalidation:
   - If CAVDAX returns BLOCKED_DECISION_INVALIDATED or BLOCKED_SUPERSEDED_SOURCE:
     a. Do NOT attempt direct filesystem overrides.
     b. Call \`revalidate_decision\` passing:
        \`new_source_id\` (e.g. "ADR-002"), \`old_decision_id\` ("DEC-102"), \`new_decision_id\` ("DEC-103"), \`new_fact_id\` ("F-OAuth2"), and \`title\`.
     c. Align code with the new architectural contract and re-request clearance.`;



  const handleCopy = (key, text) => {

    playClick();

    navigator.clipboard.writeText(text);

    setCopiedKey(key);

    setTimeout(() => setCopiedKey(null), 2000);

  };



  // Cohesive syntax highlighter calibrated to Obsidian Amber / Slate Porcelain theme

  const renderSyntaxCode = (code, type) => {

    if (type === 'claudecode') {

      const parts = code.split(' ');

      return (

        <span>

          {parts.map((p, idx) => {

            if (p === 'claude') return <span key={idx} className="text-amber-400 font-bold">{p} </span>;

            if (p === 'mcp' || p === 'add') return <span key={idx} className="text-slate-300 dark:text-slate-200">{p} </span>;

            if (p === 'cavdax') return <span key={idx} className="text-amber-300 font-semibold">{p} </span>;

            if (p === '--') return <span key={idx} className="text-slate-500">{p} </span>;

            if (p === 'npx' || p === '-y') return <span key={idx} className="text-slate-400 font-mono">{p} </span>;

            if (p.includes('http')) return <span key={idx} className="text-slate-200 underline decoration-slate-600 font-mono">{p} </span>;

            if (p.includes('@cavdax')) return <span key={idx} className="text-amber-300 font-mono font-semibold">{p} </span>;

            return <span key={idx} className="text-slate-400">{p} </span>;

          })}

        </span>

      );

    }



    // JSON syntax highlighting using theme-calibrated amber and slate tokens

    const lines = code.split('\n');

    return lines.map((line, idx) => {

      const keyValMatch = line.match(/^(\s*)(".*?"):\s*(.*)$/);

      if (keyValMatch) {

        const [, indent, key, val] = keyValMatch;

        return (

          <div key={idx}>

            <span>{indent}</span>

            <span className="text-amber-400 font-medium">{key}</span>

            <span className="text-slate-400">: </span>

            {val.startsWith('"') ? (

              <span className="text-slate-200">{val}</span>

            ) : val.startsWith('[') || val.startsWith('{') ? (

              <span className="text-slate-400">{val}</span>

            ) : (

              <span className="text-amber-300">{val}</span>

            )}

          </div>

        );

      }



      const arrStrMatch = line.match(/^(\s*)(".*?")(,?)$/);

      if (arrStrMatch) {

        const [, indent, str, comma] = arrStrMatch;

        return (

          <div key={idx}>

            <span>{indent}</span>

            <span className="text-slate-200">{str}</span>

            <span className="text-slate-500">{comma}</span>

          </div>

        );

      }



      return (

        <div key={idx} className="text-slate-400">

          {line}

        </div>

      );

    });

  };



  const activeConfig = clientConfigs[transportMode][activeClient];



  return (

    <div className="w-full flex flex-col bg-[var(--bg-main)] text-[var(--text-main)] transition-colors duration-200 select-none pb-24">

      {/* 1. Header Section */}

      <section id="mcp-header" className="pt-28 pb-8 px-6 max-w-5xl mx-auto w-full text-center">

        <div data-tour="mcp-overview" className="max-w-3xl mx-auto p-2">

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-slate-950 dark:text-white leading-[1.15] text-center mb-3">

            Enclosed MCP Agent Interceptor

          </h1>



          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-xl mx-auto leading-relaxed font-sans mb-4">

            Connect CAVDAX to your autonomous coding agent to intercept all filesystem writes behind a FalkorDB GraphBLAS causal barrier.

          </p>



          <div className="flex justify-center">

            <button

              onClick={() => {

                playClick();

                window.dispatchEvent(new CustomEvent('cavdax:open-tour', { detail: { mode: 'mcp' } }));

              }}

              className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-slate-100 hover:bg-slate-200 dark:bg-white/[0.04] dark:hover:bg-white/[0.08] border border-slate-300 dark:border-white/10 hover:border-slate-900/30 dark:hover:border-white/20 text-xs font-mono font-medium text-slate-700 hover:text-slate-950 dark:text-slate-300 dark:hover:text-white transition-all cursor-pointer shadow-xs group"

              title="Launch Interactive Tour Guide for MCP Gateway"

            >

              <Compass className="w-3.5 h-3.5 text-slate-800 dark:text-white group-hover:rotate-45 transition-transform duration-300" />

              <span>Interactive Guide</span>

            </button>

          </div>

        </div>

      </section>



      {/* 1b. Monochromatic Floating Toast for OAuth Connection State */}
      {oauthMsg && (
        <div
          role="status"
          className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-950 text-white dark:bg-white dark:text-slate-950 text-xs font-mono font-semibold shadow-2xl border border-slate-800 dark:border-white/20 transition-all duration-300 animate-in fade-in slide-in-from-bottom-3 pointer-events-none"
        >
          <Check className="w-3.5 h-3.5 text-current shrink-0" />
          <span>{oauthMsg.text}</span>
        </div>
      )}



      {/* 1c. GitHub Repository Connect Banner (Identical Sizing, Padding & Structure to MCP Server Card) */}

      <section className="px-6 max-w-5xl mx-auto w-full mb-4">

        <div className="neo-glass-card no-translate-hover p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div className="flex items-start sm:items-center gap-3.5">

            <div className="w-10 h-10 rounded-xl bg-slate-950 dark:bg-amber-500/[0.08] border border-slate-800 dark:border-amber-400/20 text-white flex items-center justify-center shrink-0 shadow-xs dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">

              <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" className="text-white dark:text-amber-400" aria-hidden="true">

                <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>

              </svg>

            </div>

            <div>

              <div className="flex items-center gap-2.5">

                <span className="font-mono text-sm sm:text-base font-bold text-slate-950 dark:text-white">

                  {githubUser ? `Connected as @${githubUser.login}` : 'Connect Your GitHub Repository'}

                </span>

              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-sans leading-relaxed text-pretty">

                {githubUser

                  ? 'Your GitHub account is linked. CAVDAX can now ingest ADRs and decision events from your repositories.'

                  : 'Authenticate with GitHub to enable live ADR ingestion, webhook events, and per-repo causal graphs.'}

              </p>

            </div>

          </div>



          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">

            {githubUser === null ? (

              // Still checking session — show nothing

              <span className="text-[10px] font-mono text-slate-600">Checking...</span>

            ) : githubUser ? (

              <>

                {githubUser.avatarUrl && (

                  <ShimmerImage

                    src={githubUser.avatarUrl}

                    alt={githubUser.login}

                    containerClassName="w-6 h-6 rounded-full border border-white/10 overflow-hidden"

                    className="w-full h-full object-cover"

                    fallbackText={githubUser.login?.charAt(0).toUpperCase()}

                    fallbackClassName="w-full h-full flex items-center justify-center font-mono text-[10px] text-white/70 select-none"

                  />

                )}

                <button

                  onClick={handleGithubDisconnect}

                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 border border-slate-300 dark:border-white/10 text-xs font-mono text-slate-700 dark:text-slate-300 transition-colors"

                >

                  Disconnect

                </button>

              </>

            ) : (

              <div className="flex items-center gap-2">

              <button

                onClick={handleGithubConnect}

                onMouseEnter={() => setIsGithubHovered(true)}
                onMouseLeave={() => setIsGithubHovered(false)}

                className={`relative overflow-hidden group h-[34px] flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-mono font-semibold shadow-xs cursor-pointer select-none transition-all duration-500 ${

                  isGithubHovered

                    ? 'border-slate-950 dark:border-white text-white dark:text-slate-950'

                    : 'bg-transparent border-slate-300 dark:border-white/20 hover:border-slate-950 dark:hover:border-white text-slate-900 dark:text-white'

                }`}

              >

                {/* 100% Gap-Free Graph & Nodes Fluid Water Fill Layer (Slower 1000ms graceful fill with rich causal DAG network wave crest) */}

                <div

                  aria-hidden="true"

                  style={{
                    transform: isGithubHovered ? 'translateY(0%)' : 'translateY(105%)',
                    opacity: isGithubHovered ? 1 : 0,
                    transition: isGithubHovered ? 'transform 1000ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out' : 'opacity 250ms ease-out, transform 0s 250ms'
                  }}
                  className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"

                >

                  {/* Graph & Nodes Wave Crest: surges left-to-right from bottom to top with interconnected vertices & DAG edges */}

                  <svg

                    viewBox="0 0 320 48"

                    preserveAspectRatio="none"

                    className="w-full h-6 shrink-0 text-slate-950 dark:text-white fill-current block"

                  >

                    <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />

                    {/* Graph vertex nodes riding the fluid wave crest */}

                    <circle cx="80" cy="20" r="4.5" />

                    <circle cx="120" cy="12" r="3.5" />

                    <circle cx="160" cy="15" r="5" />

                    <circle cx="200" cy="13" r="3.5" />

                    <circle cx="240" cy="22" r="4.5" />

                    {/* Directed graph edges interconnecting the crest nodes */}

                    <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />

                    <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />

                    <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />

                    <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />

                  </svg>

                  {/* Solid body completely floods 100% of the button with zero gaps */}

                  <div className="flex-1 w-full bg-slate-950 dark:bg-white" />

                </div>



                <svg

                  viewBox="0 0 24 24"

                  width="14"

                  height="14"

                  fill="currentColor"

                  aria-hidden="true"

                  className={`relative z-10 transition-colors duration-500 ease-out shrink-0 ${

                    isGithubHovered ? 'text-white dark:text-slate-950' : 'text-slate-900 dark:text-white'

                  }`}

                >

                  <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>

                </svg>

                <span className={`relative z-10 transition-colors duration-500 ease-out ${

                  isGithubHovered ? 'text-white dark:text-slate-950' : 'text-slate-900 dark:text-white'

                }`}>

                  Connect GitHub

                </span>

              </button>

              <button
                type="button"
                onClick={() => {
                  playClick();
                  setIsDevPatModalOpen(true);
                }}
                onMouseEnter={() => setIsDevPatHovered(true)}
                onMouseLeave={() => setIsDevPatHovered(false)}
                className={`relative overflow-hidden group h-[34px] flex items-center gap-2 px-3.5 py-1.5 rounded-lg border text-xs font-mono font-semibold shadow-xs cursor-pointer select-none transition-all duration-500 ${
                  isDevPatHovered
                    ? 'border-slate-950 dark:border-white text-white dark:text-slate-950'
                    : 'bg-transparent border-slate-300 dark:border-white/20 hover:border-slate-950 dark:hover:border-white text-slate-900 dark:text-white'
                }`}
                title="Authenticate via GitHub Personal Access Token (for local development)"
              >
                {/* 100% Gap-Free Graph & Nodes Fluid Water Fill Layer */}
                <div
                  aria-hidden="true"
                  style={{
                    transform: isDevPatHovered ? 'translateY(0%)' : 'translateY(105%)',
                    opacity: isDevPatHovered ? 1 : 0,
                    transition: isDevPatHovered
                      ? 'transform 1000ms cubic-bezier(0.2, 0.9, 0.3, 1), opacity 200ms ease-out'
                      : 'opacity 250ms ease-out, transform 0s 250ms'
                  }}
                  className="absolute left-[-15%] right-[-15%] bottom-0 h-[260%] flex flex-col pointer-events-none z-0"
                >
                  <svg
                    viewBox="0 0 320 48"
                    preserveAspectRatio="none"
                    className="w-full h-6 shrink-0 text-slate-950 dark:text-white fill-current block"
                  >
                    <path d="M 0 24 Q 40 8, 80 20 T 160 15 T 240 22 T 320 12 L 320 48 L 0 48 Z" />
                    <circle cx="80" cy="20" r="4.5" />
                    <circle cx="120" cy="12" r="3.5" />
                    <circle cx="160" cy="15" r="5" />
                    <circle cx="200" cy="13" r="3.5" />
                    <circle cx="240" cy="22" r="4.5" />
                    <line x1="80" y1="20" x2="120" y2="12" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="120" y1="12" x2="160" y2="15" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="160" y1="15" x2="200" y2="13" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                    <line x1="200" y1="13" x2="240" y2="22" stroke="currentColor" strokeWidth="1.5" strokeOpacity="0.85" />
                  </svg>
                  <div className="flex-1 w-full bg-slate-950 dark:bg-white" />
                </div>

                <KeyRound className={`w-3.5 h-3.5 relative z-10 transition-colors duration-500 ease-out shrink-0 ${
                  isDevPatHovered ? 'text-white dark:text-slate-950' : 'text-slate-800 dark:text-slate-200'
                }`} />
                <span className={`relative z-10 transition-colors duration-500 ease-out ${
                  isDevPatHovered ? 'text-white dark:text-slate-950' : 'text-slate-900 dark:text-white'
                }`}>
                  Dev PAT
                </span>
              </button>

              </div>

            )}

          </div>

        </div>

      </section>



      {/* 2. Official NPM Package Callout Banner */}

      <section className="px-6 max-w-5xl mx-auto w-full mb-8">

        <div className="neo-glass-card no-translate-hover p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4">

          <div className="flex items-start sm:items-center gap-3.5">

            <div className="w-10 h-10 rounded-xl bg-slate-950 dark:bg-amber-500/[0.08] border border-slate-800 dark:border-amber-400/20 text-white flex items-center justify-center shrink-0 shadow-xs dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]">

              <Package className="w-5 h-5 text-white dark:text-amber-400" />

            </div>

            <div>

              <div className="flex items-center gap-2 flex-wrap">

                <span className="font-mono text-sm sm:text-base font-bold text-slate-950 dark:text-white">

                  @cavdax/mcp-server

                </span>

                <span className="text-[11px] font-mono text-slate-500 dark:text-slate-400">

                  v{mcpVersion}

                </span>

                <span className="text-slate-300 dark:text-white/20 select-none">•</span>

                <Tooltip
                  content={
                    <span className="inline-flex items-center gap-1.5 font-mono text-[10px]">
                      <span className="text-white font-bold">{Number(npmDownloads).toLocaleString()}/mo</span>
                      <span className="opacity-40 text-slate-400">•</span>
                      <span className="text-slate-300 font-semibold">{Number(npmWeeklyDownloads).toLocaleString()} this week</span>
                      <span className="text-slate-400 font-normal">on npmjs ↗</span>
                    </span>
                  }
                  position="bottom"
                  normalCase
                >
                  <a

                  href="https://www.npmjs.com/package/@cavdax/mcp-server"

                  target="_blank"

                  rel="noopener noreferrer"

                  className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-100 hover:bg-slate-200/80 dark:bg-white/[0.06] dark:hover:bg-white/10 border border-slate-200/80 dark:border-white/10 text-[11px] font-mono text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white transition-all cursor-pointer"

                  >

                  <ArrowDownToLine className="w-3 h-3 text-slate-500 dark:text-slate-400" />

                  <span className="font-semibold text-slate-900 dark:text-white tabular-nums">

                    {npmDownloads ? `${Number(npmDownloads).toLocaleString()}/mo` : '2,083/mo'}

                  </span>

                </a>
                </Tooltip>

              </div>

              <p className="text-xs text-slate-600 dark:text-slate-400 mt-1 font-sans leading-relaxed text-pretty">

                Universal Model Context Protocol daemon and causal verification CLI published to npm registry.

              </p>

            </div>

          </div>



          <div className="flex items-center gap-2 self-start md:self-auto shrink-0">

            <div className="px-3 py-1.5 rounded-lg bg-slate-950 dark:bg-[#07090D] border border-slate-800 dark:border-white/10 dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] font-mono text-xs text-amber-300 flex items-center gap-2">

              <span>npx -y @cavdax/mcp-server</span>

              <button

                onClick={() => handleCopy('npm-quick', 'npx -y @cavdax/mcp-server')}

                className="text-slate-400 hover:text-white transition-colors cursor-pointer"

                title="Copy NPX execution command"

              >

                {copiedKey === 'npm-quick' ? <Check className="w-3.5 h-3.5 text-slate-200" /> : <Copy className="w-3.5 h-3.5" />}

              </button>

            </div>

            <a

              href="https://www.npmjs.com/package/@cavdax/mcp-server"

              target="_blank"

              rel="noopener noreferrer"

              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-white/5 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 hover:text-slate-950 dark:hover:text-amber-300 transition-all duration-200 cursor-pointer border border-slate-300 dark:border-white/10 dark:hover:border-amber-400/40"

              title="View package on npmjs.com"

            >

              <ExternalLink className="w-4 h-4" />

            </a>

          </div>

        </div>

      </section>



      {/* 3. Configuration & Snippets (Primary User Action) */}

      <section id="mcp-config" data-tour="mcp-clients" className="px-6 max-w-5xl mx-auto w-full mb-12">

        <div className="neo-glass-card p-6 sm:p-8">

          {/* Header Row: Title & Transport Mode Selector */}

          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">

            <div>

              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">

                <FileCode2 className="w-5 h-5 text-slate-900 dark:text-white" />

                <span>Client Configuration Guides</span>

              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">

                Select your transport protocol and coding agent platform to obtain the drop-in MCP config.

              </p>

            </div>



            {/* Transport Toggle: Container-Relative Horizontal Slider Tracking (Anti-Flying Standard) */}
            <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 relative self-start lg:self-auto">

              {transportPill.position.ready && (

                <motion.div

                  className="absolute top-0 left-0 rounded-lg bg-slate-950 dark:bg-white shadow-xs pointer-events-none"

                  initial={false}

                  animate={{

                    x: transportPill.position.x,

                    y: transportPill.position.y,

                    width: transportPill.position.width,

                    height: transportPill.position.height,

                  }}

                  transition={{ type: 'spring', stiffness: 420, damping: 34 }}

                />

              )}

              <button

                ref={el => { if (el) transportPill.refs.current['sse'] = el; }}

                onClick={() => {

                  playClick();

                  setTransportMode('sse');

                }}

                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors duration-200 flex items-center gap-1.5 select-none ${

                  transportMode === 'sse'

                    ? 'text-white dark:text-slate-950 font-bold z-10'

                    : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'

                }`}

              >

                <Cloud className="w-3.5 h-3.5 relative z-10" />

                <span className="relative z-10">Cloud SSE</span>

              </button>



              <button

                ref={el => { if (el) transportPill.refs.current['stdio'] = el; }}

                onClick={() => {

                  playClick();

                  setTransportMode('stdio');

                }}

                className={`relative px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors duration-200 flex items-center gap-1.5 select-none ${

                  transportMode === 'stdio'

                    ? 'text-white dark:text-slate-950 font-bold z-10'

                    : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'

                }`}

              >

                <Terminal className="w-3.5 h-3.5 relative z-10" />

                <span className="relative z-10">NPX Stdio</span>

              </button>

            </div>

          </div>



          {/* Client Tabs Bar with Container-Relative Slider Tracking (Anti-Flying Standard) */}

          <div className="mb-4">

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 w-full relative">

              {clientPill.position.ready && (
                <motion.div
                  className="absolute top-0 left-0 rounded-lg bg-slate-950 dark:bg-white shadow-xs pointer-events-none"
                  initial={false}
                  animate={{
                    x: clientPill.position.x,
                    y: clientPill.position.y,
                    width: clientPill.position.width,
                    height: clientPill.position.height,
                    opacity: clientPill.position.isRowChange ? [0, 1] : 1,
                    scale: clientPill.position.isRowChange ? [0.92, 1] : 1,
                  }}
                  transition={
                    clientPill.position.isRowChange
                      ? {
                          x: { duration: 0 },
                          y: { duration: 0 },
                          width: { duration: 0 },
                          height: { duration: 0 },
                          opacity: { duration: 0.14, ease: 'easeOut' },
                          scale: { duration: 0.14, ease: 'easeOut' },
                        }
                      : { type: 'spring', stiffness: 420, damping: 34 }
                  }
                />
              )}

              {Object.keys(clientConfigs[transportMode]).map((key) => {

                const isSelected = activeClient === key;

                return (

                  <button

                    key={key}

                    ref={el => { if (el) clientPill.refs.current[key] = el; }}

                    onClick={() => {

                      playClick();

                      setActiveClient(key);

                    }}

                    className={`relative px-3 sm:px-3.5 py-1.5 rounded-lg text-xs font-mono transition-colors duration-200 tactile-btn text-center whitespace-normal sm:whitespace-nowrap flex items-center justify-center select-none ${

                      isSelected

                        ? 'text-white dark:text-slate-950 font-bold z-10'

                        : 'text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'

                    }`}

                  >

                    <span className="relative z-10">{clientConfigs[transportMode][key].name}</span>

                  </button>

                );

              })}

            </div>

          </div>



          {/* Active Config Details with Bespoke Obsidian Code Window */}

          <div className="mb-2">

            <div className="rounded-xl overflow-hidden border border-slate-300 dark:border-white/10 bg-slate-950 dark:bg-[#07090D] shadow-md dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] transition-all">

              {/* Window Header */}

              <div className="flex items-center justify-between px-4 py-2.5 bg-slate-900/90 dark:bg-white/[0.03] border-b border-slate-800 dark:border-white/5 text-[11px] font-mono">

                <div className="flex items-center gap-2.5">

                  <div className="flex items-center gap-1.5 opacity-70">

                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />

                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />

                    <span className="w-2.5 h-2.5 rounded-full bg-slate-600 inline-block" />

                  </div>

                  <span className="ml-1 text-slate-400 font-medium">

                    {activeConfig.file}

                  </span>

                </div>

                <div className="flex items-center gap-3 sm:gap-3.5">
                  {transportMode === 'sse' && (
                    <a
                      href={githubUser ? "/profile" : "/api/auth/github?returnTo=/connect-mcp"}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs"
                      title={githubUser ? "View or copy your CAVDAX API Key in Profile" : "Connect GitHub to generate your CAVDAX API Key"}
                    >
                      <KeyRound className="w-3.5 h-3.5 text-slate-400" />
                      <span>Get Your CAVDAX API Key</span>
                    </a>
                  )}

                  {transportMode === 'sse' && userApiKey && (
                    <button
                      type="button"
                      onClick={() => {
                        playClick();
                        setIsKeyRevealed(!isKeyRevealed);
                      }}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                      title={isKeyRevealed ? "Mask API key in snippet" : "Reveal API key in snippet"}
                    >
                      {isKeyRevealed ? (
                        <>
                          <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                          <span>Hide</span>
                        </>
                      ) : (
                        <>
                          <Eye className="w-3.5 h-3.5 text-slate-400" />
                          <span>Reveal</span>
                        </>
                      )}
                    </button>
                  )}

                  {transportMode === 'sse' && (
                    <div className="h-3.5 w-px bg-slate-400/40 dark:bg-white/20 shrink-0" aria-hidden="true" />
                  )}

                  <button
                    onClick={() => handleCopy(activeClient + transportMode, activeConfig.snippet)}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-[11px] font-mono text-slate-300 hover:text-white transition-all cursor-pointer shadow-xs active:scale-[0.98]"
                    title="Copy configuration snippet to clipboard"
                  >
                    {copiedKey === activeClient + transportMode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-slate-200" />
                        <span className="text-slate-200 font-semibold">Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-slate-400" />
                        <span>Copy Config</span>
                      </>
                    )}
                  </button>
                </div>

              </div>



              {/* Code Pre Container */}

              <pre className="p-4 text-xs font-mono overflow-x-auto leading-relaxed custom-scrollbar selection:bg-white/20">

                <code>{renderSyntaxCode(activeConfig.displaySnippet || activeConfig.snippet, activeClient)}</code>

              </pre>

            </div>



            <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400 mt-2.5">

              {activeConfig.notes}

            </p>

          </div>

        </div>

      </section>



      {/* 4. Universal CLI Command Suite Bento with Container-Relative Slider Tracking */}

      <section id="mcp-cli-suite" data-tour="mcp-cli" className="px-6 max-w-5xl mx-auto w-full mb-12">

        <div className="neo-glass-card p-6 sm:p-8">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-200 dark:border-white/10">
            <div>
              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">
                <Terminal className="w-5 h-5 text-slate-900 dark:text-white" />
                <span>Universal CAVDAX CLI Suite</span>
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Execute directly via <code className="font-mono text-slate-900 dark:text-white font-semibold">npx cavdax &lt;command&gt;</code> without manual installation.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1 p-1 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 self-start sm:self-auto relative">
              {cliTabPill.position.ready && (
                <motion.div
                  className="absolute top-0 left-0 rounded-lg bg-slate-950 dark:bg-white shadow-xs pointer-events-none"
                  initial={false}
                  animate={{
                    x: cliTabPill.position.x,
                    y: cliTabPill.position.y,
                    width: cliTabPill.position.width,
                    height: cliTabPill.position.height,
                    opacity: cliTabPill.position.isRowChange ? [0, 1] : 1,
                    scale: cliTabPill.position.isRowChange ? [0.92, 1] : 1,
                  }}
                  transition={
                    cliTabPill.position.isRowChange
                      ? {
                          x: { duration: 0 },
                          y: { duration: 0 },
                          width: { duration: 0 },
                          height: { duration: 0 },
                          opacity: { duration: 0.14, ease: 'easeOut' },
                          scale: { duration: 0.14, ease: 'easeOut' },
                        }
                      : { type: 'spring', stiffness: 420, damping: 34 }
                  }
                />
              )}
              {Object.keys(cliCommands).map((tab) => {
                const isSelected = activeCliTab === tab;
                return (
                  <button
                    key={tab}
                    ref={el => { if (el) cliTabPill.refs.current[tab] = el; }}
                    onClick={() => {
                      playClick();
                      setActiveCliTab(tab);
                    }}
                    className={`relative px-3 py-1.5 rounded-lg text-xs font-mono uppercase font-bold transition-colors duration-200 select-none text-center ${
                      isSelected
                        ? 'text-white dark:text-slate-950 z-10'
                        : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
                    }`}
                  >
                    <span className="relative z-10">{tab}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950 dark:bg-[#07090D] border border-slate-800 dark:border-white/10 font-mono text-xs text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">

            <div className="flex items-center gap-2">

              <span className="text-slate-500">$</span>

              <span className="text-amber-300 font-bold">{cliCommands[activeCliTab].cmd}</span>

            </div>

            <button

              onClick={() => handleCopy(`cli-${activeCliTab}`, cliCommands[activeCliTab].cmd)}

              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer self-start sm:self-auto"

            >

              {copiedKey === `cli-${activeCliTab}` ? (

                <>

                  <Check className="w-3.5 h-3.5 text-slate-200" />

                  <span className="text-slate-200">Copied</span>

                </>

              ) : (

                <>

                  <Copy className="w-3.5 h-3.5" />

                  <span>Copy</span>

                </>

              )}

            </button>

          </div>



          <div className="mt-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs font-sans text-slate-600 dark:text-slate-400">

            <span>{cliCommands[activeCliTab].desc}</span>

            <span className="font-mono text-[11px] text-slate-500 shrink-0">Flags: {cliCommands[activeCliTab].flags}</span>

          </div>

        </div>

      </section>



      {/* 5. Agent Guardrails Rules File (.cursorrules / CLAUDE.md) */}

      <section id="mcp-guardrails" data-tour="mcp-guardrails" className="px-6 max-w-5xl mx-auto w-full mb-12">

        <div className="neo-glass-card p-6 sm:p-8">

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-slate-200 dark:border-white/10">

            <div>

              <h2 className="text-lg font-bold text-slate-950 dark:text-white flex items-center gap-2">

                <FileCheck2 className="w-5 h-5 text-slate-900 dark:text-white" />

                <span>Agent Guardrails Instruction (.cursorrules / CLAUDE.md)</span>

              </h2>

              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">

                Add this directive to your repository root so Claude and Cursor agents automatically route writes through CAVDAX.

              </p>

            </div>



            <button

              onClick={() => handleCopy('rules-file', agentRulesSnippet)}

              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-950 dark:bg-white text-white dark:text-slate-950 font-mono text-xs font-bold hover:opacity-90 transition-opacity cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"

            >

              {copiedKey === 'rules-file' ? (

                <>

                  <Check className="w-3.5 h-3.5 text-slate-200" />

                  <span>Copied Instructions</span>

                </>

              ) : (

                <>

                  <Copy className="w-3.5 h-3.5" />

                  <span>Copy Directives</span>

                </>

              )}

            </button>

          </div>



          <div className="rounded-xl overflow-hidden border border-slate-300 dark:border-white/10 bg-slate-950 dark:bg-[#07090D] p-4 font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed custom-scrollbar selection:bg-amber-500/30">

            {agentRulesSnippet}

          </div>

        </div>

      </section>



      {/* 6. Architecture & How It Operates */}

      <section id="mcp-architecture" data-tour="mcp-workflow" className="px-6 max-w-5xl mx-auto w-full mb-12">

        <div className="mb-6">

          <div className="flex items-center gap-2.5 mb-2">

            <div className="w-8 h-8 rounded-lg bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 flex items-center justify-center shrink-0">

              <Workflow className="w-4 h-4 text-slate-950 dark:text-white" />

            </div>

            <h2 className="text-xl sm:text-2xl font-bold text-slate-950 dark:text-white tracking-tight">

              How The Enclosed Interception Loop Operates

            </h2>

          </div>

          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl leading-relaxed font-sans">
            <span className="block text-slate-700 dark:text-slate-300 font-medium">
              Standard agents write unverified code directly to disk.
            </span>
            <span className="block text-slate-500 dark:text-slate-400">
              CAVDAX routes all tool executions through an enclosed stdio proxy or Cloud SSE gate.
            </span>
          </p>

        </div>



        {/* 3 Symmetrical Bento Glass Cards */}

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">

          {/* Step 1: Intercept */}

          <div className="neo-glass-card p-6 sm:p-7 flex flex-col justify-between group hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">

            <div 

              aria-hidden="true" 

              className="absolute top-0 right-0 w-24 h-24 bg-slate-950/5 dark:bg-white/5 rounded-bl-full pointer-events-none"

            />



            <div>

              <div className="flex items-center justify-between gap-3 mb-4">
                <Terminal className="w-5 h-5 text-slate-950 dark:text-white shrink-0 stroke-[1.75]" />
                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-mono text-[10px] font-bold tracking-wider text-slate-600 dark:text-slate-400 uppercase">
                  01 · Intercept
                </span>
              </div>



              <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tracking-tight mb-2">

                Tool Call Capture

              </h3>



              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-sans leading-relaxed mb-4 [text-wrap:balance]">
                Intercepts <code className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-white/10 text-slate-900 dark:text-slate-200 font-mono text-[11px]">apply_code_change</code> over stdio or SSE before any file write reaches disk.
              </p>



              <div className="p-2.5 rounded-lg bg-slate-100/70 dark:bg-black/30 border border-slate-200 dark:border-white/5 font-mono text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">

                <span className="text-slate-400">Target</span>

                <span className="font-semibold text-slate-900 dark:text-white">stdio proxy / Cloud SSE</span>

              </div>

            </div>



            <div className="mt-5 pt-3.5 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">

              <span>Action: In-Flight</span>

              <span className="text-slate-800 dark:text-slate-200 font-bold">Zero Delay</span>

            </div>

          </div>



          {/* Step 2: Causal Provenance Check */}

          <div className="neo-glass-card p-6 sm:p-7 flex flex-col justify-between group hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">

            <div 

              aria-hidden="true" 

              className="absolute top-0 right-0 w-24 h-24 bg-slate-950/5 dark:bg-white/5 rounded-bl-full pointer-events-none"

            />



            <div>

              <div className="flex items-center justify-between gap-3 mb-4">
                <GitBranch className="w-5 h-5 text-slate-950 dark:text-white shrink-0 stroke-[1.75]" />
                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-mono text-[10px] font-bold tracking-wider text-slate-600 dark:text-slate-400 uppercase">
                  02 · GraphBLAS BFS
                </span>
              </div>



              <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tracking-tight mb-2">

                Causal Provenance Check

              </h3>



              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-sans leading-relaxed mb-4 [text-wrap:balance]">
                GraphBLAS BFS traverses active ADRs in RAM to verify every grounding decision.
              </p>



              <div className="p-2.5 rounded-lg bg-slate-100/70 dark:bg-black/30 border border-slate-200 dark:border-white/5 font-mono text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">

                <span className="text-slate-400">Traversal</span>

                <span className="font-semibold text-slate-900 dark:text-white">[:SUPERSEDES] BFS</span>

              </div>

            </div>



            <div className="mt-5 pt-3.5 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">

              <span>Engine: FalkorDB RAM</span>

              <span className="text-slate-800 dark:text-slate-200 font-bold">&lt; 15ms</span>

            </div>

          </div>



          {/* Step 3: Deterministic Gate */}

          <div className="neo-glass-card p-6 sm:p-7 flex flex-col justify-between group hover:-translate-y-0.5 transition-all duration-300 relative overflow-hidden">

            <div 

              aria-hidden="true" 

              className="absolute top-0 right-0 w-24 h-24 bg-slate-950/5 dark:bg-white/5 rounded-bl-full pointer-events-none"

            />



            <div>

              <div className="flex items-center justify-between gap-3 mb-4">
                <Lock className="w-5 h-5 text-slate-950 dark:text-white shrink-0 stroke-[1.75]" />
                <span className="px-2.5 py-1 rounded-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 font-mono text-[10px] font-bold tracking-wider text-slate-600 dark:text-slate-400 uppercase">
                  03 · Execution Gate
                </span>
              </div>



              <h3 className="text-base sm:text-lg font-bold text-slate-950 dark:text-white tracking-tight mb-2">

                Commit or Hard Reject

              </h3>



              <p className="text-xs sm:text-[13px] text-slate-600 dark:text-slate-400 font-sans leading-relaxed mb-4 [text-wrap:balance]">
                Valid decisions commit; superseded logic triggers an immediate 403 block.
              </p>



              <div className="p-2.5 rounded-lg bg-slate-100/70 dark:bg-black/30 border border-slate-200 dark:border-white/5 font-mono text-[11px] text-slate-700 dark:text-slate-300 flex items-center justify-between">

                <span className="text-slate-400">Verdict</span>

                <span className="font-semibold text-slate-900 dark:text-white">200 OK / 403 Reject</span>

              </div>

            </div>



            <div className="mt-5 pt-3.5 border-t border-slate-200 dark:border-white/5 flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400">

              <span>Guarantee: Strict</span>

              <span className="text-slate-800 dark:text-slate-200 font-bold">Zero Silent Rot</span>

            </div>

          </div>

        </div>

      </section>



      {/* 7. metrics row */}

      <section id="mcp-metrics" className="px-6 max-w-5xl mx-auto w-full mb-14">

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-5xl mx-auto text-left font-mono">

          <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-slate-900/40 dark:hover:border-amber-400/40 transition-all duration-300">

            <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Transport</span>

            <span className="text-xs font-bold text-slate-900 dark:text-white">stdio / HTTP SSE</span>

          </div>

          <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-slate-900/40 dark:hover:border-amber-400/40 transition-all duration-300">

            <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Inspection Latency</span>

            <span className="text-xs font-bold text-slate-900 dark:text-white">&lt; 15ms GraphBLAS</span>

          </div>

          <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-slate-900/40 dark:hover:border-amber-400/40 transition-all duration-300">

            <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Protocol Spec</span>

            <span className="text-xs font-bold text-slate-900 dark:text-white">MCP 2024-11-05</span>

          </div>

          <div className="p-3.5 rounded-xl bg-slate-100/80 dark:bg-white/[0.04] border border-slate-200 dark:border-white/10 hover:border-slate-900/40 dark:hover:border-amber-400/40 transition-all duration-300">

            <span className="text-[10px] text-slate-500 uppercase block mb-0.5">Package Registry</span>

            <span className="text-xs font-bold text-slate-900 dark:text-white">npmjs.com/@cavdax</span>

          </div>

        </div>

      </section>



      {/* 8. Navigation Footer CTA */}

      <section className="px-6 max-w-5xl mx-auto w-full text-center">

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4">

          <button

            onClick={() => {

              playClick();

              if (onLaunchConsole) onLaunchConsole();

            }}

            className="btn-primary group tactile-btn"

          >

            <span>Open Verification Console</span>

            <ArrowRight className="w-4 h-4 transition-transform duration-150 group-hover:translate-x-0.5" />

          </button>

        </div>

      </section>

      <DevPatLoginModal
        isOpen={isDevPatModalOpen}
        onClose={() => setIsDevPatModalOpen(false)}
        onSuccess={() => {
          fetch('/api/auth/me', { credentials: 'include' })
            .then(r => r.json())
            .then(d => {
              if (d?.authenticated && d?.user) {
                setGithubUser(d.user);
              }
            })
            .catch(() => {});
        }}
      />
    </div>

  );

}

