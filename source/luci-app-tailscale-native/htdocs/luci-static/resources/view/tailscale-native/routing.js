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

/* Undefined positional values are omitted by LuCI's RPC layer, preserving the
 * backend partial-write contract. */
const callPrefsSet = rpc.declare({
	object: 'luci.tailscale',
	method: 'prefs_set',
	params: [
		'advertise_routes',
		'advertise_exit_node',
		'snat_subnet_routes',
		'stateful_filtering',
		'netfilter_mode'
	]
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

function normalizeRoutes(value) {
	let raw = String(value == null ? '' : value).trim();
	if (!raw)
		return '';

	let parts = raw.split(/[\n,]+/).map(function(v) { return v.trim(); }).filter(Boolean);
	return parts.join(',');
}

function validateRoutes(value) {
	if (!value)
		return null;

	/* The backend shell-quotes every argv element and Tailscale remains the
	 * semantic CIDR authority. The UI additionally rejects whitespace/odd
	 * characters and default routes, which belong to Advertise Exit Node. */
	if (!/^[0-9A-Fa-f:.,/]+$/.test(value))
		return _('Routes must be comma-separated IPv4/IPv6 CIDRs without spaces.');

	let parts = value.split(',');
	for (let route of parts) {
		if (!route || route.indexOf('/') < 0)
			return _('Each advertised route must be a CIDR prefix.');
		if (route === '0.0.0.0/0' || route === '::/0')
			return _('Default routes are controlled by Advertise Exit Node, not Advertised Routes.');
	}
	return null;
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
			advertise_routes: normalizeRoutes(prefs['advertise-routes']),
			advertise_exit_node: bool(prefs['advertise-exit-node']),
			snat_subnet_routes: bool(prefs['snat-subnet-routes']),
			stateful_filtering: bool(prefs['stateful-filtering']),
			netfilter_mode: prefs['netfilter-mode'] == null ? 'on' : String(prefs['netfilter-mode']),
			exit_node: prefs['exit-node'] == null ? '' : String(prefs['exit-node'])
		};

		const routes = E('textarea', {
			'class': 'cbi-input-textarea',
			'rows': '4',
			'placeholder': '192.168.1.0/24\nfd00:1234::/64'
		}, [ original.advertise_routes.replace(/,/g, '\n') ]);
		const advertiseExitNode = E('input', { 'type': 'checkbox' });
		const snatSubnetRoutes = E('input', { 'type': 'checkbox' });
		const statefulFiltering = E('input', { 'type': 'checkbox' });
		const netfilterMode = E('select', { 'class': 'cbi-input-select' }, [
			E('option', { 'value': 'on' }, [ 'on' ]),
			E('option', { 'value': 'nodivert' }, [ 'nodivert' ]),
			E('option', { 'value': 'off' }, [ 'off' ])
		]);

		/* Set checkbox DOM properties explicitly; HTML boolean attributes are
		 * true by presence even when their textual value is "false". */
		advertiseExitNode.checked = original.advertise_exit_node;
		snatSubnetRoutes.checked = original.snat_subnet_routes;
		statefulFiltering.checked = original.stateful_filtering;
		netfilterMode.value = original.netfilter_mode;

		setDisabled(routes, flags.advertise_routes !== true);
		setDisabled(advertiseExitNode, flags.advertise_exit_node !== true || original.exit_node !== '');
		if (original.exit_node !== '')
			advertiseExitNode.title = _('This device is currently using another exit node. Set Use Exit Node to None first.');
		setDisabled(snatSubnetRoutes, flags.snat_subnet_routes !== true);
		setDisabled(statefulFiltering, flags.stateful_filtering !== true);
		setDisabled(netfilterMode, flags.netfilter_mode !== true);

		const saveButton = E('button', {
			'class': 'btn cbi-button cbi-button-action important',
			'click': async () => {
				const current = {
					advertise_routes: normalizeRoutes(routes.value),
					advertise_exit_node: advertiseExitNode.checked,
					snat_subnet_routes: snatSubnetRoutes.checked,
					stateful_filtering: statefulFiltering.checked,
					netfilter_mode: netfilterMode.value
				};

				const routeError = validateRoutes(current.advertise_routes);
				if (routeError) {
					ui.addNotification(null, E('p', {}, [ routeError ]), 'error');
					return;
				}

				if (current.advertise_exit_node === true && original.exit_node !== '') {
					ui.addNotification(null, E('p', {}, [
						_('This device is currently using another exit node. Set Use Exit Node to None before advertising this device as an exit node.')
					]), 'error');
					return;
				}

				const changed = {
					advertise_routes: current.advertise_routes !== original.advertise_routes && flags.advertise_routes === true,
					advertise_exit_node: current.advertise_exit_node !== original.advertise_exit_node && flags.advertise_exit_node === true,
					snat_subnet_routes: current.snat_subnet_routes !== original.snat_subnet_routes && flags.snat_subnet_routes === true,
					stateful_filtering: current.stateful_filtering !== original.stateful_filtering && flags.stateful_filtering === true,
					netfilter_mode: current.netfilter_mode !== original.netfilter_mode && flags.netfilter_mode === true
				};

				if (!changed.advertise_routes && !changed.advertise_exit_node && !changed.snat_subnet_routes && !changed.stateful_filtering && !changed.netfilter_mode) {
					ui.addNotification(null, E('p', {}, [ _('No changes to apply.') ]), 'info');
					return;
				}

				saveButton.disabled = true;
				try {
					const result = await callPrefsSet(
						changed.advertise_routes ? current.advertise_routes : undefined,
						changed.advertise_exit_node ? current.advertise_exit_node : undefined,
						changed.snat_subnet_routes ? current.snat_subnet_routes : undefined,
						changed.stateful_filtering ? current.stateful_filtering : undefined,
						changed.netfilter_mode ? current.netfilter_mode : undefined
					);

					if (!result || result.ok !== true)
						throw new Error((result && result.error) || _('Tailscale rejected the requested change.'));

					const fresh = result.preferences || {};
					original.advertise_routes = fresh['advertise-routes'] == null ? current.advertise_routes : normalizeRoutes(fresh['advertise-routes']);
					original.advertise_exit_node = fresh['advertise-exit-node'] == null ? current.advertise_exit_node : bool(fresh['advertise-exit-node']);
					original.snat_subnet_routes = fresh['snat-subnet-routes'] == null ? current.snat_subnet_routes : bool(fresh['snat-subnet-routes']);
					original.stateful_filtering = fresh['stateful-filtering'] == null ? current.stateful_filtering : bool(fresh['stateful-filtering']);
					original.netfilter_mode = fresh['netfilter-mode'] == null ? current.netfilter_mode : String(fresh['netfilter-mode']);

					routes.value = original.advertise_routes.replace(/,/g, '\n');
					advertiseExitNode.checked = original.advertise_exit_node;
					snatSubnetRoutes.checked = original.snat_subnet_routes;
					statefulFiltering.checked = original.stateful_filtering;
					netfilterMode.value = original.netfilter_mode;

					ui.addNotification(null, E('p', {}, [ _('Tailscale routing preferences applied successfully.') ]), 'info');
				}
				catch (e) {
					ui.addNotification(null, E('p', {}, [ _('Apply failed: '), String(e.message || e) ]), 'error');
				}
				finally {
					saveButton.disabled = false;
				}
			}
		}, _('Apply Changes'));

		const roleNotice = original.exit_node !== ''
			? E('div', { 'class': 'alert-message warning' }, [
				_('This device is currently using another exit node. Tailscale does not allow it to advertise itself as an exit node at the same time. Set Use Exit Node to None first.')
			])
			: '';

		return E('div', { 'class': 'cbi-map' }, [
			E('h2', {}, [ _('Routing') ]),
			E('div', { 'class': 'cbi-section-descr' }, [
				_('These controls modify the official Tailscale routing preferences with partial "tailscale set" updates. Default routes are controlled separately by Advertise Exit Node.')
			]),
			roleNotice,
			E('div', { 'class': 'cbi-section' }, [
				fieldRow(_('Advertised Routes'), routes, _('One IPv4 or IPv6 CIDR per line. Multiple prefixes are sent as a comma-separated list. Leave empty to advertise no subnet routes.')),
				fieldRow(_('Advertise Exit Node'), advertiseExitNode, _('Advertise this device as an exit node.')),
				fieldRow(_('SNAT Subnet Routes'), snatSubnetRoutes, _('Source-NAT traffic forwarded through advertised subnet routes.')),
				fieldRow(_('Stateful Filtering'), statefulFiltering, _('Apply stateful filtering to forwarded Tailscale traffic when supported by the installed Core.')),
				fieldRow(_('Netfilter Mode'), netfilterMode, _('Tailscale netfilter integration mode: on, nodivert, or off.')),
				E('div', { 'class': 'cbi-page-actions' }, [ saveButton ])
			])
		]);
	},

	handleSave: null,
	handleSaveApply: null,
	handleReset: null
});
