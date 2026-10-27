from PIL import Image
import numpy as np

img = Image.open(r"d:\Departmemt_placement_portal\scratch\acceptance_certificate_standard.png")
print("Image size:", img.size)
arr = np.array(img)
# 1754 x 1241. Check row 600 around x=1500..1600
for x in range(1500, 1600, 5):
    print(f"x={x}: {arr[600, x]}")
