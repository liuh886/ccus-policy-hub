import pandas as pd
import json
import re
import random
import os

# --- 1. CONFIGURATION & DATA LOADING ---
EXCEL_PATH = 'docs/IEA CCUS Projects Database 2025.xlsx'
JSON_PATH = 'src/data/facility_database.json'

# Load Excel
print(f"Loading IEA Data from {EXCEL_PATH}...")
try:
    df = pd.read_excel(EXCEL_PATH, sheet_name='CCUS Projects Database')
except Exception as e:
    print(f"Error loading Excel: {e}")
    exit(1)

# Load JSON
print(f"Loading Facility DB from {JSON_PATH}...")
with open(JSON_PATH, 'r', encoding='utf-8') as f:
    facility_db = json.load(f)

# --- 2. GEO ATLAS (Expanded) ---
# Format: "Key": [Lat, Lng]
GEO_ATLAS = {
    # US States & Cities
    'Texas': [31.96, -99.90], 'TX': [31.96, -99.90], 'Houston': [29.76, -95.36], 'Corpus Christi': [27.80, -97.39], 'Midland': [31.99, -102.07], 'Bayou Bend': [29.8, -94.0],
    'Louisiana': [30.98, -91.96], 'LA': [30.98, -91.96], 'New Orleans': [29.95, -90.07], 'Lake Charles': [30.22, -93.21], 'Baton Rouge': [30.45, -91.18],
    'Wyoming': [42.75, -107.30], 'WY': [42.75, -107.30], 'Casper': [42.85, -106.32], 'Gillette': [44.29, -105.50],
    'North Dakota': [47.55, -101.00], 'ND': [47.55, -101.00], 'Beulah': [47.26, -101.77],
    'Illinois': [40.63, -89.39], 'IL': [40.63, -89.39], 'Decatur': [39.84, -88.95],
    'California': [36.77, -119.41], 'CA': [36.77, -119.41], 'Bakersfield': [35.37, -119.01],
    'Alberta': [53.93, -116.57], 'AB': [53.93, -116.57], 'Edmonton': [53.54, -113.49], 'Calgary': [51.04, -114.07], 'Redwater': [53.95, -113.10],
    'Saskatchewan': [52.93, -106.45], 'SK': [52.93, -106.45], 'Weyburn': [49.66, -103.85],
    
    # Europe
    'Norway': [60.47, 8.46], 'Oygarden': [60.56, 4.88], 'Northern Lights': [60.56, 4.88], 'Sleipner': [58.36, 1.91], 'Snohvit': [71.58, 21.01],
    'United Kingdom': [55.37, -3.43], 'UK': [55.37, -3.43], 'Teesside': [54.57, -1.23], 'Humber': [53.68, -0.34], 'St Fergus': [57.58, -1.83], 'Peterhead': [57.50, -1.78],
    'Netherlands': [52.13, 5.29], 'Rotterdam': [51.92, 4.47], 'Porthos': [51.90, 4.27],
    'Denmark': [56.26, 9.50], 'Greensand': [56.0, 4.0],
    
    # China
    'China': [35.86, 104.19], 'Xinjiang': [41.11, 85.29], 'Karamay': [45.59, 84.87], 'Junggar': [44.0, 88.0],
    'Shaanxi': [35.19, 108.87], 'Yulin': [38.29, 109.74], 'Ordos': [39.60, 109.78], 'Inner Mongolia': [44.09, 113.94],
    'Dongying': [37.43, 118.49], 'Shengli': [37.48, 118.49], 'Qilu': [36.81, 118.05],
    'Guangdong': [23.37, 113.76], 'Huizhou': [23.11, 114.41], 'Daya Bay': [22.60, 114.55],
    'Jiangsu': [32.97, 119.76], 'Taizhou': [32.45, 119.92], 'Yancheng': [33.34, 120.16],
    
    # APAC & ME
    'Australia': [-25.27, 133.77], 'Gorgon': [-20.78, 115.44], 'Barrow Island': [-20.80, 115.40], 'Moomba': [-28.11, 140.19],
    'Malaysia': [4.21, 101.97], 'Bintulu': [3.16, 113.03], 'Kasawari': [4.0, 112.5],
    'Indonesia': [-0.78, 113.92], 'Tangguh': [-2.4, 133.1],
    'Saudi Arabia': [23.88, 45.07], 'Jubail': [27.01, 49.65],
    'UAE': [23.42, 53.84], 'Abu Dhabi': [24.45, 54.37]
}

COUNTRY_CENTERS = {
    'United States': [37.09, -95.71], 'China': [35.86, 104.19], 'Canada': [56.13, -106.34],
    'United Kingdom': [55.37, -3.43], 'Norway': [60.47, 8.46], 'Netherlands': [52.13, 5.29],
    'Australia': [-25.27, 133.77], 'Japan': [36.20, 138.25], 'France': [46.22, 2.21],
    'Germany': [51.16, 10.45], 'Brazil': [-14.23, -51.92]
}

# --- 3. HELPER FUNCTIONS ---
def normalize_name(name):
    if not isinstance(name, str): return ""
    return re.sub(r'[^a-zA-Z0-9]', '', name).lower()

