#!/bin/sh
# NucleAI entrypoint wrapper.
#
# Strategy: put /app/patches first on PYTHONPATH so Python's `site` machinery
# auto-imports our sitecustomize.py in EVERY interpreter this container
# spawns — including the uvicorn process that actually serves HTTP. That
# sitecustomize imports src.__main__ and attaches the /v1/config/reload
# router on the live `app` object before uvicorn binds to it.
#
# We do NOT call `python -c "import ..."` here: that would run in a short-
# lived subprocess whose app mutation is discarded when the process exits.
set -e

export PYTHONPATH="/app/patches:/app:${PYTHONPATH}"

exec /app/entrypoint.sh "$@"
