extends Node2D
## Godscar: first playable, seeded SOLO Godwound crypt. Android A15 baseline.
## 60Hz combat, static cached real art, manual movement and 3 spell buttons.
## Not a persistent loot/MMO implementation: this is the dungeon loop milestone.
const GEN = preload("res://scripts/crypt_generator.gd")
const WORLD = preload("res://scripts/crypt_world.gd")
const LOG = preload("res://scripts/test_logger.gd")
const GOLD: Color = Color("#d4ac70")
const TEXT: Color = Color("#f0e2cf")
const MUTED: Color = Color("#a4a3ab")
const BLOOD: Color = Color("#c64b56")
const WARRIOR: Color = Color("#df9e66")
const SORCERER: Color = Color("#8fa8ef")
const MOVE_SPEED: float = 222.0
const CLASSES = [
    {"name": "WARRIOR", "hp": 165.0, "start_resource": 35.0, "resource": "RAGE", "color": WARRIOR,
        "skills": ["CLEAVE", "BULWARK", "RUINBREAKER"]},
    {"name": "SORCERER", "hp": 118.0, "start_resource": 100.0, "resource": "MANA", "color": SORCERER,
        "skills": ["ARC BOLT", "BLINK", "CATACLYSM"]}
]

var layout = GEN.new()
var world: Node2D
var log = LOG.new()
var font: Font
var rng := RandomNumberGenerator.new()
var phase: int = 0  # 0 choose class, 1 fight/explore, 2 run finished
var won: bool = false
var seed_value: int = 0
var class_id: int = 0
var hero: Vector2 = Vector2.ZERO
var heading: Vector2 = Vector2.RIGHT
var movement: Vector2 = Vector2.ZERO
var touch_id: int = -1
var touch_start: Vector2 = Vector2.ZERO
var joy_origin: Vector2 = Vector2.ZERO
var joy_knob: Vector2 = Vector2.ZERO
var hp: float = 165.0
var max_hp: float = 165.0
var energy: float = 35.0
var level: int = 1
var xp: int = 0
var kills: int = 0
var death_count: int = 0
var enemies: Array[Dictionary] = []
var numbers: Array[Dictionary] = []
var room_visited: Dictionary = {}
var boss_dead: bool = false
var exit_at: Vector2 = Vector2.ZERO
var attack_cd: float = 0.0
var skills_cd: Array[float] = [0.0, 0.0, 0.0]
var shield_timer: float = 0.0
var invincible: float = 0.0
var notice: String = ""
var notice_timer: float = 0.0
var hit_timer: float = 0.0
var fps: int = 0
var fps_frames: int = 0
var fps_elapsed: float = 0.0
var worst_frame: float = 0.0
var hitches: int = 0
var sim_us: int = 0
var sim_count: int = 0
var sim_peak: int = 0
var draw_us: int = 0
var draw_count: int = 0
var draw_peak: int = 0
var elapsed: float = 0.0
var log_open: bool = false
var log_status: String = ""


func _ready() -> void:
    font = ThemeDB.fallback_font
    world = WORLD.new()
    world.name = "CachedGodscarCrypt"
    world.show_behind_parent = true
    add_child(world)
    log.begin()
    if "--crypt-smoke" in OS.get_cmdline_user_args():
        call_deferred("_crypt_smoke_test")
    queue_redraw()


func _crypt_smoke_test() -> void:
    # Check deterministic topology and physical tile flood, including doorways.
    var signatures: Dictionary = {}
    for s in range(1, 48):
        var candidate = GEN.new()
        candidate.generate(1000 + s)
        assert(candidate.room_order.size() == 9, "Wrong number of rooms")
        assert(candidate.validated(), "Generated crypt is disconnected or collides")
        var sign: String = candidate.signature()
        var replay = GEN.new()
        replay.generate(1000 + s)
        assert(replay.signature() == sign, "Seed not deterministic")
        signatures[sign] = true
    assert(signatures.size() >= 8, "Dungeon layouts are insufficiently varied")
    _start_run(0, 71029)
    assert(phase == 1 and enemies.size() > 0 and layout.validated(), "Dungeon start failed")
    var expected_boss: Vector2 = layout.room_center(layout.boss)
    var old: Vector2 = hero
    assert(not layout.is_walkable(Vector2(-200, -200)), "Missing outer boundary")
    assert(not layout.is_walkable(Vector2(float(layout.start.x * GEN.CELL + 12),
        float(layout.start.y * GEN.CELL + 12))), "Room wall should collide")
    _move_actor(Vector2(-500, 0), 1.0, 24.0)
    assert(layout.is_walkable(hero, 24.0), "Player escaped collision bounds")
    hero = old
    var boss_index: int = -1
    for i in range(enemies.size()):
        if bool(enemies[i]["boss"]):
            boss_index = i
            break
    assert(boss_index >= 0, "Missing dungeon boss")
    _damage_enemy(boss_index, 99999.0)
    assert(boss_dead, "Boss did not unlock exit")
    hero = expected_boss
    _check_exit()
    assert(phase == 2 and won, "Cleared dungeon did not resolve victory")
    print("GODSCAR_CRYPT_SMOKE_OK seeds=47 unique=%d rooms=9 boss=clear collision=pass" % signatures.size())


