export class PhotoPermissionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'PhotoPermissionError';
  }
}
