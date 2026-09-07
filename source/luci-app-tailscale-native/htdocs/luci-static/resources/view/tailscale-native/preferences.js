'use strict';
'require rpc';
'require view';
const callPrefs = rpc.declare({ object: 'luci.tailscale', method: 'prefs_get' });
function displayValue(v) { if (v === true) return _('Enabled'); if (v === false) return _('Disabled'); if (v == null || v === '') return '-'; return String(v); }
return view.extend({
  load: function() { return callPrefs(); },
  render: function(data) {
    const prefs = data?.preferences || {}, keys = Object.keys(prefs).sort();
    const rows = keys.map((key) => E('tr', {'class':'tr'}, [E('td', {'class':'td left','width':'40%'}, [key]), E('td', {'class':'td left'}, [displayValue(prefs[key])])]));
    return E('div', {}, [E('h2', {}, [_('Advanced Preferences')]), E('div', {'class':'cbi-section-descr'}, [_('Read-only view of the complete official preference store from tailscale get --json all. Settings not exposed by the structured pages remain visible here without creating a second configuration authority.')]), E('div', {'class':'cbi-section'}, [E('table', {'class':'table'}, rows)])]);
  },
  handleSave: null, handleSaveApply: null, handleReset: null
});
