import * as THREE from 'three/webgpu'

class InteractionRaycaster extends THREE.Raycaster {

    init(camera, domElement) {
        this.enabled = false;
        this.camera = camera
        this.domElement = domElement

        this.cursor = new THREE.Vector2()
        this.interactiveObjects = []
        this.hoveredObject = null

        domElement.addEventListener('pointermove', this.onPointerMove)
        domElement.addEventListener('pointerleave', this.onPointerLeave)
        domElement.addEventListener('pointerdown', this.onPointerDown)
    }

    activate() {
        this.enabled = true
    }

    deactivate() {
        this.enabled = false
    }

    add(object) {
        if (!this.interactiveObjects.includes(object)) {
            this.interactiveObjects.push(object)
        }
    }

    remove(object) {
        this.interactiveObjects = this.interactiveObjects.filter(
            (interactiveObject) => interactiveObject !== object
        )
    }

    onPointerMove = (event) => {
        const bounds = this.domElement.getBoundingClientRect()

        this.cursor.x =
            ((event.clientX - bounds.left) / bounds.width) * 2 - 1

        this.cursor.y =
            -((event.clientY - bounds.top) / bounds.height) * 2 + 1
    }

    onPointerLeave = () => {
        if (this.hoveredObject?.isHover) {
            this.hoveredObject.isHover(false)
        }

        this.hoveredObject = null
    }

    onPointerDown = () => {
        const object = this.getIntersectedObject()

        if (object?.isClicked) {
            object.isClicked()
        }
    }

    getIntersectedObject() {
        this.setFromCamera(this.cursor, this.camera)

        const intersections = this.intersectObjects(
            this.interactiveObjects,
            true
        )

        if (intersections.length === 0) {
            return null
        }

        const intersectedObject = intersections[0].object

        return this.findInteractiveParent(intersectedObject)
    }

    findInteractiveParent(object) {
        let currentObject = object

        while (currentObject) {
            if (this.interactiveObjects.includes(currentObject)) {
                return currentObject
            }

            currentObject = currentObject.parent
        }

        return null
    }

    update() {

        if (!this.enabled) return;

        const intersectedObject = this.getIntersectedObject()

        if (intersectedObject !== this.hoveredObject) {
            if (this.hoveredObject?.isHover) {
                this.hoveredObject.isHover(false)
            }

            if (intersectedObject?.isHover) {
                intersectedObject.isHover(true)
            }

            this.hoveredObject = intersectedObject
        }
    }

    dispose() {
        this.domElement.removeEventListener('pointermove', this.onPointerMove)
        this.domElement.removeEventListener('pointerleave', this.onPointerLeave)
        this.domElement.removeEventListener('pointerdown', this.onPointerDown)
    }
}

const interactionRaycaster = new InteractionRaycaster();

export default interactionRaycaster;