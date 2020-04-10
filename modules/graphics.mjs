import {ShopOutput} from './hog_interactions.mjs';
import {images} from './load_data.mjs';

const ITEM_SPRITE_DATA = [0,0,768,384];

class GameWindow {
    constructor(board) {
        this.board = board;
        this.canvas = document.getElementById("myCanvas");
        this.context = this.canvas.getContext("2d");
        this.tile_size = 70;
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
	//PUBLIC
    draw_visible(fraction = 1) {
        this.clear();
        this.do_everywhere_visible(this.draw_floor_at);
        this.do_everywhere_visible(this.draw_road_at);
        this.do_everywhere_visible(this.draw_house_at);
        this.do_everywhere_visible(this.draw_interactable_at, fraction * 3);
        this.do_everywhere_visible(this.draw_hogs_at, fraction * 3);
        this.do_everywhere_visible(this.draw_shop_inventory_at, fraction * 3);
    }	
    shift_step() {
        this.shift.x += this.shift_speed.x;
        this.shift.y += this.shift_speed.y;
    }
	
	//PRIVATE
	
    get tile_width() {
        return this.tile_size * Math.SQRT2;
    }
    get tile_height() {
        return this.tile_size * Math.SQRT1_2;
    }
    my_key_down(event) {
        let key = event.key;
        let stepsize = 3;
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
        let key = event.key;
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
    my_click(event) {
        let tile = this.tileAtClick(event.offsetX, event.offsetY);
        tile.on_click();
    }
    drawAt(graphic, col, row, spriteData = []) { //spriteData=[start_x,start_y,sprite_width,sprite_height]
		this.context.drawImage(graphic,
            ...spriteData,
            this.skewed_position_x(col, row) - (this.tile_width / 2),
            this.skewed_position_y(col, row),
            this.tile_width,
            this.tile_height);
    }
    draw_floor_at(x, y) {
        this.drawAt(images['grass'], x, y);
    }
    draw_road_at(x, y) {
        if (this.board.tileAt(x, y).floor === 'r'){
			this.drawAt(images['road'], x, y);
		}
    }
    skewed_position_x(col, row) {
        return this.shift.x + this.tile_width/2 * (col + row + 1 - this.board.height);
    }
    skewed_position_y(col, row) {
        return this.shift.y + this.tile_height/2 * (col - row + this.board.height - 1);
    }
    skewed_position_inverse(x, y) {
        let scaledx = (x - this.shift.x)/this.tile_width,
			scaledy = (y - this.shift.y)/this.tile_height,
			obj = {
            col: Math.floor(scaledx + scaledy),
            row: Math.floor(scaledx - scaledy +this.board.height)
        };
        return obj;
    }
    tileAtClick(x, y) { //feed me mouse coordinates
        let reduced_coords = this.skewed_position_inverse(x, y);
        return this.board.tileAt(reduced_coords.col, reduced_coords.row);
    }
    clear() {
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }
    do_everywhere_visible(myfun, fraction = 1) {
        let first_coords = this.skewed_position_inverse(0, 0);
        let num_cols = Math.ceil(this.canvas.width / this.tile_width),
			num_rows = 1+Math.ceil(this.canvas.height / this.tile_height);
        for (let row = 0; row <= num_rows; row++) {
			let x = first_coords.col + row,
				y = first_coords.row - row;
            for (let column = -1; column <= num_cols; column++) {
                myfun.call(this, x + column, y + column + 1, fraction);
            }
            for (let column = -1; column <= num_cols; column++) {
                myfun.call(this, x + column, y + column, fraction);
            }
        }
    }
    hop_path(start, end, fraction) { //feed this objects with x and y
        let jumpheight = this.tile_height*2;
        let obj = {
            x: start.x * (1 - fraction) + end.x * fraction,
            y: start.y * (1 - fraction) + end.y * fraction - jumpheight * fraction * (1 - fraction)
        }
        return obj;
    }
    draw_house_at(x, y) {
        let house = this.board.tileAt(x, y).house;
        if(house){
			this.drawAt(house.graphic(), x, y);
		}
    }
    draw_interactable_at(x, y, fraction = 1) {
        let tile = this.board.tileAt(x, y);
        let inter = tile.interactable;
		if(inter){
			let graphic = (fraction <= 1) ? inter.previousGraphic() : inter.currentGraphic();
			let spriteData = inter.spriteData(tile);
			this.drawAt(graphic, x, y, spriteData);
		}
        
    }
    draw_hogs_at(x, y, fraction = 1) {
        let tile = this.board.tileAt(x, y);
        for (let hog of tile.hogs) {
            this.draw_hog_at(hog, x, y, fraction);
        }
    }
	skew_x(direction){
		let distance = this.tile_width/2;
		if(['W','S'].includes(direction)){
			distance *= -1;
		}
		return distance;
	}
	skew_y(direction){
		let distance = this.tile_height/2;
		if(['W','N'].includes(direction)){
			distance *= -1;
		}
		return distance;
	}	
    draw_hog_at(hog, col, row, fraction = 1) {
        const stack_separation = 10;
        let ctx = this.context;
        ctx.save();
		
		if(hog.hopped_from && fraction<1){
			let hop_shift = this.hop_path(
				{	x: -this.skew_x(hog.direction),
					y: -this.skew_y(hog.direction) - stack_separation*hog.previous_stack_position
				},
				{	x: 0,
					y: -stack_separation*hog.stack_position
				},
				fraction
			);
			ctx.translate(hop_shift.x, hop_shift.y);
		}
		if(fraction>=1){
			ctx.translate(0, -stack_separation*hog.stack_position);
		}
		ctx.translate(0,-this.tile_height/4);
		this.drawAt(hog.graphic, col, row, [-100,0,800,500]);
		
        //draw any items we are moving
		ctx.translate(this.tile_width/3,0); //controls position of goods on hog
        if (fraction <= 1 && hog.previous_holding) {
			this.drawAt(images[hog.previous_holding], col, row,ITEM_SPRITE_DATA);
        }
        if (2 > fraction && fraction > 1 && hog.holding && !hog.gave_to && !hog.took_from) {
			this.drawAt(images[hog.holding], col, row,ITEM_SPRITE_DATA);
        }
        if (2 > fraction && fraction > 1 && hog.gave_to) {
            let from = {x:0,y:0};
            let to = {
                x: this.skew_x(hog.direction_of(hog.gave_to)),
                y: this.skew_y(hog.direction_of(hog.gave_to))
            }
            let item_coords = this.hop_path(from, to, fraction - 1);
			ctx.translate(item_coords.x,item_coords.y);
			this.drawAt(images[hog.previous_holding], col, row,ITEM_SPRITE_DATA);
        }
        if (2 > fraction && fraction > 1 && hog.took_from) {
            let to = {x:0,y:0};
            let from = {
                x: this.skew_x(hog.direction_of(hog.took_from)),
                y: this.skew_y(hog.direction_of(hog.took_from))
            }
            let item_coords = this.hop_path(from, to, fraction - 1);
			ctx.translate(item_coords.x,item_coords.y);
			this.drawAt(images[hog.holding], col, row,ITEM_SPRITE_DATA);
        }
        if (fraction >= 2 && hog.holding) {
			this.drawAt(images[hog.holding], col, row,ITEM_SPRITE_DATA);
        }

        ctx.restore();
    }
    draw_shop_inventory_at(x, y, fraction = 3) {
        const shopOut = this.board.tileAt(x, y).interactable;
        if (!(shopOut instanceof ShopOutput)) return;

        const horizontal_sep = this.tile_width / 3,
            vertical_sep = this.tile_height / 2,
            shop = shopOut.shop;

        const ctx = this.context;
        ctx.save();
        ctx.translate(
			shop.center_offset[0] * this.tile_width,
			shop.center_offset[1] * this.tile_height
		);

        let outlist = shop.output.pic_list(fraction < 1);
        let inlist = shop.input.pic_list(fraction < 2);
		
		function draw_list(list){
			ctx.translate(-horizontal_sep * (list.length - 1) / 2, 0);
			for (let pair of list) {
				ctx.globalAlpha = pair[1] ? 1 : 0.5;
				this.drawAt(images[pair[0]], x, y, ITEM_SPRITE_DATA);
				ctx.translate(horizontal_sep, 0);
			}
		}
		draw_list = draw_list.bind(this);
		
		ctx.translate(this.tile_width/3, 0);
		
        ctx.save();
		ctx.translate(0, -vertical_sep/2);
		draw_list(outlist);
        ctx.restore();
		
		ctx.translate(0, vertical_sep/2);
		draw_list(inlist);
		
        ctx.restore();
    }

}


export {GameWindow};