import { collectMergedItems, buildRssXml, publicOrigin } from '@/lib/merge';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(req: Request) {
  const origin = publicOrigin(req);
  const { items, sourcesOk } = await collectMergedItems();
  const xml = buildRssXml(items, {
    title: process.env.FEED_TITLE || 'StreamLive merged RSS',
    link: origin + '/api/feed',
    description:
      process.env.FEED_DESC ||
      `Объединённая лента StreamLive. Источников online: ${sourcesOk.length}. Items: ${items.length}.`,
  });
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=120, stale-while-revalidate=300',
      'Access-Control-Allow-Origin': '*',
      'X-Sources-Ok': String(sourcesOk.length),
      'X-Items': String(items.length),
    },
  });
}
