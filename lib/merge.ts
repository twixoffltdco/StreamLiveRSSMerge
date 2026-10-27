import { XMLParser, XMLBuilder } from 'fast-xml-parser';
import { getBases, RSS_PATH_CANDIDATES } from './sources';

export type FeedItem = {
  title: string;
  link: string;
  guid: string;
  description: string;
  pubDate?: string;
  source?: string;
};

async function fetchText(url: string, timeoutMs = 8000): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: {
        'User-Agent': 'StreamLiveRSSMerge/1.0 (+https://github.com/twixoffltdco)',
        Accept: 'application/rss+xml, application/xml, text/xml, */*',
      },
      next: { revalidate: 300 },
    } as RequestInit);
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function itemsFromXml(xml: string, sourceBase: string): FeedItem[] {
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
      const link = String(it.link || it.guid || '').trim();
      const guid = String(it.guid?.['#text'] || it.guid || link).trim();
      out.push({
        title: String(it.title || 'Без названия').trim(),
        link,
        guid: guid || link,
        description: String(it.description || it['content:encoded'] || '').trim(),
        pubDate: it.pubDate ? String(it.pubDate) : undefined,
        source: sourceBase,
      });
    }
  }
  // Atom
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
        description: String(it.summary?.['#text'] || it.summary || it.content?.['#text'] || it.content || '').trim(),
        pubDate: it.updated || it.published ? String(it.updated || it.published) : undefined,
        source: sourceBase,
      });
    }
  }
  return out;
}

export async function collectMergedItems(): Promise<{ items: FeedItem[]; sourcesTried: string[]; sourcesOk: string[] }> {
  const bases = getBases();
  const sourcesTried: string[] = [];
  const sourcesOk: string[] = [];
  const byGuid = new Map<string, FeedItem>();

  await Promise.all(
    bases.map(async (base) => {
      for (const path of RSS_PATH_CANDIDATES) {
        const url = base + path;
        sourcesTried.push(url);
        const body = await fetchText(url);
        if (!body || body.length < 40) continue;
        if (!body.includes('<rss') && !body.includes('<feed') && !body.includes('<item')) continue;
        const items = itemsFromXml(body, base);
        if (!items.length) continue;
        sourcesOk.push(url);
        for (const it of items) {
          const key = it.guid || it.link || `${it.title}|${it.pubDate}`;
          if (!byGuid.has(key)) byGuid.set(key, it);
        }
        break; // first working path per base
      }
    })
  );

  const items = Array.from(byGuid.values()).sort((a, b) => {
    const ta = a.pubDate ? Date.parse(a.pubDate) : 0;
    const tb = b.pubDate ? Date.parse(b.pubDate) : 0;
    return tb - ta;
  });

  return { items, sourcesTried, sourcesOk };
}

export function buildRssXml(items: FeedItem[], opts: { title: string; link: string; description: string }): string {
  const limited = items.slice(0, 200);
  const channelItems = limited.map((it) => ({
    title: it.title,
    link: it.link,
    guid: it.guid || it.link,
    description: it.description
      ? `${it.description}${it.source ? ` [source: ${it.source}]` : ''}`
      : it.source || '',
    ...(it.pubDate ? { pubDate: it.pubDate } : {}),
  }));

  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    cdataPropName: undefined,
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
        item: channelItems,
      },
    },
  };

  return builder.build(obj);
}
