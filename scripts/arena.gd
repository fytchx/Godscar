extends Node2D
## GODSCAR 0.3 | One-thumb: drag anywhere below center, release active, double-tap ultimate.
## All pixel shapes are temporary. 60 Hz fixed physics; rendering is independent.
## Five prototype class identities, 3 experimental combat stances per class.

const MOVE_SPEED: float = 226.0
const WORLD_TILE: float = 64.0
const MAX_ENEMIES: int = 21
const C_BG = Color("0b0c13")
const C_PANEL = Color("111520")
const C_GOLD = Color("d3a95e")
const C_TEXT = Color("f2e8d4")
const C_MUTED = Color("a49eaa")
const C_BLOOD = Color("af3549")
const C_RAGE = Color("e7a24d")
const C_ASH = Color("a08aca")

const CLASSES = [
    {"name": "WARRIOR", "resource": "RAGE", "active": "SHOCKWAVE", "ultimate": "RUINBREAKER", "passive": "BLOODRUSH", "color": Color("dc9558")},
    {"name": "PALADIN", "resource": "ZEAL", "active": "JUDGEMENT", "ultimate": "DIVINE VERDICT", "passive": "VOW OF LIFE", "color": Color("f0d48d")},
    {"name": "SORCERER", "resource": "MANA", "active": "ARC NOVA", "ultimate": "CATACLYSM", "passive": "ARCANE ECHO", "color": Color("839ded")},
    {"name": "HUNTER", "resource": "FOCUS", "active": "ARROWSTORM", "ultimate": "WILD HUNT", "passive": "KEEN EYE", "color": Color("9cc67e")},
    {"name": "ROGUE", "resource": "ENERGY", "active": "SHADOWSTEP", "ultimate": "NIGHTFALL", "passive": "BLOODLETTER", "color": Color("c29adf")}
]
const SPECS = [
    ["BERSERKER", "JUGGERNAUT", "WARLORD"],
    ["TEMPLAR", "INQUISITOR", "MARTYR"],
    ["STORMCALLER", "PYROMANCER", "ARCANIST"],
    ["DEADEYE", "BEASTMASTER", "TRAPPER"],
    ["ASSASSIN", "SHADOW", "TRICKSTER"]
]

var hero: Vector2 = Vector2.ZERO
var move_direction: Vector2 = Vector2.ZERO
var last_facing: Vector2 = Vector2.RIGHT
var class_index: int = 0
var spec_index: int = 0
var hp: float = 120.0
var max_hp: float = 120.0
var resource: float = 60.0
var level: int = 1
var xp: int = 0
var kills: int = 0
var deaths: int = 0
var attacks: int = 0
var wave_timer: float = 0.0
var attack_timer: float = 0.0
var passive_timer: float = 0.0
var visual_timer: float = 0.0
var active_timer: float = 0.0
var active_cooldown: float = 0.0
var ultimate_cooldown: float = 0.0
var ultimate_visual_timer: float = 0.0
var ability_notice: String = ""
var ability_notice_timer: float = 0.0
var respawn_notice: float = 0.0
var hit_location: Vector2 = Vector2.ZERO
var enemies: Array[Dictionary] = []
var damage_numbers: Array[Dictionary] = []
var factions: Array[Dictionary] = [
    {"name": "ASHEN ORDER", "xp": 0, "level": 1},
    {"name": "BONE SYNDICATE", "xp": 0, "level": 1},
    {"name": "CINDER COURT", "xp": 0, "level": 1}
]
var faction_index: int = 0
var floating_joystick: bool = false
var menu_open: bool = false
var touch_id: int = -1
var joystick_origin: Vector2 = Vector2.ZERO
var joystick_knob: Vector2 = Vector2.ZERO
var joystick_start: Vector2 = Vector2.ZERO
var gesture_drag: float = 0.0
var touch_started_ms: int = 0
var last_tap_ms: int = -9999
var last_tap_at: Vector2 = Vector2(-999.0, -999.0)
var rng := RandomNumberGenerator.new()
var font: Font
var settings := ConfigFile.new()


func _ready() -> void:
    rng.randomize()
    font = ThemeDB.fallback_font
    if settings.load("user://godscar_settings.cfg") == OK:
        floating_joystick = bool(settings.get_value("controls", "floating", false))
        class_index = clampi(int(settings.get_value("character", "class", 0)), 0, 4)
        spec_index = clampi(int(settings.get_value("character", "spec", 0)), 0, 2)
        faction_index = clampi(int(settings.get_value("character", "faction", 0)), 0, 2)
    _set_class(class_index, spec_index)
    for i in range(9):
        _spawn_enemy()
    queue_redraw()


func _save_settings() -> void:
    settings.set_value("controls", "floating", floating_joystick)
    settings.set_value("character", "class", class_index)
    settings.set_value("character", "spec", spec_index)
    settings.set_value("character", "faction", faction_index)
    settings.save("user://godscar_settings.cfg")


