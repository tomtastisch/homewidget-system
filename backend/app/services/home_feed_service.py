from collections.abc import Sequence

from sqlmodel import Session, select

from ..models.user import User
from ..models.widget import Widget


class HomeFeedService:
    def __init__(self, session: Session):
        self.session = session

    def get_user_widgets(self, user: User) -> Sequence[Widget]:
        widgets = self.session.exec(
            select(Widget).where(Widget.owner_id == user.id)
        ).all()
        return widgets
