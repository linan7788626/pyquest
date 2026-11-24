extends SceneTree

const DEMO := preload("res://observatory-study.tscn")
const STUDY := preload("res://scripts/observatory_study.gd")
const SAVE := preload("res://scripts/observatory_save.gd")
const ROOM := preload("res://scripts/courtyard_room.gd")
const STAGE := STUDY.Stage
const CARD := STUDY.Card

var game: STUDY
var checks := {}
var save_path := "user://observatory-verify-%d-%d.json" % [OS.get_process_id(), Time.get_ticks_usec()]
var capture := false

func _initialize() -> void:
	capture = "--capture" in OS.get_cmdline_user_args()
	run.call_deferred()

func run() -> void:
	await mount()
	check("fresh_game_menu", game.card == CARD.WELCOME and game.ui.is_open() and game.ui.buttons[0].text == "开始观测")
	await snapshot("courtyard")
	await tap(JOY_BUTTON_A)
	check("gamepad_a_starts", game.playing and not game.ui.is_open())
	await tap(JOY_BUTTON_A)
	check("distant_a_does_not_interact", game.progress == STAGE.NOTICE and not game.ui.is_open())
	var start_x := game.hero.position.x
	joy(JOY_BUTTON_DPAD_RIGHT, true)
	await wait_frames(6)
	joy(JOY_BUTTON_DPAD_RIGHT, false)
	check("dpad_moves_character", game.hero.position.x > start_x + .13)
	check("notice_reachable_on_left_stick", await walk_to(STUDY.NOTICE_POINT))
	await tap(JOY_BUTTON_A)
	check("notice_opens_with_a", game.card == CARD.NOTICE and game.ui.is_open())
	await tap(JOY_BUTTON_B)
	check("b_closes_without_advancing", game.progress == STAGE.NOTICE and not game.ui.is_open())
	await tap(JOY_BUTTON_A)
	await tap(JOY_BUTTON_A)
	check("notice_advances_to_manual", game.progress == STAGE.MANUAL)
	await walk_to(Vector3(1.15, 0, 4.13))
	await walk_to(Vector3(1.15, 0, 2.32))
	await tap(JOY_BUTTON_A)
	await wait_frames(30)
	check("walks_up_porch_and_enters", game.in_room and game.hero.is_on_floor())
	if not game.in_room:
		finish()
		return
	check("readable_manual_reachable", await walk_to(ROOM.ORIGIN + STUDY.MANUAL_POINT))
	await tap(JOY_BUTTON_A)
	check("manual_teaches_assignment", game.card == CARD.MANUAL and game.ui.card_body.text.contains("两个等号"))
	await tap(JOY_BUTTON_A)
	check("manual_unlocks_console", game.progress == STAGE.POWER)
	await walk_to(ROOM.ORIGIN + Vector3(0.0, 0, -.9))
	await walk_to(ROOM.ORIGIN + ROOM.GATE_APPROACH)
	axis(JOY_AXIS_LEFT_Y, -1.0)
	await wait_frames(20)
	stop_stick()
	check("blue_gate_blocks_before_solving", not game.room.gate_open and not game.room.gate_collision.disabled and game.hero.position.z > -3.4)
	await walk_to(ROOM.ORIGIN + Vector3(0, 0, -1.3))
	check("console_reachable", await walk_to(ROOM.ORIGIN + ROOM.INSTRUMENT))
	await tap(JOY_BUTTON_A)
	check("power_card_opens", game.card == CARD.POWER and game.ui.buttons.size() == 3)
	await snapshot("workbench")
	var stationary := game.hero.position
	axis(JOY_AXIS_LEFT_X, 1.0)
	await wait_frames(12)
	stop_stick()
	check("movement_pauses_during_question", game.hero.position.distance_to(stationary) < .03)
	await tap(JOY_BUTTON_A)
	check("string_power_retry", game.progress == STAGE.POWER and game.ui.card_title.text.contains("等待整数") and is_zero_approx(game.room.indicator_light.light_energy))
	await tap(JOY_BUTTON_A)
	await tap(JOY_BUTTON_DPAD_DOWN)
	await tap(JOY_BUTTON_A)
	check("comparison_power_does_not_assign", game.progress == STAGE.POWER and game.ui.card_title.text.contains("没有改变"))
	await tap(JOY_BUTTON_A)
	await pick(2)
	check("integer_power_lights_instrument", game.progress == STAGE.EXPOSURE and game.room.indicator_light.light_energy > 0 and not game.room.gate_open)
	await tap(JOY_BUTTON_A)
	await tap(JOY_BUTTON_START)
	check("controller_menu_available", game.card == CARD.PAUSE and game.ui.is_open())
	await pick(1)
	check("save_and_return_to_start", game.card == CARD.WELCOME and game.ui.buttons[0].text == "继续观测")
	check("midpoint_saved_to_disk", SAVE.read(save_path) == {"stage": STAGE.EXPOSURE, "inside": true})
	await remount()
	await tap(JOY_BUTTON_A)
	check("reload_resumes_inside_prior_progress", game.in_room and game.progress == STAGE.EXPOSURE and game.room.indicator_light.light_energy > 0)
	check("exposure_station_reachable", await walk_to(ROOM.ORIGIN + ROOM.GATE_APPROACH))
	await tap(JOY_BUTTON_A)
	await tap(JOY_BUTTON_A)
	check("addition_without_assignment_does_not_open_gate", game.progress == STAGE.EXPOSURE and not game.room.gate_open and game.ui.card_title.text.contains("2 秒"))
	await tap(JOY_BUTTON_A)
	await pick(2)
	check("string_exposure_rejected", game.progress == STAGE.EXPOSURE and game.ui.card_title.text.contains("需要整数"))
	await tap(JOY_BUTTON_A)
	await pick(1)
	await wait_frames(34)
	check("correct_exposure_opens_gate", game.progress == STAGE.CHART and game.room.gate_open and game.room.gate_collision.disabled and game.room.gate_angle > 1.6)
	await tap(JOY_BUTTON_A)
	await snapshot("open-door")
	check("walks_through_open_gate_to_star_chart", await walk_to(ROOM.ORIGIN + ROOM.CHART_APPROACH))
	check("chart_is_a_visible_world_item", game.room.chart_meshes.size() > 0 and game.room.chart_meshes[0].visible)
	await wait_frames(18)
	check("camera_frames_alcove_without_yaw", game.alcove_mix > .9 and game.camera.global_basis.z.y > .88 and game.camera.global_basis.x.dot(Vector3.RIGHT) > .999)
	await snapshot("observing")
	await tap(JOY_BUTTON_A)
	check("a_claims_and_displays_star_chart", game.progress == STAGE.COMPLETE and game.card == CARD.CHART and game.ui.chart_panel.visible and not game.room.chart_meshes[0].visible)
	await snapshot("star-chart")
	await tap(JOY_BUTTON_A)
	await tap(JOY_BUTTON_A)
	check("reward_cannot_be_claimed_twice", game.progress == STAGE.COMPLETE and not game.ui.is_open())
	await remount()
	await tap(JOY_BUTTON_A)
	await wait_frames(34)
	check("completed_reward_persists_after_reload", game.progress == STAGE.COMPLETE and game.room.gate_open and game.room.gate_collision.disabled and not game.room.chart_meshes[0].visible)
	await tap(JOY_BUTTON_START)
	await pick(2)
	check("can_review_chart_from_pause", game.card == CARD.CHART and game.ui.chart_panel.visible)
	await key_press(KEY_ESCAPE)
	await walk_to(ROOM.ORIGIN + Vector3(0, 0, 4.07))
	await key_press(KEY_E)
	await wait_frames(28)
	check("keyboard_e_returns_to_courtyard", not game.in_room and game.playing)
	check("latest_zone_committed_to_disk", SAVE.read(save_path) == {"stage": STAGE.COMPLETE, "inside": false})
	check("unknown_or_invalid_save_payload_rejected", invalid_save_ignored())
	await tap(JOY_BUTTON_START)
	await pick(1)
	await pick(1)
	check("restart_requires_confirmation", game.card == CARD.RESTART and SAVE.read(save_path).get("stage") == STAGE.COMPLETE)
	await tap(JOY_BUTTON_B)
	check("cancel_restart_keeps_the_chart", game.card == CARD.WELCOME and SAVE.read(save_path).get("stage") == STAGE.COMPLETE)
	await pick(1)
	await pick(1)
	await wait_frames(32)
	check("confirmed_restart_resets_only_the_demo", game.playing and game.progress == STAGE.NOTICE and not game.room.gate_open and game.room.chart_meshes[0].visible and SAVE.read(save_path).get("stage") == STAGE.NOTICE)
	finish()

