# luci-app-tailscale-native — v1.1.0-r1

Final release promoted from the exact real-device validated dev8 runtime payload.

Architecture:

- Native LuCI and Official Tailscale Core have independent lifecycles.
- Installing Native does **not** install Core.
- When Core is absent, LuCI exposes one explicit zero-argument action to install the official stable static Core.
- Core installation uses the fixed official stable source and checksum-verifying helper.
- Existing complete Core is detected and left untouched.
- Native uninstall never stops, disables, logs out, resets, deletes, or removes Core/state/preferences.
- Native owns only LuCI/RPC glue, fixed fw4 rules, and fixed router GRO persistence.
- No OpenWrt feed `tailscale` dependency or ownership exists.

Release version: `1.1.0-r1`.
