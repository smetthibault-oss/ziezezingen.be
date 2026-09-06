<?php
header('Content-Type: application/json; charset=utf-8');

$recipient = 'thibault@feloranje.be';

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

$headers = [
    'From: Zie Ze Zingen website <no-reply@ziezezingen.be>',
    'Reply-To: ' . $safeName . ' <' . $safeEmail . '>',
    'Content-Type: text/plain; charset=utf-8',
];

$sent = mail($recipient, $subject, $body, implode("\r\n", $headers));

if ($sent) {
    respond(true, 'Bedankt! Je bericht is verstuurd.');
} else {
    respond(false, 'Er ging iets mis bij het versturen. Probeer het later opnieuw of mail naar info@ziezezingen.be.');
}
