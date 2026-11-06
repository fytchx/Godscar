extends RefCounted
## Native Godot simulation for the NEW continuous-combat Godscar.
## Source reference: web/src/sim.js, SIM_VERSION 4. This port is not yet parity certified.
const D = preload("res://scripts/catalog.gd")
const SAVE_PATH = "user://godscar_save.json"
const OFFLINE_CAP = 86400.0
const BAG_CAP = 36
var g: Dictionary = {}
var f: Dictionary = {}
var rng := RandomNumberGenerator.new()
var s: Dictionary = {}
var events: Array[String] = []
var dirty := false

func note(message: String) -> void:
	events.push_front(message)
	if events.size() > 28:
		events.resize(28)
	dirty = true

func now() -> float:
	return Time.get_unix_time_from_system()

func r(a: float = 0.0, b: float = 1.0) -> float:
	return rng.randf_range(a, b)

func choose(a: Array) -> Variant:
	return a[rng.randi_range(0, a.size() - 1)] if not a.is_empty() else null

func gear(level: int) -> float:
	return pow(1.105, level - 1)

func monster_growth(level: int) -> float:
	return pow(1.155, level - 1)

func xp_needed(level: int) -> int:
	return roundi(70.0 * pow(1.19, level - 1) + 40.0 * level)

func rank(rarity: String) -> int:
	return D.RARITIES.find(rarity)

func fmt(v: float) -> String:
	if absf(v) >= 1000000.0:
		return "%.1fM" % (v / 1000000.0)
	if absf(v) >= 10000.0:
		return "%.1fk" % (v / 1000.0)
	return str(roundi(v))

func new_game(cls: String) -> void:
	if not D.CLASSES.has(cls):
		cls = "warrior"
	rng.randomize()
	g = {
		"version": 1, "source_sim_version": 4, "cls": cls, "level": 1, "xp": 0,
		"points": 0, "passives": {}, "spec": -1, "gold": 0, "mats": {"shards": 0},
		"bag": [], "equip": {}, "jewels": [], "target": {"key": "husk", "level": 1},
		"unlocked": {}, "boss_unlocked": {"bellkeeper": 3, "woundwarden": 20},
		"zones": {"fallfields": true, "hollow": false}, "asc": {"unlocked": false, "base": 0, "slots": {}},
		"sigils": 0, "sigil_prog": 0, "filter": "uncommon", "auto_push": true,
		"push_retries": 1, "streak": 0, "deaths_here": 0,
		"life_kills": 0, "life_deaths": 0, "life_bosses": 0, "offline_seconds": 0.0,
		"kill_counts": {}, "t": 0.0, "last_seen": now(), "rng_state": 0,
		"spell_bar": [], "last_boss": ""
	}
	for key in D.MONSTERS:
		var m: Dictionary = D.MONSTERS[key]
		g["unlocked"][key] = int(D.ZONES[m["zone"]]["min_level"])
	for slot in D.ARMOR_SLOTS:
		g["asc"]["slots"][slot] = 0
	var it := make_item("weapon", 1, "common", str(D.CLASSES[cls]["start_weapon"]))
	it["name"] = "Rusted " + D.WEAPONS[it["base"]]["name"]
	g["equip"]["weapon"] = it
	f = empty_fight(0.0)
	g["fight"] = f
	_refresh()
	note("The wound opens. Your battle begins.")

func empty_fight(t: float) -> Dictionary:
	return {"hp": -1.0, "monster": {}, "p_next": t + 0.15, "m_next": t + 1.0, "pulse_next": t + 1.0,
		"respawn_at": t, "dead_until": 0.0, "cooldowns": {}, "buffs": {}, "shield": 0.0,
		"cycle": 0, "crit_cast_at": -999.0}

func load_save() -> bool:
	if not FileAccess.file_exists(SAVE_PATH):
		return false
	var file := FileAccess.open(SAVE_PATH, FileAccess.READ)
	if file == null:
		return false
	var raw: Variant = JSON.parse_string(file.get_as_text())
	if not (raw is Dictionary) or not raw.has("fight") or not raw.has("cls") or int(raw.get("version", 0)) != 1:
		return false
	if not D.CLASSES.has(raw["cls"]):
		return false
	g = raw
	f = g["fight"]
	rng.randomize()
	if int(g.get("rng_state", 0)) != 0:
		rng.state = int(g["rng_state"])
	_refresh()
	var elapsed := clampf(now() - float(g.get("last_seen", now())), 0.0, OFFLINE_CAP)
	if elapsed > 0.1:
		advance(elapsed)
		g["offline_seconds"] = float(g.get("offline_seconds", 0)) + elapsed
		note("Fought while away for %s seconds." % fmt(elapsed))
	save_game()
	return true

func save_game() -> void:
	if g.is_empty():
		return
	g["last_seen"] = now()
	g["rng_state"] = rng.state
	var file := FileAccess.open(SAVE_PATH, FileAccess.WRITE)
	if file != null:
		file.store_string(JSON.stringify(g))
	dirty = false

