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
		attributeLabels: attributeLabels,
		attributeLabelsArray: attributeLabelsArray,
		playerMapping: playerMapping
	};
})();

ko.numericObservable = function(initialValue) {
    var _actual = ko.observable(initialValue);

    var result = ko.dependentObservable({
        read: function() {
            return _actual();
        },
        write: function(newValue) {
            var parsedValue = parseFloat(newValue);
            _actual(isNaN(parsedValue) ? newValue : parsedValue);
        }
    });

    return result;
};

var Position = function(data) {
	if (typeof data == 'string') {
		var parts = data.split(',');
		if (parts.length == 4) {
			data = {
				left: parts[0],
				top: parts[1],
				width: parts[2],
				height: parts[3]
			};
		}
	}

	this.left = ko.observable(data.left);
	this.top = ko.observable(data.top);
	this.width = ko.observable(data.width);
	this.height = ko.observable(data.height);

	this.isDefault = ko.computed(function() {
		return this.left() == data.left &&
			this.top() == data.top &&
			this.width() == data.width &&
			this.height() == data.height;
	}, this);

	this.getCSS = ko.computed(function() {
		return {
			left: this.left() + "%",
			top: this.top() + "%",
			width: this.width() + "%",
			height: this.height() + "%"
		};
	}, this);

	this.getString = ko.computed(function() {
		return parseFloat(this.left()).toFixed(2) + "," +
			parseFloat(this.top()).toFixed(2) + "," +
			parseFloat(this.width()).toFixed(2) + "," +
			parseFloat(this.height()).toFixed(2);
	}, this);
};

var Dashboard = function(data) {
	var self = this;

	this.game = new Game(data);

	this.host = ko.observable(data.host);

	this.positionMain = ko.observable(new Position((data.posMain || '0,0,66,100')));
	this.positionSecond = ko.observable(new Position((data.posSecond || '66,0,34,50')));
	this.positionOverview = ko.observable(new Position((data.posOverview || '66,50,34,50')));

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
		var width = $(document).width();
		var height = $(document).height();

		attr = "position" + name.charAt(0).toUpperCase() + name.slice(1);
		var pos = this[attr]();
		pos.width(size.width / width * 100);
		pos.height(size.height / height * 100);
	}.bind(this);

	this.setPosition = function(name, position) {
		var width = $(document).width();
		var height = $(document).height();

		attr = "position" + name.charAt(0).toUpperCase() + name.slice(1);
		var pos = this[attr]();
		pos.left(position.left / width * 100);
		pos.top(position.top / height * 100);
	}.bind(this);

	this.showBackground = ko.observable((data.background == "true") || data.background === undefined);

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
					containment: 'document',
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
	this.teamRed = ko.observable(data.teamRed);
	this.teamBlue = ko.observable(data.teamBlue);
	this.embed = ko.computed(function() {
		try {
			return window.self !== window.top;
		}
		catch(e) {
			return true;
		}
	}, this);

	this.scoreRed = ko.numericObservable(0);
	this.scoreBlue = ko.numericObservable(0);

	this.scoreRed(data.scoreRed);
	this.scoreBlue(data.scoreBlue);

	this.removePlayer = function(id) {
		this.players.remove(function(player) {
			return player.id() == id;
		});
	}.bind(this);

	this.getData = ko.computed(function() {
		return {
			showScore: this.showScore(),
			showPlayers: this.showPlayers(),
			stats: this.stats(),
			player: this.player(),
			host: this.host(),
			socketPort: this.socketPort(),
			teamRed: this.teamRed(),
			teamBlue: this.teamBlue(),
			scoreRed: this.scoreRed(),
			scoreBlue: this.scoreBlue(),
			embed: this.embed && this.embed()
		};
	}, this, { deferEvaluation: true });

	this.currentUrl = ko.computed(function() {
		var data = this.getData();
		var parts = [];

		for (var key in data) {
			var key2 = key;
			if (key == "showScore")
				key2 = "score";
			else if (key == "showPlayers")
				key2 = "players";

			parts.push(key2 + "=" + data[key]);
		}
		
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

	this.stats = ko.computed({
		read: function() {
			return ko.utils.arrayMap(this.selectedStats(), function(stat) {
				return stat.id();
			}).join(',');
		},
		write: function(val) {
			this.selectedStats.removeAll();

			var ids = (val || '').split(',');
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
	}).extend({ persist: 'stats' });

	if (!this.stats())
		this.stats(data.stats !== undefined ? data.stats : 's-hold,score,powerupCount');

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

	this.showAuth = ko.observable(false);
	this.showFlair = ko.observable(false);
	this.showDegree = ko.observable(false);

	this.player = ko.computed({
		read: function() {
			var parts = [];

			if (this.showAuth())
				parts.push("auth");

			if (this.showFlair())
				parts.push("flair");

			if (this.showDegree())
				parts.push("degree");

			return parts.join(",");
		},
		write: function(value) {
			var data = (value || '').split(',');
			this.showAuth($.inArray('auth', data) !== -1);
			this.showFlair($.inArray('flair', data) !== -1);
			this.showDegree($.inArray('degree', data) !== -1);
		},
		owner: this
	}).extend({ persist: 'player' });

	if (!this.player())
		this.player(data.player !== undefined ? data.player : 'auth,flair');

	this.showScore = ko.observable((data.score == "true") || data.score === undefined).extend({ persist: 'score' });
	this.showPlayers = ko.observable((data.players == "true") || data.players === undefined).extend({ persist: 'players' });

	this.showTeams = ko.computed(function() {
		return !!this.teamRed() || !!this.teamBlue();
	},this);

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