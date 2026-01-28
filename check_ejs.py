import os
import re

def check_ejs_file(filepath):
    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # Count opening and closing tags
    opens = len(re.findall(r'<%', content))
    closes = len(re.findall(r'%>', content))
    
    if opens != closes:
        print(f"XATO: {filepath}")
        print(f"  Ochilgan: {opens}, Yopilgan: {closes}")
        print(f"  Farq: {opens - closes}")
        
        # Show lines with unmatched tags
        lines = content.split('\n')
        balance = 0
        for i, line in enumerate(lines, 1):
            balance += line.count('<%')
            balance -= line.count('%>')
            if '<%' in line or '%>' in line:
                print(f"  {i}: {line[:80]}")
        return False
    return True

# Check all EJS files
views_dir = 'src/views'
all_ok = True
for root, dirs, files in os.walk(views_dir):
    for file in files:
        if file.endswith('.ejs'):
            filepath = os.path.join(root, file)
            if not check_ejs_file(filepath):
                all_ok = False
                print()

if all_ok:
    print("Barcha fayllar to'g'ri!")
