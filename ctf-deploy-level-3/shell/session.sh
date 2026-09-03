#!/bin/bash
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  helpdesk-01 — PHIÊN ĐIỀU TRA                              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo "  ctf register <tên>  →  admin duyệt  →  ctf login <tên>"
echo "  ctf | ctf show <id> | ctf submit <id> <ans> | ctf hint <id>"
echo "  Khảo sát máy: ss / netstat, log, FS ..."
echo
API="${CTF_API:-http://ctf:3000}"
if [ ! -f /var/log/nginx/access.log ] && [ ! -f /var/log/auth.log ]; then
  echo "(!) log overlay chưa sẵn — xem docker compose logs"
  echo
fi

run_plain() {
  echo "(!) sandbox bwrap không dùng được — shell trực tiếp."
  export HOME="/tmp/analyst-$$"
  mkdir -p "$HOME" 2>/dev/null || export HOME=/tmp
  export CTF_API="$API" WEB_URL="${WEB_URL:-http://127.0.0.1}" USER=analyst
  export PS1='analyst@helpdesk-01:\w\$ '
  cd / 2>/dev/null || true
  exec /bin/bash --norc -i
}

BWRAP_ARGS=(
  --unshare-ipc --unshare-pid
  --die-with-parent
  --ro-bind / /
  --dev /dev --proc /proc
  --tmpfs /tmp --tmpfs /run
  --tmpfs /home/analyst
  --chdir /
  --setenv HOME /home/analyst
  --setenv USER analyst
  --setenv CTF_API "$API"
  --setenv WEB_URL "${WEB_URL:-http://127.0.0.1}"
  --setenv PS1 'analyst@helpdesk-01:\w\$ '
)

if command -v bwrap >/dev/null 2>&1 && bwrap "${BWRAP_ARGS[@]}" true 2>/dev/null; then
  exec bwrap "${BWRAP_ARGS[@]}" /bin/bash --norc -i
else
  run_plain
fi
