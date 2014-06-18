var messageListener = function(e) {
	if (e.data.requestSocketUrl) {
		var url = $.url($('iframe.game').attr('src'));
		e.source.postMessage({ socketUrl: url.attr('host') + ":" + (url.attr('port') || 8000) }, document.location.href);
	}
};

window.addEventListener('message', messageListener, false);

var gameUrl = function(opts) {
	var serverName;
	if (opts.serverName) {

	}
};

$(function() {
	var url = $.url();
	var group = url.param('group');
	var host = url.param('host');
	var port = url.param('port');

	$('#host').val(host);
	$('#port').val(port);
	$('#group').val(group);

	if (group) {
		$('iframe.game').attr('src', "http://" + host + "/groups/" + group);
	}
	else if (port) {
		$('iframe.game').attr('src', "http://" + host + ":" + port);
	}
});