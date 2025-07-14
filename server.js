const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(__dirname));

const dbPath = path.join(process.env.RENDER_DISK_MOUNT_PATH || __dirname, 'database.json');
const restaurantsPath = path.join(__dirname, 'restaurants.json');

// --- データベース読み書き（起動時にファイルがなければ作成する堅牢な方式） ---
const readDB = () => {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({ users: {}, reviews: {}, history: {}, sessions: {}, favorites: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// --- APIエンドポイント ---
app.get('/api/restaurants', (req, res) => {
    try {
        if (fs.existsSync(restaurantsPath)) {
            const data = fs.readFileSync(restaurantsPath, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json([]); // ファイルがなくても空のリストを返してクラッシュを防ぐ
        }
    } catch (error) {
        console.error('Error reading restaurants.json:', error);
        res.status(500).json({ message: "飲食店データの取得に失敗しました。" });
    }
});

// ... (他のAPIは変更なし) ...
app.post('/api/register', (req, res) => { /* ... */ });
app.post('/api/login', (req, res) => { /* ... */ });
// ... (ここに前回の全てのAPIコードが入ります) ...
// (For brevity, the full, unchanged server code from the previous working step is assumed here)
const fullServerCode = `
const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(__dirname));

const dbPath = path.join(process.env.RENDER_DISK_MOUNT_PATH || __dirname, 'database.json');
const restaurantsPath = path.join(__dirname, 'restaurants.json');

const readDB = () => {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({ users: {}, reviews: {}, history: {}, sessions: {}, favorites: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

app.get('/api/restaurants', (req, res) => {
    try {
        if (fs.existsSync(restaurantsPath)) {
            const data = fs.readFileSync(restaurantsPath, 'utf8');
            res.json(JSON.parse(data));
        } else {
            res.json([]);
        }
    } catch (error) {
        console.error('Error reading restaurants.json:', error);
        res.status(500).json({ message: "飲食店データの取得に失敗しました。" });
    }
});

app.post('/api/register', (req, res) => {
    const db = readDB(); const { username, password } = req.body;
    if (db.users[username]) return res.status(400).json({ message: "このユーザー名は既に使用されています。" });
    db.users[username] = password; writeDB(db);
    res.status(201).json({ message: "登録が完了しました。" });
});

app.post('/api/login', (req, res) => {
    const db = readDB(); const { username, password } = req.body;
    if (db.users[username] && db.users[username] === password) {
        const token = uuidv4(); db.sessions[token] = username; writeDB(db);
        res.status(200).json({ message: "ログインに成功しました。", token: token });
    } else {
        res.status(401).json({ message: "ユーザー名またはパスワードが違います。" });
    }
});

app.post('/api/logout', (req, res) => {
    const db = readDB(); const { token } = req.body;
    if (token && db.sessions[token]) {
        delete db.sessions[token]; writeDB(db);
    }
    res.status(200).json({ message: "ログアウトしました。" });
});

app.post('/api/verify-token', (req, res) => {
    const db = readDB(); const { token } = req.body;
    const username = db.sessions[token];
    if (username) {
        res.status(200).json({ valid: true, username: username });
    } else {
        res.status(401).json({ valid: false });
    }
});

app.get('/api/reviews/:restaurantId', (req, res) => {
    const db = readDB();
    res.json(db.reviews[req.params.restaurantId] || []);
});

app.post('/api/reviews/:restaurantId', (req, res) => {
    const db = readDB(); const { restaurantId } = req.params; const { username, text } = req.body;
    if (!db.reviews[restaurantId]) db.reviews[restaurantId] = [];
    const newReview = { username, text, timestamp: new Date().toISOString() };
    db.reviews[restaurantId].unshift(newReview); writeDB(db);
    res.status(201).json(newReview);
});

app.get('/api/history/:username', (req, res) => {
    const db = readDB();
    res.json(db.history[req.params.username] || []);
});

app.post('/api/history/:username', (req, res) => {
    const db = readDB(); const { username } = req.params; const { restaurantId, restaurantName } = req.body;
    if (!db.history[username]) db.history[username] = [];
    const newHistory = [{ id: restaurantId, name: restaurantName, viewedAt: new Date().toISOString() }];
    db.history[username] = newHistory.concat(db.history[username].filter(item => item.id !== restaurantId)).slice(0, 20);
    writeDB(db);
    res.status(201).send();
});

app.delete('/api/reviews/:restaurantId', (req, res) => {
    const db = readDB(); const { restaurantId } = req.params; const { timestamp } = req.body;
    if (db.reviews[restaurantId]) {
        db.reviews[restaurantId] = db.reviews[restaurantId].filter(r => r.timestamp !== timestamp);
        writeDB(db);
    }
    res.status(204).send();
});

app.delete('/api/history/:username', (req, res) => {
    const db = readDB(); const { username } = req.params;
    if (db.history[username]) {
        delete db.history[username]; writeDB(db);
    }
    res.status(204).send();
});

// ★★★ この部分を修正 ★★★
app.listen(PORT, '0.0.0.0', () => {
    console.log(\`サーバーが http://localhost:\${PORT} で起動しました。\`);
});
`;
// Pasting the full code for clarity and to avoid user error.
// The primary change is adding '0.0.0.0' to the listen call.
// A secondary robustness improvement is checking for restaurants.json existence.

fs.writeFileSync('server.js', fullServerCode);