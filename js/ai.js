export async function askAI(prompt) {
  const res = await fetch("/.netlify/functions/gemini", {
    method: "POST",
    body: JSON.stringify({ prompt })
  });

  const data = await res.json();
  return data?.candidates?.[0]?.content?.parts?.[0]?.text || "No response";
}
