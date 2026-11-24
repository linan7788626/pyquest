shader_type spatial;
render_mode diffuse_burley;

uniform vec4 base_color : source_color;
uniform vec3 room_origin;
uniform float base_roughness : hint_range(0.0, 1.0) = 0.8;
uniform int kind;
varying vec3 room_position;

float hash_cell(vec2 p) {
	return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float mottling(vec2 point) {
	vec2 cell = floor(point);
	vec2 mix_at = fract(point);
	mix_at = mix_at * mix_at * (3.0 - 2.0 * mix_at);
	return mix(
		mix(hash_cell(cell), hash_cell(cell + vec2(1.0, 0.0)), mix_at.x),
		mix(hash_cell(cell + vec2(0.0, 1.0)), hash_cell(cell + vec2(1.0)), mix_at.x),
		mix_at.y
	);
}

float foot_contact(vec2 p, vec2 foot) {
	return 1.0 - smoothstep(0.06, 0.37, length((p - foot) * vec2(1.0, 1.14)));
}

// Trace the incoming daylight back to the right window in room coordinates.
float sun_patch(vec3 p) {
	float depth = p.z + 3.27;
	vec2 aperture = vec2(p.x + 0.55 * depth - 3.32, p.y + 0.92 * depth - 1.72);
	float arch = sqrt(max(0.0, 1.0 - pow(max(0.0, aperture.y - 0.09) / 0.41, 2.0)));
	float frame = max(abs(aperture.x) - 0.44 * arch, max(-aperture.y - 0.39, aperture.y - 0.50));
	float softness = 0.035 + max(0.0, depth) * 0.028;
	float opening = 1.0 - smoothstep(-softness, softness, frame);
	float mullion = min(abs(aperture.x), abs(aperture.y - 0.018));
	float penumbra = mix(0.63, 1.0, smoothstep(0.012, 0.085, mullion));
	return opening * penumbra * smoothstep(0.01, 0.23, depth);
}

void vertex() {
	room_position = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz - room_origin;
}

void fragment() {
	vec3 p = room_position;
	vec2 floor_p = p.xz;
	vec3 pigment = base_color.rgb;
	float warmth = sun_patch(p);
	float roughness = base_roughness;
	if (kind == 0) {
		float focus = 1.0 - smoothstep(0.9, 3.9, length((floor_p - vec2(1.35, 0.07)) * vec2(1.1, 0.72)));
		float tone = 0.9 + 0.17 * mottling(floor_p * 1.74) + 0.045 * mottling(floor_p * 8.0);
		pigment *= mix(1.0, tone, focus);
		float desk_feet = max(
			max(foot_contact(floor_p, vec2(1.61, -2.2)), foot_contact(floor_p, vec2(3.19, -2.2))),
			max(foot_contact(floor_p, vec2(3.19, -2.94)), foot_contact(floor_p, vec2(1.61, -2.94)))
		);
		float under_desk = 1.0 - smoothstep(0.25, 1.25, length((floor_p - vec2(2.42, -2.57)) * vec2(1.0, 1.9)));
		float sill = (1.0 - smoothstep(0.65, 1.23, abs(p.x))) * (1.0 - smoothstep(0.04, 0.68, abs(p.z - 4.08)));
		float contact = max(max(0.26 * desk_feet, 0.15 * under_desk), 0.14 * sill);
		pigment *= mix(vec3(1.0), vec3(0.61, 0.65, 0.64), contact);
		warmth *= 1.0 - 0.89 * under_desk;
	} else if (kind == 1) {
		float desktop = (1.0 - smoothstep(0.92, 1.21, abs(p.x - 2.4)))
			* (1.0 - smoothstep(0.53, 0.67, abs(p.z + 2.57)))
			* smoothstep(0.7, 0.93, p.y);
		float flowing_fiber = 0.85 + 0.20 * mottling(vec2(p.x * 1.54, p.z * 23.0))
			+ 0.07 * mottling(vec2(p.x * 3.7, p.z * 10.3));
		pigment *= mix(1.0, flowing_fiber, desktop);
		roughness = mix(base_roughness, 0.62, desktop);
		warmth *= desktop;
	} else if (kind == 2) {
		float near_sill = 1.0 - smoothstep(0.22, 1.0, length((floor_p - vec2(0.0, 4.33)) * vec2(0.5, 1.7)));
		float worn_color = 0.91 + 0.14 * mottling(p.xz * 4.4);
		pigment *= mix(1.0, worn_color, near_sill);
		warmth *= near_sill * 0.4;
	} else {
		float on_rug = (1.0 - smoothstep(1.03, 1.16, abs(p.x))) * (1.0 - smoothstep(1.73, 1.84, abs(p.z - 0.55)));
		float cloth_tone = 0.84 + 0.20 * mottling(vec2(p.x * 23.0, p.z * 3.9)) + 0.055 * mottling(floor_p * 1.1);
		pigment *= mix(1.0, cloth_tone, on_rug);
		warmth *= on_rug * 0.8;
	}
	ALBEDO = pigment * mix(vec3(1.0), vec3(1.20, 1.08, 0.89), warmth);
	EMISSION = vec3(0.079, 0.047, 0.019) * warmth;
	ROUGHNESS = roughness;
}
