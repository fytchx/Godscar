extends Node2D
## Review-only browser for original Godscar's 2D environment art expansion.
## Uses authentic sprite PNGs with no placeholder geometry. Sprite scale/perspective
## are intentionally provisional until portrait camera and character tests.
const BASE := "res://assets/godscar_environment/"
const EXPANSION := "res://assets/godscar_expansion/"
const WORLD_SIZE := Vector2(1664.0, 1664.0)
const VIEW_NAMES := ["FALLFIELDS", "CRYPT", "BLIGHT"]
const CATEGORIES := ["ALL", "stone_architecture", "crypt_props", "village", "vegetation", "ground_overlays", "decals"]

var items: Array = []
var current_view: int = 0
var catalogue: bool = false
var catalog_page: int = 0
var catalog_category: int = 0
var previous_drag: Vector2
var dragging: bool = false
var pan: Vector2 = Vector2(832, 820)
var terrain: Node2D
var decor: Node2D
var cam: Camera2D
var ui: CanvasLayer
var header: Label
var info: Label
var cat_root: Control
var cat_head: Label
var cat_items: Control
var page_button: Button


func _ready() -> void:
    terrain = Node2D.new()
    terrain.name = "FloorTiles"
    add_child(terrain)
    decor = Node2D.new()
    decor.name = "Sprite2DArt"
    decor.y_sort_enabled = true
    add_child(decor)
    cam = Camera2D.new()
    cam.zoom = Vector2(1.0, 1.0)
    cam.enabled = true
    add_child(cam)
    ui = CanvasLayer.new()
    add_child(ui)
    _build_ui()
    _read_manifest()
    _rebuild()


func _read_manifest() -> void:
    var path: String = EXPANSION + "asset_manifest.json"
    if not FileAccess.file_exists(path):
        info.text = "Expansion assets not imported. Upload v2 ZIP to GitHub dev/art."
        return
    var file: FileAccess = FileAccess.open(path, FileAccess.READ)
    var parsed: Variant = JSON.parse_string(file.get_as_text())
    if typeof(parsed) != TYPE_DICTIONARY:
        info.text = "Failed to parse asset manifest"
        return
    items = parsed.get("assets", [])
    info.text = "%d new sprites | view-only art preview | camera scale is NOT finalized" % items.size()


func _get_texture(path: String) -> Texture2D:
    if ResourceLoader.exists(path):
        return load(path)
    return null


func _tile_texture(mode: int, x: int, y: int) -> Texture2D:
    var floor_type: String = "farm_dirt"
    if mode == 0:
        floor_type = "meadow_grass" if (x < 3 or x > 8) else "farm_dirt"
        if (x + y * 3) % 11 == 0:
            floor_type = "old_road"
    elif mode == 1:
        floor_type = "weathered_stone" if x > 1 and x < 12 and y > 1 and y < 12 else "moss_ruins"
        if (x + y * 7) % 12 == 0:
            floor_type = "old_road"
    else:
        floor_type = "blight_crimson" if (x+y) % 4 < 3 else "dark_ashstone"
    var texture_path: String = BASE + "textures/terrain/%s_%02d.png" % [floor_type, (x * 7 + y * 11) % 4]
    return _get_texture(texture_path)


func _filtered(item: Dictionary, mode: int) -> bool:
    var kind: String = str(item.get("category", ""))
    if mode == 0:
        return kind in ["village", "vegetation", "stone_architecture", "ground_overlays", "decals"]
    elif mode == 1:
        return kind in ["stone_architecture", "crypt_props", "ground_overlays"]
    return kind in ["vegetation", "crypt_props", "ground_overlays", "decals", "stone_architecture"]


