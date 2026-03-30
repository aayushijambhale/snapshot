import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

export async function findMatchingPhotos(selfieBase64s: string[], photos: { id: string, url: string }[]) {
  if (photos.length === 0 || selfieBase64s.length === 0) return [];

  // Prepare parts for Gemini
  // Part 1: The selfies
  const selfieParts = selfieBase64s.map((s, i) => ({
    inlineData: {
      data: s.split(',')[1],
      mimeType: "image/jpeg"
    }
  }));

  // Part 2: The event photos
  const photoParts = photos.map((p, index) => ({
    inlineData: {
      data: p.url.split(',')[1],
      mimeType: "image/jpeg"
    }
  }));

  const prompt = `
    I am providing ${selfieBase64s.length} selfie(s) (the first ${selfieBase64s.length} image(s)) and a series of event photos.
    Identify which of the event photos contain the person from the selfies. 
    Even if the person appears in different angles or lighting in the selfies, use all of them as reference.
    Return the indices (0-based) of the matching event photos as a JSON array of numbers.
    If no matches are found, return an empty array [].
    Only return the JSON array, nothing else.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          ...selfieParts,
          ...photoParts,
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER }
        }
      }
    });

    const matchingIndices = JSON.parse(response.text || "[]");
    return matchingIndices.map((idx: number) => photos[idx]?.id).filter(Boolean);
  } catch (error) {
    console.error("Gemini face search error:", error);
    throw error;
  }
}
