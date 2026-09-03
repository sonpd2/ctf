#!/bin/bash
# Overlay + proxy cổng local → web (để ss/netstat thấy listen).
set -euo pipefail
ART="/srv/challenges/incident"
MOUNTED=0
FAILED=0

ensure_target() {
  local dest="$1" src="$2"
  if [ -d "$src" ]; then
    mkdir -p "$dest" 2>/dev/null || true
  elif [ -f "$src" ]; then
    mkdir -p "$(dirname "$dest")" 2>/dev/null || true
    [ -e "$dest" ] || touch "$dest" 2>/dev/null || true
  fi
}

if [ -f /srv/challenges/mounts.txt ]; then
  while IFS='|' read -r dest rel; do
    [ -n "${dest:-}" ] || continue
    src="$ART/$rel"
    [ -e "$src" ] || continue
    ensure_target "$dest" "$src"
    if mount --bind -o ro "$src" "$dest" 2>/dev/null; then
      MOUNTED=$((MOUNTED + 1))
    else
      FAILED=$((FAILED + 1))
      echo "(!) entrypoint: không mount được $dest <- $src" >&2
    fi
  done < /srv/challenges/mounts.txt
fi

if [ ! -f /var/log/auth.log ]; then
  echo "(!) entrypoint: /var/log/auth.log chưa có — kiểm tra volume ctf-files." >&2
elif [ ! -f /var/log/nginx/access.log ]; then
  echo "(!) entrypoint: /var/log/nginx/access.log chưa có." >&2
elif [ "$FAILED" -gt 0 ]; then
  echo "(!) entrypoint: overlay $MOUNTED/$((MOUNTED + FAILED)) OK, $FAILED lỗi." >&2
else
  echo "entrypoint: overlay $MOUNTED vị trí OK." >&2
fi

# Listen local → web. setsid: không chết khi shell exec → ttyd.
# Cổng 80 cần CAP_NET_BIND_SERVICE; nếu fail thì fallback 8080.
UPSTREAM="${WEB_UPSTREAM:-web:80}"
start_proxy() {
  local port="$1"
  if ! command -v socat >/dev/null 2>&1; then
    echo "(!) entrypoint: không có socat" >&2
    return 1
  fi
  # thử bind
  if ! setsid socat TCP-LISTEN:"${port}",fork,reuseaddr,bind=0.0.0.0 TCP:"${UPSTREAM}" \
      </dev/null >/tmp/socat-${port}.log 2>&1 &
  then
    return 1
  fi
  sleep 0.3
  if ss -tln 2>/dev/null | grep -qE ":${port}\\b" || netstat -tln 2>/dev/null | grep -qE ":${port}\\b"; then
    echo "entrypoint: proxy :${port} → ${UPSTREAM} OK (pid $!)" >&2
    return 0
  fi
  echo "(!) entrypoint: không listen được :${port} — xem /tmp/socat-${port}.log" >&2
  return 1
}

if ! start_proxy 80; then
  start_proxy 8080 || true
fi

exec "$@"
