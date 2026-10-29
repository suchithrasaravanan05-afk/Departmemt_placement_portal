import pypdfium2 as pdfium
import cv2

doc = pdfium.PdfDocument("scratch/prototype_exact.pdf")
page = doc[0]
bitmap = page.render(scale=2.0)
pil_image = bitmap.to_pil()
pil_image.save("scratch/prototype_exact.png")
print("Rendered prototype to scratch/prototype_exact.png:", pil_image.size)
