import {mod} from './utilities.mjs';
import {Hog} from './basic_classes.mjs';
import {images, goods} from './load_data.mjs';
import {Good} from './goods.mjs';


function rotateMatrix(matrix) { //rotates a matrix counter-clockwise
    let output = [];
    for (let i = 0; i < matrix[0].length; ++i) {
        output[i] = [];
        for (let j = 0; j < matrix.length; ++j) {
            output[i][j] = matrix[matrix.length - j - 1][i];
        }
    }
    return output;
}

function interaction_queue_generator() {
	let pairs = [];
	function hogs_of(interactable) {
        return (pairs
			.filter(pair => pair[1] === interactable)
			.map(pair => pair[0])
		);
    }
    function add_pair(hog, interactable) {
        pairs.push([hog, interactable]);
    }
    function remove_pair(hog, interactable) {
        pairs.splice(pairs.indexOf([hog, interactable]), 1)
    }
    function resolve() {
        for (let pair of pairs) {
            pair[1].interact_with(pair[0]);
        }
    }
	return Object.freeze({hogs_of, add_pair, remove_pair, resolve});
}

//used only in match_interactions
function consult_next(hogs, type, queue) {
	let hog = hogs.shift();
	if (hog.interact_preferences.length === 0) return; //this hog has no will to act
	
	let target = hog.interact_preferences.shift();
	if (!(target instanceof type)) {//this hog's preference is of the wrong type for this stage
		hogs.push(hog);//back of the line
		return;
	}
	
	//hog wants to interact with target. But is it reciprocal?
	let competing_hogs = queue.hogs_of(target)
	if(type===Taker){
		//TODO: make this consistent with crystals.
		competing_hogs = competing_hogs.filter(h => h.holding.name === hog.holding.name);
	}
	
	//is there room for hog without booting another?
	let good_key = hog.holding? hog.holding.name : '';
	if(competing_hogs.length < target.max_interactions(good_key)) {
		queue.add_pair(hog, target);
		return;
	}
	
	//no room! put hog on the queue, then boot the lowest ranked one.
	queue.add_pair(hog, target);
	competing_hogs.push(hog);
	function rank(h) {
		return target.tile_preferences.indexOf(h.tile);
	}	
	competing_hogs.sort((a,b) => rank(a)-rank(b));
	let disfavored_hog = competing_hogs.pop();
	hogs.push(disfavored_hog);
	queue.remove_pair(disfavored_hog, target);
	return;
}

function match_interactions(board) {
	//preparation
	for (let hog of board.hogs) {
		hog.previous_holding = hog.holding;
		hog.gave_to = false;
		hog.took_from = false;
		hog.reset_interact_preferences();
	}
	for (let interactable of board.interactables) {
		interactable.previous_holding = interactable.holding.slice();
	}
	
	let holderQueue = interaction_queue_generator(),
		seekerQueue = interaction_queue_generator(),
		activeHogs = board.hogs.filter(hog => hog.hopped_from),
		holders = activeHogs.filter(hog => hog.holding);
	
	while (holders.length > 0) {
		consult_next(holders, Taker, holderQueue);
	}
	holderQueue.resolve();
	for (let hog of holders) {
		hog.reset_interact_preferences();
	}

	let seekers = activeHogs.filter(hog => !hog.holding);
	while (seekers.length > 0) {
		consult_next(seekers, Giver, seekerQueue);
	}
	seekerQueue.resolve();
}

class Interactable { //this should only be created as a Giver or a Taker.
    constructor(tile) {
        this.corner = tile;
        this.tiles = [tile];
        this.tiles.forEach(tile => tile.interactable = this);
        this.tile_preferences = [
            this.tiles[0].east,
            this.tiles[0].south,
            this.tiles[0].west,
            this.tiles[0].north
        ];
        this.holding = [];
        this.previous_holding = [];
    }
    deconstruct() {
        this.tiles.forEach(tile => tile.interactable = false);
    }
    spriteData() {
        return [];
    }
}

class Taker extends Interactable {
    constructor(tile) {
        super(tile);
    }
    interact_with(hog) {
        this.take_from(hog);
    }
    take_from(hog) {
        this.holding.push(hog.holding);
        hog.holding = false;
        hog.gave_to = this.tiles.find(tile => tile.hasHogAdjacent(hog));
    }
    max_interactions(resource_type = false) {
        return 100; // a very large number, to simulate infinity.
    }
    currentGraphic() {
        return this.graphic();
    }
    previousGraphic() {
        return this.graphic();
    }
}

