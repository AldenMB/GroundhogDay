import {GameWindow} from './graphics.mjs';
import {match_interactions, Castle, Berry_Bush, Tree, Shop, ShopInput, ShopOutput, Giver} from './hog_interactions.mjs';
import {mod, ARROWS} from './utilities.mjs';
import {images} from './load_data.mjs';

class Tile {
    constructor(board, x, y, floor = '') {
        this.board = board;
        this.x = x;
        this.y = y;
        this.floor = floor;
        this.hogs = [];
        this.house = false;
        this.interactable = false;
    }
    remove_hog(hog) {
        let index = this.hogs.indexOf(hog);
        if (index > -1) {
            this.hogs.splice(index, 1);
        };
    }
    hog_pointing(direction) {
        for (let hog of this.hogs) {
            if (hog.direction === direction) {
                return hog;
            };
        };
        return false;
    }
    hog_going(direction) {
        for (let hog of this.hogs) {
            if (hog.going() === direction) {
                return hog;
            };
        };
        return false;
    }
    road_toggle() {
        if (this.floor === '') {
            this.floor = 'r';
        } else {
            this.floor = '';
        }
        return this;
    }
    house_toggle() {
        if (this.house) {
            this.house.deconstruct();
        } else {
            new House(this, "N");
        }
        return this;
    }
    interact_toggle(type) {
        if (this.interactable instanceof type) {
            this.interactable.deconstruct();
        } else {
            this.interactable = new type(this);
        }
        return this;
    }
    shop_toggle(recipe) {
        if (this.interactable instanceof ShopInput || this.interactable instanceof ShopOutput) {
            this.interactable.shop.deconstruct();
        } else {
            new Shop(this, recipe);
        }
        return this;
    }
    on_click() {
        this.board.is_changed = true;
        switch (this.board.selected_tool) {
            case "rotate_house":
                if (this.house) this.house.rotate();
                break;
            case "road_toggle":
                this.road_toggle();
                break;
            case "house_toggle":
                this.house_toggle();
                break;
            case "tree_toggle":
                this.interact_toggle(Tree);
                break;
            case "castle_toggle":
                this.interact_toggle(Castle);
                break;
            case "berry_bush_toggle":
                this.interact_toggle(Berry_Bush);
                break;
            case "shop_toggle":
                this.shop_toggle(document.getElementById("recipe_select").elements.recipe_radio.value);
                break;
            case "shop_rotate":
                if (this.interactable instanceof ShopInput || this.interactable instanceof ShopOutput) this.interactable.shop.rotate();
                break;
            default:
                throw "no such tool as " + this.board.selected_tool;
                break;
        }
        this.board.is_changed = true;
    }
    to_my(direction) {
        switch (direction) {
            case "N":
                return this.north;
            case "S":
                return this.south;
            case "E":
                return this.east;
            case "W":
                return this.west;
        }
    }
    get north() {
        return this.board.tileAt(this.x, this.y + 1);
    }
    get south() {
        return this.board.tileAt(this.x, this.y - 1);
    }
    get east() {
        return this.board.tileAt(this.x + 1, this.y);
    }
    get west() {
        return this.board.tileAt(this.x - 1, this.y);
    }
    neighborsFromMatrix(matrix, me) { //me is the position [column, row] of this tile in the matrix
        return this.board.tilesFromMatrix(matrix, [this.x - me[0], this.y + me[1]]);
    }
    hasHogAdjacent(hog) {
        let hogList = [];
        for (let direction of ["N", "S", "E", "W"]) {
            hogList = hogList.concat(this.to_my(direction).hogs);
        }
        return hogList.includes(hog);
    }
}

