# 🎯 Core Concepts – Homewidget System

Dieser Ordner enthält die **Domain- und Feature-Dokumentation** des Homewidget Systems: die Kernkonzepte, auf denen
alles andere aufbaut.

---

## 📚 Inhaltsübersicht

### [AUTHENTICATION.md](AUTHENTICATION.md)

Auth-System, JWT, Token-Blacklist, Passwort-Sicherheit.

**Lies dies wenn**: Du möchtest verstehen, wie Login/Logout/Token-Refresh funktioniert.

### [WIDGETS.md](WIDGETS.md) *(TBD)*

Widget-Domain: Typen, Config, Rendering, Sichtbarkeitsregeln.

**Lies dies wenn**: Du neue Widget-Typen implementieren oder die Widget-Logik erweitern möchtest.

### [FREEMIUM.md](FREEMIUM.md) *(TBD)*

Freemium-System: Rollen, Zugriffskontrolle, Pricing.

**Lies dies wenn**: Du Features limitieren, Rollen prüfen oder das Preismodell verstehen möchtest.

### [SECURITY.md](SECURITY.md) *(TBD)*

Security-Policies: Datenschutz, Validierung, Best Practices.

**Lies dies wenn**: Du etwas mit Sicherheit implementierst oder Security-Reviews durchführst.

---

## 🏗️ Beziehungen

```
┌─────────────────────────────┐
│  AUTHENTICATION             │  ← Nutzer & Rollen
└────────┬────────────────────┘
         │
         ├──> FREEMIUM         ← Rolle → Feature-Zugang
         │
         ├──> WIDGETS          ← Sichtbarkeit nach Rolle
         │
         └──> SECURITY         ← Token, Passwort, Secrets
```

---

## 🔍 Schnelle Referenz

| Feature               | Datei             | Key Points                             |
|-----------------------|-------------------|----------------------------------------|
| Login/Register/Logout | AUTHENTICATION.md | JWT, Token-Blacklist, Passwort-Hashing |
| Rollen & Zugriff      | FREEMIUM.md       | RBAC, Demo/Common/Premium              |
| Widget-Rendering      | WIDGETS.md        | Types, Config-JSON, Visibility         |
| Datenschutz           | SECURITY.md       | No Secrets, Input Validation, Logging  |

---

## 📖 Verwendung

Diese Dokumente sind **Single Source of Truth** für ihre jeweiligen Domains. Das bedeutet:

- ✅ Wenn du etwas im Code änderst, aktualisiere hier
- ✅ Wenn du etwas nicht verstehst, schau hier nach
- ✅ Wenn du neue Features planst, dokumentiere hier zuerst
- ✅ Keine Redundanz mit anderen Dokumentationen

---

*Zuletzt aktualisiert: Dezember 2025*

