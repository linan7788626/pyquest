extends "res://scripts/cottage_study.gd"

const OAK_POSITION := Vector3(-5.75, 0.03, -2.3)
const OAK_CROWN_CENTER := Vector3(0, 4.26, -0.05)
const OAK_CROWN_RADII := Vector3(2.54, 1.88, 2.17)
const OAK_CANOPY_MATERIAL := "courtyard_canopy"
const OAK_FADE := 0.86
const UNDER_CANOPY := Vector3(-1.12, 0.12, -1.97)
const ENTRANCE := Vector3(1.15, 0.12, 6.65)
const PORCH_DOOR := Vector3(1.15, 0.48, 1.87)
const PORCH_EXIT := Vector3(1.15, 0.43, 2.50)
const OAK_ASSET := preload("res://courtyard-tree.glb")
const GARDEN_ASSET := preload("res://courtyard-study.glb")
const HERO_MOTION := preload("res://scripts/courtyard_hero.gd")
const HERO_ASSET := "res://courtyard-hero.glb"
const ROOM_STUDY := preload("res://scripts/courtyard_room.gd")
const ROOM_ASSET := "res://room-study.glb"
const CAMERA_LABELS := ["游戏视角", "树冠与根系", "院落全景", "主角近景"]
const ROOM_CAMERA_LABELS := ["游戏视角", "墙脚与陈设", "内厅全景", "主角近景"]
const HERO_VIEW := 3
const FRONT_OFFSET := Vector3(0, 15, 20)
const HERO_FOLLOW_OFFSET := Vector3(0.0, 6.3, 8.4)
const WALK_START := Vector3(0.0, 0.12, 5.15)
const CARDINALS := {"north": Vector2.UP, "south": Vector2.DOWN, "west": Vector2.LEFT, "east": Vector2.RIGHT}

var oak_canopy: MeshInstance3D
var player_marker: Label
var hero_rig: HERO_MOTION
var camera_focus := Vector3.ZERO
var room: ROOM_STUDY
var in_room := false
var doorway_ready := false
var in_transition := false
var location_title: Label
var shortcut_keys: Label
var curtain: ColorRect

func _ready() -> void:
	super._ready()
	var oak := OAK_ASSET.instantiate() as Node3D
	oak.position = OAK_POSITION
	add_child(oak)
	oak_canopy = find_canopy(oak)
	if oak_canopy:
		# The importer loads COLOR_0 but does not enable it on this material.
		var canopy_finish := oak_canopy.mesh.surface_get_material(0).duplicate() as StandardMaterial3D
		canopy_finish.vertex_color_use_as_albedo = true
		oak_canopy.set_surface_override_material(0, canopy_finish)
	add_child(GARDEN_ASSET.instantiate())
	finish_courtyard()
	add_garden_collisions()
	hero.position = ENTRANCE
	hero.show()
	install_hero()
	install_room()
	var args := OS.get_cmdline_user_args()
	if "--capture-hero" in args:
		capture_mode = true
		verification_mode = true
		capture_hero.call_deferred()
	elif "--capture-room" in args:
		capture_mode = true
		verification_mode = true
		capture_room.call_deferred()

func install_hero() -> void:
	if not ResourceLoader.exists(HERO_ASSET, "PackedScene"):
		return
	var asset := load(HERO_ASSET) as PackedScene
	if not asset:
		return
	var model := asset.instantiate() as Node3D
	if not model:
		return
	var rig := HERO_MOTION.new()
	if not rig.bind(model):
		push_error("Courtyard hero is missing one or more animation pivots.")
		rig.free()
		return
	hero_rig = rig
	hero.add_child(hero_rig)
	hero_rig.reset()
	doll.hide()

func install_room() -> void:
	var asset_path := room_asset_path()
	if not ResourceLoader.exists(asset_path, "PackedScene"):
		return
	var asset := load(asset_path) as PackedScene
	if not asset:
		return
	room = ROOM_STUDY.new()
	room.name = "Interior"
	prepare_room(room, asset)
	room.hide()
	add_child(room)
	var layer := CanvasLayer.new()
	layer.layer = ui_layer.layer + 1
	add_child(layer)
	curtain = ColorRect.new()
	curtain.color = Color("27332d")
	curtain.mouse_filter = Control.MOUSE_FILTER_IGNORE
	curtain.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	curtain.hide()
	layer.add_child(curtain)
	refresh_light_hint()

