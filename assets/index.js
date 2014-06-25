var dashboard;
var pageUrl;

var gameUrl = function(opts) {
	var serverName;
	if (opts.serverName) {

	}
};

var toRectString = function(elem) {
	var left = parseInt(elem.css('left'), 10);
	var top = parseInt(elem.css('top'), 10);
	var width = parseInt(elem.css('width'), 10);
	var height = parseInt(elem.css('height'), 10);

	return width + "x" + height + "+" + left + "+" + top;
};

var parseRectString = function(rectString) {
	var regex = /([^x]+)x([^\+]+)\+([^\+]+)\+(.*)/;
	var attrs = regex.exec(rectString);

	return {
		width: attrs[1] + "px",
		height: attrs[2] + "px",
		left: attrs[3] + "px",
		top: attrs[4] + "px"
	};
};

var saveLayout = function() {
	var main = toRectString($('.screen-main'));
	var second = toRectString($('.screen-second'));
	var overview = toRectString($('.screen-overview'));

	$('#layout').val([main, second, overview].join(','));
};

var loadLayout = function(val) {
	var frames = val.split(',');
	$('.screen-main').attr(parseRectString(frames[0]));
	$('.screen-second').attr(parseRectString(frames[1]));
	$('.screen-overview').attr(parseRectString(frames[2]));
};

var defaultLayout = function() {
	if (pageUrl.param('posMain'))
		return;

	$('.screen-main').css({
		top: 0,
		left: 0,
		width: $(window).width() * 0.66 + "px",
		height: $(window).height() + "px"
	});

	$('.screen-second').css({
		left: $(window).width() * 0.66 + "px",
		width: $(window).width() * 0.34 + "px",
		height: $(window).height() * 0.40 + "px"
	});

	$('.screen-overview').css({
		left: $(window).width() * 0.66 + "px",
		top: $(window).height() * 0.40 + "px",
		width: $(window).width() * 0.34 + "px",
		height: $(window).height() * 0.60 + "px"
	});
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

	dashboard.game.getData.subscribe(function(val) {
		$('#overviewFrame')[0].contentWindow.postMessage(val, document.location.href);
	});

	defaultLayout();

	handleResize();

	if (host) {
		var socketPort = pageUrl.param('socketPort');
		var overviewUrl = "overview2.html?embed=true&" + pageUrl.data.attr.query;

		if (!socketPort) {
			if (host.indexOf("koalabeast.com") !== -1)
				socketPort = 443;
			else if (host.indexOf("newcompte.fr") !== -1)
				socketPort = 81;
			else if (host.indexOf("justletme.be") !== -1)
				socketPort = 8081;
			else
				socketPort = 443;

			overviewUrl += "&socketPort=" + socketPort;
		}

		$('.screen-main iframe, .screen-second iframe').attr('src', host);
		$('.screen-overview iframe').attr('src', overviewUrl);
	}
	else {
		$('.screen-overview iframe').attr('src', 'overview2.html?embed=true' + (pageUrl.data.attr.query ? '&' + pageUrl.data.attr.query : ''));
		$('#startDialog').modal();
	}

	//$('#overviewFrame').postMessage({}, document.location.href);
});
