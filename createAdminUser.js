// createAdminUser.js

const mongoose = require('mongoose');
require('./app'); // Include your app.js file to ensure the User model is registered

const User = mongoose.model('User');

const createAdminUser = async () => {
  try {
    // Check if the admin user already exists
    const adminExists = false

    if (!adminExists) {
      // Create the admin user in the database
      await User.create({ username: 'realAdmin', password: 'Alma1234', isAdmin: true });
      console.log('Admin user created successfully.');
    } else {
      console.log('Admin user already exists.');
    }

    // Close the MongoDB connection
    mongoose.connection.close();
  } catch (error) {
    console.error('Error creating admin user:', error);
  }
};

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/shift-scheduler', { useNewUrlParser: true, useUnifiedTopology: true });

// Run the createAdminUser function
createAdminUser();
