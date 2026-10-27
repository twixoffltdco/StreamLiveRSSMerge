import { collectMergedItems } from '@/lib/merge';
import { getBases } from '@/lib/sources';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { items, sourcesOk, sourcesTried } = await collectMergedItems();
  return Response.json({
    ok: true,
    bases: getBases(),
    sourcesOk,
    sourcesTriedCount: sourcesTried.length,
    items: items.length,
  });
}
