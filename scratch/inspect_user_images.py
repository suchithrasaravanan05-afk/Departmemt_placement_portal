import cv2

img1 = cv2.imread(r'C:/Users/sivaranjani/.gemini/antigravity/brain/106636e8-b059-4df7-bdd8-821aa691e795/.user_uploaded/media_1793337214066_3402f237.jpg')
img2 = cv2.imread(r'C:/Users/sivaranjani/.gemini/antigravity/brain/106636e8-b059-4df7-bdd8-821aa691e795/.user_uploaded/media_1793337255288_1b9fc71b.png')
img3 = cv2.imread(r'C:/Users/sivaranjani/.gemini/antigravity/brain/106636e8-b059-4df7-bdd8-821aa691e795/.user_uploaded/media_1793337544997_10216794.jpg')

print('img1 shape:', img1.shape if img1 is not None else 'None')
print('img2 shape:', img2.shape if img2 is not None else 'None')
print('img3 shape:', img3.shape if img3 is not None else 'None')

if img2 is not None:
    cv2.imwrite('scratch/user_uploaded_sig_issue.png', img2)

