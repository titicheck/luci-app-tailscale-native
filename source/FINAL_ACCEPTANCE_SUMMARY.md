# FINAL ACCEPTANCE SUMMARY

Target: FriendlyElec NanoPi R76S / iStoreOS 24.10.8.

The exact dev8 runtime payload completed clean-Sandbox acceptance through install, explicit Core bootstrap, reboot, login, preference restoration, subnet routing, exit-node routing, OpenClash coexistence, Native uninstall, post-uninstall reboot, and Existing-Core Native reattachment.

Production deployment should use the promoted `1.1.0-r1` artifacts only. Production does not need the destructive uninstall/reinstall certification sequence already completed in Sandbox.

Recommended production sequence:

1. Install final Native main IPK.
2. Install final zh-cn IPK if desired.
3. Open LuCI and explicitly install Official Core if Core is absent.
4. Reboot once.
5. Log in through Native Account.
6. Apply the frozen preferences.
7. Verify subnet route, exit node, and OpenClash coexistence.

Never `sandbox commit` the certification Sandbox.
