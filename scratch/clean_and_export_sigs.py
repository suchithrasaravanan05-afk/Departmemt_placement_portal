import os, shutil, io, base64, json
from PIL import Image
import numpy as np

sig_dir = 'frontend/signature'
orig_dir = os.path.join(sig_dir, 'originals')
os.makedirs(orig_dir, exist_ok=True)

files = [
    ('jeyasundari.png', 'Dr. M. Jeya Sundari_Faculty Coordinator.png'),
    ('rekha.png', 'M. Rekha-Faculty Coordinator.png'),
    ('ramakrishnan.png', 'M. Ramakrishnan-Faculty Coordinator.png'),
    ('kesavaraja.png', 'Dr. D. Kesavaraja_convenor.png'),
    ('rajakarunakaran.png', 'Dr. S. Rajakarunakaran_Patron.png'),
    ('ganesan.png', 'Dr. L. Ganesan_chief patron.png')
]

base64_map = {}

for short, long in files:
    src_path = os.path.join(sig_dir, short)
    backup_path = os.path.join(orig_dir, short)
    
    # Check if backup exists, else read from src_path
    read_from = backup_path if os.path.exists(backup_path) else src_path
    with open(read_from, 'rb') as f:
        data = f.read()
    if not os.path.exists(backup_path):
        with open(backup_path, 'wb') as f:
            f.write(data)
            
    im = Image.open(io.BytesIO(data)).convert('RGBA')
    arr = np.array(im).astype(float)
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    
    # Transparency
    bg = 245.0
    ink = 175.0
    alpha = np.clip((bg - lum) / (bg - ink) * 255.0, 0, 255)
    
    new_arr = arr.copy()
    new_arr[:,:,3] = alpha
    
    clean_img = Image.fromarray(new_arr.astype(np.uint8))
    bbox = clean_img.getbbox()
    if bbox:
        w, h = clean_img.size
        crop_box = (
            max(0, bbox[0] - 6),
            max(0, bbox[1] - 6),
            min(w, bbox[2] + 6),
            min(h, bbox[3] + 6)
        )
        clean_img = clean_img.crop(crop_box)
        
    buf = io.BytesIO()
    clean_img.save(buf, format='PNG')
    png_bytes = buf.getvalue()
    
    with open(src_path, 'wb') as f:
        f.write(png_bytes)
    with open(os.path.join(sig_dir, long), 'wb') as f:
        f.write(png_bytes)
        
    key = short.replace('.png', '')
    b64_str = 'data:image/png;base64,' + base64.b64encode(png_bytes).decode('utf-8')
    base64_map[key] = b64_str
    print(f'Successfully processed {short}: {clean_img.size}, b64 length {len(b64_str)}')

# Also copy to rajakumaran.png
with open(os.path.join(sig_dir, 'rajakarunakaran.png'), 'rb') as f:
    rk_bytes = f.read()
with open(os.path.join(sig_dir, 'rajakumaran.png'), 'wb') as f:
    f.write(rk_bytes)
base64_map['rajakumaran'] = base64_map['rajakarunakaran']

# Aliases
base64_map['faculty_coordinator'] = base64_map['jeyasundari']
base64_map['convenor'] = base64_map['kesavaraja']
base64_map['patron'] = base64_map['rajakarunakaran']
base64_map['chief_patron'] = base64_map['ganesan']

with open('scratch/new_signatures_base64.json', 'w') as f:
    json.dump(base64_map, f, indent=2)

print('Saved scratch/new_signatures_base64.json with keys:', list(base64_map.keys()))
