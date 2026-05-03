/**
 * content.js - コンテンツスクリプト
 *
 * 役割:
 * - Webページ上のテキスト選択を検知する
 * - 選択テキストの近くに「Etymo」ボタンを表示する
 * - ボタンクリックで解説ポップアップを表示する
 * - background.js にメッセージを送り、AI解説を取得する
 *
 * セキュリティ: APIキーは扱わない。background.js に処理を委譲する。
 */

// ========== 状態管理 ==========
let triggerButton = null;  // 「Etymo」トリガーボタン要素
let popup = null;           // 解説ポップアップ要素
let selectedText = "";      // 現在選択中のテキスト
let selectionRect = null;   // 選択範囲の座標情報

// ========== テキスト選択の検知 ==========

/**
 * マウスを離したときに選択テキストをチェックする
 */
document.addEventListener("mouseup", (e) => {
  // ポップアップ内のクリックは無視
  if (popup && popup.contains(e.target)) return;
  if (triggerButton && triggerButton.contains(e.target)) return;

  setTimeout(() => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();

    if (text && text.length > 0) {
      selectedText = text;
      selectionRect = selection.getRangeAt(0).getBoundingClientRect();
      showTriggerButton();
    } else {
      hideTriggerButton();
    }
  }, 10); // 選択確定を待つ
});

/**
 * ページクリック時：ポップアップとボタンを閉じる
 */
document.addEventListener("mousedown", (e) => {
  if (popup && !popup.contains(e.target)) {
    hidePopup();
  }
  if (triggerButton && !triggerButton.contains(e.target)) {
    // テキスト選択が残っている場合はボタンを維持
    const selection = window.getSelection();
    if (!selection || selection.toString().trim() === "") {
      hideTriggerButton();
    }
  }
});

// ========== トリガーボタン ==========

/**
 * 選択テキストの近くに「Etymo」ボタンを表示する
 */
function showTriggerButton() {
  hideTriggerButton(); // 既存のボタンを削除

  triggerButton = document.createElement("div");
  triggerButton.id = "etymo-trigger";
  triggerButton.textContent = "Etymo";
  triggerButton.setAttribute("role", "button");
  triggerButton.setAttribute("aria-label", "Etymo: 語源・意味を解説");

  // 選択テキストの下に表示（スクロール位置を考慮）
  const x = selectionRect.left + window.scrollX + selectionRect.width / 2;
  const y = selectionRect.bottom + window.scrollY + 6;

  triggerButton.style.left = `${x}px`;
  triggerButton.style.top = `${y}px`;

  triggerButton.addEventListener("click", onTriggerClick);
  document.body.appendChild(triggerButton);
}

/**
 * トリガーボタンを非表示にする
 */
function hideTriggerButton() {
  if (triggerButton) {
    triggerButton.remove();
    triggerButton = null;
  }
}

/**
 * トリガーボタンがクリックされたとき
 */
function onTriggerClick(e) {
  e.stopPropagation();
  hideTriggerButton();
  showPopup(selectedText);
}

// ========== 解説ポップアップ ==========

/**
 * 解説ポップアップを表示し、background.js にAPI呼び出しを依頼する
 * @param {string} text - 解説対象のテキスト
 */
