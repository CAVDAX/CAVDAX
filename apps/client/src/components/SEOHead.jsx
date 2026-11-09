import { useEffect } from 'react';

const SEO_MAP = {
  landing: {
    title: 'CAVDAX | Graph-Grounded Decision Execution for Coding Agents',
    description: 'Prevent autonomous coding agents from hallucinating or executing on stale architectural decisions via FalkorDB causal DAGs and enclosed MCP gates.',
    path: '/'
  },
  console: {
    title: 'CAVDAX | Real-Time Execution Console & GraphBLAS Observability',
    description: 'Monitor live causal DAG state, sub-millisecond matrix invalidations, and enclosed MCP tool call verification in real time.',
    path: '/console'
  },
  mcp: {
    title: 'CAVDAX | Enclosed Model Context Protocol (MCP) Gate & Integration',
    description: 'Connect Cursor, Claude Code, and autonomous coding agents to the CAVDAX MCP server over stdio or SSE. Hard-gate writes against stale ADRs.',
    path: '/mcp'
  },
  project: {
    title: 'CAVDAX | Interactive Causal Protocol Walkthrough & Architectural Proof',
    description: 'Step through Act I to Act IV: from ADR ingestion and cascading invalidation to agent interception and deterministic self-healing.',
    path: '/walkthrough'
  },
  team: {
    title: 'CAVDAX | Founding Engineering Team & Architectural Foundations',
    description: 'The engineers, researchers, and systems architects building graph-grounded causal safety for autonomous coding agents.',
    path: '/team'
  },
  audit: {
    title: 'CAVDAX | Agent Action History & Compliance Ledger',
    description: 'Cryptographically ordered audit trail of every agent file modification, grounding ADR decision, and verification latency record.',
    path: '/audit'
  },
  profile: {
    title: 'CAVDAX | Developer Pricing, Currency Switcher & Account Tiers',
    description: 'Explore Free, Pro ($4 USD / ₹320 INR), and Team & Scale developer tiers with 7-day free trial and multi-tenant FalkorDB access.',
    path: '/profile'
  },
  support: {
    title: 'CAVDAX | Open-Source Sponsorship & Community Backing',
    description: 'Support the development of open-source causal DAG governance for AI software engineering agents.',
    path: '/support'
  },
  '404': {
    title: '404 Causal Node Not Found | CAVDAX',
    description: 'The requested causal decision node or route does not exist in the CAVDAX DAG.',
    path: '/404'
  }
};

export default function SEOHead({ activeTab }) {
  useEffect(() => {
    const meta = SEO_MAP[activeTab] || SEO_MAP.landing;
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://cavdax.sahnirmaan.live';
    const canonicalUrl = `${origin}${meta.path}`;

    // 1. Update Title
    document.title = meta.title;

    // 2. Helper to set meta attribute
    const setMeta = (selector, attr, value) => {
      let el = document.querySelector(selector);
      if (!el) {
        el = document.createElement('meta');
        const [k, v] = selector.replace(/[\[\]"]/g, '').split('=');
        el.setAttribute(k, v);
        document.head.appendChild(el);
      }
      el.setAttribute(attr, value);
    };

    // 3. Update Standard Meta
    setMeta('meta[name="description"]', 'content', meta.description);

    // 4. Update OpenGraph Tags
    setMeta('meta[property="og:title"]', 'content', meta.title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);

    // 5. Update Twitter Tags
    setMeta('meta[name="twitter:title"]', 'content', meta.title);
    setMeta('meta[name="twitter:description"]', 'content', meta.description);

    // 6. Update Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // 7. Dynamic Breadcrumb Schema
    let breadcrumbScript = document.getElementById('cavdax-dynamic-breadcrumb');
    if (!breadcrumbScript) {
      breadcrumbScript = document.createElement('script');
      breadcrumbScript.id = 'cavdax-dynamic-breadcrumb';
      breadcrumbScript.type = 'application/ld+json';
      document.head.appendChild(breadcrumbScript);
    }

    const breadcrumbs = [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Home',
        item: `${origin}/`
      }
    ];

    if (activeTab !== 'landing') {
      breadcrumbs.push({
        '@type': 'ListItem',
        position: 2,
        name: meta.title.replace('CAVDAX | ', '').split('&')[0].trim(),
        item: canonicalUrl
      });
    }

    breadcrumbScript.textContent = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: breadcrumbs
    });

  }, [activeTab]);

  return null;
}
