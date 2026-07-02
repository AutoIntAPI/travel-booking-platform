const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const axios = require("axios");

const app = express();
const port = Number(process.env.PORT || 5200);
const serviceName = "booking-api-gateway";

const services = {
  travelers: process.env.TRAVELER_SERVICE_URL || "http://localhost:5201",
  itineraries: process.env.ITINERARY_SERVICE_URL || "http://localhost:5202",
  notifications: process.env.NOTIFICATION_SERVICE_URL || "http://localhost:5203",
  loyalty: process.env.LOYALTY_SERVICE_URL || "http://localhost:5204",
  reservations: process.env.RESERVATION_SERVICE_URL || "http://localhost:5302",
  fulfillment: process.env.FULFILLMENT_SERVICE_URL || "http://localhost:5304"
};

app.use(cors());
app.use(morgan("dev"));
app.use(express.json());

function unwrapServiceResponse(response, path) {
  if (response.status >= 400) {
    const error = new Error(response.data?.error || `REST call failed: ${path}`);
    error.statusCode = response.status;
    error.details = response.data;
    throw error;
  }

  return response.data;
}

app.get("/health", (_req, res) => {
  res.json({ service: serviceName, status: "ok", architecture: "microservices", dependencies: services });
});

app.get("/travelers", async (_req, res, next) => {
  try {
    const travelersResponse = await axios.get(`${services.travelers}/travelers`, {
      timeout: 4000,
      validateStatus: () => true
    });
    res.json(unwrapServiceResponse(travelersResponse, "/travelers"));
  } catch (error) {
    next(error);
  }
});

app.get("/itineraries/:id", async (req, res, next) => {
  try {
    const itineraryResponse = await axios.get(`${services.itineraries}/itineraries/${req.params.id}`, {
      timeout: 4000,
      validateStatus: () => true
    });
    res.json(unwrapServiceResponse(itineraryResponse, "/itineraries/{id}"));
  } catch (error) {
    next(error);
  }
});

app.post("/trip-bookings", async (req, res, next) => {
  try {
    const travelerResponse = await axios.get(`${services.travelers}/travelers/${req.body.travelerId}`, {
      timeout: 4000,
      validateStatus: () => true
    });
    const traveler = unwrapServiceResponse(travelerResponse, "/travelers/{id}");

    const reservationResponse = await axios.post(
      `${services.reservations}/reservations`,
      {
        travelerId: traveler.traveler.id,
        packageId: req.body.packageId,
        paymentMethod: req.body.paymentMethod || "card"
      },
      {
        timeout: 4000,
        validateStatus: () => true
      }
    );
    const reservation = unwrapServiceResponse(reservationResponse, "/reservations");

    const itineraryResponse = await axios.post(
      `${services.itineraries}/itineraries`,
      {
        travelerId: traveler.traveler.id,
        reservationId: reservation.reservation.id,
        packageId: req.body.packageId,
        notes: req.body.notes || "Booked through booking-api-gateway"
      },
      {
        timeout: 4000,
        validateStatus: () => true
      }
    );
    const itinerary = unwrapServiceResponse(itineraryResponse, "/itineraries");

    const ticketResponse = await axios.post(
      `${services.fulfillment}/fulfillment/issue-ticket`,
      {
        reservationId: reservation.reservation.id,
        itineraryId: itinerary.itinerary.id,
        travelerEmail: traveler.traveler.email
      },
      {
        timeout: 4000,
        validateStatus: () => true
      }
    );
    const ticket = unwrapServiceResponse(ticketResponse, "/fulfillment/issue-ticket");

    res.status(201).json({ traveler: traveler.traveler, reservation: reservation.reservation, itinerary: itinerary.itinerary, ticket });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  res.status(error.statusCode || 500).json({ error: error.message, details: error.details });
});

app.listen(port, () => {
  console.log(`${serviceName} listening on ${port}`);
});
