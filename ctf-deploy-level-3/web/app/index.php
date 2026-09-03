<?php
require __DIR__ . '/common.php';
require_login();
?><!doctype html>
<html><head><title>Helpdesk</title></head>
<body>
<h1>Welcome, <?php echo htmlspecialchars($_SESSION['user']); ?></h1>
<ul>
  <li><a href="/search.php">Search tickets</a></li>
  <li><a href="/page.php?file=readme.txt">Docs</a></li>
  <li><a href="/diag.php">Network diag</a></li>
  <li><a href="/logout.php">Logout</a></li>
</ul>
</body></html>
