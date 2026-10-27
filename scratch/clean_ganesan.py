from PIL import Image
import numpy as np

def clean_ganesan():
    img = Image.open(r"d:\Departmemt_placement_portal\frontend\signature\ganesan.png").convert("RGBA")
    arr = np.array(img)
    # The signature is mainly in the lower-central part of the box.
    # Any pixels with y < 25 or x > 85 with faint alpha should be cleared.
    for y in range(arr.shape[0]):
        for x in range(arr.shape[1]):
            # If in top 28 rows, clear
            if y < 28:
                arr[y, x, 3] = 0
            # If faint alpha (< 50) anywhere, clear
            elif arr[y, x, 3] < 50:
                arr[y, x, 3] = 0
    
    cleaned = Image.fromarray(arr)
    cleaned.save(r"d:\Departmemt_placement_portal\frontend\signature\ganesan.png")
    print("Cleaned ganesan.png successfully.")

if __name__ == "__main__":
    clean_ganesan()
