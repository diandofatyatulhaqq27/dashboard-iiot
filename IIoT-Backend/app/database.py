import os
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

# 🌟 TAKTIK PAMUNGKAS: Paksa baca file .env manual tanpa library tambahan
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
database_url_from_env = None

if os.path.exists(env_path):
    with open(env_path, 'r') as f:
        for line in f:
            if line.strip().startswith('DATABASE_URL='):
                database_url_from_env = line.strip().split('DATABASE_URL=')[1].strip()
                break

# 🌟 1. Jika di file .env ketemu DATABASE_URL, langsung kunci mati di sini
if database_url_from_env:
    SQLALCHEMY_DATABASE_URL = database_url_from_env
else:
    # 2. Fallback cadangan bawaan Docker lama lu
    DB_USER = os.getenv("DB_USER", "user")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "password")
    DB_HOST = os.getenv("DB_HOST", "db")  
    DB_PORT = os.getenv("DB_PORT", "5432")
    DB_NAME = os.getenv("DB_NAME", "iiot_db")
    SQLALCHEMY_DATABASE_URL = f"postgresql://{DB_USER}:{DB_PASSWORD}@{DB_HOST}:{DB_PORT}/{DB_NAME}"

# Cetak ke terminal pas startup biar kita tahu alamat mana yang sukses ditembak
print("\n" + "="*70)
print(f"=== [DATABASE SUCCESS] TUNNELING TO: {SQLALCHEMY_DATABASE_URL}")
print("="*70 + "\n")

engine = create_engine(SQLALCHEMY_DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()