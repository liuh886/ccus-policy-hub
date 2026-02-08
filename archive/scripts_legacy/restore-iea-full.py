import pandas as pd
import json

def restore():
    df = pd.read_excel('docs/IEA CCUS Projects Database 2025.xlsx', sheet_name='CCUS Projects Database')
    df = df[df['ID'].notna()]
    
    facilities = []
    for _, row in df.iterrows():
        f_id = str(int(row['ID']))
        name = str(row['Project name']).strip()
        country = str(row['Country or economy']).strip()
        
        # 处理容量
        cap = row['Full capture capacity (Mt CO2/year)']
        if pd.isna(cap) or cap == '-': cap = 0
        
        # 处理坐标
        lat = row['Latitude'] if pd.notna(row['Latitude']) else 0
        lng = row['Longitude'] if pd.notna(row['Longitude']) else 0
        
        facilities.append({
            "id": f_id,
            "name": name,
            "country": country,
            "location": str(row['State or province']).strip() if pd.notna(row['State or province']) else country,
            "type": str(row['Project type']).strip() if pd.notna(row['Project type']) else "Unknown",
            "status": str(row['Status']).strip() if pd.notna(row['Status']) else "Planned",
            "capacity": float(cap),
            "sector": str(row['Sector']).strip() if pd.notna(row['Sector']) else "Other",
            "coordinates": [float(lat), float(lng)],
            "precision": "approximate" if lat == 0 else "precise",
            "description": f"IEA 2025 Project: {name} in {country}. Sector: {row['Sector']}.",
            "relatedPolicies": []
        })
    
    db = {"facilities": facilities}
    with open('src/data/facility_database.json', 'w', encoding='utf-8') as f:
        json.dump(db, f, indent=2, ensure_ascii=False)
    
    print(f"✅ Successfully restored {len(facilities)} projects from IEA 2025 Excel.")

restore()
