# Architecture

`travel-booking-platform` is a microservices architecture repository. Every service is independently deployable, owns its in-memory data model, exposes HTTP/JSON endpoints, and talks to other services through RESTful APIs.

## Boundary

The booking repo owns customer-facing capabilities:

| Capability | Service |
| --- | --- |
| API composition | `api-gateway` |
| Traveler profiles | `traveler-service` |
| Itinerary documents | `itinerary-service` |
| Traveler messages | `notification-service` |
| Loyalty account state | `loyalty-service` |

The operations repo owns package inventory, reservations, payments, and ticket fulfillment. Booking services never import code from operations services; they call operations endpoints using configured service URLs.

## Main Flow

1. `api-gateway` receives `POST /trip-bookings`.
2. `api-gateway` calls `traveler-service` for traveler details.
3. `api-gateway` calls `travel-operations-platform/reservation-service` to reserve a package.
4. `reservation-service` calls back into `traveler-service` and `loyalty-service`.
5. `api-gateway` calls `itinerary-service`, which verifies the reservation through `reservation-service`.
6. `api-gateway` calls `travel-operations-platform/fulfillment-service`.
7. `fulfillment-service` calls `notification-service` to record the traveler notification.

## REST Contracts

All APIs use JSON request and response bodies. Errors return JSON with an `error` field and an appropriate 4xx or 5xx status.

Important endpoints:

| Service | Endpoint |
| --- | --- |
| `api-gateway` | `POST /trip-bookings` |
| `traveler-service` | `GET /travelers/:id`, `POST /travelers` |
| `itinerary-service` | `GET /itineraries/:id`, `POST /itineraries` |
| `notification-service` | `POST /notifications` |
| `loyalty-service` | `POST /loyalty/enroll`, `POST /loyalty/earn` |

