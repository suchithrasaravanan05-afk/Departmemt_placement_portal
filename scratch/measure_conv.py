import cv2
import numpy as np

img = cv2.imread('scratch/user_uploaded_sig_issue.png')
# Region around Separator 1 (x=50) and Separator 2 (x=227): Convenor
conv_region = img[70:95, 50:227]
black_pixels = np.where((conv_region[:, :, 0] < 80) & (conv_region[:, :, 1] < 80) & (conv_region[:, :, 2] < 80))
cols = black_pixels[1]
print(f'Convenor name text in img: x=[{cols.min() + 50}, {cols.max() + 50}], center={cols.mean() + 50:.1f}')
print(f'Gap from Separator 1 (50) to Convenor start ({cols.min() + 50}): {cols.min()} pixels')
print(f'Gap from Convenor end ({cols.max() + 50}) to Separator 2 (227): {227 - (cols.max() + 50)} pixels')

