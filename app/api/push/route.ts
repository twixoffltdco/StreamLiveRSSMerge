import { savePushedItems, type FeedItem } from '@/lib/merge';

export const dynamic = 'force-dynamic';

/**
 * Зеркала на free-хостинге часто блокируют входящий pull (antibot/403).
 * Они сами пушат сюда свою ленту (cron на PHP).
 *
 * POST /api/push
 * Header: Authorization: Bearer <PUSH_SECRET>
 * Body: { source: "domtv.blyz.ru", items: [{ title, link, guid?, description?, pubDate? }] }
 */
export async function POST(req: Request) {
  const secret = process.env.PUSH_SECRET || '';
  if (secret) {
    const auth = req.headers.get('authorization') || '';
    if (auth !== `Bearer ${secret}`) {
      return Response.json({ ok: false, error: 'unauthorized' }, { status: 401 });
    }
  }
  let body: any;
  try {
    body = await req.json();
  } catch {
    return Response.json({ ok: false, error: 'bad_json' }, { status: 400 });
  }
  const source = String(body.source || 'push');
  const raw = Array.isArray(body.items) ? body.items : [];
  const items: FeedItem[] = raw
    .map((it: any) => ({
      title: String(it.title || '').trim() || 'Без названия',
      link: String(it.link || '').trim(),
      guid: String(it.guid || it.link || '').trim(),
      description: String(it.description || '').trim(),
      pubDate: it.pubDate ? String(it.pubDate) : new Date().toUTCString(),
      source,
    }))
    .filter((it: FeedItem) => it.link);
  if (!items.length) {
    return Response.json({ ok: false, error: 'no_items' }, { status: 400 });
  }
  try {
    savePushedItems(items);
  } catch (e: any) {
    return Response.json({ ok: false, error: e?.message || 'store_failed' }, { status: 500 });
  }
  return Response.json({ ok: true, accepted: items.length, source });
}
