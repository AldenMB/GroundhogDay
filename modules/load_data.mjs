let goods = {},
	images = {};

function get_goods(){
	return fetch('./goods.json')
		.then((response) => {
			return response.json();
		})
		.then((data) => {
			goods = Object.freeze(data);
		});
}

function get_images(){
	return fetch('./images/index.json')
		.then((response) => {
			return response.json();
		})
		.then((image_index) => {
			let images_from_index = Object.fromEntries(
				Object.entries(image_index).map(([name,url]) => [name, url_to_image(url)])
			);
			let images_from_goods = Object.fromEntries(
				Object.keys(goods).map(name => [name, url_to_image('images/goods/'+name+'.png')])
			);
			images = Object.freeze(Object.assign(images_from_index, images_from_goods));
		});
}

function url_to_image(url){
	let image = new Image();
	image.src = url;
	return image;
}

function load_data(){
	return Promise.all([get_goods().then(get_images)]);
}

export {load_data, images, goods}