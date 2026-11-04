import React, { useState } from 'react';
import { X, Copy, Check, Terminal, ExternalLink, KeyRound, Lock } from 'lucide-react';
import { playClick } from '../utils/soundFx';
import { MCP_SERVER_DEFAULT_VERSION } from '../constants/version.js';

export default function McpConnectModal({ isOpen, onClose }) {
  const [copiedKey, setCopiedKey] = useState(null);
  const [activeClient, setActiveClient] = useState('claude'); // 'claude' | 'cursor' | 'claudecode'

  if (!isOpen) return null;

  const currentPath = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3001';

  const claudeDesktopConfig = JSON.stringify(
    {
      mcpServers: {
        cavdax: {
          command: "npx",
          args: ["-y", "cavdax", "mcp"],
          env: {
            FALKORDB_HOST: "localhost",
            FALKORDB_PORT: "6379"
          }
        }
      }
    },
    null,
    2
  );

  const cursorConfig = JSON.stringify(
    {
      mcpServers: {
        cavdax: {
          command: "npx",
          args: ["-y", "cavdax", "mcp"]
        }
      }
    },
    null,
    2
  );

  const claudeCodeCmd = `claude mcp add cavdax npx -y cavdax mcp`;

  const handleCopy = (key, text) => {
    playClick();
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  return (
    <div className="fixed inset-0 z-[99990] flex items-center justify-center p-4 bg-black/60 dark:bg-black/80 backdrop-blur-md select-none animate-in fade-in">
      <div className="w-full max-w-2xl bg-white dark:bg-[#0B0D11] border border-slate-300 dark:border-white/10 rounded-2xl shadow-2xl p-6 relative">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-200 dark:border-white/10 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 text-slate-900 dark:text-white">
              <Terminal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-950 dark:text-white font-mono">
                Connect Real AI Coding Agent via MCP
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                Model Context Protocol (MCP) Standard stdio &amp; HTTP Transport
              </p>
            </div>
          </div>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/10 text-slate-500 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Value Proposition Box */}
        <div className="mb-5 p-3.5 rounded-xl bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/10 text-xs text-slate-700 dark:text-slate-300 leading-relaxed font-mono">
          <div className="font-bold text-slate-950 dark:text-white mb-1 flex items-center gap-1.5">
            <KeyRound className="w-4 h-4 text-slate-900 dark:text-white" />
            How CAVDAX Operates As A Production Product:
          </div>
          <p className="text-slate-600 dark:text-slate-400 text-[11px]">
            Instead of giving autonomous coding agents direct shell or file access, plug CAVDAX into your IDE. All file modifications (`apply_code_change`) are enclosed behind our FalkorDB GraphBLAS gate. If an agent attempts to execute an action grounded in a superseded or stale ADR, the gate hard-rejects the write in &lt; 15ms.
          </p>
        </div>

        {/* Client Selector Tabs */}
        <div className="flex items-center gap-2 mb-4 border-b border-slate-200 dark:border-white/10 pb-2">
          <button
            onClick={() => {
              playClick();
              setActiveClient('claude');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              activeClient === 'claude'
                ? 'bg-slate-950 text-white dark:bg-white dark:text-black font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Claude Desktop
          </button>
          <button
            onClick={() => {
              playClick();
              setActiveClient('cursor');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              activeClient === 'cursor'
                ? 'bg-slate-950 text-white dark:bg-white dark:text-black font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Cursor IDE
          </button>
          <button
            onClick={() => {
              playClick();
              setActiveClient('claudecode');
            }}
            className={`px-3 py-1.5 rounded-lg text-xs font-mono transition-all ${
              activeClient === 'claudecode'
                ? 'bg-slate-950 text-white dark:bg-white dark:text-black font-bold'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-950 dark:hover:text-white'
            }`}
          >
            Claude Code CLI
          </button>
        </div>

        {/* Code Snippet Box */}
        <div className="relative mb-5">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-500 dark:text-slate-400 mb-1.5">
            <span>
              {activeClient === 'claude' && 'Path: ~/Library/Application Support/Claude/claude_desktop_config.json'}
              {activeClient === 'cursor' && 'Path: .cursor/mcp.json'}
              {activeClient === 'claudecode' && 'Terminal Command:'}
            </span>
            <button
              onClick={() => {
                const text =
                  activeClient === 'claude'
                    ? claudeDesktopConfig
                    : activeClient === 'cursor'
                    ? cursorConfig
                    : claudeCodeCmd;
                handleCopy(activeClient, text);
              }}
              className="flex items-center gap-1 text-slate-900 dark:text-white hover:text-slate-700 dark:hover:text-slate-300 font-bold transition-colors cursor-pointer"
            >
              {copiedKey === activeClient ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                  <span className="text-emerald-600 dark:text-emerald-400">Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" />
                  <span>Copy Config</span>
                </>
              )}
            </button>
          </div>

          <div className="p-3.5 rounded-xl bg-slate-100 dark:bg-[#060709] border border-slate-200 dark:border-white/10 font-mono text-xs text-slate-900 dark:text-slate-200 overflow-x-auto max-h-48">
            <pre>
              <code>
                {activeClient === 'claude' && claudeDesktopConfig}
                {activeClient === 'cursor' && cursorConfig}
                {activeClient === 'claudecode' && claudeCodeCmd}
              </code>
            </pre>
          </div>
        </div>

        {/* Available MCP Tools Spec */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px] font-mono uppercase font-bold text-slate-400">
            <span>Exposed MCP Tools (6 Registered Tools)</span>
            <span className="text-amber-400/90 lowercase text-[10px]">v{MCP_SERVER_DEFAULT_VERSION} spec</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 text-left">
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/10">
              <div className="font-mono text-xs font-bold text-amber-300 mb-0.5">check_intent_clearance</div>
              <div className="text-[10px] text-slate-400 leading-tight">Pre-flight architectural radar before token burn.</div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/10">
              <div className="font-mono text-xs font-bold text-white mb-0.5">apply_code_change</div>
              <div className="text-[10px] text-slate-400 leading-tight">Enclosed disk write with FalkorDB gate check.</div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/10">
              <div className="font-mono text-xs font-bold text-white mb-0.5">revalidate_decision</div>
              <div className="text-[10px] text-slate-400 leading-tight">Synthesizes decisions grounded in fresh ADRs.</div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/10">
              <div className="font-mono text-xs font-bold text-white mb-0.5">acquire_decision_lock</div>
              <div className="text-[10px] text-slate-400 leading-tight">Leases atomic lock for multi-agent concurrency.</div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/10">
              <div className="font-mono text-xs font-bold text-white mb-0.5">release_decision_lock</div>
              <div className="text-[10px] text-slate-400 leading-tight">Releases held lock upon task milestone completion.</div>
            </div>
            <div className="p-2 rounded-lg bg-white/[0.02] border border-white/10">
              <div className="font-mono text-xs font-bold text-white mb-0.5">query_causal_graph</div>
              <div className="text-[10px] text-slate-400 leading-tight">Cypher GraphBLAS inspection of active nodes.</div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-xs font-mono text-slate-500">
          <span>Stdio Daemon: <code className="text-slate-300">npx -y @cavdax/mcp-server</code></span>
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className="px-4 py-1.5 rounded-lg bg-white text-black font-bold hover:bg-slate-200 transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
