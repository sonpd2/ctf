<?php
require __DIR__ . '/common.php';
require_login();
$host = isset($_GET['host']) ? (string)$_GET['host'] : '';
$out = '';
if ($host !== '') {
  // intentional OS command injection
  $out = shell_exec('ping -c 1 ' . $host . ' 2>&1');
}
?><!doctype html>
<html><head><title>Diag</title></head>
<body>
<h1>Network diag</h1>
<form method="get">
  <label>Host <input name="host" value="<?php echo htmlspecialchars($host); ?>"></label>
  <button>Ping</button>
</form>
<pre><?php echo htmlspecialchars((string)$out); ?></pre>
<p><a href="/index.php">Back</a></p>
</body></html>
