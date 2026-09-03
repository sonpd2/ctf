<?php
// bootstrap — seed từ volume (gen.js)
$SEED_FILE = '/shared/web-seed/seed.inc.php';
if (!is_file($SEED_FILE)) $SEED_FILE = __DIR__ . '/seed.inc.php';
$SEED = is_file($SEED_FILE) ? (require $SEED_FILE) : [
  'sql_token' => 'hdk_demo',
  'env_secret' => 'APP_KEY=demo',
  'webshell' => 'tmp_0000.php',
  'inject_cmd' => 'id',
];
session_start();

function require_login() {
  if (empty($_SESSION['user'])) {
    header('Location: /login.php');
    exit;
  }
}

function db() {
  static $pdo;
  if ($pdo) return $pdo;
  $path = '/tmp/helpdesk.db';
  $pdo = new PDO('sqlite:' . $path);
  $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
  return $pdo;
}
