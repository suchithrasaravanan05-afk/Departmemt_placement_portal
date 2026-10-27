import base64
from PIL import Image
import io
import re

with open('frontend/certificate_assets.js', 'r', encoding='utf-8') as f:
    text = f.read()

for sig in ['jeyasundari', 'kesavaraja', 'ganesan', 'faculty_coordinator', 'hod', 'principal', 'director']:
    m = re.search(r'[\'"]' + sig + r'[\'"]\s*:\s*[\'"]data:image/png;base64,([^\'"]+)[\'"]', text)
    if m:
        b = base64.b64decode(m.group(1))
        im = Image.open(io.BytesIO(b))
        print(sig, 'mode:', im.mode, 'size:', im.size)
    else:
        print(sig, 'not found in base64')
