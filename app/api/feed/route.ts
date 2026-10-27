import { collectMergedItems, buildRssXml } from '@/lib/merge';

export const dynamic = 'force-dynamic';
export const revalidate = 300;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;
  const { items } = await collectMergedItems();
  const xml = buildRssXml(items, {
    title: process.env.FEED_TITLE || 'StreamLive merged RSS',
    link: origin,
    description:
      process.env.FEED_DESC ||
      'Объединённая лента с зеркал StreamLive (каналы/новости/контент с нескольких доменов).',
  });
  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      'Access-Control-Allow-Origin': '*',
    },
  });
}
