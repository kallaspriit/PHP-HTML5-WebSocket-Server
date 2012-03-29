/*
 * Copyright (c) 2010 Priit Kallas <kallaspriit@gmail.com>
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 */

/**
 * The canvas library class.
 *
 * HTML canvas library is a full-featured lightweight wrapper library of the
 * native html canvas element written in Javascript, aimed to make visualization
 * and animation using canvas simpler. Features animation support, layers, event
 * capture, multitouch and many examples.
 *
 * This is the main constructor.
 *
 * The parameters layerParent and drawOnly are used by layers, you dont have to
 * define these yourself.
 *
 * The fps parameter can have three kind of values
 * > 0: static image, the render function is called only once
 * > -1: animation without framerate limit, runs as fast as possible
 * > positive: for example 60, use to try to maintain given framerate
 *
 * @constructor
 * @param {string|object} canvas Canvas element id or the actual dom-element
 * @param {integer} [fps=0] Requested frames-per-second, use for animations, optional, defaults to 0
 * @param {function} [renderCallback=null] The function to call to render each frame, gets the canvas as "this", optional, can set later with setRenderCallback()
 * @param {boolean} [autostart=true] Should the rendering be started at once or manually later by calling start(), optional, defaults to true
 * @param {Canvas} [layerParent=null] The parent canvas element of given layer, used by layers system, no need to define
 * @param {boolean} [drawOnly=false] Is this a render-to-canvas operation canvas, does not intercept any events, no need to define
 * @version 1.1
 */
