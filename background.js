/**
 * background.js - Service Worker
 *
 * 役割:
 * - content.js からメッセージを受け取り、AIのAPIを呼び出す
 * - APIキーは chrome.storage.local から取得し、ここだけで扱う
 * - content script にはAPIキーを渡さない（セキュリティ要件）
 */

// content.js からのメッセージを受け取る
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "EXPLAIN_TEXT") {
    // 非同期処理のために true を返す（これを忘れると sendResponse が無効になる）
    handleExplainRequest(request.text, sendResponse);
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
    sendResponse({
      success: false,
      error: "解説の取得に失敗しました。再試行してください。",
    });
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
async function callGeminiAPI(apiKey, systemPrompt, text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;

  const response = await fetch(url, {
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
        maxOutputTokens: 512,
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
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 512,
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
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 512,
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
