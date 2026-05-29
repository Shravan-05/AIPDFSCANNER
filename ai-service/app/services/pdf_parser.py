import logging
from typing import Optional, Any
from app.core.chains import build_parse_command_chain
from app.core.parsers import fallback_parse_command
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


class PDFParserService:
    async def parse_command(
        self, command: str, context: Optional[dict[str, Any]] = None
    ) -> dict[str, Any]:
        if not command or not command.strip():
            return {
                "intent": "UNKNOWN",
                "confidence": 0.0,
                "actions": [],
                "entities": [],
                "needs_clarification": True,
                "clarification_question": "Please provide a command.",
                "original_command": command,
            }

        context = context or {}

        if llm_service.is_available and llm_service.llm:
            try:
                chain = build_parse_command_chain(llm_service.llm)
                result = await chain.ainvoke(
                    {"command": command, "context": context}
                )
                result["original_command"] = command

                if result.get("confidence", 0) >= 0.3:
                    logger.info(
                        "Command parsed via LLM",
                        extra={
                            "intent": result.get("intent"),
                            "confidence": result.get("confidence"),
                            "command": command[:100],
                        },
                    )
                    return result

                logger.info(
                    "LLM confidence too low, using fallback",
                    extra={
                        "confidence": result.get("confidence"),
                        "command": command[:100],
                    },
                )
            except Exception as e:
                logger.error("LLM parsing failed, using fallback", exc_info=e)
        else:
            logger.info("LLM not available, using fallback parser")

        fallback_result = fallback_parse_command(command)
        fallback_result["original_command"] = command
        return fallback_result

    async def analyze_document(
        self, text: str, max_length: int = 3000
    ) -> dict[str, Any]:
        if not text or not text.strip():
            return {
                "document_type": "unknown",
                "summary": "No text provided for analysis.",
                "entities": [],
                "confidence": 0.0,
                "suggestions": [],
            }

        if llm_service.is_available and llm_service.llm:
            try:
                from app.core.chains import build_analyze_document_chain

                chain = build_analyze_document_chain(llm_service.llm)
                result = await chain.ainvoke(
                    {"text": text, "max_length": max_length}
                )
                return result
            except Exception as e:
                logger.error("Document analysis failed", exc_info=e)

        return {
            "document_type": "document",
            "summary": text[:200] + "...",
            "entities": [],
            "confidence": 0.3,
            "suggestions": ["Analyze with LLM for better results"],
        }


pdf_parser_service = PDFParserService()
