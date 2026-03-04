# Architecture Document

## Bus Route Optimizer - System Design

### Overview

The Bus Route Optimizer is a cloud-native, microservices-based platform designed to provide real-time route planning and transit optimization for commuters.

## 1. High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    User Interface Layer                          │
│  (React Web + React Native Mobile + PWA)                         │
└──────────────────────────┬──────────────────────────────────────┘
                           │ HTTPS/WebSocket
┌──────────────────────────▼──────────────────────────────────────┐
│                    API Gateway Layer                             │
│  Kong / AWS API Gateway · JWT/OAuth 2.0 · Rate Limiting         │
└──────────────────────────┬──────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐ ┌──────▼──────┐ ┌────────▼────────┐
│ Route Planning │ │  User       │ │ Alert           │
│ Service        │ │  Service    │ │ Service         │
│ (Python/FastAPI)│ │ (Node.js)   │ │ (Node.js)       │
└────────┬────────┘ └──────┬──────┘ └────────┬────────┘
         │                 │                  │
         └─────────────────┼──────────────────┘
                           │
┌───────────────────────────▼────────────────────────────────────┐
│         Message Queue & Event Streaming Layer                  │
│              Apache Kafka Cluster                              │
│  Topics: vehicle-positions, delays, incidents, eta-updates    │
└───────────────────────────┬────────────────────────────────────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
┌───────▼────────┐ ┌──────▼──────┐ ┌────────▼────────┐
│  PostgreSQL +  │ │  Redis      │ │ InfluxDB        │
│  PostGIS       │ │  Cluster    │ │ (Time-Series)   │
│                │ │  (Cache)    │ │                 │
└────────┬────────┘ └──────┬──────┘ └────────┬────────┘
         │                 │                  │
         └─────────────────┼──────────────────┘
                           │
          ┌────────────────┼────────────────┐
          │                │                │
      ┌───▼───┐      ┌────▼─────┐    ┌────▼────┐
      │ S3    │      │ Backups  │    │ Logs    │
      │       │      │          │    │         │
      └───────┘      └──────────┘    └─────────┘
```

## 2. Five-Layer Architecture

### Layer 1: User Interface
- **Frontend**: React 18 with TypeScript
- **Mobile**: React Native + PWA capabilities
- **Map Integration**: Mapbox GL JS
- **Responsibilities**:
  - Trip input & origin/destination entry
  - Interactive map display
  - Real-time ETA visualization
  - Alert notifications
  - User preferences management

### Layer 2: API Gateway
- **Technology**: Kong or AWS API Gateway
- **Responsibilities**:
  - Authentication (JWT/OAuth 2.0)
  - Rate limiting (1000 req/min per user)
  - Request routing to microservices
  - API versioning
  - Request/response logging
  - DDoS protection

### Layer 3: Route Planning Engine
- **Primary Service**: Python FastAPI
- **Components**:
  - **Graph Engine**: NetworkX + pgRouting
  - **ETA Model**: Machine Learning ensemble
  - **Real-time Updater**: Kafka consumer
  - **Algorithms**: A* / Dijkstra pathfinding

- **Responsibilities**:
  - Compute optimal routes
  - Calculate ETAs with confidence bands
  - Generate alternative routes
  - Update graph weights in real-time

### Layer 4: Integration Layer
- **GTFS Ingestor**:
  - Nightly GTFS-Static refresh
  - Schema validation
  - 15-second GTFS-RT polling
  
- **Adapters**:
  - Traffic Data: HERE / Google Traffic
  - Weather: OpenWeatherMap
  - Incidents: Waze / Bing webhooks
  
- **Message Broker**: Apache Kafka
  - Publishes normalized events
  - 15-30 second cadence

### Layer 5: Data Layer
- **Relational**: PostgreSQL 16 + PostGIS
  - GTFS data (routes, stops, trips)
  - User profiles & preferences
  - Trip history
  
- **Cache**: Redis Cluster
  - ETA cache (TTL 30s)
  - Session storage
  - Feed health status
  
- **Time-Series**: InfluxDB 2
  - ETA telemetry
  - Performance metrics
  - Vehicle position history
  
- **Object Storage**: AWS S3
  - Map tiles
  - Backups
  - Static assets

## 3. Microservices Detail

### Route Planning Service
```
┌─────────────────────────────────┐
│ Route Planning Service          │
│ (Python FastAPI)                │
├─────────────────────────────────┤
│ • Trip Planning                 │
│ • ETA Prediction                │
│ • Alternative Route Generation  │
│ • Real-time Graph Updates       │
├─────────────────────────────────┤
│ Dependencies:                    │
│ - PostgreSQL + PostGIS          │
│ - Redis (Route cache)           │
│ - Kafka Consumer                │
│ - NetworkX Library              │
│ - ML Models (TensorFlow)        │
└─────────────────────────────────┘
```

**Key Endpoints**:
- `POST /trips/plan` - Trip planning
- `GET /trips/{id}/eta` - Get ETA
- `GET /routes/alternatives` - Alternative routes
- `GET /health` - Service health check

### User Service
```
┌─────────────────────────────────┐
│ User Service (Node.js)          │
├─────────────────────────────────┤
│ • User Profiles                 │
│ • Authentication                │
│ • Preferences Management        │
│ • Saved Trips & Routes          │
├─────────────────────────────────┤
│ Dependencies:                    │
│ - PostgreSQL                    │
│ - Redis (Session cache)         │
│ - Auth0 / AWS Cognito           │
└─────────────────────────────────┘
```

### Alert Service
```
┌─────────────────────────────────┐
│ Alert Service (Node.js)         │
├─────────────────────────────────┤
│ • Alert Aggregation & Routing   │
│ • Push Notifications            │
│ • Email/SMS Delivery            │
│ • Alert Persistence             │
├─────────────────────────────────┤
│ Dependencies:                    │
│ - PostgreSQL                    │
│ - Kafka Consumer                │
│ - Firebase Cloud Messaging      │
│ - SendGrid / AWS SNS            │
└─────────────────────────────────┘
```

## 4. Data Flow

### Real-Time Trip Planning Flow

```
User Input
    │
    ▼
