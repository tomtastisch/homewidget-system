# 🛠️ Infrastructure & Deployment – Homewidget System

Dieser Ordner dokumentiert **Ops, Deployment, CI/CD und Infrastruktur**-Aspekte.

---

## 📚 Inhaltsübersicht

### [CI-CD.md](CI-CD.md)

GitHub Actions Pipeline, Tests, Checks, Quality-Gates.

**Lies dies wenn**: Du die Pipeline verstehen oder anpassen möchtest.

### [DATABASE.md](DATABASE.md) *(TBD)*

Schema, Migrationen, SQLModel, Performance.

**Lies dies wenn**: Du Datenbankänderungen planst oder die Schema-Version verstehen möchtest.

### [DEPLOYMENT.md](DEPLOYMENT.md) *(TBD)*

Production-Setup, Docker, Secrets-Management, Monitoring.

**Lies dies wenn**: Du ein Deployment planst oder Prod-Infra-Fragen hast.

---

## 📊 Zusammenhang

```
├─ CI-CD Pipeline (GitHub Actions)
│  ├─ Lint + Type-Check
│  ├─ Unit-Tests
│  └─ Build-Artefakte
│
├─ Database (Schema, Migrations)
│  └─ SQLModel-Modelle ↔ SQL
│
└─ Deployment (Docker, Cloud)
   ├─ Secrets
   ├─ Environment-Config
   └─ Monitoring/Logs
```

---

*Zuletzt aktualisiert: Dezember 2025*

