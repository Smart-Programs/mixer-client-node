export function isObject (item): boolean {
	return item && typeof item === 'object' && !Array.isArray(item)
}

export function mergeDeep (target, source): object {
	const output = { ...target }
	if (isObject(target) && isObject(source)) {
		Object.keys(source).forEach((key) => {
			if (isObject(source[key])) {
				if (!(key in target)) Object.assign(output, { [key]: source[key] })
				else output[key] = mergeDeep(target[key], source[key])
			} else {
				Object.assign(output, { [key]: source[key] })
			}
		})
	}
	return output
}

export function toJSON (source: string): { [key: string]: any } {
	try {
		const parsedJSON = JSON.parse(source)
		return parsedJSON
	} catch (error) {
		return {}
	}
}
