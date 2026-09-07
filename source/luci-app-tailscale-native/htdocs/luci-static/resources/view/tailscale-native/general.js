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

/* Undefined positional values become omitted JSON object properties in LuCI's
 * RPC layer. This lets the UI preserve the backend's partial-write contract. */
const callPrefsSet = rpc.declare({
	object: 'luci.tailscale',
	method: 'prefs_set',
	params: [ 'hostname', 'accept_dns', 'accept_routes', 'shields_up' ]
});

function bool(v) {
	return v === true;
}

function setDisabled(el, disabled) {
	el.disabled = !!disabled;
	if (disabled)
		el.title = _('Not supported by the installed Tailscale Core');
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
		return Promise.all([ callPrefsGet(), callCapabilities() ]);
	},

	render: function(data) {
		const prefResult = data[0] || {};
		const capResult = data[1] || {};
		const prefs = prefResult.preferences || {};
		const flags = capResult.set_flags || {};

		const original = {
			hostname: prefs['hostname'] == null ? '' : String(prefs['hostname']),
			accept_dns: bool(prefs['accept-dns']),
			accept_routes: bool(prefs['accept-routes']),
			shields_up: bool(prefs['shields-up'])
		};

		const hostname = E('input', {
			'class': 'cbi-input-text',
			'type': 'text',
			'value': original.hostname,
			'autocomplete': 'off'
		});
		const acceptDns = E('input', { 'type': 'checkbox' });
		const acceptRoutes = E('input', { 'type': 'checkbox' });
		const shieldsUp = E('input', { 'type': 'checkbox' });

		/* HTML boolean attributes are true by presence, so checked="false" is
		 * still checked. Set the DOM property explicitly instead. */
		acceptDns.checked = original.accept_dns;
		acceptRoutes.checked = original.accept_routes;
		shieldsUp.checked = original.shields_up;

		setDisabled(hostname, flags.hostname !== true);
		setDisabled(acceptDns, flags.accept_dns !== true);
		setDisabled(acceptRoutes, flags.accept_routes !== true);
		setDisabled(shieldsUp, flags.shields_up !== true);

		const saveButton = E('button', {
			'class': 'btn cbi-button cbi-button-action important',
			'click': async () => {
				const current = {
					hostname: hostname.value,
					accept_dns: acceptDns.checked,
					accept_routes: acceptRoutes.checked,
					shields_up: shieldsUp.checked
				};

				const changed = {
					hostname: current.hostname !== original.hostname && flags.hostname === true,
					accept_dns: current.accept_dns !== original.accept_dns && flags.accept_dns === true,
					accept_routes: current.accept_routes !== original.accept_routes && flags.accept_routes === true,
					shields_up: current.shields_up !== original.shields_up && flags.shields_up === true
				};

				if (!changed.hostname && !changed.accept_dns && !changed.accept_routes && !changed.shields_up) {
					ui.addNotification(null, E('p', {}, [_('No changes to apply.')]), 'info');
					return;
				}

				saveButton.disabled = true;
				try {
					const result = await callPrefsSet(
						changed.hostname ? current.hostname : undefined,
						changed.accept_dns ? current.accept_dns : undefined,
						changed.accept_routes ? current.accept_routes : undefined,
						changed.shields_up ? current.shields_up : undefined
					);

					if (!result || result.ok !== true)
						throw new Error((result && result.error) || _('Tailscale rejected the requested change.'));

					const fresh = result.preferences || {};
					original.hostname = fresh['hostname'] == null ? current.hostname : String(fresh['hostname']);
					original.accept_dns = fresh['accept-dns'] == null ? current.accept_dns : bool(fresh['accept-dns']);
					original.accept_routes = fresh['accept-routes'] == null ? current.accept_routes : bool(fresh['accept-routes']);
					original.shields_up = fresh['shields-up'] == null ? current.shields_up : bool(fresh['shields-up']);

					hostname.value = original.hostname;
					acceptDns.checked = original.accept_dns;
					acceptRoutes.checked = original.accept_routes;
					shieldsUp.checked = original.shields_up;

					ui.addNotification(null, E('p', {}, [_('Tailscale preferences applied successfully.')]), 'info');
				}
				catch (e) {
					ui.addNotification(null, E('p', {}, [ _('Apply failed: '), String(e.message || e) ]), 'error');
				}
				finally {
					saveButton.disabled = false;
				}
			}
		}, _('Apply Changes'));

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, [ _('General') ]),
			E('div', { 'class': 'cbi-section-descr' }, [
				_('These controls write directly to the official Tailscale preference store using partial "tailscale set" updates. Unchanged settings are not sent.')
			]),
			E('div', { 'class': 'cbi-section' }, [
				fieldRow(_('Hostname'), hostname, _('Hostname advertised by this Tailscale node.')),
				fieldRow(_('Accept DNS'), acceptDns, _('Accept DNS configuration supplied by the tailnet.')),
				fieldRow(_('Accept Routes'), acceptRoutes, _('Accept routes advertised by other Tailscale nodes.')),
				fieldRow(_('Shields Up'), shieldsUp, _('Block incoming Tailscale connections to this node.')),
				E('div', { 'class': 'cbi-page-actions' }, [ saveButton ])
			])
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