func room_asset_path() -> String:
	return ROOM_ASSET

func prepare_room(interior: ROOM_STUDY, asset: PackedScene) -> void:
	interior.install(asset)

func find_canopy(root: Node) -> MeshInstance3D:
	if root is MeshInstance3D:
		var node := root as MeshInstance3D
		var surface := node.mesh.surface_get_material(0)
		if surface and surface.resource_name == OAK_CANOPY_MATERIAL:
			return node
	for child in root.get_children():
		var found := find_canopy(child)
		if found:
			return found
	return null

func study_palette() -> Dictionary:
	var palette := super.study_palette()
	# Albedo is tuned against House_Blue and the vegetation sprites under layered daylight.
	palette.merge({
		"clay": "184d98", "clay_dark": "133a6b", "clay_edge": "205bac",
		"oak": "966334", "oak_light": "ad7438", "oak_dark": "65442d",
		"leaf": "568622", "leaf_light": "80a42d", "leaf_dark": "286345",
		"petal": "d76d8d", "petal_white": "f1dfaf", "gold": "ce9d41",
	}, true)
	return palette

func finish_courtyard() -> void:
	for item in study_model.find_children("*", "MeshInstance3D", true, false):
		var floor := (item as MeshInstance3D).get_surface_override_material(0) as ShaderMaterial
		if floor and floor.shader.resource_path == "res://textures/cottage_ground_clay.gdshader":
			floor.set_shader_parameter("grass_color", Color("809a1d"))
			floor.set_shader_parameter("path_color", Color("caa274"))
			floor.set_shader_parameter("courtyard_blend", 1.0)

	# Join the inherited bench's back slats to the seat with two shaped supports.
	for x in [-5.30, -3.80]:
		var backrest := BoxMesh.new()
		backrest.size = Vector3(0.14, 0.69, 0.14)
		mesh(self, backrest, Vector3(x, 1.02, 2.77), finish_materials["oak"])

func add_garden_collisions() -> void:
	var tree := StaticBody3D.new()
	tree.name = "OakRootCollision"
	tree.position = OAK_POSITION + Vector3(0, 0.62, 0)
	var collider := CollisionShape3D.new()
	var cylinder := CylinderShape3D.new()
	cylinder.radius = 0.72
	cylinder.height = 1.24
	collider.shape = cylinder
	tree.add_child(collider)
	add_child(tree)
	solid("FrontFenceCollision", Vector3(-5.42, 0.55, 5.85), Vector3(4.04, 1.10, 0.38))
	solid("SideFenceCollision", Vector3(-7.27, 0.55, 4.38), Vector3(0.38, 1.10, 3.3))
	solid("LanternCollision", Vector3(2.85, 0.70, 4.55), Vector3(0.76, 1.4, 0.76))
	# The rounded door trim projects past the main cottage collision.
	solid("PorchDoorCollision", Vector3(1.15, 1.51, 1.79), Vector3(1.96, 2.24, 0.61))
	# The character uses a smooth walkable slope over the three modeled risers.
	var steps := solid("PorchSteps", Vector3(1.15, 0.19, 2.41), Vector3(2.1, 0.38, 1.55))
	steps.rotation_degrees.x = 27.0

func set_view(index: int) -> void:
	view_index = index
	var target := Vector3(-0.5, 2.1, 0.4)
	var offset := FRONT_OFFSET
	camera.size = 14.1
	if index == HERO_VIEW:
		target = hero.position + Vector3.UP * 0.86
		offset = HERO_FOLLOW_OFFSET
		camera.size = 5.2
	elif in_room:
		target = ROOM_STUDY.ORIGIN + Vector3(0.0, 1.0, 0.27)
		camera.size = 8.95
		if index == 1:
			target = ROOM_STUDY.ORIGIN + Vector3(-2.38, 0.56, 2.12)
			offset = Vector3(-5.8, 12.0, 17.0)
			camera.size = 5.5
		elif index == 2:
			camera.size = 10.1
	elif index == 1:
		target = OAK_POSITION + Vector3(0.0, 2.6, 0.0)
		offset = Vector3(-12, 6.5, 20)
		camera.size = 7.6
	elif index == 2:
		target = Vector3(-0.55, 2.45, .25)
		offset = Vector3(-11, 12, 22)
		camera.size = 14.2
	camera_focus = target
	camera.position = target + offset
	camera.look_at(target)
	var focus := -camera.to_local(target).z
	study_dof.dof_blur_near_distance = focus - 6.0
	study_dof.dof_blur_far_distance = focus + 6.0
	refresh_light_hint()

