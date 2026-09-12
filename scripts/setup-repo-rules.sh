#!/usr/bin/env bash
#
# Applies the server-side half of docs/reference/git-workflow.md:
#
#   - the branch ruleset in .github/rulesets/main.json, which makes a reviewed
#     pull request the only route into main
#   - the repository settings that delete the branch on merge and leave rebase
#     as the only merge method, so atomic commits survive the merge
#
# Requires admin on the repository and the gh CLI. Safe to re-run: an existing
# ruleset of the same name is updated rather than duplicated.
#
# Usage: scripts/setup-repo-rules.sh [owner/repo]

set -euo pipefail

repo=${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}
ruleset_file="$(cd "$(dirname "$0")/.." && pwd)/.github/rulesets/main.json"
ruleset_name=$(jq -r .name "$ruleset_file")

echo "Repository: $repo"

echo "==> Repository settings"
gh api -X PATCH "repos/$repo" --silent \
  -F delete_branch_on_merge=true \
  -F allow_auto_merge=true \
  -F allow_rebase_merge=true \
  -F allow_squash_merge=false \
  -F allow_merge_commit=false
echo "    branches delete on merge; rebase is the only merge method"

echo "==> Ruleset '$ruleset_name'"
id=$(gh api "repos/$repo/rulesets" --jq ".[] | select(.name == \"$ruleset_name\") | .id")
if [ -n "$id" ]; then
  gh api -X PUT "repos/$repo/rulesets/$id" --input "$ruleset_file" --silent
  echo "    updated (id $id)"
else
  id=$(gh api -X POST "repos/$repo/rulesets" --input "$ruleset_file" --jq .id)
  echo "    created (id $id)"
fi

cat <<'NOTE'

Done. Two things this script cannot do for you:

  - Rulesets on a private repository need GitHub Team or Enterprise. On a
    free or Pro private repo the ruleset call above fails, and the local
    hooks in .husky plus the workflows in .github/workflows remain the
    whole of the enforcement.

  - The ruleset requires one approving review, and GitHub does not let you
    approve your own pull request. If you are the only maintainer, set
    required_approving_review_count to 0 in .github/rulesets/main.json and
    re-run. Everything else in the workflow still holds.
NOTE
