'use strict';
'require rpc';
'require ui';
'require view';

const callAccountGet = rpc.declare({
    object: 'luci.tailscale',
    method: 'account_get'
});

const callAccountLogin = rpc.declare({
    object: 'luci.tailscale',
    method: 'account_login'
});

const callAccountLogout = rpc.declare({
    object: 'luci.tailscale',
    method: 'account_logout'
});

function fieldRow(label, value, description) {
    return E('div', { 'class': 'cbi-value' }, [
        E('label', { 'class': 'cbi-value-title' }, [ label ]),
        E('div', { 'class': 'cbi-value-field' }, [
            value,
            description ? E('div', { 'class': 'cbi-value-description' }, [ description ]) : ''
        ])
    ]);
}

function text(v) {
    return String(v == null || v === '' ? '-' : v);
}

return view.extend({
    load: function() {
        return callAccountGet();
    },

    render: function(data) {
        const initial = data || {};
        let account = initial.account || {};

        const backendState = E('span', {}, [ text(account.backend_state) ]);
        const loginState = E('span', {}, [ account.logged_in === true ? _('Logged in') : (account.needs_login === true ? _('Needs login') : _('Not logged in')) ]);
        const loginName = E('span', {}, [ text(account.login_name) ]);
        const displayName = E('span', {}, [ text(account.display_name) ]);
        const tailnetName = E('span', {}, [ text(account.tailnet_name) ]);
        const magicDns = E('span', {}, [ text(account.magic_dns_suffix) ]);
        const deviceName = E('span', {}, [ text(account.hostname || account.dns_name) ]);

        const authBox = E('div', {
            'class': 'alert-message notice',
            'style': 'display:none; margin-top:12px;'
        }, [
            E('strong', {}, [ _('Browser authentication required: ') ]),
            E('a', {
                'href': '#',
                'target': '_blank',
                'rel': 'noopener noreferrer'
            }, [ _('Open Tailscale login') ])
        ]);
        const authLink = authBox.querySelector('a');

        const lifecycleWarning = E('div', {
            'class': 'alert-message warning',
            'style': 'margin:12px 0;'
        }, [
            E('strong', {}, [ _('Logout resets the local Tailscale profile preferences. ') ]),
            _('After browser login, Tailscale starts from its defaults. This LuCI intentionally does not back up or automatically restore previous preferences. A browser terminal may reconnect and lose its current shell session during logout.')
        ]);

        function renderAccount(next) {
            account = next || {};
            backendState.textContent = text(account.backend_state);
            loginState.textContent = account.logged_in === true ? _('Logged in') : (account.needs_login === true ? _('Needs login') : _('Not logged in'));
            loginName.textContent = text(account.login_name);
            displayName.textContent = text(account.display_name);
            tailnetName.textContent = text(account.tailnet_name);
            magicDns.textContent = text(account.magic_dns_suffix);
            deviceName.textContent = text(account.hostname || account.dns_name);

            loginButton.disabled = account.logged_in === true;
            logoutButton.disabled = account.logged_in !== true;

            if (account.logged_in === true) {
                authBox.style.display = 'none';
            }
            else if (account.auth_url) {
                authLink.href = String(account.auth_url);
                authLink.textContent = String(account.auth_url);
                authBox.style.display = '';
            }
        }

        const refreshButton = E('button', {
            'class': 'btn cbi-button',
            'click': async () => {
                refreshButton.disabled = true;
                try {
                    const result = await callAccountGet();
                    if (!result || result.ok !== true)
                        throw new Error((result && result.error) || _('Unable to read account status.'));
                    renderAccount(result.account || {});
                    ui.addNotification(null, E('p', {}, [ _('Account status refreshed.') ]), 'info');
                }
                catch (e) {
                    ui.addNotification(null, E('p', {}, [ _('Refresh failed: '), String(e.message || e) ]), 'error');
                }
                finally {
                    refreshButton.disabled = false;
                }
            }
        }, _('Refresh Status'));

        const loginButton = E('button', {
            'class': 'btn cbi-button cbi-button-positive',
            'click': async () => {
                loginButton.disabled = true;
                try {
                    const result = await callAccountLogin();
                    if (!result || result.ok !== true)
                        throw new Error((result && result.error) || _('Unable to start browser login.'));

                    if (result.auth_url) {
                        authLink.href = String(result.auth_url);
                        authLink.textContent = String(result.auth_url);
                        authBox.style.display = '';
                        ui.addNotification(null, E('p', {}, [ _('Browser login started through the local Tailscale daemon. Open the authentication link, authorize this device, then press Refresh Status.') ]), 'info');
                    }
                    else if (result.completed === true) {
                        const fresh = await callAccountGet();
                        if (fresh && fresh.ok === true)
                            renderAccount(fresh.account || {});
                        ui.addNotification(null, E('p', {}, [ _('Login completed.') ]), 'info');
                    }
                    else {
                        ui.addNotification(null, E('p', {}, [ _('Interactive login started. Refresh status to obtain the current authentication URL or observe completion.') ]), 'info');
                    }
                }
                catch (e) {
                    ui.addNotification(null, E('p', {}, [ _('Login failed: '), String(e.message || e) ]), 'error');
                }
                finally {
                    loginButton.disabled = account.logged_in === true;
                }
            }
        }, _('Start Browser Login'));

        const logoutButton = E('button', {
            'class': 'btn cbi-button cbi-button-negative',
            'click': async () => {
                if (!window.confirm(_('Log this device out of Tailscale? Logout resets the local Tailscale profile preferences. After login, Tailscale defaults are used and this LuCI will not auto-restore previous settings. A browser terminal may reconnect and lose its shell session. Continue only from local-LAN management.')))
                    return;

                logoutButton.disabled = true;
                try {
                    const result = await callAccountLogout();
                    if (!result || result.ok !== true)
                        throw new Error((result && (result.error || result.output)) || _('Tailscale logout failed.'));

                    const fresh = await callAccountGet();
                    if (fresh && fresh.ok === true)
                        renderAccount(fresh.account || {});
                    else {
                        account.logged_in = false;
                        account.needs_login = true;
                        account.backend_state = result.backend_state || 'NeedsLogin';
                        renderAccount(account);
                    }
                    ui.addNotification(null, E('p', {}, [ _('Device logged out. Previous Tailscale preferences are no longer active; re-login starts from Tailscale defaults.') ]), 'warning');
                }
                catch (e) {
                    ui.addNotification(null, E('p', {}, [ _('Logout failed: '), String(e.message || e) ]), 'error');
                }
                finally {
                    logoutButton.disabled = account.logged_in !== true;
                }
            }
        }, _('Log Out'));

        renderAccount(account);

        return E('div', { 'class': 'cbi-map' }, [
            E('h2', {}, [ _('Account') ]),
            E('div', { 'class': 'cbi-section-descr' }, [
                _('Account state is read from the installed official Tailscale Core. Browser login is initiated through tailscaled LocalAPI and does not accept or store auth keys, OAuth credentials, tokens, custom control-server URLs, or arbitrary CLI arguments.')
            ]),
            lifecycleWarning,
            E('div', { 'class': 'cbi-section' }, [
                fieldRow(_('Backend State'), backendState, _('The official Tailscale backend state for this device.')),
                fieldRow(_('Account State'), loginState, _('Logged-in state is derived from the current Tailscale backend state.')),
                fieldRow(_('Login Name'), loginName, _('Identity reported by the current Tailscale status.')),
                fieldRow(_('Display Name'), displayName, null),
                fieldRow(_('Tailnet'), tailnetName, null),
                fieldRow(_('MagicDNS Suffix'), magicDns, null),
                fieldRow(_('Device'), deviceName, null),
                authBox,
                E('div', { 'class': 'cbi-page-actions' }, [ refreshButton, ' ', loginButton, ' ', logoutButton ])
            ])
        ]);
    },

    handleSave: null,
    handleSaveApply: null,
    handleReset: null
});
