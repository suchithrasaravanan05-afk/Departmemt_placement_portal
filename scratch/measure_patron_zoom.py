import cv2
import numpy as np

img = cv2.imread('scratch/user_uploaded_sig_issue.png')
# Region around Separator 2 and Patron:
patron_region = img[:, 220:410]
cv2.imwrite('scratch/user_patron_zoom.png', patron_region)

# Separator 2 is at x=227 in img
# Let's see the text "Dr. S. Rajakarunakaran":
# In patron_region, Separator 2 is at x = 7
# Let's find black text pixels in patron_region around y in [70, 95] (name)
name_row = patron_region[70:95, :]
black_pixels = np.where((name_row[:, :, 0] < 80) & (name_row[:, :, 1] < 80) & (name_row[:, :, 2] < 80))
cols = black_pixels[1]
print(f'Separator 2 in patron_region is at x=7 (img x=227)')
print(f'Name text in patron_region: x=[{cols.min()}, {cols.max()}], center={cols.mean():.1f}')
print(f'In full image coords, name is: [{cols.min() + 220}, {cols.max() + 220}]')
print(f'Notice cols.min() is {cols.min()} vs Separator 2 at 7! Difference: {cols.min() - 7} pixels!')

# Underline y in [55, 65]
line_row = patron_region[55:65, :]
line_pixels = np.where((line_row[:, :, 0] > 100) & (line_row[:, :, 1] < 50) & (line_row[:, :, 2] > 60))
lcols = line_pixels[1]
print(f'Underline in patron_region: x=[{lcols.min()}, {lcols.max()}], center={lcols.mean():.1f}')
print(f'Underline start ({lcols.min()}) vs Separator 2 (7): {lcols.min() - 7} pixels')

# Designation "Patron" in [95, 120]
desig_row = patron_region[95:120, :]
desig_pixels = np.where((desig_row[:, :, 0] > 50) & (desig_row[:, :, 2] > 50) & (desig_row[:, :, 1] < 40))
dcols = desig_pixels[1]
print(f'Designation in patron_region: x=[{dcols.min()}, {dcols.max()}], center={dcols.mean():.1f}')
print(f'Separator 3 in patron_region: x = {396 - 220} = 176')

