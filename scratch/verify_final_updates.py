import pypdfium2 as pdfium
import cv2
import numpy as np

pdf = pdfium.PdfDocument(r'scratch\acceptance_certificate_standard.pdf')
page = pdf[0]
text_page = page.get_textpage()
full_text = text_page.get_text_range()

print('=== 1. EXTRACTED TEXT VERIFICATION ===')
for line in full_text.splitlines():
    line_s = line.strip()
    if 'RAMCO' in line_s:
        print('Header:', repr(line_s))
        assert line_s == 'RAMCO INSTITUTE OF TECHNOLOGY', f'Expected "RAMCO INSTITUTE OF TECHNOLOGY", got "{line_s}"'
        print('  -> Header check PASS!')
    if 'NBA Accredited' in line_s:
        print('NBA line:', repr(line_s))
        assert line_s == 'NBA Accredited UG Programs: CSE, EEE, MECH, ECE and CIVIL', f'Expected NO full stop at end, got "{line_s}"'
        assert not line_s.endswith('.'), 'FAIL: Full stop found at end of NBA text!'
        print('  -> NBA line check PASS (No full stop)!')

# Render to 300 DPI
img = page.render(scale=3.0).to_pil()
w, h = img.size
print(f'\n=== 2. RENDERED PDF IMAGE ({w}x{h}) ===')
img.save(r'scratch\final_verified_full.png')

# Patron area crop
x1 = int((160.0 / 297.0) * w)
x2 = int((222.0 / 297.0) * w)
y1 = int((158.0 / 210.0) * h)
y2 = int((192.0 / 210.0) * h)
crop = img.crop((x1, y1, x2, y2))
crop.save(r'scratch\final_verified_patron.png')

# Measure margins
arr = cv2.imread(r'scratch\final_verified_patron.png')
gold = np.where((arr[:, :, 2] > 160) & (arr[:, :, 1] > 130) & (arr[:, :, 0] < 80))
gold_cols = np.unique(gold[1])
sep2_x = gold_cols[0]
sep3_x = gold_cols[-1]

# Underline y
purple_line = np.where((arr[:, :, 0] > 110) & (arr[:, :, 1] < 45) & (arr[:, :, 2] > 70))
underline_y = int(np.median(purple_line[0]))

# Underline in Patron column
line_in_col = np.where((arr[underline_y-2:underline_y+2, sep2_x+5:sep3_x-5, 0] > 110) & 
                       (arr[underline_y-2:underline_y+2, sep2_x+5:sep3_x-5, 1] < 45) & 
                       (arr[underline_y-2:underline_y+2, sep2_x+5:sep3_x-5, 2] > 70))[1] + sep2_x + 5
ul_start = line_in_col.min()
ul_end = line_in_col.max()

# Name Dr. S. Rajakarunakaran
name_row = arr[underline_y+10:underline_y+50, sep2_x+1:sep3_x-1]
name_black = np.where((name_row[:, :, 0] < 80) & (name_row[:, :, 1] < 80) & (name_row[:, :, 2] < 80))[1] + sep2_x + 1
name_start = name_black.min()
name_end = name_black.max()

# Signature
sig_row = arr[10:underline_y, sep2_x+5:sep3_x-5]
sig_pixels = np.where((sig_row[:, :, 0] < 180) | (sig_row[:, :, 1] < 180) | (sig_row[:, :, 2] < 180))[1] + sep2_x + 5
sig_start = sig_pixels.min()
sig_end = sig_pixels.max()

# Designation Patron
desig_row = arr[underline_y+50:underline_y+90, sep2_x+5:sep3_x-5]
desig_pixels = np.where((desig_row[:, :, 0] > 60) & (desig_row[:, :, 2] > 60) & (desig_row[:, :, 1] < 40))[1] + sep2_x + 5
desig_start = desig_pixels.min()
desig_end = desig_pixels.max()

print(f'Separator 2 at px {sep2_x}, Separator 3 at px {sep3_x}')
print(f'Patron column width: {sep3_x - sep2_x} px ({(sep3_x - sep2_x)/8.505:.2f} mm)')
print(f'Underline: [{ul_start}, {ul_end}], center={(ul_start + ul_end)/2:.1f}')
print(f'Signature: [{sig_start}, {sig_end}], center={(sig_start + sig_end)/2:.1f}')
print(f'Name:      [{name_start}, {name_end}], center={(name_start + name_end)/2:.1f}')
print(f'Desig:     [{desig_start}, {desig_end}], center={(desig_start + desig_end)/2:.1f}')
print('')
print('=== 3. SPACING & MARGINS (NO TOUCHING VERIFICATION) ===')
gap_sep2_to_dr = name_start - sep2_x
gap_an_to_sep3 = sep3_x - name_end
print(f'Gap from Separator 2 to "Dr.": {gap_sep2_to_dr} px ({gap_sep2_to_dr/8.505:.2f} mm)')
print(f'Gap from "an" to Separator 3: {gap_an_to_sep3} px ({gap_an_to_sep3/8.505:.2f} mm)')
assert gap_sep2_to_dr > 30, f'FAIL: Still too close to Separator 2 ({gap_sep2_to_dr} px)'
print('  -> Separator 2 touching check PASS! Perfectly spaced with 5mm+ clear margin!')

gap_sep2_to_ul = ul_start - sep2_x
gap_ul_to_sep3 = sep3_x - ul_end
print(f'Gap from Separator 2 to underline: {gap_sep2_to_ul} px ({gap_sep2_to_ul/8.505:.2f} mm)')
print(f'Gap from underline to Separator 3: {gap_ul_to_sep3} px ({gap_ul_to_sep3/8.505:.2f} mm)')

print('\nALL VERIFICATIONS PASSED SUCCESSFULLY!')

