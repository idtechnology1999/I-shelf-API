require('./config/env');

const express = require('express');
const cors = require('cors');
const path = require('path');
const { PORT } = require('./config/env');
const connectDB = require('./config/db');

const authorRoutes = require('./Routes/author');
const readerRoutes = require('./Routes/reader');
const adminRoutes = require('./Routes/admin');



const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Connect Database
connectDB();


// Routes
app.use('/api/authors', authorRoutes);
app.use('/api/author', authorRoutes); // Alias for singular form
app.use('/api/readers', readerRoutes);
app.use('/api/admin', adminRoutes);


app.get('/', (req, res) => {
  res.send('Server is running 🚀');
});


app.listen(PORT || 5000, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});

