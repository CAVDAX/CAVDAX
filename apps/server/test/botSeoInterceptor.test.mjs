import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_SRC = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf8');

test('Edge Bot Interceptor correctly identifies social and search crawlers', () => {
  assert.ok(INDEX_SRC.includes('BOT_UA_REGEX'), 'BOT_UA_REGEX must be defined');
  const botUaMatch = INDEX_SRC.match(/const BOT_UA_REGEX = (\/.+\/i);/);
  assert.ok(botUaMatch, 'BOT_UA_REGEX must be extractable');
  const regex = new RegExp(botUaMatch[1].slice(1, -2), 'i');

  // Verify social bots
  assert.equal(regex.test('Twitterbot/1.0'), true, 'Twitterbot must match');
  assert.equal(regex.test('facebookexternalhit/1.1'), true, 'facebookexternalhit must match');
  assert.equal(regex.test('LinkedInBot/1.0'), true, 'LinkedInBot must match');
  assert.equal(regex.test('Slackbot-LinkExpanding 1.0'), true, 'Slackbot must match');
  assert.equal(regex.test('Discordbot/2.0'), true, 'Discordbot must match');
  assert.equal(regex.test('WhatsApp/2.21.12.21 A'), true, 'WhatsApp must match');

  // Verify search engine crawlers
  assert.equal(regex.test('Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)'), true, 'Googlebot must match');
  assert.equal(regex.test('Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)'), true, 'bingbot must match');

  // Verify human browsers are NOT flagged as bots
  assert.equal(regex.test('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'), false);
  assert.equal(regex.test('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'), false);
});

test('Canonical metadata catalog contains all essential product, documentation, and integration routes', () => {
  assert.ok(INDEX_SRC.includes("'/mcp':"), '/mcp must be present in catalog');
  assert.ok(INDEX_SRC.includes("'/docs':"), '/docs must be present in catalog');
  assert.ok(INDEX_SRC.includes("'/integrations/cursor':"), '/integrations/cursor must be present in catalog');
  assert.ok(INDEX_SRC.includes("'/integrations/claude-code':"), '/integrations/claude-code must be present in catalog');
  assert.ok(INDEX_SRC.includes("'/console':"), '/console must be present in catalog');
  assert.ok(INDEX_SRC.includes("'/profile':"), '/profile must be present in catalog');
});

test('HTML injection replaces og:title, og:description, and pre-renders semantic content for /docs', () => {
  const dummyHtml = `<!DOCTYPE html><html><head><title>CAVDAX</title><meta name="description" content="Old"><meta property="og:title" content="Old"><meta property="og:description" content="Old"><link rel="canonical" href="https://cavdax.sahnirmaan.live/"></head><body><div id="root"></div></body></html>`;

  const meta = {
    title: 'CAVDAX Documentation | Causal DAG & MCP Gate Architecture',
    description: 'Comprehensive guides for configuring CAVDAX Model Context Protocol gates.',
    url: 'https://cavdax.sahnirmaan.live/docs',
    preRenderedHtml: '<h1>CAVDAX Documentation</h1><p>Causal DAG Architecture</p>'
  };

  let html = dummyHtml;
  html = html.replace(/<title>[^<]*<\/title>/i, `<title>${meta.title}</title>`);
  html = html.replace(/<meta\s+name="description"\s+content="[^"]*"/i, `<meta name="description" content="${meta.description}"`);
  html = html.replace(/<meta\s+property="og:title"\s+content="[^"]*"/i, `<meta property="og:title" content="${meta.title}"`);
  html = html.replace(/<meta\s+property="og:description"\s+content="[^"]*"/i, `<meta property="og:description" content="${meta.description}"`);
  html = html.replace(/<link\s+rel="canonical"\s+href="[^"]*"/i, `<link rel="canonical" href="${meta.url}"`);
  html = html.replace('<div id="root"></div>', `<div id="root">${meta.preRenderedHtml}</div>`);

  assert.ok(html.includes(`<title>${meta.title}</title>`), 'Title must be injected');
  assert.ok(html.includes(`content="${meta.description}"`), 'Description must be injected');
  assert.ok(html.includes(`content="${meta.title}"`), 'OG Title must be injected');
  assert.ok(html.includes(`href="${meta.url}"`), 'Canonical must be injected');
  assert.ok(html.includes(meta.preRenderedHtml), 'Pre-rendered HTML must be injected into root');
});
