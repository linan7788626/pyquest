extends Node3D
## Original, disposable visual/interaction prototype. No production save writes.
const SPEED := 4.5
const CAMERA_OFFSET := Vector3(0,36,28)
var hero: CharacterBody3D
var doll: Node3D
var left_leg: Node3D
var right_leg: Node3D
var left_arm: Node3D
var right_arm: Node3D
var camera: Camera3D
var rune: Node3D
var gate: StaticBody3D
var gate_visual: Node3D
var prompt: Label
var panel: PanelContainer
var message: Label
var objective: Label
var solved := false
var dialog_open := false
var elapsed := 0.0
var motion := Vector2.ZERO
var capture_mode := false
var verification_mode := false
var report: Dictionary = {}
var controls_probe := false
var dof_enabled := true
var painted_surfaces := 0
var overview := false
var swing := 0.0
var status := "找到桥边的蓝色符文，点亮村庄北门。"
var font: Font
var interact_button: Button

func material(color: Color, metallic := 0.0, roughness := 0.5) -> StandardMaterial3D:
	var m := StandardMaterial3D.new()
	m.albedo_color = color
	m.metallic = metallic
	m.roughness = roughness
	return m

func mesh(parent: Node3D, shape: Mesh, at: Vector3, mat: Material) -> MeshInstance3D:
	var n := MeshInstance3D.new()
	n.mesh = shape
	n.position = at
	n.material_override = mat
	parent.add_child(n)
	return n

func sphere(parent: Node3D, at: Vector3, scale_v: Vector3, mat: Material) -> MeshInstance3D:
	var s := SphereMesh.new()
	s.radius = 1.0
	s.height = 2.0
	s.radial_segments = 24
	s.rings = 12
	var n := mesh(parent, s, at, mat)
	n.scale = scale_v
	return n

func cube(parent: Node3D, at: Vector3, size_v: Vector3, mat: Material) -> MeshInstance3D:
	var s := BoxMesh.new()
	s.size = size_v
	return mesh(parent, s, at, mat)

func solid(label: String, at: Vector3, size_v: Vector3) -> StaticBody3D:
	var b := StaticBody3D.new()
	b.name = label
	b.position = at
	var c := CollisionShape3D.new()
	var s := BoxShape3D.new()
	s.size = size_v
	c.shape = s
	b.add_child(c)
	add_child(b)
	return b

func _ready() -> void:
	capture_mode = "--capture" in OS.get_cmdline_user_args()
	verification_mode = "--verify" in OS.get_cmdline_user_args()
	# System fallback keeps Chinese readable without copying licensed system fonts.
	var system_font := SystemFont.new()
	system_font.font_names = PackedStringArray(["PingFang SC", "Noto Sans CJK SC", "Arial"])
	font = system_font
	var environment_model := load("res://village.glb").instantiate() as Node3D
	add_child(environment_model)
	apply_painted_materials(environment_model)
	lighting()
	collisions()
	make_hero()
	make_gate()
	make_elder()
	rune = Node3D.new()
	rune.position = Vector3(2.9, 1.7, 5.1)
	add_child(rune)
	var ring := TorusMesh.new()
	ring.inner_radius = 0.47
	ring.outer_radius = 0.51
	mesh(rune, ring, Vector3.ZERO, material(Color("e8bd67"), 0.65))
	camera = Camera3D.new()
	camera.projection = Camera3D.PROJECTION_ORTHOGONAL
	camera.size = 23
	camera.position = CAMERA_OFFSET
	add_child(camera)
	camera.look_at(Vector3(0, 0, 0))
	camera.current = true
	var attributes := CameraAttributesPractical.new()
	attributes.dof_blur_near_enabled=true
	attributes.dof_blur_far_enabled=true
	attributes.dof_blur_amount=.045
	attributes.dof_blur_near_transition=4.5
	attributes.dof_blur_far_transition=5.0
	camera.attributes=attributes
	update_focus()
	make_ui()
	if capture_mode:
		capture.call_deferred()
	if verification_mode:
		verify.call_deferred()

