import express from 'express';
import mustacheExpress from 'mustache-express';
import bodyParser from 'body-parser';

import router from './router.js';
import {loadSampleData} from './load_data.js'; // Import the loadSampleData function from load_data.js

const app = express(); 

app.use(express.static('./public')); // Serve static files from the public directory


//Templates engine config 
app.set('view engine', 'html');
app.engine('html', mustacheExpress('./views/partials', '.html'));
app.set('views', './views');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json()); // Middleware to parse JSON request bodies

// Use the router for all routes
app.use('/', router);

await loadSampleData(); // Load sample data into the database when the server starts

// Start the server and listen on port 3000
app.listen(3000, () => console.log('Web ready in http://localhost:3000/'));