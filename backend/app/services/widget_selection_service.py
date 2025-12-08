from collections.abc import Sequence

from sqlmodel import Session, select

from ..models.user import User
from ..models.widget import Widget


class WidgetSelectionService:
    def __init__(self, session: Session):
        self.session = session

    def list_for_user(self, user: User) -> Sequence[Widget]:
        return self.session.exec(select(Widget).where(Widget.owner_id == user.id)).all()

    def add_widget(self, user: User, name: str, config_json: str = "{}") -> Widget:
        widget = Widget(name=name, config_json=config_json, owner_id=user.id)
        self.session.add(widget)
        self.session.commit()
        self.session.refresh(widget)
        return widget

    def delete_widget(self, user: User, widget_id: int) -> bool:
        widget = self.session.get(Widget, widget_id)
        if not widget or widget.owner_id != user.id:
            return False
        self.session.delete(widget)
        self.session.commit()
        return True
