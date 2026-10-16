from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime

class SensorTelemetry(BaseModel):
    sensor_id: str = Field(..., description="Unique ID node sensor, misal: S-01")
    distance_cm: float = Field(..., description="Jarak sensor ke permukaan air (cm)")
    water_level_cm: float = Field(..., description="Tinggi air terhitung (cm)")
    flow_rate_m3h: Optional[float] = Field(default=0.0, description="Debit aliran air (m³/jam)")
    temperature_c: Optional[float] = Field(default=28.0, description="Suhu air (°C)")
    ph: Optional[float] = Field(default=7.0, description="Derajat keasaman")
    turbidity_ntu: Optional[float] = Field(default=40.0, description="Kekeruhan air (NTU)")
    status: str = Field(default="normal", description="normal | warning | critical")
    timestamp: float = Field(default_factory=lambda: datetime.utcnow().timestamp())

class DetectionItem(BaseModel):
    class_name: str
    confidence: float
    bbox: List[float] = Field(..., description="[x1, y1, x2, y2]")

class CVTelemetry(BaseModel):
    camera_id: str
    timestamp: float = Field(default_factory=lambda: datetime.utcnow().timestamp())
    fps: float
    blockage_percentage: float = Field(..., description="Persentase area tertutup sampah/sedimen (0-100%)")
    detections_count: Dict[str, int]
    detections: List[DetectionItem]
    alert: bool = False
    frame_base64: Optional[str] = None  # Annotated JPEG image encoded in base64

class PumpControlRequest(BaseModel):
    sensor_id: str
    state: str = Field(..., description="'ON' atau 'OFF'")
