"""
Shell-Befehle ausführen mit strukturiertem Logging.
"""
from __future__ import annotations

import subprocess
from pathlib import Path
from typing import Iterable

from .logging_setup import logger


def run_cmd(
        cmd: str | list[str],
        cwd: Path | str | None = None,
        env: dict[str, str] | None = None,
        check: bool = True,
        capture_output: bool = False,
) -> subprocess.CompletedProcess:
    """
    Führt einen Shell-Befehl aus mit strukturiertem Logging.

    Args:
        cmd: Befehl (str oder list[str])
        cwd: Arbeitsverzeichnis
        env: Environment-Variablen (wenn None → os.environ kopiert)
        check: Raise bei Exit-Code != 0
        capture_output: Stdout/Stderr capturen (nicht auf Konsole ausgeben)

    Returns:
        subprocess.CompletedProcess

    Raises:
        subprocess.CalledProcessError: Wenn check=True und Exit-Code != 0
    """
    if isinstance(cmd, str):
        cmd = [cmd]

    cmd_str = " ".join(cmd) if isinstance(cmd, list) else cmd
    logger.info(f"Führe aus: {cmd_str}")
    if cwd:
        logger.info(f"  in: {cwd}")

    result = subprocess.run(
        cmd,
        cwd=cwd,
        env=env,
        capture_output=capture_output,
        text=True,
    )

    if result.returncode != 0:
        logger.error(f"Befehl fehlgeschlagen: {cmd_str} (Exit-Code {result.returncode})")
        if result.stderr:
            logger.error(f"Stderr:\n{result.stderr}")
        if check:
            raise subprocess.CalledProcessError(
                result.returncode, cmd, result.stdout, result.stderr
            )

    return result


def run_cmd_silent(
        cmd: str | list[str],
        cwd: Path | str | None = None,
        env: dict[str, str] | None = None,
) -> int:
    """
    Führt Befehl aus, gibt nur Exit-Code zurück (kein Logging).

    Nützlich für Status-Checks (z.B. Portprüfung).
    """
    if isinstance(cmd, str):
        cmd = [cmd]

    result = subprocess.run(
        cmd,
        cwd=cwd,
        env=env,
        capture_output=True,
        text=True,
    )
    return result.returncode


def run_cmd_iter(
        cmd: str | list[str],
        cwd: Path | str | None = None,
        env: dict[str, str] | None = None,
) -> Iterable[str]:
    """
    Führt Befehl aus und gibt Stdout-Zeilen iterativ aus.

    Nützlich für lange laufende Prozesse (Logs live anschauen).
    """
    if isinstance(cmd, str):
        cmd = [cmd]

    process = subprocess.Popen(
        cmd,
        cwd=cwd,
        env=env,
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
    )

    for line in iter(process.stdout.readline, ""):
        if line:
            yield line.rstrip("\n")

    process.wait()


class SubprocessManager:
    """Verwaltet Subprozesse (z.B. für Uvicorn während E2E-Tests)."""

    def __init__(self):
        self._process: subprocess.Popen | None = None

    def start(
            self,
            cmd: str | list[str],
            cwd: Path | str | None = None,
            env: dict[str, str] | None = None,
    ) -> subprocess.Popen:
        """Startet einen Subprozess."""
        if isinstance(cmd, str):
            cmd = [cmd]

        cmd_str = " ".join(cmd)
        logger.info(f"Starte Subprozess: {cmd_str}")

        self._process = subprocess.Popen(
            cmd,
            cwd=cwd,
            env=env,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )

        return self._process

    def stop(self, timeout: float = 5.0) -> int:
        """
        Beendet den Subprozess sauber (SIGTERM), dann SIGKILL falls nötig.

        Returns:
            Exit-Code
        """
        if not self._process:
            return 0

        try:
            self._process.terminate()
            return self._process.wait(timeout=timeout)
        except subprocess.TimeoutExpired:
            logger.warning("Subprozess antwortet nicht auf SIGTERM, sende SIGKILL")
            self._process.kill()
            return self._process.wait()

    @property
    def running(self) -> bool:
        """Prüft, ob Subprozess noch läuft."""
        return self._process is not None and self._process.poll() is None
