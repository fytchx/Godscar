extends Control
## GODSCAR ASSET JUDGE: mobile-first A/B/C curator for the real Godscar asset manifests.
## A = keep, B = fix, C = reject. All changes are local until copied to chat.
## Each decision is written to user:// immediately so Android restarts don't lose progress.

const BASE := "res://assets/godscar_environment/"
const EXPANSION := "res://assets/godscar_expansion/"
const SAVE_PATH := "user://godscar_asset_judge_v1.json"
const REPORT_PATH := "user://godscar_asset_judge_report.txt"
const PACKS := ["v2", "v1", "ALL"]
const BG_MODES := ["DARK", "LIGHT", "GROUND"]
const VIEW_WIDTH := 540.0

var assets: Array[Dictionary] = []
var visible_assets: Array[Dictionary] = []
var categories: Array[String] = ["ALL"]
var decisions: Dictionary = {}
var history: Array[Dictionary] = []
var pack_index: int = 0
var category_index: int = 0
var bg_index: int = 0
var pending_only: bool = true
var cursor: int = 0
var streak: int = 0

var pack_button: Button
var category_button: Button
var pending_button: Button
var bg_button: Button
var preview_frame: ColorRect
var backdrop_texture: TextureRect
var sprite_preview: TextureRect
var item_title: Label
var item_details: Label
var status_label: Label
var progress_label: Label
var progress_bar: ProgressBar
var footer_label: Label
var a_button: Button
var b_button: Button
var c_button: Button
var undo_button: Button
var skip_button: Button
var export_button: Button


func _ready() -> void:
    mouse_filter = Control.MOUSE_FILTER_STOP
    _load_manifests()
    _load_save()
    _build_ui()
    _refresh_category_options()
    _refresh_list()
    _show_current()


func _load_manifests() -> void:
    _read_pack(EXPANSION + "asset_manifest.json", "v2", EXPANSION)
    _read_pack(BASE + "asset_manifest.json", "v1", BASE)


func _read_pack(path: String, pack: String, prefix: String) -> void:
    if not FileAccess.file_exists(path):
        push_warning("Asset Judge: missing manifest " + path)
        return
    var file: FileAccess = FileAccess.open(path, FileAccess.READ)
    if file == null:
        return
    var parsed: Variant = JSON.parse_string(file.get_as_text())
    if typeof(parsed) != TYPE_DICTIONARY:
        push_warning("Asset Judge: invalid manifest " + path)
        return
    var raw_assets: Variant = parsed.get("assets", [])
    if typeof(raw_assets) != TYPE_ARRAY:
        return
    for i in range(raw_assets.size()):
        var entry: Variant = raw_assets[i]
        if typeof(entry) != TYPE_DICTIONARY:
            continue
        var id: String = str(entry.get("id", ""))
        var relative: String = str(entry.get("path", ""))
        if id.is_empty() or relative.is_empty():
            continue
        assets.append({
            "key": pack + "/" + id,
            "id": id,
            "path": prefix + relative,
            "pack": pack,
            "category": str(entry.get("category", "unknown")),
            "index": i + 1,
            "width": int(entry.get("width", 0)),
            "height": int(entry.get("height", 0))
        })


func _load_save() -> void:
    if not FileAccess.file_exists(SAVE_PATH):
        return
    var file: FileAccess = FileAccess.open(SAVE_PATH, FileAccess.READ)
    if file == null:
        return
    var saved: Variant = JSON.parse_string(file.get_as_text())
    if typeof(saved) != TYPE_DICTIONARY:
        return
    if int(saved.get("version", 0)) != 1:
        return
    var raw: Variant = saved.get("decisions", {})
    if typeof(raw) != TYPE_DICTIONARY:
        return
    for key in raw.keys():
        var value: String = str(raw[key])
        if value in ["A", "B", "C"]:
            decisions[str(key)] = value
    pack_index = clampi(int(saved.get("pack_index", 0)), 0, PACKS.size() - 1)
    bg_index = clampi(int(saved.get("bg_index", 0)), 0, BG_MODES.size() - 1)
    pending_only = bool(saved.get("pending_only", true))