class Giver extends Interactable { //make sure to define baseResourceCount and resourceType
    constructor(tile) {
        super(tile);
        this.replenish();
    }
	get baseResourceCount() {
		alert('you must define a baseResourceCount for your giver!');
		console.log(self);
	}
	get resourceType() {
		alert('you must define a resourceType for your giver!');
		console.log(self);
	}
	get graphic() {
		alert('you must define a graphic for your giver!');
		console.log(self);
	}
    replenish() {
		this.holding = new Array(this.baseResourceCount)
			.fill(0)
			.map(elt => new Good(this.resourceType,[],0));
		this.previous_holding = this.holding.slice();
    }
    interact_with(hog) {
        this.give_to(hog);
    }
    give_to(hog, tile) {
        hog.holding = this.holding.pop();
        hog.took_from = this.tiles.find(tile => tile.hasHogAdjacent(hog));
    }
    max_interactions(resource_type = false) {
        return this.holding.length;
    }
    currentGraphic() {
        return this.graphic(this.holding.length);
    }
    previousGraphic() {
        return this.graphic(this.previous_holding.length);
    }
}

class Castle extends Taker {
    constructor(corner) { //upper left corner tile
        super(corner);
        this.tile_preferences = corner.neighborsFromMatrix(
            [
                [, 0, 1, 2, ],
                [3, , , , 4],
                [5, , , , 6],
                [7, , , , 8],
                [, 9, 10, 11, ]
            ],
            [1, 1]
        );
    }
    get tiles() {
        return this._tiles;
    }
    set tiles(corner_arg) {
        this._tiles = corner_arg[0].neighborsFromMatrix(
            [
                [0, 1, 2],
                [3, 4, 5],
                [6, 7, 8]
            ],
            [0, 0]
        );
    };
    graphic() {
        return images["castle"];
    }
    spriteData(tile) {
        let graphic = this.graphic(),
            width = graphic.width / 3,
            height = graphic.height / 3,
            x = width,
            y = 0,
            index = this.tiles.indexOf(tile);
        x += (width / 2) * (mod(index, 3) - Math.floor(index / 3));
        y += (height / 2) * (mod(index, 3) + Math.floor(index / 3));
        return [x, y, width, height]
    }
}

class Berry_Bush extends Giver {
    get resourceType() {
        return 'food';
    }
    get baseResourceCount() {
        return 2;
    }
    graphic(count) {
        switch (count) {
            case 2:
                return images["berry_bush_2"];
            case 1:
                return images["berry_bush_1"];
            default:
                return images["berry_bush_0"];
        }
    }
}

class Tree extends Giver {
    get resourceType() {
        return 'wood';
    }
    get baseResourceCount() {
        return 1;
    }
    graphic(count) {
        switch (count) {
            case 1:
                return images["tree_1"];
            default:
                return images["tree_0"];
        }
    }
}

class Shop {
    constructor(tile, target_good) {
        this.target_good = target_good;
        this.corner = tile;
        this.rotation = "SW"; //in which corner is the output?
        this.tiles = this.corner.neighborsFromMatrix(
            [
                [0, 1],
                [2, 3]
            ],
            [0, 0]
        );
        this.input = new ShopInput(this);
        this.output = new ShopOutput(this);
    }
    rotate() {
        this.rotation = {
            "NW": "NE",
            "NE": "SE",
            "SE": "SW",
            "SW": "NW"
        } [this.rotation];
        for (let tile of this.input.tiles) {
            tile.interactable = this.input;
        }
        for (let tile of this.output.tiles) {
            tile.interactable = this.output;
        }
        this.corner.board.is_changed = true;
    }
    graphic() {
        switch (this.rotation) {
            case "NW":
                return images["shop_nw"];
            case "NE":
                return images["shop_ne"];
            case "SW":
                return images["shop_sw"];
            case "SE":
                return images["shop_se"];
        }
    }
    spriteData(tile) {
        let graphic = this.graphic(),
            width = graphic.width / 2,
            height = graphic.height / 2,
            x = width / 2,
            y = 0,
            index = this.tiles.indexOf(tile);
        x += (width / 2) * (mod(index, 2) - Math.floor(index / 2));
        y += (height / 2) * (mod(index, 2) + Math.floor(index / 2));
        return [x, y, width, height];
    }
    recipeRequires(ingredient_name) {
        return goods[this.target_good].recipe.find(pair => pair[0] === ingredient_name);
    }
    craft() {
        for (let part of goods[this.target_good].recipe) {
            if (part[1] > this.input.numberHeld(part[0])) return;
        }
		let product = new Good(
			this.target_good,
			this.input.holding.map(good => good.value_array), 
			0
		);
        this.input.holding = [];
        this.output.holding = [product];
    }
    deconstruct() {
        for (let tile of this.tiles) {
            tile.interactable = false;
        }
    }
    get center_offset() {
        switch (this.rotation) {
            case "NW":
                return [0, 1 / 2];
            case "NE":
                return [-1 / 2, 0];
            case "SE":
                return [0, -1 / 2];
            case "SW":
                return [1 / 2, 0];
        }
    }
}

