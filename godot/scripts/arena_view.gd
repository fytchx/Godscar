extends Control
## Lightweight native combat scene. No assets are borrowed from the abandoned action prototype.
const D = preload("res://scripts/catalog.gd")
var sim: RefCounted
var motion := 0.0

func _process(delta: float) -> void:
	motion += delta
	queue_redraw()

func _draw() -> void:
	var w := size.x
	var h := size.y
	draw_rect(Rect2(Vector2.ZERO, size), Color("#14141c"))
	draw_rect(Rect2(0, h * 0.78, w, h * 0.22), Color("#201b21"))
	for i in range(9):
		var x: float = i * w / 8.0
		draw_line(Vector2(x, h * 0.79), Vector2(w * 0.5 + (x - w * 0.5) * 1.5, h), Color("#392a30", 0.55), 1.0)
	draw_line(Vector2(0, h * 0.79), Vector2(w, h * 0.79), Color("#6f343d"), 2.0)
	var pulse := sin(motion * 2.3) * 0.5 + 0.5
	var mid := w * 0.5
	var scar := PackedVector2Array([
		Vector2(mid - 10, 0), Vector2(mid + 3, h * 0.19),
		Vector2(mid - 2, h * 0.43), Vector2(mid + 16, h * 0.68),
		Vector2(mid - 6, h * 0.81), Vector2(mid + 10, h * 0.68),
		Vector2(mid - 10, h * 0.45), Vector2(mid + 7, h * 0.21)
	])
	draw_colored_polygon(scar, Color(0.73, 0.08 + pulse * 0.12, 0.15 + pulse * 0.13, 0.52))
	draw_line(Vector2(mid - 10, 0), Vector2(mid - 3, h * 0.43), Color("#f04b58", 0.24 + pulse * 0.16), 3.0)
	if sim == null or sim.g.is_empty():
		return
	var left := Vector2(w * 0.25, h * 0.62)
	var right := Vector2(w * 0.77, h * 0.62)
	var f: Dictionary = sim.f
	var mon: Dictionary = f.get("monster", {})
	var attacking := sin(motion * TAU / maxf(0.35, float(sim.s.get("interval", 1.5)))) > 0.62
	_draw_hero(left + Vector2(10 if attacking else 0, 0), sim.g["cls"])
	if not mon.is_empty():
		_draw_enemy(right, mon)
		var hp := clampf(float(mon["hp"]) / maxf(1.0, float(mon["max"])), 0.0, 1.0)
		draw_rect(Rect2(right.x - 42, right.y - 90, 84, 5), Color("#441e28"))
		draw_rect(Rect2(right.x - 42, right.y - 90, 84 * hp, 5), Color("#d04d5d"))
		if attacking:
			draw_line(left + Vector2(30, -30), right + Vector2(-27, -35), Color("#f1b46b", 0.35), 3.0)
	else:
		draw_arc(right + Vector2(0, -25), 18 + pulse * 2, 0, TAU, 28, Color("#b32b45", 0.5), 2.0)
	if float(f.get("dead_until", 0)) > float(sim.g.get("t", 0)):
		draw_rect(Rect2(Vector2.ZERO, size), Color("#21070c", 0.42))

func _draw_hero(p: Vector2, cls: String) -> void:
	var colors := {"warrior": "#87949f", "paladin": "#b9a67e", "sorcerer": "#9972b8", "hunter": "#82a08c", "rogue": "#8599af"}
	var metal := Color(colors.get(cls, "#a1a1a1"))
	draw_ellipse(p + Vector2(0, 13), Vector2(31, 8), Color("#090d12", 0.7))
	draw_colored_polygon(PackedVector2Array([p + Vector2(-17, 10), p + Vector2(-12, -38), p + Vector2(14, -38), p + Vector2(17, 10)]), metal.darkened(0.36))
	draw_rect(Rect2(p + Vector2(-13, -42), Vector2(27, 33)), metal)
	draw_circle(p + Vector2(0, -56), 13, Color("#65545a"))
	draw_colored_polygon(PackedVector2Array([p + Vector2(-15, -61), p + Vector2(0, -80), p + Vector2(15, -61)]), metal.lightened(0.12))
	draw_line(p + Vector2(15, -31), p + Vector2(31, -6), metal, 6.0)
	draw_line(p + Vector2(-15, -31), p + Vector2(-25, -9), metal, 6.0)
	draw_line(p + Vector2(-7, 5), p + Vector2(-11, 29), metal.darkened(0.2), 6.0)
	draw_line(p + Vector2(7, 5), p + Vector2(11, 29), metal.darkened(0.2), 6.0)
	if cls == "hunter":
		draw_arc(p + Vector2(30, -24), 28, -PI * 0.45, PI * 0.45, 16, Color("#d1b180"), 2.0)
	else:
		draw_line(p + Vector2(30, -8), p + Vector2(42, -73), Color("#d4c1a2"), 3.0)
		draw_line(p + Vector2(26, -22), p + Vector2(44, -22), Color("#b48e72"), 3.0)

func _draw_enemy(p: Vector2, m: Dictionary) -> void:
	var key: String = m["key"]
	draw_ellipse(p + Vector2(0, 15), Vector2(34, 9), Color("#080b10", 0.75))
	if key == "wisp" or key == "shade":
		draw_circle(p + Vector2(0, -36), 24, Color("#512d43") if key == "shade" else Color("#874d28"))
		draw_arc(p + Vector2(0, -35), 24 + sin(motion * 3) * 4, 0, TAU, 32, Color("#d3445d"), 2.0)
		draw_circle(p + Vector2(-9, -38), 4, Color("#f1ba75"))
		draw_circle(p + Vector2(9, -38), 4, Color("#f1ba75"))
	else:
		var tone := Color("#6c5e61") if key == "knight" or key == "colossus" else Color("#6d4a48")
		draw_colored_polygon(PackedVector2Array([p + Vector2(-23, 13), p + Vector2(-19, -46), p + Vector2(18, -46), p + Vector2(28, 13)]), tone)
		draw_circle(p + Vector2(0, -59), 17, tone.lightened(0.12))
		draw_line(p + Vector2(-9, -60), p + Vector2(-3, -60), Color("#f04b58"), 3.0)
		draw_line(p + Vector2(4, -60), p + Vector2(10, -60), Color("#f04b58"), 3.0)
		draw_line(p + Vector2(-21, -24), p + Vector2(-33, 6), tone, 9.0)
		draw_line(p + Vector2(22, -24), p + Vector2(34, 6), tone, 9.0)