func _save() -> void:
    var file: FileAccess = FileAccess.open(SAVE_PATH, FileAccess.WRITE)
    if file == null:
        status_label.text = "SAVE FAILED. Do not close the app."
        return
    file.store_string(JSON.stringify({
        "version": 1,
        "decisions": decisions,
        "pack_index": pack_index,
        "pending_only": pending_only,
        "bg_index": bg_index
    }))
    file.flush()


func _make_text(text: String, at: Vector2, area: Vector2, font_size: int, color: Color) -> Label:
    var label := Label.new()
    label.position = at
    label.size = area
    label.text = text
    label.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
    label.add_theme_font_size_override("font_size", font_size)
    label.add_theme_color_override("font_color", color)
    add_child(label)
    return label


func _make_button(text: String, at: Vector2, area: Vector2, color: Color, action: Callable) -> Button:
    var button := Button.new()
    button.position = at
    button.size = area
    button.text = text
    button.add_theme_font_size_override("font_size", 17)
    var normal := StyleBoxFlat.new()
    normal.bg_color = color
    normal.corner_radius_top_left = 8
    normal.corner_radius_top_right = 8
    normal.corner_radius_bottom_left = 8
    normal.corner_radius_bottom_right = 8
    normal.border_color = Color("#675b55")
    normal.set_border_width_all(1)
    button.add_theme_stylebox_override("normal", normal)
    button.pressed.connect(action)
    add_child(button)
    return button


func _build_ui() -> void:
    var background := ColorRect.new()
    background.color = Color("#0b0e14")
    background.position = Vector2.ZERO
    background.size = Vector2(540, 1080)
    background.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(background)

    _make_text("GODSCAR  /  ASSET JUDGE", Vector2(16, 14), Vector2(390, 46), 23, Color("#e6c79f"))
    _make_button("BACK", Vector2(420, 12), Vector2(105, 48), Color("#302c31"),
        func(): get_tree().change_scene_to_file("res://scenes/environment_expansion_gallery.tscn"))

    pack_button = _make_button("PACK", Vector2(10, 75), Vector2(102, 55), Color("#292b34"), _cycle_pack)
    category_button = _make_button("CATEGORY", Vector2(120, 75), Vector2(184, 55), Color("#292b34"), _cycle_category)
    pending_button = _make_button("PENDING", Vector2(312, 75), Vector2(113, 55), Color("#292b34"), _toggle_pending)
    bg_button = _make_button("BG", Vector2(432, 75), Vector2(98, 55), Color("#292b34"), _cycle_bg)
    category_button.add_theme_font_size_override("font_size", 14)
    pending_button.add_theme_font_size_override("font_size", 13)
    bg_button.add_theme_font_size_override("font_size", 13)
    status_label = _make_text("One sprite at a time. Judge the loot.", Vector2(16, 136), Vector2(508, 34), 14, Color("#c9bda9"))

    preview_frame = ColorRect.new()
    preview_frame.position = Vector2(14, 177)
    preview_frame.size = Vector2(512, 449)
    preview_frame.color = Color("#24262d")
    preview_frame.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(preview_frame)
    backdrop_texture = TextureRect.new()
    backdrop_texture.position = Vector2(20, 183)
    backdrop_texture.size = Vector2(500, 437)
    backdrop_texture.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
    backdrop_texture.stretch_mode = TextureRect.STRETCH_TILE
    backdrop_texture.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(backdrop_texture)
    sprite_preview = TextureRect.new()
    sprite_preview.position = Vector2(35, 196)
    sprite_preview.size = Vector2(470, 405)
    sprite_preview.expand_mode = TextureRect.EXPAND_IGNORE_SIZE
    sprite_preview.stretch_mode = TextureRect.STRETCH_KEEP_ASPECT_CENTERED
    sprite_preview.texture_filter = CanvasItem.TEXTURE_FILTER_NEAREST
    sprite_preview.mouse_filter = Control.MOUSE_FILTER_IGNORE
    add_child(sprite_preview)

    item_title = _make_text("", Vector2(17, 642), Vector2(506, 35), 18, Color("#f2d4ab"))
    item_title.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    item_details = _make_text("", Vector2(17, 678), Vector2(506, 32), 13, Color("#c2b9af"))
    item_details.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    progress_label = _make_text("", Vector2(17, 721), Vector2(506, 26), 15, Color("#e7dcc8"))
    progress_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER
    progress_bar = ProgressBar.new()
    progress_bar.position = Vector2(18, 750)
    progress_bar.size = Vector2(504, 18)
    progress_bar.min_value = 0
    progress_bar.max_value = 100
    progress_bar.show_percentage = false
    add_child(progress_bar)

    a_button = _make_button("A   KEEP", Vector2(14, 789), Vector2(166, 96), Color("#345b3d"), func(): _judge("A"))
    b_button = _make_button("B   FIX", Vector2(187, 789), Vector2(166, 96), Color("#76562a"), func(): _judge("B"))
    c_button = _make_button("C   REJECT", Vector2(360, 789), Vector2(166, 96), Color("#76353b"), func(): _judge("C"))
    undo_button = _make_button("UNDO", Vector2(14, 908), Vector2(151, 69), Color("#343640"), _undo)
    skip_button = _make_button("SKIP", Vector2(174, 908), Vector2(151, 69), Color("#343640"), _skip)
    export_button = _make_button("COPY REPORT", Vector2(334, 908), Vector2(192, 69), Color("#4b3f35"), _copy_report)
    footer_label = _make_text("Choices save automatically on this phone. COPY REPORT to share.", Vector2(17, 995), Vector2(506, 65), 14, Color("#c5b28f"))
    footer_label.horizontal_alignment = HORIZONTAL_ALIGNMENT_CENTER

    _refresh_background()


