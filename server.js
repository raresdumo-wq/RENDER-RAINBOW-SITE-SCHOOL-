const express = require('express');
const cors = require('cors');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.use(cors());
app.use(express.json({ limit: '10mb' }));

// Configurare Supabase din variabile de mediu
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

// Configurare OneSignal din variabile de mediu
const ONESIGNAL_APP_ID = process.env.ONESIGNAL_APP_ID;
const ONESIGNAL_REST_KEY = process.env.ONESIGNAL_REST_KEY;

// 1. SINCRONIZARE DATE (Salvare/Încărcare în DB)
app.get('/sync', async (req, res) => {
    try {
        const { data, error } = await supabase.from('db_state').select('*').eq('id', 1).single();
        if (error) throw error;
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post('/sync', async (req, res) => {
    try {
        const { users, content, lectii, docs, resp, home, proiecte, history } = req.body;
        
        const updateData = {};
        if (users !== undefined) updateData.users = users;
        if (content !== undefined) updateData.content = content;
        if (lectii !== undefined) updateData.lectii = lectii;
        if (docs !== undefined) updateData.docs = docs;
        if (resp !== undefined) updateData.resp = resp;
        if (home !== undefined) updateData.home = home;
        if (proiecte !== undefined) updateData.proiecte = proiecte;
        if (history !== undefined) updateData.history = history;

        const { error } = await supabase.from('db_state').update(updateData).eq('id', 1);
        if (error) throw error;
        
        res.json({ ok: true });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 2. RUTA PENTRU NOTIFICĂRI (Când adaugi ceva nou)
app.post('/notify', async (req, res) => {
    try {
        const { heading, content } = req.body;
        
        const response = await fetch('https://onesignal.com/api/v1/notifications', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json; charset=utf-8',
                'Authorization': `Basic ${ONESIGNAL_REST_KEY}`
            },
            body: JSON.stringify({
                app_id: ONESIGNAL_APP_ID,
                included_segments: ['Subscribed Users'],
                headings: { en: heading, ro: heading },
                contents: { en: content, ro: content },
                url: "https://clasa6c.netlify.app" // Link-ul către site-ul tău
            })
        });
        
        const result = await response.json();
        res.json({ ok: true, result });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 3. LOGIN
app.post('/login', async (req, res) => {
    try {
        const { password } = req.body;
        if (password === "R8R") return res.json({ role: "Admin" });
        
        const { data, error } = await supabase.from('db_state').select('users').eq('id', 1).single();
        if (error) throw error;
        
        const usersArray = typeof data.users === 'string' ? JSON.parse(data.users) : data.users;
        const user = (usersArray || []).find(u => u.pass === password);
        
        if (user) res.json({ role: user.role });
        else res.status(401).send("Acces refuzat");
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// 4. PING (Pentru a ține serverul treaz cu cron-job.org)
app.get('/ping', (req, res) => {
    res.status(200).send("Server activ!");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Serverul rulează pe portul ${PORT}`));