func _start_run(next_class: int, chosen_seed: int = 0) -> void:
    class_id = clampi(next_class, 0, 1)
    seed_value = chosen_seed if chosen_seed != 0 else (int(Time.get_unix_time_from_system()) ^ Time.get_ticks_msec())
    rng.seed = seed_value
    layout.generate(seed_value)
    assert(layout.validated(), "Generated crypt did not validate")
    world.configure(layout)
    hero = layout.room_center(layout.start)
    exit_at = layout.room_center(layout.boss)
    heading = Vector2.RIGHT
    movement = Vector2.ZERO
    touch_id = -1
    hp = float(CLASSES[class_id]["hp"])
    max_hp = hp
    energy = float(CLASSES[class_id]["start_resource"])
    phase = 1
    won = false
    level = 1
    xp = 0
    kills = 0
    death_count = 0
    boss_dead = false
    elapsed = 0.0
    attack_cd = 0.0
    skills_cd = [0.0, 0.0, 0.0]
    shield_timer = 0.0
    invincible = 2.0
    numbers.clear()
    room_visited.clear()
    room_visited[layout.start] = true
    _populate_rooms()
    _move_camera()
    log.event("CRYPT_ENTER", "seed=%d class=%s rooms=%d" % [
        seed_value, str(CLASSES[class_id]["name"]), layout.room_order.size()])
    _notice("FIND THE WOUNDWARDEN")
    queue_redraw()


func _populate_rooms() -> void:
    enemies.clear()
    for cell in layout.room_order:
        if cell == layout.start:
            continue
        var center: Vector2 = layout.room_center(cell)
        if cell == layout.boss:
            _spawn("WOUNDWARDEN", center + Vector2(0, -28), cell, true)
            continue
        var count: int = 2 + rng.randi_range(0, 1)
        var locations: Array[Vector2] = [
            Vector2(-145, -100), Vector2(140, 100),
            Vector2(90, -150), Vector2(-120, 145)
        ]
        for j in range(count):
            var kind: String = "HEXER" if rng.randf() < 0.32 else "HOLLOW"
            _spawn(kind, center + locations[(j + posmod(cell.x, 3)) % locations.size()], cell)


func _spawn(kind: String, at: Vector2, room: Vector2i, is_boss: bool = false) -> void:
    var health: float = 440.0 if is_boss else (95.0 if kind == "HEXER" else 80.0)
    enemies.append({
        "kind": kind, "pos": at, "room": room, "boss": is_boss,
        "hp": health, "max_hp": health,
        "speed": 64.0 if is_boss else (69.0 if kind == "HEXER" else 89.0),
        "damage": 23.0 if is_boss else (15.0 if kind == "HEXER" else 10.0),
        "cd": rng.randf_range(0.7, 1.5), "windup": 0.0,
        "aim": at, "attack": "", "phase2": false
    })


func _physics_process(delta: float) -> void:
    if phase != 1 or log_open:
        return
    var tick: int = Time.get_ticks_usec()
    elapsed += delta
    if movement.length_squared() > 0.02:
        heading = movement.normalized()
        _move_actor(movement * MOVE_SPEED, delta, 23.0)
        _move_camera()
    var room: Vector2i = layout.room_for_world(hero)
    if layout.rooms.has(room) and not room_visited.has(room):
        room_visited[room] = true
        log.event("ROOM_FOUND", "%d,%d depth=%d" % [room.x, room.y, int(layout.depth[room])])
        _notice("NEW CHAMBER DISCOVERED")
    energy = minf(100.0, energy + (5.0 if class_id == 0 else 8.5) * delta)
    attack_cd = maxf(0.0, attack_cd - delta)
    for i in range(3):
        skills_cd[i] = maxf(0.0, skills_cd[i] - delta)
    shield_timer = maxf(0.0, shield_timer - delta)
    invincible = maxf(0.0, invincible - delta)
    notice_timer = maxf(0.0, notice_timer - delta)
    hit_timer = maxf(0.0, hit_timer - delta)
    for i in range(numbers.size() - 1, -1, -1):
        numbers[i]["life"] = float(numbers[i]["life"]) - delta
        if float(numbers[i]["life"]) <= 0.0:
            numbers.remove_at(i)
    # Keep enemy thinking local to the camera-neighborhood; no entire-map AI.
    for enemy in enemies:
        if hero.distance_squared_to(enemy["pos"]) <= 720.0 * 720.0:
            _update_enemy(enemy, delta)
    if attack_cd <= 0.0:
        _basic_attack()
    _check_exit()
    var cost: int = Time.get_ticks_usec() - tick
    sim_us += cost
    sim_count += 1
    sim_peak = maxi(sim_peak, cost)
    queue_redraw()


