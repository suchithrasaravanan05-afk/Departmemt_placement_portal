from PIL import Image
import numpy as np

img = Image.open("C:/Users/sivaranjani/.gemini/antigravity-ide/brain/8b02d930-104c-4744-90cd-a4a1cca602a3/.user_uploaded/media_1793263872994.jpg")
w, h = img.size
arr = np.array(img)

# Let's inspect the y-profile of dark text pixels along the vertical center (between x=200 and x=824)
center_slice = arr[:, 200:824]
# Threshold dark pixels (text is generally dark: r < 120, g < 120, b < 120)
is_dark = (center_slice[:, :, 0] < 120) & (center_slice[:, :, 1] < 120) & (center_slice[:, :, 2] < 120)
dark_per_row = np.sum(is_dark, axis=1)

import scipy.ndimage as ndi

# Group continuous dark pixel rows into text lines
labeled, num_features = ndi.label(dark_per_row > 5)
print(f"Found {num_features} text rows in center slice:")
slices = ndi.find_objects(labeled)
for idx, sl in enumerate(slices):
    y_start, y_end = sl[0].start, sl[0].stop
    height_px = y_end - y_start
    # Compute relative to 735 (A4 height 210mm) -> mm = (y / 735) * 210
    mm_y = (y_start / 735.0) * 210.0
    mm_h = (height_px / 735.0) * 210.0
    print(f"Row {idx+1}: y={y_start}..{y_end} (height={height_px}px, mm_y={mm_y:.1f}mm, mm_h={mm_h:.1f}mm)")
