extends Node2D
## GODSCAR 0.4 - FALLFIELDS playable vertical slice.
## SOLO INSTANCE ONLY. Hearthfall, the future shared hub, is not implemented here.
## Fixed-tick gameplay, independently drawn static terrain, manual 2-thumb spells.
## No pathfinding, auto-steering, combat automation, or network features.

const WORLD_W: float = 2640.0
const WORLD_H: float = 1640.0
const MOVE_SPEED: float = 226.0
const GOLD: Color = Color("#cda568")
const TEXT: Color = Color("#f3e7d5")
const MUTED: Color = Color("#9d9faa")
const BLOOD: Color = Color("#cc4c56")
const WARRIOR: Color = Color("#df9e66")
const SORCERER: Color = Color("#8fa8ef")
const BACK: Color = Color("#0d1119")
const LOG_SCRIPT = preload("res://scripts/test_logger.gd")

const CLASSES = [
    {"name": "WARRIOR", "resource": "RAGE", "hp": 160.0, "energy": 35.0, "color": WARRIOR, "skills": ["CLEAVE", "BULWARK", "RUINBREAKER"]},
    {"name": "SORCERER", "resource": "MANA", "hp": 110.0, "energy": 100.0, "color": SORCERER, "skills": ["ARC BOLT", "BLINK", "CATACLYSM"]}
]
const NPCS = [
    {"name": "MIRA VOSS", "role": "Caldris survivor", "pos": Vector2(352, 1010), "color": Color("#8bbaa6")},
    {"name": "CAPTAIN ELIAN", "role": "Bellmere militia", "pos": Vector2(1470, 965), "color": Color("#d7b77a")},
    {"name": "SISTER ILYRA", "role": "Scholar of the Scar", "pos": Vector2(1885, 917), "color": Color("#9cabd5")}
]
const QUESTS = [
    "Find Mira beside the fallen wagon",
    "Clear the corrupted creatures from the fields",
    "Speak with Captain Elian at Bellmere",
    "Defeat the Rift Hexers near the chapel",
    "Speak to Sister Ilyra",
    "Silence the Hollow Bellkeeper",
    "Report back to Captain Elian",
    "The road to Hearthfall is open"
]

var terrain: Node2D
var font: Font
var log = LOG_SCRIPT.new()
var rng := RandomNumberGenerator.new()
var hero: Vector2 = Vector2(225, 1140)
var heading: Vector2 = Vector2.RIGHT
var move_vector: Vector2 = Vector2.ZERO
var move_touch: int = -1
var touch_start: Vector2 = Vector2.ZERO
var joy_origin: Vector2 = Vector2.ZERO
var joy_knob: Vector2 = Vector2.ZERO
var auto_run: bool = false
var run_heading: Vector2 = Vector2.RIGHT
var floating_joystick: bool = true
var class_id: int = 0
var hp: float = 160.0
var max_hp: float = 160.0
var energy: float = 35.0
var level: int = 1
var xp: int = 0
var kills: int = 0
var deaths: int = 0
var quest_stage: int = 0
var quest_kills: int = 0
var enemies: Array[Dictionary] = []
var numbers: Array[Dictionary] = []
var attack_cd: float = 0.0
var skills_cd: Array[float] = [0.0, 0.0, 0.0]
var shield_time: float = 0.0
var hurt_flash: float = 0.0
var invincible: float = 0.0
var ability_flash: float = 0.0
var ability_text: String = ""
var perf_fps: int = 60
var perf_elapsed: float = 0.0
var perf_frames: int = 0
var perf_hitches: int = 0
var perf_worst: float = 0.0
var sim_us: int = 0
var sim_count: int = 0
var sim_peak: int = 0
var draw_us: int = 0
var draw_count: int = 0
var draw_peak: int = 0
var class_select: bool = true
var dialogue: bool = false
var dialogue_speaker: String = ""
var dialogue_words: String = ""
var dialogue_next: int = -1
var log_open: bool = false
var log_status: String = ""


func _ready() -> void:
    rng.randomize()
    font = ThemeDB.fallback_font
    terrain = get_node("Terrain")
    log.begin()
    log.event("INSTANCE_ENTER", "Fallfields solo, prototype build")
    _set_class(0)
    class_select = true
    _move_camera()
    queue_redraw()
    if "--slice-smoke" in OS.get_cmdline_user_args():
        call_deferred("_slice_smoke_test")


func _slice_smoke_test() -> void:
    # CI-only exercise of the entire first chapter. No Android player sees this.
    _set_class(0)
    class_select = false
    hero = NPCS[0]["pos"]
    _talk()
    assert(dialogue and dialogue_next == 1, "Mira dialogue failed")
    _dialogue_close()
    assert(quest_stage == 1 and enemies.size() == 4, "First encounter failed")
    _blast(Vector2(850, 1000), 1000.0, 9999.0)
    assert(quest_stage == 2, "Blightling quest failed")
    hero = NPCS[1]["pos"]
    _talk()
    _dialogue_close()
    assert(quest_stage == 3, "Captain encounter failed")
    _blast(Vector2(1850, 930), 1000.0, 9999.0)
    assert(quest_stage == 4, "Hexer quest failed")
    hero = NPCS[2]["pos"]
    _talk()
    _dialogue_close()
    assert(quest_stage == 5, "Sister dialogue or boss spawn failed")
    _blast(Vector2(2300, 704), 250.0, 9999.0)
    assert(quest_stage == 6, "Bellkeeper fight resolution failed")
    hero = NPCS[1]["pos"]
    _talk()
    _dialogue_close()
    assert(quest_stage == 7, "Chapter completion failed")
    _set_class(1)
    class_select = false
    _stage(1)
    hero = Vector2(800, 1000)
    _cast(0)
    assert(skills_cd[0] > 0.0, "Sorcerer attack failed")
    _cast(1)
    assert(skills_cd[1] > 0.0, "Sorcerer blink failed")
    invincible = 0.0
    _hurt(15.0, "SMOKE")
    assert(hp < max_hp, "Incoming damage test failed")
    queue_redraw()
    print("GODSCAR_SLICE_SMOKE_OK")


