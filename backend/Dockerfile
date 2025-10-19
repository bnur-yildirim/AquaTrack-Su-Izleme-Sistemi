# Backend Dockerfile for Render.com
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (includes water quality data and models)
COPY . .

# Ensure models directory exists and has proper permissions
RUN mkdir -p models && \
    chmod -R 755 models && \
    ls -la models/

# Set Python path to include current directory
ENV PYTHONPATH=/app

# Debug: List files and check models directory
RUN echo "=== DEBUG: Listing application files ===" && \
    ls -la /app/ && \
    echo "=== DEBUG: Checking models directory ===" && \
    ls -la /app/models/ && \
    echo "=== DEBUG: Checking if parquet file exists ===" && \
    ls -la /app/models/all_predictions_final.parquet || echo "Parquet file not found" && \
    echo "=== DEBUG: Checking water quality directory ===" && \
    ls -la /app/water_quality/ || echo "Water quality directory not found" && \
    echo "=== DEBUG: Checking water quality data ===" && \
    ls -la /app/water_quality/data/ || echo "Water quality data directory not found"

# Create non-root user for security
RUN useradd --create-home --shell /bin/bash app && \
    chown -R app:app /app
USER app

# Expose port (Render uses PORT environment variable)
EXPOSE $PORT

# Health check
HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:$PORT/api/health || exit 1

# Run the application with dynamic port for Render
CMD gunicorn --bind 0.0.0.0:$PORT --workers 2 --timeout 120 --preload app:app
