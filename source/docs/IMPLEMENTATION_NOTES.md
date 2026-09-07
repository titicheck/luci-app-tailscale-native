# Implementation Notes — dev7

Native and Core are separate lifecycle objects.

A clean Native package install lays down LuCI/RPC, the fixed Core helper/templates, fw4 glue and Native GRO persistence only. It does not call the Core helper from package lifecycle scripts.

When Core is absent, Overview offers one explicit install action. The action is zero-argument and maps to the existing helper. The helper owns stable metadata lookup, SHA256 verification, static binary activation, OpenWrt adapter creation, Core sysupgrade persistence and daemon start.

Once Core exists, runtime state/preferences remain Tailscale authority. Native uninstall leaves Core, service adapter, state, login, preferences and Core sysupgrade persistence untouched.
