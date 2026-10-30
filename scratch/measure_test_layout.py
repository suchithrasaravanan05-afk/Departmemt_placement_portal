import pypdfium2 as pdfium
import cv2
import numpy as np

pdf = pdfium.PdfDocument(r'scratch\test_new_layout.pdf')
page = pdf[0]
img = page.render(scale=3.0).to_pil()
w, h = img.size
x1 = int((160.0 / 297.0) * w)
x2 = int((220.0 / 297.0) * w)
y1 = int((158.0 / 210.0) * h)
y2 = int((192.0 / 210.0) * h)
crop = img.crop((x1, y1, x2, y2))
crop.save(r'scratch\test_new_layout_patron.png')

arr = cv2.imread(r'scratch\test_new_layout_patron.png')
gold = np.where((arr[:, :, 2] > 160) & (arr[:, :, 1] > 130) & (arr[:, :, 0] < 80))
gold_cols = np.unique(gold[1])
# We expect two separators in this window: Sep 2 and Sep 3
print('Gold separator columns in crop:', gold_cols)
sep2_x = gold_cols[0]
sep3_x = gold_cols[-1]

line_pixels = np.where((arr[:, :, 0] > 110) & (arr[:, :, 1] < 45) & (arr[:, :, 2] > 70))
underline_y = int(np.median(line_pixels[0]))
underline_min_x = line_pixels[1].min()
underline_max_x = line_pixels[1].max()

sig_area = arr[10:underline_y, sep2_x+5:sep3_x-5]
sig_ink = (sig_area[:, :, 0] < 180) | (sig_area[:, :, 1] < 180) | (sig_area[:, :, 2] < 180)
sig_cols = np.where(sig_ink.sum(axis=0) > 3)[0] + sep2_x + 5

name_area = arr[underline_y+10:underline_y+50, sep2_x+1:sep3_x-1]
name_ink = (name_area[:, :, 0] < 80) & (name_area[:, :, 1] < 80) & (name_area[:, :, 2] < 80)
name_cols = np.where(name_ink.sum(axis=0) > 3)[0] + sep2_x + 1

desig_area = arr[underline_y+50:underline_y+90, sep2_x+5:sep3_x-5]
desig_ink = (desig_area[:, :, 0] > 60) & (desig_area[:, :, 2] > 60) & (desig_area[:, :, 1] < 40)
desig_cols = np.where(desig_ink.sum(axis=0) > 3)[0] + sep2_x + 5

print(f'Separator 2 at {sep2_x}, Separator 3 at {sep3_x} (column width = {sep3_x - sep2_x} px = {(sep3_x - sep2_x)/8.505:.2f} mm)')
print(f'Underline: [{underline_min_x}, {underline_max_x}], width={underline_max_x - underline_min_x} px, center={(underline_min_x + underline_max_x)/2:.1f}')
print(f'Signature: [{sig_cols.min()}, {sig_cols.max()}], width={sig_cols.max() - sig_cols.min()} px, center={(sig_cols.min() + sig_cols.max())/2:.1f}')
print(f'Name:      [{name_cols.min()}, {name_cols.max()}], width={name_cols.max() - name_cols.min()} px, center={(name_cols.min() + name_cols.max())/2:.1f}')
print(f'Desig:     [{desig_cols.min()}, {desig_cols.max()}], width={desig_cols.max() - desig_cols.min()} px, center={(desig_cols.min() + desig_cols.max())/2:.1f}')
print('')
print(f'=== MARGINS TO SEPARATORS ===')
print(f'Sep 2 to Name start ("Dr."): {name_cols.min() - sep2_x} px ({(name_cols.min() - sep2_x)/8.505:.2f} mm)')
print(f'Name end ("an") to Sep 3:   {sep3_x - name_cols.max()} px ({(sep3_x - name_cols.max())/8.505:.2f} mm)')
print(f'Sep 2 to Underline:         {underline_min_x - sep2_x} px ({(underline_min_x - sep2_x)/8.505:.2f} mm)')
print(f'Underline to Sep 3:         {sep3_x - underline_max_x} px ({(sep3_x - underline_max_x)/8.505:.2f} mm)')
print(f'Sep 2 to Signature:         {sig_cols.min() - sep2_x} px ({(sig_cols.min() - sep2_x)/8.505:.2f} mm)')
print(f'Signature to Sep 3:         {sep3_x - sig_cols.max()} px ({(sep3_x - sig_cols.max())/8.505:.2f} mm)')

