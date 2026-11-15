/**
 * Visionneuse 3D des réalisations en Three.js natif (remplace les scènes Spline).
 *
 * - Modèles GLB exportés de Spline (public/3d/models/), sans matériaux : les finitions sont
 *   recréées ici d'après les scènes Spline d'origine (matcaps et texture de bois extraites).
 * - Cadrage automatique sur l'angle de la caméra Spline exportée dans le GLB.
 * - Rotation à la souris ou au doigt (OrbitControls), sans zoom pour ne pas bloquer le défilement.
 * - Rendu à la demande uniquement, pixel ratio plafonné à 1,5.
 */
import {
    Box3,
    BufferAttribute,
    Color,
    DirectionalLight,
    Group,
    HemisphereLight,
    MathUtils,
    MeshMatcapMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    RepeatWrapping,
    Scene,
    SRGBColorSpace,
    TextureLoader,
    Vector3,
    WebGLRenderer,
    type BufferGeometry,
    type Material,
    type Mesh,
    type Object3D,
    type Texture,
} from 'three';
import { GLTFLoader, type GLTF } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

const MAX_PIXEL_RATIO = 1.5;
const FOV = 32;
const MARGIN = 1.12;
const INTRO_TURN = 0.6; // radians parcourus à l'apparition d'un meuble
const INTRO_MS = 1400;

/* ----------------------------- Finitions ----------------------------- */

type Finish = 'chrome' | 'darkMetal' | 'blackMetal' | 'wood' | 'woodLight' | 'woodDark' | 'steel' | 'lilac' | 'white';

/** Rôle d'un maillage : sa finition, ou `null` pour le masquer (doublons de l'export Spline). */
type FinishRule = (info: { node: number; mesh: number; name: string }) => Finish | null;

/**
 * Finitions par modèle, d'après les matériaux des scènes Spline (index de maillage du GLB).
 * L'ordre des nœuds du GLB suit l'arbre Spline.
 */
const MODELS: Record<string, FinishRule> = {
    // Cadres métal foncé, planches en bois clair, 2 étagères laquées lilas.
    armoire: ({ mesh }) => (mesh === 0 ? 'darkMetal' : mesh <= 6 ? 'woodLight' : 'lilac'),
    // Les nœuds nommés Cube 2/4/5 doublonnent leur première instance (z-fighting) : masqués.
    bibliotheque: ({ name, mesh }) => (/^Cube [245]$/.test(name) ? null : mesh === 3 ? 'wood' : 'chrome'),
    'commode-arquee': () => 'chrome',
    // Supports et cadres chromés, planches en bois ; le dernier nœud est un doublon isolé.
    etagere: ({ name, mesh }) => (!name ? null : mesh === 4 ? 'wood' : 'chrome'),
    // Plateaux en bois foncé, structure en métal noir.
    'meuble-de-rangement': ({ mesh }) => (mesh === 0 ? 'woodDark' : 'blackMetal'),
    // Plateau miroir (métal foncé) sur caisson en bois clair.
    'table-basse': ({ mesh }) => (mesh === 0 ? 'darkMetal' : 'woodLight'),
    'tables-basses-imbriquees': () => 'chrome',
    // Plan et vasque blancs, montants en bois, façades en inox. Les maillages 2 et 3 sont deux plans
    // superposés (bois et blanc dans Spline) : seul le blanc est gardé, comme sur la photo.
    vasque: ({ mesh }) => {
        if (mesh === 2) return null;
        if (mesh <= 3) return 'white';
        if (mesh >= 12 && mesh <= 18) return 'steel';
        return 'woodLight';
    },
};

export function hasModel(name: string): boolean {
    return name in MODELS;
}

function srgb(r: number, g: number, b: number): Color {
    return new Color().setRGB(r, g, b, SRGBColorSpace);
}

class Finishes {
    private cache = new Map<Finish, Material>();
    private loader = new TextureLoader();
    private textures = new Map<string, Promise<Texture>>();

