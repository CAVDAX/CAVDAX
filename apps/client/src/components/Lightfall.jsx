import React, { useEffect, useRef, useState } from 'react';

/**
 * Lightfall.jsx — CAVDAX Atmospheric Light Tunnel Background
 *
 * Monochromatic Architecture:
 * - Pure silver, white, and slate light streaks (zero yellow/amber).
 * - Dual-Engine: WebGL2 GLSL raymarching + Canvas2D 60fps radial fallback.
 * - Robust error boundaries, zero context-loss crashes, zero sad-face dead canvas icons.
 */

const MAX_COLORS = 8;
const BLOOM_LEVELS = 2;

const VERTEX = `#version 300 es
in vec2 aPosition;
void main() {
  gl_Position = vec4(aPosition, 0.0, 1.0);
}`;

const STREAKS = `#version 300 es
precision highp float;
uniform vec2 uView;
uniform float uZoom;
uniform float uPhase;
uniform float uTwinkleClock;
uniform float uRings;
uniform vec3 uColors[8];
uniform int uColorCount;
uniform int uStreakCount;
uniform int uColumns;
uniform float uWidth;
uniform float uTail;
uniform float uTwinkle;
uniform float uHead;
uniform float uDepth;
uniform vec4 uMouse;
uniform vec3 uLens;
uniform float uLightMode;
uniform float uEncode;
out vec4 outColor;

const vec3 CAMERA = vec3(0.0, -0.8888889, -0.2222222);
const float TAU = 6.28318530718;
const float SPACING = 0.005;
const float REACH = 0.32;

uint scramble(uint x) {
  x ^= x >> 16;
  x *= 0x7feb352du;
  x ^= x >> 15;
  x *= 0x846ca68bu;
  x ^= x >> 16;
  return x;
}

float unit(uint x) {
  return float(x & 0xffffu) / 65535.0;
}

float stroke(float d, float w) {
  float s = max(0.75 * w, 0.55);
  return 0.75 * w / s * exp(-0.5 * d * d / (s * s));
}

float orb(float d, float r) {
  float s = max(0.6 * r, 0.7);
  float e = 0.6 * r / s;
  return e * e * exp(-0.5 * d * d / (s * s));
}

void main() {
  vec2 frag = gl_FragCoord.xy;
  vec2 screen = (2.0 * frag - uView) / uView.x;
  vec2 p = screen;
  mat2 warp = mat2(1.0);
  if (uLens.z > 0.0) {
    vec2 o = p - uLens.xy;
    float e = uLens.z * exp(-dot(o, o) / (REACH * REACH));
    p -= o * e;
    warp = mat2(1.0 - e) + outerProduct(o, o) * (2.0 * e / (REACH * REACH));
  }

  vec3 dir = vec3(p, uZoom);
  vec3 exits = (1.0 - CAMERA * sign(dir)) / max(abs(dir), vec3(1e-6));
  float u = min(exits.x, min(exits.y, exits.z));
  for (int i = 0; i < 5; i++) {
    vec3 h = CAMERA + u * dir;
    vec3 h2 = h * h;
    u -= (dot(h2, h2) - 1.0) / (4.0 * dot(dir, h2 * h));
  }
  vec3 hit = CAMERA + u * dir;
  vec3 normal = hit * hit * hit;
  float facing = dot(normal, dir);
  vec3 stepX = u * (vec3(1.0, 0.0, 0.0) - dir * (normal.x / facing));
  vec3 stepY = u * (vec3(0.0, 1.0, 0.0) - dir * (normal.y / facing));
  float ring = hit.y * hit.y + hit.z * hit.z;
  float theta = atan(hit.z, hit.y);
  mat2 jacobian = mat2(
    stepX.x,
    (hit.y * stepX.z - hit.z * stepX.y) / ring,
    stepY.x,
    (hit.y * stepY.z - hit.z * stepY.y) / ring
  ) * warp * (2.0 / uView.x);

  vec2 gradX = vec2(jacobian[0][0], jacobian[1][0]);
  vec2 gradTheta = vec2(jacobian[0][1], jacobian[1][1]);
  float scale = max(length(gradX), 1e-8);
  float det = max(abs(gradX.x * gradTheta.y - gradX.y * gradTheta.x), 1e-12);
  float along = scale / det;
  float skew = dot(gradX, gradTheta) / det;
  float spacing = SPACING / scale;
  float detail = smoothstep(1.6, 3.2, spacing);
  if (detail <= 0.0) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }
  float halfWidth = min(uWidth / scale, 0.2 * spacing);
  float headRadius = min(2.0 * uWidth / scale, 0.35 * spacing);
  float headReach = 4.0 * max(0.6 * headRadius, 0.7);
  float edge = uColumns > 1 ? 1.0 : 0.5;
  float period = TAU / uRings;
  float fog = exp(-max(u * length(dir) - 1.0, 0.0) * uDepth);
  float boost = mix(1.0, 1.8, uLightMode);

  if (fog < 0.01) {
    outColor = vec4(0.0, 0.0, 0.0, 1.0);
    return;
  }

  int count = max(uColorCount, 1);
  vec3 total = vec3(0.0);
  for (int layer = 0; layer < 16; layer++) {
    if (layer >= uStreakCount) break;
    float x = hit.x + float(layer) * SPACING / 8.0;
    float nearest = floor(x / SPACING + 0.5);
    float side = x >= nearest * SPACING ? 1.0 : -1.0;
    for (int k = 0; k < 2; k++) {
      if (k >= uColumns) break;
      float column = nearest + side * float(k);
      float across = (x - column * SPACING) / scale;
      uint seed = scramble(uint(int(column) + 65536) + uint(layer) * 0x9e3779b9u);
      uint next = scramble(seed);
      float hue = unit(seed >> 16);
      float delta = theta - uPhase * (1.0 + floor(unit(seed) * 16.0) / 16.0) - unit(next) * period;
      delta -= period * floor(delta / period + 0.5);
      float ahead = delta * along - across * skew;
      if (abs(ahead) > headReach && (delta > 0.0 || -delta * uTail > 3.2)) continue;
      float behind = max(-delta, 0.0);
      float fall = exp(-uTail * behind) * (1.0 - smoothstep(0.5, 0.95, behind / (0.5 * period)));
      fall *= 1.0 - smoothstep(1.2, 3.2, uTail * behind);
      float reach = length(vec2(across, ahead));
      float trail = stroke(ahead > 0.0 ? reach : abs(across), halfWidth * mix(0.4, 1.0, fall)) * fall;
      float glint = orb(reach, headRadius) * mix(3.0, 1.8, uLightMode);
      float weight = mix(1.5, 1.0 + sin(uTwinkleClock + 7.0 * hue + 4.0), uTwinkle);
      weight *= 1.0 - smoothstep(0.72 * edge, edge, abs(across) / spacing);
      vec3 color = uColors[min(int(hue * float(count)), count - 1)];
      vec3 hot = mix(color, vec3(1.0), uHead * (1.0 - uLightMode));
      total += (trail * color + glint * hot) * weight;
    }
  }

  outColor = vec4(total * fog * boost * detail * uEncode, 1.0);
}`;

