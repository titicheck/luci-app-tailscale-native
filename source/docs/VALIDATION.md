# Validation Plan — dev7

1. Clean Sandbox: Native absent, Core absent, GRO default.
2. Install exact dev7 main IPK. Confirm Native present but Core remains absent and `opkg status tailscale` remains empty.
3. Confirm Overview loads, `core_get` reports `installed=false`, GRO is optimized, fw4 passes.
4. Use the Overview `Install Official Stable Core` button. Confirm official stable Core is downloaded and installed; `opkg status tailscale` remains empty.
5. Verify Core version/source/service/sysupgrade persistence and `NeedsLogin` state.
6. Reboot logged out; verify Core, RPC, fw4, GRO and keep contract persist.
7. Install zh-cn, login through Native Account, restore frozen preferences and run subnet/exit-node/OpenClash data-plane checks.
8. Record Core SHA/preferences, uninstall Native, reboot and confirm Core/login/preferences persist while GRO returns to system baseline.
9. Reinstall dev7; Existing Core must remain NO-OP and SHA/preferences must compare equal.
