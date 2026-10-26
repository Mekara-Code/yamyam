import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const MAX_CANS = 12;
const CAN_HEIGHT = 0.48;
const GREEN = '#173f2f';

type Callbacks = {
  onArrival: () => boolean;
  onPendingChange: (pending: number) => void;
  onMessage: (message: string) => void;
};

type Slot = { position: THREE.Vector3; available: boolean };
type ProductPart = {
  geometry: THREE.BufferGeometry;
  material: THREE.Material | THREE.Material[];
  matrix: THREE.Matrix4;
};
type Flight = {
  group: THREE.Group;
  slot: number;
  start: THREE.Vector3;
  end: THREE.Vector3;
  elapsed: number;
  duration: number;
};

export type StoreEngine = {
  addProduct: () => boolean;
  setQuantity: (quantity: number) => void;
  setActive: (active: boolean) => void;
  move: (direction: 'forward' | 'backward' | 'left' | 'right', active: boolean) => void;
  resetCamera: () => void;
  dispose: () => void;
};

/** Each can consists of instanced original GLB mesh parts; only flying and basket cans are clones. */
export async function createStoreEngine(
  canvas: HTMLCanvasElement,
  initialQuantity: number,
  callbacks: Callbacks,
  signal: AbortSignal,
): Promise<StoreEngine> {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, window.matchMedia('(pointer: coarse)').matches ? 1 : 1.5));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#f4f6f0');
  scene.fog = new THREE.Fog('#f4f6f0', 15, 40);
  const camera = new THREE.PerspectiveCamera(48, 1, 0.08, 60);
  const pmrem = new THREE.PMREMGenerator(renderer);
  const room = new RoomEnvironment();
  const environment = pmrem.fromScene(room, 0.04);
  scene.environment = environment.texture;
  scene.environmentIntensity = 0.75;
  room.dispose();
  pmrem.dispose();
  const hemisphere = new THREE.HemisphereLight('#ffffff', '#c8d8bd', 1.25);
  scene.add(hemisphere);
  const keyLight = new THREE.DirectionalLight('#fffdf7', 2.2);
  keyLight.position.set(-4, 8, 5);
  scene.add(keyLight);

  const resources = new Set<{ dispose: () => void }>();
  const own = <T extends { dispose: () => void }>(resource: T): T => { resources.add(resource); return resource; };
  const floorMaterial = own(new THREE.MeshStandardMaterial({ color: '#f4f6f0', roughness: 0.92 }));
  const floor = new THREE.Mesh(own(new THREE.PlaneGeometry(100, 100)), floorMaterial);
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -0.01;
  scene.add(floor);

  const greenMaterial = own(new THREE.MeshStandardMaterial({ color: GREEN, roughness: 0.45, metalness: 0.16 }));
  const whiteMaterial = own(new THREE.MeshStandardMaterial({ color: '#fbfcf8', roughness: 0.62, metalness: 0.08 }));
  const edgeMaterial = own(new THREE.MeshStandardMaterial({ color: '#dce6d6', roughness: 0.4, metalness: 0.34 }));
  const greenPieces: THREE.BufferGeometry[] = [];
  const whitePieces: THREE.BufferGeometry[] = [];
  const edgePieces: THREE.BufferGeometry[] = [];

  const box = (pieces: THREE.BufferGeometry[], x: number, y: number, z: number, w: number, h: number, d: number) => {
    const geometry = new THREE.BoxGeometry(w, h, d);
    geometry.translate(x, y, z);
    pieces.push(geometry);
  };
  const rod = (pieces: THREE.BufferGeometry[], from: THREE.Vector3, to: THREE.Vector3, radius = 0.018) => {
    const direction = new THREE.Vector3().subVectors(to, from);
    const geometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 5);
    geometry.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.clone().normalize()));
    geometry.translate(...from.clone().add(to).multiplyScalar(0.5).toArray());
    pieces.push(geometry);
  };
  const merge = (pieces: THREE.BufferGeometry[], material: THREE.Material) => {
    if (!pieces.length) return;
    const geometry = mergeGeometries(pieces, false);
    pieces.forEach((piece) => piece.dispose());
    if (geometry) scene.add(new THREE.Mesh(own(geometry), material));
  };

  const label = (text: string, width: number, height: number, background: string, color: string) => {
    const surface = document.createElement('canvas');
    surface.width = 1024;
    surface.height = 256;
    const context = surface.getContext('2d')!;
    context.fillStyle = background;
    context.fillRect(0, 0, surface.width, surface.height);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.font = '900 126px Arial, sans-serif';
    context.fillStyle = color;
    context.fillText(text, 512, 136);
    const texture = own(new THREE.CanvasTexture(surface));
    texture.colorSpace = THREE.SRGBColorSpace;
    const material = own(new THREE.MeshBasicMaterial({ map: texture, toneMapped: false }));
    return new THREE.Mesh(own(new THREE.PlaneGeometry(width, height)), material);
  };

  const shadowSurface = document.createElement('canvas');
  shadowSurface.width = shadowSurface.height = 128;
  const shadowContext = shadowSurface.getContext('2d')!;
  const gradient = shadowContext.createRadialGradient(64, 64, 5, 64, 64, 64);
  gradient.addColorStop(0, 'rgba(23, 48, 26, 0.22)');
  gradient.addColorStop(0.4, 'rgba(23, 48, 26, 0.12)');
  gradient.addColorStop(1, 'rgba(23, 48, 26, 0)');
  shadowContext.fillStyle = gradient;
  shadowContext.fillRect(0, 0, 128, 128);
  const shadowTexture = own(new THREE.CanvasTexture(shadowSurface));
  const shadowMaterial = own(new THREE.MeshBasicMaterial({ map: shadowTexture, transparent: true, depthWrite: false }));
  const shadow = (x: number, z: number, width: number, depth: number) => {
    const mesh = new THREE.Mesh(own(new THREE.PlaneGeometry(width, depth)), shadowMaterial);
    mesh.rotation.x = -Math.PI / 2;
    mesh.position.set(x, 0.005, z);
    scene.add(mesh);
  };

  const slots: Slot[] = [];
  [-2.1, 2.1].forEach((shelfX) => {
    shadow(shelfX, 0, 3.7, 2.1);
    // Quiet white shelving with dark green framing and a continuous branded fascia.
    box(whitePieces, shelfX, 1.4, -0.51, 2.62, 2.5, 0.06);
    [-1.3, 1.3].forEach((x) => {
      [-0.5, 0.48].forEach((z) => box(greenPieces, shelfX + x, 1.36, z, 0.065, 2.62, 0.065));
      box(whitePieces, shelfX + x, 1.4, -0.015, 0.045, 2.48, 0.94);
    });
    [0.22, 0.98, 1.74, 2.5].forEach((y, level) => {
      box(whitePieces, shelfX, y, -0.005, 2.65, 0.085, 1.03);
      box(greenPieces, shelfX, y - 0.022, 0.518, 2.66, 0.075, 0.025);
      if (level < 3) {
        for (let row = 0; row < 2; row++) {
          for (let column = 0; column < 6; column++) {
            slots.push({ position: new THREE.Vector3(shelfX - 1.075 + column * 0.43, y + 0.044, row ? -0.235 : 0.23), available: true });
          }
        }
      }
    });
    box(greenPieces, shelfX, 2.675, -0.005, 2.67, 0.25, 1.05);
    const fascia = label('YAMYAM', 1.8, 0.235, GREEN, '#f4f7e9');
    fascia.position.set(shelfX, 2.679, 0.528);
    scene.add(fascia);
    box(greenPieces, shelfX, 0.08, -0.005, 2.5, 0.14, 0.92);
  });

  // Open wire basket, centered in the aisle. Its real gaps keep the collected cans visible.
  const basketZ = 1.8;
  const bottomY = 0.18;
  const topY = 0.88;
  const basketPieces: THREE.BufferGeometry[] = [];
  const handlePieces: THREE.BufferGeometry[] = [];
  box(basketPieces, 0, bottomY, basketZ, 1.4, 0.07, 0.94);
  shadow(0, basketZ, 3.1, 2.7);
  for (const side of [-1, 1]) {
    for (let index = 0; index <= 10; index++) {
      const fraction = index / 10 * 2 - 1;
      rod(basketPieces, new THREE.Vector3(fraction * 0.68, bottomY, basketZ + side * 0.45), new THREE.Vector3(fraction * 0.86, topY, basketZ + side * 0.62));
    }
    for (let index = 0; index <= 6; index++) {
      const fraction = index / 6 * 2 - 1;
      rod(basketPieces, new THREE.Vector3(side * 0.68, bottomY, basketZ + fraction * 0.45), new THREE.Vector3(side * 0.86, topY, basketZ + fraction * 0.62));
    }
    for (const y of [0.38, 0.61, 0.86]) {
      const t = (y - bottomY) / (topY - bottomY);
      const w = 0.68 + 0.18 * t;
      const d = 0.45 + 0.17 * t;
      box(basketPieces, 0, y, basketZ + side * d, w * 2 + 0.025, 0.028, 0.028);
      box(basketPieces, side * w, y, basketZ, 0.028, 0.028, d * 2);
    }
    const handleCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.79, 0.85, basketZ + side * 0.49),
      new THREE.Vector3(-0.63, 1.17, basketZ + side * 0.38),
      new THREE.Vector3(0.63, 1.17, basketZ + side * 0.38),
      new THREE.Vector3(0.79, 0.85, basketZ + side * 0.49),
    ]);
    handlePieces.push(new THREE.TubeGeometry(handleCurve, 20, 0.025, 6, false));
  }
  const basketScale = new THREE.Matrix4().makeTranslation(0, 0, basketZ)
    .multiply(new THREE.Matrix4().makeScale(1.25, 1, 1.45))
    .multiply(new THREE.Matrix4().makeTranslation(0, 0, -basketZ));
  basketPieces.forEach((geometry) => geometry.applyMatrix4(basketScale));
  handlePieces.forEach((geometry) => geometry.applyMatrix4(basketScale));
  greenPieces.push(...basketPieces);
  edgePieces.push(...handlePieces);
  const basketBrand = label('YAMYAM', 0.85, 0.22, GREEN, '#f3f5e9');
  basketBrand.position.set(0, 0.57, basketZ + 0.559 * 1.45);
  basketBrand.rotation.x = 0.22;
  scene.add(basketBrand);
  merge(greenPieces, greenMaterial);
  merge(whitePieces, whiteMaterial);
  merge(edgePieces, edgeMaterial);

  let gltf;
  try {
    gltf = await new GLTFLoader().loadAsync('/models/yam-yam-shelf.glb');
  } catch (error) {
    resources.forEach((resource) => resource.dispose());
    environment.dispose();
    renderer.dispose();
    throw error;
  }

  if (signal.aborted) {
    gltf.scene.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.geometry.dispose();
        const materials = Array.isArray(object.material) ? object.material : [object.material];
        materials.forEach((material) => {
          Object.values(material).forEach((value) => { if (value instanceof THREE.Texture) value.dispose(); });
          material.dispose();
        });
      }
    });
    resources.forEach((resource) => resource.dispose());
    environment.dispose();
    renderer.dispose();
    throw new DOMException('Scene disposed', 'AbortError');
  }

  gltf.scene.updateMatrixWorld(true);
  const bounds = new THREE.Box3().setFromObject(gltf.scene);
  const size = bounds.getSize(new THREE.Vector3());
  const center = bounds.getCenter(new THREE.Vector3());
  const scale = CAN_HEIGHT / Math.max(size.y, 0.0001);
  const normalization = new THREE.Matrix4().makeRotationY(-2.342189)
    .multiply(new THREE.Matrix4().makeScale(scale, scale, scale))
    .multiply(new THREE.Matrix4().makeTranslation(-center.x, -bounds.min.y, -center.z));
  const parts: ProductPart[] = [];
  gltf.scene.traverse((object) => {
    if (object instanceof THREE.Mesh) {
      const materials: THREE.Material[] = Array.isArray(object.material) ? object.material : [object.material];
      materials.forEach((material) => {
        own(material);
        Object.values(material).forEach((value) => {
          if (value instanceof THREE.Texture) {
            value.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy());
            own(value);
          }
        });
      });
      own(object.geometry);
      parts.push({ geometry: object.geometry, material: object.material, matrix: normalization.clone().multiply(object.matrixWorld) });
    }
  });
  if (!parts.length) {
    resources.forEach((resource) => resource.dispose());
    environment.dispose();
    renderer.dispose();
    throw new Error('The product model is empty.');
  }

  const instances = parts.map((part) => {
    const mesh = new THREE.InstancedMesh(part.geometry, part.material, slots.length);
    mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  });
  const slotMatrix = new THREE.Matrix4();
  const emptyMatrix = new THREE.Matrix4().makeScale(0, 0, 0);
  const writeSlot = (index: number) => {
    slotMatrix.makeTranslation(...slots[index].position.toArray());
    instances.forEach((mesh, partIndex) => {
      mesh.setMatrixAt(index, slots[index].available ? slotMatrix.clone().multiply(parts[partIndex].matrix) : emptyMatrix);
      mesh.instanceMatrix.needsUpdate = true;
    });
  };
  slots.forEach((_, index) => writeSlot(index));

  const createProduct = () => {
    const group = new THREE.Group();
    parts.forEach((part) => {
      const mesh = new THREE.Mesh(part.geometry, part.material);
      mesh.matrixAutoUpdate = false;
      mesh.matrix.copy(part.matrix);
      group.add(mesh);
    });
    return group;
  };
  const basketPosition = (index: number) => new THREE.Vector3(-0.645 + (index % 4) * 0.43, 0.235, basketZ - 0.43 + Math.floor(index / 4) * 0.43);
  const basketProducts = parts.map((part) => {
    const mesh = new THREE.InstancedMesh(part.geometry, part.material, MAX_CANS);
    for (let index = 0; index < MAX_CANS; index++) {
      const matrix = new THREE.Matrix4().makeTranslation(...basketPosition(index).toArray())
        .multiply(new THREE.Matrix4().makeRotationY(index * 0.08))
        .multiply(part.matrix);
      mesh.setMatrixAt(index, matrix);
    }
    mesh.frustumCulled = false;
    scene.add(mesh);
    return mesh;
  });
  let quantity = Math.max(0, Math.min(MAX_CANS, initialQuantity));
  const syncBasket = () => basketProducts.forEach((product) => { product.count = quantity; product.visible = quantity > 0; });
  syncBasket();

  const flights: Flight[] = [];
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let disposed = false;
  let active = false;
  let frame = 0;
  let previousTime = 0;
  let pointerDown: { x: number; y: number; moved: boolean } | null = null;
  let yaw = 0;
  let pitch = -0.15;
  let mobile = false;
  const movement = new Set<string>();
  const raycaster = new THREE.Raycaster();
  const pointer = new THREE.Vector2();
  let nextShelf = 0;

  const applyCameraRotation = () => {
    camera.rotation.order = 'YXZ';
    camera.rotation.set(pitch, yaw, 0);
  };
  const resetCamera = () => {
    yaw = 0;
    const cameraY = mobile ? 2.35 : 2.65;
    const cameraZ = Math.max(6.9, 3.8 / (Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.aspect));
    pitch = Math.atan2(1.2 - cameraY, cameraZ);
    camera.position.set(0, cameraY, cameraZ);
    applyCameraRotation();
  };
  const resize = () => {
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    if (!width || !height) return;
    const nextMobile = width < 640;
    camera.aspect = width / height;
    camera.fov = nextMobile ? 57 : 46;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height, false);
    if (nextMobile !== mobile || previousTime === 0) {
      mobile = nextMobile;
      resetCamera();
    }
    renderer.render(scene, camera);
  };
  const resizeObserver = new ResizeObserver(resize);
  resizeObserver.observe(canvas);
  resize();

  const launch = (slotIndex?: number): boolean => {
    if (disposed) return false;
    if (quantity + flights.length >= MAX_CANS) {
      callbacks.onMessage('سبدت پر از حس خوبه! تا ۱۲ قوطی می‌تونی برداری.');
      return false;
    }
    let index = slotIndex;
    if (index === undefined) {
      // Alternate the shelves and take a visible middle-row can first.
      const shelf = nextShelf++ % 2;
      const preference = [15, 14, 16, 13, 17, 12, 3, 2, 4, 1, 5, 0, 27, 26, 28, 25, 29, 24];
      index = preference.map((local) => shelf * 36 + local).find((candidate) => slots[candidate].available);
      if (index === undefined) index = slots.findIndex((slot) => slot.available);
    }
    if (index < 0 || !slots[index]?.available) return false;
    slots[index].available = false;
    writeSlot(index);
    const group = createProduct();
    group.position.copy(slots[index].position);
    scene.add(group);
    flights.push({
      group,
      slot: index,
      start: group.position.clone(),
      end: basketPosition(quantity + flights.length),
      elapsed: 0,
      duration: reducedMotion ? 0.2 : 1.15,
    });
    callbacks.onPendingChange(flights.length);
    callbacks.onMessage('یام‌یامت داره میاد توی سبد…');
    return true;
  };

  const onPointerDown = (event: PointerEvent) => {
    if (!event.isPrimary || (event.pointerType === 'mouse' && event.button !== 0)) return;
    canvas.focus({ preventScroll: true });
    pointerDown = { x: event.clientX, y: event.clientY, moved: false };
    canvas.setPointerCapture(event.pointerId);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (pointerDown) {
      const dx = event.clientX - pointerDown.x;
      const dy = event.clientY - pointerDown.y;
      if (Math.abs(dx) + Math.abs(dy) > 4) pointerDown.moved = true;
      if (pointerDown.moved) {
        yaw = THREE.MathUtils.clamp(yaw - dx * 0.003, -0.64, 0.64);
        pitch = THREE.MathUtils.clamp(pitch - dy * 0.0025, -0.48, 0.15);
        pointerDown.x = event.clientX;
        pointerDown.y = event.clientY;
        applyCameraRotation();
      }
      canvas.style.cursor = 'grabbing';
      return;
    }
    if (event.pointerType === 'mouse') {
      const rect = canvas.getBoundingClientRect();
      pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
      raycaster.setFromCamera(pointer, camera);
      canvas.style.cursor = raycaster.intersectObjects(instances, false).some((hit) => hit.instanceId !== undefined && slots[hit.instanceId].available) ? 'pointer' : 'grab';
    }
  };
  const onPointerUp = (event: PointerEvent) => {
    const previous = pointerDown;
    pointerDown = null;
    canvas.style.cursor = 'grab';
    if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
    if (!previous || previous.moved) return;
    const rect = canvas.getBoundingClientRect();
    pointer.set((event.clientX - rect.left) / rect.width * 2 - 1, -(event.clientY - rect.top) / rect.height * 2 + 1);
    raycaster.setFromCamera(pointer, camera);
    const hit = raycaster.intersectObjects(instances, false).find((intersection) => intersection.instanceId !== undefined && slots[intersection.instanceId].available);
    if (hit?.instanceId !== undefined) launch(hit.instanceId);
  };
  const cancelPointer = () => { pointerDown = null; canvas.style.cursor = 'grab'; };
  const keyDirection: Record<string, string> = { w: 'forward', ArrowUp: 'forward', s: 'backward', ArrowDown: 'backward', a: 'left', ArrowLeft: 'left', d: 'right', ArrowRight: 'right' };
  const onKeyDown = (event: KeyboardEvent) => {
    const direction = keyDirection[event.key] || keyDirection[event.key.toLowerCase()];
    if (direction) { event.preventDefault(); movement.add(direction); }
    if ((event.key === ' ' || event.key === 'Enter') && !event.repeat) { event.preventDefault(); launch(); }
    if (event.key === 'Escape') { movement.clear(); canvas.blur(); }
  };
  const onKeyUp = (event: KeyboardEvent) => {
    const direction = keyDirection[event.key] || keyDirection[event.key.toLowerCase()];
    if (direction) { event.preventDefault(); movement.delete(direction); }
  };
  const clearMovement = () => { movement.clear(); pointerDown = null; };
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', cancelPointer);
  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('keyup', onKeyUp);
  canvas.addEventListener('blur', clearMovement);
  window.addEventListener('blur', clearMovement);

  const render = (time: number) => {
    if (!active || disposed) return;
    const delta = Math.min((time - previousTime) / 1000 || 0, 0.05);
    previousTime = time;
    if (movement.size) {
      const forward = Number(movement.has('forward')) - Number(movement.has('backward'));
      const right = Number(movement.has('right')) - Number(movement.has('left'));
      const length = Math.hypot(forward, right) || 1;
      const speed = delta * 2.5 / length;
      camera.position.x = THREE.MathUtils.clamp(camera.position.x + (-Math.sin(yaw) * forward + Math.cos(yaw) * right) * speed, -1.15, 1.15);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + (-Math.cos(yaw) * forward - Math.sin(yaw) * right) * speed, 3.3, mobile ? 14.5 : 12.2);
    }
    for (let index = flights.length - 1; index >= 0; index--) {
      const flight = flights[index];
      flight.elapsed += delta;
      const t = Math.min(flight.elapsed / flight.duration, 1);
      const eased = t * t * (3 - 2 * t);
      flight.group.position.lerpVectors(flight.start, flight.end, eased);
      flight.group.position.y += Math.sin(Math.PI * eased) * (reducedMotion ? 0.35 : 2.05);
      if (!reducedMotion) {
        flight.group.rotation.set(Math.sin(t * Math.PI) * 0.3, t * Math.PI * 2, Math.sin(t * Math.PI * 2) * 0.18);
      }
      if (t >= 1) {
        scene.remove(flight.group);
        flights.splice(index, 1);
        const accepted = callbacks.onArrival();
        if (accepted) quantity = Math.min(MAX_CANS, quantity + 1);
        else { slots[flight.slot].available = true; writeSlot(flight.slot); }
        syncBasket();
        callbacks.onPendingChange(flights.length);
        callbacks.onMessage(accepted ? 'رسید توی سبد! یکی دیگه برمی‌داری؟' : 'سبدت پره؛ قوطی رو برایت روی قفسه نگه داشتیم.');
      }
    }
    renderer.render(scene, camera);
    frame = requestAnimationFrame(render);
  };

  return {
    addProduct: () => launch(),
    setQuantity: (nextQuantity) => {
      const next = Math.max(0, Math.min(MAX_CANS, nextQuantity));
      let restored = Math.max(0, quantity - next);
      slots.forEach((slot, index) => {
        if (restored > 0 && !slot.available && !flights.some((flight) => flight.slot === index)) {
          slot.available = true;
          writeSlot(index);
          restored--;
        }
      });
      quantity = next;
      syncBasket();
      // Restore stock after a cart clear or removal without disturbing products in flight.
      if (quantity === 0 && !flights.length) {
        slots.forEach((slot, index) => { if (!slot.available) { slot.available = true; writeSlot(index); } });
      }
    },
    setActive: (nextActive) => {
      if (disposed || active === nextActive) return;
      active = nextActive;
      if (active) { previousTime = performance.now(); frame = requestAnimationFrame(render); }
      else { cancelAnimationFrame(frame); clearMovement(); }
    },
    move: (direction, pressed) => { if (pressed) movement.add(direction); else movement.delete(direction); },
    resetCamera,
    dispose: () => {
      if (disposed) return;
      disposed = true;
      active = false;
      cancelAnimationFrame(frame);
      resizeObserver.disconnect();
      canvas.removeEventListener('pointerdown', onPointerDown);
      canvas.removeEventListener('pointermove', onPointerMove);
      canvas.removeEventListener('pointerup', onPointerUp);
      canvas.removeEventListener('pointercancel', cancelPointer);
      canvas.removeEventListener('keydown', onKeyDown);
      canvas.removeEventListener('keyup', onKeyUp);
      canvas.removeEventListener('blur', clearMovement);
      window.removeEventListener('blur', clearMovement);
      [...instances, ...basketProducts].forEach((instance) => instance.dispose());
      resources.forEach((resource) => resource.dispose());
      environment.dispose();
      scene.clear();
      renderer.dispose();
    },
  };
}
