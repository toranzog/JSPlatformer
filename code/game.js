var actorChars = {
	"@": Player,
	"o": Coin,
	"=": Lava, "|": Lava, "v": Lava ,
	"g": Gem 
};

function Level(plan) {
	this.width = plan[0].length;
	
	this.height = plan.length;

	this.grid = [];

	this.actors = [];

	for (var y = 0; y < this.height; y++) {
		var line = plan[y], gridLine = [];

		for (var x = 0; x < this.width; x++) {
			
			var ch = line[x], fieldType = null;
			var Actor = actorChars[ch];
			
			if (Actor) {
				
				this.actors.push(new Actor(new Vector(x, y), ch));
			}
				
			else if (ch == "x") {
				fieldType = "wall";
			}
				
			else if (ch == "!") {
				fieldType = "lava";
			}
			
			else if (ch == "a") {
				fieldType = "portalIn";
			}
			

			gridLine.push(fieldType);
			
		}
		
		this.grid.push(gridLine);
		
	}

	this.player = this.actors.filter(function(actor) {
		return actor.type == "player";
	})[0];
}

Level.prototype.isFinished = function() {
	return this.status != null && this.finishDelay < 0;
};

function Vector(x, y) {
	this.x = x; this.y = y;
}

Vector.prototype.plus = function(other) {
	return new Vector(this.x + other.x, this.y + other.y);
};

Vector.prototype.times = function(factor) {
	return new Vector(this.x * factor, this.y * factor);
};


function Player(pos) {
	this.pos = pos.plus(new Vector(0, -0.5));
	this.size = new Vector(0.8, 1.5);
	this.speed = new Vector(0, 0);
}

Player.prototype.type = "player";

function Coin(pos) {
	this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
	this.size = new Vector(0.6, 0.6);
	
	this.wobble = Math.random() * Math.PI * 2;
}

Coin.prototype.type = "coin";

function Gem(pos) {
	this.basePos = this.pos = pos.plus(new Vector(0.2, 0.1));
	this.size = new Vector(0.6, 0.6);
	
	this.wobble = Math.random() * Math.PI * 2;
}

Gem.prototype.type = "gem";

function Lava(pos, ch) {
	this.pos = pos;
	this.size = new Vector(1, 1);
	if (ch == "=") {
		
		// Horizontal lava
		this.speed = new Vector(2, 0);
	}
	
	else if (ch == "|") {
		
		// Vertical lava
		this.speed = new Vector(0, 2);
	}
	
	else if (ch == "v") {
		
		// Drip lava. Repeat back to this pos.
		this.speed = new Vector(0, 3);
		this.repeatPos = pos;
	}
}

Lava.prototype.type = "lava";

function elt(name, className) {
	var elt = document.createElement(name);
	if (className) elt.className = className;
	return elt;
}

// Main display class. We keep track of the scroll window using it.
function DOMDisplay(parent, level) {

	// this.wrap corresponds to a div created with class of "game"
	this.wrap = parent.appendChild(elt("div", "game"));
	this.level = level;

	this.wrap.appendChild(this.drawBackground());

	this.actorLayer = null;

  this.drawFrame();
}

var scale = 20;

DOMDisplay.prototype.drawBackground = function() {
	var table = elt("table", "background");
	table.style.width = this.level.width * scale + "px";

	this.level.grid.forEach(function(row) {
		var rowElt = table.appendChild(elt("tr"));
		rowElt.style.height = scale + "px";
		row.forEach(function(type) {
			rowElt.appendChild(elt("td", type));
		});
	});
	
	return table;
};

// All actors are above (in front of) background elements.  
DOMDisplay.prototype.drawActors = function() {
	
	// Create a new container div for actor dom elements
	var wrap = elt("div");

	// Create a new element for each actor each frame
	this.level.actors.forEach(function(actor) {
		var rect = wrap.appendChild(elt("div", "actor " + actor.type));
		rect.style.width = actor.size.x * scale + "px";
		rect.style.height = actor.size.y * scale + "px";
		rect.style.left = actor.pos.x * scale + "px";
		rect.style.top = actor.pos.y * scale + "px";
	});
	
	return wrap;
};

DOMDisplay.prototype.drawFrame = function() {
	if (this.actorLayer)
		this.wrap.removeChild(this.actorLayer);
	this.actorLayer = this.wrap.appendChild(this.drawActors());
	
	// Update the status each time with this.level.status"
	this.wrap.className = "game " + (this.level.status || "");
	this.scrollPlayerIntoView();
};

