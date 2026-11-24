extends Node3D

const GROUND_SHADER := preload("res://textures/cottage_ground_clay.gdshader")
const STONE_SHADER := preload("res://textures/observatory_porch_stone.gdshader")
const PORCH_ART := preload("res://observatory-porch.glb")

func install(study_model: Node3D) -> void:
	add_child(PORCH_ART.instantiate())
	for item in study_model.find_children("*", "MeshInstance3D", true, false):
		var surface := item as MeshInstance3D
		if not surface.mesh:
			continue
		for index in surface.mesh.get_surface_count():
			var current := surface.get_surface_override_material(index)
			if current is ShaderMaterial and current.shader == GROUND_SHADER:
				current.set_shader_parameter("porch_finish", 1.0)
			var source := surface.mesh.surface_get_material(index)
			if source and source.resource_name == "stone_light" and current is StandardMaterial3D:
				var porous_clay := ShaderMaterial.new()
				porous_clay.shader = STONE_SHADER
				porous_clay.set_shader_parameter("stone_color", current.albedo_color)
				porous_clay.set_shader_parameter("clay_roughness", current.roughness)
				porous_clay.set_shader_parameter("clay_specular", current.metallic_specular)
				surface.set_surface_override_material(index, porous_clay)
