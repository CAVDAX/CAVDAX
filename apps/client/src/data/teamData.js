/**
 * Team Contrarians Data Specification
 * WeMakeDevs x FalkorDB Graph Hacks Hackathon
 */

export const TEAM_DETAILS = {
  name: 'Contrarians',
  tagline: 'Defying Vector RAG Blindness with Causal Graph Intelligence',
  logo: '/team/contrarians-logo.png',
  hackathon: 'WeMakeDevs × FalkorDB Graph Hacks (October 2026)',
  track: 'Track 01: Agents That Act on Connected Data (Primary) & Track 02: Knowledge Graphs & Long-Term Memory',
  license: 'Dual-Licensed: Apache 2.0 (Client/MCP) & BSL 1.1 (Cloud Platform)',
  githubRepo: 'https://github.com/CAVDAX/CAVDAX',
};

export const TEAM_MEMBERS = [
  {
    id: 'suneet',
    name: 'Suneet Chugh',
    role: 'Team Leader',
    title: 'Lead Architect & Systems Engineer',
    domain: 'Distributed Systems, GraphBLAS & Enclosed Execution',
    bio: 'Pioneered the FalkorDB GraphBLAS causal invalidation loop, enclosed MCP execution gate architecture, visual operational console spanning 9 telemetry views, and Cloudflare edge deployment orchestration.',
    avatar: '/avatars/suneet.webp',
    fallbackAvatar: 'https://github.com/suneetchugh-dev.png',
    github: 'https://github.com/suneetchugh-dev',
    linkedin: 'https://www.linkedin.com/in/suneetchugh-dev/',
    tags: ['FalkorDB GraphBLAS', 'Enclosed MCP Gate', 'Console Topology', 'D3 Physics Canvas', 'Cloudflare & Docker'],
    highlights: [
      'Engineered sub-2ms Query 2 GraphBLAS invalidation cascade in FalkorDB',
      'Designed enclosed MCP protocol proxy intercepting in-flight agent write tools',
      'Architected visual console (9 views), 3D causal enclave hub, and D3 canvas',
      'Authored 10-scenario benchmark evaluation suite and Docker Compose mesh'
    ]
  },
  {
    id: 'geetika',
    name: 'Geetika Chugh',
    role: 'Co-Creator & Systems Engineer',
    title: 'Lead MCP Engineer, Video Presenter & Backend Ingestion Architect',
    domain: 'MCP Distribution, Repository Ingestion & Enterprise Resilience',
    bio: 'Recorded official 10-minute deep-dive video walkthrough, published @cavdax/mcp-server on npm with Sigstore provenance, built multi-stack repo AST scanner, and implemented Razorpay sponsor infrastructure.',
    avatar: '/avatars/geetika.png',
    fallbackAvatar: 'https://github.com/GeetikaChughIBM.png',
    github: 'https://github.com/GeetikaChughIBM',
    linkedin: 'https://www.linkedin.com/in/geetika-chugh-085251252/',
    tags: ['Video Walkthrough', 'NPM Package Distribution', 'Repo AST Ingestion', 'Razorpay Checkout', 'CI/CD Service Mesh'],
    highlights: [
      'Recorded and presented the official 10-minute deep-dive architecture demo video',
      'Published and maintained @cavdax/mcp-server on npm with Sigstore provenance',
      'Built automated GitHub repo AST scanner, multi-stack detector, and PR initializer',
      'Built Razorpay sponsor checkout, webhook processing, and tier quota sync'
    ]
  }
];

export const SYSTEM_CREDITS = [
  { label: 'Graph Engine', value: 'FalkorDB GraphBLAS', detail: 'Linear algebraic sparse matrix operations in RAM' },
  { label: 'Agent Protocol', value: 'Model Context Protocol (MCP)', detail: 'Anthropic open standard (2024-11-05)' },
  { label: 'Gate SLA', value: '< 15ms Latency', detail: 'Zero perceptible delay during code generation' },
  { label: 'License', value: 'GNU GPL v3.0', detail: '100% Open Source and community auditable' }
];
