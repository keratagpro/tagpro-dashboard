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
	tagpro: { x: 12, y: 6 },
	speed: { x: 12, y: 7 }
};

var updateWithCount = function(name) {
	return {
		update: function(options) {
			if (options.data)
				options.parent[name](options.parent[name]() + 1);

			return options.data;
		}
	};
};

var powerupAttributes = ['grip', 'speed', 'bomb', 'tagpro'];

var playerMapping = {};
powerupAttributes.forEach(function(attr) {
	playerMapping[attr] = updateWithCount(attr);
});

var summableAttributes = ['s-tags', 's-pops', 's-grabs', 's-returns', 's-captures',
	's-drops', 's-support', 's-hold', 's-prevent', 'score', 'points', 'degree'];
var attributes = ['id', 'name', 'team', 'flag', 'dead', 'flair', 'auth', 'draw'];
//var ignoredAttributes = ['directSet', 'up', 'down',	'left', 'right', 'ms', 'ac', 'den', 'rx', 'ry', 'lx', 'ly', 'a', 'ra'];

var attributeLabels = {
	"powerupCount": { label: "Powerups" }
};

// Add labels for powerup attributes
powerupAttributes.forEach(function(pup) {
	attributeLabels[pup + "Count"] = {
		label: "Powerups: " + pup.charAt(0).toUpperCase() + pup.slice(1)
	};
});

// Add labels for summable attributes
summableAttributes.forEach(function(attr) {
	var val = attr;
	if (attr.indexOf('s-') === 0) {
		val = attr.slice(2);
	}

	attributeLabels[attr] = { label: val.charAt(0).toUpperCase() + val.slice(1) };

	if (val == 'hold' || val == 'prevent')
		attributeLabels[attr].time = true;
});

var attributeLabelsArray = [];
for (var id in attributeLabels) {
	var attr = attributeLabels[id];
	attr.id = id;
	attr.selected = false;
	attributeLabelsArray.push(attr);
}

var Player = function(data) {
	powerupAttributes.forEach(function(attr) {
		this[attr] = ko.observable();
		this[attr + "Count"] = ko.observable(0);
	}.bind(this));

	summableAttributes.forEach(function(attr) {
		this[attr] = ko.observable(0);
	}.bind(this));

	attributes.forEach(function(attr) {
		this[attr] = ko.observable();
	}.bind(this));

	this.powerupCount = ko.computed(function() {
		return this.gripCount() + this.bombCount() + this.tagproCount() + this.speedCount();
	}, this);

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

var updateUrl = function() {
	if (!history.replaceState) return;
	history.replaceState(null, null, game.currentUrl());
};

var Game = function() {
	this.score = ko.observable({ r: ko.observable(0), b: ko.observable(0) });
	this.players = ko.observableArray();
	this.host = ko.observable();

	this.removePlayer = function(id) {
		this.players.remove(function(player) {
			return player.id() == id;
		});
	}.bind(this);

	this.allStats = ko.mapping.fromJS(attributeLabelsArray);

	this.selectedStats = ko.computed(function() {
		return ko.utils.arrayFilter(this.allStats(), function(stat) {
			return stat.selected();
		});
	}, this);

	this.selectedStatIds = ko.computed({
		read: function() {
			return ko.utils.arrayMap(this.selectedStats(), function(stat) {
				return stat.id();
			});
		},
		write: function(ids) {
			ko.utils.arrayForEach(this.allStats(), function(stat) {
				stat.selected($.inArray(stat.id(), ids) !== -1);
			});
		},
		owner: this
	});

	this.selectedStatsString = ko.computed(function() {
		return this.selectedStatIds().join(',');
	}, this);

	this.currentUrl = function() {
		var parts = ["stats=" + this.selectedStatsString()];
		
		if (this.host())
			parts.push("host=" + this.host());

		return "?" + parts.join("&");
	}.bind(this);

	this.selectedStatsString.subscribe(updateUrl);

	this.getStatLabel = function(stat) {
		if (!attributeLabels[stat])
			return "";

		return attributeLabels[stat].label;
	}.bind(this);

	this.getStat = function(players, stat) {
		if (!stat)
			return 0;

		var sum = this.getSum(players, stat);

		if (stat.time && stat.time())
			return this.getTimeFromSeconds(sum);
		else
			return sum;
	}.bind(this);

	this.getStatRed = function(stat) {
		return this.getStat(this.playersRed(), stat);
	}.bind(this);

	this.getStatBlue = function(stat) {
		return this.getStat(this.playersBlue(), stat);
	}.bind(this);

	this.getSum = function(players, stat) {
		var score = 0;

		ko.utils.arrayForEach(players, function(player) {
			score += ko.utils.unwrapObservable(player[stat.id()]);
		});

		return score;
	};

	this.bookmarkletLink = ko.computed(function() {
		return "javascript:void(window.open('" + location.origin + location.pathname +
			"?host='+encodeURIComponent(location.host+location.search),'_blank','width=500,height=500,location=no,menubar=no,titlebar=no'));";
	});

	this.launchPopup = function() {
		window.open('?host=' + encodeURIComponent(this.host()), '_blank','width=500,height=500,location=no,menubar=no,titlebar=no');
		return true;
	}.bind(this);

	this.host = ko.observable();

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
	var host = url.param('host');
	var stats = url.param('stats') || 's-hold,score,powerupCount';

	game = new Game();
	game.host(host);

	if (stats)
		game.selectedStatIds(stats.split(','));

	ko.applyBindings(game);

	if (host) {
		if (host.indexOf("http") !== 0)
			host = "http://" + host;
		createSocket(host);
	}
	else {
		game.score().r(2);
		game.score().b(1);
		game.players.push(new Player({ id: 1, team: 1, name: "Some Ball 1", flag: 2, grip: true, tagpro: true, "s-hold": 100, score: 40, gripCount: 2 }));
		game.players.push(new Player({ id: 2, team: 2, name: "Some Ball 2", flag: 1, grip: true, bomb: true, "s-hold": 25, score: 20, tagproCount: 2 }));
		game.players.push(new Player({ id: 3, team: 1, name: "Some Ball 3", dead: true }));
		game.players.push(new Player({ id: 4, team: 2, name: "Some Ball 4" }));

		$('#startDialog').modal();
	}
});