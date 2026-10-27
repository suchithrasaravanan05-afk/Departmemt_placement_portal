import base64
from PIL import Image
import numpy as np
import os

img = Image.open('C:/Users/sivaranjani/.gemini/antigravity-ide/brain/2e6228c6-d694-4fac-8822-2b351967f85e/.user_uploaded/media_1793080225142.jpg')

sig_boxes = {
    'jeyasundari': (54, 542, 176, 597),
    'rekha': (195, 542, 305, 597),
    'ramakrishnan': (330, 542, 457, 597),
    'kesavaraja': (510, 542, 630, 597),
    'rajakumaran': (670, 542, 805, 597),
    'ganesan': (840, 542, 965, 597),
}

os.makedirs('frontend/signature', exist_ok=True)
base64_dict = {}

for name, box in sig_boxes.items():
    crop = img.crop(box).convert('RGBA')
    arr = np.array(crop).astype(float)
    r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
    lum = 0.299 * r + 0.587 * g + 0.114 * b
    # The background is very light (lum > 240)
    # The signature ink is dark (lum < 160)
    bg = 248.0
    ink = 120.0
    alpha = np.clip((bg - lum) / (bg - ink) * 255.0, 0, 255)
    
    # Clean up very small noise
    alpha[alpha < 25] = 0
    
    new_arr = np.zeros_like(arr, dtype=np.uint8)
    # Give it deep purple/charcoal ink matching the reference (#1e1b4b)
    new_arr[:,:,0] = 30
    new_arr[:,:,1] = 27
    new_arr[:,:,2] = 75
    new_arr[:,:,3] = alpha.astype(np.uint8)
    
    clean_img = Image.fromarray(new_arr)
    # Crop empty transparent borders
    bbox = clean_img.getbbox()
    if bbox:
        clean_img = clean_img.crop(bbox)
        
    png_path = f'frontend/signature/{name}.png'
    clean_img.save(png_path)
    
    # Save base64
    with open(png_path, 'rb') as f:
        b64 = base64.b64encode(f.read()).decode('utf-8')
        base64_dict[name] = f'data:image/png;base64,{b64}'
        print(f'{name}: saved {png_path}, size {clean_img.size}, b64 length {len(b64)}')

# Also save mapping to a JSON file for easy import
import json
with open('scratch/signatures_base64.json', 'w') as f:
    json.dump(base64_dict, f, indent=2)
print('Saved all 6 clean signatures to frontend/signature/ and scratch/signatures_base64.json')
