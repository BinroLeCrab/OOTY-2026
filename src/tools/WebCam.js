class WebCam {
	constructor(idVideo) {
		this.video = document.getElementById(idVideo);
		this.disposed = false;

		if (!navigator.mediaDevices?.getUserMedia) {
			this.ready = Promise.resolve(false);
			console.error("Webcam indisponible : utiliser localhost ou HTTPS.");
			return;
		}

		this.ready = navigator.mediaDevices
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
			.then(async (stream) => {
				if (this.disposed) {
					stream.getTracks().forEach((track) => track.stop());
					return;
				}
				this.video.srcObject = stream;
				this.stream = stream;
				await this.video.play();
				return true;
			})
			.catch((error) => {
				console.error("Erreur d'accès à la webcam :", error);
				return false;
			});
	}

	dispose() {
		this.disposed = true;
		this.stream?.getTracks().forEach((track) => track.stop());
		this.video.srcObject = null;
	}
}

const webcam = new WebCam("webcam");

export default webcam;
