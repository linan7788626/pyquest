extends CanvasLayer

signal choice_selected(index: int)
signal dismissed

const PAPER := Color("f6ecd8")
const MUTED := Color("c4cec2")
const GOLD := Color("eac386")
const CONTROL_HINT := "左摇杆 / 方向键 移动　·　A / E 互动　·　菜单键 / Esc 暂停"

var body_font: Font
var code_font: Font
var objective_panel: PanelContainer
var objective_step: Label
var objective_text: Label
var prompt_text: Label
var overlay: Control
var card_title: Label
var card_body: Label
var code_panel: PanelContainer
var code_text: Label
var chart_panel: Control
var choices: VBoxContainer
var buttons: Array[Button] = []
var selected := 0
var stick_direction := 0


func build(font: Font) -> void:
	body_font = font
	var monospace := SystemFont.new()
	monospace.font_names = PackedStringArray(["Menlo", "Consolas", "DejaVu Sans Mono"])
	code_font = monospace
	layer = 6
	var root := Control.new()
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	add_child(root)
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	build_objective(root)
	build_prompt(root)
	build_card(root)


func set_objective(step: String, text: String) -> void:
	objective_step.text = step
	objective_step.visible = not step.is_empty()
	objective_text.text = text
	objective_text.visible = not text.is_empty()
	objective_panel.visible = objective_step.visible or objective_text.visible


func set_prompt(text: String) -> void:
	prompt_text.text = CONTROL_HINT if text.is_empty() else text
	prompt_text.modulate = MUTED if text.is_empty() else PAPER


func show_card(title: String, body: String, options: Array, code: String = "", chart := false) -> void:
	card_title.text = title
	card_body.text = body
	card_body.visible = not body.is_empty()
	code_text.text = code
	code_panel.visible = not code.is_empty()
	chart_panel.visible = chart
	for button in buttons:
		choices.remove_child(button)
		button.queue_free()
	buttons.clear()
	for index in range(options.size()):
		var button := make_choice(str(options[index]))
		button.pressed.connect(choice_selected.emit.bind(index))
		button.focus_entered.connect(select_index.bind(index))
		choices.add_child(button)
		buttons.append(button)
	selected = 0
	overlay.show()
	if not buttons.is_empty():
		buttons[0].grab_focus()


func close_card() -> void:
	overlay.hide()
	stick_direction = 0


func is_open() -> bool:
	return is_instance_valid(overlay) and overlay.visible


func handle_input(event: InputEvent) -> bool:
	if not is_open():
		return false
	if event is InputEventKey:
		if event.pressed and not event.echo:
			var key: Key = event.keycode if event.keycode != KEY_NONE else event.physical_keycode
			match key:
				KEY_UP, KEY_W:
					move_focus(-1)
				KEY_DOWN, KEY_S:
					move_focus(1)
				KEY_ENTER, KEY_KP_ENTER, KEY_E, KEY_SPACE:
					choose_focused()
				KEY_ESCAPE, KEY_BACKSPACE:
					dismissed.emit()
		return true
	if event is InputEventJoypadButton:
		if event.pressed:
			match event.button_index:
				JOY_BUTTON_DPAD_UP:
					move_focus(-1)
				JOY_BUTTON_DPAD_DOWN:
					move_focus(1)
				JOY_BUTTON_A:
					choose_focused()
				JOY_BUTTON_B, JOY_BUTTON_START:
					dismissed.emit()
		return true
	if event is InputEventJoypadMotion:
		if event.axis == JOY_AXIS_LEFT_Y:
			apply_stick_y(event.axis_value)
		return true
	return false


func apply_stick_y(value: float) -> void:
	if absf(value) < 0.3:
		stick_direction = 0
	elif absf(value) >= 0.55:
		var next_direction := 1 if value > 0.0 else -1
		if next_direction != stick_direction:
			stick_direction = next_direction
			move_focus(next_direction)


