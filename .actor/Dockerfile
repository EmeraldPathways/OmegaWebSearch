# ---- Build stage: compile TypeScript ----
FROM node:20-slim AS builder
WORKDIR /app
COPY package*.json tsconfig.json ./
RUN npm install
COPY src/ src/
RUN npx tsc

# ---- Runtime stage: lean production image ----
FROM apify/actor-node:20
COPY package*.json ./
RUN npm --quiet set progress=false \
  && npm install --omit=dev --no-optional \
  && echo "NPM install finished"
COPY --from=builder /app/dist/ dist/
CMD npm start
