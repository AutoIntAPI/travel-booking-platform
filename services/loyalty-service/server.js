const express = require("express");
const cors = require("cors");
const axios = require("axios");

const app = express();
const port = Number(process.env.PORT || 5204);
const serviceName = "loyalty-service";

const paymentServiceUrl = process.env.PAYMENT_SERVICE_URL || "http://localhost:5303";

const members = [
  { travelerId: "traveler-1", email: "nora@example.com", tier: "gold", points: 18400 },
  { travelerId: "traveler-2", email: "omar@example.com", tier: "silver", points: 6200 }
];

app.use(cors());
app.use(express.json());

async function getPayment(paymentId) {
  const response = await axios.get(`${paymentServiceUrl}/payments/${paymentId}`, {
    timeout: 3000,
    validateStatus: () => true
  });

  if (response.status >= 400) {
    const error = new Error(response.data?.error || "Payment not found in payment-service");
    error.statusCode = response.status;
    throw error;
  }

  return response.data.payment;
}

app.get("/health", (_req, res) => {
  res.json({
    service: serviceName,
    status: "ok",
    architecture: "microservices",
    dependencies: { paymentServiceUrl }
  });
});

app.get("/loyalty/:travelerId", (req, res) => {
  const member = members.find((item) => item.travelerId === req.params.travelerId);
  if (!member) {
    res.status(404).json({ error: "Loyalty member not found" });
    return;
  }

  res.json({ member });
});

app.post("/loyalty/enroll", (req, res) => {
  if (!req.body.travelerId || !req.body.email) {
    res.status(400).json({ error: "travelerId and email are required" });
    return;
  }

  let member = members.find((item) => item.travelerId === req.body.travelerId);
  if (!member) {
    member = {
      travelerId: req.body.travelerId,
      email: req.body.email,
      tier: req.body.tier || "bronze",
      points: 0
    };
    members.push(member);
  }

  res.status(201).json({ member });
});

app.post("/loyalty/earn", async (req, res, next) => {
  try {
    if (!req.body.travelerId || !req.body.paymentId) {
      res.status(400).json({ error: "travelerId and paymentId are required" });
      return;
    }

    const payment = await getPayment(req.body.paymentId);
    let member = members.find((item) => item.travelerId === req.body.travelerId);
    if (!member) {
      member = { travelerId: req.body.travelerId, email: "unknown@example.com", tier: "bronze", points: 0 };
      members.push(member);
    }

    const earned = Math.floor(payment.amount * 10);
    member.points += earned;
    res.json({ member, earned, paymentId: payment.id });
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

