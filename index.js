import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { connectDB } from './src/config/dbConnection.js';
import { cloudinaryConnection } from './src/config/cloudinary.config.js';
import apiRoutes from './src/routes/index.js';
import { requestLogger } from './src/middleware/requestLogger.js';
import { notFoundHandler, errorHandler } from './src/middleware/errorHandler.js';

// Load environment variables
dotenv.config();

// Connect to MongoDB
connectDB();

// Initialize Cloudinary
cloudinaryConnection();

const app = express();

// Global Middlewares
app.use(
  cors({
    origin: process.env.CLIENT_URL || '*',
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(requestLogger);

// Root route
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    name: 'Qaleen Bhaiya API',
    tagline: 'Handmade rugs, prayer mats, wall art and bespoke carpets from Bhadohi',
    version: '1.0.0',
    documentation: '/api/health',
  });
});

// Mount all API routes
app.use('/api', apiRoutes);

// 404 & Centralized Error Handlers
app.use(notFoundHandler);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

app.listen(PORT, () => {
  console.log(`✨ Qaleen Bhaiya Server listening on http://localhost:${PORT}`);
});

export default app;