func _set_class(next_class: int, next_spec: int) -> void:
    class_index = clampi(next_class, 0, CLASSES.size() - 1)
    spec_index = clampi(next_spec, 0, 2)
    max_hp = 120.0 + float(level - 1) * 9.0
    if class_index == 1:
        max_hp *= 1.12
    if class_index == 0 and spec_index == 1:
        max_hp *= 1.45
    if class_index == 4:
        max_hp *= 0.85
    hp = max_hp
    resource = 50.0 if class_index == 0 else 100.0
    attacks = 0
    attack_timer = 0.0
    passive_timer = 0.0
    active_cooldown = 0.0
    ultimate_cooldown = 0.0
    ability_notice = ""
    ability_notice_timer = 0.0
    move_direction = Vector2.ZERO
    touch_id = -1
    joystick_knob = Vector2.ZERO
    last_tap_ms = -9999


func _physics_process(delta: float) -> void:
    if menu_open:
        queue_redraw()
        return

    hero += move_direction * MOVE_SPEED * delta
    hero = hero.clamp(Vector2(-2400, -2400), Vector2(2400, 2400))
    if move_direction.length_squared() > 0.01:
        last_facing = move_direction.normalized()

    attack_timer = maxf(0.0, attack_timer - delta)
    passive_timer = maxf(0.0, passive_timer - delta)
    visual_timer = maxf(0.0, visual_timer - delta)
    active_timer = maxf(0.0, active_timer - delta)
    active_cooldown = maxf(0.0, active_cooldown - delta)
    ultimate_cooldown = maxf(0.0, ultimate_cooldown - delta)
    ultimate_visual_timer = maxf(0.0, ultimate_visual_timer - delta)
    ability_notice_timer = maxf(0.0, ability_notice_timer - delta)
    respawn_notice = maxf(0.0, respawn_notice - delta)
    var regen: float = 1.2 if class_index == 0 else 4.0
    if class_index == 2:
        regen = 5.0 if spec_index != 2 else 8.0
    if class_index == 4:
        regen = 9.0
    resource = minf(100.0, resource + regen * delta)

    for i in range(damage_numbers.size() - 1, -1, -1):
        damage_numbers[i]["time"] = float(damage_numbers[i]["time"]) - delta
        if float(damage_numbers[i]["time"]) <= 0.0:
            damage_numbers.remove_at(i)

    for e in enemies:
        var ep: Vector2 = e["pos"]
        var diff: Vector2 = hero - ep
        var dist: float = diff.length()
        var speed: float = float(e["speed"])
        if float(e["slow"]) > 0.0:
            e["slow"] = maxf(0.0, float(e["slow"]) - delta)
            speed *= 0.48
        if float(e["windup"]) > 0.0:
            e["windup"] = maxf(0.0, float(e["windup"]) - delta)
            if float(e["windup"]) == 0.0:
                if hero.distance_to(e["pos"]) < 57.0:
                    _take_damage(float(e["damage"]))
                e["attack_cd"] = 1.25
        else:
            if dist > 41.0:
                e["pos"] = ep + diff.normalized() * speed * delta
            e["attack_cd"] = float(e["attack_cd"]) - delta
            if dist < 57.0 and float(e["attack_cd"]) <= 0.0:
                e["windup"] = 0.39 if bool(e["brute"]) else 0.28

    if attack_timer <= 0.0:
        _auto_attack()

    wave_timer -= delta
    if wave_timer <= 0.0 and enemies.size() < MAX_ENEMIES:
        _spawn_enemy()
        wave_timer = 0.55
    queue_redraw()


func _spawn_enemy() -> void:
    var angle: float = rng.randf_range(0.0, TAU)
    var distance: float = rng.randf_range(310.0, 505.0)
    var brute: bool = rng.randf() < 0.23
    var health: float = 73.0 if brute else 37.0
    enemies.append({
        "pos": hero + Vector2.RIGHT.rotated(angle) * distance,
        "hp": health, "max_hp": health,
        "speed": rng.randf_range(58.0, 79.0) if brute else rng.randf_range(86.0, 110.0),
        "damage": 11.0 if brute else 5.0,
        "attack_cd": rng.randf_range(0.8, 1.6), "windup": 0.0,
        "slow": 0.0, "brute": brute
    })


func _attack_range() -> float:
    match class_index:
        0: return 158.0 if spec_index != 2 else 190.0
        1: return 171.0 if spec_index != 1 else 225.0
        2: return 310.0
        3: return 315.0 if spec_index != 0 else 370.0
        _: return 153.0


func _attack_speed() -> float:
    var interval: float = [0.56, 0.68, 0.67, 0.50, 0.37][class_index]
    if class_index == 0 and spec_index == 0:
        interval *= 0.82
    if class_index == 4 and spec_index == 2:
        interval *= 0.82
    if class_index == 0 and passive_timer > 0.0:
        interval *= 0.70
    return interval


