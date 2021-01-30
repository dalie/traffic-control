import { Vehicle } from '../vehicle/Vehicle';

export class SimpleRoadScene extends Phaser.Scene {
  vehicles: Vehicle[] = [];

  path: Phaser.Curves.Path;

  cursors: any;
  pointOnPath = 0;

  constructor() {
    super({
      key: 'SimpleRoadScene',
    });
  }

  preload() {
    this.load.image('car', '/assets/sprites/cars/1.png');
  }

  create() {
    this.path = new Phaser.Curves.Path(1600, 500).ellipseTo(600, 400);
    const graphics = this.add.graphics();
    graphics.lineStyle(2, 0xffffff, 1);
    this.path.draw(graphics, 256);

    this.cursors = this.input.keyboard.createCursorKeys();
    this.vehicles.push(new Vehicle(this.add.sprite(0, 0, 'car'), this.path, this.cursors));

    this.cameras.main.setBounds(0, 0, 1920, 1080);
  }

  update(time: number, delta: number) {
    for (const v of this.vehicles) {
      v.update(time, delta);
    }
  }
}
