<?php
require __DIR__ . '/common.php';
$err = '';
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
  $u = isset($_POST['user']) ? (string)$_POST['user'] : '';
  $p = isset($_POST['pass']) ? (string)$_POST['pass'] : '';
  // intentional default creds
  if ($u === 'admin' && $p === 'admin') {
    $_SESSION['user'] = 'admin';
    header('Location: /index.php?welcome=admin');
    exit;
  }
  $err = 'Invalid credentials';
}
?><!doctype html>
<html><head><title>Helpdesk Login</title></head>
<body>
<h1>Acme Helpdesk</h1>
<?php if ($err) echo '<p style="color:red">'.htmlspecialchars($err).'</p>'; ?>
<form method="post">
  <label>User <input name="user"></label>
  <label>Pass <input name="pass" type="password"></label>
  <button type="submit">Login</button>
</form>
</body></html>
