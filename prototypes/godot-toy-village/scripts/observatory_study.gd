extends "res://scripts/courtyard_study.gd"

const UI := preload("res://scripts/observatory_ui.gd")
const SAVE := preload("res://scripts/observatory_save.gd")
const PORCH_FINISH := preload("res://scripts/observatory_porch_finish.gd")
const DESK_FINISH := preload("res://scripts/observatory_desk_finish.gd")

enum Stage { NOTICE, MANUAL, POWER, EXPOSURE, CHART, COMPLETE }
enum Card { WELCOME, NOTICE, MANUAL, POWER, EXPOSURE, FEEDBACK, CHART, PAUSE, RESTART }

const NOTICE_POINT := Vector3(2.23, 0.03, 5.24)
const MANUAL_POINT := Vector3(-3.03, 0.03, -1.99)
const GOALS := [
	"到入口右侧的灯柱读观测告示。",
	"走上石阶进屋，到左侧书架读设备手册。",
	"到右侧工作台，给观测仪恢复供电。",
	"到蓝门前校准曝光时间。",
	"穿过打开的蓝门，在观测台领取星图。",
	"猎户座星图已收录。在暂停菜单可以再次查看。",
]
const MARKERS := ["观测告示", "设备手册", "供电工作台", "曝光校准", "猎户座星图"]
const POWER_CHOICES: Array[String] = ['energy = "3"', "energy == 3", "energy = 3"]
const EXPOSURE_CHOICES: Array[String] = ["exposure_s + 1", "exposure_s = exposure_s + 1", 'exposure_s = "3"']
const MOVE_LEFT := &"observatory_left"
const MOVE_RIGHT := &"observatory_right"
const MOVE_UP := &"observatory_up"
const MOVE_DOWN := &"observatory_down"
const ROOM_TARGET := Vector3(0.0, 1.0, -0.92)
const ALCOVE_TARGET := Vector3(-0.28, 0.55, -5.43)
const ALCOVE_OFFSET := Vector3(0.0, 18.0, 4.4)

var save_path := "user://observatory-classroom-v1.json"
var progress: int = Stage.NOTICE
var card: int = Card.WELCOME
var ui: UI
var objective_marker: Label3D
var playing := false
var has_checkpoint := false
var storage_status: Error = OK
var last_prompt := ""
var alcove_mix := 0.0
var threshold_finish_enabled := true

func _ready() -> void:
	threshold_finish_enabled = threshold_finish_enabled and "--art-baseline" not in OS.get_cmdline_user_args()
	configure_movement()
	super._ready()
	if threshold_finish_enabled:
		install_threshold_finish()
	get_window().title = "PyQuest · 观测台停摆"
	location_title.hide()
	(interaction_text.get_parent().get_parent() as Control).hide()
	ui = UI.new()
	add_child(ui)
	ui.build(font)
	ui.choice_selected.connect(choose)
	ui.dismissed.connect(dismiss_card)
	objective_marker = Label3D.new()
	objective_marker.name = "QuestMarker"
	objective_marker.font = font
	objective_marker.font_size = 48
	objective_marker.outline_size = 10
	objective_marker.pixel_size = .0034
	objective_marker.modulate = Color("ffe5aa")
	objective_marker.outline_modulate = Color("28392f")
	objective_marker.billboard = BaseMaterial3D.BILLBOARD_ENABLED
	add_child(objective_marker)
	show_welcome()

func install_threshold_finish() -> void:
	var porch_finish := PORCH_FINISH.new()
	porch_finish.name = "PorchFinish"
	add_child(porch_finish)
	porch_finish.install(study_model)
	if room:
		var desk_finish := DESK_FINISH.new()
		desk_finish.name = "DeskFinish"
		room.add_child(desk_finish)
		desk_finish.install(room)

func room_asset_path() -> String:
	return "res://observatory-room.glb"

func prepare_room(interior: ROOM_STUDY, asset: PackedScene) -> void:
	interior.install(asset, true)

func set_view(index: int) -> void:
	super.set_view(index)
	if in_room and index in [0, 2]:
		var target := ROOM_STUDY.ORIGIN + ROOM_TARGET
		camera.size = 10.2 if index == 0 else 11.15
		camera.position = target + FRONT_OFFSET
		camera.look_at(target)
		var focus := -camera.to_local(target).z
		study_dof.dof_blur_near_distance = focus - 6.0
		study_dof.dof_blur_far_distance = focus + 6.0

