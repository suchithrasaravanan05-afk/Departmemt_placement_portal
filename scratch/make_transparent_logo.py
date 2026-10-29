from PIL import Image
import numpy as np

im = Image.open("frontend/certificate_logo/Ramco Institute of Technology Institutional Header.png")
print("Header image mode:", im.mode, "size:", im.size)
arr = np.array(im)
# Crop shield logo from header image:
# Shield is on the left
shield_crop = im.crop((35, 120, 235, 360))
print("Shield crop size:", shield_crop.size)

# Let's make college_logo transparent by making white/near-white outer pixels transparent (floodfill from corners)
im_logo = Image.open("frontend/certificate_logo/college_logo.png").convert("RGBA")
arr_l = np.array(im_logo)

# Flood fill alpha from (0,0) for near-white pixels
from collections import deque
h, w = arr_l.shape[:2]
visited = np.zeros((h, w), dtype=bool)
q = deque([(0, 0), (w-1, 0), (0, h-1), (w-1, h-1)])

for x, y in list(q):
    visited[y, x] = True

while q:
    cx, cy = q.popleft()
    r, g, b = arr_l[cy, cx, :3]
    # Check if light/white
    if r > 240 and g > 240 and b > 240:
        arr_l[cy, cx, 3] = 0
        for nx, ny in [(cx+1, cy), (cx-1, cy), (cx, cy+1), (cx, cy-1)]:
            if 0 <= nx < w and 0 <= ny < h and not visited[ny, nx]:
                visited[ny, nx] = True
                q.append((nx, ny))

im_clean = Image.fromarray(arr_l)
im_clean.save("frontend/certificate_logo/college_logo.png")
print("Saved clean transparent college_logo.png!")
