from PIL import Image
import numpy as np

im = Image.open("frontend/certificate_logo/college_logo.png")
print("college_logo mode:", im.mode, "size:", im.size)
arr = np.array(im)
if im.mode == "RGBA":
    print("Alpha min/max:", arr[:, :, 3].min(), arr[:, :, 3].max())
    # Count fully transparent pixels
    print("Transparent pixels:", np.sum(arr[:, :, 3] == 0))
else:
    print("No alpha channel!")
