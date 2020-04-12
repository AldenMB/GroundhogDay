"use strict";

import {Board} from './modules/basic_classes.mjs';
import {Castle, Berry_Bush, Tree} from './modules/hog_interactions.mjs';
import {load_data, goods} from './modules/load_data.mjs';

const DAY_DURATION_MILLIS = 60000;
const STEPS_PER_DAY = 45;
const STEP_DURATION_MILLIS = DAY_DURATION_MILLIS/STEPS_PER_DAY;

load_data().then(function(){
	$(document).ready( function() {
		let b = new Board(10, 15);
		let zoomslider = document.getElementById("zoom_select");
		zoomslider.oninput = function(){
			b.gameWindow.tile_size = this.value;
		}
		b.gameWindow.tile_size=zoomslider.value;
		let recipeselect = document.getElementById("recipe");
		for(let recipe of Object.keys(goods)){
			let option = document.createElement("option");
			option.value = recipe;
			option.text = goods[recipe].display_name;
			recipeselect.add(option);
		}

		b.tileAt(-2, 1).interact_toggle(Castle);
		b.tileAt(2, 2).shop_toggle("perfume");
		b.tileAt(1, 1).house_toggle().house.rotate().rotate();
		b.tileAt(5, 4).house_toggle().house.rotate().rotate();
		b.tileAt(0, 3).house_toggle().house.rotate();
		b.tileAt(1, 4).interact_toggle(Berry_Bush);
		b.tileAt(4, 5).interact_toggle(Tree);
		b.tileAt(4, 2).interact_toggle(Tree);
		b.tileAt(1, 0).road_toggle();
		b.tileAt(2, 0).road_toggle();
		b.tileAt(1, 2).road_toggle();
		b.tileAt(1, 3).road_toggle();
		b.tileAt(1, -1).road_toggle();
		b.tileAt(2, -1).road_toggle();
		b.tileAt(3, 3).road_toggle();
		b.tileAt(3, 4).road_toggle();
		b.tileAt(4, 3).road_toggle();
		b.tileAt(4, 4).road_toggle();
		b.tileAt(5, 3).road_toggle();
		
		setInterval(function() {
			b.step();
            b.update_step_display();
			b.steptime_millis = Date.now();
		}, STEP_DURATION_MILLIS);
		
		function animate(){
			let fraction = (Date.now() - b.steptime_millis)/STEP_DURATION_MILLIS;
			fraction = Math.max(0, fraction)
			b.gameWindow.draw_visible(fraction);
			window.requestAnimationFrame(animate);
		}
		
		window.requestAnimationFrame(animate)
		
		//used for scrolling through the view using arrow keys
		setInterval(function() {
			b.gameWindow.shift_step();
		}, 14);
		
	});	
});






