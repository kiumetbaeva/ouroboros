from __future__ import annotations

import importlib.util
import json
import os
import sys
from pathlib import Path

RUNTIME_PATH = Path(__file__).resolve().with_name("runtime.py")
SPEC = importlib.util.spec_from_file_location("ai_pmo_diagnose_runtime_v410", RUNTIME_PATH)
if SPEC is None or SPEC.loader is None:
    raise RuntimeError(f"Cannot load runtime: {RUNTIME_PATH}")
RUNTIME = importlib.util.module_from_spec(SPEC)
sys.modules[SPEC.name] = RUNTIME
SPEC.loader.exec_module(RUNTIME)

result = {
    "skill_root": str(Path(__file__).resolve().parent),
    "workspace": None,
    "workspace_ok": False,
    "host_service_url_present": bool(os.environ.get("HOST_SERVICE_URL")),
    "host_service_token_present": bool(os.environ.get("HOST_SERVICE_TOKEN")),
    "overrides": {
        "AI_PMO_TASKS_ROOT": os.environ.get("AI_PMO_TASKS_ROOT"),
        "OUROBOROS_DATA_DIR": os.environ.get("OUROBOROS_DATA_DIR"),
        "OUROBOROS_ROOT": os.environ.get("OUROBOROS_ROOT"),
    },
}
try:
    root = RUNTIME.find_project_root()
    result["workspace"] = str(root)
    RUNTIME.ensure_structure(root)
    result["workspace_ok"] = True
except Exception as exc:
    result["error"] = f"{type(exc).__name__}: {exc}"

print(json.dumps(result, ensure_ascii=False, indent=2))
