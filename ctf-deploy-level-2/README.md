# Linux Security CTF — Điều tra sự cố (chỉ TERMINAL)

Giao diện **duy nhất là một terminal** (`http://<server-ip>:7681`). Không có web UI. Học viên đăng nhập ngay trong terminal, điều tra máy chủ bị xâm nhập bằng lệnh Linux thật, và dùng lệnh **`ctf`** để xem câu hỏi / nộp flag / xem điểm. Admin cũng thao tác trong terminal (`ctf admin`).

- **Bằng chứng nằm ở ĐÚNG VỊ TRÍ THẬT** (`/var/log`, `/etc/passwd`, `/root`, `/var/www`, `/opt`, cron, systemd, binary SUID ẩn...) — như đứng trên chính hệ thống bị xâm nhập (chỉ đọc), không gom vào một thư mục.
- **Câu hỏi chỉ hỏi, không gợi ý**, liên kết thành một chuỗi tấn công (12 objective).

## Chạy
```bash
# Đổi ADMIN_PASS trong docker-compose.yml trước
docker compose up -d --build
```
Chỉ mở **một cổng**: `http://<server-ip>:7681` (terminal). Backend chấm điểm chạy nội bộ, không lộ ra ngoài.

## Học viên (trong terminal)
```
ctf register <callsign>       # đăng ký (chờ admin duyệt)
ctf login <callsign>          # đăng nhập
ctf                           # briefing + 12 câu hỏi + tiến độ
ctf submit <id> <đáp án>      # nộp (3 lượt/câu, KHÔNG gợi ý)
ctf board | ctf score
```
Điều tra: `ls / cat / grep / awk / find / base64 / xxd / tcpdump / python3 ...` trên hệ thống thật.
Ví dụ: `find / -perm -4000 -type f 2>/dev/null` · `cat /var/log/auth.log` · `tcpdump -A -r /opt/capture.pcap`.

## Admin (cũng trong terminal)
```
ctf admin login               # nhập ADMIN_USER/ADMIN_PASS
ctf admin pending             # đăng ký chờ duyệt
ctf admin approve <tên> | delete <tên>
ctf admin reset               # xóa toàn bộ (giữa các vòng)
```

## Terminal & cách ly
Linux đầy đủ, không giới hạn lệnh, có mạng tới backend (cho `ctf`). Tang vật được **mount vào đúng vị trí** (`/var/log/auth.log`, `/root`, …) lúc container `shell` khởi động. Mỗi phiên web = **sandbox bwrap riêng** (PID/IPC tách biệt, home tạm reset). Học viên làm qua **`http://<ip>:7681`** — `docker compose exec shell` cũng thấy cùng overlay sau khi rebuild.
> Kiểm tra overlay: `cat /etc/hostname` → `web-prod-01` · `ls /var/log` → có `auth.log`.
> Muốn **1 container riêng cho từng user** (cách ly mạnh hơn per-session): cần thêm spawner + docker socket — báo mình để dựng (mình không test được Docker ở môi trường build).

## Xáo vụ / dùng lại
Randomize theo seed mỗi build (`docker compose up -d --build` = vụ mới). Cố định: `args.CTF_SEED` = số `SEED` cuối `ANSWER-KEY.md`. Nhớ `ctf admin reset` khi sang vòng mới.

## Đáp án
`ANSWER-KEY.md` (sinh khi build; giữ kín).