    private texture(name: string, repeat = false): Promise<Texture> {
        let promise = this.textures.get(name);
        if (!promise) {
            promise = this.loader.loadAsync(`/3d/textures/${name}.webp`).then((texture) => {
                texture.colorSpace = SRGBColorSpace;
                if (repeat) texture.wrapS = texture.wrapT = RepeatWrapping;
                return texture;
            });
            this.textures.set(name, promise);
        }
        return promise;
    }

    async get(finish: Finish): Promise<Material> {
        const cached = this.cache.get(finish);
        if (cached) return cached;
        const material = await this.create(finish);
        this.cache.set(finish, material);
        return material;
    }

    private async create(finish: Finish): Promise<Material> {
        switch (finish) {
            case 'chrome':
                return new MeshMatcapMaterial({ matcap: await this.texture('matcap-metal') });
            case 'darkMetal':
                return new MeshMatcapMaterial({ matcap: await this.texture('matcap-metal'), color: 0xa0a0a0 });
            case 'blackMetal':
                return new MeshMatcapMaterial({ matcap: await this.texture('matcap-metal'), color: 0x2c2c2e });
            case 'steel': // inox brossé : satiné et éclairé, plus fidèle à la photo que le matcap
                return new MeshStandardMaterial({ color: 0xc4c6c8, metalness: 0.35, roughness: 0.45 });
            case 'wood':
                return new MeshStandardMaterial({ map: await this.texture('bois', true), roughness: 0.85 });
            case 'woodLight':
                return new MeshStandardMaterial({ map: await this.texture('bois', true), color: 0xe6d8c4, roughness: 0.9 });
            case 'woodDark':
                return new MeshStandardMaterial({ map: await this.texture('bois', true), color: 0x9a6a4a, roughness: 0.8 });
            case 'lilac':
                return new MeshStandardMaterial({ color: srgb(0.62, 0.55, 0.66), roughness: 0.7 });
            case 'white':
                return new MeshStandardMaterial({ color: 0xffffff, roughness: 0.45 });
        }
    }
}

/**
 * Coordonnées de texture par projection sur la face dominante (les booléens Spline n'en ont pas).
 * Échelle commune : le veinage garde la même taille sur toutes les pièces du meuble.
 */
function addBoxUv(geometry: BufferGeometry, unit: number): void {
    if (geometry.getAttribute('uv')) return;
    const position = geometry.getAttribute('position');
    if (!geometry.getAttribute('normal')) geometry.computeVertexNormals();
    const normal = geometry.getAttribute('normal');
    const uv = new Float32Array(position.count * 2);
    for (let i = 0; i < position.count; i++) {
        const nx = Math.abs(normal.getX(i));
        const ny = Math.abs(normal.getY(i));
        const nz = Math.abs(normal.getZ(i));
        const x = position.getX(i) / unit;
        const y = position.getY(i) / unit;
        const z = position.getZ(i) / unit;
        const [u, v] = nx >= ny && nx >= nz ? [z, y] : ny >= nz ? [x, z] : [x, y];
        uv[i * 2] = u;
        uv[i * 2 + 1] = v;
    }
    geometry.setAttribute('uv', new BufferAttribute(uv, 2));
}

/* ------------------------------ Visionneuse ------------------------------ */

interface Prepared {
    root: Group;
    box: Box3;
    /** Direction caméra → meuble de la scène Spline (repère du meuble normalisé). */
    view: Vector3;
}

