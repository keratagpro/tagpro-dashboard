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
	$('.screen').jqDrag('.drag-handle').jqResize('.resize-handle');//({ handle: '.drag-handle' });

	$('.screen-main').css({
		width: $(window).width() * 0.70 + "px",
		height: $(window).height() + "px"
	});

	$('.screen-second, .screen-overview').css({
		left: $(window).width() * 0.70 + "px",
		width: $(window).width() * 0.30 + "px",
		height: $(window).height() * 0.50 + "px"
	});

	$('.screen-overview').css({
		top: $(window).height() * 0.50 + "px"
	});

	$(document).keydown(function(e) {
		if (e.which == 17) {
			$('body').addClass('resize-mode');
		}
	}).keyup(function(e) {
		if (e.which == 17) {
			$('body').removeClass('resize-mode');
		}
	});

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