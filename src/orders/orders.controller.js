const path = require("path");

// Use the existing order data
const orders = require(path.resolve("src/data/orders-data"));

// Use this function to assigh ID's when necessary
const nextId = require("../utils/nextId");

function list(req, res) {
    res.json({ data: orders})
}

function read(req, res) {
    res.json({data: res.locals.order});
}

function create(req, res) {
    const {data: {deliverTo, mobileNumber, dishes = []} = {}} = req.body;
    const newOrder = {
        id: nextId(),
        deliverTo,
        mobileNumber,
        dishes
    }
    orders.push(newOrder);
    res.
    status(201).json({data: newOrder});
}

function update(req, res) {
    const {orderId} = req.params;
    const {data: {deliverTo, mobileNumber, status, dishes = []} } = req.body;

    const foundOrder = orders.find(order => order.id === orderId);

    foundOrder.deliverTo = deliverTo;
    foundOrder.mobileNumber = mobileNumber;
    foundOrder.status = status;
    foundOrder.dishes = dishes;

    res.json({data: foundOrder}) 
}

function destroy(req, res, next) {
    const {orderIndex} = res.locals;
    
    orders.splice(orderIndex, 1);
    return res.sendStatus(204);    
}

function checkIfPending(req, res, next) {
    const { orderId } = req.params;
    const index = orders.findIndex((order) => order.id === orderId);

    if (index > -1) {
        res.locals.orderIndex = index;
        if (orders[index].status === "pending") {
            return next(); // Allow deletion if status is "pending"
        } 
        next({
            status: 400,
            message: `Order cannot be deleted as status is not "pending"`
        });
    } else {
        next({
            status: 404,
            message: `Order id not found: ${orderId}`
        }); 
    }
}

function orderExists(req, res, next) {
    const {orderId} = req.params;
    const foundOrder = orders.find(order => order.id === orderId);

    if (foundOrder) {
        res.locals.order = foundOrder;
        return next();
    }
    next({
        status: 404,
        message: `Order id not found: ${orderId}`
    })
}

function hasProperty(property) {
    return function(req, res, next) {
        const {data = {}} = req.body;
        
        if (data[property]) {
            return next();
        }

        next({
            status: 400,
            message: `Order must include a ${property}`
        })
    }
}

function dishNotEmpty(req, res, next) {
    const { data: {dishes} = {}} = req.body;
    if (Array.isArray(dishes) && dishes.length > 0) {
        return next()
    }
    next({
        status: 400,
        message: `dish should not be empty`
    })
}

function dishHasProperty(property) {
    return function(req, res, next) {
        const { data: { dishes } = {} } = req.body;

        if (Array.isArray(dishes) && dishes.length > 0) {
            for (let i = 0; i < dishes.length; i++) {
                const dish = dishes[i];
                // Check if the property is missing
                if (!dish.hasOwnProperty(property)) {
                    return next({
                        status: 400,
                        message: `dish ${i} must have a ${property} that is an integer greater than 0`
                    });
                }
            }
            return next(); // Proceed if all dishes have the property
        }

        next({
            status: 400,
            message: `Dishes must be a non-empty array`
        });
    };
}

function dishNumberInputIsValid(property) {
    return function(req, res, next) {
        const { data: { dishes } = {} } = req.body;

        for (let i = 0; i < dishes.length; i++) {
            const dish = dishes[i];
            const num = dish[property];
            // Validate that the property is a number, is an integer, and is greater than 0
            if (typeof num !== 'number' || isNaN(num) || num <= 0 || !Number.isInteger(num)) {
                return next({
                    status: 400,
                    message: `Dish ${i} has invalid ${property}: ${num}`
                });
            }
        }
        return next();
    };
}

function idIsSame(req, res, next) {
    const {orderId} = req.params;
    const {data : {id} = {}} = req.body;
    if (id == null || id === "" || orderId === id) {
        return next();
    }
    
    next({
        status: 400,
        message: `Order id does not match route id. Order: ${id}, Route: ${orderId}.`
    })
}

function statusPropertyIsValid(req, res, next) {
    const { data: { status } = {} } = req.body;
    const validStatus = ["pending", "preparing", "out-for-delivery", "delivered"];
    if (validStatus.includes(status)) {
      return next();
    }
    next({
      status: 400,
      message: `Order must have a status of pending, preparing, out-for-delivery, delivered`,
    });
}

function checkIfDelivered(req, res, next) {
    const {data: {status} = {}} = req.body;

    if (status === "delivered") {
        return next({
            status: 400,
            message: `A delivered order cannot be changed`
        });
    }
    next();
}

module.exports = {
    list,
    read: [orderExists, read],
    create: [
        hasProperty("deliverTo"),
        hasProperty("mobileNumber"),
        hasProperty("dishes"),
        dishNotEmpty,
        dishHasProperty("quantity"),
        dishNumberInputIsValid("quantity"),
        create
    ],
    update: [
        orderExists, 
        idIsSame,
        hasProperty("deliverTo"),
        hasProperty("mobileNumber"),
        hasProperty("dishes"),
        hasProperty("status"),
        statusPropertyIsValid,
        dishNotEmpty,
        dishHasProperty("quantity"),
        dishNumberInputIsValid("quantity"),
        checkIfDelivered,
        update],
    delete: [orderExists, checkIfPending, destroy]
}