const express = require("express");
const bodyParser = require("body-parser");
const mongoose = require("mongoose");
const app = express();
const router = express.Router();
const _ = require("lodash");
const path = require("path");

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({ extended: true }));

// Serve static files from the "public" directory
app.use(express.static(path.join(/public/css, "/public")));

// Retrieve the MongoDB URI from the environment variable
const MONGODB_URI = process.env.MONGODB_URI;

mongoose.connect(MONGODB_URI, {
	useNewUrlParser: true,
});

//Created Schema
const itemsSchema = new mongoose.Schema({
	name: String,
});

//Created model
const Item = mongoose.model("Item", itemsSchema);

//Creating items
const item1 = new Item({
	name: "Welcome to your todo list.",
});

const item2 = new Item({
	name: "Hit + button to create a new item.",
});

const item3 = new Item({
	name: "<-- Hit this to delete an item.",
});

const listSchema = {
	name: String,
	items: [itemsSchema],
};
//Storing items into an array

const defaultItems = [item1, item2, item3];

const List = mongoose.model("List", listSchema);

Item.find({})
	.then((foundItems) => {
		if (foundItems.length === 0) {
			return Item.insertMany(defaultItems);
		}
	})
	.then(() => {
		console.log("Default items inserted or already exist.");
	})
	.catch((err) => {
		console.error("Error inserting or checking default items:", err);
	});

app.get("/", function (req, res) {
	Item.find({})
		.then((foundItems) => {
			res.render("list", { listTitle: "Today", newListItems: foundItems });
		})
		.catch((err) => {
			console.error("Error finding items:", err);
		});
});

app.post("/", async function (req, res) {
	try {
		const itemName = req.body.newItem;
		const listName = req.body.list;

		const item = new Item({
			name: itemName,
		});

		if (listName === "Today") {
			await item.save();
			res.redirect("/");
		} else {
			const foundList = await List.findOne({ name: listName });
			foundList.items.push(item);
			await foundList.save();
			res.redirect("/" + listName);
		}
	} catch (err) {
		// Handle any errors that occur during the execution
		console.error(err);
		res.status(500).send("Internal Server Error");
	}
});

app.get("/:customListName", function (req, res) {
	const customListName = _.capitalize(req.params.customListName);

	List.findOne({ name: customListName })
		.then(function (foundList) {
			if (!foundList) {
				// Create a new list
				const list = new List({
					name: customListName,
					items: defaultItems,
				});

				return list.save();
			} else {
				// Show an existing list
				res.render("list", {
					listTitle: foundList.name,
					newListItems: foundList.items,
				});
			}
		})
		.then(function (result) {
			// Log the result parameter to the console to review it
			console.log("Successfully loaded the list.");
			res.redirect("/" + customListName);
		})
		.catch(function (err) {
			console.error(err);
		});
});

app.post("/delete", async (req, res) => {
	const checkedItemId = req.body.checkbox;
	const listName = req.body.listName;

	try {
		if (listName === "Today") {
			await Item.findByIdAndRemove(checkedItemId);
			console.log("Successfully deleted checked item.");
			res.redirect("/");
		} else {
			await List.findOneAndUpdate(
				{ name: listName },
				{ $pull: { items: { _id: checkedItemId } } }
			);
			console.log("Successfully removed item from list.");
			res.redirect("/" + listName);
		}
	} catch (err) {
		console.error(err);
		res.status(500).send("Internal Server Error");
	}
});

app.get("/work", function (req, res) {
	res.render("list", { listTitle: "Work List", newListItems: workItems });
});

app.get("/about", function (req, res) {
	res.render("about");
});

app.listen(3000, function () {
	console.log("Server started on port 3000");
});
