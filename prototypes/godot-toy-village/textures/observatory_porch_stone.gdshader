shader_type spatial;
render_mode diffuse_burley, specular_schlick_ggx;

uniform vec4 stone_color : source_color = vec4(1.0);
uniform float clay_roughness = .88;
uniform float clay_specular = .16;
varying vec3 world_p;

void vertex() {
    world_p = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

float grain(vec2 p) {
    vec2 cell = floor(p);
    vec2 f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(cell), hash(cell + vec2(1, 0)), f.x),
               mix(hash(cell + vec2(0, 1)), hash(cell + vec2(1)), f.x), f.y);
}

void fragment() {
    vec2 stone_position = world_p.xz + vec2(.24, -.78) * world_p.y;
    float main_lane = 1.0 - smoothstep(.92, 1.52, abs(world_p.x - 1.15));
    float porch_depth = smoothstep(1.60, 1.98, world_p.z) * (1.0 - smoothstep(6.61, 6.97, world_p.z));
    float g = grain(stone_position * vec2(2.45, 3.71));
    float trace = grain(stone_position * 10.4);
    float weathering = smoothstep(.32, .68, g *.81 + trace *.19);
    vec3 glaze = mix(vec3(.90, .86, .80), vec3(1.025, 1.02, 1.00), weathering);
    ALBEDO = stone_color.rgb * mix(vec3(1.0), glaze, main_lane * porch_depth);
    ROUGHNESS = clay_roughness;
    SPECULAR = clay_specular;
}
