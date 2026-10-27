import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { expandToFeedUrls, getSourceEntries } from './sources';
import { extractInfreeCookie, isInfreeChallenge } from './infree';
import fs from 'fs';
import path from 'path';

export type FeedItem = {
  title: string;
  link: string;
  guid: string;
  description: string;
  pubDate?: string;
  source?: string;
};

const PUSH_FILE = process.env.PUSH_STORE_PATH || path.join('/tmp', 'streamlive-rss-push.json');

function loadPushedItems(): FeedItem[] {
  try {
    if (!fs.existsSync(PUSH_FILE)) return [];
    const j = JSON.parse(fs.readFileSync(PUSH_FILE, 'utf8'));
    return Array.isArray(j.items) ? j.items : [];
  } catch {
    return [];
  }
}

export function savePushedItems(items: FeedItem[]): void {
  const prev = loadPushedItems();
  const map = new Map<string, FeedItem>();
  for (const it of [...prev, ...items]) {
    const k = (it.guid || it.link || it.title).trim();
    if (k) map.set(k, it);
  }
  const merged = Array.from(map.values())
    .sort((a, b) => (Date.parse(b.pubDate || '0') || 0) - (Date.parse(a.pubDate || '0') || 0))
    .slice(0, 500);
  fs.writeFileSync(
    PUSH_FILE,
    JSON.stringify({ updatedAt: new Date().toISOString(), items: merged }, null, 0),
    'utf8'
  );
}

async function fetchText(
  url: string,
  timeoutMs = 15000,
  cookie?: string
): Promise<{ body: string; status: number } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const headers: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      Accept: 'application/rss+xml, application/xml, text/xml, text/html, */*',
    };
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers,
      redirect: 'follow',
      cache: 'no-store',
    });
    const body = await res.text();
    return { body, status: res.status };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

/** Fetch with one InfinityFree challenge retry */
async function fetchThroughChallenge(url: string): Promise<{ body: string; status: number } | null> {
  let r = await fetchText(url);
  if (!r) return null;
  if (isInfreeChallenge(r.body)) {
    const c = extractInfreeCookie(r.body);
    if (c) {
      const withCookie = await fetchText(url, 15000, `__test=${c}`);
      if (withCookie && !isInfreeChallenge(withCookie.body)) return withCookie;
      // retry with ?i=1 like the challenge redirect
      const u = new URL(url);
      u.searchParams.set('i', '1');
      const r2 = await fetchText(u.toString(), 15000, `__test=${c}`);
      if (r2 && !isInfreeChallenge(r2.body)) return r2;
    }
  }
  return r;
}

function itemsFromXml(xml: string, sourceLabel: string): FeedItem[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
  });
  let doc: any;
  try {
    doc = parser.parse(xml);
  } catch {
    return [];
  }
  const out: FeedItem[] = [];
  const channel = doc?.rss?.channel;
  if (channel?.item) {
    const list = Array.isArray(channel.item) ? channel.item : [channel.item];
    for (const it of list) {
      const link = String(it.link || it.guid?.['#text'] || it.guid || '').trim();
      const guid = String(it.guid?.['#text'] || it.guid || link).trim();
      out.push({
        title: String(it.title || 'Без названия').trim(),
        link,
        guid: guid || link,
        description: String(it.description || it['content:encoded'] || '').trim(),
        pubDate: it.pubDate ? String(it.pubDate) : undefined,
        source: sourceLabel,
      });
    }
  }
  const feed = doc?.feed;
  if (feed?.entry) {
    const list = Array.isArray(feed.entry) ? feed.entry : [feed.entry];
    for (const it of list) {
      let link = '';
      if (typeof it.link === 'string') link = it.link;
      else if (Array.isArray(it.link)) {
        const alt = it.link.find((l: any) => !l['@_rel'] || l['@_rel'] === 'alternate');
        link = String(alt?.['@_href'] || it.link[0]?.['@_href'] || '');
      } else if (it.link?.['@_href']) link = String(it.link['@_href']);
      out.push({
        title: String(it.title?.['#text'] || it.title || 'Без названия').trim(),
        link,
        guid: String(it.id || link),
        description: String(
          it.summary?.['#text'] || it.summary || it.content?.['#text'] || it.content || ''
        ).trim(),
        pubDate: it.updated || it.published ? String(it.updated || it.published) : undefined,
        source: sourceLabel,
      });
    }
  }
  return out;
}

/** Fallback: turn catalog-like HTML links into feed items */
function itemsFromHtml(html: string, base: string, sourceLabel: string): FeedItem[] {
  const out: FeedItem[] = [];
  const re =
    /href=["']((?:https?:\/\/[^"']+)?(?:\/channel\.php\?slug=|\/video\.php\?slug=|\/channel\/)[^"']+)["'][^>]*>([^<]{2,120})</gi;
  let m: RegExpExecArray | null;
  const seen = new Set<string>();
  while ((m = re.exec(html))) {
    let href = m[1];
    if (href.startsWith('/')) href = base.replace(/\/$/, '') + href;
    const title = m[2].replace(/\s+/g, ' ').trim();
    if (!title || seen.has(href)) continue;
    seen.add(href);
    out.push({
      title,
      link: href,
      guid: href,
      description: title,
      pubDate: new Date().toUTCString(),
      source: sourceLabel,
    });
    if (out.length >= 80) break;
  }
  return out;
}

