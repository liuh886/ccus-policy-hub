import json
import re
import random

# --- 1. DATA LOADING ---
IEA_JSON = 'src/data/iea_full_temp.json'
OUTPUT_DB = 'src/data/facility_database.json'

with open(IEA_JSON, 'r', encoding='utf-8') as f:
    iea_data = json.load(f)

# --- 2. CONFIGURATION & DICTIONARIES ---
GEO_ATLAS = {
    'Texas': [31.96, -99.90], 'TX': [31.96, -99.90], 'Houston': [29.76, -95.36], 'Corpus Christi': [27.80, -97.39], 'Midland': [31.99, -102.07], 'Bayou Bend': [29.8, -94.0],
    'Louisiana': [30.98, -91.96], 'LA': [30.98, -91.96], 'New Orleans': [29.95, -90.07], 'Lake Charles': [30.22, -93.21], 'Baton Rouge': [30.45, -91.18],
    'Wyoming': [42.75, -107.30], 'WY': [42.75, -107.30], 'Casper': [42.85, -106.32], 'Gillette': [44.29, -105.50],
    'North Dakota': [47.55, -101.00], 'ND': [47.55, -101.00], 'Beulah': [47.26, -101.77],
    'Illinois': [40.63, -89.39], 'IL': [40.63, -89.39], 'Decatur': [39.84, -88.95],
    'California': [36.77, -119.41], 'CA': [36.77, -119.41], 'Bakersfield': [35.37, -119.01],
    'Ohio': [40.41, -82.90], 'OH': [40.41, -82.90], 'Pennsylvania': [41.20, -77.19], 'PA': [41.20, -77.19],
    'West Virginia': [38.59, -80.45], 'WV': [38.59, -80.45], 'Indiana': [39.76, -86.15], 'IN': [39.76, -86.15],
    'Michigan': [44.31, -85.60], 'MI': [44.31, -85.60], 'Alberta': [53.93, -116.57], 'AB': [53.93, -116.57],
    'Norway': [60.47, 8.46], 'Oygarden': [60.56, 4.88], 'Northern Lights': [60.56, 4.88], 'Sleipner': [58.36, 1.91], 'Snohvit': [71.58, 21.01],
    'United Kingdom': [55.37, -3.43], 'UK': [55.37, -3.43], 'Teesside': [54.57, -1.23], 'Humber': [53.68, -0.34],
    'Netherlands': [52.13, 5.29], 'Rotterdam': [51.92, 4.47], 'Porthos': [51.90, 4.27],
    'China': [35.86, 104.19], 'Xinjiang': [41.11, 85.29], 'Karamay': [45.59, 84.87], 'Shaanxi': [35.19, 108.87], 'Yulin': [38.29, 109.74],
    'Australia': [-25.27, 133.77], 'Gorgon': [-20.78, 115.44], 'Barrow Island': [-20.80, 115.40], 'Moomba': [-28.11, 140.19],
    'Setouchi': [34.4, 133.5], 'Shikoku': [33.5, 133.5], 'Timor-Leste': [-8.8, 125.7],
    'Indonesia': [-0.78, 113.92], 'Malaysia': [4.21, 101.97], 'Thailand': [15.87, 100.99],
    'Saudi Arabia': [23.88, 45.07], 'Jubail': [27.01, 49.65], 'UAE': [23.42, 53.84], 'Abu Dhabi': [24.45, 54.37]
}

# Exhaustive Country Centers
COUNTRY_CENTERS = {
    'United States': [37.09, -95.71], 'China': [35.86, 104.19], 'Canada': [56.13, -106.34],
    'United Kingdom': [55.37, -3.43], 'Norway': [60.47, 8.46], 'Netherlands': [52.13, 5.29],
    'Australia': [-25.27, 133.77], 'Japan': [36.20, 138.25], 'France': [46.22, 2.21],
    'Germany': [51.16, 10.45], 'Brazil': [-14.23, -51.92], 'Belgium': [50.50, 4.47],
    'Sweden': [60.12, 18.64], 'Finland': [61.92, 25.74], 'Spain': [40.46, -3.74],
    'Italy': [41.87, 12.56], 'Greece': [39.07, 21.82], 'Portugal': [39.39, -8.22],
    'Poland': [51.91, 19.14], 'Romania': [45.94, 24.96], 'Hungary': [47.16, 19.50],
    'Switzerland': [46.81, 8.22], 'Austria': [47.51, 14.55], 'Bulgaria': [42.73, 25.48],
    'Croatia': [45.10, 15.20], 'Romania': [45.94, 24.96], 'India': [20.59, 78.96],
    'Thailand': [15.87, 100.99], 'Indonesia': [-0.78, 113.92], 'Malaysia': [4.21, 101.97],
    'Saudi Arabia': [23.88, 45.07], 'UAE': [23.42, 53.84], 'Qatar': [25.35, 51.18],
    'Bahrain': [26.06, 50.55], 'Oman': [21.47, 55.97], 'Mexico': [23.63, -102.55],
    'Chile': [-35.67, -71.54], 'Uruguay': [-32.52, -55.76], 'Russia': [61.52, 105.31],
    'Algeria': [28.03, 1.65], 'Iceland': [64.96, -19.02], 'Singapore': [1.35, 103.81],
    'Georgia': [42.31, 43.35], 'Luxembourg': [49.81, 6.12], 'New Zealand': [-40.90, 174.88]
}

