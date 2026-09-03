# Terminal web (Debian + ttyd) — build qua: docker compose build shell
FROM debian:stable-slim
# Công cụ phân tích + ttyd + bubblewrap (sandbox). ARM: đổi TTYD_ARCH=aarch64
ARG TTYD_VER=1.7.7
ARG TTYD_ARCH=x86_64
RUN apt-get update && apt-get install -y --no-install-recommends \
      bash coreutils grep gawk sed xxd binutils file less findutils gzip diffutils util-linux \
      tcpdump python3 openssl iproute2 net-tools socat \
      bubblewrap ca-certificates curl \
 && curl -fsSL -o /usr/local/bin/ttyd "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VER}/ttyd.${TTYD_ARCH}" \
 && chmod +x /usr/local/bin/ttyd \
 && rm -rf /var/lib/apt/lists/* \
 && useradd -m -s /bin/bash ctf \
 && mkdir -p /var/www /opt /usr/lib/.x /var/backups/.cache /usr/local/lib/.sys /opt/.sysd /etc/ssh /etc/cron.d \
 && touch /etc/ssh/sshd_config \
    /usr/lib/.x/bash /var/backups/.cache/bash /usr/local/lib/.sys/bash /opt/.sysd/bash \
    /etc/cron.d/apache-sync /etc/cron.d/php-gc /etc/cron.d/systemd-update /etc/cron.d/.cache
COPY session.sh /usr/local/bin/session.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY ctf /usr/local/bin/ctf
RUN chmod +x /usr/local/bin/session.sh /usr/local/bin/entrypoint.sh /usr/local/bin/ctf \
 && mkdir -p /srv/challenges
EXPOSE 7681
ENTRYPOINT ["/usr/local/bin/entrypoint.sh"]
# TTYD_CRED="user:pass" (tùy chọn) đặt mật khẩu chung cho terminal
CMD ["sh","-c","exec ttyd -p 7681 -W ${TTYD_CRED:+-c \"$TTYD_CRED\"} -t titleFixed='Linux Security CTF L3' /usr/local/bin/session.sh"]
