from __future__ import annotations

from datetime import UTC, datetime, timedelta

import pytest
from freezegun import freeze_time
from sqlmodel import Session

from app.models.user import User, UserRole
from app.models.widget import Widget
from app.services.home_feed_service import HomeFeedService


def _ts(y: int, m: int, d: int, h: int = 0, mi: int = 0, s: int = 0) -> datetime:
    return datetime(y, m, d, h, mi, s, tzinfo=UTC)


pytestmark = pytest.mark.unit


def test_enabled_false_is_excluded(db_session: Session) -> None:
    # Arrange: Benutzer + zwei Widgets
    user = User(email="sel_enabled@example.com", password_hash="x", role=UserRole.common)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    w1 = Widget(
        owner_id=user.id,  # type: ignore[arg-type]
        name="A",
        enabled=True,
        priority=1,
        created_at=_ts(2025, 1, 1),
    )
    w2 = Widget(
        owner_id=user.id,  # type: ignore[arg-type]
        name="B",
        enabled=False,
        priority=10,
        created_at=_ts(2025, 1, 2),
    )
    db_session.add(w1)
    db_session.add(w2)
    db_session.commit()

    service = HomeFeedService(db_session)

    # Act
    res = service.get_user_widgets(user)

    # Assert: Nur das enabled=True Widget
    assert [w.name for w in res] == ["A"]


def test_visibility_rules_match_role(db_session: Session) -> None:
    # Arrange: premium User
    user = User(email="sel_vis@example.com", password_hash="x", role=UserRole.premium)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    w_all = Widget(
        owner_id=user.id,  # type: ignore[arg-type]
        name="All",
        visibility_rules=[],  # sichtbar für alle
        created_at=_ts(2025, 1, 1),
        priority=1,
    )
    w_premium = Widget(
        owner_id=user.id,  # type: ignore[arg-type]
        name="PremOnly",
        visibility_rules=["premium"],
        created_at=_ts(2025, 1, 2),
        priority=2,
    )
    w_common = Widget(
        owner_id=user.id,  # type: ignore[arg-type]
        name="CommonOnly",
        visibility_rules=["common"],
        created_at=_ts(2025, 1, 3),
        priority=3,
    )
    db_session.add(w_all)
    db_session.add(w_premium)
    db_session.add(w_common)
    db_session.commit()

    service = HomeFeedService(db_session)

    # Act
    res = service.get_user_widgets(user)

    # Assert: premium sieht All + PremOnly, nicht CommonOnly
    names = [w.name for w in res]
    assert set(names) == {"All", "PremOnly"}


def test_ttl_excludes_expired(db_session: Session) -> None:
    # Arrange: ein User, zwei Widgets (eins läuft ab)
    user = User(email="sel_ttl@example.com", password_hash="x", role=UserRole.common)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    base = _ts(2025, 1, 1, 0, 0, 0)
    w_fresh = Widget(
        owner_id=user.id,  # type: ignore[arg-type]
        name="Fresh",
        freshness_ttl=3600,  # 1h
        created_at=base,
        priority=1,
    )
    w_unlimited = Widget(
        owner_id=user.id,  # type: ignore[arg-type]
        name="Unlimited",
        freshness_ttl=0,  # kein Ablauf
        created_at=base - timedelta(days=5),
        priority=1,
    )
    db_session.add(w_fresh)
    db_session.add(w_unlimited)
    db_session.commit()

    service = HomeFeedService(db_session)

    # Zeit genau vor Ablauf
    with freeze_time(_ts(2025, 1, 1, 0, 59, 59)) as frozen:
        res_before = service.get_user_widgets(user, now=frozen())
        assert {w.name for w in res_before} == {"Fresh", "Unlimited"}

    # Zeit genau zum Ablauf (== abgelaufen -> nicht mehr enthalten)
    with freeze_time(_ts(2025, 1, 1, 1, 0, 0)) as frozen:
        res_after = service.get_user_widgets(user, now=frozen())
        assert {w.name for w in res_after} == {"Unlimited"}


def test_sorting_priority_created_id(db_session: Session) -> None:
    # Arrange: User
    user = User(email="sel_sort@example.com", password_hash="x", role=UserRole.common)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Drei Widgets mit unterschiedlicher priority/created_at und gleichen Sichtbarkeiten
    w1 = Widget(owner_id=user.id, name="W1", priority=10, created_at=_ts(2024, 1, 1))  # type: ignore[arg-type]
    w2 = Widget(owner_id=user.id, name="W2", priority=20, created_at=_ts(2024, 1, 2))  # type: ignore[arg-type]
    # W3 gleiche priority wie W2 aber älteres created_at -> nach W2
    w3 = Widget(owner_id=user.id, name="W3", priority=20, created_at=_ts(2024, 1, 1, 12))  # type: ignore[arg-type]

    db_session.add(w1)
    db_session.add(w2)
    db_session.add(w3)
    db_session.commit()

    # Erzeuge ID‑Tiebreaker: w4/w5 gleiche priority und created_at, ID entscheidet desc
    same_created = _ts(2024, 1, 3, 8)
    w4 = Widget(owner_id=user.id, name="W4", priority=5, created_at=same_created)  # type: ignore[arg-type]
    db_session.add(w4)
    db_session.commit()
    w5 = Widget(owner_id=user.id, name="W5", priority=5, created_at=same_created)  # type: ignore[arg-type]
    db_session.add(w5)
    db_session.commit()

    service = HomeFeedService(db_session)

    # Act
    res = service.get_user_widgets(user)

    # Assert: priority desc, dann created_at desc, dann id desc
    names = [w.name for w in res]
    # Erwartete Reihenfolge: W2 (p20, newer) > W3 (p20) > W1 (p10) > W5/W4 (p5, same ts, id desc => W5 vor W4)
    assert names[:5] == ["W2", "W3", "W1", "W5", "W4"]


def test_combined_filters_and_sorting_is_deterministic(db_session: Session) -> None:
    # Arrange: premium User, gemischte Widgets
    user = User(email="sel_combo@example.com", password_hash="x", role=UserRole.premium)
    db_session.add(user)
    db_session.commit()
    db_session.refresh(user)

    # Sichtbar für premium, nicht sichtbar für common; ein disabled; ein abgelaufenes
    base = _ts(2025, 2, 1, 9)
    ws = [
        Widget(owner_id=user.id, name="ok1", priority=1, visibility_rules=["premium"], created_at=base),
        # type: ignore[arg-type]
        Widget(owner_id=user.id, name="ok2", priority=3, visibility_rules=[], created_at=base + timedelta(minutes=1)),
        # type: ignore[arg-type]
        Widget(owner_id=user.id, name="no_common", priority=5, visibility_rules=["common"],
               created_at=base + timedelta(minutes=2)),  # type: ignore[arg-type]
        Widget(owner_id=user.id, name="disabled", enabled=False, priority=100, visibility_rules=["premium"],
               created_at=base + timedelta(minutes=3)),  # type: ignore[arg-type]
        Widget(owner_id=user.id, name="expired", freshness_ttl=60, created_at=base - timedelta(hours=1)),
        # type: ignore[arg-type]
    ]
    for w in ws:
        db_session.add(w)
    db_session.commit()

    service = HomeFeedService(db_session)

    with freeze_time(base + timedelta(minutes=2)) as frozen:
        res = service.get_user_widgets(user, now=frozen())
        names = [w.name for w in res]
        # Erwartet: ok2 (p3, newer) > ok1 (p1). Abgelehnte: no_common, disabled, expired
        assert names == ["ok2", "ok1"]
