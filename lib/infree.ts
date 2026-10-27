/**
 * InfinityFree / similar: JS sets __test cookie via AES, then redirects.
 * We decrypt the same way and retry with Cookie.
 */
import crypto from 'crypto';

const CHALLENGE_RE =
  /var a=toNumbers\("([0-9a-f]+)"\),b=toNumbers\("([0-9a-f]+)"\),c=toNumbers\("([0-9a-f]+)"\)/i;

export function extractInfreeCookie(html: string): string | null {
  const m = html.match(CHALLENGE_RE);
  if (!m) return null;
  try {
    const key = Buffer.from(m[1], 'hex');
    const iv = Buffer.from(m[2], 'hex');
    const data = Buffer.from(m[3], 'hex');
    const decipher = crypto.createDecipheriv('aes-128-cbc', key, iv);
    decipher.setAutoPadding(false);
    const out = Buffer.concat([decipher.update(data), decipher.final()]);
    return out.toString('hex');
  } catch {
    return null;
  }
}

export function isInfreeChallenge(html: string): boolean {
  return html.includes('slowAES') || (html.includes('/aes.js') && html.includes('__test'));
}