func switch_location(interior: bool) -> void:
	super.switch_location(interior)
	if playing:
		write_checkpoint()
	refresh_objective()

func within_doorway() -> bool:
	if in_room or not room:
		return super.within_doorway()
	# Allow the controller prompt to appear on the upper step, before the door trim.
	var offset := hero.position - PORCH_DOOR
	return absf(offset.x) < 0.88 and absf(offset.z) < 0.86 and hero.position.y > .24

func _input(event: InputEvent) -> void:
	if not ui:
		return
	if ui.is_open():
		if ui.handle_input(event):
			get_viewport().set_input_as_handled()
		return
	if in_transition or not playing:
		return
	if pressed(event, KEY_ESCAPE, JOY_BUTTON_START):
		show_pause()
		get_viewport().set_input_as_handled()
		return
	if pressed(event, KEY_E, JOY_BUTTON_A):
		interact()
		get_viewport().set_input_as_handled()
		return
	if event is InputEventKey and event.keycode in [KEY_1, KEY_2, KEY_3, KEY_4, KEY_F, KEY_L, KEY_R]:
		super._input(event)

func pressed(event: InputEvent, key: Key, button: JoyButton) -> bool:
	if event is InputEventKey:
		var event_key: Key = event.keycode if event.keycode != KEY_NONE else event.physical_keycode
		return event.pressed and not event.echo and event_key == key
	if event is InputEventJoypadButton:
		return event.pressed and event.button_index == button
	return false

func direction() -> Vector2:
	if not playing or in_transition or ui.is_open():
		return Vector2.ZERO
	return Input.get_vector(MOVE_LEFT, MOVE_RIGHT, MOVE_UP, MOVE_DOWN)

func configure_movement() -> void:
	bind_movement(MOVE_LEFT, [KEY_A, KEY_LEFT], JOY_BUTTON_DPAD_LEFT, JOY_AXIS_LEFT_X, -1.0)
	bind_movement(MOVE_RIGHT, [KEY_D, KEY_RIGHT], JOY_BUTTON_DPAD_RIGHT, JOY_AXIS_LEFT_X, 1.0)
	bind_movement(MOVE_UP, [KEY_W, KEY_UP], JOY_BUTTON_DPAD_UP, JOY_AXIS_LEFT_Y, -1.0)
	bind_movement(MOVE_DOWN, [KEY_S, KEY_DOWN], JOY_BUTTON_DPAD_DOWN, JOY_AXIS_LEFT_Y, 1.0)

func bind_movement(action: StringName, keys: Array, dpad: JoyButton, axis: JoyAxis, axis_sign: float) -> void:
	if InputMap.has_action(action):
		return
	InputMap.add_action(action, 0.24)
	for key in keys:
		var key_event := InputEventKey.new()
		key_event.physical_keycode = key
		InputMap.action_add_event(action, key_event)
	var button_event := InputEventJoypadButton.new()
	button_event.device = -1
	button_event.button_index = dpad
	InputMap.action_add_event(action, button_event)
	var axis_event := InputEventJoypadMotion.new()
	axis_event.device = -1
	axis_event.axis = axis
	axis_event.axis_value = axis_sign
	InputMap.action_add_event(action, axis_event)

func _physics_process(delta: float) -> void:
	super._physics_process(delta)
	frame_alcove(delta)
	if not ui:
		return
	var prompt := ""
	if playing and not in_transition:
		if at_goal():
			prompt = "A / E  查看%s" % MARKERS[progress]
		elif within_doorway():
			prompt = "A / E  返回院落" if in_room else "A / E  进入小屋"
	if prompt != last_prompt:
		last_prompt = prompt
		ui.set_prompt(prompt)

func frame_alcove(delta: float) -> void:
	if not in_room or view_index not in [0, HERO_VIEW]:
		alcove_mix = 0.0
		return
	var expected := smoothstep(4.05, 5.18, -hero.position.z)
	if is_zero_approx(alcove_mix) and is_zero_approx(expected):
		return
	alcove_mix = move_toward(alcove_mix, expected, delta * 3.7)
	var following := view_index == HERO_VIEW
	var focus := camera_focus if following else ROOM_STUDY.ORIGIN + ROOM_TARGET.lerp(ALCOVE_TARGET, alcove_mix)
	var offset := (HERO_FOLLOW_OFFSET if following else FRONT_OFFSET).lerp(ALCOVE_OFFSET, alcove_mix)
	camera.position = focus + offset
	camera.look_at(focus)
	if not following:
		camera.size = lerpf(10.2, 5.7, alcove_mix)
	if dof_enabled:
		study_dof.dof_blur_near_distance = offset.length() - 6.0
		study_dof.dof_blur_far_distance = offset.length() + 6.0

