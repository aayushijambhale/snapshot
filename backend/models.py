from pydantic import BaseModel
from typing import List, Optional
from datetime import datetime

class ImageMetadata(BaseModel):
    image_id: str
    filename: str
    caption: Optional[str] = None
    emotions: Optional[List[dict]] = None
    hashtags: Optional[List[str]] = []
    created_at: datetime = datetime.now()

class CaptionResponse(BaseModel):
    caption: str
    hashtags: List[str]

class EmotionResponse(BaseModel):
    faces: List[dict]

class BlurResponse(BaseModel):
    processed_image: str
