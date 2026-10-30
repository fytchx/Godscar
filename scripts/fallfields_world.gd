extends Node2D
## Static, cached environment artwork for the instanced Fallfields slice.
## Draws once into CanvasItem's retained commands. The parent moves the entire
## terrain with its camera instead of rebuilding hundreds of tiles every frame.

const W: float = 2640.0
const H: float = 1640.0
const TILE: int = 80
const GOLD: Color = Color("#b99a65")
const SOIL: Color = Color("#282b29")
const STONE: Color = Color("#45434a")
var random := RandomNumberGenerator.new()


func _ready() -> void:
    random.seed = 20261030
    queue_redraw()


func _draw() -> void:
    draw_rect(Rect2(0, 0, W, H), Color("#202629"))
    # Hand-biased ground palettes tell the story: farms to the west,
    # scarred battlefield to the east. Tile details do not redraw in motion.
    for y in range(0, int(H), TILE):
        for x in range(0, int(W), TILE):
            var t: float = float(x) / W
            var warm: Color = Color("#343b30") if ((x / TILE + y / TILE) % 3) == 0 else Color("#3a402e")
            var bleak: Color = Color("#292731") if ((x / TILE + y / TILE) % 3) == 0 else Color("#302b34")
            var base: Color = warm.lerp(bleak, smoothstep(0.35, 0.86, t))
            draw_rect(Rect2(x, y, TILE + 1, TILE + 1), base)
            if (x / TILE * 7 + y / TILE * 11) % 7 == 0:
                draw_rect(Rect2(x + 7, y + 9, 28, 3), Color("#6d6945", 0.22))
            if (x / TILE * 3 + y / TILE) % 11 == 0 and x > 1350:
                draw_line(Vector2(x + 13, y + 7), Vector2(x + 33, y + 29), Color("#5b4043", 0.55), 3.0)
    # The old Caldris road is our navigable landmark, not an automated route.
    _path(PackedVector2Array([Vector2(95, 1050), Vector2(640, 1040), Vector2(1080, 990), Vector2(1550, 960), Vector2(1910, 930), Vector2(2280, 790)]), 125.0, Color("#544c40"))
    _path(PackedVector2Array([Vector2(95, 1050), Vector2(640, 1040), Vector2(1080, 990), Vector2(1550, 960), Vector2(1910, 930), Vector2(2280, 790)]), 100.0, Color("#67604d"))
    # Agricultural furrows and wheat rows.
    for i in range(215):
        var px: float = random.randf_range(400.0, 1350.0)
        var py: float = random.randf_range(200.0, 1480.0)
        if absf(py - (1040.0 - (px - 600.0) * 0.08)) > 125.0:
            _wheat(Vector2(px, py), random.randf_range(0.8, 1.3))
    for i in range(44):
        var px: float = random.randf_range(50.0, 2580.0)
        var py: float = random.randf_range(90.0, 1550.0)
        if (px < 380.0 or px > 1320.0) and absf(py - 970.0) > 150.0:
            _tree(Vector2(px, py), random.randf_range(0.75, 1.25), px > 1430.0)
    # Bellmere's damaged outskirts: fences, dwellings and a watchtower.
    _fence(Vector2(530, 760), Vector2(1110, 760))
    _fence(Vector2(570, 1260), Vector2(1040, 1260))
    _house(Vector2(1170, 710), 0.94)
    _house(Vector2(1545, 650), 1.03)
    _house(Vector2(1670, 1150), 0.88)
    _house(Vector2(1840, 560), 1.02)
    _watchtower(Vector2(1430, 800))
    # Point of impact: black rock from Veyra embedded in Caldris soil.
    for i in range(34):
        var px: float = random.randf_range(1730, 2560)
        var py: float = random.randf_range(280, 1410)
        var sz: float = random.randf_range(12, 50)
        var p := PackedVector2Array([Vector2(px - sz, py + sz * 0.35), Vector2(px - sz * 0.35, py - sz * 0.9), Vector2(px + sz * 0.55, py - sz * 0.55), Vector2(px + sz, py + sz * 0.6)])
        draw_colored_polygon(p, Color("#1c1b27"))
        draw_line(p[1], p[2], Color("#61545e"), 2.0)
    # Crimson fissures appear only east of Bellmere.
    _scar(PackedVector2Array([Vector2(2110, 290), Vector2(2190, 400), Vector2(2160, 515), Vector2(2235, 605)]))
    _scar(PackedVector2Array([Vector2(2350, 1110), Vector2(2430, 1170), Vector2(2470, 1280), Vector2(2540, 1370)]))
    _wreck(Vector2(230, 1040))
    _chapel(Vector2(2300, 705))


func _path(points: PackedVector2Array, width: float, tint: Color) -> void:
    for i in range(points.size() - 1):
        draw_line(points[i], points[i + 1], tint, width, true)


func _wheat(p: Vector2, scale: float) -> void:
    for j in range(3):
        var off := Vector2(float(j - 1) * 9.0 * scale, 0.0)
        draw_line(p + off, p + off + Vector2(-3, -18) * scale, Color("#82734a"), 2.0)
        draw_circle(p + off + Vector2(-3, -20) * scale, 4.0 * scale, Color("#c29b58" if j == 1 else "#a48850"))


