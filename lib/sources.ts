/** Default StreamLive-related mirrors. Override via SOURCES env (comma-separated base URLs). */
export const DEFAULT_BASES = [
  'https://streamlivetv.freedev.app',
  'https://domtv.blyz.ru',
  'https://streamliveru.web1337.net',
];

export const RSS_PATH_CANDIDATES = [
  '/rss.xml',
  '/rss',
  '/feed',
  '/feed.xml',
  '/rss_channels.php',
  '/rss.php',
  '/rss_videos.php',
  '/rss_forum.php',
];

export function getBases(): string[] {
  const env = process.env.SOURCES || process.env.RSS_SOURCES || '';
  if (env.trim()) {
    return env.split(',').map((s) => s.trim().replace(/\/$/, '')).filter(Boolean);
  }
  return DEFAULT_BASES;
}
