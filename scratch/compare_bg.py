from PIL import Image
import numpy as np

ref = Image.open("C:/Users/sivaranjani/.gemini/antigravity-ide/brain/8b02d930-104c-4744-90cd-a4a1cca602a3/.user_uploaded/media_1793263872994.jpg")
curr_bg = Image.open("scratch/a4_bg_clean.png")

print("Ref size:", ref.size)
print("Current bg size:", curr_bg.size)