func _move_actor(velocity: Vector2, delta: float, radius: float, target: Dictionary = {}) -> void:
    var initial: Vector2 = hero if target.is_empty() else target["pos"]
    var step: Vector2 = velocity * delta
    var updated: Vector2 = initial
    if layout.is_walkable(updated + Vector2(step.x, 0.0), radius):
        updated.x += step.x
    if layout.is_walkable(updated + Vector2(0.0, step.y), radius):
        updated.y += step.y
    if target.is_empty():
        hero = updated
    else:
        target["pos"] = updated


func _update_enemy(e: Dictionary, delta: float) -> void:
    var at: Vector2 = e["pos"]
    var toward: Vector2 = hero - at
    var distance: float = toward.length()
    if float(e["windup"]) > 0.0:
        e["windup"] = maxf(0.0, float(e["windup"]) - delta)
        if float(e["windup"]) <= 0.0:
            var attack_type: String = str(e["attack"])
            var radius: float = 160.0 if attack_type == "PULSE" else (77.0 if attack_type == "HEX" else 61.0)
            var focus: Vector2 = at if attack_type == "PULSE" or attack_type == "MELEE" else e["aim"]
            if hero.distance_to(focus) < radius and _line_clear(hero, focus):
                _take_damage(float(e["damage"]) * (1.35 if attack_type == "PULSE" else 1.0))
            e["cd"] = 1.8 if bool(e["boss"]) else (1.7 if str(e["kind"]) == "HEXER" else 1.25)
        return
    e["cd"] = float(e["cd"]) - delta
    var caster: bool = str(e["kind"]) == "HEXER"
    var boss: bool = bool(e["boss"])
    var preferred: float = 130.0 if boss else (280.0 if caster else 45.0)
    if distance > preferred and distance > 0.1:
        _move_actor(toward.normalized() * float(e["speed"]), delta, 22.0, e)
    var attack_range: float = 205.0 if boss else (360.0 if caster else 64.0)
    if distance < attack_range and float(e["cd"]) <= 0.0 and _line_clear(at, hero):
        e["aim"] = hero
        e["attack"] = ("PULSE" if int(elapsed) % 2 == 0 else "HEX") if boss else ("HEX" if caster else "MELEE")
        e["windup"] = 1.0 if boss else (0.90 if caster else 0.43)


func _line_clear(from: Vector2, to: Vector2) -> bool:
    var distance: float = from.distance_to(to)
    if distance < 0.01:
        return true
    var steps: int = maxi(1, ceili(distance / 56.0))
    for j in range(1, steps):
        if not layout.is_walkable(from.lerp(to, float(j) / float(steps)), 4.0):
            return false
    return true


func _basic_attack() -> void:
    var reach: float = 165.0 if class_id == 0 else 335.0
    var index: int = _target(reach)
    if index < 0:
        return
    var damage: float = (24.0 if class_id == 0 else 21.0) + (level - 1) * 3.0
    _damage_enemy(index, damage)
    energy = minf(100.0, energy + 8.0) if class_id == 0 else energy
    attack_cd = 0.61 if class_id == 0 else 0.75


func _target(reach: float) -> int:
    var found: int = -1
    var best: float = reach
    for i in range(enemies.size()):
        var dist: float = hero.distance_to(enemies[i]["pos"])
        if dist < best and _line_clear(hero, enemies[i]["pos"]):
            best = dist
            found = i
    return found