func mount() -> void:
	game = DEMO.instantiate() as STUDY
	game.save_path = save_path
	root.add_child(game)
	current_scene = game
	await wait_frames(10)

func remount() -> void:
	game.queue_free()
	await process_frame
	await mount()

func check(label: String, passed: bool) -> void:
	checks[label] = passed
	if not passed:
		push_warning("Observatory check failed: %s · card %d stage %d position %s" % [label, game.card, game.progress, game.hero.position])

func invalid_save_ignored() -> bool:
	var bad_path := save_path + ".invalid"
	var file := FileAccess.open(bad_path, FileAccess.WRITE)
	if not file:
		return false
	file.store_string('{"version":1,"stage":"reward_twice","inside":true}')
	file.close()
	var result := SAVE.read(bad_path).is_empty()
	DirAccess.remove_absolute(ProjectSettings.globalize_path(bad_path))
	return result

func finish() -> void:
	var passed := not checks.values().has(false)
	checks["all_passed"] = passed
	var file := FileAccess.open("res://evidence/observatory-classroom-verification.json", FileAccess.WRITE)
	if file:
		file.store_string(JSON.stringify(checks, "  "))
		file.close()
	DirAccess.remove_absolute(ProjectSettings.globalize_path(save_path))
	print("OBSERVATORY_VERIFY ", JSON.stringify(checks))
	quit(0 if passed else 1)

