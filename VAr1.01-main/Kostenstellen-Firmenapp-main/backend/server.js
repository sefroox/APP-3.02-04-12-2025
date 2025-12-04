const express = require('express');
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const axios = require('axios');
const multer = require('multer');
const cors = require('cors');
const { GoogleGenAI } = require("@google/genai");

const app = express();
const PORT = 3000;

// CONFIGURATION
const ENABLE_WHATSAPP = process.env.ENABLE_WHATSAPP !== 'false';
const API_KEY = process.env.GEMINI_API_KEY || process.env.API_KEY;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve React App Static Files (Production Build)
app.use(express.static(path.join(__dirname, 'public')));

// DATA DIRECTORIES - FIXED FOR DOCKER
// In Docker, we work relative to theWORKDIR (/app). 
// using path.resolve ensures we hit the mapped volume correctly.
const DATA_DIR = process.env.DATA_DIR || path.resolve(__dirname, 'data');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads');
const DATA_FILE = path.join(DATA_DIR, 'database.json');

console.log(`Server starting... Data Directory: ${DATA_DIR}`);

// Ensure directories exist
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

// Serve Uploaded Files Statically
app.use('/uploads', express.static(UPLOADS_DIR));

// --- FILE UPLOAD CONFIG (Multer) ---
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, UPLOADS_DIR)
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext).replace(/[^a-z0-9]/gi, '_').toLowerCase();
        cb(null, name + '-' + uniqueSuffix + ext)
    }
});
const upload = multer({ storage: storage });

// --- DATABASE FUNCTIONS ---
const readData = () => {
    if (!fs.existsSync(DATA_FILE)) return {};
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } 
    catch (e) { console.error("Read Error", e); return {}; }
};

const writeData = (data) => {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } 
    catch (e) { console.error("Error writing DB:", e); }
};

// --- ROUTES ---

// 1. System Status
app.get('/api/status', (req, res) => res.json({ status: 'online', environment: 'production', whatsapp: waStatus, storage: DATA_DIR }));

// 2. Data Persistence (Load/Save JSON)
app.get('/api/data', (req, res) => res.json(readData()));
app.post('/api/data', (req, res) => { 
    writeData(req.body); 
    res.json({ success: true }); 
});

// 3. File Upload Endpoint
app.post('/api/upload', upload.single('file'), (req, res) => {
    if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl, filename: req.file.filename, originalName: req.file.originalname });
});

// 4. SERVER-SIDE AI ANALYSIS
app.post('/api/analyze', async (req, res) => {
    try {
        const { filename, mimeType } = req.body;
        
        if (!API_KEY) {
            return res.status(500).json({ error: 'Server: API Key not configured' });
        }

        const filePath = path.join(UPLOADS_DIR, filename);
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ error: 'File not found on server' });
        }

        // Read file as base64
        const fileBuffer = fs.readFileSync(filePath);
        const base64Data = fileBuffer.toString('base64');

        const ai = new GoogleGenAI({ apiKey: API_KEY });
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [{ 
                inlineData: { mimeType: mimeType || 'image/jpeg', data: base64Data } 
            }, { 
                text: 'Extract invoice data as JSON: {supplier, number, date, amount, category, aiSuggestion}. If value is missing, use null or empty string. amount must be number.' 
            }],
            config: { responseMimeType: "application/json" }
        });

        const result = JSON.parse(response.text || '{}');
        res.json(result);

    } catch (e) {
        console.error("AI Error:", e);
        res.status(500).json({ error: e.message });
    }
});

// 5. FinAPI Proxy (Mock/Real)
app.post('/api/finapi/connect', async (req, res) => {
    try {
        const data = readData();
        const config = data.nexgen_settings?.finApiConfig;
        const clientId = config?.clientId || '42449672-67a0-4927-9532-225b56205404';
        const clientSecret = config?.clientSecret || '34d83058-32d2-4729-936a-b72776519756';

        const authRes = await axios.post('https://sandbox.finapi.io/oauth/token', {
            grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret
        });
        
        const formRes = await axios.post('https://sandbox.finapi.io/api/v1/webForms', {
            type: 'BANK_CONNECTION_IMPORT'
        }, { headers: { Authorization: 'Bearer ' + authRes.data.access_token } });

        res.json({ formUrl: 'https://sandbox.finapi.io/webForm/' + formRes.data.id });
    } catch (e) {
        res.json({ formUrl: 'https://sandbox.finapi.io/' }); 
    }
});

// --- WHATSAPP LOGIC ---
let waClient = null;
let qrCodeData = null;
let waReady = false;
let waStatus = 'disconnected';
let initTimeout = null;

function initWhatsApp() {
    if (!ENABLE_WHATSAPP) {
        waStatus = 'disabled';
        return;
    }
    if (waClient) { try { waClient.destroy(); } catch(e) {} waClient = null; }
    if (initTimeout) clearTimeout(initTimeout);

    console.log('Initializing WhatsApp Client...');
    waStatus = 'scanning';
    waReady = false;
    qrCodeData = null;

    initTimeout = setTimeout(() => {
        if (waStatus === 'scanning' && !qrCodeData && !waReady) {
            console.log("Watchdog: Force restarting WA...");
            initWhatsApp();
        }
    }, 45000);

    try {
        waClient = new Client({
            authStrategy: new LocalAuth({ dataPath: path.join(DATA_DIR, 'auth') }),
            puppeteer: {
                headless: true,
                args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-gpu']
            }
        });

        waClient.on('qr', (qr) => { qrCodeData = qr; waStatus = 'scanning'; });
        waClient.on('ready', () => { waReady = true; waStatus = 'connected'; qrCodeData = null; if (initTimeout) clearTimeout(initTimeout); });
        waClient.on('disconnected', () => { waReady = false; waStatus = 'disconnected'; waClient = null; });
        
        waClient.initialize().catch(err => {
            waStatus = 'error';
            waClient = null; 
            setTimeout(() => initWhatsApp(), 5000);
        });

    } catch (e) { waStatus = 'error'; }
}

app.post('/api/whatsapp/init', (req, res) => { if (waStatus !== 'disabled') initWhatsApp(); res.json({ success: true, status: waStatus }); });
app.post('/api/whatsapp/reset', async (req, res) => {
    if (waClient) { try { await waClient.destroy(); } catch(e) {} waClient = null; }
    const authPath = path.join(DATA_DIR, 'auth');
    if (fs.existsSync(authPath)) { try { fs.rmSync(authPath, { recursive: true, force: true }); } catch(e) {} }
    setTimeout(() => initWhatsApp(), 1000);
    res.json({ success: true });
});
app.get('/api/whatsapp/qr', (req, res) => res.json({ qr: qrCodeData, status: waStatus, connected: waReady }));
app.get('/api/whatsapp/status', (req, res) => res.json({ connected: waReady, status: waStatus }));

// Fallback: Serve React App for any other route
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
    if (ENABLE_WHATSAPP && fs.existsSync(path.join(DATA_DIR, 'auth'))) {
        initWhatsApp();
    }
});