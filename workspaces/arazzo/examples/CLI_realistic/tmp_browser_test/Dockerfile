FROM python:3.11-slim

WORKDIR /app

# Copy the Arazzo spec files and OpenAPI spec files
COPY arazzo/ ./arazzo/

# Copy and install Python dependencies
COPY requirements.txt ./requirements.txt
RUN pip install --no-cache-dir -r requirements.txt

# Copy generated Python module source
COPY src/ ./src/

EXPOSE 5000

CMD ["python", "-m", "src.main"]
