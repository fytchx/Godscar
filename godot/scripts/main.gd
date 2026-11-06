extends Control
## Phone-first native Godot interface. All character actions go through sim.action().
const D = preload("res://scripts/catalog.gd")
const Sim = preload("res://scripts/sim.gd")
const Arena = preload("res://scripts/arena_view.gd")
const INK = Color("#111016")
const PANEL = Color("#211c25")
const PANEL_LIGHT = Color("#2b2430")
const PAPER = Color("#dfd6c6")
const MUTED = Color("#9e969b")
const CRIMSON = Color("#bc2238")
const GOLD = Color("#b89665")

var sim = Sim.new()
var shell: VBoxContainer
var content: VBoxContainer
var scroll: ScrollContainer
var arena: Control
var title_label: Label
var hero_label: Label
var target_label: Label
var info_label: Label
var hp_bar: ProgressBar
var foe_bar: ProgressBar
var tab_strip: HBoxContainer
var nav_buttons: Array[Button] = []
var active_tab = "BATTLE"
var redraw_clock = 0.0
var autosave_clock = 0.0

func _ready() -> void:
	_build_shell()
	if sim.load_save():
		_show_tab("BATTLE")
	else:
		_choose_class()
	_update_live()

func _notification(what: int) -> void:
	if what == NOTIFICATION_APPLICATION_PAUSED or what == NOTIFICATION_WM_CLOSE_REQUEST:
		sim.save_game()

func _process(delta: float) -> void:
	if sim.g.is_empty():
		return
	sim.advance(minf(delta, 0.5))
	redraw_clock += delta
	autosave_clock += delta
	if redraw_clock >= 0.33:
		_update_live()
		redraw_clock = 0.0
	if autosave_clock >= 12.0:
		sim.save_game()
		autosave_clock = 0.0

func _panel_style(fill: Color = PANEL) -> StyleBoxFlat:
	var style = StyleBoxFlat.new()
	style.bg_color = fill
	style.set_corner_radius_all(5)
	style.set_content_margin_all(10)
	style.border_color = Color("#49343d")
	style.set_border_width_all(1)
	return style

func _build_shell() -> void:
	var background = ColorRect.new()
	background.color = INK
	background.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	add_child(background)
	var margin = MarginContainer.new()
	margin.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	margin.add_theme_constant_override("margin_left", 12)
	margin.add_theme_constant_override("margin_top", 12)
	margin.add_theme_constant_override("margin_right", 12)
	margin.add_theme_constant_override("margin_bottom", 12)
	add_child(margin)
	shell = VBoxContainer.new()
	shell.add_theme_constant_override("separation", 7)
	margin.add_child(shell)
	title_label = _text(shell, "GODSCAR", 30, GOLD)
	title_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	hero_label = _text(shell, "AN IDLE ACTION RPG", 13, MUTED)
	hero_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var battle_panel = PanelContainer.new()
	battle_panel.add_theme_stylebox_override("panel", _panel_style(Color("#171620")))
	shell.add_child(battle_panel)
	var battle_box = VBoxContainer.new()
	battle_box.add_theme_constant_override("separation", 5)
	battle_panel.add_child(battle_box)
	arena = Arena.new()
	arena.custom_minimum_size = Vector2(0, 202)
	arena.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	arena.sim = sim
	battle_box.add_child(arena)
	target_label = _text(battle_box, "THE FALLFIELDS", 15, PAPER)
	target_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var bars = HBoxContainer.new()
	bars.add_theme_constant_override("separation", 8)
	battle_box.add_child(bars)
	var hp_column = _vertical(bars)
	hp_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_text(hp_column, "YOUR LIFE", 10, MUTED)
	hp_bar = _bar(hp_column, CRIMSON)
	var foe_column = _vertical(bars)
	foe_column.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	_text(foe_column, "ENEMY LIFE", 10, MUTED)
	foe_bar = _bar(foe_column, GOLD)
	info_label = _text(shell, "Combat never stops.", 12, MUTED)
	info_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
	var nav_scroll = ScrollContainer.new()
	nav_scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_AUTO
	nav_scroll.vertical_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	nav_scroll.custom_minimum_size = Vector2(0, 48)
	shell.add_child(nav_scroll)
	tab_strip = HBoxContainer.new()
	tab_strip.add_theme_constant_override("separation", 6)
	nav_scroll.add_child(tab_strip)
	for tab in ["BATTLE", "HERO", "EQUIPMENT", "FORGE", "HUNT", "BOSSES"]:
		var b = _button(tab_strip, tab, _show_tab.bind(tab), true)
		b.custom_minimum_size.x = 88
		nav_buttons.append(b)
	scroll = ScrollContainer.new()
	scroll.size_flags_vertical = Control.SIZE_EXPAND_FILL
	scroll.horizontal_scroll_mode = ScrollContainer.SCROLL_MODE_DISABLED
	shell.add_child(scroll)
	content = VBoxContainer.new()
	content.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_theme_constant_override("separation", 8)
	scroll.add_child(content)

