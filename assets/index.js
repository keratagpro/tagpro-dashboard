var dashboard;
var pageUrl;

var defaultLayout = function() {
	$('.screen-main').css(dashboard.positionMain().getCSS());
	$('.screen-second').css(dashboard.positionSecond().getCSS());
	$('.screen-overview').css(dashboard.positionOverview().getCSS());
};

var handleResize = function() {
	var oldWidth = $(window).width();
	var oldHeight = $(window).height();

	var resizeTimer;
	$(window).resize(function() {
		if ($(window).width() == oldWidth && $(window).height() == oldHeight)
			return;

		oldWidth = $(window).width();
		oldHeight = $(window).height();

		clearTimeout(resizeTimer);
		resizeTimer = setTimeout(defaultLayout, 100);
	});
};

$(function() {
	pageUrl = $.url();
	var host = pageUrl.param('host');

	if (host && host.indexOf("http") !== 0) {
		host = "http://" + host;
	}

	dashboard = new Dashboard(pageUrl.data.param.query);
	ko.applyBindings(dashboard);

	var updateOverview = function(val) {
		$('#overviewFrame')[0].contentWindow.postMessage(val, document.location.href);
	};

	defaultLayout();

	handleResize();

	if (host) {
		$('.screen-main iframe, .screen-second iframe').attr('src', host);
	}
	else {
		$('#startDialog').modal();
	}

	var overviewUrl = 'overview2.html';

	var socketPort = parseInt(pageUrl.param('socketPort'), 10);
	if (!socketPort && host) {
		if (host.indexOf("koalabeast.com") !== -1)
			socketPort = 443;
		else if (host.indexOf("newcompte.fr") !== -1)
			socketPort = 81;
		else if (host.indexOf("justletme.be") !== -1)
			socketPort = 8081;
		else
			socketPort = 443;

		overviewUrl += "?socketPort=" + socketPort;
	}

	if (pageUrl.data.attr.query) {
		var separator = overviewUrl.indexOf('?') !== -1 ? '&' : '?';
		overviewUrl += separator + pageUrl.data.attr.query;
	}
	
	$('.screen-overview iframe').attr('src', overviewUrl).on('load', function() {
		dashboard.game.getData.subscribe(updateOverview);
		updateOverview(dashboard.game.getData());
	});

	//$('#overviewFrame').postMessage({}, document.location.href);
});
