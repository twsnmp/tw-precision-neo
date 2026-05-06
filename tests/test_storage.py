import pytest
import os
import pandas as pd
from datetime import datetime
from tw_precision_neo.storage import SQLiteStorage

@pytest.fixture
def temp_db(tmp_path):
    return str(tmp_path / "test_tw_precision_neo.db")

def test_sqlite_storage_save_new(temp_db):
    storage = SQLiteStorage(temp_db)
    readings = [
        {"timestamp": datetime(2026, 4, 28, 8, 0), "value": 110.0, "unit": "mg/dL", "type": "Glucose"},
    ]
    count = storage.save_readings(readings)
    
    # executemany might return rowcount or we might have changed it to len(readings) as fallback
    assert count >= 1 
    assert storage.get_count() == 1
    df = storage.get_all_readings()
    assert df.iloc[0]["value"] == 110.0

def test_sqlite_storage_deduplication(temp_db):
    storage = SQLiteStorage(temp_db)
    readings1 = [
        {"timestamp": datetime(2026, 4, 28, 8, 0), "value": 110.0, "unit": "mg/dL", "type": "Glucose"},
    ]
    storage.save_readings(readings1)
    
    # Save the same reading again (should be ignored)
    readings2 = [
        {"timestamp": datetime(2026, 4, 28, 8, 0), "value": 110.0, "unit": "mg/dL", "type": "Glucose"},
        {"timestamp": datetime(2026, 4, 28, 12, 0), "value": 120.0, "unit": "mg/dL", "type": "Glucose"},
    ]
    storage.save_readings(readings2)
    
    assert storage.get_count() == 2
    df = storage.get_all_readings()
    assert len(df) == 2
