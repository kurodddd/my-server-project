const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, 'database.json');

// データベースファイルを読み書きするヘルパー関数
const readDB = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// --- API エンドポイント ---

// 口コミの取得
app.get('/api/reviews/:restaurantId', (req, res) => {
    const db = readDB();
    res.json(db.reviews[req.params.restaurantId] || []);
});

// 口コミの投稿
app.post('/api/reviews/:restaurantId', (req, res) => {
    const db = readDB();
    const { restaurantId } = req.params;
    const { username, text } = req.body;
    
    if (!db.reviews[restaurantId]) {
        db.reviews[restaurantId] = [];
    }
    const newReview = { username, text, timestamp: new Date().toISOString() };
    db.reviews[restaurantId].push(newReview);
    writeDB(db);
    res.status(201).json(newReview);
});

// 口コミの削除（管理者用）
app.delete('/api/reviews/:restaurantId', (req, res) => {
    const db = readDB();
    const { restaurantId } = req.params;
    const { timestamp } = req.body; // タイムスタンプで一意に識別
    
    if (db.reviews[restaurantId]) {
        db.reviews[restaurantId] = db.reviews[restaurantId].filter(review => review.timestamp !== timestamp);
        writeDB(db);
    }
    res.status(204).send();
});


// 閲覧履歴の取得
app.get('/api/history/:username', (req, res) => {
    const db = readDB();
    res.json(db.history[req.params.username] || []);
});

// 閲覧履歴の追加
app.post('/api/history/:username', (req, res) => {
    const db = readDB();
    const { username } = req.params;
    const { restaurantId, restaurantName } = req.body;

    if (!db.history[username]) {
        db.history[username] = [];
    }
    // 既に履歴にあれば何もしない（重複を防ぐ）
    if (!db.history[username].some(item => item.id === restaurantId)) {
        db.history[username].push({ id: restaurantId, name: restaurantName, viewedAt: new Date().toISOString() });
        writeDB(db);
    }
    res.status(201).send();
});

// 閲覧履歴の削除（管理者用）
app.delete('/api/history/:username', (req, res) => {
    const db = readDB();
    const { username } = req.params;
    if (db.history[username]) {
        delete db.history[username];
        writeDB(db);
    }
    res.status(204).send();
});


// --- サーバー起動 ---
app.listen(PORT, () => {
    console.log(`サーバーが http://localhost:${PORT} で起動しました。`);
});