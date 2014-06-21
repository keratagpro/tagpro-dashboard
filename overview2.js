var socket;
var game;

var tiles = {
	redball: { x: 14, y: 0 },
	blueball: { x: 15, y: 0},
	yellowflag: { x: 13, y: 1 },
	redflag: { x: 14, y: 1 },
	blueflag: { x: 15, y: 1 },
	grip: { x: 12, y: 4 },
	bomb: { x: 12, y: 5 },
	tagpro: { x: 12, y: 6 }
};

var powerupUpdate = {
	update: function(options) {
		if (options.data)
			options.parent.powerupGrabs(options.parent.powerupGrabs() + 1);

		return options.data;
	}
};

var playerMapping = {
	'grip': powerupUpdate,
	'bomb': powerupUpdate,
	'tagpro': powerupUpdate
};

var attributes = ["id", "name", "team", "flag", "grip", "speed", "tagpro", "bomb",
	"dead", "directSet", "s-tags", "s-pops", "s-grabs", "s-returns", "s-captures",
	"s-drops", "s-support", "s-hold", "s-prevent", "score", "points", "up", "down",
	"left", "right", "ms", "ac", "auth", "flair", "den", "degree", "rx", "ry",
	"lx", "ly", "a", "ra", "draw"];

var Player = function(data) {
	attributes.forEach(function(attr) {
		this[attr] = ko.observable();
	}.bind(this));

	this.powerupGrabs = ko.observable(0);

	ko.mapping.fromJS(data, playerMapping, this);

	this.getSprite = function(sprite) {
		var tile = tiles[sprite];
		var position = (-tile.x * 40) + "px " + (-tile.y * 40) + "px";
		return { backgroundPosition: position };
	};

	this.getFlair = function(flair) {
		var position = (-flair.x() * 16) + "px " + (-flair.y() * 16) + "px";
		return { backgroundPosition: position };
	};

	this.spriteFlag = ko.computed(function() {
		if (!this.flag)
			return null;

		var flag = this.flag();
		return this.getSprite(flag == 1 ? 'redflag' : flag == 2 ? 'blueflag' : 'yellowflag');
	}, this);

	this.spriteFlair = ko.computed(function() {
		if (!this.flair())
			return null;

		return this.getFlair(this.flair());
	}, this);

	this.spriteBall = ko.computed(function() {
		if (!this.team)
			return null;

		return this.getSprite(this.team() == 1 ? "redball" : "blueball");
	}, this);

	this.spriteGrip = ko.computed(function() { return this.getSprite('grip'); }, this);
	this.spriteBomb = ko.computed(function() { return this.getSprite('bomb'); }, this);
	this.spriteTagpro = ko.computed(function() { return this.getSprite('tagpro'); }, this);

	this.title = ko.computed(function() {
		return this.degree();
	}, this);
};

var Game = function() {
	this.score = ko.observable();
	this.players = ko.observableArray();

	this.removePlayer = function(id) {
		this.players.remove(function(player) {
			return player.id() == id;
		});
	}.bind(this);

	this.getSum = function(players, val) {
		var score = 0;

		ko.utils.arrayForEach(players, function(player) {
			score += ko.utils.unwrapObservable(player[val]);
		});

		return score;
	};

	this.getTimeFromSeconds = function(sec) {
		var hours = parseInt(sec / 3600, 10) % 24;
		var minutes = parseInt(sec / 60, 10) % 60;
		var seconds = sec % 60;

		var result = (minutes < 10 ? "0" + minutes : minutes) + ":" +
			(seconds  < 10 ? "0" + seconds : seconds);

		if (hours > 0)
			result = (hours < 10 ? "0" + hours : hours) + ":" + result;

		return result;
	};

	this.playersRed = ko.computed(function() {
		return ko.utils.arrayFilter(this.players(), function(player) {
			return player.team && player.team() == 1;
		});
	}, this);

	this.playersBlue = ko.computed(function() {
		return ko.utils.arrayFilter(this.players(), function(player) {
			return player.team && player.team() == 2;
		});
	}, this);

	this.scoreRed = ko.computed(function() {
		return this.getSum(this.playersRed(), "score");
	}, this);

	this.scoreBlue = ko.computed(function() {
		return this.getSum(this.playersBlue(), "score");
	}, this);

	this.holdRed = ko.computed(function() {
		var seconds = this.getSum(this.playersRed(), "s-hold");
		return this.getTimeFromSeconds(seconds);
	}, this);

	this.holdBlue = ko.computed(function() {
		var seconds = this.getSum(this.playersBlue(), "s-hold");
		return this.getTimeFromSeconds(seconds);
	}, this);

	this.powerupsRed = ko.computed(function() {
		return this.getSum(this.playersRed(), "powerupGrabs");
	}, this);

	this.powerupsBlue = ko.computed(function() {
		return this.getSum(this.playersBlue(), "powerupGrabs");
	}, this);
};

var createSocket = function(url) {
	console.log("Creating socket to " + url + ".");

	if (socket) {
		socket.disconnect();
	}

	socket = io.connect(url + "?r=" + Math.round(Math.random() * 1e7), { reconnect: false });

	socket.on('score', function(score) {
		ko.mapping.fromJS({ score: score }, { }, game);
	});

	socket.on('p', function(p) {
		if (!$.isArray(p)) {
			return;
		}

		if (!p[0].id)
			return;

		p.forEach(function(playerData) {
			var player = ko.utils.arrayFirst(game.players(), function(p1) {
				return p1.id() == playerData.id;
			});

			if (player) {
				ko.mapping.fromJS(playerData, playerMapping, player);
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

var requestSocketUrl = function() {
	if (!window.parent) {
		return;
	}

	window.parent.postMessage({ requestSocketUrl: true }, "*");

	return false;
};

$(function() {
	var url = $.url();
	var host = url.param('host') || "maptest.newcompte.fr:8000";

	game = new Game();
	ko.applyBindings(game);

	if (host) {
		createSocket("http://" + host);
	}
});