func _rebuild() -> void:
    for child in terrain.get_children():
        child.queue_free()
    for child in decor.get_children():
        child.queue_free()
    for y in range(13):
        for x in range(13):
            var tex: Texture2D = _tile_texture(current_view, x, y)
            if tex == null:
                continue
            var floor_sprite := Sprite2D.new()
            floor_sprite.texture = tex
            floor_sprite.position = Vector2(x * 128 + 64, y * 128 + 64)
            floor_sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
            terrain.add_child(floor_sprite)
    var candidates: Array = []
    for item in items:
        if _filtered(item, current_view):
            candidates.append(item)
    # Deterministic spread of actual art around a broad two-dimensional space.
    # Modest sprite count protects 4GB Android phones during this visual review.
    var rng := RandomNumberGenerator.new()
    rng.seed = 1320 + current_view * 31
    for i in range(mini(26, candidates.size())):
        var asset: Dictionary = candidates[(i * 37 + current_view * 11) % candidates.size()]
        var cat: String = str(asset.get("category", ""))
        var px: float = rng.randf_range(110, 1555)
        var py: float = rng.randf_range(210, 1510)
        if cat in ["stone_architecture", "village"] and i < 10:
            # Heavy scenic pieces establish arena edges, not an inaccessible hallway.
            px = 120.0 if i % 2 == 0 else 1544.0
        _spawn_asset(asset, Vector2(px, py))
    cam.position = pan
    header.text = "GODSCAR ART  /  " + VIEW_NAMES[current_view]
    if items.is_empty():
        info.text = "Existing v1 floors available; v2 sprites require GitHub import"


func _spawn_asset(item: Dictionary, where: Vector2) -> void:
    var texture: Texture2D = _get_texture(EXPANSION + str(item["path"]))
    if texture == null:
        return
    var sprite := Sprite2D.new()
    sprite.texture = texture
    sprite.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
    sprite.position = where
    var category: String = str(item.get("category", ""))
    var max_size: float = 230.0 if category in ["village", "stone_architecture", "vegetation"] else 170.0
    var scale_factor: float = minf(1.0, max_size / float(maxi(texture.get_width(),texture.get_height())))
    sprite.scale = Vector2.ONE * scale_factor
    if str(item.get("anchor", "bottom_center")) == "bottom_center":
        sprite.offset = Vector2(0, -texture.get_height() * 0.5 + 3.0)
    decor.add_child(sprite)


func _build_ui() -> void:
    var bg := ColorRect.new()
    bg.color = Color(0.035, 0.05, 0.08, 0.97)
    bg.position = Vector2.ZERO
    bg.size = Vector2(540, 118)
    ui.add_child(bg)
    header = Label.new()
    header.position = Vector2(12, 4)
    header.size = Vector2(510, 35)
    header.add_theme_color_override("font_color", Color("#f2d4ab"))
    header.add_theme_font_size_override("font_size", 20)
    ui.add_child(header)
    var back := Button.new()
    back.text = "BACK"
    back.position = Vector2(8, 44)
    back.size = Vector2(95, 59)
    back.pressed.connect(func(): get_tree().change_scene_to_file("res://assets/godscar_environment/godot_demo/gallery.tscn"))
    ui.add_child(back)
    var switcher := Button.new()
    switcher.text = "NEXT BIOME"
    switcher.position = Vector2(112, 44)
    switcher.size = Vector2(183, 59)
    switcher.pressed.connect(func(): current_view = (current_view + 1) % VIEW_NAMES.size(); _rebuild())
    ui.add_child(switcher)
    var catalog := Button.new()
    catalog.text = "CATALOG"
    catalog.position = Vector2(303, 44)
    catalog.size = Vector2(227, 59)
    catalog.pressed.connect(_toggle_catalogue)
    ui.add_child(catalog)
    info = Label.new()
    info.position = Vector2(8, 120)
    info.size = Vector2(520, 60)
    info.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    info.add_theme_font_size_override("font_size", 14)
    info.add_theme_color_override("font_color", Color("#f2d4ab"))
    ui.add_child(info)
    _build_catalogue()


