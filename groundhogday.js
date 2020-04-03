"use strict";

import {Board} from './modules/basic_classes.mjs';
import {Castle, Berry_Bush, Tree} from './modules/hog_interactions.mjs';

var RECIPES = {}
fetch('./recipes.json')
	.then((response) => {
	return response.json();
	})
	.then((data) => {
	RECIPES = data;
	});

var b = null;
$(window).on('load', function() {
    b = new Board(7, 6);

    b.tileAt(5, 1).interact_toggle(Castle);
    b.tileAt(2, 2).shop_toggle(RECIPES["steak"]);
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
    b.tileAt(1, 5).road_toggle();
    b.tileAt(2, 5).road_toggle();
    b.tileAt(3, 3).road_toggle();
    b.tileAt(3, 4).road_toggle();
    b.tileAt(4, 3).road_toggle();
    b.tileAt(4, 4).road_toggle();
    b.tileAt(5, 3).road_toggle();

    b.render();
    setInterval(function() {
        b.next_frame();
    }, 14)
});

