/*\
|*|	
|*|	Signatures (Impakt.nl) 
|*| Copyright 2016 Benjamin Forster
|*|
|*|
|*|	This work is licensed under the Creative Commons 
|*|	Attribution-NonCommercial-ShareAlike 4.0 International License. 
|*|	To view a copy of this license, visit:
|*|	
|*|	http://creativecommons.org/licenses/by-nc-sa/4.0/.
|*|
|*|	Unless required by applicable law or agreed to in writing, software
|*|	distributed under the License is distributed on an "AS IS" BASIS,
|*|	WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
|*|	See the License for the specific language governing permissions and
|*|	limitations under the License.
|*|
\*/

(function(options) {

	"use strict";

	/* 
	 * START WHEN DOM HAS LOADED
	 */
	(function ready(fn) {
			if (document.readyState != 'loading'){
				fn();
			} else {
				document.addEventListener('DOMContentLoaded', fn);
			}
		}) (init);

	/*
	 * SETUP STATE
	 */

	//global variables

	var drawing_width = 600;
	var drawing_height = 600;

	var context;
	var canvas;
	var hidden_context; 
	var hidden_canvas; 

	var step_rate = 1000/30.0;

	var number_of_signatures = 502;
	var signatures = [];

	// state variables

	var aspect_vertical = false;
	var sign = null;
	var running = true;
	var rx, ry; //coordinates in relation to canvas
	var px, py; //previous coordinates in relation to canvas
	var aggitation = 0.0;
	var last_moved = Date.now();
	var last_timestamp = null;

	/*
	 *	Signature Class Definition
	 */

	var Signature = function (image, timestamp, erasure) {
		this.canvas = hidden_canvas;
		this.context = hidden_context;
		this.started = timestamp;
		this.erasure = erasure;
		this.time_to_draw = (erasure)? image.width/5 : image.width * 2* random(1.5,2);
		this.progress = 0;
		this.width = image.width;
		this.height = image.height;
		if(erasure) {
			this.x = rx+random(-100,100);
			this.y = ry+random(-100,100);
			if (this.x <0 ) this.x = 0;
			if (this.y <0 ) this.y = 0;
			if (this.x > drawing_width - this.width ) this.x = drawing_width - this.width;
			if (this.y > drawing_height - this.height ) this.y = drawing_height - this.height;
		} else {
			this.x = random(drawing_width - this.width);
			this.y = random(drawing_height - this.height);
		}
		this.context.drawImage(image,0,0,this.width,this.height);
		this.imageData = this.context.getImageData(0,0,this.width,this.height);
		this.data = this.imageData.data;

		function random (min,max) {
			if(arguments.length>1)
				return Math.floor(min+Math.random()*(max-min));
			else
				return Math.floor(Math.random()*min);
		}
	};

	Signature.prototype.draw_horizontal = function(pixels_data, w, h, offset) {
		for(var i=0; i < w; i++) {
			for(var j=0; j < h; j++) {
				var index = (i+(j*w))*4;
				var tone = this.data[(offset+i+(j*this.width))*4];
				pixels_data[index] -= tone;
				pixels_data[++index] -= tone;
				pixels_data[++index] -= tone;
				pixels_data[++index] += (255-tone);
			}
		}	
	};

	Signature.prototype.draw_erasure = function (pixels_data, w, h, offset) {
		for(var i=0; i < w; i++) {
			for(var j=0; j < h; j++) {
				var index = (i+(j*w))*4;
				var tone = this.data[(offset+i+(j*this.width))*4];
				pixels_data[index+3] -= (255-tone);
			}
		}
	};

	Signature.prototype.draw = function (timestamp,ctx) {
		var progress = (timestamp-this.started) / this.time_to_draw;
		if(progress>1) progress=1;
		//console.log(progress);
		var pw = Math.floor(this.width*this.progress);
		var w = Math.floor(this.width*progress)-pw;
		var h = Math.floor(this.height);
		if(w===0) return;
		var pixels = ctx.getImageData(this.x+pw,this.y,w,h);
		var pixels_data = pixels.data;
		if(this.erasure) {
			this.draw_erasure(pixels_data,w,h,pw);
		} else {
			this.draw_horizontal(pixels_data,w,h,pw);
		}
		ctx.putImageData(pixels,this.x+pw,this.y);
		this.progress = progress;
	};

	Signature.prototype.finished = function() {
		return (this.progress >= 1);
	};

	/*
	 *	Event functions
	 */

	function toggle_running(e) {
		var link = document.getElementById('signatures-title');
		var element = document.getElementById('signatures');
		if(running) {
			canvas.style.opacity = 0;
			running = false;
			link.style.textDecoration ="line-through";
			element.title = "Click title to enable" ;
			document.cookie = "signatures-disabled=true";
		} else {
			context.clearRect(0, 0, canvas.width, canvas.height);
			canvas.style.opacity = 1;
			running = true;
			link.style.textDecoration ="none";
			element.title = "Click title to dismiss";
			document.cookie = "signatures-disabled=false";
		}
		e.preventDefault();
		return false;
	}

	function update_agitate(e) {
		last_moved = Date.now();
		var bound = canvas.getBoundingClientRect();
		rx = ((e.clientX - bound.left) / bound.width) * drawing_width;
		ry = ((e.clientY - bound.top) / bound.height) * drawing_height;
		if(!px) px = rx;
		if(!py) py = ry;
		aggitation += Math.sqrt((px-rx)*(px-rx)+(py-ry)*(py-ry));
		px = rx;
		py = ry;
		//console.log(rx,ry);
	}

	function mouse_move(e) {
		update_agitate(e);
	}

	function touch_move(e) {
		var touches = e.changedTouches;
		for(var i=0; i<touches.length;i++) {
			update_agitate(touches[i]);
		}
	}
	
	function resize(e) {
		//update css to match window;
		if(aspect_vertical !== is_aspect_veritcal()) set_css_width_height(canvas);
		set_font_size();
	}

	function moved_recently() {
		return (Date.now() - last_moved) < 120;
	}

	function set_font_size(el) {
		var title = el || document.getElementById('signatures');
		if(window.innerWidth <= 768 || window.devicePixelRatio > 1 ) {
			title.style.fontSize = '1.6em';
		} else {
			title.style.fontSize = '1em';
		}
	}

	function was_disabled () {
		//console.log(document.cookie.indexOf('signatures-disabled=true;'));
		return (document.cookie.indexOf('signatures-disabled=true;')>=0);
	}

	function supports_canvas() {
		return !!document.createElement('canvas').getContext;
	}

	function is_aspect_veritcal() {
		return window.innerWidth <= window.innerHeight;
	}

	function set_css_width_height(el) {
		if(is_aspect_veritcal()) {
			el.style.width = "80%";
			el.style.maxWidth = "600px";
			el.style.height = "auto";
			aspect_vertical = true;
		} else {
			el.style.height = "80%";
			el.style.maxHeight = "600px";
			el.style.width = "auto";
			aspect_vertical = false;
		}
	}

	function setup_canvases () {
		canvas = document.createElement('canvas');
		canvas.style.display = "block";
		canvas.style.position = "fixed";
		canvas.style.margin = "auto";
		canvas.style.position ="fixed";
		canvas.style.zIndex = 99999999;
		canvas.style.top = 0;
		canvas.style.bottom = 0;
		canvas.style.left = 0;
		canvas.style.right = 0;
		canvas.style.pointerEvents = "none";
		canvas.style.opacity = 1;
		canvas.style.transition = "opacity 1s";
		set_css_width_height(canvas);
		canvas.width = drawing_width;
		canvas.height = drawing_height;

		document.body.appendChild(canvas);

		context = canvas.getContext("2d");
		context.globalCompositeOperation = "multiply";

		hidden_canvas = document.createElement('canvas');
		hidden_canvas.width = drawing_width; // should be widest image width.
		hidden_canvas.height = drawing_height; // should be highest image height.
		hidden_context = hidden_canvas.getContext("2d");

	}

	function setup_gui() {
		var div = document.createElement('div');
		div.id = 'signatures'; 
		div.style.className = "widget-title";
		div.style.position ="fixed";
		div.style.bottom = 0;
		div.style.right=0;
		div.style.cursor = "pointer";
		div.style.width = "100%";
		div.style.background = "rgba(255,255,255,0.8)";
		div.style.borderTop = "medium black solid";
		div.style.textAlign = "right";
		div.style.zIndex = "999999999";
		div.style.fontWeight = 800;
		div.title = (running) ? "Click title to dismiss" : "Click title to enable" ;
		set_font_size(div);
		var toggle = document.createElement('a');
		toggle.id = 'signatures-title';
		toggle.style.cursor = "pointer";
		toggle.style.float = 'right';
		toggle.style.padding = '0.2em 1em';
		toggle.style.fontSize = '1em';
		if(!running) toggle.style.textDecoration ="line-through";
		toggle.innerHTML = "Benjamin Forster, <em>Signatures</em> (2016)";
		div.appendChild(toggle);
		document.body.appendChild(div);
		div.addEventListener('click', toggle_running, false);
	}

	function load_signature(i) {
		var img = new Image();
		img.src = options.image_folder+'/signature-'+i+'.png';
		img.onload = function() { signatures.push(img) ; };
	}

	function init() {
		if(supports_canvas() && window.innerWidth) {
			running = !was_disabled();
			setup_canvases();
			setup_gui();
			for(var i = 0; i< number_of_signatures; i++) load_signature(i);
			document.addEventListener('touchmove', touch_move);
			document.addEventListener('mousemove', mouse_move);
			window.addEventListener('resize',resize);
			window.requestAnimationFrame(loop);
		}
	}

	/*
	 * Main Animation Functions 
	 */

	function loop(timestamp) {
		if(!last_timestamp) last_timestamp=timestamp;
		var timepast = timestamp-last_timestamp;
		var trigger = (timepast > step_rate);
		if(running) {
			if(aggitation>0) {
				aggitation = aggitation / ( 1.0 + (timepast/(step_rate*20))) ;
				if(trigger && aggitation>2)	{
					var intensity = (aggitation-50)/700.0;
					if(intensity<0) intensity = 0;
					else if (intensity>1.0) intensity = 1;
					if(intensity>0 && moved_recently()) fade(intensity, timepast);
				}
				if(aggitation<10) aggitation = 0;
			}
			if(!sign && signatures.length > 0) {
				var i = Math.floor(Math.random()*signatures.length);
				sign = new Signature(signatures[i],timestamp, (aggitation>0));
			} else if (sign) {
				sign.draw(timestamp,context);
				if(sign.finished()) sign = null;
			}
		}
		if(trigger) {
			last_timestamp=timestamp;
		}
		window.requestAnimationFrame(loop);
	}

	function fade(intensity, timepast) {
		var radius = Math.floor(intensity*150);
		if( rx && ry && radius > 4 &&
			(rx > -radius && rx < drawing_width+radius) &&
			(ry > -radius && ry < drawing_height+radius)
		) {
			var min_x = rx - radius;
			var min_y = ry - radius;
			var max_x = rx + radius;
			var max_y = ry + radius;
			if(min_x<0) min_x = 0;
			else if(max_x>=drawing_width) max_x = drawing_width;
			if(min_y<0) min_y = 0;
			else if(max_y>=drawing_height) max_y = drawing_height;

			var pixels = context.getImageData(min_x,min_y,max_x-min_x, max_y-min_y);
			var pixels_data = pixels.data;
			for(var i=0; i<pixels.width; i++) {
				for(var j=0; j<pixels.height; j++) {
					var index = (i+j*pixels.width)*4;
					var dis = (radius-Math.sqrt(Math.pow((min_x+i)-rx,2)+Math.pow((min_y+j)-ry,2)))/radius;
					if (dis<0) dis=0;
					else if (dis>1) dis = 1;
					pixels_data[index+3] -= dis*timepast;
				}
			}
			context.putImageData(pixels,min_x,min_y);
		}
	}

})({
	image_folder: '/signatures_lores'
});

