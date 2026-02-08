import pandas as pd
import json
import re

def parse_capacity(val):
    if pd.isna(val) or val == '-': return 0.0
    s = str(val).replace('Mt CO2/yr', '').strip()
    if '-' in s:
        # 取范围的平均值
        nums = [float(n) for n in re.findall(r"[-+]?\d*\.\d+|\d+", s)]
        return sum(nums) / len(nums) if nums else 0.0
    try:
        return float(s)
    except:
        return 0.0

def merge():
    with open('src/data/facility_database.json', 'r', encoding='utf-8') as f:
        old_db = json.load(f)
    old_facs = {fac['id']: fac for fac in old_db['facilities']}
    
    df = pd.read_excel('docs/IEA CCUS Projects Database 2025.xlsx', sheet_name='CCUS Projects Database')
    df = df[df['ID'].notna()]
    
    new_facilities = []
    for _, row in df.iterrows():
        f_id = str(int(row['ID']))
        name = str(row['Project name']).strip()
        country = str(row['Country or economy']).strip()
        cap = parse_capacity(row['Announced capacity (Mt CO2/yr)'])
        
        if f_id in old_facs:
            item = old_facs[f_id]
            item['name'] = name
            item['status'] = str(row['Project Status']).strip()
            item['capacity'] = cap
        else:
            item = {
                "id": f_id,
                "name": name,
                "country": country,
                "location": country,
                "type": str(row['Project type']).strip(),
                "status": str(row['Project Status']).strip(),
                "capacity": cap,
                "sector": str(row['Sector']).strip() if pd.notna(row['Sector']) else "Other",
                "coordinates": [0, 0],
                "precision": "approximate",
                "description": f"Verified IEA 2025 entry.",
                "relatedPolicies": []
            }
        new_facilities.append(item)
    
    with open('src/data/facility_database.json', 'w', encoding='utf-8') as f:
        json.dump({"facilities": new_facilities}, f, indent=2, ensure_ascii=False)
    
    print(f"✅ FINAL MERGE: {len(new_facilities)} projects synchronized with Excel IDs.")

merge()