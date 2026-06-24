FROM node:20-slim

RUN apt-get update -y && \
    apt-get install -y openssl libssl-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY dist/ ./dist/
COPY prisma/ ./prisma/

ENV PRISMA_CLI_BINARY_TARGETS=debian-openssl-3.0.x
RUN npx prisma generate --generator client

EXPOSE 5000
CMD ["node", "dist/index.js"]
