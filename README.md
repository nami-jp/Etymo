
# Etymo - ブラウザ拡張機能

Webページ上でテキストを選択すると、その単語や文章の語源・文法・意味などをAIが解説するブラウザ拡張機能。
自己学習目的のプロジェクト。

- **リポジトリURL:** https://github.com/nami-jp/Etymo
- **初期プロンプト:** `etymo_claudecode_prompt.md`
- **API KEY:** `../AI-API-KEYS.txt`

## 重要

作業する時は、必ず `AGENTS.md` の内容を遵守すること。

---

## プロジェクト名の由来

**Etymo**（エティモ）は Etymology（語源学）を意味するギリシャ語 *etymología*（ἐτυμολογία）に由来。
*étymon*（真の意味・原形）＋ *-logia*（学問・研究）の合成語で、「言葉の本来の姿を探る」というコンセプトをそのまま名前にした。

---

## 技術スペック

- **形式:** Chrome拡張機能 Manifest V3 / Safari Web Extension（Xcode）
- **言語:** HTML / CSS / JavaScript（フレームワークなし）、Swift（Safari用ネイティブラッパー）
- **AIプロバイダー:** Google Gemini / Anthropic Claude / OpenAI（設定画面で切り替え可能）

---

## リポジトリ構成

```
/Users/manabu/myapps/
├── Etymo/                        # Webエクステンション本体（Chrome / Safari共通ソース）
│   ├── manifest.json             # MV3設定・パーミッション定義
│   ├── background.js             # Service Worker・API呼び出し（APIキーはここだけで扱う）
│   ├── content.js                # テキスト選択検知・ポップアップUI表示
│   ├── content.css               # ポップアップのスタイル
│   ├── popup/
│   │   ├── popup.html            # 設定画面
│   │   ├── popup.js              # 設定の読み込み・保存ロジック
│   │   └── popup.css             # 設定画面のスタイル
│   ├── icons/
│   │   ├── icon16.png            # プレースホルダーアイコン
│   │   ├── icon48.png
│   │   └── icon128.png
│   ├── AGENTS.md                 # AI作業ルール（必読）
│   └── etymo_claudecode_prompt.md  # 初期開発プロンプト（仕様書）
│
└── Etymo-Safari/                 # Safari用Xcodeプロジェクト（自動生成）
    └── Etymo/
        ├── Etymo.xcodeproj       # Xcodeプロジェクト
        ├── Etymo/                # ネイティブアプリ（Swift）
        └── Etymo Extension/      # Safari拡張機能ラッパー
```

> **開発フロー:** `Etymo/` 内のJS/HTML/CSSを編集 → Chromeで動作確認 → Xcodeでビルド → Safariで確認

---

## 機能概要

### テキスト選択 → 解説表示フロー

1. Webページ上のテキストを選択する
2. 選択テキストの近くに小さな「Etymo」ボタンが出現する
3. ボタンをクリックすると解説ポップアップが表示される
4. ローディング表示 → AI解説テキストが表示される
5. ポップアップ外クリックまたは「✕」ボタンで閉じる

### AI解説の内容

- **語源・etymology**（単語の場合）：ラテン語・ギリシャ語などの原形と変遷
- **品詞・文法的役割**（文・フレーズの場合）
- **意味・ニュアンス**：辞書的な意味と実際の使われ方の違い
- **関連語・派生語**（あれば）

回答はマークダウン形式・日本語（設定で英語に変更可）、200〜400字程度。

### 設定画面（拡張機能アイコンをクリック）

- AIプロバイダーの選択（Gemini / Claude / OpenAI）
- APIキーの入力・保存
- 解説言語の選択（日本語 / English）

---

## インストール手順

### Chrome（デベロッパーモード）

1. Chrome で `chrome://extensions` を開く
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `Etymo/` フォルダを選択
5. 「Etymo」が一覧に表示されればインストール完了

### Safari（Xcodeビルド）

1. `/Users/manabu/myapps/Etymo-Safari/Etymo/Etymo.xcodeproj` をXcodeで開く
2. `⌘R` でビルド・実行
3. Safari → 設定 → 機能拡張 → Etymo を有効化

> **Safari用Xcodeプロジェクトの再生成方法:**
> ```bash
> xcrun safari-web-extension-converter /Users/manabu/myapps/Etymo \
>   --project-location /Users/manabu/myapps/Etymo-Safari \
>   --app-name Etymo \
>   --bundle-identifier jp.nami.Etymo \
>   --swift --macos-only --no-open --no-prompt
> ```

