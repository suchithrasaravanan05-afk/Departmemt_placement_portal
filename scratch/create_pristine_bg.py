from PIL import Image
import numpy as np

# Let's create a 100% seamless background from media_1793263872994.jpg:
# Dimensions: 2048 x 1470 (or 2048 x 1448)
ref = Image.open("C:/Users/sivaranjani/.gemini/antigravity-ide/brain/8b02d930-104c-4744-90cd-a4a1cca602a3/.user_uploaded/media_1793263872994.jpg")
w, h = ref.size # 1024, 735

# In ref, where is text/content vs background?
# Outer border: x=18..1006, y=14..721
# Content area:
# Header text: x=180..900, y=60..180
# CSBS logo: x=340..680, y=190..270
# Title & Divider: x=100..924, y=270..360
# Preamble & Name: x=200..824, y=360..440
# Description: x=80..940, y=450..575
# Sigs & QR: y=605..680
# Notice that the background in the central rectangle (x=160..864, y=50..670) is a clean, uniform pale lavender gradient:
# Color at (512, 100) is #FEFCFF
# Color at (512, 400) is #FFFFFF
# Color at (512, 600) is #FAF7FF
#
# The decorative borders, gold corner trims, and flowing purple/lavender waves are in:
# Top border: y=0..60
# Bottom border: y=675..735
# Left border: x=0..80
# Right border: x=944..1024
# Top-left waves: x=0..250, y=0..200
# Top-right waves: x=750..1024, y=0..200
# Bottom-left waves: x=0..250, y=550..735
# Bottom-right waves: x=750..1024, y=550..735

# Let's take the ref image and carefully clean out only the text, logos, signatures, and QR code,
# while preserving ALL the outer border, corner ornaments, corner waves, and subtle gradient!

ref_clean = ref.copy()
# Create canvas at 2x resolution: 2048 x 1470
ref_2x = ref.resize((2048, 1470), Image.Resampling.LANCZOS)
arr_2x = np.array(ref_2x)

# Let's inspect the central content area in 2x:
# x: from 320 to 1728
# y: from 100 to 1340
# In this central area, generate a smooth vertical gradient matching the reference:
# Top (y=100) is rgb(253, 250, 255)
# Middle (y=735) is rgb(255, 255, 255)
# Bottom (y=1340) is rgb(250, 247, 254)

# Let's check how the logo was in top-left:
# College logo was at x=80..308, y=100..258 in 2x
# Behind the college logo, the purple waves flow smoothly from top-left (0,0) down to (300, 300)
# We can inpaint or blend smoothly so there is no white box!

from PIL import ImageDraw

# Create smooth central background
bg_clean = ref_2x.copy()
draw = ImageDraw.Draw(bg_clean)

# The content rectangle to clear:
# x: 340 to 1700
# y: 110 to 1350
# Let's fill the central text area with the gradient
for y in range(110, 1350):
    if y < 735:
        t = (y - 110) / (735 - 110)
        # Interpolate from (253, 250, 255) to (255, 255, 255)
        r = int(253 + (255 - 253) * t)
        g = int(250 + (255 - 250) * t)
        b = int(255 + (255 - 255) * t)
    else:
        t = (y - 735) / (1350 - 735)
        # Interpolate from (255, 255, 255) to (250, 247, 254)
        r = int(255 + (250 - 255) * t)
        g = int(255 + (247 - 255) * t)
        b = int(255 + (254 - 255) * t)
    draw.line([(340, y), (1700, y)], fill=(r, g, b))

# Also clear the area where the logo was: x=80..320, y=100..260
# On ref_2x, the logo is at x=80..308, y=100..258.
# Let's fill it with the gentle lavender gradient:
for y in range(100, 260):
    t = (y - 100) / 160.0
    r = int(252 + (254 - 252) * t)
    g = int(249 + (252 - 249) * t)
    b = int(255)
    draw.line([(80, y), (340, y)], fill=(r, g, b))

# Also clear the signature baseline & names area: x=90..1700, y=1200..1360
for y in range(1200, 1360):
    t = (y - 1200) / 160.0
    r = int(252 + (249 - 252) * t)
    g = int(249 + (246 - 249) * t)
    b = int(255 + (253 - 255) * t)
    draw.line([(90, y), (1720, y)], fill=(r, g, b))

# Also clear the QR code area: x=1700..1960, y=1130..1360
for y in range(1130, 1360):
    t = (y - 1130) / 230.0
    r = int(252 + (249 - 252) * t)
    g = int(249 + (246 - 249) * t)
    b = int(255 + (253 - 255) * t)
    draw.line([(1700, y), (1960, y)], fill=(r, g, b))

# Resize to exact A4 2048 x 1448
bg_clean_a4 = bg_clean.resize((2048, 1448), Image.Resampling.LANCZOS)
bg_clean_a4.save("scratch/a4_bg_clean.png")
print("Saved pristine 2048x1448 background to scratch/a4_bg_clean.png!")