function looksLikeFeed(body: string): boolean {
  if (!body || body.length < 40) return false;
  if (isInfreeChallenge(body)) return false;
  const s = body.slice(0, 5000).toLowerCase();
  if (s.includes('<html') && !s.includes('<rss') && !s.includes('<feed')) return false;
  return s.includes('<rss') || s.includes('<feed') || s.includes('<item') || s.includes('<entry');
}

export async function collectMergedItems(): Promise<{
  items: FeedItem[];
  sourcesTried: string[];
  sourcesOk: string[];
  errors: Record<string, string>;
  pushedCount: number;
}> {
  const entries = getSourceEntries();
  const sourcesTried: string[] = [];
  const sourcesOk: string[] = [];
  const errors: Record<string, string> = {};
  const byGuid = new Map<string, FeedItem>();

  const pushed = loadPushedItems();
  for (const it of pushed) {
    const k = (it.guid || it.link || it.title).trim();
    if (k) byGuid.set(k, { ...it, source: it.source || 'push' });
  }

  await Promise.all(
    entries.map(async (entry) => {
      const urls = expandToFeedUrls(entry);
      // also try bare site for HTML fallback
      const base = entry.replace(/\/$/, '');
      let ok = false;

      for (const url of urls) {
        sourcesTried.push(url);
        const r = await fetchThroughChallenge(url);
        if (!r) {
          errors[url] = 'network';
          continue;
        }
        if (r.status === 403) {
          errors[url] = '403_forbidden_ip_or_antibot';
          continue;
        }
        if (isInfreeChallenge(r.body)) {
          errors[url] = 'antibot_challenge';
          continue;
        }
        if (looksLikeFeed(r.body)) {
          const items = itemsFromXml(r.body, entry);
          if (items.length) {
            sourcesOk.push(url);
            ok = true;
            for (const it of items) {
              const key = (it.guid || it.link || it.title).trim();
              if (key && !byGuid.has(key)) byGuid.set(key, it);
            }
            break;
          }
          errors[url] = 'empty_rss';
        } else {
          errors[url] = 'not_rss';
        }
      }

      if (!ok) {
        // HTML catalog fallback on site root / catalog
        for (const path of ['/', '/catalog.php', '/channels.php', '/smotrim.php']) {
          const url = base.startsWith('http') && !base.includes('.xml') ? base.replace(/\/$/, '') + path : '';
          if (!url || url.includes('.xml')) continue;
          sourcesTried.push(url);
          const r = await fetchThroughChallenge(url);
          if (!r || isInfreeChallenge(r.body) || r.status >= 400) {
            errors[url] = r ? `html_${r.status}` : 'network';
            continue;
          }
          const items = itemsFromHtml(r.body, base, entry);
          if (items.length) {
            sourcesOk.push(url + '#html');
            ok = true;
            for (const it of items) {
              const key = (it.guid || it.link).trim();
              if (key && !byGuid.has(key)) byGuid.set(key, it);
            }
            break;
          }
        }
      }

      if (!ok) errors[entry] = errors[entry] || 'no_working_path';
    })
  );

  const items = Array.from(byGuid.values()).sort(
    (a, b) => (Date.parse(b.pubDate || '0') || 0) - (Date.parse(a.pubDate || '0') || 0)
  );

  return {
    items,
    sourcesTried,
    sourcesOk,
    errors,
    pushedCount: pushed.length,
  };
}

export function publicOrigin(req: Request): string {
  const env = process.env.PUBLIC_URL || process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || '';
  if (env) return env.replace(/\/$/, '');
  const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000';
  const proto = req.headers.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`.replace(/\/$/, '');
}

export function buildRssXml(
  items: FeedItem[],
  opts: { title: string; link: string; description: string }
): string {
  const limited = items.slice(0, 300);
  const channelItems = limited.map((it) => ({
    title: it.title,
    link: it.link,
    guid: it.guid || it.link,
    description: it.description
      ? `${it.description}${it.source ? `\n\nИсточник: ${it.source}` : ''}`
      : it.source || '',
    ...(it.pubDate ? { pubDate: it.pubDate } : {}),
  }));

  const builder = new XMLBuilder({ ignoreAttributes: false, format: true });
  return builder.build({
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    rss: {
      '@_version': '2.0',
      channel: {
        title: opts.title,
        link: opts.link,
        description: opts.description,
        language: 'ru',
        lastBuildDate: new Date().toUTCString(),
        item: channelItems.length ? channelItems : undefined,
      },
    },
  });
}
