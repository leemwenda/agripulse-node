FROM node:20-alpine

RUN apk add --no-cache openssl openssl-dev libc6-compat

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY dist/ ./dist/
COPY prisma/ ./prisma/

RUN npx prisma generate

EXPOSE 5000

CMD ["node", "dist/index.js"]
