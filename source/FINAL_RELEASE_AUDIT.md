# FINAL RELEASE AUDIT — luci-app-tailscale-native v1.1.0-r1

## Disposition

**PASS — deterministic findings: 0.**

Release is promoted from exact real-device validated candidate `1.0.99-r8`.

## Frozen architecture

- Native LuCI install does not bootstrap Core.
- Official Core installation is a separate explicit zero-argument LuCI action.
- No `Depends: tailscale`; no `opkg install tailscale`; no feed Core ownership.
- Core helper accepts only fixed `install` / `status` semantics and resolves Official stable static Core with checksum validation.
- Native lifecycle never performs `tailscale up`, `up --reset`, `logout`, Core cleanup, state deletion or preference deletion.
- Existing complete Official Core is zero-touch on Native reinstall.
- Native owns only LuCI/RPC, fixed fw4 glue, and fixed GRO persistence.

## Real-device acceptance summary

- Clean baseline: PASS.
- Native-only install with Core absent: PASS.
- Absent-Core RPC strict booleans: PASS.
- LuCI explicit Official Core bootstrap: PASS.
- Official Core 1.102.3 / `source=official-static`: PASS.
- Feed package remains absent: PASS.
- Repeated `core_install` idempotence and unchanged Core SHA: PASS.
- Reboot after explicit bootstrap while logged out: PASS.
- LuCI account login: PASS.
- Frozen preferences restoration: PASS.
- Tailnet → router data plane: PASS.
- Subnet router → 192.168.1.0/24: PASS.
- Exit-node operation: PASS.
- OpenClash coexistence: PASS.
- Native uninstall retains Core/login/state/preferences/sysupgrade keep: PASS.
- Native uninstall + reboot restores system GRO baseline: PASS.
- Existing-Core Native reattach: PASS.
- Reattach leaves Core SHA unchanged and preferences byte-for-byte unchanged: PASS.
- Reattach restores RPC/fw4/GRO Native responsibilities: PASS.

## Promotion equivalence

Final main data payload SHA256: `419cb40ff3a95c4284e926727d7088db2e40226ed8d2e44b3405bdcb310d04ad`
Dev8 main data payload SHA256:  `419cb40ff3a95c4284e926727d7088db2e40226ed8d2e44b3405bdcb310d04ad`

Final zh-cn data payload SHA256: `ca3bd83817731ea44c1a7458622fd23e15968432bff85dbfb402f6c3933e14ae`
Dev8 zh-cn data payload SHA256:  `ca3bd83817731ea44c1a7458622fd23e15968432bff85dbfb402f6c3933e14ae`

Both pairs are identical. Runtime payload is unchanged from the exact dev8 package tested on the R76S. Final package promotion changes only package-version metadata from `1.0.99-r8` to `1.1.0-r1`.

## Final artifact hashes

- Main IPK: `4d304c1f9679a7fe8b9c623db7cc39ba20979fdad16f1711b186844832889ad4`
- zh-cn IPK: `f763448021fec10b17ef7879fc428604f02e0b5d1913edcbb276b11e2c885fbd`
- Source ZIP hash: see top-level `SHA256SUMS` (kept external to the source ZIP to avoid self-reference).

## Supersession

This explicit-Core-bootstrap `1.1.0-r1` supersedes the earlier rejected `1.1.0-r1` artifact whose Native postinst implicitly bootstrapped Core. Do not use the earlier artifact or its hashes.
