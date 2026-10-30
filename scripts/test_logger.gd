extends RefCounted
## Godscar on-device test recorder.
## No network uploads, account data, device identifiers, or per-frame disk writes.
## Retains one active and one previous test in the app's private user:// storage.

const CURRENT_PATH: String = "user://godscar_test_current.txt"
const PREVIOUS_PATH: String = "user://godscar_test_previous.txt"
const MAX_EVENTS: int = 65
const SNAPSHOT_INTERVAL: float = 10.0

var started_utc: String = ""
var elapsed: float = 0.0
var flush_elapsed: float = 0.0
var total_samples: int = 0
var fps_sum: int = 0
var fps_low: int = 999
var fps_high: int = 0
var worst_ms: float = 0.0
var total_slow_frames: int = 0
var peak_enemies: int = 0
var slow_streak: int = 0
var low_fps_warning_active: bool = false
var counts: Dictionary = {}
var by_mode: Dictionary = {}
var events: Array[String] = []
var discarded_events: int = 0
var last_state: String = ""


func begin() -> void:
    if FileAccess.file_exists(CURRENT_PATH):
        var previous: String = FileAccess.get_file_as_string(CURRENT_PATH)
        if not previous.is_empty():
            _write(PREVIOUS_PATH, previous)
    _clear()
    event("START", "Godscar dev Android test")
    save("Initialising arena")


func _clear() -> void:
    started_utc = Time.get_datetime_string_from_system(true)
    elapsed = 0.0
    flush_elapsed = 0.0
    total_samples = 0
    fps_sum = 0
    fps_low = 999
    fps_high = 0
    worst_ms = 0.0
    total_slow_frames = 0
    peak_enemies = 0
    slow_streak = 0
    low_fps_warning_active = false
    counts.clear()
    by_mode.clear()
    events.clear()
    discarded_events = 0
    last_state = ""


func start_new(state: String) -> void:
    save(state)
    _write(PREVIOUS_PATH, FileAccess.get_file_as_string(CURRENT_PATH))
    _clear()
    event("START", "New manual test")
    save(state)


func tick(delta: float) -> bool:
    elapsed += delta
    flush_elapsed += delta
    if flush_elapsed >= SNAPSHOT_INTERVAL:
        flush_elapsed = 0.0
        return true
    return false


func event(kind: String, detail: String = "") -> void:
    counts[kind] = int(counts.get(kind, 0)) + 1
    var detail_text: String = (": " + detail) if not detail.is_empty() else ""
    events.append("[%ds] %s%s" % [int(elapsed), kind, detail_text])
    if events.size() > MAX_EVENTS:
        events.remove_at(0)
        discarded_events += 1


func sample(fps: int, slow_frames: int, frame_ms: float, enemy_count: int, mode: String) -> void:
    total_samples += 1
    fps_sum += fps
    fps_low = mini(fps_low, fps)
    fps_high = maxi(fps_high, fps)
    worst_ms = maxf(worst_ms, frame_ms)
    total_slow_frames += slow_frames
    peak_enemies = maxi(peak_enemies, enemy_count)

    var row: Dictionary = by_mode.get(mode, {"samples": 0, "sum_fps": 0, "min_fps": 999, "max_enemies": 0, "slow": 0})
    row["samples"] = int(row["samples"]) + 1
    row["sum_fps"] = int(row["sum_fps"]) + fps
    row["min_fps"] = mini(int(row["min_fps"]), fps)
    row["max_enemies"] = maxi(int(row["max_enemies"]), enemy_count)
    row["slow"] = int(row["slow"]) + slow_frames
    by_mode[mode] = row

    if fps < 25:
        slow_streak += 1
        if slow_streak >= 3 and not low_fps_warning_active:
            event("PERF_DIP", "under 25 FPS for 3+ seconds; enemies=%d; mode=%s" % [enemy_count, mode])
            low_fps_warning_active = true
    else:
        slow_streak = 0
        if fps > 35:
            low_fps_warning_active = false


func save(state: String) -> void:
    last_state = state
    _write(CURRENT_PATH, report(state))


func has_previous() -> bool:
    return FileAccess.file_exists(PREVIOUS_PATH)


func copy_current(state: String) -> bool:
    save(state)
    if not DisplayServer.has_feature(DisplayServer.FEATURE_CLIPBOARD):
        return false
    DisplayServer.clipboard_set(report(state))
    return true


func copy_previous() -> bool:
    if not has_previous() or not DisplayServer.has_feature(DisplayServer.FEATURE_CLIPBOARD):
        return false
    var previous: String = FileAccess.get_file_as_string(PREVIOUS_PATH)
    if previous.is_empty():
        return false
    DisplayServer.clipboard_set(previous)
    return true


func report(state: String) -> String:
    var avg_fps: float = float(fps_sum) / float(maxi(total_samples, 1))
    var lines: PackedStringArray = PackedStringArray()
    lines.append("=== GODSCAR TEST LOG ===")
    lines.append("Build: %s | Engine: %s | OS: %s" % [str(ProjectSettings.get_setting("application/config/build_label", "local-development")), Engine.get_version_info().get("string", "?"), OS.get_name()])
    lines.append("Started UTC: %s" % started_utc)
    lines.append("Active seconds: %.1f | FPS samples: %d" % [elapsed, total_samples])
    lines.append("FPS avg/min/max: %.1f / %d / %d" % [avg_fps, 0 if total_samples == 0 else fps_low, fps_high])
    lines.append("Worst frame: %.1f ms | Frames >33ms: %d" % [worst_ms, total_slow_frames])
    lines.append("Max enemies: %d" % peak_enemies)
    lines.append("MODE COMPARISON:")
    for mode in by_mode.keys():
        var row: Dictionary = by_mode[mode]
        lines.append("  %s: avg %.1f FPS, min %d, slow %d, peak enemies %d (%d samples)" % [str(mode), float(row["sum_fps"]) / float(maxi(int(row["samples"]), 1)), int(row["min_fps"]), int(row["slow"]), int(row["max_enemies"]), int(row["samples"])])
    lines.append("COUNTS:")
    for kind in counts.keys():
        lines.append("  %s: %d" % [str(kind), int(counts[kind])])
    lines.append("LAST STATE: " + state)
    lines.append("EVENTS (most recent %d, %d older omitted):" % [events.size(), discarded_events])
    for item in events:
        lines.append("  " + item)
    lines.append("=== END GODSCAR TEST LOG ===")
    return "\n".join(lines)


func _write(path: String, content: String) -> void:
    var file: FileAccess = FileAccess.open(path, FileAccess.WRITE)
    if file != null:
        file.store_string(content)
