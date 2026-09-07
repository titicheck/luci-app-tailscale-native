# RPC Contract — v1.1 dev7

Read methods:
- `core_get`
- `performance_get`
- `version`
- `prefs_get`
- `status`
- `capabilities`
- `update_check`
- `account_get`

Write/action methods:
- `core_install`
- `prefs_set`
- `update_apply`
- `account_login`
- `account_logout`

`core_install` accepts no parameters and can invoke only the fixed helper `/usr/libexec/tailscale-native-core install`.

No arbitrary command, argv, version, channel, URL, architecture selector, auth key, OAuth credential, or shell surface is exposed.

Absent by design: Core remove RPC, daemon control RPC, diagnostics RPC.
