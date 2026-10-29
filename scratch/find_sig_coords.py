from PIL import Image
import numpy as np

img = Image.open("C:/Users/sivaranjani/.gemini/antigravity-ide/brain/8b02d930-104c-4744-90cd-a4a1cca602a3/.user_uploaded/media_1793263872994.jpg")
arr = np.array(img)

# Purple baseline line at y=616..617
# Let's see the segments across x
line_row = arr[616, :]
is_purple = (line_row[:, 0] < 120) & (line_row[:, 2] > 70) & (line_row[:, 1] < 100)

import scipy.ndimage as ndi
labeled, num_features = ndi.label(is_purple)
slices = ndi.find_objects(labeled)
print(f"Found {num_features} purple line segments:")
for idx, sl in enumerate(slices):
    x1, x2 = sl[0].start, sl[0].stop
    if x2 - x1 > 20: # filter noise
        cx = (x1 + x2) / 2.0
        mm_cx = cx * (297.0 / 1024.0)
        mm_w = (x2 - x1) * (297.0 / 1024.0)
        print(f"  Segment {idx+1}: x={x1}..{x2} (cx={cx:.1f}px -> {mm_cx:.1f}mm, width={mm_w:.1f}mm)")

# Vertical separators:
is_gold = (arr[605:675, :, 0] > 160) & (arr[605:675, :, 1] > 120) & (arr[605:675, :, 2] < 70)
gold_cols = np.sum(is_gold, axis=0)
labeled_g, num_g = ndi.label(gold_cols > 25)
slices_g = ndi.find_objects(labeled_g)
print(f"Found {num_g} vertical gold separators:")
for idx, sl in enumerate(slices_g):
    x1, x2 = sl[0].start, sl[0].stop
    cx = (x1 + x2) / 2.0
    mm_cx = cx * (297.0 / 1024.0)
    print(f"  Separator {idx+1}: x={cx:.1f}px -> {mm_cx:.1f}mm")
