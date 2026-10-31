#!/usr/bin/env python3
"""Rebuild deterministic atlas pages from individual Godscar v2 candidate sprite PNGs."""
from pathlib import Path
from PIL import Image
import json,hashlib,sys

SIZE=2048
PAD=4

def build(root:Path):
    manifest=json.loads((root/'asset_manifest.json').read_text())
    items=manifest['assets']
    rects=[]
    for item in items:
        f=root/item['path']
        if not f.is_file():raise FileNotFoundError(f)
        im=Image.open(f)
        if im.size!=(item['width'],item['height']):
            raise ValueError('size mismatch '+str(f))
        if hashlib.sha256(f.read_bytes()).hexdigest()!=item['sha256']:
            raise ValueError('sha mismatch '+str(f))
        if im.width+PAD*2>SIZE or im.height+PAD*2>SIZE:
            raise ValueError('oversize '+str(f))
        rects.append((im.height+PAD*2,im.width+PAD*2,item))
    rects.sort(key=lambda v:(-v[0],-v[1],v[2]['id']))
    pages=[]; page=Image.new('RGBA',(SIZE,SIZE));x=y=rowh=0; records={}
    for h,w,item in rects:
        if x+w>SIZE:
            x=0;y+=rowh;rowh=0
        if y+h>SIZE:
            pages.append(page);page=Image.new('RGBA',(SIZE,SIZE));x=y=rowh=0
        image=Image.open(root/item['path']).convert('RGBA')
        page.alpha_composite(image,(x+PAD,y+PAD))
        records[item['id']]={'page':len(pages),'rect':[x+PAD,y+PAD,image.width,image.height],
                             'anchor':item['anchor'],'source':item['path']}
        x+=w;rowh=max(rowh,h)
    pages.append(page)
    atlas_dir=root/'atlases';atlas_dir.mkdir(exist_ok=True)
    for i,p in enumerate(pages):
        p.save(atlas_dir/f'godscar_v2_{i:02d}.png',optimize=True,compress_level=6)
    index={'atlas_size':[SIZE,SIZE],'page_count':len(pages),'sprites':records}
    (atlas_dir/'atlas_index.json').write_text(json.dumps(index,indent=2)+'\n')
    print('Atlas pages:',len(pages),'sprites:',len(records))
    return index

if __name__=='__main__':
    build(Path(sys.argv[1] if len(sys.argv)>1 else Path(__file__).resolve().parents[1]))
