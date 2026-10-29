from PIL import Image
import numpy as np

img_path = r"C:\Users\sivaranjani\.gemini\antigravity-ide\brain\8b02d930-104c-4744-90cd-a4a1cca602a3\.user_uploaded\media_1793263872994.jpg"
im = Image.open(img_path)
print("Image dimensions:", im.size)
print("Mode:", im.mode)
