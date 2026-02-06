import qrcode
from PIL import Image, ImageDraw

def generate_qr(url,logo_path="logo.png", output_path="wifi_qr.png"):

    # Generate QR code
    qr = qrcode.QRCode(
        version=6,  # bigger version to allow for central logo space
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(url)
    qr.make(fit=True)

    # Create QR image
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_width, qr_height = qr_img.size

    # Load logo
    logo = Image.open(logo_path)
    logo_size = qr_width // 4
    logo = logo.resize((logo_size, logo_size), Image.LANCZOS)

    # Make a white rectangle in the middle where the logo will go
    draw = ImageDraw.Draw(qr_img)
    pos = ((qr_width - logo_size) // 2, (qr_height - logo_size) // 2)
    rect = [pos[0], pos[1], pos[0] + logo_size, pos[1] + logo_size]
    draw.rectangle(rect, fill="white")

    # Paste logo in the reserved space
    qr_img.paste(logo, pos, mask=logo if logo.mode == "RGBA" else None)

    # Save result
    qr_img.save(output_path)
    print(f"QR code saved to {output_path}")

if __name__ == "__main__":
    generate_qr(
        url="https://fipu.unipu.hr/",
        logo_path="./assets/FIPU-logoQR.png",
        output_path="QR_Code.png"
    )
