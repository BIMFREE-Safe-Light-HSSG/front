FROM python:3.11-slim

WORKDIR /app

COPY services/realtime-nav-api/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY services/realtime-nav-api/app ./app
COPY services/realtime-nav-api/data/nav_graph.json ./data/nav_graph.json

ENV NAV_GRAPH_PATH=/app/data/nav_graph.json
ENV PORT=8000

EXPOSE 8000

CMD ["sh", "-c", "uvicorn app.main:app --host 0.0.0.0 --port ${PORT}"]
