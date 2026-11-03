import React, { useEffect, useRef, useState } from 'react';

/**
 * SpotlightDataRain.jsx -> Dynamic Firefly & Glow-Worm Causal Knowledge Graph Engine
 * 
 * Key Visual & Interactive Behaviors:
 * 1. Dynamic Biomimetic Swarm Migration (Random Short & Long Intervals):
 *    - The fireflies / glow worms do NOT just stay at the lamp.
 *    - They dynamically migrate and swirl around various focal targets on random intervals:
 *        • The CAVDAX Wordmark (swirling along the letters & perimeter)
 *        • The "Explore the CAVDAX Causal Engine" CTA button
 *        • The "Scroll to inspect engine" prompt
 *        • The Stretchy Lamp Toggle button
 *    - Uses random short (2.2s - 4.5s) and long (6.0s - 10.5s) intervals, gracefully gliding
 *      between elements like living fireflies in dusk.
 * 2. Invisible Cursor Hub with Vector Edges:
 *    - Nearby nodes draw directed/dashed connecting vector lines straight to the cursor position.
 *    - The cursor itself has NO visible dot drawn on it (100% invisible cursor tip).
 *    - Fully active BOTH above and below the Wordmark.
 * 3. Obstacle Avoidance & Perimeter Glide:
 *    - Nodes tightly contour around text/buttons without obstructing letters.
 * 4. Traveling Bioluminescent Aperture:
 *    - The CSS mask smoothly follows the traveling swarm AND tracks cursor movements.
 */
