import pypdfium2 as pdfium
import cv2

def verify_all():
    # 1. Template
    pdf_tmpl = pdfium.PdfDocument(r"D:\Departmemt_placement_portal\scratch\acceptance_certificate_template.pdf")
    img_tmpl = pdf_tmpl[0].render(scale=2.0).to_pil()
    img_tmpl.save(r"D:\Departmemt_placement_portal\scratch\acceptance_template_verified.png")
    print("Saved acceptance_template_verified.png")

    # 2. Standard (Keerthana Mohan)
    pdf_std = pdfium.PdfDocument(r"D:\Departmemt_placement_portal\scratch\acceptance_certificate_standard.pdf")
    img_std = pdf_std[0].render(scale=2.0).to_pil()
    img_std.save(r"D:\Departmemt_placement_portal\scratch\acceptance_standard_verified.png")
    print("Saved acceptance_standard_verified.png")

    # QR Code test
    detector = cv2.QRCodeDetector()
    cv_img = cv2.imread(r"D:\Departmemt_placement_portal\scratch\acceptance_standard_verified.png")
    val, _, _ = detector.detectAndDecode(cv_img)
    print(f"Decoded QR payload: '{val}'")
    assert val == "RITCB 01 0001", f"QR payload mismatch: {val}"
    print("ALL VERIFICATIONS PASSED!")

if __name__ == "__main__":
    verify_all()