func refresh_light_hint() -> void:
	if not interaction_text:
		return
	var views := ROOM_CAMERA_LABELS if in_room else CAMERA_LABELS
	if doorway_ready:
		interaction_text.text = "E  返回院落" if in_room else "E  进入小屋"
	else:
		interaction_text.text = "%s · %s%s" % [views[view_index], LIGHT_NAMES[light_profile], " · 景深" if dof_enabled else ""]
	location_title.text = "星溪村 · 小屋内厅" if in_room else "星溪村 · 蓝瓦院落"
	var location_keys := "2 墙脚    3 全景" if in_room else "2 树木    3 全景"
	var doorway_key := "    E 进出" if room else ""
	shortcut_keys.text = "方向键 / WASD 移动    1 游戏    %s    4 主角%s    L 光照    F 景深    R 回入口" % [location_keys, doorway_key]

func study_ui() -> void:
	ui_layer = CanvasLayer.new()
	add_child(ui_layer)
	var root := Control.new()
	root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT)
	root.mouse_filter = Control.MOUSE_FILTER_IGNORE
	ui_layer.add_child(root)
	location_title = label("", 41, Color("3c4c43"))
	location_title.position = Vector2(58, 47)
	root.add_child(location_title)
	player_marker = label("◆", 27, Color("f9d48a"))
	player_marker.add_theme_color_override("font_shadow_color", Color("393526"))
	player_marker.add_theme_constant_override("shadow_offset_y", 2)
	player_marker.hide()
	root.add_child(player_marker)
	var bottom := PanelContainer.new()
	bottom.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE)
	bottom.offset_left = 58
	bottom.offset_right = -58
	bottom.offset_top = -105
	bottom.offset_bottom = -38
	bottom.add_theme_stylebox_override("panel", style(Color("233329ee"), Color("827b5955"), 14))
	root.add_child(bottom)
	var row := HBoxContainer.new()
	bottom.add_child(row)
	interaction_text = label("", 23, Color("f0dfb9"))
	interaction_text.size_flags_horizontal = Control.SIZE_EXPAND_FILL
	row.add_child(interaction_text)
	shortcut_keys = label("", 21, Color("c7d1bf"))
	row.add_child(shortcut_keys)
	refresh_light_hint()

func _input(event: InputEvent) -> void:
	if not capture_mode and event is InputEventKey and event.pressed and not event.echo:
		if in_transition:
			return
		if event.keycode == KEY_E:
			if within_doorway():
				cross_doorway()
			return
		if event.keycode == KEY_R:
			recover_study_hero()
			if view_index == HERO_VIEW:
				set_view(HERO_VIEW)
			return
		if event.keycode == KEY_4:
			set_view(HERO_VIEW)
			return
	super._input(event)

func direction() -> Vector2:
	return Vector2.ZERO if in_transition else super.direction()

func within_doorway() -> bool:
	if not room:
		return false
	var doorway := ROOM_STUDY.ORIGIN + ROOM_STUDY.THRESHOLD if in_room else PORCH_DOOR
	var offset := hero.position - doorway
	return absf(offset.x) < 0.83 and absf(offset.z) < (0.84 if in_room else 0.62) and absf(offset.y) < 0.35

func place_hero(spawn: Vector3, facing_inside: bool) -> void:
	hero.position = spawn
	hero.velocity = Vector3.ZERO
	hero.show()
	swing = 0.0
	if hero_rig:
		hero_rig.reset()
		if facing_inside:
			hero_rig.facing = Vector2.UP
			hero_rig.rotation.y = PI
	else:
		doll.rotation.y = PI if facing_inside else 0.0

func recover_study_hero() -> void:
	place_hero(ROOM_STUDY.ORIGIN + ROOM_STUDY.ENTRY if in_room else ENTRANCE, in_room)

