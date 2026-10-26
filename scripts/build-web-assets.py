"""Build web copies of supplied photographic assets without altering originals.

Run with Python + Pillow + NumPy. All geometry is metre-scale, Y-up; the
English logo faces +Z. Shelf meshes retain the same nine parts/materials/UVs.
"""
from __future__ import annotations

import importlib.util
import io
import json
import math
import shutil
import struct
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT.parent / "yam-yam-3d"
MODELS = ROOT / "public" / "models"
IMAGES = ROOT / "public" / "images"


def read_glb(path):
    raw = path.read_bytes()
    magic, version, length = struct.unpack_from("<4sII", raw)
    assert magic == b"glTF" and version == 2 and length == len(raw)
    json_size, kind = struct.unpack_from("<I4s", raw, 12)
    assert kind == b"JSON"
    doc = json.loads(raw[20:20 + json_size])
    offset = 20 + json_size
    binary_size, kind = struct.unpack_from("<I4s", raw, offset)
    assert kind == b"BIN\0"
    return doc, raw[offset + 8:offset + 8 + binary_size]


def write_glb(path, doc, binary):
    binary += b"\0" * (-len(binary) % 4)
    doc["buffers"][0]["byteLength"] = len(binary)
    encoded = json.dumps(doc, ensure_ascii=False, separators=(",", ":")).encode("utf8")
    encoded += b" " * (-len(encoded) % 4)
    size = 12 + 8 + len(encoded) + 8 + len(binary)
    data = struct.pack("<4sII", b"glTF", 2, size)
    data += struct.pack("<I4s", len(encoded), b"JSON") + encoded
    data += struct.pack("<I4s", len(binary), b"BIN\0") + binary
    path.write_bytes(data)


def jpeg_bytes(image, width, quality):
    image = image.convert("RGB")
    image = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
    output = io.BytesIO()
    image.save(output, format="JPEG", quality=quality, optimize=True, subsampling=0)
    return output.getvalue(), image.size


def hero():
    doc, binary = read_glb(SOURCE / "models" / "yam-yam-can.glb")
    image_view = doc["bufferViews"][doc["images"][0]["bufferView"]]
    image_start = image_view.get("byteOffset", 0)
    # The original export stores its sole image at the end of the buffer.
    assert image_start + image_view["byteLength"] >= len(binary) - 3
    original_image = Image.open(io.BytesIO(binary[image_start:image_start + image_view["byteLength"]]))
    texture, size = jpeg_bytes(original_image, 2048, 91)
    image_view["byteLength"] = len(texture)
    doc["images"][0]["mimeType"] = "image/jpeg"
    doc["asset"]["extras"]["webTextureSize"] = list(size)
    target = MODELS / "yam-yam.glb"
    write_glb(target, doc, binary[:image_start] + texture)
    return target, doc, size