func _refresh() -> void:
	if g.is_empty():
		return
	var c: Dictionary = D.CLASSES[g["cls"]]
	var level := int(g["level"])
	var spec: Dictionary = {}
	if int(g.get("spec", -1)) >= 0:
		spec = c["specs"][int(g["spec"])]
	var p: Dictionary = g["passives"]
	var attrs: Dictionary = {}
	for a in D.ATTRS:
		attrs[a] = float(c["attr"][a]) + float(c["attr_per"][a]) * float(level - 1)
	var st: Dictionary = {"life": float(c["life"]) + float(c["life_per"]) * (level - 1),
		"armor": float(c["armor"]) + float(c["armor_per"]) * (level - 1),
		"regen": float(c["regen"]) * (1.0 + 0.06 * (level - 1)),
		"crit": 5.0 + float(c["crit"]), "crit_mult": 150.0, "atk_spd": 0.0, "dmg_pct": 0.0,
		"elem_pct": 0.0, "spell_pct": 0.0, "cdr": 0.0, "dodge": 0.0, "reflect": 0.0,
		"life_on_hit": 0.0, "armor_pen": 0.0, "gold_find": 0.0, "companion_pct": 0.0,
		"atk_dmg": 0.0, "double_cast": 0.0, "attrs": attrs, "flat": {}, "res": {},
		"aug": {}, "sets": {}, "spells": [], "weapon_type": "phys", "weapon_damage": 3.0,
		"interval": 1.5, "evo": "", "evo_pot": 0.0}
	for t in D.TYPES:
		st["flat"][t] = 0.0
	for t in D.ELEMS:
		st["res"][t] = 0.0
	var belt: Dictionary = g["equip"].get("belt", {})
	if belt.has("jewel") and belt["jewel"].get("cls", "") == g["cls"]:
		st["evo"] = g["cls"]
		st["evo_pot"] = float(belt["jewel"].get("pot", 1.0))
	var offhand_weapon: Dictionary = {}
	for slot in D.SLOTS:
		var it: Dictionary = g["equip"].get(slot, {})
		if it.is_empty():
			continue
		var scale := gear(int(g["asc"]["base"]) + 2 * int(g["asc"]["slots"].get(it["slot"], 0))) / gear(int(it["ilvl"])) if it["rarity"] == "ascended" else 1.0 + 0.1 * int(it.get("plus", 0))
		if slot == "weapon":
			var w: Dictionary = D.WEAPONS.get(it["base"], D.WEAPONS["sword"])
			st["weapon_type"] = w["type"]
			st["weapon_damage"] = float(it.get("dmg", 7.0)) * float(w["mult"]) * scale
			st["interval"] = float(w["interval"])
		elif slot == "offhand" and it["slot"] == "weapon":
			offhand_weapon = it
		elif slot == "offhand":
			match str(it["base"]):
				"shield": st["reflect"] += float(it.get("ohv", 0)) * scale
				"tome": st["spell_pct"] += float(it.get("ohv", 0))
				"quiver": st["companion_pct"] += float(it.get("ohv", 0))
		st["armor"] += float(it.get("def", 0)) * scale
		st["life"] += float(it.get("life", 0)) * scale
		if it.has("attr"):
			st["attrs"][it["attr"][0]] += float(it["attr"][1])
		for aff in it.get("affixes", []):
			var k: String = aff["key"]
			var v: float = float(aff["value"]) * (scale if D.AFFIXES.get(k, {}).get("scales", false) or k.begins_with("flat_") else 1.0)
			if k.begins_with("flat_"):
				st["flat"][k.substr(5)] += v
			elif k.begins_with("res_"):
				st["res"][k.substr(4)] += v
			elif k.begins_with("attr_"):
				st["attrs"][k.substr(5)] += v
			else:
				var mapped: String = {"dmgPct": "dmg_pct", "elemPct": "elem_pct", "critChance": "crit",
					"critMulti": "crit_mult", "atkSpd": "atk_spd", "spellPct": "spell_pct",
					"lifeOnHit": "life_on_hit", "goldFind": "gold_find"}.get(k, k)
				st[mapped] = float(st.get(mapped, 0)) + v
		if it.has("enchant"):
			var k: String = str(it["enchant"]["key"])
			var mapped: String = {"elemDmg": "elem_pct", "atkSpd": "atk_spd", "atkDmg": "atk_dmg", "doubleCast": "double_cast"}.get(k, k)
			st[mapped] = float(st.get(mapped, 0)) + float(it["enchant"]["value"])
		for aug in it.get("augments", []):
			st["aug"][aug] = true
		if it.has("set"):
			st["sets"][it["set"]] = int(st["sets"].get(it["set"], 0)) + 1
		if it.has("spell") and not st["spells"].has(it["spell"]):
			st["spells"].append(it["spell"])
	if st["evo"] == "warrior" and not offhand_weapon.is_empty():
		var w: Dictionary = D.WEAPONS[offhand_weapon["base"]]
		st["flat"][w["type"]] += float(offhand_weapon["dmg"]) * float(w["mult"]) * 0.6 * st["evo_pot"]
	for a in D.ATTRS:
		st["attrs"][a] = float(st["attrs"][a])
	st["atk_spd"] += float(spec.get("atk_spd", 0)) + 1.5 * float(p.get("swiftness", 0)) + 0.15 * st["attrs"]["DEX"]
	st["crit"] += float(spec.get("crit", 0)) + 0.6 * float(p.get("precision", 0)) + 0.03 * st["attrs"]["DEX"]
	st["crit_mult"] += float(spec.get("crit_mult", 0)) + 3.0 * float(p.get("precision", 0))
	for t in D.ELEMS:
		st["res"][t] = minf(75.0, st["res"][t] + float(spec.get("all_res", 0)) + 0.5 * float(p.get("bulwark", 0)))
	st["dodge"] = 0.0 if st["evo"] == "rogue" else minf(50.0, st["dodge"] + float(spec.get("dodge", 0)))
	st["armor_pen"] = float(spec.get("armor_pen", 0))
	st["cdr"] = minf(40.0, st["cdr"] + float(spec.get("cdr", 0)))
	st["life"] *= (1.0 + float(spec.get("life_mult", 0))) * (1.0 + 0.03 * float(p.get("vitality", 0))) * (1.0 + 0.002 * st["attrs"]["STR"])
	st["armor"] *= (1.0 + float(spec.get("armor_mult", 0))) * (1.0 + 0.03 * float(p.get("bulwark", 0))) * (1.25 if int(st["sets"].get("warden", 0)) >= 2 else 1.0)
	st["regen"] *= 1.0 + float(spec.get("regen_mult", 0))
	st["life_on_hit"] *= 1.0 + float(spec.get("life_on_hit_mult", 0))
	if st["aug"].has("tithe"):
		st["life_on_hit"] *= 3.0
		st["life"] *= 0.75
	if st["aug"].has("glass"):
		st["life"] *= 0.75
	var pre: Dictionary = st["flat"].duplicate(true)
	pre[st["weapon_type"]] += st["weapon_damage"]
	for t in D.ELEMS:
		if st["aug"].has("conv_" + t):
			pre[t] += pre["phys"] * 0.5
			pre["phys"] *= 0.5
	st["pre"] = pre
	var global := (1.0 + 0.03 * (level - 1)) * (1.0 + st["dmg_pct"] / 100.0) * (1.0 + float(spec.get("damage", 0))) * (1.0 + 0.02 * float(p.get("might", 0))) * (1.3 if st["aug"].has("glass") else 1.0)
	var elem_mult := 1.0 + st["elem_pct"] / 100.0 + 0.003 * st["attrs"]["INT"]
	st["type_mult"] = {"phys": global * (1.0 + 0.003 * st["attrs"]["STR"])}
	for t in D.ELEMS:
		st["type_mult"][t] = global * elem_mult * (0.9 if st["evo"] == "sorcerer" else 1.0) * (1.2 if (t == "fire" or t == "holy") and int(st["sets"].get("vigil", 0)) >= 2 else 1.0)
	if st["evo"] == "paladin":
		st["type_mult"]["holy"] = global * elem_mult * 0.75
		st["type_mult"]["shadow"] *= 1.0 + 0.15 * st["evo_pot"]
	st["reflect"] = (st["reflect"] + (0.6 * st["armor"] if st["aug"].has("bulwark") else 0.0)) * (1.0 + 0.03 * (level - 1)) * (1.0 + float(spec.get("reflect_mult", 0)))
	st["spell_mult"] = (1.0 + st["spell_pct"] / 100.0 + 0.0025 * st["attrs"]["INT"] + (0.0025 * st["attrs"]["STR"] if st["aug"].has("strspell") else 0.0)) * (1.0 + float(spec.get("spell_mult", 0))) * (1.0 + 0.03 * float(p.get("sorcery", 0)))
	st["dot_mult"] = (1.0 + float(spec.get("dot_mult", 0))) * (1.0 + 0.03 * float(p.get("sorcery", 0)))
	st["companion_mult"] = (1.0 + float(spec.get("companion_mult", 0))) * (1.0 + st["companion_pct"] / 100.0)
	st["interval"] = st["interval"] / (1.0 + minf(300.0, st["atk_spd"]) / 100.0) * (1.35 if st["aug"].has("heavy") else 1.0)
	st["crit"] = minf(75.0, st["crit"])
	st["double_cast"] = minf(50.0, st["double_cast"])
	st["life"] = float(roundi(st["life"]))
	st["hit"] = 0.0
	for t in D.TYPES:
		st["hit"] += pre[t] * st["type_mult"][t]
	var spells: Array = []
	if int(g["level"]) >= 3:
		spells.append(c["spell"])
	for sp in st["spells"]:
		if not spells.has(sp):
			spells.append(sp)
	st["available_spells"] = spells
	if g["spell_bar"].is_empty():
		g["spell_bar"] = [null, null, null, null, null]
	for sp in spells:
		if g["spell_bar"].has(sp):
			continue
		for idx in range(5):
			var is_util: bool = D.SPELLS[sp].get("kind", "off") == "util"
			if g["spell_bar"][idx] == null and ((idx >= 3) == is_util):
				g["spell_bar"][idx] = sp
				break
	for idx in range(5):
		if g["spell_bar"][idx] != null and not spells.has(g["spell_bar"][idx]):
			g["spell_bar"][idx] = null
	s = st
	if not f.is_empty() and float(f.get("hp", -1)) < 0:
		f["hp"] = s["life"]

