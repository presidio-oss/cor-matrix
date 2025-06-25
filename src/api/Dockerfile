FROM oven/bun AS build

WORKDIR /app

COPY package.json package.json

RUN bun install

COPY . .

ENV NODE_ENV=production

RUN bun build \
	--compile \
	--minify-whitespace \
	--minify-syntax \
	--target bun \
	--outfile server \
	./src/api/index.ts

FROM gcr.io/distroless/base

WORKDIR /app

COPY --from=build /app/server server
COPY --from=build /app/drizzle drizzle

ENV NODE_ENV=production
ENV DB_FILE_NAME=db.db
ENV API_PORT=3000

CMD ["./server"]