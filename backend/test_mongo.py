import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()
MONGO_URL = os.getenv("MONGODB_URL")

async def test_connection():
    print(f"Attempting connection to: {MONGO_URL.split('@')[1] if '@' in MONGO_URL else '...'}")
    client = AsyncIOMotorClient(MONGO_URL, serverSelectionTimeoutMS=5000)
    try:
        await client.admin.command("ping")
        print("✓ Connection successful")
    except Exception as e:
        print(f"✗ Connection failed: {type(e).__name__}: {e}")
        if "bad auth" in str(e):
            print("\n→ Possible fixes:")
            print("  1. Verify username 'trishajanath' exists in Atlas")
            print("  2. Check password matches Atlas (special chars like @ must be URL-encoded)")
            print("  3. Ensure user has 'readWrite' role on 'finstability' database")
            print("  4. Check Network Access allows your IP (or use 0.0.0.0/0 for testing)")
    finally:
        client.close()

asyncio.run(test_connection())