export class ModelViewer {
    readonly canvas: HTMLCanvasElement;
    private readonly container: HTMLElement;
    private readonly renderer: WebGLRenderer;
    private readonly scene = new Scene();
    private readonly camera = new PerspectiveCamera(FOV, 1, 0.01, 100);
    private readonly controls: OrbitControls;
    private readonly loader = new GLTFLoader();
    private readonly finishes = new Finishes();
    private readonly prepared = new Map<string, Promise<Prepared>>();
    private current: Prepared | null = null;
    private currentName: string | null = null;
    private frame = 0;
    private interacting = false;
    private intro: { start: number; from: number; to: number } | null = null;
    private active = true;
    private readonly resizeObserver: ResizeObserver;
    private readonly reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    constructor(container: HTMLElement) {
        this.container = container;
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'model-canvas';
        this.canvas.setAttribute('aria-hidden', 'true');
        this.renderer = new WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true });
        this.renderer.outputColorSpace = SRGBColorSpace;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

        // Éclairage des scènes Spline (il n'agit que sur le bois et les laques : le métal est en matcap).
        this.scene.add(new HemisphereLight(0xd3d3d3, 0x828282, 0.75 * Math.PI));
        const sun = new DirectionalLight(0xffffff, 0.7 * Math.PI);
        sun.position.set(2, 3, 3);
        this.scene.add(sun);

        this.controls = new OrbitControls(this.camera, this.canvas);
        this.controls.enableZoom = false;
        this.controls.enablePan = false;
        this.controls.enableDamping = true;
        this.controls.dampingFactor = 0.08;
        this.controls.rotateSpeed = 0.7;
        this.controls.minPolarAngle = 0.12 * Math.PI;
        this.controls.maxPolarAngle = 0.58 * Math.PI;
        this.controls.addEventListener('start', () => {
            this.interacting = true;
            this.intro = null;
            this.requestRender();
        });
        this.controls.addEventListener('end', () => { this.interacting = false; this.requestRender(); });
        this.controls.addEventListener('change', () => this.requestRender());

        this.resizeObserver = new ResizeObserver(() => this.resize());
        this.resizeObserver.observe(container);
        this.resize();
    }

    /** Affiche un meuble (chargé une seule fois, puis conservé pour les allers-retours). */
    async show(name: string): Promise<void> {
        this.currentName = name;
        const prepared = await this.prepare(name);
        if (this.currentName !== name) return; // un autre meuble a été demandé entre-temps
        if (this.current) this.scene.remove(this.current.root);
        this.current = prepared;
        this.scene.add(prepared.root);
        this.frameModel(prepared);
    }

    /** Précharge un meuble sans l'afficher. */
    preload(name: string): void {
        if (hasModel(name)) this.prepare(name).catch(() => {});
    }

    setActive(active: boolean): void {
        this.active = active;
        if (active) this.requestRender();
    }

    private prepare(name: string): Promise<Prepared> {
        let promise = this.prepared.get(name);
        if (!promise) {
            promise = this.loader.loadAsync(`/3d/models/${name}.glb`).then((gltf) => this.build(name, gltf));
            promise.catch(() => this.prepared.delete(name));
            this.prepared.set(name, promise);
        }
        return promise;
    }

    private async build(name: string, gltf: GLTF): Promise<Prepared> {
        const rule = MODELS[name] ?? (() => 'chrome' as const);
        const source = gltf.scene;
        source.updateMatrixWorld(true);

        // Lumières et caméras de l'export : seule la direction de la caméra est conservée.
        const sourceCamera = gltf.cameras[0];
        const view = new Vector3(0.45, -0.25, -1);
        if (sourceCamera) sourceCamera.getWorldDirection(view);
        source.traverse((object) => { if ((object as { isLight?: boolean }).isLight) object.visible = false; });

        const meshes: Mesh[] = [];
        source.traverse((object) => { if ((object as Mesh).isMesh) meshes.push(object as Mesh); });
        const nodes = gltf.parser.json.nodes as { name?: string }[];
        const modelSize = new Box3().setFromObject(source).getSize(new Vector3()).length() || 1;

        await Promise.all(meshes.map(async (mesh) => {
            const association = gltf.parser.associations.get(mesh) as { nodes?: number; meshes?: number } | undefined;
            const node = association?.nodes ?? -1;
            const finish = rule({ node, mesh: association?.meshes ?? -1, name: nodes[node]?.name ?? '' });
            if (!finish) { mesh.visible = false; return; }
            mesh.material = await this.finishes.get(finish);
            if ((mesh.material as MeshStandardMaterial).map) {
                // Unité de projection exprimée dans le repère local du maillage (échelles Spline variées).
                const scale = mesh.getWorldScale(new Vector3()).x || 1;
                addBoxUv(mesh.geometry, (modelSize * 0.6) / scale);
            }
        }));

        // Normalisation : centré, diagonale de 2 unités.
        const box = new Box3().setFromObject(source, true);
        const size = box.getSize(new Vector3());
        const center = box.getCenter(new Vector3());
        const scale = 2 / size.length();
        const root = new Group();
        source.scale.multiplyScalar(scale);
        source.position.sub(center.multiplyScalar(scale));
        root.add(source);
        root.updateMatrixWorld(true);
        return { root, box: new Box3().setFromObject(source, true), view: view.normalize() };
    }

    /** Place la caméra dans l'axe Spline, à la distance où le meuble entier tient dans le cadre. */
    private frameModel(prepared: Prepared): void {
        const target = prepared.box.getCenter(new Vector3());
        this.controls.target.copy(target);
        const backward = prepared.view.clone().negate();
        // Respecte les limites de rotation verticale.
        const polar = MathUtils.clamp(Math.acos(MathUtils.clamp(backward.y, -1, 1)), this.controls.minPolarAngle, this.controls.maxPolarAngle);
        const azimuth = Math.atan2(backward.x, backward.z);
        const animate = !this.reducedMotion;
        this.placeCamera(target, polar, animate ? azimuth - INTRO_TURN : azimuth);
        this.intro = animate ? { start: performance.now(), from: azimuth - INTRO_TURN, to: azimuth } : null;
        this.requestRender();
    }

    private placeCamera(target: Vector3, polar: number, azimuth: number): void {
        const backward = new Vector3().setFromSphericalCoords(1, polar, azimuth);
        this.camera.position.copy(target).addScaledVector(backward, 1);
        this.camera.lookAt(target);
        this.camera.updateMatrixWorld();
        const distance = this.fitDistance(this.current!.box, target, backward);
        this.camera.position.copy(target).addScaledVector(backward, distance);
        this.camera.lookAt(target);
    }

    /** Distance minimale pour que les 8 coins de la boîte tiennent dans le champ (marge comprise). */
    private fitDistance(box: Box3, target: Vector3, backward: Vector3): number {
        const right = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 0);
        const up = new Vector3().setFromMatrixColumn(this.camera.matrixWorld, 1);
        const tanV = Math.tan(MathUtils.degToRad(FOV / 2));
        const tanH = tanV * this.camera.aspect;
        let distance = 0;
        const corner = new Vector3();
        for (let i = 0; i < 8; i++) {
            corner.set(i & 1 ? box.max.x : box.min.x, i & 2 ? box.max.y : box.min.y, i & 4 ? box.max.z : box.min.z).sub(target);
            const depth = corner.dot(backward);
            distance = Math.max(distance, depth + Math.abs(corner.dot(right)) / tanH, depth + Math.abs(corner.dot(up)) / tanV);
        }
        return distance * MARGIN;
    }

    resize(): void {
        const { clientWidth: width, clientHeight: height } = this.container;
        if (!width || !height) return;
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        this.camera.updateProjectionMatrix();
        if (this.current) {
            // Recadre en gardant l'angle choisi par le visiteur.
            const target = this.controls.target;
            const offset = this.camera.position.clone().sub(target);
            const polar = Math.acos(MathUtils.clamp(offset.y / offset.length(), -1, 1));
            this.placeCamera(target, polar, Math.atan2(offset.x, offset.z));
        }
        this.requestRender();
    }

    private requestRender(): void {
        if (this.frame || !this.active) return;
        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            let moving = this.interacting;
            if (this.intro && this.current) {
                const t = Math.min(1, (performance.now() - this.intro.start) / INTRO_MS);
                const eased = 1 - (1 - t) ** 3;
                const offset = this.camera.position.clone().sub(this.controls.target);
                const polar = Math.acos(MathUtils.clamp(offset.y / offset.length(), -1, 1));
                this.placeCamera(this.controls.target, polar, MathUtils.lerp(this.intro.from, this.intro.to, eased));
                if (t >= 1) this.intro = null;
                moving = true;
            }
            // update() renvoie vrai tant que l'amorti de la rotation est en cours.
            if (this.controls.update()) moving = true;
            this.renderer.render(this.scene, this.camera);
            if (moving) this.requestRender();
        });
    }
}
