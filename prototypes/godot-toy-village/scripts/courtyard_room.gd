extends Node3D

const ORIGIN := Vector3(36.0, 0.0, 0.0)
const ENTRY := Vector3(0.0, 0.12, 2.83)
const THRESHOLD := Vector3(0.0, 0.03, 4.18)
const INSTRUMENT := Vector3(2.40, 0.03, -1.66)
const GATE_APPROACH := Vector3(-0.28, 0.03, -2.84)
const CHART_APPROACH := Vector3(-0.28, 0.03, -5.53)
const GATE_HINGE := Vector3(-1.07, 0.0, -3.435)

var gate_collision: CollisionShape3D
var gate_meshes: Array[MeshInstance3D] = []
var gate_closed_transforms: Array[Transform3D] = []
var chart_meshes: Array[MeshInstance3D] = []
var indicator_material: StandardMaterial3D
var indicator_light: OmniLight3D
var gate_open := false
var gate_angle := 0.0
var gate_tween: Tween

func install(asset: PackedScene, observatory_enabled := false) -> void:
	position = ORIGIN
	var model := asset.instantiate()
	add_child(model)
	block("RoomFloor", Vector3(0.0, -0.22, 0.0), Vector3(10.26, 0.50, 9.20))
	if observatory_enabled:
		install_observatory(model)
	else:
		block("BackWall", Vector3(0.0, 1.10, -3.83), Vector3(9.62, 2.2, 0.66))
	for side in [-1.0, 1.0]:
		# The full-length bases keep the cutaway wall edges closed at floor level.
		block("SideWall", Vector3(side * 4.78, 1.10, 0.24), Vector3(0.66, 2.2, 7.86))
		block("FrontWall", Vector3(side * 2.83, 0.47, 4.33), Vector3(3.96, 0.94, 0.46))
	# Keep the player on the floor until they use E at the visible threshold.
	block("ThresholdLimit", Vector3(0.0, 0.86, 4.59), Vector3(1.8, 1.75, 0.16))
	block("Bookcase", Vector3(-3.03, 0.98, -2.95), Vector3(1.7, 1.96, 0.70))
	block("Desk", Vector3(2.4, 0.47, -2.57), Vector3(2.0, 0.94, 1.05))
	block("Chest", Vector3(3.35, 0.32, -0.69), Vector3(1.05, 0.64, 0.72))
	practical("WestSconce", Vector3(-1.8, 1.63, -3.20), Color("ffc986"), 0.58, 3.8)
	practical("EastSconce", Vector3(1.7, 1.63, -3.20), Color("ffc986"), 0.58, 3.8)
	practical("WindowFill", Vector3(3.35, 2.1, -3.30), Color("a4c5e6"), 0.23, 3.2)

func block(node_name: String, center: Vector3, size: Vector3) -> CollisionShape3D:
	var wall := StaticBody3D.new()
	wall.name = node_name
	wall.position = center
	var shape := BoxShape3D.new()
	shape.size = size
	var collider := CollisionShape3D.new()
	collider.shape = shape
	wall.add_child(collider)
	add_child(wall, true)
	return collider

func practical(node_name: String, center: Vector3, tint: Color, energy: float, reach: float) -> OmniLight3D:
	var light := OmniLight3D.new()
	light.name = node_name
	light.position = center
	light.light_color = tint
	light.light_energy = energy
	light.omni_range = reach
	light.omni_attenuation = 1.7
	add_child(light)
	return light

func install_observatory(model: Node) -> void:
	block("WestObservatoryJamb", Vector3(-3.01, 1.10, -3.83), Vector3(3.82, 2.2, 0.66))
	block("EastObservatoryJamb", Vector3(2.71, 1.10, -3.83), Vector3(4.34, 2.2, 0.66))
	gate_collision = block("ObservatoryGate", Vector3(-0.28, 1.08, -3.47), Vector3(1.72, 2.16, 0.41))
	block("ObservatoryFloor", Vector3(-0.28, -0.22, -5.70), Vector3(3.79, 0.50, 3.28))
	block("WestObservatoryRailing", Vector3(-2.04, 0.71, -5.69), Vector3(0.44, 1.42, 3.18))
	block("EastObservatoryRailing", Vector3(1.48, 0.71, -5.69), Vector3(0.44, 1.42, 3.18))
	block("NorthObservatoryRailing", Vector3(-0.28, 0.71, -7.15), Vector3(3.8, 1.42, 0.4))
	block("ChartLectern", Vector3(-0.28, 0.38, -6.40), Vector3(1.22, 0.76, 0.77))
	block("RefractorTripod", Vector3(.82, 0.58, -6.78), Vector3(0.70, 1.16, 0.63))
	for node in model.find_children("Gate_*", "MeshInstance3D", true, false):
		var leaf := node as MeshInstance3D
		gate_meshes.append(leaf)
		gate_closed_transforms.append(leaf.transform)
	for node in model.find_children("Chart_*", "MeshInstance3D", true, false):
		chart_meshes.append(node as MeshInstance3D)
	var lens := model.find_child("Observatory_Lens", true, false) as MeshInstance3D
	if lens:
		indicator_material = (lens.mesh.surface_get_material(0) as StandardMaterial3D).duplicate()
		lens.set_surface_override_material(0, indicator_material)
	indicator_light = practical("PhotometerSignal", Vector3(2.47, 1.55, -2.48), Color("65dfd0"), 0.0, 1.7)
	practical("ObservatoryWarmFill", Vector3(-0.90, 2.14, -5.98), Color("ffcf85"), 0.30, 3.5)

func set_observatory_powered(powered: bool) -> void:
	if indicator_material:
		indicator_material.albedo_color = Color("62b6a9") if powered else Color("775148")
		indicator_material.emission_enabled = powered
		indicator_material.emission = Color("62d8c4")
		indicator_material.emission_energy_multiplier = 0.65
	if indicator_light:
		indicator_light.light_energy = 0.65 if powered else 0.0

func set_observatory_unlocked(unlocked: bool) -> void:
	if not gate_collision or unlocked == gate_open:
		return
	gate_open = unlocked
	if gate_tween and gate_tween.is_running():
		gate_tween.kill()
	var target_angle := deg_to_rad(98.0) if unlocked else 0.0
	if not is_inside_tree() or not is_visible_in_tree():
		set_gate_angle(target_angle)
		gate_collision.set_deferred("disabled", unlocked)
		return
	if not unlocked:
		gate_collision.set_deferred("disabled", false)
	gate_tween = create_tween().set_trans(Tween.TRANS_CUBIC).set_ease(Tween.EASE_OUT)
	gate_tween.tween_method(set_gate_angle, gate_angle, target_angle, 0.50)
	if unlocked:
		gate_tween.tween_callback(gate_collision.set_deferred.bind("disabled", true))

func set_gate_angle(angle: float) -> void:
	gate_angle = angle
	var turn := Basis(Vector3.UP, angle)
	var around_hinge := Transform3D(turn, GATE_HINGE - turn * GATE_HINGE)
	for index in gate_meshes.size():
		gate_meshes[index].transform = around_hinge * gate_closed_transforms[index]

func set_chart_claimed(claimed: bool) -> void:
	for part in chart_meshes:
		part.visible = not claimed