func _set_class(value: int) -> void:
    class_id = clampi(value, 0, 1)
    max_hp = float(CLASSES[class_id]["hp"])
    hp = max_hp
    energy = float(CLASSES[class_id]["energy"])
    level = 1
    xp = 0
    kills = 0
    deaths = 0
    hero = Vector2(225, 1140)
    heading = Vector2.RIGHT
    move_vector = Vector2.ZERO
    auto_run = false
    move_touch = -1
    skills_cd = [0.0, 0.0, 0.0]
    shield_time = 0.0
    invincible = 1.0
    quest_stage = 0
    quest_kills = 0
    enemies.clear()
    numbers.clear()
    log.event("CLASS", str(CLASSES[class_id]["name"]))
    _move_camera()


func _perf_context() -> String:
    var motion: String = "auto" if auto_run else ("joystick" if move_vector.length_squared() > 0.01 else "idle")
    var zone: String = "west" if hero.x < WORLD_W * 0.33 else ("center" if hero.x < WORLD_W * 0.66 else "east")
    return "quest=%d motion=%s zone=%s x=%d y=%d" % [quest_stage, motion, zone, int(hero.x), int(hero.y)]


func _log_state() -> String:
    return "zone=FALLFIELDS instance=SOLO class=%s level=%d quest=%d kills=%d deaths=%d HP=%.0f/%.0f resource=%.0f enemies=%d autorun=%s %s" % [str(CLASSES[class_id]["name"]), level, quest_stage, kills, deaths, hp, max_hp, energy, enemies.size(), str(auto_run), _perf_context()]


func _notification(what: int) -> void:
    if what == NOTIFICATION_APPLICATION_PAUSED:
        log.event("BACKGROUND", "Android pause")
        log.save(_log_state())


func _process(delta: float) -> void:
    if not class_select and not dialogue and not log_open and log.tick(delta):
        log.save(_log_state())
    perf_elapsed += delta
    perf_frames += 1
    perf_worst = maxf(perf_worst, delta * 1000.0)
    if delta > 1.0 / 30.0:
        perf_hitches += 1
    if perf_elapsed >= 1.0:
        perf_fps = roundi(float(perf_frames) / perf_elapsed)
        if not class_select and not dialogue and not log_open:
            log.sample_processing(sim_us, sim_count, sim_peak, draw_us, draw_count, draw_peak)
            log.sample(perf_fps, perf_hitches, perf_worst, enemies.size(), "FALLFIELDS FULL", _perf_context())
        sim_us = 0
        sim_count = 0
        sim_peak = 0
        draw_us = 0
        draw_count = 0
        draw_peak = 0
        perf_elapsed = 0.0
        perf_frames = 0
        perf_worst = 0.0
        perf_hitches = 0


func _physics_process(delta: float) -> void:
    if class_select or dialogue or log_open:
        queue_redraw()
        return
    var started: int = Time.get_ticks_usec()
    var velocity: Vector2 = move_vector
    if velocity.length_squared() > 0.01:
        heading = velocity.normalized()
        if auto_run:
            run_heading = heading
    elif auto_run:
        velocity = run_heading
    hero += velocity * MOVE_SPEED * delta
    hero.x = clampf(hero.x, 70.0, WORLD_W - 70.0)
    hero.y = clampf(hero.y, 90.0, WORLD_H - 90.0)
    _move_camera()
    attack_cd = maxf(0.0, attack_cd - delta)
    for i in range(3):
        skills_cd[i] = maxf(0.0, skills_cd[i] - delta)
    shield_time = maxf(0.0, shield_time - delta)
    hurt_flash = maxf(0.0, hurt_flash - delta)
    ability_flash = maxf(0.0, ability_flash - delta)
    invincible = maxf(0.0, invincible - delta)
    energy = minf(100.0, energy + (4.5 if class_id == 0 else 8.0) * delta)
    for i in range(numbers.size() - 1, -1, -1):
        numbers[i]["time"] = float(numbers[i]["time"]) - delta
        if float(numbers[i]["time"]) <= 0.0:
            numbers.remove_at(i)
    for e in enemies:
        _update_enemy(e, delta)
    if attack_cd <= 0.0:
        _basic_attack()
    queue_redraw()
    var used_us: int = Time.get_ticks_usec() - started
    sim_us += used_us
    sim_count += 1
    sim_peak = maxi(sim_peak, used_us)


func _move_camera() -> void:
    if terrain == null:
        return
    var size: Vector2 = get_viewport_rect().size
    # Keep retained terrain aligned to virtual pixels to avoid subpixel shimmer.
    terrain.position = (_hero_screen() - hero).round()


func _hero_screen() -> Vector2:
    var size: Vector2 = get_viewport_rect().size
    return Vector2(size.x * 0.5, (size.y - 240.0) * 0.52 + 42.0)


func _screen(p: Vector2) -> Vector2:
    return (p - hero + _hero_screen()).round()


func _npc_near() -> int:
    var best: int = -1
    var dist: float = 110.0
    for i in range(NPCS.size()):
        var d: float = hero.distance_to(NPCS[i]["pos"])
        if d < dist:
            dist = d
            best = i
    return best


