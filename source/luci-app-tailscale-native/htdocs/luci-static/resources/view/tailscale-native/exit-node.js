'use strict';
'require rpc';
'require ui';
'require view';

const callPrefsGet = rpc.declare({
    object: 'luci.tailscale',
    method: 'prefs_get'
});

const callStatus = rpc.declare({
    object: 'luci.tailscale',
    method: 'status'
});

const callCapabilities = rpc.declare({
    object: 'luci.tailscale',
    method: 'capabilities'
});

/* Undefined positional values are omitted by LuCI RPC, preserving the
 * backend partial-write contract. */
const callPrefsSet = rpc.declare({
    object: 'luci.tailscale',
    method: 'prefs_set',
    params: [ 'exit_node', 'exit_node_allow_lan_access' ]
});

function bool(v) {
    return v === true;
}

function fieldRow(label, control, description) {
    return E('div', { 'class': 'cbi-value' }, [
        E('label', { 'class': 'cbi-value-title' }, [ label ]),
        E('div', { 'class': 'cbi-value-field' }, [
            control,
            description ? E('div', { 'class': 'cbi-value-description' }, [ description ]) : ''
        ])
    ]);
}

function preferredIP(peer) {
    let ips = peer && peer.tailscale_ips || [];
    for (let ip of ips)
        if (String(ip).indexOf(':') < 0)
            return String(ip);
    return ips.length ? String(ips[0]) : '';
}

function candidateLabel(peer, id) {
    let name = String(peer.hostname || peer.dns_name || peer.id || id || 'Exit node');
    let ip = preferredIP(peer);
    return ip ? name + ' (' + ip + ')' : name;
}

