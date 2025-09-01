import json
import math

# Load ALOHA data
with open('/Users/missioncontrol/LEOS-RO/frontend/data/aloha.json', 'r') as f:
    data = json.load(f)

trajectory = data['trajectory']
print(f"Total data points: {len(trajectory)}")
print(f"Time range: {trajectory[0][0]}s to {trajectory[-1][0]}s")
print(f"Time step: {trajectory[1][0] - trajectory[0][0]}s\n")

# Analyze velocity between consecutive points
print("VELOCITY ANALYSIS:")
print("Time(s) | Distance(km) | Velocity(km/s) | Altitude(km)")
print("-" * 60)

for i in range(0, len(trajectory)-1, 20):  # Sample every 20 points
    t1, x1, y1, z1 = trajectory[i]
    t2, x2, y2, z2 = trajectory[i+1]
    
    # Calculate distance between points
    dx = x2 - x1
    dy = y2 - y1
    dz = z2 - z1
    distance = math.sqrt(dx*dx + dy*dy + dz*dz)
    
    # Calculate velocity
    dt = t2 - t1
    velocity = distance / dt if dt > 0 else 0
    
    # Calculate altitude
    r = math.sqrt(x1*x1 + y1*y1 + z1*z1)
    altitude = r - 6371
    
    print(f"{t1:6.0f} | {distance:12.6f} | {velocity:14.6f} | {altitude:12.1f}")

# Check if this might be multiple trajectories spliced together
print("\n\nCHECKING FOR DISCONTINUITIES:")
for i in range(len(trajectory)-1):
    t1, x1, y1, z1 = trajectory[i]
    t2, x2, y2, z2 = trajectory[i+1]
    
    dx = x2 - x1
    dy = y2 - y1
    dz = z2 - z1
    distance = math.sqrt(dx*dx + dy*dy + dz*dz)
    velocity = distance / (t2 - t1) if (t2 - t1) > 0 else 0
    
    # Flag suspicious jumps (> 100 km/s would be insane)
    if velocity > 100:
        print(f"HUGE JUMP at t={t1}s: {velocity:.1f} km/s!")
        
# Analyze if this could be different phases
print("\n\nPOSSIBLE INTERPRETATION:")
print("1. This might be ORBITAL data, not ballistic")
print("2. The coordinates might be in a rotating reference frame")
print("3. This could be multiple trajectory segments spliced together")
print("4. The data might be synthetic/simulated with unrealistic physics")