func move_focus(offset: int) -> void:
	if buttons.is_empty():
		return
	var next_index := clampi(selected + offset, 0, buttons.size() - 1)
	buttons[next_index].grab_focus()


func select_index(index: int) -> void:
	selected = index


func choose_focused() -> void:
	if not buttons.is_empty():
		choice_selected.emit(selected)


func build_objective(root: Control) -> void:
	objective_panel = PanelContainer.new()
	objective_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	objective_panel.position = Vector2(57.0, 50.0)
	objective_panel.custom_minimum_size.x = 495.0
	objective_panel.add_theme_stylebox_override("panel", panel_style(Color("23312be8"), Color("c19a654f"), 18, 24, 17))
	root.add_child(objective_panel)
	var copy := VBoxContainer.new()
	copy.mouse_filter = Control.MOUSE_FILTER_IGNORE
	copy.add_theme_constant_override("separation", 6)
	objective_panel.add_child(copy)
	objective_step = make_text(24, GOLD)
	copy.add_child(objective_step)
	objective_text = make_text(31, PAPER)
	objective_text.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	copy.add_child(objective_text)
	objective_panel.hide()


func build_prompt(root: Control) -> void:
	var center := CenterContainer.new()
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(center)
	center.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	center.offset_top = -111.0
	center.offset_bottom = -33.0
	var panel := PanelContainer.new()
	panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	panel.add_theme_stylebox_override("panel", panel_style(Color("25332dea"), Color("c19a6559"), 19, 27, 12))
	center.add_child(panel)
	prompt_text = make_text(26, Color.WHITE)
	panel.add_child(prompt_text)
	set_prompt("")


func build_card(root: Control) -> void:
	overlay = Control.new()
	overlay.mouse_filter = Control.MOUSE_FILTER_IGNORE
	root.add_child(overlay)
	overlay.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var veil := ColorRect.new()
	veil.color = Color("161e1bb7")
	overlay.add_child(veil)
	veil.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	var center := CenterContainer.new()
	center.mouse_filter = Control.MOUSE_FILTER_IGNORE
	overlay.add_child(center)
	center.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)

	var card := PanelContainer.new()
	card.custom_minimum_size.x = 1130.0
	var frame := panel_style(Color("22302b"), Color("b18a5a"), 29, 58, 44)
	frame.border_width_bottom = 3
	frame.shadow_color = Color("11181588")
	frame.shadow_size = 19
	frame.shadow_offset = Vector2(0, 12)
	card.add_theme_stylebox_override("panel", frame)
	center.add_child(card)
	var stack := VBoxContainer.new()
	stack.add_theme_constant_override("separation", 23)
	card.add_child(stack)
	card_title = make_text(53, PAPER)
	card_title.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	stack.add_child(card_title)
	card_body = make_text(35, MUTED)
	card_body.autowrap_mode = TextServer.AUTOWRAP_WORD_SMART
	card_body.add_theme_constant_override("line_spacing", 10)
	stack.add_child(card_body)
	code_panel = PanelContainer.new()
	code_panel.add_theme_stylebox_override("panel", panel_style(Color("182521"), Color("556c5d"), 15, 25, 18))
	stack.add_child(code_panel)
	code_text = make_text(33, Color("f3d199"))
	code_text.add_theme_font_override("font", code_font)
	code_panel.add_child(code_text)
	chart_panel = Control.new()
	chart_panel.custom_minimum_size.y = 249.0
	chart_panel.mouse_filter = Control.MOUSE_FILTER_IGNORE
	chart_panel.draw.connect(draw_chart)
	chart_panel.resized.connect(chart_panel.queue_redraw)
	stack.add_child(chart_panel)
	chart_panel.hide()
	choices = VBoxContainer.new()
	choices.add_theme_constant_override("separation", 11)
	stack.add_child(choices)
	var hint := make_text(25, Color("b8c7b8"))
	hint.text = "↑ ↓  选择                 A / Enter  确认                 B / Esc  返回"
	stack.add_child(hint)
	overlay.hide()


