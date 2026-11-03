import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const targetFile = path.resolve(__dirname, '../node_modules/@lucasmarkes/hairline/dist/index.js');

if (fs.existsSync(targetFile)) {
  let content = fs.readFileSync(targetFile, 'utf8');

  // 1. Solitary Node Elevation (Zero Neighbor Falloff)
  const targetFall = 'var FALL = [1, 0.5, 0.2, 0.06, 0];';
  const replacementFall = 'var FALL = [1, 0, 0, 0, 0];';
  if (content.includes(targetFall)) {
    content = content.replace(targetFall, replacementFall);
  }

  // 2. Programmatic Active Tile Selection on mount9
  const targetMount = `  return {
    set: (v) => {
      lift = v;
      if (act >= 0) {
        const from = tiles[act].n;
        tiles.forEach((t) => {
          t.tgt = t.sp.t = lift * FALL[hops(t, from)];
          t.pend = false;
        });
        B6.wake();
      }
    },
    destroy: bag.dispose
  };`;

  const replacementMount = `  return {
    setActiveTile: (a) => setActive(a),
    set: (v) => {
      lift = v;
      if (act >= 0) {
        const from = tiles[act].n;
        tiles.forEach((t) => {
          t.tgt = t.sp.t = lift * FALL[hops(t, from)];
          t.pend = false;
        });
        B6.wake();
      }
    },
    destroy: bag.dispose
  };`;

  if (content.includes(targetMount)) {
    content = content.replace(targetMount, replacementMount);
  }

  // 3. Expose setActiveTile on create()
  const targetCreate = `return {
    update(next) {`;

  const replacementCreate = `return {
    setActiveTile: (a) => engine.setActiveTile?.(a),
    update(next) {`;

  if (content.includes(targetCreate) && !content.includes('setActiveTile: (a) => engine.setActiveTile?.(a)')) {
    content = content.replace(targetCreate, replacementCreate);
  }

  // 4. Synchronized Descent Spring Physics & Zero Lag on Deselect
  const targetDown = 'var DOWN = { k: 40, c: 12.4 };';
  const replacementDown = 'var DOWN = { k: 70, c: 14 };';
  if (content.includes(targetDown)) {
    content = content.replace(targetDown, replacementDown);
  }

  const targetDelay = 'const delay = reducedMotion() ? 0 : rising ? hop * STEP3 : a < 0 ? (4 - hop) * 25 : hop === 0 ? 60 : 0;';
  const replacementDelay = 'const delay = reducedMotion() ? 0 : rising ? hop * STEP3 : 0;';
  if (content.includes(targetDelay)) {
    content = content.replace(targetDelay, replacementDelay);
  }

  // 5. Prevent pointerleave from unilaterally resetting the active tile
  const targetLeave = 'leave: () => setActive(-1)';
  const replacementLeave = 'leave: () => {}';
  if (content.includes(targetLeave)) {
    content = content.replace(targetLeave, replacementLeave);
  }

  // 6. Sub-Pixel 3D Perspective & CTM Precision Projection (Resolves Diagonal Hitbox Drift on Nodes 3 & 7)
  const targetPt = `  const pt = (e) => {
    const r = stage.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * 400, (e.clientY - r.top) / r.height * 320];
  };`;

  const replacementPt = `  const pt = (e) => {
    const svg = stage.querySelector?.('svg');
    if (svg && svg.getScreenCTM) {
      const ctm = svg.getScreenCTM();
      if (ctm) {
        const p = svg.createSVGPoint();
        p.x = e.clientX;
        p.y = e.clientY;
        const local = p.matrixTransform(ctm.inverse());
        return [local.x, local.y];
      }
    }
    const r = stage.getBoundingClientRect();
    return [(e.clientX - r.left) / r.width * 400, (e.clientY - r.top) / r.height * 320];
  };`;

  const normContent = content.replace(/\r?\n/g, '\n');
  const normTargetPt = targetPt.replace(/\r?\n/g, '\n');
  const normRepPt = replacementPt.replace(/\r?\n/g, '\n');
  if (normContent.includes(normTargetPt)) {
    content = normContent.replace(normTargetPt, normRepPt);
  } else if (content.includes(targetPt)) {
    content = content.replace(targetPt, replacementPt);
  }

  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('[postinstall] Successfully enforced solitary elevation & setActiveTile API on @lucasmarkes/hairline.');
}
