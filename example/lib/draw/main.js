var SocketCommand = function(controller, action, parameters) {
	this.controller = controller;
	this.action = action;
	this.parameters = parameters || [];

	this.getParam = function(name, def) {
		if (typeof(this.parameters[name]) != 'undefined') {
			return this.parameters[name];
		} else {
			if (typeof(def) == 'undefined') {
				def = null;
			}

			return def;
		}
	}
}

var SocketClient = function(host, port) {
	this.host = host;
	this.port = port;
	this.socket = null;
	this.open = false;
	this.callbacks = {};

	this.init = function() {
		this.callbacks['onopen'] = [];
		this.callbacks['onclose'] = [];
		this.callbacks['onerror'] = [];
		this.callbacks['onmessage'] = [];

		this.socket = new WebSocket(this.host + ':' + this.port);

		var self = this;

		this.socket.onopen = function(event) {
			console.log('Open: "' + event + '"');
			self.onSocketOpen.apply(self, [event]);
		}

		this.socket.onclose = function(event) {
			console.log('Close: "' + event + '"');
			self.onSocketClose.apply(self, [event]);
		}

		this.socket.onerror = function(event) {
			console.log('Error: "' + event + '"');
			self.onSocketError.apply(self, [event]);
		}

		this.socket.onmessage = function(message) {
			console.log('Message: "' + message + '"');
			self.onSocketMessage.apply(self, [message]);
		}
	}

	this.addEventListener = function(type, callback) {
		this.callbacks[type].push(callback);
	}

	this.onSocketOpen = function(event) {
		this.open = true;

		for (var key in this.callbacks['onopen']) {
			if (this.callbacks['onopen'][key].apply(this.callbacks['onopen'][key], [this, event]) === false) {
				return;
			}
		}
	}

	this.onSocketClose = function(event) {
		this.open = false;

		for (var key in this.callbacks['onclose']) {
			if (this.callbacks['onclose'][key].apply(this.callbacks['onclose'][key], [this, event]) === false) {
				return;
			}
		}
	}

	this.onSocketError = function(event) {
		for (var key in this.callbacks['onerror']) {
			if (this.callbacks['onerror'][key].apply(this.callbacks['onerror'][key], [this, event]) === false) {
				return;
			}
		}
	}

	this.onSocketMessage = function(message) {
		for (var key in this.callbacks['onmessage']) {
			if (this.callbacks['onmessage'][key].apply(this.callbacks['onmessage'][key], [this, message]) === false) {
				return;
			}
		}
	}

	this.send = function(command) {
		if (!this.open) {
			throw 'Unable to send command, socket is not open';
		}

		var data = {
			controller: command.controller,
			action: command.action,
			parameters: command.parameters
		};

		var encoded = this.encode(data);

		this.socket.send(encoded);
	}

	this.encode = function(data) {
		return data;
	}

	this.init();
}

var User = function(id, color, name) {
	this.id = id;
	this.color = color;
	this.name = name || null;
}

