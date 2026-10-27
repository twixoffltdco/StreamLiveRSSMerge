# StreamLive RSS Merge

Open-source: несколько зеркал → **одна RSS-лента**.

## Быстрый деплой (Tatnet / Layero / Vercel)

```bash
npm i
npm run build
npm start
```

### Env (важно)
```env
PUBLIC_URL=https://streamliverss.tatnet.app
SOURCES=https://streamlivemax.tatnet.app/rss.xml,https://streamlivetv.freedev.app,https://domtv.blyz.ru,https://streamliveru.web1337.net
```

Можно указывать **полные** URL фидов (`…/rss.xml`) или только домен.

## API
- `GET /api/feed` — RSS 2.0
- `GET /api/status` — какие источники живы, sample items, errors

## Почему лента была пустой
Часть зеркал **не отдаёт RSS** или недоступна с сервера. Рабочий эталон:  
`https://streamlivemax.tatnet.app/rss.xml` — добавлен в defaults.

MIT
