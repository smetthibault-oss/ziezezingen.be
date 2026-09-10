<?php
// Step 1 of the GitHub OAuth handshake Decap CMS expects: send the editor
// to GitHub to approve access, then GitHub redirects to callback.php.
require __DIR__ . '/oauth-config.php';

$state = bin2hex(random_bytes(16));
setcookie('zzz_oauth_state', $state, time() + 600, '/', '', true, true);

$redirectUri = 'https://' . $_SERVER['HTTP_HOST'] . '/oauth/callback.php';
$params = http_build_query([
  'client_id' => GITHUB_OAUTH_CLIENT_ID,
  'redirect_uri' => $redirectUri,
  'scope' => 'repo,user',
  'state' => $state,
]);

header('Location: https://github.com/login/oauth/authorize?' . $params);
exit;