func lighting() -> void:
	var env := WorldEnvironment.new()
	var e := Environment.new()
	e.background_mode = Environment.BG_COLOR
	e.background_color = Color("9bb9b8")
	e.ambient_light_source = Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color = Color("d8e3ed")
	e.ambient_light_energy = 0.45
	e.tonemap_mode = Environment.TONE_MAPPER_FILMIC
	e.ssao_enabled=true
	e.ssao_radius=.65
	e.ssao_intensity=1.2
	env.environment = e
	add_child(env)
	var sun := DirectionalLight3D.new()
	sun.rotation_degrees = Vector3(-54, -32, 0)
	sun.light_color = Color("ffe0aa")
	sun.light_energy = 1.1
	sun.shadow_enabled = true
	sun.directional_shadow_max_distance = 90
	sun.shadow_bias = 0.025
	sun.directional_shadow_blend_splits = true
	add_child(sun)
	var fill := DirectionalLight3D.new()
	fill.rotation_degrees = Vector3(-30, 145, 0)
	fill.light_color = Color("b5daec")
	fill.light_energy = 0.18
	add_child(fill)
	cube(self, Vector3(0,-2.2,0), Vector3(200,.25,200), material(Color("9bb9b8"),0,.9))

func collisions() -> void:
	solid("GroundSouth",Vector3(0,-.2,7.45),Vector3(33,.5,9.7))
	solid("GroundNorth",Vector3(0,-.2,-6.65),Vector3(33,.5,11.4))
	solid("BridgeDeck",Vector3(0,.12,1),Vector3(2.8,.32,3.9))
	for z in [-1.28,3.28]:
		var ramp := solid("BridgeRamp",Vector3(0,.065,z),Vector3(2.65,.18,1.0))
		ramp.rotation.x = -.24 if z < 0 else .24
		var ramp_mesh := cube(self,Vector3(0,.065,z),Vector3(2.65,.18,1.0),material(Color("a87946")))
		ramp_mesh.rotation.x = ramp.rotation.x
	# Invisible water barriers match the river, with a walkable bridge opening.
	for x in [-8.9,8.9]: solid("RiverBank",Vector3(x,.5,1),Vector3(15,2,3.3))
	for x in [-1.4,1.4]: solid("BridgeRail",Vector3(x,.7,1),Vector3(.15,1.3,3.7))
	for p in [Vector3(-7,1.8,-6),Vector3(7,1.8,-6),Vector3(-10,1.8,7.4)]:
		solid("Cottage",p,Vector3(4.7,3.6,4))
	for p in [Vector3(-13,1,-8),Vector3(-12,1,-2),Vector3(12,1,-9),Vector3(13,1,-3),Vector3(-14,1,4),Vector3(12,1,5),Vector3(8,1,10),Vector3(-5,1,10),Vector3(3,1,-10),Vector3(-4,1,-10)]:
		solid("TreeTrunk",p,Vector3(.8,2,.8))
	solid("Well",Vector3(6,1,5.8),Vector3(2.6,2,2.4))
	for p in [Vector3(-4.2,.5,-5.8),Vector3(-4.1,.5,-4.8),Vector3(10,.5,-5.5),Vector3(-7.4,.5,7.5)]:solid("Barrel",p,Vector3(.8,1,.8))
	solid("Elder",Vector3(-2.7,.85,-4.5),Vector3(.85,1.7,.75))
	solid("RunePedestal",Vector3(2.9,.45,5.1),Vector3(1.3,.9,1.3))
	for x in [-16.4,16.4]:solid("VillageEdge",Vector3(x,.7,0),Vector3(.3,3,25))
	for z in [-12.2,12.2]:solid("VillageEdge",Vector3(0,.7,z),Vector3(33,3,.3))
	for p in [Vector3(-8.65,.7,-3),Vector3(6.8,.7,-3),Vector3(-12.65,.7,10),Vector3(11.35,.7,9)]:solid("Fence",p,Vector3(3.6,1.5,.25))
	for x in [-1.7,1.7]:solid("GatePier",Vector3(x,1.5,-10.3),Vector3(.8,3,.9))

