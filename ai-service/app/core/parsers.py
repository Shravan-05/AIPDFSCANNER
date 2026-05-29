import re
import json
from typing import Any


def extract_json_from_llm_output(text: str) -> dict[str, Any]:
    if not text:
        return {}

    code_block_match = re.search(
        r"```(?:json)?\s*([\s\S]*?)\s*```", text, re.IGNORECASE
    )
    if code_block_match:
        text = code_block_match.group(1).strip()

    text = text.strip()

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    text = re.sub(r",\s*([\]}])", r"\1", text)
    text = re.sub(r"(?<=[{,])\s*'([^']+)'\s*:", r'"\1":', text)
    text = re.sub(r":\s*'([^']+)'\s*([,}])", r': "\1"\2', text)
    text = re.sub(r"(?<=[{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:", r'"\1":', text)

    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    brace_depth = 0
    start = -1
    for i, ch in enumerate(text):
        if ch == "{":
            if brace_depth == 0:
                start = i
            brace_depth += 1
        elif ch == "}":
            brace_depth -= 1
            if brace_depth == 0 and start != -1:
                try:
                    candidate = text[start : i + 1]
                    candidate = re.sub(
                        r",(\s*[}\]])", r"\1", candidate
                    )
                    candidate = re.sub(
                        r"(?<=[{,])\s*'([^']+)'\s*:", r'"\1":', candidate
                    )
                    candidate = re.sub(
                        r":\s*'([^']+)'\s*([,}])", r': "\1"\2', candidate
                    )
                    candidate = re.sub(
                        r"(?<=[{,])\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*:",
                        r'"\1":',
                        candidate,
                    )
                    return json.loads(candidate)
                except (json.JSONDecodeError, ValueError):
                    continue

    return {}


def fallback_parse_command(command: str) -> dict[str, Any]:
    cmd_lower = command.lower().strip()
    intent_map = {
        "compress": "COMPRESS",
        "shrink": "COMPRESS",
        "reduce": "COMPRESS",
        "delete": "DELETE_PAGES",
        "remove": "DELETE_PAGES",
        "extract": "EXTRACT_PAGES",
        "rotate": "ROTATE_PAGES",
        "turn": "ROTATE_PAGES",
        "watermark": "ADD_WATERMARK",
        "stamp": "ADD_WATERMARK",
        "add text": "ADD_TEXT",
        "insert text": "ADD_TEXT",
        "redact": "REDACT_TEXT",
        "black out": "REDACT_TEXT",
        "duplicate": "DUPLICATE_PAGES",
        "copy": "DUPLICATE_PAGES",
        "encrypt": "ENCRYPT_PDF",
        "password": "ENCRYPT_PDF",
        "protect": "ENCRYPT_PDF",
        "lock": "ENCRYPT_PDF",
        "merge": "MERGE",
        "combine": "MERGE",
        "join": "MERGE",
        "split": "SPLIT",
        "separate": "SPLIT",
        "reorder": "REORDER",
        "organize": "REORDER",
        "arrange": "REORDER",
        "enhance": "ENHANCE",
        "improve": "ENHANCE",
        "ocr": "OCR",
        "analyze": "ANALYZE",
        "classify": "ANALYZE",
    }

    detected_intent = "UNKNOWN"
    max_priority = -1
    actions = []

    for keyword, intent in intent_map.items():
        if keyword in cmd_lower:
            priority = len(keyword) / len(cmd_lower) if cmd_lower else 0
            if priority > max_priority:
                max_priority = priority
                detected_intent = intent

    pages = []
    page_patterns = [
        r"pages?\s*(\d+)(?:\s*(?:to|-|through|and)\s*(\d+))?",
        r"(\d+)\s*(?:to|-|through|and)\s*(\d+)",
        r"page\s*(\d+)",
    ]
    for pattern in page_patterns:
        for match in re.finditer(pattern, cmd_lower, re.IGNORECASE):
            if match.group(2):
                start = int(match.group(1))
                end = int(match.group(2))
                pages.extend(range(start, end + 1))
            else:
                pages.append(int(match.group(1)))

    degree = 90
    for d in [90, 180, 270]:
        if str(d) in cmd_lower:
            degree = d
            break

    quality = None
    if any(w in cmd_lower for w in ["high", "best", "maximum"]):
        quality = "high"
    elif any(w in cmd_lower for w in ["low", "small", "minimal"]):
        quality = "low"
    elif any(w in cmd_lower for w in ["medium", "moderate"]):
        quality = "medium"

    text_match = re.search(
        r'(?:text|watermark|stamp|saying|with)\s+["\']([^"\']+)["\']',
        command,
        re.IGNORECASE,
    )
    text = text_match.group(1) if text_match else None

    password_match = re.search(
        r'(?:password|pass)\s+["\']?(\w+)["\']?', command, re.IGNORECASE
    )
    password = password_match.group(1) if password_match else None

    if pages or text or quality or password:
        action_params = {}
        if pages:
            action_params["pages"] = sorted(set(pages))
        if degree != 90 and detected_intent == "ROTATE_PAGES":
            action_params["degree"] = degree
        if text:
            action_params["text"] = text
        if quality:
            action_params["quality"] = quality
        if password:
            action_params["password"] = password

        actions.append(
            {
                "type": detected_intent,
                "priority": 0,
                "parameters": action_params,
            }
        )

    return {
        "intent": detected_intent,
        "confidence": 0.6 if detected_intent != "UNKNOWN" else 0.1,
        "actions": actions,
        "entities": [],
        "needs_clarification": not actions,
        "clarification_question": "What would you like me to do with this PDF?"
        if not actions
        else None,
    }
