import { lzo1xCompress } from "lzo1x";

const KNOWN_SERVICE_UUID = "0000ae30-0000-1000-8000-00805f9b34fb";
const WRITE_CHARACTERISTIC_UUID = "0000ae01-0000-1000-8000-00805f9b34fb";
const BLE_PACKET_SIZE = 20;
const BLE_PACKET_DELAY = 4;
const IMAGE_WIDTH = 384;
const BLOCK_LINES = 20;
const PAPER_FEED_LINES = 64;
const IMAGE_CONTRAST = 1;
const GRAYSCALE_LEVELS = 14;

function createPrinterPanel() {
	const panel = document.createElement("section");
	panel.id = "thermal-printer";
	panel.innerHTML = `
		<strong>Imprimante thermique</strong>
		<button type="button" data-action="connect">Connecter X6h-0000</button>
		<label>
			Image à imprimer
			<input type="file" accept="image/*" data-image />
		</label>
		<button type="button" data-action="print" disabled>Imprimer l'image</button>
		<output data-status aria-live="polite">Non connectée</output>
	`;
	document.body.append(panel);
	return panel;
}

function toMonochromeRaster(image) {
	const scale = IMAGE_WIDTH / image.naturalWidth;
	const width = IMAGE_WIDTH;
	const height = Math.max(1, Math.round(image.naturalHeight * scale));
	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const context = canvas.getContext("2d", { willReadFrequently: true });

	if (!context) {
		throw new Error("Le canvas 2D n'est pas disponible.");
	}

	context.fillStyle = "#fff";
	context.fillRect(0, 0, width, height);
	context.drawImage(image, 0, 0, width, height);

	const pixels = context.getImageData(0, 0, width, height).data;
	const raster = new Uint8Array(width * height);

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const pixel = (y * width + x) * 4;
			const luminance =
				0.299 * pixels[pixel] +
				0.587 * pixels[pixel + 1] +
				0.114 * pixels[pixel + 2];

			const darkness = Math.max(
				0,
				Math.min(255, ((255 - luminance) - 128) * IMAGE_CONTRAST + 128),
			);
			const level = Math.round((darkness / 255) * (GRAYSCALE_LEVELS - 1));
			raster[y * width + x] =
				Math.round((level * 255) / (GRAYSCALE_LEVELS - 1));
		}
	}

	return { width, height, raster };
}

function crc8(data, start, length) {
	let crc = 0;
	for (let index = start; index < start + length; index += 1) {
		crc ^= data[index];
		for (let bit = 0; bit < 8; bit += 1) {
			crc = (crc & 0x80) ? ((crc << 1) ^ 0x07) & 0xff : (crc << 1) & 0xff;
		}
	}
	return crc;
}

function createCommand(commandId, payload) {
	const command = new Uint8Array(8 + payload.length);
	command.set([0x51, 0x78, commandId, 0x00, payload.length & 0xff, payload.length >> 8]);
	command.set(payload, 6);
	command[6 + payload.length] = crc8(command, 6, payload.length);
	command[7 + payload.length] = 0xff;
	return command;
}

function compress(data) {
	return lzo1xCompress(data);
}

function createPrintLinesCommand(data) {
	const packed = new Uint8Array(Math.ceil(data.length / 2));
	for (let index = 0; index < data.length; index += 2) {
		packed[index / 2] = (data[index] & 0xf0) | ((data[index + 1] ?? 0) >> 4);
	}
	const compressed = compress(packed);
	const payload = new Uint8Array(4 + compressed.length);
	payload.set([
		packed.length & 0xff,
		packed.length >> 8,
		compressed.length & 0xff,
		compressed.length >> 8,
	]);
	payload.set(compressed, 4);
	return createCommand(0xcf, payload);
}

function createPrintCommands({ width, height, raster }) {
	const padded = new Uint8Array(width * (height + 1));
	padded.set(raster, width);
	const feed = new Uint8Array([PAPER_FEED_LINES & 0xff, PAPER_FEED_LINES >> 8]);
	const feedCommand = createCommand(0xa1, feed);
	const commands = [];
	const blockSize = width * BLOCK_LINES;

	for (let offset = 0; offset < padded.length; offset += blockSize) {
		const block = new Uint8Array(blockSize);
		block.set(padded.slice(offset, offset + blockSize));
		commands.push(createPrintLinesCommand(block));
	}

	commands.push(feedCommand);
	const totalLength = commands.reduce((length, command) => length + command.length, 0);
	const payload = new Uint8Array(totalLength);
	let offset = 0;

	for (const command of commands) {
		payload.set(command, offset);
		offset += command.length;
	}

	return payload;
}