func _refresh_background() -> void:
    var mode: String = BG_MODES[bg_index]
    bg_button.text = "BG: " + mode
    backdrop_texture.visible = (mode == "GROUND")
    if mode == "LIGHT":
        preview_frame.color = Color("#9c988f")
    else:
        preview_frame.color = Color("#22252c")
    if mode == "GROUND":
        backdrop_texture.texture = load(BASE + "textures/terrain/meadow_grass_00.png")


func _refresh_category_options() -> void:
    var prior: String = categories[clampi(category_index, 0, categories.size() - 1)]
    categories = ["ALL"]
    for item in assets:
        if PACKS[pack_index] != "ALL" and str(item["pack"]) != PACKS[pack_index]:
            continue
        var category: String = str(item["category"])
        if not categories.has(category):
            categories.append(category)
    categories.sort()
    # Keep ALL as the first category even after sorting.
    categories.erase("ALL")
    categories.insert(0, "ALL")
    category_index = maxi(0, categories.find(prior))


func _refresh_list() -> void:
    var current_pack: String = PACKS[pack_index]
    var current_cat: String = categories[category_index]
    visible_assets.clear()
    for asset in assets:
        if current_pack != "ALL" and str(asset["pack"]) != current_pack:
            continue
        if current_cat != "ALL" and str(asset["category"]) != current_cat:
            continue
        if pending_only and decisions.has(str(asset["key"])):
            continue
        visible_assets.append(asset)
    pack_button.text = "PACK: " + current_pack.to_upper()
    category_button.text = "CAT: " + current_cat.replace("_", " ").substr(0, 13)
    pending_button.text = "PENDING" if pending_only else "ALL GRADES"
    cursor = clampi(cursor, 0, maxi(0, visible_assets.size() - 1))
    _refresh_progress()


func _scope_count() -> Array[int]:
    var all_count: int = 0
    var judged_count: int = 0
    var target_pack: String = PACKS[pack_index]
    var target_category: String = categories[category_index]
    for item in assets:
        if target_pack != "ALL" and str(item["pack"]) != target_pack:
            continue
        if target_category != "ALL" and str(item["category"]) != target_category:
            continue
        all_count += 1
        if decisions.has(str(item["key"])):
            judged_count += 1
    return [all_count, judged_count]


func _refresh_progress() -> void:
    var totals: Array[int] = _scope_count()
    var count: int = totals[0]
    var judged: int = totals[1]
    progress_bar.value = 100.0 * float(judged) / float(maxi(1, count))
    progress_label.text = "%d / %d JUDGED    |    %d LEFT    |    STREAK %d" % [judged, count, count - judged, streak]


