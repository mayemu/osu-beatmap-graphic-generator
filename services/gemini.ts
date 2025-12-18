import { GoogleGenAI } from "@google/genai";

export const generateVibeTagline = async (title: string, artist: string, tags: string): Promise<string> => {
  try {
    if (!process.env.API_KEY) {
        console.warn("No API Key available for Gemini.");
        return "Rhythm is just a click away!";
    }

    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    const model = 'gemini-2.5-flash';

    const prompt = `
      Write a short, aesthetic, and catchy 3-5 word tagline for a music banner.
      The song is "${title}" by "${artist}".
      Tags associated with it: ${tags}.
      The tagline should capture the mood (e.g., energetic, melancholic, intense, anime, electronic).
      Do not use quotes.
    `;

    const response = await ai.models.generateContent({
      model: model,
      contents: prompt,
      config: {
        maxOutputTokens: 20,
        temperature: 0.8,
      }
    });

    return response.text?.trim() || "Feel the rhythm";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "Click the circles";
  }
};
