# CI governance

This repository participates in the shared cross-repository CI policy.

`CI Governance / Policy` runs only when workflows, `.github/ci-policy.json`, dependency manifests or lockfiles change. It does not add a permanent check to ordinary product, policy-content or documentation pull requests.

The policy enforces read-only pull-request authority, concurrency cancellation, bounded artifact retention, no hard-coded historical run IDs in required PR gates, and one declared package manager with one lockfile. Production High/Critical dependency risk is blocking; development and tooling risk is advisory.

All 6 repository workflows are governed in `.github/ci-policy.json`, covering required PR gates, release deployment, scheduled synchronization, and advisory maintenance checks. Any new workflow added under `.github/workflows/` must be registered in the manifest. Recommended branch-protection checks are documented in the manifest; GitHub repository settings remain an external administrative action.
