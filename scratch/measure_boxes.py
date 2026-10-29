from PIL import Image
import numpy as np

img = Image.open("C:/Users/sivaranjani/.gemini/antigravity-ide/brain/8b02d930-104c-4744-90cd-a4a1cca602a3/.user_uploaded/media_1793263872994.jpg")
w, h = img.size
arr = np.array(img)

# Find college logo bbox (in top left, roughly x=40..180, y=50..180)
# Look at non-white/non-background pixels
crop_logo = arr[50:180, 40:180]
# The logo has distinct orange/red/blue colors
is_logo = (crop_logo[:, :, 0] > 150) & (crop_logo[:, :, 2] < 100) # orange shield
y_idx, x_idx = np.where(is_logo)
print(f"College logo approx: x={x_idx.min()+40}..{x_idx.max()+40}, y={y_idx.min()+50}..{y_idx.max()+50}")
logo_x = (x_idx.min()+40) * 0.285714
logo_y = (y_idx.min()+50) * 0.285714
logo_w = (x_idx.max() - x_idx.min()) * 0.285714
logo_h = (y_idx.max() - y_idx.min()) * 0.285714
print(f"College logo in mm: x={logo_x:.1f}, y={logo_y:.1f}, w={logo_w:.1f}, h={logo_h:.1f}")

# CSBS logo bbox: around center y=180..275, x=300..724
# Dark pixels of the CSBS logo
csbs_area = arr[180:275, 300:724]
is_csbs = (csbs_area[:, :, 0] < 80) & (csbs_area[:, :, 1] < 80) & (csbs_area[:, :, 2] < 80)
cy_idx, cx_idx = np.where(is_csbs)
csbs_x = (cx_idx.min()+300) * 0.285714
csbs_y = (cy_idx.min()+180) * 0.285714
csbs_w = (cx_idx.max() - cx_idx.min()) * 0.285714
csbs_h = (cy_idx.max() - cy_idx.min()) * 0.285714
print(f"CSBS logo approx in px: x={cx_idx.min()+300}..{cx_idx.max()+300}, y={cy_idx.min()+180}..{cy_idx.max()+180}")
print(f"CSBS logo in mm: x={csbs_x:.1f}, y={csbs_y:.1f}, w={csbs_w:.1f}, h={csbs_h:.1f}")

# QR code bbox: around bottom right x=850..980, y=560..680
qr_area = arr[560:680, 850:980]
is_qr = (qr_area[:, :, 0] < 50) & (qr_area[:, :, 1] < 50) & (qr_area[:, :, 2] < 50)
qy_idx, qx_idx = np.where(is_qr)
print(f"QR code approx in px: x={qx_idx.min()+850}..{qx_idx.max()+850}, y={qy_idx.min()+560}..{qy_idx.max()+560}")
print(f"QR code in mm: x={(qx_idx.min()+850)*0.285714:.1f}, y={(qy_idx.min()+560)*0.285714:.1f}, w={(qx_idx.max()-qx_idx.min())*0.285714:.1f}, h={(qy_idx.max()-qy_idx.min())*0.285714:.1f}")
