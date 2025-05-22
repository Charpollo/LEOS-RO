# Use Node.js for frontend build
FROM node:18-slim AS build-frontend

# Set working directory
WORKDIR /build

# Copy package files and install dependencies
COPY package.json package-lock.json ./
RUN npm ci

# Copy frontend source and webpack config
COPY frontend/ ./frontend/
COPY webpack.config.js ./

# Build frontend
RUN npx webpack --config webpack.config.js

# Use Python for backend
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Create a non-root user
RUN useradd -m appuser

# Install dependencies with better caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY backend/ /app/backend/
COPY server.py /app/

# Copy built frontend from the build stage
COPY --from=build-frontend /build/frontend/ /app/frontend/

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
