extends Node3D

const SURFACE_SHADER := preload("res://textures/observatory_desk_surface.gdshader")
const DETAILS := preload("res://observatory-desk-finish.glb")

func install(room: Node3D) -> void:
	var room_origin := room.global_position
	for entry in room.find_children("Room_*", "MeshInstance3D", true, false):
		var mesh := entry as MeshInstance3D
		var kind := surface_kind(mesh.name)
		if kind < 0:
			continue
		for surface in mesh.mesh.get_surface_count():
			var original := mesh.get_active_material(surface) as StandardMaterial3D
			if original == null:
				continue
			var finish := ShaderMaterial.new()
			finish.shader = SURFACE_SHADER
			finish.set_shader_parameter("room_origin", room_origin)
			finish.set_shader_parameter("kind", kind)
			finish.set_shader_parameter("base_color", original.albedo_color)
			finish.set_shader_parameter("base_roughness", original.roughness)
			mesh.set_surface_override_material(surface, finish)

	add_child(DETAILS.instantiate())

	var wash := SpotLight3D.new()
	wash.name = "RightWindowBounce"
	wash.position = Vector3(3.33, 1.91, -3.23)
	wash.light_color = Color("ffdbad")
	wash.light_energy = .36
	wash.spot_range = 3.6
	wash.spot_angle = 39.0
	wash.spot_attenuation = 1.29
	add_child(wash)
	wash.look_at(to_global(Vector3(2.37, .06, -1.41)))

func surface_kind(name: String) -> int:
	if name.begins_with("Room_floor"):
		return 0
	if name in ["Room_wood", "Room_wood_dark", "Room_wood_light"]:
		return 1
	if name in ["Room_stone", "Room_stone_light", "Room_slate_light"]:
		return 2
	if name in ["Room_blue", "Room_blue_dark"]:
		return 3
	return -1
