<?php
header('Content-Type: application/json; charset=utf-8');

$recipient = 'thibault@feloranje.be';

// Fill these in to enable adding contact-form senders to Mailchimp when they
// tick the newsletter checkbox. Leave MAILCHIMP_API_KEY empty to disable.
define('MAILCHIMP_API_KEY', '');
define('MAILCHIMP_DC', 'us7');
define('MAILCHIMP_LIST_ID', 'e7c9e1bbeb');

function subscribeToMailchimp($email, $name) {
    if (MAILCHIMP_API_KEY === '') {
        return;
    }
    $hash = md5(strtolower($email));
    $url = 'https://' . MAILCHIMP_DC . '.api.mailchimp.com/3.0/lists/' . MAILCHIMP_LIST_ID . '/members/' . $hash;
    $payload = json_encode([
        'email_address' => $email,
        'status_if_new' => 'subscribed',
        'merge_fields' => ['FNAME' => $name],
    ]);

    $ch = curl_init($url);
    curl_setopt_array($ch, [
        CURLOPT_CUSTOMREQUEST => 'PUT',
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_USERPWD => 'anystring:' . MAILCHIMP_API_KEY,
        CURLOPT_HTTPHEADER => ['Content-Type: application/json'],
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_TIMEOUT => 5,
    ]);
    curl_exec($ch);
    curl_close($ch);
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
$message = trim($_POST['message'] ?? '');

if ($name === '' || $message === '' || !filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'Vul alle velden correct in.');
}

// Strip any newlines from fields used in headers to prevent header injection.
$safeName = str_replace(["\r", "\n"], '', $name);
$safeEmail = str_replace(["\r", "\n"], '', $email);

$subject = 'Nieuw bericht via ziezezingen.be van ' . $safeName;
$body = "Naam: $safeName\nE-mail: $safeEmail\n\nBericht:\n$message\n";

// one.com requires the From address to be a real mailbox on the hosted domain.
$headers = [
    'From: Zie Ze Zingen website <info@ziezezingen.be>',
    'Reply-To: ' . $safeName . ' <' . $safeEmail . '>',
    'Content-Type: text/plain; charset=utf-8',
];

$sent = mail($recipient, $subject, $body, implode("\r\n", $headers));

if ($sent) {
    if (!empty($_POST['newsletter'])) {
        subscribeToMailchimp($safeEmail, $safeName);
    }
    respond(true, 'Bedankt! Je bericht is verstuurd.');
} else {
    respond(false, 'Er ging iets mis bij het versturen. Probeer het later opnieuw of mail naar info@ziezezingen.be.');
}
