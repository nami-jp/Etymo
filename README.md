
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
- **開発環境:** Xcode をメインエディタとして使用。Claude Code はターミナルで起動して対話

---

## フォルダ構成

```
Etymo/                                 ← Git管理ルート・Xcodeプロジェクトルート
├── Etymo.xcodeproj                    ← XcodeでここをOpenする
├── Etymo/                             ← Safariネイティブアプリ（Swift・自動生成）
│   ├── AppDelegate.swift
│   ├── ViewController.swift
│   ├── Assets.xcassets/
│   ├── Base.lproj/Main.storyboard
│   ├── Info.plist
│   └── Resources/                     ← Safariポップアップ用リソース（自動生成）
│       ├── Base.lproj/Main.html
│       ├── Script.js
│       └── Style.css
├── Etymo Extension/                   ← Safariラッパー（Swift・自動生成）
│   ├── SafariWebExtensionHandler.swift
│   └── Info.plist
├── manifest.json                      ← Web拡張ソース（Chrome / Safari 共通）
├── background.js                      ← Service Worker・API呼び出し
├── content.js                         ← テキスト選択検知・ポップアップUI
├── content.css                        ← ポップアップのスタイル
├── popup/
│   ├── popup.html                     ← 設定画面
│   ├── popup.js
│   └── popup.css
├── icons/
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
├── AGENTS.md                          ← AI作業ルール（必読・Git管理外）
└── etymo_claudecode_prompt.md         ← 初期開発プロンプト（仕様書・Git管理外）
```

> **編集対象:** `manifest.json` / `background.js` / `content.js` / `content.css` / `popup/` が Web拡張の本体。
> `Etymo/`（Swift）と `Etymo Extension/` は Xcode が管理する自動生成ファイル。基本的に手動編集しない。

---

## 開発フロー

```
Xcode で Etymo.xcodeproj を開く
  ↓
JS / HTML / CSS を編集（manifest.json / background.js / content.js / popup/ など）
  ↓
Chrome で確認  →  chrome://extensions でリロード
  ↓
Safari で確認  →  Xcode で ⌘R ビルド → Safari 機能拡張を有効化
```

Claude Code との対話はターミナルで `claude` コマンドを起動して行う。

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

## インストール・起動手順

### Chrome（デベロッパーモード）

1. Chrome で `chrome://extensions` を開く
2. 右上の「デベロッパーモード」をオンにする
3. 「パッケージ化されていない拡張機能を読み込む」をクリック
4. `/Users/manabu/myapps/Etymo/` フォルダを選択
5. 「Etymo」が一覧に表示されればインストール完了

### Safari（Xcodeビルド）

1. `/Users/manabu/myapps/Etymo/Etymo.xcodeproj` をXcodeで開く
2. `⌘R` でビルド・実行
3. Safari → 設定 → 機能拡張 → Etymo を有効化

> **注意:** Xcodeプロジェクトを再生成する場合は `--force` フラグを使わないこと。
> Web拡張ファイルが上書き削除される（過去に実際に発生したトラブル）。
> 再生成が必要な場合は別フォルダに出力してから手動でマージすること。

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
- テキスト選択 → Etymoボタン表示 → 解説ポップアップ表示：**✅ 確認済み（Gemini API）**

**環境整備**
- `gh` CLI を Homebrew でインストール・GitHub認証
- GitHubリポジトリ（`nami-jp/Etymo`）作成・初回コミット・プッシュ完了

---

### 2026-05-03 — Xcodeプロジェクト統合・フォルダ構成整理

**方針決定**
- 将来的なSafari対応を見据え、Xcodeをメインエディタとして使用する方針に決定
- Chrome の `chrome.sidePanel` API は Safari 非対応のため、今後のサイドバー実装は **iframe 疑似サイドバー方式**（Chrome・Safari両対応）で進める方針に決定
- Claude Code は Xcode 内ターミナルまたはターミナルアプリから `claude` コマンドで起動して使用

**Xcodeプロジェクト生成・統合**
- `xcrun safari-web-extension-converter` で Webエクステンションを変換し、Xcodeプロジェクトを生成
- `Etymo.xcodeproj` を `Etymo/` ルート直下に配置することで、XcodeとChromeの作業フォルダを一本化

**トラブルと解決**
- `manifest.json` の `description` フィールドの日本語が変換ツールのクラッシュ原因（Xcode 26 beta の既知問題）
  → description を英語に変更して解決
- `--force` フラグによりWeb拡張ファイルが全消去されるトラブルが発生
  → GitHubからクローンして復元。以後 `--force` フラグは使用禁止

**現在の状態**
- Chrome動作確認：**✅ 完了**
- Xcodeプロジェクト生成・統合：**✅ 完了**
- Safariでのビルド・動作確認：**✅ 完了**（2026-05-03 午後に実施）

---

### 2026-05-03（午後）— サイドバー機能実装・Safari対応

#### 実装内容

**サイドバーUI（iframe疑似サイドバー方式）**
- `sidebar/sidebar.html` / `sidebar/sidebar.js` / `sidebar/sidebar.css` を新規作成
- テキスト選択 → Etymoボタンクリック または 右クリック「Etymoに送る」でサイドバーを開く
- モードボタン3種：**単語解説**（単語のときのみ有効）/ **翻訳** / **品詞解析**
- ボタンを押してから初めてAPIコールする設計（表示直後はAPIコールしない）
- 単語解説は6セクション構成でカード表示（発音 / 意味・ニュアンス / 品詞・文法的役割 / 屈折・活用 / 語源・etymology / 関連語・派生語）

