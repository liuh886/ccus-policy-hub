import pandas as pd
import json

def audit():
    df = pd.read_excel('docs/IEA CCUS Projects Database 2025.xlsx', sheet_name='CCUS Projects Database')
    # 过滤掉 ID 为空的行（非项目行）
    df = df[df['ID'].notna()]
    excel_ids = set(str(int(id_val)) for id_val in df['ID'] if pd.notna(id_val))
    excel_names = set(df['Project name'].astype(str).str.strip())
    
    with open('src/data/facility_database.json', 'r', encoding='utf-8') as f:
        db = json.load(f)
    
    json_ids = set(fac['id'].replace('project-', '') for fac in db['facilities'])
    json_names = set(fac['name'].strip() for fac in db['facilities'])
    
    missing_ids = excel_ids - json_ids
    
    print(f"Excel Total (by ID): {len(excel_ids)}")
    print(f"JSON Total (by ID): {len(json_ids)}")
    print(f"Missing ID count: {len(missing_ids)}")
    if missing_ids:
        print("Sample missing IDs:", list(missing_ids)[:10])
        # 找出一个缺失的项目名称
        for mid in list(missing_ids)[:5]:
            name = df[df['ID'] == int(mid)]['Project name'].values[0]
            print(f"- Missing: ID {mid}, Name: {name}")

audit()
