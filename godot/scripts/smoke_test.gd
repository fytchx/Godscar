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
		# Exercise newer item/socket/inscription paths independently of drop randomness.
		sim.g["gold"] = 1000000
		sim.g["mats"]["shards"] = 500
		for ty in D.TYPES:
			sim.g["mats"][ty] = 100
		var belt: Dictionary = sim.make_item("belt", 1, "rare")
		sim.g["bag"].append(belt)
		_check(sim.action("equip", {"index": sim.g["bag"].size() - 1}).is_empty(), "equip belt")
		_check(sim.action("add_socket").is_empty(), "socket equipped belt")
		sim.g["jewels"].append({"id": "test-jewel", "cls": cls, "pot": 1.1})
		_check(sim.action("socket_jewel", {"index": sim.g["jewels"].size() - 1}).is_empty(), "insert jewel")
		_check(sim.s["evo"] == cls, "class evolution active")
		_check(sim.action("unsocket_jewel").is_empty(), "remove jewel")
		_check(sim.s["evo"] == "", "evolution removed")
		var rare: Dictionary = sim.make_item("weapon", 1, "rare", D.CLASSES[cls]["start_weapon"])
		sim.g["bag"].append(rare)
		_check(sim.action("equip", {"index": sim.g["bag"].size() - 1}).is_empty(), "equip rare weapon")
		_check(sim.action("reforge", {"slot": "weapon", "index": 0}).is_empty(), "reforge affix")
		_check(sim.action("inscribe", {"slot": "weapon", "spell": "cinderburst"}).is_empty(), "inscribe spell")
		_check(sim.s["available_spells"].has("cinderburst"), "inscribed spell available")
		var save_text = JSON.stringify(sim.g)
		_check(JSON.parse_string(save_text) is Dictionary, "JSON save encode/decode")
		print("PASS %s: kills=%s lvl=%s" % [cls, sim.g["life_kills"], sim.g["level"]])
	print("GODSCAR NATIVE SMOKE PASSED")
	quit(0)
