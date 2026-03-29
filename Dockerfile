FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json tsconfig*.json ./
RUN npm ci
COPY server/ ./server/
RUN npm run build:server

FROM node:20-alpine AS runner
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=builder /app/dist/server ./dist/server
COPY client/ ./client/
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "dist/server/index.js"]