const DOWNSAMPLE = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTarget;
uniform vec2 uTexel;
uniform float uLimit;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec3 color = texture(uSource, uv - uTexel).rgb;
  color += texture(uSource, uv + uTexel).rgb;
  color += texture(uSource, uv + vec2(uTexel.x, -uTexel.y)).rgb;
  color += texture(uSource, uv + vec2(-uTexel.x, uTexel.y)).rgb;
  outColor = vec4(min(color * 0.25, vec3(uLimit)), 1.0);
}`;

const BLUR = `#version 300 es
precision highp float;
uniform sampler2D uSource;
uniform vec2 uTarget;
uniform vec2 uStep;
out vec4 outColor;

void main() {
  vec2 uv = gl_FragCoord.xy / uTarget;
  vec3 color = texture(uSource, uv).rgb * 0.181862;
  color += (texture(uSource, uv + uStep * 1.423135).rgb + texture(uSource, uv - uStep * 1.423135).rgb) * 0.284316;
  color += (texture(uSource, uv + uStep * 3.326702).rgb + texture(uSource, uv - uStep * 3.326702).rgb) * 0.106598;
  color += (texture(uSource, uv + uStep * 5.242989).rgb + texture(uSource, uv - uStep * 5.242989).rgb) * 0.018156;
  outColor = vec4(color, 1.0);
}`;

const COMPOSITE = `#version 300 es
precision highp float;
uniform sampler2D uScene;
uniform sampler2D uBloom0;
uniform sampler2D uBloom1;
uniform vec2 uView;
uniform float uDecode;
uniform float uGlow;
uniform float uBloom;
uniform float uPresence;
uniform float uOpacity;
uniform float uFade;
uniform float uLightMode;
uniform vec3 uTopColor;
uniform float uTopGlow;
out vec4 outColor;

