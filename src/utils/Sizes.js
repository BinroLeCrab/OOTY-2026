class Sizes extends EventTarget {
	constructor() {
		super();

		this.width = window.innerWidth;
		this.height = window.innerHeight;
		this.pixelRatio = Math.min(window.devicePixelRatio, 2);

		this.onResize = this.onResize.bind(this);
		window.addEventListener("resize", this.onResize);
	}

	onResize() {
		this.width = window.innerWidth;
		this.height = window.innerHeight;
		this.pixelRatio = Math.min(window.devicePixelRatio, 2);

		this.dispatchEvent(new Event("resize"));
	}

	dispose() {
		window.removeEventListener("resize", this.onResize);
	}
}

const sizes = new Sizes();

export default sizes;