ZH_COUNTRY_MAP = {
    'United States': '美国', 'China': '中国', "People's Republic of China": '中国',
    'United Kingdom': '英国', 'Norway': '挪威', 'Netherlands': '荷兰', 'Canada': '加拿大',
    'Australia': '澳大利亚', 'Japan': '日本', 'France': '法国', 'Germany': '德国',
    'Brazil': '巴西', 'Saudi Arabia': '沙特阿拉伯', 'United Arab Emirates': '阿联酋',
    'UAE': '阿联酋', 'Indonesia': '印度尼西亚', 'Malaysia': '马来西亚', 'Thailand': '泰国'
}

STATUS_MAP_ZH = {
    'Operational': '运行中', 'Under construction': '建设中', 'Advanced development': '开发中',
    'Early development': '初期开发', 'Planned': '计划中', 'Completed': '已完成', 'Decommissioned': '停运'
}

def extract_location(name, country):
    search_text = str(name).strip()
    m = re.search(r'\((.*?)\)', search_text)
    if m:
        tokens = [t.strip() for t in m.group(1).split(',')]
        for token in tokens:
            if token in GEO_ATLAS: return token, GEO_ATLAS[token]

    for key in sorted(GEO_ATLAS.keys(), key=len, reverse=True):
        if len(key) > 3 and key.lower() in search_text.lower():
            return key, GEO_ATLAS[key]
        if len(key) <= 3:
             if re.search(r'\b' + re.escape(key) + r'\b', search_text):
                 return key, GEO_ATLAS[key]

    countries = [c.strip() for c in re.split(r'[-/]', country)]
    for c in countries:
        c_clean = c.replace("People's Republic of ", "")
        if c_clean in COUNTRY_CENTERS: return c_clean, COUNTRY_CENTERS[c_clean]
        if c in COUNTRY_CENTERS: return c, COUNTRY_CENTERS[c]
            
    # Universal fallback: [0, 0] replaced by [20, 0] or something identifiable but non-zero
    return country, [20.0, 0.0] 

def parse_capacity(val):
    if isinstance(val, (int, float)): return float(val)
    match = re.search(r'(\d+(\.\d+)?)', str(val))
    return float(match.group(1)) if match else 0

def jitter(coords):
    if not coords or (coords[0] == 0 and coords[1] == 0): return [20.0, 0.0]
    return [round(coords[0] + (random.random() - 0.5) * 0.1, 4),
            round(coords[1] + (random.random() - 0.5) * 0.1, 4)]

new_facilities = []
for item in iea_data:
    iea_id = item.get('ID', f"project-{random.randint(10000, 99999)}")
    clean_id = str(iea_id).lower().replace(' ', '-')
    if not clean_id.startswith('project-'): clean_id = f"project-{clean_id}"
    name = item.get('Project name', 'Unknown Project')
    country = item.get('Country or economy', 'Unknown')
    status = item.get('Project Status', 'Unknown')
    capacity = parse_capacity(item.get('Announced capacity (Mt CO2/yr)', 0))
    sector = item.get('Sector', 'Unknown')
    comm_year = item.get('Operation', None)
    loc_name, base_coords = extract_location(name, country)
    final_coords = jitter(base_coords)

    zh_data = {
        "name": name, "lang": "zh", "country": ZH_COUNTRY_MAP.get(country, country),
        "location": loc_name, "type": item.get('Project type', 'CCUS'),
        "status": STATUS_MAP_ZH.get(status, status), "capacity": capacity,
        "sector": sector, "storage_type": item.get('Fate of carbon', '未知'),
        "coordinates": final_coords, "commencementYear": str(comm_year) if comm_year else "null",
        "description": f"由 {item.get('Partners', '相关机构')} 开发的 {sector} 行业 CCUS 项目。该项目是全球碳管理网络的重要组成部分。",
        "relatedPolicies": []
    }

    en_data = {
        "name": name, "lang": "en", "country": country, "location": loc_name,
        "type": item.get('Project type', 'CCUS'), "status": status, "capacity": capacity,
        "sector": sector, "storage_type": item.get('Fate of carbon', 'Unknown'),
        "coordinates": final_coords, "commencementYear": str(comm_year) if comm_year else "null",
        "description": "", "relatedPolicies": []
    }
    new_facilities.append({"id": clean_id, "zh": zh_data, "en": en_data})

final_list = []
seen_ids = set()
for f in new_facilities:
    if f['id'] not in seen_ids:
        final_list.append(f)
        seen_ids.add(f['id'])

final_db = {"version": "6.0-Geo-Fixed", "lastUpdated": "2026-02-07T00:00:00Z", "facilities": final_list}
with open(OUTPUT_DB, 'w', encoding='utf-8') as f:
    json.dump(final_db, f, indent=2, ensure_ascii=False)
print(f"🚀 Rebuilt Facility DB: {len(final_list)} entries.")
