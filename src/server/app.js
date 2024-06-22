const express = require('express');
const morgan = require('morgan');
const bodyParser = require('body-parser');
const path = require('path');
const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

require('dotenv').config();
const app = express();

// Import the Animal schema
const Animal = require('./models/animal');
const User = require('./models/user');
const animal = require('./models/animal');

//-----------------------------------------------utilities-----------------------------------------------//
//connect to mongo db
mongoose.connect(
    'mongodb+srv://brian:' + process.env.MONGO_ATLAS_PW + '@cluster0.qwyjhcl.mongodb.net/'
    //'mongodb+srv://brian:frost1234567890@cluster0.qwyjhcl.mongodb.net/'
);
//use default nodejs promise instead of mongoose promise, to not see deprecation warning and such
mongoose.Promise = global.Promise;

//add headers to all response to handle CORS error
app.use((req, res, next) => {
    //allow header, * means any header like http etc
    res.header('Access-Control-Allow-Origin', '*');
    //allow headers, the value * means aloow any kind of header
    res.header(
        'Access-Control-Allow-Headers',
        'Origin, X-Requested-With, Content-Type, Accept, Authorization'
    );
    if (req.method === 'Options') {
        res.header('Access-Control-Allow-Methods', 'PUT, POST, PATCH, DELETE, GET');
        return res.status(200).json({});
    }
    // so that it dosent get stuck at the if and proceed
    next();
});

app.use(morgan('dev'));
//static function allows a folder 'uploads' to be available publicly
//only apply to req that has /uploads 
//ignores the /upload part in address
app.use('/uploads', express.static('uploads'));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Serve static files from the "client" directory
app.use(express.static(path.join(__dirname, '../client')));
//-----------------------------------------------utilities-----------------------------------------------//

//-----------------------------------------------token authentication function-----------------------------------------------//
const authenticate = (req, res, next) => {
    const token = req.headers.authorization && req.headers.authorization.split(' ')[1];
    
    if (!token) {
        return res.status(401).json({ message: 'Authentication failed' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.userData = decoded;
        req.username = decoded.username; // Attach the username to the request object
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Authentication failed' });
    }
};
//-----------------------------------------------token authentication function-----------------------------------------------//

//-----------------------------------------------default page-----------------------------------------------//
app.get('/', (req, res) => {
    //fetch login.html
    res.sendFile(path.join(__dirname, '../client/login.html'));
});

app.get('/login.html', (req, res) => {
    res.sendFile(path.join(__dirname, '../client/login.html'));
});

app.get('/index.html', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/index.html'));
});

app.get('/animals.html', authenticate, (req, res) => {
    res.sendFile(path.join(__dirname, '../client/animals.html'));
});
//-----------------------------------------------default page-----------------------------------------------//

//-----------------------------------------------api call-----------------------------------------------//
//define /api/search route
app.get('/api/search', authenticate, (req, res) => {
    //api link
    //https://api-ninjas.com/api/animals 
    const key = process.env.ANIMAL_API_KEY;
    //get animal name from req
    const name = req.query.name;
    //set api key in header
    const headers = new Headers({
        'X-Api-Key': key
    });
    //api query
    const str = `https://api.api-ninjas.com/v1/animals?name=${name}`;

    // Make a request with the headers
    fetch(str, { headers })
    //get response
    .then(response => {
        //if response has a problem
        if (!response.ok) {
            throw new Error('Network response was not ok');
        }
        return response.json();
    })
    //get fetched data
    .then(data => {
        //display data in console
        console.log(data);
        //send fetched data back to client
        res.json(data);
    })
    .catch(error => {
        console.error('Error fetching data: ', error);
        res.status(500).send('Error fetching data');
    })
})

// Fetch animals saved by the logged-in user
app.get('/api/myanimals', authenticate, async (req, res) => {
    try {
        const username = req.query.username; // Extract username from authenticated request
        console.log("Fetching animals with username: " + username);

        // Fetch animals from the database for the logged-in user
        const animals = await Animal.find({ username });
        res.status(200).json(animals);
    } catch (error) {
        console.error('Error fetching animals:', error);
        res.status(500).json({ error: 'Failed to fetch animals' });
    }
});
//-----------------------------------------------api call-----------------------------------------------//

//-----------------------------------------------save data to db-----------------------------------------------//
// Save data to the database
app.post('/api/save', authenticate, (req, res) => {
    const { name, scientificName, classType, order, location, diet, color, temperament, lifespan, username } = req.body;
    // Create a new Animal object using the provided data and the authenticated username
    const newAnimal = new Animal({
        name,
        scientificName,
        class: classType,
        order,
        location,
        diet,
        color,
        temperament,
        lifespan,
        username // Add the username to the animal data
    });

    // Save the newAnimal object to the database
    newAnimal.save()
        .then(savedAnimal => {

            console.log('Animal data saved:', savedAnimal);
            res.status(200).json({ message: 'Animal data saved successfully' });
        })
        .catch(error => {
            console.error('Error saving animal data:', error);
            res.status(500).json({ error: 'Failed to save animal data' });
        });
});
//-----------------------------------------------save data to db-----------------------------------------------//

//-----------------------------------------------remove animal-----------------------------------------------//
// Define route to remove an animal
// Define route to remove an animal
app.delete('/api/remove/:animalId', authenticate, async (req, res) => {
    const { animalId } = req.params;

    try {
        // Check if the animal exists
        const animal = await Animal.findOne({ _id: animalId });
        if (!animal) {
            return res.status(404).json({ error: 'Animal not found' });
        }

        // Ensure the authenticated user owns this animal (optional, depending on your application logic)

        // Remove the animal from the database
        await animal.deleteOne(); // Use deleteOne instead of findByIdAndRemove

        res.status(200).json({ message: 'Animal removed successfully' });
    } catch (error) {
        console.error('Error removing animal:', error);
        res.status(500).json({ error: 'Failed to remove animal' });
    }
});

//-----------------------------------------------remove animal-----------------------------------------------//

//-----------------------------------------------user signup-----------------------------------------------//
app.post('/user/signup', async (req, res) => {
    const { username, password } = req.body;

    try {
        console.log('Signup request received', { username, password });

        // Check if the user already exists
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            console.log('Username already exists');
            return res.status(400).json({ error: 'Username already exists' });
        }

        // Hash the password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('Password hashed successfully');

        // Create a new user
        const newUser = new User({
            username,
            password: hashedPassword
        });

        // Save the user to the database
        await newUser.save();
        console.log('User saved successfully');

        res.status(201).json({ message: 'User created successfully' });
    } catch (error) {
        console.error('Error during sign-up:', error);
        res.status(500).json({ error: 'Failed to create user' });
    }
});
//-----------------------------------------------user signup-----------------------------------------------//

//-----------------------------------------------user login-----------------------------------------------//
app.post('/user/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(400).json({ error: 'Invalid username or password' });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '24h' });
        res.status(200).json({ message: 'Login successful', token, username, redirectTo: '/index.html' });
    } catch (error) {
        console.error('Error during login:', error);
        res.status(500).json({ error: 'Failed to log in' });
    }
});
//-----------------------------------------------user login-----------------------------------------------//

module.exports = app;