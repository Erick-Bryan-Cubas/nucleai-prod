"""NucleAI patch: POST /v1/config/reload.

Rebuilds `app.state.service_container` in-place so that a fresh config.yaml
(and OPENAI_API_KEY from env) takes effect without restarting the container.
Existing routers use `Depends(get_service_container)` which reads app.state
on every request, so the next call transparently uses the new container.
"""
import os
from pathlib import Path
from typing import Optional

import yaml
from fastapi import APIRouter, Request
from pydantic import BaseModel
import logging

logger = logging.getLogger("wren-ai-service")
router = APIRouter()

ENV_RUNTIME_PATH = Path("/app/.env.runtime")
_ENV_KEYS = ("OPENAI_API_KEY",)


def _load_env_runtime() -> None:
    """Parse .env.runtime and inject values into os.environ so litellm picks
    them up on the next request — no restart needed."""
    if not ENV_RUNTIME_PATH.exists():
        return
    for line in ENV_RUNTIME_PATH.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, _, val = line.partition("=")
        key = key.strip()
        if key in _ENV_KEYS:
            os.environ[key] = val.strip()
            logger.info("nucleai reload: injected %s into os.environ", key)


class ReloadResult(BaseModel):
    ok: bool
    llmModel: Optional[str] = None
    embeddingModel: Optional[str] = None
    error: Optional[str] = None


@router.post("/config/reload", response_model=ReloadResult)
async def reload_config(request: Request) -> ReloadResult:
    # Deferred imports so this module can be imported before the app is fully
    # wired up during bootstrap.
    try:
        from src.config import Settings
        from src.globals import create_service_container, create_service_metadata
        from src.providers import generate_components
    except Exception as e:
        return ReloadResult(ok=False, error=f"import failed: {e}")

    # Inject runtime env vars (OPENAI_API_KEY, etc.) before rebuilding the
    # service container — litellm reads os.environ at call time, so this is
    # sufficient without a restart.
    _load_env_runtime()

    try:
        config_path = Path("/app/config.yaml")
        with config_path.open() as f:
            docs = list(yaml.safe_load_all(f))
        llm_doc = next((d for d in docs if d and d.get("type") == "llm"), None)
        embedder_doc = next(
            (d for d in docs if d and d.get("type") == "embedder"),
            None,
        )
        llm_model_hint = (
            llm_doc["models"][0].get("model")
            if llm_doc and llm_doc.get("models")
            else None
        )
        embedding_model_hint = (
            embedder_doc["models"][0].get("model")
            if embedder_doc and embedder_doc.get("models")
            else None
        )

        new_settings = Settings()
        pipe_components = generate_components(new_settings.components)
        new_container = create_service_container(pipe_components, new_settings)
        new_metadata = create_service_metadata(pipe_components)

        request.app.state.service_container = new_container
        request.app.state.service_metadata = new_metadata

        logger.info(
            "Config reloaded; llm model hint: %s; embedding model hint: %s",
            llm_model_hint,
            embedding_model_hint,
        )
        return ReloadResult(
            ok=True,
            llmModel=llm_model_hint,
            embeddingModel=embedding_model_hint,
        )
    except Exception as e:
        logger.exception("Config reload failed")
        return ReloadResult(ok=False, error=str(e))
