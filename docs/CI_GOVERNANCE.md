# CI governance

This repository participates in the shared cross-repository CI policy.

`CI Governance / Policy` runs only when workflows, `.github/ci-policy.json`, dependency manifests or lockfiles change. It does not add a permanent check to ordinary product, policy-content or documentation pull requests.

The policy enforces read-only pull-request authority, concurrency cancellation, bounded artifact retention, no hard-coded historical run IDs in required PR gates, and one declared package manager with one lockfile. Production High/Critical dependency risk is blocking; development and tooling risk is advisory.

Stable core workflows are listed in `.github/ci-policy.json`. Other workflows remain inventoried and should be promoted into the governed set when materially edited. Recommended branch-protection checks are documented in the manifest; GitHub repository settings remain an external administrative action.
