<?php
require __DIR__ . '/common.php';
require_login();
$file = isset($_GET['file']) ? (string)$_GET['file'] : 'readme.txt';
// intentional path traversal — only under docroot-ish
$base = __DIR__;
$path = $base . '/' . $file;
$content = '';
if (is_file($path)) {
  $content = file_get_contents($path);
} else {
  $content = 'not found';
}
if (!is_file($base . '/readme.txt')) {
  file_put_contents($base . '/readme.txt', "Acme Helpdesk docs.\nUse search and diag tools.\n");
}
?><!doctype html>
<html><head><title>Docs</title></head>
<body>
<h1>Page</h1>
<pre><?php echo htmlspecialchars($content); ?></pre>
<p><a href="/index.php">Back</a></p>
</body></html>