┌─────────────────────────────────┐
│ 1. API Gateway                  │
│    Auth + Rate Limit Check      │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 2. Route Planning Service       │
│    • Check Redis Cache (30s TTL)│
│    • Cache HIT: Return cached   │
│    • Cache MISS: Continue       │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 3. Graph Engine                 │
│    • Load live graph from       │
│      PostgreSQL + PostGIS       │
│    • Apply traffic weights      │
│    • Run A* / Dijkstra          │
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 4. ETA Model                    │
│    • ML ensemble prediction     │
│    • Confidence band calculation│
└────────────┬────────────────────┘
             │
             ▼
┌─────────────────────────────────┐
│ 5. Cache & Respond              │
│    • Store in Redis (30s)       │
│    • Return to API Gateway      │
│    • Push to Frontend (WebSocket)│
└─────────────────────────────────┘
```

## 5. Technology Stack Summary

| Component | Technology | Rationale |
|-----------|-----------|-----------|
| **Language (Backend)** | Python 3.11 + Node.js 18 | ML/routing + high-throughput |
| **Framework** | FastAPI + Express | Async performance + ecosystem |
| **Frontend** | React 18 + TypeScript | Type safety + component reuse |
| **Mobile** | React Native | Code sharing across platforms |
| **Maps** | Mapbox GL JS | Enterprise-grade vector tiles |
| **Database (Relational)** | PostgreSQL 16 + PostGIS | Spatial queries + ACID |
| **Cache** | Redis Cluster | Sub-ms ETA lookups |
| **Time-Series** | InfluxDB 2 | Performance telemetry |
| **Message Queue** | Apache Kafka | Event streaming, scalability |
| **Graph Algorithms** | NetworkX, pgRouting | Routing computation |
| **ML Framework** | TensorFlow / PyTorch | ETA prediction |
| **Auth** | Auth0 / AWS Cognito | Managed identity, social login |
| **Container** | Docker + Kubernetes | Container orchestration |
| **Infrastructure** | AWS (EKS, RDS, ElastiCache) | Managed cloud services |
| **CI/CD** | GitHub Actions + ArgoCD | GitOps pipeline |
| **IaC** | Terraform | Repeatable infrastructure |
| **Observability** | Datadog + Grafana | Tracing, metrics, dashboards |
| **Alerting** | PagerDuty | Incident response |

## 6. Deployment Architecture

### Kubernetes Clusters

```
┌─────────────────────────────────┐
│ Development Cluster             │
│ (Single-AZ, cost-optimized)     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Staging Cluster                 │
│ (Multi-AZ, production-like)     │
└─────────────────────────────────┘

┌─────────────────────────────────┐
│ Production Cluster (Multi-Region)
│ • Primary: us-west-2            │
│ • DR: us-east-1                 │
│ • Geo-replicated databases      │
└─────────────────────────────────┘
```

### Blue/Green Deployment

```
Production Load Balancer
         │
    ┌────┴────┐
    │          │
┌───▼──┐   ┌──▼───┐
│ Blue │   │Green │
│(v1.0)│   │(v1.1)│
└──────┘   └──────┘
    │          │
    └────┬─────┘
         │
      Rollback if needed
```

## 7. Scaling Strategy

### Horizontal Scaling
- **Route Planning**: Scales on CPU >70%
- **API Gateway**: Auto-scales on request rate
- **Kafka**: Partition rebalancing
- **Redis**: Cluster mode for high throughput

### Caching Strategy
- Redis absorbs ~95% of repeated ETA queries
- 30-second cache TTL for route results
- Cache invalidation on GTFS-RT updates

### Database Scaling
- Read replicas for reporting queries
- Connection pooling (PgBouncer)
- Query optimization via PostGIS indices

## 8. Security Architecture

```
┌─────────────────────────────────┐
│ TLS 1.3 Termination (API GW)    │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ JWT Authentication              │
│ (15-min expiry, refresh rotation)│
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ Authorization (RBAC)            │
│ (User, Admin, Service roles)    │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ Input Validation & Sanitization │
│ (SQL Injection, XSS protection) │
└──────────────┬──────────────────┘
               │
┌──────────────▼──────────────────┐
│ Data Encryption at Rest         │
│ (AES-256 for PII)               │
└─────────────────────────────────┘
```

## 9. Disaster Recovery

- **RTO (Recovery Time Objective)**: <1 hour
- **RPO (Recovery Point Objective)**: <5 minutes
- **Backup Strategy**: Nightly snapshots + automated replication
- **Failover**: Automatic promotion of standby replicas
- **Testing**: Quarterly DR drills

## 10. Monitoring & Observability

### Key Metrics
- **Response Times**: P50, P95, P99 latencies
- **ETA Accuracy**: MAE (Mean Absolute Error)
- **Cache Hit Rate**: Redis cache efficiency
- **Kafka Lag**: Message processing delay
- **Database Connections**: Connection pool usage

### Dashboards
- **Operational**: API response times, error rates, uptime
- **Business**: Daily active users, trips planned, NPS
- **Technical**: CPU/memory usage, network throughput

### Alerting
- SLA breach: P99 >1 second
- Error rate >1% for 5 minutes
- Kafka lag >30 seconds
- Database connection pool >80%

---

**Document Version**: 1.0  
**Last Updated**: March 2026  
**Status**: Draft (Subject to refinement during Phase 0)
