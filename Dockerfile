# Multi-Stage Dockerfile for Multi-Tenant Event & Ticket Reservation System

# Stage 1: Build Frontend Client
FROM node:22-alpine AS client-builder
WORKDIR /app/client
COPY client/package*.json ./
RUN npm ci
COPY client/ ./
RUN npm run build

# Stage 2: Production Server
FROM node:22-alpine AS runner
WORKDIR /app

# Install native dependencies required for better-sqlite3 build if needed
RUN apk add --no-cache python3 make g++

COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm ci --only=production

# Copy server code
COPY server/ ./

# Copy built frontend assets from client-builder into client/dist
COPY --from=client-builder /app/client/dist /app/client/dist

# Expose default port
EXPOSE 5000

ENV NODE_ENV=production
ENV PORT=5000

CMD ["node", "src/server.js"]
