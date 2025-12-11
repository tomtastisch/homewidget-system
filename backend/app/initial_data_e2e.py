"""
Initialisiert die E2E-Testdatenbank und legt Seed-Daten an.

Idempotent: Benutzer werden per E-Mail gefunden oder neu angelegt.
Zusätzlich werden einfache Widgets pro Benutzerrolle erstellt, falls nicht vorhanden.
"""
from __future__ import annotations

from sqlmodel import Session, select

from .core.database import engine, init_db
from .core.security import hash_password, verify_password
from .models.user import User, UserRole
from .models.widget import Widget


def ensure_user(session: Session, email: str, password: str, role: UserRole) -> User:
    user = session.exec(select(User).where(User.email == email)).first()
    if user:
        # Rolle ggf. korrigieren (idempotent aktualisieren)
        updated = False
        if user.role != role:
            user.role = role
            updated = True

        # E2E-Spezifik: Passwort deterministisch setzen, damit veraltete
        # Datenbanken aus dem Repo (test_e2e.db) nicht zu 401 führen.
        # => bewahrt Idempotenz.
        if not verify_password(password, user.password_hash):
            user.password_hash = hash_password(password)
            updated = True

        if updated:
            session.add(user)
            session.commit()
            session.refresh(user)
        return user

    user = User(email=email, password_hash=hash_password(password), role=role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user


def ensure_role_widget(session: Session, user: User, name: str) -> None:
    existing = session.exec(select(Widget).where(Widget.owner_id == user.id, Widget.name == name)).first()
    if existing:
        return

    w = Widget(
        name=name,
        title=f"{name.title()} Widget",
        slot="home",
        owner_id=user.id,
        config_json="{}",
        payload={"role": user.role},
    )
    session.add(w)
    session.commit()


def run() -> None:
    # Schema sicherstellen
    init_db()

    with Session(engine) as session:
        demo = ensure_user(session, "demo@example.com", "demo1234", UserRole.demo)
        common = ensure_user(session, "common@example.com", "common1234", UserRole.common)
        premium = ensure_user(session, "premium@example.com", "premium1234", UserRole.premium)

        ensure_role_widget(session, demo, "demo-role-info")
        ensure_role_widget(session, common, "common-role-info")
        ensure_role_widget(session, premium, "premium-role-info")


if __name__ == "__main__":
    run()
