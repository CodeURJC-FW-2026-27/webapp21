import express from 'express';
import mustacheExpress from 'mustache-express';
import bodyParser from 'body-parser';

import router from './router.js';
import { handleMulterError } from './imageStorage.js';
import { loadSampleData } from './load_data.js';

const app = express();

app.use(express.static('./public'));
app.use('/uploads', express.static('./uploads'));

// Template engine configuration
app.set('view engine', 'html');
app.engine('html', mustacheExpress('./views/partials', '.html'));
app.set('views', './views');

app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.json());

// Main application router
app.use('/', router);

// Global error handler for Multer upload errors
app.use(handleMulterError);

// Load sample data if the database is empty
await loadSampleData();

// Start the server
app.listen(3000, () => console.log('Web ready in http://localhost:3000/'));