function showPopup(text) {
  hidePopup(); // 既存のポップアップを削除

  popup = document.createElement("div");
  popup.id = "etymo-popup";

  // ヘッダー（タイトル + 閉じるボタン）
  const header = document.createElement("div");
  header.className = "etymo-popup-header";

  const title = document.createElement("span");
  title.className = "etymo-popup-title";
  title.textContent = "Etymo";

  const closeBtn = document.createElement("button");
  closeBtn.className = "etymo-close-btn";
  closeBtn.textContent = "✕";
  closeBtn.setAttribute("aria-label", "閉じる");
  closeBtn.addEventListener("click", hidePopup);

  header.appendChild(title);
  header.appendChild(closeBtn);

  // 選択テキストの表示
  const selectedDisplay = document.createElement("div");
  selectedDisplay.className = "etymo-selected-text";
  // 長すぎる場合は省略表示
  selectedDisplay.textContent =
    text.length > 60 ? text.substring(0, 60) + "…" : text;

  // 解説コンテンツエリア（ローディング中に使う）
  const content = document.createElement("div");
  content.className = "etymo-content";
  content.innerHTML = '<div class="etymo-loading"><span></span><span></span><span></span></div>';

  popup.appendChild(header);
  popup.appendChild(selectedDisplay);
  popup.appendChild(content);

  // ポップアップを選択テキストの近くに配置
  positionPopup();

  document.body.appendChild(popup);

  // background.js に解説依頼を送る
  chrome.runtime.sendMessage(
    { type: "EXPLAIN_TEXT", text: text },
    (response) => {
      if (chrome.runtime.lastError) {
        // Service Worker が起動していない場合など
        showError(content, "拡張機能との通信に失敗しました。ページを再読み込みしてください。");
        return;
      }

      if (response.success) {
        showResult(content, response.text);
      } else {
        showError(content, response.error);
      }
    }
  );
}

/**
 * ポップアップを選択位置の近くに配置する（画面外にはみ出さないよう調整）
 */
function positionPopup() {
  const margin = 10; // 画面端からのマージン
  const popupWidth = 340;

  // 初期位置：選択テキストの下
  let x = selectionRect.left + window.scrollX;
  let y = selectionRect.bottom + window.scrollY + 10;

  // 右端チェック
  if (x + popupWidth > window.innerWidth + window.scrollX - margin) {
    x = window.innerWidth + window.scrollX - popupWidth - margin;
  }
  // 左端チェック
  if (x < window.scrollX + margin) {
    x = window.scrollX + margin;
  }

  popup.style.left = `${x}px`;
  popup.style.top = `${y}px`;
}

/**
 * ポップアップを非表示にする
 */
function hidePopup() {
  if (popup) {
    popup.remove();
    popup = null;
  }
}

/**
 * 解説結果をマークダウンからHTMLに変換して表示する
 * （簡易パーサー：外部ライブラリ不使用）
 * @param {HTMLElement} container - 表示先のコンテナ要素
 * @param {string} markdownText - マークダウン形式のテキスト
 */
function showResult(container, markdownText) {
  container.innerHTML = "";
  const resultDiv = document.createElement("div");
  resultDiv.className = "etymo-result";
  resultDiv.innerHTML = parseMarkdown(markdownText);
  container.appendChild(resultDiv);
}

/**
 * エラーメッセージを表示する
 * @param {HTMLElement} container - 表示先のコンテナ要素
 * @param {string} message - エラーメッセージ
 */
function showError(container, message) {
  container.innerHTML = "";
  const errorDiv = document.createElement("div");
  errorDiv.className = "etymo-error";
  errorDiv.textContent = message;
  container.appendChild(errorDiv);
}

// ========== 簡易マークダウンパーサー ==========

/**
 * マークダウンテキストをHTMLに変換する（外部ライブラリ不使用）
 * 対応記法: **太字**, *斜体*, ## 見出し, - リスト
 * @param {string} text - マークダウン形式のテキスト
 * @returns {string} HTML文字列
 */
function parseMarkdown(text) {
  // XSS対策: まずHTMLエスケープしてから変換
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  return escaped
    // ## 見出し
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h2>$1</h2>")
    // **太字**
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    // *斜体*
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    // - リスト項目
    .replace(/^[-*] (.+)$/gm, "<li>$1</li>")
    // li を ul でラップ（連続するli）
    .replace(/(<li>.*<\/li>(\n|$))+/g, (match) => `<ul>${match}</ul>`)
    // 空行を段落区切りに
    .replace(/\n\n/g, "</p><p>")
    // 残りの改行をbrに
    .replace(/\n/g, "<br>")
    // 全体をpタグで囲む
    .replace(/^(.+)$/, "<p>$1</p>");
}
