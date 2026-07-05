# ---------- Backend Dockerfile (FastAPI) ----------
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# System dependencies (for Pillow, bcrypt etc.)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libjpeg-dev \
    zlib1g-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first (better caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy app code
COPY . .

# Expose port (Render/Railway use $PORT env var, default 8000 for local)
EXPOSE 8000

# Run the FastAPI app
CMD ["sh", "-c", "uvicorn server:app --host 0.0.0.0 --port ${PORT:-8000}"]