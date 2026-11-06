/**
 * CAVDAX Core Cypher Queries
 * Implements the 3 mathematically sound queries tested for FalkorDB GraphBLAS.
 */

/**
 * Extracts the actual DB-measured execution time from a FalkorDB query result.
 *
 * FalkorDB returns query statistics in result.metadata as an array of strings,
 * e.g. ["Query internal execution time: 1.23 milliseconds"].
 * We parse that first. If unavailable, we fall back to the high-resolution
 * wall-clock time measured with process.hrtime.bigint() (nanosecond precision),
 * which is more accurate than Date.now() because it excludes event-loop skew
 * from the startup overhead but still includes network RTT.
 *
 * @param {object} result - FalkorDB query result object
 * @param {bigint} hrtStart - Value from process.hrtime.bigint() before the query
 * @returns {number} Latency in milliseconds (2 decimal places)
 */
function extractLatencyMs(result, hrtStart) {
  // Try FalkorDB internal execution time first (most accurate — pure DB time)
  if (result?.metadata) {
    const meta = Array.isArray(result.metadata) ? result.metadata : [];
    for (const entry of meta) {
      const match = String(entry).match(/Query internal execution time:\s*([\d.]+)\s*milliseconds/i);
      if (match) return parseFloat(parseFloat(match[1]).toFixed(2));
    }
  }
  // Fallback: high-resolution wall-clock RTT (includes network, excludes Date.now skew)
  const elapsedNs = process.hrtime.bigint() - hrtStart;
  return parseFloat((Number(elapsedNs) / 1_000_000).toFixed(2));
}

/**
 * Query 1: Enclosed Action Gate Verification
 * Inspects all dependency paths and uses ANY(...) aggregation to ensure zero stale links.
 */
export async function verifyActionGate(graph, decisionId) {
  const hrtStart = process.hrtime.bigint();

  const cypher = `
    MATCH (d:Decision {id: $decisionId})
    WITH d, d.status AS decision_status
    OPTIONAL MATCH p = (d)-[:DEPENDS_ON*1..4]->(f:Fact)
    OPTIONAL MATCH (f)-[:EXTRACTED_FROM]->(s:Source)
    WITH d, decision_status,
         [dep IN collect(CASE WHEN p IS NULL THEN null ELSE {
           path_nodes: [n IN nodes(p) | labels(n)[0] + ':' + coalesce(n.id, n.ref)] + (CASE WHEN s IS NOT NULL THEN ['Source:' + coalesce(s.id, s.ref)] ELSE [] END),
           fact_stale: coalesce(f.is_stale, false),
           has_source: (s IS NOT NULL),
           source_status: CASE WHEN s IS NOT NULL THEN coalesce(s.status, 'ACTIVE') ELSE 'MISSING' END,
           has_invalid_decision: ANY(n IN nodes(p) WHERE (n:Decision) AND n.id <> d.id AND n.status <> 'VALID')
         } END) WHERE dep IS NOT NULL] AS dependencies
    RETURN d.id AS decision_id,
           decision_status,
           CASE
             WHEN decision_status = 'INVALIDATED_NEEDS_REVALIDATION' THEN 'BLOCKED_DECISION_INVALIDATED'
             WHEN decision_status <> 'VALID' THEN 'BLOCKED_DECISION_INVALID'
             WHEN size(dependencies) = 0 THEN 'BLOCKED_NO_GROUNDING'
             WHEN ANY(dep IN dependencies WHERE dep.has_invalid_decision = true) THEN 'BLOCKED_INTERMEDIATE_DECISION_INVALIDATED'
             WHEN ANY(dep IN dependencies WHERE dep.fact_stale = true) THEN 'BLOCKED_STALE_FACT'
             WHEN ANY(dep IN dependencies WHERE dep.source_status = 'SUPERSEDED') THEN 'BLOCKED_SUPERSEDED_SOURCE'
             WHEN ANY(dep IN dependencies WHERE dep.has_source = false) THEN 'BLOCKED_NO_GROUNDING'
             ELSE 'APPROVED'
           END AS gate_verdict,
           [dep IN dependencies WHERE dep.has_invalid_decision = true OR dep.fact_stale = true OR dep.source_status = 'SUPERSEDED' OR dep.has_source = false | dep.path_nodes] AS violation_paths
  `;

  const result = await graph.query(cypher, { params: { decisionId } });
  const latencyMs = extractLatencyMs(result, hrtStart);

  if (!result.data || result.data.length === 0) {
    return {
      decision_id: decisionId,
      gate_verdict: 'BLOCKED_DECISION_NOT_FOUND',
      latency_ms: latencyMs,
      violation_paths: [],
      error: `Decision '${decisionId}' does not exist in FalkorDB.`
    };
  }

  const row = result.data[0];
  return {
    decision_id: row.decision_id,
    decision_status: row.decision_status,
    gate_verdict: row.gate_verdict,
    violation_paths: row.violation_paths || [],
    is_approved: row.gate_verdict === 'APPROVED',
    latency_ms: latencyMs
  };
}