func roll_rarity(zone: String) -> String:
	var weights: Array = D.ZONES[zone]["weights"]
	var total := 0.0
	for w in weights:
		total += float(w)
	var value := r(0, total)
	for idx in range(weights.size()):
		value -= float(weights[idx])
		if value <= 0:
			return D.RARITIES[idx]
	return "common"

func make_item(slot: String, ilvl: int, rarity: String = "", base: String = "") -> Dictionary:
	var zone: String = "hollow" if g.get("zones", {}).get("hollow", false) else "fallfields"
	if rarity.is_empty():
		rarity = roll_rarity(zone)
	var item: Dictionary = {"id": "i%s" % str(rng.randi()), "slot": slot, "ilvl": maxi(1, ilvl), "rarity": rarity,
		"plus": 0, "affixes": [], "augments": [], "locked": false, "shards_in": 0}
	var growth := gear(ilvl)
	if slot == "weapon":
		item["base"] = base if D.WEAPONS.has(base) else choose(D.WEAPONS.keys())
		item["dmg"] = 7.0 * growth * r(0.92, 1.08)
	elif slot == "offhand":
		item["base"] = base if D.OFFHANDS.has(base) else choose(D.OFFHANDS.keys())
		item["ohv"] = r(3, 5) * growth if item["base"] == "shield" else r(15, 30) * (1.0 + ilvl * 0.008)
	elif D.DEF_BASE.has(slot):
		item["def"] = D.DEF_BASE[slot] * growth * r(0.9, 1.1)
		if slot == "chest":
			item["life"] = 10.0 * growth
	else:
		item["attr"] = [choose(D.ATTRS), r(3, 6) + ilvl * 0.35]
	var counts: Array = D.AFFIX_COUNT[rarity]
	var n := rng.randi_range(int(counts[0]), int(counts[1]))
	for idx in range(n):
		var a: Dictionary = roll_affix(item)
		if not a.is_empty():
			item["affixes"].append(a)
	if rank(rarity) >= 3:
		var key: String = choose(D.ENCHANTS.keys())
		var bounds: Array = D.ENCHANTS[key]
		var tier: float = {"epic": 1.0, "legendary": 1.3, "ascended": 1.5}.get(rarity, 1.0)
		item["enchant"] = {"key": key, "value": r(float(bounds[0]), float(bounds[1])) * tier}
	if rarity == "legendary":
		var n_aug := 1 + int(r() < 0.45) + int(r() < 0.12)
		for idx in range(n_aug):
			var pool: Array = []
			for aug in D.AUGMENTS:
				if not item["augments"].has(aug) and (not aug.begins_with("conv_") or not has_conversion(item["augments"])):
					pool.append(aug)
			if pool.is_empty():
				break
			item["augments"].append(choose(pool))
	if rarity == "ascended":
		item["set"] = choose(D.SETS.keys())
	if slot == "belt" and rank(rarity) >= 4 and r() < 0.2:
		item["socket"] = true
	if zone == "hollow" and rank(rarity) >= 2 and r() < (0.27 if rank(rarity) >= 3 else 0.18):
		var found := []
		for sp in D.SPELLS:
			if not D.CLASSES.values().any(func(c): return c["spell"] == sp):
				found.append(sp)
		item["spell"] = choose(found)
	item["name"] = item_name(item)
	return item

func has_conversion(augs: Array) -> bool:
	for aug in augs:
		if str(aug).begins_with("conv_"):
			return true
	return false

func item_name(item: Dictionary) -> String:
	var slot: String = item["slot"]
	var noun: String = D.WEAPONS[item["base"]]["name"] if slot == "weapon" else (D.OFFHANDS[item["base"]]["name"] if slot == "offhand" else slot.capitalize())
	if item.has("set"):
		return D.SETS[item["set"]] + " " + noun
	if not item["augments"].is_empty():
		return str(item["augments"][0]).capitalize() + " " + noun
	if item.has("spell"):
		return noun + " of " + D.SPELLS[item["spell"]]["name"]
	if item.has("enchant"):
		return "Enchanted " + noun
	if item["rarity"] == "common":
		return noun
	return choose(["Ashen", "Blighted", "Scarbound", "Hollow", "Riftworn", "Oathbroken"]) + " " + noun