func _tree(p: Vector2, scale: float, blighted: bool) -> void:
    var foliage: Color = Color("#302b35") if blighted else Color("#344b3c")
    var edge: Color = Color("#554052") if blighted else Color("#5a6b43")
    draw_circle(p + Vector2(5, 9) * scale, 27 * scale, Color(0, 0, 0, 0.3))
    draw_rect(Rect2(p + Vector2(-5, -12) * scale, Vector2(10, 47) * scale), Color("#403328"))
    draw_circle(p + Vector2(-17, -13) * scale, 23 * scale, foliage)
    draw_circle(p + Vector2(16, -24) * scale, 27 * scale, foliage)
    draw_circle(p + Vector2(0, -38) * scale, 31 * scale, edge)


func _fence(left: Vector2, right: Vector2) -> void:
    draw_line(left, right, Color("#2d2926"), 8.0)
    draw_line(left + Vector2(0, -9), right + Vector2(0, -9), Color("#7c6850"), 3.0)
    for x in range(int(left.x), int(right.x), 65):
        draw_rect(Rect2(x, left.y - 17, 12, 31), Color("#574435"))


func _house(p: Vector2, scale: float) -> void:
    var body := Rect2(p + Vector2(-72, -45) * scale, Vector2(144, 90) * scale)
    draw_rect(body.grow(7), Color(0, 0, 0, 0.32))
    draw_rect(body, STONE)
    draw_rect(Rect2(p + Vector2(-12, 0) * scale, Vector2(24, 43) * scale), Color("#292324"))
    var roof := PackedVector2Array([p + Vector2(-90, -37) * scale, p + Vector2(0, -114) * scale, p + Vector2(91, -37) * scale])
    draw_colored_polygon(roof, Color("#3a3035"))
    draw_line(roof[0], roof[1], Color("#a07360"), 4.0)
    draw_line(roof[1], roof[2], Color("#a07360"), 4.0)
    draw_rect(Rect2(p + Vector2(-52, -9) * scale, Vector2(23, 21) * scale), Color("#bd8553"))


func _watchtower(p: Vector2) -> void:
    draw_circle(p + Vector2(8, 16), 83.0, Color(0, 0, 0, 0.3))
    draw_rect(Rect2(p - Vector2(40, 76), Vector2(80, 135)), Color("#4b4646"))
    draw_rect(Rect2(p - Vector2(46, 81), Vector2(92, 23)), Color("#67564f"))
    for i in range(5):
        draw_rect(Rect2(p + Vector2(-44 + i * 21, -98), Vector2(11, 26)), Color("#776d60"))


func _wreck(p: Vector2) -> void:
    draw_rect(Rect2(p - Vector2(91, 35), Vector2(180, 83)), Color("#2a2627"))
    draw_rect(Rect2(p - Vector2(88, 46), Vector2(166, 48)), Color("#62503b"))
    draw_line(p + Vector2(-75, -26), p + Vector2(91, 45), Color("#a1825f"), 12.0)
    draw_line(p + Vector2(-70, 40), p + Vector2(80, -41), Color("#9b8060"), 8.0)
    draw_circle(p + Vector2(-48, 43), 23, Color("#201d20"))
    draw_circle(p + Vector2(-48, 43), 12, Color("#746553"))
    draw_circle(p + Vector2(49, 43), 23, Color("#201d20"))
    draw_circle(p + Vector2(49, 43), 12, Color("#746553"))
    draw_circle(p + Vector2(-15, -34), 13, Color("#a83f48", 0.85))


func _chapel(p: Vector2) -> void:
    draw_circle(p + Vector2(0, 20), 188, Color("#251b29", 0.55))
    draw_rect(Rect2(p + Vector2(-130, -124), Vector2(260, 255)), Color("#24242c"))
    draw_rect(Rect2(p + Vector2(-119, -115), Vector2(238, 234)), Color("#55505a"))
    for i in range(6):
        var y: float = p.y - 103 + float(i) * 37
        draw_line(Vector2(p.x - 115, y), Vector2(p.x + 115, y), Color("#78717a"), 2.0)
    draw_circle(p - Vector2(0, 24), 90, Color("#2a1829"))
    draw_arc(p - Vector2(0, 24), 95, 0, TAU, 80, Color("#8d4455"), 8.0)
    for i in range(8):
        var a: float = float(i) * TAU / 8.0
        var end: Vector2 = Vector2.RIGHT.rotated(a)
        draw_line(p - Vector2(0, 24) + end * 98, p - Vector2(0, 24) + end * 128, Color("#aa7a4d"), 5.0)
    draw_rect(Rect2(p + Vector2(-20, -120), Vector2(40, 44)), Color("#311c28"))


func _scar(points: PackedVector2Array) -> void:
    for i in range(points.size() - 1):
        draw_line(points[i], points[i + 1], Color("#190e1b"), 23.0)
        draw_line(points[i], points[i + 1], Color("#8a293e"), 8.0)
        draw_line(points[i], points[i + 1], Color("#de6968"), 2.0)
