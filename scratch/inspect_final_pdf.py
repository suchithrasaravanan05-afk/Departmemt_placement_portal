import pypdfium2 as pdfium
import os
from PIL import Image

def inspect_pdf():
    pdf_path = r"d:\Departmemt_placement_portal\scratch\acceptance_certificate_standard.pdf"
    pdf = pdfium.PdfDocument(pdf_path)
    print(f"Page count: {len(pdf)}")
    page = pdf[0]
    width_pt, height_pt = page.get_size()
    width_mm = width_pt * 25.4 / 72.0
    height_mm = height_pt * 25.4 / 72.0
    print(f"Page size (pt): {width_pt:.2f} x {height_pt:.2f}")
    print(f"Page size (mm): {width_mm:.2f} x {height_mm:.2f}")
    
    # Verify A4 Landscape (297 mm x 210 mm)
    is_a4 = abs(width_mm - 297.0) < 1.0 and abs(height_mm - 210.0) < 1.0
    print(f"Is A4 Landscape: {is_a4}")

    # Render at 150 DPI for crisp visual inspection
    bitmap = page.render(scale=150/72)
    pil_image = bitmap.to_pil()
    out_png = r"d:\Departmemt_placement_portal\scratch\acceptance_certificate_standard.png"
    pil_image.save(out_png)
    print(f"Rendered image saved to {out_png} (size: {pil_image.size})")

    # Render long name PDF as well
    long_pdf_path = r"d:\Departmemt_placement_portal\scratch\acceptance_certificate_long.pdf"
    long_pdf = pdfium.PdfDocument(long_pdf_path)
    long_page = long_pdf[0]
    long_bitmap = long_page.render(scale=150/72)
    long_pil = long_bitmap.to_pil()
    long_png = r"d:\Departmemt_placement_portal\scratch\acceptance_certificate_long.png"
    long_pil.save(long_png)
    print(f"Long name rendered image saved to {long_png} (size: {long_pil.size})")

if __name__ == "__main__":
    inspect_pdf()
