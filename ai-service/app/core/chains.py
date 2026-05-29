from langchain_core.prompts import ChatPromptTemplate
from langchain_core.output_parsers import StrOutputParser
from langchain_core.runnables import RunnableLambda, RunnablePassthrough
from .prompts import (
    PDF_COMMAND_SYSTEM_PROMPT,
    ANALYZE_DOCUMENT_SYSTEM_PROMPT,
    SUGGESTIONS_SYSTEM_PROMPT,
)
from .parsers import extract_json_from_llm_output, fallback_parse_command
from typing import Any, Optional


def build_parse_command_chain(llm) -> Any:
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", PDF_COMMAND_SYSTEM_PROMPT),
            (
                "human",
                "Command: {command}\n\n"
                "Context: {context}\n\n"
                "Parse this PDF editing command into structured JSON.",
            ),
        ]
    )

    chain = (
        {"command": RunnablePassthrough(), "context": RunnablePassthrough()}
        | RunnablePassthrough.assign(
            context=lambda x: x.get("context", {})
        )
        | RunnablePassthrough.assign(
            command=lambda x: x.get("command", "")
        )
        | prompt
        | llm
        | StrOutputParser()
        | RunnableLambda(extract_json_from_llm_output)
        | RunnableLambda(_normalize_parse_result)
    )

    return chain


def build_analyze_document_chain(llm) -> Any:
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", ANALYZE_DOCUMENT_SYSTEM_PROMPT),
            (
                "human",
                "Analyze this document text (truncated to {max_length} chars):\n\n{text}",
            ),
        ]
    )

    chain = (
        {
            "text": lambda x: x.get("text", ""),
            "max_length": lambda x: x.get("max_length", 3000),
        }
        | RunnablePassthrough.assign(
            text=lambda x: x["text"][: x["max_length"]]
        )
        | prompt
        | llm
        | StrOutputParser()
        | RunnableLambda(extract_json_from_llm_output)
    )

    return chain


def build_suggestions_chain(llm) -> Any:
    prompt = ChatPromptTemplate.from_messages(
        [
            ("system", SUGGESTIONS_SYSTEM_PROMPT),
            (
                "human",
                "Document type: {document_type}\n"
                "Recent actions: {recent_actions}\n"
                "Context: {context}\n\n"
                "Suggest relevant PDF actions.",
            ),
        ]
    )

    chain = (
        prompt
        | llm
        | StrOutputParser()
        | RunnableLambda(extract_json_from_llm_output)
    )

    return chain


def _normalize_parse_result(result: dict) -> dict:
    intent = result.get("intent", "UNKNOWN")
    confidence = result.get("confidence", 0.0)
    actions = result.get("actions", [])
    entities = result.get("entities", [])
    needs_clarification = result.get("needs_clarification", False)
    clarification_question = result.get("clarification_question")

    if not actions and not needs_clarification:
        needs_clarification = True
        clarification_question = clarification_question or "What would you like me to do with this PDF?"

    if confidence < 0.3 and needs_clarification:
        pass

    return {
        "intent": intent,
        "confidence": confidence,
        "actions": actions,
        "entities": entities,
        "needs_clarification": needs_clarification,
        "clarification_question": clarification_question,
    }
