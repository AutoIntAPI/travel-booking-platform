import os
from datetime import datetime, timezone

import requests
from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

PORT = int(os.getenv("PORT", "5202"))
TRAVELER_SERVICE_URL = os.getenv("TRAVELER_SERVICE_URL", "http://localhost:5201")
RESERVATION_SERVICE_URL = os.getenv("RESERVATION_SERVICE_URL", "http://localhost:5302")

itineraries = []


@app.get("/health")
def health():
    return jsonify({
        "service": "itinerary-service",
        "status": "ok",
        "architecture": "microservices",
        "dependencies": {
            "travelerServiceUrl": TRAVELER_SERVICE_URL,
            "reservationServiceUrl": RESERVATION_SERVICE_URL,
        },
    })


@app.get("/itineraries")
def list_itineraries():
    return jsonify({"itineraries": itineraries})


@app.get("/itineraries/<id>")
def get_itinerary(id):
    itinerary = next((item for item in itineraries if item["id"] == id), None)
    if not itinerary:
        return jsonify({"error": "Itinerary not found"}), 404
    return jsonify({"itinerary": itinerary})


@app.post("/itineraries")
def create_itinerary():
    payload = request.get_json(force=True)
    traveler_id = payload.get("travelerId")
    reservation_id = payload.get("reservationId")

    if not traveler_id or not reservation_id:
        return jsonify({"error": "travelerId and reservationId are required"}), 400

    traveler_response = requests.get(f"{TRAVELER_SERVICE_URL}/travelers/{traveler_id}", timeout=3)
    if traveler_response.status_code >= 400:
        return jsonify({"error": "Traveler could not be verified"}), 400
    traveler_data = traveler_response.json()

    reservation_response = requests.get(f"{RESERVATION_SERVICE_URL}/reservations/{reservation_id}", timeout=3)
    if reservation_response.status_code >= 400:
        return jsonify({"error": "Reservation could not be verified"}), 400
    reservation_data = reservation_response.json()

    itinerary = {
        "id": f"itinerary-{len(itineraries) + 1}",
        "travelerId": traveler_id,
        "reservationId": reservation_id,
        "packageId": payload.get("packageId"),
        "travelerName": traveler_data["traveler"]["name"],
        "reservationStatus": reservation_data["reservation"]["status"],
        "notes": payload.get("notes", ""),
        "createdAt": datetime.now(timezone.utc).isoformat(),
    }
    itineraries.append(itinerary)
    return jsonify({"itinerary": itinerary}), 201


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=PORT)
