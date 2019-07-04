export function log (message: string, level: string = 'info', service?: string) {
	const servicePart = service ? ` (${service})` : ''
	console.log(`${level.toUpperCase()}${servicePart} [${new Date().toLocaleTimeString()}] ${message}`)
}
