FROM python:3.11

WORKDIR /app

COPY requirements.txt ./

RUN pip install --no-cache-dir -r requirements.txt

COPY .env.example ./.env
COPY consumer ./consumer
COPY queue ./queue
COPY main.py ./


CMD ["python", "main.py", "email"]