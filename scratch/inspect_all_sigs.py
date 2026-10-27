import os
from PIL import Image

sig_dir = 'frontend/signature'
for f in sorted(os.listdir(sig_dir)):
    if f.endswith('.png'):
        p = os.path.join(sig_dir, f)
        im = Image.open(p)
        print(f"{f}: size={im.size}, mode={im.mode}, file_size={os.path.getsize(p)} bytes")