func make_hero() -> void:
	hero = CharacterBody3D.new()
	hero.name = "Player"
	hero.position = Vector3(0,.4,7)
	add_child(hero)
	var col := CollisionShape3D.new()
	var capsule := CapsuleShape3D.new()
	capsule.radius = .28
	capsule.height = 1.45
	col.shape = capsule
	col.position.y = .76
	hero.add_child(col)
	hero.floor_snap_length = .45
	hero.floor_max_angle = deg_to_rad(45)
	doll = Node3D.new()
	hero.add_child(doll)
	var blue := material(Color("285b9b"),.08,.35)
	var gold := material(Color("f3c46e"),.48,.3)
	var dark := material(Color("243139"),0,.6)
	var leather := material(Color("77503a"))
	var white := material(Color("fff0d2"),.1,.4)
	sphere(doll,Vector3(0,1.02,0),Vector3(.43,.48,.29),white)
	# NLI Hero_Row01_Pose01: ivory dome, gold visor with dark slots, crescent crest.
	sphere(doll,Vector3(0,1.72,0),Vector3(.59,.57,.50),white)
	sphere(doll,Vector3(0,1.64,.35),Vector3(.52,.35,.23),gold)
	for x in [-.31,-.105,.105,.31]:
		cube(doll,Vector3(x,1.64,.555-absf(x)*.12),Vector3(.11,.32,.035),dark)
	for x in [-.57,.57]:
		sphere(doll,Vector3(x,1.75,0),Vector3(.09,.22,.22),gold)
	crescent(doll,Vector3(0,2.16,0),gold)
	sphere(doll,Vector3(0,1.30,.24),Vector3(.48,.17,.18),blue)
	for x in [-.42,.42]:
		sphere(doll,Vector3(x,1.26,0),Vector3(.24,.20,.32),gold)
		sphere(doll,Vector3(x,1.30,.02),Vector3(.20,.17,.27),white)
	cube(doll,Vector3(0,.80,.04),Vector3(.74,.13,.54),leather)
	cube(doll,Vector3(0,.80,.34),Vector3(.18,.18,.08),gold)
	sphere(doll,Vector3(0,.91,-.29),Vector3(.52,.66,.13),blue)
	left_leg = Node3D.new(); left_leg.position = Vector3(-.21,.66,0); doll.add_child(left_leg)
	right_leg = Node3D.new(); right_leg.position = Vector3(.21,.66,0); doll.add_child(right_leg)
	for leg in [left_leg,right_leg]:
		sphere(leg,Vector3(0,-.18,0),Vector3(.15,.3,.16),white)
		sphere(leg,Vector3(0,-.48,.09),Vector3(.20,.15,.29),leather)
	left_arm = Node3D.new(); left_arm.position = Vector3(-.48,1.2,0); doll.add_child(left_arm)
	right_arm = Node3D.new(); right_arm.position = Vector3(.48,1.2,0); doll.add_child(right_arm)
	for arm in [left_arm,right_arm]:
		sphere(arm,Vector3(0,-.23,.02),Vector3(.14,.30,.15),blue)
		sphere(arm,Vector3(0,-.49,.02),Vector3(.16,.17,.15),leather)
	cube(right_arm,Vector3(0,-.56,.42),Vector3(.10,.08,.82),white)
	cube(right_arm,Vector3(0,-.56,.09),Vector3(.40,.10,.10),gold)
	sphere(left_arm,Vector3(-.09,-.30,.21),Vector3(.31,.42,.10),gold)
	sphere(left_arm,Vector3(-.09,-.30,.29),Vector3(.24,.34,.025),blue)
	var star := cube(left_arm,Vector3(-.09,-.30,.33),Vector3(.19,.19,.035),gold)
	star.rotation.z=PI/4

