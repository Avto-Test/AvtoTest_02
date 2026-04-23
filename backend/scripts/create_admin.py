
import asyncio
import sys
import os

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from sqlalchemy import select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker

from core.config import settings
from core.security import get_password_hash
from models.user import User

async def create_admin():
    print(f"Connecting to database...")
    engine = create_async_engine(settings.DATABASE_URL)
    async_session = async_sessionmaker(engine, expire_on_commit=False)
    
    async with async_session() as session:
        # Check if admin already exists
        result = await session.execute(select(User).where(User.email == "admin@example.com"))
        user = result.scalar_one_or_none()
        
        if user:
            print("Admin user already exists (admin@example.com).")
        else:
            print("Creating admin user...")
            new_admin = User(
                email="admin@example.com",
                hashed_password=get_password_hash("admin123"),
                is_active=True,
                is_verified=True,
                is_admin=True
            )
            session.add(new_admin)
            await session.commit()
            print("SUCCESS: Admin user created.")
            print("Email: admin@example.com")
            print("Password: admin123")
            
    await engine.dispose()

if __name__ == "__main__":
    try:
        asyncio.run(create_admin())
    except Exception as e:
        print(f"ERROR: {e}")
        sys.exit(1)
