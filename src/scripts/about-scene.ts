/**
 * Lot G — Scène 3D de « Notre démarche » en Three.js natif (remplace la scène Spline).
 *
 * - 3 meubles (GLB exportés de Spline) : étagère, tables emboîtées, commode arquée.
 * - Métal en matcap (texture extraite de la scène Spline d'origine) : rendu chromé identique, sans lumière.
 * - Bois en MeshStandardMaterial éclairé (valeurs de lumière reprises de Spline).
 * - Cadrage automatique : chaque meuble tient entier dans la zone visible, en portrait comme en paysage.
 * - Rendu à la demande uniquement (défilement, redimensionnement), pixel ratio plafonné à 1,5.
 *
 * La chorégraphie est pilotée par `setProgress(p)` (0 → 1), appelé par la timeline GSAP de la section.
 */
import {
    Box3,
    DirectionalLight,
    Group,
    HemisphereLight,
    MathUtils,
    Mesh,
    MeshMatcapMaterial,
    MeshStandardMaterial,
    PerspectiveCamera,
    RepeatWrapping,
    Scene,
    SRGBColorSpace,
    TextureLoader,
    Vector2,
    Vector3,
    WebGLRenderer,
    type Material,
    type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

const MAX_PIXEL_RATIO = 1.5;
const FOV = 45;
const MARGIN = 0.15; // marge autour de chaque meuble dans le cadre

/* ---------- Plages de la séquence (progression 0 → 1 de la section) ---------- */
export const PHASES = {
    tunnel: [0, 0.3],       // recul à travers l'étagère
    shelfTurn: [0.3, 0.4],  // l'étagère pivote de trois quarts
    shelfOut: [0.4, 0.45],  // puis sort du cadre
    tablesIn: [0.45, 0.5],
    tablesOpen: [0.5, 0.62], // déboîtement table par table
    tablesTurn: [0.62, 0.68],
    tablesOut: [0.68, 0.72],
    commode: [0.72, 0.92],  // entrée en tournant sur ~180°
    rest: [0.92, 1],
} as const;

/** Progression locale (0 → 1) de `p` dans la plage [a, b]. */
const local = (p: number, [a, b]: readonly [number, number]) => MathUtils.clamp((p - a) / (b - a), 0, 1);
const easeInOut = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const easeOut = (t: number) => 1 - (1 - t) ** 3;
const easeIn = (t: number) => t * t * t;

interface Piece {
    root: Group;
    /** Boîte englobante du meuble (repère local, après normalisation). */
    box: Box3;
    materials: Material[];
}

export class AboutScene {
    readonly canvas: HTMLCanvasElement;
    private renderer: WebGLRenderer;
    private scene = new Scene();
    private camera = new PerspectiveCamera(FOV, 1, 0.01, 100);
    private shelf!: Piece;
    private tables!: Piece & { items: { mesh: Object3D; closedZ: number; openZ: number }[] };
    private commode!: Piece;
    private progress = 0;
    private frame = 0;
    /** Largeur (px) masquée à gauche par la carte de texte sur desktop : le meuble est centré à droite. */
    private safeLeft = 0;
    /** Hauteur de caméra au début du tunnel (calculée au chargement). */
    private tunnelHeight = 0;

    constructor(private container: HTMLElement) {
        this.canvas = document.createElement('canvas');
        this.canvas.className = 'about-canvas';
        this.canvas.setAttribute('aria-hidden', 'true');
        this.renderer = new WebGLRenderer({ canvas: this.canvas, alpha: true, antialias: true, powerPreference: 'high-performance' });
        this.renderer.outputColorSpace = SRGBColorSpace;
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO));

        // Lumières de la scène Spline (elles n'agissent que sur le bois : le métal est en matcap).
        this.scene.add(new HemisphereLight(0xd3d3d3, 0x828282, 0.75 * Math.PI));
        const sun = new DirectionalLight(0xffffff, 1.4 * Math.PI * 0.5);
        sun.position.set(200, 300, 300);
        this.scene.add(sun);
    }

    async load(): Promise<void> {
        const textures = new TextureLoader();
        const [matcap, wood, models] = await Promise.all([
            textures.loadAsync('/3d/textures/matcap-metal.webp'),
            textures.loadAsync('/3d/textures/bois.webp'),
            this.loadModels(),
        ]);
        matcap.colorSpace = SRGBColorSpace;
        wood.colorSpace = SRGBColorSpace;
        wood.wrapS = wood.wrapT = RepeatWrapping;

        const metal = () => new MeshMatcapMaterial({ matcap, transparent: true });
        const woodMat = () => new MeshStandardMaterial({ map: wood, roughness: 0.85, metalness: 0, transparent: true });

        const [shelfGltf, tablesGltf, commodeGltf] = models;

        // Étagère : les planches (instances de « Cube 4 ») sont en bois, le reste en métal.
        // Les nœuds nommés Cube 2/4/5 doublonnent leur première instance : on les retire (z-fighting).
        this.shelf = this.makePiece(shelfGltf, (mesh) => {
            if (/^Cube_[245]$/.test(mesh.name)) { mesh.visible = false; return null; }
            return mesh.geometry === findGeometry(shelfGltf, 'Cube_4') ? woodMat() : metal();
        });

        this.tables = Object.assign(this.makePiece(tablesGltf, () => metal()), { items: [] as { mesh: Object3D; closedZ: number; openZ: number }[] });
        // Tables : posées au même niveau de sol, puis emboîtées dans la grande (état fermé).
        const tableMeshes = ['Table', 'Table_2', 'Table_3']
            .map((name) => this.tables.root.getObjectByName(name))
            .filter((mesh): mesh is Object3D => Boolean(mesh));
        const floor = Math.min(...tableMeshes.map((mesh) => new Box3().setFromObject(mesh).min.y));
        const closedZ = tableMeshes[0]?.position.z ?? 0;
        tableMeshes.forEach((mesh) => {
            const box = new Box3().setFromObject(mesh);
            mesh.position.y += (floor - box.min.y) / worldScale(mesh.parent ?? mesh);
            this.tables.items.push({ mesh, closedZ, openZ: mesh.position.z });
        });

        this.commode = this.makePiece(commodeGltf, () => metal());

        // Normalisation : chaque meuble est centré et ramené à un rayon de 1 (les exports Spline ont des échelles variées).
        [this.shelf, this.tables, this.commode].forEach((piece) => {
            this.normalize(piece);
            this.scene.add(piece.root);
        });
        // La boîte des tables est celle de l'état déboîté (le plus large) : le cadrage reste fixe pendant l'animation.

        // Tunnel : à mi-hauteur entre la planche du haut et le haut des cadres.
        const woodTops = collectBoxes(this.shelf.root, (mesh) => mesh.visible && mesh.material instanceof MeshStandardMaterial)
            .map((box) => box.max.y);
        const topPlank = woodTops.length ? Math.max(...woodTops) : this.shelf.box.getCenter(new Vector3()).y;
        this.tunnelHeight = (topPlank + this.shelf.box.max.y) / 2;

        this.resize();
        this.setProgress(this.progress);
    }

    private loadModels() {
        const loader = new GLTFLoader();
        return Promise.all(['bibliotheque', 'tables-basses-imbriquees', 'commode-arquee']
            .map((name) => loader.loadAsync(`/3d/models/${name}.glb`).then((gltf) => gltf.scene)));
    }

    private makePiece(source: Object3D, material: (mesh: Mesh) => Material | null): Piece {
        const materials: Material[] = [];
        source.traverse((object) => {
            const mesh = object as Mesh;
            if (!mesh.isMesh) return;
            const mat = material(mesh);
            if (mat) { mesh.material = mat; materials.push(mat); }
        });
        // Lumières et caméras exportées par Spline : inutiles ici.
        source.traverse((object) => { if ((object as { isLight?: boolean }).isLight) object.visible = false; });
        const root = new Group();
        root.add(source);
        return { root, box: new Box3(), materials };
    }

    private normalize(piece: Piece): void {
        const inner = piece.root.children[0];
        inner.updateMatrixWorld(true);
        const box = new Box3().setFromObject(inner, true);
        const size = box.getSize(new Vector3());
        const center = box.getCenter(new Vector3());
        const scale = 2 / size.length();
        inner.scale.multiplyScalar(scale);
        inner.position.sub(center.multiplyScalar(scale));
        inner.updateMatrixWorld(true);
        piece.box = new Box3().setFromObject(inner, true);
    }

    /* ---------------------------- Dimensions ---------------------------- */

    resize(): void {
        const { clientWidth: width, clientHeight: height } = this.container;
        if (!width || !height) return;
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        // Desktop : la carte de texte couvre la gauche, on décale le centre optique vers la droite.
        const card = this.container.parentElement?.querySelector<HTMLElement>('.about-steps');
        const overlaps = card && getComputedStyle(this.container).position === 'absolute';
        this.safeLeft = overlaps ? Math.max(card.getBoundingClientRect().right - this.container.getBoundingClientRect().left, 0) : 0;
        if (this.safeLeft > 0) this.camera.setViewOffset(width, height, -this.safeLeft / 2, 0, width, height);
        else this.camera.clearViewOffset();
        this.camera.updateProjectionMatrix();
        this.requestRender();
    }

    /**
     * Distance de caméra pour que `box` (repère monde) tienne dans la zone visible,
     * vue dans la direction `forward`, avec la marge demandée.
     */
    private fitDistance(box: Box3, forward: Vector3, margin = MARGIN): number {
        const { x: width } = this.renderer.getSize(new Vector2());
        const visibleRatio = width ? (width - this.safeLeft) / width : 1;
        const tanV = Math.tan(MathUtils.degToRad(FOV / 2)) * (1 - margin);
        const tanH = tanV * this.camera.aspect * visibleRatio;
        const up = new Vector3(0, 1, 0);
        const right = new Vector3().crossVectors(forward, up).normalize();
        const camUp = new Vector3().crossVectors(right, forward).normalize();
        const center = box.getCenter(new Vector3());
        let distance = 0;
        for (let i = 0; i < 8; i += 1) {
            const corner = new Vector3(
                i & 1 ? box.max.x : box.min.x,
                i & 2 ? box.max.y : box.min.y,
                i & 4 ? box.max.z : box.min.z,
            ).sub(center);
            const depth = corner.dot(forward); // > 0 : coin plus loin que le centre
            distance = Math.max(
                distance,
                Math.abs(corner.dot(right)) / tanH - depth,
                Math.abs(corner.dot(camUp)) / tanV - depth,
            );
        }
        return distance;
    }

    /** Place la caméra face à `box`, dans la direction `forward`, à la bonne distance. */
    private frameBox(box: Box3, forward: Vector3, margin = MARGIN): void {
        const center = box.getCenter(new Vector3());
        const distance = this.fitDistance(box, forward, margin);
        this.camera.position.copy(center).addScaledVector(forward, -distance);
        this.camera.lookAt(center);
        this.camera.near = Math.max(distance / 200, 0.005);
        this.camera.far = distance + 10;
        this.camera.updateProjectionMatrix();
    }

    /* ---------------------------- Chorégraphie ---------------------------- */

    setProgress(progress: number): void {
        this.progress = progress;
        if (!this.shelf) return;
        const p = progress;

        this.shelf.root.visible = p < PHASES.shelfOut[1];
        this.tables.root.visible = p >= PHASES.tablesIn[0] && p < PHASES.tablesOut[1];
        this.commode.root.visible = p >= PHASES.commode[0];

        if (p < PHASES.shelfTurn[0]) this.tunnel(local(p, PHASES.tunnel));
        else if (p < PHASES.tablesIn[0]) this.shelfTurn(local(p, PHASES.shelfTurn), local(p, PHASES.shelfOut));
        else if (p < PHASES.commode[0]) this.tablesSequence(p);
        else this.commodeSequence(p);

        this.requestRender();
    }

    /** 1. Tunnel : la caméra recule en ligne droite, dans l'axe de l'étagère, du dernier cadre à la vue de face. */
    private tunnel(t: number): void {
        const { root, box, materials } = this.shelf;
        root.rotation.set(0, 0, 0);
        root.position.set(0, 0, 0);
        setOpacity(materials, 1);
        const forward = new Vector3(0, 0, -1); // on regarde vers -Z, l'étagère s'étend sur Z
        const center = box.getCenter(new Vector3());
        const endDistance = this.fitDistance(new Box3().copy(box), forward);
        // Départ : juste devant le dernier cadre (côté -Z), un peu au-dessus du centre, comme dans Spline.
        // Départ : le dernier cadre remplit presque tout le cadre de l'écran.
        const frameHalfHeight = (box.max.y - box.min.y) / 2;
        const startZ = box.min.z + (frameHalfHeight / Math.tan(MathUtils.degToRad(FOV / 2))) * 0.9;
        const endZ = center.z + endDistance;
        const z = MathUtils.lerp(startZ, endZ, t); // recul linéaire (courbe d'origine)
        // Hauteur de départ : entre la planche du haut et le haut des cadres (comme dans Spline),
        // puis retour progressif au centre pour finir sur la vue de face entière.
        const settle = easeInOut(MathUtils.clamp((t - 0.55) / 0.45, 0, 1));
        const y = MathUtils.lerp(this.tunnelHeight, center.y, settle);
        this.camera.position.set(center.x, y, z);
        this.camera.lookAt(center.x, y, z - 1);
        this.camera.near = 0.005;
        this.camera.far = 20;
        this.camera.updateProjectionMatrix();
    }

    /** 2. L'étagère pivote de trois quarts sur elle-même, puis glisse hors du cadre avec un fondu. */
    private shelfTurn(turn: number, out: number): void {
        const { root, box, materials } = this.shelf;
        const forward = new Vector3(0, 0, -1);
        const angle = MathUtils.degToRad(62) * easeInOut(turn);
        root.rotation.set(0, angle, 0);
        root.updateMatrixWorld(true);
        // Cadrage interpolé entre la vue de face (boîte d'origine) et la boîte de l'étagère pivotée.
        const turned = new Box3().setFromObject(root, true);
        const target = lerpBox(box, turned, easeInOut(turn));
        this.frameBox(target, forward);
        const slide = easeIn(out);
        root.position.x = -slide * (target.max.x - target.min.x) * 1.4;
        setOpacity(materials, 1 - slide);
    }

    /** 3. Tables : entrée emboîtées, déboîtement une à une, puis légère rotation de l'ensemble. */
    private tablesSequence(p: number): void {
        const { root, box, materials, items } = this.tables;
        const forward = new Vector3(-0.55, -0.32, -0.77).normalize();
        const enter = easeOut(local(p, PHASES.tablesIn));
        const open = local(p, PHASES.tablesOpen);
        const turn = easeInOut(local(p, PHASES.tablesTurn));
        const leave = local(p, PHASES.tablesOut);

        root.rotation.set(0, MathUtils.degToRad(-25 + 25 * turn), 0);
        root.position.set((1 - enter) * 2.2 - easeIn(leave) * 2.2, 0, 0);
        setOpacity(materials, enter * (1 - leave));

        // Chaque table glisse avec un décalage : la petite d'abord, puis la moyenne. La grande reste en place.
        items.forEach((item, index) => {
            const delay = (items.length - 1 - index) * 0.25;
            const t = easeInOut(MathUtils.clamp((open - delay * 0.6) / 0.6, 0, 1));
            item.mesh.position.z = MathUtils.lerp(item.closedZ, item.openZ, t);
        });

        this.frameBox(box, forward);
    }

    /** 4. Commode : entre en tournant sur elle-même (~180°, comme sur un plateau), puis se stabilise. */
    private commodeSequence(p: number): void {
        const { root, box, materials } = this.commode;
        const forward = new Vector3(0, -0.18, -1).normalize();
        const t = local(p, PHASES.commode);
        const enter = easeOut(MathUtils.clamp(t / 0.35, 0, 1));
        // Arrivée de trois quarts, courbe et reflets bien visibles en fin de rotation.
        root.rotation.set(0, MathUtils.degToRad(-100 - 180 * (1 - easeInOut(t))), 0);
        root.position.set((1 - enter) * 2, 0, 0);
        setOpacity(materials, enter);
        // Boîte de cadrage : sphère englobante (la commode tourne, son emprise change).
        const radius = box.getSize(new Vector3()).length() / 2;
        const sphereBox = new Box3(new Vector3(-radius, box.min.y, -radius), new Vector3(radius, box.max.y, radius));
        this.frameBox(sphereBox, forward, 0.08);
    }

    /* ---------------------------- Rendu ---------------------------- */

    requestRender(): void {
        if (this.frame) return;
        this.frame = requestAnimationFrame(() => {
            this.frame = 0;
            this.renderer.render(this.scene, this.camera);
        });
    }
}

function collectBoxes(root: Object3D, keep: (mesh: Mesh) => boolean): Box3[] {
    const boxes: Box3[] = [];
    root.updateMatrixWorld(true);
    root.traverse((object) => {
        const mesh = object as Mesh;
        if (mesh.isMesh && keep(mesh)) boxes.push(new Box3().setFromObject(mesh, true));
    });
    return boxes;
}

function findGeometry(root: Object3D, name: string) {
    return (root.getObjectByName(name) as Mesh | undefined)?.geometry;
}

function worldScale(object: Object3D): number {
    return object.getWorldScale(new Vector3()).y || 1;
}

function setOpacity(materials: Material[], opacity: number): void {
    materials.forEach((material) => {
        material.opacity = opacity;
        material.depthWrite = opacity > 0.99;
    });
}

function lerpBox(a: Box3, b: Box3, t: number): Box3 {
    return new Box3(a.min.clone().lerp(b.min, t), a.max.clone().lerp(b.max, t));
}

