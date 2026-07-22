# Policy DB consistency report

This report compares policy-owned artifacts with the SQLite single source of truth.
Facilities and coordinates are intentionally outside its scope.

## Summary

- SQLite policies: **130**
- English policy files: **130**
- Chinese policy files: **130**
- Public policy records: **130**
- Consistency mismatches: **0**
- Formatting-only equivalents ignored: **48**
- Result: **PASS**

## Rules

1. SQLite is the only writable source of policy truth.
2. Markdown and public JSON may project fields but may not invent values.
3. Missing provenance or analysis values remain absent or null; export time is not an audit date.
4. Policy IDs and bilingual records must have exact parity across governed artifacts.
5. CRLF/LF, trailing spaces and a blank line after an ATX heading are treated as formatting equivalents.
6. Facility contents and coordinates are not evaluated or changed by this audit.
