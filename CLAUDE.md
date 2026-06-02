# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Wigell Rental — a car rental booking system for Wigellkoncernen. The repo contains a single Spring Boot module (`carRentalBackend/`) that serves both the REST API and the static SPA frontend.

## Commands

All Maven commands run from inside `carRentalBackend/`:

```bash
# Start the application (requires MySQL running on port 3306)
cd carRentalBackend && mvn spring-boot:run

# Build JAR
cd carRentalBackend && mvn package

# Run tests
cd carRentalBackend && mvn test

# Run a single test class
cd carRentalBackend && mvn test -Dtest=ClassName
```

The frontend can also be served via VS Code Live Server at `http://127.0.0.1:5500` (already whitelisted in CORS config) pointing at `carRentalBackend/src/main/resources/static/`.

## Database

MySQL on `localhost:3306`, schema `rental`, credentials `root`/`root` (see `application.properties`). Hibernate generates DDL on startup. Seed data is in `src/main/resources/data.sql`. Table/column names must not be changed per assignment rules; data values may be modified freely.

## Architecture

```
carRentalBackend/src/main/java/com/wigell/
  config/SecurityConfig.java       — HTTP Basic Auth, CORS, method security
  controllers/                     — REST layer (@RestController)
  services/                        — Business logic (@Service, @Transactional)
  dao/                             — JPA repositories (extend JpaRepository)
  entities/                        — JPA entities (Car, User, Booking)
  dto/BookingDTO.java              — Projection used when returning bookings via UserService

carRentalBackend/src/main/resources/static/
  index.html / script.js / style.css  — Vanilla JS SPA (no frameworks)
```

### Backend layers

- **Controllers** delegate everything to services; error translation (IllegalArgumentException → 404) happens in the controller.
- **Services** own all business rules: `BookingService.orderCar` atomically marks the car as booked and increments `user.noOfOrders`; `deleteBookingById` decrements it. `UserService.addUser` BCrypt-encodes the password before saving.
- **`User` implements `UserDetails`** — Spring Security loads it directly from `UserRepo.findByUsername`. The `role` field stores the full authority string (`ROLE_USER` or `ROLE_ADMIN`).
- **`Car.image`** is a `LONGBLOB` fetched lazily; images are uploaded as multipart form-data to `POST /api/v1/cars`.

### Security rules (SecurityConfig)

| Endpoint | Access |
|---|---|
| `GET /api/v1/cars`, `POST /api/v1/auth/login`, `POST /api/v1/users`, `GET /api/v1/bookings/**` | Public |
| `POST/PUT/DELETE /api/v1/cars/**` | `ROLE_ADMIN` |
| `GET /api/v1/users` | `ROLE_ADMIN` |
| `GET/PUT /api/v1/users/{id}` | Own id or `ROLE_ADMIN` (via `@PreAuthorize`) |
| `POST /api/v1/bookings` | `ROLE_USER` |
| `PUT/DELETE /api/v1/bookings/{id}` | Booking owner or `ROLE_ADMIN` (SpEL expression on `BookingService.getBookingById`) |

CSRF is disabled. HTTP Basic credentials are sent with every API call from the SPA.

### Frontend SPA (script.js)

Single global `state` object holds all runtime data: `currentUser`, `credentials` (Base64 for Basic Auth header), `cars[]`, `bookings[]`, sort keys, etc. Pages are rendered into `#main-content` by JS functions triggered on hash changes. Ads are injected every 5th card using the `ADS` constant array. `sortData(arr, key, desc)` and `toggleSortState(...)` are shared helpers used by all sortable tables/galleries.

## Dev credentials

| Role | Username | Password |
|---|---|---|
| User | `user` | `user` |
| Admin | `admin` | `admin` |

## Assignment constraints (Assignment.md)

- No JS frameworks (VG requirement) — pure HTML/CSS/JavaScript only.
- WCAG AA on all pages; at least one page must meet WCAG AAA.
- `data.sql` content may be changed; table/column names must not be.
- Backend modifications require approval from "koncernens VD".
