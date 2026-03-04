# API Specification - Bus Route Optimizer

## Overview

This document outlines the planned API endpoints for the Bus Route Optimizer platform. These endpoints form the contract between the frontend application and the backend services.

## Base Configuration

- **Base URL**: `https://api.bus-optimizer.example.com/v1`
- **Authentication**: JWT Bearer tokens (15-min expiry)
- **Rate Limiting**: 1000 requests/min per user
- **Response Format**: JSON
- **Error Handling**: Standard HTTP status codes + error detail objects

## Authentication

All endpoints require a valid JWT token in the `Authorization` header:

```
Authorization: Bearer <jwt_token>
```

### Token Refresh

- Access token TTL: 15 minutes
- Refresh token TTL: 7 days
- Refresh tokens rotated on every use

## Core Endpoints

### 1. Trip Planning

#### Plan Trip
```
POST /trips/plan
```

**Request Body:**
```json
{
  "origin": {
    "lat": 37.7749,
    "lng": -122.4194
  },
  "destination": {
    "lat": 37.3382,
    "lng": -121.8863
  },
  "depart_at": "2026-03-04T08:30:00Z",
  "preferences": {
    "max_walking_distance_meters": 800,
    "max_transfer_count": 2,
    "accessibility_required": false
  }
}
```

**Response (200 OK):**
```json
{
  "trip_id": "trip_abc123",
  "options": [
    {
      "route_id": "route_1",
      "total_duration_minutes": 45,
      "legs": [
        {
          "type": "walking",
          "distance_meters": 350,
          "duration_minutes": 5
        },
        {
          "type": "transit",
          "route": "48",
          "departure": "2026-03-04T08:45:00Z",
          "arrival": "2026-03-04T09:15:00Z"
        }
      ],
      "accessibility_notes": "Wheelchair accessible"
    }
  ]
}
```

### 2. ETA Management

#### Get Current ETA
```
GET /trips/{trip_id}/eta?stop_id={stop_id}
```

**Response (200 OK):**
```json
{
  "eta_id": "eta_xyz789",
  "trip_id": "trip_abc123",
  "stop_id": "stop_12345",
  "scheduled_arrival": "2026-03-04T09:15:00Z",
  "predicted_arrival": "2026-03-04T09:18:00Z",
  "confidence_level": 0.92,
  "delay_minutes": 3,
  "source": "ml_model"
}
```

### 3. Route Alternatives

#### Get Alternative Routes
```
GET /routes/alternatives?origin={origin}&destination={destination}&time={timestamp}
```

**Response (200 OK):**
```json
{
  "origin": "37.7749,-122.4194",
  "destination": "37.3382,-121.8863",
  "requested_time": "2026-03-04T08:30:00Z",
  "alternatives": [
    {
      "rank": 1,
      "total_duration_minutes": 45,
      "transfer_count": 1,
      "walk_distance_meters": 350,
      "score": 0.95
    },
    {
      "rank": 2,
      "total_duration_minutes": 52,
      "transfer_count": 0,
      "walk_distance_meters": 1200,
      "score": 0.87
    }
  ]
}
```

### 4. Alerts Management

#### Get Active Alerts
```
GET /alerts?route_ids={route_id1,route_id2}&active=true
```

**Response (200 OK):**
```json
{
  "alerts": [
    {
      "alert_id": "alert_001",
      "type": "delay",
      "severity": "high",
      "affected_routes": ["48", "49"],
      "message": "Route 48: 10-minute delay due to traffic",
      "start_time": "2026-03-04T08:00:00Z",
      "estimated_end_time": "2026-03-04T09:00:00Z"
    },
    {
      "alert_id": "alert_002",
      "type": "detour",
      "severity": "medium",
      "affected_routes": ["101"],
      "message": "Route 101: Temporary detour via Main St",
      "start_time": "2026-03-04T07:00:00Z"
    }
  ]
}
```

### 5. Stop Information

#### Get Stop Details
```
GET /stops/{stop_id}
```

