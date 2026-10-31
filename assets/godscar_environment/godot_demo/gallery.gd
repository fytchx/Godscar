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

func _ready() -> void:
    ground = Node2D.new()
    add_child(ground)
    things = Node2D.new()
    things.y_sort_enabled = true
    add_child(things)
    cam=Camera2D.new()
    cam.enabled=true
    cam.zoom=Vector2(0.65,0.65)
    add_child(cam)
    _rebuild()

func _tex(relative: String) -> Texture2D:
    return load("res://" + relative)

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
    queue_redraw()

func _input(event: InputEvent) -> void:
    if event is InputEventScreenTouch:
        if event.pressed:
            if event.position.y < 92:
                mode = 1 - mode
                _rebuild()
            else:
                hand_down=true
                hand_pos=event.position
        else: hand_down=false
    elif event is InputEventScreenDrag and hand_down:
        view_offset -= event.relative / cam.zoom.x
        view_offset.x=clampf(view_offset.x,200,1100)
        view_offset.y=clampf(view_offset.y,200,900)
        cam.position=view_offset
    elif event is InputEventMouseButton and event.button_index == MOUSE_BUTTON_LEFT:
        if event.pressed:
            if event.position.y < 92:
                mode=1-mode
                _rebuild()
            else:
                hand_down=true
                hand_pos=event.position
        else: hand_down=false
    elif event is InputEventMouseMotion and hand_down:
        view_offset -= event.relative / cam.zoom.x
        view_offset.x=clampf(view_offset.x,200,1100)
        view_offset.y=clampf(view_offset.y,200,900)
        cam.position=view_offset

func _draw() -> void:
    # Minimal on-world caption; press near top to switch biome.
    var title: String = "FALLFIELDS" if mode == 0 else "THE CRYPT"
    draw_string(ThemeDB.fallback_font,Vector2(48,72),title + "  |  TAP TOP TO SWITCH",HORIZONTAL_ALIGNMENT_LEFT,-1,23,Color("f5ddba"))