DOMDisplay.prototype.scrollPlayerIntoView = function() {
	var width = this.wrap.clientWidth;
	var height = this.wrap.clientHeight;

	// We want to keep player at least 1/3 away from side of screen
	var margin = width / 3;

	// The viewport
	var left = this.wrap.scrollLeft, right = left + width;
	var top = this.wrap.scrollTop, bottom = top + height;

	var player = this.level.player;
	
	// Change coordinates from the source to our scaled.
	var center = player.pos.plus(player.size.times(0.5))
				 .times(scale);

	if (center.x < left + margin) {
		this.wrap.scrollLeft = center.x - margin;
	}
	
	else if (center.x > right - margin) {
		this.wrap.scrollLeft = center.x + margin - width;
	}
	
	if (center.y < top + margin) {
		this.wrap.scrollTop = center.y - margin;
	}
	
	else if (center.y > bottom - margin) {
		this.wrap.scrollTop = center.y + margin - height;
	}
};

// Remove the wrap element when clearing the display
// This will be garbage collected
DOMDisplay.prototype.clear = function() {
	this.wrap.parentNode.removeChild(this.wrap);
};

// Return the first obstacle found given a size and position.
Level.prototype.obstacleAt = function(pos, size) {
	
	// Find the "coordinate" of the tile representing left bound
	var xStart = Math.floor(pos.x);
	
	// right bound
	var xEnd = Math.ceil(pos.x + size.x);
	
	// top bound
	var yStart = Math.floor(pos.y);
	
	// Bottom bound
	var yEnd = Math.ceil(pos.y + size.y);

	// Consider the sides and top and bottom of the level as walls
	if (xStart < 0 || xEnd > this.width || yStart < 0) {
		return "wall";
	}
	
	if (yEnd > this.height) {
		return "lava";
	}

	// Check each grid position starting at yStart, xStart for a possible obstacle (non null value)
	for (var y = yStart; y < yEnd; y++) {
		
		for (var x = xStart; x < xEnd; x++) {
			
			var fieldType = this.grid[y][x];
			
			if (fieldType) {
				return fieldType;
			}
		}
	}
};

// Collision detection for actors is handled separately from tiles. 
Level.prototype.actorAt = function(actor) {
	
	// Loop over each actor in our actors list and compare the 
	// boundary boxes for overlaps.
	for (var i = 0; i < this.actors.length; i++) {
		
		var other = this.actors[i];
		
		// if the other actor isn't the acting actor
		if (other != actor &&
			actor.pos.x + actor.size.x > other.pos.x &&
			actor.pos.x < other.pos.x + other.size.x &&
			actor.pos.y + actor.size.y > other.pos.y &&
			actor.pos.y < other.pos.y + other.size.y) {
			
			// check if the boundaries overlap by comparing all sides for
			// overlap and return the other actor if found
			return other;
		}
	}
};

// Update simulation each step based on keys & step size
Level.prototype.animate = function(step, keys) {
	
	// Have game continue past point of win or loss
	if (this.status != null) {
		this.finishDelay -= step;
	}

	// Ensure each is maximum 100 milliseconds 
	while (step > 0) {
		var thisStep = Math.min(step, maxStep);
		this.actors.forEach(function(actor) {
			// Allow each actor to act on their surroundings
			actor.act(thisStep, this, keys);
		}, this);
		
		// Do this by looping across the step size, subtracing either the
		// step itself or 100 milliseconds
		step -= thisStep;
	}
};

Lava.prototype.act = function(step, level) {
	
	var newPos = this.pos.plus(this.speed.times(step));
	
	if (!level.obstacleAt(newPos, this.size)) {
		this.pos = newPos;
	}
	
	else if (this.repeatPos) {
		this.pos = this.repeatPos;
	}
	
	else {
		this.speed = this.speed.times(-1);
	}
};


var maxStep = 0.05;

var wobbleSpeed = 8
var wobbleDist = 0.07;

Coin.prototype.act = function(step) {
	this.wobble += step * wobbleSpeed;
	var wobblePos = Math.sin(this.wobble) * wobbleDist;
	this.pos = this.basePos.plus(new Vector(0, wobblePos));
};


Gem.prototype.act = function(step) {
	this.wobble += step * wobbleSpeed;
	var wobblePos = Math.sin(this.wobble) * wobbleDist;
	this.pos = this.basePos.plus(new Vector(0, wobblePos));
};

var playerXSpeed = 7;

Player.prototype.moveX = function(step, level, keys) {
	this.speed.x = 0;
	
	if (keys.left) {
		this.speed.x -= playerXSpeed;
	}
	
	if (keys.right) {
		this.speed.x += playerXSpeed;
	}

	var motion = new Vector(this.speed.x * step, 0);
	
	// Find out where the player character will be in this frame
	var newPos = this.pos.plus(motion);
	
	// Find if there's an obstacle there
	var obstacle = level.obstacleAt(newPos, this.size);
	
	// Handle lava by calling playerTouched
	if (obstacle) {
		level.playerTouched(obstacle);
	}
	
	else {
		// Move if there's not an obstacle there.
		this.pos = newPos;
	}

};

