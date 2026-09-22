import base64
import io
import os
import re
import uuid
from pathlib import Path

from dotenv import load_dotenv
from motor.motor_asyncio import AsyncIOMotorClient
from PIL import Image, ImageOps

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

MONGO_URL = os.environ["MONGO_URL"]
DB_NAME = os.environ["DB_NAME"]
UPLOAD_DIR = Path(os.getenv("UPLOAD_DIR", "/var/www/kmt-bazaar/uploads"))
PUBLIC_BASE_URL = os.getenv("PUBLIC_BASE_URL", "https://kmtbazaar.tech").rstrip("/")
MAX_BYTES = 8 * 1024 * 1024
MAX_SIZE = (1600, 1600)


def save_data_uri(data_uri: str) -> str:
    match = re.match(
        r"^data:(image/(?:jpeg|jpg|png|webp));base64,(.+)$",
        data_uri.strip(),
        re.IGNORECASE | re.DOTALL,
    )
    if not match:
        raise ValueError("Unsupported image data URI")

    raw = base64.b64decode(match.group(2))
    if len(raw) > MAX_BYTES:
        raise ValueError("Image exceeds 8 MB")

    image = Image.open(io.BytesIO(raw))
    image = ImageOps.exif_transpose(image)
    image.thumbnail(MAX_SIZE, Image.Resampling.LANCZOS)

    if image.mode not in ("RGB", "RGBA"):
        image = image.convert("RGBA" if "A" in image.getbands() else "RGB")

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex}.webp"
    path = UPLOAD_DIR / filename
    image.save(path, "WEBP", quality=82, method=6)
    return f"{PUBLIC_BASE_URL}/uploads/{filename}"


async def migrate_collection(db, name: str):
    collection = db[name]
    cursor = collection.find(
        {"image": {"$regex": r"^data:image/"}},
        {"_id": 1, "id": 1, "image": 1},
    )

    count = 0
    async for doc in cursor:
        try:
            url = save_data_uri(doc["image"])
            await collection.update_one(
                {"_id": doc["_id"]},
                {"$set": {"image": url}},
            )
            count += 1
            print(f"{name}: migrated {doc.get('id', doc['_id'])} -> {url}")
        except Exception as exc:
            print(f"{name}: FAILED {doc.get('id', doc['_id'])}: {exc}")

    return count


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    total = 0
    for name in ("products", "banners", "stores"):
        total += await migrate_collection(db, name)

    print(f"Migration complete. Total images migrated: {total}")
    client.close()


if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
