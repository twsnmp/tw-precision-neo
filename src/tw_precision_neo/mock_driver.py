import random
from dataclasses import dataclass
from datetime import datetime, timedelta
from typing import Iterable, Optional

@dataclass
class MockMeterInfo:
    model: str = "FreeStyle Precision Neo (Mock)"
    serial_number: str = "MOCK123456"

@dataclass
class MockReading:
    timestamp: datetime
    value: float
    unit: str  # e.g., "mg/dL" or "mmol/L"

class MockDriver:
    def __init__(self, device_path: Optional[str] = None):
        self.device_path = device_path

    def get_meter_info(self) -> MockMeterInfo:
        return MockMeterInfo()

    def get_readings(self) -> Iterable[MockReading]:
        """Generate 30 days of mock readings with daily patterns."""
        readings = []
        now = datetime.now()
        start_date = now - timedelta(days=30)
        
        # Daily routines (hour, base_value, variation)
        routines = [
            (7, 95, 10),   # Breakfast
            (12, 110, 20),  # Lunch
            (18, 130, 30),  # Dinner
            (22, 105, 15),  # Bedtime
        ]

        for day in range(31):
            current_day = start_date + timedelta(days=day)
            
            # 1. Routine readings
            for hour, base, var in routines:
                # Add some randomness to the time (within +/- 30 mins)
                minute = random.randint(0, 59)
                ts = current_day.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                # Add some randomness to the value
                val = base + random.uniform(-var, var)
                
                # Occasionally simulate a high or low value for better stats/heatmap demo
                if random.random() < 0.05:
                    val += 50  # Spike
                elif random.random() < 0.05:
                    val -= 30  # Dip
                
                readings.append(MockReading(timestamp=ts, value=round(val, 1), unit="mg/dL"))

            # 2. Add 1-2 random "unscheduled" readings
            num_extra = random.randint(1, 2)
            for _ in range(num_extra):
                hour = random.randint(0, 23)
                minute = random.randint(0, 59)
                ts = current_day.replace(hour=hour, minute=minute, second=0, microsecond=0)
                
                # Random base between 80 and 150
                val = random.uniform(80, 150)
                readings.append(MockReading(timestamp=ts, value=round(val, 1), unit="mg/dL"))
        
        # Sort by timestamp
        readings.sort(key=lambda x: x.timestamp)
        return readings