/**
 * Query 2: Cascading Invalidation on Ingesting Superseding Source
 * Establishes the SUPERSEDES edge and cascades status flags across the DAG in < 4ms.
 */
export async function cascadeInvalidation(graph, newSourceId, oldSourceId) {
  const hrtStart = process.hrtime.bigint();

  const cypher = `
    MERGE (newSource:Source {id: $newSourceId})
    MERGE (oldSource:Source {id: $oldSourceId})
    MERGE (newSource)-[:SUPERSEDES]->(oldSource)
    SET oldSource.status = 'SUPERSEDED',
        oldSource.superseded_at = timestamp()
    WITH oldSource
    OPTIONAL MATCH (oldSource)<-[:EXTRACTED_FROM]-(staleFact:Fact)
    SET staleFact.is_stale = true,
        staleFact.invalidated_at = timestamp()
    WITH staleFact
    OPTIONAL MATCH (d:Decision)-[:DEPENDS_ON*1..4]->(staleFact)
    SET d.status = 'INVALIDATED_NEEDS_REVALIDATION',
        d.invalidated_at = timestamp()
    RETURN count(DISTINCT d) AS affected_decisions, 
           collect(DISTINCT d.id) AS invalidated_decision_ids
  `;

  const result = await graph.query(cypher, { params: { newSourceId, oldSourceId } });
  const latencyMs = extractLatencyMs(result, hrtStart);

  const row = result.data && result.data[0] ? result.data[0] : {};
  return {
    affected_decisions: row.affected_decisions || 0,
    invalidated_decision_ids: row.invalidated_decision_ids || [],
    latency_ms: latencyMs
  };
}

/**
 * Query 3: Act IV Revalidation (Closing the Loop)
 * Archives the old decision, creates the fresh decision, and links it to the active fact.
 */
export async function revalidateDecision(graph, { newSourceId, oldDecisionId, newDecisionId, newFactId, title, isDemo: isDemoOption }) {
  const hrtStart = process.hrtime.bigint();

  const cypher = `
    MATCH (newSource:Source {id: $newSourceId})<-[:EXTRACTED_FROM]-(newFact:Fact {id: $newFactId})
    MATCH (oldDecision:Decision {id: $oldDecisionId})
    MERGE (newDecision:Decision {id: $newDecisionId})
    SET newDecision.title = $title,
        newDecision.status = 'VALID',
        newDecision.is_demo = $isDemo,
        newDecision.created_at = coalesce(newDecision.created_at, timestamp())
    MERGE (newDecision)-[:DEPENDS_ON]->(newFact)
    MERGE (newDecision)-[:REPLACES]->(oldDecision)
    SET oldDecision.status = 'REPLACED_ARCHIVED'
    RETURN newDecision.id AS active_decision_id, oldDecision.id AS archived_decision_id
  `;

  // Hosted server: the canonical 4-Act demo ids are tagged as demo data. The npm package passes isDemo=false.
  const isDemo = isDemoOption ?? Boolean(oldDecisionId?.startsWith('DEC-10') || newDecisionId?.startsWith('DEC-10') || newSourceId === 'ADR-002');
  const result = await graph.query(cypher, {
    params: { newSourceId, oldDecisionId, newDecisionId, newFactId, title, isDemo }
  });
  const latencyMs = extractLatencyMs(result, hrtStart);

  const row = result.data && result.data[0] ? result.data[0] : {};
  return {
    active_decision_id: row.active_decision_id,
    archived_decision_id: row.archived_decision_id,
    latency_ms: latencyMs
  };
}

