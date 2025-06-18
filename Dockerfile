# Development Dockerfile for LEOS First Orbit
FROM python:3.10-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    python3-dev \
    build-essential \
    nodejs \
    npm \
    && rm -rf /var/lib/apt/lists/*

# Upgrade pip to latest version
RUN pip install --upgrade pip

# Copy Python requirements and install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy JS dependencies and install
COPY package.json package-lock.json* ./
RUN npm install

# Copy application code
COPY . .
RUN npm run build

# Expose port and start server
EXPOSE 8080
ENV PORT=8080
CMD exec python server.py --host 0.0.0.0 --port $PORT