func _text(parent: Node, value: String, font_size: int = 15, color: Color = PAPER) -> Label:
	var label = Label.new()
	label.text = value
	label.add_theme_color_override("font_color", color)
	label.add_theme_font_size_override("font_size", font_size)
	label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	parent.add_child(label)
	return label

func _vertical(parent: Node) -> VBoxContainer:
	var box = VBoxContainer.new()
	box.add_theme_constant_override("separation", 5)
	parent.add_child(box)
	return box

func _horizontal(parent: Node) -> HBoxContainer:
	var box = HBoxContainer.new()
	box.add_theme_constant_override("separation", 7)
	parent.add_child(box)
	return box

func _button(parent: Node, label: String, callback: Callable, small: bool = false) -> Button:
	var b = Button.new()
	b.text = label
	b.custom_minimum_size.y = 35 if small else 43
	b.add_theme_font_size_override("font_size", 12 if small else 14)
	b.add_theme_color_override("font_color", PAPER)
	b.add_theme_color_override("font_hover_color", Color.WHITE)
	b.add_theme_stylebox_override("normal", _panel_style(PANEL_LIGHT))
	b.add_theme_stylebox_override("hover", _panel_style(Color("#49303b")))
	b.add_theme_stylebox_override("pressed", _panel_style(Color("#6c2635")))
	b.pressed.connect(callback)
	parent.add_child(b)
	return b

func _bar(parent: Node, color: Color) -> ProgressBar:
	var bar = ProgressBar.new()
	bar.custom_minimum_size = Vector2(0, 12)
	bar.show_percentage = false
	bar.max_value = 100
	bar.min_value = 0
	bar.value = 100
	var fill = StyleBoxFlat.new()
	fill.bg_color = color
	fill.set_corner_radius_all(3)
	bar.add_theme_stylebox_override("fill", fill)
	var back = StyleBoxFlat.new()
	back.bg_color = Color("#3b2933")
	back.set_corner_radius_all(3)
	bar.add_theme_stylebox_override("background", back)
	parent.add_child(bar)
	return bar

func _section(name: String, detail: String = "") -> VBoxContainer:
	var panel = PanelContainer.new()
	panel.add_theme_stylebox_override("panel", _panel_style())
	panel.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	content.add_child(panel)
	var inside = _vertical(panel)
	_text(inside, name, 18, GOLD)
	if not detail.is_empty():
		_text(inside, detail, 12, MUTED)
	return inside

func _clear() -> void:
	for child in content.get_children():
		content.remove_child(child)
		child.queue_free()

func _choose_class() -> void:
	_clear()
	_text(content, "CHOOSE YOUR CLASS", 24, GOLD)
	_text(content, "Your champion fights automatically, even while you inspect equipment, build passives, or choose the next enemy.", 14, MUTED)
	for key in D.CLASSES:
		var data: Dictionary = D.CLASSES[key]
		var entry = _section(data["name"], "%s  |  %s" % [data["primary"], D.SPELLS[data["spell"]]["name"]])
		_button(entry, "BEGIN AS " + str(data["name"]).to_upper(), _start.bind(key))

func _start(cls: String) -> void:
	sim.new_game(cls)
	sim.save_game()
	_show_tab("BATTLE")

func _show_tab(tab: String) -> void:
	active_tab = tab
	if sim.g.is_empty():
		_choose_class()
		return
	_clear()
	scroll.scroll_vertical = 0
	for b in nav_buttons:
		b.add_theme_stylebox_override("normal", _panel_style(Color("#502433") if b.text == active_tab else PANEL_LIGHT))
	match active_tab:
		"BATTLE": _battle()
		"HERO": _hero()
		"EQUIPMENT": _equipment()
		"FORGE": _forge()
		"HUNT": _hunt()
		"BOSSES": _bosses()

