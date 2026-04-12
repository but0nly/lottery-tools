# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable pnpm

# Copy package.json and pnpm-lock.yaml
COPY package.json pnpm-lock.yaml ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Run
FROM node:20-alpine AS runner
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable pnpm

ENV NODE_ENV=production

# Only copy necessary files for runtime to keep image small
COPY --from=builder /app/package.json /app/pnpm-lock.yaml ./
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/public ./public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 3000
# Run the application using pnpm
CMD ["pnpm", "run", "start"]
