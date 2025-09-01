import math

def teme_to_latlon(x, y, z):
    """Convert TEME coordinates (km) to lat/lon"""
    r = math.sqrt(x*x + y*y + z*z)
    lat_rad = math.asin(z / r)
    lon_rad = math.atan2(y, x)
    lat_deg = math.degrees(lat_rad)
    lon_deg = math.degrees(lon_rad)
    earth_radius_km = 6371
    altitude = r - earth_radius_km
    return lat_deg, lon_deg, altitude, r

# ALOHA Start point (t=0)
x1, y1, z1 = 4075.848976918452, 4327.987341137066, 2302.3743628560533
lat1, lon1, alt1, r1 = teme_to_latlon(x1, y1, z1)

# ALOHA End point (t=206s)
x2, y2, z2 = -4329.7005674110715, 1412.7882591963105, 5007.889207706007
lat2, lon2, alt2, r2 = teme_to_latlon(x2, y2, z2)

print(f"ALOHA START POINT (t=0s):")
print(f"  Latitude: {lat1:.2f}°")
print(f"  Longitude: {lon1:.2f}°")
print(f"  Altitude: {alt1:.1f} km")

# Approximate location
if 15 <= lat1 <= 30 and 35 <= lon1 <= 55:
    print(f"  Location: Middle East region")
elif 20 <= lat1 <= 25 and 45 <= lon1 <= 50:
    print(f"  Location: Saudi Arabia region")

print(f"\nALOHA END POINT (t=206s):")
print(f"  Latitude: {lat2:.2f}°")
print(f"  Longitude: {lon2:.2f}°")
print(f"  Altitude: {alt2:.1f} km")

# Approximate location
if 30 <= lat2 <= 50 and 120 <= lon2 <= 150:
    print(f"  Location: East Asia/Pacific region")
elif 35 <= lat2 <= 45 and 135 <= lon2 <= 145:
    print(f"  Location: Japan region")

# Calculate ground distance
lat1_rad, lon1_rad = math.radians(lat1), math.radians(lon1)
lat2_rad, lon2_rad = math.radians(lat2), math.radians(lon2)
dlat = lat2_rad - lat1_rad
dlon = lon2_rad - lon1_rad
a = math.sin(dlat/2)**2 + math.cos(lat1_rad) * math.cos(lat2_rad) * math.sin(dlon/2)**2
c = 2 * math.asin(math.sqrt(a))
ground_distance = 6371 * c

print(f"\nTRAJECTORY:")
print(f"  Ground distance: {ground_distance:.0f} km")
print(f"  Altitude gain: {alt2-alt1:.1f} km")
print(f"  Duration: 206 seconds")
print(f"  Average ground speed: {ground_distance/206:.1f} km/s")
