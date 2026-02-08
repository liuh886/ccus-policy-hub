import pandas as pd
import os
import yaml
import numpy as np
import random

def clean_val(val):
    if pd.isna(val) or val == 'NaN':
        return None
    return val

def translate_status(status):
    mapping = {
        'Operational': '运行中',
        'Under construction': '建设中',
        'Planned': '计划中',
        'Cancelled': '已取消',
        'Suspended': '已停运'
    }
    return mapping.get(status, status)

def translate_type(ptype):
    mapping = {
        'Capture': '捕集',
        'Full chain': '全流程',
        'Transport and Storage': '枢纽',
        'Storage': '封存',
        'T&S': '枢纽'
    }
    return mapping.get(ptype, ptype)

def translate_storage(fate):
    if fate == 'EOR': return 'EOR'
    if fate == 'Dedicated storage': return '咸水层'
    return '地质封存'

# Comprehensive Coordinate Map for CCUS active regions
GLOBAL_COORD_MAP = {
    'China': [35.0, 105.0],
    'United States': [37.0, -95.0],
    'Canada': [56.0, -106.0],
    'Norway': [60.0, 8.0],
    'United Kingdom': [55.0, -3.0],
    'Australia': [-25.0, 133.0],
    'Netherlands': [52.0, 5.0],
    'Germany': [51.0, 10.0],
    'Japan': [36.0, 138.0],
    'United Arab Emirates': [24.0, 54.0],
    'Saudi Arabia': [24.0, 45.0],
    'Brazil': [-14.0, -51.0],
    'Malaysia': [4.0, 101.0],
    'Indonesia': [-0.7, 113.0],
    'South Korea': [36.0, 127.0],
    'France': [46.0, 2.0],
    'Denmark': [56.0, 9.0],
    'Belgium': [50.0, 4.0],
    'Italy': [41.0, 12.0],
    'Spain': [40.0, -3.0],
    'India': [20.0, 78.0],
    'Oman': [21.0, 57.0],
    'Algeria': [28.0, 1.0],
    'Qatar': [25.0, 51.0],
    'Iceland': [64.0, -18.0],
    'Canada-United States': [49.0, -100.0],
    'Norway-United Kingdom': [58.0, 2.0],
    'Egypt': [26.0, 30.0],
    'Vietnam': [14.0, 108.0],
    'Thailand': [15.0, 100.0],
    'Kazakhstan': [48.0, 66.0]
}

def normalize_country(raw_country):
    c = str(raw_country)
    if "China" in c or "PRC" in c: return "China"
    if "United States" in c or "USA" in c: return "United States"
    if "United Kingdom" in c or "UK" in c: return "United Kingdom"
    if "UAE" in c or "Emirates" in c: return "United Arab Emirates"
    return c

file_path = 'C:/Users/ZOZN109/Documents/GitHub/ccus-policy-hub/docs/IEA CCUS Projects Database 2025.xlsx'
df = pd.read_excel(file_path, sheet_name='CCUS Projects Database')

filtered_df = df[df['Project Status'].isin(['Operational', 'Under construction', 'Planned'])]
output_dir = 'C:/Users/ZOZN109/Documents/GitHub/ccus-policy-hub/src/content/facilities'

generated_count = 0
for _, row in filtered_df.iterrows():
    name = str(row['Project name']).strip()
    pid = str(row['ID'])
    slug = f"project-{pid}"
    
    raw_country = clean_val(row['Country or economy'])
    norm_country = normalize_country(raw_country)
    
    status_en = clean_val(row['Project Status'])
    type_en = clean_val(row['Project type'])
    capacity = clean_val(row['Estimated capacity by IEA (Mt CO2/yr)']) or 0.0
    fate = clean_val(row['Fate of carbon'])
    op_year = clean_val(row['Operation'])
    sector = clean_val(row['Sector'])
    partners = clean_val(row['Partners'])
    
    # Logic: Use Map first, then random jitter around center
    coords = GLOBAL_COORD_MAP.get(norm_country, [20.0, 0.0]) # Default to Atlantic center if totally unknown
    
    # Add random jitter to all projects to prevent overlap at country centers
    jitter_lat = random.uniform(-3.5, 3.5)
    jitter_lng = random.uniform(-5.0, 5.0)
    final_coords = [coords[0] + jitter_lat, coords[1] + jitter_lng]

    country_display_zh = "中国" if norm_country == "China" else raw_country
    country_display_en = norm_country

    zh_data = {
        'name': name,
        'lang': 'zh',
        'country': country_display_zh,
        'location': sector or '未知',
        'type': translate_type(type_en),
        'status': translate_status(status_en),
        'capacity': float(capacity),
        'sector': sector,
        'storage_type': translate_storage(fate),
        'coordinates': final_coords,
        'commencementYear': int(op_year) if not pd.isna(op_year) and str(op_year).replace('.','').isdigit() else None,
        'description': f"由 {partners} 开发的 {sector} 行业 CCUS 项目。该项目是全球碳管理网络的重要组成部分。"
    }
    
    en_data = {
        'name': name,
        'lang': 'en',
        'country': country_display_en,
        'location': sector or 'Unknown',
        'type': type_en,
        'status': status_en,
        'capacity': float(capacity),
        'sector': sector,
        'storage_type': fate,
        'coordinates': final_coords,
        'commencementYear': int(op_year) if not pd.isna(op_year) and str(op_year).replace('.','').isdigit() else None,
        'description': f"A CCUS project in the {sector} sector developed by {partners}. A key component of the global carbon management network."
    }

    for lang, data in [('zh', zh_data), ('en', en_data)]:
        filename = f"{slug}{'-en' if lang == 'en' else ''}.md"
        with open(os.path.join(output_dir, filename), 'w', encoding='utf-8') as f:
            f.write('---\n')
            yaml.dump(data, f, allow_unicode=True, sort_keys=False)
            f.write('---\n\n')
            if lang == 'zh':
                f.write(f"### 项目详情\n\n该项目位于 {country_display_zh} 的 {sector} 领域。预计/实际投产年份为 {op_year or '未知'}。")
            else:
                f.write(f"### Project Details\n\nThis project is located in the {sector} sector of {country_display_en}. Expected/Actual commencement year is {op_year or 'Unknown'}.")
    
    generated_count += 1

print(f"DONE: Generated {generated_count * 2} files for {generated_count} projects. Jitter applied.")
