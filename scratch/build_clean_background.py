from PIL import Image, ImageDraw, ImageFilter
import numpy as np

img = Image.open('C:/Users/sivaranjani/.gemini/antigravity-ide/brain/2e6228c6-d694-4fac-8822-2b351967f85e/.user_uploaded/media_1793080225142.jpg')
w, h = img.size

# We want a pristine background where:
# - The outer waves and border are preserved
# - The inner text area is cleanly filled with the pale lavender to white gradient
# Inner border is at X: 30 to 994, Y: 25 to 699
# Content area that had text: X: 45 to 980, Y: 40 to 680

# Let's inspect the waves: the waves extend inward from the edges around Y=100..600 up to X=140 on left, and X=880 on right.
# Between X=150 and X=870, Y=45 and Y=675, the background in the reference is a pure subtle radial/linear gradient:
# Center (512, 362) is #FFFFFF (255, 255, 255)
# Top/bottom near inner border is #FAF7FF (250, 247, 255)
# Sides near waves are #F5EEFD (245, 238, 253)

# Let's create the clean inner gradient mask
bg = img.copy()
draw = ImageDraw.Draw(bg)

# Let's generate a smooth 2D gradient for the central content box (X: 170 to 855, Y: 35 to 690)
# and seamlessly blend with the edges
arr = np.array(img).astype(float)
clean_arr = arr.copy()

# In the central area where text was (X: 180 to 845, Y: 45 to 680)
# We can inpaint / replace text pixels with the background color
# Text pixels have darkness (lum < 210)
r, g, b = arr[:,:,0], arr[:,:,1], arr[:,:,2]
lum = 0.299 * r + 0.587 * g + 0.114 * b

# In the text region:
mask = np.zeros((h, w), dtype=bool)
# Institutional header & title & body & signatures
mask[40:685, 45:980] = True

# We want to remove text/logos in the content region, keeping the background gradient
# Compute background by interpolating from non-text pixels
for y in range(35, 690):
    for x in range(40, 985):
        # Calculate radial distance from center (512, 360)
        dx = (x - 512.0) / 470.0
        dy = (y - 360.0) / 330.0
        dist = np.sqrt(dx*dx + dy*dy)
        dist = min(dist, 1.0)
        
        # Color at center: (255, 255, 255)
        # Color at boundary: (246, 238, 254)
        grad_r = 255.0 - dist * 9.0
        grad_g = 255.0 - dist * 17.0
        grad_b = 255.0 - dist * 1.0
        
        # Only replace if inside content area and not the outer wave texture (e.g. x between 180 and 845)
        if 180 <= x <= 845 and 45 <= y <= 680:
            clean_arr[y, x, 0] = grad_r
            clean_arr[y, x, 1] = grad_g
            clean_arr[y, x, 2] = grad_b
        elif (x < 180 or x > 845) and 45 <= y <= 680:
            # Near the sides where the RIT logo was (X: 45 to 175, Y: 45 to 180)
            if 45 <= x <= 175 and 45 <= y <= 180:
                clean_arr[y, x, 0] = grad_r
                clean_arr[y, x, 1] = grad_g
                clean_arr[y, x, 2] = grad_b
            # Where signatures were (Y: 535 to 680)
            elif 535 <= y <= 680 and (45 <= x <= 180 or 845 <= x <= 980):
                clean_arr[y, x, 0] = grad_r
                clean_arr[y, x, 1] = grad_g
                clean_arr[y, x, 2] = grad_b

# Smooth transition
clean_img = Image.fromarray(clean_arr.astype(np.uint8))
clean_img.save('frontend/certificate_background.png')
print('Successfully created frontend/certificate_background.png, size:', clean_img.size)

# Also create base64
import base64
with open('frontend/certificate_background.png', 'rb') as f:
    b64 = base64.b64encode(f.read()).decode('utf-8')
    with open('scratch/bg_base64.txt', 'w') as bf:
        bf.write('data:image/png;base64,' + b64)
print('Background base64 saved, length:', len(b64))
