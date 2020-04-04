let recipes = {}
let images = {}

function get_recipes(){
	return fetch('./recipes.json')
		.then((response) => {
			return response.json();
		})
		.then((data) => {
			recipes = data;
		});
}

function get_images(){
	return fetch('./images/index.json')
		.then((response) => {
			return response.json();
		})
		.then((image_index) => {
			images = Object.fromEntries(
				Object.entries(image_index).map(([name,url]) => [name, url_to_image(url)])
			);
		});
}

function url_to_image(url){
	let image = new Image();
	image.src = url;
	return image;
}

function load_data(){
	return Promise.all([get_recipes(), get_images()]);
}

export {load_data, recipes, images}