func roll_affix(item: Dictionary) -> Dictionary:
	var slot: String = item["slot"]
	var available: Array = []
	for key in D.AFFIXES:
		if D.AFFIXES[key]["slots"].has(slot):
			var used := false
			for old in item["affixes"]:
				if old["key"] == key:
					used = true
			if not used:
				available.append(key)
	for t in D.TYPES:
		if ["weapon", "gloves", "ring", "amulet"].has(slot):
			var key := "flat_" + t
			if not has_affix(item, key):
				available.append(key)
	for t in D.ELEMS:
		if ["helm", "chest", "belt", "legs", "boots", "ring", "amulet", "offhand"].has(slot):
			var key := "res_" + t
			if not has_affix(item, key):
				available.append(key)
	for attr in D.ATTRS:
		if slot != "weapon":
			var key := "attr_" + attr
			if not has_affix(item, key):
				available.append(key)
	if available.is_empty():
		return {}
	var key: String = choose(available)
	var value := 0.0
	if key.begins_with("flat_"):
		value = r(1.5, 3.0) * gear(item["ilvl"])
	elif key.begins_with("res_"):
		value = r(8, 18) * (1.0 + item["ilvl"] * 0.008)
	elif key.begins_with("attr_"):
		value = r(2, 4) + item["ilvl"] * 0.2
	else:
		var info: Dictionary = D.AFFIXES[key]
		value = r(info["min"], info["max"])
		if info.get("scales", false):
			value *= gear(item["ilvl"])
		else:
			value *= 1.0 + item["ilvl"] * 0.008
	return {"key": key, "value": value}

func has_affix(item: Dictionary, key: String) -> bool:
	for aff in item["affixes"]:
		if aff["key"] == key:
			return true
	return false

func spawn(key: String, level: int) -> Dictionary:
	var m: Dictionary = D.MONSTERS.get(key, D.BOSSES.get(key, D.MONSTERS["husk"]))
	var scale := monster_growth(level) * float(D.ZONES[m["zone"]]["tough"])
	return {"key": key, "level": level, "hp": m["hp"] * scale, "max": m["hp"] * scale,
		"dmg": m["dmg"] * scale, "armor": m["armor"] * scale, "interval": m["interval"],
		"type": m["type"], "res": m.get("res", {}), "regen": m.get("regen", 0.0),
		"blighted": m.get("blighted", false), "evade": m.get("evade", 0.0),
		"burn": 0.0, "burn_until": 0.0, "bleed": 0.0, "bleed_until": 0.0,
		"chill": 0, "chill_until": 0.0, "shock_until": 0.0, "shock_amt": 0.0, "stacks": 0}

func advance(duration: float) -> void:
	if g.is_empty() or duration <= 0:
		return
	var finish: float = float(g["t"]) + duration
	var guard := 0
	while float(g["t"]) < finish and guard < 750000:
		guard += 1
		if bool(g.get("boss_mode", false)) and (g.get("boss_won", false) or g.get("boss_died", false)):
			break
		var t: float = float(g["t"])
		var next_t := finish
		var what := ""
		var spell := ""
		if float(f["dead_until"]) > t:
			next_t = minf(finish, float(f["dead_until"]))
			what = "revive"
		elif f["monster"].is_empty():
			next_t = minf(finish, maxf(t, float(f["respawn_at"])))
			what = "spawn"
		else:
			next_t = float(f["p_next"])
			what = "player"
			if float(f["m_next"]) < next_t:
				next_t = float(f["m_next"])
				what = "monster"
			if float(f["pulse_next"]) < next_t:
				next_t = float(f["pulse_next"])
				what = "pulse"
			for sp in g["spell_bar"]:
				if sp == null:
					continue
				var cd: float = float(f["cooldowns"].get(sp, t + 0.3))
				if cd < next_t:
					next_t = cd
					what = "spell"
					spell = sp
			if next_t > finish:
				what = ""
		if next_t > finish:
			next_t = finish
			what = ""
		g["t"] = maxf(t, next_t)
		match what:
			"revive":
				if float(g["t"]) >= float(f["dead_until"]):
					f["dead_until"] = 0.0
					f["hp"] = s["life"]
					f["respawn_at"] = g["t"]
					f["shield"] = 0.0
					f["buffs"] = {}
			"spawn":
				if float(g["t"]) >= float(f["respawn_at"]):
					f["monster"] = spawn(g["target"]["key"], int(g["target"]["level"]))
					f["m_next"] = float(g["t"]) + float(f["monster"]["interval"]) * 0.7
					f["p_next"] = maxf(float(f["p_next"]), float(g["t"]) + 0.15)
					f["pulse_next"] = float(g["t"]) + 1.0
					for sp in g["spell_bar"]:
						if sp != null and float(f["cooldowns"].get(sp, 0)) < float(g["t"]) + 0.3:
							f["cooldowns"][sp] = float(g["t"]) + 0.3
			"player":
				primary_attack()
				f["p_next"] = float(g["t"]) + s["interval"]
			"monster":
				monster_attack()
			"pulse":
				pulse()
			"spell":
				cast_spell(spell)
			_:
				break
	dirty = true

