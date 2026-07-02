# Travel Booking Platform

Customer-facing travel booking system implemented as a microservices architecture.

This repository is designed to work with the sibling `travel-operations-platform` repository. Services communicate only through RESTful APIs, including cross-repository calls.

## Services

| Service | Language | Port | Responsibility |
| --- | --- | ---: | --- |
| `api-gateway` | JavaScript | 5200 | Public booking entrypoint and trip booking orchestration |
| `traveler-service` | JavaScript | 5201 | Traveler profiles and loyalty enrollment |
| `itinerary-service` | Python | 5202 | Itinerary creation and reservation verification |
| `notification-service` | Python | 5203 | Email/push notification records |
| `loyalty-service` | JavaScript | 5204 | Loyalty enrollment and points earning |

## REST Dependency Map

Same-repo dependencies:

| Caller | REST dependency |
| --- | --- |
| `api-gateway` | `traveler-service`, `itinerary-service`, `notification-service`, `loyalty-service` |
| `traveler-service` | `loyalty-service` |
| `itinerary-service` | `traveler-service` |
| `notification-service` | `itinerary-service` |

Cross-repo dependencies on `travel-operations-platform`:

| Caller | REST dependency |
| --- | --- |
| `api-gateway` | `reservation-service`, `fulfillment-service` |
| `itinerary-service` | `reservation-service` |
| `notification-service` | `fulfillment-service` |
| `loyalty-service` | `payment-service` |

## Run

Start this repository:

```bash
docker compose up --build
```

Start `travel-operations-platform` in another terminal so cross-repo REST calls resolve.

Create an end-to-end booking after both repos are running:

```bash
curl -X POST http://localhost:5200/trip-bookings \
  -H "Content-Type: application/json" \
  -d '{"travelerId":"traveler-1","packageId":"pkg-cairo-weekend","paymentMethod":"card"}'
```

## Health Checks

```bash
curl http://localhost:5200/health
curl http://localhost:5201/health
curl http://localhost:5202/health
curl http://localhost:5203/health
curl http://localhost:5204/health
```

