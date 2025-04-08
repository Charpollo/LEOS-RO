# Use a smaller base image for faster builds
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Create a non-root user
RUN useradd -m appuser

# Install dependencies with better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code (not using obfuscated code for now)
COPY backend/ /app/backend/
COPY frontend/ /app/frontend/
COPY server.py /app/

# Set ownership to non-root user
RUN chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Set environment variables
ENV PORT=8080
ENV PYTHONUNBUFFERED=1
ENV DEBUG=False
ENV SIMULATION_HOURS=4
ENV TIME_STEP_SECONDS=5

# Use gunicorn with optimized settings for Cloud Run
CMD exec gunicorn --bind :$PORT --workers 1 --threads 8 --timeout 0 "server:app"
