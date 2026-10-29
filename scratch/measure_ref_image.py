from PIL import Image
import numpy as np

img_path = r"C:\Users\sivaranjani\.gemini\antigravity-ide\brain\8b02d930-104c-4744-90cd-a4a1cca602a3\.user_uploaded\media_1793263872994.jpg"
im = Image.open(img_path)
w, h = im.size

# Let's crop various areas and find bounding boxes and vertical positions
# 1. Top header
# 2. Institutional details
# 3. CSBS logo
# 4. Title
# 5. Divider
# 6. Preamble
# 7. Participant Name
# 8. Description lines
# 9. Signatures section
# 10. QR code

print(f"Image width={w}, height={h}")

# Save cropped sections to inspect
im.crop((0, 0, w, int(h * 0.35))).save("scratch/ref_top.png")
im.crop((0, int(h * 0.25), w, int(h * 0.55))).save("scratch/ref_middle_title_name.png")
im.crop((0, int(h * 0.50), w, int(h * 0.72))).save("scratch/ref_middle_desc.png")
im.crop((0, int(h * 0.70), w, h)).save("scratch/ref_bottom_sigs.png")
print("Saved cropped sections to scratch/")
