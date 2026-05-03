/**
 * background.js - Service Worker
 *
 * 役割:
 * - content.js からメッセージを受け取り、AIのAPIを呼び出す
 * - APIキーは chrome.storage.local から取得し、ここだけで扱う
 * - content script にはAPIキーを渡さない（セキュリティ要件）
 */

// コンテキストメニューの作成
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "etymo-sidebar",
      title: "Etymoに送る",
      contexts: ["selection"]
    });
  });
});

// コンテキストメニュークリック → content.js にサイドバー表示を指示
chrome.contextMenus.onClicked.addListener((info, tab) => {
  if (info.menuItemId === "etymo-sidebar" && tab?.id && info.selectionText) {
    chrome.tabs.sendMessage(
      tab.id,
      { type: "SHOW_SIDEBAR", text: info.selectionText },
      () => { void chrome.runtime.lastError; }
    );
  }
});

// content.js からのメッセージを受け取る
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "EXPLAIN_TEXT") {
    // 非同期処理のために true を返す（これを忘れると sendResponse が無効になる）
    handleExplainRequest(request.text, sendResponse);
    return true;
  }
  if (request.type === "EXPLAIN_SIDEBAR") {
    handleSidebarRequest(request.text, request.mode, sendResponse);
    return true;
  }
});

/**
 * テキスト解説リクエストを処理する
 * @param {string} text - 解説対象のテキスト
 * @param {function} sendResponse - レスポンスを返すコールバック
 */
async function handleExplainRequest(text, sendResponse) {
  try {
    // 設定をストレージから取得
    const settings = await chrome.storage.local.get([
      "provider",
      "apiKey",
      "language",
    ]);

    const provider = settings.provider || "gemini";
    const apiKey = settings.apiKey || "";
    const language = settings.language || "ja";

    // APIキー未設定チェック
    if (!apiKey) {
      sendResponse({
        success: false,
        error: "APIキーが未設定です。設定画面からAPIキーを登録してください。",
      });
      return;
    }

    // テキスト長チェック（500文字以上は拒否）
    if (text.length > 500) {
      sendResponse({
        success: false,
        error:
          "選択テキストが長すぎます。500文字以内のテキストを選択してください。",
      });
      return;
    }

    // システムプロンプトを構築
    const systemPrompt = buildSystemPrompt(language);

    // プロバイダーに応じてAPI呼び出し
    let result;
    if (provider === "gemini") {
      result = await callGeminiAPI(apiKey, systemPrompt, text);
    } else if (provider === "claude") {
      result = await callClaudeAPI(apiKey, systemPrompt, text);
    } else if (provider === "openai") {
      result = await callOpenAIAPI(apiKey, systemPrompt, text);
    } else {
      throw new Error("不明なプロバイダーです: " + provider);
    }

    sendResponse({ success: true, text: result });
  } catch (error) {
    console.error("[Etymo] API呼び出しエラー:", error);
    const message = error.name === "AbortError"
      ? "タイムアウトしました（30秒）。再試行してください。"
      : "解説の取得に失敗しました。再試行してください。";
    sendResponse({ success: false, error: message });
  }
}

/**
 * AIへのシステムプロンプトを構築する
 * @param {string} language - 解説言語 ("ja" or "en")
 * @returns {string} システムプロンプト
 */
function buildSystemPrompt(language) {
  if (language === "en") {
    return `You are a linguistic expert. When given a word or phrase, explain it concisely covering:
- Etymology: Latin/Greek roots and historical changes (for single words)
- Part of speech and grammatical role (for phrases/sentences)
- Meaning and nuance: dictionary definition vs. actual usage
- Related/derived words (if any)

Respond in English using Markdown format. Keep it to 100-150 words.`;
  }

  // デフォルトは日本語
  return `あなたは語源・言語学の専門家です。与えられた単語・フレーズ・文について、以下の観点で簡潔に解説してください：

- **語源・etymology**（単語の場合）：ラテン語・ギリシャ語などの原形と変遷
- **品詞・文法的役割**（文・フレーズの場合）
- **意味・ニュアンス**：辞書的な意味と実際の使われ方の違いなど
- **関連語・派生語**（あれば）

回答はマークダウン形式で、200〜400字程度を目安にコンパクトにまとめてください。`;
}

/**
 * Google Gemini API を呼び出す
 * モデル: gemini-1.5-flash（高速・無料枠が大きい）
 */
const API_TIMEOUT_MS = 30000;

function fetchWithTimeout(url, options) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), API_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal })
    .finally(() => clearTimeout(timer));
}

async function callGeminiAPI(apiKey, systemPrompt, text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`;

  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          parts: [{ text: `${systemPrompt}\n\n解説対象: 「${text}」` }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 2048,
      },
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Gemini API エラー: ${err.error?.message || response.status}`);
  }

  const data = await response.json();
  // Gemini のレスポンス構造からテキストを取り出す
  return data.candidates?.[0]?.content?.parts?.[0]?.text || "解説を取得できませんでした。";
}

/**
 * Anthropic Claude API を呼び出す
 * モデル: claude-haiku-4-5（高速・低コスト）
 */
