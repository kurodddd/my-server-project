// 必要な部品を読み込む
const express = require('express');
const fs = require('fs'); // ファイルを操作する部品
const path = require('path');

// Expressを初期化
const app = express();
// ★公開時に書き換える場所
const PORT = process.env.PORT || 3000;

// JSON形式のデータを正しく受け取るための設定
app.use(express.json());
// フロントエンドのファイルがある場所を指定
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, 'database.json');

// --- APIエンドポイントの定義 ---

// 特定のお店の口コミを取得するAPI
app.get('/api/reviews/:restaurantId', (req, res) => {
  const restaurantId = req.params.restaurantId;
  fs.readFile(dbPath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading database');
    const db = JSON.parse(data);
    res.json(db.reviews[restaurantId] || []);
  });
});

// 新しい口コミを投稿するAPI
app.post('/api/reviews/:restaurantId', (req, res) => {
  const restaurantId = req.params.restaurantId;
  const newReview = req.body.review;

  fs.readFile(dbPath, 'utf8', (err, data) => {
    if (err) return res.status(500).send('Error reading database');
    const db = JSON.parse(data);
    
    // 口コミを追加
    if (!db.reviews[restaurantId]) {
      db.reviews[restaurantId] = [];
    }
    db.reviews[restaurantId].push(newReview);
    
    // データベースファイルに書き込む
    fs.writeFile(dbPath, JSON.stringify(db, null, 2), (err) => {
      if (err) return res.status(500).send('Error writing to database');
      res.status(201).json(newReview);
    });
  });
});

// --- サーバーの起動 ---
app.listen(PORT, () => {
  console.log(`サーバーが http://localhost:${PORT} で起動しました。`);
});