float smootherstep01(float t) {
  t = clamp(t, 0.0, 1.0);
  return t * t * t * (t * (t * 6.0 - 15.0) + 10.0);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uView;
  vec3 light = texelFetch(uScene, ivec2(gl_FragCoord.xy), 0).rgb;
  if (uBloom > 0.0) {
    vec3 halo = texture(uBloom0, uv).rgb * 0.55;
    halo += texture(uBloom1, uv).rgb * 0.35;
    light += halo * uBloom * (uLightMode > 0.5 ? 0.2 : 1.0);
  }
  light *= uDecode * uGlow * uPresence;

  if (uLightMode < 0.5 && uTopGlow > 0.0) {
    float aspect = uView.x / uView.y;
    vec2 q = vec2((uv.x - 0.5) * aspect, 1.04 - uv.y);
    float spread = 0.34 * max(aspect, 0.75);
    float core = exp(-q.x * q.x / (spread * spread) - q.y * q.y / 0.06);
    float halo = exp(-q.x * q.x / (3.6 * spread * spread) - q.y * q.y / 0.18);
    light += uTopColor * uTopGlow * (core * 0.85 + halo * 0.3) * uPresence;
  }

  vec3 lit = max(light, 0.0);
  vec3 mapped = sqrt(1.0 - exp(-1.3 * lit * lit / (lit + 0.025)));
  float peak = max(mapped.r, max(mapped.g, mapped.b));

  float mask = uOpacity;
  float edge = uFade * 0.5;
  if (edge > 0.0) {
    mask *= smootherstep01(uv.x / edge) * smootherstep01((1.0 - uv.x) / edge);
    mask *= smootherstep01(uv.y / edge) * smootherstep01((1.0 - uv.y) / edge);
  }
  float grain = (fract(52.9829189 * fract(dot(gl_FragCoord.xy, vec2(0.06711056, 0.00583715)))) - 0.5) / 255.0;

  if (uLightMode > 0.5) {
    float coverage = clamp(smoothstep(0.0, 0.5, peak) * mask * 0.94 + grain, 0.0, 1.0);
    vec3 chroma = sqrt(clamp(lit / max(max(lit.r, max(lit.g, lit.b)), 1e-6), 0.0, 1.0));
    chroma = pow(chroma, vec3(1.35));
    chroma /= max(max(chroma.r, max(chroma.g, chroma.b)), 1e-4);
    float saturation = 1.0 - min(chroma.r, min(chroma.g, chroma.b));
    chroma = mix(vec3(0.3), chroma, smoothstep(0.08, 0.35, saturation));
    outColor = vec4(chroma * coverage, coverage);
  } else {
    vec3 color = clamp(mapped + grain, 0.0, 1.0) * mask;
    outColor = vec4(color, max(color.r, max(color.g, color.b)));
  }
}`;

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const compile = (gl, type, source) => {
  try {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (gl.getShaderParameter(shader, gl.COMPILE_STATUS)) return shader;
    console.warn('[Lightfall WebGL] Shader compile warning:', gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  } catch (err) {
    console.warn('[Lightfall WebGL] Shader error:', err);
    return null;
  }
};

const link = (gl, fragmentSource) => {
  try {
    const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fragment = compile(gl, gl.FRAGMENT_SHADER, fragmentSource);
    const program = gl.createProgram();
    if (!vertex || !fragment || !program) return null;
    gl.attachShader(program, vertex);
    gl.attachShader(program, fragment);
    gl.bindAttribLocation(program, 0, 'aPosition');
    gl.linkProgram(program);
    gl.deleteShader(vertex);
    gl.deleteShader(fragment);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.warn('[Lightfall WebGL] Link warning:', gl.getProgramInfoLog(program));
      gl.deleteProgram(program);
      return null;
    }
    const uniforms = {};
    const count = gl.getProgramParameter(program, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < count; i++) {
      const info = gl.getActiveUniform(program, i);
      if (info) uniforms[info.name.replace(/\[0\]$/, '')] = gl.getUniformLocation(program, info.name);
    }
    return { program, uniforms };
  } catch (err) {
    console.warn('[Lightfall WebGL] Program error:', err);
    return null;
  }
};

function hexToLinear(hex) {
  let clean = String(hex || '#ffffff').replace('#', '');
  if (clean.length === 3) clean = clean.split('').map(c => c + c).join('');
  const num = parseInt(clean, 16);
  if (isNaN(num)) return [1, 1, 1];
  const r = ((num >> 16) & 255) / 255;
  const g = ((num >> 8) & 255) / 255;
  const b = (num & 255) / 255;
  return [r * r, g * g, b * b];
}

export default function Lightfall({
  colors = ['#ffffff', '#e2e8f0', '#94a3b8'],
  backgroundColor = '#020617',
  speed = 0.25,
  streakCount = 6,
  streakWidth = 0.8,
  streakLength = 1.0,
  glow = 1.0,
  density = 0.5,
  twinkle = 0.3,
  zoom = 2.4,
  backgroundGlow = 0.1,
  headGlow = 0.6,
  depth = 0.5,
  bloom = 0.4,
  opacity = 1.0,
  intensity = 1.0,
  mouseInteraction = true,
  mouseStrength = 0.3,
  mouseRadius = 0.4,
  mouseDampening = 0.15,
  lens = 0.5,
  holdToWarp = false,
  intro = true,
  fade = 0.1,
  lightMode = false,
  paused = false,
  dpr = 1,
  className = '',
  style,
  mixBlendMode
}) {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  const [useCanvas2D, setUseCanvas2D] = useState(false);

  const cachedPalette = useRef(new Float32Array(MAX_COLORS * 3));
  const cachedColorCount = useRef(0);
  const cachedTopColor = useRef(new Float32Array(3));
  const settingsRef = useRef({});

  useEffect(() => {
    cachedTopColor.current = hexToLinear(backgroundColor);
    const list = (Array.isArray(colors) && colors.length ? colors : ['#ffffff'])
      .slice(0, MAX_COLORS)
      .map(hexToLinear);
    cachedColorCount.current = list.length;
    cachedPalette.current.fill(0);
    for (let i = 0; i < MAX_COLORS; i++) {
      cachedPalette.current.set(list[Math.min(i, list.length - 1)], i * 3);
    }
  }, [colors, backgroundColor]);

  settingsRef.current = {
    intensity,
    speed: speed * Math.max(0.2, intensity),
    streakCount: Math.round(clamp(streakCount * intensity, 1, 16)),
    streakWidth: Math.max(0.05, streakWidth),
    streakLength: Math.max(0.05, streakLength),
    glow: Math.max(0, glow * intensity),
    density: clamp(density * intensity, 0.05, 1.0),
    twinkle: clamp(twinkle, 0, 1),
    zoom: Math.max(0.1, zoom),
    backgroundGlow: Math.max(0, backgroundGlow * intensity),
    headGlow: clamp(headGlow, 0, 1),
    depth: Math.max(0, depth),
    bloom: Math.max(0, bloom * intensity),
    opacity: clamp(opacity, 0, 1),
    mouseInteraction,
    mouseStrength: Math.max(0, mouseStrength),
    mouseRadius: Math.max(0.01, mouseRadius),
    mouseDampening: Math.max(0, mouseDampening),
    lens: clamp(lens, 0, 1),
    holdToWarp,
    intro,
    fade: clamp(fade, 0, 1),
    lightMode,
    paused,
    dpr: Math.min(dpr || 1, 1.25)
  };

  // ── Engine 1: WebGL2 Shader Pipeline ──
  useEffect(() => {
    if (useCanvas2D) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    let gl = null;
    try {
      gl = canvas.getContext('webgl2', {
        alpha: true,
        premultipliedAlpha: true,
        antialias: false,
        depth: false,
        stencil: false,
        powerPreference: 'high-performance'
      });
    } catch (e) {
      setUseCanvas2D(true);
      return;
    }

    if (!gl) {
      setUseCanvas2D(true);
      return;
    }

    const floatTargets = !!gl.getExtension('EXT_color_buffer_float');
    const streakProgram = link(gl, STREAKS);
    const downProgram = link(gl, DOWNSAMPLE);
    const blurProgram = link(gl, BLUR);
    const compositeProgram = link(gl, COMPOSITE);

    if (!streakProgram || !downProgram || !blurProgram || !compositeProgram) {
      setUseCanvas2D(true);
      return;
    }

    const onContextLost = event => {
      event.preventDefault();
      setUseCanvas2D(true);
    };
    canvas.addEventListener('webglcontextlost', onContextLost);

    const buffer = gl.createBuffer();
    const vao = gl.createVertexArray();
    gl.bindVertexArray(vao);
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const format = floatTargets ? gl.RGBA16F : gl.RGBA8;
    const encode = floatTargets ? 1 : 0.25;
    const createTarget = () => ({ texture: null, framebuffer: gl.createFramebuffer(), width: 0, height: 0 });
    const scene = createTarget();
    const levels = Array.from({ length: BLOOM_LEVELS }, () => [createTarget(), createTarget()]);

    const allocate = (target, width, height) => {
      if (width <= 0 || height <= 0) return;
      if (target.texture && target.width === width && target.height === height) return;
      if (target.texture) gl.deleteTexture(target.texture);
      target.texture = gl.createTexture();
      target.width = width;
      target.height = height;
      gl.bindTexture(gl.TEXTURE_2D, target.texture);
      gl.texStorage2D(gl.TEXTURE_2D, 1, format, width, height);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
      gl.bindFramebuffer(gl.FRAMEBUFFER, target.framebuffer);
      gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, target.texture, 0);
    };

    const pass = (target, program) => {
      gl.bindFramebuffer(gl.FRAMEBUFFER, target ? target.framebuffer : null);
      gl.viewport(0, 0, target ? target.width : canvas.width, target ? target.height : canvas.height);
      gl.useProgram(program.program);
      return program.uniforms;
    };

    const bind = (unit, texture) => {
      gl.activeTexture(gl.TEXTURE0 + unit);
      gl.bindTexture(gl.TEXTURE_2D, texture);
    };

    const pointer = { x: 0, y: 0, inside: false, held: false };
    const state = {
      travel: 0,
      intro: 1,
      mouseX: 0,
      mouseY: 0,
      lensX: 0,
      lensY: 0,
      touch: 0,
      warp: 0
    };
    let raf = 0;
    let last = 0;
    let visible = true;

    const render = () => {
      if (gl.isContextLost()) return;
      const s = settingsRef.current;
      const width = Math.max(1, canvas.width);
      const height = Math.max(1, canvas.height);
      const cssWidth = Math.max(1, container.clientWidth);
      const cssHeight = Math.max(1, container.clientHeight);

      gl.bindVertexArray(vao);
      allocate(scene, width, height);
      levels.forEach((pair, index) => {
        const levelWidth = Math.max(1, Math.round(cssWidth / 2 ** (index + 1)));
        const levelHeight = Math.max(1, Math.round(cssHeight / 2 ** (index + 1)));
        allocate(pair[0], levelWidth, levelHeight);
        allocate(pair[1], levelWidth, levelHeight);
      });

      const rings = Math.max(1, Math.floor(Math.PI * 2 * Math.max(s.density, 0.05) + 0.5));
      const r = pass(scene, streakProgram);
      gl.uniform2f(r.uView, width, height);
      gl.uniform1f(r.uZoom, s.zoom);
      gl.uniform1f(r.uPhase, state.travel);
      gl.uniform1f(r.uTwinkleClock, state.travel * 3);
      gl.uniform1f(r.uRings, rings);
      gl.uniform3fv(r.uColors, cachedPalette.current);
      gl.uniform1i(r.uColorCount, cachedColorCount.current);
      gl.uniform1i(r.uStreakCount, s.streakCount);
      gl.uniform1i(r.uColumns, 2);
      gl.uniform1f(r.uWidth, s.streakWidth);
      gl.uniform1f(r.uTail, s.streakLength);
      gl.uniform1f(r.uTwinkle, s.twinkle);
      gl.uniform1f(r.uHead, s.headGlow);
      gl.uniform1f(r.uDepth, s.depth);
      gl.uniform4f(r.uMouse, state.mouseX, state.mouseY, pointer.inside ? 1 : 0, pointer.held ? 1 : 0);
      gl.uniform3f(
        r.uLens,
        (2 * state.lensX - width) / width,
        (2 * state.lensY - height) / width,
        s.mouseInteraction ? 0.5 * s.lens * state.touch : 0
      );
      gl.uniform1f(r.uLightMode, s.lightMode ? 1 : 0);
      gl.uniform1f(r.uEncode, encode);
      gl.drawArrays(gl.TRIANGLES, 0, 3);

      if (s.bloom > 0 && levels[0][0].texture) {
        let source = scene;
        levels.forEach(([front, back]) => {
          if (!front.texture || !back.texture) return;
          const d = pass(front, downProgram);
          bind(0, source.texture);
          gl.uniform1i(d.uSource, 0);
          gl.uniform2f(d.uTarget, front.width, front.height);
          gl.uniform2f(d.uTexel, 1 / source.width, 1 / source.height);
          gl.uniform1f(d.uLimit, 4 * encode);
          gl.drawArrays(gl.TRIANGLES, 0, 3);

          let b = pass(back, blurProgram);
          bind(0, front.texture);
          gl.uniform1i(b.uSource, 0);
          gl.uniform2f(b.uTarget, back.width, back.height);
          gl.uniform2f(b.uStep, 1 / front.width, 0);
          gl.drawArrays(gl.TRIANGLES, 0, 3);

          b = pass(front, blurProgram);
          bind(0, back.texture);
          gl.uniform1i(b.uSource, 0);
          gl.uniform2f(b.uTarget, front.width, front.height);
          gl.uniform2f(b.uStep, 0, 1 / back.height);
          gl.drawArrays(gl.TRIANGLES, 0, 3);
          source = front;
        });
      }

      const c = pass(null, compositeProgram);
      bind(0, scene.texture);
      gl.uniform1i(c.uScene, 0);
      levels.forEach(([front], index) => {
        if (front.texture) {
          bind(index + 1, front.texture);
          gl.uniform1i(c[`uBloom${index}`], index + 1);
        }
      });
      gl.uniform2f(c.uView, width, height);
      gl.uniform1f(c.uDecode, 1 / encode);
      gl.uniform1f(c.uGlow, s.glow);
      gl.uniform1f(c.uBloom, s.bloom);
      gl.uniform1f(c.uPresence, 1.0);
      gl.uniform1f(c.uOpacity, s.opacity);
      gl.uniform1f(c.uFade, s.fade);
      gl.uniform1f(c.uLightMode, s.lightMode ? 1 : 0);
      gl.uniform3fv(c.uTopColor, cachedTopColor.current);
      gl.uniform1f(c.uTopGlow, s.backgroundGlow);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
      for (let unit = BLOOM_LEVELS; unit >= 0; unit--) bind(unit, null);
    };

    const frame = now => {
      raf = 0;
      if (!visible || settingsRef.current.paused) return;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 0;
      last = now;
      state.travel += dt * settingsRef.current.speed;

      try {
        render();
      } catch (renderErr) {
        setUseCanvas2D(true);
        return;
      }

      raf = requestAnimationFrame(frame);
    };

    const resize = () => {
      const s = settingsRef.current;
      const width = Math.max(1, container.clientWidth);
      const height = Math.max(1, container.clientHeight);
      const ratio = Math.min(s.dpr || 1, 1.25);
      canvas.width = Math.max(1, Math.round(width * ratio));
      canvas.height = Math.max(1, Math.round(height * ratio));
      if (!raf && visible && !settingsRef.current.paused) raf = requestAnimationFrame(frame);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const visibilityObserver = new IntersectionObserver(([entry]) => {
      const isNowVisible = entry.isIntersecting;
      if (isNowVisible && !visible) {
        visible = true;
        last = 0;
        if (!raf && !settingsRef.current.paused) raf = requestAnimationFrame(frame);
      } else if (!isNowVisible && visible) {
        visible = false;
        if (raf) {
          cancelAnimationFrame(raf);
          raf = 0;
        }
      }
    }, { threshold: 0.05 });
    visibilityObserver.observe(container);

    resize();

    return () => {
      cancelAnimationFrame(raf);
      canvas.removeEventListener('webglcontextlost', onContextLost);
      resizeObserver.disconnect();
      visibilityObserver.disconnect();
      try {
        [scene, ...levels.flat()].forEach(target => {
          if (target.texture) gl.deleteTexture(target.texture);
          gl.deleteFramebuffer(target.framebuffer);
        });
        [streakProgram, downProgram, blurProgram, compositeProgram].forEach(item => gl.deleteProgram(item.program));
        gl.deleteBuffer(buffer);
        gl.deleteVertexArray(vao);
      } catch (cleanupErr) {
        // Safe unmount
      }
    };
  }, [useCanvas2D]);

  // ── Engine 2: High-Performance Monochromatic Canvas2D Fallback ──
  useEffect(() => {
    if (!useCanvas2D) return;

    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId = 0;
    let t = 0;

    const monoPalette = ['#ffffff', '#f1f5f9', '#e2e8f0', '#cbd5e1', '#94a3b8'];

    const rays = Array.from({ length: 20 }, (_, i) => ({
      angle: (i / 20) * Math.PI * 2,
      speed: 0.12 + (i % 4) * 0.05,
      width: 1.2 + (i % 3) * 1.2,
      lengthRatio: 0.35 + (i % 4) * 0.15,
      color: monoPalette[i % monoPalette.length]
    }));

    let is2dVisible = true;
    const render2D = () => {
      rafId = 0;
      if (!is2dVisible || settingsRef.current?.paused) return;
      const w = canvas.width;
      const h = canvas.height;
      if (w <= 0 || h <= 0) return;

      ctx.clearRect(0, 0, w, h);

      const cx = w * 0.5;
      const cy = h * 0.45;
      const maxR = Math.max(w, h) * 0.75;

      const bgGrad = ctx.createRadialGradient(cx, cy, 10, cx, cy, maxR);
      if (lightMode) {
        bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.25)');
        bgGrad.addColorStop(0.4, 'rgba(226, 232, 240, 0.12)');
        bgGrad.addColorStop(1, 'rgba(248, 250, 252, 0)');
      } else {
        bgGrad.addColorStop(0, 'rgba(255, 255, 255, 0.15)');
        bgGrad.addColorStop(0.35, 'rgba(148, 163, 184, 0.06)');
        bgGrad.addColorStop(1, 'rgba(2, 6, 23, 0)');
      }
      ctx.fillStyle = bgGrad;
      ctx.fillRect(0, 0, w, h);

      t += 0.01;
      ctx.save();
      ctx.translate(cx, cy);

      rays.forEach((ray, i) => {
        const curAngle = ray.angle + Math.sin(t * ray.speed + i) * 0.06;
        const r1 = 30 + Math.sin(t * 1.8 + i) * 12;
        const r2 = r1 + maxR * ray.lengthRatio;

        const x1 = Math.cos(curAngle) * r1;
        const y1 = Math.sin(curAngle) * r1 * 0.6;
        const x2 = Math.cos(curAngle) * r2;
        const y2 = Math.sin(curAngle) * r2 * 0.6;

        const grad = ctx.createLinearGradient(x1, y1, x2, y2);
        grad.addColorStop(0, 'rgba(255, 255, 255, 0)');
        grad.addColorStop(0.3, ray.color);
        grad.addColorStop(1, 'rgba(0, 0, 0, 0)');

        ctx.strokeStyle = grad;
        ctx.lineWidth = ray.width;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 40);
      coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
      coreGrad.addColorStop(0.5, 'rgba(255, 255, 255, 0.25)');
      coreGrad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = coreGrad;
      ctx.beginPath();
      ctx.arc(0, 0, 40, 0, Math.PI * 2);
      ctx.fill();

      ctx.restore();

      rafId = requestAnimationFrame(render2D);
    };

    const resize = () => {
      canvas.width = Math.max(1, container.clientWidth);
      canvas.height = Math.max(1, container.clientHeight);
      if (!rafId && is2dVisible && !settingsRef.current?.paused) rafId = requestAnimationFrame(render2D);
    };

    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(container);

    const visibility2DObserver = new IntersectionObserver(([entry]) => {
      const isNowVisible = entry.isIntersecting;
      if (isNowVisible && !is2dVisible) {
        is2dVisible = true;
        if (!rafId && !settingsRef.current?.paused) rafId = requestAnimationFrame(render2D);
      } else if (!isNowVisible && is2dVisible) {
        is2dVisible = false;
        if (rafId) {
          cancelAnimationFrame(rafId);
          rafId = 0;
        }
      }
    }, { threshold: 0.05 });
    visibility2DObserver.observe(container);

    resize();

    return () => {
      cancelAnimationFrame(rafId);
      resizeObserver.disconnect();
      visibility2DObserver.disconnect();
    };
  }, [useCanvas2D, lightMode]);

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full overflow-hidden select-none pointer-events-auto ${className}`}
      style={{ ...(mixBlendMode ? { mixBlendMode } : null), ...style }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full pointer-events-none" aria-hidden="true" />
    </div>
  );
}
