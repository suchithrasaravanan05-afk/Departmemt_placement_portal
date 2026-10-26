from PIL import Image, ImageDraw
import base64
import io

def generate_signatures():
    # 400 x 120 transparent RGBA images for ultra crisp rendering
    width, height = 400, 120

    # 1. Dr. K. Arulraj (navy #1A1A4A)
    im1 = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d1 = ImageDraw.Draw(im1)
    points1 = [
        (40, 90), (60, 30), (80, 70), (100, 40), (120, 85),
        (135, 60), (150, 75), (170, 50), (190, 70), (220, 45),
        (250, 75), (280, 55), (310, 80)
    ]
    underline1 = [(45, 95), (120, 98), (220, 95), (330, 92)]
    d1.line(points1, fill=(26, 26, 74, 240), width=5, joint="curve")
    d1.line(underline1, fill=(26, 26, 74, 220), width=4, joint="curve")

    # 2. Dr. S. Rajakumaran (navy #1A1A4A)
    im2 = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d2 = ImageDraw.Draw(im2)
    points2 = [
        (50, 80), (70, 45), (85, 75), (105, 35), (125, 70),
        (145, 45), (170, 80), (195, 40), (220, 75), (250, 50),
        (280, 75), (320, 60)
    ]
    underline2 = [(40, 92), (140, 96), (260, 94), (335, 88)]
    d2.line(points2, fill=(26, 26, 74, 240), width=5, joint="curve")
    d2.line(underline2, fill=(26, 26, 74, 220), width=4, joint="curve")

    # 3. Dr. S. Rajakarunakaran (navy #1A1A4A)
    im3 = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d3 = ImageDraw.Draw(im3)
    points3 = [
        (45, 85), (65, 40), (80, 80), (100, 35), (120, 85),
        (140, 50), (165, 80), (185, 45), (210, 80), (240, 40),
        (275, 75), (310, 55), (340, 75)
    ]
    underline3 = [(35, 95), (150, 98), (280, 95), (355, 90)]
    d3.line(points3, fill=(26, 26, 74, 240), width=5, joint="curve")
    d3.line(underline3, fill=(26, 26, 74, 220), width=4, joint="curve")

    # 4. Dr. L. Ganesan (teal / sea green #0D9488)
    im4 = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    d4 = ImageDraw.Draw(im4)
    points4 = [
        (60, 80), (75, 30), (95, 70), (115, 35), (135, 80),
        (150, 50), (175, 75), (195, 40), (225, 75), (260, 45),
        (295, 70), (330, 55)
    ]
    underline4 = [(50, 92), (160, 96), (270, 93), (345, 88)]
    d4.line(points4, fill=(13, 148, 136, 240), width=5, joint="curve")
    d4.line(underline4, fill=(13, 148, 136, 220), width=4, joint="curve")

    sigs = {}
    for idx, (name, im) in enumerate([('arulraj', im1), ('rajakumaran', im2), ('rajakarunakaran', im3), ('ganesan', im4)]):
        buf = io.BytesIO()
        im.save(buf, format="PNG")
        b64 = "data:image/png;base64," + base64.b64encode(buf.getvalue()).decode('utf-8')
        sigs[name] = b64

    import json
    with open("scratch/signatures_base64.json", "w") as f:
        json.dump(sigs, f)
    print("Signatures successfully generated into scratch/signatures_base64.json")

if __name__ == "__main__":
    generate_signatures()