func make_elder() -> void:
	var elder := Node3D.new()
	elder.position = Vector3(-2.7,.1,-4.5)
	add_child(elder)
	var white := material(Color("f4e6c4"))
	var blue := material(Color("456a98"))
	sphere(elder,Vector3(0,.65,0),Vector3(.44,.65,.35),white)
	sphere(elder,Vector3(0,1.4,0),Vector3(.43,.43,.40),material(Color("e4b587")))
	sphere(elder,Vector3(0,1.14,.31),Vector3(.35,.45,.20),white)
	for x in [-.34,.34]:sphere(elder,Vector3(x,1.14,0),Vector3(.24,.17,.33),blue)
	cube(elder,Vector3(.62,.8,0),Vector3(.08,1.6,.08),material(Color("79502e")))
	sphere(elder,Vector3(.62,1.68,0),Vector3(.17,.17,.17),material(Color("e0b65b"),.4))

func make_gate() -> void:
	gate = solid("RuneGate",Vector3(0,1.2,-10.3),Vector3(2.7,2.4,.5))
	gate_visual = Node3D.new()
	gate_visual.position = Vector3(0,0,-10.3)
	add_child(gate_visual)
	var m := material(Color("bc8643"),.4,.3)
	for x in [-1.0,-.5,0,.5,1.0]:cube(gate_visual,Vector3(x,1.25,0),Vector3(.12,2.5,.15),m)
	for y in [.65,1.8]:cube(gate_visual,Vector3(0,y,0),Vector3(2.7,.14,.18),m)

func label(text: String, size_i: int, color: Color) -> Label:
	var l := Label.new()
	l.text = text
	l.add_theme_font_override("font",font)
	l.add_theme_font_size_override("font_size",size_i)
	l.add_theme_color_override("font_color",color)
	return l

func style(bg: Color, border: Color, radius := 18) -> StyleBoxFlat:
	var s := StyleBoxFlat.new()
	s.bg_color = bg
	s.border_color = border
	s.set_border_width_all(1)
	s.set_corner_radius_all(radius)
	s.content_margin_left = 24; s.content_margin_right = 24
	s.content_margin_top = 16; s.content_margin_bottom = 16
	return s