func _spawn(kind: String, p: Vector2) -> void:
    var max_health: float = 65.0
    var speed: float = 105.0
    var damage: float = 10.0
    match kind:
        "SOLDIER":
            max_health = 125.0
            speed = 76.0
            damage = 15.0
        "HEXER":
            max_health = 92.0
            speed = 73.0
            damage = 23.0
        "BELLKEEPER":
            max_health = 570.0
            speed = 63.0
            damage = 34.0
    enemies.append({
        "kind": kind, "pos": p, "spawn": p, "hp": max_health,
        "max_hp": max_health, "speed": speed, "damage": damage,
        "cd": rng.randf_range(0.5, 1.5), "windup": 0.0,
        "attack": "", "aim": p, "slowed": 0.0, "pattern": 0, "phase2": false
    })
    log.event("ENEMY_SPAWN", kind)


func _stage(next: int) -> void:
    quest_stage = next
    quest_kills = 0
    log.event("QUEST", "stage=%d %s" % [next, QUESTS[next]])
    if next == 1:
        _spawn("BLIGHTLING", Vector2(640, 1020))
        _spawn("BLIGHTLING", Vector2(790, 1100))
        _spawn("BLIGHTLING", Vector2(940, 890))
        _spawn("BLIGHTLING", Vector2(1090, 1035))
    elif next == 3:
        _spawn("SOLDIER", Vector2(1655, 850))
        _spawn("HEXER", Vector2(1740, 1080))
        _spawn("HEXER", Vector2(1990, 765))
        _spawn("HEXER", Vector2(2040, 1060))
    elif next == 5:
        _spawn("BELLKEEPER", Vector2(2300, 704))
        log.event("BOSS_STARTED", "HOLLOW BELLKEEPER")
    elif next == 7:
        log.event("CHAPTER_COMPLETE", "Fallfields clear; Hearthfall next milestone")
        log.save(_log_state())


func _update_enemy(e: Dictionary, delta: float) -> void:
    var kind: String = str(e["kind"])
    var p: Vector2 = e["pos"]
    var diff: Vector2 = hero - p
    var dist: float = diff.length()
    if float(e["slowed"]) > 0.0:
        e["slowed"] = maxf(0.0, float(e["slowed"]) - delta)
    var move_factor: float = 0.52 if float(e["slowed"]) > 0.0 else 1.0
    if float(e["windup"]) > 0.0:
        e["windup"] = maxf(0.0, float(e["windup"]) - delta)
        if float(e["windup"]) <= 0.0:
            var kind_attack: String = str(e["attack"])
            var hit: bool = false
            if kind_attack == "HEX" or kind_attack == "CHAIN":
                hit = hero.distance_to(e["aim"]) < (90.0 if kind_attack == "CHAIN" else 73.0)
            elif kind_attack == "TOLL":
                hit = hero.distance_to(p) < 165.0
            else:
                hit = hero.distance_to(p) < 67.0
            log.enemy_attack(kind_attack, hit)
            if hit:
                _hurt(float(e["damage"]) * (1.20 if kind_attack == "TOLL" else 1.0), kind_attack)
            e["cd"] = (1.6 if bool(e["phase2"]) else 2.2) if kind == "BELLKEEPER" else (2.0 if kind == "HEXER" else 1.35)
        return
    # No encounters chase the player across the whole instance.
    if kind == "BELLKEEPER" and dist > 540.0:
        return
    if kind != "BELLKEEPER" and dist > 475.0:
        return
    e["cd"] = float(e["cd"]) - delta
    var cast_range: float = 385.0 if kind == "HEXER" else (215.0 if kind == "BELLKEEPER" else 64.0)
    var preferred: float = 275.0 if kind == "HEXER" else (88.0 if kind == "BELLKEEPER" else 42.0)
    if dist > preferred and dist > 0.0:
        e["pos"] = p + diff.normalized() * float(e["speed"]) * move_factor * delta
    if dist < cast_range and float(e["cd"]) <= 0.0:
        e["aim"] = hero
        if kind == "HEXER":
            e["attack"] = "HEX"
            e["windup"] = 1.05
        elif kind == "BELLKEEPER":
            e["pattern"] = int(e["pattern"]) + 1
            e["attack"] = "CHAIN" if int(e["pattern"]) % 2 == 0 else "TOLL"
            e["windup"] = 1.05 if bool(e["phase2"]) else 1.38
        else:
            e["attack"] = "MELEE"
            e["windup"] = 0.43


func _basic_attack() -> void:
    var best: int = -1
    var best_dist: float = 155.0 if class_id == 0 else 340.0
    for i in range(enemies.size()):
        var d: float = hero.distance_to(enemies[i]["pos"])
        if d < best_dist:
            best = i
            best_dist = d
    if best < 0:
        return
    var damage: float = (24.0 if class_id == 0 else 18.0) + float(level - 1) * 2.0
    _damage_enemy(best, damage)
    if class_id == 0:
        energy = minf(100.0, energy + 7.0)
    attack_cd = 0.68 if class_id == 0 else 0.74


func _damage_enemy(i: int, damage: float) -> void:
    if i < 0 or i >= enemies.size():
        return
    var e: Dictionary = enemies[i]
    e["hp"] = float(e["hp"]) - damage
    _number(e["pos"], int(damage), CLASSES[class_id]["color"])
    if str(e["kind"]) == "BELLKEEPER" and float(e["hp"]) < float(e["max_hp"]) * 0.5 and not bool(e["phase2"]):
        e["phase2"] = true
        log.event("BOSS_PHASE", "Bellkeeper enraged at 50%")
        _notice("THE BELLKEEPER ENRAGES")
    if float(e["hp"]) <= 0.0:
        var kind: String = str(e["kind"])
        enemies.remove_at(i)
        kills += 1
        xp += 23 if kind != "BELLKEEPER" else 120
        log.event("KILL", kind)
        var threshold: int = 68 + (level - 1) * 44
        if xp >= threshold:
            xp -= threshold
            level += 1
            max_hp += 10.0 if class_id == 0 else 7.0
            hp = minf(max_hp, hp + 10.0)
            log.event("LEVEL_UP", str(level))
        if quest_stage == 1 and kind == "BLIGHTLING":
            quest_kills += 1
            if quest_kills >= 3:
                _stage(2)
        elif quest_stage == 3 and kind == "HEXER":
            quest_kills += 1
            if quest_kills >= 2:
                _stage(4)
        elif quest_stage == 5 and kind == "BELLKEEPER":
            log.event("BOSS_DEFEATED", "HOLLOW BELLKEEPER")
            _stage(6)
            _notice("THE ELEVENTH TOLL HAS FALLEN SILENT")


