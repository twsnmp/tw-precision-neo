from dataclasses import dataclass
from datetime import datetime
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
        # Generate some mock readings
        return [
            MockReading(timestamp=datetime(2026, 4, 28, 8, 0), value=110.0, unit="mg/dL"),
            MockReading(timestamp=datetime(2026, 4, 28, 12, 30), value=145.0, unit="mg/dL"),
            MockReading(timestamp=datetime(2026, 4, 29, 7, 15), value=98.0, unit="mg/dL"),
        ]
