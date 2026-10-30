import cv2
import base64
import numpy as np
import pypdfium2 as pdfium
import subprocess

# Let's inspect the new template background
bg = cv2.imread(r'frontend\certificate_background.png')
print('New template background shape:', bg.shape)
cv2.imwrite(r'scratch\new_template_preview.png', bg)
print('Saved scratch/new_template_preview.png')

