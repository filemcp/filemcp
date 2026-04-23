FROM mcr.microsoft.com/playwright:v1.52.0-jammy
ENV PLAYWRIGHT_BROWSERS_PATH=/ms-playwright
ENV PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD=1
RUN npm install -g corepack && corepack enable
WORKDIR /app