func _damage_enemy(i: int, amount: float) -> void:
    if i < 0 or i >= enemies.size():
        return
    var e: Dictionary = enemies[i]
    e["hp"] = float(e["hp"]) - amount
    _number(e["pos"], int(round(amount)), CLASSES[class_id]["color"])
    if bool(e["boss"]) and float(e["hp"]) < float(e["max_hp"]) * 0.5 and not bool(e["phase2"]):
        e["phase2"] = true
        e["speed"] = 93.0
        e["cd"] = 0.2
        _notice("THE WOUNDWARDEN AWAKENS")
    if float(e["hp"]) <= 0.0:
        var was_boss: bool = bool(e["boss"])
        enemies.remove_at(i)
        kills += 1
        xp += 140 if was_boss else 24
        if xp >= (65 + level * 42):
            xp -= (65 + level * 42)
            level += 1
            max_hp += 12.0
            hp = minf(max_hp, hp + 35.0)
            _notice("LEVEL %d" % level)
        if was_boss:
            boss_dead = true
            log.event("BOSS_DEFEATED", "WOUNDWARDEN seed=%d" % seed_value)
            _notice("BOSS DEFEATED. ENTER THE CRIMSON RIFT.")


func _number(at: Vector2, amount: int, color: Color) -> void:
    numbers.append({"pos": at, "value": amount, "color": color, "life": 0.7})
    if numbers.size() > 35:
        numbers.remove_at(0)


func _blast(at: Vector2, radius: float, damage: float) -> void:
    for i in range(enemies.size() - 1, -1, -1):
        if at.distance_to(enemies[i]["pos"]) <= radius and _line_clear(at, enemies[i]["pos"]):
            _damage_enemy(i, damage)
    hit_timer = 0.24


func _cast(slot: int) -> void:
    if phase != 1 or skills_cd[slot] > 0.0:
        return
    var cost: float = [25.0, 20.0, 50.0][slot] if class_id == 0 else [20.0, 26.0, 55.0][slot]
    if energy < cost:
        _notice("NOT ENOUGH " + str(CLASSES[class_id]["resource"]))
        return
    energy -= cost
    skills_cd[slot] = [1.6, 8.0, 16.0][slot] if class_id == 0 else [1.3, 6.0, 17.0][slot]
    _notice(str(CLASSES[class_id]["skills"][slot]))
    if class_id == 0:
        match slot:
            0:
                _blast(hero + heading * 55.0, 142.0, 60.0 + level * 4.0)
            1:
                shield_timer = 4.0
            2:
                _blast(hero, 255.0, 150.0 + level * 8.0)
                hp = minf(max_hp, hp + 24.0)
    else:
        match slot:
            0:
                var index: int = _target(430.0)
                if index >= 0:
                    _blast(enemies[index]["pos"], 100.0, 74.0 + level * 5.0)
            1:
                for j in range(8):
                    _move_actor(heading * 300.0, 0.075, 23.0)
                _move_camera()
                invincible = 0.35
            2:
                _blast(hero, 325.0, 132.0 + level * 6.0)


func _take_damage(amount: float) -> void:
    if invincible > 0.0:
        return
    var taken: float = amount * (0.42 if shield_timer > 0.0 else 1.0)
    hp -= taken
    _number(hero, -int(round(taken)), BLOOD)
    invincible = 0.36
    if hp <= 0.0:
        death_count += 1
        won = false
        phase = 2
        movement = Vector2.ZERO
        log.event("DUNGEON_FAILED", "seed=%d kills=%d" % [seed_value, kills])
        log.save(_log_state())


func _check_exit() -> void:
    if boss_dead and hero.distance_to(exit_at) < 100.0:
        phase = 2
        won = true
        movement = Vector2.ZERO
        log.event("DUNGEON_CLEAR", "seed=%d kills=%d seconds=%.0f" % [seed_value, kills, elapsed])
        log.save(_log_state())


func _notice(message: String) -> void:
    notice = message
    notice_timer = 2.5


func _log_state() -> String:
    return "CRYPT seed=%d class=%s rooms=%d found=%d kills=%d enemies=%d boss=%s hp=%.0f elapsed=%.1f fps=%d hitches=%d props=%d" % [
        seed_value, str(CLASSES[class_id]["name"]), layout.room_order.size(), room_visited.size(),
        kills, enemies.size(), str(boss_dead), hp, elapsed, fps, hitches, world.placed_props]


func _process(delta: float) -> void:
    fps_frames += 1
    fps_elapsed += delta
    worst_frame = maxf(worst_frame, delta * 1000.0)
    if delta > 1.0 / 30.0:
        hitches += 1
    if fps_elapsed >= 1.0:
        fps = roundi(fps_frames / fps_elapsed)
        if phase == 1 and not log_open:
            log.sample_processing(sim_us, sim_count, sim_peak, draw_us, draw_count, draw_peak)
            log.sample(fps, hitches, worst_frame, enemies.size(), "GODWOUND CRYPT", _log_state())
        fps_frames = 0
        fps_elapsed = 0.0
        worst_frame = 0.0
        hitches = 0
        sim_us = 0
        sim_count = 0
        sim_peak = 0
        draw_us = 0
        draw_count = 0
        draw_peak = 0


