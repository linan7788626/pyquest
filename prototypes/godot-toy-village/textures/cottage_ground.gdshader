shader_type spatial;
render_mode diffuse_burley;
uniform sampler2D grass : source_color, filter_linear_mipmap_anisotropic, repeat_enable;
uniform sampler2D atlas : source_color, filter_linear_mipmap_anisotropic, repeat_disable;
varying vec3 world_p;
varying vec3 world_n;
void vertex(){world_p=(MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;world_n=normalize(MODEL_NORMAL_MATRIX*NORMAL);}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
void fragment(){
    vec2 p=world_p.xz;
    // Two incongruent scales reduce detectable repetitions without mirrored leaf medallions.
    vec3 meadow=texture(grass,p*.145).rgb*.65+texture(grass,p*.211+vec2(.37,.21)).rgb*.35;
    meadow=mix(meadow,vec3(.18,.245,.045),.30);
    float bend=1.15+.25*sin(p.y*.9);
    vec2 line=vec2(bend,clamp(p.y,2.4,8.0));
    float main_path=length(p-line)-.88;
    float side_path=length(p-vec2(clamp(p.x,-5.4,1.4),3.6))-.58;
    float d=min(main_path,side_path)+(noise(p*3.0)-.5)*.22;
    float path=1.0-smoothstep(-.03,.28,d);
    vec2 stone_uv=vec2(.5)+vec2(.002)+(1.0-abs(mod(p*.25,2.0)-1.0))*.496;
    vec3 dirt=texture(atlas,stone_uv).rgb*vec3(.89,.64,.32);
    dirt*=.90+noise(p*1.7)*.20;
    ALBEDO=mix(meadow,dirt,path);
    ROUGHNESS=.96;
}
