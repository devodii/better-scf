# Changesets

Every user-facing change gets a changeset, written in plain words for the people who use better-scf.

1. Run `pnpm changeset`, pick the packages (usually `extension`) and the bump, and describe the change in one sentence.
2. Commit the generated file with your change.
3. To cut a release, run `pnpm version-packages`. It bumps every package to the same version and writes the entries into each `CHANGELOG.md`. The website's changelog page reads `apps/extension/CHANGELOG.md`.
