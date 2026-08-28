FROM node:20-alpine
WORKDIR /app
COPY package.json ./
RUN npm install
COPY . .
ARG CTF_SEED=""
ENV CTF_SEED=$CTF_SEED
RUN npm run build
ENV PORT=3000
EXPOSE 3000
VOLUME ["/app/data"]
CMD ["node", "server.js"]
