import asyncio
import asyncpg

async def create_db():
    conn = await asyncpg.connect(user="postgres", password="79845209", host="localhost", port=5432, database="postgres")
    try:
        await conn.execute("CREATE DATABASE autotest")
        # Database created successfully
    except asyncpg.exceptions.DuplicateDatabaseError:
        # Database already exists
        pass
    except Exception as e:
        # Error creating database
        print(f"Error: {e}")
    finally:
        await conn.close()

asyncio.run(create_db())
