extends Node2D
## Godscar image-authentic environment gallery, not the full playable Godscar.
## Press SWITCH to swap Fallfields/Crypt. Drag lower-half to move camera manually.
const STEP: float = 128.0
const GRID: int = 10
const H: int = 8
const MAP_SIZE := Vector2(1280, 1024)
var mode: int = 0
var hand_down: bool = false
var hand_pos := Vector2.ZERO
var view_offset := Vector2(640, 510)
var ground: Node2D
var things: Node2D
var cam: Camera2D
var area_label: Label

func _ready() -> void:
    ground = Node2D.new()
    add_child(ground)
    things = Node2D.new()
    things.y_sort_enabled = true
    add_child(things)
    cam=Camera2D.new()
    cam.enabled=true
    cam.zoom=Vector2(1.2,1.2)
    cam.limit_left=0
    cam.limit_top=0
    cam.limit_right=1280
    cam.limit_bottom=1024
    add_child(cam)
    _create_overlay()
    _rebuild()

func _tex(relative: String) -> Texture2D:
    return load("res://assets/godscar_environment/" + relative)

func _add_sprite(relative: String, where: Vector2, scale_factor: float=1.0) -> void:
    var s := Sprite2D.new()
    s.texture=_tex(relative)
    s.texture_filter=CanvasItem.TEXTURE_FILTER_NEAREST
    s.position=where
    s.scale=Vector2.ONE * scale_factor
    # Y-sort by feet, not by sprite's visual center.
    s.offset=Vector2(0,-s.texture.get_height()*0.39)
    things.add_child(s)

func _rebuild() -> void:
    for child in ground.get_children(): child.queue_free()
    for child in things.get_children(): child.queue_free()
    for y in H:
        for x in GRID:
            var material: String = "farm_dirt" if mode == 0 else "weathered_stone"
            if mode == 0:
                if x < 2 or x > 7: material="meadow_grass"
                if y < 2 and x > 5: material="moss_ruins"
            else:
                if x == 0 or x == 9 or y == 0 or y == 7: material="moss_ruins"
                if x > 7 and y < 3: material="blight_crimson"
                if x > 2 and y > 3 and y < 6: material="old_road"
            var sprite := Sprite2D.new()
            sprite.texture = _tex("textures/terrain/%s_%02d.png" % [material, (x*7+y*13)%4])
            sprite.position=Vector2(x*STEP+STEP/2,y*STEP+STEP/2)
            sprite.texture_filter=CanvasItem.TEXTURE_FILTER_NEAREST
            ground.add_child(sprite)
    if mode == 0:
        _add_sprite("sprites/trees/tree_green.png",Vector2(130,250),.95)
        _add_sprite("sprites/trees/tree_dead.png",Vector2(1100,290),1.15)
        _add_sprite("sprites/structures/well_wood.png",Vector2(620,350),1.15)
        _add_sprite("sprites/fences/fence_wood.png",Vector2(200,500),1)
        _add_sprite("sprites/foliage/wheat_clump.png",Vector2(160,775),1.25)
        _add_sprite("sprites/foliage/grass_tall.png",Vector2(1010,760),.85)
        _add_sprite("sprites/buildings/cottage_thatched.png",Vector2(600,870),1.25)
    else:
        _add_sprite("sprites/structures/ruin_pillar_tall.png",Vector2(160,470),1.25)
        _add_sprite("sprites/structures/ruin_pillar_tall.png",Vector2(1100,470),1.25)
        _add_sprite("sprites/walls/ruin_wall_straight.png",Vector2(550,150),1.75)
        _add_sprite("sprites/crypt/crypt_sarcophagus.png",Vector2(660,430),1.25)
        _add_sprite("sprites/crypt/crypt_candle_altar.png",Vector2(370,620),.95)
        _add_sprite("sprites/crypt/crypt_grated_gate.png",Vector2(1040,760),1)
        _add_sprite("sprites/crypt/crypt_treasure_chest.png",Vector2(320,835),.92)
        _add_sprite("sprites/crypt/crypt_blood_shrine.png",Vector2(650,780),.85)
    cam.position = view_offset
    if area_label != null:
        area_label.text = "FALLFIELDS / FARMLAND" if mode == 0 else "CRYPT / GODWOUND"
    queue_redraw()

func _create_overlay() -> void:
    var overlay := CanvasLayer.new()
    overlay.layer = 5
    add_child(overlay)
    var bar := ColorRect.new()
    bar.color = Color(0.035, 0.05, 0.078, 0.96)
    bar.position = Vector2.ZERO
    bar.size = Vector2(540, 88)
    overlay.add_child(bar)
    var back := Button.new()
    back.text = "BACK"
    back.position = Vector2(12, 17)
    back.size = Vector2(94, 52)
    back.add_theme_font_size_override("font_size", 18)
    back.pressed.connect(func(): get_tree().change_scene_to_file("res://scenes/fallfields.tscn"))
    overlay.add_child(back)
    area_label = Label.new()
    area_label.position = Vector2(116, 15)
    area_label.size = Vector2(250, 58)
    area_label.vertical_alignment = VERTICAL_ALIGNMENT_CENTER
    area_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    area_label.add_theme_font_size_override("font_size", 18)
    overlay.add_child(area_label)
    var toggle := Button.new()
    toggle.text = "SWITCH"
    toggle.position = Vector2(372, 17)
    toggle.size = Vector2(150, 52)
    toggle.add_theme_font_size_override("font_size", 18)
    toggle.pressed.connect(func(): mode = 1 - mode; _rebuild())
    overlay.add_child(toggle)
    var footer := Label.new()
    footer.text = "DRAG TO INSPECT | ART REVIEW ONLY"
    footer.position = Vector2(10, 90)
    footer.size = Vector2(520, 32)
    footer.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    footer.add_theme_font_size_override("font_size", 14)
    footer.add_theme_color_override("font_color", Color("#f1cf9d"))
    overlay.add_child(footer)


func _move_camera_by(delta: Vector2) -> void:
    view_offset -= delta / cam.zoom.x
    var world_half: Vector2 = get_viewport_rect().size * 0.5 / cam.zoom
    view_offset.x = clampf(view_offset.x, world_half.x, MAP_SIZE.x - world_half.x)
    view_offset.y = clampf(view_offset.y, world_half.y, MAP_SIZE.y - world_half.y)
    cam.position = view_offset


func _input(event: InputEvent) -> void:
    if event is InputEventScreenTouch:
        if event.pressed:
            hand_down = event.position.y > 124.0
        else:
            hand_down = false
    elif event is InputEventScreenDrag and hand_down:
        _move_camera_by(event.relative)
    elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
        hand_down = event.pressed and event.position.y > 124.0
    elif event is InputEventMouseMotion and hand_down:
        _move_camera_by(event.relative)
