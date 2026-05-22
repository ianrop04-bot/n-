const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const nodemailer = require('nodemailer');

const app = express();
const PORT = 3000;

// Store verification codes and users
const verificationCodes = new Map();
const users = new Map();

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// ========== EMAIL CONFIGURATION ==========
// REPLACE WITH YOUR EMAIL CREDENTIALS: groupanimators4@gmail.com
const EMAIL_USER = 'groupanimators4@gmail.com';     // Replace with your email
const EMAIL_PASS = 'pmzg eboq hrrv czbp';        // Replace with your app password

let transporter = null;

async function setupTransporter() {
    try {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: EMAIL_USER,
                pass: EMAIL_PASS
            }
        });
        await transporter.verify();
        console.log('✅ Email configured - Verification codes will be sent!');
    } catch (error) {
        console.error('❌ Email error:', error.message);
        console.log('📱 Using demo mode');
        transporter = null;
    }
}

// ========== USER MANAGEMENT ==========

// Get user data
app.get('/api/user/:email', (req, res) => {
    const { email } = req.params;
    const user = users.get(email);
    
    if (user) {
        res.json({ success: true, user });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// Update user settings
app.post('/api/user/update', (req, res) => {
    const { email, settings, displayName } = req.body;
    const user = users.get(email);
    
    if (user) {
        if (settings) user.settings = { ...user.settings, ...settings };
        if (displayName) user.displayName = displayName;
        users.set(email, user);
        res.json({ success: true, user });
    } else {
        res.status(404).json({ error: 'User not found' });
    }
});

// ========== EMAIL VERIFICATION ENDPOINTS ==========

// Send verification code
app.post('/api/auth/send-code', async (req, res) => {
    const { email } = req.body;
    
    if (!email || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email required' });
    }
    
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    verificationCodes.set(email, { code, timestamp: Date.now() });
    
    console.log(`📧 Code for ${email}: ${code}`);
    
    let emailSent = false;
    
    if (transporter) {
        try {
            await transporter.sendMail({
                from: `"Nexfgen-Hub" <${EMAIL_USER}>`,
                to: email,
                subject: '🔐 Your Verification Code',
                html: `
                    <div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
                        <h2>Welcome to Nexfgen-Hub!</h2>
                        <p>Your verification code is:</p>
                        <h1 style="font-size: 48px; color: #ff6b6b;">${code}</h1>
                        <p>Enter this code to complete your login.</p>
                    </div>
                `
            });
            emailSent = true;
        } catch (error) {
            console.error('Email failed:', error.message);
        }
    }
    
    res.json({ 
        success: true, 
        message: emailSent ? 'Code sent to your email!' : 'Demo mode - Check console',
        code: emailSent ? undefined : code
    });
});

// Verify code and login/register
app.post('/api/auth/verify', (req, res) => {
    const { email, code } = req.body;
    
    const storedData = verificationCodes.get(email);
    
    if (!storedData || storedData.code !== code) {
        return res.status(400).json({ error: 'Invalid verification code' });
    }
    
    if (!users.has(email)) {
        users.set(email, {
            email: email,
            displayName: email.split('@')[0],
            username: email.split('@')[0],
            settings: {
                theme: 'dark',
                notifications: true
            },
            createdAt: new Date().toISOString()
        });
    }
    
    const user = users.get(email);
    verificationCodes.delete(email);
    
    // Create session token (simple base64 encoding)
    const sessionToken = Buffer.from(`${email}:${Date.now()}`).toString('base64');
    
    res.json({
        success: true,
        message: 'Login successful',
        user: {
            email: user.email,
            displayName: user.displayName,
            username: user.username,
            settings: user.settings
        },
        sessionToken
    });
});

// ========== TMDB MOVIE ENDPOINTS ==========

const TMDB_API_KEY = '89802458aff508c9c6eff8b7290d8970'; // REPLACE WITH YOUR TMDB API KEY

app.get('/api/movies/popular', async (req, res) => {
    try {
        const response = await axios.get(`https://api.themoviedb.org/3/movie/popular`, {
            params: { api_key: TMDB_API_KEY, page: req.query.page || 1 }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: 'Failed to fetch movies' });
    }
});

app.get('/api/movies/search', async (req, res) => {
    try {
        const { query, page = 1 } = req.query;
        if (!query) return res.status(400).json({ error: 'Query required' });
        const response = await axios.get(`https://api.themoviedb.org/3/search/movie`, {
            params: { api_key: TMDB_API_KEY, query, page }
        });
        res.json(response.data);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/download/simulate', (req, res) => {
    const { movieTitle, quality = '1080p' } = req.body;
    res.json({
        success: true,
        message: `Download started for "${movieTitle}" (${quality})`
    });
});

// ========== SERVE PAGES ==========

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'main.html'));
});

app.get('/app', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

setupTransporter();
app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════╗
║     🎬 NEXFGEN MOVIE HUB - SERVER RUNNING 🎬      ║
╠═══════════════════════════════════════════════════╣
║  📱 Introduction: http://localhost:${PORT}         ║
║  🎥 Movie App:    http://localhost:${PORT}/app    ║
╚═══════════════════════════════════════════════════╝
    `);
});
