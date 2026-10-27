from PIL import Image

img = Image.open('scratch/acceptance_certificate_standard.png')
# Crop around the event paragraph line 1
# Image size is 1754 x 1241.
# y is around 89mm / 210mm * 1241 ≈ 525 px.
crop = img.crop((1200, 500, 1400, 560))
crop.save('scratch/crop_line1.png')
print("Cropped line 1 saved.")
