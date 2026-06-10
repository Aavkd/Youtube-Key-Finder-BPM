# Pin to Debian bookworm: the floating `-slim` tag now points to trixie, which
# renames several libs. Bookworm also matches the platform Essentia's prebuilt
# wheels are validated against. NOTE: since bookworm, FFTW's runtime is split
# into per-precision packages (libfftw3-double3 / -single3); the old
# `libfftw3-3` name only existed up to bullseye.
FROM python:3.12-slim-bookworm

# ffmpeg for audio conversion; build/audio libs that analysis deps
# (librosa/Essentia, added in later phases) commonly require.
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        ffmpeg \
        libsndfile1 \
        libfftw3-double3 \
        libfftw3-single3 \
        libsamplerate0 \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

CMD ["python", "-m", "app.main"]