func switch_location(interior: bool) -> void:
	in_room = interior
	room.visible = in_room
	place_hero(ROOM_STUDY.ORIGIN + ROOM_STUDY.ENTRY if in_room else PORCH_EXIT, in_room)
	doorway_ready = within_doorway()
	set_view(HERO_VIEW if view_index == HERO_VIEW else 0)

func cross_doorway() -> void:
	in_transition = true
	curtain.modulate.a = 0.0
	curtain.show()
	var fade_in := create_tween()
	fade_in.tween_property(curtain, "modulate:a", 1.0, 0.14)
	await fade_in.finished
	switch_location(not in_room)
	var fade_out := create_tween()
	fade_out.tween_property(curtain, "modulate:a", 0.0, 0.18)
	await fade_out.finished
	curtain.hide()
	in_transition = false

func animate_study_hero(input: Vector2, d: Vector3, traveled: Vector2, delta: float) -> void:
	if not hero_rig:
		super.animate_study_hero(input, d, traveled, delta)
		return
	var right := camera.global_basis.x
	var forward := Vector3(camera.global_basis.z.x, 0.0, camera.global_basis.z.z).normalized()
	var world_travel := Vector3(traveled.x, 0.0, traveled.y)
	var screen_travel := Vector2(world_travel.dot(right), -world_travel.dot(camera.global_basis.y))
	var progress := maxf(0.0, screen_travel.dot(input.normalized()))
	hero_rig.animate(input, right, forward, progress, delta, swing)
	swing = maxf(swing - delta, 0.0)

func crown_blocks(target: Vector3) -> bool:
	# Test the line to the character in crown space, accounting for the current camera.
	var center := OAK_POSITION + OAK_CROWN_CENTER
	var relative_target := (target - center) / OAK_CROWN_RADII
	var toward_camera := camera.global_basis.z / OAK_CROWN_RADII
	var along := maxf(0.0, -relative_target.dot(toward_camera) / toward_camera.length_squared())
	return (relative_target + toward_camera * along).length_squared() < 1.0

func _physics_process(delta: float) -> void:
	super._physics_process(delta)
	var can_interact := within_doorway()
	if can_interact != doorway_ready:
		doorway_ready = can_interact
		refresh_light_hint()
	if view_index == HERO_VIEW:
		camera_focus = camera_focus.lerp(hero.position + Vector3.UP * 0.86, 1.0 - exp(-12.0 * delta))
		camera.position = camera_focus + HERO_FOLLOW_OFFSET
	if oak_canopy:
		var fade := not in_room and hero.visible and crown_blocks(hero.global_position + Vector3.UP * 0.8)
		oak_canopy.transparency = move_toward(oak_canopy.transparency, OAK_FADE if fade else 0.0, delta * 5.0)
		var marker_target := hero.global_position + Vector3.UP * 2.15
		player_marker.visible = fade and camera.is_position_in_frustum(marker_target)
		if player_marker.visible:
			player_marker.position = camera.unproject_position(marker_target) - Vector2(13, 19)

func capture_study() -> void:
	var names := ["game", "tree", "inspection", "occlusion"]
	var records := {"renderer":RenderingServer.get_current_rendering_method(), "images":[], "dof":false, "lighting":LIGHT_NAMES[light_profile]}
	var failure := false
	for index in range(names.size()):
		set_view(index if index < 3 else 0)
		hero.visible = index != 1
		if index == 3:
			hero.position = OAK_POSITION + UNDER_CANOPY
		for frame in range(90):
			await get_tree().process_frame
		RenderingServer.force_draw()
		var rendered := get_viewport().get_texture().get_image()
		var path := "res://evidence/courtyard-v8-%s-1440p.png" % names[index]
		failure = rendered.save_png(path) != OK or rendered.get_size() != Vector2i(2560, 1440) or failure
		records.images.append({"path":path, "width":rendered.get_width(), "height":rendered.get_height()})
	var output := FileAccess.open("res://evidence/courtyard-v8-capture.json", FileAccess.WRITE)
	output.store_string(JSON.stringify(records, "  "))
	print("COURTYARD_CAPTURE ", JSON.stringify(records))
	get_tree().quit(1 if failure else 0)

