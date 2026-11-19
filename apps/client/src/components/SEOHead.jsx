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
    description: 'Explore Free, Pro ($4 USD / ₹299 INR), and Team & Scale ($35 USD / ₹2,999 INR) developer tiers with 7-day free trial and multi-tenant FalkorDB access.',
    path: '/profile'
  },
  benefits: {
    title: 'CAVDAX | Architectural Governance & Tier Capabilities Matrix',
    description: 'Detailed feature matrix comparing Community, Pro Autonomous, and Team & Scale tiers: GraphBLAS invalidations, multi-agent mutex locks, and CI/CD blocking gates.',
    path: '/tier-benefits'
  },
  support: {
    title: 'CAVDAX | Open-Source Sponsorship & Community Backing',
    description: 'Support the development of open-source causal DAG governance for AI software engineering agents.',
    path: '/support'
  },
  sponsors: {
    title: 'CAVDAX | 3D Community Backer Galaxy & Contributor Sphere',
    description: 'Explore verified community patrons, backer tiers, and the interactive 3D Fibonacci contributor galaxy powering CAVDAX development.',
    path: '/sponsors'
  },
  video: {
    title: 'CAVDAX | Interactive Video Showcase & Architectural Walkthrough',
    description: 'Watch the end-to-end architectural walkthrough of CAVDAX causal graph gates, agent interception, and FalkorDB GraphBLAS invalidations.',
    path: '/video'
  },
  devteam: {
    title: 'Dev Core Security Intercept | CAVDAX',
    description: 'Restricted administrative gateway. Unauthorized access is strictly logged.',
    path: '/devteam',
    noindex: true
  },
  dev: {
    title: 'Dev Console & Telemetry Hub | CAVDAX',
    description: 'Internal developer diagnostics and telemetry.',
    path: '/dev',
    noindex: true
  },
  '404': {
    title: '404 Causal Node Not Found | CAVDAX',
    description: 'The requested causal decision node or route does not exist in the CAVDAX DAG.',
    path: '/404',
    noindex: true
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

    // 3. Strict Robots Indexing & Cloaking Gate
    if (meta.noindex) {
      setMeta('meta[name="robots"]', 'content', 'noindex, nofollow, noarchive, nosnippet');
    } else {
      setMeta('meta[name="robots"]', 'content', 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1');
    }

    // 4. Update Standard Meta
    setMeta('meta[name="description"]', 'content', meta.description);

    // 5. Update OpenGraph Tags
    setMeta('meta[property="og:title"]', 'content', meta.title);
    setMeta('meta[property="og:description"]', 'content', meta.description);
    setMeta('meta[property="og:url"]', 'content', canonicalUrl);

    // 6. Update Twitter Tags
    setMeta('meta[name="twitter:title"]', 'content', meta.title);
    setMeta('meta[name="twitter:description"]', 'content', meta.description);

    // 7. Update Canonical Link
    let canonical = document.querySelector('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', canonicalUrl);

    // 8. Dynamic Breadcrumb Schema (Skip on internal/cloaked routes)
    let breadcrumbScript = document.getElementById('cavdax-dynamic-breadcrumb');
    if (!breadcrumbScript) {
      breadcrumbScript = document.createElement('script');
      breadcrumbScript.id = 'cavdax-dynamic-breadcrumb';
      breadcrumbScript.type = 'application/ld+json';
      document.head.appendChild(breadcrumbScript);
    }

    if (meta.noindex) {
      breadcrumbScript.textContent = '';
    } else {
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
    }

  }, [activeTab]);

  return null;
}
