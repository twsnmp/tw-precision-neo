import pytest
import pandas as pd
from datetime import datetime
from tw_precision_neo.analysis import AnalysisEngine

def test_time_in_range():
    data = [
        {"timestamp": datetime(2026, 4, 28, 8, 0), "value": 110.0, "unit": "mg/dL"}, # In
        {"timestamp": datetime(2026, 4, 28, 9, 0), "value": 60.0, "unit": "mg/dL"},  # Below
        {"timestamp": datetime(2026, 4, 28, 10, 0), "value": 150.0, "unit": "mg/dL"}, # Above
        {"timestamp": datetime(2026, 4, 28, 11, 0), "value": 140.0, "unit": "mg/dL"}, # In
    ]
    df = pd.DataFrame(data)
    engine = AnalysisEngine(df)
    
    tir = engine.get_time_in_range(low=70, high=140)
    assert tir["in_range"] == 50.0
    assert tir["below"] == 25.0
    assert tir["above"] == 25.0
    assert tir["count"] == 4

def test_hourly_patterns():
    data = [
        {"timestamp": datetime(2026, 4, 28, 8, 0), "value": 100.0},
        {"timestamp": datetime(2026, 4, 29, 8, 30), "value": 110.0},
        {"timestamp": datetime(2026, 4, 28, 12, 0), "value": 150.0},
    ]
    df = pd.DataFrame(data)
    engine = AnalysisEngine(df)
    
    patterns = engine.get_hourly_patterns()
    assert len(patterns) == 2 # Hour 8 and Hour 12
    hour_8 = patterns[patterns['hour'] == 8].iloc[0]
    assert hour_8['mean'] == 105.0
    assert hour_8['count'] == 2