func draw_chart() -> void:
	var bounds := chart_panel.size
	chart_panel.draw_rect(Rect2(Vector2.ZERO, bounds), Color("132730"))
	var stars := PackedVector2Array([
		Vector2(.50, .11), Vector2(.39, .23), Vector2(.58, .24),
		Vector2(.44, .54), Vector2(.49, .49), Vector2(.54, .43),
		Vector2(.41, .87), Vector2(.60, .78),
	])
	for index in stars.size():
		stars[index] *= bounds
	var strokes := [Vector2i(1, 0), Vector2i(0, 2), Vector2i(1, 3), Vector2i(2, 5),
		Vector2i(3, 4), Vector2i(4, 5), Vector2i(3, 6), Vector2i(5, 7), Vector2i(6, 7)]
	for stroke in strokes:
		chart_panel.draw_line(stars[stroke.x], stars[stroke.y], Color("68868b"), 2.0, true)
	for index in stars.size():
		var belt := index in [3, 4, 5]
		chart_panel.draw_circle(stars[index], 11.0 if belt else 8.0, Color("eac38628"), true, -1.0, true)
		chart_panel.draw_circle(stars[index], 5.6 if belt else 4.8, GOLD if belt else PAPER, true, -1.0, true)
	chart_panel.draw_line(stars[5] + Vector2(13, 0), stars[5] + Vector2(107, 0), Color("ac9167"), 2.0, true)
	chart_panel.draw_string(body_font, stars[5] + Vector2(123, 8), "腰带三星", HORIZONTAL_ALIGNMENT_LEFT, -1, 27, GOLD)
	chart_panel.draw_string(body_font, stars[1] + Vector2(-120, 8), "参宿四", HORIZONTAL_ALIGNMENT_LEFT, -1, 25, MUTED)
	chart_panel.draw_string(body_font, stars[7] + Vector2(25, 9), "参宿七", HORIZONTAL_ALIGNMENT_LEFT, -1, 25, MUTED)


func make_choice(text: String) -> Button:
	var button := Button.new()
	button.text = text
	button.alignment = HORIZONTAL_ALIGNMENT_LEFT
	button.custom_minimum_size.y = 77.0
	button.mouse_default_cursor_shape = Control.CURSOR_POINTING_HAND
	button.add_theme_font_override("font", body_font)
	button.add_theme_font_size_override("font_size", 34)
	for state in ["font_color", "font_hover_color", "font_pressed_color", "font_focus_color"]:
		button.add_theme_color_override(state, PAPER)
	button.add_theme_stylebox_override("normal", panel_style(Color("2c3b34"), Color("506353"), 13, 24, 12))
	button.add_theme_stylebox_override("hover", panel_style(Color("3c4a3b"), Color("a69065"), 13, 24, 12))
	button.add_theme_stylebox_override("pressed", panel_style(Color("5a5140"), GOLD, 13, 24, 12))
	var focus := panel_style(Color("4d4b3a"), GOLD, 13, 24, 12)
	focus.border_width_left = 7
	button.add_theme_stylebox_override("focus", focus)
	return button


func make_text(size: int, color: Color) -> Label:
	var result := Label.new()
	result.add_theme_font_override("font", body_font)
	result.add_theme_font_size_override("font_size", size)
	result.add_theme_color_override("font_color", color)
	result.mouse_filter = Control.MOUSE_FILTER_IGNORE
	return result


func panel_style(fill: Color, edge: Color, radius: int, x_inset: float, y_inset: float) -> StyleBoxFlat:
	var box := StyleBoxFlat.new()
	box.bg_color = fill
	box.border_color = edge
	box.set_corner_radius_all(radius)
	box.set_border_width_all(2)
	box.content_margin_left = x_inset
	box.content_margin_right = x_inset
	box.content_margin_top = y_inset
	box.content_margin_bottom = y_inset
	return box
