czm_material czm_getMaterial(czm_materialInput materialInput)
{
    czm_material material = czm_getDefaultMaterial(materialInput);
    float along = materialInput.st.s;
    float across = abs(materialInput.st.t - 0.5);
    float streak = smoothstep(0.0, 0.74, along)
                 * (1.0 - smoothstep(0.87, 1.0, along));
    float edge = 1.0 - smoothstep(0.14, 0.5, across);

    // The 3D polyline vertex shader keeps perspective clip W.
    float viewDepth = 1.0 / gl_FragCoord.w;
    float nearFade = smoothstep(5.0, 12.0, viewDepth);
    float farFade = 1.0 - smoothstep(39.0, 65.0, viewDepth);

    material.diffuse = vec3(0.80, 0.88, 0.97);
    material.alpha = 0.72 * streak * edge * nearFade * farFade;
    return material;
}