---

## APIキーの取得方法

| プロバイダー | 取得先 | 無料枠 |
|---|---|---|
| Google Gemini（推奨） | [Google AI Studio](https://aistudio.google.com/) → Get API key | 1日1,500リクエスト |
| Anthropic Claude | [Anthropic Console](https://console.anthropic.com/) → API Keys | なし（従量課金） |
| OpenAI | [OpenAI Platform](https://platform.openai.com/) → API keys | なし（従量課金） |

---

## 開発経緯・作業ログ

### 2026-05-02 — 初期実装・Chrome動作確認完了

**背景**
- 自己学習目的でブラウザ拡張機能の開発を開始
- 仕様は `etymo_claudecode_prompt.md` に定義
- Claude Code（claude-sonnet-4-6）を使って実装

**実装内容**
- `manifest.json`：Manifest V3構成、必要なパーミッションと `host_permissions` を設定
- `background.js`：Service Workerとして動作。Gemini / Claude / OpenAI の3プロバイダーに対応したAPI呼び出しを実装。APIキーはここだけで扱うセキュリティ設計
- `content.js`：`mouseup` イベントでテキスト選択を検知。トリガーボタン表示・解説ポップアップ表示・簡易マークダウンパーサーを実装
- `content.css`：ポップアップUIのスタイル。3点ドットのローディングアニメーション付き
- `popup/`：設定画面。プロバイダー選択・APIキー入力（表示/非表示切り替え付き）・言語選択・保存機能
- `icons/`：Pythonで生成したプレースホルダーPNGアイコン（インディゴ円形＋「E」文字）

**動作確認**
- テキスト選択 → Etymoボタン表示 → 解説ポップアップ表示：**✅ 確認済み**
- 使用APIキー：Gemini API（Google AI Studio）

**環境整備**
- `gh` CLI を Homebrew でインストール・GitHub認証
- GitHubリポジトリ（`nami-jp/Etymo`）作成・初回コミット・プッシュ完了

---

### 2026-05-03 — Safari対応・Xcodeプロジェクト生成

**背景**
- 将来的なSafari対応を見据え、今のうちからXcodeで作業する方針を決定
- Chrome の `chrome.sidePanel` API は Safari 非対応のため、今後のサイドバー実装は iframe 疑似サイドバー方式（Chrome・Safari両対応）で進める方針に決定

**作業内容**
- `xcrun safari-web-extension-converter` で既存のWebエクステンションをXcodeプロジェクトに変換
- 変換先：`/Users/manabu/myapps/Etymo-Safari/`（Gitリポジトリとは別フォルダ）

**トラブルと解決**
- `manifest.json` の `description` フィールドに日本語が含まれていたため、変換ツール（`safari-web-extension-packager`）が `NSString stringWithUTF8String:` で SIGABRT クラッシュ
- Xcode 26 beta との組み合わせで発生する既知の問題と判断
- **対処：** description を英語に変更（`"AI-powered etymology, grammar, and meaning explanation for selected text"`）することで解決

**現在の状態**
- Xcodeプロジェクト生成：**✅ 完了**
- Safariでのビルド・動作確認：**未実施**（次のステップ）

---

## 今後の予定（TODO）

### 直近
- [ ] **Safariでのビルド・動作確認** — Xcodeで `⌘R` → Safari拡張として有効化・テスト
- [ ] **サイドバー機能の実装** — テキスト選択 → 右クリックメニュー「Etymoに送る」→ サイドパネルで語源解説・翻訳・品詞解析などを選択できるUI（iframe疑似サイドバー方式、Chrome・Safari両対応）

### 中期
- [ ] **アイコンのデザイン改善** — プレースホルダーから本番用デザインに差し替え
- [ ] **Claude / OpenAI APIでの動作確認** — APIキー取得後にテスト
- [ ] **ダークモード対応** — `prefers-color-scheme: dark` への対応
- [ ] **解説履歴機能** — 過去に調べた単語を `chrome.storage.local` に保存・一覧表示
- [ ] **コピーボタン** — 解説テキストをクリップボードにコピーできるボタン

### 将来的に
- [ ] **Chrome Web Store / Safari拡張機能ギャラリーへの公開**
- [ ] **システムプロンプトのカスタマイズ** — 設定画面でプロンプトを編集できるようにする
- [ ] **言語自動検出** — 選択テキストの言語を自動判定し解説言語を切り替え
- [ ] **iOS Safari対応** — Xcodeプロジェクトに iOS ターゲットを追加
