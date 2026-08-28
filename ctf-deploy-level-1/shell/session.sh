#!/bin/bash
# Mỗi phiên = sandbox bwrap riêng. Artifact được overlay vào ĐÚNG VỊ TRÍ THẬT
# (/var/log, /etc, /root, /var/www, /opt...) — như đứng trên hệ thống bị xâm nhập (chỉ đọc).
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  web-prod-01 — HỆ THỐNG BỊ XÂM NHẬP (chỉ đọc)              ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo "  Bắt đầu:   ctf register <tên>  →  (admin duyệt)  →  ctf login <tên>"
echo "  Nhiệm vụ:  ctf            (xem câu hỏi & tiến độ)"
echo "             ctf submit <id> <đáp án>   ·   ctf board   ·   ctf score"
echo "  Điều tra:  lệnh Linux bình thường (ls, cat, grep, awk, find, base64, xxd, tcpdump, python3 ...)"
echo
API="${CTF_API:-http://ctf:3000}"
if command -v bwrap >/dev/null 2>&1 && bwrap --ro-bind / / true 2>/dev/null; then
  BINDS=()
  if [ -f /srv/challenges/mounts.txt ]; then
    while IFS='|' read -r dest rel; do
      [ -n "$dest" ] && [ -e "/srv/challenges/incident/$rel" ] && BINDS+=(--ro-bind "/srv/challenges/incident/$rel" "$dest")
    done < /srv/challenges/mounts.txt
  fi
  exec bwrap \
    --unshare-ipc --unshare-pid --unshare-uts --unshare-cgroup --unshare-user-try \
    --die-with-parent --new-session \
    --ro-bind / / \
    --dev /dev --proc /proc \
    --tmpfs /tmp --tmpfs /run \
    "${BINDS[@]}" \
    --tmpfs /home/ctf \
    --chdir / \
    --setenv HOME /home/ctf --setenv USER analyst --setenv CTF_API "$API" \
    --setenv PS1 'analyst@web-prod-01:\w\$ ' \
    /bin/bash --norc -i
else
  echo "(!) bwrap không khả dụng -> shell hạn chế."
  export HOME="$(mktemp -d)"; export CTF_API="$API"; cd / 2>/dev/null || true
  exec /bin/bash --norc -i
fi
