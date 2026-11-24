extends SceneTree

const DEMO := preload("res://observatory-study.tscn")
const STUDY := preload("res://scripts/observatory_study.gd")
const ROOM := preload("res://scripts/courtyard_room.gd")

var game: STUDY
var variant := "refined"
var save_path := "user://observatory-art-review-%d.json" % OS.get_process_id()
var checks := {}
var shots: Array[Dictionary] = []

func _initialize() -> void:
	if "--baseline" in OS.get_cmdline_user_args():
		variant = "baseline"
	review_route.call_deferred()

func review_route() -> void:
	game = DEMO.instantiate() as STUDY
	game.threshold_finish_enabled = variant != "baseline"
	game.save_path = save_path
	root.add_child(game)
	current_scene = game
	game.start_game({"stage": STUDY.Stage.POWER, "inside": false})
	game.place_hero(Vector3(1.15, .12, 5.63), true)
	await wait_physics(132)
	await screenshot("approach")
	checks["walks_to_stone_steps"] = await walk_to(Vector2(1.15, 3.40))
	await wait_physics(126)
	checks["walks_up_to_door"] = await walk_to(Vector2(1.15, 2.34))
	await wait_physics(110)
	await screenshot("threshold")
	checks["door_prompt_available"] = game.within_doorway() and game.hero.is_on_floor()
	await interact()
	await wait_physics(175)
	checks["crosses_threshold"] = game.in_room and game.hero.is_on_floor()
	await screenshot("entry")
	if game.in_room:
		checks["walks_to_workbench"] = await walk_to(Vector2(ROOM.ORIGIN.x + ROOM.INSTRUMENT.x, ROOM.INSTRUMENT.z))
		await wait_physics(230)
		await screenshot("workbench")
		await interact()
		checks["workbench_puzzle_opens"] = game.ui.is_open() and game.card == STUDY.Card.POWER
		await wait_physics(192)
	checks["depth_of_field_disabled"] = not game.dof_enabled and is_zero_approx(game.study_dof.dof_blur_amount)
	checks["captured_four_1440p_views"] = shots.size() == 4
	checks["all_passed"] = not checks.values().has(false)
	var output := FileAccess.open("res://evidence/threshold-%s-review.json" % variant, FileAccess.WRITE)
	if output:
		output.store_string(JSON.stringify({"variant": variant, "renderer": RenderingServer.get_current_rendering_method(), "checks": checks, "shots": shots}, "  "))
		output.close()
	DirAccess.remove_absolute(ProjectSettings.globalize_path(save_path))
	print("THRESHOLD_REVIEW ", JSON.stringify(checks))
	quit(0 if checks["all_passed"] else 1)

func screenshot(name: String) -> void:
	RenderingServer.force_draw()
	var rendered := root.get_texture().get_image()
	var file := "res://evidence/threshold-%s-%s-1440p.png" % [variant, name]
	if rendered.get_size() != Vector2i(2560, 1440) or rendered.save_png(file) != OK:
		return
	var transform := game.camera.global_transform
	shots.append({"name": name, "path": file, "width": rendered.get_width(), "height": rendered.get_height(),
		"hero": components(game.hero.position), "camera": components(transform.origin), "axis": components(transform.basis.z), "camera_size": game.camera.size})

func components(value: Vector3) -> Array[float]:
	return [value.x, value.y, value.z]

func walk_to(target: Vector2) -> bool:
	for frame in range(360):
		var offset := target - Vector2(game.hero.position.x, game.hero.position.z)
		if offset.length() < .20:
			stop()
			await wait_physics(3)
			return true
		var stick := offset.normalized() * .58
		set_axis(JOY_AXIS_LEFT_X, stick.x)
		set_axis(JOY_AXIS_LEFT_Y, stick.y)
		await physics_frame
	stop()
	return false

func wait_physics(frames: int) -> void:
	for frame in frames:
		await physics_frame

func interact() -> void:
	var event := InputEventJoypadButton.new()
	event.button_index = JOY_BUTTON_A
	event.pressed = true
	Input.parse_input_event(event)
	Input.flush_buffered_events()
	await wait_physics(2)
	event.pressed = false
	Input.parse_input_event(event)
	Input.flush_buffered_events()

func set_axis(channel: JoyAxis, value: float) -> void:
	var event := InputEventJoypadMotion.new()
	event.axis = channel
	event.axis_value = value
	Input.parse_input_event(event)
	Input.flush_buffered_events()

func stop() -> void:
	set_axis(JOY_AXIS_LEFT_X, 0.0)
	set_axis(JOY_AXIS_LEFT_Y, 0.0)
