import pypdfium2 as pdfium
import cv2
import numpy as np

def verify_certificate():
    pdf_path = r"D:\Departmemt_placement_portal\scratch\acceptance_certificate_standard.pdf"
    pdf = pdfium.PdfDocument(pdf_path)
    page = pdf[0]
    bitmap = page.render(scale=2.0)
    pil_image = bitmap.to_pil()
    png_path = r"D:\Departmemt_placement_portal\scratch\verified_cert_preview.png"
    pil_image.save(png_path)
    print(f"Rendered image saved to {png_path} ({pil_image.width}x{pil_image.height})")

    # QR code detection
    img_cv = cv2.imread(png_path)
    detector = cv2.QRCodeDetector()
    val, pts, _ = detector.detectAndDecode(img_cv)
    print(f"QR Code Detected Value: '{val}'")

    if val == "RITCB 01 0001":
        print("SUCCESS: Plain-text QR payload matches 'RITCB 01 0001' exactly, no URLs!")
    else:
        print(f"WARNING: Unexpected QR payload: {val}")

if __name__ == "__main__":
    verify_certificate()