**パネルのリサイズ**
- 左端のハンドルをドラッグしてパネル幅を変更可能
- 幅は `chrome.storage.local`（キー: `sidebarWidth`）に保存し、次回起動時に復元

**パネルの折りたたみ／展開**
- マウスがパネルから離れて 400ms 後に自動折りたたみ（右端に「E」タブが出現）
- 「E」タブをクリックで再展開
- 一度パネルにマウスが入ってから離れた場合のみ折りたたむ（開いた直後は折りたたまない）

**ピン留め機能**
- ヘッダーの 📌 ボタンでピン留めON/OFF
- ピン留め中はマウスが離れても折りたたまない
- 状態は `chrome.storage.local`（キー: `sidebarPinned`）に保存し次回も維持

**解析結果のキャッシュ**
- 同一テキストで同一モードのAPIコール結果をメモリにキャッシュ
- 別モードに切り替えて戻ったときはキャッシュを表示（APIコール不要）
- キャッシュ表示中は「↻ 再取得」ボタンを表示
- テキストを選び直すとキャッシュをクリア

**APIリクエスト制御**
- リクエスト中はモードボタンを disabled にし、モード切り替えによる応答の誤表示を防止
- タイムアウト 30秒（`AbortController` 使用）
- エラー・タイムアウト時はエラーメッセージをパネル内に表示

#### Safari 対応

**問題の発端**
- フォルダ構成の整理で web 拡張ファイル（manifest.json / background.js / content.js 等）がプロジェクトルートに移動されていたが、Xcode の `Etymo Extension` ターゲットのビルド対象に含まれていなかった
- Safari のバンドル（`Etymo Extension.appex`）に manifest.json / background.js / sidebar/ 等が一切含まれていない状態だった

**解決策**
- `Etymo.xcodeproj/project.pbxproj` に **Run Script ビルドフェーズ**「Copy Web Extension Resources」を追加
- ビルド時に `manifest.json` / `background.js` / `content.js` / `content.css` / `popup/` / `icons/` / `sidebar/` をバンドルの `Resources/` へコピーするスクリプトを設定
- `ENABLE_USER_SCRIPT_SANDBOXING = NO` を `Etymo Extension` ターゲットの Debug / Release 両設定に追加（サンドボックス制限の回避）
- `alwaysOutOfDate = 1` を設定し、Xcode の依存関係警告を抑止

**Safari での更新手順（重要）**
1. Xcode で `⌘R` ビルド＆実行
2. Safari を完全に終了 → 再起動
3. Safari 設定 → 機能拡張 → Etymo を OFF → ON に切り替え
4. テストページをリロード
- ※ `Etymo.app` 自体は起動後すぐ閉じてよい。拡張機能は Safari プロセス内で動作し続ける

**Safari で更新が反映されない場合**
- 古い `Etymo.app` が Safari に残っている可能性がある
- Safari の設定から Etymo を一度削除し、Xcode で再実行すると確実

**動作確認**
- Chrome：**✅ 全機能確認済み**
- Safari：**✅ 確認済み**（単語選択 → Etymoボタン / 右クリックメニュー → サイドバー表示）

---

## 既知の制約事項

### APIリクエスト中にパネルを閉じてもリクエストはキャンセルされない

Etymoパネルの ✕ ボタンで閉じた場合、パネルは非表示になるが内部の iframe は DOM に残り続ける。
`background.js`（Service Worker）で実行中の API リクエストは継続して走り、レスポンスが返ってきた段階でキャッシュに保存される。

- APIクォータは消費される
- ユーザーには結果が見えないが、パネルを再度開いた際にキャッシュが利用される場合がある

**背景:** content script と Service Worker は別コンテキストであるため、content.js 側からは `fetch()` の中断ができない。

---

## 今後の予定（TODO）

### 直近
- [ ] **「翻訳」機能の動作確認・調整** — プロンプトは実装済み。表示品質の確認と微調整
- [ ] **「品詞解析」機能の動作確認・調整** — 同上
- [ ] **ショートカットキー** — キーボードショートカットでサイドバーを開く

### 中期
- [ ] **アイコンのデザイン改善** — プレースホルダーから本番用デザインに差し替え
- [ ] **Claude / OpenAI APIでの動作確認** — APIキー取得後にテスト
- [ ] **ダークモード対応** — `prefers-color-scheme: dark` への対応
- [ ] **解説履歴機能** — 過去に調べた単語を `chrome.storage.local` に保存・一覧表示
- [ ] **コピーボタン** — 解説テキストをクリップボードにコピーできるボタン
- [ ] **発音・TTS** — 単語の発音をボタンで再生
- [ ] **設定画面の拡張** — パネル位置・カラーテーマ・フォントサイズのカスタマイズ

### 将来的に
- [ ] **Chrome Web Store / Safari拡張機能ギャラリーへの公開**
- [ ] **システムプロンプトのカスタマイズ** — 設定画面でプロンプトを編集できるようにする
- [ ] **言語自動検出** — 選択テキストの言語を自動判定し解説言語を切り替え
- [ ] **iOS Safari対応** — Xcodeプロジェクトに iOS ターゲットを追加
