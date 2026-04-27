FROM node:22-alpine
RUN npm install -g corepack && corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/api/package.json ./apps/api/
RUN pnpm install --frozen-lockfile
COPY apps/api/ ./apps/api/
COPY apps/web/public/logo.png ./apps/web/public/logo.png
RUN cd apps/api && pnpm exec prisma generate && pnpm run build
EXPOSE 4000
CMD ["sh", "-c", "cd apps/api && pnpm exec prisma migrate deploy && node dist/main"]
