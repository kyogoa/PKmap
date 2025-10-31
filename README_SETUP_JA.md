# Parkour Spots（スマホ向けPWA・超軽量）

「開いたら地図が表示」「スポット投稿」「共有（URL共有・ネイティブ共有対応）」ができるモバイルWebアプリです。サーバ不要（Firebaseのみ）。

## できること
- 地図（OpenStreetMap）表示
- 長押し or 地図中心から「スポット追加」
- 名前／タグ／難易度／注意を保存
- Firestoreに保存→リアルタイム反映
- シェアボタン（特定スポットURL／現在の地図ビューURL）
- PWA（ホーム画面に追加してアプリっぽく動作）

## 必要なもの
- Googleアカウント
- Firebaseプロジェクト（無料枠でOK）

## セットアップ（約10分）
1. **Firebaseコンソール** → プロジェクト作成  
2. 「**ウェブ**」アプリを追加 → 表示される **SDK設定**（apiKey等）を `index.html` の
   ```js
   const firebaseConfig = { ... }
   ```
   にコピペして置き換える
3. Firestore を有効化（テストモードでOK／後でルールを強化）  
4. Hosting を使う場合は `firebase init hosting` でデプロイ（簡単なのは GitHub Pages。下記参照）

### Firestore セキュリティルール（簡易・学習用）
学習用の最低限ルールです。公開運用では**必ず**認証や通報・モデレーションを強化してください。
```js
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /spots/{id} {
      allow read: if true;
      allow create: if request.time < timestamp.date(2099,1,1);
      allow update, delete: if false;
    }
  }
}
```
- まずは「読み取り自由＋作成のみ可（更新・削除不可）」にすることで荒らしを防ぎやすくしています。
- 承認制にしたい場合は、別コレクションで `pending_spots` を作成し、管理者のみが `spots` に移動する運用にしてください。

## ローカルで試す
1. このフォルダの中身をそのままPCに保存
2. VSCodeの「Live Server」やPythonの簡易サーバで配信:
   ```bash
   # 例: Python3
   python -m http.server 5173
   # → http://localhost:5173 を開く
   ```
   ※ ファイルをダブルクリックで開くとFirebaseモジュール読み込み制限により動かないことがあります。

## 公開（GitHub Pagesが簡単）
1. GitHubリポジトリを作成→このファイル群をアップロード
2. リポジトリ Settings → Pages → Branch を `main` / `/ (root)` に設定
3. 数分で `https://<ユーザー名>.github.io/<リポジトリ名>/` で公開

## 構成
- `index.html` … 画面とFirebase初期化
- `styles.css` … 見た目
- `app.js` … 地図・投稿・共有のロジック
- `manifest.webmanifest` / `sw.js` … PWA（オフラインはアプリの殻のみキャッシュ）

## 改良アイデア（発展）
- 写真アップロード：Storageに `spots/{docId}/photo.jpg` として保存→URLをFirestoreに書き込む
- 通報→管理画面：`reports` コレクションを作り、集計で自動非表示
- 認証：匿名→Google/LINE ログイン（UIDで投稿者識別）
- 承認ワークフロー：`pending_spots` を管理UIで承認→`spots` に移動
- 位置検索：ビューポートのみ読み込み、PostGIS不要で十分軽快
- 多言語化：`navigator.language` で自動切替

## 免責とマナー
- 私有地・立入禁止・危険行為は禁止。必ず周囲の安全・法令・マナーを守ってください。
- 本アプリの利用に伴う事故やトラブルについて、作者は責任を負いません。

質問や「写真も付けたい」「承認制にしたい」などの要望があれば、追記版を用意します。