func _hero_screen() -> Vector2:
    var s: Vector2 = get_viewport_rect().size
    return Vector2(s.x * 0.5, (s.y - 260.0) * 0.55 + 12.0)


func _screen(p: Vector2) -> Vector2:
    return (p - hero + _hero_screen()).round()


func _move_camera() -> void:
    world.position = (_hero_screen() - hero).round()


func _spell_at(i: int) -> Vector2:
    var s: Vector2 = get_viewport_rect().size
    return Vector2(55, s.y - 482 + 82 * i)


func _input(event: InputEvent) -> void:
    if event is InputEventScreenTouch:
        if event.pressed:
            _touch_down(event.position, event.index)
        else:
            _touch_up(event.index)
    elif event is InputEventScreenDrag and event.index == touch_id:
        _drag(event.position)
    elif event is InputEventMouseButton and not OS.has_feature("mobile"):
        if event.button_index == MOUSE_BUTTON_LEFT:
            if event.pressed:
                _touch_down(event.position, 0)
            else:
                _touch_up(0)
    elif event is InputEventMouseMotion and touch_id == 0 and not OS.has_feature("mobile"):
        _drag(event.position)


func _touch_down(p: Vector2, id: int) -> void:
    var s: Vector2 = get_viewport_rect().size
    if phase == 0:
        if p.y > s.y * 0.37 and p.y < s.y * 0.51:
            _start_run(0)
        elif p.y >= s.y * 0.52 and p.y < s.y * 0.66:
            _start_run(1)
        elif p.y < 100.0:
            get_tree().change_scene_to_file("res://scenes/fallfields.tscn")
        return
    if phase == 2:
        if p.y > s.y * 0.55 and p.y < s.y * 0.7:
            _start_run(class_id)
        elif p.y > s.y * 0.73:
            get_tree().change_scene_to_file("res://scenes/fallfields.tscn")
        return
    if log_open:
        if p.y > s.y * 0.36 and p.y < s.y * 0.46:
            log_status = "COPIED" if log.copy_current(_log_state()) else "NO LOG AVAILABLE"
        elif p.y > s.y * 0.5:
            log_open = false
        return
    if p.y < 83.0:
        if p.x < 140:
            log.save(_log_state())
            phase = 0
        elif p.x > s.x - 132:
            log_open = true
            log.save(_log_state())
        return
    for i in range(3):
        if p.distance_to(_spell_at(i)) < 43.0:
            _cast(i)
            return
    if p.y >= s.y * 0.5 and touch_id == -1:
        touch_id = id
        touch_start = p
        joy_origin = p
        joy_knob = Vector2.ZERO
        movement = Vector2.ZERO


func _drag(p: Vector2) -> void:
    var vector: Vector2 = p - touch_start
    if vector.length() < 10.0:
        movement = Vector2.ZERO
        joy_knob = Vector2.ZERO
        return
    movement = vector.normalized() * minf(1.0, (vector.length() - 10.0) / 50.0)
    joy_knob = vector.normalized() * minf(56.0, vector.length() - 10.0)


func _touch_up(id: int) -> void:
    if id == touch_id:
        touch_id = -1
        movement = Vector2.ZERO
        joy_knob = Vector2.ZERO


func _draw() -> void:
    var draw_begin: int = Time.get_ticks_usec()
    var s: Vector2 = get_viewport_rect().size
    if phase != 0:
        _draw_enemies(s)
        _draw_player()
        _draw_numbers()
        _draw_exit()
        _draw_hud(s)
    if phase == 0:
        _draw_intro(s)
    elif phase == 2:
        _draw_result(s)
    if log_open:
        _draw_log(s)
    var duration: int = Time.get_ticks_usec() - draw_begin
    draw_us += duration
    draw_count += 1
    draw_peak = maxi(draw_peak, duration)