func _number(where: Vector2, amount: int, tint: Color) -> void:
    numbers.append({"pos": where, "value": str(amount), "color": tint, "time": 0.65})
    if numbers.size() > 36:
        numbers.remove_at(0)


func _hurt(raw: float, kind: String) -> void:
    if invincible > 0.0:
        return
    var amount: float = raw * (0.45 if shield_time > 0.0 else 1.0)
    hp = maxf(0.0, hp - amount)
    hurt_flash = 0.4
    invincible = 0.32
    log.player_damage(amount, kind, hp, max_hp)
    _number(hero, -int(round(amount)), Color("#fd6875"))
    if hp <= 0.0:
        deaths += 1
        log.event("DEATH", "at stage=%d level=%d" % [quest_stage, level])
        hero = Vector2(245, 1110) if quest_stage <= 1 else Vector2(1435, 1045)
        hp = max_hp
        energy = float(CLASSES[class_id]["energy"])
        auto_run = false
        move_vector = Vector2.ZERO
        invincible = 2.5
        # The boss resets if a player dies. No checkpoint skipping.
        if quest_stage == 5:
            enemies.clear()
            _spawn("BELLKEEPER", Vector2(2300, 704))
        _notice("YOU HAVE FALLEN. THE SCAR REMAINS.")
        log.save(_log_state())


func _notice(value: String) -> void:
    ability_text = value
    ability_flash = 1.8


func _cast(slot: int) -> void:
    if slot < 0 or slot > 2 or class_select or dialogue or log_open:
        return
    if skills_cd[slot] > 0.0:
        log.event("SKILL_BLOCKED", "cooldown slot=%d" % [slot])
        return
    var cost: float = [25.0, 20.0, 40.0][slot] if class_id == 0 else [20.0, 24.0, 55.0][slot]
    if energy < cost:
        _notice("NOT ENOUGH " + str(CLASSES[class_id]["resource"]))
        log.event("SKILL_BLOCKED", "resource slot=%d" % [slot])
        return
    energy -= cost
    skills_cd[slot] = [1.7, 8.0, 17.0][slot] if class_id == 0 else [1.2, 6.0, 17.0][slot]
    var name: String = str(CLASSES[class_id]["skills"][slot])
    log.event("SKILL_CAST", name)
    _notice(name)
    if class_id == 0:
        match slot:
            0:
                _blast(hero + heading * 68.0, 127.0, 62.0 + level * 4.0)
            1:
                shield_time = 3.2
            2:
                _blast(hero, 260.0, 150.0 + level * 7.0)
                hp = minf(max_hp, hp + 15.0)
    else:
        match slot:
            0:
                var index: int = _closest_target(430.0)
                if index >= 0:
                    var location: Vector2 = enemies[index]["pos"]
                    _blast(location, 105.0, 75.0 + level * 5.0)
            1:
                hero += heading * 175.0
                hero.x = clampf(hero.x, 70.0, WORLD_W - 70.0)
                hero.y = clampf(hero.y, 90.0, WORLD_H - 90.0)
                invincible = maxf(invincible, 0.28)
            2:
                _blast(hero, 330.0, 125.0 + level * 6.0)
                for e in enemies:
                    e["slowed"] = 2.5


func _closest_target(max_dist: float) -> int:
    var found: int = -1
    for i in range(enemies.size()):
        var d: float = hero.distance_to(enemies[i]["pos"])
        if d < max_dist:
            max_dist = d
            found = i
    return found


func _blast(center: Vector2, radius: float, damage: float) -> void:
    for i in range(enemies.size() - 1, -1, -1):
        var p: Vector2 = enemies[i]["pos"]
        if p.distance_to(center) <= radius:
            _damage_enemy(i, damage)


func _talk() -> void:
    var index: int = _npc_near()
    if index < 0:
        return
    dialogue = true
    move_vector = Vector2.ZERO
    move_touch = -1
    auto_run = false
    dialogue_speaker = str(NPCS[index]["name"])
    dialogue_next = -1
    if index == 0:
        if quest_stage == 0:
            dialogue_words = "You're awake. Good. I pulled you from that wagon. Things are screaming in the wheat, and you look like you know which end of a sword is dangerous. Please help us."
            dialogue_next = 1
        else:
            dialogue_words = "My world had enough problems before the sky tore open. Still... I'm glad I pulled you out."
    elif index == 1:
        if quest_stage == 2:
            dialogue_words = "Your people fell through our sky, and monsters came after them. That bell should be shattered. Yet I hear it every night. Clear the hexers outside the chapel."
            dialogue_next = 3
        elif quest_stage == 6:
            dialogue_words = "The bell has gone quiet. Good. I've sent word to the displaced settlement up north. They call it Hearthfall. You'll find your people there."
            dialogue_next = 7
        else:
            dialogue_words = "We have no magic here, Scarbound. Our steel is all we've got. Please make yours count."
    else:
        if quest_stage == 4:
            dialogue_words = "That bell is ringing from between worlds. The Hollow Bellkeeper is not a soldier of Vharos. It's what happened when two realities collided. Silence it, if you can."
            dialogue_next = 5
        else:
            dialogue_words = "The Blight is not behaving like a disease. It behaves more like a memory trying to become real."


