import os, base64, re
from PIL import Image

with open('frontend/certificate_assets.js', 'r', encoding='utf-8') as f:
    js_content = f.read()

sig_dir = 'frontend/signature'
keys = ['jeyasundari', 'rekha', 'ramakrishnan', 'kesavaraja', 'rajakumaran', 'ganesan']

for key in keys:
    # 1. file on disk
    file_path = os.path.join(sig_dir, f"{key}.png")
    im_file = Image.open(file_path)
    print(f"FILE {key}.png: size={im_file.size}, mode={im_file.mode}")
    
    # 2. JS base64
    m = re.search(rf'"{key}":\s*"data:image/png;base64,([^"]+)"', js_content)
    if m:
        b64 = m.group(1)
        raw = base64.b64decode(b64)
        with open(f'scratch/cur_js_{key}.png', 'wb') as out:
            out.write(raw)
        im_js = Image.open(f'scratch/cur_js_{key}.png')
        print(f"JS {key}: size={im_js.size}, mode={im_js.mode}, bytes={len(raw)}")
    else:
        print(f"JS {key}: NOT FOUND")
