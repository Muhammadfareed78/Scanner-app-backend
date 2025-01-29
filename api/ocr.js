const vision = require('@google-cloud/vision');
const path = require('path');
const fs = require('fs');

const client = new vision.ImageAnnotatorClient({
    keyFilename: path.join(__dirname, 'sturdy-ranger-448813-f4-1c14f840b401.json'),
});

module.exports = async (req, res) => {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        if (!req.body.image) {
            return res.status(400).json({ error: 'No image data provided.' });
        }

        const imageBuffer = Buffer.from(req.body.image, 'base64'); // Ensure you're sending base64 images
        const request = { image: { content: imageBuffer } };

        const [result] = await client.textDetection(request);
        const detections = result.textAnnotations;

        let extractedText = detections.length > 0 ? detections[0].description : '';

        if (!extractedText.trim()) {
            return res.status(400).json({ error: 'No text detected in the image.' });
        }

        res.json({ text: extractedText });

    } catch (error) {
        console.error('OCR Error:', error);
        res.status(500).json({ error: 'Error processing image' });
    }
};
