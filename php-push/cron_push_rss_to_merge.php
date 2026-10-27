<?php
/**
 * Клади на PHP-зеркало (domtv / freedev / web1337) и в cron раз в час.
 * Пушит последние каналы/темы в streamliverss merge (обход antibot на входящем pull).
 *
 * Настройки:
 */
$MERGE_URL = getenv('RSS_MERGE_PUSH_URL') ?: 'https://streamliverss.tatnet.app/api/push';
$PUSH_SECRET = getenv('RSS_MERGE_PUSH_SECRET') ?: ''; // тот же что PUSH_SECRET на merge
$LIMIT = 40;

require_once __DIR__ . '/includes/db.php'; // подстрой путь если скрипт не в корне

$items = [];
try {
  $st = db()->query("SELECT title, slug, created_at FROM channels WHERE status='approved' ORDER BY id DESC LIMIT $LIMIT");
  foreach ($st->fetchAll(PDO::FETCH_ASSOC) ?: [] as $c) {
    $link = (isset($_SERVER['HTTP_HOST']) ? (('https://') . $_SERVER['HTTP_HOST']) : '') . '/channel.php?slug=' . rawurlencode($c['slug']);
    if (defined('SITE_URL')) $link = rtrim(SITE_URL, '/') . '/channel.php?slug=' . rawurlencode($c['slug']);
    $items[] = [
      'title' => $c['title'],
      'link' => $link,
      'guid' => $link,
      'description' => $c['title'],
      'pubDate' => gmdate('D, d M Y H:i:s', strtotime($c['created_at'] ?? 'now')) . ' GMT',
    ];
  }
} catch (Throwable $e) {}

if (!$items) {
  header('Content-Type: text/plain; charset=utf-8');
  echo "no items\n";
  exit;
}

$source = parse_url(defined('SITE_URL') ? SITE_URL : '', PHP_URL_HOST) ?: ($_SERVER['HTTP_HOST'] ?? 'php-mirror');
$payload = json_encode(['source' => $source, 'items' => $items], JSON_UNESCAPED_UNICODE);

$ch = curl_init($MERGE_URL);
$headers = ['Content-Type: application/json'];
if ($PUSH_SECRET !== '') $headers[] = 'Authorization: Bearer ' . $PUSH_SECRET;
curl_setopt_array($ch, [
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => $headers,
  CURLOPT_POSTFIELDS => $payload,
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_TIMEOUT => 20,
  CURLOPT_SSL_VERIFYPEER => false,
]);
$resp = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);
header('Content-Type: text/plain; charset=utf-8');
echo "HTTP $code\n$resp\n";
