# SPDX-License-Identifier: GPL-2.0-only
include $(TOPDIR)/rules.mk

LUCI_TITLE:=Native LuCI integration for the official Tailscale Core
LUCI_DESCRIPTION:=Native LuCI control plane for the official Tailscale Core with explicit checksum-verified official-static Core installation, sysupgrade persistence, router performance optimization, partial preference writes, routing and exit-node controls, account lifecycle, stable updater controls, and minimal tested fw4 glue.
LUCI_DEPENDS:=+luci-base +rpcd +rpcd-mod-ucode +ucode +ucode-mod-fs +curl +ca-bundle +kmod-tun +ethtool
LUCI_PKGARCH:=all
LUCI_MAINTAINER:=GUIHENG Project

PKG_LICENSE:=GPL-2.0-only
PKG_LICENSE_FILES:=LICENSE
PKG_VERSION:=1.1.0
PKG_RELEASE:=1
PKG_PO_VERSION:=1.1.0-r1
CONFLICTS:=luci-app-tailscaler

# Fail closed on the legacy iStore wrapper. We intentionally do not auto-remove
# it because its uninstall script has been observed to run tailscaled --cleanup.
define Package/luci-app-tailscale-native/preinst
#!/bin/sh
if [ -z "$${IPKG_INSTROOT}" ]; then
	for p in app-meta-tailscale luci-app-tailscaler; do
		if [ -f "/usr/lib/opkg/info/$${p}.control" ]; then
			echo "luci-app-tailscale-native: remove legacy $${p} before installing this package" >&2
			exit 1
		fi
	done
fi
exit 0
endef

# Only refresh LuCI/rpcd and fw4 ownership. Never touch Tailscale daemon state,
# login state, preferences or state files from package lifecycle scripts.
define Package/luci-app-tailscale-native/postinst
#!/bin/sh
if [ -z "$${IPKG_INSTROOT}" ]; then
	# Core installation is intentionally NOT part of the Native package
	# lifecycle. A clean Native install leaves Core absent until the user
	# explicitly invokes the fixed-scope LuCI Core install action.

	# Native owns only its deterministic router performance helper.
	if [ -x /etc/init.d/tailscale-native-perf ]; then
		/etc/init.d/tailscale-native-perf enable >/dev/null 2>&1 || true
		/etc/init.d/tailscale-native-perf start >/dev/null 2>&1 || true
	fi

	rm -f /tmp/luci-indexcache.*
	rm -rf /tmp/luci-modulecache/
	/etc/init.d/rpcd reload >/dev/null 2>&1 || true
	command -v fw4 >/dev/null 2>&1 && fw4 -q reload >/dev/null 2>&1 || true
fi
exit 0
endef

define Package/luci-app-tailscale-native/prerm
#!/bin/sh
if [ -z "$${IPKG_INSTROOT}" ]; then
	# Remove only Native persistence. Do not stop, disable, clean up, log out, or
	# remove the official Tailscale Core. Live NIC feature state is intentionally
	# left unchanged until the next interface cycle/reboot.
	if [ -x /etc/init.d/tailscale-native-perf ]; then
		/etc/init.d/tailscale-native-perf disable >/dev/null 2>&1 || true
	fi
fi
exit 0
endef

define Package/luci-app-tailscale-native/postrm
#!/bin/sh
if [ -z "$${IPKG_INSTROOT}" ]; then
	rm -f /etc/rc.d/*tailscale-native-perf* 2>/dev/null || true
	rm -f /tmp/luci-indexcache.*
	rm -rf /tmp/luci-modulecache/
	/etc/init.d/rpcd reload >/dev/null 2>&1 || true
	command -v fw4 >/dev/null 2>&1 && fw4 -q reload >/dev/null 2>&1 || true
fi
exit 0
endef

include $(TOPDIR)/feeds/luci/luci.mk