func goal_position() -> Vector3:
	match progress:
		Stage.NOTICE: return NOTICE_POINT
		Stage.MANUAL: return ROOM_STUDY.ORIGIN + MANUAL_POINT
		Stage.POWER: return ROOM_STUDY.ORIGIN + ROOM_STUDY.INSTRUMENT
		Stage.EXPOSURE: return ROOM_STUDY.ORIGIN + ROOM_STUDY.GATE_APPROACH
		Stage.CHART: return ROOM_STUDY.ORIGIN + ROOM_STUDY.CHART_APPROACH
	return Vector3.ZERO

func goal_in_view() -> bool:
	return progress < Stage.COMPLETE and in_room == (progress != Stage.NOTICE)

func at_goal() -> bool:
	if not goal_in_view():
		return false
	var difference := hero.position - goal_position()
	return Vector2(difference.x, difference.z).length() < 0.91

func refresh_objective() -> void:
	if not ui:
		return
	if not playing:
		ui.set_objective("", "")
		objective_marker.hide()
		return
	var step := "观测任务 %d / 5" % (progress + 1) if progress < Stage.COMPLETE else "观测完成"
	if storage_status != OK:
		step += " · 存档未写入"
	elif has_checkpoint:
		step += " · 已保存"
	ui.set_objective(step, GOALS[progress])
	objective_marker.visible = playing and goal_in_view()
	if objective_marker.visible:
		objective_marker.text = "◆  " + MARKERS[progress]
		objective_marker.position = goal_position() + Vector3.UP * 1.50

func interact() -> void:
	if at_goal():
		match progress:
			Stage.NOTICE:
				present(Card.NOTICE, "观测告示", "今晚的任务是记录猎户座。小屋的观测仪停摆了，蓝门后的星图也取不出来。\n\n先到室内左侧书架找设备手册，再检查工作台。", ["接下观测任务"])
			Stage.MANUAL:
				present(Card.MANUAL, "设备手册 · 变量", "变量给数据起名字。单个等号把右侧的值赋给变量，两个等号只询问两侧的值是否相等。\n\n供电端口要的是整数 3。带引号的 \"3\" 是字符串。", ["带上手册"], "energy = 0\nenergy == 3   # False")
			Stage.POWER: show_power()
			Stage.EXPOSURE: show_exposure()
			Stage.CHART:
				advance(Stage.COMPLETE)
				show_chart()
	elif within_doorway():
		cross_doorway()

func show_power() -> void:
	present(Card.POWER, "工作台 · 恢复供电", "每次测试从 energy 为 0 开始。选一行指令，把整数 3 存进 energy，让仪表通过检查。", POWER_CHOICES, "energy = 0\n# 选一行在这里运行\nenergy == 3   # 仪表检查")

func show_exposure() -> void:
	present(Card.EXPOSURE, "蓝门 · 校准曝光", "曝光时间表示感光持续多久。这里的目标是把 2 秒增加 1 秒，并让 exposure_s 记住结果。每次测试从 2 开始。", EXPOSURE_CHOICES, "exposure_s = 2\n# 选一行在这里运行\nexposure_s == 3   # 校准检查")

func show_chart() -> void:
	present(Card.CHART, "已收录 · 猎户座星图", "猎户座腰带由三颗在视野中排成一线的亮星组成。下图是课堂辨认用的示意图。\n\n回顾：赋值符号 = 改变变量，比较符号 == 给出 True 或 False。", ["继续探索"], "exposure_s = exposure_s + 1\nexposure_s == 3   # True", true)

func show_welcome() -> void:
	playing = false
	var saved := SAVE.read(save_path)
	var options: Array[String] = ["开始观测", "退出试玩"]
	if not saved.is_empty():
		options.assign(["继续观测", "重新开始", "退出试玩"])
	refresh_objective()
	present(Card.WELCOME, "观测台停摆", "Python for Astronomy · 变量练习\n\n星溪村的观测仪停摆了。用 Python 变量指令恢复供电，打开蓝门，取回今晚的星图。进度会保存到这台电脑。", options)

func show_pause() -> void:
	var options: Array[String] = ["继续观测", "保存并返回开场"]
	if progress == Stage.COMPLETE:
		options.append("查看星图")
	present(Card.PAUSE, "暂停观测", GOALS[progress], options)

