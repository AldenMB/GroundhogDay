"use strict";

function mod(m, n) {
    return (m % n + n) % n;
}

let ARROWS = {
    "N": "↑",
    "E": "→",
    "W": "←",
    "S": "↓"
}

class Tile {
    constructor(board, x, y, floor = '') {
        this.board = board;
        this.x = x;
        this.y = y;
        this.floor = floor;
        this.flans = [];
        this.house = false;
        this.interactable = false;
    }
    get appearance() {
        var s = $("<span>");
        if (this.interactable) {
            s.append(this.interactable.appearance);
        }
        if (this.house) {
            s.append(this.house.appearance);
        };
        for (let flan of this.flans) {
            s.append(flan.appearance);
        };
        return s;
    }
    remove_flan(flan) {
        var index = this.flans.indexOf(flan);
        if (index > -1) {
            this.flans.splice(index, 1);
        };
    }
    flan_pointing(direction) {
        for (let flan of this.flans) {
            if (flan.direction === direction) {
                return flan;
            };
        };
        return false;
    }
    flan_going(direction) {
        for (let flan of this.flans) {
            if (flan.going() === direction) {
                return flan;
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
                this.shop_toggle(RECIPES[document.getElementById("recipe_select").elements.recipe_radio.value]);
                break;
            case "shop_rotate":
                if (this.interactable instanceof ShopInput || this.interactable instanceof ShopOutput) this.interactable.shop.rotate();
                break;
            default:
                throw "no such tool as " + this.board.selected_tool;
                break;
        }
        this.board.is_changed = true;
        this.render_update();
    }
    get id() {
        return 'tile_' + this.x + '_' + this.y;
    }
    render_update() {
        var td = $('#' + this.id);
        td.empty();
        td.append(this.appearance);
        if (this.floor === 'r') {
            td.addClass('road');
        } else {
            td.removeClass('road');
        }
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
    hasFlanAdjacent(flan) {
        let flanList = [];
        for (let direction of ["N", "S", "E", "W"]) {
            flanList = flanList.concat(this.to_my(direction).flans);
        }
        return flanList.includes(flan);
    }
}

class Board {
    constructor(width, height) {
        this.width = width;
        this.height = height;
        this.tiles = [...Array(this.width * this.height)]
            .map((spot, index) => new Tile(this, mod(index, this.width), Math.floor(index / this.width)));
        this.is_changed = false; //this variable is used to un-loop and un-stuck all the flan at the appropriate time.
        this.number_of_steps = 0; //this stores the value for the day-length dispay, and is otherwise unused.
        this.window = new Game_window(this);
        this.frame = 0;
    }
    get selected_tool() {
        return document.getElementById("tools").elements.tool_radio.value;
    }
    get houses() {
        return this.tiles.map(tile => tile.house).filter(house => house);
    }
    get flans() {
        let array = [];
        for (let tile of this.tiles) {
            array.push(...tile.flans);
        }
        return array;
    }
    get shops() {
        let shops = [];
        for (let tile of this.tiles) {
            if (tile.interactable instanceof ShopInput || tile.interactable instanceof ShopOutput) {
                if (!shops.includes(tile.interactable.shop)) {
                    shops.push(tile.interactable.shop);
                }
            }
        }
        return shops;
    }
    tileAt(x, y) {
        return this.tiles[mod(x, this.width) + this.width * mod(y, this.height)];
    }
    step() {
        for (let flan of this.flans) {
            flan.has_stepped = false;
            flan.hopped_from = false;
            flan.previous_stack_position = flan.stack_position;
        };
        if (this.is_changed) {
            for (let flan of this.flans) {
                flan.looped = false;
                flan.stuck = false;
            };
            this.is_changed = false;
        };
        for (let flan of this.flans) {
            flan.step();
        };

        let matchmaker = new Matchmaker(this)
        matchmaker.match();

        this.craft_shops();

        this.number_of_steps++;
    }
    craft_shops() {
        for (let shop of this.shops) {
            shop.craft();
        }
    }
    recall_flan() {
        for (let house of this.houses) {
            house.recall_flan();
        };
    }
    replenish_givers() {
        for (let tile of this.tiles) {
            if (tile.interactable instanceof Giver) {
                tile.interactable.replenish();
            }
        }
    }
    reset_day() {
        this.number_of_steps = 0;
        this.recall_flan();
        this.replenish_givers();
    }
    render() {
        var board_container = $("#board_container")
        var board_table = $("<table>")
        for (var j = this.height - 1; j >= 0; j--) {
            var tr = $("<tr>")
            for (var i = 0; i < this.width; i++) {
                var td = $("<td>");
                var tile = this.tileAt(i, j);
                td.attr("id", tile.id);
                if (tile.floor === "r") {
                    td.addClass("road")
                }
                td.append(tile.appearance);

                let clickhandlerfactory = function(i, j, board) {
                    return function() {
                        board.tileAt(i, j).on_click();
                    }
                }
                td.bind("click", clickhandlerfactory(i, j, this))
                tr.append(td)
            }
            board_table.append(tr)
        }
        board_container.empty()
        board_container.append(board_table)
        this.update_step_display();
        this.window.draw_visible();
    }
    update_step_display() {
        $("#step_count").empty().append(`This day has gone on for ${this.number_of_steps} steps.`);
    }
    next_frame() {
        var frames_per_cycle = 60;
        this.frame++
        this.window.shift_step();
        this.window.draw_visible(this.frame / frames_per_cycle);
        if (this.frame >= frames_per_cycle) {
            this.frame = 0;
            this.step();
            this.update_step_display();
            for (let tile of this.tiles) {
                tile.render_update();
            }
        }
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

class Flan {
    constructor(tile, direction) {
        //variables
        this.tile = tile;
        this.direction = direction;
        this.has_stepped = false;
        this.is_waiting = false;
        this.looped = false;
        this.stuck = false;
        this.decorator = '';
        this.hopped_from = false;
        this.previous_stack_position = 0;
        this.interact_preferences = [];
        this.holding = false;
        this.previous_holding = false;
        this.gave_to = false;
        this.took_from = false;
        //change other variables upon creation
        tile.flans.push(this);
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
        return this.tile.flans.indexOf(this);
    }
    deconstruct() {
        this.tile.remove_flan(this);
    }
    get appearance() {
        var s = $("<span>");
        s.addClass("flan");
        if (this.looped) {
            s.addClass("looped");
        }
        if (this.stuck) {
            s.addClass("stuck");
        }
        let string = ARROWS[this.direction] + this.decorator;
        if (this.holding) string += this.holding.toString();
        s.text(string);
        return s;
    };
    move(move_direction = this.going()) {
        if (move_direction === '') return;
        this.hopped_from = this.tile;
        this.tile.remove_flan(this);
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
        this.tile.flans.push(this);
    };
    move_to(tile = this.tile, direction = this.direction) {
        this.tile.remove_flan(this);
        this.tile = tile;
        this.direction = direction;
        this.tile.flans.push(this);
    }
    neighbor_tiles() {
        var obj = {
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
        var temp_flan = new Flan(this.tile, this.direction);
        temp_flan.move();
        var test_tile = temp_flan.tile;
        var test_direction = temp_flan.going();
        temp_flan.deconstruct();
        return test_tile.flan_going(test_direction);
    }
    going_to_t() {
        var temp_flan = new Flan(this.tile, this.direction);
        temp_flan.move();
        if (temp_flan.tile === this.tile) {
            temp_flan.deconstruct();
            return false;
        }
        var temp_flan_neighbors = temp_flan.neighbor_tiles();
        var condition = (temp_flan_neighbors.front.floor === '' &&
            temp_flan_neighbors.right.floor === 'r' &&
            temp_flan_neighbors.left.floor === 'r');
        temp_flan.deconstruct();
        return condition;
    }
    flan_competing_for_t() {
        if (!this.going_to_t()) return false;
        var temp_flan = new Flan(this.tile, this.direction);
        temp_flan.move();
        var ret_val = temp_flan.neighbor_tiles().left.flan_going(temp_flan.right);
        temp_flan.deconstruct();
        if (ret_val.has_stepped) {
            return false;
        }
        return ret_val;
    }
    step() {
        if (this.has_stepped || this.stuck) {
            return
        };
        let next_flan = this.following();
        if (next_flan === this) {
            this.stuck = true;
            this.has_stepped = true;
            return;
        }
        if (this.looped) {
            this.has_stepped = true;
            this.move();
            if (next_flan) {
                next_flan.step();
            }
            return;
        }
        if (next_flan) {
            if (next_flan.looped || next_flan.stuck) {
                this.stuck = true;
                this.has_stepped = true;
                return;
            }
            if (next_flan.is_waiting) { // We found a new loop. Inform the others, then advance the whole loop.
                this.looped = true;
                let f = next_flan;
                while (f !== this) {
                    f.looped = true;
                    f = f.following();
                }
                //next_flan.looped = true;
                this.move();
                this.has_stepped = true;
                next_flan.step();
                return;
            }
            this.is_waiting = true;
            next_flan.step(); //let the next flan get out of the way.
            this.is_waiting = false;
            if (this.following()) { //the flan we are following could not move, or another flan took its place. Stop.
                if (this.following.looped || this.following.stuck) {
                    this.stuck = true;
                }
                this.has_stepped = true;
                return;
            }
            if (this.flan_competing_for_t()) { //let another flan into the procession. Stop.
                this.flan_competing_for_t().step();
                this.has_stepped = true;
                return;
            }
            // we can fill the space we were following. Move and stop.
            this.move();
            this.has_stepped = true;
            return;
        }
        //we are not following anyone, i.e. our target space is open.
        if (this.flan_competing_for_t()) { //let another flan into the procession. Stop.
            this.flan_competing_for_t().step();
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
                return document.getElementById("up_right_hog");
            case "E":
                return document.getElementById("down_right_hog");
            case "S":
                return document.getElementById("down_left_hog");
            case "W":
                return document.getElementById("up_left_hog");
        }
    }
}

class House {
    constructor(tile, direction, decorator = "") {
        //my properties
        this.tile = tile;
        this.direction = direction;
        this.decorator = decorator;
        this.flan = new Flan(this.tile, direction);
        //change other objects
        this.flan.decorator = decorator;
        this.tile.house = this;
    }
    get appearance() {
        return "H" + this.decorator + ARROWS[this.direction];
    }
    recall_flan() {
        this.flan.move_to(this.tile, this.direction);
        this.flan.holding = false;
        this.flan.gave_to = false;
        this.flan.took_from = false;
        this.tile.board.is_changed = true;
    }
    deconstruct() {
        this.flan.deconstruct();
        this.tile.house = false;
    }
    rotate(times = 1) {
        for (var i = 0; i < times; i++) {
            this.direction = {
                "N": "E",
                "E": "S",
                "S": "W",
                "W": "N"
            } [this.direction];
        }
        this.recall_flan();
        return this;
    }
    graphic() {
        switch (this.direction) {
            case "N":
                return document.getElementById("hole_up_right");
            case "E":
                return document.getElementById("hole_down_right");
            case "S":
                return document.getElementById("hole_down_left");
            case "W":
                return document.getElementById("hole_up_left");
        }
    }
}

class InteractionQueue {
    constructor() {
        this.pairs = []; //[[flan,interactable],...]
    }
    flans_of(interactable) {
        let pair_list = this.pairs.filter(pair => pair[1] === interactable);
        let list = [];
        for (let pair of pair_list) {
            list.push(pair[0]);
        }
        return list;
    }
    add_pair(flan, interactable) {
        this.pairs.push([flan, interactable]);
    }
    remove_pair(flan, interactable) {
        this.pairs.splice(this.pairs.indexOf([flan, interactable]), 1)
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
        for (let flan of this.board.flans) {
            flan.previous_holding = flan.holding;
            flan.gave_to = false;
            flan.took_from = false;
            flan.reset_interact_preferences();
        }
        for (let tile of this.board.tiles) {
            if (tile.interactable instanceof Giver) {
                tile.interactable.previous_resource_count = tile.interactable.resource_count;
            }
            if (tile.interactable instanceof Taker) {
                tile.interactable.previous_holding = tile.interactable.holding;
            }
        }
    }
    consult_next(flans, type, queue) { // don't call me when flans.length = 0
        let flan = flans.shift();
        if (flan.interact_preferences.length === 0) return;
        let target = flan.interact_preferences.shift();
        if (!(target instanceof type)) {
            flans.push(flan);
            return;
        }
        let preferred = target.prefers(flan, queue);
        if (!preferred) {
            flans.push(flan);
        } else {
            queue.add_pair(flan, target);
            if (preferred instanceof Flan) {
                flans.push(preferred);
                queue.remove_pair(preferred, target);
            }
        }
        return;
    }
    match() {
        let holderQueue = new InteractionQueue(),
            seekerQueue = new InteractionQueue();

        let activeFlans = this.board.flans.filter(flan => flan.hopped_from);

        let holders = activeFlans.filter(flan => flan.holding);
        while (holders.length > 0) {
            this.consult_next(holders, Taker, holderQueue);
        }
        holderQueue.resolve();

        for (let flan of activeFlans) {
            flan.reset_interact_preferences();
        }

        let seekers = activeFlans.filter(flan => !flan.holding);
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
    prefers(flan, queue) {
        let my_flans = queue.flans_of(this).filter(f => f.holding === flan.holding);
        if (my_flans.length < this.max_interactions(flan.holding.name)) return true; //indicates that there was no competition
        for (let competing_flan of my_flans) {
            if (this.tile_preferences.indexOf(flan.tile) < this.tile_preferences.indexOf(competing_flan.tile)) {
                return competing_flan;
            }
        }
        return false; //indicates that given flan is not preferred
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
    interact_with(flan) {
        this.take_from(flan);
    }
    take_from(flan) {
        this.holding.push(flan.holding);
        flan.holding = false;
        flan.gave_to = this.tiles.find(tile => tile.hasFlanAdjacent(flan));
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
    interact_with(flan) {
        this.give_to(flan);
    }
    give_to(flan, tile) {
        flan.holding = this.resourceType();
        flan.took_from = this.tiles.find(tile => tile.hasFlanAdjacent(flan));
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
        return document.getElementById("castle");
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
                return document.getElementById("berry_bush_2");
            case 1:
                return document.getElementById("berry_bush_1");
            default:
                return document.getElementById("berry_bush_0");
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
                return document.getElementById("tree_1");
            default:
                return document.getElementById("tree_0");
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
                return document.getElementById("shop_nw");
            case "NE":
                return document.getElementById("shop_ne");
            case "SW":
                return document.getElementById("shop_sw");
            case "SE":
                return document.getElementById("shop_se");
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
        if (previous) holdlist = this.previous_holding;
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

let RECIPES = {
    bread: {
        input: [
            ["berry", 1]
        ],
        output: ["bread", 1]
    },
    perfume: {
        input: [
            ["berry", 1],
            ["wood", 1]
        ],
        output: ["perfume", 1]
    },
    steak: {
        input: [
            ["berry", 1],
            ["wood", 2]
        ],
        output: ["steak", 1]
    }
}

class Resource {
    constructor(name) {
        this.name = name;
    }
    get graphic() {
		let graphic_id = "undefined_item";
		if( ["berry","wood","steak","bread","perfume"].includes(this.name) ){
			graphic_id = this.name;
		}
		return document.getElementById(graphic_id);
    }
    toString() {
        return this.name;
    }
}

class Game_window {
    constructor(board) {
        this.board = board;
        this.canvas = document.getElementById("myCanvas");
        this.context = this.canvas.getContext("2d");
        this.tile_size = 60;
        this.shift = {
            x: this.tile_size * this.board.height * Math.SQRT1_2,
            y: 20
        };
        this.canvas.addEventListener("click", this.my_click.bind(this));
        this.canvas.addEventListener("keydown", this.my_key_down.bind(this));
        this.canvas.addEventListener("keyup", this.my_key_up.bind(this));
        this.shift_speed = {
            x: 0,
            y: 0
        };
        this.keys = {
            up: false,
            down: false,
            left: false,
            right: false
        };
    }
    get tileWidth() {
        return this.tile_size * Math.SQRT2;
    }
    get tileHeight() {
        return this.tile_size * Math.SQRT1_2;
    }
    my_key_down(event) {
        var key = event.key;
        var stepsize = 3;
        switch (key) {
            case 'w':
            case 'W':
            case 'ArrowUp':
                if (!this.keys.up) {
                    this.keys.up = true;
                    this.shift_speed.y += stepsize;
                }
                break;
            case 'a':
            case 'A':
            case 'ArrowLeft':
                if (!this.keys.left) {
                    this.keys.left = true;
                    this.shift_speed.x += stepsize;
                }
                break;
            case 's':
            case 'S':
            case 'ArrowDown':
                if (!this.keys.down) {
                    this.keys.down = true;
                    this.shift_speed.y -= stepsize;
                }
                break;
            case 'd':
            case 'D':
            case 'ArrowRight':
                if (!this.keys.right) {
                    this.keys.right = true;
                    this.shift_speed.x -= stepsize;
                }
                break;
        }
    }
    my_key_up(event) {
        var key = event.key;
        switch (key) {
            case 'w':
            case 'W':
            case 'ArrowUp':
                this.keys.up = false;
                this.shift_speed.y = 0;
                break;
            case 'a':
            case 'A':
            case 'ArrowLeft':
                this.keys.left = false;
                this.shift_speed.x = 0;
                break;
            case 's':
            case 'S':
            case 'ArrowDown':
                this.keys.down = false;
                this.shift_speed.y = 0;
                break;
            case 'd':
            case 'D':
            case 'ArrowRight':
                this.keys.right = false;
                this.shift_speed.x = 0;
                break;
        }
    }
    shift_step() {
        this.shift.x += this.shift_speed.x;
        this.shift.y += this.shift_speed.y;
    }
    my_click(event) {
        var tile = this.tileAtClick(event.offsetX, event.offsetY);
        tile.on_click();
    }
    drawAt(graphic, x, y, spriteData = []) { //spriteData=[start_x,start_y,sprite_width,sprite_height]
        this.context.drawImage(graphic,
            ...spriteData,
            this.skewed_position_x(x, y) - (this.tileWidth / 2),
            this.skewed_position_y(x, y),
            this.tileWidth,
            this.tileHeight);
    }
    drawResourceAt(resource_name, x, y) {
        let resource = new Resource(resource_name),
            graphic = resource.graphic;
        this.context.drawImage(graphic,
            //...spriteData,
            this.skewed_position_x(x, y) - (this.tileWidth / 4),
            this.skewed_position_y(x, y),
            this.tile_size * 0.8,
            this.tile_size * 0.8);
    }
    draw_floor_at(x, y) {
        this.drawAt(document.getElementById("grass"), x, y);
    }
    draw_road_at(x, y) {
        if (this.board.tileAt(x, y).floor === '') return;
        this.drawAt(document.getElementById("road"), x, y);
    }
    skewed_position_x(x, y) {
        return (this.shift.x) + ((this.tile_size * Math.sqrt(0.5)) * (x + y + 1 - this.board.height));
    }
    skewed_position_y(x, y) {
        return (this.shift.y) + ((this.tile_size * Math.sqrt(0.5) * 0.5) * (x - y + this.board.height - 1));
    }
    skewed_position_inverse(x, y) {
        var horizontal_half = this.tile_size * Math.sqrt(0.5);
        var vertical_half = horizontal_half * 0.5;
        var newx = x - (this.shift.x + horizontal_half * (1 - this.board.height));
        var newy = y - (this.shift.y + vertical_half * (this.board.height - 1));
        newx /= horizontal_half;
        newy /= vertical_half;
        var obj = {
            x: (newx + newy) / 2,
            y: (newx - newy) / 2 + 1
        }; // I don't know why this 1 belongs here.
        return obj;
    }
    tileAtClick(x, y) { //feed me mouse coordinates
        var reduced_coords = this.skewed_position_inverse(x, y);
        reduced_coords.x = Math.floor(reduced_coords.x);
        reduced_coords.y = Math.floor(reduced_coords.y);
        return this.board.tileAt(reduced_coords.x, reduced_coords.y);
    }
    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    draw_flan_at(flan, x, y, fraction = 1) {
        var stack_separation = 10;
        var ctx = this.context;
        ctx.save();

        var new_x = x;
        var new_y = y;
        var new_coords = {
            x: this.skewed_position_x(new_x, new_y),
            y: this.skewed_position_y(new_x, new_y) - (stack_separation * flan.stack_position)
        };
        if (!flan.hopped_from || fraction >= 1) {
            var current_coords = new_coords;
        } else {
            var old_x = x;
            var old_y = y;
            switch (flan.direction) {
                case "N":
                    old_y -= 1;
                    break;
                case "S":
                    old_y += 1;
                    break;
                case "E":
                    old_x -= 1;
                    break;
                case "W":
                    old_x += 1;
                    break;
            }
            var old_coords = {
                x: this.skewed_position_x(old_x, old_y),
                y: this.skewed_position_y(old_x, old_y) - (stack_separation * flan.previous_stack_position)
            };
            var current_coords = this.hop_path(old_coords, new_coords, fraction);
        }

        ctx.translate(current_coords.x, current_coords.y);

        //draw self
        this.drawHere(flan, ctx);

        //draw any items we are moving
        if (fraction <= 1 && flan.previous_holding) {
            this.drawHere(flan.previous_holding, ctx);
        }
        if (2 > fraction && fraction > 1 && flan.holding && !flan.gave_to && !flan.took_from) {
            this.drawHere(flan.holding, ctx);
        }
        if (2 > fraction && fraction > 1 && flan.gave_to) {
            let from = {
                x: 0,
                y: 0
            };
            let to = {
                x: from.x,
                y: from.y
            }
            switch (flan.direction_of(flan.gave_to)) {
                case 'N':
                    to.x += this.tile_size * Math.sqrt(0.5);
                    to.y -= this.tile_size * Math.sqrt(0.125);
                    break;
                case 'E':
                    to.x += this.tile_size * Math.sqrt(0.5);
                    to.y += this.tile_size * Math.sqrt(0.125);
                    break;
                case 'S':
                    to.x -= this.tile_size * Math.sqrt(0.5);
                    to.y += this.tile_size * Math.sqrt(0.125);
                    break;
                case 'W':
                    to.x -= this.tile_size * Math.sqrt(0.5);
                    to.y -= this.tile_size * Math.sqrt(0.125);
                    break;
                default:
                    console.log('What? Error!');
            }
            let item_coords = this.hop_path(from, to, fraction - 1);
            ctx.drawImage(flan.previous_holding.graphic, -this.tile_size * 0.4 + item_coords.x, -this.tile_size * 0.2 + item_coords.y, this.tile_size * 0.8, this.tile_size * 0.8);
        }
        if (2 > fraction && fraction > 1 && flan.took_from) {
            let from = {
                x: 0,
                y: 0
            };
            let to = {
                x: from.x,
                y: from.y
            }
            switch (flan.direction_of(flan.took_from)) {
                case 'N':
                    to.x += this.tile_size * Math.sqrt(0.5);
                    to.y -= this.tile_size * Math.sqrt(0.125);
                    break;
                case 'E':
                    to.x += this.tile_size * Math.sqrt(0.5);
                    to.y += this.tile_size * Math.sqrt(0.125);
                    break;
                case 'S':
                    to.x -= this.tile_size * Math.sqrt(0.5);
                    to.y += this.tile_size * Math.sqrt(0.125);
                    break;
                case 'W':
                    to.x -= this.tile_size * Math.sqrt(0.5);
                    to.y -= this.tile_size * Math.sqrt(0.125);
                    break;
                default:
                    console.log('What? Error!')
            }
            let item_coords = this.hop_path(to, from, fraction - 1);
            ctx.drawImage(flan.holding.graphic, -this.tile_size * 0.4 + item_coords.x, -this.tile_size * 0.2 + item_coords.y, this.tile_size * 0.8, this.tile_size * 0.8);
        }
        if (fraction >= 2 && flan.holding) {
            this.drawHere(flan.holding, ctx);
        }

        ctx.restore();
    }
    drawHere(item, context) { //called by draw_flan_at
        context.drawImage(item.graphic, -this.tile_size * 0.4, -this.tile_size * 0.2, this.tile_size * 0.8, this.tile_size * 0.8);
    }
    draw_flans_at(x, y, fraction = 1) {
        var tile = this.board.tileAt(x, y);
        for (let flan of tile.flans) {
            this.draw_flan_at(flan, x, y, fraction);
        }
    }
    draw_house_at(x, y) {
        var house = this.board.tileAt(x, y).house;
        if (!house) return;

        this.drawAt(house.graphic(), x, y);
    }
    draw_interactable_at(x, y, fraction = 1) {
        let tile = this.board.tileAt(x, y);
        let interactable = tile.interactable;
        if (!interactable) {
            return;
        }



        let graphic = null;
        if (fraction <= 1) {
            graphic = interactable.previousGraphic();
        } else {
            graphic = interactable.currentGraphic();
        }

        let spriteData = interactable.spriteData(tile);

        this.drawAt(graphic, x, y, spriteData);
    }
    draw_shop_inventory_at(x, y, fraction = 3) {
        let tile = this.board.tileAt(x, y);
        let shopOut = tile.interactable;
        if (!(shopOut instanceof ShopOutput)) return;

        let horizontal_sep = this.tileWidth / 4,
            vertical_sep = this.tileHeight / 2,
            shop = shopOut.shop;

        let ctx = this.context;
        ctx.save();
        ctx.translate(shop.center_offset[0] * this.tileWidth, shop.center_offset[1] * this.tileHeight);

        let outlist = shop.output.pic_list(fraction < 2);
        let inlist = shop.input.pic_list(fraction < 2);

        ctx.save();
        ctx.translate(-horizontal_sep * (outlist.length - 1) / 2, -vertical_sep / 2);
        for (let pair of outlist) {
            if (pair[1]) {
                ctx.globalAlpha = 1;
            } else {
                ctx.globalAlpha = 0.5;
            }
            this.drawResourceAt(pair[0], x, y);
            ctx.translate(horizontal_sep, 0);
        }
        ctx.restore();
        ctx.translate(-horizontal_sep * (inlist.length - 1) / 2, vertical_sep / 2);
        for (let pair of inlist) {
            if (pair[1]) {
                ctx.globalAlpha = 1;
            } else {
                ctx.globalAlpha = 0.5;
            }
            this.drawResourceAt(pair[0], x, y);
            ctx.translate(horizontal_sep, 0);
        }

        ctx.restore();
    }
    hop_path(start, end, fraction) { //feed this objects with x and y
        var jumpheight = 60;
        var obj = {
            x: start.x * (1 - fraction) + end.x * fraction,
            y: start.y * (1 - fraction) + end.y * fraction - jumpheight * fraction * (1 - fraction)
        }
        return obj;
    }
    do_everywhere_visible(myfun, fraction = 1) {
        var first_coords = this.skewed_position_inverse(0, 0);
        first_coords.x = Math.floor(first_coords.x);
        first_coords.y = Math.floor(first_coords.y);
        var row_length = 2 + Math.floor(this.canvas.width / (this.tile_size * Math.sqrt(2)));
        var num_rows = 2 + Math.floor(this.canvas.height / (this.tile_size * Math.sqrt(0.5)));
        for (var row = 0; row < num_rows; row++) {
            for (var column = -1; column < row_length; column++) {
                myfun.call(this, first_coords.x + row + column, first_coords.y - row + column + 1, fraction);
            }
            for (var column = -1; column < row_length; column++) {
                myfun.call(this, first_coords.x + row + column, first_coords.y - row + column, fraction);
            }
        }
    }
    draw_visible(fraction = 1) {
        this.clear();
        this.do_everywhere_visible(this.draw_floor_at);
        this.do_everywhere_visible(this.draw_road_at);
        this.do_everywhere_visible(this.draw_house_at);
        this.do_everywhere_visible(this.draw_interactable_at, fraction * 3);
        this.do_everywhere_visible(this.draw_flans_at, fraction * 3);
        this.do_everywhere_visible(this.draw_shop_inventory_at, fraction * 3);
    }
}

var b = null;
$(document).ready(function() {
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

