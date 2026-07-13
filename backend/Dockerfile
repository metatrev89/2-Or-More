# 2+ media worker container — runs the ffmpeg stitch step.
# Deployable to Cloudflare Containers OR Railway/Fly unchanged (the escape hatch).

FROM node:22-slim

RUN apt-get update && apt-get install -y --no-install-recommends ffmpeg \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
COPY tsconfig.json ./
COPY src ./src

# Container entry: on Cloudflare, invoked by the Workflow via HTTP;
# on Railway/Fly, runs the poll-loop worker directly.
CMD ["npx", "tsx", "src/queue/worker.ts"]