/**
 * Query 4: Fetch Entire Graph State for Web HUD
 * Returns formatted nodes and edges for react-force-graph-2d / Cytoscape.
 *
 * @param {object} graph - FalkorDB graph instance
 * @param {object} [options]
 * @param {string|null} [options.repo] - Optional repository full name (owner/repo).
 *   If omitted, queries are isolated strictly to canonical demo nodes to prevent
 *   leakage of private customer repositories on unauthenticated endpoints.
 */
export async function fetchGraphState(graph, { repo = null } = {}) {
  // Both queries are bounded to 500 rows. An unbounded MATCH (n) on a large graph
  // causes a full table scan and returns a payload the Web HUD cannot usefully render.
  // 500 nodes is well above the visual threshold of the canvas; this is a safety cap.
  const repoFilter = repo
    ? `WHERE n.repo = $repo`
    : `WHERE n.repo IS NULL OR n.repo = 'demo' OR n.is_demo = true`;

  const edgeFilter = repo
    ? `WHERE (a.repo = $repo OR a.repo IS NULL) AND (b.repo = $repo OR b.repo IS NULL)`
    : `WHERE (a.repo IS NULL OR a.repo = 'demo' OR a.is_demo = true) AND (b.repo IS NULL OR b.repo = 'demo' OR b.is_demo = true)`;

  const nodesResult = await graph.query(`
    MATCH (n)
    ${repoFilter}
    RETURN id(n) AS internal_id, labels(n)[0] AS label, properties(n) AS props
    LIMIT 500
  `, repo ? { params: { repo } } : {});

  const edgesResult = await graph.query(`
    MATCH (a)-[r]->(b)
    ${edgeFilter}
    RETURN id(a) AS source_internal, id(b) AS target_internal,
           coalesce(a.id, a.ref) AS source_id,
           coalesce(b.id, b.ref) AS target_id,
           type(r) AS rel_type
    LIMIT 500
  `, repo ? { params: { repo } } : {});

  const nodes = (nodesResult.data || []).map(row => ({
    id: row.props.id || row.props.ref || String(row.internal_id),
    internalId: row.internal_id,
    label: row.label,
    ...row.props
  }));

  const edges = (edgesResult.data || []).map(row => ({
    source: row.source_id || String(row.source_internal),
    target: row.target_id || String(row.target_internal),
    type: row.rel_type
  }));

  return { nodes, edges };
}

/**
 * Query 5: Seed Demo Graph
 * Initializes the demo state with ADR-001 (Active), Fact (Auth v1, Fresh), and Decision #102 (Valid).
 */
