"""NucleAI sitecustomize: attaches /v1/config/reload router to the live app.

This module is auto-imported by Python's `site` machinery at interpreter
startup, which means it runs in the *same process* as uvicorn — unlike a
subprocess `python -c` hook, the router we register here survives to serve
real requests.

We import `src.__main__` eagerly so the `app` object is constructed and
cached in `sys.modules`. When uvicorn later imports `src.__main__:app`, it
gets the same module we already mutated.

Failures are logged but never raised — a broken patch must not brick the
container.
"""
import logging
import os
import sys

logger = logging.getLogger("nucleai-patch")
logging.basicConfig(level=logging.INFO)


def _patch_fetch_wren_ai_docs() -> None:
    # Upstream `fetch_wren_ai_docs` does `path, content = doc.split("\n")`,
    # which crashes the lifespan when the remote llms.md serves any doc whose
    # content has internal newlines. Replace with a split(_, 1) + skip on
    # malformed entries so service startup never blocks on doc-fetch drift.
    import requests
    from src import utils as _src_utils

    def fetch_wren_ai_docs(doc_endpoint: str, is_oss: bool):
        doc_endpoint = _src_utils.remove_trailing_slash(doc_endpoint)
        api_endpoint = (
            f"{doc_endpoint}/oss/llms.md"
            if is_oss
            else f"{doc_endpoint}/cloud/llms.md"
        )
        try:
            response = requests.get(api_endpoint, timeout=10)
            response.raise_for_status()
            docs = response.text.split("\n---\n")
        except requests.RequestException as e:
            logger.error("nucleai patch: failed to fetch Wren AI docs: %s", e)
            return []

        doc_endpoint_base = (
            f"{doc_endpoint}/oss" if is_oss else f"{doc_endpoint}/cloud"
        )
        results = []
        for doc in docs:
            if not doc:
                continue
            parts = doc.split("\n", 1)
            if len(parts) != 2:
                logger.warning(
                    "nucleai patch: skipping malformed doc entry: %r", doc[:80]
                )
                continue
            path, content = parts
            results.append(
                {
                    "path": f'{doc_endpoint_base}/{path.replace(".md", "")}',
                    "content": content,
                }
            )
        return results

    _src_utils.fetch_wren_ai_docs = fetch_wren_ai_docs

    # globals.py imported `from src.utils import fetch_wren_ai_docs` at module
    # load, so we also have to overwrite the name in that module if it has
    # already been imported.
    _globals = sys.modules.get("src.globals")
    if _globals is not None:
        _globals.fetch_wren_ai_docs = fetch_wren_ai_docs

    logger.info("nucleai patch: fetch_wren_ai_docs hardened against malformed docs")


def _apply() -> None:
    # /app is where the wren-ai-service source lives inside the image.
    if "/app" not in sys.path:
        sys.path.insert(0, "/app")

    # Avoid running inside short-lived helper processes (e.g. `python -c`
    # invocations from the image's entrypoint) where importing src.__main__
    # would be wasteful. Only register when we detect uvicorn is the target.
    argv0 = " ".join(sys.argv)
    if "uvicorn" not in argv0 and os.environ.get("NUCLEAI_FORCE_PATCH") != "1":
        return

    try:
        _patch_fetch_wren_ai_docs()
    except Exception as e:
        logger.error("nucleai patch: failed to patch fetch_wren_ai_docs: %s", e)

    try:
        from src.__main__ import app  # noqa: F401 — triggers app construction
    except Exception as e:
        logger.error("nucleai patch: failed to import src.__main__: %s", e)
        return

    try:
        # Use absolute import path; this file lives in /app/patches which we
        # add to sys.path via PYTHONPATH in docker-compose.
        from patches.config_reload import router as config_reload_router

        # Guard against double-registration if sitecustomize runs twice.
        already = any(
            getattr(r, "name", None) == "reload_config" for r in app.routes
        )
        if already:
            return

        app.include_router(
            config_reload_router, prefix="/v1", tags=["nucleai-config"]
        )
        logger.info("nucleai patch: /v1/config/reload registered")
    except Exception as e:
        logger.error(
            "nucleai patch: failed to register config_reload router: %s", e
        )


_apply()
