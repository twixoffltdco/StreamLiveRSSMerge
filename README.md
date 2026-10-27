# StreamLive RSS Merge

Open-source сервис: **собирает RSS с нескольких зеркал** и отдаёт **одну ленту** для встраивания куда угодно.

## Зеркала по умолчанию
- https://streamlivetv.freedev.app
- https://domtv.blyz.ru
- https://streamliveru.web1337.net

На каждом пробуются пути: `/rss.xml`, `/rss`, `/feed`, `/rss_channels.php`, …

## API
| URL | Описание |
|-----|----------|
| `GET /api/feed` | Объединённый RSS 2.0 |
| `GET /api/status` | Какие источники ответили, сколько item |

## Env
```env
SOURCES=https://streamlivetv.freedev.app,https://domtv.blyz.ru,https://streamliveru.web1337.net
FEED_TITLE=StreamLive merged RSS
FEED_DESC=Объединённая лента зеркал
```

## Deploy
```bash
npm i
npm run build
npm start
```
Vercel / Layero / Node-хостинг — как у [streamliveapp](https://github.com/twixoffltdco/streamliveapp).

## License
MIT