var Canvas = function(canvas, fps, renderCallback, autostart, layerParent, drawOnly) {

	/**
	 * Library version
	 *
	 * @type string
	 * @since 1.0
	 */
	this.version = '1.1';

	/**
	 * Render callback function that is called to render every frame
	 *
	 * @type function
	 * @private
	 * @since 1.0
	 */
	this.renderCallback = null;

	/**
	 * The context to use, may include 3D in the future versions
	 *
	 * @type string
	 * @private
	 * @since 1.0
	 */
    this.canvasContext = '2d';

	/**
	 * Should the rendering be started right away or manually
	 *
	 * @type boolean
	 * @private
	 * @since 1.0
	 */
	this.autostart = autostart == null ? true : autostart;

	/**
	 * Is the automatic resizing of canvas active when the window is resized.
	 * Defaults to false. This can be useful for full-width/fullscreen usage.
	 *
	 * Use setAutoResize() to change this.
	 *
	 * @type boolean
	 * @private
	 * @since 1.0
	 */
	this.autoResize = false;

	/**
	 * Parent canvas object, used for layers
	 *
	 * @type Canvas
	 * @private
	 * @since 1.0
	 */
	this.layerParent = layerParent;

	/**
	 * Is this a draw-only canvas, used for renderToCanvas, does not intercept events
	 *
	 * @type boolean
	 * @private
	 * @since 1.0
	 */
	this.drawOnly = drawOnly != null ? drawOnly : false;

	/**
	 * The canvas dom-element
	 *
	 * @private
	 * @since 1.0
	 */
    this.canvasElement = null;

	/**
	 * The underlaying canvas context
	 *
	 * @type Canvas2dContext
	 * @private
	 * @since 1.0
	 */
    this.c = null;

	/**
	 * The target framerate
	 *
	 * Possible values:
	 * > 0: static image, the render function is called only once
	 * > -1: animation without framerate limit, runs as fast as possible
	 * > positive: for example 60, use to try to maintain given framerate
	 *
	 * @type integer
	 * @private
	 * @since 1.0
	 */
    this.targetFPS = fps != null ? fps : 0;

	/**
	 * Target duration of a single frame in seconds
	 *
	 * @type float
	 * @private
	 * @since 1.0
	 */
    this.targetFrameDuration = this.targetFPS > 0 ? 1000.0 / this.targetFPS : 0;

	/**
	 * Current frames-per-second
	 *
	 * @type float
	 * @private
	 * @since 1.0
	 */
	this.fps = 0;

	/**
	 * Framerate probe time since last reset
	 *
	 * @type float
	 * @private
	 * @since 1.0
	 */
    this.fpsTime = 0;

	/**
	 * The number of frames counted during last probe
	 *
	 * @type integer
	 * @private
	 * @since 1.0
	 */
    this.fpsCounter = 0;

	/**
	 * The dynamic sleep time.
	 *
	 * This is modified in realtime to achieve wanted framerate.
	 *
	 * @type float
	 * @private
	 * @since 1.0
	 */
    this.fpsDynamicWait = 0;

	/**
	 * The width of the canvas, a public attribute.
	 *
	 * This can be used in calculations to position elements on the canvas.
	 *
	 * @type integer
	 * @since 1.0
	 */
    this.width = 0;

	/**
	 * The height of the canvas, a public attribute.
	 *
	 * This can be used in calculations to position elements on the canvas.
	 *
	 * @type integer
	 * @since 1.0
	 */
    this.height = 0;

	/**
	 * The x-position of the layer.
	 *
	 * Only used when the canvas element was created as a layer.
	 *
	 * @type float
	 * @private
	 * @since 1.0
	 */
	this.layerX = null;

	/**
	 * The y-position of the layer.
	 *
	 * Only used when the canvas element was created as a layer.
	 *
	 * @type float
	 * @private
	 * @since 1.0
	 */
	this.layerY = null;

	/**
	 * The width of the layer.
	 *
	 * Only used when the canvas element was created as a layer.
	 *
	 * @type float
	 * @private
	 * @since 1.0
	 */
	this.layerWidth = null;

	/**
	 * The height of the layer.
	 *
	 * Only used when the canvas element was created as a layer.
	 *
	 * @type float
	 * @private
	 * @since 1.0
	 */
	this.layerHeight = null;

	/**
	 * The dom element generated to contain the layer.
	 *
	 * Only used when the canvas element was created as a layer.
	 *
	 * @type object
	 * @private
	 * @since 1.0
	 */
	this.layerContainer = null;

	/**
	 * Is the animation looping.
	 *
	 * Setting this to false will stop the animation.
	 *
	 * @type boolean
	 * @private
	 * @since 1.0
	 */
    this.looping = false;

	/**
	 * Should touch events emulate mouse events.
	 *
	 * For example, the touchmove will be converted to mousemove events that
	 * touch-devices normally do not generate.
	 *
	 * @type boolean
	 * @private
	 * @since 1.0
	 */
	this.touchEmulatesMouse = false;

	/**
	 * Is this the first frame of the animation, a public attribute.
	 *
	 * This can be used in your render callback to do some setting up of the
	 * scene that should only happen once.
	 *
	 * @type boolean
	 * @since 1.0
	 */
	this.firstFrame = true;

	/**
	 * Map of layers.
	 *
	 * The map key is the name of the layer.
	 *
	 * @type object[Canvas]
	 * @private
	 * @since 1.0
	 */
    this.layers = {};

	/**
	 * An object keeping the previous states of touch events.
	 *
	 * Used to pass the previous state of a touch to touch move and end events.
	 *
	 * @type object
	 * @private
	 * @since 1.0
	 */
	this.previousTouchInfo = {};

	/**
	 * Last used layer z-index.
	 *
	 * If no z-index is defined when creating a new layer, this is used to set
	 * the index to current largest plus one.
	 *
	 * @type integer
	 * @private
	 * @since 1.0
	 */
    this.lastLayerZIndex = 0;

	/**
	 * The start time of the animation rendering
	 *
	 * @type long
	 * @since 1.0
	 */
    this.startTime = 0;

	/**
	 * Total rendering duration
	 *
	 * @type long
	 * @since 1.0
	 */
    this.totalDuration = 0;

	/**
	 * Last total rendering duration
	 *
	 * @type long
	 * @private
	 * @since 1.0
	 */
    this.lastTotalDuration = 0;

	/**
	 * Last frame duration
	 *
	 * @type long
	 * @since 1.0
	 */
    this.lastFrameDuration = 0;

	/**
	 * Number of frames rendered
	 *
	 * @type integer
	 * @since 1.0
	 */
    this.frameCount = 0;

	/**
	 * The scene object.
	 *
	 * This can be used as a namespace for scene variables and methods, includes "canvas" key
	 * that points to the canvas that created it for drawing.
	 *
	 * @type object
	 * @since 1.0
	 */
	this.scene = {
		canvas : this
	};

	/**
	 * The keyboard events storage object, use to get keyboard state.
	 *
	 * This stores the keys that are currently pressed, including the modifier
	 * keys ctrl, shift and alt. Use the kb.isDown(keyCode) method to check
	 * whether given key is currently pressed. To get individual keyboard events,
	 * register for the onKeyDown, onKeyUp and onKeyPress events. The keycodes
	 * can be compared to KC.SOMEKEY constants.
	 *
	 * Has keys:
	 * > down: array of keycodes of buttons that are pressed
	 * > ctrl: is the CTRL button pressed
	 * > shift: is the SHIFT button pressed
	 * > alt: is the ALT button pressed
	 *
	 * And the method:
	 * > isDown: return whether a button by given keycode is currently pressed
	 *
	 * @type object
	 * @since 1.0
	 */
    this.kb = {
        down : [],
        ctrl : false,
        shift : false,
        alt : false,
        isDown : function(keyCode) {
            for (var i = 0; i < this.down.length; i++) {
                if (this.down[i]['code'] == keyCode) {
                    return true;
                }
            }

            return false;
        }
    }

	/**
	 * The mouse events storage object, use to get mouse state.
	 *
	 * Stores the pressed mouse buttons, mouse coordinates and scroll offset.
	 *
	 * Includes keys:
	 * > left: is the left button pressed
	 * > right: is the right button pressed
	 * > middle: is the middle button pressed
	 * > x: the x-coordinate of the mouse, relative to canvas location
	 * > y: the y-coordinate of the mouse, relative to canvas location
	 * > scroll: the scroll offset as changed by mouse wheel
	 *
	 * @type object
	 * @since 1.0
	 */
    this.mouse = {
        left : false,
        right : false,
        middle : false,
        x : 0,
        y : 0,
		scroll : 0
    }

	/**
	 * Initializes the instance, this is called automatically.
	 *
	 * This method:
	 * > initializes the canvas context
	 * > registers and handles all events
	 * > applies default styles
	 * > starts the animation is autostart is true
	 *
	 * @type string
	 * @private
	 * @since 1.0
	 */
    this.init = function() {
		if (renderCallback != null) {
			this.setRenderCallback(renderCallback);
		}

		if (typeof(canvas) == 'object') {
			this.canvasElement = canvas;
		} else if (typeof(canvas) == 'string') {
			this.canvasElement = document.getElementById(canvas);
		} else {
			this.handleError('Invalid canvas reference given, expected canvas element or id');

			return;
		}

        if (this.canvasElement == null) {
            this.handleError('Canvas element could not be found');

            return;
        }

        this.c = this.canvasElement.getContext(this.canvasContext);

        if (this.c == null) {
            this.handleError('Given canvas element does not seem to be of canvas type, context not found');

            return;
        }

		if (typeof(canvas) == 'object') {
			this.width = canvas.width;
			this.height = canvas.height;
		} else {
			this.width = this.getWidth();
			this.height = this.getHeight();

			this.canvasElement.width = this.width;
			this.canvasElement.height = this.height;
		}

        var self = this;

		if (this.drawOnly != true) {
			// handle window resize only for root layer
			if (this.layerParent == null) {
				window.onresize = function() {
					self.handleWindowResize();
				}

				document.onkeydown = function(event) {
					if (event == null) {
						event = window.event;
					}

					var keyCode = event.keyCode;
					var character = event.which == null ? String.fromCharCode(event.keyCode) : String.fromCharCode(event.which);
					var isCtrlPressed = event.ctrlKey ? true : false;
					var isShiftPressed = event.shiftKey ? true : false;
					var isAltPressed = event.altKey ? true : false;

					if (!self.kb.isDown(keyCode)) {
						self.kb['down'].push({'code' : keyCode, 'character' : character});
					}

					self.kb['ctrl'] = isCtrlPressed;
					self.kb['shift'] = isShiftPressed;
					self.kb['alt'] = isAltPressed;

					for (var layerName in self.layers) {
						self.layers[layerName].kb = self.kb;
						self.layers[layerName].onKeyDown(keyCode, character, isCtrlPressed, isShiftPressed, isAltPressed);
					}

					return self.onKeyDown(keyCode, character, isCtrlPressed, isShiftPressed, isAltPressed);
				};

				document.onkeyup = function(event) {
					if (event == null) {
						event = window.event;
					}

					var keyCode = event.keyCode;
					var character = event.which == null ? String.fromCharCode(event.keyCode) : String.fromCharCode(event.which);
					var isCtrlPressed = event.ctrlKey ? true : false;
					var isShiftPressed = event.shiftKey ? true : false;
					var isAltPressed = event.altKey ? true : false;

					var newKbDown = [];

					for (var i = 0; i < self.kb['down'].length; i++) {
						if (self.kb['down'][i]['code'] != keyCode) {
							newKbDown.push({'code' : self.kb['down'][i]['code'], 'character' : self.kb['down'][i]['character']});
						}
					}

					self.kb['down'] = newKbDown;
					self.kb['ctrl'] = isCtrlPressed;
					self.kb['shift'] = isShiftPressed;
					self.kb['alt'] = isAltPressed;

					for (var layerName in self.layers) {
						self.layers[layerName].kb = self.kb;
						self.layers[layerName].onKeyUp(keyCode, character, isCtrlPressed, isShiftPressed, isAltPressed);
					}

					return self.onKeyUp(keyCode, character, isCtrlPressed, isShiftPressed, isAltPressed);
				}

				document.onkeypress = function(event) {
					if (event == null) {
						event = window.event;
					}

					var keyCode = event.charCode;
					var character = event.which == null ? String.fromCharCode(event.keyCode) : String.fromCharCode(event.which);
					var isCtrlPressed = event.ctrlKey ? true : false;
					var isShiftPressed = event.shiftKey ? true : false;
					var isAltPressed = event.altKey ? true : false;

					for (var layerName in self.layers) {
						self.layers[layerName].kb = self.kb;
						self.layers[layerName].onKeyPress(keyCode, character, isCtrlPressed, isShiftPressed, isAltPressed);
					}

					return self.onKeyPress(keyCode, character, isCtrlPressed, isShiftPressed, isAltPressed);
				}
			}

			this.canvasElement.addEventListener('touchstart', function(event) {
				var touchCount = event.changedTouches.length;
				var touches = [];
				var touch = null;

				for (var i = 0; i < touchCount; i++) {
					touch = event.changedTouches[i];

					var touchInfo = {
						pageX : touch.pageX,
						pageY : touch.pageY,
						clientX : touch.clientX,
						clientY : touch.clientY,
						screenX : touch.screenX,
						screenY : touch.screenY,
						target : touch.target,
						identifier : touch.identifier
					}

					self.onTouchStart(touchInfo, i, touchCount, event);

					touches.push(touchInfo);

					self.previousTouchInfo[touch.identifier] = touchInfo;
				}

				if (touchCount == 1) {
					touch = event.changedTouches[0];

					var x = touch.clientX;
					var y = touch.clientY;

					if (self.touchEmulatesMouse) {
						self.mouse.x = x;
						self.mouse.y = y;
						self.mouse.left = true;

						if (self.layerParent != null) {
							self.layerParent.onMouseDown(x, y, 0);
						}

						self.onMouseDown(x, y, 0);
					}
				} else {
					self.onMultiTouchStart(touches, event);
				}
			}, false);
			
			this.canvasElement.addEventListener('touchmove', function(event) {
				var touchCount = event.changedTouches.length;
				var touches = [];
				var touch = null;

				for (var i = 0; i < touchCount; i++) {
					touch = event.changedTouches[i];

					var touchInfo = {
						pageX : touch.pageX,
						pageY : touch.pageY,
						clientX : touch.clientX,
						clientY : touch.clientY,
						screenX : touch.screenX,
						screenY : touch.screenY,
						target : touch.target,
						identifier : touch.identifier
					}

					self.onTouchMove(touchInfo, i, touchCount, (typeof(self.previousTouchInfo[touch.identifier]) != 'undefined' ? self.previousTouchInfo[touch.identifier] : null), event);

					touches.push(touchInfo);
				}

				if (touchCount == 1) {
					touch = event.changedTouches[0];

					var x = touch.clientX;
					var y = touch.clientY;

					if (self.touchEmulatesMouse) {
						self.mouse.x = x;
						self.mouse.y = y;
						self.mouse.left = true;

						if (self.layerParent != null) {
							self.layerParent.onMouseMove(x, y);
						}

						self.onMouseMove(x, y);
					}
				} else {
					self.onMultiTouchMove(touches, self.previousTouchInfo, event);
				}

				for (var j = 0; j < touches.length; j++) {
					self.previousTouchInfo[touches[j].identifier] = touches[j];
				}
			}, false);

			this.canvasElement.addEventListener('touchend', function(event) {
				var touchCount = event.changedTouches.length;
				var touches = [];
				var touch = null;

				for (var i = 0; i < touchCount; i++) {
					touch = event.changedTouches[i];

					var touchInfo = {
						pageX : touch.pageX,
						pageY : touch.pageY,
						clientX : touch.clientX,
						clientY : touch.clientY,
						screenX : touch.screenX,
						screenY : touch.screenY,
						target : touch.target,
						identifier : touch.identifier
					}

					self.onTouchEnd(touchInfo, i, touchCount, event);

					touches.push(touchInfo);

					self.previousTouchInfo[touch.identifier] = null;
				}

				if (touchCount == 1) {
					touch = event.changedTouches[0];

					var x = touch.clientX;
					var y = touch.clientY;

					if (self.touchEmulatesMouse) {
						self.mouse.x = x;
						self.mouse.y = y;
						self.mouse.left = false;

						if (self.layerParent != null) {
							self.layerParent.onMouseUp(x, y, 0);
						}

						self.onMouseUp(x, y, 0);
					}
				} else {
					self.onMultiTouchEnd(touches, event);
				}
			}, false);

			this.canvasElement.addEventListener('mousedown', function(event) {
				var x = null;
				var y = null;

				if (typeof (event.layerX) != 'undefined') {
					x = event.layerX;
					y = event.layerY;
				} else if (typeof (event.offsetX) != 'undefined') {
					x = event.offsetX;
					y = event.offsetY;
				}

				var button = typeof(event.which) != 'undefined' ? event.which : event.button;

				if (button == 1) {
					self.mouse['left'] = true;
				} else if (button == 3) {
					self.mouse['right'] = true;
				} else if (button == 2) {
					self.mouse['middle'] = true;
				}

				self.mouse.x = x;
				self.mouse.y = y;

				for (var layerName in self.layers) {
					self.layers[layerName].mouse = self.mouse;
					self.layers[layerName].onMouseDown(x, y, button);
				}

				if (self.layerParent != null) {
					self.layerParent.mouse = self.mouse;
					self.layerParent.onMouseDown(x, y, button);

					for (layerName in self.layerParent.layers) {
						var layer = self.layerParent.layers[layerName];

						if (layer != this) {
							layer.mouse = self.mouse;
							layer.onMouseDown(x, y, button);
						}
					}
				}

				self.onMouseDown(x, y, button);

				return true;
			}, false);

			this.canvasElement.addEventListener('mouseup', function(event) {
				var x = null;
				var y = null;

				if (typeof (event.layerX) != 'undefined') {
					x = event.layerX;
					y = event.layerY;
				} else if (typeof (event.offsetX) != 'undefined') {
					x = event.offsetX;
					y = event.offsetY;
				}

				var button = typeof(event.which) != 'undefined' ? event.which : event.button;

				if (button == 1) {
					self.mouse['left'] = false;
				} else if (button == 3) {
					self.mouse['right'] = false;
				} else if (button == 2) {
					self.mouse['middle'] = false;
				}

				self.mouse.x = x;
				self.mouse.y = y;

				for (var layerName in self.layers) {
					self.layers[layerName].mouse = self.mouse;
					self.layers[layerName].onMouseUp(x, y, button);
				}

				if (self.layerParent != null) {
					self.layerParent.mouse = self.mouse;
					self.layerParent.onMouseUp(x, y, button);

					for (layerName in self.layerParent.layers) {
						var layer = self.layerParent.layers[layerName];

						if (layer != this) {
							layer.mouse = self.mouse;
							layer.onMouseUp(x, y, button);
						}
					}
				}

				self.onMouseUp(x, y, button);

				return true;
			}, false);

			this.canvasElement.addEventListener('mousemove', function(event) {
				var x = null;
				var y = null;

				if (typeof (event.layerX) != 'undefined') {
					x = event.layerX;
					y = event.layerY;
				} else if (typeof (event.offsetX) != 'undefined') {
					x = event.offsetX;
					y = event.offsetY;
				}

				self.mouse.x = x;
				self.mouse.y = y;

				for (var layerName in self.layers) {
					self.layers[layerName].mouse = self.mouse;
					self.layers[layerName].onMouseMove(x, y);
				}

				if (self.layerParent != null) {
					self.layerParent.mouse = self.mouse;
					self.layerParent.onMouseMove(x, y);

					for (layerName in self.layerParent.layers) {
						var layer = self.layerParent.layers[layerName];

						if (layer != this) {
							layer.mouse = self.mouse;
							layer.onMouseMove(x, y);
						}
					}
				}

				self.onMouseMove(x, y);

				return true;
			}, false);

			this.canvasElement.oncontextmenu = function(event) {
				if (!event) { // For IE
					event = window.event;
				}

				if (self.onContextMenu(event) === false) {
					return false;
				}

				return true;
			}

			var onMouseWheelChange = function(event) {
				var delta = 0;

				if (!event) { // For IE
					event = window.event;
				}

				if (event.wheelDelta) { // IE/Opera
					delta = event.wheelDelta / 120;
					// In Opera 9, delta differs in sign as compared to IE
					if (window.opera) {
						delta = -delta;
					}
				} else if (event.detail) { // Mozilla
					// In Mozilla, sign of delta is different than in IE. Also, delta is multiple of 3.
					delta = -event.detail / 3;
				}

				// positive delta is scrolled up, negative down
				if (delta != 0) {
					self.mouse.scroll += delta;
					self.onMouseScroll(delta, self.mouse.scroll);
				}

				// Prevent default actions caused by mouse wheel.
				if (event.preventDefault) {
					event.preventDefault();
				}

				event.returnValue = false;
			};

			this.canvasElement.addEventListener('DOMMouseScroll', onMouseWheelChange, false);
			this.canvasElement.onmousewheel = onMouseWheelChange;
		}

        this.applyDefaultStyles();

		if (this.autostart) {
			if (this.targetFPS != 0) {
				this.start();
			} else {
				this.renderSingleFrame();
			}
		}
    }

	/**
	 * Returns library version
	 *
	 * @type string
	 * @since 1.0
	 */
	this.getVersion = function() {
		return this.version;
	}

	/**
	 * Sets/changes the render callback.
	 *
	 * Render callback is the function that is repeatedly called to render
	 * each frame.
	 *
	 * @param {function} callback The renderer callback function
	 * @returns {Canvas} Self
	 * @since 1.0
	 */
	this.setRenderCallback = function(callback) {
		if (typeof(callback) == 'function') {
			this.renderCallback = callback;
		} else {
			this.handleError('Invalid render callback given, expected a function');
		}

		return this;
	}

	/**
	 * Sets whether touch events emulate mouse events.
	 *
	 * For example, touchmove events are translated to mousemove events.
	 *
	 * @param {boolean} doesTouchEmulateMouse Should touch events be translated to mouse events
	 * @returns {Canvas} Self
	 * @since 1.0
	 */
	this.setTouchEmulatesMouse = function(doesTouchEmulateMouse) {
		this.touchEmulatesMouse = doesTouchEmulateMouse;

		return this;
	}

	/**
	 * Sets wheter automatic resizing of the canvas element is used when
	 * window is resized.
	 *
	 * @param {boolean} useAutoResize Should automatic resize be used
	 * @return Canvas Self
	 * @since 1.0
	 */
	this.setAutoResize = function(useAutoResize) {
		this.autoResize = useAutoResize ? true : false;

		return this;
	}

	/**
	 * Handles window resize.
	 *
	 * Automatically resizes the canvas element to changed container size when
	 * autoResize has been set to true and onWindowResize() does not return false.
	 * If this is not an animation, calls the render callback once to render the
	 * image again with the new size.
	 *
	 * @returns void
	 * @private
	 * @since 1.0
	 */
    this.handleWindowResize = function() {
		if (this.autoResize && this.onWindowResize(this.getWidth(), this.getHeight()) !== false) {
			if (this.layerParent == null) {
				this.width = this.getWidth();
				this.height = this.getHeight();

				this.canvasElement.width = this.width;
				this.canvasElement.height = this.height;

				this.c.width = this.width;
				this.c.height = this.height;

				this.applyDefaultStyles();

				for (var layerKey in this.layers) {
					this.layers[layerKey].handleWindowResize();
				}

				if (!this.looping) {
					this.renderSingleFrame();
				}
			}
		}
    }

	/**
	 * Called when window is resized. Override this when needed.
	 *
	 * This does nothing by default and is meant for overriding to implement
	 * your own functionality.
	 *
	 * Return false to disable default actions (resizing canvas when autoResize
	 * is set true).
	 *
	 * @since 1.0
	 */
    this.onWindowResize = function() {}

	/**
	 * Called when context menu is requested on the canvas element. Return false
	 * to disable showing browser context menu.
	 *
	 * This does nothing by default and is meant for overriding to implement
	 * your own functionality.
	 *
	 * @param {object} event The triggered event
	 * @since 1.0
	 */
	this.onContextMenu = function(event) {}

	/**
	 * Called when a keyboard key is pressed down.
	 *
	 * This does nothing by default and is meant for overriding to implement
	 * your own functionality.
	 *
	 * @param {integer} keyCode The keycode of the key, match using the KC constants
	 * @param {string} character Character of the key as it would appear in a text field
	 * @param {boolean} isCtrlPressed Is CTRL also pressed
	 * @param {boolean} isShiftPressed Is SHIFT also pressed
	 * @param {boolean} isAltPressed Is ALT also pressed
	 * @since 1.0
	 */
    this.onKeyDown = function(keyCode, character, isCtrlPressed, isShiftPressed, isAltPressed) {}

	/**
	 * Called when a keyboard key is released.
	 *
	 * This does nothing by default and is meant for overriding to implement
	 * your own functionality.
	 *
	 * @param {integer} keyCode The keycode of the key, match using the KC constants
	 * @param {string} character Character of the key as it would appear in a text field
	 * @param {boolean} isCtrlPressed Is CTRL also pressed
	 * @param {boolean} isShiftPressed Is SHIFT also pressed
	 * @param {boolean} isAltPressed Is ALT also pressed
	 * @since 1.0
	 */
    this.onKeyUp = function(keyCode, character, isCtrlPressed, isShiftPressed, isAltPressed) {}

	/**
	 * Called when a keyboard key is pressed (both down and released back up)
	 *
	 * This does nothing by default and is meant for overriding to implement
	 * your own functionality.
	 *
	 * @param {integer} keyCode The keycode of the key, match using the KC constants
	 * @param {string} character Character of the key as it would appear in a text field
	 * @param {boolean} isCtrlPressed Is CTRL also pressed
	 * @param {boolean} isShiftPressed Is SHIFT also pressed
	 * @param {boolean} isAltPressed Is ALT also pressed
	 * @since 1.0
	 */
    this.onKeyPress = function(keyCode, character, isCtrlPressed, isShiftPressed, isAltPressed) {}

	/**
	 * Called when a mouse button is pressed down.
	 *
	 * This does nothing by default and is meant for overriding to implement
	 * your own functionality.
	 *
	 * @param {integer} x The x-position
	 * @param {integer} y The y-position
	 * @param {integer} button The index of the button pressed
	 * @since 1.0
	 */
    this.onMouseDown = function(x, y, button) {}

	/**
	 * Called when a mouse button is released.
	 *
	 * This does nothing by default and is meant for overriding to implement
	 * your own functionality.
	 *
	 * @param {integer} x The x-position
	 * @param {integer} y The y-position
	 * @param {integer} button The index of the button released
	 * @since 1.0
	 */
    this.onMouseUp = function(x, y, button) {}

	/**
	 * Called when the mouse is moved.
	 *
	 * This does nothing by default and is meant for overriding to implement
	 * your own functionality.
	 *
	 * @param {integer} x The x-position
	 * @param {integer} y The y-position
	 * @since 1.0
	 */
    this.onMouseMove = function(x, y) {}

	/**
	 * Called when the mouse wheel is scrolled.
	 *
	 * This does nothing by default and is meant for overriding to implement
	 * your own functionality.
	 *
	 * @param {integer} delta How much the scroll changed since last time
	 * @param {integer} absolute The absolute value since the start of the animation
	 * @since 1.0
	 */
	this.onMouseScroll = function(delta, absolute) {}

	/**
	 * Called at the start of every touch start (including when multiple touches occured)
	 *
	 * The info object contains the folloring info:
	 * - pageX - X coordinate relative to the full page (includes scrolling)
	 * - pageY - Y coordinate relative to the full page (includes scrolling)
	 * - clientX - X coordinate of touch relative to the viewport (excludes scroll offset)
	 * - clientY - Y coordinate of touch relative to the viewport (excludes scroll offset)
	 * - screenX - X coordinate relative to the screen
	 * - screenY - Y coordinate relative to the screen
	 *
	 * @param {object} info Touch info
	 * @param {integer} index Touch index
	 * @param {integer} count The total number of active touches
	 * @param {object} event The actual touch event
	 */
	this.onTouchStart = function(info, index, count, event) {}

	/**
	 * Called at the start of a multi-touch event (atleast two touches)
	 *
	 * The touches array contains the following info about every touch
	 * - pageX - X coordinate relative to the full page (includes scrolling)
	 * - pageY - Y coordinate relative to the full page (includes scrolling)
	 * - clientX - X coordinate of touch relative to the viewport (excludes scroll offset)
	 * - clientY - Y coordinate of touch relative to the viewport (excludes scroll offset)
	 * - screenX - X coordinate relative to the screen
	 * - screenY - Y coordinate relative to the screen
	 *
	 * @param {array} touches Array of touches info
	 * @param {object} event The actual touch event
	 */
    this.onMultiTouchStart = function(touches, event) {}

	/**
	 * Called when a touch move event occurs (including when multiple touches occured)
	 *
	 * The info object contains the folloring info:
	 * - pageX - X coordinate relative to the full page (includes scrolling)
	 * - pageY - Y coordinate relative to the full page (includes scrolling)
	 * - clientX - X coordinate of touch relative to the viewport (excludes scroll offset)
	 * - clientY - Y coordinate of touch relative to the viewport (excludes scroll offset)
	 * - screenX - X coordinate relative to the screen
	 * - screenY - Y coordinate relative to the screen
	 *
	 * @param {object} info Touch info
	 * @param {integer} index Touch index
	 * @param {integer} count The total number of active touches
	 * @param {object} previousInfo Touch info of the previous state of this touch
	 * @param {object} event The actual touch event
	 */
	this.onTouchMove = function(info, index, count, previousInfo, event) {}

	/**
	 * Called at touch move events (atleast two touches)
	 *
	 * The touches array contains the following info about every touch
	 * - pageX - X coordinate relative to the full page (includes scrolling)
	 * - pageY - Y coordinate relative to the full page (includes scrolling)
	 * - clientX - X coordinate of touch relative to the viewport (excludes scroll offset)
	 * - clientY - Y coordinate of touch relative to the viewport (excludes scroll offset)
	 * - screenX - X coordinate relative to the screen
	 * - screenY - Y coordinate relative to the screen
	 *
	 * @param {array} touches Array of touches info
	 * @param {array} previousTouches Array of previous touch states
	 * @param {object} event The actual touch event
	 */
    this.onMultiTouchMove = function(touches, previousTouches, event) {}

	/**
	 * Called at the end of every touch start (including when multiple touches occured)
	 *
	 * The info object contains the folloring info:
	 * - pageX - X coordinate relative to the full page (includes scrolling)
	 * - pageY - Y coordinate relative to the full page (includes scrolling)
	 * - clientX - X coordinate of touch relative to the viewport (excludes scroll offset)
	 * - clientY - Y coordinate of touch relative to the viewport (excludes scroll offset)
	 * - screenX - X coordinate relative to the screen
	 * - screenY - Y coordinate relative to the screen
	 *
	 * @param {object} info Touch info
	 * @param {integer} index Touch index
	 * @param {integer} count The total number of active touches
	 * @param {object} event The actual touch event
	 */
	this.onTouchEnd = function(info, index, count, event) {}

	/**
	 * Called at the end of a multi-touch event (atleast two touches)
	 *
	 * The touches array contains the following info about every touch
	 * - pageX - X coordinate relative to the full page (includes scrolling)
	 * - pageY - Y coordinate relative to the full page (includes scrolling)
	 * - clientX - X coordinate of touch relative to the viewport (excludes scroll offset)
	 * - clientY - Y coordinate of touch relative to the viewport (excludes scroll offset)
	 * - screenX - X coordinate relative to the screen
	 * - screenY - Y coordinate relative to the screen
	 *
	 * @param {array} touches Array of touches info
	 * @param {object} event The actual touch event
	 */
    this.onMultiTouchEnd = function(touches, event) {}

	//TODO: The rest of the touch functionality
	//
	//
	//
	//
    //this.onTouchMove = function(pageX, pageY, clientX, clientY, screenX, screenY, event) {}
    //this.onTouchEnd = function(pageX, pageY, clientX, clientY, screenX, screenY, event) {}

	/**
	 * Applies default styles.
	 *
	 * This includes:
	 * > setting fill color to red
	 * > setting stroke color to green
	 * > translating to 0.5x0.5 to get crisp shapes
	 * > setting the font to 12px Courier
	 *
	 * @returns {Canvas} Self
	 * @since 1.0
	 */
    this.applyDefaultStyles = function() {
        this.fillStyle("#FF0000");
        this.strokeStyle("#00FF00");
        this.translate(0.5, 0.5); // translate to 0.5x0.5 to get crisp shapes
        this.font('12px Courier');

		return this;
    }

	/**
	 * Sets target frames-per-second to given value.
	 *
	 * The fps parameter can have three kind of values
	 * > 0: static image, the render function is called only once
	 * > -1: animation without framerate limit, runs as fast as possible
	 * > positive: for example 60, use to try to maintain given framerate
	 *
	 * @param {float} fps Target framerate
	 * @returns {Canvas} Self
	 * @since 1.0
	 */
    this.setTargetFramerate = function(fps) {
        this.targetFPS = fps || 60;
        this.targetFrameDuration = this.targetFPS > 0 ? 1000.0 / this.targetFPS : 0;
        this.looping = this.targetFPS != 0 ? true : false;

		return this;
    }

	/**
	 * Returs current target framerate.
	 *
	 * The fps parameter can have three kind of values
	 * > 0: static image, the render function is called only once
	 * > -1: animation without framerate limit, runs as fast as possible
	 * > positive: for example 60, use to try to maintain given framerate
	 *
	 * @returns {float} Current target framerate
	 * @since 1.0
	 */
    this.getTargetFramerate = function() {
        return this.targetFPS;
    }

	/**
	 * Returs actual current framerate (average number of frames rendered per second).
	 *
	 * @returns {float} Current target framerate
	 * @since 1.0
	 */
    this.getFPS = function() {
        return this.fps;
    }

	/**
	 * Creates a new layer at top-left corner with the same width, height of the parent canvas.
	 *
	 * Layers are useful for drawing dynamic parts of the animation every frame while there can be complex static parent layers
	 * that are drawn only once.
	 *
	 * Use the createLayerAt() function to create a layer that can be placed anywhere and of custom size different than the parent.
	 *
	 * @param {string} name The name of the layar, can later be used to fetch its reference from parent
	 * @param {integer} fps Target framerate, see the Canvas constructor for explanation
	 * @param {function} renderCallback The render callback to use for drawing this layer
	 * @param {integer} [zIndex] Optional z-index, use to control which layer appears of top of others
	 * @param {boolean} [autostart] Should rendering of this layer be started at once or later by calling start() yourself
	 * @return {Canvas} The canvas element of the created layer, use the same way as parent
	 * @since 1.0
	 */
    this.createLayer = function(name, fps, renderCallback, zIndex, autostart) {
        return this.createLayerAt(name, 0, 0, this.getWidth(), this.getHeight(), fps, renderCallback, zIndex, autostart);
    }

	/**
	 * Creates a new layer at given position using given size.
	 *
	 * Layers are useful for drawing dynamic parts of the animation every frame while there can be complex static parent layers
	 * that are drawn only once.
	 *
	 * Use the simpler createLayer() function to create a layer is the same size as the parent layer.
	 *
	 * @param {string} name The name of the layar, can later be used to fetch its reference from parent
	 * @param {integer} x The x-coordinate of the layer, relative to the parent
	 * @param {integer} y The y-coordinate of the layer, relative to the parent
	 * @param {integer} width The width of the layer
	 * @param {integer} height The height of the layer
	 * @param {integer} fps Target framerate, see the Canvas constructor for explanation
	 * @param {function} renderCallback The render callback to use for drawing this layer
	 * @param {integer} [zIndex] Optional z-index, use to control which layer appears of top of others
	 * @param {boolean} [autostart] Should rendering of this layer be started at once or later by calling start() yourself
	 * @return {Canvas} The canvas element of the created layer, use the same way as parent
	 * @since 1.0
	 */
    this.createLayerAt = function(name, x, y, width, height, fps, renderCallback, zIndex, autostart) {
		fps = fps || 0;
        zIndex = zIndex || this.lastLayerZIndex + 1;
		autostart = autostart == null ? true : autostart;
		
		var layerContainer = document.createElement('div');
		layerContainer.style.position = 'relative';
        layerContainer.style.marginLeft = x + 'px';
        layerContainer.style.width = width + 'px';
        layerContainer.style.height = height + 'px';
        layerContainer.style.marginTop = (y - height) + 'px';
        layerContainer.style.zIndex = zIndex;
        
        var layerCanvasElement = document.createElement('canvas');

        layerCanvasElement.id = 'canvas-layer-' + name;
        layerCanvasElement.width = width;
        layerCanvasElement.height = height;

		layerContainer.appendChild(layerCanvasElement);
        this.canvasElement.parentNode.insertBefore(layerContainer, this.canvasElement.nextSibling);

        var canvasObject = new Canvas(layerCanvasElement, fps, renderCallback, false, this);
		
		canvasObject.layerX = x;
		canvasObject.layerY = y;
		canvasObject.layerWidth = width;
		canvasObject.layerHeight = height;

        this.layers[name] = canvasObject;
		this.lastLayerZIndex = zIndex;

		if (autostart) {
			if (fps != 0) {
				canvasObject.start();
			} else {
				canvasObject.renderSingleFrame();
			}
		}

        return canvasObject;
    }

	/**
	 * Returns a layer by name.
	 *
	 * If there is no such layer, returns null
	 *
	 * @param {string} name The name of the layer
	 * @return {Canvas|null} The layer canvas object or null if not found
	 * @since 1.0
	 */
    this.getLayer = function(name) {
        if (typeof(this.layers[name]) != 'undefined') {
            return this.layers[name];
        } else {
            return null;
        }
    }

	/**
	 * Render something offscreen into an image that you can later draw on the canvas.
	 *
	 * Similar to using layers except the result are not automatically painted but rather an image
	 * is returned that you can paint on the canvas yourself in any way needed.
	 *
	 * @param {integer} width The width of the buffer to create
	 * @param {integer} height The height of the drawing buffer
	 * @param {integer} fps Target framerate, see Canvas constructor for explanation
	 * @param {function} renderFunction The render callback to call to paint to this image
	 * @return {object} The canvas element, can be drawn to canvas with drawImage()
	 * @since 1.0
	 */
	this.renderToCanvas = function (width, height, fps, renderFunction) {
		var buffer = document.createElement('canvas');

		buffer.width = width;
		buffer.height = height;

		var canvas = new Canvas(buffer, fps, renderFunction, null, true);

		return canvas.canvasElement;
	}


	/**
	 * Load an image from url and calls the callbacks when read or something went wrong.
	 *
	 * This is a convienent way to load and use a picture in your image. Just provide the
	 * loadedCallback function that gets the loaded image as first argument. You can
	 * optionally provide the errorCallback that is called when something goes wrong.
	 *
	 * The callbacks get the canvas object as this-context so it's easy to use the image
	 * to draw it on the canvas. See drawImage() for that.
	 *
	 * @param {string} url The url of the image
	 * @param {function} loadedCallback Called when the image has finished loading, gets the image as first argument
	 * @param {function} errorCallback Called when loading the image has failed
	 * @return {void}
	 * @since 1.0
	 */
	this.loadImage = function(url, loadedCallback, errorCallback) {
		var image = new Image();

		var self = this;

		image.onload = function() {
			if (typeof (loadedCallback) == 'function') {
				loadedCallback.apply(self, [this]);
			}
		}

		image.onerror = function() {
			if (typeof (errorCallback) == 'function') {
				errorCallback.apply(self, [this]);
			}
		}

		image.src = url;
	}

	/**
	 * This function can be called with three possible argument sets:
	 * - drawImage(image, destinationX, destinationY, align, rotation)
	 * - drawImage(image, destinationX, destinationY, destinationWidth, destinationHeight, align, rotation)
	 * - drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, destinationX, destinationY, destinationWidth, destinationHeight, align, rotation)
	 *
	 * The align and rotation are optional in any case.
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.drawImage = function(image, p1, p2, p3, p4, p5, p6, p7, p8, p9, p10) {
		var align = null;
		var rotation = null;
		var params = null;

		if (p5 == null) {
			align = p3;
			rotation = p4;
			params = this.resolveRenderParameters(p1, p2, image.width, image.height, align, rotation);

			this.save();
			this.translate(params.tx, params.ty);
			if (params.r != 0) this.rotate(params.r * (Math.PI / 180.0));
			this.c.drawImage(image, params.sx, params.sy);
			this.restore();
		} else if (p7 == null) {
			align = p5;
			rotation = p6;
			params = this.resolveRenderParameters(p1, p2, image.width, image.height, align, rotation);

			this.save();
			this.translate(params.tx, params.ty);
			if (params.r != 0) this.rotate(params.r * (Math.PI / 180.0));
			this.c.drawImage(image, params.sx, params.sy, p3, p4);
			this.restore();
		} else {
			align = p9;
			rotation = p10;
			params = this.resolveRenderParameters(p5, p6, image.width, image.height, align, rotation);

			this.save();
			this.translate(params.tx, params.ty);
			if (params.r != 0) this.rotate(params.r * (Math.PI / 180.0));
			this.c.drawImage(image, p1, p2, p3, p4, params.sx, params.sy, p7, p8);
			this.restore();
		}

		return this;
	}

	/**
	 * Returns the parent canvas object of a layer.
	 *
	 * This is only set when the canvas element was created as a layer.
	 *
	 * @return {Canvas} The parent canvas element
	 * @since 1.0
	 */
    this.getParent = function() {
        return this.layerParent;
    }

	/**
	 * Sets the z-index of the layer (only when canvas was created as a layer).
	 *
	 * The bigger the z-index, the more on-top a layer is when there are several.
	 *
	 * @param {integer} zIndex The new z-index
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.setZIndex = function(zIndex) {
        this.canvasElement.style.zIndex = zIndex;

		return this;
    }

	/**
	 * Renders one frame.
	 *
	 * This is called automatically by the animation logic. You can call renderSingleFrame() when you have automatic
	 * animation disabled and need to render a frame.
	 *
	 * @param {long} frameDuration Duration of the frame, in seconds
	 * @param {long} totalDuration Total duration of the animation
	 * @param {integer} frameNumber Frame number since the start of the animation
	 * @return {Canvas} Self
	 * @since 1.0
	 * @private
	 */
    this.renderFrame = function(frameDuration, totalDuration, frameNumber) {
		if (this.renderCallback != null) {
            this.save();
            this.renderCallback.apply(this, [frameDuration, totalDuration, frameNumber]);
            this.restore();

			if (this.firstFrame == true) {
				this.firstFrame = false;
			}
        }

		return this;
    }

	/**
	 * Renders one frame.
	 *
	 * Call this to render frames when not using the automatic animation system.
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.renderSingleFrame = function() {
		return this.renderFrame(null, null, 1);
	}

	/**
	 * Starts the animation.
	 *
	 * Call stop() to stop it.
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.start = function() {
        this.looping = true;
        this.startTime = this.millis();
        this.fpsTime = this.millis();

        this.loop();

        return this;
    }

	/**
	 * Stops the animation.
	 *
	 * Call start() to (re)start it.
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.stop = function() {
        this.looping = false;

        return this;
    }

	/**
	 * The loop method that is called with a timeout recursively to run the animation at requested framerate.
	 *
	 * This function is called automatically internally when using the built-in animations.
	 *
	 * Uses a combination of wait period calculated by target framerate as well as dynamically changing
	 * wait to tune to the target framerate.
	 *
	 * Initiated by the start() method.
	 *
	 * @return {void}
	 * @since 1.0
	 * @private
	 */
    this.loop = function() {
        if (!this.looping) {
            return;
        }

        var currentTime = this.millis();

        this.totalDuration = currentTime - this.startTime;
        this.lastFrameDuration = Math.max(this.totalDuration - this.lastTotalDuration, 1);
        this.frameCount++;

        this.renderFrame(this.lastFrameDuration, this.totalDuration, this.frameCount);

        this.lastTotalDuration = this.totalDuration;
        this.fpsCounter++;

        if (currentTime - this.fpsTime >= 1000) {
            this.fps = this.fpsCounter;
            this.fpsCounter = 0;
            this.fpsTime = currentTime;
        }

        if (this.targetFPS != -1) {
            if (this.fps > this.targetFPS) {
                this.fpsDynamicWait += (this.fps - this.targetFPS) / 100.0;
            } else if (this.fps < this.targetFPS && this.fpsDynamicWait >= 1) {
                this.fpsDynamicWait -= (this.targetFPS - this.fps) / 100.0;
            }
        } else {
            this.fpsDynamicWait = 0;
        }

        var self = this;

        window.setTimeout(function() {
            self.loop();
        }, Math.max(this.targetFrameDuration - this.lastFrameDuration + this.fpsDynamicWait, 0));
	}

	/**
	 * Returns the milliseconds, useful for timing.
	 *
	 * Also used internally.
	 *
	 * @return {long} The milliseconds
	 * @since 1.0
	 */
    this.millis = function() {
        return (new Date()).getTime();
    }

	/**
	 * Returns the width of the canvas. Returns layer width when used as layer.
	 *
	 * You can use the public width field of the Canvas object to type less.
	 *
	 * @return {integer} The width
	 * @since 1.0
	 */
    this.getWidth = function() {
		if (this.layerWidth != null) {
			return this.layerWidth;
		} else {
			return this.canvasElement.clientWidth;
		}
    }

	/**
	 * Returns the height of the canvas. Returns layer height when used as layer.
	 *
	 * You can use the public height field of the Canvas object to type less.
	 *
	 * @return {integer} The height
	 * @since 1.0
	 */
    this.getHeight = function() {
		if (this.layerHeight != null) {
			return this.layerHeight;
		} else {
			return this.canvasElement.clientHeight;
		}
    }

    /**
	 * Saves the current drawing state of the canvas.
	 *
	 * Saving the drawing state before changing it is useful so after doing some operations with certain settings, you can
	 * easily restore the state with a single call instead of having to remember and reset all the changed attributes.
	 *
	 * The drawing state includes:
	 * - The current transformation matrix.
	 * - The current clipping region.
	 * - The current values of the following attributes: strokeStyle, fillStyle, globalAlpha, lineWidth, lineCap, lineJoin, miterLimit, shadowOffsetX, shadowOffsetY, shadowBlur, shadowColor, globalCompositeOperation, font, textAlign, textBaseline.
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.save = function() {
        this.c.save();

        return this;
    }

	/**
	 * Restores the current drawing state of the canvas.
	 *
	 * Saving the drawing state before changing it is useful so after doing some operations with certain settings, you can
	 * easily restore the state with a single call instead of having to remember and reset all the changed attributes.
	 *
	 * The drawing state includes:
	 * - The current transformation matrix.
	 * - The current clipping region.
	 * - The current values of the following attributes: strokeStyle, fillStyle, globalAlpha, lineWidth, lineCap, lineJoin, miterLimit, shadowOffsetX, shadowOffsetY, shadowBlur, shadowColor, globalCompositeOperation, font, textAlign, textBaseline.
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.restore = function() {
        this.c.restore();

        return this;
    }

	/**
	 * Sets the scaling factor of following operations.
	 *
	 * The x argument represents the scale factor in the horizontal direction and the y argument
	 * represents the scale factor in the vertical direction. The factors are multiples.
	 *
	 * @param {float} x The x-scale factor
	 * @param {float} y The y-scale factor
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.scale = function(x, y) {
        this.c.scale(x, y);

        return this;
    }

	/**
	 * Sets the rotation of following operations.
	 *
	 * Note that this expects radians while other places where rotation is given as a parameter
	 * to drawing operations, degrees are expected.
	 *
	 * @param {float} angle The rotation in radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.rotate = function(angle) {
        this.c.rotate(angle);

        return this;
    }

	/**
	 * Moves the drawing orign by given amount. The x argument represents the translation distance
	 * in the horizontal direction and the y argument represents the translation distance in the
	 * vertical direction. The arguments are in coordinate space units.
	 *
	 * @param {float} x The x transformation hotizontally
	 * @param {float} y The y transformation vertically
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.translate = function(x, y) {
        this.c.translate(x, y);

        return this;
    }

	/**
	 * Transforms the transformation matrix by given values.
	 *
	 * The arguments a, b, c, d, e, and f are sometimes called m11, m12, m21, m22, dx, and dy or m11,
	 * m21, m12, m22, dx, and dy. Care should be taken in particular with the order of the second and
	 * third arguments (b and c) as their order varies from API to API and APIs sometimes use the
	 * notation m12/m21 and sometimes m21/m12 for those positions.
	 *
	 * a c e
	 * b d f
	 * 0 0 1
	 *
	 * TODO: Explain what each one does
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.transform = function(a, b, c, d, e, f) {
        this.c.transform(a, b, c, d, e, f);

        return this;
    }

	/**
	 * Sets the transformation matrix.
	 *
	 * The arguments a, b, c, d, e, and f are sometimes called m11, m12, m21, m22, dx, and dy or m11,
	 * m21, m12, m22, dx, and dy. Care should be taken in particular with the order of the second and
	 * third arguments (b and c) as their order varies from API to API and APIs sometimes use the
	 * notation m12/m21 and sometimes m21/m12 for those positions.
	 *
	 * a c e
	 * b d f
	 * 0 0 1
	 *
	 * TODO: Explain what each one does
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.setTransform = function(a, b, c, d, e, f) {
        this.c.setTransform(a, b, c, d, e, f);

        return this;
    }

	/**
	 * Sets the global alpha transparency level.
	 *
	 * This gives an alpha value that is applied to shapes and images before they are composited onto
	 * the canvas. The value must be in the range from 0.0 (fully transparent) to 1.0 (no additional
	 * transparency so fully opaque).
	 *
	 * @param {float} alpha The opacity level
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.setGlobalAlpha = function(alpha) {
        this.c.globalAlpha = alpha;

		return this;
    }

    /**
	 * Sets how shapes and images are drawn onto the existing bitmap, once they have had globalAlpha
	 * and the current transformation matrix applied.
	 *
	 * It must be set to a value from the following list. In the descriptions below, the source image,
	 * A, is the shape or image being rendered, and the destination image, B, is the current state of
	 * the bitmap.
	 *
	 * You can use the following constants:
	 * - OP.SOURCE_OVER      : 'source-over'
	 *   A over B. Display the source image wherever the source image is opaque. Display the
	 *   destination image elsewhere.
	 *
	 * - OP.SOURCE_IN        : 'source-in'
	 *   A in B. Display the source image wherever both the source image and destination image are
	 *   opaque. Display transparency elsewhere.
	 *
	 * - OP.SOURCE_OUT       : 'source-out'
	 *   A out B. Display the source image wherever the source image is opaque and the destination image
	 *   is transparent. Display transparency elsewhere.
	 *
	 * - OP.SOURCE_ATOP      : 'source-atop'
	 *   A atop B. Display the source image wherever both images are opaque. Display the destination
	 *   image wherever the destination image is opaque but the source image is transparent. Display
	 *   transparency elsewhere.
	 *   
	 * - OP.DESTINATION_OVER : 'destination-over'
	 *   B over A. Same as source-over but using the destination image instead of the source image
	 *   and vice versa.
	 *
	 * - OP.DESTINATION_IN   : 'destination-in'
	 *   B in A. Same as source-in but using the destination image instead of the source image and
	 *   vice versa.
	 *   
	 * - OP.DESTINATION_OUT  : 'destination-out'
	 *   B out A. Same as source-out but using the destination image instead of the source image and
	 *   vice versa.
	 *
	 * - OP.DESTINATION_ATOP : 'destination-atop'
	 *   B atop A. Same as source-atop but using the destination image instead of the source image
	 *   and vice versa.
	 *
	 * - OP.LIGHTER          : 'lighter'
	 *   A plus B. Display the sum of the source image and destination image, with color values
	 *   approaching 255 (100%) as a limit.
	 *
	 * - OP.COPY             : 'copy'
	 *   A (B is ignored). Display the source image instead of the destination image.
	 *
	 * - OP.XOR              : 'xor'
	 *   A xor B. Exclusive OR of the source image and destination image.
	 *
	 * @param {string} operationName The name of the operation, use the OP. shortcuts
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.setCompositeOperation = function(operationName) {
        this.c.globalCompositeOperation = operationName;

		return this;
    }

	/**
	 * Begins composition.
	 *
	 * Starts the composite drawing for following calls, use endComposite() to return to normal.
	 *
	 * See setCompositeOperation() for explanation of the possible operations.
	 *
	 * @param {string} operationName The name of the operation, use the OP. shortcuts
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.beginComposite = function(operationName) {
		this.save();
		this.setCompositeOperation(operationName);
	}

	/**
	 * Ends composition.
	 *
	 * Starts the composite drawing for following calls, use endComposite() to return to normal.
	 *
	 * See setCompositeOperation() for explanation of the possible operations.
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.endComposite = function() {
		this.restore();
	}

	/**
	 * Sets the fill style.
	 *
	 * This style is used when filling shapes.
	 *
	 * A fill style can be a color (hex or rgba), a CanvasGradient or a CanvasPattern. For clarity,
	 * using fillColor when meaning to change color is advisid.
	 *
	 * @param {string|object} style New fill style
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.fillStyle = function(style) {
        this.c.fillStyle = style;

        return this;
    }

	/**
	 * Sets the fill color.
	 *
	 * This color is used when filling shapes.
	 *
	 * Fill color can be either in hex (#FF0000 etc) or rgba format (rgba(255, 0, 0, 1) etc).
	 *
	 * @param {string} color New fill color
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.fillColor = function(color) {
        this.c.fillStyle = color;

        return this;
    }

	/**
	 * Sets the stroke style.
	 *
	 * This style is used when stroking shapes.
	 *
	 * A stroke style can be a color (hex or rgba), a CanvasGradient or a CanvasPattern. For clarity,
	 * using strokeColor when meaning to change color is advisid.
	 *
	 * @param {string|object} style New stroke style
	 * @param {integer} [lineWidth] Width of stroke, optional
	 * @param {integer} [lineCap] Cap style of lines, see lineCap() method, optional
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.strokeStyle = function(style, lineWidth, lineCap) {
        this.c.strokeStyle = style;

		if (lineWidth != null) {
			this.c.lineWidth = lineWidth;
		}

		if (lineCap != null) {
			this.c.lineCap = lineCap;
		}

        return this;
    }

	/**
	 * Sets the stroke color.
	 *
	 * This color is used when stroking shapes.
	 *
	 * Stroke color can be either in hex (#FF0000 etc) or rgba format (rgba(255, 0, 0, 1) etc).
	 *
	 * @param {string|object} color New stroke color
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.strokeColor = function(color) {
		this.c.strokeStyle = color;

		return this;
	}

	/**
	 * Sets line width of following stroke operations.
	 *
	 * @param {float} width Stroke weight
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.lineWidth = function(width) {
		this.c.lineWidth = width;

		return this;
	}

	/**
	 * Sets line cap style of following stroke operations.
	 *
	 * Use one of the following:
	 * CAP.ROUND  : 'round'  - round edges
	 * CAP.SQUARE : 'square' - square edges, over the start/end coords by half width
	 * CAP.BUTT   : 'butt'   - square ending at start/end coords
	 *
	 * @param {string} lineCap Line cap style
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.lineCap = function(lineCap) {
		this.c.lineCap = lineCap;

		return this;
	}

	/**
	 * Sets line join style of following stroke operations.
	 *
	 * Use one of the following:
	 * JOIN.BEVEL : 'bevel' - beveled line joins (straight connection)
	 * JOIN.ROUND : 'round' - round joins
	 * JOIN.MITER : 'miter' - mitered joins (square)
	 *
	 * @param {string} lineJoin Line join style
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.lineJoin = function(lineJoin) {
		this.c.lineJoin = lineJoin;

		return this;
	}

	/**
	 * Sets both the fill and the stroke color.
	 *
	 * Colors can be either in hex (#FF0000 etc) or rgba format (rgba(255, 0, 0, 1) etc).
	 *
	 * @param {string|object} fillColor New fill color
	 * @param {string|object} strokeColor New stroke color
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.color = function(fillColor, strokeColor) {
		if (fillColor != null) this.fillColor(fillColor);
		if (strokeColor != null) this.strokeColor(strokeColor);

		return this;
	}

	/**
	 * Sets the shadow style.
	 *
	 * The shadow style is used for all following drawing operations. Use beginShadow()
	 * and endShadow() to use the shadow style for operations between the calls.
	 *
	 * @param {float} offsetX Shadow horizontal offset
	 * @param {float} offsetY Shadow vertical offset
	 * @param {float} [blurRadius] The softness of the shadow
	 * @param {string} [color] Shadow color, must be a css-style color declaration (hex or rgba)
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.shadowStyle = function(offsetX, offsetY, blurRadius, color) {
		this.c.shadowOffsetX = offsetX;
		this.c.shadowOffsetY = offsetY;
		if (blurRadius != null) this.c.shadowBlur = blurRadius;
		if (!color != null) this.c.shadowColor = color;

		return this;
	}

	/**
	 * Begins using given shadow style.
	 *
	 * Use endShadow() to stop using this style.
	 *
	 * @param {float} offsetX Shadow horizontal offset
	 * @param {float} offsetY Shadow vertical offset
	 * @param {float} [blurRadius] The softness of the shadow
	 * @param {string} [color] Shadow color, must be a css-style color declaration (hex or rgba)
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.beginShadow = function(offsetX, offsetY, blurRadius, color) {
		this.save();
		this.shadowStyle(offsetX, offsetY, blurRadius, color);

		return this;
	}

	/**
	 * Stops using given shadow style.
	 *
	 * Use beginShadow() to start using a style.
	 * 
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.endShadow = function() {
		this.restore();
	}

	/**
	 * Creates linear gradient style and returns it.
	 *
	 * The returned value can be used as argument for stroke/fill style but you can
	 * use the beginLinearGradientFill/beginLinearGradientStroke/beginLinearGradient and
	 * endGradient() pairs to use the gradient for fill operations in-between the calls.
	 *
	 * The optional stops object is expected to contain the positions and colors of
	 * the gradient. For example:
	 * {
	 *    0.0: 'rgba(255, 0, 0, 1)',
	 *    0.5: 'rgba(0, 255, 0, 0.5)',
	 *    1.0: 'rgba(0, 0, 255, 0)'
	 * }
	 * defines that the gradient should begin with solid red, then change to half-transparent
	 * green in the middle and end with transparent blue.
	 *
	 * You can also add the stops using addColorStop() method of the returned gradient.
	 *
	 * @param {float} startX Gradient start horizontal position
	 * @param {float} startY Gradient start vertical position
	 * @param {float} endX Gradient end horizontal position
	 * @param {float} endY Gradient end vertical position
	 * @param {object} [stops] Object of color stops
	 * @return {CanvasGradient} The gradient object
	 * @since 1.0
	 */
	this.createLinearGradient = function(startX, startY, endX, endY, stops) {
		var gradient = this.c.createLinearGradient(startX, startY, endX, endY);

		if (stops != null) {
			for (var point in stops) {
				gradient.addColorStop(parseFloat(point), stops[point]);
			}
		}

		return gradient;
	}

	/**
	 * Begins linear gradient for fill operations.
	 *
	 * Use endGradient() to stop using this style.
	 *
	 * The optional stops object is expected to contain the positions and colors of
	 * the gradient. For example:
	 * {
	 *    0.0: 'rgba(255, 0, 0, 1)',
	 *    0.5: 'rgba(0, 255, 0, 0.5)',
	 *    1.0: 'rgba(0, 0, 255, 0)'
	 * }
	 * defines that the gradient should begin with solid red, then change to half-transparent
	 * green in the middle and end with transparent blue.
	 *
	 * You can also add the stops using addColorStop() method of the returned gradient.
	 *
	 * @param {float} startX Gradient start horizontal position
	 * @param {float} startY Gradient start vertical position
	 * @param {float} endX Gradient end horizontal position
	 * @param {float} endY Gradient end vertical position
	 * @param {object} [stops] Object of color stops
	 * @return {CanvasGradient} The gradient object
	 * @since 1.0
	 */
	this.beginLinearGradientFill = function(startX, startY, endX, endY, stops) {
		this.save();

		var gradient = this.createLinearGradient(startX, startY, endX, endY, stops);

		this.fillStyle(gradient);

		return gradient;
	}

	/**
	 * Begins linear gradient for stroke operations.
	 *
	 * Use endGradient() to stop using this style.
	 *
	 * The optional stops object is expected to contain the positions and colors of
	 * the gradient. For example:
	 * {
	 *    0.0: 'rgba(255, 0, 0, 1)',
	 *    0.5: 'rgba(0, 255, 0, 0.5)',
	 *    1.0: 'rgba(0, 0, 255, 0)'
	 * }
	 * defines that the gradient should begin with solid red, then change to half-transparent
	 * green in the middle and end with transparent blue.
	 *
	 * You can also add the stops using addColorStop() method of the returned gradient.
	 *
	 * @param {float} startX Gradient start horizontal position
	 * @param {float} startY Gradient start vertical position
	 * @param {float} endX Gradient end horizontal position
	 * @param {float} endY Gradient end vertical position
	 * @param {object} [stops] Object of color stops
	 * @return {CanvasGradient} The gradient object
	 * @since 1.0
	 */
	this.beginLinearGradientStroke = function(startX, startY, endX, endY, stops) {
		this.save();

		var gradient = this.createLinearGradient(startX, startY, endX, endY, stops);

		this.strokeStyle(gradient);

		return gradient;
	}

	/**
	 * Begins linear gradient for both fill and stroke operations.
	 *
	 * Use endGradient() to stop using this style.
	 *
	 * The optional stops object is expected to contain the positions and colors of
	 * the gradient. For example:
	 * {
	 *    0.0: 'rgba(255, 0, 0, 1)',
	 *    0.5: 'rgba(0, 255, 0, 0.5)',
	 *    1.0: 'rgba(0, 0, 255, 0)'
	 * }
	 * defines that the gradient should begin with solid red, then change to half-transparent
	 * green in the middle and end with transparent blue.
	 *
	 * You can also add the stops using addColorStop() method of the returned gradient.
	 *
	 * @param {float} startX Gradient start horizontal position
	 * @param {float} startY Gradient start vertical position
	 * @param {float} endX Gradient end horizontal position
	 * @param {float} endY Gradient end vertical position
	 * @param {object} [stops] Object of color stops
	 * @return {CanvasGradient} The gradient object
	 * @since 1.0
	 */
	this.beginLinearGradient = function(startX, startY, endX, endY, stops) {
		this.save();

		var gradient = this.createLinearGradient(startX, startY, endX, endY, stops);

		this.fillStyle(gradient);
		this.strokeStyle(gradient);

		return gradient;
	}

	/**
	 * Creates radial gradient style and returns it.
	 *
	 * The returned value can be used as argument for stroke/fill style but you can
	 * use the beginRadialGradientFill/beginRadialGradientStroke/beginRadialGradient and
	 * endGradient() pairs to use the gradient for fill operations in-between the calls.
	 *
	 * The optional stops object is expected to contain the positions and colors of
	 * the gradient. For example:
	 * {
	 *    0.0: 'rgba(255, 0, 0, 1)',
	 *    0.5: 'rgba(0, 255, 0, 0.5)',
	 *    1.0: 'rgba(0, 0, 255, 0)'
	 * }
	 * defines that the gradient should begin with solid red, then change to half-transparent
	 * green in the middle and end with transparent blue.
	 *
	 * You can also add the stops using addColorStop() method of the returned gradient.
	 *
	 * @param {float} x1 Inner circle horizontal offset
	 * @param {float} y1 Inner circle vertical offset
	 * @param {float} radius1 Inner circle radius
	 * @param {float} x2 Outer circle horizontal offset
	 * @param {float} y2 Outer circle vertical offset
	 * @param {float} radius2 Outer circle radius
	 * @param {object} [stops] Object of color stops
	 * @return {CanvasGradient} The gradient object
	 * @since 1.0
	 */
	this.createRadialGradient = function(x1, y1, radius1, x2, y2, radius2, stops) {
		var gradient = this.c.createRadialGradient(x1, y1, radius1, x2, y2, radius2);

		if (stops != null) {
			for (var point in stops) {
				gradient.addColorStop(parseFloat(point), stops[point]);
			}
		}

		return gradient;
	}

	/**
	 * Begins using radial gradient for following fill operations.
	 *
	 * Use endGradient() to stop using this style.
	 *
	 * The optional stops object is expected to contain the positions and colors of
	 * the gradient. For example:
	 * {
	 *    0.0: 'rgba(255, 0, 0, 1)',
	 *    0.5: 'rgba(0, 255, 0, 0.5)',
	 *    1.0: 'rgba(0, 0, 255, 0)'
	 * }
	 * defines that the gradient should begin with solid red, then change to half-transparent
	 * green in the middle and end with transparent blue.
	 *
	 * You can also add the stops using addColorStop() method of the returned gradient.
	 *
	 * @param {float} x1 Inner circle horizontal offset
	 * @param {float} y1 Inner circle vertical offset
	 * @param {float} radius1 Inner circle radius
	 * @param {float} x2 Outer circle horizontal offset
	 * @param {float} y2 Outer circle vertical offset
	 * @param {float} radius2 Outer circle radius
	 * @param {object} [stops] Object of color stops
	 * @return {CanvasGradient} The gradient object
	 * @since 1.0
	 */
	this.beginRadialGradientFill = function(x1, y1, radius1, x2, y2, radius2, stops) {
		this.save();

		var gradient = this.createRadialGradient(x1, y1, radius1, x2, y2, radius2, stops);

		this.fillStyle(gradient);

		return gradient;
	}

	/**
	 * Begins using radial gradient for following stroke operations.
	 *
	 * Use endGradient() to stop using this style.
	 *
	 * The optional stops object is expected to contain the positions and colors of
	 * the gradient. For example:
	 * {
	 *    0.0: 'rgba(255, 0, 0, 1)',
	 *    0.5: 'rgba(0, 255, 0, 0.5)',
	 *    1.0: 'rgba(0, 0, 255, 0)'
	 * }
	 * defines that the gradient should begin with solid red, then change to half-transparent
	 * green in the middle and end with transparent blue.
	 *
	 * You can also add the stops using addColorStop() method of the returned gradient.
	 *
	 * @param {float} x1 Inner circle horizontal offset
	 * @param {float} y1 Inner circle vertical offset
	 * @param {float} radius1 Inner circle radius
	 * @param {float} x2 Outer circle horizontal offset
	 * @param {float} y2 Outer circle vertical offset
	 * @param {float} radius2 Outer circle radius
	 * @param {object} [stops] Object of color stops
	 * @return {CanvasGradient} The gradient object
	 * @since 1.0
	 */
	this.beginRadialGradientStroke = function(x1, y1, radius1, x2, y2, radius2, stops) {
		this.save();

		var gradient = this.createRadialGradient(x1, y1, radius1, x2, y2, radius2, stops);

		this.strokeStyle(gradient);

		return gradient;
	}

	/**
	 * Begins using radial gradient for following fill and stoke operations.
	 *
	 * Use endGradient() to stop using this style.
	 *
	 * The optional stops object is expected to contain the positions and colors of
	 * the gradient. For example:
	 * {
	 *    0.0: 'rgba(255, 0, 0, 1)',
	 *    0.5: 'rgba(0, 255, 0, 0.5)',
	 *    1.0: 'rgba(0, 0, 255, 0)'
	 * }
	 * defines that the gradient should begin with solid red, then change to half-transparent
	 * green in the middle and end with transparent blue.
	 *
	 * You can also add the stops using addColorStop() method of the returned gradient.
	 *
	 * @param {float} x1 Inner circle horizontal offset
	 * @param {float} y1 Inner circle vertical offset
	 * @param {float} radius1 Inner circle radius
	 * @param {float} x2 Outer circle horizontal offset
	 * @param {float} y2 Outer circle vertical offset
	 * @param {float} radius2 Outer circle radius
	 * @param {object} [stops] Object of color stops
	 * @return {CanvasGradient} The gradient object
	 * @since 1.0
	 */
	this.beginRadialGradient = function(x1, y1, radius1, x2, y2, radius2, stops) {
		this.save();

		var gradient = this.createRadialGradient(x1, y1, radius1, x2, y2, radius2, stops);

		this.fillStyle(gradient);
		this.strokeStyle(gradient);

		return gradient;
	}

	/**
	 * Ends using a gradient style created with any of the begin gradient methods.
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.endGradient = function() {
		this.restore();

		return this;
	}

	/**
	 * Fills all the subpaths of current path using current fill style.
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.fill = function() {
        this.c.fill();

		return this;
    }

	/**
	 * Strokes all the strokess of current path using current stroke style.
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.stroke = function() {
        this.c.stroke();

		return this;
    }

	/**
	 * Starts a new path, emptying the list of current subpaths.
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.beginPath = function() {
        this.c.beginPath();

        return this;
    }

	/**
	 * Closes the last subpath and creates a new subpath whose first point is the same as the
	 * previous subpath's first point and adds it to the path.
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.closePath = function() {
        this.c.closePath();

        return this;
    }

	/**
	 * Creates a new subpath with the specified point as the first and only point.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.moveTo = function(x, y) {
        this.c.moveTo(x, y);

        return this;
    }

	/**
	 * Adds a line to given coordinates to the active path. Ensures that there is a subpath
	 * for (x, y) if the context has no subpaths. Otherwise it connects the last point in the
	 * subpath to given point using a straight line, adds the given point to the subpath.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.lineTo = function(x, y) {
        this.c.lineTo(x, y);

        return this;
    }

	/**
	 * Adds a quadratic curve to the path.
	 *
	 * Adds a curve between point (x, y), controlled by the control point
	 * at (controlPointX, controlPointY).
	 *
	 * For more control with two control points, use bezierCurveTo().
	 *
	 * @param {float} controlPointX Control point x-coordinate
	 * @param {float} controlPointY Control point y-coordinate
	 * @param {float} x target x-coordinate
	 * @param {float} y target y-coordinate
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.quadraticCurveTo = function(controlPointX, controlPointY, x, y) {
        this.c.quadraticCurveTo(controlPointX, controlPointY, x, y);

        return this;
    }

	/**
	 * Adds a bezier curve to the path.
	 *
	 * Adds a curve between point (x, y), controlled by the two control points.
	 *
	 * For simpler method using one control point, use quadraticCurveTo().
	 *
	 * @param {float} fistControlPointX First control point x-coordinate
	 * @param {float} firstControlPointY First control point y-coordinate
	 * @param {float} secondControlPointX Second control point x-coordinate
	 * @param {float} secondControlPointY Second control point y-coordinate
	 * @param {float} x target x-coordinate
	 * @param {float} y target y-coordinate
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.bezierCurveTo = function(fistControlPointX, firstControlPointY, secondControlPointX, secondControlPointY, x, y) {
        this.c.bezierCurveTo(fistControlPointX, firstControlPointY, secondControlPointX, secondControlPointY, x, y);

        return this;
    }

	/**
	 * Sets font style to use for the following text operations.
	 *
	 * The syntax is the same as css 'font' property, for example "10px sans-serif".
	 *
	 * @param {string} definition The font definition
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.font = function(definition) {
        this.c.font = definition;

		return this;
    }

	/**
	 * Sets the text align to use for the following text operations.
	 *
	 * Use the ALIGN constants, for example ALIGN.RIGHT.BOTTOM to align to right-bottom.
	 *
	 * @param {string} align The align definition
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.textAlign = function(align) {
        this.c.textAlign = align;

		return this;
    }

	/**
	 * Sets text baseline to use for the following text operations.
	 *
	 * @param {string} baseline The baseline setting
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.textBaseline = function(baseline) {
        this.c.textBaseline = baseline;

		return this;
    }

	/**
	 * Clears the pixels in specified rectangle that also intersects the current clipping
	 * region to fully transparent black, erasing any previous image.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} width The width
	 * @param {float} height The height
	 * @param {string} align The align definition, see ALIGN
	 * @param {float} rotation Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.clearRect = function(x, y, width, height, align, rotation) {
        var params = this.resolveRenderParameters(x, y, width, height, align, rotation);

        this.save();
        this.translate(params.tx, params.ty);
        if (params.r != 0) this.rotate(params.r * (Math.PI / 180.0));
        this.c.clearRect(params.sx, params.sy, params.w, params.h);
        this.restore();

        return this;
    }

	/**
	 * Clears the whole canvas.
	 *
	 * Useful to clear the canvas before every new frame.
	 *
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.clear = function() {
        return this.clearRect(0, 0, this.getWidth(), this.getHeight());
    }

	/**
	 * Adds text to subpath given text at given coordinates using the optional align and rotation settings.
	 *
	 * The text is rotated about the point defined by align.
	 *
	 * @param {string} text Text to draw
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {string} align The align definition, see ALIGN
	 * @param {float} rotation Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.text = function(text, x, y, align, rotation) {
        rotation = rotation || 0;
        align = align || 'start-top';

        var alignParts = align.split('-');
		var textAlign = alignParts[0];
		var textBaseline = alignParts[1];

        this.save();
        this.translate(x, y);
        if (rotation != 0) this.rotate(rotation * (Math.PI / 180.0));
        this.textAlign(textAlign);
        this.textBaseline(textBaseline);
        this.c.fillText(text, 0, 0);
        this.restore();

		return this;
    }

	/**
	 * Fills given text at given coordinates using the optional align and rotation settings.
	 *
	 * The text is rotated about the point defined by align.
	 *
	 * @param {string} text Text to draw
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {string} align The align definition, see ALIGN
	 * @param {float} rotation Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.fillText = function(text, x, y, align, rotation) {
        rotation = rotation || 0;
        align = align || 'start-top';
		
        var alignParts = align.split('-');
		var textAlign = alignParts[0];
		var textBaseline = alignParts[1];

        this.save();
        this.translate(x, y);
		this.beginPath();
        if (rotation != 0) this.rotate(rotation * (Math.PI / 180.0));
        this.textAlign(textAlign);
        this.textBaseline(textBaseline);
        this.c.fillText(text, 0, 0);
        this.fill();
        this.restore();

		return this;
    }

	/**
	 * Strokes given text at given coordinates using the optional align and rotation settings.
	 *
	 * The text is rotated about the point defined by align.
	 *
	 * @param {string} text Text to draw
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {string} align The align definition, see ALIGN
	 * @param {float} rotation Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.strokeText = function(text, x, y, align, rotation) {
        rotation = rotation || 0;
        align = align || 'start-top';

        var alignParts = align.split('-');
		var textAlign = alignParts[0];
		var textBaseline = alignParts[1];

        this.save();
        this.translate(x, y);
        this.rotate(rotation * (Math.PI / 180.0));
        this.textAlign(textAlign);
        this.textBaseline(textBaseline);
        this.c.strokeText(text, 0, 0);
        this.stroke();
        this.restore();

		return this;
    }

	/**
	 * Adds a new rectangle subpath to current path.
	 *
	 * Creates a new subpath containing just the four points (x, y), (x+w, y), (x+w, y+h),
	 * (x, y+h), with those four points connected by straight lines, and then marks the subpath
	 * as closed. It then creates a new subpath with the point (x, y) as the only point
	 * in the subpath.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} width The width
	 * @param {float} height The height
	 * @param {string} align The align definition, see ALIGN
	 * @param {float} rotation Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.rect = function(x, y, width, height, align, rotation) {
		var params = this.resolveRenderParameters(x, y, width, height, align, rotation);

        this.save();
        this.translate(params.tx, params.ty);
        if (params.r != 0) this.rotate(params.r * (Math.PI / 180.0));
        this.c.rect(params.sx, params.sy, params.w, params.h);
        this.restore();

        return this;
	}

	/**
	 * Fills a rectangle onto the canvas.
	 *
	 * Creates a new subpath containing just the four points (x, y), (x+w, y), (x+w, y+h),
	 * (x, y+h), with those four points connected by straight lines, and then marks the subpath
	 * as closed. It then creates a new subpath with the point (x, y) as the only point
	 * in the subpath. Then fills it.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} width The width
	 * @param {float} height The height
	 * @param {string} align The align definition, see ALIGN
	 * @param {float} rotation Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.fillRect = function(x, y, width, height, align, rotation) {
		var params = this.resolveRenderParameters(x, y, width, height, align, rotation);

        this.save();
        this.translate(params.tx, params.ty);
        if (params.r != 0) this.rotate(params.r * (Math.PI / 180.0));
        this.c.fillRect(params.sx, params.sy, params.w, params.h);
        this.restore();

        return this;
    }

	/**
	 * Strokes a rectangle onto the canvas.
	 *
	 * Creates a new subpath containing just the four points (x, y), (x+w, y), (x+w, y+h),
	 * (x, y+h), with those four points connected by straight lines, and then marks the subpath
	 * as closed. It then creates a new subpath with the point (x, y) as the only point
	 * in the subpath. Then strokes it.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} width The width
	 * @param {float} height The height
	 * @param {string} align The align definition, see ALIGN
	 * @param {float} rotation Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.strokeRect = function(x, y, width, height, align, rotation) {
        var params = this.resolveRenderParameters(x, y, width, height, align, rotation);

        this.save();
        this.translate(params.tx, params.ty);
        if (params.r != 0) this.rotate(params.r * (Math.PI / 180.0));
        this.c.strokeRect(params.sx, params.sy, params.w, params.h);
        this.restore();

        return this;
    }

	/**
	 * Adds a new rounded rectangle subpath to current path.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} width The width
	 * @param {float} height The height
	 * @param {float} radius The radius of the corners
	 * @param {string} align The align definition, see ALIGN
	 * @param {float} rotation Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.roundedRect = function(x, y, width, height, radius, align, rotation){
		var params = this.resolveRenderParameters(x, y, width, height, align, rotation);

		this.save();
		this.translate(params.tx, params.ty);
        this.moveTo(params.sx + radius, params.sy);
        this.lineTo(params.sx+width-radius, params.sy);
        this.quadraticCurveTo(params.sx+width, params.sy, params.sx+width, params.sy+radius);
        this.lineTo(params.sx+width, params.sy+height-radius);
        this.quadraticCurveTo(params.sx+width, params.sy+height, params.sx+width-radius, params.sy+height);
        this.lineTo(params.sx+radius, params.sy+height);
        this.quadraticCurveTo(params.sx, params.sy+height, params.sx, params.sy+height-radius);
        this.lineTo(params.sx, params.sy+radius);
        this.quadraticCurveTo(params.sx, params.sy, params.sx+radius, params.sy);
		this.restore();

		return this;
    }

	/**
	 * Fills a new rounded rectangle onto the canvas.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} width The width
	 * @param {float} height The height
	 * @param {float} radius The radius of the corners
	 * @param {string} align The align definition, see ALIGN
	 * @param {float} rotation Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.fillRoundedRect = function(x, y, width, height, radius, align, rotation){
		this.beginPath();
		this.roundedRect(x, y, width, height, radius, align, rotation);
		this.closePath();
		this.fill();

		return this;
    }

	/**
	 * Strokes a new rounded rectangle onto the canvas.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} width The width
	 * @param {float} height The height
	 * @param {float} radius The radius of the corners
	 * @param {string} align The align definition, see ALIGN
	 * @param {float} rotation Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.strokeRoundedRect = function(x, y, width, height, radius, align, rotation){
		this.beginPath();
		this.roundedRect(x, y, width, height, radius, align, rotation);
		this.closePath();
		this.stroke();

		return this;
    }

	/**
	 * Adds a line subpath to current path.
	 *
	 * @param {float} x1 The start x-coordinate
	 * @param {float} y1 The start y-coordinate
	 * @param {float} x2 The end x-coordinate
	 * @param {float} y2 The end y-coordinate
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.line = function(x1, y1, x2, y2) {
        this.moveTo(x1, y1);
        this.lineTo(x2, y2);

		return this;
    }

	/**
	 * Strokes a line.
	 *
	 * @param {float} x1 The start x-coordinate
	 * @param {float} y1 The start y-coordinate
	 * @param {float} x2 The end x-coordinate
	 * @param {float} y2 The end y-coordinate
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.strokeLine = function(x1, y1, x2, y2) {
		this.beginPath();
		this.line(x1, y1, x2, y2);
		this.stroke();

		return this;
	}

	/**
	 * Draws an arc with given parameters and add it to current path.
	 *
	 * If the context has any subpaths, then the method must add a straight line from the last point
	 * in the subpath to the start point of the arc. In any case, it must draw the arc between the
	 * start point of the arc and the end point of the arc, and add the start and end points of the
	 * arc to the subpath. The arc and its start and end points are defined as follows:
	 *
	 * Consider a circle that has its origin at (x, y) and that has radius radius. The points at
	 * startAngle and endAngle along this circle's circumference, measured in radians clockwise
	 * from the positive x-axis, are the start and end points respectively.
	 *
	 * If the anticlockwise argument is omitted or false and endAngle-startAngle is equal to or
	 * greater than 2π, or, if the anticlockwise argument is true and startAngle-endAngle is equal
	 * to or greater than 2π, then the arc is the whole circumference of this circle.
	 *
	 * Otherwise, the arc is the path along the circumference of this circle from the start point
	 * to the end point, going anti-clockwise if the anticlockwise argument is true, and clockwise
	 * otherwise. Since the points are on the circle, as opposed to being simply angles from zero,
	 * the arc can never cover an angle greater than 2π radians. If the two points are the same,
	 * or if the radius is zero, then the arc is defined as being of zero length in both directions.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} radius Arc radius
	 * @param {float} startAngle Arc start angle in degrees, use rad() to convert from radians
	 * @param {float} endAngle Arc end angle in degrees, use rad() to convert from radians
	 * @param {boolean} [anticlockwise] Should the arc be drawn counter-clockwise
	 * @param {string} [align] The align definition, see ALIGN
	 * @param {float} [rotation] Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.arc = function(x, y, radius, startAngle, endAngle, anticlockwise, align, rotation) {
		var params = this.resolveRenderParameters(x, y, radius * 2.0, radius * 2.0, align, rotation);

		this.save();
        this.translate(params.tx + radius, params.ty + radius);
        if (params.r != 0) this.rotate(params.r * (Math.PI / 180.0));
        this.c.arc(params.sx, params.sy, radius, startAngle * (Math.PI / 180.0), endAngle * (Math.PI / 180.0), anticlockwise);
        this.restore();

		return this;
	}

	/**
	 * Fills an arc onto the canvas.
	 *
	 * If the context has any subpaths, then the method must add a straight line from the last point
	 * in the subpath to the start point of the arc. In any case, it must draw the arc between the
	 * start point of the arc and the end point of the arc, and add the start and end points of the
	 * arc to the subpath. The arc and its start and end points are defined as follows:
	 *
	 * Consider a circle that has its origin at (x, y) and that has radius radius. The points at
	 * startAngle and endAngle along this circle's circumference, measured in radians clockwise
	 * from the positive x-axis, are the start and end points respectively.
	 *
	 * If the anticlockwise argument is omitted or false and endAngle-startAngle is equal to or
	 * greater than 2π, or, if the anticlockwise argument is true and startAngle-endAngle is equal
	 * to or greater than 2π, then the arc is the whole circumference of this circle.
	 *
	 * Otherwise, the arc is the path along the circumference of this circle from the start point
	 * to the end point, going anti-clockwise if the anticlockwise argument is true, and clockwise
	 * otherwise. Since the points are on the circle, as opposed to being simply angles from zero,
	 * the arc can never cover an angle greater than 2π radians. If the two points are the same,
	 * or if the radius is zero, then the arc is defined as being of zero length in both directions.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} radius Arc radius
	 * @param {float} startAngle Arc start angle in degrees, use rad() to convert from radians
	 * @param {float} endAngle Arc end angle in degrees, use rad() to convert from radians
	 * @param {boolean} [anticlockwise] Should the arc be drawn counter-clockwise
	 * @param {string} [align] The align definition, see ALIGN
	 * @param {float} [rotation] Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.fillArc = function(x, y, radius, startAngle, endAngle, anticlockwise, align, rotation) {
		var params = this.resolveRenderParameters(x, y, radius * 2.0, radius * 2.0, align, rotation);

		this.save();
        this.translate(params.tx + radius, params.ty + radius);
        if (params.r != 0) this.rotate(params.r * (Math.PI / 180.0));
        this.beginPath();
        this.c.arc(params.sx, params.sy, radius, startAngle * (Math.PI / 180.0), endAngle * (Math.PI / 180.0), anticlockwise);
        this.fill();
        this.restore();

		return this;
	}

	/**
	 * Strokes an arc onto the canvas.
	 *
	 * If the context has any subpaths, then the method must add a straight line from the last point
	 * in the subpath to the start point of the arc. In any case, it must draw the arc between the
	 * start point of the arc and the end point of the arc, and add the start and end points of the
	 * arc to the subpath. The arc and its start and end points are defined as follows:
	 *
	 * Consider a circle that has its origin at (x, y) and that has radius radius. The points at
	 * startAngle and endAngle along this circle's circumference, measured in radians clockwise
	 * from the positive x-axis, are the start and end points respectively.
	 *
	 * If the anticlockwise argument is omitted or false and endAngle-startAngle is equal to or
	 * greater than 2π, or, if the anticlockwise argument is true and startAngle-endAngle is equal
	 * to or greater than 2π, then the arc is the whole circumference of this circle.
	 *
	 * Otherwise, the arc is the path along the circumference of this circle from the start point
	 * to the end point, going anti-clockwise if the anticlockwise argument is true, and clockwise
	 * otherwise. Since the points are on the circle, as opposed to being simply angles from zero,
	 * the arc can never cover an angle greater than 2π radians. If the two points are the same,
	 * or if the radius is zero, then the arc is defined as being of zero length in both directions.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} radius Arc radius
	 * @param {float} startAngle Arc start angle in degrees, use rad() to convert from radians
	 * @param {float} endAngle Arc end angle in degrees, use rad() to convert from radians
	 * @param {boolean} [anticlockwise] Should the arc be drawn counter-clockwise
	 * @param {boolean} [close] Should the subpath be closed first
	 * @param {string} [align] The align definition, see ALIGN
	 * @param {float} [rotation] Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.strokeArc = function(x, y, radius, startAngle, endAngle, anticlockwise, close, align, rotation) {
		close = close || false;
		var params = this.resolveRenderParameters(x, y, radius * 2.0, radius * 2.0, align, rotation);

		this.save();
        this.translate(params.tx + radius, params.ty + radius);
        if (params.r != 0) this.rotate(params.r * (Math.PI / 180.0));
        this.beginPath();
        this.c.arc(params.sx, params.sy, radius, startAngle * (Math.PI / 180.0), endAngle * (Math.PI / 180.0), anticlockwise);
		if (close) this.closePath();
        this.stroke();
        this.restore();

		return this;
    }

	/**
	 * Adds a circle subpath.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} radius Circle radius
	 * @param {string} [align] The align definition, see ALIGN
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.circle = function(x, y, radius, align) {
		this.arc(x, y, radius, 0, 360, false, align);

        return this;
    }

	/**
	 * Fills a circle onto the canvas.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} radius Circle radius
	 * @param {string} [align] The align definition, see ALIGN
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.fillCircle = function(x, y, radius, align) {
        this.fillArc(x, y, radius, 0, 360, false, align);

        return this;
    }

	/**
	 * Strokes a circle onto the canvas.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} radius Circle radius
	 * @param {string} [align] The align definition, see ALIGN
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.strokeCircle = function(x, y, radius, align) {
        this.strokeArc(x, y, radius, 0, 360, false, true, align);

        return this;
    }
	
	/**
	 * Adds an ellipse subpath.
	 *
	 * Based on: http://webreflection.blogspot.com/2009/01/ellipse-and-circle-for-canvas-2d.html
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} width Ellipse width
	 * @param {float} height Ellipse height
	 * @param {string} [align] The align definition, see ALIGN
	 * @param {float} [rotation] Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.ellipse = function(x, y, width, height, align, rotation) {
		var params = this.resolveRenderParameters(x, y, width, height, align, rotation);
        
        var hB = (width / 2) * .5522848,
            vB = (height / 2) * .5522848,
            eX = params.sx + width,
            eY = params.sy + height,
            mX = params.sx + width / 2,
            mY = params.sy + height / 2;

        this.save();
        this.translate(params.tx, params.ty);
        if (params.r != 0) this.rotate(params.r * (Math.PI / 180.0));
        this.moveTo(params.sx, mY);
        this.bezierCurveTo(params.sx, mY - vB, mX - hB, params.sy, mX, params.sy);
        this.bezierCurveTo(mX + hB, params.sy, eX, mY - vB, eX, mY);
        this.bezierCurveTo(eX, mY + vB, mX + hB, eY, mX, eY);
        this.bezierCurveTo(mX - hB, eY, params.sx, mY + vB, params.sx, mY);
        this.restore();

        return this;
    }

	/**
	 * Fills an ellipse onto the canvas.
	 *
	 * Based on: http://webreflection.blogspot.com/2009/01/ellipse-and-circle-for-canvas-2d.html
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} width Ellipse width
	 * @param {float} height Ellipse height
	 * @param {string} [align] The align definition, see ALIGN
	 * @param {float} [rotation] Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.fillEllipse = function(x, y, width, height, align, rotation){
        var params = this.resolveRenderParameters(x, y, width, height, align, rotation);

        var hB = (width / 2) * .5522848,
            vB = (height / 2) * .5522848,
            eX = params.sx + width,
            eY = params.sy + height,
            mX = params.sx + width / 2,
            mY = params.sy + height / 2;

        this.save();
        this.translate(params.tx, params.ty);
        if (params.r != 0) this.rotate(params.r * (Math.PI / 180.0));
		this.beginPath();
        this.moveTo(params.sx, mY);
        this.bezierCurveTo(params.sx, mY - vB, mX - hB, params.sy, mX, params.sy);
        this.bezierCurveTo(mX + hB, params.sy, eX, mY - vB, eX, mY);
        this.bezierCurveTo(eX, mY + vB, mX + hB, eY, mX, eY);
        this.bezierCurveTo(mX - hB, eY, params.sx, mY + vB, params.sx, mY);
		this.closePath();
		this.fill();
        this.restore();

        return this;
    }

	/**
	 * Strokes an ellipse onto the canvas.
	 *
	 * Based on: http://webreflection.blogspot.com/2009/01/ellipse-and-circle-for-canvas-2d.html
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} width Ellipse width
	 * @param {float} height Ellipse height
	 * @param {string} [align] The align definition, see ALIGN
	 * @param {float} [rotation] Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.strokeEllipse = function(x, y, width, height, align, rotation) {
        var params = this.resolveRenderParameters(x, y, width, height, align, rotation);

        var hB = (width / 2) * .5522848,
            vB = (height / 2) * .5522848,
            eX = params.sx + width,
            eY = params.sy + height,
            mX = params.sx + width / 2,
            mY = params.sy + height / 2;

        this.save();
        this.translate(params.tx, params.ty);
        if (params.r != 0) this.rotate(params.r * (Math.PI / 180.0));
		this.beginPath();
        this.moveTo(params.sx, mY);
        this.bezierCurveTo(params.sx, mY - vB, mX - hB, params.sy, mX, params.sy);
        this.bezierCurveTo(mX + hB, params.sy, eX, mY - vB, eX, mY);
        this.bezierCurveTo(eX, mY + vB, mX + hB, eY, mX, eY);
        this.bezierCurveTo(mX - hB, eY, params.sx, mY + vB, params.sx, mY);
		this.closePath();
		this.stroke();
        this.restore();

        return this;
    }

	/**
	 * Draws a grid.
	 *
	 * High-level operation to draw a grid onto the canvas using current stroke style.
	 *
	 * @param {float} [xStep] Grid horizontal step, defaults to 50
	 * @param {float} [yStep] Grid vertical step, defaults to 50
	 * @param {float} [x] Grid start x-coordinate, default to 0
	 * @param {float} [y] Grid start y-coordinate, default to 0
	 * @param {float} [width] Grid width, defaults to canvas full width
	 * @param {float} [height] Grid height, defaults to canvas full height
	 * @param {float} [rotation] Rotation in degrees, use rad() to convert from radians
	 * @return {Canvas} Self
	 * @since 1.0
	 */
	this.grid = function(xStep, yStep, x, y, width, height, rotation) {
        xStep = xStep       || 50;
        yStep = yStep       || 50;
        x = x               || 0;
        y = y               || 0;
        width = width       || this.getWidth();
        height = height     || this.getHeight();
        rotation = rotation || 0;

        this.save();
        this.translate(x, y);
        this.rotate(rotation * (Math.PI / 180.0));

        for (var lineX = xStep; lineX < width; lineX += xStep) {
            for (var lineY = yStep; lineY < height; lineY += yStep) {
                this.strokeLine(lineX, 0, lineX, height);
                this.strokeLine(0, lineY, width, lineY);
            }
        }

        this.restore();
    }

	/**
	 * Resolved render parameters based on align and rotation.
	 *
	 * This is used internally to calculate the translation, position, width, height and rotation
	 * of elements.
	 *
	 * @param {float} x The x-coordinate
	 * @param {float} y The y-coordinate
	 * @param {float} width Width
	 * @param {float} height Height
	 * @param {string} [align] The align definition, see ALIGN
	 * @param {float} [rotation] Rotation
	 * @return {object} Object containing the calculated properties
	 * @since 1.0
	 * @private
	 */
	this.resolveRenderParameters = function(x, y, width, height, align, rotation) {
		align = align || ALIGN.LEFT.TOP;
		rotation = rotation || 0;

		var aligns = align.split('-');

		var useTranslationX = x;
		var useTranslationY = y;
		var useStartX = 0;
		var useStartY = 0;
		var useWidth = width;
		var useHeight = height;

		if (aligns[0] == 'center') {
			useStartX = -width / 2.0;
		} else if (aligns[0] == 'right') {
			useStartX = -width;
		}

		if (aligns[1] == 'middle') {
			useStartY = -height / 2.0;
			//useTranslationY = y - height / 2.0;
		} else if (aligns[1] == 'bottom') {
			useTranslationY = y - height;
		}

		return {
			tx: useTranslationX,
			ty: useTranslationY,
			sx: useStartX,
			sy: useStartY,
			w: useWidth,
			h: useHeight,
			r: rotation
		};
	}

    /**
	 * Default error handler, just alerts the error.
	 *
	 * Replace this with your own for better error handling, use setErrorHandler() for that.
	 *
	 * Note that the error handling is quite lean, the parameters passed to various drawing methods
	 * are not verified.
	 *
	 * @param {string} message The message of the error
	 * @return {void}
	 * @since 1.0
	 */
    this.errorHandler = function(message) {
        alert('Canvas error: "' + message + '"');
    }

	/**
	 * Sets the new error handler to use.
	 *
	 * The error handler will get just the error message as first argument. It's a good idea to
	 * replace the default error handler as it will just alert the message that is not very useful
	 * for users.
	 *
	 * You can set it to null to ignore errors.
	 *
	 * @param {function} errorHandler The error handler callback to use
	 * @return {Canvas} Self
	 * @since 1.0
	 */
    this.setErrorHandler = function(errorHandler) {
		if (typeof(errorHandler) == 'function' || errorHandler == null) {
			this.errorHandler = errorHandler;
		} else {
			this.handleError('Trying to set invalid error handler, a function expected but got a ' + typeof(errorHandler));
		}

		return this;
    }

	/**
	 * Called internally in the event of an error.
	 *
	 * You can set the callback to use by setting error handler using setErrorHandler().
	 *
	 * @param {string} message Error message
	 * @return {void}
	 * @since 1.0
	 * @private
	 */
    this.handleError = function(message) {
        if (typeof(this.errorHandler) == 'function') {
            this.errorHandler(message);
        }
    }

    // auto-initiate the canvas
    this.init();
}

