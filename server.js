// backend/server.js
const express = require('express');
const cors = require('cors');
const vision = require('@google-cloud/vision');
const multer = require('multer');
const path = require('path');

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Multer configuration for handling image uploads
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Google Cloud Vision API Client
const client = new vision.ImageAnnotatorClient({
    keyFilename: path.join(__dirname, 'sturdy-ranger-448813-f4-1c14f840b401.json'),
});

// --- Information Extraction Function ---
function extractInformation(text) {
    let name = null;
    let email = null;
    let phone = null;
    let address = null;
    let website = null;
    let company = null; // For Company Name
    let designation = null; // For Profession/Designation

    const lines = text.split('\n').map(line => line.trim()).filter(line => line); // Trim and remove empty lines

    let possibleNameLines = []; // Store lines that look like name candidates
    let addressLines = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].toLowerCase();

        // --- Email Extraction --- (Improved Regex)
        if (!email && (line.includes('@') || /email[:\s]|e-mail[:\s]|mail[:\s]|ईमेल[:\s]/.test(line))) {
            const emailRegex = /([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g; // More general email regex
            const emailMatch = line.match(emailRegex);
            if (emailMatch) {
                email = emailMatch[0];
            }
            continue;
        }

        // --- Phone Extraction --- (Improved Regex and Keywords)
        if (!phone && (line.match(/[\d-+\s()]{7,}/) || /phone[:\s]|mobile[:\s]|contact[:\s]|tel[:\s]|ph[:\s]|mob[:\s]|number[:\s]|call[:\s]|फ़ोन[:\s]|मोबाइल[:\s]|संपर्क[:\s]*/.test(line))) {
            const phoneRegex = /(\+\d{1,3}\s?)?(\(\d{1,4}\)\s?)?(\d{1,4})[\s.-]?(\d{1,4})[\s.-]?(\d{1,4})/g; // More general phone regex
            const phoneMatch = line.match(phoneRegex);
            if (phoneMatch) {
                phone = phoneMatch[0];
            }
            continue;
        }

        // --- Website Extraction --- (Improved Regex and Keywords)
        if (!website && (/(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g.test(line) || /website[:\s]|web[:\s]|site[:\s]|वेबसाइट[:\s]|वेब[:\s]*/.test(line))) {
            const websiteRegex = /(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
            const websiteMatch = line.match(websiteRegex);
            if (websiteMatch) {
                website = websiteMatch[0];
            }
            continue;
        }

        // --- Address Detection --- (Improved Keywords and Multi-line)
        const addressKeywords = ["address", "addr", "адрес", "पता", "chamber", "court", "building", "street", "road", "city", "state", "zip", "pincode", "location", "office", "पता:", "address:", "addr:", "адрес:", "location:", "office:", "court", "high court", "district court", "attorney at law", "law office"];
        if (!address && addressKeywords.some(keyword => line.includes(keyword))) {
            addressLines.push(lines[i]); // Start collecting address lines
            // Collect subsequent lines likely to be part of address (heuristics, stop if email/phone/website pattern is found)
            for(let j = i + 1; j < lines.length; j++){
                const nextLineLower = lines[j].toLowerCase().trim();
                if (!nextLineLower.includes('@') && !nextLineLower.match(/[\d-+\s()]{7,}/) && !/(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g.test(nextLineLower)) {
                    addressLines.push(lines[j]);
                    i++; // Skip processed line
                } else {
                    break; // Stop if next line looks like a different field
                }
            }
            address = addressLines.join('\n');
            continue;
        } else if (!address && addressLines.length > 0 && !/name[:\s]|n a m e[:\s]|नाम[:\s]|email[:\s]|e-mail[:\s]|mail[:\s]|ईमेल[:\s]|phone[:\s]|mobile[:\s]|contact[:\s]|tel[:\s]|ph[:\s]|mob[:\s]|number[:\s]|call[:\s]|फ़ोन[:\s]|मोबाइल[:\s]|संपर्क[:\s]|website[:\s]|web[:\s]|site[:\s]|वेबसाइट[:\s]|वेब[:\s]*/.test(line) && !line.includes('@') && !line.match(/[\d-+\s()]{7,}/) && !/(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g.test(line) ) {
            // Heuristic for appending address lines that don't look like other field labels or other field formats (after address keyword is found initially)
            addressLines.push(lines[i]);
            address = addressLines.join('\n');
            continue;
        }


        // --- Name Detection (More Heuristic Based) ---
        const nameKeywords = ["name", "n a m e", "नाम", "name:", "n a m e:", "नाम:", "advocate", "attorney", "lawyer", "engineer", "doctor", "professor", "manager", "director", "president", "ceo", "founder"]; // Added profession keywords
        if (!name && !nameKeywords.some(keyword => line.includes(keyword))) {
            possibleNameLines.push(lines[i]); // Collect lines that might be names (not containing field keywords)
        }

        // --- Designation/Profession Detection ---
        // --- Improved Designation/Profession Extraction ---
const designationKeywords = [
    "advocate", "attorney", "lawyer", "engineer", "doctor", "professor", "manager", "director",
    "president", "ceo", "founder", "legal advisor", "business consultant", "software engineer",
    "marketing manager", "accountant", "consultant", "analyst", "developer", "executive",
    "chief", "officer", "partner", "architect", "designer", "specialist", "supervisor"
];

if (!designation) {
    const possibleDesignation = lines.find(line =>
        designationKeywords.some(keyword => line.toLowerCase().includes(keyword))
    );
    if (possibleDesignation) {
        designation = possibleDesignation.trim();
    }
}


        // --- Company Name Detection (Heuristic - lines above name, or lines with "Pvt Ltd", etc.) ---
        const companyNameSuffixes = ["pvt ltd", "ltd", "inc", "corp", "llc", "limited", "corporation", "incorporated", "company"];
        if (!company && (companyNameSuffixes.some(suffix => line.includes(suffix)) || i === 0 || i === 1) && !nameKeywords.some(keyword => line.includes(keyword)) && !addressKeywords.some(keyword => line.includes(keyword)) && !/email[:\s]|e-mail[:\s]|mail[:\s]|ईमेल[:\s]/.test(line) && !/phone[:\s]|mobile[:\s]|contact[:\s]|tel[:\s]|ph[:\s]|mob[:\s]|number[:\s]|call[:\s]|फ़ोन[:\s]|मोबाइल[:\s]|संपर्क[:\s]*/.test(line) && !/(www\.[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})|(https?:\/\/(?:www\.)?[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g.test(line) ) {
            company = lines[i];
        }


    }

    // Heuristic: Select the most likely name from possibleNameLines
    if (!name && possibleNameLines.length > 0) {
        name = possibleNameLines[0]; // Take the first line that doesn't look like other fields
        if (possibleNameLines.length > 1 && possibleNameLines[1].split(" ").length <= 3 && !designation) { // If second line exists and is short, could be designation if designation not found yet
            designation = possibleNameLines[1];
        }
    }


    return { name: name?.replace(/name[:\s]|n a m e[:\s]|नाम[:\s]*/i, '').trim() || null, // Clean up potential "Name:" prefixes
             email, phone, address: address?.trim() || null, website, company: company?.trim() || null, designation: designation?.trim() || null }; // Trim address and name at the end
}

// --- OCR Endpoint ---
app.post('/api/ocr', upload.single('image'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ error: 'No image file uploaded.' });
        }

        const imageBuffer = req.file.buffer;
        const request = { image: { content: imageBuffer } };

        const [result] = await client.textDetection(request);
        const detections = result.textAnnotations;

        let extractedText = detections && detections.length > 0 ? detections[0].description : "";

        if (!extractedText.trim()) {
            return res.status(400).json({ error: 'No text detected in the image.' });
        }

        const structuredData = extractInformation(extractedText);

        res.json({ text: extractedText, structuredData });

    } catch (error) {
        console.error('Error during OCR:', error);
        res.status(500).json({ error: 'Error processing image for text extraction.' });
    }
});

// --- Start Server ---
app.listen(port, () => {
    console.log(`Backend server listening at http://localhost:${port}`);
});
