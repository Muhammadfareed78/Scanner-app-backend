// const express = require("express");
// const Card = require("../Models/Card");
// const router = express.Router();

// // Get all cards
// router.get("/", async (req, res) => {
//     try {
//         const cards = await Card.find();
//         res.json(cards);
//     } catch (err) {
//         res.status(500).json({ error: "Failed to fetch cards" });
//     }
// });

// // Save a card
// router.post("/", async (req, res) => {
//     const { name, address, email, phone, website, image } = req.body;

//     try {
//         const newCard = new Card({ name, address, email, phone, website, image });
//         await newCard.save();
//         res.status(201).json(newCard);
//     } catch (err) {
//         res.status(400).json({ error: "Failed to save card" });
//     }
// });

// // Delete a card
// router.delete("/:id", async (req, res) => {
//     try {
//         await Card.findByIdAndDelete(req.params.id);
//         res.json({ success: true });
//     } catch (err) {
//         res.status(500).json({ error: "Failed to delete card" });
//     }
// });

// module.exports = router;