func _act(op: String, params: Dictionary = {}) -> void:
	var error: String = sim.action(op, params)
	if not error.is_empty():
		sim.note(error)
	else:
		sim.save_game()
	_show_tab(active_tab)
	_update_live()

func _update_live() -> void:
	if sim.g.is_empty():
		hero_label.text = "CHOOSE A CLASS TO BEGIN"
		target_label.text = "THE GODWOUND"
		info_label.text = "Your build decides how far you survive."
		hp_bar.value = 0
		foe_bar.value = 0
		return
	var g: Dictionary = sim.g
	var f: Dictionary = sim.f
	var s: Dictionary = sim.s
	hero_label.text = "%s · LV %s · %s GOLD · %s SHARDS" % [str(D.CLASSES[g["cls"]]["name"]).to_upper(), g["level"], sim.fmt(g["gold"]), g["mats"].get("shards", 0)]
	var mon: Dictionary = f.get("monster", {})
	if mon.is_empty():
		target_label.text = "%s  ·  STAGE %s" % [D.MONSTERS[g["target"]["key"]]["name"], g["target"]["level"]]
		foe_bar.value = 0
	else:
		var source: Dictionary = D.MONSTERS.get(mon["key"], D.BOSSES.get(mon["key"], {}))
		target_label.text = "%s  ·  STAGE %s" % [source.get("name", "Enemy"), mon["level"]]
		foe_bar.value = clampf(100.0 * float(mon["hp"]) / maxf(1.0, float(mon["max"])), 0.0, 100.0)
	hp_bar.value = clampf(100.0 * float(f["hp"]) / maxf(1.0, float(s["life"])), 0.0, 100.0)
	info_label.text = "Life %s/%s   •   Hit %s   •   %ss swing   •   %s total kills" % [sim.fmt(f["hp"]), sim.fmt(s["life"]), sim.fmt(s["hit"]), str(snappedf(float(s["interval"]), 0.01)), sim.fmt(g["life_kills"])]
	if active_tab == "BATTLE" and redraw_clock >= 0.3:
		_refresh_log()

func _battle() -> void:
	var box = _section("THE ENDLESS HUNT", "Your character never waits for another button press. Every kill feeds the next encounter.")
	var row = _horizontal(box)
	_button(row, "AUTO-PUSH: " + ("ON" if sim.g["auto_push"] else "OFF"), _act.bind("auto_push", {"enabled": not sim.g["auto_push"]}))
	_button(row, "STAGE −", _act.bind("stage", {"delta": -1}))
	_button(row, "STAGE +", _act.bind("stage", {"delta": 1}))
	var info = _section("COMBAT ENGINE", "Real-time event simulation with automatic spells, damage types, buffs, respawns and recovery.")
	_text(info, "Primary attack: %s" % D.CLASSES[sim.g["cls"]]["primary"], 14, PAPER)
	_text(info, "Automatic offensive spells: 3 slots. Conditional utility spells: 2 slots.", 12, MUTED)
	var log_box = _section("BATTLE JOURNAL")
	log_box.name = "JournalContent"
	_refresh_log()

func _refresh_log() -> void:
	var journal = content.find_child("JournalContent", true, false)
	if journal == null:
		return
	for child in journal.get_children():
		if child is Label and child != journal.get_child(0):
			journal.remove_child(child)
			child.queue_free()
	for message in sim.events.slice(0, 8):
		_text(journal, str(message), 12, MUTED)

