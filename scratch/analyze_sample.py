import cv2
import numpy as np

sample = cv2.imread(r"C:\Users\sivaranjani\.gemini\antigravity-ide\brain\8b02d930-104c-4744-90cd-a4a1cca602a3\.user_uploaded\media_1793206074912.jpg")
print("Sample dimensions (H, W, C):", sample.shape)

# Let's check the exact colors:
# Outer border color
# Inner border color
# Corner gold bracket
# Let's inspect the corner coordinates:
# Top left corner:
print("Pixel at (15, 15):", sample[15, 15]) # outer margin
print("Outer border top:", np.where(sample[:, 512, 0] < 100)[0][:5])
