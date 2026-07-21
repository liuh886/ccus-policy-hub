# Policy lifecycle migration run

- Date: 2026-07-21
- Commit: 8d031f27a2851150a93d4e1e2d13f32e9937b25b
- Exit status: 0

```text

> ccus-policy-hub@1.0.0 manage:db:migrate:policy-lifecycle /home/runner/work/ccus-policy-hub/ccus-policy-hub
> node scripts/migrate-policy-lifecycle-2026-07.mjs

{
  "migrationId": "policy-lifecycle-cleanup-2026-07",
  "beforeCount": 130,
  "afterCount": 124,
  "removedCount": 6,
  "aliases": [
    {
      "aliasId": "japan-ccs-act",
      "existed": true,
      "linksMoved": 21
    },
    {
      "aliasId": "jp-meti-specified-zones-2024",
      "existed": true,
      "linksMoved": 21
    },
    {
      "aliasId": "my-ccus-bill-2025",
      "existed": true,
      "linksMoved": 4
    },
    {
      "aliasId": "my-offshore-ccs-reg-2025",
      "existed": true,
      "linksMoved": 4
    },
    {
      "aliasId": "my-ccs-framework",
      "existed": true,
      "linksMoved": 4
    },
    {
      "aliasId": "eu-ccs-directive-2009",
      "existed": true,
      "linksMoved": 0
    }
  ]
}
```
