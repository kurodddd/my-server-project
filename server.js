const express = require('express');
const fs = require('fs');
const path = require('path');
const axios = require('axios'); // 追加した部品を読み込む

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(__dirname));

const dbPath = path.join(__dirname, 'database.json');

// --- データベース読み書き ---
const readDB = () => JSON.parse(fs.readFileSync(dbPath, 'utf8'));
const writeDB = (data) => fs.writeFileSync(dbPath, JSON.stringify(data, null, 2));


// --- OpenStreetMapから飲食店データを取得するAPI ---
app.get('/api/restaurants', async (req, res) => {
    // OpenStreetMapのOverpass APIエンドポイント
    const overpassUrl = 'https://overpass-api.de/api/interpreter';

    // 射水市の範囲内で「レストラン」「カフェ」「居酒屋」などを検索するクエリ
    const query = `
        [out:json][timeout:25];
        (
          area["ISO3166-2"="JP-16"]["name"="射水市"]->.searchArea;
          (
            node["amenity"~"restaurant|cafe|bar|pub|izakaya|fast_food"](area.searchArea);
            way["amenity"~"restaurant|cafe|bar|pub|izakaya|fast_food"](area.searchArea);
            relation["amenity"~"restaurant|cafe|bar|pub|izakaya|fast_food"](area.searchArea);
          );
        );
        out center;
    `;

    try {
        // Overpass APIにクエリを送信
        const response = await axios.post(overpassUrl, `data=${encodeURIComponent(query)}`);
        
        // 取得したデータを使いやすい形式に変換
        const restaurants = response.data.elements
            .filter(element => element.tags && element.tags.name) // 名前のないデータは除外
            .map(element => {
                let category = 'その他'; // デフォルトカテゴリ
                const amenity = element.tags.amenity;
                if (amenity === 'restaurant') category = '洋食・レストラン';
                if (amenity === 'cafe') category = 'カフェ・パン';
                if (amenity === 'izakaya') category = '居酒屋・バー';
                if (amenity === 'bar' || amenity === 'pub') category = '居酒屋・バー';
                if (element.tags.cuisine === 'sushi') category = '寿司';
                if (element.tags.cuisine === 'ramen' || element.tags.cuisine === 'chinese') category = 'ラーメン・中華';
                if (element.tags.cuisine === 'udon' || element.tags.cuisine === 'soba') category = 'うどん・そば';
                if (element.tags.cuisine === 'yakiniku') category = '焼肉';

                return {
                    id: element.id, // OSMのID
                    name: element.tags.name,
                    category: category
                };
            });
        
        // 重複を除外して返す
        const uniqueRestaurants = Array.from(new Map(restaurants.map(r => [r.name, r])).values());
        res.json(uniqueRestaurants);

    } catch (error) {
        console.error('OpenStreetMap API Error:', error);
        res.status(500).json({ message: "外部APIからの飲食店データの取得に失敗しました。" });
    }
});


// --- ログインや口コミ、履歴のAPI（これらは変更なし）---
// ... (前回のserver.jsから、ユーザー登録以下のAPIコードをここにペースト) ...
// (app.post('/api/register', ...), app.post('/api/login', ...), etc.)
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