func _dialogue_close() -> void:
    dialogue = false
    if dialogue_next >= 0:
        _stage(dialogue_next)
        dialogue_next = -1
    log.save(_log_state())


func _joy_visual() -> Vector2:
    var s: Vector2 = get_viewport_rect().size
    # Right-side resting position complements the three left-hand spells.
    # The gesture still starts anywhere in the lower half except button hitboxes.
    return joy_origin if move_touch >= 0 else Vector2(s.x - 85, s.y - 93)


func _run_button() -> Vector2:
    var s: Vector2 = get_viewport_rect().size
    return Vector2(s.x - 56, s.y - 307)


func _talk_button() -> Vector2:
    var s: Vector2 = get_viewport_rect().size
    return Vector2(s.x - 65, s.y - 410)


func _spell_button(i: int) -> Vector2:
    var s: Vector2 = get_viewport_rect().size
    # Left-side vertical combat cluster, above the bottom HUD and away
    # from the right-hand movement area. Reserved space for future customization.
    return Vector2(58.0, s.y - 496.0 + float(i) * 84.0)


func _input(event: InputEvent) -> void:
    if event is InputEventScreenTouch:
        if event.pressed:
            _down(event.position, event.index)
        else:
            _up(event.index)
    elif event is InputEventScreenDrag:
        if event.index == move_touch and not class_select and not dialogue and not log_open:
            _drag(event.position)
    elif event is InputEventMouseButton and not OS.has_feature("mobile"):
        if event.button_index == MOUSE_BUTTON_LEFT:
            if event.pressed:
                _down(event.position, 0)
            else:
                _up(0)
    elif event is InputEventMouseMotion and not OS.has_feature("mobile"):
        if move_touch == 0 and not class_select and not dialogue and not log_open:
            _drag(event.position)


func _down(p: Vector2, index: int) -> void:
    var s: Vector2 = get_viewport_rect().size
    if log_open:
        _log_touch(p)
        return
    if class_select:
        if p.y > s.y * 0.36 and p.y < s.y * 0.53:
            _set_class(0)
            class_select = false
            log.event("INSTANCE_START", "Warrior in Fallfields")
        elif p.y >= s.y * 0.53 and p.y < s.y * 0.70:
            _set_class(1)
            class_select = false
            log.event("INSTANCE_START", "Sorcerer in Fallfields")
        return
    if dialogue:
        _dialogue_close()
        return
    if p.y < 83.0:
        if p.x > s.x - 115.0:
            log_open = true
            move_touch = -1
            move_vector = Vector2.ZERO
            log.event("LOG_OPEN")
            log.save(_log_state())
        elif p.x < 125.0:
            class_select = true
            move_touch = -1
            move_vector = Vector2.ZERO
            auto_run = false
            log.event("RESTART_MENU")
        return
    if p.distance_to(_run_button()) < 40.0:
        auto_run = not auto_run
        if auto_run:
            run_heading = move_vector.normalized() if move_vector.length_squared() > 0.01 else heading
        log.event("AUTO_RUN", "ON" if auto_run else "OFF")
        return
    if p.distance_to(_talk_button()) < 42.0 and _npc_near() >= 0:
        _talk()
        return
    for i in range(3):
        if p.distance_to(_spell_button(i)) < 40.0:
            _cast(i)
            return
    if p.y < s.y * 0.5 or move_touch >= 0:
        return
    move_touch = index
    touch_start = p
    joy_origin = p
    joy_knob = Vector2.ZERO
    move_vector = Vector2.ZERO


func _drag(p: Vector2) -> void:
    var diff: Vector2 = p - touch_start
    if diff.length() < 8.0:
        move_vector = Vector2.ZERO
        joy_knob = Vector2.ZERO
    else:
        var strength: float = minf((diff.length() - 8.0) / 55.0, 1.0)
        move_vector = diff.normalized() * strength
        joy_knob = diff.normalized() * minf(55.0, diff.length() - 8.0)


func _up(index: int) -> void:
    if move_touch == index:
        move_touch = -1
        move_vector = Vector2.ZERO
        joy_knob = Vector2.ZERO


func _log_touch(p: Vector2) -> void:
    var s: Vector2 = get_viewport_rect().size
    var top: float = s.y * 0.22
    if p.y >= top + 105.0 and p.y < top + 162.0:
        log_status = "COPIED, PASTE HERE" if log.copy_current(_log_state()) else "CLIPBOARD UNAVAILABLE"
    elif p.y >= top + 174.0 and p.y < top + 226.0:
        log_status = "PREVIOUS COPIED" if log.copy_previous() else "NO PREVIOUS TEST"
    elif p.y >= top + 238.0 and p.y < top + 296.0:
        log.start_new(_log_state())
        log_status = "NEW TEST STARTED"
    elif p.y >= top + 310.0:
        log_open = false


func _draw() -> void:
    var started: int = Time.get_ticks_usec()
    var s: Vector2 = get_viewport_rect().size
    _draw_markers()
    _draw_npcs(s)
    _draw_enemies(s)
    _draw_hero()
    _draw_numbers()
    _draw_hud(s)
    if class_select:
        _draw_class_menu(s)
    if dialogue:
        _draw_dialogue(s)
    if log_open:
        _draw_log(s)
    var used_us: int = Time.get_ticks_usec() - started
    draw_us += used_us
    draw_count += 1
    draw_peak = maxi(draw_peak, used_us)


