extends "res://scripts/village.gd"
## House_Orange art study; all screenshots are actual viewport pixels.
var study_model: Node3D
var ui_layer: CanvasLayer
var view_index := 0
var study_dof: CameraAttributesPractical
var show_ui := true
var actual_painted := 0
var interaction_text: Label
var still_frames := 0
var fps_sample: Array[float] = []
const VIEW_NAMES := ["游戏视角", "屋檐与门窗", "三分之四检查"]

func _ready() -> void:
	capture_mode="--capture-study" in OS.get_cmdline_user_args()
	verification_mode="--verify-study" in OS.get_cmdline_user_args()
	var f := SystemFont.new();f.font_names=PackedStringArray(["PingFang SC","Noto Sans CJK SC","Arial"]);font=f
	study_model=load("res://cottage-study.glb").instantiate()
	add_child(study_model)
	paint_study(study_model)
	lighting()
	solid("Ground",Vector3(0,-.20,1),Vector3(17,.46,14))
	solid("House",Vector3(0,2.5,-.9),Vector3(6.85,5,4.85))
	solid("Bench",Vector3(-4.55,.6,3),Vector3(2.0,1.2,.9))
	for p in [Vector3(4.2,.5,.2),Vector3(4.65,.5,-.8)]:solid("Barrel",p,Vector3(.9,1,.9))
	for x in [-8.35,8.35]:solid("Boundary",Vector3(x,.6,1),Vector3(.2,2,14))
	for z in [-5.85,7.85]:solid("Boundary",Vector3(0,.6,z),Vector3(17,2,.2))
	make_hero()
	hero.position=Vector3(-1.0,.1,5.7)
	hero.scale=Vector3.ONE*.72
	hero.hide()
	camera=Camera3D.new();camera.projection=Camera3D.PROJECTION_ORTHOGONAL
	add_child(camera);camera.current=true;camera.near=.1;camera.far=150
	study_dof=CameraAttributesPractical.new()
	study_dof.dof_blur_near_enabled=true;study_dof.dof_blur_far_enabled=true
	study_dof.dof_blur_near_transition=3;study_dof.dof_blur_far_transition=4
	study_dof.dof_blur_amount=0 # Clear subject is the default for judging asset quality.
	camera.attributes=study_dof;dof_enabled=false
	set_view(0)
	study_ui()
	if capture_mode:capture_study.call_deferred()
	if verification_mode:verify_study.call_deferred()

func lighting() -> void:
	var world := WorldEnvironment.new();var e := Environment.new()
	e.background_mode=Environment.BG_COLOR;e.background_color=Color("a1b3b7")
	e.ambient_light_source=Environment.AMBIENT_SOURCE_COLOR
	e.ambient_light_color=Color("b4c4c4");e.ambient_light_energy=.42
	e.tonemap_mode=Environment.TONE_MAPPER_FILMIC
	e.ssao_enabled=true;e.ssao_radius=.55;e.ssao_intensity=1.1;e.ssao_power=1.15
	e.ssil_enabled=true;e.ssil_radius=1.7;e.ssil_intensity=.40
	world.environment=e;add_child(world)
	var sun := DirectionalLight3D.new();sun.rotation_degrees=Vector3(-48,-36,0)
	sun.light_color=Color("ffe2b9");sun.light_energy=1.0;sun.shadow_enabled=true
	sun.directional_shadow_max_distance=45;sun.shadow_bias=.08;sun.shadow_normal_bias=1.0
	sun.directional_shadow_blend_splits=true;sun.light_angular_distance=3.5;add_child(sun)
	var fill := DirectionalLight3D.new();fill.rotation_degrees=Vector3(-20,135,0)
	fill.light_color=Color("a9c5e4");fill.light_energy=.20;add_child(fill)
	cube(self,Vector3(0,-1.6,0),Vector3(200,.1,200),material(Color("a1b3b7"),0,1))

