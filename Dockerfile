# Build stage
FROM node:24-alpine AS build

WORKDIR /app

# Install all dependencies for building
COPY package*.json ./
RUN npm install --no-audit --no-fund

# Copy source and config
COPY . .

# Build frontend (to ./dist) and server (to ./dist-server)
RUN npm run build
RUN npx tsc -p tsconfig.prod.json

# Production stage
FROM node:24-alpine

# Set secure environment defaults
ENV NODE_ENV=production
ENV PORT=5173

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev --no-audit --no-fund

# Copy compiled assets from build stage
COPY --from=build /app/dist ./dist
COPY --from=build /app/dist-server ./dist-server

# Ensure upload directory exists for persistence
RUN mkdir -p public/uploads/cinematic

# Set ownership and switch to non-root user
RUN chown -R node:node /app
USER node

# Health check to ensure the container is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=5s --retries=3 \
  CMD node -e "fetch('http://localhost:5173/api/network-info').then(r => r.ok ? process.exit(0) : process.exit(1)).catch(() => process.exit(1))"

EXPOSE 5173

# Start compiled server directly with node
CMD ["node", "dist-server/server/index.js"]