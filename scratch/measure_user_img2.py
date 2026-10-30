import cv2
import numpy as np

img = cv2.imread('scratch/user_uploaded_sig_issue.png')
h, w, _ = img.shape
print(f'User uploaded sig crop size: {w}x{h}')

# Let's find vertical lines in img:
# Gold lines:
# Search for yellowish/gold columns with consistent color:
gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
edges = cv2.Canny(gray, 50, 150)
lines = cv2.HoughLinesP(edges, 1, np.pi/180, 40, minLineLength=40, maxLineGap=5)
if lines is not None:
    for line in lines:
        x1, y1, x2, y2 = line[0]
        if abs(x1 - x2) <= 2:
            print(f'V-line at x={x1}, y=[{y1}, {y2}], len={abs(y2-y1)}')

