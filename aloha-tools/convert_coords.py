import math

def teme_to_latlon(x, y, z):
    """Convert TEME coordinates (km) to lat/lon"""
    # Calculate radius
    r = math.sqrt(x*x + y*y + z*z)
    
    # Calculate latitude (radians)
    lat_rad = math.asin(z / r)
    
    # Calculate longitude (radians)
    lon_rad = math.atan2(y, x)
    
    # Convert to degrees
    lat_deg = math.degrees(lat_rad)
    lon_deg = math.degrees(lon_rad)
    
    # Calculate altitude above Earth surface (km)
    earth_radius_km = 6371
    altitude = r - earth_radius_km
    
    return lat_deg, lon_deg, altitude, r

# Start point (t=0)
x1, y1, z1 = -4447.605376524286, 2161.7024042435905, -4014.7098604950215
lat1, lon1, alt1, r1 = teme_to_latlon(x1, y1, z1)

# End point (t=206s)
x2, y2, z2 = -1381.4990786784458, -6502.718132547335, -1332.3016135528167
lat2, lon2, alt2, r2 = teme_to_latlon(x2, y2, z2)

print(f"START POINT (t=0s):")
print(f"  TEME: ({x1:.1f}, {y1:.1f}, {z1:.1f}) km")
print(f"  Latitude: {lat1:.2f}°")
print(f"  Longitude: {lon1:.2f}°")
print(f"  Altitude: {alt1:.1f} km")
print(f"  Distance from Earth center: {r1:.1f} km")

print(f"\nEND POINT (t=206s):")
print(f"  TEME: ({x2:.1f}, {y2:.1f}, {z2:.1f}) km")
print(f"  Latitude: {lat2:.2f}°")
print(f"  Longitude: {lon2:.2f}°")
print(f"  Altitude: {alt2:.1f} km")
print(f"  Distance from Earth center: {r2:.1f} km")

# Calculate approximate ground distance
# Using haversine formula
lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)

dlat = lat2_rad - lat1_rad
dlon = lon2_rad - lon1_rad

a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
c = 2 * math.asin(math.sqrt(a))
ground_distance = 6371 * c

print(f"\nTRAJECTORY SUMMARY:")
print(f"  Ground distance: {ground_distance:.0f} km")
print(f"  Duration: 206 seconds")
print(f"  Average ground speed: {ground_distance/206:.1f} km/s ({ground_distance/206*3600:.0f} km/h)")
print(f"  Altitude change: {alt2-alt1:.1f} km")
