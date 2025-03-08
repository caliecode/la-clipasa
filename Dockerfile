# syntax=docker/dockerfile:1.7-labs

ARG GO_VERSION=1
FROM golang:${GO_VERSION}-bookworm as builder


WORKDIR /usr/src/app
COPY go.mod go.sum ./
RUN go mod download && go mod verify
COPY --exclude=**/dist --exclude=**/build --exclude=**/node_modules  . ./
COPY ./frontend/build ./frontend/build
RUN go build -v -o /run-app ./cmd/rest-server/main.go


FROM debian:bookworm

RUN apt-get update && apt-get install -y \
  ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY --from=builder /run-app /usr/local/bin/
CMD ["run-app"]
