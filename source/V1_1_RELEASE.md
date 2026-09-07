# v1.1.0-r1 — Explicit Official Core Bootstrap

This release is the promotion of validated candidate `1.0.99-r8`.

## Final lifecycle

1. Install Native LuCI only.
2. Core may remain absent.
3. LuCI detects absent Core with strict boolean RPC fields.
4. User explicitly invokes `core_install` from LuCI.
5. Fixed helper installs checksum-verified Official stable static Tailscale Core.
6. Repeated `core_install` on a complete Core is a no-op.
7. Native uninstall removes only Native assets; Core, login, state, preferences and Core sysupgrade persistence survive.
8. Reinstalling Native on an existing Core is zero-touch reattachment; Core binaries and preferences remain unchanged.

## Promotion invariant

The final IPK data payload is byte-identical to the exact dev8 payload that passed real-device acceptance. Only package version metadata is promoted from `1.0.99-r8` to `1.1.0-r1`.
