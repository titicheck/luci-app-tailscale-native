# Strict Current-Only Review — dev8 Absent-Core Boolean Normalization

## Exact subject

Candidate: `luci-app-tailscale-native 1.0.99-r8`

Authorized delta from dev7: normalize absent-Core presence fields in `core_get` to strict JSON booleans.

## Real-device finding

Clean-Sandbox dev7 acceptance established all intended lifecycle facts:

- Native installed successfully with no Core package or binaries present.
- OpenWrt feed `tailscale` was not installed.
- GRO optimization activated on `eth1` only.
- fw4 passed.

One deterministic RPC-contract defect was exposed: ucode `fs.access()` returns a falsey null value when the path is absent, and the dev7 RPC returned those raw values. Consequently `installed`, `cli_present`, `daemon_present`, and `init_present` serialized as `null` instead of boolean `false`.

## Correction review

PASS — the three Core presence probes are normalized with `? true : false`.

PASS — composed `installed` is explicitly normalized to boolean.

PASS — exactly one runtime payload file differs from dev7: `usr/share/rpcd/ucode/luci.tailscale`.

PASS — `/usr/libexec/tailscale-native-core` remains byte-identical to dev7 and the previously verified helper.

PASS — Native `postinst` still does not bootstrap Core.

PASS — `core_install` remains zero-argument and invokes only `/usr/libexec/tailscale-native-core install`.

PASS — no `Depends: tailscale`, no feed Core install/remove, no arbitrary URL/version/channel/arch/shell surface.

PASS — GRO, fw4, LuCI Overview, account, preferences, update, lifecycle scripts and i18n runtime payload are unchanged from dev7.

## Disposition

`F-REL-004 ABSENT_CORE_BOOLEAN_TYPE` is corrected statically. Promotion remains blocked until the exact dev8 package proves on the existing clean-Sandbox scene that absent Core returns strict false booleans, after which explicit LuCI Core installation can be tested.
