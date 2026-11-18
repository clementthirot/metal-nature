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
 * Lot H4 — « Du trait à la matière » : la commode apparaît d'abord en arêtes seules
 * (EdgesGeometry + LineSegments, 1 px), puis le chrome se matérialise et les arêtes s'effacent.
 * L'étagère est visible en matière dès le départ : la caméra part du fond, recule à travers ses cadres
 * (accélération au passage de chacun), puis continue en ligne droite jusqu'à la cadrer entière.
 * Tous les meubles sont posés sur le même sol : la grille ne bouge pas d'un meuble à l'autre.
 *
 * Review UI, Lot 3 — 3D plein écran :
 * - le canvas couvre toute la largeur ; le cadrage se fait dans une « zone utile » hors de la colonne
 *   de texte (à droite en desktop, en haut sur mobile/tablette) grâce à `setViewOffset` : aucun meuble
 *   n'est coupé ni posé sous le texte (B5) ;
 * - la grille de la page devient un calque au sol dans la scène (GridHelper qui s'estompe au loin) ;
 * - passage trait → matière par un shader de dissolution : la matière « pousse » du bas vers le haut,
 *   avec un liseré chaud pour le bois et clair pour le métal ;
 * - lignes de cote animées (SVG en surimpression, chiffres en mono) autour de chaque meuble.
 */
import {
    Box3,
    Color,
    DirectionalLight,
    EdgesGeometry,
    Fog,
    GridHelper,
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
    Vector2,
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
const MARGIN = 0.12; // marge autour de chaque meuble dans le cadre (zone utile)
const SURFACE = 0xf5f5f5; // fond de la page : le sol s'y fond au loin
const GRID_COLOR = 0xbdbdbd;
const FLOOR_Y = -0.6; // sol commun à tous les meubles (repère de la scène)
const SVG_NS = 'http://www.w3.org/2000/svg';

/* ---------- Plages de la séquence (progression 0 → 1 de la section) ---------- */
export const PHASES = {
    traverse: [0, 0.2],     // partie du fond, la caméra recule à travers les cadres de l'étagère
    reveal: [0.2, 0.3],     // elle continue de reculer en ligne droite jusqu'à l'étagère entière
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

interface DissolveUniforms {
    uDissolve: { value: number };
    uRange: { value: Vector2 };
}

interface Piece {
    root: Group;
    /** Boîte englobante du meuble (repère local, après normalisation). */
    box: Box3;
    materials: Material[];
    /** Matériau des arêtes (null : pas d'effet trait, ex. appareil modeste). */
    edges: LineBasicMaterial | null;
    /** Uniforms du shader de dissolution, partagés par les matériaux du meuble. */
    dissolve: DissolveUniforms;
}

/** Cotes réelles d'un meuble, en millimètres (null : « sur mesure » sans chiffre). */
export interface PieceDimensions {
    width: number | null;
    height: number | null;
    depth?: number | null;
}

interface AboutSceneOptions {
    /** Effet « arêtes puis matière » (désactivé sur les appareils modestes). */
    edges?: boolean;
    /** Calque SVG des lignes de cote (facultatif). */
    dimensions?: SVGSVGElement | null;
    /** Cotes de l'étagère, des tables et de la commode. */
    sizes?: { shelf?: PieceDimensions; tables?: PieceDimensions; commode?: PieceDimensions };
}

/** Cote affichée : fenêtre de progression où elle se trace, puis s'efface. */
const DIMENSION_WINDOWS = {
    shelf: [0.27, 0.4],
    tables: [0.52, 0.68],
    commode: [0.8, 1.01],
} as const;

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
    private grid: GridHelper;
    /** Zone utile du cadrage, en pixels du canvas. */
    private safe = { width: 1, height: 1, x: 0, y: 0, full: { width: 1, height: 1 } };
    private dims: DimensionOverlay | null;
    private sizes: NonNullable<AboutSceneOptions['sizes']>;

    constructor(private container: HTMLElement, options: AboutSceneOptions = {}) {
        this.withEdges = options.edges ?? true;
        this.sizes = options.sizes ?? {};
        this.dims = options.dimensions ? new DimensionOverlay(options.dimensions) : null;
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

        // La grille de la page devient le sol de la scène, façon calque de bureau d'études.
        this.grid = new GridHelper(24, 48, GRID_COLOR, GRID_COLOR);
        const gridMaterial = this.grid.material as LineBasicMaterial;
        gridMaterial.transparent = true;
        gridMaterial.opacity = 0.55;
        gridMaterial.depthWrite = false;
        this.scene.add(this.grid);
        this.scene.fog = new Fog(SURFACE, 2, 6);
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
        // Elle est visible en matière dès le départ (pas d'effet trait) : c'est le premier plan de la section.
        this.shelf = this.makePiece(shelfGltf, (mesh) => {
            if (/^Cube_[245]$/.test(mesh.name)) { mesh.visible = false; return null; }
            return mesh.geometry === findGeometry(shelfGltf, 'Cube_4') ? woodMat() : metal();
        }, false);

        // Tables : pas d'effet trait (lot H4.4), elles arrivent directement en matière.
        this.tables = Object.assign(this.makePiece(tablesGltf, () => metal(), false), { items: [] as { mesh: Object3D; closedZ: number; openZ: number }[] });
        // Tables : posées au même niveau de sol, puis emboîtées dans la grande (état fermé).
        const tableMeshes = ['Table', 'Table_2', 'Table_3']
            .map((name) => this.tables.root.getObjectByName(name))
            .filter((mesh): mesh is Object3D => Boolean(mesh));
        const floor = Math.min(...tableMeshes.map((mesh) => new Box3().setFromObject(mesh).min.y));
        // Fermées, les trois tables sont réunies au milieu de leur course : elles se déplient de part et d'autre.
        const openZs = tableMeshes.map((mesh) => mesh.position.z);
        const closedZ = openZs.length ? (Math.min(...openZs) + Math.max(...openZs)) / 2 : 0;
        tableMeshes
            .map((mesh) => ({ mesh, size: new Box3().setFromObject(mesh).getSize(new Vector3()).length() }))
            .sort((a, b) => b.size - a.size) // grande, moyenne, petite : ordre de la cascade
            .forEach(({ mesh }) => {
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
        const dissolve: DissolveUniforms = { uDissolve: { value: 1.08 }, uRange: { value: new Vector2(-1, 1) } };
        const edges = withEdges
            ? new LineBasicMaterial({ color: EDGE_COLOR, transparent: true, opacity: 1, depthWrite: false, fog: false })
            : null;
        const meshes: Mesh[] = [];
        source.traverse((object) => {
            const mesh = object as Mesh;
            if (!mesh.isMesh) return;
            const mat = material(mesh);
            if (mat) {
                (mat as Material & { fog?: boolean }).fog = false;
                applyDissolve(mat, dissolve);
                mesh.material = mat;
                materials.push(mat);
                meshes.push(mesh);
            }
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
        return { root, box: new Box3(), materials, edges, dissolve };
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
        // Tous les meubles posés sur le même sol : la grille reste fixe d'un meuble à l'autre.
        inner.position.y += FLOOR_Y + (size.y * scale) / 2;
        inner.updateMatrixWorld(true);
        piece.box = boxWithoutEdges(inner);
        piece.dissolve.uRange.value.set(piece.box.min.y, piece.box.max.y);
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
        const depth = box.max.z - box.min.z;
        const frames = this.frameZ; // du cadre avant au cadre du fond
        const last = frames[frames.length - 1] ?? box.min.z;
        const previous = frames[frames.length - 2] ?? box.max.z;
        return {
            // Départ : à l'intérieur, juste derrière l'avant-dernier cadre, le cadre du fond entier en face.
            startZ: last + (previous - last) * 0.85,
            // Arrivée : la caméra est ressortie à reculons par le cadre avant.
            endZ: box.max.z + depth * 0.15,
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
        this.dims?.resize(width, height);
        // Zone utile : à droite de la colonne de texte en desktop, au-dessus des messages sinon.
        const desktop = width > 1024 && width >= height;
        const textColumn = this.container.dataset.textColumn ? Number(this.container.dataset.textColumn) : 0;
        // Marges : sous la barre de navigation en haut, place pour les cotes en bas et à droite.
        const navHeight = 72;
        if (desktop) {
            const left = Math.min(Math.max(textColumn, width * 0.22), width * 0.45);
            const top = navHeight;
            this.safe = { width: width - left - 110, height: height - top - 70, x: -left, y: -top, full: { width, height } };
        } else {
            const top = navHeight - 8;
            const bottom = Math.min(height * 0.62, height - 240);
            this.safe = { width: width - 80, height: Math.max(bottom, height * 0.45) - top - 40, x: -16, y: -top, full: { width, height } };
        }
        this.camera.aspect = this.safe.width / this.safe.height;
        this.camera.setViewOffset(this.safe.width, this.safe.height, this.safe.x, this.safe.y, width, height);
        this.camera.updateProjectionMatrix();
        if (this.shelf) this.buildTraverseTable();
        this.setProgress(this.progress);
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

        this.updateFloor(p);
        this.updateDimensions(p);
        this.requestRender();
    }

    /** Sol : fixe, commun à tous les meubles ; il s'estompe au loin (brouillard couleur de page). */
    private updateFloor(_p: number): void {
        this.grid.position.y = FLOOR_Y - 0.002;
        const distance = this.camera.position.length();
        const fog = this.scene.fog as Fog;
        fog.near = Math.max(distance * 0.8, 0.5);
        fog.far = distance * 2.4 + 1;
    }

    /** Lignes de cote : largeur sous le meuble, hauteur sur le côté, tracées puis effacées. */
    private updateDimensions(p: number): void {
        if (!this.dims) return;
        const show = (key: keyof typeof DIMENSION_WINDOWS, piece: Piece) => {
            const [a, b] = DIMENSION_WINDOWS[key];
            if (p < a || p > b || !piece.root.visible) return false;
            const t = (p - a) / (b - a);
            const draw = smooth(0, 0.3, t);
            const fade = 1 - smooth(0.82, 1, t);
            piece.root.updateMatrixWorld(true);
            this.dims!.draw(piece.box, piece.root, this.camera, this.sizes[key] ?? { width: null, height: null }, draw, fade);
            return true;
        };
        if (!show('shelf', this.shelf) && !show('tables', this.tables) && !show('commode', this.commode)) this.dims.hide();
    }

    private setFov(fov: number | undefined): void {
        if (fov === undefined || this.camera.fov === fov) return;
        this.camera.fov = fov;
        this.camera.updateProjectionMatrix();
    }

    /** 1. Traversée à reculons : partie du fond de l'étagère, la caméra recule à travers les cadres. */
    private traverse(t: number): void {
        const { root, box, materials } = this.shelf;
        root.rotation.set(0, 0, 0);
        root.position.set(0, 0, 0);
        const center = box.getCenter(new Vector3());
        this.setFov(FOV_TRAVERSE);
        this.setMatter(materials, null, 1, 0);
        const z = this.traverseZ(t);
        this.camera.position.set(center.x, this.tunnelHeight, z);
        this.camera.lookAt(center.x, this.tunnelHeight, z - 1);
        this.camera.near = 0.005;
        this.camera.far = 20;
        this.camera.updateProjectionMatrix();
    }

    /** 2. Sortie des cadres : la caméra continue de reculer en ligne droite et descend pour cadrer l'étagère entière. */
    private reveal(t: number): void {
        const { root, box, materials } = this.shelf;
        root.rotation.set(0, 0, 0);
        root.position.set(0, 0, 0);
        const e = easeInOut(t);
        this.setFov(MathUtils.lerp(FOV_TRAVERSE, FOV, e));
        this.setMatter(materials, null, 1, 0);

        const center = box.getCenter(new Vector3());
        const { endZ } = this.traverseBounds();
        const finalZ = center.z + this.fitDistance(box, new Vector3(0, 0, -1));
        const z = MathUtils.lerp(endZ, finalZ, e);
        const y = MathUtils.lerp(this.tunnelHeight, center.y, e);
        this.camera.position.set(center.x, y, z);
        this.camera.lookAt(center.x, y, z - 1); // regard toujours droit devant, dans l'axe de l'étagère
        const distance = z - center.z;
        this.camera.near = Math.max(distance / 200, 0.005);
        this.camera.far = distance + 10;
        this.camera.updateProjectionMatrix();
    }

    /**
     * Matière (dissolution 0 → 1) et arêtes d'un meuble. `opacity` sert aux fondus d'entrée et de sortie.
     */
    private setMatter(materials: Material[], edges: LineBasicMaterial | null, matter: number, edgeOpacity: number, opacity = 1): void {
        const piece = [this.shelf, this.tables, this.commode].find((item) => item?.materials === materials);
        if (piece) piece.dissolve.uDissolve.value = MathUtils.lerp(-0.08, 1.08, matter);
        setOpacity(materials, opacity);
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
        this.setMatter(materials, this.shelf.edges, 1, 0, 1 - slide);
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

        // Cascade : les trois tables se déplient ensemble, la grande, puis la moyenne et la petite à un souffle d'écart.
        const delay = 0.1;
        const span = 1 - delay * (items.length - 1);
        items.forEach((item, index) => {
            const t = easeInOut(MathUtils.clamp((open - index * delay) / span, 0, 1));
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
        if (this.commode.edges) this.setMatter(materials, this.commode.edges, matter, edgesIn * edgesOut);
        else this.setMatter(materials, null, 1, 0, enter);
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

/* ---------------------------- Dissolution ---------------------------- */

/**
 * Shader de dissolution : un fragment n'apparaît que si sa « valeur » (hauteur dans le meuble + bruit)
 * est sous le seuil uDissolve. La matière pousse donc du pied vers le haut, avec un liseré au front.
 */
function applyDissolve(material: Material, uniforms: DissolveUniforms): void {
    const edge = material instanceof MeshStandardMaterial ? new Color(0xf0dcc0) : new Color(0xffffff);
    material.onBeforeCompile = (shader) => {
        shader.uniforms.uDissolve = uniforms.uDissolve;
        shader.uniforms.uRange = uniforms.uRange;
        shader.uniforms.uEdgeColor = { value: edge };
        shader.vertexShader = shader.vertexShader
            .replace('#include <common>', '#include <common>\nvarying vec3 vDissolvePos;')
            .replace('#include <project_vertex>', '#include <project_vertex>\nvDissolvePos = (modelMatrix * vec4(transformed, 1.0)).xyz;');
        shader.fragmentShader = shader.fragmentShader
            .replace('#include <common>', `#include <common>
varying vec3 vDissolvePos;
uniform float uDissolve;
uniform vec2 uRange;
uniform vec3 uEdgeColor;
float dHash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
float dNoise(vec3 p) {
    vec3 i = floor(p); vec3 f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(dHash(i), dHash(i + vec3(1,0,0)), f.x), mix(dHash(i + vec3(0,1,0)), dHash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(dHash(i + vec3(0,0,1)), dHash(i + vec3(1,0,1)), f.x), mix(dHash(i + vec3(0,1,1)), dHash(i + vec3(1,1,1)), f.x), f.y), f.z);
}
float dValue() {
    float h = clamp((vDissolvePos.y - uRange.x) / max(uRange.y - uRange.x, 1e-4), 0.0, 1.0);
    return h * 0.7 + dNoise(vDissolvePos * 14.0) * 0.3;
}`)
            .replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
float dissolveValue = dValue();
if (dissolveValue > uDissolve) discard;`)
            .replace('#include <dithering_fragment>', `#include <dithering_fragment>
float dissolveEdge = 1.0 - smoothstep(0.0, 0.018, uDissolve - dissolveValue);
gl_FragColor.rgb = mix(gl_FragColor.rgb, uEdgeColor, dissolveEdge * step(uDissolve, 1.0));`);
    };
}

/* ---------------------------- Lignes de cote ---------------------------- */

/** Calque SVG : une cote horizontale (largeur) et une verticale (hauteur), chiffres en mono. */
class DimensionOverlay {
    private groups: { line: SVGPathElement; ticks: SVGPathElement; label: SVGTextElement }[];

    constructor(private svg: SVGSVGElement) {
        svg.replaceChildren();
        this.groups = [0, 1].map(() => {
            const g = document.createElementNS(SVG_NS, 'g');
            const line = document.createElementNS(SVG_NS, 'path');
            const ticks = document.createElementNS(SVG_NS, 'path');
            const label = document.createElementNS(SVG_NS, 'text');
            line.setAttribute('pathLength', '1');
            line.setAttribute('class', 'dim-line');
            ticks.setAttribute('class', 'dim-ticks');
            label.setAttribute('class', 'dim-label');
            g.append(ticks, line, label);
            svg.appendChild(g);
            return { line, ticks, label };
        });
        this.hide();
    }

    resize(width: number, height: number): void {
        this.svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    }

    hide(): void {
        this.svg.style.opacity = '0';
    }

    draw(box: Box3, root: Object3D, camera: PerspectiveCamera, size: PieceDimensions, draw: number, fade: number): void {
        const { width, height } = this.svg.viewBox.baseVal;
        const project = (x: number, y: number, z: number) => {
            const v = new Vector3(x, y, z).applyMatrix4(root.matrixWorld).project(camera);
            return { x: (v.x + 1) / 2 * width, y: (1 - v.y) / 2 * height };
        };
        // Coins avant du meuble : le plus proche de la caméra en profondeur.
        const front = new Vector3(0, 0, box.max.z).applyMatrix4(root.matrixWorld).distanceTo(camera.position)
            < new Vector3(0, 0, box.min.z).applyMatrix4(root.matrixWorld).distanceTo(camera.position) ? box.max.z : box.min.z;
        // Cote horizontale : l'arête du pied la plus visible à l'écran (largeur ou profondeur selon l'angle).
        const side = new Vector3(box.max.x, 0, 0).applyMatrix4(root.matrixWorld).distanceTo(camera.position)
            < new Vector3(box.min.x, 0, 0).applyMatrix4(root.matrixWorld).distanceTo(camera.position) ? box.max.x : box.min.x;
        const wide = [project(box.min.x, box.min.y, front), project(box.max.x, box.min.y, front)];
        const deep = [project(side, box.min.y, box.min.z), project(side, box.min.y, box.max.z)];
        const length = ([a, b]: { x: number; y: number }[]) => Math.hypot(a.x - b.x, a.y - b.y);
        const useDepth = length(deep) > length(wide) * 1.15;
        const [bl, br] = (useDepth ? deep : wide).sort((a, b) => a.x - b.x);
        const top = useDepth ? project(side, box.max.y, br === deep[0] ? box.min.z : box.max.z) : project(box.max.x, box.max.y, front);
        const tr = { x: br.x, y: top.y };
        const gap = 22;
        const tick = 7;

        // Largeur : sous le meuble, décalée vers le bas.
        const wy = Math.max(bl.y, br.y) + gap;
        this.set(0, `M${bl.x},${wy}L${br.x},${wy}`,
            `M${bl.x},${wy - tick}L${bl.x},${wy + tick}M${br.x},${wy - tick}L${br.x},${wy + tick}`,
            (bl.x + br.x) / 2, wy + 20, 'middle', format(useDepth ? size.depth ?? null : size.width), draw);
        // Hauteur : à droite du meuble.
        const hx = Math.max(br.x, tr.x) + gap;
        this.set(1, `M${hx},${br.y}L${hx},${tr.y}`,
            `M${hx - tick},${br.y}L${hx + tick},${br.y}M${hx - tick},${tr.y}L${hx + tick},${tr.y}`,
            hx + 12, (br.y + tr.y) / 2 + 4, 'start', format(size.height), draw);
        this.svg.style.opacity = String(fade);
    }

    private set(index: number, line: string, ticks: string, x: number, y: number, anchor: string, text: string, draw: number): void {
        const group = this.groups[index];
        group.line.setAttribute('d', line);
        group.line.style.strokeDasharray = '1';
        group.line.style.strokeDashoffset = String(1 - draw);
        group.ticks.setAttribute('d', ticks);
        group.ticks.style.opacity = String(MathUtils.smoothstep(draw, 0, 0.2));
        group.label.setAttribute('x', String(x));
        group.label.setAttribute('y', String(y));
        group.label.setAttribute('text-anchor', anchor);
        group.label.textContent = text;
        group.label.style.opacity = String(MathUtils.smoothstep(draw, 0.6, 1));
    }
}

/** 3000 → « 3 000 mm » (espace fine insécable) ; sans chiffre connu : « sur mesure ». */
function format(mm: number | null): string {
    return mm ? `${mm.toLocaleString('fr-FR').replace(/\s/g, '\u202f')} mm` : 'sur mesure';
}