class ShopInput extends Taker {
    constructor(shop) {
        super(shop.corner);
        this.shop = shop;
        this.tiles.forEach(tile => tile.interactable = this);
    }
    pic_list(previous = false) { //[[resource_name,is_present],...]
        let array = [];
        for (let pair of goods[this.shop.target_good].recipe) {
            let fulfilled = this.numberHeld(pair[0], previous);
            let unfulfilled = pair[1] - fulfilled;
            for (let i = 0; i < fulfilled; ++i) {
                array.push([pair[0], true]);
            }
            for (let i = 0; i < unfulfilled; ++i) {
                array.push([pair[0], false]);
            }
        }
        return array;
    }
    get tiles() {
        if (this.shop === undefined) return [{
            interactable: null
        }]; //needed for bootstrapping

        let mymatrix = [
            [, 0],
            [1, 2]
        ];
        for (let i = 0; i < ["NW", "NE", "SE", "SW"].indexOf(this.shop.rotation); ++i) {
            mymatrix = rotateMatrix(mymatrix);
        }
        return this.shop.corner.neighborsFromMatrix(mymatrix, [0, 0]);
    }
    set tiles(arg) {
        return
    };
    get tile_preferences() {
        let mymatrix = [
            [, , 0, ],
            [, , , 1],
            [5, , , 2],
            [, 4, 3, ]
        ];
        for (let i = 0; i < ["NW", "NE", "SE", "SW"].indexOf(this.shop.direction); ++i) {
            mymatrix = rotateMatrix(mymatrix);
        }
        return this.shop.corner.neighborsFromMatrix(mymatrix, [1, 1]);
    }
    set tile_preferences(arg) {
        return
    };
    spriteData(tile) {
        return this.shop.spriteData(tile)
    };
    graphic() {
        return this.shop.graphic()
    };
    rotate() {
        this.shop.rotate()
    };
    max_interactions(resource_type) {
        if (this.shop.output.resource_count > 0) return 0;
        let recipePart = this.shop.recipeRequires(resource_type);
        if (!recipePart) return 0;
        return recipePart[1] - this.numberHeld(resource_type);
    }
    numberHeld(resource_type, previous = false) {
        let holdlist = this.holding;
        if (previous) {
			holdlist = this.previous_holding;
		}
        return holdlist.filter(ing => ing.name === resource_type).length;
    }
    deconstruct() {
        this.shop.deconstruct()
    };
}

class ShopOutput extends Giver {
    constructor(shop) {
        super(shop.corner);
        this.shop = shop;
        this.tiles.forEach(tile => tile.interactable = this);
    }
    pic_list(previous = false) { //[[resource_name,is_present],...]
        let held = previous? this.previous_holding : this.holding;
		return [[this.shop.target_good, held.length>0]]
    }
    get tiles() {
        if (this.shop === undefined) return [{
            interactable: null
        }]; //needed for bootstrapping

        let mymatrix = [
            [0, null],
            [null, null]
        ];
        for (let i = 0; i < ["NW", "NE", "SE", "SW"].indexOf(this.shop.rotation); ++i) {
            mymatrix = rotateMatrix(mymatrix);
        }
        return this.shop.corner.neighborsFromMatrix(mymatrix, [0, 0]);
    }
    set tiles(arg) {
        return
    };
    get tile_preferences() {
        let mymatrix = [
            [, 0, , ],
            [1, , , ],
            [, , , ],
            [, , , ]
        ];
        for (let i = 0; i < ["NW", "NE", "SE", "SW"].indexOf(this.shop.direction); ++i) {
            mymatrix = rotateMatrix(mymatrix);
        }
        return this.shop.corner.neighborsFromMatrix(mymatrix, [1, 1]);
    }
    set tile_preferences(arg) {
        return
    };
    spriteData(tile) {
        return this.shop.spriteData(tile)
    };
    graphic() {
        return this.shop.graphic()
    };
    rotate() {
        this.shop.rotate()
    };
    get baseResourceCount() {
        return 0
    };
    get resourceType() {
        return this.shop.target_good;
    }
    deconstruct() {
        this.shop.deconstruct()
    };
}

export {match_interactions, Castle, Berry_Bush, Tree, Shop, ShopInput, ShopOutput, Giver};