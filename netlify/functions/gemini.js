exports.handler = async function (event, context) {

  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "ok" };
  }

  try {
    if (!event.body) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "No data received" }),
      };
    }

    const { prompt, history } = JSON.parse(event.body);

    if (!prompt && !history) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: "Prompt is missing" }),
      };
    }

    const API_KEY = process.env.GEMINI_API_KEY;
    if (!API_KEY) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server API Key missing" }),
      };
    }

    const finalContent = history
      ? `${history}\nUser: ${prompt}\nAssistant:`
      : prompt;

    // ✅ CORRECT ENDPOINT (v1beta)
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-preview-09-2025:generateContent?key=${API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: finalContent }] }],
        }),
      }
    );

    const data = await response.json();

    if (!response.ok) {
      console.error("Gemini API Error:", data);
      return {
        statusCode: response.status,
        headers,
        body: JSON.stringify({
          error: data.error?.message || "Google API Error",
        }),
      };
    }

    const aiText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ response: aiText }),
    };

  } catch (err) {
    console.error("Function Crash:", err);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: err.message }),
    };
  }
};