async function callClaudeAPI(apiKey, systemPrompt, text) {
  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 2048,
      system: systemPrompt,
      messages: [{ role: "user", content: `解説対象: 「${text}」` }],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`Claude API エラー: ${err.error?.message || response.status}`);
  }

  const data = await response.json();
  return data.content?.[0]?.text || "解説を取得できませんでした。";
}

/**
 * OpenAI API を呼び出す
 * モデル: gpt-4o-mini（高速・低コスト）
 */
async function callOpenAIAPI(apiKey, systemPrompt, text) {
  const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 2048,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `解説対象: 「${text}」` },
      ],
    }),
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(`OpenAI API エラー: ${err.error?.message || response.status}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content || "解説を取得できませんでした。";
}

// ========== サイドバー用ハンドラ ==========

async function handleSidebarRequest(text, mode, sendResponse) {
  try {
    const settings = await chrome.storage.local.get(["provider", "apiKey", "language"]);
    const provider = settings.provider || "gemini";
    const apiKey = settings.apiKey || "";
    const language = settings.language || "ja";

    if (!apiKey) {
      sendResponse({ success: false, error: "APIキーが未設定です。設定画面からAPIキーを登録してください。" });
      return;
    }
    if (text.length > 500) {
      sendResponse({ success: false, error: "選択テキストが長すぎます。500文字以内を選択してください。" });
      return;
    }

    const systemPrompt = buildSidebarPrompt(language, mode);

    let result;
    if (provider === "gemini") {
      result = await callGeminiAPI(apiKey, systemPrompt, text);
    } else if (provider === "claude") {
      result = await callClaudeAPI(apiKey, systemPrompt, text);
    } else if (provider === "openai") {
      result = await callOpenAIAPI(apiKey, systemPrompt, text);
    } else {
      throw new Error("不明なプロバイダーです: " + provider);
    }

    sendResponse({ success: true, text: result });
  } catch (error) {
    console.error("[Etymo] サイドバーAPI呼び出しエラー:", error);
    const message = error.name === "AbortError"
      ? "タイムアウトしました（30秒）。再試行してください。"
      : "解説の取得に失敗しました。再試行してください。";
    sendResponse({ success: false, error: message });
  }
}

function buildSidebarPrompt(language, mode) {
  if (mode === "translate") {
    if (language === "en") {
      return `You are a professional translator. Translate the given text naturally, and briefly explain any important nuances, idioms, or cultural context. Respond in English using Markdown. Keep it under 200 words.`;
    }
    return `あなたはプロの翻訳者です。与えられたテキストを自然に翻訳し、重要なニュアンス・慣用表現・文化的背景があれば簡潔に補足してください。マークダウン形式で、300字以内でまとめてください。`;
  }
  if (mode === "grammar") {
    if (language === "en") {
      return `You are a linguistics expert. Analyze the given text in detail: identify the part of speech of each word, explain grammatical structures, clause types, and the role of each element. Respond in English using Markdown. Keep it under 200 words.`;
    }
    return `あなたは言語学の専門家です。与えられたテキストを詳細に分析してください：各語の品詞・文法構造・節の種類・各要素の役割を説明してください。マークダウン形式で、400字以内でまとめてください。`;
  }
  // デフォルト: 単語解説
  if (language === "en") {
    return `You are an English dictionary and linguistics expert. For the given English word, provide a structured explanation using exactly the following section headers in this order:

## Pronunciation
IPA notation (e.g. /pɒpjʊlər/)

## Meaning & Nuance
Dictionary definition and the image or connotation native speakers associate with this word (~100 words)

## Part of Speech
Which part(s) of speech (Noun, Verb, Adjective, etc.) and their grammatical roles

## Inflection / Conjugation
Verb conjugations (past tense, past participle, etc.), noun plurals, or pronoun case inflections if applicable. Write "N/A" if not applicable.

## Etymology
Origin, Latin/Greek roots and historical changes (~100 words)

## Related / Derived Words
List of related or derived words. Write "None" if not applicable.

Respond using Markdown. Use the exact section headers shown above.`;
  }

  return `あなたは英語辞書・言語学の専門家です。与えられた英単語について、以下のセクションを必ずすべて、指定した順番で記述してください。セクションのタイトルは必ず下記の通りにしてください。

## 発音
IPA（国際音声記号）での表記（例：/pɒpjʊlər/）

## 意味・ニュアンス
辞書的な意味と、ネイティブスピーカーがこの単語に持つイメージやニュアンスを200字程度で説明してください。

## 品詞・文法的役割
名詞 (Noun)・動詞 (Verb)・形容詞 (Adjective) などの品詞を明記し、複数ある場合はすべて記載してください。

## 屈折・活用
動詞の活用形（過去形・過去分詞など）、名詞の複数形、代名詞の格変化（I / my / me / mine など）を記載してください。該当しない場合は「なし」と記載してください。

## 語源・etymology
語源、ラテン語・ギリシャ語などの原形と変遷を200字程度で説明してください。

## 関連語・派生語
関連する単語や派生語をリスト形式で記載してください。なければ「なし」と記載してください。

マークダウン形式で回答してください。上記のセクションタイトルをそのまま使用してください。`;
}
