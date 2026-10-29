from PIL import Image
import numpy as np

img = Image.open("C:/Users/sivaranjani/.gemini/antigravity-ide/brain/8b02d930-104c-4744-90cd-a4a1cca602a3/.user_uploaded/media_1793263872994.jpg")
w, h = img.size # 1024 x 735

# Let's crop and measure specific elements
# A4 width = 297mm, height = 210mm
# 1px = 297 / 1024 mm = 0.2900 mm (width)
# 1px = 210 / 735 mm = 0.2857 mm (height)
# 1 pt = 1/72 inch = 25.4 / 72 mm = 0.3528 mm
# So 1px height = 0.2857 mm = 0.81 pt!
# Thus: pt = px * 0.81 (or font size in pt ~= px * 0.81)

# Let's measure:
# 1. College Logo (top-left)
# 2. Main Header: "RAMCO INSTITUTE OF TECHNOLOGY, RAJAPALAYAM"
# 3. "(An Autonomous Institution)"
# 4. Accreditation 3 lines
# 5. CSBS Logo
# 6. "CERTIFICATE OF PARTICIPATION"
# 7. Divider
# 8. "This is to certify that"
# 9. "REEMA DANEEN S S"
# 10. 4 lines of description
# 11. Signatures line y, names y, roles y, vertical separators x & y
# 12. QR code position & size, and the ID capsule below it!

# Notice in media_1793263872994.jpg:
# Under the QR code is a rounded capsule or border with text "RIT-STTP-2026-F1F4"!
# Let's check the bottom right QR code area in media_1793263872994.jpg!

qr_crop = img.crop((850, 560, 1000, 700))
qr_crop.save("scratch/ref_qr_crop.png")

divider_crop = img.crop((300, 320, 724, 355))
divider_crop.save("scratch/ref_divider_crop.png")

sigs_crop = img.crop((30, 580, 880, 700))
sigs_crop.save("scratch/ref_sigs_crop.png")

desc_crop = img.crop((60, 445, 964, 585))
desc_crop.save("scratch/ref_desc_crop.png")

name_crop = img.crop((200, 390, 824, 445))
name_crop.save("scratch/ref_name_crop.png")

header_crop = img.crop((40, 40, 984, 185))
header_crop.save("scratch/ref_header_crop.png")

csbs_crop = img.crop((300, 180, 724, 275))
csbs_crop.save("scratch/ref_csbs_crop.png")

print("Cropped all reference areas successfully!")
