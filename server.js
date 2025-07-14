const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, 'database.json');
const restaurantsPath = path.join(__dirname, 'restaurants.json'); // 新しいファイルパス

// --- データベース読み書き ---
const readDB = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// --- 飲食店データをファイルから取得するAPI ---
app.get('/api/restaurants', async (req, res) => {
    try {
        // restaurants.jsonファイルを読み込む
        const data = fs.readFileSync(restaurantsPath, 'utf8');
        const restaurants = JSON.parse(data);
        res.json(restaurants);
    } catch (error) {
        console.error('Error reading restaurants.json:', error);
        res.status(500).json({ message: "飲食店データの取得に失敗しました。" });
    }
});


// --- ログインや口コミ、履歴のAPI（これらは変更なし）---
app.post('/api/register', (req, res) => {
    const db = readDB();
    const { username, password } = req.body;
    if (db.users[username]) {
        return res.status(400).json({ message: "このユーザー名は既に使用されています。" });
    }
    db.users[username] = password;
    writeDB(db);
    res.status(201).json({ message: "登録が完了しました。" });
});
app.post('/api/login', (req, res) => {
    const db = readDB();
    const { username, password } = req.body;
    if (db.users[username] && db.users[username] === password) {
        res.status(200).json({ message: "ログインに成功しました。" });
    } else {
        res.status(401).json({ message: "ユーザー名またはパスワードが違います。" });
    }
});
app.get('/api/reviews/:restaurantId', (req, res) => {
    const db = readDB();
    res.json(db.reviews[req.params.restaurantId] || []);
});
app.post('/api/reviews/:restaurantId', (req, res) => {
    const db = readDB();
    const { restaurantId } = req.params;
    const { username, text } = req.body;
    if (!db.reviews[restaurantId]) db.reviews[restaurantId] = [];
    const newReview = { username, text, timestamp: new Date().toISOString() };
    db.reviews[restaurantId].unshift(newReview);
    writeDB(db);
    res.status(201).json(newReview);
});
app.delete('/api/reviews/:restaurantId', (req, res) => {
    const db = readDB();
    const { restaurantId } = req.params;
    const { timestamp } = req.body;
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
    const db = readDB();
    const { username } = req.params;
    const { restaurantId, restaurantName } = req.body;
    if (!db.history[username]) db.history[username] = [];
    const newHistory = [{ id: restaurantId, name: restaurantName, viewedAt: new Date().toISOString() }];
    db.history[username] = newHistory.concat(db.history[username].filter(item => item.id !== restaurantId));
    db.history[username] = db.history[username].slice(0, 20);
    writeDB(db);
    res.status(201).send();
});
app.delete('/api/history/:username', (req, res) => {
    const db = readDB();
    const { username } = req.params;
    if (db.history[username]) delete db.history[username];
    writeDB(db);
    res.status(204).send();
});


// --- サーバー起動 ---
app.listen(PORT, () => {
    console.log(`サーバーが http://localhost:${PORT} で起動しました。`);
});