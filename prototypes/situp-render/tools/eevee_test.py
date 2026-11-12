# 같은 장면을 EEVEE 로 렌더해 Cycles 와 비교 (속도, 품질 확인용)
# 실행: Blender -b <scene.blend> --python tools/eevee_test.py -- <out_prefix> <frames(예: 1,60)>
import bpy, sys, time
argv = sys.argv[sys.argv.index("--") + 1:]
prefix, frames = argv[0], [int(x) for x in argv[1].split(",")]
sc = bpy.context.scene
sc.render.engine = 'BLENDER_EEVEE'
e = sc.eevee
e.taa_render_samples = 64
e.use_raytracing = True               # 반사, AO, 간접광을 화면 공간 레이트레이싱으로
e.ray_tracing_options.resolution_scale = '1'
e.use_shadows = True
e.shadow_ray_count = 3
e.shadow_step_count = 12
e.use_fast_gi = False
e.fast_gi_distance = 0.0
for l in bpy.data.lights:             # 부드러운 그림자: 광원 크기 그대로 사용
    l.use_shadow = True
for f in frames:
    sc.frame_set(f)
    sc.render.filepath = f"{prefix}{f:04d}"
    t = time.time()
    bpy.ops.render.render(write_still=True)
    print(f"[eevee] frame {f} {time.time() - t:.1f}s")
