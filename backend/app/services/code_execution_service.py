from __future__ import annotations

import ast
import json
import subprocess
import sys
import tempfile
import textwrap
import time
from pathlib import Path
from typing import Any

from fastapi import HTTPException, status

from app.core.config import get_settings
from app.models.assessment import AssessmentQuestion
from app.schemas.assessment import CodeTestResult, RunCodeResponse


DANGEROUS_IMPORTS = {
    "os",
    "subprocess",
    "socket",
    "pathlib",
    "shutil",
    "multiprocessing",
    "threading",
    "requests",
    "urllib",
}

DANGEROUS_CALLS = {
    "open",
    "eval",
    "exec",
    "compile",
    "__import__",
    "input",
    "globals",
    "locals",
    "vars",
}


def execution_config(question: AssessmentQuestion) -> dict[str, Any]:
    config = (question.scoring_rubric or {}).get("execution")
    return config if isinstance(config, dict) else {}


def public_execution_metadata(question: AssessmentQuestion) -> dict[str, Any]:
    config = execution_config(question)
    return {
        "execution_supported": bool(config.get("execution_supported")),
        "execution_reason": config.get("execution_reason"),
        "language": config.get("language") if config.get("execution_supported") else None,
        "function_name": config.get("function_name") if config.get("execution_supported") else None,
        "starter_code": config.get("starter_code") if config.get("execution_supported") else None,
    }


def sanitized_scoring_rubric(question: AssessmentQuestion) -> dict:
    rubric = dict(question.scoring_rubric or {})
    rubric.pop("execution", None)
    return rubric


def _reject_dangerous_code(code: str) -> str | None:
    try:
        tree = ast.parse(code)
    except SyntaxError:
        return None

    for node in ast.walk(tree):
        if isinstance(node, ast.Import):
            for alias in node.names:
                root = alias.name.split(".", 1)[0]
                if root in DANGEROUS_IMPORTS:
                    return f"Import '{root}' is not allowed in the assessment runner."
        if isinstance(node, ast.ImportFrom):
            root = (node.module or "").split(".", 1)[0]
            if root in DANGEROUS_IMPORTS:
                return f"Import '{root}' is not allowed in the assessment runner."
        if isinstance(node, ast.Call):
            if isinstance(node.func, ast.Name) and node.func.id in DANGEROUS_CALLS:
                return f"Call '{node.func.id}' is not allowed in the assessment runner."
            if isinstance(node.func, ast.Attribute) and node.func.attr in DANGEROUS_CALLS:
                return f"Call '{node.func.attr}' is not allowed in the assessment runner."
    return None


def _runner_source(function_name: str) -> str:
    return textwrap.dedent(
        f"""
        import importlib.util
        import json
        import sys
        import traceback

        spec = importlib.util.spec_from_file_location("candidate_code", "candidate_code.py")
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)

        with open("tests.json", "r", encoding="utf-8") as handle:
            tests = json.load(handle)

        fn = getattr(module, {function_name!r}, None)
        results = []
        if not callable(fn):
            print(json.dumps({{
                "runner_error": "Function {function_name} was not found or is not callable.",
                "results": []
            }}))
            sys.exit(0)

        for index, test in enumerate(tests):
            name = test.get("name") or f"Test Case {{index + 1}}"
            args = test.get("args", [])
            expected = test.get("expected")
            try:
                actual = fn(*args)
                passed = actual == expected
                results.append({{
                    "name": name,
                    "passed": passed,
                    "expected_output": json.dumps(expected, sort_keys=True),
                    "actual_output": json.dumps(actual, sort_keys=True),
                    "error": None,
                }})
            except Exception:
                results.append({{
                    "name": name,
                    "passed": False,
                    "expected_output": json.dumps(expected, sort_keys=True),
                    "actual_output": None,
                    "error": traceback.format_exc(limit=3),
                }})

        print(json.dumps({{"results": results}}))
        """
    )


