import {ShopOutput} from './hog_interactions.mjs';
import {mod} from './utilities.mjs';
import {images} from './load_data.mjs';

class GameWindow {
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
        this.drawAt(images['grass'], x, y);
    }
    draw_road_at(x, y) {
        if (this.board.tileAt(x, y).floor === '') return;
        this.drawAt(images['road'], x, y);
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
    draw_hog_at(hog, x, y, fraction = 1) {
        var stack_separation = 10;
        var ctx = this.context;
        ctx.save();

        var new_x = x;
        var new_y = y;
        var new_coords = {
            x: this.skewed_position_x(new_x, new_y),
            y: this.skewed_position_y(new_x, new_y) - (stack_separation * hog.stack_position)
        };
        if (!hog.hopped_from || fraction >= 1) {
            var current_coords = new_coords;
        } else {
            var old_x = x;
            var old_y = y;
            switch (hog.direction) {
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
                y: this.skewed_position_y(old_x, old_y) - (stack_separation * hog.previous_stack_position)
            };
            var current_coords = this.hop_path(old_coords, new_coords, fraction);
        }

        ctx.translate(current_coords.x, current_coords.y);

        //draw self
        this.drawHere(hog, ctx);

        //draw any items we are moving
        if (fraction <= 1 && hog.previous_holding) {
            this.drawHere(hog.previous_holding, ctx);
        }
        if (2 > fraction && fraction > 1 && hog.holding && !hog.gave_to && !hog.took_from) {
            this.drawHere(hog.holding, ctx);
        }
        if (2 > fraction && fraction > 1 && hog.gave_to) {
            let from = {
                x: 0,
                y: 0
            };
            let to = {
                x: from.x,
                y: from.y
            }
            switch (hog.direction_of(hog.gave_to)) {
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
            ctx.drawImage(hog.previous_holding.graphic, -this.tile_size * 0.4 + item_coords.x, -this.tile_size * 0.2 + item_coords.y, this.tile_size * 0.8, this.tile_size * 0.8);
        }
        if (2 > fraction && fraction > 1 && hog.took_from) {
            let from = {
                x: 0,
                y: 0
            };
            let to = {
                x: from.x,
                y: from.y
            }
            switch (hog.direction_of(hog.took_from)) {
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
            ctx.drawImage(hog.holding.graphic, -this.tile_size * 0.4 + item_coords.x, -this.tile_size * 0.2 + item_coords.y, this.tile_size * 0.8, this.tile_size * 0.8);
        }
        if (fraction >= 2 && hog.holding) {
            this.drawHere(hog.holding, ctx);
        }

        ctx.restore();
    }
    drawHere(item, context) { //called by draw_hog_at
        context.drawImage(item.graphic, -this.tile_size * 0.4, -this.tile_size * 0.2, this.tile_size * 0.8, this.tile_size * 0.8);
    }
    draw_hogs_at(x, y, fraction = 1) {
        var tile = this.board.tileAt(x, y);
        for (let hog of tile.hogs) {
            this.draw_hog_at(hog, x, y, fraction);
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
        this.do_everywhere_visible(this.draw_hogs_at, fraction * 3);
        this.do_everywhere_visible(this.draw_shop_inventory_at, fraction * 3);
    }
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

export {GameWindow, Resource};