"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { type MotionValue, useReducedMotion } from "framer-motion";

type ProductStageProps = {
  progress?: MotionValue<number>;
  variant?: "hero" | "story";
  className?: string;
};

const PERSIAN_FRONT = -2.342189069;

/** A quietly lit product portrait; scroll position supplies the choreography. */
export function ProductStage({ progress, variant = "hero", className = "" }: ProductStageProps) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const reducedMotion = useReducedMotion();

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    setReady(false);

    let disposed = false;
    let cleanup = () => {};

    async function mountScene() {
      const [THREE, { GLTFLoader }, { RoomEnvironment }] = await Promise.all([
        import("three"),
        import("three/examples/jsm/loaders/GLTFLoader.js"),
        import("three/examples/jsm/environments/RoomEnvironment.js"),
      ]);
      if (disposed || !host) return;

      let renderer: InstanceType<typeof THREE.WebGLRenderer>;
      try {
        renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: "low-power" });
      } catch {
        return;
      }

      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.setClearColor(0xffffff, 0);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 0.95;
      renderer.domElement.setAttribute("aria-hidden", "true");
      host.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 50);
      camera.position.set(0, 0.08, 5.6);
      camera.lookAt(0, 0, 0);
      const pmrem = new THREE.PMREMGenerator(renderer);
      const room = new RoomEnvironment();
      const environment = pmrem.fromScene(room, 0.045);
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.7;
      room.dispose();
      scene.add(new THREE.AmbientLight(0xffffff, 0.45));
      const key = new THREE.DirectionalLight(0xffffff, 1.8);
      key.position.set(4, 5, 6);
      scene.add(key);
      const fill = new THREE.DirectionalLight(0xeaf1e6, 0.65);
      fill.position.set(-4, 1, 2);
      scene.add(fill);

      const pivot = new THREE.Group();
      scene.add(pivot);
      let frame = 0;
      let isVisible = false;
      let model: InstanceType<typeof THREE.Group> | undefined;
      let pointerX = 0;
      let pointerY = 0;
      let lastTime = 0;

      function disposeModel(root: InstanceType<typeof THREE.Object3D>) {
        root.traverse((object) => {
          if (!(object instanceof THREE.Mesh)) return;
          object.geometry.dispose();
          const materials = Array.isArray(object.material) ? object.material : [object.material];
          for (const material of materials) {
            for (const value of Object.values(material)) {
              if (value instanceof THREE.Texture) value.dispose();
            }
            material.dispose();
          }
        });
      }

      function draw(time = 0) {
        const delta = Math.min((time - lastTime) / 1000, 0.05) || 0.016;
        lastTime = time;
        const p = reducedMotion ? 0 : Math.max(0, Math.min(1, progress?.get() ?? 0));
        const phase = p * 2;
        const blend = THREE.MathUtils.smoothstep(phase < 1 ? phase : phase - 1, 0, 1);
        const rotations = [PERSIAN_FRONT + 0.1, -0.15, PERSIAN_FRONT - 0.05];
        const tilts = [-0.16, 0.15, -0.08];
        const shifts = [0.05, -0.14, 0.04];
        const part = phase < 1 ? 0 : 1;
        const rotationY = variant === "story"
          ? THREE.MathUtils.lerp(rotations[part], rotations[part + 1], blend)
          : PERSIAN_FRONT + 0.1;
        const rotationZ = variant === "story"
          ? THREE.MathUtils.lerp(tilts[part], tilts[part + 1], blend)
          : -0.045;
        const translation = variant === "story"
          ? THREE.MathUtils.lerp(shifts[part], shifts[part + 1], blend)
          : 0;

        const damping = reducedMotion ? 1 : 1 - Math.exp(-delta * 7);
        pivot.rotation.y = THREE.MathUtils.lerp(pivot.rotation.y, rotationY + pointerX * 0.13, damping);
        pivot.rotation.x = THREE.MathUtils.lerp(pivot.rotation.x, -0.065 + pointerY * 0.06, damping);
        pivot.rotation.z = THREE.MathUtils.lerp(pivot.rotation.z, rotationZ + pointerX * 0.035, damping);
        pivot.position.y = THREE.MathUtils.lerp(pivot.position.y, translation - pointerY * 0.045, damping);
        renderer.render(scene, camera);
      }

      function loop(time: number) {
        draw(time);
        if (isVisible && !reducedMotion) frame = requestAnimationFrame(loop);
        else frame = 0;
      }

      function resize() {
        if (!host) return;
        const { width, height } = host.getBoundingClientRect();
        if (!width || !height) return;
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        if (variant === "hero") {
          // Preserve the complete silhouette when the centred portrait narrows on phones.
          camera.position.z = Math.max(5.6, 2.8 / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
          camera.lookAt(0, 0, 0);
        }
        camera.updateProjectionMatrix();
        draw();
      }

      const resizeObserver = new ResizeObserver(resize);
      resizeObserver.observe(host);
      const visibilityObserver = new IntersectionObserver(([entry]) => {
        isVisible = entry.isIntersecting;
        if (isVisible && !frame && !reducedMotion) frame = requestAnimationFrame(loop);
        else if (!isVisible && frame) {
          cancelAnimationFrame(frame);
          frame = 0;
        }
      }, { rootMargin: "100px" });
      visibilityObserver.observe(host);

      function pointerMove(event: PointerEvent) {
        if (reducedMotion || event.pointerType !== "mouse" || !host) return;
        const box = host.getBoundingClientRect();
        pointerX = ((event.clientX - box.left) / box.width - 0.5) * 2;
        pointerY = ((event.clientY - box.top) / box.height - 0.5) * 2;
      }
      function pointerLeave() { pointerX = 0; pointerY = 0; }
      host.addEventListener("pointermove", pointerMove);
      host.addEventListener("pointerleave", pointerLeave);

      pivot.rotation.set(-0.065, PERSIAN_FRONT + 0.1, variant === "hero" ? -0.045 : -0.13);
      resize();

      new GLTFLoader().load("/models/yam-yam.glb", (gltf) => {
        if (disposed) {
          disposeModel(gltf.scene);
          return;
        }
        model = gltf.scene;
        model.traverse((object) => {
          if (object instanceof THREE.Mesh) {
            const materials = Array.isArray(object.material) ? object.material : [object.material];
            for (const material of materials) {
              const map = (material as InstanceType<typeof THREE.MeshStandardMaterial>).map;
              if (map) map.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
            }
          }
        });
        const box = new THREE.Box3().setFromObject(model);
        const center = box.getCenter(new THREE.Vector3());
        const dimensions = box.getSize(new THREE.Vector3());
        const scale = 2.55 / Math.max(dimensions.y, 0.001);
        model.position.sub(center);
        const fitted = new THREE.Group();
        fitted.scale.setScalar(scale);
        fitted.add(model);
        pivot.add(fitted);
        draw();
        setReady(true);
      }, undefined, () => {
        // The photographed portrait stays visible if WebGL or model loading fails.
      });

      cleanup = () => {
        cancelAnimationFrame(frame);
        resizeObserver.disconnect();
        visibilityObserver.disconnect();
        host.removeEventListener("pointermove", pointerMove);
        host.removeEventListener("pointerleave", pointerLeave);
        if (model) disposeModel(model);
        environment.dispose();
        pmrem.dispose();
        renderer.dispose();
        renderer.domElement.remove();
      };
    }

    mountScene().catch(() => {});
    return () => { disposed = true; cleanup(); };
  }, [progress, reducedMotion, variant]);

  return (
    <div
      ref={hostRef}
      className={`product-stage product-stage-${variant} ${ready ? "is-ready" : ""} ${className}`}
      role="img"
      aria-label="قوطی رب گوجه‌فرنگی یام‌یام، ۸۰۰ گرم"
    >
      <Image
        src="/images/can-persian.webp"
        alt=""
        width={900}
        height={1012}
        className="product-stage-fallback"
        sizes="(max-width: 760px) 90vw, 46vw"
        preload={variant === "hero"}
        loading={variant === "hero" ? undefined : "lazy"}
        unoptimized
      />
    </div>
  );
}

export default ProductStage;
