var model;
var pageUrl;

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

var Position = function(data) {
	this.left = ko.observable(data.left);
	this.top = ko.observable(data.top);
	this.width = ko.observable(data.width);
	this.height = ko.observable(data.height);

	this.getString = ko.computed(function() {
		parts = [this.left(), this.top(), this.width(), this.height()];
		return parts.join(',');
	}, this);
};

var Model = function(data) {
	var self = this;

	this.positionMain = ko.observable(new Position((data.posMain || '').split(',')));
	this.positionSecond = ko.observable(new Position((data.posSecond || '').split(',')));
	this.positionOverview = ko.observable(new Position((data.posOverview || '').split(',')));

	this.currentUrl = ko.computed(function() {
		var parts = [];
		parts.push('posMain=' + this.positionMain().getString());
		parts.push('posSecond=' + this.positionSecond().getString());
		parts.push('posOverview=' + this.positionOverview().getString());

		return parts.join('&');
	}, this);

	this.setSize = function(name, size) {
		attr = "position" + name.charAt(0).toUpperCase() + name.slice(1);
		var pos = this[attr]();
		pos.width(size.width);
		pos.height(size.height);
	}.bind(this);

	this.setPosition = function(name, position) {
		attr = "position" + name.charAt(0).toUpperCase() + name.slice(1);
		var pos = this[attr]();
		pos.left(position.left);
		pos.top(position.top);
	}.bind(this);

	this.resizeMode = ko.observable(data.resizeMode);

	this.resizeMode.subscribe(function(newValue) {
		if (newValue) {
			if ($('body').hasClass('custom-size')) {
				$('.resizable').resizable("enable");
				$('.draggable').draggable("enable");
			}
			else {
				$('.resizable').resizable({
					containment: 'document',
					handles: 'all',
					snap: true,
					stop: function(ev, ui) {
						self.setSize($(this).data('name'), ui.size);
						self.setPosition($(this).data('name'), ui.position);
					}
				});
				$('.draggable').draggable({
					snap: true,
					containment: 'window',
					stop: function(ev, ui) {
						self.setPosition($(this).data('name'), ui.position);
					}
				});
				$('body').addClass('custom-size');
			}
		}
		else {
			$('.resizable').resizable("disable");
			$('.draggable').draggable("disable");
		}
	});
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

$(function() {
	pageUrl = $.url();
	var group = pageUrl.param('group');
	var host = pageUrl.param('host');
	var port = pageUrl.param('port');
	var layout = pageUrl.param('layout');

	$('#layoutButton').on('click', saveLayout);

	model = new Model(pageUrl.data.param.query);
	ko.applyBindings(model);

	defaultLayout();

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

	$(document).keydown(function(e) {
		if (e.which == 17) {
			$('body').addClass('resize-mode');
		}
	}).keyup(function(e) {
		if (e.which == 17) {
			$('body').removeClass('resize-mode');
		}
	});

	$(window).blur(function(e) {
		$('body').removeClass('resize-mode');
		$(document).trigger('mouseup');
	});

	$('#host').val(host);
	$('#port').val(port);
	$('#group').val(group);
	$('#layout').val(layout);

	if (group) {
		$('iframe.game').attr('src', "http://" + host + "/groups/" + group);
	}
	else if (port) {
		$('iframe.game').attr('src', "http://" + host + ":" + port);
	}
});