func make_ui() -> void:
	var layer := CanvasLayer.new(); add_child(layer)
	var root := Control.new(); root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT); root.mouse_filter = Control.MOUSE_FILTER_IGNORE; layer.add_child(root)
	var top := PanelContainer.new(); top.position = Vector2(30,26); top.add_theme_stylebox_override("panel",style(Color("203b3aee"),Color("9dba9577"))); root.add_child(top)
	var v := VBoxContainer.new(); top.add_child(v)
	v.add_child(label("PYQUEST   /   A LITTLE WORLD",13,Color("d9c18d")))
	v.add_child(label("星溪村",32,Color("fff1d1")))
	v.add_child(label("沿着小路，去遇见一个新世界。",16,Color("cadbcd")))
	var tag := label("SOFT FANTASY  ·  02",15,Color("fff1d1")); tag.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT);tag.position=Vector2(-220,40);root.add_child(tag)
	var bottom := PanelContainer.new(); bottom.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE);bottom.offset_left=30;bottom.offset_right=-30;bottom.offset_top=-106;bottom.offset_bottom=-25;bottom.add_theme_stylebox_override("panel",style(Color("203b3aee"),Color("9dba9577")));root.add_child(bottom)
	var row := HBoxContainer.new(); row.add_theme_constant_override("separation",30);bottom.add_child(row)
	var goals := VBoxContainer.new();goals.size_flags_horizontal=Control.SIZE_EXPAND_FILL;row.add_child(goals)
	objective = label("◇  "+status,18,Color("fff1d1"));goals.add_child(objective)
	goals.add_child(label("WASD / 方向键 移动  ·  E 交互  ·  J / 空格 挥剑  ·  Tab 全景  ·  F 景深  ·  R 回入口",14,Color("c3d4c6")))
	interact_button=Button.new();interact_button.text="E  交互";interact_button.add_theme_font_override("font",font);interact_button.pressed.connect(interact);row.add_child(interact_button)
	prompt=label("",19,Color("fff4c8"));prompt.set_anchors_and_offsets_preset(Control.PRESET_CENTER);prompt.position=Vector2(-200,210);prompt.add_theme_color_override("font_shadow_color",Color("182f32"));prompt.add_theme_constant_override("shadow_offset_y",2);root.add_child(prompt)
	panel=PanelContainer.new();panel.set_anchors_and_offsets_preset(Control.PRESET_CENTER);panel.offset_left=-290;panel.offset_top=-185;panel.offset_right=290;panel.offset_bottom=190;panel.add_theme_stylebox_override("panel",style(Color("203b3aff"),Color("d9bd78"),22));root.add_child(panel)
	var content := VBoxContainer.new();content.add_theme_constant_override("separation",15);panel.add_child(content)
	content.add_child(label("蓝色符文  /  变量的力量",25,Color("ffe3a4")))
	content.add_child(label("为北门赋予能量。哪一句能让 energy 等于 3？",17,Color("eee9d5")))
	content.add_child(label("energy = ___",28,Color("9fdddf")))
	for i in range(3):
		var b := Button.new();b.text=["3","\"3\"","energy == 3"][i];b.add_theme_font_override("font",font);b.add_theme_font_size_override("font_size",20);b.pressed.connect(answer.bind(i));content.add_child(b)
	message=label("选择答案后，看看村庄发生了什么。",16,Color("d7c795"));content.add_child(message)
	var close := Button.new();close.text="返回村庄  ·  Esc";close.add_theme_font_override("font",font);close.pressed.connect(close_dialog);content.add_child(close)
	panel.hide()

func close_dialog() -> void:
	dialog_open=false;panel.hide()

func answer(index: int) -> void:
	if index != 0:
		message.text="再试试：数字 3 与字符串 \"3\" 是不同的类型。"
		return
	solved=true
	close_dialog()
	gate.get_child(0).set_deferred("disabled",true)
	var tween := create_tween()
	tween.tween_property(gate_visual,"position:y",-2.8,1.1).set_trans(Tween.TRANS_CUBIC)
	status="北门已开启！穿过木桥，沿小路去看看。"
	objective.text="◆  "+status

func interact() -> void:
	if dialog_open:return
	if hero.position.distance_to(Vector3(2.9,hero.position.y,5.1))<2.4:
		if not solved:
			dialog_open=true;panel.show()
		else:
			status="符文已点亮。北门已经为你打开。";objective.text="◆  "+status
	elif hero.position.distance_to(Vector3(-2.7,hero.position.y,-4.5))<2.5:
		status="长老：这里的魔法，来自你理解的 Python。去试试桥边的符文吧。";objective.text=status

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode==KEY_ESCAPE:close_dialog()
		if event.keycode==KEY_TAB and not dialog_open:
			overview=not overview
			get_viewport().set_input_as_handled()
		if event.keycode==KEY_F:
			dof_enabled=not dof_enabled
			camera.attributes.dof_blur_amount=.045 if dof_enabled else 0.0
		if event.keycode==KEY_E:interact()
		if event.keycode in [KEY_J,KEY_SPACE] and not dialog_open:swing=.32
		if event.keycode==KEY_R and not dialog_open:hero.position=Vector3(0,.4,7);hero.velocity=Vector3.ZERO

