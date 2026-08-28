FROM debian:stable-slim
# Công cụ phân tích + ttyd + bubblewrap (sandbox). ARM: đổi TTYD_ARCH=aarch64
ARG TTYD_VER=1.7.7
ARG TTYD_ARCH=x86_64
RUN apt-get update && apt-get install -y --no-install-recommends \
      bash coreutils grep gawk sed xxd binutils file less findutils gzip diffutils util-linux \
      tcpdump python3 openssl \
      bubblewrap ca-certificates curl \
 && curl -fsSL -o /usr/local/bin/ttyd "https://github.com/tsl0922/ttyd/releases/download/${TTYD_VER}/ttyd.${TTYD_ARCH}" \
 && chmod +x /usr/local/bin/ttyd \
 && rm -rf /var/lib/apt/lists/* \
 && useradd -m -s /bin/bash ctf
COPY session.sh /usr/local/bin/session.sh
COPY ctf /usr/local/bin/ctf
RUN chmod +x /usr/local/bin/session.sh /usr/local/bin/ctf && mkdir -p /srv/challenges
USER ctf
EXPOSE 7681
# TTYD_CRED="user:pass" (tùy chọn) đặt mật khẩu chung cho terminal
CMD ["sh","-c","exec ttyd -p 7681 -W ${TTYD_CRED:+-c \"$TTYD_CRED\"} -t titleFixed='Linux Security CTF' /usr/local/bin/session.sh"]
