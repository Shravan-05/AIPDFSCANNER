import logging
from typing import Optional, Any
from app.services.llm_service import llm_service

logger = logging.getLogger(__name__)


DEFAULT_SUGGESTIONS = [
    {
        "label": "Compress PDF",
        "description": "Reduce file size for email sharing",
        "command": "compress this PDF",
        "icon": "compress",
    },
    {
        "label": "Delete blank pages",
        "description": "Remove empty pages from the document",
        "command": "delete blank pages",
        "icon": "delete",
    },
    {
        "label": "Enhance quality",
        "description": "Improve image quality and readability",
        "command": "enhance this PDF",
        "icon": "enhance",
    },
    {
        "label": "Run OCR",
        "description": "Extract text from scanned pages",
        "command": "run OCR on this PDF",
        "icon": "ocr",
    },
    {
        "label": "Rotate pages",
        "description": "Fix page orientation",
        "command": "rotate all pages 90 degrees",
        "icon": "rotate",
    },
]

DOC_TYPE_SUGGESTIONS = {
    "invoice": [
        {
            "label": "Extract invoice data",
            "description": "Pull invoice number, date, and amount",
            "command": "extract invoice details",
            "icon": "extract",
        },
    ],
    "contract": [
        {
            "label": "Add watermark",
            "description": "Mark as draft or confidential",
            "command": "add watermark saying DRAFT",
            "icon": "watermark",
        },
    ],
    "receipt": [
        {
            "label": "Enhance for clarity",
            "description": "Make receipt text more readable",
            "command": "enhance quality to high",
            "icon": "enhance",
        },
    ],
    "resume": [
        {
            "label": "Convert to text",
            "description": "Extract resume content",
            "command": "run OCR on this PDF",
            "icon": "ocr",
        },
    ],
}


class SuggestionService:
    async def get_suggestions(
        self,
        document_type: Optional[str] = None,
        recent_actions: Optional[list[str]] = None,
        context: Optional[dict[str, Any]] = None,
    ) -> list[dict[str, Any]]:
        suggestions = list(DEFAULT_SUGGESTIONS)

        if document_type and document_type.lower() in DOC_TYPE_SUGGESTIONS:
            type_suggestions = DOC_TYPE_SUGGESTIONS[document_type.lower()]
            suggestions = type_suggestions + suggestions

        if recent_actions:
            done_set = set(a.lower() for a in recent_actions)
            suggestions = [
                s for s in suggestions if s["command"].lower() not in done_set
            ]

        if context:
            file_size = context.get("file_size", 0)
            if file_size and file_size > 5 * 1024 * 1024:
                suggestions.insert(
                    0,
                    {
                        "label": "Compress large file",
                        "description": f"File is {file_size / 1024 / 1024:.0f}MB - reduce size",
                        "command": "compress this PDF to high quality",
                        "icon": "compress",
                    },
                )

        return suggestions[:10]


suggestion_service = SuggestionService()
