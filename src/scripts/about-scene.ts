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
 *
 * Lot H4 — « Du trait à la matière » : l'étagère et la commode apparaissent d'abord en arêtes seules
 * (EdgesGeometry + LineSegments, 1 px), puis le bois et le chrome se matérialisent et les arêtes s'effacent.
 * La caméra traverse les 3 cadres de l'étagère (accélération au passage de chacun, FOV 45° → 52°),
 * ressort et pivote pour révéler l'étagère entière, centrée dans l'écran.
 */
import {
    Box3,
    DirectionalLight,
    EdgesGeometry,
    LineBasicMaterial,
    LineSegments,
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
    Vector3,
    WebGLRenderer,
    type Material,
    type Object3D,
} from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { withBase } from '../utils/paths';

const MAX_PIXEL_RATIO = 1.5;
const FOV = 45;
const FOV_TRAVERSE = 52;
const EDGE_COLOR = 0x2a2b2c;
const MARGIN = 0.15; // marge autour de chaque meuble dans le cadre

/* ---------- Plages de la séquence (progression 0 → 1 de la section) ---------- */
export const PHASES = {
    traverse: [0, 0.2],     // la caméra avance à travers les 3 cadres (arêtes → matière)
    reveal: [0.2, 0.3],     // elle ressort et pivote pour révéler l'étagère entière
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
const smooth = (a: number, b: number, t: number) => MathUtils.smoothstep(t, a, b);

interface Piece {
    root: Group;
    /** Boîte englobante du meuble (repère local, après normalisation). */
    box: Box3;
    materials: Material[];
    /** Matériau des arêtes (null : pas d'effet trait, ex. appareil modeste). */
    edges: LineBasicMaterial | null;
}

interface AboutSceneOptions {
    /** Effet « arêtes puis matière » (désactivé sur les appareils modestes). */
    edges?: boolean;
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
    /** Hauteur de caméra pendant la traversée (calculée au chargement). */
    private tunnelHeight = 0;
    /** Position Z des cadres de l'étagère, du premier traversé au dernier. */
    private frameZ: number[] = [];
    /** Table t(z) de la traversée : accélération au passage de chaque cadre. */
    private traverseTable: { z: number; t: number }[] = [];
    private withEdges: boolean;

    constructor(private container: HTMLElement, options: AboutSceneOptions = {}) {
        this.withEdges = options.edges ?? true;
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
            textures.loadAsync(withBase('/3d/textures/matcap-metal.webp')),
            textures.loadAsync(withBase('/3d/textures/bois.webp')),
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
        }, this.withEdges);

        // Tables : pas d'effet trait (lot H4.4), elles arrivent directement en matière.
        this.tables = Object.assign(this.makePiece(tablesGltf, () => metal(), false), { items: [] as { mesh: Object3D; closedZ: number; openZ: number }[] });
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

        this.commode = this.makePiece(commodeGltf, () => metal(), this.withEdges);

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
        this.frameZ = findFrames(this.shelf);
        this.buildTraverseTable();

        this.resize();
        this.setProgress(this.progress);
    }

    private loadModels() {
        const loader = new GLTFLoader();
        return Promise.all(['bibliotheque', 'tables-basses-imbriquees', 'commode-arquee']
            .map((name) => loader.loadAsync(withBase(`/3d/models/${name}.glb`)).then((gltf) => gltf.scene)));
    }

    private makePiece(source: Object3D, material: (mesh: Mesh) => Material | null, withEdges: boolean): Piece {
        const materials: Material[] = [];
        const edges = withEdges
            ? new LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 1, depthWrite: false })
            : null;
        const meshes: Mesh[] = [];
        source.traverse((object) => {
            const mesh = object as Mesh;
            if (!mesh.isMesh) return;
            const mat = material(mesh);
            if (mat) { mesh.material = mat; materials.push(mat); meshes.push(mesh); }
        });
        // Arêtes : uniquement les angles marqués (> 30°), en traits de 1 px, enfants de chaque maillage.
        if (edges) {
            meshes.forEach((mesh) => {
                const lines = new LineSegments(new EdgesGeometry(mesh.geometry, 30), edges);
                lines.name = 'edges';
                mesh.add(lines);
            });
        }
        // Lumières et caméras exportées par Spline : inutiles ici.
        source.traverse((object) => { if ((object as { isLight?: boolean }).isLight) object.visible = false; });
        const root = new Group();
        root.add(source);
        return { root, box: new Box3(), materials, edges };
    }

    private normalize(piece: Piece): void {
        const inner = piece.root.children[0];
        inner.updateMatrixWorld(true);
        const box = boxWithoutEdges(inner);
        const size = box.getSize(new Vector3());
        const center = box.getCenter(new Vector3());
        const scale = 2 / size.length();
        inner.scale.multiplyScalar(scale);
        inner.position.sub(center.multiplyScalar(scale));
        inner.updateMatrixWorld(true);
        piece.box = boxWithoutEdges(inner);
    }

    /**
     * Traversée : la vitesse augmente au passage de chaque cadre (bosse gaussienne).
     * On intègre dt = dz / v(z) puis on normalise : t(z) croissant, inversé par interpolation.
     */
    private buildTraverseTable(): void {
        const { startZ, endZ } = this.traverseBounds();
        const width = Math.abs(startZ - endZ) * 0.06;
        const speed = (z: number) => 1 + 0.9 * this.frameZ.reduce((sum, fz) => sum + Math.exp(-(((z - fz) / width) ** 2)), 0);
        const steps = 200;
        const table = [{ z: startZ, t: 0 }];
        let total = 0;
        for (let i = 1; i <= steps; i += 1) {
            const z = MathUtils.lerp(startZ, endZ, i / steps);
            total += 1 / speed(z);
            table.push({ z, t: total });
        }
        this.traverseTable = table.map(({ z, t }) => ({ z, t: t / total }));
    }

    private traverseBounds() {
        const { box } = this.shelf;
        const halfHeight = (box.max.y - box.min.y) / 2;
        const depth = box.max.z - box.min.z;
        return {
            // Départ : devant le premier cadre, qui remplit presque tout l'écran.
            startZ: box.max.z + (halfHeight / Math.tan(MathUtils.degToRad(FOV / 2))) * 0.75,
            // Arrivée : juste après le dernier cadre.
            endZ: box.min.z - depth * 0.12,
        };
    }

    private traverseZ(t: number): number {
        const table = this.traverseTable;
        if (!table.length) return 0;
        let i = 1;
        while (i < table.length - 1 && table[i].t < t) i += 1;
        const a = table[i - 1];
        const b = table[i];
        return MathUtils.lerp(a.z, b.z, b.t === a.t ? 0 : (t - a.t) / (b.t - a.t));
    }

    /* ---------------------------- Dimensions ---------------------------- */

    resize(): void {
        const { clientWidth: width, clientHeight: height } = this.container;
        if (!width || !height) return;
        this.renderer.setSize(width, height, false);
        this.camera.aspect = width / height;
        // Lot H4.1 : meuble centré dans l'écran, les messages se posent par-dessus.
        this.camera.updateProjectionMatrix();
        if (this.shelf) this.buildTraverseTable();
        this.requestRender();
    }

    /**
     * Distance de caméra pour que `box` (repère monde) tienne dans la zone visible,
     * vue dans la direction `forward`, avec la marge demandée.
     */
    private fitDistance(box: Box3, forward: Vector3, margin = MARGIN): number {
        const tanV = Math.tan(MathUtils.degToRad(this.camera.fov / 2)) * (1 - margin);
        const tanH = tanV * this.camera.aspect;
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

        this.setFov(p < PHASES.reveal[1] ? undefined : FOV);
        if (p < PHASES.traverse[1]) this.traverse(local(p, PHASES.traverse));
        else if (p < PHASES.shelfTurn[0]) this.reveal(local(p, PHASES.reveal));
        else if (p < PHASES.tablesIn[0]) this.shelfTurn(local(p, PHASES.shelfTurn), local(p, PHASES.shelfOut));
        else if (p < PHASES.commode[0]) this.tablesSequence(p);
        else this.commodeSequence(p);

        this.requestRender();
    }

    private setFov(fov: number | undefined): void {
        if (fov === undefined || this.camera.fov === fov) return;
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
    }

    /** 1. Traversée : la caméra avance dans l'axe, à travers les 3 cadres ; la matière remplace le trait. */
    private traverse(t: number): void {
        const { root, box, materials, edges } = this.shelf;
        root.rotation.set(0, 0, 0);
        root.position.set(0, 0, 0);
        const center = box.getCenter(new Vector3());
        this.setFov(MathUtils.lerp(FOV, FOV_TRAVERSE, easeInOut(t)));
        // Du trait à la matière : le bois et le chrome apparaissent pendant la traversée.
        // Sans effet trait (appareil modeste), le meuble est directement en matière.
        this.setMatter(materials, edges, edges ? smooth(0.2, 0.85, t) : 1, 1);
        const z = this.traverseZ(t);
        this.camera.position.set(center.x, this.tunnelHeight, z);
        this.camera.lookAt(center.x, this.tunnelHeight, z - 1);
        this.camera.near = 0.005;
        this.camera.far = 20;
        this.camera.updateProjectionMatrix();
    }

    /** 2. La caméra ressort derrière le dernier cadre, pivote et recule pour révéler l'étagère entière. */
    private reveal(t: number): void {
        const { root, box, materials, edges } = this.shelf;
        root.rotation.set(0, 0, 0);
        root.position.set(0, 0, 0);
        const e = easeInOut(t);
        this.setFov(MathUtils.lerp(FOV_TRAVERSE, FOV, e));
        // Les arêtes s'effacent complètement.
        this.setMatter(materials, edges, 1, 1 - smooth(0, 0.6, t));

        const center = box.getCenter(new Vector3());
        const { endZ } = this.traverseBounds();
        const startRadius = Math.abs(center.z - endZ);
        const endRadius = this.fitDistance(box, new Vector3(0, 0, -1));
        const radius = MathUtils.lerp(startRadius, endRadius, e);
        const angle = Math.PI * e; // de derrière (θ = 0) à devant (θ = π), en passant par le côté
        const y = MathUtils.lerp(this.tunnelHeight, center.y, e);
        this.camera.position.set(center.x - Math.sin(angle) * radius, y, center.z - Math.cos(angle) * radius);
        // Le regard passe de « droit devant » au centre de l'étagère.
        const ahead = this.camera.position.clone().add(new Vector3(0, 0, -radius));
        const target = ahead.lerp(new Vector3(center.x, center.y, center.z), smooth(0, 0.55, t));
        this.camera.lookAt(target);
        this.camera.near = Math.max(radius / 200, 0.005);
        this.camera.far = radius + 10;
        this.camera.updateProjectionMatrix();
    }

    /** Opacité de la matière et des arêtes d'un meuble. */
    private setMatter(materials: Material[], edges: LineBasicMaterial | null, matter: number, edgeOpacity: number): void {
        setOpacity(materials, matter);
        if (edges) {
            edges.opacity = edgeOpacity;
            edges.visible = edgeOpacity > 0.01;
        }
    }

    /** 2. L'étagère pivote de trois quarts sur elle-même, puis glisse hors du cadre avec un fondu. */
    private shelfTurn(turn: number, out: number): void {
        const { root, box, materials } = this.shelf;
        this.setFov(FOV);
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
        this.setMatter(materials, this.shelf.edges, 1 - slide, 0);
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
        // Lent tour de plateau sur toute la séquence.
        root.rotation.set(0, MathUtils.degToRad(-100 - 180 * (1 - easeInOut(t))), 0);
        root.position.set((1 - enter) * 2, 0, 0);
        // Arrivée en arêtes seules, puis matérialisation et effacement du trait (lot H4.5).
        const edgesIn = enter;
        const matter = smooth(0.3, 0.6, t);
        const edgesOut = 1 - smooth(0.5, 0.7, t);
        this.setMatter(materials, this.commode.edges, this.commode.edges ? matter : enter, edgesIn * edgesOut);
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


/** Boîte englobante des maillages seuls (sans les arêtes ajoutées). */
function boxWithoutEdges(root: Object3D): Box3 {
    const box = new Box3();
    root.updateMatrixWorld(true);
    root.traverse((object) => {
        const mesh = object as Mesh;
        if (mesh.isMesh && mesh.visible) box.union(meshBox(mesh));
    });
    return box;
}

function meshBox(mesh: Mesh): Box3 {
    mesh.geometry.computeBoundingBox();
    return mesh.geometry.boundingBox!.clone().applyMatrix4(mesh.matrixWorld);
}

/**
 * Position Z des cadres de l'étagère : pièces métalliques fines en profondeur, regroupées par Z.
 * Repli : trois cadres régulièrement espacés.
 */
function findFrames(piece: Piece): number[] {
    const { box } = piece;
    const depth = box.max.z - box.min.z;
    const zs: number[] = [];
    piece.root.updateMatrixWorld(true);
    piece.root.traverse((object) => {
        const mesh = object as Mesh;
        if (!mesh.isMesh || !mesh.visible || mesh.material instanceof MeshStandardMaterial) return;
        const b = meshBox(mesh);
        if (b.max.z - b.min.z < depth * 0.2) zs.push((b.min.z + b.max.z) / 2);
    });
    zs.sort((a, b) => b - a);
    const clusters: number[][] = [];
    zs.forEach((z) => {
        const last = clusters[clusters.length - 1];
        if (last && Math.abs(last[last.length - 1] - z) < depth * 0.08) last.push(z);
        else clusters.push([z]);
    });
    const frames = clusters.map((c) => c.reduce((a, b) => a + b, 0) / c.length);
    return frames.length >= 2 && frames.length <= 6
        ? frames
        : [box.max.z, (box.max.z + box.min.z) / 2, box.min.z];
}
