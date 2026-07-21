FROM debian:bookworm-slim AS build
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc make libulfius-dev libjansson-dev ca-certificates && \
    rm -rf /var/lib/apt/lists/*
WORKDIR /src
COPY . .
RUN make

FROM debian:bookworm-slim
RUN apt-get update && apt-get install -y --no-install-recommends \
    libulfius2.7 libjansson4 ca-certificates && \
    rm -rf /var/lib/apt/lists/*
COPY --from=build /src/fixarr /usr/local/bin/fixarr
COPY fixarr.json /etc/fixarr.json
CMD ["fixarr", "-c", "/etc/fixarr.json"]