var gravity = 40;
var jumpSpeed = 28;

Player.prototype.moveY = function(step, level, keys) {
	
	// Accelerate player downward (always)
	this.speed.y += step * gravity;;
	var motion = new Vector(0, this.speed.y * step);
	var newPos = this.pos.plus(motion);
	var obstacle = level.obstacleAt(newPos, this.size);
	
	// The floor is also an obstacle -- only allow players to 
	// jump if they are touching some obstacle.
	if (obstacle) {
		if (obstacle == "lava") {
			level.playerTouched(obstacle);
		}
		
		else if (obstacle == "portalIn") {
			this.pos = this.pos.plus(new Vector (15, 0));
		}
    
		else if (keys.up && this.speed.y > 0) {
		  this.speed.y = -jumpSpeed;
		}
		
		else {
		  this.speed.y = 0;
		}
	}
	
	else {
		this.pos = newPos;
	}
};

Player.prototype.act = function(step, level, keys) {
	this.moveX(step, level, keys);
	this.moveY(step, level, keys);

	var otherActor = level.actorAt(this);
	if (otherActor) {
		level.playerTouched(otherActor.type, otherActor);
	}

	// Losing animation
	if (level.status == "lost") {
		this.pos.y += step;
		this.size.y -= step;
	}
};

var gemCounter = 0;

Level.prototype.playerTouched = function(type, actor) {

	// If the player touches lava and the player hasn't won player loses
	if (type == "lava" && this.status == null) {
		this.status = "lost";
		this.finishDelay = 1;
	}
	
	else if (type == "coin") {
		this.actors = this.actors.filter(function(other) {
			return other != actor;
		});
		
		// If there aren't any coins left, player wins
		if (!this.actors.some(function(actor) {return actor.type == "coin";})) {
			this.status = "won";
			this.finishDelay = 1;
		}
	}
	
	else if (type == "gem") {
		this.actors = this.actors.filter(function(other) {
			return other != actor;
		});
		
		gemCounter++;
	}
};

// Arrow key codes for readibility
var arrowCodes = {37: "left", 38: "up", 39: "right"};

// Translate the codes pressed from a key event
function trackKeys(codes) {
	var pressed = Object.create(null);

	// alters the current "pressed" array which is returned from this function. 
	// The "pressed" variable persists even after this function terminates
	// That is why we needed to assign it using "Object.create()" as 
	// otherwise it would be garbage collected

	function handler(event) {
		if (codes.hasOwnProperty(event.keyCode)) {
			
			// If the event is keydown, set down to true. Else set to false.
			var down = event.type == "keydown";
			
			pressed[codes[event.keyCode]] = down;
			
			// We don't want the key press to scroll the browser window, 
			// This stops the event from continuing to be processed
			event.preventDefault();
		}
	}
	
	addEventListener("keydown", handler);
	addEventListener("keyup", handler);
	return pressed;
}

// frameFunc is a function called each frame with the parameter "step"
// step is the amount of time since the last call used for animation
function runAnimation(frameFunc) {
	var lastTime = null;
	function frame(time) {
		var stop = false;
		if (lastTime != null) {
			// Set a maximum frame step of 100 milliseconds to prevent
			// having big jumps
			var timeStep = Math.min(time - lastTime, 100) / 1000;
			stop = frameFunc(timeStep) === false;
		}
    
		lastTime = time;
    
		if (!stop) {
			requestAnimationFrame(frame);
		}
	}
	
	requestAnimationFrame(frame);
}

// This assigns the array that will be updated anytime the player
// presses an arrow key. We can access it from anywhere.
var arrows = trackKeys(arrowCodes);

// Organize a single level and begin animation
function runLevel(level, Display, andThen) {
	var display = new Display(document.body, level);

	runAnimation(function(step) {
		// Allow the viewer to scroll the level
		level.animate(step, arrows);
		display.drawFrame(step);
		if (level.isFinished()) {
			
			display.clear();
			
			if (andThen) {
				andThen(level.status);
			}
			
			return false;
		}
	});
}

function runGame(plans, Display) {
	function startLevel(n) {

		runLevel(new Level(plans[n]), Display, function(status) {
			if (status == "lost") {
				if (gemCounter > n) {
					gemCounter -= 1;
				}
				startLevel(n);
			}
			
			else if (n < plans.length - 3) {
				startLevel(n + 1);
				console.log(gemCounter);
			}
			
			else {
				if (gemCounter != 3) {
					startLevel(3);
				}
				
				else {
					startLevel(4);
				}
			}
		});
	}
	
	startLevel(0);
}
