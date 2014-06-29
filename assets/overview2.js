var socket;
var game;

var createGroupSocket = function(url) {
	console.log("Creating socket to " + url + ".");

	if (socket) {
		socket.disconnect();
	}

	socket = io.connect(url + "?r=" + Math.round(Math.random() * 1e7), { reconnect: false });

	var playerId;
	var isSpectating = false;

	socket.on('you', function(id) {
		playerId = id;

		socket.emit('team', {
			id: id,
			team: 3
		});

		isSpectating = true;
	});

	socket.on('port', function(port) {
		if (!port)
			return;

		if (playerId) {
			var url = $.url(game.host()).data.attr;
			game.host(url.protocol + "://" + url.host + ":" + port);
			location.reload();
		}
	});
};

var createSocket = function(url, reconnect) {
	console.log("Creating socket to " + url + ".");

	if (socket) {
		socket.disconnect();
	}

	var socketUrl = url + (url.indexOf("?") === -1 ? "?" : "&") + "r=" + Math.round(Math.random() * 1e7);

	socketParams = { reconnect: false };
	if (reconnect)
		socketParams['force new connection'] = true;

	socket = io.connect(socketUrl, socketParams);

	socket.on('groupId', function(groupId) {
		if (!groupId) {
			if (url.indexOf("spectator=true") !== -1)
				return;

			console.log('Reconnecting to public game as a spectator.');
			game.reset();

			createSocket(url + (url.indexOf("?") === -1 ? "?" : "&") + "spectator=true", true);
		}
	});

	socket.on('score', function(score) {
		ko.mapping.fromJS({ score: score }, { }, game);
	});

	socket.on('time', function(time) {
		game.endTime(new Date(new Date().getTime + time.time));
	});

	socket.on('p', function(p) {
		if (!$.isArray(p))
			p = p.u;

		if (!$.isArray(p))
			return;

		if (!p[0].id)
			return;

		p.forEach(function(playerData) {
			var player = ko.utils.arrayFirst(game.players(), function(p1) {
				return p1.id() == playerData.id;
			});

			if (player) {
				ko.mapping.fromJS(playerData, scoreboard.playerMapping, player);
			}
			else {
				game.players.push(new Player(playerData));
			}
		});
	});

	socket.on('playerLeft', function(id) {
		game.removePlayer(id);
	});

	return socket;
};

var messageListener = function(event) {
	ko.mapping.fromJS(event.data, {}, game);
};

window.addEventListener('message', messageListener, false);

$(function() {
	var url = $.url();
	var host = url.param('host');

	if (host && host.indexOf("http") !== 0) {
		host = "http://" + host;
	}

	game = new Game(url.data.param.query);
	ko.applyBindings(game);

	if (host && host.indexOf("/groups/") !== -1) {
		var socketPort = url.param('socketPort');

		if (socketPort) {
			var attr = $.url(host).data.attr;
			host = attr.protocol + "://" + attr.host + ":" + socketPort + attr.relative;
		}

		createGroupSocket(host);
	}
	else if (host) {
		createSocket(host);
	}
	else {
		game.score().r(2);
		game.score().b(1);
		game.players.push(new Player({ id: 1, team: 1, name: "Some Ball 1", flag: 2, grip: true, tagpro: true, "s-hold": 100, score: 40, gripCount: 2 }));
		game.players.push(new Player({ id: 2, team: 2, name: "Some Ball 2", flag: 1, grip: true, bomb: true, "s-hold": 25, score: 20, tagproCount: 2 }));
		game.players.push(new Player({ id: 3, team: 1, name: "Some Ball 3", dead: true, degree: 70, flair: { x: 4, y: 5 } }));
		game.players.push(new Player({ id: 4, team: 2, name: "Some Ball 4", auth: true, flair: { x: 0, y: 5 }}));

		if (!game.embed()) {
			$('#startDialog').modal();
		}
	}
});