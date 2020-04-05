import {mod} from './utilities.mjs';
import {Hog} from './basic_classes.mjs';
import {images} from './load_data.mjs';


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

class InteractionQueue {
    constructor() {
        this.pairs = []; //[[hog,interactable],...]
    }
    hogs_of(interactable) {
        let pair_list = this.pairs.filter(pair => pair[1] === interactable);
        let list = [];
        for (let pair of pair_list) {
            list.push(pair[0]);
        }
        return list;
    }
    add_pair(hog, interactable) {
        this.pairs.push([hog, interactable]);
    }
    remove_pair(hog, interactable) {
        this.pairs.splice(this.pairs.indexOf([hog, interactable]), 1)
    }
    resolve() {
        for (let pair of this.pairs) {
            pair[1].interact_with(pair[0]);
        }
    }
}

class Matchmaker {
    constructor(board) {
        this.board = board;
        for (let hog of this.board.hogs) {
            hog.previous_holding = hog.holding;
            hog.gave_to = false;
            hog.took_from = false;
            hog.reset_interact_preferences();
        }
        for (let tile of this.board.tiles) {
            if (tile.interactable instanceof Giver) {
                tile.interactable.previous_resource_count = tile.interactable.resource_count;
            }
            if (tile.interactable instanceof Taker) {
                tile.interactable.previous_holding = tile.interactable.holding.slice();
            }
        }
    }
    consult_next(hogs, type, queue) { // don't call me when hogs.length = 0
        let hog = hogs.shift();
        if (hog.interact_preferences.length === 0) return;
        let target = hog.interact_preferences.shift();
        if (!(target instanceof type)) {
            hogs.push(hog);
            return;
        }
        let preferred = target.prefers(hog, queue);
        if (!preferred) {
            hogs.push(hog);
        } else {
            queue.add_pair(hog, target);
            if (preferred instanceof Hog) {
                hogs.push(preferred);
                queue.remove_pair(preferred, target);
            }
        }
        return;
    }
    match() {
        let holderQueue = new InteractionQueue(),
            seekerQueue = new InteractionQueue();

        let activeHogs = this.board.hogs.filter(hog => hog.hopped_from);

        let holders = activeHogs.filter(hog => hog.holding);
        while (holders.length > 0) {
            this.consult_next(holders, Taker, holderQueue);
        }
        holderQueue.resolve();

        for (let hog of activeHogs) {
            hog.reset_interact_preferences();
        }

        let seekers = activeHogs.filter(hog => !hog.holding);
        while (seekers.length > 0) {
            this.consult_next(seekers, Giver, seekerQueue);
        }
        seekerQueue.resolve();

        return [holderQueue, seekerQueue];
    }
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
    }
    deconstruct() {
        this.tiles.forEach(tile => tile.interactable = false);
    }
    prefers(hog, queue) {
        let my_hogs = queue.hogs_of(this).filter(f => f.holding === hog.holding);
        if (my_hogs.length < this.max_interactions(hog.holding.name)) return true; //indicates that there was no competition
        for (let competing_hog of my_hogs) {
            if (this.tile_preferences.indexOf(hog.tile) < this.tile_preferences.indexOf(competing_hog.tile)) {
                return competing_hog;
            }
        }
        return false; //indicates that given hog is not preferred
    }
    spriteData() {
        return [];
    }
}

class Taker extends Interactable {
    constructor(tile) {
        super(tile);
        this.holding = [];
        this.previous_holding = [];
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
    replenish() {
        this.resource_count = this.baseResourceCount(); // new variables are defined here.
        this.previous_resource_count = this.baseResourceCount();
    }
    interact_with(hog) {
        this.give_to(hog);
    }
    give_to(hog, tile) {
        hog.holding = this.resourceType();
        hog.took_from = this.tiles.find(tile => tile.hasHogAdjacent(hog));
        this.resource_count--;
    }
    max_interactions(resource_type = false) {
        return this.resource_count;
    }
    currentGraphic() {
        return this.graphic(this.resource_count);
    }
    previousGraphic() {
        return this.graphic(this.previous_resource_count);
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
    get appearance() {
        return 'C';
    }
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
    resourceType() {
        return new Resource('berry');
    }
    baseResourceCount() {
        return 2;
    }
    get appearance() {
        switch (this.resource_count) {
            case 2:
                return 'BB';
                break;
            case 1:
                return 'Bb';
                break;
            case 0:
                return 'bb';
                break;
            default:
                console.log('Error! Wrong number of resources!');
                console.log(this)
        }
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
    resourceType() {
        return new Resource("wood");
    }
    baseResourceCount() {
        return 1;
    }
    get appearance() {
        if (this.resource_count === 1) {
            return 'T';
        } else {
            return 't';
        }
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
    constructor(tile, recipe) {
        this.recipe = recipe; // {input : [ [ingredient, amount], ...], output : [product, amount]}
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
        return this.recipe.input.find(pair => pair[0] === ingredient_name);
    }
    craft() {
        for (let part of this.recipe.input) {
            if (part[1] > this.input.numberHeld(part[0])) return;
        }
        this.input.craft();
        this.output.craft();
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
        for (let pair of this.shop.recipe.input) {
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
    get appearance() {
        return 'Si' + this.holding.length;
    }
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
    craft() {
        for (let part of this.shop.recipe.input) {
            for (let i = 0; i < part[1]; ++i) {
                this.removeHeld(part[0]);
            }
        }
    }
    removeHeld(resource_name) {
        this.holding.splice(this.holding.findIndex(e => e.name === resource_name), 1);
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
        let array = [],
            pair = this.shop.recipe.output,
            count = this.resource_count;
        if (previous) count = this.previous_resource_count;
        for (let i = 0; i < count; ++i) {
            array.push([pair[0], true]);
        }
        for (let i = 0; i < this.shop.recipe.output[1] - count; ++i) {
            array.push([pair[0], false]);
        }
        return array;
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
    get appearance() {
        return 'So' + this.resource_count;
    }
    baseResourceCount() {
        return 0
    };
    resourceType() {
        return new Resource(this.shop.recipe.output[0]);
    }
    craft() {
        this.resource_count = this.shop.recipe.output[1];
    }
    deconstruct() {
        this.shop.deconstruct()
    };
}

// this is the interface to get graphics for a resource, mostly. The name of the resource is used elsewhere.
class Resource {
    constructor(name) {
        this.name = name;
    }
    get graphic() {
		let graphic_id = "undefined_item";
		if( ["berry","wood","steak","bread","perfume"].includes(this.name) ){
			graphic_id = this.name;
		}
		return images[graphic_id];
    }
    toString() {
        return this.name;
    }
}

export {Matchmaker, Castle, Berry_Bush, Tree, Shop, ShopInput, ShopOutput, Giver};