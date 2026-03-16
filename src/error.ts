export class LnaError extends Error {
	denied: boolean | undefined;
	permission?: PermissionStatus;

	constructor({cause, ...options}: {
		denied: boolean | undefined,
		permission?: PermissionStatus | null,
		cause: unknown
	}) {
		super(
			options.denied
				? "Local Network Access was denied"
				: "Local Network Access failed"
			,
			{cause}
		)
		this.name = this.constructor.name;
		Object.assign(this, options);
	}

	static fromPermission(permission: PermissionStatus | null | undefined, cause: unknown) {
		if (permission === null) {
			return new LnaError({cause, denied: false, permission: null})
		}
		if (permission === undefined) {
			return new LnaError({cause, denied: undefined})
		}

		if (permission.state === 'granted') {
			return new LnaError({cause, denied: false, permission});
		} else if (permission.state === 'denied') {
			return new LnaError({cause, denied: true, permission});
		} else {
			return new LnaError({cause, denied: undefined, permission: permission ?? undefined});
		}
	}
}
