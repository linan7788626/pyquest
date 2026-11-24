# Soft Fantasy 材质图集

使用内置 imagegen 生成。输出：`soft-fantasy-material-atlas.png`，原生输出保持完整，没有重采样或二次裁切。Godot 着色器直接采样四个象限，以世界坐标三向映射应用到三维模型。

参考原图：
- `Terrain_Samples/Terrain_R1_C1.png`
- `Buildings_And_Props/House_Orange.png`

均位于 `art/reference_sources.json` 中记录的外部素材根目录。四象限依次为草地、暖砂石、橙色陶瓦表面、奶油灰泥表面。木框沿用立体几何，用灰泥笔触乘棕色作为早期木材表面，尚未制作专门木纹。

## 最终提示词

Use case: stylized-concept. Create ONE square high resolution production ALBEDO MATERIAL ATLAS for a 3D game, 2048x2048 if possible. Input image 1 is STYLE AND PALETTE REFERENCE for lush soft-painted grass and ochre earth; input image 2 is STYLE AND PALETTE REFERENCE for warm orange clay roof, cream plaster and sandstone. Not an edit of either source. Match their painterly brushwork, slightly faceted soft fantasy ARPG shapes, warm pigment variations, subtle edge shading. The atlas is exactly four equally sized square quadrants edge to edge, no padding, no labels or frame: TOP LEFT is entirely lush muted yellow-green grass, small soft hand-painted blades and subtle low-contrast patches, no flowers, no cliffs or dirt, no large focal clumps. TOP RIGHT is entirely warm buff sandstone surface with broad irregular paint strokes, subtle honey cream color variations and small worn mottles, NO block divisions or mortar lines. BOTTOM LEFT is entirely rich orange terracotta ceramic surface, broad painted strokes, warm amber highlights and burnt orange variations, NO roof tile grids or geometry. BOTTOM RIGHT is entirely warm ivory cream lime plaster, subtle brush texture with muted ochre flecks, NO windows timber or structures. Each quadrant must have uniform average lighting and seamless-looking matching opposite edges, flat orthographic material swatches. These are texture surfaces to wrap existing geometry, not pictures of objects. No perspective, no directional cast shadows, no glossy plastic, no text, no sample board margins. Keep brushwork visible at gameplay distance without excessive noise. Ensure hard exact boundaries at 50% width and height.
