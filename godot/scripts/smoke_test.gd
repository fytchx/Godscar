extends SceneTree
const Sim = preload("res://scripts/sim.gd")
const D = preload("res://scripts/catalog.gd")

func _initialize() -> void:
	call_deferred("_run")

func _check(condition: bool, message: String) -> void:
	if not condition:
		push_error("GODSCAR SMOKE FAILED: " + message)
		quit(1)

func _run() -> void:
	for cls in D.CLASSES:
		var sim = Sim.new()
		sim.new_game(cls)
		_check(sim.g["cls"] == cls, "class creation " + cls)
		_check(sim.g["equip"].has("weapon"), "starting weapon " + cls)
		_check(sim.s["life"] > 0, "starting stats " + cls)
		sim.advance(180.0)
		_check(sim.g["life_kills"] > 0, "passive kills " + cls)
		_check(sim.g["t"] >= 179.9, "simulation progresses " + cls)
		var bad: String = sim.action("passive", {"key": "invalid"})
		_check(not bad.is_empty(), "rejects unknown passive")
		var before: int = sim.g["level"]
		sim.g["points"] += 1
		_check(sim.action("passive", {"key": "might"}).is_empty(), "passive assignment")
		_check(sim.g["level"] == before, "passive doesn't change level")
		_check(sim.action("target", {"key": "husk", "level": 1}).is_empty(), "target change")
		sim.g["gold"] = 100000
		_check(sim.action("craft", {"slot": "weapon", "rarity": "common", "level": 1}).is_empty(), "craft")
		var index: int = sim.g["bag"].size() - 1
		_check(sim.action("equip", {"index": index}).is_empty(), "equip")
		_check(sim.action("upgrade", {"slot": "weapon"}) != null, "upgrade returns a value")
		var save_text = JSON.stringify(sim.g)
		_check(JSON.parse_string(save_text) is Dictionary, "JSON save encode/decode")
		print("PASS %s: kills=%s lvl=%s" % [cls, sim.g["life_kills"], sim.g["level"]])
	print("GODSCAR NATIVE SMOKE PASSED")
	quit(0)
