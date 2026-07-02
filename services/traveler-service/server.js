const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const port = Number(process.env.PORT || 5201);
const serviceName = "traveler-service";

const loyaltyServiceUrl = process.env.LOYALTY_SERVICE_URL || "http://localhost:5204";

const travelers = [
  {
    id: "traveler-1",
    name: "Nora Hassan",
    email: "nora@example.com",
    tier: "gold",
    preferences: ["window-seat", "vegetarian-meal"]
  },
  {
    id: "traveler-2",
    name: "Omar Said",
    email: "omar@example.com",
    tier: "silver",
    preferences: ["morning-flights"]
  }
];

app.use(cors());
app.use(express.json());

async function enrollTraveler(traveler) {
  const response = await axios.post(`${loyaltyServiceUrl}/loyalty/enroll`, {
    travelerId: traveler.id,
    email: traveler.email,
    tier: traveler.tier
  }, { timeout: 3000, validateStatus: () => true });

  if (response.status >= 400) {
    const error = new Error(response.data?.error || "Could not enroll traveler in loyalty-service");
    error.statusCode = response.status;
    throw error;
  }

  return response.data.member;
}

app.get("/health", (_req, res) => {
  res.json({
    service: serviceName,
    status: "ok",
    architecture: "microservices",
    dependencies: { loyaltyServiceUrl }
  });
});

app.get("/travelers", (_req, res) => {
  res.json({ travelers });
});

app.get("/travelers/:id", (req, res) => {
  const traveler = travelers.find((item) => item.id === req.params.id);
  if (!traveler) {
    res.status(404).json({ error: "Traveler not found" });
    return;
  }

  res.json({ traveler });
});

app.post("/travelers", async (req, res, next) => {
  try {
    if (!req.body.name || !req.body.email) {
      res.status(400).json({ error: "name and email are required" });
      return;
    }

    const traveler = {
      id: `traveler-${travelers.length + 1}`,
      name: req.body.name,
      email: req.body.email,
      tier: req.body.tier || "bronze",
      preferences: req.body.preferences || []
    };

    travelers.push(traveler);
    const loyaltyMember = await enrollTraveler(traveler);
    res.status(201).json({ traveler, loyaltyMember });
  } catch (error) {
    next(error);
  }
});

app.use((error, _req, res, _next) => {
  res.status(error.statusCode || 500).json({ error: error.message });
});

app.listen(port, () => {
  console.log(`${serviceName} listening on ${port}`);
});

