FROM node:22-alpine

WORKDIR /app

# Copy dependency manifests first for layer caching
COPY package.json package-lock.json ./

# Install all dependencies (including devDeps needed for next build)
RUN npm ci

# Copy source files
COPY . .

# Build Next.js
RUN npm run build

# Remove dev dependencies to reduce image size
RUN npm prune --production

EXPOSE 3000

# Use the custom server entry point
CMD ["node", "server.js"]
