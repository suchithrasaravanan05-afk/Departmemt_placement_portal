from PIL import Image
import numpy as np

def create_perfect_bg():
    img = Image.open('C:/Users/sivaranjani/.gemini/antigravity-ide/brain/2e6228c6-d694-4fac-8822-2b351967f85e/.user_uploaded/media_1793080225142.jpg')
    arr = np.array(img).astype(float)
    h, w, _ = arr.shape
    clean = arr.copy()

    # The inner border rectangle is:
    # Top inner border line: y ≈ 25
    # Bottom inner border line: y ≈ 698
    # Left inner border line: x ≈ 37
    # Right inner border line: x ≈ 987
    
    # In the reference image, the central area where text, logos, and signatures live is:
    # X from 105 to 975, Y from 35 to 690.
    # Note: On the left, the wavy ribbons extend from x=0 up to x=105 between y=150 and y=420.
    # To the right of x=105 (and even on the right edge up to x=975), the background is a smooth,
    # uniform pure academic off-white/lavender: RGB [254, 253, 255] or [253, 252, 254].
    
    # Let's inspect the exact background color around the edges of the content area:
    # Top margin (y=34, x=512): arr[34, 512]
    # Center (y=360, x=512): arr[360, 512]
    # Right margin (y=360, x=950): arr[360, 950]
    
    # We fill the content area X: 110 to 975, Y: 32 to 690 with a smooth seamless gradient:
    bg_color = np.array([254.0, 253.0, 255.0])
    
    for y in range(32, 692):
        for x in range(115, 975):
            # Very subtle gradient from center (255, 254, 255) to edges (252, 248, 254)
            dx = (x - 512.0) / 460.0
            dy = (y - 360.0) / 330.0
            dist = min(np.sqrt(dx*dx + dy*dy), 1.0)
            clean[y, x, 0] = 255.0 - dist * 2.0
            clean[y, x, 1] = 254.0 - dist * 4.0
            clean[y, x, 2] = 255.0 - dist * 1.0

    # Smooth transition on the left boundary: x from 95 to 115
    for y in range(32, 692):
        for x in range(95, 115):
            alpha = (x - 95.0) / 20.0
            # Target color
            dx = (x - 512.0) / 460.0
            dy = (y - 360.0) / 330.0
            dist = min(np.sqrt(dx*dx + dy*dy), 1.0)
            target = np.array([255.0 - dist * 2.0, 254.0 - dist * 4.0, 255.0 - dist * 1.0])
            clean[y, x] = arr[y, x] * (1.0 - alpha) + target * alpha

    # Smooth transition on the right boundary: x from 975 to 985
    for y in range(32, 692):
        for x in range(975, 986):
            alpha = (985.0 - x) / 10.0
            dx = (x - 512.0) / 460.0
            dy = (y - 360.0) / 330.0
            dist = min(np.sqrt(dx*dx + dy*dy), 1.0)
            target = np.array([255.0 - dist * 2.0, 254.0 - dist * 4.0, 255.0 - dist * 1.0])
            clean[y, x] = arr[y, x] * (1.0 - alpha) + target * alpha

    # Clear RIT Logo area on upper left (x: 40 to 110, y: 40 to 180)
    for y in range(40, 180):
        for x in range(40, 115):
            clean[y, x] = np.array([254.0, 252.0, 255.0])

    # Clear Leftmost signature area (x: 40 to 115, y: 520 to 650)
    for y in range(520, 650):
        for x in range(40, 115):
            clean[y, x] = np.array([254.0, 251.0, 255.0])

    out = Image.fromarray(clean.astype(np.uint8))
    out.save('frontend/certificate_background.png')
    print('Perfect seamless background generated!')

if __name__ == '__main__':
    create_perfect_bg()
