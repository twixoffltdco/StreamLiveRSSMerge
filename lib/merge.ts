import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { expandToFeedUrls, getSourceEntries } from './sources';

export type FeedItem = {
  title: string;
  link: string;
  guid: string;
  description: string;
  pubDate?: string;
  source?: string;
};

async function fetchText(url: string, timeoutMs = 12000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'StreamLiveRSSMerge/1.1 (+https://streamliverss.tatnet.app)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const text = await res.text();
    return text;
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
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
      const guid = String(it.id || link);
      out.push({
        title: String(it.title?.['#text'] || it.title || 'Без названия').trim(),
        link,
        guid,
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

function looksLikeFeed(body: string): boolean {
  if (!body || body.length < 40) return false;
  const s = body.slice(0, 4000).toLowerCase();
  if (s.includes('<html') && !s.includes('<rss') && !s.includes('<feed')) return false;
  return s.includes('<rss') || s.includes('<feed') || s.includes('<item') || s.includes('<entry');
}

export async function collectMergedItems(): Promise<{
  items: FeedItem[];
  sourcesTried: string[];
  sourcesOk: string[];
  errors: Record<string, string>;
}> {
  const entries = getSourceEntries();
  const sourcesTried: string[] = [];
  const sourcesOk: string[] = [];
  const errors: Record<string, string> = {};
  const byGuid = new Map<string, FeedItem>();

  await Promise.all(
    entries.map(async (entry) => {
      const urls = expandToFeedUrls(entry);
      let ok = false;
      for (const url of urls) {
        sourcesTried.push(url);
        const body = await fetchText(url);
        if (!body) {
          errors[url] = 'network/timeout';
          continue;
        }
        if (!looksLikeFeed(body)) {
          errors[url] = 'not_rss';
          continue;
        }
        const items = itemsFromXml(body, entry);
        if (!items.length) {
          errors[url] = 'empty_items';
          continue;
        }
        sourcesOk.push(url);
        ok = true;
        for (const it of items) {
          const key = (it.guid || it.link || `${it.title}|${it.pubDate}`).trim();
          if (key && !byGuid.has(key)) byGuid.set(key, it);
        }
        break;
      }
      if (!ok && !errors[entry]) errors[entry] = 'no_working_path';
    })
  );

  const items = Array.from(byGuid.values()).sort((a, b) => {
    const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
    const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
    return tb - ta;
  });

  return { items, sourcesTried, sourcesOk, errors };
}

export function publicOrigin(req: Request): string {
  const env =
    process.env.PUBLIC_URL ||
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    '';
  if (env) return env.replace(/\/$/, '');
  const host =
    req.headers.get('x-forwarded-host') ||
    req.headers.get('host') ||
    'localhost:3000';
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

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
  });

  const obj = {
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
  };

  return builder.build(obj);
}
