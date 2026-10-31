#!/usr/bin/env python3
"""Godscar candidate art extractor. Input art/source/ source sheets; output assets/art_review/.
Run pip install pillow, then python tools/build_art_assets.py.
This never marks cutouts as seamless production tiles.
"""
from pathlib import Path
import hashlib, json, sys
from PIL import Image, ImageOps

ROOT=Path(__file__).resolve().parents[1]
MANIFEST=ROOT/"art"/"asset_manifest.json"
SOURCE=ROOT/"art"/"source_sheets"
OUT=ROOT/"assets"/"art_review"

def run():
    data=json.loads(MANIFEST.read_text(encoding="utf-8"))
    sprites=[]
    for item in data["candidates"]:
        src=SOURCE/item["source"]
        if not src.is_file():
            print(f"SKIP missing original source: {src.name}")
            continue
        img=Image.open(src).convert("RGBA")
        if img.size != tuple(data["source_size"]):
            raise RuntimeError(f"Incorrect size {src}: {img.size}")
        sprite=img.crop(tuple(item["crop"]))
        box=sprite.getchannel("A").point(lambda p:255 if p>=22 else 0).getbbox()
        if box is None:
            raise RuntimeError(f"Blank crop: {item['id']}")
        sprite=ImageOps.expand(sprite.crop(box),border=6,fill=(0,0,0,0))
        target=OUT/item["group"]/(item["id"]+".png")
        target.parent.mkdir(parents=True,exist_ok=True)
        sprite.save(target,optimize=True)
        sprites.append(dict(id=item["id"],path=str(target.relative_to(ROOT)),
            pixel_size=list(sprite.size),collider_hint=item["collision_hint"],
            pivot="bottom_center",status="candidate_needs_QA",
            sha256=hashlib.sha256(target.read_bytes()).hexdigest()))
    (OUT/"manifest_generated.json").write_text(
        json.dumps({"version":1,"count":len(sprites),"sprites":sprites},indent=2)+"\n")
    print(f"Generated {len(sprites)} candidate PNG assets")

if __name__=="__main__":
    try:run()
    except Exception as exc:
        print(f"Asset extraction failed: {exc}",file=sys.stderr)
        sys.exit(1)
