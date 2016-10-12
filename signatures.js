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

	var context;
	var canvas;
	var hidden_context; 
	var hidden_canvas; 

	var step_rate = 1000/30.0;

	var number_of_signatures = 502;
	var signatures = [];

	// state variables

	var sign = null;
	var running = true;
	var last_timestamp = null;

	/*
	 *	Signature Class Definition
	 */

	var Signature = function (image, timestamp) {
		this.canvas = hidden_canvas;
		this.context = hidden_context;
		this.started = timestamp;
		this.time_to_draw = image.width * 4 * random(1.5,2);
		this.progress = 0;
		this.width = image.width;
		this.height = image.height;
		this.x = 0;//(drawing_width - this.width);
		this.y = 0;//(drawing_height - this.height);
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
		this.draw_horizontal(pixels_data,w,h,pw);
		ctx.putImageData(pixels,this.x+pw,this.y);
		this.progress = progress;
	};

	Signature.prototype.finished = function() {
		return (this.progress >= 1);
	};
	
	function supports_canvas() {
		return !!document.createElement('canvas').getContext;
	}

	function setup_canvases () {

		canvas = document.createElement('canvas');
		canvas.width = signatures[0].width;
		canvas.height = signatures[0].height;

		canvas.style.display = "block";
		canvas.style.position = "fixed";
		canvas.style.margin = "auto";
		canvas.style.position ="fixed";
		canvas.style.zIndex = 99999999;
		canvas.style.cursor = 'pointer';
		canvas.style.bottom = '2em';
		canvas.style.right = '2em';
		canvas.style.opacity = 1;
		canvas.style.transition = "opacity 1s";
		canvas.style.width = signatures[0].width;
		canvas.style.maxWidth = "40%";
		canvas.style.height = "auto";

		canvas.addEventListener('click', function () {
			console.log('this');
			window.location.href = options.info_link;
		});

		document.body.appendChild(canvas);

		context = canvas.getContext("2d");
		context.globalCompositeOperation = "multiply";

		hidden_canvas = document.createElement('canvas');
		hidden_canvas.width = canvas.width; // should be widest image width.
		hidden_canvas.height = canvas.height; // should be highest image height.
		hidden_context = hidden_canvas.getContext("2d");

	}

	function load_signature(i, cb) {
		var img = new Image();
		img.src = options.image_folder+'/signature-'+i+'.png';
		img.onload = function() { signatures.push(img); cb(); };
	}

	function init() {
		if(supports_canvas() && window.innerWidth) {
			load_signature(Math.floor(Math.random()*number_of_signatures), start );
		}
	}

	function start() {
		running = true;
		setup_canvases();
		window.requestAnimationFrame(loop);
	}

	/*
	 * Main Animation Functions 
	 */

	function loop(timestamp) {
		if(!last_timestamp) last_timestamp=timestamp;
		var timepast = timestamp-last_timestamp;
		var trigger = (timepast > step_rate);
		if(running) {
			if(!sign && signatures.length > 0) {
				sign = new Signature(signatures[0],timestamp);
			} else if (sign) {
				sign.draw(timestamp,context);
				if(sign.finished()) {
					sign = null;
					running = false;
				}
			}
			if(trigger) {
				last_timestamp=timestamp;
			}
			window.requestAnimationFrame(loop);
		}
	}
})({
	image_folder: '/signatures_lores',
	info_link: 'http://impakt.nl/festival/signatures-by-benjamin-forster/',
	link_text: 'about this artwork'
});

