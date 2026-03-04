import math
import heapq

class Stop:
    """Represents a physical bus stop with geographic coordinates."""
    def __init__(self, stop_id, name, latitude, longitude):
        self.stop_id = stop_id
        self.name = name
        self.latitude = latitude
        self.longitude = longitude
        
    def __repr__(self):
        return f"Stop(id={self.stop_id}, name='{self.name}')"

    def distance_to(self, other_stop):
        """Heuristic: Straight-line distance between stops (Euclidean approximation)."""
        return math.sqrt(
            (self.latitude - other_stop.latitude)**2 + 
            (self.longitude - other_stop.longitude)**2
        )

class Route:
    """Represents a bus route consisting of an ordered list of stops."""
    def __init__(self, route_id, list_of_stops, total_distance=0.0):
        self.route_id = route_id
        self.list_of_stops = list_of_stops
        self.total_distance = total_distance
        
    def get_intermediate_stops(self):
        """Returns all stops between the start and end of the route."""
        if len(self.list_of_stops) <= 2:
            return []
        return self.list_of_stops[1:-1]
        
    def __repr__(self):
        return f"Route(id={self.route_id}, stops={len(self.list_of_stops)}, dist={self.total_distance})"

class Graph:
    """Adjacency list representation of the bus network using Stop objects."""
    def __init__(self):
        self.adj_list = {} # stop_id -> [(neighbor_stop_id, distance), ...]
        self.stops = {}    # stop_id -> Stop object
        
    def add_stop(self, stop):
        """Adds a Stop object to the graph."""
        if stop.stop_id not in self.adj_list:
            self.adj_list[stop.stop_id] = []
            self.stops[stop.stop_id] = stop
            
    def add_edge(self, stop_a, stop_b, distance):
        """Adds an edge between two Stop objects."""
        self.add_stop(stop_a)
        self.add_stop(stop_b)
        
        # Prevent duplicates
        if not any(n == stop_b.stop_id for n, d in self.adj_list[stop_a.stop_id]):
            self.adj_list[stop_a.stop_id].append((stop_b.stop_id, distance))

    def add_route(self, route, distances=None):
        """Builds edges dynamically from a Route object."""
        stops = route.list_of_stops
        for i in range(len(stops) - 1):
            stop_a = stops[i]
            stop_b = stops[i+1]
            dist = distances[i] if distances and i < len(distances) else 1
            self.add_edge(stop_a, stop_b, dist)
            self.add_edge(stop_b, stop_a, dist) # Undirected for simplicity

    def a_star_search(self, start_id, goal_id):
        """A* Algorithm using Stop objects for heuristic calculations."""
        if start_id not in self.stops or goal_id not in self.stops:
            return None

        start_stop = self.stops[start_id]
        goal_stop = self.stops[goal_id]

        open_set = []
        heapq.heappush(open_set, (0, start_id))
        
        came_from = {}
        g_score = {stop_id: float('inf') for stop_id in self.stops}
        g_score[start_id] = 0
        
        f_score = {stop_id: float('inf') for stop_id in self.stops}
        f_score[start_id] = start_stop.distance_to(goal_stop)

        while open_set:
            _, current_id = heapq.heappop(open_set)

            if current_id == goal_id:
                return self._reconstruct_path(came_from, current_id)

            for neighbor_id, weight in self.adj_list[current_id]:
                tentative_g_score = g_score[current_id] + weight
                
                if tentative_g_score < g_score[neighbor_id]:
                    came_from[neighbor_id] = current_id
                    g_score[neighbor_id] = tentative_g_score
                    f_score[neighbor_id] = tentative_g_score + self.stops[neighbor_id].distance_to(goal_stop)
                    
                    if not any(neighbor_id == item[1] for item in open_set):
                        heapq.heappush(open_set, (f_score[neighbor_id], neighbor_id))

        return None

    def _reconstruct_path(self, came_from, current):
        path = [current]
        while current in came_from:
            current = came_from[current]
            path.append(current)
        return path[::-1]

    def display(self):
        print("graph = {")
        for stop, neighbors in self.adj_list.items():
            print(f"  \"{stop}\": {neighbors},")
        print("}")

if __name__ == "__main__":
    # 1. Create Stop objects
    stop_A = Stop("S1", "Central Station", 13.0827, 80.2707)
    stop_B = Stop("S2", "Egmore", 13.0785, 80.2608)
    stop_C = Stop("S3", "Mount Road", 13.0604, 80.2618)
    stop_D = Stop("S4", "T Nagar", 13.0405, 80.2337)
    
    # 2. Build Graph from Routes
    bus_network = Graph()
    route_1 = Route("R1", [stop_A, stop_B, stop_D])
    bus_network.add_route(route_1, distances=[5, 3])
    bus_network.add_edge(stop_A, stop_C, 10) # Manual connection
    
    # 3. Running the Code (A* Search)
    print("--- Bus Network Graph ---")
    bus_network.display()
    
    start, goal = "S1", "S4"
    print(f"\nRunning A* Search from {start} to {goal}...")
    path = bus_network.a_star_search(start, goal)
    
    if path:
        print(f"Optimal Path Found: {' -> '.join(path)}")
        stops_in_path = [bus_network.stops[sid].name for sid in path]
        print(f"Stations: {' -> '.join(stops_in_path)}")
    else:
        print("No path found.")
