"""Provider-specific OpenAI client for validated structured responses."""

from __future__ import annotations

import os
from typing import TypeVar

from dotenv import load_dotenv
from openai import OpenAI, OpenAIError
from pydantic import BaseModel, ValidationError

load_dotenv()

StructuredModel = TypeVar("StructuredModel", bound=BaseModel)

DEFAULT_MODEL = "gpt-5-mini"


class AIClientError(RuntimeError):
    """Base class for expected AI client failures."""


class AIConfigurationError(AIClientError):
    """Raised when required provider configuration is missing."""


class AIProviderError(AIClientError):
    """Raised when the provider request fails."""


class AIModelRefusalError(AIClientError):
    """Raised when the model refuses to process the supplied content."""


class AIInvalidResponseError(AIClientError):
    """Raised when no validated structured result is returned."""


def _contains_refusal(response: object) -> bool:
    for output_item in getattr(response, "output", []) or []:
        for content_item in getattr(output_item, "content", []) or []:
            if getattr(content_item, "type", None) == "refusal":
                return True
    return False


def request_structured_output(
    *,
    system_prompt: str,
    user_prompt: str,
    response_model: type[StructuredModel],
) -> StructuredModel:
    """Request a Pydantic-validated result through OpenAI Structured Outputs."""
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise AIConfigurationError("OPENAI_API_KEY is not configured.")

    model = os.getenv("OPENAI_MODEL", DEFAULT_MODEL)
    client = OpenAI(api_key=api_key)

    try:
        response = client.responses.parse(
            model=model,
            input=[
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": user_prompt},
            ],
            max_output_tokens=1200,
            store=False,
            text_format=response_model,
        )
    except OpenAIError as exc:
        raise AIProviderError("The AI provider request failed.") from exc
    except ValidationError as exc:
        raise AIInvalidResponseError(
            "The provider returned an invalid structured analysis."
        ) from exc

    if response.output_parsed is not None:
        return response.output_parsed
    if _contains_refusal(response):
        raise AIModelRefusalError("The model refused to analyze the content.")
    raise AIInvalidResponseError("The provider returned no structured analysis.")
