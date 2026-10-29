from PIL import Image
import numpy as np

img = Image.open("C:/Users/sivaranjani/.gemini/antigravity-ide/brain/8b02d930-104c-4744-90cd-a4a1cca602a3/.user_uploaded/media_1793263872994.jpg")
w, h = img.size # 1024, 735
# mm per px:
mm_per_px_x = 297.0 / 1024.0
mm_per_px_y = 210.0 / 735.0

# Let's inspect the baseline of each row by finding the lowest row with dark pixels before a gap
arr = np.array(img)

# Detailed analysis of Signatures Section:
# Signatures section is x=30..880, y=600..680
sigs_area = arr[600:680, 30:880]

# Let's find vertical separators:
# Vertical separators are vertical gold lines around y=605..675
# Gold color in RGB is roughly r > 180, g > 130, b < 60
is_gold_line = (arr[605:675, :, 0] > 170) & (arr[605:675, :, 1] > 130) & (arr[605:675, :, 2] < 70)
gold_cols = np.where(np.sum(is_gold_line, axis=0) > 40)[0]
print("Gold separator vertical line column x-coordinates in px:", gold_cols)
# In mm:
for c in gold_cols:
    print(f"  Col {c}px -> {c * mm_per_px_x:.1f} mm")

# Let's find the signature baseline lines:
# Purple baseline line: r around 40-90, g around 10-40, b around 80-140
is_purple_line = (arr[610:622, :, 0] < 100) & (arr[610:622, :, 2] > 60)
purple_line_rows = np.where(np.sum(is_purple_line, axis=1) > 200)[0]
print("Signature purple baseline row y in px:", purple_line_rows + 610)
baseline_y_mm = (purple_line_rows[0] + 610) * mm_per_px_y
print(f"Baseline line Y in mm: {baseline_y_mm:.1f} mm")
