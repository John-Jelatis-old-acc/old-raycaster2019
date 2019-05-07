(function(self) {
	'use strict';
	self.Vector = class {
		constructor(x = 0, y = 0) {
			this.x = x;
			this.y = y;
		}
		add(v = null) {
			if('x' in v)
				this.addX(v.x);
			if('y' in v)
				this.addY(v.y);
		}
		addX(x) { this.x += x;	 }
		addY(y) { this.y += y;	 }
		setX(x) { this.x = x;	 }
		setY(y) { this.y = y;	 }
		getX( ) { return this.x; }
		getY( ) { return this.y; }
	}, self.Wall = class {
		constructor(x = 0, y = 0, w = 0, h = 0, tick = null) {
			this.pos = new self.Vector(x, y);
			this.size = new self.Vector(w, h);
			this.tickCallback = tick;
		}
		tick(walls) {
			if(typeof this.tickCallback !== 'function')
				return;
			let w = walls.clone(),
				i = w.indexOf(this);
			if(i !== -1)
				w.splice(i, 1);
			this.tickCallback(this, w);
		}
		draw(ctx, cvs) {
			ctx.strokeStyle = '#000F';
			ctx.beginPath();
			ctx.moveTo(this.pos.x, this.pos.y);
			ctx.lineTo(this.pos.x + this.size.x, this.pos.y + this.size.y);
			ctx.stroke();
		}
		getIntersection(wall) {
			let x1 = this.pos.getX(), x2 = this.size.getX() + x1,
				x3 = wall.pos.getX(), x4 = wall.size.getX() + x3,
				y1 = this.pos.getY(), y2 = this.size.getY() + y1,
				y3 = wall.pos.getY(), y4 = wall.size.getY() + y3;
			let t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4))
				  / ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4)),
				u = ((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3))
				  / ((x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4));
			if((0 <= u && u <= 1)) {
				return [
					x3 + u * (x4 - x3),
					y3 + u * (y4 - y3)
				];
			} else if((0 <= t && t <= 1)) {
				return [
					x1 + t * (x2 - x1),
					y1 + t * (y2 - y1)
				];
			}
			
			return null;
		}
	}, self.Ray = class extends Wall {
		constructor(x = 0, y = 0, camRot = 0, addRot = 0, addRot2 = 0, n = 1) {
			let w = (2 ** 6) - 1,
				addedRot = (addRot - addRot2) * Math.PI / 180;
			super(x, y, w * Math.cos(camRot + addedRot), w * Math.sin(camRot + addedRot));
			this.w = w;
			this.addedRot = addedRot;
			this.numberID = addRot + addRot2 / 2;
			this.drawWidth = n;
			this.active = true;
		}
		draw(ctx, ctx3d, cvs, cvs3d) {
			super.draw(ctx, cvs);
			let {nearest, nearestDist, nearestIntersection, numberID} = this;
			ctx3d.fillStyle = 'rgb(' + ([
				255 - nearestDist,
				255 - nearestDist,
				255 - nearestDist
			]).join(',') + ')';
			let e = (cvs3d.width - 2 * numberID * this.drawWidth) / cvs3d.width,
				p = self.FOV * Math.sin(e * Math.PI);
			ctx3d.fillRect(cvs3d.width * e, p + nearestDist, this.drawWidth * 2, cvs3d.height - nearestDist);
		}
		update(cam = null, walls = []) {
			this.pos.setX(cam.x);
			this.pos.setY(cam.y);
			this.size.setX(this.w * Math.sin(cam.r + this.addedRot));
			this.size.setY(this.w * Math.cos(cam.r + this.addedRot));
			let x = this.pos.getX(),
				y = this.pos.getY();
			let w = this.size.getX(),
				h = this.size.getY();
			let nearest = null,
				nearestDist = -1,
				nearestIntersection = null;
			walls.forEach(wall => {
				let intersection = wall.getIntersection(this);
				if(intersection == null)
					return;
				let slopeThis = this.size.getY() / this.size.getX(),
					slopeThat = wall.size.getY() / wall.size.getX(),
					xMultThis = intersection[0] - this.pos.getX(),
					xMultThat = intersection[0] - wall.pos.getX(),
					confirmed = Math.round(this.pos.getY() + xMultThis * slopeThis) == Math.round(intersection[1])
							&& (slopeThat == Infinity || Math.round(wall.pos.getY() + xMultThat * slopeThat) == Math.round(intersection[1]));
				let cos = Math.cos(cam.r + this.addedRot),
					sin = Math.sin(cam.r + this.addedRot);
				if(confirmed && (
					(sin <= 0 && xMultThis <= 0) || (sin >= 0 && xMultThis >= 0)
				)) {
					let dist = self.Pythagorean.getC(
						(x) - (intersection[0]),
						(y) - (intersection[1])
					);
					if(dist < nearestDist || nearestDist === -1) {
						nearestDist = dist;
						nearest = wall;
						nearestIntersection = intersection;
					}
				}
			}, this);
			if(nearest != null) {
				self.context2d.fillStyle = '#0009';
				self.context2d.fillRect(nearestIntersection[0] - 3, nearestIntersection[1] - 3, 6, 6);
				this.size.setX(nearestIntersection[0] - x);
				this.size.setY(nearestIntersection[1] - y);
				this.nearest = nearest;
				this.nearestDist = nearestDist;
				this.nearestIntersection = nearestIntersection;
				this.active = true;
				return;
			}
			this.active = false;
		}
	};
						  
	self.Pythagorean = {
		'getC': (a, b) => Math.sqrt(a ** 2 + b ** 2),
		'getB': (a, c) => Math.sqrt(c ** 2 - a ** 2)
	};
	
	self.FOV = 60;
	
	self.canvas2d = document.createElement('canvas');
	self.context2d = self.canvas2d.getContext('2d');
	
	self.canvas2d.addEventListener('click', e => {
		if(e.ctrlKey)
			self.canvas2d.requestFullscreen();
	});
	
	self.mouseInf = {
		'x': null,
		'y': null,
		'ex': null,
		'ey': null,
		'wallID': null
	};
	self.canvas2d.addEventListener('mousedown', e => {
		self.mouseInf.x = e.pageX;
		self.mouseInf.y = e.pageY;
		self.mouseInf.wallID = self.walls.length - 0;
		self.walls.push(new self.Wall(self.mouseInf.x, self.mouseInf.y, 0, 0));
	});
	self.canvas2d.addEventListener('mousemove', e => {
		if(!(self.mouseInf.wallID in self.walls))
			return;
		self.walls[self.mouseInf.wallID].size.x = self.mouseInf.ex - self.mouseInf.x;
		self.walls[self.mouseInf.wallID].size.y = self.mouseInf.ey - self.mouseInf.y;
		self.mouseInf.ex = e.pageX;
		self.mouseInf.ey = e.pageY;
	});
	self.canvas2d.addEventListener('mouseup', e => {
		if(!(self.mouseInf.wallID in self.walls))
			return;
		self.walls[self.mouseInf.wallID].size.x = self.mouseInf.ex - self.mouseInf.x;
		self.walls[self.mouseInf.wallID].size.y = self.mouseInf.ey - self.mouseInf.y;
		self.mouseInf.wallID = null;
	});
	
	self.canvas2d.addEventListener('touchstart', e => {
		e.preventDefault();
		self.mouseInf.x = e.changedTouches[0].pageX;
		self.mouseInf.y = e.changedTouches[0].pageY;
		self.mouseInf.wallID = self.walls.length - 0;
		self.walls.push(new self.Wall(self.mouseInf.x, self.mouseInf.y, 0, 0));
	});
	self.canvas2d.addEventListener('touchmove', e => {
		e.preventDefault();
		if(!(self.mouseInf.wallID in self.walls))
			return;
		self.mouseInf.ex = e.changedTouches[0].pageX;
		self.mouseInf.ey = e.changedTouches[0].pageY;
		self.walls[self.mouseInf.wallID].size.x = self.mouseInf.ex - self.mouseInf.x;
		self.walls[self.mouseInf.wallID].size.y = self.mouseInf.ey - self.mouseInf.y;
	});
	self.canvas2d.addEventListener('touchend', e => {
		e.preventDefault();
		if(!(self.mouseInf.wallID in self.walls))
			return;
		self.walls[self.mouseInf.wallID].size.x = self.mouseInf.ex - self.mouseInf.x;
		self.walls[self.mouseInf.wallID].size.y = self.mouseInf.ey - self.mouseInf.y;
		self.mouseInf.wallID = null;
	});
	
	self.canvas2d.width = 480;
	self.canvas2d.height = 360;

	self.canvas3d = document.createElement('canvas');
	self.context3d = self.canvas3d.getContext('2d');
	
	self.canvas3d.addEventListener('click', e => {
		if(e.ctrlKey)
			self.canvas3d.requestFullscreen();
	});
	
	self.canvas3d.width = 720;
	self.canvas3d.height = 360;
	
	let p = 16;
	self.walls = [
		new self.Wall(
			p,
			p,
			self.canvas2d.width - p * 2,
			0
		),
		new self.Wall(
			p,
			p,
			0,
			self.canvas2d.height - p * 2
		),
		new self.Wall(
			p,
			self.canvas2d.height - p,
			self.canvas2d.width - p * 2,
			0
		),
		new self.Wall(
			self.canvas2d.width - p,
			p,
			0,
			self.canvas2d.height - p * 2
		)
	], self.rays = [];
	
	self.camera = {
		'x': self.canvas2d.width / 2,
		'y': self.canvas2d.height / 2,
		'r': 0
	};
	self.keys = {
		'up': false,
		'down': false,
		'left': false,
		'right': false
	};
	
	self.frame = function() {
		self.context2d.clearRect(0, 0, self.canvas2d.width, self.canvas2d.height);
		self.context3d.clearRect(0, 0, self.canvas3d.width, self.canvas3d.height);
		
		self.walls.forEach(wall => {
			wall.tick(self.walls);
			wall.draw(self.context2d, self.canvas2d);
		});
		
		let rays = 0;
		self.rays.forEach(ray => {
			ray.update(self.camera, self.walls);
		});
		self.rays.sort((a, b) => {
			if(!a.active || !b.active)
				return 42;
			return b.nearestDist - a.nearestDist;
		});
		self.rays.forEach(ray => {
			if(ray.active) {
				ray.draw(self.context2d, self.context3d, self.canvas2d, self.canvas3d);
				rays++;
			}
		});
		
		self.context2d.fillStyle = '#09F9';
		self.context2d.beginPath();
		self.context2d.arc(
			self.camera.x - 12 * Math.sin(self.camera.r),
			self.camera.y - 12 * Math.cos(self.camera.r),
			12, 0, Math.PI * 2, false
		);
		self.context2d.fill();
		self.context2d.beginPath();
		self.context2d.arc(
			self.camera.x + Math.sin(self.camera.r),
			self.camera.y + Math.cos(self.camera.r),
			8, 0, Math.PI * 2, false
		);
		self.context2d.fill();
		self.context2d.beginPath();
		self.context2d.arc(
			self.camera.x + 8 * Math.sin(self.camera.r),
			self.camera.y + 8 * Math.cos(self.camera.r),
			4, 0, Math.PI * 2, false
		);
		self.context2d.fill();
		
		if(self.keys.up) {
			self.camera.x += 3 * Math.sin(self.camera.r);
			self.camera.y += 3 * Math.cos(self.camera.r);
		}
		if(self.keys.down) {
			self.camera.x -= 3 * Math.sin(self.camera.r);
			self.camera.y -= 3 * Math.cos(self.camera.r);
		}
		if(self.keys.left) {
			self.camera.r += 0.025;
		}
		if(self.keys.right) {
			self.camera.r -= 0.025;
		}
		
		requestAnimationFrame(self.frame);
	};
	
	self.addEventListener('keydown', function(e) {
		switch(e.key) {
			case 'ArrowUp':
			case 'W':
			case 'w':
				self.keys.up = true;
				break;
			case 'ArrowDown':
			case 'S':
			case 's':
				self.keys.down = true;
				break;
			case 'ArrowLeft':
			case 'A':
			case 'a':
				self.keys.left = true;
				break;
			case 'ArrowRight':
			case 'D':
			case 'd':
				self.keys.right = true;
				break;
		}
	});
	self.addEventListener('keyup', function(e) {
		switch(e.key) {
			case 'ArrowUp':
			case 'W':
			case 'w':
				self.keys.up = false;
				break;
			case 'ArrowDown':
			case 'S':
			case 's':
				self.keys.down = false;
				break;
			case 'ArrowLeft':
			case 'A':
			case 'a':
				self.keys.left = false;
				break;
			case 'ArrowRight':
			case 'D':
			case 'd':
				self.keys.right = false;
				break;
		}
	});
	self.addEventListener('DOMContentLoaded', function() {
		document.body.appendChild(self.canvas2d);
		document.body.appendChild(self.canvas3d);
		for(let n = 1/6, m = self.FOV, r = 0; r < m; r += n) {
			self.rays.push(new self.Ray(
				self.camera.x, self.camera.y, self.camera.r, r, m/2, 4
			));
		}
		self.frame();
	});
	self.addEventListener('error', function(err) {
		alert(err.message + '\n\t' + err.lineno + '.' + err.colno);
	});
})(this);