func _find_target(max_range: float) -> int:
    var target: int = -1
    var closest: float = max_range * max_range
    for i in range(enemies.size()):
        var p: Vector2 = enemies[i]["pos"]
        var distance: float = hero.distance_squared_to(p)
        if distance < closest:
            closest = distance
            target = i
    return target


func _damage_enemy(index: int, amount: float, color: Color) -> void:
    if index < 0 or index >= enemies.size():
        return
    var e: Dictionary = enemies[index]
    e["hp"] = float(e["hp"]) - amount
    damage_numbers.append({"pos": e["pos"], "amount": int(round(amount)), "time": 0.58, "color": color})
    if damage_numbers.size() > 35:
        damage_numbers.remove_at(0)
    if float(e["hp"]) <= 0.0:
        _defeat_enemy(index)


func _area_attack(location: Vector2, radius: float, amount: float) -> void:
    var color: Color = CLASSES[class_index]["color"]
    for i in range(enemies.size() - 1, -1, -1):
        var ep: Vector2 = enemies[i]["pos"]
        if location.distance_to(ep) <= radius:
            _damage_enemy(i, amount, color)


func _auto_attack() -> void:
    var target_index: int = _find_target(_attack_range())
    if target_index < 0:
        return
    var target: Vector2 = enemies[target_index]["pos"]
    var stationary: bool = move_direction.length_squared() < 0.01
    var damage: float = 18.0 + float(level) * 2.0
    if stationary:
        damage *= 1.25
    attacks += 1
    if class_index == 0:
        damage *= 1.12
        if spec_index == 0 and hp < max_hp * 0.50:
            damage *= 1.60
    elif class_index == 1:
        damage *= 0.95
        if attacks % 4 == 0:
            hp = minf(max_hp, hp + (18.0 if spec_index == 0 else 10.0))
    elif class_index == 2:
        if spec_index == 2 and attacks % 4 == 0:
            damage *= 1.90
    elif class_index == 3:
        if spec_index == 0 and stationary:
            damage *= 1.55
    elif class_index == 4:
        if spec_index == 0 and hp < max_hp * 0.60:
            damage *= 1.80
        if move_direction.length_squared() > 0.02:
            damage *= 1.10

    hit_location = target
    visual_timer = 0.15
    _damage_enemy(target_index, damage, CLASSES[class_index]["color"])
    resource = minf(100.0, resource + (7.0 if class_index == 0 else 2.0))

    # These are early specialization *mechanical previews*, not finished trees.
    if class_index == 0 and spec_index == 1:
        _area_attack(target, 76.0, damage * 0.36)  # Juggernaut cleave
    if class_index == 1 and spec_index == 1:
        _area_attack(target, 65.0, damage * 0.32)  # Inquisitor radiance
    if class_index == 2 and spec_index == 0:
        _area_attack(target, 118.0, damage * 0.30) # Stormcaller chain preview
    if class_index == 2 and spec_index == 1:
        _area_attack(target, 92.0, damage * 0.48)  # Pyromancer explosion
    if class_index == 3 and spec_index == 1 and attacks % 3 == 0:
        _area_attack(target, 83.0, damage * 0.65)  # Beast companion preview
    if class_index == 3 and spec_index == 2:
        for e in enemies:
            if target.distance_to(e["pos"]) < 78.0:
                e["slow"] = 1.1                   # Trapper snare
    if class_index == 4 and spec_index == 2:
        _area_attack(target, 62.0, damage * 0.27)  # Trickster split strike
    attack_timer = _attack_speed()


func _defeat_enemy(index: int) -> void:
    enemies.remove_at(index)
    kills += 1
    xp += 17
    var faction: Dictionary = factions[faction_index]
    faction["xp"] = int(faction["xp"]) + 8
    if int(faction["xp"]) >= 100:
        faction["xp"] = int(faction["xp"]) - 100
        faction["level"] = int(faction["level"]) + 1
    if class_index == 0 and kills % 5 == 0:
        passive_timer = 5.0
    var threshold: int = 100 + (level - 1) * 55
    if xp >= threshold:
        xp -= threshold
        level += 1
        _update_max_hp_on_level()


func _update_max_hp_on_level() -> void:
    max_hp += 9.0
    hp = max_hp


func _take_damage(amount: float) -> void:
    if class_index == 1 and spec_index == 2:
        amount *= 0.72  # Martyr prototype: withstand hits, return damage
        _area_attack(hero, 94.0, 7.0 + level * 1.5)
    if class_index == 4 and spec_index == 1 and rng.randf() < 0.28:
        return  # Shadow prototype: evade
    hp = maxf(0.0, hp - amount)
    if hp <= 0.0:
        deaths += 1
        hp = max_hp
        resource = 50.0
        hero = Vector2.ZERO
        enemies.clear()
        damage_numbers.clear()
        for i in range(7):
            _spawn_enemy()
        respawn_notice = 2.1


func _show_ability_notice(value: String) -> void:
    ability_notice = value
    ability_notice_timer = 0.85


