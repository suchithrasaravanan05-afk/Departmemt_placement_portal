import pypdfium2 as pdfium
import cv2
import os
import sys

def verify_qr(pdf_path, expected_id):
    if not os.path.exists(pdf_path):
        print(f"Error: {pdf_path} does not exist.")
        return False
    pdf = pdfium.PdfDocument(pdf_path)
    page = pdf[0]
    bitmap = page.render(scale=2.0)
    pil_img = bitmap.to_pil()
    png_path = pdf_path.replace(".pdf", ".png")
    pil_img.save(png_path)
    
    cv_img = cv2.imread(png_path)
    detector = cv2.QRCodeDetector()
    val, pts, _ = detector.detectAndDecode(cv_img)
    print(f"File: {os.path.basename(pdf_path)}")
    print(f"  Expected ID: '{expected_id}'")
    print(f"  Decoded QR:  '{val}'")
    if val == expected_id:
        print("  -> MATCH: QR code accurately decodes to the exact certificate ID!\n")
        return True
    else:
        print(f"  -> MISMATCH: Expected '{expected_id}', got '{val}'\n")
        return False

def main():
    print("==================================================")
    print("   DECODING QR CODES FROM GENERATED CERTIFICATES  ")
    print("==================================================")
    r1 = verify_qr(r"D:\Departmemt_placement_portal\scratch\seq_cert_0001.pdf", "RITCB 01 0001")
    r2 = verify_qr(r"D:\Departmemt_placement_portal\scratch\seq_cert_0002.pdf", "RITCB 01 0002")
    if r1 and r2:
        print("SUCCESS: All QR codes decoded to exact matching IDs!")
        sys.exit(0)
    else:
        print("FAILED: One or more QR codes failed to decode.")
        sys.exit(1)

if __name__ == "__main__":
    main()
