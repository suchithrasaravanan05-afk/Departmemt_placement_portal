from PIL import Image
import numpy as np

sample = Image.open(r"C:\Users\sivaranjani\.gemini\antigravity-ide\brain\8b02d930-104c-4744-90cd-a4a1cca602a3\.user_uploaded\media_1793206074912.jpg")
print("Size:", sample.size)
print("Format:", sample.format)
print("Mode:", sample.mode)