func _activate() -> void:
    # Active skill: cast when the movement finger RELEASES, not on a button press.
    if menu_open:
        return
    if active_cooldown > 0.0:
        _show_ability_notice("ACTIVE RECHARGING")
        return
    if resource < 40.0:
        _show_ability_notice("NOT ENOUGH " + str(CLASSES[class_index]["resource"]))
        return
    resource -= 40.0
    active_cooldown = 0.85
    active_timer = 0.44
    _show_ability_notice(str(CLASSES[class_index]["active"]))
    match class_index:
        0:
            _area_attack(hero, 189.0 if spec_index != 2 else 255.0, 40.0 + level * 5.0)
        1:
            hp = minf(max_hp, hp + (27.0 if spec_index != 0 else 48.0))
            _area_attack(hero, 183.0, 28.0 + level * 4.0)
        2:
            _area_attack(hero, 230.0, 43.0 + level * 5.0)
        3:
            var target: int = _find_target(365.0)
            var impact: Vector2 = enemies[target]["pos"] if target >= 0 else hero + last_facing * 165.0
            _area_attack(impact, 143.0, 40.0 + level * 4.0)
        4:
            var target: int = _find_target(375.0)
            var destination: Vector2 = enemies[target]["pos"] if target >= 0 else hero + last_facing * 115.0
            hero = destination - last_facing * 48.0
            hero = hero.clamp(Vector2(-2400.0, -2400.0), Vector2(2400.0, 2400.0))
            _area_attack(destination, 103.0, 52.0 + level * 5.0)


func _cast_ultimate() -> void:
    # Ultimate: dedicated button or quick double tap; separate from release skill.
    if menu_open:
        return
    if ultimate_cooldown > 0.0:
        _show_ability_notice("ULT READY IN " + str(int(ceil(ultimate_cooldown))) + "s")
        return
    ultimate_cooldown = 18.0
    ultimate_visual_timer = 0.75
    _show_ability_notice(str(CLASSES[class_index]["ultimate"]))
    match class_index:
        0: # Warrior: giant impact; restores some health.
            _area_attack(hero, 315.0, 115.0 + level * 11.0)
            hp = minf(max_hp, hp + 20.0)
        1: # Paladin: divine punishment and a self-heal.
            _area_attack(hero, 335.0, 95.0 + level * 10.0)
            hp = minf(max_hp, hp + max_hp * 0.32)
        2: # Sorcerer: freezing magical catastrophe.
            for enemy in enemies:
                enemy["slow"] = 3.7
            _area_attack(hero, 395.0, 110.0 + level * 12.0)
        3: # Hunter: immense arrow barrage.
            _area_attack(hero, 430.0, 105.0 + level * 12.0)
        4: # Rogue: blink in, detonate around the target.
            var target: int = _find_target(450.0)
            var impact: Vector2 = enemies[target]["pos"] if target >= 0 else hero + last_facing * 140.0
            hero = (impact - last_facing * 54.0).clamp(Vector2(-2400.0, -2400.0), Vector2(2400.0, 2400.0))
            _area_attack(impact, 240.0, 140.0 + level * 12.0)


func _center() -> Vector2:
    var s: Vector2 = get_viewport_rect().size
    return Vector2(s.x * 0.5, (s.y - 247.0) * 0.48 + 45.0)


func _joy_center() -> Vector2:
    var s: Vector2 = get_viewport_rect().size
    return Vector2(95.0, s.y - 91.0)


func _skill_center() -> Vector2:
    var s: Vector2 = get_viewport_rect().size
    return Vector2(s.x - 95.0, s.y - 91.0)


func _input(event: InputEvent) -> void:
    if event is InputEventScreenTouch:
        if event.pressed:
            _touch_down(event.position, event.index)
        else:
            _touch_up(event.index, event.position, event.canceled)
    elif event is InputEventScreenDrag:
        if event.index == touch_id:
            _touch_drag(event.position)
    elif event is InputEventMouseButton and not OS.has_feature("mobile"):
        if event.button_index == MOUSE_BUTTON_LEFT:
            if event.pressed:
                _touch_down(event.position, 0)
            else:
                _touch_up(0, event.position)
    elif event is InputEventMouseMotion and not OS.has_feature("mobile"):
        if touch_id == 0:
            _touch_drag(event.position)


func _is_faction_label(p: Vector2) -> bool:
    var s: Vector2 = get_viewport_rect().size
    return p.y >= s.y - 206.0 and p.y <= s.y - 175.0


