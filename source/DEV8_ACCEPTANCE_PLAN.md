# dev8 Real-Device Acceptance Plan

1. `sandbox reset` then reboot.
2. Confirm clean baseline: Native absent, Core absent, default GRO.
3. Install exact dev8 Native package. Confirm Core remains absent.
4. Confirm `core_get` reports `installed=false`, Native GRO is optimized, and fw4 passes.
5. Install exact dev8 zh-cn package and open Overview.
6. Confirm the explicit Official Stable Core install control is visible.
7. Click it once. Do not run any feed Tailscale installation or CLI bootstrap command.
8. Confirm Core becomes official-static, running, NeedsLogin, and `opkg status tailscale` remains empty.
9. Reboot logged out and verify persistence.
10. Continue the already validated account/preferences/data-plane/uninstall/reattach sequence.