func capture_hero() -> void:
	if not hero_rig:
		get_tree().quit(1)
		return
	var records := {"renderer": RenderingServer.get_current_rendering_method(), "images": []}
	var failed := false
	for name in CARDINALS:
		hero.position = WALK_START
		hero.velocity = Vector3.ZERO
		hero_rig.reset()
		set_view(HERO_VIEW)
		motion = CARDINALS[name]
		for frame in range(20):
			await get_tree().physics_frame
		await get_tree().process_frame
		RenderingServer.force_draw()
		var image := get_viewport().get_texture().get_image()
		var path := "res://evidence/courtyard-v8-hero-%s-1440p.png" % name
		failed = image.save_png(path) != OK or image.get_size() != Vector2i(2560, 1440) or failed
		records.images.append({"direction": name, "path": path, "width": image.get_width(), "height": image.get_height()})
	var output := FileAccess.open("res://evidence/courtyard-v8-hero-capture.json", FileAccess.WRITE)
	output.store_string(JSON.stringify(records, "  "))
	print("HERO_CAPTURE ", JSON.stringify(records))
	get_tree().quit(1 if failed else 0)

func capture_room() -> void:
	if not room:
		push_error("Import room-study.glb before capturing the interior.")
		get_tree().quit(1)
		return
	var records := {"renderer": RenderingServer.get_current_rendering_method(), "lighting": LIGHT_NAMES[light_profile], "dof": dof_enabled, "images": []}
	var failed := false
	await walk_from(Vector3(1.15, 0.12, 4.1), Vector2.UP, 66)
	var names := ["porch", "game", "wall-detail"]
	for index in range(names.size()):
		if index == 1:
			switch_location(true)
			place_hero(ROOM_STUDY.ORIGIN + Vector3(-0.6, 0.12, 1.43), true)
		elif index == 2:
			set_view(1)
		for frame in range(65):
			await get_tree().process_frame
		RenderingServer.force_draw()
		var image := get_viewport().get_texture().get_image()
		var path := "res://evidence/room-v9-%s-1440p.png" % names[index]
		failed = image.save_png(path) != OK or image.get_size() != Vector2i(2560, 1440) or failed
		records.images.append({"view": names[index], "path": path, "width": image.get_width(), "height": image.get_height()})
	var output := FileAccess.open("res://evidence/room-v9-capture.json", FileAccess.WRITE)
	output.store_string(JSON.stringify(records, "  "))
	print("ROOM_CAPTURE ", JSON.stringify(records))
	get_tree().quit(1 if failed else 0)

func verify_study() -> void:
	for frame in range(20):
		await get_tree().physics_frame
	var results := {"spawn_grounded":hero.is_on_floor(), "tree_loaded":is_instance_valid(oak_canopy)}
	var canopy_finish := oak_canopy.get_surface_override_material(0) as StandardMaterial3D if oak_canopy else null
	results["canopy_vertex_colors_visible"] = canopy_finish != null and canopy_finish.vertex_color_use_as_albedo
	var origin := hero.position
	motion = Vector2.UP
	for frame in range(40):
		await get_tree().physics_frame
	results["entrance_path_is_walkable"] = hero.position.z < origin.z - 2.0 and hero.is_on_floor()
	await walk_from(Vector3(1.15, .12, 4.1), Vector2.UP, 66)
	results["porch_steps_are_walkable"] = hero.position.y > 0.3 and hero.position.z < 2.46 and hero.is_on_floor()
	await walk_from(Vector3(OAK_POSITION.x, .12, -0.5), Vector2.UP, 45)
	results["trunk_blocks_player"] = hero.position.distance_to(Vector3(OAK_POSITION.x, hero.position.y, OAK_POSITION.z)) > 0.75 and hero.position.z < -0.8
	await walk_from(Vector3(-5.42, .12, 4.8), Vector2.DOWN, 35)
	results["fence_blocks_player"] = hero.position.z < 5.65 and hero.position.z > 5.0
	await walk_from(Vector3(2.85, .12, 5.6), Vector2.UP, 35)
	results["lantern_blocks_player"] = hero.position.z > 4.9 and hero.position.z < 5.5
	hero.position = OAK_POSITION + UNDER_CANOPY
	hero.velocity = Vector3.ZERO
	for frame in range(16):
		await get_tree().physics_frame
	results["canopy_fades_over_player"] = oak_canopy != null and oak_canopy.transparency > 0.8 and player_marker.visible
	hero.position = ENTRANCE
	hero.velocity = Vector3.ZERO
	for frame in range(16):
		await get_tree().physics_frame
	results["canopy_restores_in_open_area"] = oak_canopy != null and is_zero_approx(oak_canopy.transparency) and not player_marker.visible
	var event := InputEventKey.new()
	event.keycode = KEY_L
	event.pressed = true
	get_viewport().push_input(event)
	results["light_shortcut"] = light_profile == 2
	await verify_hero_walk(results)
	await verify_room(results)
	var all_passed := not results.values().has(false)
	results["all_passed"] = all_passed
	var output := FileAccess.open("res://evidence/courtyard-v9-verification.json", FileAccess.WRITE)
	output.store_string(JSON.stringify(results, "  "))
	print("COURTYARD_VERIFY ", JSON.stringify(results))
	get_tree().quit(0 if all_passed else 1)

