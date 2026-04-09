from motor.motor_asyncio import AsyncIOMotorClient
import os

MONGODB_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
client = AsyncIOMotorClient(MONGODB_URL)
db = client.photo_ai_db

async def save_image_metadata(metadata: dict):
    await db.images.insert_one(metadata)

async def get_image_metadata(image_id: str):
    return await db.images.find_one({"image_id": image_id})
