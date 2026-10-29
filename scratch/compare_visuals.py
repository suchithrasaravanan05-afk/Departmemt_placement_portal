from PIL import Image
import numpy as np

# Load user reference image and our rendered prototype image
ref = Image.open("C:/Users/sivaranjani/.gemini/antigravity-ide/brain/8b02d930-104c-4744-90cd-a4a1cca602a3/.user_uploaded/media_1793263872994.jpg")
proto = Image.open("scratch/prototype_exact.png")

# Resize both to exact same size: 1024 x 724 (or 1684 x 1191)
ref_resized = ref.resize(proto.size, Image.Resampling.LANCZOS)

# Create a side-by-side comparison image: width * 2, height
comparison = Image.new("RGB", (proto.width * 2, proto.height))
comparison.paste(ref_resized, (0, 0))
comparison.paste(proto, (proto.width, 0))
comparison.save("scratch/side_by_side_comparison.png")
print("Saved side-by-side comparison to scratch/side_by_side_comparison.png")

# Also create a 50/50 blend / difference image to check alignment
diff = Image.blend(ref_resized, proto, 0.5)
diff.save("scratch/blend_comparison.png")
print("Saved blend comparison to scratch/blend_comparison.png")
