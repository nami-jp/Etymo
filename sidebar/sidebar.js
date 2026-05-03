let currentText = "";
let currentMode = null;
let isPinned = false;
let resultCache = {};     // { etymology: "...", translate: "...", grammar: "..." }
let isAnalyzing = false;  // APIリクエスト中フラグ

document.getElementById("close-btn").addEventListener("click", () => {
  window.parent.postMessage({ type: "SIDEBAR_CLOSE" }, "*");
});

document.getElementById("pin-btn").addEventListener("click", () => {
  isPinned = !isPinned;
  updatePinButton();
  window.parent.postMessage({ type: "SIDEBAR_PIN", pinned: isPinned }, "*");
});

function updatePinButton() {
  const btn = document.getElementById("pin-btn");
  btn.classList.toggle("active", isPinned);
  btn.setAttribute("aria-label", isPinned ? "ピン留め中" : "ピン留め");
}

document.querySelectorAll(".mode-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    if (btn.disabled || isAnalyzing) return;
    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    currentMode = btn.dataset.mode;
    if (currentText) {
      if (resultCache[currentMode] !== undefined) {
        showResult(resultCache[currentMode], true);
      } else {
        requestAnalysis();
      }
    }
  });
});

window.addEventListener("message", (e) => {
  if (e.data.type === "SIDEBAR_INIT_PIN") {
    isPinned = e.data.pinned;
    updatePinButton();
  } else if (e.data.type === "SET_TEXT") {
    currentText = e.data.text;
    resultCache = {};
    setAnalyzing(false);

    const display = document.getElementById("selected-text");
    display.textContent = currentText.length > 80
      ? currentText.substring(0, 80) + "…"
      : currentText;

    const etymologyBtn = document.querySelector('[data-mode="etymology"]');
    const isWord = isSingleWord(currentText);
    etymologyBtn.disabled = !isWord;

    document.querySelectorAll(".mode-btn").forEach(b => b.classList.remove("active"));
    currentMode = null;
    showPlaceholder("上のボタンを選んで解析してください");
  } else if (e.data.type === "ANALYZE_RESULT") {
    setAnalyzing(false);
    if (e.data.success) {
      resultCache[currentMode] = e.data.text;
      showResult(e.data.text, false);
    } else {
      showError(e.data.error);
    }
  }
});

function isSingleWord(text) {
  return /^\S+$/.test(text.trim());
}

function setAnalyzing(flag) {
  isAnalyzing = flag;
  document.querySelectorAll(".mode-btn").forEach(btn => {
    if (flag) {
      btn.dataset.wasDisabled = btn.disabled ? "1" : "0";
      btn.disabled = true;
    } else {
      btn.disabled = btn.dataset.wasDisabled === "1";
    }
  });
}

function requestAnalysis(forceMode) {
  const mode = forceMode || currentMode;
  if (!currentText || !mode) return;
  currentMode = mode;
  setAnalyzing(true);
  showLoading();
  window.parent.postMessage({
    type: "SIDEBAR_ANALYZE",
    text: currentText,
    mode: currentMode
  }, "*");
}

function showPlaceholder(message) {
  document.getElementById("content").innerHTML =
    `<div class="placeholder">${escapeHtml(message)}</div>`;
}

function showLoading() {
  document.getElementById("content").innerHTML =
    '<div class="loading"><span></span><span></span><span></span></div>';
}

function showResult(markdownText, fromCache) {
  const content = document.getElementById("content");
  content.innerHTML = "";

  if (fromCache) {
    const bar = document.createElement("div");
    bar.className = "cache-bar";
    const label = document.createElement("span");
    label.className = "cache-label";
    label.textContent = "キャッシュ表示中";
    const reloadBtn = document.createElement("button");
    reloadBtn.className = "reload-btn";
    reloadBtn.textContent = "↻ 再取得";
    reloadBtn.addEventListener("click", () => {
      delete resultCache[currentMode];
      requestAnalysis();
    });
    bar.appendChild(label);
    bar.appendChild(reloadBtn);
    content.appendChild(bar);
  }

  if (currentMode === "etymology") {
    showWordAnalysis(markdownText, content);
  } else {
    const div = document.createElement("div");
    div.className = "result";
    div.innerHTML = parseMarkdown(markdownText);
    content.appendChild(div);
  }
}

function showWordAnalysis(markdownText, container) {
  const sections = parseWordSections(markdownText);

  if (sections.length === 0) {
    const div = document.createElement("div");
    div.className = "result";
    div.innerHTML = parseMarkdown(markdownText);
    container.appendChild(div);
    return;
  }

  for (const [title, body] of sections) {
    const section = document.createElement("div");
    section.className = "word-section";

    const header = document.createElement("div");
    header.className = "word-section-header";
    header.textContent = title;

    const bodyDiv = document.createElement("div");
    bodyDiv.className = "word-section-body";
    bodyDiv.innerHTML = parseMarkdownBody(body.trim());

    section.appendChild(header);
    section.appendChild(bodyDiv);
    container.appendChild(section);
  }
}

function parseWordSections(text) {
  const sections = [];
  const lines = text.split("\n");
  let currentTitle = null;
  let currentBody = [];

  for (const line of lines) {
    if (/^## /.test(line)) {
      if (currentTitle !== null) {
        sections.push([currentTitle, currentBody.join("\n")]);
      }
      currentTitle = line.replace(/^## /, "").trim();
      currentBody = [];
    } else {
      if (currentTitle !== null) {
        currentBody.push(line);
      }
    }
  }
  if (currentTitle !== null) {
    sections.push([currentTitle, currentBody.join("\n")]);
  }
  return sections;
}

function parseMarkdownBody(text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/(<\/li>)\s+(<li>)/g, "$1\n$2")
    .replace(/(<li>.*<\/li>(\n|$))+/g, (match) => `<ul>${match.replace(/\n/g, "")}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^(?!<[upo])(.+)$/, "<p>$1</p>");
}

function showError(message) {
  document.getElementById("content").innerHTML =
    `<div class="error">${escapeHtml(message)}</div>`;
}

function escapeHtml(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function parseMarkdown(text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  return escaped
    .replace(/^## (.+)$/gm, "<h3>$1</h3>")
    .replace(/^# (.+)$/gm, "<h2>$1</h2>")
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/^[-*]\s+(.+)$/gm, "<li>$1</li>")
    .replace(/\*(.+?)\*/g, "<em>$1</em>")
    .replace(/(<\/li>)\s+(<li>)/g, "$1\n$2")
    .replace(/(<li>.*<\/li>(\n|$))+/g, (match) => `<ul>${match.replace(/\n/g, "")}</ul>`)
    .replace(/\n\n/g, "</p><p>")
    .replace(/\n/g, "<br>")
    .replace(/^(.+)$/, "<p>$1</p>");
}