def run_python_code_for_question(question: AssessmentQuestion, code: str) -> RunCodeResponse:
    settings = get_settings()
    if not settings.code_runner_enabled:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Code runner is disabled",
        )
    if len(code) > settings.code_runner_max_code_chars:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Code exceeds {settings.code_runner_max_code_chars} characters",
        )

    config = execution_config(question)
    if not config.get("execution_supported"):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=config.get("execution_reason") or "This question is evaluated by rubric, not executable tests.",
        )
    if config.get("language") != "python":
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail="Only Python execution is supported for this MVP runner",
        )

    test_cases = config.get("test_cases")
    if not isinstance(test_cases, list) or not test_cases:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No executable test cases are configured for this question",
        )

    rejection = _reject_dangerous_code(code)
    if rejection:
        return RunCodeResponse(
            status="rejected",
            passed_count=0,
            failed_count=len(test_cases),
            total_count=len(test_cases),
            runtime_ms=0,
            test_results=[],
            stdout="",
            stderr=rejection,
            message=rejection,
        )

    function_name = str(config.get("function_name") or "solve")
    start = time.perf_counter()

    # MVP local runner only. Production should use a real isolated sandbox
    # such as Docker with strict seccomp, Firecracker, or a judge service.
    with tempfile.TemporaryDirectory(prefix="xlr8_code_") as tmp:
        workdir = Path(tmp)
        (workdir / "candidate_code.py").write_text(code, encoding="utf-8")
        (workdir / "tests.json").write_text(json.dumps(test_cases), encoding="utf-8")
        (workdir / "runner.py").write_text(_runner_source(function_name), encoding="utf-8")

        try:
            completed = subprocess.run(
                [sys.executable, "runner.py"],
                cwd=workdir,
                text=True,
                capture_output=True,
                timeout=settings.code_runner_timeout_seconds,
                check=False,
            )
        except subprocess.TimeoutExpired as exc:
            runtime_ms = int((time.perf_counter() - start) * 1000)
            return RunCodeResponse(
                status="timeout",
                passed_count=0,
                failed_count=len(test_cases),
                total_count=len(test_cases),
                runtime_ms=runtime_ms,
                test_results=[],
                stdout=(exc.stdout or "")[:4000],
                stderr=(exc.stderr or "")[:4000],
                message=f"Code timed out after {settings.code_runner_timeout_seconds} seconds",
            )

    runtime_ms = int((time.perf_counter() - start) * 1000)
    stdout = (completed.stdout or "")[:8000]
    stderr = (completed.stderr or "")[:8000]
    if completed.returncode != 0:
        return RunCodeResponse(
            status="error",
            passed_count=0,
            failed_count=len(test_cases),
            total_count=len(test_cases),
            runtime_ms=runtime_ms,
            test_results=[],
            stdout=stdout,
            stderr=stderr,
            message="Code failed before tests could complete",
        )

    try:
        payload = json.loads(stdout.strip().splitlines()[-1])
    except (IndexError, json.JSONDecodeError):
        return RunCodeResponse(
            status="error",
            passed_count=0,
            failed_count=len(test_cases),
            total_count=len(test_cases),
            runtime_ms=runtime_ms,
            test_results=[],
            stdout=stdout,
            stderr=stderr,
            message="Runner returned malformed output",
        )

    if payload.get("runner_error"):
        return RunCodeResponse(
            status="error",
            passed_count=0,
            failed_count=len(test_cases),
            total_count=len(test_cases),
            runtime_ms=runtime_ms,
            test_results=[],
            stdout=stdout,
            stderr=str(payload["runner_error"]),
            message=str(payload["runner_error"]),
        )

    results = [
        CodeTestResult(
            name=str(item.get("name") or f"Test Case {index + 1}"),
            passed=bool(item.get("passed")),
            expected_output=item.get("expected_output"),
            actual_output=item.get("actual_output"),
            error=item.get("error"),
        )
        for index, item in enumerate(payload.get("results") or [])
    ]
    passed_count = sum(1 for item in results if item.passed)
    failed_count = max(0, len(test_cases) - passed_count)
    run_status = "passed" if passed_count == len(test_cases) else "failed"
    return RunCodeResponse(
        status=run_status,
        passed_count=passed_count,
        failed_count=failed_count,
        total_count=len(test_cases),
        runtime_ms=runtime_ms,
        test_results=results,
        stdout=stdout,
        stderr=stderr,
        message=f"{passed_count}/{len(test_cases)} tests passed",
    )
