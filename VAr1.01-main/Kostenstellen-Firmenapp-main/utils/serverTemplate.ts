export const getServerJsContent = () => {
  return `const express = require('express');
const path = require('path');
const fs = require('fs');
const { Client, LocalAuth } = require('whatsapp-web.js');
const axios = require('axios');

const app = express();
const PORT = 3000;
const ENABLE_WHATSAPP = process.env.ENABLE_WHATSAPP !== 'false';

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const DATA_DIR = path.join(__dirname, 'data');
const DATA_FILE = path.join(DATA_DIR, 'database.json');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });

const readData = () => {
    if (!fs.existsSync(DATA_FILE)) return {};
    try { return JSON.parse(fs.readFileSync(DATA_FILE, 'utf8')); } catch (e) { return {}; }
};

const writeData = (data) => {
    try { fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2)); } catch (e) { console.error("DB Write Error", e); }
};

// --- FINAPI LOGIC ---
app.post('/api/finapi/connect', async (req, res) => {
    try {
        const data = readData();
        const config = data.nexgen_settings?.finApiConfig;
        
        // Fallback to Sandbox if no config
        const clientId = config?.clientId || '42449672-67a0-4927-9532-225b56205404';
        const clientSecret = config?.clientSecret || '34d83058-32d2-4729-936a-b72776519756';

        // 1. Auth
        const authRes = await axios.post('https://sandbox.finapi.io/oauth/token', {
            grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret
        });
        
        // 2. Create Web Form
        const formRes = await axios.post('https://sandbox.finapi.io/api/v1/webForms', {
            type: 'BANK_CONNECTION_IMPORT'
        }, { headers: { Authorization: 'Bearer ' + authRes.data.access_token } });

        res.json({ formUrl: 'https://sandbox.finapi.io/webForm/' + formRes.data.id });
    } catch (e) {
        console.error("FinAPI Error:", e.message);
        // Mock URL for demo purposes if API fails (e.g. CORS issues in dev)
        res.json({ formUrl: 'https://sandbox.finapi.io/' }); 
    }
});

// --- WHATSAPP LOGIC ---
let waClient = null;
let qrCodeData = null;
let waStatus = 'disconnected';
let initTimeout = null;

function initWhatsApp() {
    if (!ENABLE_WHATSAPP) { waStatus = 'disabled'; return; }
    if (waClient) { try { waClient.destroy(); } catch(e){} waClient = null; }
    if (initTimeout) clearTimeout(initTimeout);
    
    console.log('Starting WhatsApp...');
    waStatus = 'scanning';
    qrCodeData = null;
    
    // Watchdog
    initTimeout = setTimeout(() => {
        if (waStatus === 'scanning' && !qrCodeData) {
            console.log("Watchdog: Restarting WA...");
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
        waClient.on('ready', () => { 
            waStatus = 'connected'; 
            qrCodeData = null; 
            if(initTimeout) clearTimeout(initTimeout);
        });
        waClient.on('disconnected', () => { waStatus = 'disconnected'; waClient = null; });
        
        waClient.initialize().catch(err => {
            console.error("WA Init Error:", err.message);
            waStatus = 'error';
            waClient = null;
            setTimeout(initWhatsApp, 5000);
        });
    } catch (e) { waStatus = 'error'; }
}

app.get('/api/status', (req, res) => res.json({ status: 'online', whatsapp: waStatus }));
app.get('/api/data', (req, res) => res.json(readData()));
app.post('/api/data', (req, res) => { writeData(req.body); res.json({ success: true }); });
app.post('/api/whatsapp/init', (req, res) => { if (!waClient) initWhatsApp(); res.json({ status: waStatus }); });
app.get('/api/whatsapp/qr', (req, res) => res.json({ qr: qrCodeData, status: waStatus }));
app.get('/api/whatsapp/status', (req, res) => res.json({ connected: waStatus === 'connected', status: waStatus }));
app.post('/api/whatsapp/reset', (req, res) => {
    if(waClient) { try{waClient.destroy(); waClient=null;}catch(e){} }
    try { fs.rmSync(path.join(DATA_DIR, 'auth'), {recursive:true, force:true}); } catch(e){}
    setTimeout(initWhatsApp, 1000);
    res.json({success:true});
});

// NEW: PAIRING CODE
app.post('/api/whatsapp/pair', async (req, res) => {
    const { number } = req.body;
    if (!waClient) initWhatsApp();
    
    let attempts = 0;
    while (!waClient && attempts < 10) {
        await new Promise(r => setTimeout(r, 1000));
        attempts++;
    }

    try {
        if (waClient.requestPairingCode) {
            const code = await waClient.requestPairingCode(number);
            console.log("Pairing Code:", code);
            res.json({ code });
        } else {
            throw new Error("Library update required for pairing code");
        }
    } catch (e) {
        console.error("Pairing Error:", e);
        res.status(500).json({ error: e.message });
    }
});

app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));

app.listen(PORT, () => {
    console.log('Server running on port ' + PORT);
    if (ENABLE_WHATSAPP && fs.existsSync(path.join(DATA_DIR, 'auth'))) initWhatsApp();
});
`;
};