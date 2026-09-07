# v1.1.0 dev8 — Absent-Core Boolean Contract Normalization

## Finding closed

`F-REL-004 ABSENT_CORE_BOOLEAN_TYPE`

Clean-Sandbox dev7 testing proved that Native could be installed while Core remained absent, but `core_get` serialized the absent `fs.access()` results as `null`:

- `installed: null`
- `cli_present: null`
- `daemon_present: null`
- `init_present: null`

The RPC contract is boolean. Dev8 normalizes the three presence probes to strict booleans before composing `installed`.

## Authorized runtime delta from dev7

Exactly one runtime file changes:

`/usr/share/rpcd/ucode/luci.tailscale`

No Core helper, LuCI view, ACL, GRO, fw4, account, preference, updater, lifecycle script, or Core ownership behavior changes.
