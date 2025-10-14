# Dockerfile for Python ML Engine (Core)
FROM python:3.12-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY core/ ./core/
COPY data/ ./data/

# Expose port (for future FastAPI integration)
EXPOSE 8001

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV PYTHONPATH=/app

# Health check (for when FastAPI is added)
# HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
#     CMD python -c "import requests; requests.get('http://localhost:8001/health')"

# Run FastAPI with uvicorn (uncomment when you have a FastAPI app)
# CMD ["uvicorn", "core.api.main:app", "--host", "0.0.0.0", "--port", "8001"]

# For now, just keep container running for Python scripts
CMD ["python", "-c", "print('Python ML Engine ready. Add FastAPI app to core/api/main.py to enable API.'); import time; time.sleep(infinity)"]