export default function SpotlightDataRain({ isDarkTheme = true, opacity = 1 }) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const reducedMotion = typeof window !== 'undefined' && 
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (reducedMotion) return;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let rafId = 0;
    let isRunning = true;
    let frameCount = 0;

    // Spotlight cursor coordinates
    const curPos = { x: -1000, y: -1000 };
    const tgtPos = { x: -1000, y: -1000 };
    let hasMouseInteracted = false;

    // Lamp light source tracking (top-right lamp toggle)
    let lampPos = { x: -1000, y: -1000, active: false };

    // Obstacle rectangles to deflect around (Wordmark SVG, Explore Button, Scroll prompt)
    let obstacles = [];

    // ─── Dynamic Swarm State Machine (Random Short & Long Intervals) ─────────
    const swarmState = {
      currentTargetId: 'lamp', // 'lamp', 'wordmark', 'explore-btn', 'scroll-prompt'
      nextSwitchTime: performance.now() + 3500,
      waypointProgress: 0,
    };

    // Smoothly interpolated swarm center in container space
    const swarmPos = {
      x: -1000,
      y: -1000,
      radius: 200,
    };

    // ─── Causal Graph Setup (~95 Firefly & Graph Nodes) ──────────────────────
    const NODE_COUNT = 95;
    const MAX_EDGE_DIST = 145;
    const MAX_EDGE_DIST_SQ = MAX_EDGE_DIST * MAX_EDGE_DIST;
    const PULSE_COUNT = 28;

    const LABELS = ['ADR-01', 'AST:def', 'DEC:102', 'MCP:gate', 'RULE:req', 'SPEC:v3', 'CYPHER'];

    // Node memory buffers
    const nodes = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const type = i % 8 === 0 ? 'decision' : (i % 5 === 0 ? 'source' : (i % 11 === 0 ? 'gate' : 'fact'));
      nodes.push({
        x: 0,
        y: 0,
        vx: (Math.random() - 0.5) * 0.35,
        vy: (Math.random() - 0.5) * 0.35,
        radius: type === 'decision' ? 2.8 : (type === 'gate' ? 2.6 : (type === 'source' ? 2.4 : 1.8)),
        type,
        pulse: Math.random() * Math.PI * 2,
        pulseSpeed: 0.022 + Math.random() * 0.028,
        driftSeed: Math.random() * 100,
        label: i % 9 === 0 ? LABELS[Math.floor(Math.random() * LABELS.length)] : null,
      });
    }

    // Traveling Data Packets along Graph Edges
    const pulses = [];
    for (let i = 0; i < PULSE_COUNT; i++) {
      pulses.push({
        from: 0,
        to: 1,
        progress: Math.random(),
        speed: 0.007 + Math.random() * 0.010,
        active: false,
      });
    }

    // Initialize with guaranteed distribution: 35 nodes in upper zone, 60 in lower zones
    const initNodes = () => {
      const upperZoneHeight = Math.max(160, height * 0.32);
      for (let i = 0; i < NODE_COUNT; i++) {
        if (i < 35) {
          nodes[i].x = Math.random() * width;
          nodes[i].y = Math.random() * upperZoneHeight;
        } else {
          nodes[i].x = Math.random() * width;
          nodes[i].y = upperZoneHeight + Math.random() * (height - upperZoneHeight);
        }
      }
    };

    // ─── Obstacle & Focal Element Scanner ────────────────────────────────────
    const updateObstacles = () => {
      if (!container) return;
      const cRect = container.getBoundingClientRect();
      const newObs = [];

      // 1. Wordmark SVG Letters
      const wmContainer = document.getElementById('wordmark-hero-container');
      const wmSvg = wmContainer?.querySelector('svg') || wmContainer;
      if (wmSvg) {
        const r = wmSvg.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          newObs.push({
            id: 'wordmark',
            x: r.left - cRect.left - 8,
            y: r.top - cRect.top - 6,
            w: r.width + 16,
            h: r.height + 12,
          });
        }
      }

      // 1b. Wordmark Subtext (Full form acronym and Explore phrase - STRICT EXCLUSION ZONE)
      const wmSubtext = document.getElementById('wordmark-subtext-container');
      if (wmSubtext) {
        const r = wmSubtext.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          newObs.push({
            id: 'wordmark-subtext',
            x: r.left - cRect.left - 24,
            y: r.top - cRect.top - 16,
            w: r.width + 48,
            h: r.height + 32,
          });
        }
      }

      // 2. Explore Button
      const btnEl = document.getElementById('wordmark-explore-btn');
      if (btnEl) {
        const r = btnEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          newObs.push({
            id: 'explore-btn',
            x: r.left - cRect.left - 10,
            y: r.top - cRect.top - 8,
            w: r.width + 20,
            h: r.height + 16,
          });
        }
      }

      // 3. Scroll to Inspect Engine prompt
      const scrollEl = document.getElementById('wordmark-scroll-prompt');
      if (scrollEl) {
        const r = scrollEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          newObs.push({
            id: 'scroll-prompt',
            x: r.left - cRect.left - 8,
            y: r.top - cRect.top - 6,
            w: r.width + 16,
            h: r.height + 12,
          });
        }
      }

      // 4. Lamp Light Source (PullCordLampToggle)
      const lampEl = document.getElementById('wordmark-lamp-toggle');
      if (lampEl) {
        const r = lampEl.getBoundingClientRect();
        if (r.width > 0 && r.height > 0) {
          lampPos = {
            x: r.left - cRect.left + r.width / 2,
            y: r.top - cRect.top + Math.min(r.height * 0.35, 95),
            active: true
          };
        }
      } else {
        lampPos = {
          x: width - 65,
          y: 90,
          active: true
        };
      }

      obstacles = newObs;
    };

    const handleResize = () => {
      const parent = container.parentElement;
      if (!parent) return;
      const rect = parent.getBoundingClientRect();
      width = Math.max(1, rect.width || window.innerWidth);
      height = Math.max(1, rect.height || window.innerHeight);
      dpr = Math.min(window.devicePixelRatio || 1, 2);

      canvas.width = Math.round(width * dpr);
      canvas.height = Math.round(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;

      initNodes();
      requestAnimationFrame(updateObstacles);
      setTimeout(updateObstacles, 800);
      setTimeout(updateObstacles, 2200);

      if (swarmPos.x < 0) {
        swarmPos.x = width - 65;
        swarmPos.y = 90;
      }
    };

    handleResize();
    const ro = new ResizeObserver(handleResize);
    if (container.parentElement) ro.observe(container.parentElement);

    // ─── Pointer & Mouse Event Listeners ─────────────────────────────────────
    const handleMove = (e) => {
      const rect = container.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      tgtPos.x = x;
      tgtPos.y = y;
      hasMouseInteracted = true;

      if (curPos.x < -500) {
        curPos.x = x;
        curPos.y = y;
      }
    };

    window.addEventListener('pointermove', handleMove, { passive: true });
    window.addEventListener('mousemove', handleMove, { passive: true });
    window.addEventListener('scroll', updateObstacles, { passive: true });

    // ─── Theme Colors ────────────────────────────────────────────────────────
    const getColors = () => {
      if (isDarkTheme) {
        return {
          source: '#ffffff',
          fact: '#cbd5e1',           // Slate-300
          decision: '#d9a353',       // CAVDAX warm amber
          gate: '#f43f5e',           // Rose gate
          edge: 'rgba(241, 245, 249, ', // Crisp porcelain slate-100
          pulse: '#d9a353',
        };
      } else {
        return {
          source: '#0f172a',         // Slate-950 obsidian
          fact: '#475569',           // Slate-600
          decision: '#b45309',       // Deep amber
          gate: '#e11d48',
          edge: 'rgba(15, 23, 42, ',  // Obsidian ink lines
          pulse: '#b45309',
        };
      }
    };

    // ─── Graph Physics & Firefly Swarm Engine ────────────────────────────────
    const updateGraph = () => {
      frameCount++;

      // ─── 1. Interval Swarm Focal Migration (Random Short & Long Intervals) ──
      const now = performance.now();
      if (now > swarmState.nextSwitchTime) {
        const availableTargets = ['wordmark', 'explore-btn', 'scroll-prompt'];
        const otherTargets = availableTargets.filter(t => t !== swarmState.currentTargetId);
        swarmState.currentTargetId = otherTargets[Math.floor(Math.random() * otherTargets.length)];

        // Random short (2.2s - 4.5s) or long (6.0s - 10.5s) interval
        const isLong = Math.random() < 0.45;
        const duration = isLong
          ? 6000 + Math.random() * 4500
          : 2200 + Math.random() * 2300;

        swarmState.nextSwitchTime = now + duration;
        swarmState.waypointProgress = 0;
      }

      // Determine target coordinates for current swarm focus
      let tgtSwarmX = width - 65;
      let tgtSwarmY = 90;
      let tgtSwarmRadius = 190;
      let isRectTarget = false;

      if (swarmState.currentTargetId === 'lamp') {
        if (lampPos.active) {
          tgtSwarmX = lampPos.x;
          tgtSwarmY = lampPos.y;
          tgtSwarmRadius = 190;
        }
      } else if (swarmState.currentTargetId === 'wordmark') {
        const wmObs = obstacles.find(o => o.id === 'wordmark');
        if (wmObs) {
          isRectTarget = true;
          swarmState.waypointProgress += 0.006;
          // Gently drift back and forth along the wordmark span
          const wanderOffset = Math.sin(swarmState.waypointProgress) * (wmObs.w * 0.32);
          tgtSwarmX = wmObs.x + wmObs.w / 2 + wanderOffset;
          tgtSwarmY = wmObs.y + wmObs.h / 2;
          tgtSwarmRadius = 260;
        }
      } else if (swarmState.currentTargetId === 'explore-btn') {
        const btnObs = obstacles.find(o => o.id === 'explore-btn');
        if (btnObs) {
          isRectTarget = true;
          tgtSwarmX = btnObs.x + btnObs.w / 2;
          tgtSwarmY = btnObs.y + btnObs.h / 2;
          tgtSwarmRadius = 200;
        }
      } else if (swarmState.currentTargetId === 'scroll-prompt') {
        const scrObs = obstacles.find(o => o.id === 'scroll-prompt');
        if (scrObs) {
          isRectTarget = true;
          tgtSwarmX = scrObs.x + scrObs.w / 2;
          tgtSwarmY = scrObs.y + scrObs.h / 2;
          tgtSwarmRadius = 175;
        }
      }

      // Smooth organic swarm migration between focal elements
      swarmPos.x += (tgtSwarmX - swarmPos.x) * 0.045;
      swarmPos.y += (tgtSwarmY - swarmPos.y) * 0.045;
      swarmPos.radius += (tgtSwarmRadius - swarmPos.radius) * 0.045;

      const cursorX = tgtPos.x;
      const cursorY = tgtPos.y;
      const hasCursor = hasMouseInteracted && cursorX > -500 && cursorY > -500;
      const cursorRadius = 125;
      const cursorRadiusSq = cursorRadius * cursorRadius;

      // Update Node Positions & Swarming Physics
      for (let i = 0; i < NODE_COUNT; i++) {
        const n = nodes[i];
        n.pulse += n.pulseSpeed;

        // 1. Natural Flutter Motion (Sinusoidal Firefly Hovering in 2D)
        const flutterX = Math.sin(n.pulse * 1.4 + n.driftSeed) * 0.32;
        const flutterY = Math.cos(n.pulse * 1.1 + n.driftSeed) * 0.26;

        // 2. Cursor Deflection / Proximity Field
        if (hasCursor) {
          const dx = n.x - cursorX;
          const dy = n.y - cursorY;
          const d2 = dx * dx + dy * dy;
          if (d2 < cursorRadiusSq && d2 > 4) {
            const d = Math.sqrt(d2);
            const force = (1 - d / cursorRadius) * 0.30;
            n.vx += (dx / d) * force * 0.12 - (dy / d) * force * 0.05;
            n.vy += (dy / d) * force * 0.12 + (dx / d) * force * 0.05;
          }
        }

        // 3. Dynamic Swarm Swirling (Attracted to current focal element)
        const sdx = swarmPos.x - n.x;
        const sdy = swarmPos.y - n.y;
        const sdist = Math.hypot(sdx, sdy);

        // Nodes within the swarm radius (or cohort of responsive fireflies) swirl around focal element
        if (sdist < swarmPos.radius || i < 35) {
          if (sdist > 0.01) {
            const pull = Math.min(0.24, (1 - Math.min(sdist, swarmPos.radius) / swarmPos.radius) * 0.19 + 0.03);
            n.vx += (sdx / sdist) * pull;
            n.vy += (sdy / sdist) * pull;

            // Swirl / orbit around the target (alternating clockwise / counter-clockwise)
            const swirlDir = (i % 2 === 0) ? 1 : -1;
            const swirlForce = Math.min(0.32, (1 - Math.min(sdist, swarmPos.radius) / swarmPos.radius) * 0.28);
            n.vx += (-sdy / sdist) * swirlForce * swirlDir;
            n.vy += (sdx / sdist) * swirlForce * swirlDir;

            // Inner cushion around focal point (so they don't pile up directly on top of text)
            const minCushion = isRectTarget ? 35 : 42;
            if (sdist < minCushion) {
              const push = ((minCushion - sdist) / minCushion) * 0.40;
              n.vx -= (sdx / sdist) * push;
              n.vy -= (sdy / sdist) * push;
            }
          }
        }

        // 4. Obstacle Deflection & Perimeter Swarming (Wordmark, Explore Button, Scroll prompt)
        for (let o = 0; o < obstacles.length; o++) {
          const obs = obstacles[o];
          const cx = Math.max(obs.x, Math.min(n.x, obs.x + obs.w));
          const cy = Math.max(obs.y, Math.min(n.y, obs.y + obs.h));
          const odx = n.x - cx;
          const ody = n.y - cy;
          const odist = Math.hypot(odx, ody);

          const buffer = 18; // clearance buffer around actual letters
          if (odist < buffer) {
            const factor = (buffer - odist) / buffer;
            if (odist > 0.01) {
              // Smooth repulsion away from text
              n.vx += (odx / odist) * factor * 0.85;
              n.vy += (ody / odist) * factor * 0.85;

              // Balanced perimeter glide contour (fireflies framing the UI)
              const centerX = obs.x + obs.w / 2;
              const tangentDir = n.x < centerX ? -1 : 1;
              if (n.y < obs.y) {
                // Above the box: glide horizontally outward, keep floating above
                n.vx += tangentDir * 0.22;
                n.vy -= 0.12;
              } else if (n.y > obs.y + obs.h) {
                // Below the box: glide horizontally outward, keep floating below
                n.vx += tangentDir * 0.22;
                n.vy += 0.12;
              } else {
                // Sides: gently glide vertically
                n.vx += (odx / odist) * 0.30;
              }
            } else {
              // Inside the text rectangle: push out to nearest edge
              const distTop = Math.abs(n.y - obs.y);
              const distBottom = Math.abs((obs.y + obs.h) - n.y);
              const distLeft = Math.abs(n.x - obs.x);
              const distRight = Math.abs((obs.x + obs.w) - n.x);
              const minDist = Math.min(distTop, distBottom, distLeft, distRight);

              if (minDist === distTop) {
                n.y = obs.y - 4;
                n.vy = -Math.abs(n.vy) - 0.4;
              } else if (minDist === distBottom) {
                n.y = obs.y + obs.h + 4;
                n.vy = Math.abs(n.vy) + 0.4;
              } else if (minDist === distLeft) {
                n.x = obs.x - 4;
                n.vx = -Math.abs(n.vx) - 0.4;
              } else {
                n.x = obs.x + obs.w + 4;
                n.vx = Math.abs(n.vx) + 0.4;
              }
            }
          }
        }

        // Apply velocities with balanced 2D hovering (no one-way gravity bias)
        n.x += n.vx + flutterX;
        n.y += n.vy + flutterY;
        n.vx *= 0.965;
        n.vy *= 0.965;

        // Micro ambient flutter to keep nodes actively wandering throughout the space
        n.vx += (Math.random() - 0.5) * 0.025;
        n.vy += (Math.random() - 0.5) * 0.025;

        // 4-Way Toroidal Wrap: Allows seamless floating in all directions
        if (n.x < -25) n.x = width + 20;
        else if (n.x > width + 25) n.x = -20;
        if (n.y < -25) n.y = height + 20;
        else if (n.y > height + 25) n.y = -20;
      }

      // Update Active Pulses along Edges
      for (let p = 0; p < PULSE_COUNT; p++) {
        const pulse = pulses[p];
        if (!pulse.active) {
          const fromIdx = Math.floor(Math.random() * NODE_COUNT);
          const fromNode = nodes[fromIdx];
          for (let j = 0; j < NODE_COUNT; j++) {
            if (fromIdx === j) continue;
            const toNode = nodes[j];
            const dx = toNode.x - fromNode.x;
            const dy = toNode.y - fromNode.y;
            if (dx * dx + dy * dy < MAX_EDGE_DIST_SQ) {
              pulse.from = fromIdx;
              pulse.to = j;
              pulse.progress = 0;
              pulse.active = true;
              break;
            }
          }
        } else {
          pulse.progress += pulse.speed;
          if (pulse.progress >= 1) {
            pulse.active = false;
          }
        }
      }
    };

    // ─── Render Canvas ───────────────────────────────────────────────────────
    const render = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, width, height);

      const colors = getColors();

      // Mathematical Obstacle Occlusion Guard: never draw lines, nodes, or text over wordmark, subtext, or buttons
      const isInsideObstacle = (x, y, pad = 6) => {
        for (let o = 0; o < obstacles.length; o++) {
          const obs = obstacles[o];
          if (
            x >= obs.x - pad &&
            x <= obs.x + obs.w + pad &&
            y >= obs.y - pad &&
            y <= obs.y + obs.h + pad
          ) {
            return true;
          }
        }
        return false;
      };

      // 1. Draw Crisp, Clearly Visible Graph Edges
      ctx.lineWidth = 1.1;
      ctx.lineCap = 'round';

      for (let i = 0; i < NODE_COUNT; i++) {
        const nA = nodes[i];
        for (let j = i + 1; j < NODE_COUNT; j++) {
          const nB = nodes[j];
          const dx = nB.x - nA.x;
          const dy = nB.y - nA.y;
          const distSq = dx * dx + dy * dy;

          if (distSq < MAX_EDGE_DIST_SQ) {
            // Strict Exclusion: do not draw edges crossing into wordmark, subtext, button, OR lamp cluster
            const isNearLamp = (x, y) => {
              if (!lampPos.active || lampPos.x <= 0) return false;
              const dX = x - lampPos.x;
              const dY = y - lampPos.y;
              return (dX * dX + dY * dY) < 14400; // 120px clean halo around lamp
            };

            if (
              isNearLamp(nA.x, nA.y) ||
              isNearLamp(nB.x, nB.y) ||
              isInsideObstacle(nA.x, nA.y, 4) ||
              isInsideObstacle(nB.x, nB.y, 4) ||
              isInsideObstacle((nA.x + nB.x) * 0.5, (nA.y + nB.y) * 0.5, 4)
            ) {
              continue;
            }
            const dist = Math.sqrt(distSq);
            // Crisp visibility in Dark Mode (up to 0.48 alpha) and Light Mode (0.36 alpha)
            const edgeAlpha = (1 - dist / MAX_EDGE_DIST) * (isDarkTheme ? 0.48 : 0.36);

            ctx.strokeStyle = `${colors.edge}${edgeAlpha.toFixed(3)})`;
            ctx.beginPath();
            ctx.moveTo(nA.x, nA.y);
            ctx.lineTo(nB.x, nB.y);
            ctx.stroke();

            // Subtle directed midpoint arrowhead (tiny 2.5px)
            if (dist > 55 && (i + j) % 4 === 0) {
              const midX = (nA.x + nB.x) * 0.5;
              const midY = (nA.y + nB.y) * 0.5;
              const angle = Math.atan2(dy, dx);
              const arrowSize = 2.5;

              ctx.fillStyle = `${colors.edge}${(edgeAlpha * 1.3).toFixed(3)})`;
              ctx.beginPath();
              ctx.moveTo(midX + Math.cos(angle) * arrowSize, midY + Math.sin(angle) * arrowSize);
              ctx.lineTo(midX + Math.cos(angle + 2.5) * arrowSize, midY + Math.sin(angle + 2.5) * arrowSize);
              ctx.lineTo(midX + Math.cos(angle - 2.5) * arrowSize, midY + Math.sin(angle - 2.5) * arrowSize);
              ctx.closePath();
              ctx.fill();
            }
          }
        }
      }

      // 1b. Cursor Inspection Probe Lines (Linking nearby nodes to invisible cursor position)
      const cursorX = tgtPos.x;
      const cursorY = tgtPos.y;
      const hasCursor = hasMouseInteracted && cursorX > -500 && cursorY > -500;
      if (hasCursor) {
        for (let i = 0; i < NODE_COUNT; i++) {
          const nA = nodes[i];
          const dx = cursorX - nA.x;
          const dy = cursorY - nA.y;
          const distSq = dx * dx + dy * dy;
          if (distSq < 140 * 140) {
            const dist = Math.sqrt(distSq);
            const probeAlpha = (1 - dist / 140) * (isDarkTheme ? 0.48 : 0.38);
            ctx.strokeStyle = `${colors.edge}${probeAlpha.toFixed(3)})`;
            ctx.setLineDash([2, 3]);
            ctx.beginPath();
            ctx.moveTo(nA.x, nA.y);
            ctx.lineTo(cursorX, cursorY);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
      // Note: We deliberately DO NOT render any circle dot at (cursorX, cursorY)

      // 2. Draw Traveling Data Pulses along Edges
      for (let p = 0; p < PULSE_COUNT; p++) {
        const pulse = pulses[p];
        if (!pulse.active) continue;

        const nA = nodes[pulse.from];
        const nB = nodes[pulse.to];
        const px = nA.x + (nB.x - nA.x) * pulse.progress;
        const py = nA.y + (nB.y - nA.y) * pulse.progress;

        const pulseAlpha = Math.sin(pulse.progress * Math.PI) * (isDarkTheme ? 0.85 : 0.75);
        ctx.fillStyle = colors.pulse;
        ctx.globalAlpha = pulseAlpha;

        // Slim 1.4px pulse packet
        ctx.beginPath();
        ctx.arc(px, py, 1.4, 0, Math.PI * 2);
        ctx.fill();

        // Subtle soft glow
        ctx.beginPath();
        ctx.arc(px, py, 2.8, 0, Math.PI * 2);
        ctx.fillStyle = isDarkTheme ? 'rgba(217, 163, 83, 0.20)' : 'rgba(180, 83, 9, 0.15)';
        ctx.fill();

        ctx.globalAlpha = 1;
      }

      // 3. Draw Firefly & Glow-Worm Graph Vertices
      for (let i = 0; i < NODE_COUNT; i++) {
        const n = nodes[i];
        if (isInsideObstacle(n.x, n.y, 6)) {
          continue; // Strict Exclusion: never render node on top of subtext or UI chrome
        }
        const baseColor = colors[n.type];

        // Bioluminescent Firefly Breathing Halo
        const fireflyBreath = 0.55 + 0.45 * Math.sin(n.pulse);
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius * 2.3, 0, Math.PI * 2);
        ctx.fillStyle = isDarkTheme
          ? (n.type === 'decision' 
              ? `rgba(217, 163, 83, ${(0.18 * fireflyBreath).toFixed(3)})` 
              : `rgba(255, 255, 255, ${(0.10 * fireflyBreath).toFixed(3)})`)
          : (n.type === 'decision' 
              ? `rgba(180, 83, 9, ${(0.15 * fireflyBreath).toFixed(3)})` 
              : `rgba(15, 23, 42, ${(0.08 * fireflyBreath).toFixed(3)})`);
        ctx.fill();

        // Delicate pulsing ring for decision nodes
        if (n.type === 'decision' || n.type === 'gate') {
          ctx.strokeStyle = n.type === 'decision' 
            ? (isDarkTheme ? 'rgba(217, 163, 83, 0.24)' : 'rgba(180, 83, 9, 0.22)') 
            : (isDarkTheme ? 'rgba(244, 63, 94, 0.24)' : 'rgba(225, 29, 72, 0.22)');
          ctx.lineWidth = 0.6;
          ctx.beginPath();
          ctx.arc(n.x, n.y, n.radius + 2, 0, Math.PI * 2);
          ctx.stroke();
        }

        // Node Vertex Core
        ctx.fillStyle = baseColor;
        ctx.beginPath();
        ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
        ctx.fill();

        // White core center anchor for Source nodes
        if (n.type === 'source') {
          ctx.fillStyle = isDarkTheme ? '#0B0D0E' : '#FFFFFF';
          ctx.beginPath();
          ctx.arc(n.x, n.y, 0.9, 0, Math.PI * 2);
          ctx.fill();
        }

        // Delicate micro typography labels
        if (n.label) {
          ctx.font = '7.5px monospace';
          ctx.fillStyle = isDarkTheme ? 'rgba(226, 232, 240, 0.32)' : 'rgba(71, 85, 105, 0.40)';
          ctx.fillText(n.label, n.x + n.radius + 3, n.y + 2.5);
        }
      }
    };

    // ─── Main Unified Animation Loop ─────────────────────────────────────────
    const loop = () => {
      if (!isRunning) return;

      curPos.x += (tgtPos.x - curPos.x) * 0.18;
      curPos.y += (tgtPos.y - curPos.y) * 0.18;

      const hasCursorInBounds = hasMouseInteracted && curPos.x > -500 && curPos.y > -500;
      const lampActive = lampPos.active && lampPos.x > 0;

      // Composite aperture mask: Cursor spotlight + Dynamic Traveling Swarm Spotlight + Ambient Lamp
      const maskGradients = [];
      if (hasCursorInBounds) {
        maskGradients.push(`radial-gradient(circle 360px at ${curPos.x.toFixed(1)}px ${curPos.y.toFixed(1)}px, black 0%, rgba(0,0,0,0.65) 62%, transparent 100%)`);
      }
      
      // Dynamic Traveling Swarm Spotlight (reveals fireflies around whatever element they are currently swarming)
      if (swarmPos.x > 0 && swarmPos.y > 0) {
        maskGradients.push(`radial-gradient(circle ${Math.round(swarmPos.radius)}px at ${swarmPos.x.toFixed(1)}px ${swarmPos.y.toFixed(1)}px, black 0%, rgba(0,0,0,0.45) 55%, transparent 100%)`);
      }

      // Gentle baseline ambient glow around the lamp when it's not the primary swarm target
      if (lampActive && swarmState.currentTargetId !== 'lamp') {
        maskGradients.push(`radial-gradient(circle 170px at ${lampPos.x.toFixed(1)}px ${lampPos.y.toFixed(1)}px, black 0%, rgba(0,0,0,0.28) 48%, transparent 100%)`);
      }

      if (maskGradients.length > 0) {
        const fullMask = maskGradients.join(', ');
        container.style.webkitMaskImage = fullMask;
        container.style.maskImage = fullMask;
      }

      updateGraph();
      render();

      rafId = requestAnimationFrame(loop);
    };

    rafId = requestAnimationFrame(loop);

    let isIntersecting = true;
    const handleVisibility = () => {
      if (document.hidden || !isIntersecting) {
        isRunning = false;
        cancelAnimationFrame(rafId);
      } else {
        if (!isRunning) {
          isRunning = true;
          rafId = requestAnimationFrame(loop);
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);

    // Sleep canvas RAF loop when hero is scrolled out of viewport
    const io = new IntersectionObserver(([entry]) => {
      isIntersecting = entry.isIntersecting;
      if (!isIntersecting) {
        isRunning = false;
        cancelAnimationFrame(rafId);
      } else if (!document.hidden && !isRunning) {
        isRunning = true;
        rafId = requestAnimationFrame(loop);
      }
    }, { threshold: 0.02 });

    io.observe(container);

    return () => {
      isRunning = false;
      cancelAnimationFrame(rafId);
      window.removeEventListener('pointermove', handleMove);
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('scroll', updateObstacles);
      document.removeEventListener('visibilitychange', handleVisibility);
      ro.disconnect();
      io.disconnect();
    };
  }, [isDarkTheme]);

  return (
    <div 
      ref={containerRef}
      aria-hidden="true"
      style={{ 
        opacity: isVisible ? opacity : 0,
        transition: 'opacity 0.6s cubic-bezier(0.16, 1, 0.3, 1)' 
      }}
      className="absolute inset-0 pointer-events-none select-none z-0 overflow-hidden will-change-[opacity,mask-image]"
    >
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block"
      />
    </div>
  );
}
