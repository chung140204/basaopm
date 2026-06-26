"""Kết nối PostGIS (psycopg 3)."""
import os
import psycopg

DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql://ranhthua:ranhthua@localhost:5433/ranhthua",
)


def get_conn():
    """Mở connection mới. Caller chịu trách nhiệm đóng (dùng with)."""
    return psycopg.connect(DATABASE_URL)
