import sqlite3
import pandas as pd
import os
from typing import List, Dict, Any

class SQLiteStorage:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()

    def _init_db(self):
        """Initialize the database schema."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute('''
            CREATE TABLE IF NOT EXISTS readings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                timestamp DATETIME UNIQUE,
                value REAL,
                unit TEXT,
                type TEXT
            )
        ''')
        conn.commit()
        conn.close()

    def save_readings(self, readings: List[Dict[str, Any]]) -> int:
        """Save new readings, ignoring duplicates based on timestamp."""
        if not readings:
            return 0

        conn = sqlite3.connect(self.db_path)
        data = [
            (
                r['timestamp'].isoformat() if hasattr(r['timestamp'], 'isoformat') else r['timestamp'],
                r['value'],
                r['unit'],
                r['type']
            )
            for r in readings
        ]
        
        cursor = conn.cursor()
        cursor.executemany('''
            INSERT OR IGNORE INTO readings (timestamp, value, unit, type)
            VALUES (?, ?, ?, ?)
        ''', data)
        
        conn.commit()
        count = cursor.rowcount
        conn.close()
        return count if count != -1 else len(readings)

    def get_all_readings(self) -> pd.DataFrame:
        """Fetch all readings as a Pandas DataFrame."""
        conn = sqlite3.connect(self.db_path)
        df = pd.read_sql_query(
            "SELECT timestamp, value, unit, type FROM readings ORDER BY timestamp", 
            conn,
            parse_dates=['timestamp']
        )
        conn.close()
        return df

    def get_count(self) -> int:
        """Get total number of readings."""
        conn = sqlite3.connect(self.db_path)
        cursor = conn.cursor()
        cursor.execute("SELECT COUNT(*) FROM readings")
        count = cursor.fetchone()[0]
        conn.close()
        return count
