import os
from PIL import Image, ImageDraw, ImageFilter

SIZES = {
    "mipmap-mdpi": (48, 108),
    "mipmap-hdpi": (72, 162),
    "mipmap-xhdpi": (96, 216),
    "mipmap-xxhdpi": (144, 324),
    "mipmap-xxxhdpi": (192, 432),
}

RES_DIR = r"c:\Users\tassi\Downloads\Programs\Stream_Web\android\app\src\main\res"

def hex_to_rgb(hex_str):
    hex_str = hex_str.lstrip('#')
    return tuple(int(hex_str[i:i+2], 16) for i in (0, 2, 4))

COLOR_TOP = hex_to_rgb("#8B5CF6")
COLOR_BOTTOM = hex_to_rgb("#6D28D9")
COLOR_DARK = hex_to_rgb("#09090B")

def interpolate_color(c1, c2, factor):
    return tuple(int(a + (b - a) * factor) for a, b in zip(c1, c2))

def create_gradient_image(size):
    w, h = size
    img = Image.new("RGBA", (w, h))
    pixels = img.load()
    for y in range(h):
        for x in range(w):
            factor = (x + y) / (w + h)
            r, g, b = interpolate_color(COLOR_TOP, COLOR_BOTTOM, factor)
            pixels[x, y] = (r, g, b, 255)
    return img

def render_logo_badge(w, is_round=False):
    img = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    gradient = create_gradient_image((w, w))

    mask = Image.new("L", (w, w), 0)
    draw_mask = ImageDraw.Draw(mask)
    margin = int(w * 0.02)
    if is_round:
        draw_mask.ellipse([margin, margin, w - margin, w - margin], fill=255)
    else:
        radius = int(w * 0.22)
        draw_mask.rounded_rectangle([margin, margin, w - margin, w - margin], radius=radius, fill=255)

    img.paste(gradient, (0, 0), mask)
    draw = ImageDraw.Draw(img)

    perf_x = int(w * 0.18)
    perf_radius = int(w * 0.038)
    for y_rel in [0.26, 0.50, 0.74]:
        perf_y = int(w * y_rel)
        draw.ellipse(
            [perf_x - perf_radius, perf_y - perf_radius, perf_x + perf_radius, perf_y + perf_radius],
            fill=(255, 255, 255, 140)
        )

    center_x = int(w * 0.52)
    center_y = int(w * 0.50)
    circle_r = int(w * 0.20)
    draw.ellipse(
        [center_x - circle_r, center_y - circle_r, center_x + circle_r, center_y + circle_r],
        outline=(255, 255, 255, 80),
        width=max(2, int(w * 0.02))
    )

    p1 = (int(w * 0.38), int(w * 0.28))
    p2 = (int(w * 0.74), int(w * 0.50))
    p3 = (int(w * 0.38), int(w * 0.72))

    shadow = Image.new("RGBA", (w, w), (0, 0, 0, 0))
    shadow_draw = ImageDraw.Draw(shadow)
    shadow_draw.polygon([p1, p2, p3], fill=(0, 0, 0, 100))
    shadow = shadow.filter(ImageFilter.GaussianBlur(radius=max(1, int(w * 0.03))))
    img = Image.alpha_composite(img, shadow)

    draw = ImageDraw.Draw(img)
    draw.polygon([p1, p2, p3], fill=(255, 255, 255, 255))
    return img

def render_logo(size, is_round=False, for_foreground=False):
    scale = 4
    w = size * scale
    h = size * scale

    if for_foreground:
        canvas = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        logo_size = int(w * 0.62)
        offset_x = (w - logo_size) // 2
        offset_y = (h - logo_size) // 2
        logo_img = render_logo_badge(logo_size, is_round=False)
        canvas.paste(logo_img, (offset_x, offset_y), logo_img)
        return canvas.resize((size, size), Image.Resampling.LANCZOS)
    else:
        badge = render_logo_badge(w, is_round=is_round)
        return badge.resize((size, size), Image.Resampling.LANCZOS)

def update_splash_screens():
    # Parcourt tous les dossiers contenant splash.png
    for root, dirs, files in os.walk(RES_DIR):
        if "splash.png" in files:
            splash_path = os.path.join(root, "splash.png")
            try:
                with Image.open(splash_path) as orig:
                    w, h = orig.size
                
                # Crée un splash sombre avec le logo au centre
                splash_img = Image.new("RGBA", (w, h), (*COLOR_DARK, 255))
                badge_dim = min(int(min(w, h) * 0.35), 256)
                badge = render_logo(badge_dim, is_round=False)
                
                offset_x = (w - badge_dim) // 2
                offset_y = (h - badge_dim) // 2
                splash_img.paste(badge, (offset_x, offset_y), badge)
                splash_img.save(splash_path, "PNG")
                print(f"OK Splash: {os.path.relpath(splash_path, RES_DIR)} ({w}x{h})")
            except Exception as e:
                print(f"Err Splash {splash_path}: {e}")

def main():
    for folder, (std_size, fg_size) in SIZES.items():
        folder_path = os.path.join(RES_DIR, folder)
        os.makedirs(folder_path, exist_ok=True)

        icon_square = render_logo(std_size, is_round=False)
        icon_square.save(os.path.join(folder_path, "ic_launcher.png"), "PNG")

        icon_round = render_logo(std_size, is_round=True)
        icon_round.save(os.path.join(folder_path, "ic_launcher_round.png"), "PNG")

        icon_fg = render_logo(fg_size, for_foreground=True)
        icon_fg.save(os.path.join(folder_path, "ic_launcher_foreground.png"), "PNG")

        print(f"OK: {folder}")

    bg_xml_path = os.path.join(RES_DIR, "values", "ic_launcher_background.xml")
    with open(bg_xml_path, "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#09090B</color>\n</resources>\n')

    update_splash_screens()

if __name__ == "__main__":
    main()