func _hit(multiplier: float, forced_type: String = "", primary: bool = false, force_crit: bool = false, ignore_armor: bool = false, extra: Dictionary = {}) -> float:
	var m: Dictionary = f["monster"]
	if m.is_empty():
		return 0.0
	if not extra.get("unevadable", false) and r(0, 100) < float(m["evade"]):
		return 0.0
	var crit: bool = force_crit or r(0, 100) < s["crit"]
	var roll := r(0.85, 1.15) * multiplier * (s["crit_mult"] / 100.0 if crit else 1.0)
	if float(f["buffs"].get("warcry", 0)) > float(g["t"]):
		roll *= 1.3
	if primary:
		roll *= 1.0 + s["atk_dmg"] / 100.0
	var pre: Dictionary = s["pre"].duplicate(true)
	if forced_type == "paladin":
		pre["holy"] += pre["phys"] * 0.4
		pre["phys"] *= 0.6
	elif forced_type == "deathknight":
		pre["shadow"] += pre["phys"] * 0.4
		pre["phys"] *= 0.6
	elif not forced_type.is_empty():
		var amount := 0.0
		for ty in D.TYPES:
			amount += pre[ty]
			pre[ty] = 0.0
		pre[forced_type] = amount
	var dealt := 0.0
	var parts := {}
	var raw := 0.0
	for ty in D.TYPES:
		if pre[ty] <= 0:
			continue
		var damage: float = float(pre[ty]) * s["type_mult"][ty] * roll
		if ty == "light":
			damage *= r(0.5, 1.6) / 1.05
		raw += damage
		if ty == "phys" and not ignore_armor:
			var armor: float = float(m["armor"]) * (1.0 - minf(0.9, s["armor_pen"] + (0.5 if primary and s["aug"].has("rending") else 0.0)))
			damage = maxf(damage * 0.25, damage - armor)
		elif ty != "phys":
			damage *= 1.0 - float(m["res"].get(ty, 0)) / 100.0
		if ty == "holy" and m["blighted"] and s["evo"] != "paladin":
			damage *= 1.4
		parts[ty] = damage
	var extra_mult := 1.0
	if float(m["shock_until"]) > float(g["t"]):
		extra_mult *= 1.0 + float(m["shock_amt"])
	if s["aug"].has("frostbite") and int(m["chill"]) > 0:
		extra_mult *= 1.2
	if s["aug"].has("shielded") and float(f["shield"]) > 0:
		extra_mult *= 1.4
	if primary and s["aug"].has("momentum"):
		extra_mult *= 1.0 + 0.1 * int(m["stacks"])
	if primary and s["evo"] == "rogue" and m["blighted"]:
		extra_mult *= 1.0 + 0.3 * s["evo_pot"]
	for ty in parts:
		parts[ty] *= extra_mult
		dealt += parts[ty]
	m["hp"] -= dealt
	if parts.has("fire"):
		apply_burn(parts["fire"] * 0.15 * s["dot_mult"], 3.0)
	if parts.has("frost"):
		m["chill"] = mini(5, (int(m["chill"]) if float(m["chill_until"]) > float(g["t"]) else 0) + int(extra.get("chill", 1)))
		m["chill_until"] = float(g["t"]) + 3.0
	if parts.has("light"):
		m["shock_amt"] = 0.1
		m["shock_until"] = float(g["t"]) + 3.0
	if parts.has("shadow"):
		f["hp"] = minf(s["life"], float(f["hp"]) + float(parts["shadow"]) * 0.05)
	if parts.has("holy"):
		f["hp"] = minf(s["life"], float(f["hp"]) + float(parts["holy"]) * 0.02)
	if s["life_on_hit"] > 0:
		f["hp"] = minf(s["life"], float(f["hp"]) + s["life_on_hit"])
	if primary and s["aug"].has("siphon"):
		f["hp"] = minf(s["life"], float(f["hp"]) + dealt * 0.04)
	if primary and s["aug"].has("searing"):
		apply_burn(raw * 0.25 * s["dot_mult"], 3.0)
	if s["aug"].has("kindling"):
		apply_burn(raw * 0.4 * s["dot_mult"], 3.0)
	if extra.has("burn"):
		apply_burn(raw * float(extra["burn"]) * s["dot_mult"], float(extra.get("burn_dur", 3.0)))
	if extra.has("bleed"):
		m["bleed"] = maxf(float(m["bleed"]), raw * float(extra["bleed"]) * s["dot_mult"])
		m["bleed_until"] = float(g["t"]) + float(extra.get("bleed_dur", 6.0))
	if extra.has("heal"):
		f["hp"] = minf(s["life"], float(f["hp"]) + dealt * float(extra["heal"]))
	if crit and s["aug"].has("critcast") and not extra.get("triggered", false) and float(g["t"]) - float(f["crit_cast_at"]) >= 4.0:
		for sp in g["spell_bar"]:
			if sp != null and D.SPELLS[sp].get("kind", "") == "util":
				f["crit_cast_at"] = g["t"]
				cast_spell(sp, true)
				break
	return dealt

func apply_burn(amount: float, duration: float) -> void:
	if f["monster"].is_empty():
		return
	var m: Dictionary = f["monster"]
	m["burn"] = maxf(float(m["burn"]) if float(m["burn_until"]) > float(g["t"]) else 0.0, amount)
	m["burn_until"] = maxf(float(m["burn_until"]), float(g["t"]) + duration)

func primary_attack() -> void:
	if f["monster"].is_empty():
		return
	var cls: Dictionary = D.CLASSES[g["cls"]]
	var forced := ""
	match str(g["cls"]):
		"paladin": forced = "deathknight" if s["evo"] == "paladin" else "paladin"
		"sorcerer":
			var cycle: int = int(f["cycle"]) % 3
			forced = ["fire", "frost", "light"][cycle] if s["evo"] == "sorcerer" else "fire"
			f["cycle"] = cycle + 1
		"rogue":
			if s["evo"] == "rogue":
				forced = "shadow"
	var mult: float = float(cls["primary_mult"]) * (1.75 if s["aug"].has("heavy") else 1.0)
	var repeats := 2 if r(0, 100) < s["double_cast"] else 1
	for rep in range(repeats):
		for hit in range(int(cls["hits"])):
			if f["monster"].is_empty():
				break
			_hit(mult, forced, true)
		if s["aug"].has("split") and not f["monster"].is_empty():
			_hit(mult * 0.4, forced, true)
	if not f["monster"].is_empty():
		if s["aug"].has("momentum"):
			f["monster"]["stacks"] = mini(5, int(f["monster"]["stacks"]) + 1)
		if float(f["monster"]["hp"]) <= 0:
			kill_monster()

func spell_condition(sp: String) -> bool:
	var cond: String = D.SPELLS[sp].get("cond", "always")
	var hp_ratio: float = float(f["hp"]) / maxf(1.0, s["life"])
	match cond:
		"hp50": return hp_ratio < 0.5
		"hp70": return hp_ratio < 0.7
		"hp30": return hp_ratio < 0.3
		"foeHigh": return not f["monster"].is_empty() and float(f["monster"]["hp"]) / float(f["monster"]["max"]) > 0.7
	return true

func cast_spell(sp: String, triggered: bool = false) -> void:
	if f["monster"].is_empty() or not D.SPELLS.has(sp):
		return
	var data: Dictionary = D.SPELLS[sp]
	var t: float = float(g["t"])
	if not triggered:
		if not spell_condition(sp):
			f["cooldowns"][sp] = t + 0.5
			return
		var stay: bool = int(s["sets"].get("riftwalker", 0)) >= 4 and data.get("kind", "off") == "off" and r() < 0.25
		f["cooldowns"][sp] = t + (0.5 if stay else float(data["cd"]) * (1.0 - s["cdr"] / 100.0))
	var repeats := 2 if s["aug"].has("echo") and data.get("kind", "off") == "off" else 1
	for i in range(repeats):
		if f["monster"].is_empty():
			break
		if data.has("shield"):
			f["shield"] = maxf(float(f["shield"]), s["life"] * float(data["shield"]))
		elif data.has("buff"):
			f["buffs"][data["buff"]] = t + float(data["duration"])
		elif data.get("kind", "off") == "util":
			if data.has("heal"):
				f["hp"] = minf(s["life"], float(f["hp"]) + s["life"] * float(data["heal"]))
		else:
			var typ: String = data.get("type", "")
			var mult: float = float(data["mult"]) * s["spell_mult"]
			if sp == "consecrate" and s["evo"] == "paladin":
				typ = "shadow"
				mult = 1.8 * s["spell_mult"]
			var extra: Dictionary = {}
			for key in ["burn", "burn_dur", "bleed", "bleed_dur", "chill"]:
				if data.has(key):
					extra[key] = data[key]
			if data.get("unevadable", false):
				extra["unevadable"] = true
			if sp == "consecrate" and s["evo"] == "paladin":
				extra["heal"] = 0.15
			for j in range(int(data.get("repeat", 1))):
				if not f["monster"].is_empty():
					_hit(mult, typ, false, data.get("crit", false), data.get("penetrate", false), extra)
			if data.has("heal") and sp != "consecrate":
				f["hp"] = minf(s["life"], float(f["hp"]) + s["life"] * float(data["heal"]))
			if sp == "consecrate" and s["evo"] != "paladin":
				f["hp"] = minf(s["life"], float(f["hp"]) + s["life"] * 0.08)
	if not f["monster"].is_empty() and float(f["monster"]["hp"]) <= 0:
		kill_monster()

