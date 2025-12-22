FROM python:3.13-slim

WORKDIR /app

# System-Abhängigkeiten (falls nötig)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Requirements kopieren und installieren
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Anwendungscode kopieren
COPY . .

# Umgebungsvariablen
ENV PYTHONUNBUFFERED=1
ENV PORT=8000
ENV DATABASE_URL=sqlite:///./homewidget.db

# Port exponieren
EXPOSE 8000

# Startbefehl
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