func _text(words: String, pos: Vector2, size: int = 16, tint: Color = TEXT, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> void:
    draw_string(font, pos, words, align, -1.0, size, tint)


func _bar(p: Vector2, size: Vector2, ratio: float, fill: Color) -> void:
    draw_rect(Rect2(p, size), Color("#181b23"))
    draw_rect(Rect2(p + Vector2(2, 2), Vector2(maxf(0.0, size.x - 4) * clampf(ratio, 0.0, 1.0), size.y - 4)), fill)
    draw_rect(Rect2(p, size), GOLD, false, 1.0)


func _draw_markers() -> void:
    for e in enemies:
        if float(e["windup"]) <= 0.0:
            continue
        var type: String = str(e["attack"])
        var focus: Vector2 = e["pos"] if type == "TOLL" or type == "MELEE" else e["aim"]
        var p: Vector2 = _screen(focus)
        var time: float = 1.38 if str(e["kind"]) == "BELLKEEPER" else (1.05 if type == "HEX" else 0.43)
        var fraction: float = 1.0 - float(e["windup"]) / time
        var radius: float = 165.0 if type == "TOLL" else (90.0 if type == "CHAIN" else (73.0 if type == "HEX" else 63.0))
        draw_circle(p, radius, Color("#a62742", 0.18))
        draw_arc(p, radius, 0.0, TAU, 50, Color("#e85c65", 0.86), 4.0)
        draw_arc(p, maxf(3.0, radius * (1.0 - fraction)), 0.0, TAU, 50, Color("#f8c182"), 3.0)


func _figure(pos: Vector2, tint: Color, type: String, scale: float = 1.0) -> void:
    draw_circle(pos + Vector2(5, 16) * scale, 23.0 * scale, Color(0, 0, 0, 0.42))
    if type == "SORCERER" or type == "HEXER":
        var hood := PackedVector2Array([pos + Vector2(-16, 17) * scale, pos + Vector2(-15, -14) * scale, pos + Vector2(0, -32) * scale, pos + Vector2(15, -14) * scale, pos + Vector2(16, 17) * scale])
        draw_colored_polygon(hood, tint.darkened(0.45))
        draw_circle(pos + Vector2(0, -13) * scale, 12 * scale, tint)
        draw_rect(Rect2(pos + Vector2(-8, -17) * scale, Vector2(16, 5) * scale), Color("#181520"))
        draw_line(pos + Vector2(19, 6) * scale, pos + Vector2(22, -26) * scale, GOLD, 4 * scale)
        draw_circle(pos + Vector2(22, -29) * scale, 6 * scale, SORCERER if type == "SORCERER" else BLOOD)
    else:
        var cloak := PackedVector2Array([pos + Vector2(-24, 17) * scale, pos + Vector2(-13, -13) * scale, pos + Vector2(13, -13) * scale, pos + Vector2(24, 17) * scale])
        draw_colored_polygon(cloak, tint.darkened(0.52))
        draw_rect(Rect2(pos + Vector2(-13, -12) * scale, Vector2(26, 31) * scale), tint.darkened(0.15))
        draw_circle(pos + Vector2(0, -21) * scale, 13.0 * scale, Color("#80766a"))
        draw_rect(Rect2(pos + Vector2(-12, -26) * scale, Vector2(24, 7) * scale), tint)
        draw_line(pos + Vector2(18, 5) * scale, pos + Vector2(33, -23) * scale, Color("#b9a9a0"), 5.0 * scale)
    draw_circle(pos, 3.0 * scale, GOLD)


func _draw_npcs(s: Vector2) -> void:
    for i in range(NPCS.size()):
        var n: Dictionary = NPCS[i]
        var p: Vector2 = _screen(n["pos"])
        if p.x < -75 or p.x > s.x + 75 or p.y < -75 or p.y > s.y + 75:
            continue
        _figure(p, n["color"], "SORCERER" if i == 2 else "WARRIOR", 0.9)
        var relevant: bool = (i == 0 and quest_stage == 0) or (i == 1 and (quest_stage == 2 or quest_stage == 6)) or (i == 2 and quest_stage == 4)
        if relevant:
            draw_circle(p + Vector2(0, -53), 12, Color("#40352c"))
            _text("!", p + Vector2(-4, -47), 23, GOLD)
        _text(str(n["name"]), p + Vector2(0, -58 if not relevant else -78), 13, TEXT, HORIZONTAL_ALIGNMENT_CENTER)


func _draw_enemies(s: Vector2) -> void:
    for e in enemies:
        var p: Vector2 = _screen(e["pos"])
        if p.x < -120 or p.x > s.x + 120 or p.y < -120 or p.y > s.y + 120:
            continue
        var kind: String = str(e["kind"])
        var tint: Color = Color("#67545d")
        if kind == "HEXER":
            tint = Color("#aa658e")
        elif kind == "SOLDIER":
            tint = Color("#73717a")
        elif kind == "BELLKEEPER":
            tint = Color("#a56b5e")
        var large: float = 2.05 if kind == "BELLKEEPER" else (1.2 if kind == "SOLDIER" else 0.9)
        _figure(p, tint, "HEXER" if kind == "HEXER" else "WARRIOR", large)
        if kind == "BELLKEEPER":
            draw_arc(p + Vector2(0, -32), 62, PI * 0.05, PI * 0.95, 28, GOLD, 8.0)
        _bar(p + Vector2(-31, -42) * large, Vector2(62 * large, 7), float(e["hp"]) / float(e["max_hp"]), BLOOD)


func _draw_hero() -> void:
    var p: Vector2 = _hero_screen()
    _figure(p, CLASSES[class_id]["color"], str(CLASSES[class_id]["name"]), 1.1)
    if shield_time > 0.0:
        draw_arc(p, 49.0, 0.0, TAU, 60, Color("#95c6ed"), 4.0)
    if invincible > 0.0 or hurt_flash > 0.0:
        draw_arc(p, 40.0, 0.0, TAU, 60, Color("#f07381", 0.72), 4.0)
    draw_line(p + heading * 28.0, p + heading * 41.0, GOLD, 3.0)


func _draw_numbers() -> void:
    for v in numbers:
        var p: Vector2 = _screen(v["pos"])
        p.y -= (0.65 - float(v["time"])) * 38.0
        _text(str(v["value"]), p, 20, v["color"], HORIZONTAL_ALIGNMENT_CENTER)


func _draw_hud(s: Vector2) -> void:
    draw_rect(Rect2(0, 0, s.x, 83), Color("#0c121a", 0.96))
    draw_line(Vector2(0, 83), Vector2(s.x, 83), GOLD, 2.0)
    _text("RESTART", Vector2(14, 30), 13, GOLD)
    _text("FALLFIELDS", Vector2(s.x * 0.5, 31), 23, TEXT, HORIZONTAL_ALIGNMENT_CENTER)
    _text("SOLO INSTANCE", Vector2(s.x * 0.5, 54), 12, MUTED, HORIZONTAL_ALIGNMENT_CENTER)
    _text("TEST LOG", Vector2(s.x - 94, 30), 14, GOLD)
    _text("%d FPS" % perf_fps, Vector2(s.x - 80, 56), 13, MUTED)
    var quest_label: String = QUESTS[quest_stage]
    var progress: String = ("  %d/3" % quest_kills) if quest_stage == 1 else (("  %d/2" % quest_kills) if quest_stage == 3 else "")
    draw_rect(Rect2(8, 91, s.x - 16, 72), Color("#131820", 0.83))
    _text("CHAPTER I  /  THE FALLEN", Vector2(18, 112), 14, GOLD)
    _text(quest_label + progress, Vector2(18, 138), 15, TEXT)
    var destination: Vector2 = Vector2.ZERO
    match quest_stage:
        0: destination = NPCS[0]["pos"]
        1: destination = Vector2(860, 1000)
        2, 6: destination = NPCS[1]["pos"]
        3: destination = Vector2(1850, 920)
        4: destination = NPCS[2]["pos"]
        5: destination = Vector2(2300, 704)
    if quest_stage < 7:
        _text("%d units" % int(hero.distance_to(destination)), Vector2(s.x - 104, 157), 12, MUTED)
    var low: float = s.y - 250.0
    draw_rect(Rect2(0, low, s.x, 250), Color("#0a0f18", 0.96))
    draw_line(Vector2(0, low), Vector2(s.x, low), GOLD, 3.0)
    _text("LV %d  %s" % [level, CLASSES[class_id]["name"]], Vector2(18, low + 21), 14, GOLD)
    _bar(Vector2(18, low + 29), Vector2(s.x - 36, 9), float(xp) / float(68 + (level - 1) * 44), Color("#78a1ba"))
    var globe: Vector2 = Vector2(s.x * 0.5, s.y - 97)
    draw_circle(globe, 77, Color("#06080e"))
    draw_circle(globe, 68, Color("#6f543a"))
    draw_circle(globe, 63, Color("#1a1c26"))
    for r in range(-56, 57, 4):
        var yy: float = float(r)
        var extent: float = sqrt(maxf(0.0, 56.0 * 56.0 - yy * yy))
        var red: Color = Color("#a83f4d") if yy > 56 - 112 * hp / max_hp else Color("#3a202b")
        var blue: Color = Color("#537cba") if class_id == 1 else Color("#bc7b4c")
        if yy <= 56 - 112 * energy / 100.0:
            blue = Color("#272436")
        draw_rect(Rect2(globe + Vector2(-extent, yy), Vector2(maxf(0, extent - 2), 4)), red)
        draw_rect(Rect2(globe + Vector2(2, yy), Vector2(maxf(0, extent - 2), 4)), blue)
    draw_line(globe + Vector2(0, -57), globe + Vector2(0, 57), GOLD, 2.0)
    draw_arc(globe, 67, 0, TAU, 56, GOLD, 4.0)
    _text("%d" % int(hp), globe + Vector2(-40, 8), 20, TEXT)
    _text("%d" % int(energy), globe + Vector2(13, 8), 19, TEXT)
    _text("HP", globe + Vector2(-29, -18), 11, TEXT)
    _text(str(CLASSES[class_id]["resource"]), globe + Vector2(8, -18), 10, TEXT)
    var joystick: Vector2 = _joy_visual()
    if move_touch >= 0:
        draw_circle(joystick, 61, Color("#718194", 0.19))
        draw_arc(joystick, 61, 0, TAU, 44, Color("#b0bdc6", 0.66), 2.0)
        draw_circle(joystick + joy_knob, 27, Color("#8c9bae", 0.9))
    else:
        draw_arc(joystick, 46, 0, TAU, 44, Color("#718194", 0.35), 2.0)
        _text("MOVE", joystick + Vector2(-22, 4), 14, MUTED)
    _text("DRAG BELOW CENTER TO MOVE", Vector2(s.x * 0.5, s.y - 11), 10, MUTED, HORIZONTAL_ALIGNMENT_CENTER)
    var run: Vector2 = _run_button()
    draw_circle(run, 36, Color("#383323") if auto_run else Color("#252b32"))
    draw_arc(run, 36, 0, TAU, 40, GOLD if auto_run else Color("#728397"), 2.4)
    _text("STOP" if auto_run else "RUN", run + Vector2(-19, 6), 15, GOLD)
    if _npc_near() >= 0:
        var talk: Vector2 = _talk_button()
        draw_circle(talk, 39, Color("#37362c"))
        draw_arc(talk, 39, 0, TAU, 44, GOLD, 3.0)
        _text("TALK", talk + Vector2(-24, 6), 16, GOLD)
    for i in range(3):
        var center: Vector2 = _spell_button(i)
        var ready: bool = skills_cd[i] <= 0.0
        draw_circle(center, 37, Color("#38313a") if ready else Color("#282a32"))
        draw_arc(center, 38, 0, TAU, 48, GOLD if ready else Color("#65616b"), 3.0)
        _text(str(i + 1) if ready else str(int(ceil(skills_cd[i]))), center + Vector2(-7, 7), 23, TEXT)
        _text(str(CLASSES[class_id]["skills"][i]), center + Vector2(-49, -44), 10, GOLD)
    if ability_flash > 0.0:
        _text(ability_text, Vector2(s.x * 0.5, low - 36), 16, GOLD, HORIZONTAL_ALIGNMENT_CENTER)
    if quest_stage == 7:
        _text("CHAPTER COMPLETE: HEARTHFALL AWAITS", Vector2(s.x * 0.5, low - 74), 15, GOLD, HORIZONTAL_ALIGNMENT_CENTER)


func _wrap(words: String, x: float, y: float, width: float, size: int, tint: Color = TEXT) -> void:
    var line: String = ""
    var baseline: float = y
    for token in words.split(" "):
        var proposal: String = token if line.is_empty() else line + " " + token
        if font.get_string_size(proposal, HORIZONTAL_ALIGNMENT_LEFT, -1, size).x > width and not line.is_empty():
            _text(line, Vector2(x, baseline), size, tint)
            baseline += size + 11
            line = token
        else:
            line = proposal
    if not line.is_empty():
        _text(line, Vector2(x, baseline), size, tint)


func _draw_class_menu(s: Vector2) -> void:
    draw_rect(Rect2(Vector2.ZERO, s), Color("#080b13", 0.98))
    _text("GODSCAR", Vector2(s.x * 0.5, s.y * 0.16), 42, GOLD, HORIZONTAL_ALIGNMENT_CENTER)
    _text("CHAPTER I   THE FALLFIELDS", Vector2(s.x * 0.5, s.y * 0.23), 18, TEXT, HORIZONTAL_ALIGNMENT_CENTER)
    _text("TWO WORLDS. ONE WOUND.", Vector2(s.x * 0.5, s.y * 0.28), 15, MUTED, HORIZONTAL_ALIGNMENT_CENTER)
    for i in range(2):
        var y: float = s.y * (0.36 if i == 0 else 0.53)
        var rect := Rect2(24, y, s.x - 48, s.y * 0.16)
        draw_rect(rect, Color("#252331"))
        draw_rect(rect, WARRIOR if i == 0 else SORCERER, false, 3.0)
        _text("WARRIOR" if i == 0 else "SORCERER", Vector2(48, y + 47), 26, TEXT)
        _wrap("Close combat / Cleave / Bulwark / Ruinbreaker" if i == 0 else "Ranged magic / Arc Bolt / Blink / Cataclysm", 48, y + 77, s.x - 90, 15, MUTED)
        _text("TAP TO BEGIN", Vector2(s.x - 159, y + s.y * 0.16 - 17), 14, GOLD)
    _wrap("You fell from Veyra into a world without magic. Mira Voss found you beneath the wreckage.", 38, s.y * 0.76, s.x - 75, 18, TEXT)
    _text("SPELLS LEFT  /  MOVEMENT RIGHT OR ANY LOWER AREA", Vector2(s.x * 0.5, s.y * 0.92), 12, GOLD, HORIZONTAL_ALIGNMENT_CENTER)
    _text("SOLO STORY INSTANCE - PROTOTYPE 0.4", Vector2(s.x * 0.5, s.y - 32), 12, MUTED, HORIZONTAL_ALIGNMENT_CENTER)


func _draw_dialogue(s: Vector2) -> void:
    draw_rect(Rect2(Vector2.ZERO, s), Color("#090b10", 0.76))
    var top: float = s.y * 0.36
    draw_rect(Rect2(21, top, s.x - 42, 325), Color("#181b26"))
    draw_rect(Rect2(21, top, s.x - 42, 325), GOLD, false, 2.0)
    _text(dialogue_speaker, Vector2(45, top + 43), 23, GOLD)
    _wrap(dialogue_words, 45, top + 91, s.x - 92, 18, TEXT)
    _text("TAP TO CONTINUE", Vector2(s.x * 0.5, top + 299), 15, GOLD, HORIZONTAL_ALIGNMENT_CENTER)


func _draw_log(s: Vector2) -> void:
    draw_rect(Rect2(Vector2.ZERO, s), Color("#090c15", 0.97))
    var top: float = s.y * 0.22
    draw_rect(Rect2(24, top, s.x - 48, 410), Color("#191d27"))
    draw_rect(Rect2(24, top, s.x - 48, 410), GOLD, false, 2.0)
    _text("FALLFIELDS TEST LOG", Vector2(s.x * 0.5, top + 44), 24, GOLD, HORIZONTAL_ALIGNMENT_CENTER)
    _text("COPY AND PASTE STRAIGHT INTO CHAT", Vector2(s.x * 0.5, top + 75), 13, MUTED, HORIZONTAL_ALIGNMENT_CENTER)
    for i in range(4):
        var y: float = top + 105 + i * 69
        draw_rect(Rect2(43, y, s.x - 86, 54), Color("#333440"))
        draw_rect(Rect2(43, y, s.x - 86, 54), GOLD, false, 1.0)
        var label: String = ["COPY CURRENT LOG", "COPY PREVIOUS LOG", "NEW TEST", "RESUME GAME"][i]
        _text(label, Vector2(s.x * 0.5, y + 35), 18, TEXT, HORIZONTAL_ALIGNMENT_CENTER)
    _text(log_status, Vector2(s.x * 0.5, top + 398), 14, GOLD, HORIZONTAL_ALIGNMENT_CENTER)
