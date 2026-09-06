<?php
header('Content-Type: application/json; charset=utf-8');

$recipient = 'thibault@feloranje.be';

// MAILCHIMP_API_KEY is defined in mailchimp-config.php, generated at deploy
// time from a GitHub secret so the real key never lives in this repo.
if (file_exists(__DIR__ . '/mailchimp-config.php')) {
    require_once __DIR__ . '/mailchimp-config.php';
} else {
    define('MAILCHIMP_API_KEY', '');
}
define('MAILCHIMP_DC', 'us7');
define('MAILCHIMP_LIST_ID', 'e7c9e1bbeb');

function mailchimpRequest($method, $path, $payload) {
    $url = 'https://' . MAILCHIMP_DC . '.api.mailchimp.com/3.0' . $path;
    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_POSTFIELDS => json_encode($payload),
        CURLOPT_USERPWD => 'anystring:' . MAILCHIMP_API_KEY,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
    ]);
    curl_exec($ch);
    curl_close($ch);
}

function subscribeToMailchimp($email, $name, $phone) {
    if (MAILCHIMP_API_KEY === '') {
        return;
    }
    $hash = md5(strtolower($email));
    $mergeFields = ['FNAME' => $name];
    if ($phone !== '') {
        $mergeFields['PHONE'] = $phone;
    }
    mailchimpRequest('PUT', '/lists/' . MAILCHIMP_LIST_ID . '/members/' . $hash, [
        'email_address' => $email,
        'status_if_new' => 'subscribed',
        'merge_fields' => $mergeFields,
    ]);
    mailchimpRequest('POST', '/lists/' . MAILCHIMP_LIST_ID . '/members/' . $hash . '/tags', [
        'tags' => [['name' => 'zzz database', 'status' => 'active']],
    ]);
}

function respond($success, $message) {
    http_response_code($success ? 200 : 400);
    echo json_encode(['success' => $success, 'message' => $message]);
    exit;
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    respond(false, 'Ongeldige aanvraag.');
}

// Honeypot: bots fill every field, real users never see or fill this one.
if (!empty($_POST['website'])) {
    respond(true, 'Bedankt voor je bericht!');
}

$name = trim($_POST['name'] ?? '');
$email = trim($_POST['email'] ?? '');
$phone = trim($_POST['phone'] ?? '');
$message = trim($_POST['message'] ?? '');

if ($name === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'Vul alle velden correct in.');
}

// Strip any newlines from fields used in headers to prevent header injection.
$safeName = str_replace(["\r", "\n"], '', $name);
$safeEmail = str_replace(["\r", "\n"], '', $email);
$safePhone = str_replace(["\r", "\n"], '', $phone);

$subject = 'Nieuw bericht via ziezezingen.be van ' . $safeName;
$body = "Naam: $safeName\nE-mail: $safeEmail\nTelefoon: " . ($safePhone !== '' ? $safePhone : '-') . "\n\nBericht:\n$message\n";

// one.com requires the From address to be a real mailbox on the hosted domain.
$headers = [
    'From: Zie Ze Zingen website <info@ziezezingen.be>',
    'Reply-To: ' . $safeName . ' <' . $safeEmail . '>',
    'Content-Type: text/plain; charset=utf-8',
];

$sent = mail($recipient, $subject, $body, implode("\r\n", $headers));

if ($sent) {
    if (!empty($_POST['newsletter'])) {
        subscribeToMailchimp($safeEmail, $safeName, $safePhone);
    }
    respond(true, 'Bedankt! Je bericht is verstuurd.');
} else {
    respond(false, 'Er ging iets mis bij het versturen. Probeer het later opnieuw of mail naar info@ziezezingen.be.');
}
