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

async function request(serviceUrl, path, options = {}) {
  const response = await axios({
    url: `${serviceUrl}${path}`,
    timeout: 4000,
    validateStatus: () => true,
    ...options
  });

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
    res.json(await request(services.travelers, "/travelers"));
  } catch (error) {
    next(error);
  }
});

app.get("/itineraries/:id", async (req, res, next) => {
  try {
    res.json(await request(services.itineraries, `/itineraries/${req.params.id}`));
  } catch (error) {
    next(error);
  }
});

app.post("/trip-bookings", async (req, res, next) => {
  try {
    const traveler = await request(services.travelers, `/travelers/${req.body.travelerId}`);
    const reservation = await request(services.reservations, "/reservations", {
      method: "POST",
      data: {
        travelerId: traveler.traveler.id,
        packageId: req.body.packageId,
        paymentMethod: req.body.paymentMethod || "card"
      }
    });

    const itinerary = await request(services.itineraries, "/itineraries", {
      method: "POST",
      data: {
        travelerId: traveler.traveler.id,
        reservationId: reservation.reservation.id,
        packageId: req.body.packageId,
        notes: req.body.notes || "Booked through booking-api-gateway"
      }
    });

    const ticket = await request(services.fulfillment, "/fulfillment/issue-ticket", {
      method: "POST",
      data: {
        reservationId: reservation.reservation.id,
        itineraryId: itinerary.itinerary.id,
        travelerEmail: traveler.traveler.email
      }
    });

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

