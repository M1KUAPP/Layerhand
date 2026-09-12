#!/usr/bin/env bash
#
# Create the Layerhand project board, its custom fields, and populate it
# from the open issues. Idempotent: re-running adds what is missing and
# leaves what exists.
#
# Needs a token with the `project` scope, which the default `gh` login
# does not carry:
#
#   gh auth refresh -s project,read:project
#
# Usage: scripts/setup-project-board.sh [owner]

set -euo pipefail

root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"

owner=${1:-$(gh repo view --json owner --jq .owner.login)}
repo=$(gh repo view --json nameWithOwner --jq .nameWithOwner)
title="Layerhand"

if ! gh project list --owner "$owner" >/dev/null 2>&1; then
  echo "error: cannot read projects for $owner." >&2
  echo "The token is missing the project scope. Run:" >&2
  echo >&2
  echo "    gh auth refresh -s project,read:project" >&2
  echo >&2
  echo "Nothing has been changed." >&2
  exit 1
fi

number=$(gh project list --owner "$owner" --format json \
  --jq ".projects[] | select(.title == \"$title\") | .number" | head -1)

if [ -z "$number" ]; then
  echo "creating project \"$title\" for $owner"
  gh project create --owner "$owner" --title "$title" >/dev/null
  # Re-query rather than parsing the create output, so this does not
  # depend on the shape of that response.
  number=$(gh project list --owner "$owner" --format json \
    --jq ".projects[] | select(.title == \"$title\") | .number" | head -1)
  if [ -z "$number" ]; then
    echo "error: created the project but could not find it again." >&2
    exit 1
  fi
else
  echo "project \"$title\" already exists as #$number"
fi

# Custom fields. Status is built in, so it is not created here.
existing=$(gh project field-list "$number" --owner "$owner" \
  --format json --jq '.fields[].name')

field() {
  local name=$1 type=$2 options=${3:-}
  if printf '%s\n' "$existing" | grep -qxF "$name"; then
    echo "  field \"$name\" already exists"
    return
  fi
  echo "  creating field \"$name\""
  if [ -n "$options" ]; then
    gh project field-create "$number" --owner "$owner" --name "$name" \
      --data-type "$type" --single-select-options "$options" >/dev/null
  else
    gh project field-create "$number" --owner "$owner" --name "$name" \
      --data-type "$type" >/dev/null
  fi
}

field "Priority" SINGLE_SELECT "P0,P1,P2"
field "Area"     SINGLE_SELECT "agent,editor,browser,web,infra,launch"
field "Day"      NUMBER
field "Estimate" NUMBER

# Populate from open issues. item-add is a no-op for an issue already on
# the board, so this is safe to repeat.
echo "adding open issues to the board"
gh issue list --repo "$repo" --state open --limit 200 --json url --jq '.[].url' |
  while read -r url; do
    gh project item-add "$number" --owner "$owner" --url "$url" >/dev/null
    echo "  added $url"
  done

echo
echo "Board ready: https://github.com/orgs/$owner/projects/$number"
echo
echo "Priority and Area duplicate the issue labels on purpose -- a board"
echo "groups and sorts by field, not by label. Set Day and Estimate by"
echo "hand; they are planning values, not facts about the issue."
