if [[ "${MODE}" == "fix" ]]; then
  log "Ruff: auto-fix (imports, simple, pyupgrade, format)"
  # Hinweis: ruff check --fix gibt Exit-Code > 0 zurück, wenn unfixbare Verstöße
  # verbleiben. Das ist während der Fix-Phase akzeptabel, da wir danach nochmal prüfen.
  # Wir erfassen den Exit-Code für Transparenz, stoppen aber nicht den Workflow.
  set +e
  ruff check backend/app --fix
  FIX_EXIT_CODE=$?
  set -e
  if [[ ${FIX_EXIT_CODE} -ne 0 ]]; then
    log "Ruff check --fix beendet mit Exit-Code ${FIX_EXIT_CODE} (unfixbare Verstöße verbleiben möglicherweise)"
  else
    log "Ruff check --fix erfolgreich abgeschlossen"
  fi

  # Optional: Formatter (respektiert [tool.ruff.format])
  set +e
  ruff format backend/app
  FORMAT_EXIT_CODE=$?
  set -e
  if [[ ${FORMAT_EXIT_CODE} -ne 0 ]]; then
    log "Ruff format beendet mit Exit-Code ${FORMAT_EXIT_CODE}"
  else
    log "Ruff format erfolgreich abgeschlossen"
  fi
fi
