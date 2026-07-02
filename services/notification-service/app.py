import os
from datetime import datetime, timezone

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

PORT = int(os.getenv("PORT", "5203"))
ITINERARY_SERVICE_URL = os.getenv("ITINERARY_SERVICE_URL", "http://localhost:5202")
FULFILLMENT_SERVICE_URL = os.getenv("FULFILLMENT_SERVICE_URL", "http://localhost:5304")

notifications = []


@app.get("/health")
def health():
    return jsonify({
        "service": "notification-service",
        "status": "ok",
        "architecture": "microservices",
        "dependencies": {
            "itineraryServiceUrl": ITINERARY_SERVICE_URL,
            "fulfillmentServiceUrl": FULFILLMENT_SERVICE_URL,
        },
    })


@app.get("/notifications")
def list_notifications():
    return jsonify({"notifications": notifications})


@app.post("/notifications")
def create_notification():
    payload = request.get_json(force=True)
    recipient = payload.get("recipient")
    message = payload.get("message")
    itinerary_id = payload.get("itineraryId")
    ticket_id = payload.get("ticketId")

    if not recipient or not message:
        return jsonify({"error": "recipient and message are required"}), 400

    if itinerary_id:
        response = requests.get(f"{ITINERARY_SERVICE_URL}/itineraries/{itinerary_id}", timeout=3)
        if response.status_code >= 400:
            return jsonify({"error": "Referenced itinerary was not found"}), 400

    if ticket_id:
        response = requests.get(f"{FULFILLMENT_SERVICE_URL}/fulfillment/tickets/{ticket_id}", timeout=3)
        if response.status_code >= 400:
            return jsonify({"error": "Referenced ticket was not found"}), 400

    notification = {
        "id": f"notification-{len(notifications) + 1}",
        "recipient": recipient,
        "message": message,
        "itineraryId": itinerary_id,
        "ticketId": ticket_id,
        "channel": payload.get("channel", "email"),
        "sentAt": datetime.now(timezone.utc).isoformat(),
    }
    notifications.append(notification)
    return jsonify({"notification": notification}), 201


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