func _touch_down(p: Vector2, id: int) -> void:
    var s: Vector2 = get_viewport_rect().size
    if menu_open:
        _handle_menu_touch(p)
        return
    if p.y < 86.0:
        if p.x < s.x * 0.69:
            menu_open = true
            move_direction = Vector2.ZERO
            touch_id = -1
        else:
            floating_joystick = not floating_joystick
            move_direction = Vector2.ZERO
            touch_id = -1
            joystick_knob = Vector2.ZERO
            _save_settings()
        last_tap_ms = -9999
        return
    # One dedicated ultimate button is the ONLY exclusion in the lower control half.
    if p.distance_to(_skill_center()) < 69.0:
        _cast_ultimate()
        last_tap_ms = -9999
        return
    if p.y < s.y * 0.5 or touch_id >= 0:
        return

    var now_ms: int = Time.get_ticks_msec()
    # Quick consecutive taps close together cast ULT, without accidentally
    # starting a movement gesture or casting a second active skill.
    if now_ms - last_tap_ms < 300 and p.distance_to(last_tap_at) < 80.0:
        last_tap_ms = -9999
        _cast_ultimate()
        return

    touch_id = id
    touch_started_ms = now_ms
    gesture_drag = 0.0
    joystick_start = p
    joystick_origin = p if floating_joystick else _joy_center()
    joystick_knob = Vector2.ZERO
    move_direction = Vector2.ZERO


func _touch_drag(p: Vector2) -> void:
    # The input origin is ALWAYS where this touch began. In fixed mode the
    # visual joystick stays in the lower-left, but input works anywhere.
    var offset: Vector2 = p - joystick_start
    gesture_drag = maxf(gesture_drag, offset.length())
    var deadzone: float = 7.0
    if offset.length() <= deadzone:
        joystick_knob = Vector2.ZERO
        move_direction = Vector2.ZERO
        return
    var travel: Vector2 = offset.normalized() * minf(58.0, offset.length() - deadzone)
    joystick_knob = travel
    move_direction = travel / 58.0


func _touch_up(id: int, p: Vector2, canceled: bool = false) -> void:
    if touch_id != id:
        return
    var held_ms: int = Time.get_ticks_msec() - touch_started_ms
    gesture_drag = maxf(gesture_drag, p.distance_to(joystick_start))
    var clean_tap: bool = gesture_drag < 17.0 and held_ms < 235
    var touched_faction_label: bool = clean_tap and _is_faction_label(joystick_start)
    touch_id = -1
    move_direction = Vector2.ZERO
    joystick_knob = Vector2.ZERO
    if canceled or menu_open:
        last_tap_ms = -9999
        return
    # Simple tap on the reputation LABEL switches faction as in 0.2;
    # dragging over it remains a normal movement gesture.
    if touched_faction_label:
        faction_index = (faction_index + 1) % factions.size()
        _save_settings()
        last_tap_ms = -9999
        return
    if clean_tap:
        last_tap_ms = Time.get_ticks_msec()
        last_tap_at = joystick_start
    else:
        last_tap_ms = -9999
    # Exactly one active cast on release, even after dragging for a long time.
    _activate()


func _handle_menu_touch(p: Vector2) -> void:
    var s: Vector2 = get_viewport_rect().size
    if p.y < 141.0 or p.y > s.y - 100.0:
        menu_open = false
        return
    var top: float = 205.0
    if p.y >= top and p.y < top + 5.0 * 65.0:
        var next_class: int = int((p.y - top) / 65.0)
        _set_class(next_class, 0)
        _save_settings()
        return
    var spec_top: float = top + 5.0 * 65.0 + 56.0
    if p.y >= spec_top and p.y < spec_top + 78.0:
        var selected: int = int(p.x / (s.x / 3.0))
        _set_class(class_index, clampi(selected, 0, 2))
        _save_settings()
        return


func _draw() -> void:
    var s: Vector2 = get_viewport_rect().size
    draw_rect(Rect2(Vector2.ZERO, s), C_BG)
    _draw_world(s)
    _draw_enemies(s)
    _draw_hero()
    _draw_damage_numbers()
    _draw_hud(s)
    if menu_open:
        _draw_menu(s)


func _draw_world(s: Vector2) -> void:
    var cam: Vector2 = _center()
    var start_x: int = int(floor((hero.x - cam.x) / WORLD_TILE)) - 1
    var start_y: int = int(floor((hero.y - cam.y) / WORLD_TILE)) - 1
    var cols: int = int(ceil(s.x / WORLD_TILE)) + 3
    var rows: int = int(ceil(s.y / WORLD_TILE)) + 3
    for y in range(start_y, start_y + rows):
        for x in range(start_x, start_x + cols):
            var location: Vector2 = Vector2(x * WORLD_TILE, y * WORLD_TILE) - hero + cam
            var checker: bool = (x + y) % 2 == 0
            draw_rect(Rect2(location, Vector2.ONE * WORLD_TILE), Color("191b25") if checker else Color("1e202a"))
            draw_rect(Rect2(location + Vector2(2.0, 2.0), Vector2(60.0, 60.0)), Color("30303a", 0.52), false, 1.0)
            if posmod(x * 17 + y * 29, 13) == 0:
                draw_rect(Rect2(location + Vector2(11, 18), Vector2(24, 3)), Color("403239"))
                draw_rect(Rect2(location + Vector2(32, 20), Vector2(3, 12)), Color("403239"))
            if posmod(x * 11 + y * 7, 31) == 0:
                draw_circle(location + Vector2(46.0, 46.0), 10.0, Color("281e2c"))
                draw_circle(location + Vector2(46.0, 46.0), 4.0, Color("5a3441"))


