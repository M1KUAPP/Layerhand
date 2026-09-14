#!/usr/bin/env bash
set -euo pipefail

image="layerhand-smoke:${$}"
container="layerhand-smoke-${$}"
port="$((40000 + $$ % 10000))"

cleanup() {
  docker rm -f "$container" >/dev/null 2>&1 || true
  docker image rm "$image" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker build --tag "$image" .

user="$(docker image inspect --format '{{.Config.User}}' "$image")"
if [[ -z "$user" || "$user" == "0" || "$user" == "root" ]]; then
  echo "container must run as a non-root user" >&2
  exit 1
fi

docker run --detach --env NODE_ENV=development --name "$container" \
  --publish "127.0.0.1:${port}:3000" "$image" >/dev/null

for _ in {1..30}; do
  if response="$(curl --fail --silent "http://127.0.0.1:${port}/health")"; then
    [[ "$response" == '{"status":"ok","database":"ready"}' ]]
    exit
  fi
  sleep 0.2
done

docker logs "$container" >&2
exit 1