func monster_attack() -> void:
	if f["monster"].is_empty():
		return
	var m: Dictionary = f["monster"]
	f["m_next"] = float(g["t"]) + float(m["interval"]) * (1.0 + 0.08 * int(m["chill"]) if float(m["chill_until"]) > float(g["t"]) else 1.0)
	if r(0, 100) < s["dodge"]:
		return
	var ward: bool = float(f["buffs"].get("frostward", 0)) > float(g["t"])
	var damage: float = float(m["dmg"]) * r(0.85, 1.15)
	if m["type"] == "phys":
		damage = maxf(damage * 0.25, damage - s["armor"] * (1.5 if ward else 1.0))
	else:
		damage *= 1.0 - minf(85.0, float(s["res"].get(m["type"], 0)) + (25.0 if ward else 0.0)) / 100.0
	var shielded := minf(float(f["shield"]), damage)
	f["shield"] -= shielded
	damage -= shielded
	f["hp"] -= damage
	if s["reflect"] > 0:
		var reflected: float = float(s["reflect"])
		if int(s["sets"].get("warden", 0)) >= 4:
			reflected *= 1.0 - float(m["res"].get("frost", 0)) / 100.0
			m["chill"] = mini(5, int(m["chill"]) + 2)
			m["chill_until"] = float(g["t"]) + 3.0
		else:
			reflected = maxf(reflected * 0.25, reflected - float(m["armor"]))
		m["hp"] -= reflected
	if float(f["hp"]) <= 0:
		die()
	elif float(m["hp"]) <= 0:
		kill_monster()

func pulse() -> void:
	f["pulse_next"] = float(g["t"]) + 1.0
	if f["monster"].is_empty():
		return
	var m: Dictionary = f["monster"]
	f["hp"] = minf(s["life"], float(f["hp"]) + s["regen"])
	if float(m["burn_until"]) >= float(g["t"]):
		var burn: float = float(m["burn"]) * (1.0 - float(m["res"].get("fire", 0)) / 100.0)
		m["hp"] -= burn
		if int(s["sets"].get("vigil", 0)) >= 4:
			f["hp"] = minf(s["life"], float(f["hp"]) + burn * 0.1)
	if float(m["bleed_until"]) >= float(g["t"]):
		m["hp"] -= float(m["bleed"])
	if float(f["buffs"].get("hawk", 0)) > float(g["t"]):
		var count := 2 if s["evo"] == "hunter" else 1
		var mult := 0.45 if s["evo"] == "hunter" else 0.4
		for i in range(count):
			_hit(mult * s["spell_mult"] * s["companion_mult"] * (s["evo_pot"] if s["evo"] == "hunter" else 1.0))
			if s["evo"] == "hunter" and r() < 0.08:
				f["hp"] -= s["life"] * 0.03
	if float(m["hp"]) > 0 and float(m["regen"]) > 0:
		m["hp"] = minf(float(m["max"]), float(m["hp"]) + float(m["max"]) * float(m["regen"]))
	if float(f["hp"]) <= 0:
		die()
	elif float(m["hp"]) <= 0:
		kill_monster()

func die() -> void:
	f["hp"] = 0.0
	f["monster"] = {}
	f["dead_until"] = float(g["t"]) + 12.0
	f["shield"] = 0.0
	if g.get("boss_mode", false):
		g["boss_died"] = true
		return
	g["life_deaths"] += 1
	g["streak"] = 0
	g["deaths_here"] += 1
	note("Fallen. Recovering for 12 seconds.")
	var min_level: int = D.ZONES[D.MONSTERS[g["target"]["key"]]["zone"]]["min_level"]
	if g["auto_push"] and int(g["deaths_here"]) > int(g["push_retries"]) and int(g["target"]["level"]) > min_level:
		g["target"]["level"] -= 1
		g["deaths_here"] = 0
		note("Auto-push: retreated one stage.")

func kill_monster() -> void:
	if f["monster"].is_empty():
		return
	var m: Dictionary = f["monster"]
	var key: String = m["key"]
	f["monster"] = {}
	f["respawn_at"] = float(g["t"]) + 0.6
	if g.get("boss_mode", false):
		g["boss_won"] = true
		return
	var info: Dictionary = D.MONSTERS[key]
	var zone: Dictionary = D.ZONES[info["zone"]]
	var stage: int = int(m["level"])
	g["life_kills"] += 1
	var gap: int = int(g["level"]) - stage - 12
	var xp: int = roundi(8.0 * pow(1.12, stage - 1) * float(info["xp"]) * float(zone["reward"]) * (maxf(0.05, 1.0 - gap * 0.12) if gap > 0 else 1.0))
	var gold: int = roundi(3.0 * pow(1.12, stage - 1) * float(info["gold"]) * float(zone["reward"]) * r(0.8, 1.2) * (1.0 + s["gold_find"] / 100.0))
	g["gold"] += gold
	var kill_key := "%s:%s" % [key, stage]
	g["kill_counts"][kill_key] = int(g["kill_counts"].get(kill_key, 0)) + 1
	if r() < (0.45 if info["zone"] == "hollow" else 0.3):
		g["mats"]["shards"] = int(g["mats"].get("shards", 0)) + (2 if info["zone"] == "hollow" and r() < 0.4 else 1)
	if info.has("ess") and r() < float(info.get("ess_chance", 0.05)):
		var ess: String = choose(info["ess"])
		g["mats"][ess] = int(g["mats"].get(ess, 0)) + 1
	if g["asc"]["unlocked"] and info.has("mat") and r() < (0.12 if key == "colossus" else 0.06):
		g["mats"][info["mat"]] = int(g["mats"].get(info["mat"], 0)) + 1
	g["sigil_prog"] += 1
	if int(g["sigil_prog"]) >= 150:
		g["sigil_prog"] = 0
		g["sigils"] = mini(5, int(g["sigils"]) + 1)
		note("A Boss Sigil formed.")
	if stage == int(g["unlocked"][key]) and int(g["kill_counts"][kill_key]) >= 30:
		g["unlocked"][key] += 1
		note("%s stage %s unlocked." % [info["name"], g["unlocked"][key]])
		if info["zone"] == "fallfields" and int(g["unlocked"][key]) >= 20 and not g["zones"]["hollow"]:
			g["zones"]["hollow"] = true
			note("The Ashen Hollow opened.")
	g["streak"] += 1
	if g["auto_push"] and int(g["streak"]) >= 25 and int(g["target"]["level"]) < int(g["unlocked"][key]):
		g["target"]["level"] += 1
		g["streak"] = 0
		g["deaths_here"] = 0
	gain_xp(xp)
	if r() < 0.2:
		receive_item(make_item(choose(D.DROP_SLOTS), stage + int(zone["ilvl"])))
	if g["asc"]["unlocked"] and info["zone"] == "hollow" and r() < 0.004:
		receive_item(make_item(choose(D.ARMOR_SLOTS), int(g["asc"]["base"]), "ascended"))
	if info["zone"] == "hollow" and r() < 0.00005:
		g["jewels"].append({"id": "j%s" % str(rng.randi()), "cls": g["cls"], "pot": snappedf(r(1.0, 1.3), 0.01)})
		note("A Scarbound Jewel appeared!")

