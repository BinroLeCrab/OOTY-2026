import { lzo1xCompress } from "lzo1x";

const KNOWN_SERVICE_UUID = "0000ae30-0000-1000-8000-00805f9b34fb";
const WRITE_CHARACTERISTIC_UUID = "0000ae01-0000-1000-8000-00805f9b34fb";
const BLE_PACKET_SIZE = 20;
const BLE_PACKET_DELAY = 4;
const IMAGE_WIDTH = 384;
const BLOCK_LINES = 20;
const GRAY_IMAGE_SPEED = 40;
const PAPER_FEED_LINES = 128;
const GRAYSCALE_LEVELS = 14;
const IMAGE_SHARPNESS = 1.1;
const HISTOGRAM_PERCENTILE = 0.2;
const CONTRAST_SCALE = 1;
const DARK_TONE_GAMMA = 0.6;
const BLACK_LEVEL = 48;
const WHITE_TONE_LIFT = 0.12;

let activeWriteCharacteristic = null;

function createPrinterPanel() {
	const panel = document.createElement("section");
	panel.id = "thermal-printer";
	panel.innerHTML = `
		<button type="button" data-action="connect">Connecter X6h-0000</button>
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
	const grayscale = new Float32Array(width * height);
	const histogram = new Uint32Array(256);

	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const pixel = (y * width + x) * 4;
			grayscale[y * width + x] =
				0.299 * pixels[pixel] +
				0.587 * pixels[pixel + 1] +
				0.114 * pixels[pixel + 2];
		}
	}

	const sharpenedGrayscale = new Float32Array(grayscale);
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const index = y * width + x;
			const center = sharpenedGrayscale[index];
			const left = sharpenedGrayscale[index - (x > 0 ? 1 : 0)];
			const right = sharpenedGrayscale[index + (x + 1 < width ? 1 : 0)];
			const top = sharpenedGrayscale[index - (y > 0 ? width : 0)];
			const bottom = sharpenedGrayscale[index + (y + 1 < height ? width : 0)];

			const sharpened = Math.max(
				0,
				Math.min(
					255,
					center * (1 + 4 * IMAGE_SHARPNESS) -
						IMAGE_SHARPNESS * (left + right + top + bottom),
				),
			);
			grayscale[index] = sharpened;
			histogram[Math.round(sharpened)] += 1;
		}
	}

	const percentileCount = width * height * HISTOGRAM_PERCENTILE;
	let cumulative = 0;
	let lowValue = 0;
	let highValue = 255;

	for (let value = 0; value < histogram.length; value += 1) {
		cumulative += histogram[value];
		if (cumulative >= percentileCount) {
			lowValue = Math.min(value, 70);
			break;
		}
	}

	cumulative = 0;
	for (let value = 255; value >= 0; value -= 1) {
		cumulative += histogram[value];
		if (cumulative >= percentileCount) {
			highValue = Math.max(value, 185);
			break;
		}
	}

	const lowOutput = lowValue * CONTRAST_SCALE;
	const highOutput = highValue + (255 - highValue) * (1 - CONTRAST_SCALE);
	const inputRange = Math.max(1, highValue - lowValue);

	for (let index = 0; index < grayscale.length; index += 1) {
		const value = grayscale[index];
		let adjusted;
		if (value <= lowValue) {
			adjusted = value * CONTRAST_SCALE;
		} else if (value >= highValue) {
			adjusted = value + (255 - value) * (1 - CONTRAST_SCALE);
		} else {
			adjusted = lowOutput +
				((value - lowValue) * (highOutput - lowOutput)) / inputRange;
		}

		const normalized = Math.max(0, Math.min(1, adjusted / 255));
		const gammaCorrected = Math.max(
			0,
			Math.min(255, Math.trunc(255 * normalized ** DARK_TONE_GAMMA)),
		);
		const highlightWeight = Math.max(
			0,
			Math.min(1, (gammaCorrected - BLACK_LEVEL) / (255 - BLACK_LEVEL)),
		);
		grayscale[index] = Math.max(
			0,
			Math.min(
				255,
				Math.trunc(
					gammaCorrected +
						(255 - gammaCorrected) *
							WHITE_TONE_LIFT *
							highlightWeight,
				),
			),
		);
	}

	const quantizationStep = 256 / GRAYSCALE_LEVELS;
	for (let y = 0; y < height; y += 1) {
		for (let x = 0; x < width; x += 1) {
			const index = y * width + x;
			const value = grayscale[index];
			if (value <= BLACK_LEVEL) {
				grayscale[index] = 0;
				raster[index] = 255;
				continue;
			}

			const level = Math.min(
				GRAYSCALE_LEVELS - 1,
				Math.floor(value / quantizationStep),
			);
			const quantized = Math.round(
				(level * 255) / (GRAYSCALE_LEVELS - 1),
			);
			const error = value - quantized;
			grayscale[index] = quantized;
			raster[index] = 255 - quantized;

			if (x + 1 < width) {
				grayscale[index + 1] += (error * 7) / 16;
			}
			if (y + 1 < height) {
				grayscale[index + width] += (error * 5) / 16;
				if (x > 0) {
					grayscale[index + width - 1] += (error * 3) / 16;
				}
				if (x + 1 < width) {
					grayscale[index + width + 1] += error / 16;
				}
			}
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

function createGrayModeCommand() {
	return createCommand(0xbe, new Uint8Array([0x00, 0x01]));
}

function createGraySpeedCommand() {
	return createCommand(0xbd, new Uint8Array([GRAY_IMAGE_SPEED]));
}

function createPrintCommands({ width, height, raster }) {
	const padded = new Uint8Array(width * (height + 1));
	padded.set(raster, width);
	const feed = new Uint8Array([PAPER_FEED_LINES & 0xff, PAPER_FEED_LINES >> 8]);
	const feedCommand = createCommand(0xa1, feed);
	const commands = [];
	const blockSize = width * BLOCK_LINES;

	commands.push(createGrayModeCommand());
	commands.push(createGraySpeedCommand());
	for (let offset = 0; offset < padded.length; offset += blockSize) {
		const block = new Uint8Array(blockSize);
		block.set(padded.slice(offset, offset + blockSize));
		commands.push(createPrintLinesCommand(block));
		commands.push(createGraySpeedCommand());
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
				service,
				description: `${service.uuid} / ${writable.uuid}`,
			};
		}
	}

	throw new Error("Aucune caractéristique BLE accessible en écriture.");
}

function bytesToHex(dataView) {
	return Array.from(
		new Uint8Array(dataView.buffer, dataView.byteOffset, dataView.byteLength),
		(value) => value.toString(16).padStart(2, "0"),
	).join(" ");
}

async function listenForNotifications(service) {
	const characteristics = await service.getCharacteristics();
	const notifiable = characteristics.filter(
		(characteristic) =>
			characteristic.properties.notify ||
			characteristic.properties.indicate,
	);

	console.info("[ThermalPrinter] Caractéristiques BLE", characteristics.map((characteristic) => ({
		uuid: characteristic.uuid,
		properties: characteristic.properties,
	})));

	for (const characteristic of notifiable) {
		try {
			await characteristic.startNotifications();
			characteristic.addEventListener("characteristicvaluechanged", (event) => {
				const value = event.target.value;
				if (!value) {
					return;
				}
				console.info("[ThermalPrinter] Notification BLE reçue", {
					characteristic: characteristic.uuid,
					length: value.byteLength,
					hex: bytesToHex(value),
				});
			});
			console.info("[ThermalPrinter] Notifications activées", characteristic.uuid);
		} catch (error) {
			console.warn("[ThermalPrinter] Notifications indisponibles", {
				characteristic: characteristic.uuid,
				error: error.message,
			});
		}
	}

	for (const characteristic of characteristics.filter(
		(characteristic) => characteristic.properties.read,
	)) {
		try {
			const value = await characteristic.readValue();
			console.info("[ThermalPrinter] Lecture BLE initiale", {
				characteristic: characteristic.uuid,
				length: value.byteLength,
				hex: bytesToHex(value),
			});
		} catch (error) {
			console.warn("[ThermalPrinter] Lecture BLE indisponible", {
				characteristic: characteristic.uuid,
				error: error.message,
			});
		}
	}
}

export async function printImageUrl(dataUrl) {
	const image = new Image();
	image.src = dataUrl;
	await image.decode();
	await printImage(image);
}

export async function printImage(image) {
	if (!(image instanceof HTMLImageElement)) {
		throw new TypeError("printImage attend un élément HTMLImageElement.");
	}
	if (!image.complete || image.naturalWidth === 0) {
		throw new Error("L'image doit être chargée avant l'impression.");
	}
	if (!activeWriteCharacteristic) {
		throw new Error("Connecte d'abord l'imprimante.");
	}

	const raster = toMonochromeRaster(image);
	console.info("[ThermalPrinter] Image convertie", {
		width: raster.width,
		height: raster.height,
		rasterBytes: raster.raster.length,
	});
	const commands = createPrintCommands(raster);
	await writePayload(activeWriteCharacteristic, commands);
}

export function initializeThermalPrinter() {
	const panel = createPrinterPanel();
	const connectButton = panel.querySelector('[data-action="connect"]');

	connectButton.addEventListener("click", async () => {
		if (!("bluetooth" in navigator)) {
			console.error("[ThermalPrinter] Web Bluetooth indisponible.");
			return;
		}

		connectButton.disabled = true;
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
			activeWriteCharacteristic = result.characteristic;
			console.info("[ThermalPrinter] Caractéristique d'écriture", {
				service: result.description.split(" / ")[0],
				characteristic: result.characteristic.uuid,
				properties: result.characteristic.properties,
			});
			await listenForNotifications(result.service);
			panel.hidden = true;
			device.addEventListener("gattserverdisconnected", () => {
				activeWriteCharacteristic = null;
				panel.hidden = false;
				connectButton.disabled = false;
			});
		} catch (error) {
			console.error("[ThermalPrinter] Connexion impossible.", error);
		} finally {
			if (!activeWriteCharacteristic) {
				connectButton.disabled = false;
			}
		}
	});
}
