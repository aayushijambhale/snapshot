import { GoogleGenAI, Type, Modality } from "@google/genai";

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
    Return the matches as a JSON array of objects. Each object should have:
    - "index": the index of the matching event photo (0-based)
    - "confidence": a score from 0 to 100 indicating how certain you are of the match
    - "boundingBox": (optional) an object with "ymin", "xmin", "ymax", "xmax" normalized to [0, 1000] for the face in the photo.
    
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
          items: {
            type: Type.OBJECT,
            properties: {
              index: { type: Type.INTEGER, description: "The index of the matching event photo" },
              confidence: { type: Type.NUMBER, description: "Confidence score from 0 to 100" },
              boundingBox: {
                type: Type.OBJECT,
                properties: {
                  ymin: { type: Type.NUMBER },
                  xmin: { type: Type.NUMBER },
                  ymax: { type: Type.NUMBER },
                  xmax: { type: Type.NUMBER }
                },
                description: "Normalized coordinates [0, 1000] of the face in the photo"
              }
            },
            required: ["index", "confidence"]
          }
        }
      }
    });

    const results = JSON.parse(response.text || "[]");
    return results.map((res: any) => ({
      id: photos[res.index]?.id,
      confidence: res.confidence,
      boundingBox: res.boundingBox
    })).filter((res: any) => res.id);
  } catch (error) {
    console.error("Gemini face search error:", error);
    throw error;
  }
}

export async function generateCaptionAndHashtags(imageBase64: string) {
  const prompt = `
    Generate a short, human-like caption (1 sentence) for this photo. 
    Also include 3 relevant hashtags.
    Return the result as a JSON object with "caption" and "hashtags" (array of strings).
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64.split(',')[1],
              mimeType: "image/jpeg"
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            caption: { type: Type.STRING },
            hashtags: { type: Type.ARRAY, items: { type: Type.STRING } }
          },
          required: ["caption", "hashtags"]
        }
      }
    });

    return JSON.parse(response.text || "{}");
  } catch (error) {
    console.error("Gemini caption generation error:", error);
    throw error;
  }
}

export async function detectFaces(imageBase64: string) {
  const prompt = `
    Detect all faces in this image. For each face, provide:
    - "boundingBox": { "ymin", "xmin", "ymax", "xmax" } normalized to [0, 1000]
    - "confidence": confidence score from 0 to 100
    
    Return the result as a JSON array of objects.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: {
        parts: [
          {
            inlineData: {
              data: imageBase64.split(',')[1],
              mimeType: "image/jpeg"
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              boundingBox: {
                type: Type.OBJECT,
                properties: {
                  ymin: { type: Type.NUMBER },
                  xmin: { type: Type.NUMBER },
                  ymax: { type: Type.NUMBER },
                  xmax: { type: Type.NUMBER }
                }
              },
              confidence: { type: Type.NUMBER }
            },
            required: ["boundingBox", "confidence"]
          }
        }
      }
    });

    return JSON.parse(response.text || "[]");
  } catch (error) {
    console.error("Gemini face detection error:", error);
    throw error;
  }
}
