async function callAiProxy(model: string, contents: any, generationConfig?: any) {
  const response = await fetch('/api/ai/proxy', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, contents, generationConfig }),
    credentials: 'include'
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'AI Request failed');
  }

  return await response.json();
}

export async function findMatchingPhotos(selfieBase64s: string[], photos: { id: string, url: string }[]) {
  if (photos.length === 0 || selfieBase64s.length === 0) return [];

  const selfieParts = selfieBase64s.map((s) => ({
    inlineData: {
      data: s.split(',')[1],
      mimeType: "image/jpeg"
    }
  }));

  const photoParts = photos.map((p) => ({
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
    const data = await callAiProxy("gemini-3-flash-preview", {
      parts: [
        ...selfieParts,
        ...photoParts,
        { text: prompt }
      ]
    }, {
      responseMimeType: "application/json"
    });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    const results = JSON.parse(text);
    
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
    const data = await callAiProxy("gemini-3-flash-preview", {
      parts: [
        {
          inlineData: {
            data: imageBase64.split(',')[1],
            mimeType: "image/jpeg"
          }
        },
        { text: prompt }
      ]
    }, {
      responseMimeType: "application/json"
    });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "{}";
    return JSON.parse(text);
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
    const data = await callAiProxy("gemini-3-flash-preview", {
      parts: [
        {
          inlineData: {
            data: imageBase64.split(',')[1],
            mimeType: "image/jpeg"
          }
        },
        { text: prompt }
      ]
    }, {
      responseMimeType: "application/json"
    });

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "[]";
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini face detection error:", error);
    throw error;
  }
}

export async function generateEventDescription(name: string, date: string, location: string) {
  const prompt = `
    Generate a catchy and welcoming description (2-3 sentences) for an event with the following details:
    Name: ${name}
    Date: ${date}
    Location: ${location}
    
    The description should sound professional yet exciting, suitable for an event gallery page.
    Return only the description text.
  `;

  try {
    const data = await callAiProxy("gemini-3-flash-preview", {
      parts: [{ text: prompt }]
    });

    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  } catch (error) {
    console.error("Gemini event description error:", error);
    return ""; // Return empty string on error to not block event creation
  }
}