func verify_hero_walk(results: Dictionary) -> void:
	results["hero_rig_loaded"] = hero_rig != null and not doll.visible
	if not hero_rig:
		return
	var shortcut := InputEventKey.new()
	shortcut.keycode = KEY_4
	shortcut.pressed = true
	get_viewport().push_input(shortcut)
	results["hero_close_shortcut"] = view_index == HERO_VIEW and camera.size < 6.0
	var cardinal_phases: Array[float] = []
	var supported := true
	for name in CARDINALS:
		var input: Vector2 = CARDINALS[name]
		hero_rig.reset()
		var resting_foot_height := hero_rig.to_local(hero_rig.feet[0].global_position).y
		await walk_from(WALK_START, input, 18)
		var heading := Vector3(input.x, 0.0, input.y)
		var projected := camera.unproject_position(hero.position) - camera.unproject_position(WALK_START)
		var facing := hero_rig.facing == input and hero_rig.global_basis.z.normalized().dot(heading) > 0.99
		results["hero_walk_%s" % name] = facing and projected.dot(input) > 32.0 and hero_rig.phase > 0.0 and hero_rig.stride_weight > 0.9
		cardinal_phases.append(hero_rig.phase)
		var left_height := hero_rig.to_local(hero_rig.feet[0].global_position).y
		var right_height := hero_rig.to_local(hero_rig.feet[1].global_position).y
		supported = supported and minf(absf(left_height - resting_foot_height), absf(right_height - resting_foot_height)) < 0.015
	results["hero_cardinal_cadence_matches"] = cardinal_phases.max() - cardinal_phases.min() < 0.04
	results["hero_walk_has_ground_contact"] = supported
	var upper_leg := hero_rig.legs[0].rotation.x
	var phase_before := hero_rig.phase
	await walk_from(hero.position, Vector2.RIGHT, 6)
	results["hero_stride_changes_pose"] = absf(hero_rig.legs[0].rotation.x - upper_leg) > 0.03 and not is_equal_approx(hero_rig.phase, phase_before)
	await walk_from(WALK_START, Vector2(1.0, -1.0).normalized(), 8)
	results["hero_diagonal_keeps_facing"] = hero_rig.facing == Vector2.RIGHT and hero.position.x > WALK_START.x + .1 and hero.position.z < WALK_START.z - .1
	phase_before = hero_rig.phase
	for frame in range(12):
		await get_tree().physics_frame
	results["hero_idles_in_last_direction"] = hero_rig.facing == Vector2.RIGHT and is_zero_approx(hero_rig.stride_weight) and is_equal_approx(hero_rig.phase, phase_before)
	await walk_from(Vector3(-5.42, .12, 4.8), Vector2.DOWN, 31)
	phase_before = hero_rig.phase
	motion = Vector2.DOWN
	for frame in range(12):
		await get_tree().physics_frame
	motion = Vector2.ZERO
	results["hero_stops_stride_when_blocked"] = is_zero_approx(hero_rig.stride_weight) and is_equal_approx(hero_rig.phase, phase_before)

