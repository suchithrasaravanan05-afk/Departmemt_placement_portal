from PIL import Image
import numpy as np

img = Image.open('C:/Users/sivaranjani/.gemini/antigravity-ide/brain/2e6228c6-d694-4fac-8822-2b351967f85e/.user_uploaded/media_1793080225142.jpg')
arr = np.array(img)

# Let's inspect the right edge: rows 200, 360, 500 across x=900..1024
print("Row 360 (middle row):")
for x in range(900, 1024, 10):
    print(f"x={x}: {arr[360, x]}")

print("\nRow 100 (top edge):")
for x in range(900, 1024, 10):
    print(f"x={x}: {arr[100, x]}")

print("\nRow 600 (bottom edge):")
for x in range(900, 1024, 10):
    print(f"x={x}: {arr[600, x]}")