func _hero() -> void:
	var g: Dictionary = sim.g
	var stats: Dictionary = sim.s
	var info = _section("YOUR CHAMPION", "%s · Level %s" % [D.CLASSES[g["cls"]]["name"], g["level"]])
	var xp_bar = _bar(info, GOLD)
	xp_bar.value = clampf(100.0 * float(g["xp"]) / maxf(1.0, sim.xp_needed(g["level"])), 0, 100)
	_text(info, "XP %s / %s  ·  Unspent passive points: %s" % [g["xp"], sim.xp_needed(g["level"]), g["points"]], 12, MUTED)
	_text(info, "STR %s    DEX %s    INT %s" % [roundi(stats["attrs"]["STR"]), roundi(stats["attrs"]["DEX"]), roundi(stats["attrs"]["INT"])], 15)
	_text(info, "Armor %s   Regen %s/s   Crit %s%%   Dodge %s%%" % [sim.fmt(stats["armor"]), str(snappedf(stats["regen"], 0.1)), str(snappedf(stats["crit"], 0.1)), str(snappedf(stats["dodge"], 0.1))], 13)
	var passives = _section("PASSIVES", "Spend points in any of six growing paths.")
	for key in D.PASSIVES:
		var row = _horizontal(passives)
		_text(row, "%s  (%s)" % [D.PASSIVES[key], g["passives"].get(key, 0)], 12)
		var b = _button(row, "+", _act.bind("passive", {"key": key}), true)
		b.disabled = int(g["points"]) <= 0
	_button(passives, "RESET PASSIVES", _act.bind("reset_passives"), true)
	var specs = _section("SPECIALIZATION", "Unlocks at level 10. Changing specialization after the first choice costs gold.")
	for idx in range(3):
		var spec: Dictionary = D.CLASSES[g["cls"]]["specs"][idx]
		var b = _button(specs, ("%s  %s" % ["✓" if g["spec"] == idx else "→", spec["name"]]), _act.bind("spec", {"index": idx}))
		b.disabled = int(g["level"]) < 10
	var spells = _section("AUTOMATIC SPELL BAR", "Available spells are automatically slotted when found. Slots 1–3 are offensive; 4–5 are utility.")
	for idx in range(5):
		var slot_label = "UTILITY" if idx >= 3 else "ATTACK"
		var equipped: Variant = g["spell_bar"][idx]
		_text(spells, "SLOT %s · %s · %s" % [idx + 1, slot_label, D.SPELLS[equipped]["name"] if equipped != null else "Empty"], 13)
		var available: Array = []
		for sp in stats["available_spells"]:
			if (idx >= 3) == (D.SPELLS[sp].get("kind", "off") == "util"):
				available.append(sp)
		for sp in available:
			_button(spells, "USE " + D.SPELLS[sp]["name"], _act.bind("bar", {"slot": idx, "spell": sp}), true)

func _equipment() -> void:
	var g: Dictionary = sim.g
	var gear_box = _section("EQUIPPED", "Eleven slots. Press an item to upgrade it using Scar Shards.")
	for slot in D.SLOTS:
		var it: Dictionary = g["equip"].get(slot, {})
		var row = _horizontal(gear_box)
		if it.is_empty():
			_text(row, slot.capitalize() + ": [empty]", 12, MUTED)
		else:
			_text(row, slot.capitalize() + ": " + sim.item_summary(it), 12)
			var b = _button(row, "UPGRADE", _act.bind("upgrade", {"slot": slot}), true)
			b.disabled = it["rarity"] == "ascended" or int(it.get("plus", 0)) >= 10
	var bag = _section("ITEM BAG  (%s/%s)" % [g["bag"].size(), Sim.BAG_CAP], "Drops are picked up automatically. Choose what to equip or salvage.")
	for idx in range(g["bag"].size()):
		var it: Dictionary = g["bag"][idx]
		_text(bag, sim.item_summary(it), 13, GOLD if sim.rank(it["rarity"]) >= 4 else PAPER)
		var row = _horizontal(bag)
		_button(row, "EQUIP", _act.bind("equip", {"index": idx}), true)
		_button(row, "SALVAGE", _act.bind("salvage", {"index": idx}), true)
		_button(row, "LOCK" if not it.get("locked", false) else "UNLOCK", _act.bind("lock", {"index": idx}), true)
	var bottom = _section("BAG MANAGEMENT")
	_button(bottom, "SALVAGE ALL UNLOCKED BELOW LEGENDARY", _act.bind("salvage_all"), true)
	_text(bottom, "Auto-salvage minimum: " + str(g["filter"]).capitalize(), 12, MUTED)
	var filters = _horizontal(bottom)
	for rarity in ["common", "uncommon", "rare", "epic", "legendary"]:
		_button(filters, rarity.left(3).to_upper(), _act.bind("filter", {"rarity": rarity}), true)

