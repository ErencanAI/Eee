"use strict";

require("dotenv").config();

const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json({ limit: "10mb" }));
app.use(express.static(path.join(__dirname, "public")));

const OPENROUTER_URL =
  "https://openrouter.ai/api/v1/chat/completions";

const MODEL =
  process.env.AI_MODEL || "openrouter/free";

app.get("/api/status", (req, res) => {
  res.json({
    ok: true,
    name: "TürkAI",
    ai: "OpenRouter",
    model: MODEL,
    keyConfigured: Boolean(process.env.OPENROUTER_API_KEY)
  });
});

app.post("/api/chat", async (req, res) => {
  try {
    const { message, history = [] } = req.body;

    if (!message || typeof message !== "string") {
      return res.status(400).json({
        ok: false,
        error: "Mesaj gerekli."
      });
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return res.status(500).json({
        ok: false,
        error: "OPENROUTER_API_KEY ayarlanmamış."
      });
    }

    const safeHistory = Array.isArray(history)
      ? history
          .filter(x =>
            x &&
            ["user", "assistant"].includes(x.role) &&
            typeof x.content === "string"
          )
          .slice(-20)
      : [];

    const messages = [
      {
        role: "system",
        content:
          "Sen TürkAI'sın. Türkçe konuş. Açık, doğru ve yardımcı cevaplar ver. Gereksiz yere uzatma."
      },
      ...safeHistory,
      {
        role: "user",
        content: message.slice(0, 20000)
      }
    ];

    const response = await fetch(OPENROUTER_URL, {
      method: "POST",
      headers: {
        "Authorization":
          `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "X-Title": "TürkAI"
      },
      body: JSON.stringify({
        model: MODEL,
        messages,
        temperature: 0.7,
        max_tokens: 2000
      })
    });

    const data = await response.json();

    if (!response.ok) {
      console.error("OpenRouter error:", data);

      return res.status(response.status).json({
        ok: false,
        error:
          data?.error?.message ||
          "Yapay zeka isteği başarısız oldu."
      });
    }

    const answer =
      data?.choices?.[0]?.message?.content;

    if (!answer) {
      return res.status(502).json({
        ok: false,
        error: "Model cevap döndürmedi."
      });
    }

    res.json({
      ok: true,
      answer,
      model: MODEL
    });

  } catch (error) {
    console.error("Server error:", error);

    res.status(500).json({
      ok: false,
      error: "Sunucu hatası oluştu."
    });
  }
});

app.listen(PORT, () => {
  console.log("🔥 TürkAI çalışıyor");
  console.log(`🌐 http://localhost:${PORT}`);
  console.log(`🤖 Model: ${MODEL}`);
});
