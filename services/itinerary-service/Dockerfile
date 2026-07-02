FROM python:3.12-slim

WORKDIR /app
COPY services/itinerary-service/requirements.txt ./
RUN pip install --no-cache-dir -r requirements.txt
COPY services/itinerary-service/app.py ./

EXPOSE 5202
CMD ["python", "app.py"]

