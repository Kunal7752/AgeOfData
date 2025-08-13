// config/database.js - CORRECTED VERSION
const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      // CORRECTED PERFORMANCE OPTIMIZATIONS
      maxPoolSize: 10,          // Reduced for free tier
      minPoolSize: 2,           // Reduced for free tier
      maxIdleTimeMS: 30000,     // Close connections after 30 seconds of inactivity
      serverSelectionTimeoutMS: 30000, // How long to try selecting a server
      socketTimeoutMS: 45000,   // How long a send or receive on a socket can take
    });

    console.log(`MongoDB Connected: ${conn.connection.host}`);

    // CORRECTED: Set mongoose options (not connection options)
    mongoose.set('bufferCommands', false);
    
    // Set global query timeout using mongoose plugin
    mongoose.plugin((schema) => {
      schema.pre(/^find/, function() {
        if (!this.getOptions().maxTimeMS) {
          this.maxTimeMS(30000); // 30 second timeout for all queries
        }
      });
      
      schema.pre('aggregate', function() {
        if (!this.getOptions().maxTimeMS) {
          this.maxTimeMS(30000);
        }
      });
    });

    // Handle connection events
    mongoose.connection.on('error', (err) => {
      console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.log('MongoDB disconnected');
    });

    // Graceful shutdown
    process.on('SIGINT', async () => {
      await mongoose.connection.close();
      console.log('MongoDB connection closed through app termination');
      process.exit(0);
    });

  } catch (error) {
    console.error('Database connection failed:', error);
    process.exit(1);
  }
};

module.exports = connectDB;