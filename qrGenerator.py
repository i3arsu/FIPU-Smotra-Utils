import qrcode
import xml.etree.ElementTree as ET
from xml.dom import minidom
import base64
import mimetypes
import os
from PIL import Image

# Try importing CairoSVG for PNG export support
try:
    import cairosvg
    CAIRO_AVAILABLE = True
except OSError:
    print("Warning: CairoSVG system libraries not found. PNG export will be skipped.")
    CAIRO_AVAILABLE = False
except ImportError:
    print("Warning: CairoSVG python library not found. PNG export will be skipped.")
    CAIRO_AVAILABLE = False

def get_logo_aspect_ratio(logo_path):
    """
    Determines aspect ratio (width/height) of the logo.
    """
    ext = os.path.splitext(logo_path)[1].lower()
    
    if ext == ".svg":
        # Parse SVG to find viewBox or width/height
        try:
            tree = ET.parse(logo_path)
            root = tree.getroot()
            # Simple heuristic: often viewBox="0 0 W H"
            viewbox = root.get('viewBox')
            if viewbox:
                _, _, w, h = map(float, viewbox.split())
                return w / h
            # If no viewBox, try width/height attributes
            w = float(root.get('width').replace('px', ''))
            h = float(root.get('height').replace('px', ''))
            return w / h
        except:
            return 1.0 # Default to square if parsing fails
            
    else:
        # Use Pillow for PNG/JPG
        with Image.open(logo_path) as img:
            return img.width / img.height

def generate_qr(
    data,
    logo_path,
    output_name="qr_code",
    logo_size_ratio=0.25,
    export_png=False
):
    # 1. Setup QR Matrix
    qr = qrcode.QRCode(
        version=None,
        error_correction=qrcode.constants.ERROR_CORRECT_H,
        box_size=10,
        border=4,
    )
    qr.add_data(data)
    qr.make(fit=True)
    matrix = qr.get_matrix()
    row_count = len(matrix)
    col_count = len(matrix[0])
    
    # 2. Calculate Logo Geometry
    module_size = 10 
    total_size = row_count * module_size
    
    # Calculate how many modules (dots) the logo covers
    logo_module_span = int(row_count * logo_size_ratio)
    
    # Center logic
    center = row_count // 2
    half_span = logo_module_span // 2
    
    start_idx = center - half_span
    end_idx = center + half_span
    
    # "Safe Zone" pixel coordinates for the logo
    logo_x = start_idx * module_size
    logo_y = start_idx * module_size
    logo_w = (end_idx - start_idx) * module_size
    logo_h = (end_idx - start_idx) * module_size

    # 3. Build SVG XML
    root = ET.Element('svg', {
        'xmlns': "http://www.w3.org/2000/svg",
        'xmlns:xlink': "http://www.w3.org/1999/xlink", # Needed for PNG embedding
        'version': "1.1",
        'width': str(total_size),
        'height': str(total_size),
        'viewBox': f"0 0 {total_size} {total_size}"
    })

    # Background
    ET.SubElement(root, 'rect', {
        'x': '0', 'y': '0', 'width': str(total_size), 'height': str(total_size), 'fill': 'white'
    })

    # QR Modules
    qr_group = ET.SubElement(root, 'g', {'fill': 'black'})
    for r in range(row_count):
        for c in range(col_count):
            # Skip drawing if inside the safe zone
            if (start_idx <= r < end_idx) and (start_idx <= c < end_idx):
                continue
            if matrix[r][c]:
                ET.SubElement(qr_group, 'rect', {
                    'x': str(c * module_size), 'y': str(r * module_size),
                    'width': str(module_size), 'height': str(module_size)
                })

    # 4. Embed the Logo (SVG or PNG)
    logo_ext = os.path.splitext(logo_path)[1].lower()
    
    if logo_ext == '.svg':
        # --- SVG Embedding ---
        try:
            tree = ET.parse(logo_path)
            logo_root = tree.getroot()
            
            # Create a container SVG to handle scaling
            container = ET.SubElement(root, 'svg', {
                'x': str(logo_x), 'y': str(logo_y),
                'width': str(logo_w), 'height': str(logo_h),
                'viewBox': logo_root.get('viewBox', '0 0 100 100'),
                'preserveAspectRatio': "xMidYMid meet"
            })
            for child in logo_root:
                container.append(child)
        except Exception as e:
            print(f"Error parsing SVG logo: {e}")

    else:
        # --- PNG/JPG Embedding (Base64) ---
        try:
            with open(logo_path, "rb") as img_file:
                encoded_string = base64.b64encode(img_file.read()).decode('utf-8')
            
            mime_type = mimetypes.guess_type(logo_path)[0] or 'image/png'
            
            # Use SVG <image> tag
            ET.SubElement(root, 'image', {
                'x': str(logo_x),
                'y': str(logo_y),
                'width': str(logo_w),
                'height': str(logo_h),
                'href': f"data:{mime_type};base64,{encoded_string}",
                'preserveAspectRatio': "xMidYMid meet" 
            })
        except Exception as e:
            print(f"Error processing raster logo: {e}")

    # 5. Write Output
    svg_filename = f"{output_name}.svg"
    xml_str = minidom.parseString(ET.tostring(root)).toprettyxml(indent="  ")
    
    with open(svg_filename, "w", encoding="utf-8") as f:
        f.write(xml_str)
    print(f"✅ Generated SVG: {svg_filename}")

    # 6. Optional: Convert to PNG
    if export_png and CAIRO_AVAILABLE:
        png_filename = f"{output_name}.png"
        try:
            cairosvg.svg2png(url=svg_filename, write_to=png_filename)
            print(f"✅ Generated PNG: {png_filename}")
        except Exception as e:
            print(f"❌ Could not convert to PNG: {e}")
    elif export_png:
        print("ℹ️  Skipping PNG export (CairoSVG not active).")

# --- Usage ---
if __name__ == "__main__":
    
    generate_qr(
        data="https://www.unipu.hr/upisi/besplatne_pripreme_za_drzavnu_maturu", 
        logo_path="./assets/Unipu-logo.png", 
        output_name="qr_with_png_logo",
        export_png=True  # Will try to save a .png version too
    )

    print("\n--- Done ---")