import io
import os
import qrcode
from PIL import Image, ImageDraw
import cairosvg


def load_logo_image(logo_path, target_size):
    import io
    import os
    import cairosvg
    from PIL import Image

    ext = os.path.splitext(logo_path)[1].lower()

    if ext == ".svg":

        scale = 4  # supersampling factor

        png_bytes = cairosvg.svg2png(
            url=logo_path,
            output_width=target_size * scale,
            output_height=target_size * scale
        )

        logo = Image.open(io.BytesIO(png_bytes)).convert("RGBA")

        # Downscale for sharper result
        logo = logo.resize((target_size, target_size), Image.LANCZOS)

    else:
        logo = Image.open(logo_path).convert("RGBA")
        logo = logo.resize((target_size, target_size), Image.LANCZOS)

    return logo


def generate_qr(url, logo_path, output_path="wifi_qr.png"):

    # Generate QR code
    qr = qrcode.QRCode(
        version=6,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=16,
        border=4,
    )

    qr.add_data(url)
    qr.make(fit=True)

    # Create QR image
    qr_img = qr.make_image(fill_color="black", back_color="white").convert("RGB")
    qr_width, qr_height = qr_img.size

    # Logo size
    logo_size = qr_width // 5

    # Load logo (SVG or raster)
    logo = load_logo_image(logo_path, logo_size)

    # Draw white rectangle behind logo
    draw = ImageDraw.Draw(qr_img)
    pos = ((qr_width - logo_size) // 2, (qr_height - logo_size) // 2)

    rect = [
        pos[0],
        pos[1],
        pos[0] + logo_size,
        pos[1] + logo_size
    ]

    draw.rectangle(rect, fill="white")

    # Paste logo with transparency
    qr_img.paste(logo, pos, mask=logo)

    # Save
    qr_img.save(output_path)

    print(f"QR code saved to {output_path}")


if __name__ == "__main__":
    generate_qr(
        url="https://fipu.unipu.hr/",
        logo_path="./assets/fipu.svg",
        output_path="QR_Code.png"
    )