func _show_current() -> void:
    _refresh_progress()
    if visible_assets.is_empty():
        sprite_preview.texture = null
        item_title.text = "ALL DONE FOR THIS FILTER!"
        item_details.text = "Switch category or turn off PENDING to review choices."
        a_button.disabled = true
        b_button.disabled = true
        c_button.disabled = true
        skip_button.disabled = true
        return
    a_button.disabled = false
    b_button.disabled = false
    c_button.disabled = false
    skip_button.disabled = false
    var asset: Dictionary = visible_assets[cursor]
    var path: String = str(asset["path"])
    sprite_preview.texture = load(path) if ResourceLoader.exists(path) else null
    var grade: String = str(decisions.get(str(asset["key"]), "UNRATED"))
    item_title.text = str(asset["category"]).replace("_", " ").to_upper() + "  /  " + str(asset["pack"]).to_upper()
    item_details.text = "#%d  |  %d x %d px  |  %s" % [asset["index"], asset["width"], asset["height"], grade]
    status_label.text = "%d OF %d IN QUEUE    •    %s" % [cursor + 1, visible_assets.size(), str(asset["id"])]


func _judge(value: String) -> void:
    if visible_assets.is_empty():
        return
    var asset: Dictionary = visible_assets[cursor]
    var key: String = str(asset["key"])
    history.append({"key": key, "previous": str(decisions.get(key, ""))})
    decisions[key] = value
    streak += 1
    var previous_cursor: int = cursor
    _save()
    _refresh_list()
    if pending_only:
        cursor = mini(previous_cursor, maxi(0, visible_assets.size() - 1))
    elif not visible_assets.is_empty():
        cursor = (previous_cursor + 1) % visible_assets.size()
    _show_current()
    footer_label.text = {"A":"KEPT", "B":"FLAGGED FOR CLEANUP", "C":"REJECTED"}[value] + "  •  Saved on this phone"


func _undo() -> void:
    if history.is_empty():
        footer_label.text = "Nothing to undo from this session."
        return
    var last: Dictionary = history.pop_back()
    var key: String = str(last["key"])
    var previous: String = str(last["previous"])
    if previous.is_empty():
        decisions.erase(key)
    else:
        decisions[key] = previous
    streak = maxi(0, streak - 1)
    _save()
    _refresh_list()
    for i in range(visible_assets.size()):
        if str(visible_assets[i]["key"]) == key:
            cursor = i
            break
    _show_current()
    footer_label.text = "Last rating undone."


func _skip() -> void:
    if visible_assets.is_empty():
        return
    cursor = (cursor + 1) % visible_assets.size()
    streak = 0
    _show_current()


func _cycle_pack() -> void:
    pack_index = (pack_index + 1) % PACKS.size()
    category_index = 0
    cursor = 0
    _refresh_category_options()
    _refresh_list()
    _show_current()
    _save()


func _cycle_category() -> void:
    category_index = (category_index + 1) % categories.size()
    cursor = 0
    _refresh_list()
    _show_current()


func _toggle_pending() -> void:
    pending_only = not pending_only
    cursor = 0
    _refresh_list()
    _show_current()
    _save()


func _cycle_bg() -> void:
    bg_index = (bg_index + 1) % BG_MODES.size()
    _refresh_background()
    _save()


func _report_text() -> String:
    var lines: PackedStringArray = PackedStringArray()
    lines.append("=== GODSCAR ASSET JUDGE REPORT v1 ===")
    lines.append("v2 manifest=assets/godscar_expansion/asset_manifest.json count=728")
    lines.append("v1 manifest=assets/godscar_environment/asset_manifest.json count=197")
    lines.append("Indices are 1-based manifest positions. A=keep B=fix C=reject.")
    var total: int = 0
    for pack in ["v2", "v1"]:
        for grade in ["A", "B", "C"]:
            var numbered: PackedStringArray = PackedStringArray()
            for item in assets:
                if str(item["pack"]) == pack and str(decisions.get(str(item["key"]), "")) == grade:
                    numbered.append(str(item["index"]))
                    total += 1
            lines.append("%s %s: %s" % [pack, grade, ",".join(numbered)])
    lines.append("TOTAL JUDGED: %d / %d" % [total, assets.size()])
    lines.append("=== END GODSCAR ASSET JUDGE REPORT ===")
    return "\n".join(lines)


func _copy_report() -> void:
    var report: String = _report_text()
    DisplayServer.clipboard_set(report)
    var file: FileAccess = FileAccess.open(REPORT_PATH, FileAccess.WRITE)
    if file != null:
        file.store_string(report)
    footer_label.text = "REPORT COPIED! Paste it into our chat. Saved locally too."
