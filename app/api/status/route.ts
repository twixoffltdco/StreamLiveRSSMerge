import { collectMergedItems } from '@/lib/merge';
import { getSourceEntries } from '@/lib/sources';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { items, sourcesOk, sourcesTried, errors } = await collectMergedItems();
  return Response.json({
    ok: true,
    configured: getSourceEntries(),
    sourcesOk,
    sourcesTriedCount: sourcesTried.length,
    items: items.length,
    sample: items.slice(0, 5).map((i) => ({ title: i.title, link: i.link, source: i.source })),
    errors,
  });
}
