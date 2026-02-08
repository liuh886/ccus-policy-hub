import pandas as pd
import json

def extract_missing_policies():
    df = pd.read_excel('docs/IEA CCUS Projects Database 2025.xlsx', sheet_name='CCUS Projects Database')
    
    # 提取所有 Link 列中不重复的域名作为政策占位符
    links = []
    for col in [f'Link {i}' for i in range(1, 8)]:
        links.extend(df[col].dropna().tolist())
    
    unique_links = sorted(list(set(links)))
    print(f"Total unique source links found: {len(unique_links)}")
    
    # 获取现有政策 ID
    with open('src/data/policy_database.json', 'r', encoding='utf-8') as f:
        db = json.load(f)
    existing_ids = set(p['id'] for p in db['policies'])
    
    print(f"Existing tailored policies: {len(existing_ids)}")
    
    # 尝试列出可能失踪的政策
    # ... 这里的逻辑需要根据您昨天的记忆来补全
    # 比如：您记得是否有 'us-doe-hubs' 或其他具体的名称？

extract_missing_policies()
