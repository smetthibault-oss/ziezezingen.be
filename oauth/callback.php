<?php
// Step 2: GitHub sends the editor back here with a one-time code. We swap
// it server-side for an access token (the client secret never reaches the
// browser) and hand the token to the Decap CMS popup via postMessage,
// following the exact handshake Decap's GitHub backend listens for.
require __DIR__ . '/oauth-config.php';

$code = $_GET['code'] ?? '';
$state = $_GET['state'] ?? '';
$expectedState = $_COOKIE['zzz_oauth_state'] ?? '';

if (!$code || !$state || !$expectedState || !hash_equals($expectedState, $state)) {
  http_response_code(400);
  echo 'Ongeldige of verlopen aanvraag. Sluit dit venster en probeer opnieuw in te loggen.';
  exit;
}

$ch = curl_init('https://github.com/login/oauth/access_token');
curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_POST => true,
  CURLOPT_HTTPHEADER => ['Accept: application/json'],
  CURLOPT_POSTFIELDS => http_build_query([
    'client_id' => GITHUB_OAUTH_CLIENT_ID,
    'client_secret' => GITHUB_OAUTH_CLIENT_SECRET,
    'code' => $code,
  ]),
]);
$response = curl_exec($ch);
$curlError = curl_error($ch);
curl_close($ch);

$data = json_decode((string) $response, true);
$token = $data['access_token'] ?? null;

if (!$token) {
  http_response_code(400);
  echo 'Inloggen bij GitHub is mislukt. ' . htmlspecialchars($curlError ?: ($data['error_description'] ?? ''));
  exit;
}

$tokenJson = json_encode(['token' => $token, 'provider' => 'github']);
?>
<!DOCTYPE html>
<html>
<body>
<script>
(function() {
  function receiveMessage(e) {
    window.removeEventListener('message', receiveMessage, false);
    e.source.postMessage(
      'authorization:github:success:' + <?php echo json_encode($tokenJson); ?>,
      e.origin
    );
  }
  window.addEventListener('message', receiveMessage, false);
  window.opener.postMessage('authorizing:github', '*');
})();
</script>
Ingelogd, je mag dit venster sluiten.
</body>
</html>