func paint_study(root: Node) -> void:
	# Clay finish: a small coordinated palette, no wood-grain/crack/noise textures.
	var palette := {
		"plaster":"eadabc", "plaster_light":"eadabc",
		"oak":"986f4c", "oak_light":"a67b53", "oak_dark":"70533a",
		"clay":"23649d", "clay_light":"23649d", "clay_dark":"205989", "clay_edge":"23649d",
		"stone":"b4aa93", "stone_light":"c6b99f", "stone_dark":"a49e8d",
		"earth":"a0805d", "rim":"587166",
		"leaf":"739655", "leaf_light":"85a65e", "leaf_dark":"567e4c",
		"petal":"dc9a83", "petal_white":"f1dfaf", "gold":"c7aa70",
		"glass":"4a7c8b", "glass_light":"64929e", "iron":"716857", "soil":"68523b"
	}
	if root is MeshInstance3D:
		var node := root as MeshInstance3D
		for i in range(node.mesh.get_surface_count()):
			var source: Material=node.mesh.surface_get_material(i)
			var key: String=source.resource_name if source else ""
			if key=="ground":
				var ground := ShaderMaterial.new()
				ground.shader=load("res://textures/cottage_ground_clay.gdshader")
				ground.set_shader_parameter("grass_color",Color("9eb675"))
				ground.set_shader_parameter("path_color",Color("d0b58b"))
				node.set_surface_override_material(i,ground);actual_painted+=1
			elif palette.has(key):
				var clay := material(Color(palette[key]),0,.72)
				clay.metallic_specular=.30
				if key.begins_with("clay"):
					clay.roughness=.60;clay.metallic_specular=.34
				if key.begins_with("glass"):
					clay.roughness=.42;clay.metallic_specular=.40
				node.set_surface_override_material(i,clay)
				actual_painted+=1
	for child in root.get_children():paint_study(child)

func set_view(index: int) -> void:
	view_index=index
	var target := Vector3(0,2.0,.3)
	var offset := Vector3(0,15.0,20.0)
	camera.size=13.2
	if index==1:
		target=Vector3(.1,3.5,1.2);offset=Vector3(0,10,19);camera.size=7.8
	elif index==2:
		target=Vector3(0,2.4,-.3);offset=Vector3(-15,12,19);camera.size=11.8
	camera.position=target+offset;camera.look_at(target)
	var focus := -camera.to_local(target).z
	study_dof.dof_blur_near_distance=focus-6;study_dof.dof_blur_far_distance=focus+5
	if interaction_text:interaction_text.text="%s  ·  %s" % [VIEW_NAMES[index],"轻景深" if dof_enabled else "清晰查看"]

func study_ui() -> void:
	ui_layer=CanvasLayer.new();add_child(ui_layer)
	var root := Control.new();root.set_anchors_and_offsets_preset(Control.PRESET_FULL_RECT);root.mouse_filter=Control.MOUSE_FILTER_IGNORE;ui_layer.add_child(root)
	var top := VBoxContainer.new();top.position=Vector2(58,48);top.add_theme_constant_override("separation",7);root.add_child(top)
	top.add_child(label("PYQUEST   /   SOFT FANTASY / CLAY STUDY 05",21,Color("5b624f")))
	top.add_child(label("蓝瓦小屋 · 林间院落",42,Color("3c4c43")))
	top.add_child(label("圆润形体 · 简化细节 · 黏土质感",23,Color("536553")))
	var bottom := PanelContainer.new();bottom.set_anchors_and_offsets_preset(Control.PRESET_BOTTOM_WIDE);bottom.offset_left=58;bottom.offset_right=-58;bottom.offset_top=-112;bottom.offset_bottom=-40
	bottom.add_theme_stylebox_override("panel",style(Color("233329ee"),Color("827b5955"),14));root.add_child(bottom)
	var row := HBoxContainer.new();bottom.add_child(row)
	interaction_text=label("游戏视角  ·  清晰查看",23,Color("f0dfb9"));interaction_text.size_flags_horizontal=Control.SIZE_EXPAND_FILL;row.add_child(interaction_text)
	row.add_child(label("1 游戏视角   2 细节   3 检查角度   F 景深   H 人物   WASD 移动   V 村庄",21,Color("c7d1bf")))
	var tag := label("2560 × 1440  /  原生渲染",22,Color("536553"));tag.set_anchors_and_offsets_preset(Control.PRESET_TOP_RIGHT);tag.position=Vector2(-380,60);root.add_child(tag)

