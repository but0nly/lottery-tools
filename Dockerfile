# Stage 1: Build
# 使用国内镜像源加速基础镜像拉取 (例如腾讯云或公共镜像站)
FROM m.daocloud.io/docker.io/library/node:20-alpine AS builder
WORKDIR /app

# Enable pnpm via corepack
RUN corepack enable pnpm

# Copy package.json, pnpm-lock.yaml and .npmrc (for registry mirror)
COPY package.json pnpm-lock.yaml .npmrc ./

# Install dependencies using pnpm
RUN pnpm install --frozen-lockfile

COPY . .

# Build the application
RUN pnpm run build

# Stage 2: Run
FROM m.daocloud.io/docker.io/library/node:20-alpine AS runner
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