func gain_xp(amount: int) -> void:
	g["xp"] += amount
	while int(g["xp"]) >= xp_needed(int(g["level"])):
		g["xp"] -= xp_needed(int(g["level"]))
		g["level"] += 1
		g["points"] += 1
		var before: float = s["life"]
		_refresh()
		f["hp"] += s["life"] - before
		note("Level %s reached. Passive point earned." % g["level"])

func receive_item(item: Dictionary) -> void:
	var keep: bool = rank(item["rarity"]) >= rank(g["filter"]) or rank(item["rarity"]) >= 3 or item.has("spell") or item.get("socket", false)
	if not keep or g["bag"].size() >= BAG_CAP:
		g["gold"] += salvage_value(item)
		return
	g["bag"].append(item)
	if rank(item["rarity"]) >= 3:
		note("%s dropped [%s]." % [item["name"], item["rarity"]])

func salvage_value(item: Dictionary) -> int:
	return roundi(4.0 * pow(1.12, int(item["ilvl"])) * (1.0 + rank(item["rarity"]) * 1.5) * (1.0 + int(item.get("plus", 0)) * 0.5))

func item_summary(item: Dictionary) -> String:
	var text: String = "%s [%s] Lv%s" % [item["name"], item["rarity"].capitalize(), item["ilvl"]]
	if int(item.get("plus", 0)) > 0:
		text += " +%s" % item["plus"]
	if item.has("spell"):
		text += " | %s" % D.SPELLS[item["spell"]]["name"]
	if item.has("set"):
		text += " | Set"
	return text

