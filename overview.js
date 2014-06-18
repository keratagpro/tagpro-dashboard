var socket;

var model = {
	score: {
		red: ko.observable(0),
		blue: ko.observable(0)
	},
	players: ko.observableArray()
};

model.removePlayer = function(id) {
	model.players.remove(function(player) {
		return player.id == id;
	});
}.bind(model);

model.playersRed = ko.computed(function() {
	return ko.utils.arrayFilter(this.players(), function(player) {
		return player.team == 1;
	});
}, model);

model.playersBlue = ko.computed(function() {
	return ko.utils.arrayFilter(this.players(), function(player) {
		return player.team == 2;
	});
}, model);

var createSocket = function(url) {
	console.log("Creating socket to " + url + ".");

	if (socket) {
		socket.disconnect();
	}

	socket = io.connect(url + "?r=" + Math.round(Math.random() * 1e7), { reconnect: false });

	socket.on('score', function(score) {
		model.score.red(score.r);
		model.score.blue(score.b);
	});

	socket.on('p', function(p) {
		if (!$.isArray(p)) {
			return;
		}

		if (!p[0].name) {
			return;
		}

		p.forEach(function(player) {
			model.players.push({
				id: player.id,
				name: player.name,
				team: player.team
			});
		});
	});

	socket.on('playerLeft', function(id) {
		model.removePlayer(id);
	});

	return socket;
};

var requestSocketUrl = function() {
	if (!window.parent) {
		return;
	}

	window.parent.postMessage({ requestSocketUrl: true }, "*");

	return false;
};

var messageListener = function(e) {
	console.log(e);

	if (e.data.socketUrl) {
		createSocket(e.data.socketUrl);
		console.log("Opened socket.");
	}
};

window.addEventListener('message', messageListener, false);

$(function() {
	$('#refreshButton').on('click', requestSocketUrl);

	ko.applyBindings(model);
});