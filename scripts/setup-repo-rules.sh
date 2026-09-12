#!/usr/bin/env bash
#
# Applies the server-side half of docs/reference/git-workflow.md:
#
#   - the branch ruleset in .github/rulesets/main.json, which makes a reviewed
#     pull request the only route into the default branch
#   - the repository settings that delete the branch on merge and leave rebase
#     as the only merge method, so atomic commits survive the merge
#
# Requires admin on the repository and the gh CLI. Safe to re-run: an existing
# ruleset of the same name is updated rather than duplicated.
#
# Usage: scripts/setup-repo-rules.sh [owner/repo]

set -euo pipefail

# Resolve everything from the checkout this script lives in, never from the
# caller's working directory: otherwise running it from inside an unrelated
# clone would apply this repository's ruleset to that one.
root=$(cd "$(dirname "$0")/.." && pwd)
cd "$root"

ruleset_file="$root/.github/rulesets/main.json"
ruleset_name=$(jq -r .name "$ruleset_file")
repo=${1:-$(gh repo view --json nameWithOwner --jq .nameWithOwner)}

echo "Repository: $repo"
echo "Ruleset:    $ruleset_file"
echo

# Check access before changing anything. Rulesets need GitHub Pro, Team, or
# Enterprise on a private repository, and finding that out after the settings
# PATCH would leave the repository half-configured: merge methods restricted,
# branch protection absent.
echo "==> Checking ruleset access"
if ! rulesets=$(gh api "repos/$repo/rulesets" 2>&1); then
  cat >&2 <<NOTE
    Cannot read rulesets on $repo, so nothing has been changed:

$(printf '%s\n' "$rulesets" | sed 's/^/      /')

    Rulesets on a private repository need GitHub Pro, Team, or Enterprise.
    Until the plan allows them, the local hooks in .husky and the workflows
    in .github/workflows are the whole of the enforcement, and neither can
    stop a merge.
NOTE
  exit 1
fi
echo "    available"

echo "==> Repository settings"
gh api -X PATCH "repos/$repo" --silent \
  -F delete_branch_on_merge=true \
  -F allow_auto_merge=true \
  -F allow_rebase_merge=true \
  -F allow_squash_merge=false \
  -F allow_merge_commit=false
echo "    branches delete on merge; rebase is the only merge method"

echo "==> Ruleset '$ruleset_name'"
id=$(printf '%s' "$rulesets" | jq -r ".[] | select(.name == \"$ruleset_name\") | .id")
if [ -n "$id" ]; then
  gh api -X PUT "repos/$repo/rulesets/$id" --input "$ruleset_file" --silent
  echo "    updated (id $id)"
else
  id=$(gh api -X POST "repos/$repo/rulesets" --input "$ruleset_file" --jq .id)
  echo "    created (id $id)"
fi

cat <<'NOTE'

Done. One thing this script cannot decide for you: the ruleset requires one
approving review, and GitHub does not let you approve your own pull request.
If you are the only maintainer, set required_approving_review_count to 0 in
.github/rulesets/main.json, commit that, and re-run. Editing it only on the
server will be silently reverted the next time this script runs, because it
replaces the whole ruleset.
NOTE