return view.extend({
    load: function() {
        return Promise.all([ callPrefsGet(), callStatus(), callCapabilities() ]);
    },

    render: function(data) {
        const prefResult = data[0] || {};
        const statusResult = data[1] || {};
        const capResult = data[2] || {};
        const prefs = prefResult.preferences || {};
        const status = statusResult.status || {};
        const flags = capResult.set_flags || {};

        const original = {
            exit_node: prefs['exit-node'] == null ? '' : String(prefs['exit-node']),
            allow_lan: bool(prefs['exit-node-allow-lan-access']),
            advertise_exit_node: bool(prefs['advertise-exit-node'])
        };

        const select = E('select', { 'class': 'cbi-input-select' }, [
            E('option', { 'value': '' }, [ _('None') ]),
            E('option', { 'value': 'auto:any' }, [ _('Automatic (suggested exit node)') ])
        ]);

        let seen = { '': true, 'auto:any': true };
        for (let peer of (status.peers || [])) {
            if (peer.exit_node_option !== true)
                continue;
            let id = preferredIP(peer);
            if (!id || seen[id])
                continue;
            seen[id] = true;
            select.appendChild(E('option', { 'value': id }, [ candidateLabel(peer, id) ]));
        }

        /* Preserve an existing identifier even if it is not currently present
         * in status (offline node, policy-managed value, stable ID, etc.). */
        if (original.exit_node && !seen[original.exit_node])
            select.appendChild(E('option', { 'value': original.exit_node }, [ _('Current: ') + original.exit_node ]));

        select.value = original.exit_node;

        const allowLan = E('input', { 'type': 'checkbox' });
        allowLan.checked = original.allow_lan;

        function refreshControlState() {
            const roleBlocked = original.advertise_exit_node === true;
            const exitSupported = flags.exit_node === true;
            const lanSupported = flags.exit_node_allow_lan_access === true;
            const usingExit = String(select.value || '') !== '';

            select.disabled = !exitSupported || roleBlocked;
            if (!exitSupported)
                select.title = _('Not supported by the installed Tailscale Core');
            else if (roleBlocked)
                select.title = _('This device is advertising itself as an exit node. Disable Advertise Exit Node in Routing first.');
            else
                select.title = '';

            /* The preference is retained by Tailscale even while no exit node
             * is selected, but it is inactive until an exit node is in use. */
            allowLan.disabled = !lanSupported || roleBlocked || !usingExit;
            if (!lanSupported)
                allowLan.title = _('Not supported by the installed Tailscale Core');
            else if (roleBlocked)
                allowLan.title = _('This device is advertising itself as an exit node. Disable Advertise Exit Node in Routing first.');
            else if (!usingExit)
                allowLan.title = _('Inactive while Use Exit Node is None. The stored preference is preserved.');
            else
                allowLan.title = '';
        }

        select.addEventListener('change', refreshControlState);
        refreshControlState();

        const saveButton = E('button', {
            'class': 'btn cbi-button cbi-button-action important',
            'click': async () => {
                const current = {
                    exit_node: String(select.value || ''),
                    allow_lan: allowLan.checked
                };

                if (original.advertise_exit_node === true && current.exit_node !== '') {
                    ui.addNotification(null, E('p', {}, [
                        _('This device is currently advertising itself as an exit node. Disable Advertise Exit Node in Routing before selecting another exit node.')
                    ]), 'error');
                    return;
                }

                const changedExit = current.exit_node !== original.exit_node && flags.exit_node === true;
                const changedLan = current.allow_lan !== original.allow_lan && flags.exit_node_allow_lan_access === true;

                if (!changedExit && !changedLan) {
                    ui.addNotification(null, E('p', {}, [ _('No changes to apply.') ]), 'info');
                    return;
                }

                saveButton.disabled = true;
                try {
                    const result = await callPrefsSet(
                        changedExit ? current.exit_node : undefined,
                        changedLan ? current.allow_lan : undefined
                    );

                    if (!result || result.ok !== true)
                        throw new Error((result && result.error) || _('Tailscale rejected the requested change.'));

                    const fresh = result.preferences || {};
                    original.exit_node = fresh['exit-node'] == null ? current.exit_node : String(fresh['exit-node']);
                    original.allow_lan = fresh['exit-node-allow-lan-access'] == null ? current.allow_lan : bool(fresh['exit-node-allow-lan-access']);
                    original.advertise_exit_node = fresh['advertise-exit-node'] == null ? original.advertise_exit_node : bool(fresh['advertise-exit-node']);

                    if (original.exit_node && !Array.from(select.options).some(function(o) { return o.value === original.exit_node; }))
                        select.appendChild(E('option', { 'value': original.exit_node }, [ _('Current: ') + original.exit_node ]));

                    select.value = original.exit_node;
                    allowLan.checked = original.allow_lan;
                    refreshControlState();
                    ui.addNotification(null, E('p', {}, [ _('Exit node preferences applied successfully.') ]), 'info');
                }
                catch (e) {
                    ui.addNotification(null, E('p', {}, [ _('Apply failed: '), String(e.message || e) ]), 'error');
                }
                finally {
                    saveButton.disabled = false;
                }
            }
        }, _('Apply Changes'));

        const roleNotice = original.advertise_exit_node === true
            ? E('div', { 'class': 'alert-message warning' }, [
                _('This device is currently advertising itself as an exit node. Tailscale does not allow a device to advertise an exit node and use another exit node at the same time. Disable Advertise Exit Node in Routing first.')
            ])
            : '';

        return E('div', { 'class': 'cbi-map' }, [
            E('h2', {}, [ _('Exit Node') ]),
            E('div', { 'class': 'cbi-section-descr' }, [
                _('Choose whether this R76S itself uses another Tailscale exit node. This is separate from advertising this device as an exit node in Routing.')
            ]),
            roleNotice,
            E('div', { 'class': 'cbi-section' }, [
                fieldRow(_('Use Exit Node'), select, _("None disables exit-node use. Available exit-node peers are discovered from current Tailscale status. Automatic follows Tailscale's suggested exit node when supported.")),
                fieldRow(_('Allow LAN Access'), allowLan, _('Allow this device to access its local LAN while it is routing internet traffic through an exit node. When no exit node is selected, this stored preference is inactive and is not automatically reset.')),
                E('div', { 'class': 'cbi-page-actions' }, [ saveButton ])
            ])
        ]);
    },

    handleSave: null,
    handleSaveApply: null,
    handleReset: null
});
