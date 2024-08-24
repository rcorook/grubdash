const path = require("path");

// Use the existing dishes data
const dishes = require(path.resolve("src/data/dishes-data"));

// Use this function to assign ID's when necessary
const nextId = require("../utils/nextId");

function list(req, res) {
    res.json({ data: dishes})
}

function read(req, res) {
    res.json({data: res.locals.dish});
}

function create(req, res) {
    const {data: {name, description, price, image_url} = {}} = req.body;
    const newDish = {
        id: nextId(),
        name,
        description,
        price,
        image_url
    }

    dishes.push(newDish);
    res.status(201).json({data: newDish});
}

function update(req, res) {
    const {dishId} = req.params;
    const {data: {name, description, price, image_url} = {}} = req.body;
    const foundDish = dishes.find(dish => dish.id === dishId);

    foundDish.name = name;
    foundDish.description = description;
    foundDish.price = Number(price);
    foundDish.image_url = image_url;

    res.json({data: foundDish})  ; 
}

function dishExists(req, res, next) {
    const {dishId} = req.params;
    const foundDish = dishes.find(dish => dish.id === dishId);

    if (foundDish) {
        res.locals.dish = foundDish;
        return next();
    }
    next({
        status: 404,
        message: `Dish does not exist: ${dishId}.`
    })
}

function hasProperty(property) {
    return function(req, res, next) {
        const {data = {}} = req.body;
        
        if (data[property] && data[property] !== "") {
            return next();
        }

        next({
            status: 400,
            message: `Dish must include a ${property}`
        })
    }
}

function hasPriceProperty(req, res, next) {
    const {data = {}} = req.body;
        
        if (data["price"] === 0 || data["price"]) {
            return next();
        }

        next({
            status: 400,
            message: `Dish must include a price`
        })
}

function priceIsValid(req, res, next) {
    const { data: {price} = {}} = req.body;
    
    if (typeof price === 'number' && !isNaN(price) && price > 0) {
        return next();
    }
    next({
        status: 400,
        message: "Dish must have a price that is an integer greater than 0"
    });
}

function idIsSame(req, res, next) {
    const {dishId} = req.params;
    const {data : {id} = {}} = req.body;
    if ( !id || dishId === id) {
        return next();
    }
    next({
        status: 400,
        message: `Dish id ${id} does not match route id: ${dishId}`
    })
}

module.exports = {
    list,
    read: [dishExists, read],
    create: [ hasProperty("name"), 
              hasProperty("description"),
              hasPriceProperty,
              priceIsValid,
              hasProperty("image_url"),
              create
            ],
    update: [ dishExists,
              idIsSame,
              hasProperty("name"), 
              hasProperty("description"),
              hasPriceProperty,
              priceIsValid,
              hasProperty("image_url"),
              update
            ]
}