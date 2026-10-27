export default function Home() {
  return (
    <main style={{ fontFamily: 'system-ui,sans-serif', maxWidth: 720, margin: '40px auto', padding: 16, lineHeight: 1.5 }}>
      <h1>StreamLive RSS Merge</h1>
      <p>
        Open-source агрегатор: забирает RSS с нескольких зеркал StreamLive, склеивает в одну ленту
        для встраивания на другие платформы.
      </p>
      <ul>
        <li>
          Единая лента: <a href="/api/feed">/api/feed</a> (RSS 2.0)
        </li>
        <li>
          Статус источников: <a href="/api/status">/api/status</a>
        </li>
      </ul>
      <p style={{ opacity: 0.75, fontSize: 14 }}>
        Источники по умолчанию: streamlivetv.freedev.app, domtv.blyz.ru, streamliveru.web1337.net.
        Переопределение: env <code>SOURCES=https://a.com,https://b.com</code>
      </p>
      <p>
        <a href="https://github.com/twixoffltdco/streamliveapp">Аналог по духу: streamliveapp</a>
      </p>
    </main>
  );
}