var CollabDraw = function(host, port) {
	this.canvas = null;
	//this.layer = null;
	this.socket = null;
	this.id = null;
	this.name = 'Unnamed';
	this.users = {};

	this.init = function() {
		this.socket = new SocketClient(host, port);

		var self = this;

		this.socket.addEventListener('onopen', function(socket, event) {
			self.onSocketOpen.apply(self, [socket, event]);
		});

		this.socket.addEventListener('onclose', function(socket, event) {
			self.onSocketClose.apply(self, [socket, event]);
		});

		this.socket.addEventListener('onerror', function(socket, event) {
			self.onSocketError.apply(self, [socket, event]);
		});

		this.socket.addEventListener('onmessage', function(socket, message) {
			self.onSocketMessage.apply(self, [socket, message]);
		});

		this.socket.encode = function(data) {
			return $.JSON.encode(data);
		}
	}

	this.initCanvas = function() {
		this.canvas = new Canvas('canvas', 0, this.drawBackground);
		//this.layer = this.canvas.createLayer('animation', 60, this.drawFrame);

		this.canvas.fillColor('#FF0000');
		this.canvas.strokeColor('#FF0000');
		this.canvas.lineWidth(3);
		this.canvas.lineCap(CAP.ROUND);

		this.canvas.scene.app = this;
		this.canvas.scene.lineWidth = 3;
		this.canvas.scene.lastX = null;
		this.canvas.scene.lastY = null;

		this.canvas.onMouseScroll = function(delta, absolute) {
			this.scene.lineWidth += delta;

			if (this.scene.lineWidth < 1) {
				this.scene.lineWidth = 1;
			}

			this.lineWidth(this.scene.lineWidth);
		}

		this.canvas.onMouseMove = function(x, y) {
			if (this.mouse.left) {
				if (this.scene.lastX != null) {
					this.scene.app.strokeLine(this.scene.lastX, this.scene.lastY, x, y);

					//this.strokeLine(this.scene.lastX, this.scene.lastY, x, y);

					//this.fillCircle(x, y, 2, ALIGN.CENTER.MIDDLE);
				}

				this.scene.lastX = x;
				this.scene.lastY = y;
			} else {
				this.scene.lastX = null;
				this.scene.lastY = null;
			}
		}

		this.socket.send(new SocketCommand('server', 'request-restore'));
	}

	this.setName = function(name) {
		this.name = name;

		this.socket.send(new SocketCommand('server', 'set-name', {name: name}));
	}

	this.drawBackground = function() {
		this.clear();

		//this.fillText('Test', 20, 20);
	}

	this.drawFrame = function(frameDuration, totalDuration, frameNumber) {
		this.clear();

		this.fillText('FPS: ' + this.getFPS(), this.width - 20, 10, ALIGN.RIGHT.TOP);
	}

	this.onSocketOpen = function(socket, event) {
		$('#status').slideUp();
		$('#name-container').slideDown();

		this.socket.send(new SocketCommand('server', 'hello'));
	}

	this.onSocketClose = function(socket, event) {
		this.showError('Connection lost');
	}

	this.onSocketError = function(socket, event) {
		this.showError('Error occured');
	}

	this.onSocketMessage = function(socket, message) {
		var data = message.data.replace(/\0/, '').replace(/\255/, '');
		var request = $.parseJSON(data);

		if (typeof(request.action) == 'undefined') {
			throw 'Unable to handle message, no action given';
		}

		var actionName = request.action;

		do {
			var dashPos = actionName.indexOf('-');

			if (dashPos == -1) {
				break;
			}

			actionName = actionName.substr(0, dashPos) + actionName.substr(dashPos + 1, 1).toUpperCase() + actionName.substr(dashPos + 2);
		} while (true);

		actionName = actionName + 'Action';

		if (typeof(this[actionName]) != 'function') {
			throw 'Unsupported action "' + actionName + '" called';
		}

		var command = new SocketCommand(request.controller, request.action, request.parameters);

		this[actionName](command);
	}

	this.strokeLine = function(x1, y1, x2, y2) {
		this.socket.send(new SocketCommand('server', 'stroke-line', {
			x1: x1,
			y1: y1,
			x2: x2,
			y2: y2
		}))
	}

	this.welcomeAction = function(command) {
		this.id = command.getParam('id');
		this.color = command.getParam('color');

		var existingUsers = command.getParam('users');

		for (var key in existingUsers) {
			var userInfo = existingUsers[key];
			var user = new User(userInfo.id, userInfo.color, userInfo.name);

			this.users[user.id] = user;
			this.renderNewUser(user);
		}
	}

	this.nameChangedAction = function(command) {
		var userId = command.getParam('id');
		var name = command.getParam('name');

		this.users[userId].name = name;

		this.renderNameChange(userId, name);
	}

	this.userConnectingAction = function(command) {
		//var userId = command.getParam('id');
	}

	this.restoreAction = function(command) {
		var lines = command.getParam('lines');

		for (var key in lines) {
			var line = lines[key];

			this.renderStrokeLine(line.color, line.x1, line.y1, line.x2, line.y2);
		}
	}

	this.strokeLineAction = function(command) {
		var userId = command.getParam('id');
		var user = this.users[userId];

		this.renderStrokeLine(
			user.color,
			command.getParam('x1'),
			command.getParam('y1'),
			command.getParam('x2'),
			command.getParam('y2')
		)
	}

	this.userConnectedAction = function(command) {
		var userId = command.getParam('id');
		var color = command.getParam('color');
		var user = new User(userId, color);

		this.users[userId] = user;

		this.renderNewUser(user);
	}

	this.userDisconnectedAction = function(command) {
		var userId = command.getParam('id');
		var user = this.users[userId];

		this.renderUsedDisconnected(user);
	}

	this.showError = function(message) {
		$('#top-container').fadeOut();
		$('#name-container').hide();
		$('#status').html(message).show();;
		$('#login-form').fadeIn();
	}

	this.renderNewUser = function(user) {
		var name = user.name != null ? user.name : '<em>Connecting #' + user.id + '</em>';

		$('#users').append('<div class="user" id="user-' + user.id + '" style="display: none;"><div><span style="background-color: ' + user.color + ';"></span></div><span class="name">' + name + '</span></div>');
		$('#user-' + user.id).slideDown();
	}

	this.renderUsedDisconnected = function(user) {
		$('#user-' + user.id).slideUp();
	}

	this.renderNameChange = function(userId, name) {
		$('#user-' + userId + ' SPAN.name').html(name);
	}

	this.renderStrokeLine = function(color, x1, y1, x2, y2) {
		this.canvas.save();
		this.canvas.strokeColor(color);
		this.canvas.strokeLine(
			x1,
			y1,
			x2,
			y2
		);
		this.canvas.restore();
	}
}