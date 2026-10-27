# StreamLive RSS Merge

Склеивает ленты зеркал в один RSS: `/api/feed`.

## Почему нет domtv / freedev / web1337 в pull

Эти хосты часто:
1. Показывают **JS antibot** (`aes.js` + cookie `__test`)
2. Отдают **403 Forbidden** серверным IP (VPS/Tatnet)

Браузер пользователя проходит, **сервер агрегатора — нет**.

## Что сделано

1. **Pull** с попыткой расшифровать InfinityFree cookie + HTML fallback  
2. **Push API** — зеркало само шлёт items (cron), antibot не мешает

### Env на streamliverss.tatnet.app
```env
PUBLIC_URL=https://streamliverss.tatnet.app
PUSH_SECRET=придумай_секрет
SOURCES=https://streamlivemax.tatnet.app/rss.xml,https://domtv.blyz.ru,https://streamlivetv.freedev.app,https://streamliveru.web1337.net
```

### На каждом PHP-зеркале
1. Залей `php-push/cron_push_rss_to_merge.php` (поправь `require db.php`)
2. Env или правки в файле: `RSS_MERGE_PUSH_URL`, `RSS_MERGE_PUSH_SECRET`
3. Cron раз в час

Проверка: `/api/status` → `pushedCount`, `sourcesOk`, `errors`.
