import { GoogleGenAI } from "@google/genai";
async function test() {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
  try {
    const res = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: "hello",
    });
    console.log("2.5-flash:", res.text);
  } catch(e) {
    console.log("2.5-flash error:", e.message);
  }
  
  try {
    const res = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: "hello",
    });
    console.log("3-flash:", res.text);
  } catch(e) {
    console.log("3-flash error:", e.message);
  }
}
test();