func _input(event: InputEvent) -> void:
	if event is InputEventKey and event.pressed and not event.echo:
		if event.keycode in [KEY_1,KEY_2,KEY_3]:set_view(event.keycode-KEY_1)
		if event.keycode==KEY_F:
			dof_enabled=not dof_enabled;study_dof.dof_blur_amount=.035 if dof_enabled else 0.0;set_view(view_index)
		if event.keycode==KEY_H:hero.visible=not hero.visible
		if event.keycode==KEY_U:show_ui=not show_ui;ui_layer.visible=show_ui
		if event.keycode==KEY_V:get_tree().change_scene_to_file("res://village.tscn")
		if event.keycode==KEY_R:hero.position=Vector3(-1,.1,5.7)
		if event.keycode in [KEY_J,KEY_SPACE]:swing=.32

func _physics_process(delta: float) -> void:
	elapsed+=delta
	var input := motion if verification_mode else (Vector2.ZERO if capture_mode else direction())
	var right := camera.global_basis.x
	var forward := Vector3(camera.global_basis.z.x,0,camera.global_basis.z.z).normalized()
	var d := right*input.x+forward*input.y/maxf(absf(camera.global_basis.y.dot(forward)),.5)
	if input.length()>.1:hero.show()
	hero.velocity.x=d.x*3.2;hero.velocity.z=d.z*3.2
	if not hero.is_on_floor():hero.velocity.y-=20*delta
	else:hero.velocity.y=0
	hero.move_and_slide()
	if hero.position.y < -3:hero.position=Vector3(-1,.1,5.7)
	if d.length()>.1:
		doll.rotation.y=lerp_angle(doll.rotation.y,atan2(d.x,d.z),minf(1,delta*14))
		left_leg.rotation.x=sin(elapsed*12)*.5;right_leg.rotation.x=-left_leg.rotation.x
		doll.position.y=absf(sin(elapsed*12))*.05
	else:
		left_leg.rotation.x=lerpf(left_leg.rotation.x,0,delta*12);right_leg.rotation.x=-left_leg.rotation.x
		if still_frames>100 and not capture_mode and not verification_mode:fps_sample.append(1.0/maxf(delta,.0001))
	still_frames+=1

func capture_study() -> void:
	var metadata := {"renderer":RenderingServer.get_current_rendering_method(),"images":[],"painted_surfaces":actual_painted,"dof":false}
	for index in range(3):
		set_view(index)
		for i in range(90):await get_tree().process_frame
		RenderingServer.force_draw()
		var im := get_viewport().get_texture().get_image()
		var path := "res://evidence/cottage-%s-1440p.png" % ["game","detail","inspection"][index]
		im.save_png(path)
		metadata.images.append({"path":path,"width":im.get_width(),"height":im.get_height()})
	var f := FileAccess.open("res://evidence/cottage-capture.json",FileAccess.WRITE);f.store_string(JSON.stringify(metadata,"  "))
	print("COTTAGE_CAPTURE ",JSON.stringify(metadata));get_tree().quit()

func verify_study() -> void:
	for i in range(20):await get_tree().physics_frame
	var results := {"grounded":hero.is_on_floor(),"painted_materials":actual_painted>=10,"configured_1440p":ProjectSettings.get_setting("display/window/size/viewport_width")==2560 and ProjectSettings.get_setting("display/window/size/viewport_height")==1440}
	set_view(0);results["main_view_cardinal"]=camera.global_basis.x.dot(Vector3.RIGHT)>.9999
	var started := hero.position;motion=Vector2(1,0)
	for i in range(20):await get_tree().physics_frame
	motion=Vector2.ZERO;results["player_moves"]=hero.position.x>started.x+.5
	hero.position=Vector3(0,.1,2.9);hero.velocity=Vector3.ZERO;motion=Vector2(0,-1)
	for i in range(60):await get_tree().physics_frame
	motion=Vector2.ZERO;results["house_collision"]=hero.position.z>1.7
	set_view(1);results["detail_view_closer"]=camera.size<8
	set_view(2);results["inspection_view"]=absf(camera.global_basis.x.z)>.1
	var all_ok := true
	for v in results.values():all_ok=all_ok and v
	results["all_passed"]=all_ok
	var f := FileAccess.open("res://evidence/cottage-verification.json",FileAccess.WRITE);f.store_string(JSON.stringify(results,"  "))
	print("COTTAGE_VERIFY ",JSON.stringify(results));get_tree().quit(0 if all_ok else 1)