async function writePayload(characteristic, data) {
	const packetCount = Math.ceil(data.length / BLE_PACKET_SIZE);
	console.info("[ThermalPrinter] Envoi BLE", {
		bytes: data.length,
		packetCount,
		packetSize: BLE_PACKET_SIZE,
		writeWithoutResponse: characteristic.properties.writeWithoutResponse,
	});
	console.info(
		"[ThermalPrinter] Début du flux (hex)",
		Array.from(data.slice(0, 40), (value) => value.toString(16).padStart(2, "0")).join(" "),
	);
	if (!characteristic.properties.writeWithoutResponse && !characteristic.properties.write) {
		throw new Error("La caractéristique ne permet pas l'écriture BLE.");
	}

	for (
		let offset = 0, packetIndex = 0;
		offset < data.length;
		offset += BLE_PACKET_SIZE, packetIndex += 1
	) {
		const packet = data.slice(
			offset,
			Math.min(offset + BLE_PACKET_SIZE, data.length),
		);
		if (characteristic.properties.writeWithoutResponse) {
			await characteristic.writeValueWithoutResponse(packet);
		} else {
			await characteristic.writeValue(packet);
		}
		if (BLE_PACKET_DELAY > 0) {
			await new Promise((resolve) => setTimeout(resolve, BLE_PACKET_DELAY));
		}
		if (packetIndex === 0 || packetIndex + 1 === packetCount || (packetIndex + 1) % 10 === 0) {
			console.info("[ThermalPrinter] Progression", {
				packet: packetIndex + 1,
				total: packetCount,
			});
		}
	}
	console.info("[ThermalPrinter] Envoi terminé");
}

async function findWriteCharacteristic(server) {
	const services = [];

	try {
		services.push(await server.getPrimaryService(KNOWN_SERVICE_UUID));
	} catch {
		const discoveredServices = await server.getPrimaryServices();
		services.push(...discoveredServices);
	}

	for (const service of services) {
		const characteristics = await service.getCharacteristics();
		const writable = characteristics.find(
			(characteristic) =>
				characteristic.uuid === WRITE_CHARACTERISTIC_UUID &&
				(characteristic.properties.write ||
					characteristic.properties.writeWithoutResponse),
		);

		if (writable) {
			return {
				characteristic: writable,
				description: `${service.uuid} / ${writable.uuid}`,
			};
		}
	}

	throw new Error("Aucune caractéristique BLE accessible en écriture.");
}

async function loadImage(file) {
	const url = URL.createObjectURL(file);
	try {
		const image = new Image();
		image.src = url;
		await image.decode();
		return image;
	} finally {
		URL.revokeObjectURL(url);
	}
}

export function initializeThermalPrinter() {
	const panel = createPrinterPanel();
	const connectButton = panel.querySelector('[data-action="connect"]');
	const printButton = panel.querySelector('[data-action="print"]');
	const imageInput = panel.querySelector("[data-image]");
	const status = panel.querySelector("[data-status]");
	let writeCharacteristic = null;

	const setStatus = (message, isError = false) => {
		status.textContent = message;
		status.dataset.error = String(isError);
	};

	connectButton.addEventListener("click", async () => {
		if (!("bluetooth" in navigator)) {
			setStatus("Web Bluetooth n'est pas disponible dans ce navigateur.", true);
			return;
		}

		connectButton.disabled = true;
		setStatus("Recherche de l'imprimante...");
		try {
			const device = await navigator.bluetooth.requestDevice({
				filters: [{ namePrefix: "X6h" }],
				optionalServices: [KNOWN_SERVICE_UUID],
			});
			console.info("[ThermalPrinter] Périphérique sélectionné", {
				name: device.name,
				id: device.id,
			});
			if (!device.name || !device.name.startsWith("X6h")) {
				throw new Error(`Périphérique sélectionné inattendu : ${device.name}`);
			}
			const server = await device.gatt.connect();
			console.info("[ThermalPrinter] GATT connecté");
			const result = await findWriteCharacteristic(server);
			writeCharacteristic = result.characteristic;
			console.info("[ThermalPrinter] Caractéristique d'écriture", {
				service: result.description.split(" / ")[0],
				characteristic: result.characteristic.uuid,
				properties: result.characteristic.properties,
			});
			printButton.disabled = false;
			setStatus(`Connectée. Canal détecté : ${result.description}`);
			device.addEventListener("gattserverdisconnected", () => {
				writeCharacteristic = null;
				printButton.disabled = true;
				setStatus("Imprimante déconnectée.", true);
			});
		} catch (error) {
			setStatus(`Connexion impossible : ${error.message}`, true);
		} finally {
			connectButton.disabled = false;
		}
	});

	printButton.addEventListener("click", async () => {
		if (!writeCharacteristic) {
			setStatus("Connecte d'abord l'imprimante.", true);
			return;
		}

		const [file] = imageInput.files;
		if (!file) {
			setStatus("Sélectionne une image avant d'imprimer.", true);
			return;
		}

		printButton.disabled = true;
		setStatus("Conversion et impression en cours...");
		try {
			const image = await loadImage(file);
			const raster = toMonochromeRaster(image);
			console.info("[ThermalPrinter] Image convertie", {
				name: file.name,
				width: raster.width,
				height: raster.height,
				rasterBytes: raster.raster.length,
			});
			const commands = createPrintCommands(raster);
			console.info("[ThermalPrinter] Flux préparé", {
				bytes: commands.length,
				imageCommands: commands.filter((value) => value[2] === 0xcf).length,
			});
			await writePayload(writeCharacteristic, commands);
			setStatus("Image envoyée à l'imprimante.");
		} catch (error) {
			setStatus(`Impression impossible : ${error.message}`, true);
		} finally {
			printButton.disabled = false;
		}
	});
}
