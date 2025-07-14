const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, 'database.json');

// --- データベース読み書き ---
const readDB = () => {
    if (!fs.existsSync(dbPath)) {
        fs.writeFileSync(dbPath, JSON.stringify({ users: {}, reviews: {}, history: {} }, null, 2));
    }
    return JSON.parse(fs.readFileSync(dbPath, 'utf8'));
};
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));

// --- APIエンドポイント ---

// ユーザー新規登録
app.post('/api/register', (req, res) => {
    const db = readDB();
    const { username, password } = req.body;
    if (db.users[username]) {
        return res.status(400).json({ message: "このユーザー名は既に使用されています。" });
    }
    // ★注意：実際のアプリではパスワードはハッシュ化して保存します
    db.users[username] = password;
    writeDB(db);
    res.status(201).json({ message: "登録が完了しました。" });
});

// ログイン
app.post('/api/login', (req, res) => {
    const db = readDB();
    const { username, password } = req.body;
    if (db.users[username] && db.users[username] === password) {
        res.status(200).json({ message: "ログインに成功しました。" });
    } else {
        res.status(401).json({ message: "ユーザー名またはパスワードが違います。" });
    }
});

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
    if (!db.reviews[restaurantId]) db.reviews[restaurantId] = [];
    const newReview = { username, text, timestamp: new Date().toISOString() };
    db.reviews[restaurantId].unshift(newReview); // 新しい順にするためunshiftに変更
    writeDB(db);
    res.status(201).json(newReview);
});

// 口コミの削除（管理者用）
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
    if (!db.history[username]) db.history[username] = [];
    // 履歴の先頭に追加し、重複を削除
    const newHistory = [{ id: restaurantId, name: restaurantName, viewedAt: new Date().toISOString() }];
    db.history[username] = newHistory.concat(db.history[username].filter(item => item.id !== restaurantId));
    // 履歴を最新20件に制限
    db.history[username] = db.history[username].slice(0, 20);
    writeDB(db);
    res.status(201).send();
});

// 閲覧履歴の削除（管理者用）
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