func _draw_enemies(s: Vector2) -> void:
    for e in enemies:
        var ep: Vector2 = e["pos"]
        var p: Vector2 = ep - hero + _center()
        if p.x < -45 or p.x > s.x + 45 or p.y < -50 or p.y > s.y + 50:
            continue
        var brute: bool = e["brute"]
        var half: float = 20.0 if brute else 14.0
        draw_circle(p + Vector2(0.0, 17.0), half + 5.0, Color(0, 0, 0, 0.43))
        draw_rect(Rect2(p - Vector2(half, half), Vector2(half * 2.0, half * 2.0)), Color("774650") if brute else Color("544d70"))
        draw_rect(Rect2(p + Vector2(-half + 4.0, -half - 6.0), Vector2(half * 2 - 8, 9.0)), Color("be826d") if brute else Color("8f6aa0"))
        draw_rect(Rect2(p + Vector2(-half + 5.0, -2.0), Vector2(5, 5)), Color("e7ac87"))
        draw_rect(Rect2(p + Vector2(half - 10.0, -2.0), Vector2(5, 5)), Color("e7ac87"))
        draw_rect(Rect2(p + Vector2(-half, half - 4), Vector2(half * 2, 5)), Color("2e2635"))
        draw_rect(Rect2(p + Vector2(-half, -half - 18), Vector2(half * 2, 5)), Color("271a25"))
        draw_rect(Rect2(p + Vector2(-half, -half - 18), Vector2(half * 2 * maxf(0.0, float(e["hp"]) / float(e["max_hp"])), 5)), C_BLOOD)
        if float(e["windup"]) > 0.0:
            var alpha: float = 0.35 + 0.5 * (1.0 - float(e["windup"]) / 0.39)
            draw_arc(p, 35.0 if brute else 28.0, 0, TAU, 30, Color(1.0, 0.44, 0.27, alpha), 3.0)


func _draw_hero() -> void:
    var p: Vector2 = _center()
    var accent: Color = CLASSES[class_index]["color"]
    draw_circle(p + Vector2(0.0, 20.0), 26.0, Color(0.0, 0.0, 0.0, 0.52))
    draw_circle(p, 32.0, Color(accent.r, accent.g, accent.b, 0.13))
    draw_rect(Rect2(p + Vector2(-16, -17), Vector2(32, 38)), Color("414953"))
    draw_rect(Rect2(p + Vector2(-20, -23), Vector2(40, 12)), accent)
    draw_rect(Rect2(p + Vector2(-11, -10), Vector2(22, 9)), Color("20252d"))
    draw_rect(Rect2(p + Vector2(-20, 4), Vector2(10, 24)), Color("a49b93"))
    draw_rect(Rect2(p + Vector2(10, 4), Vector2(10, 24)), Color("a49b93"))
    draw_line(p + last_facing * 10.0, p + last_facing * 42.0, accent, 7.0)
    draw_circle(p, 3.0, C_GOLD)
    if visual_timer > 0.0:
        var end: Vector2 = hit_location - hero + p
        draw_line(p + last_facing * 16.0, end, Color(accent.r, accent.g, accent.b, visual_timer / 0.15), 6.0, true)
        draw_circle(end, 13.0 * visual_timer / 0.15, Color(accent.r, accent.g, accent.b, visual_timer / 0.15 * 0.45))
    if active_timer > 0.0:
        var radius: float = 230.0 * (1.0 - active_timer / 0.44)
        draw_arc(p, maxf(radius, 2.0), 0.0, TAU, 64, Color(accent.r, accent.g, accent.b, active_timer / 0.44), 7.0, true)
    if ultimate_visual_timer > 0.0:
        var fraction: float = 1.0 - ultimate_visual_timer / 0.75
        var halo: float = 22.0 + 340.0 * fraction
        draw_arc(p, halo, 0.0, TAU, 80, Color(C_GOLD.r, C_GOLD.g, C_GOLD.b, ultimate_visual_timer / 0.75), 12.0, true)


func _draw_damage_numbers() -> void:
    for number in damage_numbers:
        var where: Vector2 = number["pos"] - hero + _center()
        where.y -= (0.58 - float(number["time"])) * 37.0
        _draw_text(str(number["amount"]), where, 18, number["color"], HORIZONTAL_ALIGNMENT_CENTER)


func _draw_text(content: String, at: Vector2, size: int, color: Color = C_TEXT, align: HorizontalAlignment = HORIZONTAL_ALIGNMENT_LEFT) -> void:
    draw_string(font, at, content, align, -1.0, size, color)