func _build_catalogue() -> void:
    cat_root = Control.new()
    cat_root.visible = false
    cat_root.position = Vector2(0, 190)
    cat_root.size = Vector2(540, 860)
    ui.add_child(cat_root)
    var backdrop := ColorRect.new()
    backdrop.color = Color("#171a20")
    backdrop.size = Vector2(540, 860)
    cat_root.add_child(backdrop)
    var category_button := Button.new()
    category_button.text = "CATEGORY"
    category_button.position = Vector2(12, 8)
    category_button.size = Vector2(170, 46)
    category_button.pressed.connect(func():
        catalog_category = (catalog_category + 1) % CATEGORIES.size()
        catalog_page = 0
        _redraw_catalogue()
    )
    cat_root.add_child(category_button)
    cat_head = Label.new()
    cat_head.position = Vector2(190, 12)
    cat_head.size = Vector2(330, 39)
    cat_head.add_theme_font_size_override("font_size", 16)
    cat_root.add_child(cat_head)
    cat_items = Control.new()
    cat_items.position = Vector2(0, 65)
    cat_items.size = Vector2(540, 690)
    cat_root.add_child(cat_items)
    var previous := Button.new()
    previous.text = "PREV"
    previous.position = Vector2(16, 776)
    previous.size = Vector2(150, 56)
    previous.pressed.connect(func(): catalog_page = maxi(0, catalog_page - 1); _redraw_catalogue())
    cat_root.add_child(previous)
    page_button = Button.new()
    page_button.text = "NEXT"
    page_button.position = Vector2(360, 776)
    page_button.size = Vector2(160, 56)
    page_button.pressed.connect(func(): catalog_page += 1; _redraw_catalogue())
    cat_root.add_child(page_button)


func _toggle_catalogue() -> void:
    catalogue = not catalogue
    cat_root.visible = catalogue
    if catalogue:
        _redraw_catalogue()


func _redraw_catalogue() -> void:
    for child in cat_items.get_children():
        child.queue_free()
    var filtered: Array = []
    var category: String = str(CATEGORIES[catalog_category])
    for item in items:
        if category == "ALL" or str(item.get("category")) == category:
            filtered.append(item)
    var total_pages: int = maxi(1, ceili(float(filtered.size()) / 24.0))
    catalog_page = clampi(catalog_page, 0, total_pages - 1)
    cat_head.text = "%s   %d/%d" % [category, catalog_page + 1, total_pages]
    page_button.disabled = catalog_page >= total_pages - 1
    for j in range(24):
        var index: int = catalog_page * 24 + j
        if index >= filtered.size():
            break
        var item: Dictionary = filtered[index]
        var tex: Texture2D = _get_texture(EXPANSION + str(item["path"]))
        if tex == null:
            continue
        var col: int = j % 4
        var row: int = int(j / 4)
        var preview := TextureRect.new()
        preview.texture = tex
        preview.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
        preview.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
        preview.position = Vector2(col * 134 + 8, row * 110 + 4)
        preview.size = Vector2(125, 88)
        preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
        cat_items.add_child(preview)
        var idlabel := Label.new()
        idlabel.text = str(item["id"]).substr(0, 18)
        idlabel.position = Vector2(col * 134 + 8, row * 110 + 91)
        idlabel.size = Vector2(125, 18)
        idlabel.add_theme_font_size_override("font_size", 10)
        idlabel.mouse_filter = Control.MOUSE_FILTER_IGNORE
        cat_items.add_child(idlabel)


func _input(event: InputEvent) -> void:
    if catalogue:
        return
    if event is InputEventScreenTouch:
        dragging = event.pressed and event.position.y > 174.0
    elif event is InputEventScreenDrag and dragging:
        _pan_camera(event.relative)
    elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
        dragging = event.pressed and event.position.y > 174.0
    elif event is InputEventMouseMotion and dragging:
        _pan_camera(event.relative)


func _pan_camera(delta: Vector2) -> void:
    pan -= delta / cam.zoom
    pan.x = clampf(pan.x, 270.0, WORLD_SIZE.x - 270.0)
    pan.y = clampf(pan.y, 550.0, WORLD_SIZE.y - 550.0)
    cam.position = pan
