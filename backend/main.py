from fastapi import FastAPI, UploadFile, File, Form, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import cv2
import numpy as np
import os
import uuid
import base64
from typing import List, Optional
from deepface import DeepFace
from google import genai
from google.genai import types
from backend.database import save_image_metadata, get_image_metadata
from backend.models import ImageMetadata, CaptionResponse, EmotionResponse, BlurResponse

app = FastAPI(title="AI Photo Processing System")

# Enable CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Gemini Client
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")
client = genai.Client(api_key=GEMINI_API_KEY)

@app.post("/upload-image")
async def upload_image(image: UploadFile = File(...)):
    """
    Uploads an image and returns a unique ID.
    """
    image_id = str(uuid.uuid4())
    contents = await image.read()
    
    metadata = {
        "image_id": image_id,
        "filename": image.filename,
        "raw_data": base64.b64encode(contents).decode('utf-8')
    }
    await save_image_metadata(metadata)
    
    return {"image_id": image_id}

@app.post("/generate-caption", response_model=CaptionResponse)
async def generate_caption(image_id: str = Form(...)):
    """
    Generates a caption for an uploaded image using Gemini.
    """
    metadata = await get_image_metadata(image_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Image not found")
        
    contents = base64.b64decode(metadata["raw_data"])
    
    response = client.models.generate_content(
        model="gemini-3-flash-preview",
        contents=[
            types.Part.from_bytes(data=contents, mime_type="image/jpeg"),
            "Generate a short, human-like caption (1 sentence) for this photo. Also include 3 relevant hashtags."
        ],
        config=types.GenerateContentConfig(
            response_mime_type="application/json",
            response_schema={
                "type": "OBJECT",
                "properties": {
                    "caption": {"type": "STRING"},
                    "hashtags": {"type": "ARRAY", "items": {"type": "STRING"}}
                },
                "required": ["caption", "hashtags"]
            }
        )
    )
    
    return response.parsed

@app.post("/detect-emotion", response_model=EmotionResponse)
async def detect_emotion(image_id: str = Form(...)):
    """
    Detects emotions for all faces in an image using DeepFace.
    """
    metadata = await get_image_metadata(image_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Image not found")
        
    contents = base64.b64decode(metadata["raw_data"])
    temp_path = f"temp_{image_id}.jpg"
    with open(temp_path, "wb") as f:
        f.write(contents)
        
    try:
        results = DeepFace.analyze(
            img_path=temp_path, 
            actions=['emotion'],
            enforce_detection=False
        )
        
        faces = []
        for res in results:
            faces.append({
                "region": res["region"],
                "dominant_emotion": res["dominant_emotion"]
            })
            
        return {"faces": faces}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)

@app.post("/blur-faces", response_model=BlurResponse)
async def blur_faces(
    image_id: str = Form(...), 
    exclude_face_index: Optional[int] = Form(None)
):
    """
    Blurs all faces in an image using OpenCV.
    Optionally excludes one face by index.
    """
    metadata = await get_image_metadata(image_id)
    if not metadata:
        raise HTTPException(status_code=404, detail="Image not found")
        
    contents = base64.b64decode(metadata["raw_data"])
    nparr = np.frombuffer(contents, np.uint8)
    img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    faces = face_cascade.detectMultiScale(gray, 1.1, 4)
    
    for i, (x, y, w, h) in enumerate(faces):
        if exclude_face_index is not None and i == exclude_face_index:
            continue
            
        face_roi = img[y:y+h, x:x+w]
        blurred_face = cv2.GaussianBlur(face_roi, (99, 99), 30)
        img[y:y+h, x:x+w] = blurred_face
        
    _, buffer = cv2.imencode('.jpg', img)
    img_base64 = base64.b64encode(buffer).decode('utf-8')
    
    return {"processed_image": f"data:image/jpeg;base64,{img_base64}"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