func present(kind: int, title: String, body: String, options: Array[String], code: String = "", chart := false) -> void:
	card = kind
	ui.show_card(title, body, options, code, chart)

func choose(index: int) -> void:
	match card:
		Card.WELCOME: choose_welcome(index)
		Card.NOTICE:
			advance(Stage.MANUAL)
			ui.close_card()
		Card.MANUAL:
			advance(Stage.POWER)
			ui.close_card()
		Card.POWER: try_power(index)
		Card.EXPOSURE: try_exposure(index)
		Card.FEEDBACK: dismiss_card()
		Card.CHART: ui.close_card()
		Card.PAUSE:
			match index:
				0: ui.close_card()
				1:
					write_checkpoint()
					show_welcome()
				2: show_chart()
		Card.RESTART:
			if index == 1:
				start_game({})
			else:
				show_welcome()

func choose_welcome(index: int) -> void:
	var saved := SAVE.read(save_path)
	if index == 0:
		start_game(saved)
	elif index == 1 and not saved.is_empty():
		present(Card.RESTART, "重新开始观测？", "重新开始会覆盖这台电脑上已有的本试玩进度。", ["返回", "确认重新开始"])
	else:
		get_tree().quit()

func start_game(saved: Dictionary) -> void:
	progress = saved.get("stage", Stage.NOTICE)
	playing = true
	super.switch_location(saved.get("inside", false))
	if not in_room:
		place_hero(ENTRANCE, false)
		if progress == Stage.NOTICE:
			point_towards_notice()
	apply_progress()
	write_checkpoint()
	ui.close_card()

func point_towards_notice() -> void:
	if hero_rig:
		hero_rig.facing = Vector2.UP
		hero_rig.rotation.y = PI

func try_power(index: int) -> void:
	if index == 2:
		advance(Stage.EXPOSURE)
		present(Card.FEEDBACK, "供电恢复", "仪表识别到整数 3，工作台亮了。到蓝门前把曝光时间增加一秒。", ["前往蓝门"], "energy = 3\nenergy == 3   # True")
	elif index == 0:
		present(Card.FEEDBACK, "仪表仍在等待整数", "引号把 3 变成字符串。看到的字符一样，Python 中的类型不同。", ["再试一次"], 'energy = "3"\nenergy == 3   # False')
	elif index == 1:
		present(Card.FEEDBACK, "比较没有改变变量", "这行只问 energy 是否等于 3。energy 依然存着启动时的 0。", ["再试一次"], "energy = 0\nenergy == 3   # False")

func try_exposure(index: int) -> void:
	if index == 1:
		advance(Stage.CHART)
		present(Card.FEEDBACK, "校准成功 · 蓝门已打开", "Python 先算右侧的 2 + 1，再把结果 3 写回同一个变量。走进观测台，取回星图。", ["去取星图"], "exposure_s = 2\nexposure_s = exposure_s + 1\nexposure_s == 3   # True")
	elif index == 0:
		present(Card.FEEDBACK, "仪表仍然是 2 秒", "加法表达式算出了 3，但变量还存着 2。要更新它，还需要一次赋值。", ["再试一次"], "exposure_s + 1   # 3\nexposure_s       # 2")
	elif index == 2:
		present(Card.FEEDBACK, "秒数需要整数", "字符串 \"3\" 不能用作校准要求的整数秒数。用原来的秒数加 1，再写回变量。", ["再试一次"], 'exposure_s = "3"\nexposure_s == 3   # False')

func dismiss_card() -> void:
	match card:
		Card.WELCOME: return
		Card.RESTART: show_welcome()
		Card.FEEDBACK:
			match progress:
				Stage.POWER: show_power()
				Stage.EXPOSURE:
					if at_goal():
						show_exposure()
					else:
						ui.close_card()
				_: ui.close_card()
		_: ui.close_card()

func advance(next_stage: int) -> void:
	progress = next_stage
	apply_progress()
	write_checkpoint()

func apply_progress() -> void:
	if room:
		room.set_observatory_powered(progress >= Stage.EXPOSURE)
		room.set_observatory_unlocked(progress >= Stage.CHART)
		room.set_chart_claimed(progress == Stage.COMPLETE)
	refresh_objective()

func write_checkpoint() -> void:
	storage_status = SAVE.store(save_path, progress, in_room)
	has_checkpoint = storage_status == OK
	refresh_objective()
