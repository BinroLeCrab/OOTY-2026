class WebCam {
	constructor(idVideo) {
		this.video = document.getElementById(idVideo);
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

	dispose() {
		this.disposed = true;
		this.stream?.getTracks().forEach((track) => track.stop());
		this.video.srcObject = null;
	}
}

const webcam = new WebCam("webcam");

export default webcam;
