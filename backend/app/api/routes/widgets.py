from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select

from ...api.deps import get_current_user
from ...core.database import get_session
from ...core.logging_config import get_logger
from ...models.widget import Widget
from ...schemas.widget import WidgetCreate, WidgetRead

router = APIRouter(prefix="/api/widgets", tags=["widgets"])
LOG = get_logger("api.widgets")


@router.get("/", response_model=list[WidgetRead])
def list_widgets(session: Session = Depends(get_session), user=Depends(get_current_user)):
    widgets = session.exec(select(Widget).where(Widget.owner_id == user.id)).all()
    LOG.info("widgets_listed", extra={"count": len(widgets)})
    return widgets


@router.post("/", response_model=WidgetRead, status_code=status.HTTP_201_CREATED)
def create_widget(
    payload: WidgetCreate,
    session: Session = Depends(get_session),
    user=Depends(get_current_user),
):
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
    widget = session.get(Widget, widget_id)
    if not widget or widget.owner_id != user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Widget not found")
    session.delete(widget)
    session.commit()
    LOG.info("widget_deleted", extra={"widget_id": widget_id})
    return None
