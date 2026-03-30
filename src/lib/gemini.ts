import { GoogleGenAI, Type } from "@google/genai";

// Use import.meta.env for Vite projects
const KEY = import.meta.env.VITE_GEMINI_API_KEY || '';
const ai = new GoogleGenAI({ apiKey: KEY });

async function getBase64FromUrl(url: string): Promise<string> {
  if (url.startsWith('data:')) {
    return url.split(',')[1];
  }
  
  try {
    const response = await fetch(url);
    const blob = await response.blob();
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch (e) {
    console.error('Failed to fetch image for AI matching:', e);
    return '';
  }
}

export async function findMatchingPhotos(selfieBase64s: string[], photos: { id: string, url: string }[]) {
  if (photos.length === 0 || selfieBase64s.length === 0) return [];

  if (!KEY) {
    console.error('GEMINI_API_KEY is not set. AI search will not work.');
    throw new Error('AI Search Unavailable: Missing API Key');
  }

  // Prepare parts for Gemini
  // Part 1: The selfies
  const selfieParts = selfieBase64s.map((s) => ({
    inlineData: {
      data: s.split(',')[1],
      mimeType: "image/jpeg"
    }
  }));

  // Part 2: The event photos (Fetch them if they are URLs)
  const photoPartsPromises = photos.map(async (p) => {
    const base64 = await getBase64FromUrl(p.url);
    return {
      inlineData: {
        data: base64,
        mimeType: "image/jpeg"
      }
    };
  });

  const photoParts = await Promise.all(photoPartsPromises);

  const prompt = `
    I am providing ${selfieBase64s.length} selfie(s) (the first ${selfieBase64s.length} image(s)) and a series of event photos.
    Identify which of the event photos contain the person from the selfies. 
    Even if the person appears in different angles or lighting in the selfies, use all of them as reference.
    Return the indices (0-based, relative to the event photos only) of the matching event photos as a JSON array of numbers.
    If no matches are found, return an empty array [].
    Only return the JSON array, nothing else.
  `;

  try {
    const result = await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          role: "user",
          parts: [
            ...selfieParts,
            ...photoParts,
            { text: prompt }
          ]
        }
      ],
      config: {
        responseMimeType: "application/json"
      }
    });

    const text = result.response.text();
    const matchingIndices = JSON.parse(text || "[]");
    return matchingIndices.map((idx: number) => photos[idx]?.id).filter(Boolean);
  } catch (error) {
    console.error("Gemini face search error:", error);
    throw error;
  }
}