func _text(words: String, at: Vector2, size: int = 16, color: Color = TEXT, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> void:
    draw_string(font, at, words, align, -1, size, color)


func _bar(at: Vector2, dimensions: Vector2, fraction: float, color: Color) -> void:
    draw_rect(Rect2(at, dimensions), Color("#10121a"))
    draw_rect(Rect2(at + Vector2(2, 2), Vector2(maxf(0, dimensions.x - 4) * clampf(fraction, 0, 1), dimensions.y - 4)), color)
    draw_rect(Rect2(at, dimensions), GOLD, false, 1.0)


func _figure(p: Vector2, color: Color, mage: bool, size: float) -> void:
    draw_circle(p + Vector2(5, 13) * size, 21 * size, Color(0, 0, 0, 0.38))
    if mage:
        var hood := PackedVector2Array([p + Vector2(-17, 15) * size, p + Vector2(-17, -15) * size,
            p + Vector2(0, -34) * size, p + Vector2(17, -15) * size, p + Vector2(17, 15) * size])
        draw_colored_polygon(hood, color.darkened(0.42))
        draw_circle(p + Vector2(0, -14) * size, 12 * size, color)
        draw_line(p + Vector2(20, 4) * size, p + Vector2(22, -28) * size, GOLD, 4.0 * size)
    else:
        var shoulders := PackedVector2Array([p + Vector2(-25, 18) * size, p + Vector2(-12, -13) * size,
            p + Vector2(12, -13) * size, p + Vector2(25, 18) * size])
        draw_colored_polygon(shoulders, color.darkened(0.48))
        draw_rect(Rect2(p + Vector2(-13, -12) * size, Vector2(26, 31) * size), color.darkened(0.16))
        draw_circle(p + Vector2(0, -23) * size, 13.0 * size, Color("#847669"))
        draw_line(p + Vector2(20, 5) * size, p + Vector2(31, -22) * size, GOLD, 4.0 * size)


func _draw_enemies(s: Vector2) -> void:
    for e in enemies:
        var p: Vector2 = _screen(e["pos"])
        if p.x < -150 or p.x > s.x + 150 or p.y < -150 or p.y > s.y + 150:
            continue
        var boss: bool = bool(e["boss"])
        var kind: String = str(e["kind"])
        var hue: Color = Color("#a26d60") if boss else (Color("#a36b99") if kind == "HEXER" else Color("#687079"))
        _figure(p, hue, kind == "HEXER", 1.9 if boss else 0.96)
        _bar(p + Vector2(-45, -62) * (1.6 if boss else 1.0),
            Vector2(136, 10) if boss else Vector2(90, 7),
            float(e["hp"]) / float(e["max_hp"]), BLOOD)
        if float(e["windup"]) > 0.0:
            var attack_kind: String = str(e["attack"])
            var center: Vector2 = _screen(e["aim"]) if attack_kind == "HEX" else p
            var radius: float = 160.0 if attack_kind == "PULSE" else (77.0 if attack_kind == "HEX" else 61.0)
            draw_circle(center, radius, Color("#9d263b", 0.12))
            draw_arc(center, radius, 0, TAU, 42, Color("#ed6d77", 0.9), 3.0)
            draw_arc(center, radius * clampf(float(e["windup"]), 0.05, 1.0), 0, TAU, 40, GOLD, 2.0)


func _draw_player() -> void:
    var center: Vector2 = _hero_screen()
    _figure(center, CLASSES[class_id]["color"], class_id == 1, 1.06)
    draw_line(center + heading * 26.0, center + heading * 43.0, GOLD, 3.0)
    if shield_timer > 0.0:
        draw_arc(center, 51.0, 0, TAU, 48, Color("#8ab9dd"), 4.0)
    if invincible > 0.0:
        draw_arc(center, 39.0, 0, TAU, 48, BLOOD, 2.0)


func _draw_numbers() -> void:
    for n in numbers:
        var p: Vector2 = _screen(n["pos"])
        p.y -= (0.7 - float(n["life"])) * 45.0
        if p.x > -50 and p.x < 590 and p.y > -50 and p.y < 950:
            _text(str(n["value"]), p, 20, n["color"], HORIZONTAL_ALIGNMENT_CENTER)


func _draw_exit() -> void:
    if not boss_dead:
        return
    var at: Vector2 = _screen(exit_at)
    draw_circle(at, 80.0, Color("#ae334e", 0.22))
    draw_arc(at, 67.0, 0, TAU, 56, Color("#f65874"), 5.0)
    _text("ENTER RIFT", at + Vector2(0, -92), 15, GOLD, HORIZONTAL_ALIGNMENT_CENTER)


func _draw_hud(s: Vector2) -> void:
    draw_rect(Rect2(0, 0, s.x, 83), Color("#0e1219", 0.95))
    draw_line(Vector2(0, 83), Vector2(s.x, 83), GOLD, 2.0)
    _text("BACK", Vector2(16, 31), 15, GOLD)
    _text("THE HOLLOW CRYPT", Vector2(s.x * 0.5, 29), 19, TEXT, HORIZONTAL_ALIGNMENT_CENTER)
    _text("SEED %d" % seed_value, Vector2(s.x * 0.5, 53), 12, MUTED, HORIZONTAL_ALIGNMENT_CENTER)
    _text("LOG", Vector2(s.x - 55, 31), 15, GOLD)
    _text("%d FPS" % fps, Vector2(s.x - 72, 57), 13, MUTED)
    draw_rect(Rect2(9, 92, s.x - 18, 70), Color("#131924", 0.84))
    var mission: String = "ENTER THE FINAL CHAMBER" if not boss_dead else "THE RIFT IS OPEN. STEP INTO IT."
    _text("GODWOUND / SOLO", Vector2(20, 115), 13, GOLD)
    _text(mission, Vector2(20, 139), 15, TEXT)
    _text("%d/9 ROOMS" % room_visited.size(), Vector2(s.x - 111, 115), 12, MUTED)
    var bottom: float = s.y - 246.0
    draw_rect(Rect2(0, bottom, s.x, 246), Color("#0b101a", 0.95))
    draw_line(Vector2(0, bottom), Vector2(s.x, bottom), GOLD, 2.0)
    _text("LV %d    KILLS %d    %.0fs" % [level, kills, elapsed], Vector2(20, bottom + 24), 15, GOLD)
    _bar(Vector2(20, bottom + 32), Vector2(s.x - 40, 9), float(xp) / float(65 + level * 42), Color("#7aa3cb"))
    var globe: Vector2 = Vector2(s.x * 0.5, s.y - 100)
    draw_circle(globe, 71.0, Color("#101016"))
    draw_circle(globe, 66.0, Color("#8b6745"))
    draw_circle(globe, 61.0, Color("#202532"))
    for y in range(-53, 54, 4):
        var extent: float = sqrt(maxf(0.0, 54.0 * 54.0 - float(y * y)))
        var red: Color = Color("#b74d58") if float(y) > 54.0 - 108.0 * hp / max_hp else Color("#3b2633")
        var blue: Color = (SORCERER if class_id == 1 else GOLD) if float(y) > 54.0 - 108.0 * energy / 100.0 else Color("#343241")
        draw_rect(Rect2(globe + Vector2(-extent, y), Vector2(extent - 2.0, 4)), red)
        draw_rect(Rect2(globe + Vector2(2, y), Vector2(extent - 2.0, 4)), blue)
    draw_line(globe + Vector2(0, -58), globe + Vector2(0, 58), GOLD, 2)
    draw_arc(globe, 67, 0, TAU, 50, GOLD, 4)
    _text("%d" % int(hp), globe + Vector2(-39, 9), 19)
    _text("%d" % int(energy), globe + Vector2(16, 9), 19)
    var stick: Vector2 = joy_origin if touch_id >= 0 else Vector2(s.x - 88.0, s.y - 96.0)
    draw_arc(stick, 57 if touch_id >= 0 else 43, 0, TAU, 42, Color("#8694a1", 0.63), 2)
    if touch_id >= 0:
        draw_circle(stick + joy_knob, 23.0, Color("#a7a1a1", 0.9))
    else:
        _text("MOVE", stick + Vector2(-21, 4), 13, MUTED)
    for i in range(3):
        var p: Vector2 = _spell_at(i)
        var ready: bool = skills_cd[i] <= 0.0
        draw_circle(p, 37.0, Color("#413840") if ready else Color("#282933"))
        draw_arc(p, 38, 0, TAU, 45, GOLD if ready else MUTED, 3)
        _text(str(i + 1) if ready else str(int(ceil(skills_cd[i]))), p + Vector2(-7, 7), 22)
        _text(str(CLASSES[class_id]["skills"][i]), p + Vector2(-48, -44), 10, GOLD)
    if notice_timer > 0.0:
        _text(notice, Vector2(s.x * 0.5, bottom - 24), 16, GOLD, HORIZONTAL_ALIGNMENT_CENTER)


func _draw_intro(s: Vector2) -> void:
    draw_rect(Rect2(Vector2.ZERO, s), Color("#080d15", 0.96))
    _text("GODSCAR", Vector2(s.x * 0.5, s.y * 0.14), 39, GOLD, HORIZONTAL_ALIGNMENT_CENTER)
    _text("THE HOLLOW CRYPT", Vector2(s.x * 0.5, s.y * 0.20), 24, TEXT, HORIZONTAL_ALIGNMENT_CENTER)
    _text("YOUR FIRST GODWOUND", Vector2(s.x * 0.5, s.y * 0.26), 15, MUTED, HORIZONTAL_ALIGNMENT_CENTER)
    _text("9 rooms. Random layout. One boss.", Vector2(s.x * 0.5, s.y * 0.31), 16, TEXT, HORIZONTAL_ALIGNMENT_CENTER)
    for i in range(2):
        var y: float = s.y * (0.37 if i == 0 else 0.52)
        var rect := Rect2(26, y, s.x - 52, s.y * 0.13)
        draw_rect(rect, Color("#292c35"))
        draw_rect(rect, WARRIOR if i == 0 else SORCERER, false, 3)
        _text("ENTER AS WARRIOR" if i == 0 else "ENTER AS SORCERER", Vector2(s.x * 0.5, y + 53), 22, TEXT, HORIZONTAL_ALIGNMENT_CENTER)
        _text("MELEE / SHIELD / CLEAVE" if i == 0 else "RANGED / BLINK / MAGIC",
            Vector2(s.x * 0.5, y + 88), 14, MUTED, HORIZONTAL_ALIGNMENT_CENTER)
    _text("MANUAL MOVE  /  3 ACTIVE SPELLS", Vector2(s.x * 0.5, s.y * 0.78), 16, GOLD, HORIZONTAL_ALIGNMENT_CENTER)
    _text("A15 PERFORMANCE TEST ENABLED", Vector2(s.x * 0.5, s.y * 0.83), 14, MUTED, HORIZONTAL_ALIGNMENT_CENTER)
    _text("BACK", Vector2(18, 38), 17, GOLD)


func _draw_result(s: Vector2) -> void:
    draw_rect(Rect2(Vector2.ZERO, s), Color("#070b12", 0.91))
    _text("GODWOUND CLEARED" if won else "THE SCAR CLAIMS YOU",
        Vector2(s.x * 0.5, s.y * 0.28), 29, GOLD if won else BLOOD, HORIZONTAL_ALIGNMENT_CENTER)
    _text("SEED %d  |  %d ROOMS FOUND" % [seed_value, room_visited.size()],
        Vector2(s.x * 0.5, s.y * 0.36), 15, MUTED, HORIZONTAL_ALIGNMENT_CENTER)
    _text("%d KILLS  /  %.0f SECONDS" % [kills, elapsed],
        Vector2(s.x * 0.5, s.y * 0.42), 20, TEXT, HORIZONTAL_ALIGNMENT_CENTER)
    draw_rect(Rect2(25, s.y * 0.55, s.x - 50, s.y * 0.145), Color("#3d3a32"))
    draw_rect(Rect2(25, s.y * 0.55, s.x - 50, s.y * 0.145), GOLD, false, 3)
    _text("NEW RANDOM RUN", Vector2(s.x * 0.5, s.y * 0.63), 23, TEXT, HORIZONTAL_ALIGNMENT_CENTER)
    _text("RETURN TO FALLFIELDS", Vector2(s.x * 0.5, s.y * 0.80), 17, GOLD, HORIZONTAL_ALIGNMENT_CENTER)
    _text("Prototype: loot and persistence not yet implemented", Vector2(s.x * 0.5, s.y * 0.89), 12, MUTED, HORIZONTAL_ALIGNMENT_CENTER)


func _draw_log(s: Vector2) -> void:
    draw_rect(Rect2(Vector2.ZERO, s), Color("#090e17", 0.96))
    _text("CRYPT PERFORMANCE / ANDROID", Vector2(s.x * 0.5, s.y * 0.28), 22, GOLD, HORIZONTAL_ALIGNMENT_CENTER)
    _text("FPS %d   ENEMIES %d    PROPS %d" % [fps, enemies.size(), world.placed_props],
        Vector2(s.x * 0.5, s.y * 0.33), 17, TEXT, HORIZONTAL_ALIGNMENT_CENTER)
    _text("SEED %d   ROOMS %d   KILLS %d" % [seed_value, room_visited.size(), kills],
        Vector2(s.x * 0.5, s.y * 0.37), 16, TEXT, HORIZONTAL_ALIGNMENT_CENTER)
    draw_rect(Rect2(30, s.y * 0.39, s.x - 60, s.y * 0.09), Color("#393842"))
    _text("COPY PERFORMANCE LOG", Vector2(s.x * 0.5, s.y * 0.445), 19, GOLD, HORIZONTAL_ALIGNMENT_CENTER)
    _text(log_status, Vector2(s.x * 0.5, s.y * 0.49), 14, GOLD, HORIZONTAL_ALIGNMENT_CENTER)
    draw_rect(Rect2(30, s.y * 0.51, s.x - 60, s.y * 0.09), Color("#393842"))
    _text("RESUME DUNGEON", Vector2(s.x * 0.5, s.y * 0.565), 19, TEXT, HORIZONTAL_ALIGNMENT_CENTER)
