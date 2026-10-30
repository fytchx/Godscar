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
# Lightweight CPU callback measurements. These do not measure GPU render time.
var sim_total_us: int = 0
var sim_count: int = 0
var sim_peak_us: int = 0
var draw_total_us: int = 0
var draw_count: int = 0
var draw_peak_us: int = 0
var recent_sim_peak_us: int = 0
var recent_draw_peak_us: int = 0
var flush_total_us: int = 0
var flush_peak_us: int = 0
var flush_count: int = 0
var last_spike_at: float = -1000.0
var incoming_damage: float = 0.0
var incoming_hits: int = 0
var largest_hit: float = 0.0
var avoided_attacks: int = 0
var enemy_swings: int = 0
# Rolling five-second windows, capped at 60 records (five minutes).
var timeline: Array[String] = []
var window_fps_sum: int = 0
var window_fps_samples: int = 0
var window_fps_low: int = 999
var window_slow: int = 0
var window_enemies: int = 0
var window_frame_worst_ms: float = 0.0
var window_sim_peak_us: int = 0
var window_draw_peak_us: int = 0


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
    sim_total_us = 0
    sim_count = 0
    sim_peak_us = 0
    draw_total_us = 0
    draw_count = 0
    draw_peak_us = 0
    recent_sim_peak_us = 0
    recent_draw_peak_us = 0
    flush_total_us = 0
    flush_peak_us = 0
    flush_count = 0
    last_spike_at = -1000.0
    incoming_damage = 0.0
    incoming_hits = 0
    largest_hit = 0.0
    avoided_attacks = 0
    enemy_swings = 0
    timeline.clear()
    window_fps_sum = 0
    window_fps_samples = 0
    window_fps_low = 999
    window_slow = 0
    window_enemies = 0
    window_frame_worst_ms = 0.0
    window_sim_peak_us = 0
    window_draw_peak_us = 0


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


func enemy_attack(kind: String, in_range: bool) -> void:
    enemy_swings += 1
    var key: String = kind + ("_IN_RANGE" if in_range else "_DODGED")
    counts[key] = int(counts.get(key, 0)) + 1
    if not in_range:
        avoided_attacks += 1


func player_damage(amount: float, kind: String, hp_left: float, hp_max: float) -> void:
    incoming_hits += 1
    incoming_damage += amount
    largest_hit = maxf(largest_hit, amount)
    counts["DAMAGE_FROM_" + kind] = int(counts.get("DAMAGE_FROM_" + kind, 0)) + 1
    if incoming_hits == 1 or incoming_hits % 5 == 0 or hp_left < hp_max * 0.35:
        event("TOOK_DAMAGE", "%.0f from %s, %.0f/%.0f HP (hits=%d)" % [amount, kind, hp_left, hp_max, incoming_hits])


func player_evade(kind: String) -> void:
    avoided_attacks += 1
    counts["CLASS_EVADE_" + kind] = int(counts.get("CLASS_EVADE_" + kind, 0)) + 1


func sample_processing(sim_us: int, sim_ticks: int, sim_worst_us: int, render_us: int, render_frames: int, render_worst_us: int) -> void:
    sim_total_us += sim_us
    sim_count += sim_ticks
    sim_peak_us = maxi(sim_peak_us, sim_worst_us)
    draw_total_us += render_us
    draw_count += render_frames
    draw_peak_us = maxi(draw_peak_us, render_worst_us)
    recent_sim_peak_us = sim_worst_us
    recent_draw_peak_us = render_worst_us
    window_sim_peak_us = maxi(window_sim_peak_us, sim_worst_us)
    window_draw_peak_us = maxi(window_draw_peak_us, render_worst_us)


func sample(fps: int, slow_frames: int, frame_ms: float, enemy_count: int, mode: String) -> void:
    total_samples += 1
    fps_sum += fps
    fps_low = mini(fps_low, fps)
    fps_high = maxi(fps_high, fps)
    worst_ms = maxf(worst_ms, frame_ms)
    total_slow_frames += slow_frames
    peak_enemies = maxi(peak_enemies, enemy_count)
    window_fps_sum += fps
    window_fps_samples += 1
    window_fps_low = mini(window_fps_low, fps)
    window_slow += slow_frames
    window_enemies = maxi(window_enemies, enemy_count)
    window_frame_worst_ms = maxf(window_frame_worst_ms, frame_ms)
    if frame_ms >= 80.0 and elapsed - last_spike_at >= 5.0:
        event("FRAME_SPIKE", "%.1f ms; enemies=%d; sim peak=%.1fms; draw submit peak=%.1fms" % [frame_ms, enemy_count, float(recent_sim_peak_us) / 1000.0, float(recent_draw_peak_us) / 1000.0])
        last_spike_at = elapsed
    if window_fps_samples >= 5:
        timeline.append("%ds: avg=%.1f min=%d slow=%d worst=%.1fms enemies<=%d sim=%.1fms draw_submit=%.1fms" % [int(elapsed), float(window_fps_sum) / float(window_fps_samples), window_fps_low, window_slow, window_frame_worst_ms, window_enemies, float(window_sim_peak_us) / 1000.0, float(window_draw_peak_us) / 1000.0])
        if timeline.size() > 60:
            timeline.remove_at(0)
        window_fps_sum = 0
        window_fps_samples = 0
        window_fps_low = 999
        window_slow = 0
        window_enemies = 0
        window_frame_worst_ms = 0.0
        window_sim_peak_us = 0
        window_draw_peak_us = 0

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
            event("PERF_DIP", "under 25 FPS for 3+ seconds; enemies=%d; mode=%s; sim peak=%.1fms; draw submit peak=%.1fms" % [enemy_count, mode, float(recent_sim_peak_us) / 1000.0, float(recent_draw_peak_us) / 1000.0])
            low_fps_warning_active = true
    else:
        slow_streak = 0
        if fps > 35:
            low_fps_warning_active = false


func save(state: String) -> void:
    last_state = state
    var started_us: int = Time.get_ticks_usec()
    _write(CURRENT_PATH, report(state))
    var flush_us: int = Time.get_ticks_usec() - started_us
    flush_count += 1
    flush_total_us += flush_us
    flush_peak_us = maxi(flush_peak_us, flush_us)


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
    lines.append("INCOMING COMBAT: attempts=%d; hits=%d; avoided=%d; damage=%.0f; largest_hit=%.0f" % [enemy_swings, incoming_hits, avoided_attacks, incoming_damage, largest_hit])
    lines.append("CPU callback time (not GPU): simulation avg=%.2fms peak=%.2fms (%d ticks); draw submit avg=%.2fms peak=%.2fms (%d draws)" % [float(sim_total_us) / float(maxi(1, sim_count)) / 1000.0, float(sim_peak_us) / 1000.0, sim_count, float(draw_total_us) / float(maxi(1, draw_count)) / 1000.0, float(draw_peak_us) / 1000.0, draw_count])
    lines.append("Log file saves: %d; avg=%.2fms peak=%.2fms" % [flush_count, float(flush_total_us) / float(maxi(1, flush_count)) / 1000.0, float(flush_peak_us) / 1000.0])
    lines.append("5-SECOND PERFORMANCE WINDOWS (recent):")
    for row_text in timeline:
        lines.append("  " + row_text)
    if window_fps_samples > 0:
        lines.append("  [partial] avg=%.1f min=%d slow=%d worst=%.1fms" % [float(window_fps_sum) / float(window_fps_samples), window_fps_low, window_slow, window_frame_worst_ms])
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
