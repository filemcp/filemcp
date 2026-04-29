FROM node:22-alpine AS builder
RUN npm install -g corepack && corepack enable
WORKDIR /app
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml tsconfig.base.json ./
COPY packages/ ./packages/
COPY apps/web/package.json ./apps/web/
RUN pnpm install --frozen-lockfile
COPY apps/web/ ./apps/web/
ARG NUXT_PUBLIC_APP_URL
ARG NUXT_PUBLIC_GA_ID
ENV NUXT_API_URL=http://api:4000/api
ENV NUXT_PUBLIC_APP_URL=$NUXT_PUBLIC_APP_URL
ENV NUXT_PUBLIC_GA_ID=$NUXT_PUBLIC_GA_ID
RUN cd apps/web && pnpm run build

FROM node:22-alpine
WORKDIR /app
COPY --from=builder /app/apps/web/.output ./
ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server/index.mjs"]
