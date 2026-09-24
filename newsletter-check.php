<?php
// Tells the newsletter form whether an address is already on the Mailchimp
// list, so the visitor can be told instead of silently "signing up" again.
// Read-only: it never adds or changes anyone. If anything goes wrong it
// answers "unknown" and the form just signs the visitor up as usual.
header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store');

// MAILCHIMP_API_KEY is defined in mailchimp-config.php, generated at deploy
// time from a GitHub secret so the real key never lives in this repo.
if (file_exists(__DIR__ . '/mailchimp-config.php')) {
    require_once __DIR__ . '/mailchimp-config.php';
} else {
    define('MAILCHIMP_API_KEY', '');
}
define('MAILCHIMP_DC', 'us7');
define('MAILCHIMP_LIST_ID', 'e7c9e1bbeb');

function reply($status, $httpCode = 200) {
    http_response_code($httpCode);
    echo json_encode(['status' => $status]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    reply('error', 405);
}

$email = trim($_POST['email'] ?? '');
if ($email === '' || strlen($email) > 254 || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    reply('invalid', 400);
}

if (MAILCHIMP_API_KEY === '') {
    reply('unknown');
}

$hash = md5(strtolower($email));
$ch = curl_init('https://' . MAILCHIMP_DC . '.api.mailchimp.com/3.0/lists/' . MAILCHIMP_LIST_ID . '/members/' . $hash . '?fields=status');
curl_setopt_array($ch, [
    CURLOPT_USERPWD => 'anystring:' . MAILCHIMP_API_KEY,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_TIMEOUT => 5,
]);
$body = curl_exec($ch);
$code = curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($code === 404) {
    reply('new');
}
if ($code !== 200) {
    reply('unknown');
}

$status = json_decode((string) $body, true)['status'] ?? '';
if ($status === 'subscribed' || $status === 'pending') {
    reply($status);
}

// unsubscribed / cleaned / archived: Mailchimp's own form handles those.
reply('new');
