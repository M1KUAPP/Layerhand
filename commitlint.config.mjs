/**
 * Conventional Commits rules for this repository.
 *
 * Single source of truth for three checks, so all three agree:
 *   - commit messages     (.husky/commit-msg)
 *   - pull request titles (.github/workflows/conventional-lint.yml)
 *   - issue titles        (.github/workflows/issue-title-lint.yml)
 *
 * Spec: https://www.conventionalcommits.org/en/v1.0.0/
 */
export default {
  extends: ['@commitlint/config-conventional']
}
