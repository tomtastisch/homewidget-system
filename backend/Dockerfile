FROM python:3.13-slim

WORKDIR /app

# System-Abhängigkeiten installieren, Requirements installieren und aufräumen
COPY requirements.txt .
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    curl \
    && pip install --no-cache-dir -r requirements.txt \
    && apt-get purge -y --auto-remove build-essential \
    && rm -rf /var/lib/apt/lists/*

# Anwendungscode kopieren
COPY . .

# Umgebungsvariablen
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV DATABASE_URL=sqlite:////app/data/homewidget.db

# Port exponieren
EXPOSE 8000

# Startbefehl
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
