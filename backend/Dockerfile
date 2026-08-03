# Pinned toolchain so the build does not depend on the host's Go version.
FROM golang:1.26-alpine AS build

WORKDIR /src

# Cached separately from the source so dependency downloads are not repeated
# on every code change.
COPY go.mod go.sum ./
RUN go mod download

COPY . .

# Static binary: no libc at runtime, so it can live in a scratch-style image.
RUN CGO_ENABLED=0 GOOS=linux go build -trimpath -ldflags="-s -w" -o /out/app ./cmd/app

# distroless/static ships CA certificates, which the outbound HTTPS call to the
# Discord webhook needs, and nothing else - no shell, no package manager.
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/app /app

USER nonroot:nonroot

# Documentation only. Render injects PORT at runtime and the app reads it.
EXPOSE 8080

ENTRYPOINT ["/app"]