func _draw_bar(rect: Rect2, progress: float, fill: Color) -> void:
    draw_rect(rect, Color("262735"))
    draw_rect(Rect2(rect.position + Vector2(2, 2), Vector2(maxf(0.0, rect.size.x - 4) * clampf(progress, 0.0, 1.0), rect.size.y - 4)), fill)
    draw_rect(rect, Color("796951"), false, 1.0)


func _draw_globe(center: Vector2) -> void:
    var accent: Color = CLASSES[class_index]["color"]
    var health_fraction: float = hp / max_hp
    var resource_fraction: float = resource / 100.0
    draw_circle(center + Vector2(0.0, 4.0), 81.0, Color("03050a", 0.8))
    draw_circle(center, 76.0, Color("5f452c"))
    draw_circle(center, 70.0, Color("0c0f18"))
    # Scanline-filled hemispheres stay INSIDE the globe rather than rectangular overflow.
    for row in range(-62, 63, 3):
        var y: float = float(row)
        var extent: float = sqrt(maxf(0.0, 62.0 * 62.0 - y * y))
        var left_color: Color = Color("851f39") if y >= 62.0 - 124.0 * health_fraction else Color("27121c")
        var right_color: Color = accent.darkened(0.29) if y >= 62.0 - 124.0 * resource_fraction else Color("191b2a")
        draw_rect(Rect2(center + Vector2(-extent, y), Vector2(maxf(0.0, extent - 3.0), 3.0)), left_color)
        draw_rect(Rect2(center + Vector2(3.0, y), Vector2(maxf(0.0, extent - 3.0), 3.0)), right_color)
    draw_line(center + Vector2(0, -62), center + Vector2(0, 62), C_GOLD, 3.0)
    draw_arc(center, 66.0, 0.0, TAU, 72, C_GOLD, 5.0, true)
    draw_arc(center, 74.0, 0.0, TAU, 72, Color("72563a"), 2.0)
    for i in range(8):
        var a: float = float(i) * TAU / 8.0
        var out: Vector2 = Vector2.RIGHT.rotated(a)
        draw_line(center + out * 74.0, center + out * 79.0, C_GOLD, 2.0)
    _draw_text("HP", center + Vector2(-42, -9), 15)
    _draw_text(str(int(hp)), center + Vector2(-43, 15), 17)
    _draw_text(str(CLASSES[class_index]["resource"]), center + Vector2(8, -10), 13)
    _draw_text(str(int(resource)), center + Vector2(14, 15), 17)


func _draw_hud(s: Vector2) -> void:
    var accent: Color = CLASSES[class_index]["color"]
    draw_rect(Rect2(0, 0, s.x, 82), Color("0c101a", 0.96))
    draw_line(Vector2(0, 82), Vector2(s.x, 82), C_GOLD, 2.0)
    _draw_text("GODSCAR", Vector2(18, 32), 26, C_GOLD)
    _draw_text("%s / %s  [TAP]" % [CLASSES[class_index]["name"], SPECS[class_index][spec_index]], Vector2(18, 59), 14)
    _draw_text("FLOAT" if floating_joystick else "FIXED", Vector2(s.x - 98, 34), 19)
    _draw_text("JOYSTICK", Vector2(s.x - 99, 55), 13, C_MUTED)
    _draw_text("KILLS %d   DEATHS %d" % [kills, deaths], Vector2(17, 105), 15, C_TEXT)
    if class_index == 0 and passive_timer > 0:
        _draw_text("BLOODRUSH ACTIVE", Vector2(17, 129), 15, C_RAGE)
    if respawn_notice > 0.0:
        _draw_text("DEATH HAS FILED A COMPLAINT", Vector2(s.x * 0.5, s.y * 0.33), 19, C_GOLD, HORIZONTAL_ALIGNMENT_CENTER)

    var panel_y: float = s.y - 252.0
    draw_rect(Rect2(0, panel_y, s.x, 252), Color("0a0d16", 0.975))
    draw_line(Vector2(0, panel_y), Vector2(s.x, panel_y), C_GOLD, 3.0)
    _draw_text("CHARACTER   LVL %d" % level, Vector2(20, s.y - 230), 15)
    _draw_bar(Rect2(20, s.y - 221, s.x - 40, 12), float(xp) / float(100 + (level - 1) * 55), Color("77b2cf"))
    var faction: Dictionary = factions[faction_index]
    _draw_text("%s   RANK %d  [TAP TO CHANGE]" % [faction["name"], faction["level"]], Vector2(20, s.y - 182), 14)
    _draw_bar(Rect2(20, s.y - 175, s.x - 40, 12), float(faction["xp"]) / 100.0, C_ASH)

    _draw_globe(Vector2(s.x * 0.5, s.y - 84))
    var jc: Vector2 = _joy_center()
    if floating_joystick and touch_id >= 0:
        jc = joystick_origin
    if not floating_joystick or touch_id >= 0:
        draw_circle(jc, 61.0, Color("3b485b", 0.35))
        draw_arc(jc, 61.0, 0.0, TAU, 48, Color("8693a9", 0.65), 2.0)
        draw_circle(jc + joystick_knob, 26.0, Color("6c809d", 0.84))
        draw_circle(jc + joystick_knob, 13.0, Color("c5d0df", 0.66))
    else:
        draw_arc(jc, 44.0, 0.0, TAU, 44, Color("8693a9", 0.30), 2.0)
        _draw_text("FLOAT", jc + Vector2(-24, 5), 13, C_MUTED)
    _draw_text("MOVE ANYWHERE", Vector2(20, s.y - 10), 12, C_MUTED)

    var ability: Vector2 = _skill_center()
    var ult_ready: bool = ultimate_cooldown <= 0.0
    draw_circle(ability, 57.0, Color("3b2c34") if ult_ready else Color("292934"))
    draw_arc(ability, 59.0, 0.0, TAU, 48, C_GOLD if ult_ready else Color("61565c"), 4.0)
    if ult_ready:
        _draw_text("ULT", ability + Vector2(-30, 11), 30, C_GOLD)
    else:
        _draw_text(str(int(ceil(ultimate_cooldown))) + "s", ability + Vector2(-22, 12), 30, C_MUTED)
        draw_arc(ability, 50.0, -PI / 2.0, -PI / 2.0 + TAU * (1.0 - ultimate_cooldown / 18.0), 48, accent, 4.0)
    _draw_text(str(CLASSES[class_index]["ultimate"]), ability + Vector2(-60, 76), 12, C_TEXT)

    _draw_text("HOLD ANYWHERE BELOW MIDSCREEN = MOVE", Vector2(s.x * 0.5, panel_y - 36), 12, C_MUTED, HORIZONTAL_ALIGNMENT_CENTER)
    _draw_text("RELEASE = %s    |    DOUBLE TAP = ULT" % CLASSES[class_index]["active"], Vector2(s.x * 0.5, panel_y - 15), 12, C_GOLD, HORIZONTAL_ALIGNMENT_CENTER)
    if ability_notice_timer > 0.0:
        _draw_text(ability_notice, Vector2(s.x * 0.5, panel_y - 61), 16, accent, HORIZONTAL_ALIGNMENT_CENTER)


