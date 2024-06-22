const mongoose = require('mongoose');

// Define a schema for animals to be stored in the database
const animalSchema = mongoose.Schema({
    name: { type: String, required: true },
    scientificName: { type: String },
    class: { type: String },
    order: { type: String },
    location: { type: String },
    diet: { type: String },
    color: { type: String },
    temperament: { type: String },
    lifespan: { type: String },
    // Add the username field
    username: { type: String, required: true } 
});

// Export the schema to be used with the 'Animal' model
module.exports = mongoose.model('Animal', animalSchema);
