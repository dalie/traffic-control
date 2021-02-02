import { Lane } from '../objects/Lane';
import { Vehicle } from '../objects/Vehicle';

export class SimpleRoadScene extends Phaser.Scene {
  vehicles: Vehicle[] = [];
  lanes: Lane[] = [];

  cursors: any;
  pointOnPath = 0;
  speedLabel: Phaser.GameObjects.Text;

  constructor() {
    super({
      key: 'SimpleRoadScene',
    });
  }

  preload() {
    this.load.image('car', '/assets/sprites/cars/4.png');
  }

  create() {
    this.lanes.push(new Lane(50, [100, 100, 100, 800, 100, 800, 800, 800]));
    const laneGraphics = this.add.graphics();
    laneGraphics.lineStyle(6, 0xffffff, 1);
    for (const l of this.lanes) {
      l.path.draw(laneGraphics, 400);
    }

    this.cursors = this.input.keyboard.createCursorKeys();
    this.vehicles.push(new Vehicle(this.add.sprite(0, 0, 'car'), this.lanes[0], this.cursors));

    const cam = this.cameras.main.centerOn(600, 500);

    this.speedLabel = this.add.text(20, 20, '0km/h').setScrollFactor(0);
  }

  update(time: number, delta: number) {
    this.speedLabel.setText(this.vehicles[0].speed);
    for (const v of this.vehicles) {
      v.update(time, delta);
    }
  }
}
