shader_type spatial;
render_mode diffuse_burley;
uniform vec4 grass_color : source_color = vec4(.58,.68,.39,1.0);
uniform vec4 path_color : source_color = vec4(.78,.66,.46,1.0);
uniform float courtyard_blend : hint_range(0.0, 1.0) = 0.0;
uniform float porch_finish : hint_range(0.0, 1.0) = 0.0;
varying vec3 world_p;
void vertex(){world_p=(MODEL_MATRIX*vec4(VERTEX,1.0)).xyz;}
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.0-2.0*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1)),f.x),f.y);}
void fragment(){
    vec2 p=world_p.xz;
    float bend=1.15+.18*sin(p.y*.8);
    float main_path=length(p-vec2(bend,clamp(p.y,2.4,8.0)))-.86;
    float side_path=length(p-vec2(clamp(p.x,-5.4,1.4),3.6))-.58;
    float d=min(main_path,side_path)+(noise(p*1.7)-.5)*.10;
    float approach = 0.0;
    if (porch_finish > 0.0) {
        // Feather the finish toward the old lawn so the rest of the village keeps its palette.
        vec2 extent = (p - vec2(1.15, 4.54)) / vec2(4.75, 3.65);
        approach = (1.0 - smoothstep(.45, 1.05, length(extent))) * porch_finish;
        float scallop = noise(p * vec2(1.85, 2.55) + vec2(13.0, -7.0));
        d += (scallop - .52) * .34 * approach;
    }
    float path=1.0-smoothstep(.0,.30,d);
    float broad_variation=.98+noise(p*.40)*.04;
    // Wide color patches and a worn edge unify the grass and packed earth.
    float grass_mottle = mix(1.0, .88 + noise(p*.48)*.22, courtyard_blend);
    float earth_wear = mix(1.0, .93 + noise(p*.9)*.13, courtyard_blend);
    float skirt = (1.0 - smoothstep(.03, .68, d)) * (1.0 - path) * courtyard_blend;
    vec3 lawn = mix(grass_color.rgb * grass_mottle, path_color.rgb, skirt * .28);
    ALBEDO=mix(lawn,path_color.rgb * earth_wear,path)*broad_variation;
    if (approach > 0.0) {
        float meadow = noise(p * vec2(.71, .48) + vec2(-5.0, 19.0));
        float patch = noise(p * 1.53 + vec2(8.0, 2.0));
        float coolness = smoothstep(.24, .68, meadow * .63 + patch * .37);
        vec3 grass_finish = mix(vec3(.93, 1.00, .79), vec3(.84, 1.05, 1.29), coolness);
        float lane_wear = noise(p * vec2(2.25, 1.08) + vec2(5.0, 10.0));
        float shoulder = smoothstep(-.42, .19, d);
        vec3 packed_earth = mix(vec3(1.055, 1.025, .99), vec3(.88, .84, .77), shoulder*.72 + lane_wear*.28);
        // Soft occlusion at the stone and post feet ties the existing geometry into the ground.
        float step_contact = 1.0 - smoothstep(.61, 1.23, length((p - vec2(1.14, 2.51)) / vec2(1.36, .76)));
        float lamp_contact = 1.0 - smoothstep(.31, .93, length(p - vec2(2.85, 4.55)));
        float wall_contact = (1.0 - smoothstep(.19, .76, abs(p.y - 1.67))) *
                (1.0 - smoothstep(2.74, 3.48, abs(p.x)));
        float shade = max(step_contact * .27, max(lamp_contact * .24, wall_contact * .33));
        ALBEDO *= mix(vec3(1.0), mix(grass_finish, packed_earth, path) * (1.0 - shade), approach);
    }
    ROUGHNESS=.80;
    SPECULAR=.25;
}
