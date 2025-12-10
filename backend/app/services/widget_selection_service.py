from __future__ import annotations

"""Service zur Verwaltung von Widget-Auswahl und -Operationen."""

from collections.abc import Sequence

from sqlmodel import Session, select

from ..models.user import User
from ..models.widget import Widget


class WidgetSelectionService:
    """Service für Widget-Auswahl und CRUD-Operationen."""

    def __init__(self, session: Session):
        self.session = session

    def list_for_user(self, user: User) -> Sequence[Widget]:
        """
        Listet alle Widgets eines Benutzers auf.

        Args:
            user: Benutzer, dessen Widgets aufgelistet werden sollen.

        Returns:
            Sequenz von Widgets.
        """
        return self.session.exec(select(Widget).where(Widget.owner_id == user.id)).all()

    def add_widget(self, user: User, name: str, config_json: str = "{}") -> Widget:
        """
        Fügt ein neues Widget für einen Benutzer hinzu.

        Args:
            user: Benutzer, dem das Widget gehören soll.
            name: Name des Widgets.
            config_json: JSON-Konfiguration (default: "{}").

        Returns:
            Neu erstelltes Widget.
        """
        widget = Widget(name=name, config_json=config_json, owner_id=user.id)
        self.session.add(widget)
        self.session.commit()
        self.session.refresh(widget)
        return widget

    def delete_widget(self, user: User, widget_id: int) -> bool:
        """
        Löscht ein Widget, falls es dem Benutzer gehört.

        Args:
            user: Benutzer, der das Widget löschen möchte.
            widget_id: ID des zu löschenden Widgets.

        Returns:
            True falls erfolgreich gelöscht, False falls nicht gefunden oder nicht autorisiert.
        """
        widget = self.session.get(Widget, widget_id)
        if not widget or widget.owner_id != user.id:
            return False
        self.session.delete(widget)
        self.session.commit()
        return True
