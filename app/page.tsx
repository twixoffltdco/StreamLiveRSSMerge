export default function Home() {
  return (
    <main
      style={{
        fontFamily: 'system-ui,sans-serif',
        maxWidth: 720,
        margin: '40px auto',
        padding: 16,
        lineHeight: 1.5,
      }}
    >
      <h1>StreamLive RSS Merge</h1>
      <p>
        Склеивает RSS с зеркал StreamLive в одну ленту для встраивания на другие
        платформы.
      </p>
      <ul>
        <li>
          Лента: <a href="/api/feed">/api/feed</a>
        </li>
        <li>
          Статус: <a href="/api/status">/api/status</a>
        </li>
      </ul>
      <p style={{ opacity: 0.8, fontSize: 14 }}>
        Если лента пустая — открой <code>/api/status</code>: там видно, какие
        URL ответили. В env можно задать полные фиды:
        <br />
        <code>
          SOURCES=https://streamlivemax.tatnet.app/rss.xml,https://example.com/rss.xml
        </code>
        <br />
        И публичный URL сайта: <code>PUBLIC_URL=https://streamliverss.tatnet.app</code>
      </p>
    </main>
  );
}
