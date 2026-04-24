FROM mcr.microsoft.com/playwright:v1.59.1-jammy
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm install -g corepack && corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY packages/ ./packages/
COPY apps/worker/package.json ./apps/worker/
COPY apps/api/prisma ./apps/api/prisma
RUN pnpm install --frozen-lockfile
COPY apps/worker/ ./apps/worker/
RUN cd apps/worker && pnpm exec prisma generate
CMD ["sh", "-c", "cd apps/worker && pnpm run start"]
