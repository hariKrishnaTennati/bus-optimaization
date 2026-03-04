# 🚌 Bus Route Optimizer & Live Journey Tracker

A modern, interactive React web application designed to help commuters find the most optimal bus routes, select their origins and destinations directly from an interactive map, and seamlessly track their journey in real-time.

Currently configured for major locations and transit routes across **Chennai**.

## ✨ Features

- **🗺️ Interactive Map Selection:** 
  Powered by Leaflet and OpenStreetMap, users can click on dynamic map markers representing major hubs (Chennai Central, T Nagar, Velachery, etc.) to set their `From` and `To` destinations instantly without needing a dropdown menu.
- **🛣️ Realistic Route Tracing:** 
  Utilizes the OSRM (Open Source Routing Machine) API to trace real-world, road-following polylines between locations instead of just drawing straight lines.
- **📍 Intermediate Stops:** 
  Every bus route displays a detailed, vertical timeline of intermediate stops along the way. Commuters can expand the "View Stops" section to know exactly where the bus will halt.
- **🚀 Live Journey Tracking:** 
  Click "Start Journey" on any route card to simulate transit. An animated progress bar tracks covered distance, remaining distance, and ETA in real-time.
- **💾 Persistent State:** 
  Journey progress is continually saved to `localStorage`, meaning if you accidentally close the tab or refresh the page, your journey tracking will resume exactly where it left off!
- **📊 Traffic Congestion Metrics:** 
  Visual indicators for route traffic status (Free, Moderate, or Congested).

## 🛠️ Technology Stack

- **Framework:** React 18
- **Map Library:** `react-leaflet` (v4.2.1) & Leaflet (v1.9.4)
- **Routing Engine:** OSRM Free API
- **State Management:** React Hooks (`useState`, `useEffect`, `useCallback`) & `localStorage`
- **Styling:** Inline CSS with glassmorphism, responsive grids, and modern UI/UX design paradigms.

## 🚀 Getting Started

Ensure you have Node.js installed.

1. Clone or download the repository.
2. Install the necessary dependencies (we intentionally downgraded `react-leaflet` for React 18 compatibility):
   ```bash
   npm install leaflet react-leaflet@4.2.1
   ```
3. Start the development server:
   ```bash
   npm start
   ```
4. Open the application in your browser at `http://localhost:3000` (or whichever port the terminal specifies).

## 🏙️ Current Chennai Data

The bus route configurations currently simulate real major routes in Chennai, including:
- **Major Hubs:** Chennai Central, Egmore, T Nagar, Velachery, Tambaram, Adyar, Guindy, Koyambedu (CMBT), and more.
- **Routes:** Real-world examples like `21G`, `19B`, `70G`, `M70`, and `154`.

*(To expand or modify the areas and routes, you simply need to update the `LOCATIONS` and `ALL_ROUTES` arrays located at the top of `src/App.js`.)*

## 📝 License

This project was built as an optimization kickoff plan. Feel free to modify and expand the codebase as needed!
