'use strict';
'require rpc';
'require ui';
'require view';

const callPrefsGet = rpc.declare({
    object: 'luci.tailscale',
    method: 'prefs_get'
});

const callCapabilities = rpc.declare({
    object: 'luci.tailscale',
    method: 'capabilities'
});

const callVersion = rpc.declare({
    object: 'luci.tailscale',
    method: 'version'
});

const callUpdateCheck = rpc.declare({
    object: 'luci.tailscale',
    method: 'update_check'
});

const callUpdateApply = rpc.declare({
    object: 'luci.tailscale',
    method: 'update_apply'
});

const callPrefsSet = rpc.declare({
    object: 'luci.tailscale',
    method: 'prefs_set',
    params: [ 'update_check', 'auto_update' ]
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

return view.extend({
    load: function() {
        return Promise.all([ callPrefsGet(), callCapabilities(), callVersion() ]);
    },

    render: function(data) {
        const prefResult = data[0] || {};
        const capResult = data[1] || {};
        const verResult = data[2] || {};
        const prefs = prefResult.preferences || {};
        const flags = capResult.set_flags || {};
        const commands = capResult.commands || {};

        const original = {
            update_check: bool(prefs['update-check']),
            auto_update: bool(prefs['auto-update'])
        };

        const updateCheckPref = E('input', { 'type': 'checkbox' });
        const autoUpdate = E('input', { 'type': 'checkbox' });
        updateCheckPref.checked = original.update_check;
        autoUpdate.checked = original.auto_update;
        updateCheckPref.disabled = flags.update_check !== true;
        autoUpdate.disabled = flags.auto_update !== true;

        const currentVersion = E('span', {}, [ String(verResult.cli || '-') ]);
        const latestVersion = E('span', {}, [ _('Not checked yet') ]);
        const updateOutput = E('pre', {
            'style': 'white-space: pre-wrap; overflow-wrap: anywhere; margin-top: 8px;'
        }, [ _('Press Check for Updates to run a read-only Tailscale dry-run.') ]);

        const saveButton = E('button', {
            'class': 'btn cbi-button cbi-button-action important',
            'click': async () => {
                const current = {
                    update_check: updateCheckPref.checked,
                    auto_update: autoUpdate.checked
                };
                const changedCheck = current.update_check !== original.update_check && flags.update_check === true;
                const changedAuto = current.auto_update !== original.auto_update && flags.auto_update === true;

                if (!changedCheck && !changedAuto) {
                    ui.addNotification(null, E('p', {}, [ _('No changes to apply.') ]), 'info');
                    return;
                }

                saveButton.disabled = true;
                try {
                    const result = await callPrefsSet(
                        changedCheck ? current.update_check : undefined,
                        changedAuto ? current.auto_update : undefined
                    );
                    if (!result || result.ok !== true)
                        throw new Error((result && result.error) || _('Tailscale rejected the requested change.'));

                    const fresh = result.preferences || {};
                    original.update_check = fresh['update-check'] == null ? current.update_check : bool(fresh['update-check']);
                    original.auto_update = fresh['auto-update'] == null ? current.auto_update : bool(fresh['auto-update']);
                    updateCheckPref.checked = original.update_check;
                    autoUpdate.checked = original.auto_update;
                    ui.addNotification(null, E('p', {}, [ _('Update preferences applied successfully.') ]), 'info');
                }
                catch (e) {
                    ui.addNotification(null, E('p', {}, [ _('Apply failed: '), String(e.message || e) ]), 'error');
                }
                finally {
                    saveButton.disabled = false;
                }
            }
        }, _('Apply Changes'));

        const checkButton = E('button', {
            'class': 'btn cbi-button cbi-button-action',
            'click': async () => {
                checkButton.disabled = true;
                try {
                    const result = await callUpdateCheck();
                    if (!result || result.ok !== true)
                        throw new Error((result && result.output) || _('Tailscale update dry-run failed.'));

                    currentVersion.textContent = String(result.current || verResult.cli || '-');
                    latestVersion.textContent = String(result.latest || _('Unknown'));
                    updateOutput.textContent = String(result.output || _('No output'));
                    ui.addNotification(null, E('p', {}, [ _('Update check completed without changing the installed version.') ]), 'info');
                }
                catch (e) {
                    ui.addNotification(null, E('p', {}, [ _('Update check failed: '), String(e.message || e) ]), 'error');
                }
                finally {
                    checkButton.disabled = commands.update !== true;
                }
            }
        }, _('Check for Updates'));
        checkButton.disabled = commands.update !== true;

        const installButton = E('button', {
            'class': 'btn cbi-button cbi-button-positive',
            'click': async () => {
                if (!window.confirm(_('Run the official Tailscale stable updater now? This may restart tailscaled if a new version is installed.')))
                    return;

                installButton.disabled = true;
                checkButton.disabled = true;
                saveButton.disabled = true;
                try {
                    const result = await callUpdateApply();
                    if (!result || result.ok !== true)
                        throw new Error((result && (result.error || result.output)) || _('Tailscale update failed.'));

                    currentVersion.textContent = String(result.after || result.before || '-');
                    latestVersion.textContent = String(result.after || result.before || _('Unknown'));
                    updateOutput.textContent = String(result.output || _('Updater completed without output.'));

                    const summary = result.changed === true
                        ? _('Tailscale updated successfully: %s → %s').format(String(result.before || '?'), String(result.after || '?'))
                        : _('Manual update completed; the installed version did not change.');
                    ui.addNotification(null, E('p', {}, [ summary ]), 'info');
                }
                catch (e) {
                    ui.addNotification(null, E('p', {}, [ _('Manual update failed: '), String(e.message || e) ]), 'error');
                }
                finally {
                    installButton.disabled = commands.update !== true;
                    checkButton.disabled = commands.update !== true;
                    saveButton.disabled = false;
                }
            }
        }, _('Install Stable Update'));
        installButton.disabled = commands.update !== true;

        return E('div', { 'class': 'cbi-map' }, [
            E('h2', {}, [ _('Maintenance') ]),
            E('div', { 'class': 'cbi-section-descr' }, [
                _('Update status and preferences use the installed official Tailscale Core. Check is read-only; Install Stable Update runs the fixed official "tailscale update --yes" command and exposes no arbitrary version, channel, URL, or shell input.')
            ]),
            E('div', { 'class': 'cbi-section' }, [
                fieldRow(_('Installed Runtime Version'), currentVersion, _('Runtime authority is tailscale version, not OpenWrt package metadata.')),
                fieldRow(_('Latest Version'), latestVersion, _('Populated by the official updater check or a completed manual update.')),
                fieldRow(_('Update Notifications'), updateCheckPref, _('Allow Tailscale to notify this device when an update is available.')),
                fieldRow(_('Automatic Updates'), autoUpdate, _('Allow Tailscale to automatically apply supported client updates.')),
                fieldRow(_('Update Output'), updateOutput, _('Raw output from the official Tailscale updater is shown for auditability.')),
                E('div', { 'class': 'cbi-page-actions' }, [ checkButton, ' ', installButton, ' ', saveButton ])
            ])
        ]);
    },

    handleSave: null,
    handleSaveApply: null,
    handleReset: null
});