func direction() -> Vector2:
	return Vector2(float(Input.is_physical_key_pressed(KEY_D) or Input.is_physical_key_pressed(KEY_RIGHT))-float(Input.is_physical_key_pressed(KEY_A) or Input.is_physical_key_pressed(KEY_LEFT)),float(Input.is_physical_key_pressed(KEY_S) or Input.is_physical_key_pressed(KEY_DOWN))-float(Input.is_physical_key_pressed(KEY_W) or Input.is_physical_key_pressed(KEY_UP))).normalized()

func _physics_process(delta: float) -> void:
	elapsed+=delta
	if not capture_mode and not verification_mode and not controls_probe:
		var target := Vector3.ZERO if overview else Vector3(clampf(hero.position.x*.45,-4,4),0,clampf(hero.position.z*.5,-4,4))
		camera.position=camera.position.lerp(CAMERA_OFFSET+target,delta*3)
		camera.size=lerpf(camera.size,29.0 if overview else 23.0,delta*4)
	update_focus()
	var input := motion if verification_mode else direction()
	if dialog_open:input=Vector2.ZERO
	# Screen-relative movement on the horizontal plane.
	var right := camera.global_basis.x
	var forward := Vector3(camera.global_basis.z.x,0,camera.global_basis.z.z).normalized()
	# Compensate vertical foreshortening: equal key holds travel equal screen distances.
	var vertical_projection := maxf(absf(camera.global_basis.y.dot(forward)),.5)
	var d := right*input.x+forward*input.y/vertical_projection
	hero.velocity.x=d.x*SPEED;hero.velocity.z=d.z*SPEED
	if not hero.is_on_floor():hero.velocity.y-=20*delta
	else:hero.velocity.y=0
	hero.move_and_slide()
	if hero.position.y < -3:hero.position=Vector3(0,.5,7)
	if d.length()>.1:
		doll.rotation.y=lerp_angle(doll.rotation.y,atan2(d.x,d.z),min(1,delta*14))
		left_leg.rotation.x=sin(elapsed*12)*.55;right_leg.rotation.x=-left_leg.rotation.x
		left_arm.rotation.x=-left_leg.rotation.x*.6
		doll.position.y=abs(sin(elapsed*12))*.06
	else:
		left_leg.rotation.x=lerpf(left_leg.rotation.x,0,delta*12);right_leg.rotation.x=-left_leg.rotation.x
		doll.position.y=sin(elapsed*2)*.018
	if swing>0:
		swing-=delta;right_arm.rotation.x=-1.2;right_arm.rotation.y=sin(swing/.32*PI)*2.0
	else:
		right_arm.rotation.x=left_leg.rotation.x*.6;right_arm.rotation.y=0
	rune.rotation.y=elapsed*.7;rune.position.y=1.75+sin(elapsed*2)*.08
	if dialog_open:prompt.text=""
	elif hero.position.distance_to(Vector3(2.9,hero.position.y,5.1))<2.4:prompt.text="E  ·  触碰蓝色符文" if not solved else "◆  符文已点亮"
	elif hero.position.distance_to(Vector3(-2.7,hero.position.y,-4.5))<2.5:prompt.text="E  ·  与长老交谈"
	else:prompt.text=""
	if hero.position.z < -10.8 and solved:
		objective.text="◆  已抵达北门 ·  星溪村样板探索完成！"

func capture() -> void:
	camera.size=29
	for i in range(90):await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://evidence/village.png")
	hero.position=Vector3(2.9,.3,6.6)
	camera.size=23
	interact()
	for i in range(20):await get_tree().process_frame
	await RenderingServer.frame_post_draw
	get_viewport().get_texture().get_image().save_png("res://evidence/quiz.png")
	print("CAPTURE_SAVED")
	get_tree().quit()

