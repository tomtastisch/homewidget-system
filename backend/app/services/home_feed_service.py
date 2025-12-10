from __future__ import annotations

"""Service zur Bereitstellung von Home-Feed-Widgets für Benutzer."""

from collections.abc import Sequence

from sqlmodel import Session, select

from ..models.user import User
from ..models.widget import Widget


class HomeFeedService:
    """
    Service zum Abrufen von Widget-Feeds für Benutzer.
    """

    def __init__(self, session: Session):
        self.session = session

    def get_user_widgets(self, user: User) -> Sequence[Widget]:
        """
        Ruft alle Widgets eines Benutzers ab.

        Args:
            user: Benutzer, dessen Widgets abgerufen werden sollen.

        Returns:
            Sequenz von Widgets.
        """
        widgets = self.session.exec(select(Widget).where(Widget.owner_id == user.id)).all()
        return widgets