func verify_room(results: Dictionary) -> void:
	results["room_model_loaded"] = room != null and not room.visible
	if not room:
		return
	press_study_key(KEY_1)
	var outdoor_basis := camera.global_basis
	var player_id := hero.get_instance_id()
	var rig_id := hero_rig.get_instance_id() if hero_rig else 0
	recover_study_hero()
	press_study_key(KEY_E)
	results["outdoor_door_ignores_far_input"] = not in_transition and not in_room
	await walk_from(Vector3(1.15, 0.12, 4.1), Vector2.UP, 66)
	await get_tree().physics_frame
	results["outdoor_door_hint_at_porch"] = doorway_ready and interaction_text.text.contains("进入小屋")
	press_study_key(KEY_E)
	for frame in range(30):
		await get_tree().physics_frame
	results["outdoor_door_enters_room"] = in_room and room.visible and not in_transition and hero.is_on_floor()
	if not in_room:
		return
	results["room_keeps_same_hero"] = hero.get_instance_id() == player_id and hero_rig != null and hero_rig.get_instance_id() == rig_id
	results["room_matches_courtyard_camera"] = camera.global_basis.z.dot(outdoor_basis.z) > 0.999 and camera.global_basis.x.dot(outdoor_basis.x) > 0.999
	press_study_key(KEY_2)
	var detail_size := camera.size
	press_study_key(KEY_3)
	results["room_detail_and_overview_shortcuts"] = detail_size < camera.size and camera.position.x > 30.0 and view_index == 2
	press_study_key(KEY_4)
	results["room_hero_follow_shortcut"] = view_index == HERO_VIEW and camera.position.x > 30.0
	press_study_key(KEY_1)
	await walk_from(ROOM_STUDY.ORIGIN + ROOM_STUDY.ENTRY, Vector2.UP, 52)
	results["room_floor_is_walkable"] = hero.position.z < -1.2 and hero.is_on_floor()
	press_study_key(KEY_E)
	results["room_exit_ignores_far_input"] = not in_transition and in_room
	await walk_from(ROOM_STUDY.ORIGIN + Vector3(-3.40, 0.12, 2.62), Vector2.LEFT, 38)
	var left := hero.position.x - ROOM_STUDY.ORIGIN.x
	results["room_left_lower_wall_blocks"] = left < -4.0 and left > -4.38 and hero.is_on_floor()
	await walk_from(ROOM_STUDY.ORIGIN + Vector3(3.40, 0.12, 1.62), Vector2.RIGHT, 38)
	var right := hero.position.x - ROOM_STUDY.ORIGIN.x
	results["room_right_lower_wall_blocks"] = right > 4.0 and right < 4.38 and hero.is_on_floor()
	await walk_from(ROOM_STUDY.ORIGIN + Vector3(3.36, 0.12, 0.88), Vector2.UP, 32)
	results["room_chest_blocks"] = hero.position.z > -0.28 and hero.position.z < 0.18
	await walk_from(ROOM_STUDY.ORIGIN + Vector3(0.0, 0.12, -2.33), Vector2.UP, 24)
	results["room_back_wall_blocks"] = hero.position.z < -3.0 and hero.position.z > -3.43
	press_study_key(KEY_R)
	results["room_reset_stays_inside"] = in_room and hero.position.is_equal_approx(ROOM_STUDY.ORIGIN + ROOM_STUDY.ENTRY)
	await walk_from(ROOM_STUDY.ORIGIN + ROOM_STUDY.ENTRY, Vector2.DOWN, 37)
	await get_tree().physics_frame
	results["room_threshold_walkable"] = hero.position.z > 4.1 and hero.position.z < 4.42 and hero.is_on_floor()
	results["room_exit_hint_at_threshold"] = doorway_ready and interaction_text.text.contains("返回院落")
	press_study_key(KEY_E)
	for frame in range(30):
		await get_tree().physics_frame
	results["room_exit_restores_porch"] = not in_room and not room.visible and not in_transition and absf(hero.position.x - PORCH_EXIT.x) < 0.1 and absf(hero.position.z - PORCH_EXIT.z) < 0.15 and hero.is_on_floor()

func press_study_key(key: Key) -> void:
	var event := InputEventKey.new()
	event.keycode = key
	event.pressed = true
	get_viewport().push_input(event)

func walk_from(position_from: Vector3, direction_input: Vector2, frames: int) -> void:
	hero.position = position_from
	hero.velocity = Vector3.ZERO
	motion = direction_input
	for frame in range(frames):
		await get_tree().physics_frame
	motion = Vector2.ZERO