class Board {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [...Array(this.width * this.height)]
            .map((spot, index) => new Tile(this, mod(index, this.width), Math.floor(index / this.width)));
        this.is_changed = false; //this variable is used to un-loop and un-stuck all the hog at the appropriate time.
        this.number_of_steps = 0; //this stores the value for the day-length dispay, and is otherwise unused.
        this.gameWindow = new GameWindow(this);
		this.steptime_millis = Date.now();
		document.getElementById('reset').onclick = this.reset_day.bind(this);
    }
    get selected_tool() {
        return document.getElementById("tools").elements.tool_radio.value;
    }
    get houses() {
        return this.tiles.map(tile => tile.house).filter(house => house);
    }
    get hogs() {
        let array = [];
        for (let tile of this.tiles) {
            array.push(...tile.hogs);
        }
        return array;
    }
    get interactables() {
		return this.tiles.filter(tile => tile.interactable).map(tile => tile.interactable);
	}
	get shops() {
        let shops = [];
        for (let interactable of this.interactables) {
            if (interactable instanceof ShopInput || interactable instanceof ShopOutput) {
                if (!shops.includes(interactable.shop)) {
                    shops.push(interactable.shop);
                }
            }
        }
        return shops;
    }
    tileAt(x, y) {
        return this.tiles[mod(x, this.width) + this.width * mod(y, this.height)];
    }
    step() {
		this.craft_shops();
		
        for (let hog of this.hogs) {
            hog.has_stepped = false;
            hog.hopped_from = false;
            hog.previous_stack_position = hog.stack_position;
        };
        if (this.is_changed) {
            for (let hog of this.hogs) {
                hog.looped = false;
                hog.stuck = false;
            };
            this.is_changed = false;
        };
        for (let hog of this.hogs) {
            hog.step();
        };

        match_interactions(this);

        this.number_of_steps++;
    }
    craft_shops() {
        for (let shop of this.shops) {
            shop.craft();
        }
    }
    recall_hog() {
        for (let house of this.houses) {
            house.recall_hog();
        };
    }
    replenish_givers() {
        for (let tile of this.tiles) {
            if (tile.interactable instanceof Giver) {
                tile.interactable.replenish();
            }
        }
    }
	empty_shops() {
		for (let shop of this.shops) {
			shop.input.holding = [];
			shop.input.previous_holding = [];
		}
	}
    reset_day() {
        this.number_of_steps = 0;
        this.recall_hog();
		this.empty_shops();
        this.replenish_givers();
    }
    update_step_display() {
        $("#step_count").empty().append(`This day has gone on for ${this.number_of_steps} steps.`);
    }
    tilesFromMatrix(matrix, corner) {
        //input format:
        //(
        //[
        // [ ,0,1, ],
        // [2, , ,3],
        // [4, , ,5],
        // [ ,6,7, ]
        //],
        //[2,3]  //upper left corner
        //)
        let tiles = [];
        for (let j = 0; j < matrix.length; ++j) {
            for (let i = 0; i < matrix[j].length; ++i) {
                let entry = matrix[j][i];
                if (Number.isInteger(entry) && (entry > -1)) {
                    tiles[entry] = this.tileAt(corner[0] + i, corner[1] - j);
                }
            }
        }
        return tiles;
    }
}

class Hog {
    constructor(tile, direction) {
        //variables
        this.tile = tile;
        this.direction = direction;
		//used for path finding
        this.has_stepped = false;
        this.is_waiting = false;
        this.looped = false;
        this.stuck = false;
		//for drawing
        this.hopped_from = false;
        this.previous_stack_position = 0;
		//for interactions
        this.interact_preferences = [];
        this.holding = false;
		//for drawing
        this.previous_holding = false;
        this.gave_to = false;
        this.took_from = false;
        //change other variables upon creation
        tile.hogs.push(this);
    }
    reset_interact_preferences() {
        let neighbors = this.neighbor_tiles();
        this.interact_preferences = [
            neighbors.front.interactable,
            neighbors.right.interactable,
            neighbors.left.interactable
        ]
    }
    get stack_position() {
        return this.tile.hogs.indexOf(this);
    }
    deconstruct() {
        this.tile.remove_hog(this);
    }

