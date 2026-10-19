class WebCam {
	constructor(idVideo, idCanvas) {
		this.video = document.getElementById(idVideo);
		this.canvas = document.getElementById(idCanvas);
		this.ctx = this.canvas.getContext("2d");

		navigator.mediaDevices
			.getUserMedia({
				video: {
					width: {
						min: 1080,
						ideal: 1920,
					},
					height: {
						min: 720,
						ideal: 1080,
					},
				},
			})
			.then((stream) => {
				this.video.srcObject = stream;
				this.stream = stream;
			})
			.catch((error) => {
				console.error("Erreur d'accès à la webcam :", error);
			});
	}

	getFrame() {
		if (this.video.readyState === this.video.HAVE_ENOUGH_DATA) {
			this.canvas.width = this.video.videoWidth;
			this.canvas.height = this.video.videoHeight;

			console.log(
				"Video dimensions:",
				this.video.videoWidth,
				this.video.videoHeight
			);

			this.ctx.drawImage(
				this.video,
				0,
				0,
				this.canvas.width,
				this.canvas.height
			);

			const imageData = this.ctx.getImageData(
				0,
				0,
				this.canvas.width,
				this.canvas.height
			);

			return imageData;
		}
	}
}

const webcam = new WebCam("webcam", "webcamCanvas");

export default webcam;
