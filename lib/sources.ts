/**
 * Можно задать:
 * - базовые URL (подставятся пути /rss.xml, /rss_channels.php, …)
 * - или сразу полные URL фидов
 *
 * Env SOURCES — через запятую.
 */
export const DEFAULT_SOURCES = [
  'https://streamlivemax.tatnet.app/rss.xml',
  'https://streamlivetv.freedev.app',
  'https://domtv.blyz.ru',
  'https://streamliveru.web1337.net',
  'https://streamlive.tatnet.app',
  'https://streamlive.layero.dev',
];

export const RSS_PATH_CANDIDATES = [
  '/rss.xml',
  '/rss',
  '/feed',
  '/feed.xml',
  '/rss_channels.php',
  '/rss_videos.php',
  '/rss_forum.php',
  '/rss.php',
];

export function getSourceEntries(): string[] {
  const env = process.env.SOURCES || process.env.RSS_SOURCES || '';
  if (env.trim()) {
    return env
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return DEFAULT_SOURCES;
}

export function expandToFeedUrls(entry: string): string[] {
  const e = entry.replace(/\/$/, '');
  // уже полный путь к фиду
  if (/\.(xml|rss|atom)$/i.test(e) || /\/rss(\.php|_|\.|$)/i.test(e) || /\/feed/i.test(e)) {
    return [e];
  }
  return RSS_PATH_CANDIDATES.map((p) => e + p);
}
