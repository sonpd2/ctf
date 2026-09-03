# Linux Security CTF — Level 3 (Helpdesk)

Ticket SOC mờ: học viên tự khảo sát máy (`ss` / `netstat`, log, FS). App web listen local — không ghi sẵn URL trong đề.

**Luật:** 2 nộp / flag · 1 hint / flag (`confirm` → −20%).

Terminal: `http://<ip>:8081`

## Chạy
```bash
# Đổi ADMIN_PASS trong docker-compose.yml
docker compose up -d --build
```

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