func verify() -> void:
	for i in range(20):await get_tree().physics_frame
	report["spawn_grounded"]=hero.is_on_floor()
	report["painted_materials_loaded"]=painted_surfaces>=6
	await verify_cardinal_controls()
	verification_mode=false
	var before := hero.position
	var key := InputEventKey.new()
	key.keycode=KEY_D;key.physical_keycode=KEY_D;key.pressed=true
	Input.parse_input_event(key)
	for i in range(20):await get_tree().physics_frame
	key=InputEventKey.new()
	key.keycode=KEY_D;key.physical_keycode=KEY_D;key.pressed=false
	Input.parse_input_event(key)
	await get_tree().physics_frame
	report["keyboard_moves_player"]=hero.position.distance_to(before) > .5
	key=InputEventKey.new();key.keycode=KEY_TAB;key.pressed=true
	get_viewport().push_input(key)
	await get_tree().process_frame
	report["tab_toggles_overview"]=overview
	overview=false
	verification_mode=true
	# Drive in world axes through the normal physics loop using camera-relative vectors.
	await drive(Vector3(-7,0,-3.25),Vector3(0,0,1),70)
	report["water_blocks"]=hero.position.z < -.8
	await drive(Vector3(0,.4,3.6),Vector3(0,0,-1),85)
	report["bridge_crossable"]=hero.position.z < -.9 and hero.position.y > -.1
	await drive(Vector3(-7,.4,-2.8),Vector3(0,0,-1),75)
	report["house_blocks"]=hero.position.z > -4.0
	hero.position=Vector3(2.9,.3,6.6)
	await get_tree().physics_frame
	interact()
	report["rune_opens_quiz"]=dialog_open
	answer(1)
	report["wrong_keeps_gate_closed"]=not solved and dialog_open
	answer(0)
	for i in range(85):await get_tree().physics_frame
	report["correct_opens_gate"]=solved and gate.get_child(0).disabled and gate_visual.position.y < -2.7
	await drive(Vector3(0,.4,-8.8),Vector3(0,0,-1),45)
	report["open_gate_crossable"]=hero.position.z < -10.8
	# Closed state can still be physically tested without changing game progression.
	gate.get_child(0).disabled=false
	await drive(Vector3(0,.4,-8.8),Vector3(0,0,-1),45)
	report["closed_gate_blocks"]=hero.position.z > -9.9
	var all_ok := true
	for value in report.values():all_ok=all_ok and value
	report["all_passed"]=all_ok
	var f := FileAccess.open("res://evidence/verification.json",FileAccess.WRITE)
	f.store_string(JSON.stringify(report,"  "))
	print("VERIFICATION ",JSON.stringify(report))
	get_tree().quit(0 if all_ok else 1)

func drive(start: Vector3, world_direction: Vector3, frames: int) -> void:
	hero.position=start;hero.velocity=Vector3.ZERO
	var right := camera.global_basis.x
	var forward := Vector3(camera.global_basis.z.x,0,camera.global_basis.z.z).normalized()
	motion=Vector2(world_direction.dot(right),world_direction.dot(forward))
	for i in range(frames):await get_tree().physics_frame
	motion=Vector2.ZERO

func verify_cardinal_controls() -> void:
	controls_probe=true
	report["world_axes_match_screen_axes"]=camera.global_basis.x.dot(Vector3.RIGHT) > .9999
	var distances: Array[float] = []
	for entry in [[KEY_UP,Vector2(0,-1)],[KEY_DOWN,Vector2(0,1)],[KEY_LEFT,Vector2(-1,0)],[KEY_RIGHT,Vector2(1,0)]]:
		hero.position=Vector3(0,.1,-5);hero.velocity=Vector3.ZERO
		for i in range(8):await get_tree().physics_frame
		var start := camera.unproject_position(Vector3(hero.position.x,.1,hero.position.z))
		verification_mode=false
		var key := InputEventKey.new();key.physical_keycode=entry[0];key.keycode=entry[0];key.pressed=true
		Input.parse_input_event(key)
		for i in range(12):await get_tree().physics_frame
		key=InputEventKey.new();key.physical_keycode=entry[0];key.keycode=entry[0];key.pressed=false
		Input.parse_input_event(key)
		await get_tree().physics_frame
		verification_mode=true
		var offset := camera.unproject_position(Vector3(hero.position.x,.1,hero.position.z))-start
		var expected: Vector2=entry[1]
		report["key_%s_screen_aligned" % OS.get_keycode_string(entry[0])]=offset.dot(expected)>8 and absf(offset.cross(expected))<.75
		distances.append(offset.length())
	report["vertical_horizontal_screen_speed_matches"]=absf(distances[0]/distances[3]-1)<.1
	controls_probe=false

