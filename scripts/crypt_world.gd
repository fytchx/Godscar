extends Node2D
## Cached world art for the first Godwound dungeon. Uses existing Godscar PNGs,
## not vector placeholder floors. Only the hero's parent translates on movement.
const BASE := "res://assets/godscar_environment/"
const EXP := "res://assets/godscar_expansion/"
const RATINGS := "res://art/reviews/v2_2026-10-31.json"
const GENERATOR := preload("res://scripts/crypt_generator.gd")
const CELL: int = GENERATOR.CELL
const TILE: int = GENERATOR.TILE

var generator: RefCounted
var floor_sets: Dictionary = {}
var wall: Texture2D
var decoration: Node2D
var world_seed: int = 0
var placed_props: int = 0


func _ready() -> void:
    texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
    decoration = Node2D.new()
    decoration.name = "GodscarEnvironmentProps"
    decoration.y_sort_enabled = true
    add_child(decoration)
    for type in ["weathered_stone", "crypt_grate_stone", "moss_ruins", "dark_ashstone", "blight_crimson"]:
        var textures: Array[Texture2D] = []
        for i in range(4):
            var path: String = BASE + "textures/terrain/%s_%02d.png" % [type, i]
            textures.append(load(path))
        floor_sets[type] = textures
    wall = load(BASE + "sprites/walls/ruin_wall_straight.png")


func configure(layout: RefCounted) -> void:
    generator = layout
    world_seed = int(layout.seed_value)
    for child in decoration.get_children():
        child.queue_free()
    placed_props = 0
    _place_approved_props()
    queue_redraw()


func _choose_floor(cell: Vector2i) -> String:
    if cell == generator.boss:
        return "blight_crimson"
    if cell == generator.start:
        return "weathered_stone"
    return "crypt_grate_stone" if (cell.x + cell.y + world_seed) % 4 == 0 else "weathered_stone"


func _draw() -> void:
    if generator == null:
        return
    for cell in generator.room_order:
        var base_x: int = cell.x * GENERATOR.ROOM_TILES
        var base_y: int = cell.y * GENERATOR.ROOM_TILES
        var ground: String = _choose_floor(cell)
        for y in range(GENERATOR.ROOM_TILES):
            for x in range(GENERATOR.ROOM_TILES):
                var tile: Vector2i = Vector2i(base_x + x, base_y + y)
                var destination: Rect2 = Rect2(float(tile.x * TILE), float(tile.y * TILE), TILE, TILE)
                var is_floor: bool = generator.is_walkable_tile(tile)
                var material: String = ground if is_floor else "dark_ashstone"
                if is_floor and (x * 5 + y * 7 + world_seed) % 23 == 0:
                    material = "moss_ruins"
                var variants: Array = floor_sets[material]
                var variant: int = posmod(tile.x * 13 + tile.y * 17 + world_seed, 4)
                draw_texture_rect(variants[variant], destination, false)
                if not is_floor:
                    draw_rect(destination, Color("#080b10", 0.46))
                    # The blocking border has an actual Godscar masonry texture.
                    if wall != null:
                        draw_texture_rect(wall, destination.grow(-5.0), false, Color(0.75, 0.75, 0.83, 0.8))
                elif cell == generator.boss and (x + y) % 4 == 0:
                    draw_rect(destination.grow(-20.0), Color("#842a3a", 0.09))
    # Markers read as parts of the environment; the boss gate opens after victory.
    var entry: Vector2 = generator.room_center(generator.start)
    var final: Vector2 = generator.room_center(generator.boss)
    draw_arc(entry, 65.0, 0.0, TAU, 48, Color("#baa276", 0.44), 3.0)
    draw_arc(final, 110.0, 0.0, TAU, 48, Color("#c53b4b", 0.56), 4.0)


func _place_approved_props() -> void:
    if not FileAccess.file_exists(EXP + "asset_manifest.json") or not FileAccess.file_exists(RATINGS):
        return
    var asset_file: FileAccess = FileAccess.open(EXP + "asset_manifest.json", FileAccess.READ)
    var ratings_file: FileAccess = FileAccess.open(RATINGS, FileAccess.READ)
    if asset_file == null or ratings_file == null:
        return
    var catalog: Variant = JSON.parse_string(asset_file.get_as_text())
    var reviewed: Variant = JSON.parse_string(ratings_file.get_as_text())
    if typeof(catalog) != TYPE_DICTIONARY or typeof(reviewed) != TYPE_DICTIONARY:
        return
    var grades: Dictionary = reviewed.get("grades_by_id", {})
    var usable: Array[Dictionary] = []
    for candidate in catalog.get("assets", []):
        if typeof(candidate) != TYPE_DICTIONARY:
            continue
        var kind: String = str(candidate.get("category", ""))
        if kind not in ["crypt_props", "stone_architecture"]:
            continue
        if str(grades.get(str(candidate.get("id", "")), "?")) != "A":
            continue
        if int(candidate.get("width", 0)) > 420 or int(candidate.get("height", 0)) > 430:
            continue
        usable.append(candidate)
    if usable.is_empty():
        return
    var rng := RandomNumberGenerator.new()
    rng.seed = world_seed + 17021
    for cell in generator.room_order:
        var center: Vector2 = generator.room_center(cell)
        # Sprites hug the inner perimeter, keeping door lanes and arena centers clear.
        var positions: Array[Vector2] = [
            Vector2(-246, -230), Vector2(250, -208),
            Vector2(-240, 244), Vector2(235, 235)
        ]
        for j in range(3):
            var entry: Dictionary = usable[rng.randi_range(0, usable.size() - 1)]
            var texture_path: String = EXP + str(entry["path"])
            var tex: Texture2D = load(texture_path)
            if tex == null:
                continue
            var node := Sprite2D.new()
            node.texture = tex
            node.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
            node.position = center + positions[(j + posmod(cell.x + cell.y, 4)) % positions.size()]
            var scale_factor: float = minf(0.78, 160.0 / float(maxi(tex.get_width(), tex.get_height())))
            node.scale = Vector2.ONE * scale_factor
            node.offset = Vector2(0.0, -float(tex.get_height()) * 0.30)
            decoration.add_child(node)
            placed_props += 1