def extract_location_from_name(name, hub):
    # Try to find location cues in name or hub string
    search_text = (str(name) + " " + str(hub)).strip()
    
    # 1. Look for State/Province codes in parens e.g. (TX)
    state_match = re.search(r'\(([A-Z]{2,3})\)', search_text)
    if state_match:
        code = state_match.group(1)
        if code in GEO_ATLAS: return code # Return key to lookup in Atlas
    
    # 2. Look for Atlas keys in text
    for key in GEO_ATLAS.keys():
        # Simple word boundary check could be better but fuzzy matching keys is expensive
        # We'll strict match specific long keys, fuzzy match short ones carefully
        if len(key) > 3 and key in search_text:
            return key
        if len(key) <= 3:
             # Match whole word for short keys like "UK", "TX"
             if re.search(r'\b' + re.escape(key) + r'\b', search_text):
                 return key
    return None

def jitter(coords):
    if not coords or (coords[0] == 0 and coords[1] == 0): return [0, 0]
    # +/- 0.05 degrees (approx 5km)
    lat = coords[0] + (random.random() - 0.5) * 0.1
    lng = coords[1] + (random.random() - 0.5) * 0.1
    return [round(lat, 4), round(lng, 4)]

# --- 4. MAIN LOGIC ---
updated_count = 0
geolocated_count = 0

# Create a lookup map for IEA data
iea_map = {}
for _, row in df.iterrows():
    norm_name = normalize_name(row['Project name'])
    if norm_name:
        iea_map[norm_name] = row

for facility in facility_db['facilities']:
    # Use English name for matching
    en_name = facility.get('en', {}).get('name', '') or facility.get('zh', {}).get('name', '')
    norm_id = normalize_name(en_name)
    
    iea_row = iea_map.get(norm_id)
    
    # Fallback: simple containment if exact norm match fails
    if iea_row is None:
        for k, v in iea_map.items():
            if norm_id in k or k in norm_id:
                iea_row = v
                break
    
    if iea_row is not None:
        # --- A. UPDATE ATTRIBUTES ---
        # Capacity
        raw_cap = iea_row['Announced capacity (Mt CO2/yr)']
        try:
            # Handle "1.5-2.0" or "TBD"
            if isinstance(raw_cap, (int, float)):
                cap = float(raw_cap)
            else:
                # Extract first number found
                match = re.search(r'(\d+(\.\d+)?)', str(raw_cap))
                cap = float(match.group(1)) if match else 0
        except:
            cap = 0
            
        # Status
        status_map = {
            'Operational': 'Operational',
            'Under construction': 'Construction',
            'Advanced development': 'Advanced Development',
            'Early development': 'Early Development',
            'Planned': 'Planned',
            'Completed': 'Completed',
            'Decommissioned': 'Decommissioned'
        }
        iea_status = iea_row['Project Status']
        status = status_map.get(iea_status, iea_status)
        
        # Sector
        sector = iea_row['Sector']
        
        # Country
        country = iea_row['Country or economy']

        # Apply updates
        if facility.get('zh'):
            facility['zh']['capacity'] = cap
            facility['zh']['status'] = status.replace('Operational', '运行中').replace('Construction', '建设中').replace('Development', '开发中').replace('Planned', '计划中')
            facility['zh']['country'] = country.replace('United States', '美国').replace('China', '中国').replace('United Kingdom', '英国') # Simple translation
            facility['zh']['sector'] = sector
            
        if facility.get('en'):
            facility['en']['capacity'] = cap
            facility['en']['status'] = status
            facility['en']['country'] = country
            facility['en']['sector'] = sector
            
        updated_count += 1

        # --- B. GEOLOCATION ---
        # 1. Try to find precise location
        location_key = extract_location_from_name(en_name, iea_row['Part of CCUS hub'])
        
        base_coords = [0, 0]
        
        if location_key and location_key in GEO_ATLAS:
            base_coords = GEO_ATLAS[location_key]
            # Store extracted location name in 'location' field for clarity
            if facility.get('en'): facility['en']['location'] = location_key
            if facility.get('zh'): facility['zh']['location'] = location_key
        else:
            # 2. Fallback to Country Center
            base_coords = COUNTRY_CENTERS.get(country, [0, 0])
            if base_coords[0] == 0:
                 # Last resort: Try to find country in Atlas (e.g. Norway)
                 if country in GEO_ATLAS:
                     base_coords = GEO_ATLAS[country]

        # 3. Apply Jitter & Save
        if base_coords[0] != 0:
            final_coords = jitter(base_coords)
            if facility.get('zh'): facility['zh']['coordinates'] = final_coords
            if facility.get('en'): facility['en']['coordinates'] = final_coords
            geolocated_count += 1

# Sanitize NaN values
def sanitize_json(obj):
    if isinstance(obj, float) and (obj != obj):  # Check for NaN
        return 0
    if isinstance(obj, dict):
        return {k: sanitize_json(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [sanitize_json(x) for x in obj]
    return obj

facility_db = sanitize_json(facility_db)

# Save back
with open(JSON_PATH, 'w', encoding='utf-8') as f:
    json.dump(facility_db, f, indent=2, ensure_ascii=False)

print(f"✅ Sync Complete: Updated {updated_count} facilities.")
print(f"✅ Geolocation: Refined {geolocated_count} facilities based on IEA data & Atlas.")
