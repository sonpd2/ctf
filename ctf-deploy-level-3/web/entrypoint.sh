#!/bin/bash
set -euo pipefail
SEED_SRC="/shared/web-seed/seed.inc.php"
if [ -f "$SEED_SRC" ]; then
  cp "$SEED_SRC" /var/www/html/seed.inc.php
fi
php /var/www/html/init_db.php
exec apache2-foreground
