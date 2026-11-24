shader_type spatial;
render_mode diffuse_burley, specular_schlick_ggx;
uniform sampler2D atlas : source_color, filter_linear_mipmap, repeat_disable;
uniform vec2 quadrant = vec2(0.0);
uniform float world_scale = 0.25;
uniform vec4 tint : source_color = vec4(1.0);
uniform float matte = 0.8;
uniform float contrast = 0.85;
varying vec3 world_pos;
varying vec3 world_normal;
void vertex() {
    world_pos = (MODEL_MATRIX * vec4(VERTEX, 1.0)).xyz;
    world_normal = normalize(MODEL_NORMAL_MATRIX * NORMAL);
}
vec3 swatch(vec2 p) {
    // Mirrored repeat stays inside each quadrant and avoids hard atlas boundary seams.
    vec2 repeated = 1.0 - abs(mod(p, 2.0) - 1.0);
    vec2 uv = quadrant * 0.5 + vec2(0.002) + repeated * 0.496;
    return texture(atlas, uv).rgb;
}
void fragment() {
    vec3 weights = pow(abs(world_normal), vec3(6.0));
    weights /= max(dot(weights,vec3(1.0)),0.0001);
    vec3 paint = swatch(world_pos.zy * world_scale) * weights.x
        + swatch(world_pos.xz * world_scale) * weights.y
        + swatch(world_pos.xy * world_scale) * weights.z;
    float luminance = dot(paint, vec3(0.2126,0.7152,0.0722));
    ALBEDO = mix(vec3(luminance),paint,contrast) * tint.rgb;
    ROUGHNESS = matte;
    METALLIC = 0.0;
}
