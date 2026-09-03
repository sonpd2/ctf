# Linux Security CTF — Level 3 (Helpdesk)

Ticket SOC mờ: học viên tự khảo sát máy (`ss` / `netstat`, log, FS). App web listen local — không ghi sẵn URL trong đề.

**Luật:** 2 nộp / flag · 1 hint / flag (`confirm` → −20%).

| Cổng | Dịch vụ |
|------|---------|
| **8080** | Terminal CTF (ttyd) |
| **8082** | Write-up HTML (`/write-up/`) — có spoilers |

## Chạy
```bash
# Đổi ADMIN_PASS trong docker-compose.yml
docker compose up -d --build
```

- Terminal: `http://<ip>:8080`
- Write-up: `http://<ip>:8082/write-up/`

## Học viên
```
ctf register | login | ctf | show | submit | hint
ss -tlnp
# hoặc: netstat -tlnp
```

## Giảng viên
- Proxy trong shell: `:80` → `web:80` (socat).
- Login lab: `admin` / `admin` (không in trong ticket).
- `ANSWER-KEY.md` sinh khi build; cố định vụ bằng `CTF_SEED`.
- Write-up chứa đáp án — chỉ mở khi cần.
