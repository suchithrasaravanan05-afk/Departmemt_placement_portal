from PIL import Image
import numpy as np

img = Image.open(r"d:\Departmemt_placement_portal\frontend\certificate_background.png")
print("Size:", img.size, "Mode:", img.mode)

# Let's inspect the right edge columns (e.g. x from 1010 to 1023)
arr = np.array(img)
print("Right border check:")
# Let's see if x=1023 or around x=990 has any odd vertical lines
# In A4, 297mm x 210mm. If width is 1024 and height is 724:
# 1024 / 724 = 1.41436. 297 / 210 = 1.41428.
# When jsPDF scales to 297 x 210, it's virtually identical.
# Let's check if the rightmost columns of arr have dark pixels
for x in range(1015, 1024):
    colors = arr[360, x] # middle row
    print(f"x={x}: {colors}")
