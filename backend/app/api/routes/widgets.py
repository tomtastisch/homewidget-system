"""API-Endpunkte für BackendWidget-Verwaltung."""
from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ...api.deps import get_current_user
from ...core.database import get_session
from ...core.logging_config import get_logger
from ...fixtures.v1 import get_detail
from ...models.widget import Widget
from ...schemas.v1.widget_contracts import WidgetDetailV1
from ...schemas.widget import WidgetCreate, WidgetRead

router = APIRouter(prefix="/api/widgets", tags=["widgets"])
LOG = get_logger("api.widgets")


@router.get("/", response_model=list[WidgetRead])
def list_widgets(session: Session = Depends(get_session), user=Depends(get_current_user)):
    """Listet alle Widgets des aktuellen Benutzers auf."""
    widgets = session.exec(select(Widget).where(Widget.owner_id == user.id)).all()
    LOG.info("widgets_listed", extra={"count": len(widgets)})
    return widgets


@router.post("/", response_model=WidgetRead, status_code=status.HTTP_201_CREATED)
def create_widget(
    payload: WidgetCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    """Erstellt ein neues BackendWidget für den aktuellen Benutzer."""
    widget = Widget(name=payload.name, config_json=payload.config_json, owner_id=user.id)
    session.add(widget)
    session.commit()
    session.refresh(widget)
    LOG.info("widget_created", extra={"widget_id": widget.id})
    return widget


@router.delete("/{widget_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_widget(
    widget_id: int,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
    """Löscht ein BackendWidget des aktuellen Benutzers."""
    widget = session.get(Widget, widget_id)
    if not widget or widget.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="BackendWidget not found")
    session.delete(widget)
    session.commit()
    LOG.info("widget_deleted", extra={"widget_id": widget_id})
    return None


@router.get("/{widget_id}/detail_v1", response_model=WidgetDetailV1)
def get_widget_detail_v1(
        widget_id: int,
        _user=Depends(get_current_user),
):
    """Liefert den Detail‑Container für ein Widget im v1‑Contract (statisch über Fixtures)."""
    detail = get_detail(widget_id)
    if not detail:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget detail not found")
    return detail
