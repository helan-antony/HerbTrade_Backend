// ML Service Integration for HerbTrade Backend
// This file contains the API endpoints to connect the ML services to your existing backend

const express = require('express');
const axios = require('axios');
const cors = require('cors');

const router = express.Router();

// Configuration for ML services
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || 'http://localhost:5000';

// Endpoint for herb recommendations
router.post('/recommendations', async (req, res) => {
    try {
        const { user_id } = req.body;
        
        // Call the ML service for recommendations
        const response = await axios.post(`${ML_SERVICE_URL}/api/ml/recommendations`, {
            user_id: user_id
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error getting recommendations:', error.message);
        res.status(500).json({ error: 'Failed to get recommendations' });
    }
});

// Endpoint for demand forecasting
router.post('/forecast', async (req, res) => {
    try {
        const { product_id } = req.body;
        
        // Call the ML service for forecasting
        const response = await axios.post(`${ML_SERVICE_URL}/api/ml/forecast`, {
            product_id: product_id
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error getting forecast:', error.message);
        res.status(500).json({ error: 'Failed to get forecast' });
    }
});

// Endpoint for quality assessment
router.post('/quality-check', async (req, res) => {
    try {
        // For image quality assessment, you would typically receive base64 encoded image
        const { image_data } = req.body;
        
        // Call the ML service for quality assessment
        const response = await axios.post(`${ML_SERVICE_URL}/api/ml/quality-check`, {
            image_data: image_data
        });
        
        res.json(response.data);
    } catch (error) {
        console.error('Error checking quality:', error.message);
        res.status(500).json({ error: 'Failed to assess quality' });
    }
});

module.exports = router;