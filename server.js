const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid'); // トークン生成用の部品を読み込む

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(__dirname));

const dbPath = path.join(process.env.RENDER_DISK_MOUNT_PATH || __dirname, 'database.json');
const restaurantsPath = path.join(__dirname, 'restaurants.json');

// --- データベース読み書き ---
const readDB = () => {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({ users: {}, reviews: {}, history: {}, sessions: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// --- APIエンドポイント ---

// ログイン
app.post('/api/login', (req, res) => {
    const db = readDB();
    const { username, password } = req.body;
    if (db.users[username] && db.users[username] === password) {
        const token = uuidv4(); // 世界に一つだけのトークンを生成
        db.sessions[token] = username; // トークンとユーザー名を紐づけて保存
        writeDB(db);
        res.status(200).json({ message: "ログインに成功しました。", token: token });
    } else {
        res.status(401).json({ message: "ユーザー名またはパスワードが違います。" });
    }
});

// ログアウト
app.post('/api/logout', (req, res) => {
    const db = readDB();
    const { token } = req.body;
    if (db.sessions[token]) {
        delete db.sessions[token]; // セッション情報（トークン）を削除
        writeDB(db);
    }
    res.status(200).json({ message: "ログアウトしました。" });
});

// トークン検証
app.post('/api/verify-token', (req, res) => {
    const db = readDB();
    const { token } = req.body;
    const username = db.sessions[token];
    if (username) {
        res.status(200).json({ valid: true, username: username });
    } else {
        res.status(401).json({ valid: false });
    }
});

// (他のAPIは変更なし、ただし飲食店リストはファイルから読むように修正)
app.get('/api/restaurants', (req, res) => {
    const data = fs.readFileSync(restaurantsPath, 'utf8');
    res.json(JSON.parse(data));
});
app.post('/api/register', (req, res) => {
    const db = readDB();
    const { username, password } = req.body;
    if (db.users[username]) return res.status(400).json({ message: "このユーザー名は既に使用されています。" });
    db.users[username] = password;
    writeDB(db);
    res.status(201).json({ message: "登録が完了しました。" });
});
// (口コミ、履歴のAPIも変更なし)
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
app.delete('/api/reviews/:restaurantId', (req, res) => {
    const db = readDB(); const { restaurantId } = req.params; const { timestamp } = req.body;
    if (db.reviews[restaurantId]) {
        db.reviews[restaurantId] = db.reviews[restaurantId].filter(r => r.timestamp !== timestamp);
        writeDB(db);
    }
    res.status(204).send();
});
app.get('/api/history/:username', (req, res) => {
    const db = readDB();
    res.json(db.history[req.params.username] || []);
});
app.post('/api/history/:username', (req, res) => {
    const db = readDB(); const { username } = req.params; const { restaurantId, restaurantName } = req.body;
    if (!db.history[username]) db.history[username] = [];
    const newHistory = [{ id: restaurantId, name: restaurantName, viewedAt: new Date().toISOString() }];
    db.history[username] = newHistory.concat(db.history[username].filter(item => item.id !== restaurantId));
    db.history[username] = db.history[username].slice(0, 20);
    writeDB(db);
    res.status(201).send();
});
app.delete('/api/history/:username', (req, res) => {
    const db = readDB(); const { username } = req.params;
    if (db.history[username]) delete db.history[username];
    writeDB(db);
    res.status(204).send();
});

// --- サーバー起動 ---
app.listen(PORT, () => {
    console.log(`サーバーが http://localhost:${PORT} で起動しました。`);
});