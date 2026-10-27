import { collectMergedItems, buildRssXml, publicOrigin } from '@/lib/merge';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const origin = publicOrigin(req);
  const { items, sourcesOk, pushedCount } = await collectMergedItems();
  const xml = buildRssXml(items, {
    title: process.env.FEED_TITLE || 'StreamLive merged RSS',
    link: origin + '/api/feed',
    description:
      process.env.FEED_DESC ||
      `StreamLive merge. pull_ok=${sourcesOk.length}, pushed=${pushedCount}, items=${items.length}`,
  });
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=120',
      'Access-Control-Allow-Origin': '*',
      'X-Sources-Ok': String(sourcesOk.length),
      'X-Items': String(items.length),
      'X-Pushed': String(pushedCount),
    },
  });
}