/**
 * Converts radians to degrees, useful for drawing calls that expect degrees.
 *
 * @param {float} radians Angle in radians to convert to degrees
 * @return {float} The angle in degrees
 * @since 1.0
 */
var rad = function(radians) {
	return radians * 180 / Math.PI;
}

/**
 * The cap style constants, use for lineCap()
 *
 * @type object
 * @since 1.0
 */
var CAP = {
	ROUND: 'round',
	SQUARE : 'square',
	BUTT : 'butt'
};

/**
 * The line join style constants, use for lineJoin() and strokeStyle().
 *
 * @type object
 * @since 1.0
 */
var JOIN = {
	BEVEL : 'bevel',
	ROUND : 'round',
	MITER : 'miter'
};

/**
 * The align constants, use for everything using aligning (shapes, text).
 *
 * You can use the text values directly if you like.
 *
 * Note that some of these values are valid only for texts (HANGING, ALPHABETIC, IDEOGRAPHIC and START, END).
 *
 * @type object
 * @since 1.0
 */
var ALIGN = {
	LEFT : {
		TOP : 'left-top',
		MIDDLE : 'left-middle',
		BOTTOM : 'left-bottom',
		HANGING : 'left-hanging', // text only
		ALPHABETIC : 'left-alphabetic', // text only
		IDEOGRAPHIC : 'left-ideographic' // text only
	},
	CENTER : {
		TOP : 'center-top',
		MIDDLE : 'center-middle',
		BOTTOM : 'center-bottom',
		HANGING : 'center-hanging', // text only
		ALPHABETIC : 'center-alphabetic', // text only
		IDEOGRAPHIC : 'center-ideographic' // text only
	},
	RIGHT : {
		TOP : 'right-top',
		MIDDLE : 'right-middle',
		BOTTOM : 'right-bottom',
		HANGING : 'right-hanging', // text only
		ALPHABETIC : 'right-alphabetic', // text only
		IDEOGRAPHIC : 'right-ideographic' // text only
	},
	START : { // text only
		TOP : 'start-top',
		MIDDLE : 'start-middle',
		BOTTOM : 'start-bottom',
		HANGING : 'start-hanging',
		ALPHABETIC : 'start-alphabetic',
		IDEOGRAPHIC : 'start-ideographic'
	},
	END : { // text only
		TOP : 'end-top',
		MIDDLE : 'end-middle',
		BOTTOM : 'end-bottom',
		HANGING : 'end-hanging',
		ALPHABETIC : 'end-alphabetic',
		IDEOGRAPHIC : 'end-ideographic'
	}
};

