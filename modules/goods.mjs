import {goods, images} from './load_data.mjs';

function aggregate_arrays(...args){
	return args.reduce( 
		(arr1, arr2) => arr1.map((e,i) => e+arr2[i])
	)
}

class Good {
	constructor(name, input_values_table, owner_number){
		this.name = name;
		if(this.recipe.type === 'crafted') {
			let total_input_values = aggregate_arrays(...input_values_table);
			this.value_array = total_input_values.map(val => val*this.recipe.value_multiplier);
		} else {
			this.value_array = new Array(MAX_PLAYERS).fill(0);
			this.value_array[owner_number] = this.recipe.base_value;
		}
	}
	get recipe() {
		return recipes[this.name];
	}
	get graphic() {
		return images[this.name];
	}
	get spriteData(){
		return [0,0,768,384];
	}
}

/*
NOTE TO SELF: 
make sure each recipe implements:
	name: {
		type: (crafted, crystal, basic)
		base_value:
		value_multiplier:
	}
*/

export {Good};