def shelf():
    spec = importlib.util.spec_from_file_location("original_model_builder", SOURCE / "scripts" / "build_model.py")
    builder = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(builder)
    builder.SEGMENTS = 48
    # Photographed corrugation already lives in the label. A straight six-ring
    # body gives the distant shelf an identical silhouette with far fewer faces.
    body = [(0, .0073), (.05175, .0073), (.052, .0075),
            (.052, .118), (.05175, .1182), (0, .1182)]
    meshes = [builder.lathe("Photographed printed corrugated body", body, 0, True)]
    meshes.append(builder.lathe("Bottom rolled tin seam", builder.torus_profile(.0518, .0041, .0014, 6), 1))
    meshes.append(builder.lathe("Lower label edge ring", builder.torus_profile(.0519, .00635, .00038, 4), 1))
    bottom = [(0, .0038), (.042, .0038), (.045, .0033), (.0495, .0035),
              (.0509, .0027), (.0519, .004), (.0519, .0064), (0, .0072)]
    meshes.append(builder.lathe("Recessed metal underside", bottom, 2))
    meshes.append(builder.lathe("Underside pressed bead", builder.torus_profile(.038, .0036, .00022, 4), 2))
    meshes.append(builder.lathe("Upper rolled tin seam under lid", builder.torus_profile(.0519, .1184, .0012, 6), 1))
    seal = [(0, .118), (.0524, .118), (.0528, .1184), (.0528, .12), (.0523, .1203), (0, .1203)]
    meshes.append(builder.lathe("Red lid lower retaining lip", seal, 4))
    cap = [(0, .1202), (.0527, .1202), (.05405, .1207), (.05435, .1226),
           (.0543, .12445), (.05355, .12548), (.0517, .12574), (.05, .12535),
           (.0493, .12513), (.0485, .12545), (.04, .12543), (0, .12535)]
    meshes.append(builder.lathe("Rounded red plastic lid", cap, 3))
    meshes.append(builder.lathe("Lid fine outer sealing bead", builder.torus_profile(.05305, .12525, .00016, 4), 3))
    label = Image.open(SOURCE / "textures" / "label_basecolor.jpg")
    texture, size = jpeg_bytes(label, 1024, 86)
    # The upstream builder writes a fixed filename, so isolate that export in a
    # fresh temporary directory and move only the new GLB into this project.
    with tempfile.TemporaryDirectory(prefix="yamyam-web-lod-") as temporary:
        directory = Path(temporary)
        builder.MODELS = directory
        texture_path = directory / "label.jpg"
        texture_path.write_bytes(texture)
        exported, doc = builder.export_glb(meshes, texture_path)
        target = MODELS / "yam-yam-shelf.glb"
        shutil.copyfile(exported, target)
    return target, doc, size


def model_info(target, doc, texture_size):
    positions = [doc["accessors"][p["attributes"]["POSITION"]]
                 for mesh in doc["meshes"] for p in mesh["primitives"]]
    return {"path": "/models/" + target.name, "bytes": target.stat().st_size,
            "meshes": len(doc["meshes"]), "materials": len(doc["materials"]),
            "vertices": sum(p["count"] for p in positions),
            "triangles": sum(doc["accessors"][p["indices"]]["count"] // 3
                             for mesh in doc["meshes"] for p in mesh["primitives"]),
            "textureSize": list(texture_size),
            "boundsMetres": {"min": np.min([p["min"] for p in positions], axis=0).tolist(),
                             "max": np.max([p["max"] for p in positions], axis=0).tolist()}}


def webp(source, name, width):
    image = Image.open(source)
    image = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
    target = IMAGES / name
    image.save(target, format="WEBP", quality=88, method=6)
    return {"path": "/images/" + name, "bytes": target.stat().st_size,
            "size": list(image.size), "alpha": image.mode == "RGBA"}


def main():
    MODELS.mkdir(parents=True, exist_ok=True)
    IMAGES.mkdir(parents=True, exist_ok=True)
    hero_path, hero_doc, hero_texture = hero()
    print("Hero ready: " + str(hero_path), flush=True)
    shelf_path, shelf_doc, shelf_texture = shelf()
    images = [webp(SOURCE / "renders" / "yam-yam-persian.png", "can-persian.webp", 900),
              webp(SOURCE / "renders" / "yam-yam-english.png", "can-english.webp", 900),
              webp(SOURCE / "renders" / "yam-yam-persian.png", "can-thumb.webp", 240),
              webp(ROOT.parent / "output" / "tomato-hero-photoreal-transparent.png", "branch.webp", 1200)]
    report = {"sourceModel": str(SOURCE / "models" / "yam-yam-can.glb"),
              "orientation": {"up": "+Y", "englishFront": "+Z", "englishAtlasU": .5,
                              "persianAtlasU": .872770967996017,
                              "persianRotationYRadians": -math.radians(134.19754847856615)},
              "models": [model_info(hero_path, hero_doc, hero_texture),
                         model_info(shelf_path, shelf_doc, shelf_texture)], "images": images,
              "provenance": "Supplied photographic renders and original model only. No generated or retouched image content."}
    (ROOT / "scripts" / "assets-info.json").write_text(json.dumps(report, indent=2), encoding="utf8")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
