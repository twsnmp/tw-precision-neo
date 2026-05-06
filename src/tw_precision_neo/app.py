import webview
import os
import json
import pandas as pd
from datetime import datetime
from .exporter import Exporter
from .storage import SQLiteStorage
from .analysis import AnalysisEngine

# Check for mock
try:
    from tests.mock_driver import MockDriver
    HAS_MOCK = True
except ImportError:
    HAS_MOCK = False

class API:
    def __init__(self, storage):
        self.storage = storage

    def get_data(self):
        df = self.storage.get_all_readings()
        if df.empty:
            return {"readings": [], "tir": {"in_range": 0}}
        
        engine = AnalysisEngine(df)
        tir = engine.get_time_in_range()
        
        # Convert to list of dicts for JSON
        readings = []
        for _, r in df.iterrows():
            readings.append({
                "timestamp": r["timestamp"].strftime("%Y-%m-%d %H:%M"),
                "value": float(r["value"]),
                "unit": r["unit"]
            })
            
        return {
            "readings": readings,
            "tir": tir
        }

    def sync_device(self):
        try:
            if HAS_MOCK:
                driver = MockDriver()
                exporter = Exporter(driver)
                readings = exporter.fetch_all_readings()
                count = self.storage.save_readings(readings)
                return {"message": f"Synced {count} new readings."}
            else:
                return {"message": "Error: Device not found."}
        except Exception as e:
            return {"message": f"Error: {e}"}

    def import_csv(self):
        try:
            # Determine project root relative to this file
            # In package mode, we expect assets to be sibling or sub-dir
            app_dir = os.getcwd() # Fallback for dev
            csv_path = os.path.join(app_dir, "readings.csv")
            
            if os.path.exists(csv_path):
                df = pd.read_csv(csv_path)
                df['timestamp'] = pd.to_datetime(df['timestamp'])
                if 'type' not in df.columns:
                    df['type'] = 'Glucose'
                readings = df.to_dict('records')
                count = self.storage.save_readings(readings)
                return {"message": f"Imported {count} readings."}
            else:
                return {"message": f"Error: readings.csv not found at {csv_path}"}
        except Exception as e:
            return {"message": f"Error: {e}"}

def main():
    # Setup data directory
    if os.name == 'nt':
        data_dir = os.path.join(os.environ['LOCALAPPDATA'], "tw_precision_neo")
    else:
        data_dir = os.path.expanduser("~/Library/Application Support/tw_precision_neo")
        
    os.makedirs(data_dir, exist_ok=True)
    db_path = os.path.join(data_dir, "tw_precision_neo.db")
    storage = SQLiteStorage(db_path)
    
    api = API(storage)
    
    # Path to assets - checking multiple locations for flexibility
    # 1. assets/ folder in the project root (development)
    # 2. resources/ folder if packaged
    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__))) # src/
    project_root = os.path.dirname(base_dir)
    
    locations = [
        os.path.join(project_root, "assets", "index.html"),
        os.path.join(os.path.dirname(__file__), "assets", "index.html"),
        "assets/index.html"
    ]
    
    index_path = None
    for loc in locations:
        if os.path.exists(loc):
            index_path = loc
            break
            
    if not index_path:
        # Emergency fallback or error
        print("Warning: index.html not found!")
        index_path = "assets/index.html"
    
    window = webview.create_window(
        'TW Precision Neo Analyst',
        index_path,
        js_api=api,
        width=1000,
        height=800
    )
    
    webview.start(debug=True)

if __name__ == '__main__':
    main()