func action(op: String, params: Dictionary = {}) -> String:
	if g.is_empty():
		return "Create a character first."
	var error := ""
	match op:
		"equip":
			var index: int = int(params.get("index", -1))
			if index < 0 or index >= g["bag"].size():
				return "Item not found."
			var item: Dictionary = g["bag"][index]
			var slot: String = item["slot"]
			if slot == "ring":
				slot = "ring1" if not g["equip"].has("ring1") else ("ring2" if not g["equip"].has("ring2") else "ring1")
			if slot == "offhand":
				var main: Dictionary = g["equip"].get("weapon", {})
				if main.is_empty() or (D.WEAPONS[main["base"]]["hands"] == 2 and (s["evo"] != "warrior" or item["base"] != "quiver")):
					return "Two-handed weapons cannot use this off-hand."
				if main["base"] == "bow" and item["base"] != "quiver":
					return "Bows require quivers."
				if main["base"] != "bow" and item["base"] == "quiver":
					return "Quivers require bows."
			if slot == "weapon" and g["equip"].has("offhand"):
				var new_w: Dictionary = D.WEAPONS[item["base"]]
				var old_oh: Dictionary = g["equip"]["offhand"]
				if (new_w["hands"] == 2 and s["evo"] != "warrior") or (item["base"] == "bow" and old_oh.get("base", "") != "quiver"):
					g["bag"].append(old_oh)
					g["equip"].erase("offhand")
			g["bag"].remove_at(index)
			if g["equip"].has(slot):
				g["bag"].append(g["equip"][slot])
			g["equip"][slot] = item
		"salvage":
			var index: int = int(params.get("index", -1))
			if index < 0 or index >= g["bag"].size():
				return "Item not found."
			var item: Dictionary = g["bag"][index]
			if item.get("locked", false):
				return "Item is locked."
			g["gold"] += salvage_value(item)
			g["mats"]["shards"] = int(g["mats"].get("shards", 0)) + int(item.get("shards_in", 0)) / 2 + maxi(0, rank(item["rarity"]) - 1)
			g["bag"].remove_at(index)
		"salvage_all":
			for idx in range(g["bag"].size() - 1, -1, -1):
				var item: Dictionary = g["bag"][idx]
				if not item.get("locked", false) and rank(item["rarity"]) < 4:
					g["gold"] += salvage_value(item)
					g["bag"].remove_at(idx)
		"lock":
			var index: int = int(params.get("index", -1))
			if index < 0 or index >= g["bag"].size():
				return "Item not found."
			g["bag"][index]["locked"] = not bool(g["bag"][index].get("locked", false))
		"upgrade":
			var slot: String = str(params.get("slot", ""))
			if not g["equip"].has(slot):
				return "Nothing equipped there."
			var item: Dictionary = g["equip"][slot]
			if item["rarity"] == "ascended":
				return "Ascended gear uses slot levels."
			var plus: int = int(item.get("plus", 0))
			if plus >= 10:
				return "Fully upgraded."
			var cost := ceili(3.0 * pow(1.45, plus) * (1.0 + rank(item["rarity"]) * 0.3))
			if int(g["mats"].get("shards", 0)) < cost:
				return "Need %s Scar Shards." % cost
			g["mats"]["shards"] -= cost
			item["shards_in"] = int(item.get("shards_in", 0)) + cost
			item["plus"] += 1
		"passive":
			var key: String = str(params.get("key", ""))
			if not D.PASSIVES.has(key):
				return "Unknown passive."
			if int(g["points"]) <= 0:
				return "No passive points."
			g["points"] -= 1
			g["passives"][key] = int(g["passives"].get(key, 0)) + 1
		"reset_passives":
			for key in g["passives"]:
				g["points"] += int(g["passives"][key])
			g["passives"] = {}
		"spec":
			var index: int = int(params.get("index", -1))
			if int(g["level"]) < 10:
				return "Specializations unlock at level 10."
			if index < 0 or index >= 3:
				return "Unknown specialization."
			if index == int(g["spec"]):
				return ""
			var cost := 0 if int(g["spec"]) == -1 else roundi(40.0 * pow(1.12, int(g["level"])))
			if int(g["gold"]) < cost:
				return "Need %s gold." % cost
			g["gold"] -= cost
			g["spec"] = index
		"target":
			var key: String = str(params.get("key", ""))
			if not D.MONSTERS.has(key) or not g["zones"][D.MONSTERS[key]["zone"]]:
				return "Monster not unlocked."
			g["target"] = {"key": key, "level": clampi(int(params.get("level", 1)), int(D.ZONES[D.MONSTERS[key]["zone"]]["min_level"]), int(g["unlocked"][key]))}
			g["streak"] = 0
			g["deaths_here"] = 0
			f["monster"] = {}
			f["respawn_at"] = float(g["t"]) + 0.1
		"auto_push":
			g["auto_push"] = bool(params.get("enabled", true))
			g["streak"] = 0
		"stage":
			var key: String = g["target"]["key"]
			g["target"]["level"] = clampi(int(g["target"]["level"]) + int(params.get("delta", 0)), int(D.ZONES[D.MONSTERS[key]["zone"]]["min_level"]), int(g["unlocked"][key]))
			f["monster"] = {}
			f["respawn_at"] = float(g["t"]) + 0.1
		"filter":
			var rarity: String = str(params.get("rarity", "uncommon"))
			if not D.RARITIES.has(rarity):
				return "Invalid rarity."
			g["filter"] = rarity
		"craft":
			var slot: String = str(params.get("slot", "weapon"))
			var rarity: String = str(params.get("rarity", "common"))
			if not D.DROP_SLOTS.has(slot) or not ["common", "uncommon", "rare", "epic", "legendary"].has(rarity):
				return "Invalid recipe."
			if g["bag"].size() >= BAG_CAP:
				return "Bag is full."
			var ilvl: int = int(params.get("level", g["level"]))
			var highest := 1
			for key in g["unlocked"]:
				highest = maxi(highest, int(g["unlocked"][key]))
			if ilvl < 1 or ilvl > highest + 4:
				return "Item level outside unlocked progress."
			var recipe: Array = {"common": [1, 0, 0], "uncommon": [2, 2, 0], "rare": [5, 6, 0], "epic": [15, 20, 2], "legendary": [60, 60, 4]}[rarity]
			var gold := roundi(30.0 * pow(1.12, ilvl) * int(recipe[0]))
			if int(g["gold"]) < gold or int(g["mats"].get("shards", 0)) < int(recipe[1]):
				return "Not enough gold or Scar Shards."
			for ty in D.TYPES:
				if int(g["mats"].get(ty, 0)) < int(recipe[2]):
					return "Not enough elemental essence."
			g["gold"] -= gold
			g["mats"]["shards"] -= int(recipe[1])
			for ty in D.TYPES:
				g["mats"][ty] = int(g["mats"].get(ty, 0)) - int(recipe[2])
			g["bag"].append(make_item(slot, ilvl, rarity))
			note("Crafted a %s %s." % [rarity, slot])
		"ascend":
			var slot: String = str(params.get("slot", ""))
			if not g["asc"]["unlocked"] or not D.ARMOR_SLOTS.has(slot):
				return "Ascension sealed."
			var level: int = int(g["asc"]["slots"][slot])
			var cost := ceili(2.0 * pow(1.22, level))
			var mat: String = D.ASC_MATS[slot]
			if int(g["mats"].get(mat, 0)) < cost:
				return "Need %s %s." % [cost, mat]
			g["mats"][mat] -= cost
			g["asc"]["slots"][slot] += 1
		"socket_jewel":
			var belt: Dictionary = g["equip"].get("belt", {})
			var index: int = int(params.get("index", -1))
			if not belt.get("socket", false) or belt.has("jewel") or index < 0 or index >= g["jewels"].size():
				return "Need an empty socketed belt and a Jewel."
			if g["jewels"][index]["cls"] != g["cls"]:
				return "Wrong class Jewel."
			belt["jewel"] = g["jewels"][index]
			g["jewels"].remove_at(index)
		"boss":
			return boss_fight(str(params.get("key", "bellkeeper")))
		"bar":
			var slot: int = int(params.get("slot", -1))
			var sp: String = str(params.get("spell", ""))
			if slot < 0 or slot > 4 or not s["available_spells"].has(sp):
				return "Spell not available."
			if (slot >= 3) != (D.SPELLS[sp].get("kind", "off") == "util"):
				return "Wrong spell slot."
			g["spell_bar"][slot] = sp
		_:
			return "Unknown action."
	_refresh()
	dirty = true
	return error

func boss_fight(key: String) -> String:
	if not D.BOSSES.has(key) or not g["zones"].get(D.BOSSES[key]["zone"], false):
		return "Boss not unlocked."
	if int(g["sigils"]) < 1:
		return "Need a Boss Sigil."
	g["sigils"] -= 1
	var lvl := int(g["boss_unlocked"][key])
	var preview = get_script().new()
	preview.g = g.duplicate(true)
	preview.f = preview.g["fight"]
	preview.rng.seed = rng.randi()
	preview.g["t"] = 0.0
	preview.g["boss_mode"] = true
	preview.g["boss_won"] = false
	preview.g["boss_died"] = false
	preview.g["target"] = {"key": key, "level": lvl}
	preview.f = preview.empty_fight(0.0)
	preview.g["fight"] = preview.f
	preview._refresh()
	preview.advance(150.0)
	if not preview.g.get("boss_won", false):
		g["last_boss"] = "Defeat: %s at level %s." % [D.BOSSES[key]["name"], lvl]
		note(g["last_boss"])
		return ""
	g["last_boss"] = "Victory: %s at level %s!" % [D.BOSSES[key]["name"], lvl]
	g["life_bosses"] += 1
	var boss: Dictionary = D.BOSSES[key]
	var zone: Dictionary = D.ZONES[boss["zone"]]
	g["gold"] += roundi(3.0 * pow(1.12, lvl - 1) * float(boss["gold"]))
	g["mats"]["shards"] = int(g["mats"].get("shards", 0)) + rng.randi_range(4, 7)
	gain_xp(roundi(8.0 * pow(1.12, lvl - 1) * float(boss["xp"])))
	for idx in range(2 if r() < 0.35 else 1):
		var value := r()
		var rarity := "legendary" if value < 0.04 else ("epic" if value < 0.35 else "rare")
		receive_item(make_item(choose(D.DROP_SLOTS), lvl + int(zone["ilvl"]) + 2, rarity))
	if key == "woundwarden":
		if not g["asc"]["unlocked"]:
			g["asc"]["unlocked"] = true
			g["asc"]["base"] = lvl + 6
			note("Ascension unlocked.")
		if r() < 0.25:
			receive_item(make_item(choose(D.ARMOR_SLOTS), int(g["asc"]["base"]), "ascended"))
	if lvl == int(g["boss_unlocked"][key]):
		g["boss_unlocked"][key] += 2
	note(g["last_boss"])
	return ""
