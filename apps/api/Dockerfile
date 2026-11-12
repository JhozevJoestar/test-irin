FROM node:22-bookworm-slim
RUN apt-get update && apt-get install -y openssl python3 make g++ && rm -rf /var/lib/apt/lists/*
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN npm ci
COPY apps/api apps/api
RUN npm run generate -w apps/api && npm run build -w apps/api
EXPOSE 3000
CMD ["sh", "-c", "npm run migrate -w apps/api && if [ \"$DEMO_SEED\" = \"true\" ]; then npm run seed -w apps/api; fi && npm run start -w apps/api"]
