export class Lane {
  private _path: Phaser.Curves.CubicBezier = null;

  get path() {
    return this._path;
  }
  constructor(private _speedLimit, points: number[]) {
    const start = new Phaser.Math.Vector2(points[0], points[1]);
    const cp1 = new Phaser.Math.Vector2(points[2], points[3]);
    const cp2 = new Phaser.Math.Vector2(points[4], points[5]);
    const end = new Phaser.Math.Vector2(points[6], points[7]);
    this._path = new Phaser.Curves.CubicBezier(start, cp1, cp2, end);
    console.log(this._path.getResolution(10));
  }
}
