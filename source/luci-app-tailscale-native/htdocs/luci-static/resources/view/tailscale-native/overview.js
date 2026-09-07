'use strict';
'require rpc';
'require ui';
'require view';

const callCore = rpc.declare({ object: 'luci.tailscale', method: 'core_get' });
const callCoreInstall = rpc.declare({ object: 'luci.tailscale', method: 'core_install' });
const callPerformance = rpc.declare({ object: 'luci.tailscale', method: 'performance_get' });
const callStatus = rpc.declare({ object: 'luci.tailscale', method: 'status' });
const callVersion = rpc.declare({ object: 'luci.tailscale', method: 'version' });
const callCapabilities = rpc.declare({ object: 'luci.tailscale', method: 'capabilities' });

function row(label, value) {
    return E('tr', { 'class': 'tr' }, [
        E('td', { 'class': 'td left', 'width': '34%' }, [ label ]),
        E('td', { 'class': 'td left' }, [ value == null || value === '' ? '-' : String(value) ])
    ]);
}

function boolText(v) {
    return v ? _('Yes') : _('No');
}

return view.extend({
    load: function() {
        return Promise.all([ callCore(), callPerformance(), callStatus(), callVersion(), callCapabilities() ]);
    },

    render: function(data) {
        const core = (data[0] || {}).core || {};
        const perf = (data[1] || {}).performance || {};
        const s = (data[2] || {}).status || {};
        const vr = data[3] || {};
        const cr = data[4] || {};
        const self = s.self || {};
        const peers = s.peers || [];
        const devs = (perf.devices || []).map(d => '%s (%s / %s)'.format(d.name, d.rx_udp_gro_forwarding, d.rx_gro_list)).join(', ');

        const table = E('table', { 'class': 'table' }, [
            row(_('Core installed'), boolText(core.installed === true)),
            row(_('Core service running'), boolText(core.running === true)),
            row(_('Core backend state'), core.backend_state),
            row(_('Core runtime version'), core.version || vr.cli),
            row(_('Router performance optimization'), perf.supported ? (perf.optimized ? _('Optimized') : _('Not optimized')) : _('Not supported')),
            row(_('Optimized interface(s)'), devs || '-'),
            row(_('Performance policy'), perf.policy || '-'),
            row(_('Backend state'), s.backend_state),
            row(_('CLI version'), vr.cli),
            row(_('Daemon version'), vr.daemon),
            row(_('Hostname'), self.hostname),
            row(_('Tailscale IPv4'), s.ipv4),
            row(_('Tailscale IPv6'), s.ipv6),
            row(_('Online'), boolText(self.online)),
            row(_('Offers exit node'), boolText(self.exit_node_option)),
            row(_('DERP region'), self.relay || '-'),
            row(_('Peers'), peers.length),
            row(_('Native control support'), boolText(!!cr.commands?.get && !!cr.commands?.set))
        ]);

        const installButton = E('button', {
            'class': 'btn cbi-button cbi-button-positive',
            'click': async () => {
                if (!window.confirm(_('Install the official stable Tailscale Core now? Native will download only from pkgs.tailscale.com/stable, verify the official SHA256, install the fixed OpenWrt service adapter, and start tailscaled.')))
                    return;

                installButton.disabled = true;
                try {
                    const result = await callCoreInstall();
                    if (!result || result.ok !== true)
                        throw new Error((result && (result.error || result.output)) || _('Official Core install failed.'));

                    ui.addNotification(null, E('p', {}, [ _('Official stable Tailscale Core installed successfully.') ]), 'info');
                    window.setTimeout(() => window.location.reload(), 500);
                }
                catch (e) {
                    ui.addNotification(null, E('p', {}, [ _('Core install failed: '), String(e.message || e) ]), 'error');
                    installButton.disabled = false;
                }
            }
        }, _('Install Official Stable Core'));

        const coreAction = core.installed === true ? '' : E('div', {
            'class': 'alert-message notice',
            'style': 'margin:12px 0;'
        }, [
            E('div', { 'style': 'margin-bottom:8px;' }, [
                _('Core is not installed. Install the official stable Core before configuring or logging in to Tailscale.')
            ]),
            installButton
        ]);

        return E('div', {}, [
            E('h2', {}, [ _('Tailscale Native') ]),
            E('div', { 'class': 'cbi-section-descr' }, [
                _('Native and Core have separate lifecycles. Installing this LuCI does not install Tailscale Core; Core installation is an explicit action using only the official stable source with SHA256 verification.')
            ]),
            coreAction,
            E('div', { 'class': 'cbi-section' }, [ table ])
        ]);
    },

    handleSave: null,
    handleSaveApply: null,
    handleReset: null
});
