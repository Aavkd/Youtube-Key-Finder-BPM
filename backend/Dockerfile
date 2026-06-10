# Pin to Debian bookworm so the base stays in lockstep with the worker image
# (the floating `-slim` tag now points to trixie, which renamed several libs).
FROM python:3.12-slim-bookworm

# ffmpeg is needed downstream (audio conversion); install at the API layer too
# so backend and worker share a consistent base.
RUN apt-get update \
    && apt-get install -y --no-install-recommends ffmpeg \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

EXPOSE 8000

# Apply DB migrations, then start the API.
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