func snapshot(name: String) -> void:
	if not capture:
		return
	await wait_frames(15)
	RenderingServer.force_draw()
	var image := root.get_texture().get_image()
	check("capture_%s" % name, image.get_size() == Vector2i(2560,1440) and image.save_png("res://evidence/observatory-%s-1440p.png" % name) == OK)

func wait_frames(frames: int) -> void:
	for frame in frames:
		await physics_frame

func joy(button: JoyButton, down: bool) -> void:
	var event := InputEventJoypadButton.new()
	event.button_index = button
	event.pressed = down
	Input.parse_input_event(event)
	Input.flush_buffered_events()

func axis(channel: JoyAxis, value: float) -> void:
	var event := InputEventJoypadMotion.new()
	event.axis = channel
	event.axis_value = value
	Input.parse_input_event(event)
	Input.flush_buffered_events()

func stop_stick() -> void:
	axis(JOY_AXIS_LEFT_X, 0.0)
	axis(JOY_AXIS_LEFT_Y, 0.0)

func tap(button: JoyButton) -> void:
	joy(button, true)
	await wait_frames(2)
	joy(button, false)
	await wait_frames(2)

func key_press(code: Key) -> void:
	var event := InputEventKey.new()
	event.keycode = code
	event.physical_keycode = code
	event.pressed = true
	Input.parse_input_event(event)
	Input.flush_buffered_events()
	await wait_frames(2)
	event.pressed = false
	Input.parse_input_event(event)
	Input.flush_buffered_events()
	await wait_frames(2)

func pick(index: int) -> void:
	for button in index:
		await tap(JOY_BUTTON_DPAD_DOWN)
	await tap(JOY_BUTTON_A)

func walk_to(target: Vector3) -> bool:
	for frame in 200:
		var offset := target - game.hero.position
		if Vector2(offset.x, offset.z).length() < .22:
			stop_stick()
			await wait_frames(2)
			return true
		axis(JOY_AXIS_LEFT_X, axis_strength(offset.x))
		axis(JOY_AXIS_LEFT_Y, axis_strength(offset.z))
		await physics_frame
	stop_stick()
	await wait_frames(2)
	return false

func axis_strength(distance: float) -> float:
	return signf(distance) * clampf(absf(distance) * 1.7 + .28, 0.0, 1.0) if absf(distance) > .07 else 0.0
