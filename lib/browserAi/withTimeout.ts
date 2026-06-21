export class TimeoutError extends Error {
  constructor (message: string) {
    super(message)
    this.name = 'TimeoutError'
  }
}

export async function withTimeout<T> (
  promise: Promise<T>,
  ms: number,
  label: string,
): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | null = null
  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timer = setTimeout(() => {
          reject(new TimeoutError(`${label} timed out after ${Math.round(ms / 1000)}s`))
        }, ms)
      }),
    ])
  } finally {
    if (timer) clearTimeout(timer)
  }
}
