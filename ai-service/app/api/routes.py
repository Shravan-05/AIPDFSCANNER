import logging
import time
from fastapi import APIRouter, Depends, HTTPException
from app.models.schemas import (
    ParseCommandRequest,
    ParseCommandResponse,
    AnalyzeDocumentRequest,
    AnalyzeDocumentResponse,
    SuggestionsRequest,
    SuggestionsResponse,
    SuggestionItem,
    HealthResponse,
    Action,
    ActionParam,
    Entity,
    IntentEnum,
)
from app.services.llm_service import llm_service
from app.services.pdf_parser import pdf_parser_service
from app.services.suggestion_service import suggestion_service
from app.core.security import verify_token
from .deps import rate_limit

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/v1/ai", tags=["AI Service"])


start_time: float = time.time()


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="Health check",
    description="Check if the AI service is running and LLM is available",
)
async def health_check():
    llm_ok = await llm_service.check_availability() if llm_service.is_available else False
    return HealthResponse(
        status="healthy" if llm_ok else "degraded",
        version="1.0.0",
        llm_available=llm_ok,
        llm_provider=llm_service.get_provider(),
        llm_model=llm_service.get_model(),
        uptime_seconds=time.time() - start_time,
    )


@router.post(
    "/parse-command",
    response_model=ParseCommandResponse,
    summary="Parse natural language PDF command",
    description="Convert a natural language command into structured PDF actions",
    dependencies=[Depends(rate_limit)],
)
async def parse_command(
    request: ParseCommandRequest,
    _=Depends(verify_token),
):
    if not request.command or not request.command.strip():
        raise HTTPException(status_code=400, detail="Command is required")

    try:
        result = await pdf_parser_service.parse_command(
            request.command, request.context
        )
        return ParseCommandResponse(
            intent=result.get("intent", "UNKNOWN"),
            confidence=result.get("confidence", 0.0),
            actions=[
                Action(
                    type=a.get("type", "UNKNOWN"),
                    priority=a.get("priority", 0),
                    parameters=ActionParam(**a.get("parameters", {})),
                )
                for a in result.get("actions", [])
            ],
            entities=[
                Entity(type=e.get("type", ""), value=e.get("value", ""))
                for e in result.get("entities", [])
            ],
            needs_clarification=result.get("needs_clarification", False),
            clarification_question=result.get("clarification_question"),
            original_command=result.get("original_command", request.command),
        )
    except Exception as e:
        logger.error("Failed to parse command", exc_info=e)
        raise HTTPException(
            status_code=500, detail="Failed to process command"
        )


@router.post(
    "/analyze-document",
    response_model=AnalyzeDocumentResponse,
    summary="Analyze document text",
    description="Classify and extract information from document text",
    dependencies=[Depends(rate_limit)],
)
async def analyze_document(
    request: AnalyzeDocumentRequest,
    _=Depends(verify_token),
):
    if not request.text or not request.text.strip():
        raise HTTPException(status_code=400, detail="Text is required")

    try:
        result = await pdf_parser_service.analyze_document(
            request.text, request.max_length
        )
        return AnalyzeDocumentResponse(
            document_type=result.get("document_type", "unknown"),
            summary=result.get("summary", ""),
            entities=[
                Entity(type=e.get("type", ""), value=e.get("value", ""))
                for e in result.get("entities", [])
            ],
            confidence=result.get("confidence", 0.0),
            suggestions=result.get("suggestions", []),
        )
    except Exception as e:
        logger.error("Failed to analyze document", exc_info=e)
        raise HTTPException(
            status_code=500, detail="Failed to analyze document"
        )


@router.post(
    "/suggestions",
    response_model=SuggestionsResponse,
    summary="Get smart suggestions",
    description="Get context-aware PDF action suggestions",
    dependencies=[Depends(rate_limit)],
)
async def get_suggestions(
    request: SuggestionsRequest,
    _=Depends(verify_token),
):
    try:
        suggestions = await suggestion_service.get_suggestions(
            document_type=request.document_type,
            recent_actions=request.recent_actions,
            context=request.context,
        )
        return SuggestionsResponse(
            suggestions=[
                SuggestionItem(
                    label=s.get("label", ""),
                    description=s.get("description", ""),
                    command=s.get("command", ""),
                    icon=s.get("icon"),
                )
                for s in suggestions
            ]
        )
    except Exception as e:
        logger.error("Failed to get suggestions", exc_info=e)
        raise HTTPException(
            status_code=500, detail="Failed to get suggestions"
        )
