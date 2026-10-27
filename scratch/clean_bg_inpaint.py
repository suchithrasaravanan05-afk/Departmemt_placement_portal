from PIL import Image
import numpy as np

img = Image.open('C:/Users/sivaranjani/.gemini/antigravity-ide/brain/2e6228c6-d694-4fac-8822-2b351967f85e/.user_uploaded/media_1793080225142.jpg')
arr = np.array(img).astype(float)
h, w, _ = arr.shape

clean = arr.copy()

# 1. Fill the entire central content rectangle unconditionally with the pure gradient
# From X = 110 to 910, Y = 30 to 695
for y in range(30, 696):
    for x in range(110, 915):
        dx = (x - 512.0) / 470.0
        dy = (y - 360.0) / 330.0
        dist = np.sqrt(dx*dx + dy*dy)
        dist = min(dist, 1.0)
        clean[y, x, 0] = 255.0 - dist * 9.0
        clean[y, x, 1] = 255.0 - dist * 17.0
        clean[y, x, 2] = 255.0 - dist * 1.0

# 2. For the margin areas (X: 32 to 110 and X: 915 to 992, Y: 30 to 695):
# Clear the RIT logo area on top-left: X: 32 to 110, Y: 40 to 180
for y in range(40, 180):
    for x in range(32, 110):
        dx = (x - 512.0) / 470.0
        dy = (y - 360.0) / 330.0
        dist = np.sqrt(dx*dx + dy*dy)
        dist = min(dist, 1.0)
        clean[y, x, 0] = 255.0 - dist * 9.0
        clean[y, x, 1] = 255.0 - dist * 17.0
        clean[y, x, 2] = 255.0 - dist * 1.0

# Clear the signature / text areas on lower left & right
# Lower left: X: 32 to 110, Y: 430 to 650
# Lower right: X: 915 to 992, Y: 430 to 650
for y in range(430, 660):
    for x in range(32, 110):
        # sample vertical neighbor outside text at Y=380 or Y=680
        weight = (y - 430.0) / 230.0
        clean[y, x] = arr[410, x] * (1.0 - weight) + arr[670, x] * weight

for y in range(430, 660):
    for x in range(915, 992):
        weight = (y - 430.0) / 230.0
        clean[y, x] = arr[410, x] * (1.0 - weight) + arr[670, x] * weight

out = Image.fromarray(clean.astype(np.uint8))
out.save('frontend/certificate_background.png')
print('Pristine background generated!')