/**
 * The global composite operations constants. Use for setCompositeOperation(), beginComposite().
 *
 * @type object
 * @since 1.0
 */
var OP = {
	SOURCE_OVER      : 'source-over',
	SOURCE_IN        : 'source-in',
	SOURCE_OUT       : 'source-out',
	SOURCE_ATOP      : 'source-atop',
	DESTINATION_OVER : 'destination-over',
	DESTINATION_IN   : 'destination-in',
	DESTINATION_OUT  : 'destination-out',
	DESTINATION_ATOP : 'destination-atop',
	LIGHTER          : 'lighter',
	COPY             : 'copy',
	XOR              : 'xor'
};

/**
 * Keyboard keycode constants to make identifying keys simple.
 *
 * Use for key press callbacks and kb.isDown() method.
 *
 * @type object
 * @since 1.0
 */
var KC = {
    CANCEL: 3,
    HELP: 6,
    BACK_SPACE: 8,
    TAB: 9,
    CLEAR: 12,
    RETURN: 13,
    ENTER: 14,
    SHIFT: 16,
    CONTROL: 17,
    ALT: 18,
    PAUSE: 19,
    CAPS_LOCK: 20,
    ESCAPE: 27,
    SPACE: 32,
    PAGE_UP: 33,
    PAGE_DOWN: 34,
    END: 35,
    HOME: 36,
    LEFT: 37,
    UP: 38,
    RIGHT: 39,
    DOWN: 40,
    PRINTSCREEN: 44,
    INSERT: 45,
    DELETE: 46,
    0: 48,
    1: 49,
    2: 50,
    3: 51,
    4: 52,
    5: 53,
    6: 54,
    7: 55,
    8: 56,
    9: 57,
    SEMICOLON: 59,
    EQUALS: 61,
    A: 65,
    B: 66,
    C: 67,
    D: 68,
    E: 69,
    F: 70,
    G: 71,
    H: 72,
    I: 73,
    J: 74,
    K: 75,
    L: 76,
    M: 77,
    N: 78,
    O: 79,
    P: 80,
    Q: 81,
    R: 82,
    S: 83,
    T: 84,
    U: 85,
    V: 86,
    W: 87,
    X: 88,
    Y: 89,
    Z: 90,
    CONTEXT_MENU: 93,
    NUMPAD0: 96,
    NUMPAD1: 97,
    NUMPAD2: 98,
    NUMPAD3: 99,
    NUMPAD4: 100,
    NUMPAD5: 101,
    NUMPAD6: 102,
    NUMPAD7: 103,
    NUMPAD8: 104,
    NUMPAD9: 105,
    MULTIPLY: 106,
    ADD: 107,
    SEPARATOR: 108,
    SUBTRACT: 109,
    DECIMAL: 110,
    DIVIDE: 111,
    F1: 112,
    F2: 113,
    F3: 114,
    F4: 115,
    F5: 116,
    F6: 117,
    F7: 118,
    F8: 119,
    F9: 120,
    F10: 121,
    F11: 122,
    F12: 123,
    F13: 124,
    F14: 125,
    F15: 126,
    F16: 127,
    F17: 128,
    F18: 129,
    F19: 130,
    F20: 131,
    F21: 132,
    F22: 133,
    F23: 134,
    F24: 135,
    NUM_LOCK: 144,
    SCROLL_LOCK: 145,
    COMMA: 188,
    PERIOD: 190,
    SLASH: 191,
    BACK_QUOTE: 192,
    OPEN_BRACKET: 219,
    BACK_SLASH: 220,
    CLOSE_BRACKET: 221,
    QUOTE: 222,
    META: 224
};