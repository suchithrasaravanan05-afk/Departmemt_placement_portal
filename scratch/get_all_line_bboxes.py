from PIL import Image
import numpy as np

img = Image.open("C:/Users/sivaranjani/.gemini/antigravity-ide/brain/8b02d930-104c-4744-90cd-a4a1cca602a3/.user_uploaded/media_1793263872994.jpg")
arr = np.array(img)

def get_line_bbox(y1, y2, x1=50, x2=974):
    sub = arr[y1:y2, x1:x2]
    is_dark = (sub[:, :, 0] < 120) & (sub[:, :, 1] < 120) & (sub[:, :, 2] < 120)
    ys, xs = np.where(is_dark)
    if len(xs) == 0:
        return None
    min_x = xs.min() + x1
    max_x = xs.max() + x1
    min_y = ys.min() + y1
    max_y = ys.max() + y1
    return min_x, min_y, max_x, max_y

print("Top Header:", get_line_bbox(60, 90))
print("An Autonomous Institution:", get_line_bbox(90, 115))
print("Approval:", get_line_bbox(118, 136))
print("NAAC:", get_line_bbox(138, 156))
print("NBA:", get_line_bbox(158, 178))
print("Certificate of Participation:", get_line_bbox(270, 320))
print("This is to certify that:", get_line_bbox(360, 385))
print("Participant Name:", get_line_bbox(400, 435))
print("Desc Line 1:", get_line_bbox(455, 477))
print("Desc Line 2:", get_line_bbox(485, 512))
print("Desc Line 3:", get_line_bbox(515, 542))
print("Desc Line 4:", get_line_bbox(545, 570))

# Signatures baseline and text boxes
print("Signature Baselines:", get_line_bbox(610, 622))
print("Signatory Names:", get_line_bbox(624, 642))
print("Signatory Roles:", get_line_bbox(645, 670))
