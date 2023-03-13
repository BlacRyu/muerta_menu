
#include "common_fragment.h"
#include "common_blending_custom.h"

uniform sampler2D g_Texture0; // {"label":"ui_editor_properties_albedo","default":"util/white"}
uniform sampler2D g_Texture3; // {"label":"Shape Mask 1","default":"util/white"}
uniform sampler2D g_Texture4; // {"label":"Shape Mask 2","default":"util/white"}

uniform float g_Overbright; // {"material":"ui_editor_properties_overbright","default":1.0,"range":[0,5]}

uniform float g_Time;

uniform vec2 u_Sample1Scale; // {"material":"Sample 1 scale","default":"1.0 1.0"}
uniform vec2 u_Sample1Speed; // {"material":"Sample 1 speed","default":"0.5 0.121"}
uniform vec2 u_Sample2Scale; // {"material":"Sample 2 scale","default":"2.0 2.0"}
uniform vec2 u_Sample2Speed; // {"material":"Sample 2 speed","default":"0.5 0.121"}
uniform float u_Sample2Blend; // {"material":"Sample 2 Blend amount","default":1.0,"range":[0,1]}
// [COMBO] {"material":"Sample 2 Blend mode","combo":"S2BLEND","type":"imageblending","default":2}
uniform vec2 u_Sample3Scale; // {"material":"Sample 3 scale","default":"0.5 0.5"}
uniform vec2 u_Sample3Speed; // {"material":"Sample 3 speed","default":"2.0 0.319"}
uniform float u_Sample3Blend; // {"material":"Sample 3 Blend amount","default":1.0,"range":[0,1]}
// [COMBO] {"material":"Sample 3 Blend mode","combo":"S3BLEND","type":"imageblending","default":2}
uniform float u_Sharpness; // {"material":"Sharpness","default":20.0,"range":[0,200]}

#if REFRACT
uniform sampler2D g_Texture1; // {"label":"ui_editor_properties_normal","format":"normalmap","default":"util/flatnormal"}
uniform sampler2D g_Texture2; // {"default":"_rt_FullFrameBuffer","hidden":true}
#endif

#if SPRITESHEET
varying vec4 v_TexCoord;
varying float v_TexCoordBlend;
#else
varying vec2 v_TexCoord;
#endif

varying vec4 v_Color;

#if REFRACT
varying vec3 v_ScreenCoord;
varying vec4 v_ScreenTangents;
#endif

void main() {
	vec4 color = vec4(1,1,1,1);
	vec2 offsetCoords = frac(v_Color.r * 4189.0 - v_Color.g * 6857.0);
// #if SPRITESHEET
// #if SPRITESHEETBLEND
// 	// This is wrong because it can sample colors that are invisible on one frame but changing this can negatively impact additive particles
// 	vec4 color = v_Color * mix(ConvertTexture0Format(texSample2D(g_Texture0, v_TexCoord.xy)),
// 								ConvertTexture0Format(texSample2D(g_Texture0, v_TexCoord.zw)),
// 								v_TexCoordBlend);
// #else
// 	vec4 color = v_Color;
// #endif
// #else
// 	vec4 color = v_Color;
// #endif
	// Sample 1
	color.a = ConvertTexture0Format(texSample2D(g_Texture0, v_TexCoord.xy * u_Sample1Scale + g_Time * u_Sample1Speed + offsetCoords)).a;
	
	// Sample 2
	vec4 color2 = ConvertTexture0Format(texSample2D(g_Texture0, v_TexCoord.xy * u_Sample2Scale + g_Time * u_Sample2Speed + offsetCoords));
	color.a = ApplyBlending(S2BLEND, color.a, color2.a, u_Sample2Blend).r * 2.0;
	
	// Sample 3
	// vec4 color3 = ConvertTexture0Format(texSample2D(g_Texture0, v_TexCoord.xy * u_Sample3Scale + g_Time * u_Sample3Speed + offsetCoords));
	// Hard coding multiply blend since our custom ApplyBlending function is probably super slow
	color.a *= 2.0;
	// color.a = mix(color.a, color.a * color3.a, u_Sample3Blend).r * 2.0;
	// color.a = ApplyBlending(S3BLEND, color.a, color3.a, u_Sample3Blend).r * 2.0;
	
	// Shape 1
	color.a *= ConvertTexture0Format(texSample2D(g_Texture3, v_TexCoord.xy)).r;

	// Magic firey nonsense stuff
	color.rgb = color.a * 5.0;
	color.a *= color.a;
	color.a *= u_Sharpness;
	color.a = color.a > 1.0 ? 2.0 - color.a * 1.45 : color.a;
	color.a = max(0.0, color.a);

	// Shape 2 (hides edges)
	color.a *= ConvertTexture0Format(texSample2D(g_Texture4, v_TexCoord.xy)).r;
	color *= v_Color;

#if REFRACT
	vec4 normal = DecompressNormalWithMask(texSample2D(g_Texture1, v_TexCoord.xy));
	//normal = vec4((v_TexCoord.xy - 0.5) * 2, 0, 1);
	vec2 screenRefractionOffset = v_ScreenTangents.xy * normal.x + v_ScreenTangents.zw * normal.y;
#ifndef HLSL
	screenRefractionOffset.y = -screenRefractionOffset.y;
#endif
	vec2 refractTexCoord = v_ScreenCoord.xy / v_ScreenCoord.z * vec2(0.5, 0.5) + 0.5 + screenRefractionOffset * normal.a * v_Color.a;
	
	color.rgb *= texSample2D(g_Texture2, refractTexCoord).rgb;
#endif

	color.rgb *= g_Overbright;
	gl_FragColor = color;
}