func _forge() -> void:
	var g: Dictionary = sim.g
	var box = _section("THE FORGE", "Craft items using gold, shards, and eventually all six essences.")
	_text(box, "Gold %s  ·  Scar Shards %s" % [g["gold"], g["mats"].get("shards", 0)], 15, GOLD)
	for rarity in ["common", "uncommon", "rare", "epic", "legendary"]:
		var row = _horizontal(box)
		_text(row, rarity.capitalize(), 13)
		_button(row, "WEAPON", _act.bind("craft", {"slot": "weapon", "rarity": rarity, "level": g["level"]}), true)
		_button(row, "ARMOR", _act.bind("craft", {"slot": "chest", "rarity": rarity, "level": g["level"]}), true)
	var mats = _section("MATERIALS")
	for key in g["mats"]:
		if int(g["mats"][key]) > 0 or key == "shards":
			_text(mats, "%s: %s" % [str(key).capitalize(), g["mats"][key]], 13)
	var asc = _section("ASCENSION", "Defeat the Woundwarden to unlock slot levels for Ascended equipment.")
	if not g["asc"]["unlocked"]:
		_text(asc, "SEALED", 16, CRIMSON)
	else:
		for slot in D.ARMOR_SLOTS:
			var row = _horizontal(asc)
			_text(row, "%s Lv%s" % [slot.capitalize(), g["asc"]["slots"][slot]], 13)
			_button(row, "ASCEND (%s)" % D.ASC_MATS[slot], _act.bind("ascend", {"slot": slot}), true)
	var jewels = _section("SCARBOUND JEWELS", "Class evolution requires a rare Jewel and a socketed belt.")
	for idx in range(g["jewels"].size()):
		var jewel: Dictionary = g["jewels"][idx]
		_text(jewels, "%s Jewel · potency %s" % [jewel["cls"].capitalize(), jewel["pot"]], 13)
		_button(jewels, "SOCKET INTO BELT", _act.bind("socket_jewel", {"index": idx}), true)

func _hunt() -> void:
	var g: Dictionary = sim.g
	var box = _section("CHOOSE YOUR HUNT", "Selecting an enemy changes who you fight. Combat resumes instantly.")
	var row = _horizontal(box)
	_button(row, "STAGE −", _act.bind("stage", {"delta": -1}), true)
	_button(row, "STAGE +", _act.bind("stage", {"delta": 1}), true)
	_button(row, "AUTO-PUSH " + ("ON" if g["auto_push"] else "OFF"), _act.bind("auto_push", {"enabled": not g["auto_push"]}), true)
	for zone in D.ZONES:
		var data: Dictionary = D.ZONES[zone]
		var area = _section(data["name"], data["text"])
		if not g["zones"][zone]:
			_text(area, "LOCKED · Reach stage 20 in the Fallfields.", 13, CRIMSON)
			continue
		for key in D.MONSTERS:
			var mon: Dictionary = D.MONSTERS[key]
			if mon["zone"] != zone:
				continue
			var selected: bool = g["target"]["key"] == key
			_button(area, ("%s%s · Stage %s" % ["✓ " if selected else "", mon["name"], g["unlocked"][key]]), _act.bind("target", {"key": key, "level": g["unlocked"][key]}))

func _bosses() -> void:
	var g: Dictionary = sim.g
	var box = _section("BOSS SIGILS", "One Sigil every 150 kills. Five can be held. A challenge runs for at most 150 simulated seconds.")
	_text(box, "%s / 5 SIGILS  ·  %s / 150 PROGRESS" % [g["sigils"], g["sigil_prog"]], 17, GOLD)
	if not str(g["last_boss"]).is_empty():
		_text(box, g["last_boss"], 14, PAPER)
	for key in D.BOSSES:
		var boss: Dictionary = D.BOSSES[key]
		var panel = _section(boss["name"], "Level %s · %s" % [g["boss_unlocked"][key], D.ZONES[boss["zone"]]["name"]])
		var b = _button(panel, "CHALLENGE · 1 SIGIL", _act.bind("boss", {"key": key}))
		b.disabled = int(g["sigils"]) <= 0 or not g["zones"].get(boss["zone"], false)
	var tally = _section("LIFETIME")
	_text(tally, "Kills: %s   Deaths: %s   Boss victories: %s" % [g["life_kills"], g["life_deaths"], g["life_bosses"]], 14)
	_text(tally, "Offline combat: %s seconds" % sim.fmt(g["offline_seconds"]), 12, MUTED)
