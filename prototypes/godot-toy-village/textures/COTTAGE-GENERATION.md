# 小屋美术样板 03 · 图像生成记录

使用内置 imagegen。三张输出均原样复制到本目录，没有放大或重采样。模型实际使用这些贴图；最终截图来自 Godot 2560×1440 原生渲染。

参考：素材库中的 House_Orange.png、Terrain_R1_C1.png。纹理只是材质输入，不代表造型与美术已经通过用户验收。

## cottage-surfaces-v3.png

Use case: stylized-concept. Production game ALBEDO material atlas, square 2048x2048, four exact equal quadrants, no gutters or labels. Match attached House_Orange reference's restrained polished hand-painted fantasy game style, precise warm brushwork, dimensional pigment variation, NOT rough watercolor noise. Top LEFT quadrant: orange terracotta clay with soft worn golden edges and subtle long strokes; no tile grid, geometry will provide tile boundaries. Top RIGHT: warm ivory cream lime plaster, smooth broadly mottled ochre, faint hairline age cracks, very restrained. Bottom LEFT: warm medium honey oak WOOD with vertical grain running top to bottom, long curved dark grain lines and occasional subtle knots; generous coherent uninterrupted long grain suitable for timber beams and doors, not bark. Bottom RIGHT: warm grey-beige sandstone with sparse broad color mottling and tiny worn pits, no grid joints. Each quadrant a flat seamless tileable material with uniform overall light level, no baked cast shadows, no objects, no perspective, no text or framing. Painted detail should read as intentional fine surface shading rather than global digital noise. This will be mapped with UVs onto a detailed actual 3D house. Preserve original reference's warmth, moderate saturation and fine polished hand-painted finish.

## meadow-v3.png

Use case stylized-concept. A square seamless production game texture for soft-painted fantasy meadow grass, 2048 square if possible. Refer to attached game ground art for brush style ONLY. Flat TOP-DOWN albedo surface covering the entire image, no perspective, no cliff edges. Main surface is muted moss and olive green, small broad painterly mottling and very subtle blade hints. Sparse short grass strokes occupy only 15 percent of area, with generous quiet soft green areas. Medium value, moderate saturation, richer deep green than bright yellow. No large leaves, no fern shapes, no repeating clumps, no obvious flowers, no stones, no objects, no cast shadows. Seamless matching opposite edges. Polished smooth hand-painted fantasy ARPG material, controlled fine brushwork, not noisy watercolor, no harsh texture, no plastic. This will be used on a real 3D terrain with a separate blended ochre dirt path; do not paint a path into this texture.

## terracotta-v3.png

Production square game material, 1024x1024 or larger, seamless texture. STYLE reference attached House_Orange orange roof. Render only a FLAT UNIFORM ORANGE TERRACOTTA SURFACE ALBEDO, to be UV mapped onto real individual 3D roof shingles. Soft polished hand-painted fantasy game finish. Rich warm baked clay midtone, subtle low contrast red-orange and ochre brush variation. Smooth ceramic with broad gentle color gradients, minuscule worn pigment strokes, very few tiny imperfections. NO cracks, NO chipped or broken surface, NO watercolor flakes, NO polygon patches, NO tile grid, NO individual tile silhouette or border, NO objects, NO perspective, NO cast shadow, NO bevel painted into image, NO text. Tone variation should be subtle and cohesive, not a patchwork. Match the gentle warm pigment and smooth surface of the reference roof, not a noisy digital material.
