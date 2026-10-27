from PIL import Image
import numpy as np

def make_clean_bg():
    img = Image.open('C:/Users/sivaranjani/.gemini/antigravity-ide/brain/2e6228c6-d694-4fac-8822-2b351967f85e/.user_uploaded/media_1793080225142.jpg')
    arr = np.array(img).astype(float)
    clean = arr.copy()

    # The background color inside the border is a subtle radial gradient:
    # Center: [255, 254, 255], edges: [251, 246, 254]
    def get_bg(x, y):
        dx = (x - 512.0) / 470.0
        dy = (y - 360.0) / 330.0
        dist = min(np.sqrt(dx*dx + dy*dy), 1.0)
        return np.array([255.0 - dist * 4.0, 254.0 - dist * 8.0, 255.0 - dist * 2.0])

    # 1. Clear top area (RIT logo, header, CSBS logo): X: 38 to 986, Y: 28 to 250
    for y in range(28, 250):
        for x in range(38, 986):
            clean[y, x] = get_bg(x, y)

    # 2. Clear center content (Title, student name): X: 95 to 986, Y: 250 to 420
    # Note: On the left (X: 38 to 95, Y: 250 to 420) is where the wavy lavender ribbon flows.
    for y in range(250, 420):
        for x in range(95, 986):
            clean[y, x] = get_bg(x, y)

    # 3. Clear bottom content (Event paragraph, all 6 signatures, footer ID): X: 38 to 986, Y: 420 to 696
    for y in range(420, 696):
        for x in range(38, 986):
            clean[y, x] = get_bg(x, y)

    out = Image.fromarray(clean.astype(np.uint8))
    out.save('frontend/certificate_background.png')
    print("Clean background created without any text ghosting!")

if __name__ == '__main__':
    make_clean_bg()