func update_focus() -> void:
	if camera.attributes==null:return
	var focus := CAMERA_OFFSET.length() if overview or capture_mode else -camera.to_local(hero.position+Vector3.UP).z
	camera.attributes.dof_blur_near_distance=focus-6.5
	camera.attributes.dof_blur_far_distance=focus+7.0

func crescent(parent: Node3D, at: Vector3, mat: Material) -> void:
	var points := PackedVector2Array([Vector2(0,0),Vector2(-.22,.10),Vector2(-.32,.28),Vector2(-.28,.47),Vector2(-.17,.58),Vector2(-.19,.36),Vector2(-.08,.24),Vector2(.08,.25),Vector2(.22,.37),Vector2(.28,.55),Vector2(.33,.33),Vector2(.24,.10),Vector2(.1,.02)])
	var triangles := Geometry2D.triangulate_polygon(points)
	var st := SurfaceTool.new();st.begin(Mesh.PRIMITIVE_TRIANGLES)
	for z in [-.065,.065]:
		for i in range(0,triangles.size(),3):
			for j in ([0,1,2] if z>0 else [2,1,0]):
				var p := points[triangles[i+j]];st.add_vertex(Vector3(p.x,p.y,z))
	for i in range(points.size()):
		var a := points[i];var b := points[(i+1)%points.size()]
		for v in [Vector3(a.x,a.y,-.065),Vector3(b.x,b.y,-.065),Vector3(b.x,b.y,.065),Vector3(a.x,a.y,-.065),Vector3(b.x,b.y,.065),Vector3(a.x,a.y,.065)]:st.add_vertex(v)
	st.generate_normals()
	var m := mat.duplicate() as StandardMaterial3D;m.cull_mode=BaseMaterial3D.CULL_DISABLED
	mesh(parent,st.commit(),at,m)

func apply_painted_materials(root: Node) -> void:
	# Explicit original reference materials; world-space mapping also works on merged GLB meshes.
	var settings := {
		"grass":[Vector2(0,0),.24,Color("b9c9a3"),.72],
		"path":[Vector2(1,0),.55,Color("e8dabf"),.85],
		"stone":[Vector2(1,0),.55,Color("c4c6bb"),.70],
		"clay":[Vector2(0,1),.65,Color("d8b59a"),.94],
		"claylight":[Vector2(0,1),.65,Color("edc29a"),.94],
		"cream":[Vector2(1,1),.50,Color("eadfc6"),.85],
		"wood":[Vector2(1,1),.5,Color("684022"),.8],
		"plank":[Vector2(1,1),.7,Color("a46b35"),.8]
	}
	if root is MeshInstance3D:
		for surface in range(root.mesh.get_surface_count()):
			var source: Material = root.mesh.surface_get_material(surface)
			var name_s: String = source.resource_name if source else ""
			if not settings.has(name_s):continue
			var values: Array=settings[name_s]
			var paint := ShaderMaterial.new()
			paint.shader=load("res://textures/soft_painted.gdshader")
			paint.set_shader_parameter("atlas",load("res://textures/soft-fantasy-material-atlas.png"))
			paint.set_shader_parameter("quadrant",values[0])
			paint.set_shader_parameter("world_scale",values[1])
			paint.set_shader_parameter("tint",values[2])
			paint.set_shader_parameter("contrast",values[3])
			root.set_surface_override_material(surface,paint)
			painted_surfaces+=1
	for child in root.get_children():apply_painted_materials(child)
