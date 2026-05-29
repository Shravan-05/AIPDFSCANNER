from pydantic import BaseModel, Field
from typing import Optional, Any
from enum import Enum


class IntentEnum(str, Enum):
    COMPRESS = "COMPRESS"
    DELETE_PAGES = "DELETE_PAGES"
    EXTRACT_PAGES = "EXTRACT_PAGES"
    ROTATE_PAGES = "ROTATE_PAGES"
    MERGE = "MERGE"
    SPLIT = "SPLIT"
    ADD_WATERMARK = "ADD_WATERMARK"
    ADD_TEXT = "ADD_TEXT"
    REDACT_TEXT = "REDACT_TEXT"
    DUPLICATE_PAGES = "DUPLICATE_PAGES"
    ENCRYPT_PDF = "ENCRYPT_PDF"
    DELETE_BLANK_PAGES = "DELETE_BLANK_PAGES"
    ENHANCE = "ENHANCE"
    OCR = "OCR"
    REORDER = "REORDER"
    ANALYZE = "ANALYZE"
    UNKNOWN = "UNKNOWN"


class ActionParam(BaseModel):
    pages: Optional[list[int]] = None
    page_ranges: Optional[list[str]] = None
    degree: Optional[int] = None
    text: Optional[str] = None
    position: Optional[str] = None
    quality: Optional[str] = None
    password: Optional[str] = None
    filename: Optional[str] = None
    direction: Optional[str] = None


class Action(BaseModel):
    type: str
    priority: int = 0
    parameters: ActionParam = Field(default_factory=ActionParam)


class Entity(BaseModel):
    type: str
    value: Any
    span: Optional[list[int]] = None


class ParseCommandRequest(BaseModel):
    command: str
    context: Optional[dict[str, Any]] = None


class ParseCommandResponse(BaseModel):
    intent: IntentEnum
    confidence: float
    actions: list[Action]
    entities: list[Entity] = []
    needs_clarification: bool = False
    clarification_question: Optional[str] = None
    original_command: str


class AnalyzeDocumentRequest(BaseModel):
    text: str
    max_length: int = 3000


class AnalyzeDocumentResponse(BaseModel):
    document_type: str
    summary: str
    entities: list[Entity] = []
    confidence: float
    suggestions: list[str] = []


class SuggestionItem(BaseModel):
    label: str
    description: str
    command: str
    icon: Optional[str] = None


class SuggestionsRequest(BaseModel):
    document_type: Optional[str] = None
    recent_actions: Optional[list[str]] = None
    context: Optional[dict[str, Any]] = None


class SuggestionsResponse(BaseModel):
    suggestions: list[SuggestionItem]


class HealthResponse(BaseModel):
    status: str
    version: str
    llm_available: bool
    llm_provider: str
    llm_model: str
    uptime_seconds: float


class ErrorResponse(BaseModel):
    detail: str
    error_code: Optional[str] = None
