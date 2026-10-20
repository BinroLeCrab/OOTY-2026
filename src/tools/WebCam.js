class WebCam {
	constructor(idVideo, idCanvas) {
		this.video = document.getElementById(idVideo);
		this.canvas = document.getElementById(idCanvas);
		this.ctx = this.canvas.getContext("2d", { willReadFrequently: true });
		this.lastFrameTime = -1;
		this.disposed = false;

		if (!navigator.mediaDevices?.getUserMedia) {
			console.error("Webcam indisponible : utiliser localhost ou HTTPS.");
			return;
		}

		navigator.mediaDevices
			.getUserMedia({
				video: {
					width: {
						ideal: 1920,
					},
					height: {
						ideal: 1080,
					},
				},
			})
			.then((stream) => {
				if (this.disposed) {
					stream.getTracks().forEach((track) => track.stop());
					return;
				}
				this.video.srcObject = stream;
				this.stream = stream;
			})
			.catch((error) => {
				console.error("Erreur d'accès à la webcam :", error);
			});
	}

	getFrame() {
		if (this.video.readyState >= this.video.HAVE_CURRENT_DATA &&
			this.video.videoWidth > 0 && this.video.videoHeight > 0 &&
			this.video.currentTime !== this.lastFrameTime) {
			this.lastFrameTime = this.video.currentTime;
			if (this.canvas.width !== this.video.videoWidth || this.canvas.height !== this.video.videoHeight) {
				this.canvas.width = this.video.videoWidth;
				this.canvas.height = this.video.videoHeight;
			}

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

	dispose() {
		this.disposed = true;
		this.stream?.getTracks().forEach((track) => track.stop());
		this.video.srcObject = null;
	}
}

const webcam = new WebCam("webcam", "webcamCanvas");

export default webcam;
