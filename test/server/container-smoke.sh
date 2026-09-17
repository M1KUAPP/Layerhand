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
    mcp="$(curl --fail --silent "http://127.0.0.1:${port}/mcp")"
    echo "$mcp" | grep -q 'id="setup-prompt"'
    marketplace="$(curl --fail --silent "http://127.0.0.1:${port}/plugins/marketplace.json")"
    echo "$marketplace" | grep -q '"source":"archive"'
    zip_bytes="$(curl --fail --silent "http://127.0.0.1:${port}/plugins/layerhand.zip" | wc -c)"
    tgz_bytes="$(curl --fail --silent "http://127.0.0.1:${port}/plugins/layerhand-mcp.tgz" | wc -c)"
    [[ "$zip_bytes" -gt 1024 ]]
    [[ "$tgz_bytes" -gt 1024 ]]
    exit
  fi
  sleep 0.2
done

docker logs "$container" >&2
exit 1
