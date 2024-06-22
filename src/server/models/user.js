const mongoose = require('mongoose');

// Define a schema for users to be stored in the database
const userSchema = mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }
});

// Export the schema to be used with the 'User' model
module.exports = mongoose.model('User', userSchema);
