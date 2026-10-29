import pypdfium2 as pdfium
from PIL import Image

doc = pdfium.PdfDocument("scratch/test_final_design.pdf")
page = doc[0]
bitmap = page.render(scale=2.0)
pil_image = bitmap.to_pil()
pil_image.save("scratch/test_final_design.png")
print("Rendered to scratch/test_final_design.png:", pil_image.size)

# Create side by side comparison with user's uploaded reference image
ref = Image.open("C:/Users/sivaranjani/.gemini/antigravity-ide/brain/8b02d930-104c-4744-90cd-a4a1cca602a3/.user_uploaded/media_1793263872994.jpg")
ref_resized = ref.resize(pil_image.size, Image.Resampling.LANCZOS)

comp = Image.new("RGB", (pil_image.width * 2, pil_image.height))
comp.paste(ref_resized, (0, 0))
comp.paste(pil_image, (pil_image.width, 0))
comp.save("scratch/final_side_by_side.png")
print("Saved comparison to scratch/final_side_by_side.png")
