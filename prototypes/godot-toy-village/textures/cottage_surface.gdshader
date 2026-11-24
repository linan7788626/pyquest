shader_type spatial;
render_mode diffuse_burley, specular_schlick_ggx;
uniform sampler2D atlas : source_color, filter_linear_mipmap_anisotropic, repeat_disable;
uniform vec2 quadrant=vec2(0.0);
uniform vec4 tint : source_color=vec4(1.0);
uniform float roughness_value=.85;
uniform float uv_scale=1.0;
uniform bool whole_texture=false;
void fragment(){
    vec2 repeated=1.0-abs(mod(UV*uv_scale,2.0)-1.0);
    vec2 uv=quadrant*.5+vec2(.002)+repeated*.496;
    ALBEDO=texture(atlas,whole_texture ? repeated : uv).rgb*tint.rgb;
    ROUGHNESS=roughness_value;
    METALLIC=0.0;
}