func _draw_menu(s: Vector2) -> void:
    draw_rect(Rect2(Vector2.ZERO, s), Color("070811", 0.94))
    draw_rect(Rect2(14, 98, s.x - 28, s.y - 175), Color("151825"))
    draw_rect(Rect2(14, 98, s.x - 28, s.y - 175), C_GOLD, false, 2.0)
    _draw_text("CHOOSE YOUR CLASS", Vector2(s.x * 0.5, 141), 25, C_GOLD, HORIZONTAL_ALIGNMENT_CENTER)
    _draw_text("TRAINING SANDBOX - RESPEC FREELY", Vector2(s.x * 0.5, 166), 13, C_MUTED, HORIZONTAL_ALIGNMENT_CENTER)
    var top: float = 205.0
    for i in range(CLASSES.size()):
        var y: float = top + float(i) * 65.0
        var color: Color = CLASSES[i]["color"]
        draw_rect(Rect2(34.0, y, s.x - 68.0, 58.0), Color("343444") if i == class_index else Color("202331"))
        draw_rect(Rect2(34.0, y, 6.0, 58.0), color)
        _draw_text(CLASSES[i]["name"], Vector2(54.0, y + 24.0), 20, C_TEXT)
        _draw_text("%s  /  %s" % [CLASSES[i]["passive"], CLASSES[i]["active"]], Vector2(54.0, y + 45.0), 13, C_MUTED)
    var st: float = top + float(CLASSES.size()) * 65.0 + 56.0
    _draw_text("EARLY SPECIALIZATION PREVIEWS", Vector2(s.x * 0.5, st - 15.0), 16, C_GOLD, HORIZONTAL_ALIGNMENT_CENTER)
    for i in range(3):
        var column_width: float = s.x / 3.0
        var left: float = i * column_width + 5.0
        draw_rect(Rect2(left, st, column_width - 10.0, 75.0), Color("4a3d34") if i == spec_index else Color("242433"))
        draw_rect(Rect2(left, st, column_width - 10.0, 75.0), C_GOLD if i == spec_index else C_MUTED, false, 2.0)
        _draw_text(SPECS[class_index][i], Vector2(left + (column_width - 10.0) * 0.5, st + 41.0), 13, C_TEXT, HORIZONTAL_ALIGNMENT_CENTER)
    _draw_text("TAP A CLASS OR SPEC TO TRY IT", Vector2(s.x * 0.5, st + 106.0), 15, C_MUTED, HORIZONTAL_ALIGNMENT_CENTER)
    _draw_text("TAP BELOW TO RETURN TO THE SLAUGHTER", Vector2(s.x * 0.5, s.y - 46.0), 14, C_GOLD, HORIZONTAL_ALIGNMENT_CENTER)
