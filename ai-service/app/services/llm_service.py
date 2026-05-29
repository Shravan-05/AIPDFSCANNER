import asyncio
import logging
from typing import Optional, Any
from langchain_ollama import ChatOllama
from langchain_openai import ChatOpenAI
from langchain_core.language_models import BaseChatModel
from app.config import settings

logger = logging.getLogger(__name__)


class LLMService:
    _instance: Optional["LLMService"] = None
    _llm: Optional[BaseChatModel] = None
    _available: bool = False
    _retry_task: Optional[asyncio.Task] = None

    def __new__(cls) -> "LLMService":
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    async def initialize(self) -> None:
        if self._try_init():
            return
        self._start_background_retry()

    def _try_init(self) -> bool:
        try:
            if settings.llm_provider == "openai":
                kwargs = {
                    "model": settings.llm_model,
                    "temperature": settings.llm_temperature,
                    "max_tokens": settings.llm_max_tokens,
                    "timeout": settings.llm_timeout,
                }
                if settings.openai_api_key:
                    kwargs["api_key"] = settings.openai_api_key
                if settings.openai_api_base:
                    kwargs["base_url"] = settings.openai_api_base
                self._llm = ChatOpenAI(**kwargs)
            else:
                self._llm = ChatOllama(
                    model=settings.llm_model,
                    base_url=settings.ollama_base_url,
                    temperature=settings.llm_temperature,
                    num_predict=settings.llm_max_tokens,
                    timeout=settings.llm_timeout,
                )

            self._available = True
            logger.info(
                "LLM initialized",
                extra={
                    "provider": settings.llm_provider,
                    "model": settings.llm_model,
                },
            )
            return True
        except Exception as e:
            self._llm = None
            self._available = False
            logger.warning("LLM init failed, will retry in background", exc_info=e)
            return False

    def _start_background_retry(self) -> None:
        async def retry_loop():
            retry_delay = 5
            max_delay = 60
            while not self._available:
                await asyncio.sleep(retry_delay)
                logger.info("Retrying LLM connection...")
                if self._try_init():
                    return
                retry_delay = min(retry_delay * 2, max_delay)

        self._retry_task = asyncio.create_task(retry_loop())

    @property
    def llm(self) -> Optional[BaseChatModel]:
        return self._llm

    @property
    def is_available(self) -> bool:
        return self._available

    def get_provider(self) -> str:
        return settings.llm_provider

    def get_model(self) -> str:
        return settings.llm_model


llm_service = LLMService()
