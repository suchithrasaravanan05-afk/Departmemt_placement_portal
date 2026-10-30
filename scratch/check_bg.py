import cv2
import base64
import numpy as np
import re

file_bg = cv2.imread(r'frontend\certificate_background.png')
print('file_bg shape:', file_bg.shape if file_bg is not None else 'None')

with open(r'frontend\certificate_assets.js', 'r', encoding='utf-8') as f:
    text = f.read()

m = re.search(r'BACKGROUND_IMAGE:\s*"data:image/png;base64,([^"]+)"', text)
if m:
    b64_data = m.group(1)
    img_bytes = base64.b64decode(b64_data)
    nparr = np.frombuffer(img_bytes, np.uint8)
    js_bg = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
    print('js_bg shape:', js_bg.shape)

    if file_bg.shape == js_bg.shape:
        diff = np.abs(file_bg.astype('float') - js_bg.astype('float')).max()
        print('Max pixel difference between file_bg and js_bg:', diff)
    else:
        print('Different shapes!')
else:
    print('No BACKGROUND_IMAGE found in js')

