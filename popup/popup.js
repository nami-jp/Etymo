/**
 * popup.js - 設定画面のロジック
 *
 * 役割:
 * - 保存済みの設定を chrome.storage.local から読み込み画面に反映する
 * - 設定変更を chrome.storage.local に保存する
 * - プロバイダー変更時にAPIキーのヒントを更新する
 */

// ========== DOM要素の取得 ==========
const providerSelect = document.getElementById("provider");
const apiKeyInput = document.getElementById("apiKey");
const toggleKeyBtn = document.getElementById("toggleKey");
const languageSelect = document.getElementById("language");
const saveBtn = document.getElementById("saveBtn");
const feedbackEl = document.getElementById("feedback");
const apiKeyHint = document.getElementById("apiKeyHint");

// ========== プロバイダーごとのヒントテキスト ==========
const HINTS = {
  gemini:
    "Google AI Studio (aistudio.google.com) で取得できます。無料枠あり。",
  claude:
    "Anthropic Console (console.anthropic.com) で取得できます。クレジットカード登録が必要です。",
  openai:
    "OpenAI Platform (platform.openai.com) で取得できます。クレジットカード登録が必要です。",
};

// ========== 初期化：保存済み設定の読み込み ==========
document.addEventListener("DOMContentLoaded", () => {
  chrome.storage.local.get(["provider", "apiKey", "language"], (settings) => {
    // 保存済みの値があれば画面に反映（なければデフォルト値のまま）
    if (settings.provider) providerSelect.value = settings.provider;
    if (settings.apiKey) apiKeyInput.value = settings.apiKey;
    if (settings.language) languageSelect.value = settings.language;

    // ヒントテキストを現在のプロバイダーに合わせて表示
    updateHint(providerSelect.value);
  });
});

// ========== プロバイダー変更時の処理 ==========
providerSelect.addEventListener("change", () => {
  updateHint(providerSelect.value);
  // プロバイダーが変わったらAPIキー欄をクリア（別のキーを入力しやすくする）
  apiKeyInput.value = "";
  feedbackEl.textContent = "";
});

/**
 * プロバイダーに対応するヒントテキストを表示する
 * @param {string} provider - プロバイダーID
 */
function updateHint(provider) {
  apiKeyHint.textContent = HINTS[provider] || "";
}

// ========== APIキー 表示/非表示切り替え ==========
toggleKeyBtn.addEventListener("click", () => {
  const isPassword = apiKeyInput.type === "password";
  apiKeyInput.type = isPassword ? "text" : "password";
  toggleKeyBtn.textContent = isPassword ? "🙈" : "👁";
});

// ========== 設定の保存 ==========
saveBtn.addEventListener("click", saveSettings);

// Enterキーでも保存できるようにする
apiKeyInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") saveSettings();
});

/**
 * 設定を chrome.storage.local に保存する
 */
function saveSettings() {
  const provider = providerSelect.value;
  const apiKey = apiKeyInput.value.trim();
  const language = languageSelect.value;

  // APIキーが空の場合は警告
  if (!apiKey) {
    showFeedback("APIキーを入力してください。", "error");
    apiKeyInput.focus();
    return;
  }

  // ボタンを一時的に無効化（二重保存防止）
  saveBtn.disabled = true;
  saveBtn.textContent = "保存中…";

  chrome.storage.local.set({ provider, apiKey, language }, () => {
    if (chrome.runtime.lastError) {
      showFeedback("保存に失敗しました。再試行してください。", "error");
    } else {
      showFeedback("設定を保存しました！", "success");
    }

    // ボタンを元に戻す
    saveBtn.disabled = false;
    saveBtn.textContent = "設定を保存";
  });
}

/**
 * フィードバックメッセージを表示する（3秒後に自動で消える）
 * @param {string} message - 表示するメッセージ
 * @param {"success"|"error"} type - メッセージの種類
 */
function showFeedback(message, type) {
  feedbackEl.textContent = message;
  feedbackEl.className = `feedback ${type}`;

  // 成功メッセージは自動で消す
  if (type === "success") {
    setTimeout(() => {
      feedbackEl.textContent = "";
      feedbackEl.className = "feedback";
    }, 3000);
  }
}
