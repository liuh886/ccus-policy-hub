import os
import random
import re

# 极精细地理坐标索引 (V3.1 - Middle East Update)
GEO_INDEX = {
    # --- 港澳台 ---
    "Hong Kong": [22.3193, 114.1694], "HK": [22.3193, 114.1694],
    "Macau": [22.1987, 113.5439],
    "Taiwan": [23.6978, 120.9605],

    # --- 东北 ---
    "Daqing": [46.5892, 125.1136],
    "Jilin Oilfield": [45.13, 124.85],
    "Jilin": [43.8378, 125.3306],

    # --- 西北 ---
    "Karamay": [45.5796, 84.8893], "Junggar": [44.0, 88.0],
    "Xinjiang": [43.8256, 87.6168],
    "Yanchang": [36.5855, 109.4897], "Ordos": [39.6082, 109.7711],

    # --- 西南 ---
    "Sichuan": [30.6516, 104.0759], "Chongqing": [29.5630, 106.5516],

    # --- 华东 ---
    "Shengli": [37.4611, 118.4911], "Shandong": [36.6753, 117.0010],

    # --- 沙特 (Saudi Arabia) - 专项修复 ---
    "Jubail": [27.0112, 49.6583], 
    "Yanbu": [24.0232, 38.1900],
    "Uthmaniyah": [25.23, 49.32],
    "Hawiyah": [25.12, 49.38],
    "Riyadh": [24.7136, 46.6753],
    "Saudi Arabia": [24.7, 46.7], # 默认移至利雅得周边，而非荒漠中心

    # --- 阿联酋 (UAE) ---
    "Abu Dhabi": [24.4539, 54.3773], 
    "Habshan": [23.6, 53.7],
    "Shah": [22.9, 53.8],
    "Ruwais": [24.11, 52.73],
    "United Arab Emirates": [24.4, 54.3],
    
    # --- 其他 ---
    "Qatar": [25.3, 51.5],
    "Oman": [23.6, 58.4],
}

def v3_1_refine(directory):
    files = [f for f in os.listdir(directory) if f.endswith(".md")]
    updated_count = 0

    for filename in files:
        path = os.path.join(directory, filename)
        with open(path, 'r', encoding='utf-8') as f:
            lines = f.readlines()

        content_str = "".join(lines)
        target_coords = None
        
        for key, coords in GEO_INDEX.items():
            if re.search(r'\b' + re.escape(key) + r'\b', content_str, re.IGNORECASE):
                target_coords = coords
                break
        
        # 兜底逻辑：如果是沙特项目但没匹配到地名
        if ("country: Saudi Arabia" in content_str) and not target_coords:
            target_coords = GEO_INDEX["Saudi Arabia"]

        if target_coords:
            new_lat = target_coords[0] + random.uniform(-0.04, 0.04)
            new_lng = target_coords[1] + random.uniform(-0.04, 0.04)
            
            new_lines = []
            skip_next = 0
            for line in lines:
                if skip_next > 0:
                    skip_next -= 1
                    continue
                if line.strip() == "coordinates:":
                    new_lines.append(f"precision: approximate\n")
                    new_lines.append("coordinates:\n")
                    new_lines.append(f"- {new_lat:.4f}\n")
                    new_lines.append(f"- {new_lng:.4f}\n")
                    skip_next = 2
                elif "precision:" in line:
                    continue
                else:
                    new_lines.append(line)
            
            with open(path, 'w', encoding='utf-8') as f:
                f.writelines(new_lines)
            updated_count += 1

    print(f"V3.1 (Saudi Update) COMPLETE: {updated_count} projects repositioned.")

if __name__ == "__main__":
    v3_1_refine("src/content/facilities")