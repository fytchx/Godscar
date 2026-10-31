extends RefCounted
## Deterministic, tile-walkable Godwound prototype. No art decisions live here.
const TILE: int = 128
const ROOM_TILES: int = 7
const CELL: int = TILE * ROOM_TILES
const GRID: int = 4
const TARGET_ROOMS: int = 9
const DIRS: Array[Vector2i] = [Vector2i(0, -1), Vector2i(1, 0), Vector2i(0, 1), Vector2i(-1, 0)]
const OPP: Array[int] = [2, 3, 0, 1]

var seed_value: int = 0
var rng := RandomNumberGenerator.new()
var rooms: Dictionary = {}
var room_order: Array[Vector2i] = []
var start: Vector2i = Vector2i(1, 1)
var boss: Vector2i = start
var depth: Dictionary = {}


func generate(next_seed: int, target: int = TARGET_ROOMS) -> void:
    seed_value = next_seed
    rng.seed = next_seed
    rooms.clear()
    room_order.clear()
    depth.clear()
    var required: int = clampi(target, 2, GRID * GRID)
    _add_room(start)
    var attempts: int = 0
    while room_order.size() < required and attempts < 200:
        attempts += 1
        var frontier: Array[Dictionary] = []
        for existing in room_order:
            for direction in range(4):
                var neighboring: Vector2i = existing + DIRS[direction]
                if _inside_grid(neighboring) and not rooms.has(neighboring):
                    frontier.append({"a": existing, "b": neighboring})
        if frontier.is_empty():
            break
        var choice: Dictionary = frontier[rng.randi_range(0, frontier.size() - 1)]
        var new_cell: Vector2i = choice["b"]
        _add_room(new_cell)
        _connect(choice["a"], new_cell)

    # Open extra adjacent connections for occasional loops, never fake dead ends.
    for cell in room_order:
        for direction in [1, 2]:
            var neighbor: Vector2i = cell + DIRS[direction]
            if rooms.has(neighbor) and not _linked(cell, direction) and rng.randf() < 0.24:
                _connect(cell, neighbor)
    _recalculate_depth()


func _inside_grid(cell: Vector2i) -> bool:
    return cell.x >= 0 and cell.y >= 0 and cell.x < GRID and cell.y < GRID


func _add_room(cell: Vector2i) -> void:
    rooms[cell] = {"doors": [false, false, false, false], "kind": "crypt"}
    room_order.append(cell)


func _linked(cell: Vector2i, direction: int) -> bool:
    if not rooms.has(cell):
        return false
    var r: Dictionary = rooms[cell]
    return bool(r["doors"][direction])


func _connect(a: Vector2i, b: Vector2i) -> void:
    var d: Vector2i = b - a
    var index: int = DIRS.find(d)
    assert(index >= 0 and rooms.has(a) and rooms.has(b), "Invalid room edge")
    var ar: Dictionary = rooms[a]
    var br: Dictionary = rooms[b]
    ar["doors"][index] = true
    br["doors"][OPP[index]] = true


func _recalculate_depth() -> void:
    depth = {start: 0}
    var queue: Array[Vector2i] = [start]
    var read_index: int = 0
    while read_index < queue.size():
        var cell: Vector2i = queue[read_index]
        read_index += 1
        for direction in range(4):
            if not _linked(cell, direction):
                continue
            var neighbor: Vector2i = cell + DIRS[direction]
            if not depth.has(neighbor):
                depth[neighbor] = int(depth[cell]) + 1
                queue.append(neighbor)
    boss = start
    for cell in room_order:
        if int(depth.get(cell, -1)) > int(depth[boss]):
            boss = cell
    var r: Dictionary = rooms[boss]
    r["kind"] = "boss"
    r = rooms[start]
    r["kind"] = "entry"


func room_center(cell: Vector2i) -> Vector2:
    return Vector2(float(cell.x * CELL) + CELL * 0.5,
        float(cell.y * CELL) + CELL * 0.5)


func room_for_world(point: Vector2) -> Vector2i:
    return Vector2i(floori(point.x / float(CELL)), floori(point.y / float(CELL)))


func is_walkable_tile(tile: Vector2i) -> bool:
    if tile.x < 0 or tile.y < 0:
        return false
    var cell := Vector2i(tile.x / ROOM_TILES, tile.y / ROOM_TILES)
    if not rooms.has(cell):
        return false
    var x: int = tile.x % ROOM_TILES
    var y: int = tile.y % ROOM_TILES
    if x >= 1 and x <= 5 and y >= 1 and y <= 5:
        return true
    # Three tiles wide per passage, including a clear opening at each end.
    if y >= 2 and y <= 4:
        if x == 0 and _linked(cell, 3):
            return true
        if x == 6 and _linked(cell, 1):
            return true
    if x >= 2 and x <= 4:
        if y == 0 and _linked(cell, 0):
            return true
        if y == 6 and _linked(cell, 2):
            return true
    return false


func is_walkable(point: Vector2, radius: float = 20.0) -> bool:
    for offset in [Vector2(-radius, -radius), Vector2(radius, -radius),
            Vector2(-radius, radius), Vector2(radius, radius)]:
        var p: Vector2 = point + offset
        if not is_walkable_tile(Vector2i(floori(p.x / TILE), floori(p.y / TILE))):
            return false
    return true


func validated() -> bool:
    if room_order.size() < 2 or depth.size() != room_order.size():
        return false
    if not depth.has(boss) or boss == start:
        return false
    if not is_walkable(room_center(start)) or not is_walkable(room_center(boss)):
        return false
    # Flood actual traversable TILE coordinates, not just the conceptual room graph.
    var start_tile: Vector2i = Vector2i(room_center(start) / float(TILE))
    var boss_tile: Vector2i = Vector2i(room_center(boss) / float(TILE))
    var seen: Dictionary = {start_tile: true}
    var queue: Array[Vector2i] = [start_tile]
    var at: int = 0
    while at < queue.size():
        var tile: Vector2i = queue[at]
        at += 1
        for dir in DIRS:
            var neighbor: Vector2i = tile + dir
            if not seen.has(neighbor) and is_walkable_tile(neighbor):
                seen[neighbor] = true
                queue.append(neighbor)
    if not seen.has(boss_tile):
        return false
    # Every room center must be reachable by player-scale paths.
    for cell in room_order:
        var middle: Vector2i = Vector2i(room_center(cell) / float(TILE))
        if not seen.has(middle):
            return false
    return true


func signature() -> String:
    var fragments: PackedStringArray = PackedStringArray()
    for cell in room_order:
        var room: Dictionary = rooms[cell]
        var bits: String = ""
        for is_open in room["doors"]:
            bits += "1" if bool(is_open) else "0"
        fragments.append("%d,%d:%s" % [cell.x, cell.y, bits])
    return "|".join(fragments) + ":boss=%d,%d" % [boss.x, boss.y]
