import pandas as pd
from typing import Dict, Any, List, Optional

class AnalysisEngine:
    def __init__(self, df: pd.DataFrame):
        # Expecting df to be already sorted and timestamp converted by storage
        self.df = df

    def get_time_in_range(self, low: float = 70.0, high: float = 140.0) -> Dict[str, float]:
        """Calculate percentage of readings within, below, and above range."""
        if self.df.empty:
            return {"in_range": 0, "below": 0, "above": 0}
        
        total = len(self.df)
        v = self.df['value']
        in_range = ((v >= low) & (v <= high)).sum()
        below = (v < low).sum()
        above = (v > high).sum()
        
        return {
            "in_range": (in_range / total) * 100,
            "below": (below / total) * 100,
            "above": (above / total) * 100,
            "count": total
        }

    def get_hourly_patterns(self) -> pd.DataFrame:
        """Group readings by hour of day to find patterns."""
        if self.df.empty:
            return pd.DataFrame()
        
        # Avoid copy if possible, but we need the 'hour' column
        return self.df.assign(hour=self.df['timestamp'].dt.hour).groupby('hour')['value'].agg(['mean', 'min', 'max', 'count']).reset_index()

    def get_daily_averages(self) -> pd.DataFrame:
        """Calculate daily average glucose levels."""
        if self.df.empty:
            return pd.DataFrame()
            
        return self.df.resample('D', on='timestamp')['value'].mean().reset_index()

    def get_latest_metrics(self) -> Dict[str, Any]:
        """Return a summary of the latest state."""
        if self.df.empty:
            return {}
            
        latest = self.df.iloc[-1]
        
        # Calculate 7d avg efficiently
        seven_days_ago = pd.Timestamp.now() - pd.Timedelta(days=7)
        avg_7d = self.df[self.df['timestamp'] > seven_days_ago]['value'].mean()
        
        return {
            "latest_value": latest['value'],
            "latest_time": latest['timestamp'],
            "unit": latest['unit'],
            "avg_7d": avg_7d
        }