export async function seedDemoGraph(graph) {
  console.log('[FalkorDB] Clearing and seeding demo graph...');
  await graph.query(`MATCH (n) DETACH DELETE n`);

  const cypher = `
    // 1. Initial Source (ADR-001)
    CREATE (s1:Source {
      id: 'ADR-001',
      ref: 'docs/adrs/ADR-001.md',
      type: 'ADR',
      status: 'ACTIVE',
      title: 'Adopt TokenAuth v1 for Payment Gateway',
      created_at: timestamp()
    })

    // 2. Fact extracted from ADR-001
    CREATE (f1:Fact {
      id: 'F-Auth-v1',
      claim: 'Payment gateway services require TokenAuth v1 for all checkout endpoints',
      is_stale: false,
      verified: true
    })
    CREATE (f1)-[:EXTRACTED_FROM]->(s1)

    // 3. Architecture Decision dependent on Fact 1
    CREATE (d1:Decision {
      id: 'DEC-102',
      title: 'Generate Checkout Service with TokenAuth v1',
      status: 'VALID',
      is_demo: true,
      created_at: timestamp()
    })
    CREATE (d1)-[:DEPENDS_ON]->(f1)

    // 4. Staged Superseding Source (ADR-002) - Initially unlinked
    CREATE (s2:Source {
      id: 'ADR-002',
      ref: 'docs/adrs/ADR-002.md',
      type: 'ADR',
      status: 'ACTIVE',
      title: 'Mandatory Migration to OAuth2; TokenAuth v1 Decommissioned',
      created_at: timestamp()
    })
    CREATE (f2:Fact {
      id: 'F-OAuth2',
      claim: 'OAuth2 is strictly enforced across all payment endpoints; TokenAuth v1 prohibited',
      is_stale: false,
      verified: true
    })
    CREATE (f2)-[:EXTRACTED_FROM]->(s2)

    // 5. Historical Demo Agent Actions for Audit Ledger
    CREATE (a1:AgentAction {
      id: "act-hist-001",
      target_file: "src/services/payment.js",
      status: "EXECUTED",
      timestamp: timestamp() - 3600000
    })
    CREATE (a1)-[:GROUNDED_IN]->(d1)

    CREATE (a2:AgentAction {
      id: "act-hist-002",
      target_file: "src/services/billing.js",
      status: "BLOCKED_SUPERSEDED_SOURCE",
      timestamp: timestamp() - 1800000
    })
    CREATE (a2)-[:GROUNDED_IN]->(d1)

    RETURN s1.id AS seeded_source, d1.id AS seeded_decision
  `;

  const result = await graph.query(cypher);
  console.log('[FalkorDB] Seed complete:', result.data);
  return result.data;
}

/**
 * Query 6: Audit Log — Fetch all AgentAction nodes with their grounding decision
 *
 * Returns a time-ordered list of every code write the MCP gate has approved or
 * blocked, enriched with the decision ID and gate verdict. This powers the
 * GET /api/audit endpoint for enterprise security and compliance teams.
 *
 * @param {object} graph - FalkorDB graph instance
 * @param {number} [limit=100] - Maximum number of entries to return
 * @param {object} [options]
 * @param {string|null} [options.repo] - Optional repository full name (owner/repo).
 *   If omitted, queries are isolated strictly to canonical demo actions to prevent
 *   leakage of private customer repositories on unauthenticated endpoints.
 * @returns {Promise<{entries: object[], total: number}>}
 */
export async function fetchAuditLog(graph, limit = 100, { repo = null } = {}) {
  const hrtStart = process.hrtime.bigint();

  const repoFilter = repo
    ? `WHERE a.repo = $repo`
    : `WHERE a.repo IS NULL OR a.repo = 'demo'`;

  const cypher = `
    MATCH (a:AgentAction)
    ${repoFilter}
    OPTIONAL MATCH (a)-[:GROUNDED_IN]->(d:Decision)
    RETURN
      a.id           AS action_id,
      a.target_file  AS target_file,
      a.status       AS status,
      coalesce(a.repo, 'demo') AS repo,
      coalesce(a.branch, 'main') AS branch,
      a.timestamp    AS executed_at,
      d.id           AS decision_id,
      d.status       AS decision_status,
      d.title        AS decision_title
    ORDER BY a.timestamp DESC
    LIMIT $limit
  `;

  const countCypher = `
    MATCH (a:AgentAction)
    ${repoFilter}
    RETURN count(a) AS total
  `;

  const countResult = await graph.query(countCypher, repo ? { params: { repo } } : {});
  const total = countResult.data?.[0]?.total ?? 0;

  const result = await graph.query(cypher, { params: repo ? { limit, repo } : { limit } });
  const latencyMs = extractLatencyMs(result, hrtStart);

  const entries = (result.data || []).map(row => ({
    action_id:       row.action_id,
    target_file:     row.target_file,
    status:          row.status,
    repo:            row.repo || 'demo',
    branch:          row.branch || 'main',
    executed_at:     row.executed_at,
    decision_id:     row.decision_id,
    decision_status: row.decision_status,
    decision_title:  row.decision_title
  }));

  return { entries, total, latency_ms: latencyMs };
}
