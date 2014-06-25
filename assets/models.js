var scoreboard = (function() {
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
					options.parent[name + "Count"](options.parent[name + "Count"]() + 1);

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
	//var ignoredAttributes = ['directSet', 'up', 'down', 'left', 'right', 'ms', 'ac', 'den', 'rx', 'ry', 'lx', 'ly', 'a', 'ra'];

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

	return {
		tiles: tiles,
		powerupAttributes: powerupAttributes,
		summableAttributes: summableAttributes,
		attributes: attributes,
		attributeLabelsArray: attributeLabelsArray
	};
})();

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

var Dashboard = function(data) {
	var self = this;

	this.game = new Game(data);

	this.host = ko.observable(data.host);

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

	this.bookmarkletLink = ko.computed(function() {
		return "javascript:void(window.open('" + document.location.origin + document.location.pathname +
			"?host='+encodeURIComponent(location.href)+'&socketPort='+tagpro.socketPort,'_self'));";
	});

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
					stack: '.screen',
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

var Player = function(data) {
	scoreboard.powerupAttributes.forEach(function(attr) {
		this[attr] = ko.observable();
		this[attr + "Count"] = ko.observable(0);
	}.bind(this));

	scoreboard.summableAttributes.forEach(function(attr) {
		this[attr] = ko.observable(0);
	}.bind(this));

	scoreboard.attributes.forEach(function(attr) {
		this[attr] = ko.observable();
	}.bind(this));

	this.powerupCount = ko.computed(function() {
		return this.gripCount() + this.bombCount() + this.tagproCount() + this.speedCount();
	}, this);

	ko.mapping.fromJS(data, scoreboard.playerMapping, this);

	this.getSprite = function(sprite) {
		var tile = scoreboard.tiles[sprite];
		var position = (-tile.x * 20) + "px " + (-tile.y * 20) + "px";
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

var Game = function(data) {
	this.score = ko.observable({ r: ko.observable(0), b: ko.observable(0) });
	this.players = ko.observableArray();
	this.host = ko.observable(data.host);
	this.socketPort = ko.observable(data.socketPort);
	this.endTime = ko.observable();
	this.teamNameRed = ko.observable(data.teamRed);
	this.teamNameBlue = ko.observable(data.teamBlue);
	this.embed = ko.observable(data.embed && data.embed == "true");

	this.removePlayer = function(id) {
		this.players.remove(function(player) {
			return player.id() == id;
		});
	}.bind(this);

	this.currentUrl = ko.computed(function() {
		var parts = ["stats=" + this.selectedStatsString()];

		var playerInfo = this.selectedPlayerInfoString();

		if (playerInfo)
			parts.push("player=" + playerInfo);
		
		if (this.host())
			parts.push("host=" + this.host());

		if (this.socketPort())
			parts.push("socketPort=" + this.socketPort());

		if (this.teamNameRed())
			parts.push("teamRed=" + this.teamNameRed());

		if (this.teamNameBlue())
			parts.push("teamBlue=" + this.teamNameBlue());

		return "?" + parts.join("&");
	}, this, { deferEvaluation: true });

	this.selectedStats = ko.observableArray();

	this.allStats = ko.mapping.fromJS(scoreboard.attributeLabelsArray, {
		create: function(options) {
			var parent = this;
			var stat = ko.mapping.fromJS(options.data);
			
			stat.selected = ko.computed({
				read: function() {
					return parent.selectedStats.indexOf(stat) !== -1;
				},
				write: function(value) {
					if (value)
						parent.selectedStats.push(stat);
					else
						parent.selectedStats.remove(stat);
				},
				owner: stat
			});

			return stat;
		}.bind(this)
	});

	this.selectedStatIds = ko.computed({
		read: function() {
			return ko.utils.arrayMap(this.selectedStats(), function(stat) {
				return stat.id();
			});
		},
		write: function(ids) {
			this.selectedStats.removeAll();

			ids.forEach(function(id) {
				var stat = ko.utils.arrayFirst(this.allStats(), function(stat) {
					return stat.id() == id;
				});

				if (!stat)
					return;
				
				this.selectedStats.push(stat);
			}.bind(this));
		},
		owner: this
	});

	var selectedStatIds = data.stats !== undefined ? data.stats : 's-hold,score,powerupCount';
	this.selectedStatIds(selectedStatIds.split(','));

	this.selectedStatsString = ko.computed(function() {
		return this.selectedStatIds().join(',');
	}, this);

	this.getStatLabel = function(stat) {
		if (!scoreboard.attributeLabels[stat])
			return "";

		return scoreboard.attributeLabels[stat].label;
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
			"?host='+encodeURIComponent(location.href)+'&socketPort='+tagpro.socketPort,'_blank','width=500,height=500,location=no,menubar=no,titlebar=no'));";
	});

	this.launchPopup = function() {
		window.open('?host=' + encodeURIComponent(this.host()), '_blank','width=500,height=500,location=no,menubar=no,titlebar=no');
		return true;
	}.bind(this);

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

	var playerInfo = (data.player !== undefined && data.player.split(',')) || ['auth', 'flair'];
	this.showScore = ko.observable((data.score == "true") || data.score === undefined);
	this.showPlayers = ko.observable((data.players == "true") || data.players === undefined);
	this.showAuth = ko.observable($.inArray('auth', playerInfo) !== -1);
	this.showFlair = ko.observable($.inArray('flair', playerInfo) !== -1);
	this.showDegree = ko.observable($.inArray('degree', playerInfo) !== -1);

	this.selectedPlayerInfoString = ko.computed(function() {
		var parts = [];

		if (this.showScore())
			parts.push("score");

		if (this.showAuth())
			parts.push("auth");

		if (this.showFlair())
			parts.push("flair");

		if (this.showDegree())
			parts.push("degree");

		return parts.join(",");
	}, this);

	this.currentUrl.subscribe(function() {
		if (!this.host()) return;
		if (!history.replaceState) return;
		history.replaceState(null, null, this.currentUrl());
	}.bind(this));

	this.reset = function() {
		this.players.removeAll();
		this.score().r(0);
		this.score().b(0);
	}.bind(this);
};