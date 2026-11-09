import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const INDEX_SRC = fs.readFileSync(path.resolve(__dirname, '../index.js'), 'utf8').replace(/\r\n/g, '\n');

function extractProxyHelpers() {
  const isTrustedStart = INDEX_SRC.indexOf('export function isTrustedProxyIp');
  assert.notEqual(isTrustedStart, -1, 'isTrustedProxyIp must exist');
  const isTrustedEnd = INDEX_SRC.indexOf('\n}\n', isTrustedStart);
  assert.notEqual(isTrustedEnd, -1, 'end of isTrustedProxyIp not found');

  const extractIpStart = INDEX_SRC.indexOf('export function extractClientIp');
  assert.notEqual(extractIpStart, -1, 'extractClientIp must exist');
  const extractIpEnd = INDEX_SRC.indexOf('\n}\n', extractIpStart);
  assert.notEqual(extractIpEnd, -1, 'end of extractClientIp not found');

  const code = `
    ${INDEX_SRC.slice(isTrustedStart, isTrustedEnd + 3).replace('export function', 'function')}
    ${INDEX_SRC.slice(extractIpStart, extractIpEnd + 3).replace('export function', 'function')}
    return { isTrustedProxyIp, extractClientIp };
  `;
  return new Function(code)();
}

const { isTrustedProxyIp, extractClientIp } = extractProxyHelpers();

test('isTrustedProxyIp correctly identifies loopback, private networks, and Cloudflare edge IPs', () => {
  // Loopback
  assert.equal(isTrustedProxyIp('127.0.0.1'), true);
  assert.equal(isTrustedProxyIp('::1'), true);
  assert.equal(isTrustedProxyIp('localhost'), true);

  // Private Subnets (Docker, Caddy, Internal Load Balancers)
  assert.equal(isTrustedProxyIp('10.0.0.5'), true);
  assert.equal(isTrustedProxyIp('192.168.1.100'), true);
  assert.equal(isTrustedProxyIp('172.17.0.1'), true); // Docker default bridge
  assert.equal(isTrustedProxyIp('172.28.0.2'), true);

  // Cloudflare Edge CIDRs
  assert.equal(isTrustedProxyIp('172.70.1.1'), true);
  assert.equal(isTrustedProxyIp('104.16.50.1'), true);
  assert.equal(isTrustedProxyIp('173.245.49.2'), true);
  assert.equal(isTrustedProxyIp('2606:4700:3037::ac43:8e5a'), true); // Cloudflare native IPv6

  // Untrusted public clients
  assert.equal(isTrustedProxyIp('203.0.113.195'), false);
  assert.equal(isTrustedProxyIp('8.8.8.8'), false);
  assert.equal(isTrustedProxyIp('2001:db8::1'), false);
  assert.equal(isTrustedProxyIp(''), false);
  assert.equal(isTrustedProxyIp(null), false);
});

test('extractClientIp resolves real user IP behind Cloudflare edge while preventing loopback spoofing', () => {
  // Scenario 1: Request arrives from Cloudflare edge 172.70.1.1 with cf-connecting-ip
  const req1 = {
    socket: { remoteAddress: '::ffff:172.70.1.1' },
    headers: { 'cf-connecting-ip': '203.0.113.7' }
  };
  assert.equal(extractClientIp(req1), '203.0.113.7');

  // Scenario 2: Attacker attempts to spoof loopback via cf-connecting-ip
  const req2 = {
    socket: { remoteAddress: '172.70.1.1' },
    headers: { 'cf-connecting-ip': '127.0.0.1' }
  };
  // Must NOT claim 127.0.0.1; must fall back to the peer socket IP
  assert.equal(extractClientIp(req2), '172.70.1.1');

  // Scenario 3: Untrusted direct public client attempts to spoof x-forwarded-for
  const req3 = {
    socket: { remoteAddress: '203.0.113.195' },
    headers: { 'x-forwarded-for': '198.51.100.9' }
  };
  // Must ignore header and return direct socket IP
  assert.equal(extractClientIp(req3), '203.0.113.195');

  // Scenario 4: Request arrives from Cloudflare edge over native IPv6
  const req4 = {
    socket: { remoteAddress: '2606:4700:3037::ac43:8e5a' },
    headers: { 'cf-connecting-ip': '198.51.100.55' }
  };
  assert.equal(extractClientIp(req4), '198.51.100.55');

  // Scenario 5: External IPv6 address ending in :1 attempting to spoof
  const req5 = {
    socket: { remoteAddress: '2001:db8:85a3::1' },
    headers: { 'x-forwarded-for': '10.0.0.1' }
  };
  // Must not treat as loopback; must return the direct socket IP
  assert.equal(extractClientIp(req5), '2001:db8:85a3::1');
});
