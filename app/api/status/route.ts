import { collectMergedItems } from '@/lib/merge';
import { getSourceEntries } from '@/lib/sources';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { items, sourcesOk, sourcesTried, errors, pushedCount } = await collectMergedItems();
  return Response.json({
    ok: true,
    configured: getSourceEntries(),
    sourcesOk,
    sourcesTriedCount: sourcesTried.length,
    items: items.length,
    pushedCount,
    sample: items.slice(0, 8).map((i) => ({ title: i.title, link: i.link, source: i.source })),
    errors,
    hint:
      'Если domtv/freedev/web1337 в errors с 403 или antibot — free-хостинг режет сервера. Используй POST /api/push с этих зеркал или SOURCES с прямыми RSS без antibot.',
  });
}
