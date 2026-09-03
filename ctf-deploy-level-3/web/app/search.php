<?php
require __DIR__ . '/common.php';
require_login();
$q = isset($_GET['q']) ? (string)$_GET['q'] : '';
$rows = [];
$error = '';
if ($q !== '') {
  // intentional SQLi
  $sql = "SELECT id, title, body FROM tickets WHERE title LIKE '%" . $q . "%'";
  try {
    $rows = db()->query($sql)->fetchAll(PDO::FETCH_ASSOC);
  } catch (Exception $e) {
    $error = $e->getMessage();
  }
}
?><!doctype html>
<html><head><title>Search</title></head>
<body>
<h1>Search</h1>
<form method="get"><input name="q" value="<?php echo htmlspecialchars($q); ?>"><button>Go</button></form>
<?php if ($error) echo '<pre>'.htmlspecialchars($error).'</pre>'; ?>
<table border="1">
<?php foreach ($rows as $r) {
  echo '<tr>';
  foreach ($r as $v) echo '<td>'.htmlspecialchars((string)$v).'</td>';
  echo '</tr>';
} ?>
</table>
<p><a href="/index.php">Back</a></p>
</body></html>