    move(move_direction = this.going()) {
        if (move_direction === '') return;
        this.hopped_from = this.tile;
        this.tile.remove_hog(this);
        switch (move_direction) {
            case "N":
                this.tile = this.tile.north;
                break;
            case "E":
                this.tile = this.tile.east;
                break;
            case "W":
                this.tile = this.tile.west;
                break;
            case "S":
                this.tile = this.tile.south;
        }
        this.direction = move_direction;
        this.tile.hogs.push(this);
    };
    move_to(tile = this.tile, direction = this.direction) {
        this.tile.remove_hog(this);
        this.tile = tile;
        this.direction = direction;
        this.tile.hogs.push(this);
    }
    neighbor_tiles() {
        let obj = {
            left: this.tile.to_my(this.left),
            right: this.tile.to_my(this.right),
            front: this.tile.to_my(this.direction),
            back: this.tile.to_my(this.back)
        };
        return obj;
    }
    get right() {
        return {
            "N": "E",
            "E": "S",
            "S": "W",
            "W": "N"
        } [this.direction]
    }
    get left() {
        return {
            "N": "W",
            "W": "S",
            "S": "E",
            "E": "N"
        } [this.direction]
    }
    get back() {
        return {
            "N": "S",
            "S": "N",
            "W": "E",
            "E": "W"
        } [this.direction]
    }
    going() {
        if (this.neighbor_tiles().front.floor === 'r') {
            return this.direction;
        } else if (this.neighbor_tiles().right.floor === 'r') {
            return this.right;
        } else if (this.neighbor_tiles().left.floor === 'r') {
            return this.left;
        }
        return '';
    }
    following() {
        let temp_hog = new Hog(this.tile, this.direction);
        temp_hog.move();
        let test_tile = temp_hog.tile;
        let test_direction = temp_hog.going();
        temp_hog.deconstruct();
        return test_tile.hog_going(test_direction);
    }
    going_to_t() {
        let temp_hog = new Hog(this.tile, this.direction);
        temp_hog.move();
        if (temp_hog.tile === this.tile) {
            temp_hog.deconstruct();
            return false;
        }
        let temp_hog_neighbors = temp_hog.neighbor_tiles();
        let condition = (temp_hog_neighbors.front.floor === '' &&
            temp_hog_neighbors.right.floor === 'r' &&
            temp_hog_neighbors.left.floor === 'r');
        temp_hog.deconstruct();
        return condition;
    }
    hog_competing_for_t() {
        if (!this.going_to_t()) return false;
        let temp_hog = new Hog(this.tile, this.direction);
        temp_hog.move();
        let ret_val = temp_hog.neighbor_tiles().left.hog_going(temp_hog.right);
        temp_hog.deconstruct();
        if (ret_val.has_stepped) {
            return false;
        }
        return ret_val;
    }
    step() {
        if (this.has_stepped || this.stuck) {
            return
        };
        let next_hog = this.following();
        if (next_hog === this) {
            this.stuck = true;
            this.has_stepped = true;
            return;
        }
        if (this.looped) {
            this.has_stepped = true;
            this.move();
            if (next_hog) {
                next_hog.step();
            }
            return;
        }
        if (next_hog) {
            if (next_hog.looped || next_hog.stuck) {
                this.stuck = true;
                this.has_stepped = true;
                return;
            }
            if (next_hog.is_waiting) { // We found a new loop. Inform the others, then advance the whole loop.
                this.looped = true;
                let f = next_hog;
                while (f !== this) {
                    f.looped = true;
                    f = f.following();
                }
                //next_hog.looped = true;
                this.move();
                this.has_stepped = true;
                next_hog.step();
                return;
            }
            this.is_waiting = true;
            next_hog.step(); //let the next hog get out of the way.
            this.is_waiting = false;
            if (this.following()) { //the hog we are following could not move, or another hog took its place. Stop.
                if (this.following.looped || this.following.stuck) {
                    this.stuck = true;
                }
                this.has_stepped = true;
                return;
            }
            if (this.hog_competing_for_t()) { //let another hog into the procession. Stop.
                this.hog_competing_for_t().step();
                this.has_stepped = true;
                return;
            }
            // we can fill the space we were following. Move and stop.
            this.move();
            this.has_stepped = true;
            return;
        }
        //we are not following anyone, i.e. our target space is open.
        if (this.hog_competing_for_t()) { //let another hog into the procession. Stop.
            this.hog_competing_for_t().step();
            this.has_stepped = true;
            return;
        }
        //we have priority for entering our target. Move and stop.
        this.move();
        this.has_stepped = true;
        return;
    }
    direction_of(tile) {
        if (this.tile.north === tile) {
            return 'N'
        } else if (this.tile.east === tile) {
            return 'E'
        } else if (this.tile.south === tile) {
            return 'S'
        } else if (this.tile.west === tile) {
            return 'W'
        } else {
            console.log('how did these two even meet?')
            console.log(this)
            console.log(tile)
        }
    }
    get graphic() {
        switch (this.direction) {
            case "N":
                return images["up_right_hog"];
            case "E":
                return images["down_right_hog"];
            case "S":
                return images["down_left_hog"];
            case "W":
                return images["up_left_hog"];
        }
    }
}

class House {
    constructor(tile, direction) {
        //my properties
        this.tile = tile;
        this.direction = direction;
        this.hog = new Hog(this.tile, direction);
        //change other objects
        this.tile.house = this;
    }
    recall_hog() {
		this.hog.deconstruct();
		this.hog = new Hog(this.tile, this.direction);
        this.tile.board.is_changed = true;
    }
    deconstruct() {
        this.hog.deconstruct();
        this.tile.house = false;
    }
    rotate(times = 1) {
        for (let i = 0; i < times; i++) {
            this.direction = {
                "N": "E",
                "E": "S",
                "S": "W",
                "W": "N"
            } [this.direction];
        }
        this.recall_hog();
        return this;
    }
    graphic() {
        switch (this.direction) {
            case "N":
                return images["hole_up_right"];
            case "E":
                return images["hole_down_right"];
            case "S":
                return images["hole_down_left"];
            case "W":
                return images["hole_up_left"];
        }
    }
}

export {Tile, Board, Hog, House};