**Response (200 OK):**
```json
{
  "stop_id": "stop_12345",
  "name": "Market & 3rd",
  "lat": 37.7886,
  "lng": -122.3990,
  "wheelchair_accessible": true,
  "upcoming_departures": [
    {
      "route": "48",
      "destination": "Downtown Station",
      "scheduled_departure": "2026-03-04T09:15:00Z",
      "predicted_departure": "2026-03-04T09:18:00Z"
    }
  ],
  "connections": ["route_48", "route_49", "route_101"]
}
```

### 6. User Preferences

#### Get User Preferences
```
GET /users/me/preferences
```

#### Update User Preferences
```
PUT /users/me/preferences
```

**Request Body:**
```json
{
  "home_stop_id": "stop_home",
  "work_stop_id": "stop_work",
  "accessibility_needs": {
    "wheelchair_required": false,
    "mobility_device": false,
    "visual_impairment": false,
    "hearing_impairment": false
  },
  "locale": "en-US",
  "alert_channels": ["push", "email"],
  "preferred_routes": ["48", "49"]
}
```

**Response (200 OK):**
```json
{
  "user_id": "user_123",
  "preferences": { ... }
}
```

### 7. Vehicle Positions

#### Get Live Vehicle Positions
```
GET /vehicles?route_id={route_id}&limit=50
```

**Response (200 OK):**
```json
{
  "route_id": "route_48",
  "vehicles": [
    {
      "vehicle_id": "bus_001",
      "lat": 37.7886,
      "lng": -122.3990,
      "heading": 45,
      "speed_kmh": 25,
      "timestamp": "2026-03-04T08:45:30Z",
      "next_stop": "stop_12345"
    }
  ]
}
```

## WebSocket Connections

### Real-Time Updates

**Endpoint**: `wss://api.bus-optimizer.example.com/ws`

**Subscribe to trip updates:**
```json
{
  "type": "subscribe",
  "trip_id": "trip_abc123",
  "channels": ["eta", "alerts"]
}
```

**Receive update:**
```json
{
  "type": "update",
  "channel": "eta",
  "data": {
    "trip_id": "trip_abc123",
    "eta_id": "eta_xyz789",
    "predicted_arrival": "2026-03-04T09:18:00Z"
  }
}
```

## Error Handling

### Error Response Format
```json
{
  "error": {
    "code": "INVALID_REQUEST",
    "message": "Origin coordinates are required",
    "details": {
      "field": "origin",
      "reason": "missing_required_field"
    }
  }
}
```

### Common Error Codes
- `INVALID_REQUEST` (400): Malformed request
- `UNAUTHORIZED` (401): Missing/invalid authentication
- `FORBIDDEN` (403): Insufficient permissions
- `NOT_FOUND` (404): Resource not found
- `RATE_LIMITED` (429): Too many requests
- `SERVER_ERROR` (500): Internal server error

## Rate Limiting

- **Standard**: 1000 requests/min per user
- **Premium**: 5000 requests/min per user
- **Headers**:
  ```
  X-RateLimit-Limit: 1000
  X-RateLimit-Remaining: 950
  X-RateLimit-Reset: 1678019700
  ```

## Versioning

APIs are versioned via URL path (`/v1`, `/v2`, etc.). Breaking changes increment major version.

## Pagination

List endpoints support pagination:
```
GET /alerts?page=1&page_size=20
```

Response includes:
```json
{
  "data": [...],
  "pagination": {
    "page": 1,
    "page_size": 20,
    "total_count": 150,
    "total_pages": 8
  }
}
```

## Performance Targets

| Endpoint | P50 | P95 | P99 |
|----------|-----|-----|-----|
| /trips/plan | <200ms | <500ms | <800ms |
| /routes/alternatives | <150ms | <400ms | <700ms |
| /alerts | <100ms | <250ms | <500ms |
| /stops/{id} | <50ms | <150ms | <300ms |

---

**API Version**: 1.0  
**Last Updated**: March 2026  
**Status**: Draft (Subject to change during MVP development)
